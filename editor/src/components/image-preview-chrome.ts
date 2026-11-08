/**
 * components/image-preview-chrome.ts — 图片预览编辑弹窗的 DOM 骨架构建
 *
 * 纯构建:创建遮罩/头部/舞台/工具栏全部元素并按分组装配,不做任何事件
 * 绑定(回调由 image-preview-editor 的交互层后挂)。元素经 ImagePreviewChrome
 * 返回,交互层只解构自己需要绑定的部分。
 */

import type { EditorI18nMessages } from '../types/editor';
import type { ImagePreviewEditorConfig } from './image-preview-model';
import {
  checkIconMarkup,
  closeIconMarkup,
  COLOR_PRESETS,
  cropIconMarkup,
  DEFAULT_COLOR,
  fitIconMarkup,
  brushIconMarkup,
  arrowIconMarkup,
  lineIconMarkup,
  circleIconMarkup,
  rectIconMarkup,
  mosaicIconMarkup,
  panIconMarkup,
  resetIconMarkup,
  rotateLeftIconMarkup,
  rotateRightIconMarkup,
  STROKE_WIDTH_PRESETS,
  undoIconMarkup,
  zoomInIconMarkup,
  zoomOutIconMarkup,
} from './image-preview-model';

/** 弹窗 DOM 骨架(交互层按需解构)。 */
export interface ImagePreviewChrome {
  overlay: HTMLDivElement;
  closeButton: HTMLButtonElement;
  hintLabel: HTMLSpanElement;
  stage: HTMLDivElement;
  canvas: HTMLCanvasElement;
  zoomOutButton: HTMLButtonElement;
  zoomLabelButton: HTMLButtonElement;
  zoomInButton: HTMLButtonElement;
  fitButton: HTMLButtonElement;
  rotateLeftButton: HTMLButtonElement;
  rotateRightButton: HTMLButtonElement;
  panToolButton: HTMLButtonElement;
  cropConfirmButton: HTMLButtonElement;
  cropCancelButton: HTMLButtonElement;
  cropToolButton: HTMLButtonElement;
  rectToolButton: HTMLButtonElement;
  circleToolButton: HTMLButtonElement;
  lineToolButton: HTMLButtonElement;
  arrowToolButton: HTMLButtonElement;
  brushToolButton: HTMLButtonElement;
  mosaicToolButton: HTMLButtonElement;
  colorSwatches: HTMLButtonElement[];
  customColorInput: HTMLInputElement;
  strokeButtons: HTMLButtonElement[];
  undoButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
  confirmButton: HTMLButtonElement;
}

/**
 * 创建弹窗骨架并挂载到容器(遮罩 → 头部/舞台/工具栏)。
 */
export const buildImagePreviewChrome = (
  config: Pick<ImagePreviewEditorConfig, 'container' | 'editable' | 'messages'>
): ImagePreviewChrome => {
  // --- 弹层骨架 ---
  const overlay = document.createElement('div');
  overlay.className = 'zt-md-ipe-overlay';
  overlay.dataset.editable = config.editable ? 'true' : 'false';
  overlay.dataset.state = 'loading';
  overlay.dataset.crop = 'false';

  const header = document.createElement('div');
  header.className = 'zt-md-ipe-header';

  const titleLabel = document.createElement('span');
  titleLabel.className = 'zt-md-ipe-title';
  titleLabel.textContent = config.messages.imagePreviewDialogTitle;

  const hintLabel = document.createElement('span');
  hintLabel.className = 'zt-md-ipe-hint';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'zt-md-ipe-button zt-md-ipe-close';
  closeButton.setAttribute('aria-label', config.messages.imagePreviewCloseAriaLabel);
  closeButton.title = config.messages.imagePreviewCloseAriaLabel;
  closeButton.innerHTML = closeIconMarkup;

  header.append(titleLabel, hintLabel, closeButton);

  const stage = document.createElement('div');
  stage.className = 'zt-md-ipe-stage';

  const canvas = document.createElement('canvas');
  canvas.className = 'zt-md-ipe-canvas';

  const loadingMask = document.createElement('div');
  loadingMask.className = 'zt-md-ipe-loading';
  loadingMask.innerHTML = '<span class="zt-md-ipe-spinner" aria-hidden="true"></span>';

  const loadErrorMask = document.createElement('div');
  loadErrorMask.className = 'zt-md-ipe-load-error';
  loadErrorMask.textContent = config.messages.imagePreviewLoadFailed;

  stage.append(canvas, loadingMask, loadErrorMask);

  const toolbar = document.createElement('div');
  toolbar.className = 'zt-md-ipe-toolbar';

  /**
   * 创建工具栏图标按钮。
   */
  const createToolbarButton = (
    iconMarkup: string,
    ariaLabel: string,
    extraClass = ''
  ): HTMLButtonElement => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `zt-md-ipe-button${extraClass ? ` ${extraClass}` : ''}`;
    button.setAttribute('aria-label', ariaLabel);
    button.title = ariaLabel;
    button.innerHTML = iconMarkup;
    return button;
  };

  /**
   * 创建工具栏分组。
   */
  const createToolbarGroup = (...children: HTMLElement[]): HTMLDivElement => {
    const group = document.createElement('div');
    group.className = 'zt-md-ipe-group';
    group.append(...children);
    return group;
  };

  /**
   * 创建分组分隔线。
   */
  const createToolbarSeparator = (): HTMLSpanElement => {
    const separator = document.createElement('span');
    separator.className = 'zt-md-ipe-separator';
    separator.setAttribute('aria-hidden', 'true');
    return separator;
  };

  const messages: EditorI18nMessages = config.messages;

  // --- 查看分组 ---
  const zoomOutButton = createToolbarButton(zoomOutIconMarkup, messages.imagePreviewZoomOutAriaLabel);
  const zoomLabelButton = document.createElement('button');
  zoomLabelButton.type = 'button';
  zoomLabelButton.className = 'zt-md-ipe-zoom-label';
  zoomLabelButton.setAttribute('aria-label', messages.imagePreviewZoomActualAriaLabel);
  zoomLabelButton.title = messages.imagePreviewZoomActualAriaLabel;
  zoomLabelButton.textContent = '100%';
  const zoomInButton = createToolbarButton(zoomInIconMarkup, messages.imagePreviewZoomInAriaLabel);
  const fitButton = createToolbarButton(fitIconMarkup, messages.imagePreviewZoomFitAriaLabel);
  const rotateLeftButton = createToolbarButton(rotateLeftIconMarkup, messages.imagePreviewRotateLeftAriaLabel);
  const rotateRightButton = createToolbarButton(rotateRightIconMarkup, messages.imagePreviewRotateRightAriaLabel);
  const panToolButton = createToolbarButton(panIconMarkup, messages.imagePreviewPanAriaLabel);
  const viewGroup = createToolbarGroup(
    zoomOutButton,
    zoomLabelButton,
    zoomInButton,
    fitButton,
    createToolbarSeparator(),
    rotateLeftButton,
    rotateRightButton,
    createToolbarSeparator(),
    panToolButton
  );

  // --- 裁切确认/取消分组(仅裁切模式可见;只读态隐藏) ---
  const cropConfirmButton = createToolbarButton(
    checkIconMarkup,
    messages.imagePreviewCropConfirmAriaLabel,
    'zt-md-ipe-crop-only'
  );
  const cropCancelButton = createToolbarButton(
    closeIconMarkup,
    messages.imagePreviewCropCancelAriaLabel,
    'zt-md-ipe-crop-only'
  );
  const cropActionGroup = createToolbarGroup(cropConfirmButton, cropCancelButton);
  cropActionGroup.classList.add('zt-md-ipe-edit-only');

  // --- 标注工具分组 ---
  const cropToolButton = createToolbarButton(cropIconMarkup, messages.imagePreviewCropAriaLabel);
  const rectToolButton = createToolbarButton(rectIconMarkup, messages.imagePreviewRectAriaLabel);
  const circleToolButton = createToolbarButton(circleIconMarkup, messages.imagePreviewCircleAriaLabel);
  const lineToolButton = createToolbarButton(lineIconMarkup, messages.imagePreviewLineAriaLabel);
  const arrowToolButton = createToolbarButton(arrowIconMarkup, messages.imagePreviewArrowAriaLabel);
  const brushToolButton = createToolbarButton(brushIconMarkup, messages.imagePreviewBrushAriaLabel);
  const mosaicToolButton = createToolbarButton(mosaicIconMarkup, messages.imagePreviewMosaicAriaLabel);
  const toolsGroup = createToolbarGroup(
    cropToolButton,
    rectToolButton,
    circleToolButton,
    lineToolButton,
    arrowToolButton,
    brushToolButton,
    mosaicToolButton
  );
  toolsGroup.classList.add('zt-md-ipe-edit-only');

  // --- 颜色与笔宽分组 ---
  const colorGroup = document.createElement('div');
  colorGroup.className = 'zt-md-ipe-group zt-md-ipe-color-group';
  colorGroup.setAttribute('aria-label', messages.imagePreviewColorLabel);
  /** 预设色板按钮集合(与 COLOR_PRESETS 一一对应)。 */
  const colorSwatches: HTMLButtonElement[] = COLOR_PRESETS.map((presetColor) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'zt-md-ipe-swatch';
    swatch.dataset.color = presetColor;
    swatch.style.backgroundColor = presetColor;
    swatch.setAttribute('aria-label', `${messages.imagePreviewColorLabel} ${presetColor}`);
    swatch.title = presetColor;
    return swatch;
  });
  // 自定义颜色:可见圆环 + 隐藏 input[type=color]。
  const customSwatch = document.createElement('label');
  customSwatch.className = 'zt-md-ipe-swatch zt-md-ipe-swatch-custom';
  customSwatch.title = messages.imagePreviewColorCustomLabel;
  customSwatch.setAttribute('aria-label', messages.imagePreviewColorCustomLabel);
  const customColorInput = document.createElement('input');
  customColorInput.type = 'color';
  customColorInput.value = DEFAULT_COLOR;
  customColorInput.setAttribute('aria-label', messages.imagePreviewColorCustomLabel);
  customSwatch.appendChild(customColorInput);
  colorGroup.append(...colorSwatches, customSwatch);

  const strokeGroup = document.createElement('div');
  strokeGroup.className = 'zt-md-ipe-group zt-md-ipe-stroke-group';
  /** 笔宽按钮集合(细/中/粗)。 */
  const strokeButtons: HTMLButtonElement[] = STROKE_WIDTH_PRESETS.map((_width, index) => {
    const strokeLabels = [
      messages.imagePreviewStrokeThinAriaLabel,
      messages.imagePreviewStrokeMediumAriaLabel,
      messages.imagePreviewStrokeThickAriaLabel
    ];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'zt-md-ipe-button zt-md-ipe-stroke-button';
    button.dataset.widthIndex = String(index);
    button.setAttribute('aria-label', strokeLabels[index] ?? strokeLabels[1]!);
    button.title = strokeLabels[index] ?? strokeLabels[1]!;
    button.innerHTML = `<span class="zt-md-ipe-stroke-dot" style="width:${2 + index * 3}px;height:${2 + index * 3}px"></span>`;
    return button;
  });
  strokeGroup.append(...strokeButtons);

  const styleGroup = createToolbarGroup();
  styleGroup.append(colorGroup, createToolbarSeparator(), strokeGroup);
  styleGroup.classList.add('zt-md-ipe-edit-only');

  // --- 历史/动作分组 ---
  const undoButton = createToolbarButton(undoIconMarkup, messages.imagePreviewUndoAriaLabel);
  const resetButton = createToolbarButton(resetIconMarkup, messages.imagePreviewResetAriaLabel);
  const historyGroup = createToolbarGroup(undoButton, resetButton);
  historyGroup.classList.add('zt-md-ipe-edit-only');

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'zt-md-ipe-text-button';
  cancelButton.textContent = messages.imagePreviewCancelLabel;

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'zt-md-ipe-text-button zt-md-ipe-confirm zt-md-ipe-edit-only';
  confirmButton.textContent = messages.imagePreviewConfirmLabel;

  const actionGroup = createToolbarGroup(cancelButton, confirmButton);

  toolbar.append(
    viewGroup,
    cropActionGroup,
    createToolbarSeparator(),
    toolsGroup,
    styleGroup,
    historyGroup,
    createToolbarSeparator(),
    actionGroup
  );

  overlay.append(header, stage, toolbar);
  config.container.appendChild(overlay);

  return {
    overlay,
    closeButton,
    hintLabel,
    stage,
    canvas,
    zoomOutButton,
    zoomLabelButton,
    zoomInButton,
    fitButton,
    rotateLeftButton,
    rotateRightButton,
    panToolButton,
    cropConfirmButton,
    cropCancelButton,
    cropToolButton,
    rectToolButton,
    circleToolButton,
    lineToolButton,
    arrowToolButton,
    brushToolButton,
    mosaicToolButton,
    colorSwatches,
    customColorInput,
    strokeButtons,
    undoButton,
    resetButton,
    cancelButton,
    confirmButton,
  };
};
