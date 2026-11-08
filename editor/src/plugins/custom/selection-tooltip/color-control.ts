/**
 * plugins/custom/selection-tooltip/color-control.ts — 颜色/高亮 Popover 控制器
 *
 * 与 createLinkControl 同款交互模式:触发按钮 + 浮层色板
 * (createFloatingPortalPanel 定位、文档外点收起、应用后保持选区并回焦编辑器)。
 */
import type { MarkType } from '@milkdown/prose/model';
import type { EditorView } from '@milkdown/prose/view';
import { toContentAnchor } from '../../../lib/editor-overlay-position';
import { createFloatingPortalPanel } from '../floating-portal-panel';
import { createSharedIcon } from '../../../icons';
import type { EditorI18nMessages } from '../../../types/editor';
import {
  applyInlineColorMark,
  INLINE_HIGHLIGHT_COLOR_OPTIONS,
  INLINE_TEXT_COLOR_OPTIONS,
  resolveSelectedInlineColor,
  type InlineColorKind
} from '../color';
import { SELECTION_TOOLTIP_ICON_SIZE, SELECTION_TOOLTIP_ICON_STROKE_WIDTH } from './constants';

/**
 * 颜色选项(调色板项,label 经 messages 取文案)。
 */
interface InlineColorOptionLike {
  /** 文案键名(指向 EditorI18nMessages)。 */
  messageKey: string;
  /** 颜色值(hex)。 */
  value: string;
}

/**
 * 颜色 Popover 控制器创建参数。
 */
export interface ColorPopoverControlOptions {
  /** 控件种类:文字颜色 / 高亮背景。 */
  kind: InlineColorKind;
  /** 目标 mark 类型(schema 注册后必有)。 */
  markType: MarkType;
  /** 编辑器视图引用读取函数。 */
  getCurrentView: () => EditorView | null;
  /** Popover Portal 挂载容器。 */
  portalContainer: HTMLElement;
  /** Popover 碰撞边界,通常为编辑器滚动容器。 */
  collisionBoundary: HTMLElement | null;
  /** 弹层展开状态回调。 */
  onOpenChange: (nextOpen: boolean) => void;
  /** 当前弹层展开状态读取函数。 */
  isOpen: () => boolean;
  /** 编辑器文案。 */
  messages: EditorI18nMessages;
}

/**
 * 解析调色板选项文案。
 */
const resolveOptionLabel = (messages: EditorI18nMessages, option: InlineColorOptionLike): string => {
  // 文案表(按键名取当前语言文案)。
  const table = messages as unknown as Record<string, string>;
  return table[option.messageKey] ?? option.value;
};

/**
 * 创建颜色/高亮 Popover 控制器。
 */
export const createColorControl = (options: ColorPopoverControlOptions) => {
  const { kind, markType, getCurrentView, portalContainer, collisionBoundary, onOpenChange, isOpen, messages } = options;
  /** 触发按钮标题。 */
  const triggerTitle = kind === 'highlight' ? messages.selectionTooltipHighlightTitle : messages.selectionTooltipColorTitle;
  /** 调色板选项。 */
  const palette: readonly InlineColorOptionLike[] =
    kind === 'highlight' ? INLINE_HIGHLIGHT_COLOR_OPTIONS : INLINE_TEXT_COLOR_OPTIONS;

  /** 触发按钮宿主。 */
  const host = document.createElement('span');
  /** 面板容器。 */
  const panelElement = document.createElement('div');
  panelElement.className = 'zt-md-selection-color-popover';
  panelElement.style.display = 'none';

  /** 色板网格。 */
  const grid = document.createElement('div');
  grid.className = 'zt-md-selection-color-grid';
  /** 当前颜色值 → 色块按钮映射(刷新激活态用)。 */
  const swatchByColor = new Map<string, HTMLButtonElement>();

  palette.forEach((option) => {
    // 色块按钮。
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'zt-md-selection-color-swatch';
    swatch.dataset.color = option.value;
    swatch.title = resolveOptionLabel(messages, option);
    swatch.setAttribute('aria-label', `${triggerTitle}: ${swatch.title}`);
    swatch.style.setProperty('--zt-swatch-color', option.value);
    swatch.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });
    swatch.addEventListener('click', (event) => {
      event.preventDefault();
      // 当前编辑器视图。
      const view = getCurrentView();
      if (!view || view.state.selection.empty) {
        onOpenChange(false);
        return;
      }
      applyInlineColorMark(view, markType, option.value);
      onOpenChange(false);
    });
    swatchByColor.set(option.value, swatch);
    grid.appendChild(swatch);
  });
  panelElement.appendChild(grid);

  /** 恢复默认按钮。 */
  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'zt-md-selection-color-reset';
  resetButton.textContent = messages.colorDefaultLabel;
  resetButton.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
  resetButton.addEventListener('click', (event) => {
    event.preventDefault();
    // 当前编辑器视图。
    const view = getCurrentView();
    if (!view || view.state.selection.empty) {
      onOpenChange(false);
      return;
    }
    applyInlineColorMark(view, markType, null);
    onOpenChange(false);
  });
  panelElement.appendChild(resetButton);

  /** 触发按钮。 */
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'zt-md-selection-tooltip-button';
  trigger.dataset.command = kind;
  trigger.title = triggerTitle;
  trigger.setAttribute('aria-label', triggerTitle);
  trigger.setAttribute('aria-expanded', 'false');
  // 触发按钮图标(文字颜色控件支持随当前颜色着色)。
  const triggerIcon = createSharedIcon(kind === 'highlight' ? 'highlight' : 'textColor', {
    size: SELECTION_TOOLTIP_ICON_SIZE,
    strokeWidth: SELECTION_TOOLTIP_ICON_STROKE_WIDTH,
    className: 'zt-md-selection-tooltip-icon-host'
  });
  trigger.appendChild(triggerIcon);
  trigger.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    // 切换展开态。
    onOpenChange(!isOpen());
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
    width: 132,
    height: undefined,
    placement: 'bottom',
    horizontalAlign: 'center',
    offsetY: 8,
    boundaryInset: 8
  });

  /** 文档外点监听(命中 trigger/panel 之外时收起)。 */
  const handleDocumentMouseDown = (event: MouseEvent): void => {
    if (!isOpen()) {
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
   * 刷新激活态:触发按钮 + 色块高亮 + 文字颜色图标着色。
   */
  const refreshActiveState = (): void => {
    // 当前编辑器视图。
    const view = getCurrentView();
    // 选区内当前颜色值。
    const activeColor = view ? resolveSelectedInlineColor(view.state, markType) : null;
    trigger.dataset.active = activeColor ? 'true' : 'false';
    triggerIcon.style.color =
      kind === 'color' && activeColor ? activeColor : '';
    swatchByColor.forEach((swatch, value) => {
      swatch.dataset.active = value === activeColor ? 'true' : 'false';
    });
  };

  return {
    host,
    trigger,
    panelElement,
    /**
     * 刷新展开态与激活态。
     */
    refresh: (): void => {
      trigger.setAttribute('aria-expanded', isOpen() ? 'true' : 'false');
      refreshActiveState();
    },
    /**
     * 展开浮层(先定位再显示)。
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

export type ColorControl = ReturnType<typeof createColorControl>;
