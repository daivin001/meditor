/**
 * plugins/custom/block-handle/block-multi-select.ts — 顶层块多选(shift + 块手柄)
 *
 * - 选区:shift+点击把手以悬浮块为 head 扩展范围(仅顶层块,连续区间);
 * - 视觉:Decoration.node 给区间内全部顶层块加选中类;
 * - 批删:选区存在时 Backspace/Delete 删除整个区间;
 * - 多块拖:选区存在时把手 dragstart 以整个区间 slice 覆写 view.dragging
 *   (BlockService 先写单块,后写覆盖;move=true 原块随落点移动);
 * - 清除:任意选区/文档变化、普通点击把手、Esc 均清除;折叠状态不持久化。
 */
import { Plugin, PluginKey, TextSelection } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import type { EditorState } from '@milkdown/prose/state';

/**
 * 多选插件 key。
 */
export const BLOCK_MULTI_SELECT_KEY = new PluginKey<BlockMultiSelectState>('zt-md-block-multi-select');

/**
 * 多选状态(anchor/head 均为顶层块 before 位置;null 表示无选区)。
 */
export interface BlockMultiSelectState {
  /** 锚点块 before 位置。 */
  anchor: number | null;
  /** 头部块 before 位置(shift+点击扩展的末端)。 */
  head: number | null;
}

/**
 * 空状态。
 */
const EMPTY_STATE: BlockMultiSelectState = { anchor: null, head: null };

/**
 * 多选事务 meta 形状。
 */
interface BlockMultiSelectMeta {
  type: 'set' | 'clear';
  anchor?: number;
  head?: number;
}

/**
 * 解析位置所在的顶层块区间 [before, after);不在块内返回 null。
 */
const resolveTopLevelBlockSpan = (
  state: EditorState,
  pos: number
): { from: number; to: number } | null => {
  try {
    // 位置解析对象。
    const $pos = state.doc.resolve(pos);
    if ($pos.depth < 1) {
      return null;
    }
    // 顶层块 before 位置与块后位置。
    const before = $pos.before(1);
    const after = $pos.after(1);
    return { from: before, to: after };
  } catch {
    return null;
  }
};

/**
 * 读取当前多选区间的文档范围 [from, to);无选区返回 null。
 */
export const getBlockMultiSelectionRange = (view: EditorView): { from: number; to: number } | null => {
  // 当前多选状态。
  const state = BLOCK_MULTI_SELECT_KEY.getState(view.state);
  if (!state || state.anchor === null || state.head === null) {
    return null;
  }

  // 锚点块区间与头部块区间。
  const anchorSpan = resolveTopLevelBlockSpan(view.state, state.anchor);
  const headSpan = resolveTopLevelBlockSpan(view.state, state.head);
  if (!anchorSpan || !headSpan) {
    return null;
  }

  return {
    from: Math.min(anchorSpan.from, headSpan.from),
    to: Math.max(anchorSpan.to, headSpan.to)
  };
};

/**
 * 判断当前是否存在多选区。
 */
export const hasBlockMultiSelection = (view: EditorView): boolean => {
  return getBlockMultiSelectionRange(view) !== null;
};

/**
 * 设置多选区(anchor 为锚点块位置,head 为扩展末端块位置)。
 */
export const setBlockMultiSelection = (view: EditorView, anchor: number, head: number): void => {
  // 设置事务(仅 meta,不动文档与光标)。
  const meta: BlockMultiSelectMeta = { type: 'set', anchor, head };
  view.dispatch(view.state.tr.setMeta(BLOCK_MULTI_SELECT_KEY, meta));
};

/**
 * 清除多选区。
 */
export const clearBlockMultiSelection = (view: EditorView): void => {
  if (!hasBlockMultiSelection(view)) {
    return;
  }

  // 清除事务。
  const meta: BlockMultiSelectMeta = { type: 'clear' };
  view.dispatch(view.state.tr.setMeta(BLOCK_MULTI_SELECT_KEY, meta));
};

/**
 * 创建顶层块多选插件。
 */
export const createBlockMultiSelectPlugin = (): Plugin<BlockMultiSelectState> => {
  return new Plugin<BlockMultiSelectState>({
    key: BLOCK_MULTI_SELECT_KEY,
    state: {
      init: () => EMPTY_STATE,
      apply: (tr, prev) => {
        // 自身 meta 优先。
        const meta = tr.getMeta(BLOCK_MULTI_SELECT_KEY) as BlockMultiSelectMeta | undefined;
        if (meta?.type === 'set' && typeof meta.anchor === 'number' && typeof meta.head === 'number') {
          return { anchor: meta.anchor, head: meta.head };
        }
        if (meta?.type === 'clear') {
          return EMPTY_STATE;
        }
        // 任何文档/光标变化(拖放落点、点击、方向键)即清除。
        if (tr.docChanged || tr.selectionSet) {
          return EMPTY_STATE;
        }
        return prev;
      }
    },
    props: {
      // 区间内全部顶层块加选中类。
      decorations: (state) => {
        // 当前多选状态。
        const multi = BLOCK_MULTI_SELECT_KEY.getState(state);
        if (!multi || multi.anchor === null || multi.head === null) {
          return DecorationSet.empty;
        }

        // 锚点/头部块区间。
        const anchorSpan = resolveTopLevelBlockSpan(state, multi.anchor);
        const headSpan = resolveTopLevelBlockSpan(state, multi.head);
        if (!anchorSpan || !headSpan) {
          return DecorationSet.empty;
        }

        // 归一化区间端点。
        const from = Math.min(anchorSpan.from, headSpan.from);
        const to = Math.max(anchorSpan.to, headSpan.to);
        return DecorationSet.create(state.doc, [Decoration.node(from, to, { class: 'zt-md-block-selected' })]);
      },
      // 批删 + Esc 清除。
      handleKeyDown: (view, event) => {
        if (event.key === 'Escape' && hasBlockMultiSelection(view)) {
          clearBlockMultiSelection(view);
          return false;
        }

        if (event.key !== 'Backspace' && event.key !== 'Delete') {
          return false;
        }

        // 当前多选区间。
        const range = getBlockMultiSelectionRange(view);
        if (!range) {
          return false;
        }

        event.preventDefault();
        const transaction = view.state.tr
          .delete(range.from, range.to)
          .setMeta(BLOCK_MULTI_SELECT_KEY, { type: 'clear' } satisfies BlockMultiSelectMeta);
        transaction.setSelection(TextSelection.near(transaction.doc.resolve(range.from), 1));
        view.dispatch(transaction.scrollIntoView());
        view.focus();
        return true;
      }
    }
  });
};
