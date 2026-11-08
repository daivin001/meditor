/**
 * plugins/custom/ai/ai-stream.ts — AI 流式生成占位块
 *
 * AI 生成期间在光标处插入的临时块节点:NodeView 实时渲染已生成的
 * Markdown 原文(生成中带"AI 正在生成"指示);生成结束后由编排层以
 * 解析后的正式节点整体替换,取消时以已收内容替换,失败时整块移除。
 *
 * - 该节点不参与 Markdown 解析/序列化(parseMarkdown 永不匹配,
 *   toMarkdown 输出空):流式中途存盘不会把半成品语法写进文档;
 * - 生成期间编辑器整体锁定(setEditable(false)),节点位置除自身
 *   setNodeAttribute 事务外不变,编排层以固定 pos 增量更新。
 */
import { $nodeSchema } from '@milkdown/utils';
import type { Node as ProseNode } from '@milkdown/prose/model';
import type { NodeView, NodeViewConstructor } from '@milkdown/prose/view';
import type { EditorI18nMessages } from '../../../types/editor';
import { createSharedIcon } from '../../../icons';
import { EDITOR_SCROLL_CONTAINER_SELECTOR } from '../../../lib/editor-overlay-position';
import '../../../styles/modules/ai.css';

/**
 * AI 流式占位块 mdast 节点类型名。
 */
export const MEDITOR_AI_STREAM_MDAST_TYPE = 'meditorAiStream';

/**
 * AI 流式占位块 PM 节点类型名。
 */
export const MEDITOR_AI_STREAM_NODE_NAME = 'meditor_ai_stream';

/**
 * AI 流式占位块 schema(原子块;文本经 attr 增量更新)。
 */
export const aiStreamSchema = $nodeSchema(MEDITOR_AI_STREAM_NODE_NAME, () => ({
  group: 'block',
  atom: true,
  selectable: false,
  defining: true,
  attrs: {
    /** 已生成的 Markdown 原文(增量累积)。 */
    text: { default: '' },
  },
  parseDOM: [
    {
      tag: `div[data-type="${MEDITOR_AI_STREAM_NODE_NAME}"]`,
    },
  ],
  toDOM: (node) => [
    'div',
    {
      'data-type': MEDITOR_AI_STREAM_NODE_NAME,
      class: 'zt-md-ai-stream',
      'data-text': String(node.attrs.text ?? ''),
    },
  ],
  parseMarkdown: {
    // 临时节点永不从 Markdown 解析产生。
    match: () => false,
    runner: () => undefined,
  },
  toMarkdown: {
    // 序列化输出空:流式中途的 onChange/存盘不落半成品语法。
    match: (node) => node.type.name === MEDITOR_AI_STREAM_NODE_NAME,
    runner: () => undefined,
  },
}));

/**
 * AI 流式占位块 NodeView:渲染生成指示与增量文本,内容增长时保持尾部可见。
 */
class AiStreamNodeView implements NodeView {
  // 节点根容器。
  dom: HTMLElement;
  // 已生成文本容器。
  private readonly textEl: HTMLElement;

  constructor(messages: EditorI18nMessages) {
    this.dom = document.createElement('div');
    this.dom.className = 'zt-md-ai-stream';
    this.dom.dataset.type = MEDITOR_AI_STREAM_NODE_NAME;
    this.dom.contentEditable = 'false';

    const header = document.createElement('div');
    header.className = 'zt-md-ai-stream-header';
    header.appendChild(
      createSharedIcon('ai', { size: 14, strokeWidth: 2, className: 'zt-md-ai-stream-icon' })
    );
    const label = document.createElement('span');
    label.className = 'zt-md-ai-stream-label';
    label.textContent = messages.aiStreamGeneratingLabel;
    header.appendChild(label);
    const pulse = document.createElement('span');
    pulse.className = 'zt-md-ai-stream-pulse';
    header.appendChild(pulse);
    this.dom.appendChild(header);

    this.textEl = document.createElement('div');
    this.textEl.className = 'zt-md-ai-stream-text';
    this.dom.appendChild(this.textEl);
  }

  /** 保持流式块尾部在编辑区可视范围内(容器可滚时增量下滚)。 */
  private scrollTailIntoView(): void {
    const container = this.dom.closest(EDITOR_SCROLL_CONTAINER_SELECTOR);
    if (!(container instanceof HTMLElement)) {
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const domRect = this.dom.getBoundingClientRect();
    const overflow = domRect.bottom - containerRect.bottom;
    if (overflow > 8) {
      container.scrollTop += overflow + 24;
    }
  }

  update(node: ProseNode): boolean {
    if (node.type.name !== MEDITOR_AI_STREAM_NODE_NAME) {
      return false;
    }
    const text = String(node.attrs.text ?? '');
    if (this.textEl.textContent !== text) {
      this.textEl.textContent = text;
      this.scrollTailIntoView();
    }
    return true;
  }

  stopEvent(): boolean {
    // 占位块整体只读,不参与编辑交互。
    return true;
  }

  ignoreMutation(): boolean {
    return true;
  }
}

/**
 * 创建 AI 流式占位块 NodeView 构造器。
 */
export const createAiStreamNodeView =
  (messages: EditorI18nMessages): NodeViewConstructor =>
  (_node, _view) =>
    new AiStreamNodeView(messages);
