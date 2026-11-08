/**
 * meditor.ts — Markdown Editor 主入口
 *
 * 纯 TypeScript DOM API，替代 React 层。
 * 提供 create() / destroy() / getMarkdown() / setMarkdown() 等同步接口。
 */
import 'katex/dist/katex.min.css';
import './styles/editor.css';
import { createMilkdownEditorRuntime, type MilkdownEditorRuntime } from './core/createEditor';
import { buildMeditorDom } from './meditor-dom';
import { resolveEditorMessages } from './local/i18n';
import type {
  EditorChangeHandler,
  EditorSearchOptions,
  EditorSearchSnapshot,
  MeditorCodeBlockConfig,
  MeditorHeading,
  MeditorMarkdownBlock,
  MeditorMarkdownFeatures,
  MeditorStats,
  MeditorViewport,
  MeditorViewportBlock,
  MilkdownEditorProps,
  ToolbarLayoutModeApi,
  ToolbarOutlineApi,
  ToolbarSourceModeApi,
  ToolbarTranslateApi,
  ToolbarAiApi,
} from './types/editor';
import { stripMeditorLayoutBlocks } from './utils/layout-block-export';
import type { SearchPanelApi } from './components/search-panel';
import { createSearchPanel } from './components/search-panel';
import type { OutlinePanelApi } from './components/outline-panel';
import { createOutlinePanel } from './components/outline-panel';
import type { AiPanelApi } from './components/ai-panel';
import { createAiPanel } from './components/ai-panel';
import { streamOpenAiCompatibleChat } from './lib/ai-chat';
import type { AiModelConfig } from './types/editor';
import {
  createSplitScrollSync,
  type MeditorSplitSyncPartner,
  type SplitScrollSyncHandle,
} from './lib/split-scroll-sync';
import { translateMarkdown } from './lib/translate';
import { createMeditorCollab, type MeditorCollabApi } from './collab';
import { isMac } from './utils/platform';

// 双栏同步对侧面板结构(消费侧类型声明用)。
export type { MeditorSplitSyncPartner, SplitScrollSyncHandle } from './lib/split-scroll-sync';

/**
 * Meditor 实例配置(字段与原版 Milkdown Editor Props 全表一致,另加 DOM 宿主 root 与搜索回调)。
 */
export interface MeditorOptions extends MilkdownEditorProps {
  /** 编辑器挂载根节点（必需）。 */
  root: HTMLElement;
  /** 搜索快照变更回调。 */
  onSearchSnapshotChange?: (snapshot: EditorSearchSnapshot) => void;
  /**
   * P4 协作配置(默认关闭):仅在显式传 `{ enabled: true }` 时装配(含 45s 自动
   * 快照定时器、MemoryHistoryStore/MemoryCommentStore 与评论锚定插件)。
   * 多实例场景下不再每实例常驻定时器,需要协作的宿主显式开启。
   */
  collab?: {
    /** 文档标识(评论/快照存储隔离键;缺省 'default')。 */
    documentId?: string;
    /** 是否装配协作能力(默认 false;显式 true 才装配)。 */
    enabled?: boolean;
  };
  /**
   * 整篇翻译请求端点(缺省用微软 Edge 免费翻译端点,见 lib/translate.ts)。
   * 企业内网/合规敏感场景应自建翻译网关,并在此注入自有端点,
   * 避免浏览器直连第三方接口。
   */
  translateEndpoint?: string;
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
  /** 标题自动编号(h1~h6 CSS counter 编号,仅显示;默认 false)。 */
  headingNumbering?: boolean;
  /** 标题清单变更回调(大纲面板数据源;文档变更轻防抖)。 */
  onHeadingsChange?: (headings: MeditorHeading[]) => void;
  /** 大纲面板开关态变更回调(工具栏按钮与宿主 API 触发均通知,宿主据此同步菜单态)。 */
  onOutlineOpenChange?: (open: boolean) => void;
}


/**
 * Meditor 实例 API。
 */
export interface MeditorApi {
  /** 获取当前 Markdown 内容。 */
  getMarkdown: () => string;
  /** 设置 Markdown 内容。 */
  setMarkdown: (markdown: string) => void;
  /** 字数统计(字符数 + 词数,CJK 逐字/西文按词);编辑器未就绪时返回 null。 */
  getStats: () => MeditorStats | null;
  /** 聚焦编辑器。 */
  focus: () => void;
  /** 打开搜索面板。 */
  openSearch: () => void;
  /** 关闭搜索面板。 */
  closeSearch: () => void;
  /** 搜索快照。 */
  getSearchSnapshot: () => EditorSearchSnapshot;
  /** 更新搜索选项。 */
  updateSearchOptions: (options: Partial<EditorSearchOptions>) => void;
  /** 替换当前匹配项。 */
  replaceCurrent: () => void;
  /** 替换全部。 */
  replaceAll: () => void;
  /** 销毁编辑器。 */
  destroy: () => void;
  /** 视口快照(滚动容器 + 可视区相交顶层块锚点);编辑器未就绪时返回 null。 */
  getViewportInfo: () => MeditorViewport | null;
  /** 光标所在顶层块锚点(不要求焦点);未就绪时返回 null。 */
  getCursorBlock: () => MeditorViewportBlock | null;
  /** 全部顶层块的 markdown 区间映射;编辑器未就绪时返回 null。 */
  getMarkdownBlocks: () => MeditorMarkdownBlock[] | null;
  /** 滚动到指定顶层块:'start' 对齐视口顶部;'auto' 仅在不可见时最小滚动进入视口。 */
  scrollToBlock: (pos: number, align?: 'start' | 'auto') => void;
  /**
   * 切换整篇翻译模式(与工具栏最右侧翻译按钮同入口):未翻译时把全文送翻
   * 并进入只读翻译视图;翻译视图生效时切回原文。返回翻译完成时机。
   */
  toggleTranslate: () => Promise<void>;
  /**
   * 开启/关闭布局模式:显示控制布局块(meditor-layout 围栏)仅在布局模式下
   * 可见可编辑,正常模式完全隐藏(零占位)。
   */
  setLayoutMode: (active: boolean) => void;
  /** 切换布局模式,返回切换后的状态。 */
  toggleLayoutMode: () => boolean;
  /**
   * 开启/关闭源码模式:整篇内容切换为 Markdown 源码文本编辑(富文本层隐藏,
   * 其余工具栏按钮禁用),退出时把文本框内容写回。
   */
  setSourceMode: (active: boolean) => void;
  /** 切换源码模式,返回切换后的状态。 */
  toggleSourceMode: () => boolean;
  /**
   * 当前 Markdown 剥离全部显示控制布局块后的版本(供大模型消费,
   * 避免布局信息污染正文信息量)。
   */
  getMarkdownForLLM: () => string;
  /** 按滚动进度(0~1)滚动编辑区。 */
  scrollToProgress: (progress: number) => void;
  /**
   * 开启/关闭双栏同步:传入对侧源码面板(CodeMirror 6 EditorView 结构兼容)
   * 即开启滚动联动 + 双向内容同步 + 双向选区同步(两侧均可编辑);传 null
   * 关闭。编辑器销毁时自动释放。
   */
  setSplitPartner: (partner: MeditorSplitSyncPartner | null) => void;
  /**
   * P4 协作门面(版本历史 / 评论锚定 / 实时协同)。仅当 options.collab.enabled === true
   * 时装配(默认关闭);未装配时为 null。面板挂载与 provider 接入由宿主按需调用。
   */
  readonly collab: MeditorCollabApi | null;
  /** 标题锚点清单(大纲面板数据源);编辑器未就绪时返回 null。 */
  getHeadings: () => MeditorHeading[] | null;
  /** 滚动到指定锚点 id 的标题(大纲/[toc]/#锚点 链接共用;找不到返回 false)。 */
  scrollToHeading: (id: string) => boolean;
  /** 开启/关闭 AI 会话框(底部会话框,生成内容流式插入文档)。 */
  setAiOpen: (active: boolean) => void;
  /** 切换 AI 会话框,返回切换后的状态。 */
  toggleAi: () => boolean;
  /** AI 会话框是否展开。 */
  isAiOpen: () => boolean;
  /** 热更新 AI 模型清单(宿主设置变更时推送;进行中的生成不受影响)。 */
  setAiModels: (models: AiModelConfig[]) => void;
  /** 开启/关闭大纲面板(内容右侧标题清单;与工具栏大纲按钮同状态)。 */
  setOutlineOpen: (active: boolean) => void;
  /** 切换大纲面板,返回切换后的状态。 */
  toggleOutline: () => boolean;
  /** 大纲面板是否展开。 */
  isOutlineOpen: () => boolean;
  /** 当前文档的独立单文件 HTML 导出(内联样式,可直接保存/打印)。 */
  getStandaloneHtml: () => string | null;
  /** 运行时拼写检查开关。 */
  setSpellcheck: (active: boolean) => void;
  /** 运行时拼写检查语言(编辑区 lang 属性;空串清除)。 */
  setSpellcheckLang: (lang: string) => void;
  /** 开启/关闭专注模式(光标块全亮,其余降透明度)。 */
  setFocusMode: (active: boolean) => void;
  /** 开启/关闭打字机模式(光标行保持视口垂直居中)。 */
  setTypewriterMode: (active: boolean) => void;
}

/**
 * 搜索快照初值(实例级;各 meditor 实例独立持有,多实例互不串扰)。
 */
const createEmptySearchSnapshot = (): EditorSearchSnapshot => ({
  matchCount: 0,
  matchIndex: 0,
  isInvalidExpression: false,
});

/**
 * 创建 Markdown 编辑器实例(纯 TS DOM,无框架依赖)。
 *
 * @param options 编辑器配置:挂载根节点、初始/受控内容、语言与文案覆盖、
 *                工具栏/块手柄/slash 菜单/图片上传等能力开关,以及可选的
 *                编辑区滚动容器选择器(scrollContainerSelector)。
 * @returns 编辑器实例 API:内容读写(getMarkdown/setMarkdown)、字数统计、
 *          搜索面板控制、视口/光标锚点、双栏同步(setSplitPartner)与销毁等。
 */
export function createMeditor(options: MeditorOptions): MeditorApi {
  const {
    root,
    defaultValue = '',
    readOnly = false,
    locale,
    messages,
    className,
    placeholder,
    maxHeight,
    headerSlot,
    slashMenu,
    imageUpload,
    shortcutMode = 'modShift',
    theme = 'light',
    debounceMs = 250,
    toolbar,
    blockHandle,
    chineseSymbols,
    layoutBlock,
    scrollContainerSelector,
    onCursorNavigate,
    onSearchSnapshotChange,
    translateEndpoint,
    autoPair,
    emojiAutocomplete,
    markdownFeatures,
    resolveImageUrl,
    strictLineBreaks,
    smartPunctuation,
    codeBlock,
    headingNumbering,
    onHeadingsChange,
    onOutlineOpenChange,
  } = options;

  // --- 块手柄生效状态:显式配置优先;未配置时简洁模式(面板窄空间)默认关闭 ---
  const blockHandleEnabled = blockHandle?.enabled ?? toolbar?.mode !== 'simple';

  // --- 解析最终文案(placeholder 覆盖 messages.placeholder,对齐原版) ---
  const resolvedMessages = resolveEditorMessages(locale, messages, placeholder);

  // --- DOM 结构构建(骨架细节见 meditor-dom.ts) ---
  const {
    wrapper,
    toolbarHostDiv,
    searchPanelDiv,
    editorArea,
    outlinePanelDiv,
    aiPanelDiv,
    portalContainer,
    contentPortalContainer,
  } = buildMeditorDom({
    root,
    theme,
    readOnly,
    locale,
    blockHandleEnabled,
    className,
    headerSlot,
    strictLineBreaks: strictLineBreaks === true,
    headingNumbering: headingNumbering === true,
    resolvedMessages,
    maxHeight,
  });

  // --- 受控/非受控状态 ---
  // value/onChange 从 options 读取(不可解构快照):受控轮询闭包必须每次读
  // options.value 才能检测到外部更新(解构值是创建时刻的旧引用)。
  const isControlled = options.value !== undefined;
  let currentMarkdown = isControlled ? (options.value as string) : defaultValue;

  const handleChange: EditorChangeHandler = (markdown: string) => {
    currentMarkdown = markdown;
    // 左 → 右内容同步入口(引擎内部按对侧焦点去回声)。
    splitSyncHandle?.notifyMeditorContent(markdown);
    options.onChange?.(markdown);
  };

  // --- 搜索快照(实例级;getSearchSnapshot 无面板时返回最近一次快照) ---
  let instanceSnapshot: EditorSearchSnapshot = createEmptySearchSnapshot();

  const handleSearchSnapshotChange = (snapshot: EditorSearchSnapshot): void => {
    instanceSnapshot = snapshot;
    searchPanel?.updateSnapshot(snapshot);
    onSearchSnapshotChange?.(snapshot);
  };

  // --- 双栏同步(内置能力):setSplitPartner 一行接入对侧源码面板 ---
  let splitSyncHandle: SplitScrollSyncHandle | null = null;

  // --- 整篇翻译模式状态 ---
  /** 工具栏翻译控制 API(工具栏视图就绪后注入,销毁时回收)。 */
  let toolbarTranslateApi: ToolbarTranslateApi | null = null;
  /** 翻译视图是否生效。 */
  let translateModeActive = false;
  /** 翻译请求进行中(防重复触发)。 */
  let translateInFlight = false;
  /** 进入翻译模式时的原文快照(切回时恢复)。 */
  let translateOriginalMarkdown: string | null = null;
  /** 译文缓存(原文未变时再次进入免二次请求)。 */
  let translateCache: { source: string; result: string } | null = null;
  /** 实例是否已销毁(销毁后在途翻译请求落地时放弃应用)。 */
  let isDestroyed = false;

  // --- 布局模式状态(显示控制布局块的显隐/编辑开关) ---
  /** 工具栏布局控制 API(工具栏视图就绪后注入,销毁时回收)。 */
  let toolbarLayoutApi: ToolbarLayoutModeApi | null = null;
  /** 布局模式是否生效。 */
  let layoutModeActive = false;

  // --- 源码模式状态(整篇以 Markdown 源码文本框编辑) ---
  /** 工具栏源码控制 API(工具栏视图就绪后注入,销毁时回收)。 */
  let toolbarSourceApi: ToolbarSourceModeApi | null = null;
  /** 源码模式是否生效。 */
  let sourceModeActive = false;
  /** 源码文本框(懒创建,退出后保留复用;随 wrapper 销毁)。 */
  let sourceEditor: HTMLTextAreaElement | null = null;
  /** 进入源码模式时的内容快照(退出时比较,未编辑则免整篇写回)。 */
  let sourceEditorInitialMarkdown: string | null = null;
  /** 源码文本输入的 onChange 防抖定时器(与富文本层 debounceMs 同频)。 */
  let sourceInputTimer: ReturnType<typeof setTimeout> | null = null;

  // --- 大纲面板状态(内容右侧标题清单,工具栏大纲按钮开关) ---
  /** 工具栏大纲控制 API(工具栏视图就绪后注入,销毁时回收)。 */
  let toolbarOutlineApi: ToolbarOutlineApi | null = null;
  /** 大纲面板是否展开。 */
  let outlineOpen = false;
  /** 大纲面板实例(懒创建,关闭仅切换显隐;随 wrapper 销毁)。 */
  let outlinePanel: OutlinePanelApi | null = null;

  // --- AI 会话框状态(底部会话框,生成内容流式插入文档) ---
  // 默认关闭:仅显式 ai.enabled === true 才装配。AI 入口(会话框/工具栏按钮/
  // 相关 API)默认不生效;需要 AI 能力的宿主显式开启。
  const aiEnabled = options.ai?.enabled === true;
  /** 工具栏 AI 控制 API(工具栏视图就绪后注入,销毁时回收)。 */
  let toolbarAiApi: ToolbarAiApi | null = null;
  /** AI 会话框是否展开。 */
  let aiOpen = false;
  /** AI 会话框实例(懒创建,关闭仅切换显隐;随 wrapper 销毁)。 */
  let aiPanel: AiPanelApi | null = null;
  /** AI 模型清单(最新值;面板懒创建时注入,运行期经 setAiModels 热更新)。 */
  let aiModels: AiModelConfig[] = [...(options.ai?.models ?? [])];

  /**
   * 应用大纲面板开关:展开时以当前文档标题清单渲染(懒创建),
   * 并同步工具栏按钮态(高亮/标题随动)。
   */
  const applyOutline = (active: boolean): void => {
    if (active === outlineOpen || (active && sourceModeActive)) {
      return;
    }
    outlineOpen = active;
    if (active) {
      if (!outlinePanel) {
        outlinePanel = createOutlinePanel({
          host: outlinePanelDiv,
          messages: resolvedMessages,
          // 编辑区即滚动容器(maxHeight 内滚或随宿主页面滚动均由其承接)。
          scrollContainer: editorArea,
          onJump: (id) => {
            runtime.scrollToHeading(id);
          },
        });
      }
      // 以当前文档标题清单渲染(面板创建后编辑期间的增量经 onHeadingsChange 推送)。
      outlinePanel.setHeadings(runtime.getHeadings() ?? []);
      outlinePanel.open();
    } else {
      outlinePanel?.close();
    }
    toolbarOutlineApi?.setMode({ active });
    onOutlineOpenChange?.(active);
  };

  /**
   * 应用 AI 会话框开关:懒创建面板(注入模型清单/流式实现与文档插入桥接),
   * 并同步工具栏按钮态。AI 未启用(ai.enabled 缺省)时整体不生效。
   */
  const applyAi = (active: boolean): void => {
    if (!aiEnabled || active === aiOpen) {
      return;
    }
    aiOpen = active;
    if (active) {
      if (!aiPanel) {
        aiPanel = createAiPanel({
          host: aiPanelDiv,
          messages: resolvedMessages,
          ai: {
            models: aiModels,
            // 缺省内置 OpenAI 兼容 SSE 客户端;宿主可注入自有网关实现。
            streamChat: options.ai?.streamChat ?? streamOpenAiCompatibleChat,
            ...(options.ai?.systemPrompt ? { systemPrompt: options.ai.systemPrompt } : {}),
          },
          delegate: {
            // 生成开始:编辑器锁定并在光标处建占位块(未就绪返回 false 放弃本次)。
            beginStream: () => runtime.aiStream.begin(),
            appendChunk: (delta) => {
              runtime.aiStream.append(delta);
            },
            endStream: (markdown) => {
              runtime.aiStream.end(markdown);
            },
            cancelStream: (markdownSoFar) => {
              runtime.aiStream.cancel(markdownSoFar);
            },
            failStream: () => {
              runtime.aiStream.fail();
            },
          },
        });
      }
      aiPanel.open();
    } else {
      aiPanel?.close();
    }
    toolbarAiApi?.setMode({ active });
  };

  // --- 编辑器运行时 ---
  const runtime: MilkdownEditorRuntime = createMilkdownEditorRuntime({
    root: editorArea,
    portalContainer,
    contentPortalContainer,
    toolbarHost: toolbarHostDiv,
    markdown: currentMarkdown,
    readOnly,
    messages: resolvedMessages,
    locale,
    slashMenu,
    imageUpload,
    shortcutMode,
    // 滚动容器选择器(缺省 meditor 自带类名,行为不变;宿主改类名时经此注入)。
    scrollContainerSelector,
    // 纯导航光标 → 内部双栏同步引擎 + 外部回调(引擎先行,外部兜底)。
    onCursorNavigate: (block) => {
      splitSyncHandle?.notifyMeditorCursor(block);
      onCursorNavigate?.(block);
    },
    // AI 未启用时从工具栏剔除 AI 按钮(与宿主 exclude 叠加)。
    toolbar: aiEnabled
      ? toolbar
      : { ...toolbar, exclude: [...(toolbar?.exclude ?? []), 'ai'] },
    // 传入解析后的生效值(简洁模式默认关),createEditor 据此决定是否注册块手柄插件。
    blockHandle: { enabled: blockHandleEnabled },
    chineseSymbols,
    // 显示控制布局块能力配置(js 沙箱执行开关等)。
    layoutBlock,
    // 自动配对括号(默认开)。
    autoPair,
    // Emoji `:` 输入自动补全(默认开)。
    emojiAutocomplete,
    // Markdown 扩展语法开关(行内公式/上下标/高亮/Mermaid;缺省全开)。
    markdownFeatures,
    // 图片显示地址解析器(相对路径图片显示期转换)。
    resolveImageUrl,
    // 严格换行(GFM)/智能标点/代码块行为。
    strictLineBreaks,
    smartPunctuation,
    codeBlock,
    // 标题清单变更(宿主回调 + 内部大纲面板增量刷新共用同一推送)。
    onHeadingsChange: (headings) => {
      outlinePanel?.setHeadings(headings);
      onHeadingsChange?.(headings);
    },
    // 大纲面板开关态变更(宿主据此同步菜单/侧栏态)。
    onOutlineOpenChange,
    // 搜索面板在 runtime 之后才创建,回调运行时 searchPanel 变量已初始化。
    onOpenSearch: () => openSearchPanel(),
    // 工具栏翻译按钮 → 整篇翻译编排;按钮态由就绪回调注入的 API 驱动。
    onToggleTranslate: () => {
      void toggleTranslate();
    },
    onTranslateApiReady: (api) => {
      toolbarTranslateApi = api;
    },
    // 工具栏布局按钮 → 布局模式编排;按钮态由就绪回调注入的 API 驱动。
    onToggleLayoutMode: () => {
      applyLayoutMode(!layoutModeActive);
    },
    onLayoutModeApiReady: (api) => {
      toolbarLayoutApi = api;
    },
    // 工具栏源码按钮 → 源码模式编排;按钮态由就绪回调注入的 API 驱动。
    onToggleSourceMode: () => {
      applySourceMode(!sourceModeActive);
    },
    onSourceModeApiReady: (api) => {
      toolbarSourceApi = api;
    },
    // 工具栏大纲按钮 → 大纲面板开关;按钮态由就绪回调注入的 API 驱动。
    onToggleOutline: () => {
      applyOutline(!outlineOpen);
    },
    onOutlineApiReady: (api) => {
      toolbarOutlineApi = api;
    },
    // 工具栏 AI 按钮 → AI 会话框开关;按钮态由就绪回调注入的 API 驱动。
    onToggleAi: () => {
      applyAi(!aiOpen);
    },
    onAiApiReady: (api) => {
      toolbarAiApi = api;
    },
    // slash 菜单插入布局块后自动进入布局模式(正常模式下块不可见)。
    onRequestLayoutMode: () => {
      applyLayoutMode(true);
    },
    onChange: handleChange,
    onSearchSnapshotChange: handleSearchSnapshotChange,
  });

  // --- 专注/打字机模式(wrapper 级属性驱动 CSS,插件经控制器驱动行为) ---

  /** 应用专注模式开关:wrapper 属性驱动降透明度样式 + 插件装饰开关。 */
  const applyFocusMode = (active: boolean): void => {
    wrapper.setAttribute('data-focus-mode', active ? 'on' : 'off');
    runtime.setFocusMode(active);
  };

  /** 应用打字机模式开关:插件在选区变化后滚动光标行至视口中线。 */
  const applyTypewriterMode = (active: boolean): void => {
    wrapper.setAttribute('data-typewriter-mode', active ? 'on' : 'off');
    runtime.setTypewriterMode(active);
  };

  /**
   * 应用布局模式进出:切换布局块显隐/删除保护并同步工具栏按钮态(内容不变)。
   */
  const applyLayoutMode = (active: boolean): void => {
    layoutModeActive = active;
    // wrapper 级属性驱动 CSS 显隐(.zt-md[data-layout-mode])。
    wrapper.setAttribute('data-layout-mode', active ? 'on' : 'off');
    // 行为插件模式态:布局模式下删除保护放行(块可见可编辑)。
    runtime.setLayoutModeActive(active);
    toolbarLayoutApi?.setMode({ active });
  };

  /** 源码文本框随内容自动增高(高度交由编辑区容器滚动,对齐富文本层行为)。 */
  const resizeSourceEditor = (): void => {
    if (!sourceEditor) {
      return;
    }
    sourceEditor.style.height = 'auto';
    sourceEditor.style.height = `${sourceEditor.scrollHeight}px`;
  };

  /** 外部整篇替换(受控回写/双栏同步/协作)到达时同步源码文本框内容。 */
  const syncSourceEditorValue = (markdown: string): void => {
    if (sourceModeActive && sourceEditor && sourceEditor.value !== markdown) {
      sourceEditor.value = markdown;
      resizeSourceEditor();
    }
  };

  /** 源码文本输入:内容实时落 currentMarkdown,onChange 按富文本层同频防抖。 */
  const handleSourceEditorInput = (): void => {
    if (!sourceEditor) {
      return;
    }
    resizeSourceEditor();
    currentMarkdown = sourceEditor.value;
    if (sourceInputTimer !== null) {
      clearTimeout(sourceInputTimer);
    }
    sourceInputTimer = setTimeout(() => {
      sourceInputTimer = null;
      handleChange(currentMarkdown);
    }, debounceMs);
  };

  /**
   * 应用源码模式进出:富文本层隐藏,整篇内容切换为 Markdown 源码文本框编辑,
   * 退出时把文本框内容整篇写回(内容未变则免写回,避免无谓的文档重排)。
   */
  const applySourceMode = (active: boolean): void => {
    // 只读实例与翻译视图不进入源码模式(源码编辑会绕过只读语义/改写译文);
    // AI 生成中同样不进入(源码文本框与流式插入互斥)。
    if (active === sourceModeActive || readOnly || translateModeActive) {
      return;
    }
    if (active && runtime.aiStream.isStreaming()) {
      return;
    }
    sourceModeActive = active;
    // wrapper 级属性驱动 CSS 显隐(.zt-md[data-source-mode])。
    wrapper.setAttribute('data-source-mode', active ? 'on' : 'off');

    if (active) {
      // 进入前关闭搜索面板:查找/替换作用于隐藏的富文本层;大纲面板同理由
      // (源码文本框无标题锚点 DOM,面板高亮与跳转都会失真);AI 会话框亦然
      // (生成入口随富文本层锁定)。
      searchPanel?.close();
      applyOutline(false);
      if (aiOpen) {
        applyAi(false);
      }
      if (!sourceEditor) {
        sourceEditor = document.createElement('textarea');
        sourceEditor.className = 'meditor-source-editor';
        sourceEditor.setAttribute('aria-label', resolvedMessages.toolbarSourceModeTitle);
        sourceEditor.spellcheck = false;
        sourceEditor.addEventListener('input', handleSourceEditorInput);
        editorArea.appendChild(sourceEditor);
      }
      // 展示最近一次源码快照(currentMarkdown)而非 runtime.getMarkdown():
      // 后者是当前文档的重新序列化结果,会把紧凑源码规范化成块间空行,
      // 与宿主存盘/记事本打开的内容(同源于 currentMarkdown)不一致;
      // 与保存路径同一取值,所见即所存。当前Markdown 存在最长一个 onChange
      // 防抖周期的滞后,与 Ctrl+S 直接存 currentMarkdown 的既有语义一致。
      sourceEditorInitialMarkdown = currentMarkdown;
      sourceEditor.value = sourceEditorInitialMarkdown;
      // 保持视口:显示层切换前后编辑区滚动位置不变;光标置于文首承接键盘编辑。
      const scrollTop = editorArea.scrollTop;
      requestAnimationFrame(() => {
        resizeSourceEditor();
        editorArea.scrollTop = scrollTop;
        sourceEditor?.focus();
        sourceEditor?.setSelectionRange(0, 0);
      });
    } else {
      // 退出:文本框内容整篇写回(经唯一入口同步富文本层/onChange/双栏)。
      if (sourceInputTimer !== null) {
        clearTimeout(sourceInputTimer);
        sourceInputTimer = null;
      }
      if (
        sourceEditor &&
        sourceEditorInitialMarkdown !== null &&
        sourceEditor.value !== sourceEditorInitialMarkdown
      ) {
        const nextMarkdown = sourceEditor.value;
        runtime.setMarkdown(nextMarkdown);
        if (!isControlled) {
          currentMarkdown = nextMarkdown;
        }
        handleChange(nextMarkdown);
      }
      sourceEditorInitialMarkdown = null;
    }
    toolbarSourceApi?.setMode({ active });
  };

  /**
   * 应用翻译模式进出:替换内容、切换只读、同步编辑区类名/aria 与工具栏按钮态。
   */
  const applyTranslateMode = (active: boolean, markdown: string): void => {
    // 翻译视图前关闭搜索面板:替换/全部替换会改写译文内容。
    if (active) {
      searchPanel?.close();
    }
    // 保持视口:整篇替换后滚动位置尽量停在原处(进入与退出都恢复)。
    const scrollTop = editorArea.scrollTop;
    runtime.setMarkdown(markdown);
    runtime.setEditable(!active);
    requestAnimationFrame(() => {
      editorArea.scrollTop = scrollTop;
    });
    translateModeActive = active;
    wrapper.setAttribute('data-translate', active ? 'true' : 'false');
    // 翻译视图不点亮只读徽标(data-readonly 驱动右上角标签,按设计反馈不展示);
    // 只读交互语义由编辑区类名 + aria-readonly 保证。徽标标签仅在初始只读时存在,无需随切换改写。
    wrapper.setAttribute('data-readonly', readOnly ? 'true' : 'false');
    editorArea.classList.toggle('zt-md-readonly', active || readOnly);
    editorArea.classList.toggle('zt-md-editable', !(active || readOnly));
    editorArea.setAttribute('aria-readonly', String(active || readOnly));
    toolbarTranslateApi?.setMode({ active, loading: false });
  };

  /**
   * 切换整篇翻译模式:进入 → 全文送翻并进入只读翻译视图;退出 → 恢复原文与编辑态。
   * 原文未变的再次进入命中缓存,不重复请求。
   */
  async function toggleTranslate(): Promise<void> {
    // 源码视图不触发整篇翻译:翻译会替换隐藏富文本层内容,与源码文本框脱节;
    // AI 生成中同样不触发(整篇替换会使流式占位块失效)。
    if (translateInFlight || sourceModeActive || runtime.aiStream.isStreaming()) {
      return;
    }

    // 退出:恢复原文快照与编辑态(译文缓存保留,原文未变的再次进入免二次请求)。
    if (translateModeActive) {
      const original = translateOriginalMarkdown ?? '';
      translateOriginalMarkdown = null;
      applyTranslateMode(false, original);
      return;
    }

    // 进入:取当前内容送翻;空文档无事可译。
    const source = runtime.getMarkdown() ?? currentMarkdown;
    if (source.trim().length === 0) {
      return;
    }
    if (translateCache && translateCache.source === source) {
      translateOriginalMarkdown = source;
      applyTranslateMode(true, translateCache.result);
      return;
    }

    translateInFlight = true;
    toolbarTranslateApi?.setMode({ active: false, loading: true });
    try {
      // 端点注入:宿主可用 options.translateEndpoint 覆盖默认端点(合规网关)。
      const translated = await translateMarkdown(
        source,
        translateEndpoint !== undefined ? { endpoint: translateEndpoint } : undefined,
      );
      if (isDestroyed) {
        return;
      }
      // 翻译等待期间文档又被编辑:放弃本次进入(译文已不对应最新内容),保持编辑态。
      if ((runtime.getMarkdown() ?? currentMarkdown) !== source) {
        console.info('[meditor] translate skipped: document changed during translation');
        toolbarTranslateApi?.setMode({ active: false, loading: false });
        return;
      }
      translateCache = { source, result: translated };
      translateOriginalMarkdown = source;
      applyTranslateMode(true, translated);
    } catch (error) {
      // 失败保持原文编辑态;按钮短暂提示失败文案。
      console.error('[meditor] translate failed', error);
      if (!isDestroyed) {
        toolbarTranslateApi?.setMode({ active: false, loading: false, failed: true });
      }
    } finally {
      translateInFlight = false;
    }
  }

  /**
   * 初始化失败兜底渲染:create() 失败时在编辑区展示错误提示(复用 .zt-md-error 样式),
   * 避免宿主拿到一块白屏。
   */
  const renderInitError = (): void => {
    if (editorArea.querySelector(':scope > .zt-md-error')) {
      return;
    }
    const errorBox = document.createElement('div');
    errorBox.className = 'zt-md-error';
    errorBox.setAttribute('role', 'alert');
    errorBox.textContent = resolvedMessages.initError;
    editorArea.appendChild(errorBox);
  };

  // 同步调用 editor.create():所有 use/config 必须在 create() 同步执行,
  // 不能在 microtask 中触发(否则 InitReady timer 注册会失败)。
  // 包在 try/catch 里保证 API 仍能返回;失败时 setTimeout 重试一次。
  try {
    void runtime.editor
      .create()
      .then(() => {
        requestAnimationFrame(() => {
          runtime.installRuntimePlugins();
        });
      })
      .catch((err: unknown) => {
        console.error('[meditor] editor.create() failed', err);
        console.error('[meditor] stack:', (err as Error)?.stack);
        renderInitError();
      });
  } catch (err) {
    console.error('[meditor] editor.create() sync failed', err);
    renderInitError();
  }

  // --- P4 协作门面(版本历史 / 评论锚定 / 实时协同) ---
  // 默认关闭:仅显式 collab.enabled === true 才装配。协作装配含 45s 全文快照
  // 定时器、MemoryHistoryStore/MemoryCommentStore 与评论锚定插件,多实例场景
  // 下默认装配会让每个实例常驻定时器与存储;需要协作的宿主显式开启。
  const collab =
    options.collab?.enabled === true
      ? createMeditorCollab(
          {
            getMarkdown: () => runtime.getMarkdown() ?? currentMarkdown,
            setMarkdown: (markdown: string) => {
              // AI 生成中跳过协作写回(同整篇替换保护)。
              if (runtime.aiStream.isStreaming()) {
                return;
              }
              runtime.setMarkdown(markdown);
              if (!isControlled) {
                currentMarkdown = markdown;
              }
              syncSourceEditorValue(markdown);
            },
          },
          runtime,
          {
            ...(options.collab?.documentId ? { documentId: options.collab.documentId } : {}),
            locale,
          },
        )
      : null;

  // --- 搜索面板 ---
  let searchPanel: SearchPanelApi | null = null;
  let searchOptions: EditorSearchOptions = {
    search: '',
    replace: '',
    caseSensitive: false,
    wholeWord: false,
    regexp: false,
  };

  /**
   * 打开搜索面板。面板实例懒创建并长期复用(开/关仅切换显隐),
   * 避免"每次打开重建面板"在容器里残留隐藏 DOM。
   */
  const openSearchPanel = (): void => {
    if (!searchPanel) {
      searchPanel = createSearchPanel({
        container: searchPanelDiv,
        messages: resolvedMessages,
        onOptionsChange: (nextOptions) => {
          searchOptions = { ...searchOptions, ...nextOptions };
          runtime.searchController.updateQuery(searchOptions);
        },
        onFindNext: () => {
          runtime.searchController.findNext();
        },
        onFindPrevious: () => {
          runtime.searchController.findPrevious();
        },
        onClose: () => {
          // 状态标记:只读徽标让位规则依赖 data-search-open;面板实例保留复用。
          wrapper.setAttribute('data-search-open', 'false');
        },
        onReplaceCurrent: (replacement: string) => {
          searchOptions = { ...searchOptions, replace: replacement };
          runtime.searchController.replaceCurrent();
        },
        onReplaceAll: (replacement: string) => {
          searchOptions = { ...searchOptions, replace: replacement };
          runtime.searchController.replaceAll();
        },
      });
    }
    searchPanel.open();
    wrapper.setAttribute('data-search-open', 'true');
  };

  // --- 快捷键 ---
  const handleKeyDown = (event: KeyboardEvent): void => {
    const onMac = isMac();
    const modKey = onMac ? event.metaKey : event.ctrlKey;
    if (modKey && event.key === 'f') {
      // 翻译只读视图不打开搜索替换:替换会改写译文内容;源码视图同理(替换作用于隐藏富文本层)。
      if (!translateModeActive && !sourceModeActive) {
        event.preventDefault();
        openSearchPanel();
      }
      return;
    }

    if (event.key === 'Escape') {
      searchPanel?.close();
      // AI 会话框打开时 Escape 收起(生成中不收起,先经停止按钮中断)。
      if (aiOpen && !aiPanel?.isGenerating()) {
        applyAi(false);
      }
      // 源码文本框内 Escape:退出源码模式(写回文本框内容)。
      if (sourceModeActive && event.target === sourceEditor) {
        applySourceMode(false);
      }
      return;
    }

    // 搜索面板打开时:搜索输入框内 Enter 定位下一项,Shift+Enter 上一项(对齐原版)。
    if (!searchPanel || event.isComposing) {
      return;
    }
    const isSearchInput =
      event.target instanceof HTMLInputElement &&
      event.target.closest('.zt-md-search-panel') !== null;
    if (!isSearchInput || event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    if (event.shiftKey) {
      runtime.searchController.findPrevious();
      return;
    }

    runtime.searchController.findNext();
  };
  root.addEventListener('keydown', handleKeyDown);

  // --- 点击编辑区空白(内容下方大片留白/容器 padding)→ 就近聚焦 ---
  // .ProseMirror 只与内容同高,空白点击落不到 ProseMirror 上,默认无任何反应;
  // 这里接管落在容器自身(target === editorArea)的按下并交给 focusEditor:
  // 末块下方 → 补空段落开新行准备输入(已是空段落则光标直入,不重复建块);
  // 其余留白 → posAtCoords 就近落点。只读态/翻译视图不接管;滚动条命中不夺焦。
  const handleBlankAreaMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0 || readOnly || translateModeActive || sourceModeActive) {
      return;
    }
    if (event.target !== editorArea) {
      return;
    }
    // 编辑器视图未挂载完成时 focusEditor 无法取 view,直接忽略本次点击。
    if (!editorArea.querySelector('.ProseMirror')) {
      return;
    }
    // 纵向滚动条命中区在 content box 右缘之外,拖拽滚动条不应触发聚焦。
    const areaRect = editorArea.getBoundingClientRect();
    if (event.clientX > areaRect.left + editorArea.clientWidth) {
      return;
    }
    event.preventDefault();
    runtime.focusEditor({ top: event.clientY, left: event.clientX });
  };
  editorArea.addEventListener('mousedown', handleBlankAreaMouseDown);

  /**
   * 观察外部 value 变化(受控模式)。
   *
   * 受控语义:宿主传入 `value` 后进入受控模式,轮询闭包每次读 `options.value`
   * (不可解构——解构值是创建时刻的旧引用,`value !== prevValue` 恒 false,
   * 外部更新将永远失效)并在检测到外部变更时经内部 setMarkdown 应用;
   * `debounceMs` 即轮询间隔(默认 250ms)。内部编辑仍实时走 onChange,
   * 宿主把最新内容回写 value 即形成受控闭环。
   */
  let prevValue = options.value;
  const observer: ReturnType<typeof setInterval> | null = isControlled
    ? setInterval(() => {
        // 每次轮询读 props 最新值(options 对象由宿主持有,字段更新立即可见)。
        const nextValue = options.value;
        if (nextValue !== undefined && nextValue !== prevValue) {
          // AI 生成中推迟应用外部值(prevValue 不动,流结束后下一轮轮询再应用)。
          if (runtime.aiStream.isStreaming()) {
            return;
          }
          prevValue = nextValue;
          // 受控模式下 value 即真相源:应用外部值时同步 currentMarkdown,
          // 保证 getMarkdown() 不返回被覆盖前的旧内容。
          currentMarkdown = nextValue;
          runtime.setMarkdown(nextValue);
          syncSourceEditorValue(nextValue);
        }
      }, debounceMs)
    : null;

  return {
    getMarkdown: () => currentMarkdown,
    getStats: () => runtime.getStats(),
    collab,
    setMarkdown: (markdown: string) => {
      // AI 生成中的整篇替换会使流式占位块失效:丢弃本次替换(流结束后的变更照常应用)。
      if (runtime.aiStream.isStreaming()) {
        return;
      }
      runtime.setMarkdown(markdown);
      if (!isControlled) {
        currentMarkdown = markdown;
      }
      syncSourceEditorValue(markdown);
    },
    focus: () => {
      runtime.focusEditor();
    },
    openSearch: () => openSearchPanel(),
    closeSearch: () => searchPanel?.close(),
    getSearchSnapshot: () => instanceSnapshot,
    updateSearchOptions: (nextOptions: Partial<EditorSearchOptions>) => {
      searchOptions = { ...searchOptions, ...nextOptions };
      searchPanel?.updateOptions(searchOptions);
      runtime.searchController.updateQuery(searchOptions);
    },
    replaceCurrent: () => {
      runtime.searchController.replaceCurrent();
    },
    replaceAll: () => {
      runtime.searchController.replaceAll();
    },
    getViewportInfo: () => runtime.getViewportInfo(),
    getCursorBlock: () => runtime.getCursorBlock(),
    getMarkdownBlocks: () => runtime.getMarkdownBlocks(),
    scrollToBlock: (pos, align) => {
      runtime.scrollToBlock(pos, align);
    },
    scrollToProgress: (progress) => {
      runtime.scrollToProgress(progress);
    },
    toggleTranslate: () => toggleTranslate(),
    setLayoutMode: (active) => {
      applyLayoutMode(active);
    },
    toggleLayoutMode: () => {
      applyLayoutMode(!layoutModeActive);
      return layoutModeActive;
    },
    setSourceMode: (active) => {
      applySourceMode(active);
    },
    toggleSourceMode: () => {
      applySourceMode(!sourceModeActive);
      return sourceModeActive;
    },
    getMarkdownForLLM: () => stripMeditorLayoutBlocks(currentMarkdown),
    getHeadings: () => runtime.getHeadings(),
    scrollToHeading: (id) => runtime.scrollToHeading(id),
    setAiOpen: (active) => {
      applyAi(active);
    },
    toggleAi: () => {
      applyAi(!aiOpen);
      return aiOpen;
    },
    isAiOpen: () => aiOpen,
    setAiModels: (models) => {
      aiModels = [...models];
      aiPanel?.setModels(aiModels);
    },
    setOutlineOpen: (active) => {
      applyOutline(active);
    },
    toggleOutline: () => {
      applyOutline(!outlineOpen);
      return outlineOpen;
    },
    isOutlineOpen: () => outlineOpen,
    getStandaloneHtml: () => runtime.getStandaloneHtml(),
    setSpellcheck: (active) => {
      runtime.setSpellcheck(active);
    },
    setSpellcheckLang: (lang) => {
      runtime.setSpellcheckLang(lang);
    },
    setFocusMode: (active) => {
      applyFocusMode(active);
    },
    setTypewriterMode: (active) => {
      applyTypewriterMode(active);
    },
    setSplitPartner: (partner) => {
      splitSyncHandle?.destroy();
      splitSyncHandle = null;
      if (!partner) {
        return;
      }
      splitSyncHandle = createSplitScrollSync(
        {
          getViewportInfo: () => runtime.getViewportInfo(),
          getMarkdownBlocks: () => runtime.getMarkdownBlocks(),
          scrollToBlock: (pos, align) => {
            runtime.scrollToBlock(pos, align);
          },
          scrollToProgress: (progress) => {
            runtime.scrollToProgress(progress);
          },
          // 内容双向同步基准:以运行时序列化结果为准(实时性优于闭包缓存)。
          getMarkdown: () => runtime.getMarkdown() ?? currentMarkdown,
          setMarkdown: (markdown) => {
            // AI 生成中跳过对侧写回(同整篇替换保护)。
            if (runtime.aiStream.isStreaming()) {
              return;
            }
            runtime.setMarkdown(markdown);
            if (!isControlled) {
              currentMarkdown = markdown;
            }
            syncSourceEditorValue(markdown);
          },
          getMarkdownSelection: () => runtime.getMarkdownSelection(),
          setMarkdownSelection: (start, end) => runtime.setMarkdownSelection(start, end),
          clearMarkdownSelectionHighlight: () => runtime.clearMarkdownSelectionHighlight(),
        },
        partner,
      );
    },
    destroy: () => {
      isDestroyed = true;
      if (sourceInputTimer !== null) {
        clearTimeout(sourceInputTimer);
        sourceInputTimer = null;
      }
      splitSyncHandle?.destroy();
      splitSyncHandle = null;
      outlinePanel?.destroy();
      outlinePanel = null;
      aiPanel?.destroy();
      aiPanel = null;
      if (observer !== null) {
        clearInterval(observer);
      }
      collab?.destroy();
      root.removeEventListener('keydown', handleKeyDown);
      editorArea.removeEventListener('mousedown', handleBlankAreaMouseDown);
      runtime.destroy();
      wrapper.remove();
    },
  };
}
