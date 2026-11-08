/**
 * plugins/custom/color/color-marks.ts — 行内文字颜色/高亮背景 mark
 *
 * MD 往来约定(notion-parity-plan §3.2 第二档):
 * - 序列化:mark → 自定义 mdast 节点 meditorSpan(data: { kind, color }),
 *   经 remark-stringify 的 toMarkdownExtensions 自定义 handler 原样打印为
 *   `<span style="color:#xxx">…</span>` / `<span style="background-color:#xxx">…</span>`;
 * - 解析:remark transformer 把 mdast 行内 html 叶子(`<span style=…>` / `</span>` /
 *   `<mark>`)按栈配对重写为 meditorSpan 父节点,子内容照常解析;
 * - 其他渲染器把上述 HTML 当普通行内 HTML 渲染,MD 属性无损(合法 CommonMark)。
 */
import { $markSchema, $remark } from '@milkdown/utils';
import type { MarkType } from '@milkdown/prose/model';
import type { EditorState } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';

/**
 * 自定义 mdast 节点类型名(span 包裹节点)。
 */
export const MEDITOR_SPAN_MDAST_TYPE = 'meditorSpan';

/**
 * 行内颜色 mark 节点类型名。
 */
export const COLOR_MARK_NAME = 'color';

/**
 * 高亮背景 mark 节点类型名。
 */
export const HIGHLIGHT_MARK_NAME = 'highlight';

/**
 * 颜色种类:文字颜色 / 高亮背景。
 */
export type InlineColorKind = 'color' | 'highlight';

/**
 * 最小化 mdast 节点结构(transformer 只消费所需字段)。
 */
interface MdastNodeLike {
  type: string;
  children?: MdastNodeLike[];
  value?: string | null;
  data?: Record<string, unknown> | null;
  [key: string]: unknown;
}

/**
 * 行内开标签匹配:`<span style="color:#xxx">` / `<span style="background-color:#xxx">` /
 * `<mark style="background-color:#xxx">`(注意 mdast html 叶子 value 含结尾 `>`)。
 */
const SPAN_OPEN_PATTERN =
  /^<(span|mark)\s+style="\s*(color|background-color)\s*:\s*([^";]+?)\s*;?\s*"?>$/i;

/**
 * 裸开标签(无 style)匹配:`<mark>`(外部编辑器互操作,按默认黄色高亮处理)。
 */
const MARK_OPEN_PATTERN = /^<mark>$/i;

/**
 * 闭标签匹配:`</span>` / `</mark>`。
 */
const SPAN_CLOSE_PATTERN = /^<\/(span|mark)>$/i;

/**
 * rgb()/rgba() 颜色匹配(DOM 读回 style 时浏览器会规范化为 rgb 形式)。
 */
const RGB_COLOR_PATTERN = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)$/i;

/**
 * 十六进制颜色匹配(#rgb / #rrggbb)。
 */
const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * 把颜色值归一化为小写 hex(#rrggbb);rgb()/rgba() 转 hex(#rgb 不展开);
 * 其余一律返回空串。颜色值最终写入 style 属性,自由文本会构成 CSS 注入
 * (如 background-image: url(...) 追踪),故只放行受控格式。
 */
export const normalizeInlineColor = (value: string): string => {
  const raw = value.trim();
  const rgbMatch = RGB_COLOR_PATTERN.exec(raw);
  if (rgbMatch) {
    // rgb 分量转两位 hex(捕获组缺失时退回原文)。
    const red = rgbMatch[1];
    const green = rgbMatch[2];
    const blue = rgbMatch[3];
    if (!red || !green || !blue) {
      return '';
    }
    const toHex = (part: string): string =>
      Math.max(0, Math.min(255, Number.parseInt(part, 10)))
        .toString(16)
        .padStart(2, '0');
    return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
  }
  return HEX_COLOR_PATTERN.test(raw) ? raw.toLowerCase() : '';
};

/**
 * 行内颜色调色板(文字颜色,Notion 同系)。
 */
export const INLINE_TEXT_COLOR_OPTIONS = [
  { messageKey: 'colorNameGray', value: '#787774' },
  { messageKey: 'colorNameBrown', value: '#9f6b53' },
  { messageKey: 'colorNameOrange', value: '#d9730d' },
  { messageKey: 'colorNameYellow', value: '#cb912f' },
  { messageKey: 'colorNameGreen', value: '#448361' },
  { messageKey: 'colorNameBlue', value: '#337ea9' },
  { messageKey: 'colorNamePurple', value: '#9065b0' },
  { messageKey: 'colorNamePink', value: '#c14c8a' },
  { messageKey: 'colorNameRed', value: '#d44c47' }
] as const;

/**
 * 行内高亮调色板(背景色,Notion 同系浅色)。
 */
export const INLINE_HIGHLIGHT_COLOR_OPTIONS = [
  { messageKey: 'colorNameGray', value: '#f1f1ef' },
  { messageKey: 'colorNameBrown', value: '#f4eeee' },
  { messageKey: 'colorNameOrange', value: '#faebdd' },
  { messageKey: 'colorNameYellow', value: '#fbf3db' },
  { messageKey: 'colorNameGreen', value: '#edf3ec' },
  { messageKey: 'colorNameBlue', value: '#e7f3f8' },
  { messageKey: 'colorNamePurple', value: '#f6f3f9' },
  { messageKey: 'colorNamePink', value: '#faf1f5' },
  { messageKey: 'colorNameRed', value: '#fdebec' }
] as const;

/**
 * 裸 <mark> 的默认高亮色。
 */
export const DEFAULT_HIGHLIGHT_COLOR = '#fbf3db';

/**
 * 读取 meditorSpan data 中的 css 属性名。
 */
const resolveSpanCssProperty = (kind: unknown): string => {
  return kind === 'highlight' ? 'background-color' : 'color';
};

/**
 * remark-stringify 自定义 handler:meditorSpan → `<span style="…">内容</span>`。
 * handler 签名与 mdast-util-to-markdown 一致(node, parent, state, info)。
 */
const meditorSpanStringifyHandler = (
  node: MdastNodeLike,
  _parent: unknown,
  state: {
    enter: (type: string) => () => void;
    containerPhrasing: (parent: MdastNodeLike, safeOptions: { before: string; after: string }) => string;
  },
  _info: unknown
): string => {
  const data = (node.data ?? {}) as { kind?: string; color?: string };
  // 序列化前再校验一次:非法颜色直接丢弃 span 壳,内容按普通文本输出。
  const color = normalizeInlineColor(String(data.color ?? ''));
  if (!color) {
    const fallbackExit = state.enter(MEDITOR_SPAN_MDAST_TYPE);
    const fallback = state.containerPhrasing(node, { before: '', after: '' });
    fallbackExit();
    return fallback;
  }
  const exit = state.enter(MEDITOR_SPAN_MDAST_TYPE);
  const between = state.containerPhrasing(node, { before: '<', after: '>' });
  exit();
  return `<span style="${resolveSpanCssProperty(data.kind)}: ${color}">${between}</span>`;
};

/**
 * 在单个 children 数组内做栈式 span 配对重写(支持嵌套:颜色套高亮各自成层)。
 */
const rewriteSpansInChildList = (children: MdastNodeLike[]): MdastNodeLike[] => {
  /** 重写结果(最外层或当前未闭合 frame 的收集区)。 */
  const result: MdastNodeLike[] = [];
  /** 未闭合 span 栈。 */
  const openFrames: Array<{ kind: InlineColorKind; color: string; collected: MdastNodeLike[] }> = [];

  /**
   * 把节点放入当前收集区(有未闭合 span 时进栈顶,否则进结果)。
   */
  const pushIntoCurrent = (node: MdastNodeLike): void => {
    const frame = openFrames[openFrames.length - 1];
    if (frame) {
      frame.collected.push(node);
    } else {
      result.push(node);
    }
  };

  for (const child of children) {
    if (child.type === 'html' && typeof child.value === 'string') {
      // 纯值比对(去掉首尾空白,兼容打印差异)。
      const tagValue = child.value.trim();
      const openMatch = SPAN_OPEN_PATTERN.exec(tagValue);
      if (openMatch) {
        // 捕获组:1=标签名,2=css 属性,3=颜色值。
        const cssProperty = openMatch[2];
        const colorValue = openMatch[3];
        if (cssProperty && colorValue) {
          openFrames.push({
            kind: cssProperty.toLowerCase() === 'background-color' ? 'highlight' : 'color',
            color: normalizeInlineColor(colorValue),
            collected: []
          });
          continue;
        }
      }
      if (MARK_OPEN_PATTERN.test(tagValue)) {
        openFrames.push({ kind: 'highlight', color: DEFAULT_HIGHLIGHT_COLOR, collected: [] });
        continue;
      }
      if (SPAN_CLOSE_PATTERN.test(tagValue) && openFrames.length > 0) {
        // 闭标签:弹栈并生成 meditorSpan 父节点(空内容时整层丢弃)。
        const frame = openFrames.pop();
        if (frame && frame.collected.length > 0) {
          pushIntoCurrent({
            type: MEDITOR_SPAN_MDAST_TYPE,
            data: { kind: frame.kind, color: frame.color },
            children: frame.collected
          });
        }
        continue;
      }
    }

    // 递归处理容器子级(段落/标题/表格单元格等)。
    if (Array.isArray(child.children) && child.type !== MEDITOR_SPAN_MDAST_TYPE) {
      child.children = rewriteSpansInChildList(child.children);
    }
    pushIntoCurrent(child);
  }

  // 未闭合 span:丢弃开标签,内容原样保留(降级不丢数据)。
  while (openFrames.length > 0) {
    const frame = openFrames.pop();
    if (frame) {
      result.push(...frame.collected);
    }
  }
  return result;
};

/**
 * remark 统一插件:parse 侧挂 mdast transformer,serialize 侧挂 toMarkdown 扩展。
 * 导出以便脱离 milkdown 运行时做纯 mdast round-trip 自测。
 */
export const meditorSpanUnifiedPlugin = function meditorSpanUnified(this: {
  data: () => Record<string, unknown[] | undefined>;
}): MdastTransformerLike {
  // serialize 侧:按 remark-gfm 标准模式挂 toMarkdown 扩展(data 对象需回写)。
  const data = this.data();
  const toMarkdownExtensions =
    data.toMarkdownExtensions ?? (data.toMarkdownExtensions = []);
  toMarkdownExtensions.push({ handlers: { [MEDITOR_SPAN_MDAST_TYPE]: meditorSpanStringifyHandler } });
  // parse 侧:mdast transformer,把行内 span/mark html 叶子重写为 meditorSpan。
  return (tree: MdastNodeLike): void => {
    if (Array.isArray(tree.children)) {
      tree.children = rewriteSpansInChildList(tree.children);
    }
  };
};

/**
 * mdast transformer 形状(unified 插件返回值)。
 */
type MdastTransformerLike = (tree: MdastNodeLike) => void;

/**
 * remark 插件包装(与 mtable 同款 $remark 用法)。
 */
export const remarkMeditorSpanPlugin = $remark('remarkMeditorSpan', () => meditorSpanUnifiedPlugin as never);

/**
 * 从 mdast meditorSpan 节点读颜色值。
 */
const resolveSpanMarkColor = (node: MdastNodeLike, expectedKind: InlineColorKind): string | false => {
  if (node.type !== MEDITOR_SPAN_MDAST_TYPE) {
    return false;
  }
  const data = (node.data ?? {}) as { kind?: string; color?: string };
  if ((data.kind ?? 'color') !== expectedKind || typeof data.color !== 'string' || data.color === '') {
    return false;
  }
  return data.color;
};

/**
 * 创建 kind 对应的 mark schema(通用部分收敛于此)。
 */
const createInlineColorMarkSchema = (markName: string, kind: InlineColorKind) =>
  $markSchema(markName, () => ({
    attrs: {
      color: { default: '', validate: 'string' }
    },
    // 编辑器渲染与自身粘贴回读:data-* 保底 + style 即视觉。
    parseDOM: [
      {
        tag: 'span[style]',
        getAttrs: (dom) => {
          // 目标 css 属性当前值。
          const element = dom as HTMLElement;
          const raw =
            kind === 'highlight' ? element.style.backgroundColor : element.style.color;
          if (!raw) {
            return false;
          }
          return { color: normalizeInlineColor(raw) };
        }
      }
    ],
    toDOM: (mark) => {
      // 归一化后的颜色值(非法值不写 style,仅留 data-* 供回读诊断)。
      const color = normalizeInlineColor(String(mark.attrs.color ?? ''));
      const style = color
        ? kind === 'highlight'
          ? `background-color: ${color};`
          : `color: ${color};`
        : '';
      return [
        'span',
        kind === 'highlight'
          ? { 'data-highlight': color, style }
          : { 'data-color': color, style }
      ];
    },
    parseMarkdown: {
      match: (node) => resolveSpanMarkColor(node as MdastNodeLike, kind) !== false,
      runner: (state, node, type) => {
        // 归一化后的颜色值。
        const color = resolveSpanMarkColor(node as MdastNodeLike, kind);
        state.openMark(type, { color: typeof color === 'string' ? color : '' });
        // 消费包裹子内容并及时闭 mark:不消费会丢内容、不闭 mark 会把 mark
        // 泄漏到段落中后续所有兄弟节点(color 被吞字/染色范围扩大)。
        state.next(((node as MdastNodeLike).children ?? []) as never);
        state.closeMark(type);
      }
    },
    toMarkdown: {
      match: (mark) => mark.type.name === markName,
      runner: (state, mark) => {
        state.withMark(mark, MEDITOR_SPAN_MDAST_TYPE, undefined, {
          data: { kind, color: normalizeInlineColor(String(mark.attrs.color ?? '')) }
        });
      }
    }
  }));

/**
 * 行内文字颜色 mark。
 */
export const colorMarkSchema = createInlineColorMarkSchema(COLOR_MARK_NAME, 'color');

/**
 * 行内高亮背景 mark。
 */
export const highlightMarkSchema = createInlineColorMarkSchema(HIGHLIGHT_MARK_NAME, 'highlight');

/**
 * 颜色插件聚合(remark 转换 + 两个 mark schema)。
 */
export const colorMarks = [remarkMeditorSpanPlugin, colorMarkSchema, highlightMarkSchema].flat();

/**
 * 给选区应用/清除行内颜色 mark(color 为 null 表示清除)。
 */
export const applyInlineColorMark = (
  view: EditorView,
  markType: MarkType,
  color: string | null
): void => {
  // 当前选区范围。
  const { from, to } = view.state.selection;
  // 先清同型 mark 再按需写入,保证换色幂等。
  const transaction = view.state.tr.removeMark(from, to, markType);
  if (color) {
    transaction.addMark(from, to, markType.create({ color: normalizeInlineColor(color) }));
  }
  view.dispatch(transaction.scrollIntoView());
  view.focus();
};

/**
 * 读取选区内首个目标 mark 的颜色值(无则返回 null)。
 */
export const resolveSelectedInlineColor = (
  state: EditorState,
  markType: MarkType
): string | null => {
  // 当前选区范围。
  const { from, to } = state.selection;
  // 命中的颜色值。
  let matchedColor: string | null = null;

  state.doc.nodesBetween(from, to, (node) => {
    // 当前节点上的目标 mark。
    const mark = node.marks.find((item) => item.type === markType);
    if (!mark) {
      return true;
    }
    matchedColor = normalizeInlineColor(String(mark.attrs.color ?? ''));
    return false;
  });

  return matchedColor;
};
