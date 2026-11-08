/**
 * csv-interop.ts — CSV ↔ 数据库互转(M3)
 *
 * - 导入:mtable/CSV 表格数据 → 数据库记录(首行表头 → 字段,类型自动探测);
 * - 导出:数据库单文本字段(text/url/number/date/select)→ CSV(RFC 4180)。
 * 纯函数,无 DOM,可 node 自测。CSV 解析/序列化单一实现收敛于 @meditor/csvkit,
 * 此处按 jsonview 历史行为固定预设(纯逗号、不补列、仅 RFC 4180 必要集包裹),
 * 对外 API 与行为保持不变(包内不再手写第二份 CSV 状态机)。
 */

/**
 * CSV 解析/序列化/粗判:直接 re-export @meditor/csvkit(默认预设即 jsonview
 * 历史行为:纯逗号、不补列、空输入返回空矩阵、仅 RFC 4180 必要集加引号)。
 */
export { looksLikeCsv, parseCsvMatrix, serializeCsvMatrix } from '@meditor/csvkit';

// 包内 import/export 逻辑自用(与上方 re-export 同名同实现)。
import { parseCsvMatrix, serializeCsvMatrix } from '@meditor/csvkit';

/**
 * 表头 → 字段类型自动探测(抽样非空值;全空 → text)。
 */
const detectFieldType = (samples: string[]): 'text' | 'number' | 'checkbox' | 'url' | 'date' => {
  const nonEmpty = samples.filter((item) => item.trim() !== '');
  if (nonEmpty.length === 0) {
    return 'text';
  }
  if (
    nonEmpty.every((item) =>
      ['true', 'false', 'x', '✓', '是', '否', 'yes', 'no', 'y', 'n', '1', '0'].includes(
        item.trim().toLowerCase(),
      ),
    )
  ) {
    return 'checkbox';
  }
  if (nonEmpty.every((item) => item.trim() !== '' && Number.isFinite(Number(item)))) {
    return 'number';
  }
  if (nonEmpty.every((item) => /^https?:\/\/\S+$/.test(item.trim()))) {
    return 'url';
  }
  if (nonEmpty.every((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.trim()))) {
    return 'date';
  }
  return 'text';
};

/**
 * 勾选文本 → boolean(true/x/✓/是/yes/y/1 为真)。
 */
const coerceCheckboxText = (raw: string): boolean | null => {
  const normalized = raw.trim().toLowerCase();
  if (normalized === '') {
    return null;
  }
  return ['true', 'x', '✓', '是', 'yes', 'y', '1'].includes(normalized);
};

/**
 * CSV 导入结果。
 */
export interface CsvImportResult {
  /** 导入后的文档(追加到现有记录之后)。 */
  doc: JsonviewDocLike;
  /** 新建字段 id(按 CSV 列序)。 */
  appendedFieldIds: string[];
  /** 新增记录 id。 */
  appendedRecordIds: string[];
}

/** 导入目标文档最小结构(避免循环依赖 types,与 JsonviewDoc 结构一致)。 */
interface JsonviewDocLike {
  version: 1;
  name: string;
  fields: Array<{ id: string; name: string; type: string; options?: string[] }>;
  records: Array<{ id: string; cells: Record<string, unknown> }>;
}

/** 生成下一个字段/记录 id(与 validate.ts 同规则;本地实现避免依赖)。 */
const nextId = (existing: string[], prefix: string): string => {
  let max = 0;
  for (const id of existing) {
    const match = new RegExp(`^${prefix}(\\d+)$`).exec(id);
    if (match?.[1]) {
      max = Math.max(max, Number.parseInt(match[1], 10));
    }
  }
  return `${prefix}${max + 1}`;
};

/**
 * CSV 导入为数据库记录:
 * - 首行为表头 → 新字段(类型按抽样自动探测;字段名空则「列 N」);
 * - 数据行 → 追加记录(按列类型强转);
 * - 与现有字段重名的列:复用现有字段(按名匹配,text/number/date/url/checkbox 类型才复用)。
 */
export const importCsvToDoc = (doc: JsonviewDocLike, csvText: string): CsvImportResult => {
  const matrix = parseCsvMatrix(csvText);
  // 至少表头 + 一行数据。
  if (matrix.length < 2) {
    return { doc, appendedFieldIds: [], appendedRecordIds: [] };
  }
  const header = matrix[0]?.map((cell) => cell.trim());
  if (!header) {
    return { doc, appendedFieldIds: [], appendedRecordIds: [] };
  }
  const dataRows = matrix.slice(1).filter((row) => row.some((cell) => cell.trim() !== ''));
  if (dataRows.length === 0) {
    return { doc, appendedFieldIds: [], appendedRecordIds: [] };
  }

  // 列对齐(短行补空)。
  const columnCount = Math.max(header.length, ...dataRows.map((row) => row.length));
  const columns: string[][] = [];
  for (let c = 0; c < columnCount; c += 1) {
    columns.push(dataRows.map((row) => row[c] ?? ''));
  }

  // 字段映射:重名复用,否则新建(类型探测)。
  const appendedFieldIds: string[] = [];
  const fields = doc.fields.map((field) => ({ ...field }));
  const columnFieldIds: string[] = [];
  header.forEach((columnName, columnIndex) => {
    const samples = columns[columnIndex] ?? [];
    const existing =
      columnName !== '' ? fields.find((field) => field.name === columnName) : undefined;
    if (existing && ['text', 'number', 'date', 'url', 'checkbox'].includes(existing.type)) {
      columnFieldIds.push(existing.id);
      return;
    }
    const id = nextId(
      fields.map((field) => field.id),
      'f',
    );
    const type = detectFieldType(samples);
    fields.push({ id, name: columnName !== '' ? columnName : `列 ${columnIndex + 1}`, type });
    appendedFieldIds.push(id);
    columnFieldIds.push(id);
  });

  // 记录追加。
  const appendedRecordIds: string[] = [];
  const records = doc.records.map((record) => ({ id: record.id, cells: { ...record.cells } }));
  dataRows.forEach((row) => {
    const id = nextId(
      records.map((record) => record.id),
      'r',
    );
    const cells: Record<string, unknown> = {};
    row.forEach((cellText, columnIndex) => {
      const fieldId = columnFieldIds[columnIndex];
      if (!fieldId) {
        return;
      }
      const field = fields.find((item) => item.id === fieldId);
      if (!field) {
        return;
      }
      const trimmed = cellText.trim();
      if (trimmed === '') {
        return;
      }
      if (field.type === 'checkbox') {
        const flag = coerceCheckboxText(trimmed);
        if (flag !== null) {
          cells[fieldId] = flag;
        }
        return;
      }
      if (field.type === 'number') {
        const parsed = Number(trimmed);
        if (Number.isFinite(parsed)) {
          cells[fieldId] = parsed;
        }
        return;
      }
      cells[fieldId] = trimmed;
    });
    records.push({ id, cells });
    appendedRecordIds.push(id);
  });

  return {
    doc: { ...doc, fields, records },
    appendedFieldIds,
    appendedRecordIds,
  };
};

/**
 * CSV 导出:取第一个可用文本列(text 优先,其次 url/number/date/select),
 * 输出「标题,字段名」两列 CSV(Notion 导出同构);无可用列返回 null。
 */
export const exportDocToCsv = (
  doc: JsonviewDocLike,
  titleFieldId: string | null,
  valueFieldId: string | null,
): string | null => {
  if (!titleFieldId || !valueFieldId) {
    return null;
  }
  const titleField = doc.fields.find((field) => field.id === titleFieldId);
  const valueField = doc.fields.find((field) => field.id === valueFieldId);
  if (!titleField || !valueField) {
    return null;
  }
  const rows: string[][] = [[titleField.name || '标题', valueField.name || '字段']];
  for (const record of doc.records) {
    const title = record.cells[titleField.id];
    const value = record.cells[valueField.id];
    rows.push([
      title === null || title === undefined ? '' : String(title),
      value === null || value === undefined
        ? ''
        : Array.isArray(value)
          ? value.join(', ')
          : String(value),
    ]);
  }
  return serializeCsvMatrix(rows);
};
