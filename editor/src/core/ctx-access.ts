/**
 * core/ctx-access.ts — milkdown ctx 类型化访问助手
 *
 * milkdown 的 Ctx(@milkdown/ctx)本身提供泛型 get/set/update:传入
 * SliceType<T> 即按 T 收窄,无需 `ctx as { get: (k: unknown) => unknown }`
 * 一类 unknown 强转链。本模块在类型化访问之上补充:
 * - 就绪保护:editor.create() 完成前部分 slice 未注入(ctx.get 会抛
 *   contextNotFound),editorViewCtx 还会以占位值(空对象)存在,仅靠类型
 *   收不住,需 try/catch + 运行时校验(见 readSliceWhen);
 * - 统一收口:meditor 对 ctx 的延迟读取/延迟写入全部走这里,便于审查与升级。
 */
import type { Ctx, SliceType } from '@milkdown/ctx';
import type { Editor } from '@milkdown/core';

/**
 * 类型化读取单个 ctx slice。
 *
 * @param editor milkdown 编辑器实例
 * @param sliceType 目标 slice(SliceType 的类型参数 T 决定返回值类型)
 * @returns slice 当前值;create() 未完成 / slice 未注入(contextNotFound)等异常时返回 null
 */
export const readSlice = <T>(editor: Editor, sliceType: SliceType<T>): T | null => {
  try {
    return editor.action((ctx: Ctx) => ctx.get(sliceType));
  } catch {
    return null;
  }
};

/**
 * 类型化读取 + 运行时校验(refine 不过关按未就绪处理)。
 *
 * milkdown 在视图就绪前会把部分 slice 以占位值注入(editorViewCtx 为空对象,
 * truthy 但无 state、不可调用),类型系统挡不住占位值,调用方必须传 refine。
 *
 * @param refine 运行时就绪判定(如 `view.state != null`、`typeof v === 'function'`)
 */
export const readSliceWhen = <T>(
  editor: Editor,
  sliceType: SliceType<T>,
  refine: (value: T) => boolean,
): T | null => {
  const value = readSlice(editor, sliceType);
  return value !== null && refine(value) ? value : null;
};

/**
 * 在类型化 ctx 上执行动作(写路径:set / update / 组合操作)。
 *
 * @param fn 动作回调(ctx 已是完整类型,内部可直接 ctx.set(slice, value))
 * @returns 回调返回值;编辑器销毁窗口期等异常返回 null(写路径一般不消费返回值)
 */
export const runWithCtx = <T>(editor: Editor, fn: (ctx: Ctx) => T): T | null => {
  try {
    return editor.action(fn);
  } catch {
    return null;
  }
};
