/**
 * validate.ts — 围栏体 JSON 解析/归一/序列化(纯函数,无 DOM,可 node 自测)
 *
 * 容错规则(notion-parity-plan §4.2):
 * - JSON 解析失败 / version 非 1 / fields 或 records 非数组 → ok:false(整块降级只读);
 * - 未知字段类型按 text;引用未知 fieldId 的孤值丢弃;类型不符的取值清洗丢弃;
 * - 序列化 canonical:cells 键按 fields 顺序重排、缺失/空值不补写
 *  (checkbox false 是真实值,保留),保证 setMarkdown → getMarkdown 幂等。
 */
import type { JsonviewCellValue, JsonviewDoc, JsonviewField, JsonviewFieldType, JsonviewRecord } from './types';
import { isJsonviewFieldType } from './types';

/**
 * 解析结果。
 */
export type JsonviewParseResult =
  | { ok: true; doc: JsonviewDoc }
  | { ok: false; error: string };

/**
 * 判断是否为普通对象(非数组)。
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'string' ? false : typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * 按字段类型清洗单元格取值(类型不符返回 null = 空)。
 */
export const coerceCellValue = (type: JsonviewFieldType, value: unknown): JsonviewCellValue | null => {
  if (value === null || value === undefined) {
    return null;
  }
  switch (type) {
    case 'text':
    case 'url':
    case 'date':
      // 空字符串即空值(缺失即空,不落盘)。
      return typeof value === 'string' && value !== '' ? value : null;
    case 'number': {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    }
    case 'select':
      return typeof value === 'string' && value !== '' ? value : null;
    case 'multiSelect': {
      if (Array.isArray(value)) {
        const values = value.filter((item): item is string => typeof item === 'string' && item !== '');
        return values.length > 0 ? values : null;
      }
      // 容错:单个字符串包装为数组。
      return typeof value === 'string' && value !== '' ? [value] : null;
    }
    case 'checkbox':
      return typeof value === 'boolean' ? value : null;
    default:
      return null;
  }
};

/**
 * 归一单个字段(非法字段返回 null 丢弃)。
 */
const normalizeField = (raw: unknown): JsonviewField | null => {
  if (!isPlainObject(raw)) {
    return null;
  }
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  if (!id) {
    return null;
  }
  const field: JsonviewField = {
    id,
    name: typeof raw.name === 'string' ? raw.name : '',
    type: isJsonviewFieldType(raw.type) ? raw.type : 'text'
  };
  // select/multiSelect 保留字符串候选值。
  if ((field.type === 'select' || field.type === 'multiSelect') && Array.isArray(raw.options)) {
    const options = raw.options.filter((item): item is string => typeof item === 'string');
    if (options.length > 0) {
      field.options = options;
    }
  }
  return field;
};

/**
 * 解析围栏体 JSON 为 JsonviewDoc(清洗归一;结构非法返回 ok:false)。
 */
export const parseJsonviewValue = (raw: string): JsonviewParseResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'JSON parse failed' };
  }
  if (!isPlainObject(parsed)) {
    return { ok: false, error: 'root is not an object' };
  }
  if (parsed.version !== 1) {
    return { ok: false, error: `unsupported version: ${String(parsed.version)}` };
  }
  if (!Array.isArray(parsed.fields)) {
    return { ok: false, error: 'fields is not an array' };
  }

  // 字段归一(丢弃无 id 的非法字段)。
  const fields = parsed.fields
    .map((item) => normalizeField(item))
    .filter((field): field is JsonviewField => field !== null);

  // 字段 id 集合(去重:重复 id 保留首个)。
  const fieldIdSet = new Set<string>();
  for (const field of fields) {
    if (!fieldIdSet.has(field.id)) {
      fieldIdSet.add(field.id);
    }
  }

  // 记录归一:孤值丢弃 + 类型清洗。
  const records: JsonviewRecord[] = [];
  if (Array.isArray(parsed.records)) {
    for (const rawRecord of parsed.records) {
      if (!isPlainObject(rawRecord)) {
        continue;
      }
      const id = typeof rawRecord.id === 'string' ? rawRecord.id.trim() : '';
      if (!id) {
        continue;
      }
      const cells: Record<string, NonNullable<JsonviewCellValue>> = {};
      if (isPlainObject(rawRecord.cells)) {
        for (const [fieldId, rawValue] of Object.entries(rawRecord.cells)) {
          if (!fieldIdSet.has(fieldId)) {
            continue;
          }
          // 对应字段类型。
          const fieldType = fields.find((field) => field.id === fieldId)?.type;
          if (!fieldType) {
            continue;
          }
          const coerced = coerceCellValue(fieldType, rawValue);
          if (coerced !== null) {
            cells[fieldId] = coerced;
          }
        }
      }
      records.push({ id, cells });
    }
  }

  return {
    ok: true,
    doc: {
      version: 1,
      name: typeof parsed.name === 'string' ? parsed.name : '',
      fields,
      records
    }
  };
};

/**
 * 判断单元格取值是否为"空"(序列化时不落盘;checkbox false 是真实值)。
 */
const isEmptyCellValue = (value: JsonviewCellValue | null): boolean => {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string' && value === '') {
    return true;
  }
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  return false;
};

/**
 * canonical 序列化:cells 键按 fields 顺序重排、空值不落盘;name 为空时省略。
 */
export const serializeJsonviewDoc = (doc: JsonviewDoc): string => {
  const output: Record<string, unknown> = {
    version: doc.version,
    fields: doc.fields,
    records: doc.records.map((record) => ({
      id: record.id,
      cells: Object.fromEntries(
        doc.fields
          .map((field) => [field.id, record.cells[field.id] ?? null] as const)
          .filter(([, value]) => !isEmptyCellValue(value))
      )
    }))
  };
  if (doc.name !== '') {
    output.name = doc.name;
  }
  return JSON.stringify(output, null, 2);
};

/**
 * 生成下一个可用字段 id(f1、f2…取现有最大序号 +1)。
 */
export const nextFieldId = (doc: JsonviewDoc): string => {
  let max = 0;
  for (const field of doc.fields) {
    const match = /^f(\d+)$/.exec(field.id);
    if (match?.[1]) {
      max = Math.max(max, Number.parseInt(match[1], 10));
    }
  }
  return `f${max + 1}`;
};

/**
 * 生成下一个可用记录 id(r1、r2…取现有最大序号 +1)。
 */
export const nextRecordId = (doc: JsonviewDoc): string => {
  let max = 0;
  for (const record of doc.records) {
    const match = /^r(\d+)$/.exec(record.id);
    if (match?.[1]) {
      max = Math.max(max, Number.parseInt(match[1], 10));
    }
  }
  return `r${max + 1}`;
};
