/**
 * plugins/custom/callout/callout-plugin.ts — 标注块(Callout)节点 schema 与 mdast 转换
 *
 * markdown 表示(GitHub Alerts 语法,合法 blockquote,不支持处优雅降级为普通引用):
 *
 *   > [!NOTE]
 *   > 内容
 *
 * 五种 kind:note / tip / important / warning / caution(解析大小写不敏感,序列化归一为大写)。
 * 可选自定义标题(Obsidian 风格):`> [!NOTE] 标题`。
 *
 * - 解析:remark transformer 在 mdast 层把首行命中 `[!KIND]` 的 blockquote 就地改写为
 *   自定义类型 callout(data: { kind, title }),marker 从首段文本剥离;
 * - 序列化:toMarkdown 还原为 blockquote,并把 `[!KIND]` 行以 soft break 并入首个段落
 *   (无段落孩子时插入 marker 段落),round-trip 幂等。
 */
import { $nodeSchema, $remark } from '@milkdown/utils';

/**
 * 标注块节点类型名。
 */
export const CALLOUT_NODE_NAME = 'callout';

/**
 * 标注种类(小写存储,序列化转大写)。
 */
export type CalloutKind = 'note' | 'tip' | 'important' | 'warning' | 'caution';

/**
 * 全部合法 kind(序列化/点击循环用此顺序)。
 */
export const CALLOUT_KINDS: readonly CalloutKind[] = ['note', 'tip', 'important', 'warning', 'caution'];

/**
 * 判断字符串是否合法 kind。
 */
export const isCalloutKind = (value: unknown): value is CalloutKind =>
  typeof value === 'string' && (CALLOUT_KINDS as readonly string[]).includes(value);

/**
 * kind → 序列化用大写标记。
 */
export const calloutKindMarker = (kind: string): string => (isCalloutKind(kind) ? kind : 'note').toUpperCase();

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
 * 首行 marker 匹配:`[!NOTE]` / `[!TIP] 标题`(大小写不敏感)。
 */
const CALLOUT_MARKER_PATTERN = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*([^\n]*)/i;

/**
 * 尝试把 blockquote 改写为 callout mdast 节点(不命中 marker 返回 null)。
 */
const tryRewriteBlockquoteToCallout = (quote: MdastNodeLike): MdastNodeLike | null => {
  // 首个孩子必须是段落,且段落首个孩子是文本节点。
  const firstChild = quote.children?.[0];
  if (!firstChild || firstChild.type !== 'paragraph') {
    return null;
  }
  const firstInline = firstChild.children?.[0];
  if (!firstInline || firstInline.type !== 'text' || typeof firstInline.value !== 'string') {
    return null;
  }

  // 首行命中 marker(kind + 可选标题)。
  const match = CALLOUT_MARKER_PATTERN.exec(firstInline.value);
  if (!match) {
    return null;
  }
  // 捕获组(kind / 行内剩余文案)。
  const kindPart = match[1];
  const restPart = match[2];
  if (!kindPart) {
    return null;
  }
  const kind = kindPart.toLowerCase();
  const restOfLine = (restPart ?? '').trim();
  const title = restOfLine.length > 0 ? restOfLine : '';

  // 剥离 marker 行:取首个换行后的内容作为新文本值(无换行则置空)。
  const value = firstInline.value;
  const newlineIndex = value.indexOf('\n');
  firstInline.value = newlineIndex >= 0 ? value.slice(newlineIndex + 1) : '';

  return {
    ...quote,
    type: CALLOUT_NODE_NAME,
    data: { kind, title }
  };
};

/**
 * mdast 遍历:把命中 marker 的 blockquote 就地替换为 callout(覆盖嵌套容器)。
 * 导出以便脱离 milkdown 运行时做纯 mdast 契约自测。
 */
export const transformCallouts = (node: MdastNodeLike): void => {
  const children = node.children;
  if (!Array.isArray(children)) {
    return;
  }
  for (let index = 0; index < children.length; index += 1) {
    // 当前孩子节点。
    const child = children[index];
    if (!child) {
      continue;
    }
    if (child.type === 'blockquote') {
      // 先递归内层(内层 callout 先行改写),再尝试改写当前 blockquote。
      transformCallouts(child);
      const callout = tryRewriteBlockquoteToCallout(child);
      if (callout) {
        children[index] = callout;
      }
      continue;
    }
    transformCallouts(child);
  }
};

/**
 * remark 插件包装器(mdast 层 transformer 扩展,非 micromark 语法扩展)。
 */
export const remarkCalloutPlugin = $remark('remarkCallout', () => {
  // unified 插件:返回 mdast transformer。
  const plugin = () => (tree: MdastNodeLike) => {
    transformCallouts(tree);
  };
  return plugin as never;
});

/**
 * 标注块节点 schema。
 */
export const calloutSchema = $nodeSchema(CALLOUT_NODE_NAME, () => {
  return {
    group: 'block',
    content: 'block+',
    defining: true,
    attrs: {
      kind: { default: 'note', validate: 'string' },
      title: { default: '', validate: 'string' }
    },
    parseDOM: [
      {
        tag: `div[data-type="${CALLOUT_NODE_NAME}"]`,
        getAttrs: (dom) => {
          // 标注块容器节点。
          const element = dom as HTMLElement;
          return {
            kind: isCalloutKind(element.dataset.kind) ? element.dataset.kind : 'note',
            title: element.dataset.title ?? ''
          };
        }
      }
    ],
    toDOM: (node) => {
      // 序列化兜底(无 NodeView 场景,如剪贴板 HTML);带 content hole 保留孩子内容。
      const kind = isCalloutKind(node.attrs.kind) ? node.attrs.kind : 'note';
      // 容器属性(data-* 供 parseDOM 回读)。
      const attributes: Record<string, string> = {
        'data-type': CALLOUT_NODE_NAME,
        'data-kind': kind,
        class: 'zt-md-callout'
      };
      if (node.attrs.title) {
        attributes['data-title'] = String(node.attrs.title);
      }
      return ['div', attributes, 0];
    },
    parseMarkdown: {
      match: (node) => node.type === CALLOUT_NODE_NAME,
      runner: (state, node, type) => {
        // mdast data 携带 kind/title,块孩子照常解析。
        const data = (node.data ?? {}) as { kind?: string; title?: string };
        state.openNode(type, {
          kind: isCalloutKind(data.kind) ? data.kind : 'note',
          title: typeof data.title === 'string' ? data.title : ''
        });
        state.next(node.children ?? []);
        state.closeNode();
      }
    },
    toMarkdown: {
      match: (node) => node.type.name === CALLOUT_NODE_NAME,
      runner: (state, node) => {
        // 还原为 blockquote,marker 行并入首段(soft break),保证 round-trip 幂等。
        const kind = calloutKindMarker(String(node.attrs.kind ?? 'note'));
        const title = String(node.attrs.title ?? '').trim();
        const markerText = `[!${kind}]${title ? ` ${title}` : ''}`;
        state.openNode('blockquote');

        // 首个孩子为段落:marker 行并入该段落文本前(soft break)。
        const firstChild = node.firstChild;
        const firstIsParagraph = firstChild !== null && firstChild?.type.name === 'paragraph';
        if (firstIsParagraph && firstChild) {
          state.openNode('paragraph');
          state.addNode('text', undefined, `${markerText}\n`);
          firstChild.forEach((inlineChild) => {
            state.next(inlineChild);
          });
          state.closeNode();
          // 渲染剩余块孩子。
          node.forEach((blockChild, _offset, index) => {
            if (index >= 1) {
              state.next(blockChild);
            }
          });
        } else {
          // 无段落孩子:插入独立 marker 段落,再渲染全部孩子。
          state.openNode('paragraph');
          state.addNode('text', undefined, markerText);
          state.closeNode();
          node.forEach((blockChild) => {
            state.next(blockChild);
          });
        }
        state.closeNode();
      }
    }
  };
});

/**
 * 标注块插件聚合(mdast 转换 + schema)。
 */
export const callout: MilkdownPluginList = [remarkCalloutPlugin, calloutSchema].flat();

/**
 * Milkdown 插件列表形状。
 */
type MilkdownPluginList = readonly unknown[];
