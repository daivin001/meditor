/**
 * types/vite-inline.d.ts — Vite `?inline` 导入声明
 *
 * `?raw` 后缀让 Vite 把文件以字符串模块导出(导出 HTML 内联样式用),
 * TypeScript 需要模块声明才能通过类型检查。
 */
declare module '*?raw' {
  const content: string;
  export default content;
}
