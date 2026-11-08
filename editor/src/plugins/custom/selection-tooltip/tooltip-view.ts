/**
 * plugins/custom/selection-tooltip/tooltip-view.ts — 选区工具栏视图(纯 DOM)
 *
 * 1:1 翻译自 zt-react-milkdown/src/plugins/custom/selection-tooltip/tooltip-view.tsx
 * - React 组件改为命令式 DOM 控制器,接口语义一致:
 *   createSelectionTooltipElement / createBlockTransformControl /
 *   createLinkControl / updateSelectionTooltipActiveState /
 *   createSelectionTooltipShouldShow
 */
import { TextSelection } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import { normalizeSafeUrl } from '../../../utils/security';
import { toContentAnchor } from '../../../lib/editor-overlay-position';
import { createFloatingPortalPanel } from '../floating-portal-panel';
import { runBlockTransformCommand } from '../block-transform';
import {
  SELECTION_TOOLTIP_ICON_SIZE,
  SELECTION_TOOLTIP_ICON_STROKE_WIDTH
} from './constants';
import { createSharedIcon } from '../../../icons';
import {
  isEditorViewEditable,
  isMarkActive,
  resolveMarkType,
  resolveSelectedLinkHref,
  runSelectionTooltipCommand
} from './mark-logic';
import type {
  BlockTransformPopoverControlOptions,
  LinkPopoverControlOptions,
  SelectionTooltipItem
} from './types';
import type { BlockTransformCommand } from '../../../types/editor';

/**
 * 创建选区菜单按钮。
 */
const createSelectionTooltipButton = (
  item: SelectionTooltipItem,
  markType: ReturnType<typeof resolveMarkType>,
  getCurrentView: () => EditorView | null,
  toggleLinkPopover: (view: EditorView) => void
): HTMLButtonElement => {
  // 菜单按钮节点。
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'zt-md-selection-tooltip-button';
  button.dataset.command = item.command;
  button.title = item.title;
  button.setAttribute('aria-label', item.title);
  button.append(createSharedIcon(item.icon, { size: SELECTION_TOOLTIP_ICON_SIZE, strokeWidth: SELECTION_TOOLTIP_ICON_STROKE_WIDTH, className: 'zt-md-selection-tooltip-icon-host' }));
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
  button.addEventListener('click', (event) => {
    event.preventDefault();
    // 当前编辑器视图。
    const currentView = getCurrentView();
    if (!currentView || currentView.state.selection.empty || !markType) {
      return;
    }

    runSelectionTooltipCommand(item.command, {
      view: currentView,
      markType,
      toggleLinkPopover
    });
  });

  return button;
};

/**
 * 创建选区菜单 DOM。
 */
export const createSelectionTooltipElement = (
  view: EditorView,
  items: SelectionTooltipItem[],
  getCurrentView: () => EditorView | null,
  toggleLinkPopover: (view: EditorView) => void
): HTMLDivElement => {
  // 菜单容器节点。
  const tooltip = document.createElement('div');
  tooltip.className = 'zt-md-selection-tooltip';

  items.forEach((item) => {
    // 当前菜单项 mark 类型。
    const markType = resolveMarkType(view, item.markNames);
    if (!markType) {
      return;
    }

    if (item.command === 'link') {
      return;
    }

    tooltip.append(createSelectionTooltipButton(item, markType, getCurrentView, toggleLinkPopover));
  });

  return tooltip;
};

/**
 * 块级转换 Popover 控制器(替代 BlockTransformPopoverControl 组件)。
 */
export const createBlockTransformControl = (options: BlockTransformPopoverControlOptions) => {
  const { portalContainer, collisionBoundary, menuTitle, items, onOpenChange, getCurrentView } = options;

  /** 触发按钮宿主。 */
  const host = document.createElement('span');
  /** 菜单浮层容器。 */
  const panelElement = document.createElement('div');
  panelElement.className = 'zt-md-selection-transform-popover';
  panelElement.style.display = 'none';

  /** 面板标题。 */
  const title = document.createElement('p');
  title.className = 'zt-md-selection-transform-popover-title';
  title.textContent = menuTitle;
  panelElement.appendChild(title);

  /** 菜单项列表容器。 */
  const list = document.createElement('div');
  list.className = 'zt-md-selection-transform-popover-list';
  items.forEach((item) => {
    // 菜单项按钮。
    const itemButton = document.createElement('button');
    itemButton.type = 'button';
    itemButton.className = 'zt-md-selection-transform-item';
    itemButton.dataset.command = item.command;
    itemButton.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });
    itemButton.addEventListener('click', (event) => {
      event.preventDefault();
      // 当前编辑器视图。
      const view = getCurrentView();
      if (!view || view.state.selection.empty) {
        onOpenChange(false);
        return;
      }

      runBlockTransformCommand(view, item.command);
      onOpenChange(false);
      view.focus();
    });
    // 图标。
    itemButton.append(
      createSharedIcon(item.icon, { size: SELECTION_TOOLTIP_ICON_SIZE, strokeWidth: SELECTION_TOOLTIP_ICON_STROKE_WIDTH, className: 'zt-md-selection-tooltip-icon-host' })
    );
    // 文案。
    const label = document.createElement('span');
    label.className = 'zt-md-selection-transform-item-label';
    label.textContent = item.label;
    itemButton.appendChild(label);
    // 快捷键。
    const shortcut = document.createElement('kbd');
    shortcut.className = 'zt-md-selection-transform-item-shortcut';
    shortcut.textContent = item.shortcut;
    itemButton.appendChild(shortcut);
    list.appendChild(itemButton);
  });
  panelElement.appendChild(list);

  /** 触发按钮。 */
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'zt-md-selection-transform-trigger';
  trigger.setAttribute('aria-label', menuTitle);
  trigger.setAttribute('aria-expanded', 'false');
  trigger.title = menuTitle;
  /** 触发按钮文案。 */
  const triggerLabel = document.createElement('span');
  triggerLabel.className = 'zt-md-selection-transform-trigger-label';
  trigger.appendChild(triggerLabel);
  trigger.appendChild(createSharedIcon('chevronDown', { size: SELECTION_TOOLTIP_ICON_SIZE, strokeWidth: SELECTION_TOOLTIP_ICON_STROKE_WIDTH, className: 'zt-md-selection-tooltip-icon-host' }));
  trigger.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    // 切换展开状态。
    onOpenChange(!options.isOpen());
  });
  host.appendChild(trigger);

  /** 浮层定位控制器。 */
  const panel = createFloatingPortalPanel({
    panelElement,
    portalContainer,
    wrapper: collisionBoundary ?? portalContainer,
    anchor: { anchorTopInContent: 0, anchorBottomInContent: 0, anchorLeftInContent: 0 },
    // resize 重定位时按触发钮实时矩形重锚(回流后触发钮会移位,静态锚点会钉在旧坐标)。
    resolveAnchor: () => {
      const wrapper = collisionBoundary ?? portalContainer;
      return toContentAnchor(trigger.getBoundingClientRect(), wrapper);
    },
    width: 224,
    height: undefined,
    placement: 'bottom',
    offsetY: 8,
    boundaryInset: 8
  });

  /** 文档外点监听(命中 trigger/panel 之外时收起)。 */
  const handleDocumentMouseDown = (event: MouseEvent): void => {
    if (!options.isOpen()) {
      return;
    }
    // 点击目标。
    const target = event.target as Node | null;
    if (host.contains(target) || panelElement.contains(target)) {
      return;
    }

    onOpenChange(false);
  };
  document.addEventListener('mousedown', handleDocumentMouseDown, true);

  /**
   * 按 anchor 触发按钮刷新浮层位置。
   */
  const reposition = (): void => {
    // 触发按钮视口矩形。
    const triggerRect = trigger.getBoundingClientRect();
    // 碰撞边界容器。
    const wrapper = collisionBoundary ?? portalContainer;
    // 内容坐标锚点。
    const anchor = toContentAnchor(triggerRect, wrapper);
    panel.update({
      wrapper,
      anchor,
      placement: 'bottom'
    });
  };

  return {
    host,
    trigger,
    panelElement,
    /**
     * 刷新控件状态(展开态 + 激活命令高亮 + 按钮文案)。
     */
    refresh: (activeCommand: BlockTransformCommand): void => {
      // 当前激活菜单项。
      const activeItem = items.find((item) => item.command === activeCommand) ?? items[0];
      triggerLabel.textContent = activeItem?.label ?? menuTitle;
      trigger.setAttribute('aria-expanded', options.isOpen() ? 'true' : 'false');
      // 菜单项激活高亮由 index 在 update 时以 activeCommands 传入刷新。
    },
    /**
     * 刷新菜单项激活高亮。
     */
    refreshActiveCommands: (activeCommands: ReadonlySet<BlockTransformCommand>): void => {
      list.querySelectorAll('.zt-md-selection-transform-item').forEach((el) => {
        // 菜单项按钮。
        const itemEl = el as HTMLElement;
        itemEl.dataset.active = activeCommands.has(itemEl.dataset.command as BlockTransformCommand) ? 'true' : 'false';
      });
    },
    /**
     * 展开浮层(先定位再显示)。
     */
    openPanel: (): void => {
      reposition();
      panelElement.style.display = 'block';
    },
    /**
     * 收起浮层。
     */
    closePanel: (): void => {
      panelElement.style.display = 'none';
    },
    /**
     * 销毁控制器。
     */
    destroy: (): void => {
      document.removeEventListener('mousedown', handleDocumentMouseDown, true);
      panel.destroy();
      host.remove();
    }
  };
};

/**
 * 链接编辑 Popover 控制器(替代 LinkPopoverControl 组件)。
 */
export const createLinkControl = (options: LinkPopoverControlOptions) => {
  const { portalContainer, collisionBoundary, iconSize, iconStrokeWidth, onOpenChange, messages, getCurrentView } = options;

  /** 触发按钮宿主。 */
  const host = document.createElement('span');
  /** 面板容器。 */
  const panelElement = document.createElement('div');
  panelElement.className = 'zt-md-selection-link-popover';
  panelElement.style.display = 'none';

  /** 面板行容器。 */
  const row = document.createElement('div');
  row.className = 'zt-md-selection-link-popover-row';

  /** 链接输入框。 */
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = messages.selectionLinkInputPlaceholder;
  input.className = 'zt-md-selection-link-popover-input';

  /** 确认按钮。 */
  const commitButton = document.createElement('button');
  commitButton.type = 'button';
  commitButton.className = 'zt-md-selection-link-popover-action';
  commitButton.setAttribute('aria-label', messages.selectionLinkSaveAriaLabel);
  commitButton.appendChild(createSharedIcon('correct', { size: iconSize, strokeWidth: iconStrokeWidth, className: 'zt-md-selection-tooltip-icon-host' }));

  /** 移除按钮。 */
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'zt-md-selection-link-popover-action zt-md-selection-link-popover-action-danger';
  removeButton.setAttribute('aria-label', messages.selectionLinkRemoveAriaLabel);
  removeButton.appendChild(createSharedIcon('trash', { size: iconSize, strokeWidth: iconStrokeWidth, className: 'zt-md-selection-tooltip-icon-host' }));

  /** 格式非法错误提示(输入框下方;不占位隐藏)。 */
  const errorHint = document.createElement('div');
  errorHint.className = 'zt-md-selection-link-popover-error';
  errorHint.textContent = messages.selectionLinkInvalidUrl ?? '';
  errorHint.hidden = true;

  row.appendChild(input);
  row.appendChild(commitButton);
  row.appendChild(removeButton);
  panelElement.appendChild(row);
  panelElement.appendChild(errorHint);

  /** 触发按钮。 */
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'zt-md-selection-tooltip-button';
  trigger.dataset.command = 'link';
  trigger.title = messages.selectionTooltipLinkTitle;
  trigger.setAttribute('aria-label', messages.selectionTooltipLinkTitle);
  trigger.setAttribute('aria-expanded', 'false');
  // 触发按钮图标(与工具栏其它图标按钮同源,避免空白)。
  trigger.appendChild(createSharedIcon('link', { size: iconSize, strokeWidth: iconStrokeWidth, className: 'zt-md-selection-tooltip-icon-host' }));
  trigger.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    // 切换展开态(关闭走 handleOpenChange 校验)。
    if (options.isOpen()) {
      onOpenChange(false);
      return;
    }
    handleOpen(true);
  });
  host.appendChild(trigger);

  /**
   * 提交链接修改(三态:href 为空 = 移除链接;非空但非法 = 不动文档仅提示;合法 = 落库)。
   */
  const commitLink = (href: string): void => {
    // 当前编辑器视图。
    const view = getCurrentView();
    if (!view || view.state.selection.empty) {
      onOpenChange(false);
      return;
    }

    // 链接 mark 类型。
    const linkType = resolveMarkType(view, ['link']);
    if (!linkType) {
      onOpenChange(false);
      return;
    }

    // 用户主动清空输入 → 移除链接。
    if (href === '') {
      errorHint.hidden = true;
      // 当前选区范围。
      const { from, to } = view.state.selection;
      view.dispatch(view.state.tr.removeMark(from, to, linkType).scrollIntoView());
      onOpenChange(false);
      view.focus();
      return;
    }

    // 归一化后的安全链接地址。
    const safeHref = normalizeSafeUrl(href);
    // 非空但非法:不执行任何事务,弹窗不关闭,原链接不动,仅提示。
    if (!safeHref) {
      errorHint.hidden = messages.selectionLinkInvalidUrl === undefined;
      return;
    }

    errorHint.hidden = true;
    // 当前选区范围。
    const { from, to } = view.state.selection;
    // 链接更新事务。
    const transaction = view.state.tr.addMark(from, to, linkType.create({ href: safeHref }));

    view.dispatch(transaction.scrollIntoView());
    onOpenChange(false);
    view.focus();
  };

  /**
   * 打开前的状态校验与回填。
   */
  const handleOpen = (nextOpen: boolean): void => {
    if (!nextOpen) {
      onOpenChange(false);
      return;
    }

    // 当前编辑器视图。
    const view = getCurrentView();
    // 链接 mark 类型。
    const linkType = view ? resolveMarkType(view, ['link']) : null;
    if (!view || !linkType || view.state.selection.empty) {
      onOpenChange(false);
      return;
    }

    input.value = normalizeSafeUrl(resolveSelectedLinkHref(view.state, linkType));
    // 每次打开清掉上次的非法提示。
    errorHint.hidden = true;
    onOpenChange(true);
  };

  commitButton.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
  commitButton.addEventListener('click', (event) => {
    event.preventDefault();
    commitLink(input.value.trim());
  });
  removeButton.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
  removeButton.addEventListener('click', (event) => {
    event.preventDefault();
    commitLink('');
  });
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    commitLink(input.value.trim());
  });

  /** 浮层定位控制器。 */
  const panel = createFloatingPortalPanel({
    panelElement,
    portalContainer,
    wrapper: collisionBoundary ?? portalContainer,
    anchor: { anchorTopInContent: 0, anchorBottomInContent: 0, anchorLeftInContent: 0 },
    // resize 重定位时按触发钮实时矩形重锚(回流后触发钮会移位,静态锚点会钉在旧坐标)。
    resolveAnchor: () => {
      const wrapper = collisionBoundary ?? portalContainer;
      return toContentAnchor(trigger.getBoundingClientRect(), wrapper);
    },
    width: 266,
    height: undefined,
    placement: 'bottom',
    horizontalAlign: 'center',
    offsetY: 8,
    boundaryInset: 8
  });

  /** 文档外点监听。 */
  const handleDocumentMouseDown = (event: MouseEvent): void => {
    if (!options.isOpen()) {
      return;
    }
    // 点击目标。
    const target = event.target as Node | null;
    if (host.contains(target) || panelElement.contains(target)) {
      return;
    }

    onOpenChange(false);
  };
  document.addEventListener('mousedown', handleDocumentMouseDown, true);

  return {
    host,
    trigger,
    panelElement,
    /**
     * 刷新展开态。
     */
    refresh: (): void => {
      trigger.setAttribute('aria-expanded', options.isOpen() ? 'true' : 'false');
    },
    /**
     * 展开浮层(先定位再显示并聚焦输入框)。
     */
    openPanel: (): void => {
      // 触发按钮视口矩形。
      const triggerRect = trigger.getBoundingClientRect();
      // 碰撞边界容器。
      const wrapper = collisionBoundary ?? portalContainer;
      panel.update({
        wrapper,
        anchor: toContentAnchor(triggerRect, wrapper),
        placement: 'bottom'
      });
      panelElement.style.display = 'block';
      input.focus();
    },
    /**
     * 收起浮层。
     */
    closePanel: (): void => {
      panelElement.style.display = 'none';
    },
    /**
     * 销毁控制器。
     */
    destroy: (): void => {
      document.removeEventListener('mousedown', handleDocumentMouseDown, true);
      panel.destroy();
      host.remove();
    }
  };
};

/**
 * 刷新菜单按钮激活态。
 */
export const updateSelectionTooltipActiveState = (
  tooltip: HTMLElement,
  view: EditorView,
  items: SelectionTooltipItem[]
): void => {
  items.forEach((item) => {
    // 当前菜单项 mark 类型。
    const markType = resolveMarkType(view, item.markNames);
    if (!markType) {
      return;
    }

    // 当前按钮节点。
    const button = tooltip.querySelector(`[data-command="${item.command}"]`);
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    button.dataset.active = isMarkActive(view.state, markType) ? 'true' : 'false';
  });
};

/**
 * 判断当前选区是否涉及代码块节点。
 */
const hasCodeBlockInSelection = (view: EditorView): boolean => {
  // 当前选区范围。
  const { from, to } = view.state.selection;
  // 是否命中代码块节点。
  let matchedCodeBlock = false;

  view.state.doc.nodesBetween(from, to, (node) => {
    if (node.type.name !== 'code_block') {
      return true;
    }

    matchedCodeBlock = true;
    return false;
  });

  return matchedCodeBlock;
};

/**
 * 创建 tooltip 展示判断函数。
 */
export const createSelectionTooltipShouldShow = (
  tooltip: HTMLElement,
  isPinned: () => boolean,
  isBlockTransformOpen: () => boolean
): ((view: EditorView) => boolean) => {
  /**
   * 判断 tooltip 是否应该展示。
   */
  return (view: EditorView): boolean => {
    // 当前选区。
    const { selection, doc } = view.state;
    // 当前焦点是否位于菜单内。
    const isTooltipFocused = tooltip.contains(document.activeElement);
    if (!isEditorViewEditable(view) || selection.empty || !(selection instanceof TextSelection)) {
      return false;
    }

    if (!view.hasFocus() && !isTooltipFocused && !isPinned() && !isBlockTransformOpen()) {
      return false;
    }

    if (hasCodeBlockInSelection(view)) {
      return false;
    }

    return tooltip.childElementCount > 0 && doc.textBetween(selection.from, selection.to).trim().length > 0;
  };
};
