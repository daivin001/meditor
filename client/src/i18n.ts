/**
 * src/i18n.ts — 桌面壳轻量 i18n
 *
 * 字典式双语(zh-CN/en-US),不引 i18next(依赖已在但从未接线,壳层文案量小,
 * 字典 + data-i18n 静态扫描足够)。语言偏好持久化 localStorage。
 */

/** 支持的语言。 */
export type UiLocale = 'zh-CN' | 'en-US';

const LOCALE_KEY = 'meditor.uiLocale';

/** 中文文案表(缺省语言)。 */
const ZH: Record<string, string> = {
  untitled: '未命名',
  menuNew: '新建标签页',
  menuOpen: '打开…',
  menuSave: '保存',
  menuSaveAs: '另存为…',
  menuExportHtml: '导出 HTML…',
  menuPrint: '打印 / 导出 PDF…',
  menuCopyLlm: '复制给大模型（不含布局信息）',
  menuOutline: '大纲',
  menuBlocksMode: '布局模式（显示/编辑布局信息块）',
  menuLayoutFull: '布局：全屏（占满窗口宽度）',
  menuLayoutWide: '布局：超宽（居中限宽，类 Typora）',
  menuFocusMode: '专注模式（高亮当前段落）',
  menuTypewriterMode: '打字机模式（光标行居中）',
  menuTheme: '切换明暗主题',
  menuSettings: '设置…',
  menuRecent: '最近文件',
  menuRecentEmpty: '（暂无最近文件）',
  closeTabTitle: '关闭标签页 (Ctrl+W)',
  tabNewTitle: '新建标签页 (Ctrl+N)',
  winMinTitle: '最小化',
  winMaxTitle: '最大化 / 还原',
  winCloseTitle: '关闭',
  statusUnsavedNew: '未保存的新文档',
  statusNotSaved: '未保存到文件',
  statusUnsavedDirty: '● 未保存',
  statusCharsWords: '{chars} 字符 · {words} 词 · 约 {minutes} 分钟',
  statusBlocks: '◆ {count} 布局块',
  statusCopiedLlm: '已复制给大模型（不含布局信息，{count} 字符）',
  statusExported: '已导出：{path}',
  statusPrintHint: '已打开打印对话框（选择“另存为 PDF”可导出 PDF）',
  statusReloaded: '已自动重新加载磁盘上的更改',
  exportDialogTitle: '导出 HTML',
  copyFailed: '复制失败：{error}',
  confirmDiscard: '当前页签尚未保存，丢弃更改？',
  fileRemoved: '文件已从磁盘移除：\n{path}\n当前内容仍在页签中，保存时将重建该文件。',
  externalChanged: '「{name}」已被其他程序修改。\n\n重新加载将丢失未保存的修改；保留当前内容则暂不采用磁盘上的更改，文件再次变化时会再次询问。',
  reload: '重新加载',
  keepMine: '保留我的内容',
  sessionFailed: '暂存未保存内容失败，窗口未关闭：\n{error}',
  appTitle: 'MEditor',
  settingsTitle: '设置',
  settingsLanguage: '界面语言',
  settingsLanguageZh: '中文',
  settingsLanguageEn: 'English',
  settingsTheme: '主题',
  settingsThemeLight: '浅色',
  settingsThemeDark: '深色',
  settingsLayout: '版式',
  settingsLayoutFull: '全屏',
  settingsLayoutWide: '超宽（类 Typora）',
  settingsFocus: '专注模式',
  settingsTypewriter: '打字机模式',
  settingsAutoPair: '自动配对括号',
  settingsEmojiComplete: 'Emoji : 输入补全',
  settingsSpellcheck: '拼写检查',
  settingsCustomCss: '自定义 CSS（作用于界面与编辑器）',
  settingsCustomCssPlaceholder: '例如：\n.zt-md { --zt-font: "霞鹜文楷", serif; }',
  settingsClose: '完成',
  settingsEditorRestartHint: '带 * 的项在切换页签或重启后完全生效',
  markdownFilterName: 'Markdown',
  htmlFilterName: 'HTML',
  // --- 设置面板:分区 ---
  settingsSectionGeneral: '通用',
  settingsSectionEditor: '编辑器',
  settingsSectionAi: 'AI 模型',
  settingsAiAdd: '添加模型',
  settingsAiDelete: '删除此模型',
  settingsAiEmpty: '尚未配置模型。填写 OpenAI 兼容接口信息后即可在工具栏 AI 助手中使用',
  settingsAiName: '名称',
  settingsAiBaseUrl: '接口地址',
  settingsAiApiKey: 'API Key',
  settingsAiModelId: '模型 ID',
  settingsSectionImages: '图片',
  settingsSectionMarkdown: 'Markdown 扩展',
  settingsSectionCodeBlock: '代码块',
  settingsSectionFiles: '文件',
  settingsSectionExport: '打印 / PDF',
  // --- 编辑器 ---
  settingsFont: '正文字体',
  settingsFontPlaceholder: '留空用默认;如:微软雅黑 / 楷体 / LXGW WenKai / serif',
  settingsFontSize: '正文字号',
  settingsLineHeight: '行距',
  settingsSmartPunct: '智能标点(引号/破折号/省略号)',
  settingsStrictBreaks: '严格换行(单个换行折叠为空格,GFM)*',
  settingsHeadingNumbering: '标题自动编号(1 / 1.1 / 1.1.1)',
  settingsZoom: '视图缩放',
  settingsZoomReset: '重置',
  settingsDialogClose: '关闭',
  settingsSpellcheckLang: '拼写检查语言',
  settingsSpellcheckLangAuto: '跟随系统',
  // --- 图片 ---
  settingsImageStrategy: '插入图片时',
  settingsImageEmbed: '内嵌文档(base64)',
  settingsImageAssets: '复制到「文档名.assets」文件夹',
  settingsImageUpload: '上传图床',
  settingsImageAssetsHint: '未保存的文档将临时回退为内嵌;引用相对路径,随文档一起移动',
  settingsImageUploader: '上传服务',
  settingsImagePicgoUrl: 'PicGo Server 地址',
  settingsImageUploadCommand: '自定义上传命令(优先于 PicGo)',
  settingsImageUploadCommandPlaceholder: '如 picgo upload(图片路径自动追加为末参数,stdout 输出 URL)',
  settingsImageTest: '测试上传',
  settingsImageTesting: '上传中…',
  settingsImageTestOk: '上传成功:{url}',
  settingsImageTestFailed: '上传失败:{error}',
  settingsImageUnsavedFallback: '文档未保存,本次图片已内嵌;保存后重试即可使用当前策略',
  // --- Markdown 扩展 ---
  settingsFeatMath: '行内公式与公式块($…$)',
  settingsFeatSup: '上标(^x^)',
  settingsFeatSub: '下标(<sub> 标签)',
  settingsFeatHighlight: '高亮(==x==)',
  settingsFeatMermaid: 'Mermaid 图表',
  // --- 代码块 ---
  settingsCodeLineNumbers: '显示行号',
  settingsCodeWordWrap: '自动换行',
  // --- 文件 ---
  settingsAutoSave: '自动保存到磁盘',
  settingsAutoSaveInterval: '保存间隔',
  settingsAutoSaveOff: '关闭',
  settingsAutoSaved: '已自动保存:{name}',
  // --- 打印 ---
  settingsPrintMargin: '页边距',
  settingsPrintMarginDefault: '默认',
  settingsPrintMarginNarrow: '窄',
  settingsPrintMarginWide: '宽',
  settingsPrintMarginNone: '无',
  // --- 自定义主题 ---
  settingsCustomTheme: '自定义主题(.css)',
  settingsCustomThemeNone: '内置主题',
  settingsThemesFolder: '打开主题文件夹…',
  settingsThemesEmpty: '主题文件夹暂无 .css 文件;放入后重新打开设置即可选择'
};

/** 英文文案表。 */
const EN: Record<string, string> = {
  untitled: 'Untitled',
  menuNew: 'New Tab',
  menuOpen: 'Open…',
  menuSave: 'Save',
  menuSaveAs: 'Save As…',
  menuExportHtml: 'Export HTML…',
  menuPrint: 'Print / Export PDF…',
  menuCopyLlm: 'Copy for LLM (layout blocks stripped)',
  menuOutline: 'Outline',
  menuBlocksMode: 'Layout Mode (show/edit layout blocks)',
  menuLayoutFull: 'Layout: Full width',
  menuLayoutWide: 'Layout: Wide (centered, Typora-like)',
  menuFocusMode: 'Focus Mode (highlight current paragraph)',
  menuTypewriterMode: 'Typewriter Mode (keep caret centered)',
  menuTheme: 'Toggle Light/Dark Theme',
  menuSettings: 'Settings…',
  menuRecent: 'Recent Files',
  menuRecentEmpty: '(no recent files)',
  closeTabTitle: 'Close tab (Ctrl+W)',
  tabNewTitle: 'New tab (Ctrl+N)',
  winMinTitle: 'Minimize',
  winMaxTitle: 'Maximize / Restore',
  winCloseTitle: 'Close',
  statusUnsavedNew: 'New unsaved document',
  statusNotSaved: 'Not saved to file',
  statusUnsavedDirty: '● Unsaved',
  statusCharsWords: '{chars} chars · {words} words · ~{minutes} min read',
  statusBlocks: '◆ {count} layout blocks',
  statusCopiedLlm: 'Copied for LLM (layout stripped, {count} chars)',
  statusExported: 'Exported: {path}',
  statusPrintHint: 'Print dialog opened (choose "Save as PDF" to export)',
  statusReloaded: 'Reloaded changes from disk',
  exportDialogTitle: 'Export HTML',
  copyFailed: 'Copy failed: {error}',
  confirmDiscard: 'This tab has unsaved changes. Discard?',
  fileRemoved: 'File removed from disk:\n{path}\nContent is kept in this tab; saving will recreate the file.',
  externalChanged: '"{name}" was modified by another program.\n\nReloading discards unsaved changes; keeping yours skips this version (you will be asked again when it changes).',
  reload: 'Reload',
  keepMine: 'Keep mine',
  sessionFailed: 'Failed to stash unsaved content, window not closed:\n{error}',
  appTitle: 'MEditor',
  settingsTitle: 'Settings',
  settingsLanguage: 'Language',
  settingsLanguageZh: '中文',
  settingsLanguageEn: 'English',
  settingsTheme: 'Theme',
  settingsThemeLight: 'Light',
  settingsThemeDark: 'Dark',
  settingsLayout: 'Layout',
  settingsLayoutFull: 'Full width',
  settingsLayoutWide: 'Wide (Typora-like)',
  settingsFocus: 'Focus mode',
  settingsTypewriter: 'Typewriter mode',
  settingsAutoPair: 'Auto-pair brackets',
  settingsEmojiComplete: 'Emoji ":" autocomplete',
  settingsSpellcheck: 'Spell check',
  settingsCustomCss: 'Custom CSS (applies to UI and editor)',
  settingsCustomCssPlaceholder: 'e.g.\n.zt-md { --zt-font: "LXGW WenKai", serif; }',
  settingsClose: 'Done',
  settingsEditorRestartHint: 'Items marked * fully apply after tab switch or restart',
  markdownFilterName: 'Markdown',
  htmlFilterName: 'HTML',
  settingsSectionGeneral: 'General',
  settingsSectionEditor: 'Editor',
  settingsSectionAi: 'AI models',
  settingsAiAdd: 'Add model',
  settingsAiDelete: 'Delete this model',
  settingsAiEmpty:
    'No models yet. Fill in an OpenAI-compatible endpoint to use it in the toolbar AI assistant',
  settingsAiName: 'Name',
  settingsAiBaseUrl: 'Base URL',
  settingsAiApiKey: 'API Key',
  settingsAiModelId: 'Model ID',
  settingsSectionImages: 'Images',
  settingsSectionMarkdown: 'Markdown extensions',
  settingsSectionCodeBlock: 'Code blocks',
  settingsSectionFiles: 'Files',
  settingsSectionExport: 'Print / PDF',
  settingsFont: 'Content font',
  settingsFontPlaceholder: 'Empty for default; e.g. Consolas / Georgia / serif',
  settingsFontSize: 'Font size',
  settingsLineHeight: 'Line height',
  settingsSmartPunct: 'Smart punctuation (quotes / dashes / ellipsis)',
  settingsStrictBreaks: 'Strict line breaks (single newline collapses, GFM)*',
  settingsHeadingNumbering: 'Heading auto numbering (1 / 1.1 / 1.1.1)',
  settingsZoom: 'Zoom',
  settingsZoomReset: 'Reset',
  settingsDialogClose: 'Close',
  settingsSpellcheckLang: 'Spellcheck language',
  settingsSpellcheckLangAuto: 'System',
  settingsImageStrategy: 'When inserting images',
  settingsImageEmbed: 'Embed into document (base64)',
  settingsImageAssets: 'Copy to "<doc>.assets" folder',
  settingsImageUpload: 'Upload to image host',
  settingsImageAssetsHint: 'Unsaved documents fall back to embedding; refs are relative and move with the file',
  settingsImageUploader: 'Uploader',
  settingsImagePicgoUrl: 'PicGo Server URL',
  settingsImageUploadCommand: 'Custom upload command (overrides PicGo)',
  settingsImageUploadCommandPlaceholder: 'e.g. picgo upload (image path appended; stdout must print URL)',
  settingsImageTest: 'Test upload',
  settingsImageTesting: 'Uploading…',
  settingsImageTestOk: 'Uploaded: {url}',
  settingsImageTestFailed: 'Upload failed: {error}',
  settingsImageUnsavedFallback: 'Document not saved; image embedded this time. Save first to use the current strategy',
  settingsFeatMath: 'Inline & block math ($…$)',
  settingsFeatSup: 'Superscript (^x^)',
  settingsFeatSub: 'Subscript (<sub> tag)',
  settingsFeatHighlight: 'Highlight (==x==)',
  settingsFeatMermaid: 'Mermaid diagrams',
  settingsCodeLineNumbers: 'Line numbers',
  settingsCodeWordWrap: 'Word wrap',
  settingsAutoSave: 'Auto save to disk',
  settingsAutoSaveInterval: 'Interval',
  settingsAutoSaveOff: 'Off',
  settingsAutoSaved: 'Auto saved: {name}',
  settingsPrintMargin: 'Page margin',
  settingsPrintMarginDefault: 'Default',
  settingsPrintMarginNarrow: 'Narrow',
  settingsPrintMarginWide: 'Wide',
  settingsPrintMarginNone: 'None',
  settingsCustomTheme: 'Custom theme (.css)',
  settingsCustomThemeNone: 'Built-in theme',
  settingsThemesFolder: 'Open themes folder…',
  settingsThemesEmpty: 'No .css files in themes folder yet; drop one in and reopen settings'
};

const DICTS: Record<UiLocale, Record<string, string>> = { 'zh-CN': ZH, 'en-US': EN };

/** 当前语言(启动时读偏好)。 */
let currentLocale: UiLocale = readLocalePref();

/** 读语言偏好。 */
function readLocalePref(): UiLocale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved === 'en-US') return 'en-US';
  } catch {
    /* fallthrough */
  }
  return 'zh-CN';
}

/** 取当前语言。 */
export function getLocale(): UiLocale {
  return currentLocale;
}

/** 切换语言(持久化;调用方负责刷新静态文案与重建编辑器)。 */
export function setLocale(locale: UiLocale): void {
  currentLocale = locale;
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    /* 隐私模式等不可用:仅当前会话生效 */
  }
}

/** 取文案(支持 {name} 占位)。 */
export function t(key: string, params?: Record<string, string | number>): string {
  const template = DICTS[currentLocale][key] ?? DICTS['zh-CN'][key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_match, name) => String(params[name] ?? `{${name}}`));
}

/** 把语言应用到 <html lang> 与全部 data-i18n / data-i18n-title 静态节点。 */
export function applyStaticI18n(): void {
  document.documentElement.lang = currentLocale;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n as string);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((element) => {
    element.title = t(element.dataset.i18nTitle as string);
  });
}
