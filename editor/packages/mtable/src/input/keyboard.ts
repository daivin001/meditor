/**
 * input/keyboard.ts — 键盘交互子系统
 *
 * 从 createMtable 函数体拆出:编辑态(Enter 提交下移 / Escape 取消 /
 * Tab 提交右移)与网格态(方向键/Shift 扩展、Enter/F2 编辑、Delete 清空、
 * Tab/Home/End/PageUp/PageDown 导航、可打印字符直接编辑、Ctrl/Cmd+Z/Y
 * 撤销重做)。方向键纵向导航跳过被筛选隐藏的行。
 */

import { isMac } from '../platform';
import type { MtableContext, MtableKeyboardApi } from '../context';

/** 创建键盘子系统(canvas 与编辑浮层各绑同一 handler,见编排层事件绑定)。 */
export function createKeyboardController(ctx: MtableContext): MtableKeyboardApi {
  const { config, canvas, model } = ctx;

  const handleKeyDown = (event: KeyboardEvent): void => {
    // 编辑框内:Enter 提交并下移;Escape 取消;Tab 提交并右移
    if (ctx.editing) {
      if (event.key === 'Enter') {
        event.preventDefault();
        ctx.cellEditor.commitEdit(true);
        // 编辑框随提交隐藏,焦点回落到 body 会让后续键入丢失——还给 canvas
        // (Excel 语义:选中下一格后直接打字即进入编辑)。
        canvas.focus({ preventScroll: true });
      } else if (event.key === 'Escape') {
        event.preventDefault();
        ctx.editing = null;
        ctx.editorEl.style.display = 'none';
        canvas.focus();
        ctx.scheduleRender();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        // 提交后向右移动:编辑态必有选区(打开编辑框前已先选中),兜底取编辑单元格。
        const tabFromRow = ctx.selection?.startRow ?? ctx.editing.row;
        const tabFromCol = ctx.selection?.startCol ?? ctx.editing.col;
        ctx.cellEditor.commitEdit(false);
        ctx.selectionOps.setAnchorAndSelection(tabFromRow, Math.min(tabFromCol + 1, model.columnCount - 1));
        // 同 Enter:焦点还给 canvas,保证连续 Tab + 直接键入。
        canvas.focus({ preventScroll: true });
      }
      return;
    }

    const onMac = isMac();
    const mod = onMac ? event.metaKey : event.ctrlKey;

    if (mod && (event.key === 'z' || event.key === 'Z')) {
      event.preventDefault();
      if (event.shiftKey) {
        model.redo();
      } else {
        model.undo();
      }
      afterHistoryReplay(event.shiftKey ? 'redo' : 'undo');
      return;
    }
    if (mod && (event.key === 'y' || event.key === 'Y')) {
      event.preventDefault();
      model.redo();
      afterHistoryReplay('redo');
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      // 无选区:首个方向键从 A1 开始(用户主动交互才出现选中框)
      if (!ctx.selection) {
        ctx.selectionOps.setAnchorAndSelection(0, 0);
        ctx.scheduleRender();
        return;
      }
      const delta = event.shiftKey
        ? { row: event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0, col: event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0 }
        : null;
      if (delta) {
        // 纵向扩展跳过被筛选隐藏的行(横向扩展不受影响)
        const dir: 1 | -1 = delta.row < 0 ? -1 : 1;
        const targetRow = delta.row !== 0 ? ctx.filterSort.nextVisibleRow(ctx.selection.endRow, dir) : ctx.selection.endRow;
        ctx.selectionOps.extendSelectionTo(
          Math.min(Math.max(targetRow, 0), model.rowCount - 1),
          Math.min(Math.max(ctx.selection.endCol + delta.col, 0), model.columnCount - 1)
        );
      } else {
        const row = event.key === 'ArrowUp' ? ctx.filterSort.nextVisibleRow(ctx.selection.startRow, -1)
          : event.key === 'ArrowDown' ? ctx.filterSort.nextVisibleRow(ctx.selection.startRow, 1)
          : ctx.selection.startRow;
        const col = event.key === 'ArrowLeft' ? Math.max(ctx.selection.startCol - 1, 0)
          : event.key === 'ArrowRight' ? Math.min(ctx.selection.startCol + 1, model.columnCount - 1)
          : ctx.selection.startCol;
        ctx.selectionOps.setAnchorAndSelection(row, col);
      }
      ctx.scheduleRender();
      return;
    }

    if (event.key === 'Enter' || event.key === 'F2') {
      if (!ctx.selection) {
        return;
      }
      event.preventDefault();
      ctx.cellEditor.openEditor(ctx.selection.startRow, ctx.selection.startCol);
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      if (config.readOnly || !ctx.selection) return;
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
      return;
    }

    if (event.key === 'Tab') {
      if (!ctx.selection) {
        return;
      }
      event.preventDefault();
      const col = event.shiftKey
        ? Math.max(ctx.selection.startCol - 1, 0)
        : Math.min(ctx.selection.startCol + 1, model.columnCount - 1);
      ctx.selectionOps.setAnchorAndSelection(ctx.selection.startRow, col);
      ctx.scheduleRender();
      return;
    }

    // Home / End
    if (event.key === 'Home') {
      if (!ctx.selection) {
        return;
      }
      event.preventDefault();
      ctx.selectionOps.setAnchorAndSelection(event.ctrlKey ? 0 : ctx.selection.startRow, 0);
      ctx.scheduleRender();
      return;
    }
    if (event.key === 'End') {
      if (!ctx.selection) {
        return;
      }
      event.preventDefault();
      ctx.selectionOps.setAnchorAndSelection(ctx.selection.startRow, model.columnCount - 1);
      ctx.scheduleRender();
      return;
    }

    // PageUp / PageDown
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      if (!ctx.selection) {
        return;
      }
      event.preventDefault();
      const visibleRows = Math.max(Math.floor(ctx.renderer.view.gridHeight / config.defaultRowHeight) - 1, 1);
      const dir: 1 | -1 = event.key === 'PageUp' ? -1 : 1;
      // 逐行走可见行(跳过被筛选隐藏的行),步数 = 页高折算行数
      let row = ctx.selection.startRow;
      for (let step = 0; step < visibleRows; step += 1) {
        const next = ctx.filterSort.nextVisibleRow(row, dir);
        if (next === row) break;
        row = next;
      }
      ctx.selectionOps.setAnchorAndSelection(row, ctx.selection.startCol);
      ctx.scheduleRender();
      return;
    }

    // 可打印字符:直接进入编辑并输入(Excel 行为)
    if (!mod && !event.altKey && event.key.length === 1) {
      if (!ctx.selection) {
        return;
      }
      event.preventDefault();
      ctx.cellEditor.openEditor(ctx.selection.startRow, ctx.selection.startCol, event.key);
    }
  };

  /**
   * 撤销/重做回放后的统一善后(原两处 Ctrl+Z/Y 分支的内联序列;
   * 提取纯为去重,执行顺序与原实现逐条一致)。
   */
  const afterHistoryReplay = (source: 'undo' | 'redo'): void => {
    ctx.layout.recalcColumnWidths();
    ctx.layout.recalcRowHeights();
    if (config.isAutoAppendRows) ctx.layout.ensureTrailingEmptyRows();
    ctx.layout.ensureColumnCoverage();
    ctx.selectionOps.clampSelection();
    ctx.emitChange(source);
    ctx.scheduleRender();
  };

  return { handleKeyDown };
}
