/**
 * plugins/custom/heading/heading-anchor.ts — 标题锚点(大纲 / [toc] / 文内跳转共用)
 *
 * - 锚点 id 由标题文本 slug 化(保留 CJK/字母数字,空白转 '-',同名按出现顺序加 -1 后缀),
 *   与 Typora/GitHub 习惯一致,文本不变则 id 稳定;
 * - 锚点插件以 node Decoration 把 data-anchor-id 挂到标题 DOM(导出 HTML 亦可带锚);
 * - 锚点清单(heading 列表)供大纲面板、[toc] 渲染与 #锚点 链接跳转共用。
 */
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import { Plugin, PluginKey } from '@milkdown/prose/state';
import type { EditorState } from '@milkdown/prose/state';
import type { Node as ProseNode } from '@milkdown/prose/model';
import type { EditorView } from '@milkdown/prose/view';
import { $prose } from '@milkdown/utils';

/**
 * 标题锚点清单项(大纲/[toc] 数据结构)。
 */
export interface MeditorHeadingAnchor {
  /** 锚点 id(文本 slug 化 + 同名去重后缀)。 */
  id: string;
  /** 标题级别 1~6。 */
  level: number;
  /** 标题纯文本。 */
  text: string;
  /** 节点在文档中的位置(滚动定位用)。 */
  pos: number;
}

/**
 * 标题节点名(commonmark preset)。
 */
const HEADING_NODE_NAME = 'heading';

/**
 * 标题文本 slug 化:小写、去标点(保留字母/数字/CJK/空格/[-_]),空白转 '-'。
 */
export const slugifyHeadingText = (text: string): string => {
  const cleaned = text.trim().toLowerCase();
  const slug = cleaned
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, '-');
  return slug.length > 0 ? slug : 'heading';
};

/**
 * 计算整篇文档的标题锚点清单(按文档顺序;同名标题依出现顺序追加 -N 后缀)。
 */
export const computeHeadingAnchors = (doc: ProseNode): MeditorHeadingAnchor[] => {
  /** slug → 已出现次数(同名去重)。 */
  const usedCounts = new Map<string, number>();
  /** 结果清单。 */
  const anchors: MeditorHeadingAnchor[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== HEADING_NODE_NAME) {
      return true;
    }
    const text = node.textContent.trim();
    const base = slugifyHeadingText(text);
    const count = usedCounts.get(base) ?? 0;
    usedCounts.set(base, count + 1);
    anchors.push({
      id: count === 0 ? base : `${base}-${count}`,
      level: Math.min(6, Math.max(1, Number(node.attrs.level) || 1)),
      text,
      pos
    });
    return true;
  });

  return anchors;
};

/**
 * 构建标题锚点装饰集(node decoration → data-anchor-id)。
 */
const buildHeadingAnchorDecorations = (doc: ProseNode): DecorationSet => {
  const anchors = computeHeadingAnchors(doc);
  if (anchors.length === 0) {
    return DecorationSet.empty;
  }
  const decorations: Decoration[] = [];
  for (const anchor of anchors) {
    const node = doc.nodeAt(anchor.pos);
    if (!node) {
      continue;
    }
    decorations.push(
      Decoration.node(anchor.pos, anchor.pos + node.nodeSize, {
        'data-anchor-id': anchor.id
      })
    );
  }
  return DecorationSet.create(doc, decorations);
};

// 插件键(装饰读取与插件实例同键:同名不同实例的 PluginKey 是不同的键)。
const headingAnchorPluginKey = new PluginKey<DecorationSet>('zt-md-heading-anchor');

/**
 * 标题锚点插件(doc 变更时重算锚点装饰)。
 */
export const headingAnchorPlugin = $prose(
  () =>
    new Plugin({
      key: headingAnchorPluginKey,
      state: {
        init: (_config, state) => buildHeadingAnchorDecorations(state.doc),
        apply: (tr, previous) => (tr.docChanged ? buildHeadingAnchorDecorations(tr.doc) : previous)
      },
      props: {
        decorations: (state: EditorState) => headingAnchorPluginKey.getState(state) as DecorationSet | undefined
      }
    })
);

/**
 * 按锚点 id 定位标题并滚动(编辑器视图内;找不到返回 false)。
 * 滚动容器 = 视图 DOM 的最近可滚动父级(对齐编辑区滚动容器)。
 */
export const scrollToHeadingAnchor = (view: EditorView, id: string): boolean => {
  const anchors = computeHeadingAnchors(view.state.doc);
  const anchor = anchors.find((item) => item.id === id);
  if (!anchor) {
    return false;
  }
  const dom = view.nodeDOM(anchor.pos);
  const element = dom instanceof Element ? dom : (dom?.parentElement ?? null);
  if (!element) {
    return false;
  }
  element.scrollIntoView({ block: 'start', behavior: 'auto' });
  return true;
};
