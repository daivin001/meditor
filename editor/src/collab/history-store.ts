/**
 * collab/history-store.ts — 版本历史存储适配器(P4)
 *
 * 定位(notion-parity-plan §3.1/§3.3):MD 快照存宿主/ppserver,编辑器无感知;
 * 协作元数据绝不进 MD。默认 MemoryHistoryStore(会话内存)供测试/无后端场景;
 * 宿主注入自定义 store 即可落盘(chrome.storage / ppserver / 远端)。
 */

/** 版本快照(业务数据 = 整篇 MD;不含任何视图状态)。 */
export interface MeditorVersionSnapshot {
  /** 稳定 id(时间戳派生)。 */
  id: string;
  /** 创建时间(ISO 8601)。 */
  createdAt: string;
  /** 快照来源:auto(节流自动快照)/ manual(用户手动)/ restore(恢复前自动留存)。 */
  origin: 'auto' | 'manual' | 'restore';
  /** 整篇 markdown。 */
  markdown: string;
  /** 可选标题(手动快照时用户可命名)。 */
  label?: string;
}

/**
 * 版本历史存储适配器(宿主可实现并注入;全部方法允许同步返回值或 Promise)。
 */
export interface MeditorHistoryStore {
  /** 追加快照。 */
  append: (documentId: string, snapshot: MeditorVersionSnapshot) => void | Promise<void>;
  /** 列出快照(新 → 旧)。 */
  list: (documentId: string) => MeditorVersionSnapshot[] | Promise<MeditorVersionSnapshot[]>;
  /** 读取单条快照(不存在返回 null)。 */
  get: (documentId: string, snapshotId: string) => MeditorVersionSnapshot | null | Promise<MeditorVersionSnapshot | null>;
  /** 删除单条快照。 */
  remove: (documentId: string, snapshotId: string) => void | Promise<void>;
  /** 清空该文档全部快照。 */
  clear: (documentId: string) => void | Promise<void>;
}

/** 内存 store 每文档快照上限(超出丢最旧)。 */
const MEMORY_STORE_LIMIT = 50;

/**
 * 默认内存实现(会话级,刷新归零;宿主接后端前的兜底)。
 */
export class MemoryHistoryStore implements MeditorHistoryStore {
  /** 文档 → 快照列表(追加序;list 时倒序输出)。 */
  private readonly buckets = new Map<string, MeditorVersionSnapshot[]>();

  /**
   * 追加快照。
   */
  append(documentId: string, snapshot: MeditorVersionSnapshot): void {
    const bucket = this.buckets.get(documentId) ?? [];
    bucket.push(snapshot);
    if (bucket.length > MEMORY_STORE_LIMIT) {
      bucket.splice(0, bucket.length - MEMORY_STORE_LIMIT);
    }
    this.buckets.set(documentId, bucket);
  }

  /**
   * 列出快照(新 → 旧)。
   */
  list(documentId: string): MeditorVersionSnapshot[] {
    return [...(this.buckets.get(documentId) ?? [])].reverse();
  }

  /**
   * 读取单条快照。
   */
  get(documentId: string, snapshotId: string): MeditorVersionSnapshot | null {
    return this.buckets.get(documentId)?.find((snapshot) => snapshot.id === snapshotId) ?? null;
  }

  /**
   * 删除单条快照。
   */
  remove(documentId: string, snapshotId: string): void {
    const bucket = this.buckets.get(documentId);
    if (!bucket) {
      return;
    }
    const next = bucket.filter((snapshot) => snapshot.id !== snapshotId);
    if (next.length === bucket.length) {
      return;
    }
    if (next.length === 0) {
      this.buckets.delete(documentId);
    } else {
      this.buckets.set(documentId, next);
    }
  }

  /**
   * 清空该文档全部快照。
   */
  clear(documentId: string): void {
    this.buckets.delete(documentId);
  }
}

/**
 * 生成快照 id(时间戳 + 随机后缀)。
 */
export const createSnapshotId = (): string =>
  `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * 归一化任意 store 返回值(兼容同步/Promise)。
 */
export const resolveMaybePromise = <T>(value: T | Promise<T>, onResolve: (value: T) => void): void => {
  if (value instanceof Promise) {
    void value.then(onResolve);
    return;
  }
  onResolve(value);
};
