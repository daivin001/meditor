/**
 * query.ts — 视图公共查询(筛选 + 排序,纯函数)
 *
 * 运行时状态(JsonviewRuntimeState.filter/sort)只作用于视图呈现,绝不写回文档
 * (notion-parity-plan §4.2 设计红线)。kanban/Gallery/List/Calendar/Table 共用。
 */
import type { JsonviewCellValue, JsonviewDoc, JsonviewFilterCondition, JsonviewRecord, JsonviewSortSpec } from './types';

/**
 * 单元格值 → 比较用文本(multiSelect 连接为逗号串;checkbox → 'true'/'false')。
 */
const valueAsText = (value: JsonviewCellValue | null): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
};

/**
 * 单元格值 → 比较用数值(非数值字段/空值 → null)。
 */
const valueAsNumber = (value: JsonviewCellValue | null): number | null => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/**
 * 判断单元格值是否为空。
 */
const isEmptyValue = (value: JsonviewCellValue | null): boolean =>
  value === null ||
  value === undefined ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

/**
 * 单条件判定(字段类型决定比较语义)。
 */
const matchCondition = (doc: JsonviewDoc, record: JsonviewRecord, condition: JsonviewFilterCondition): boolean => {
  const field = doc.fields.find((item) => item.id === condition.fieldId);
  if (!field) {
    return true;
  }
  const value = record.cells[condition.fieldId] ?? null;
  const text = valueAsText(value).toLowerCase();
  const needle = condition.value.trim().toLowerCase();

  switch (condition.op) {
    case 'contains':
      return needle === '' ? true : text.includes(needle);
    case 'equals':
      // checkbox 字段用真值词匹配;其余按文本全等。
      if (field.type === 'checkbox') {
        const truthy = ['true', 'x', '✓', '是', 'yes', 'y', '1'];
        const wantTrue = truthy.includes(needle);
        return typeof value === 'boolean' ? value === wantTrue : false;
      }
      return text === needle;
    case 'notEquals':
      return text !== needle;
    case 'gt':
    case 'lt': {
      // number/date 字段数值比较;date 字符串 ISO 格式字典序等价数值序。
      const left = field.type === 'date' ? (typeof value === 'string' ? Date.parse(value) : Number.NaN) : valueAsNumber(value);
      const right = field.type === 'date' ? Date.parse(condition.value) : Number(condition.value);
      if (left === null || Number.isNaN(left) || Number.isNaN(right)) {
        return true;
      }
      return condition.op === 'gt' ? left > right : left < right;
    }
    case 'isEmpty':
      return isEmptyValue(value);
    case 'isNotEmpty':
      return !isEmptyValue(value);
    default:
      return true;
  }
};

/**
 * 排序键(checkbox → 0/1;number → 数值;date → 时间戳;其余文本 localeCompare;
 * 空值返回 null,由比较器统一排在最后)。
 */
const sortKeyValue = (doc: JsonviewDoc, record: JsonviewRecord, fieldId: string): string | number | null => {
  const field = doc.fields.find((item) => item.id === fieldId);
  const value = record.cells[fieldId] ?? null;
  if (!field) {
    return '';
  }
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  ) {
    return null;
  }
  if (field.type === 'checkbox') {
    return value === true ? 1 : 0;
  }
  if (field.type === 'number') {
    return valueAsNumber(value) ?? null;
  }
  if (field.type === 'date') {
    const parsed = typeof value === 'string' ? Date.parse(value) : Number.NaN;
    return Number.isNaN(parsed) ? null : parsed;
  }
  return valueAsText(value);
};

/**
 * 应用筛选与排序,返回视图应呈现的记录列表(文档顺序不动,只返回视图序列)。
 * filter 为 AND 语义;sort 为 null 时保持文档原始顺序(仅过滤)。
 * 排序时空值恒排最后(升序/降序一致,对齐 Notion)。
 */
export const queryRecords = (
  doc: JsonviewDoc,
  filter: JsonviewFilterCondition[],
  sort: JsonviewSortSpec | null
): JsonviewRecord[] => {
  // 筛选(丢弃引用已删字段的失效条件)。
  const activeConditions = filter.filter((condition) =>
    doc.fields.some((field) => field.id === condition.fieldId)
  );
  const filtered = activeConditions.length === 0
    ? doc.records
    : doc.records.filter((record) => activeConditions.every((condition) => matchCondition(doc, record, condition)));

  // 排序(字段已删/方向为空 → 原序)。
  if (!sort || !doc.fields.some((field) => field.id === sort.fieldId)) {
    return filtered;
  }
  const isEmptyRecord = (record: JsonviewRecord): boolean => {
    const value = record.cells[sort.fieldId];
    return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
  };
  const sorted = [...filtered].sort((a, b) => {
    const emptyA = isEmptyRecord(a);
    const emptyB = isEmptyRecord(b);
    if (emptyA || emptyB) {
      if (emptyA && emptyB) {
        return 0;
      }
      // 空值恒排最后(与方向无关)。
      return emptyA ? 1 : -1;
    }
    const keyA = sortKeyValue(doc, a, sort.fieldId);
    const keyB = sortKeyValue(doc, b, sort.fieldId);
    let compared: number;
    if (typeof keyA === 'number' && typeof keyB === 'number') {
      compared = keyA - keyB;
    } else {
      compared = String(keyA).localeCompare(String(keyB), 'zh-CN');
    }
    return sort.direction === 'desc' ? -compared : compared;
  });
  return sorted;
};
