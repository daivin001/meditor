/**
 * plugins/custom/writing-mode/writing-mode-plugin.ts — 专注模式 / 打字机模式
 *
 * - 专注模式:光标所在顶层块保持全亮,其余顶层块降不透明度(Decoration.node
 *   挂 class,CSS 按 data-focus-mode 开关生效);
 * - 打字机模式:光标行始终保持在编辑区垂直中线附近(选区变化后按光标坐标
 *   平滑滚动滚动容器,仅编辑器持焦时生效,不干扰宿主滚动)。
 *
 * 模式开关由宿主层(meditor API/客户端设置)经 controller 写入。
 */
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import { Plugin, PluginKey } from '@milkdown/prose/state';
import type { Node as ProseNode } from '@milkdown/prose/model';
import type { EditorState, Transaction } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import { $prose } from '@milkdown/utils';

/** 专注模式当前块 class。 */
const FOCUS_CURRENT_CLASS = 'zt-md-focus-current';

/**
 * 写入模式控制器(meditor 层经 API 切换,插件读取)。
 */
export interface WritingModeController {
  /** 专注模式是否生效。 */
  isFocusModeActive: () => boolean;
  /** 打字机模式是否生效。 */
  isTypewriterModeActive: () => boolean;
}

/**
 * 创建写入模式控制器。
 */
export const createWritingModeController = (): {
  controller: WritingModeController;
  setFocusMode: (active: boolean) => void;
  setTypewriterMode: (active: boolean) => void;
} => {
  /** 专注模式状态。 */
  let focusMode = false;
  /** 打字机模式状态。 */
  let typewriterMode = false;
  return {
    controller: {
      isFocusModeActive: () => focusMode,
      isTypewriterModeActive: () => typewriterMode
    },
    setFocusMode: (active: boolean) => {
      focusMode = active;
    },
    setTypewriterMode: (active: boolean) => {
      typewriterMode = active;
    }
  };
};

/**
 * 计算专注模式装饰:仅当前光标所在顶层块携带高亮 class。
 */
const buildFocusDecorations = (doc: ProseNode, head: number): DecorationSet => {
  // 光标所在顶层块起点(depth-1 祖先之前;depth 0 退化为当前 pos)。
  let blockPos: number;
  try {
    const $pos = doc.resolve(head);
    blockPos = $pos.depth >= 1 ? $pos.before(1) : $pos.pos;
  } catch {
    return DecorationSet.empty;
  }
  const node = doc.nodeAt(blockPos);
  if (!node) {
    return DecorationSet.empty;
  }
  return DecorationSet.create(doc, [
    Decoration.node(blockPos, blockPos + node.nodeSize, { class: FOCUS_CURRENT_CLASS })
  ]);
};

/**
 * 打字机滚动(选区变化后把光标行带到视口中线附近)。
 */
const applyTypewriterScroll = (view: EditorView, scrollContainer: HTMLElement): void => {
  if (!view.hasFocus || view.composing) {
    return;
  }
  try {
    const coords = view.coordsAtPos(view.state.selection.head);
    const containerRect = scrollContainer.getBoundingClientRect();
    const target = containerRect.top + scrollContainer.clientHeight / 2;
    // 光标行底部高于中线 → 上滚;低于中线 → 下滚;阈值 24px 防抖。
    const delta = coords.bottom - target;
    if (Math.abs(delta) > 24) {
      scrollContainer.scrollTop += delta;
    }
  } catch {
    // 坐标不可得(块边界等)静默跳过。
  }
};

/**
 * 创建写入模式插件(focus/typewriter 开关经 controller 读取)。
 */
export const createWritingModePlugin = (
  controller: WritingModeController,
  scrollContainer: HTMLElement
): ReturnType<typeof $prose> =>
  $prose(
    () =>
      new Plugin({
        key: new PluginKey('zt-md-writing-mode'),
        state: {
          init: (_config, state) => buildFocusDecorations(state.doc, state.selection.head),
          apply: (tr: Transaction, previous: DecorationSet) =>
            tr.docChanged || tr.selectionSet ? buildFocusDecorations(tr.doc, tr.selection.head) : previous
        },
        props: {
          decorations: (state: EditorState) => {
            if (!controller.isFocusModeActive()) {
              return DecorationSet.empty;
            }
            return writingModeKey.getState(state) as DecorationSet | undefined;
          }
        },
        view: () => ({
          update: (nextView: EditorView, prevState: EditorState) => {
            // 打字机:仅选区/文档变化时滚动(纯 view resize 不滚动)。
            if (
              controller.isTypewriterModeActive() &&
              (nextView.state.doc !== prevState.doc || !nextView.state.selection.eq(prevState.selection))
            ) {
              requestAnimationFrame(() => {
                applyTypewriterScroll(nextView, scrollContainer);
              });
            }
          }
        })
      })
  );

// 插件键(装饰读取,与插件实例同键)。
const writingModeKey = new PluginKey<DecorationSet>('zt-md-writing-mode');
