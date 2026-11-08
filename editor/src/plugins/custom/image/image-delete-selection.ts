/**
 * plugins/custom/image/image-delete-selection.ts — 原子媒体删除
 *
 * 图片为行内原子节点,与行内字符一致:光标紧贴图片时 Backspace/Delete 一次删除。
 * 媒体嵌入块(media_embed:视频/音频/书签/内嵌)保持两段式删除:
 * - 光标紧贴块边界时按 Backspace/Delete,第一次把块切为 NodeSelection 选中态;
 * - 选中态再按 Backspace/Delete 即删除块并稳定光标落点;
 * - 块下方空段落行首按 Backspace,删除空段落并选中上方块。
 */
import type { Node as ProseNode, ResolvedPos } from '@milkdown/prose/model';
import { NodeSelection, Plugin, PluginKey, TextSelection, type Selection } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import { $prose } from '@milkdown/utils';

// 图片节点类型名。
const IMAGE_NODE_NAME = 'image';
// 媒体嵌入块节点类型名。
const MEDIA_EMBED_NODE_NAME = 'media_embed';
// 支持两段式删除的原子媒体块节点名集合(图片已改为行内节点,走一次删除路径)。
const DELETABLE_MEDIA_NODE_NAMES = new Set([MEDIA_EMBED_NODE_NAME]);
// 删除键与相邻节点方向映射。
const DELETE_BOUNDARY_DIRECTION_MAP: Record<string, 'before' | 'after'> = {
  Backspace: 'before',
  Delete: 'after'
};

/**
 * 判断当前编辑器是否可编辑。
 */
const isEditorViewEditable = (view: EditorView): boolean => {
  if (typeof view.props.editable === 'function') {
    return view.props.editable(view.state);
  }

  return view.editable;
};

/**
 * 判断事件目标是否位于媒体块内部交互控件内(图片操作区/缩放手柄、媒体块操作区)。
 */
const isInsideMediaInteractiveElement = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      '.zt-md-image-actions, .zt-md-image-resize-handle, .zt-md-media-embed-actions'
    )
  );
};

/**
 * 判断节点是否为支持两段式删除的原子媒体块(图片/媒体嵌入)。
 */
const isDeletableMediaNode = (node: ProseNode | null | undefined): node is ProseNode => {
  return DELETABLE_MEDIA_NODE_NAMES.has(node?.type.name ?? '');
};

/**
 * 判断是否应跳过媒体块删除处理。
 */
const shouldSkipMediaDeletion = (view: EditorView, event: KeyboardEvent): boolean => {
  return (
    !DELETE_BOUNDARY_DIRECTION_MAP[event.key] ||
    event.defaultPrevented ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    !isEditorViewEditable(view) ||
    isInsideMediaInteractiveElement(event.target) ||
    isInsideMediaInteractiveElement(document.activeElement)
  );
};

/**
 * 解析“当前块同级上一块是否为原子媒体块”。
 */
const resolvePreviousMediaBlock = (
  resolvedPosition: ResolvedPos
): { previousBlockStart: number } | null => {
  // 仅在空段落行首触发，避免误删普通内容段落。
  if (resolvedPosition.parent.type.name !== 'paragraph' || resolvedPosition.parentOffset !== 0) {
    return null;
  }
  if (resolvedPosition.parent.textContent.length > 0 || resolvedPosition.depth < 1) {
    return null;
  }

  // 当前块在其父容器中的索引。
  const currentBlockIndex = resolvedPosition.index(resolvedPosition.depth - 1);
  if (currentBlockIndex <= 0) {
    return null;
  }

  // 当前块容器。
  const blockContainer = resolvedPosition.node(resolvedPosition.depth - 1);
  // 当前块同级上一块节点。
  const previousBlock = blockContainer.child(currentBlockIndex - 1);
  if (!isDeletableMediaNode(previousBlock)) {
    return null;
  }

  // 当前块起始位置（节点左边界）。
  const currentBlockStart = resolvedPosition.before(resolvedPosition.depth);
  return {
    previousBlockStart: currentBlockStart - previousBlock.nodeSize
  };
};

/**
 * 创建删除图片后的稳定文本选区。
 */
const createStableTextSelection = (doc: ProseNode, position: number): Selection => {
  try {
    return TextSelection.create(doc, position);
  } catch {
    return TextSelection.near(doc.resolve(position), -1);
  }
};

/**
 * 删除已选中的媒体块节点并稳定光标落点。
 */
const deleteSelectedMediaNode = (view: EditorView, selection: NodeSelection, event: KeyboardEvent): boolean => {
  event.preventDefault();
  // 删除后的光标候选位置。
  const selectionPosition = selection.from;
  // 删除媒体块节点事务。
  const transaction = view.state.tr.delete(selection.from, selection.to);
  // 文档最大可解析位置。
  const maxPosition = transaction.doc.content.size;
  // 删除后安全落点。
  const safePosition = Math.min(selectionPosition, maxPosition);
  transaction.setSelection(createStableTextSelection(transaction.doc, safePosition)).scrollIntoView();

  view.dispatch(transaction);
  view.focus();
  return true;
};

/**
 * 处理媒体块下方空段落行首 Backspace，删除空段落并选中上方媒体块。
 */
const selectMediaFromTrailingEmptyParagraph = (view: EditorView, event: KeyboardEvent): boolean => {
  if (event.key !== 'Backspace') {
    return false;
  }

  // 当前选区。
  const { selection } = view.state;
  if (!selection.empty) {
    return false;
  }

  // 当前解析位置。
  const resolvedPosition = selection.$from;
  // 命中的上方媒体块节点及起始位置。
  const previousMediaBlock = resolvePreviousMediaBlock(resolvedPosition);
  if (!previousMediaBlock) {
    return false;
  }

  // 当前空段落起始位置。
  const currentBlockStart = resolvedPosition.before(resolvedPosition.depth);
  // 当前空段落结束位置。
  const currentBlockEnd = currentBlockStart + resolvedPosition.parent.nodeSize;

  event.preventDefault();
  // 删除当前空段落并选中上方媒体块。
  const transaction = view.state.tr;
  transaction.delete(currentBlockStart, currentBlockEnd);
  transaction.setSelection(
    NodeSelection.create(transaction.doc, previousMediaBlock.previousBlockStart)
  ).scrollIntoView();
  view.dispatch(transaction);
  view.focus();
  return true;
};

/**
 * 处理光标紧贴媒体块边界时的第一次删除按键，将块切换为选中态。
 */
const selectAdjacentMediaNode = (view: EditorView, event: KeyboardEvent): boolean => {
  if (selectMediaFromTrailingEmptyParagraph(view, event)) {
    return true;
  }

  // 删除方向。
  const direction = DELETE_BOUNDARY_DIRECTION_MAP[event.key];
  if (!direction) {
    return false;
  }

  // 当前选区。
  const { selection } = view.state;
  if (!selection.empty) {
    return false;
  }

  // 当前光标位置。
  const resolvedPosition = selection.$from;
  // 相邻节点。
  const adjacentNode = direction === 'before' ? resolvedPosition.nodeBefore : resolvedPosition.nodeAfter;
  if (!isDeletableMediaNode(adjacentNode)) {
    return false;
  }

  event.preventDefault();
  // 相邻媒体块起始位置。
  const mediaPosition = direction === 'before' ? selection.from - adjacentNode.nodeSize : selection.from;
  view.dispatch(
    view.state.tr
      .setSelection(NodeSelection.create(view.state.doc, mediaPosition))
      .scrollIntoView()
  );
  view.focus();
  return true;
};

/**
 * 删除光标紧贴的行内图片:图片是行内原子,与字符一致一次删除。
 * ProseMirror 原生删除命令要求光标位于文本块边界,紧贴行内图片时既不在边界
 * 也无选区可删,会静默落空,故在此显式处理。
 */
const deleteAdjacentImage = (view: EditorView, event: KeyboardEvent): boolean => {
  // 删除方向。
  const direction = DELETE_BOUNDARY_DIRECTION_MAP[event.key];
  if (!direction) {
    return false;
  }

  // 当前选区。
  const { selection } = view.state;
  if (!selection.empty) {
    return false;
  }

  // 当前光标位置。
  const resolvedPosition = selection.$from;
  // 光标相邻节点(Backspace 命中前方 / Delete 命中后方)。
  const adjacentNode =
    direction === 'before' ? resolvedPosition.nodeBefore : resolvedPosition.nodeAfter;
  if (adjacentNode?.type.name !== IMAGE_NODE_NAME) {
    return false;
  }

  // 相邻图片节点区间。
  const from = direction === 'before' ? selection.from - adjacentNode.nodeSize : selection.from;
  const to = from + adjacentNode.nodeSize;

  event.preventDefault();
  // 删除图片后光标落在原图片位置(仍在同一行)。
  const transaction = view.state.tr.delete(from, to);
  const safePosition = Math.min(from, transaction.doc.content.size);
  transaction.setSelection(createStableTextSelection(transaction.doc, safePosition)).scrollIntoView();
  view.dispatch(transaction);
  view.focus();
  return true;
};

/**
 * 处理媒体块两段式删除:第一次选中,第二次删除。
 */
const handleMediaDeletion = (view: EditorView, event: KeyboardEvent): boolean => {
  if (shouldSkipMediaDeletion(view, event)) {
    return false;
  }

  // 行内图片紧贴光标时一次删除。
  if (deleteAdjacentImage(view, event)) {
    return true;
  }

  // 当前选区。
  const { selection } = view.state;
  if (selection instanceof NodeSelection && isDeletableMediaNode(selection.node)) {
    return deleteSelectedMediaNode(view, selection, event);
  }

  return selectAdjacentMediaNode(view, event);
};

/**
 * 原子媒体删除插件:行内图片一次删除,媒体嵌入块两段式删除。
 */
export const imageDeleteSelectionPlugin = $prose(() => {
  return new Plugin({
    key: new PluginKey('zt-md-image-delete-selection'),
    props: {
      handleKeyDown: (view, event) => {
        return handleMediaDeletion(view as EditorView, event);
      }
    }
  });
});
