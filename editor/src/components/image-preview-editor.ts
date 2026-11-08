/**
 * components/image-preview-editor.ts — 图片预览与标注编辑弹窗(交互逻辑层)
 *
 * 灯箱式预览:遮罩全屏 + 深色舞台 + 底部工具栏,双击编辑器图片打开。
 * - 查看:滚轮/按钮缩放(围绕指针)、拖拽平移、适应窗口/实际大小、双击切换;
 * - 编辑(可编辑态):旋转 90°、裁切(八向手柄 + 三分线)、矩形/圆形/直线/箭头/
 *   画笔标注、马赛克,颜色与三档笔宽,撤销/还原;
 * - 操作以"烘焙"方式落到工作画布(历史快照上限内可撤销),确认时把工作画布
 *   导出为 Data URL 交给调用方回写图片节点;取消则原图片不动;
 * - 跨域图片优先按 CORS 加载(可编辑),源站不允许时降级为仅预览(编辑锁定),
 *   导出阶段的 SecurityError 也有兜底提示。
 *
 * 本文件只保留交互逻辑;类型/常量/纯函数见 image-preview-model,
 * DOM 骨架构建见 image-preview-chrome。
 */

import {
  cloneCanvas,
  COLOR_PRESETS,
  CROP_HANDLE_HIT_RADIUS,
  type CropHandleId,
  type CropRect,
  DEFAULT_COLOR,
  FIT_PADDING,
  HISTORY_LIMIT,
  type ImagePreviewTool,
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_SIDE,
  MAX_SCALE,
  MIN_CROP_SIZE,
  MIN_SCALE,
  MIN_SHAPE_DRAG_DISTANCE,
  MOSAIC_BLOCK,
  MOSAIC_BRUSH_SCALE,
  RENDER_FALLBACK_DELAY,
  STROKE_WIDTH_PRESETS,
  withAlpha,
  ZOOM_BUTTON_FACTOR,
  type ImagePreviewEditorApi,
  type ImagePreviewEditorConfig,
  type ShapeDraft,
} from './image-preview-model';
import { buildImagePreviewChrome } from './image-preview-chrome';

export type { ImagePreviewEditorApi, ImagePreviewEditorConfig };

/**
 * 创建图片预览编辑弹窗。
 */
export const createImagePreviewEditor = (config: ImagePreviewEditorConfig): ImagePreviewEditorApi => {
  const {
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
  } = buildImagePreviewChrome(config);

  const messages = config.messages;

  // --- 画布与视图状态 ---
  const context2d = canvas.getContext('2d');
  /** 原始图片(加载成功后设置)。 */
  let sourceImage: HTMLImageElement | null = null;
  /** 跨域降级(未带 CORS 加载成功,画布可能被污染)。 */
  let isTainted = false;
  /** 工作画布(旋转/裁切/标注的烘焙结果)。 */
  let working: HTMLCanvasElement | null = null;
  /** 历史快照栈。 */
  const history: HTMLCanvasElement[] = [];
  /** 视图变换:scale 缩放,tx/ty 平移(图像像素 → 画布 CSS 像素)。 */
  const view = { scale: 1, tx: 0, ty: 0 };
  /** 当前标注工具。 */
  let activeTool: ImagePreviewTool = 'pan';
  /** 当前标注颜色。 */
  let activeColor: string = DEFAULT_COLOR;
  /** 笔宽档位下标。 */
  let strokeWidthIndex = 1;
  /** 裁切模式开关。 */
  let isCropMode = false;
  /** 裁切矩形(图像坐标;进入裁切模式时初始化为全图)。 */
  let cropRect: CropRect | null = null;
  /** 马赛克像素画布缓存。 */
  let pixelatedCanvas: HTMLCanvasElement | null = null;
  /** 马赛克缓存是否过期(工作画布被旋转/裁切/撤销后置脏)。 */
  let isPixelatedDirty = true;
  /** 指针拖拽交互状态(pan/shape/brush/mosaic/crop 各异)。 */
  let panDrag: { startClientX: number; startClientY: number; startTx: number; startTy: number } | null = null;
  let shapeDraft: ShapeDraft | null = null;
  let mosaicStroke: { last: { x: number; y: number } | null; radius: number } | null = null;
  let cropDrag:
    | { kind: 'move'; startRect: CropRect; startClientX: number; startClientY: number }
    | { kind: 'resize'; handle: CropHandleId }
    | { kind: 'new'; startPoint: { x: number; y: number } }
    | null = null;
  /** 渲染帧调度标记(rAF 句柄)。 */
  let renderFrame: number | null = null;
  /** rAF 冻结兜底定时器句柄。 */
  let renderFallbackTimer: number | null = null;
  /** 缩放百分比文案缓存(避免每帧重复写 DOM)。 */
  let lastZoomText = '';
  /** 已关闭标记(防重复触发 onClose)。 */
  let isClosed = false;

  // --- 视图变换 ---

  /**
   * 以画布坐标(cx, cy)为不动点缩放。
   */
  const zoomAt = (factor: number, cx: number, cy: number): void => {
    if (!working) {
      return;
    }

    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * factor));
    const ratio = nextScale / view.scale;
    view.tx = cx - (cx - view.tx) * ratio;
    view.ty = cy - (cy - view.ty) * ratio;
    view.scale = nextScale;
    syncToolbarState();
    scheduleRender();
  };

  /**
   * 适应窗口居中(不放大超过 100%)。
   */
  const fitView = (): void => {
    if (!working) {
      return;
    }

    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;
    if (stageWidth <= 0 || stageHeight <= 0) {
      return;
    }

    const fitScale = Math.min(
      (stageWidth - FIT_PADDING) / working.width,
      (stageHeight - FIT_PADDING) / working.height,
      1
    );
    view.scale = Math.max(0.02, fitScale);
    view.tx = (stageWidth - working.width * view.scale) / 2;
    view.ty = (stageHeight - working.height * view.scale) / 2;
    syncToolbarState();
    scheduleRender();
  };

  /**
   * 实际大小(100%)并尽量居中。
   */
  const actualSizeView = (): void => {
    if (!working) {
      return;
    }

    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;
    const centerX = stageWidth / 2;
    const centerY = stageHeight / 2;
    zoomAt(1 / view.scale, centerX, centerY);
    view.scale = 1;
    view.tx = (stageWidth - working.width) / 2;
    view.ty = (stageHeight - working.height) / 2;
    scheduleRender();
  };

  // --- 工作画布与历史 ---

  /**
   * 压入历史快照(超限丢弃最旧)。
   */
  const pushHistory = (): void => {
    if (!working) {
      return;
    }

    history.push(cloneCanvas(working));
    if (history.length > HISTORY_LIMIT) {
      history.shift();
    }
    syncToolbarState();
  };

  /**
   * 撤销:弹回最近一次快照。
   */
  const undo = (): void => {
    const snapshot = history.pop();
    if (!snapshot) {
      return;
    }

    working = snapshot;
    isPixelatedDirty = true;
    if (isCropMode) {
      exitCropMode();
    }
    syncToolbarState();
    scheduleRender();
  };

  /**
   * 还原为原图(保留历史可撤销)。
   */
  const resetToOriginal = (): void => {
    if (!sourceImage) {
      return;
    }

    pushHistory();
    working = createInitialWorkingCanvas(sourceImage);
    isPixelatedDirty = true;
    if (isCropMode) {
      exitCropMode();
    }
    fitView();
  };

  /**
   * 由源图创建初始工作画布(超大图等比降采样)。
   */
  const createInitialWorkingCanvas = (image: HTMLImageElement): HTMLCanvasElement => {
    // 等比降采样比例(1 表示无需缩小)。
    const shrinkRatio = Math.min(
      1,
      MAX_IMAGE_PIXELS / Math.max(1, image.naturalWidth * image.naturalHeight),
      MAX_IMAGE_SIDE / Math.max(1, image.naturalWidth),
      MAX_IMAGE_SIDE / Math.max(1, image.naturalHeight)
    );
    const canvasElement = document.createElement('canvas');
    canvasElement.width = Math.max(1, Math.round(image.naturalWidth * shrinkRatio));
    canvasElement.height = Math.max(1, Math.round(image.naturalHeight * shrinkRatio));
    canvasElement.getContext('2d')?.drawImage(image, 0, 0, canvasElement.width, canvasElement.height);
    return canvasElement;
  };

  /**
   * 获取(必要时重建)马赛克像素画布。
   */
  const ensurePixelatedCanvas = (): HTMLCanvasElement | null => {
    if (!working) {
      return null;
    }

    if (!pixelatedCanvas || isPixelatedDirty) {
      const small = document.createElement('canvas');
      small.width = Math.max(1, Math.ceil(working.width / MOSAIC_BLOCK));
      small.height = Math.max(1, Math.ceil(working.height / MOSAIC_BLOCK));
      const smallContext = small.getContext('2d');
      smallContext?.drawImage(working, 0, 0, small.width, small.height);

      pixelatedCanvas = document.createElement('canvas');
      pixelatedCanvas.width = working.width;
      pixelatedCanvas.height = working.height;
      const pixelatedContext = pixelatedCanvas.getContext('2d');
      if (pixelatedContext) {
        pixelatedContext.imageSmoothingEnabled = false;
        pixelatedContext.drawImage(small, 0, 0, pixelatedCanvas.width, pixelatedCanvas.height);
      }
      isPixelatedDirty = false;
    }
    return pixelatedCanvas;
  };

  /**
   * 旋转工作画布 90°(dir=1 顺时针,-1 逆时针)。
   */
  const rotateWorking = (dir: 1 | -1): void => {
    if (!working) {
      return;
    }

    pushHistory();
    const rotated = document.createElement('canvas');
    rotated.width = working.height;
    rotated.height = working.width;
    const rotatedContext = rotated.getContext('2d');
    if (rotatedContext) {
      rotatedContext.translate(rotated.width / 2, rotated.height / 2);
      rotatedContext.rotate((dir * Math.PI) / 2);
      rotatedContext.drawImage(working, -working.width / 2, -working.height / 2);
    }
    working = rotated;
    isPixelatedDirty = true;
    fitView();
  };

  // --- 形状绘制 ---

  /**
   * 在 2D 上下文(图像坐标系)上绘制形状/笔画草稿。
   */
  const drawShapeDraft = (ctx: CanvasRenderingContext2D, draft: ShapeDraft): void => {
    const first = draft.points[0];
    const last = draft.points[draft.points.length - 1];
    if (!first || !last) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = draft.color;
    ctx.fillStyle = withAlpha(draft.color, 0.14);
    ctx.lineWidth = draft.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (draft.tool === 'brush') {
      ctx.beginPath();
      if (draft.points.length === 1) {
        // 单点落笔:画实心圆点保证可见。
        ctx.arc(first.x, first.y, draft.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = draft.color;
        ctx.fill();
      } else {
        ctx.moveTo(first.x, first.y);
        for (const point of draft.points.slice(1)) {
          ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    const left = Math.min(first.x, last.x);
    const top = Math.min(first.y, last.y);
    const width = Math.abs(last.x - first.x);
    const height = Math.abs(last.y - first.y);

    if (draft.tool === 'rect') {
      ctx.beginPath();
      ctx.rect(left, top, width, height);
      ctx.fill();
      ctx.stroke();
    } else if (draft.tool === 'circle') {
      ctx.beginPath();
      ctx.ellipse(left + width / 2, top + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (draft.tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    } else {
      // 箭头:主线 + 实心箭头头部(头长随线宽,视角缩放下观感一致)。
      const angle = Math.atan2(last.y - first.y, last.x - first.x);
      const headLength = draft.width * 4.5;
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(last.x - headLength * Math.cos(angle - 0.44), last.y - headLength * Math.sin(angle - 0.44));
      ctx.lineTo(last.x - headLength * Math.cos(angle + 0.44), last.y - headLength * Math.sin(angle + 0.44));
      ctx.closePath();
      ctx.fillStyle = draft.color;
      ctx.fill();
    }
    ctx.restore();
  };

  /**
   * 把草稿烘焙进工作画布(先压历史)。
   */
  const bakeShapeDraft = (draft: ShapeDraft): void => {
    if (!working) {
      return;
    }

    pushHistory();
    const workingContext = working.getContext('2d');
    if (workingContext) {
      drawShapeDraft(workingContext, draft);
    }
    scheduleRender();
  };

  /**
   * 马赛克笔画:以像素化画布为"颜料",沿圆头线段蒙版盖印。
   */
  const stampMosaicSegment = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    radius: number
  ): void => {
    if (!working) {
      return;
    }

    const pixelated = ensurePixelatedCanvas();
    const workingContext = working.getContext('2d');
    if (!pixelated || !workingContext) {
      return;
    }

    // 盖印区域(圆头线段外扩 radius)。
    const minX = Math.min(from.x, to.x) - radius;
    const minY = Math.min(from.y, to.y) - radius;
    const regionWidth = Math.ceil(Math.max(from.x, to.x) + radius - minX);
    const regionHeight = Math.ceil(Math.max(from.y, to.y) + radius - minY);
    if (regionWidth <= 0 || regionHeight <= 0) {
      return;
    }

    const scratch = document.createElement('canvas');
    scratch.width = regionWidth;
    scratch.height = regionHeight;
    const scratchContext = scratch.getContext('2d');
    if (!scratchContext) {
      return;
    }

    scratchContext.drawImage(pixelated, minX, minY, regionWidth, regionHeight, 0, 0, regionWidth, regionHeight);
    // 蒙版:仅保留圆头线段覆盖区域。
    scratchContext.globalCompositeOperation = 'destination-in';
    scratchContext.lineWidth = radius * 2;
    scratchContext.lineCap = 'round';
    scratchContext.strokeStyle = '#000';
    scratchContext.beginPath();
    scratchContext.moveTo(from.x - minX, from.y - minY);
    scratchContext.lineTo(to.x - minX, to.y - minY);
    scratchContext.stroke();
    scratchContext.globalCompositeOperation = 'source-over';

    workingContext.drawImage(scratch, minX, minY);
  };

  // --- 渲染 ---

  /**
   * 请求渲染(同帧合并)。常规环境由 rAF 与绘制对齐;部分宿主(遮挡面板/
   * 后台节流标签页)rAF 长期不触发,setTimeout 兜底保证画布必然重绘。
   */
  const scheduleRender = (): void => {
    if (renderFrame !== null) {
      return;
    }

    renderFrame = requestAnimationFrame(() => {
      if (renderFallbackTimer !== null) {
        window.clearTimeout(renderFallbackTimer);
        renderFallbackTimer = null;
      }
      renderFrame = null;
      render();
    });
    renderFallbackTimer = window.setTimeout(() => {
      if (renderFrame === null) {
        return;
      }

      cancelAnimationFrame(renderFrame);
      renderFrame = null;
      render();
    }, RENDER_FALLBACK_DELAY);
  };

  /**
   * 同步画布背衬尺寸(含 devicePixelRatio)。
   */
  const syncCanvasSize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(stage.clientWidth * dpr));
    const height = Math.max(1, Math.round(stage.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  };

  /**
   * 渲染一帧:工作画布(视图变换)+ 形状草稿 + 裁切遮罩。
   */
  const render = (): void => {
    if (isClosed) {
      return;
    }

    const ctx = context2d;
    if (!ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = stage.clientWidth;
    const cssHeight = stage.clientHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    if (working) {
      ctx.save();
      ctx.translate(view.tx, view.ty);
      ctx.scale(view.scale, view.scale);
      ctx.imageSmoothingEnabled = view.scale < 3;
      ctx.drawImage(working, 0, 0);
      if (shapeDraft) {
        drawShapeDraft(ctx, shapeDraft);
      }
      ctx.restore();

      if (isCropMode && cropRect) {
        renderCropOverlay(ctx, cssWidth, cssHeight);
      }
    }

    // 缩放百分比文案(仅在变化时写 DOM)。
    const zoomText = `${Math.round(view.scale * 100)}%`;
    if (zoomText !== lastZoomText) {
      lastZoomText = zoomText;
      zoomLabelButton.textContent = zoomText;
    }
  };

  /**
   * 绘制裁切遮罩(屏幕坐标):外部压暗 + 边框三分线 + 手柄。
   */
  const renderCropOverlay = (
    ctx: CanvasRenderingContext2D,
    cssWidth: number,
    cssHeight: number
  ): void => {
    if (!cropRect) {
      return;
    }

    const left = cropRect.x * view.scale + view.tx;
    const top = cropRect.y * view.scale + view.ty;
    const width = cropRect.width * view.scale;
    const height = cropRect.height * view.scale;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.rect(0, 0, cssWidth, cssHeight);
    ctx.rect(left, top, width, height);
    ctx.fill('evenodd');

    // 边框与三分参考线。
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(left + 0.5, top + 0.5, width - 1, height - 1);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    for (const ratio of [1 / 3, 2 / 3]) {
      ctx.moveTo(left + width * ratio, top);
      ctx.lineTo(left + width * ratio, top + height);
      ctx.moveTo(left, top + height * ratio);
      ctx.lineTo(left + width, top + height * ratio);
    }
    ctx.stroke();

    // 八向手柄。
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    for (const point of getCropHandleScreenPoints()) {
      ctx.beginPath();
      ctx.rect(point.x - 4, point.y - 4, 8, 8);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  };

  /**
   * 裁切手柄的屏幕坐标。
   */
  const getCropHandleScreenPoints = (): Array<{ id: CropHandleId; x: number; y: number }> => {
    if (!cropRect) {
      return [];
    }

    const left = cropRect.x * view.scale + view.tx;
    const top = cropRect.y * view.scale + view.ty;
    const width = cropRect.width * view.scale;
    const height = cropRect.height * view.scale;
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    return [
      { id: 'nw', x: left, y: top },
      { id: 'n', x: centerX, y: top },
      { id: 'ne', x: left + width, y: top },
      { id: 'e', x: left + width, y: centerY },
      { id: 'se', x: left + width, y: top + height },
      { id: 's', x: centerX, y: top + height },
      { id: 'sw', x: left, y: top + height },
      { id: 'w', x: left, y: centerY }
    ];
  };

  // --- 指针交互 ---

  /**
   * 事件坐标转图像坐标。
   */
  const toImagePoint = (event: PointerEvent | MouseEvent): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - view.tx) / view.scale,
      y: (event.clientY - rect.top - view.ty) / view.scale
    };
  };

  /**
   * 命中检测裁切手柄(屏幕距离),未命中返回 null。
   */
  const hitTestCropHandle = (event: MouseEvent): CropHandleId | null => {
    const rect = canvas.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    for (const point of getCropHandleScreenPoints()) {
      if (Math.abs(pointerX - point.x) <= CROP_HANDLE_HIT_RADIUS && Math.abs(pointerY - point.y) <= CROP_HANDLE_HIT_RADIUS) {
        return point.id;
      }
    }
    return null;
  };

  /**
   * 指针是否位于裁切矩形内部(屏幕坐标)。
   */
  const isInsideCropRect = (event: MouseEvent): boolean => {
    if (!cropRect) {
      return false;
    }

    const rect = canvas.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const left = cropRect.x * view.scale + view.tx;
    const top = cropRect.y * view.scale + view.ty;
    return (
      pointerX >= left &&
      pointerX <= left + cropRect.width * view.scale &&
      pointerY >= top &&
      pointerY <= top + cropRect.height * view.scale
    );
  };

  /**
   * 按手柄方位应用裁切矩形调整(以未拖动的对边为锚,边界夹取)。
   */
  const applyCropResize = (handle: CropHandleId, point: { x: number; y: number }): void => {
    if (!cropRect || !working) {
      return;
    }

    let left = cropRect.x;
    let top = cropRect.y;
    let right = cropRect.x + cropRect.width;
    let bottom = cropRect.y + cropRect.height;

    if (handle.includes('w')) {
      left = Math.min(Math.max(0, point.x), right - MIN_CROP_SIZE);
    }
    if (handle.includes('e')) {
      right = Math.max(Math.min(working.width, point.x), left + MIN_CROP_SIZE);
    }
    if (handle.includes('n')) {
      top = Math.min(Math.max(0, point.y), bottom - MIN_CROP_SIZE);
    }
    if (handle.includes('s')) {
      bottom = Math.max(Math.min(working.height, point.y), top + MIN_CROP_SIZE);
    }

    cropRect = { x: left, y: top, width: right - left, height: bottom - top };
  };

  /**
   * 指针按下:按当前模式分流(平移/形状/画笔/马赛克/裁切)。
   */
  const handlePointerDown = (event: PointerEvent): void => {
    if (!working || event.button === 2) {
      return;
    }

    event.preventDefault();
    // 指针捕获失败不阻断绘制(合成事件/部分触控笔下 pointerId 可能无活动指针)。
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // 忽略捕获失败:平移/绘制按普通事件流继续。
    }

    // 中键始终平移。
    if (event.button === 1) {
      startPanDrag(event);
      return;
    }

    if (isCropMode) {
      const handle = hitTestCropHandle(event);
      if (handle) {
        cropDrag = { kind: 'resize', handle };
      } else if (isInsideCropRect(event)) {
        cropDrag = {
          kind: 'move',
          startRect: cropRect ? { ...cropRect } : { x: 0, y: 0, width: 0, height: 0 },
          startClientX: event.clientX,
          startClientY: event.clientY
        };
      } else {
        cropDrag = { kind: 'new', startPoint: toImagePoint(event) };
      }
      return;
    }

    if (activeTool === 'pan') {
      startPanDrag(event);
      return;
    }

    if (!config.editable) {
      return;
    }

    const point = toImagePoint(event);
    const strokeWidth = STROKE_WIDTH_PRESETS[strokeWidthIndex] ?? STROKE_WIDTH_PRESETS[1]!;
    if (activeTool === 'mosaic') {
      pushHistory();
      const brushRadius = (strokeWidth * MOSAIC_BRUSH_SCALE) / 2 / view.scale;
      mosaicStroke = { last: point, radius: brushRadius };
      stampMosaicSegment(point, point, brushRadius);
      scheduleRender();
      return;
    }

    if (activeTool === 'brush') {
      shapeDraft = {
        tool: 'brush',
        points: [point],
        color: activeColor,
        width: strokeWidth / view.scale
      };
      return;
    }

    shapeDraft = {
      tool: activeTool,
      points: [point, point],
      color: activeColor,
      width: strokeWidth / view.scale
    };
  };

  /**
   * 开始平移拖拽。
   */
  const startPanDrag = (event: PointerEvent): void => {
    panDrag = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startTx: view.tx,
      startTy: view.ty
    };
    canvas.dataset.panning = 'true';
  };

  /**
   * 指针移动:按当前交互状态更新。
   */
  const handlePointerMove = (event: PointerEvent): void => {
    if (!working) {
      return;
    }

    if (panDrag) {
      event.preventDefault();
      view.tx = panDrag.startTx + (event.clientX - panDrag.startClientX);
      view.ty = panDrag.startTy + (event.clientY - panDrag.startClientY);
      scheduleRender();
      return;
    }

    if (isCropMode) {
      updateCropInteraction(event);
      return;
    }

    if (mosaicStroke?.last) {
      event.preventDefault();
      const point = toImagePoint(event);
      stampMosaicSegment(mosaicStroke.last, point, mosaicStroke.radius);
      mosaicStroke.last = point;
      scheduleRender();
      return;
    }

    if (shapeDraft) {
      event.preventDefault();
      if (shapeDraft.tool === 'brush') {
        shapeDraft.points.push(toImagePoint(event));
      } else {
        shapeDraft.points[shapeDraft.points.length - 1] = toImagePoint(event);
      }
      scheduleRender();
    }
  };

  /**
   * 裁切模式指针移动:无拖拽时更新手柄悬停光标,拖拽时调整矩形。
   */
  const updateCropInteraction = (event: PointerEvent): void => {
    if (cropDrag) {
      event.preventDefault();
      const point = toImagePoint(event);
      if (cropDrag.kind === 'move') {
        if (!cropRect || !working) {
          return;
        }
        const deltaX = (event.clientX - cropDrag.startClientX) / view.scale;
        const deltaY = (event.clientY - cropDrag.startClientY) / view.scale;
        cropRect.x = Math.min(
          Math.max(0, cropDrag.startRect.x + deltaX),
          Math.max(0, working.width - cropDrag.startRect.width)
        );
        cropRect.y = Math.min(
          Math.max(0, cropDrag.startRect.y + deltaY),
          Math.max(0, working.height - cropDrag.startRect.height)
        );
      } else if (cropDrag.kind === 'resize') {
        applyCropResize(cropDrag.handle, point);
      } else {
        // 框选新矩形(按下点与当前点为对角)。
        applyCropNewRect(cropDrag.startPoint, point);
      }
      scheduleRender();
      return;
    }

    // 悬停光标。
    const handle = hitTestCropHandle(event);
    if (handle) {
      canvas.style.cursor = CROP_HANDLE_CURSORS[handle];
    } else {
      canvas.style.cursor = 'default';
    }
  };

  /**
   * 框选新裁切矩形(两点为对角,夹取进图像范围)。
   */
  const applyCropNewRect = (
    startPoint: { x: number; y: number },
    point: { x: number; y: number }
  ): void => {
    if (!working) {
      return;
    }

    const left = Math.max(0, Math.min(startPoint.x, point.x));
    const top = Math.max(0, Math.min(startPoint.y, point.y));
    const right = Math.min(working.width, Math.max(startPoint.x, point.x));
    const bottom = Math.min(working.height, Math.max(startPoint.y, point.y));
    cropRect = { x: left, y: top, width: right - left, height: bottom - top };
  };

  /** 裁切手柄 → 光标方位映射。 */
  const CROP_HANDLE_CURSORS: Record<CropHandleId, string> = {
    nw: 'nwse-resize',
    se: 'nwse-resize',
    ne: 'nesw-resize',
    sw: 'nesw-resize',
    n: 'ns-resize',
    s: 'ns-resize',
    e: 'ew-resize',
    w: 'ew-resize'
  };

  /**
   * 指针抬起:烘焙草稿并清理交互状态。
   */
  const handlePointerUp = (): void => {
    if (panDrag) {
      panDrag = null;
      delete canvas.dataset.panning;
      syncCursor();
      return;
    }

    if (cropDrag) {
      cropDrag = null;
      syncCursor();
      return;
    }

    if (mosaicStroke) {
      mosaicStroke = null;
      return;
    }

    if (shapeDraft) {
      const draft = shapeDraft;
      shapeDraft = null;
      // 位移过小的点击不生成退化图形(画笔单点除外)。
      const first = draft.points[0];
      const last = draft.points[draft.points.length - 1];
      if (first && last) {
        const dragDistance = Math.hypot(last.x - first.x, last.y - first.y) * view.scale;
        if (draft.tool === 'brush' || dragDistance >= MIN_SHAPE_DRAG_DISTANCE) {
          bakeShapeDraft(draft);
        }
      }
      scheduleRender();
    }
  };

  /**
   * 指针中断:放弃进行中的草稿(马赛克已落盘,保留)。
   */
  const handlePointerCancel = (): void => {
    panDrag = null;
    shapeDraft = null;
    mosaicStroke = null;
    cropDrag = null;
    delete canvas.dataset.panning;
    syncCursor();
    scheduleRender();
  };

  /**
   * 滚轮缩放(围绕指针位置)。
   */
  const handleWheel = (event: WheelEvent): void => {
    if (!working) {
      return;
    }

    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const factor = Math.min(2, Math.max(0.5, 1.0015 ** -event.deltaY));
    zoomAt(factor, event.clientX - rect.left, event.clientY - rect.top);
  };

  /**
   * 双击舞台:适应窗口 ↔ 实际大小。
   */
  const handleStageDoubleClick = (event: MouseEvent): void => {
    if (!working) {
      return;
    }

    event.preventDefault();
    if (Math.abs(view.scale - 1) < 0.01) {
      fitView();
    } else {
      actualSizeView();
    }
  };

  /**
   * 按当前工具/模式同步画布光标。
   */
  const syncCursor = (): void => {
    if (isCropMode) {
      canvas.style.cursor = 'default';
      return;
    }
    if (activeTool === 'pan') {
      canvas.style.cursor = 'grab';
      return;
    }
    canvas.style.cursor = 'crosshair';
  };

  // --- 裁切模式 ---

  /**
   * 进入裁切模式(矩形初始化为全图)。
   */
  const enterCropMode = (): void => {
    if (!working) {
      return;
    }

    isCropMode = true;
    cropRect = { x: 0, y: 0, width: working.width, height: working.height };
    overlay.dataset.crop = 'true';
    syncToolbarState();
    syncCursor();
    scheduleRender();
  };

  /**
   * 退出裁切模式(放弃未应用的调整)。
   */
  const exitCropMode = (): void => {
    isCropMode = false;
    cropRect = null;
    cropDrag = null;
    overlay.dataset.crop = 'false';
    syncToolbarState();
    syncCursor();
    scheduleRender();
  };

  /**
   * 应用裁切:把矩形区域烘焙为新的工作画布。
   */
  const applyCrop = (): void => {
    if (!working || !cropRect) {
      return;
    }

    // 全图裁切等价于无操作;误点产生的极小矩形直接放弃。
    if (
      cropRect.width < MIN_CROP_SIZE ||
      cropRect.height < MIN_CROP_SIZE ||
      (cropRect.x <= 0 &&
        cropRect.y <= 0 &&
        cropRect.width >= working.width &&
        cropRect.height >= working.height)
    ) {
      exitCropMode();
      return;
    }

    pushHistory();
    const cropped = document.createElement('canvas');
    cropped.width = Math.max(1, Math.round(cropRect.width));
    cropped.height = Math.max(1, Math.round(cropRect.height));
    cropped
      .getContext('2d')
      ?.drawImage(
        working,
        Math.round(cropRect.x),
        Math.round(cropRect.y),
        cropped.width,
        cropped.height,
        0,
        0,
        cropped.width,
        cropped.height
      );
    working = cropped;
    isPixelatedDirty = true;
    exitCropMode();
    fitView();
  };

  // --- 工具栏状态 ---

  /** 工具按钮与工具名的映射(用于点亮激活态)。 */
  const toolButtons: Array<{ tool: ImagePreviewTool | 'crop'; button: HTMLButtonElement }> = [
    { tool: 'pan', button: panToolButton },
    { tool: 'crop', button: cropToolButton },
    { tool: 'rect', button: rectToolButton },
    { tool: 'circle', button: circleToolButton },
    { tool: 'line', button: lineToolButton },
    { tool: 'arrow', button: arrowToolButton },
    { tool: 'brush', button: brushToolButton },
    { tool: 'mosaic', button: mosaicToolButton }
  ];

  /**
   * 同步工具栏按钮态(激活/禁用/裁切可见性)。
   */
  const syncToolbarState = (): void => {
    for (const entry of toolButtons) {
      const isActive =
        entry.tool === 'crop' ? isCropMode : entry.tool === activeTool && !isCropMode;
      entry.button.dataset.active = isActive ? 'true' : 'false';
      entry.button.disabled = isCropMode && entry.tool !== 'crop';
    }

    cropConfirmButton.disabled = !cropRect;
    undoButton.disabled = history.length === 0;
    confirmButton.disabled = !working;
    zoomInButton.disabled = !working || view.scale >= MAX_SCALE;
    zoomOutButton.disabled = !working || view.scale <= MIN_SCALE;
    fitButton.disabled = !working;
    zoomLabelButton.disabled = !working;
    rotateLeftButton.disabled = !working;
    rotateRightButton.disabled = !working;
    for (const swatch of colorSwatches) {
      swatch.dataset.active = swatch.dataset.color === activeColor ? 'true' : 'false';
    }
    for (const button of strokeButtons) {
      button.dataset.active = button.dataset.widthIndex === String(strokeWidthIndex) ? 'true' : 'false';
    }
  };

  /**
   * 设置当前标注工具(裁切按钮进入裁切模式)。
   */
  const setActiveTool = (tool: ImagePreviewTool): void => {
    if (tool === activeTool) {
      return;
    }

    activeTool = tool;
    if (isCropMode) {
      exitCropMode();
    }
    syncToolbarState();
    syncCursor();
  };

  // --- 导出与关闭 ---

  /**
   * 把工作画布导出为 Data URL(jpeg 源回写 jpeg 以控制体积,其余 PNG)。
   */
  const exportWorkingDataUrl = (): string => {
    if (!working) {
      throw new Error('Nothing to export');
    }

    if (/^data:image\/jpe?g/i.test(config.src)) {
      // JPEG 不支持透明:先铺白底再合成。
      const flattened = document.createElement('canvas');
      flattened.width = working.width;
      flattened.height = working.height;
      const flattenedContext = flattened.getContext('2d');
      if (flattenedContext) {
        flattenedContext.fillStyle = '#ffffff';
        flattenedContext.fillRect(0, 0, flattened.width, flattened.height);
        flattenedContext.drawImage(working, 0, 0);
      }
      return flattened.toDataURL('image/jpeg', 0.92);
    }
    return working.toDataURL('image/png');
  };

  /**
   * 确认:导出并回调,失败(跨域污染)时提示且不关闭。
   */
  const confirm = (): void => {
    if (!working) {
      return;
    }

    let dataUrl: string;
    try {
      dataUrl = exportWorkingDataUrl();
    } catch {
      hintLabel.textContent = messages.imagePreviewExportFailed;
      return;
    }

    config.onConfirm(dataUrl);
    close();
  };

  /**
   * 关闭弹窗并清理全部监听。
   */
  const close = (): void => {
    if (isClosed) {
      return;
    }

    isClosed = true;
    if (renderFrame !== null) {
      cancelAnimationFrame(renderFrame);
      renderFrame = null;
    }
    if (renderFallbackTimer !== null) {
      window.clearTimeout(renderFallbackTimer);
      renderFallbackTimer = null;
    }
    resizeObserver.disconnect();
    window.removeEventListener('keydown', handleKeyDown, true);
    closeButton.removeEventListener('click', handleCloseClick);
    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerup', handlePointerUp);
    canvas.removeEventListener('pointercancel', handlePointerCancel);
    canvas.removeEventListener('wheel', handleWheel);
    canvas.removeEventListener('dblclick', handleStageDoubleClick);
    canvas.removeEventListener('contextmenu', handleContextMenu);
    stage.removeEventListener('mousedown', preventStageMouseDown);
    zoomOutButton.removeEventListener('click', handleZoomOutClick);
    zoomInButton.removeEventListener('click', handleZoomInClick);
    zoomLabelButton.removeEventListener('click', handleZoomLabelClick);
    fitButton.removeEventListener('click', handleFitClick);
    rotateLeftButton.removeEventListener('click', handleRotateLeftClick);
    rotateRightButton.removeEventListener('click', handleRotateRightClick);
    panToolButton.removeEventListener('click', handlePanToolClick);
    cropToolButton.removeEventListener('click', handleCropToolClick);
    cropConfirmButton.removeEventListener('click', handleCropConfirmClick);
    cropCancelButton.removeEventListener('click', handleCropCancelClick);
    rectToolButton.removeEventListener('click', handleRectToolClick);
    circleToolButton.removeEventListener('click', handleCircleToolClick);
    lineToolButton.removeEventListener('click', handleLineToolClick);
    arrowToolButton.removeEventListener('click', handleArrowToolClick);
    brushToolButton.removeEventListener('click', handleBrushToolClick);
    mosaicToolButton.removeEventListener('click', handleMosaicToolClick);
    undoButton.removeEventListener('click', handleUndoClick);
    resetButton.removeEventListener('click', handleResetClick);
    cancelButton.removeEventListener('click', handleCloseClick);
    confirmButton.removeEventListener('click', handleConfirmClick);
    for (const [index, swatch] of colorSwatches.entries()) {
      const handler = colorSwatchHandlers[index];
      if (handler) {
        swatch.removeEventListener('click', handler);
      }
    }
    customColorInput.removeEventListener('input', handleCustomColorInput);
    for (const [index, button] of strokeButtons.entries()) {
      const handler = strokeButtonHandlers[index];
      if (handler) {
        button.removeEventListener('click', handler);
      }
    }
    overlay.remove();
    config.onClose?.();
  };

  // --- 事件监听(具名处理器,关闭时逐一解绑) ---

  const handleCloseClick = (): void => {
    close();
  };
  const handleConfirmClick = (): void => {
    confirm();
  };
  const handleZoomOutClick = (): void => {
    zoomAt(1 / ZOOM_BUTTON_FACTOR, stage.clientWidth / 2, stage.clientHeight / 2);
  };
  const handleZoomInClick = (): void => {
    zoomAt(ZOOM_BUTTON_FACTOR, stage.clientWidth / 2, stage.clientHeight / 2);
  };
  const handleZoomLabelClick = (): void => {
    actualSizeView();
  };
  const handleFitClick = (): void => {
    fitView();
  };
  const handleRotateLeftClick = (): void => {
    if (config.editable) {
      rotateWorking(-1);
    }
  };
  const handleRotateRightClick = (): void => {
    if (config.editable) {
      rotateWorking(1);
    }
  };
  const handlePanToolClick = (): void => {
    setActiveTool('pan');
  };
  const handleCropToolClick = (): void => {
    if (isCropMode) {
      exitCropMode();
    } else {
      enterCropMode();
    }
  };
  const handleCropConfirmClick = (): void => {
    applyCrop();
  };
  const handleCropCancelClick = (): void => {
    exitCropMode();
  };
  const handleRectToolClick = (): void => {
    setActiveTool('rect');
  };
  const handleCircleToolClick = (): void => {
    setActiveTool('circle');
  };
  const handleLineToolClick = (): void => {
    setActiveTool('line');
  };
  const handleArrowToolClick = (): void => {
    setActiveTool('arrow');
  };
  const handleBrushToolClick = (): void => {
    setActiveTool('brush');
  };
  const handleMosaicToolClick = (): void => {
    setActiveTool('mosaic');
  };
  const handleUndoClick = (): void => {
    if (config.editable) {
      undo();
    }
  };
  const handleResetClick = (): void => {
    if (config.editable) {
      resetToOriginal();
    }
  };
  /**
   * 预设色板点击(工厂生成监听器,关闭时按同序解绑)。
   */
  const colorSwatchHandlers = colorSwatches.map((swatch, index) => {
    const handler = (): void => {
      activeColor = COLOR_PRESETS[index] ?? DEFAULT_COLOR;
      syncToolbarState();
    };
    swatch.addEventListener('click', handler);
    return handler;
  });
  const handleCustomColorInput = (): void => {
    activeColor = customColorInput.value;
    syncToolbarState();
  };
  customColorInput.addEventListener('input', handleCustomColorInput);
  const strokeButtonHandlers = strokeButtons.map((button, index) => {
    const handler = (): void => {
      strokeWidthIndex = index;
      syncToolbarState();
    };
    button.addEventListener('click', handler);
    return handler;
  });

  /**
   * 阻止舞台空白处按下触发的原生拖选。
   */
  const preventStageMouseDown = (event: MouseEvent): void => {
    if (event.target === stage) {
      event.preventDefault();
    }
  };

  /**
   * 画布内禁用右键菜单(标注拖拽误触右键时避免弹出系统菜单)。
   */
  const handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  /**
   * 键盘:Esc 关闭/退出裁切,Ctrl/Cmd+Z 撤销。
   */
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (isCropMode) {
        exitCropMode();
      } else {
        close();
      }
      return;
    }

    const modKey = event.metaKey || event.ctrlKey;
    if (modKey && event.key.toLowerCase() === 'z' && config.editable && !isCropMode) {
      event.preventDefault();
      event.stopPropagation();
      undo();
    }
  };

  /**
   * 舞台尺寸变化:重设画布背衬并重新适应窗口。
   */
  const resizeObserver = new ResizeObserver(() => {
    syncCanvasSize();
    if (working) {
      fitView();
    } else {
      scheduleRender();
    }
  });
  resizeObserver.observe(stage);

  // --- 装配事件 ---
  closeButton.addEventListener('click', handleCloseClick);
  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerCancel);
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  canvas.addEventListener('dblclick', handleStageDoubleClick);
  canvas.addEventListener('contextmenu', handleContextMenu);
  stage.addEventListener('mousedown', preventStageMouseDown);
  zoomOutButton.addEventListener('click', handleZoomOutClick);
  zoomInButton.addEventListener('click', handleZoomInClick);
  zoomLabelButton.addEventListener('click', handleZoomLabelClick);
  fitButton.addEventListener('click', handleFitClick);
  rotateLeftButton.addEventListener('click', handleRotateLeftClick);
  rotateRightButton.addEventListener('click', handleRotateRightClick);
  panToolButton.addEventListener('click', handlePanToolClick);
  cropToolButton.addEventListener('click', handleCropToolClick);
  cropConfirmButton.addEventListener('click', handleCropConfirmClick);
  cropCancelButton.addEventListener('click', handleCropCancelClick);
  rectToolButton.addEventListener('click', handleRectToolClick);
  circleToolButton.addEventListener('click', handleCircleToolClick);
  lineToolButton.addEventListener('click', handleLineToolClick);
  arrowToolButton.addEventListener('click', handleArrowToolClick);
  brushToolButton.addEventListener('click', handleBrushToolClick);
  mosaicToolButton.addEventListener('click', handleMosaicToolClick);
  undoButton.addEventListener('click', handleUndoClick);
  resetButton.addEventListener('click', handleResetClick);
  cancelButton.addEventListener('click', handleCloseClick);
  confirmButton.addEventListener('click', handleConfirmClick);

  // --- 图片加载 ---
  /**
   * 加载成功:初始化工作画布并适应窗口。
   */
  const handleSourceLoad = (): void => {
    if (isClosed || !sourceImage || !sourceImage.naturalWidth || !sourceImage.naturalHeight) {
      overlay.dataset.state = 'error';
      return;
    }

    working = createInitialWorkingCanvas(sourceImage);
    syncCanvasSize();
    fitView();
    overlay.dataset.state = 'ready';
    // 跨域降级加载成功:画布将被污染,锁定编辑并提示仅预览。
    if (isTainted) {
      overlay.dataset.editable = 'false';
      hintLabel.textContent = messages.imagePreviewEditDisabledHint;
    }
    syncToolbarState();
  };

  /**
   * 加载失败:CORS 加载失败时降级为无 CORS 重试(仅预览)。
   */
  const handleSourceError = (): void => {
    if (isClosed) {
      return;
    }

    if (sourceImage && !isTainted && /^https?:/i.test(config.src)) {
      // 降级重试:不带 crossOrigin 再加载一次(画布将被污染,编辑锁定)。
      isTainted = true;
      const retryImage = new Image();
      retryImage.onload = handleSourceLoad;
      retryImage.onerror = () => {
        overlay.dataset.state = 'error';
      };
      sourceImage = retryImage;
      retryImage.src = config.src;
      return;
    }

    overlay.dataset.state = 'error';
  };

  const loadImage = (): void => {
    if (!config.src) {
      overlay.dataset.state = 'error';
      return;
    }

    const image = new Image();
    if (/^https?:/i.test(config.src)) {
      image.crossOrigin = 'anonymous';
    }
    image.onload = handleSourceLoad;
    image.onerror = handleSourceError;
    sourceImage = image;
    image.src = config.src;
  };

  /**
   * 打开弹窗:挂载、聚焦、加载图片。
   */
  const open = (): void => {
    overlay.dataset.open = 'true';
    window.addEventListener('keydown', handleKeyDown, true);
    loadImage();
    syncToolbarState();
    syncCursor();
    // 只读态仅保留查看能力(编辑分组整组隐藏)。
    if (!config.editable) {
      overlay.dataset.editable = 'false';
    }
    requestAnimationFrame(() => {
      closeButton.focus();
    });
  };

  return { open, close };
};
