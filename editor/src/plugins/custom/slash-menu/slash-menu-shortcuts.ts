/**
 * plugins/custom/slash-menu/slash-menu-shortcuts.ts — 编辑器内置快捷键
 *
 * 1:1 翻译自 zt-react-milkdown/src/plugins/custom/slash-menu/slash-menu-shortcuts.ts
 * - showImageUploadDialog(React)改为 DOM 版一次性上传弹窗。
 */
import type { EditorView } from '@milkdown/prose/view';
import type {
  EditorI18nMessages,
  EditorShortcutMode,
  ImageUploadConfig,
  SlashMenuCommand
} from '../../../types/editor';
import { resolveSlashMenuShortcutDefinitions } from '../block-transform';
import { showImageUploadDialog } from '../image/image-upload-dialog';
import { showEmojiPicker } from '../../../components/emoji-picker';
import { isEditorViewEditable } from './slash-menu-logic';
import { runSlashCommand } from './slash-menu-commands';
import { isMac } from '../../../utils/platform';

/**
 * 判断当前快捷键是否匹配指定修饰键模式。
 */
const matchesShortcutMode = (event: KeyboardEvent, shortcutMode: EditorShortcutMode): boolean => {
  // 当前环境是否使用 Command 作为 Mod 键。
  const onMac = isMac();
  // 当前事件是否按下正确的 Mod 键。
  const hasMod = onMac
    ? event.metaKey && !event.ctrlKey
    : event.ctrlKey && !event.metaKey;
  if (!hasMod) {
    return false;
  }

  return shortcutMode === 'modAlt'
    ? event.altKey && !event.shiftKey
    : event.shiftKey && !event.altKey;
};

/**
 * 执行图片上传快捷键。
 */
const runImageShortcut = (
  view: EditorView,
  portalContainer: HTMLElement,
  messages: EditorI18nMessages,
  imageUpload?: ImageUploadConfig
): boolean => {
  showImageUploadDialog({
    portalContainer,
    view,
    messages,
    imageUpload
  });
  return true;
};

/**
 * 执行 emoji 快捷键(弹出选择面板,锚定当前光标)。
 */
const runEmojiShortcut = (
  view: EditorView,
  portalContainer: HTMLElement,
  messages: EditorI18nMessages
): boolean => {
  showEmojiPicker({ portalContainer, view, messages });
  return true;
};

/**
 * 创建编辑器内置快捷键处理器。
 */
export const createEditorShortcutKeyDownHandler = (
  portalContainer: HTMLElement,
  messages: EditorI18nMessages,
  shortcutMode: EditorShortcutMode,
  imageUpload?: ImageUploadConfig
): ((view: EditorView, event: KeyboardEvent) => boolean) => {
  // 当前模式使用的助记键配置。
  const shortcutDefinitions = resolveSlashMenuShortcutDefinitions(shortcutMode);
  // 当前模式的物理键码命令分发表。
  const shortcutCommandByCode = Object.fromEntries(
    Object.entries(shortcutDefinitions).map(([command, definition]) => [
      definition.code,
      command
    ])
  ) as Record<string, SlashMenuCommand>;

  /**
   * 优先处理编辑器内置快捷键。
   */
  const handleKeyDown = (view: EditorView, event: KeyboardEvent): boolean => {
    if (
      event.isComposing ||
      !matchesShortcutMode(event, shortcutMode) ||
      !isEditorViewEditable(view)
    ) {
      return false;
    }

    // 当前物理键码对应的内置命令。
    const command = shortcutCommandByCode[event.code];
    if (!command) {
      return false;
    }

    // 当前命令是否执行成功。
    const handled = command === 'image'
      ? runImageShortcut(view, portalContainer, messages, imageUpload)
      : command === 'emoji'
        ? runEmojiShortcut(view, portalContainer, messages)
        : runSlashCommand(view, command);
    if (handled) {
      event.preventDefault();
    }
    return handled;
  };

  return handleKeyDown;
};
