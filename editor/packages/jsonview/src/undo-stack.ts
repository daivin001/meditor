/**
 * undo-stack.ts — 数据库内部撤销栈(整批粒度)
 *
 * 设计(notion-parity-plan §4.4 M1 遗留项):
 * - 一切用户连续编辑(单元格输入/拖拽换组/TSV 粘贴整批/字段增删)折叠为一个历史步,
 *   以「静默 600ms 或操作种类切换」为分批边界,与逐键触发的 ProseMirror attr 历史
 *   (每个 attr 变更一步)互为补充;
 * - 栈容量 100 步,超出丢最旧;
 * - 只在内存中存文档 JSON 快照(业务数据本身,不含视图状态),上限 200KB/步,
 *   超大文档按 20% 容量截断防内存失控;
 * - 回放走 source 'undo'/'redo' 输出,宿主可据此不再入自身历史。
 */

/** 默认分批静默窗口(ms)。 */
const BATCH_IDLE_MS = 600;
/** 最大历史步数。 */
const MAX_ENTRIES = 100;
/** 单步快照字节上限(JSON 长度);超过按容量比例截断。 */
const MAX_ENTRY_BYTES = 200 * 1024;
/** 快照超限时保留的最大步数。 */
const SHRUNK_ENTRIES = 20;

/**
 * 内部撤销栈。
 */
export class JsonviewUndoStack {
  /** 撤销栈(旧 → 新)。 */
  private undoList: string[] = [];
  /** 重做栈(新 → 旧)。 */
  private redoList: string[] = [];
  /** 当前文档 canonical JSON(分批时作为下一步的 before 快照)。 */
  private currentJson: string;
  /** 当前分批是否已开启(开启后首个编辑落栈)。 */
  private batchOpen = false;
  /** 分批定时器句柄。 */
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  /** 上一编辑的种类签名(种类切换强制分批:单元格编辑/结构操作不合并)。 */
  private lastEditKind: string | null = null;
  /** 程序性回放中(undo/redo/setDoc),期间接收的 edit 不入栈。 */
  private replaying = false;

  /**
   * 初始化(初始文档为栈底基准)。
   */
  constructor(initialJson: string) {
    this.currentJson = initialJson;
  }

  /**
   * 记录一次用户编辑(kind:操作种类签名,如 'cell'/'field'/'record'/'tsv'/'drag')。
   * beforeJson 为编辑前的 canonical JSON;afterJson 为编辑后的 canonical JSON。
   */
  push(kind: string, beforeJson: string, afterJson: string): void {
    this.currentJson = afterJson;
    if (this.replaying) {
      return;
    }
    // 种类切换:先封上一批。
    if (this.batchOpen && this.lastEditKind !== kind) {
      this.closeBatch();
    }
    if (!this.batchOpen) {
      // 新批次:before 入撤销栈,清空重做栈(新分支)。
      this.undoList.push(beforeJson);
      if (this.undoList.length > MAX_ENTRIES) {
        this.undoList.splice(0, this.undoList.length - MAX_ENTRIES);
      }
      this.redoList = [];
      this.batchOpen = true;
    }
    this.lastEditKind = kind;
    this.shrinkIfNeeded();
    this.scheduleBatchClose();
  }

  /**
   * 静默窗口到期关闭当前批次。
   */
  private scheduleBatchClose(): void {
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
    }
    this.batchTimer = setTimeout(() => {
      this.closeBatch();
    }, BATCH_IDLE_MS);
  }

  /**
   * 立即封批(种类切换/undo/redo/destroy 前)。
   */
  private closeBatch(): void {
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.batchOpen = false;
    this.lastEditKind = null;
  }

  /**
   * 快照超限时的容量收缩(丢最旧,保留最近 20 步)。
   */
  private shrinkIfNeeded(): void {
    if (
      this.undoList.length > 0 &&
      (this.undoList[this.undoList.length - 1]?.length ?? 0) > MAX_ENTRY_BYTES
    ) {
      this.undoList = this.undoList.slice(-SHRUNK_ENTRIES);
    }
  }

  /**
   * 撤销:返回回放 JSON(null = 无可撤销);栈顶即当前态之前的状态。
   */
  undo(): string | null {
    this.closeBatch();
    const before = this.undoList.pop();
    if (before === undefined) {
      return null;
    }
    this.redoList.push(this.currentJson);
    this.replaying = true;
    this.currentJson = before;
    return before;
  }

  /**
   * 重做:返回回放 JSON(null = 无可重做)。
   */
  redo(): string | null {
    this.closeBatch();
    const after = this.redoList.pop();
    if (after === undefined) {
      return null;
    }
    this.undoList.push(this.currentJson);
    this.replaying = true;
    this.currentJson = after;
    return after;
  }

  /**
   * 回放结束标记(setDoc/undo/redo 的 onChange 事件处理后调用,恢复入栈)。
   */
  endReplay(): void {
    this.replaying = false;
  }

  /**
   * 外部整体替换文档(受控回填):重置整栈。
   */
  reset(json: string): void {
    this.closeBatch();
    this.undoList = [];
    this.redoList = [];
    this.currentJson = json;
    this.replaying = false;
  }

  /**
   * 是否可撤销。
   */
  canUndo(): boolean {
    return this.undoList.length > 0;
  }

  /**
   * 是否可重做。
   */
  canRedo(): boolean {
    return this.redoList.length > 0;
  }

  /**
   * 当前文档 JSON(栈视角,与视图同步)。
   */
  getCurrent(): string {
    return this.currentJson;
  }

  /**
   * 同步当前文档(视图侧文档被直接替换时,如 TSV 整批提交)。
   */
  setCurrent(json: string): void {
    this.currentJson = json;
  }

  /**
   * 销毁(清定时器)。
   */
  destroy(): void {
    this.closeBatch();
    this.undoList = [];
    this.redoList = [];
  }
}
