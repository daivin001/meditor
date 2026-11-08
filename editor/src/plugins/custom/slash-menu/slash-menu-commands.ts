/**
 * plugins/custom/slash-menu/slash-menu-commands.ts — slash 命令执行
 *
 * 1:1 翻译自 zt-react-milkdown/src/plugins/custom/slash-menu/slash-menu-commands.ts
 */
import { setBlockType, toggleMark, wrapIn } from '@milkdown/prose/commands';
import type { Node } from '@milkdown/prose/model';
import { NodeSelection, TextSelection } from '@milkdown/prose/state';
import type { ResolvedPos } from '@milkdown/prose/model';
import type { BlockTransformCommand, SlashMenuCommand } from '../../../types/editor';
import { runBlockTransformCommand } from '../block-transform';
import { JSONDATA_VIEW_NODE_PREFIX, JSONDATA_VIEW_KINDS } from '../jsondata-view';
import { insertFootnote } from '../footnote';
import { getCommandLocale } from './commands-locale';

/**
 * ProseMirror 命令执行器类型。
 */
type EditorCommandExecutor = (state: unknown, dispatch: unknown, view: unknown) => boolean;

/**
 * 最小视图形状(命令层只依赖 state/dispatch/schema)。
 */
interface SlashCommandView {
  state: {
    schema: {
      nodes: Record<
        string,
        {
          create: (attrs?: Record<string, unknown>, content?: unknown) => unknown;
          createAndFill: (attrs?: Record<string, unknown>, content?: unknown) => unknown | null;
        }
        | undefined
      >;
      marks: Record<
        string,
        { create: (attrs?: Record<string, unknown>) => unknown }
      >;
      text: (text: string, marks?: unknown[]) => { nodeSize: number } | null;
    };
    doc: { content: { size: number }; resolve: (pos: number) => ResolvedPos; descendants: (callback: (node: Node, pos: number) => boolean) => void };
    selection: { from: number; to: number; $from: ResolvedPos };
    tr: {
      replaceSelectionWith: (node: unknown) => CommandTr;
      replaceWith: (from: number, to: number, node: unknown) => CommandTr;
      setSelection: (sel: unknown) => CommandTr;
      setMeta: (key: unknown, value: unknown) => CommandTr;
      scrollIntoView: () => CommandTr;
    };
  };
  dispatch: (tr: unknown) => void;
  focus: () => void;
}

interface CommandTr {
  setMeta: (key: unknown, value: unknown) => CommandTr;
  setSelection: (sel: unknown) => CommandTr;
  scrollIntoView: () => CommandTr;
  doc: Node;
}

/**
 * 非块级 slash 命令类型(image / emoji 为特殊分支,由 slash-menu 插件直接处理)。
 */
type InlineSlashMenuCommand = Exclude<
  SlashMenuCommand,
  BlockTransformCommand | 'image' | 'emoji' | 'video' | 'audio' | 'bookmark' | 'embed'
>;

/**
 * 非块级 slash 命令处理器类型。
 */
type SlashMenuCommandHandler = (view: SlashCommandView) => boolean;

/**
 * 事务 meta 键:插入链接占位文本后恳请选区工具栏自动弹出链接编辑框。
 * 由 selection-tooltip 插件在 apply 阶段读取并消费。
 */
export const OPEN_LINK_POPOVER_META = 'zt-md-open-link-popover';

/**
 * 事务 meta 键:请求打开媒体嵌入 URL 输入浮层(值 = { kind } 或 { kind, editPos, editSrc })。
 */
export const OPEN_MEDIA_EMBED_META = 'zt-md-open-media-embed';

/**
 * 媒体嵌入 URL 浮层打开请求:无 editPos 为插入模式;携带 editPos 为编辑模式(回填 editSrc 并原地更新节点)。
 */
export interface MediaEmbedOpenRequest {
  /** 媒体种类。 */
  kind: MediaEmbedKind;
  /** 编辑模式:目标 media_embed 节点位置。 */
  editPos?: number;
  /** 编辑模式:回填的当前地址。 */
  editSrc?: string;
}

/**
 * 媒体嵌入种类(slash 命令侧引用)。
 */
export type MediaEmbedKind = 'video' | 'audio' | 'bookmark' | 'embed';

/**
 * 执行 ProseMirror 命令。
 */
const runCommand = (command: EditorCommandExecutor, view: SlashCommandView): boolean =>
  command(view.state, view.dispatch, view);

/**
 * 判断当前选区是否位于表格节点内。
 */
const isSelectionInsideTable = (view: SlashCommandView): boolean => {
  // 当前选区起点。
  const from = view?.state?.selection?.$from;
  if (!from) {
    return false;
  }

  for (let depth = from.depth; depth > 0; depth -= 1) {
    // 当前层级节点。
    const currentNode = from.node(depth);
    if (currentNode?.type?.name === 'table') {
      return true;
    }
  }

  return false;
};

/**
 * 从给定位置向上查找表格起始位置。
 */
const findTableStartPos = (view: SlashCommandView, startPos: number): number => {
  // 当前文档对象。
  const doc = view?.state?.doc;
  if (!doc || typeof startPos !== 'number') {
    return -1;
  }

  // 限制在文档范围内的起始位置。
  const boundedPos = Math.min(Math.max(startPos, 0), doc.content.size);
  // 解析后的文档位置对象。
  const resolvedPos = doc.resolve(boundedPos);
  for (let depth = resolvedPos.depth; depth > 0; depth -= 1) {
    // 当前层级节点。
    const currentNode = resolvedPos.node(depth);
    if (currentNode?.type?.name === 'table') {
      return resolvedPos.before(depth);
    }
  }

  return -1;
};

/**
 * 构建目标尺寸的表格节点。
 */
const createTableNode = (view: SlashCommandView, rows: number, cols: number, withHeaderRow: boolean): unknown | null => {
  // 当前 schema。
  const nodes = view?.state?.schema?.nodes;
  if (!nodes) {
    return null;
  }

  // 表格相关节点类型。
  const tableType = nodes.table;
  // 表头行节点类型。
  const tableHeaderRowType = nodes.table_header_row;
  // 普通表格行节点类型。
  const tableRowType = nodes.table_row;
  // 表头单元格节点类型。
  const tableHeaderType = nodes.table_header;
  // 普通单元格节点类型。
  const tableCellType = nodes.table_cell;
  if (!tableType || !tableHeaderRowType || !tableRowType || !tableHeaderType || !tableCellType) {
    return null;
  }

  // 基础单元格数量。
  const normalizedRows = Math.max(1, rows);
  // 基础表格列数。
  const normalizedCols = Math.max(1, cols);
  // 表格行节点集合。
  const tableRows = Array.from({ length: normalizedRows }, (_rowValue, rowIndex) => {
    // 当前行是否为表头行。
    const useHeaderCell = withHeaderRow && rowIndex === 0;
    // 当前行节点类型。
    const rowType = useHeaderCell ? tableHeaderRowType : tableRowType;
    // 当前行使用的单元格节点类型。
    const cellType = useHeaderCell ? tableHeaderType : tableCellType;
    // 当前行的单元格节点集合。
    const cells = Array.from({ length: normalizedCols }, () => cellType.createAndFill()).filter(Boolean);
    return rowType.create(undefined, cells);
  });

  return tableType.create(undefined, tableRows);
};

/**
 * 插入默认表格并将光标定位到首个单元格。
 */
export const insertDefaultTable = (view: SlashCommandView): boolean => {
  if (!view?.state || !view?.dispatch) {
    return false;
  }

  if (isSelectionInsideTable(view)) {
    return false;
  }

  // 默认插入起点。
  const insertPos = view.state.selection.from;
  // 默认 3x3 含表头。
  const tableNode = createTableNode(view, 3, 3, true);
  if (!tableNode) {
    return false;
  }

  view.dispatch(view.state.tr.replaceSelectionWith(tableNode).scrollIntoView());

  // 当前表格节点起始位置。
  let tableStart = findTableStartPos(view, insertPos);
  if (tableStart < 0 && insertPos > 0) {
    tableStart = findTableStartPos(view, insertPos - 1);
  }
  if (tableStart < 0) {
    return true;
  }

  // 表格首个单元格节点起点:table > header_row > cell => tableStart + 2。
  const firstCellStartPos = tableStart + 2;
  if (firstCellStartPos > view.state.doc.content.size) {
    return true;
  }

  // 从首个单元格起点向前找最近可编辑文本位置,确保进入单元格内部可输入态。
  const textSelection = TextSelection.near(view.state.doc.resolve(firstCellStartPos), 1);
  view.dispatch(view.state.tr.setSelection(textSelection).scrollIntoView());
  view.focus();
  return true;
};

/**
 * 从 schema marks 中按候选名解析 mark 类型。
 */
const resolveMarkType = (view: SlashCommandView, markNames: string[]): unknown | null => {
  // 当前 schema mark 集合。
  const marks = (view?.state?.schema?.marks ?? {}) as Record<string, unknown>;
  // 命中的 mark 名称。
  const matchedName = markNames.find((markName) => marks[markName]);
  return matchedName ? marks[matchedName] ?? null : null;
};

/**
 * 块级转换命令集合。
 */
const BLOCK_TRANSFORM_COMMAND_SET: ReadonlySet<BlockTransformCommand> = new Set([
  'paragraph',
  'heading1',
  'heading2',
  'heading3',
  'heading4',
  'heading5',
  'heading6',
  'bulletList',
  'orderedList',
  'taskList',
  'blockquote',
  'codeBlock'
]);

/**
 * 判断命令是否为块级转换命令。
 */
const isBlockTransformCommand = (command: SlashMenuCommand): command is BlockTransformCommand => {
  return BLOCK_TRANSFORM_COMMAND_SET.has(command as BlockTransformCommand);
};

/**
 * 插入空行内公式并选中该节点。
 * (math schema 未启用时 math_inline 节点不存在,安全返回 false。)
 */
export const insertInlineMath = (view: SlashCommandView): boolean => {
  // 行内公式节点类型。
  const mathInlineType = view?.state?.schema?.nodes?.math_inline;
  if (!mathInlineType || !view?.dispatch) {
    return false;
  }

  // 空行内公式节点。
  const mathInlineNode = mathInlineType.create({ value: '' });
  view.dispatch(
    view.state.tr
      .replaceSelectionWith(mathInlineNode)
      .scrollIntoView()
  );
  return true;
};

/**
 * 切换行内代码格式。
 */
const toggleInlineCode = (view: SlashCommandView): boolean => {
  // inline code mark 类型(兼容不同命名)。
  const inlineCodeMarkType = resolveMarkType(view, ['inlineCode', 'code_inline']);
  if (!inlineCodeMarkType) {
    return false;
  }

  // 行内代码切换命令。
  const inlineCodeCommand = (toggleMark as (markType: unknown, attrs?: Record<string, unknown>) => EditorCommandExecutor)(
    inlineCodeMarkType
  );
  return runCommand(inlineCodeCommand, view);
};

/**
 * 插入公式块并选中该节点。
 * (math schema 未启用时 math_block 节点不存在,安全返回 false。)
 */
export const insertMathBlock = (view: SlashCommandView): boolean => {
  // 公式块节点类型。
  const mathBlockType = view.state.schema.nodes?.math_block;
  if (!mathBlockType) {
    return false;
  }

  // 公式块转换命令(依赖 math_block 默认 attrs.value 为空字符串)。
  const mathBlockCommand = (setBlockType as (type: unknown, attrs?: Record<string, unknown>) => EditorCommandExecutor)(
    mathBlockType
  );
  // 是否成功转换为公式块。
  const converted = runCommand(mathBlockCommand, view);
  if (!converted) {
    return false;
  }

  // 当前选区起点(转换后的选区解析对象)。
  const from = view.state.selection?.$from;
  if (!from) {
    return true;
  }

  // 当前 math_block 节点在文档中的真实起始位置。
  let mathBlockPosition: number | null = null;
  for (let depth = from.depth; depth > 0; depth -= 1) {
    // 当前层节点。
    const currentNode = from.node(depth);
    if (currentNode?.type?.name !== 'math_block') {
      continue;
    }
    mathBlockPosition = from.before(depth);
    break;
  }

  if (mathBlockPosition === null) {
    return true;
  }

  // 选中公式块节点。
  const nodeSelection = NodeSelection.create(view.state.doc as never, mathBlockPosition);
  view.dispatch(view.state.tr.setSelection(nodeSelection).scrollIntoView());
  return true;
};

/**
 * 插入空 CSV 数据块(csvdata)并选中该节点。
 * (csvdata schema 未启用时节点不存在,安全返回 false。)
 */
export const insertCsvTable = (view: SlashCommandView): boolean => {
  // CSV 数据块(csvdata)节点类型。
  const mtableType = view?.state?.schema?.nodes?.csvdata;
  if (!mtableType || !view?.dispatch) {
    return false;
  }

  if (isSelectionInsideTable(view)) {
    return false;
  }

  // 空数据 CSV 数据块。
  const mtableNode = mtableType.create({ value: '' });
  view.dispatch(view.state.tr.replaceSelectionWith(mtableNode).scrollIntoView());

  // 新节点定位:优先取光标前紧邻节点(replaceSelectionWith 后光标紧随新块);
  // 兜底退化为文档顺序第一个 csvdata 节点。
  let mtablePosition: number | null = null;
  const nodeBefore = view.state.selection.$from.nodeBefore;
  if (nodeBefore?.type?.name === 'csvdata') {
    mtablePosition = view.state.selection.from - nodeBefore.nodeSize;
  }
  if (mtablePosition === null) {
    view.state.doc.descendants((node, pos) => {
      if (mtablePosition !== null) {
        return false;
      }
      if (node.type.name === 'csvdata') {
        mtablePosition = pos;
        return false;
      }
      return true;
    });
  }
  if (mtablePosition === null) {
    return true;
  }

  // 选中 CSV 数据块节点。
  const nodeSelection = NodeSelection.create(view.state.doc as never, mtablePosition);
  view.dispatch(view.state.tr.setSelection(nodeSelection).scrollIntoView());
  view.focus();
  return true;
};

/**
 * 插入链接占位文本并整体选中,随后请求选区工具栏弹出链接编辑框。
 *
 * slash 菜单语境下光标处尚无文本选区,链接是作用于选区的 inline mark,
 * 因此先插入「链接」占位文本并选中,再借由事务 meta 触发弹层,让用户补全 URL。
 */
export const insertLink = (view: SlashCommandView): boolean => {
  // 链接 mark 类型。
  const linkType = view?.state?.schema?.marks?.link;
  if (!linkType || !view?.dispatch) {
    return false;
  }

  // 当前光标位置(替换选区起点)。
  const from = view.state.selection.from;
  // 链接占位文本(无 href,由随即弹出的编辑框补全;文案随命令层 locale)。
  const textNode = view.state.schema.text(getCommandLocale().linkPlaceholder) as { nodeSize: number } | null;
  if (!textNode) {
    return false;
  }

  // 替换选区为占位文本并整体选中,附带 meta 请求弹出编辑框。
  const transaction = view.state.tr.replaceWith(from, view.state.selection.to, textNode);
  transaction.setSelection(TextSelection.create(transaction.doc, from, from + textNode.nodeSize));
  transaction.setMeta(OPEN_LINK_POPOVER_META, true);
  view.dispatch(transaction.scrollIntoView());
  view.focus();
  return true;
};

/**
 * 插入标注块(Callout):把当前顶层块包裹进 callout(Notion「turn into」语义);
 * 包裹失败(如选区落在特殊块内)时兜底在文档末尾插入含空段落的新 callout。
 * (callout schema 未注册时安全返回 false。)
 */
export const insertCallout = (view: SlashCommandView): boolean => {
  // 标注块节点类型。
  const calloutType = view?.state?.schema?.nodes?.callout;
  if (!calloutType || !view?.dispatch) {
    return false;
  }

  // 包裹当前块为 callout。
  const wrapCommand = (wrapIn as (type: unknown) => EditorCommandExecutor)(calloutType);
  if (runCommand(wrapCommand, view)) {
    view.focus();
    return true;
  }

  // 兜底:光标处插入新 callout(含一个空段落)。
  const paragraphType = view.state.schema.nodes?.paragraph;
  if (!paragraphType) {
    return false;
  }
  const calloutNode = calloutType.create(undefined, paragraphType.create());
  view.dispatch(view.state.tr.replaceSelectionWith(calloutNode).scrollIntoView());
  view.focus();
  return true;
};

/**
 * 插入折叠块(Toggle):把当前顶层块包裹进 toggle;包裹失败时在光标处
 * 插入含空段落的新折叠块。(toggle schema 未注册时安全返回 false。)
 */
export const insertToggle = (view: SlashCommandView): boolean => {
  // 折叠块节点类型。
  const toggleType = view?.state?.schema?.nodes?.toggle;
  if (!toggleType || !view?.dispatch) {
    return false;
  }

  // 包裹当前块为 toggle。
  const wrapCommand = (wrapIn as (type: unknown) => EditorCommandExecutor)(toggleType);
  if (runCommand(wrapCommand, view)) {
    view.focus();
    return true;
  }

  // 兜底:光标处插入新 toggle(含一个空段落)。
  const paragraphType = view.state.schema.nodes?.paragraph;
  if (!paragraphType) {
    return false;
  }
  const toggleNode = toggleType.create(undefined, paragraphType.create());
  view.dispatch(view.state.tr.replaceSelectionWith(toggleNode).scrollIntoView());
  view.focus();
  return true;
};

/**
 * 插入 JSON 数据视图块(表格视图):光标处插入含示例字段/记录的骨架围栏文档
 * (canonical JSON;jsondata-view:table schema 未注册时安全返回 false)。
 */
export const insertDatabase = (view: SlashCommandView): boolean => {
  // JSON 数据视图块节点类型(默认表格视图;按注册顺序取首个可用类型)。
  const nodeNames = JSONDATA_VIEW_KINDS.map((kind) => `${JSONDATA_VIEW_NODE_PREFIX}${kind}`);
  const viewType = nodeNames
    .map((nodeName) => view?.state?.schema?.nodes?.[nodeName] ?? null)
    .find((type) => type !== null);
  if (!viewType || !view?.dispatch) {
    return false;
  }

  // 骨架文档(与方案 §4.2 示例一致;字段/选项/示例文案随命令层 locale)。
  const texts = getCommandLocale();
  const [statusTodo, statusDoing, statusDone] = texts.dbStatusOptions;
  const [taskOne, taskTwo] = texts.dbSampleTasks;
  const skeleton = {
    version: 1,
    name: '',
    fields: [
      { id: 'f1', name: texts.dbFieldTitle, type: 'text' },
      { id: 'f2', name: texts.dbFieldStatus, type: 'select', options: [statusTodo, statusDoing, statusDone] }
    ],
    records: [
      { id: 'r1', cells: { f1: taskOne, f2: statusTodo } },
      { id: 'r2', cells: { f1: taskTwo, f2: statusDoing } }
    ]
  };
  // 骨架节点。
  const viewNode = viewType.create({ value: JSON.stringify(skeleton, null, 2) });
  view.dispatch(view.state.tr.replaceSelectionWith(viewNode).scrollIntoView());
  view.focus();
  return true;
};

/**
 * 插入显示控制布局块(meditor-layout):光标处插入含自描述头的模板块并选中;
 * 插入成功由 slash-menu 插件回调 onRequestLayoutMode 进入布局模式
 * (正常模式布局块完全隐藏,不进模式用户会以为插入失败)。
 * (meditor_layout schema 未注册时安全返回 false。)
 */
export const insertLayoutBlock = (view: SlashCommandView): boolean => {
  // 布局块节点类型。
  const layoutBlockType = view?.state?.schema?.nodes?.meditor_layout;
  if (!layoutBlockType || !view?.dispatch) {
    return false;
  }

  // 布局块节点(模板文案随命令层 locale)。
  const layoutNode = layoutBlockType.create({ value: getCommandLocale().layoutBlockTemplate });
  view.dispatch(view.state.tr.replaceSelectionWith(layoutNode).scrollIntoView());

  // 新节点定位:优先取光标前紧邻节点(replaceSelectionWith 后光标紧随新块);
  // 兜底退化为文档顺序第一个布局块节点。
  let layoutPosition: number | null = null;
  const nodeBefore = view.state.selection.$from.nodeBefore;
  if (nodeBefore?.type?.name === 'meditor_layout') {
    layoutPosition = view.state.selection.from - nodeBefore.nodeSize;
  }
  if (layoutPosition === null) {
    view.state.doc.descendants((node, pos) => {
      if (layoutPosition !== null) {
        return false;
      }
      if (node.type.name === 'meditor_layout') {
        layoutPosition = pos;
        return false;
      }
      return true;
    });
  }
  if (layoutPosition === null) {
    return true;
  }

  // 选中布局块节点。
  const nodeSelection = NodeSelection.create(view.state.doc as never, layoutPosition);
  view.dispatch(view.state.tr.setSelection(nodeSelection).scrollIntoView());
  view.focus();
  return true;
};

/**
 * 插入媒体嵌入块(视频/音频/书签/内嵌):经 meta 请求宿主弹出 URL 输入浮层,
 * 由 selection-tooltip 侧的 media 弹层完成输入与节点插入。
 */
export const requestMediaEmbedInsert = (view: SlashCommandView, kind: MediaEmbedKind): boolean => {
  if (!view?.dispatch) {
    return false;
  }
  // 事务 meta:请求打开媒体 URL 输入浮层。
  const transaction = view.state.tr.setMeta(OPEN_MEDIA_EMBED_META, { kind });
  view.dispatch(transaction);
  view.focus();
  return true;
};

/**
 * 插入附件(链接语义,零 schema):插入「附件」占位链接并选中,
 * 由随即弹出的链接编辑框补全 URL(与 insertLink 同款交互)。
 */
export const insertAttachment = insertLink;

/**
 * 插入日期提及(@今天/@明天/@昨天):链接语义(mention: 协议),零 schema。
 * 链接文本为 @+日期,插入后光标落在节点后。
 */
export const insertDateMention = (view: SlashCommandView): boolean => {
  // 链接 mark 类型。
  const linkType = view?.state?.schema?.marks?.link;
  if (!linkType || !view?.dispatch) {
    return false;
  }

  // 今天(本地时区 ISO 日期)。
  const today = new Date();
  const offsetDays = (days: number): string => {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // 插入带 mention 协议链接的日期文本。
  const { from, to } = view.state.selection;
  const dateText = `@${offsetDays(0)}`;
  const textNode = view.state.schema.text(dateText, [
    linkType.create({ href: `mention:date?value=${offsetDays(0)}`, title: dateText })
  ]);
  if (!textNode) {
    return false;
  }

  view.dispatch(view.state.tr.replaceWith(from, to, textNode).scrollIntoView());
  view.focus();
  return true;
};

/**
 * 插入脚注:光标处插入引用标记,文档末尾补定义块。
 * (footnote schema 未注册时安全返回 false。)
 */
export const insertFootnoteCommand = (view: SlashCommandView): boolean => {
  // schema 未注册时 insertFootnote 内部静默失败。
  return insertFootnote(view as never);
};

/**
 * 插入目录块([toc])并选中。(meditor_toc schema 未注册时安全返回 false。)
 */
export const insertTocBlock = (view: SlashCommandView): boolean => {
  // 目录块节点类型。
  const tocType = view?.state?.schema?.nodes?.meditor_toc;
  if (!tocType || !view?.dispatch) {
    return false;
  }

  view.dispatch(view.state.tr.replaceSelectionWith(tocType.create()).scrollIntoView());
  view.focus();
  return true;
};

/**
 * 插入 Mermaid 图表代码块(空 mermaid 代码块,预置流程图骨架提示)。
 */
export const insertMermaidBlock = (view: SlashCommandView): boolean => {
  // 代码块节点类型。
  const codeBlockType = view?.state?.schema?.nodes?.code_block;
  if (!codeBlockType || !view?.dispatch) {
    return false;
  }

  // 预置 mermaid 语言与最小图例(graph TD 一行即可触发渲染)。
  const codeTextNode = view.state.schema.text('graph TD\n  A --> B');
  const codeBlockNode = codeBlockType.create({ language: 'mermaid' }, codeTextNode ? [codeTextNode] : undefined);
  view.dispatch(view.state.tr.replaceSelectionWith(codeBlockNode).scrollIntoView());
  view.focus();
  return true;
};

// 非块级 slash 命令分发表。
const INLINE_SLASH_MENU_COMMAND_HANDLERS: Record<InlineSlashMenuCommand, SlashMenuCommandHandler> = {
  callout: insertCallout,
  toggle: insertToggle,
  database: insertDatabase,
  layoutBlock: insertLayoutBlock,
  dateMention: insertDateMention,
  csvTable: insertCsvTable,
  inlineCode: toggleInlineCode,
  inlineMath: insertInlineMath,
  mathBlock: insertMathBlock,
  table: insertDefaultTable,
  link: insertLink,
  footnote: insertFootnoteCommand,
  toc: insertTocBlock,
  mermaid: insertMermaidBlock
};

/**
 * 运行 slash 命令并返回是否成功。
 */
export const runSlashCommand = (view: unknown, command: SlashMenuCommand): boolean => {
  // 规范化视图。
  const v = view as SlashCommandView | null;
  if (!v?.state || !v?.dispatch) {
    return false;
  }

  if (isBlockTransformCommand(command)) {
    return runBlockTransformCommand(v as never, command);
  }

      // image / emoji 为弹层特殊分支,不落入命令处理器。
      if (command === 'image' || command === 'emoji') {
        return false;
      }
      // 媒体嵌入四类:经 meta 请求宿主弹出 URL 输入浮层。
      if (command === 'video' || command === 'audio' || command === 'bookmark' || command === 'embed') {
        return requestMediaEmbedInsert(v, command);
      }
      return INLINE_SLASH_MENU_COMMAND_HANDLERS[command](v);
};
