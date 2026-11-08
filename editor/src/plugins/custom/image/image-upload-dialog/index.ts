/**
 * plugins/custom/image/image-upload-dialog/index.ts — 一次性图片上传弹窗包装器
 *
 * 1:1 翻译自 zt-react-milkdown/src/plugins/custom/image/image-upload-dialog/index.ts
 * - React createRoot 渲染改为 DOM 弹窗组件(components/image-upload-dialog);
 * - 每次调用经 utils/dialog-host 在编辑器所在根(shadow root 或 body)创建
 *   临时宿主、复制编辑器主题变量,关闭即销毁宿主;
 * - 确认后与原版共用 insertImageNode 的块级图片插入行为。
 */
import type { EditorView } from '@milkdown/prose/view';
import type { EditorI18nMessages, ImageUploadConfig } from '../../../../types/editor';
import { createImageUploadDialog } from '../../../../components/image-upload-dialog';
import { createBodyDialogHost, ensureDialogStyleInjected } from '../../../../utils/dialog-host';
import { insertImageNode } from '../image-insert';
// 上传弹窗自带样式:shadow DOM 宿主应用里弹窗挂 body 顶层置顶时需自行注入主文档。
import uploadDialogCss from '../../../../styles/modules/image-upload-dialog.css?inline';

/** 上传弹窗注入主文档的 style 标签 id(幂等注入判重)。 */
const UPLOAD_DIALOG_STYLE_ID = 'zt-md-image-upload-dialog-styles';

/** 定义图片上传弹窗参数。 */
interface ImageUploadDialogOptions {
  /** 编辑器内部浮层 Portal 容器。 */
  portalContainer: HTMLElement;
  /** 当前编辑器视图。 */
  view: EditorView;
  /** 编辑器文案。 */
  messages: EditorI18nMessages;
  /** 图片上传配置。 */
  imageUpload?: ImageUploadConfig;
}

/**
 * 创建图片上传弹窗。
 */
export const showImageUploadDialog = (options: ImageUploadDialogOptions): void => {
  // 弹窗样式注入主文档(幂等)+ 宿主挂 body 顶层(避开 shadow DOM 应用浮层压制)。
  ensureDialogStyleInjected(UPLOAD_DIALOG_STYLE_ID, uploadDialogCss);
  // 图片上传弹窗宿主节点。
  const host = createBodyDialogHost(options.portalContainer, 'zt-md-image-upload-host');
  // 是否已确认(取消时不归还编辑器焦点;确认时仅插入成功才归还,对齐原版)。
  let confirmed = false;
  // 确认后是否成功插入图片。
  let didInsertImage = false;

  /**
   * 关闭弹窗并卸载宿主。
   */
  const destroyDialog = (): void => {
    queueMicrotask(() => {
      host.remove();
      if (!confirmed || didInsertImage) {
        options.view?.focus?.();
      }
    });
  };

  createImageUploadDialog({
    container: host,
    config: options.imageUpload ?? {},
    messages: options.messages,
    onConfirm: (src, alt, _title) => {
      // 弹窗与粘贴共用同一块级图片插入行为(原版忽略 title)。
      confirmed = true;
      didInsertImage = insertImageNode(options.view, { src, alt, title: '' });
    },
    onClose: destroyDialog
  }).open();
};
