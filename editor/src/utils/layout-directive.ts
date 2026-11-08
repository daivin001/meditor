/**
 * utils/layout-directive.ts — 布局指令解析(meditor-layout 围栏内容 → 渲染效果)
 *
 * 无后缀的 meditor-layout 围栏内容为 JSON 指令时驱动渲染效果(黑盒保存不受影响,
 * 解析失败只是"无效果",永不炸编辑器):
 * ```json
 * { "scope": "document", "width": "wide", "class": "hero" }
 * ```
 * - scope:"next"(默认,位置作用域)→ 作用于其后顶层内容直到下一个指令块或文档尾;
 *   scope:"document" → 作用于全文(取最后一个 document 指令)。
 * - width:内容宽度(narrow/normal/wide/full);class:自定义类名(宿主 CSS 扩展点,
 *   渲染时加 `zt-md-ml-c-<class>` 前缀类,防与编辑器内部类冲突)。
 * `meditor-layout:html` 后缀为 HTML 沙箱展示卡(见 layout-block-node-view),
 * 非指令;其余后缀(:js 等)v1 不解释。
 */

/**
 * HTML 沙箱展示卡的围栏 lang(小写比对;lang 为 info string 首个空白前 token)。
 */
export const MEDITOR_LAYOUT_HTML_KIND = 'meditor-layout:html';

/**
 * JS 沙箱执行卡的围栏 lang(小写比对;内容在 allow-scripts 沙箱 iframe 中执行,
 * 无同源特权,经 postMessage 桥回报高度/消息)。
 */
export const MEDITOR_LAYOUT_JS_KIND = 'meditor-layout:js';

/**
 * 判断围栏 lang 是否为 HTML 沙箱展示卡。
 */
export const isHtmlLayoutFenceLang = (lang: string | null | undefined): boolean => {
  if (typeof lang !== 'string') {
    return false;
  }
  return lang.trim().toLowerCase() === MEDITOR_LAYOUT_HTML_KIND;
};

/**
 * 判断围栏 lang 是否为 JS 沙箱执行卡。
 */
export const isScriptLayoutFenceLang = (lang: string | null | undefined): boolean => {
  if (typeof lang !== 'string') {
    return false;
  }
  return lang.trim().toLowerCase() === MEDITOR_LAYOUT_JS_KIND;
};

/**
 * 指令作用的内容宽度档位。
 */
export type LayoutWidth = 'narrow' | 'normal' | 'wide' | 'full';

/**
 * 指令作用的文本对齐档位。
 */
export type LayoutAlign = 'left' | 'center' | 'right';

/**
 * 已解析的布局指令。
 */
export interface LayoutDirective {
  /** 作用域:next = 其后内容(位置作用域);document = 全文。 */
  scope: 'next' | 'document';
  /** 内容宽度档位(normal 为默认,不产生效果)。 */
  width?: LayoutWidth;
  /** 自定义类名(已消毒;渲染时加 zt-md-ml-c- 前缀)。 */
  classes: string[];
  /**
   * 标题绑定:绑定到首个文本匹配(去首尾空格精确比对)的顶层标题及其章节
   * (直到下一个级别 ≤ 该标题的标题前)。存在时优先于 scope 字段。
   */
  heading?: string;
  /** 隐藏作用域内容(正常模式 display:none;布局模式仍可见以便修复)。 */
  hidden?: boolean;
  /** 作用域内容文本对齐。 */
  align?: LayoutAlign;
}

/** 合法宽度档位集合。 */
const LAYOUT_WIDTHS: ReadonlySet<string> = new Set(['narrow', 'normal', 'wide', 'full']);

/** 合法对齐档位集合。 */
const LAYOUT_ALIGNS: ReadonlySet<string> = new Set(['left', 'center', 'right']);

/** 自定义类名白名单:1~40 位字母/数字/下划线/连字符。 */
const DIRECTIVE_CLASS_PATTERN = /^[a-zA-Z0-9_-]{1,40}$/;

/** 标题绑定文本长度上限。 */
const DIRECTIVE_HEADING_MAX_LENGTH = 200;

/**
 * 消毒单个自定义类名:白名单字符 + 不允许 zt-md 前缀(编辑器内部类保留)。
 */
const sanitizeDirectiveClass = (name: unknown): string | null => {
  if (typeof name !== 'string') {
    return null;
  }
  if (!DIRECTIVE_CLASS_PATTERN.test(name) || name.toLowerCase().startsWith('zt-md')) {
    return null;
  }
  return name;
};

/**
 * 解析布局块内容为指令;不是可识别指令(JSON 解析失败/缺指令字段/非对象)返回 null。
 */
export const parseLayoutDirective = (value: string): LayoutDirective | null => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null;
  }
  const obj = raw as Record<string, unknown>;

  // 至少携带一个已知指令字段才视为指令;否则为普通数据块(黑盒,无效果)。
  const hasScope = obj.scope === 'next' || obj.scope === 'document';
  const hasWidth = typeof obj.width === 'string' && LAYOUT_WIDTHS.has(obj.width);
  const hasClass = obj.class !== undefined;
  const hasHeading = typeof obj.heading === 'string' && obj.heading.trim().length > 0;
  const hasHidden = obj.hidden === true;
  const hasAlign = typeof obj.align === 'string' && LAYOUT_ALIGNS.has(obj.align);
  if (!hasScope && !hasWidth && !hasClass && !hasHeading && !hasHidden && !hasAlign) {
    return null;
  }

  const directive: LayoutDirective = {
    scope: obj.scope === 'document' ? 'document' : 'next',
    classes: [],
  };
  if (hasWidth) {
    directive.width = obj.width as LayoutWidth;
  }
  if (hasHeading) {
    const heading = (obj.heading as string).trim().slice(0, DIRECTIVE_HEADING_MAX_LENGTH);
    if (heading.length > 0) {
      directive.heading = heading;
    }
  }
  if (hasHidden) {
    directive.hidden = true;
  }
  if (hasAlign) {
    directive.align = obj.align as LayoutAlign;
  }
  if (typeof obj.class === 'string') {
    const sanitized = sanitizeDirectiveClass(obj.class);
    if (sanitized !== null) {
      directive.classes.push(sanitized);
    }
  } else if (Array.isArray(obj.class)) {
    for (const item of obj.class) {
      const sanitized = sanitizeDirectiveClass(item);
      if (sanitized !== null && !directive.classes.includes(sanitized)) {
        directive.classes.push(sanitized);
      }
    }
  }
  return directive;
};

