/**
 * plugins/custom/chinese-symbols/chinese-symbols-input-rule.ts — 中文符号快捷输入规则
 *
 * 对应中文输入法下同键输出的符号,补齐英文 markdown 快捷文本的中文变体
 * (实现均与内置规则同构,仅替换触发符号):
 * - 有序列表:`1。 ` / `1、 `(句号/顿号键,对应 `1. `)
 * - 引用块:`》 `(shift+句号键,对应 `> `)
 * - 删除线:`～～文字～～`(波浪键,对应 `~~文字~~`;要求双波浪避免与"3～5个"误触)
 */
import type { MilkdownPlugin } from '@milkdown/ctx';
import { blockquoteSchema, orderedListSchema } from '@milkdown/preset-commonmark';
import { strikethroughSchema } from '@milkdown/preset-gfm';
import { markRule } from '@milkdown/prose';
import { wrappingInputRule } from '@milkdown/prose/inputrules';
import { $inputRule } from '@milkdown/utils';

/**
 * 有序列表中文变体:`1。 ` / `1、 `(序号同内置规则写入 order 属性)。
 */
const orderedListFullwidthInputRule = $inputRule((ctx) =>
  wrappingInputRule(
    /^\s*(\d+)[。、]\s$/,
    orderedListSchema.type(ctx),
    (match) => ({ order: Number(match[1]) }),
    (match, node) => node.childCount + node.attrs.order === Number(match[1])
  )
);

/**
 * 引用块中文变体:`》 `。
 */
const blockquoteFullwidthInputRule = $inputRule((ctx) =>
  wrappingInputRule(/^\s*》\s$/, blockquoteSchema.type(ctx))
);

/**
 * 删除线中文变体:`～～文字～～`(双波浪,单波浪"3～5个"不触发)。
 */
const strikethroughFullwidthInputRule = $inputRule((ctx) =>
  markRule(/(?<![\w:/])(～{2})(.+?)\1(?!\w|\/)$/, strikethroughSchema.type(ctx))
);

/**
 * 中文符号快捷输入插件组。
 *
 * @param enabled 是否启用(默认 true;false 时返回空数组不注册任何规则)。
 */
export const createChineseSymbolsInputRulePlugins = (enabled: boolean): MilkdownPlugin[] => {
  if (!enabled) {
    return [];
  }

  return [
    orderedListFullwidthInputRule,
    blockquoteFullwidthInputRule,
    strikethroughFullwidthInputRule
  ];
};
