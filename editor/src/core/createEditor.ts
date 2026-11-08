/**
 * core/createEditor.ts — Milkdown 编辑器运行时
 *
 * 1:1 翻译自 zt-react-milkdown/src/core/createEditor.ts
 * - 去除 React 生命周期
 * - Editor.make() + config + use 流程由 createMilkdownEditor 同步创建
 * - 暴露 destroy / setMarkdown / focusEditor / searchController
 */
import type {
  BlockHandleConfig,
  EditorChangeHandler,
  EditorI18nMessages,
  EditorLocale,
  EditorShortcutMode,
  ImageUploadConfig,
  LayoutBlockConfig,
  MeditorCodeBlockConfig,
  MeditorHeading,
  MeditorMarkdownBlock,
  MeditorMarkdownFeatures,
  MeditorStats,
  MeditorViewport,
  MeditorViewportBlock,
  SlashMenuConfig,
  ToolbarCommand,
  ToolbarConfig,
  ToolbarLayoutModeApi,
  ToolbarSourceModeApi,
  ToolbarOutlineApi,
  ToolbarTranslateApi,
  ToolbarAiApi,
} from '../types/editor';
import type { Node as ProseNode } from '@milkdown/prose/model';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import type { EditorView, NodeViewConstructor } from '@milkdown/prose/view';
import { Plugin, PluginKey, TextSelection } from '@milkdown/prose/state';
import type { EditorState } from '@milkdown/prose/state';
import type { Ctx } from '@milkdown/ctx';
import {
  defaultValueCtx,
  Editor,
  editorViewCtx,
  editorViewOptionsCtx,
  nodeViewCtx,
  parserCtx,
  remarkStringifyOptionsCtx,
  rootCtx,
  serializerCtx,
} from '@milkdown/core';
import { clipboard } from '@milkdown/plugin-clipboard';
import { history } from '@milkdown/plugin-history';
import { indent, indentConfig, type IndentConfigOptions } from '@milkdown/plugin-indent';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { $prose, replaceAll } from '@milkdown/utils';
import { createReplaceAllExecutor } from './commands';
import { readSlice, readSliceWhen, runWithCtx } from './ctx-access';
import { createAiStreamControl } from './ai-stream-control';
import { blockReadonlyLinkClick, handleEditorLinkClick, isImageNode } from './link-click';
import {
  docPosFromMarkdownOffset,
  joinCompactHeading,
  markdownOffsetFromDocPos,
  serializeBlock,
} from './markdown-position';
import { remoteSelectionHighlightPlugin, remoteSelectionKey } from './remote-selection';
import { resolvePresetPlugins } from '../plugins/preset-common';
import {
  configureImageResizableSchema,
  createImageEditableNodeView,
} from '../plugins/custom/image';
import { createImagePastePlugin } from '../plugins/custom/image/image-paste';
import { imageDeleteSelectionPlugin } from '../plugins/custom/image/image-delete-selection';
import { colorMarks } from '../plugins/custom/color';
import { callout, createCalloutNodeView } from '../plugins/custom/callout';
import { toggle, createToggleNodeView } from '../plugins/custom/toggle';
import {
  jsondataView,
  createJsondataViewNodeView,
  JSONDATA_VIEW_NODE_NAMES,
} from '../plugins/custom/jsondata-view';
import { mediaEmbed, createMediaEmbedNodeView } from '../plugins/custom/media-embed';
import { blockquoteBackspaceLiftPlugin } from '../plugins/custom/blockquote/blockquote-backspace-lift';
import {
  dropCursorPlugin,
  gapCursorPlugin,
  blockBoundaryNavigationPlugin,
  trailingParagraphPlugin,
} from '../plugins/custom/cursor';
import { headingBackspaceEmptyParagraphPlugin } from '../plugins/custom/heading/heading-backspace-empty-paragraph';
import {
  createMathBlockEditableNodeView,
  createMathInlineEditableNodeView,
} from '../plugins/custom/math';
import {
  math,
  mathBackspaceEntryPlugin,
  mathInlineArrowNavigationPlugin,
} from '../plugins/custom/math';
import { createMathInlineEditPlugin } from '../plugins/custom/math/math-inline-edit-plugin';
import { createMtableNodeView, mtable } from '../plugins/custom/mtable';
import {
  createLayoutBlockBehaviorController,
  createLayoutBlockBehaviorPlugin,
  createLayoutBlockEffectPlugin,
  createMeditorLayoutNodeView,
  layoutBlock,
} from '../plugins/custom/layout-block';
import {
  codeBlockPrismPlugin,
  configureCodeBlockLanguageSchema,
  createCodeBlockEditableNodeView,
} from '../plugins/custom/code-block';
import { createEditorShortcutKeyDownHandler } from '../plugins/custom/slash-menu';
import {
  createEditorSearchController,
  createEditorSearchPlugins,
  type EditorSearchActionRunner,
  type EditorSearchController,
  type EditorSearchSnapshot,
} from '../plugins/custom/search';
import { createSelectionTooltipPlugin } from '../plugins/custom/selection-tooltip';
import { createTableFocusActionsPlugin } from '../plugins/custom/table/table-focus-actions';
import { tableArrowEntryPlugin } from '../plugins/custom/table/table-arrow-entry';
import {
  configureTableCellSpanSchemas,
  configureTableRowSpanSchema,
  configureTableSpanSchema,
} from '../plugins/custom/table/table-span-schema';
import { remarkTableHtmlPlugin } from '../plugins/custom/table/table-html-parse';
import { taskListToggle } from '../plugins/custom/list/task-list-toggle';
import { createTaskListInputRulePlugins } from '../plugins/custom/list/task-list-input-rule';
import { createChineseSymbolsInputRulePlugins } from '../plugins/custom/chinese-symbols/chinese-symbols-input-rule';
import { tabSpaceIndentPlugin } from '../plugins/custom/indent/tab-space-indent';
import { inlineCodeBoundaryNavigationPlugin } from '../plugins/custom/inline-code-boundary-navigation';
import { codeBlockModASelectPlugin } from '../plugins/custom/code-block/code-block-mod-a-select';
import { createTaskListTransformKeymap } from '../plugins/custom/block-transform';
import { resolveEditorMessages } from '../local/i18n';
import type { PresetPluginExports } from '../plugins/preset-common';
import { debounce } from '../utils/debounce';
import { isRealtimeBound } from '../collab/realtime';
import { configureBlockTransformShortcuts } from '../plugins/custom/block-transform';
import { createSlashMenuPlugin } from '../plugins/custom/slash-menu';
import { resolveSlashMenuItems } from '../plugins/custom/slash-menu/slash-menu-logic';
import { createToolbarPlugin } from '../plugins/custom/toolbar';
import { createBlockHandlePlugins } from '../plugins/custom/block-handle';
import { createInlineExtMarks, createInlineExtInputRulePlugins } from '../plugins/custom/inline-ext';
import { headingAnchorPlugin, computeHeadingAnchors, scrollToHeadingAnchor } from '../plugins/custom/heading/heading-anchor';
import { toc, createTocNodeView } from '../plugins/custom/toc';
import { aiStreamSchema, createAiStreamNodeView } from '../plugins/custom/ai';
import { footnote } from '../plugins/custom/footnote';
import { frontMatter } from '../plugins/custom/front-matter';
import { createAutoPairPlugin } from '../plugins/custom/auto-pair';
import { createEmojiAutocompletePlugin } from '../plugins/custom/emoji-autocomplete';
import { createImageDropPlugin } from '../plugins/custom/image/image-drop';
import { createWritingModeController, createWritingModePlugin } from '../plugins/custom/writing-mode';
import { createSmartPunctuationPlugin } from '../plugins/custom/smart-punctuation/smart-punctuation-plugin';
import { buildStandaloneHtml } from '../lib/export-html';

/**
 * Milkdown 原生编辑器实例类型。
 */
export type NativeMilkdownEditor = ReturnType<typeof Editor.make>;

/**
 * nodeViewCtx 条目(milkdown 内部类型未导出,按 SliceType<NodeView[]> 元素形状声明)。
 */
type NodeViewEntry = [nodeId: string, view: NodeViewConstructor];

/**
 * 聚焦坐标。
 */
export interface FocusEditorCoordinates {
  left: number;
  top: number;
}

/**
 * AI 流式插入控制器(请求生命周期由 meditor 层面板驱动,文档插入与编辑锁定在此实现)。
 *
 * 生成期间编辑器整体锁定(setEditable(false),程序性 dispatch 不受限);
 * 流式内容落在光标处的临时占位块(meditor_ai_stream)上,以 setNodeAttribute
 * 增量更新,结束后按完整 Markdown 解析替换为正式节点。
 */
export interface AiStreamController {
  /** 是否有流式插入进行中。 */
  isStreaming: () => boolean;
  /** 开始流:锁定编辑并在光标处建占位块;返回 false 表示无法开始(未就绪/已在流中)。 */
  begin: () => boolean;
  /** 追加增量文本。 */
  append: (delta: string) => void;
  /** 结束流:以完整 Markdown 替换占位块并解锁编辑。 */
  end: (markdown: string) => void;
  /** 用户中断:以已收内容替换占位块并解锁编辑(空内容则移除占位)。 */
  cancel: (markdownSoFar: string) => void;
  /** 请求失败:移除占位块并解锁编辑(文档不留痕迹)。 */
  fail: () => void;
}

/**
 * 编辑器运行时句柄。
 */
export interface MilkdownEditorRuntime {
  editor: NativeMilkdownEditor;
  installRuntimePlugins: () => void;
  focusEditor: (coordinates?: FocusEditorCoordinates) => void;
  setMarkdown: (markdown: string) => void;
  /** 运行时切换编辑态(整篇翻译模式进入只读时使用)。 */
  setEditable: (editable: boolean) => void;
  searchController: EditorSearchController;
  /** 视口快照(滚动容器 = root + 可视区相交顶层块锚点);编辑器未就绪时返回 null。 */
  getViewportInfo: () => MeditorViewport | null;
  /** 光标所在顶层块锚点(不要求焦点);未就绪或光标落在文档外时返回 null。 */
  getCursorBlock: () => MeditorViewportBlock | null;
  /**
   * 全部顶层块的 markdown 区间(块文本在整篇序列化 markdown 中的偏移)。
   * doc 未变期间结果缓存;编辑器未就绪时返回 null。
   */
  getMarkdownBlocks: () => MeditorMarkdownBlock[] | null;
  /** 滚动到指定顶层块:'start' 对齐视口顶部;'auto' 仅在不可见时最小滚动进入视口。 */
  scrollToBlock: (pos: number, align?: 'start' | 'auto') => void;
  /** 按滚动进度(0~1)滚动编辑区。 */
  scrollToProgress: (progress: number) => void;
  /** 当前整篇序列化 markdown(与 getMarkdownBlocks 同一映射基准);未就绪返回 null。 */
  getMarkdown: () => string | null;
  /** 字数统计(字符数 + 词数,CJK 逐字/西文按词);未就绪返回 null。 */
  getStats: () => MeditorStats | null;
  /** 当前选区映射到整篇 markdown 的区间;空选区/未就绪返回 null。 */
  getMarkdownSelection: () => { start: number; end: number; text: string } | null;
  /** 把整篇 markdown 区间应用为选区(不改焦点);空区间仅移动光标;失败返回 false。 */
  setMarkdownSelection: (start: number, end: number) => boolean;
  /** 清除远端选区高亮装饰(双栏同步对侧选区的可见高亮)。 */
  clearMarkdownSelectionHighlight: () => void;
  /** 设置布局模式生效态(隐藏布局块的显隐与删除保护开关,编排逻辑在 meditor 层)。 */
  setLayoutModeActive: (active: boolean) => void;
  /** 标题锚点清单(大纲面板/[toc] 数据源);未就绪返回 null。 */
  getHeadings: () => MeditorHeading[] | null;
  /** 滚动到指定锚点 id 的标题(找不到返回 false)。 */
  scrollToHeading: (id: string) => boolean;
  /** 当前文档渲染 DOM 的独立单文件 HTML 导出;未就绪返回 null。 */
  getStandaloneHtml: () => string | null;
  /** 运行时拼写检查开关(编辑区 contenteditable spellcheck 属性)。 */
  setSpellcheck: (active: boolean) => void;
  /** 运行时拼写检查语言(编辑区 lang 属性,浏览器据此选词典;空串清除)。 */
  setSpellcheckLang: (lang: string) => void;
  /** 专注模式开关(编排逻辑在 meditor 层,插件经 controller 读取)。 */
  setFocusMode: (active: boolean) => void;
  /** 打字机模式开关。 */
  setTypewriterMode: (active: boolean) => void;
  /** AI 流式插入控制器(底部会话框生成内容实时入文档)。 */
  aiStream: AiStreamController;
  destroy: () => void;
}

/**
 * 创建 Milkdown 编辑器运行时参数。
 */
export interface CreateMilkdownEditorRuntimeOptions {
  root: HTMLElement;
  portalContainer: HTMLElement;
  contentPortalContainer: HTMLElement;
  /** 工具栏挂载宿主(编辑器上方文档流容器)。 */
  toolbarHost: HTMLElement;
  markdown: string;
  readOnly: boolean;
  messages?: EditorI18nMessages;
  locale?: EditorLocale;
  slashMenu?: SlashMenuConfig;
  imageUpload?: ImageUploadConfig;
  shortcutMode: EditorShortcutMode;
  /**
   * 编辑区滚动容器选择器(浮层定位/搜索滚动 closest 就近命中用)。
   * 缺省 '.zt-md-editor, .meditor-editor-area'(meditor 自带类名,行为不变)。
   */
  scrollContainerSelector?: string;
  /** 顶部工具栏配置。 */
  toolbar?: ToolbarConfig;
  /** 块手柄配置。 */
  blockHandle?: BlockHandleConfig;
  /** 显示控制布局块能力配置(js 沙箱执行开关等)。 */
  layoutBlock?: LayoutBlockConfig;
  /** 是否支持中文符号快捷输入(默认 true)。 */
  chineseSymbols?: boolean;
  /** 自动配对括号(默认 true)。 */
  autoPair?: boolean;
  /** Emoji `:` 输入自动补全(默认 true)。 */
  emojiAutocomplete?: boolean;
  /** Markdown 扩展语法开关(行内公式/上下标/高亮/Mermaid;缺省全部开启)。 */
  markdownFeatures?: MeditorMarkdownFeatures;
  /** 图片显示地址解析器(相对路径图片的显示期转换;不写入文档)。 */
  resolveImageUrl?: (src: string) => string;
  /** 严格换行(GFM):段落内单独换行渲染为空格(默认 false)。 */
  strictLineBreaks?: boolean;
  /** 智能标点(SmartyPants;默认 false)。 */
  smartPunctuation?: boolean;
  /** 代码块编辑行为(行号/自动换行)。 */
  codeBlock?: MeditorCodeBlockConfig;
  /** 标题清单变更回调(大纲面板数据源)。 */
  onHeadingsChange?: (headings: MeditorHeading[]) => void;
  /** 大纲面板开关态变更回调(宿主据此同步菜单/侧栏态)。 */
  onOutlineOpenChange?: (open: boolean) => void;
  /** 光标跳转回调(纯导航触发:焦点在编辑器内且 selection 变化但 doc 未变)。 */
  onCursorNavigate?: (block: MeditorViewportBlock | null) => void;
  /** 打开搜索面板回调(工具栏搜索按钮使用)。 */
  onOpenSearch?: () => void;
  /** 切换整篇翻译模式回调(工具栏翻译按钮使用,编排逻辑在 meditor 层)。 */
  onToggleTranslate?: () => void;
  /** 工具栏翻译控制 API 就绪回调(meditor 层据此驱动按钮态)。 */
  onTranslateApiReady?: (api: ToolbarTranslateApi | null) => void;
  /** 切换布局模式回调(工具栏布局按钮使用,编排逻辑在 meditor 层)。 */
  onToggleLayoutMode?: () => void;
  /** 工具栏布局模式控制 API 就绪回调(meditor 层据此驱动按钮态)。 */
  onLayoutModeApiReady?: (api: ToolbarLayoutModeApi | null) => void;
  /** 布局块经 slash 菜单插入后请求进入布局模式回调(编排逻辑在 meditor 层)。 */
  onRequestLayoutMode?: () => void;
  /** 切换源码模式回调(工具栏源码按钮使用,编排逻辑在 meditor 层)。 */
  onToggleSourceMode?: () => void;
  /** 工具栏源码模式控制 API 就绪回调(meditor 层据此驱动按钮态)。 */
  onSourceModeApiReady?: (api: ToolbarSourceModeApi | null) => void;
  /** 切换大纲面板回调(工具栏大纲按钮使用,编排逻辑在 meditor 层)。 */
  onToggleOutline?: () => void;
  /** 工具栏大纲控制 API 就绪回调(meditor 层据此驱动按钮态)。 */
  onOutlineApiReady?: (api: ToolbarOutlineApi | null) => void;
  /** 切换 AI 会话框回调(工具栏 AI 按钮使用,编排逻辑在 meditor 层)。 */
  onToggleAi?: () => void;
  /** 工具栏 AI 控制 API 就绪回调(meditor 层据此驱动按钮态)。 */
  onAiApiReady?: (api: ToolbarAiApi | null) => void;
  onChange: EditorChangeHandler;
  onSearchSnapshotChange: (snapshot: EditorSearchSnapshot) => void;
}


/**
 * onChange trailing 防抖窗口(ms):markdownUpdated listener 在每个 doc 事务都会
 * 整篇序列化并回调,逐键全文回调开销大;trailing 防抖合并为最后一次,
 * destroy 时 flush 保证尾笔不丢。onChange 签名与回调语义不变。
 */
const ONCHANGE_TRAILING_DEBOUNCE_MS = 150;


/**
 * 创建 Milkdown 编辑器运行时。
 */
export const createMilkdownEditorRuntime = (
  options: CreateMilkdownEditorRuntimeOptions,
): MilkdownEditorRuntime => {
  const messages = options.messages ?? resolveEditorMessages();

  // --- Markdown 扩展语法开关(缺省全开;按实例传入各插件,多实例互不污染) ---
  const markdownFeatures = {
    math: options.markdownFeatures?.math ?? true,
    superscript: options.markdownFeatures?.superscript ?? true,
    subscript: options.markdownFeatures?.subscript ?? true,
    highlight: options.markdownFeatures?.highlight ?? true,
    mermaid: options.markdownFeatures?.mermaid ?? true
  };

  // --- onChange trailing 防抖(见 ONCHANGE_TRAILING_DEBOUNCE_MS 说明) ---
  const debouncedOnChange = debounce(
    (markdown: string) => options.onChange(markdown),
    ONCHANGE_TRAILING_DEBOUNCE_MS,
  );
  const editorSearchPlugins = createEditorSearchPlugins(options.onSearchSnapshotChange);
  // 隐藏布局块行为控制器(导航跳过 + 删除保护;模式态由 meditor 编排层经
  // setLayoutModeActive 写入,整篇替换经 runUnprotected 绕行删除保护)。
  const layoutBlockBehaviorController = createLayoutBlockBehaviorController();
  // 专注/打字机模式控制器(meditor 层经 setFocusMode/setTypewriterMode 写入)。
  const writingMode = createWritingModeController();
  // 标题清单轻防抖(每键全文重算大纲,200ms 合并)。
  let headingsChangeTimer: ReturnType<typeof setTimeout> | null = null;
  /** 通知宿主最新标题清单(doc 变更后轻防抖;视图未就绪跳过)。 */
  const notifyHeadingsChange = (): void => {
    if (!options.onHeadingsChange) {
      return;
    }
    if (headingsChangeTimer !== null) {
      clearTimeout(headingsChangeTimer);
    }
    headingsChangeTimer = setTimeout(() => {
      headingsChangeTimer = null;
      const viewCtx = getViewCtx();
      if (!viewCtx) {
        return;
      }
      options.onHeadingsChange?.(computeHeadingAnchors(viewCtx.view.state.doc));
    }, 200);
  };
  /** 标题清单变更插件(doc 变更时轻防抖通知宿主)。 */
  const headingsChangePlugin = $prose(
    () =>
      new Plugin({
        key: new PluginKey('zt-md-headings-change'),
        view: () => ({
          update: (view: EditorView, prevState: EditorState) => {
            if (view.state.doc !== prevState.doc) {
              notifyHeadingsChange();
            }
          }
        })
      })
  );
  // slash 菜单插件(enabled: false 时不注册菜单;Mermaid 关闭时过滤图表菜单项)。
  const slashMenuConfig = markdownFeatures.mermaid
    ? options.slashMenu
    : (() => {
        const items = resolveSlashMenuItems(options.slashMenu, options.locale).filter(
          (item) => item.command !== 'mermaid',
        );
        return { ...options.slashMenu, items };
      })();
  const slashMenuPlugin =
    options.slashMenu?.enabled === false
      ? null
      : createSlashMenuPlugin({
          portalContainer: options.portalContainer,
          config: slashMenuConfig,
          locale: options.locale,
          shortcutMode: options.shortcutMode,
          messages,
          imageUpload: options.imageUpload,
          scrollContainerSelector: options.scrollContainerSelector,
          onRequestLayoutMode: options.onRequestLayoutMode,
        });
  const handleEditorShortcutKeyDown = createEditorShortcutKeyDownHandler(
    options.portalContainer,
    messages,
    options.shortcutMode,
    options.imageUpload,
  );

  // --- 视口 / 块锚点(双栏同步滚动与光标定位用) ---
  // 编辑区滚动容器即 runtime root(.meditor-editor-area,overflow-y: auto)。
  const scrollContainer = options.root;
  // markdown 块区间缓存:按 doc 引用键控(每次事务都会生成新 doc,天然失效)。
  let markdownBlocksCache: {
    doc: ProseNode;
    full: string;
    blocks: MeditorMarkdownBlock[];
  } | null = null;

  /**
   * 取编辑器视图与序列化器;editor.create() 未完成时 editorViewCtx 尚未注入,返回 null。
   */
  const getViewCtx = (): {
    view: EditorView;
    serializer: (content: ProseNode) => string;
  } | null => {
    // create() 完成前 editorViewCtx 以 {} 占位(truthy 但无 state),serializerCtx
    // 可能未注入:类型化读取后仍需运行时就绪判定。
    const view = readSliceWhen(editor, editorViewCtx, (candidate) => candidate.state != null);
    if (!view) return null;
    const serializer = readSliceWhen(
      editor,
      serializerCtx,
      (candidate) => typeof candidate === 'function',
    );
    if (!serializer) return null;
    return { view, serializer };
  };

  /** 块 DOM 元素(nodeDOM 可能返回文本节点,向上取父元素兜底)。 */
  const blockElementAt = (view: EditorView, pos: number): Element | null => {
    const dom = view.nodeDOM(pos);
    return dom instanceof Element ? dom : (dom?.parentElement ?? null);
  };

  const getViewportInfo = (): MeditorViewport | null => {
    const ctxData = getViewCtx();
    if (!ctxData) return null;
    const { view, serializer } = ctxData;
    const doc = view.state.doc;
    const containerRect = scrollContainer.getBoundingClientRect();
    const blocks: MeditorViewportBlock[] = [];
    doc.forEach((child, offset) => {
      const element = blockElementAt(view, offset);
      if (!element) return;
      const rect = element.getBoundingClientRect();
      // 空高块跳过;相交判定:块底部在视口顶之下 且 块顶部在视口底之上。
      if (rect.height <= 0 || rect.bottom < containerRect.top || rect.top > containerRect.bottom) {
        return;
      }
      blocks.push({
        pos: offset,
        top: rect.top - containerRect.top,
        markdown: serializeBlock(doc, serializer, offset, offset + child.nodeSize),
      });
    });
    const maxScroll = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
    return {
      scrollContainer,
      scrollTop: scrollContainer.scrollTop,
      scrollHeight: scrollContainer.scrollHeight,
      clientHeight: scrollContainer.clientHeight,
      progress: maxScroll > 0 ? scrollContainer.scrollTop / maxScroll : 0,
      blocks,
    };
  };

  const getCursorBlock = (): MeditorViewportBlock | null => {
    const ctxData = getViewCtx();
    if (!ctxData) return null;
    const { view, serializer } = ctxData;
    const doc = view.state.doc;
    // 顶层块起点:selection 所在 depth-1 祖先之前;depth 0(gap cursor 等)退化为 pos 本身。
    let blockPos: number;
    try {
      const $pos = doc.resolve(view.state.selection.from);
      blockPos = $pos.depth >= 1 ? $pos.before(1) : $pos.pos;
    } catch {
      return null;
    }
    const node = doc.nodeAt(blockPos);
    if (!node) return null;
    const element = blockElementAt(view, blockPos);
    const containerRect = scrollContainer.getBoundingClientRect();
    return {
      pos: blockPos,
      top: element ? element.getBoundingClientRect().top - containerRect.top : 0,
      markdown: serializeBlock(doc, serializer, blockPos, blockPos + node.nodeSize),
    };
  };

  /**
   * 整篇序列化 markdown 与顶层块区间(同一缓存,保证 getMarkdown /
   * getMarkdownBlocks / 选区映射三者的偏移基准一致);编辑器未就绪返回 null。
   */
  const getSerializedDoc = (): {
    doc: ProseNode;
    full: string;
    blocks: MeditorMarkdownBlock[];
    serializer: (content: ProseNode) => string;
  } | null => {
    const ctxData = getViewCtx();
    if (!ctxData) return null;
    const { view, serializer } = ctxData;
    const doc = view.state.doc;
    if (markdownBlocksCache && markdownBlocksCache.doc === doc) {
      return {
        doc,
        full: markdownBlocksCache.full,
        blocks: markdownBlocksCache.blocks,
        serializer,
      };
    }
    // 以整篇序列化文本为基准(与 listener onChange 输出一致),块文本在其中
    // 单调向后定位;个别块定位不到(列表空行规则差异等)时退化为
    // 上一块末尾 + 空行分隔的累进偏移。
    let full = '';
    try {
      full = serializer(doc);
    } catch {
      full = '';
    }
    const blocks: MeditorMarkdownBlock[] = [];
    let searchFrom = 0;
    let fallbackCursor = 0;
    doc.forEach((child, offset) => {
      const markdown = serializeBlock(doc, serializer, offset, offset + child.nodeSize);
      let start = fallbackCursor;
      if (markdown.length > 0) {
        const found = full.indexOf(markdown, searchFrom);
        if (found >= 0) {
          start = found;
          searchFrom = found + markdown.length;
        }
      }
      const end = start + markdown.length;
      blocks.push({ pos: offset, markdown, start, end });
      fallbackCursor = end + 2; // 块间约定空行分隔
    });
    markdownBlocksCache = { doc, full, blocks };
    return { doc, full, blocks, serializer };
  };

  const getMarkdownBlocks = (): MeditorMarkdownBlock[] | null => {
    return getSerializedDoc()?.blocks ?? null;
  };

  const scrollToBlock = (pos: number, align: 'start' | 'auto' = 'auto'): void => {
    const ctxData = getViewCtx();
    if (!ctxData) return;
    const element = blockElementAt(ctxData.view, pos);
    if (!element) return;
    const containerRect = scrollContainer.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    if (align === 'start') {
      scrollContainer.scrollTop += rect.top - containerRect.top;
      return;
    }
    // 'auto':块可见则不动;否则最小滚动进入视口(对齐 scrollIntoView 语义)。
    if (rect.top < containerRect.top) {
      scrollContainer.scrollTop += rect.top - containerRect.top;
    } else if (rect.bottom > containerRect.bottom) {
      scrollContainer.scrollTop += rect.bottom - containerRect.bottom;
    }
  };

  const scrollToProgress = (progress: number): void => {
    const maxScroll = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
    if (maxScroll <= 0) return;
    scrollContainer.scrollTop = Math.min(maxScroll, Math.max(0, progress * maxScroll));
  };

  // --- 远端选区(双栏同步:对侧选区映射为 meditor 选区 + 可见高亮) ---

  /** 高亮活跃标记:避免清除/写入高频事务空转 dispatch。 */
  let remoteHighlightActive = false;

  /** 写入/清除远端选区高亮装饰(空区间即清除);位置越界等瞬态静默忽略。 */
  const applyRemoteSelectionHighlight = (from: number, to: number): void => {
    const ctxData = getViewCtx();
    if (!ctxData) return;
    const { view } = ctxData;
    if (from >= to) {
      if (!remoteHighlightActive) return;
      remoteHighlightActive = false;
      try {
        view.dispatch(view.state.tr.setMeta(remoteSelectionKey, DecorationSet.empty));
      } catch {
        /* 编辑器销毁窗口期:忽略 */
      }
      return;
    }
    try {
      const decorations = DecorationSet.create(view.state.doc, [
        Decoration.inline(from, to, { class: 'zt-md-remote-selection' }),
      ]);
      view.dispatch(view.state.tr.setMeta(remoteSelectionKey, decorations));
      remoteHighlightActive = true;
    } catch {
      /* 文档刚被替换等瞬态:忽略高亮,不影响选区应用主流程 */
    }
  };

  const getMarkdown = (): string | null => {
    return getSerializedDoc()?.full ?? null;
  };

  /**
   * 字数统计:字符数 + 词数(CJK 逐字计,西文按词计);未就绪返回 null。
   */
  const getStats = (): MeditorStats | null => {
    const ctxData = getViewCtx();
    if (!ctxData) return null;
    // 文档纯文本(块间以换行分隔)。
    const text = ctxData.view.state.doc.textBetween(0, ctxData.view.state.doc.content.size, '\n');
    // CJK 字符(汉字/假名/谚文)逐字计数。
    const cjkMatches = text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g);
    // 西文按词计数(剔除 CJK 后的连续字母数字串)。
    const latinMatches = text
      .replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, ' ')
      .match(/[A-Za-z0-9][A-Za-z0-9_'-]*/g);
    return {
      characters: text.replace(/\n/g, '').length,
      words: (cjkMatches?.length ?? 0) + (latinMatches?.length ?? 0),
    };
  };

  const getMarkdownSelection = (): { start: number; end: number; text: string } | null => {
    const ctxData = getViewCtx();
    if (!ctxData) return null;
    const { from, to } = ctxData.view.state.selection;
    if (from === to) return null;
    const serialized = getSerializedDoc();
    if (!serialized) return null;
    const { doc, full, blocks, serializer } = serialized;
    const start = markdownOffsetFromDocPos(doc, serializer, blocks, from);
    const end = markdownOffsetFromDocPos(doc, serializer, blocks, to);
    if (start === null || end === null || end <= start) return null;
    return { start, end, text: full.slice(start, end) };
  };

  const setMarkdownSelection = (start: number, end: number): boolean => {
    const ctxData = getViewCtx();
    if (!ctxData) return false;
    const { view } = ctxData;
    const serialized = getSerializedDoc();
    if (!serialized) return false;
    const { doc, blocks, serializer } = serialized;
    const fromPos = docPosFromMarkdownOffset(doc, serializer, blocks, start);
    const toPos = start === end ? fromPos : docPosFromMarkdownOffset(doc, serializer, blocks, end);
    if (fromPos === null || toPos === null || toPos < fromPos) return false;
    try {
      // between 对块边界等非文本坐标自动取近旁合法文本位置(bias 1 向内)。
      const selection = TextSelection.between(doc.resolve(fromPos), doc.resolve(toPos), 1);
      view.dispatch(view.state.tr.setSelection(selection));
    } catch {
      return false;
    }
    applyRemoteSelectionHighlight(fromPos, toPos);
    return true;
  };

  const clearMarkdownSelectionHighlight = (): void => {
    applyRemoteSelectionHighlight(0, 0);
  };

  /**
   * 光标导航插件:焦点在编辑器内、纯导航(selection 变化而 doc 未变)时
   * 回调光标所在顶层块锚点;输入与程序性 setMarkdown 引发的变化不触发。
   */
  const cursorNavigatePlugin = $prose(
    () =>
      new Plugin({
        key: new PluginKey('zt-md-cursor-navigate'),
        view: () => ({
          update: (view: EditorView, prevState: EditorState) => {
            const callback = options.onCursorNavigate;
            if (!callback) return;
            if (!view.hasFocus) return;
            if (view.state.doc !== prevState.doc) return;
            if (view.state.selection.eq(prevState.selection)) return;
            callback(getCursorBlock());
          },
        }),
      }),
  );

  const presetPluginExports: PresetPluginExports = {
    listener,
    commonmark,
    colorMarks,
    callout,
    toggle,
    jsondataView,
    mediaEmbed,
    taskListTransformKeymap: createTaskListTransformKeymap(options.shortcutMode),
    inlineCodeBoundaryNavigation: inlineCodeBoundaryNavigationPlugin,
    gfm,
    history,
    editorSearch: editorSearchPlugins,
    codeBlockPrism: codeBlockPrismPlugin,
    tableHtmlParse: remarkTableHtmlPlugin,
    clipboard,
    indent,
    imageDeleteSelection: imageDeleteSelectionPlugin,
    imagePaste: createImagePastePlugin(options.imageUpload, messages),
    tableArrowEntry: tableArrowEntryPlugin,
    blockBoundaryNavigation: blockBoundaryNavigationPlugin,
    headingBackspaceEmptyParagraph: headingBackspaceEmptyParagraphPlugin,
    mathBackspaceEntry: markdownFeatures.math ? mathBackspaceEntryPlugin : null,
    blockquoteBackspaceLift: blockquoteBackspaceLiftPlugin,
    tableFocusActions: createTableFocusActionsPlugin(
      options.portalContainer,
      messages,
      options.scrollContainerSelector,
    ),
    selectionTooltip: createSelectionTooltipPlugin(
      options.portalContainer,
      messages,
      options.shortcutMode,
      options.scrollContainerSelector,
    ),
    gapCursor: gapCursorPlugin,
    dropCursor: dropCursorPlugin,
    trailingParagraph: trailingParagraphPlugin,
    math: markdownFeatures.math ? math : null,
    mathInlineEdit: markdownFeatures.math
      ? createMathInlineEditPlugin(messages, options.portalContainer)
      : null,
    mathInlineArrowNavigation: markdownFeatures.math ? mathInlineArrowNavigationPlugin : null,
    mtable,
    layoutBlock,
    layoutBlockBehavior: createLayoutBlockBehaviorPlugin(layoutBlockBehaviorController),
    layoutBlockEffect: createLayoutBlockEffectPlugin(),
    taskListToggle,
    taskListInputRule: createTaskListInputRulePlugins(options.chineseSymbols ?? true),
    chineseSymbolsInputRule: createChineseSymbolsInputRulePlugins(options.chineseSymbols ?? true),
    tabSpaceIndent: tabSpaceIndentPlugin,
    codeBlockModASelect: codeBlockModASelectPlugin,
    cursorNavigate: cursorNavigatePlugin,
    remoteSelectionHighlight: remoteSelectionHighlightPlugin,
    inlineExtMarks: createInlineExtMarks(markdownFeatures),
    inlineExtInputRules: createInlineExtInputRulePlugins(markdownFeatures),
    headingAnchor: headingAnchorPlugin,
    headingsChange: headingsChangePlugin,
    toc,
    aiStream: aiStreamSchema,
    footnote,
    frontMatter,
    autoPair: options.autoPair === false ? null : createAutoPairPlugin(true),
    emojiAutocomplete: createEmojiAutocompletePlugin(
      options.portalContainer,
      messages,
      options.emojiAutocomplete !== false
    ),
    smartPunctuation: options.smartPunctuation ? createSmartPunctuationPlugin() : null,
    imageDrop: createImageDropPlugin(options.imageUpload, messages),
    writingMode: createWritingModePlugin(writingMode.controller, scrollContainer),
    slash: slashMenuPlugin,
    blockHandle:
      options.blockHandle?.enabled === false
        ? null
        : createBlockHandlePlugins({
            portalContainer: options.portalContainer,
            messages,
            scrollContainerSelector: options.scrollContainerSelector,
          }),
    toolbar: createToolbarPlugin({
      toolbarHost: options.toolbarHost,
      portalContainer: options.portalContainer,
      messages,
      shortcutMode: options.shortcutMode,
      mode: options.toolbar?.mode,
      items: options.toolbar?.items,
      // 扩展语法关闭时收起对应按钮(与宿主 exclude 叠加)。
      exclude: [
        ...(options.toolbar?.exclude ?? []),
        ...(markdownFeatures.math ? [] : (['inlineMath', 'mathBlock'] as ToolbarCommand[])),
        ...(markdownFeatures.superscript ? [] : (['superscript'] as ToolbarCommand[])),
        ...(markdownFeatures.subscript ? [] : (['subscript'] as ToolbarCommand[]))
      ],
      align: options.toolbar?.align,
      visible: options.toolbar?.visible ?? true,
      readOnly: options.readOnly,
      imageUpload: options.imageUpload,
      scrollContainerSelector: options.scrollContainerSelector,
      onOpenSearch: options.onOpenSearch ?? (() => undefined),
      onToggleTranslate: options.onToggleTranslate,
      onTranslateApiReady: options.onTranslateApiReady,
      onToggleLayoutMode: options.onToggleLayoutMode,
      onLayoutModeApiReady: options.onLayoutModeApiReady,
      onToggleSourceMode: options.onToggleSourceMode,
      onSourceModeApiReady: options.onSourceModeApiReady,
      onToggleOutline: options.onToggleOutline,
      onOutlineApiReady: options.onOutlineApiReady,
      onToggleAi: options.onToggleAi,
      onAiApiReady: options.onAiApiReady,
    }),
  };
  const bootstrapPlugins = resolvePresetPlugins(presetPluginExports, {
    includeRuntime: false,
  });
  const runtimePlugins = resolvePresetPlugins(presetPluginExports, {
    includeRuntime: true,
  });
  const runtimePluginDescriptors = runtimePlugins.filter(
    (descriptor) => descriptor.name === 'clipboard' || descriptor.name === 'indent',
  );

  const editor = Editor.make();
  // Ctx(@milkdown/ctx)自带泛型 get/set/update,config 阶段全部 slice 引用均按
  // SliceType 收窄,无需 unknown 强转(延迟读取走本文件 ctx-access 助手)。
  editor.config((ctx: Ctx) => {
    configureBlockTransformShortcuts(ctx, options.shortcutMode);
    configureImageResizableSchema(ctx, options.imageUpload?.allowedProtocols);
    // 代码块语言默认值与规范化(configureCodeBlockLanguageSchema 需在 schema 就绪前改写)。
    configureCodeBlockLanguageSchema(ctx);
    // 表格合并单元格:单元格跨距解析 + 行逐格对齐 + 合并表格 HTML 序列化
    // (均需在 schema 就绪前包装 gfm 既有 runner)。
    configureTableCellSpanSchemas(ctx);
    configureTableRowSpanSchema(ctx);
    configureTableSpanSchema(ctx);
    // 序列化输出紧凑化:标题相邻块之间单换行(config 阶段更新,Init 阶段据此
    // 重建 remark 处理器;解析行为不变,仅影响 getMarkdown/存盘输出)。
    ctx.update(remarkStringifyOptionsCtx, (options) => ({
      ...options,
      join: [...(options.join ?? []), joinCompactHeading],
    }));
    ctx.set(rootCtx, options.root);
    ctx.set(defaultValueCtx, options.markdown);
    ctx.set(editorViewOptionsCtx, {
      editable: () => !options.readOnly,
      handleKeyDown: handleEditorShortcutKeyDown,
      handleDOMEvents: {
        mousedown: (_view: unknown, event: Event) =>
          event instanceof MouseEvent ? blockReadonlyLinkClick(event, options.readOnly) : false,
        click: (_view: unknown, event: Event) =>
          event instanceof MouseEvent ? blockReadonlyLinkClick(event, options.readOnly) : false,
      },
      handleClick: (view: EditorView, _position: number, event: MouseEvent) =>
        handleEditorLinkClick(event, options.readOnly, view),
      handleClickOn: (
        view: EditorView,
        _position: number,
        node: ProseNode,
        _nodePosition: number,
        event: MouseEvent,
        direct: boolean,
      ) => {
        if (handleEditorLinkClick(event, options.readOnly, view)) {
          return true;
        }
        if (options.readOnly && direct && isImageNode(node)) {
          event.preventDefault();
          return true;
        }
        return false;
      },
    });

    // nodeViewCtx 在 config 阶段还未注入,这里通过 ctx.update 延迟到 schema 就绪后注册。
    ctx.update(nodeViewCtx, (current = []) => {
      // JSON 数据视图块:7 种视图各注册同一 NodeView 构造器(视图种类由节点名解析)。
      const jsondataViewNodeViews = JSONDATA_VIEW_NODE_NAMES.map(
        (nodeName) => [nodeName, createJsondataViewNodeView(options.locale)] as NodeViewEntry,
      );
      return [
        ...current,
        ['image', createImageEditableNodeView(messages, options.resolveImageUrl)] as NodeViewEntry,
        ['math_block', createMathBlockEditableNodeView(messages)] as NodeViewEntry,
        ['inline_math', createMathInlineEditableNodeView(messages)] as NodeViewEntry,
        ['code_block', createCodeBlockEditableNodeView(messages, {
          ...(options.codeBlock ?? {}),
          mermaidEnabled: markdownFeatures.mermaid
        })] as NodeViewEntry,
        ['csvdata', createMtableNodeView(options.locale)] as NodeViewEntry,
        ['meditor_layout', createMeditorLayoutNodeView(messages, {
          // meditor-layout:js 沙箱执行开关(宿主面向不可信文档可关闭)。
          scriptEnabled: options.layoutBlock?.enableScript ?? true,
        })] as NodeViewEntry,
        ['callout', createCalloutNodeView(messages)] as NodeViewEntry,
        ['toggle', createToggleNodeView(messages)] as NodeViewEntry,
        ...jsondataViewNodeViews,
        ['media_embed', createMediaEmbedNodeView(messages)] as NodeViewEntry,
        ['meditor_toc', createTocNodeView(messages)] as NodeViewEntry,
        ['meditor_ai_stream', createAiStreamNodeView(messages)] as NodeViewEntry,
      ];
    });

    // listenerCtx 由 listener 插件 factory 在 prepare 阶段注入,config 回调执行时已就绪。
    ctx.update(listenerCtx, (listenerManager) => {
      if (listenerManager) {
        listenerManager.markdownUpdated((_ctx, md) => {
          // trailing 防抖:连续 doc 事务合并为最后一次回调(destroy 时 flush 防丢尾)。
          debouncedOnChange(md);
        });
      }
      return listenerManager;
    });
  });

  bootstrapPlugins.forEach((descriptor) => {
    editor.use(descriptor.plugin as never);
  });
  const runSearchAction: EditorSearchActionRunner = (action) => {
    const view = runWithCtx(editor, (ctx: Ctx) => ctx.get(editorViewCtx));
    if (view) {
      action(view);
    }
  };
  const searchController = createEditorSearchController(
    runSearchAction,
    options.scrollContainerSelector,
  );

  const installRuntimePlugins = (): void => {
    runtimePluginDescriptors.forEach((descriptor) => {
      try {
        editor.use(descriptor.plugin as never);
        if (descriptor.name === 'indent') {
          // 先按 IndentConfigOptions 定型再写入:避免 ctx.set 从字面量把 T 推宽为 string。
          const indentOptions: IndentConfigOptions = {
            type: 'space',
            size: 4,
          };
          runWithCtx(editor, (ctx: Ctx) => ctx.set(indentConfig.key, indentOptions));
        }
      } catch (error) {
        console.error(error);
      }
    });
  };

  const runReplaceAll = createReplaceAllExecutor(replaceAll, editor);

  // --- AI 流式插入(占位块 + 编辑锁定;请求生命周期由 meditor 层面板驱动) ---

  /** 解析 markdown 为文档节点(milkdown 解析器;未就绪/失败返回 null)。 */
  const parseMarkdownToNode = (markdown: string): ProseNode | null => {
    const parser = readSlice(editor, parserCtx);
    if (typeof parser !== 'function') {
      return null;
    }
    try {
      return parser(markdown) ?? null;
    } catch {
      return null;
    }
  };

  const aiStreamController = createAiStreamControl({
    parseMarkdown: parseMarkdownToNode,
    getViewCtx,
    readOnly: options.readOnly,
  });

  const focusEditor = (coordinates?: FocusEditorCoordinates): void => {
    const view = readSliceWhen(editor, editorViewCtx, (candidate) => candidate.state != null);
    if (!view) {
      return;
    }
    const lastNode = view.state.doc.lastChild;
    const lastNodePosition = lastNode ? view.state.doc.content.size - lastNode.nodeSize : null;
    const lastNodeDom = lastNodePosition === null ? null : view.nodeDOM(lastNodePosition);
    const lastNodeElement =
      lastNodeDom instanceof Element ? lastNodeDom : (lastNodeDom?.parentElement ?? null);
    const isBelowEditorContent =
      coordinates !== undefined &&
      lastNodeElement !== null &&
      coordinates.top > lastNodeElement.getBoundingClientRect().bottom;

    if (isBelowEditorContent) {
      const paragraphType = view.state.schema.nodes.paragraph;
      const hasTrailingEmptyParagraph =
        !!paragraphType && lastNode?.type === paragraphType && lastNode.content.size === 0;
      if (!hasTrailingEmptyParagraph && paragraphType) {
        const transaction = view.state.tr.insert(
          view.state.doc.content.size,
          paragraphType.create(),
        );
        transaction.setSelection(TextSelection.atEnd(transaction.doc)).scrollIntoView();
        view.dispatch(transaction);
        view.focus();
        return;
      }
    }

    const coordinatePosition = coordinates ? view.posAtCoords(coordinates) : null;
    const nextSelection =
      coordinatePosition && coordinatePosition.pos !== undefined
        ? TextSelection.near(view.state.doc.resolve(coordinatePosition.pos), 1)
        : TextSelection.atEnd(view.state.doc);
    if (!view.state.selection.eq(nextSelection)) {
      view.dispatch(view.state.tr.setSelection(nextSelection).scrollIntoView());
    }
    view.focus();
  };

  return {
    editor,
    installRuntimePlugins,
    focusEditor,
    searchController,
    getViewportInfo,
    getCursorBlock,
    getMarkdownBlocks,
    scrollToBlock,
    scrollToProgress,
    getMarkdown,
    getStats,
    getMarkdownSelection,
    setMarkdownSelection,
    clearMarkdownSelectionHighlight,
    setMarkdown: (markdown: string): void => {
      // 整篇替换唯一入口(meditor.setMarkdown / 整篇翻译 / 版本历史恢复 / 双栏同步
      // 均收敛于此)。realtime 激活时替换经 ySyncPlugin 的 plugin view.update 以
      // ydoc.transact 原子同步到 Y 文档(y-prosemirror 在事务内执行 _prosemirrorChanged),
      // 远端可见、入撤销栈、不与 Y 增量同步分叉;此处显式检测并提示,不静默替换。
      if (isRealtimeBound(editor)) {
        console.info(
          '[meditor] whole-document replace under realtime: synced to Yjs atomically via ySyncPlugin',
        );
      }
      // 整篇替换属程序化变更:绕行隐藏布局块删除保护(块随内容合法重建)。
      layoutBlockBehaviorController.runUnprotected(() => runReplaceAll(markdown));
    },
    setLayoutModeActive: (active: boolean): void => {
      layoutBlockBehaviorController.setModeActive(active);
    },
    getHeadings: (): MeditorHeading[] | null => {
      const ctxData = getViewCtx();
      if (!ctxData) return null;
      return computeHeadingAnchors(ctxData.view.state.doc);
    },
    scrollToHeading: (id: string): boolean => {
      const ctxData = getViewCtx();
      if (!ctxData) return false;
      return scrollToHeadingAnchor(ctxData.view, id);
    },
    getStandaloneHtml: (): string | null => {
      const ctxData = getViewCtx();
      if (!ctxData) return null;
      return buildStandaloneHtml(ctxData.view.dom.innerHTML);
    },
    setSpellcheck: (active: boolean): void => {
      const ctxData = getViewCtx();
      if (!ctxData) return;
      ctxData.view.dom.setAttribute('spellcheck', String(active));
    },
    setSpellcheckLang: (lang: string): void => {
      const ctxData = getViewCtx();
      if (!ctxData) return;
      if (lang) {
        ctxData.view.dom.setAttribute('lang', lang);
      } else {
        ctxData.view.dom.removeAttribute('lang');
      }
    },
    setFocusMode: (active: boolean): void => {
      writingMode.setFocusMode(active);
      // 切换瞬间强制重算装饰(关闭时清空高亮)。
      const ctxData = getViewCtx();
      if (!ctxData) return;
      ctxData.view.dispatch(ctxData.view.state.tr.setMeta('zt-md-writing-mode-refresh', true));
    },
    setTypewriterMode: (active: boolean): void => {
      writingMode.setTypewriterMode(active);
    },
    aiStream: aiStreamController,
    setEditable: (editable: boolean): void => {
      // 运行时只读切换:更新视图 props 的 editable(禁用用户输入,不影响程序性 dispatch)。
      getViewCtx()?.view.setProps({ editable: () => editable });
    },
    destroy: (): void => {
      // 防抖窗口内的最后一次编辑在销毁前必须送达宿主(防丢尾)。
      debouncedOnChange.flush();
      void editor.destroy();
    },
  };
};
