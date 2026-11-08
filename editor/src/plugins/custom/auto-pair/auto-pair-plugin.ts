/**
 * plugins/custom/auto-pair/auto-pair-plugin.ts — 自动配对括号/引号
 *
 * 类代码编辑器输入体验:
 * - 键入开括号:选区为空时插入成对符号并把光标移到中间;有选区时包裹选区文本;
 * - 键入闭括号:若光标后恰为同符号则跳过(overtype),不再重复插入;
 * - 行内代码/公式/代码块上下文不接管(保持逐字符输入)。
 *
 * 仅配对括号类符号(不配对引号):引号自动补全在中文/英文混排里误伤率高
 * (don't、引号开头引用等),保持保守。
 */
import { Plugin, PluginKey, TextSelection } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import { $prose } from '@milkdown/utils';

/**
 * 配对符号表(开 → 闭)。
 */
const PAIRS: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  '（': '）',
  '【': '】',
  '《': '》',
  '「': '」',
  '『': '』'
};

/**
 * 闭符号集合(overtype 判定用)。
 */
const CLOSERS = new Set(Object.values(PAIRS));

/**
 * 判断当前光标是否处于代码类上下文(代码块/行内代码 mark),此时不配对。
 */
const isInCodeContext = (view: EditorView): boolean => {
  const { $from } = view.state.selection;
  if ($from.parent.type.spec.code) {
    return true;
  }
  return $from.marks().some((mark) => mark.type.name === 'inline_code' || mark.type.name === 'inlineCode');
};

/**
 * 判断编辑器是否可编辑。
 */
const isEditable = (view: EditorView): boolean => {
  return typeof view.props.editable === 'function' ? view.props.editable(view.state) : view.editable;
};

/**
 * 创建自动配对插件(enabled=false 时不接管任何输入)。
 */
export const createAutoPairPlugin = (enabled: boolean): ReturnType<typeof $prose> =>
  $prose(
    () =>
      new Plugin({
        key: new PluginKey('zt-md-auto-pair'),
        props: {
          handleTextInput: (view, from, to, text) => {
            if (!enabled || !isEditable(view) || isInCodeContext(view)) {
              return false;
            }

            // 开括号:成对插入。
            const closer = PAIRS[text];
            if (closer !== undefined) {
              const transaction = view.state.tr;
              if (from === to) {
                // 空选区:插入成对符号,光标落在中间。
                transaction.insertText(`${text}${closer}`, from, to);
                transaction.setSelection(TextSelection.near(transaction.doc.resolve(from + 1), 1));
              } else {
                // 有选区:包裹选区文本,选区落在包裹后的内容上。
                transaction.insertText(closer, to, to);
                transaction.insertText(text, from, from);
                transaction.setSelection(
                  TextSelection.create(transaction.doc, from + 1, to + 1)
                );
              }
              view.dispatch(transaction);
              return true;
            }

            // 闭括号 overtype:光标后恰为同符号时仅移动光标。
            if (CLOSERS.has(text) && from === to) {
              const nextChar = view.state.doc.textBetween(from, from + 1, '\u0000');
              if (nextChar === text) {
                const transaction = view.state.tr;
                transaction.setSelection(TextSelection.near(transaction.doc.resolve(from + 1), 1));
                view.dispatch(transaction);
                return true;
              }
            }

            return false;
          }
        }
      })
  );
