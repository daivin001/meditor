/**
 * meditor-dom.ts — meditor 实例的 DOM 骨架构建
 *
 * 纯构建:wrapper(主题/只读/块手柄等 data 属性)→ 头部插槽 → 主体
 * (工具栏宿主/搜索面板宿主/内容行(编辑区 + 大纲槽位)/AI 会话框槽位/
 * 两个 portal 容器)。不做事件绑定,元素经 MeditorDom 返回由 meditor.ts
 * 的编排层解构使用。
 */

import type { EditorI18nMessages } from './types/editor';
import type { MilkdownEditorProps } from './types/editor';

/**
 * 将占位文案转为 CSS content 可消费的字符串(1:1 对应原版 toCssContentString)。
 */
const toCssContentString = (value: string): string => {
  if (value.length === 0) {
    return '""';
  }

  // 转义后的占位文案。
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r\n|\r|\n/g, '\\A ');

  return `"${escaped}"`;
};

/** 只读状态展示文案(对齐原版 READ_ONLY_LABELS)。 */
const READ_ONLY_LABELS: Record<NonNullable<MilkdownEditorProps['locale']>, string> = {
  'zh-CN': '只读',
  'en-US': 'Read only',
};

/** DOM 骨架构建参数(meditor.ts 解析后的生效值)。 */
export interface MeditorDomParams {
  /** 挂载根节点。 */
  root: HTMLElement;
  theme: NonNullable<MilkdownEditorProps['theme']>;
  readOnly: boolean;
  locale?: MilkdownEditorProps['locale'];
  /** 块手柄生效状态(显式配置优先;未配置时简洁模式默认关闭)。 */
  blockHandleEnabled: boolean;
  className?: string;
  headerSlot: MilkdownEditorProps['headerSlot'];
  strictLineBreaks: boolean;
  headingNumbering: boolean;
  resolvedMessages: EditorI18nMessages;
  maxHeight?: MilkdownEditorProps['maxHeight'];
}

/** meditor 实例 DOM 骨架。 */
export interface MeditorDom {
  wrapper: HTMLDivElement;
  toolbarHostDiv: HTMLDivElement;
  searchPanelDiv: HTMLDivElement;
  editorArea: HTMLDivElement;
  contentRow: HTMLDivElement;
  outlinePanelDiv: HTMLDivElement;
  aiPanelDiv: HTMLDivElement;
  portalContainer: HTMLDivElement;
  contentPortalContainer: HTMLDivElement;
}

/**
 * 构建实例骨架并挂载到宿主根节点。
 */
export const buildMeditorDom = (params: MeditorDomParams): MeditorDom => {
  const {
    root,
    theme,
    readOnly,
    locale,
    blockHandleEnabled,
    className,
    headerSlot,
    strictLineBreaks,
    headingNumbering,
    resolvedMessages,
    maxHeight,
  } = params;

  const wrapper = document.createElement('div');
  wrapper.className = 'meditor-wrapper';
  // 主题类(.zt-md 提供 CSS 变量,light/dark 决定变量取值;上传弹窗宿主亦据此取色)。
  wrapper.classList.add('zt-md', theme === 'dark' ? 'zt-md-dark' : 'zt-md-light');
  // 只读徽标(CSS ::after 展示 data-readonly-label)。
  wrapper.setAttribute('data-readonly', readOnly ? 'true' : 'false');
  wrapper.setAttribute('data-readonly-label', READ_ONLY_LABELS[locale ?? 'zh-CN']);
  // 块手柄开关态:CSS 据此决定编辑区左 padding(开:留手柄列;关:与右对称)。
  wrapper.setAttribute('data-block-handle', blockHandleEnabled ? 'on' : 'off');
  // 严格换行/标题自动编号:wrapper 属性驱动 CSS(显示层开关,内容不变)。
  wrapper.setAttribute('data-strict-breaks', strictLineBreaks ? 'on' : 'off');
  wrapper.setAttribute('data-heading-numbering', headingNumbering ? 'on' : 'off');
  if (className) {
    wrapper.classList.add(...className.split(/\s+/).filter(Boolean));
  }

  const headerSlotDiv = document.createElement('div');
  headerSlotDiv.className = 'meditor-header-slot';
  // DOM 模式下 headerSlot 由调用方渲染;传入 Node 时直接挂载并应用 .zt-md-header 样式。
  if (headerSlot instanceof Node) {
    headerSlotDiv.classList.add('zt-md-header');
    headerSlotDiv.appendChild(headerSlot);
  }

  const body = document.createElement('div');
  body.className = 'meditor-body';
  // 对齐原版结构类名(zt-md-body 提供卡片主体视觉)。
  body.classList.add('zt-md-body');

  const toolbarHostDiv = document.createElement('div');
  toolbarHostDiv.className = 'meditor-toolbar-host';
  // 工具栏贴编辑器顶部(搜索面板 host 在其后:面板以它为定位基准,悬浮于工具栏下方)。
  body.appendChild(toolbarHostDiv);

  const searchPanelDiv = document.createElement('div');
  searchPanelDiv.className = 'meditor-search-panel-host';
  body.appendChild(searchPanelDiv);

  const editorArea = document.createElement('div');
  editorArea.className = 'meditor-editor-area';
  // 对齐原版结构类名:滚动容器样式(.zt-md-editor)与只读态类;占位文案经 CSS 变量注入。
  editorArea.classList.add('zt-md-editor', readOnly ? 'zt-md-readonly' : 'zt-md-editable');
  editorArea.setAttribute('aria-label', resolvedMessages.editorAriaLabel);
  editorArea.setAttribute('aria-readonly', String(readOnly));
  editorArea.style.setProperty(
    '--zt-gap-placeholder-content',
    toCssContentString(resolvedMessages.placeholder),
  );
  if (maxHeight !== undefined && maxHeight !== null) {
    // 传入 maxHeight 时限制编辑区最大高度并在内部滚动。
    editorArea.style.maxHeight = typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;
    editorArea.style.overflowY = 'auto';
  }

  // 内容行:编辑区 + 大纲面板槽位横向排列(大纲收起时槽位零占位)。
  const contentRow = document.createElement('div');
  contentRow.className = 'meditor-content-row';
  contentRow.appendChild(editorArea);

  const outlinePanelDiv = document.createElement('div');
  outlinePanelDiv.className = 'meditor-outline-host';
  contentRow.appendChild(outlinePanelDiv);

  body.appendChild(contentRow);

  // AI 会话框槽位(内容行下方;data-open 驱动展开态)。
  const aiPanelDiv = document.createElement('div');
  aiPanelDiv.className = 'meditor-ai-panel-host';
  aiPanelDiv.dataset.open = 'false';
  body.appendChild(aiPanelDiv);

  const portalContainer = document.createElement('div');
  portalContainer.className = 'meditor-portal';
  portalContainer.classList.add('zt-md-portal');
  body.appendChild(portalContainer);

  const contentPortalContainer = document.createElement('div');
  contentPortalContainer.className = 'meditor-content-portal';
  contentPortalContainer.classList.add('zt-md-content-portal');
  body.appendChild(contentPortalContainer);

  wrapper.appendChild(headerSlotDiv);
  wrapper.appendChild(body);
  root.appendChild(wrapper);

  return {
    wrapper,
    toolbarHostDiv,
    searchPanelDiv,
    editorArea,
    contentRow,
    outlinePanelDiv,
    aiPanelDiv,
    portalContainer,
    contentPortalContainer,
  };
};
