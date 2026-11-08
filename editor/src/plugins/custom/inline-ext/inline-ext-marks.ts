/**
 * plugins/custom/inline-ext/inline-ext-marks.ts — 下划线/上下标 mark 与 Typora 风语法解析
 *
 * MD 往来约定(与 color-marks 同款架构):
 * - 序列化:mark → 自定义 mdast 节点 meditorInlineTag(data: { tag }),
 *   经 remark-stringify 的 toMarkdownExtensions 自定义 handler 原样打印为
 *   `<u>…</u>` / `<sub>…</sub>` / `<sup>…</sup>`(合法 CommonMark 行内 HTML,
 *   其他渲染器无损兼容);
 * - 解析一(标签配对):remark transformer 把行内 html 叶子(`<u>`/`<sub>`/`<sup>`
 *   及对应闭标签)按栈配对重写为 meditorInlineTag 父节点,子内容照常解析;
 * - 解析二(文本扫描):Typora 扩展语法 `==高亮==` / `^上标^` 在 remark 层是
 *   普通文本(无 micromark 语法),transformer 直接扫描 text 叶子按正则切分
 *   重写(== → 高亮 meditorSpan,^ → 上标)。
 *   注意 `~下标~` 不做文本扫描:GFM(remark-gfm)把单波浪线解析为删除线,
 *   两者语法冲突;下标经工具栏/选区菜单插入,以 <sub> 行内 HTML 往返。
 */
import { $markSchema, $remark } from '@milkdown/utils';
import type { MarkType } from '@milkdown/prose/model';
import type { EditorState } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import type { MeditorMarkdownFeatures } from '../../../types/editor';
import { DEFAULT_HIGHLIGHT_COLOR } from '../color/color-marks';

/**
 * 行内扩展语法生效集(解析/序列化按此过滤;缺省全开)。
 */
export type InlineExtFeatures = Required<
  Pick<MeditorMarkdownFeatures, 'highlight' | 'superscript' | 'subscript'>
>;

/**
 * 行内扩展语法缺省全开。
 */
export const resolveInlineExtFeatures = (
  features?: MeditorMarkdownFeatures
): InlineExtFeatures => ({
  highlight: features?.highlight ?? true,
  superscript: features?.superscript ?? true,
  subscript: features?.subscript ?? true
});

/**
 * 自定义 mdast 节点类型名(行内 HTML 标签包裹节点)。
 */
export const MEDITOR_INLINE_TAG_MDAST_TYPE = 'meditorInlineTag';

/**
 * 下划线 mark 节点类型名。
 */
export const UNDERLINE_MARK_NAME = 'underline';

/**
 * 下标 mark 节点类型名。
 */
export const SUBSCRIPT_MARK_NAME = 'subscript';

/**
 * 上标 mark 节点类型名。
 */
export const SUPERSCRIPT_MARK_NAME = 'superscript';

/**
 * meditorInlineTag 支持的 HTML 标签。
 */
export type MeditorInlineTagName = 'u' | 'sub' | 'sup';

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
 * 开标签匹配:`<u>` / `<sub>` / `<sup>`(mdast html 叶子 value 含结尾 `>`)。
 */
const TAG_OPEN_PATTERN = /^<(u|sub|sup)>$/i;

/**
 * 闭标签匹配:`</u>` / `</sub>` / `</sup>`。
 */
const TAG_CLOSE_PATTERN = /^<\/(u|sub|sup)>$/i;

/**
 * `==高亮==` 文本匹配(内容两端非空白、内部不含 `=`;与已有文本边界防误伤)。
 */
const HIGHLIGHT_TEXT_PATTERN = /==([^=\s][^=]*?[^=\s]|[^=\s])==/g;

/**
 * `^上标^` 文本匹配(内容两端非空白、内部不含 `^`)。
 */
const SUPERSCRIPT_TEXT_PATTERN = /\^([^\^\s][^^]*?[^\^\s]|[^\^\s])\^/g;

/**
 * 在单个 children 数组内做栈式标签配对重写(支持嵌套:u 套 sub 各自成层)。
 * 关闭的标签语法不配对:开/闭标签叶子直接丢弃,内容原样保留(降级不丢文本)。
 */
const rewriteInlineTagsInChildList = (
  children: MdastNodeLike[],
  features: InlineExtFeatures
): MdastNodeLike[] => {
  /** 重写结果(最外层或当前未闭合 frame 的收集区)。 */
  const result: MdastNodeLike[] = [];
  /** 未闭合标签栈。 */
  const openFrames: Array<{ tag: MeditorInlineTagName; collected: MdastNodeLike[] }> = [];

  /** 判断标签语法是否生效。 */
  const isTagEnabled = (tag: MeditorInlineTagName): boolean =>
    tag === 'u' || (tag === 'sub' ? features.subscript : features.superscript);

  /**
   * 把节点放入当前收集区(有未闭合标签时进栈顶,否则进结果)。
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
      const openMatch = TAG_OPEN_PATTERN.exec(tagValue);
      if (openMatch) {
        const tag = openMatch[1]?.toLowerCase() as MeditorInlineTagName | undefined;
        if (tag === 'u' || tag === 'sub' || tag === 'sup') {
          // 语法关闭:丢弃开标签,内容照常收集。
          if (isTagEnabled(tag)) {
            openFrames.push({ tag, collected: [] });
          }
          continue;
        }
      }
      if (TAG_CLOSE_PATTERN.test(tagValue) && openFrames.length > 0) {
        // 闭标签:弹栈并生成 meditorInlineTag 父节点(空内容时整层丢弃)。
        const frame = openFrames.pop();
        if (frame && frame.collected.length > 0) {
          pushIntoCurrent({
            type: MEDITOR_INLINE_TAG_MDAST_TYPE,
            data: { tag: frame.tag },
            children: frame.collected
          });
        }
        continue;
      }
    }

    pushIntoCurrent(child);
  }

  // 未闭合标签:丢弃开标签,内容原样保留(降级不丢数据)。
  while (openFrames.length > 0) {
    const frame = openFrames.pop();
    if (frame) {
      result.push(...frame.collected);
    }
  }
  return result;
};

/**
 * 扫描单个 text 叶子,按 Typora 扩展语法切分为 [文本 | 包裹节点] 序列。
 * 关闭的语法不扫描(文本原样保留)。
 */
const splitTextByInlineSyntax = (
  node: MdastNodeLike,
  features: InlineExtFeatures
): MdastNodeLike[] | null => {
  const value = node.value;
  if (typeof value !== 'string') {
    return null;
  }

  // 各语法合并扫描:记录全部命中区间,按位置排序后切片。
  type Hit = { start: number; end: number; content: string; tag: 'highlight' | 'sub' | 'sup' };
  const hits: Hit[] = [];
  if (features.highlight) {
    for (const match of value.matchAll(HIGHLIGHT_TEXT_PATTERN)) {
      const start = match.index ?? -1;
      if (start >= 0 && match[1] !== undefined) {
        hits.push({ start, end: start + match[0].length, content: match[1], tag: 'highlight' });
      }
    }
  }
  if (features.superscript) {
    for (const match of value.matchAll(SUPERSCRIPT_TEXT_PATTERN)) {
      const start = match.index ?? -1;
      if (start >= 0 && match[1] !== undefined) {
        hits.push({ start, end: start + match[0].length, content: match[1], tag: 'sup' });
      }
    }
  }
  if (hits.length === 0) {
    return null;
  }
  hits.sort((left, right) => left.start - right.start || right.end - left.end);

  /** 切分结果。 */
  const pieces: MdastNodeLike[] = [];
  /** 已消费位置。 */
  let cursor = 0;
  for (const hit of hits) {
    if (hit.start < cursor) {
      // 与上一命中重叠:丢弃后者(长匹配优先已由排序保证)。
      continue;
    }
    if (hit.start > cursor) {
      pieces.push({ type: 'text', value: value.slice(cursor, hit.start) });
    }
    pieces.push(
      hit.tag === 'highlight'
        ? {
            type: 'meditorSpan',
            data: { kind: 'highlight', color: DEFAULT_HIGHLIGHT_COLOR },
            children: [{ type: 'text', value: hit.content }]
          }
        : {
            type: MEDITOR_INLINE_TAG_MDAST_TYPE,
            data: { tag: hit.tag },
            children: [{ type: 'text', value: hit.content }]
          }
    );
    cursor = hit.end;
  }
  if (cursor < value.length) {
    pieces.push({ type: 'text', value: value.slice(cursor) });
  }
  return pieces;
};

/**
 * 递归重写一个行内 children 列表:先深入容器,再做文本扫描,最后做标签配对。
 * 导出以便脱离 milkdown 运行时做纯 mdast round-trip 自测。
 */
export const transformInlineExt = (
  children: MdastNodeLike[],
  features: InlineExtFeatures = resolveInlineExtFeatures()
): MdastNodeLike[] => {
  // 先递归容器子级(段落/标题/表格单元格/已有的包裹节点等)。
  for (const child of children) {
    if (Array.isArray(child.children)) {
      child.children = transformInlineExt(child.children, features);
    }
  }

  // 文本扫描(== / ^):逐叶子切分。
  const scanned: MdastNodeLike[] = [];
  for (const child of children) {
    const pieces = child.type === 'text' ? splitTextByInlineSyntax(child, features) : null;
    if (pieces) {
      scanned.push(...pieces);
    } else {
      scanned.push(child);
    }
  }

  // 标签配对(<u>/<sub>/<sup>)。
  return rewriteInlineTagsInChildList(scanned, features);
};

/**
 * remark 统一插件工厂:parse 侧挂 mdast transformer,serialize 侧挂 toMarkdown 扩展。
 * 导出以便脱离 milkdown 运行时做纯 mdast round-trip 自测。
 */
export const createInlineExtUnifiedPlugin = (features: InlineExtFeatures) =>
  function inlineExtUnified(this: {
    data: () => Record<string, unknown[] | undefined>;
  }): (tree: MdastNodeLike) => void {
    // serialize 侧:按 remark-gfm 标准模式挂 toMarkdown 扩展(data 对象需回写)。
    const data = this.data();
    const toMarkdownExtensions = data.toMarkdownExtensions ?? (data.toMarkdownExtensions = []);
    toMarkdownExtensions.push({
      handlers: {
        [MEDITOR_INLINE_TAG_MDAST_TYPE]: meditorInlineTagStringifyHandler
      }
    });
    // parse 侧:mdast transformer。
    return (tree: MdastNodeLike): void => {
      if (Array.isArray(tree.children)) {
        tree.children = transformInlineExt(tree.children, features);
      }
    };
  };

/**
 * remark 统一插件(全部语法开启;自测与既有用法兼容入口)。
 */
export const inlineExtUnifiedPlugin = createInlineExtUnifiedPlugin(resolveInlineExtFeatures());

/**
 * remark-stringify 自定义 handler:meditorInlineTag → `<tag>内容</tag>`。
 * handler 签名与 mdast-util-to-markdown 一致(node, parent, state, info)。
 */
const meditorInlineTagStringifyHandler = (
  node: MdastNodeLike,
  _parent: unknown,
  state: {
    enter: (type: string) => () => void;
    containerPhrasing: (parent: MdastNodeLike, safeOptions: { before: string; after: string }) => string;
  },
  _info: unknown
): string => {
  const data = (node.data ?? {}) as { tag?: string };
  const tag = data.tag === 'sub' || data.tag === 'sup' ? data.tag : 'u';
  const exit = state.enter(MEDITOR_INLINE_TAG_MDAST_TYPE);
  const between = state.containerPhrasing(node, { before: '<', after: '>' });
  exit();
  return `<${tag}>${between}</${tag}>`;
};

/**
 * remark 插件包装工厂(与 color-marks 同款 $remark 用法)。
 */
export const createRemarkInlineExtPlugin = (features: InlineExtFeatures) =>
  $remark('remarkInlineExt', () => createInlineExtUnifiedPlugin(features) as never);

/**
 * remark 插件包装(全部语法开启;既有用法兼容入口)。
 */
export const remarkInlineExtPlugin = createRemarkInlineExtPlugin(resolveInlineExtFeatures());

/**
 * 从 mdast meditorInlineTag 节点读标签名。
 */
const resolveInlineTag = (node: MdastNodeLike): MeditorInlineTagName | false => {
  if (node.type !== MEDITOR_INLINE_TAG_MDAST_TYPE) {
    return false;
  }
  const data = (node.data ?? {}) as { tag?: string };
  if (data.tag === 'sub' || data.tag === 'sup') {
    return data.tag;
  }
  if (data.tag === 'u') {
    return 'u';
  }
  return false;
};

/**
 * 创建标签对应 mark schema 的通用工厂(tag → mark 名与 toDOM)。
 */
const createInlineExtMarkSchema = (markName: string, tag: MeditorInlineTagName) =>
  $markSchema(markName, () => ({
    parseDOM: [
      {
        tag,
        getAttrs: () => ({}),
        // 下标/上标浏览器默认渲染即正确;下划线沿用 <u> 语义样式。
        preserveWhitespace: false
      }
    ],
    toDOM: () => [tag, 0],
    parseMarkdown: {
      match: (node) => resolveInlineTag(node as MdastNodeLike) === tag,
      runner: (state, node, type) => {
        state.openMark(type);
        // 子内容照常解析(包裹节点仅承载 mark,自身不产生文本);及时闭 mark,
        // 否则 mark 泄漏到段落中后续所有兄弟节点(u/sub/sup 吞掉后续正文)。
        state.next((((node as unknown) as MdastNodeLike).children ?? []) as never);
        state.closeMark(type);
      }
    },
    toMarkdown: {
      match: (mark) => mark.type.name === markName,
      runner: (state, mark) => {
        state.withMark(mark, MEDITOR_INLINE_TAG_MDAST_TYPE, undefined, { data: { tag } });
      }
    }
  }));

/**
 * 下划线 mark。
 */
export const underlineMarkSchema = createInlineExtMarkSchema(UNDERLINE_MARK_NAME, 'u');

/**
 * 下标 mark。
 */
export const subscriptMarkSchema = createInlineExtMarkSchema(SUBSCRIPT_MARK_NAME, 'sub');

/**
 * 上标 mark。
 */
export const superscriptMarkSchema = createInlineExtMarkSchema(SUPERSCRIPT_MARK_NAME, 'sup');

/**
 * 切换选区上的下划线/上下标 mark(工具栏与快捷键共用)。
 */
export const toggleInlineExtMark = (
  view: EditorView,
  markName: string
): boolean => {
  // 目标 mark 类型(schema 未装配时静默失败)。
  const markType = (view.state.schema.marks as Record<string, MarkType | undefined>)[markName];
  if (!markType) {
    return false;
  }
  const { from, to } = view.state.selection;
  const hasMark = view.state.doc.rangeHasMark(from, to, markType);
  const transaction = view.state.tr;
  if (hasMark) {
    transaction.removeMark(from, to, markType);
  } else {
    transaction.addMark(from, to, markType.create());
  }
  view.dispatch(transaction.scrollIntoView());
  view.focus();
  return true;
};

/**
 * 判断选区是否处于目标 mark(工具栏按钮激活态)。
 */
export const isInlineExtMarkActive = (state: EditorState, markName: string): boolean => {
  const markType = (state.schema.marks as Record<string, MarkType | undefined>)[markName];
  if (!markType) {
    return false;
  }
  return state.doc.rangeHasMark(state.selection.from, state.selection.to, markType);
};

/**
 * 按语法开关组装行内扩展插件组(remark 转换 + 下划线 + 按需的上下标 mark)。
 * 关闭的语法不注册对应 mark schema(工具栏按钮静默无效,由宿主一并隐藏)。
 */
export const createInlineExtMarks = (features?: MeditorMarkdownFeatures): unknown[] => {
  const resolved = resolveInlineExtFeatures(features);
  const marks: unknown[] = [
    createRemarkInlineExtPlugin(resolved),
    underlineMarkSchema
  ];
  if (resolved.subscript) {
    marks.push(subscriptMarkSchema);
  }
  if (resolved.superscript) {
    marks.push(superscriptMarkSchema);
  }
  return marks.flat();
};

/**
 * 行内扩展插件聚合(remark 转换 + 三个 mark schema;全部语法开启)。
 */
export const inlineExtMarks = createInlineExtMarks();
