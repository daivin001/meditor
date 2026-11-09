/**
 * plugins/custom/slash-menu/slash-menu.ts — / 触发命令菜单(主插件)
 *
 * 1:1 翻译自 zt-react-milkdown/src/plugins/custom/slash-menu/slash-menu.ts
 * - 原版基于 @milkdown/plugin-slash 的 slashFactory(tuple),此处改用 $prose
 *   直接实现等价的 ProseMirror 插件(handleKeyDown + PluginView),无需解剖 tuple。
 * - 交互协议与原版一致:输入 '/' 触发,按字符过滤,↑↓ 导航,Enter 执行,
 *   ESC 关闭;点击菜单项同样执行;公式/表格/代码块内不触发。
 */
import { Plugin, PluginKey, TextSelection } from '@milkdown/prose/state';
import type { EditorState } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import { schemaCtx } from '@milkdown/core';
import { $prose } from '@milkdown/utils';
import type { Ctx } from '@milkdown/ctx';
import type {
  EditorI18nMessages,
  EditorLocale,
  EditorShortcutMode,
  ImageUploadConfig,
  SlashMenuConfig,
  SlashMenuItem,
} from '../../../types/editor';
import {
  createOverlayRepositionScheduler,
  resolveEditorWrapper,
  resolvePlacement,
  toContentAnchor,
} from '../../../lib/editor-overlay-position';
import { showImageUploadDialog } from '../image/image-upload-dialog';
import { showEmojiPicker } from '../../../components/emoji-picker';
import {
  isEditorViewEditable,
  removeSlashQueryAtCursor,
  resolveMenuState,
  resolveSlashMenuItems,
  shouldBlockSlashMenu,
} from './slash-menu-logic';
import { registerSlashMenuOpener } from './slash-menu-opener';
import { runSlashCommand } from './slash-menu-commands';
import { setSlashCommandLocale } from './commands-locale';
import { createSlashMenuViewController } from './slash-menu-view';

/**
 * slash 插件创建参数。
 */
export interface SlashMenuPluginOptions {
  /** 编辑器内部浮层 Portal 容器。 */
  portalContainer: HTMLElement;
  /** slash 菜单配置。 */
  config?: SlashMenuConfig;
  /** 编辑器语言。 */
  locale?: EditorLocale;
  /** 内置快捷键修饰键模式。 */
  shortcutMode?: EditorShortcutMode;
  /** 编辑器文案(保留参数位,菜单项文案由 locale 决定)。 */
  messages?: EditorI18nMessages;
  /** 图片上传配置。 */
  imageUpload?: ImageUploadConfig;
  /** 编辑区滚动容器选择器(缺省 meditor 自带类名,行为不变)。 */
  scrollContainerSelector?: string;
  /** 布局块经菜单插入成功后请求进入布局模式的回调(编排逻辑在 meditor 层)。 */
  onRequestLayoutMode?: () => void;
}

/**
 * 创建 slash 菜单插件(Milkdown 插件,传给 editor.use)。
 */
export const createSlashMenuPlugin = (options: SlashMenuPluginOptions) => {
  return $prose((ctx: Ctx) => {
    // 命令层(纯 schema 层)的插入文案语言在此注入(链接占位/数据库骨架)。
    setSlashCommandLocale(options.locale);
    // 原始菜单项。
    const allItems = resolveSlashMenuItems(options.config, options.locale ?? 'zh-CN');
    // 按 schema 能力过滤(math schema 未启用时隐藏公式项)。
    let items = allItems;
    try {
      // 当前 schema 节点集合。
      const nodes = ctx.get(schemaCtx).nodes as Record<string, unknown>;
      items = allItems.filter((item) => {
        if (item.command === 'inlineMath') {
          return Boolean(nodes.math_inline);
        }
        if (item.command === 'mathBlock') {
          return Boolean(nodes.math_block);
        }
        if (item.command === 'csvTable') {
          // csvdata schema(mtable 插件注册,节点名 csvdata)。
          return Boolean(nodes.csvdata);
        }
        if (item.command === 'layoutBlock') {
          // meditor_layout schema(layout-block 插件注册,节点名 meditor_layout)。
          return Boolean(nodes.meditor_layout);
        }
        return true;
      });
    } catch {
      // schema 未就绪等异常时保留全量菜单。
    }

    // slash 菜单视图控制器。
    const menuView = createSlashMenuViewController(
      options.portalContainer,
      options.shortcutMode ?? 'modShift',
    );
    // 当前高亮索引。
    let activeIndex = 0;
    // 当前编辑器视图引用。
    let currentView: EditorView | null = null;
    // 当前过滤后的菜单项。
    let visibleItems: SlashMenuItem[] = items;
    // 当前周期可交互态快照。
    let menuInteractable = false;
    // 编程式打开(+ 按钮)的钉住态:菜单保持显示,直到命令执行/ESC/用户输入或点击他处。
    let pinnedOpen = false;
    // 钉住后的首个 update 跳过(opener 自身的 dispatch 引起,不算用户交互)。
    let justPinned = false;
    // 菜单导航键集合。
    const NAVIGATION_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Enter', 'Escape']);

    /**
     * 处理菜单可见态下的键盘导航。
     */
    const handleVisibleMenuKeyDown = (event: KeyboardEvent): boolean => {
      if (!NAVIGATION_KEYS.has(event.key) || !menuInteractable) {
        return false;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (visibleItems.length === 0) {
          return true;
        }
        activeIndex = (activeIndex + 1) % visibleItems.length;
        menuView.renderIfNeeded(visibleItems, activeIndex);
        menuView.scrollActiveItemIntoView(() => {
          menuView.updatePosition();
        });
        return true;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (visibleItems.length === 0) {
          return true;
        }
        activeIndex = (activeIndex - 1 + visibleItems.length) % visibleItems.length;
        menuView.renderIfNeeded(visibleItems, activeIndex);
        menuView.scrollActiveItemIntoView(() => {
          menuView.updatePosition();
        });
        return true;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        runActiveCommand();
        return true;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        // 捕获 Escape 时刻的钉住态:钉住态(编程式打开)无 "/query" 可清理;
        // 键入 '/' 打开的菜单才需要删除查询词。
        const wasPinned = pinnedOpen;
        pinnedOpen = false;
        menuInteractable = false;
        menuView.setVisible(false);
        if (!wasPinned && currentView && isEditorViewEditable(currentView)) {
          removeSlashQueryAtCursor(currentView);
        }
        return true;
      }
      return false;
    };

    /**
     * 解析当前光标在视口中的锚点矩形。
     */
    const resolveAnchorRect = (view: EditorView): DOMRect | null => {
      // 当前选区位置。
      const from = view?.state?.selection?.from;
      if (typeof from !== 'number') {
        return null;
      }

      // 当前选区视口坐标。
      const coords = view?.coordsAtPos?.(from) as {
        top: number;
        bottom: number;
        left: number;
        right: number;
      } | null;
      if (!coords) {
        return null;
      }

      return new DOMRect(
        coords.left,
        coords.top,
        Math.max(coords.right - coords.left, 1),
        coords.bottom - coords.top,
      );
    };

    /**
     * 按当前编辑器状态同步菜单显隐、数据与渲染。
     *
     * @param opts docChanged:本次事务是否改变了文档内容。菜单未展示时,
     *   仅文档变化(键入 '/')才允许打开——纯选区变化(点击既有文本、移动
     *   光标)即使命中 '/' 查询态也不凭空弹出,否则点击含 '/' 的既有文本会
     *   把光标后残段误判为查询词而弹出无匹配空浮层。
     */
    const syncMenuState = (view: EditorView, opts?: { docChanged?: boolean }): void => {
      // 本次是否允许从未展示态打开(默认允许:reposition 等无 update 来源的调用)。
      const canOpen = opts?.docChanged !== false;
      if (!isEditorViewEditable(view)) {
        visibleItems = [];
        menuInteractable = false;
        pinnedOpen = false;
        menuView.updatePositionContext(null);
        menuView.setVisible(false);
        return;
      }

      // 钉住态(编程式打开):不检查 '/' 查询词,展示全量菜单;
      // 仅在落入禁触发上下文(代码块/表格/公式块)时收起。
      if (pinnedOpen) {
        if (shouldBlockSlashMenu(view)) {
          pinnedOpen = false;
          menuInteractable = false;
          menuView.updatePositionContext(null);
          menuView.setVisible(false);
          return;
        }

        visibleItems = items;
        menuInteractable = true;
      } else {
        // 当前菜单状态。
        const nextState = resolveMenuState(view, items);
        visibleItems = nextState.visibleItems;
        menuInteractable = nextState.shouldShow;
        if (!nextState.shouldShow || (!menuView.isVisible() && !canOpen)) {
          // 菜单不展示即不可交互,防止隐藏态拦截 Enter/ESC 等导航键。
          menuInteractable = false;
          menuView.updatePositionContext(null);
          menuView.setVisible(false);
          return;
        }
      }

      if (activeIndex >= visibleItems.length) {
        activeIndex = 0;
      }
      if (!menuView.isVisible()) {
        activeIndex = 0;
      }

      // 当前菜单锚点矩形。
      const anchorRect = resolveAnchorRect(view);
      // 当前编辑器滚动容器(选择器可由 createMeditor 选项配置)。
      const editorWrapper = resolveEditorWrapper(
        view?.dom as HTMLElement | null,
        options.scrollContainerSelector,
      );
      if (anchorRect && editorWrapper) {
        // 菜单翻转方向的可用空间阈值。
        const placementThreshold = 320;
        // 当前菜单展开方向。
        const placement = resolvePlacement(anchorRect, placementThreshold);
        // 当前锚点内容坐标。
        const contentAnchor = toContentAnchor(anchorRect, editorWrapper);
        menuView.updatePositionContext({
          editorWrapper,
          anchorTopInContent: contentAnchor.anchorTopInContent,
          anchorBottomInContent: contentAnchor.anchorBottomInContent,
          anchorLeftInContent: contentAnchor.anchorLeftInContent,
          placement,
          offsetY: 8,
        });
      }

      menuView.renderIfNeeded(visibleItems, activeIndex);
      if (!menuView.isVisible()) {
        menuView.setVisible(true, () => {
          menuView.updatePosition();
        });
      } else {
        menuView.updatePosition();
      }
    };

    /**
     * 编程式打开菜单(钉住态)。
     * 由 opener 调用:blockPos 给定时在目标块处落光标(空段落直接用,否则其后插入空段落),
     * 缺省时在当前光标处打开。
     */
    const openPinnedMenu = (targetView: EditorView, blockPos?: number): void => {
      if (!isEditorViewEditable(targetView)) {
        return;
      }

      if (typeof blockPos === 'number') {
        // 目标文档位置合法性检查。
        if (blockPos < 0 || blockPos > targetView.state.doc.content.size) {
          return;
        }

        // 目标位置后的块节点。
        const nodeAfter = targetView.state.doc.resolve(blockPos).nodeAfter;
        if (!nodeAfter) {
          return;
        }

        // 段落节点类型。
        const paragraphType = targetView.state.schema.nodes.paragraph;
        if (!paragraphType) {
          return;
        }

        // 目标块为空段落时直接置入光标,否则在其后插入空段落。
        if (nodeAfter.type.name === 'paragraph' && nodeAfter.content.size === 0) {
          // 光标置入现有空段落。
          const selection = TextSelection.near(targetView.state.doc.resolve(blockPos + 1), 1);
          targetView.dispatch(
            targetView.state.tr
              .setSelection(selection)
              .setMeta('zt-md-slash-menu-pin', true)
              .scrollIntoView(),
          );
        } else {
          // 块后插入位置。
          const insertPos = blockPos + nodeAfter.nodeSize;
          // 插入空段落并将光标移入。
          const tr = targetView.state.tr.insert(insertPos, paragraphType.create());
          const selection = TextSelection.near(tr.doc.resolve(insertPos + 1), 1);
          targetView.dispatch(
            tr.setSelection(selection).setMeta('zt-md-slash-menu-pin', true).scrollIntoView(),
          );
        }
        targetView.focus();
      } else if (shouldBlockSlashMenu(targetView)) {
        // 当前光标处打开时,落入禁触发上下文(代码块/表格/公式块)则忽略。
        return;
      }

      pinnedOpen = true;
      justPinned = true;
      activeIndex = 0;
      // dispatch 引发的 update 之后立即同步渲染(opener 场景需即时反馈)。
      syncMenuState(targetView);
    };

    /**
     * 根据索引执行命令。
     */
    const runActiveCommand = (): void => {
      // 加号(pinned)打开时并无输入 '/' 查询词,记录以便下文免除删除查询词步骤。
      const wasPinned = pinnedOpen;
      // 用户做出选择,解除钉住态。
      pinnedOpen = false;
      if (!isEditorViewEditable(currentView)) {
        menuInteractable = false;
        menuView.updatePositionContext(null);
        menuView.setVisible(false);
        return;
      }

      if (!currentView || activeIndex < 0 || activeIndex >= visibleItems.length) {
        return;
      }
      // 当前命令项(noUncheckedIndexedAccess 下需判空)。
      const item = visibleItems[activeIndex];
      if (!item) {
        return;
      }
      // 是否成功删除 slash 查询词。
      // 仅键入 '/' 打开的菜单必须删除查询词;加号打开(wasPinned)时无查询词可删,直接执行命令。
      const removedSlashQuery = removeSlashQueryAtCursor(currentView);
      if (!removedSlashQuery && !wasPinned) {
        return;
      }
      if (item.command === 'image') {
        menuView.setVisible(false);
        if (options.messages) {
          showImageUploadDialog({
            portalContainer: options.portalContainer,
            view: currentView,
            messages: options.messages,
            imageUpload: options.imageUpload,
          });
        }
        return;
      }
      // emoji:弹出选择面板(锚定光标),点选后面板内部负责插入与回焦。
      if (item.command === 'emoji') {
        menuView.setVisible(false);
        if (options.messages) {
          showEmojiPicker({
            portalContainer: options.portalContainer,
            view: currentView,
            messages: options.messages,
          });
        }
        return;
      }
      // 当前命令是否执行成功。
      const success = runSlashCommand(currentView, item.command);
      if (!success) {
        return;
      }

      // 布局块插入成功:进入布局模式(正常模式布局块完全隐藏,不进模式用户
      // 会以为插入失败)。
      if (item.command === 'layoutBlock') {
        options.onRequestLayoutMode?.();
      }

      menuView.setVisible(false);
    };

    // 菜单点击事件(mousedown 防止编辑器失焦)。
    menuView.menu.addEventListener('mousedown', (event) => {
      event.preventDefault();
      // 点击节点。
      const target = event.target as HTMLElement | null;
      // 当前命中的菜单项节点(允许点击子节点时向上查找)。
      const matchedItem = target?.closest('.slash-menu-item') as HTMLElement | null;
      // 点击命令名。
      const clickedCommand = matchedItem?.dataset.command ?? '';
      if (!clickedCommand) {
        return;
      }
      // 命令索引。
      const foundIndex = visibleItems.findIndex((item) => item.command === clickedCommand);
      if (foundIndex < 0) {
        return;
      }
      activeIndex = foundIndex;
      runActiveCommand();
    });

    // hover 同步:鼠标移入菜单项时更新 activeIndex 并只切 data-selected 高亮
    // (renderIfNeeded 对同一 items 引用走 syncActive 分支,不重建菜单);
    // hover 高亮与选中高亮共用同一元素后,双高亮问题随之消失。
    menuView.menu.addEventListener('mouseover', (event) => {
      if (!menuInteractable) {
        return;
      }
      // 悬停节点。
      const target = event.target as HTMLElement | null;
      // 命中的菜单项节点(允许从子节点向上查找)。
      const matchedItem = target?.closest('.slash-menu-item') as HTMLElement | null;
      // 悬停命令名(空态提示行无 data-command,自动跳过)。
      const hoveredCommand = matchedItem?.dataset.command ?? '';
      if (!hoveredCommand) {
        return;
      }
      const foundIndex = visibleItems.findIndex((item) => item.command === hoveredCommand);
      if (foundIndex < 0 || foundIndex === activeIndex) {
        return;
      }
      activeIndex = foundIndex;
      menuView.renderIfNeeded(visibleItems, activeIndex);
    });

    // 窗口 resize / 编辑器滚动时的菜单重定位调度器:菜单只在编辑器事务时同步位置,
    // 窗口调整导致文本回流后锚点移动,菜单会钉在旧坐标。可见时走 syncMenuState
    // 完整重派生(锚点矩形按当前选区实时解析),隐藏态跳过。
    const repositionScheduler = createOverlayRepositionScheduler(() => {
      if (menuView.isVisible() && currentView) {
        syncMenuState(currentView);
      }
    });

    // 返回 ProseMirror 插件。
    return new Plugin({
      key: new PluginKey('zt-md-slash-menu'),
      props: {
        handleKeyDown: (_view: EditorView, event: KeyboardEvent) => {
          return handleVisibleMenuKeyDown(event);
        },
      },
      view: (_editorView: EditorView) => {
        // 钉住态下点击菜单外任意位置(含编辑器内)即收起菜单。
        // 注意:不能豁免编辑器内点击交由 update 判定——加号打开的 pinned 菜单在
        // 编辑器内点击时 update 未必能正确解除钉住,反而会用新光标位置重新定位,
        // 造成"菜单移到点击处"的假象。
        const handleDocumentMouseDown = (event: MouseEvent): void => {
          if (!pinnedOpen) {
            return;
          }

          // 点击目标节点。
          const target = event.target as Node | null;
          if (menuView.menu.contains(target)) {
            return;
          }

          pinnedOpen = false;
          menuInteractable = false;
          menuView.updatePositionContext(null);
          menuView.setVisible(false);
        };
        document.addEventListener('mousedown', handleDocumentMouseDown, true);
        // 绑定 resize/scroll/容器尺寸变化重定位(window resize + document 捕获滚动 +
        // 编辑区容器 ResizeObserver,RAF 节流);程序化改宽也能跟随。
        repositionScheduler.bindGlobal();
        repositionScheduler.bindElement(
          resolveEditorWrapper(_editorView.dom, options.scrollContainerSelector),
        );

        // 注册编程式打开器(工具栏绿色 + / 块手柄 + 调用;按视图实例隔离)。
        registerSlashMenuOpener(_editorView, openPinnedMenu);

        // 菜单 DOM 补挂:运行中视图经 state.reconfigure 换插件数组时(collab
        // enableRealtime 绑定 ySync/yUndo/yCursor 即此),prosemirror-view 先销毁
        // 全部旧插件 view 再按新表重建——销毁会走 menuView.destroy() 把菜单从
        // portal 摘走,而本 view() 重建时不再创建 DOM,菜单从此缺席(敲 '/' 与
        // 工具栏 + 均静默失效)。同一元素复用补挂即可,事件监听不受影响。
        if (!menuView.menu.isConnected) {
          options.portalContainer.appendChild(menuView.menu);
        }

        return {
          update: (view: EditorView, previousState: EditorState) => {
            currentView = view;
            // 本次事务是否改变了文档内容(键入 '/' 的判定依据)。
            const docChanged = !previousState || previousState.doc !== view.state.doc;
            // 钉住态下,用户输入(文档变化)或点击他处(选区变化)即解除钉住;
            // opener 自身 dispatch 引起的首次 update(justPinned)除外。
            if (
              pinnedOpen &&
              !justPinned &&
              previousState &&
              (previousState.doc !== view.state.doc ||
                !previousState.selection.eq(view.state.selection))
            ) {
              pinnedOpen = false;
            }
            justPinned = false;
            syncMenuState(view, { docChanged });
          },
          destroy: () => {
            menuInteractable = false;
            pinnedOpen = false;
            repositionScheduler.destroy();
            registerSlashMenuOpener(_editorView, null);
            document.removeEventListener('mousedown', handleDocumentMouseDown, true);
            menuView.destroy();
          },
        };
      },
    });
  });
};
