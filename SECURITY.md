# 安全策略

本文档说明 MEditor 的安全模型、已知边界与漏洞报告渠道。

## 支持的版本

| 组件 | 版本 | 支持状态 |
| --- | --- | --- |
| @meditor/editor | 0.5.x | ✅ |
| MEditor 桌面应用 | 0.1.x | ✅ |

## 报告漏洞

**请勿在公开 Issue 中提交安全漏洞。** 请通过 GitHub Security Advisories（仓库
Security 标签页 → Report a vulnerability）私下报告。我们会在 7 天内确认、
修复后协调披露时间线。

## 信任模型

MEditor 是 Typora 类桌面 Markdown 编辑器，会打开**任意来源的 .md 文件**，
文档内容视为不可信输入；协同编辑的远端内容与 AI 生成的输出走同一条渲染管线，
同样视为不可信。

关键推论：桌面壳的 Rust IPC 面包含文件读写、命令执行（图床上传）与 HTTP
转发能力，因此**编辑器 Webview 内的任何脚本注入都可能升级为任意文件读写**。
安全设计的核心目标是：不可信文档内容永远不能在主文档（编辑器自身 Webview）
的源内执行脚本。

### 内容防线（编辑器侧）

| 通道 | 防线 |
| --- | --- |
| Markdown 裸 HTML | 不解析为 DOM——html 叶子以 `textContent` 惰性展示，往返保真但不执行 |
| 链接 / 媒体 / 图片 URL | 统一经协议白名单（http/https/mailto/tel，图片额外允许 data:）+ 控制字符剥离 + 属性注入字符拒绝（`editor/src/utils/security.ts`） |
| 图片 HTML 粘贴 | DOMParser 解析后仅保留 src/alt/title/style 白名单属性 |
| 代码块预览 | srcdoc iframe，sandbox 全禁；仅显式 `html` 语言允许 `allow-scripts`（透明源，无父文档访问权）；Mermaid 先渲染为静态 SVG 再进全禁 iframe |
| layout 块（html/js 卡片） | srcdoc iframe + 脚手架包装：html kind sandbox 全禁（脚本必然不执行），js kind 仅 `allow-scripts`；两者都**不含 allow-same-origin**（不透明 origin，无父文档/存储/Cookie 访问权），高度经 postMessage 桥回报（校验 `event.source` + 消息标记） |
| 公式 | KaTeX 默认配置（未开 `trust`），危险扩展不可用 |
| AI 输出 | 流式阶段 textContent 渲染，完成后经 milkdown 正规解析管线转为节点，从不按 HTML 直接插入 |
| 导出 HTML | 以编辑器已消毒 DOM 为源，标题等文本位转义，无脚本注入新增点 |

### 桌面壳防线（Rust 侧）

- **进程执行入口不暴露命令参数**：自定义图床上传命令的模板由 Rust 侧配置文件
  持有（`upload-command.json`，仅设置界面经 `set_upload_command_config` 写入），
  前端 invoke `run_upload_command` 只传图片路径，不存在"逐次传命令"的 IPC 参数面
- Tauri capability 最小化：仅 `core:window`（自绘标题栏控制）与 dialog 插件
- 单实例转发只传递存在的文件路径，字符串不进入任何求值上下文

### 已知边界（非漏洞，但你应当知道）

1. **CSP 为 null**：沙箱 iframe 是内容防线的一部分。CSP 收紧在路线图上
   （需真机验证 Mermaid/layout 沙箱场景），当前版本不承诺文档级 CSP。
2. **apiKey 明文存储**：AI 模型的 apiKey 存于 Webview localStorage，与
   Typora 等同类工具一致；本机恶意软件可读取。对敏感模型建议使用宿主注入
   （`options.ai.streamChat` 自定义传输，密钥不进 Webview）。
3. **js 布局卡可发起网络请求**：`meditor-layout:js` 在透明源沙箱内执行，
   可 fetch 外部地址（不做网络隔离）。不信任的文档请勿打开，或经设置关闭
   布局块脚本执行。
4. **图床上传命令以用户权限执行**：该命令由用户在设置中配置，等价于用户
   自定义 shell 命令，MEditor 不做内容审查（同 Typora 约定）。

## 安全相关的模块索引

- `editor/src/utils/security.ts` — URL/图片安全校验（协议白名单等）
- `editor/src/plugins/custom/layout-block/layout-block-scaffold.ts` — 沙箱脚手架与 postMessage 协议
- `client/src-tauri/src/lib.rs` — Rust IPC 命令（含上传命令配置持有）
- `client/src-tauri/capabilities/main.json` — Tauri 权限清单
