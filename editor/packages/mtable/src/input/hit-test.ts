/**
 * input/hit-test.ts — 输入命中的几何辅助(画布坐标换算与列边界命中)
 *
 * 从 createMtable 函数体拆出;被 pointer(鼠标)与 touch-scroll(触摸)
 * 两个子系统共用。触摸下列边界/筛选箭头命中的放宽容差也定义在此。
 */

import { COLUMN_RESIZE_HIT_ZONE } from '../theme';
import type { MtableContext } from '../context';

/** 触摸下列边界/筛选箭头命中的放宽容差(px),便于手指命中。 */
export const TOUCH_EDGE_TOLERANCE = 10;

/** 事件落点换算为画布坐标(px)。 */
export const getCanvasPos = (
  canvas: HTMLCanvasElement,
  event: { clientX: number; clientY: number }
): { x: number; y: number } => {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
};

/**
 * 列宽拖拽命中测试:列头带内指针距某列右缘 ≤ 热区(px)时返回该列号。
 * @param tolerance 边界容差(鼠标 ±4px;触摸点按/拖拽放宽以便手指命中)
 * @returns 边界左侧的列号,未命中返回 null
 */
export const hitTestColumnEdge = (ctx: MtableContext, x: number, y: number, tolerance: number = COLUMN_RESIZE_HIT_ZONE): number | null => {
  if (y >= ctx.config.columnHeaderHeight || x < ctx.config.rowHeaderWidth) return null;
  const gx = x - ctx.config.rowHeaderWidth + ctx.renderer.scrollX;
  let acc = 0;
  for (let c = 0; c < ctx.columnWidths.length; c += 1) {
    acc += ctx.columnWidths[c] ?? ctx.config.defaultColumnWidth;
    if (Math.abs(gx - acc) <= tolerance) {
      return c;
    }
  }
  return null;
};

/** 触摸用:数据区内也按 x 命中列边界(手指拖拽调宽不必精确落在列头带)。 */
export const hitTestColumnEdgeAnywhere = (ctx: MtableContext, x: number, tolerance: number): number | null => {
  const gx = x - ctx.config.rowHeaderWidth + ctx.renderer.scrollX;
  let acc = 0;
  for (let c = 0; c < ctx.columnWidths.length; c += 1) {
    acc += ctx.columnWidths[c] ?? ctx.config.defaultColumnWidth;
    if (Math.abs(gx - acc) <= tolerance) {
      return c;
    }
  }
  return null;
};

/** 被拖列新右缘的屏幕 x(列头/数据区定位线位置)。 */
export const colEdgeScreenX = (ctx: MtableContext, col: number): number => {
  return ctx.config.rowHeaderWidth + ctx.renderer.colToLeftPublic(col + 1) - ctx.renderer.scrollX;
};
