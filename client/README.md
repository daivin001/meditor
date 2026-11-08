# MEditor

基于 [@meditor/editor](../../editor) 的 Windows 桌面 Markdown 编辑器,用 Tauri 2(Rust)打包。

## 功能

- meditor 所见即所得编辑(完整工具栏/块手柄/slash 菜单/表格/公式/代码高亮/csvdata 数据块)
- 打开/保存/另存为 `.md`(Ctrl+O / Ctrl+S / Ctrl+Shift+S,原生菜单)
- 脏状态标记 + 关闭前确认;标题栏/状态栏同步文件名与字数统计(无应用内顶栏)
- 图片以内嵌 data URL 存进文档,预览可用且 .md 单文件自包含可移植(上限 10MB)
- 安装版自动注册 .md/.markdown/.mdx 文件关联;已开窗口时双击新文件转发打开(单实例)
- 拖拽 .md 文件进窗口打开;命令行参数 `MEditor.exe path\to\file.md` 打开
- 明暗主题(跟随系统,Ctrl+J 切换)

## 结构

```
meditor/
├── client/               # 本目录:桌面壳
│   ├── src/              # 前端(main.ts 装配编辑器 + Tauri IPC 桥接)
│   ├── vendor/meditor/   # @meditor/editor 库构建产物(由 scripts/sync-vendor.mjs 同步)
│   ├── scripts/          # sync-vendor / bump-version / gen_icon
│   └── src-tauri/        # Rust 壳(文件读写/图片落盘/菜单/关闭拦截)
└── editor/               # @meditor/editor 组件包源码(含 packages/ 三个子包)
```

## 开发

```bash
npm install
npm run tauri dev     # 前端改动热更新;改 Rust 后需重启
```

## 打包

```bash
npm run tauri build   # 产物:src-tauri/target/release/meditor.exe + NSIS 安装包
```

## meditor 更新后同步

```bash
# 先在仓库根目录 npm install,再构建组件包:
npm run build -w @meditor/editor
# 然后同步构建产物到 vendor/:
npm run sync:meditor
```

vendor 产物将 milkdown 等声明为 external,依赖由本工程 node_modules 提供;
`vite.config.ts` 已按编辑器 README 的「milkdown 单实例提示」将 `@milkdown/*`
alias 钉到 `lib/index.js`,避免双实例。

## 注意

- 桌面壳版本号独立演进,从 0.1.0 起(`npm run bump-version` 自增)
- 非 UTF-8 文件按 GB18030 兜底读取,保存一律 UTF-8
