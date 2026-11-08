/**
 * plugins/custom/list/task-list-input-rule.ts — 任务列表快捷输入规则
 *
 * 内置 gfm 的 wrapInTaskListInputRule 仅匹配 `[ ]`/`[x]` + 尾随空格(括号内必须有空格),
 * 本插件补充更宽松的变体(与内置规则同语义:在既有 list_item 上下文内把当前项转任务项):
 * - `[]` / `[x]` / `[X]` + 空格:无空格英文方括号
 * - `【 】` / `【x】` / `【X】` + 空格:中文方括号(allowFullwidthBrackets=false 时关闭)
 * 内置规则先命中 `[ ] `,本插件只接管它不匹配的输入,互不冲突。
 */
import { InputRule } from '@milkdown/prose/inputrules';
import type { EditorState, Transaction } from '@milkdown/prose/state';
import type { MilkdownPlugin } from '@milkdown/ctx';
import { $inputRule } from '@milkdown/utils';

/** 任务列表项节点名。 */
const TASK_LIST_ITEM_NODE_NAME = 'list_item';

/**
 * 任务项匹配变换签名(与 InputRule 构造器的 handler 形参一致)。
 */
type TaskItemHandler = (state: EditorState, match: RegExpMatchArray, start: number, end: number) => Transaction | null;

/**
 * 任务项匹配变换(与内置 wrapInTaskListInputRule 同构):
 * 自光标向上找 list_item 祖先,删除匹配文本并把该项转为勾选/未勾选任务项。
 *
 * @param state 编辑器状态。
 * @param match 正则匹配结果(组 1 = 勾选标记:空格 / x / X)。
 * @param start 匹配起始位置。
 * @param end 匹配结束位置。
 * @returns 成功返回事务;无列表项祖先或已是任务项时返回 null(交回默认输入)。
 */
const applyTaskItemTransform: TaskItemHandler = (
  state,
  match,
  start,
  end
): Transaction | null => {
  // 光标所在位置解析。
  const pos = state.doc.resolve(start);
  // 自当前深度向上找 list_item 祖先。
  let depth = 0;
  let node = pos.node(depth);
  while (node && node.type.name !== TASK_LIST_ITEM_NODE_NAME) {
    depth -= 1;
    node = pos.node(depth);
  }
  // 无列表项祖先,或该项已是任务项(带 checked 属性)时不动。
  if (!node || node.type.name !== TASK_LIST_ITEM_NODE_NAME || node.attrs.checked != null) {
    return null;
  }

  // 勾选标记(x/X 为勾选)。
  const mark = String(match[1] ?? '');
  const checked = mark.toLowerCase() === 'x';
  // 列表项起始位置。
  const itemPos = pos.before(depth);
  const tr = state.tr;
  tr.deleteRange(start, end).setNodeMarkup(itemPos, undefined, {
    ...node.attrs,
    checked
  });
  return tr;
};

/**
 * 英文无空格变体:[] / [x] / [X] + 空格。
 */
const taskItemAsciiInputRule = $inputRule(
  // (\s|[xX])? 空组 → [] / [x] / [X];与内置 gfm 规则(要求括号内空格)完全不相交。
  () => new InputRule(/^\[([xX])?\] $/, applyTaskItemTransform)
);

/**
 * 中文方括号变体:【 】/【x】/【X】 + 空格。
 */
const taskItemFullwidthInputRule = $inputRule(
  () => new InputRule(/^【([xX])?】 $/, applyTaskItemTransform)
);

/**
 * 任务列表快捷输入插件组。
 *
 * @param allowFullwidthBrackets 是否启用中文方括号变体(默认 true)。
 */
export const createTaskListInputRulePlugins = (allowFullwidthBrackets: boolean): MilkdownPlugin[] => {
  // 中文变体关闭时只挂英文规则。
  return allowFullwidthBrackets
    ? [taskItemAsciiInputRule, taskItemFullwidthInputRule]
    : [taskItemAsciiInputRule];
};
