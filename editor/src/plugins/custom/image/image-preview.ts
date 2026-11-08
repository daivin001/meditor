/**
 * plugins/custom/image/image-preview.ts — 图片预览/标注编辑弹窗入口
 *
 * 双击图片打开灯箱预览与标注编辑(canvas 引擎见 components/image-preview-editor):
 * - 每次打开在 document.body 顶层创建临时宿主(弹窗 CSS 自行注入主文档),
 *   避开 shadow DOM 宿主应用的局部层叠上下文,保证弹窗置顶可点;
 *   关闭即销毁宿主;
 * - 模块级单例守卫:已有预览弹窗打开时忽略重复打开,避免弹层叠加;
 * - 确认后把编辑产物(Data URL)回写到当前 image 节点的 src 属性,NodeView 随
 *   节点更新自动换图;位置经 getPos 实时解析并在事务前校验节点仍在原位。
 */
import type { Node as ProseNode } from '@milkdown/prose/model';
import type { EditorView } from '@milkdown/prose/view';
import type { EditorI18nMessages } from '../../../types/editor';
import { createImagePreviewEditor } from '../../../components/image-preview-editor';
import { createBodyDialogHost, ensureDialogStyleInjected } from '../../../utils/dialog-host';
// 弹窗自带样式:宿主可能是 shadow DOM 应用(meditor 样式仅在 shadow root 内),
// 弹窗挂 body 顶层置顶时需自行注入主文档,否则无样式且被应用浮层压住。
import previewEditorCss from '../../../styles/modules/image-preview-editor.css?inline';

/** 预览弹窗注入主文档的 style 标签 id(幂等注入判重)。 */
const PREVIEW_EDITOR_STYLE_ID = 'zt-md-image-preview-editor-styles';

/** 当前已打开预览弹窗的关闭器(模块级单例,防止重复叠加弹层)。 */
let closeActivePreview: (() => void) | null = null;

/** 定义图片预览弹窗参数。 */
export interface ImagePreviewOptions {
  /** 当前编辑器视图。 */
  view: EditorView;
  /** 节点位置获取器(返回 null 表示节点已不在文档中)。 */
  getPosition: () => number | null;
  /** 当前图片节点快照(取 src 与属性基底)。 */
  node: ProseNode;
  /** 编辑器文案。 */
  messages: EditorI18nMessages;
  /** 编辑器是否可编辑(只读态仅预览)。 */
  editable: boolean;
}

/**
 * 打开图片预览/标注编辑弹窗。
 */
export const openImagePreviewEditor = (options: ImagePreviewOptions): void => {
  if (closeActivePreview) {
    return;
  }

  // 弹窗样式注入主文档(幂等)+ 宿主挂 body 顶层:
  // shadow DOM 宿主应用里,挂 shadow root 的弹窗会被应用的 body 级浮层
  // (下拉菜单 backdrop 等)整体压住并截走点击,必须上到顶层文档。
  ensureDialogStyleInjected(PREVIEW_EDITOR_STYLE_ID, previewEditorCss);
  const host = createBodyDialogHost(options.view.dom, 'zt-md-image-preview-host');
  // 确认后是否成功回写图片(决定关闭后是否归还编辑器焦点)。
  let didApply = false;

  /**
   * 关闭弹窗并卸载宿主。
   */
  const destroyHost = (): void => {
    closeActivePreview = null;
    queueMicrotask(() => {
      host.remove();
      if (didApply) {
        options.view?.focus?.();
      }
    });
  };

  /**
   * 把编辑后的 Data URL 回写到图片节点 src。
   */
  const applyEditedImage = (dataUrl: string): void => {
    const { view } = options;
    if (!view || !isViewEditable(view)) {
      return;
    }

    // 节点位置实时解析(弹窗打开期间文档可能已变化)。
    const nodePosition = options.getPosition();
    if (nodePosition === null) {
      return;
    }

    // 原位校验:位置处必须仍是 image 节点,防止文档位移后误改其他节点。
    const nodeAtPosition = view.state.doc.nodeAt(nodePosition);
    if (nodeAtPosition?.type.name !== options.node.type.name) {
      return;
    }

    const transaction = view.state.tr.setNodeMarkup(nodePosition, undefined, {
      ...options.node.attrs,
      src: dataUrl
    });
    view.dispatch(transaction);
    didApply = true;
  };

  const dialog = createImagePreviewEditor({
    container: host,
    src: typeof options.node.attrs.src === 'string' ? options.node.attrs.src : '',
    messages: options.messages,
    editable: options.editable,
    onConfirm: applyEditedImage,
    onClose: destroyHost
  });
  closeActivePreview = () => dialog.close();
  dialog.open();
};

/**
 * 判断当前编辑器是否可编辑。
 */
const isViewEditable = (view: EditorView): boolean => {
  if (typeof view.props.editable === 'function') {
    return view.props.editable(view.state);
  }

  return view.editable;
};
