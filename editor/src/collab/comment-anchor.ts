/**
 * collab/comment-anchor.ts — 评论锚定插件(P4,工程量最大单项)
 *
 * 锚定方案(notion-parity-plan §3.3):块 ID 映射——每顶层块稳定 id 存
 * ProseMirror 插件状态(doc 键控缓存,懒分配),评论记录块 id + 块内文本快照 +
 * 相对偏移;块内容编辑后按「引用文本前缀匹配」尽力重定位(漂移保护),找不到
 * 则标记 stale(评论保留,不丢内容)。
 * 评论内容绝不进 MD:评论走宿主侧信道(MeditorCommentStore),文档零污染。
 */
import type { EditorView } from '@milkdown/prose/view';
import { Plugin, PluginKey } from '@milkdown/prose/state';
import type { Node as ProseNode } from '@milkdown/prose/model';
import { $prose } from '@milkdown/utils';

/**
 * 插件 key(视图实例上取块 id 映射用)。
 */
export const commentAnchorKey = new PluginKey<MeditCommentAnchorState>('zt-md-comment-anchor');

/**
 * 块 id 映射状态(doc 引用键控)。
 */
export interface MeditCommentAnchorState {
  /** doc 引用(失效判定)。 */
  doc: ProseNode;
  /** 顶层块 pos → 稳定 id。 */
  blockIds: Map<number, string>;
  /** 稳定 id → 顶层块 pos。 */
  idToPos: Map<string, number>;
  /** id 计数器(会话内单调)。 */
  counter: number;
}

/** 顶层块 id 前缀。 */
const BLOCK_ID_PREFIX = 'ppb';

/**
 * 从 doc 派生块 id 映射(懒分配:新块追加新 id;已有块按内容 hash 稳定复用)。
 * 内容 hash 方案:对每个顶层块文本内容 + 出现序号做 hash——按遍历顺序为相同
 * textContent 的块分配 occurrence index(hash = textContent + '\u0000' + index),
 * 保证同文块各自得到稳定唯一 id,idToPos 不会被后写覆盖;编辑中途撤销/重做
 * 不会让 id 漂移;真删除后 id 不再出现(评论自然 stale)。
 */
const deriveBlockIds = (doc: ProseNode, previous: MeditCommentAnchorState | null): MeditCommentAnchorState => {
  const blockIds = new Map<number, string>();
  const idToPos = new Map<string, number>();
  let counter = previous?.counter ?? 0;
  // 内容 hash → id(跨重建稳定)。
  const hashToId = new Map<string, string>();
  if (previous && previous.doc === doc) {
    return previous;
  }
  // 上一状态的内容 hash → id 迁移(出现序号按上一状态 idToPos 的文档顺序递增)。
  if (previous) {
    const migratedOccurrence = new Map<string, number>();
    previous.idToPos.forEach((pos, id) => {
      const node = previous.doc.nodeAt(pos);
      if (node) {
        // idToPos 按文档顺序插入,遍历序即上一状态块序。
        const index = migratedOccurrence.get(node.textContent) ?? 0;
        migratedOccurrence.set(node.textContent, index + 1);
        hashToId.set(`${node.textContent}\u0000${index}`, id);
      }
    });
  }

  // 同文块出现序号(按遍历顺序递增)。
  const occurrence = new Map<string, number>();
  doc.forEach((child, offset) => {
    const text = child.textContent;
    const index = occurrence.get(text) ?? 0;
    occurrence.set(text, index + 1);
    // hash = 文本 + 出现序号:同文块各自拿到稳定唯一 id。
    const hash = `${text}\u0000${index}`;
    let id = hashToId.get(hash);
    if (!id) {
      counter += 1;
      id = `${BLOCK_ID_PREFIX}${counter.toString(36)}`;
    }
    blockIds.set(offset, id);
    idToPos.set(id, offset);
  });

  return { doc, blockIds, idToPos, counter };
};

/**
 * 评论锚定 ProseMirror 插件(无 decorations;仅维护块 id 映射状态)。
 */
export const createCommentAnchorPlugin = (): Plugin<MeditCommentAnchorState> =>
  new Plugin<MeditCommentAnchorState>({
    key: commentAnchorKey,
    state: {
      init: (_, state) => deriveBlockIds(state.doc, null),
      apply: (tr, value) => {
        if (!tr.docChanged) {
          return value;
        }
        return deriveBlockIds(tr.doc, value);
      }
    }
  });

/**
 * milkdown $prose 包装(bootstrap/runtime 阶段经编辑器插件体系注册)。
 */
export const commentAnchorProsePlugin = $prose(() => createCommentAnchorPlugin());

/**
 * 取视图当前块 id 映射(编辑器未就绪返回 null)。
 */
export const getCommentAnchorState = (view: EditorView): MeditCommentAnchorState | null => {
  const state = commentAnchorKey.getState(view.state);
  return state ?? null;
};

/**
 * 顶层块 id → 当前 pos(块已删返回 null)。
 */
export const resolveBlockPos = (view: EditorView, blockId: string): number | null => {
  const state = getCommentAnchorState(view);
  const pos = state?.idToPos.get(blockId);
  return pos === undefined ? null : pos;
};

/**
 * 块 pos → 顶层块 id(异常返回 null)。
 */
export const blockIdAtPos = (view: EditorView, pos: number): string | null => {
  const state = getCommentAnchorState(view);
  return state?.blockIds.get(pos) ?? null;
};
