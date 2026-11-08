/**
 * views/gantt-view.ts — Gantt 甘特图视图
 *
 * - 开始/结束日期字段由渲染器注入(默认取前两个 date 字段;结束字段缺失时
 *   与开始字段相同,条形按 1 天绘制);日期值取 YYYY-MM-DD 前缀(兼容 ISO 时间戳);
 * - 时间轴:逐日列(dayWidth 固定),范围取记录最早开始 ~ 最晚结束(最小 14 天);
 *   头部按月分组 + 逐日刻度;今日竖线;
 * - 条形:标题字段文本内嵌,点击行展开行内编辑区(共用 cell-editor);
 * - 底部 + 添加记录;渲染按运行时筛选/排序;月份锚点仅存会话内存。
 */
import type { JsonviewCellValue, JsonviewDoc, JsonviewField, JsonviewFilterCondition, JsonviewMessages, JsonviewRecord, JsonviewSortSpec } from '../types';
import { nextRecordId } from '../validate';
import { queryRecords } from '../query';
import { createCellEditor, createCellStatic, coerceForWrite } from './cell-editor';

/**
 * Gantt 视图回调。
 */
export interface JsonviewGanttViewCallbacks {
  /** 文档变更(kind:'cell' 单元格 / 'record' 增删)。 */
  onDocChange: (doc: JsonviewDoc, kind: string) => void;
}

/** 时间轴单日列宽(px)。 */
const DAY_WIDTH = 28;
/** 头部列高(px)。 */
const HEADER_HEIGHT = 26;

/**
 * 解析日期值的 ISO 键('YYYY-MM-DD';非法返回 null)。
 */
const dateValueToIso = (value: JsonviewCellValue): string | null => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? null;
};

/**
 * ISO 日期 → UTC 天序号(1970-01-01 起算,用于跨度/偏移计算)。
 */
const isoToDayIndex = (iso: string): number => {
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
};

/**
 * Gantt 甘特图视图。
 */
export class JsonviewGanttView {
  /** 根元素。 */
  readonly dom: HTMLElement;
  /** 当前文档。 */
  private doc: JsonviewDoc;
  /** 只读态。 */
  private readonly readOnly: boolean;
  /** 当前文案。 */
  private readonly messages: JsonviewMessages;
  /** 回调。 */
  private readonly callbacks: JsonviewGanttViewCallbacks;
  /** 开始日期字段 id。 */
  private startFieldId: string | null;
  /** 结束日期字段 id。 */
  private endFieldId: string | null;
  /** 运行时筛选。 */
  private readonly filter: JsonviewFilterCondition[];
  /** 运行时排序。 */
  private readonly sort: JsonviewSortSpec | null;
  /** 展开编辑中的记录 id。 */
  private expandedRecordId: string | null = null;

  /**
   * 初始化视图。
   */
  constructor(
    doc: JsonviewDoc,
    readOnly: boolean,
    messages: JsonviewMessages,
    startFieldId: string | null,
    endFieldId: string | null,
    query: { filter: JsonviewFilterCondition[]; sort: JsonviewSortSpec | null },
    callbacks: JsonviewGanttViewCallbacks
  ) {
    this.doc = doc;
    this.readOnly = readOnly;
    this.messages = messages;
    this.startFieldId = startFieldId;
    this.endFieldId = endFieldId;
    this.filter = query.filter;
    this.sort = query.sort;
    this.callbacks = callbacks;

    this.dom = document.createElement('div');
    this.dom.className = 'zt-jsonview-gantt-view';
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
   * 读取当前开始/结束字段 id(渲染器回存运行时状态)。
   */
  getDateFieldIds(): { startFieldId: string | null; endFieldId: string | null } {
    const dates = this.doc.fields.filter((field) => field.type === 'date');
    const resolve = (id: string | null): string | null =>
      id && dates.some((field) => field.id === id) ? id : null;
    return { startFieldId: resolve(this.startFieldId), endFieldId: resolve(this.endFieldId) };
  }

  /**
   * 重绘。
   */
  render(): void {
    this.dom.textContent = '';
    const dates = this.doc.fields.filter((field) => field.type === 'date');
    if (dates.length === 0) {
      // 无日期字段:提示(与日历缺字段提示同款)。
      const notice = document.createElement('div');
      notice.className = 'zt-jsonview-view-notice';
      notice.textContent = this.messages.ganttNoDate;
      this.dom.appendChild(notice);
      return;
    }

    const startField = this.resolveStartField(dates);
    const endField = this.resolveEndField(dates);
    const visible = queryRecords(this.doc, this.filter, this.sort);
    this.dom.appendChild(this.buildTimeline(visible, startField, endField));

    // 添加记录。
    if (!this.readOnly) {
      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'zt-jsonview-view-add';
      addButton.textContent = `+ ${this.messages.addRecord}`;
      addButton.addEventListener('click', () => {
        const recordId = nextRecordId(this.doc);
        this.doc = { ...this.doc, records: [...this.doc.records, { id: recordId, cells: {} }] };
        this.expandedRecordId = recordId;
        this.render();
        this.callbacks.onDocChange(this.doc, 'record');
      });
      this.dom.appendChild(addButton);
    }
  }

  /**
   * 解析开始字段(注入失效时取第一个 date 字段兜底)。
   */
  private resolveStartField(dates: JsonviewField[]): JsonviewField {
    const injected = this.startFieldId ? dates.find((field) => field.id === this.startFieldId) : undefined;
    return injected ?? dates[0]!;
  }

  /**
   * 解析结束字段(注入失效时取第二个 date 字段兜底;仍缺失则与开始字段相同)。
   */
  private resolveEndField(dates: JsonviewField[]): JsonviewField {
    const injected = this.endFieldId ? dates.find((field) => field.id === this.endFieldId) : undefined;
    return injected ?? dates[1] ?? dates[0]!;
  }

  /**
   * 记录的起止 ISO 日期(缺失起期返回 null)。
   */
  private recordRange(record: JsonviewRecord, startField: JsonviewField, endField: JsonviewField): { start: string; end: string } | null {
    const start = dateValueToIso(record.cells[startField.id] ?? null);
    if (!start) {
      return null;
    }
    const rawEnd = dateValueToIso(record.cells[endField.id] ?? null);
    const end = rawEnd && rawEnd >= start ? rawEnd : start;
    return { start, end };
  }

  /**
   * 构建时间轴(头部刻度 + 行条形 + 今日线)。
   */
  private buildTimeline(records: JsonviewRecord[], startField: JsonviewField, endField: JsonviewField): HTMLElement {
    // 时间轴容器。
    const timeline = document.createElement('div');
    timeline.className = 'zt-jsonview-gantt-timeline';

    // 数据日期范围(最小 14 天跨度)。
    let minIndex = Number.MAX_SAFE_INTEGER;
    let maxIndex = Number.MIN_SAFE_INTEGER;
    for (const record of records) {
      const range = this.recordRange(record, startField, endField);
      if (!range) {
        continue;
      }
      minIndex = Math.min(minIndex, isoToDayIndex(range.start));
      maxIndex = Math.max(maxIndex, isoToDayIndex(range.end));
    }
    if (minIndex > maxIndex) {
      // 无有效日期:锚定当前月,给 14 天空轨道。
      const todayIndex = isoToDayIndex(new Date().toISOString().slice(0, 10));
      minIndex = todayIndex;
      maxIndex = todayIndex + 13;
    }
    const span = Math.max(maxIndex - minIndex + 1, 14);
    const trackWidth = span * DAY_WIDTH;

    // 头部:月分组行 + 逐日刻度行。
    timeline.appendChild(this.buildHeader(minIndex, span));
    // 今日竖线(绝对定位覆盖)。
    timeline.appendChild(this.buildTodayLine(minIndex, span));
    // 行区。
    const body = document.createElement('div');
    body.className = 'zt-jsonview-gantt-body';
    const titleField = this.resolveTitleField(startField);
    for (const record of records) {
      body.appendChild(this.buildRow(record, startField, endField, titleField, minIndex, span, trackWidth));
    }
    timeline.appendChild(body);
    return timeline;
  }

  /**
   * 构建头部(月分组 + 逐日数字)。
   */
  private buildHeader(minIndex: number, span: number): HTMLElement {
    // 头部容器。
    const header = document.createElement('div');
    header.className = 'zt-jsonview-gantt-header';
    header.style.width = `${span * DAY_WIDTH}px`;

    // 月分组行(按月聚合天数)。
    const monthsRow = document.createElement('div');
    monthsRow.className = 'zt-jsonview-gantt-months';
    let index = 0;
    while (index < span) {
      const iso = new Date((minIndex + index) * 86_400_000).toISOString().slice(0, 10);
      const monthKey = iso.slice(0, 7);
      let days = 1;
      while (
        index + days < span &&
        new Date((minIndex + index + days) * 86_400_000).toISOString().slice(0, 10).startsWith(monthKey)
      ) {
        days += 1;
      }
      const cell = document.createElement('div');
      cell.className = 'zt-jsonview-gantt-month';
      cell.style.width = `${days * DAY_WIDTH}px`;
      cell.textContent = monthKey.replace('-', '/');
      monthsRow.appendChild(cell);
      index += days;
    }
    header.appendChild(monthsRow);

    // 逐日刻度行。
    const daysRow = document.createElement('div');
    daysRow.className = 'zt-jsonview-gantt-days';
    for (let offset = 0; offset < span; offset += 1) {
      const date = new Date((minIndex + offset) * 86_400_000);
      const cell = document.createElement('div');
      cell.className = 'zt-jsonview-gantt-day';
      const iso = date.toISOString().slice(0, 10);
      if (iso === new Date().toISOString().slice(0, 10)) {
        cell.classList.add('zt-jsonview-gantt-day-today');
      }
      if (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
        cell.classList.add('zt-jsonview-gantt-day-weekend');
      }
      cell.style.width = `${DAY_WIDTH}px`;
      cell.style.height = `${HEADER_HEIGHT}px`;
      cell.textContent = String(date.getUTCDate());
      daysRow.appendChild(cell);
    }
    header.appendChild(daysRow);
    return header;
  }

  /**
   * 构建今日竖线。
   */
  private buildTodayLine(minIndex: number, span: number): HTMLElement {
    // 竖线元素。
    const line = document.createElement('div');
    line.className = 'zt-jsonview-gantt-today-line';
    const todayOffset = isoToDayIndex(new Date().toISOString().slice(0, 10)) - minIndex;
    if (todayOffset >= 0 && todayOffset < span) {
      line.style.left = `${todayOffset * DAY_WIDTH + DAY_WIDTH / 2}px`;
    } else {
      line.style.display = 'none';
    }
    return line;
  }

  /**
   * 构建单行(标题列 + 条形轨道)。
   */
  private buildRow(
    record: JsonviewRecord,
    startField: JsonviewField,
    endField: JsonviewField,
    titleField: JsonviewField | null,
    minIndex: number,
    span: number,
    trackWidth: number
  ): HTMLElement {
    // 行容器。
    const row = document.createElement('div');
    row.className = 'zt-jsonview-gantt-row';
    if (this.expandedRecordId === record.id) {
      row.classList.add('zt-jsonview-gantt-row-open');
    }

    // 标题列。
    const title = document.createElement('div');
    title.className = 'zt-jsonview-gantt-row-title';
    if (titleField) {
      title.appendChild(createCellStatic(titleField, record.cells[titleField.id] ?? null));
    }
    row.appendChild(title);

    // 轨道 + 条形。
    const track = document.createElement('div');
    track.className = 'zt-jsonview-gantt-row-track';
    track.style.width = `${trackWidth}px`;
    const range = this.recordRange(record, startField, endField);
    if (range) {
      const startIndex = isoToDayIndex(range.start) - minIndex;
      const endIndex = isoToDayIndex(range.end) - minIndex;
      if (endIndex >= 0 && startIndex < span) {
        const bar = document.createElement('div');
        bar.className = 'zt-jsonview-gantt-bar';
        bar.style.left = `${Math.max(startIndex, 0) * DAY_WIDTH}px`;
        bar.style.width = `${(Math.min(endIndex, span - 1) - Math.max(startIndex, 0) + 1) * DAY_WIDTH - 4}px`;
        bar.title = `${range.start} ~ ${range.end}`;
        if (titleField) {
          bar.appendChild(createCellStatic(titleField, record.cells[titleField.id] ?? null));
        }
        track.appendChild(bar);
      }
    }
    row.appendChild(track);

    // 点击行展开/收起编辑。
    if (!this.readOnly) {
      row.addEventListener('click', () => {
        this.expandedRecordId = this.expandedRecordId === record.id ? null : record.id;
        this.render();
      });
    }
    if (this.expandedRecordId === record.id) {
      row.appendChild(this.buildEditorArea(record));
    }
    return row;
  }

  /**
   * 解析标题字段(第一个 text 字段;无则首个非多选字段)。
   */
  private resolveTitleField(startField: JsonviewField): JsonviewField | null {
    return (
      this.doc.fields.find((field) => field.type === 'text' && field.id !== startField.id) ??
      this.doc.fields.find((field) => field.id !== startField.id && field.type !== 'multiSelect') ??
      null
    );
  }

  /**
   * 构建行内编辑区(全部字段控件 + 删除)。
   */
  private buildEditorArea(record: JsonviewRecord): HTMLElement {
    // 编辑区容器。
    const area = document.createElement('div');
    area.className = 'zt-jsonview-gantt-editor';

    this.doc.fields.forEach((field) => {
      const line = document.createElement('div');
      line.className = 'zt-jsonview-editor-line';
      const label = document.createElement('span');
      label.className = 'zt-jsonview-editor-label';
      label.textContent = field.name || field.id;
      line.appendChild(label);
      if (this.readOnly) {
        line.appendChild(createCellStatic(field, record.cells[field.id] ?? null));
      } else {
        line.appendChild(
          createCellEditor(record, field, {
            onWrite: (recordId, fieldId, value) => {
              this.writeCell(recordId, fieldId, value);
            }
          })
        );
      }
      area.appendChild(line);
    });

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
      area.appendChild(removeButton);
    }
    return area;
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
