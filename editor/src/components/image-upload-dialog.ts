/**
 * components/image-upload-dialog.ts — 图片上传弹窗（纯 DOM 实现）
 *
 * 1:1 翻译自 zt-react-milkdown/src/plugins/custom/image/image-upload-dialog/ImageUploadDialog.tsx
 * - 去除 Radix Dialog / React,改用 position:fixed 弹层 + 命令式 DOM
 * - segmented 上传方式切换 / 拖放一体化 label / loading 与预览错误态 / hint 行
 * - 保留 meditor 安全加固:确认前经 normalizeSafeImageUrl 归一化地址
 */
import type { EditorI18nMessages, ImageUploadConfig } from '../types/editor';
import { normalizeSafeImageUrl } from '../utils/security';
import {
  DEFAULT_MAX_FILE_SIZE,
  IMAGE_ALT_INPUT_ID,
  IMAGE_FILE_INPUT_ID,
  formatFileSize,
  getDefaultImageAltText,
  isValidUrl,
  preloadImage,
  readFileAsDataUrl
} from '../plugins/custom/image/image-upload-utils';

/** 图片上传弹窗 API。 */
export interface ImageUploadDialogApi {
  open: () => void;
  close: () => void;
  setMessages: (messages: EditorI18nMessages) => void;
}

/** 图片上传弹窗配置。 */
export interface ImageUploadDialogConfig {
  /** 弹窗挂载容器。 */
  container: HTMLElement;
  /** 上传配置。 */
  config: ImageUploadConfig;
  /** 编辑器文案。 */
  messages: EditorI18nMessages;
  /** 确认回调。 */
  onConfirm: (src: string, alt: string, title: string) => void;
  /** 关闭回调(取消或确认后都会触发;一次性宿主用它在关闭后卸载)。 */
  onClose?: () => void;
}

/** 定义图片弹窗上传方式。 */
type ImageUploadType = 'file' | 'url';

/**
 * 构建内联 SVG 图标 markup(lucide 风格线条)。
 */
const buildIconMarkup = (paths: string, size = 24): string => {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
  );
};

// 关闭按钮图标。
const closeIconMarkup = buildIconMarkup('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', 16);
// 上传占位图标(ImagePlus)。
const imagePlusIconMarkup = buildIconMarkup(
  '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  40
);
// 上传中图标(Loader2)。
const loaderIconMarkup = buildIconMarkup('<path d="M21 12a9 9 0 1 1-6.219-8.56"/>', 40);
// 预览失败图标(ImageOff)。
const imageOffIconMarkup = (size: number): string =>
  buildIconMarkup(
    '<line x1="2" x2="22" y1="2" y2="22"/><path d="M10.41 5.41C10.87 5.15 11.42 5 12 5h6a2 2 0 0 1 2 2v6"/><path d="M4 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h.34"/><circle cx="9" cy="10" r="1"/><path d="m17 15-5.41-5.41"/>',
    size
  );
// 错误提示图标(AlertCircle)。
const alertCircleIconMarkup = buildIconMarkup(
  '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  14
);

/**
 * 创建图片上传弹窗。
 */
export const createImageUploadDialog = (config: ImageUploadDialogConfig): ImageUploadDialogApi => {
  /** 遮罩层(挂载于宿主容器)。 */
  const overlay = document.createElement('div');
  overlay.className = 'zt-md-image-upload-dialog-overlay';
  overlay.style.display = 'none';

  /** 弹窗内容壳。 */
  const shell = document.createElement('div');
  shell.className = 'zt-md-image-upload-content-shell';
  shell.setAttribute('role', 'dialog');
  shell.setAttribute('aria-label', config.messages.imageUploadDialogTitle);
  overlay.appendChild(shell);
  config.container.appendChild(overlay);

  // 当前上传方式。
  let uploadType: ImageUploadType = 'file';
  // 当前图片地址(上传结果或链接输入)。
  let imageUrl = '';
  // 当前图片替代文本。
  let altText = '';
  // 当前预览图是否加载失败。
  let previewLoadError = false;
  // 当前错误提示。
  let errorMessage = '';
  // 当前是否正在上传或读取。
  let isUploading = false;
  // 当前是否正在准备插入图片。
  let isPreparingInsert = false;
  // 当前是否处于拖拽悬停。
  let isDragOver = false;

  /** 文件输入框引用(每次重渲染后刷新)。 */
  let fileInput: HTMLInputElement | null = null;
  /** 链接输入框引用(每次重渲染后刷新)。 */
  let urlInput: HTMLInputElement | null = null;

  // 允许上传的最大文件体积。
  const maxFileSize = config.config.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;

  /**
   * 当前是否锁定交互(上传中或准备插入)。
   */
  const isInteractionLocked = (): boolean => isUploading || isPreparingInsert;

  /**
   * 是否展示重选提示。
   */
  const shouldShowReselectHint = (): boolean => uploadType === 'file' && Boolean(imageUrl) && !isInteractionLocked();

  /**
   * 当前提示行文案(错误优先,其次重选提示)。
   */
  const resolveHintText = (): string =>
    errorMessage || (shouldShowReselectHint() ? config.messages.imageUploadReselectHint : '');

  /**
   * 是否展示替代文本输入框。
   */
  const shouldShowAltInput = (): boolean =>
    Boolean(imageUrl) && !errorMessage && !isUploading && !previewLoadError;

  /**
   * 是否禁用确认按钮。
   */
  const isConfirmDisabled = (): boolean =>
    !imageUrl || Boolean(errorMessage) || isInteractionLocked() || previewLoadError;

  /**
   * 校验并处理图片文件(类型/体积校验 → 上传或读取为 dataURL)。
   */
  const processFile = async (file: File): Promise<void> => {
    if (!file.type.startsWith('image/')) {
      imageUrl = '';
      altText = '';
      errorMessage = config.messages.imageUploadInvalidType;
      render();
      return;
    }

    if (file.size > maxFileSize) {
      imageUrl = '';
      altText = '';
      errorMessage = config.messages.imageUploadFileSizeExceeded.replace('{size}', formatFileSize(maxFileSize));
      render();
      return;
    }

    errorMessage = '';
    altText = getDefaultImageAltText(file.name);
    previewLoadError = false;
    isUploading = true;
    render();

    try {
      // 上传或读取得到的图片地址。
      const nextImageUrl = config.config.upload ? await config.config.upload(file) : await readFileAsDataUrl(file);
      if (!nextImageUrl) {
        imageUrl = '';
        errorMessage = config.messages.imageUploadFailed;
        return;
      }

      imageUrl = nextImageUrl;
    } catch (uploadError) {
      // 上传错误提示。
      const uploadErrorMessage = config.config.upload
        ? uploadError instanceof Error
          ? uploadError.message
          : config.messages.imageUploadFailed
        : config.messages.imageUploadFileReadFailed;
      imageUrl = '';
      errorMessage = uploadErrorMessage || config.messages.imageUploadFailed;
    } finally {
      isUploading = false;
      render();
    }
  };

  /**
   * 处理图片链接变化。
   */
  const handleUrlChange = (nextUrl: string): void => {
    previewLoadError = false;
    imageUrl = nextUrl;

    if (!nextUrl) {
      errorMessage = '';
      return;
    }
    errorMessage = isValidUrl(nextUrl) ? '' : config.messages.imageUploadInvalidUrl;
    renderUrlPreviewOnly();
  };

  /**
   * 处理确认插入。
   */
  const handleConfirm = async (): Promise<void> => {
    if (isInteractionLocked()) {
      errorMessage = config.messages.imageUploadUploadingWait;
      render();
      return;
    }
    if (!imageUrl) {
      errorMessage = config.messages.imageUploadSelectOrEnterImage;
      render();
      return;
    }
    if (uploadType === 'url' && !isValidUrl(imageUrl)) {
      errorMessage = config.messages.imageUploadInvalidUrl;
      render();
      return;
    }

    errorMessage = '';
    isPreparingInsert = true;
    render();

    try {
      await preloadImage(imageUrl);
      // meditor 安全加固:插入前归一化地址(协议白名单校验)。
      const normalized = normalizeSafeImageUrl(imageUrl, config.config.allowedProtocols);
      if (!normalized) {
        previewLoadError = false;
        errorMessage = config.messages.imageUploadInvalidUrl;
        return;
      }
      config.onConfirm(normalized, altText.trim(), '');
      api.close();
    } catch {
      previewLoadError = true;
      errorMessage = config.messages.imageUploadLoadFailed;
    } finally {
      isPreparingInsert = false;
      render();
    }
  };

  /**
   * 处理上传方式切换(切换时清空全部输入状态)。
   */
  const handleUploadTypeChange = (nextUploadType: ImageUploadType): void => {
    if (isInteractionLocked()) {
      return;
    }
    uploadType = nextUploadType;
    imageUrl = '';
    altText = '';
    previewLoadError = false;
    errorMessage = '';
    render();
  };

  /**
   * 渲染文件上传模式的拖放区内容。
   */
  const renderFileTabInner = (): string => {
    if (isUploading) {
      return (
        `<div class="zt-md-image-upload-file-icon">${loaderIconMarkup.replace('<svg ', '<svg class="zt-md-image-upload-spin" ')}</div>` +
        `<div class="zt-md-image-upload-file-text">${escapeHtml(config.messages.imageUploadUploadingLabel)}</div>`
      );
    }

    if (imageUrl) {
      if (previewLoadError) {
        return (
          `<div class="zt-md-image-upload-file-preview"><div class="zt-md-image-upload-preview-error">${imageOffIconMarkup(40)}<span>${escapeHtml(config.messages.imageUploadLoadFailed)}</span></div></div>`
        );
      }
      return `<div class="zt-md-image-upload-file-preview"><img src="${escapeHtml(imageUrl)}" alt="" /></div>`;
    }

    return (
      `<div class="zt-md-image-upload-file-icon">${imagePlusIconMarkup}</div>` +
      `<div class="zt-md-image-upload-file-text">${escapeHtml(config.messages.imageUploadDropLabel)}</div>` +
      `<div class="zt-md-image-upload-file-hint">${escapeHtml(
        config.messages.imageUploadSupportsAndMax.replace('{size}', formatFileSize(maxFileSize))
      )}</div>`
    );
  };

  /**
   * 渲染链接输入模式内容。
   */
  const renderUrlTabInner = (): string => {
    const previewHtml =
      imageUrl && !errorMessage
        ? previewLoadError
          ? `<div class="zt-md-image-upload-url-preview"><div class="zt-md-image-upload-preview-error">${imageOffIconMarkup(32)}<span>${escapeHtml(config.messages.imageUploadLoadFailed)}</span></div></div>`
          : `<div class="zt-md-image-upload-url-preview"><img src="${escapeHtml(imageUrl)}" alt="" /></div>`
        : '';
    return (
      `<label class="zt-md-image-upload-label" for="zt-md-image-upload-url-input">${escapeHtml(
        config.messages.imageUploadUrlTab
      )}</label><input id="zt-md-image-upload-url-input" type="url" class="zt-md-image-upload-url-input" placeholder="${escapeHtml(config.messages.imageUploadUrlPlaceholder)}" value="${escapeHtml(imageUrl)}"${isInteractionLocked() ? ' disabled' : ''} />${previewHtml}`
    );
  };

  /**
   * 渲染弹窗主体(控制区 + 底部按钮,不重建壳与头部)。
   */
  const renderBodyHtml = (): string => {
    const controlHtml =
      uploadType === 'file'
        ? `<div class="zt-md-image-upload-file"><input id="${IMAGE_FILE_INPUT_ID}" type="file" accept="image/*" class="zt-md-image-upload-file-input"${isInteractionLocked() ? ' disabled' : ''} /><label for="${IMAGE_FILE_INPUT_ID}" class="zt-md-image-upload-file-label" data-drag-over="${isDragOver ? 'true' : 'false'}" data-has-preview="${imageUrl ? 'true' : 'false'}" data-disabled="${isInteractionLocked() ? 'true' : 'false'}"${isInteractionLocked() ? ' aria-disabled="true"' : ''}>${renderFileTabInner()}</label></div>`
        : `<div class="zt-md-image-upload-url">${renderUrlTabInner()}</div>`;

    const altHtml = shouldShowAltInput()
      ? `<div class="zt-md-image-upload-alt"><label class="zt-md-image-upload-label" for="${IMAGE_ALT_INPUT_ID}">${escapeHtml(
          config.messages.imageUploadAltLabel
        )}</label><input id="${IMAGE_ALT_INPUT_ID}" type="text" class="zt-md-image-upload-alt-input" placeholder="${escapeHtml(config.messages.imageUploadAltPlaceholder)}" value="${escapeHtml(altText)}"${isInteractionLocked() ? ' disabled' : ''} /></div>`
      : '';

    const hintText = resolveHintText();
    const hintHtml =
      `<div class="zt-md-image-upload-file-hint zt-md-image-upload-reselect-hint" data-error="${errorMessage ? 'true' : 'false'}" data-placeholder="${hintText ? 'false' : 'true'}"${errorMessage ? ' role="alert" aria-live="polite"' : ' aria-live="off" aria-hidden="true"'}>${errorMessage ? alertCircleIconMarkup : ''}<span class="zt-md-image-upload-hint-text">${escapeHtml(hintText || config.messages.imageUploadReselectHint)}</span></div>`;

    return (
      `<div class="zt-md-image-upload-segmented" role="group" aria-label="${escapeHtml(
        config.messages.imageUploadDialogTitle
      )}"><button type="button" class="zt-md-image-upload-segment" data-upload-type="file" data-active="${uploadType === 'file' ? 'true' : 'false'}" aria-pressed="${uploadType === 'file'}"${isInteractionLocked() ? ' disabled' : ''}>${escapeHtml(config.messages.imageUploadFileTab)}</button><button type="button" class="zt-md-image-upload-segment" data-upload-type="url" data-active="${uploadType === 'url' ? 'true' : 'false'}" aria-pressed="${uploadType === 'url'}"${isInteractionLocked() ? ' disabled' : ''}>${escapeHtml(config.messages.imageUploadUrlTab)}</button></div><div class="zt-md-image-upload-content"><div class="zt-md-image-upload-control">${controlHtml}${altHtml}${hintHtml}</div></div><div class="zt-md-image-upload-dialog-footer"><button type="button" class="zt-md-image-upload-dialog-cancel">${escapeHtml(
        config.messages.imageUploadCancelLabel
      )}</button><button type="button" class="zt-md-image-upload-dialog-confirm"${isConfirmDisabled() ? ' disabled' : ''}>${escapeHtml(
        isUploading
          ? config.messages.imageUploadUploadingLabel
          : isPreparingInsert
            ? config.messages.imageUploadInsertingLabel
            : config.messages.imageUploadConfirmLabel
      )}</button></div>`
    );
  };

  /**
   * HTML 转义。
   */
  function escapeHtml(s: string): string {
    return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
  }

  /**
   * 全量渲染(含头部)。
   */
  const render = (): void => {
    shell.innerHTML =
      `<div class="zt-md-image-upload-dialog-header"><span class="zt-md-image-upload-dialog-title">${escapeHtml(config.messages.imageUploadDialogTitle)}</span><button type="button" class="zt-md-image-upload-dialog-close" aria-label="${escapeHtml(
        config.messages.imageUploadCancelLabel
      )}" title="${escapeHtml(config.messages.imageUploadCancelLabel)}">${closeIconMarkup}</button></div>${renderBodyHtml()}`;
    bindEvents();
  };

  /**
   * URL 输入过程中的轻量刷新:仅更新预览区/hint/确认按钮态,不重建输入框。
   */
  const renderUrlPreviewOnly = (): void => {
    const control = shell.querySelector<HTMLElement>('.zt-md-image-upload-control');
    if (!control) {
      render();
      return;
    }

    // 移除旧预览容器后按需重建。
    control.querySelector('.zt-md-image-upload-url-preview')?.remove();
    if (imageUrl && !errorMessage) {
      const preview = document.createElement('div');
      preview.className = 'zt-md-image-upload-url-preview';
      if (previewLoadError) {
        preview.innerHTML =
          `<div class="zt-md-image-upload-preview-error">${imageOffIconMarkup(32)}` +
          `<span>${escapeHtml(config.messages.imageUploadLoadFailed)}</span></div>`;
      } else {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = '';
        preview.appendChild(img);
      }
      control.appendChild(preview);
    }

    syncHintRow();
    syncConfirmButton();
  };

  /**
   * 同步 hint 行文案与错误态。
   */
  const syncHintRow = (): void => {
    const hintRow = shell.querySelector<HTMLElement>('.zt-md-image-upload-reselect-hint');
    if (!hintRow) {
      return;
    }

    // 当前提示行文案。
    const hintText = resolveHintText();
    hintRow.dataset.error = errorMessage ? 'true' : 'false';
    hintRow.dataset.placeholder = hintText ? 'false' : 'true';
    if (errorMessage) {
      hintRow.setAttribute('role', 'alert');
      hintRow.setAttribute('aria-live', 'polite');
      hintRow.removeAttribute('aria-hidden');
    } else {
      hintRow.removeAttribute('role');
      hintRow.setAttribute('aria-live', 'off');
      hintRow.setAttribute('aria-hidden', 'true');
    }
    // 错误图标仅在错误态渲染。
    const iconHost = hintRow.querySelector('.zt-md-image-upload-hint-icon');
    if (errorMessage && !iconHost) {
      hintRow.insertAdjacentHTML('afterbegin', alertCircleIconMarkup);
    } else if (!errorMessage && iconHost) {
      iconHost.remove();
    }
    const textNode = hintRow.querySelector<HTMLElement>('.zt-md-image-upload-hint-text');
    if (textNode) {
      textNode.textContent = hintText || config.messages.imageUploadReselectHint;
    }
  };

  /**
   * 同步确认按钮禁用态与文案。
   */
  const syncConfirmButton = (): void => {
    const confirmButton = shell.querySelector<HTMLButtonElement>('.zt-md-image-upload-dialog-confirm');
    if (!confirmButton) {
      return;
    }
    confirmButton.disabled = isConfirmDisabled();
    confirmButton.textContent = isUploading
      ? config.messages.imageUploadUploadingLabel
      : isPreparingInsert
        ? config.messages.imageUploadInsertingLabel
        : config.messages.imageUploadConfirmLabel;
  };

  /**
   * 绑定弹窗内事件(每次渲染后调用)。
   */
  const bindEvents = (): void => {
    const closeButton = shell.querySelector<HTMLButtonElement>('.zt-md-image-upload-dialog-close');
    closeButton?.addEventListener('click', () => api.close());

    const cancelButton = shell.querySelector<HTMLButtonElement>('.zt-md-image-upload-dialog-cancel');
    cancelButton?.addEventListener('click', () => api.close());

    const confirmButton = shell.querySelector<HTMLButtonElement>('.zt-md-image-upload-dialog-confirm');
    confirmButton?.addEventListener('click', () => {
      void handleConfirm();
    });

    shell.querySelectorAll<HTMLButtonElement>('.zt-md-image-upload-segment').forEach((segment) => {
      segment.addEventListener('click', () => {
        handleUploadTypeChange((segment.dataset.uploadType as ImageUploadType | undefined) ?? 'file');
      });
    });

    // 文件模式:选择文件 + label 拖放。
    fileInput = shell.querySelector<HTMLInputElement>('.zt-md-image-upload-file-input');
    const fileLabel = shell.querySelector<HTMLLabelElement>('.zt-md-image-upload-file-label');
    if (fileInput && fileLabel) {
      fileInput.addEventListener('change', () => {
        const file = fileInput?.files?.[0];
        if (file) {
          void processFile(file);
        }
        if (fileInput) {
          fileInput.value = '';
        }
      });

      fileLabel.addEventListener('click', (clickEvent) => {
        if (isInteractionLocked()) {
          // 阻止锁定态打开文件选择。
          clickEvent.preventDefault();
        }
      });
      fileLabel.addEventListener('dragover', (dragEvent) => {
        dragEvent.preventDefault();
        dragEvent.stopPropagation();
        if (isInteractionLocked()) {
          return;
        }
        if (dragEvent.dataTransfer) {
          dragEvent.dataTransfer.dropEffect = 'copy';
        }
        isDragOver = true;
        fileLabel.dataset.dragOver = 'true';
      });
      fileLabel.addEventListener('dragleave', (dragEvent) => {
        dragEvent.preventDefault();
        dragEvent.stopPropagation();
        if (!fileLabel.contains(dragEvent.relatedTarget as Node | null)) {
          isDragOver = false;
          fileLabel.dataset.dragOver = 'false';
        }
      });
      fileLabel.addEventListener('drop', (dragEvent) => {
        dragEvent.preventDefault();
        dragEvent.stopPropagation();
        isDragOver = false;
        fileLabel.dataset.dragOver = 'false';
        if (isInteractionLocked()) {
          return;
        }
        const file = dragEvent.dataTransfer?.files?.[0];
        if (file) {
          void processFile(file);
        }
      });
    }

    // 链接模式:输入校验 + 预览。
    urlInput = shell.querySelector<HTMLInputElement>('.zt-md-image-upload-url-input');
    urlInput?.addEventListener('input', () => {
      handleUrlChange(urlInput?.value ?? '');
    });

    // 替代文本输入(不触发重绘,直接同步状态)。
    const altInput = shell.querySelector<HTMLInputElement>('.zt-md-image-upload-alt-input');
    altInput?.addEventListener('input', () => {
      altText = altInput.value;
    });
  };

  /**
   * 弹窗内键盘处理(URL 模式 Enter 确认)。
   */
  const handleShellKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && !event.shiftKey && uploadType === 'url') {
      event.preventDefault();
      void handleConfirm();
    }
  };

  // 键盘确认一次性绑定在壳上(URL 模式 Enter 直接确认;壳不重建,不会重复绑定)。
  shell.addEventListener('keydown', handleShellKeyDown);

  /** 弹窗 API。 */
  const api: ImageUploadDialogApi = {
    open: (): void => {
      uploadType = 'file';
      imageUrl = '';
      altText = '';
      previewLoadError = false;
      errorMessage = '';
      isUploading = false;
      isPreparingInsert = false;
      isDragOver = false;
      render();
      overlay.style.display = '';
    },
    close: (): void => {
      overlay.style.display = 'none';
      config.onClose?.();
    },
    setMessages: (messages: EditorI18nMessages) => {
      config.messages = messages;
      render();
    }
  };

  return api;
};
