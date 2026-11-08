/**
 * normalize-inline-color.test.ts — 行内颜色归一化与 CSS 注入防线测试
 */
import { describe, expect, it } from 'vitest';
import { normalizeInlineColor } from './color-marks';

describe('normalizeInlineColor', () => {
  it('接受 6 位 hex 并统一小写', () => {
    expect(normalizeInlineColor('#2563EB')).toBe('#2563eb');
  });

  it('接受 3 位 hex(不展开)', () => {
    expect(normalizeInlineColor('#F00')).toBe('#f00');
  });

  it('rgb()/rgba() 归一化为 6 位 hex', () => {
    expect(normalizeInlineColor('rgb(37, 99, 235)')).toBe('#2563eb');
    expect(normalizeInlineColor('rgba(255, 0, 0, 0.5)')).toBe('#ff0000');
    // 分量超界夹取到 [0,255]。
    expect(normalizeInlineColor('rgb(300, 0, 12)')).toBe('#ff000c');
    // 负分量不匹配数字模式,整体拒绝。
    expect(normalizeInlineColor('rgb(-5, 0, 12)')).toBe('');
  });

  it('拒绝 CSS 注入载荷', () => {
    expect(normalizeInlineColor('red;background-image:url(https://evil)')).toBe('');
    expect(normalizeInlineColor('url(https://attacker.example/track.png)')).toBe('');
    expect(normalizeInlineColor('expression(alert(1))')).toBe('');
    expect(normalizeInlineColor('')); 
  });

  it('拒绝具名颜色与非法格式', () => {
    expect(normalizeInlineColor('red')).toBe('');
    expect(normalizeInlineColor('#12345')).toBe('');
    expect(normalizeInlineColor('#1234567')).toBe('');
    expect(normalizeInlineColor('hsl(0, 100%, 50%)')).toBe('');
  });
});
