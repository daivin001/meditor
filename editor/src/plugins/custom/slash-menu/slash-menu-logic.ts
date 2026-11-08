/**
 * plugins/custom/slash-menu/slash-menu-logic.ts — slash 菜单纯逻辑
 *
 * 1:1 翻译自 zt-react-milkdown/src/plugins/custom/slash-menu/slash-menu-logic.ts
 */
import type { EditorLocale, SlashMenuConfig, SlashMenuItem } from '../../../types/editor';
import { matchesSlashQuery } from './slash-menu-pinyin';

/**
 * slash 菜单当前状态。
 */
export interface SlashMenuState {
  /** 当前过滤后的菜单项。 */
  visibleItems: SlashMenuItem[];
  /** 当前是否应显示菜单。 */
  shouldShow: boolean;
}

/**
 * 判断当前编辑器是否可编辑。
 */
export const isEditorViewEditable = (view: unknown): boolean => {
  // 当前视图对象。
  const v = view as { props?: { editable?: (s: unknown) => boolean }; editable?: boolean } | null;
  if (typeof v?.props?.editable === 'function') {
    return v.props.editable(undefined);
  }

  return Boolean(v?.editable);
};

/**
 * 中文默认 slash 菜单项。
 */
const DEFAULT_SLASH_MENU_ITEMS_ZH_CN: SlashMenuItem[] = [
  { id: 'heading-1', label: '标题 1', group: '', icon: 'heading1', command: 'heading1' },
  { id: 'heading-2', label: '标题 2', group: '', icon: 'heading2', command: 'heading2' },
  { id: 'heading-3', label: '标题 3', group: '', icon: 'heading3', command: 'heading3' },
  { id: 'heading-4', label: '标题 4', group: '', icon: 'heading4', command: 'heading4' },
  { id: 'heading-5', label: '标题 5', group: '', icon: 'heading5', command: 'heading5' },
  { id: 'heading-6', label: '标题 6', group: '', icon: 'heading6', command: 'heading6' },
  { id: 'bullet-list', label: '无序列表', group: '列表', icon: 'list', command: 'bulletList' },
  { id: 'ordered-list', label: '有序列表', group: '列表', icon: 'orderedList', command: 'orderedList' },
  { id: 'task-list', label: '任务列表', group: '列表', icon: 'taskList', command: 'taskList' },
  { id: 'blockquote', label: '引用块', group: '插入', icon: 'quote', command: 'blockquote' },
  { id: 'callout', label: '标注块', group: '插入', icon: 'quote', command: 'callout' },
  { id: 'toggle', label: '折叠块', group: '插入', icon: 'chevronDown', command: 'toggle' },
  { id: 'inline-code', label: '行内代码', group: '插入', icon: 'inlineCode', command: 'inlineCode' },
  { id: 'code-block', label: '代码块', group: '插入', icon: 'codeBlock', command: 'codeBlock' },
  { id: 'link', label: '链接', group: '插入', icon: 'link', command: 'link' },
  { id: 'table', label: '普通表格', group: '插入', icon: 'table', command: 'table' },
  { id: 'csv-table', label: 'CSV数据', group: '插入', icon: 'table', command: 'csvTable' },
  { id: 'database', label: 'Json数据', group: '插入', icon: 'table', command: 'database' },
  { id: 'layout-block', label: '布局块', group: '插入', icon: 'layoutTemplate', command: 'layoutBlock' },
  { id: 'video', label: '视频', group: '媒体', icon: 'image', command: 'video' },
  { id: 'audio', label: '音频', group: '媒体', icon: 'image', command: 'audio' },
  { id: 'bookmark', label: '网页书签', group: '媒体', icon: 'link', command: 'bookmark' },
  { id: 'embed', label: '第三方内嵌', group: '媒体', icon: 'codeBlock', command: 'embed' },
  { id: 'inline-math', label: '行内公式', group: '公式', icon: 'sigma', command: 'inlineMath' },
  { id: 'math-block', label: '公式块', group: '公式', icon: 'math', command: 'mathBlock' },
  { id: 'mermaid', label: 'Mermaid 图表', group: '插入', icon: 'codeBlock', command: 'mermaid' },
  { id: 'toc', label: '目录', group: '插入', icon: 'toc', command: 'toc' },
  { id: 'footnote', label: '脚注', group: '插入', icon: 'footnote', command: 'footnote' },
  { id: 'image', label: '图片', group: '媒体', icon: 'image', command: 'image' },
  { id: 'emoji', label: 'Emoji', group: '媒体', icon: 'smile', command: 'emoji' }
];

/**
 * 英文默认 slash 菜单项。
 */
const DEFAULT_SLASH_MENU_ITEMS_EN_US: SlashMenuItem[] = [
  { id: 'heading-1', label: 'Heading 1', group: '', icon: 'heading1', command: 'heading1' },
  { id: 'heading-2', label: 'Heading 2', group: '', icon: 'heading2', command: 'heading2' },
  { id: 'heading-3', label: 'Heading 3', group: '', icon: 'heading3', command: 'heading3' },
  { id: 'heading-4', label: 'Heading 4', group: '', icon: 'heading4', command: 'heading4' },
  { id: 'heading-5', label: 'Heading 5', group: '', icon: 'heading5', command: 'heading5' },
  { id: 'heading-6', label: 'Heading 6', group: '', icon: 'heading6', command: 'heading6' },
  { id: 'bullet-list', label: 'Bullet list', group: 'Lists', icon: 'list', command: 'bulletList' },
  { id: 'ordered-list', label: 'Ordered list', group: 'Lists', icon: 'orderedList', command: 'orderedList' },
  { id: 'task-list', label: 'Task list', group: 'Lists', icon: 'taskList', command: 'taskList' },
  { id: 'blockquote', label: 'Blockquote', group: 'Insert', icon: 'quote', command: 'blockquote' },
  { id: 'callout', label: 'Callout', group: 'Insert', icon: 'quote', command: 'callout' },
  { id: 'toggle', label: 'Toggle', group: 'Insert', icon: 'chevronDown', command: 'toggle' },
  { id: 'inline-code', label: 'Inline code', group: 'Insert', icon: 'inlineCode', command: 'inlineCode' },
  { id: 'code-block', label: 'Code block', group: 'Insert', icon: 'codeBlock', command: 'codeBlock' },
  { id: 'link', label: 'Link', group: 'Insert', icon: 'link', command: 'link' },
  { id: 'table', label: 'Table', group: 'Insert', icon: 'table', command: 'table' },
  { id: 'csv-table', label: 'CSV table', group: 'Insert', icon: 'table', command: 'csvTable' },
  { id: 'database', label: 'Database', group: 'Insert', icon: 'table', command: 'database' },
  { id: 'layout-block', label: 'Layout block', group: 'Insert', icon: 'layoutTemplate', command: 'layoutBlock' },
  { id: 'video', label: 'Video', group: 'Media', icon: 'image', command: 'video' },
  { id: 'audio', label: 'Audio', group: 'Media', icon: 'image', command: 'audio' },
  { id: 'bookmark', label: 'Bookmark', group: 'Media', icon: 'link', command: 'bookmark' },
  { id: 'embed', label: 'Embed', group: 'Media', icon: 'codeBlock', command: 'embed' },
  { id: 'inline-math', label: 'Inline math', group: 'Math', icon: 'sigma', command: 'inlineMath' },
  { id: 'math-block', label: 'Math block', group: 'Math', icon: 'math', command: 'mathBlock' },
  { id: 'mermaid', label: 'Mermaid diagram', group: 'Insert', icon: 'codeBlock', command: 'mermaid' },
  { id: 'toc', label: 'Table of Contents', group: 'Insert', icon: 'toc', command: 'toc' },
  { id: 'footnote', label: 'Footnote', group: 'Insert', icon: 'footnote', command: 'footnote' },
  { id: 'image', label: 'Image', group: 'Media', icon: 'image', command: 'image' },
  { id: 'emoji', label: 'Emoji', group: 'Media', icon: 'smile', command: 'emoji' }
];

/**
 * 构建最终菜单项配置。
 */
export const resolveSlashMenuItems = (config?: SlashMenuConfig, locale: EditorLocale = 'zh-CN'): SlashMenuItem[] => {
  if (config?.items && config.items.length > 0) {
    return config.items;
  }

  return locale === 'en-US' ? DEFAULT_SLASH_MENU_ITEMS_EN_US : DEFAULT_SLASH_MENU_ITEMS_ZH_CN;
};

/**
 * 判断是否处于不应展示 slash 菜单的节点。
 */
export const shouldBlockSlashMenu = (view: unknown): boolean => {
  // 当前视图对象。
  const v = view as { state?: { selection?: { $from?: ResolvedPosLike } } } | null;
  // 当前选区起点。
  const from = v?.state?.selection?.$from;
  if (!from) {
    return false;
  }

  // 当前父节点类型名。
  const parentTypeName = String(from.parent?.type?.name ?? '');
  if (parentTypeName.includes('code') || parentTypeName === 'math_block') {
    return true;
  }

  // 从当前节点向上查找,命中 table 祖先时禁止展示 slash 菜单。
  for (let depth = from.depth; depth > 0; depth -= 1) {
    // 当前层级节点类型名。
    const nodeTypeName = String(from.node(depth)?.type?.name ?? '');
    if (nodeTypeName === 'table' || nodeTypeName === 'table_cell' || nodeTypeName === 'table_header') {
      return true;
    }
  }

  return false;
};

/** 逻辑层使用的最小 ResolvedPos 形状。 */
interface ResolvedPosLike {
  pos: number;
  depth: number;
  parent: { type: { name: string } };
  node: (depth: number) => { type: { name: string } } | undefined;
  start: () => number;
}

/**
 * 读取光标前的文本块内容。
 */
const getTextBeforeCursor = (view: unknown): string => {
  // 当前编辑器状态。
  const state = (view as { state?: { doc?: DocLike; selection?: { $from?: ResolvedPosLike } } } | null)?.state;
  // 当前选区起点。
  const from = state?.selection?.$from;
  if (!state || !from) {
    return '';
  }

  // 当前文本块起始位置。
  const blockStart = from.start();
  // 当前光标位置。
  const cursorPos = from.pos;
  return state.doc?.textBetween(blockStart, cursorPos, '\n', '\n') ?? '';
};

/** 逻辑层使用的最小 Doc 形状。 */
interface DocLike {
  textBetween: (from: number, to: number, blockSeparator?: string, leafText?: string) => string;
}

/**
 * 读取当前光标所在文本块的 slash 查询词。
 */
const getSlashQueryAtCursor = (view: unknown): string | null => {
  // 光标前文本。
  const textBeforeCursor = getTextBeforeCursor(view);
  // 本次触发 slash 在块内的起始偏移。
  const slashOffset = textBeforeCursor.lastIndexOf('/');
  if (slashOffset < 0) {
    return null;
  }

  // slash 到光标之间的查询词(不包含 slash)。
  const query = textBeforeCursor.slice(slashOffset + 1);
  // 若查询中包含空白,说明已脱离当前 slash 查询态。
  if (/\s/.test(query)) {
    return null;
  }

  return query;
};

/**
 * 按查询词过滤 slash 菜单项(子串匹配:「书签」可命中「网页书签」;
 * 拼音匹配:全拼「shujubiao」或首字母「sjb」可命中「CSV数据」等中文文案)。
 */
const filterSlashMenuItems = (items: SlashMenuItem[], query: string | null): SlashMenuItem[] => {
  if (query === null || query.length === 0) {
    return items;
  }

  // 统一小写查询词。
  const normalizedQuery = query.toLowerCase();
  return items.filter((item) => {
    // 可匹配字段集合(直接子串或拼音命中,任一字段命中即保留)。
    const candidates = [item.label, item.group, item.command, item.id];
    return candidates.some((candidate) => matchesSlashQuery(String(candidate), normalizedQuery));
  });
};

/**
 * 计算当前菜单状态。
 *
 * 空态语义:查询无匹配时菜单整体不展示(点击含 '/' 的既有文本会把光标后
 * 残段误判为查询词,弹出「无匹配命令」空浮层,不如不弹);查询为空(刚输入
 * '/')且存在菜单项时正常展示全量菜单。
 */
export const resolveMenuState = (view: unknown, items: SlashMenuItem[]): SlashMenuState => {
  if (!isEditorViewEditable(view)) {
    return { visibleItems: [], shouldShow: false };
  }

  // 当前 slash 查询词。
  const query = getSlashQueryAtCursor(view);
  // 当前过滤后的菜单项。
  const visibleItems = filterSlashMenuItems(items, query);
  // 当前是否应展示菜单:无匹配(visibleItems 为空)即不展示,避免空浮层。
  const shouldShow = !shouldBlockSlashMenu(view) && query !== null && visibleItems.length > 0;
  return { visibleItems, shouldShow };
};

/**
 * 删除当前光标所在文本块中最后一个 slash 查询词。
 */
export const removeSlashQueryAtCursor = (view: unknown): boolean => {
  // 当前编辑器视图。
  const v = view as {
    state?: { doc: DocLike & { resolve: (p: number) => ResolvedPosLike; textBetween: DocLike['textBetween'] }; selection: { $from: ResolvedPosLike }; tr: { delete: (a: number, b: number) => { scrollIntoView: () => unknown } } };
    dispatch: (tr: unknown) => void;
  } | null;
  // 当前编辑器状态。
  const state = v?.state;
  // 当前选区起点。
  const from = state?.selection?.$from;
  if (!state || !from || !v?.dispatch) {
    return false;
  }

  // 当前文本块起始位置。
  const blockStart = from.start();
  // 当前光标位置。
  const cursorPos = from.pos;
  // 光标前文本。
  const textBeforeCursor = state.doc.textBetween(blockStart, cursorPos, '\n', '\n');
  // 本次触发 slash 在块内的起始偏移。
  const slashOffset = textBeforeCursor.lastIndexOf('/');
  if (slashOffset < 0) {
    return false;
  }

  // slash 在文档中的绝对位置。
  const slashFrom = blockStart + slashOffset;
  // 删除事务。
  const tr = state.tr.delete(slashFrom, cursorPos);
  v.dispatch(tr.scrollIntoView());
  return true;
};
