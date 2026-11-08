/**
 * ui/maximize-dialog.ts — 全屏弹窗与浮层挂载容器子系统
 *
 * 从 createMtable 函数体拆出:左上角全屏按钮 → 把整表搬入 body/ShadowRoot
 * 级 maximized dialog,Esc/关闭按钮还原;同时持有浮层(右键菜单/筛选面板)
 * 挂载容器的切换逻辑——表格被宿主搬进高 z-index 全屏弹窗时,浮层必须改挂
 * 弹窗宿主,否则 fixed 浮层(z-index 10000+)会被顶格弹窗宿主压在背面。
 */

import { CLOSE_ICON_MARKUP } from '../icons';
import type { MtableContext, MtableMaximizeApi } from '../context';

/** 创建全屏弹窗子系统(创建时绑定左上角按钮点击,与原初始化顺序一致)。 */
export function createMaximizeDialog(ctx: MtableContext): MtableMaximizeApi {
  const { config, wrapper, canvas } = ctx;

  /** 全屏弹窗运行态(null = 未打开)。 */
  let fullscreenDialog: {
    host: HTMLElement;
    handleKeyDown: (event: KeyboardEvent) => void;
  } | null = null;

  /** 自身全屏打开前的浮层挂载容器(关闭时恢复;嵌套弹窗场景回到外层宿主)。 */
  let fullscreenPrevOverlayContainer: HTMLElement | null = null;

  /**
   * 切换浮层挂载容器(右键菜单/筛选面板的父节点)。
   * 打开中的筛选面板随容器切换后定位失效,直接收起;右键菜单常态隐藏,直接搬移。
   */
  const setOverlayContainer = (container: HTMLElement | null): void => {
    const next = container ?? document.body;
    if (next === ctx.overlayContainer) return;
    ctx.filterPanel.close();
    next.appendChild(ctx.contextMenu.element);
    ctx.overlayContainer = next;
  };

  /** 关闭全屏弹窗:表格搬回原挂载点并还原布局。 */
  const close = (): void => {
    const dialog = fullscreenDialog;
    if (!dialog) return;
    fullscreenDialog = null;
    document.removeEventListener('keydown', dialog.handleKeyDown);
    // 浮层先搬回全屏前的挂载容器,再移除弹窗宿主(嵌套场景:外层可能是宿主自管的全屏弹窗)
    setOverlayContainer(fullscreenPrevOverlayContainer);
    fullscreenPrevOverlayContainer = null;
    dialog.host.remove();
    config.root.appendChild(wrapper);
    canvas.focus();
  };

  /** 打开全屏弹窗:整表搬入 body/ShadowRoot 级 maximized dialog。 */
  const open = (): void => {
    if (fullscreenDialog) return;
    // 进全屏前收起浮层:筛选面板/右键菜单锚定视口坐标,弹窗打开后会错位残留
    ctx.filterPanel.close();
    ctx.contextMenu.close();
    // 挂载根跟随所在根:shadow DOM 场景挂同一 ShadowRoot(样式作用域内),否则挂 body
    const mountRoot = wrapper.getRootNode();
    const dialogMount: HTMLElement | ShadowRoot = mountRoot instanceof ShadowRoot ? mountRoot : document.body;
    const messages = config.messages;
    const host = document.createElement('div');
    host.className = 'mtable-dialog-host';
    host.style.zIndex = '2147483647';
    const overlay = document.createElement('div');
    overlay.className = 'mtable-fullscreen-overlay';
    const windowEl = document.createElement('div');
    windowEl.className = 'mtable-fullscreen-window';
    windowEl.setAttribute('role', 'dialog');
    windowEl.setAttribute('aria-label', messages.fullscreenTitle);
    const header = document.createElement('div');
    header.className = 'mtable-fullscreen-header';
    const titleEl = document.createElement('span');
    titleEl.className = 'mtable-fullscreen-title';
    titleEl.textContent = messages.fullscreenTitle;
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'mtable-fullscreen-close';
    closeButton.innerHTML = CLOSE_ICON_MARKUP;
    closeButton.title = `${messages.close} (Esc)`;
    closeButton.setAttribute('aria-label', closeButton.title);
    closeButton.addEventListener('click', close);
    header.append(titleEl, closeButton);
    const body = document.createElement('div');
    body.className = 'mtable-fullscreen-body';
    windowEl.append(header, body);
    overlay.appendChild(windowEl);
    host.appendChild(overlay);
    dialogMount.appendChild(host);
    // 浮层随表格搬进弹窗宿主:在宿主层叠上下文内 z-index 10000+ 自然盖过弹窗本体
    fullscreenPrevOverlayContainer = ctx.overlayContainer;
    setOverlayContainer(host);
    // 表格搬入弹窗内容区并铺满(关闭时 appendChild 回原挂载点,尺寸观察器自动重排)
    wrapper.style.height = '100%';
    body.appendChild(wrapper);
    // Escape 关闭(冒泡阶段:单元格编辑态 Escape 先被 mtable 消费且 defaultPrevented,不会误关)
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      close();
    };
    document.addEventListener('keydown', handleKeyDown);
    fullscreenDialog = { host, handleKeyDown };
    canvas.focus();
  };

  ctx.expandButton.addEventListener('click', open);

  return { open, close, setOverlayContainer };
}
