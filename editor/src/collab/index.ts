/**
 * collab/index.ts — P4 协作能力门面(版本历史 / 评论锚定 / 实时协同)
 *
 * createMeditorCollab(meditor, runtime, options) 一次性装配:
 * - history:版本历史引擎(MD 快照走宿主 store,编辑器无感知);
 * - comments:评论引擎(块 id 锚定 + 引用文本重定位)+ 锚定插件注册;
 * - realtime:可选启用(yjs/y-prosemirror 绑定,provider 由宿主注入)。
 * 协作元数据(评论/快照/光标)一律不进 MD(notion-parity-plan §2 红线)。
 *
 * 面板(版本历史/评论列表)为无宿主 UI 的独立导出:宿主自行 create + 挂载,
 * meditor 只提供引擎与数据流;demo/harness 演示见 createVersionHistoryPanel。
 */
import { editorViewCtx } from '@milkdown/core';
import { TextSelection } from '@milkdown/prose/state';
import type { MilkdownEditorRuntime } from '../core/createEditor';
import { readSliceWhen } from '../core/ctx-access';
import type { MeditorApi } from '../meditor';
import {
  commentAnchorProsePlugin,
  commentAnchorKey,
  resolveBlockPos,
  type MeditCommentAnchorState,
} from './comment-anchor';
import {
  createMeditorCommentEngine,
  MemoryCommentStore,
  type CommentEngineMeditor,
  type MeditorCommentEngine,
  type MeditorCommentStore,
} from './comment-store';
import {
  createMeditorVersionHistory,
  type MeditorVersionHistory,
  type VersionHistoryOptions,
} from './version-history';
import {
  createMeditorRealtime,
  type MeditorCollabOptions,
  type MeditorRealtimeHandle,
} from './realtime';
import { MemoryHistoryStore, type MeditorHistoryStore } from './history-store';

/** 评论跳转目标块短暂高亮类名(样式见 collab.css)。 */
const JUMP_HIGHLIGHT_CLASS = 'zt-md-comment-jump-highlight';

/**
 * 协作装配参数。
 */
export interface MeditorCollabSetupOptions {
  /** 文档标识(评论/快照存储隔离键;缺省 'default')。 */
  documentId?: string;
  /** 版本历史存储(缺省内存)。 */
  historyStore?: MeditorHistoryStore;
  /** 版本历史引擎参数(autoSnapshotIntervalMs 等)。 */
  history?: Omit<VersionHistoryOptions, 'documentId'>;
  /** 评论存储(缺省内存)。 */
  commentStore?: MeditorCommentStore;
  /** 评论作者。 */
  author?: string;
  /** 语言。 */
  locale?: 'zh-CN' | 'en-US';
}

/**
 * 选区锚点(评论创建输入)。
 */
export interface MeditorSelectionAnchor {
  /** 顶层块 id(comment-anchor 分配)。 */
  blockId: string;
  /** 块内纯文本。 */
  blockText: string;
  /** 引用起点(块内相对偏移)。 */
  from: number;
  /** 引用终点(块内相对偏移)。 */
  to: number;
}

/**
 * 协作门面 API。
 */
export interface MeditorCollabApi {
  /** 版本历史引擎。 */
  readonly history: MeditorVersionHistory;
  /** 评论引擎。 */
  readonly comments: MeditorCommentEngine;
  /** 当前实时协同句柄(未启用 null)。 */
  readonly realtime: MeditorRealtimeHandle | null;
  /** 启用实时协同(幂等;已启用直接返回既有句柄)。 */
  enableRealtime: (options: MeditorCollabOptions) => Promise<MeditorRealtimeHandle>;
  /** 当前选区锚点(评论创建输入;空选区/视图未就绪 null)。 */
  getSelectionAnchor: () => MeditorSelectionAnchor | null;
  /** 当前块文本映射(块 id → 纯文本;视图未就绪 null)。 */
  getBlockTexts: () => Map<string, string> | null;
  /**
   * 评论卡片跳转锚点:按块 id 解析当前 pos → 光标定位 + 滚动 + 目标块短暂高亮。
   * 返回 false 表示锚点失效(块已删/视图未就绪)。可直接传给
   * createCommentsPanel 的 jumpToBlock 注入点。
   */
  jumpToCommentAnchor: (blockId: string) => boolean;
  /** 销毁门面(引擎定时器/实时协同;不清宿主存储)。 */
  destroy: () => void;
}

/**
 * 装配协作门面。
 */
export const createMeditorCollab = (
  meditor: Pick<MeditorApi, 'getMarkdown' | 'setMarkdown'>,
  runtime: MilkdownEditorRuntime,
  options: MeditorCollabSetupOptions = {},
): MeditorCollabApi => {
  const {
    documentId = 'default',
    historyStore = new MemoryHistoryStore(),
    history: historyOptions,
    commentStore = new MemoryCommentStore(),
    author,
    locale = 'zh-CN',
  } = options;

  // --- 版本历史 ---
  const history = createMeditorVersionHistory(meditor, historyStore, {
    documentId,
    ...historyOptions,
    locale,
  });

  // --- 评论锚定插件(编辑器内维护块 id 映射) ---
  try {
    runtime.editor.use(commentAnchorProsePlugin as never);
  } catch (error) {
    console.error('[meditor collab] comment anchor plugin registration failed', error);
  }

  /**
   * 取当前编辑器视图(未就绪 null;类型化 ctx 读取 + 占位值运行时校验)。
   */
  const getView = () => {
    const view = readSliceWhen(
      runtime.editor,
      editorViewCtx,
      (candidate) => candidate.state != null,
    );
    return view;
  };

  /**
   * 当前锚定状态。
   */
  const getAnchorState = (): MeditCommentAnchorState | null => {
    const view = getView();
    if (!view) {
      return null;
    }
    return commentAnchorKey.getState(view.state) ?? null;
  };

  /**
   * 评论引擎的 meditor 适配(选区锚点 + 块文本实时读取)。
   */
  const commentMeditor: CommentEngineMeditor & {
    getBlockAnchors: () => Map<string, { text: string }> | null;
  } = {
    getMarkdown: () => meditor.getMarkdown(),
    getSelectionAnchor: () => {
      const view = getView();
      const state = getAnchorState();
      if (!view || !state) {
        return null;
      }
      const { from, to } = view.state.selection;
      if (from === to) {
        return null;
      }
      // 选区所在顶层块。
      let blockPos: number;
      try {
        const $pos = view.state.doc.resolve(from);
        blockPos = $pos.depth >= 1 ? $pos.before(1) : $pos.pos;
      } catch {
        return null;
      }
      const mapped = state.blockIds.get(blockPos);
      if (!mapped) {
        return null;
      }
      const blockId = mapped;
      const blockNode = view.state.doc.nodeAt(blockPos);
      if (!blockNode) {
        return null;
      }
      const blockText = blockNode.textContent;
      // 相对偏移(块起点 = before(1);块内文本起点对 textblock 为 pos+1,
      // 简化处理:clamp 到 [0, blockText.length])。
      const clamp = (value: number): number => Math.max(0, Math.min(blockText.length, value));
      const relFrom = clamp(from - blockPos - 1);
      const relTo = clamp(to - blockPos - 1);
      return { blockId, blockText, from: Math.min(relFrom, relTo), to: Math.max(relFrom, relTo) };
    },
    getBlockAnchors: () => {
      const state = getAnchorState();
      if (!state) {
        return null;
      }
      const map = new Map<string, { text: string }>();
      state.idToPos.forEach((pos, id) => {
        const node = state.doc.nodeAt(pos);
        if (node) {
          map.set(id, { text: node.textContent });
        }
      });
      return map;
    },
  };

  const comments = createMeditorCommentEngine(commentMeditor, commentStore, {
    documentId,
    ...(author ? { author } : {}),
    locale,
  });

  /**
   * 评论卡片跳转锚点(块 id → pos → 选区 + 滚动 + 短暂高亮)。
   */
  const jumpToCommentAnchor = (blockId: string): boolean => {
    const view = getView();
    if (!view || view.isDestroyed) {
      return false;
    }
    const pos = resolveBlockPos(view, blockId);
    if (pos === null) {
      return false;
    }
    try {
      // 块 before pos 的下一个文本位(near 对空块/嵌套结构均安全)。
      const selection = TextSelection.near(
        view.state.doc.resolve(Math.min(pos + 1, view.state.doc.content.size)),
        1,
      );
      view.dispatch(view.state.tr.setSelection(selection).scrollIntoView());
    } catch {
      return false;
    }
    // 目标块短暂高亮(1s 后移除)。
    try {
      const domInfo = view.domAtPos(pos);
      const container = domInfo.node;
      // 顶层块:container 为编辑器根 DOM,offset 即块元素索引。
      const target =
        container instanceof HTMLElement &&
        container.childNodes[domInfo.offset] instanceof HTMLElement
          ? (container.childNodes[domInfo.offset] as HTMLElement)
          : container instanceof HTMLElement
            ? container
            : null;
      if (target) {
        target.classList.add(JUMP_HIGHLIGHT_CLASS);
        window.setTimeout(() => {
          target.classList.remove(JUMP_HIGHLIGHT_CLASS);
        }, 1000);
      }
    } catch {
      // 定位失败不影响跳转本身。
    }
    return true;
  };

  // --- 实时协同 ---
  let realtime: MeditorRealtimeHandle | null = null;

  return {
    history,
    comments,
    enableRealtime: (realtimeOptions) => {
      if (realtime) {
        return Promise.resolve(realtime);
      }
      return createMeditorRealtime(runtime.editor, realtimeOptions).then((handle) => {
        realtime = handle;
        return handle;
      });
    },
    get realtime(): MeditorRealtimeHandle | null {
      return realtime;
    },
    getSelectionAnchor: () => commentMeditor.getSelectionAnchor(),
    getBlockTexts: () => {
      const anchors = commentMeditor.getBlockAnchors();
      if (!anchors) {
        return null;
      }
      const texts = new Map<string, string>();
      anchors.forEach((value, key) => texts.set(key, value.text));
      return texts;
    },
    jumpToCommentAnchor,
    destroy: () => {
      history.destroy();
      realtime?.destroy();
      realtime = null;
    },
  };
};

// re-export 供宿主直接消费。
export {
  MemoryHistoryStore,
  type MeditorHistoryStore,
  type MeditorVersionSnapshot,
} from './history-store';
export { createVersionHistoryPanel, type VersionHistoryPanelApi } from './version-history';
export { MemoryCommentStore, type MeditorComment, type MeditorCommentStore } from './comment-store';
export { createCommentsPanel, type CommentsPanelApi, type CommentsPanelOptions } from './comments';
export { getCommentAnchorState } from './comment-anchor';
export { createCollabStatusBadge, type CollabStatusBadgeApi } from './status-badge';
export type { MeditorCollabOptions, MeditorRealtimeHandle, MeditorCollabStatus } from './realtime';
