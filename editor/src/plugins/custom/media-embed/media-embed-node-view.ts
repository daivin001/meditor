/**
 * plugins/custom/media-embed/media-embed-node-view.ts — 媒体嵌入块 NodeView
 *
 * 按种类渲染:video/audio 原生控件(支持 video 上下缩放手柄拖拽调整高度,
 * 范围受 schema clamp;加载失败占位提示);bookmark 卡片(图标 + URL 文案);
 * embed iframe(sandbox 隔离,上下缩放手柄拖拽调整高度,范围受 schema clamp)。
 * 悬停操作区:编辑(打开 URL 浮层回填)与删除按钮,参照图片 NodeView 同款交互。
 * 点击 video/audio/书签/内嵌热区即选中整块(NodeSelection),可配合 Backspace/Delete 删除。
 * 只读/编辑一致,选中态高亮。
 */
import type { Node as ProseNode } from '@milkdown/prose/model';
import { NodeSelection } from '@milkdown/prose/state';
import type { EditorView, NodeView, NodeViewConstructor } from '@milkdown/prose/view';
import type { EditorI18nMessages } from '../../../types/editor';
import { resolveEditorMessages } from '../../../local/i18n';
import { OPEN_MEDIA_EMBED_META, type MediaEmbedKind } from '../slash-menu/slash-menu-commands';
import {
  MEDIA_EMBED_NODE_NAME,
  clampMediaEmbedHeight,
  isMediaEmbedKind
} from './media-embed-plugin';

/**
 * 书签卡片图标(lucide link 线条风)。
 */
const BOOKMARK_ICON_MARKUP =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"' +
  ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"' +
  ' stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>' +
  '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

/**
 * 构建内联 SVG 图标 markup(lucide 风格线条)。
 */
const buildIconMarkup = (paths: string, size = 14): string => {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
  );
};

// 编辑按钮图标(lucide pencil)。
const editIconMarkup = buildIconMarkup(
  '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>'
);
// 删除按钮图标(lucide trash-2)。
const deleteIconMarkup = buildIconMarkup(
  '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>'
);
// 媒体加载失败图标(lucide video-off 简化线条)。
const mediaLoadErrorIconMarkup = buildIconMarkup(
  '<path d="m16 16 2 2 4-4M22 13V6l-9.29 3.71M7 8H2v8h5l7 4V10l-2.5 1.14"/><line x1="2" x2="22" y1="2" y2="22"/>',
  24
);

/**
 * 内嵌块顶部缩放手柄标识。
 */
const MEDIA_EMBED_RESIZE_SIDE_TOP = 'top';

/**
 * 内嵌块底部缩放手柄标识。
 */
const MEDIA_EMBED_RESIZE_SIDE_BOTTOM = 'bottom';

/**
 * 内嵌缩放手柄方向。
 */
type MediaEmbedResizeSide = typeof MEDIA_EMBED_RESIZE_SIDE_TOP | typeof MEDIA_EMBED_RESIZE_SIDE_BOTTOM;

/**
 * 内嵌拖拽缩放状态。
 */
interface MediaEmbedResizeState {
  /** 拖拽手柄方向。 */
  side: MediaEmbedResizeSide;
  /** 拖拽起始纵坐标。 */
  startClientY: number;
  /** 拖拽起始媒体高度。 */
  startHeight: number;
  /** 最新高度(px)。 */
  height: number;
}

/**
 * 判断事件是否为主键(左键)按下。
 */
const isPrimaryButton = (event: PointerEvent): boolean => event.button === 0;

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
 * 判断种类是否支持高度缩放(video 与 embed)。
 */
const isHeightResizableKind = (kind: MediaEmbedKind): boolean => kind === 'video' || kind === 'embed';

/**
 * 媒体嵌入块 NodeView。
 */
class MediaEmbedNodeView implements NodeView {
  // 当前节点快照。
  node: ProseNode;
  // 节点根容器。
  dom: HTMLElement;
  // 编辑器视图。
  private readonly view: EditorView;
  // 节点位置获取器。
  private readonly getPos: boolean | (() => number);
  // i18n 文案。
  private readonly messages: EditorI18nMessages;
  // 高度可缩放的媒体元素(embed 为 iframe,video 为 video;其余种类为 null)。
  private mediaElement: HTMLIFrameElement | HTMLVideoElement | null = null;
  // 加载失败占位元素(video/audio 才有)。
  private loadErrorElement: HTMLSpanElement | null = null;
  // 悬停操作区容器(编辑/删除按钮)。
  private readonly actionsContainer: HTMLSpanElement;
  // 编辑按钮。
  private readonly editButton: HTMLButtonElement;
  // 删除按钮。
  private readonly deleteButton: HTMLButtonElement;
  // 顶部缩放提示手柄(video/embed 才有;纯视觉,命中靠热区)。
  private topResizeHandle: HTMLSpanElement | null = null;
  // 底部缩放提示手柄(video/embed 才有;纯视觉,命中靠热区)。
  private bottomResizeHandle: HTMLSpanElement | null = null;
  // 顶部缩放热区(video/embed 才有;常驻可命中,解决 iframe 吞掉父文档 hover 的问题)。
  private topResizeZone: HTMLSpanElement | null = null;
  // 底部缩放热区(video/embed 才有)。
  private bottomResizeZone: HTMLSpanElement | null = null;
  // 当前拖拽缩放状态。
  private resizeState: MediaEmbedResizeState | null = null;

  /**
   * 初始化视图。
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
    this.messages = messages;

    // 根容器。
    this.dom = document.createElement('div');
    this.dom.dataset.type = MEDIA_EMBED_NODE_NAME;
    this.dom.className = 'zt-md-media-embed';
    this.dom.dataset.editable = isEditorViewEditable(view) ? 'true' : 'false';

    // 悬停操作区:编辑 + 删除按钮(右上角,悬停显现)。
    this.actionsContainer = document.createElement('span');
    this.actionsContainer.className = 'zt-md-media-embed-actions';
    this.editButton = document.createElement('button');
    this.editButton.type = 'button';
    this.editButton.className = 'zt-md-media-embed-action-button';
    this.editButton.setAttribute('aria-label', messages.mediaEmbedEditAriaLabel);
    this.editButton.title = messages.mediaEmbedEditAriaLabel;
    this.editButton.innerHTML = editIconMarkup;
    this.deleteButton = document.createElement('button');
    this.deleteButton.type = 'button';
    this.deleteButton.className = 'zt-md-media-embed-action-button zt-md-media-embed-action-button-danger';
    this.deleteButton.setAttribute('aria-label', messages.mediaEmbedDeleteAriaLabel);
    this.deleteButton.title = messages.mediaEmbedDeleteAriaLabel;
    this.deleteButton.innerHTML = deleteIconMarkup;
    this.actionsContainer.append(this.editButton, this.deleteButton);
    this.editButton.addEventListener('click', this.handleEditClick);
    this.deleteButton.addEventListener('click', this.handleDeleteClick);

    this.renderContent(node);
    this.dom.appendChild(this.actionsContainer);
    this.syncInitialSelection();
  }

  /**
   * 同步初始选中态:初始 state 已携带本节点 NodeSelection 时(如文档首块即媒体块),
   * ProseMirror mount 不会回调 selectNode,需在构造时补齐 DOM 高亮。
   */
  private syncInitialSelection(): void {
    // 当前节点位置。
    const nodePosition = resolveNodePosition(this.getPos);
    // 当前选区。
    const { selection } = this.view.state;
    if (nodePosition !== null && selection instanceof NodeSelection && selection.from === nodePosition) {
      this.selectNode();
    }
  }

  /**
   * 按种类渲染内容。
   */
  private renderContent(node: ProseNode): void {
    // 清空重建(操作区单独保留,末尾挂回),并重置种类相关元素引用。
    this.mediaElement = null;
    this.loadErrorElement = null;
    this.topResizeHandle = null;
    this.bottomResizeHandle = null;
    this.topResizeZone = null;
    this.bottomResizeZone = null;
    this.dom.textContent = '';
    // 当前种类与地址。
    const kind: MediaEmbedKind = isMediaEmbedKind(node.attrs.kind) ? node.attrs.kind : 'video';
    const src = String(node.attrs.src ?? '');
    this.dom.dataset.kind = kind;

    if (kind === 'bookmark') {
      // 书签卡片。
      const card = document.createElement('a');
      card.href = src;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.className = 'zt-md-bookmark-card';
      const icon = document.createElement('span');
      icon.className = 'zt-md-bookmark-icon';
      icon.innerHTML = BOOKMARK_ICON_MARKUP;
      const text = document.createElement('span');
      text.className = 'zt-md-bookmark-url';
      text.textContent = src;
      card.append(icon, text);
      // 编辑态点击卡片:选中整块并阻止跳转(地址修改走编辑按钮);只读态放行跳转。
      card.addEventListener('pointerdown', this.handleSelectPointerDown);
      card.addEventListener('click', this.handleBookmarkClick);
      this.dom.appendChild(card);
      return;
    }

    if (kind === 'embed') {
      // 第三方内嵌(sandbox 限权,允许脚本以支持主流嵌入页)。
      const iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups');
      iframe.setAttribute('loading', 'lazy');
      iframe.allowFullscreen = true;
      this.mediaElement = iframe;
      this.dom.appendChild(iframe);
    } else {
      // video / audio 原生控件(加载失败时切占位提示)。
      const element = kind === 'audio' ? document.createElement('audio') : document.createElement('video');
      element.src = src;
      element.controls = true;
      element.preload = 'metadata';
      element.addEventListener('error', this.handleMediaError);
      element.addEventListener('pointerdown', this.handleSelectPointerDown);
      // 加载失败占位元素。
      this.loadErrorElement = document.createElement('span');
      this.loadErrorElement.className = 'zt-md-media-embed-load-error';
      this.loadErrorElement.innerHTML = mediaLoadErrorIconMarkup;
      this.loadErrorElement.append(this.messages.mediaEmbedLoadFailed);
      this.dom.append(element, this.loadErrorElement);
      if (element instanceof HTMLVideoElement) {
        this.mediaElement = element;
      }
    }

    // video/embed 支持高度缩放:按节点属性恢复自定义高度(0 = 自动)。
    if (isHeightResizableKind(kind)) {
      this.applyMediaHeight(this.resolveNodeHeightPx(node));

      // 视觉手柄(悬停热区时显现的蓝色横条)。
      this.topResizeHandle = this.createResizeHandle(MEDIA_EMBED_RESIZE_SIDE_TOP);
      this.bottomResizeHandle = this.createResizeHandle(MEDIA_EMBED_RESIZE_SIDE_BOTTOM);

      // 缩放热区:透明横条常驻压在上下边缘,父文档可直接命中
      // (iframe 内容属于子文档,光标在其上时父级 :hover 不触发,手柄必须靠热区唤起)。
      this.topResizeZone = this.createResizeZone(MEDIA_EMBED_RESIZE_SIDE_TOP);
      this.bottomResizeZone = this.createResizeZone(MEDIA_EMBED_RESIZE_SIDE_BOTTOM);
      this.topResizeZone.addEventListener('pointerdown', this.handleResizePointerDown);
      this.bottomResizeZone.addEventListener('pointerdown', this.handleResizePointerDown);
      this.dom.append(
        this.topResizeHandle,
        this.bottomResizeHandle,
        this.topResizeZone,
        this.bottomResizeZone
      );
    }
  }

  /**
   * 创建内嵌高度缩放视觉手柄(悬停热区时显现,不参与命中)。
   */
  private createResizeHandle(side: MediaEmbedResizeSide): HTMLSpanElement {
    // 缩放手柄元素。
    const handle = document.createElement('span');
    handle.className = `zt-md-media-embed-resize-handle zt-md-media-embed-resize-handle-${side}`;
    handle.dataset.side = side;
    handle.setAttribute('aria-hidden', 'true');
    return handle;
  }

  /**
   * 创建内嵌高度缩放热区(常驻可命中的透明横条)。
   */
  private createResizeZone(side: MediaEmbedResizeSide): HTMLSpanElement {
    // 热区元素。
    const zone = document.createElement('span');
    zone.className = `zt-md-media-embed-resize-zone zt-md-media-embed-resize-zone-${side}`;
    zone.dataset.side = side;
    zone.setAttribute('aria-hidden', 'true');
    return zone;
  }

  /**
   * 读取节点属性中的媒体高度(0 = 自动)。
   */
  private resolveNodeHeightPx(node: ProseNode): number {
    const heightPx = node.attrs.height;
    return typeof heightPx === 'number' && heightPx > 0 ? clampMediaEmbedHeight(heightPx) : 0;
  }

  /**
   * 应用媒体高度到 video/iframe(0 = 移除自定义高度,回落自动高度)。
   * 错误占位同步承接高度:错误态下原生媒体隐藏,拖拽预览与自定义高度由占位呈现,
   * 链接修复后高度无缝回到媒体元素。
   */
  private applyMediaHeight(heightPx: number): void {
    if (heightPx > 0) {
      const roundedHeight = `${Math.round(heightPx)}px`;
      this.mediaElement?.style.setProperty('height', roundedHeight);
      this.loadErrorElement?.style.setProperty('height', roundedHeight);
      this.dom.dataset.hasHeight = 'true';
    } else {
      this.mediaElement?.style.removeProperty('height');
      this.loadErrorElement?.style.removeProperty('height');
      delete this.dom.dataset.hasHeight;
    }
  }

  /**
   * 响应媒体加载失败:切换错误占位(video/audio)。
   */
  private readonly handleMediaError = (): void => {
    this.dom.dataset.loadError = 'true';
  };

  /**
   * 响应点击选中:把当前节点切为 NodeSelection(不阻断媒体原生控件交互)。
   */
  private readonly handleSelectPointerDown = (event: PointerEvent): void => {
    if (!isPrimaryButton(event) || !isEditorViewEditable(this.view)) {
      return;
    }

    this.dispatchNodeSelection();
  };

  /**
   * 响应书签卡片点击:编辑态阻止跳转(选中已在 pointerdown 完成);只读态放行。
   */
  private readonly handleBookmarkClick = (event: MouseEvent): void => {
    if (isEditorViewEditable(this.view)) {
      event.preventDefault();
    }
  };

  /**
   * 把当前节点设为 NodeSelection(已选中时不重复派发事务)。
   */
  private dispatchNodeSelection(): void {
    // 当前节点位置。
    const nodePosition = resolveNodePosition(this.getPos);
    if (nodePosition === null) {
      return;
    }

    // 选区已是本节点 NodeSelection 且高亮已同步时才跳过(初始 state 即带
    // NodeSelection 时 PM 不回调 selectNode,DOM 高亮缺失,必须补一次派发)。
    const { selection } = this.view.state;
    if (
      this.dom.dataset.selected === 'true' &&
      selection instanceof NodeSelection &&
      selection.from === nodePosition
    ) {
      return;
    }

    this.view.dispatch(
      this.view.state.tr.setSelection(NodeSelection.create(this.view.state.doc, nodePosition))
    );
  }

  /**
   * 响应编辑按钮点击:经 meta 请求打开 URL 浮层(编辑模式,回填当前地址)。
   */
  private readonly handleEditClick = (event: MouseEvent): void => {
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

    const kind: MediaEmbedKind = isMediaEmbedKind(this.node.attrs.kind) ? this.node.attrs.kind : 'video';
    this.view.dispatch(
      this.view.state.tr.setMeta(OPEN_MEDIA_EMBED_META, {
        kind,
        editPos: nodePosition,
        editSrc: String(this.node.attrs.src ?? '')
      })
    );
  };

  /**
   * 响应删除按钮点击,删除当前媒体块。
   */
  private readonly handleDeleteClick = (event: MouseEvent): void => {
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

    // 删除媒体块事务。
    const transaction = this.view.state.tr
      .delete(nodePosition, nodePosition + this.node.nodeSize)
      .scrollIntoView();
    this.view.dispatch(transaction);
    requestAnimationFrame(() => {
      this.view.focus();
    });
  };

  /**
   * 响应内嵌缩放开始(热区 pointerdown,仅左键;同时选中原节点)。
   */
  private readonly handleResizePointerDown = (event: PointerEvent): void => {
    if (!isPrimaryButton(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!isEditorViewEditable(this.view)) {
      return;
    }

    // 当前手柄元素。
    const handle = event.currentTarget;
    if (!(handle instanceof HTMLElement)) {
      return;
    }

    // 高度矩形来源:错误态下原生媒体隐藏(rect 为 0),改取错误占位矩形。
    const rectSource =
      this.dom.dataset.loadError === 'true' && this.loadErrorElement
        ? this.loadErrorElement
        : this.mediaElement;
    if (!rectSource) {
      return;
    }

    // 媒体当前矩形。
    const mediaRect = rectSource.getBoundingClientRect();
    if (mediaRect.height <= 0) {
      return;
    }

    // 当前手柄方向。
    const side =
      handle.dataset.side === MEDIA_EMBED_RESIZE_SIDE_TOP
        ? MEDIA_EMBED_RESIZE_SIDE_TOP
        : MEDIA_EMBED_RESIZE_SIDE_BOTTOM;

    // 拖拽缩放同时选中整块(与手柄交互一致)。
    this.dispatchNodeSelection();

    this.resizeState = {
      side,
      startClientY: event.clientY,
      startHeight: mediaRect.height,
      height: clampMediaEmbedHeight(mediaRect.height)
    };
    this.dom.dataset.resizing = 'true';
    // 拖拽期间屏蔽媒体指针事件,避免光标进入内嵌页后父级收不到 pointermove。
    this.mediaElement?.style.setProperty('pointer-events', 'none');
    this.applyMediaHeight(this.resizeState.height);

    window.addEventListener('pointermove', this.handleResizePointerMove);
    window.addEventListener('pointerup', this.handleResizePointerUp);
    window.addEventListener('pointercancel', this.handleResizePointerUp);
  };

  /**
   * 响应内嵌缩放移动(拖上方手柄向上增高,拖下方手柄向下增高)。
   */
  private readonly handleResizePointerMove = (event: PointerEvent): void => {
    if (!this.resizeState) {
      return;
    }

    event.preventDefault();
    // 鼠标纵向位移。
    const deltaY = event.clientY - this.resizeState.startClientY;
    // 方向修正后的高度变化。
    const heightDelta =
      this.resizeState.side === MEDIA_EMBED_RESIZE_SIDE_TOP ? -deltaY : deltaY;
    // 下一帧高度(clamp 到允许区间)。
    const nextHeight = clampMediaEmbedHeight(this.resizeState.startHeight + heightDelta);

    this.resizeState.height = nextHeight;
    this.applyMediaHeight(nextHeight);
  };

  /**
   * 响应内嵌缩放结束,提交高度到节点属性。
   */
  private readonly handleResizePointerUp = (event: PointerEvent): void => {
    event.preventDefault();

    if (!this.resizeState) {
      return;
    }

    // 最终高度。
    const heightPx = this.resizeState.height;
    this.resizeState = null;
    delete this.dom.dataset.resizing;
    this.removeResizeWindowListeners();
    if (this.mediaElement) {
      this.mediaElement.style.pointerEvents = '';
    }
    this.commitMediaHeight(heightPx);
  };

  /**
   * 移除内嵌缩放全局监听。
   */
  private removeResizeWindowListeners(): void {
    window.removeEventListener('pointermove', this.handleResizePointerMove);
    window.removeEventListener('pointerup', this.handleResizePointerUp);
    window.removeEventListener('pointercancel', this.handleResizePointerUp);
  }

  /**
   * 提交媒体高度到节点属性。
   */
  private commitMediaHeight(heightPx: number): void {
    if (!isEditorViewEditable(this.view)) {
      return;
    }

    // 当前节点位置。
    const nodePosition = resolveNodePosition(this.getPos);
    if (nodePosition === null) {
      return;
    }

    // 媒体高度更新事务。
    const transaction = this.view.state.tr.setNodeMarkup(nodePosition, undefined, {
      ...this.node.attrs,
      height: clampMediaEmbedHeight(heightPx)
    });
    this.view.dispatch(transaction);
    requestAnimationFrame(() => {
      this.view.focus();
    });
  }

  /**
   * 处理节点更新。
   */
  update(node: ProseNode): boolean {
    if (node.type.name !== MEDIA_EMBED_NODE_NAME) {
      return false;
    }

    // kind/src 变化才重渲染(选中态等不触发)。
    const prevKind = this.dom.dataset.kind;
    const kind = isMediaEmbedKind(node.attrs.kind) ? node.attrs.kind : 'video';
    const src = String(node.attrs.src ?? '');
    if (prevKind !== kind || src !== String(this.node.attrs.src ?? '')) {
      this.node = node;
      this.renderContent(node);
      this.dom.appendChild(this.actionsContainer);
      return true;
    }

    this.node = node;
    this.dom.dataset.editable = isEditorViewEditable(this.view) ? 'true' : 'false';
    // 高度属性变化(撤销/重做/协同)同步到媒体元素;拖拽中的预览高度不回写。
    if (isHeightResizableKind(kind) && !this.resizeState) {
      this.applyMediaHeight(this.resolveNodeHeightPx(node));
    }
    return true;
  }

  /**
   * 节点被选中时高亮。
   */
  selectNode(): void {
    this.dom.dataset.selected = 'true';
  }

  /**
   * 节点取消选中。
   */
  deselectNode(): void {
    delete this.dom.dataset.selected;
  }

  /**
   * 拦截媒体块内部事件交给 NodeView 自理(媒体控件/操作按钮/缩放热区)。
   */
  stopEvent(event: Event): boolean {
    // 事件目标节点。
    const target = event.target;
    if (!(target instanceof Node)) {
      return false;
    }

    return this.dom.contains(target) || this.resizeState !== null;
  }

  /**
   * 忽略内部 DOM 变更观察。
   */
  ignoreMutation(): boolean {
    return true;
  }

  /**
   * 销毁时解绑监听器。
   */
  destroy(): void {
    this.removeResizeWindowListeners();
    this.topResizeZone?.removeEventListener('pointerdown', this.handleResizePointerDown);
    this.bottomResizeZone?.removeEventListener('pointerdown', this.handleResizePointerDown);
    this.editButton.removeEventListener('click', this.handleEditClick);
    this.deleteButton.removeEventListener('click', this.handleDeleteClick);
  }
}

/**
 * 创建 media-embed 的 NodeView 构造器。
 */
export const createMediaEmbedNodeView = (
  messages: EditorI18nMessages = resolveEditorMessages()
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
    return new MediaEmbedNodeView(node, view, resolvedGetPos, messages);
  };
};
