/**
 * plugins/custom/toolbar/toolbar-view.ts — 工具栏视图(纯 DOM)
 *
 * 负责工具栏 DOM 构建、激活态刷新与块转换下拉面板开合;
 * 插件生命周期(toolbar.ts)负责事务订阅与命令分发。
 */
import type { BlockTransformCommand, EditorI18nMessages, EditorShortcutMode, ToolbarCommand, ToolbarItem } from '../../../types/editor';
import { createSharedIcon } from '../../../icons';
import { resolveActiveBlockTransformCommands, resolveCurrentBlockTransformCommand } from '../block-transform';
import { isToolbarCommandActive } from './toolbar-commands';
import { resolveSelectionBlockTransformItems } from '../selection-tooltip/constants';
import {
  TOOLBAR_COMMAND_GROUP_MAP,
  TOOLBAR_COMMAND_ICON_MAP,
  TOOLBAR_ICON_SIZE,
  TOOLBAR_ICON_STROKE_WIDTH,
  resolveToolbarCollapseRank,
  resolveToolbarCommandTitleMap
} from './toolbar-constants';

/** 工具栏根类名。 */
const TOOLBAR_CLASS = 'zt-md-toolbar';
/** 分隔线类名。 */
const DIVIDER_CLASS = `${TOOLBAR_CLASS}-divider`;
/** 按钮类名。 */
const BUTTON_CLASS = `${TOOLBAR_CLASS}-button`;
/** 块转换触发钮类名。 */
const BLOCK_TRIGGER_CLASS = `${TOOLBAR_CLASS}-block-trigger`;
/** 下拉面板类名。 */
const DROPDOWN_CLASS = `${TOOLBAR_CLASS}-dropdown`;
/** 响应式收起态类名(宽度不足时按优先级隐藏低频按钮,保证始终单行)。 */
const COLLAPSED_CLASS = `${TOOLBAR_CLASS}-collapsed`;

/**
 * 工具栏视图控制器创建参数。
 */
export interface ToolbarViewOptions {
  /** 编辑器文案。 */
  messages: EditorI18nMessages;
  /** 快捷键展示模式(块转换下拉的快捷键文案)。 */
  shortcutMode: EditorShortcutMode;
  /** 工具栏项配置。 */
  items: ToolbarItem[];
  /** 命令点击回调(返回 false 时不下拉收起等后续处理由调用方定);附带触发按钮元素供锚定浮层。 */
  onCommand: (command: ToolbarCommand, anchorEl?: HTMLElement) => void;
}

/**
 * 创建工具栏视图控制器。
 */
export const createToolbarViewController = (options: ToolbarViewOptions) => {
  const { messages, shortcutMode, items } = options;
  // 命令标题映射表。
  const titleMap = resolveToolbarCommandTitleMap(messages);

  /** 工具栏根元素。 */
  const root = document.createElement('div');
  root.className = TOOLBAR_CLASS;

  /** 块转换触发钮文案节点(展示当前块类型)。 */
  const blockTriggerLabel = document.createElement('span');
  blockTriggerLabel.className = `${BLOCK_TRIGGER_CLASS}-label`;

  /** 块转换下拉面板。 */
  const blockDropdown = document.createElement('div');
  blockDropdown.className = DROPDOWN_CLASS;
  blockDropdown.style.display = 'none';

  /** 当前展开的下拉所属命令(仅 blockTransform 使用)。 */
  let openDropdownCommand: ToolbarCommand | null = null;
  /** 块转换触发钮引用(forEach 内创建后赋值)。 */
  let blockTriggerEl: HTMLButtonElement | null = null;
  /** 下拉键盘高亮索引(-1 = 未激活)。 */
  let dropdownActiveIndex = -1;

  /** 块转换菜单项集合(构建后填充;用于键盘导航与执行)。 */
  const blockTransformItemButtons: HTMLButtonElement[] = [];

  /** 翻译模式状态(active = 翻译视图生效;loading = 翻译请求进行中)。 */
  let translateMode = { active: false, loading: false };
  /** 翻译失败提示的恢复定时器。 */
  let translateFailedTimer: ReturnType<typeof setTimeout> | null = null;
  /** 翻译按钮常规标题(失败提示展示后恢复用)。 */
  const translateDefaultTitle = titleMap.translate;
  /** 布局模式状态(active = 布局块显隐/编辑模式生效)。 */
  let layoutModeActive = false;
  /** 布局按钮常规标题(激活后切退出文案用)。 */
  const layoutModeDefaultTitle = titleMap.layoutMode;
  /** 源码模式状态(active = 整篇源码文本编辑生效)。 */
  let sourceModeActive = false;
  /** 源码按钮常规标题(激活后切退出文案用)。 */
  const sourceModeDefaultTitle = titleMap.sourceMode;
  /** 大纲面板展开态(active = 内容右侧大纲面板展开)。 */
  let outlineActive = false;
  /** 大纲按钮常规标题(展开后切收起文案用)。 */
  const outlineDefaultTitle = titleMap.outline;
  /** AI 会话框展开态(active = 底部 AI 会话框展开)。 */
  let aiActive = false;
  /** AI 按钮常规标题(展开后切收起文案用)。 */
  const aiDefaultTitle = titleMap.ai;

  /**
   * 取翻译按钮(按 items 渲染,未配置时为 null)。
   */
  const findTranslateButton = (): HTMLButtonElement | null =>
    root.querySelector<HTMLButtonElement>('button[data-command="translate"]');

  /**
   * 应用翻译模式禁用态:翻译视图/请求进行中时除翻译按钮外全部禁用。
   */
  const applyTranslateDisabled = (): void => {
    const lockAll = translateMode.active || translateMode.loading;
    root.querySelectorAll<HTMLButtonElement>('button[data-command]').forEach((button) => {
      if (button.dataset.command === 'translate') {
        // 请求进行中禁用翻译按钮防重复点击;翻译视图下保持可点以便切回。
        button.disabled = translateMode.loading;
        return;
      }
      button.disabled = lockAll;
    });
  };

  /**
   * 设置翻译模式状态(按钮禁用/高亮/标题随动;由 meditor 翻译编排层调用)。
   */
  const setTranslateMode = (mode: { active: boolean; loading: boolean; failed?: boolean }): void => {
    translateMode = { active: mode.active, loading: mode.loading };
    closeDropdown();
    applyTranslateDisabled();

    const button = findTranslateButton();
    if (!button) {
      return;
    }
    button.dataset.active = mode.active ? 'true' : 'false';
    button.dataset.loading = mode.loading ? 'true' : 'false';
    button.setAttribute('aria-pressed', mode.active ? 'true' : 'false');
    if (translateFailedTimer !== null) {
      clearTimeout(translateFailedTimer);
      translateFailedTimer = null;
    }
    if (mode.failed) {
      // 失败提示短暂展示后自动恢复常规标题。
      button.title = messages.toolbarTranslateFailedTitle;
      button.setAttribute('aria-label', button.title);
      translateFailedTimer = setTimeout(() => {
        translateFailedTimer = null;
        button.title = translateMode.active ? messages.toolbarTranslateExitTitle : translateDefaultTitle;
        button.setAttribute('aria-label', button.title);
      }, 2600);
      return;
    }
    button.title = mode.active ? messages.toolbarTranslateExitTitle : translateDefaultTitle;
    button.setAttribute('aria-label', button.title);
  };

  /**
   * 取布局模式按钮(按 items 渲染,未配置时为 null)。
   */
  const findLayoutModeButton = (): HTMLButtonElement | null =>
    root.querySelector<HTMLButtonElement>('button[data-command="layoutMode"]');

  /**
   * 设置布局模式状态(按钮高亮/标题随动;由 meditor 布局编排层调用)。
   */
  const setLayoutMode = (mode: { active: boolean }): void => {
    layoutModeActive = mode.active;

    const button = findLayoutModeButton();
    if (!button) {
      return;
    }
    button.dataset.active = mode.active ? 'true' : 'false';
    button.setAttribute('aria-pressed', mode.active ? 'true' : 'false');
    button.title = mode.active ? messages.toolbarLayoutModeExitTitle : layoutModeDefaultTitle;
    button.setAttribute('aria-label', button.title);
  };

  /**
   * 取源码模式按钮(按 items 渲染,未配置时为 null)。
   */
  const findSourceModeButton = (): HTMLButtonElement | null =>
    root.querySelector<HTMLButtonElement>('button[data-command="sourceMode"]');

  /**
   * 应用源码模式禁用态:源码模式命令作用于源码文本框,富文本层按钮全部禁用
   * (格式/撤销等在隐藏的 ProseMirror 上执行会与文本框内容脱节)。
   */
  const applySourceModeDisabled = (): void => {
    root.querySelectorAll<HTMLButtonElement>('button[data-command]').forEach((button) => {
      if (button.dataset.command === 'sourceMode') {
        return;
      }
      button.disabled = sourceModeActive;
    });
  };

  /**
   * 设置源码模式状态(按钮禁用/高亮/标题随动;由 meditor 源码编排层调用)。
   */
  const setSourceMode = (mode: { active: boolean }): void => {
    sourceModeActive = mode.active;
    closeDropdown();
    applySourceModeDisabled();

    const button = findSourceModeButton();
    if (!button) {
      return;
    }
    button.dataset.active = mode.active ? 'true' : 'false';
    button.setAttribute('aria-pressed', mode.active ? 'true' : 'false');
    button.title = mode.active ? messages.toolbarSourceModeExitTitle : sourceModeDefaultTitle;
    button.setAttribute('aria-label', button.title);
  };

  /**
   * 取大纲按钮(按 items 渲染,未配置时为 null)。
   */
  const findOutlineButton = (): HTMLButtonElement | null =>
    root.querySelector<HTMLButtonElement>('button[data-command="outline"]');

  /**
   * 设置大纲面板展开态(按钮高亮/标题随动;由 meditor 大纲编排层调用)。
   */
  const setOutlineMode = (mode: { active: boolean }): void => {
    outlineActive = mode.active;

    const button = findOutlineButton();
    if (!button) {
      return;
    }
    button.dataset.active = mode.active ? 'true' : 'false';
    button.setAttribute('aria-pressed', mode.active ? 'true' : 'false');
    button.title = mode.active ? messages.toolbarOutlineExitTitle : outlineDefaultTitle;
    button.setAttribute('aria-label', button.title);
  };

  /**
   * 取 AI 按钮(按 items 渲染,未配置时为 null)。
   */
  const findAiButton = (): HTMLButtonElement | null =>
    root.querySelector<HTMLButtonElement>('button[data-command="ai"]');

  /**
   * 设置 AI 会话框展开态(按钮高亮/标题随动;由 meditor AI 编排层调用)。
   */
  const setAiMode = (mode: { active: boolean }): void => {
    aiActive = mode.active;

    const button = findAiButton();
    if (!button) {
      return;
    }
    button.dataset.active = mode.active ? 'true' : 'false';
    button.setAttribute('aria-pressed', mode.active ? 'true' : 'false');
    button.title = mode.active ? messages.toolbarAiExitTitle : aiDefaultTitle;
    button.setAttribute('aria-label', button.title);
  };

  /**
   * 同步下拉键盘高亮(aria-selected + data-keyboard-active)。
   */
  const syncDropdownActive = (): void => {
    blockTransformItemButtons.forEach((button, index) => {
      const active = index === dropdownActiveIndex;
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.dataset.keyboardActive = active ? 'true' : 'false';
    });
  };

  /**
   * 收起下拉面板。
   */
  const closeDropdown = (): void => {
    if (openDropdownCommand === null) {
      return;
    }

    openDropdownCommand = null;
    dropdownActiveIndex = -1;
    blockDropdown.style.display = 'none';
    blockTriggerEl?.setAttribute('aria-expanded', 'false');
  };

  /**
   * 切换指定命令的按钮渲染。
   */
  const appendCommandButton = (item: ToolbarItem): void => {
    // 按钮。
    const button = document.createElement('button');
    button.type = 'button';
    button.className = BUTTON_CLASS;
    button.dataset.command = item.command;
    button.title = item.title ?? titleMap[item.command];
    button.setAttribute('aria-label', button.title);
    button.appendChild(
      createSharedIcon(item.icon ?? TOOLBAR_COMMAND_ICON_MAP[item.command], {
        size: TOOLBAR_ICON_SIZE,
        strokeWidth: TOOLBAR_ICON_STROKE_WIDTH,
        className: `${BUTTON_CLASS}-icon`
      })
    );
    button.addEventListener('mousedown', (event) => {
      // 防止编辑器失焦导致选区丢失。
      event.preventDefault();
    });
    button.addEventListener('click', (event) => {
      event.preventDefault();
      options.onCommand(item.command, button);
    });
    root.appendChild(button);
  };

  /** 上一个渲染项的分组(用于组间插分隔线)。 */
  let lastGroup: string | null = null;

  items.forEach((item) => {
    // 块转换下拉触发钮(带面板)。
    if (item.command === 'blockTransform') {
      // 分组分隔线。
      if (lastGroup !== null && lastGroup !== TOOLBAR_COMMAND_GROUP_MAP.blockTransform) {
        const divider = document.createElement('span');
        divider.className = DIVIDER_CLASS;
        root.appendChild(divider);
      }
      lastGroup = TOOLBAR_COMMAND_GROUP_MAP.blockTransform;

      // 触发钮宿主。
      const blockTrigger = document.createElement('button');
      blockTrigger.type = 'button';
      blockTrigger.className = BLOCK_TRIGGER_CLASS;
      blockTrigger.dataset.command = 'blockTransform';
      blockTrigger.setAttribute('aria-expanded', 'false');
      blockTrigger.title = messages.selectionTooltipTransformLabel;
      blockTrigger.appendChild(blockTriggerLabel);
      blockTrigger.appendChild(
        createSharedIcon('chevronDown', {
          size: 12,
          strokeWidth: 2,
          className: `${BLOCK_TRIGGER_CLASS}-chevron`
        })
      );
      blockTrigger.addEventListener('mousedown', (event) => {
        event.preventDefault();
      });
      blockTrigger.addEventListener('click', (event) => {
        event.preventDefault();
        if (openDropdownCommand === 'blockTransform') {
          closeDropdown();
          blockTrigger.focus();
          return;
        }

        // 定位并展开面板(触发钮正下方)+ 重置键盘高亮;聚焦触发钮承接键盘导航
        // (mousedown 已 preventDefault,焦点需显式归还才能响应 Arrow/Enter/Escape)。
        // 动画:display none→block 重启 CSS 动画(120ms 淡入,对齐 selection-menu)。
        openDropdownCommand = 'blockTransform';
        blockDropdown.style.display = 'block';
        // 定位:触发钮正下方;面板宽于触发钮右侧余量时向左收(居中/靠右对齐下防右溢出)。
        const dropdownLeft = Math.min(
          blockTrigger.offsetLeft,
          Math.max(8, root.clientWidth - blockDropdown.offsetWidth - 8)
        );
        blockDropdown.style.left = `${dropdownLeft}px`;
        blockTrigger.setAttribute('aria-expanded', 'true');
        dropdownActiveIndex = 0;
        syncDropdownActive();
        blockTrigger.focus();
      });
      // 下拉打开时:面板项间键盘导航(Arrow/Enter/Escape)。
      blockTrigger.addEventListener('keydown', (event) => {
        if (openDropdownCommand !== 'blockTransform') {
          return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          if (blockTransformItemButtons.length === 0) {
            return;
          }
          dropdownActiveIndex = event.key === 'ArrowDown'
            ? (dropdownActiveIndex + 1) % blockTransformItemButtons.length
            : (dropdownActiveIndex - 1 + blockTransformItemButtons.length) % blockTransformItemButtons.length;
          syncDropdownActive();
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          // 执行当前高亮项(active class 跟随键盘高亮;无高亮时不动作)。
          const target = blockTransformItemButtons[dropdownActiveIndex];
          if (!target) {
            return;
          }
          options.onCommand(target.dataset.command as ToolbarCommand);
          closeDropdown();
          blockTrigger.focus();
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          closeDropdown();
          blockTrigger.focus();
        }
      });
      root.appendChild(blockTrigger);
      root.appendChild(blockDropdown);
      blockTriggerEl = blockTrigger;
      return;
    }

    // 普通按钮(组间插分隔线)。
    const group = TOOLBAR_COMMAND_GROUP_MAP[item.command];
    if (lastGroup !== null && group !== undefined && group !== lastGroup) {
      const divider = document.createElement('span');
      divider.className = DIVIDER_CLASS;
      root.appendChild(divider);
    }
    lastGroup = group ?? lastGroup;
    appendCommandButton(item);
  });

  // 构建下拉面板内容(块转换菜单项;listbox/option 语义 + 键盘导航)。
  const blockTransformItems = resolveSelectionBlockTransformItems(messages, shortcutMode);
  blockDropdown.setAttribute('role', 'listbox');
  blockTransformItems.forEach((transformItem) => {
    // 下拉项按钮。
    const itemButton = document.createElement('button');
    itemButton.type = 'button';
    itemButton.className = `${DROPDOWN_CLASS}-item`;
    itemButton.dataset.command = transformItem.command;
    itemButton.setAttribute('role', 'option');
    itemButton.setAttribute('aria-selected', 'false');
    // 图标。
    itemButton.appendChild(
      createSharedIcon(transformItem.icon, {
        size: TOOLBAR_ICON_SIZE,
        strokeWidth: TOOLBAR_ICON_STROKE_WIDTH,
        className: `${DROPDOWN_CLASS}-item-icon`
      })
    );
    // 文案。
    const label = document.createElement('span');
    label.className = `${DROPDOWN_CLASS}-item-label`;
    label.textContent = transformItem.label;
    itemButton.appendChild(label);
    // 快捷键。
    const shortcut = document.createElement('kbd');
    shortcut.className = `${DROPDOWN_CLASS}-item-shortcut`;
    shortcut.textContent = transformItem.shortcut;
    itemButton.appendChild(shortcut);
    itemButton.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });
    itemButton.addEventListener('click', (event) => {
      event.preventDefault();
      options.onCommand(transformItem.command as ToolbarCommand);
      // 选择完成后收起面板。
      closeDropdown();
    });
    blockDropdown.appendChild(itemButton);
    // 键盘导航用按钮集合(与渲染顺序一致)。
    blockTransformItemButtons.push(itemButton);
  });

  // 外部点击收起下拉(命中工具栏与面板之外时)。
  const handleDocumentMouseDown = (event: MouseEvent): void => {
    if (openDropdownCommand === null) {
      return;
    }

    // 点击目标节点。
    const target = event.target as Node | null;
    if (root.contains(target)) {
      return;
    }

    closeDropdown();
  };
  document.addEventListener('mousedown', handleDocumentMouseDown, true);

  // ===== 响应式单行收起 =====
  // 宽度不足放下全部按钮时,按 resolveToolbarCollapseRank 从低频端逐个收起
  // (退化目标即简洁工具栏),保证工具栏始终单行;拉宽后整体还原。
  // 每次都从实时 DOM 取子元素:链接按钮会在视图创建后被宿主替换为 host span。

  /** 收起/展开单个排布元素。 */
  const setCollapsed = (element: HTMLElement, collapsed: boolean): void => {
    element.classList.toggle(COLLAPSED_CLASS, collapsed);
  };

  /** 是否处于收起态。 */
  const isCollapsed = (element: HTMLElement): boolean =>
    element.classList.contains(COLLAPSED_CLASS);

  /** 读取按钮对应命令(链接按钮宿主的命令挂在内部 trigger 上)。 */
  const resolveCommand = (element: HTMLElement): ToolbarCommand =>
    (element.dataset.command ??
      element.querySelector<HTMLElement>('[data-command]')?.dataset.command ??
      '') as ToolbarCommand;

  /**
   * 从实时 DOM 收集排布元素:内容按钮与分隔线(下拉面板绝对定位不参与排布)。
   */
  const collectLayoutElements = (): { content: HTMLElement[]; dividers: HTMLElement[] } => {
    const content: HTMLElement[] = [];
    const dividers: HTMLElement[] = [];
    Array.from(root.children).forEach((child) => {
      if (!(child instanceof HTMLElement) || child.classList.contains(DROPDOWN_CLASS)) {
        return;
      }
      if (child.classList.contains(DIVIDER_CLASS)) {
        dividers.push(child);
        return;
      }
      content.push(child);
    });
    return { content, dividers };
  };

  /**
   * 判断当前是否已换行:单行时所有可见元素被 align-items:center 对齐到同一
   * 中线(顶边会因元素高度不同而异,如移动端 44px 触控目标与 16px 分隔线),
   * 故比较垂直中心而非顶边;换行后各行中心相差一个行高,远超 1px 容差。
   */
  const isMultiRow = (): boolean => {
    let minCenter = Number.POSITIVE_INFINITY;
    let maxCenter = Number.NEGATIVE_INFINITY;
    let count = 0;
    for (const child of Array.from(root.children)) {
      if (
        !(child instanceof HTMLElement) ||
        child.classList.contains(DROPDOWN_CLASS) ||
        isCollapsed(child)
      ) {
        continue;
      }
      const center = child.offsetTop + child.offsetHeight / 2;
      minCenter = Math.min(minCenter, center);
      maxCenter = Math.max(maxCenter, center);
      count += 1;
    }
    return count > 0 && maxCenter - minCenter > 1;
  };

  /**
   * 分隔线收敛:仅当前一个可见元素是内容项(避免首线与相邻双线)、
   * 且其后仍有可见内容项(避免尾线)时展示。
   */
  const syncDividers = (): void => {
    const children = Array.from(root.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && !child.classList.contains(DROPDOWN_CLASS)
    );
    // 后向预计算:每个位置之后是否还有可见内容项。
    const hasContentAfter = new Array<boolean>(children.length).fill(false);
    let seenContent = false;
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index];
      hasContentAfter[index] = seenContent;
      if (child && !child.classList.contains(DIVIDER_CLASS) && !isCollapsed(child)) {
        seenContent = true;
      }
    }
    // 前向决策:内容项置"前邻是内容",分隔线据此显隐(分隔线本身不接力)。
    let prevVisibleIsContent = false;
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];
      if (!child) {
        continue;
      }
      if (child.classList.contains(DIVIDER_CLASS)) {
        setCollapsed(child, !(prevVisibleIsContent && hasContentAfter[index]));
        prevVisibleIsContent = false;
        continue;
      }
      if (!isCollapsed(child)) {
        prevVisibleIsContent = true;
      }
    }
  };

  /**
   * 选出下一个该收起的可见按钮:顺位最小者(数值小 = 最低频先让位)。
   * 核心按钮顺位为 Infinity 不入选;全部为核心时返回 null。
   */
  const findNextCollapseTarget = (content: readonly HTMLElement[]): HTMLElement | null => {
    let target: HTMLElement | null = null;
    let targetRank = Number.POSITIVE_INFINITY;
    for (const element of content) {
      if (isCollapsed(element)) {
        continue;
      }
      const rank = resolveToolbarCollapseRank(resolveCommand(element));
      if (rank < targetRank) {
        targetRank = rank;
        target = element;
      }
    }
    return target;
  };

  /** 按当前宽度把内容收进单行:先全部展开,再按收起顺位逐个让位。 */
  const applyCollapseLayout = (): void => {
    const { content, dividers } = collectLayoutElements();
    // 全部展开再测量:宽度恢复时自然还原,也避免沿用过期的收起结果。
    [...content, ...dividers].forEach((element) => setCollapsed(element, false));

    // 逐个收起最低频按钮直到单行;返回 null 说明剩下的都是核心按钮,
    // 极窄容器(小于核心集宽度)下退回换行兜底。
    while (isMultiRow()) {
      const target = findNextCollapseTarget(content);
      if (!target) {
        break;
      }
      setCollapsed(target, true);
      syncDividers();
    }
    // 单行成立时收敛一次分隔线(全展开态下通常无变化)。
    syncDividers();
  };

  /** 上次参与决策的工具栏宽度(-1 = 尚未测量)。 */
  let lastLayoutWidth = -1;

  /**
   * 按宽度重算收起集。仅宽度变化才重算:收起本身会改变工具栏高度,
   * 若高度也触发重算会与"展开→测量→收起"形成振荡。
   */
  const updateCollapseLayout = (): void => {
    // clientWidth 含内边距、不含边框,与 ResizeObserver contentRect 口径
    // 差值恒定,统一在此取值保证两路触发源可比。
    const width = root.clientWidth;
    if (width === lastLayoutWidth) {
      return;
    }
    lastLayoutWidth = width;
    applyCollapseLayout();
  };

  // 容器宽度变化(窗口缩放、宿主布局切换)与窗口 resize 双路触发。
  const layoutObserver = new ResizeObserver(() => updateCollapseLayout());
  layoutObserver.observe(root);
  const handleWindowResize = (): void => updateCollapseLayout();
  window.addEventListener('resize', handleWindowResize);
  // 视图挂载到宿主在本构造函数返回后的同一调用栈内完成,微任务保证首测已挂载。
  queueMicrotask(updateCollapseLayout);

  return {
    root,
    /**
     * 刷新按钮激活态与块转换触发钮文案。
     */
    refresh: (view: import('@milkdown/prose/view').EditorView): void => {
      // 当前激活块命令集合。
      const activeCommands = resolveActiveBlockTransformCommands(view);
      // 块转换触发钮文案 = 当前主块类型。
      const currentCommand = resolveCurrentBlockTransformCommand(view);
      // 块转换菜单项里的当前项 label(正文/标题 N/列表…)。
      const currentItem = blockTransformItems.find((item) => item.command === currentCommand);
      blockTriggerLabel.textContent = currentItem?.label ?? messages.toolbarBlockTransformParagraphLabel;

      root.querySelectorAll<HTMLButtonElement>('button[data-command]').forEach((button) => {
        // 按钮命令名。
        const command = button.dataset.command as ToolbarCommand;
        // 块转换触发钮不高亮(仅刷文案)。
        if (command === 'blockTransform') {
          return;
        }

        // 翻译按钮高亮跟随翻译模式(全文级状态,与选区无关)。
        if (command === 'translate') {
          button.dataset.active = translateMode.active ? 'true' : 'false';
          return;
        }

        // 布局按钮高亮跟随布局模式(全文级状态,与选区无关)。
        if (command === 'layoutMode') {
          button.dataset.active = layoutModeActive ? 'true' : 'false';
          return;
        }

        // 源码按钮高亮跟随源码模式(全文级状态,与选区无关)。
        if (command === 'sourceMode') {
          button.dataset.active = sourceModeActive ? 'true' : 'false';
          return;
        }

        // 大纲按钮高亮跟随大纲面板展开态(全文级状态,与选区无关)。
        if (command === 'outline') {
          button.dataset.active = outlineActive ? 'true' : 'false';
          return;
        }

        // AI 按钮高亮跟随 AI 会话框展开态(全文级状态,与选区无关)。
        if (command === 'ai') {
          button.dataset.active = aiActive ? 'true' : 'false';
          return;
        }

        button.dataset.active = isToolbarCommandActive(view, command) ? 'true' : 'false';
      });

      // 下拉面板菜单项高亮。
      blockDropdown.querySelectorAll<HTMLButtonElement>(`.${DROPDOWN_CLASS}-item`).forEach((itemButton) => {
        // 菜单项命令名。
        const command = itemButton.dataset.command as BlockTransformCommand;
        itemButton.dataset.active = activeCommands.has(command) ? 'true' : 'false';
      });
    },
    /**
     * 刷新撤销/重做按钮禁用态。
     */
    refreshHistory: (canUndo: boolean, canRedo: boolean): void => {
      root.querySelectorAll<HTMLButtonElement>('button[data-command="undo"], button[data-command="redo"]').forEach((button) => {
        // 按钮命令名。
        const command = button.dataset.command;
        // 翻译模式(含请求进行中)/源码模式下历史按钮强制禁用:译文视图不允许回退
        // 原文历史;源码视图的撤销重做作用于隐藏的富文本层,会与文本框内容脱节。
        const enabled = translateMode.active || translateMode.loading || sourceModeActive
          ? false
          : (command === 'undo' ? canUndo : canRedo);
        button.disabled = !enabled;
      });
    },
    closeDropdown,
    setTranslateMode,
    setLayoutMode,
    setSourceMode,
    setOutlineMode,
    setAiMode,
    /**
     * 销毁视图。
     */
    destroy: (): void => {
      if (translateFailedTimer !== null) {
        clearTimeout(translateFailedTimer);
        translateFailedTimer = null;
      }
      layoutObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      document.removeEventListener('mousedown', handleDocumentMouseDown, true);
      root.remove();
    }
  };
};

export type ToolbarViewController = ReturnType<typeof createToolbarViewController>;
