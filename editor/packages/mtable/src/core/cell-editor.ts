/**
 * core/cell-editor.ts — 单元格编辑框子系统
 *
 * 从 createMtable 函数体拆出:编辑浮层(原生 input,中文 IME 由原生 input
 * 保证)的打开与提交。编辑态标记挂在 ctx.editing(渲染层据此绘制编辑高亮),
 * DOM 引用为 ctx.editorEl。
 */

import type { MtableContext, MtableCellEditorApi } from '../context';

/** 创建单元格编辑框子系统。 */
export function createCellEditor(ctx: MtableContext): MtableCellEditorApi {
  const { config, model } = ctx;

  /** 提交编辑框内容到模型。 */
  const commitEdit = (moveAfter: boolean): void => {
    if (!ctx.editing) return;
    const { row, col, initialValue } = ctx.editing;
    const next = ctx.editorEl.value;
    ctx.editing = null;
    ctx.editorEl.style.display = 'none';
    if (next !== initialValue) {
      model.applyCellChanges([{ row, col, after: next }]);
      if (config.autoColumnWidth) {
        ctx.layout.recalcColumnWidths();
      }
      ctx.layout.recalcRowHeights(col);
      if (config.isAutoAppendRows) {
        ctx.layout.ensureTrailingEmptyRows();
      }
      ctx.emitChange();
    }
    if (moveAfter) {
      // Enter 向下移动(跳过被筛选隐藏的行)
      const nextRow = ctx.filterSort.nextVisibleRow(row, 1);
      ctx.selectionOps.setAnchorAndSelection(nextRow, col);
    }
    ctx.scheduleRender();
  };

  /** 打开单元格编辑框。 */
  const openEditor = (row: number, col: number, initialText?: string): void => {
    if (config.readOnly) return;
    commitEdit(false);
    const left = ctx.renderer.colToLeftPublic(col) - ctx.renderer.scrollX + config.rowHeaderWidth;
    const top = ctx.renderer.rowToTopPublic(row) - ctx.renderer.scrollY + config.columnHeaderHeight;
    const width = ctx.columnWidths[col] ?? config.defaultColumnWidth;
    const height = model.rowHeights[row] ?? config.defaultRowHeight;
    ctx.editorEl.value = initialText ?? model.getCell(row, col);
    ctx.editing = { row, col, initialValue: ctx.editorEl.value };
    ctx.editorEl.style.display = 'block';
    ctx.editorEl.style.left = `${left}px`;
    ctx.editorEl.style.top = `${top}px`;
    ctx.editorEl.style.width = `${width}px`;
    ctx.editorEl.style.height = `${height}px`;
    ctx.editorEl.focus();
    // 全选或置于末尾(双击进入时保留文本,光标在末尾)
    if (initialText === undefined) {
      ctx.editorEl.select();
    } else {
      ctx.editorEl.setSelectionRange(ctx.editorEl.value.length, ctx.editorEl.value.length);
    }
    ctx.scheduleRender();
  };

  return { commitEdit, openEditor };
}
