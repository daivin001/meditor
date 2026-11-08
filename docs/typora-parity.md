# Typora 对齐特性指南

本编辑器对照 Typora 功能清单实现的能力总览,含语法与使用入口。所有特性均已
进入 `@meditor/editor` 组件层(宿主可直接复用),桌面壳已全部接入。

## 编辑器组件层(editor/)

### 图表:Mermaid

- ```` ```mermaid ```` 代码块**默认直接渲染**为图表(流程图/时序图/甘特图等
  Mermaid 全语法);点预览按钮可切回源码编辑,改语言或内容后自动回到渲染态。
- 渲染在无脚本权限的沙箱 iframe 中进行(mermaid `securityLevel: 'strict'`),
  主题随编辑器明暗态自动切换;语法错误时块内显示失败原因。
- 语言下拉已内置 Mermaid 项;slash 菜单「Mermaid 图表」可插入预置骨架。

### 目录与大纲

- **`[toc]`**:独立段落写 `[toc]` 即生成目录块(可点击跳转,标题变更自动刷新)。
- **标题锚点**:每个标题按文本生成稳定 id(如 `#项目-简介`,同名追加 `-1`),
  锚点 id 同时写入导出 HTML 的 `id` 属性。
- **文内跳转**:`[任意文字](#标题文本)` 普通点击即跳转(只读态同样可跳),
  外部链接仍为 Ctrl+点击新窗口。
- **大纲 API**:`api.getHeadings()` / `api.scrollToHeading(id)` /
  `options.onHeadingsChange(headings)`(轻防抖),供宿主渲染大纲侧栏。

### 行内格式扩展

| 语法/入口 | 效果 | 往返形态 |
|---|---|---|
| `==文字==`(输入或粘贴) | 默认色高亮 | `<span style="background-color:#fbf3db">`(合法行内 HTML) |
| `^文字^`(输入或粘贴) | 上标 | `<sup>` |
| 工具栏/选区菜单下划线按钮、`Ctrl+U` | 下划线 | `<u>` |
| 工具栏/选区菜单下标按钮 | 下标 | `<sub>` |

> 注:GFM(及 GitHub/多数渲染器)把单波浪线 `~x~` 解析为**删除线**,与 Typora
> 的 `~下标~` 语法天然冲突。本项目遵循 GFM(单/双波浪线均为删除线),下标经
> 工具栏插入、以 `<sub>` 行内 HTML 往返,其他渲染器无损兼容。

### 脚注

- 语法:`正文[^1]继续。` + 文末 `[^1]: 说明文字。`
- 引用标记渲染为可点击的上标胶囊(点击滚动到定义);定义块在文档末尾,
  内容可正常编辑。
- slash 菜单「脚注」一键插入:自动取下一个可用编号并在文末补定义块。

### YAML Front Matter

- 文档开头的 `--- ... ---` 元数据块,原生可编辑(等宽虚线框样式)。
- 基于 remark 官方 frontmatter 扩展,round-trip 幂等。

### 表格合并/拆分单元格

- 表格右上角「更多」菜单新增**合并单元格**/**拆分单元格**(菜单首组);
  合并针对跨单元格选区(拖选/Shift 点击多格),拆分针对已合并的单元格。
- markdown 表示沿用 Typora 策略:不含合并的表格照常输出 GFM 管道表格;
  含跨列/跨行的表格输出为 HTML `<table>` 块(合法 CommonMark,其他渲染器
  可直接渲染),单元格内容以内联 HTML 保留(粗体/公式/颜色等)。
- 解析侧同时兼容两种形态:块级 html 表格,以及 milkdown 管线产出的
  「段落 + 行内 html 叶子」形态;网格归一化保证不合规 HTML 不炸编辑器。

### 写入模式

- **专注模式**:`api.setFocusMode(bool)` — 光标所在段落全亮,其余淡化(悬停临时恢复)。
- **打字机模式**:`api.setTypewriterMode(bool)` — 光标行始终保持在编辑区垂直中线附近。

### 编辑体验

- **自动配对括号**:`options.autoPair`(默认开)。键入 `(` `[` `{` 及中文括号
  自动补全成对;有选区时包裹选区;键入闭括号时若光标后已是同符号则跳过(overtype)。
  仅括号类,不配对引号(避免 don't / 引号开头的误伤)。
- **Emoji `:` 补全**:`options.emojiAutocomplete`(默认开)。空白后键入 `:` 继续
  输入中文/拼音/英文关键词,Enter/Tab/点击插入 emoji,Esc 关闭。
- **智能标点(SmartyPants)**:`options.smartPunctuation`(默认关)。键入时把直引号
  按邻位转成弯引号(`"` → “/”)、`--` → –、`–-` → —(连打三横线得长破折号)、
  `...` → …;代码/公式内不生效。
- **严格换行(GFM)**:`options.strictLineBreaks`(默认关)。开启后段落内单独
  换行显示为空格而非换行;仅影响显示,序列化始终保留源换行。
- **标题自动编号**:`options.headingNumbering`(默认关)。h1~h6 按 CSS counter
  显示 `1.` / `1.1` / `1.1.1` 编号,仅显示不改内容;桌面壳导出 HTML/打印同步带编号。
- **Markdown 扩展开关**:`options.markdownFeatures`(math/superscript/subscript/
  highlight/mermaid,默认全开)。关闭项的语法文本原样保留(不丢内容),
  对应工具栏按钮/语言下拉/菜单入口一并隐藏。
- **代码块行号/自动换行**:`options.codeBlock.lineNumbers` / `.wordWrap`。
  行号按每行实测坐标定位(自动换行下与可视行精确对齐);换行开关控制
  长行折行或横向滚动。
- **图片显示地址解析**:`options.resolveImageUrl(src)`。文档中的相对路径图片
  (assets 策略)经宿主转换为可显示地址;markdown 内容始终存相对引用。

### 导出

- `api.getStandaloneHtml()`:整篇渲染结果导出为**零依赖单文件 HTML**
  (内联编辑器与 KaTeX 样式;公式/高亮/图表 SVG 全部保留;标题锚点落为 `id`,
  目录与内链可跳转;附打印适配样式)。
- 宿主保存为 `.html` 或装入隐藏 iframe 调 `print()` 即"导出 PDF"。

### 运行时杂项

- `api.setSpellcheck(bool)`:拼写检查开关;`api.setSpellcheckLang(lang)`:
  拼写检查语言(编辑区 `lang` 属性,浏览器据此选词典)。
- 修复:颜色/高亮 mark 的 markdown 解析 runner 缺少子内容消费与闭 mark,
  曾导致 `<span style>`/`<mark>` 载入时丢字且染色范围泄漏到段落后续内容。

## 桌面壳(client/)

- **大纲侧栏**:菜单「大纲」开关(记忆偏好),点击条目跳转;编辑区自动让位;
  大纲显示层级(H1–H3 … 全部)可调。
- **导出菜单**:「导出 HTML…」(存盘)/「打印 / 导出 PDF…」(系统打印对话框,
  只打印文档内容),`Ctrl+P` 打印;导出/打印自动**内嵌相对路径图片**为
  data URL(单文件自包含),并按偏好注入 `@page` 页边距、正文字体/字号/行距
  与标题编号。
- **最近文件**:菜单顶部最近 10 个文件,点击直开。
- **设置面板**(对齐 Typora 偏好设置信息架构,按分区组织):
  - 通用:界面语言(中/英)/ 明暗主题 / **自定义主题**(themes 文件夹放 `.css`
    即出现在主题列表,可一键打开主题文件夹)/ 版式;
  - 编辑器:正文字体/字号/行距 / **视图缩放**(Ctrl+滚轮、Ctrl+=/-/0,60%~300%
    记忆)/ 专注 / 打字机 / 自动配对 / Emoji 补全 / 拼写检查(+语言)/
    智能标点 / 严格换行 / 标题自动编号 / 大纲层级;
  - **图片**(对齐 Typora 图像偏好):插入时三策略 —— 内嵌 base64(默认)/
    复制到「文档名.assets」文件夹(markdown 写相对引用,未保存文档回退内嵌)/
    上传图床(**PicGo Server** `POST /upload`,或 **自定义上传命令**——
    图片路径追加为末参数、stdout 输出 URL,Typora 同款约定);带测试上传按钮;
  - Markdown 扩展:行内公式 / 上标 / 下标 / 高亮 / Mermaid 逐项开关;
  - 代码块:显示行号 / 自动换行;
  - 文件:**自动保存**(定时把脏页签写盘,30s/1min/5min);
  - 打印 / PDF:页边距(默认/窄/宽/无);
  - 自定义 CSS(实时生效,可覆盖 `--zt-*` 令牌换字体配色)。
- **状态栏阅读时长**:按 400 词/分钟估算。
- 全部偏好持久化 localStorage;主题偏好首启跟随系统,之后以手动选择为准。
- Rust 侧新增命令:图片资产落盘(save_image_asset)/ 临时文件(write_temp_bytes)/
  图床 HTTP 转发(http_post_json,避开 WebView 对 localhost 的 CORS)/
  自定义上传命令(run_upload_command)/ 主题目录扫描(list_dir_files)/
  资源管理器定位(reveal_in_shell)。

## dev 验证页

`client/dev-feature-test.html`(dev 服务器访问,控制台执行
`await window.__runFeatureChecks()` 与 `await window.__runSettingsChecks()`),
覆盖:front matter / `==高亮==` / `^上标^` / 脚注 / `[toc]` / Mermaid 渲染 /
标题锚点与大纲 / 内链跳转 / 独立 HTML 导出 / round-trip / 表格合并 round-trip /
扩展开关(高亮/上标字面保留、Mermaid 预览关闭)/ 严格换行 / 标题编号 /
代码块行号与换行,当前 19/19 通过;智能标点(`--` → –)经真实键盘事件验证。

## 已知取舍

| 项 | 决策 |
|---|---|
| `~下标~` 语法 | 让位于 GFM 删除线(单波浪线),下标走工具栏 + `<sub>` HTML |
| `==高亮==` 序列化 | 首次保存后固化为 `<span style>` 形态(合法 CommonMark,渲染器兼容) |
| 发布到 WordPress/Ghost | 未实现(需外部服务集成,超出本次范围) |
| pandoc 系导出(Word/LaTeX 等) | 未实现(依赖 pandoc 安装,保持系统打印/HTML 导出) |
| 文件树侧边栏/模糊打开 | 未实现(产品形态为多页签单文件,与 Typora 文件树模型不同) |
