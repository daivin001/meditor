/**
 * packages/meditor/src/icons/index.ts — meditor 包内置图标库（复制自 src/shared/icons，包自包含）
 * meditor 包内统一的内置图标入口:
 * - createSharedIcon(name, options?) — 唯一入口,返回包着 SVG 的 <span>
 * - 内置图标表为 lucide 线条风(24x24 stroke),渲染走 currentColor,
 *   颜色/粗细随宿主样式,风格与 meditor 既有图标完全一致;
 * - 未知键名回退 paragraph,保证外部配置误传时不崩。
 */

/**
 * 共享图标键名集合(覆盖工具栏 / slash 菜单 / 块手柄 / 选区工具栏所需全部图形)。
 */
export type SharedIconName =
  // --- 格式类 ---
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'subscript'
  | 'superscript'
  | 'footnote'
  | 'toc'
  | 'inlineCode'
  | 'codeBlock'
  | 'link'
  | 'clearFormat'
  | 'formatBrush'
  | 'erase'
  | 'highlight'
  | 'textColor'
  // --- 块结构类 ---
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'list'
  | 'orderedList'
  | 'taskList'
  | 'quote'
  | 'hr'
  | 'table'
  | 'image'
  | 'video'
  | 'audio'
  | 'bookmark'
  | 'database'
  | 'math'
  | 'sigma'
  | 'smile'
  // --- 操作类 ---
  | 'plus'
  | 'minus'
  | 'undo'
  | 'redo'
  | 'search'
  | 'menu'
  | 'drag'
  | 'correct'
  | 'close'
  | 'trash'
  | 'preview'
  | 'chevronDown'
  | 'translate'
  | 'layoutTemplate'
  | 'sourceCode'
  | 'ai'
  // --- 表格操作类 ---
  | 'insertRowAbove'
  | 'insertRowBelow'
  | 'insertColumnLeft'
  | 'insertColumnRight'
  | 'deleteRow'
  | 'deleteColumn'
  | 'mergeCells'
  | 'splitCells';

/**
 * 内置图标 path 表(lucide 线条风,24x24 stroke)。
 */
const ICON_PATHS: Record<SharedIconName, string> = {
  // --- 格式类 ---
  bold: '<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/>',
  italic: '<path d="M19 4h-9M14 20H5M15 4L9 20"/>',
  underline: '<path d="M6 4v6a6 6 0 0 0 12 0V4M4 20h16"/>',
  strikethrough: '<path d="M16 4H9a3 3 0 0 0-2.83 4M14 12a4 4 0 0 1 0 8H6M4 12h16"/>',
  // subscript/superscript:大 X 配角标位置的小 x(lucide 无原生图形,自绘)。
  subscript:
    '<path d="m3 5 7 9M10 5l-7 9"/><path d="m15 15 5 5M20 15l-5 5"/>',
  superscript:
    '<path d="m3 10 7 9M10 10l-7 9"/><path d="m15 4 5 5M20 4l-5 5"/>',
  // footnote:引用标记 [1](方括号 + 数字)。
  footnote:
    '<path d="M7 4H5a1 1 0 0 0-1 1v5c0 1-1 2-2 2 1 0 2 1 2 2v5a1 1 0 0 0 1 1h2"/><path d="M17 4h2a1 1 0 0 1 1 1v5c0 1 1 2 2 2-1 0-2 1-2 2v5a1 1 0 0 1-1 1h-2"/><path d="M11 10h2v5"/>',
  // toc:目录(标题行 + 缩进条目)。
  toc: '<path d="M4 6h10M4 12h16M4 18h12"/><circle cx="2.5" cy="6" r="0.5"/><circle cx="2.5" cy="12" r="0.5"/><circle cx="2.5" cy="18" r="0.5"/>',
  inlineCode: '<path d="M8 6l-6 6 6 6M16 6l6 6-6 6"/>',
  codeBlock: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M10 9l-3 3 3 3M14 9l3 3-3 3"/>',
  link: '<path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8"/>',
  clearFormat: '<path d="M4 7V4h16v3M5 20h6M13 4 8 20M15 15l5 5M20 15l-5 5"/>',
  formatBrush: '<path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>',
  erase: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
  highlight: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  textColor: '<path d="M12 4 6 16M12 4l6 12M8.5 12h7M5 20h14"/>',
  // --- 块结构类 ---
  paragraph: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>',
  // heading 图标数字采用 lucide 标准 path,保证 "H1~H6" 数字清晰可辨。
  heading1: '<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/>',
  heading2: '<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/>',
  heading3: '<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"/>',
  heading4: '<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17 10v3a1 1 0 0 0 1 1h3"/><path d="M21 10v8"/>',
  heading5: '<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17 13v-3h4"/><path d="M17 17.7c.4.2.8.3 1.3.3 1.5 0 2.7-1.1 2.7-2.5S19.8 13 18.3 13H17"/>',
  heading6: '<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M20 10c-2 2-3 3.5-3 6"/>',
  list: '<path d="M3 12h.01M3 18h.01M3 6h.01M8 12h13M8 18h13M8 6h13"/>',
  orderedList: '<path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
  taskList: '<path d="m3 17 2 2 4-4m-6-8 2 2 4-4M13 6h8M13 12h8M13 18h8"/>',
  quote:
    '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h1c1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>',
  hr: '<path d="M5 12h14"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10M15 10v10"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  video: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m10 8 6 4-6 4Z"/>',
  audio: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  math: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V8h6M9 12h5M13 12l4 5"/>',
  sigma: '<path d="M18 6V4H6l6 8-6 8h12v-2"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
  // --- 操作类 ---
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  redo: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  drag: '<circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/>',
  correct: '<path d="M20 6 9 17l-5-5"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  trash:
    '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>',
  preview: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  // translate:lucide "languages" 图形(双语言 A/文),表达全文翻译。
  translate: '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
  // layoutTemplate:lucide "layout-template" 图形(标题区 + 双子区),表达布局块。
  layoutTemplate:
    '<rect width="18" height="7" x="3" y="3" rx="1"/><rect width="9" height="7" x="3" y="14" rx="1"/><rect width="5" height="7" x="14" y="14" rx="1"/>',
  // sourceCode:lucide "file-code" 图形(文档 + 尖括号),表达整篇 Markdown 源码编辑。
  sourceCode:
    '<path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/><path d="M15.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/>',
  // ai:lucide "sparkles" 图形(主星 + 双小星),表达 AI 助手。
  ai: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>',
  // --- 表格操作类(插行/插列箭头 + 删行删列 X,语义与动作一一对应) ---
  insertRowAbove: '<path d="M4 20h16"/><path d="M12 20v-9"/><path d="m8 11 4-4 4 4"/>',
  insertRowBelow: '<path d="M4 4h16"/><path d="M12 4v9"/><path d="m8 13 4 4 4-4"/>',
  insertColumnLeft: '<path d="M4 4v16"/><path d="M4 12h9"/><path d="m13 8-4 4 4 4"/>',
  insertColumnRight: '<path d="M20 4v16"/><path d="M20 12H11"/><path d="m11 8 4 4-4 4"/>',
  deleteRow: '<path d="M4 12h16"/><path d="M9 9l6 6"/><path d="M15 9l-6 6"/>',
  deleteColumn: '<path d="M12 4v16"/><path d="M9 9l6 6"/><path d="M15 9l-6 6"/>',
  // mergeCells:两格箭头汇聚为一格(lucide combine 风格)。
  mergeCells:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 10h18M10 3v7"/><path d="m13 14 4 4m0-4-4 4"/>',
  // splitCells:一格拆分为两格(lucide split 风格)。
  splitCells:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 10h18M12 10v11"/><path d="m9 14-2 2 2 2"/>'
};

/**
 * 创建共享图标的参数。
 */
export interface SharedIconOptions {
  /** 渲染尺寸(px)，默认 18。 */
  size?: number;
  /** 线条宽度，默认 2。 */
  strokeWidth?: number;
  /** 容器 span 的 className，默认 'shared-icon'。 */
  className?: string;
}

/**
 * 判定键名是否为合法共享图标键。
 */
export const isSharedIconName = (name: string): name is SharedIconName => {
  return name in ICON_PATHS;
};

// 未知键名时的回退图标（正文图形，中性不误导）。
const FALLBACK_ICON_NAME: SharedIconName = 'paragraph';

/**
 * 创建共享图标元素（全项目统一入口,内置 lucide 线条风）。
 *
 * @param name 共享图标键名（见 SharedIconName；未知键回退 paragraph）
 * @param options 尺寸 / 线宽 / className
 * @returns 包含 SVG 的 <span aria-hidden="true">
 */
export const createSharedIcon = (name: string, options?: SharedIconOptions): HTMLElement => {
  const size = options?.size ?? 18;
  const strokeWidth = options?.strokeWidth ?? 2;
  const className = options?.className ?? 'shared-icon';

  // 非法键回退，保证外部配置误传时不崩。
  const resolvedName: SharedIconName = isSharedIconName(name) ? name : FALLBACK_ICON_NAME;

  const host = document.createElement('span');
  host.className = className;
  host.setAttribute('aria-hidden', 'true');
  host.innerHTML =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"` +
    ` fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round"` +
    ` stroke-linejoin="round">${ICON_PATHS[resolvedName]}</svg>`;
  return host;
};
