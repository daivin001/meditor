/**
 * plugins/custom/layout-block/layout-block-plugin.ts — 显示控制布局块(meditor_layout)
 *
 * markdown 表示:```meditor-layout 围栏代码块(可选 :kind 后缀),围栏内容即纯
 * 展示控制信息(JSON/HTML/JS 等黑盒文本,不属于 Markdown 正文,仅供本编辑器的
 * 显示层消费)。
 * - 解析:remark transformer 在 mdast 层把 lang 为 meditor-layout(大小写/空白
 *   不敏感,兼容 meditor-layout:kind 可选后缀)的 code 节点就地改写为自定义类型
 *   meditor_layout(避免与 commonmark code_block 的 parser 争抢同一 mdast 类型;
 *   遍历覆盖 blockquote/列表等嵌套容器);原始 info string(lang + meta)逐字
 *   保存在 attrs,序列化时原样还原。
 * - 序列化:toMarkdown 还原为原始 info string 的 code mdast 节点,由
 *   remark-stringify 原生打印围栏——围栏内容字节级不变(仅围栏符号统一为
 *   反引号),其他渲染器优雅降级为普通代码块。
 * - 展示:正常编辑模式下该块完全隐藏(零占位,CSS 于 NodeView 层控制),仅在
 *   布局模式(wrapper data-layout-mode="on")下显示并可编辑,见 layout-block-*。
 */
import type { MilkdownPlugin } from '@milkdown/ctx';
import { $nodeSchema, $remark } from '@milkdown/utils';
import { isMeditorLayoutFenceLang } from '../../../utils/layout-block-export';

/**
 * 布局块节点类型名。
 */
export const MEDITOR_LAYOUT_NODE_NAME = 'meditor_layout';

/**
 * 布局块围栏 lang 序列化时使用的规范值(未携带原始 info string 的兜底)。
 */
export const MEDITOR_LAYOUT_DEFAULT_LANG = 'meditor-layout';

/** mdast 节点最小结构(transformer 只消费 type/children/lang/meta/value)。 */
interface MdastNodeLike {
  type: string;
  children?: MdastNodeLike[];
  lang?: string | null | undefined;
  meta?: string | null | undefined;
  value?: string | null | undefined;
  [key: string]: unknown;
}

/**
 * mdast 遍历:把 lang 为 meditor-layout(兼容 :kind 后缀)的 code 节点就地改写为
 * meditor_layout 节点(引用替换,不影响兄弟节点;原始 lang/meta/value 逐字保留,
 * 遍历覆盖 blockquote/列表等嵌套容器)。
 */
const transformLayoutFenceToLayoutBlock = (node: MdastNodeLike): void => {
  const children = node.children;
  if (!Array.isArray(children)) {
    return;
  }
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (!child) {
      continue;
    }
    if (child.type === 'code' && isMeditorLayoutFenceLang(child.lang)) {
      children[index] = {
        type: MEDITOR_LAYOUT_NODE_NAME,
        lang: child.lang,
        meta: typeof child.meta === 'string' ? child.meta : null,
        value: typeof child.value === 'string' ? child.value : ''
      };
      continue;
    }
    transformLayoutFenceToLayoutBlock(child);
  }
};

/**
 * remark 插件包装器(mdast 层 transformer 扩展,非 micromark 语法扩展)。
 */
export const remarkMeditorLayoutPlugin = $remark<'remarkMeditorLayout', undefined>(
  'remarkMeditorLayout',
  () => {
    // unified 插件:返回 mdast transformer。
    const plugin = () => (tree: MdastNodeLike) => {
      transformLayoutFenceToLayoutBlock(tree);
    };
    return plugin as never;
  },
);

/**
 * 布局块节点 schema。
 */
export const meditorLayoutSchema = $nodeSchema(MEDITOR_LAYOUT_NODE_NAME, () => {
  return {
    group: 'block',
    atom: true,
    isolating: true,
    // 不设 draggable:布局块在正常模式完全隐藏,拖拽无意义且会放大误操作面。
    attrs: {
      // 围栏内容原文(黑盒保存,字节级往返)。
      value: {
        default: ''
      },
      // 原始围栏 lang(保留大小写与 :kind 后缀)。
      lang: {
        default: MEDITOR_LAYOUT_DEFAULT_LANG
      },
      // 原始 info string 中 lang 之后的剩余部分(无则为 null)。
      meta: {
        default: null
      }
    },
    parseDOM: [
      {
        tag: `div[data-type="${MEDITOR_LAYOUT_NODE_NAME}"]`,
        getAttrs: (dom) => {
          // 布局块容器节点。
          const element = dom as HTMLElement;
          return {
            value: element.dataset.value ?? '',
            lang: element.dataset.lang || MEDITOR_LAYOUT_DEFAULT_LANG,
            meta: element.dataset.meta ?? null
          };
        }
      }
    ],
    toDOM: (node) => {
      // 围栏内容原文。
      const value = String(node.attrs.value ?? '');
      // 布局块容器(无 NodeView 场景的降级渲染,如剪贴板 HTML 序列化)。
      const dom = document.createElement('div');
      dom.dataset.type = MEDITOR_LAYOUT_NODE_NAME;
      dom.dataset.value = value;
      const lang = String(node.attrs.lang ?? MEDITOR_LAYOUT_DEFAULT_LANG);
      dom.dataset.lang = lang;
      const meta = node.attrs.meta;
      if (typeof meta === 'string' && meta.length > 0) {
        dom.dataset.meta = meta;
      }
      dom.className = 'zt-md-layout-block';
      const pre = document.createElement('pre');
      pre.textContent = value;
      dom.appendChild(pre);
      return dom;
    },
    parseMarkdown: {
      match: (node) => {
        return node.type === MEDITOR_LAYOUT_NODE_NAME;
      },
      runner: (state, node, type) => {
        // 围栏内容与原始 info string。
        const value = String(node.value ?? '');
        const lang = typeof node.lang === 'string' && node.lang.length > 0 ? node.lang : MEDITOR_LAYOUT_DEFAULT_LANG;
        const meta = typeof node.meta === 'string' && node.meta.length > 0 ? node.meta : null;
        state.addNode(type, { value, lang, meta });
      }
    },
    toMarkdown: {
      match: (node) => {
        return node.type.name === MEDITOR_LAYOUT_NODE_NAME;
      },
      runner: (state, node) => {
        // 还原为原始 info string 的围栏代码块(mdast code 节点,remark-stringify
        // 原生打印;内容原文逐字回写,其他渲染器降级为普通代码块)。
        const value = String(node.attrs.value ?? '');
        const lang = String(node.attrs.lang ?? MEDITOR_LAYOUT_DEFAULT_LANG);
        const meta = node.attrs.meta;
        state.addNode('code', undefined, value, {
          lang,
          meta: typeof meta === 'string' && meta.length > 0 ? meta : null
        });
      }
    }
  };
});

/**
 * 布局块插件聚合(mdast 转换 + schema)。
 */
export const layoutBlock: MilkdownPlugin[] = [remarkMeditorLayoutPlugin, meditorLayoutSchema].flat();
