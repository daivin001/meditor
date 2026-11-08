/**
 * lib/export-html.ts — 独立 HTML 导出
 *
 * 以编辑器当前渲染 DOM(含 KaTeX 公式、Prism 高亮、Mermaid 静态 SVG、标注块等
 * 全部可见形态)为源,套独立文档壳 + 内联编辑器样式,产出零依赖的单文件 HTML:
 * - 标题 data-anchor-id 落为 id 属性(#锚点 链接与 [toc] 条目可跳转);
 * - 剥离 contenteditable 等编辑态痕迹;
 * - 打印友好(@media print 去背景阴影)。
 */
import editorCss from '../styles/editor.css?raw';
import katexCss from 'katex/dist/katex.min.css?raw';

/**
 * 需要从导出 DOM 剥离的属性(编辑态痕迹)。
 */
const STRIPPED_ATTRIBUTES = ['contenteditable', 'aria-label', 'aria-readonly', 'spellcheck'];

/**
 * 把标题装饰的 data-anchor-id 落为 id 属性(TOC/文内锚点跳转依据)。
 */
const resolveAnchorIds = (root: Element): void => {
  root.querySelectorAll('[data-anchor-id]').forEach((element) => {
    const anchorId = element.getAttribute('data-anchor-id');
    if (anchorId && !element.id) {
      element.id = anchorId;
    }
    element.removeAttribute('data-anchor-id');
  });
};

/**
 * 剥离编辑态属性(避免导出文档残留光标/输入语义)。
 */
const stripEditingAttributes = (root: Element): void => {
  root.querySelectorAll('*').forEach((element) => {
    for (const attribute of STRIPPED_ATTRIBUTES) {
      element.removeAttribute(attribute);
    }
  });
};

/**
 * 从文档标题推断导出标题(首个标题文本,缺省“未命名文档”)。
 */
const resolveDocumentTitle = (contentRoot: Element): string => {
  const firstHeading = contentRoot.querySelector('h1, h2, h3, h4, h5, h6');
  const text = firstHeading?.textContent?.trim();
  return text && text.length > 0 ? text : '未命名文档';
};

/**
 * HTML 特殊字符转义(<title> 等文本位用)。
 */
const escapeHtmlText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * 以编辑器内容 HTML 构建独立单文件 HTML(浅色纸质版式)。
 */
export const buildStandaloneHtml = (contentHtml: string, title?: string): string => {
  // 经 DOMParser 清洗:锚点 id 落地 + 编辑态属性剥离。
  const parsed = new DOMParser().parseFromString(`<div id="meditor-export-root">${contentHtml}</div>`, 'text/html');
  const contentRoot = parsed.getElementById('meditor-export-root');
  if (contentRoot) {
    resolveAnchorIds(contentRoot);
    stripEditingAttributes(contentRoot);
  }
  const cleanedContent = contentRoot?.innerHTML ?? contentHtml;
  const documentTitle = escapeHtmlText(title?.trim() ? title.trim() : resolveDocumentTitle(contentRoot ?? parsed.body));

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="generator" content="Meditor" />
<title>${documentTitle}</title>
<style>
${katexCss}
</style>
<style>
${editorCss}
</style>
<style>
/* 导出文档壳:纸质版心 + 打印适配(编辑器 chrome 类不参与) */
html, body { margin: 0; padding: 0; background: var(--zt-bg, #f5f5f5); }
.meditor-export {
  margin: 0 auto;
  max-width: 820px;
  padding: 48px 32px 96px;
}
.meditor-export .zt-md-editor { overflow: visible; }
@media print {
  html, body { background: #ffffff; }
  .meditor-export { max-width: none; padding: 0; }
  .zt-md { box-shadow: none !important; border: none !important; }
}
</style>
</head>
<body>
<main class="meditor-export">
  <div class="zt-md zt-md-light meditor-export-doc">
    <div class="zt-md-editor" aria-readonly="true">
      <div class="ProseMirror">
${cleanedContent}
      </div>
    </div>
  </div>
</main>
</body>
</html>`;
};
