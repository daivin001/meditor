/**
 * index.ts — @meditor/mtable 公共出口
 */
export { createMtable } from './mtable';
export { parseCsv, stringifyCsv, numberToAbc } from './csv';
export { mixHexColor } from './theme';
/** 内置文案表(按 locale 索引;meditor 侧统一词典聚合经此读取)。 */
export { BUILTIN_MESSAGES } from './messages';
export type {
  MtableApi,
  MtableChangeSource,
  MtableMessages,
  MtableLocale,
  MtableOptions,
  MtableSelection,
} from './types';
export type { MtableModel } from './mtable-model';
