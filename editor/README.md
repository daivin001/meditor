# @meditor/editor

纯 TypeScript DOM 的 Milkdown Markdown 所见即所得编辑器组件包（无 React 依赖）。

## 安装

```bash
npm install @meditor/editor
```

包自身将 milkdown 全家桶、katex、refractor 等声明为 dependencies；消费方 bundler 直接从 node_modules 解析即可。数据块子包 `@meditor/jsonview`、`@meditor/mtable`、`@meditor/csvkit` 作为依赖自动带入（构建期打包进产物，无需单独安装）。

## 用法

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
```

```ts
api.getMarkdown();     // 读取当前 markdown
api.setMarkdown(md);   // 整体替换内容
api.focus();
api.destroy();
```

## 工具栏模式

`toolbar.mode` 支持：

- `'full'`（默认）— 完整工具栏 30 按钮（撤销/重做/块转换/行内格式/列表/引用/标注块/折叠块/代码块/分割线/表格/CSV数据/Json数据/图片/视频/音频/网页书签/第三方内嵌/行内公式/公式块/表情/清除格式/搜索/翻译）
- `'simple'` — 简洁工具栏 10 按钮（块转换/加粗/斜体/删除线/行内代码/三种列表/链接/翻译），适合面板等窄空间场景
- `toolbar.items` 显式传入时按 items 渲染，覆盖 mode（顺序即渲染顺序，左右完全由宿主控制）
- `toolbar.exclude` 从最终按钮集剔除指定命令（对 items 与内置默认集同样生效），适合只想去掉个别按钮的场景，如 `toolbar: { exclude: ['translate'] }`

### 响应式收起（始终单行）

容器变窄时工具栏**不会换行**，而是按内置优先级从低频按钮开始逐个收起，拉宽后自动还原：

- 收起顺序按「长尾能力（数据/内嵌/媒体/公式等）→ 有快捷键兜底的（撤销/重做等）→ 简洁模式集 → 宿主定制项」编排，中等宽度下的退化结果即简洁工具栏，极窄时再从简洁集尾部继续让位；
- 块转换、加粗、斜体、链接四枚核心按钮永不收起，保证任意宽度下都能完成最基本操作；
- 分隔线随按钮收敛（首尾与相邻的空分隔线自动隐藏）；
- 触发源为 ResizeObserver（容器宽度变化，含宿主布局切换）与 window resize，两者都只在宽度变化时重算，避免收起引发布局回环。

### 工具栏对齐

`toolbar.align` 控制按钮整体对齐方式，默认 `'left'` 靠左：

```ts
toolbar: { align: 'center' }   // 'left'(默认) | 'center'(居中) | 'right'(靠右)
```

块转换下拉面板会自动跟随触发钮位置，靠右/居中时超宽会向左收拢防溢出。

## 中文符号快捷输入

`chineseSymbols`（默认 `true`）控制中文输入法同键符号的快捷输入规则：

| 输入（行首，敲空格触发） | 效果 |
| --- | --- |
| `1。 ` / `1、 ` | 有序列表（序号写入起始编号） |
| `》 ` | 引用块 |
| `～～文字～～` | 删除线（双波浪，单波浪如“3～5个”不触发） |
| `【】 ` / `【x】 ` / `【X】 ` | 任务列表项（未勾选/已勾选） |

对应的英文规则（`1. `、`> `、`~~文字~~`）不受该开关影响，始终可用；关闭方式：

```ts
createMeditor({ chineseSymbols: false })
```

## 任务列表快捷输入

- `[ ] ` / `[x] ` — 内置 gfm 规则（括号内带空格）
- `[] ` / `[x] ` / `[X] ` — 无空格英文方括号（本包增强，始终可用）
- `【】 ` / `【x】 ` / `【X】 ` — 中文方括号（受 `chineseSymbols` 开关控制）

均需在列表项内触发（如先敲 `- ` 再敲 `[] `），转换同 markdown 语义：勾选标记写入列表项 checked 属性。

## 加号菜单（slash 菜单）

块手柄 + 按钮与 `/` 唤出的全功能菜单：

- 不含「普通文本」「@今天」入口（正文转换用工具栏“正文 ▾”或块转换）
- 标题项顶格显示，无“标题”分组标题行
- 超高可滚动，滚动条隐藏，滚动中任意位置上下缘留白
- `slashMenu.items` 显式传入时按 items 渲染，覆盖内置集

## 视觉规范

light 主题灰阶为无色偏中性灰（历史版本为蓝调灰，白底上观感偏粉）：

- `--zt-bg` #f5f5f5（工具栏底）/ `--zt-elevated` #f0f0f0（代码块、公式块、表格表头、行内代码、引用块底）/ `--zt-border` #d4dde9
- 正文色 `--zt-fg` #3a4657（柔和藏蓝，对比度约 9:1）
- 交互底色：hover `#ececec`、选中 `#e0e0e0`；浮在白底上的菜单 hover/选中用 `--zt-elevated`
- mtable（CSV/Json 数据块）canvas 同族中性灰：表头 #F5F5F5、选中格 rgba(0,0,0,0.05)、滚动条滑块 #D4D4D4；选区描边保持主蓝

## 块手柄

语雀风格块手柄（hover 块时左侧浮现 + 插入 / 拖拽把手）。`blockHandle.enabled` 未显式配置时：

- `toolbar.mode` 为 `'full'`（默认）→ 块手柄开启，编辑区左侧留手柄列（左 padding 3.25rem）
- `toolbar.mode` 为 `'simple'` → 块手柄关闭，编辑区左右 padding 对称（1.25rem）

显式传入 `blockHandle: { enabled: true/false }` 时以显式值为准。

## 主要配置项（MeditorOptions）

| 字段 | 说明 |
| --- | --- |
| `root` | 挂载根节点（必需） |
| `value` / `defaultValue` | 受控 / 非受控内容 |
| `onChange` | 内容变更回调 |
| `theme` | `'light' \| 'dark'` |
| `locale` | `'zh-CN' \| 'en-US'` |
| `readOnly` | 只读模式 |
| `maxHeight` | 编辑区最大高度 |
| `toolbar` | `{ visible?, mode?: 'simple' \| 'full', align?: 'left' \| 'center' \| 'right', items?, exclude? }` |
| `chineseSymbols` | 是否支持中文符号快捷输入（【】任务项、1。/1、有序列表、》引用、～～删除线）；默认 `true` |
| `blockHandle` | `{ enabled? }` 语雀风格块手柄（+ 插入 / 拖拽）；未配置时随 `toolbar.mode` 联动（simple 关 / full 开） |
| `slashMenu` | `{ enabled?, items? }` |
| `imageUpload` | `{ upload?, maxFileSize?, allowedProtocols? }` |
| `headerSlot` | 头部插槽（DOM Node） |

完整字段见 `dist-types` 中的 `types/editor.d.ts`（`MilkdownEditorProps`）。

## milkdown 单实例提示

milkdown 的 `SliceType`/`TimerType` 以 Symbol 为 key，若同一页面存在多份 milkdown 模块副本会出现 "Timer InitReady not found" / "Context nodes not found" 等错乱。消费方 bundler 建议将 `@milkdown/*` 各包 alias 钉到其 `lib/index.js` 真实入口文件（参考本仓库 `client/vite.config.ts` 的 `milkdownAliasEntries` 做法），确保全站仅解析到单一模块副本。

## 开发

本仓库为 npm workspaces monorepo，在仓库根目录执行：

```bash
npm install        # 根目录一次安装全部 workspace 依赖
npm test           # 运行全部 vitest 测试
npm run build      # 构建编辑器组件包（dist/ + dist-types/）
npm run typecheck  # 类型检查
```

子包源码位于 `packages/`（csvkit / jsonview / mtable），编辑器构建期经 vite alias 直引其源码，改动即生效，无需先构建子包。

## License

[MIT](../LICENSE)
