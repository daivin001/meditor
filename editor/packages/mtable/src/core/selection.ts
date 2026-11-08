/**
 * core/selection.ts — 选区导航操作子系统与选区归一化纯函数
 *
 * 从 createMtable 函数体拆出:选区/锚点的收拢、扩展与界内裁剪。
 * 选区状态(selection/anchor)挂在共享上下文上——鼠标、键盘、剪贴板、
 * 右键菜单与对外 API 都直接读写;本模块提供统一的导航操作。
 */

import type { MtableSelection } from '../types';
import type { MtableContext, MtableSelectionOpsApi } from '../context';

/** 归一化选区(保证 start ≤ end 且在界内)。 */
export function normalizeSelection(sel: MtableSelection, rowCount: number, colCount: number): MtableSelection {
  const maxRow = Math.max(rowCount - 1, 0);
  const maxCol = Math.max(colCount - 1, 0);
  const startRow = Math.min(Math.max(sel.startRow, 0), maxRow);
  const endRow = Math.min(Math.max(sel.endRow, 0), maxRow);
  const startCol = Math.min(Math.max(sel.startCol, 0), maxCol);
  const endCol = Math.min(Math.max(sel.endCol, 0), maxCol);
  return {
    startRow: Math.min(startRow, endRow),
    endRow: Math.max(startRow, endRow),
    startCol: Math.min(startCol, endCol),
    endCol: Math.max(startCol, endCol)
  };
}

/** 创建选区导航操作子系统。 */
export function createSelectionController(ctx: MtableContext): MtableSelectionOpsApi {
  const { model } = ctx;

  /** 设置锚点并收拢选区到该单元格。 */
  const setAnchorAndSelection = (row: number, col: number): void => {
    ctx.anchor = { row, col };
    ctx.selection = normalizeSelection(
      { startRow: row, startCol: col, endRow: row, endCol: col },
      model.rowCount,
      model.columnCount
    );
    ctx.layout.scrollCellIntoViewWithExpand(row, col);
  };

  /** 锚点不动,扩展选区到指定单元格(Shift 导航)。 */
  const extendSelectionTo = (row: number, col: number): void => {
    ctx.selection = normalizeSelection(
      { startRow: ctx.anchor.row, startCol: ctx.anchor.col, endRow: row, endCol: col },
      model.rowCount,
      model.columnCount
    );
    ctx.layout.scrollCellIntoViewWithExpand(row, col);
  };

  /** 选区裁剪到数据界内(行列删除后调用)。 */
  const clampSelection = (): void => {
    if (!ctx.selection) {
      return;
    }
    ctx.selection = normalizeSelection(ctx.selection, model.rowCount, model.columnCount);
    ctx.anchor = {
      row: Math.min(ctx.anchor.row, model.rowCount - 1),
      col: Math.min(ctx.anchor.col, model.columnCount - 1)
    };
  };

  return { setAnchorAndSelection, extendSelectionTo, clampSelection };
}
