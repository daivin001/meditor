/**
 * plugins/custom/footnote/footnote-plugin.ts — 脚注(footnote)
 *
 * markdown 表示(GFM 风格脚注):
 *
 *   正文[^1]继续。
 *   [^1]: 这里是脚注内容。
 *
 * - 解析/序列化:remark-footnotes(官方 micromark/mdast 扩展,默认非行内注),
 *   产出 footnoteReference / footnoteDefinition 两类 mdast 节点;
 * - PM 表示:footnote_reference(行内原子,渲染为上标标记)与
 *   footnote_definition(文档末尾的定义块,内容可编辑);
 * - 点击引用标记滚动到对应定义(footnote 行为插件)。
 */
import { $nodeSchema, $prose, $remark } from '@milkdown/utils';
import { Plugin, PluginKey } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import remarkFootnotes from 'remark-footnotes';

/**
 * 脚注引用节点类型名(行内)。
 */
export const FOOTNOTE_REFERENCE_NODE_NAME = 'footnote_reference';

/**
 * 脚注定义节点类型名(块级)。
 */
export const FOOTNOTE_DEFINITION_NODE_NAME = 'footnote_definition';

/**
 * remark-footnotes 插件包装器(解析 + 序列化双向扩展)。
 */
export const remarkFootnotePlugin = $remark('remarkFootnote', () => remarkFootnotes as never);

/**
 * 从 mdast 节点读脚注标识(identifier 优先,label 兜底)。
 */
const resolveFootnoteLabel = (node: { label?: unknown; identifier?: unknown }): string => {
  if (typeof node.label === 'string' && node.label.length > 0) {
    return node.label;
  }
  return typeof node.identifier === 'string' ? node.identifier : '';
};

/**
 * 脚注引用 schema(行内原子,上标 [label])。
 */
export const footnoteReferenceSchema = $nodeSchema(FOOTNOTE_REFERENCE_NODE_NAME, () => ({
  group: 'inline',
  inline: true,
  atom: true,
  attrs: {
    label: { default: '', validate: 'string' }
  },
  parseDOM: [
    {
      tag: 'sup[data-footnote-ref]',
      getAttrs: (dom) => ({
        label: (dom as HTMLElement).getAttribute('data-footnote-ref') ?? ''
      })
    }
  ],
  toDOM: (node) => [
    'sup',
    { 'data-footnote-ref': String(node.attrs.label ?? ''), class: 'zt-md-footnote-ref' },
    String(node.attrs.label ?? '')
  ],
  parseMarkdown: {
    match: (node) => node.type === 'footnoteReference',
    runner: (state, node, type) => {
      state.addNode(type, { label: resolveFootnoteLabel(node as never) });
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === FOOTNOTE_REFERENCE_NODE_NAME,
    runner: (state, node) => {
      state.addNode('footnoteReference', undefined, undefined, {
        identifier: String(node.attrs.label ?? ''),
        label: String(node.attrs.label ?? '')
      });
    }
  }
}));

/**
 * 脚注定义 schema(块级容器,label + 可编辑内容)。
 */
export const footnoteDefinitionSchema = $nodeSchema(FOOTNOTE_DEFINITION_NODE_NAME, () => ({
  group: 'block',
  content: 'block+',
  defining: true,
  attrs: {
    label: { default: '', validate: 'string' }
  },
  parseDOM: [
    {
      tag: `div[data-type="${FOOTNOTE_DEFINITION_NODE_NAME}"]`,
      getAttrs: (dom) => ({
        label: (dom as HTMLElement).getAttribute('data-footnote-label') ?? ''
      })
    }
  ],
  toDOM: (node) => [
    'div',
    {
      'data-type': FOOTNOTE_DEFINITION_NODE_NAME,
      'data-footnote-label': String(node.attrs.label ?? ''),
      class: 'zt-md-footnote-definition'
    },
    0
  ],
  parseMarkdown: {
    match: (node) => node.type === 'footnoteDefinition',
    runner: (state, node, type) => {
      state.openNode(type, { label: resolveFootnoteLabel(node as never) });
      state.next(((node as { children?: unknown[] }).children ?? []) as never);
      state.closeNode();
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === FOOTNOTE_DEFINITION_NODE_NAME,
    runner: (state, node) => {
      state.openNode('footnoteDefinition', undefined, {
        identifier: String(node.attrs.label ?? ''),
        label: String(node.attrs.label ?? '')
      });
      node.forEach((child) => {
        state.next(child);
      });
      state.closeNode();
    }
  }
}));

/**
 * 脚注引用点击 → 滚动到对应定义(点击处理挂在编辑器 DOM 上,不改文档)。
 */
export const footnoteClickPlugin = $prose(
  () =>
    new Plugin({
      key: new PluginKey('zt-md-footnote-click'),
      props: {
        handleClick: (view: EditorView, _pos: number, event: MouseEvent): boolean => {
          const target = event.target;
          if (!(target instanceof Element)) {
            return false;
          }
          const marker = target.closest('sup[data-footnote-ref]');
          if (!marker) {
            return false;
          }
          const label = marker.getAttribute('data-footnote-ref') ?? '';
          let targetPos: number | null = null;
          view.state.doc.descendants((node, pos) => {
            if (targetPos !== null) {
              return false;
            }
            if (node.type.name === FOOTNOTE_DEFINITION_NODE_NAME && node.attrs.label === label) {
              targetPos = pos;
              return false;
            }
            return true;
          });
          if (targetPos === null) {
            return false;
          }
          event.preventDefault();
          const dom = view.nodeDOM(targetPos);
          const element = dom instanceof Element ? dom : null;
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return true;
        }
      }
    })
);

/**
 * 计算下一个可用的脚注编号(全文档引用/定义 label 的最大纯数字 + 1)。
 */
export const nextFootnoteLabel = (doc: import('@milkdown/prose/model').Node): string => {
  let max = 0;
  doc.descendants((node) => {
    if (node.type.name !== FOOTNOTE_REFERENCE_NODE_NAME && node.type.name !== FOOTNOTE_DEFINITION_NODE_NAME) {
      return true;
    }
    const numeric = Number.parseInt(String(node.attrs.label ?? ''), 10);
    if (Number.isFinite(numeric) && numeric > max) {
      max = numeric;
    }
    return true;
  });
  return String(max + 1);
};

/**
 * 在光标处插入脚注引用,并在文档末尾补定义块(内容预置空段落)。
 * 返回是否插入成功。
 */
export const insertFootnote = (view: EditorView): boolean => {
  // 节点类型(schema 未装配时静默失败)。
  const nodes = view.state.schema.nodes as Record<string, undefined | import('@milkdown/prose/model').NodeType>;
  const referenceType = nodes[FOOTNOTE_REFERENCE_NODE_NAME];
  const definitionType = nodes[FOOTNOTE_DEFINITION_NODE_NAME];
  if (!referenceType || !definitionType) {
    return false;
  }

  const label = nextFootnoteLabel(view.state.doc);
  const transaction = view.state.tr;
  transaction.replaceSelectionWith(referenceType.create({ label }));
  // 文档末尾追加定义块:脚注引用之后文档 size 前移 1(原子节点),重新取末尾。
  const endPos = transaction.doc.content.size;
  transaction.insert(
    endPos,
    definitionType.create({ label }, (view.state.schema.nodes as Record<string, undefined | import('@milkdown/prose/model').NodeType>).paragraph?.create())
  );
  view.dispatch(transaction);
  view.focus();
  return true;
};

/**
 * 脚注插件聚合(remark 转换 + 两个 schema + 点击行为)。
 */
export const footnote = [remarkFootnotePlugin, footnoteReferenceSchema, footnoteDefinitionSchema, footnoteClickPlugin].flat();
