/**
 * scripts/sync-vendor.mjs — 从本仓库 editor 构建产物同步 @meditor/editor
 *
 * 用法:先在 editor/ 下 `npm install && npm run build`,再在本工程
 * `npm run sync:meditor`。同步内容:dist/meditor.js / meditor.css / style-inline.js
 * (katex 字体已 base64 内联进 css,无需额外拷贝字体文件)。
 */
import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const src = path.resolve(root, '../editor/dist');
const dest = path.resolve(root, 'vendor/meditor');

const files = ['meditor.js', 'meditor.css', 'style-inline.js'];

if (!existsSync(src)) {
  console.error(`[sync-vendor] 源目录不存在: ${src}`);
  console.error('[sync-vendor] 请先在本仓库 editor/ 下执行 npm install && npm run build');
  process.exit(1);
}

for (const file of files) {
  const from = path.join(src, file);
  if (!existsSync(from)) {
    console.error(`[sync-vendor] 缺少产物: ${from}`);
    console.error('[sync-vendor] 请先在本仓库 editor/ 下执行 npm install && npm run build');
    process.exit(1);
  }
  copyFileSync(from, path.join(dest, file));
  console.log(`[sync-vendor] copied ${file}`);
}

console.log('[sync-vendor] done →', dest);
