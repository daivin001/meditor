/**
 * core/filter-sort.ts — 筛选/排序/冻结逻辑子系统
 *
 * 从 createMtable 函数体拆出:筛选条件命中判定、被筛选隐藏行集合的
 * 惰性缓存、可见行导航、排序应用(记录撤销)、单列重置与筛选变更应用。
 * 筛选/排序/冻结状态(filters/sortState/freezeRow/freezeCol)挂在共享
 * 上下文上——右键菜单(冻结)、面板(筛选/排序)与编排层(loadCsv 重置)
 * 都直接读写;本模块只提供操作。DOM 面板见 ui/filter-panel.ts。
 */

import { compareValues } from '../values';
import type { MtableContext, MtableFilterSortApi } from '../context';

/**
 * 创建筛选/排序/冻结逻辑子系统。
 * @param ctx 共享上下文(读取 config/model/renderer,读写 filters/sortState/freezeRow/freezeCol)
 */
export function createFilterSortController(ctx: MtableContext): MtableFilterSortApi {
  const { config, model } = ctx;

  // --- 隐藏行缓存(模块内实现细节;数据/条件变化后置脏,渲染帧惰性重算) ---

  let hiddenRowsCache: ReadonlySet<number> = new Set();
  let hiddenRowsDirty = true;

  /**
   * 数据行(0..数据行数)是否通过当前筛选(全部列条件取交集)。
   * 无任何条件时恒为 true。
   */
  const rowPassesFilter = (row: number): boolean => {
    if (ctx.filters.size === 0) return true;
    for (const [col, allowed] of ctx.filters) {
      if (allowed.size === 0) continue;
      if (!allowed.has(model.getCell(row, col))) return false;
    }
    return true;
  };

  /** 当前被筛选隐藏的数据行号集合(每次访问重算;行数 ≤ 数千,开销可忽略)。 */
  const computeHiddenRows = (): Set<number> => {
    const hidden = new Set<number>();
    if (ctx.filters.size === 0) return hidden;
    const dataRows = ctx.layout.getDataRowCount();
    for (let r = 0; r < dataRows; r += 1) {
      if (!rowPassesFilter(r)) hidden.add(r);
    }
    return hidden;
  };

  const invalidateHiddenRows = (): void => {
    hiddenRowsDirty = true;
  };

  const getHiddenRows = (): ReadonlySet<number> => {
    if (hiddenRowsDirty) {
      hiddenRowsCache = computeHiddenRows();
      hiddenRowsDirty = false;
    }
    return hiddenRowsCache;
  };

  /**
   * 数据行号方向键导航时的下一个可见行(跳过被筛选隐藏的行)。
   * @param from 起始数据行号
   * @param delta 方向(+1 向下 / -1 向上)
   */
  const nextVisibleRow = (from: number, delta: 1 | -1): number => {
    let r = from + delta;
    const hidden = getHiddenRows();
    while (r >= 0 && r < model.rowCount && hidden.has(r)) {
      r += delta;
    }
    return Math.min(Math.max(r, 0), model.rowCount - 1);
  };

  // --- 排序与筛选条件应用 ---

  /** 应用排序:数据行按该列值重排(尾部空行保持原位;记录撤销,可 Ctrl+Z 还原)。 */
  const applySort = (col: number, dir: 'asc' | 'desc'): void => {
    if (config.readOnly) return;
    const dataRows = ctx.layout.getDataRowCount();
    if (dataRows === 0) return;
    const total = model.cells.length;
    // 映射覆盖全部行:数据行按值排序,尾部空行(自动加行缓冲)保持原位
    const dataOrder = Array.from({ length: dataRows }, (_, i) => i);
    dataOrder.sort((a, b) => {
      const cmp = compareValues(model.getCell(a, col), model.getCell(b, col));
      return dir === 'asc' ? cmp : -cmp;
    });
    const order = [...dataOrder, ...Array.from({ length: total - dataRows }, (_, i) => dataRows + i)];
    // 逆映射:restore[order[i]] = i(撤销时还原到排序前顺序)
    const restore: number[] = new Array(total);
    for (let i = 0; i < total; i += 1) {
      restore[order[i]!] = i;
    }
    model.sortRows(order, restore);
    ctx.sortState = { col, dir };
    invalidateHiddenRows();
    ctx.renderer.refreshFilteredCols();
    ctx.selectionOps.clampSelection();
    ctx.layout.recalcColumnWidths();
    ctx.layout.recalcRowHeights();
    ctx.emitChange();
    ctx.scheduleRender();
  };

  /** 清除某列的筛选与排序(面板"重置"按钮)。 */
  const resetColumnFilterSort = (col: number): void => {
    ctx.filters.delete(col);
    if (ctx.sortState?.col === col) {
      ctx.sortState = null;
    }
    invalidateHiddenRows();
    ctx.renderer.refreshFilteredCols();
    ctx.scheduleRender();
  };

  /** 筛选条件变化后应用:重算隐藏行 + 刷新箭头状态 + 触发布局回调 + 重绘。 */
  const applyFilterChange = (): void => {
    const prevTotal = ctx.renderer.totalHeight;
    invalidateHiddenRows();
    ctx.renderer.refreshFilteredCols();
    const nextTotal = ctx.renderer.totalHeight;
    if (prevTotal !== nextTotal) {
      config.onLayoutChange?.();
    }
    ctx.scheduleRender();
  };

  /** 设置过筛选(选值子集)或排序的列,箭头"生效"态(渲染层每帧缓存)。 */
  const getFilteredCols = (): Set<number> => {
    const cols = new Set<number>();
    for (const [col, values] of ctx.filters) {
      if (values.size > 0) cols.add(col);
    }
    if (ctx.sortState) cols.add(ctx.sortState.col);
    return cols;
  };

  return {
    invalidateHiddenRows,
    getHiddenRows,
    nextVisibleRow,
    applySort,
    resetColumnFilterSort,
    applyFilterChange,
    getFilteredCols
  };
}
