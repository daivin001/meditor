import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/**
 * vite.config.ts — @meditor/csvkit 库构建配置
 *
 * - 单入口 src/index.ts，ESM 产物 dist/csvkit.js
 * - 零依赖纯函数,无需 external 配置
 * - sourcemap 强制关闭（生产发布不携带,见 AGENTS.md 前端编译铁律）
 */
export default defineConfig({
  build: {
    sourcemap: false,
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'csvkit.js',
    },
  },
});
