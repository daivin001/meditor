/**
 * collab/realtime.ts — 实时协同(P4,服务端配套跟 ppserver 节奏立项)
 *
 * 编辑器侧接线(y-prosemirror 官方路径):
 * - ySyncPlugin(Y.XmlFragment ↔ PM doc 双向同步)+ yUndoPlugin(Yjs undo,
 *   trackedOrigins 限定本地 origin,远端变更不进本端撤销栈)+ yCursorPlugin
 *   (远端光标/选区 presence);
 * - 服务端无关:createMeditorRealtime 只负责绑定;连接由宿主注入 provider
 *   (WebRTC/WebSocket/y-webrtc/y-websocket 均可),ppserver 中继另行立项;
 * - 初始内容种子:Y 片段为空时以编辑器当前文档初始化(prosemirrorJSONToYXmlFragment,
 *   只发生一次);随后用 Y 片段内容回填 PM doc,交给 ySyncPlugin 双向同步。
 * - 零全局单例;destroy 时反注册插件、销毁 awareness、断开 provider。
 */
import type * as Y from 'yjs';
import {
  ySyncPlugin,
  yUndoPlugin,
  yCursorPlugin,
  yXmlFragmentToProseMirrorRootNode,
  prosemirrorJSONToYXmlFragment,
} from 'y-prosemirror';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import type { EditorView } from '@milkdown/prose/view';
import { editorViewCtx, type Editor } from '@milkdown/core';
import { readSliceWhen } from '../core/ctx-access';

/**
 * 实时协同连接状态。
 */
export type MeditorCollabStatus = 'connecting' | 'connected' | 'disconnected';

/**
 * 协同 provider 最小接口(宿主注入;约定 Yjs 消息协议)。
 */
export interface MeditorCollabProviderLike {
  /** 连接(可选;断线重连由 provider 自理)。 */
  connect?(): void;
  /** 断开。 */
  disconnect?(): void;
  /**
   * 订阅连接状态变化(可选;provider 未实现时不透出状态,状态 UI 完全不渲染)。
   * 订阅时应同步回调一次当前状态。
   */
  onStatusChange?(cb: (status: MeditorCollabStatus) => void): void;
  /** 绑定 doc/awareness 的双向同步(provider 实现内部消费)。 */
  doc: Y.Doc;
  awareness: Awareness;
}

/**
 * 实时协同配置。
 */
export interface MeditorCollabOptions {
  /** Yjs 文档(宿主创建并接入 provider)。 */
  ydoc: Y.Doc;
  /** 协同片段名(默认 'document')。 */
  fragmentName?: string;
  /** 本端用户 presence(远端光标显示)。 */
  user?: { name?: string; color?: string };
  /** provider(可选;不传 = 本地 Yjs 绑定,供测试/单机)。 */
  provider?: MeditorCollabProviderLike;
}

/**
 * 实时协同句柄。
 */
export interface MeditorRealtimeHandle {
  /** 绑定到的 Y.XmlFragment。 */
  readonly fragment: Y.XmlFragment;
  /** awareness 实例。 */
  readonly awareness: Awareness;
  /**
   * 注册连接状态回调(provider 未实现 onStatusChange 时不触发;
   * 注册时同步回调一次当前状态)。返回反注册函数。
   */
  onCollabStatus?: (cb: (status: MeditorCollabStatus) => void) => () => void;
  /** 销毁(反注册插件、销毁 awareness、断开 provider;不动 ydoc)。 */
  destroy: () => void;
}

/** 本地协同 origin(yUndoPlugin trackedOrigins 用;远端默认 origin 不入本端栈)。 */
const LOCAL_ORIGIN = 'meditor-local';

/**
 * 活跃实时绑定注册表(按 milkdown Editor 实例隔离;WeakSet 随编辑器销毁自动释放,
 * 多实例互不覆盖)。整篇替换入口(runtime.setMarkdown)据此显式检测 realtime 是否激活。
 */
const activeRealtimeBindings = new WeakSet<Editor>();

/**
 * 判断指定编辑器当前是否绑定了实时协同。
 *
 * @param editor milkdown 编辑器实例
 * @returns createMeditorRealtime 已成功绑定且未 destroy 时返回 true
 */
export const isRealtimeBound = (editor: Editor): boolean => activeRealtimeBindings.has(editor);

/**
 * 把编辑器当前文档作为 Y 片段种子(仅片段为空时;多端首连只有一端真正写入)。
 */
const seedFragmentIfEmpty = (fragment: Y.XmlFragment, view: EditorView, ydoc: Y.Doc): void => {
  if (fragment.length > 0 || view.state.doc.childCount === 0) {
    return;
  }
  ydoc.transact(() => {
    prosemirrorJSONToYXmlFragment(view.state.schema, view.state.doc.toJSON() as never, fragment);
  }, LOCAL_ORIGIN);
};

/**
 * 绑定实时协同到已创建的 milkdown 编辑器。
 *
 * 时序要求:editor.create() 完成后调用(需要 editorViewCtx 就绪)。
 * 返回句柄;编辑器销毁前宿主须调用 destroy()。
 */
export const createMeditorRealtime = async (
  editor: Editor,
  options: MeditorCollabOptions,
): Promise<MeditorRealtimeHandle> => {
  const { ydoc, fragmentName = 'document', user, provider } = options;

  // 取编辑器视图(create() 未完成时此 ctx 尚未注入,readSliceWhen 返回 null 后抛错提示调用方)。
  const editorView = readSliceWhen(editor, editorViewCtx, (candidate) => candidate.state != null);
  if (!editorView) {
    throw new Error('[meditor collab] editor view not ready; call after editor.create() resolved');
  }

  const fragment = ydoc.getXmlFragment(fragmentName);
  const awareness = provider?.awareness ?? new Awareness(ydoc);
  if (user) {
    awareness.setLocalStateField('user', user);
  }

  // 片段为空 → 用当前文档种子。
  seedFragmentIfEmpty(fragment, editorView, ydoc);

  // 用 Y 片段替换 PM doc(初始对齐;后续由 ySyncPlugin 双向同步)。
  const syncedDoc = yXmlFragmentToProseMirrorRootNode(fragment, editorView.state.schema);
  editorView.updateState(
    editorView.state.apply(
      editorView.state.tr.replaceWith(0, editorView.state.doc.content.size, syncedDoc.content),
    ),
  );

  // 注册 y-plugins(prosemirror-view 1.42 起 registerPlugin 已移除,
  // 对运行中视图统一走 state.reconfigure;destroy 按实例引用过滤)。
  const syncPlugin = ySyncPlugin(fragment);
  // trackedOrigins 追加本地 origin:库默认已追踪 ySyncPluginKey(本端 PM 编辑经
  // ySyncPlugin 同步时以该 origin 写 Y,天然入本端撤销栈);LOCAL_ORIGIN 追踪
  // 种子写入等显式本地事务。远端默认 origin 仍不入本端栈。
  const undoPlugin = yUndoPlugin({ trackedOrigins: [LOCAL_ORIGIN] });
  const cursorPluginInstance = yCursorPlugin(awareness, {});
  const collabPlugins = [syncPlugin, undoPlugin, cursorPluginInstance];

  editorView.updateState(
    editorView.state.reconfigure({
      plugins: [...editorView.state.plugins, ...collabPlugins],
    }),
  );

  // provider 连接。
  provider?.connect?.();

  // 登记活跃绑定(整篇替换入口经 isRealtimeBound 显式检测)。
  activeRealtimeBindings.add(editor);

  // --- 连接状态透出(provider 实现了 onStatusChange 才启用) ---
  /** 当前连接状态。 */
  let currentStatus: MeditorCollabStatus | null = null;
  /** 状态回调集合。 */
  const statusListeners = new Set<(status: MeditorCollabStatus) => void>();
  if (provider?.onStatusChange) {
    provider.onStatusChange((status) => {
      currentStatus = status;
      statusListeners.forEach((listener) => listener(status));
    });
  }

  return {
    fragment,
    awareness,
    ...(provider?.onStatusChange
      ? {
          onCollabStatus: (cb: (status: MeditorCollabStatus) => void) => {
            statusListeners.add(cb);
            // 注册即同步当前状态(未知时按 disconnected 兜底)。
            cb(currentStatus ?? 'disconnected');
            return () => {
              statusListeners.delete(cb);
            };
          },
        }
      : {}),
    destroy: () => {
      statusListeners.clear();
      // 撤销活跃绑定登记(此后整篇替换入口不再按 realtime 路径提示)。
      activeRealtimeBindings.delete(editor);
      if (!editorView.isDestroyed) {
        editorView.updateState(
          editorView.state.reconfigure({
            plugins: editorView.state.plugins.filter((plugin) => !collabPlugins.includes(plugin)),
          }),
        );
      }
      provider?.disconnect?.();
      awareness.destroy();
    },
  };
};

/**
 * awareness 编解码再导出(宿主 provider 实现用)。
 */
export { applyAwarenessUpdate, encodeAwarenessUpdate };
