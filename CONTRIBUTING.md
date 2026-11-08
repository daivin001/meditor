# 贡献指南

感谢关注 MEditor！欢迎通过 Issue 反馈问题、通过 Pull Request 参与贡献。

## 开发环境

- Node.js ≥ 20、npm ≥ 10
- 桌面应用开发需 Rust 工具链（见 [Tauri 文档](https://tauri.app/start/prerequisites/)）

```bash
git clone <仓库地址>
cd meditor
npm install                 # 根目录:workspace 依赖(editor + packages/*)
cd client && npm install    # 桌面壳依赖(独立 lockfile)
```

## 常用命令

```bash
npm test                    # vitest 全部测试
npm run lint                # Biome lint
npm run typecheck           # 全 workspace 类型检查
npm run build -w @meditor/editor   # 构建编辑器组件包

cd client
npm run tauri dev           # 桌面应用开发模式(热更新)
npm run tauri build         # 打包 Windows 安装程序
npm run sync:meditor        # 同步组件包构建产物到 vendor/
```

## 提交规范

提交信息使用中文、遵循 Conventional Commits 前缀：

- `feat(editor): ...` / `feat(client): ...` — 新功能
- `fix(editor): ...` / `fix(client): ...` — 缺陷修复
- `docs: ...` / `chore: ...` / `refactor: ...` — 文档 / 工程 / 重构

## Pull Request 要求

1. 基于最新 `develop` 分支开分支
2. `npm test`、`npm run lint`、`npm run typecheck` 全部通过（CI 会自动执行）
3. 涉及用户可感知行为时，请同步更新 README 或 docs/ 中的相应文档
4. 新增逻辑尽量附带 vitest 测试（纯逻辑测试放 `*.test.ts` 与源码同目录）

## 行为准则

参与本项目请遵守 [行为准则](CODE_OF_CONDUCT.md)。
