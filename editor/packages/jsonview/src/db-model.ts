/**
 * db-model.ts — 数据模型操作(纯函数变换 JsonviewDoc)
 *
 * 所有操作返回新 doc(浅拷贝 + 受影响部分重建),由渲染器统一触发 onChange;
 * M1 撤销依赖 ProseMirror history(每次 attr 变更一个历史步),内部 undo 栈延后。
 */
import type { JsonviewCellValue, JsonviewDoc, JsonviewField, JsonviewFieldType, JsonviewRecord } from './types';
import { nextFieldId, nextRecordId } from './validate';

/**
 * 深拷贝记录(cells 一层重建)。
 */
const cloneRecord = (record: JsonviewRecord): JsonviewRecord => ({
  id: record.id,
  cells: { ...record.cells }
});

/**
 * 重命名字段。
 */
export const renameField = (doc: JsonviewDoc, fieldId: string, name: string): JsonviewDoc => ({
  ...doc,
  fields: doc.fields.map((field) => (field.id === fieldId ? { ...field, name } : field))
});

/**
 * 更改字段类型(类型变化时原有取值按新类型清洗,丢弃不兼容值)。
 */
export const retypeField = (doc: JsonviewDoc, fieldId: string, type: JsonviewFieldType, coerce: (type: JsonviewFieldType, value: unknown) => JsonviewCellValue | null): JsonviewDoc => {
  const fields = doc.fields.map((field) => (field.id === fieldId ? { ...field, type } : field));
  const records = doc.records.map((record) => {
    if (!(fieldId in record.cells)) {
      return record;
    }
    // 按新类型清洗原值。
    const coerced = coerce(type, record.cells[fieldId]);
    // 清洗后的记录。
    const nextRecord = cloneRecord(record);
    if (coerced === null) {
      delete nextRecord.cells[fieldId];
    } else {
      nextRecord.cells[fieldId] = coerced;
    }
    return nextRecord;
  });
  return { ...doc, fields, records };
};

/**
 * 更新 select/multiSelect 字段候选值。
 */
export const setFieldOptions = (doc: JsonviewDoc, fieldId: string, options: string[] | undefined): JsonviewDoc => ({
  ...doc,
  fields: doc.fields.map((field) => {
    if (field.id !== fieldId) {
      return field;
    }
    // 重建字段(无候选值时删除该键)。
    const next: JsonviewField = { ...field };
    if (options && options.length > 0) {
      next.options = options;
    } else {
      next.options = undefined;
    }
    return next;
  })
});

/**
 * 删除字段(连同各记录取值)。
 */
export const removeField = (doc: JsonviewDoc, fieldId: string): JsonviewDoc => ({
  ...doc,
  fields: doc.fields.filter((field) => field.id !== fieldId),
  records: doc.records.map((record) => {
    if (!(fieldId in record.cells)) {
      return record;
    }
    // 移除该列取值。
    const nextRecord = cloneRecord(record);
    delete nextRecord.cells[fieldId];
    return nextRecord;
  })
});

/**
 * 添加字段(默认文本类型,列尾追加)。
 */
export const addField = (doc: JsonviewDoc, name: string): { doc: JsonviewDoc; fieldId: string } => {
  const fieldId = nextFieldId(doc);
  return {
    doc: { ...doc, fields: [...doc.fields, { id: fieldId, name, type: 'text' }] },
    fieldId
  };
};

/**
 * 添加记录(行尾追加,空 cells)。
 */
export const addRecord = (doc: JsonviewDoc): { doc: JsonviewDoc; recordId: string } => {
  const recordId = nextRecordId(doc);
  return {
    doc: { ...doc, records: [...doc.records, { id: recordId, cells: {} }] },
    recordId
  };
};

/**
 * 删除记录。
 */
export const removeRecord = (doc: JsonviewDoc, recordId: string): JsonviewDoc => ({
  ...doc,
  records: doc.records.filter((record) => record.id !== recordId)
});

/**
 * 写入单元格取值(value 为 null/空表示清空该格)。
 */
export const setCell = (doc: JsonviewDoc, recordId: string, fieldId: string, value: JsonviewCellValue): JsonviewDoc => {
  // 目标记录下标。
  const index = doc.records.findIndex((record) => record.id === recordId);
  if (index < 0) {
    return doc;
  }

  // 重建目标记录。
  const record = cloneRecord(doc.records[index] as JsonviewRecord);
  if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
    delete record.cells[fieldId];
  } else {
    record.cells[fieldId] = value;
  }

  // 替换进记录数组。
  const records = [...doc.records];
  records[index] = record;
  return { ...doc, records };
};
