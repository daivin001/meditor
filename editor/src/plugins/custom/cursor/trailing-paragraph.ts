/**
 * plugins/custom/cursor/trailing-paragraph.ts — 文档尾随段落保证
 *
 * 参照 @milkdown/plugin-trailing / TipTap TrailingNode 的业界通用做法自写:
 * 每次事务后检查文档最后一个块,不是 paragraph/heading 时自动在末尾补一个空段落,
 * 保证任何非文字块(代码块/公式块/表格/jsondata/csvdata/媒体等)之后
 * 永远存在可落光标的下一行(点击下方空白/方向键向下/回车均有落点)。
 */
import type { Node as ProseNode } from '@milkdown/prose/model';
import { Plugin, PluginKey } from '@milkdown/prose/state';
import { $prose } from '@milkdown/utils';

/**
 * 判断文档最后一个块是否已可承接光标(无需补尾随段落)。
 * 无子节点(空文档)或末块为 paragraph/heading 时不补。
 */
const shouldAppend = (lastNode: ProseNode | null): boolean => {
  if (!lastNode) {
    return false;
  }
  return lastNode.type.name !== 'paragraph' && lastNode.type.name !== 'heading';
};

/**
 * 尾随段落保证插件。
 */
export const trailingParagraphPlugin = $prose(() => {
  /** 插件状态:当前文档是否需要补尾随段落。 */
  const key = new PluginKey<boolean>('zt-md-trailing-paragraph');

  const plugin = new Plugin<boolean>({
    key,
    state: {
      init: (_unused, state) => shouldAppend(state.doc.lastChild),
      apply: (tr, value) => (tr.docChanged ? shouldAppend(tr.doc.lastChild) : value)
    },
    appendTransaction: (_transactions, _oldState, newState) => {
      if (!key.getState(newState)) {
        return null;
      }

      // 段落节点类型(未注册时安全跳过)。
      const paragraphType = newState.schema.nodes.paragraph;
      if (!paragraphType) {
        return null;
      }
      const paragraph = paragraphType.createAndFill();
      if (!paragraph) {
        return null;
      }

      // 在文档末尾补空段落;不改动选区(插入点之后无既有内容,光标映射安全)。
      return newState.tr.insert(newState.doc.content.size, paragraph);
    }
  });
  return plugin;
});
