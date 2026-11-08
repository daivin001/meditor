/**
 * types.ts — mtable 公共类型定义
 */

/** 选项文案表(右键菜单/筛选排序面板等,允许整表覆盖)。 */
export interface MtableMessages {
  /** 右键菜单:插入行 */
  insertRow: string;
  /** 右键菜单:删除行 */
  deleteRow: string;
  /** 右键菜单:插入列 */
  insertColumn: string;
  /** 右键菜单:删除列 */
  deleteColumn: string;
  /** 右键菜单:清空内容 */
  clearContents: string;
  /** 筛选面板:重置按钮(清除该列筛选与排序) */
  reset: string;
  /** 筛选面板:筛选 tab */
  filterTab: string;
  /** 筛选面板:排序 tab */
  sortTab: string;
  /** 排序 tab:升序菜单项 */
  sortAsc: string;
  /** 排序 tab:降序菜单项 */
  sortDesc: string;
  /** 筛选面板:全选 */
  selectAll: string;
  /** 筛选面板:搜索框占位 */
  searchPlaceholder: string;
  /** 筛选面板:空值显示文案 */
  blankValue: string;
  /** 筛选面板:仅筛选(悬停列表项时) */
  filterOnly: string;
  /** 筛选面板:取消按钮 */
  cancel: string;
  /** 筛选面板:确认按钮 */
  confirm: string;
  /** 全屏弹窗标题 */
  fullscreenTitle: string;
  /** 左上角全屏按钮提示 */
  fullscreen: string;
  /** 全屏弹窗关闭按钮提示 */
  close: string;
  /** 右键菜单:冻结至当前行(含行号,{0} 为行号) */
  freezeRow: string;
  /** 右键菜单:冻结至当前列(含列号,{0} 为列号) */
  freezeCol: string;
  /** 右键菜单:取消冻结行 */
  unfreezeRow: string;
  /** 右键菜单:取消冻结列 */
  unfreezeCol: string;
}

/** 内置文案表(按 locale 索引)。 */
export type MtableLocale = 'zh-CN' | 'en-US';

/** 单元格选区(已归一化:start ≤ end)。 */
export interface MtableSelection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

/** 行增长模式。 */
export type MtableRowMode =
  /** 无限滚动:滚到近底自动追加空白行(上限 maxRowCount),表格没有"底"。 */
  | 'infiniteScroll'
  /** 自动加行:数据末尾始终保留 autoAppendEmptyRows 行可输入空行,表格有底。 */
  | 'autoAppendRows';

/** 列增长模式。 */
export type MtableColMode =
  /** 固定网格:列数下限 minColumnCount,不随可视宽度自动增长。 */
  | 'infiniteScroll'
  /** 自动增加:网格最少 autoAppendBaseCols 列;所有列宽之和不足可视宽度时按其倍数补列。 */
  | 'autoAppendCols';

/** 内容变更来源:普通编辑(input)或内部撤销/重做回放(undo/redo)。 */
export type MtableChangeSource =
  /** 用户键入 / 粘贴 / 删除 / 插入行列等常规编辑。 */
  | 'input'
  /** 内部撤销(Ctrl/Cmd+Z 或 undo())回放。 */
  | 'undo'
  /** 内部重做(Ctrl/Cmd+Shift+Z、Ctrl+Y 或 redo())回放。 */
  | 'redo';

/** mtable 实例配置。 */
export interface MtableOptions {
  /** 编辑器挂载根节点(必需)。 */
  root: HTMLElement;
  /** 初始 CSV 文本(非受控模式)。 */
  defaultValue?: string;
  /** 受控 CSV 文本(传入后以轮询方式同步外部变更)。 */
  value?: string;
  /**
   * 内容变更回调(参数为规范化后的 CSV 文本;source 标记变更来源,undo/redo
   * 回放时嵌入方写回外部文档应跳过外部历史入栈,避免双轨撤销互相串联)。
   */
  onChange?: (csv: string, source: MtableChangeSource) => void;
  /**
   * 布局变更回调(行高随列宽自适应重算等;不改变 CSV 内容的场景,如拖拽列宽)。
   * 宿主据此同步容器高度(与 getContentHeight 搭配使用)。
   */
  onLayoutChange?: () => void;
  /**
   * 外部按下回调(扩展机制):表格外的浮层(筛选面板/右键菜单)打开时,
   * 宿主在任意"表格内浮层 DOM 之外"的按下处调用本回调,表格关闭自己的浮层。
   * 宿主侧通常桥接统一的 outside-press 广播,避免每个嵌入方逐个对接。
   */
  onOutsidePress?: (event: PointerEvent | MouseEvent | TouchEvent) => void;
  /** 只读模式(禁编辑/增删/剪切/粘贴)。 */
  readOnly?: boolean;
  /** UI 语言(右键菜单文案),默认 'zh-CN'。 */
  locale?: MtableLocale;
  /** 自定义文案(覆盖 locale 内置值)。 */
  messages?: Partial<MtableMessages>;
  /**
   * 左上角全屏按钮(行头列 × 列头行交叉的小方块,hover 显现)。
   * 点击把表格弹出为最大化 dialog,Esc/关闭按钮还原。默认 true。
   */
  fullscreenButton?: boolean;
  /** CSV 分隔符,默认 ','(RFC 4180)。 */
  delimiter?: string;
  /** 是否按内容自适应列宽(下限 88 / 上限 260),默认 true。 */
  autoColumnWidth?: boolean;
  /** 默认列宽(px),默认 88(同 Univer)。 */
  defaultColumnWidth?: number;
  /** 默认行高(px),默认 24(同 Univer)。 */
  defaultRowHeight?: number;
  /** 行头宽度(px),默认 46(同 Univer)。 */
  rowHeaderWidth?: number;
  /** 列头高度(px),默认 20(同 Univer)。 */
  columnHeaderHeight?: number;
  /** 行增长模式,默认 'infiniteScroll'。 */
  rowMode?: MtableRowMode;
  /**
   * 自动加行模式触发阈值:数据末尾空行数 ≤ 该值时自动加行,默认 1。
   */
  autoAppendRowsThreshold?: number;
  /**
   * 自动加行模式单次增加行数,默认 1。触发后空行补足至 阈值+步长。
   */
  autoAppendRowsStep?: number;
  /** 列增长模式,默认 'infiniteScroll'。 */
  colMode?: MtableColMode;
  /**
   * 自动增加列模式触发阈值:数据末尾空列数 ≤ 该值时自动加列,默认 2。
   */
  autoAppendColsThreshold?: number;
  /**
   * 自动增加列模式单次增加列数,默认 5。触发后空列补足至 阈值+步长;
   * 另有宽度覆盖:所有列宽之和不足可视宽度时也按该步长的倍数补列直至覆盖。
   */
  autoAppendColsStep?: number;
  /**
   * 空白数据区网格的初始行数下限,默认 100。
   * (仅无限滚动模式生效;自动加行模式的行数由数据行数 + autoAppendEmptyRows 决定。)
   */
  minRowCount?: number;
  /** 空白数据区网格的初始列数下限,默认 20(即 A..T,同 Univer 默认)。 */
  minColumnCount?: number;
  /**
   * 无限滚动的行数硬上限(内存保护),默认 5000。
   * 滚动/导航接近底部时自动追加空白行(Excel 式无限滚动),追加到该上限后停住。
   */
  maxRowCount?: number;
}

/** mtable 实例 API。 */
export interface MtableApi {
  /** 获取当前 CSV 文本(规范化序列化)。 */
  getCsv: () => string;
  /** 设置 CSV 文本(重建数据与列宽;受控模式下请走 value prop)。 */
  setCsv: (csv: string) => void;
  /** 获取当前选区(已归一化,越界裁剪;无选区时返回 null)。 */
  getSelection: () => MtableSelection | null;
  /** 设置选区并滚动到可见。 */
  setSelection: (selection: MtableSelection) => void;
  /** 清除选区(不影响单元格编辑态,由原生 blur 提交)。 */
  clearSelection: () => void;
  /** 网格内容总高(px,= 列头高 + 全部行高合计),供宿主做自适应高度。 */
  getContentHeight: () => number;
  /** 当前滚动偏移(px;横向 x / 纵向 y)。 */
  getScroll: () => { x: number; y: number };
  /**
   * 当前生效的筛选条件(列 → 选中的原始值集合;空表 = 无筛选)。
   * 供宿主持久化/同步用;排序为数据重排,不在此体现。
   */
  getFilters: () => Record<number, string[]>;
  /** 清除所有筛选(不改动数据);用于宿主"清除筛选"入口。 */
  clearFilters: () => void;
  /**
   * 切换浮层(右键菜单/筛选面板)挂载容器;传 null 恢复 document.body。
   * 表格被宿主搬进高 z-index 全屏弹窗时调用,把浮层挂进弹窗宿主,
   * 避免浮层被弹窗宿主压在背面。
   */
  setOverlayContainer: (container: HTMLElement | null) => void;
  /** 撤销一次操作。 */
  undo: () => void;
  /** 重做一次操作。 */
  redo: () => void;
  /** 聚焦表格(键盘操作生效的前提)。 */
  focus: () => void;
  /**
   * 外部按下通知(扩展点):宿主在统一"外部按下"广播处桥接调用,表格自行
   * 判断按下落点并收起自己的浮层(筛选面板/右键菜单)。
   * 落点在表格根或自身浮层内部时忽略,由内部交互逻辑处理。
   */
  notifyOutsidePress: (event: PointerEvent | MouseEvent | TouchEvent) => void;
  /** 销毁实例。 */
  destroy: () => void;
}

/** 内部撤销/重做操作单元。 */
export type MtableOp =
  | { type: 'cells'; changes: Array<{ row: number; col: number; before: string; after: string }> }
  | { type: 'insertRows'; at: number; count: number }
  | { type: 'deleteRows'; at: number; removed: string[][] }
  | { type: 'insertCols'; at: number; count: number }
  | { type: 'deleteCols'; at: number; removed: string[][] }
  | { type: 'sortRows'; from: number[]; to: number[] };
