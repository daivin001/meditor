/**
 * collab/comments.ts — 评论面板(P4)
 *
 * createCommentsPanel(host):评论列表面板(添加/解决/删除/失效态标记),
 * 消费 MeditorCommentEngine;样式内联类名 + zt-md 变量。
 */
import type { EditorLocale } from '../types/editor';
import { resolveEditorMessages } from '../local/i18n';
import type { MeditorCommentEngine } from './comment-store';
import './collab.css';

/**
 * 评论面板可选注入点。
 */
export interface CommentsPanelOptions {
  /**
   * 点击卡片引用区跳转锚点:入参为评论锚定的块 id,返回 true 表示跳转成功。
   * 未注入时引用区不可点击;返回 false 视为锚点失效并提示。
   */
  jumpToBlock?: (blockId: string) => boolean;
}

/**
 * 评论面板控制器。
 */
export interface CommentsPanelApi {
  /** 重绘。 */
  refresh: () => void;
  /** 销毁。 */
  destroy: () => void;
}

/**
 * 创建评论面板。
 */
export const createCommentsPanel = (
  host: HTMLElement,
  engine: MeditorCommentEngine,
  locale: EditorLocale = 'zh-CN',
  options: CommentsPanelOptions = {},
): CommentsPanelApi => {
  // 文案经 meditor 统一词典(内嵌双语表已并入 local/zh-CN、local/en-US)。
  const messages = resolveEditorMessages(locale);
  const wrap = document.createElement('div');
  wrap.className = 'zt-md-comments-panel';
  host.appendChild(wrap);

  /** 输入框。 */
  const input = document.createElement('textarea');
  input.className = 'zt-md-comments-input';
  input.rows = 2;
  input.placeholder = messages.commentsPanelPlaceholder;

  /** 一次性提示节点(输入框下方;显示文案由 showHint 决定)。 */
  const hint = document.createElement('div');
  hint.className = 'zt-md-comments-hint';
  hint.hidden = true;

  /** 提示自动消失定时器。 */
  let hintTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 显示一次性提示(数秒后自动消失;成功创建评论时立即清除)。
   */
  const showHint = (text: string): void => {
    hint.textContent = text;
    hint.hidden = false;
    if (hintTimer !== null) {
      clearTimeout(hintTimer);
    }
    hintTimer = setTimeout(() => {
      hint.hidden = true;
      hintTimer = null;
    }, 4000);
  };

  /**
   * 清除提示(评论创建成功时调用)。
   */
  const hideHint = (): void => {
    hint.hidden = true;
    if (hintTimer !== null) {
      clearTimeout(hintTimer);
      hintTimer = null;
    }
  };

  /**
   * 重绘列表。
   */
  const refresh = (): void => {
    wrap.textContent = '';
    const head = document.createElement('div');
    head.className = 'zt-md-comments-head';
    head.textContent = messages.commentsPanelTitle;
    wrap.appendChild(head);

    // 输入区。
    const composer = document.createElement('div');
    composer.className = 'zt-md-comments-composer';
    composer.appendChild(input);
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'zt-md-comments-add';
    addButton.textContent = messages.commentsPanelAdd;
    addButton.addEventListener('click', () => {
      if (input.value.trim() === '') {
        return;
      }
      void engine.createFromSelection(input.value).then((created) => {
        if (!created) {
          // 无锚点(未选中文字):保留输入框内容,提示先选文字再评论。
          showHint(messages.commentsPanelSelectFirst);
          return;
        }
        // 成功才清空输入并重绘。
        hideHint();
        input.value = '';
        refresh();
      });
    });
    composer.appendChild(addButton);
    wrap.appendChild(composer);
    // 一次性提示挂在输入框下方(隐藏时不占位)。
    wrap.appendChild(hint);

    void engine.listResolved().then((items) => {
      if (!wrap.isConnected) {
        return;
      }
      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'zt-md-comments-empty';
        empty.textContent = messages.commentsPanelEmpty;
        wrap.appendChild(empty);
        return;
      }
      const list = document.createElement('div');
      list.className = 'zt-md-comments-list';
      for (const item of items) {
        const card = document.createElement('div');
        card.className = 'zt-md-comments-card';
        if (item.comment.resolved) {
          card.classList.add('zt-md-comments-card-resolved');
        }
        if (item.status === 'stale') {
          card.classList.add('zt-md-comments-card-stale');
        }

        const quote = document.createElement('div');
        quote.className = 'zt-md-comments-quote';
        quote.textContent = item.comment.quotedText || '…';
        // 注入了 jumpToBlock 时引用区可点击:解析块 id 跳转锚点。
        if (options.jumpToBlock) {
          quote.classList.add('zt-md-comments-quote-clickable');
          quote.addEventListener('click', () => {
            const jumped = options.jumpToBlock?.(item.comment.blockId) ?? false;
            if (!jumped) {
              showHint(messages.commentsPanelStaleAnchor);
            }
          });
        }
        card.appendChild(quote);

        const body = document.createElement('div');
        body.className = 'zt-md-comments-body';
        body.textContent = `${item.comment.author ? `${item.comment.author}: ` : ''}${item.comment.body}`;
        card.appendChild(body);

        if (item.status === 'stale') {
          const staleTag = document.createElement('div');
          staleTag.className = 'zt-md-comments-stale-tag';
          staleTag.textContent = messages.commentsPanelStale;
          card.appendChild(staleTag);
        }

        const actions = document.createElement('div');
        actions.className = 'zt-md-comments-actions';
        const resolveButton = document.createElement('button');
        resolveButton.type = 'button';
        resolveButton.className = 'zt-md-comments-action';
        resolveButton.textContent = item.comment.resolved
          ? messages.commentsPanelReopen
          : messages.commentsPanelResolve;
        resolveButton.addEventListener('click', () => {
          void engine.setResolved(item.comment.id, !item.comment.resolved).then(() => refresh());
        });
        actions.appendChild(resolveButton);
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'zt-md-comments-action zt-md-comments-action-danger';
        removeButton.textContent = messages.commentsPanelDelete;
        removeButton.addEventListener('click', () => {
          void engine.remove(item.comment.id).then(() => refresh());
        });
        actions.appendChild(removeButton);
        card.appendChild(actions);
        list.appendChild(card);
      }
      wrap.appendChild(list);
    });
  };

  refresh();

  return {
    refresh,
    destroy: () => {
      if (hintTimer !== null) {
        clearTimeout(hintTimer);
        hintTimer = null;
      }
      wrap.remove();
    },
  };
};
