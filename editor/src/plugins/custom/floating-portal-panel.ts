/**
 * plugins/custom/floating-portal-panel.ts — 浮层 Portal 容器
 *
 * 1:1 翻译自 zt-react-milkdown/src/plugins/custom/floating-portal-panel.tsx
 * - 去除 React Portal,改用纯 DOM appendChild 到 portalContainer
 * - 浮层定位复用 lib/editor-overlay-position
 */
import { createOverlayRepositionScheduler, toPortalPosition } from '../../lib/editor-overlay-position';
import type { OverlayContentAnchor, OverlayPlacement } from '../../lib/editor-overlay-position';

/** 浮层 panel 配置。 */
export interface FloatingPortalPanelConfig {
  /** Portal 容器。 */
  portalContainer: HTMLElement;
  /** 浮层根 DOM 元素。 */
  panelElement: HTMLElement;
  /** 浮层宽度。 */
  width: number;
  /** 浮层高度(可选)。 */
  height?: number;
  /** 主轴偏移。 */
  offsetY: number;
  /** 边界内边距。 */
  boundaryInset: number;
  /** 浮层展开方向。 */
  placement: OverlayPlacement;
  /** 横向对齐。 */
  horizontalAlign?: 'start' | 'center' | 'end';
  /** 编辑器滚动容器。 */
  wrapper: HTMLElement;
  /** 内容坐标锚点(初始/兜底静态锚点)。 */
  anchor: OverlayContentAnchor;
  /**
   * 实时锚点解析器(必选):每次位置刷新(窗口 resize/滚动/容器尺寸变化触发的
   * schedule)先重取锚点再计算。面板打开后宿主回流(如窗口调整导致触发钮移位)
   * 时,若无实时解析器,静态坐标会把浮层钉死在旧位置。返回 null 时回退 anchor。
   */
  resolveAnchor: () => OverlayContentAnchor | null;
}

/** 浮层 panel 控制器。 */
export interface FloatingPortalPanelController {
  /** 当前 panel DOM 元素。 */
  panelRef: HTMLElement;
  /** 立即更新浮层位置。 */
  update: (config: Partial<FloatingPortalPanelConfig>) => void;
  /** 销毁浮层。 */
  destroy: () => void;
}

/**
 * 创建浮层 portal panel。
 */
export const createFloatingPortalPanel = (
  initialConfig: FloatingPortalPanelConfig
): FloatingPortalPanelController => {
  const { panelElement, portalContainer } = initialConfig;
  let currentConfig: FloatingPortalPanelConfig = initialConfig;

  /** 浮层位置刷新调度器。 */
  const scheduler = createOverlayRepositionScheduler(() => {
    refresh();
  });

  /** 刷新浮层位置。 */
  const refresh = (): void => {
    // 锚点:实时解析(回流后触发钮可能已移位),解析失败回退静态坐标兜底。
    const anchor = currentConfig.resolveAnchor() ?? currentConfig.anchor;
    const position = toPortalPosition(
      {
        wrapper: currentConfig.wrapper,
        anchor,
        overlaySize: { width: currentConfig.width, height: currentConfig.height },
        placement: currentConfig.placement,
        horizontalAlign: currentConfig.horizontalAlign,
        offsetY: currentConfig.offsetY,
        boundaryInset: currentConfig.boundaryInset
      },
      portalContainer
    );

    panelElement.style.position = 'absolute';
    panelElement.style.left = `${position.left}px`;
    panelElement.style.top = `${position.top}px`;
    panelElement.style.width = `${currentConfig.width}px`;
    if (currentConfig.height !== undefined) {
      panelElement.style.height = `${currentConfig.height}px`;
    }
  };

  /** 初始化:挂载到 portal 容器,绑定全局事件。 */
  const init = (): void => {
    portalContainer.appendChild(panelElement);
    panelElement.style.position = 'absolute';
    scheduler.bindGlobal();
    // 观察碰撞边界容器尺寸:程序化改宽等不触发 window resize 的回流也能刷新位置。
    scheduler.bindElement(currentConfig.wrapper);
    refresh();
  };

  /** 销毁。 */
  const destroy = (): void => {
    scheduler.destroy();
    if (panelElement.parentNode === portalContainer) {
      portalContainer.removeChild(panelElement);
    }
  };

  init();

  return {
    panelRef: panelElement,
    update: (config: Partial<FloatingPortalPanelConfig>) => {
      currentConfig = { ...currentConfig, ...config };
      // 碰撞边界容器可能被 update 换掉,尺寸观察随之切换。
      if (config.wrapper !== undefined) {
        scheduler.bindElement(currentConfig.wrapper);
      }
      scheduler.schedule();
    },
    destroy
  };
};
