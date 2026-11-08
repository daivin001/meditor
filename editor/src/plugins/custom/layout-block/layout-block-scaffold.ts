/**
 * plugins/custom/layout-block/layout-block-scaffold.ts — 沙箱执行/展示卡脚手架
 *
 * `meditor-layout:js` 块内容为裸脚本,`meditor-layout:html` 块内容为 HTML 卡片,
 * 均运行于 srcdoc iframe(js = sandbox="allow-scripts",html = sandbox="" 即全禁,
 * 刻意不含 allow-same-origin → 不透明 origin,无父文档/存储/Cookie 访问权)。
 * 本模块负责把内容包成脚手架文档,并约定与父文档的 postMessage 协议:
 * - 脚手架提供 `meditorLayout.resize(height)` 助手与内容变化的自动高度回报
 *   (html 脚手架只包含引导脚本,内容 HTML 原样嵌入);
 * - 所有消息带 `__meditorLayout: true` 标记,父端按 `event.source === iframe
 *   .contentWindow` 校验来源。
 * 安全边界:iframe sandbox 是唯一防线(Tauri csp:null),v2 不做网络隔离
 * (js 脚本可 fetch 外部地址),宿主可用 layoutBlock.enableScript 关闭执行。
 */

/**
 * 父↔沙箱消息的约定标记字段。
 */
export const MEDITOR_LAYOUT_MESSAGE_FLAG = '__meditorLayout';

/**
 * 沙箱内用于挂载渲染结果的容器 id(脚手架约定)。
 */
export const MEDITOR_LAYOUT_APP_ID = 'app';

/**
 * 高度回报消息体。
 */
export interface MeditorLayoutResizeMessage {
  /** 约定标记(恒 true)。 */
  [MEDITOR_LAYOUT_MESSAGE_FLAG]: true;
  /** 消息类型。 */
  type: 'resize';
  /** 请求的卡片高度(px)。 */
  height: number;
}

/**
 * 转义脚本中的 `</script` 序列,防止用户脚本提前闭合脚手架的 script 标签
 * (在 JS 字符串字面量里 `<\/script` 与 `</script` 等值,不改变语义)。
 */
const escapeScriptClose = (script: string): string => {
  return script.replace(/<\/(script)/gi, '<\\/$1');
};

/**
 * 转义内容 HTML 中的 `</script` 序列,防止用户内容提前闭合脚手架的
 * bootstrap script 标签(HTML 卡片以文本形式内联在脚手架 body 里,
 * 唯一能逃出沙箱文档结构的通道就是截断引导脚本标签)。
 */
const escapeInlineScriptClose = (html: string): string => {
  return html.replace(/<\/(script)/gi, '<\\/$1');
};

/**
 * 量高引导脚本(load/resize/MutationObserver → rAF 合并回报,js/html 共用)。
 */
const RESIZE_BOOTSTRAP = `
var __post = function (msg) {
  msg[${JSON.stringify(MEDITOR_LAYOUT_MESSAGE_FLAG)}] = true;
  parent.postMessage(msg, '*');
};
window.meditorLayout = {
  resize: function (h) { __post({ type: 'resize', height: Number(h) || 0 }); }
};
var __scheduled = false;
var __report = function () {
  if (__scheduled) return;
  __scheduled = true;
  requestAnimationFrame(function () {
    __scheduled = false;
    var b = document.body;
    __post({ type: 'resize', height: b ? Math.ceil(b.getBoundingClientRect().height) : 0 });
  });
};
window.addEventListener('load', __report);
window.addEventListener('resize', __report);
new MutationObserver(__report).observe(document.documentElement, { childList: true, subtree: true, attributes: true });`;

/**
 * 构建 JS 沙箱执行卡的脚手架 HTML(srcdoc 内容)。
 */
export const buildJsScaffold = (script: string): string => {
  return [
    '<!doctype html><html><head><meta charset="utf-8">',
    '<style>html,body{margin:0;padding:0;}body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",system-ui,sans-serif;font-size:14px;line-height:1.6;color:#1f2329;}</style>',
    `<script>${RESIZE_BOOTSTRAP}</script>`,
    `</head><body><div id="${MEDITOR_LAYOUT_APP_ID}"></div>`,
    `<script>${escapeScriptClose(script)}</script>`,
    '</body></html>',
  ].join('');
};

/**
 * 构建 HTML 沙箱展示卡的脚手架 HTML(srcdoc 内容;内容原样内联,仅包
 * 量高引导——父端靠 postMessage 拿高度,sandbox 保持全禁不需要
 * allow-same-origin 读 contentDocument)。
 */
export const buildHtmlScaffold = (html: string): string => {
  return [
    '<!doctype html><html><head><meta charset="utf-8">',
    '<style>html,body{margin:0;padding:0;}body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",system-ui,sans-serif;font-size:14px;line-height:1.6;color:#1f2329;}</style>',
    `<script>${RESIZE_BOOTSTRAP}</script>`,
    `</head><body><div id="${MEDITOR_LAYOUT_APP_ID}">`,
    escapeInlineScriptClose(html),
    '</div></body></html>',
  ].join('');
};
