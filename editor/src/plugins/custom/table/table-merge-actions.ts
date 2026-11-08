/**
 * plugins/custom/table/table-merge-actions.ts — 合并/拆分单元格命令
 *
 * PM 层直接复用 prosemirror-tables(@milkdown/prose/tables):
 * - 合并:选区为 CellSelection 且覆盖多个单元格时 mergeCells 生效;
 * - 拆分:当前单元格 colspan/rowspan > 1 时 splitCell 生效。
 * markdown 层的往返由 table-span-schema(序列化)/ table-html-parse(解析)承担。
 */
import { CellSelection, mergeCells, splitCell } from '@milkdown/prose/tables';
import type { Node as ProseNode } from '@milkdown/prose/model';
import type { EditorState } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';

// 表头单元格节点名。
const TABLE_HEADER_NODE_NAME = 'table_header';
// 普通单元格节点名。
const TABLE_CELL_NODE_NAME = 'table_cell';

/**
 * 判断当前选区是否为跨单元格选区(CellSelection)。
 */
export const isCellSelection = (state: EditorState): boolean => state.selection instanceof CellSelection;

/**
 * 读取当前选区所在单元格节点与位置(选区非单元格时返回 null)。
 */
export const resolveSelectedCell = (
  state: EditorState
): { cell: ProseNode; pos: number } | null => {
  let result: { cell: ProseNode; pos: number } | null = null;
  try {
    state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
      if (result) return false;
      if (node.type.name === TABLE_CELL_NODE_NAME || node.type.name === TABLE_HEADER_NODE_NAME) {
        result = { cell: node, pos };
        return false;
      }
      return true;
    });
  } catch {
    return null;
  }
  return result;
};

/**
 * 当前选区是否可执行合并(跨单元格选区且命令可应用)。
 */
export const canMergeSelectedCells = (state: EditorState): boolean => {
  if (!isCellSelection(state)) {
    return false;
  }
  try {
    return mergeCells(state, undefined) === true;
  } catch {
    return false;
  }
};

/**
 * 对当前选区执行合并单元格(不满足条件时静默返回 false)。
 */
export const mergeSelectedCells = (view: EditorView): boolean => {
  if (!canMergeSelectedCells(view.state)) {
    return false;
  }
  const merged = mergeCells(view.state, view.dispatch) === true;
  if (merged) {
    view.focus();
  }
  return merged;
};

/**
 * 当前选区是否可执行拆分(所在单元格存在跨列/跨行)。
 */
export const canSplitSelectedCell = (state: EditorState): boolean => {
  const selected = resolveSelectedCell(state);
  if (!selected) {
    return false;
  }
  const { cell } = selected;
  const colspan = Number(cell.attrs.colspan ?? 1);
  const rowspan = Number(cell.attrs.rowspan ?? 1);
  return colspan > 1 || rowspan > 1;
};

/**
 * 对当前选区所在单元格执行拆分(无跨列/跨行时静默返回 false)。
 */
export const splitSelectedCell = (view: EditorView): boolean => {
  if (!canSplitSelectedCell(view.state)) {
    return false;
  }
  const split = splitCell(view.state, view.dispatch) === true;
  if (split) {
    view.focus();
  }
  return split;
};

/**
 * 判断表格节点中是否存在跨列/跨行单元格(序列化分流依据)。
 */
export const tableHasMerges = (tableNode: ProseNode): boolean => {
  let hasMerges = false;
  tableNode.descendants((node) => {
    if (hasMerges) return false;
    if (node.type.name === TABLE_CELL_NODE_NAME || node.type.name === TABLE_HEADER_NODE_NAME) {
      if (Number(node.attrs.colspan ?? 1) > 1 || Number(node.attrs.rowspan ?? 1) > 1) {
        hasMerges = true;
        return false;
      }
    }
    return true;
  });
  return hasMerges;
};
