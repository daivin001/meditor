/**
 * inline-ext 纯 mdast transformer 契约自测(脱离 milkdown 运行时)。
 */
import { describe, expect, it } from 'vitest';
import { transformInlineExt, MEDITOR_INLINE_TAG_MDAST_TYPE } from './inline-ext-marks';

interface N {
  type: string;
  value?: string | null;
  data?: Record<string, unknown> | null;
  children?: N[];
  [key: string]: unknown;
}

const paragraph = (text: string): N => ({
  type: 'root',
  children: [{ type: 'paragraph', children: [{ type: 'text', value: text }] }]
});

const firstInline = (tree: N): N => (tree.children?.[0]?.children as N[])[0] as N;

describe('transformInlineExt', () => {
  it('==高亮== 文本切分为 meditorSpan(默认高亮色)', () => {
    const tree = paragraph('前 ==高亮== 后');
    transformInlineExt(tree.children as N[]);
    const inline = tree.children?.[0]?.children as N[];
    expect(inline).toHaveLength(3);
    const span = inline[1]!;
    expect(span.type).toBe('meditorSpan');
    expect((span.data as { kind?: string }).kind).toBe('highlight');
    expect((span.children as N[])[0]?.value).toBe('高亮');
  });

  it('^上标^ 文本切分为 meditorInlineTag(sup)', () => {
    const tree = paragraph('2^10^ 结果');
    transformInlineExt(tree.children as N[]);
    const sup = (tree.children?.[0]?.children as N[])[1]!;
    expect(sup.type).toBe(MEDITOR_INLINE_TAG_MDAST_TYPE);
    expect((sup.data as { tag?: string }).tag).toBe('sup');
  });

  it('单波浪线不做下标切分(GFM 删除线语法冲突,保持原样)', () => {
    const tree = paragraph('~下标~');
    transformInlineExt(tree.children as N[]);
    const inline = tree.children?.[0]?.children as N[];
    expect(inline).toHaveLength(1);
    expect(inline[0]?.type).toBe('text');
  });

  it('<u>/<sub>/<sup> html 叶子按栈配对(含嵌套)', () => {
    const tree: N = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'html', value: '<u>' },
            { type: 'text', value: 'A' },
            { type: 'html', value: '<sub>' },
            { type: 'text', value: '2' },
            { type: 'html', value: '</sub>' },
            { type: 'html', value: '</u>' }
          ]
        }
      ]
    };
    transformInlineExt(tree.children as N[]);
    const u = firstInline(tree);
    expect(u.type).toBe(MEDITOR_INLINE_TAG_MDAST_TYPE);
    expect((u.data as { tag?: string }).tag).toBe('u');
    const sub = (u.children as N[])[1]!;
    expect((sub.data as { tag?: string }).tag).toBe('sub');
    expect(((sub.children as N[])[0] as N).value).toBe('2');
  });

  it('未闭合标签降级:丢弃开标签不丢内容', () => {
    const tree = paragraph('正常文本');
    const withHtml: N = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'html', value: '<u>' }, { type: 'text', value: '内容' }]
        }
      ]
    };
    transformInlineExt(withHtml.children as N[]);
    const inline = withHtml.children?.[0]?.children as N[];
    expect(inline.some((n) => n.type === 'html')).toBe(false);
    expect(inline.some((n) => n.value === '内容')).toBe(true);
    void tree;
  });
});
