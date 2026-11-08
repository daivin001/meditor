import type { Node as ProseNode } from '@milkdown/prose/model';
import type { Selection } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';

/** 定义图片插入参数。 */
export interface InsertImagePayload {
  /** 图片地址。 */
  src: string;
  /** 图片替代文本。 */
  alt: string;
  /** 图片标题。 */
  title: string;
}

/** 创建图片节点。 */
const createImageNode = (view: EditorView, payload: InsertImagePayload): ProseNode | null => {
  // 图片节点类型。
  const imageType = view.state.schema.nodes.image;
  return imageType?.create(payload) ?? null;
};

/** 在指定选区插入图片节点。 */
export const insertImageNode = (
  view: EditorView,
  payload: InsertImagePayload,
  selection: Selection = view.state.selection
): boolean => {
  // 图片节点实例。
  const imageNode = createImageNode(view, payload);
  if (!imageNode) {
    return false;
  }

  // 图片为行内节点:replaceSelectionWith 会把选区留在插入后的图片之后,
  // 光标继续停留在同一行,可在图片前后继续输入文字或插入其他行内元素。
  view.dispatch(
    view.state.tr
      .setSelection(selection)
      .replaceSelectionWith(imageNode)
      .scrollIntoView()
  );
  return true;
};
