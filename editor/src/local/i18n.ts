/**
 * local/i18n.ts — meditor 统一文案查表与三方词典聚合
 *
 * - 唯一查表实现:纯 `Record<locale, 词典>` 查表 + 展开覆盖合并,不含任何
 *   运行时 i18n 框架(历史上曾引入第三方 i18n 运行时却只做静态词典查询,
 *   现已移除该依赖);
 * - 三方词典聚合:@meditor/mtable 与 @meditor/jsonview 作为独立发布包在各自
 *   包内保留零依赖本地查表(对外 API 不变),此处 re-export 其内置词典,
 *   使 meditor 成为三方词典的单一聚合点(宿主只依赖 meditor 即可取全量词典,
 *   构建期经 vite alias 连同源码一并打进 meditor 产物,无新运行时依赖);
 * - 协作面板(版本历史/评论/状态徽标)文案同样收敛到本词典(见 zh-CN/en-US
 *   的 historyPanelXxx、commentsPanelXxx、collabStatusXxx 键)。
 */
import type { EditorI18nMessages, EditorLocale } from '../types/editor';
import { enUSMessages } from './en-US';
import { zhCNMessages } from './zh-CN';

/**
 * 编辑器默认语言。
 */
export const DEFAULT_EDITOR_LOCALE: EditorLocale = 'zh-CN';

/**
 * 内置语言包表(按 locale 索引)。
 */
const EDITOR_MESSAGE_TABLES: Record<EditorLocale, EditorI18nMessages> = {
  'zh-CN': zhCNMessages,
  'en-US': enUSMessages,
};

/**
 * 按语言取内置语言包(未知 locale 回退默认语言;纯查表)。
 */
export const getEditorMessageTable = (
  locale: EditorLocale = DEFAULT_EDITOR_LOCALE,
): EditorI18nMessages => {
  return EDITOR_MESSAGE_TABLES[locale] ?? EDITOR_MESSAGE_TABLES[DEFAULT_EDITOR_LOCALE];
};

/**
 * 合并编辑器语言包与外部覆盖文案。
 *
 * @param locale 语言(默认 zh-CN)
 * @param messages 覆盖项(浅合并;未提供的键用内置值)
 * @param placeholder 占位文案(单独覆盖 resolved.placeholder)
 */
export const resolveEditorMessages = (
  locale: EditorLocale = DEFAULT_EDITOR_LOCALE,
  messages?: Partial<EditorI18nMessages>,
  placeholder?: string,
): EditorI18nMessages => {
  /** 当前语言默认文案。 */
  const resolvedMessages: EditorI18nMessages = {
    ...getEditorMessageTable(locale),
    ...messages,
  };

  if (placeholder !== undefined) {
    resolvedMessages.placeholder = placeholder;
  }

  return resolvedMessages;
};

// --- 三方词典聚合(meditor 单一来源,见文件头说明) ---

/**
 * mtable 内置文案表(源:@meditor/mtable,包内自带零依赖查表)。
 */
export { BUILTIN_MESSAGES as BUILTIN_MTABLE_MESSAGES } from '@meditor/mtable';

/**
 * jsonview 内置文案表与字段类型映射(源:@meditor/jsonview,包内自带零依赖查表)。
 */
export { BUILTIN_JSONVIEW_MESSAGES, FIELD_TYPE_MESSAGE_KEYS } from '@meditor/jsonview';
