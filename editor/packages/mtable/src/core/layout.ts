/**
 * core/layout.ts — 列宽/行高度量与网格扩容子系统
 *
 * 从 createMtable 函数体拆出:手动列宽集合、按内容自适应列宽、按换行
 * 行数自适应行高、数据行列统计、自动加行/加列的网格扩容保证。
 * 运行态(ctx.columnWidths / ctx.manualWidthCols)挂在共享上下文上。
 */

import { getMeasureContext, wrapCellText } from '../text-measure';
import { CELL_LINE_HEIGHT, CELL_TEXT_PADDING, HEADER_FONT_SIZE, MTABLE_FONT_FAMILY } from '../theme';
import type { MtableContext, MtableLayoutApi } from '../context';

/** 列宽/行高/扩容自适应上限(按内容自适应列宽的封顶值,原实现内联常量)。 */
const AUTO_COLUMN_MAX_WIDTH = 260;

/**
 * 创建布局子系统。
 * @param ctx 共享上下文(读取 config/model/canvas/renderer,读写 columnWidths/manualWidthCols)
 */
export function createLayoutController(ctx: MtableContext): MtableLayoutApi {
  const { config, model } = ctx;

  /** 插列后平移手动列宽集合(at 及其后的列号 +1)。 */
  const shiftManualWidthColsForInsert = (at: number): void => {
    const next = Array.from(ctx.manualWidthCols, (c) => (c >= at ? c + 1 : c));
    ctx.manualWidthCols.clear();
    for (const c of next) ctx.manualWidthCols.add(c);
  };

  /** 删列后平移手动列宽集合(at 列移除,其后列号 -1)。 */
  const shiftManualWidthColsForDelete = (at: number): void => {
    const next = Array.from(ctx.manualWidthCols, (c) => (c === at ? -1 : c > at ? c - 1 : c)).filter((c) => c >= 0);
    ctx.manualWidthCols.clear();
    for (const c of next) ctx.manualWidthCols.add(c);
  };

  /** 按内容自适应列宽(文本宽 + 2×6 padding,夹在 [defaultColumnWidth, 260]);手动拖拽过的列跳过重算。 */
  const recalcColumnWidths = (): void => {
    if (!config.autoColumnWidth) {
      ctx.columnWidths = Array.from(
        { length: model.columnCount },
        (_, c) => (ctx.manualWidthCols.has(c) ? ctx.columnWidths[c] ?? config.defaultColumnWidth : config.defaultColumnWidth)
      );
      return;
    }
    const mctx = getMeasureContext();
    mctx.font = `${HEADER_FONT_SIZE}px ${MTABLE_FONT_FAMILY}`;
    // 回调运行期间 ctx.columnWidths 仍是旧数组(赋值发生在 Array.from 返回后),
    // 手动拖拽过的列保持用户拖出的宽度(仅会话内),与原闭包语义一致
    ctx.columnWidths = Array.from({ length: model.columnCount }, (_, c) => {
      if (ctx.manualWidthCols.has(c)) {
        return ctx.columnWidths[c] ?? config.defaultColumnWidth;
      }
      let max = 0;
      for (let r = 0; r < model.rowCount; r += 1) {
        const text = model.getCell(r, c);
        if (text.length > 0) {
          max = Math.max(max, mctx.measureText(text).width);
        }
      }
      return Math.min(Math.max(Math.ceil(max) + 12, config.defaultColumnWidth), AUTO_COLUMN_MAX_WIDTH);
    });
  };

  /**
   * 单行自适应高度:各单元格文本按当前列宽换行,取最大行数折算行高。
   * 单行/空行保持默认行高,多行 = 行数 × CELL_LINE_HEIGHT + 上下留白 6px。
   */
  const measureRowHeight = (row: number): number => {
    let maxLines = 1;
    for (let c = 0; c < model.columnCount; c += 1) {
      const text = model.getCell(row, c);
      if (text.length === 0) continue;
      const colWidth = ctx.columnWidths[c] ?? config.defaultColumnWidth;
      const lines = wrapCellText(text, Math.max(colWidth - CELL_TEXT_PADDING * 2, 8)).length;
      if (lines > maxLines) maxLines = lines;
    }
    if (maxLines <= 1) return config.defaultRowHeight;
    return Math.max(config.defaultRowHeight, maxLines * CELL_LINE_HEIGHT + 6);
  };

  /**
   * 按当前列宽重算数据区行高(自动换行自适应;空白行保持默认高)。
   * 总高变化时触发 onLayoutChange(宿主同步容器高度;拖拽列宽不产生 CSV 变更,
   * onChange 不触发,布局回调是宿主感知行高变化的唯一通道)。
   * @param onlyCol 仅重算该列有文本的行(拖拽列宽路径的增量优化;省略 = 全表)
   */
  const recalcRowHeights = (onlyCol?: number): void => {
    const prevTotal = model.rowHeights.reduce((sum, h) => sum + h, 0);
    const dataRows = getDataRowCount();
    if (onlyCol === undefined) {
      for (let r = 0; r < dataRows; r += 1) {
        model.rowHeights[r] = measureRowHeight(r);
      }
    } else {
      for (let r = 0; r < dataRows; r += 1) {
        // 其他列的换行行数不受本列宽度影响;本列空且行高已是默认的行无需重算
        // (本列空但行高非默认:可能是刚清空的多行文本,仍要重算缩回)
        if (model.getCell(r, onlyCol) === '' && model.rowHeights[r] === config.defaultRowHeight) continue;
        model.rowHeights[r] = measureRowHeight(r);
      }
    }
    const nextTotal = model.rowHeights.reduce((sum, h) => sum + h, 0);
    if (nextTotal !== prevTotal) {
      config.onLayoutChange?.();
    }
  };

  /** 数据行数(尾部全空行不计)。 */
  const getDataRowCount = (): number => {
    let last = model.cells.length - 1;
    while (last >= 0 && model.cells[last]?.every((cell) => cell === '')) {
      last -= 1;
    }
    return last + 1;
  };

  /** 数据列数(尾部全空列不计,取所有行的最大非空列)。 */
  const getDataColCount = (): number => {
    let lastCol = -1;
    for (const row of model.cells) {
      for (let c = row.length - 1; c > lastCol; c -= 1) {
        if (row[c] !== '') {
          lastCol = c;
          break;
        }
      }
    }
    return lastCol + 1;
  };

  /**
   * 自动加行模式:数据末尾空行数 ≤ 阈值时,补行至 空行 = 阈值 + 步长
   * (只增不减;序列化时空行不输出,多出的空行不影响 CSV)。
   */
  const ensureTrailingEmptyRows = (): void => {
    const dataRows = getDataRowCount();
    const emptyRows = model.rowCount - dataRows;
    if (emptyRows <= Math.max(config.autoAppendRowsThreshold, 0)) {
      const targetRows = Math.min(
        dataRows + Math.max(config.autoAppendRowsThreshold, 0) + Math.max(config.autoAppendRowsStep, 1),
        config.maxRowCount
      );
      if (model.rowCount < targetRows) {
        model.ensureCapacity(targetRows, model.columnCount);
      }
    }
  };

  /**
   * 自动增加列模式:保证列覆盖。
   * 不变量:数据末尾空列数 ≤ 阈值时补列至 空列 = 阈值 + 步长;
   * 所有列宽之和 ≥ 数据区可视宽度(不足时按步长的倍数补列,直至覆盖为止)。
   * 布局前(canvas 尚无宽度)只做空列阈值检查,宽度覆盖由 ResizeObserver 再次触发。
   */
  const ensureColumnCoverage = (): void => {
    if (!config.isAutoAppendCols) {
      return;
    }
    const step = Math.max(config.autoAppendColsStep, 1);
    const dataCols = getDataColCount();
    const emptyCols = model.columnCount - dataCols;
    let target = model.columnCount;
    if (emptyCols <= Math.max(config.autoAppendColsThreshold, 0)) {
      target = dataCols + Math.max(config.autoAppendColsThreshold, 0) + step;
    }
    // 宽度覆盖:前缀列宽合计(超出已计算部分的列按默认列宽计)不足可视宽度时按步长倍数递增
    const widthThrough = (count: number): number => {
      let sum = 0;
      for (let c = 0; c < count; c += 1) {
        sum += ctx.columnWidths[c] ?? config.defaultColumnWidth;
      }
      return sum;
    };
    const viewportWidth = Math.max(ctx.canvas.clientWidth - config.rowHeaderWidth, 0);
    let guard = 0;
    while (viewportWidth > 0 && widthThrough(target) < viewportWidth && guard < 1000) {
      target += step;
      guard += 1;
    }
    if (target > model.columnCount) {
      model.ensureCapacity(model.rowCount, target);
      recalcColumnWidths();
    }
  };

  /**
   * 无限滚动:保证可视区(含底部缓冲)之下的空白行足够。
   * 行高全部为默认值,可直接用 px/行高 换算目标行数。
   * @param nextScrollY 即将到达的滚动位置(px)
   */
  const ensureRowsForViewport = (nextScrollY: number): void => {
    // 自动加行模式表格有底:不随滚动追加行
    if (config.isAutoAppendRows) {
      return;
    }
    const overscan = 200;
    const viewportBottom = nextScrollY + ctx.renderer.view.gridHeight + overscan;
    const rowsNeeded = Math.ceil(viewportBottom / config.defaultRowHeight);
    const target = Math.min(Math.max(rowsNeeded, config.minRowCount), config.maxRowCount);
    if (target > model.rowCount) {
      model.ensureCapacity(target, model.columnCount);
    }
  };

  /**
   * 无限滚动(键盘导航路径):保证目标行附近有足够的空白行可供滚动。
   */
  const scrollCellIntoViewWithExpand = (row: number, col: number): void => {
    if (row >= model.rowCount - 1) {
      ensureRowsForViewport(ctx.renderer.rowToTopPublic(Math.min(row + 1, config.maxRowCount - 1)));
    }
    ctx.renderer.scrollCellIntoView(row, col);
  };

  return {
    shiftManualWidthColsForInsert,
    shiftManualWidthColsForDelete,
    recalcColumnWidths,
    recalcRowHeights,
    getDataRowCount,
    getDataColCount,
    ensureTrailingEmptyRows,
    ensureColumnCoverage,
    ensureRowsForViewport,
    scrollCellIntoViewWithExpand
  };
}
