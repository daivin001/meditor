/**
 * utils/dismiss-broadcast.ts — 外部按下统一广播
 *
 * "点外部关闭浮层"的统一机制:document 捕获阶段只挂一份 pointerdown 监听,
 * 每次按下派发一次 `zt-md:outside-press` 广播(携带原始事件);各浮层组件
 * (mtable 筛选面板/右键菜单、slash 菜单、emoji 选择器等)通过 onOutsidePress
 * 订阅,自行判断按下落点是否在自己 DOM 内——是则忽略,否则关闭自己的浮层。
 *
 * 取代各组件各自挂 document mousedown、扩展之间逐个调用对方关闭函数的网状耦合:
 * 新增浮层组件只需一行订阅,无需宿主感知。
 *
 * 捕获阶段监听先于一切冒泡/内部 stopPropagation 处理,保证广播必达。
 */

/** 外部按下广播事件名(document 级 CustomEvent)。 */
export const OUTSIDE_PRESS_EVENT = 'zt-md:outside-press';

/** 广播安装状态(单例:整个文档只装一份捕获监听,无订阅方时保持安装)。 */
let installed = false;

/**
 * 安装单例捕获监听:每次 pointerdown 派发一次广播。
 */
const ensureInstalled = (): void => {
  if (installed) {
    return;
  }
  installed = true;
  document.addEventListener(
    'pointerdown',
    (event) => {
      document.dispatchEvent(new CustomEvent(OUTSIDE_PRESS_EVENT, { detail: { event } }));
    },
    true
  );
};

/**
 * 订阅外部按下广播。
 *
 * @param handler 收到原始 pointerdown 事件;订阅方自行用 contains 判断
 *   按下落点是否在自己的浮层/宿主 DOM 内,是则忽略,否则关闭自己的浮层
 * @returns 退订函数
 */
export const onOutsidePress = (handler: (event: PointerEvent) => void): (() => void) => {
  ensureInstalled();
  const handleBroadcast = (customEvent: Event): void => {
    const detail = (customEvent as CustomEvent<{ event: PointerEvent }>).detail;
    if (detail) {
      handler(detail.event);
    }
  };
  document.addEventListener(OUTSIDE_PRESS_EVENT, handleBroadcast);
  return () => {
    document.removeEventListener(OUTSIDE_PRESS_EVENT, handleBroadcast);
  };
};
