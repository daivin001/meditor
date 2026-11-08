/**
 * utils/dialog-host.ts — body 级 Dialog 弹层宿主工具
 *
 * 弹窗挂载到 document.body(脱离编辑器 overflow/transform 裁剪),同时:
 * - 复制 .zt-md 主题类(明/暗),弹窗内样式选择器继续生效;
 * - 复制编辑器根节点的主题 CSS 变量(shadow DOM 场景变量不冒泡到 body)。
 */

// 需要从编辑器根节点复制到 body 弹窗宿主的主题变量。
const DIALOG_THEME_VARIABLES = [
  '--zt-font',
  '--zt-bg',
  '--zt-surface',
  '--zt-fg',
  '--zt-muted',
  '--zt-border',
  '--zt-primary',
  '--zt-primary-foreground',
  '--zt-destructive',
  '--zt-radius',
  '--zt-radius-lg'
] as const;

/**
 * 同步编辑器主题变量到 body 弹窗宿主。
 */
const syncDialogHostThemeVariables = (host: HTMLElement, editorRoot: Element | null): void => {
  if (!editorRoot) {
    return;
  }

  // 编辑器根节点的最终主题变量。
  const editorRootStyle = window.getComputedStyle(editorRoot);
  DIALOG_THEME_VARIABLES.forEach((variableName) => {
    // 当前主题变量值。
    const variableValue = editorRootStyle.getPropertyValue(variableName);
    if (variableValue) {
      host.style.setProperty(variableName, variableValue.trim());
    }
  });
};

/**
 * 创建全屏 Dialog 宿主节点。
 *
 * 挂载点跟随编辑器所在根:编辑器位于 shadow DOM 时挂同一 ShadowRoot
 * (meditor 样式注入在 shadow root 内,body 挂载会脱离样式作用域),
 * 普通文档流时挂 document.body。
 *
 * 注意:shadow DOM 场景下宿主位于应用的局部层叠上下文内,应用的 body 级
 * 浮层(下拉/弹窗 backdrop)会整体压过 shadow 内部并截走点击。需要绝对置顶
 * 的弹窗应改用 createBodyDialogHost + ensureDialogStyleInjected(样式自带,
 * 挂 body 顶层),见图片预览/上传弹窗。
 *
 * @param editorNode 编辑器内部任意节点(用于定位 .zt-md 主题根与挂载根)
 * @param className 宿主附加类名(区分不同弹窗)
 */
export const createFullscreenDialogHost = (editorNode: HTMLElement, className: string): HTMLDivElement => {
  // 当前编辑器主题容器。
  const editorRoot = editorNode.closest('.zt-md');
  // 当前编辑器主题类名。
  const themeClassName = editorRoot?.classList.contains('zt-md-dark') ? 'zt-md-dark' : 'zt-md-light';
  // 挂载根:shadow DOM 场景挂同一 ShadowRoot,否则挂 body。
  const mountRoot = editorNode.getRootNode();
  const dialogMount: HTMLElement | ShadowRoot = mountRoot instanceof ShadowRoot ? mountRoot : document.body;
  // DOM 弹窗挂载宿主。
  const host = document.createElement('div');
  host.className = `zt-md zt-md-dialog-host ${className} ${themeClassName}`;
  syncDialogHostThemeVariables(host, editorRoot);
  // z-index 顶到天花板(与面板 overlay 根同级):shadow root 内后追加者胜出,
  // 确保 dialog 盖住面板本体;CSS 里的 1300 仅供普通文档流场景兜底。
  host.style.zIndex = '2147483647';
  dialogMount.appendChild(host);
  return host;
};

/**
 * 确保 CSS 文本已注入主文档(幂等,按 style 标签 id 判重)。
 *
 * 供"挂 body 顶层"的弹窗使用:shadow DOM 宿主的 meditor 样式只存在于
 * shadow root 内,body 层弹窗需要自带样式才能正常渲染。
 */
export const ensureDialogStyleInjected = (styleId: string, css: string): void => {
  if (document.getElementById(styleId)) {
    return;
  }

  const styleElement = document.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = css;
  document.head.appendChild(styleElement);
};

/**
 * 创建挂载在 document.body 顶层的 Dialog 宿主。
 *
 * 与 createFullscreenDialogHost 的差异:绕开 shadow root,直接挂 body,
 * 弹窗层级与应用 body 级浮层同一层级的比较,配合 max z-index 保证置顶可点。
 * 样式作用域由调用方经 ensureDialogStyleInjected 自行注入(组件自带 CSS)。
 *
 * 注意:全局样式把 .zt-md.zt-md-dialog-host 设为 pointer-events:none
 * (背景穿透,源自图片上传弹窗),弹窗内容必须在自身 CSS 里显式声明
 * pointer-events:auto 恢复可点,否则整层点击穿透到下层页面 —— 桌面壳的
 * 自绘标题栏按钮(如关闭)会被误触。
 */
export const createBodyDialogHost = (editorNode: HTMLElement, className: string): HTMLDivElement => {
  // 当前编辑器主题容器。
  const editorRoot = editorNode.closest('.zt-md');
  // 当前编辑器主题类名。
  const themeClassName = editorRoot?.classList.contains('zt-md-dark') ? 'zt-md-dark' : 'zt-md-light';
  // DOM 弹窗挂载宿主(始终顶层文档)。
  const host = document.createElement('div');
  host.className = `zt-md zt-md-dialog-host ${className} ${themeClassName}`;
  syncDialogHostThemeVariables(host, editorRoot);
  host.style.zIndex = '2147483647';
  document.body.appendChild(host);
  return host;
};
