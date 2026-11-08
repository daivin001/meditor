/**
 * plugins/preset-common.ts — 默认插件收集器
 *
 * 1:1 翻译自 zt-react-milkdown/src/plugins/preset-common.ts
 */
import type { EditorPluginDescriptor } from '../types/plugin';

/**
 * 默认插件导出集合。
 */
export interface PresetPluginExports {
  /** listener 插件实例。 */
  listener: unknown;
  /** commonmark 插件实例。 */
  commonmark: unknown;
  /** 行内颜色/高亮 mark 插件组实例。 */
  colorMarks: unknown | unknown[];
  /** 标注块(Callout)插件组实例。 */
  callout: unknown | unknown[];
  /** 折叠块(Toggle)插件组实例。 */
  toggle: unknown | unknown[];
  /** JSON 数据视图块(jsondata-view)插件组实例。 */
  jsondataView: unknown | unknown[];
  /** 媒体嵌入块(视频/音频/书签/内嵌)插件组实例。 */
  mediaEmbed: unknown | unknown[];
  /** 任务列表块转换快捷键实例。 */
  taskListTransformKeymap: unknown | unknown[];
  /** 行内代码右边界导航插件实例。 */
  inlineCodeBoundaryNavigation: unknown;
  /** gfm 插件实例。 */
  gfm: unknown;
  /** history 插件实例。 */
  history: unknown;
  /** 编辑器搜索插件实例。 */
  editorSearch: unknown | unknown[];
  /** 代码块 prism 高亮插件实例。 */
  codeBlockPrism: unknown;
  /** HTML 表格还原 remark 插件实例(合并单元格 markdown 往返解析侧)。 */
  tableHtmlParse: unknown;
  /** clipboard 插件实例。 */
  clipboard: unknown;
  /** indent 插件实例。 */
  indent: unknown;
  /** 图片两段式删除插件实例。 */
  imageDeleteSelection: unknown;
  /** 图片粘贴上传插件实例。 */
  imagePaste: unknown;
  /** 表格方向键进入插件实例。 */
  tableArrowEntry: unknown;
  /** 特殊内容块边界导航插件实例。 */
  blockBoundaryNavigation: unknown;
  /** 标题前空白段落 Backspace 删除插件实例。 */
  headingBackspaceEmptyParagraph: unknown;
  /** 公式块 Backspace 进入插件实例。 */
  mathBackspaceEntry: unknown;
  /** 引用块首段 Backspace 提升插件实例。 */
  blockquoteBackspaceLift: unknown;
  /** 表格聚焦操作插件实例。 */
  tableFocusActions: unknown;
  /** 选中文本 tooltip 菜单插件实例。 */
  selectionTooltip: unknown;
  /** 块间光标插件实例。 */
  gapCursor: unknown;
  /** 拖拽落点指示器插件实例。 */
  dropCursor: unknown;
  /** 尾随段落保证插件实例(文档末块非段落/标题时自动补空段落)。 */
  trailingParagraph: unknown;
  /** math 插件实例(可为单个插件或插件数组)。 */
  math: unknown | unknown[];
  /** 行内公式编辑插件实例。 */
  mathInlineEdit: unknown;
  /** 行内公式方向键导航插件实例。 */
  mathInlineArrowNavigation: unknown;
  /** CSV 表格块插件实例(mtable 插件数组)。 */
  mtable: unknown | unknown[];
  /** 显示控制布局块插件组实例(meditor-layout 围栏 → 原子节点)。 */
  layoutBlock: unknown | unknown[];
  /** 隐藏布局块行为插件实例(方向键跳过 + 删除保护)。 */
  layoutBlockBehavior: unknown;
  /** 布局指令渲染效果插件实例(Decoration.node + wrapper 属性)。 */
  layoutBlockEffect: unknown;
  /** 任务列表交互插件实例。 */
  taskListToggle: unknown;
  /** 任务列表快捷输入规则插件组实例。 */
  taskListInputRule: unknown | unknown[];
  /** 中文符号快捷输入规则插件组实例(关闭时为空数组)。 */
  chineseSymbolsInputRule: unknown | unknown[];
  /** 全局 Tab 空格缩进插件实例。 */
  tabSpaceIndent: unknown;
  /** 代码块内 Mod-A 全选插件实例。 */
  codeBlockModASelect: unknown;
  /** 光标导航插件实例(纯导航上报,可为 null 表示关闭)。 */
  cursorNavigate: unknown | null;
  /** 远端选区高亮插件实例(双栏同步对侧选区可见高亮)。 */
  remoteSelectionHighlight: unknown;
  /** 行内扩展格式插件组(下划线/上下标 mark + Typora 风语法解析)。 */
  inlineExtMarks: unknown | unknown[];
  /** 行内扩展输入规则插件组(==/~/^ 包裹 + Mod-U)。 */
  inlineExtInputRules: unknown | unknown[];
  /** 标题锚点插件实例(大纲/[toc]/文内跳转共用锚点装饰)。 */
  headingAnchor: unknown;
  /** 标题清单变更插件实例(doc 变更轻防抖回调,可为 null 表示关闭)。 */
  headingsChange: unknown | null;
  /** 目录块插件组(remark 转换 + schema + 刷新分发)。 */
  toc: unknown | unknown[];
  /** AI 流式占位块 schema(生成期间临时节点,序列化输出空)。 */
  aiStream: unknown;
  /** 脚注插件组(remark 转换 + 两个 schema + 点击行为)。 */
  footnote: unknown | unknown[];
  /** YAML Front Matter 插件组。 */
  frontMatter: unknown | unknown[];
  /** 自动配对括号插件实例(关闭时为 null)。 */
  autoPair: unknown | null;
  /** Emoji `:` 自动补全插件实例(关闭时为 null)。 */
  emojiAutocomplete: unknown | null;
  /** 智能标点插件实例(SmartyPants,关闭时为 null)。 */
  smartPunctuation: unknown | null;
  /** 图片拖拽插入插件实例。 */
  imageDrop: unknown;
  /** 专注/打字机模式插件实例。 */
  writingMode: unknown;
  /** slash 插件实例(可为 null 表示关闭)。 */
  slash?: unknown | null;
  /** 顶部工具栏插件实例(可为 null 表示关闭)。 */
  toolbar?: unknown | null;
  /** 块手柄插件组实例(block + provider,可为 null 表示关闭)。 */
  blockHandle?: unknown | null;
}

/**
 * 默认插件收集配置。
 */
export interface ResolvePresetPluginsOptions {
  /** 是否包含运行时延迟注册插件。 */
  includeRuntime?: boolean;
}

/**
 * 将单个或多个插件统一追加到描述列表。
 */
const appendPluginDescriptors = (
  descriptors: EditorPluginDescriptor[],
  baseName: string,
  pluginOrPlugins: unknown | unknown[]
): void => {
  if (pluginOrPlugins == null) {
    return;
  }
  if (Array.isArray(pluginOrPlugins)) {
    pluginOrPlugins.forEach((plugin, index) => {
      if (plugin == null) return;
      descriptors.push({ name: `${baseName}-${index}`, plugin });
    });
    return;
  }

  descriptors.push({ name: baseName, plugin: pluginOrPlugins });
};

/**
 * 基于显式插件导出收集默认插件。
 */
export const resolvePresetPlugins = (
  pluginExports: PresetPluginExports,
  options: ResolvePresetPluginsOptions = {}
): EditorPluginDescriptor[] => {
  /** 默认插件描述列表。 */
  const descriptors: EditorPluginDescriptor[] = [];
  /** 是否包含运行时插件。 */
  const includeRuntime = options.includeRuntime ?? true;

  appendPluginDescriptors(descriptors, 'listener', pluginExports.listener);
  // slash 弹出菜单必须在所有按键消费插件(边界导航/表格方向键/行内公式导航等)之前注册:
  // ProseMirror 按注册顺序调用 handleKeyDown,首个返回 true 者拦截按键。菜单打开时
  // 导航键(ArrowUp/Down/Enter/Escape)必须优先归菜单——否则光标停在文档末块末尾
  // (键入 '/' 的典型位置)按 ArrowDown 会被 block-boundary-navigation 的"末块后补段落"
  // 抢先消费,光标跳到新段落、菜单关闭。菜单未打开时 slash 对所有按键返回 false,次序无影响。
  if (pluginExports.slash) {
    appendPluginDescriptors(descriptors, 'slash', pluginExports.slash);
  }
  // Emoji `:` 补全面板必须在 slash 之后、其余按键消费插件之前注册:面板打开时
  // 导航/回车键优先归面板(与 slash 同款次序约束),面板未打开时对所有按键返回 false。
  if (pluginExports.emojiAutocomplete) {
    appendPluginDescriptors(descriptors, 'emoji-autocomplete', pluginExports.emojiAutocomplete);
  }
  // 智能标点(handleTextInput 替换)与自动配对不同字符集,注册次序无耦合;
  // 放在按键消费插件区:面板类插件之后、commonmark 之前。
  if (pluginExports.smartPunctuation) {
    appendPluginDescriptors(descriptors, 'smart-punctuation', pluginExports.smartPunctuation);
  }
  appendPluginDescriptors(descriptors, 'commonmark', pluginExports.commonmark);
  appendPluginDescriptors(descriptors, 'color-marks', pluginExports.colorMarks);
  // 行内扩展(下划线/上下标)排在 color-marks 之后:文本扫描会产出 meditorSpan
  // 高亮节点(==语法),两套 remark transformer 对各自标签独立配对,次序无耦合。
  appendPluginDescriptors(descriptors, 'inline-ext-marks', pluginExports.inlineExtMarks);
  appendPluginDescriptors(descriptors, 'inline-ext-input-rules', pluginExports.inlineExtInputRules);
  appendPluginDescriptors(descriptors, 'callout', pluginExports.callout);
  appendPluginDescriptors(descriptors, 'toggle', pluginExports.toggle);
  appendPluginDescriptors(descriptors, 'jsondata-view', pluginExports.jsondataView);
  appendPluginDescriptors(descriptors, 'media-embed', pluginExports.mediaEmbed);
  appendPluginDescriptors(descriptors, 'task-list-transform-keymap', pluginExports.taskListTransformKeymap);
  appendPluginDescriptors(
    descriptors,
    'inline-code-boundary-navigation',
    pluginExports.inlineCodeBoundaryNavigation
  );
  appendPluginDescriptors(descriptors, 'gfm', pluginExports.gfm);
  appendPluginDescriptors(descriptors, 'history', pluginExports.history);
  appendPluginDescriptors(descriptors, 'editor-search', pluginExports.editorSearch);
  appendPluginDescriptors(descriptors, 'code-block-prism', pluginExports.codeBlockPrism);
  appendPluginDescriptors(descriptors, 'table-html-parse', pluginExports.tableHtmlParse);
  if (includeRuntime) {
    appendPluginDescriptors(descriptors, 'clipboard', pluginExports.clipboard);
    appendPluginDescriptors(descriptors, 'indent', pluginExports.indent);
  }
  appendPluginDescriptors(descriptors, 'image-delete-selection', pluginExports.imageDeleteSelection);
  appendPluginDescriptors(descriptors, 'image-paste', pluginExports.imagePaste);
  appendPluginDescriptors(descriptors, 'image-drop', pluginExports.imageDrop);
  appendPluginDescriptors(descriptors, 'table-arrow-entry', pluginExports.tableArrowEntry);
  // 隐藏布局块行为插件须先于 block-boundary-navigation 注册:方向键落在隐藏
  // 布局块邻域时跳过逻辑优先消费,避免边界导航先把光标送进隐形块。
  appendPluginDescriptors(descriptors, 'layout-block-behavior', pluginExports.layoutBlockBehavior);
  appendPluginDescriptors(descriptors, 'layout-block-effect', pluginExports.layoutBlockEffect);
  appendPluginDescriptors(descriptors, 'block-boundary-navigation', pluginExports.blockBoundaryNavigation);
  appendPluginDescriptors(
    descriptors,
    'heading-backspace-empty-paragraph',
    pluginExports.headingBackspaceEmptyParagraph
  );
  appendPluginDescriptors(descriptors, 'math-backspace-entry', pluginExports.mathBackspaceEntry);
  appendPluginDescriptors(descriptors, 'blockquote-backspace-lift', pluginExports.blockquoteBackspaceLift);
  appendPluginDescriptors(descriptors, 'table-focus-actions', pluginExports.tableFocusActions);
  appendPluginDescriptors(descriptors, 'selection-tooltip', pluginExports.selectionTooltip);
  appendPluginDescriptors(descriptors, 'gap-cursor', pluginExports.gapCursor);
  appendPluginDescriptors(descriptors, 'drop-cursor', pluginExports.dropCursor);
  appendPluginDescriptors(descriptors, 'trailing-paragraph', pluginExports.trailingParagraph);
  appendPluginDescriptors(descriptors, 'math', pluginExports.math);
  appendPluginDescriptors(descriptors, 'math-inline-edit', pluginExports.mathInlineEdit);
  appendPluginDescriptors(descriptors, 'math-inline-arrow-navigation', pluginExports.mathInlineArrowNavigation);
  appendPluginDescriptors(descriptors, 'mtable', pluginExports.mtable);
  appendPluginDescriptors(descriptors, 'layout-block', pluginExports.layoutBlock);
  appendPluginDescriptors(descriptors, 'task-list-toggle', pluginExports.taskListToggle);
  appendPluginDescriptors(descriptors, 'task-list-input-rule', pluginExports.taskListInputRule);
  appendPluginDescriptors(descriptors, 'chinese-symbols-input-rule', pluginExports.chineseSymbolsInputRule);
  appendPluginDescriptors(descriptors, 'tab-space-indent', pluginExports.tabSpaceIndent);
  appendPluginDescriptors(descriptors, 'code-block-mod-a-select', pluginExports.codeBlockModASelect);
  appendPluginDescriptors(descriptors, 'cursor-navigate', pluginExports.cursorNavigate);
  appendPluginDescriptors(descriptors, 'remote-selection-highlight', pluginExports.remoteSelectionHighlight);
  appendPluginDescriptors(descriptors, 'heading-anchor', pluginExports.headingAnchor);
  if (pluginExports.headingsChange) {
    appendPluginDescriptors(descriptors, 'headings-change', pluginExports.headingsChange);
  }
  appendPluginDescriptors(descriptors, 'toc', pluginExports.toc);
  appendPluginDescriptors(descriptors, 'ai-stream', pluginExports.aiStream);
  appendPluginDescriptors(descriptors, 'footnote', pluginExports.footnote);
  appendPluginDescriptors(descriptors, 'front-matter', pluginExports.frontMatter);
  if (pluginExports.autoPair) {
    appendPluginDescriptors(descriptors, 'auto-pair', pluginExports.autoPair);
  }
  appendPluginDescriptors(descriptors, 'writing-mode', pluginExports.writingMode);
  if (pluginExports.blockHandle) {
    appendPluginDescriptors(descriptors, 'block-handle', pluginExports.blockHandle);
  }
  if (pluginExports.toolbar) {
    appendPluginDescriptors(descriptors, 'toolbar', pluginExports.toolbar);
  }

  return descriptors;
};
