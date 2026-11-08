import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/**
 * vite.config.ts — @meditor/editor 库构建配置
 *
 * - 单入口 src/index.ts，ESM 产物 dist/meditor.js + dist/meditor.css
 * - milkdown 等第三方依赖 external：由消费方从自身 node_modules 解析单一副本，
 *   避免 milkdown 双实例（SliceType/TimerType 用 Symbol 作 key，双实例
 *   会导致 "Timer InitReady not found" 等错乱）
 * - sourcemap 强制关闭（生产发布不携带，见 CLAUDE.md 前端编译铁律）
 *
 * @meditor/mtable、@meditor/jsonview、@meditor/csvkit 不列入 external：
 * 零运行时依赖策略,这三个包的代码连同 mtable 的 CSS 一并打进 meditor
 * 产物。源码在本包 packages/ 内维护,构建期经别名直引源码（与 tsconfig
 * paths 对应,改动即生效,无需先构建这三个包）。
 */

// @meditor/mtable:同仓库 packages/ 内的组件包,构建期直引源码。
const mtableAlias = {
  find: /^@meditor\/mtable$/,
  replacement: fileURLToPath(new URL('./packages/mtable/src/index.ts', import.meta.url)),
};

// @meditor/jsonview:同 packages/ 内,直引源码。
const jsonviewAlias = {
  find: /^@meditor\/jsonview$/,
  replacement: fileURLToPath(new URL('./packages/jsonview/src/index.ts', import.meta.url)),
};

// @meditor/csvkit:mtable/jsonview 的 CSV 单一实现,同样直引源码,
// 保证 meditor 产物中只有一份 csvkit。
const csvkitAlias = {
  find: /^@meditor\/csvkit$/,
  replacement: fileURLToPath(new URL('./packages/csvkit/src/index.ts', import.meta.url)),
};

export default defineConfig({
  resolve: {
    alias: [mtableAlias, jsonviewAlias, csvkitAlias],
  },
  build: {
    sourcemap: false,
    lib: {
      entry: {
        // 主入口(样式走 CSS import 抽出 meditor.css)
        meditor: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        // CSS 文本入口(shadow DOM 宿主自行注入用,按需引入)
        'style-inline': fileURLToPath(new URL('./src/style-inline.ts', import.meta.url)),
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      // milkdown 全家桶 + 其余第三方运行时依赖一律 external
      external: [
        /^@milkdown\//,
        'katex',
        'prosemirror-search',
        'refractor',
        'remark-math',
        // Typora 对齐新能力:图表(懒加载动态 import)与脚注/元数据 remark 扩展
        'mermaid',
        'remark-footnotes',
        'remark-frontmatter',
        // P4 实时协同(yjs 生态;宿主从自身 node_modules 解析单一副本)
        'yjs',
        'y-prosemirror',
        'y-protocols',
      ],
      output: {
        // css → dist/meditor.css；katex 字体等资源 → dist/assets/
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'meditor.css';
          return 'assets/[name][extname]';
        },
      },
    },
  },
});
