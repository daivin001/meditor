/**
 * views/query-panel.ts — 筛选/排序面板(工具栏弹出层)
 *
 * 运行时状态入口:条件(AND 语义)+ 单字段排序,改动经回调同步渲染器
 * (渲染器负责状态保存与视图重绘);任何内容都不写回文档。
 */
import type { JsonviewDoc, JsonviewFilterCondition, JsonviewFilterOp, JsonviewMessages, JsonviewSortSpec } from '../types';
import { JsonviewDropdown } from './dropdown';

/** 各字段类型可用的比较符(gt/lt 仅 number/date)。 */
const OPS_BY_TYPE: Record<string, JsonviewFilterOp[]> = {
  text: ['contains', 'equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
  url: ['contains', 'equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
  select: ['equals', 'notEquals', 'contains', 'isEmpty', 'isNotEmpty'],
  multiSelect: ['contains', 'isEmpty', 'isNotEmpty'],
  number: ['equals', 'gt', 'lt', 'isEmpty', 'isNotEmpty'],
  date: ['equals', 'gt', 'lt', 'isEmpty', 'isNotEmpty'],
  checkbox: ['equals']
};

/** 比较符 → 文案键。 */
const OP_MESSAGE_KEYS: Record<JsonviewFilterOp, keyof JsonviewMessages> = {
  contains: 'opContains',
  equals: 'opEquals',
  notEquals: 'opNotEquals',
  gt: 'opGt',
  lt: 'opLt',
  isEmpty: 'opIsEmpty',
  isNotEmpty: 'opIsNotEmpty'
};

/**
 * 筛选/排序面板回调。
 */
export interface JsonviewQueryPanelCallbacks {
  /** 筛选条件变更(整体替换)。 */
  onFilterChange: (conditions: JsonviewFilterCondition[]) => void;
  /** 排序变更(null = 不排序)。 */
  onSortChange: (sort: JsonviewSortSpec | null) => void;
}

/**
 * 筛选/排序面板。
 */
export class JsonviewQueryPanel {
  /** 根元素(弹出层)。 */
  readonly dom: HTMLElement;
  /** 当前文档。 */
  private doc: JsonviewDoc;
  /** 当前文案。 */
  private readonly messages: JsonviewMessages;
  /** 回调。 */
  private readonly callbacks: JsonviewQueryPanelCallbacks;
  /** 筛选条件。 */
  private conditions: JsonviewFilterCondition[];
  /** 排序。 */
  private sort: JsonviewSortSpec | null;

  /**
   * 初始化面板。
   */
  constructor(
    doc: JsonviewDoc,
    messages: JsonviewMessages,
    conditions: JsonviewFilterCondition[],
    sort: JsonviewSortSpec | null,
    callbacks: JsonviewQueryPanelCallbacks
  ) {
    this.doc = doc;
    this.messages = messages;
    this.conditions = [...conditions];
    this.sort = sort;
    this.callbacks = callbacks;

    this.dom = document.createElement('div');
    this.dom.className = 'zt-jsonview-query-panel';
    this.render();
  }

  /**
   * 外部同步(文档替换后字段集可能变化)。
   */
  update(doc: JsonviewDoc, conditions: JsonviewFilterCondition[], sort: JsonviewSortSpec | null): void {
    this.doc = doc;
    // 丢弃引用已删字段的失效条件。
    this.conditions = conditions.filter((condition) =>
      doc.fields.some((field) => field.id === condition.fieldId)
    );
    this.sort = sort;
    this.render();
  }

  /**
   * 重绘面板。
   */
  render(): void {
    this.dom.textContent = '';
    this.dom.appendChild(this.buildFilterSection());
    this.dom.appendChild(this.buildSortSection());
  }

  /**
   * 构建筛选区。
   */
  private buildFilterSection(): HTMLElement {
    // 筛选区容器。
    const section = document.createElement('div');
    section.className = 'zt-jsonview-query-section';

    const title = document.createElement('div');
    title.className = 'zt-jsonview-query-title';
    title.textContent = this.messages.filterSection;
    section.appendChild(title);

    // 现有条件行。
    this.conditions.forEach((condition, index) => {
      section.appendChild(this.buildConditionRow(condition, index));
    });

    if (!this.readOnly()) {
      // 添加条件。
      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'zt-jsonview-query-add';
      addButton.textContent = `+ ${this.messages.addFilter}`;
      addButton.addEventListener('click', () => {
        const firstField = this.doc.fields[0];
        if (!firstField) {
          return;
        }
        const op = OPS_BY_TYPE[firstField.type]?.[0] ?? 'contains';
        this.conditions = [...this.conditions, { fieldId: firstField.id, op, value: '' }];
        this.render();
        this.callbacks.onFilterChange(this.conditions);
      });
      section.appendChild(addButton);
    }
    return section;
  }

  /**
   * 面板是否可编辑(有可选字段即视为可编辑;只读整表渲染已由视图层处理)。
   */
  private readOnly(): boolean {
    return this.doc.fields.length === 0;
  }

  /**
   * 构建面板行内下拉(字段/比较符/排序方向通用)。
   */
  private buildDropdown(params: {
    className: string;
    ariaLabel?: string;
    options: Array<{ value: string; label: string }>;
    value: string;
    onSelect: (value: string) => void;
  }): HTMLElement {
    return new JsonviewDropdown({
      options: params.options,
      value: params.value,
      className: params.className,
      ariaLabel: params.ariaLabel,
      callbacks: { onSelect: params.onSelect }
    }).dom;
  }

  /**
   * 构建单条筛选条件行。
   */
  private buildConditionRow(condition: JsonviewFilterCondition, index: number): HTMLElement {
    // 条件行容器。
    const row = document.createElement('div');
    row.className = 'zt-jsonview-query-row';

    // 字段下拉。
    const fieldDropdown = this.buildDropdown({
      className: 'zt-jsonview-query-field',
      ariaLabel: this.messages.filterFieldPlaceholder,
      options: this.doc.fields.map((field) => ({ value: field.id, label: field.name || field.id })),
      value: condition.fieldId,
      onSelect: (fieldId) => {
        // 切字段时比较符重置为该类型首个可用项。
        const nextField = this.doc.fields.find((item) => item.id === fieldId);
        const op = OPS_BY_TYPE[nextField?.type ?? 'text']?.[0] ?? 'contains';
        this.conditions = this.conditions.map((item, i) =>
          i === index ? { ...item, fieldId, op } : item
        );
        this.render();
        this.callbacks.onFilterChange(this.conditions);
      }
    });
    row.appendChild(fieldDropdown);

    // 比较符下拉。
    const conditionField = this.doc.fields.find((item) => item.id === condition.fieldId);
    const opDropdown = this.buildDropdown({
      className: 'zt-jsonview-query-op',
      options: (OPS_BY_TYPE[conditionField?.type ?? 'text'] ?? ['contains']).map((op) => ({
        value: op,
        label: this.messages[OP_MESSAGE_KEYS[op]]
      })),
      value: condition.op,
      onSelect: (op) => {
        this.conditions = this.conditions.map((item, i) =>
          i === index ? { ...item, op: op as JsonviewFilterOp } : item
        );
        this.render();
        this.callbacks.onFilterChange(this.conditions);
      }
    });
    row.appendChild(opDropdown);

    // 值输入(isEmpty/isNotEmpty/checkbox 无值)。
    const needsValue = condition.op !== 'isEmpty' && condition.op !== 'isNotEmpty' && conditionField?.type !== 'checkbox';
    if (needsValue) {
      const valueInput = document.createElement('input');
      valueInput.type = conditionField?.type === 'date' ? 'date' : 'text';
      valueInput.className = 'zt-jsonview-query-value';
      valueInput.placeholder = this.messages.filterValuePlaceholder;
      valueInput.value = condition.value;
      valueInput.addEventListener('change', () => {
        this.conditions = this.conditions.map((item, i) =>
          i === index ? { ...item, value: valueInput.value } : item
        );
        this.callbacks.onFilterChange(this.conditions);
      });
      row.appendChild(valueInput);
    }

    // 删除条件。
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'zt-jsonview-query-remove';
    removeButton.textContent = '×';
    removeButton.title = this.messages.removeCondition;
    removeButton.setAttribute('aria-label', this.messages.removeCondition);
    removeButton.addEventListener('click', () => {
      this.conditions = this.conditions.filter((_, i) => i !== index);
      this.render();
      this.callbacks.onFilterChange(this.conditions);
    });
    row.appendChild(removeButton);
    return row;
  }

  /**
   * 构建排序区。
   */
  private buildSortSection(): HTMLElement {
    // 排序区容器。
    const section = document.createElement('div');
    section.className = 'zt-jsonview-query-section';

    const title = document.createElement('div');
    title.className = 'zt-jsonview-query-title';
    title.textContent = this.messages.sortSection;
    section.appendChild(title);

    const row = document.createElement('div');
    row.className = 'zt-jsonview-query-row';

    // 字段下拉(首项 = 不排序)。
    const fieldDropdown = this.buildDropdown({
      className: 'zt-jsonview-query-field',
      options: [
        { value: '', label: this.messages.sortNone },
        ...this.doc.fields.map((field) => ({ value: field.id, label: field.name || field.id }))
      ],
      value: this.sort?.fieldId ?? '',
      onSelect: (fieldId) => {
        this.sort = fieldId === '' ? null : { fieldId, direction: this.sort?.direction ?? 'asc' };
        this.render();
        this.callbacks.onSortChange(this.sort);
      }
    });
    row.appendChild(fieldDropdown);

    // 方向切换(仅在排序时显示)。
    if (this.sort) {
      const dirDropdown = this.buildDropdown({
        className: 'zt-jsonview-query-op',
        options: [
          { value: 'asc', label: this.messages.sortAsc },
          { value: 'desc', label: this.messages.sortDesc }
        ],
        value: this.sort.direction,
        onSelect: (direction) => {
          if (!this.sort) {
            return;
          }
          this.sort = { fieldId: this.sort.fieldId, direction: direction as 'asc' | 'desc' };
          this.callbacks.onSortChange(this.sort);
        }
      });
      row.appendChild(dirDropdown);
    }

    section.appendChild(row);
    return section;
  }
}
