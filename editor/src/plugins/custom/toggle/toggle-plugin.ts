/**
 * plugins/custom/toggle/toggle-plugin.ts — 折叠块(Toggle)节点 schema 与 mdast 转换
 *
 * markdown 表示(HTML <details> 块,合法 CommonMark,其他渲染器原生支持或按 HTML 渲染):
 *
 *   <details>
 *   <summary>标题</summary>
 *
 *   内容(真实 markdown 块,与 summary 之间空行分隔)
 *
 *   </details>
 *
 * - 标题(summary)是业务数据,持久化进 MD;折叠展开是界面状态,不持久化(见
 *   notion-parity-plan §2 纪律);
 * - 解析:remark transformer 把「<details> 开标签 html 节点 … </details> 闭标签 html 节点」
 *   的跨度改写为自定义类型 toggle(data: { summary })。commonmark 预置的
 *   remarkHTMLTransformer 会把 root/blockquote/listItem 下的 html 叶子包进段落,
 *   因此同时兼容「裸 html 叶子」与「段落包裹的 html」两种形态;
 * - 序列化:toMarkdown 还原为 html 块对(summary 行与 <details> 同叶),块间由
 *   remark-stringify 自然产出空行,保证内容按 markdown 处理与 round-trip 幂等;
 * - 未闭合 <details> 不改写,html 节点按既有逻辑降级处理,不丢内容。
 */
import { $nodeSchema, $remark } from '@milkdown/utils';

/**
 * 折叠块节点类型名。
 */
export const TOGGLE_NODE_NAME = 'toggle';

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
 * 开标签匹配:`<details>` / `<details open>`(允许任意属性,属性一律不持久化)。
 */
const DETAILS_OPEN_PATTERN = /^<details(\s[^>]*)?>\s*(?:\n\s*)?$/i;

/**
 * 开标签内联 summary 匹配:`<details>…<summary>标题</summary>` 同叶形式。
 */
const DETAILS_OPEN_WITH_SUMMARY_PATTERN =
  /^<details(\s[^>]*)?>\s*(?:\n\s*)?<summary>([\s\S]*?)<\/summary>\s*$/i;

/**
 * 独立 summary 行匹配(开标签与 summary 分离形态)。
 */
const SUMMARY_ONLY_PATTERN = /^<summary>([\s\S]*?)<\/summary>\s*$/i;

/**
 * 闭标签匹配。
 */
const DETAILS_CLOSE_PATTERN = /^<\/details>\s*$/i;

/**
 * 读取节点的 html 值:裸 html 叶子,或「段落包裹的唯一 html 叶子」
 * (后者来自 commonmark remarkHTMLTransformer 的包装),其余返回 null。
 */
const resolveHtmlMarkerValue = (node: MdastNodeLike): string | null => {
  if (node.type === 'html' && typeof node.value === 'string') {
    return node.value;
  }
  if (
    node.type === 'paragraph' &&
    Array.isArray(node.children) &&
    node.children.length === 1
  ) {
    const only = node.children[0];
    if (only && only.type === 'html' && typeof only.value === 'string') {
      return only.value;
    }
  }
  return null;
};

/**
 * 判断节点是否为 <details> 开标签 marker;命中返回 summary(未含时为 null)。
 */
const matchOpenDetailsMarker = (
  node: MdastNodeLike
): { summary: string | null } | null => {
  // 节点携带的 html 值。
  const htmlValue = resolveHtmlMarkerValue(node);
  if (htmlValue === null) {
    return null;
  }

  // 同叶形式:<details>\n<summary>标题</summary>。
  const withSummary = DETAILS_OPEN_WITH_SUMMARY_PATTERN.exec(htmlValue.trim());
  if (withSummary) {
    return { summary: withSummary[2] ?? '' };
  }

  // 仅开标签形式(summary 在后续节点)。
  if (DETAILS_OPEN_PATTERN.test(htmlValue.trim())) {
    return { summary: null };
  }
  return null;
};

/**
 * 判断节点是否为独立 <summary> 标题 marker,命中返回标题文本。
 */
const matchSummaryMarker = (node: MdastNodeLike): string | null => {
  // 节点携带的 html 值。
  const htmlValue = resolveHtmlMarkerValue(node);
  if (htmlValue === null) {
    return null;
  }
  const match = SUMMARY_ONLY_PATTERN.exec(htmlValue.trim());
  return match ? match[1] ?? '' : null;
};

/**
 * 判断节点是否为 </details> 闭标签 marker。
 */
const matchCloseDetailsMarker = (node: MdastNodeLike): boolean => {
  // 节点携带的 html 值。
  const htmlValue = resolveHtmlMarkerValue(node);
  return htmlValue !== null && DETAILS_CLOSE_PATTERN.test(htmlValue.trim());
};

/**
 * 在单个 children 数组内扫描并改写 toggle 跨度(返回新数组;支持嵌套容器递归)。
 * 导出以便脱离 milkdown 运行时做纯 mdast 契约自测。
 */
export const rewriteTogglesInChildList = (children: MdastNodeLike[]): MdastNodeLike[] => {
  /** 改写结果。 */
  const result: MdastNodeLike[] = [];

  for (let index = 0; index < children.length; index += 1) {
    // 当前孩子节点。
    const child = children[index];
    if (!child) {
      continue;
    }

    // 命中开标签 marker:向前收集内容直到闭标签。
    const openMarker = matchOpenDetailsMarker(child);
    if (openMarker) {
      // 内容收集区与闭标签下标。
      const collected: MdastNodeLike[] = [];
      let closeIndex = -1;
      // 标题(开标签同叶时已有)。
      let summary = openMarker.summary;

      for (let scan = index + 1; scan < children.length; scan += 1) {
        // 扫描位置节点。
        const candidate = children[scan];
        if (!candidate) {
          continue;
        }
        if (matchCloseDetailsMarker(candidate)) {
          closeIndex = scan;
          break;
        }
        if (summary === null) {
          // 尚无标题:尝试下一个 marker 节点上的 <summary> 行。
          const summaryText = matchSummaryMarker(candidate);
          if (summaryText !== null) {
            summary = summaryText;
            continue;
          }
        }
        collected.push(candidate);
      }

      // 未闭合:原样保留开标签节点,内容交给后续迭代(降级不丢数据)。
      if (closeIndex < 0) {
        result.push(child);
        continue;
      }

      // 空标题占位(折叠块允许无标题)。
      result.push({
        type: TOGGLE_NODE_NAME,
        data: { summary: summary ?? '' },
        children: collected
      });
      index = closeIndex;
      continue;
    }

    // 递归处理容器子级。
    if (Array.isArray(child.children) && child.type !== TOGGLE_NODE_NAME) {
      child.children = rewriteTogglesInChildList(child.children);
    }
    result.push(child);
  }
  return result;
};

/**
 * remark 插件包装器(mdast 层 transformer 扩展)。
 */
export const remarkTogglePlugin = $remark('remarkToggle', () => {
  // unified 插件:返回 mdast transformer。
  const plugin = () => (tree: MdastNodeLike) => {
    if (Array.isArray(tree.children)) {
      tree.children = rewriteTogglesInChildList(tree.children);
    }
  };
  return plugin as never;
});

/**
 * 折叠块节点 schema。
 */
export const toggleSchema = $nodeSchema(TOGGLE_NODE_NAME, () => {
  return {
    group: 'block',
    content: 'block+',
    defining: true,
    attrs: {
      summary: { default: '', validate: 'string' }
    },
    parseDOM: [
      {
        tag: `div[data-type="${TOGGLE_NODE_NAME}"]`,
        getAttrs: (dom) => {
          // 折叠块容器节点。
          const element = dom as HTMLElement;
          return { summary: element.dataset.summary ?? '' };
        }
      }
    ],
    toDOM: (node) => {
      // 序列化兜底(无 NodeView 场景,如剪贴板);summary 经 data 属性回读。
      return [
        'div',
        {
          'data-type': TOGGLE_NODE_NAME,
          'data-summary': String(node.attrs.summary ?? ''),
          class: 'zt-md-toggle'
        },
        0
      ];
    },
    parseMarkdown: {
      match: (node) => node.type === TOGGLE_NODE_NAME,
      runner: (state, node, type) => {
        // mdast data 携带 summary,块孩子照常解析。
        const data = (node.data ?? {}) as { summary?: string };
        state.openNode(type, {
          summary: typeof data.summary === 'string' ? data.summary : ''
        });
        state.next(node.children ?? []);
        state.closeNode();
      }
    },
    toMarkdown: {
      match: (node) => node.type.name === TOGGLE_NODE_NAME,
      runner: (state, node) => {
        // 还原为 html 块对;summary 行与 <details> 同叶,块间空行由 stringify 产出。
        const summary = String(node.attrs.summary ?? '');
        state.addNode('html', undefined, `<details>\n<summary>${summary}</summary>`);
        node.forEach((blockChild) => {
          state.next(blockChild);
        });
        state.addNode('html', undefined, '</details>');
      }
    }
  };
});

/**
 * 折叠块插件聚合(mdast 转换 + schema)。
 */
export const toggle: unknown[] = [remarkTogglePlugin, toggleSchema].flat();
