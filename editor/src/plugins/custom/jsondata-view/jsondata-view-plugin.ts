/**
 * plugins/custom/jsondata-view/jsondata-view-plugin.ts — JSON 数据视图块节点 schema 与 mdast 转换
 *
 * markdown 表示:```jsondata-view:<kind> 围栏代码块,围栏内容为 JSON(仅业务数据:
 * fields + records;视图种类持久化在围栏 lang 上,筛选/排序会话状态一律不落盘,
 * 见 notion-parity-plan §4.2)。kind 共 7 种:table/kanban/gantt/calendar/list/gallery/text。
 * - 解析:remark transformer 在 mdast 层把 lang=jsondata-view:<kind> 的 code 节点就地改写为
 *   同名自定义类型(jsondata-view:table 等,不与 code_block 争抢 mdast 类型),
 *   $nodeSchema 按同名类型匹配建节点;旧 meditor-db 围栏兼容解析为
 *   jsondata-view:table(序列化统一还原新标签,文档编辑保存后自动迁移);
 * - 序列化:toMarkdown 还原为 lang=jsondata-view:<kind> 的 code mdast 节点,由
 *   remark-stringify 原生打印围栏(其他渲染器优雅降级为普通代码块,JSON 可读);
 *   meditor 内切换视图 → setNodeMarkup 换节点类型 → lang 自动跟随。
 */
import type { MilkdownPlugin } from '@milkdown/ctx';
import type { NodeSchema } from '@milkdown/transformer';
import { $nodeSchema, $remark } from '@milkdown/utils';

/**
 * JSON 数据视图块节点类型前缀(节点名 = 前缀 + 视图种类)。
 */
export const JSONDATA_VIEW_NODE_PREFIX = 'jsondata-view:';

/**
 * 视图种类全集(与 @meditor/jsonview 的 JsonviewViewKind 一致)。
 */
export const JSONDATA_VIEW_KINDS = ['table', 'kanban', 'gantt', 'calendar', 'list', 'gallery', 'text'] as const;

/**
 * 视图种类类型。
 */
export type JsondataViewKind = (typeof JSONDATA_VIEW_KINDS)[number];

/**
 * 由视图种类得到节点名(jsondata-view:<kind>,字面量模板联合类型)。
 */
export const jsondataViewNodeName = (kind: JsondataViewKind): JsondataViewNodeName =>
  `${JSONDATA_VIEW_NODE_PREFIX}${kind}`;

/**
 * 全部节点类型名的字面量联合('jsondata-view:table' | ... 7 个)。
 */
export type JsondataViewNodeName = `${typeof JSONDATA_VIEW_NODE_PREFIX}${JsondataViewKind}`;

/**
 * 全部节点类型名列表(jsondata-view:table 等 7 个)。
 */
export const JSONDATA_VIEW_NODE_NAMES: readonly JsondataViewNodeName[] = JSONDATA_VIEW_KINDS.map(jsondataViewNodeName);

/**
 * 由节点名解析视图种类(非 jsondata-view 前缀返回 null)。
 */
export const parseJsondataViewNodeName = (nodeName: string): JsondataViewKind | null => {
  if (!nodeName.startsWith(JSONDATA_VIEW_NODE_PREFIX)) {
    return null;
  }
  return parseJsondataViewFenceLang(nodeName.slice(JSONDATA_VIEW_NODE_PREFIX.length));
};

/**
 * 由围栏 lang 解析视图种类(小写化比对;旧 meditor-db 兼容为 table;
 * 未知 jsondata-view:* 尾缀返回 null,按普通代码块降级)。
 */
export const parseJsondataViewFenceLang = (lang: string): JsondataViewKind | null => {
  const normalized = lang.trim().toLowerCase();
  if (normalized === 'meditor-db') {
    return 'table';
  }
  const candidate = normalized.startsWith(JSONDATA_VIEW_NODE_PREFIX)
    ? normalized.slice(JSONDATA_VIEW_NODE_PREFIX.length)
    : normalized;
  return (JSONDATA_VIEW_KINDS as readonly string[]).includes(candidate) ? (candidate as JsondataViewKind) : null;
};

/** mdast 节点最小结构(transformer 只消费 type/children/lang/value)。 */
interface MdastNodeLike {
  type: string;
  children?: MdastNodeLike[];
  lang?: string | null | undefined;
  value?: string | null | undefined;
  [key: string]: unknown;
}

/**
 * mdast 遍历:把 lang=jsondata-view:<kind>(兼容旧 meditor-db)的 code 节点就地改写为
 * 同名节点(引用替换,不影响兄弟节点;遍历覆盖 blockquote/列表等嵌套容器)。
 */
const transformJsondataViewCode = (node: MdastNodeLike): void => {
  const children = node.children;
  if (!Array.isArray(children)) {
    return;
  }
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (!child) {
      continue;
    }
    if (child.type === 'code' && typeof child.lang === 'string') {
      const kind = parseJsondataViewFenceLang(child.lang);
      if (kind) {
        children[index] = {
          type: `${JSONDATA_VIEW_NODE_PREFIX}${kind}`,
          value: typeof child.value === 'string' ? child.value : ''
        };
        continue;
      }
    }
    transformJsondataViewCode(child);
  }
};

/**
 * remark 插件包装器(mdast 层 transformer 扩展,非 micromark 语法扩展)。
 */
export const remarkJsondataViewPlugin = $remark<'remarkJsondataView', undefined>('remarkJsondataView', () => {
  // unified 插件:返回 mdast transformer。
  const plugin = () => (tree: MdastNodeLike) => {
    transformJsondataViewCode(tree);
  };
  return plugin as never;
});

/**
 * JSON 数据视图块 schema spec(7 种共用同一结构,仅节点名/围栏 lang 随种类变化;
 * 参数类型由 NodeSchema 上下文推导)。
 */
const buildJsondataViewSpec = (nodeName: JsondataViewNodeName): NodeSchema => {
  return {
    group: 'block',
    atom: true,
    isolating: true,
    // 注意:不设 draggable——同 mtable,避免块内交互误触发浏览器拖拽。
    attrs: {
      value: {
        default: ''
      }
    },
    parseDOM: [
      {
        tag: `div[data-type="${nodeName}"]`,
        getAttrs: (dom) => {
          // JSON 数据视图块容器节点。
          const element = dom as HTMLElement;
          return {
            value: element.dataset?.value ?? ''
          };
        }
      }
    ],
    toDOM: (node) => {
      // 当前围栏 JSON 文本。
      const json = String(node.attrs.value ?? '');
      // 容器(无 NodeView 场景的降级渲染,如剪贴板 HTML 序列化)。
      const dom = document.createElement('div');
      dom.dataset.type = nodeName;
      dom.dataset.value = json;
      dom.className = 'zt-md-jsondata-view-block';
      const pre = document.createElement('pre');
      pre.textContent = json;
      dom.appendChild(pre);
      return dom;
    },
    parseMarkdown: {
      match: ({ type }) => {
        return type === nodeName;
      },
      runner: (state, node, type) => {
        // 围栏内的 JSON 文本。
        const json = String(node.value ?? '');
        state.addNode(type, { value: json });
      }
    },
    toMarkdown: {
      match: (node) => {
        return node.type.name === nodeName;
      },
      runner: (state, node) => {
        // 还原为 lang=jsondata-view:<kind> 的围栏代码块(mdast code 节点,
        // remark-stringify 原生打印;旧 meditor-db 围栏经解析-序列化自动迁移)。
        const json = String(node.attrs.value ?? '');
        state.addNode('code', undefined, json, { lang: nodeName });
      }
    }
  };
};

/**
 * 单个视图种类的 schema($nodeSchema 要求具体字面量节点名,泛型逐个实例化)。
 */
const createJsondataViewSchema = <K extends JsondataViewKind>(kind: K) => {
  return $nodeSchema(jsondataViewNodeName(kind), () => buildJsondataViewSpec(jsondataViewNodeName(kind)));
};

/**
 * JSON 数据视图块 schema 组(7 种视图各注册一个同名节点类型)。
 */
export const jsondataViewSchemas = JSONDATA_VIEW_KINDS.map((kind) => createJsondataViewSchema(kind));

/**
 * JSON 数据视图块插件聚合(mdast 转换 + 7 个 schema;
 * $Remark/$NodeSchema 都是 [ctx, plugin] 元组,逐元素展开成 MilkdownPlugin)。
 */
export const jsondataView: MilkdownPlugin[] = [
  ...remarkJsondataViewPlugin,
  ...jsondataViewSchemas.flatMap((schema) => [schema[0], schema[1]])
];
