/**
 * plugins/custom/selection-tooltip/constants.ts — 选区工具栏菜单项配置
 *
 * 1:1 翻译自 zt-react-milkdown/src/plugins/custom/selection-tooltip/constants.ts
 * - lucide 图标组件改为图标键名
 */
import type { BlockTransformCommand, EditorI18nMessages, EditorShortcutMode } from '../../../types/editor';
import { resolveBlockTransformShortcutLabels } from '../block-transform';
import type { SelectionBlockTransformItem, SelectionTooltipItem } from './types';

// 选区 tooltip 插件唯一标识。
export const SELECTION_TOOLTIP_ID = 'zt-md-selection-tooltip';

/**
 * 构建当前语言下的选区菜单项配置。
 */
export const resolveSelectionTooltipItems = (messages: EditorI18nMessages): SelectionTooltipItem[] => {
  return [
    { command: 'strong', icon: 'bold', title: messages.selectionTooltipStrongTitle, markNames: ['strong'] },
    { command: 'em', icon: 'italic', title: messages.selectionTooltipEmTitle, markNames: ['em', 'emphasis'] },
    {
      command: 'strike',
      icon: 'strikethrough',
      title: messages.selectionTooltipStrikeTitle,
      markNames: ['strike_through', 'strikeThrough']
    },
    {
      command: 'underline',
      icon: 'underline',
      title: messages.selectionTooltipUnderlineTitle,
      markNames: ['underline']
    },
    {
      command: 'subscript',
      icon: 'subscript',
      title: messages.selectionTooltipSubscriptTitle,
      markNames: ['subscript']
    },
    {
      command: 'superscript',
      icon: 'superscript',
      title: messages.selectionTooltipSuperscriptTitle,
      markNames: ['superscript']
    },
    {
      command: 'inlineCode',
      icon: 'inlineCode',
      title: messages.selectionTooltipInlineCodeTitle,
      markNames: ['inlineCode', 'code_inline']
    },
    { command: 'link', icon: 'link', title: messages.selectionTooltipLinkTitle, markNames: ['link'] }
  ];
};

/**
 * 块级转换命令图标映射表。
 */
const BLOCK_TRANSFORM_ICON_MAP: Record<BlockTransformCommand, string> = {
  paragraph: 'paragraph',
  heading1: 'heading1',
  heading2: 'heading2',
  heading3: 'heading3',
  heading4: 'heading4',
  heading5: 'heading5',
  heading6: 'heading6',
  bulletList: 'list',
  orderedList: 'orderedList',
  taskList: 'taskList',
  blockquote: 'quote',
  codeBlock: 'codeBlock'
};

/**
 * 构建块级转换菜单项配置。
 */
export const resolveSelectionBlockTransformItems = (
  messages: EditorI18nMessages,
  shortcutMode: EditorShortcutMode
): SelectionBlockTransformItem[] => {
  // 当前平台快捷键展示文案。
  const shortcuts = resolveBlockTransformShortcutLabels(shortcutMode);
  return [
    {
      command: 'paragraph',
      icon: BLOCK_TRANSFORM_ICON_MAP.paragraph,
      label: messages.selectionTooltipTransformParagraphLabel,
      shortcut: shortcuts.paragraph
    },
    {
      command: 'heading1',
      icon: BLOCK_TRANSFORM_ICON_MAP.heading1,
      label: messages.selectionTooltipTransformHeading1Label,
      shortcut: shortcuts.heading1
    },
    {
      command: 'heading2',
      icon: BLOCK_TRANSFORM_ICON_MAP.heading2,
      label: messages.selectionTooltipTransformHeading2Label,
      shortcut: shortcuts.heading2
    },
    {
      command: 'heading3',
      icon: BLOCK_TRANSFORM_ICON_MAP.heading3,
      label: messages.selectionTooltipTransformHeading3Label,
      shortcut: shortcuts.heading3
    },
    {
      command: 'heading4',
      icon: BLOCK_TRANSFORM_ICON_MAP.heading4,
      label: messages.selectionTooltipTransformHeading4Label,
      shortcut: shortcuts.heading4
    },
    {
      command: 'heading5',
      icon: BLOCK_TRANSFORM_ICON_MAP.heading5,
      label: messages.selectionTooltipTransformHeading5Label,
      shortcut: shortcuts.heading5
    },
    {
      command: 'heading6',
      icon: BLOCK_TRANSFORM_ICON_MAP.heading6,
      label: messages.selectionTooltipTransformHeading6Label,
      shortcut: shortcuts.heading6
    },
    {
      command: 'bulletList',
      icon: BLOCK_TRANSFORM_ICON_MAP.bulletList,
      label: messages.selectionTooltipTransformBulletListLabel,
      shortcut: shortcuts.bulletList
    },
    {
      command: 'orderedList',
      icon: BLOCK_TRANSFORM_ICON_MAP.orderedList,
      label: messages.selectionTooltipTransformOrderedListLabel,
      shortcut: shortcuts.orderedList
    },
    {
      command: 'taskList',
      icon: BLOCK_TRANSFORM_ICON_MAP.taskList,
      label: messages.selectionTooltipTransformTaskListLabel,
      shortcut: shortcuts.taskList
    },
    {
      command: 'blockquote',
      icon: BLOCK_TRANSFORM_ICON_MAP.blockquote,
      label: messages.selectionTooltipTransformBlockquoteLabel,
      shortcut: shortcuts.blockquote
    },
    {
      command: 'codeBlock',
      icon: BLOCK_TRANSFORM_ICON_MAP.codeBlock,
      label: messages.selectionTooltipTransformCodeBlockLabel,
      shortcut: shortcuts.codeBlock
    }
  ];
};

// 选区菜单图标尺寸。
export const SELECTION_TOOLTIP_ICON_SIZE = 14;

// 选区菜单图标线宽。
export const SELECTION_TOOLTIP_ICON_STROKE_WIDTH = 2;
