import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/**
 * vite.config.ts — @meditor/mtable 库构建配置
 *
 * - 单入口 src/index.ts，ESM 产物 dist/mtable.js + dist/mtable.css
 * - 零运行时依赖，无需 external 配置
 * - sourcemap 强制关闭（生产发布不携带，见 CLAUDE.md 前端编译铁律）
 */
export default defineConfig({
  build: {
    sourcemap: false,
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'mtable.js'
    },
    rollupOptions: {
      output: {
        // css → dist/mtable.css（当前内联样式为主，CSS 产物按需生成）
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'mtable.css';
          return 'assets/[name][extname]';
        }
      }
    }
  }
});
