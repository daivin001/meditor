/**
 * plugins/custom/code-block/code-block-editable.ts — 代码块可编辑 NodeView
 *
 * 1:1 翻译自 zt-react-milkdown/src/plugins/custom/code-block/code-block-editable.ts
 * - contentDOM 为纯文本 pre,高亮由 code-block-prism Decoration 提供
 * - 悬浮操作栏:预览(html/svg)/ 复制 / 删除
 * - lucide 图标改为内联 SVG markup
 */
import type { Node as ProseNode } from '@milkdown/prose/model';
import { TextSelection } from '@milkdown/prose/state';
import type { EditorView, NodeView, NodeViewConstructor } from '@milkdown/prose/view';
import {
  isCodeBlockAutoPreviewLanguage,
  isCodeBlockPreviewLanguage,
  normalizeCodeBlockLanguage,
  resolveCodeBlockLanguageLabel,
  resolveLanguageOptions,
  type CodeLanguageOption
} from './code-block-language';
import {
  MERMAID_LANGUAGE,
  buildMermaidPreviewDocument,
  createMermaidErrorElement,
  renderMermaidToSvg
} from './code-block-mermaid';
import { moveSelectionFromSpecialBlock } from '../cursor';
import type { EditorI18nMessages } from '../../../types/editor';
import { resolveEditorMessages } from '../../../local/i18n';

// 代码块节点类型名。
const CODE_BLOCK_NODE_NAME = 'code_block';
// 复制成功态清理延迟(毫秒)。
const COPY_FEEDBACK_DURATION = 1200;
// HTML 代码块语言值。
const HTML_CODE_BLOCK_LANGUAGE = 'html';
// 代码块预览布局变更事务元数据键。
const CODE_BLOCK_PREVIEW_LAYOUT_META = 'ZT_MD_CODE_BLOCK_PREVIEW_LAYOUT';
// 代码块预览基础内容安全策略。
const CODE_BLOCK_PREVIEW_BASE_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'font-src data:',
  'media-src data: blob:',
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "form-action 'none'",
  "base-uri 'none'"
];

/**
 * 构建内联 SVG 图标 markup(lucide 风格线条)。
 */
const buildIconMarkup = (paths: string): string => {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
  );
};

// 复制按钮默认图标。
const copyIconMarkup = buildIconMarkup(
  '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'
);
// 复制成功反馈图标。
const checkIconMarkup = buildIconMarkup('<path d="M20 6 9 17l-5-5"/>');
// 删除按钮默认图标。
const deleteIconMarkup = buildIconMarkup(
  '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>'
);
// 预览按钮默认图标。
const previewIconMarkup = buildIconMarkup(
  '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'
);
// 查看源码按钮图标。
const sourceIconMarkup = buildIconMarkup('<path d="m18 16 4-4-4-4M6 8l-4 4 4 4m8.5-12-5 16"/>');
// 语言触发钮展开箭头图标。
const langChevronMarkup = buildIconMarkup('<path d="m6 9 6 6 6-6"/>');
// 语言面板搜索图标。
const langSearchMarkup = buildIconMarkup('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>');
// 语言面板选中勾选图标。
const langCheckMarkup = buildIconMarkup('<path d="M20 6 9 17l-5-5"/>');

/**
 * 创建隔离的代码块预览文档。
 */
const createCodeBlockPreviewDocument = (codeContent: string, isScriptEnabled: boolean): string => {
  // 当前预览内容安全策略。
  const contentSecurityPolicy = [
    ...CODE_BLOCK_PREVIEW_BASE_CONTENT_SECURITY_POLICY,
    ...(isScriptEnabled ? ["script-src 'unsafe-inline'"] : [])
  ].join('; ');

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}" />
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      html, body { min-height: 100%; margin: 0; }
      body { padding: 1rem; overflow-wrap: anywhere; }
      svg { max-width: 100%; height: auto; }
    </style>
  </head>
  <body>${codeContent}</body>
</html>`;
};

/**
 * 解析 NodeView 的节点位置。
 */
const resolveNodePosition = (getPos: boolean | (() => number)): number | null => {
  if (typeof getPos !== 'function') {
    return null;
  }

  return getPos();
};

/**
 * 判断当前编辑器是否可编辑。
 */
const isEditorViewEditable = (view: EditorView): boolean => {
  if (typeof view.props.editable === 'function') {
    return view.props.editable(view.state);
  }

  return view.editable;
};

/**
 * 代码块 NodeView 行为配置(行号/自动换行/Mermaid 开关;与 meditor options 对应)。
 */
export interface CodeBlockNodeViewOptions {
  /** 代码块左侧显示行号(默认 false)。 */
  lineNumbers?: boolean;
  /** 代码块自动换行(默认 false:横向滚动)。 */
  wordWrap?: boolean;
  /** Mermaid 图表语法(默认 true;关闭时 mermaid 块退化为普通代码块)。 */
  mermaidEnabled?: boolean;
}

/**
 * 创建带悬浮操作按钮的代码块 NodeView。
 */
class CodeBlockEditableNodeView implements NodeView {
  // 当前节点快照。
  node: ProseNode;
  // 节点根容器。
  dom: HTMLDivElement;
  // 内容容器。
  contentDOM: HTMLPreElement;
  // 编辑器视图。
  private readonly view: EditorView;
  // 节点位置获取器。
  private readonly getPos: boolean | (() => number);
  // 编辑器文案。
  private readonly messages: EditorI18nMessages;
  // header 容器(语言触发钮 + 操作按钮,flex 垂直居中)。
  private readonly header: HTMLDivElement;
  // 语言触发按钮。
  private readonly langTrigger: HTMLButtonElement;
  // 语言触发按钮文案节点。
  private readonly langTriggerLabel: HTMLSpanElement;
  // 语言面板容器。
  private readonly langPanel: HTMLDivElement;
  // 语言面板搜索输入框。
  private readonly langSearchInput: HTMLInputElement;
  // 语言面板选项容器。
  private readonly langOptionsContainer: HTMLDivElement;
  // 语言面板展开状态。
  private langPanelOpen = false;
  // 语言面板搜索关键字。
  private langKeyword = '';
  // 语言面板键盘高亮项索引。
  private langActiveOptionIndex = 0;
  // 语言下拉项列表。
  private readonly languageOptions: CodeLanguageOption[];
  // 操作区容器。
  private readonly actionsContainer: HTMLSpanElement;
  // 预览切换按钮。
  private readonly previewButton: HTMLButtonElement;
  // 复制按钮。
  private readonly copyButton: HTMLButtonElement;
  // 删除按钮。
  private readonly deleteButton: HTMLButtonElement;
  // 预览区域。
  private readonly previewContainer: HTMLDivElement;
  // 当前挂载的预览 iframe。
  private previewFrame: HTMLIFrameElement | null = null;
  // 当前是否支持预览。
  private isPreviewAvailable = false;
  // 当前是否显示预览。
  private isPreviewMode = false;
  // 用户是否手动切换过预览(切换后不再自动回到预览,直到语言变化)。
  private previewToggled = false;
  // 上一次预览语言(语言切换时重置 previewToggled)。
  private lastPreviewLanguage: string | null = null;
  // Mermaid 异步渲染令牌(丢弃过期渲染结果)。
  private mermaidRenderToken = 0;
  // 已渲染的预览标识。
  private renderedPreviewKey: string | null = null;
  // 复制成功反馈计时器。
  private copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null;
  // 行号/自动换行/Mermaid 开关配置。
  private readonly codeOptions: CodeBlockNodeViewOptions;
  // 行号槽(绝对定位覆盖在 pre 左侧;aria-hidden 纯视觉)。
  private readonly gutterEl: HTMLDivElement | null;
  // 行号同步信号(内容长度 + 内容盒高度;未变化时跳过重建)。
  private gutterSyncKey = '';
  // 内容尺寸观察器(换行数变化/编辑增高时重排行号)。
  private gutterResizeObserver: ResizeObserver | null = null;

  /**
   * 同步代码块语言:触发钮展示名 + pre[data-language](Prism 高亮读 attrs.language,data-language 仅语义保留)。
   */
  private syncLanguageAttribute(node: ProseNode): void {
    // 当前语言属性值。
    const language = typeof node.attrs.language === 'string' ? node.attrs.language.trim() : '';
    if (!language) {
      this.contentDOM.removeAttribute('data-language');
      this.langTriggerLabel.textContent = '';
      this.langTrigger.setAttribute('aria-label', '');
      return;
    }

    this.contentDOM.setAttribute('data-language', normalizeCodeBlockLanguage(language));
    // 触发钮展示最新语言展示名。
    const label = resolveCodeBlockLanguageLabel(language);
    this.langTrigger.dataset.language = normalizeCodeBlockLanguage(language);
    this.langTrigger.setAttribute('aria-label', label);
    this.langTriggerLabel.textContent = label;
  }

  /**
   * 初始化代码块视图。
   */
  constructor(
    node: ProseNode,
    view: EditorView,
    getPos: boolean | (() => number),
    messages: EditorI18nMessages,
    codeOptions: CodeBlockNodeViewOptions = {}
  ) {
    // 初始节点快照。
    this.node = node;
    // 编辑器视图引用。
    this.view = view;
    // 节点位置获取器引用。
    this.getPos = getPos;
    // 编辑器文案引用。
    this.messages = messages;
    // 行号/自动换行/Mermaid 开关配置。
    this.codeOptions = codeOptions;
    // 根容器。
    this.dom = document.createElement('div');
    this.dom.className = 'zt-md-code-block';
    this.dom.dataset.type = CODE_BLOCK_NODE_NAME;
    // 自动换行开关(data 驱动 CSS white-space)。
    this.dom.dataset.wrap = codeOptions.wordWrap ? 'on' : 'off';
    // 行号槽:开启行号时创建并随内容重排。
    if (codeOptions.lineNumbers) {
      this.dom.dataset.lineNumbers = 'on';
      this.gutterEl = document.createElement('div');
      this.gutterEl.className = 'zt-md-code-block-gutter';
      this.gutterEl.setAttribute('aria-hidden', 'true');
    } else {
      this.gutterEl = null;
    }
    // 内容容器。
    this.contentDOM = document.createElement('pre');
    // 语言下拉项列表(纯文本 + refractor 语言集;Mermaid 开关按实例传入)。
    this.languageOptions = resolveLanguageOptions(messages, {
      mermaidEnabled: codeOptions.mermaidEnabled ?? true
    });
    // header 容器:语言触发钮(左,替代静态语言文字) + 操作按钮(右),flex 垂直居中。
    this.header = document.createElement('div');
    this.header.className = 'zt-md-code-block-header';
    // 语言触发按钮。
    this.langTrigger = document.createElement('button');
    this.langTrigger.type = 'button';
    this.langTrigger.className = 'zt-md-code-block-lang-trigger';
    this.langTrigger.addEventListener('mousedown', this.handleLangPanelMouseDown);
    this.langTrigger.addEventListener('click', this.handleLangTriggerClick);
    // 触发钮文案。
    this.langTriggerLabel = document.createElement('span');
    this.langTriggerLabel.className = 'zt-md-code-block-lang-trigger-label';
    this.langTrigger.appendChild(this.langTriggerLabel);
    // 触发钮展开箭头。
    const langChevron = document.createElement('span');
    langChevron.className = 'zt-md-code-block-lang-trigger-icon';
    langChevron.innerHTML = langChevronMarkup;
    this.langTrigger.appendChild(langChevron);
    // 语言面板:header 的相对浮层,点击触发钮时展开。
    this.langPanel = document.createElement('div');
    this.langPanel.className = 'zt-md-code-block-lang-panel';
    this.langPanel.style.display = 'none';
    this.langPanel.addEventListener('mousedown', this.handleLangPanelMouseDown);
    // 搜索区。
    const langSearch = document.createElement('label');
    langSearch.className = 'zt-md-code-block-lang-search';
    const langSearchIcon = document.createElement('span');
    langSearchIcon.className = 'zt-md-code-block-lang-search-icon';
    langSearchIcon.innerHTML = langSearchMarkup;
    langSearch.appendChild(langSearchIcon);
    // 搜索输入框。
    this.langSearchInput = document.createElement('input');
    this.langSearchInput.type = 'text';
    this.langSearchInput.placeholder = messages.codeBlockLanguageSearchPlaceholder;
    this.langSearchInput.className = 'zt-md-code-block-lang-search-input';
    this.langSearchInput.addEventListener('input', this.handleLangSearchInput);
    this.langSearchInput.addEventListener('keydown', this.handleLangSearchKeyDown);
    langSearch.appendChild(this.langSearchInput);
    this.langPanel.appendChild(langSearch);
    // 选项列表。
    this.langOptionsContainer = document.createElement('div');
    this.langOptionsContainer.className = 'zt-md-code-block-lang-options';
    this.langOptionsContainer.setAttribute('role', 'listbox');
    this.langPanel.appendChild(this.langOptionsContainer);
    this.header.appendChild(this.langTrigger);
    // 预览区域。
    this.previewContainer = document.createElement('div');
    this.previewContainer.className = 'zt-md-code-block-preview';
    this.previewContainer.contentEditable = 'false';
    this.previewContainer.hidden = true;
    this.previewContainer.tabIndex = -1;
    this.previewContainer.setAttribute('role', 'region');
    this.previewContainer.setAttribute('aria-label', messages.codeBlockPreviewAriaLabel);
    // 操作区容器。
    this.actionsContainer = document.createElement('span');
    this.actionsContainer.className = 'zt-md-code-block-actions';
    this.actionsContainer.contentEditable = 'false';
    // 预览切换按钮。
    this.previewButton = document.createElement('button');
    this.previewButton.type = 'button';
    this.previewButton.className = 'zt-md-code-block-action-button';
    this.previewButton.hidden = true;
    this.previewButton.innerHTML = previewIconMarkup;
    // 复制按钮。
    this.copyButton = document.createElement('button');
    this.copyButton.type = 'button';
    this.copyButton.className = 'zt-md-code-block-action-button zt-md-code-block-editable-action';
    this.copyButton.setAttribute('aria-label', messages.codeBlockCopyAriaLabel);
    this.copyButton.innerHTML = copyIconMarkup;
    // 删除按钮。
    this.deleteButton = document.createElement('button');
    this.deleteButton.type = 'button';
    this.deleteButton.className =
      'zt-md-code-block-action-button zt-md-code-block-editable-action zt-md-code-block-action-button-danger';
    this.deleteButton.setAttribute('aria-label', messages.codeBlockDeleteAriaLabel);
    this.deleteButton.innerHTML = deleteIconMarkup;
    this.actionsContainer.append(this.previewButton, this.copyButton, this.deleteButton);
    this.header.appendChild(this.actionsContainer);
    this.header.appendChild(this.langPanel);
    this.dom.append(this.header, this.contentDOM, this.previewContainer);
    if (this.gutterEl) {
      // 行号槽置于 pre 之前(absolute 覆盖,不参与文档流)。
      this.dom.insertBefore(this.gutterEl, this.contentDOM);
      // 内容尺寸变化(编辑/换行/窗口缩放)时重排行号。
      if (typeof ResizeObserver === 'function') {
        this.gutterResizeObserver = new ResizeObserver(() => this.scheduleGutterSync());
        this.gutterResizeObserver.observe(this.contentDOM);
      }
    }
    this.updateEditableState();
    this.syncLanguageAttribute(node);
    this.syncPreviewAvailability(node);
    this.previewButton.addEventListener('click', this.handlePreviewClick);
    this.copyButton.addEventListener('click', this.handleCopyClick);
    this.deleteButton.addEventListener('click', this.handleDeleteClick);
    this.previewContainer.addEventListener('keydown', this.handlePreviewKeyDown);
    // 点击语言面板外任意位置时收起面板。
    document.addEventListener('mousedown', this.handleDocumentMouseDown, true);
  }

  /**
   * 重排行号(update 逐事务/尺寸回调触发;同步执行:后台标签页 rAF/RO 回调
   * 可能长期不派发,同步路径保证任何可见性下编辑后行号立即对齐)。
   */
  private scheduleGutterSync(): void {
    if (!this.gutterEl) {
      return;
    }
    this.syncGutter();
  }

  /**
   * 重排行号:按每个逻辑行首字符的实测坐标定位(自动换行下与可视行精确对齐)。
   */
  private syncGutter(): void {
    const gutter = this.gutterEl;
    if (!gutter) {
      return;
    }
    const pre = this.contentDOM;
    const preRect = pre.getBoundingClientRect();
    if (preRect.height <= 0) {
      return;
    }
    // 内容未变化(长度 + 盒高)时跳过重建,避免逐键重排。
    const text = this.node.textContent;
    const syncKey = `${text.length}|${Math.round(preRect.height)}|${preRect.width}`;
    if (syncKey === this.gutterSyncKey) {
      return;
    }
    this.gutterSyncKey = syncKey;

    // 内容区随 pre 定位(行号槽覆盖在 pre 左侧)。
    gutter.style.top = `${pre.offsetTop}px`;
    gutter.style.height = `${pre.offsetHeight}px`;

    const lines = text.split('\n');
    // 超长代码块(>1000 行)退化为等距行号,避免逐行坐标测量开销。
    const fragment = document.createDocumentFragment();
    if (lines.length > 1000) {
      const lineHeight = preRect.height / lines.length;
      lines.forEach((_, index) => {
        const item = document.createElement('div');
        item.className = 'zt-md-code-block-gutter-line';
        item.style.top = `${index * lineHeight}px`;
        item.textContent = String(index + 1);
        fragment.appendChild(item);
      });
      gutter.replaceChildren(fragment);
      return;
    }

    // 节点在文档中的起点(取不到位置时隐藏行号)。
    const nodePosition = resolveNodePosition(this.getPos);
    if (nodePosition === null) {
      gutter.replaceChildren();
      return;
    }
    let offset = 0;
    let lastTop = Number.NaN;
    lines.forEach((line, index) => {
      // 行首坐标(空行取行尾,同一视觉行只画一个号)。
      const position = nodePosition + 1 + Math.min(offset, text.length);
      let top = Number.NaN;
      try {
        const coords = this.view.coordsAtPos(Math.min(position, nodePosition + 1 + text.length));
        top = coords.top - preRect.top;
      } catch {
        /* 位置瞬态(整篇替换中)时丢弃本行 */
      }
      offset += line.length + 1;
      if (!Number.isFinite(top)) {
        return;
      }
      if (Number.isFinite(lastTop) && Math.abs(top - lastTop) < 2) {
        return;
      }
      lastTop = top;
      const item = document.createElement('div');
      item.className = 'zt-md-code-block-gutter-line';
      item.style.top = `${top}px`;
      item.textContent = String(index + 1);
      fragment.appendChild(item);
    });
    gutter.replaceChildren(fragment);
  }

  /**
   * 响应预览按钮点击,切换源码与静态预览。
   */
  private readonly handlePreviewClick = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isPreviewAvailable) {
      return;
    }

    this.isPreviewMode = !this.isPreviewMode;
    this.previewToggled = true;
    this.syncPreviewState();
    // 触发插件视图按新的代码块尺寸刷新浮层定位,不修改文档内容。
    this.view.dispatch(this.view.state.tr.setMeta(CODE_BLOCK_PREVIEW_LAYOUT_META, true));
  };

  /**
   * 处理预览容器方向键边界导航。
   */
  private readonly handlePreviewKeyDown = (event: KeyboardEvent): void => {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')
    ) {
      return;
    }

    // 当前代码块位置。
    const nodePosition = resolveNodePosition(this.getPos);
    if (nodePosition === null) {
      return;
    }

    if (moveSelectionFromSpecialBlock(this.view, nodePosition, this.node, event.key)) {
      event.preventDefault();
    }
  };

  /**
   * 响应复制按钮点击,复制当前代码块文本。
   */
  private readonly handleCopyClick = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    if (!isEditorViewEditable(this.view)) {
      return;
    }

    // 当前代码块文本。
    const codeContent = this.node.textContent;
    // 优先使用现代剪贴板 API。
    const writeClipboardPromise =
      typeof navigator !== 'undefined' && navigator.clipboard?.writeText
        ? navigator.clipboard.writeText(codeContent)
        : Promise.resolve();
    void writeClipboardPromise
      .then(() => {
        this.copyButton.innerHTML = checkIconMarkup;
        this.copyButton.dataset.copied = 'true';
        if (this.copyFeedbackTimer !== null) {
          clearTimeout(this.copyFeedbackTimer);
        }
        this.copyFeedbackTimer = setTimeout(() => {
          this.copyButton.innerHTML = copyIconMarkup;
          delete this.copyButton.dataset.copied;
          this.copyFeedbackTimer = null;
        }, COPY_FEEDBACK_DURATION);
      })
      .catch(() => {
        // 剪贴板不可用时忽略反馈,不影响编辑流程。
      });
  };

  /**
   * 响应删除按钮点击,删除当前代码块。
   */
  private readonly handleDeleteClick = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    if (!isEditorViewEditable(this.view)) {
      return;
    }

    this.deleteCurrentCodeBlock();
  };

  /**
   * 删除当前代码块并将焦点归还编辑器。
   */
  private deleteCurrentCodeBlock(): void {
    // 当前节点位置。
    const nodePosition = resolveNodePosition(this.getPos);
    if (nodePosition === null) {
      return;
    }

    // 删除后将光标落在安全位置,保证后续连续编辑。
    const transaction = this.view.state.tr.delete(nodePosition, nodePosition + this.node.nodeSize);
    const safePosition = Math.min(nodePosition, transaction.doc.content.size);
    transaction.setSelection(TextSelection.near(transaction.doc.resolve(safePosition), -1)).scrollIntoView();
    this.view.dispatch(transaction);
    requestAnimationFrame(() => {
      this.view.focus();
    });
  }

  /**
   * 当前语言下拉项过滤结果。
   */
  private get filteredLangOptions(): CodeLanguageOption[] {
    // 规范化搜索关键字。
    const normalizedKeyword = this.langKeyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return this.languageOptions;
    }

    return this.languageOptions.filter((option) => {
      const optionLabel = option.label.toLowerCase();
      const optionValue = option.value.toLowerCase();
      return optionLabel.includes(normalizedKeyword) || optionValue.includes(normalizedKeyword);
    });
  }

  /**
   * 判断事件目标是否允许保留默认聚焦行为(输入框/可编辑区)。
   */
  private readonly isLangFocusAllowedTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return target.closest('input, textarea, [contenteditable]:not([contenteditable="false"])') !== null;
  };

  /**
   * 阻止非输入控件点击导致编辑器选区丢失。
   */
  private readonly handleLangPanelMouseDown = (event: MouseEvent): void => {
    if (this.isLangFocusAllowedTarget(event.target)) {
      return;
    }

    event.preventDefault();
  };

  /**
   * 点击语言面板外任意位置时收起面板(面板/触发钮/输入框除外)。
   */
  private readonly handleDocumentMouseDown = (event: MouseEvent): void => {
    if (!this.langPanelOpen) {
      return;
    }

    const target = event.target as Node | null;
    if (this.langPanel.contains(target) || this.langTrigger.contains(target)) {
      return;
    }

    this.setLangPanelOpen(false);
  };

  /**
   * 切换语言面板展开状态。
   */
  private readonly handleLangTriggerClick = (): void => {
    if (this.langPanelOpen) {
      this.setLangPanelOpen(false);
      return;
    }

    // 当前语言对应的高亮索引。
    const currentLanguage = this.langTrigger.dataset.language ?? '';
    const currentOptionIndex = this.filteredLangOptions.findIndex((option) => option.value === currentLanguage);
    this.langActiveOptionIndex = currentOptionIndex >= 0 ? currentOptionIndex : 0;
    this.setLangPanelOpen(true);
  };

  /**
   * 处理语言面板搜索输入。
   */
  private readonly handleLangSearchInput = (event: Event): void => {
    this.langKeyword = (event.target as HTMLInputElement).value;
    this.langActiveOptionIndex = 0;
    this.renderLangOptions();
  };

  /**
   * 处理语言面板搜索框键盘导航。
   */
  private readonly handleLangSearchKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.setLangPanelOpen(false);
      return;
    }

    // 键位处理表。
    const keyHandlerMap: Record<string, () => void> = {
      ArrowDown: () => this.moveLangActiveOption(1),
      ArrowUp: () => this.moveLangActiveOption(-1),
      Enter: () => this.confirmLangActiveOption()
    };
    const keyHandler = keyHandlerMap[event.key];
    if (!keyHandler) {
      return;
    }

    event.preventDefault();
    keyHandler();
  };

  /**
   * 按指定偏移循环移动语言面板键盘高亮项。
   */
  private moveLangActiveOption(offset: number): void {
    const options = this.filteredLangOptions;
    if (options.length === 0) {
      return;
    }

    this.langActiveOptionIndex = (this.langActiveOptionIndex + offset + options.length) % options.length;
    this.renderLangOptions();
    this.scrollLangActiveOptionIntoView();
  }

  /**
   * 确认当前键盘高亮语言项。
   */
  private confirmLangActiveOption(): void {
    // 当前高亮选项。
    const activeOption = this.filteredLangOptions[this.langActiveOptionIndex];
    if (!activeOption) {
      return;
    }

    this.handleLangSelect(activeOption.value);
  }

  /**
   * 选择目标语言写回代码块。
   */
  private readonly handleLangSelect = (language: string): void => {
    this.applyLanguage(language);
    this.setLangPanelOpen(false);
    this.langKeyword = '';
    this.langSearchInput.value = '';
  };

  /**
   * 切换语言面板展开态并同步界面。
   */
  private setLangPanelOpen(nextOpen: boolean): void {
    this.langPanelOpen = nextOpen;
    this.langTrigger.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    this.langPanel.style.display = nextOpen ? 'block' : 'none';
    if (nextOpen) {
      this.renderLangOptions();
      // preventScroll:聚焦搜索框时不要触发页面滚动,否则面板会随之跳位。
      this.langSearchInput.focus({ preventScroll: true });
      this.scrollLangActiveOptionIntoView();
    }
  }

  /**
   * 将当前高亮语言项滚入面板内部选项容器可视区。
   *
   * 只调整 options 容器的 scrollTop,不调用 scrollIntoView;
   * scrollIntoView 会连带滚动整个页面/编辑器,导致面板整体跳位。
   */
  private scrollLangActiveOptionIntoView(): void {
    // 当前高亮项。
    const activeOption = this.langOptionsContainer.querySelector<HTMLElement>('[data-active="true"]');
    if (!activeOption) {
      return;
    }

    const containerRect = this.langOptionsContainer.getBoundingClientRect();
    const optionRect = activeOption.getBoundingClientRect();
    const overflowTop = containerRect.top - optionRect.top;
    const overflowBottom = optionRect.bottom - containerRect.bottom;
    if (overflowTop > 0) {
      this.langOptionsContainer.scrollTop -= overflowTop;
    } else if (overflowBottom > 0) {
      this.langOptionsContainer.scrollTop += overflowBottom;
    }
  }

  /**
   * 渲染语言选项列表。
   */
  private renderLangOptions(): void {
    const options = this.filteredLangOptions;
    // 当前规范化语言值。
    const normalizedCurrentLanguage = this.langTrigger.dataset.language ?? '';
    this.langOptionsContainer.innerHTML = '';
    if (options.length === 0) {
      // 空态占位。
      const empty = document.createElement('div');
      empty.className = 'zt-md-code-block-lang-empty';
      empty.textContent = '-';
      this.langOptionsContainer.appendChild(empty);
      return;
    }

    options.forEach((option, optionIndex) => {
      // 选项按钮。
      const optionButton = document.createElement('button');
      optionButton.type = 'button';
      optionButton.className = 'zt-md-code-block-lang-option';
      optionButton.dataset.active = optionIndex === this.langActiveOptionIndex ? 'true' : 'false';
      optionButton.dataset.selected = option.value === normalizedCurrentLanguage ? 'true' : 'false';
      optionButton.addEventListener('click', () => {
        this.handleLangSelect(option.value);
      });
      // 选项文本。
      const label = document.createElement('span');
      label.textContent = option.label;
      optionButton.appendChild(label);
      // 选中勾选。
      if (option.value === normalizedCurrentLanguage) {
        const check = document.createElement('span');
        check.className = 'zt-md-code-block-lang-option-check';
        check.innerHTML = langCheckMarkup;
        optionButton.appendChild(check);
      }
      this.langOptionsContainer.appendChild(optionButton);
    });
  }

  /**
   * 写回当前代码块的语言属性。
   */
  private applyLanguage(language: string): void {
    // 当前节点位置。
    const nodePosition = resolveNodePosition(this.getPos);
    if (nodePosition === null) {
      return;
    }

    // 当前代码块节点。
    const codeBlockNode = this.view.state.doc.nodeAt(nodePosition);
    if (!codeBlockNode || codeBlockNode.type.name !== CODE_BLOCK_NODE_NAME) {
      return;
    }

    // 规范化后的目标语言值。
    const normalizedLanguage = normalizeCodeBlockLanguage(language);
    // 当前节点实际存储的语言值。
    const currentLanguage = String(codeBlockNode.attrs.language ?? '');
    if (currentLanguage === normalizedLanguage) {
      return;
    }

    // 下一版属性。
    const nextAttrs = {
      ...codeBlockNode.attrs,
      language: normalizedLanguage
    };
    const transaction = this.view.state.tr.setNodeMarkup(
      nodePosition,
      codeBlockNode.type,
      nextAttrs,
      codeBlockNode.marks
    );
    this.view.dispatch(transaction);
    // 写回后更新本节点触发钮(update 回调同步前先直接刷新)。
    this.syncLanguageAttribute(this.node);
  }

  /**
   * 更新代码块可编辑状态标记。
   */
  private updateEditableState(): void {
    this.dom.dataset.editable = isEditorViewEditable(this.view) ? 'true' : 'false';
  }

  /**
   * 同步当前语言对应的预览能力。
   */
  private syncPreviewAvailability(node: ProseNode): void {
    const language = typeof node.attrs.language === 'string' ? node.attrs.language : '';
    // 语言切换时重置手动切换标记:新语言重新按默认行为决定预览态。
    const normalizedLanguage = normalizeCodeBlockLanguage(language || '');
    if (normalizedLanguage !== this.lastPreviewLanguage) {
      this.lastPreviewLanguage = normalizedLanguage;
      this.previewToggled = false;
    }
    this.isPreviewAvailable = isCodeBlockPreviewLanguage(language, {
      mermaidEnabled: this.codeOptions.mermaidEnabled ?? true
    });
    if (!this.isPreviewAvailable) {
      this.isPreviewMode = false;
    } else if (
      // Mermaid 等动态图表:未手动切回源码且有内容时,默认直接渲染。
      !this.previewToggled &&
      isCodeBlockAutoPreviewLanguage(language, {
        mermaidEnabled: this.codeOptions.mermaidEnabled ?? true
      }) &&
      node.textContent.trim().length > 0
    ) {
      this.isPreviewMode = true;
    }

    this.previewButton.hidden = !this.isPreviewAvailable;
    this.syncPreviewState();
    this.syncActionsVisibility();
  }

  /**
   * 同步代码块预览状态与无障碍属性。
   */
  private syncPreviewState(): void {
    const shouldShowPreview = this.isPreviewAvailable && this.isPreviewMode;
    const actionLabel = shouldShowPreview
      ? this.messages.codeBlockSourceAriaLabel
      : this.messages.codeBlockPreviewAriaLabel;
    this.dom.dataset.viewMode = shouldShowPreview ? 'preview' : 'source';
    this.previewContainer.hidden = !shouldShowPreview;
    this.previewContainer.tabIndex = shouldShowPreview ? 0 : -1;
    this.previewButton.dataset.active = shouldShowPreview ? 'true' : 'false';
    this.previewButton.setAttribute('aria-pressed', shouldShowPreview ? 'true' : 'false');
    this.previewButton.setAttribute('aria-label', actionLabel);
    this.previewButton.title = actionLabel;
    this.previewButton.innerHTML = shouldShowPreview ? sourceIconMarkup : previewIconMarkup;

    if (shouldShowPreview) {
      this.contentDOM.setAttribute('aria-hidden', 'true');
      this.renderPreview();
      return;
    }

    this.contentDOM.removeAttribute('aria-hidden');
    this.clearPreview();
  }

  /**
   * 同步当前模式可见的操作按钮。
   */
  private syncActionsVisibility(): void {
    const hasVisibleAction = isEditorViewEditable(this.view) || this.isPreviewAvailable;
    this.actionsContainer.dataset.visible = hasVisibleAction ? 'true' : 'false';
  }

  /**
   * 渲染当前代码块的隔离预览文档。
   */
  private renderPreview(): void {
    const codeContent = this.node.textContent;
    const language = normalizeCodeBlockLanguage(String(this.node.attrs.language ?? ''));
    // Mermaid:异步渲染为静态 SVG(内容变化时令牌丢弃过期结果)。
    if (language === MERMAID_LANGUAGE) {
      this.renderMermaidPreview(codeContent);
      return;
    }
    const isScriptEnabled = language === HTML_CODE_BLOCK_LANGUAGE;
    const previewKey = `${language} ${codeContent}`;
    if (this.renderedPreviewKey === previewKey) {
      return;
    }

    this.renderedPreviewKey = previewKey;
    // 在首次导航前固定 sandbox 权限,避免沿用旧 about:blank 文档的限制。
    const previewFrame = document.createElement('iframe');
    previewFrame.className = 'zt-md-code-block-preview-frame';
    previewFrame.title = this.messages.codeBlockPreviewAriaLabel;
    previewFrame.tabIndex = -1;
    previewFrame.referrerPolicy = 'no-referrer';
    previewFrame.setAttribute('sandbox', isScriptEnabled ? 'allow-scripts' : '');
    previewFrame.srcdoc = createCodeBlockPreviewDocument(codeContent, isScriptEnabled);
    this.previewContainer.replaceChildren(previewFrame);
    this.previewFrame = previewFrame;
  }

  /**
   * 异步渲染 Mermaid 图表预览(失败展示错误提示,过期渲染经令牌丢弃)。
   */
  private renderMermaidPreview(codeContent: string): void {
    this.mermaidRenderToken += 1;
    const token = this.mermaidRenderToken;
    const previewKey = `${MERMAID_LANGUAGE} ${codeContent}`;
    if (this.renderedPreviewKey === previewKey && this.previewContainer.childElementCount > 0) {
      return;
    }

    this.renderedPreviewKey = previewKey;
    this.previewContainer.replaceChildren();
    void renderMermaidToSvg(codeContent, this.dom)
      .then((svg) => {
        if (token !== this.mermaidRenderToken) {
          return;
        }
        // 静态 SVG:沙箱不给脚本权限,CSP 仅放行内联样式/图片数据。
        const previewFrame = document.createElement('iframe');
        previewFrame.className = 'zt-md-code-block-preview-frame';
        previewFrame.title = this.messages.codeBlockPreviewAriaLabel;
        previewFrame.tabIndex = -1;
        previewFrame.referrerPolicy = 'no-referrer';
        previewFrame.setAttribute('sandbox', '');
        previewFrame.srcdoc = buildMermaidPreviewDocument(svg);
        if (token !== this.mermaidRenderToken) {
          return;
        }
        this.previewContainer.replaceChildren(previewFrame);
        this.previewFrame = previewFrame;
      })
      .catch((error: unknown) => {
        if (token !== this.mermaidRenderToken) {
          return;
        }
        this.previewContainer.replaceChildren(createMermaidErrorElement(error, this.messages));
      });
  }

  /**
   * 清理当前预览文档。
   */
  private clearPreview(): void {
    this.mermaidRenderToken += 1;
    this.renderedPreviewKey = null;
    this.previewFrame?.remove();
    this.previewFrame = null;
  }

  /**
   * 处理节点更新。
   */
  update(node: ProseNode): boolean {
    if (node.type.name !== CODE_BLOCK_NODE_NAME) {
      return false;
    }

    this.node = node;
    this.updateEditableState();
    this.syncLanguageAttribute(node);
    this.syncPreviewAvailability(node);
    // 行号随内容重排(帧内合并)。
    this.scheduleGutterSync();
    return true;
  }

  /**
   * 只拦截操作按钮 / 语言面板内部事件。
   */
  stopEvent(event: Event): boolean {
    // 事件目标节点。
    const target = event.target;
    if (!(target instanceof Node)) {
      return false;
    }

    return (
      this.actionsContainer.contains(target) ||
      this.previewContainer.contains(target) ||
      this.langTrigger.contains(target) ||
      this.langPanel.contains(target)
    );
  }

  /**
   * 忽略 NodeView 内部的 DOM 变更观察。
   */
  ignoreMutation(mutation: MutationRecord | { type: 'selection'; target: Node }): boolean {
    if (mutation.type === 'selection') {
      return false;
    }

    // 预览切换产生的视图属性不属于 Markdown 内容变更。
    const isPreviewViewMutation =
      mutation.type === 'attributes' &&
      ((mutation.target === this.dom && mutation.attributeName === 'data-view-mode') ||
        (mutation.target === this.contentDOM && mutation.attributeName === 'aria-hidden'));
    if (isPreviewViewMutation) {
      return true;
    }

    return Boolean(
      this.actionsContainer.contains(mutation.target) ||
        this.previewContainer.contains(mutation.target) ||
        this.langTrigger.contains(mutation.target) ||
        this.langPanel.contains(mutation.target) ||
        this.gutterEl?.contains(mutation.target)
    );
  }

  /**
   * 销毁时解绑监听器。
   */
  destroy(): void {
    this.previewButton.removeEventListener('click', this.handlePreviewClick);
    this.copyButton.removeEventListener('click', this.handleCopyClick);
    this.deleteButton.removeEventListener('click', this.handleDeleteClick);
    this.previewContainer.removeEventListener('keydown', this.handlePreviewKeyDown);
    this.langTrigger.removeEventListener('mousedown', this.handleLangPanelMouseDown);
    this.langTrigger.removeEventListener('click', this.handleLangTriggerClick);
    this.langPanel.removeEventListener('mousedown', this.handleLangPanelMouseDown);
    this.langSearchInput.removeEventListener('input', this.handleLangSearchInput);
    this.langSearchInput.removeEventListener('keydown', this.handleLangSearchKeyDown);
    document.removeEventListener('mousedown', this.handleDocumentMouseDown, true);
    if (this.copyFeedbackTimer !== null) {
      clearTimeout(this.copyFeedbackTimer);
      this.copyFeedbackTimer = null;
    }
    this.copyButton.innerHTML = copyIconMarkup;
    delete this.copyButton.dataset.copied;
    this.clearPreview();
    // 行号同步资源释放。
    this.gutterResizeObserver?.disconnect();
    this.gutterResizeObserver = null;
  }
}

/**
 * 创建 code_block 的 NodeView 构造器。
 */
export const createCodeBlockEditableNodeView = (
  messages: EditorI18nMessages = resolveEditorMessages(),
  codeOptions: CodeBlockNodeViewOptions = {}
): NodeViewConstructor => {
  return (node, view, getPos) => {
    // 将 NodeViewConstructor 的可选 getPos 统一收敛到当前实现可接受的类型范围。
    const resolvedGetPos =
      typeof getPos === 'function'
        ? () => {
            // 最新节点位置。
            const nextPosition = getPos();
            return typeof nextPosition === 'number' ? nextPosition : 0;
          }
        : false;
    return new CodeBlockEditableNodeView(node, view, resolvedGetPos, messages, codeOptions);
  };
};
