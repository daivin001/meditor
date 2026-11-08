/**
 * collab/version-history.ts — 版本历史引擎 + 面板(P4)
 *
 * 引擎:createMeditorVersionHistory(meditorApi, store, options)
 * - 自动快照:onChange 节流(默认 45s)+ 内容与上次快照不同才落;
 * - 手动快照:history.snapshot(label?) 即时落盘;
 * - 恢复:restore(id) 前先自动留存当前内容(origin 'restore'),再 setMarkdown;
 * - 编辑器无感知:引擎只消费 MeditorApi.getMarkdown/setMarkdown,不进 schema。
 *
 * 面板:createVersionHistoryPanel(host) 返回轻量 DOM 面板(列表/恢复/删除),
 * 供宿主挂进自己的 UI;也供 harness 演示。样式内联类名 + zt-md 变量。
 */
import type { MeditorApi } from '../meditor';
import type { EditorI18nMessages, EditorLocale } from '../types/editor';
import { resolveEditorMessages } from '../local/i18n';
import {
  createSnapshotId,
  type MeditorHistoryStore,
  type MeditorVersionSnapshot,
} from './history-store';
import './collab.css';

/**
 * 版本历史引擎参数。
 */
export interface VersionHistoryOptions {
  /** 文档标识(同一 store 多文档隔离)。 */
  documentId: string;
  /** 自动快照间隔 ms(默认 45000;0 = 关闭自动快照)。 */
  autoSnapshotIntervalMs?: number;
  /** 语言。 */
  locale?: 'zh-CN' | 'en-US';
}

/**
 * 版本历史引擎 API。
 */
export interface MeditorVersionHistory {
  /** 立即落一条快照(manual)。 */
  snapshot: (label?: string) => Promise<MeditorVersionSnapshot | null>;
  /** 恢复到指定快照(恢复前自动留存当前内容)。 */
  restore: (snapshotId: string) => Promise<boolean>;
  /** 列出快照(新 → 旧)。 */
  list: () => Promise<MeditorVersionSnapshot[]>;
  /** 删除单条快照。 */
  remove: (snapshotId: string) => Promise<void>;
  /** 销毁引擎(停自动快照;不清存储)。 */
  destroy: () => void;
}

/** 默认自动快照间隔。 */
const DEFAULT_AUTO_INTERVAL_MS = 45_000;

/**
 * 创建版本历史引擎。
 */
export const createMeditorVersionHistory = (
  meditor: Pick<MeditorApi, 'getMarkdown' | 'setMarkdown'>,
  store: MeditorHistoryStore,
  options: VersionHistoryOptions,
): MeditorVersionHistory => {
  const { documentId, autoSnapshotIntervalMs = DEFAULT_AUTO_INTERVAL_MS } = options;

  /** 上次快照的内容(去重:内容未变不落)。 */
  let lastSnapshotted: string | null = null;
  /** 自动快照定时器。 */
  let timer: ReturnType<typeof setInterval> | null = null;

  /**
   * 落一条快照。
   */
  const writeSnapshot = (
    origin: MeditorVersionSnapshot['origin'],
    label?: string,
  ): Promise<MeditorVersionSnapshot | null> => {
    const markdown = meditor.getMarkdown();
    if (markdown === null || markdown === lastSnapshotted) {
      return Promise.resolve(null);
    }
    const snapshot: MeditorVersionSnapshot = {
      id: createSnapshotId(),
      createdAt: new Date().toISOString(),
      origin,
      markdown,
      ...(label ? { label } : {}),
    };
    lastSnapshotted = markdown;
    return Promise.resolve(store.append(documentId, snapshot)).then(() => snapshot);
  };

  // 自动快照(间隔 > 0 时)。
  if (autoSnapshotIntervalMs > 0) {
    // 首帧内容即基线(不立刻落空文档快照)。
    lastSnapshotted = meditor.getMarkdown();
    timer = setInterval(() => {
      // 后台任务无 UI 可挂:失败仅记录,避免未处理 Promise 拒绝。
      void writeSnapshot('auto').catch((error: unknown) => {
        console.error('[meditor collab] auto snapshot failed', error);
      });
    }, autoSnapshotIntervalMs);
  } else {
    lastSnapshotted = meditor.getMarkdown();
  }

  return {
    snapshot: (label) => writeSnapshot('manual', label),
    restore: (snapshotId) =>
      Promise.resolve(store.get(documentId, snapshotId)).then((snapshot) => {
        if (!snapshot) {
          return false;
        }
        // 恢复前自动留存当前内容(可再回到恢复前状态)。
        return Promise.resolve(writeSnapshot('restore')).then(() => {
          meditor.setMarkdown(snapshot.markdown);
          lastSnapshotted = snapshot.markdown;
          return true;
        });
      }),
    list: () => Promise.resolve(store.list(documentId)).then((list) => list),
    remove: (snapshotId) =>
      Promise.resolve(store.remove(documentId, snapshotId)).then(() => undefined),
    destroy: () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
};

/**
 * 面板文案(Pick 自 meditor 统一词典;内嵌双语表已并入 local/zh-CN、local/en-US)。
 */
type VersionHistoryPanelMessages = Pick<
  EditorI18nMessages,
  | 'historyPanelTitle'
  | 'historyPanelEmpty'
  | 'historyPanelRestore'
  | 'historyPanelDelete'
  | 'historyPanelSave'
  | 'historyPanelRestoreConfirm'
  | 'historyPanelDeleteConfirm'
  | 'historyOriginAuto'
  | 'historyOriginManual'
  | 'historyOriginRestore'
  | 'historyOperationFailed'
>;

/**
 * 按语言取版本历史面板文案(纯查表,经 meditor 统一词典)。
 */
const resolvePanelMessages = (locale: EditorLocale): VersionHistoryPanelMessages => {
  const messages = resolveEditorMessages(locale);
  return {
    historyPanelTitle: messages.historyPanelTitle,
    historyPanelEmpty: messages.historyPanelEmpty,
    historyPanelRestore: messages.historyPanelRestore,
    historyPanelDelete: messages.historyPanelDelete,
    historyPanelSave: messages.historyPanelSave,
    historyPanelRestoreConfirm: messages.historyPanelRestoreConfirm,
    historyPanelDeleteConfirm: messages.historyPanelDeleteConfirm,
    historyOriginAuto: messages.historyOriginAuto,
    historyOriginManual: messages.historyOriginManual,
    historyOriginRestore: messages.historyOriginRestore,
    historyOperationFailed: messages.historyOperationFailed,
  };
};

/**
 * 快照来源 → 本地化文案。
 */
const resolveOriginLabel = (
  origin: MeditorVersionSnapshot['origin'],
  messages: VersionHistoryPanelMessages,
): string =>
  origin === 'auto'
    ? messages.historyOriginAuto
    : origin === 'manual'
      ? messages.historyOriginManual
      : messages.historyOriginRestore;

/**
 * 版本历史面板控制器。
 */
export interface VersionHistoryPanelApi {
  /** 刷新列表。 */
  refresh: () => void;
  /** 销毁面板。 */
  destroy: () => void;
}

/**
 * 创建版本历史面板(挂在 host 内;样式走 zt-md 变量)。
 */
export const createVersionHistoryPanel = (
  host: HTMLElement,
  history: MeditorVersionHistory,
  locale: 'zh-CN' | 'en-US' = 'zh-CN',
): VersionHistoryPanelApi => {
  const messages = resolvePanelMessages(locale);
  const wrap = document.createElement('div');
  wrap.className = 'zt-md-history-panel';
  host.appendChild(wrap);

  /** 操作失败错误条定时器(自动消失)。 */
  let errorTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 显示操作失败错误条(面板顶部;下次 refresh 或 4s 后消失)。
   */
  const showOperationError = (): void => {
    // 先清掉旧错误条(重绘后 DOM 会重建,故每次新建插入)。
    wrap.querySelectorAll(':scope > .zt-md-history-error').forEach((el) => el.remove());
    const bar = document.createElement('div');
    bar.className = 'zt-md-history-error';
    bar.textContent = messages.historyOperationFailed;
    wrap.insertBefore(bar, wrap.firstChild);
    if (errorTimer !== null) {
      clearTimeout(errorTimer);
    }
    errorTimer = setTimeout(() => {
      bar.remove();
      errorTimer = null;
    }, 4000);
  };

  /**
   * 重绘列表。
   */
  const refresh = (): void => {
    wrap.textContent = '';
    const head = document.createElement('div');
    head.className = 'zt-md-history-head';
    const title = document.createElement('span');
    title.textContent = messages.historyPanelTitle;
    head.appendChild(title);
    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'zt-md-history-save';
    saveButton.textContent = messages.historyPanelSave;
    saveButton.addEventListener('click', () => {
      void history
        .snapshot()
        .then(() => refresh())
        .catch(showOperationError);
    });
    head.appendChild(saveButton);
    wrap.appendChild(head);

    Promise.resolve(history.list())
      .then((list) => {
        // 列表可能异步返回时面板已销毁。
        if (!wrap.isConnected) {
          return;
        }
        if (list.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'zt-md-history-empty';
          empty.textContent = messages.historyPanelEmpty;
          wrap.appendChild(empty);
          return;
        }
        const listEl = document.createElement('div');
        listEl.className = 'zt-md-history-list';
        for (const snapshot of list) {
          const row = document.createElement('div');
          row.className = 'zt-md-history-row';
          const label = document.createElement('span');
          label.className = 'zt-md-history-label';
          const time = new Date(snapshot.createdAt);
          label.textContent = `${snapshot.label ?? `${time.toLocaleDateString()} ${time.toLocaleTimeString()}`} · ${resolveOriginLabel(snapshot.origin, messages)}`;
          label.title = snapshot.markdown.slice(0, 200);
          row.appendChild(label);
          const restoreButton = document.createElement('button');
          restoreButton.type = 'button';
          restoreButton.className = 'zt-md-history-restore';
          restoreButton.textContent = messages.historyPanelRestore;
          restoreButton.addEventListener('click', () => {
            if (window.confirm(messages.historyPanelRestoreConfirm)) {
              void history
                .restore(snapshot.id)
                .then(() => refresh())
                .catch(showOperationError);
            }
          });
          row.appendChild(restoreButton);
          const removeButton = document.createElement('button');
          removeButton.type = 'button';
          removeButton.className = 'zt-md-history-remove';
          removeButton.textContent = messages.historyPanelDelete;
          removeButton.addEventListener('click', () => {
            if (!window.confirm(messages.historyPanelDeleteConfirm)) {
              return;
            }
            void history
              .remove(snapshot.id)
              .then(() => refresh())
              .catch(showOperationError);
          });
          row.appendChild(removeButton);
          listEl.appendChild(row);
        }
        wrap.appendChild(listEl);
      })
      .catch(showOperationError);
  };

  refresh();

  return {
    refresh,
    destroy: () => {
      if (errorTimer !== null) {
        clearTimeout(errorTimer);
        errorTimer = null;
      }
      wrap.remove();
    },
  };
};
