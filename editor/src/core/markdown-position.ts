/**
 * core/markdown-position.ts — markdown 偏移与文档位置的双向换算
 *
 * 源码模式 ↔ 所见即所得模式同步光标/选区时,需要把 markdown 字符串偏移映射
 * 为 ProseMirror 文档位置(及逆映射)。换算按顶层块定位后,以"序列化前缀
 * 长度"二分逼近块内位置(序列化长度随 cut 终点单调不减)。
 */

import type { Node as ProseNode } from '@milkdown/prose/model';
import type { MeditorMarkdownBlock } from '../types/editor';

/**
 * 序列化单个顶层块(独立 cut 出子树再走 serializer;个别块失败不应拖垮整体)。
 */
export const serializeBlock = (
  doc: ProseNode,
  serializer: (content: ProseNode) => string,
  from: number,
  to: number,
): string => {
  try {
    return serializer(doc.cut(from, to));
  } catch {
    return '';
  }
};

/**
 * markdown 偏移 → 文档位置:定位偏移所在顶层块,块内以"序列化前缀长度 ≤ 剩余
 * 偏移"二分逼近(序列化长度随 cut 终点单调不减)。找不到所属块返回 null。
 */
export const docPosFromMarkdownOffset = (
  doc: ProseNode,
  serializer: (content: ProseNode) => string,
  blocks: MeditorMarkdownBlock[],
  offset: number,
): number | null => {
  let block: MeditorMarkdownBlock | null = null;
  for (const candidate of blocks) {
    if (candidate.start <= offset) block = candidate;
    else break;
  }
  if (!block) return null;
  const blockIdx = blocks.indexOf(block);
  // 顶层块位置连续:下一块 pos 即本块 nodeSize 终点;块内文本终点为其前 1。
  const next = blockIdx + 1 < blocks.length ? blocks[blockIdx + 1] : undefined;
  const nextPos = next ? next.pos : doc.content.size;
  if (offset <= block.start) return block.pos;
  if (offset >= block.end) return Math.max(block.pos, nextPos - 1);
  const local = offset - block.start;
  let lo = block.pos;
  let hi = Math.max(block.pos, nextPos - 1);
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (serializeBlock(doc, serializer, block.pos, mid).length <= local) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return lo;
};

/**
 * 文档位置 → markdown 偏移:docPosFromMarkdownOffset 的逆。定位位置所在顶层
 * 块后,以序列化前缀长度逼近块内偏移;位置落在块边界之外时取块端点。
 */
export const markdownOffsetFromDocPos = (
  doc: ProseNode,
  serializer: (content: ProseNode) => string,
  blocks: MeditorMarkdownBlock[],
  pos: number,
): number | null => {
  let block: MeditorMarkdownBlock | null = null;
  for (const candidate of blocks) {
    if (candidate.pos <= pos) block = candidate;
    else break;
  }
  if (!block) return null;
  const blockIdx = blocks.indexOf(block);
  const next = blockIdx + 1 < blocks.length ? blocks[blockIdx + 1] : undefined;
  const nextPos = next ? next.pos : doc.content.size;
  if (pos <= block.pos) return block.start;
  if (pos >= nextPos) return block.end;
  let prefixLen = 0;
  try {
    prefixLen = serializer(doc.cut(block.pos, pos)).length;
  } catch {
    prefixLen = 0;
  }
  return Math.min(block.end, block.start + prefixLen);
};

/**
 * remark/mdast 节点的最小结构(仅按 type 判断,不引入 mdast 类型依赖)。
 */
interface RemarkNodeLike {
  type?: string;
}

/**
 * 标题相邻块的紧凑拼接(注入 remarkStringifyOptionsCtx.join):
 * 序列化默认在一切顶层块之间写空行,导致 WYSIWYG 输出的 markdown 膨胀
 * (记事本/源码模式下每个块后都多一个空行)。ATX 标题独占一行,标题参与的
 * 相邻块以单换行拼接后,往返解析与空行版本逐块等价,可安全收紧;
 * html 块(type 6/7)以空行结束,其后紧跟的标题会被吞进 html 块,须排除;
 * 返回 undefined 交回 remark 默认规则 —— 段与段之间必须保留空行,
 * 否则再解析时两个段落会合并成一个(软换行),文档结构改变。
 * 注意 join 返回值语义:数字 = 在必分隔符之外额外增加的换行数,
 * 0 才是"仅单换行紧排",1 反而是多一个空行(mdast-util-to-markdown
 * container-flow:'\n'.repeat(1 + result))。
 */
export const joinCompactHeading = (left: RemarkNodeLike, right: RemarkNodeLike): 0 | undefined => {
  const headingInvolved = left.type === 'heading' || right.type === 'heading';
  if (!headingInvolved) {
    return undefined;
  }
  if (left.type === 'html' || right.type === 'html') {
    return undefined;
  }
  return 0;
};
