/**
 * types/plugin.ts — Milkdown 插件描述符
 *
 * 1:1 翻译自 zt-react-milkdown/src/types/plugin.ts
 */

/**
 * 定义 Milkdown 插件的通用描述结构。
 */
export interface EditorPluginDescriptor {
  /** 插件唯一名称。 */
  name: string;
  /** 插件实例。 */
  plugin: unknown;
}
