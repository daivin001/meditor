# @meditor/mtable

Canvas 渲染的 CSV 表格编辑器组件包 — 视觉规格 1:1 对齐 [Univer Sheets](https://github.com/dreamnum/univer) 默认主题，纯 TypeScript、零运行时依赖。

## 特性

- 🎨 **视觉对齐 Univer**：行高 24 / 列宽 88 / 行头 46 / 列头 20、gray.50 表头、`#D5D7DC` 网格线、`primary.600` 选区描边 + alpha 0.07 填充、行头列头选区同色高亮
- 📝 **单元格编辑**：双击 / 直接输入 / F2 进入编辑，Enter 确认下移、Tab 右移、Esc 取消，支持中文 IME
- ⌨️ **完整键盘导航**：方向键 / Shift+方向扩选 / Home·End / PageUp·Down / Ctrl+Home
- 📋 **剪贴板**：Ctrl+C/X/V 复制剪切粘贴（TSV ↔ 选区矩阵，跨表格粘贴）
- ↩️ **撤销/重做**：Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y（编辑、粘贴、行列增删均可撤销）
- 🖱️ **右键菜单**：插入/删除行列、清空内容（中英文文案内置，可自定义）
- 📐 **列宽自适应**：按内容自动测宽（88–260px，可关闭）
- ↔️ **列宽拖拽**：列头边缘拖拽调整列宽（会话内生效，不写入 CSV、不持久化；被拖列跳过自动测宽）
- 🔤 **自动换行**：单元格文本按列宽自动折行、行高自适应撑高（拖窄列行高增大、拖宽回落，可逆）；支持 CSV 引号字段内的换行符
- 🔽 **列头筛选/排序**：列头右侧 hover 显示小箭头（浅灰圆圈底），点击弹出面板——第一行"重置"、下方"筛选/排序"双 tab；筛选 tab 为搜索 + 全选 + 带计数的值列表（Univer 风格，选中子集即隐藏未选中行，空白值显示"(空白)"）；排序 tab 为升序/降序菜单项（数字 < 文本、空白排最后，Ctrl+Z 可撤销）；设置过筛选/排序的列箭头常显
- 📱 **触摸支持**：单指点按选中、拖动平移(上下左右 + 惯性滚动)、双击进编辑、长按弹右键菜单；列边界拖拽调宽、滚动条拖拽、筛选箭头均可用触摸操作(命中容差自动放宽)；嵌入态滚到顶/底后滚动交给外层容器(与滚轮链路一致)
- 🖥️ **全屏按钮**：左上角格子 hover 显现最大化按钮，点击把表格弹出为最大化 dialog(标题栏 + Esc/关闭还原，选区/撤销栈连续);`fullscreenButton: false` 可关闭
- 🔢 **数字右对齐**：纯数字单元格自动右对齐（同 Excel/Univer）
- ♾️ **无限滚动**：像 Excel 一样一直往下滚，滚动接近底部自动追加空白行（默认上限 5000 行，超上限的粘贴自动截断）；空白行不会进入 CSV 序列化输出

## 安装与使用

```ts
import { createMtable } from '@meditor/mtable';
import '@meditor/mtable/style.css';

const api = createMtable({
  root: document.getElementById('app')!,
  defaultValue: 'name,age\nAlice,30\nBob,25',
  onChange: (csv) => console.log(csv)
});

api.getCsv();      // 当前 CSV 文本
api.setCsv('...'); // 替换内容
api.undo();        // 撤销
api.destroy();     // 销毁
```

## API

### `createMtable(options): MtableApi`

| Option | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `root` | `HTMLElement` | 必填 | 挂载节点 |
| `defaultValue` | `string` | `''` | 初始 CSV |
| `value` | `string` | — | 受控模式（轮询同步外部变更） |
| `onChange` | `(csv: string) => void` | — | 内容变更回调（规范化 CRLF 输出） |
| `onLayoutChange` | `() => void` | — | 布局变更回调（拖列宽/换行重算行高等不改变 CSV 的场景；宿主据此同步容器高度，配 `getContentHeight` 使用） |
| `messages` 新增键 | — | — | 筛选/排序面板文案：`reset` `filterTab` `sortTab` `sortAsc` `sortDesc` `selectAll` `searchPlaceholder` `blankValue` `cancel` `confirm`（中英文内置，`messages` 可覆盖） |
| `readOnly` | `boolean` | `false` | 只读（禁编辑/增删/剪切/粘贴） |
| `locale` | `'zh-CN' \| 'en-US'` | `'zh-CN'` | 右键菜单文案语言 |
| `messages` | `Partial<MtableMessages>` | — | 自定义文案 |
| `delimiter` | `string` | `','` | CSV 分隔符 |
| `autoColumnWidth` | `boolean` | `true` | 列宽按内容自适应 |
| `defaultColumnWidth` | `number` | `88` | 默认列宽（同 Univer） |
| `defaultRowHeight` | `number` | `24` | 行高（同 Univer） |
| `rowHeaderWidth` | `number` | `46` | 行头宽（同 Univer） |
| `columnHeaderHeight` | `number` | `20` | 列头高（同 Univer） |
| `minRowCount` | `number` | `100` | 空网格初始行数 |
| `minColumnCount` | `number` | `20` | 空网格初始列数 |
| `maxRowCount` | `number` | `5000` | 无限滚动的行数上限（滚到底自动追行，封顶此值；粘贴超界同样受此限制） |

### `MtableApi`

- `getCsv(): string` — 规范化序列化的 CSV 文本
- `setCsv(csv: string): void` — 整体替换内容（重建列宽、清空筛选/排序与撤销栈）
- `getFilters(): Record<number, string[]>` — 当前生效的筛选条件（列 → 选中值集合）
- `clearFilters(): void` — 清除所有筛选（不改动数据）
- `setOverlayContainer(el | null): void` — 切换浮层（右键菜单/筛选面板）挂载容器；表格被搬进高 z-index 全屏弹窗时传弹窗宿主节点，避免浮层被压在背面；`null` 恢复 `document.body`
- `getSelection(): MtableSelection` — 当前选区
- `setSelection(sel): void` — 设置选区并滚动可见
- `undo() / redo()` — 撤销 / 重做
- `focus()` — 聚焦
- `destroy()` — 销毁并清理 DOM/监听

### 独立函数

```ts
import { parseCsv, stringifyCsv, numberToAbc, mixHexColor } from '@meditor/mtable';
```

## 开发

```bash
npm run typecheck   # tsc --noEmit
npm run build       # dist/mtable.js + mtable.css + dist-types
```

演示页：仓库根目录 `demo/mtable.html`（`npm run dev` 后访问 `/demo/mtable.html`）。

## 视觉规格来源（Univer 源码对齐）

| 规格 | 值 | Univer 来源 |
| --- | --- | --- |
| 行高 | 24px | `DEFAULT_WORKSHEET_ROW_HEIGHT` |
| 列宽 | 88px | `DEFAULT_WORKSHEET_COLUMN_WIDTH` |
| 行头宽 | 46px | `DEFAULT_WORKSHEET_ROW_TITLE_WIDTH` |
| 列头高 | 20px | `DEFAULT_WORKSHEET_COLUMN_TITLE_HEIGHT` |
| 表头底色 | `#F9FAFB` (gray.50) | `DEFAULT_COLUMN_STYLE.backgroundColor` |
| 表头字色 | `#1B1C1F` (gray.900) | `DEFAULT_COLUMN_STYLE.fontColor` |
| 网格线 | `mix(gray.200, gray.900, 0.07)` ≈ `#D5D7DC` | `sheet.render-skeleton.ts` |
| 选区描边 | `#2C53F1` (primary.600) | `genNormalSelectionStyle` |
| 选区填充 | `rgba(44,83,241,0.07)` | 同上 |
