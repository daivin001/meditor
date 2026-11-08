/**
 * plugins/custom/inline-ext — 行内扩展格式(下划线/上下标/Typora 风语法)
 */
export {
  MEDITOR_INLINE_TAG_MDAST_TYPE,
  UNDERLINE_MARK_NAME,
  SUBSCRIPT_MARK_NAME,
  SUPERSCRIPT_MARK_NAME,
  inlineExtMarks,
  createInlineExtMarks,
  remarkInlineExtPlugin,
  underlineMarkSchema,
  subscriptMarkSchema,
  superscriptMarkSchema,
  toggleInlineExtMark,
  isInlineExtMarkActive
} from './inline-ext-marks';
export { createInlineExtInputRulePlugins, inlineExtInputRulePlugins } from './inline-ext-input-rules';
