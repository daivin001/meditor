/**
 * core/commands.ts — replaceAll 命令执行器
 *
 * 1:1 翻译自 zt-react-milkdown/src/core/commands.ts
 * replaceAll 宏(@milkdown/utils)签名为 (markdown, flush?) => (ctx) => void,
 * 经 editor.action 在类型化 ctx 上执行,无需 unknown 强转。
 */
import type { Ctx } from '@milkdown/ctx';
import type { Editor } from '@milkdown/core';

/**
 * 创建 replaceAll 命令执行器。
 *
 * @param replaceAllExport replaceAll 宏(注入以保持可测/可替换)
 * @param editor milkdown 编辑器实例
 * @returns 整篇替换 markdown 的执行函数
 */
export const createReplaceAllExecutor = (
  replaceAllExport: (markdown: string, flush?: boolean) => (ctx: Ctx) => void,
  editor: Editor,
): ((markdown: string) => void) => {
  if (typeof replaceAllExport !== 'function') {
    return () => undefined;
  }

  return (markdown: string): void => {
    editor.action(replaceAllExport(markdown));
  };
};
