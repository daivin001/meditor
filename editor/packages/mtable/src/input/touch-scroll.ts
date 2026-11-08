/**
 * input/touch-scroll.ts — 触摸与惯性滚动子系统
 *
 * 从 createMtable 函数体拆出。单指:点按选中(合成 mousedown 走鼠标路径)/
 * 拖动平移上下左右/双击编辑(合成 dblclick)/长按右键菜单(合成 contextmenu);
 * 列边界与滚动条拖拽与鼠标同语义;松手速度足够时启动惯性滚动,
 * 滚轮或新触摸会打断。触摸下列边界/箭头命中容差放宽(TOUCH_EDGE_TOLERANCE,
 * 经 ctx.touchTapDispatch 传递给鼠标路径)。
 */

import { COLUMN_MIN_WIDTH } from '../theme';
import { TOUCH_EDGE_TOLERANCE, colEdgeScreenX, getCanvasPos, hitTestColumnEdge, hitTestColumnEdgeAnywhere } from './hit-test';
import type { MtableContext, MtableTouchApi } from '../context';

/** 触摸点按判定:累计位移阈值(px,超过即转为拖动)。 */
const TOUCH_TAP_SLOP = 10;
/** 长按触发时长(ms),弹出右键菜单。 */
const TOUCH_LONG_PRESS_MS = 500;

/** 触摸手势运行态(null = 无活动触摸)。 */
interface TouchGestureState {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  lastTime: number;
  moved: boolean;
  mode: 'pan' | 'scrollbar' | 'colResize';
  scrollbar: { type: 'v' | 'h'; grabOffset: number } | null;
  colResize: { col: number; startWidth: number } | null;
  /** 列边界候补:起点落在边界上,待首次移动判方向(横向→调宽,纵向→平移)。 */
  resizeCandidate: { col: number; startWidth: number } | null;
  velocityX: number;
  velocityY: number;
  longPressTimer: number | null;
  longPressFired: boolean;
}

/** 创建触摸与惯性滚动子系统。 */
export function createTouchController(ctx: MtableContext): MtableTouchApi {
  const { config, canvas } = ctx;

  /** 触摸手势运行态。 */
  let touchGesture: TouchGestureState | null = null;

  /** 上一次点按(双击检测:间隔 < 350ms 且位移 < 20px)。 */
  let lastTapInfo: { time: number; x: number; y: number } | null = null;

  /** 惯性滚动动画帧(null = 未在惯性滚动)。 */
  let momentumRaf: number | null = null;

  /** 停止惯性滚动动画。 */
  const stopMomentum = (): void => {
    if (momentumRaf !== null) {
      cancelAnimationFrame(momentumRaf);
      momentumRaf = null;
    }
  };

  /** 把溢出的纵向位移交给最近的可滚动祖先(嵌入态滚到顶/底后滚动交给外层,同滚轮链路)。 */
  const chainScrollAncestor = (dy: number): void => {
    let el = canvas.parentElement;
    while (el && el !== document.body) {
      const overflowY = getComputedStyle(el).overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        el.scrollTop += dy;
        return;
      }
      el = el.parentElement;
    }
    window.scrollBy(0, dy);
  };

  /**
   * 触摸平移:内容跟随手指(上下左右),含边界 clamp、无限滚动扩行、
   * 嵌入态(autoAppendRows)纵向到顶/底后把残余位移交给外层滚动容器。
   * @returns 纵向残余位移(非 0 = 已到边界且发生外层滚动)
   */
  const panTouch = (dx: number, dy: number): number => {
    const maxScrollX = Math.max(ctx.renderer.totalWidth - ctx.renderer.view.gridWidth, 0);
    const maxScrollY = Math.max(ctx.renderer.totalHeight - ctx.renderer.view.gridHeight, 0);
    const proposedX = ctx.renderer.scrollX - dx;
    const proposedY = ctx.renderer.scrollY - dy;
    ctx.renderer.scrollX = Math.min(Math.max(proposedX, 0), maxScrollX);
    ctx.renderer.scrollY = Math.min(Math.max(proposedY, 0), maxScrollY);
    if (!config.isAutoAppendRows) {
      ctx.layout.ensureRowsForViewport(ctx.renderer.scrollY);
    }
    const residualY = proposedY - ctx.renderer.scrollY;
    if (config.isAutoAppendRows && Math.abs(residualY) > 0.5) {
      chainScrollAncestor(residualY);
    }
    ctx.scheduleRender();
    return residualY;
  };

  /** 惯性滚动:按松手速度衰减平移,到边界或速度过小时停止。 */
  const startMomentum = (velocityX: number, velocityY: number): void => {
    stopMomentum();
    let vx = velocityX;
    let vy = velocityY;
    let last = performance.now();
    const step = (now: number): void => {
      const dt = Math.min(now - last, 48);
      last = now;
      const decay = 0.93 ** (dt / 16.7);
      vx *= decay;
      vy *= decay;
      if (Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01) {
        momentumRaf = null;
        return;
      }
      const beforeX = ctx.renderer.scrollX;
      const beforeY = ctx.renderer.scrollY;
      const residualY = panTouch(vx * dt, vy * dt);
      // 撞边界即停:横向惯性滚到 X 边界 / 纵向惯性滚到 Y 边界(残余位移非 0)
      const xStuck = ctx.renderer.scrollX === beforeX && Math.abs(vx) > Math.abs(vy);
      const yStuck =
        (residualY !== 0 || ctx.renderer.scrollY === beforeY) && Math.abs(vy) >= Math.abs(vx);
      if (xStuck || yStuck) {
        momentumRaf = null;
        return;
      }
      momentumRaf = requestAnimationFrame(step);
    };
    momentumRaf = requestAnimationFrame(step);
  };

  /** 清理触摸手势定时器等挂起资源(手势结束/取消/销毁时调用)。 */
  const clearTouchGesture = (): void => {
    if (touchGesture?.longPressTimer !== null && touchGesture?.longPressTimer !== undefined) {
      window.clearTimeout(touchGesture.longPressTimer);
    }
    touchGesture = null;
  };

  const handleTouchStart = (event: TouchEvent): void => {
    stopMomentum();
    ctx.contextMenu.close();
    // 同 handleMouseDown:同列筛选箭头留给 toggle 分支,避免通用关闭吞掉收起动作
    const touchPos = getCanvasPos(canvas, event.changedTouches[0]!);
    const touchArrowCol = ctx.renderer.hitTestFilterArrow(touchPos.x, touchPos.y, TOUCH_EDGE_TOLERANCE);
    if (
      ctx.filterPanel.state &&
      ctx.filterPanel.popup &&
      !ctx.filterPanel.popup.contains(event.target as Node) &&
      touchArrowCol !== ctx.filterPanel.state.col
    ) {
      ctx.filterPanel.close();
    }
    const touch = event.changedTouches[0]!;
    const pos = getCanvasPos(canvas, touch);
    // 触摸无 hover:清除悬停残留
    ctx.hoveredHeader = null;
    ctx.renderer.hoveredFilterArrow = null;
    touchGesture = {
      id: touch.identifier,
      startX: pos.x,
      startY: pos.y,
      lastX: pos.x,
      lastY: pos.y,
      lastTime: event.timeStamp || performance.now(),
      moved: false,
      mode: 'pan',
      scrollbar: null,
      colResize: null,
      resizeCandidate: null,
      velocityX: 0,
      velocityY: 0,
      longPressTimer: null,
      longPressFired: false
    };
    const gesture = touchGesture;
    // 滚动条:滑块拖拽 / 轨道跳转(与 mousedown 语义一致)
    const scrollbar = ctx.renderer.hitTestScrollbar(pos.x, pos.y);
    if (scrollbar) {
      const geom = scrollbar === 'v' ? ctx.renderer.verticalScrollbarGeometry : ctx.renderer.horizontalScrollbarGeometry;
      ctx.renderer.scrollbarActive = scrollbar;
      if (geom) {
        const coord = scrollbar === 'v' ? pos.y : pos.x;
        const onThumb = coord >= geom.thumbStart && coord <= geom.thumbStart + geom.thumbLength;
        ctx.renderer.scrollbarDragging = true;
        gesture.mode = 'scrollbar';
        gesture.scrollbar = { type: scrollbar, grabOffset: onThumb ? coord - geom.thumbStart : geom.thumbLength / 2 };
        ctx.renderer.dragScrollbarTo(scrollbar, pos.x, pos.y, gesture.scrollbar.grabOffset);
        if (scrollbar === 'v') {
          ctx.layout.ensureRowsForViewport(ctx.renderer.scrollY);
        }
      }
    } else {
      // 列边界(触摸放宽容差,整列高度均可命中):记为候补,首次移动横向才转调宽
      // (否则平移手势极易被边界误判劫持)
      const colEdge = pos.y < config.columnHeaderHeight
        ? hitTestColumnEdge(ctx, pos.x, pos.y, TOUCH_EDGE_TOLERANCE)
        : hitTestColumnEdgeAnywhere(ctx, pos.x, TOUCH_EDGE_TOLERANCE);
      if (colEdge !== null) {
        gesture.resizeCandidate = { col: colEdge, startWidth: ctx.columnWidths[colEdge] ?? config.defaultColumnWidth };
      } else if (ctx.editing) {
        // 编辑中触摸网格:点在编辑格外先提交(与 mousedown 一致)
        const hit = ctx.renderer.hitTestCell(pos.x, pos.y);
        if (!hit || hit.row !== ctx.editing.row || hit.col !== ctx.editing.col) {
          ctx.cellEditor.commitEdit(false);
        }
      }
      // 长按(未移动)→ 右键菜单
      gesture.longPressTimer = window.setTimeout(() => {
        if (!touchGesture || touchGesture.id !== touch.identifier || touchGesture.moved) {
          return;
        }
        touchGesture.longPressFired = true;
        canvas.dispatchEvent(new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: touch.clientX,
          clientY: touch.clientY
        }));
      }, TOUCH_LONG_PRESS_MS);
    }
    // 抑制浏览器合成鼠标事件/原生滚动/双击缩放(触摸交互全部自管)
    event.preventDefault();
  };

  const handleTouchMove = (event: TouchEvent): void => {
    const gesture = touchGesture;
    if (!gesture) return;
    let touch: Touch | null = null;
    for (let i = 0; i < event.changedTouches.length; i += 1) {
      if (event.changedTouches[i]?.identifier === gesture.id) {
        touch = event.changedTouches[i]!;
        break;
      }
    }
    if (!touch) return;
    const pos = getCanvasPos(canvas, touch);
    const now = event.timeStamp || performance.now();
    const dt = Math.max(now - gesture.lastTime, 1);
    const dx = pos.x - gesture.lastX;
    const dy = pos.y - gesture.lastY;
    gesture.lastX = pos.x;
    gesture.lastY = pos.y;
    gesture.lastTime = now;
    if (!gesture.moved) {
      if (Math.hypot(pos.x - gesture.startX, pos.y - gesture.startY) < TOUCH_TAP_SLOP) {
        return; // 位移未超阈值:仍视作点按
      }
      gesture.moved = true;
      if (gesture.longPressTimer !== null) {
        window.clearTimeout(gesture.longPressTimer);
        gesture.longPressTimer = null;
      }
      // 方向决策:边界候补 + 首次移动横向为主 → 调列宽;否则(含纵向拖边界)平移
      if (gesture.resizeCandidate) {
        const horizontal = Math.abs(pos.x - gesture.startX) >= Math.abs(pos.y - gesture.startY);
        if (horizontal) {
          gesture.mode = 'colResize';
          gesture.colResize = gesture.resizeCandidate;
          ctx.renderer.columnResizeLine = colEdgeScreenX(ctx, gesture.colResize.col);
        }
        gesture.resizeCandidate = null;
      }
    }
    if (gesture.longPressFired) {
      return; // 长按菜单已弹出:本次手势不再平移
    }
    // 速度指数平滑(供惯性滚动)
    gesture.velocityX = gesture.velocityX * 0.7 + (dx / dt) * 0.3;
    gesture.velocityY = gesture.velocityY * 0.7 + (dy / dt) * 0.3;
    if (gesture.mode === 'scrollbar' && gesture.scrollbar) {
      ctx.renderer.dragScrollbarTo(gesture.scrollbar.type, pos.x, pos.y, gesture.scrollbar.grabOffset);
      if (gesture.scrollbar.type === 'v') {
        ctx.layout.ensureRowsForViewport(ctx.renderer.scrollY);
      }
    } else if (gesture.mode === 'colResize' && gesture.colResize) {
      const next = Math.max(gesture.colResize.startWidth + (pos.x - gesture.startX), COLUMN_MIN_WIDTH);
      if ((ctx.columnWidths[gesture.colResize.col] ?? config.defaultColumnWidth) !== next) {
        ctx.columnWidths[gesture.colResize.col] = next;
        ctx.manualWidthCols.add(gesture.colResize.col);
        ctx.renderer.columnResizeLine = colEdgeScreenX(ctx, gesture.colResize.col);
        ctx.layout.recalcRowHeights(gesture.colResize.col);
      }
    } else {
      panTouch(dx, dy);
    }
    ctx.scheduleRender();
    event.preventDefault();
  };

  const handleTouchEnd = (event: TouchEvent): void => {
    const gesture = touchGesture;
    if (!gesture) return;
    let ended = false;
    for (let i = 0; i < event.changedTouches.length; i += 1) {
      if (event.changedTouches[i]?.identifier === gesture.id) {
        ended = true;
        break;
      }
    }
    if (!ended) return;
    if (gesture.longPressTimer !== null) {
      window.clearTimeout(gesture.longPressTimer);
    }
    const wasMoved = gesture.moved;
    const wasLongPress = gesture.longPressFired;
    const mode = gesture.mode;
    const velocityX = gesture.velocityX;
    const velocityY = gesture.velocityY;
    const pos = { x: gesture.lastX, y: gesture.lastY };
    touchGesture = null;
    event.preventDefault();

    if (mode === 'scrollbar') {
      ctx.renderer.scrollbarDragging = false;
      ctx.renderer.scrollbarActive = ctx.renderer.hitTestScrollbar(pos.x, pos.y);
      ctx.scheduleRender();
      return;
    }
    if (mode === 'colResize') {
      ctx.renderer.columnResizeLine = null;
      ctx.scheduleRender();
      return;
    }
    if (wasLongPress) {
      return; // 长按菜单已弹出:不当作点按
    }
    if (!wasMoved) {
      // 点按:双击检测 → 进入编辑;否则合成鼠标点击走既有选中/箭头/滚动条路径
      const now = performance.now();
      const isDoubleTap = lastTapInfo !== null
        && now - lastTapInfo.time < 350
        && Math.hypot(pos.x - lastTapInfo.x, pos.y - lastTapInfo.y) < 20;
      lastTapInfo = isDoubleTap ? null : { time: now, x: pos.x, y: pos.y };
      const canvasRect = canvas.getBoundingClientRect();
      ctx.touchTapDispatch = true;
      try {
        if (isDoubleTap) {
          canvas.dispatchEvent(new MouseEvent('dblclick', {
            bubbles: true,
            cancelable: true,
            clientX: canvasRect.left + pos.x,
            clientY: canvasRect.top + pos.y
          }));
          return;
        }
        canvas.dispatchEvent(new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientX: canvasRect.left + pos.x,
          clientY: canvasRect.top + pos.y
        }));
        window.dispatchEvent(new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientX: canvasRect.left + pos.x,
          clientY: canvasRect.top + pos.y
        }));
      } finally {
        ctx.touchTapDispatch = false;
      }
      return;
    }
    // 拖动结束:速度足够时启动惯性滚动
    if (Math.abs(velocityX) > 0.05 || Math.abs(velocityY) > 0.05) {
      startMomentum(velocityX, velocityY);
    }
  };

  const handleTouchCancel = (event: TouchEvent): void => {
    const gesture = touchGesture;
    if (!gesture) return;
    for (let i = 0; i < event.changedTouches.length; i += 1) {
      if (event.changedTouches[i]?.identifier === gesture.id) {
        if (gesture.mode === 'colResize') {
          ctx.renderer.columnResizeLine = null;
        }
        if (gesture.mode === 'scrollbar') {
          ctx.renderer.scrollbarDragging = false;
          ctx.renderer.scrollbarActive = null;
        }
        clearTouchGesture();
        ctx.scheduleRender();
        break;
      }
    }
  };

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    stopMomentum
  };
}
