/**
 * plugins/custom/code-block/code-block-mod-a-select.ts — code_block Mod-A 全选
 *
 * 1:1 翻译自 zt-react-milkdown/src/plugins/custom/code-block/code-block-mod-a-select.ts
 */
import { Plugin, PluginKey, TextSelection } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import { $prose } from '@milkdown/utils';
import { isMac } from '../../../utils/platform';

/** code_block 节点名。 */
const CODE_BLOCK_NODE_NAME = 'code_block';

/**
 * 处理 code_block 内 Mod-A 全选。
 */
const handleCodeBlockSelectAll = (view: EditorView, event: KeyboardEvent): boolean => {
  const { state } = view;
  const { selection } = state;
  if (!selection.empty) {
    return false;
  }

  if (!selection.$from.parent || selection.$from.parent.type.name !== CODE_BLOCK_NODE_NAME) {
    return false;
  }

  const modKey = isMac() ? event.metaKey : event.ctrlKey;
  if (!modKey || !event.key.toLowerCase().startsWith('a')) {
    return false;
  }

  event.preventDefault();

  const codeBlockStart = selection.$from.start();
  const codeBlockEnd = selection.$from.end();
  view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, codeBlockStart, codeBlockEnd)));
  return true;
};

/**
 * code_block Mod-A 全选插件。
 */
export const codeBlockModASelectPlugin = $prose(() => {
  return new Plugin({
    key: new PluginKey('zt-md-code-block-mod-a-select'),
    props: {
      handleKeyDown: (view, event) => {
        return handleCodeBlockSelectAll(view, event);
      }
    }
  });
});
