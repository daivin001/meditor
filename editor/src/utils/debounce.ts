/**
 * utils/debounce.ts — 防抖
 *
 * 1:1 翻译自 es-toolkit/function 的 debounce 行为,
 * 保持 .cancel() / 异步 .flush() 语义,但用纯手写实现替换 es-toolkit 依赖。
 */

export interface DebouncedFunction<TArgs extends readonly unknown[]> {
  (...args: TArgs): void;
  /** 取消挂起的执行。 */
  cancel: () => void;
  /** 立即同步触发挂起的执行并清除挂起。 */
  flush: () => void;
  /** 判断是否还有挂起的执行。 */
  pending: () => boolean;
}

/**
 * 创建一个 debounce 函数,该函数延迟调用 fn,直到自上次调用起 wait 毫秒后。
 * 每次新调用都会重置计时器。
 */
export const debounce = <TArgs extends readonly unknown[]>(
  fn: (...args: TArgs) => void,
  wait: number
): DebouncedFunction<TArgs> => {
  /** 当前挂起的 timer id。 */
  let timerId: ReturnType<typeof setTimeout> | null = null;
  /** 最近一次挂起调用的参数。 */
  let lastArgs: TArgs | null = null;

  /**
   * 实际调用 fn 并清理挂起状态。
   */
  const invoke = (): void => {
    timerId = null;
    if (lastArgs !== null) {
      const args = lastArgs;
      lastArgs = null;
      fn(...args);
    }
  };

  const debounced = ((...args: TArgs): void => {
    lastArgs = args;
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(invoke, wait);
  }) as DebouncedFunction<TArgs>;

  debounced.cancel = (): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    lastArgs = null;
  };

  debounced.flush = (): void => {
    if (timerId === null) {
      return;
    }
    clearTimeout(timerId);
    invoke();
  };

  debounced.pending = (): boolean => timerId !== null;

  return debounced;
};
