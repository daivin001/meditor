import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/**
 * vite.config.ts — @meditor/jsonview 库构建配置
 *
 * - 单入口 src/index.ts，ESM 产物 dist/jsonview.js + dist/jsonview.css
 * - 零运行时依赖,无需 external 配置
 * - sourcemap 强制关闭(生产发布不携带,见 CLAUDE.md 前端编译铁律)
 */
export default defineConfig({
  build: {
    sourcemap: false,
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'jsonview.js'
    },
    rollupOptions: {
      output: {
        // css → dist/jsonview.css
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'jsonview.css';
          return 'assets/[name][extname]';
        }
      }
    }
  }
});
