/**
 * views/cell-editor.ts — 单元格控件工厂(Table/Gallery/List/kanban 共用)
 *
 * 从 table-view 抽出的按字段类型渲染逻辑:编辑态控件(change 即提交)+ 只读态
 * 纯文本(url 渲染为链接)。视图层拿到的输出直接 append 进自己的容器。
 */
import type { JsonviewCellValue, JsonviewField, JsonviewRecord } from '../types';
import { coerceCellValue } from '../validate';
import { JsonviewDropdown } from './dropdown';

/**
 * 单元格控件回调。
 */
export interface CellEditorCallbacks {
  /** 取值提交(值已按类型清洗;null = 清空)。 */
  onWrite: (recordId: string, fieldId: string, value: JsonviewCellValue) => void;
}

/**
 * 创建编辑态单元格控件。
 */
export const createCellEditor = (
  record: JsonviewRecord,
  field: JsonviewField,
  callbacks: CellEditorCallbacks
): HTMLElement => {
  const value: JsonviewCellValue = record.cells[field.id] ?? null;

  switch (field.type) {
    case 'checkbox': {
      // 勾选控件。
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = value === true;
      checkbox.addEventListener('change', () => {
        callbacks.onWrite(record.id, field.id, checkbox.checked);
      });
      return checkbox;
    }
    case 'select': {
      // 单选下拉(自定义组件,替代原生 select)。
      const current = typeof value === 'string' ? value : '';
      // 候选值(当前值不在候选中时追加,保证不丢显示);首项空值 = 清空。
      const candidates = [...(field.options ?? [])];
      if (current !== '' && !candidates.includes(current)) {
        candidates.push(current);
      }
      const dropdown = new JsonviewDropdown({
        options: [{ value: '', label: '' }, ...candidates.map((optionValue) => ({ value: optionValue, label: optionValue }))],
        value: current,
        className: 'zt-jsonview-input',
        ariaLabel: field.name || field.id,
        callbacks: {
          onSelect: (next) => {
            callbacks.onWrite(record.id, field.id, next === '' ? null : next);
          }
        }
      });
      return dropdown.dom;
    }
    case 'multiSelect': {
      // 多选:逗号分隔文本。
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'zt-jsonview-input';
      input.value = Array.isArray(value) ? value.join(', ') : '';
      input.placeholder = (field.options ?? []).join(', ');
      input.addEventListener('change', () => {
        const values = input.value.split(/[,，]/).map((item) => item.trim()).filter((item) => item !== '');
        callbacks.onWrite(record.id, field.id, values.length > 0 ? values : null);
      });
      return input;
    }
    default: {
      // text/number/date/url 统一输入控件。
      const input = document.createElement('input');
      input.className = 'zt-jsonview-input';
      input.type = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text';
      input.value =
        field.type === 'number' && typeof value === 'number'
          ? String(value)
          : typeof value === 'string'
            ? value
            : '';
      input.addEventListener('change', () => {
        if (field.type === 'number') {
          const parsed = input.value.trim() === '' ? null : Number(input.value);
          callbacks.onWrite(record.id, field.id, parsed !== null && Number.isFinite(parsed) ? parsed : null);
          return;
        }
        callbacks.onWrite(record.id, field.id, input.value.trim() === '' ? null : input.value.trim());
      });
      return input;
    }
  }
};

/**
 * 创建只读态单元格(纯文本;url 渲染为链接;multiSelect 逗号串)。
 */
export const createCellStatic = (field: JsonviewField, value: JsonviewCellValue): HTMLElement => {
  const span = document.createElement('span');
  span.className = 'zt-jsonview-static';
  if (value === null || value === undefined) {
    return span;
  }
  if (field.type === 'checkbox') {
    span.textContent = value ? '✓' : '';
    return span;
  }
  if (field.type === 'multiSelect' && Array.isArray(value)) {
    span.textContent = value.join(', ');
    return span;
  }
  if (field.type === 'url' && typeof value === 'string' && value !== '') {
    const anchor = document.createElement('a');
    anchor.href = value;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = value;
    span.appendChild(anchor);
    return span;
  }
  span.textContent = String(value);
  return span;
};

/**
 * 值清洗提交助手(视图 onWrite 统一先走 coerce)。
 */
export const coerceForWrite = (
  fieldType: JsonviewField['type'],
  value: JsonviewCellValue
): JsonviewCellValue | null => coerceCellValue(fieldType, value);
