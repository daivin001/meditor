/**
 * tsv.ts — TSV 粘贴(mtable/Excel/Notion 表格 → 数据库)
 *
 * M1 遗留项落地:表格视图内粘贴 TSV 文本,按目标列类型强转
 * (coerceCellValue);矩阵超出现有记录/字段时自动追加行/文本列。
 * 纯函数,无 DOM,可 node 自测。
 */
import type { JsonviewCellValue, JsonviewDoc, JsonviewRecord } from './types';
import { coerceCellValue, nextFieldId, nextRecordId } from './validate';

/**
 * 解析 TSV 文本为二维矩阵(CRLF/CR/LF 均可;单元格内不含引号转义,TSV 惯例)。
 */
export const parseTsvMatrix = (text: string): string[][] => {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // 末尾换行不产生空行,其余换行分列。
  const lines = normalized.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines.map((line) => line.split('\t'));
};

/**
 * 判断文本是否可作为 TSV 矩阵粘贴(含制表符,或多行多列形态)。
 */
export const looksLikeTsv = (text: string): boolean => {
  if (text.includes('\t')) {
    return true;
  }
  // 多行且至少两行:按 TSV 矩阵处理(与单行纯文本粘贴区分)。
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return lines.length > 1 && lines.some((line) => line.trim() !== '');
};

/**
 * 勾选型文本 → boolean(true/x/✓/是/yes/y/1 视为真)。
 */
const coerceCheckboxText = (raw: string): boolean | null => {
  const normalized = raw.trim().toLowerCase();
  if (normalized === '') {
    return null;
  }
  return ['true', 'x', '✓', '是', 'yes', 'y', '1'].includes(normalized);
};

/**
 * 按目标列类型强转粘贴文本(null = 清空该格)。
 */
const coercePastedText = (fieldType: string, raw: string): JsonviewCellValue | null => {
  const trimmed = raw.trim();
  if (fieldType === 'checkbox') {
    return coerceCheckboxText(trimmed);
  }
  if (fieldType === 'multiSelect') {
    if (trimmed === '') {
      return null;
    }
    // 逗号(中英文)、顿号拆分为数组。
    const values = trimmed
      .split(/[,，、]/)
      .map((item) => item.trim())
      .filter((item) => item !== '');
    return values.length > 0 ? values : null;
  }
  return coerceCellValue(fieldType as JsonviewDoc['fields'][number]['type'], trimmed);
};

/**
 * 粘贴应用结果。
 */
export interface TsvApplyResult {
  /** 应用后的文档。 */
  doc: JsonviewDoc;
  /** 本次粘贴新增的字段 id(矩阵溢出列,自动建为文本列)。 */
  appendedFieldIds: string[];
  /** 本次粘贴新增的记录 id(矩阵溢出行)。 */
  appendedRecordIds: string[];
}

/**
 * 将 TSV 矩阵写入文档:
 * - 锚点(recordIndex, fieldIndex)起逐格覆盖,按列类型强转;
 * - 溢出行追加新记录;溢出列追加文本字段;
 * - 锚点为 null 时按「追加记录」处理(整表追加,从第 0 列起)。
 */
export const applyTsvMatrix = (
  doc: JsonviewDoc,
  matrix: string[][],
  anchor: { recordIndex: number; fieldIndex: number } | null
): TsvApplyResult => {
  const appendedFieldIds: string[] = [];
  const appendedRecordIds: string[] = [];

  // 有效行(至少一格非空)。
  const rows = matrix.filter((row) => row.some((cell) => cell.trim() !== ''));
  if (rows.length === 0) {
    return { doc, appendedFieldIds, appendedRecordIds };
  }

  // 追加模式:锚点行 = 现有记录数(即全部为新行)。
  const startRecordIndex = anchor ? Math.max(0, Math.min(anchor.recordIndex, doc.records.length)) : doc.records.length;
  const startFieldIndex = anchor ? Math.max(0, Math.min(anchor.fieldIndex, doc.fields.length)) : 0;

  // 列空间:现有字段 + 溢出列(自动补文本字段)。
  const maxColumn = Math.max(...rows.map((row) => row.length));
  let fields = [...doc.fields];
  const fieldCount = startFieldIndex + maxColumn;
  while (fields.length < fieldCount) {
    const id = nextFieldId({ ...doc, fields });
    fields = [...fields, { id, name: '', type: 'text' }];
    appendedFieldIds.push(id);
  }

  // 行空间:现有记录 + 溢出行。
  let records = [...doc.records];
  const needRecords = startRecordIndex + rows.length;
  while (records.length < needRecords) {
    const id = nextRecordId({ ...doc, records });
    records = [...records, { id, cells: {} }];
    appendedRecordIds.push(id);
  }

  // 逐格写入(重建 records,保证不可变)。
  const written: JsonviewRecord[] = records.map((record) => ({ id: record.id, cells: { ...record.cells } }));
  rows.forEach((row, rowIndex) => {
    const record = written[startRecordIndex + rowIndex];
    if (!record) {
      return;
    }
    row.forEach((cellText, columnIndex) => {
      const field = fields[startFieldIndex + columnIndex];
      if (!field) {
        return;
      }
      const coerced = coercePastedText(field.type, cellText);
      if (coerced === null) {
        delete record.cells[field.id];
      } else {
        record.cells[field.id] = coerced;
      }
    });
  });

  return {
    doc: { ...doc, fields, records: written },
    appendedFieldIds,
    appendedRecordIds
  };
};
