/**
 * src/main.ts — MEditor 桌面壳前端入口(多页签,记事本式会话)
 *
 * 职责:装配 @meditor/editor 编辑器实例,桥接 Tauri 后端命令实现
 * 多页签打开/保存 .md 文件、活动页签脏状态与窗口标题联动、外部修改监视
 * 提醒、无边框窗口控制(最小化/最大化/关闭)、记事本式会话:所有页签内容
 * 自动暂存,下次启动整体恢复,不弹关闭确认。
 * 另含:大纲侧栏(标题清单跳转,层级深度可调)、导出 HTML / 打印(PDF,
 * 页边距与相对图片内嵌)、最近文件、视图缩放(Ctrl+滚轮/快捷键)、
 * 自动保存(定时写盘)、自定义主题(themes 文件夹)、
 * 设置面板(语言/主题/版式/排版字体字号行距/专注/打字机/自动配对/Emoji/
 * 拼写检查/智能标点/严格换行/标题编号/Markdown 扩展开关/代码块行号换行/
 * 图片插入策略:内嵌/文档名.assets/图床上传(PicGo server 或自定义命令)/
 * 自动保存/打印页边距/自定义 CSS)。
 * 布局样式在 src/app.css;编辑器视觉来自 vendor 的 meditor.css。
 */
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { appLocalDataDir, join } from '@tauri-apps/api/path';
import { ask, message as dlgMessage, open, save } from '@tauri-apps/plugin-dialog';
import { createMeditor, listMeditorLayoutBlocks, type AiModelConfig, type MeditorApi } from '@meditor/editor';
import '@meditor/editor/style.css';
import './app.css';
import { applyStaticI18n, getLocale, setLocale, t } from './i18n';
import { openSettings, type ShellPrefs } from './settings';
import {
  insertImageWithPrefs,
  inlineLocalImagesForExport,
  resolveLocalImageSrc,
  testImageUploader
} from './image-strategy';

/** 对话框滤镜(名称走 i18n,调用时解析)。 */
const mdFilters = () => [{ name: t('markdownFilterName'), extensions: ['md', 'markdown'] }];
const htmlFilters = () => [{ name: t('htmlFilterName'), extensions: ['html'] }];
const WATCH_INTERVAL_MS = 2000;
const SESSION_DEBOUNCE_MS = 800;

interface FileStat {
  mtimeMs: number;
  size: number;
}

/** 一个页签 = 一份独立文档:编辑器实例 + 脏检查基准 + 外部修改监视基准。 */
interface Tab {
  id: number;
  filePath: string | null;
  /** 与磁盘内容一致的文本,脏检查基准。 */
  savedText: string;
  api: MeditorApi | null;
  root: HTMLDivElement;
  /** 监视基准(页签最近一次已知磁盘状态);null 表示未监视。 */
  baseline: FileStat | null;
}

/** 会话快照(持久化到 session.json,恢复时归一化旧格式)。 */
interface Session {
  version: 2;
  activeIndex: number;
  tabs: { markdown: string; filePath: string | null; savedText: string }[];
}

/** 启动载荷:命令行 .md 路径 + 历史会话。 */
interface BootPayload {
  path?: string;
  markdown?: string;
  session?: unknown;
}

const el = {
  tabs: document.getElementById('tabs')!,
  tabNew: document.getElementById('tab-new')!,
  tabScrollLeft: document.getElementById('tab-scroll-left') as HTMLButtonElement,
  tabScrollRight: document.getElementById('tab-scroll-right') as HTMLButtonElement,
  winMin: document.getElementById('win-min')!,
  winMax: document.getElementById('win-max')!,
  winClose: document.getElementById('win-close')!,
  editorHost: document.getElementById('editor-host')!,
  statusLeft: document.getElementById('status-left')!,
  statusRight: document.getElementById('status-right')!,
  statusBlocks: document.getElementById('status-blocks') as HTMLButtonElement,
  btnMenu: document.getElementById('btn-menu')!,
  fileMenu: document.getElementById('file-menu')!,
  recentFiles: document.getElementById('recent-files')!,
  miNew: document.getElementById('mi-new')!,
  miOpen: document.getElementById('mi-open')!,
  miSave: document.getElementById('mi-save')!,
  miSaveAs: document.getElementById('mi-save-as')!,
  miExportHtml: document.getElementById('mi-export-html') as HTMLButtonElement,
  miPrint: document.getElementById('mi-print') as HTMLButtonElement,
  miCopyLlm: document.getElementById('mi-copy-llm')!,
  miOutline: document.getElementById('mi-outline') as HTMLButtonElement,
  miBlocksMode: document.getElementById('mi-blocks-mode')!,
  miLayoutFull: document.getElementById('mi-layout-full')!,
  miLayoutWide: document.getElementById('mi-layout-wide')!,
  miFocusMode: document.getElementById('mi-focus-mode') as HTMLButtonElement,
  miTypewriterMode: document.getElementById('mi-typewriter-mode') as HTMLButtonElement,
  miTheme: document.getElementById('mi-theme')!,
  miSettings: document.getElementById('mi-settings') as HTMLButtonElement
};

function baseName(path: string): string {
  const idx = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
  return idx >= 0 ? path.slice(idx + 1) : path;
}

// --- 偏好(设置面板与快捷开关共用的持久化层) ---

const THEME_KEY = 'meditor.theme';
const LAYOUT_KEY = 'meditor.layout';
const BLOCKS_MODE_KEY = 'meditor.blocksMode';
const FOCUS_MODE_KEY = 'meditor.focusMode';
const TYPEWRITER_MODE_KEY = 'meditor.typewriterMode';
const AUTO_PAIR_KEY = 'meditor.autoPair';
const EMOJI_COMPLETE_KEY = 'meditor.emojiComplete';
const SPELLCHECK_KEY = 'meditor.spellcheck';
const CUSTOM_CSS_KEY = 'meditor.customCss';
const RECENT_KEY = 'meditor.recentFiles';
const IMAGE_STRATEGY_KEY = 'meditor.imageStrategy';
const PICGO_URL_KEY = 'meditor.picgoUrl';
const UPLOAD_COMMAND_KEY = 'meditor.uploadCommand';
const AUTO_SAVE_KEY = 'meditor.autoSave';
const AUTO_SAVE_INTERVAL_KEY = 'meditor.autoSaveInterval';
const FONT_FAMILY_KEY = 'meditor.fontFamily';
const FONT_SIZE_KEY = 'meditor.contentFontSize';
const LINE_HEIGHT_KEY = 'meditor.lineHeight';
const ZOOM_KEY = 'meditor.zoom';
const FEAT_MATH_KEY = 'meditor.featMath';
const FEAT_SUP_KEY = 'meditor.featSuperscript';
const FEAT_SUB_KEY = 'meditor.featSubscript';
const FEAT_HIGHLIGHT_KEY = 'meditor.featHighlight';
const FEAT_MERMAID_KEY = 'meditor.featMermaid';
const STRICT_BREAKS_KEY = 'meditor.strictBreaks';
const SMART_PUNCT_KEY = 'meditor.smartPunct';
const HEADING_NUMBERING_KEY = 'meditor.headingNumbering';
const AI_MODELS_KEY = 'meditor.aiModels';
const CODE_LINE_NUMBERS_KEY = 'meditor.codeLineNumbers';
const CODE_WORD_WRAP_KEY = 'meditor.codeWordWrap';
const SPELLCHECK_LANG_KEY = 'meditor.spellcheckLang';
const PRINT_MARGIN_KEY = 'meditor.printMargin';
const CUSTOM_THEME_KEY = 'meditor.customTheme';
const RECENT_MAX = 10;

/** 布尔偏好读取('on'/'off')。 */
function readOnPref(key: string, fallback: boolean): boolean {
  return readPref(key, fallback ? 'on' : 'off') === 'on';
}

/** AI 模型清单读取(JSON;损坏/缺字段条目原样保留字段默认值)。 */
function readAiModels(): AiModelConfig[] {
  try {
    const raw = JSON.parse(localStorage.getItem(AI_MODELS_KEY) ?? '[]') as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      const record = (item ?? {}) as Record<string, unknown>;
      return {
        name: typeof record.name === 'string' ? record.name : '',
        baseUrl: typeof record.baseUrl === 'string' ? record.baseUrl : '',
        apiKey: typeof record.apiKey === 'string' ? record.apiKey : '',
        model: typeof record.model === 'string' ? record.model : ''
      };
    });
  } catch {
    return [];
  }
}

/** localStorage 读取(缺省兜底)。 */
function readPref(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

/** localStorage 写入(失败静默:隐私模式仅当前会话生效)。 */
function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* fallthrough */
  }
}

/** 主题偏好:持久化值优先,首次启动跟随系统。 */
function resolveDarkPref(): boolean {
  const themePref = readPref(THEME_KEY, '');
  return themePref === 'dark' || (themePref === '' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

/** 壳层偏好快照(设置面板读写)。 */
function readShellPrefs(): ShellPrefs {
  return {
    dark: resolveDarkPref(),
    layout: readPref(LAYOUT_KEY, 'full') === 'wide' ? 'wide' : 'full',
    focusMode: readPref(FOCUS_MODE_KEY, 'off') === 'on',
    typewriterMode: readPref(TYPEWRITER_MODE_KEY, 'off') === 'on',
    autoPair: readPref(AUTO_PAIR_KEY, 'on') === 'on',
    emojiAutocomplete: readPref(EMOJI_COMPLETE_KEY, 'on') === 'on',
    spellcheck: readPref(SPELLCHECK_KEY, 'on') === 'on',
    customCss: readPref(CUSTOM_CSS_KEY, ''),
    imageStrategy: (['embed', 'assets', 'upload'] as const).includes(
      readPref(IMAGE_STRATEGY_KEY, 'embed') as ShellPrefs['imageStrategy']
    )
      ? (readPref(IMAGE_STRATEGY_KEY, 'embed') as ShellPrefs['imageStrategy'])
      : 'embed',
    picgoUrl: readPref(PICGO_URL_KEY, 'http://127.0.0.1:36677/upload'),
    uploadCommand: readPref(UPLOAD_COMMAND_KEY, ''),
    autoSave: readOnPref(AUTO_SAVE_KEY, false),
    autoSaveInterval: [30, 60, 300].includes(Number(readPref(AUTO_SAVE_INTERVAL_KEY, '60')))
      ? Number(readPref(AUTO_SAVE_INTERVAL_KEY, '60'))
      : 60,
    fontFamily: readPref(FONT_FAMILY_KEY, ''),
    contentFontSize: clampNumber(Number(readPref(FONT_SIZE_KEY, '15.5')), 11, 32, 15.5),
    lineHeight: clampNumber(Number(readPref(LINE_HEIGHT_KEY, '1.75')), 1.2, 2.6, 1.75),
    zoom: clampNumber(Number(readPref(ZOOM_KEY, '100')), 60, 300, 100),
    featMath: readOnPref(FEAT_MATH_KEY, true),
    featSuperscript: readOnPref(FEAT_SUP_KEY, true),
    featSubscript: readOnPref(FEAT_SUB_KEY, true),
    featHighlight: readOnPref(FEAT_HIGHLIGHT_KEY, true),
    featMermaid: readOnPref(FEAT_MERMAID_KEY, true),
    strictBreaks: readOnPref(STRICT_BREAKS_KEY, false),
    smartPunct: readOnPref(SMART_PUNCT_KEY, false),
    headingNumbering: readOnPref(HEADING_NUMBERING_KEY, false),
    aiModels: readAiModels(),
    codeLineNumbers: readOnPref(CODE_LINE_NUMBERS_KEY, false),
    codeWordWrap: readOnPref(CODE_WORD_WRAP_KEY, false),
    spellcheckLang: readPref(SPELLCHECK_LANG_KEY, ''),
    printMargin: (['default', 'narrow', 'wide', 'none'] as const).includes(
      readPref(PRINT_MARGIN_KEY, 'default') as ShellPrefs['printMargin']
    )
      ? (readPref(PRINT_MARGIN_KEY, 'default') as ShellPrefs['printMargin'])
      : 'default',
    customTheme: readPref(CUSTOM_THEME_KEY, '')
  };
}

/** 数值夹取(非法值回退缺省)。 */
function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

const state = {
  /** 主题偏好(首次启动跟随系统;之后以持久化值为准)。 */
  dark: resolveDarkPref(),
  /** 布局模式(显示控制布局块显隐/编辑);跨编辑器重建保留。 */
  blocksMode: readPref(BLOCKS_MODE_KEY, 'off') === 'on',
  prefs: readShellPrefs()
};

const tabs: Tab[] = [];
let activeId = -1;
let nextTabId = 1;
let sessionTimer: ReturnType<typeof setTimeout> | undefined;
let appClosing = false;
let watchBusy = false;

function activeTab(): Tab | undefined {
  return tabs.find((t) => t.id === activeId);
}

function tabById(id: number): Tab | undefined {
  return tabs.find((t) => t.id === id);
}

function tabText(tab: Tab): string {
  return tab.api?.getMarkdown() ?? '';
}

function isDirty(tab: Tab): boolean {
  return tabText(tab) !== tab.savedText;
}

function tabLabel(tab: Tab): string {
  return tab.filePath ? baseName(tab.filePath) : t('untitled');
}

function applyTheme(): void {
  document.documentElement.dataset.theme = state.dark ? 'dark' : 'light';
}

/** 注入自定义 CSS(设置面板实时编辑;单 <style> 全量替换)。 */
function applyCustomCss(): void {
  let styleEl = document.getElementById('custom-css-style') as HTMLStyleElement | null;
  if (!state.prefs.customCss.trim()) {
    styleEl?.remove();
    return;
  }
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'custom-css-style';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = state.prefs.customCss;
}

// --- 排版偏好(字体/字号/行距/缩放):编辑器经 CSS 变量消费,即时生效 ---

/** 应用排版偏好:写入文档级 CSS 变量(编辑器字号 = 基础字号 × 缩放)。 */
function applyTypography(): void {
  const root = document.documentElement;
  const effectiveSize = state.prefs.contentFontSize * (state.prefs.zoom / 100);
  if (state.prefs.fontFamily.trim()) {
    root.style.setProperty('--zt-md-font-family', state.prefs.fontFamily.trim());
  } else {
    root.style.removeProperty('--zt-md-font-family');
  }
  root.style.setProperty('--zt-md-font-size', `${effectiveSize}px`);
  root.style.setProperty('--zt-md-line-height', String(state.prefs.lineHeight));
}

/** 调整视图缩放(步进 10%,范围 60~300%),持久化并提示。 */
function adjustZoom(delta: number): void {
  const next = Math.min(300, Math.max(60, Math.round((state.prefs.zoom + delta) / 10) * 10));
  if (next === state.prefs.zoom) return;
  state.prefs = { ...state.prefs, zoom: next };
  writePref(ZOOM_KEY, String(next));
  applyTypography();
  flashStatus(`${next}%`);
}

// --- 自定义主题(themes 文件夹内的 .css, Typora 风主题机制) ---

let themesDirCache: string | null = null;
let themeFilesCache: string[] = [];

/** 主题目录:appLocalDataDir/themes(不存在时懒创建)。 */
async function resolveThemesDir(): Promise<string> {
  if (themesDirCache) return themesDirCache;
  const base = await appLocalDataDir();
  const dir = await join(base, 'themes');
  themesDirCache = dir;
  return dir;
}

/** 扫描主题文件(失败返回缓存或空)。 */
async function refreshThemeFiles(): Promise<string[]> {
  try {
    const dir = await resolveThemesDir();
    themeFilesCache = await invoke<string[]>('list_dir_files', { dir, ext: '.css' });
  } catch {
    /* 目录不可用:沿用缓存 */
  }
  return themeFilesCache;
}

/** 应用自定义主题:读取 .css 注入 <style>;空名清除。 */
async function applyCustomTheme(): Promise<void> {
  let styleEl = document.getElementById('custom-theme-style') as HTMLStyleElement | null;
  const name = state.prefs.customTheme;
  if (!name) {
    styleEl?.remove();
    return;
  }
  try {
    const dir = await resolveThemesDir();
    const css = await invoke<string>('read_file', { path: await join(dir, name) });
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'custom-theme-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  } catch (error) {
    console.error('[meditor] 主题加载失败', error);
  }
}

// --- 自动保存(定时把脏页签写盘) ---

let autoSaveTimer: ReturnType<typeof setInterval> | undefined;
let autoSaveBusy = false;

/** 按当前偏好重启自动保存定时器。 */
function restartAutoSaveTimer(): void {
  if (autoSaveTimer !== undefined) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = undefined;
  }
  if (!state.prefs.autoSave) return;
  autoSaveTimer = setInterval(() => {
    if (appClosing || autoSaveBusy || document.hidden) return;
    const dirtyTabs = tabs.filter((tab) => tab.filePath && isDirty(tab));
    if (dirtyTabs.length === 0) return;
    autoSaveBusy = true;
    void (async () => {
      let savedName = '';
      for (const tab of dirtyTabs) {
        if (!tab.filePath || !isDirty(tab)) continue;
        try {
          await writeTabFile(tab, tab.filePath);
          savedName = baseName(tab.filePath);
        } catch {
          /* 单个页签失败不打断其余;下次定时再试 */
        }
      }
      if (savedName) flashStatus(t('settingsAutoSaved', { name: savedName }));
    })().finally(() => {
      autoSaveBusy = false;
    });
  }, state.prefs.autoSaveInterval * 1000);
}

// --- 页签外观与状态栏 ---

function renderTabs(): void {
  // 整体重建会清空滚动容器,先记住 scrollLeft 再恢复,避免输入时页签条跳回最左。
  const keepScrollLeft = el.tabs.scrollLeft;
  el.tabs.replaceChildren(
    ...tabs.map((tab) => {
      const tabEl = document.createElement('div');
      tabEl.className = `tab${tab.id === activeId ? ' active' : ''}${isDirty(tab) ? ' dirty' : ''}`;
      tabEl.dataset.id = String(tab.id);
      tabEl.setAttribute('role', 'tab');
      tabEl.setAttribute('aria-selected', tab.id === activeId ? 'true' : 'false');
      tabEl.title = tab.filePath ?? t('untitled');
      const dot = document.createElement('span');
      dot.className = 'tab-dot';
      const title = document.createElement('span');
      title.className = 'tab-title';
      title.textContent = tabLabel(tab);
      const close = document.createElement('button');
      close.className = 'tab-close';
      close.title = t('closeTabTitle');
      close.innerHTML = '<svg viewBox="0 0 12 12"><path d="m2 2 8 8m0-8-8 8"/></svg>';
      close.addEventListener('click', (e) => {
        e.stopPropagation();
        void closeTab(tab.id);
      });
      tabEl.addEventListener('click', () => activateTab(tab.id));
      tabEl.addEventListener('auxclick', (e) => {
        if (e.button === 1) void closeTab(tab.id);
      });
      tabEl.append(dot, title, close);
      return tabEl;
    })
  );
  el.tabs.scrollLeft = keepScrollLeft;
  updateTabScrollers();
}

// --- 页签条溢出滚动:先收缩页签宽度,到最小值仍溢出时显示左右箭头 ---

const TAB_SCROLL_STEP = 160;

/** 依据溢出状态与滚动位置显隐左右箭头(每次渲染/滚动/改宽后调用)。 */
function updateTabScrollers(): void {
  const overflow = el.tabs.scrollWidth - el.tabs.clientWidth > 1;
  el.tabScrollLeft.hidden = !(overflow && el.tabs.scrollLeft > 1);
  el.tabScrollRight.hidden = !(
    overflow &&
    el.tabs.scrollLeft + el.tabs.clientWidth < el.tabs.scrollWidth - 1
  );
}

/** 保证活动页签在页签条可视范围内(两端留一点余量)。 */
function scrollActiveTabIntoView(): void {
  const tabEl = el.tabs.querySelector<HTMLElement>(`.tab[data-id="${activeId}"]`);
  if (!tabEl) return;
  const left = tabEl.offsetLeft;
  const right = left + tabEl.offsetWidth;
  if (left < el.tabs.scrollLeft + 1) {
    el.tabs.scrollTo({ left: left - 12, behavior: 'smooth' });
  } else if (right > el.tabs.scrollLeft + el.tabs.clientWidth) {
    el.tabs.scrollTo({ left: right - el.tabs.clientWidth + 12, behavior: 'smooth' });
  }
}

el.tabScrollLeft.addEventListener('click', () =>
  el.tabs.scrollBy({ left: -TAB_SCROLL_STEP, behavior: 'smooth' })
);
el.tabScrollRight.addEventListener('click', () =>
  el.tabs.scrollBy({ left: TAB_SCROLL_STEP, behavior: 'smooth' })
);
el.tabs.addEventListener('scroll', updateTabScrollers, { passive: true });

function refreshChrome(): void {
  const tab = activeTab();
  if (!tab) return;
  const dirty = isDirty(tab);
  const label = `${tabLabel(tab)}${dirty ? ' *' : ''}`;
  void invoke('set_title', { title: `${label} — ${t('appTitle')}` });
  const stats = tab.api?.getStats() ?? null;
  // 阅读时长:按 400 词/分钟估算(与 Typora 口径一致)。
  el.statusRight.textContent = stats
    ? t('statusCharsWords', {
        chars: stats.characters,
        words: stats.words,
        minutes: Math.max(1, Math.round(stats.words / 400))
      })
    : '';
  el.statusLeft.textContent = tab.filePath
    ? dirty
      ? `${t('statusUnsavedDirty')} — ${tab.filePath}`
      : tab.filePath
    : dirty
      ? t('statusUnsavedNew')
      : t('statusNotSaved');
  // 状态栏布局块计数:文档含布局块时显示(点击切换布局模式)。
  const blockCount = listMeditorLayoutBlocks(tabText(tab)).length;
  el.statusBlocks.hidden = blockCount === 0;
  el.statusBlocks.textContent = t('statusBlocks', { count: blockCount });
}

function flashStatus(text: string): void {
  el.statusLeft.textContent = text;
  setTimeout(() => refreshChrome(), 2400);
}

// --- 大纲面板(编辑器内置,内容右侧;工具栏按钮与菜单同状态) ---

const OUTLINE_OPEN_KEY = 'meditor.outlineOpen';

function isOutlineOpen(): boolean {
  return readPref(OUTLINE_OPEN_KEY, 'off') === 'on';
}

// --- 页签生命周期 ---

function mountTabEditor(tab: Tab, markdown: string): void {
  tab.api?.destroy();
  tab.api = createMeditor({
    root: tab.root,
    defaultValue: markdown,
    locale: getLocale(),
    theme: state.dark ? 'dark' : 'light',
    // 布局模式入口已收进应用菜单,编辑器工具栏不再重复展示。
    toolbar: { mode: 'full', align: 'center', exclude: ['layoutMode'] },
    placeholder: getLocale() === 'en-US' ? 'Start writing Markdown…' : '开始编写 Markdown…',
    autoPair: state.prefs.autoPair,
    emojiAutocomplete: state.prefs.emojiAutocomplete,
    // Markdown 扩展开关(关闭的语法文本原样保留)。
    markdownFeatures: {
      math: state.prefs.featMath,
      superscript: state.prefs.featSuperscript,
      subscript: state.prefs.featSubscript,
      highlight: state.prefs.featHighlight,
      mermaid: state.prefs.featMermaid
    },
    strictLineBreaks: state.prefs.strictBreaks,
    smartPunctuation: state.prefs.smartPunct,
    headingNumbering: state.prefs.headingNumbering,
    codeBlock: {
      lineNumbers: state.prefs.codeLineNumbers,
      wordWrap: state.prefs.codeWordWrap
    },
    // AI 助手:桌面客户端显式开启(库默认不装配);模型清单经设置页维护,
    // 变更经 setAiModels 热更新(无需重建编辑器)。
    ai: { enabled: true, models: state.prefs.aiModels },
    // 相对路径图片(assets 策略)的显示期转换;markdown 内容始终存相对引用。
    resolveImageUrl: (src) => resolveLocalImageSrc(src, tab.filePath),
    imageUpload: {
      maxFileSize: 10 * 1024 * 1024,
      // 插入策略在调用时读取实时偏好;未保存文档的 assets/upload 回退内嵌并提示。
      upload: async (file: File) => {
        try {
          return await insertImageWithPrefs(file, state.prefs, { docPath: tab.filePath });
        } catch (error) {
          if (error instanceof Error && error.message === 'UNSUPPORTED_CONTEXT') {
            flashStatus(t('settingsImageUnsavedFallback'));
            const bytes = new Uint8Array(await file.arrayBuffer());
            let binary = '';
            bytes.forEach((b) => (binary += String.fromCharCode(b)));
            return `data:${file.type || 'image/png'};base64,${btoa(binary)}`;
          }
          throw error;
        }
      }
    },
    onOutlineOpenChange: (open) => {
      // 大纲开合(工具栏按钮/菜单/新页签恢复):持久化偏好并同步菜单勾选态。
      writePref(OUTLINE_OPEN_KEY, open ? 'on' : 'off');
      el.miOutline.classList.toggle('active', open);
    },
    onChange: () => {
      // 任意页签编辑:刷新页签外观(脏点)并续期会话;活动页签另刷状态栏。
      renderTabs();
      scheduleSessionSave();
      if (tab.id === activeId) refreshChrome();
    }
  });
  // 布局/专注/打字机/拼写检查跨编辑器重建保留(换主题/开文件后重放)。
  if (state.blocksMode) tab.api.setLayoutMode(true);
  tab.api.setFocusMode(state.prefs.focusMode);
  tab.api.setTypewriterMode(state.prefs.typewriterMode);
  tab.api.setSpellcheck(state.prefs.spellcheck);
  tab.api.setSpellcheckLang(state.prefs.spellcheckLang);
  // 大纲开合状态跨页签/重启保留;面板收起时零占位,展开由编辑器自行渲染标题清单。
  if (isOutlineOpen()) tab.api.setOutlineOpen(true);
}

function createTab(init: {
  filePath?: string | null;
  markdown: string;
  savedText?: string;
  activate?: boolean;
}): Tab {
  const root = document.createElement('div');
  root.className = 'tab-page';
  el.editorHost.appendChild(root);
  const tab: Tab = {
    id: nextTabId++,
    filePath: init.filePath ?? null,
    savedText: init.savedText ?? init.markdown,
    api: null,
    root,
    baseline: null
  };
  tabs.push(tab);
  mountTabEditor(tab, init.markdown);
  if (init.activate !== false) activateTab(tab.id);
  else renderTabs();
  return tab;
}

/** 编辑器异步就绪后聚焦;过早调用 focus 是静默 no-op,按帧重试直到落焦。 */
function focusTabEditor(tab: Tab): void {
  let frames = 0;
  const tick = (): void => {
    if (tab.id !== activeId) return;
    if (tab.root.contains(document.activeElement)) return;
    if (frames++ >= 40) return;
    tab.api?.focus();
    requestAnimationFrame(tick);
  };
  tick();
}

function activateTab(id: number): void {
  const tab = tabById(id);
  if (!tab) return;
  if (activeId !== id) {
    activeId = id;
    for (const t of tabs) t.root.classList.toggle('active', t.id === id);
    renderTabs();
    refreshChrome();
    // 大纲等模式勾选态现在按页签编辑器取值,切页签需重同步菜单。
    syncModeChrome();
    scheduleSessionSave();
    // 后台页签不轮询:切回时立即补一次外部修改检查。
    void checkExternalChange(tab);
  }
  scrollActiveTabIntoView();
  focusTabEditor(tab);
}

async function closeTab(id: number): Promise<void> {
  const tab = tabById(id);
  if (!tab) return;
  if (isDirty(tab) && !(await confirmDiscard())) return;
  // 最后一个页签视同关闭应用:保留在会话里,下次启动恢复(记事本行为);
  // 上面用户已确认丢弃的脏页签则清空会话再关,尊重其放弃决定。
  if (tabs.length === 1) {
    appClosing = true;
    try {
      if (isDirty(tab)) await invoke('clear_session');
      else await invoke('save_session', { session: snapshotSession() });
    } catch {
      /* 暂存失败也照常关闭:单页签场景无更优出口 */
    }
    await invoke('close_now');
    return;
  }
  const idx = tabs.indexOf(tab);
  tabs.splice(idx, 1);
  tab.api?.destroy();
  tab.root.remove();
  if (activeId === id) {
    activeId = -1;
    activateTab(tabs[Math.min(idx, tabs.length - 1)].id);
  } else {
    renderTabs();
  }
  scheduleSessionSave();
}

/** 新建页签:加号/菜单每次都开一个新页签(记事本行为)。 */
function newTab(): void {
  createTab({ markdown: '' });
}

// --- 会话(记事本式):编辑/切页签/开合文件后续期暂存,启动整体恢复 ---

function snapshotSession(): Session {
  return {
    version: 2,
    activeIndex: Math.max(
      0,
      tabs.findIndex((t) => t.id === activeId)
    ),
    tabs: tabs.map((t) => ({
      markdown: tabText(t),
      filePath: t.filePath,
      savedText: t.savedText
    }))
  };
}

function scheduleSessionSave(): void {
  if (appClosing) return;
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(() => {
    sessionTimer = undefined;
    void invoke('save_session', { session: snapshotSession() }).catch(() => {});
  }, SESSION_DEBOUNCE_MS);
}

/** 兼容旧版单文档会话({markdown,filePath,savedText})归一为页签结构。 */
function normalizeSession(raw: unknown): Session | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  const asTab = (t: unknown): { markdown: string; filePath: string | null; savedText: string } | null => {
    if (!t || typeof t !== 'object') return null;
    const o = t as Record<string, unknown>;
    if (typeof o.markdown !== 'string') return null;
    return {
      markdown: o.markdown,
      filePath: typeof o.filePath === 'string' ? o.filePath : null,
      savedText: typeof o.savedText === 'string' ? o.savedText : o.markdown
    };
  };
  if (Array.isArray(v.tabs)) {
    const list = v.tabs.map(asTab).filter((t): t is NonNullable<ReturnType<typeof asTab>> => t !== null);
    if (list.length === 0) return null;
    return {
      version: 2,
      activeIndex: typeof v.activeIndex === 'number' ? v.activeIndex : 0,
      tabs: list
    };
  }
  const legacy = asTab(v);
  return legacy ? { version: 2, activeIndex: 0, tabs: [legacy] } : null;
}

// --- 最近文件 ---

function readRecentFiles(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

function pushRecentFile(path: string): void {
  const list = readRecentFiles().filter((p) => p.toLowerCase() !== path.toLowerCase());
  list.unshift(path);
  writePref(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  renderRecentFiles();
}

/** 渲染最近文件菜单区(空态提示;点击打开)。 */
function renderRecentFiles(): void {
  el.recentFiles.replaceChildren();
  const files = readRecentFiles();
  if (files.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'menu-recent-empty';
    empty.textContent = t('menuRecentEmpty');
    el.recentFiles.appendChild(empty);
    return;
  }
  const title = document.createElement('div');
  title.className = 'menu-recent-title';
  title.textContent = t('menuRecent');
  el.recentFiles.appendChild(title);
  for (const path of files) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'menu-item menu-recent-item';
    item.title = path;
    item.textContent = baseName(path);
    item.addEventListener('click', () => {
      toggleFileMenu(false);
      void openPath(path);
    });
    el.recentFiles.appendChild(item);
  }
}

// --- 文件操作(作用于页签) ---

async function openPath(path: string): Promise<void> {
  // 同一文件已在页签中:跳转过去,不重复开。
  const existing = tabs.find((t) => t.filePath?.toLowerCase() === path.toLowerCase());
  if (existing) {
    activateTab(existing.id);
    return;
  }
  try {
    const content = await invoke<string>('read_file', { path });
    const tab = createTab({ filePath: path, markdown: content });
    tab.baseline = await statFile(path);
    pushRecentFile(path);
    refreshChrome();
  } catch (err) {
    await dlgMessage(String(err), { title: t('appTitle'), kind: 'error' });
  }
}

async function openFile(): Promise<void> {
  const path = await open({ multiple: false, filters: mdFilters() });
  if (typeof path === 'string') await openPath(path);
}

async function writeTabFile(tab: Tab, path: string): Promise<void> {
  const text = tabText(tab);
  await invoke('write_file', { path, contents: text });
  tab.filePath = path;
  tab.savedText = text;
  tab.baseline = await statFile(path);
  pushRecentFile(path);
  renderTabs();
  refreshChrome();
  scheduleSessionSave();
}

function ensureMdExt(path: string): string {
  return /\.(md|markdown|mdx)$/i.test(path) ? path : `${path}.md`;
}

async function saveAsTab(tab: Tab): Promise<boolean> {
  const path = await save({ defaultPath: `${tabLabel(tab)}.md`, filters: mdFilters() });
  if (typeof path !== 'string') return false;
  await writeTabFile(tab, ensureMdExt(path));
  return true;
}

async function saveActive(): Promise<boolean> {
  const tab = activeTab();
  if (!tab) return false;
  try {
    if (tab.filePath) {
      await writeTabFile(tab, tab.filePath);
      return true;
    }
    return await saveAsTab(tab);
  } catch (err) {
    await dlgMessage(String(err), { title: t('appTitle'), kind: 'error' });
    return false;
  }
}

async function saveActiveAs(): Promise<boolean> {
  const tab = activeTab();
  if (!tab) return false;
  try {
    return await saveAsTab(tab);
  } catch (err) {
    await dlgMessage(String(err), { title: t('appTitle'), kind: 'error' });
    return false;
  }
}

/** 页签关闭确认:确定=丢弃(false=取消)。 */
async function confirmDiscard(): Promise<boolean> {
  return ask(t('confirmDiscard'), { title: t('appTitle'), kind: 'warning' });
}

function switchTheme(): void {
  state.dark = !state.dark;
  state.prefs.dark = state.dark;
  writePref(THEME_KEY, state.dark ? 'dark' : 'light');
  applyTheme();
  // meditor 主题在创建时固化,切换即重建全部实例,内容与脏状态保留。
  for (const t of tabs) mountTabEditor(t, tabText(t));
  refreshChrome();
}

// --- 导出 HTML / 打印(PDF) ---

/** 打印页边距 → @page margin 值。 */
function resolvePrintMarginCss(margin: ShellPrefs['printMargin']): string {
  switch (margin) {
    case 'narrow':
      return '12mm';
    case 'wide':
      return '30mm';
    case 'none':
      return '0';
    default:
      return '';
  }
}

/**
 * 把打印/排版/编号偏好注入导出 HTML(导出与打印共用同一份成品):
 * @page 页边距、正文字体/字号/行距、标题自动编号(body 作用域 counter 规则)。
 */
function injectExportPrefs(html: string): string {
  const styles: string[] = [];
  const margin = resolvePrintMarginCss(state.prefs.printMargin);
  if (margin) {
    styles.push(`@page { margin: ${margin}; }`);
  }
  const fontCss: string[] = [];
  if (state.prefs.fontFamily.trim()) fontCss.push(`font-family: ${state.prefs.fontFamily.trim()};`);
  fontCss.push(`font-size: ${state.prefs.contentFontSize}px;`);
  fontCss.push(`line-height: ${state.prefs.lineHeight};`);
  styles.push(`body { ${fontCss.join(' ')} }`);
  if (state.prefs.headingNumbering) {
    styles.push(
      'body { counter-reset: xh1 xh2 xh3 xh4 xh5 xh6; }',
      'body h1 { counter-increment: xh1; counter-reset: xh2 xh3 xh4 xh5 xh6; }',
      'body h2 { counter-increment: xh2; counter-reset: xh3 xh4 xh5 xh6; }',
      'body h3 { counter-increment: xh3; counter-reset: xh4 xh5 xh6; }',
      'body h4 { counter-increment: xh4; counter-reset: xh5 xh6; }',
      'body h5 { counter-increment: xh5; counter-reset: xh6; }',
      'body h6 { counter-increment: xh6; }',
      'body h1::before { content: counter(xh1) ". "; }',
      'body h2::before { content: counter(xh1) "." counter(xh2) " "; }',
      'body h3::before { content: counter(xh1) "." counter(xh2) "." counter(xh3) " "; }',
      'body h4::before { content: counter(xh1) "." counter(xh2) "." counter(xh3) "." counter(xh4) " "; }',
      'body h5::before { content: counter(xh1) "." counter(xh2) "." counter(xh3) "." counter(xh4) "." counter(xh5) " "; }',
      'body h6::before { content: counter(xh1) "." counter(xh2) "." counter(xh3) "." counter(xh4) "." counter(xh5) "." counter(xh6) " "; }'
    );
  }
  const styleBlock = `<style data-export-prefs>${styles.join('\n')}</style>`;
  if (html.includes('</head>')) {
    return html.replace('</head>', `${styleBlock}\n</head>`);
  }
  return `${styleBlock}\n${html}`;
}

/** 生成当前页签的导出成品:独立 HTML + 相对图片内嵌 + 偏好注入(导出/打印共用)。 */
async function buildExportHtml(): Promise<string | null> {
  const tab = activeTab();
  let html = tab?.api?.getStandaloneHtml();
  if (!html || !tab) return null;
  html = await inlineLocalImagesForExport(html, tab.filePath ?? null);
  return injectExportPrefs(html);
}

/** 导出当前页签为独立单文件 HTML(内联样式,含公式/图表渲染结果)。 */
async function exportActiveHtml(): Promise<void> {
  const html = await buildExportHtml();
  if (!html) return;
  const tab = activeTab()!;
  const defaultName = `${tabLabel(tab).replace(/\.mdx?$/i, '')}.html`;
  const path = await save({ defaultPath: defaultName, filters: htmlFilters() });
  if (typeof path !== 'string') return;
  try {
    const finalPath = /\.html?$/i.test(path) ? path : `${path}.html`;
    await invoke('write_file', { path: finalPath, contents: html });
    flashStatus(t('statusExported', { path: finalPath }));
  } catch (err) {
    await dlgMessage(String(err), { title: t('appTitle'), kind: 'error' });
  }
}

/** 打印当前页签:导出 HTML 装入隐藏 iframe,只打印文档内容(可另存为 PDF)。 */
function printActive(): void {
  void (async () => {
    const html = await buildExportHtml();
    if (!html) return;
    const existingFrame = document.getElementById('print-frame') as HTMLIFrameElement | null;
    existingFrame?.remove();
    const frame = document.createElement('iframe');
    frame.id = 'print-frame';
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.setAttribute('aria-hidden', 'true');
    frame.srcdoc = html;
    frame.addEventListener('load', () => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        flashStatus(t('statusPrintHint'));
      } catch (err) {
        void dlgMessage(String(err), { title: t('appTitle'), kind: 'error' });
      }
    });
    document.body.appendChild(frame);
  })();
}

// --- 菜单(logo 弹出):新建/打开/保存/导出/最近文件/大纲/布局/专注/主题/设置 ---

/** 菜单开合(点 logo 切换,点外部/执行动作后收起)。 */
function toggleFileMenu(show?: boolean): void {
  const target = show ?? el.fileMenu.hidden;
  el.fileMenu.hidden = !target;
  if (target) renderRecentFiles();
}

el.btnMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleFileMenu();
});

document.addEventListener('click', (e) => {
  if (!el.fileMenu.hidden && !el.fileMenu.contains(e.target as Node)) toggleFileMenu(false);
});

el.miNew.addEventListener('click', () => {
  toggleFileMenu(false);
  newTab();
});
el.miOpen.addEventListener('click', () => {
  toggleFileMenu(false);
  void openFile();
});
el.miSave.addEventListener('click', () => {
  toggleFileMenu(false);
  void saveActive();
});
el.miSaveAs.addEventListener('click', () => {
  toggleFileMenu(false);
  void saveActiveAs();
});
el.miExportHtml.addEventListener('click', () => {
  toggleFileMenu(false);
  void exportActiveHtml();
});
el.miPrint.addEventListener('click', () => {
  toggleFileMenu(false);
  printActive();
});
el.miCopyLlm.addEventListener('click', () => {
  toggleFileMenu(false);
  void copyForLlm();
});
el.miOutline.addEventListener('click', () => {
  toggleFileMenu(false);
  // 大纲入口已内置于编辑器工具栏(内容右侧面板),菜单驱动活动页签编辑器同状态。
  activeTab()?.api?.toggleOutline();
});
el.miBlocksMode.addEventListener('click', () => {
  toggleFileMenu(false);
  applyBlocksMode(!state.blocksMode);
});
el.miLayoutFull.addEventListener('click', () => {
  toggleFileMenu(false);
  applyLayout('full');
});
el.miLayoutWide.addEventListener('click', () => {
  toggleFileMenu(false);
  applyLayout('wide');
});
el.miFocusMode.addEventListener('click', () => {
  toggleFileMenu(false);
  applyPrefs({ ...state.prefs, focusMode: !state.prefs.focusMode }, 'focusMode');
});
el.miTypewriterMode.addEventListener('click', () => {
  toggleFileMenu(false);
  applyPrefs({ ...state.prefs, typewriterMode: !state.prefs.typewriterMode }, 'typewriterMode');
});
el.miTheme.addEventListener('click', () => {
  toggleFileMenu(false);
  switchTheme();
});
el.miSettings.addEventListener('click', () => {
  toggleFileMenu(false);
  void refreshThemeFiles();
  openSettings(
    {
      onPrefsChange: (prefs, changed) => applyPrefs(prefs, changed),
      onLocaleChange: (locale) => applyLocale(locale),
      onTestUpload: () => testImageUploader(state.prefs),
      onOpenThemesFolder: () => {
        void (async () => {
          const dir = await resolveThemesDir();
          await invoke('ensure_dir', { dir }).catch(() => undefined);
          await invoke('reveal_in_shell', { path: dir }).catch(() => undefined);
        })();
      },
      getThemeFiles: () => themeFilesCache
    },
    () => state.prefs
  );
});

// --- 偏好应用(设置面板/菜单开关共用编排) ---

/** 应用偏好变更:按变更项分派到主题/版式/编辑器实例/持久化。 */
function applyPrefs(prefs: ShellPrefs, changed: keyof ShellPrefs): void {
  state.prefs = prefs;
  switch (changed) {
    case 'dark':
      if (prefs.dark !== state.dark) {
        switchTheme();
        return;
      }
      break;
    case 'layout':
      applyLayout(prefs.layout);
      break;
    case 'focusMode':
      writePref(FOCUS_MODE_KEY, prefs.focusMode ? 'on' : 'off');
      for (const t of tabs) t.api?.setFocusMode(prefs.focusMode);
      break;
    case 'typewriterMode':
      writePref(TYPEWRITER_MODE_KEY, prefs.typewriterMode ? 'on' : 'off');
      for (const t of tabs) t.api?.setTypewriterMode(prefs.typewriterMode);
      break;
    case 'autoPair':
      writePref(AUTO_PAIR_KEY, prefs.autoPair ? 'on' : 'off');
      // 输入规则插件在创建时固化:重建实例使其生效。
      for (const t of tabs) mountTabEditor(t, tabText(t));
      break;
    case 'emojiAutocomplete':
      writePref(EMOJI_COMPLETE_KEY, prefs.emojiAutocomplete ? 'on' : 'off');
      for (const t of tabs) mountTabEditor(t, tabText(t));
      break;
    case 'spellcheck':
      writePref(SPELLCHECK_KEY, prefs.spellcheck ? 'on' : 'off');
      for (const t of tabs) t.api?.setSpellcheck(prefs.spellcheck);
      break;
    case 'customCss':
      writePref(CUSTOM_CSS_KEY, prefs.customCss);
      applyCustomCss();
      break;
    case 'customTheme':
      writePref(CUSTOM_THEME_KEY, prefs.customTheme);
      void applyCustomTheme();
      break;
    case 'imageStrategy':
      writePref(IMAGE_STRATEGY_KEY, prefs.imageStrategy);
      break;
    case 'picgoUrl':
      writePref(PICGO_URL_KEY, prefs.picgoUrl);
      break;
    case 'uploadCommand':
      writePref(UPLOAD_COMMAND_KEY, prefs.uploadCommand);
      // 写回 Rust 侧执行配置(进程执行只认 Rust 持有的模板)。
      void invoke('set_upload_command_config', { command: prefs.uploadCommand }).catch(() => {});
      break;
    case 'autoSave':
      writePref(AUTO_SAVE_KEY, prefs.autoSave ? 'on' : 'off');
      restartAutoSaveTimer();
      break;
    case 'autoSaveInterval':
      writePref(AUTO_SAVE_INTERVAL_KEY, String(prefs.autoSaveInterval));
      restartAutoSaveTimer();
      break;
    case 'fontFamily':
      writePref(FONT_FAMILY_KEY, prefs.fontFamily);
      applyTypography();
      break;
    case 'contentFontSize':
      writePref(FONT_SIZE_KEY, String(prefs.contentFontSize));
      applyTypography();
      break;
    case 'lineHeight':
      writePref(LINE_HEIGHT_KEY, String(prefs.lineHeight));
      applyTypography();
      break;
    case 'zoom':
      writePref(ZOOM_KEY, String(prefs.zoom));
      applyTypography();
      break;
    case 'featMath':
    case 'featSuperscript':
    case 'featSubscript':
    case 'featHighlight':
    case 'featMermaid':
    case 'strictBreaks':
    case 'smartPunct':
    case 'headingNumbering':
    case 'codeLineNumbers':
    case 'codeWordWrap': {
      // 语法开关/显示开关在创建时固化:统一重建编辑器实例(内容与脏状态保留)。
      writePref(FEAT_MATH_KEY, prefs.featMath ? 'on' : 'off');
      writePref(FEAT_SUP_KEY, prefs.featSuperscript ? 'on' : 'off');
      writePref(FEAT_SUB_KEY, prefs.featSubscript ? 'on' : 'off');
      writePref(FEAT_HIGHLIGHT_KEY, prefs.featHighlight ? 'on' : 'off');
      writePref(FEAT_MERMAID_KEY, prefs.featMermaid ? 'on' : 'off');
      writePref(STRICT_BREAKS_KEY, prefs.strictBreaks ? 'on' : 'off');
      writePref(SMART_PUNCT_KEY, prefs.smartPunct ? 'on' : 'off');
      writePref(HEADING_NUMBERING_KEY, prefs.headingNumbering ? 'on' : 'off');
      writePref(CODE_LINE_NUMBERS_KEY, prefs.codeLineNumbers ? 'on' : 'off');
      writePref(CODE_WORD_WRAP_KEY, prefs.codeWordWrap ? 'on' : 'off');
      for (const tb of tabs) mountTabEditor(tb, tabText(tb));
      break;
    }
    case 'spellcheckLang':
      writePref(SPELLCHECK_LANG_KEY, prefs.spellcheckLang);
      for (const tb of tabs) tb.api?.setSpellcheckLang(prefs.spellcheckLang);
      break;
    case 'aiModels':
      // 模型清单:持久化并热推送到各页签 AI 面板(进行中的生成不受影响)。
      writePref(AI_MODELS_KEY, JSON.stringify(prefs.aiModels));
      for (const tb of tabs) tb.api?.setAiModels(prefs.aiModels);
      break;
    case 'printMargin':
      writePref(PRINT_MARGIN_KEY, prefs.printMargin);
      break;
  }
  syncModeChrome();
}

/** 切换界面语言:刷新静态文案 + 重建全部编辑器(文案在创建时固化)。 */
function applyLocale(locale: 'zh-CN' | 'en-US'): void {
  if (locale === getLocale()) return;
  setLocale(locale);
  applyStaticI18n();
  for (const t of tabs) mountTabEditor(t, tabText(t));
  refreshChrome();
}

/** 同步菜单项勾选态(大纲/布局模式/版式/专注/打字机)。 */
function syncModeChrome(): void {
  // 大纲勾选态跟随活动页签编辑器面板(菜单与工具栏按钮共同驱动)。
  el.miOutline.classList.toggle('active', activeTab()?.api?.isOutlineOpen() ?? false);
  el.miBlocksMode.classList.toggle('active', state.blocksMode);
  el.miLayoutFull.classList.toggle('active', state.prefs.layout === 'full');
  el.miLayoutWide.classList.toggle('active', state.prefs.layout === 'wide');
  el.miFocusMode.classList.toggle('active', state.prefs.focusMode);
  el.miTypewriterMode.classList.toggle('active', state.prefs.typewriterMode);
}

// --- 版式(全屏/超宽),持久化 ---

function applyLayout(mode: 'full' | 'wide'): void {
  el.editorHost.dataset.layout = mode;
  writePref(LAYOUT_KEY, mode);
  syncModeChrome();
}

// --- 布局模式(显示控制布局块显隐/编辑),持久化 ---

function applyBlocksMode(active: boolean): void {
  state.blocksMode = active;
  for (const t of tabs) t.api?.setLayoutMode(active);
  syncModeChrome();
  writePref(BLOCKS_MODE_KEY, active ? 'on' : 'off');
}

el.statusBlocks.addEventListener('click', () => applyBlocksMode(!state.blocksMode));

/** 复制给大模型:当前页签 Markdown 剥离布局块后写入剪贴板。 */
async function copyForLlm(): Promise<void> {
  const text = activeTab()?.api?.getMarkdownForLLM() ?? '';
  try {
    await navigator.clipboard.writeText(text);
    flashStatus(t('statusCopiedLlm', { count: text.length }));
  } catch (err) {
    await dlgMessage(t('copyFailed', { error: String(err) }), { title: t('appTitle'), kind: 'error' });
  }
}

// --- 快捷键(JS 侧接管;窗口无原生菜单) ---

document.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;
  const key = e.key.toLowerCase();
  if (key === 'n') {    e.preventDefault();
    newTab();
  } else if (key === 'o') {
    e.preventDefault();
    void openFile();
  } else if (key === 's') {
    e.preventDefault();
    void (e.shiftKey ? saveActiveAs() : saveActive());
  } else if (key === 'w') {
    e.preventDefault();
    const tab = activeTab();
    if (tab) void closeTab(tab.id);
  } else if (key === 'j') {
    e.preventDefault();
    switchTheme();
  } else if (key === 'p') {
    // Ctrl+P:打印当前文档(可另存为 PDF)。
    e.preventDefault();
    printActive();
  } else if (key === '=' || key === '+') {
    // Ctrl+=:视图放大(编辑器字号级缩放,与 Ctrl+滚轮同语义)。
    e.preventDefault();
    adjustZoom(10);
  } else if (key === '-') {
    e.preventDefault();
    adjustZoom(-10);
  } else if (key === '0') {
    e.preventDefault();
    if (state.prefs.zoom !== 100) adjustZoom(100 - state.prefs.zoom);
  } else if (key === 'tab') {
    e.preventDefault();
    if (tabs.length > 1) {
      const idx = tabs.findIndex((t) => t.id === activeId);
      const next = tabs[(idx + (e.shiftKey ? -1 : 1) + tabs.length) % tabs.length];
      activateTab(next.id);
    }
  }
});

// --- Ctrl+滚轮视图缩放(编辑器字号级缩放;捕获阶段拦截,避免页面缩放) ---

document.addEventListener(
  'wheel',
  (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    adjustZoom(e.deltaY < 0 ? 10 : -10);
  },
  { passive: false }
);

// --- 无边框窗口控制(自绘标题栏按钮) ---

const appWindow = getCurrentWindow();

el.winMin.addEventListener('click', () => void appWindow.minimize());
el.winMax.addEventListener('click', () => void appWindow.toggleMaximize());
// 走原生 close:触发 CloseRequested 拦截 → 会话暂存 → close_now。
el.winClose.addEventListener('click', () => void appWindow.close());
el.tabNew.addEventListener('click', () => newTab());

function syncMaximized(max: boolean): void {
  document.body.classList.toggle('maximized', max);
  updateTabScrollers();
}

void appWindow.isMaximized().then(syncMaximized).catch(() => {});
void appWindow.onResized(() => {
  void appWindow.isMaximized().then(syncMaximized).catch(() => {});
});

// --- 单实例转发/拖拽打开(各自新开页签) ---

void getCurrentWebview().onDragDropEvent((event) => {
  if (event.payload.type !== 'drop') return;
  const path = event.payload.paths.find((p) => /\.(md|markdown|mdx)$/i.test(p));
  if (path) void openPath(path);
});

void listen<string>('meditor://open-file', (e) => {
  void openPath(e.payload);
});

// --- 外部修改监视:只轮询活动页签,后台页签切回时补查 ---

async function statFile(path: string): Promise<FileStat | null> {
  try {
    return await invoke<FileStat | null>('stat_file', { path });
  } catch {
    return null;
  }
}

function sameStat(a: FileStat, b: FileStat): boolean {
  return a.mtimeMs === b.mtimeMs && a.size === b.size;
}

/** 以当前磁盘状态为监视基准:打开/保存/恢复后调用,避免自己的写入触发提醒。 */
async function refreshWatchBaseline(tab: Tab): Promise<void> {
  tab.baseline = tab.filePath ? await statFile(tab.filePath) : null;
}

function loadTabDiskContent(tab: Tab, markdown: string): void {
  tab.savedText = markdown;
  mountTabEditor(tab, markdown);
  renderTabs();
  if (tab.id === activeId) refreshChrome();
}

async function checkExternalChange(tab: Tab): Promise<void> {
  if (!tab.filePath) return;
  const stat = await statFile(tab.filePath);
  if (!stat) {
    // 文件被外部删除/移动:提醒一次并停止轮询;用户保存时重建文件。
    if (tab.baseline) {
      tab.baseline = null;
      void dlgMessage(t('fileRemoved', { path: tab.filePath }), {
        title: t('appTitle'),
        kind: 'warning'
      });
    }
    return;
  }
  if (tab.baseline && sameStat(stat, tab.baseline)) return;
  const disk = await invoke<string>('read_file', { path: tab.filePath }).catch(() => null);
  if (disk === null) return;
  tab.baseline = stat;
  if (disk === tabText(tab)) {
    // 外部写回了与编辑器一致的内容,只需前移基准。
    return;
  }
  if (!isDirty(tab)) {
    // 无未保存修改:像 VS Code 一样静默自动重载。
    loadTabDiskContent(tab, disk);
    if (tab.id === activeId) flashStatus(t('statusReloaded'));
    scheduleSessionSave();
    return;
  }
  const reload = await ask(t('externalChanged', { name: baseName(tab.filePath) }), {
    title: t('appTitle'),
    kind: 'warning',
    okLabel: t('reload'),
    cancelLabel: t('keepMine')
  });
  if (reload) {
    loadTabDiskContent(tab, disk);
    scheduleSessionSave();
  }
}

setInterval(() => {
  const tab = activeTab();
  if (watchBusy || !tab || !tab.filePath || !tab.baseline) return;
  watchBusy = true;
  checkExternalChange(tab)
    .catch(() => {})
    .finally(() => {
      watchBusy = false;
    });
}, WATCH_INTERVAL_MS);

// --- 关闭拦截:Rust prevent_close 后转发到这里。记事本式关闭:不弹
// 确认,全部页签(含脏内容)已在会话中自动暂存,这里兜底刷一次再关。 ---

void listen<null>('meditor://close-requested', async () => {
  appClosing = true;
  clearTimeout(sessionTimer);
  try {
    await invoke('save_session', { session: snapshotSession() });
  } catch (err) {
    appClosing = false;
    await dlgMessage(t('sessionFailed', { error: String(err) }), {
      title: t('appTitle'),
      kind: 'error'
    });
    return;
  }
  await invoke('close_now');
});

// --- 启动 ---

applyTheme();
applyCustomCss();
applyTypography();
applyCustomTheme();
applyLayout(state.prefs.layout);
restartAutoSaveTimer();
syncModeChrome();
applyStaticI18n();

/** 上传命令模板同步:Rust 侧配置为执行真源。启动时双向迁移——Rust 有而
 * localStorage 无(换机/清缓存)则种子回来;Rust 无而 localStorage 有(旧版
 * 升级)则推过去;之后设置界面的每次变更经 applyPrefs 实时写回 Rust。 */
async function syncUploadCommandConfig(): Promise<void> {
  const rustCommand = await invoke<string>('get_upload_command_config').catch(() => '');
  const localCommand = readPref(UPLOAD_COMMAND_KEY, '');
  if (rustCommand && !localCommand) {
    writePref(UPLOAD_COMMAND_KEY, rustCommand);
    state.prefs = { ...state.prefs, uploadCommand: rustCommand };
  } else if (!rustCommand && localCommand) {
    await invoke('set_upload_command_config', { command: localCommand }).catch(() => {});
  }
}

/** 启动引导:先恢复会话页签(即使带文件参数也恢复,记事本行为),
 * 再新开参数文件页签;什么都没有则给一个空白未命名页签。 */
async function bootstrap(): Promise<void> {
  let boot: BootPayload = {};
  try {
    boot = await invoke<BootPayload>('frontend_ready');
  } catch {
    /* 取不到载荷按全新启动处理 */
  }
  await syncUploadCommandConfig();
  const session = normalizeSession(boot.session);
  if (session) {
    for (const st of session.tabs) {
      let markdown = st.markdown;
      let savedText = st.savedText;
      // 干净页签以磁盘为准:应用关闭期间文件可能已被外部修改。
      if (st.filePath && markdown === savedText) {
        const disk = await invoke<string | null>('read_file', { path: st.filePath }).catch(() => null);
        if (disk !== null) {
          markdown = disk;
          savedText = disk;
        }
      }
      const tab = createTab({ filePath: st.filePath, markdown, savedText, activate: false });
      if (st.filePath) pushRecentFile(st.filePath);
      await refreshWatchBaseline(tab);
    }
  }
  if (boot.path && typeof boot.markdown === 'string') await openPath(boot.path);
  if (tabs.length === 0) {
    createTab({ markdown: '' });
    return;
  }
  // 聚焦:参数文件页签(若刚打开)优先,否则会话记录的活动页签。
  const opened =
    boot.path != null ? tabs.find((t) => t.filePath?.toLowerCase() === boot.path?.toLowerCase()) : undefined;
  const target =
    opened ?? tabs[Math.min(Math.max(session?.activeIndex ?? 0, 0), tabs.length - 1)];
  activateTab(target.id);
}

void bootstrap();
