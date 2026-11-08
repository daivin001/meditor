/**
 * lib/editor-overlay-position.ts — 浮层定位计算
 *
 * 1:1 翻译自 zt-react-milkdown/src/lib/editor-overlay-position.ts
 * - 依赖保留 (subscribeGlobalScroll)
 * - 去除 'top/bottom' placement 计算,逻辑一致
 */
import { subscribeGlobalScroll } from './global-scroll-listener';

/**
 * 编辑器浮层展开方向。
 */
export type OverlayPlacement = 'top' | 'bottom';

/**
 * 浮层锚点在编辑器内容坐标系中的稳定坐标。
 */
export interface OverlayContentAnchor {
  /** 锚点顶部(内容坐标)。 */
  anchorTopInContent: number;
  /** 锚点底部(内容坐标)。 */
  anchorBottomInContent: number;
  /** 锚点左侧(内容坐标)。 */
  anchorLeftInContent: number;
  /** 锚点右侧(内容坐标)。 */
  anchorRightInContent?: number;
}

/**
 * 浮层视口坐标(用于 fixed 定位)。
 */
export interface OverlayViewportPosition {
  /** 视口顶部坐标。 */
  top: number;
  /** 视口左侧坐标。 */
  left: number;
}

/**
 * 浮层 Portal 内坐标(用于 absolute 定位)。
 */
export interface OverlayPortalPosition {
  /** Portal 内顶部坐标。 */
  top: number;
  /** Portal 内左侧坐标。 */
  left: number;
}

/**
 * 浮层换算配置。
 */
export interface OverlayPositionConfig {
  /** 编辑器滚动容器。 */
  wrapper: HTMLElement;
  /** 内容坐标锚点。 */
  anchor: OverlayContentAnchor;
  /** 浮层尺寸。 */
  overlaySize: { width: number; height?: number };
  /** 展开方向。 */
  placement: OverlayPlacement;
  /** 横向对齐方式。 */
  horizontalAlign?: 'start' | 'center' | 'end';
  /** 主轴偏移。 */
  offsetY: number;
  /** 边界内边距。 */
  boundaryInset: number;
}

/**
 * 编辑器滚动容器默认选择器(逗号分隔多候选,closest 按就近命中)。
 *
 * 历史上本模块硬编码 `.zt-md-editor` / `.meditor-editor-area` 两个类名字符串
 * 定位滚动容器;现收敛为此常量并允许经 createMeditor 的
 * `scrollContainerSelector` 选项整体替换 —— 宿主若需改编辑区滚动容器类名
 * (如接入自有布局壳),只需把新类名写进该选项,无需改本文件。
 */
export const EDITOR_SCROLL_CONTAINER_SELECTOR = '.zt-md-editor, .meditor-editor-area';

/**
 * 解析真实滚动容器:按选择器就近命中(scrollContainerSelector 可配置),
 * 兜底回退到编辑器根节点。
 *
 * @param viewDom 编辑器视图 DOM(ProseMirror root)
 * @param selector 滚动容器选择器(缺省用 EDITOR_SCROLL_CONTAINER_SELECTOR,行为不变)
 */
export const resolveEditorWrapper = (
  viewDom: HTMLElement | null,
  selector: string = EDITOR_SCROLL_CONTAINER_SELECTOR,
): HTMLElement | null => {
  if (!viewDom) {
    return null;
  }

  if (!selector) {
    return viewDom;
  }

  try {
    return viewDom.closest(selector) ?? viewDom;
  } catch {
    // 非法选择器不拖垮浮层定位:退回编辑器根节点。
    return viewDom;
  }
};

/**
 * 根据当前光标视口矩形与阈值解析菜单展开方向。
 */
export const resolvePlacement = (
  anchorRect: DOMRect,
  threshold: number,
  boundaryRect?: DOMRect,
): OverlayPlacement => {
  const viewportHeight = typeof window === 'undefined' ? anchorRect.bottom : window.innerHeight;
  const boundaryTop = boundaryRect?.top ?? 0;
  const boundaryBottom = boundaryRect?.bottom ?? viewportHeight;
  const spaceAbove = anchorRect.top - boundaryTop;
  const spaceBelow = boundaryBottom - anchorRect.bottom;
  if (spaceBelow < threshold && spaceAbove > spaceBelow) {
    return 'top';
  }

  return 'bottom';
};

/**
 * 将锚点矩形换算为编辑器内容坐标中的稳定锚点。
 */
export const toContentAnchor = (
  anchorRect: DOMRect,
  wrapper: HTMLElement,
): OverlayContentAnchor => {
  const wrapperRect = wrapper.getBoundingClientRect();

  return {
    anchorTopInContent: anchorRect.top - wrapperRect.top + wrapper.scrollTop,
    anchorBottomInContent: anchorRect.bottom - wrapperRect.top + wrapper.scrollTop,
    anchorLeftInContent: anchorRect.left - wrapperRect.left + wrapper.scrollLeft,
    anchorRightInContent: anchorRect.right - wrapperRect.left + wrapper.scrollLeft,
  };
};

/**
 * 解析浮层横向内容坐标。
 */
const resolveOverlayLeftInContent = (config: OverlayPositionConfig): number => {
  const { anchor, overlaySize, horizontalAlign = 'start' } = config;
  const anchorRightInContent = anchor.anchorRightInContent ?? anchor.anchorLeftInContent;

  if (horizontalAlign === 'end') {
    return anchorRightInContent - overlaySize.width;
  }

  if (horizontalAlign === 'center') {
    return (
      anchor.anchorLeftInContent +
      (anchorRightInContent - anchor.anchorLeftInContent - overlaySize.width) / 2
    );
  }

  return anchor.anchorLeftInContent;
};

/**
 * 将内容坐标换算为视口 fixed 坐标。
 */
export const toViewportPosition = (config: OverlayPositionConfig): OverlayViewportPosition => {
  const { wrapper, anchor, overlaySize, placement, offsetY, boundaryInset } = config;
  const wrapperRect = wrapper.getBoundingClientRect();
  const minLeft = wrapper.scrollLeft + boundaryInset;
  const maxLeft = wrapper.scrollLeft + wrapper.clientWidth - overlaySize.width - boundaryInset;
  const rawLeft = resolveOverlayLeftInContent(config);
  const clampedLeft = Math.min(Math.max(rawLeft, minLeft), Math.max(minLeft, maxLeft));
  const overlayTopInContent =
    placement === 'top'
      ? anchor.anchorTopInContent - (overlaySize.height ?? 0) - offsetY
      : anchor.anchorBottomInContent + offsetY;

  return {
    left: wrapperRect.left + clampedLeft - wrapper.scrollLeft,
    top: wrapperRect.top + overlayTopInContent - wrapper.scrollTop,
  };
};

/**
 * 将内容坐标换算为编辑器 Portal 内 absolute 坐标。
 */
export const toPortalPosition = (
  config: OverlayPositionConfig,
  portalContainer: HTMLElement,
): OverlayPortalPosition => {
  // 原有视口坐标。
  const viewportPosition = toViewportPosition(config);
  // Portal 容器视口矩形。
  const portalRect = portalContainer.getBoundingClientRect();

  return {
    left: viewportPosition.left - portalRect.left,
    top: viewportPosition.top - portalRect.top,
  };
};

/**
 * 创建浮层位置刷新调度器(RAF 节流 + 监听绑定/解绑)。
 */
export const createOverlayRepositionScheduler = (updateFn: () => void) => {
  // 合并高频刷新请求的 RAF id。
  let rafId = 0;
  // 当前绑定滚动监听的编辑器滚动容器。
  let scrollListenerWrapper: HTMLElement | null = null;
  // 当前全局滚动订阅取消函数。
  let unsubscribeGlobalScroll: (() => void) | null = null;
  // 观察容器尺寸变化的 ResizeObserver(程序化改宽等不触发 window resize 的场景)。
  let resizeObserver: ResizeObserver | null = null;
  // 当前被观察尺寸的元素。
  let observedElement: Element | null = null;

  /**
   * 触发一次 RAF 节流刷新。
   */
  const schedule = (): void => {
    if (typeof window === 'undefined') {
      return;
    }
    if (rafId) {
      window.cancelAnimationFrame(rafId);
    }
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      updateFn();
    });
  };

  /**
   * 绑定全局 resize / scroll 监听。
   */
  const bindGlobal = (): void => {
    window.addEventListener('resize', schedule);
    if (!unsubscribeGlobalScroll) {
      unsubscribeGlobalScroll = subscribeGlobalScroll(schedule);
    }
  };

  /**
   * 解绑全局 resize / scroll 监听。
   */
  const unbindGlobal = (): void => {
    window.removeEventListener('resize', schedule);
    unsubscribeGlobalScroll?.();
    unsubscribeGlobalScroll = null;
  };

  /**
   * 切换容器级 scroll 监听。
   */
  const bindWrapper = (nextWrapper: HTMLElement | null): void => {
    if (scrollListenerWrapper === nextWrapper) {
      return;
    }
    if (scrollListenerWrapper) {
      scrollListenerWrapper.removeEventListener('scroll', schedule);
    }
    scrollListenerWrapper = nextWrapper;
    if (scrollListenerWrapper) {
      scrollListenerWrapper.addEventListener('scroll', schedule, { passive: true });
    }
  };

  /**
   * 观察元素尺寸变化并触发刷新:程序化修改容器宽度、宿主布局调整等
   * 不触发 window resize 的回流场景,window 监听覆盖不到,ResizeObserver 才能感知。
   */
  const bindElement = (next: Element | null): void => {
    if (observedElement === next) {
      return;
    }
    if (observedElement) {
      resizeObserver?.unobserve(observedElement);
    }
    observedElement = next;
    if (next && typeof ResizeObserver !== 'undefined') {
      if (!resizeObserver) {
        resizeObserver = new ResizeObserver(() => schedule());
      }
      resizeObserver.observe(next);
    }
  };

  /**
   * 销毁调度器并清理监听。
   */
  const destroy = (): void => {
    if (typeof window !== 'undefined' && rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    unbindGlobal();
    resizeObserver?.disconnect();
    resizeObserver = null;
    observedElement = null;
    bindWrapper(null);
  };

  return {
    schedule,
    bindGlobal,
    unbindGlobal,
    bindWrapper,
    bindElement,
    destroy,
  };
};
