/**
 * plugins/custom/front-matter/front-matter-plugin.ts — YAML Front Matter 元数据块
 *
 * markdown 表示(文档首部):
 *
 *   ---
 *   title: 标题
 *   tags: [a, b]
 *   ---
 *
 * - 解析:remark-frontmatter(官方 micromark/mdast 扩展)产出 {type:'yaml', value};
 * - 序列化:remark-frontmatter 的 toMarkdown 扩展原样打印 `---\nvalue\n---`;
 * - 编辑:content:'text*' + code 语义,默认 DOM(pre>code)即原生可编辑,
 *   无需 NodeView。
 */
import { $nodeSchema, $remark } from '@milkdown/utils';
import remarkFrontmatter from 'remark-frontmatter';

/**
 * Front Matter 节点类型名(mdast 与 PM 同名:yaml)。
 */
export const FRONT_MATTER_NODE_NAME = 'yaml';

/**
 * remark-frontmatter 插件包装器(解析 + 序列化双向扩展)。
 *
 * 显式传入 'yaml' preset:milkdown $remark 缺省 options 为 `{}`(truthy),
 * remark-frontmatter 会把 `{}` 当作 matter 配置解析并抛
 * "Missing `type` in matter";'yaml' 与其缺省行为完全一致。
 */
export const remarkFrontMatterPlugin = $remark('remarkFrontmatter', () => remarkFrontmatter as never, 'yaml');

/**
 * Front Matter 节点 schema。
 */
export const frontMatterSchema = $nodeSchema(FRONT_MATTER_NODE_NAME, () => ({
  content: 'text*',
  group: 'block',
  code: true,
  defining: true,
  isolating: true,
  marks: '',
  attrs: {},
  parseDOM: [
    {
      tag: 'pre[data-type="yaml"]',
      preserveWhitespace: 'full'
    }
  ],
  toDOM: () => ['pre', { 'data-type': FRONT_MATTER_NODE_NAME, class: 'zt-md-frontmatter' }, ['code', 0]],
  parseMarkdown: {
    match: (node) => node.type === FRONT_MATTER_NODE_NAME,
    runner: (state, node, type) => {
      state.openNode(type);
      const value = (node as { value?: unknown }).value;
      if (typeof value === 'string' && value.length > 0) {
        state.addText(value);
      }
      state.closeNode();
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === FRONT_MATTER_NODE_NAME,
    runner: (state, node) => {
      state.addNode('yaml', undefined, node.content.firstChild?.text ?? '');
    }
  }
}));

/**
 * Front Matter 插件聚合。
 */
export const frontMatter = [remarkFrontMatterPlugin, frontMatterSchema].flat();
