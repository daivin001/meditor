/**
 * plugins/custom/inline-ext/inline-ext-input-rules.ts — Typora 风行内语法输入规则与快捷键
 *
 * - `==文字==` → 默认色高亮(与 color-marks 的 <mark> 高亮语义一致)
 * - `^文字^`   → 上标
 * - Mod-U      → 下划线开关
 *
 * 注:`~文字~` 下标不设输入规则 —— GFM(remark-gfm)把单波浪线解析为删除线,
 * 输入规则永不可达;下标走工具栏/选区菜单(<sub> 行内 HTML 往返)。
 *
 * 输入规则以 `$` 锚定行尾,在光标补全闭合符号时立即生效(所见即所得)。
 */
import { InputRule, inputRules } from '@milkdown/prose/inputrules';
import type { EditorState, Transaction } from '@milkdown/prose/state';
import type { MarkType } from '@milkdown/prose/model';
import { keymap } from '@milkdown/prose/keymap';
import { $prose } from '@milkdown/utils';
import type { MeditorMarkdownFeatures } from '../../../types/editor';
import { DEFAULT_HIGHLIGHT_COLOR } from '../color/color-marks';

/**
 * mark 名集合(schema 未装配对应 mark 时规则静默放行默认输入)。
 */
const HIGHLIGHT_MARK_NAME = 'highlight';
const SUPERSCRIPT_MARK_NAME = 'superscript';
const UNDERLINE_MARK_NAME = 'underline';

/**
 * 构造"包裹符号 → mark"输入规则的通用变换:
 * 删除匹配区间、回写内容文本并对其加 mark。
 */
const createWrapMarkHandler =
  (markName: string, attrs?: Record<string, unknown>) =>
  (state: EditorState, match: RegExpMatchArray, start: number, end: number): Transaction | null => {
    // 目标 mark 类型。
    const markType = (state.schema.marks as Record<string, MarkType | undefined>)[markName];
    if (!markType) {
      return null;
    }
    // 匹配内容(去包裹符号)。
    const content = String(match[1] ?? '');
    if (!content) {
      return null;
    }

    const transaction = state.tr;
    transaction.deleteRange(start, end);
    transaction.insertText(content, start);
    transaction.addMark(start, start + content.length, markType.create(attrs));
    return transaction;
  };

/**
 * 按语法开关组装行内扩展输入规则插件组(关闭的语法不注册规则,文本原样输入;
 * Mod-U 下划线开关不受语法开关影响,始终可用)。
 */
export const createInlineExtInputRulePlugins = (
  features?: MeditorMarkdownFeatures
): unknown[] => {
  const rules: InputRule[] = [];
  if (features?.highlight ?? true) {
    rules.push(
      new InputRule(
        /==([^=\s][^=]*?[^=\s]|[^=\s])==$/,
        createWrapMarkHandler(HIGHLIGHT_MARK_NAME, { color: DEFAULT_HIGHLIGHT_COLOR })
      )
    );
  }
  if (features?.superscript ?? true) {
    rules.push(
      new InputRule(
        /\^([^\^\s][^^]*?[^\^\s]|[^\^\s])\^$/,
        createWrapMarkHandler(SUPERSCRIPT_MARK_NAME)
      )
    );
  }
  return [
    $prose(() => inputRules({ rules })),
    // Mod-U:下划线开关(与工具栏/选区菜单同语义)。
    $prose(() =>
      keymap({
        'Mod-u': (state, dispatch) => {
          const markType = (state.schema.marks as Record<string, MarkType | undefined>)[UNDERLINE_MARK_NAME];
          if (!markType) {
            return false;
          }
          const { from, to } = state.selection;
          if (state.doc.rangeHasMark(from, to, markType)) {
            dispatch?.(state.tr.removeMark(from, to, markType));
          } else {
            dispatch?.(state.tr.addMark(from, to, markType.create()));
          }
          return true;
        }
      })
    )
  ].flat();
};

/**
 * 行内扩展输入规则插件组(全部语法开启;既有用法兼容入口)。
 */
export const inlineExtInputRulePlugins = createInlineExtInputRulePlugins();
