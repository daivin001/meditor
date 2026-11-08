/**
 * src/meditor.d.ts — vendor 的 @meditor/editor 产物类型声明
 *
 * 完整类型见 @meditor/editor 的 dist-types,此处仅声明桌面壳用到的子集,
 * 使 `import { createMeditor } from '@meditor/editor'` 可类型检查。
 */

declare module '@meditor/editor' {
  export interface MeditorStats {
    /** 字符数(不含换行)。 */
    characters: number;
    /** 词数(CJK 逐字 + 西文按词)。 */
    words: number;
  }

  /** 标题锚点清单项(大纲面板数据源)。 */
  export interface MeditorHeading {
    /** 锚点 id。 */
    id: string;
    /** 标题级别 1~6。 */
    level: number;
    /** 标题纯文本。 */
    text: string;
    /** 节点在文档中的位置。 */
    pos: number;
  }

  /** AI 模型配置(OpenAI 兼容接口;DeepSeek/自建网关等同协议)。 */
  export interface AiModelConfig {
    /** 显示名称。 */
    name: string;
    /** 接口基础地址(如 https://api.deepseek.com/v1)。 */
    baseUrl: string;
    /** API Key(Bearer 方式携带)。 */
    apiKey: string;
    /** 模型 ID(如 deepseek-chat)。 */
    model: string;
  }

  export interface MeditorApi {
    /** 获取当前 Markdown 内容。 */
    getMarkdown: () => string;
    /** 设置 Markdown 内容(整体替换)。 */
    setMarkdown: (markdown: string) => void;
    /**
     * 当前 Markdown 剥离全部显示控制布局块(meditor-layout 围栏)后的版本
     * (供大模型消费,避免布局信息污染正文信息量)。
     */
    getMarkdownForLLM: () => string;
    /** 开启/关闭布局模式(布局块仅在该模式下可见可编辑,正常模式完全隐藏)。 */
    setLayoutMode: (active: boolean) => void;
    /** 切换布局模式,返回切换后的状态。 */
    toggleLayoutMode: () => boolean;
    /** 开启/关闭源码模式(整篇以 Markdown 源码文本编辑,退出时写回)。 */
    setSourceMode: (active: boolean) => void;
    /** 切换源码模式,返回切换后的状态。 */
    toggleSourceMode: () => boolean;
    /** 字数统计;编辑器未就绪时返回 null。 */
    getStats: () => MeditorStats | null;
    /** 聚焦编辑器。 */
    focus: () => void;
    /** 打开搜索面板。 */
    openSearch: () => void;
    /** 关闭搜索面板。 */
    closeSearch: () => void;
    /** 销毁编辑器。 */
    destroy: () => void;
    /** 标题锚点清单(大纲面板数据源);未就绪返回 null。 */
    getHeadings: () => MeditorHeading[] | null;
    /** 滚动到指定锚点 id 的标题。 */
    scrollToHeading: (id: string) => boolean;
    /** 开启/关闭大纲面板(内容右侧标题清单;与工具栏大纲按钮同状态)。 */
    setOutlineOpen: (active: boolean) => void;
    /** 切换大纲面板,返回切换后的状态。 */
    toggleOutline: () => boolean;
    /** 大纲面板是否展开。 */
    isOutlineOpen: () => boolean;
    /** 开启/关闭 AI 会话框(底部会话框,生成内容流式插入文档)。 */
    setAiOpen: (active: boolean) => void;
    /** 切换 AI 会话框,返回切换后的状态。 */
    toggleAi: () => boolean;
    /** AI 会话框是否展开。 */
    isAiOpen: () => boolean;
    /** 热更新 AI 模型清单(设置变更时推送;进行中的生成不受影响)。 */
    setAiModels: (models: AiModelConfig[]) => void;
    /** 当前文档的独立单文件 HTML 导出(内联样式)。 */
    getStandaloneHtml: () => string | null;
    /** 运行时拼写检查开关。 */
    setSpellcheck: (active: boolean) => void;
    /** 运行时拼写检查语言(编辑区 lang 属性;空串清除)。 */
    setSpellcheckLang: (lang: string) => void;
    /** 开启/关闭专注模式。 */
    setFocusMode: (active: boolean) => void;
    /** 开启/关闭打字机模式。 */
    setTypewriterMode: (active: boolean) => void;
  }

  /** 显示控制布局块信息(meditor-layout 围栏枚举结果)。 */
  export interface MeditorLayoutBlockInfo {
    /** 围栏 lang(原始首 token,如 meditor-layout / meditor-layout:html)。 */
    lang: string;
    /** info string 中 lang 之后的剩余部分(无则为 null)。 */
    meta: string | null;
    /** 围栏内容原文(不含围栏行)。 */
    value: string;
  }

  /** 枚举 markdown 中的全部显示控制布局块(按文档顺序)。 */
  export function listMeditorLayoutBlocks(markdown: string): MeditorLayoutBlockInfo[];

  /** 剥离 markdown 中的全部显示控制布局块(整块移除含围栏行)。 */
  export function stripMeditorLayoutBlocks(markdown: string): string;

  export interface ToolbarConfig {
    visible?: boolean;
    mode?: 'simple' | 'full';
    /** 工具栏对齐方式(默认 'left' 靠左)。 */
    align?: 'left' | 'center' | 'right';
    /** 要剔除的内置命令(如桌面壳把布局模式入口收进应用菜单)。 */
    exclude?: string[];
  }

  export interface ImageUploadConfig {
    /** 自定义图片上传函数,返回可插入文档的图片链接。 */
    upload?: (file: File) => string | Promise<string>;
    /** 允许的最大文件体积(字节)。 */
    maxFileSize?: number;
  }

  /** Markdown 扩展语法开关(缺省全部开启;关闭项语法文本原样保留)。 */
  export interface MeditorMarkdownFeatures {
    math?: boolean;
    superscript?: boolean;
    subscript?: boolean;
    highlight?: boolean;
    mermaid?: boolean;
  }

  /** 代码块编辑行为。 */
  export interface MeditorCodeBlockConfig {
    /** 代码块左侧显示行号(默认 false)。 */
    lineNumbers?: boolean;
    /** 代码块自动换行(默认 false:横向滚动)。 */
    wordWrap?: boolean;
  }

  export interface MeditorOptions {
    /** 编辑器挂载根节点(必需)。 */
    root: HTMLElement;
    /** 受控内容。 */
    value?: string;
    /** 非受控初始内容。 */
    defaultValue?: string;
    /** 内容变更回调(已防抖)。 */
    onChange?: (markdown: string) => void;
    /** 主题。 */
    theme?: 'light' | 'dark';
    /** 界面语言。 */
    locale?: 'zh-CN' | 'en-US';
    /** 只读模式。 */
    readOnly?: boolean;
    /** 空文档占位文案。 */
    placeholder?: string;
    /** 编辑区最大高度。 */
    maxHeight?: number;
    /** 顶部工具栏配置。 */
    toolbar?: ToolbarConfig;
    /** 图片上传配置。 */
    imageUpload?: ImageUploadConfig;
    /** 附加根节点 class。 */
    className?: string;
    /** 自动配对括号(默认 true)。 */
    autoPair?: boolean;
    /** Emoji `:` 输入自动补全(默认 true)。 */
    emojiAutocomplete?: boolean;
    /** Markdown 扩展语法开关。 */
    markdownFeatures?: MeditorMarkdownFeatures;
    /** 图片显示地址解析器(相对路径图片显示期转换,不写入文档)。 */
    resolveImageUrl?: (src: string) => string;
    /** 严格换行(GFM):段落内单独换行渲染为空格(默认 false)。 */
    strictLineBreaks?: boolean;
    /** 智能标点(SmartyPants;默认 false)。 */
    smartPunctuation?: boolean;
    /** 代码块编辑行为(行号/自动换行)。 */
    codeBlock?: MeditorCodeBlockConfig;
    /** 标题自动编号(仅显示;默认 false)。 */
    headingNumbering?: boolean;
    /** AI 助手能力配置(默认不装配;模型清单;流式实现/系统提示缺省内置)。 */
    ai?: {
      /** 是否装配 AI 助手(默认 false;桌面客户端显式开启)。 */
      enabled?: boolean;
      models?: AiModelConfig[];
      streamChat?: (request: {
        model: AiModelConfig;
        messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
        signal: AbortSignal;
        onDelta: (delta: string) => void;
      }) => Promise<void>;
      systemPrompt?: string;
    };
    /** 标题清单变更回调(大纲面板数据源)。 */
    onHeadingsChange?: (headings: MeditorHeading[]) => void;
    /** 大纲面板开关态变更回调(工具栏按钮/宿主 API 触发均通知)。 */
    onOutlineOpenChange?: (open: boolean) => void;
  }

  export function createMeditor(options: MeditorOptions): MeditorApi;
}

declare module '*/vendor/meditor/style-inline.js' {
  /** meditor 全部样式的合并 CSS 文本(dev 测试页向 shadow root 注入用)。 */
  export const meditorStyleText: string;
}
