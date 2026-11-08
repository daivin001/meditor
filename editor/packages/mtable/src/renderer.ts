/**
 * renderer.ts — Canvas 渲染器
 *
 * 与 Univer 同构的画布绘制:
 * - 左上角 + 列头(A B C …) + 行头(1 2 3 …) + 数据网格
 * - 网格线 1px、表头 gray.50 底 + gray.200 分隔、选区 primary.600 描边 + alpha 0.07 填充
 * - 选区覆盖的行头/列头同色高亮(对齐 genNormalSelectionStyle 的 rowHeaderFill/columnHeaderFill)
 * - 滚动条:轨道常显 + 比例滑块(对齐 scroll-bar.ts,几何公开给宿主做命中测试/拖拽映射)
 * - devicePixelRatio 缩放保证高分屏清晰
 *
 * 文本测量/断行在 text-measure.ts,命中测试在 renderer-hit-test.ts(本类保留
 * 同名方法做委托,公开 API 不变)。
 */

import {
  CELL_BACKGROUND,
  CELL_LINE_HEIGHT,
  CELL_TEXT_COLOR,
  CELL_TEXT_PADDING,
  COLUMN_RESIZE_LINE_COLOR,
  FILTER_ARROW_BACKGROUND,
  FILTER_ARROW_BACKGROUND_HOVER,
  FILTER_ARROW_FOREGROUND,
  FILTER_ARROW_FOREGROUND_ACTIVE,
  FILTER_ARROW_RIGHT_MARGIN,
  FILTER_ARROW_SIZE,
  GRID_LINE_COLOR,
  HEADER_BACKGROUND,
  HEADER_BORDER_COLOR,
  HEADER_FONT_SIZE,
  HEADER_HIGHLIGHT_COLOR,
  HEADER_HOVER_BACKGROUND,
  HEADER_TEXT_COLOR,
  MAX_DEVICE_PIXEL_RATIO,
  MTABLE_FONT_FAMILY,
  SCROLLBAR_MIN_THUMB_SIZE,
  SCROLLBAR_SIZE,
  SCROLLBAR_THUMB_ACTIVE_COLOR,
  SCROLLBAR_THUMB_COLOR,
  SCROLLBAR_THUMB_HOVER_COLOR,
  SCROLLBAR_THUMB_HOVER_MARGIN,
  SCROLLBAR_THUMB_MARGIN,
  SCROLLBAR_THUMB_RADIUS,
  SCROLLBAR_TRACK_COLOR,
  FREEZE_LINE_COLOR,
  SELECTION_FILL_COLOR,
  SELECTION_STROKE_COLOR
} from './theme';
import { numberToAbc } from './csv';
import { ellipsisTextLine, wrapCellText } from './text-measure';
import {
  hitTestCell as hitTestCellImpl,
  hitTestFilterArrow as hitTestFilterArrowImpl,
  hitTestHeader as hitTestHeaderImpl,
  hitTestScrollbar as hitTestScrollbarImpl
} from './renderer-hit-test';
import type { MtableSelection } from './types';

/** 渲染器依赖的数据视图(由 mtable 主类提供)。 */
export interface RenderSource {
  /** 数据模型只读访问。 */
  readonly cells: string[][];
  readonly columnWidths: number[];
  readonly rowHeights: number[];
  /**
   * 被筛选隐藏的数据行号集合(渲染层跳过绘制并把其行高从布局折叠为 0)。
   * 空集合 = 无筛选,全量渲染。行头仍显示原始行号,隐藏行不占布局。
   */
  readonly hiddenRows: ReadonlySet<number>;
  /** 当前选区(null = 无选区,不绘制选中框)。 */
  readonly selection: MtableSelection | null;
  /** 正在编辑的单元格(null = 未编辑)。 */
  readonly editing: { row: number; col: number } | null;
  /** 鼠标悬停的表头(null = 无)。 */
  readonly hoveredHeader: { type: 'row' | 'col'; index: number } | null;
  /** 冻结行(0 基数据行号,该行及其上固定在顶部;-1 = 无冻结)。 */
  readonly freezeRow: number;
  /** 冻结列(0 基列号,该列及其左固定在左侧;-1 = 无冻结)。 */
  readonly freezeCol: number;
  /** 单元格文本对齐(数字右对齐,其余左对齐,同 Excel/Univer 默认)。 */
  isNumericCell(row: number, col: number): boolean;
  /**
   * 设置过筛选(选值子集)或排序的列号集合(渲染箭头"生效"态)。
   * 返回值会被渲染器缓存,应在筛选/排序变化时随渲染刷新。
   */
  getFilteredCols(): Set<number>;
}

/** 滚动条几何(画布坐标,沿轨道方向;render() 时刷新,命中测试/拖拽映射用)。 */
export interface ScrollbarGeometry {
  /** 轨道起点(画布坐标,垂直条=y、水平条=x)。 */
  trackStart: number;
  /** 轨道长度(px,扣除另一轴滚动条占位后的有效范围)。 */
  trackLength: number;
  /** 滑块起点(画布坐标)。 */
  thumbStart: number;
  /** 滑块长度(px)。 */
  thumbLength: number;
  /** 最大滚动偏移(px)。 */
  maxScroll: number;
}

/** 渲染器构造参数。 */
export interface RendererOptions {
  canvas: HTMLCanvasElement;
  source: RenderSource;
  defaultColumnWidth: number;
  defaultRowHeight: number;
  rowHeaderWidth: number;
  columnHeaderHeight: number;
}

/** 通用文本测量/断行与命中测试已拆至 text-measure.ts / renderer-hit-test.ts。 */

/** mtable Canvas 渲染器。 */
export class MtableRenderer {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  readonly source: RenderSource;
  private readonly defaultColumnWidth: number;
  private readonly defaultRowHeight: number;
  readonly rowHeaderWidth: number;
  readonly columnHeaderHeight: number;

  /** 滚动偏移(px)。 */
  scrollX = 0;
  scrollY = 0;

  /** 鼠标悬停/拖拽的滚动条(由宿主 mousemove/mousedown 设置,null = 无;驱动滑块加深变粗)。 */
  scrollbarActive: 'v' | 'h' | null = null;
  /** 滚动条是否正处于拖拽中(颜色比 hover 更深一档)。 */
  scrollbarDragging = false;

  /** 列宽拖拽中的定位线(屏幕坐标 px,null = 无;由宿主拖拽时设置,render 绘制)。 */
  columnResizeLine: number | null = null;

  /** 悬停中的筛选箭头列号(null = 无;由宿主 mousemove 设置,箭头底色加深)。 */
  hoveredFilterArrow: number | null = null;

  /** 每帧缓存的筛选列集合(绘制与命中测试共用;renderer-hit-test 经宿主访问)。 */
  filteredColsCache: Set<number> = new Set();

  /**
   * 同步刷新筛选/排序生效列缓存(公开:宿主在筛选/排序状态变化后、
   * 下一帧渲染前调用,保证随后的箭头命中测试与绘制立即反映新状态)。
   */
  refreshFilteredCols(): void {
    this.filteredColsCache = this.source.getFilteredCols();
  }

  /** 最近一次绘制的滚动条几何(null = 内容未溢出、滑块不显示)。 */
  private scrollbarGeometryV: ScrollbarGeometry | null = null;
  private scrollbarGeometryH: ScrollbarGeometry | null = null;

  /** 最近一次绘制的可见几何(命中测试用,绘制时刷新)。 */
  view = {
    colLefts: [] as number[],
    rowTops: [] as number[],
    firstCol: 0,
    lastCol: 0,
    firstRow: 0,
    lastRow: 0,
    gridWidth: 0,
    gridHeight: 0
  };

  constructor(options: RendererOptions) {
    this.canvas = options.canvas;
    this.ctx = options.canvas.getContext('2d')!;
    this.source = options.source;
    this.defaultColumnWidth = options.defaultColumnWidth;
    this.defaultRowHeight = options.defaultRowHeight;
    this.rowHeaderWidth = options.rowHeaderWidth;
    this.columnHeaderHeight = options.columnHeaderHeight;
  }

  /** 垂直滚动条几何(render 后有效;内容未溢出为 null)。 */
  get verticalScrollbarGeometry(): ScrollbarGeometry | null {
    return this.scrollbarGeometryV;
  }

  /** 水平滚动条几何(render 后有效;内容未溢出为 null)。 */
  get horizontalScrollbarGeometry(): ScrollbarGeometry | null {
    return this.scrollbarGeometryH;
  }

  /** 列宽(越界取默认)。 */
  getColumnWidth(col: number): number {
    return this.source.columnWidths[col] ?? this.defaultColumnWidth;
  }

  /** 行高(越界取默认)。 */
  getRowHeight(row: number): number {
    return this.source.rowHeights[row] ?? this.defaultRowHeight;
  }

  /** 行布局高度(被筛选隐藏的行折叠为 0,不占布局)。 */
  getLayoutRowHeight(row: number): number {
    if (this.source.hiddenRows.has(row)) return 0;
    return this.getRowHeight(row);
  }

  /** 列的滚动偏移:冻结列(≤ freezeCol)偏移为 0(不滚),其余正常滚动。 */
  colScrollOffset(c: number): number {
    return this.freezeCol >= 0 && c <= this.freezeCol ? 0 : this.scrollX;
  }

  /** 行的滚动偏移:冻结行(≤ freezeRow)偏移为 0(不滚),其余正常滚动。 */
  rowScrollOffset(r: number): number {
    return this.freezeRow >= 0 && r <= this.freezeRow ? 0 : this.scrollY;
  }

  /** 冻结列(0 基;-1 = 无冻结)。 */
  private get freezeCol(): number {
    return this.source.freezeCol;
  }

  /** 冻结行(0 基;-1 = 无冻结)。 */
  private get freezeRow(): number {
    return this.source.freezeRow;
  }

  /** 列号 → 未滚动数据区 x(px;越界列按默认宽外推)。 */
  private unscrolledColLeft(c: number): number {
    let acc = 0;
    for (let i = 0; i < c && i < this.source.columnWidths.length; i += 1) {
      acc += this.getColumnWidth(i);
    }
    for (let i = this.source.columnWidths.length; i < c; i += 1) {
      acc += this.defaultColumnWidth;
    }
    return acc;
  }

  /** 行号 → 未滚动数据区 y(px;越界行按默认高外推)。 */
  private unscrolledRowTop(r: number): number {
    let acc = 0;
    for (let i = 0; i < r && i < this.source.rowHeights.length; i += 1) {
      acc += this.getLayoutRowHeight(i);
    }
    for (let i = this.source.rowHeights.length; i < r; i += 1) {
      acc += this.defaultRowHeight;
    }
    return acc;
  }

  /** 数据区总宽(px)。 */
  get totalWidth(): number {
    return this.source.columnWidths.reduce((sum, w) => sum + w, 0);
  }

  /** 数据区总高(px,隐藏行不计)。 */
  get totalHeight(): number {
    let sum = 0;
    for (let r = 0; r < this.source.rowHeights.length; r += 1) {
      sum += this.getLayoutRowHeight(r);
    }
    return sum;
  }

  /**
   * 命中测试:数据区坐标(px,视口内) → 单元格坐标。
   * @returns null 表示落在表头区或界外
   */
  hitTestCell(x: number, y: number): { row: number; col: number } | null {
    return hitTestCellImpl(this, x, y);
  }

  /** 命中测试:表头(px 坐标 → 行/列号)。 */
  hitTestHeader(x: number, y: number): { type: 'row' | 'col'; index: number } | null {
    return hitTestHeaderImpl(this, x, y);
  }

  /**
   * 绘制一帧(完整重绘;数据量与可见区域小,性能足够)。
   */
  render(): void {
    const { canvas, ctx, source } = this;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;

    // 画布尺寸随容器(css 尺寸 × dpr),每次 render 前由宿主同步过 CSS 尺寸
    const targetW = Math.round(cssWidth * dpr);
    const targetH = Math.round(cssHeight * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 视口尺寸/内容量变化后(窗口缩放、行列删除)把滚动偏移夹回有效范围
    // (网格视口不含滚动条轨道带:右缘/底缘各让出 SCROLLBAR_SIZE)
    const maxScrollX = Math.max(this.totalWidth - (cssWidth - this.rowHeaderWidth - SCROLLBAR_SIZE), 0);
    const maxScrollY = Math.max(this.totalHeight - (cssHeight - this.columnHeaderHeight - SCROLLBAR_SIZE), 0);
    if (this.scrollX > maxScrollX) this.scrollX = maxScrollX;
    if (this.scrollY > maxScrollY) this.scrollY = maxScrollY;

    // 筛选/排序生效列集合(箭头绘制与命中共用,每帧刷新)
    this.refreshFilteredCols();

    // 背景
    ctx.fillStyle = CELL_BACKGROUND;
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    // 可见行列范围(含滚出部分一格的缓冲)
    const { firstCol, lastCol, firstRow, lastRow } = this.computeVisibleRange(
      cssWidth - SCROLLBAR_SIZE,
      cssHeight - SCROLLBAR_SIZE
    );
    const colLefts = this.computeColLefts(firstCol, lastCol);
    const rowTops = this.computeRowTops(firstRow, lastRow);
    this.view = {
      colLefts,
      rowTops,
      firstCol,
      lastCol,
      firstRow,
      lastRow,
      gridWidth: cssWidth - this.rowHeaderWidth - SCROLLBAR_SIZE,
      gridHeight: cssHeight - this.columnHeaderHeight - SCROLLBAR_SIZE
    };

    const sel = source.selection;
    // 滚动条轨道带独立于网格:网格视口不含右缘/底缘的轨道带
    const gridRight = this.rowHeaderWidth + this.view.gridWidth;
    const gridBottom = this.columnHeaderHeight + this.view.gridHeight;
    // 内容底部屏幕 y(最后一行下缘;内容不足一屏时其下为整片留白区)
    const contentBottom = Math.min(
      Math.max(this.columnHeaderHeight + this.totalHeight - this.scrollY, this.columnHeaderHeight),
      gridBottom
    );

    // 1. 数据区单元格底色+文本 / 2. 网格线 / 3. 选区
    //    (裁剪到网格视口,绘制不得侵入滚动条轨道带)
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.rowHeaderWidth, this.columnHeaderHeight, this.view.gridWidth, this.view.gridHeight);
    ctx.clip();
    this.drawCells(firstCol, lastCol, firstRow, lastRow, colLefts, rowTops);
    this.drawGridLines(firstRow, colLefts, rowTops, gridRight, contentBottom);
    if (sel) {
      this.drawSelection(sel, gridRight, gridBottom);
    }
    ctx.restore();

    // 网格视口边界线(网格与轨道带的分隔线;该轴无滚动条时轨道带不绘制,分隔线随同隐藏)
    const hasVerticalScrollbar = this.computeVerticalScrollbar() !== null;
    const hasHorizontalScrollbar = this.computeHorizontalScrollbar() !== null;
    if (hasVerticalScrollbar || hasHorizontalScrollbar) {
      ctx.strokeStyle = GRID_LINE_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (hasVerticalScrollbar) {
        ctx.moveTo(gridRight + 0.5, this.columnHeaderHeight);
        ctx.lineTo(gridRight + 0.5, gridBottom);
      }
      if (hasHorizontalScrollbar) {
        ctx.moveTo(this.rowHeaderWidth, gridBottom + 0.5);
        ctx.lineTo(gridRight, gridBottom + 0.5);
      }
      ctx.stroke();
    }

    // 表格底部结束横线(内容最后一行的下缘,含行头列;整片留白区的上边界)
    if (contentBottom > this.columnHeaderHeight && contentBottom < gridBottom) {
      ctx.strokeStyle = GRID_LINE_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(contentBottom) + 0.5);
      ctx.lineTo(gridRight, Math.round(contentBottom) + 0.5);
      ctx.stroke();
    }

    // 冻结行/列分界线(2px,比网格线深)
    const frCol = this.freezeCol;
    const frRow = this.freezeRow;
    if (frCol >= 0 || frRow >= 0) {
      ctx.strokeStyle = FREEZE_LINE_COLOR;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (frCol >= 0) {
        const fx = this.rowHeaderWidth + this.unscrolledColLeft(frCol + 1);
        ctx.moveTo(fx, this.columnHeaderHeight);
        ctx.lineTo(fx, gridBottom);
      }
      if (frRow >= 0) {
        const fy = this.columnHeaderHeight + this.unscrolledRowTop(frRow + 1);
        ctx.moveTo(this.rowHeaderWidth, fy);
        ctx.lineTo(gridRight, fy);
      }
      ctx.stroke();
    }

    // 列宽拖拽定位线(从列头贯穿数据区,压在网格与选区之上)
    if (this.columnResizeLine !== null) {
      ctx.strokeStyle = COLUMN_RESIZE_LINE_COLOR;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.columnResizeLine, this.columnHeaderHeight);
      ctx.lineTo(this.columnResizeLine, gridBottom);
      ctx.stroke();
    }

    // 4. 表头(列头/行头 + 高亮 + hover;各自裁剪到带区,部分可见的表头不越界)
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.rowHeaderWidth, 0, this.view.gridWidth, this.columnHeaderHeight);
    ctx.clip();
    this.drawColumnHeaders(firstCol, colLefts, gridRight, sel);
    // 筛选/排序箭头(hover 列 + 设置过的列;压在列头文字上层)
    for (let i = 0; i < colLefts.length; i += 1) {
      this.drawFilterArrow(ctx, firstCol + i, colLefts[i]!);
    }
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, this.columnHeaderHeight, this.rowHeaderWidth, this.view.gridHeight);
    ctx.clip();
    this.drawRowHeaders(firstRow, rowTops, gridBottom, sel);
    // 最后一行之下:行头带延续表头底色(与整体连贯,不留白;数据区保持整片留白)
    if (contentBottom < gridBottom) {
      ctx.fillStyle = HEADER_BACKGROUND;
      ctx.fillRect(0, contentBottom, this.rowHeaderWidth, gridBottom - contentBottom);
    }
    ctx.restore();
    // 行头列右线(行号列与 A 列之间的灰色竖线,贯穿数据区全高含空白区;
    // 放在裁剪外绘制,确保空白区竖线不因裁剪而断裂)
    ctx.strokeStyle = HEADER_BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(this.rowHeaderWidth) + 0.5, this.columnHeaderHeight);
    ctx.lineTo(Math.round(this.rowHeaderWidth) + 0.5, gridBottom);
    ctx.stroke();
    // 列头带右侧条带(列头右缘到画布右缘):表头底色延伸
    ctx.fillStyle = HEADER_BACKGROUND;
    ctx.fillRect(gridRight, 0, cssWidth - gridRight, this.columnHeaderHeight);

    // 5. 左上角方块
    ctx.fillStyle = HEADER_BACKGROUND;
    ctx.fillRect(0, 0, this.rowHeaderWidth, this.columnHeaderHeight);
    ctx.strokeStyle = HEADER_BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, this.rowHeaderWidth - 1, this.columnHeaderHeight - 1);

    // 6. 滚动条(独立轨道带内)
    this.drawScrollbars();
  }

  /**
   * 计算滚动条几何(画布坐标)。
   * 滑块长度 = track²/content(Univer scroll-bar.ts 同式,最小 SCROLLBAR_MIN_THUMB_SIZE),
   * 位置按 scroll/maxScroll 在轨道有效范围内等比映射;内容未溢出时返回 null。
   * @param dataStart 轨道起点(垂直=列头高,水平=行头宽)
   * @param viewport 数据区视口长(px,垂直=gridHeight,水平=gridWidth)
   * @param content 内容总长(px,垂直=totalHeight,水平=totalWidth)
   * @param scroll 当前滚动偏移
   * @param reserved 另一轴滚动条占用的厚度(0 = 不显示)
   */
  private computeScrollbarGeometry(
    dataStart: number,
    viewport: number,
    content: number,
    scroll: number,
    reserved: number
  ): ScrollbarGeometry | null {
    const trackLength = Math.max(viewport - reserved, 0);
    const maxScroll = Math.max(content - viewport, 0);
    if (maxScroll <= 0 || trackLength <= 0) return null;
    // Univer 同式:thumbLength = trackLength² / content,夹到最小值后不超过轨道
    const rawThumb = (trackLength * trackLength) / content;
    const thumbLength = Math.min(Math.max(rawThumb, SCROLLBAR_MIN_THUMB_SIZE), trackLength);
    const thumbStart = dataStart + (scroll / maxScroll) * (trackLength - thumbLength);
    return { trackStart: dataStart, trackLength, thumbStart, thumbLength, maxScroll };
  }

  /** 垂直滚动条几何(render 后刷新;null = 纵向无溢出)。轨道带独立于网格(右缘),不占网格宽度。 */
  private computeVerticalScrollbar(): ScrollbarGeometry | null {
    return this.computeScrollbarGeometry(
      this.columnHeaderHeight,
      this.view.gridHeight,
      this.totalHeight,
      this.scrollY,
      0
    );
  }

  /** 水平滚动条几何(render 后刷新;null = 横向无溢出)。轨道带独立于网格(底缘),不占网格高度。 */
  private computeHorizontalScrollbar(): ScrollbarGeometry | null {
    return this.computeScrollbarGeometry(
      this.rowHeaderWidth,
      this.view.gridWidth,
      this.totalWidth,
      this.scrollX,
      0
    );
  }

  /** 绘制滚动条(轨道带独立于网格:垂直贴网格右缘、水平贴网格底缘,均不与网格区域重叠)。 */
  private drawScrollbars(): void {
    const { ctx } = this;

    this.scrollbarGeometryH = this.computeHorizontalScrollbar();
    this.scrollbarGeometryV = this.computeVerticalScrollbar();

    const trackSize = SCROLLBAR_SIZE; // 轨道带厚度,同 Univer _trackThickness(DEFAULT_TRACK_SIZE)
    const gridWidth = this.view.gridWidth;
    const gridHeight = this.view.gridHeight;
    const gridRight = this.rowHeaderWidth + gridWidth;
    const gridBottom = this.columnHeaderHeight + gridHeight;
    // 画布完整尺寸(轨道带在无对侧滚动条时延伸到画布边缘,不留悬空缺口)
    const cssWidth = gridRight + trackSize;
    const cssHeight = gridBottom + trackSize;
    const vGeom = this.scrollbarGeometryV;
    const hGeom = this.scrollbarGeometryH;

    // 轨道带(该轴内容溢出才显示,与滑块同隐现):垂直贴网格右缘、水平贴网格底缘
    if (vGeom) {
      ctx.fillStyle = SCROLLBAR_TRACK_COLOR;
      ctx.fillRect(
        gridRight,
        this.columnHeaderHeight,
        trackSize,
        hGeom ? gridHeight : cssHeight - this.columnHeaderHeight
      );
    }
    if (hGeom) {
      ctx.fillStyle = SCROLLBAR_TRACK_COLOR;
      ctx.fillRect(this.rowHeaderWidth, gridBottom, vGeom ? gridWidth : cssWidth - this.rowHeaderWidth, trackSize);
      // 左下角(行头列 × 水平滚动条带交叉):延续行头底色,保持整体连贯
      ctx.fillStyle = HEADER_BACKGROUND;
      ctx.fillRect(0, gridBottom, this.rowHeaderWidth, trackSize);
    }
    // 右下角占位块(两轨交汇,表头底色 + 边框,与左上角方块一致):双轨齐备才画,
    // 单轨/无轨时画出来是悬空的孤立方块
    if (vGeom && hGeom) {
      ctx.fillStyle = HEADER_BACKGROUND;
      ctx.fillRect(gridRight, gridBottom, trackSize, trackSize);
      ctx.strokeStyle = HEADER_BORDER_COLOR;
      ctx.lineWidth = 1;
      ctx.strokeRect(gridRight + 0.5, gridBottom + 0.5, trackSize - 1, trackSize - 1);
    }

    // 滑块(内容溢出才显示;hover/拖拽时边距收窄变粗 + 加深)
    const margin = this.scrollbarActive !== null || this.scrollbarDragging
      ? SCROLLBAR_THUMB_HOVER_MARGIN
      : SCROLLBAR_THUMB_MARGIN;
    const thumbThickness = Math.max(trackSize - margin * 2, 1);
    const thumbColor = this.scrollbarDragging
      ? SCROLLBAR_THUMB_ACTIVE_COLOR
      : this.scrollbarActive !== null ? SCROLLBAR_THUMB_HOVER_COLOR : SCROLLBAR_THUMB_COLOR;
    ctx.fillStyle = thumbColor;

    if (vGeom) {
      // 垂直滑块:垂直轨道带内(left = 网格右缘 + margin)
      const left = gridRight + margin;
      this.fillRoundedRect(left, vGeom.thumbStart, thumbThickness, vGeom.thumbLength, SCROLLBAR_THUMB_RADIUS);
    }
    if (hGeom) {
      // 水平滑块:水平轨道带内(top = 网格底缘 + margin)
      const top = gridBottom + margin;
      this.fillRoundedRect(hGeom.thumbStart, top, hGeom.thumbLength, thumbThickness, SCROLLBAR_THUMB_RADIUS);
    }
  }

  /** 圆角矩形填充(圆角半径自动夹到宽高一半以内)。 */
  private fillRoundedRect(x: number, y: number, width: number, height: number, radius: number): void {
    const { ctx } = this;
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * 命中测试滚动条(轨道区域含滑块;右下角占位块归垂直条)。
   * @returns 命中的滚动条轴,未命中返回 null
   */
  hitTestScrollbar(x: number, y: number): 'v' | 'h' | null {
    return hitTestScrollbarImpl(this, x, y);
  }

  /**
   * 命中测试列头筛选箭头(圆圈外扩容错,便于点中;触摸点按用更大容差)。
   * @returns 命中的列号,未命中返回 null
   */
  hitTestFilterArrow(x: number, y: number, tolerance = 2): number | null {
    return hitTestFilterArrowImpl(this, x, y, tolerance);
  }

  /** 筛选箭头圆圈的屏幕矩形(列头带内,右缘对齐;绘制与命中共用)。 */
  filterArrowRect(col: number, colLeft: number): { x: number; y: number; size: number } {
    const width = this.getColumnWidth(col);
    const right = this.rowHeaderWidth + colLeft + width;
    const size = FILTER_ARROW_SIZE;
    return { x: right - FILTER_ARROW_RIGHT_MARGIN - size, y: (this.columnHeaderHeight - size) / 2, size };
  }

  /** 绘制某列的筛选箭头(hover 列常显,设置过筛选/排序的列常显)。 */
  private drawFilterArrow(ctx: CanvasRenderingContext2D, col: number, colLeft: number): void {
    const isActive = this.filteredColsCache.has(col);
    const isHeaderHovered = this.source.hoveredHeader?.type === 'col' && this.source.hoveredHeader.index === col;
    if (!isActive && !isHeaderHovered) {
      return;
    }
    const isHovered = this.hoveredFilterArrow === col;
    const rect = this.filterArrowRect(col, colLeft);
    if (rect.x < this.rowHeaderWidth) return;

    ctx.save();
    // 浅灰圆圈背景(hover 加深一档)
    ctx.fillStyle = isHovered ? FILTER_ARROW_BACKGROUND_HOVER : FILTER_ARROW_BACKGROUND;
    ctx.beginPath();
    ctx.arc(rect.x + rect.size / 2, rect.y + rect.size / 2, rect.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // 小箭头(chevron-down):设置过筛选/排序的列前景更深
    const cx = rect.x + rect.size / 2;
    const cy = rect.y + rect.size / 2;
    const r = 3.2;
    ctx.strokeStyle = isActive ? FILTER_ARROW_FOREGROUND_ACTIVE : FILTER_ARROW_FOREGROUND;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - 1.2);
    ctx.lineTo(cx, cy + 2.2);
    ctx.lineTo(cx + r, cy - 1.2);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * 拖拽滚动条:把指针位置(画布坐标)映射为滚动偏移(夹在 [0, maxScroll])。
   * 轨道点击跳转复用本方法:grabOffset 传滑块长度一半即"滑块中心对齐点击处"(Univer scrollToBarPos 语义)。
   * @param type 滚动条轴
   * @param x 指针画布 x
   * @param y 指针画布 y
   * @param grabOffset mousedown 时指针相对滑块起点的偏移(px,沿轨道方向)
   */
  dragScrollbarTo(type: 'v' | 'h', x: number, y: number, grabOffset: number): void {
    const geom = type === 'v' ? this.scrollbarGeometryV : this.scrollbarGeometryH;
    if (!geom) return;
    const coord = type === 'v' ? y : x;
    const targetThumbStart = coord - grabOffset;
    const travel = Math.max(geom.trackLength - geom.thumbLength, 1);
    const ratio = Math.min(Math.max((targetThumbStart - geom.trackStart) / travel, 0), 1);
    const next = ratio * geom.maxScroll;
    if (type === 'v') {
      this.scrollY = next;
    } else {
      this.scrollX = next;
    }
  }

  /** 计算可见行列范围(冻结感知:冻结行列始终可见,非冻结区按滚动偏移折叠)。 */
  private computeVisibleRange(cssWidth: number, cssHeight: number): {
    firstCol: number; lastCol: number; firstRow: number; lastRow: number;
  } {
    const gridRightLocal = cssWidth - this.rowHeaderWidth;
    const gridBottomLocal = cssHeight - this.columnHeaderHeight;
    let firstCol = -1;
    let lastCol = -1;
    let firstRow = -1;
    let lastRow = -1;
    let accX = 0;
    for (let c = 0; c < this.source.columnWidths.length; c += 1) {
      const w = this.getColumnWidth(c);
      const left = accX - this.colScrollOffset(c);
      accX += w;
      if (left + w > 0 && left < gridRightLocal && w > 0) {
        if (firstCol < 0) firstCol = c;
        lastCol = c;
      }
    }
    let accY = 0;
    for (let r = 0; r < this.source.rowHeights.length; r += 1) {
      const h = this.getLayoutRowHeight(r);
      const top = accY - this.rowScrollOffset(r);
      accY += h;
      if (top + h > 0 && top < gridBottomLocal && h > 0) {
        if (firstRow < 0) firstRow = r;
        lastRow = r;
      }
    }
    return {
      firstCol: Math.max(firstCol, 0), lastCol: Math.max(lastCol, 0),
      firstRow: Math.max(firstRow, 0), lastRow: Math.max(lastRow, 0)
    };
  }

  /** 可见列的 x 起点(数据区坐标系,冻结感知:冻结列偏移为 0)。 */
  private computeColLefts(firstCol: number, lastCol: number): number[] {
    const lefts: number[] = [];
    let acc = 0;
    for (let c = 0; c < firstCol; c += 1) {
      acc += this.getColumnWidth(c);
    }
    for (let c = firstCol; c <= lastCol; c += 1) {
      lefts.push(acc - this.colScrollOffset(c));
      acc += this.getColumnWidth(c);
    }
    return lefts;
  }

  /** 可见行的 y 起点(数据区坐标系,冻结感知:冻结行偏移为 0;隐藏行折叠为 0)。 */
  private computeRowTops(firstRow: number, lastRow: number): number[] {
    const tops: number[] = [];
    let acc = 0;
    for (let r = 0; r < firstRow; r += 1) {
      acc += this.getLayoutRowHeight(r);
    }
    for (let r = firstRow; r <= lastRow; r += 1) {
      tops.push(acc - this.rowScrollOffset(r));
      acc += this.getLayoutRowHeight(r);
    }
    return tops;
  }

  /**
   * 数据区单元格:底色 + 文本(按列宽自动换行,整块垂直居中)。
   * 行高由宿主按换行行数预先算好(recalcRowHeights 与 wrapCellText 同源),
   * 极端情况下(行高容纳不下所有行)只绘制能容纳的行数,不越行重叠。
   */
  private drawCells(
    firstCol: number, lastCol: number, firstRow: number, lastRow: number,
    colLefts: number[], rowTops: number[]
  ): void {
    const { ctx, source } = this;
    ctx.font = `${HEADER_FONT_SIZE}px ${MTABLE_FONT_FAMILY}`;
    ctx.textBaseline = 'middle';
    for (let r = firstRow; r <= lastRow && r < source.cells.length; r += 1) {
      if (source.hiddenRows.has(r)) continue;
      const top = rowTops[r - firstRow]!;
      const height = this.getRowHeight(r);
      for (let c = firstCol; c <= lastCol && c < (source.cells[r]?.length ?? 0); c += 1) {
        const text = source.cells[r]?.[c] ?? '';
        if (text.length === 0) continue;
        const left = colLefts[c - firstCol]!;
        const width = this.getColumnWidth(c);
        // 屏幕坐标
        const sx = this.rowHeaderWidth + left;
        const sy = this.columnHeaderHeight + top;
        if (sx + width < this.rowHeaderWidth || sx > this.canvas.clientWidth) continue;

        ctx.fillStyle = CELL_TEXT_COLOR;
        ctx.textAlign = source.isNumericCell(r, c) ? 'right' : 'left';
        const maxTextWidth = width - CELL_TEXT_PADDING * 2;
        const textX = ctx.textAlign === 'right' ? sx + width - CELL_TEXT_PADDING : sx + CELL_TEXT_PADDING;
        // 行高容纳不下的行不绘制(行首 y 夹在单元格内)
        const maxLines = Math.max(Math.floor((height - 2) / CELL_LINE_HEIGHT), 1);
        const lines = wrapCellText(text, maxTextWidth).slice(0, maxLines);
        const totalHeight = lines.length * CELL_LINE_HEIGHT;
        let lineY = sy + (height - totalHeight) / 2 + CELL_LINE_HEIGHT / 2;
        for (const line of lines) {
          if (line.length > 0) {
            ctx.fillText(ellipsisTextLine(ctx, line, maxTextWidth), textX, lineY);
          }
          lineY += CELL_LINE_HEIGHT;
        }
      }
    }
  }

  /** 数据区网格线(0.5px 对齐的 1px 线;隐藏行的横线跳过)。 */
  private drawGridLines(
    firstRow: number, colLefts: number[], rowTops: number[], cssWidth: number, verticalEnd: number
  ): void {
    const { ctx, source } = this;
    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = 1;

    ctx.beginPath();
    // 竖线(每列右缘)
    for (let i = 0; i < colLefts.length; i += 1) {
      const sx = Math.round(this.rowHeaderWidth + colLefts[i]!) + 0.5;
      ctx.moveTo(sx, this.columnHeaderHeight);
      // 竖线只画到最后一行下缘(内容不足一屏时其下保持整片留白)
      ctx.lineTo(sx, verticalEnd);
    }
    // 横线(每行下缘;隐藏行折叠为 0 高,跳过避免与相邻行横线重合成粗线)
    for (let i = 0; i < rowTops.length; i += 1) {
      const r = firstRow + i;
      if (source.hiddenRows.has(r)) continue;
      const sy = Math.round(this.columnHeaderHeight + rowTops[i]!) + 0.5;
      ctx.moveTo(this.rowHeaderWidth, sy);
      ctx.lineTo(cssWidth, sy);
    }
    ctx.stroke();
  }

  /** 选区:alpha 0.07 填充 + primary.600 描边。 */
  private drawSelection(sel: MtableSelection, cssWidth: number, cssHeight: number): void {
    const { ctx } = this;
    const left = this.colToLeft(sel.startCol) - this.colScrollOffset(sel.startCol) + this.rowHeaderWidth;
    const top = this.rowToTop(sel.startRow) - this.rowScrollOffset(sel.startRow) + this.columnHeaderHeight;
    const right = this.colToLeft(sel.endCol + 1) - this.colScrollOffset(sel.endCol + 1) + this.rowHeaderWidth;
    const bottom = this.rowToTop(sel.endRow + 1) - this.rowScrollOffset(sel.endRow + 1) + this.columnHeaderHeight;

    // 視口裁剪(选区可能大部分在屏外)
    const clipLeft = Math.max(left, this.rowHeaderWidth);
    const clipTop = Math.max(top, this.columnHeaderHeight);
    const clipRight = Math.min(right, cssWidth);
    const clipBottom = Math.min(bottom, cssHeight);
    if (clipRight <= this.rowHeaderWidth || clipBottom <= this.columnHeaderHeight) return;

    ctx.fillStyle = SELECTION_FILL_COLOR;
    ctx.fillRect(clipLeft, clipTop, clipRight - clipLeft, clipBottom - clipTop);

    ctx.strokeStyle = SELECTION_STROKE_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(left + 0.5, top + 0.5, right - left - 1, bottom - top - 1);
  }

  /** 列头行(A B C …,gray.50 底,选区覆盖高亮)。 */
  private drawColumnHeaders(
    firstCol: number, colLefts: number[], cssWidth: number, sel: MtableSelection | null
  ): void {
    const { ctx, source } = this;
    ctx.font = `${HEADER_FONT_SIZE}px ${MTABLE_FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < colLefts.length; i += 1) {
      const c = firstCol + i;
      const left = this.rowHeaderWidth + colLefts[i]!;
      const width = this.getColumnWidth(c);
      if (left + width < this.rowHeaderWidth || left > cssWidth) continue;

      const isHighlighted = sel !== null && c >= sel.startCol && c <= sel.endCol;
      const isHovered = source.hoveredHeader?.type === 'col' && source.hoveredHeader.index === c;
      ctx.fillStyle = isHighlighted
        ? HEADER_HIGHLIGHT_COLOR
        : isHovered ? HEADER_HOVER_BACKGROUND : HEADER_BACKGROUND;
      ctx.fillRect(left, 0, width, this.columnHeaderHeight);

      // 右分隔线
      ctx.strokeStyle = HEADER_BORDER_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(left + width) + 0.5, 0);
      ctx.lineTo(Math.round(left + width) + 0.5, this.columnHeaderHeight);
      ctx.stroke();

      ctx.fillStyle = HEADER_TEXT_COLOR;
      ctx.fillText(numberToAbc(c), left + width / 2, this.columnHeaderHeight / 2);
    }

    // 列头底线
    ctx.strokeStyle = HEADER_BORDER_COLOR;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(this.columnHeaderHeight) + 0.5);
    ctx.lineTo(cssWidth, Math.round(this.columnHeaderHeight) + 0.5);
    ctx.stroke();
  }

  /** 行头列(1 2 3 …,gray.50 底,选区覆盖高亮)。 */
  private drawRowHeaders(
    firstRow: number, rowTops: number[], cssHeight: number, sel: MtableSelection | null
  ): void {
    const { ctx, source } = this;
    ctx.font = `${HEADER_FONT_SIZE}px ${MTABLE_FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < rowTops.length; i += 1) {
      const r = firstRow + i;
      // 被筛选隐藏的行:行头整体不绘制(数字/底色/分隔线),布局上已折叠
      if (source.hiddenRows.has(r)) continue;
      // 视口高于内容时 computeVisibleRange 会多给出一个越界行(供网格画封底横线),
      // 行头不能跟着画,否则会出现一行点选不到的"幽灵行号"
      if (r >= this.source.rowHeights.length) break;
      const top = this.columnHeaderHeight + rowTops[i]!;
      const height = this.getRowHeight(r);
      if (top + height < this.columnHeaderHeight || top > cssHeight) continue;

      const isHighlighted = sel !== null && r >= sel.startRow && r <= sel.endRow;
      const isHovered = source.hoveredHeader?.type === 'row' && source.hoveredHeader.index === r;
      ctx.fillStyle = isHighlighted
        ? HEADER_HIGHLIGHT_COLOR
        : isHovered ? HEADER_HOVER_BACKGROUND : HEADER_BACKGROUND;
      ctx.fillRect(0, top, this.rowHeaderWidth, height);

      // 下分隔线(与数据区网格线同色,确保行号间的分隔清晰可见)
      ctx.strokeStyle = GRID_LINE_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(top + height) + 0.5);
      ctx.lineTo(this.rowHeaderWidth, Math.round(top + height) + 0.5);
      ctx.stroke();

      ctx.fillStyle = HEADER_TEXT_COLOR;
      ctx.fillText(String(r + 1), this.rowHeaderWidth / 2, top + height / 2);
    }

    // 行头右线
    ctx.strokeStyle = HEADER_BORDER_COLOR;
    ctx.beginPath();
    ctx.moveTo(Math.round(this.rowHeaderWidth) + 0.5, 0);
    ctx.lineTo(Math.round(this.rowHeaderWidth) + 0.5, cssHeight);
    ctx.stroke();
  }

  /** 列号 → 数据区 x(px;越界列按默认宽外推;公开供编辑框定位)。 */
  colToLeftPublic(col: number): number {
    return this.colToLeft(col);
  }

  /** 行号 → 数据区 y(px;越界行按默认高外推;公开供编辑框定位)。 */
  rowToTopPublic(row: number): number {
    return this.rowToTop(row);
  }

  /** 列号 → 数据区 x(px;越界列按默认宽外推)。 */
  private colToLeft(col: number): number {
    let acc = 0;
    for (let c = 0; c < col && c < this.source.columnWidths.length; c += 1) {
      acc += this.getColumnWidth(c);
    }
    // 越界部分按默认宽外推(保证选区描边可见)
    for (let c = this.source.columnWidths.length; c < col; c += 1) {
      acc += this.defaultColumnWidth;
    }
    return acc;
  }

  /** 行号 → 数据区 y(px;隐藏行 0 高折叠,越界行按默认高外推)。 */
  private rowToTop(row: number): number {
    let acc = 0;
    for (let r = 0; r < row && r < this.source.rowHeights.length; r += 1) {
      acc += this.getLayoutRowHeight(r);
    }
    for (let r = this.source.rowHeights.length; r < row; r += 1) {
      acc += this.defaultRowHeight;
    }
    return acc;
  }

  /** 滚动到使指定单元格可见(必要时更新 scrollX/scrollY;冻结区内跳过)。 */
  scrollCellIntoView(row: number, col: number): void {
    const left = this.colToLeft(col);
    const top = this.rowToTop(row);
    const width = this.getColumnWidth(col);
    const height = this.getLayoutRowHeight(row);
    // 冻结列方向:列在冻结区内始终可见,无需滚动
    if (!(this.freezeCol >= 0 && col <= this.freezeCol)) {
      const frozenW = this.freezeCol >= 0 ? this.colToLeft(this.freezeCol + 1) : 0;
      const viewLeft = frozenW;
      const viewWidth = this.view.gridWidth - frozenW;
      if (left - frozenW < this.scrollX) {
        this.scrollX = left - frozenW;
      } else if (left + width > this.scrollX + viewLeft + viewWidth) {
        this.scrollX = left + width - viewLeft - viewWidth;
      }
    }
    // 行方向
    if (!(this.freezeRow >= 0 && row <= this.freezeRow)) {
      const frozenH = this.freezeRow >= 0 ? this.rowToTop(this.freezeRow + 1) : 0;
      const viewTop = frozenH;
      const viewHeight = this.view.gridHeight - frozenH;
      if (top - frozenH < this.scrollY) {
        this.scrollY = top - frozenH;
      } else if (top + height > this.scrollY + viewTop + viewHeight) {
        this.scrollY = top + height - viewTop - viewHeight;
      }
    }
  }
}
