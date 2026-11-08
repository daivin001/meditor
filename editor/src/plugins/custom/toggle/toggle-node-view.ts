/**
 * plugins/custom/toggle/toggle-node-view.ts — 折叠块 NodeView
 *
 * - 头部行:折叠箭头按钮(纯运行时状态,不持久化)+ 标题行内编辑(业务数据,
 *   防抖提交到节点 summary attr);
 * - 内容区 contentDOM 交给 ProseMirror 渲染;折叠态经容器 data-open 隐藏内容;
 * - 只读态标题不可编辑,折叠箭头仍可用(查看功能)。
 */
import type { Node as ProseNode } from '@milkdown/prose/model';
import type { EditorView, NodeView, NodeViewConstructor, ViewMutationRecord } from '@milkdown/prose/view';
import { TOGGLE_NODE_NAME } from './toggle-plugin';
import type { EditorI18nMessages } from '../../../types/editor';

/**
 * 标题提交防抖时长。
 */
const TOGGLE_SUMMARY_COMMIT_DEBOUNCE = 400;

/**
 * 构建内联 SVG 图标 markup(lucide 风格线条,chevron-right)。
 */
const CHEVRON_MARKUP =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"' +
  ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"' +
  ' stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

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
 * 折叠块 NodeView。
 */
class ToggleNodeView implements NodeView {
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
  // 头部行(折叠按钮 + 标题编辑)。
  private readonly headerElement: HTMLDivElement;
  // 折叠切换按钮。
  private readonly foldButton: HTMLButtonElement;
  // 标题编辑元素。
  private readonly summaryElement: HTMLDivElement;
  // 标题提交防抖定时器。
  private summaryCommitTimer: number | null = null;

  /**
   * 初始化折叠块视图。
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

    // 根容器(默认展开;折叠是运行时状态,不落 MD)。
    this.dom = document.createElement('div');
    this.dom.dataset.type = TOGGLE_NODE_NAME;
    this.dom.dataset.open = 'true';
    this.dom.className = 'zt-md-toggle';

    // 头部行。
    this.headerElement = document.createElement('div');
    this.headerElement.className = 'zt-md-toggle-header';
    this.headerElement.contentEditable = 'false';

    this.foldButton = document.createElement('button');
    this.foldButton.type = 'button';
    this.foldButton.className = 'zt-md-toggle-fold';
    this.foldButton.innerHTML = CHEVRON_MARKUP;
    this.foldButton.addEventListener('click', this.handleFoldClick);

    this.summaryElement = document.createElement('div');
    this.summaryElement.className = 'zt-md-toggle-summary';
    this.summaryElement.dataset.placeholder = messages.toggleSummaryPlaceholder;
    this.summaryElement.setAttribute('aria-label', messages.toggleSummaryAriaLabel);
    this.summaryElement.contentEditable = 'true';
    this.summaryElement.addEventListener('input', this.handleSummaryInput);
    this.summaryElement.addEventListener('blur', this.handleSummaryBlur);
    this.summaryElement.addEventListener('keydown', this.handleSummaryKeyDown);

    this.headerElement.append(this.foldButton, this.summaryElement);

    // 内容区。
    this.contentDOM = document.createElement('div');
    this.contentDOM.className = 'zt-md-toggle-content';

    this.dom.append(this.headerElement, this.contentDOM);
    this.syncFromNode(node);
  }

  /**
   * 响应折叠按钮点击:切换运行时展开状态(不产生事务)。
   */
  private readonly handleFoldClick = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();

    // 切换展开态标记。
    this.dom.dataset.open = this.dom.dataset.open === 'true' ? 'false' : 'true';
  };

  /**
   * 响应标题输入:防抖后写回节点 summary 属性。
   */
  private readonly handleSummaryInput = (): void => {
    if (this.summaryCommitTimer !== null) {
      window.clearTimeout(this.summaryCommitTimer);
    }
    this.summaryCommitTimer = window.setTimeout(() => {
      this.summaryCommitTimer = null;
      this.commitSummary();
    }, TOGGLE_SUMMARY_COMMIT_DEBOUNCE);
  };

  /**
   * 响应标题失焦:立即提交。
   */
  private readonly handleSummaryBlur = (): void => {
    this.clearSummaryCommitTimer();
    this.commitSummary();
  };

  /**
   * 响应标题内按键:Enter/Escape 提交并退出(标题保持单行)。
   */
  private readonly handleSummaryKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.summaryElement.blur();
  };

  /**
   * 清理标题提交防抖定时器。
   */
  private clearSummaryCommitTimer(): void {
    if (this.summaryCommitTimer === null) {
      return;
    }

    window.clearTimeout(this.summaryCommitTimer);
    this.summaryCommitTimer = null;
  }

  /**
   * 把标题文本提交到节点 summary 属性(文本未变化时不产生事务)。
   */
  private commitSummary(): void {
    if (!isEditorViewEditable(this.view)) {
      return;
    }

    // 当前节点位置。
    const nodePosition = resolveNodePosition(this.getPos);
    if (nodePosition === null) {
      return;
    }

    // 最新标题文本(去除首尾空白)。
    const nextSummary = this.summaryElement.textContent?.trim() ?? '';
    // 当前节点标题。
    const currentSummary = typeof this.node.attrs.summary === 'string' ? this.node.attrs.summary : '';
    if (nextSummary === currentSummary) {
      return;
    }

    // 标题更新事务。
    const transaction = this.view.state.tr.setNodeMarkup(nodePosition, undefined, {
      ...this.node.attrs,
      summary: nextSummary
    });
    this.view.dispatch(transaction);
  }

  /**
   * 从节点快照同步视图。
   */
  private syncFromNode(node: ProseNode): void {
    // 最新标题。
    const summary = typeof node.attrs.summary === 'string' ? node.attrs.summary : '';
    const isEditable = isEditorViewEditable(this.view);

    this.dom.dataset.editable = isEditable ? 'true' : 'false';
    this.summaryElement.contentEditable = isEditable ? 'true' : 'false';

    // 用户输入中跳过标题回填(避免光标被打断;失焦提交后经 update 回填)。
    if (document.activeElement !== this.summaryElement && (this.summaryElement.textContent ?? '') !== summary) {
      this.summaryElement.textContent = summary;
    }
  }

  /**
   * 处理节点更新。
   */
  update(node: ProseNode): boolean {
    if (node.type.name !== TOGGLE_NODE_NAME) {
      return false;
    }

    this.node = node;
    this.syncFromNode(node);
    return true;
  }

  /**
   * 只拦截头部行事件(标题编辑与折叠按钮由 NodeView 自理)。
   */
  stopEvent(event: Event): boolean {
    // 事件目标节点。
    const target = event.target;
    if (!(target instanceof Node)) {
      return false;
    }

    return this.headerElement.contains(target);
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
    this.clearSummaryCommitTimer();
    this.foldButton.removeEventListener('click', this.handleFoldClick);
    this.summaryElement.removeEventListener('input', this.handleSummaryInput);
    this.summaryElement.removeEventListener('blur', this.handleSummaryBlur);
    this.summaryElement.removeEventListener('keydown', this.handleSummaryKeyDown);
  }
}

/**
 * 创建 toggle 的 NodeView 构造器。
 */
export const createToggleNodeView = (messages: EditorI18nMessages): NodeViewConstructor => {
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
    return new ToggleNodeView(node, view, resolvedGetPos, messages);
  };
};
