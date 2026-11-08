/**
 * collab/status-badge.ts — 实时协同连接状态徽标(P4)
 *
 * createCollabStatusBadge(host, handle, locale):在宿主容器(协作面板所在处)
 * 渲染一个小状态点 + 文字(已连接/连接中/已断开);provider 未实现
 * onStatusChange 钩子时完全不渲染任何 DOM。样式见 collab.css 的
 * .zt-md-collab-status(低调 10-11px,灰/绿/红点)。
 */
import type { EditorI18nMessages, EditorLocale } from '../types/editor';
import { resolveEditorMessages } from '../local/i18n';
import type { MeditorCollabStatus, MeditorRealtimeHandle } from './realtime';
import './collab.css';

/** 连接状态 → 统一词典键映射。 */
const STATUS_MESSAGE_KEY: Record<
  MeditorCollabStatus,
  keyof Pick<
    EditorI18nMessages,
    'collabStatusConnecting' | 'collabStatusConnected' | 'collabStatusDisconnected'
  >
> = {
  connecting: 'collabStatusConnecting',
  connected: 'collabStatusConnected',
  disconnected: 'collabStatusDisconnected',
};

/**
 * 状态徽标句柄。
 */
export interface CollabStatusBadgeApi {
  /** 销毁(移除 DOM + 反注册状态监听)。 */
  destroy: () => void;
}

/**
 * 创建实时协同连接状态徽标。
 *
 * @param host 徽标挂载宿主(建议与评论/版本历史面板同一容器)。
 * @param handle enableRealtime 返回的实时协同句柄。
 * @param locale 语言。
 * @returns 徽标句柄;provider 未实现状态钩子时 destroy 为空操作。
 */
export const createCollabStatusBadge = (
  host: HTMLElement,
  handle: Pick<MeditorRealtimeHandle, 'onCollabStatus'>,
  locale: EditorLocale = 'zh-CN',
): CollabStatusBadgeApi => {
  // 文案经 meditor 统一词典(内嵌双语表已并入 local/zh-CN、local/en-US)。
  const messages = resolveEditorMessages(locale);

  // 状态节点(未收到首个状态前按 connecting 展示;钩子缺失时整个节点不挂载)。
  const wrap = document.createElement('div');
  wrap.className = 'zt-md-collab-status';
  wrap.dataset.status = 'connecting';
  const dot = document.createElement('span');
  dot.className = 'zt-md-collab-status-dot';
  const text = document.createElement('span');
  text.className = 'zt-md-collab-status-text';
  text.textContent = messages.collabStatusConnecting;
  wrap.append(dot, text);

  /** 状态变化重绘。 */
  const render = (status: MeditorCollabStatus): void => {
    wrap.dataset.status = status;
    text.textContent = messages[STATUS_MESSAGE_KEY[status]];
  };

  const subscribe = handle.onCollabStatus;
  if (!subscribe) {
    // provider 未实现状态钩子:完全不渲染。
    return { destroy: () => undefined };
  }

  const unsubscribe = subscribe(render);
  host.appendChild(wrap);

  return {
    destroy: () => {
      unsubscribe();
      wrap.remove();
    },
  };
};
