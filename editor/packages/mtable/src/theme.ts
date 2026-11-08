/**
 * theme.ts — 视觉常量(1:1 对齐 Univer Sheets 默认主题)
 *
 * 来源:
 * - 尺寸:packages/core/src/sheets/sheet-snapshot-utils.ts(DEFAULT_WORKSHEET_*)
 * - 表头样式:packages/engine-render/src/components/sheets/extensions/column-header-layout.ts(DEFAULT_COLUMN_STYLE)
 * - 网格线:packages/engine-render/src/components/sheets/sheet.render-skeleton.ts(mix(gray.200, gray.900, 0.07))
 * - 选区:packages/sheets-ui/src/services/selection/const.ts(genNormalSelectionStyle)
 * - 字体栈:packages/engine-render/src/basics/const.ts(DEFAULT_FONTFACE_PLANE)
 * - 滚动条:packages/engine-render/src/shape/scroll-bar.ts
 *
 * 设计偏差:表头底/表头 hover/选区填充/行头列头高亮/滚动条/筛选箭头等灰阶色
 * 已由 Univer 蓝调灰改为中性纯灰(原蓝调灰在白底上泛粉,按设计反馈调整);
 * 主色(选区描边/编辑框描边/筛选面板主按钮)保持 Univer primary 不变。
 */

/** 表格单元格与表头字体栈(同 Univer DEFAULT_FONTFACE_PLANE)。 */
export const MTABLE_FONT_FAMILY =
  '"Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Heiti SC", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif';

/** 默认行高(px),同 Univer DEFAULT_WORKSHEET_ROW_HEIGHT。 */
export const DEFAULT_ROW_HEIGHT = 24;

/** 默认列宽(px),同 Univer DEFAULT_WORKSHEET_COLUMN_WIDTH。 */
export const DEFAULT_COLUMN_WIDTH = 88;

/** 行头(行号列)宽度(px),同 Univer DEFAULT_WORKSHEET_ROW_TITLE_WIDTH。 */
export const ROW_HEADER_WIDTH = 46;

/** 列头(字母行)高度(px),同 Univer DEFAULT_WORKSHEET_COLUMN_TITLE_HEIGHT。 */
export const COLUMN_HEADER_HEIGHT = 20;

/** 表头字号(px),同 Univer DEFAULT_COLUMN_STYLE.fontSize。 */
export const HEADER_FONT_SIZE = 13;

/** 单元格文本行高(px,自动换行时每行占高;≈ 13px 字号 × 1.4)。 */
export const CELL_LINE_HEIGHT = 18;

/** 单元格文本水平内边距(px,左右各一份;列宽计算/换行/绘制共用)。 */
export const CELL_TEXT_PADDING = 6;

/** 表头字色,同 Univer gray.900。 */
export const HEADER_TEXT_COLOR = '#1B1C1F';

/** 表头底色 — 中性浅灰(#F7F8F8 = meditor --zt-elevated(fg 4% 混白)的等效值,原 Univer gray.50 #F9FAFB→#F5F5F5 偏深,按设计反馈再改浅)。 */
export const HEADER_BACKGROUND = '#F7F8F8';

/** 表头分隔线色 — 中性浅灰(原 Univer gray.200 #E4E4E4,随边框色体系降档对比改浅)。 */
export const HEADER_BORDER_COLOR = '#EEEEEE';

/** 单元格文本色(同表头字色 gray.900)。 */
export const CELL_TEXT_COLOR = '#1B1C1F';

/** 单元格底色(白)。 */
export const CELL_BACKGROUND = '#FFFFFF';

/**
 * 网格线色 — 原 Univer 公式 mix(gray.200 #E4E4E4, gray.900 #1B1C1F, 0.07) 预计算为 #D6D6D6;
 * 随边框色体系降档对比改为 #E6E6E6(与 meditor --zt-border 同值)。
 */
export const GRID_LINE_COLOR = '#E6E6E6';

/** 选区描边色,同 Univer primary.600。 */
export const SELECTION_STROKE_COLOR = '#2C53F1';

/** 选区填充色 — 中性半透明淡灰(填充画在文字上层,必须带 alpha 才不遮文字;视觉≈#F2F2F2)。 */
export const SELECTION_FILL_COLOR = 'rgba(0, 0, 0, 0.05)';

/** 行头/列头高亮(选区覆盖的行/列)填充色 — 与选区填充同族中性淡灰。 */
export const HEADER_HIGHLIGHT_COLOR = '#F0F0F0';

/** 编辑框聚焦描边色(同选区描边)。 */
export const EDITOR_BORDER_COLOR = '#2C53F1';

/** 行头/列头文字 hover 时的底色(比表头底色深一档,中性灰)。 */
export const HEADER_HOVER_BACKGROUND = '#E8E8E8';

/** 列边界拖拽热区(px,指针距列分隔线该范围内进入拖拽命中)。 */
export const COLUMN_RESIZE_HIT_ZONE = 4;

/** 列宽拖拽下限(px),防止拖没了。 */
export const COLUMN_MIN_WIDTH = 24;

/** 列宽拖拽时叠加在列头/数据区上的竖向定位线色(同选区描边 primary.600)。 */
export const COLUMN_RESIZE_LINE_COLOR = SELECTION_STROKE_COLOR;

// --- 列头筛选/排序箭头(Univer filter-button:16px 图标 + 浅色底) ---

/** 筛选箭头图标直径(px,浅灰圆圈背景)。 */
export const FILTER_ARROW_SIZE = 16;

/** 筛选箭头距列右缘的边距(px)。 */
export const FILTER_ARROW_RIGHT_MARGIN = 5;

/** 筛选箭头圆圈背景(常态,中性浅灰)。 */
export const FILTER_ARROW_BACKGROUND = '#E8E8E8';

/** 筛选箭头圆圈背景(hover/按下,深一档中性灰)。 */
export const FILTER_ARROW_BACKGROUND_HOVER = '#DCDCDC';

/** 筛选箭头图标前景色(灰)。 */
export const FILTER_ARROW_FOREGROUND = '#5F646E';

/** 设置过筛选/排序的列的箭头前景色(同表头字色,视觉更"生效")。 */
export const FILTER_ARROW_FOREGROUND_ACTIVE = '#1B1C1F';

/** devicePixelRatio 缩放上限(超高分屏降采样保护)。 */
export const MAX_DEVICE_PIXEL_RATIO = 3;

// --- 滚动条(packages/engine-render/src/shape/scroll-bar.ts) ---

/**
 * 滚动条轨道带厚度(px),同 Univer DEFAULT_TRACK_SIZE(10)。
 * Univer 在轨道外另有 1px 描边(色同为 gray.0 半透明白,与轨道填充视觉不可分),故带宽取 10。
 */
export const SCROLLBAR_SIZE = 10;

/** 滚动条滑块最小长度(px),同 Univer MIN_THUMB_SIZE。 */
export const SCROLLBAR_MIN_THUMB_SIZE = 17;

/** 滑块默认色 — 中性灰(原 Univer gray.300 #C9CDD4 带蓝调,按设计反馈改纯灰)。 */
export const SCROLLBAR_THUMB_COLOR = '#D4D4D4';

/** 滑块 hover 色 — 深一档中性灰。 */
export const SCROLLBAR_THUMB_HOVER_COLOR = '#BFBFBF';

/** 滑块拖拽中色 — 再深一档中性灰。 */
export const SCROLLBAR_THUMB_ACTIVE_COLOR = '#8F8F8F';

/** 滚动条轨道底色 — 与表头底色同族中性浅灰(随 HEADER_BACKGROUND 同步 #F7F8F8),视觉上与表头连成一体。 */
export const SCROLLBAR_TRACK_COLOR = '#F7F8F8';

/** 冻结行/列分界线颜色(比网格线深一档,2px 线宽;随网格线降档改浅)。 */
export const FREEZE_LINE_COLOR = '#DCDCDC';

/** 滑块圆角半径(px),同 Univer Rect radius 6。 */
export const SCROLLBAR_THUMB_RADIUS = 6;

/** 滑块常态边距(px,距画布右/下缘),同 Univer DEFAULT_THUMB_MARGIN。 */
export const SCROLLBAR_THUMB_MARGIN = 2;

/** 滑块 hover/拖拽时边距收窄(滑块变粗),同 Univer HOVER_THUMB_MARGIN。 */
export const SCROLLBAR_THUMB_HOVER_MARGIN = 1;

/**
 * mix 两个 hex 颜色(Univer ColorKit.mix 的等价实现):
 * 结果 = hexA + (hexB - hexA) * amount,amount 夹在 [0,1]。
 * 供运行时重算主题相关色(当前主题固定,主要供测试/扩展用)。
 */
export function mixHexColor(hexA: string, hexB: string, amount: number): string {
  const clamped = Math.min(1, Math.max(0, amount));
  const parse = (hex: string): [number, number, number] => {
    const value = hex.replace('#', '');
    return [
      Number.parseInt(value.slice(0, 2), 16),
      Number.parseInt(value.slice(2, 4), 16),
      Number.parseInt(value.slice(4, 6), 16)
    ];
  };
  const [r1, g1, b1] = parse(hexA);
  const [r2, g2, b2] = parse(hexB);
  const mix = (a: number, b: number): number => Math.round((b - a) * clamped + a);
  const toHex = (n: number): string => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(r1, r2))}${toHex(mix(g1, g2))}${toHex(mix(b1, b2))}`;
}
