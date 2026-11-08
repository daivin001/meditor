/**
 * plugins/custom/emoji-autocomplete/emoji-autocomplete-plugin.ts — Emoji `:` 输入自动补全
 *
 * Typora 风短代码补全:在空白/行首后键入 `:` 开始,继续键入中英文/拼音关键词
 * 弹出候选面板,Enter/Tab/点击插入对应 emoji 字符;Esc、空白符或失焦语义中断关闭。
 * 与 emoji 选择面板共用一套关键词数据(中文/拼音/英文)。
 */
import { Plugin, PluginKey } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import { $prose } from '@milkdown/utils';
import type { EditorI18nMessages } from '../../../types/editor';
import { EMOJI_CATEGORIES, type EmojiEntry } from '../../../components/emoji-data';

/**
 * 补全状态。
 */
interface EmojiAutocompleteState {
  /** 是否激活(面板显示中)。 */
  active: boolean;
  /** 触发 `:` 字符的文档位置。 */
  triggerPos: number;
  /** 当前查询词(`:` 之后、光标之前的文本)。 */
  query: string;
  /** 键盘高亮项索引。 */
  activeIndex: number;
}

/**
 * 面板最大候选数。
 */
const MAX_SUGGESTIONS = 8;

/**
 * 初始状态。
 */
const INITIAL_STATE: EmojiAutocompleteState = {
  active: false,
  triggerPos: 0,
  query: '',
  activeIndex: 0
};

/**
 * 判断字符是否可进入查询词(字母数字下划线连字符 + CJK)。
 */
const isQueryChar = (text: string): boolean =>
  /[\p{L}\p{N}_-]/u.test(text);

/**
 * 展平 emoji 关键词索引(分类数据 → 单条搜索列表)。
 */
const buildEmojiIndex = (): EmojiEntry[] => {
  const entries: EmojiEntry[] = [];
  for (const category of EMOJI_CATEGORIES) {
    entries.push(...category.emojis);
  }
  return entries;
};

/**
 * 按关键词过滤候选(空查询返回前 N 个常用项;多关键词空格分词逐词命中)。
 */
const filterEmojiSuggestions = (query: string): EmojiEntry[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return EMOJI_INDEX.slice(0, MAX_SUGGESTIONS);
  }
  const terms = normalizedQuery.split(/\s+/);
  const results: EmojiEntry[] = [];
  for (const entry of EMOJI_INDEX) {
    const keywords = entry.keywords.toLowerCase();
    if (terms.every((term) => keywords.includes(term))) {
      results.push(entry);
      if (results.length >= MAX_SUGGESTIONS * 4) {
        break;
      }
    }
  }
  return results.slice(0, MAX_SUGGESTIONS);
};

// 展平索引(模块级一次构建)。
const EMOJI_INDEX = buildEmojiIndex();

/**
 * 面板 DOM 控制器(每编辑器实例一个,挂 portalContainer)。
 */
class EmojiAutocompletePopup {
  /** 面板容器。 */
  readonly dom: HTMLDivElement;
  /** 当前候选(渲染后由插件读取做插入)。 */
  suggestions: EmojiEntry[] = [];
  /** 键盘高亮索引。 */
  activeIndex = 0;
  /** 确认回调(插件注入)。 */
  onPick: (entry: EmojiEntry) => void = () => undefined;

  constructor(portalContainer: HTMLElement, messages: EditorI18nMessages) {
    this.dom = document.createElement('div');
    this.dom.className = 'zt-md-emoji-autocomplete';
    this.dom.setAttribute('role', 'listbox');
    this.dom.style.display = 'none';
    portalContainer.appendChild(this.dom);
    this.messages = messages;
  }

  /** 编辑器文案。 */
  private readonly messages: EditorI18nMessages;

  /**
   * 渲染候选列表。
   */
  render(suggestions: EmojiEntry[], activeIndex: number): void {
    this.suggestions = suggestions;
    this.activeIndex = activeIndex;
    if (suggestions.length === 0) {
      this.dom.replaceChildren();
      const empty = document.createElement('div');
      empty.className = 'zt-md-emoji-autocomplete-empty';
      empty.textContent = this.messages.emojiPickerNoResults;
      this.dom.appendChild(empty);
      this.dom.style.display = 'block';
      return;
    }

    this.dom.replaceChildren();
    suggestions.forEach((entry, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'zt-md-emoji-autocomplete-item';
      item.dataset.active = index === activeIndex ? 'true' : 'false';
      item.setAttribute('role', 'option');
      const charSpan = document.createElement('span');
      charSpan.className = 'zt-md-emoji-autocomplete-char';
      charSpan.textContent = entry.char;
      const keywordSpan = document.createElement('span');
      keywordSpan.className = 'zt-md-emoji-autocomplete-keywords';
      keywordSpan.textContent = entry.keywords.split(/\s+/).slice(0, 3).join(' · ');
      item.append(charSpan, keywordSpan);
      item.addEventListener('mousedown', (event) => {
        // mousedown 防止编辑器失焦。
        event.preventDefault();
        this.onPick(entry);
      });
      this.dom.appendChild(item);
    });
    this.dom.style.display = 'block';

    // 高亮项滚入面板可视区。
    const activeItem = this.dom.querySelector<HTMLElement>('[data-active="true"]');
    if (activeItem) {
      const containerRect = this.dom.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      if (itemRect.top < containerRect.top || itemRect.bottom > containerRect.bottom) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  /**
   * 定位面板(锚定光标坐标,翻转防溢出交给 CSS max-height/边界夹取)。
   */
  positionAt(view: EditorView, pos: number): void {
    const coords = view.coordsAtPos(pos);
    this.dom.style.left = `${Math.max(4, coords.left)}px`;
    this.dom.style.top = `${coords.bottom + 4}px`;
  }

  /**
   * 关闭面板。
   */
  close(): void {
    this.dom.style.display = 'none';
    this.suggestions = [];
  }

  destroy(): void {
    this.dom.remove();
  }
}

/**
 * 创建 Emoji `:` 自动补全插件(enabled=false 时不注册面板逻辑)。
 */
export const createEmojiAutocompletePlugin = (
  portalContainer: HTMLElement,
  messages: EditorI18nMessages,
  enabled: boolean
): ReturnType<typeof $prose> => {
  // 插件键(状态 + 命令 meta 通道)。
  const pluginKey = new PluginKey<EmojiAutocompleteState>('zt-md-emoji-autocomplete');
  // 最新编辑器视图(面板点击回调读取用)。
  let currentView: EditorView | null = null;

  // 关闭态:仅注册状态通道,不创建面板 DOM。
  if (!enabled) {
    return $prose(() => new Plugin({ key: pluginKey }));
  }

  const popup = new EmojiAutocompletePopup(portalContainer, messages);

  /**
   * 插入候选:把 [触发位置, 光标) 区间的 `:query` 替换为 emoji 字符。
   */
  const pickSuggestion = (view: EditorView, entry: EmojiEntry): void => {
    const state = pluginKey.getState(view.state) as EmojiAutocompleteState | undefined;
    if (!state?.active) {
      return;
    }
    const from = state.triggerPos;
    const to = view.state.selection.from;
    view.dispatch(view.state.tr.insertText(entry.char, Math.min(from, to), to));
    view.focus();
  };

  popup.onPick = (entry) => {
    if (currentView) {
      pickSuggestion(currentView, entry);
    }
  };

  return $prose(
    () =>
      new Plugin<EmojiAutocompleteState>({
        key: pluginKey,
        state: {
          init: () => INITIAL_STATE,
          apply: (tr, prev) => {
            // 程序性开关 meta(插入后立即关闭)。
            const meta = tr.getMeta(pluginKey) as EmojiAutocompleteState | undefined;
            if (meta) {
              return meta;
            }
            if (!tr.docChanged) {
              return prev;
            }
            // 文档变化:重校验查询区间仍是 `:query` 形态(撤销/替换等破坏时关闭)。
            if (!prev.active) {
              return INITIAL_STATE;
            }
            try {
              const text = tr.doc.textBetween(prev.triggerPos, Math.min(prev.triggerPos + 1 + prev.query.length, tr.doc.content.size), '\u0000');
              if (text.startsWith(':') && text.slice(1) === prev.query) {
                return prev;
              }
            } catch {
              // 区间越界即失效。
            }
            return INITIAL_STATE;
          }
        },
        props: {
          handleTextInput: (view, from, to, text) => {
            const isEditable =
              typeof view.props.editable === 'function'
                ? view.props.editable(view.state)
                : view.editable;
            if (!isEditable || from !== to) {
              return false;
            }
            const prev = pluginKey.getState(view.state) as EmojiAutocompleteState | undefined;

            // 触发:`:` 出现在行首或空白之后。
            if (text === ':') {
              const beforeChar = from > 0 ? view.state.doc.textBetween(from - 1, from, '\u0000') : '\n';
              if (beforeChar === '' || /\s|\n/.test(beforeChar)) {
                view.dispatch(
                  view.state.tr.setMeta(pluginKey, {
                    active: true,
                    triggerPos: from,
                    query: '',
                    activeIndex: 0
                  })
                );
                return false; // `:` 本身照常插入。
              }
              view.dispatch(view.state.tr.setMeta(pluginKey, INITIAL_STATE));
              return false;
            }

            // 查询词追加。
            if (prev?.active && isQueryChar(text)) {
              view.dispatch(
                view.state.tr.setMeta(pluginKey, {
                  ...prev,
                  query: prev.query + text,
                  activeIndex: 0
                })
              );
              return false;
            }

            // 其他字符(空格/换行/符号)中断补全。
            if (prev?.active) {
              view.dispatch(view.state.tr.setMeta(pluginKey, INITIAL_STATE));
            }
            return false;
          },
          handleKeyDown: (view, event) => {
            const state = pluginKey.getState(view.state) as EmojiAutocompleteState | undefined;
            if (!state?.active) {
              return false;
            }
            const suggestions = filterEmojiSuggestions(state.query);

            if (event.key === 'Escape') {
              event.preventDefault();
              view.dispatch(view.state.tr.setMeta(pluginKey, INITIAL_STATE));
              return true;
            }
            if (suggestions.length === 0) {
              return false;
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              const offset = event.key === 'ArrowDown' ? 1 : -1;
              const nextIndex = (state.activeIndex + offset + suggestions.length) % suggestions.length;
              view.dispatch(
                view.state.tr.setMeta(pluginKey, { ...state, activeIndex: nextIndex })
              );
              return true;
            }
            if (event.key === 'Enter' || event.key === 'Tab') {
              event.preventDefault();
              const entry = suggestions[state.activeIndex] ?? suggestions[0];
              if (entry) {
                pickSuggestion(view, entry);
              }
              return true;
            }
            return false;
          }
        },
        view: (view) => {
          currentView = view;
          return {
            update: (nextView) => {
              currentView = nextView;
              const state = pluginKey.getState(nextView.state) as EmojiAutocompleteState | undefined;
              if (!state?.active) {
                popup.close();
                return;
              }
              const suggestions = filterEmojiSuggestions(state.query);
              popup.render(suggestions, state.activeIndex);
              popup.positionAt(nextView, state.triggerPos + 1);
              // 索引越界保护(查询变化后高亮回落首项)。
              if (state.activeIndex >= suggestions.length) {
                nextView.dispatch(
                  nextView.state.tr.setMeta(pluginKey, { ...state, activeIndex: 0 })
                );
              }
            },
            destroy: () => {
              popup.close();
              currentView = null;
            }
          };
        }
      })
  );
};
