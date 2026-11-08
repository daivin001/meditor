/**
 * menu/context-menu.ts — 右键菜单子系统
 *
 * 从 createMtable 函数体拆出:菜单浮层 DOM 的创建/关闭与按目标单元格
 * 重建菜单项(插入/删除行列、清空内容、冻结行/列)。
 * 菜单挂载在 ctx.overlayContainer(默认 body;宿主全屏弹窗时随表格搬移)。
 */

import type { MtableContext, MtableContextMenuApi } from '../context';

/** 创建右键菜单子系统(创建时即挂入当前浮层容器,与原初始化顺序一致)。 */
export function createContextMenu(ctx: MtableContext): MtableContextMenuApi {
  const { config, model } = ctx;

  const element = document.createElement('div');
  element.className = 'mtable-context-menu';
  ctx.overlayContainer.appendChild(element);

  /** 关闭右键菜单。 */
  const close = (): void => {
    element.style.display = 'none';
  };

  /** 构建右键菜单项。 */
  const build = (row: number, col: number): void => {
    element.innerHTML = '';
    const messages = config.messages;
    const items: Array<{ label: string; action: () => void; disabled?: boolean }> = [
      {
        label: messages.insertRow,
        action: () => {
          if (config.readOnly) return;
          // model.insertRows 内部已同步插入 rowHeights(默认行高),无需再 splice
          model.insertRows(row, 1);
          ctx.selectionOps.clampSelection();
          if (config.isAutoAppendRows) ctx.layout.ensureTrailingEmptyRows();
          ctx.emitChange();
          ctx.scheduleRender();
        }
      },
      {
        label: messages.deleteRow,
        action: () => {
          if (config.readOnly) return;
          model.deleteRows(row, 1);
          ctx.selectionOps.clampSelection();
          if (config.isAutoAppendRows) ctx.layout.ensureTrailingEmptyRows();
          ctx.emitChange();
          ctx.scheduleRender();
        }
      },
      {
        label: messages.insertColumn,
        action: () => {
          if (config.readOnly) return;
          model.insertCols(col, 1);
          ctx.layout.shiftManualWidthColsForInsert(col);
          if (config.autoColumnWidth) {
            ctx.layout.recalcColumnWidths();
          }
          ctx.layout.recalcRowHeights();
          ctx.selectionOps.clampSelection();
          ctx.emitChange();
          ctx.scheduleRender();
        }
      },
      {
        label: messages.deleteColumn,
        action: () => {
          if (config.readOnly) return;
          model.deleteCols(col, 1);
          ctx.layout.shiftManualWidthColsForDelete(col);
          if (config.autoColumnWidth) {
            ctx.layout.recalcColumnWidths();
          }
          ctx.layout.recalcRowHeights();
          ctx.selectionOps.clampSelection();
          ctx.layout.ensureColumnCoverage();
          ctx.emitChange();
          ctx.scheduleRender();
        }
      },
      {
        label: messages.clearContents,
        action: () => {
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
        }
      },
      {
        label:
          ctx.freezeRow === row
            ? messages.unfreezeRow
            : messages.freezeRow.replace('{0}', String(row + 1)),
        action: () => {
          ctx.freezeRow = ctx.freezeRow === row ? -1 : row;
          ctx.filterSort.invalidateHiddenRows();
          ctx.filterSort.applyFilterChange();
        }
      },
      {
        label:
          ctx.freezeCol === col
            ? messages.unfreezeCol
            : messages.freezeCol.replace('{0}', String(col + 1)),
        action: () => {
          ctx.freezeCol = ctx.freezeCol === col ? -1 : col;
          ctx.filterSort.invalidateHiddenRows();
          ctx.filterSort.applyFilterChange();
        }
      }
    ];
    for (const item of items) {
      const btn = document.createElement('div');
      btn.className = 'mtable-context-menu-item';
      btn.textContent = item.label;
      if (config.readOnly) {
        btn.dataset.disabled = 'true';
      }
      btn.addEventListener('click', () => {
        close();
        if (!config.readOnly) item.action();
      });
      element.appendChild(btn);
    }
  };

  return { element, close, build };
}
