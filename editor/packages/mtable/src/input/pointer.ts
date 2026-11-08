/**
 * input/pointer.ts — 鼠标/滚轮交互子系统(含滚动条拖拽、列宽拖拽、选区自动滚屏)
 *
 * 从 createMtable 函数体拆出:mousedown/mousemove/mouseup/mouseleave、
 * 双击进入编辑、右键菜单唤起、滚轮滚动、滚动条滑块拖拽与轨道跳转、
 * 列宽拖拽(window 级监听,指针出画布也能继续)、选区拖到视口边缘的
 * 自动滚屏。触摸手势(input/touch-scroll.ts)复用本模块的命中辅助并经
 * ctx.touchTapDispatch 放宽容差,点按路径统一合成 mousedown 走这里。
 */

import { COLUMN_MIN_WIDTH } from '../theme';
import { normalizeSelection } from '../core/selection';
import { TOUCH_EDGE_TOLERANCE, colEdgeScreenX, getCanvasPos, hitTestColumnEdge } from './hit-test';
import type { MtableColResizeDragState, MtableContext, MtablePointerApi, MtableScrollbarDragState } from '../context';

// --- 选区拖拽自动滚屏常量 ---
/** 距视口边缘该范围(px)内触发自动滚动。 */
const AUTO_SCROLL_EDGE = 28;
/** 自动滚动基础速度(px/帧),越贴近边缘越快(线性加速至 3 倍)。 */
const AUTO_SCROLL_SPEED = 10;

/** 创建鼠标/滚轮交互子系统。 */
export function createPointerController(ctx: MtableContext): MtablePointerApi {
  const { config, canvas, model } = ctx;

  // --- 拖拽运行态(原 createMtable 局部变量,仅鼠标路径使用) ---
  /** 鼠标拖拽选区进行中。 */
  let isDragging = false;
  /** 滚动条拖拽进行中(null = 未拖拽)。 */
  let scrollbarDrag: MtableScrollbarDragState | null = null;
  /** 列宽拖拽进行中(null = 未拖拽)。 */
  let colResizeDrag: MtableColResizeDragState | null = null;

  // --- 选区拖拽自动滚屏运行态 ---
  /** 自动滚屏运行帧句柄(null = 未运行)。 */
  let autoScrollRaf: number | null = null;
  /** 自动滚屏方向与速度(px/帧,带符号;加速系数随贴近程度变化)。 */
  let autoScrollDir = { x: 0, y: 0 };
  /** 自动滚屏期间最后一次指针位置(canvas 坐标;指针不动视图也持续滚)。 */
  let autoScrollPos = { x: 0, y: 0 };

  const stopAutoScroll = (): void => {
    if (autoScrollRaf !== null) {
      cancelAnimationFrame(autoScrollRaf);
      autoScrollRaf = null;
    }
  };

  /** 按当前方向滚动一帧,并把选区扩展到指针位置对应的单元格。 */
  const autoScrollStep = (): void => {
    autoScrollRaf = null;
    if (!isDragging || (autoScrollDir.x === 0 && autoScrollDir.y === 0)) return;
    const maxScrollX = Math.max(ctx.renderer.totalWidth - ctx.renderer.view.gridWidth, 0);
    const maxScrollY = Math.max(ctx.renderer.totalHeight - ctx.renderer.view.gridHeight, 0);
    ctx.renderer.scrollX = Math.min(Math.max(ctx.renderer.scrollX + autoScrollDir.x, 0), maxScrollX);
    ctx.renderer.scrollY = Math.min(Math.max(ctx.renderer.scrollY + autoScrollDir.y, 0), maxScrollY);
    if (!config.isAutoAppendRows) {
      ctx.layout.ensureRowsForViewport(ctx.renderer.scrollY);
    }
    // 视口滚过去了而指针未动:把选区跟着扩到指针当前位置(夹在网格视口内)
    const clampX = Math.min(Math.max(autoScrollPos.x, config.rowHeaderWidth), config.rowHeaderWidth + ctx.renderer.view.gridWidth - 1);
    const clampY = Math.min(Math.max(autoScrollPos.y, config.columnHeaderHeight), config.columnHeaderHeight + ctx.renderer.view.gridHeight - 1);
    const hit = ctx.renderer.hitTestCell(clampX, clampY);
    if (hit) {
      ctx.selectionOps.extendSelectionTo(hit.row, hit.col);
    }
    ctx.scheduleRender();
    autoScrollRaf = requestAnimationFrame(autoScrollStep);
  };

  /** 拖拽中按指针位置更新自动滚屏方向(贴近边缘触发,拖出画布按原方向全速继续)。 */
  const updateAutoScroll = (x: number, y: number): void => {
    autoScrollPos = { x, y };
    const left = config.rowHeaderWidth;
    const top = config.columnHeaderHeight;
    const right = config.rowHeaderWidth + ctx.renderer.view.gridWidth;
    const bottom = config.columnHeaderHeight + ctx.renderer.view.gridHeight;
    /** 单轴方向速度:边缘触发 1 倍,越贴近越快至 3 倍,界外保持 3 倍。 */
    const axisSpeed = (v: number, lo: number, hi: number): number => {
      if (v < lo) return -AUTO_SCROLL_SPEED * 3;
      if (v > hi) return AUTO_SCROLL_SPEED * 3;
      const nearLo = v - lo;
      const nearHi = hi - v;
      if (nearLo < AUTO_SCROLL_EDGE) {
        return -AUTO_SCROLL_SPEED * (1 + (1 - nearLo / AUTO_SCROLL_EDGE) * 2);
      }
      if (nearHi < AUTO_SCROLL_EDGE) {
        return AUTO_SCROLL_SPEED * (1 + (1 - nearHi / AUTO_SCROLL_EDGE) * 2);
      }
      return 0;
    };
    autoScrollDir = { x: axisSpeed(x, left, right), y: axisSpeed(y, top, bottom) };
    const active = isDragging && (autoScrollDir.x !== 0 || autoScrollDir.y !== 0);
    if (active && autoScrollRaf === null) {
      autoScrollRaf = requestAnimationFrame(autoScrollStep);
    } else if (!active && autoScrollRaf !== null) {
      stopAutoScroll();
    }
  };

  const handleMouseDown = (event: MouseEvent): void => {
    ctx.contextMenu.close();
    if (event.button !== 0) return;
    const { x, y } = getCanvasPos(canvas, event);

    // 点击面板外部时关闭筛选面板(面板内点击不经过 canvas)。
    // 同列筛选箭头除外:交由下方 toggle 分支收起,否则通用关闭先置空 panelState,
    // toggle 条件恒不成立,同列再点只会重开、永远无法收起。
    const pressArrowCol = ctx.renderer.hitTestFilterArrow(x, y);
    if (
      ctx.filterPanel.state &&
      ctx.filterPanel.popup &&
      !ctx.filterPanel.popup.contains(event.target as Node) &&
      pressArrowCol !== ctx.filterPanel.state.col
    ) {
      ctx.filterPanel.close();
    }

    // 滚动条:滑块拖拽 / 轨道点击跳转(滑块中心对齐点击处,同 Univer scrollToBarPos 语义)
    // 先于编辑提交判断:滚动条是 UI 元素,且点击会导致编辑框 blur 由 blur 监听兜底提交
    const scrollbar = ctx.renderer.hitTestScrollbar(x, y);
    if (scrollbar) {
      const geom = scrollbar === 'v' ? ctx.renderer.verticalScrollbarGeometry : ctx.renderer.horizontalScrollbarGeometry;
      if (geom) {
        const coord = scrollbar === 'v' ? y : x;
        const onThumb = coord >= geom.thumbStart && coord <= geom.thumbStart + geom.thumbLength;
        ctx.renderer.scrollbarActive = scrollbar;
        ctx.renderer.scrollbarDragging = true;
        scrollbarDrag = { type: scrollbar, grabOffset: onThumb ? coord - geom.thumbStart : geom.thumbLength / 2 };
        ctx.renderer.dragScrollbarTo(scrollbar, x, y, scrollbarDrag.grabOffset);
        if (scrollbar === 'v') {
          ctx.layout.ensureRowsForViewport(ctx.renderer.scrollY);
        }
        canvas.style.cursor = 'default';
        // 拖拽期间挂 window mousemove,指针拖出画布也能继续滚动
        window.addEventListener('mousemove', handleScrollbarWindowMove);
        canvas.focus();
        ctx.scheduleRender();
      }
      return;
    }

    // 编辑中:点击编辑框外先提交
    if (ctx.editing) {
      const hit = ctx.renderer.hitTestCell(x, y);
      if (!hit || hit.row !== ctx.editing.row || hit.col !== ctx.editing.col) {
        ctx.cellEditor.commitEdit(false);
      } else {
        return;
      }
    }

    // 列头筛选箭头:打开/切换筛选面板(优先级高于列边界拖拽与整列选中;
    // 触摸点按合成路径放宽容差,便于手指命中)
    const arrowCol = ctx.renderer.hitTestFilterArrow(x, y, ctx.touchTapDispatch ? TOUCH_EDGE_TOLERANCE : undefined);
    if (arrowCol !== null) {
      if (ctx.filterPanel.state?.col === arrowCol) {
        ctx.filterPanel.close();
      } else {
        ctx.filterPanel.open(arrowCol);
      }
      canvas.style.cursor = 'pointer';
      ctx.scheduleRender();
      return;
    }

    // 列宽拖拽:列头边界命中后直接进入拖拽(挂 window 监听,指针出画布也能继续)
    const colEdge = hitTestColumnEdge(ctx, x, y, ctx.touchTapDispatch ? TOUCH_EDGE_TOLERANCE : undefined);
    if (colEdge !== null) {
      colResizeDrag = { col: colEdge, startX: x, startWidth: ctx.columnWidths[colEdge] ?? config.defaultColumnWidth };
      ctx.renderer.columnResizeLine = colEdgeScreenX(ctx, colEdge);
      canvas.style.cursor = 'col-resize';
      window.addEventListener('mousemove', handleColResizeWindowMove);
      window.addEventListener('mouseup', handleColResizeWindowUp);
      ctx.scheduleRender();
      return;
    }

    // 表头点击:整行/整列选中
    const header = ctx.renderer.hitTestHeader(x, y);
    if (header) {
      if (header.type === 'col') {
        ctx.anchor = { row: 0, col: header.index };
        ctx.selection = normalizeSelection(
          { startRow: 0, startCol: header.index, endRow: model.rowCount - 1, endCol: header.index },
          model.rowCount,
          model.columnCount
        );
      } else {
        ctx.anchor = { row: header.index, col: 0 };
        ctx.selection = normalizeSelection(
          { startRow: header.index, startCol: 0, endRow: header.index, endCol: model.columnCount - 1 },
          model.rowCount,
          model.columnCount
        );
      }
      isDragging = true;
      ctx.scheduleRender();
      canvas.focus();
      return;
    }

    const hit = ctx.renderer.hitTestCell(x, y);
    if (!hit) return;
    // 界外列(空白网格区)点击也允许选中(归一化会夹到界内)
    if (event.shiftKey) {
      ctx.selectionOps.extendSelectionTo(hit.row, hit.col);
    } else {
      ctx.selectionOps.setAnchorAndSelection(hit.row, hit.col);
    }
    isDragging = true;
    ctx.scheduleRender();
    canvas.focus();
  };

  /**
   * 滚动条拖拽期间的 window mousemove
   * (拖拽开始时挂载、mouseup 时移除;指针拖出画布也能继续滚动)。
   */
  const handleScrollbarWindowMove = (event: MouseEvent): void => {
    if (!scrollbarDrag) return;
    const { x, y } = getCanvasPos(canvas, event);
    ctx.renderer.dragScrollbarTo(scrollbarDrag.type, x, y, scrollbarDrag.grabOffset);
    if (scrollbarDrag.type === 'v') {
      // 拖到底继续追加行(无限滚动,与滚轮路径同源)
      ctx.layout.ensureRowsForViewport(ctx.renderer.scrollY);
    }
    ctx.scheduleRender();
  };

  /**
   * 列宽拖拽期间的 window mousemove:按指针位移更新列宽(下限 COLUMN_MIN_WIDTH),
   * 增量重算受影响行高并重绘。不触发 onChange(列宽不入 CSV,不持久化)。
   */
  const handleColResizeWindowMove = (event: MouseEvent): void => {
    if (!colResizeDrag) return;
    const { x } = getCanvasPos(canvas, event);
    const nextWidth = Math.max(colResizeDrag.startWidth + (x - colResizeDrag.startX), COLUMN_MIN_WIDTH);
    const col = colResizeDrag.col;
    if ((ctx.columnWidths[col] ?? config.defaultColumnWidth) === nextWidth) return;
    ctx.columnWidths[col] = nextWidth;
    ctx.manualWidthCols.add(col);
    ctx.renderer.columnResizeLine = colEdgeScreenX(ctx, col);
    ctx.layout.recalcRowHeights(col);
    ctx.scheduleRender();
  };

  /** 列宽拖拽结束:清理定位线与监听,光标恢复 hover 判定。 */
  const handleColResizeWindowUp = (event: MouseEvent): void => {
    if (!colResizeDrag) return;
    colResizeDrag = null;
    ctx.renderer.columnResizeLine = null;
    window.removeEventListener('mousemove', handleColResizeWindowMove);
    window.removeEventListener('mouseup', handleColResizeWindowUp);
    // 按松开时指针位置恢复 hover 光标(拖拽在画布外松开则清除)
    const { x, y } = getCanvasPos(canvas, event);
    canvas.style.cursor = hitTestColumnEdge(ctx, x, y) !== null ? 'col-resize' : '';
    ctx.scheduleRender();
  };

  const handleMouseMove = (event: MouseEvent): void => {
    // 拖拽滚动条/列宽时由 window mousemove 接管,canvas 路径直接让行
    if (scrollbarDrag || colResizeDrag) return;
    const { x, y } = getCanvasPos(canvas, event);

    // 滚动条 hover:滑块加深 + 光标切默认箭头
    const scrollbarHit = ctx.renderer.hitTestScrollbar(x, y);
    if (scrollbarHit !== ctx.renderer.scrollbarActive) {
      ctx.renderer.scrollbarActive = scrollbarHit;
      ctx.scheduleRender();
    }

    // 列宽边界 hover:光标切 col-resize(优先级高于表头 hover)
    const colEdgeHit = hitTestColumnEdge(ctx, x, y);
    // 筛选箭头 hover:底色加深(重绘)+ 光标 pointer
    const arrowHit = ctx.renderer.hitTestFilterArrow(x, y);
    if (arrowHit !== ctx.renderer.hoveredFilterArrow) {
      ctx.renderer.hoveredFilterArrow = arrowHit;
      ctx.scheduleRender();
    }
    canvas.style.cursor = scrollbarHit ? 'default' : arrowHit !== null ? 'pointer' : colEdgeHit !== null ? 'col-resize' : '';

    // 表头 hover 高亮(列宽边界命中时不高亮,让位给拖拽手感)
    const header = colEdgeHit !== null ? null : ctx.renderer.hitTestHeader(x, y);
    const nextHovered = header;
    const hoveredChanged =
      (nextHovered?.type !== ctx.hoveredHeader?.type) ||
      (nextHovered?.index !== ctx.hoveredHeader?.index);
    if (hoveredChanged) {
      ctx.hoveredHeader = nextHovered;
      ctx.scheduleRender();
    }

    if (isDragging) {
      // 拖拽扩展选区(数据区或表头均持续扩展)
      const hit = ctx.renderer.hitTestCell(x, y);
      if (hit) {
        ctx.selectionOps.extendSelectionTo(hit.row, hit.col);
        ctx.scheduleRender();
      }
      // 贴近视口边缘(或拖出画布)时自动滚屏,直至目标行列露出
      updateAutoScroll(x, y);
    }
  };

  const handleMouseUp = (event: MouseEvent): void => {
    isDragging = false;
    stopAutoScroll();
    if (scrollbarDrag) {
      scrollbarDrag = null;
      ctx.renderer.scrollbarDragging = false;
      window.removeEventListener('mousemove', handleScrollbarWindowMove);
      // 按松开时指针位置恢复 hover 态(拖拽在画布外松开则清除高亮,避免残留)
      const { x, y } = getCanvasPos(canvas, event);
      ctx.renderer.scrollbarActive = ctx.renderer.hitTestScrollbar(x, y);
      canvas.style.cursor = ctx.renderer.scrollbarActive ? 'default' : '';
      ctx.scheduleRender(); // 滑块颜色从拖拽态恢复
    }
  };

  const handleMouseLeave = (): void => {
    // 鼠标离开画布:清除表头/滚动条 hover 残留(滚动条/列宽拖拽中保留,由 window mouseup 收尾)
    if (!scrollbarDrag && !colResizeDrag) {
      if (ctx.hoveredHeader !== null || ctx.renderer.scrollbarActive !== null) {
        ctx.hoveredHeader = null;
        ctx.renderer.scrollbarActive = null;
        ctx.scheduleRender();
      }
      canvas.style.cursor = '';
    }
  };

  const handleDoubleClick = (event: MouseEvent): void => {
    const { x, y } = getCanvasPos(canvas, event);
    const hit = ctx.renderer.hitTestCell(x, y);
    if (!hit || config.readOnly) return;
    ctx.cellEditor.openEditor(hit.row, hit.col, model.getCell(hit.row, hit.col));
  };

  const handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    const { x, y } = getCanvasPos(canvas, event);
    const header = ctx.renderer.hitTestHeader(x, y);
    const hit = ctx.renderer.hitTestCell(x, y);
    const row = header?.type === 'row' ? header.index : hit?.row;
    const col = header?.type === 'col' ? header.index : hit?.col;
    if (row === undefined || col === undefined) return;
    // 右键目标不在选区内时,把选区收拢到目标单元格
    if (
      !ctx.selection ||
      row < ctx.selection.startRow || row > ctx.selection.endRow ||
      col < ctx.selection.startCol || col > ctx.selection.endCol
    ) {
      ctx.selectionOps.setAnchorAndSelection(row, col);
      ctx.scheduleRender();
    }
    ctx.contextMenu.build(row, col);
    ctx.contextMenu.element.style.display = 'block';
    ctx.contextMenu.element.style.left = `${event.clientX}px`;
    ctx.contextMenu.element.style.top = `${event.clientY}px`;
  };

  // --- 滚轮 ---
  const handleWheel = (event: WheelEvent): void => {
    // 滚轮打断惯性滚动与选区自动滚屏
    ctx.touch.stopMomentum();
    stopAutoScroll();
    // deltaMode 1 = 行滚动( Firefox)
    const deltaX = event.deltaMode === 1 ? event.deltaX * 16 : event.deltaX;
    const deltaY = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;

    if (config.isAutoAppendRows) {
      // 自动加行:表格有底。纵向已到顶/底且仍向该方向滚动时,不拦截事件,
      // 让滚动链路(scroll chaining)交给外层可滚动容器(meditor 编辑区)。
      const maxScrollX = Math.max(ctx.renderer.totalWidth - ctx.renderer.view.gridWidth, 0);
      const maxScrollY = Math.max(ctx.renderer.totalHeight - ctx.renderer.view.gridHeight, 0);
      const atTop = ctx.renderer.scrollY <= 0 && deltaY < 0;
      const atBottom = ctx.renderer.scrollY >= maxScrollY && deltaY > 0;
      if (deltaY !== 0 && (atTop || atBottom)) {
        return;
      }
      event.preventDefault();
      ctx.renderer.scrollX = Math.min(Math.max(ctx.renderer.scrollX + deltaX, 0), maxScrollX);
      ctx.renderer.scrollY = Math.min(Math.max(ctx.renderer.scrollY + deltaY, 0), maxScrollY);
      ctx.scheduleRender();
      return;
    }

    // 无限滚动:先按当前总高扩容(滚向底部时追行),再计算新的滚动上限
    event.preventDefault();
    ctx.layout.ensureRowsForViewport(ctx.renderer.scrollY + deltaY);
    const maxScrollX = Math.max(ctx.renderer.totalWidth - ctx.renderer.view.gridWidth, 0);
    const maxScrollY = Math.max(ctx.renderer.totalHeight - ctx.renderer.view.gridHeight, 0);
    ctx.renderer.scrollX = Math.min(Math.max(ctx.renderer.scrollX + deltaX, 0), maxScrollX);
    ctx.renderer.scrollY = Math.min(Math.max(ctx.renderer.scrollY + deltaY, 0), maxScrollY);
    ctx.scheduleRender();
  };

  /** 移除拖拽期间挂在 window 上的监听(destroy 用;未挂载时为空操作)。 */
  const dispose = (): void => {
    window.removeEventListener('mousemove', handleScrollbarWindowMove);
    window.removeEventListener('mousemove', handleColResizeWindowMove);
    window.removeEventListener('mouseup', handleColResizeWindowUp);
  };

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleDoubleClick,
    handleContextMenu,
    handleWheel,
    stopAutoScroll,
    dispose
  };
}
