/**
 * plugins/custom/layout-block/layout-block-node-view.ts — 显示控制布局块 NodeView
 *
 * 两种视图按「kind × 编辑模式」互斥切换(dom data-view 属性驱动 CSS):
 * - 源码面板(view=source):头部(info string 徽标 + 行数 + 删除按钮)+ monospace
 *   textarea,输入防抖后 setNodeMarkup(value) 写回节点 attr;布局模式(on)下
 *   所有布局块显示源码面板;
 * - 渲染卡(view=render):meditor-layout:html / :js 块,正常模式下渲染为
 *   沙箱 iframe 展示卡——脚手架包装(srcdoc),sandbox 全禁(html,脚本必然
 *   不执行)或仅 allow-scripts(js,脚手架引导执行;Tauri csp:null 下
 *   iframe sandbox 是唯一防线);刻意不含 allow-same-origin(不透明 origin),
 *   高度一律经 postMessage 桥由脚手架引导回报,自适应上限 720px。
 *   无后缀指令块等其他 kind 在正常模式维持完全隐藏。
 * 外部变更(setMarkdown/受控回填/自身回写)经 update() 回填,与自身写回等值时
 * 无操作,避免光标跳动;编辑器只读时 textarea 只读、删除按钮禁用。
 */
import type { Node as ProseNode } from '@milkdown/prose/model';
import type { EditorView, NodeView, NodeViewConstructor } from '@milkdown/prose/view';
import type { EditorI18nMessages } from '../../../types/editor';
import { createSharedIcon } from '../../../icons';
import {
  isHtmlLayoutFenceLang,
  isScriptLayoutFenceLang,
} from '../../../utils/layout-directive';
import {
  buildHtmlScaffold,
  buildJsScaffold,
  MEDITOR_LAYOUT_MESSAGE_FLAG,
  type MeditorLayoutResizeMessage,
} from './layout-block-scaffold';
import { MEDITOR_LAYOUT_NODE_NAME } from './layout-block-plugin';

/**
 * textarea 输入防抖间隔(毫秒):连续击键合并为一次 attr 写回。
 */
const VALUE_WRITEBACK_DEBOUNCE_MS = 300;

/**
 * 渲染卡 iframe 高度上限(px):超出后内部滚动。
 */
const RENDER_MAX_HEIGHT_PX = 720;

/**
 * 渲染卡 iframe 高度下限(px):空内容时的最小可点区域。
 */
const RENDER_MIN_HEIGHT_PX = 64;

/**
 * 渲染卡构造选项。
 */
export interface MeditorLayoutNodeViewOptions {
  /** 是否允许 meditor-layout:js 沙箱执行(默认 true;宿主可关闭)。 */
  scriptEnabled?: boolean;
}

/**
 * 解析 NodeView 的节点位置(非函数 getPos 收敛为 null)。
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
 * 显示控制布局块 NodeView。
 */
class MeditorLayoutNodeView implements NodeView {
  // 当前节点快照。
  node: ProseNode;
  // 节点根容器。
  dom: HTMLDivElement;
  // 编辑器视图。
  private readonly view: EditorView;
  // 节点位置获取器。
  private readonly getPos: boolean | (() => number);
  // 编辑器文案。
  private readonly messages: EditorI18nMessages;
  // 是否允许 :js 沙箱执行(宿主可关闭;关闭后 js 块与普通隐藏块同待遇)。
  private readonly scriptEnabled: boolean;
  // 源码面板(头部 + 编辑区;布局模式显示)。
  private readonly panel: HTMLDivElement;
  // info string 徽标(lang + meta)。
  private readonly langBadge: HTMLElement;
  // 内容行数徽标。
  private readonly lineCountBadge: HTMLElement;
  // 删除按钮。
  private readonly deleteButton: HTMLButtonElement;
  // 源码编辑区。
  private readonly editor: HTMLTextAreaElement;
  // 渲染卡宿主(html kind 且正常模式显示)。
  private readonly renderHost: HTMLDivElement | null;
  // 沙箱展示 iframe。
  private readonly iframe: HTMLIFrameElement | null;
  // 布局模式切换观察器:块在隐藏态挂载时尺寸不可量,模式切换/展开后需重新
  // 自适应与切换视图。
  private readonly modeObserver: MutationObserver | null = null;
  // 输入防抖定时器(销毁时清理)。
  private writebackTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 初始化布局块视图(源码面板 + 渲染卡宿主)。
   */
  constructor(
    node: ProseNode,
    view: EditorView,
    getPos: boolean | (() => number),
    messages: EditorI18nMessages,
    options: MeditorLayoutNodeViewOptions = {}
  ) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;
    this.messages = messages;
    this.scriptEnabled = options.scriptEnabled ?? true;

    // 根容器。
    this.dom = document.createElement('div');
    this.dom.dataset.type = MEDITOR_LAYOUT_NODE_NAME;
    this.dom.className = 'zt-md-layout-block';

    // 源码面板:头部 + 编辑区(布局模式显示)。
    this.panel = document.createElement('div');
    this.panel.className = 'zt-md-layout-block-panel';

    // 头部:info string 徽标 + 行数 + 删除按钮。
    const header = document.createElement('div');
    header.className = 'zt-md-layout-block-header';

    this.langBadge = document.createElement('span');
    this.langBadge.className = 'zt-md-layout-block-lang';
    header.appendChild(this.langBadge);

    this.lineCountBadge = document.createElement('span');
    this.lineCountBadge.className = 'zt-md-layout-block-lines';
    header.appendChild(this.lineCountBadge);

    const spacer = document.createElement('span');
    spacer.className = 'zt-md-layout-block-spacer';
    header.appendChild(spacer);

    this.deleteButton = document.createElement('button');
    this.deleteButton.type = 'button';
    this.deleteButton.className = 'zt-md-layout-block-delete';
    this.deleteButton.appendChild(
      createSharedIcon('trash', { size: 14, strokeWidth: 2, className: 'zt-md-layout-block-delete-icon' })
    );
    this.deleteButton.title = messages.layoutBlockDeleteAriaLabel;
    this.deleteButton.setAttribute('aria-label', messages.layoutBlockDeleteAriaLabel);
    this.deleteButton.addEventListener('click', this.handleDeleteClick);
    header.appendChild(this.deleteButton);

    this.panel.appendChild(header);

    // 源码编辑区。
    this.editor = document.createElement('textarea');
    this.editor.className = 'zt-md-layout-block-editor';
    this.editor.spellcheck = false;
    this.editor.setAttribute('aria-label', messages.layoutBlockEditorAriaLabel);
    this.editor.addEventListener('input', this.handleEditorInput);
    this.editor.addEventListener('keydown', this.handleEditorKeyDown);
    this.panel.appendChild(this.editor);

    this.dom.appendChild(this.panel);

    // 渲染卡宿主 + 沙箱 iframe(html/js kind 有意义;其余 kind 保持空宿主隐藏)。
    this.renderHost = document.createElement('div');
    this.renderHost.className = 'zt-md-layout-block-render';
    this.iframe = document.createElement('iframe');
    // sandbox 恒为全禁(无脚本、无同源):html kind 内容原样展示,js kind 由
    // 脚手架引导脚本执行(allow-scripts 由 syncRenderView 按 kind 配置)。
    // 刻意不含 allow-same-origin(不透明 origin,无父文档/存储/Cookie 访问权,
    // 高度一律经 postMessage 桥回报)与 allow-forms/allow-popups/
    // allow-top-navigation。
    this.iframe.setAttribute('sandbox', '');
    this.iframe.setAttribute('loading', 'lazy');
    this.iframe.title = messages.layoutBlockRenderTitle;
    this.renderHost.appendChild(this.iframe);
    this.dom.appendChild(this.renderHost);

    // js 沙箱的 resize 消息桥(按 event.source 校验来源,见 handleRenderMessage)。
    window.addEventListener('message', this.handleRenderMessage);

    this.syncEditableState();
    this.renderContent();
    this.syncRenderView();

    // 观察布局模式开关:隐藏态挂载时尺寸不可量,展开/切换瞬间重算视图与高度
    // (源码面板 scrollHeight 与渲染卡 iframe 高度都需要重算)。
    const themeRoot = view.dom.closest('.zt-md');
    if (themeRoot) {
      this.modeObserver = new MutationObserver(() => {
        this.syncRenderView();
        this.syncEditorHeight();
      });
      this.modeObserver.observe(themeRoot, { attributes: true, attributeFilter: ['data-layout-mode'] });
    }
  }

  /**
   * 判断布局模式是否生效。
   */
  private isLayoutModeOn(): boolean {
    const themeRoot = this.view.dom.closest('.zt-md');
    return themeRoot?.getAttribute('data-layout-mode') === 'on';
  }

  /**
   * 同步可编辑状态标记(textarea 只读态与删除按钮禁用态随动)。
   */
  private syncEditableState(): void {
    const editable = isEditorViewEditable(this.view);
    this.dom.dataset.editable = editable ? 'true' : 'false';
    this.editor.readOnly = !editable;
    this.deleteButton.disabled = !editable;
  }

  /**
   * 渲染内容:徽标文案、textarea 值、行数与渲染卡视图。
   */
  private renderContent(): void {
    // 原始 info string(lang + 可选 meta)。
    const lang = String(this.node.attrs.lang ?? 'meditor-layout');
    const meta = this.node.attrs.meta;
    this.langBadge.textContent = typeof meta === 'string' && meta.length > 0 ? `${lang} ${meta}` : lang;

    // 围栏内容(CRLF 规范为 LF,与写回规则一致)。
    const value = String(this.node.attrs.value ?? '').replace(/\r\n/g, '\n');
    if (this.editor.value !== value) {
      this.editor.value = value;
    }
    this.syncLineCount(value);
    this.syncEditorHeight();
    this.syncRenderView();
  }

  /**
   * 同步行数徽标。
   */
  private syncLineCount(value: string): void {
    const lineCount = value.length === 0 ? 0 : value.split('\n').length;
    this.lineCountBadge.textContent = `${lineCount} ${this.messages.layoutBlockLinesLabel}`;
  }

  /**
   * 编辑区自适应内容高度。
   */
  private syncEditorHeight(): void {
    this.editor.style.height = 'auto';
    this.editor.style.height = `${this.editor.scrollHeight}px`;
  }

  /**
   * 同步视图分支:html kind → 全禁沙箱展示卡(脚手架包装,内容原样内联,
   * postMessage 量高);js kind(且允许执行)→ 执行沙箱(脚手架包装,
   * allow-scripts,postMessage 量高);其余(布局模式 / 指令块 / 其他
   * kind / 禁用执行)→ 源码面板或保持隐藏。
   */
  private syncRenderView(): void {
    const lang = String(this.node.attrs.lang ?? '');
    const isHtml = isHtmlLayoutFenceLang(lang);
    const isJs = this.scriptEnabled && isScriptLayoutFenceLang(lang);
    const value = String(this.node.attrs.value ?? '');
    if ((isHtml || isJs) && !this.isLayoutModeOn()) {
      const frame = this.iframe;
      if (frame) {
        // 全禁沙箱里引导脚本无法执行,只有 js kind 需要 allow-scripts。
        const sandbox = isJs ? 'allow-scripts' : '';
        const scaffoldDoc = isHtml ? buildHtmlScaffold(value) : buildJsScaffold(value);
        // sandbox/srcdoc 变化才重设:任一属性变更都会触发整帧重载。
        if (frame.getAttribute('sandbox') !== sandbox) {
          frame.setAttribute('sandbox', sandbox);
        }
        if (frame.getAttribute('srcdoc') !== scaffoldDoc) {
          frame.setAttribute('srcdoc', scaffoldDoc);
        }
      }
      this.dom.dataset.view = 'render';
      return;
    }
    delete this.dom.dataset.view;
  }

  /**
   * 沙箱的 resize 消息桥:仅接受本 iframe contentWindow 发出的、带约定标记
   * 的 resize 消息,高度夹取到 [MIN, MAX](不透明 origin 下无法量高,高度完全
   * 由沙箱内脚手架引导上报;html kind 由脚手架引导脚本回报,js kind 的用户
   * 脚本可经 meditorLayout.resize 助手覆写)。
   */
  private readonly handleRenderMessage = (event: MessageEvent): void => {
    const frame = this.iframe;
    if (!frame || event.source !== frame.contentWindow) {
      return;
    }
    const data = event.data as Partial<MeditorLayoutResizeMessage> | null | undefined;
    if (!data || data[MEDITOR_LAYOUT_MESSAGE_FLAG] !== true || data.type !== 'resize') {
      return;
    }
    const height = Number(data.height);
    if (!Number.isFinite(height)) {
      return;
    }
    frame.style.height = `${Math.min(Math.max(height, RENDER_MIN_HEIGHT_PX), RENDER_MAX_HEIGHT_PX)}px`;
  };

  /**
   * 删除按钮:整块删除(布局模式下删除保护放行;正常模式按钮不可见,
   * html 渲染卡不含按钮,删除走布局模式源码面板)。
   */
  private readonly handleDeleteClick = (): void => {
    const nodePosition = resolveNodePosition(this.getPos);
    if (nodePosition === null) {
      return;
    }
    const transaction = this.view.state.tr.delete(nodePosition, nodePosition + this.node.nodeSize);
    this.view.dispatch(transaction);
    this.view.focus();
  };

  /**
   * textarea 输入 → 防抖写回节点 value attr。
   * (CRLF 规范为 LF:markdown 围栏内容用 LF 存储,避免行尾噪声。)
   */
  private readonly handleEditorInput = (): void => {
    this.syncLineCount(this.editor.value);
    this.syncEditorHeight();
    if (this.writebackTimer !== null) {
      clearTimeout(this.writebackTimer);
    }
    this.writebackTimer = setTimeout(this.flushWriteback, VALUE_WRITEBACK_DEBOUNCE_MS);
  };

  /**
   * 写回当前 textarea 内容到节点 value attr(等值时跳过,避免无谓历史步)。
   */
  private readonly flushWriteback = (): void => {
    this.writebackTimer = null;
    const nodePosition = resolveNodePosition(this.getPos);
    if (nodePosition === null) {
      return;
    }
    const value = this.editor.value.replace(/\r\n/g, '\n');
    if (String(this.node.attrs.value ?? '') === value) {
      return;
    }
    const transaction = this.view.state.tr.setNodeMarkup(nodePosition, undefined, {
      ...this.node.attrs,
      value
    });
    if (transaction.docChanged) {
      this.view.dispatch(transaction);
    }
  };

  /**
   * textarea 内 Escape 交还编辑器焦点(布局模式下面板是独立编辑域)。
   */
  private readonly handleEditorKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.view.focus();
    }
  };

  /**
   * 处理节点更新:外部变更(setMarkdown/受控回填)回填 textarea 与渲染卡。
   */
  update(node: ProseNode): boolean {
    if (node.type.name !== MEDITOR_LAYOUT_NODE_NAME) {
      return false;
    }

    this.node = node;
    this.syncEditableState();
    this.renderContent();
    return true;
  }

  /**
   * 节点被选中时高亮边框。
   */
  selectNode(): void {
    this.dom.dataset.selected = 'true';
  }

  /**
   * 节点取消选中时移除高亮。
   */
  deselectNode(): void {
    delete this.dom.dataset.selected;
  }

  /**
   * 面板/渲染卡内部事件全部就地消费(键鼠/剪贴板),不进 ProseMirror 事件管线。
   */
  stopEvent(event: Event): boolean {
    const target = event.target;
    if (!(target instanceof Node)) {
      return false;
    }

    return this.dom.contains(target);
  }

  /**
   * 忽略 NodeView 内部的 DOM 变更观察(textarea/iframe 不产生可观察文本变更)。
   */
  ignoreMutation(): boolean {
    return true;
  }

  /**
   * 销毁:清理防抖定时器、模式观察器与各监听。
   */
  destroy(): void {
    if (this.writebackTimer !== null) {
      clearTimeout(this.writebackTimer);
      this.writebackTimer = null;
    }
    this.modeObserver?.disconnect();
    window.removeEventListener('message', this.handleRenderMessage);
    this.deleteButton.removeEventListener('click', this.handleDeleteClick);
    this.editor.removeEventListener('input', this.handleEditorInput);
    this.editor.removeEventListener('keydown', this.handleEditorKeyDown);
  }
}

/**
 * 创建布局块的 NodeView 构造器。
 */
export const createMeditorLayoutNodeView = (
  messages: EditorI18nMessages,
  options: MeditorLayoutNodeViewOptions = {}
): NodeViewConstructor => {
  return (node, view, getPos) => {
    // 将 NodeViewConstructor 的可选 getPos 统一收敛到当前实现可接受的类型范围。
    const resolvedGetPos =
      typeof getPos === 'function'
        ? () => {
            const nextPosition = getPos();
            return typeof nextPosition === 'number' ? nextPosition : 0;
          }
        : false;
    return new MeditorLayoutNodeView(node, view, resolvedGetPos, messages, options);
  };
};
