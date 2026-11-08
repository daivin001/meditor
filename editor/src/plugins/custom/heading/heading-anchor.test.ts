/**
 * 标题 slug 契约自测(纯函数)。
 */
import { describe, expect, it } from 'vitest';
import { slugifyHeadingText } from './heading-anchor';

describe('slugifyHeadingText', () => {
  it('中文原样保留,空白转连字符', () => {
    expect(slugifyHeadingText('项目 简介')).toBe('项目-简介');
  });

  it('大写转小写,标点剔除', () => {
    expect(slugifyHeadingText('Hello, World!')).toBe('hello-world');
  });

  it('空标题兜底', () => {
    expect(slugifyHeadingText('!!!')).toBe('heading');
  });
});
