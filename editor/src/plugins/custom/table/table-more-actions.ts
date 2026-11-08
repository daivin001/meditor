/**
 * plugins/custom/table/table-more-actions.ts — 表格"更多"操作菜单(纯 DOM)
 *
 * 1:1 翻译自 zt-react-milkdown/src/plugins/custom/table/table-more-actions.tsx
 * - React 组件改为命令式 DOM 控制器
 */
import type { EditorI18nMessages } from '../../../types/editor';
import { toContentAnchor } from '../../../lib/editor-overlay-position';
import { createFloatingPortalPanel } from '../floating-portal-panel';
import { createSharedIcon } from '../../../icons';

/**
 * 构建内联 SVG 图标 markup(lucide 风格线条)。
 */
const buildIconMarkup = (paths: string): string => {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
  );
};
// 竖向省略号图标。
const ELLIPSIS_MARKUP = buildIconMarkup(
  '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>'
);

/**
 * 表格更多菜单控制器创建参数。
 */
export interface TableMoreActionsOptions {
  /** 编辑器文案。 */
  messages: EditorI18nMessages;
  /** Popover Portal 挂载容器。 */
  portalContainer?: HTMLElement | null;
  /** Popover 碰撞边界,通常为编辑器滚动容器。 */
  collisionBoundary?: HTMLElement | null;
  /** 是否允许在当前行上方插入行。 */
  canInsertRowAbove: () => boolean;
  /** 是否允许在当前列附近插入列。 */
  canInsertColumn: () => boolean;
  /** 是否允许删除当前行。 */
  canDeleteRow: () => boolean;
  /** 是否允许删除当前列。 */
  canDeleteColumn: () => boolean;
  /** 当前选区是否可合并单元格。 */
  canMergeCells: () => boolean;
  /** 当前选区是否可拆分单元格。 */
  canSplitCell: () => boolean;
  /** 合并选区单元格回调。 */
  onMergeCells: () => void;
  /** 拆分当前单元格回调。 */
  onSplitCell: () => void;
  /** 插入上方行回调。 */
  onInsertRowAbove: () => void;
  /** 插入下方行回调。 */
  onInsertRowBelow: () => void;
  /** 插入左侧列回调。 */
  onInsertColumnLeft: () => void;
  /** 插入右侧列回调。 */
  onInsertColumnRight: () => void;
  /** 删除当前行回调。 */
  onDeleteRow: () => void;
  /** 删除当前列回调。 */
  onDeleteColumn: () => void;
}

/**
 * 创建表格"更多"操作菜单控制器(纯 DOM)。
 */
export const createTableMoreActions = (options: TableMoreActionsOptions) => {
  const { messages, portalContainer, collisionBoundary } = options;

  /** 触发按钮。 */
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'zt-md-table-action-button';
  trigger.setAttribute('aria-label', messages.tableMoreAriaLabel);
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = ELLIPSIS_MARKUP;

  /** 菜单浮层容器。 */
  const panelElement = document.createElement('div');
  panelElement.className = 'zt-md-table-action-popover';

  /**
   * 创建菜单项按钮(图标 + 文案,图标与动作一一对应)。
   */
  const createMenuItem = (
    label: string,
    icon: string,
    danger: boolean,
    isDisabled: () => boolean,
    onRun: () => void
  ): HTMLButtonElement => {
    // 菜单项按钮。
    const item = document.createElement('button');
    item.type = 'button';
    item.className =
      `zt-md-table-action-menu-item${danger ? ' zt-md-table-action-menu-item-danger' : ''}`;
    // 左侧图标(匹配动作,非通用图标)。
    item.appendChild(
      createSharedIcon(icon, { size: 16, strokeWidth: 2, className: 'zt-md-table-action-menu-item-icon' })
    );
    // 右侧文案。
    const labelEl = document.createElement('span');
    labelEl.className = 'zt-md-table-action-menu-item-label';
    labelEl.textContent = label;
    item.appendChild(labelEl);
    item.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });
    item.addEventListener('click', (event) => {
      event.preventDefault();
      if (isDisabled()) {
        return;
      }

      onRun();
      setOpen(false);
    });
    return item;
  };

  /** 上方插入行菜单项。 */
  const insertRowAboveItem = createMenuItem(
    messages.tableInsertRowAboveLabel,
    'insertRowAbove',
    false,
    () => !options.canInsertRowAbove(),
    options.onInsertRowAbove
  );
  /** 下方插入行菜单项。 */
  const insertRowBelowItem = createMenuItem(
    messages.tableInsertRowBelowLabel,
    'insertRowBelow',
    false,
    () => false,
    options.onInsertRowBelow
  );
  /** 左侧插入列菜单项。 */
  const insertColumnLeftItem = createMenuItem(
    messages.tableInsertColumnLeftLabel,
    'insertColumnLeft',
    false,
    () => !options.canInsertColumn(),
    options.onInsertColumnLeft
  );
  /** 右侧插入列菜单项。 */
  const insertColumnRightItem = createMenuItem(
    messages.tableInsertColumnRightLabel,
    'insertColumnRight',
    false,
    () => !options.canInsertColumn(),
    options.onInsertColumnRight
  );
  /** 删除行菜单项。 */
  const deleteRowItem = createMenuItem(
    messages.tableDeleteRowLabel,
    'deleteRow',
    true,
    () => !options.canDeleteRow(),
    options.onDeleteRow
  );
  /** 删除列菜单项。 */
  const deleteColumnItem = createMenuItem(
    messages.tableDeleteColumnLabel,
    'deleteColumn',
    true,
    () => !options.canDeleteColumn(),
    options.onDeleteColumn
  );

  /** 合并单元格菜单项。 */
  const mergeCellsItem = createMenuItem(
    messages.tableMergeCellsLabel,
    'mergeCells',
    false,
    () => !options.canMergeCells(),
    options.onMergeCells
  );
  /** 拆分单元格菜单项。 */
  const splitCellItem = createMenuItem(
    messages.tableSplitCellLabel,
    'splitCells',
    false,
    () => !options.canSplitCell(),
    options.onSplitCell
  );

  /** 第一组(合并/拆分)。 */
  const mergeGroup = document.createElement('div');
  mergeGroup.className = 'zt-md-table-action-menu-group';
  mergeGroup.append(mergeCellsItem, splitCellItem);
  /** 第二组(插入)。 */
  const insertGroup = document.createElement('div');
  insertGroup.className = 'zt-md-table-action-menu-group';
  insertGroup.append(insertRowAboveItem, insertRowBelowItem, insertColumnLeftItem, insertColumnRightItem);
  /** 分隔线。 */
  const divider = document.createElement('div');
  divider.className = 'zt-md-table-action-menu-divider';
  divider.setAttribute('aria-hidden', 'true');
  /** 第三组(删除)。 */
  const deleteGroup = document.createElement('div');
  deleteGroup.className = 'zt-md-table-action-menu-group';
  deleteGroup.append(deleteRowItem, deleteColumnItem);
  panelElement.append(mergeGroup, insertGroup, divider, deleteGroup);

  /** 当前展开状态。 */
  let isOpen = false;

  /** 浮层定位控制器。 */
  const panel = createFloatingPortalPanel({
    panelElement,
    portalContainer: portalContainer ?? document.body,
    wrapper: collisionBoundary ?? portalContainer ?? document.body,
    anchor: { anchorTopInContent: 0, anchorBottomInContent: 0, anchorLeftInContent: 0 },
    // resize 重定位时按触发钮实时矩形重锚(回流后触发钮会移位,静态锚点会钉在旧坐标)。
    resolveAnchor: () => {
      const wrapper = collisionBoundary ?? portalContainer ?? document.body;
      return toContentAnchor(trigger.getBoundingClientRect(), wrapper);
    },
    width: 168,
    placement: 'bottom',
    horizontalAlign: 'end',
    offsetY: 6,
    boundaryInset: 8
  });

  /** 文档外点监听。 */
  const handleDocumentMouseDown = (event: MouseEvent): void => {
    if (!isOpen) {
      return;
    }
    // 点击目标。
    const target = event.target as Node | null;
    if (trigger.contains(target) || panelElement.contains(target)) {
      return;
    }

    setOpen(false);
  };
  document.addEventListener('mousedown', handleDocumentMouseDown, true);

  /**
   * 切换展开态。
   */
  const setOpen = (nextOpen: boolean): void => {
    isOpen = nextOpen;
    trigger.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    if (nextOpen) {
      // 触发按钮内容坐标锚点。
      const triggerRect = trigger.getBoundingClientRect();
      const wrapper = collisionBoundary ?? portalContainer ?? document.body;
      panel.update({
        wrapper,
        anchor: toContentAnchor(triggerRect, wrapper),
        placement: 'bottom'
      });
      panelElement.style.display = 'block';
    } else {
      panelElement.style.display = 'none';
    }
  };

  trigger.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    setOpen(!isOpen);
  });

  return {
    trigger,
    panelElement,
    /** 当前是否展开。 */
    isOpen: () => isOpen,
    /** 强制收起。 */
    close: (): void => setOpen(false),
    /** 销毁。 */
    destroy: (): void => {
      document.removeEventListener('mousedown', handleDocumentMouseDown, true);
      panel.destroy();
      panelElement.remove();
    }
  };
};
