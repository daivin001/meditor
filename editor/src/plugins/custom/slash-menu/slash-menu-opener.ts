/**
 * plugins/custom/slash-menu/slash-menu-opener.ts — slash 菜单编程式打开注册表
 *
 * slash 菜单除输入 '/' 触发外,还支持外部编程式打开(语雀风格的 + 按钮):
 * - 工具栏最左侧绿色 + 按钮(当前光标处打开)
 * - 块手柄 + 按钮(目标块处打开)
 *
 * 本模块持有 opener 的按实例注册表:slash-menu 插件在视图创建时注册,
 * 上述触发方通过 openSlashMenuAt 调用。注册表按 EditorView 实例隔离
 * (WeakMap):多编辑器实例互不覆盖,触发方以当前视图取到所属实例的 opener;
 * 视图销毁后条目随之可回收,无需手动清扫。
 */
import type { EditorView } from '@milkdown/prose/view';

/**
 * opener 函数签名。
 * @param view 当前编辑器视图
 * @param blockPos 目标块起始位置(块手柄场景);缺省表示在当前光标处打开
 */
export type SlashMenuOpener = (view: EditorView, blockPos?: number) => void;

// 按视图实例隔离的 opener 注册表(WeakMap:视图被 GC 后条目自动释放)。
const openerRegistry = new WeakMap<EditorView, SlashMenuOpener>();

/**
 * 注册/注销编程式打开器(由 slash-menu 插件在视图创建/销毁时调用)。
 *
 * @param view 目标编辑器视图(注册表键)
 * @param opener 打开器;null 表示注销该视图的注册
 */
export const registerSlashMenuOpener = (view: EditorView, opener: SlashMenuOpener | null): void => {
  if (opener === null) {
    openerRegistry.delete(view);
    return;
  }
  openerRegistry.set(view, opener);
};

/**
 * 编程式打开 slash 菜单(取 view 所属实例的 opener)。
 *
 * @returns 是否存在已注册的 opener(未注册或插件未启用时返回 false)
 */
export const openSlashMenuAt = (view: EditorView, blockPos?: number): boolean => {
  const opener = openerRegistry.get(view);
  if (!opener) {
    return false;
  }

  opener(view, blockPos);
  return true;
};
