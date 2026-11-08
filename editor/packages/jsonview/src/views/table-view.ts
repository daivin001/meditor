/**
 * views/table-view.ts — Table 视图(DOM 表格,类型化单元格控件)
 *
 * - 列头:字段名行内编辑(input)+ 右侧「类型切换(自定义下拉)+ 垃圾桶删除」按钮组;尾部 + 加列;
 * - 行:行号格 hover 出垃圾桶删除按钮;底部 + 加行;
 * - 单元格:按字段类型渲染控件(共用 cell-editor),change 即提交;只读态纯文本;
 * - 筛选/排序:渲染器注入运行时 query,只影响行呈现(编辑/增删按 recordId 定位);
 * - TSV 粘贴:表格空白处粘贴多行多列文本 → 确认条(追加/覆盖/取消),按列类型强转;
 * - 结构操作(add/remove/rename/retype)整表重绘,单元格编辑原地提交不重绘;
 * - 虚拟化:视图记录数达阈值(VIRTUALIZATION_THRESHOLD)后 tbody 只渲染可视窗口行,
 *   上下占位行撑起滚动高度(滚动/键盘/拖拽滚动条均由 scroll 几何驱动窗口重建);
 *   小于阈值走原全量渲染,小数据不付虚拟化复杂度。
 */
import type { JsonviewCellValue, JsonviewDoc, JsonviewField, JsonviewFieldType, JsonviewMessages, JsonviewFilterCondition, JsonviewSortSpec } from '../types';
import { FIELD_TYPE_MESSAGE_KEYS } from '../i18n';
import { nextFieldId, nextRecordId } from '../validate';
import { queryRecords } from '../query';
import { parseTsvMatrix, looksLikeTsv, applyTsvMatrix } from '../tsv';
import { createCellEditor, createCellStatic, coerceForWrite } from './cell-editor';
import { JsonviewDropdown } from './dropdown';
import { VirtualList } from '../lib/virtual-list';
import type { VirtualListRange } from '../lib/virtual-list';

/** 垃圾桶图标(lucide trash-2 风格,stroke currentColor;列头/行号删除共用)。 */
const TRASH_ICON =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>';

/** 虚拟化启用阈值:视图记录数达到该值才启用窗口渲染,小于该值走全量渲染。 */
const VIRTUALIZATION_THRESHOLD = 200;
/** 虚拟化行高预估值(px;首行实测 + 假设同高,滚动时按行修正)。 */
const ESTIMATED_ROW_HEIGHT = 33;
/** 虚拟窗口上下额外渲染行数(滚动缓冲,降低快速滚动露白)。 */
const VIRTUAL_OVERSCAN = 8;

/**
 * 焦点格快照(虚拟窗口重建会销毁正在编辑的控件,重建前后借此保持焦点)。
 */
interface CellFocusSnapshot {
  /** 焦点格所属记录 id。 */
  recordId: string;
  /** 焦点格列序(0 起,不含行号列)。 */
  fieldIndex: number;
  /** 文本输入光标起点(非文本输入为 null)。 */
  selectionStart: number | null;
  /** 文本输入光标终点(非文本输入为 null)。 */
  selectionEnd: number | null;
}

/**
 * Table 视图回调。
 */
export interface JsonviewTableViewCallbacks {
  /** 文档变更(渲染器负责 canonical 序列化、undo 入栈与 onChange)。 */
  onDocChange: (doc: JsonviewDoc, kind: string) => void;
  /** 新字段默认名(处理 {0} 序号)。 */
  formatNewFieldName: (index: number) => string;
}

/**
 * Table 视图。
 */
export class JsonviewTableView {
  /** 根元素。 */
  readonly dom: HTMLElement;
  /** 当前文档。 */
  private doc: JsonviewDoc;
  /** 只读态。 */
  private readonly readOnly: boolean;
  /** 当前文案。 */
  private readonly messages: JsonviewMessages;
  /** 回调。 */
  private readonly callbacks: JsonviewTableViewCallbacks;
  /** 运行时筛选条件。 */
  private filter: JsonviewFilterCondition[];
  /** 运行时排序。 */
  private sort: JsonviewSortSpec | null;
  /** TSV 粘贴确认条(存在时拦截重复粘贴)。 */
  private tsvBar: HTMLElement | null = null;
  /** 待粘贴矩阵。 */
  private tsvPending: string[][] | null = null;
  /** 删除字段确认条(存在时拦截重复点击)。 */
  private deleteFieldBar: HTMLElement | null = null;
  /** 待删除字段 id。 */
  private deleteFieldPending: string | null = null;
  /** 虚拟列表助手(记录数达阈值时创建;null = 全量渲染路径)。 */
  private virtual: VirtualList | null = null;
  /** 当前视图记录序列(queryRecords 结果;窗口渲染按下标取行)。 */
  private viewRecords: JsonviewDoc['records'] = [];
  /** 已渲染窗口(窗口与占位均未变化时不重复重建,避免扰动焦点)。 */
  private renderedRange: VirtualListRange | null = null;
  /** 数据行 tbody 引用(虚拟窗口的重渲染目标)。 */
  private tbody: HTMLTableSectionElement | null = null;

  /**
   * 初始化视图。
   */
  constructor(
    doc: JsonviewDoc,
    readOnly: boolean,
    messages: JsonviewMessages,
    callbacks: JsonviewTableViewCallbacks,
    query: { filter: JsonviewFilterCondition[]; sort: JsonviewSortSpec | null }
  ) {
    this.doc = doc;
    this.readOnly = readOnly;
    this.messages = messages;
    this.callbacks = callbacks;
    this.filter = query.filter;
    this.sort = query.sort;

    this.dom = document.createElement('div');
    this.dom.className = 'zt-jsonview-table-view';
    this.render();
  }

  /**
   * 更新运行时筛选/排序(渲染器状态变化时调用,整表重绘)。
   */
  setQuery(query: { filter: JsonviewFilterCondition[]; sort: JsonviewSortSpec | null }): void {
    this.filter = query.filter;
    this.sort = query.sort;
    this.render();
  }

  /**
   * 提交文档变更(渲染器负责 canonical 序列化与 onChange)。
   */
  private commit(kind: string): void {
    this.callbacks.onDocChange(this.doc, kind);
  }

  /**
   * 外部整体替换文档(整表重绘)。
   */
  setDoc(doc: JsonviewDoc): void {
    this.doc = doc;
    this.dismissTsvBar();
    this.dismissDeleteFieldBar();
    this.render();
  }

  /**
   * 读取当前文档。
   */
  getDoc(): JsonviewDoc {
    return this.doc;
  }

  /**
   * 整表重绘(数据库名称行由渲染器顶栏提供,视图内不再重复渲染)。
   */
  render(): void {
    // 重绘会重建 DOM:确认条引用一并复位(重绘后确认态失效)。
    this.deleteFieldBar = null;
    this.deleteFieldPending = null;
    this.tsvBar = null;
    // 虚拟助手锚定旧 tbody,重绘前必须销毁(同时摘除 document 级监听)。
    this.teardownVirtual();
    this.tbody = null;
    this.dom.textContent = '';
    this.dom.appendChild(this.buildTable());
    // 空态(无字段无记录):表头 + 保留 + 按钮,引导行提示下一步。
    if (this.doc.fields.length === 0 && this.doc.records.length === 0) {
      const guide = document.createElement('div');
      guide.className = 'zt-jsonview-table-empty-guide';
      guide.textContent = this.messages.tableEmptyGuide;
      this.dom.appendChild(guide);
    }
  }

  /**
   * 构建表格。
   */
  private buildTable(): HTMLElement {
    // 表格容器。
    const table = document.createElement('table');
    table.className = 'zt-jsonview-table';
    table.appendChild(this.buildHeadRow());

    // 数据行(按运行时筛选/排序呈现)。
    this.viewRecords = queryRecords(this.doc, this.filter, this.sort);
    const tbody = document.createElement('tbody');
    this.tbody = tbody;
    this.renderedRange = null;
    if (this.viewRecords.length >= VIRTUALIZATION_THRESHOLD) {
      // 大数据:tbody 只挂「占位行 ×2 + 可视窗口行」,窗口由 VirtualList 依滚动几何驱动。
      table.appendChild(tbody);
      this.virtual = new VirtualList({
        // 锚点取 tbody:其顶边即「条目 0 顶边」基准,表头高度不参与偏移计算。
        anchor: tbody,
        count: this.viewRecords.length,
        estimatedItemHeight: ESTIMATED_ROW_HEIGHT,
        overscan: VIRTUAL_OVERSCAN,
        onRangeChange: (range) => {
          this.handleRangeChange(range);
        }
      });
    } else {
      // 小数据:全量渲染(不付虚拟化复杂度)。
      this.viewRecords.forEach((record, rowIndex) => {
        tbody.appendChild(this.buildRecordRow(record, rowIndex));
      });
      table.appendChild(tbody);
    }

    // 添加记录行。
    table.appendChild(this.buildAddRecordRow());
    return table;
  }

  /**
   * 虚拟窗口变化入口:窗口与占位均未变化时不重建(保持编辑焦点不扰动)。
   */
  private handleRangeChange(range: VirtualListRange): void {
    const last = this.renderedRange;
    if (
      last !== null &&
      last.start === range.start &&
      last.end === range.end &&
      last.padTop === range.padTop &&
      last.padBottom === range.padBottom
    ) {
      return;
    }
    this.renderedRange = { ...range };
    this.renderWindowRows(range);
  }

  /**
   * 重建窗口行:占位行 ×2 + [start, end) 记录行(无 DOM 复用,重建即渲染)。
   */
  private renderWindowRows(range: VirtualListRange): void {
    const tbody = this.tbody;
    if (!tbody) {
      return;
    }
    // 重建会销毁正在编辑的控件:先捕获焦点格,重建后恢复。
    const focus = this.captureFocus();
    const rows: HTMLElement[] = [];
    for (let index = range.start; index < range.end; index += 1) {
      const record = this.viewRecords[index];
      if (!record) {
        continue;
      }
      rows.push(this.buildRecordRow(record, index));
    }
    tbody.textContent = '';
    tbody.appendChild(this.buildSpacerRow(range.padTop));
    rows.forEach((row) => tbody.appendChild(row));
    tbody.appendChild(this.buildSpacerRow(range.padBottom));
    // 实测回填测量缓存(DOM 写入完成后统一读高度,避免逐行读反复强制布局)。
    const virtual = this.virtual;
    if (virtual) {
      let measuredIndex = range.start;
      for (const row of rows) {
        virtual.measureItem(measuredIndex, row.offsetHeight);
        measuredIndex += 1;
      }
    }
    this.restoreFocus(focus);
  }

  /**
   * 构建虚拟占位行(单个跨列格以高度撑起滚动空间;网格线由样式表关闭)。
   */
  private buildSpacerRow(height: number): HTMLElement {
    const spacerRow = document.createElement('tr');
    spacerRow.className = 'zt-jsonview-virtual-spacer';
    const spacerCell = document.createElement('td');
    spacerCell.colSpan = this.doc.fields.length + 2;
    spacerCell.style.height = `${Math.max(0, Math.round(height))}px`;
    spacerRow.appendChild(spacerCell);
    return spacerRow;
  }

  /**
   * 捕获焦点格快照(正在 tbody 内编辑时返回快照,否则 null)。
   */
  private captureFocus(): CellFocusSnapshot | null {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !(this.tbody?.contains(active) ?? false)) {
      return null;
    }
    const cell = active.closest('td.zt-jsonview-cell');
    const row = active.closest('tr.zt-jsonview-record-row');
    const recordId = row instanceof HTMLTableRowElement ? row.dataset.recordId : undefined;
    if (!(cell instanceof HTMLTableCellElement) || !(row instanceof HTMLTableRowElement) || !recordId) {
      return null;
    }
    // 列序 = 格在行内的序号 - 1(首列为行号格)。
    const fieldIndex = Array.from(row.children).indexOf(cell) - 1;
    if (fieldIndex < 0) {
      return null;
    }
    const input = active instanceof HTMLInputElement ? active : null;
    return {
      recordId,
      fieldIndex,
      selectionStart: input?.selectionStart ?? null,
      selectionEnd: input?.selectionEnd ?? null
    };
  }

  /**
   * 恢复焦点格(preventScroll 避免恢复焦点反向扰动滚动位置)。
   */
  private restoreFocus(snapshot: CellFocusSnapshot | null): void {
    if (!snapshot || !this.tbody) {
      return;
    }
    const row = this.tbody.querySelector<HTMLTableRowElement>(`tr[data-record-id="${CSS.escape(snapshot.recordId)}"]`);
    const cell = row?.children[snapshot.fieldIndex + 1];
    if (!(cell instanceof HTMLElement)) {
      return;
    }
    const target = cell.querySelector<HTMLElement>('input, button, select, textarea') ?? cell;
    target.focus({ preventScroll: true });
    if (target instanceof HTMLInputElement && target.type === 'text' && snapshot.selectionStart !== null) {
      // 文本输入恢复光标位置;个别输入类型不支持选区时静默忽略。
      const end = snapshot.selectionEnd ?? snapshot.selectionStart;
      try {
        target.setSelectionRange(snapshot.selectionStart, end);
      } catch {
        // 非文本选区场景(如只读态)忽略光标恢复。
      }
    }
  }

  /**
   * 销毁虚拟列表助手(render 重建 / 视图销毁前必须调用,摘 document 级监听)。
   */
  private teardownVirtual(): void {
    this.virtual?.destroy();
    this.virtual = null;
  }

  /**
   * 视图销毁:摘除虚拟列表的 document/window 级监听(渲染器卸载视图时调用)。
   */
  destroy(): void {
    this.teardownVirtual();
  }

  /**
   * 构建列头行。
   */
  private buildHeadRow(): HTMLElement {
    // 列头行。
    const headRow = document.createElement('tr');
    headRow.className = 'zt-jsonview-head-row';

    // 行号列表头。
    const cornerCell = document.createElement('th');
    cornerCell.className = 'zt-jsonview-corner-cell';
    headRow.appendChild(cornerCell);

    // 字段列表头。
    this.doc.fields.forEach((field) => {
      headRow.appendChild(this.buildFieldHead(field));
    });

    // 加列按钮列表头。
    const addCell = document.createElement('th');
    addCell.className = 'zt-jsonview-add-field-cell';
    if (!this.readOnly) {
      const addFieldButton = document.createElement('button');
      addFieldButton.type = 'button';
      addFieldButton.className = 'zt-jsonview-add-field';
      addFieldButton.textContent = '+';
      addFieldButton.title = this.messages.addField;
      addFieldButton.setAttribute('aria-label', this.messages.addField);
      addFieldButton.addEventListener('click', () => {
        // 新字段名(按现有字段数 +1 递增避免重名)。
        const name = this.callbacks.formatNewFieldName(this.doc.fields.filter((f) => /^字段 \d+$|^Field \d+$/.test(f.name)).length + 1);
        const fieldId = nextFieldId(this.doc);
        this.doc = { ...this.doc, fields: [...this.doc.fields, { id: fieldId, name, type: 'text' }] };
        this.render();
        this.commit('field');
      });
      addCell.appendChild(addFieldButton);
    }
    headRow.appendChild(addCell);
    return headRow;
  }

  /**
   * 构建单个字段列表头(名称 + 类型 + 删除)。
   */
  private buildFieldHead(field: JsonviewField): HTMLElement {
    // 列头单元格。
    const th = document.createElement('th');
    th.className = 'zt-jsonview-field-head';
    th.dataset.fieldType = field.type;

    // 列头内容行:字段名(flex:1)+ 右侧「类型切换 + 删除」按钮组。
    const headInner = document.createElement('div');
    headInner.className = 'zt-jsonview-field-head-inner';

    // 类型下拉引用(重命名后同步 aria-label 用;只读态不存在)。
    let typeDropdownRef: JsonviewDropdown | null = null;

    // 字段名输入。
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'zt-jsonview-field-name';
    nameInput.placeholder = this.messages.fieldNamePlaceholder;
    nameInput.value = field.name;
    nameInput.disabled = this.readOnly;
    nameInput.addEventListener('change', () => {
      if (this.readOnly) {
        return;
      }
      this.doc = {
        ...this.doc,
        fields: this.doc.fields.map((item) => (item.id === field.id ? { ...item, name: nameInput.value.trim() } : item))
      };
      this.commit('field');
      // aria-label 用的是构建时旧快照:重命名后同步刷新。
      typeDropdownRef?.dom.setAttribute('aria-label', nameInput.value.trim() || field.name);
    });
    headInner.appendChild(nameInput);

    if (!this.readOnly) {
      // 类型切换(自定义下拉)。
      const typeDropdown = new JsonviewDropdown({
        options: (Object.keys(FIELD_TYPE_MESSAGE_KEYS) as JsonviewFieldType[]).map((type) => ({
          value: type,
          label: this.messages[FIELD_TYPE_MESSAGE_KEYS[type]]
        })),
        value: field.type,
        className: 'zt-jsonview-field-type',
        ariaLabel: nameInput.value || field.name,
        callbacks: {
          onSelect: (type) => {
            this.doc = this.retype(field.id, type as JsonviewFieldType);
            this.render();
            this.commit('field');
          }
        }
      });
      typeDropdownRef = typeDropdown;
      headInner.appendChild(typeDropdown.dom);

      // 删除字段按钮(垃圾桶图标;点击出确认条,该列数据会一并清除)。
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'zt-jsonview-remove-field';
      removeButton.innerHTML = TRASH_ICON;
      removeButton.title = this.messages.deleteField;
      removeButton.setAttribute('aria-label', this.messages.deleteField);
      removeButton.addEventListener('click', () => {
        this.showDeleteFieldBar(field.id);
      });
      headInner.appendChild(removeButton);
    }

    th.appendChild(headInner);
    return th;
  }

  /**
   * 执行删除字段(移除列定义并清洗各记录该列取值)。
   */
  private performRemoveField(fieldId: string): void {
    this.doc = {
      ...this.doc,
      fields: this.doc.fields.filter((item) => item.id !== fieldId),
      records: this.doc.records.map((record) => {
        if (!(fieldId in record.cells)) {
          return record;
        }
        // 移除该列取值。
        const cells = { ...record.cells };
        delete cells[fieldId];
        return { ...record, cells };
      })
    };
    this.render();
    this.commit('field');
  }

  /**
   * 显示删除字段确认条(复用 TSV 确认条的条形样式)。
   */
  private showDeleteFieldBar(fieldId: string): void {
    this.dismissDeleteFieldBar();
    this.deleteFieldPending = fieldId;
    const bar = document.createElement('div');
    bar.className = 'zt-jsonview-tsv-bar';

    const label = document.createElement('span');
    label.className = 'zt-jsonview-tsv-label';
    label.textContent = this.messages.deleteFieldConfirm;
    bar.appendChild(label);

    // 确认删除(按钮文案沿用「删除字段」)。
    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = 'zt-jsonview-tsv-apply';
    confirmButton.textContent = this.messages.deleteField;
    confirmButton.addEventListener('click', () => {
      const pending = this.deleteFieldPending;
      this.deleteFieldPending = null;
      this.dismissDeleteFieldBar();
      if (pending) {
        this.performRemoveField(pending);
      }
    });
    bar.appendChild(confirmButton);

    // 取消(文案沿用 TSV 取消)。
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'zt-jsonview-tsv-cancel';
    cancelButton.textContent = this.messages.tsvCancel;
    cancelButton.addEventListener('click', () => {
      this.deleteFieldPending = null;
      this.dismissDeleteFieldBar();
    });
    bar.appendChild(cancelButton);

    this.deleteFieldBar = bar;
    this.dom.insertBefore(bar, this.dom.firstChild);
  }

  /**
   * 关闭删除字段确认条。
   */
  private dismissDeleteFieldBar(): void {
    this.deleteFieldBar?.remove();
    this.deleteFieldBar = null;
  }

  /**
   * 构建单条记录行。
   */
  private buildRecordRow(record: JsonviewDoc['records'][number], rowIndex: number): HTMLElement {
    // 记录行。
    const tr = document.createElement('tr');
    tr.className = 'zt-jsonview-record-row';
    tr.dataset.recordId = record.id;

    // 行号格(hover 出删除)。
    const rownumCell = document.createElement('td');
    rownumCell.className = 'zt-jsonview-rownum-cell';
    rownumCell.textContent = String(rowIndex + 1);
    if (!this.readOnly) {
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'zt-jsonview-remove-record';
      removeButton.innerHTML = TRASH_ICON;
      removeButton.title = this.messages.deleteRecord;
      removeButton.setAttribute('aria-label', this.messages.deleteRecord);
      removeButton.addEventListener('click', () => {
        this.doc = { ...this.doc, records: this.doc.records.filter((item) => item.id !== record.id) };
        this.render();
        this.commit('record');
      });
      rownumCell.appendChild(removeButton);
    }
    tr.appendChild(rownumCell);

    // 数据格。
    this.doc.fields.forEach((field) => {
      tr.appendChild(this.buildCell(record, field));
    });

    // 行尾补位(与加列按钮列对齐)。
    const tailCell = document.createElement('td');
    tailCell.className = 'zt-jsonview-tail-cell';
    tr.appendChild(tailCell);
    return tr;
  }

  /**
   * 构建数据格(按字段类型)。
   */
  private buildCell(record: JsonviewDoc['records'][number], field: JsonviewField): HTMLElement {
    // 数据格单元格。
    const td = document.createElement('td');
    td.className = 'zt-jsonview-cell';
    td.dataset.fieldType = field.type;
    // 当前取值。
    const value: JsonviewCellValue = record.cells[field.id] ?? null;

    // 只读态:纯文本渲染(url 渲染为链接)。
    if (this.readOnly) {
      td.appendChild(createCellStatic(field, value));
      return td;
    }

    td.appendChild(
      createCellEditor(record, field, {
        onWrite: (recordId, fieldId, rawValue) => {
          this.writeCell(recordId, fieldId, coerceForWrite(
            this.doc.fields.find((item) => item.id === fieldId)?.type ?? 'text',
            rawValue
          ));
        }
      })
    );
    return td;
  }

  /**
   * 构建添加记录行。
   */
  private buildAddRecordRow(): HTMLElement {
    // 添加记录行容器。
    const footRow = document.createElement('tr');
    footRow.className = 'zt-jsonview-add-record-row';
    const cell = document.createElement('td');
    // 类名供宿主样式排除(`:not([class*='zt-jsonview'])`)与自身样式定位。
    cell.className = 'zt-jsonview-add-record-cell';
    cell.colSpan = this.doc.fields.length + 2;
    if (!this.readOnly) {
      const addRecordButton = document.createElement('button');
      addRecordButton.type = 'button';
      addRecordButton.className = 'zt-jsonview-add-record';
      addRecordButton.textContent = `+ ${this.messages.addRecord}`;
      addRecordButton.setAttribute('aria-label', this.messages.addRecord);
      addRecordButton.addEventListener('click', () => {
        const recordId = nextRecordId(this.doc);
        this.doc = { ...this.doc, records: [...this.doc.records, { id: recordId, cells: {} }] };
        this.render();
        this.commit('record');
      });
      cell.appendChild(addRecordButton);
    }
    footRow.appendChild(cell);
    return footRow;
  }

  /**
   * 写入单元格并提交(原地更新,不整表重绘)。
   */
  private writeCell(recordId: string, fieldId: string, value: JsonviewCellValue): void {
    // 目标记录。
    const record = this.doc.records.find((item) => item.id === recordId);
    if (!record) {
      return;
    }
    // 清洗后取值。
    const fieldType = this.doc.fields.find((item) => item.id === fieldId)?.type;
    if (!fieldType) {
      return;
    }
    const coerced = coerceForWrite(fieldType, value);
    // 重建记录与文档。
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
    this.commit('cell');
  }

  /**
   * 字段类型切换(值清洗走注入的 coerce + model 规则)。
   */
  private retype(fieldId: string, type: JsonviewFieldType): JsonviewDoc {
    // 类型未变化直接返回。
    const current = this.doc.fields.find((item) => item.id === fieldId);
    if (!current || current.type === type) {
      return this.doc;
    }
    // 重建字段。
    const fields = this.doc.fields.map((item) => (item.id === fieldId ? { ...item, type } : item));
    // 各记录按新类型清洗。
    const records = this.doc.records.map((record) => {
      if (!(fieldId in record.cells)) {
        return record;
      }
      const coerced = coerceForWrite(type, record.cells[fieldId] ?? null);
      // 清洗后的记录。
      const cells = { ...record.cells };
      if (coerced === null) {
        delete cells[fieldId];
      } else {
        cells[fieldId] = coerced;
      }
      return { id: record.id, cells };
    });
    return { ...this.doc, fields, records };
  }

  /**
   * TSV 粘贴:表格容器(非输入控件)粘贴多行多列文本时,弹出确认条。
   */
  handlePaste(event: ClipboardEvent): boolean {
    if (this.readOnly || this.tsvPending !== null) {
      return false;
    }
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('input, select, textarea')) {
      // 输入控件内粘贴走原生行为。
      return false;
    }
    const text = event.clipboardData?.getData('text/plain') ?? '';
    if (!looksLikeTsv(text)) {
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    this.tsvPending = parseTsvMatrix(text);
    this.showTsvBar();
    return true;
  }

  /**
   * 显示 TSV 确认条(追加 / 覆盖 / 取消)。
   */
  private showTsvBar(): void {
    this.dismissTsvBar();
    const matrix = this.tsvPending;
    if (!matrix) {
      return;
    }
    const bar = document.createElement('div');
    bar.className = 'zt-jsonview-tsv-bar';

    const rows = matrix.filter((row) => row.some((cell) => cell.trim() !== '')).length;
    const columns = Math.max(...matrix.map((row) => row.length));
    const label = document.createElement('span');
    label.className = 'zt-jsonview-tsv-label';
    label.textContent = this.messages.tsvConfirm.replace('{0}', String(rows)).replace('{1}', String(columns));
    bar.appendChild(label);

    // 追加:矩阵整体作为新记录(从第 0 列起)。
    const appendButton = document.createElement('button');
    appendButton.type = 'button';
    appendButton.className = 'zt-jsonview-tsv-apply';
    appendButton.textContent = this.messages.tsvAppend;
    appendButton.addEventListener('click', () => {
      this.applyTsv(matrix, null);
    });
    bar.appendChild(appendButton);

    // 覆盖:从第 0 行第 0 列起覆盖现有格。
    const overwriteButton = document.createElement('button');
    overwriteButton.type = 'button';
    overwriteButton.className = 'zt-jsonview-tsv-apply';
    overwriteButton.textContent = this.messages.tsvOverwrite;
    overwriteButton.addEventListener('click', () => {
      this.applyTsv(matrix, { recordIndex: 0, fieldIndex: 0 });
    });
    bar.appendChild(overwriteButton);

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'zt-jsonview-tsv-cancel';
    cancelButton.textContent = this.messages.tsvCancel;
    cancelButton.addEventListener('click', () => {
      this.tsvPending = null;
      this.dismissTsvBar();
    });
    bar.appendChild(cancelButton);

    this.tsvBar = bar;
    this.dom.insertBefore(bar, this.dom.firstChild);
  }

  /**
   * 关闭确认条。
   */
  private dismissTsvBar(): void {
    this.tsvBar?.remove();
    this.tsvBar = null;
  }

  /**
   * 应用 TSV 矩阵并整表重绘 + 提交。
   */
  private applyTsv(matrix: string[][], anchor: { recordIndex: number; fieldIndex: number } | null): void {
    const result = applyTsvMatrix(this.doc, matrix, anchor);
    this.tsvPending = null;
    this.dismissTsvBar();
    this.doc = result.doc;
    this.render();
    this.commit('tsv');
  }
}
