/**
 * style-inline.ts — meditor 样式的文本形式导出
 *
 * 供 shadow DOM 宿主注入使用:页面主文档层的 <link>/<style> 无法穿透
 * ShadowRoot 隔离(:host { all: initial }),面板类宿主需要拿到 CSS 文本
 * 自行注入 shadow root。普通页面场景继续走 meditor.ts 顶部的 CSS import。
 *
 * 注意:editor.css 的 @import(tokens/modules)由构建期展开合并,
 * block-handle.css / toolbar.css 是插件独立引入的,需一并列出。
 */
import katexCss from 'katex/dist/katex.min.css?inline';
import editorCss from './styles/editor.css?inline';
import blockHandleCss from './plugins/custom/block-handle/block-handle.css?inline';
import toolbarCss from './plugins/custom/toolbar/toolbar.css?inline';
import mtableBlockCss from './plugins/custom/mtable/mtable-block.css?inline';
// mtable 组件包自带样式(canvas 表格视觉),随包源码一并合并。
import mtableCss from '../packages/mtable/src/styles/mtable.css?inline';

/** meditor 全部样式的合并 CSS 文本(katex + editor + block-handle + toolbar + mtable) */
export const meditorStyleText: string =
  `${katexCss}\n${editorCss}\n${blockHandleCss}\n${toolbarCss}\n${mtableBlockCss}\n${mtableCss}`;
