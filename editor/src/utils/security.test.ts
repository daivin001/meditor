/**
 * security.test.ts — URL/图片安全校验测试(协议白名单与绕过防线)
 */
import { describe, expect, it } from 'vitest';
import { normalizeSafeUrl, normalizeSafeImageUrl } from './security';

// parseSafeImageHtml 依赖 DOMParser,归入需要 DOM 的集成测试范围
// (vitest 配置为 node 环境,此处仅测纯函数部分)。

describe('normalizeSafeUrl', () => {
  it('放行白名单协议与相对路径', () => {
    expect(normalizeSafeUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(normalizeSafeUrl('http://example.com')).toBe('http://example.com/');
    expect(normalizeSafeUrl('mailto:a@b.com')).toContain('mailto:');
    expect(normalizeSafeUrl('docs/readme.md')).toBe('docs/readme.md');
    expect(normalizeSafeUrl('./a.png')).toBe('./a.png');
  });

  it('拒绝 javascript:/data:/vbscript: 等危险协议', () => {
    expect(normalizeSafeUrl('javascript:alert(1)')).toBe('');
    expect(normalizeSafeUrl('data:text/html,<script>')).toBe('');
    expect(normalizeSafeUrl('vbscript:msgbox')).toBe('');
    expect(normalizeSafeUrl('file:///C:/Windows/win.ini')).toBe('');
  });

  it('拒绝控制字符混入的协议伪装(java\\tscript:)', () => {
    expect(normalizeSafeUrl('java\tscript:alert(1)')).toBe('');
    expect(normalizeSafeUrl(' java\nscript:alert(1)')).toBe('');
    expect(normalizeSafeUrl('\0javascript:alert(1)')).toBe('');
  });

  it('拒绝协议相对地址与属性注入字符', () => {
    expect(normalizeSafeUrl('//evil.example/x')).toBe('');
    expect(normalizeSafeUrl('https://a.com/"onerror="x')).toBe('');
    expect(normalizeSafeUrl("https://a.com/'x")).toBe('');
  });
});

describe('normalizeSafeImageUrl', () => {
  it('图片额外放行 data:(位图)', () => {
    expect(
      normalizeSafeImageUrl('data:image/png;base64,iVBORw0KGgo=')
    ).toBe('data:image/png;base64,iVBORw0KGgo=');
  });

  it('data: 非 image 类型仍拒绝', () => {
    expect(normalizeSafeImageUrl('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('调用方扩展协议进入白名单', () => {
    expect(normalizeSafeImageUrl('attachment://a.png', ['attachment:'])).toBe(
      'attachment://a.png'
    );
  });
});
