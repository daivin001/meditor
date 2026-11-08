/**
 * context.ts — createMtable 各子系统共享的运行态上下文
 *
 * 原实现是单个 createMtable 函数体内的 ~116 个闭包共享同一组局部变量;
 * 拆分后由 MtableContext 承载这些共享状态(可变字段,各子系统经 ctx 读写,
 * 与原闭包对 let 局部变量的访问语义一致),各子系统以工厂函数形式接收 ctx。
 *
 * 装配约定(见 mtable.ts):ctx 对象创建时仅含状态字段,scheduleRender /
 * emitChange 与各子系统(layout/filterSort/…)在装配段依次赋值;子系统工厂
 * 创建期间只定义闭包不调用,首次调用发生在装配完成之后,因此跨子系统引用
 * (如 pointer 调 ctx.touch.stopMomentum)在运行期必然已就绪。
 */

import type { MtableModel } from './mtable-model';
import type { MtableRenderer } from './renderer';
import type {
  MtableChangeSource,
  MtableMessages,
  MtableSelection
} from './types';

// --- 运行态子类型(与原 createMtable 内的局部变量形状一一对应) ---

/** 编辑中单元格(null = 未编辑)。 */
export interface MtableEditingState {
  row: number;
  col: number;
  /** 打开编辑框时的初值(不变才跳过提交)。 */
  initialValue: string;
}

/** 选区锚点(Shift+点击/方向键扩展选区的基准)。 */
export interface MtableCellAnchor {
  row: number;
  col: number;
}

/** 悬停的表头(null = 无)。 */
export interface MtableHoveredHeader {
  type: 'row' | 'col';
  index: number;
}

/** 各列排序方向(null = 该列未排序;同一时刻只有一列生效)。 */
export interface MtableSortState {
  col: number;
  dir: 'asc' | 'desc';
}

/** 筛选面板打开状态(null = 关闭;打开时记录目标列与 tab)。 */
export interface MtableFilterPanelOpenState {
  col: number;
  tab: 'filter' | 'sort';
}

/** 滚动条拖拽态(grabOffset = 按下时指针相对滑块起点的偏移)。 */
export interface MtableScrollbarDragState {
  type: 'v' | 'h';
  grabOffset: number;
}

/** 列宽拖拽态(startX/startWidth = 按下时指针 x 与列宽)。 */
export interface MtableColResizeDragState {
  col: number;
  startX: number;
  startWidth: number;
}

// --- 子系统 API(接口集中在本文件,实现分别在各自模块) ---

/** 列宽/行高/扩容子系统(core/layout.ts)。 */
export interface MtableLayoutApi {
  /** 插列后平移手动列宽集合(at 及其后的列号 +1)。 */
  shiftManualWidthColsForInsert(at: number): void;
  /** 删列后平移手动列宽集合(at 列移除,其后列号 -1)。 */
  shiftManualWidthColsForDelete(at: number): void;
  /** 按内容自适应列宽(手动拖拽过的列跳过重算)。 */
  recalcColumnWidths(): void;
  /** 按当前列宽重算数据区行高(onlyCol = 仅重算该列有文本的行)。 */
  recalcRowHeights(onlyCol?: number): void;
  /** 数据行数(尾部全空行不计)。 */
  getDataRowCount(): number;
  /** 数据列数(尾部全空列不计)。 */
  getDataColCount(): number;
  /** 自动加行模式:数据末尾空行数 ≤ 阈值时补行。 */
  ensureTrailingEmptyRows(): void;
  /** 自动增加列模式:保证空列阈值与总宽覆盖。 */
  ensureColumnCoverage(): void;
  /** 无限滚动:保证可视区(含缓冲)之下空白行足够。 */
  ensureRowsForViewport(nextScrollY: number): void;
  /** 保证目标行附近有足够空白行并把单元格滚入可视区。 */
  scrollCellIntoViewWithExpand(row: number, col: number): void;
}

/** 筛选/排序/冻结逻辑子系统(core/filter-sort.ts)。 */
export interface MtableFilterSortApi {
  /** 隐藏行缓存置脏(数据/条件变化后调用,渲染帧惰性重算)。 */
  invalidateHiddenRows(): void;
  /** 当前被筛选隐藏的数据行号集合(缓存未脏时直接返回)。 */
  getHiddenRows(): ReadonlySet<number>;
  /** 方向键导航时的下一个可见行(跳过被筛选隐藏的行)。 */
  nextVisibleRow(from: number, delta: 1 | -1): number;
  /** 应用排序:数据行按该列值重排(记录撤销)。 */
  applySort(col: number, dir: 'asc' | 'desc'): void;
  /** 清除某列的筛选与排序(面板"重置"按钮)。 */
  resetColumnFilterSort(col: number): void;
  /** 筛选条件变化后应用:重算隐藏行 + 刷新箭头 + 触发布局回调 + 重绘。 */
  applyFilterChange(): void;
  /** 设置过筛选(选值子集)或排序的列号集合(渲染箭头"生效"态)。 */
  getFilteredCols(): Set<number>;
}

/** 单元格编辑框子系统(core/cell-editor.ts)。 */
export interface MtableCellEditorApi {
  /** 提交编辑框内容到模型;moveAfter = 提交后向下移动选区。 */
  commitEdit(moveAfter: boolean): void;
  /** 打开单元格编辑框(initialText 省略时全选原文本)。 */
  openEditor(row: number, col: number, initialText?: string): void;
}

/** 选区导航操作子系统(core/selection.ts)。 */
export interface MtableSelectionOpsApi {
  /** 设置锚点并收拢选区到该单元格。 */
  setAnchorAndSelection(row: number, col: number): void;
  /** 锚点不动,扩展选区到指定单元格(Shift 导航)。 */
  extendSelectionTo(row: number, col: number): void;
  /** 选区裁剪到数据界内(行列删除后调用)。 */
  clampSelection(): void;
}

/** 右键菜单子系统(menu/context-menu.ts)。 */
export interface MtableContextMenuApi {
  /** 菜单浮层 DOM(随浮层挂载容器搬移/销毁时移除)。 */
  readonly element: HTMLDivElement;
  /** 关闭菜单(仅隐藏,不重建)。 */
  close(): void;
  /** 按目标单元格重建菜单项。 */
  build(row: number, col: number): void;
}

/** 筛选面板浮层子系统(ui/filter-panel.ts)。 */
export interface MtableFilterPanelApi {
  /** 关闭面板(不落地草稿;同时取消未触发的搜索防抖)。 */
  close(): void;
  /** 在指定列头下方打开面板(首次点击时创建 DOM)。 */
  open(col: number): void;
  /** 面板打开状态(null = 关闭);pointer/touch 判定"同列箭头再点收起"用。 */
  readonly state: MtableFilterPanelOpenState | null;
  /** 面板浮层 DOM(null = 未创建);外部按下落点判定用。 */
  readonly popup: HTMLDivElement | null;
}

/** 全屏弹窗与浮层挂载容器子系统(ui/maximize-dialog.ts)。 */
export interface MtableMaximizeApi {
  /** 打开全屏弹窗:整表搬入 body/ShadowRoot 级 maximized dialog。 */
  open(): void;
  /** 关闭全屏弹窗:表格搬回原挂载点并还原布局。 */
  close(): void;
  /** 切换浮层(右键菜单/筛选面板)挂载容器;传 null 恢复 document.body。 */
  setOverlayContainer(container: HTMLElement | null): void;
}

/** 触摸与惯性滚动子系统(input/touch-scroll.ts)。 */
export interface MtableTouchApi {
  handleTouchStart(event: TouchEvent): void;
  handleTouchMove(event: TouchEvent): void;
  handleTouchEnd(event: TouchEvent): void;
  handleTouchCancel(event: TouchEvent): void;
  /** 停止惯性滚动动画。 */
  stopMomentum(): void;
}

/** 鼠标/滚轮/自动滚屏子系统(input/pointer.ts)。 */
export interface MtablePointerApi {
  handleMouseDown(event: MouseEvent): void;
  handleMouseMove(event: MouseEvent): void;
  handleMouseUp(event: MouseEvent): void;
  handleMouseLeave(): void;
  handleDoubleClick(event: MouseEvent): void;
  handleContextMenu(event: MouseEvent): void;
  handleWheel(event: WheelEvent): void;
  /** 停止选区拖拽自动滚屏。 */
  stopAutoScroll(): void;
  /** 移除拖拽期间挂在 window 上的监听(destroy 用;未挂载时为空操作)。 */
  dispose(): void;
}

/** 键盘子系统(input/keyboard.ts)。 */
export interface MtableKeyboardApi {
  handleKeyDown(event: KeyboardEvent): void;
}

/** 剪贴板子系统(input/clipboard.ts)。 */
export interface MtableClipboardApi {
  handleCopy(event: ClipboardEvent): void;
  handleCut(event: ClipboardEvent): void;
  handlePaste(event: ClipboardEvent): void;
}

// --- 配置与上下文 ---

/** 归一化后的实例配置(创建后只读;全部来自用户选项或其默认值)。 */
export interface MtableConfig {
  readonly root: HTMLElement;
  readonly readOnly: boolean;
  readonly delimiter: string;
  readonly autoColumnWidth: boolean;
  readonly defaultColumnWidth: number;
  readonly defaultRowHeight: number;
  readonly rowHeaderWidth: number;
  readonly columnHeaderHeight: number;
  /** 是否为自动加行模式(表格有底)。 */
  readonly isAutoAppendRows: boolean;
  /** 是否为自动增加列模式。 */
  readonly isAutoAppendCols: boolean;
  readonly autoAppendRowsThreshold: number;
  readonly autoAppendRowsStep: number;
  readonly autoAppendColsThreshold: number;
  readonly autoAppendColsStep: number;
  readonly minRowCount: number;
  readonly minColumnCount: number;
  readonly maxRowCount: number;
  /** 文案表(locale 内置值 + 用户覆盖合并结果)。 */
  readonly messages: MtableMessages;
  readonly onChange?: (csv: string, source: MtableChangeSource) => void;
  readonly onLayoutChange?: () => void;
}

/**
 * 各子系统共享的运行态上下文。
 * 状态字段对应原 createMtable 函数体内的 let 局部变量;子系统字段由
 * mtable.ts 装配段赋值(见文件顶部装配约定)。
 */
export interface MtableContext {
  /** 归一化配置(创建后只读)。 */
  readonly config: MtableConfig;

  // --- DOM 引用(装配期创建,之后只读) ---
  readonly wrapper: HTMLDivElement;
  readonly canvas: HTMLCanvasElement;
  readonly editorEl: HTMLInputElement;
  readonly expandButton: HTMLButtonElement;
  /** 浮层挂载容器(右键菜单/筛选面板的父节点;setOverlayContainer 可切换)。 */
  overlayContainer: HTMLElement;

  // --- 数据与布局状态 ---
  readonly model: MtableModel;
  /** 列宽数组(autoColumnWidth 开启时随内容重算)。 */
  columnWidths: number[];
  /** 被手动拖拽过宽度的列(仅会话内生效,loadCsv 时清空)。 */
  readonly manualWidthCols: Set<number>;

  // --- 选区与编辑状态 ---
  /** 当前选区(null = 无选区,不绘制选中框)。 */
  selection: MtableSelection | null;
  /** 编辑中单元格(null = 未编辑)。 */
  editing: MtableEditingState | null;
  /** 选区锚点。 */
  anchor: MtableCellAnchor;
  /** 悬停的表头(pointer mousemove 写入,touchstart 清除,渲染层读取)。 */
  hoveredHeader: MtableHoveredHeader | null;
  /** 触摸点按合成 mousedown 期间为 true(touch 写,pointer 命中容差放宽读)。 */
  touchTapDispatch: boolean;

  // --- 筛选/排序/冻结状态 ---
  /** 筛选条件:列号 → 选中的原始单元格值集合(空表 = 无筛选)。 */
  filters: Map<number, Set<string>>;
  /** 各列排序方向(null = 未排序)。 */
  sortState: MtableSortState | null;
  /** 冻结行(0 基数据行号;-1 = 无冻结)。 */
  freezeRow: number;
  /** 冻结列(0 基列号;-1 = 无冻结)。 */
  freezeCol: number;

  // --- 渲染与子系统(装配段赋值;readonly 不用——它们在 ctx 创建后才写入) ---
  renderer: MtableRenderer;
  layout: MtableLayoutApi;
  filterSort: MtableFilterSortApi;
  cellEditor: MtableCellEditorApi;
  selectionOps: MtableSelectionOpsApi;
  contextMenu: MtableContextMenuApi;
  filterPanel: MtableFilterPanelApi;
  maximize: MtableMaximizeApi;
  touch: MtableTouchApi;

  /** 调度一帧渲染(同帧去重)。 */
  scheduleRender(): void;
  /** 内容变更上报(规范化序列化 + 隐藏行缓存失效)。 */
  emitChange(source?: MtableChangeSource): void;
}
