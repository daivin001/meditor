import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/**
 * vite.config.ts — MEditor 桌面壳前端构建
 *
 * - 入口 src/main.ts，产物 dist/（Tauri 生产模式内嵌，dev 模式走 vite server）
 * - vendor/meditor 为 @meditor/editor 的库构建产物（scripts/sync-vendor.mjs 同步），
 *   其第三方依赖全部 external，由本工程 node_modules 提供单一副本
 * - @milkdown/* 各包 alias 钉到 lib/index.js 真实入口：SliceType/TimerType 以
 *   Symbol 为 key，双模块副本会报 "Timer InitReady not found"，长键在前避免前缀劫持
 * - sourcemap 关闭（生产发布不携带）
 */

const milkdownAliasEntries: Array<[string, string]> = [
  ['@milkdown/core', '@milkdown/core/lib/index.js'],
  ['@milkdown/ctx', '@milkdown/ctx/lib/index.js'],
  ['@milkdown/utils', '@milkdown/utils/lib/index.js'],
  ['@milkdown/exception', '@milkdown/exception/lib/index.js'],
  ['@milkdown/transformer', '@milkdown/transformer/lib/index.js'],
  ['@milkdown/prose', '@milkdown/prose/lib/index.js'],
  ['@milkdown/prose/model', '@milkdown/prose/lib/model.js'],
  ['@milkdown/prose/state', '@milkdown/prose/lib/state.js'],
  ['@milkdown/prose/view', '@milkdown/prose/lib/view.js'],
  ['@milkdown/prose/commands', '@milkdown/prose/lib/commands.js'],
  ['@milkdown/prose/inputrules', '@milkdown/prose/lib/inputrules.js'],
  ['@milkdown/prose/keymap', '@milkdown/prose/lib/keymap.js'],
  ['@milkdown/prose/transform', '@milkdown/prose/lib/transform.js'],
  ['@milkdown/prose/history', '@milkdown/prose/lib/history.js'],
  ['@milkdown/prose/schema-list', '@milkdown/prose/lib/schema-list.js'],
  ['@milkdown/prose/tables', '@milkdown/prose/lib/tables.js'],
  ['@milkdown/prose/dropcursor', '@milkdown/prose/lib/dropcursor.js'],
  ['@milkdown/prose/gapcursor', '@milkdown/prose/lib/gapcursor.js'],
  ['@milkdown/prose/changeset', '@milkdown/prose/lib/changeset.js'],
  ['@milkdown/preset-commonmark', '@milkdown/preset-commonmark/lib/index.js'],
  ['@milkdown/preset-gfm', '@milkdown/preset-gfm/lib/index.js'],
  ['@milkdown/plugin-clipboard', '@milkdown/plugin-clipboard/lib/index.js'],
  ['@milkdown/plugin-history', '@milkdown/plugin-history/lib/index.js'],
  ['@milkdown/plugin-indent', '@milkdown/plugin-indent/lib/index.js'],
  ['@milkdown/plugin-listener', '@milkdown/plugin-listener/lib/index.js'],
  ['@milkdown/plugin-tooltip', '@milkdown/plugin-tooltip/lib/index.js'],
  ['@milkdown/plugin-cursor', '@milkdown/plugin-cursor/lib/index.js'],
  ['@milkdown/plugin-slash', '@milkdown/plugin-slash/lib/index.js']
];

// 长键在前:alias 按 startsWith 匹配,避免 '@milkdown/prose' 劫持 '@milkdown/prose/state'。
const milkdownAlias = milkdownAliasEntries
  .sort((left, right) => right[0].length - left[0].length)
  .map(([specifier, relativePath]) => ({
    find: specifier,
    replacement: fileURLToPath(new URL(`./node_modules/${relativePath}`, import.meta.url))
  }));

export default defineConfig({
  resolve: {
    alias: [
      ...milkdownAlias,
      {
        // vendor 产物主入口
        find: /^@meditor\/meditor$/,
        replacement: fileURLToPath(new URL('./vendor/meditor/meditor.js', import.meta.url))
      },
      {
        // vendor 产物样式(dist/meditor.css,katex 字体已 base64 内联)
        find: /^@meditor\/meditor\/style\.css$/,
        replacement: fileURLToPath(new URL('./vendor/meditor/meditor.css', import.meta.url))
      },
      // prosemirror 核心三件钉到同一绝对路径:milkdown 依赖树与
      // prosemirror-search/y-prosemirror 依赖树必须解析到同一模块副本,
      // 否则 dev 预构建拆出两份 prosemirror-view,搜索插件 decorations 与
      // 编辑器视图跨副本混用,NodeView 渲染即抛
      // "Cannot read properties of undefined (reading 'localsInner')"。
      // (生产构建 rollup 按解析路径去重,无此问题;此为 dev 预构建兜底。)
      {
        find: /^prosemirror-view$/,
        replacement: fileURLToPath(new URL('./node_modules/prosemirror-view/dist/index.js', import.meta.url))
      },
      {
        find: /^prosemirror-state$/,
        replacement: fileURLToPath(new URL('./node_modules/prosemirror-state/dist/index.js', import.meta.url))
      },
      {
        find: /^prosemirror-model$/,
        replacement: fileURLToPath(new URL('./node_modules/prosemirror-model/dist/index.js', import.meta.url))
      }
    ]
  },
  build: {
    target: 'chrome105',
    sourcemap: false,
    chunkSizeWarningLimit: 4096
  },
  clearScreen: false,
  server: {
    port: 5183,
    strictPort: true
  },
  envPrefix: ['VITE_', 'TAURI_']
});
