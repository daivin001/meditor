# MEditor

一款所见即所得（WYSIWYG）的 Markdown 编辑器：**`@meditor/editor`** 是纯 TypeScript DOM 的可复用编辑器组件包（基于 [Milkdown](https://milkdown.dev)/ProseMirror，无框架依赖），**MEditor 桌面应用**（Tauri 2 + Rust）则是基于该组件的 Windows 桌面端。

## 可作为 Typora 的替代

MEditor 以 [Typora](https://typora.io) 为对齐目标逐项实现，桌面端可直接当作 Typora 的替代品日常使用：

| 能力 | 说明 |
|---|---|
| **源码/渲染合一** | 同一视图内编辑，无左右分栏；明暗双主题、可换正文字体/字号/行距 |
| **专注模式 / 打字机模式** | 当前段落高亮其余淡化；光标行始终锚在垂直中线 |
| **图片策略** | 内嵌 base64（默认，`.md` 单文件自包含）/ 复制到 `文档名.assets` 目录并写相对引用 / 上传图床（PicGo Server 或自定义命令，Typora 同款约定） |
| **导出** | 零依赖单文件 HTML；系统打印对话框"导出 PDF"，仅打印正文并自动内嵌相对路径图片 |
| **写作增强** | 智能标点、自动配对括号、Emoji `:` 补全、严格换行、标题自动编号、拼写检查、视图缩放 |
| **Markdown 扩展** | 脚注、YAML Front Matter、高亮/上标/下标/下划线、表格合并拆分、`[toc]` 与标题锚点、Mermaid、KaTeX |
| **偏好设置** | 按 Typora 偏好设置的信息架构分区组织，全部持久化；自定义主题与自定义 CSS |

对齐细节与已知取舍见 [docs/typora-parity.md](docs/typora-parity.md)。相对 Typora 的差异见该文末「已知取舍」一节——`~下标~` 让位于 GFM 删除线、pandoc 系导出（Word/LaTeX）未实现。

## 特性

- **所见即所得** — Milkdown 驱动，Markdown 源码与渲染视图合一；明暗双主题
- **完整工具栏** — 30 个按钮的完整模式与窄容器单行响应式收起，块转换 / 行内格式 / 列表 / 引用 / 标注块 / 代码块 / 分割线 / 表格 / 图片 / 音视频 / 网页书签 / 第三方内嵌 / 公式 / 表情 / 搜索 / 翻译
- **写作模式** — 专注模式（当前段落高亮、其余淡化）、打字机模式（光标行锚定中线）
- **目录与大纲** — `[toc]` 目录块、标题锚点、文内跳转、侧栏大纲
- **脚注与 Front Matter** — `[^1]` 脚注、`---` YAML 元数据块原生可编辑
- **表格合并拆分** — 跨行跨列合并/拆分，按 Typora 策略输出 GFM 或 HTML 表格
- **数据块** — Canvas 渲染的 CSV 表格（`@meditor/mtable`）与七种数据库视图：表格 / 看板 / 画廊 / 列表 / 日历 / 甘特图 / 文本（`@meditor/jsonview`）
- **图表与公式** — Mermaid 图表直接渲染、KaTeX 行内与块级公式
- **中文输入增强** — 中文符号快捷输入（【】任务项、1。有序列表、》引用、～～删除线）、拼音表情搜索、中文标点智能处理
- **AI 助手** — OpenAI 兼容流式接口（DeepSeek / Moonshot / 自建网关等），宿主可注入自有传输实现
- **实时协同** — 基于 Yjs 的协同编辑与版本历史能力（数据层内置，接入方案见源码）
- **块手柄与 slash 菜单** — 语雀风格的块手柄（+ 插入 / 拖拽）、`/` 唤出的全功能加号菜单
- **代码高亮** — refractor 驱动的语法高亮与代码块语言选择
- **导出** — 独立 HTML 导出（内联样式 + 标题锚点）、打印 / 导出 PDF（仅正文，自动内嵌图片）

桌面应用还提供：文件打开/保存/另存为、`.md/.markdown/.mdx` 文件关联、单实例转发打开、拖拽与命令行打开、图片内嵌 data URL 单文件自包含、GB18030 编码兜底读取等。

## 仓库结构

```
meditor/
├── editor/            # @meditor/editor 组件包（含 packages/ 下三个子包）
│   └── packages/
│       ├── csvkit/    # 零依赖 CSV 解析/序列化（RFC 4180）
│       ├── jsonview/  # 数据库视图块（七种视图）
│       └── mtable/    # Canvas CSV 表格编辑器
├── client/            # MEditor 桌面应用（Tauri 2 + Rust + TypeScript）
├── docs/              # 特性文档
└── package.json       # npm workspaces 根配置
```

## 快速开始

### 作为组件使用

```bash
npm install @meditor/editor
```

```ts
import { createMeditor } from '@meditor/editor';
import '@meditor/editor/style.css';

const api = createMeditor({
  root: document.getElementById('editor-host')!,
  defaultValue: '# Hello',
  onChange: (md) => console.log(md),
  theme: 'light',
  toolbar: { mode: 'full' }
});

api.getMarkdown(); // 读取 markdown
```

完整配置项见 [editor/README.md](editor/README.md)。

### 开发桌面应用

```bash
npm install                      # 根目录安装 workspace 依赖
cd client && npm install         # 桌面壳依赖
npm run tauri dev                # 需 Rust 工具链(见 Tauri 文档)
```

### 构建与测试

```bash
npm run build      # 构建编辑器组件包
npm test           # 运行全部测试(vitest)
npm run lint       # Biome lint
npm run typecheck  # 全 workspace 类型检查
```

## 文档

- [editor/README.md](editor/README.md) — 组件包安装、配置项、工具栏模式、中文快捷输入等
- [client/README.md](client/README.md) — 桌面应用功能、开发与打包
- [docs/](docs/) — 特性指南（layout 布局块、Typora 对齐能力清单）
- [CHANGELOG.md](CHANGELOG.md) — 版本变更记录
- [CONTRIBUTING.md](CONTRIBUTING.md) — 参与贡献

## License

[MIT](LICENSE)
