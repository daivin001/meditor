/**
 * collab/comment-store.ts — 评论存储适配器 + 引擎(P4)
 *
 * 定位(notion-parity-plan §2/§3.3):评论内容绝不进 MD,全部走宿主侧信道
 * (MeditorCommentStore);默认 MemoryCommentStore 兜底。
 * 锚定数据模型:块 id(编辑器分配)+ 块内文本快照 + 选区相对偏移;
 * 重定位按「块存在 + 引用文本前缀匹配」尽力而为,失败标 stale。
 */

/**
 * 评论条目。
 */
export interface MeditorComment {
  /** 稳定 id。 */
  id: string;
  /** 锚定:顶层块 id(comment-anchor 插件分配)。 */
  blockId: string;
  /** 锚定:块内引用文本(重定位用;空串 = 整块)。 */
  quotedText: string;
  /** 锚定:引用文本在块内文本的相对起点(参考值)。 */
  relFrom: number;
  /** 锚定:引用文本在块内文本的相对终点(参考值)。 */
  relTo: number;
  /** 作者(可空)。 */
  author?: string;
  /** 正文。 */
  body: string;
  /** 创建时间(ISO)。 */
  createdAt: string;
  /** 已解决标记。 */
  resolved: boolean;
}

/**
 * 评论存储适配器(宿主实现并注入;同步/Promise 均可)。
 */
export interface MeditorCommentStore {
  /** 列出某文档全部评论(顺序不保证;引擎会排序)。 */
  list: (documentId: string) => MeditorComment[] | Promise<MeditorComment[]>;
  /** 追加评论(引擎生成完整条目)。 */
  append: (documentId: string, comment: MeditorComment) => void | Promise<void>;
  /** 更新评论(整体替换;含 resolved 标记)。 */
  update: (documentId: string, comment: MeditorComment) => void | Promise<void>;
  /** 删除评论。 */
  remove: (documentId: string, commentId: string) => void | Promise<void>;
}

/**
 * 内存评论 store(会话级兜底)。
 */
export class MemoryCommentStore implements MeditorCommentStore {
  /** 文档 → 评论列表。 */
  private readonly buckets = new Map<string, MeditorComment[]>();

  /**
   * 列出评论。
   */
  list(documentId: string): MeditorComment[] {
    return [...(this.buckets.get(documentId) ?? [])];
  }

  /**
   * 追加评论。
   */
  append(documentId: string, comment: MeditorComment): void {
    const bucket = this.buckets.get(documentId) ?? [];
    bucket.push(comment);
    this.buckets.set(documentId, bucket);
  }

  /**
   * 更新评论。
   */
  update(documentId: string, comment: MeditorComment): void {
    const bucket = this.buckets.get(documentId);
    if (!bucket) {
      return;
    }
    this.buckets.set(documentId, bucket.map((item) => (item.id === comment.id ? comment : item)));
  }

  /**
   * 删除评论。
   */
  remove(documentId: string, commentId: string): void {
    const bucket = this.buckets.get(documentId);
    if (!bucket) {
      return;
    }
    this.buckets.set(documentId, bucket.filter((item) => item.id !== commentId));
  }
}

/**
 * 评论引擎参数。
 */
export interface CommentEngineOptions {
  /** 文档标识(存储隔离键)。 */
  documentId: string;
  /** 当前作者(可空)。 */
  author?: string;
  /** 语言。 */
  locale?: 'zh-CN' | 'en-US';
}

/**
 * 生成评论 id。
 */
const createCommentId = (): string => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * 块内引用文本重定位:在块文本里找 quotedText(前缀逐步放宽 → 单词首串 → 失效)。
 * 返回重定位后的 [relFrom, relTo](找不到返回 null)。
 */
export const relocateQuotedRange = (
  blockText: string,
  quotedText: string,
  relFrom: number,
  relTo: number
): { from: number; to: number; drifted: boolean } | null => {
  // 引用为空 = 整块(块还在即锚定成立;先于 indexOf,避免空串提前命中)。
  if (quotedText === '') {
    return { from: 0, to: blockText.length, drifted: false };
  }
  // 完整命中(端点漂移即标记)。
  let index = blockText.indexOf(quotedText);
  if (index >= 0) {
    return { from: index, to: index + quotedText.length, drifted: index !== relFrom || index + quotedText.length !== relTo };
  }
  // 前缀逐步放宽(每次砍尾 20%,保底 4 字符)。
  let prefix = quotedText;
  while (prefix.length > 4) {
    prefix = prefix.slice(0, Math.max(4, Math.floor(prefix.length * 0.8)));
    index = blockText.indexOf(prefix);
    if (index >= 0) {
      return { from: index, to: index + quotedText.length, drifted: true };
    }
  }
  // 找不到:锚定失效(评论保留、标 stale)。
  return null;
};

/**
 * 重定位结果。
 */
export interface ResolvedCommentAnchor {
  /** 评论条目。 */
  comment: MeditorComment;
  /** 锚定状态:ok(可高亮)/ stale(块或文本已找不到)。 */
  status: 'ok' | 'stale';
  /** 块内相对区间(status ok 时)。 */
  range?: { from: number; to: number };
  /** 是否发生了漂移重定位。 */
  drifted?: boolean;
}

/**
 * 评论引擎 API。
 */
export interface MeditorCommentEngine {
  /** 从当前编辑器选区创建评论(空选区返回 null)。 */
  createFromSelection: (body: string) => Promise<MeditorComment | null>;
  /** 列出评论并按当前文档重定位(块 id 失效 → stale)。 */
  listResolved: () => Promise<ResolvedCommentAnchor[]>;
  /** 标记已解决/未解决。 */
  setResolved: (commentId: string, resolved: boolean) => Promise<void>;
  /** 删除评论。 */
  remove: (commentId: string) => Promise<void>;
}

/** 引擎依赖的 meditor 最小面(测试可注桩)。 */
export interface CommentEngineMeditor {
  /** 当前 markdown(块文本重定位基准)。 */
  getMarkdown: () => string | null;
  /** 当前选区(块 id + 块内文本 + 相对区间);空选区/未就绪返回 null。 */
  getSelectionAnchor: () => { blockId: string; blockText: string; from: number; to: number } | null;
}

/**
 * 创建评论引擎。
 */
export const createMeditorCommentEngine = (
  meditor: CommentEngineMeditor,
  store: MeditorCommentStore,
  options: CommentEngineOptions
): MeditorCommentEngine => {
  const { documentId, author } = options;

  /**
   * 按创建时间排序读取全部评论。
   */
  const listSorted = (): Promise<MeditorComment[]> =>
    Promise.resolve(store.list(documentId)).then((list) =>
      [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    );

  return {
    createFromSelection: (body) => {
      const trimmed = body.trim();
      if (trimmed === '') {
        return Promise.resolve(null);
      }
      const anchor = meditor.getSelectionAnchor();
      if (!anchor) {
        return Promise.resolve(null);
      }
      const comment: MeditorComment = {
        id: createCommentId(),
        blockId: anchor.blockId,
        quotedText: anchor.blockText.slice(anchor.from, anchor.to),
        relFrom: anchor.from,
        relTo: anchor.to,
        ...(author ? { author } : {}),
        body: trimmed,
        createdAt: new Date().toISOString(),
        resolved: false
      };
      return Promise.resolve(store.append(documentId, comment)).then(() => comment);
    },
    listResolved: () =>
      listSorted().then(async (comments) => {
        const markdown = meditor.getMarkdown();
        const anchors = (meditor as CommentEngineMeditor & { getBlockAnchors?: () => Map<string, { text: string } | null> }).getBlockAnchors?.() ?? null;
        const results: ResolvedCommentAnchor[] = [];
        for (const comment of comments) {
          // 块文本:优先编辑器块锚(实时);无编辑器时退化用 markdown(测试)。
          let blockText: string | null = null;
          if (anchors) {
            blockText = anchors.get(comment.blockId)?.text ?? null;
          } else if (markdown !== null) {
            // 粗略兜底:整篇文本上做引用匹配(stale 判定仍有意义)。
            blockText = markdown;
          }
          if (blockText === null) {
            results.push({ comment, status: 'stale' });
            continue;
          }
          const range = relocateQuotedRange(blockText, comment.quotedText, comment.relFrom, comment.relTo);
          if (!range) {
            results.push({ comment, status: 'stale' });
            continue;
          }
          results.push({ comment, status: 'ok', range: { from: range.from, to: range.to }, drifted: range.drifted });
        }
        return results;
      }),
    setResolved: (commentId, resolved) =>
      listSorted().then(async (comments) => {
        const target = comments.find((comment) => comment.id === commentId);
        if (!target) {
          return;
        }
        await store.update(documentId, { ...target, resolved });
      }),
    remove: (commentId) => Promise.resolve(store.remove(documentId, commentId)).then(() => undefined)
  };
};
