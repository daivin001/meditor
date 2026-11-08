/**
 * views/list-view.ts — List 列表视图(M3)
 *
 * - 行:标题字段 + 次要字段摘要(前 3 个非标题字段),点击展开行内编辑区
 *   (全部字段控件,共用 cell-editor);
 * - 底部 + 添加记录;渲染按运行时筛选/排序。
 */
import type { JsonviewCellValue, JsonviewDoc, JsonviewField, JsonviewFilterCondition, JsonviewMessages, JsonviewRecord, JsonviewSortSpec } from '../types';
import { nextRecordId } from '../validate';
import { queryRecords } from '../query';
import { createCellEditor, createCellStatic, coerceForWrite } from './cell-editor';

/**
 * List 视图回调。
 */
export interface JsonviewListViewCallbacks {
  /** 文档变更(kind:'cell' 单元格 / 'record' 增删)。 */
  onDocChange: (doc: JsonviewDoc, kind: string) => void;
}

/** 行内次要字段摘要数量上限。 */
const SUMMARY_FIELD_LIMIT = 3;

/**
 * List 列表视图。
 */
export class JsonviewListView {
  /** 根元素。 */
  readonly dom: HTMLElement;
  /** 当前文档。 */
  private doc: JsonviewDoc;
  /** 只读态。 */
  private readonly readOnly: boolean;
  /** 当前文案。 */
  private readonly messages: JsonviewMessages;
  /** 回调。 */
  private readonly callbacks: JsonviewListViewCallbacks;
  /** 标题字段 id。 */
  private titleFieldId: string | null;
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
    titleFieldId: string | null,
    query: { filter: JsonviewFilterCondition[]; sort: JsonviewSortSpec | null },
    callbacks: JsonviewListViewCallbacks
  ) {
    this.doc = doc;
    this.readOnly = readOnly;
    this.messages = messages;
    this.titleFieldId = titleFieldId;
    this.filter = query.filter;
    this.sort = query.sort;
    this.callbacks = callbacks;

    this.dom = document.createElement('div');
    this.dom.className = 'zt-jsonview-list-view';
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
   * 重绘。
   */
  render(): void {
    this.dom.textContent = '';
    const titleField = this.resolveTitleField();

    const list = document.createElement('div');
    list.className = 'zt-jsonview-list';
    for (const record of queryRecords(this.doc, this.filter, this.sort)) {
      list.appendChild(this.buildRow(record, titleField));
    }
    this.dom.appendChild(list);

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
   * 解析标题字段(第一个 text 字段;无则首个非多选字段)。
   */
  private resolveTitleField(): JsonviewField | null {
    const injected = this.titleFieldId ? this.doc.fields.find((field) => field.id === this.titleFieldId) : undefined;
    if (injected) {
      return injected;
    }
    return (
      this.doc.fields.find((field) => field.type === 'text') ??
      this.doc.fields.find((field) => field.type !== 'multiSelect') ??
      null
    );
  }

  /**
   * 构建单行(标题 + 摘要 + 展开编辑)。
   */
  private buildRow(record: JsonviewRecord, titleField: JsonviewField | null): HTMLElement {
    // 行容器。
    const row = document.createElement('div');
    row.className = 'zt-jsonview-list-row';
    if (this.expandedRecordId === record.id) {
      row.classList.add('zt-jsonview-list-row-open');
    }

    const main = document.createElement('div');
    main.className = 'zt-jsonview-list-row-main';

    // 标题。
    const title = document.createElement('span');
    title.className = 'zt-jsonview-list-row-title';
    if (titleField) {
      title.appendChild(createCellStatic(titleField, record.cells[titleField.id] ?? null));
    }
    main.appendChild(title);

    // 次要字段摘要。
    let shown = 0;
    for (const field of this.doc.fields) {
      if (shown >= SUMMARY_FIELD_LIMIT) {
        break;
      }
      if (field.id === titleField?.id) {
        continue;
      }
      const value = record.cells[field.id];
      if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        continue;
      }
      const chip = document.createElement('span');
      chip.className = 'zt-jsonview-list-row-chip';
      const keySpan = document.createElement('span');
      keySpan.className = 'zt-jsonview-kanban-card-key';
      keySpan.textContent = field.name;
      const valueSpan = document.createElement('span');
      valueSpan.appendChild(createCellStatic(field, value));
      chip.appendChild(keySpan);
      chip.appendChild(valueSpan);
      main.appendChild(chip);
      shown += 1;
    }

    // 点击展开/收起。
    if (!this.readOnly && this.expandedRecordId !== record.id) {
      row.addEventListener('click', () => {
        this.expandedRecordId = record.id;
        this.render();
      });
    }
    row.appendChild(main);

    if (this.expandedRecordId === record.id) {
      row.appendChild(this.buildEditorArea(record));
    }
    return row;
  }

  /**
   * 构建展开编辑区(全部字段控件 + 收起 + 删除)。
   */
  private buildEditorArea(record: JsonviewRecord): HTMLElement {
    // 编辑区容器。
    const area = document.createElement('div');
    area.className = 'zt-jsonview-gallery-editor';

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

    const collapse = document.createElement('button');
    collapse.type = 'button';
    collapse.className = 'zt-jsonview-editor-collapse';
    collapse.textContent = '▴';
    collapse.addEventListener('click', (event) => {
      event.stopPropagation();
      this.expandedRecordId = null;
      this.render();
    });
    area.appendChild(collapse);

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
