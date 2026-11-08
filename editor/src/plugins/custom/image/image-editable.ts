/**
 * plugins/custom/image/image-editable.ts — 图片可编辑 NodeView
 *
 * 1:1 翻译自 zt-react-milkdown/src/plugins/custom/image/image-editable.ts
 * - 悬停删除按钮 + 左右缩放手柄(宽度百分比写入节点 style)
 * - 加载态/加载失败占位,最短占位时长防闪烁
 * - lucide 图标改为内联 SVG markup
 */
import type { Node as ProseNode } from '@milkdown/prose/model';
import { NodeSelection } from '@milkdown/prose/state';
import type { EditorView, NodeView, NodeViewConstructor } from '@milkdown/prose/view';
import type { EditorI18nMessages } from '../../../types/editor';
import { resolveEditorMessages } from '../../../local/i18n';
import { openImagePreviewEditor } from './image-preview';
import {
  clampImageWidthPercent,
  formatImageWidthStyle,
  normalizeImageWidthStyle,
  parseImageWidthPercent
} from './image-resizable-schema';

/**
 * image 节点类型名。
 */
const IMAGE_NODE_NAME = 'image';

/**
 * 图片左侧缩放手柄标识。
 */
const IMAGE_RESIZE_SIDE_LEFT = 'left';

/**
 * 图片右侧缩放手柄标识。
 */
const IMAGE_RESIZE_SIDE_RIGHT = 'right';

/**
 * 图片加载占位符最短展示时长。
 */
const IMAGE_LOADING_PLACEHOLDER_MIN_DURATION = 160;

/**
 * 图片说明输入提交防抖时长。
 */
const IMAGE_CAPTION_COMMIT_DEBOUNCE = 400;

/**
 * 图片缩放手柄方向。
 */
type ImageResizeSide = typeof IMAGE_RESIZE_SIDE_LEFT | typeof IMAGE_RESIZE_SIDE_RIGHT;

/**
 * 图片拖拽缩放状态。
 */
interface ImageResizeState {
  /** 拖拽手柄方向。 */
  side: ImageResizeSide;
  /** 拖拽起始横坐标。 */
  startClientX: number;
  /** 拖拽起始图片宽度。 */
  startWidth: number;
  /** 图片父级容器宽度。 */
  containerWidth: number;
  /** 最新宽度百分比。 */
  widthPercent: number;
}

/**
 * 构建内联 SVG 图标 markup(lucide 风格线条)。
 */
const buildIconMarkup = (paths: string): string => {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
  );
};
// 删除按钮图标。
const deleteIconMarkup = buildIconMarkup(
  '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>'
);
// 图片加载失败图标。
const imageLoadErrorIconMarkup = buildIconMarkup(
  '<path d="M16 16v-1a4 4 0 0 0-7-2.6M7 10a4 4 0 0 0-1 8h4m8 0h2a3 3 0 0 0 1-5.8A5 5 0 0 0 15.5 6 5 5 0 0 0 6 8"/><line x1="2" x2="22" y1="2" y2="22"/>'
);

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
 * 创建带悬停删除按钮的图片 NodeView。
 */
class ImageEditableNodeView implements NodeView {
  // 当前节点快照。
  node: ProseNode;
  // 节点根容器。
  dom: HTMLSpanElement;
  // 编辑器视图。
  private readonly view: EditorView;
  // 节点位置获取器。
  private readonly getPos: boolean | (() => number);
  // 编辑器文案(预览弹窗等一次性 UI 的文案来源)。
  private readonly messages: EditorI18nMessages;
  // 图片删除文案。
  private readonly deleteAriaLabel: string;
  // 图片元素。
  private readonly imageElement: HTMLImageElement;
  // 图片加载失败占位元素。
  private readonly imageLoadErrorElement: HTMLSpanElement;
  // 操作区容器。
  private readonly actionsContainer: HTMLSpanElement;
  // 删除按钮。
  private readonly deleteButton: HTMLButtonElement;
  // 左侧缩放手柄。
  private readonly leftResizeHandle: HTMLSpanElement;
  // 右侧缩放手柄。
  private readonly rightResizeHandle: HTMLSpanElement;
  // 当前缩放状态。
  private resizeState: ImageResizeState | null = null;
  // 当前图片是否处于节点选中态。
  private isSelected = false;
  // 当前图片地址。
  private currentImageSrc = '';
  // 当前加载态开始时间。
  private imageLoadingStartedAt = 0;
  // 图片加载结束定时器。
  private imageLoadingFinishTimer: number | null = null;
  // 图片说明输入元素。
  private readonly captionElement: HTMLSpanElement;
  // 图片说明提交防抖定时器。
  private captionCommitTimer: number | null = null;
  // 图片说明无障碍标签。
  private readonly captionAriaLabel: string;
  // 图片是否独占所在段落(独占时按块级居中,与文字并存时退回行内排版)。
  // 图片节点自身未变化时 ProseMirror 不会回调 update,需另行监听段落内容增删。
  private paragraphObserver: MutationObserver | null = null;
  // 当前被监听的段落 DOM。
  private observedParagraph: Element | null = null;
  // 是否已销毁(构造时排队的延迟同步可能在销毁后触发)。
  private isDestroyed = false;
  // 图片显示地址解析器(文档 src 原样,仅显示时转换;为空则原地址直显)。
  private readonly resolveImageUrl: ((src: string) => string) | null;

  /**
   * 初始化图片视图。
   */
  constructor(
    node: ProseNode,
    view: EditorView,
    getPos: boolean | (() => number),
    messages: EditorI18nMessages,
    resolveImageUrl?: (src: string) => string
  ) {
    // 初始节点快照。
    this.node = node;
    // 编辑器视图引用。
    this.view = view;
    // 节点位置获取器引用。
    this.getPos = getPos;
    // 编辑器文案。
    this.messages = messages;
    // 显示地址解析器。
    this.resolveImageUrl = resolveImageUrl ?? null;
    // 删除按钮文案。
    this.deleteAriaLabel = messages.imageDeleteAriaLabel;
    // 图片说明无障碍标签。
    this.captionAriaLabel = messages.imageCaptionAriaLabel;

    // 根容器。
    this.dom = document.createElement('span');
    this.dom.dataset.type = IMAGE_NODE_NAME;
    this.dom.className = 'zt-md-image';
    this.updateEditableState();
    this.syncSelectedState();

    // 图片元素。
    this.imageElement = document.createElement('img');
    this.imageElement.addEventListener('load', this.handleImageLoad);
    this.imageElement.addEventListener('error', this.handleImageError);

    // 图片加载失败占位元素。
    this.imageLoadErrorElement = document.createElement('span');
    this.imageLoadErrorElement.className = 'zt-md-image-load-error';
    this.imageLoadErrorElement.contentEditable = 'false';
    this.imageLoadErrorElement.innerHTML = imageLoadErrorIconMarkup;
    this.imageLoadErrorElement.append(messages.imageUploadLoadFailed);

    // 左侧缩放手柄。
    this.leftResizeHandle = this.createResizeHandle(IMAGE_RESIZE_SIDE_LEFT);

    // 右侧缩放手柄。
    this.rightResizeHandle = this.createResizeHandle(IMAGE_RESIZE_SIDE_RIGHT);

    // 图片悬停操作区。
    this.actionsContainer = document.createElement('span');
    this.actionsContainer.className = 'zt-md-image-actions';

    // 图片说明输入元素(caption 即节点 alt 属性,MD 语义为 Pandoc implicit figures)。
    // 用 span + 样式层 display:block:图片是行内节点,说明元素位于 span/段落的
    // 行内上下文中,div 嵌套会导致 HTML 解析时被拆出段落。
    this.captionElement = document.createElement('span');
    this.captionElement.className = 'zt-md-image-caption';
    this.captionElement.setAttribute('aria-label', this.captionAriaLabel);
    this.captionElement.dataset.placeholder = messages.imageCaptionPlaceholder;
    this.captionElement.contentEditable = 'true';
    this.captionElement.addEventListener('input', this.handleCaptionInput);
    this.captionElement.addEventListener('blur', this.handleCaptionBlur);
    this.captionElement.addEventListener('keydown', this.handleCaptionKeyDown);

    // 删除按钮。
    this.deleteButton = document.createElement('button');
    this.deleteButton.type = 'button';
    this.deleteButton.className = 'zt-md-image-action-button zt-md-image-action-button-danger';
    this.deleteButton.setAttribute('aria-label', this.deleteAriaLabel);
    this.deleteButton.innerHTML = deleteIconMarkup;

    this.actionsContainer.appendChild(this.deleteButton);
    this.dom.append(
      this.imageElement,
      this.imageLoadErrorElement,
      this.leftResizeHandle,
      this.rightResizeHandle,
      this.actionsContainer,
      this.captionElement
    );
    this.syncFromNode(node);
    this.syncInitialSelection();
    // 节点视图 DOM 由 ProseMirror 在构造返回后才挂入段落,延迟一拍再同步独占态
    // (微任务先于下一次绘制,不会闪现错误布局)。
    queueMicrotask(() => this.syncSoloState());

    this.deleteButton.addEventListener('click', this.handleDeleteClick);
    this.imageElement.addEventListener('dblclick', this.handleImageDoubleClick);
    this.leftResizeHandle.addEventListener('pointerdown', this.handleResizePointerDown);
    this.rightResizeHandle.addEventListener('pointerdown', this.handleResizePointerDown);
  }

  /**
   * 同步初始选中态:初始 state 已携带本节点 NodeSelection 时(如文档首块即图片),
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
   * 同步图片独占段落标记:图片是段落内唯一子节点时按块级居中展示(保持旧版
   * 块级图片的视觉),同段落一旦出现文字/其他元素即退回行内排版,图文同行。
   */
  private syncSoloState(): void {
    if (this.isDestroyed) {
      return;
    }

    // 当前图片节点位置。
    const nodePosition = resolveNodePosition(this.getPos);
    if (nodePosition === null) {
      return;
    }

    // 图片是否为所在段落的唯一子节点(以文档模型为准,DOM 尾部还有
    // ProseMirror 追加的游标辅助节点,不能按 DOM 子节点计数)。
    let isSolo = false;
    try {
      isSolo = this.view.state.doc.resolve(nodePosition).parent.childCount === 1;
    } catch {
      isSolo = false;
    }

    // 独占态标记仅在变化时写入,避免制造无谓的 DOM 变更。
    const nextSolo = isSolo ? 'true' : 'false';
    if (this.dom.dataset.solo !== nextSolo) {
      this.dom.dataset.solo = nextSolo;
    }
    this.observeParagraph();
  }

  /**
   * 监听图片所在段落的直接子节点变化:图文同行结构的切换信号就是段落内容
   * 增删,反映为段落 DOM 的 childList/characterData 变更。节点视图被
   * ProseMirror 移动到新段落时父级随之变化,这里同步重挂监听。
   */
  private observeParagraph(): void {
    // 当前段落 DOM(构造时尚未挂载,允许先为 null 待后续补挂)。
    const paragraph = this.dom.parentElement;
    if (paragraph === this.observedParagraph) {
      return;
    }

    this.paragraphObserver?.disconnect();
    this.observedParagraph = paragraph;
    if (!paragraph) {
      return;
    }

    this.paragraphObserver = new MutationObserver(() => this.syncSoloState());
    this.paragraphObserver.observe(paragraph, { childList: true, characterData: true });
  }

  /**
   * 响应说明输入:防抖后写回节点 alt 属性。
   */
  private readonly handleCaptionInput = (): void => {
    if (this.captionCommitTimer !== null) {
      window.clearTimeout(this.captionCommitTimer);
    }
    this.captionCommitTimer = window.setTimeout(() => {
      this.captionCommitTimer = null;
      this.commitCaption();
    }, IMAGE_CAPTION_COMMIT_DEBOUNCE);
  };

  /**
   * 响应说明失焦:立即提交并同步一次节点快照。
   */
  private readonly handleCaptionBlur = (): void => {
    this.clearCaptionCommitTimer();
    this.commitCaption();
  };

  /**
   * 响应说明内按键:Enter/Escape 提交并退出(说明保持单行)。
   */
  private readonly handleCaptionKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.captionElement.blur();
  };

  /**
   * 清理说明提交防抖定时器。
   */
  private clearCaptionCommitTimer(): void {
    if (this.captionCommitTimer === null) {
      return;
    }

    window.clearTimeout(this.captionCommitTimer);
    this.captionCommitTimer = null;
  }

  /**
   * 把说明文本提交到节点 alt 属性(文本未变化时不产生事务)。
   */
  private commitCaption(): void {
    if (!isEditorViewEditable(this.view)) {
      return;
    }

    // 当前节点位置。
    const nodePosition = resolveNodePosition(this.getPos);
    if (nodePosition === null) {
      return;
    }

    // 最新说明文本(去除首尾空白)。
    const nextAlt = this.captionElement.textContent?.trim() ?? '';
    // 当前节点 alt 属性。
    const currentAlt = typeof this.node.attrs.alt === 'string' ? this.node.attrs.alt : '';
    if (nextAlt === currentAlt) {
      return;
    }

    // 说明更新事务。
    const transaction = this.view.state.tr.setNodeMarkup(nodePosition, undefined, {
      ...this.node.attrs,
      alt: nextAlt
    });
    this.view.dispatch(transaction);
  }

  /**
   * 创建图片缩放手柄。
   */
  private createResizeHandle(side: ImageResizeSide): HTMLSpanElement {
    // 缩放手柄元素。
    const handle = document.createElement('span');
    handle.className = `zt-md-image-resize-handle zt-md-image-resize-handle-${side}`;
    handle.dataset.side = side;
    handle.setAttribute('aria-hidden', 'true');
    return handle;
  }

  /**
   * 响应图片双击,打开预览/标注编辑弹窗(确认后回写节点 src)。
   */
  private readonly handleImageDoubleClick = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();

    // 图片尚未加载完成/加载失败时不打开预览。
    if (this.dom.dataset.loadError === 'true') {
      return;
    }

    openImagePreviewEditor({
      view: this.view,
      getPosition: () => resolveNodePosition(this.getPos),
      node: this.node,
      messages: this.messages,
      editable: isEditorViewEditable(this.view)
    });
  };

  /**
   * 响应删除按钮点击,删除当前图片。
   */
  private readonly handleDeleteClick = (event: MouseEvent): void => {    event.preventDefault();
    event.stopPropagation();

    if (!isEditorViewEditable(this.view)) {
      return;
    }

    this.deleteCurrentImage();
  };

  /**
   * 删除当前图片并将焦点归还编辑器。
   */
  private deleteCurrentImage(): void {
    // 当前节点位置。
    const nodePosition = resolveNodePosition(this.getPos);
    if (nodePosition === null) {
      return;
    }

    // 删除图片节点事务。
    const transaction = this.view.state.tr.delete(nodePosition, nodePosition + this.node.nodeSize).scrollIntoView();
    this.view.dispatch(transaction);
    requestAnimationFrame(() => {
      this.view.focus();
    });
  }

  /**
   * 更新图片可编辑状态标记。
   */
  private updateEditableState(): void {
    this.dom.dataset.editable = isEditorViewEditable(this.view) ? 'true' : 'false';
  }

  /**
   * 更新图片选中态标记。
   */
  private syncSelectedState(): void {
    this.dom.dataset.selected = this.isSelected ? 'true' : 'false';
  }

  /**
   * 标记图片正在加载。
   */
  private markImageLoading(): void {
    this.clearImageLoadingFinishTimer();
    this.imageLoadingStartedAt = performance.now();
    delete this.dom.dataset.loadError;
    this.dom.dataset.loading = 'true';
  }

  /**
   * 标记图片加载结束。
   */
  private finishImageLoading(): void {
    this.clearImageLoadingFinishTimer();
    delete this.dom.dataset.loading;
  }

  /**
   * 延迟结束图片加载态,避免占位符一闪而过。
   */
  private finishImageLoadingWithMinimumDuration(): void {
    // 占位符已展示时长。
    const loadingDuration = performance.now() - this.imageLoadingStartedAt;
    // 剩余最短展示时长。
    const remainingDuration = Math.max(0, IMAGE_LOADING_PLACEHOLDER_MIN_DURATION - loadingDuration);
    if (remainingDuration <= 0) {
      this.finishImageLoading();
      return;
    }

    this.clearImageLoadingFinishTimer();
    this.imageLoadingFinishTimer = window.setTimeout(() => {
      this.finishImageLoading();
    }, remainingDuration);
  }

  /**
   * 清理图片加载结束定时器。
   */
  private clearImageLoadingFinishTimer(): void {
    if (this.imageLoadingFinishTimer === null) {
      return;
    }

    window.clearTimeout(this.imageLoadingFinishTimer);
    this.imageLoadingFinishTimer = null;
  }

  /**
   * 响应图片加载完成。
   */
  private readonly handleImageLoad = (): void => {
    delete this.dom.dataset.loadError;
    this.finishImageLoadingWithMinimumDuration();
  };

  /**
   * 响应图片加载失败。
   */
  private readonly handleImageError = (): void => {
    this.dom.dataset.loadError = 'true';
    this.finishImageLoadingWithMinimumDuration();
  };

  /**
   * 响应图片缩放开始。
   */
  private readonly handleResizePointerDown = (event: PointerEvent): void => {
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

    // 当前手柄方向。
    const side = handle.dataset.side === IMAGE_RESIZE_SIDE_LEFT ? IMAGE_RESIZE_SIDE_LEFT : IMAGE_RESIZE_SIDE_RIGHT;
    // 图片父级元素。
    const container = this.dom.parentElement;
    if (!container) {
      return;
    }

    // 图片矩形。
    const imageRect = this.imageElement.getBoundingClientRect();
    // 容器矩形。
    const containerRect = container.getBoundingClientRect();
    if (imageRect.width <= 0 || containerRect.width <= 0) {
      return;
    }

    // 初始宽度百分比。
    const widthPercent = clampImageWidthPercent((imageRect.width / containerRect.width) * 100);
    this.resizeState = {
      side,
      startClientX: event.clientX,
      startWidth: imageRect.width,
      containerWidth: containerRect.width,
      widthPercent
    };
    this.dom.dataset.resizing = 'true';
    this.applyPreviewWidth(widthPercent);

    window.addEventListener('pointermove', this.handleResizePointerMove);
    window.addEventListener('pointerup', this.handleResizePointerUp);
    window.addEventListener('pointercancel', this.handleResizePointerUp);
  };

  /**
   * 响应图片缩放移动。
   */
  private readonly handleResizePointerMove = (event: PointerEvent): void => {
    if (!this.resizeState) {
      return;
    }

    event.preventDefault();
    // 鼠标横向位移。
    const deltaX = event.clientX - this.resizeState.startClientX;
    // 方向修正后的宽度变化。
    const widthDelta = this.resizeState.side === IMAGE_RESIZE_SIDE_LEFT ? -deltaX : deltaX;
    // 下一张图片宽度。
    const nextWidth = this.resizeState.startWidth + widthDelta;
    // 下一张图片宽度百分比。
    const nextWidthPercent = clampImageWidthPercent((nextWidth / this.resizeState.containerWidth) * 100);

    this.resizeState.widthPercent = nextWidthPercent;
    this.applyPreviewWidth(nextWidthPercent);
  };

  /**
   * 响应图片缩放结束。
   */
  private readonly handleResizePointerUp = (event: PointerEvent): void => {
    event.preventDefault();

    if (!this.resizeState) {
      return;
    }

    // 最终宽度百分比。
    const widthPercent = Math.round(this.resizeState.widthPercent);
    this.resizeState = null;
    delete this.dom.dataset.resizing;
    this.removeResizeWindowListeners();
    this.commitImageWidth(widthPercent);
  };

  /**
   * 移除图片缩放全局监听。
   */
  private removeResizeWindowListeners(): void {
    window.removeEventListener('pointermove', this.handleResizePointerMove);
    window.removeEventListener('pointerup', this.handleResizePointerUp);
    window.removeEventListener('pointercancel', this.handleResizePointerUp);
  }

  /**
   * 应用图片宽度预览。
   */
  private applyPreviewWidth(widthPercent: number): void {
    this.dom.style.width = `${Math.round(widthPercent)}%`;
    this.dom.dataset.hasWidth = 'true';
  }

  /**
   * 提交图片宽度到节点属性。
   */
  private commitImageWidth(widthPercent: number): void {
    // 当前节点位置。
    const nodePosition = resolveNodePosition(this.getPos);
    if (nodePosition === null) {
      return;
    }

    // 下一组节点属性。
    const nextAttrs = {
      ...this.node.attrs,
      style: formatImageWidthStyle(widthPercent)
    };
    // 图片宽度更新事务。
    const transaction = this.view.state.tr.setNodeMarkup(nodePosition, undefined, nextAttrs);
    this.view.dispatch(transaction);
    requestAnimationFrame(() => {
      this.view.focus();
    });
  }

  /**
   * 更新图片 DOM 属性。
   */
  private syncFromNode(node: ProseNode): void {
    this.updateEditableState();
    // 图片地址(文档内原样存储,如相对路径;显示经解析器转换)。
    const src = typeof node.attrs.src === 'string' ? node.attrs.src : '';
    // 图片替代文本。
    const alt = typeof node.attrs.alt === 'string' ? node.attrs.alt : '';
    // 图片标题。
    const title = typeof node.attrs.title === 'string' ? node.attrs.title : '';
    // 图片宽度样式。
    const style = normalizeImageWidthStyle(node.attrs.style);
    // 图片宽度百分比。
    const widthPercent = parseImageWidthPercent(style);
    // 图片地址是否变化。
    const isImageSrcChanged = src !== this.currentImageSrc;

    if (isImageSrcChanged) {
      delete this.dom.dataset.loadError;
      if (src) {
        this.markImageLoading();
      }
    }

    this.imageElement.setAttribute('src', this.resolveImageUrl ? this.resolveImageUrl(src) || src : src);
    this.currentImageSrc = src;
    this.imageElement.setAttribute('alt', alt);
    if (title) {
      this.imageElement.title = title;
    } else {
      this.imageElement.removeAttribute('title');
    }
    if (widthPercent !== null) {
      this.dom.style.width = `${widthPercent}%`;
      this.dom.dataset.hasWidth = 'true';
    } else {
      this.dom.style.removeProperty('width');
      delete this.dom.dataset.hasWidth;
    }
    if (!src) {
      this.finishImageLoading();
    } else if (this.imageElement.complete && this.imageElement.naturalWidth > 0) {
      this.finishImageLoadingWithMinimumDuration();
    }

    // 同步说明文本(用户输入中跳过,避免光标被打断;失焦时由 blur 提交再回填)。
    const isCaptionFocused = document.activeElement === this.captionElement;
    if (!isCaptionFocused && (this.captionElement.textContent ?? '') !== alt) {
      this.captionElement.textContent = alt;
    }
    // 只读态且有说明时仅展示不可编辑;其余可见(占位符引导输入)。
    const isEditable = isEditorViewEditable(this.view);
    this.captionElement.contentEditable = isEditable ? 'true' : 'false';
    this.captionElement.style.display = !isEditable && !alt ? 'none' : '';
  }

  /**
   * 处理节点更新。
   */
  update(node: ProseNode): boolean {
    if (node.type.name !== IMAGE_NODE_NAME) {
      return false;
    }

    this.node = node;
    this.syncFromNode(node);
    this.syncSoloState();
    return true;
  }

  /**
   * 节点被选中时同步图片选中态。
   */
  selectNode(): void {
    this.isSelected = true;
    this.syncSelectedState();
  }

  /**
   * 节点取消选中时同步图片选中态。
   */
  deselectNode(): void {
    this.isSelected = false;
    this.syncSelectedState();
  }

  /**
   * 只拦截删除按钮和缩放手柄内部事件(双击图片交由预览弹窗处理)。
   */
  stopEvent(event: Event): boolean {
    // 事件目标节点。
    const target = event.target;
    if (!(target instanceof Node)) {
      return false;
    }

    return (
      (event.type === 'dblclick' && this.imageElement.contains(target)) ||
      this.deleteButton.contains(target) ||
      this.leftResizeHandle.contains(target) ||
      this.rightResizeHandle.contains(target) ||
      this.captionElement.contains(target) ||
      this.resizeState !== null
    );
  }

  /**
   * 忽略 NodeView 内部的 DOM 变更观察。
   */
  ignoreMutation(): boolean {
    return true;
  }

  /**
   * 销毁时解绑监听器。
   */
  destroy(): void {
    this.isDestroyed = true;
    this.paragraphObserver?.disconnect();
    this.paragraphObserver = null;
    this.observedParagraph = null;
    this.clearCaptionCommitTimer();
    this.removeResizeWindowListeners();
    this.clearImageLoadingFinishTimer();
    this.imageElement.removeEventListener('load', this.handleImageLoad);
    this.imageElement.removeEventListener('error', this.handleImageError);
    this.captionElement.removeEventListener('input', this.handleCaptionInput);
    this.captionElement.removeEventListener('blur', this.handleCaptionBlur);
    this.captionElement.removeEventListener('keydown', this.handleCaptionKeyDown);
    this.deleteButton.removeEventListener('click', this.handleDeleteClick);
    this.imageElement.removeEventListener('dblclick', this.handleImageDoubleClick);
    this.leftResizeHandle.removeEventListener('pointerdown', this.handleResizePointerDown);
    this.rightResizeHandle.removeEventListener('pointerdown', this.handleResizePointerDown);
  }
}

/**
 * 创建 image 的 NodeView 构造器。
 */
export const createImageEditableNodeView = (
  messages: EditorI18nMessages = resolveEditorMessages(),
  resolveImageUrl?: (src: string) => string
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
    return new ImageEditableNodeView(node, view, resolvedGetPos, messages, resolveImageUrl);
  };
};
