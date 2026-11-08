/**
 * plugins/custom/layout-block/layout-block-behavior.ts — 隐藏布局块的行为补偿插件
 *
 * 布局块在正常模式完全隐藏(零占位),但节点仍在文档模型里,必须补偿两点,
 * 否则"隐藏"会变成"隐形地碍事":
 * - 导航跳过:方向键移动光标时不落在布局块上——方向侧紧邻布局块时跳过整段
 *   连续布局块(含跨容器),落到最近的文本位置;
 * - 删除保护:布局模式关闭时拦截会删除/覆盖布局块的用户侧事务(退格、全选
 *   删除、粘贴覆盖、剪切、拖拽等统一收口),防止隐形块被无感丢失。放行通道:
 *   布局模式开启、程序化整篇替换(runUnprotected)、撤销/重做、协同远端同步。
 */
import { Plugin, PluginKey, TextSelection, NodeSelection } from '@milkdown/prose/state';
import type { EditorState, Transaction } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import type { Node as ProseNode } from '@milkdown/prose/model';
import { $prose } from '@milkdown/utils';
import { ySyncPluginKey } from 'y-prosemirror';
import { MEDITOR_LAYOUT_NODE_NAME } from './layout-block-plugin';

/**
 * 行为插件运行控制器(模式状态与保护绕行由 meditor 编排层持有,每实例一份)。
 */
export interface LayoutBlockBehaviorController {
  /** 设置布局模式是否生效(生效时删除保护全部放行)。 */
  setModeActive: (active: boolean) => void;
  /** 布局模式是否生效。 */
  isActive: () => boolean;
  /** 在删除保护绕行状态下执行程序化事务(整篇替换等;支持嵌套恢复原态)。 */
  runUnprotected: <T>(fn: () => T) => T;
  /** 当前是否处于绕行状态(插件内部消费)。 */
  isBypassed: () => boolean;
}

/**
 * 创建行为插件控制器(闭包状态,多实例互不串扰)。
 */
export const createLayoutBlockBehaviorController = (): LayoutBlockBehaviorController => {
  let modeActive = false;
  let bypass = false;
  return {
    setModeActive: (active: boolean): void => {
      modeActive = active;
    },
    isActive: (): boolean => modeActive,
    runUnprotected: <T>(fn: () => T): T => {
      const previous = bypass;
      bypass = true;
      try {
        return fn();
      } finally {
        bypass = previous;
      }
    },
    isBypassed: (): boolean => bypass,
  };
};

/**
 * 判断节点是否为布局块。
 */
const isLayoutNode = (node: ProseNode | null | undefined): boolean =>
  node?.type.name === MEDITOR_LAYOUT_NODE_NAME;

/**
 * 从停靠位置出发,沿方向跳过连续布局块,返回越过后的停靠点。
 * dir=1 向后(看 nodeAfter),dir=-1 向前(看 nodeBefore);当前层耗尽时上移
 * 到父层容器出口/入口继续(quote/list 内的连续块可跨界);未遇到任何布局块
 * 返回 null(调用方交还默认导航)。guard 兜底防御异常环形结构。
 */
const skipConsecutiveLayoutBlocks = (doc: ProseNode, from: number, dir: 1 | -1): number | null => {
  let position = from;
  let crossed = false;
  for (let guard = 0; guard < 512; guard += 1) {
    const $pos = doc.resolve(position);
    const neighbor = dir === 1 ? $pos.nodeAfter : $pos.nodeBefore;
    if (neighbor && isLayoutNode(neighbor)) {
      // 越过该布局块,继续看下一个邻居。
      crossed = true;
      position = dir === 1 ? position + neighbor.nodeSize : position - neighbor.nodeSize;
      continue;
    }
    if (!neighbor && $pos.depth > 0) {
      // 当前容器层耗尽:上移到容器边界之外继续找。
      position = dir === 1 ? $pos.after($pos.depth) : $pos.before($pos.depth);
      continue;
    }
    break;
  }
  return crossed ? position : null;
};

/**
 * 方向键导航:光标(或节点选中态)方向侧紧邻布局块时,跳过整段连续布局块
 * 落到最近文本位置;方向侧无布局块时交还默认导航。
 */
const handleArrowNavigation = (view: EditorView, event: KeyboardEvent, dir: 1 | -1): boolean => {
  const { state } = view;
  const { doc, selection } = state;
  if (!selection.empty) {
    return false;
  }

  // 扫描起点:NodeSelection 落在布局块上时从节点边缘出发;光标在文本块内时从
  // 所在块的方向侧边界出发(避免把块内文本误判为块级邻居);顶层光标原地出发。
  let scanFrom: number;
  if (selection instanceof NodeSelection && isLayoutNode(selection.node)) {
    scanFrom = dir === 1 ? selection.to : selection.from;
  } else {
    const $from = doc.resolve(selection.from);
    scanFrom =
      $from.depth === 0 ? selection.from : dir === 1 ? $from.after($from.depth) : $from.before($from.depth);
  }

  const stopPosition = skipConsecutiveLayoutBlocks(doc, scanFrom, dir);
  if (stopPosition === null) {
    return false;
  }

  event.preventDefault();
  const nextSelection = TextSelection.near(doc.resolve(stopPosition), dir);
  view.dispatch(state.tr.setSelection(nextSelection).scrollIntoView());
  return true;
};

/**
 * 创建隐藏布局块行为插件(导航跳过 + 删除保护,单插件双职责)。
 */
export const createLayoutBlockBehaviorPlugin = (controller: LayoutBlockBehaviorController) => {
  return $prose((): Plugin => {
    return new Plugin({
      key: new PluginKey('zt-md-layout-block-behavior'),
      props: {
        handleKeyDown: (view: EditorView, event: KeyboardEvent): boolean => {
          if (event.key === 'ArrowDown') {
            return handleArrowNavigation(view, event, 1);
          }
          if (event.key === 'ArrowUp') {
            return handleArrowNavigation(view, event, -1);
          }
          return false;
        },
      },
      /**
       * 删除保护:布局模式关闭时,拦截删除/覆盖布局块的用户侧事务。
       * (filterTransaction 是 Plugin 顶层钩子,不属于 props。)
       */
      filterTransaction: (transaction: Transaction, state: EditorState): boolean => {
          if (!transaction.docChanged) {
            return true;
          }
          // 布局模式开启:块可见可编辑,全部放行。
          if (controller.isActive()) {
            return true;
          }
          // 程序化整篇替换(setMarkdown/翻译恢复/版本恢复/受控回填等)放行。
          if (controller.isBypassed()) {
            return true;
          }
          // 协同远端同步放行(远端内容即真相;首版已知取舍,本端不再拦远端)。
          if (transaction.getMeta(ySyncPluginKey) !== undefined) {
            return true;
          }
          // 撤销/重做放行:与其让撤销在含块文档里静默失效,不如允许回退到
          // 布局块的创建步(可见正文的误删主通道仍被拦截)。
          if (transaction.getMeta('history$') !== undefined) {
            return true;
          }

          // 逐一检查既有布局块是否被本事务删除/覆盖(等值节点仍在则放行)。
          let layoutRemoved = false;
          state.doc.descendants((node, pos) => {
            if (layoutRemoved || !isLayoutNode(node)) {
              return;
            }
            const mapped = transaction.mapping.map(pos, 1);
            const survived = transaction.doc.nodeAt(mapped);
            if (
              !isLayoutNode(survived) ||
              String(survived?.attrs.value ?? '') !== String(node.attrs.value ?? '')
            ) {
              layoutRemoved = true;
            }
          });
          return !layoutRemoved;
        },
    });
  });
};
