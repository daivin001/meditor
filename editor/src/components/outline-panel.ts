/**
 * components/outline-panel.ts — 大纲面板(纯 DOM 实现)
 *
 * 内容右侧固定面板:按文档顺序渲染标题清单(h1~h6 级别缩进),
 * 点击条目滚动定位到对应标题(跳转编排在外层,经 scrollToHeading);
 * 编辑区滚动时高亮视口顶部附近的当前标题(锚点 DOM 由标题锚点插件的
 * data-anchor-id 属性提供)。
 */
import type { EditorI18nMessages, MeditorHeading } from '../types/editor';

/** 大纲面板 API。 */
export interface OutlinePanelApi {
  /** 展开面板(展开态经宿主 data-open 属性驱动布局)。 */
  open: () => void;
  /** 收起面板。 */
  close: () => void;
  /** 面板是否展开。 */
  isOpen: () => boolean;
  /** 全量替换标题清单(doc 变更时由编排层推送;收起态仅缓存,展开时再渲染)。 */
  setHeadings: (headings: MeditorHeading[]) => void;
  /** 销毁面板(摘除滚动监听与根节点)。 */
  destroy: () => void;
}

/** 大纲面板配置。 */
export interface OutlinePanelConfig {
  /** 面板挂载宿主(布局占位容器;data-open 属性驱动展开态样式)。 */
  host: HTMLElement;
  /** 编辑器文案。 */
  messages: EditorI18nMessages;
  /** 编辑区滚动容器(当前标题高亮跟随用)。 */
  scrollContainer: HTMLElement;
  /** 点击条目回调(滚动定位到对应标题)。 */
  onJump: (id: string) => void;
}

/** 当前标题判定阈值:标题顶边越过滚动容器顶部该距离即视为"已过"(px)。 */
const ACTIVE_HEADING_TOP_OFFSET = 88;

/**
 * 创建大纲面板。
 */
export const createOutlinePanel = (config: OutlinePanelConfig): OutlinePanelApi => {
  const { host, messages, scrollContainer, onJump } = config;

  /** 最近一次推送的标题清单。 */
  let headings: MeditorHeading[] = [];
  /** 展开态。 */
  let open = false;
  /** 当前高亮标题 id。 */
  let activeId: string | null = null;
  /** 高亮跟随的 rAF 帧号(合并同帧多次滚动触发)。 */
  let activeRafId: number | null = null;

  // --- DOM 构建 ---
  const root = document.createElement('nav');
  root.className = 'zt-md-outline';
  root.setAttribute('aria-label', messages.outlinePanelTitle);

  const header = document.createElement('div');
  header.className = 'zt-md-outline-header';
  const title = document.createElement('span');
  title.className = 'zt-md-outline-title';
  title.textContent = messages.outlinePanelTitle;
  header.appendChild(title);
  root.appendChild(header);

  const list = document.createElement('ul');
  list.className = 'zt-md-outline-list';
  root.appendChild(list);

  host.appendChild(root);
  host.dataset.open = 'false';

  /**
   * 渲染标题清单(全量重建;标题数量级通常在百以内,无需增量)。
   */
  const render = (): void => {
    list.replaceChildren();

    if (headings.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'zt-md-outline-empty';
      empty.textContent = messages.outlineEmpty;
      list.appendChild(empty);
      return;
    }

    for (const heading of headings) {
      const item = document.createElement('li');
      item.className = 'zt-md-outline-item';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'zt-md-outline-link';
      button.dataset.headingId = heading.id;
      // 级别缩进(h1 顶格,每级 12px;与 [toc] 目录块同风格)。
      button.style.paddingLeft = `${4 + Math.max(0, heading.level - 1) * 12}px`;
      button.title = heading.text;
      button.textContent = heading.text;
      button.addEventListener('click', (event) => {
        event.preventDefault();
        onJump(heading.id);
      });
      // 渲染后立即同步既有高亮(清单重建不丢当前标题标记)。
      if (heading.id === activeId) {
        button.dataset.active = 'true';
        button.setAttribute('aria-current', 'true');
      }
      item.appendChild(button);
      list.appendChild(item);
    }
  };

  /**
   * 标记当前高亮标题(aria-current + data-active)。
   */
  const setActive = (id: string | null): void => {
    if (activeId === id) {
      return;
    }
    activeId = id;
    list.querySelectorAll<HTMLButtonElement>('.zt-md-outline-link').forEach((button) => {
      const active = button.dataset.headingId === id;
      button.dataset.active = active ? 'true' : 'false';
      if (active) {
        button.setAttribute('aria-current', 'true');
      } else {
        button.removeAttribute('aria-current');
      }
    });
  };

  /**
   * 按视口位置计算当前标题:文档序最后一个顶边已越过参考线的标题。
   * 参考线 = 容器可见顶缘(容器顶端滚出视口时取视口顶)下方阈值处,
   * 兼容编辑区内部滚动与宿主页面级滚动两种形态。
   * (标题 DOM 锚点由标题锚点插件的 data-anchor-id 提供。)
   */
  const syncActiveFromViewport = (): void => {
    if (!open || headings.length === 0) {
      return;
    }
    const referenceLine =
      Math.max(scrollContainer.getBoundingClientRect().top, 0) + ACTIVE_HEADING_TOP_OFFSET;
    let current: string | null = null;
    for (const heading of headings) {
      const element = scrollContainer.querySelector(
        `[data-anchor-id="${CSS.escape(heading.id)}"]`
      );
      if (!(element instanceof Element)) {
        continue;
      }
      if (element.getBoundingClientRect().top <= referenceLine) {
        current = heading.id;
      }
    }
    setActive(current);
  };

  /** 合并同帧的滚动/resize 触发。 */
  const scheduleSyncActive = (): void => {
    if (activeRafId !== null) {
      return;
    }
    activeRafId = requestAnimationFrame(() => {
      activeRafId = null;
      syncActiveFromViewport();
    });
  };

  const attachScrollListeners = (): void => {
    scrollContainer.addEventListener('scroll', scheduleSyncActive, { passive: true });
    window.addEventListener('scroll', scheduleSyncActive, { passive: true });
    window.addEventListener('resize', scheduleSyncActive);
  };

  const detachScrollListeners = (): void => {
    scrollContainer.removeEventListener('scroll', scheduleSyncActive);
    window.removeEventListener('scroll', scheduleSyncActive);
    window.removeEventListener('resize', scheduleSyncActive);
  };

  return {
    open: () => {
      if (open) {
        return;
      }
      open = true;
      host.dataset.open = 'true';
      render();
      attachScrollListeners();
      syncActiveFromViewport();
    },
    close: () => {
      if (!open) {
        return;
      }
      open = false;
      host.dataset.open = 'false';
      detachScrollListeners();
    },
    isOpen: () => open,
    setHeadings: (nextHeadings: MeditorHeading[]) => {
      headings = nextHeadings;
      if (open) {
        render();
        scheduleSyncActive();
      }
    },
    destroy: () => {
      detachScrollListeners();
      if (activeRafId !== null) {
        cancelAnimationFrame(activeRafId);
        activeRafId = null;
      }
      root.remove();
    },
  };
};
