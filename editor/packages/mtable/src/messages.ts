/**
 * messages.ts — mtable 内置文案表(按 locale 索引)
 *
 * 从 mtable.ts 拆出的纯数据;用户 messages 选项按 key 覆盖内置值。
 */

import type { MtableLocale, MtableMessages } from './types';

/** 内置文案表。 */
export const BUILTIN_MESSAGES: Record<MtableLocale, MtableMessages> = {
  'zh-CN': {
    insertRow: '插入行',
    deleteRow: '删除行',
    insertColumn: '插入列',
    deleteColumn: '删除列',
    clearContents: '清空内容',
    reset: '重置',
    filterTab: '筛选',
    sortTab: '排序',
    sortAsc: '升序',
    sortDesc: '降序',
    selectAll: '全选',
    searchPlaceholder: '使用空格分隔关键字',
    blankValue: '(空白)',
    filterOnly: '仅筛选',
    cancel: '取消',
    confirm: '确认',
    fullscreenTitle: '表格',
    fullscreen: '全屏编辑表格',
    close: '关闭',
    freezeRow: '冻结至第 {0} 行',
    freezeCol: '冻结至第 {0} 列',
    unfreezeRow: '取消冻结行',
    unfreezeCol: '取消冻结列'
  },
  'en-US': {
    insertRow: 'Insert row',
    deleteRow: 'Delete row',
    insertColumn: 'Insert column',
    deleteColumn: 'Delete column',
    clearContents: 'Clear contents',
    reset: 'Reset',
    filterTab: 'Filter',
    sortTab: 'Sort',
    sortAsc: 'Sort A → Z',
    sortDesc: 'Sort Z → A',
    selectAll: 'Select all',
    searchPlaceholder: 'Separate keywords with spaces',
    blankValue: '(Blanks)',
    filterOnly: 'Filter only',
    cancel: 'Cancel',
    confirm: 'OK',
    fullscreenTitle: 'Table',
    fullscreen: 'Open table fullscreen',
    close: 'Close',
    freezeRow: 'Freeze to row {0}',
    freezeCol: 'Freeze to column {0}',
    unfreezeRow: 'Unfreeze rows',
    unfreezeCol: 'Unfreeze columns'
  }
};
