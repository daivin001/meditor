/**
 * values.ts — 筛选/排序的值判定、比较与收集纯函数
 *
 * 从 mtable.ts 拆出;不依赖实例运行态,仅操作文本与模型快照。
 * 注意 isNumericCellText 与 isNumericText 判定条件不同(前者多一个
 * Number.isFinite 检查),分别对应渲染对齐与排序分组两处历史行为,不可合并。
 */

import type { MtableModel } from './mtable-model';

/** 数字文本判定(渲染对齐用:非空 + 可转有限数字 + 数字格式正则)。 */
export const isNumericCellText = (text: string): boolean =>
  text.length > 0 && Number.isFinite(Number(text)) && /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(text.trim());

/** 数字文本判定(排序分组用:数字 < 文本,空白排最后)。 */
export const isNumericText = (text: string): boolean =>
  /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(text.trim());

/**
 * 单元格值比较器(升序):数字 < 文本,空白排最后,文本按 zh-CN 字典序。
 * 与 Excel/Univer 的混合排序语义一致。
 */
export const compareValues = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a === '') return 1;
  if (b === '') return -1;
  const na = isNumericText(a);
  const nb = isNumericText(b);
  if (na && nb) return Number(a) - Number(b);
  if (na) return -1;
  if (nb) return 1;
  return a.localeCompare(b, 'zh-CN');
};

/** 收集某列数据行的去重值及出现次数(升序,空白最后;筛选面板列表用)。 */
export const collectColumnValues = (
  model: MtableModel,
  dataRows: number,
  col: number
): Array<{ value: string; count: number }> => {
  const counts = new Map<string, number>();
  for (let r = 0; r < dataRows; r += 1) {
    const value = model.getCell(r, col);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => compareValues(a[0], b[0]))
    .map(([value, count]) => ({ value, count }));
};
