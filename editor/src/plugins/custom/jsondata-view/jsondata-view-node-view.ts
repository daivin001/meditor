/**
 * plugins/custom/jsondata-view/jsondata-view-node-view.ts — JSON 数据视图块 NodeView
 *
 * 挂载 @meditor/jsonview 的数据库视图(表格/看板/画廊/列表/日历/甘特图/文本共 7 种,
 * 节点名 jsondata-view:<kind> 即视图种类):
 * - jsonview onChange → setNodeMarkup(value) 写回节点 attr,随 listener 触发 markdown
 *   重序列化;外部变更(setMarkdown/受控回填)经 update() → setDoc 回填;
 * - 视图种类:构造时由节点名解析出初始 kind 传入视图;用户在块内切换视图下拉 →
 *   onChangeViewKind → setNodeMarkup 换节点类型(value 保留,块名随视图自动迁移);
 *   外部改块类型 → update() 检测 kind 变化 → setViewKind 回填(不触发回调,防回环);
 * - 回环防护与 mtable 同款:自身写回引发的 update 因 attr 与视图内容一致而跳过;
 * - 块内事件一律 stopEvent(输入控件/下拉/勾选/拖拽不进 ProseMirror 管线);
 * - 撤销双轨:块内编辑走 jsonview 内部撤销栈(整批粒度;Ctrl+Z/Ctrl+Shift+Z 在块内
 *   拦截分发),undo/redo 回放的事务 addToHistory(false) 不污染 PM 历史;
 *   块外文档编辑仍走 ProseMirror history。
 */
import { createJsonview, type JsonviewApi, type JsonviewChangeSource, type JsonviewViewKind } from '@meditor/jsonview';
import type { Node as ProseNode } from '@milkdown/prose/model';
import type { EditorView, NodeView, NodeViewConstructor } from '@milkdown/prose/view';
import type { EditorLocale } from '../../../types/editor';
import { moveSelectionFromSpecialBlock } from '../cursor';
import { isMac } from '../../../utils/platform';
import { JSONDATA_VIEW_NODE_PREFIX, parseJsondataViewNodeName } from './jsondata-view-plugin';
import './jsondata-view-block.css';

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
 * JSON 数据视图块 NodeView。
 */
class JsondataViewNodeView implements NodeView {
  // 当前节点快照。
  node: ProseNode;
  // 节点根容器。
  dom: HTMLDivElement;
  // 编辑器视图。
  private readonly view: EditorView;
  // 节点位置获取器。
  private readonly getPos: boolean | (() => number);
  // jsonview 渲染实例。
  private readonly jsonview: JsonviewApi;
  // 挂载宿主。
  private readonly host: HTMLDivElement;
  // 当前视图种类(由节点名解析)。
  private viewKind: JsonviewViewKind;

  /**
   * 初始化视图。
   */
  constructor(
    node: ProseNode,
    view: EditorView,
    getPos: boolean | (() => number),
    locale: EditorLocale
  ) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;
    // 当前视图种类(节点名尾缀;未知回退 table)。
    this.viewKind = parseJsondataViewNodeName(node.type.name) ?? 'table';

    // 根容器。
    this.dom = document.createElement('div');
    this.dom.dataset.type = node.type.name;
    this.dom.className = 'zt-md-jsondata-view-block';
    this.dom.dataset.editable = isEditorViewEditable(view) ? 'true' : 'false';

    // 挂载宿主。
    this.host = document.createElement('div');
    this.host.className = 'zt-md-jsondata-view-host';
    this.dom.appendChild(this.host);

    // 挂载 jsonview(初始视图种类来自节点名)。
    this.jsonview = createJsonview({
      root: this.host,
      doc: String(node.attrs.value ?? ''),
      viewKind: this.viewKind,
      readOnly: !isEditorViewEditable(view),
      locale,
      onChange: this.handleDocChange,
      onChangeViewKind: this.handleViewKindChange
    });
  }

  /**
   * jsonview 文档变更 → 写回节点 value attr(内容一致时跳过,防回环)。
   */
  private readonly handleDocChange = (json: string, source: JsonviewChangeSource): void => {
    // 当前节点位置。
    const nodePosition = resolveNodePosition(this.getPos);
    if (nodePosition === null) {
      return;
    }
    if (String(this.node.attrs.value ?? '') === json) {
      return;
    }

    // 写回事务(jsonview 内部 undo/redo 回放不进 PM 历史,避免双轨撤销互相串联)。
    const transaction = this.view.state.tr.setNodeMarkup(nodePosition, undefined, {
      ...this.node.attrs,
      value: json
    });
    if (source === 'undo' || source === 'redo') {
      // prosemirror-history 约定 metadata:"addToHistory"=false 的跳过入栈。
      transaction.setMeta('addToHistory', false);
    }
    if (transaction.docChanged) {
      this.view.dispatch(transaction);
    }
  };

  /**
   * 用户切换视图下拉 → 换节点类型(块名 jsondata-view:<kind> 随视图迁移,
   * 围栏 lang 序列化自动跟随;value 保留)。
   */
  private readonly handleViewKindChange = (kind: JsonviewViewKind): void => {
    this.viewKind = kind;
    const nodePosition = resolveNodePosition(this.getPos);
    if (nodePosition === null) {
      return;
    }
    const nextTypeName = `${JSONDATA_VIEW_NODE_PREFIX}${kind}`;
    if (this.node.type.name === nextTypeName) {
      return;
    }
    const nextType = this.view.state.schema.nodes[nextTypeName];
    if (!nextType) {
      return;
    }
    this.view.dispatch(this.view.state.tr.setNodeMarkup(nodePosition, nextType, { ...this.node.attrs }));
  };

  /**
   * 处理节点更新:外部变更(setMarkdown/受控回填)回填到视图。
   * 节点类型变化(块名迁移)时同步切换视图种类。
   */
  update(node: ProseNode): boolean {
    if (!node.type.name.startsWith(JSONDATA_VIEW_NODE_PREFIX)) {
      return false;
    }

    this.node = node;
    this.dom.dataset.type = node.type.name;
    this.dom.dataset.editable = isEditorViewEditable(this.view) ? 'true' : 'false';

    // 节点类型变化(外部改块类型/undo-redo 回放):切换视图种类(不触发 onChangeViewKind)。
    const nextKind = parseJsondataViewNodeName(node.type.name) ?? 'table';
    if (nextKind !== this.viewKind) {
      this.viewKind = nextKind;
      this.jsonview.setViewKind(nextKind);
    }

    // 当前围栏 JSON 文本。
    const json = String(node.attrs.value ?? '');
    if (json !== this.jsonview.getDoc()) {
      this.jsonview.setDoc(json);
    }
    return true;
  }

  /**
   * 判断块内焦点是否处于指定方向的内容边界:
   * 上 = 焦点在首个可聚焦控件;下 = 焦点在末个可聚焦控件。
   * 多行文本域(文本视图的 JSON 编辑器)额外要求光标在值的首/末端点,避免编辑中途被劫持。
   */
  private isFocusAtBlockBoundary(key: 'ArrowUp' | 'ArrowDown'): boolean {
    // 当前焦点元素(必须仍在块内)。
    const activeElement = this.dom.ownerDocument.activeElement;
    if (!(activeElement instanceof HTMLElement) || !this.dom.contains(activeElement)) {
      return false;
    }

    // 块内全部可聚焦控件(按文档序)。
    const focusables = this.dom.querySelectorAll<HTMLElement>(
      "button, input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    const index = Array.prototype.indexOf.call(focusables, activeElement);
    if (index < 0) {
      return false;
    }
    if (key === 'ArrowUp' ? index !== 0 : index !== focusables.length - 1) {
      return false;
    }

    if (activeElement instanceof HTMLTextAreaElement) {
      const atStart = activeElement.selectionStart === 0 && activeElement.selectionEnd === 0;
      const atEnd =
        activeElement.selectionStart === activeElement.value.length &&
        activeElement.selectionEnd === activeElement.value.length;
      return key === 'ArrowUp' ? atStart : atEnd;
    }
    return true;
  }

  /**
   * 块内事件全部就地消费(输入控件/下拉/勾选不进 PM 管线);
   * Ctrl+Z / Ctrl+Shift+Z(或 Ctrl+Y)拦截分发给 jsonview 内部撤销栈;
   * ArrowUp/ArrowDown 在内容边界时移出块外(对齐 math_block 逃生做法)。
   */
  stopEvent(event: Event): boolean {
    // 事件目标节点。
    const target = event.target;
    if (!(target instanceof Node)) {
      return false;
    }
    if (!this.dom.contains(target)) {
      return false;
    }

    if (event.type === 'keydown' && isEditorViewEditable(this.view)) {
      const keyEvent = event as KeyboardEvent;
      // 平台判定统一走 utils/platform(navigator.platform 已废弃,此处不再手写)。
      const onMac = isMac();
      const mod = onMac ? keyEvent.metaKey : keyEvent.ctrlKey;
      if (mod && !keyEvent.altKey) {
        const key = keyEvent.key.toLowerCase();
        const isUndo = key === 'z' && !keyEvent.shiftKey;
        const isRedo = (key === 'z' && keyEvent.shiftKey) || (!onMac && key === 'y');
        if (isUndo && this.jsonview.canUndo()) {
          keyEvent.preventDefault();
          keyEvent.stopPropagation();
          this.jsonview.undo();
          return true;
        }
        if (isRedo && this.jsonview.canRedo()) {
          keyEvent.preventDefault();
          keyEvent.stopPropagation();
          this.jsonview.redo();
          return true;
        }
        // 内部栈空时放行,回落 ProseMirror history(块外编辑仍可撤销)。
      }

      // 方向键边界逃生:焦点在块内首/末可聚焦控件时按 ArrowUp/ArrowDown 移出块外
      // (上方/下方无相邻块时由边界导航自动补空段落),对齐 math_block 逃生做法。
      if (
        (keyEvent.key === 'ArrowDown' || keyEvent.key === 'ArrowUp') &&
        !mod &&
        !keyEvent.altKey &&
        this.isFocusAtBlockBoundary(keyEvent.key)
      ) {
        const nodePosition = resolveNodePosition(this.getPos);
        if (
          nodePosition !== null &&
          moveSelectionFromSpecialBlock(this.view, nodePosition, this.node, keyEvent.key)
        ) {
          keyEvent.preventDefault();
          keyEvent.stopPropagation();
          return true;
        }
      }
    }

    return true;
  }

  /**
   * 忽略 NodeView 内部的 DOM 变更观察(DOM 视图自身管理)。
   */
  ignoreMutation(): boolean {
    return true;
  }

  /**
   * 销毁 jsonview 实例。
   */
  destroy(): void {
    this.jsonview.destroy();
  }
}

/**
 * 创建 jsondata-view 的 NodeView 构造器(7 种节点名共用同一构造器,
 * 视图种类由节点名解析)。
 */
export const createJsondataViewNodeView = (locale: EditorLocale = 'zh-CN'): NodeViewConstructor => {
  return (node, view, getPos) => {
    // 将 NodeViewConstructor 的可选 getPos 统一收敛到当前实现可接受的类型范围。
    const resolvedGetPos =
      typeof getPos === 'function'
        ? () => {
            const nextPosition = getPos();
            return typeof nextPosition === 'number' ? nextPosition : 0;
          }
        : false;
    return new JsondataViewNodeView(node, view, resolvedGetPos, locale);
  };
};
