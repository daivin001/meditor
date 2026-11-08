/**
 * plugins/custom/selection-tooltip/media-embed-control.ts — 媒体嵌入 URL 输入浮层
 *
 * 与 createLinkControl 同款交互:输入 URL → 确认/Enter → 插入对应 media_embed 节点。
 * 由 slash 菜单经事务 meta(OPEN_MEDIA_EMBED_META)触发;携带 editPos 时进入编辑模式
 * (回填当前地址,确认后原地更新节点 src,供媒体块悬停编辑按钮复用)。
 * 布局:标题在上、输入行在下(独立样式,不复用链接弹层的横排类)。
 * 生命周期:与颜色/链接/块转换弹层同款——面板常驻 portal 但 display:none 起始,
 * open() 定位后显示,close()(提交/Esc/外点)即隐藏;刷新/重建后不可见、无残留。
 * (不可用外层 host 包裹: floating-portal-panel 构造时会把 panelElement 挂到
 * portal,host 永远为空,外点判断与显隐都会失真。)
 */
import type { EditorView } from '@milkdown/prose/view';
import { toContentAnchor } from '../../../lib/editor-overlay-position';
import { createFloatingPortalPanel } from '../floating-portal-panel';
import type { EditorI18nMessages } from '../../../types/editor';
import { normalizeSafeUrl } from '../../../utils/security';
import type {
  MediaEmbedKind,
  MediaEmbedOpenRequest
} from '../slash-menu/slash-menu-commands';

/**
 * 媒体 URL 输入浮层控制器。
 */
export interface MediaEmbedPromptControl {
  /** 打开浮层(插入模式传 { kind };编辑模式携带 editPos/editSrc)。 */
  open: (request: MediaEmbedOpenRequest) => void;
  /** 销毁。 */
  destroy: () => void;
}

/**
 * 创建媒体 URL 输入浮层。
 */
export const createMediaEmbedPrompt = (options: {
  portalContainer: HTMLElement;
  collisionBoundary: HTMLElement | null;
  messages: EditorI18nMessages;
  getView: () => EditorView | null;
}): MediaEmbedPromptControl => {
  const { portalContainer, collisionBoundary, messages, getView } = options;
  /** 当前请求(种类 + 可选编辑目标)。 */
  let pendingRequest: MediaEmbedOpenRequest = { kind: 'video' };
  /** 是否已打开(外点关闭与重复 open 的判据)。 */
  let isMounted = false;

  /** 面板容器(标题 + 输入行 + 错误提示,垂直布局;常驻 portal,默认隐藏)。 */
  const panelElement = document.createElement('div');
  panelElement.className = 'zt-md-media-embed-panel';
  panelElement.style.display = 'none';

  /** 标题。 */
  const title = document.createElement('p');
  title.className = 'zt-md-media-embed-panel-title';

  /** 输入行。 */
  const row = document.createElement('div');
  row.className = 'zt-md-media-embed-panel-row';

  /** URL 输入框。 */
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'zt-md-media-embed-panel-input';
  input.spellcheck = false;

  /** 确定按钮(蓝色主按钮)。 */
  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'zt-md-media-embed-panel-confirm';

  /** 错误提示(URL 无效时显示)。 */
  const errorHint = document.createElement('p');
  errorHint.className = 'zt-md-media-embed-panel-error';
  errorHint.textContent = messages.mediaEmbedUrlInvalid;
  errorHint.style.display = 'none';

  row.append(input, confirmButton);
  panelElement.append(title, row, errorHint);

  /** 最近一次打开的锚定信息(实时重锚用):编辑模式记节点位置,插入模式跟随当前选区。 */
  let lastAnchor: { editMode: boolean; editPos?: number } | null = null;

  /** 浮层定位控制器(构造一次,open 时更新位置)。 */
  const panel = createFloatingPortalPanel({
    panelElement,
    portalContainer,
    wrapper: collisionBoundary ?? portalContainer,
    anchor: { anchorTopInContent: 0, anchorBottomInContent: 0, anchorLeftInContent: 0 },
    // resize 重定位时按锚定位置实时重取坐标(回流后锚点会移位,静态锚点会钉在旧坐标)。
    resolveAnchor: () => {
      if (!lastAnchor) {
        return null;
      }
      const wrapper = collisionBoundary ?? portalContainer;
      const view = getView();
      const anchorPos = lastAnchor.editMode ? lastAnchor.editPos : view?.state.selection.from;
      if (!view || typeof anchorPos !== 'number') {
        return null;
      }
      try {
        const coords = view.coordsAtPos(Math.min(anchorPos, view.state.doc.content.size));
        return toContentAnchor(
          new DOMRect(coords.left, coords.top, Math.max(coords.right - coords.left, 1), coords.bottom - coords.top),
          wrapper
        );
      } catch {
        return null;
      }
    },
    width: 380,
    height: undefined,
    placement: 'bottom',
    horizontalAlign: 'start',
    offsetY: 8,
    boundaryInset: 8
  });

  /**
   * 显示/隐藏 URL 无效提示(同时切换输入框错误描边)。
   */
  const showError = (visible: boolean): void => {
    errorHint.style.display = visible ? 'block' : 'none';
    input.classList.toggle('zt-md-media-embed-panel-input-invalid', visible);
  };

  /**
   * 确认:解析 URL → 插入新节点(插入模式)或原地更新 src(编辑模式)→ 关闭。
   * URL 归一化失败(协议白名单外)时不关闭并提示,防止存入非法地址后
   * 序列化-再解析退化为普通 HTML 文本。
   */
  const commit = (): void => {
    // 当前编辑器视图。
    const view = getView();
    // 归一化后的地址。
    const src = normalizeSafeUrl(input.value.trim());
    if (!view || src === '') {
      showError(true);
      input.focus();
      return;
    }
    // 目标节点类型。
    const nodeType = view.state.schema.nodes?.media_embed;
    if (!nodeType) {
      close();
      return;
    }

    // 编辑模式:原地更新目标节点 src(保留其余属性,含已调高度)。
    const editPos = pendingRequest.editPos;
    if (typeof editPos === 'number') {
      // 目标节点(可能已被协同/撤销移除)。
      const targetNode = view.state.doc.nodeAt(editPos);
      if (targetNode?.type.name !== 'media_embed') {
        close();
        return;
      }
      view.dispatch(view.state.tr.setNodeMarkup(editPos, undefined, { ...targetNode.attrs, src }));
      view.focus();
      close();
      return;
    }

    // 插入模式。
    const mediaNode = nodeType.create({ kind: pendingRequest.kind, src });
    view.dispatch(view.state.tr.replaceSelectionWith(mediaNode).scrollIntoView());
    view.focus();
    close();
  };

  /**
   * 关闭浮层(隐藏面板并清空输入与错误态;面板常驻 portal,与兄弟弹层同款)。
   */
  const close = (): void => {
    if (!isMounted) {
      return;
    }
    isMounted = false;
    input.value = '';
    showError(false);
    panelElement.style.display = 'none';
  };

  /** 确定按钮文案(i18n 在 open 时填)。 */
  let confirmLabel = 'OK';

  confirmButton.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
  confirmButton.addEventListener('click', (event) => {
    event.preventDefault();
    commit();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });
  // 输入即清除错误态。
  input.addEventListener('input', () => {
    showError(false);
  });
  // 外部点击关闭(点击面板自身不关)。
  const handleDocumentMouseDown = (event: MouseEvent): void => {
    if (!isMounted) {
      return;
    }
    // 点击目标。
    const target = event.target as Node | null;
    if (panelElement.contains(target)) {
      return;
    }
    close();
  };
  document.addEventListener('mousedown', handleDocumentMouseDown, true);

  return {
    /**
     * 打开浮层:锚定光标(编辑模式锚定目标节点) + 聚焦输入框。
     */
    open: (request: MediaEmbedOpenRequest) => {
        pendingRequest = request;
      // 标题/按钮文案(插入与编辑两套,按种类取 i18n)。
      const insertTitleTable: Record<MediaEmbedKind, string> = {
        video: messages.mediaEmbedVideoTitle,
        audio: messages.mediaEmbedAudioTitle,
        bookmark: messages.mediaEmbedBookmarkTitle,
        embed: messages.mediaEmbedEmbedTitle
      };
      const editTitleTable: Record<MediaEmbedKind, string> = {
        video: messages.mediaEmbedEditVideoTitle,
        audio: messages.mediaEmbedEditAudioTitle,
        bookmark: messages.mediaEmbedEditBookmarkTitle,
        embed: messages.mediaEmbedEditEmbedTitle
      };
      // 是否编辑模式。
      const isEditMode = typeof request.editPos === 'number';
      title.textContent = isEditMode ? editTitleTable[request.kind] : insertTitleTable[request.kind];
      input.placeholder = messages.mediaEmbedUrlPlaceholder;
      confirmLabel = isEditMode ? messages.mediaEmbedSaveLabel : messages.mediaEmbedConfirmLabel;
      confirmButton.textContent = confirmLabel;
      // 编辑模式回填当前地址。
      input.value = isEditMode ? (request.editSrc ?? '') : '';
      showError(false);

      // 重复 open 先收起,保证单实例。
      close();
      isMounted = true;

      // 记录锚定信息供 resize 实时重锚(编辑模式=节点位置,插入模式跟随选区)。
      lastAnchor = { editMode: isEditMode, editPos: isEditMode ? (request.editPos as number) : undefined };

      // 定位:编辑模式锚定目标节点(coordsAtPos),插入模式锚定光标,均 fallback 容器顶部中心。
      const view = getView();
      const wrapper = collisionBoundary ?? portalContainer;
      let anchorRect: DOMRect = wrapper.getBoundingClientRect();
      if (view) {
        // 锚定位置(编辑模式为目标节点起点,否则当前选区)。
        const anchorPos = isEditMode ? (request.editPos as number) : view.state.selection.from;
        try {
          // 锚点屏幕坐标。
          const coords = view.coordsAtPos(Math.min(anchorPos, view.state.doc.content.size));
          anchorRect = DOMRect.fromRect({
            x: coords.left,
            y: coords.top,
            width: 0,
            height: Math.max(1, coords.bottom - coords.top)
          });
        } catch {
          // 位置越界等瞬态:回退容器锚点。
        }
      }
      panel.update({
        wrapper,
        anchor: toContentAnchor(anchorRect, wrapper),
        placement: 'bottom'
      });
      panelElement.style.display = 'block';
      input.focus();
    },
    /**
     * 销毁。
     */
    destroy: () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown, true);
      isMounted = false;
      panel.destroy();
    }
  };
};
