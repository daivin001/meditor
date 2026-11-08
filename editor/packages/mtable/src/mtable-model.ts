/**
 * mtable-model.ts — 表格数据模型
 *
 * 二维字符串矩阵 + 列宽/行高 + 撤销/重做栈。
 * 所有变更是"整批操作"粒度:一次 paste / delete / insert 记为一个 undo 单元。
 */

import type { MtableOp } from './types';

/** 数据模型配置(尺寸相关,均来自用户选项)。 */
export interface SheetModelConfig {
  defaultColumnWidth: number;
  defaultRowHeight: number;
  minRowCount: number;
  minColumnCount: number;
}

/** 表格数据模型。 */
export class MtableModel {
  /** 单元格数据(行 → 列 → 文本)。 */
  cells: string[][] = [];

  /** 列宽数组(px;下标 = 列号)。 */
  columnWidths: number[] = [];

  /** 行高数组(px;下标 = 行号)。 */
  rowHeights: number[] = [];

  /** 撤销栈(最新在末尾)。 */
  private undoStack: MtableOp[] = [];

  /** 重做栈(最新在末尾)。 */
  private redoStack: MtableOp[] = [];

  /** 撤销栈深度上限(内存保护)。 */
  private static readonly MAX_UNDO = 200;

  constructor(readonly config: SheetModelConfig) {}

  /** 行数。 */
  get rowCount(): number {
    return this.cells.length;
  }

  /** 列数(第一行长度;空表为 0)。 */
  get columnCount(): number {
    return this.cells[0]?.length ?? 0;
  }

  /** 读取单元格(越界返回空串)。 */
  getCell(row: number, col: number): string {
    return this.cells[row]?.[col] ?? '';
  }

  /**
   * 批量写单元格并记录撤销单元。
   * @param changes 坐标 → 新文本(坐标必须在界内)
   */
  applyCellChanges(changes: Array<{ row: number; col: number; after: string }>): void {
    if (changes.length === 0) return;
    const recorded: Array<{ row: number; col: number; before: string; after: string }> = [];
    for (const { row, col, after } of changes) {
      const before = this.getCell(row, col);
      if (before === after) continue;
      // 行按需扩容(写入超出当前矩阵的坐标时)
      while (this.cells.length <= row) {
        this.cells.push(new Array<string>(Math.max(this.columnCount, 1)).fill(''));
      }
      const grow = this.cells[row];
      if (grow && grow.length <= col) {
        while (grow.length <= col) {
          grow.push('');
        }
      }
      this.cells[row]![col] = after;
      recorded.push({ row, col, before, after });
    }
    if (recorded.length > 0) {
      this.pushOp({ type: 'cells', changes: recorded });
    }
  }

  /**
   * 在指定行号前插入 N 个空行。
   * @param at 插入位置(0..rowCount)
   * @param count 插入行数(≥1)
   */
  insertRows(at: number, count: number): void {
    const clamped = Math.min(Math.max(at, 0), this.rowCount);
    const width = Math.max(this.columnCount, this.config.minColumnCount);
    const fresh = Array.from({ length: count }, () => new Array<string>(width).fill(''));
    this.cells.splice(clamped, 0, ...fresh);
    this.rowHeights.splice(clamped, 0, ...Array.from({ length: count }, () => this.config.defaultRowHeight));
    this.pushOp({ type: 'insertRows', at: clamped, count });
  }

  /**
   * 删除 [at, at+count) 的行。
   * @returns 被删除的行数据(供撤销)
   */
  deleteRows(at: number, count: number): void {
    const clamped = this.clampSpan(at, count, this.rowCount);
    if (clamped.count === 0) return;
    const removed = this.cells.splice(clamped.at, clamped.count);
    this.rowHeights.splice(clamped.at, clamped.count);
    this.pushOp({ type: 'deleteRows', at: clamped.at, removed });
  }

  /**
   * 在指定列号前插入 N 个空列(含列宽/既有行扩列)。
   * @param at 插入位置(0..columnCount)
   * @param count 插入列数(≥1)
   */
  insertCols(at: number, count: number): void {
    const clamped = Math.min(Math.max(at, 0), this.columnCount);
    for (const row of this.cells) {
      row.splice(clamped, 0, ...Array.from({ length: count }, () => ''));
    }
    this.columnWidths.splice(clamped, 0, ...Array.from({ length: count }, () => this.config.defaultColumnWidth));
    this.pushOp({ type: 'insertCols', at: clamped, count });
  }

  /**
   * 删除 [at, at+count) 的列。
   * @returns 被删除的列数据(供撤销;按行取列)
   */
  deleteCols(at: number, count: number): void {
    const clamped = this.clampSpan(at, count, this.columnCount);
    if (clamped.count === 0) return;
    const removed: string[][] = this.cells.map((row) => row.splice(clamped.at, clamped.count));
    this.columnWidths.splice(clamped.at, clamped.count);
    this.pushOp({ type: 'deleteCols', at: clamped.at, removed });
  }

  /**
   * 纯空白扩容到至少 minRows × minCols(不记录撤销)。
   *
   * 用于无限滚动追行与粘贴自动扩容:只在尾部追加空白行列,既有索引全部不变,
   * 因此撤销栈中已记录的行列坐标依然有效。
   * @param minRows 目标行数下限
   * @param minCols 目标列数下限
   */
  ensureCapacity(minRows: number, minCols: number): void {
    const targetCols = Math.max(minCols, this.columnCount);
    // 先统一列宽(既有行补空列 + 列宽补默认值)
    if (targetCols > this.columnCount) {
      for (const row of this.cells) {
        while (row.length < targetCols) {
          row.push('');
        }
      }
      while (this.columnWidths.length < targetCols) {
        this.columnWidths.push(this.config.defaultColumnWidth);
      }
    }
    // 再追加空白行
    while (this.cells.length < minRows) {
      this.cells.push(new Array<string>(targetCols).fill(''));
      this.rowHeights.push(this.config.defaultRowHeight);
    }
  }

  /**
   * 按索引映射重排数据行(排序及撤销/重放内部用;不记录撤销)。
   * @param order 长度 = 当前行数的索引数组:新第 i 行 = 旧第 order[i] 行
   */
  private reorderRows(order: number[]): void {
    if (order.length !== this.cells.length) return;
    this.cells = order.map((i) => this.cells[i]!);
    this.rowHeights = order.map((i) => this.rowHeights[i] ?? this.config.defaultRowHeight);
  }

  /**
   * 排序:按索引映射重排全部行并记录撤销单元。
   * @param order 排序映射:新第 i 行 = 旧第 order[i] 行(重做时再次应用)
   * @param restore order 的逆映射(撤销时应用,还原到排序前顺序)
   */
  sortRows(order: number[], restore: number[]): void {
    if (order.length !== this.cells.length || restore.length !== this.cells.length) return;
    this.reorderRows(order);
    this.pushOp({ type: 'sortRows', from: restore, to: order });
  }

  /**
   * 按当前行数生成原始行号序列 [0..rowCount),配合 reorderRows/sortRows 计算映射。
   */
  rowIndexes(): number[] {
    return Array.from({ length: this.cells.length }, (_, i) => i);
  }

  /** 撤销一次操作;返回是否发生撤销。 */
  undo(): boolean {
    const op = this.undoStack.pop();
    if (!op) return false;
    this.invertOp(op);
    this.redoStack.push(op);
    return true;
  }

  /** 重做一次操作;返回是否发生重做。 */
  redo(): boolean {
    const op = this.redoStack.pop();
    if (!op) return false;
    this.applyOp(op);
    this.undoStack.push(op);
    return true;
  }

  /** 清空撤销/重做栈(setCsv 等整体替换时调用)。 */
  clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /** 记录操作(清空重做栈;限深)。 */
  private pushOp(op: MtableOp): void {
    this.redoStack = [];
    this.undoStack.push(op);
    if (this.undoStack.length > MtableModel.MAX_UNDO) {
      this.undoStack.shift();
    }
  }

  /** 正向执行操作(重做路径)。 */
  private applyOp(op: MtableOp): void {
    switch (op.type) {
      case 'cells':
        for (const { row, col, after } of op.changes) {
          this.ensureCell(row, col);
          this.cells[row]![col] = after;
        }
        break;
      case 'sortRows':
        this.reorderRows(op.to);
        break;
      case 'insertRows':
        this.insertRowsSilent(op.at, op.count);
        break;
      case 'deleteRows':
        this.cells.splice(op.at, op.removed.length);
        this.rowHeights.splice(op.at, op.removed.length);
        break;
      case 'insertCols': {
        for (const row of this.cells) {
          row.splice(op.at, 0, ...Array.from({ length: op.count }, () => ''));
        }
        this.columnWidths.splice(op.at, 0, ...Array.from({ length: op.count }, () => this.config.defaultColumnWidth));
        break;
      }
      case 'deleteCols':
        for (const row of this.cells) {
          row.splice(op.at, op.removed.length);
        }
        this.columnWidths.splice(op.at, op.removed.length);
        break;
    }
  }

  /** 逆向执行操作(撤销路径)。 */
  private invertOp(op: MtableOp): void {
    switch (op.type) {
      case 'cells':
        for (const { row, col, before } of op.changes) {
          this.ensureCell(row, col);
          this.cells[row]![col] = before;
        }
        break;
      case 'sortRows':
        this.reorderRows(op.from);
        break;
      case 'insertRows':
        this.cells.splice(op.at, op.count);
        this.rowHeights.splice(op.at, op.count);
        break;
      case 'deleteRows':
        this.cells.splice(op.at, 0, ...op.removed.map((row) => [...row]));
        this.rowHeights.splice(
          op.at,
          0,
          ...Array.from({ length: op.removed.length }, () => this.config.defaultRowHeight)
        );
        break;
      case 'insertCols':
        for (const row of this.cells) {
          row.splice(op.at, op.count);
        }
        this.columnWidths.splice(op.at, op.count);
        break;
      case 'deleteCols':
        for (let r = 0; r < this.cells.length; r += 1) {
          this.cells[r]?.splice(op.at, 0, ...(op.removed[r] ?? []));
        }
        this.columnWidths.splice(op.at, 0, ...Array.from({ length: op.removed.length }, () => this.config.defaultColumnWidth));
        break;
    }
  }

  /** 无记录插行(applyOp 内部用,避免递归记栈)。 */
  private insertRowsSilent(at: number, count: number): void {
    const width = Math.max(this.columnCount, this.config.minColumnCount);
    const fresh = Array.from({ length: count }, () => new Array<string>(width).fill(''));
    this.cells.splice(at, 0, ...fresh);
    this.rowHeights.splice(at, 0, ...Array.from({ length: count }, () => this.config.defaultRowHeight));
  }

  /** 确保坐标处格子存在(undo/redo 恢复时可能落在扩容区)。 */
  private ensureCell(row: number, col: number): void {
    while (this.cells.length <= row) {
      this.cells.push(new Array<string>(Math.max(this.columnCount, 1)).fill(''));
    }
    const grow = this.cells[row];
    if (grow && grow.length <= col) {
      while (grow.length <= col) {
        grow.push('');
      }
    }
  }

  /** 把 [at, at+count) 夹到 [0, total] 界内。 */
  private clampSpan(at: number, count: number, total: number): { at: number; count: number } {
    const clampedAt = Math.min(Math.max(at, 0), total);
    const clampedCount = Math.min(count, total - clampedAt);
    return { at: clampedAt, count: Math.max(clampedCount, 0) };
  }
}
