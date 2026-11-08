/**
 * plugins/custom/toolbar/toolbar-commands.ts — 工具栏命令执行与状态查询
 *
 * 命令复用现有模块:
 * - mark 类:selection-tooltip/mark-logic(resolveMarkType / isMarkActive)
 * - 块转换:block-transform(runBlockTransformCommand)
 * - 表格/公式:slash-menu-commands(insertDefaultTable / insertInlineMath / insertMathBlock)
 * - 插入菜单:slash-menu-opener(openSlashMenuAt)
 * - 撤销/重做:@milkdown/prose/history
 */
import { lift, setBlockType, toggleMark } from '@milkdown/prose/commands';
import type { NodeType } from '@milkdown/prose/model';
import { TextSelection } from '@milkdown/prose/state';
import type { EditorState } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import { redo, undo } from '@milkdown/prose/history';
import type {
  BlockTransformCommand,
  EditorI18nMessages,
  ImageUploadConfig,
  ToolbarCommand
} from '../../../types/editor';
import { runBlockTransformCommand, resolveActiveBlockTransformCommands } from '../block-transform';
import { isMarkActive, resolveMarkType } from '../selection-tooltip/mark-logic';
import { openSlashMenuAt } from '../slash-menu/slash-menu-opener';
import { insertDefaultTable, insertInlineMath, insertMathBlock, runSlashCommand } from '../slash-menu/slash-menu-commands';
import { showImageUploadDialog } from '../image/image-upload-dialog';
import { showEmojiPicker } from '../../../components/emoji-picker';

/**
 * 工具栏命令执行上下文。
 */
export interface ToolbarCommandContext {
  /** 当前编辑器视图。 */
  view: EditorView;
  /** 浮层 Portal 容器(图片上传弹窗宿主)。 */
  portalContainer: HTMLElement;
  /** 编辑器文案。 */
  messages: EditorI18nMessages;
  /** 图片上传配置。 */
  imageUpload?: ImageUploadConfig;
  /** 打开搜索面板回调。 */
  onOpenSearch: () => void;
  /** 命令执行后收起工具栏下拉面板回调。 */
  closeDropdown: () => void;
  /** 触发命令的按钮视口矩形(emoji 面板锚点;缺省锚定光标)。 */
  anchorRect?: DOMRect | null;
  /** 触发命令的按钮元素(emoji 面板 resize 实时重锚用;与 anchorRect 同时提供)。 */
  anchorEl?: HTMLElement | null;
}

/** ProseMirror 命令执行器类型。 */
type EditorCommandExecutor = (state: unknown, dispatch: unknown, view: unknown) => boolean;

/**
 * 查询历史命令(undo/redo)是否可执行(不产生副作用)。
 */
export const canRunHistoryCommand = (state: EditorState, command: 'undo' | 'redo'): boolean => {
  // 历史命令以 undefined dispatch 仅做查询。
  const query = command === 'undo' ? (undo as unknown as EditorCommandExecutor) : (redo as unknown as EditorCommandExecutor);
  return query(state, undefined, undefined) === true;
};

/**
 * 切换普通行内 mark。
 */
const toggleInlineMark = (view: EditorView, markNames: string[]): boolean => {
  // 目标 mark 类型。
  const markType = resolveMarkType(view, markNames);
  if (!markType) {
    return false;
  }

  // mark 切换命令。
  const command = toggleMark(markType);
  command(view.state, view.dispatch, view);
  view.focus();
  return true;
};

/**
 * 插入分割线(hr)并在其下补空段落,保证光标可继续输入。
 */
const insertHorizontalRule = (view: EditorView): boolean => {
  // schema 节点集合。
  const nodes = view.state.schema.nodes as Record<string, NodeType | undefined>;
  // hr 节点类型。
  const hrType = nodes.horizontal_rule;
  // 段落节点类型。
  const paragraphType = nodes.paragraph;
  if (!hrType || !view.state || !view.dispatch) {
    return false;
  }

  // 选区替换为 hr。
  view.dispatch(view.state.tr.replaceSelectionWith(hrType.create()).scrollIntoView());

  // 插入后选区应落在 hr 节点上;在其后补空段落。
  const selectionFrom = view.state.selection.from;
  const insertedNode = view.state.doc.nodeAt(selectionFrom);
  if (insertedNode && insertedNode.type === hrType) {
    // hr 之后的插入位置。
    const insertPos = selectionFrom + insertedNode.nodeSize;
    const followUp = view.state.tr;
    if (paragraphType) {
      followUp.insert(insertPos, paragraphType.create());
    }

    followUp.setSelection(TextSelection.near(followUp.doc.resolve(insertPos + 1), 1));
    view.dispatch(followUp.scrollIntoView());
  }

  view.focus();
  return true;
};

/**
 * 清除格式:移除选区全部 marks,提升列表/引用包裹,并将文本块转回段落。
 */
const clearFormatting = (view: EditorView): boolean => {
  if (!view.state || !view.dispatch) {
    return false;
  }

  // 选区范围。
  const { from, to } = view.state.selection;
  // 移除全部 marks(未指定 mark 类型即全清)。
  view.dispatch(view.state.tr.removeMark(from, to).scrollIntoView());

  // 逐层提升列表/引用包裹(有上限保护,防止死循环)。
  for (let attempt = 0; attempt < 10; attempt += 1) {
    // lift 命令:无可提升包裹时返回 false。
    const lifted = (lift as unknown as EditorCommandExecutor)(view.state, view.dispatch, view);
    if (!lifted) {
      break;
    }
  }

  // 文本块(标题等)转回段落。
  const paragraphType = view.state.schema.nodes.paragraph as NodeType | undefined;
  if (paragraphType) {
    (setBlockType as (type: NodeType) => EditorCommandExecutor)(paragraphType)(view.state, view.dispatch, view);
  }

  view.focus();
  return true;
};

/**
 * 执行工具栏命令。
 *
 * @returns 命令是否执行成功(用于决定是否收起下拉面板)
 */
export const runToolbarCommand = (command: ToolbarCommand, context: ToolbarCommandContext): boolean => {
  const { view, portalContainer, messages, imageUpload, onOpenSearch, closeDropdown, anchorRect, anchorEl } = context;

  /**
   * 块转换类命令统一走 runBlockTransformCommand。
   */
  const runBlockCommand = (blockCommand: BlockTransformCommand): boolean => {
    const success = runBlockTransformCommand(view, blockCommand);
    if (success) {
      view.focus();
    }
    return success;
  };

  switch (command) {
    case 'blockMenu':
      // 绿色加号:在当前光标处打开全功能菜单(无效上下文由 opener 自行忽略)。
      closeDropdown();
      return openSlashMenuAt(view);
    case 'undo': {
      const success = (undo as unknown as EditorCommandExecutor)(view.state, view.dispatch, view);
      if (success) {
        view.focus();
      }
      return success;
    }
    case 'redo': {
      const success = (redo as unknown as EditorCommandExecutor)(view.state, view.dispatch, view);
      if (success) {
        view.focus();
      }
      return success;
    }
    case 'strong':
      return toggleInlineMark(view, ['strong']);
    case 'em':
      return toggleInlineMark(view, ['em', 'emphasis']);
    case 'strike':
      return toggleInlineMark(view, ['strike_through', 'strikeThrough']);
    case 'underline':
      return toggleInlineMark(view, ['underline']);
    case 'subscript':
      return toggleInlineMark(view, ['subscript']);
    case 'superscript':
      return toggleInlineMark(view, ['superscript']);
    case 'inlineCode':
      return toggleInlineMark(view, ['inlineCode', 'code_inline']);
    // 链接按钮由专用 LinkControl 触发,不在此分发。
    case 'paragraph':
      return runBlockCommand('paragraph');
    case 'heading1':
      return runBlockCommand('heading1');
    case 'heading2':
      return runBlockCommand('heading2');
    case 'heading3':
      return runBlockCommand('heading3');
    case 'heading4':
      return runBlockCommand('heading4');
    case 'heading5':
      return runBlockCommand('heading5');
    case 'heading6':
      return runBlockCommand('heading6');
    case 'bulletList':
      return runBlockCommand('bulletList');
    case 'orderedList':
      return runBlockCommand('orderedList');
    case 'taskList':
      return runBlockCommand('taskList');
    case 'blockquote':
      return runBlockCommand('blockquote');
    case 'codeBlock':
      return runBlockCommand('codeBlock');
    case 'hr':
      closeDropdown();
      return insertHorizontalRule(view);
    case 'table':
      closeDropdown();
      return insertDefaultTable(view as never);
    case 'callout':
    case 'toggle':
    case 'csvTable':
    case 'database':
    case 'video':
    case 'audio':
    case 'bookmark':
    case 'embed':
      // 补齐加号菜单同款插入项:统一委派 slash 命令层(媒体四类经 meta 弹宿主 URL 浮层)。
      closeDropdown();
      return runSlashCommand(view, command);
    case 'image': {
      closeDropdown();
      showImageUploadDialog({ portalContainer, view, messages, imageUpload });
      return true;
    }
    case 'inlineMath':
      closeDropdown();
      return insertInlineMath(view as never);
    case 'mathBlock':
      closeDropdown();
      return insertMathBlock(view as never);
    case 'emoji':
      closeDropdown();
      showEmojiPicker({ portalContainer, view, messages, anchorRect, anchorEl });
      return true;
    case 'clearFormat':
      return clearFormatting(view);
    case 'search':
      closeDropdown();
      onOpenSearch();
      return true;
    default:
      return false;
  }
};

/**
 * mark 类命令的激活态查询表。
 */
const MARK_COMMAND_NAMES: Partial<Record<ToolbarCommand, string[]>> = {
  strong: ['strong'],
  em: ['em', 'emphasis'],
  strike: ['strike_through', 'strikeThrough'],
  inlineCode: ['inlineCode', 'code_inline'],
  link: ['link']
};

/**
 * 块转换类命令到激活命令的映射(命中 resolveActiveBlockTransformCommands 集合即激活)。
 */
const BLOCK_COMMAND_ACTIVE_MAP: Partial<Record<ToolbarCommand, BlockTransformCommand>> = {
  blockTransform: 'paragraph',
  heading1: 'heading1',
  heading2: 'heading2',
  heading3: 'heading3',
  heading4: 'heading4',
  heading5: 'heading5',
  heading6: 'heading6',
  bulletList: 'bulletList',
  orderedList: 'orderedList',
  taskList: 'taskList',
  blockquote: 'blockquote',
  codeBlock: 'codeBlock'
};

/**
 * 查询命令当前激活态(按钮高亮)。
 */
export const isToolbarCommandActive = (view: EditorView, command: ToolbarCommand): boolean => {
  // mark 类:选区内包含目标 mark。
  const markNames = MARK_COMMAND_NAMES[command];
  if (markNames) {
    // 目标 mark 类型。
    const markType = resolveMarkType(view, markNames);
    return markType ? isMarkActive(view.state, markType) : false;
  }

  // 块转换类:当前光标所在块命中(复用块转换激活集合,含任务/无序列表互斥)。
  const blockCommand = BLOCK_COMMAND_ACTIVE_MAP[command];
  if (blockCommand) {
    return resolveActiveBlockTransformCommands(view).has(blockCommand);
  }

  return false;
};
