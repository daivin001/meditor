/**
 * plugins/custom/toolbar/toolbar-constants.ts — 工具栏内置配置
 *
 * 内置简洁(simple)/完整(full)两种模式的默认按钮集,
 * 以及命令 → 图标/分组/标题文案的映射表。
 */
import type { EditorI18nMessages, ToolbarCommand, ToolbarItem } from '../../../types/editor';

// 工具栏插件唯一标识。
export const TOOLBAR_ID = 'zt-md-toolbar';

/** 工具栏图标尺寸(px)。 */
export const TOOLBAR_ICON_SIZE = 16;

/** 工具栏图标线宽。 */
export const TOOLBAR_ICON_STROKE_WIDTH = 2;

/**
 * 命令 → 共享图标键名内置映射。
 */
export const TOOLBAR_COMMAND_ICON_MAP: Record<ToolbarCommand, string> = {
  blockMenu: 'plus',
  undo: 'undo',
  redo: 'redo',
  blockTransform: 'paragraph',
  paragraph: 'paragraph',
  heading1: 'heading1',
  heading2: 'heading2',
  heading3: 'heading3',
  heading4: 'heading4',
  heading5: 'heading5',
  heading6: 'heading6',
  strong: 'bold',
  em: 'italic',
  strike: 'strikethrough',
  underline: 'underline',
  subscript: 'subscript',
  superscript: 'superscript',
  inlineCode: 'inlineCode',
  link: 'link',
  bulletList: 'list',
  orderedList: 'orderedList',
  taskList: 'taskList',
  blockquote: 'quote',
  callout: 'quote',
  toggle: 'chevronDown',
  codeBlock: 'codeBlock',
  hr: 'hr',
  table: 'table',
  csvTable: 'table',
  database: 'database',
  image: 'image',
  video: 'video',
  audio: 'audio',
  bookmark: 'bookmark',
  embed: 'codeBlock',
  inlineMath: 'sigma',
  mathBlock: 'math',
  emoji: 'smile',
  clearFormat: 'clearFormat',
  search: 'search',
  ai: 'ai',
  outline: 'toc',
  layoutMode: 'layoutTemplate',
  sourceMode: 'sourceCode',
  translate: 'translate'
};

/**
 * 命令分组表:分组变化处渲染分隔线(视觉分组与参考工具栏对齐)。
 */
export const TOOLBAR_COMMAND_GROUP_MAP: Record<ToolbarCommand, string> = {
  blockMenu: 'insert-menu',
  undo: 'history',
  redo: 'history',
  blockTransform: 'block-type',
  paragraph: 'block-type',
  heading1: 'block-type',
  heading2: 'block-type',
  heading3: 'block-type',
  heading4: 'block-type',
  heading5: 'block-type',
  heading6: 'block-type',
  strong: 'text-style',
  em: 'text-style',
  strike: 'text-style',
  underline: 'text-style',
  subscript: 'text-style',
  superscript: 'text-style',
  inlineCode: 'text-style',
  link: 'text-style',
  bulletList: 'list',
  orderedList: 'list',
  taskList: 'list',
  blockquote: 'block',
  callout: 'block',
  toggle: 'block',
  codeBlock: 'block',
  hr: 'block',
  table: 'embed',
  csvTable: 'embed',
  database: 'embed',
  image: 'embed',
  video: 'embed',
  audio: 'embed',
  bookmark: 'embed',
  embed: 'embed',
  inlineMath: 'embed',
  mathBlock: 'embed',
  emoji: 'embed',
  clearFormat: 'tools',
  search: 'tools',
  ai: 'tools',
  outline: 'display',
  layoutMode: 'display',
  sourceMode: 'display',
  translate: 'translate'
};

/**
 * 构建 i18n 标题映射表。
 */
export const resolveToolbarCommandTitleMap = (messages: EditorI18nMessages): Record<ToolbarCommand, string> => ({
  blockMenu: messages.toolbarBlockMenuTitle,
  undo: messages.toolbarUndoTitle,
  redo: messages.toolbarRedoTitle,
  blockTransform: messages.toolbarBlockTransformParagraphLabel,
  paragraph: messages.toolbarBlockTransformParagraphLabel,
  heading1: messages.selectionTooltipTransformHeading1Label,
  heading2: messages.selectionTooltipTransformHeading2Label,
  heading3: messages.selectionTooltipTransformHeading3Label,
  heading4: messages.selectionTooltipTransformHeading4Label,
  heading5: messages.selectionTooltipTransformHeading5Label,
  heading6: messages.selectionTooltipTransformHeading6Label,
  strong: messages.selectionTooltipStrongTitle,
  em: messages.selectionTooltipEmTitle,
  strike: messages.selectionTooltipStrikeTitle,
  underline: messages.toolbarUnderlineTitle,
  subscript: messages.toolbarSubscriptTitle,
  superscript: messages.toolbarSuperscriptTitle,
  inlineCode: messages.selectionTooltipInlineCodeTitle,
  link: messages.selectionTooltipLinkTitle,
  bulletList: messages.toolbarBulletListTitle,
  orderedList: messages.toolbarOrderedListTitle,
  taskList: messages.toolbarTaskListTitle,
  blockquote: messages.toolbarBlockquoteTitle,
  codeBlock: messages.toolbarCodeBlockTitle,
  hr: messages.toolbarHrTitle,
  table: messages.toolbarTableTitle,
  callout: messages.toolbarCalloutTitle,
  toggle: messages.toolbarToggleTitle,
  csvTable: messages.toolbarCsvTableTitle,
  database: messages.toolbarDatabaseTitle,
  image: messages.toolbarImageTitle,
  video: messages.toolbarVideoTitle,
  audio: messages.toolbarAudioTitle,
  bookmark: messages.toolbarBookmarkTitle,
  embed: messages.toolbarEmbedTitle,
  inlineMath: messages.toolbarInlineMathTitle,
  mathBlock: messages.toolbarMathBlockTitle,
  emoji: messages.toolbarEmojiTitle,
  clearFormat: messages.toolbarClearFormatTitle,
  search: messages.toolbarSearchTitle,
  ai: messages.toolbarAiTitle,
  outline: messages.toolbarOutlineTitle,
  layoutMode: messages.toolbarLayoutModeTitle,
  sourceMode: messages.toolbarSourceModeTitle,
  translate: messages.toolbarTranslateTitle
});
/**
 * 完整模式默认按钮集(顺序即渲染顺序)。
 */
const FULL_MODE_COMMANDS: ToolbarCommand[] = [
  'undo',
  'redo',
  'blockTransform',
  'strong',
  'em',
  'strike',
  'underline',
  'subscript',
  'superscript',
  'inlineCode',
  'link',
  'bulletList',
  'orderedList',
  'taskList',
  'blockquote',
  'callout',
  'toggle',
  'codeBlock',
  'hr',
  'table',
  'csvTable',
  'database',
  'image',
  'video',
  'audio',
  'bookmark',
  'embed',
  'inlineMath',
  'mathBlock',
  'emoji',
  'clearFormat',
  'search',
  // AI 助手固定在大纲左侧:同为全文级面板开关。
  'ai',
  // 大纲面板固定在布局模式左侧:同为全文级显示开关,与编辑类命令以分隔线隔开。
  'outline',
  // 布局模式固定在源码左侧:同为全文级模式开关,与编辑类命令以分隔线隔开。
  'layoutMode',
  // 源码模式固定在翻译左侧:整篇源码编辑是全文级模式开关,与编辑类命令以分隔线隔开。
  'sourceMode',
  // 翻译固定最右:整篇翻译是全文级操作,与编辑类命令以分隔线隔开。
  'translate'
];

/**
 * 简洁模式默认按钮集(格式为主,与完整模式共享分组逻辑)。
 */
const SIMPLE_MODE_COMMANDS: ToolbarCommand[] = [
  'blockTransform',
  'strong',
  'em',
  'strike',
  'underline',
  'inlineCode',
  'bulletList',
  'orderedList',
  'taskList',
  'link',
  'translate'
];

/**
 * 响应式收起优先级(数组序 = 让位顺序:靠前先隐藏)。
 *
 * 宽度不足单行时从队首逐个收起,直到内容回到一行;收起顺序按"长尾能力先走、
 * 简洁模式集次之、宿主定制项最后"三段编排,与 SIMPLE_MODE_COMMANDS 对齐 ——
 * 中等宽度下退化结果即简洁工具栏,极窄时再从简洁集尾部继续让位。
 * 不在表内的命令(宿主自定义项)排在队尾:宿主显式配置的项不预设为低频。
 */
const TOOLBAR_COLLAPSE_PRIORITY: ToolbarCommand[] = [
  // 第一段:长尾数据/内嵌/媒体能力(完整模式才有,日常编辑少用)。
  'database',
  'csvTable',
  'embed',
  'bookmark',
  'audio',
  'video',
  'emoji',
  'mathBlock',
  'inlineMath',
  'callout',
  'toggle',
  'hr',
  'clearFormat',
  'ai',
  'outline',
  'layoutMode',
  'sourceMode',
  'codeBlock',
  'search',
  'table',
  'blockquote',
  'image',
  // 第二段:高频但有快捷键/斜杠输入兜底,简洁模式不含。
  'redo',
  'undo',
  // 第三段:简洁模式集的让位顺序(极窄时逐个退化;bulletList 最后)。
  'strike',
  'superscript',
  'subscript',
  'underline',
  'inlineCode',
  'taskList',
  'translate',
  'orderedList',
  'bulletList',
  // 第四段:仅宿主显式配置才出现的项(高阶标题先让位)。
  'heading6',
  'heading5',
  'heading4',
  'heading3',
  'blockMenu',
  'heading1',
  'heading2',
  'paragraph'
];

/**
 * 永不收起的核心按钮:块转换入口与三枚基础格式(简洁模式集的骨架),
 * 保证任意宽度下工具栏仍可完成最基本操作。
 */
const TOOLBAR_COLLAPSE_KEEP: ReadonlySet<ToolbarCommand> = new Set([
  'blockTransform',
  'strong',
  'em',
  'link'
]);

// 收起优先级 → 顺位索引(未列入的自定义命令排在第四段之后、核心按钮之前)。
const COLLAPSE_PRIORITY_RANK: ReadonlyMap<ToolbarCommand, number> = new Map(
  TOOLBAR_COLLAPSE_PRIORITY.map((command, index) => [command, index])
);

/**
 * 解析命令的收起顺位(数值越小越先隐藏;核心按钮返回 Infinity 永不隐藏)。
 */
export const resolveToolbarCollapseRank = (command: ToolbarCommand): number => {
  if (TOOLBAR_COLLAPSE_KEEP.has(command)) {
    return Number.POSITIVE_INFINITY;
  }
  return COLLAPSE_PRIORITY_RANK.get(command) ?? TOOLBAR_COLLAPSE_PRIORITY.length;
};

/**
 * 按命令集构建工具栏项(图标/标题走内置映射,title 可被外部配置覆盖)。
 */
const resolveItemsByCommands = (commands: ToolbarCommand[], messages: EditorI18nMessages): ToolbarItem[] => {
  const titleMap = resolveToolbarCommandTitleMap(messages);
  return commands.map((command) => ({
    command,
    icon: TOOLBAR_COMMAND_ICON_MAP[command],
    title: titleMap[command]
  }));
};

/**
 * 解析最终工具栏项:
 * items 显式指定时原样使用;否则按 mode 取内置集(标题用 i18n 文案填充)。
 * exclude 对两种来源同样生效(先取集,再剔除),供宿主去掉个别命令而不必复刻默认列表。
 */
export const resolveToolbarItems = (
  items: ToolbarItem[] | undefined,
  mode: 'simple' | 'full' | undefined,
  messages: EditorI18nMessages,
  exclude?: ReadonlySet<ToolbarCommand>
): ToolbarItem[] => {
  const resolved = items && items.length > 0
    ? items
    : resolveItemsByCommands(mode === 'simple' ? SIMPLE_MODE_COMMANDS : FULL_MODE_COMMANDS, messages);
  if (!exclude || exclude.size === 0) {
    return resolved;
  }
  return resolved.filter((item) => !exclude.has(item.command));
};
