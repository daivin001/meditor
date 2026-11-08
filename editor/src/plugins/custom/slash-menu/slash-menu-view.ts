/**
 * plugins/custom/slash-menu/slash-menu-view.ts — slash 菜单视图(纯 DOM)
 *
 * 1:1 翻译自 zt-react-milkdown/src/plugins/custom/slash-menu/slash-menu-view.tsx
 * - 原 React 实现改为纯 DOM 渲染,控制器接口与原版一致:
 *   renderIfNeeded / setVisible / isVisible / updatePosition /
 *   updatePositionContext / scrollActiveItemIntoView / destroy / menu
 */
import type { EditorShortcutMode, SlashMenuItem } from '../../../types/editor';
import { resolveSlashMenuShortcutLabels } from '../block-transform';
import { createSharedIcon } from '../../../icons';

/**
 * 菜单定位上下文(内容坐标系 + 展开方向)。
 */
export interface SlashMenuPositionContext {
  /** 编辑器滚动容器。 */
  editorWrapper: HTMLElement;
  /** 锚点顶部(内容坐标)。 */
  anchorTopInContent: number;
  /** 锚点底部(内容坐标)。 */
  anchorBottomInContent: number;
  /** 锚点左侧(内容坐标)。 */
  anchorLeftInContent: number;
  /** 展开方向。 */
  placement: 'top' | 'bottom';
  /** 主轴偏移。 */
  offsetY: number;
}

/** 菜单根类名。 */
const MENU_CLASS = 'slash-menu';
/** 菜单项类名。 */
const ITEM_CLASS = `${MENU_CLASS}-item`;
/** 菜单项选中态 dataset 键。 */
const ITEM_SELECTED_DATA_KEY = 'selected';
/** 菜单最大高度(px),用于 top 展开时的高度计算。 */
const MENU_MAX_HEIGHT = 320;

/**
 * 渲染项时写入的 dataset 键。
 */
const COMMAND_DATA_KEY = 'command';

/**
 * 创建 slash 菜单视图控制器(纯 DOM)。
 *
 * @param portalContainer 菜单挂载宿主。
 * @param shortcutMode 快捷键展示模式。
 */
export const createSlashMenuViewController = (
  portalContainer: HTMLElement,
  shortcutMode: EditorShortcutMode
) => {
  /** 菜单根元素。 */
  const menu = document.createElement('div');
  menu.className = MENU_CLASS;
  menu.style.display = 'none';
  // listbox 语义(项为 role="option" + aria-selected)。
  menu.setAttribute('role', 'listbox');
  // 菜单挂到 portal 层(absolute inset:0),不影响编辑器文档流。
  portalContainer.appendChild(menu);

  /** 当前平台 slash 菜单快捷键文案。 */
  const shortcutLabels = resolveSlashMenuShortcutLabels(shortcutMode);

  /** 上一次渲染的项集合(引用比较决定是否重渲染)。 */
  let lastRenderedItems: SlashMenuItem[] | null = null;
  /** 上一次渲染的激活索引。 */
  let lastRenderedIndex = -1;
  /** 当前定位上下文。 */
  let positionContext: SlashMenuPositionContext | null = null;
  /** 当前可见性。 */
  let visible = false;

  /**
   * 按 group 顺序渲染整表。
   */
  const renderAll = (items: SlashMenuItem[], activeIndex: number): void => {
    menu.innerHTML = '';
    if (items.length === 0) {
      return;
    }
    // 当前分组名(用于插入分组标题)。
    let lastGroup = '';
    items.forEach((item, index) => {
      // 分组名变化时插入分组标题。
      if (item.group !== lastGroup) {
        lastGroup = item.group;
        // 分组标题。
        const groupEl = document.createElement('div');
        groupEl.className = `${MENU_CLASS}-group`;
        groupEl.textContent = item.group;
        menu.appendChild(groupEl);
      }

      // 菜单项。
      const itemEl = document.createElement('div');
      itemEl.className = ITEM_CLASS;
      itemEl.dataset[COMMAND_DATA_KEY] = item.command;
      itemEl.dataset[ITEM_SELECTED_DATA_KEY] = index === activeIndex ? 'true' : 'false';
      // listbox/option 语义:键盘与读屏一致。
      itemEl.setAttribute('role', 'option');
      itemEl.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');
      // 图标(共享图标库,未知键回退 paragraph)。
      itemEl.appendChild(createSharedIcon(item.icon ?? 'paragraph', { size: 16, strokeWidth: 2, className: `${ITEM_CLASS}-icon` }));
      // 文案。
      const label = document.createElement('span');
      label.className = `${ITEM_CLASS}-label`;
      label.textContent = item.label;
      itemEl.appendChild(label);
      // 快捷键提示。
      const shortcutLabel = shortcutLabels[item.command];
      if (shortcutLabel) {
        const shortcut = document.createElement('kbd');
        shortcut.className = `${ITEM_CLASS}-shortcut`;
        shortcut.textContent = shortcutLabel;
        itemEl.appendChild(shortcut);
      }
      menu.appendChild(itemEl);
    });
    // 整表重建即新列表(重新打开/过滤词变化):滚动归零。Chrome 对同步重建的
    // 滚动容器会保留 scrollTop(新内容仍可滚时不自动回顶),必须显式清零,
    // 否则菜单重开后停留在上次的滚动位置。
    menu.scrollTop = 0;
  };

  /**
   * 仅同步激活态(不重建 DOM;aria-selected 与 data-selected 同步)。
   */
  const syncActive = (activeIndex: number): void => {
    const items = menu.querySelectorAll<HTMLElement>(`.${ITEM_CLASS}`);
    items.forEach((el, index) => {
      el.dataset[ITEM_SELECTED_DATA_KEY] = index === activeIndex ? 'true' : 'false';
      el.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');
    });
  };

  /**
   * 计算菜单在 portal 层内的 absolute 坐标。
   */
  const computePosition = (): void => {
    if (!positionContext || !visible) {
      return;
    }

    const { editorWrapper, anchorTopInContent, anchorBottomInContent, anchorLeftInContent, placement, offsetY } = positionContext;
    // Portal 层视口矩形。
    const portalRect = portalContainer.getBoundingClientRect();
    // 滚动容器视口矩形。
    const wrapperRect = editorWrapper.getBoundingClientRect();

    // 菜单 left:锚点 left(内容坐标)→ 视口 → portal 内坐标,并 clamp 在容器内。
    const leftInViewport = wrapperRect.left + anchorLeftInContent - editorWrapper.scrollLeft;
    // 菜单实际宽度(内容自适应,兜底 210)。
    const menuWidth = menu.offsetWidth || 210;
    const maxLeft = portalRect.width - menuWidth - 8;
    const left = Math.min(Math.max(leftInViewport - portalRect.left, 8), Math.max(8, maxLeft));

    // 菜单 top:bottom 展开在锚点下方,top 展开在锚点上方(按菜单真实高度贴锚点——
    // 过滤后短列表用常量会让底边悬空,菜单视觉上飘离斜杠;offsetHeight 已含 CSS
    // max-height 320 截断,取不到时回退常量)。
    const menuHeight = menu.offsetHeight || MENU_MAX_HEIGHT;
    const topInViewport =
      placement === 'top'
        ? wrapperRect.top + anchorTopInContent - editorWrapper.scrollTop - menuHeight - offsetY
        : wrapperRect.top + anchorBottomInContent - editorWrapper.scrollTop + offsetY;
    const top = topInViewport - portalRect.top;

    menu.style.left = `${left}px`;
    menu.style.top = `${Math.max(top, 8)}px`;
  };

  /**
   * 渲染(按需重建 DOM 或仅同步激活态)。
   */
  const renderIfNeeded = (items: SlashMenuItem[], activeIndex: number): void => {
    if (lastRenderedItems !== items) {
      lastRenderedItems = items;
      lastRenderedIndex = activeIndex;
      renderAll(items, activeIndex);
      return;
    }
    if (lastRenderedIndex !== activeIndex) {
      lastRenderedIndex = activeIndex;
      syncActive(activeIndex);
    }
  };

  /**
   * 显示/隐藏菜单。
   */
  const setVisible = (next: boolean, afterShown?: () => void): void => {
    visible = next;
    if (next) {
      menu.style.display = 'block';
      // display:none 期间对 scrollTop 赋值不生效(无盒无布局),显示后再归零一次,
      // 保证重开必从列表顶部开始;随后 afterShown 的激活项滚动按 index 0 仍停在顶部。
      menu.scrollTop = 0;
      computePosition();
      afterShown?.();
    } else {
      menu.style.display = 'none';
      lastRenderedItems = null;
      lastRenderedIndex = -1;
    }
  };

  /**
   * 当前是否可见。
   */
  const isVisible = (): boolean => visible;

  /**
   * 刷新定位。
   */
  const updatePosition = (): void => {
    computePosition();
  };

  /**
   * 更新定位上下文。
   */
  const updatePositionContext = (ctx: SlashMenuPositionContext | null): void => {
    positionContext = ctx;
  };

  /**
   * 将激活项滚动到可视区。
   */
  const scrollActiveItemIntoView = (afterScroll?: () => void): void => {
    // 当前激活项。
    const activeEl = menu.querySelector(`.${ITEM_CLASS}[data-selected="true"]`) as HTMLElement | null;
    // scrollIntoViewIfNeeded 为非标准 API(Chromium),带能力检测。
    const withIfNeeded = activeEl as (HTMLElement & { scrollIntoViewIfNeeded?: (center?: boolean) => void }) | null;
    if (withIfNeeded && typeof withIfNeeded.scrollIntoViewIfNeeded === 'function') {
      withIfNeeded.scrollIntoViewIfNeeded(false);
    } else {
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
    afterScroll?.();
  };

  /**
   * 销毁视图。
   */
  const destroy = (): void => {
    menu.remove();
  };

  return {
    menu,
    renderIfNeeded,
    setVisible,
    isVisible,
    updatePosition,
    updatePositionContext,
    scrollActiveItemIntoView,
    destroy
  };
};
