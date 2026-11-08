/**
 * plugins/custom/image/image-drop.ts — 图片文件拖拽插入
 *
 * 与粘贴同源:拖入编辑器的图片文件经统一上传策略(宿主 upload 或 data URL
 * 兜底)后在松手位置插入。非图片文件不接管(交回宿主/浏览器默认行为)。
 */
import { Plugin, PluginKey, TextSelection } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import { $prose } from '@milkdown/utils';
import type { EditorI18nMessages, ImageUploadConfig } from '../../../types/editor';
import { insertImageNode } from './image-insert';
import {
  DEFAULT_MAX_FILE_SIZE,
  formatFileSize,
  getDefaultImageAltText,
  readFileAsDataUrl
} from './image-upload-utils';

/**
 * 判断当前编辑器是否可处理图片拖入。
 */
const canDropImage = (view: EditorView): boolean => {
  const isEditable =
    typeof view.props.editable === 'function' ? view.props.editable(view.state) : view.editable;
  return isEditable;
};

/**
 * 从拖拽数据中读取第一张图片文件。
 */
const getFirstDroppedImage = (dataTransfer: DataTransfer): File | null => {
  return Array.from(dataTransfer.files).find((file) => file.type.startsWith('image/')) ?? null;
};

/**
 * 创建图片文件拖拽插入插件。
 */
export const createImageDropPlugin = (
  imageUpload: ImageUploadConfig | undefined,
  messages: EditorI18nMessages
): ReturnType<typeof $prose> =>
  $prose(
    () =>
      new Plugin({
        key: new PluginKey('zt-md-image-drop'),
        props: {
          handleDrop: (view, event, slice, moved) => {
            // 内部块拖拽(块手柄排序等)不经此处。
            if (moved || slice?.size) {
              return false;
            }
            if (!canDropImage(view)) {
              return false;
            }
            const dragEvent = event as DragEvent;
            const dataTransfer = dragEvent.dataTransfer;
            if (!dataTransfer) {
              return false;
            }
            const imageFile = getFirstDroppedImage(dataTransfer);
            if (!imageFile) {
              return false;
            }

            event.preventDefault();
            const maxFileSize = imageUpload?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
            if (imageFile.size > maxFileSize) {
              console.error(
                new Error(
                  messages.imageUploadFileSizeExceeded.replace('{size}', formatFileSize(maxFileSize))
                )
              );
              return true;
            }

            // 松手位置(取不到坐标时退回当前选区)。
            const coords = view.posAtCoords({ left: dragEvent.clientX, top: dragEvent.clientY });
            const insertPos = coords?.pos ?? view.state.selection.from;

            void (async () => {
              try {
                const imageUrl = imageUpload?.upload
                  ? await imageUpload.upload(imageFile)
                  : await readFileAsDataUrl(imageFile);
                if (view.isDestroyed) {
                  return;
                }
                // 上传期间文档可能已变化:目标位置就近收敛到合法范围。
                const target = Math.min(insertPos, view.state.doc.content.size);
                insertImageNode(
                  view,
                  {
                    src: imageUrl,
                    alt: getDefaultImageAltText(imageFile.name),
                    title: ''
                  },
                  TextSelection.near(view.state.doc.resolve(target), 1)
                );
              } catch (error) {
                console.error(error);
              }
            })();
            return true;
          }
        }
      })
  );
