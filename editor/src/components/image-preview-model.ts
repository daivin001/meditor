/**
 * components/image-preview-model.ts — 图片预览编辑弹窗的模型层
 *
 * 类型、常量与纯函数(颜色解析/画布克隆/图标 markup),与弹窗的 DOM 构建
 * (image-preview-chrome)和交互逻辑(image-preview-editor)分离。
 */

import type { EditorI18nMessages } from '../types/editor';

/** 图片预览编辑弹窗配置。 */
export interface ImagePreviewEditorConfig {
  /** 弹窗挂载容器。 */
  container: HTMLElement;
  /** 图片地址。 */
  src: string;
  /** 编辑器文案。 */
  messages: EditorI18nMessages;
  /** 编辑器是否可编辑(只读态仅保留查看能力)。 */
  editable: boolean;
  /** 确认回调(携带编辑后的 Data URL)。 */
  onConfirm: (dataUrl: string) => void;
  /** 关闭回调(取消或确认后都会触发;一次性宿主用它在关闭后卸载)。 */
  onClose?: () => void;
}

/** 图片预览编辑弹窗 API。 */
export interface ImagePreviewEditorApi {
  open: () => void;
  close: () => void;
}

/** 标注工具名(pan 为移动画布,crop 为裁切模式)。 */
export type ImagePreviewTool = 'pan' | 'rect' | 'circle' | 'line' | 'arrow' | 'brush' | 'mosaic';

/** 裁切手柄方位。 */
export type CropHandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/** 缩放范围下限。 */
export const MIN_SCALE = 0.05;
/** 缩放范围上限。 */
export const MAX_SCALE = 16;
/** 缩放按钮步进系数。 */
export const ZOOM_BUTTON_FACTOR = 1.25;
/** 适应窗口时的舞台留白。 */
export const FIT_PADDING = 48;
/** 初始导入超大图时的面积上限(超出等比缩小,规避画布尺寸上限)。 */
export const MAX_IMAGE_PIXELS = 24_000_000;
/** 初始导入超大图时的单边上限。 */
export const MAX_IMAGE_SIDE = 8192;
/** 历史快照上限(每项为一张工作画布克隆)。 */
export const HISTORY_LIMIT = 20;
/** 马赛克像素块尺寸(图像像素)。 */
export const MOSAIC_BLOCK = 8;
/** 马赛克画笔直径相对笔宽预设的放大系数(屏幕像素)。 */
export const MOSAIC_BRUSH_SCALE = 6;
/** 笔宽预设(屏幕像素)。 */
export const STROKE_WIDTH_PRESETS = [2, 4, 7] as const;
/** 标注预设颜色。 */
export const COLOR_PRESETS = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#ffffff', '#111827'] as const;
/** 默认标注颜色。 */
export const DEFAULT_COLOR = COLOR_PRESETS[0];
/** 裁切最小边长(图像像素)。 */
export const MIN_CROP_SIZE = 16;
/** 裁切手柄命中半径(屏幕像素)。 */
export const CROP_HANDLE_HIT_RADIUS = 12;
/** 点击成形的形状最小位移(屏幕像素),避免误点生成退化图形。 */
export const MIN_SHAPE_DRAG_DISTANCE = 3;
/** rAF 冻结兜底渲染延迟:遮挡/节流环境下 rAF 可能长期不触发,超时后强制重绘。 */
export const RENDER_FALLBACK_DELAY = 64;

/**
 * 构建内联 SVG 图标 markup(lucide 风格线条)。
 */
export const buildIconMarkup = (paths: string, size = 16): string => {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
  );
};

// 关闭图标(X)。
export const closeIconMarkup = buildIconMarkup('<path d="M18 6 6 18M6 6l12 12"/>');
// 放大图标(ZoomIn)。
export const zoomInIconMarkup = buildIconMarkup('<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/>');
// 缩小图标(ZoomOut)。
export const zoomOutIconMarkup = buildIconMarkup('<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/>');
// 适应窗口图标(Maximize)。
export const fitIconMarkup = buildIconMarkup('<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>');
// 左旋图标(RotateCcw)。
export const rotateLeftIconMarkup = buildIconMarkup('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>');
// 右旋图标(RotateCw)。
export const rotateRightIconMarkup = buildIconMarkup('<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>');
// 移动画布图标(Hand)。
export const panIconMarkup = buildIconMarkup('<path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="m7 15-1.76-1.76a2 2 0 0 0-2.83 2.82l3.6 3.6C7.5 21.14 9.2 22 12 22h2a8 8 0 0 0 8-8V7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v4"/>');
// 裁切图标(Crop)。
export const cropIconMarkup = buildIconMarkup('<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>');
// 矩形图标(Square)。
export const rectIconMarkup = buildIconMarkup('<rect width="18" height="18" x="3" y="3" rx="2"/>');
// 圆形图标(Circle)。
export const circleIconMarkup = buildIconMarkup('<circle cx="12" cy="12" r="10"/>');
// 直线图标(Minus,斜置线段)。
export const lineIconMarkup = buildIconMarkup('<line x1="5" y1="19" x2="19" y2="5"/>');
// 箭头图标(ArrowUpRight)。
export const arrowIconMarkup = buildIconMarkup('<line x1="6" y1="18" x2="18" y2="6"/><polyline points="9 6 18 6 18 15"/>');
// 画笔图标(Pencil)。
export const brushIconMarkup = buildIconMarkup('<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>');
// 马赛克图标(Grid2x2)。
export const mosaicIconMarkup = buildIconMarkup('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18M12 3v18"/>');
// 撤销图标(Undo2)。
export const undoIconMarkup = buildIconMarkup('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>');
// 还原图标(RefreshCcw)。
export const resetIconMarkup = buildIconMarkup('<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>');
// 对勾图标(Check)。
export const checkIconMarkup = buildIconMarkup('<path d="M20 6 9 17l-5-5"/>');

/**
 * 十六进制颜色解析为 RGB(非法输入回退红色)。
 */
export const parseHexColor = (value: string): { red: number; green: number; blue: number } => {
  const matched = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!matched) {
    return { red: 244, green: 63, blue: 94 };
  }

  // 规范化的六位十六进制体。
  const hex = matched[1]?.length === 3
    ? matched[1]?.split('').map((char) => char + char).join('')
    : matched[1]!;
  return {
    red: Number.parseInt(hex.slice(0, 2), 16),
    green: Number.parseInt(hex.slice(2, 4), 16),
    blue: Number.parseInt(hex.slice(4, 6), 16)
  };
};

/**
 * 颜色加透明度转为 rgba() 字符串。
 */
export const withAlpha = (color: string, alpha: number): string => {
  const { red, green, blue } = parseHexColor(color);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

/**
 * 创建画布克隆快照。
 */
export const cloneCanvas = (source: HTMLCanvasElement): HTMLCanvasElement => {
  const cloned = document.createElement('canvas');
  cloned.width = source.width;
  cloned.height = source.height;
  cloned.getContext('2d')?.drawImage(source, 0, 0);
  return cloned;
};

/** 形状/笔画草稿(图像坐标)。 */
export interface ShapeDraft {
  tool: 'rect' | 'circle' | 'line' | 'arrow' | 'brush';
  points: Array<{ x: number; y: number }>;
  color: string;
  /** 图像坐标下的线宽(屏幕线宽 / 缩放)。 */
  width: number;
}

/** 裁切矩形(图像坐标)。 */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
