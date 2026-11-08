# meditor-layout 显示控制块使用指南

> 适用版本:@meditor/editor。meditor-layout 是 meditor 编辑器的
> 编辑器特有能力,**非 Markdown 标准协议**——块内容为纯展示控制信息,不属于
> 文档正文。

## 1. 概述

`meditor-layout` 是一种特殊的围栏代码块,用于在 Markdown 文件中携带**纯展示控制
信息**(布局指令、HTML 卡片、JS 脚本)。设计原则:

- **单文件承载**:内容与展示信息在同一个 .md 文件里,大模型只需面对一个文件;
- **正常模式隐形**:指令块完全隐藏(零占位),展示卡按 kind 渲染,不打断阅读;
- **布局模式编辑**:进入布局模式后所有块展开为源码面板,可查看/编辑/删除;
- **大模型友好**:编辑器提供剥离导出 API,块内自带自描述头,不污染正文信息量;
- **字节级保真**:围栏内容与 info string 原样往返(仅围栏符号统一为反引号),
  在其他 Markdown 渲染器中优雅降级为普通代码块。

三种块形态:

| 围栏写法 | 形态 | 正常模式表现 | 用途 |
| --- | --- | --- | --- |
| ` ```meditor-layout `(JSON 指令) | 指令块 | 完全隐藏(零占位) | 控制其后/全文的布局与样式 |
| ` ```meditor-layout:html ` | HTML 沙箱卡 | 渲染为展示卡(脚本禁执行) | 纯展示的富 HTML 片段 |
| ` ```meditor-layout:js ` | JS 执行卡 | 渲染为执行卡(沙箱内执行) | 脚本驱动的动态展示 |

info string 中 lang 之后的剩余部分(meta)会逐字保留并显示在块徽标上,可用作
作者标注,例如 ` ```meditor-layout:html hero full-bleed `。

---

## 2. 指令块(JSON)

无后缀的 ` ```meditor-layout ` 块,内容为 JSON 对象。**位置语义是核心**:指令
默认作用于其后的顶层内容,直到下一个指令块或文档尾。

### 2.1 字段总览

```json
{
  "scope": "next",
  "heading": "目标章节",
  "width": "wide",
  "align": "center",
  "hidden": false,
  "class": ["hero", "kpi"]
}
```

| 字段 | 类型 | 作用域含义 | 说明 |
| --- | --- | --- | --- |
| `scope` | `"next"` / `"document"` | — | `"next"`(默认)作用于其后内容直到下一个指令块;`"document"` 作用于全文 |
| `heading` | string | 绑定到指定标题章节 | 首个文本匹配(去首尾空格精确比对)的顶层标题及其章节(至下一个级别 ≤ 该标题的标题)。存在时独立生效,不影响位置/文档作用域。**标题改名即失联** |
| `width` | `"narrow"` / `"normal"` / `"wide"` / `"full"` | 内容宽度 | narrow ≈ 680px / wide ≈ 1100px / full 铺满 / normal 默认(无效果)。document 作用域时写入编辑器根属性,作用于整篇内容宽度 |
| `align` | `"left"` / `"center"` / `"right"` | 文本对齐 | 作用于作用域内块 |
| `hidden` | boolean | 显隐 | `true` 时正常模式隐藏作用域内容;**布局模式仍可见**以便定位修复 |
| `class` | string 或 string[] | 自定义类 | 渲染为 `zt-md-ml-c-<name>` 类,是宿主 CSS 的扩展点。名字限 `[a-zA-Z0-9_-]{1,40}`,禁止 `zt-md` 前缀(内部保留) |

### 2.2 作用域详解

- **位置作用域**(默认):指令块"之后"的顶层块逐个应用指令,遇到下一个指令块
  重新开始。**非法 JSON 块不中断作用域**(被忽略,但不算新指令)。
- **文档作用域**:`{"scope": "document", ...}` 与位置无关,作用于全文。多个
  document 指令时**最后一个生效**。document 指令不重置位置作用域。
- **标题绑定**:`{"heading": "..."}` 独立于以上两者,按章节 span 生效,且不进入
  位置/文档状态机(即它既不产生位置效果,也不被位置指令"重置")。

### 2.3 合并规则

一个块同时命中多个指令(位置 + 多个标题绑定)时,按指令块的文档顺序合并:

- `width` / `hidden` / `align`:**后者覆盖前者**;
- `class`:**累加**(去重)。

示例:位置指令 `wide` + 标题绑定 `narrow` 同时命中时,块最终为 `narrow`
(标题绑定通常写在位置指令之后)。

### 2.4 容错

- JSON 解析失败、或 JSON 中**不含任何已知指令字段** → 视为普通数据块:
  无任何效果,黑盒保存,布局模式可编辑;
- 单个非法字段(如错误宽度名、含 `zt-md` 前缀的类名)被忽略,不影响其他字段;
- 任何情况下指令块都不会导致编辑器异常。

### 2.5 完整示例

````markdown
# 数据报告

```meditor-layout
{ "scope": "document", "width": "wide" }
```

## 摘要

(全文 wide:摘要与正文都变宽)

## 深入分析

```meditor-layout
{ "heading": "深入分析", "width": "narrow", "align": "center" }
```

本节收窄并居中,直到下一个二级标题。

```meditor-layout
{ "hidden": true }
```

(本指令之后的内容在正常模式隐藏——例如草稿段落)

```meditor-layout:html hero
<div class="hero"><h1>看板入口</h1></div>
```
````

---

## 3. HTML 沙箱展示卡(`:html`)

` ```meditor-layout:html ` 块在**正常模式**渲染为展示卡,布局模式显示源码。

````markdown
```meditor-layout:html hero
<section class="hero">
  <h1>产品发布</h1>
  <p>全新版本正式上线</p>
</section>
<style>
  .hero { font-family: sans-serif; background: #eef3ff; padding: 24px; border-radius: 12px; }
  .hero h1 { margin: 0 0 8px; color: #1f4fd8; }
</style>
```
````

行为与边界:

- 内容经 `srcdoc` 渲染进 **`sandbox="allow-same-origin"`** 的 iframe——**不含
  allow-scripts,`<script>` 必然不执行**(已用样例验证);
- 样式、图片(http/https)正常生效;高度按内容自适应,上限 720px,超出内部滚动;
- 不含 allow-forms / allow-popups / allow-top-navigation:表单提交、弹窗、
  顶层导航均被禁;
- iframe 内容与父文档零交互(v1 无消息桥)。

---

## 4. JS 沙箱执行卡(`:js`)

` ```meditor-layout:js ` 块在正常模式以 **`sandbox="allow-scripts"`** iframe
执行(刻意**不含 allow-same-origin**:不透明 origin,无父文档/存储/Cookie
访问权),高度经 postMessage 桥回报。

### 4.1 脚手架约定

编辑器把裸脚本包进脚手架文档后执行,脚本可用的约定:

| 约定 | 说明 |
| --- | --- |
| `<div id="app">` | 脚手架预置的挂载容器,推荐把渲染结果写进它 |
| `meditorLayout.resize(h)` | 手动上报卡片高度(px),父端夹取到 [64, 720] |
| 自动高度回报 | load / 窗口变化 / DOM 变更时脚手架自动上报,通常无需手动调用 |

示例:

````markdown
```meditor-layout:js kpi
const app = document.getElementById('app');
app.innerHTML = '<div class="kpi">今日访问 1,024</div>';
app.querySelector('.kpi').style.cssText = 'padding:16px;background:#eef3ff;border-radius:8px;';
meditorLayout.resize(120); // 可选:自动高度回报通常已足够
```
````

### 4.2 安全模型(务必阅读)

- iframe sandbox 是**唯一防线**(Tauri 宿主 csp 为 null):脚本运行在不透明
  origin,无法访问父文档、Cookie、localStorage;
- **不做网络隔离**:脚本可 fetch 外部地址。面向不可信文档(来路不明的 .md)
  的宿主应关闭执行;
- 宿主总闸:`createMeditor({ layoutBlock: { enableScript: false } })`。关闭后
  js 块退化为普通隐藏块(仅布局模式可编辑源码);
- 消息协议带 `__meditorLayout` 标记,父端校验 `event.source === iframe.contentWindow`,
  外部伪造消息不生效。

---

## 5. 编辑器交互

### 5.1 两种模式

| 模式 | 指令块 | html 卡 | js 卡 | 隐藏内容(hidden) |
| --- | --- | --- | --- | --- |
| 正常模式 | 完全隐藏 | 渲染展示卡 | 渲染执行卡 | 隐藏 |
| 布局模式 | 源码面板 | 源码面板 | 源码面板 | 可见(便于定位修复) |

进入/退出布局模式的三种方式:

1. 编辑器工具栏最右「布局模式」按钮(完整工具栏模式);
2. API:`api.setLayoutMode(true / false)` / `api.toggleLayoutMode()`;
3. 桌面壳(client)顶栏 ◆ 按钮,或状态栏「◆ N 布局块」角标。

### 5.2 插入与删除

- **插入**:slash 菜单输入 `/` 选「布局块」,插入含自描述头的模板并自动进入
  布局模式;也可在布局模式手写围栏;
- **删除保护**:正常模式下,退格/全选删除/粘贴覆盖/拖拽等任何用户侧操作都
  **无法删除布局块**(防止隐形块被无感丢失);删除请进入布局模式,用块头部
  的删除按钮或正常编辑手段;
- **导航跳过**:正常模式下方向键自动跳过隐形块,不会出现"光标消失";
- 撤销/重做不受删除保护限制(可回退到块的创建步)。

### 5.3 源码面板

布局模式下面板包含:info string 徽标(含 meta)、行数、删除按钮、monospace
源码编辑区(输入防抖写回,Escape 交还编辑器焦点)。编辑器只读时面板只读。

---

## 6. API 参考

### 6.1 实例 API(MeditorApi)

```ts
const api = createMeditor({ root, ... });

api.setLayoutMode(true);        // 开启/关闭布局模式
api.toggleLayoutMode();         // 切换布局模式,返回切换后的状态
api.getMarkdown();              // 完整 Markdown(含布局块,用于保存)
api.getMarkdownForLLM();        // 剥离全部布局块后的 Markdown(喂给大模型)
```

### 6.2 纯函数(从包根导出,不依赖编辑器实例)

```ts
import {
  stripMeditorLayoutBlocks,   // 剥离全部布局块(整块移除含围栏行)
  listMeditorLayoutBlocks,    // 枚举布局块 { lang, meta, value }[]
  parseLayoutDirective,       // 解析指令 JSON → LayoutDirective | null
  isHtmlLayoutFenceLang,
  isScriptLayoutFenceLang,
} from '@meditor/editor';

const forLLM = stripMeditorLayoutBlocks(markdown);
const blocks = listMeditorLayoutBlocks(markdown);
```

### 6.3 实例选项

```ts
createMeditor({
  layoutBlock: {
    enableScript: false,  // 关闭 meditor-layout:js 沙箱执行(默认 true)
  },
});
```

### 6.4 推荐的大模型协作管线

1. **读**:把 `getMarkdownForLLM()` 的结果交给模型(或工具链在读取文件时先跑
   `stripMeditorLayoutBlocks`),正文零污染;
2. **写**:模型生成的纯 Markdown 回写时,由工具链把原文件的布局块合并回去
   (布局块是独立围栏,按位置拼接即可);
3. 布局块内容首行的自描述注释(编辑器插入模板自带)是最后一道兜底——即使
   文件被整读,模型也能识别该块可忽略。

---

## 7. 保真与兼容性

- **往返保真**:围栏内容字节级不变;info string(lang 与 meta)原样保留;
  围栏符号统一为反引号(~~~ 会规范化为 ```)——这是唯一的格式变化;
- **第三方渲染器**:布局块降级为普通代码块显示(内容可见但无效果),正文
  渲染不受影响;
- **协同/撤销**:撤销重做可回退含布局块的创建步;协同远端同步不被删除保护
  拦截(远端内容即真相)。

## 8. 已知限制

| 限制 | 说明 |
| --- | --- |
| 多栏(columns) | 需要把连续块包进容器,超出装饰层能力(需文档 schema 级容器节点),暂未提供 |
| NodeView 块的指令 class | 图片/代码块等自带 NodeView 的块,自定义 class 依赖各自 NodeView 转发 decoration(段落/标题/列表/表格等常规块均正常) |
| :js 网络隔离 | 沙箱不做网络限制,脚本可 fetch 外部地址;不可信文档请用 enableScript 关闭执行 |
| heading 绑定 | 标题改名即失联;重名标题取首个 |
| 自定义 class 的样式 | 编辑器不内置任何 `zt-md-ml-c-*` 样式,需宿主 CSS 定义——这是刻意的扩展点而非缺失 |

## 9. 快速上手清单

1. 在 meditor 中打开 .md,`/` → 「布局块」插入第一个指令块;
2. 写 `{"width": "wide"}`,退出布局模式看正文变宽;
3. 需要 banner?插入 `meditor-layout:html` 块写带 `<style>` 的 HTML;
4. 需要动态内容?插入 `meditor-layout:js` 块,渲染进 `#app`;
5. 分发给大模型前用「复制给大模型(不含布局信息)」或 `getMarkdownForLLM()`;
6. 任何时候进布局模式可查看/编辑/删除全部布局块。
