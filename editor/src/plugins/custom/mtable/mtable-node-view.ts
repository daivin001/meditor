/**
 * plugins/custom/mtable/mtable-node-view.ts — CSV 数据块(csvdata)NodeView
 *
 * 挂载 @meditor/mtable 的 Canvas 表格编辑器:
 * - 表格编辑完全在 mtable 内部闭环(canvas 键鼠/剪贴板/右键菜单/内部撤销),
 *   NodeView 对源自表格 DOM 的事件一律 stopEvent,不进 ProseMirror 事件管线;
 * - mtable onChange → setNodeMarkup(value) 写回节点 attr,随 listener 触发
 *   markdown 重序列化;外部变更(setMarkdown/受控回填)经 update() → setCsv 回填;
 * - 撤销:焦点在表格内走 mtable 内部 undo;焦点在外走 ProseMirror history
 *   (每次表格变更对应一条 attr 历史步);
 * - 左上角角格提供全屏按钮:点击把 mtable 宿主搬进 body 最大化 dialog
 *   (单实例搬移,状态连续),关闭时搬回文档流。
 */
import { createMtable, type MtableApi, type MtableChangeSource } from '@meditor/mtable';
import type { Node as ProseNode } from '@milkdown/prose/model';
import type { EditorView, NodeView, NodeViewConstructor } from '@milkdown/prose/view';
import type { EditorLocale } from '../../../types/editor';
import { createFullscreenDialogHost } from '../../../utils/dialog-host';
import { onOutsidePress } from '../../../utils/dismiss-broadcast';
import { MTABLE_NODE_NAME } from './mtable-plugin';
import './mtable-block.css';

/**
 * 嵌入模式的表格最大高度(px):内容不足时按实际行数收缩,超出时内部滚动。
 */
const MTABLE_MAX_HEIGHT = 300;

/**
 * 构建全屏图标 markup(lucide maximize-2 风格对角双箭头)。
 */
const MAXIMIZE_ICON_MARKUP =
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"' +
  ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"' +
  ' stroke-linejoin="round" aria-hidden="true">' +
  '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>' +
  '<line x1="21" x2="14" y1="3" y2="10"/><line x1="14" x2="21" y1="10" y2="3"/>' +
  '<line x1="3" x2="10" y1="21" y2="14"/><line x1="10" x2="3" y1="14" y2="21"/>' +
  '</svg>';

/**
 * 构建关闭图标 markup(lucide x 风格)。
 */
const CLOSE_ICON_MARKUP =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"' +
  ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"' +
  ' stroke-linejoin="round" aria-hidden="true">' +
  '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' +
  '</svg>';

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
 * CSV 表格块 NodeView。
 */
class MtableNodeView implements NodeView {
  // 当前节点快照。
  node: ProseNode;
  // 节点根容器。
  dom: HTMLDivElement;
  // 编辑器视图。
  private readonly view: EditorView;
  // 编辑器文案语言。
  private readonly locale: EditorLocale;
  // 节点位置获取器。
  private readonly getPos: boolean | (() => number);
  // mtable 挂载宿主。
  private readonly host: HTMLDivElement;
  // 左上角全屏按钮(行头列 × 列头行交叉的小方块)。
  private readonly expandButton: HTMLButtonElement;
  // mtable 实例。
  private readonly mtable: MtableApi;
  // 编辑器内容区外部点击监听(清除表格内选区,捕获阶段)。
  private readonly handleEditorMouseDown: (event: MouseEvent) => void;
  // 外部按下广播退订函数(桥接 mtable 浮层关闭,销毁时退订)。
  private readonly unsubscribeOutsidePress: () => void;
  // 全屏 dialog 运行态(null = 未打开)。
  private fullscreenDialog: {
    // dialog 宿主(body 或 shadow root)。
    host: HTMLDivElement;
    // Escape 键监听(打开时挂 document,关闭时摘除)。
    handleKeyDown: (event: KeyboardEvent) => void;
  } | null = null;

  /**
   * 同步 CSV 表格块可编辑状态标记,供样式层判断只读态(全屏按钮文案随之切换)。
   */
  private syncEditableState(): void {
    // 变更前的只读态(用于判断按钮提示是否需要刷新)。
    const prevEditable = this.dom.dataset.editable;
    this.dom.dataset.editable = isEditorViewEditable(this.view) ? 'true' : 'false';
    if (this.expandButton && prevEditable !== undefined && prevEditable !== this.dom.dataset.editable) {
      this.expandButton.title = this.resolveExpandTitle();
      this.expandButton.setAttribute('aria-label', this.expandButton.title);
    }
  }

  /**
   * 初始化 CSV 表格块视图并挂载 mtable 实例。
   */
  constructor(
    node: ProseNode,
    view: EditorView,
    getPos: boolean | (() => number),
    locale: EditorLocale
  ) {
    // 初始节点快照。
    this.node = node;
    // 编辑器视图引用。
    this.view = view;
    // 编辑器文案语言。
    this.locale = locale;
    // 节点位置获取器引用。
    this.getPos = getPos;

    // 根容器。
    this.dom = document.createElement('div');
    this.dom.dataset.type = MTABLE_NODE_NAME;
    this.dom.className = 'zt-md-mtable-block';
    this.syncEditableState();

    // mtable 挂载宿主(定高,内部滚动)。
    this.host = document.createElement('div');
    this.host.className = 'zt-md-mtable-host';
    this.dom.appendChild(this.host);

    // 左上角全屏按钮:几何对齐 mtable 默认规格(行头宽 46 × 列头高 20),
    // 点击把表格弹出为最大化 dialog(canvas 内框选不受影响)。
    this.expandButton = document.createElement('button');
    this.expandButton.type = 'button';
    this.expandButton.className = 'zt-md-mtable-expand';
    this.expandButton.innerHTML = MAXIMIZE_ICON_MARKUP;
    this.expandButton.title = this.resolveExpandTitle();
    this.expandButton.setAttribute('aria-label', this.expandButton.title);
    this.expandButton.addEventListener('click', this.handleExpandClick);
    this.dom.appendChild(this.expandButton);

    // 当前 CSV 文本。
    const csv = String(node.attrs.value ?? '');
    this.mtable = createMtable({
      root: this.host,
      defaultValue: csv,
      readOnly: !isEditorViewEditable(view),
      locale,
      // meditor 嵌入采用自动加行模式:数据末尾保留 1 行可输入空行,
      // 表格有底——滚到顶/底后滚轮交给编辑区滚动(scroll chaining)。
      rowMode: 'autoAppendRows',
      // 列自动增加:最少 10 列;总列宽不足可视宽度时按 10 列的倍数补列直至覆盖
      // (宿主宽度始终 100%,列覆盖由 mtable 内部在尺寸变化时保证)。
      colMode: 'autoAppendCols',
      onChange: this.handleCsvChange,
      // 拖拽列宽/自动换行重算等布局变化不产生 CSV 变更,经此回调同步宿主高度。
      onLayoutChange: () => this.syncHostHeight()
    });
    this.syncHostHeight();

    // 编辑器内容区外部点击 → 清除表格内选区(蓝色框)。
    // 捕获阶段监听,先于 PM 处理且不影响事件流转;表格内部点击交给 mtable。
    this.handleEditorMouseDown = (event: MouseEvent): void => {
      if (event.target instanceof Node && this.dom.contains(event.target)) {
        return;
      }
      // 无选区则无需清除。
      if (this.mtable.getSelection() === null) {
        return;
      }
      this.mtable.clearSelection();
    };
    view.dom.addEventListener('mousedown', this.handleEditorMouseDown, true);

    // 统一外部按下广播 → mtable 浮层关闭:表格筛选面板/右键菜单锚定视口坐标,
    // 点击其他块时必须收起;具体落点判断(表格 DOM/浮层内部忽略)由
    // mtable 的 notifyOutsidePress 扩展点自行处理,NodeView 只做桥接。
    this.unsubscribeOutsidePress = onOutsidePress((event) => {
      this.mtable.notifyOutsidePress(event);
    });
  }

  /**
   * 自适应宿主高度:以网格内容高(列头 + 行高合计)为准,上限 MTABLE_MAX_HEIGHT,
   * 超出后内部滚动。
   */
  private syncHostHeight(): void {
    // 全屏态高度由弹窗布局决定(100%),关闭恢复嵌入态时再重新计量。
    if (this.fullscreenDialog) {
      return;
    }
    this.host.style.height = `${Math.min(this.mtable.getContentHeight(), MTABLE_MAX_HEIGHT)}px`;
  }

  /**
   * 全屏按钮提示文案:可编辑态为"全屏编辑表格",只读态为"放大查看"。
   */
  private resolveExpandTitle(): string {
    const readonly = this.dom.dataset.editable === 'false';
    if (this.locale === 'en-US') {
      return readonly ? 'View table fullscreen' : 'Open table fullscreen';
    }
    return readonly ? '放大查看表格' : '全屏编辑表格';
  }

  /**
   * 全屏按钮点击:弹出最大化 dialog 展示表格。
   */
  private readonly handleExpandClick = (): void => {
    this.openFullscreenDialog();
  };

  /**
   * 打开最大化 dialog:把 mtable 宿主整体搬进 body 弹窗(单实例搬移——
   * 选区/撤销栈/单元格编辑态连续),尺寸变化由 mtable 内部 ResizeObserver
   * 触发重渲染自适应;onChange 照常写回节点 attr,无需额外同步。
   */
  private openFullscreenDialog(): void {
    if (this.fullscreenDialog) {
      return;
    }
    // 弹窗标题。
    const title = this.locale === 'en-US' ? 'Table' : '表格';

    // dialog 宿主(含主题类/变量)与遮罩、最大化窗口壳。
    const dialogHost = createFullscreenDialogHost(this.view.dom, 'zt-md-mtable-fullscreen-host');
    const overlay = document.createElement('div');
    overlay.className = 'zt-md-mtable-fullscreen-overlay';
    const windowEl = document.createElement('div');
    windowEl.className = 'zt-md-mtable-fullscreen-window';
    windowEl.setAttribute('role', 'dialog');
    windowEl.setAttribute('aria-label', title);

    // 头部:标题 + 关闭按钮。
    const header = document.createElement('div');
    header.className = 'zt-md-mtable-fullscreen-header';
    const titleEl = document.createElement('span');
    titleEl.className = 'zt-md-mtable-fullscreen-title';
    titleEl.textContent = title;
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'zt-md-mtable-fullscreen-close';
    closeButton.innerHTML = CLOSE_ICON_MARKUP;
    closeButton.title = this.locale === 'en-US' ? 'Close (Esc)' : '关闭 (Esc)';
    closeButton.setAttribute('aria-label', closeButton.title);
    closeButton.addEventListener('click', this.closeFullscreenDialog);
    header.append(titleEl, closeButton);

    // 内容区:搬入 mtable 宿主,内联高度切为 100% 填满弹窗
    // (关闭时经 syncHostHeight 恢复嵌入态定高)。
    const body = document.createElement('div');
    body.className = 'zt-md-mtable-fullscreen-body';
    body.appendChild(this.host);
    this.host.style.height = '100%';

    windowEl.append(header, body);
    overlay.appendChild(windowEl);
    dialogHost.appendChild(overlay);
    // mtable 浮层(右键菜单/筛选面板)挂进弹窗宿主:弹窗宿主 z-index 顶格,
    // 浮层挂 body 会被压在背面;挂进宿主后在其层叠上下文内自然盖过窗口壳。
    this.mtable.setOverlayContainer(dialogHost);

    // Escape 关闭(冒泡阶段:单元格编辑态的 Escape 先被 mtable preventDefault
    // 消费,冒泡到 document 时 defaultPrevented 为 true,不会误关弹窗)。
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      this.closeFullscreenDialog();
    };
    document.addEventListener('keydown', handleKeyDown);

    this.fullscreenDialog = { host: dialogHost, handleKeyDown };
    this.mtable.focus();
  }

  /**
   * 关闭最大化 dialog:mtable 宿主搬回文档流并恢复嵌入态高度。
   */
  private readonly closeFullscreenDialog = (): void => {
    // 当前弹窗运行态。
    const dialog = this.fullscreenDialog;
    if (!dialog) {
      return;
    }
    this.fullscreenDialog = null;
    // mtable 浮层先搬回默认挂载点(body),避免随弹窗宿主一起被移除
    this.mtable.setOverlayContainer(null);
    document.removeEventListener('keydown', dialog.handleKeyDown);
    dialog.host.remove();
    // 宿主搬回文档流,保持嵌入态子节点顺序(host 在全屏按钮之前)。
    this.dom.insertBefore(this.host, this.expandButton);
    this.syncHostHeight();
    this.mtable.focus();
  };

  /**
   * mtable 内容变更 → 写回节点 value attr。
   * (update() 收到本次事务后会因 attr 与表格内容一致而跳过 setCsv 回填,无回环。
   *  CRLF 规范为 LF:markdown 围栏内容用 LF 存储,避免行尾噪声。)
   * mtable 内部 undo/redo 回放(addToHistory:false)不进 PM 历史,
   * 与 jsondata-view-node-view 对齐,避免双轨撤销互相串联。
   */
  private readonly handleCsvChange = (rawCsv: string, source: MtableChangeSource = 'input'): void => {
    // 规范化后的 CSV 文本。
    const csv = rawCsv.replace(/\r\n/g, '\n');
    // 当前节点位置。
    const nodePosition = resolveNodePosition(this.getPos);
    if (nodePosition === null) {
      return;
    }
    if (String(this.node.attrs.value ?? '') === csv) {
      return;
    }

    // 本次事务对象。
    const transaction = this.view.state.tr.setNodeMarkup(nodePosition, undefined, {
      ...this.node.attrs,
      value: csv
    });
    if (source === 'undo' || source === 'redo') {
      // prosemirror-history 约定 metadata:"addToHistory"=false 的跳过入栈。
      transaction.setMeta('addToHistory', false);
    }
    if (transaction.docChanged) {
      this.view.dispatch(transaction);
    }
    this.syncHostHeight();
  };

  /**
   * 处理节点更新:外部变更(setMarkdown/受控回填)回填到表格。
   */
  update(node: ProseNode): boolean {
    if (node.type.name !== MTABLE_NODE_NAME) {
      return false;
    }

    this.node = node;
    this.syncEditableState();
    // 当前节点 CSV 文本。
    const csv = String(node.attrs.value ?? '');
    // 与表格内容比较时同样做 CRLF→LF 归一化(自身写回引发的 update 是无操作,
    // 否则每次编辑都会触发整表重建并清空 mtable 内部撤销栈)。
    if (csv !== this.mtable.getCsv().replace(/\r\n/g, '\n')) {
      this.mtable.setCsv(csv);
    }
    this.syncHostHeight();
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
   * 表格内部事件全部就地消费(键鼠/滚轮/剪贴板/右键菜单)。
   */
  stopEvent(event: Event): boolean {
    // 事件目标节点。
    const target = event.target;
    if (!(target instanceof Node)) {
      return false;
    }

    return this.dom.contains(target);
  }

  /**
   * 忽略 NodeView 内部的 DOM 变更观察(canvas 渲染不产生可观察文本变更)。
   */
  ignoreMutation(): boolean {
    return true;
  }

  /**
   * 销毁 mtable 实例(含右键菜单清理)、全屏弹窗与各监听。
   */
  destroy(): void {
    if (this.fullscreenDialog) {
      this.closeFullscreenDialog();
    }
    this.expandButton.removeEventListener('click', this.handleExpandClick);
    this.view.dom.removeEventListener('mousedown', this.handleEditorMouseDown, true);
    this.unsubscribeOutsidePress();
    this.mtable.destroy();
  }
}

/**
 * 创建 mtable 的 NodeView 构造器。
 */
export const createMtableNodeView = (locale: EditorLocale = 'zh-CN'): NodeViewConstructor => {
  return (node, view, getPos) => {
    // 将 NodeViewConstructor 的可选 getPos 统一收敛到当前实现可接受的类型范围。
    const resolvedGetPos =
      typeof getPos === 'function'
        ? () => {
            const nextPosition = getPos();
            return typeof nextPosition === 'number' ? nextPosition : 0;
          }
        : false;
    return new MtableNodeView(node, view, resolvedGetPos, locale);
  };
};
