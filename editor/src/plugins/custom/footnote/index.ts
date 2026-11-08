/**
 * plugins/custom/footnote — 脚注(引用标记 + 文末定义块)
 */
export {
  FOOTNOTE_REFERENCE_NODE_NAME,
  FOOTNOTE_DEFINITION_NODE_NAME,
  remarkFootnotePlugin,
  footnoteReferenceSchema,
  footnoteDefinitionSchema,
  footnoteClickPlugin,
  nextFootnoteLabel,
  insertFootnote,
  footnote
} from './footnote-plugin';
