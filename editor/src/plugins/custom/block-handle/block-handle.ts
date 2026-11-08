/**
 * plugins/custom/block-handle/block-handle.ts — 语雀风格块手柄
 *
 * hover 任意块时,左侧浮现「+ 插入按钮 + 六点拖拽把手」:
 * - + 按钮:在目标块处打开全功能菜单(编程式 slash 菜单,见 slash-menu-opener)
 * - 拖拽把手:按住拖动可移动块(由 @milkdown/plugin-block 的 BlockService 驱动,
 *   dragstart 写入 view.dragging,ProseMirror 原生 drop + dropCursor 落点指示)
 *
 * 基于 @milkdown/kit/plugin/block 的 block 插件 + BlockProvider(自定义手柄 DOM)。
 * provider.active.$pos.pos 即目标块的 before 位置,与 openSlashMenuAt 的 blockPos 语义一致。
 */
import { block, BlockProvider } from '@milkdown/kit/plugin/block';
import { Plugin, PluginKey } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import { $prose } from '@milkdown/utils';
import type { Ctx } from '@milkdown/ctx';
import type { EditorI18nMessages } from '../../../types/editor';
import { createSharedIcon } from '../../../icons';
import {
  createOverlayRepositionScheduler,
  resolveEditorWrapper,
} from '../../../lib/editor-overlay-position';
import { openSlashMenuAt } from '../slash-menu/slash-menu-opener';
import {
  BLOCK_MULTI_SELECT_KEY,
  clearBlockMultiSelection,
  createBlockMultiSelectPlugin,
  getBlockMultiSelectionRange,
  hasBlockMultiSelection,
  setBlockMultiSelection,
} from './block-multi-select';
import './block-handle.css';

/** 手柄根类名。 */
export const BLOCK_HANDLE_CLASS = 'zt-md-block-handle';

/**
 * 整体型块节点类型集合:标题/代码块/公式块/分割线等视觉整体。
 * 手柄相对这类块垂直居中(对齐 Notion 等主流编辑器);
 * 标题因字号大、视觉上是单块整体,同按整体型处理;
 * 普通文本块(段落/引用/列表)与 table(高块,居中会漂出可视行)对齐首行。
 * 图片为行内节点(位于段落内),所在段落按普通文本块对齐首行。
 */
const MONOLITHIC_BLOCK_TYPES = new Set([
  'heading',
  'code_block',
  'math_block',
  'horizontal_rule',
]);

/**
 * 取元素内首个非空文本节点首字符的墨迹矩形(即首行所在行)。
 *
 * 根因说明:浏览器将列表点(marker)与首行行盒垂直居中,字符墨迹又相对
 * 行盒居中,故首字符矩形中心 == 列表点中心 == 首行视觉中心。
 * 用它作锚定矩形可让手柄与首行/列表点精确垂直居中,且对任意
 * 字号/行高/字体天然成立(替代硬编码首行高度近似值)。
 * 返回 null 表示块内无可见文本(如空段落),调用方回退整块矩形。
 */
const getFirstLineRect = (el: Element): DOMRect | null => {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let textNode: Text | null;
  while ((textNode = walker.nextNode() as Text | null)) {
    if (!textNode.textContent?.trim()) continue;
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, Math.min(1, textNode.length));
    const rect = range.getBoundingClientRect();
    if (rect.height > 0) return rect as DOMRect;
  }
  return null;
};

/**
 * block-handle 插件创建参数。
 */
export interface BlockHandleOptions {
  /** 编辑器内部浮层 Portal 容器(手柄挂载宿主)。 */
  portalContainer: HTMLElement;
  /** 编辑器文案(可达性标签;缺省时不写 title/aria-label)。 */
  messages?: EditorI18nMessages;
  /** 编辑区滚动容器选择器(缺省 meditor 自带类名,行为不变)。 */
  scrollContainerSelector?: string;
}

/**
 * 构建手柄 DOM(+ 按钮 + 拖拽把手)。
 */
const createBlockHandleDom = (messages?: EditorI18nMessages): HTMLElement => {
  // 手柄根节点。
  const root = document.createElement('div');
  root.className = BLOCK_HANDLE_CLASS;
  root.dataset.show = 'false';

  // + 插入按钮。
  const plusButton = document.createElement('button');
  plusButton.type = 'button';
  plusButton.className = `${BLOCK_HANDLE_CLASS}-plus`;
  plusButton.appendChild(
    createSharedIcon('plus', {
      size: 18,
      strokeWidth: 2.5,
      className: `${BLOCK_HANDLE_CLASS}-icon`,
    }),
  );
  // 可达性:「在此插入块」。
  if (messages?.blockHandleInsertLabel) {
    plusButton.title = messages.blockHandleInsertLabel;
    plusButton.setAttribute('aria-label', messages.blockHandleInsertLabel);
  }

  // 六点拖拽把手。
  const grip = document.createElement('span');
  grip.className = `${BLOCK_HANDLE_CLASS}-grip`;
  grip.appendChild(
    createSharedIcon('drag', {
      size: 18,
      strokeWidth: 1.8,
      className: `${BLOCK_HANDLE_CLASS}-icon`,
    }),
  );
  // 可达性:可聚焦 + 按钮语义(键盘拖拽不做,至少可聚焦并让读屏可感知)。
  grip.setAttribute('role', 'button');
  grip.tabIndex = 0;
  if (messages?.blockHandleDragLabel) {
    grip.setAttribute('aria-label', messages.blockHandleDragLabel);
    grip.title = messages.blockHandleDragLabel;
  }

  root.appendChild(plusButton);
  root.appendChild(grip);

  // + 按钮不参与拖拽(draggable 由 BlockProvider 设在手柄根上)。
  plusButton.addEventListener('dragstart', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  return root;
};

/**
 * 构建多块拖拽影像:克隆选区内全部顶层块 DOM 挂到 body(调用方设完 drag image 后负责移除)。
 */
const buildMultiDragImage = (view: EditorView, from: number, to: number): HTMLElement | null => {
  // 选区首个块在 DOM 父容器中的定位信息。
  const parentInfo = view.domAtPos(from);
  const parentNode = parentInfo.node;
  if (!(parentNode instanceof HTMLElement)) {
    return null;
  }

  // 选区内顶层块数量。
  let blockCount = 0;
  view.state.doc.nodesBetween(from, to, (node) => {
    if (node.isBlock) {
      blockCount += 1;
      return false;
    }
    return true;
  });
  if (blockCount === 0) {
    return null;
  }

  // 逐个克隆顶层块 DOM(跳过 PM 插入的非元素节点)。
  const container = document.createElement('div');
  container.className = 'zt-md-multi-drag-image';
  let index = parentInfo.offset;
  while (blockCount > 0 && index < parentNode.childNodes.length) {
    // 当前孩子节点。
    const child = parentNode.childNodes[index];
    if (child instanceof HTMLElement) {
      container.appendChild(child.cloneNode(true));
      blockCount -= 1;
    }
    index += 1;
  }
  document.body.appendChild(container);
  return container;
};

/**
 * 创建块手柄插件组(block 基础插件 + 多选插件 + 手柄 Provider 插件)。
 * 返回数组由调用方逐项 editor.use 注册(顺序:block 在前,Provider 在后)。
 */
export const createBlockHandlePlugins = (options: BlockHandleOptions): unknown[] => {
  // 手柄根 DOM(可达性文案取编辑器 messages)。
  const handleDom = createBlockHandleDom(options.messages);
  // + 插入按钮。
  const plusButton = handleDom.querySelector(
    `.${BLOCK_HANDLE_CLASS}-plus`,
  ) as HTMLButtonElement | null;
  // 拖拽把手。
  const gripElement = handleDom.querySelector(
    `.${BLOCK_HANDLE_CLASS}-grip`,
  ) as HTMLSpanElement | null;

  // 手柄 Provider 插件(自定义 DOM 定位浮现)。
  const handleProviderPlugin = $prose((ctx: Ctx) => {
    /** BlockProvider 实例(view 创建时构造)。 */
    let provider: BlockProvider | null = null;
    /** 当前编辑器视图引用。 */
    let currentView: EditorView | null = null;

    // 窗口 resize / 编辑器滚动时的手柄重定位调度器:BlockProvider 只在 hover
    // 消息时计算一次位置(floating-ui 单次 computePosition,无 autoUpdate),
    // 窗口调整导致文本回流或编辑区滚动后,锚点块已移动而手柄钉在旧坐标。
    // 活跃块仍在(provider.active 非空)时按实时矩形重算,隐藏态自然跳过。
    const repositionScheduler = createOverlayRepositionScheduler(() => {
      const active = provider?.active;
      if (active) {
        provider?.show(active);
      }
    });

    // + 点击:在当前活跃块处打开全功能菜单。
    plusButton?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      // 无 provider/视图/活跃块时忽略。
      if (!provider || !currentView) {
        return;
      }
      // 当前活跃块($pos.pos 即块 before 位置)。
      const active = provider.active;
      if (!active) {
        return;
      }

      openSlashMenuAt(currentView, active.$pos.pos);
    });

    // 普通点击把手:清除多选区(shift+点击路径在 mousedown 捕获处理,此处跳过)。
    gripElement?.addEventListener('click', (event) => {
      if (event.shiftKey || !currentView) {
        return;
      }

      clearBlockMultiSelection(currentView);
    });

    // shift+按下把手:扩展顶层块多选区间。
    // 必须在捕获阶段拦截:BlockService 的 mousedown 会 dispatch 单块 NodeSelection,
    // selectionChanged 会清掉多选状态,先拦下才保得住锚点。
    const handleGripMouseDown = (event: MouseEvent): void => {
      if (!event.shiftKey || !provider || !currentView) {
        return;
      }
      // 仅拦截把手上的按下(其余 portal 内 mousedown 一律放行)。
      const target = event.target;
      if (!(target instanceof Node) || !gripElement?.contains(target)) {
        return;
      }
      // 当前活跃块。
      const active = provider.active;
      if (!active) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      // 锚点:已有多选区的锚点;首次 shift+点击则以当前块为锚。
      const existing = BLOCK_MULTI_SELECT_KEY.getState(currentView.state);
      const anchor = existing?.anchor ?? active.$pos.pos;
      setBlockMultiSelection(currentView, anchor, active.$pos.pos);
      currentView.focus();
    };

    // 多块拖拽:把手 dragstart 时以整个多选区间覆写 BlockService 的单块拖拽
    // (捕获阶段先于 BlockService 的 target 监听,存在多选区时拦下并改写)。
    const handleDragStartCapture = (event: Event): void => {
      const dragEvent = event as DragEvent;
      if (!currentView || !hasBlockMultiSelection(currentView)) {
        return;
      }
      // 当前多选区间。
      const range = getBlockMultiSelectionRange(currentView);
      if (!range) {
        return;
      }

      dragEvent.stopPropagation();
      // 多选区间 slice。
      const slice = currentView.state.doc.slice(range.from, range.to);
      if (dragEvent.dataTransfer) {
        dragEvent.dataTransfer.effectAllowed = 'copyMove';
        const { dom, text } = currentView.serializeForClipboard(slice);
        dragEvent.dataTransfer.clearData();
        dragEvent.dataTransfer.setData('text/html', dom.innerHTML);
        dragEvent.dataTransfer.setData('text/plain', text);
        // 多块拖拽影像(下一帧移除,避免残留在页面上)。
        const dragImage = buildMultiDragImage(currentView, range.from, range.to);
        if (dragImage) {
          dragEvent.dataTransfer.setDragImage(dragImage, 0, 0);
          window.setTimeout(() => dragImage.remove(), 0);
        }
      }
      // move:true 使落点插入 + 原区间删除(整组移动)。
      currentView.dragging = { slice, move: true };
    };

    options.portalContainer.addEventListener('mousedown', handleGripMouseDown, true);
    options.portalContainer.addEventListener('dragstart', handleDragStartCapture, true);

    return new Plugin({
      key: new PluginKey('zt-md-block-handle'),
      view: (view: EditorView) => {
        currentView = view;
        provider = new BlockProvider({
          ctx,
          content: handleDom,
          root: options.portalContainer,
          // 手柄悬在块左侧外;mainAxis 为水平收进量(正值更靠左),
          // 与编辑区左 padding(3.25rem)配合决定手柄列位置。
          getPlacement: () => 'left',
          getOffset: () => ({ mainAxis: 2, crossAxis: 0 }),
          // 两轴解耦,各一条规则(勿按块型添加水平分支):
          // - 水平:所有块统一锚定编辑器内容左缘 —— 手柄永远在同一列手柄槽,
          //   引用/表格/代码块等内部缩进不影响水平位置;
          // - 垂直:整体型块(标题/代码块/公式块/分割线)居中于整块;
          //   文本类块(段落/引用/列表项)居中于首行墨迹(与列表点同一中心);
          //   无文本块(空段落/纯图片段落)回退整块矩形。
          getPosition: ({ active, editorDom }) => {
            // 当前活跃块是否为整体型块(决定垂直对齐策略)。
            const isMonolithic = MONOLITHIC_BLOCK_TYPES.has(active.node.type.name);
            // 命中的列表行项(手柄元素为 li 内段落时向上找 li)。
            const listItem = active.el.closest('li');
            // 水平锚点:编辑器内容左缘(所有块共用的手柄列)。
            const contentLeft = editorDom.getBoundingClientRect().left;

            // 垂直锚定矩形:整体型取整块;文本块取首行墨迹;空块回退整块。
            const verticalRect =
              isMonolithic && !listItem
                ? active.el.getBoundingClientRect()
                : (getFirstLineRect(active.el) ?? (listItem ?? active.el).getBoundingClientRect());

            return {
              x: contentLeft,
              y: verticalRect.top,
              width: 1,
              height: verticalRect.height,
              top: verticalRect.top,
              left: contentLeft,
              bottom: verticalRect.bottom,
              right: contentLeft,
            };
          },
          floatingUIOptions: { strategy: 'fixed' },
        });
        // 触发异步 init:挂载 DOM、绑定 service 通知、设 draggable。
        provider.update();
        // 绑定 resize/scroll/容器尺寸变化重定位(window resize + document 捕获滚动 +
        // 编辑区容器 ResizeObserver,RAF 节流);程序化改宽也能跟随。
        repositionScheduler.bindGlobal();
        repositionScheduler.bindElement(
          resolveEditorWrapper(view.dom, options.scrollContainerSelector),
        );

        return {
          update: () => {
            provider?.update();
          },
          destroy: () => {
            repositionScheduler.destroy();
            options.portalContainer.removeEventListener('mousedown', handleGripMouseDown, true);
            options.portalContainer.removeEventListener('dragstart', handleDragStartCapture, true);
            provider?.destroy();
            provider = null;
            currentView = null;
          },
        };
      },
    });
  });

  // block 基础插件(块探测 + 拖拽服务)+ 顶层块多选插件,必须在 Provider 插件之前注册。
  // 注意:多选插件是裸 ProseMirror Plugin,必须经 $prose 包装成 MilkdownPlugin 才能被 editor.use()。
  const blockMultiSelect = $prose(() => createBlockMultiSelectPlugin());
  return [block, blockMultiSelect, handleProviderPlugin];
};
