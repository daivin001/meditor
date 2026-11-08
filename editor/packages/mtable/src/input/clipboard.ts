/**
 * input/clipboard.ts — 剪贴板子系统
 *
 * 从 createMtable 函数体拆出:选区复制(text/plain CSV)、剪切(复制后
 * 清空选区)、粘贴(解析 CSV 写入,目标区超界自动扩容,选区扩展到粘贴范围)。
 */

import { parseCsv, stringifyCsv } from '../csv';
import { normalizeSelection } from '../core/selection';
import type { MtableContext, MtableClipboardApi } from '../context';

/** 创建剪贴板子系统。 */
export function createClipboardController(ctx: MtableContext): MtableClipboardApi {
  const { config, model } = ctx;

  const handleCopy = (event: ClipboardEvent): void => {
    if (ctx.editing || !ctx.selection) return;
    const rows: string[][] = [];
    for (let r = ctx.selection.startRow; r <= ctx.selection.endRow; r += 1) {
      const row: string[] = [];
      for (let c = ctx.selection.startCol; c <= ctx.selection.endCol; c += 1) {
        row.push(model.getCell(r, c));
      }
      rows.push(row);
    }
    event.clipboardData?.setData('text/plain', stringifyCsv(rows, config.delimiter));
    event.preventDefault();
  };

  const handleCut = (event: ClipboardEvent): void => {
    if (ctx.editing || config.readOnly || !ctx.selection) return;
    handleCopy(event);
    const changes: Array<{ row: number; col: number; after: string }> = [];
    for (let r = ctx.selection.startRow; r <= ctx.selection.endRow; r += 1) {
      for (let c = ctx.selection.startCol; c <= ctx.selection.endCol; c += 1) {
        if (model.getCell(r, c) !== '') {
          changes.push({ row: r, col: c, after: '' });
        }
      }
    }
    model.applyCellChanges(changes);
    ctx.layout.recalcRowHeights();
    ctx.emitChange();
    ctx.scheduleRender();
  };

  const handlePaste = (event: ClipboardEvent): void => {
    if (ctx.editing || config.readOnly || !ctx.selection) return;
    const text = event.clipboardData?.getData('text/plain');
    if (text === undefined || text.length === 0) return;
    event.preventDefault();
    const parsed = parseCsv(text, config.delimiter);
    // 粘贴超界自动扩容(Excel 行为):目标区超出当前网格时追加空白行/列,
    // 但不超过 maxRowCount(无限滚动的内存保护上限);超上限部分仍丢弃。
    const neededRows = Math.min(ctx.selection.startRow + parsed.length, config.maxRowCount);
    const neededCols = ctx.selection.startCol + (parsed[0]?.length ?? 1);
    if (neededRows > model.rowCount || neededCols > model.columnCount) {
      // 自动增长模式下按需精确扩容(最小行列数参数不适用),避免一次粘贴铺出大网格
      model.ensureCapacity(
        config.isAutoAppendRows ? neededRows : Math.max(neededRows, config.minRowCount),
        config.isAutoAppendCols ? neededCols : Math.max(neededCols, config.minColumnCount)
      );
    }
    const changes: Array<{ row: number; col: number; after: string }> = [];
    for (let r = 0; r < parsed.length; r += 1) {
      const parsedRow = parsed[r] ?? [];
      for (let c = 0; c < parsedRow.length; c += 1) {
        const targetRow = ctx.selection.startRow + r;
        const targetCol = ctx.selection.startCol + c;
        if (targetRow < model.rowCount && targetCol < model.columnCount) {
          changes.push({ row: targetRow, col: targetCol, after: parsedRow[c] ?? '' });
        }
      }
    }
    model.applyCellChanges(changes);
    ctx.layout.recalcColumnWidths();
    ctx.layout.recalcRowHeights();
    if (config.isAutoAppendRows) ctx.layout.ensureTrailingEmptyRows();
    // 选区扩展到粘贴范围
    ctx.selection = normalizeSelection(
      {
        startRow: ctx.selection.startRow,
        startCol: ctx.selection.startCol,
        endRow: ctx.selection.startRow + parsed.length - 1,
        endCol: ctx.selection.startCol + (parsed[0]?.length ?? 1) - 1
      },
      model.rowCount,
      model.columnCount
    );
    ctx.emitChange();
    ctx.scheduleRender();
  };

  return { handleCopy, handleCut, handlePaste };
}
