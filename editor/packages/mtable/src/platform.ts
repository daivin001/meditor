/**
 * platform.ts — 平台判定
 *
 * navigator.platform 已被 HTML 规范废弃且取值不可靠,统一收敛于此:
 * 优先 navigator.userAgentData.platform(Chromium,UA-CH 规范值),
 * 缺省回退 userAgent 正则。与 @meditor/editor 的 utils/platform.ts 语义一致
 * (本包零运行时依赖,不跨包引用)。
 */

/** userAgent 回退判定模式(Apple 系平台串;与历史 navigator.platform 判定语义一致)。 */
const MAC_UA_PATTERN = /Mac|iPhone|iPad|iPod/;

/** userAgentData 兼容形状(标准类型尚未进入 TypeScript DOM lib,此处最小结构化访问)。 */
interface NavigatorUaDataLike {
  /** 操作系统平台串(如 'macOS' / 'Windows')。 */
  platform?: string;
}

/**
 * 当前平台是否为 Apple 系(macOS / iOS / iPadOS)。
 *
 * @returns Apple 系平台返回 true;无 navigator 环境(测试/SSR)返回 false
 */
export const isMac = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }
  // userAgentData 优先(Chromium;platform 为 UA-CH 规范值,如 'macOS')。
  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUaDataLike }).userAgentData;
  if (typeof uaData?.platform === 'string' && uaData.platform.length > 0) {
    return /mac|iphone|ipad|ipod/i.test(uaData.platform);
  }
  // 回退 userAgent(旧浏览器 / 未暴露 userAgentData 的环境)。
  return MAC_UA_PATTERN.test(navigator.userAgent);
};
