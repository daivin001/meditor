/**
 * plugins/custom/selection-tooltip/index.ts — 选区工具栏主插件
 *
 * 1:1 翻译自 zt-react-milkdown/src/plugins/custom/selection-tooltip/index.ts
 * - React 渲染改为纯 DOM 控制器(createBlockTransformControl / createLinkControl)
 */
import { TooltipProvider } from '@milkdown/plugin-tooltip';
import { Plugin, PluginKey, type PluginView } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import { $prose } from '@milkdown/utils';
import type {
  BlockTransformCommand,
  EditorI18nMessages,
  EditorShortcutMode,
} from '../../../types/editor';
import {
  SELECTION_TOOLTIP_ID,
  resolveSelectionBlockTransformItems,
  resolveSelectionTooltipItems,
} from './constants';
import {
  resolveActiveBlockTransformCommands,
  resolveCurrentBlockTransformCommand,
} from '../block-transform';
import { isMarkActive, resolveMarkType } from './mark-logic';
import {
  createBlockTransformControl,
  createLinkControl,
  createSelectionTooltipElement,
  createSelectionTooltipShouldShow,
  updateSelectionTooltipActiveState,
} from './tooltip-view';
import { createColorControl, type ColorControl } from './color-control';
import { createMediaEmbedPrompt, type MediaEmbedPromptControl } from './media-embed-control';
import {
  OPEN_LINK_POPOVER_META,
  OPEN_MEDIA_EMBED_META,
  type MediaEmbedOpenRequest,
} from '../slash-menu/slash-menu-commands';
import { EDITOR_SCROLL_CONTAINER_SELECTOR } from '../../../lib/editor-overlay-position';

/**
 * 创建选区 tooltip 插件视图。
 */
const createSelectionTooltipPluginView = (
  view: EditorView,
  portalContainer: HTMLElement,
  messages: EditorI18nMessages,
  shortcutMode: EditorShortcutMode,
  consumePendingOpenLink: () => boolean,
  consumePendingMediaEmbed: () => MediaEmbedOpenRequest | null,
  scrollContainerSelector?: string,
): PluginView => {
  // 当前语言下的选区菜单项。
  const items = resolveSelectionTooltipItems(messages);
  // 当前语言下的块级转换菜单项。
  const blockTransformItems = resolveSelectionBlockTransformItems(messages, shortcutMode);
  // 当前编辑器视图引用。
  let currentView: EditorView | null = view;
  // 链接 Popover 展开状态。
  let isLinkPopoverOpen = false;
  // 块级转换 Popover 展开状态。
  let isBlockTransformPopoverOpen = false;
  // 文字颜色 Popover 展开状态。
  let isColorPopoverOpen = false;
  // 高亮背景 Popover 展开状态。
  let isHighlightPopoverOpen = false;
  // 插件视图是否已销毁。
  let isDestroyed = false;
  // 内容附属 Popover 碰撞边界(滚动容器选择器可由 createMeditor 选项配置)。
  const collisionBoundary = portalContainer.closest(
    scrollContainerSelector ?? EDITOR_SCROLL_CONTAINER_SELECTOR,
  ) as HTMLElement | null;

  /**
   * 控制链接 Popover 展开状态。
   */
  const setLinkPopoverOpen = (nextOpen: boolean): void => {
    if (isLinkPopoverOpen === nextOpen) {
      return;
    }

    isLinkPopoverOpen = nextOpen;
    if (nextOpen) {
      linkControl.openPanel();
    } else {
      linkControl.closePanel();
    }
    linkControl.refresh();
  };

  /**
   * 控制颜色类 Popover 展开状态(kind: 'color' | 'highlight')。
   */
  const setColorPopoverOpen = (kind: 'color' | 'highlight', nextOpen: boolean): void => {
    // 目标控制器与状态读取器。
    const control = kind === 'highlight' ? highlightControl : colorControl;
    // 当前状态字段引用。
    const stateGetter = kind === 'highlight' ? isHighlightPopoverOpen : isColorPopoverOpen;
    if (!control || stateGetter === nextOpen) {
      return;
    }

    if (kind === 'highlight') {
      isHighlightPopoverOpen = nextOpen;
    } else {
      isColorPopoverOpen = nextOpen;
    }
    if (nextOpen) {
      // 互斥:同排其它弹层一律收起。
      setLinkPopoverOpen(false);
      setBlockTransformPopoverOpen(false);
      control.openPanel();
    } else {
      control.closePanel();
    }
    control.refresh();
  };

  /**
   * 控制块级转换 Popover 展开状态。
   */
  const setBlockTransformPopoverOpen = (nextOpen: boolean): void => {
    if (isBlockTransformPopoverOpen === nextOpen) {
      return;
    }

    isBlockTransformPopoverOpen = nextOpen;
    if (nextOpen) {
      blockControl.openPanel();
    } else {
      blockControl.closePanel();
    }
    renderBlockTransformControl();
  };

  /**
   * 触发链接 Popover 开关。
   */
  const toggleLinkPopover = (nextView: EditorView): void => {
    if (nextView.state.selection.empty) {
      return;
    }

    setLinkPopoverOpen(!isLinkPopoverOpen);
  };

  /**
   * 渲染块级转换控件(同步展开态与按钮文案)。
   */
  const renderBlockTransformControl = (): void => {
    // 当前激活的块级命令。
    const activeCommand = currentView
      ? resolveCurrentBlockTransformCommand(currentView)
      : 'paragraph';
    blockControl.refresh(activeCommand);
    // 当前激活的块级命令集合。
    const activeCommands = currentView
      ? resolveActiveBlockTransformCommands(currentView)
      : new Set<BlockTransformCommand>(['paragraph']);
    blockControl.refreshActiveCommands(activeCommands);
  };

  // 块级转换 Popover 控制器。
  const blockControl = createBlockTransformControl({
    getCurrentView: () => currentView,
    portalContainer,
    collisionBoundary,
    iconSize: 14,
    iconStrokeWidth: 2,
    menuTitle: messages.selectionTooltipTransformLabel,
    items: blockTransformItems,
    onOpenChange: setBlockTransformPopoverOpen,
    isOpen: () => isBlockTransformPopoverOpen,
  });

  // 链接 Popover 控制器。
  const linkControl = createLinkControl({
    getCurrentView: () => currentView,
    portalContainer,
    collisionBoundary,
    iconSize: 14,
    iconStrokeWidth: 2,
    onOpenChange: setLinkPopoverOpen,
    messages,
    isOpen: () => isLinkPopoverOpen,
  });

  // 媒体嵌入 URL 输入浮层(slash「视频/音频/书签/内嵌」经 meta 触发;面板常驻 portal 默认隐藏,open 显示/close 隐藏)。
  const mediaEmbedPrompt: MediaEmbedPromptControl = createMediaEmbedPrompt({
    portalContainer,
    collisionBoundary,
    messages,
    getView: () => currentView,
  });

  // 文字颜色 mark 类型(schema 注册后存在;未注册时不挂控件)。
  const colorMarkType = resolveMarkType(view, ['color']);
  // 高亮背景 mark 类型。
  const highlightMarkType = resolveMarkType(view, ['highlight']);

  // 文字颜色 Popover 控制器。
  const colorControl: ColorControl | null = colorMarkType
    ? createColorControl({
        kind: 'color',
        markType: colorMarkType,
        getCurrentView: () => currentView,
        portalContainer,
        collisionBoundary,
        onOpenChange: (nextOpen) => setColorPopoverOpen('color', nextOpen),
        isOpen: () => isColorPopoverOpen,
        messages,
      })
    : null;

  // 高亮背景 Popover 控制器。
  const highlightControl: ColorControl | null = highlightMarkType
    ? createColorControl({
        kind: 'highlight',
        markType: highlightMarkType,
        getCurrentView: () => currentView,
        portalContainer,
        collisionBoundary,
        onOpenChange: (nextOpen) => setColorPopoverOpen('highlight', nextOpen),
        isOpen: () => isHighlightPopoverOpen,
        messages,
      })
    : null;

  // 选区菜单 DOM。
  const tooltip = createSelectionTooltipElement(view, items, () => currentView, toggleLinkPopover);
  tooltip.prepend(blockControl.host);
  if (colorControl) {
    tooltip.append(colorControl.host);
  }
  if (highlightControl) {
    tooltip.append(highlightControl.host);
  }
  if (resolveMarkType(view, ['link'])) {
    tooltip.append(linkControl.host);
  }
  // 选区菜单展示判断函数。
  const shouldShowSelectionTooltip = createSelectionTooltipShouldShow(
    tooltip,
    () => isLinkPopoverOpen,
    () => isBlockTransformPopoverOpen,
  );
  // tooltip 浮层提供器。
  const provider = new TooltipProvider({
    content: tooltip,
    debounce: 80,
    offset: 8,
    root: portalContainer,
    shouldShow: shouldShowSelectionTooltip,
    floatingUIOptions: {
      placement: 'top',
    },
  });

  /**
   * 挂载选区菜单 DOM。
   */
  const mountSelectionTooltip = (): void => {
    if (tooltip.parentElement) {
      return;
    }

    portalContainer.appendChild(tooltip);
  };

  /**
   * 卸载选区菜单 DOM。
   */
  const unmountSelectionTooltip = (): void => {
    tooltip.remove();
  };

  provider.onHide = unmountSelectionTooltip;

  /**
   * 隐藏选区菜单与附属 Popover。
   */
  const hideSelectionTooltip = (): void => {
    setLinkPopoverOpen(false);
    setBlockTransformPopoverOpen(false);
    setColorPopoverOpen('color', false);
    setColorPopoverOpen('highlight', false);
    provider.hide();
    unmountSelectionTooltip();
  };

  /**
   * 判断节点是否位于选区菜单交互区域内。
   */
  const isSelectionTooltipTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof Node)) {
      return false;
    }

    return (
      Boolean(currentView?.dom.contains(target)) ||
      tooltip.contains(target) ||
      portalContainer.contains(target)
    );
  };

  /**
   * 处理编辑器失焦后的菜单隐藏。
   */
  const handleEditorBlur = (): void => {
    requestAnimationFrame(() => {
      if (isDestroyed) {
        return;
      }

      if (isSelectionTooltipTarget(document.activeElement)) {
        return;
      }

      hideSelectionTooltip();
    });
  };

  /**
   * 处理文档外部点击后的菜单隐藏。
   */
  const handleDocumentMouseDown = (event: MouseEvent): void => {
    if (isSelectionTooltipTarget(event.target)) {
      return;
    }

    hideSelectionTooltip();
  };

  /**
   * 处理 Escape:任一附属弹层展开时收起全部(选区保留)。
   */
  const handleEditorKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') {
      return;
    }
    if (
      !isLinkPopoverOpen &&
      !isBlockTransformPopoverOpen &&
      !isColorPopoverOpen &&
      !isHighlightPopoverOpen
    ) {
      return;
    }
    event.stopPropagation();
    setLinkPopoverOpen(false);
    setBlockTransformPopoverOpen(false);
    setColorPopoverOpen('color', false);
    setColorPopoverOpen('highlight', false);
  };

  view.dom.addEventListener('blur', handleEditorBlur);
  view.dom.addEventListener('keydown', handleEditorKeyDown, true);
  document.addEventListener('mousedown', handleDocumentMouseDown, true);

  return {
    update: (nextView, previousState) => {
      currentView = nextView as EditorView;
      if (currentView.state.selection.empty) {
        setLinkPopoverOpen(false);
        setBlockTransformPopoverOpen(false);
        setColorPopoverOpen('color', false);
        setColorPopoverOpen('highlight', false);
      }
      updateSelectionTooltipActiveState(tooltip, currentView, items);
      renderBlockTransformControl();
      // 当前链接触发按钮(在链接控件宿主内)。
      const linkTriggerButton = linkControl.trigger;
      // 链接 mark 类型。
      const linkType = resolveMarkType(currentView, ['link']);
      linkTriggerButton.dataset.active =
        linkType && isMarkActive(currentView.state, linkType) ? 'true' : 'false';
      // 颜色/高亮触发按钮激活态与色块高亮。
      colorControl?.refresh();
      highlightControl?.refresh();
      // 媒体嵌入插入请求:必须在选区工具栏显隐判断之前消费——
      // slash 删除查询词后选区为空,shouldShow 为 false 会提前 return,
      // meta 若延后消费会变成"下次选区变化时的陈旧触发"(浮窗乱入)。
      const pendingMediaKind = consumePendingMediaEmbed();
      if (pendingMediaKind) {
        requestAnimationFrame(() => mediaEmbedPrompt.open(pendingMediaKind));
      }
      if (!shouldShowSelectionTooltip(currentView)) {
        provider.hide();
        unmountSelectionTooltip();
        return;
      }

      mountSelectionTooltip();
      provider.update(currentView, previousState);
      // 若 slash 菜单刚插入链接占位文本并请求弹层,待选区工具栏布局完成后自动打开。
      if (consumePendingOpenLink()) {
        requestAnimationFrame(() => setLinkPopoverOpen(true));
      }
    },
    destroy: () => {
      isDestroyed = true;
      currentView = null;
      view.dom.removeEventListener('blur', handleEditorBlur);
      view.dom.removeEventListener('keydown', handleEditorKeyDown, true);
      document.removeEventListener('mousedown', handleDocumentMouseDown, true);
      blockControl.destroy();
      linkControl.destroy();
      colorControl?.destroy();
      highlightControl?.destroy();
      mediaEmbedPrompt.destroy();
      provider.destroy();
      tooltip.remove();
    },
  };
};

/**
 * 创建选区 tooltip 菜单插件。
 */
export const createSelectionTooltipPlugin = (
  portalContainer: HTMLElement,
  messages: EditorI18nMessages,
  shortcutMode: EditorShortcutMode,
  /** 编辑区滚动容器选择器(缺省 meditor 自带类名,行为不变)。 */
  scrollContainerSelector?: string,
): ReturnType<typeof $prose> => {
  return $prose(() => {
    // 加号/slash 菜单插入链接后,经事务 meta 请求自动弹出链接编辑框;此标志在 state.apply 置位、view.update 消费。
    let pendingOpenLink = false;
    // slash 菜单/悬停编辑按钮请求媒体嵌入 URL 浮层的待处理请求(插入或编辑)。
    let pendingMediaEmbed: MediaEmbedOpenRequest | null = null;

    return new Plugin({
      key: new PluginKey(SELECTION_TOOLTIP_ID),
      state: {
        init: () => false,
        apply: (tr) => {
          if (tr.getMeta(OPEN_LINK_POPOVER_META)) {
            pendingOpenLink = true;
          }
          // 媒体嵌入浮层请求(插入或编辑模式)。
          const mediaMeta = tr.getMeta(OPEN_MEDIA_EMBED_META) as MediaEmbedOpenRequest | undefined;
          if (
            mediaMeta &&
            typeof mediaMeta.kind === 'string' &&
            typeof mediaMeta.editPos === 'number'
          ) {
            pendingMediaEmbed = mediaMeta;
          } else if (mediaMeta && typeof mediaMeta.kind === 'string') {
            pendingMediaEmbed = { kind: mediaMeta.kind };
          }
          return false;
        },
      },
      view: (view) =>
        createSelectionTooltipPluginView(
          view as EditorView,
          portalContainer,
          messages,
          shortcutMode,
          () => {
            const value = pendingOpenLink;
            pendingOpenLink = false;
            return value;
          },
          () => {
            const kind = pendingMediaEmbed;
            pendingMediaEmbed = null;
            return kind;
          },
          scrollContainerSelector,
        ),
    });
  });
};
