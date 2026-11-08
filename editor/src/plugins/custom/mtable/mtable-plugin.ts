/**
 * plugins/custom/mtable/mtable-plugin.ts — CSV 数据块(csvdata)节点 schema 与 mdast 转换
 *
 * markdown 表示:```csvdata 围栏代码块,围栏内容即 CSV 文本(RFC 4180)。
 * - 解析:remark transformer 在 mdast 层把 lang=csvdata 的 code 节点就地改写为
 *   自定义类型 csvdata(避免与 commonmark code_block 的 parser 争抢同一
 *   mdast 类型),$nodeSchema 按 csvdata 类型匹配建节点;
 *   改名前存量文档的 lang=csv 围栏同样识别为 csvdata 块(兼容消化,
 *   序列化统一还原为 csvdata,文档编辑保存后自动迁移)。
 * - 序列化:toMarkdown 还原为 lang=csvdata 的 code mdast 节点,由
 *   remark-stringify 原生打印围栏(其他渲染器优雅降级为普通代码块)。
 */
import type { MilkdownPlugin } from '@milkdown/ctx';
import { $nodeSchema, $remark } from '@milkdown/utils';

/**
 * CSV 数据块节点类型名。
 */
export const MTABLE_NODE_NAME = 'csvdata';

/**
 * 识别为 CSV 数据块的语言标记(小写化后比对)。
 * 改名后新围栏一律 csvdata;旧 csv 围栏保留在解析集合中以消化存量文档。
 */
const CSV_FENCE_LANGUAGES = new Set(['csvdata', 'csv']);

/** mdast 节点最小结构(transformer 只消费 type/children/lang/value)。 */
interface MdastNodeLike {
  type: string;
  children?: MdastNodeLike[];
  lang?: string | null | undefined;
  value?: string | null | undefined;
  [key: string]: unknown;
}

/**
 * mdast 遍历:把 lang=csvdata(兼容旧 lang=csv)的 code 节点就地改写为 csvdata 节点
 * (引用替换,不影响兄弟节点;遍历覆盖 blockquote/列表等嵌套容器)。
 */
const transformCsvCodeToMtable = (node: MdastNodeLike): void => {
  const children = node.children;
  if (!Array.isArray(children)) {
    return;
  }
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (!child) {
      continue;
    }
    if (
      child.type === 'code' &&
      typeof child.lang === 'string' &&
      CSV_FENCE_LANGUAGES.has(child.lang.trim().toLowerCase())
    ) {
      children[index] = {
        type: MTABLE_NODE_NAME,
        value: typeof child.value === 'string' ? child.value : ''
      };
      continue;
    }
    transformCsvCodeToMtable(child);
  }
};

/**
 * remark 插件包装器(mdast 层 transformer 扩展,非 micromark 语法扩展)。
 */
export const remarkMtablePlugin = $remark<'remarkMtable', undefined>('remarkMtable', () => {
  // unified 插件:返回 mdast transformer。
  const plugin = () => (tree: MdastNodeLike) => {
    transformCsvCodeToMtable(tree);
  };
  return plugin as never;
});

/**
 * CSV 数据块节点 schema。
 */
export const mtableSchema = $nodeSchema(MTABLE_NODE_NAME, () => {
  return {
    group: 'block',
    atom: true,
    isolating: true,
    // 注意:不设 draggable——PM 会给节点 DOM 写原生 draggable 属性,
    // canvas 内框选单元格的按下拖动会误触发整块表格的浏览器拖拽。
    attrs: {
      value: {
        default: ''
      }
    },
    parseDOM: [
      {
        tag: `div[data-type="${MTABLE_NODE_NAME}"]`,
        getAttrs: (dom) => {
          // CSV 数据块容器节点。
          const element = dom as HTMLElement;
          return {
            value: element.dataset.value ?? ''
          };
        }
      }
    ],
    toDOM: (node) => {
      // 当前 CSV 文本。
      const csv = String(node.attrs.value ?? '');
      // CSV 数据块容器(无 NodeView 场景的降级渲染,如剪贴板 HTML 序列化)。
      const dom = document.createElement('div');
      dom.dataset.type = MTABLE_NODE_NAME;
      dom.dataset.value = csv;
      dom.className = 'zt-md-mtable-block';
      const pre = document.createElement('pre');
      pre.textContent = csv;
      dom.appendChild(pre);
      return dom;
    },
    parseMarkdown: {
      match: (node) => {
        return node.type === MTABLE_NODE_NAME;
      },
      runner: (state, node, type) => {
        // 围栏内的 CSV 文本。
        const csv = String(node.value ?? '');
        state.addNode(type, { value: csv });
      }
    },
    toMarkdown: {
      match: (node) => {
        return node.type.name === MTABLE_NODE_NAME;
      },
      runner: (state, node) => {
        // 还原为 lang=csvdata 的围栏代码块(mdast code 节点,remark-stringify 原生打印;
        // 旧 csv 围栏经解析-序列化后自动迁移为 csvdata)。
        const csv = String(node.attrs.value ?? '');
        state.addNode('code', undefined, csv, { lang: 'csvdata' });
      }
    }
  };
});

/**
 * CSV 数据块插件聚合(mdast 转换 + schema)。
 */
export const mtable: MilkdownPlugin[] = [remarkMtablePlugin, mtableSchema].flat();
