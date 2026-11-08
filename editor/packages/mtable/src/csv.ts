/**
 * csv.ts — CSV 解析与序列化(mtable 行为预设)
 *
 * 单一实现收敛于 @meditor/csvkit(RFC 4180 状态机);本文件按 mtable 的历史
 * 行为固定预设并保持原 API 签名不变:
 * - 解析:可配置分隔符 + 短行补齐到矩形网格 + 空输入产出 [['' ]](网格合法起点);
 * - 序列化:可配置分隔符 + 含前导/尾随空白的字段也加引号包裹(保留精确空白)。
 */
import { numberToAbc, parseCsvMatrix, serializeCsvMatrix } from '@meditor/csvkit';

/**
 * 解析 CSV 文本为二维矩阵。
 * @param text 原始 CSV 文本
 * @param delimiter 字段分隔符(单字符,默认 ',')
 * @returns 二维字符串矩阵(至少一行;每行列数补齐到全表最大值)
 */
export function parseCsv(text: string, delimiter = ','): string[][] {
  return parseCsvMatrix(text, { delimiter, padColumns: true, emptyAsBlankRow: true });
}

/**
 * 序列化二维矩阵为 CSV 文本。
 * @param rows 二维字符串矩阵
 * @param delimiter 字段分隔符(单字符,默认 ',')
 * @returns CSV 文本(行间 CRLF,同 RFC 4180;末尾无换行符)
 */
export function stringifyCsv(rows: string[][], delimiter = ','): string {
  return serializeCsvMatrix(rows, { delimiter, quoteWhitespace: true });
}

/**
 * 列号转字母序号(0→A, 25→Z, 26→AA,同 Univer numberToABC)。
 */
export { numberToAbc };
