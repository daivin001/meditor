/**
 * plugins/custom/callout/callout-node-view.ts — 标注块 NodeView
 *
 * - 头部行:kind 图标按钮(点击循环五种类型)+ 可选自定义标题(仅展示,编辑走 MD 源);
 * - 内容区 contentDOM 交给 ProseMirror 渲染块孩子;
 * - kind 循环经 setNodeMarkup 写回 attr,折叠状态不引入(标注块不折叠)。
 */
import type { Node as ProseNode } from '@milkdown/prose/model';
import type { EditorView, NodeView, NodeViewConstructor, ViewMutationRecord } from '@milkdown/prose/view';
import { CALLOUT_KINDS, CALLOUT_NODE_NAME, isCalloutKind, type CalloutKind } from './callout-plugin';
import type { EditorI18nMessages } from '../../../types/editor';

/**
 * 构建内联 SVG 图标 markup(lucide 风格线条)。
 */
const buildIconMarkup = (paths: string): string => {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
  );
};

/**
 * 各 kind 图标(lucide 线条风)。
 */
const KIND_ICON_MARKUPS: Record<CalloutKind, string> = {
  // info 圆圈。
  note: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  // 灯泡。
  tip: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/>',
  // 对话气泡。
  important:
    '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  // 三角警示。
  warning:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
  // 八角警示。
  caution: '<rect width="16" height="16" x="4" y="4" rx="2"/><path d="M12 16v-4M12 8h.01"/>'
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
 * 解析 NodeView 的节点位置。
 */
const resolveNodePosition = (getPos: boolean | (() => number)): number | null => {
  if (typeof getPos !== 'function') {
    return null;
  }

  return getPos();
};

/**
 * 标注块 NodeView。
 */
class CalloutNodeView implements NodeView {
  // 当前节点快照。
  node: ProseNode;
  // 节点根容器。
  dom: HTMLDivElement;
  // 内容区(ProseMirror 块孩子渲染宿主)。
  contentDOM: HTMLDivElement;
  // 编辑器视图。
  private readonly view: EditorView;
  // 节点位置获取器。
  private readonly getPos: boolean | (() => number);
  // 头部行(kind 按钮 + 标题)。
  private readonly headerElement: HTMLDivElement;
  // kind 循环按钮。
  private readonly kindButton: HTMLButtonElement;
  // 自定义标题展示元素。
  private readonly titleElement: HTMLSpanElement;
  // kind 按钮提示文案表(按当前 attrs 取)。
  private readonly kindLabels: Record<CalloutKind, string>;
  // 按钮无障碍文案模板。
  private readonly kindButtonAriaTemplate: string;

  /**
   * 初始化标注块视图。
   */
  constructor(
    node: ProseNode,
    view: EditorView,
    getPos: boolean | (() => number),
    messages: EditorI18nMessages
  ) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;
    this.kindLabels = {
      note: messages.calloutKindNote,
      tip: messages.calloutKindTip,
      important: messages.calloutKindImportant,
      warning: messages.calloutKindWarning,
      caution: messages.calloutKindCaution
    };
    this.kindButtonAriaTemplate = messages.calloutKindButtonAriaLabel;

    // 根容器。
    this.dom = document.createElement('div');
    this.dom.dataset.type = CALLOUT_NODE_NAME;
    this.dom.className = 'zt-md-callout';

    // 头部行(kind 按钮 + 标题)。
    this.headerElement = document.createElement('div');
    this.headerElement.className = 'zt-md-callout-header';
    this.headerElement.contentEditable = 'false';

    this.kindButton = document.createElement('button');
    this.kindButton.type = 'button';
    this.kindButton.className = 'zt-md-callout-kind';
    this.kindButton.addEventListener('click', this.handleKindClick);

    this.titleElement = document.createElement('span');
    this.titleElement.className = 'zt-md-callout-title';

    this.headerElement.append(this.kindButton, this.titleElement);

    // 内容区。
    this.contentDOM = document.createElement('div');
    this.contentDOM.className = 'zt-md-callout-content';

    this.dom.append(this.headerElement, this.contentDOM);
    this.syncFromNode(node);
  }

  /**
   * 响应 kind 按钮点击:循环切换标注类型。
   */
  private readonly handleKindClick = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();

    if (!isEditorViewEditable(this.view)) {
      return;
    }

    // 当前节点位置。
    const nodePosition = resolveNodePosition(this.getPos);
    if (nodePosition === null) {
      return;
    }

    // 当前 kind 与下一个 kind。
    const currentKind = isCalloutKind(this.node.attrs.kind) ? this.node.attrs.kind : 'note';
    const currentIndex = CALLOUT_KINDS.indexOf(currentKind);
    const nextKind = CALLOUT_KINDS[(currentIndex + 1) % CALLOUT_KINDS.length];

    // kind 更新事务。
    const transaction = this.view.state.tr.setNodeMarkup(nodePosition, undefined, {
      ...this.node.attrs,
      kind: nextKind
    });
    this.view.dispatch(transaction);
  };

  /**
   * 从节点快照同步视图。
   */
  private syncFromNode(node: ProseNode): void {
    // 当前 kind。
    const kind = isCalloutKind(node.attrs.kind) ? node.attrs.kind : 'note';
    // 自定义标题。
    const title = typeof node.attrs.title === 'string' ? node.attrs.title.trim() : '';

    this.dom.dataset.kind = kind;
    this.dom.dataset.editable = isEditorViewEditable(this.view) ? 'true' : 'false';
    this.kindButton.innerHTML = buildIconMarkup(KIND_ICON_MARKUPS[kind]);
    this.kindButton.title = this.kindLabels[kind];
    this.kindButton.setAttribute('aria-label', `${this.kindButtonAriaTemplate}(${this.kindLabels[kind]})`);
    this.titleElement.textContent = title;
    this.titleElement.style.display = title ? '' : 'none';
  }

  /**
   * 处理节点更新。
   */
  update(node: ProseNode): boolean {
    if (node.type.name !== CALLOUT_NODE_NAME) {
      return false;
    }

    this.node = node;
    this.syncFromNode(node);
    return true;
  }

  /**
   * 只拦截 kind 按钮事件(头部其余为静态展示)。
   */
  stopEvent(event: Event): boolean {
    // 事件目标节点。
    const target = event.target;
    if (!(target instanceof Node)) {
      return false;
    }

    return this.kindButton.contains(target);
  }

  /**
   * 内容区变更交给 ProseMirror 观察,头部自身变更忽略。
   */
  ignoreMutation(mutation: ViewMutationRecord): boolean {
    // 变更目标节点。
    const target = mutation.target;
    return !(this.contentDOM.contains(target) || this.contentDOM === target);
  }

  /**
   * 销毁时解绑监听器。
   */
  destroy(): void {
    this.kindButton.removeEventListener('click', this.handleKindClick);
  }
}

/**
 * 创建 callout 的 NodeView 构造器。
 */
export const createCalloutNodeView = (messages: EditorI18nMessages): NodeViewConstructor => {
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
    return new CalloutNodeView(node, view, resolvedGetPos, messages);
  };
};
