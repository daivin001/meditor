/**
 * renderer-hit-test.ts — 渲染器命中测试(从 renderer.ts 轻拆)
 *
 * 单元格/表头/滚动条/筛选箭头的命中测试以独立函数实现,经
 * RendererHitTestHost 最小访问面(structurally 匹配 MtableRenderer 的
 * 公开成员)操作渲染器状态;渲染器保留同名方法做委托,类 API 不变。
 */

import { SCROLLBAR_SIZE } from './theme';
import type { RenderSource, ScrollbarGeometry } from './renderer';

/** 命中测试所需的最小访问面(MtableRenderer 的公开成员子集)。 */
export interface RendererHitTestHost {
  readonly canvas: HTMLCanvasElement;
  readonly rowHeaderWidth: number;
  readonly columnHeaderHeight: number;
  /** 渲染数据视图(只读访问)。 */
  readonly source: RenderSource;
  /** 最近一次绘制的可见几何(命中测试用)。 */
  readonly view: {
    colLefts: number[];
    rowTops: number[];
    firstCol: number;
    lastCol: number;
    firstRow: number;
    lastRow: number;
    gridWidth: number;
    gridHeight: number;
  };
  /** 每帧缓存的筛选列集合(与绘制共用)。 */
  readonly filteredColsCache: Set<number>;
  /** 列宽(越界取默认)。 */
  getColumnWidth(col: number): number;
  /** 行布局高度(被筛选隐藏的行折叠为 0)。 */
  getLayoutRowHeight(row: number): number;
  /** 列的滚动偏移:冻结列(≤ freezeCol)偏移为 0(不滚),其余正常滚动。 */
  colScrollOffset(c: number): number;
  /** 行的滚动偏移:冻结行(≤ freezeRow)偏移为 0(不滚),其余正常滚动。 */
  rowScrollOffset(r: number): number;
  readonly verticalScrollbarGeometry: ScrollbarGeometry | null;
  readonly horizontalScrollbarGeometry: ScrollbarGeometry | null;
  /** 筛选箭头圆圈的屏幕矩形(列头带内,右缘对齐)。 */
  filterArrowRect(col: number, colLeft: number): { x: number; y: number; size: number };
}

/**
 * 命中测试:数据区坐标(px,视口内) → 单元格坐标。
 * @returns null 表示落在表头区或界外
 */
export function hitTestCell(host: RendererHitTestHost, x: number, y: number): { row: number; col: number } | null {
  if (x < host.rowHeaderWidth || y < host.columnHeaderHeight) return null;
  const gx = x - host.rowHeaderWidth;
  const gy = y - host.columnHeaderHeight;
  let acc = 0;
  let col = -1;
  for (let c = 0; c < host.source.columnWidths.length; c += 1) {
    const w = host.getColumnWidth(c);
    const left = acc - host.colScrollOffset(c);
    if (gx >= left && gx < left + w) {
      col = c;
      break;
    }
    acc += w;
  }
  let row = -1;
  let accY = 0;
  for (let r = 0; r < host.source.rowHeights.length; r += 1) {
    const h = host.getLayoutRowHeight(r);
    const top = accY - host.rowScrollOffset(r);
    if (gy >= top && gy < top + h) {
      row = r;
      break;
    }
    accY += h;
  }
  if (row < 0 || col < 0) return null;
  return { row, col };
}

/** 命中测试:表头(px 坐标 → 行/列号)。 */
export function hitTestHeader(host: RendererHitTestHost, x: number, y: number): { type: 'row' | 'col'; index: number } | null {
  if (y < host.columnHeaderHeight && x >= host.rowHeaderWidth) {
    const hit = hitTestCell(host, x, host.columnHeaderHeight + 1);
    return hit ? { type: 'col', index: hit.col } : null;
  }
  if (x < host.rowHeaderWidth && y >= host.columnHeaderHeight) {
    const hit = hitTestCell(host, host.rowHeaderWidth + 1, y);
    return hit ? { type: 'row', index: hit.row } : null;
  }
  return null;
}

/**
 * 命中测试滚动条(轨道区域含滑块;右下角占位块归垂直条)。
 * @returns 命中的滚动条轴,未命中返回 null
 */
export function hitTestScrollbar(host: RendererHitTestHost, x: number, y: number): 'v' | 'h' | null {
  const cssWidth = host.canvas.clientWidth;
  const cssHeight = host.canvas.clientHeight;
  const trackSize = SCROLLBAR_SIZE;
  // 垂直条带(右缘,含右下角)
  if (x >= cssWidth - trackSize && y >= host.columnHeaderHeight) {
    return host.verticalScrollbarGeometry ? 'v' : null;
  }
  // 水平条带(底缘,不含右下角)
  if (y >= cssHeight - trackSize && x >= host.rowHeaderWidth && x < cssWidth - trackSize) {
    return host.horizontalScrollbarGeometry ? 'h' : null;
  }
  return null;
}

/**
 * 命中测试列头筛选箭头(圆圈外扩容错,便于点中;触摸点按用更大容差)。
 * @returns 命中的列号,未命中返回 null
 */
export function hitTestFilterArrow(host: RendererHitTestHost, x: number, y: number, tolerance = 2): number | null {
  if (y >= host.columnHeaderHeight || x < host.rowHeaderWidth) return null;
  for (let i = 0; i < host.view.colLefts.length; i += 1) {
    const col = host.view.firstCol + i;
    const isHeaderHovered = host.source.hoveredHeader?.type === 'col' && host.source.hoveredHeader.index === col;
    // 未设置筛选的列只在 hover 时显示箭头,非 hover 列跳过命中
    if (!host.filteredColsCache.has(col) && !isHeaderHovered) continue;
    const rect = host.filterArrowRect(col, host.view.colLefts[i]!);
    if (
      x >= rect.x - tolerance && x <= rect.x + rect.size + tolerance &&
      y >= rect.y - tolerance && y <= rect.y + rect.size + tolerance
    ) {
      return col;
    }
  }
  return null;
}
