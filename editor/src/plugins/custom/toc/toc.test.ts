/**
 * [toc] 段落识别 transformer 契约自测(脱离 milkdown 运行时)。
 */
import { describe, expect, it } from 'vitest';
import { transformTocs } from './toc-plugin';

interface N {
  type: string;
  value?: string | null;
  children?: N[];
  [key: string]: unknown;
}

describe('transformTocs', () => {
  it('恰为 [toc] 的段落改写为 meditorToc', () => {
    const tree: N = {
      type: 'root',
      children: [
        { type: 'paragraph', children: [{ type: 'text', value: '[toc]' }] },
        { type: 'heading', children: [{ type: 'text', value: '标题' }] }
      ]
    };
    transformTocs(tree);
    expect(tree.children?.[0]?.type).toBe('meditorToc');
    expect(tree.children?.[1]?.type).toBe('heading');
  });

  it('允许首尾空白,但含其他文本的段落不改写', () => {
    const tree: N = {
      type: 'root',
      children: [
        { type: 'paragraph', children: [{ type: 'text', value: ' [toc] ' }] },
        { type: 'paragraph', children: [{ type: 'text', value: '见 [toc] 说明' }] }
      ]
    };
    transformTocs(tree);
    expect(tree.children?.[0]?.type).toBe('meditorToc');
    expect(tree.children?.[1]?.type).toBe('paragraph');
  });
});
