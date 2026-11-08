/**
 * index.ts — @meditor/csvkit 公共出口:CSV 解析/序列化单一实现
 *
 * mtable(带分隔符/矩形网格)与 jsonview(纯逗号/不补列)此前各持一份
 * RFC 4180 手写实现,现收敛于此:同一状态机 + 选项参数,两包按各自历史
 * 行为传入预设(见 mtable/csv.ts、jsonview/csv-interop.ts 的薄封装),
 * 对外 API 与行为均保持不变。
 *
 * - 支持:引号包裹、双引号转义("→"")、字段内换行、字段内分隔符、CRLF/CR/LF
 * - 纯函数、零依赖、无 DOM,可在 node 与浏览器直接运行
 */

/** 解析选项。 */
export interface CsvParseOptions {
  /** 字段分隔符(单字符,默认 ',')。 */
  delimiter?: string;
  /** 短行补齐到全表最大列数(表格类场景需要矩形网格;默认 false)。 */
  padColumns?: boolean;
  /** 空输入产出单行单列空表 [['']](网格场景的合法起点;默认 false 时返回 [])。 */
  emptyAsBlankRow?: boolean;
}

/** 序列化选项。 */
export interface CsvSerializeOptions {
  /** 字段分隔符(单字符,默认 ',')。 */
  delimiter?: string;
  /** 前导/尾随空白的字段也加引号包裹(保留精确空白;默认 false 仅按 RFC 4180 必要集包裹)。 */
  quoteWhitespace?: boolean;
}

/**
 * 解析 CSV 文本为二维矩阵(单一状态机)。
 *
 * @param text 原始 CSV 文本
 * @param options 解析选项(delimiter / padColumns / emptyAsBlankRow)
 * @returns 二维字符串矩阵
 */
export function parseCsvMatrix(text: string, options: CsvParseOptions = {}): string[][] {
  // UTF-8 BOM 剥离:Excel 等工具导出的 CSV 常带 BOM 前缀,不去除会污染首列。
  const input = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const delimiter = options.delimiter ?? ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const pushField = (): void => {
    row.push(field);
    field = '';
  };
  const pushRow = (): void => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < input.length) {
    const ch = input[i]!;

    if (inQuotes) {
      if (ch === '"') {
        // 双引号转义:"" → 字面 "
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += ch;
        i += 1;
      }
      continue;
    }

    if (ch === '"' && field.length === 0) {
      inQuotes = true;
      i += 1;
    } else if (ch === delimiter) {
      pushField();
      i += 1;
    } else if (ch === '\r' || ch === '\n') {
      // CRLF 视为一个换行,CR/LF 单独出现也兼容
      if (ch === '\r' && input[i + 1] === '\n') {
        i += 2;
      } else {
        i += 1;
      }
      pushRow();
    } else {
      field += ch;
      i += 1;
    }
  }

  // 末尾残留(无换行结尾的最后一行);整体为空时按 emptyAsBlankRow 决定是否产出空表行
  if (
    field.length > 0 ||
    row.length > 0 ||
    (options.emptyAsBlankRow === true && rows.length === 0)
  ) {
    pushRow();
  }

  if (options.padColumns === true) {
    // 列数对齐到全表最大列(短行补空串)
    let maxCols = 0;
    for (const r of rows) {
      maxCols = Math.max(maxCols, r.length);
    }
    for (const r of rows) {
      while (r.length < maxCols) {
        r.push('');
      }
    }
  }

  return rows;
}

/**
 * 判断字段是否需要引号包裹。
 * 含分隔符/引号/换行的字段必须包裹(RFC 4180);quoteWhitespace 时前导尾随
 * 空白的字段也包裹。
 */
function needsQuotes(field: string, delimiter: string, quoteWhitespace: boolean): boolean {
  return (
    field.includes(delimiter) ||
    field.includes('"') ||
    field.includes('\n') ||
    field.includes('\r') ||
    (quoteWhitespace && field !== field.trim())
  );
}

/**
 * 序列化二维矩阵为 CSV 文本(单一实现)。
 *
 * @param rows 二维字符串矩阵
 * @param options 序列化选项(delimiter / quoteWhitespace)
 * @returns CSV 文本(行间 CRLF,同 RFC 4180;末尾无换行符)
 */
export function serializeCsvMatrix(matrix: string[][], options: CsvSerializeOptions = {}): string {
  const delimiter = options.delimiter ?? ',';
  const quoteWhitespace = options.quoteWhitespace === true;
  return matrix
    .map((row) =>
      row
        .map((field) =>
          needsQuotes(field, delimiter, quoteWhitespace) ? `"${field.replace(/"/g, '""')}"` : field,
        )
        .join(delimiter),
    )
    .join('\r\n');
}

/**
 * 判断文本是否为合法 CSV(至少两行,含逗号分隔;单行单词不误判)。
 */
export function looksLikeCsv(text: string): boolean {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) {
    return false;
  }
  return lines.every((line) => line.trim() === '' || line.includes(','));
}

/**
 * 列号转字母序号(0→A, 25→Z, 26→AA,同 Univer numberToABC)。
 */
export function numberToAbc(index: number): string {
  // 负数/非整数返回空串:负入参按 26 取模会产出控制字符。
  if (!Number.isInteger(index) || index < 0) {
    return '';
  }
  let n = index;
  let result = '';
  do {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return result;
}
