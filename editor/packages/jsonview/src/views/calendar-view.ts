/**
 * views/calendar-view.ts — Calendar 日历视图(M3)
 *
 * - 日期字段由渲染器注入(默认第一个 date 字段,仅运行时选择);
 * - 月网格(周日起),记录按日期字段值(YYYY-MM-DD 前缀匹配,兼容 ISO 时间戳)
 *   落格;无日期值记录进顶部「未排期」条;
 * - 拖拽卡片到目标日 → 写回 date 字段(kind 'drag');点击卡片展开行内编辑;
 * - 月导航:‹ 上月 / 今天 / 下月 ›;月份锚点仅存会话内存,不写回文档。
 */
import type { JsonviewCellValue, JsonviewDoc, JsonviewField, JsonviewFilterCondition, JsonviewMessages, JsonviewRecord, JsonviewSortSpec } from '../types';
import { nextRecordId } from '../validate';
import { queryRecords } from '../query';
import { createCellEditor, createCellStatic, coerceForWrite } from './cell-editor';

/**
 * Calendar 视图回调。
 */
export interface JsonviewCalendarViewCallbacks {
  /** 文档变更(kind:'drag' 改期 / 'cell' 编辑 / 'record' 增删)。 */
  onDocChange: (doc: JsonviewDoc, kind: string) => void;
  /** 月份锚点变化(渲染器保存会话状态)。 */
  onMonthChange: (month: string) => void;
}

/**
 * Calendar 日历视图。
 */
export class JsonviewCalendarView {
  /** 根元素。 */
  readonly dom: HTMLElement;
  /** 当前文档。 */
  private doc: JsonviewDoc;
  /** 只读态。 */
  private readonly readOnly: boolean;
  /** 当前文案。 */
  private readonly messages: JsonviewMessages;
  /** 回调。 */
  private readonly callbacks: JsonviewCalendarViewCallbacks;
  /** 日期字段 id。 */
  private dateFieldId: string | null;
  /** 月份锚点('YYYY-MM')。 */
  private month: string;
  /** 运行时筛选。 */
  private readonly filter: JsonviewFilterCondition[];
  /** 展开编辑中的记录 id。 */
  private expandedRecordId: string | null = null;
  /** 拖拽中的记录 id。 */
  private draggingRecordId: string | null = null;

  /**
   * 初始化视图。
   */
  constructor(
    doc: JsonviewDoc,
    readOnly: boolean,
    messages: JsonviewMessages,
    dateFieldId: string | null,
    month: string | null,
    query: { filter: JsonviewFilterCondition[]; sort: JsonviewSortSpec | null },
    callbacks: JsonviewCalendarViewCallbacks
  ) {
    this.doc = doc;
    this.readOnly = readOnly;
    this.messages = messages;
    this.dateFieldId = dateFieldId;
    this.month = month ?? CalendarViewHelpers.currentMonthKey();
    // 日历按日期字段落格,排序不适用,仅取筛选。
    this.filter = query.filter;
    this.callbacks = callbacks;

    this.dom = document.createElement('div');
    this.dom.className = 'zt-jsonview-calendar-view';
    this.render();
  }

  /**
   * 外部整体替换文档。
   */
  setDoc(doc: JsonviewDoc): void {
    this.doc = doc;
    this.render();
  }

  /**
   * 读取当前文档。
   */
  getDoc(): JsonviewDoc {
    return this.doc;
  }

  /**
   * 读取当前日期字段 id(渲染器回存运行时状态)。
   */
  getDateFieldId(): string | null {
    return this.resolveDateField()?.id ?? null;
  }

  /**
   * 重绘。
   */
  render(): void {
    this.dom.textContent = '';
    const dateField = this.resolveDateField();
    if (!dateField) {
      const notice = document.createElement('div');
      notice.className = 'zt-jsonview-view-notice';
      notice.textContent = this.messages.calendarNoDate;
      this.dom.appendChild(notice);
      return;
    }

    this.dom.appendChild(this.buildMonthNav());

    // 无日期值记录条。
    const unscheduled = this.doc.records.filter((record) => this.recordDayKey(record, dateField) === null);
    if (unscheduled.length > 0) {
      this.dom.appendChild(this.buildUnscheduledStrip(unscheduled, dateField));
    }

    this.dom.appendChild(this.buildMonthGrid(dateField));
  }

  /**
   * 解析日期字段(注入失效时取第一个 date 字段兜底)。
   */
  private resolveDateField(): JsonviewField | null {
    const dates = this.doc.fields.filter((field) => field.type === 'date');
    if (dates.length === 0) {
      return null;
    }
    const injected = this.dateFieldId ? dates.find((field) => field.id === this.dateFieldId) : undefined;
    return injected ?? dates[0]!;
  }

  /**
   * 记录的日期键('YYYY-MM-DD' | null)。
   */
  private recordDayKey(record: JsonviewRecord, dateField: JsonviewField): string | null {
    const value = record.cells[dateField.id];
    if (typeof value !== 'string' || value.trim() === '') {
      return null;
    }
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
    return match?.[1] ?? null;
  }

  /**
   * 构建月导航(‹ 标题 › + 今天)。
   */
  private buildMonthNav(): HTMLElement {
    // 导航容器。
    const nav = document.createElement('div');
    nav.className = 'zt-jsonview-calendar-nav';

    const [yearText, monthText] = this.month.split('-');
    const title = document.createElement('span');
    title.className = 'zt-jsonview-calendar-title';
    title.textContent = this.messages.calendarMonth.replace('{0}', yearText ?? '').replace('{1}', String(Number.parseInt(monthText ?? '1', 10)));
    nav.appendChild(title);

    if (!this.readOnly) {
      const prev = document.createElement('button');
      prev.type = 'button';
      prev.className = 'zt-jsonview-calendar-nav-btn';
      prev.textContent = '‹';
      prev.title = this.messages.calendarPrev;
      prev.setAttribute('aria-label', this.messages.calendarPrev);
      prev.addEventListener('click', () => this.shiftMonth(-1));
      nav.appendChild(prev);

      const today = document.createElement('button');
      today.type = 'button';
      today.className = 'zt-jsonview-calendar-nav-btn';
      today.textContent = this.messages.calendarToday;
      today.addEventListener('click', () => {
        this.month = CalendarViewHelpers.currentMonthKey();
        this.callbacks.onMonthChange(this.month);
        this.render();
      });
      nav.appendChild(today);

      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'zt-jsonview-calendar-nav-btn';
      next.textContent = '›';
      next.title = this.messages.calendarNext;
      next.setAttribute('aria-label', this.messages.calendarNext);
      next.addEventListener('click', () => this.shiftMonth(1));
      nav.appendChild(next);
    }
    return nav;
  }

  /**
   * 切月。
   */
  private shiftMonth(delta: number): void {
    const [year, month] = this.month.split('-').map((part) => Number.parseInt(part, 10));
    const date = new Date(Date.UTC(year || 1970, (month || 1) - 1 + delta, 1));
    this.month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    this.callbacks.onMonthChange(this.month);
    this.render();
  }

  /**
   * 构建「未排期」条(无日期值记录;可拖拽入格)。
   */
  private buildUnscheduledStrip(records: JsonviewRecord[], dateField: JsonviewField): HTMLElement {
    // 条容器。
    const strip = document.createElement('div');
    strip.className = 'zt-jsonview-calendar-unscheduled';
    const label = document.createElement('span');
    label.className = 'zt-jsonview-calendar-unscheduled-label';
    label.textContent = this.messages.ungroupedLabel;
    strip.appendChild(label);

    for (const record of records) {
      strip.appendChild(this.buildChip(record, dateField, null));
    }
    return strip;
  }

  /**
   * 构建月网格(表头 + 6 行 × 7 列)。
   */
  private buildMonthGrid(dateField: JsonviewField): HTMLElement {
    // 网格容器。
    const grid = document.createElement('div');
    grid.className = 'zt-jsonview-calendar-grid';

    // 星期表头。
    const weekdays = this.messages.calendarWeekdays.split(',');
    weekdays.forEach((day) => {
      const cell = document.createElement('div');
      cell.className = 'zt-jsonview-calendar-weekday';
      cell.textContent = day.trim();
      grid.appendChild(cell);
    });

    // 当月矩阵(补齐前后,固定 42 格)。
    const days = CalendarViewHelpers.buildMonthDays(this.month);
    // 日期 → 记录列表(筛选生效;日历按日期落格,忽略排序)。
    const byDay = new Map<string, JsonviewRecord[]>();
    const visible = queryRecords(this.doc, this.filter, null);
    for (const record of visible) {
      const dayKey = this.recordDayKey(record, dateField);
      if (!dayKey) {
        continue;
      }
      const list = byDay.get(dayKey) ?? [];
      list.push(record);
      byDay.set(dayKey, list);
    }

    for (const day of days) {
      grid.appendChild(this.buildDayCell(day, dateField, byDay.get(day.iso) ?? []));
    }
    return grid;
  }

  /**
   * 构建单日格。
   */
  private buildDayCell(day: { iso: string; dayOfMonth: number; inMonth: boolean; isToday: boolean }, dateField: JsonviewField, records: JsonviewRecord[]): HTMLElement {
    // 日格容器。
    const cell = document.createElement('div');
    cell.className = 'zt-jsonview-calendar-day';
    if (!day.inMonth) {
      cell.classList.add('zt-jsonview-calendar-day-out');
    }
    if (day.isToday) {
      cell.classList.add('zt-jsonview-calendar-day-today');
    }
    cell.dataset.date = day.iso;

    const number = document.createElement('div');
    number.className = 'zt-jsonview-calendar-day-num';
    number.textContent = String(day.dayOfMonth);
    cell.appendChild(number);

    for (const record of records) {
      cell.appendChild(this.buildChip(record, dateField, day.iso));
    }

    // 点击空格 → 新建该日记录。
    if (!this.readOnly) {
      cell.addEventListener('dragover', (event) => {
        event.preventDefault();
        cell.classList.add('zt-jsonview-calendar-dragover');
      });
      cell.addEventListener('dragleave', () => {
        cell.classList.remove('zt-jsonview-calendar-dragover');
      });
      cell.addEventListener('drop', (event) => {
        event.preventDefault();
        cell.classList.remove('zt-jsonview-calendar-dragover');
        const recordId = event.dataTransfer?.getData('text/meditor-jsonview-record') || this.draggingRecordId;
        if (recordId) {
          this.scheduleRecord(recordId, dateField, day.iso);
        }
        this.draggingRecordId = null;
      });
      cell.addEventListener('click', (event) => {
        if (event.target !== cell && event.target !== number) {
          return;
        }
        const recordId = nextRecordId(this.doc);
        this.doc = {
          ...this.doc,
          records: [...this.doc.records, { id: recordId, cells: { [dateField.id]: day.iso } }]
        };
        this.expandedRecordId = recordId;
        this.render();
        this.callbacks.onDocChange(this.doc, 'record');
      });
    }
    return cell;
  }

  /**
   * 构建记录 chip(标题文本;可拖拽;点击展开编辑)。
   */
  private buildChip(record: JsonviewRecord, dateField: JsonviewField, dayIso: string | null): HTMLElement {
    // chip 容器。
    const chip = document.createElement('div');
    chip.className = 'zt-jsonview-calendar-chip';
    chip.draggable = !this.readOnly;
    chip.dataset.recordId = record.id;

    const titleField = this.doc.fields.find((field) => field.type === 'text' && field.id !== dateField.id)
      ?? this.doc.fields.find((field) => field.id !== dateField.id);
    if (titleField) {
      chip.appendChild(createCellStatic(titleField, record.cells[titleField.id] ?? null));
    }

    if (!this.readOnly) {
      chip.addEventListener('dragstart', (event) => {
        this.draggingRecordId = record.id;
        event.dataTransfer?.setData('text/meditor-jsonview-record', record.id);
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
        }
        chip.classList.add('zt-jsonview-kanban-dragging');
      });
      chip.addEventListener('dragend', () => {
        chip.classList.remove('zt-jsonview-kanban-dragging');
        this.draggingRecordId = null;
      });
      chip.addEventListener('click', (event) => {
        event.stopPropagation();
        this.expandedRecordId = this.expandedRecordId === record.id ? null : record.id;
        this.render();
      });
    }

    // 展开编辑(挂当天格内,浮出)。
    if (this.expandedRecordId === record.id) {
      chip.appendChild(this.buildChipEditor(record, dateField, dayIso));
    }
    return chip;
  }

  /**
   * chip 展开编辑器(日期字段 + 标题字段快捷编辑)。
   */
  private buildChipEditor(record: JsonviewRecord, dateField: JsonviewField, dayIso: string | null): HTMLElement {
    // 编辑容器。
    const editor = document.createElement('div');
    editor.className = 'zt-jsonview-calendar-chip-editor';

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = dayIso ?? '';
    dateInput.addEventListener('change', () => {
      if (dateInput.value) {
        this.scheduleRecord(record.id, dateField, dateInput.value);
      }
    });
    editor.appendChild(dateInput);

    const titleField = this.doc.fields.find((field) => field.type === 'text' && field.id !== dateField.id);
    if (titleField) {
      editor.appendChild(
        createCellEditor(record, titleField, {
          onWrite: (recordId, fieldId, value) => {
            this.writeCell(recordId, fieldId, value);
          }
        })
      );
    }

    if (!this.readOnly) {
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'zt-jsonview-editor-remove';
      removeButton.textContent = `× ${this.messages.deleteRecord}`;
      removeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        this.doc = { ...this.doc, records: this.doc.records.filter((item) => item.id !== record.id) };
        this.expandedRecordId = null;
        this.render();
        this.callbacks.onDocChange(this.doc, 'record');
      });
      editor.appendChild(removeButton);
    }
    return editor;
  }

  /**
   * 改期写回(kind 'drag')。
   */
  private scheduleRecord(recordId: string, dateField: JsonviewField, iso: string): void {
    this.writeCell(recordId, dateField.id, iso);
    // writeCell 提交 kind 'cell';拖拽语义补发 'drag'(覆盖上一次提交)。
    this.callbacks.onDocChange(this.doc, 'drag');
  }

  /**
   * 写入单元格并提交。
   */
  private writeCell(recordId: string, fieldId: string, value: JsonviewCellValue): void {
    const record = this.doc.records.find((item) => item.id === recordId);
    const field = this.doc.fields.find((item) => item.id === fieldId);
    if (!record || !field) {
      return;
    }
    const coerced = coerceForWrite(field.type, value);
    const nextCells = { ...record.cells };
    if (coerced === null) {
      delete nextCells[fieldId];
    } else {
      nextCells[fieldId] = coerced;
    }
    this.doc = {
      ...this.doc,
      records: this.doc.records.map((item) => (item.id === recordId ? { id: item.id, cells: nextCells } : item))
    };
    this.callbacks.onDocChange(this.doc, 'cell');
  }
}

/**
 * CalendarViewHelpers — 日历纯函数工具(独立对象便于测试)。
 */
export const CalendarViewHelpers = {
  /**
   * 当前月份键('YYYY-MM')。
   */
  currentMonthKey: (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  },
  /**
   * 构建月矩阵 42 格(前补上月尾,后补下月头;含今天标记)。
   */
  buildMonthDays: (month: string): Array<{ iso: string; dayOfMonth: number; inMonth: boolean; isToday: boolean }> => {
    const [year, monthNumber] = month.split('-').map((part) => Number.parseInt(part, 10));
    const first = new Date(Date.UTC(year || 1970, (monthNumber || 1) - 1, 1));
    const start = new Date(first);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    const todayIso = new Date().toISOString().slice(0, 10);
    const days: Array<{ iso: string; dayOfMonth: number; inMonth: boolean; isToday: boolean }> = [];
    for (let index = 0; index < 42; index += 1) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      const iso = date.toISOString().slice(0, 10);
      days.push({
        iso,
        dayOfMonth: date.getUTCDate(),
        inMonth: iso.startsWith(month),
        isToday: iso === todayIso
      });
    }
    return days;
  }
};
