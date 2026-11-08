/**
 * components/search-panel.ts — 搜索面板（纯 DOM 实现）
 *
 * 1:1 翻译自 zt-react-milkdown/src/react/components/SearchPanel.tsx
 * - 去除 React 渲染，全部使用纯 DOM API
 * - 搜索参数变化通过回调传递给外部
 */
import type { EditorI18nMessages, EditorSearchOptions, EditorSearchSnapshot } from '../types/editor';
import type { EditorSearchBooleanOption } from '../plugins/custom/search';

/** 搜索面板 API。 */
export interface SearchPanelApi {
  open: () => void;
  close: () => void;
  updateOptions: (nextOptions: EditorSearchOptions) => void;
  updateSnapshot: (snapshot: EditorSearchSnapshot) => void;
  getOptions: () => EditorSearchOptions;
}

/** 搜索面板 controller。 */
export interface SearchPanelController {
  open: () => void;
  close: () => void;
}

/** 搜索面板配置。 */
export interface SearchPanelConfig {
  /** 容器 DOM。 */
  container: HTMLElement;
  /** 编辑器文案。 */
  messages: EditorI18nMessages;
  /** 搜索参数变更回调。 */
  onOptionsChange: (nextOptions: EditorSearchOptions) => void;
  /** 定位下一项回调。 */
  onFindNext: () => void;
  /** 定位上一项回调。 */
  onFindPrevious: () => void;
  /** 关闭面板回调(宿主同步 data-search-open 状态标记)。 */
  onClose: () => void;
  /** 替换当前项回调。 */
  onReplaceCurrent: (replacement: string) => void;
  /** 全部替换回调。 */
  onReplaceAll: (replacement: string) => void;
}

/** 默认搜索选项。 */
export const DEFAULT_SEARCH_OPTIONS: EditorSearchOptions = {
  search: '',
  replace: '',
  caseSensitive: false,
  wholeWord: false,
  regexp: false
};

/** 默认空快照。 */
const DEFAULT_SNAPSHOT: EditorSearchSnapshot = {
  matchCount: 0,
  matchIndex: 0,
  isInvalidExpression: false
};

/**
 * 创建搜索面板 DOM 元素。
 */
const createPanelElements = (messages: EditorI18nMessages): HTMLElement => {
  const root = document.createElement('section');
  root.className = 'zt-md-search-panel';
  root.setAttribute('role', 'search');
  root.setAttribute('aria-label', messages.searchPanelAriaLabel);

  root.innerHTML = `
    <div class="zt-md-search-row zt-md-search-main-row">
      <button class="zt-md-search-icon-button zt-md-search-replace-toggle" type="button"
              aria-label="${escapeHtml(messages.searchReplaceLabel)}" aria-expanded="false"
              title="${escapeHtml(messages.searchReplaceLabel)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 6 15 12 9 18"/>
        </svg>
      </button>
      <input class="zt-md-search-input" type="text"
             placeholder="${escapeHtml(messages.searchInputPlaceholder)}"
             aria-label="${escapeHtml(messages.searchInputPlaceholder)}" />
      <div class="zt-md-search-options" role="group"
           aria-label="${escapeHtml(messages.searchPanelAriaLabel)}">
        <button class="zt-md-search-option" type="button" data-option="caseSensitive"
                aria-pressed="false" aria-label="${escapeHtml(messages.searchCaseSensitiveLabel)}"
                title="${escapeHtml(messages.searchCaseSensitiveLabel)}">Aa</button>
        <button class="zt-md-search-option" type="button" data-option="wholeWord"
                aria-pressed="false" aria-label="${escapeHtml(messages.searchWholeWordLabel)}"
                title="${escapeHtml(messages.searchWholeWordLabel)}">W</button>
        <button class="zt-md-search-option" type="button" data-option="regexp"
                aria-pressed="false" aria-label="${escapeHtml(messages.searchRegexpLabel)}"
                title="${escapeHtml(messages.searchRegexpLabel)}">.*</button>
      </div>
      <output class="zt-md-search-count" aria-live="polite">0 / 0</output>
      <div class="zt-md-search-navigation">
        <div class="zt-md-search-navigation-buttons">
          <button class="zt-md-search-icon-button zt-md-search-prev" type="button"
                  aria-label="${escapeHtml(messages.searchPreviousAriaLabel)}"
                  title="${escapeHtml(messages.searchPreviousAriaLabel)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
          <button class="zt-md-search-icon-button zt-md-search-next" type="button"
                  aria-label="${escapeHtml(messages.searchNextAriaLabel)}"
                  title="${escapeHtml(messages.searchNextAriaLabel)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
        <button class="zt-md-search-icon-button zt-md-search-close-button" type="button"
                aria-label="${escapeHtml(messages.searchCloseAriaLabel)}"
                title="${escapeHtml(messages.searchCloseAriaLabel)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="zt-md-search-row zt-md-search-replace-row" hidden>
      <input class="zt-md-search-input zt-md-search-replace-input" type="text"
             placeholder="${escapeHtml(messages.searchReplaceInputPlaceholder)}"
             aria-label="${escapeHtml(messages.searchReplaceInputPlaceholder)}" />
      <button class="zt-md-search-action-button zt-md-search-action-primary" type="button"
              data-role="replace-current">${escapeHtml(messages.searchReplaceLabel)}</button>
      <button class="zt-md-search-action-button" type="button"
              data-role="replace-all">${escapeHtml(messages.searchReplaceAllLabel)}</button>
    </div>
  `;

  return root;
};

/** HTML 转义。 */
const escapeHtml = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

/**
 * 创建搜索面板实例。
 */
export const createSearchPanel = (config: SearchPanelConfig): SearchPanelApi & SearchPanelController => {
  const root = createPanelElements(config.messages);
  config.container.appendChild(root);

  let currentOptions: EditorSearchOptions = { ...DEFAULT_SEARCH_OPTIONS };
  let currentSnapshot: EditorSearchSnapshot = DEFAULT_SNAPSHOT;
  let replaceExpanded = false;

  const searchInput = root.querySelector<HTMLInputElement>('.zt-md-search-input:not(.zt-md-search-replace-input)')!;
  const replaceInput = root.querySelector<HTMLInputElement>('.zt-md-search-replace-input')!;
  const replaceToggle = root.querySelector<HTMLButtonElement>('.zt-md-search-replace-toggle')!;
  const replaceRow = root.querySelector<HTMLElement>('.zt-md-search-replace-row')!;
  const prevBtn = root.querySelector<HTMLButtonElement>('.zt-md-search-prev')!;
  const nextBtn = root.querySelector<HTMLButtonElement>('.zt-md-search-next')!;
  const closeBtn = root.querySelector<HTMLButtonElement>('.zt-md-search-close-button')!;
  const replaceCurrentBtn = root.querySelector<HTMLButtonElement>('[data-role="replace-current"]')!;
  const replaceAllBtn = root.querySelector<HTMLButtonElement>('[data-role="replace-all"]')!;
  const countEl = root.querySelector<HTMLElement>('.zt-md-search-count')!;
  const optionButtons = root.querySelectorAll<HTMLButtonElement>('.zt-md-search-option');

  const applyOptionsToUI = (): void => {
    if (searchInput.value !== currentOptions.search) {
      searchInput.value = currentOptions.search;
    }
    if (replaceInput.value !== currentOptions.replace) {
      replaceInput.value = currentOptions.replace;
    }
    optionButtons.forEach((btn) => {
      const opt = btn.dataset.option as EditorSearchBooleanOption | undefined;
      if (!opt) return;
      const pressed = (currentOptions as unknown as Record<string, unknown>)[opt] === true;
      btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    });
  };

  const applySnapshotToUI = (): void => {
    // 正则非法时计数区显示错误文案(而非误导性的 "0 / 0");恢复有效后回到计数。
    countEl.textContent = currentSnapshot.isInvalidExpression
      ? config.messages.searchInvalidRegexp
      : `${currentSnapshot.matchIndex} / ${currentSnapshot.matchCount}`;
    const disabled = currentSnapshot.matchCount === 0 || currentSnapshot.isInvalidExpression;
    prevBtn.disabled = disabled;
    nextBtn.disabled = disabled;
    replaceCurrentBtn.disabled = disabled;
    replaceAllBtn.disabled = disabled;
  };

  const emitOptions = (): void => {
    config.onOptionsChange({ ...currentOptions });
  };

  const onSearchInput = (): void => {
    currentOptions = { ...currentOptions, search: searchInput.value };
    emitOptions();
  };
  const onReplaceInput = (): void => {
    currentOptions = { ...currentOptions, replace: replaceInput.value };
    emitOptions();
  };
  const onOptionToggle = (event: Event): void => {
    const btn = event.currentTarget as HTMLButtonElement;
    const opt = btn.dataset.option as EditorSearchBooleanOption | undefined;
    if (!opt) return;
    const current = (currentOptions as unknown as Record<string, unknown>)[opt] === true;
    currentOptions = { ...currentOptions, [opt]: !current } as EditorSearchOptions;
    applyOptionsToUI();
    emitOptions();
  };
  const onReplaceToggle = (): void => {
    replaceExpanded = !replaceExpanded;
    replaceRow.hidden = !replaceExpanded;
    replaceToggle.setAttribute('aria-expanded', replaceExpanded ? 'true' : 'false');
  };
  const onPrev = (): void => {
    config.onFindPrevious();
  };
  const onNext = (): void => {
    config.onFindNext();
  };
  const onReplaceCurrent = (): void => {
    config.onReplaceCurrent(currentOptions.replace);
  };
  const onReplaceAll = (): void => {
    config.onReplaceAll(currentOptions.replace);
  };

  searchInput.addEventListener('input', onSearchInput);
  replaceInput.addEventListener('input', onReplaceInput);
  replaceToggle.addEventListener('click', onReplaceToggle);
  prevBtn.addEventListener('click', onPrev);
  nextBtn.addEventListener('click', onNext);
  // 关闭按钮与 API close 走同一逻辑(仅隐藏 DOM;面板实例由宿主复用,不销毁)。
  const closePanel = (): void => {
    root.style.display = 'none';
    config.onClose();
  };
  closeBtn.addEventListener('click', closePanel);
  replaceCurrentBtn.addEventListener('click', onReplaceCurrent);
  replaceAllBtn.addEventListener('click', onReplaceAll);
  optionButtons.forEach((btn) => btn.addEventListener('click', onOptionToggle));

  applyOptionsToUI();
  applySnapshotToUI();

  return {
    open: (): void => {
      root.style.display = '';
      requestAnimationFrame(() => {
        searchInput.focus();
        searchInput.select();
      });
    },
    close: (): void => {
      closePanel();
    },
    updateOptions: (nextOptions: EditorSearchOptions) => {
      currentOptions = { ...nextOptions };
      applyOptionsToUI();
    },
    updateSnapshot: (snapshot: EditorSearchSnapshot) => {
      currentSnapshot = snapshot;
      applySnapshotToUI();
    },
    getOptions: () => ({ ...currentOptions })
  };
};
