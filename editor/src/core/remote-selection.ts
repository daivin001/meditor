/**
 * core/remote-selection.ts — 双栏同步的远端选区高亮插件
 *
 * 双栏同步时对侧选区在 meditor 侧的可见高亮(meditor 未聚焦,原生选区不
 * 渲染)。装饰集存于插件状态,经 meta 整体替换写入;doc 变更时跟随映射,
 * 选区同步与用户编辑互不打断。
 */

import { DecorationSet } from '@milkdown/prose/view';
import type { EditorState } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import { Plugin, PluginKey } from '@milkdown/prose/state';
import { $prose } from '@milkdown/utils';

export const remoteSelectionKey = new PluginKey('zt-md-remote-selection');

export const remoteSelectionHighlightPlugin = $prose(
  () =>
    new Plugin({
      key: remoteSelectionKey,
      state: {
        init: () => DecorationSet.empty,
        apply: (tr, set) => {
          const meta = tr.getMeta(remoteSelectionKey) as DecorationSet | undefined;
          if (meta) return meta;
          return tr.docChanged ? set.map(tr.mapping, tr.doc) : set;
        },
      },
      props: {
        decorations: (state: EditorState) =>
          remoteSelectionKey.getState(state) as DecorationSet | undefined,
      },
      view: () => ({
        // meditor 持焦即清(高亮只应出现在未聚焦侧);点击/mousedown 会先经
        // setSelection 触发 update。集为空时跳过,天然无 dispatch 循环。
        update: (view: EditorView) => {
          if (!view.hasFocus) return;
          const cur = remoteSelectionKey.getState(view.state) as DecorationSet | undefined;
          if (cur && cur.find().length > 0) {
            view.dispatch(view.state.tr.setMeta(remoteSelectionKey, DecorationSet.empty));
          }
        },
      }),
    }),
);
