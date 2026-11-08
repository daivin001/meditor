/**
 * index.ts — @meditor/editor 包入口
 *
 * 导出编辑器工厂（createMeditor / MeditorApi / MeditorOptions）
 * 与全部公开类型（MilkdownEditorProps、ToolbarConfig 等）。
 * 样式经 meditor.ts 顶部的 CSS import 随构建抽出为 dist/meditor.css，
 * 消费方需另行引入：`import '@meditor/editor/style.css'`。
 */
export * from './meditor';
export * from './types/editor';
// P4 协作能力门面(版本历史 / 评论锚定 / 实时协同)。
export * from './collab';
// 显示控制布局块(meditor-layout)纯文本管线:LLM 导出剥离/枚举。
export * from './utils/layout-block-export';
// 布局指令解析(meditor-layout JSON → 渲染效果)。
export * from './utils/layout-directive';
