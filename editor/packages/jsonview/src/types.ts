/**
 * types.ts — @meditor/jsonview 公共类型定义
 *
 * 数据格式(notion-parity-plan §4.2):```jsondata-view:<kind> 围栏体 JSON,
 * 只含业务数据(字段定义 + 记录),视图种类持久化在围栏 lang 上,筛选/排序会话状态一律不持久化。
 */

/** 数据库字段类型。 */
export type JsonviewFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multiSelect'
  | 'checkbox'
  | 'date'
  | 'url';

/** 全部字段类型(遍历/兜底用)。 */
export const JSONVIEW_FIELD_TYPES: readonly JsonviewFieldType[] = [
  'text',
  'number',
  'select',
  'multiSelect',
  'checkbox',
  'date',
  'url'
];

/**
 * 判断是否合法字段类型。
 */
export const isJsonviewFieldType = (value: unknown): value is JsonviewFieldType =>
  typeof value === 'string' && (JSONVIEW_FIELD_TYPES as readonly string[]).includes(value);

/** 字段(列)定义。 */
export interface JsonviewField {
  /** 稳定短 id(f1/f2…),记录 cells 以此为键。 */
  id: string;
  /** 字段名。 */
  name: string;
  /** 字段类型;未知类型按 text 容错(加载时已归一)。 */
  type: JsonviewFieldType;
  /** select/multiSelect 的候选值。 */
  options?: string[];
}

/** 单元格取值:text/url → string;number → number;select → string;
 *  multiSelect → string[];checkbox → boolean;date → ISO 8601 字符串。 */
export type JsonviewCellValue = string | number | boolean | string[] | null;

/** 记录(行)。 */
export interface JsonviewRecord {
  /** 稳定短 id(r1/r2…)。 */
  id: string;
  /** fieldId → 单元格值;缺失即空值。 */
  cells: Record<string, JsonviewCellValue>;
}

/** 围栏体根对象——只含业务数据,永远不含视图状态。 */
export interface JsonviewDoc {
  /** 格式版本,当前固定为 1。 */
  version: 1;
  /** 数据库标题(可空)。 */
  name: string;
  /** 字段(列)定义,顺序即默认列序。 */
  fields: JsonviewField[];
  /** 记录(行)。 */
  records: JsonviewRecord[];
}

/**
 * 视图种类(共 7 种:表格/看板/画廊/列表/日历/甘特图/文本)。
 */
export type JsonviewViewKind = 'table' | 'kanban' | 'gallery' | 'list' | 'calendar' | 'gantt' | 'text';

/** 筛选比较符(gt/lt 仅 number/date 字段)。 */
export type JsonviewFilterOp =
  | 'contains'
  | 'equals'
  | 'notEquals'
  | 'gt'
  | 'lt'
  | 'isEmpty'
  | 'isNotEmpty';

/** 单条筛选条件(运行时状态,不持久化)。 */
export interface JsonviewFilterCondition {
  /** 目标字段 id。 */
  fieldId: string;
  /** 比较符。 */
  op: JsonviewFilterOp;
  /** 比较值(数字/日期为字符串输入,比较时按字段类型转换)。 */
  value: string;
}

/** 排序方向。 */
export type JsonviewSortDirection = 'asc' | 'desc';

/** 单字段排序(运行时状态,不持久化)。 */
export interface JsonviewSortSpec {
  /** 目标字段 id。 */
  fieldId: string;
  /** 方向。 */
  direction: JsonviewSortDirection;
}

/**
 * 会话级运行时视图状态——只活在渲染器内存中,任何出口都不写回文档
 * (notion-parity-plan §4.2 设计红线:筛选/排序/分组字段/当前视图一律不落盘)。
 */
export interface JsonviewRuntimeState {
  /** 当前视图种类。 */
  viewKind: JsonviewViewKind;
  /** 筛选条件(AND 语义;空数组 = 不过滤)。 */
  filter: JsonviewFilterCondition[];
  /** 当前排序(单字段;null = 文档原始顺序)。 */
  sort: JsonviewSortSpec | null;
  /** kanban 分组字段(默认取第一个 select/multiSelect 字段)。 */
  kanbanGroupFieldId: string | null;
  /** Calendar 日期字段(默认取第一个 date 字段)。 */
  calendarDateFieldId: string | null;
  /** Gantt 开始日期字段(默认取第一个 date 字段)。 */
  ganttStartFieldId: string | null;
  /** Gantt 结束日期字段(默认取第二个 date 字段,缺失则与开始字段相同)。 */
  ganttEndFieldId: string | null;
}

/** 文档变更来源(edit = 用户编辑;undo/redo = 内部撤销栈回放;external 不触发 onChange)。 */
export type JsonviewChangeSource = 'edit' | 'undo' | 'redo';

/**
 * createJsonview 创建参数。
 */
export interface JsonviewOptions {
  /** 挂载根节点(必需)。 */
  root: HTMLElement;
  /** 初始围栏体 JSON 文本(非法内容内部降级)。 */
  doc: string;
  /** 初始视图种类(缺省 'table';宿主可从块标签解析传入)。 */
  viewKind?: JsonviewViewKind;
  /** 文档 JSON 变更回调(canonical 序列化输出;source 标记来源,宿主 undo 时可跳过入历史栈)。 */
  onChange?: (json: string, source: JsonviewChangeSource) => void;
  /** 视图种类切换回调(用户切换视图下拉时触发;宿主据此改写块标签)。 */
  onChangeViewKind?: (kind: JsonviewViewKind) => void;
  /** 只读模式(查看仍可用,编辑控件禁用)。 */
  readOnly?: boolean;
  /** 语言。 */
  locale?: 'zh-CN' | 'en-US';
  /** 文案覆盖(整表)。 */
  messages?: Partial<JsonviewMessages>;
}

/**
 * createJsonview 实例 API。
 */
export interface JsonviewApi {
  /** 整体替换文档 JSON(外部 setMarkdown/受控回填;重置内部撤销栈)。 */
  setDoc: (json: string) => void;
  /** 读取当前文档(canonical JSON;降级态返回原文)。 */
  getDoc: () => string;
  /** 切换视图种类(宿主写回:由块标签解析而来的新种类;与用户切换下拉同效但不触发 onChangeViewKind)。 */
  setViewKind: (kind: JsonviewViewKind) => void;
  /** 读取当前视图种类。 */
  getViewKind: () => JsonviewViewKind;
  /** 撤销上一次编辑(内部撤销栈,整批粒度)。 */
  undo: () => void;
  /** 重做(内部撤销栈)。 */
  redo: () => void;
  /** 是否可撤销。 */
  canUndo: () => boolean;
  /** 是否可重做。 */
  canRedo: () => boolean;
  /** 销毁实例。 */
  destroy: () => void;
}

/**
 * 文案表(渲染包内嵌双语,允许整表覆盖)。
 */
export interface JsonviewMessages {
  /** 数据库标题输入占位。 */
  namePlaceholder: string;
  /** 添加字段按钮标题。 */
  addField: string;
  /** 添加记录按钮标题。 */
  addRecord: string;
  /** 删除字段按钮标题。 */
  deleteField: string;
  /** 删除记录按钮标题。 */
  deleteRecord: string;
  /** 新字段默认名({0} 为序号)。 */
  newFieldName: string;
  /** 字段名输入占位。 */
  fieldNamePlaceholder: string;
  /** 数据降级提示(围栏体非法时只读展示)。 */
  invalidData: string;
  /** 字段类型显示名:文本。 */
  typeNameText: string;
  /** 字段类型显示名:数字。 */
  typeNameNumber: string;
  /** 字段类型显示名:单选。 */
  typeNameSelect: string;
  /** 字段类型显示名:多选。 */
  typeNameMultiSelect: string;
  /** 字段类型显示名:勾选。 */
  typeNameCheckbox: string;
  /** 字段类型显示名:日期。 */
  typeNameDate: string;
  /** 字段类型显示名:链接。 */
  typeNameUrl: string;
  /** 视图切换显示名:表格。 */
  viewNameTable: string;
  /** 视图切换显示名:看板。 */
  viewNameKanban: string;
  /** 视图切换显示名:画廊。 */
  viewNameGallery: string;
  /** 视图切换显示名:列表。 */
  viewNameList: string;
  /** 视图切换显示名:日历。 */
  viewNameCalendar: string;
  /** 视图切换显示名:甘特图。 */
  viewNameGantt: string;
  /** 视图切换显示名:文本。 */
  viewNameText: string;
  /** 筛选/排序按钮标题。 */
  queryButton: string;
  /** 筛选面板标题。 */
  filterSection: string;
  /** 排序面板标题。 */
  sortSection: string;
  /** 添加筛选条件按钮。 */
  addFilter: string;
  /** 排序字段占位(不排序选项)。 */
  sortNone: string;
  /** 升序文案。 */
  sortAsc: string;
  /** 降序文案。 */
  sortDesc: string;
  /** 删除条件按钮标题。 */
  removeCondition: string;
  /** 筛选字段占位。 */
  filterFieldPlaceholder: string;
  /** 筛选值输入占位。 */
  filterValuePlaceholder: string;
  /** 日历日期字段选择标签。 */
  calendarDateLabel: string;
  /** 甘特图开始日期字段选择标签。 */
  ganttStartLabel: string;
  /** 甘特图结束日期字段选择标签。 */
  ganttEndLabel: string;
  /** 看板空分组标题(无分组字段/值为空)。 */
  ungroupedLabel: string;
  /** 看板无分组字段提示。 */
  kanbanNoGroup: string;
  /** 画廊无图片字段提示。 */
  galleryNoImage: string;
  /** 日历无日期字段提示。 */
  calendarNoDate: string;
  /** 甘特图无日期字段提示。 */
  ganttNoDate: string;
  /** 添加卡片/记录按钮(+ 后缀拼接)。 */
  addCard: string;
  /** 筛选比较符显示名:包含。 */
  opContains: string;
  /** 筛选比较符显示名:等于。 */
  opEquals: string;
  /** 筛选比较符显示名:不等于。 */
  opNotEquals: string;
  /** 筛选比较符显示名:大于。 */
  opGt: string;
  /** 筛选比较符显示名:小于。 */
  opLt: string;
  /** 筛选比较符显示名:为空。 */
  opIsEmpty: string;
  /** 筛选比较符显示名:不为空。 */
  opIsNotEmpty: string;
  /** 撤销按钮标题。 */
  undoButton: string;
  /** 重做按钮标题。 */
  redoButton: string;
  /** CSV 导入按钮标题(mtable/CSV → 数据库)。 */
  csvImport: string;
  /** CSV 导出按钮标题(单文本字段导出)。 */
  csvExport: string;
  /** 无可导出文本字段提示。 */
  csvExportNoField: string;
  /** TSV 粘贴确认条文案({0} 行 × {1} 列)。 */
  tsvConfirm: string;
  /** TSV 粘贴确认条「追加为新记录」按钮。 */
  tsvAppend: string;
  /** TSV 粘贴确认条「覆盖到当前格」按钮。 */
  tsvOverwrite: string;
  /** TSV 粘贴取消按钮。 */
  tsvCancel: string;
  /** 月份显示({0} 年 {1} 月)。 */
  calendarMonth: string;
  /** 上月按钮标题。 */
  calendarPrev: string;
  /** 下月按钮标题。 */
  calendarNext: string;
  /** 今天按钮标题。 */
  calendarToday: string;
  /** 星期标题(周日..周六,逗号分隔 7 项)。 */
  calendarWeekdays: string;
  /** 视图切换下拉框的 aria 标签。 */
  viewSelectLabel: string;
  /** 文本视图右键菜单:格式化。 */
  codeFormat: string;
  /** 文本视图右键菜单:复制全部 JSON。 */
  codeCopy: string;
  /** 文本视图右键菜单:全选。 */
  codeSelectAll: string;
  /** 文本视图右键菜单:清空(重置为空库)。 */
  codeClear: string;
  /** CSV 导入:文件内容不是有效 CSV。 */
  invalidCsv: string;
  /** CSV 导入:没有可导入的记录/字段。 */
  noImportableRecords: string;
  /** CSV 导入:文件读取失败。 */
  csvReadFailed: string;
  /** 删除字段确认条文案(该列数据会一并清除)。 */
  deleteFieldConfirm: string;
  /** 表格空态引导(无字段无记录)。 */
  tableEmptyGuide: string;
  /** 看板空列占位(无卡片可拖入)。 */
  kanbanDropHere: string;
}
