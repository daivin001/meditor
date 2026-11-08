/**
 * plugins/custom/code-block/code-block-mermaid.ts — Mermaid 图表渲染辅助
 *
 * 懒加载 mermaid(动态 import,不拖累首屏),把 ```mermaid 代码块内容渲染为
 * 静态 SVG 字符串,交给代码块 NodeView 注入沙箱 iframe(sandbox 无脚本权限,
 * CSP 仅放行内联样式 —— mermaid v10+ 内置 DOMPurify,securityLevel:'strict'
 * 再收一道 HTML 标签注入)。主题随编辑器明暗态(.zt-md-dark)切换。
 */
import type { EditorI18nMessages } from '../../../types/editor';

/**
 * Mermaid 语言值。
 */
export const MERMAID_LANGUAGE = 'mermaid';

/**
 * 渲染序号(mermaid.render 要求全局唯一 id)。
 */
let renderSequence = 0;

/**
 * mermaid 实例最小接口(避免依赖其内部类型)。
 */
interface MermaidLike {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, text: string) => Promise<{ svg: string }>;
}

/**
 * 已初始化的 mermaid 实例缓存(懒加载,失败不再重试)。
 */
let cachedMermaid: MermaidLike | null = null;

/**
 * 缓存实例对应的主题(initialize 只在主题变化时重放)。
 */
let cachedTheme: string | null = null;

/**
 * 判断主题:宿主编辑器容器带 .zt-md-dark 时用暗色主题。
 */
const resolveMermaidTheme = (host: Element): 'dark' | 'default' =>
  host.closest('.zt-md-dark') !== null ? 'dark' : 'default';

/**
 * 加载并初始化 mermaid(主题变化时重新 initialize)。
 */
const ensureMermaid = async (theme: 'dark' | 'default'): Promise<MermaidLike | null> => {
  if (cachedMermaid && cachedTheme === theme) {
    return cachedMermaid;
  }
  if (cachedMermaid && cachedTheme !== theme) {
    cachedMermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme });
    cachedTheme = theme;
    return cachedMermaid;
  }

  const loaded = (await import('mermaid')) as { default?: MermaidLike } & Partial<MermaidLike>;
  const instance = loaded.default ?? (loaded as MermaidLike);
  if (typeof instance?.initialize !== 'function' || typeof instance?.render !== 'function') {
    return null;
  }
  instance.initialize({ startOnLoad: false, securityLevel: 'strict', theme });
  cachedMermaid = instance;
  cachedTheme = theme;
  return instance;
};

/**
 * 把 mermaid 源码渲染为 SVG 字符串;失败抛出原始错误(调用方展示提示)。
 */
export const renderMermaidToSvg = async (code: string, host: Element): Promise<string> => {
  const instance = await ensureMermaid(resolveMermaidTheme(host));
  if (!instance) {
    throw new Error('mermaid unavailable');
  }
  renderSequence += 1;
  const { svg } = await instance.render(`meditor-mermaid-${renderSequence}`, code);
  return svg;
};

/**
 * 构建 Mermaid 预览沙箱文档(静态 SVG,无脚本权限)。
 */
export const buildMermaidPreviewDocument = (svg: string): string => {
  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; object-src 'none'; frame-src 'none'; script-src 'none'; base-uri 'none'" />
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
        background: transparent;
        overflow-wrap: anywhere;
      }
      svg { max-width: 100%; height: auto; }
      #D { display: none; }
    </style>
  </head>
  <body>${svg}</body>
</html>`;
};

/**
 * 创建 Mermaid 渲染失败提示元素。
 */
export const createMermaidErrorElement = (
  error: unknown,
  messages: EditorI18nMessages
): HTMLDivElement => {
  const element = document.createElement('div');
  element.className = 'zt-md-code-block-preview-error';
  element.setAttribute('role', 'alert');
  element.textContent = `${messages.codeBlockMermaidRenderError}${error instanceof Error && error.message ? `: ${error.message}` : ''}`;
  return element;
};
