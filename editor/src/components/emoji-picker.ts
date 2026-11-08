/**
 * components/emoji-picker.ts — emoji 选择面板(纯 DOM)
 *
 * 工具栏 emoji 按钮 / slash 菜单「Emoji」项共用:
 * - absolute 悬浮层挂载于编辑器 portal 层(不影响文档流,样式随编辑器主题);
 * - 锚点优先取外部传入矩形(工具栏按钮),缺省锚定当前光标(+ 菜单场景);
 * - 分类分组 + 按分类名过滤,点选即以文本插入光标处并回焦编辑器;
 * - 面板外点击 / Escape 关闭;全局同时只保留一个实例。
 */
import type { EditorView } from '@milkdown/prose/view';
import type { EditorI18nMessages } from '../types/editor';
import type { EmojiEntry } from './emoji-data';
import { isEditorViewEditable } from '../plugins/custom/slash-menu/slash-menu-logic';
import { createOverlayRepositionScheduler } from '../lib/editor-overlay-position';
import { EMOJI_CATEGORIES } from './emoji-data';

/** 面板根类名。 */
const PICKER_CLASS = 'zt-md-emoji-picker';

/**
 * emoji 选择面板配置。
 */
export interface EmojiPickerConfig {
  /** 编辑器内部浮层 Portal 容器(面板挂载宿主)。 */
  portalContainer: HTMLElement;
  /** 当前编辑器视图(插入目标 + 光标锚点)。 */
  view: EditorView;
  /** 编辑器文案。 */
  messages: EditorI18nMessages;
  /** 锚点视口矩形(缺省锚定当前光标)。 */
  anchorRect?: DOMRect | null;
  /**
   * 锚点元素(可选):提供时窗口 resize 触发面板按实时矩形重算位置,
   * 避免窗口调整后触发钮移位、面板钉在旧坐标;缺省仅在打开时定位一次。
   */
  anchorEl?: HTMLElement | null;
}

/**
 * 当前打开的面板关闭器(全局单实例)。
 */
let activePickerClose: (() => void) | null = null;

/**
 * 将 emoji 以纯文本插入光标处并回焦编辑器。
 */
const insertEmojiAtCursor = (view: EditorView, emoji: string): void => {
  if (!isEditorViewEditable(view) || !view.dispatch) {
    return;
  }

  view.dispatch(view.state.tr.insertText(emoji).scrollIntoView());
  view.focus();
};

/**
 * 计算面板在 portal 层内的坐标(锚点优先,兜底居中,统一 clamp 在容器内)。
 */
const computePanelPosition = (
  panel: HTMLElement,
  portalContainer: HTMLElement,
  anchorRect: DOMRect | null
): void => {
  // Portal 层视口矩形。
  const portalRect = portalContainer.getBoundingClientRect();
  // 面板实际尺寸(内容自适应,兜底 CSS 缺省值)。
  const panelWidth = panel.offsetWidth || 320;
  const panelHeight = panel.offsetHeight || 380;

  // 默认居中(无锚点时)。
  let left = (portalRect.width - panelWidth) / 2;
  let top = (portalRect.height - panelHeight) / 2;

  if (anchorRect) {
    left = anchorRect.left - portalRect.left;
    top = anchorRect.bottom - portalRect.top + 8;
  }

  // clamp 在 portal 层内(留 8px 边距)。
  left = Math.min(Math.max(left, 8), Math.max(8, portalRect.width - panelWidth - 8));
  top = Math.min(Math.max(top, 8), Math.max(8, portalRect.height - panelHeight - 8));

  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
};

/**
 * 弹出 emoji 选择面板(全局单实例,重复调用先关旧面板)。
 */
export const showEmojiPicker = (config: EmojiPickerConfig): void => {
  const { portalContainer, view, messages } = config;

  // 已有面板先关闭,避免叠加。
  activePickerClose?.();
  activePickerClose = null;
  // 只读态不弹出。
  if (!isEditorViewEditable(view)) {
    return;
  }

  /** 面板根元素。 */
  const panel = document.createElement('div');
  panel.className = PICKER_CLASS;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', messages.emojiPickerTitle);

  // 搜索框(按分类文案过滤)。
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = `${PICKER_CLASS}-search`;
  searchInput.placeholder = messages.emojiPickerSearchPlaceholder;
  searchInput.setAttribute('aria-label', messages.emojiPickerSearchPlaceholder);
  panel.appendChild(searchInput);

  // 可滚动的分类列表宿主。
  const body = document.createElement('div');
  body.className = `${PICKER_CLASS}-body`;
  panel.appendChild(body);
  portalContainer.appendChild(panel);

  /**
   * 去除拼音声调符号(huǒ → huo),保证带调/不带调拼音互搜。
   */
  const stripToneMarks = (value: string): string =>
    // biome-ignore lint/suspicious/noMisleadingCharacterClass: NFD 后该范围本身即组合附加符号,逐字剥离无"字符+组合符"合并问题
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  /**
   * 关键词匹配:
   * - 中文(含非 ASCII)查询按子串直配,支持词内命中(如"笑"命中"大笑");
   * - ASCII(拼音/英文)查询仅按 token 开头前缀命中,兼容拼音分写与
   *   连写("xiao lian"/"xiaolian"),并避免跨音节误配
   *   (如 aixin 误中 k**aixin**、huo 误中 shuo**huang**)。
   */
  const matchKeywords = (keywords: string, query: string, condensedQuery: string): boolean => {
    const lowered = stripToneMarks(keywords.toLowerCase());
    if (query !== '' && /\P{ASCII}/u.test(query) && lowered.includes(query)) {
      return true;
    }
    if (condensedQuery === '' || !condensedQuery) {
      return false;
    }
    return lowered.split(/\s+/).some((token) => token.startsWith(condensedQuery));
  };

  /**
   * 按查询词渲染分区:空查询展示全量;命中分类名保留整组,
   * 否则逐条按关键词(中文/拼音/英文)精准匹配。
   */
  const renderGroups = (query: string): void => {
    body.innerHTML = '';
    // 归一化查询词(小写 + 去声调 + 去空格连写形)。
    const normalizedQuery = stripToneMarks(query.trim().toLowerCase());
    const condensedQuery = normalizedQuery.replace(/\s+/g, '');

    /** 是否有命中分区。 */
    let hasMatch = false;
    EMOJI_CATEGORIES.forEach((category) => {
      // 当前分组文案。
      const label = messages[category.labelKey];
      // 分类名命中时整组保留。
      const labelHit = normalizedQuery !== '' && label.toLowerCase().includes(normalizedQuery);
      // 命中的条目集合。
      const matched =
        normalizedQuery === ''
          ? category.emojis
          : category.emojis.filter((entry) => labelHit || matchKeywords(entry.keywords, normalizedQuery, condensedQuery));
      if (matched.length === 0) {
        return;
      }
      hasMatch = true;

      // 分组标题。
      const groupLabel = document.createElement('div');
      groupLabel.className = `${PICKER_CLASS}-group`;
      groupLabel.textContent = label;
      body.appendChild(groupLabel);

      // emoji 网格。
      const grid = document.createElement('div');
      grid.className = `${PICKER_CLASS}-grid`;
      matched.forEach((entry) => {
        // emoji 单元按钮。
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = `${PICKER_CLASS}-cell`;
        cell.textContent = entry.char;
        cell.title = resolveEntryTitle(entry);
        cell.setAttribute('aria-label', cell.title);
        cell.addEventListener('mousedown', (event) => {
          // 防止点击面板导致编辑器选区丢失。
          event.preventDefault();
        });
        cell.addEventListener('click', () => {
          insertEmojiAtCursor(view, entry.char);
          close();
        });
        grid.appendChild(cell);
      });
      body.appendChild(grid);
    });

    if (!hasMatch) {
      // 空态提示。
      const empty = document.createElement('div');
      empty.className = `${PICKER_CLASS}-empty`;
      empty.textContent = messages.emojiPickerNoResults;
      body.appendChild(empty);
    }
  };

  /**
   * 面板重定位共享调度器(editor-overlay-position 统一接线):window resize +
   * 全局滚动(document 捕获)+ portal 容器尺寸变化(ResizeObserver)统一 RAF
   * 节流;程序化改宽等不触发 window resize 的回流也能跟随。
   * 锚点优先取锚点元素实时矩形,回退打开时的静态矩形。
   */
  const repositionScheduler = createOverlayRepositionScheduler(() => {
    computePanelPosition(panel, portalContainer, config.anchorEl?.getBoundingClientRect() ?? config.anchorRect ?? null);
  });

  /**
   * 关闭器(清理监听 + 摘除 DOM;单实例守卫:仅当前实例可关)。
   */
  const close = (): void => {
    if (activePickerClose !== close) {
      return;
    }
    activePickerClose = null;
    document.removeEventListener('mousedown', handleDocumentMouseDown, true);
    document.removeEventListener('keydown', handleDocumentKeyDown, true);
    repositionScheduler.destroy();
    panel.remove();
  };
  activePickerClose = close;

  // 面板外点击关闭(capture 捕获,先于编辑器等处理)。
  const handleDocumentMouseDown = (event: MouseEvent): void => {
    // 点击目标节点。
    const target = event.target as Node | null;
    if (panel.contains(target)) {
      return;
    }
    close();
  };

  // Escape 关闭。
  const handleDocumentKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  };

  document.addEventListener('mousedown', handleDocumentMouseDown, true);
  document.addEventListener('keydown', handleDocumentKeyDown, true);
  // 绑定共享重定位调度器(window resize + 全局滚动 + portal 容器尺寸观察)。
  repositionScheduler.bindGlobal();
  repositionScheduler.bindElement(portalContainer);

  searchInput.addEventListener('input', () => {
    renderGroups(searchInput.value);
  });

  // 首屏渲染 + 定位(挂载后量尺寸)。
  renderGroups('');
  computePanelPosition(panel, portalContainer, config.anchorRect ?? resolveCursorAnchorRect(view));
  searchInput.focus();
};

/**
 * 解析条目悬浮标题(取首个关键词,通常为中文词条)。
 */
const resolveEntryTitle = (entry: EmojiEntry): string => {
  return entry.keywords.split(/\s+/)[0] ?? entry.char;
};

/**
 * 解析当前光标的视口矩形(作为面板锚点)。
 */
const resolveCursorAnchorRect = (view: EditorView): DOMRect | null => {
  // 当前选区位置。
  const from = view?.state?.selection?.from;
  if (typeof from !== 'number') {
    return null;
  }

  // 光标视口坐标。
  const coords = view.coordsAtPos(from) as { top: number; bottom: number; left: number; right: number } | null;
  if (!coords) {
    return null;
  }

  return new DOMRect(coords.left, coords.top, Math.max(coords.right - coords.left, 1), coords.bottom - coords.top);
};
