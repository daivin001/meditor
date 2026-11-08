/**
 * plugins/custom/cursor/gap-cursor.ts — 块间光标
 *
 * 1:1 翻译自 zt-react-milkdown/src/plugins/custom/cursor/gap-cursor.ts
 */
import { gapCursor } from '@milkdown/prose/gapcursor';
import { $prose } from '@milkdown/utils';

/**
 * 块间光标插件。
 */
export const gapCursorPlugin = $prose(() => {
  return gapCursor();
});
