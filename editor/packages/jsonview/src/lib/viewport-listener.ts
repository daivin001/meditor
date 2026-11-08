/**
 * lib/viewport-listener.ts — 视口变化统一订阅(window resize + document 捕获滚动)
 *
 * 本包零运行时依赖,不跨包引用 meditor 的 editor-overlay-position;此处按同一
 * "共享绑定辅助"思路收敛此前散落的裸 window resize / document scroll 监听:
 * 下拉浮层(dropdown)与右键菜单(text-view)在视口变化(缩放/滚动/回流)时
 * 收起浮层,统一经 subscribeViewportChange 绑定/解绑,避免 add/remove 配对散落。
 */

/**
 * 视口变化监听器(收到 resize 或捕获阶段 scroll 事件)。
 */
export type ViewportChangeListener = (event: Event) => void;

/**
 * 订阅视口变化(window resize + document 捕获阶段 scroll)。
 *
 * @param listener 变化监听器
 * @returns 取消订阅函数(幂等)
 */
export const subscribeViewportChange = (listener: ViewportChangeListener): (() => void) => {
  window.addEventListener('resize', listener);
  document.addEventListener('scroll', listener, true);
  let subscribed = true;
  return () => {
    if (!subscribed) {
      return;
    }
    subscribed = false;
    window.removeEventListener('resize', listener);
    document.removeEventListener('scroll', listener, true);
  };
};
