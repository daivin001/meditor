/**
 * plugins/custom/smart-punctuation/smart-punctuation-plugin.ts — 智能标点(SmartyPants)
 *
 * Typora 同款键入时替换(仅纯文本上下文,代码/公式内不生效):
 * - 直双/单引号按邻位转成弯引号(空格/行首后为开引号,否则闭引号);
 * - `--` → –(en dash),`–-` → —(em dash,即连打三横线得到长破折号);
 * - `...` → …(省略号)。
 * 替换只发生在输入时刻的纯文本上,文档语义为普通文本,序列化无损。
 */
import { Plugin, PluginKey } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import { $prose } from '@milkdown/utils';

/** 插件唯一键。 */
const SMART_PUNCTUATION_PLUGIN_KEY = new PluginKey('zt-md-smart-punctuation');

/** 开引号前驱集合(其后键入引号视为开引号)。 */
const OPENING_PRECEDERS = /[\s(\[{'"“‘—–-]$/;

/** 判断光标前驱文本是否允许键入替换(选区必须为空,替换只发生在纯打字流)。 */
const resolvePreviousChar = (view: EditorView): string | null => {
  const { state } = view;
  const { from } = state.selection;
  if (from === 0) {
    return null;
  }
  return state.doc.textBetween(from - 1, from, '\n', '\n');
};

/** 判断位置是否处于代码/公式上下文(行内代码 mark、代码块、公式节点)。 */
const isCodeLikeContext = (view: EditorView): boolean => {
  const { state } = view;
  const { from } = state.selection;
  const $from = state.selection.$from;
  // 行内代码 mark。
  const codeMark = state.schema.marks.code;
  if (codeMark && state.doc.rangeHasMark(from, from, codeMark)) {
    return true;
  }
  // 祖先链上的代码块/公式节点。
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.spec.code || node.type.name === 'math_inline' || node.type.name === 'math_block') {
      return true;
    }
  }
  return false;
};

/**
 * 计算引号替换(返回替换文本;不需要替换返回 null)。
 */
const resolveQuoteReplacement = (typed: '"' | "'", previous: string | null): string => {
  const isOpening = previous === null || previous === '\n' || OPENING_PRECEDERS.test(previous);
  if (typed === '"') {
    return isOpening ? '“' : '”';
  }
  return isOpening ? '‘' : '’';
};

/**
 * 计算连字符/点号替换(返回 [替换起点回退字符数, 替换文本];不替换返回 null)。
 */
const resolveDashOrEllipsisReplacement = (
  typed: '-' | '.',
  previous: string | null
): { backspace: number; text: string } | null => {
  if (typed === '-') {
    // 前一字符是 –:补一个 - 组成 em dash;前一字符是 -:两个 -- 替换为 –。
    if (previous === '–') {
      return { backspace: 1, text: '—' };
    }
    if (previous === '-') {
      return { backspace: 1, text: '–' };
    }
    return null;
  }
  // 三个点 → 省略号。
  if (typed === '.' && previous === '.') {
    return { backspace: 2, text: '…' };
  }
  return null;
};

/**
 * 创建智能标点插件(handleTextInput 拦截替换;对撤销栈友好:一次事务一次替换)。
 */
export const createSmartPunctuationPlugin = () =>
  $prose(
    () =>
      new Plugin({
        key: SMART_PUNCTUATION_PLUGIN_KEY,
        props: {
          handleTextInput: (view, from, to, text) => {
            // 复合输入/多字粘贴不走替换(只处理单字符打字流)。
            if (text.length !== 1) {
              return false;
            }
            if (!(text === '"' || text === "'" || text === '-' || text === '.')) {
              return false;
            }
            if (view.composing || from !== to) {
              return false;
            }
            if (isCodeLikeContext(view)) {
              return false;
            }

            const previous = resolvePreviousChar(view);
            // 引号替换。
            if (text === '"' || text === "'") {
              const replacement = resolveQuoteReplacement(text, previous);
              view.dispatch(view.state.tr.insertText(replacement, from, to));
              return true;
            }
            // 连字符/省略号替换(依赖前一字符,可能回退多键)。
            const dashOrEllipsis = resolveDashOrEllipsisReplacement(text, previous);
            if (dashOrEllipsis) {
              const start = Math.max(0, from - dashOrEllipsis.backspace);
              view.dispatch(view.state.tr.insertText(dashOrEllipsis.text, start, to));
              return true;
            }
            return false;
          },
        },
      })
  );
