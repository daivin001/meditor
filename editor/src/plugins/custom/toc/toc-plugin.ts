/**
 * plugins/custom/toc/toc-plugin.ts — 目录块([toc])
 *
 * markdown 表示(文档任意位置的独立段落):
 *
 *   [toc]
 *
 * - 解析:remark transformer 把内容恰为 `[toc]` 的段落就地改写为 meditorToc;
 * - 序列化:还原为 `[toc]` 段落,round-trip 幂等;
 * - 渲染:NodeView 依据当前文档标题清单渲染目录(标题变更时经注册表刷新),
 *   点击条目跳转到对应标题。
 */
import { $nodeSchema, $prose, $remark } from '@milkdown/utils';
import { Plugin, PluginKey } from '@milkdown/prose/state';
import { TextSelection } from '@milkdown/prose/state';
import type { Node as ProseNode } from '@milkdown/prose/model';
import type { EditorView, NodeView, NodeViewConstructor } from '@milkdown/prose/view';
import type { EditorI18nMessages } from '../../../types/editor';
import { computeHeadingAnchors } from '../heading/heading-anchor';

/**
 * 目录块 mdast 节点类型名。
 */
export const MEDITOR_TOC_MDAST_TYPE = 'meditorToc';

/**
 * 目录块 PM 节点类型名。
 */
export const MEDITOR_TOC_NODE_NAME = 'meditor_toc';

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
 * 把内容恰为 `[toc]` 的段落改写为目录块(允许首尾空白)。
 */
const tryRewriteParagraphToToc = (node: MdastNodeLike): MdastNodeLike | null => {
  if (node.type !== 'paragraph' || !Array.isArray(node.children)) {
    return null;
  }
  if (node.children.length !== 1 || node.children[0]?.type !== 'text') {
    return null;
  }
  const value = node.children[0]?.value;
  if (typeof value !== 'string' || value.trim() !== '[toc]') {
    return null;
  }
  return { type: MEDITOR_TOC_MDAST_TYPE };
};

/**
 * mdast 遍历:把 `[toc]` 段落就地替换为目录块(覆盖嵌套容器)。
 * 导出以便脱离 milkdown 运行时做纯 mdast 契约自测。
 */
export const transformTocs = (node: MdastNodeLike): void => {
  const children = node.children;
  if (!Array.isArray(children)) {
    return;
  }
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (!child) {
      continue;
    }
    const toc = tryRewriteParagraphToToc(child);
    if (toc) {
      children[index] = toc;
      continue;
    }
    transformTocs(child);
  }
};

/**
 * remark 插件包装器(mdast transformer)。
 */
export const remarkTocPlugin = $remark('remarkToc', () => {
  const plugin = () => (tree: MdastNodeLike) => {
    transformTocs(tree);
  };
  return plugin as never;
});

/**
 * 目录 NodeView 刷新注册表(doc 变更时统一重渲染)。
 */
const tocViewRefreshers = new Set<() => void>();

/**
 * 注册目录 NodeView 刷新回调,返回注销函数。
 */
export const registerTocView = (refresh: () => void): (() => void) => {
  tocViewRefreshers.add(refresh);
  return () => {
    tocViewRefreshers.delete(refresh);
  };
};

/**
 * 目录块 schema。
 */
export const tocSchema = $nodeSchema(MEDITOR_TOC_NODE_NAME, () => ({
  group: 'block',
  atom: true,
  defining: true,
  attrs: {},
  parseDOM: [
    {
      tag: `div[data-type="${MEDITOR_TOC_NODE_NAME}"]`
    }
  ],
  toDOM: () => ['div', { 'data-type': MEDITOR_TOC_NODE_NAME, class: 'zt-md-toc' }],
  parseMarkdown: {
    match: (node) => node.type === MEDITOR_TOC_MDAST_TYPE,
    runner: (state, _node, type) => {
      state.addNode(type);
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === MEDITOR_TOC_NODE_NAME,
    runner: (state) => {
      // 经行内 html 节点输出:remark-stringify 会把行首 `[` 文本转义为
      // \[toc],html 节点原样打印,保证 round-trip 幂等。
      state.openNode('paragraph');
      state.addNode('html', undefined, '[toc]');
      state.closeNode();
    }
  }
}));

/**
 * 目录块 NodeView:按当前文档标题清单渲染目录,点击条目跳转。
 */
class TocNodeView implements NodeView {
  // 节点根容器。
  dom: HTMLDivElement;
  // 编辑器视图。
  private readonly view: EditorView;
  // 文案。
  private readonly messages: EditorI18nMessages;
  // 注销刷新注册。
  private readonly unregister: () => void;

  constructor(view: EditorView, messages: EditorI18nMessages) {
    this.view = view;
    this.messages = messages;
    this.dom = document.createElement('div');
    this.dom.className = 'zt-md-toc';
    this.dom.dataset.type = MEDITOR_TOC_NODE_NAME;
    this.dom.contentEditable = 'false';
    const refresh = (): void => {
      this.render();
    };
    this.unregister = registerTocView(refresh);
    this.render();
  }

  /**
   * 依据当前文档标题清单渲染目录。
   */
  private render(): void {
    this.dom.replaceChildren();
    const title = document.createElement('div');
    title.className = 'zt-md-toc-title';
    title.textContent = this.messages.tocTitle;
    this.dom.appendChild(title);

    const anchors = computeHeadingAnchors(this.view.state.doc);
    if (anchors.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'zt-md-toc-empty';
      empty.textContent = this.messages.tocEmpty;
      this.dom.appendChild(empty);
      return;
    }

    const list = document.createElement('ul');
    list.className = 'zt-md-toc-list';
    for (const anchor of anchors) {
      const item = document.createElement('li');
      item.className = 'zt-md-toc-item';
      item.style.paddingLeft = `${Math.max(0, anchor.level - 1) * 16}px`;
      const link = document.createElement('a');
      link.className = 'zt-md-toc-link';
      link.textContent = anchor.text.length > 0 ? anchor.text : this.messages.tocEmpty;
      link.href = `#${anchor.id}`;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        this.jumpTo(anchor.pos);
      });
      item.appendChild(link);
      list.appendChild(item);
    }
    this.dom.appendChild(list);
  }

  /**
   * 跳转到标题:光标移至标题处并滚动定位(标题滚入视口顶部)。
   */
  private jumpTo(pos: number): void {
    const view = this.view;
    const $pos = view.state.doc.resolve(pos);
    const selection = TextSelection.near($pos, 1);
    view.dispatch(view.state.tr.setSelection(selection));
    const dom = view.nodeDOM(pos);
    const element = dom instanceof Element ? dom : (dom?.parentElement ?? null);
    element?.scrollIntoView({ block: 'start', behavior: 'auto' });
    view.focus();
  }

  update(_node: ProseNode): boolean {
    // 目录内容完全由视图自渲染,仅保住 NodeView 复用。
    return true;
  }

  stopEvent(): boolean {
    // 目录整体只读(条目点击跳转,不参与文本编辑)。
    return true;
  }

  ignoreMutation(): boolean {
    return true;
  }

  destroy(): void {
    this.unregister();
  }
}

/**
 * 创建目录块 NodeView 构造器。
 */
export const createTocNodeView =
  (messages: EditorI18nMessages): NodeViewConstructor =>
  (_node, view) =>
    new TocNodeView(view, messages);

/**
 * 目录刷新分发插件(doc 变更时通知全部目录 NodeView 重渲染)。
 */
export const tocRefreshPlugin = $prose(
  () =>
    new Plugin({
      key: new PluginKey('zt-md-toc-refresh'),
      view: () => ({
        update: (view, prevState) => {
          if (view.state.doc === prevState.doc) {
            return;
          }
          tocViewRefreshers.forEach((refresh) => {
            try {
              refresh();
            } catch {
              // 单个目录视图渲染失败不拖垮其余视图。
            }
          });
        }
      })
    })
);

/**
 * 目录插件聚合(remark 转换 + schema + 刷新分发)。
 */
export const toc = [remarkTocPlugin, tocSchema, tocRefreshPlugin].flat();
