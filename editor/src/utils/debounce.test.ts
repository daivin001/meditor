/**
 * debounce.test.ts — 手写防抖工具回归(meditor onChange 节流的基础设施)
 * 覆盖:trailing 合并、flush 防丢尾、cancel、pending 状态。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { debounce } from './debounce.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('窗口内的多次调用合并为一次,取最后一次参数', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 150);
    debounced('a');
    vi.advanceTimersByTime(50);
    debounced('b');
    vi.advanceTimersByTime(50);
    debounced('c');
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('flush 立即触发挂起的调用(防丢尾)', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 150);
    debounced('x');
    expect(debounced.pending()).toBe(true);
    debounced.flush();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('x');
    expect(debounced.pending()).toBe(false);
  });

  it('无挂起时 flush 是 no-op', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 150);
    debounced.flush();
    expect(fn).not.toHaveBeenCalled();
  });

  it('cancel 取消挂起的执行', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 150);
    debounced('x');
    debounced.cancel();
    expect(debounced.pending()).toBe(false);
    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();
  });
});
