# Changelog

本项目的版本演进：`@meditor/editor` 组件包与 MEditor 桌面应用各自独立编版本。

## @meditor/editor 0.5.3

### 修复

- **协同绑定后 slash 菜单永久缺席**：collab `enableRealtime` 对运行中视图执行
  `state.reconfigure`（追加 ySync/yUndo/yCursor），prosemirror-view 对插件数组
  换新会先销毁全部旧插件 view 再按新表重建——slash 菜单 DOM 在插件加载体中
  只创建一次，旧 view 的 `destroy()` 将其从 portal 摘走后，重建的 view 不再补挂，
  导致敲 `/` 与工具栏 `+` 静默失效。现于插件 `view()` 中补挂脱连的菜单根元素
  （同一元素复用，事件监听不受影响）。宿主协同挂载（备忘录/云盘文档等）均命中。

## @meditor/editor 0.5.2 / MEditor 桌面应用 0.1.8（首个开源版本）

### @meditor/editor（组件包）

- 所见即所得编辑核心：Milkdown/ProseMirror 驱动，完整/简洁双工具栏模式、响应式单行收起、块手柄、slash 菜单
- 数据块：Canvas CSV 表格（mtable）与七种数据库视图（jsonview），共用零依赖 CSV 解析（csvkit）
- 图表与公式：Mermaid 代码块直接渲染（沙箱 iframe），KaTeX 行内/块级公式
- 中文输入增强：中文符号快捷输入（【】任务项、1。/1、有序列表、》引用、～～删除线）、无空格任务列表方括号、拼音表情搜索、智能标点
- AI 助手面板：OpenAI 兼容流式接口，可注入自定义传输实现
- 实时协同：Yjs 协同数据层与版本历史
- 脚注、front-matter、TOC、大纲面板、标题锚点与自动编号、竖排模式、layout 布局块、emoji 自动补全、auto-pair、行内扩展语法
- 图片：行内节点、data URL 内嵌、粘贴/拖拽上传策略可配置
- 导出：独立 HTML（内联样式 + 标题锚点）
- 表格增强：单元格合并/拆分、HTML 表格粘贴解析、列宽 schema

### MEditor 桌面应用

- 基于 Tauri 2（Rust）的 Windows 桌面壳：打开/保存/另存为、脏状态确认、原生菜单
- `.md/.markdown/.mdx` 文件关联、单实例转发打开、拖拽/命令行打开
- 图片内嵌 data URL（单文件自包含）、本地图床（PicGo 等）上传转发
- 明暗主题跟随系统、多语言（zh-CN/en-US）、设置持久化
- 非 UTF-8 文件按 GB18030 兜底读取，保存一律 UTF-8

### 工程化

- npm workspaces monorepo（editor + 三个子包），全部依赖走公共 npm registry
- vitest 测试（42 用例）、Biome lint、GitHub Actions CI
