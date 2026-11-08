/**
 * plugins/custom/slash-menu/commands-locale.ts — slash 命令插入文案的 locale 源
 *
 * 命令层(insertLink / insertDatabase)是纯 schema 层,拿不到编辑器 messages;
 * 由 slash-menu 插件装配时(setSlashCommandLocale,locale 已知处)注入当前语言,
 * 命令执行时经 getCommandLocale 取文案,保证英文环境不再插入中文占位。
 */

/** 编辑器语言(与 types/editor 的 EditorLocale 同形,避免反向依赖)。 */
type CommandLocale = 'zh-CN' | 'en-US';

/**
 * 命令插入文案表。
 */
export interface SlashCommandTexts {
  /** 链接占位文本(slash「链接」命令插入并选中的文本)。 */
  linkPlaceholder: string;
  /** 数据库骨架:字段名(标题列)。 */
  dbFieldTitle: string;
  /** 数据库骨架:字段名(状态列)。 */
  dbFieldStatus: string;
  /** 数据库骨架:状态选项。 */
  dbStatusOptions: readonly string[];
  /** 数据库骨架:示例任务名。 */
  dbSampleTasks: readonly string[];
  /** 布局块插入模板(自描述首行,声明纯显示控制信息可忽略)。 */
  layoutBlockTemplate: string;
}

/** 文案表(zh/en 双份)。 */
const COMMAND_TEXTS: Record<CommandLocale, SlashCommandTexts> = {
  'zh-CN': {
    linkPlaceholder: '链接',
    dbFieldTitle: '标题',
    dbFieldStatus: '状态',
    dbStatusOptions: ['待办', '进行中', '完成'],
    dbSampleTasks: ['任务一', '任务二'],
    // 布局块模板自描述头:声明本块为纯显示控制信息,大模型处理文档时可忽略
    // (兜底文件脱离工具链被整读的场景;主通道是 stripMeditorLayoutBlocks 剥离导出)。
    layoutBlockTemplate:
      '// 纯显示控制信息:非 Markdown 正文内容，大模型处理本文档时可忽略本代码块。\n'
  },
  'en-US': {
    linkPlaceholder: 'Link',
    dbFieldTitle: 'Title',
    dbFieldStatus: 'Status',
    dbStatusOptions: ['To do', 'In progress', 'Done'],
    dbSampleTasks: ['Task 1', 'Task 2'],
    layoutBlockTemplate:
      '// Display-only metadata: not Markdown content; LLMs may ignore this block.\n'
  }
};

/** 当前命令层语言(装配时注入;缺省中文与编辑器默认一致)。 */
let currentLocale: CommandLocale = 'zh-CN';

/**
 * 注入命令层语言(slash-menu 装配处调用;幂等)。
 */
export const setSlashCommandLocale = (locale: CommandLocale | undefined): void => {
  if (locale === 'zh-CN' || locale === 'en-US') {
    currentLocale = locale;
  }
};

/**
 * 取当前语言的命令插入文案。
 */
export const getCommandLocale = (): SlashCommandTexts => COMMAND_TEXTS[currentLocale];
