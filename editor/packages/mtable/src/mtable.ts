/**
 * mtable.ts — CSV 表格编辑器主组件(编排层)
 *
 * Canvas 渲染(视觉对齐 Univer Sheets)+ DOM 浮层编辑框 + 键盘/鼠标/滚轮/
 * 触摸交互 + 右键菜单。纯 TS DOM API,零运行时依赖,接口形态与 meditor 一致
 * (create/destroy)。
 *
 * 本文件只负责编排:解析选项、创建 DOM、装配 MtableContext 共享状态、
 * 按序创建各子系统并绑定事件、受控轮询与对外 API。各子系统实现:
 * - core/layout.ts        列宽/行高度量与网格扩容
 * - core/filter-sort.ts   筛选/排序/冻结逻辑
 * - core/cell-editor.ts   单元格编辑浮层
 * - core/selection.ts     选区导航操作与归一化
 * - menu/context-menu.ts  右键菜单
 * - ui/filter-panel.ts    筛选/排序面板浮层
 * - ui/maximize-dialog.ts 全屏弹窗与浮层挂载容器
 * - input/pointer.ts      鼠标/滚轮/滚动条/列宽拖拽/自动滚屏
 * - input/touch-scroll.ts 触摸手势与惯性滚动
 * - input/keyboard.ts     键盘交互
 * - input/clipboard.ts    剪贴板
 */

import './styles/mtable.css';
import { parseCsv, stringifyCsv } from './csv';
import { MtableModel } from './mtable-model';
import { MtableRenderer, type RenderSource } from './renderer';
import { isNumericCellText } from './values';
import { normalizeSelection } from './core/selection';
import { SCROLLBAR_SIZE } from './theme';
import { BUILTIN_MESSAGES } from './messages';
import { MAXIMIZE_ICON_MARKUP } from './icons';
import { createLayoutController } from './core/layout';
import { createFilterSortController } from './core/filter-sort';
import { createCellEditor } from './core/cell-editor';
import { createSelectionController } from './core/selection';
import { createContextMenu } from './menu/context-menu';
import { createFilterPanel } from './ui/filter-panel';
import { createMaximizeDialog } from './ui/maximize-dialog';
import { createPointerController } from './input/pointer';
import { createTouchController } from './input/touch-scroll';
import { createKeyboardController } from './input/keyboard';
import { createClipboardController } from './input/clipboard';
import type { MtableConfig, MtableContext } from './context';
import type {
  MtableApi,
  MtableChangeSource,
  MtableMessages,
  MtableOptions,
  MtableSelection,
} from './types';

/**
 * 创建 CSV 表格编辑器实例(Canvas 渲染,视觉规格对齐 Univer Sheets)。
 *
 * @param options 表格配置:挂载根节点、初始/受控 CSV 与分隔符、语言与文案覆盖、
 *                只读态、全屏按钮、列宽行高等视觉规格,以及行/列增长模式
 *                (无限滚动或自动加行/加列)与触发阈值。
 * @returns 表格实例 API:CSV 读写(setCsv/getCsv)、内容高度测量、
 *          浮层关闭通知桥接与销毁等。
 */
export function createMtable(options: MtableOptions): MtableApi {
  const {
    root,
    defaultValue = '',
    value,
    onChange,
    onLayoutChange,
    readOnly = false,
    locale = 'zh-CN',
    messages,
    fullscreenButton = true,
    delimiter = ',',
    autoColumnWidth = true,
    defaultColumnWidth = 88,
    defaultRowHeight = 24,
    rowHeaderWidth = 46,
    columnHeaderHeight = 20,
    rowMode = 'infiniteScroll',
    autoAppendRowsThreshold = 1,
    autoAppendRowsStep = 1,
    colMode = 'infiniteScroll',
    autoAppendColsThreshold = 2,
    autoAppendColsStep = 5,
    minRowCount = 100,
    minColumnCount = 20,
    maxRowCount = 5000,
  } = options;

  /** 文案表(locale 内置值 + 用户覆盖合并结果;DOM 与子系统共用同一份)。 */
  const resolvedMessages: MtableMessages = { ...BUILTIN_MESSAGES[locale], ...messages };

  // --- DOM 结构 ---
  const wrapper = document.createElement('div');
  wrapper.className = 'mtable-wrapper';

  const canvas = document.createElement('canvas');
  canvas.className = 'mtable-canvas';
  wrapper.appendChild(canvas);
  root.appendChild(wrapper);

  // 编辑浮层(原生 input;支持中文 IME 由原生 input 保证)
  const editorEl = document.createElement('input');
  editorEl.type = 'text';
  editorEl.className = 'mtable-editor';
  editorEl.spellcheck = false;
  wrapper.appendChild(editorEl);

  // 左上角全屏按钮(行头列 × 列头行交叉的小方块):默认透明,hover 显现;
  // 点击把整个表格弹出为最大化 dialog,Esc/关闭按钮还原。
  const expandButton = document.createElement('button');
  expandButton.type = 'button';
  expandButton.className = 'mtable-expand';
  expandButton.innerHTML = MAXIMIZE_ICON_MARKUP;
  expandButton.title = resolvedMessages.fullscreen;
  expandButton.setAttribute('aria-label', expandButton.title);
  if (fullscreenButton) {
    wrapper.appendChild(expandButton);
  }

  // --- 配置与数据模型 ---
  const config: MtableConfig = {
    root,
    readOnly,
    delimiter,
    autoColumnWidth,
    defaultColumnWidth,
    defaultRowHeight,
    rowHeaderWidth,
    columnHeaderHeight,
    isAutoAppendRows: rowMode === 'autoAppendRows',
    isAutoAppendCols: colMode === 'autoAppendCols',
    autoAppendRowsThreshold,
    autoAppendRowsStep,
    autoAppendColsThreshold,
    autoAppendColsStep,
    minRowCount,
    minColumnCount,
    maxRowCount,
    messages: resolvedMessages,
    onChange,
    onLayoutChange,
  };

  const model = new MtableModel({
    defaultColumnWidth,
    defaultRowHeight,
    minRowCount,
    minColumnCount,
  });

  // --- 共享上下文 ---
  // 状态字段对应原 createMtable 函数体内的 let 局部变量;renderer/scheduleRender/
  // emitChange 与各子系统在下方装配段依次赋值(子系统工厂创建期只定义闭包不调用)。
  const ctx = {
    config,
    wrapper,
    canvas,
    editorEl,
    expandButton,
    overlayContainer: document.body,
    model,
    columnWidths: [] as number[],
    manualWidthCols: new Set<number>(),
    selection: null,
    editing: null,
    anchor: { row: 0, col: 0 },
    hoveredHeader: null,
    touchTapDispatch: false,
    filters: new Map<number, Set<string>>(),
    sortState: null,
    freezeRow: -1,
    freezeCol: -1,
  } as MtableContext;

  // --- 渲染器(数据视图经 getter 惰性读取 ctx,与原闭包语义一致) ---
  const renderSource: RenderSource = {
    get freezeRow() {
      return ctx.freezeRow;
    },
    get freezeCol() {
      return ctx.freezeCol;
    },
    get cells() {
      return ctx.model.cells;
    },
    get columnWidths() {
      return ctx.columnWidths;
    },
    get rowHeights() {
      return ctx.model.rowHeights;
    },
    /**
     * 被筛选隐藏的数据行号集合(渲染层跳过其绘制并折叠布局)。
     * 空集合 = 无筛选,全量渲染。
     */
    get hiddenRows() {
      return ctx.filterSort.getHiddenRows();
    },
    get selection() {
      return ctx.editing
        ? {
            startRow: ctx.editing.row,
            endRow: ctx.editing.row,
            startCol: ctx.editing.col,
            endCol: ctx.editing.col,
          }
        : ctx.selection;
    },
    get editing() {
      return ctx.editing ? { row: ctx.editing.row, col: ctx.editing.col } : null;
    },
    get hoveredHeader() {
      return ctx.hoveredHeader;
    },
    isNumericCell(row: number, col: number): boolean {
      return isNumericCellText(ctx.model.getCell(row, col));
    },
    getFilteredCols(): Set<number> {
      return ctx.filterSort.getFilteredCols();
    },
  };

  ctx.renderer = new MtableRenderer({
    canvas,
    source: renderSource,
    defaultColumnWidth,
    defaultRowHeight,
    rowHeaderWidth,
    columnHeaderHeight,
  });

  // --- 核心共享操作 ---

  /** 渲染帧请求句柄(合并同帧多次请求)。 */
  let rafId: number | null = null;

  /** 调度一帧渲染(同帧去重)。 */
  ctx.scheduleRender = (): void => {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      ctx.renderer.render();
    });
  };

  /**
   * 规范化序列化:裁掉尾部全空行(无限滚动追加的空白行不进入 CSV 输出),
   * 并裁掉尾部全空列(最小网格扩容出来的空列不进入 CSV 输出)。
   * 全表为空时返回空字符串。
   */
  const serializeCurrent = (): string => {
    let last = ctx.model.cells.length - 1;
    while (last >= 0 && ctx.model.cells[last]?.every((cell) => cell === '')) {
      last -= 1;
    }
    if (last < 0) {
      return '';
    }
    const rows = ctx.model.cells.slice(0, last + 1);
    // 尾部全空列裁剪:取全部行的最大非空列下标。
    let lastCol = -1;
    for (const row of rows) {
      for (let c = row.length - 1; c > lastCol; c -= 1) {
        if (row[c] !== '') {
          lastCol = c;
          break;
        }
      }
    }
    if (lastCol < 0) {
      return '';
    }
    return stringifyCsv(
      rows.map((row) => (row.length > lastCol + 1 ? row.slice(0, lastCol + 1) : row)),
      delimiter,
    );
  };

  /**
   * 内容变更上报(规范化序列化;同时使隐藏行缓存失效,数据变化可能改变筛选命中)。
   * source 标记变更来源(undo/redo 回放时嵌入方写回外部文档可跳过历史入栈)。
   */
  ctx.emitChange = (source: MtableChangeSource = 'input'): void => {
    ctx.filterSort.invalidateHiddenRows();
    onChange?.(serializeCurrent(), source);
  };

  /** 从 CSV 文本整体重建(setCsv / 初始化用)。 */
  const loadCsv = (csv: string): void => {
    ctx.model.cells = parseCsv(csv, delimiter);
    ctx.model.rowHeights = Array.from({ length: ctx.model.cells.length }, () => defaultRowHeight);
    // 全表重建:手动列宽不持久化,筛选/排序条件一并清空(排序已随数据重排固化)
    ctx.manualWidthCols.clear();
    ctx.filters.clear();
    ctx.sortState = null;
    ctx.freezeRow = -1;
    ctx.freezeCol = -1;
    ctx.filterSort.invalidateHiddenRows();
    ctx.filterPanel.close();
    // 列:自动增加模式起步 = 数据列 + 阈值 + 步长(宽度覆盖由 ensureColumnCoverage 补足);
    // 无限滚动模式保持最小列数网格。
    const initialDataCols = ctx.model.cells.reduce((max, row) => Math.max(max, row.length), 0);
    ctx.model.ensureCapacity(
      0,
      config.isAutoAppendCols
        ? initialDataCols + Math.max(autoAppendColsThreshold, 0) + Math.max(autoAppendColsStep, 1)
        : minColumnCount,
    );
    // 行:自动加行模式起步 = 数据行 + 阈值 + 步长(不铺空白网格,表格有底);
    // 无限滚动模式铺最小行数网格。
    if (config.isAutoAppendRows) {
      ctx.model.ensureCapacity(
        ctx.model.cells.length +
          Math.max(autoAppendRowsThreshold, 0) +
          Math.max(autoAppendRowsStep, 1),
        ctx.model.columnCount,
      );
    } else {
      ctx.model.ensureCapacity(
        Math.max(minRowCount, ctx.model.cells.length),
        ctx.model.columnCount,
      );
    }
    ctx.model.clearHistory();
    ctx.layout.recalcColumnWidths();
    ctx.layout.ensureColumnCoverage();
    ctx.layout.recalcRowHeights();
    ctx.selection = null;
    ctx.anchor = { row: 0, col: 0 };
    ctx.renderer.scrollX = 0;
    ctx.renderer.scrollY = 0;
    ctx.scheduleRender();
  };

  /**
   * 外部按下通知(扩展点):宿主把文档级"外部按下"广播桥接到此函数,
   * 表格自行判断按下落点并收起自己的浮层(筛选面板/右键菜单)。
   * 落点在表格根或自身浮层内部的按下不属于外部(由 handleMouseDown /
   * handleTouchStart 与面板自身交互处理),此处不干预。
   * shadow DOM 场景 document 级事件的 target 会重定向到宿主节点,
   * 用 composedPath 取真实落点。
   */
  const notifyOutsidePress = (event: PointerEvent | MouseEvent | TouchEvent): void => {
    const path = event.composedPath();
    const target = path.length > 0 ? path[0] : event.target;
    if (target instanceof Node) {
      const popup = ctx.filterPanel.popup;
      if (
        (popup?.contains(target)) ||
        ctx.contextMenu.element.contains(target) ||
        wrapper.contains(target)
      ) {
        return;
      }
    }
    ctx.filterPanel.close();
    ctx.contextMenu.close();
  };

  // --- 子系统装配 ---
  // 顺序约定:菜单创建时挂入当前浮层容器(body),全屏弹窗创建时绑定左上角按钮;
  // 首次实际调用发生在装配完成之后的 loadCsv/init 与用户交互。
  ctx.layout = createLayoutController(ctx);
  ctx.filterSort = createFilterSortController(ctx);
  ctx.cellEditor = createCellEditor(ctx);
  ctx.selectionOps = createSelectionController(ctx);
  ctx.contextMenu = createContextMenu(ctx);
  ctx.filterPanel = createFilterPanel(ctx);
  ctx.maximize = createMaximizeDialog(ctx);
  ctx.touch = createTouchController(ctx);
  const pointer = createPointerController(ctx);
  const keyboard = createKeyboardController(ctx);
  const clipboard = createClipboardController(ctx);

  // --- 尺寸观察 ---
  const resizeObserver = new ResizeObserver(() => {
    // 自动增加列模式:尺寸变化后重新保证列覆盖(首帧挂载也经此触发)
    ctx.layout.ensureColumnCoverage();
    ctx.scheduleRender();
  });
  resizeObserver.observe(wrapper);

  // --- 事件绑定 ---
  canvas.tabIndex = 0;
  canvas.addEventListener('mousedown', pointer.handleMouseDown);
  canvas.addEventListener('mousemove', pointer.handleMouseMove);
  canvas.addEventListener('mouseleave', pointer.handleMouseLeave);
  window.addEventListener('mouseup', pointer.handleMouseUp);
  canvas.addEventListener('dblclick', pointer.handleDoubleClick);
  canvas.addEventListener('contextmenu', pointer.handleContextMenu);
  canvas.addEventListener('wheel', pointer.handleWheel, { passive: false });
  canvas.addEventListener('touchstart', ctx.touch.handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', ctx.touch.handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', ctx.touch.handleTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', ctx.touch.handleTouchCancel, { passive: false });
  canvas.addEventListener('keydown', keyboard.handleKeyDown);
  // 编辑态焦点在编辑框上,键盘事件目标是编辑框(冒泡不经过 canvas),需单独绑定
  editorEl.addEventListener('keydown', keyboard.handleKeyDown);
  canvas.addEventListener('copy', clipboard.handleCopy);
  canvas.addEventListener('cut', clipboard.handleCut);
  canvas.addEventListener('paste', clipboard.handlePaste);
  editorEl.addEventListener('blur', () => {
    // 编辑框失焦提交(点击画布的提交已在 mousedown 处理,此处兜底)
    ctx.cellEditor.commitEdit(false);
  });
  const handleDocMouseDown = (event: MouseEvent): void => {
    // 独立使用(无宿主统一广播)时的兜底:与 notifyOutsidePress 同一响应逻辑
    notifyOutsidePress(event);
  };
  document.addEventListener('mousedown', handleDocMouseDown);

  // --- 受控模式轮询(对齐 meditor 的实现方式) ---
  let prevValue = value;
  const pollTimer =
    value !== undefined
      ? window.setInterval(() => {
          if (value !== prevValue) {
            prevValue = value;
            loadCsv(value);
          }
        }, 160)
      : null;

  // --- 初始化 ---
  loadCsv(defaultValue);

  return {
    // 外部按下扩展点:宿主统一广播桥接入口(落点在表格/浮层外时收起浮层)
    notifyOutsidePress,
    getCsv: () => serializeCurrent(),
    setCsv: (csv: string) => {
      loadCsv(csv);
      if (value !== undefined) {
        // 同步受控基线,避免轮询立即回写
        prevValue = value;
      }
      ctx.emitChange();
    },
    getSelection: () => (ctx.selection ? { ...ctx.selection } : null),
    setSelection: (sel: MtableSelection) => {
      // 无限滚动语义:API 选区可指向任意未扩容区域,先扩容到能容纳目标选区
      // (封顶 maxRowCount),再归一化,否则选区会被钳到当前行数。
      const neededRows = Math.min(Math.max(sel.startRow, sel.endRow) + 1, maxRowCount);
      const neededCols = Math.max(sel.startCol, sel.endCol) + 1;
      if (neededRows > ctx.model.rowCount || neededCols > ctx.model.columnCount) {
        ctx.model.ensureCapacity(
          config.isAutoAppendRows ? neededRows : Math.max(neededRows, minRowCount),
          config.isAutoAppendCols ? neededCols : Math.max(neededCols, minColumnCount),
        );
      }
      ctx.selection = normalizeSelection(sel, ctx.model.rowCount, ctx.model.columnCount);
      ctx.layout.scrollCellIntoViewWithExpand(ctx.selection.endRow, ctx.selection.startCol);
      ctx.scheduleRender();
    },
    clearSelection: () => {
      ctx.selection = null;
      ctx.anchor = { row: 0, col: 0 };
      ctx.scheduleRender();
    },
    // 内容总高含水平滚动条轨道带(轨道带独立于网格,网格高度之外);
    // 行高取渲染布局高度(被筛选隐藏的行折叠为 0)
    getContentHeight: () => columnHeaderHeight + SCROLLBAR_SIZE + ctx.renderer.totalHeight,
    getScroll: () => ({ x: ctx.renderer.scrollX, y: ctx.renderer.scrollY }),
    /** 当前生效的筛选条件(列 → 选中的原始值集合)。 */
    getFilters: () => {
      const result: Record<number, string[]> = {};
      for (const [col, values] of ctx.filters) {
        result[col] = Array.from(values);
      }
      return result;
    },
    /** 清除所有筛选(不改动数据)。 */
    clearFilters: () => {
      if (ctx.filters.size === 0) return;
      ctx.filters.clear();
      ctx.filterSort.applyFilterChange();
    },
    // 浮层挂载容器切换入口(宿主全屏弹窗打开时把浮层挂进弹窗宿主)
    setOverlayContainer: (container: HTMLElement | null) => {
      ctx.maximize.setOverlayContainer(container);
    },
    undo: () => {
      ctx.model.undo();
      ctx.layout.recalcColumnWidths();
      ctx.layout.recalcRowHeights();
      if (config.isAutoAppendRows) ctx.layout.ensureTrailingEmptyRows();
      ctx.layout.ensureColumnCoverage();
      ctx.selectionOps.clampSelection();
      ctx.emitChange('undo');
      ctx.scheduleRender();
    },
    redo: () => {
      ctx.model.redo();
      ctx.layout.recalcColumnWidths();
      ctx.layout.recalcRowHeights();
      if (config.isAutoAppendRows) ctx.layout.ensureTrailingEmptyRows();
      ctx.layout.ensureColumnCoverage();
      ctx.selectionOps.clampSelection();
      ctx.emitChange('redo');
      ctx.scheduleRender();
    },
    focus: () => {
      canvas.focus();
    },
    destroy: () => {
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      resizeObserver.disconnect();
      canvas.removeEventListener('mousedown', pointer.handleMouseDown);
      canvas.removeEventListener('mousemove', pointer.handleMouseMove);
      canvas.removeEventListener('mouseleave', pointer.handleMouseLeave);
      window.removeEventListener('mouseup', pointer.handleMouseUp);
      // 拖拽期间挂在 window 上的监听(滚动条/列宽拖拽;未挂载时为空操作)
      pointer.dispose();
      canvas.removeEventListener('dblclick', pointer.handleDoubleClick);
      canvas.removeEventListener('contextmenu', pointer.handleContextMenu);
      canvas.removeEventListener('wheel', pointer.handleWheel);
      canvas.removeEventListener('touchstart', ctx.touch.handleTouchStart);
      canvas.removeEventListener('touchmove', ctx.touch.handleTouchMove);
      canvas.removeEventListener('touchend', ctx.touch.handleTouchEnd);
      canvas.removeEventListener('touchcancel', ctx.touch.handleTouchCancel);
      ctx.touch.stopMomentum();
      pointer.stopAutoScroll();
      canvas.removeEventListener('keydown', keyboard.handleKeyDown);
      editorEl.removeEventListener('keydown', keyboard.handleKeyDown);
      canvas.removeEventListener('copy', clipboard.handleCopy);
      canvas.removeEventListener('cut', clipboard.handleCut);
      canvas.removeEventListener('paste', clipboard.handlePaste);
      document.removeEventListener('mousedown', handleDocMouseDown);
      ctx.filterPanel.close();
      ctx.maximize.close();
      ctx.expandButton.removeEventListener('click', ctx.maximize.open);
      ctx.contextMenu.element.remove();
      wrapper.remove();
    },
  };
}
