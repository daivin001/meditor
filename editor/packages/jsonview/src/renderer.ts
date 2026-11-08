/**
 * renderer.ts — @meditor/jsonview 渲染入口
 *
 * createJsonview 挂载数据库视图:围栏 JSON → parse(降级提示)→ 顶栏 + 活动视图;
 * - 顶栏单行:数据库名称(左,行内编辑)+ 控制区(右):撤销/重做 → 视图下拉
 *   (表格/看板/画廊/列表/日历/甘特图/文本共 7 种)→ CSV 导入/导出 → 筛选排序(⚙);
 *   初始视图种类由宿主经 viewKind 传入(块标签解析),用户切换视图时经
 *   onChangeViewKind 回调宿主(宿主据此改写块标签);筛选/排序状态仍只存会话内存,
 *   不写回文档;
 * - 内部撤销栈(JsonviewUndoStack,整批粒度):视图回调用 kind 打标,600ms 静默或
 *   kind 切换分批;undo/redo 经 source 'undo'/'redo' 回调宿主;
 * - 文档变更经 canonical 序列化回调;setDoc 供外部受控回填(重置撤销栈)。
 */
import './styles/jsonview.css';
import type {
  JsonviewApi,
  JsonviewChangeSource,
  JsonviewDoc,
  JsonviewFilterCondition,
  JsonviewOptions,
  JsonviewSortSpec,
  JsonviewViewKind,
} from './types';
import { BUILTIN_JSONVIEW_MESSAGES } from './i18n';
import { parseJsonviewValue, serializeJsonviewDoc } from './validate';
import { JsonviewUndoStack } from './undo-stack';
import { looksLikeCsv, importCsvToDoc, exportDocToCsv } from './csv-interop';
import { JsonviewTableView } from './views/table-view';
import { JsonviewKanbanView } from './views/kanban-view';
import { JsonviewGalleryView } from './views/gallery-view';
import { JsonviewListView } from './views/list-view';
import { JsonviewCalendarView } from './views/calendar-view';
import { JsonviewGanttView } from './views/gantt-view';
import { JsonviewTextView } from './views/text-view';
import { JsonviewQueryPanel } from './views/query-panel';
import { JsonviewDropdown } from './views/dropdown';

/** 全部视图种类(合法性校验用)。 */
const JSONVIEW_VIEW_KINDS: readonly JsonviewViewKind[] = [
  'table',
  'kanban',
  'gallery',
  'list',
  'calendar',
  'gantt',
  'text',
];

/**
 * 顶栏图标(内联 SVG,stroke="currentColor" 14px,lucide 风格;替代 Unicode 字符 ↶↷⇤⇥⚙)。
 */
const ICONS = {
  /** undo-2。 */
  undo: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>',
  /** redo-2。 */
  redo: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13"/></svg>',
  /** import:箭头入托盘。 */
  import:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
  /** export:箭头出托盘。 */
  export:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
  /** settings 齿轮。 */
  gear: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
} as const;

/** 视图下拉选项图标(内联 SVG,stroke currentColor 14px,lucide 风格,素色随文字色)。 */
const VIEW_ICONS = {
  /** table:网格表格。 */
  table:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>',
  /** kanban:三列看板。 */
  kanban:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 5v11"/><path d="M12 5v6"/><path d="M18 5v14"/></svg>',
  /** gallery:图片画框。 */
  gallery:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
  /** list:三行列表。 */
  list: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/></svg>',
  /** calendar:日历页。 */
  calendar:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></svg>',
  /** gantt:横条进度。 */
  gantt:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h10"/><path d="M8 12h12"/><path d="M6 18h8"/></svg>',
  /** text:大括号代码。 */
  text: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 6-6 6 6 6"/><path d="m16 6 6 6-6 6"/></svg>',
} as const;

/** 视图下拉选项定义(键 → 文案键 + 图标)。 */
const VIEW_OPTIONS: Array<{
  kind: JsonviewViewKind;
  messageKey:
    | 'viewNameTable'
    | 'viewNameKanban'
    | 'viewNameGallery'
    | 'viewNameList'
    | 'viewNameCalendar'
    | 'viewNameGantt'
    | 'viewNameText';
  icon: string;
}> = [
  { kind: 'table', messageKey: 'viewNameTable', icon: VIEW_ICONS.table },
  { kind: 'kanban', messageKey: 'viewNameKanban', icon: VIEW_ICONS.kanban },
  { kind: 'gallery', messageKey: 'viewNameGallery', icon: VIEW_ICONS.gallery },
  { kind: 'list', messageKey: 'viewNameList', icon: VIEW_ICONS.list },
  { kind: 'calendar', messageKey: 'viewNameCalendar', icon: VIEW_ICONS.calendar },
  { kind: 'gantt', messageKey: 'viewNameGantt', icon: VIEW_ICONS.gantt },
  { kind: 'text', messageKey: 'viewNameText', icon: VIEW_ICONS.text },
];

/**
 * 视图实例最小接口(各视图共用)。
 */
interface JsonviewViewInstance {
  /** 视图根元素。 */
  readonly dom: HTMLElement;
  /** 外部整体替换文档。 */
  setDoc: (doc: JsonviewDoc) => void;
  /** 读取当前文档。 */
  getDoc: () => JsonviewDoc;
  /** 视图卸载前清理(可选;持有 document/window 级监听的视图必须实现,防监听泄漏)。 */
  destroy?: () => void;
}

/**
 * 创建数据库视图实例(围栏数据格式 + Table/Kanban/Gallery/List/Calendar/Gantt/Text
 * 七种视图)。
 *
 * @param options 视图配置:挂载根节点、初始围栏体 JSON(非法内容内部降级为
 *                只读展示)、初始视图种类、语言与文案覆盖、只读态,以及
 *                文档变更/视图切换回调(宿主据此写回块标签)。
 * @returns 视图实例 API:文档读写(setDoc/getDoc)、视图种类切换(setViewKind)、
 *          内部撤销栈(undo/redo)与销毁等。
 */
export function createJsonview(options: JsonviewOptions): JsonviewApi {
  const {
    root,
    doc: initialDoc,
    onChange,
    onChangeViewKind,
    readOnly = false,
    locale = 'zh-CN',
    messages,
  } = options;
  // 合法化初始视图种类(非法/缺省回退 'table')。
  const initialViewKind: JsonviewViewKind = JSONVIEW_VIEW_KINDS.includes(
    options.viewKind as JsonviewViewKind,
  )
    ? (options.viewKind as JsonviewViewKind)
    : 'table';

  // 当前文案(内嵌双语 + 整表覆盖)。
  const resolvedMessages: (typeof BUILTIN_JSONVIEW_MESSAGES)['zh-CN'] = {
    ...BUILTIN_JSONVIEW_MESSAGES[locale],
    ...messages,
  };

  // 根容器。
  const wrapper = document.createElement('div');
  wrapper.className = 'zt-jsonview-wrapper';
  wrapper.dataset.readOnly = readOnly ? 'true' : 'false';
  root.appendChild(wrapper);

  // 解析初始文档(非法降级:只读提示,不崩编辑器)。
  const parsed = parseJsonviewValue(initialDoc);
  /** 当前文档(null = 降级态)。 */
  let currentDoc: JsonviewDoc | null = parsed.ok ? parsed.doc : null;

  if (!parsed.ok) {
    // 降级提示(数据本身原样保留在围栏里,不会丢失)。
    const notice = document.createElement('div');
    notice.className = 'zt-jsonview-invalid';
    notice.textContent = resolvedMessages.invalidData;
    wrapper.appendChild(notice);
  }

  // --- 会话级运行时状态(视图种类初始值来自块标签解析;筛选/排序不持久化) ---
  const runtime = {
    viewKind: initialViewKind,
    filter: [] as JsonviewFilterCondition[],
    sort: null as JsonviewSortSpec | null,
    kanbanGroupFieldId: null as string | null,
    calendarDateFieldId: null as string | null,
    calendarMonth: null as string | null,
    ganttStartFieldId: null as string | null,
    ganttEndFieldId: null as string | null,
    galleryImageFieldId: null as string | null,
    galleryTitleFieldId: null as string | null,
    listTitleFieldId: null as string | null,
  };

  // --- 内部撤销栈 ---
  const undoStack = new JsonviewUndoStack(
    parsed.ok ? serializeJsonviewDoc(parsed.doc) : initialDoc,
  );

  /** 发出变更(source 决定宿主历史行为)。 */
  const emitChange = (source: JsonviewChangeSource): void => {
    if (!currentDoc) {
      return;
    }
    onChange?.(serializeJsonviewDoc(currentDoc), source);
  };

  /** 视图文档变更统一入口:入撤销栈 + 回调宿主。 */
  const handleViewDocChange = (doc: JsonviewDoc, kind: string): void => {
    if (!currentDoc) {
      return;
    }
    undoStack.push(kind, serializeJsonviewDoc(currentDoc), serializeJsonviewDoc(doc));
    currentDoc = doc;
    emitChange('edit');
    refreshUndoButtons();
    syncQueryPanel();
  };

  // --- DOM 骨架(顶栏单行:名称 + 控制区;下方可选上下文行 + 视图宿主) ---
  const header = document.createElement('div');
  header.className = 'zt-jsonview-header';
  wrapper.appendChild(header);

  const contextRow = document.createElement('div');
  contextRow.className = 'zt-jsonview-context-row';
  wrapper.appendChild(contextRow);

  const viewHost = document.createElement('div');
  viewHost.className = 'zt-jsonview-view-host';
  wrapper.appendChild(viewHost);

  // --- 标题行控件:数据库名称(左)+ 撤销/重做 + 视图下拉 + CSV 导入/导出 + 筛选排序(右) ---
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'zt-jsonview-name';
  nameInput.placeholder = resolvedMessages.namePlaceholder;
  nameInput.disabled = readOnly;
  nameInput.addEventListener('change', () => {
    if (!currentDoc || readOnly) {
      return;
    }
    const next = { ...currentDoc, name: nameInput.value.trim() };
    handleViewDocChange(next, 'name');
  });
  header.appendChild(nameInput);
  const actionsBox = document.createElement('div');
  actionsBox.className = 'zt-jsonview-header-actions';
  header.appendChild(actionsBox);

  const undoButton = document.createElement('button');
  undoButton.type = 'button';
  undoButton.className = 'zt-jsonview-tool-btn';
  undoButton.innerHTML = ICONS.undo;
  undoButton.title = resolvedMessages.undoButton;
  undoButton.setAttribute('aria-label', resolvedMessages.undoButton);
  undoButton.disabled = true;
  undoButton.addEventListener('click', () => {
    api.undo();
  });
  actionsBox.appendChild(undoButton);

  const redoButton = document.createElement('button');
  redoButton.type = 'button';
  redoButton.className = 'zt-jsonview-tool-btn';
  redoButton.innerHTML = ICONS.redo;
  redoButton.title = resolvedMessages.redoButton;
  redoButton.setAttribute('aria-label', resolvedMessages.redoButton);
  redoButton.disabled = true;
  redoButton.addEventListener('click', () => {
    api.redo();
  });
  actionsBox.appendChild(redoButton);

  // 视图切换下拉(自定义组件;切换即回调宿主改写块标签)。
  const viewDropdown = new JsonviewDropdown({
    options: VIEW_OPTIONS.map((option) => ({
      value: option.kind,
      label: resolvedMessages[option.messageKey],
      icon: option.icon,
    })),
    value: runtime.viewKind,
    className: 'zt-jsonview-view-select',
    ariaLabel: resolvedMessages.viewSelectLabel,
    callbacks: {
      onSelect: (kind) => {
        if (!JSONVIEW_VIEW_KINDS.includes(kind as JsonviewViewKind) || kind === runtime.viewKind) {
          return;
        }
        runtime.viewKind = kind as JsonviewViewKind;
        renderContextRow();
        mountView();
        // 视图种类切换回调宿主(宿主据此改写块标签/节点类型;放最后,宿主可能同步销毁本实例)。
        onChangeViewKind?.(runtime.viewKind);
      },
    },
  });
  actionsBox.appendChild(viewDropdown.dom);

  // CSV 导入/导出(编辑态)。
  const csvInput = document.createElement('input');
  csvInput.type = 'file';
  csvInput.accept = '.csv,text/csv';
  csvInput.style.display = 'none';
  wrapper.appendChild(csvInput);

  if (!readOnly) {
    const importButton = document.createElement('button');
    importButton.type = 'button';
    importButton.className = 'zt-jsonview-tool-btn';
    importButton.innerHTML = ICONS.import;
    importButton.title = resolvedMessages.csvImport;
    importButton.setAttribute('aria-label', resolvedMessages.csvImport);
    importButton.addEventListener('click', () => {
      csvInput.click();
    });
    actionsBox.appendChild(importButton);

    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.className = 'zt-jsonview-tool-btn';
    exportButton.innerHTML = ICONS.export;
    exportButton.title = resolvedMessages.csvExport;
    exportButton.setAttribute('aria-label', resolvedMessages.csvExport);
    exportButton.addEventListener('click', () => {
      exportCsv();
    });
    actionsBox.appendChild(exportButton);
  }

  const queryButton = document.createElement('button');
  queryButton.type = 'button';
  queryButton.className = 'zt-jsonview-tool-btn';
  queryButton.innerHTML = ICONS.gear;
  queryButton.title = resolvedMessages.queryButton;
  queryButton.setAttribute('aria-label', resolvedMessages.queryButton);
  actionsBox.appendChild(queryButton);

  // 筛选/排序弹出面板(懒创建)。
  let queryPanel: JsonviewQueryPanel | null = null;
  let queryPanelOpen = false;
  const queryPanelHost = document.createElement('div');
  queryPanelHost.className = 'zt-jsonview-query-popover';
  queryPanelHost.style.display = 'none';
  wrapper.appendChild(queryPanelHost);

  queryButton.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleQueryPanel();
  });
  // 外部点击关闭面板。
  document.addEventListener('pointerdown', handleGlobalPointerDown);

  /**
   * 全局按下时关闭筛选面板(点击面板内部除外)。
   */
  function handleGlobalPointerDown(event: PointerEvent): void {
    if (!queryPanelOpen) {
      return;
    }
    const target = event.target;
    if (
      target instanceof Node &&
      (queryPanelHost.contains(target) || queryButton.contains(target))
    ) {
      return;
    }
    toggleQueryPanel(false);
  }

  /**
   * 开/关筛选面板。
   */
  function toggleQueryPanel(force?: boolean): void {
    const next = force ?? !queryPanelOpen;
    if (next === queryPanelOpen) {
      return;
    }
    queryPanelOpen = next;
    queryPanelHost.style.display = next ? '' : 'none';
    queryButton.classList.toggle('zt-jsonview-tool-btn-active', next);
    if (next) {
      queryPanel = new JsonviewQueryPanel(
        currentDoc ?? { version: 1, name: '', fields: [], records: [] },
        resolvedMessages,
        runtime.filter,
        runtime.sort,
        {
          onFilterChange: (conditions) => {
            runtime.filter = conditions;
            applyQueryToView();
          },
          onSortChange: (sort) => {
            runtime.sort = sort;
            applyQueryToView();
          },
        },
      );
      queryPanelHost.textContent = '';
      queryPanelHost.appendChild(queryPanel.dom);
    } else {
      queryPanelHost.textContent = '';
      queryPanel = null;
    }
  }

  /**
   * 文档变化后同步面板字段集(面板开着时)。
   */
  function syncQueryPanel(): void {
    if (queryPanel && currentDoc) {
      queryPanel.update(currentDoc, runtime.filter, runtime.sort);
    }
  }

  /**
   * 应用筛选/排序到当前视图(table 原地刷新;其余视图重建)。
   */
  function applyQueryToView(): void {
    const view = activeView;
    if (!view) {
      return;
    }
    if (view instanceof JsonviewTableView) {
      view.setQuery({ filter: runtime.filter, sort: runtime.sort });
    } else {
      mountView();
    }
  }

  // --- CSV 导入/导出 ---
  csvInput.addEventListener('change', () => {
    const file = csvInput.files?.[0];
    csvInput.value = '';
    if (!file || !currentDoc) {
      return;
    }
    void file
      .text()
      .then((text) => {
        if (!looksLikeCsv(text)) {
          showToast(resolvedMessages.invalidCsv);
          return;
        }
        const result = importCsvToDoc(currentDoc!, text);
        if (result.appendedRecordIds.length === 0 && result.appendedFieldIds.length === 0) {
          showToast(resolvedMessages.noImportableRecords);
          return;
        }
        currentDoc = result.doc as JsonviewDoc;
        emitChange('edit');
        refreshUndoButtons();
        renderAll();
      })
      // 文件读取失败(权限/IO)兜底提示。
      .catch(() => {
        showToast(resolvedMessages.csvReadFailed);
      });
  });

  /**
   * 导出当前文档为 CSV(标题字段 + 第一个非标题文本型字段)。
   */
  function exportCsv(): void {
    if (!currentDoc) {
      return;
    }
    const titleField =
      currentDoc.fields.find((field) => field.type === 'text') ??
      currentDoc.fields.find((field) => ['url', 'number', 'date'].includes(field.type));
    const valueField = currentDoc.fields.find(
      (field) => field !== titleField && ['text', 'url', 'number', 'date'].includes(field.type),
    );
    if (!titleField || !valueField) {
      showToast(resolvedMessages.csvExportNoField);
      return;
    }
    const csv = exportDocToCsv(currentDoc, titleField.id, valueField.id);
    if (!csv) {
      showToast(resolvedMessages.csvExportNoField);
      return;
    }
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${currentDoc.name || 'database'}.csv`;
    anchor.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  /**
   * 轻提示(2.5s 自动消失;role="status" 供读屏播报)。
   */
  function showToast(text: string): void {
    const toast = document.createElement('div');
    toast.className = 'zt-jsonview-toast';
    toast.setAttribute('role', 'status');
    toast.textContent = text;
    wrapper.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 2500);
  }

  // --- 视图切换下拉同步 ---
  /**
   * 同步视图下拉选中项(按运行时视图种类)。
   */
  function syncViewSelect(): void {
    viewDropdown.setValue(runtime.viewKind);
  }

  /**
   * 渲染视图上下文选择行(日历日期字段 / 甘特图起止字段)。
   */
  function renderContextRow(): void {
    contextRow.textContent = '';
    if (!currentDoc) {
      return;
    }
    const selectFor = (
      label: string,
      candidates: JsonviewDoc['fields'],
      currentId: string | null,
      onPick: (fieldId: string | null) => void,
    ): void => {
      if (candidates.length === 0) {
        return;
      }
      const wrap = document.createElement('label');
      wrap.className = 'zt-jsonview-context-item';
      const span = document.createElement('span');
      span.textContent = label;
      wrap.appendChild(span);
      const current = candidates.some((field) => field.id === currentId)
        ? (currentId as string)
        : (candidates[0]?.id ?? '');
      const dropdown = new JsonviewDropdown({
        options: candidates.map((field) => ({ value: field.id, label: field.name || field.id })),
        value: current,
        className: 'zt-jsonview-context-select',
        callbacks: {
          onSelect: (fieldId) => {
            onPick(fieldId);
            mountView();
          },
        },
      });
      wrap.appendChild(dropdown.dom);
      contextRow.appendChild(wrap);
    };

    if (runtime.viewKind === 'calendar') {
      selectFor(
        resolvedMessages.calendarDateLabel,
        currentDoc.fields.filter((field) => field.type === 'date'),
        runtime.calendarDateFieldId,
        (fieldId) => {
          runtime.calendarDateFieldId = fieldId;
        },
      );
    }
    if (runtime.viewKind === 'gantt') {
      // 甘特图:开始/结束日期字段各一个下拉(共用 date 字段候选)。
      const dateFields = currentDoc.fields.filter((field) => field.type === 'date');
      selectFor(
        resolvedMessages.ganttStartLabel,
        dateFields,
        runtime.ganttStartFieldId,
        (fieldId) => {
          runtime.ganttStartFieldId = fieldId;
        },
      );
      if (dateFields.length > 1) {
        selectFor(
          resolvedMessages.ganttEndLabel,
          dateFields,
          runtime.ganttEndFieldId,
          (fieldId) => {
            runtime.ganttEndFieldId = fieldId;
          },
        );
      }
    }
  }

  // --- 视图挂载 ---
  /** 当前视图实例。 */
  let activeView: JsonviewViewInstance | null = null;

  /**
   * 按运行时状态挂载当前视图(重建;旧实例随 DOM 移除被回收)。
   */
  function mountView(): void {
    // 旧视图若持有全局监听(如 table 的虚拟滚动),先销毁再移除 DOM。
    activeView?.destroy?.();
    viewHost.textContent = '';
    if (!currentDoc) {
      activeView = null;
      return;
    }
    const query = { filter: runtime.filter, sort: runtime.sort };
    switch (runtime.viewKind) {
      case 'table':
        activeView = new JsonviewTableView(
          currentDoc,
          readOnly,
          resolvedMessages,
          {
            onDocChange: handleViewDocChange,
            formatNewFieldName: (index) =>
              resolvedMessages.newFieldName.replace('{0}', String(index)),
          },
          query,
        );
        break;
      case 'kanban':
        activeView = new JsonviewKanbanView(
          currentDoc,
          readOnly,
          resolvedMessages,
          runtime.kanbanGroupFieldId,
          query,
          {
            onDocChange: handleViewDocChange,
          },
        );
        break;
      case 'gallery':
        activeView = new JsonviewGalleryView(
          currentDoc,
          readOnly,
          resolvedMessages,
          runtime.galleryImageFieldId,
          runtime.galleryTitleFieldId,
          query,
          {
            onDocChange: handleViewDocChange,
          },
        );
        break;
      case 'list':
        activeView = new JsonviewListView(
          currentDoc,
          readOnly,
          resolvedMessages,
          runtime.listTitleFieldId,
          query,
          {
            onDocChange: handleViewDocChange,
          },
        );
        break;
      case 'calendar':
        activeView = new JsonviewCalendarView(
          currentDoc,
          readOnly,
          resolvedMessages,
          runtime.calendarDateFieldId,
          runtime.calendarMonth,
          query,
          {
            onDocChange: handleViewDocChange,
            onMonthChange: (month) => {
              runtime.calendarMonth = month;
            },
          },
        );
        break;
      case 'gantt':
        activeView = new JsonviewGanttView(
          currentDoc,
          readOnly,
          resolvedMessages,
          runtime.ganttStartFieldId,
          runtime.ganttEndFieldId,
          query,
          {
            onDocChange: handleViewDocChange,
          },
        );
        break;
      case 'text':
        activeView = new JsonviewTextView(currentDoc, readOnly, resolvedMessages, query, {
          onDocChange: handleViewDocChange,
        });
        break;
    }
    if (activeView) {
      viewHost.appendChild(activeView.dom);
    }
    // 回存视图解析出的兜底字段(换文档/换字段后仍成立)。
    if (activeView instanceof JsonviewKanbanView) {
      runtime.kanbanGroupFieldId =
        (activeView as unknown as { groupFieldId: string | null }).groupFieldId ??
        runtime.kanbanGroupFieldId;
    }
    if (activeView instanceof JsonviewCalendarView) {
      runtime.calendarDateFieldId = activeView.getDateFieldId() ?? runtime.calendarDateFieldId;
    }
    if (activeView instanceof JsonviewGanttView) {
      const resolved = activeView.getDateFieldIds();
      runtime.ganttStartFieldId = resolved.startFieldId ?? runtime.ganttStartFieldId;
      runtime.ganttEndFieldId = resolved.endFieldId ?? runtime.ganttEndFieldId;
    }
  }

  /**
   * 全量重绘(名称输入 + 视图下拉 + 上下文行 + 视图)。
   */
  function renderAll(): void {
    if (currentDoc) {
      nameInput.value = currentDoc.name;
    }
    syncViewSelect();
    renderContextRow();
    mountView();
    syncQueryPanel();
    refreshUndoButtons();
  }

  /**
   * 刷新撤销/重做按钮可用态。
   */
  function refreshUndoButtons(): void {
    undoButton.disabled = !undoStack.canUndo();
    redoButton.disabled = !undoStack.canRedo();
  }

  // TSV 粘贴转发(仅表格视图消费)。
  wrapper.addEventListener('paste', (event) => {
    if (activeView instanceof JsonviewTableView) {
      activeView.handlePaste(event);
    }
  });

  // --- API ---
  const api: JsonviewApi = {
    setDoc: (json: string) => {
      const next = parseJsonviewValue(json);
      if (!next.ok) {
        return;
      }
      currentDoc = next.doc;
      undoStack.reset(serializeJsonviewDoc(currentDoc));
      renderAll();
    },
    getDoc: () => (currentDoc ? serializeJsonviewDoc(currentDoc) : initialDoc),
    setViewKind: (kind: JsonviewViewKind) => {
      // 宿主写回(块标签变化联动):幂等,不触发 onChangeViewKind(防回环)。
      if (!JSONVIEW_VIEW_KINDS.includes(kind) || kind === runtime.viewKind) {
        return;
      }
      runtime.viewKind = kind;
      syncViewSelect();
      renderContextRow();
      mountView();
    },
    getViewKind: () => runtime.viewKind,
    undo: () => {
      if (!currentDoc) {
        return;
      }
      const json = undoStack.undo();
      if (json === null) {
        return;
      }
      const next = parseJsonviewValue(json);
      if (!next.ok) {
        undoStack.endReplay();
        return;
      }
      currentDoc = next.doc;
      emitChange('undo');
      undoStack.endReplay();
      renderAll();
    },
    redo: () => {
      if (!currentDoc) {
        return;
      }
      const json = undoStack.redo();
      if (json === null) {
        return;
      }
      const next = parseJsonviewValue(json);
      if (!next.ok) {
        undoStack.endReplay();
        return;
      }
      currentDoc = next.doc;
      emitChange('redo');
      undoStack.endReplay();
      renderAll();
    },
    canUndo: () => undoStack.canUndo(),
    canRedo: () => undoStack.canRedo(),
    destroy: () => {
      document.removeEventListener('pointerdown', handleGlobalPointerDown);
      activeView?.destroy?.();
      viewDropdown.destroy();
      undoStack.destroy();
      wrapper.remove();
      currentDoc = null;
      activeView = null;
    },
  };

  // 初始渲染(降级态只有提示,无工具栏)。
  if (currentDoc) {
    renderAll();
  }

  return api;
}
