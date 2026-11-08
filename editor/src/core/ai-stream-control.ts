/**
 * core/ai-stream-control.ts — AI 流式插入控制(占位块 + 编辑锁定)
 *
 * AI 生成内容以流式占位块(meditor_ai_stream 节点)插入文档顶层,流式期间
 * 锁定用户输入;结束时把完整 markdown 经 milkdown 解析器转为正式节点替换
 * 占位块。请求生命周期(发起/中断/失败)由 meditor 层的 AI 面板驱动,本模块
 * 只负责文档侧的占位与替换。
 */

import type { Node as ProseNode } from '@milkdown/prose/model';
import { TextSelection } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import { MEDITOR_AI_STREAM_NODE_NAME } from '../plugins/custom/ai';
import type { AiStreamController } from './createEditor';

/** AI 流控制依赖(由 createEditor 注入的闭包能力)。 */
export interface AiStreamControlDeps {
  /** 解析 markdown 为文档节点(milkdown 解析器;未就绪/失败返回 null)。 */
  parseMarkdown: (markdown: string) => ProseNode | null;
  /** 取编辑器视图;editor.create() 未完成时为 null。 */
  getViewCtx: () => { view: EditorView } | null;
  /** 实例只读态(解锁时按此恢复 editable)。 */
  readOnly: boolean;
}

/**
 * 创建 AI 流控制器:占位块插入/流式追加/结束替换(空内容移除占位)。
 */
export const createAiStreamControl = (deps: AiStreamControlDeps): AiStreamController => {
  /** 流式占位块当前文档位置(null = 无流进行中)。 */
  let aiStreamPos: number | null = null;

  /** 恢复编辑态(按实例初始 readOnly)并把光标还给编辑区。 */
  const unlockEditorAfterAi = (view: EditorView): void => {
    view.setProps({ editable: () => !deps.readOnly });
    view.focus();
  };

  /** 结束流式占位:以 markdown 替换占位块(空内容移除占位)并解锁编辑。 */
  const finishAiStream = (markdown: string): void => {
    const ctxData = deps.getViewCtx();
    const streamPos = aiStreamPos;
    aiStreamPos = null;
    if (!ctxData || streamPos === null) {
      return;
    }
    const { view } = ctxData;
    const node = view.state.doc.nodeAt(streamPos);
    if (!node || node.type.name !== MEDITOR_AI_STREAM_NODE_NAME) {
      unlockEditorAfterAi(view);
      return;
    }
    const endPos = streamPos + node.nodeSize;
    const trimmed = markdown.trim();
    const tr = view.state.tr;
    let replaced = false;
    if (trimmed.length > 0) {
      // 完整 markdown 经 milkdown 解析器转为正式节点后整体替换占位块。
      const parsed = deps.parseMarkdown(trimmed);
      if (parsed && parsed.childCount > 0) {
        tr.replaceWith(streamPos, endPos, parsed.content);
        replaced = true;
      }
    }
    if (!replaced) {
      tr.delete(streamPos, endPos);
    }
    // 光标落在插入内容末尾承接继续编辑。
    const insertEnd = Math.min(tr.mapping.map(endPos), tr.doc.content.size);
    tr.setSelection(TextSelection.near(tr.doc.resolve(Math.max(0, insertEnd)), -1));
    view.dispatch(tr.scrollIntoView());
    unlockEditorAfterAi(view);
  };

  return {
    isStreaming: () => aiStreamPos !== null,
    begin: (): boolean => {
      const ctxData = deps.getViewCtx();
      if (!ctxData || aiStreamPos !== null) {
        return false;
      }
      const { view } = ctxData;
      const streamType = view.state.schema.nodes[MEDITOR_AI_STREAM_NODE_NAME];
      if (!streamType) {
        return false;
      }
      // 锁定编辑(禁用户输入;程序性 dispatch 不受限)。
      view.setProps({ editable: () => false });
      // 占位块固定插在光标所在"顶层块之后"(嵌套上下文取顶层祖先边界),
      // 保证占位与后续替换都发生在文档顶层——切入列表/引用内部会因块结构
      // 不合法被 PM 归一化,生成内容结构会被破坏。
      const doc = view.state.doc;
      let insertPos: number;
      try {
        const $from = view.state.selection.$from;
        const topLevelPos = $from.depth >= 1 ? $from.before(1) : $from.pos;
        const topNode = doc.nodeAt(topLevelPos);
        insertPos = topLevelPos + (topNode ? topNode.nodeSize : 0);
      } catch {
        insertPos = doc.content.size;
      }
      if (insertPos < 0 || insertPos > doc.content.size) {
        insertPos = doc.content.size;
      }
      view.dispatch(
        view.state.tr.insert(insertPos, streamType.create({ text: '' })).scrollIntoView(),
      );
      aiStreamPos = insertPos;
      return true;
    },
    append: (delta: string): void => {
      if (!delta || aiStreamPos === null) {
        return;
      }
      const ctxData = deps.getViewCtx();
      if (!ctxData) {
        return;
      }
      const { view } = ctxData;
      const node = view.state.doc.nodeAt(aiStreamPos);
      if (!node || node.type.name !== MEDITOR_AI_STREAM_NODE_NAME) {
        return;
      }
      view.dispatch(
        view.state.tr.setNodeAttribute(aiStreamPos, 'text', String(node.attrs.text ?? '') + delta),
      );
    },
    end: (markdown: string) => finishAiStream(markdown),
    cancel: (markdownSoFar: string) => finishAiStream(markdownSoFar),
    fail: () => finishAiStream(''),
  };
};
