/**
 * plugins/custom/selection-tooltip/types.ts — 选区工具栏类型
 *
 * 1:1 翻译自 zt-react-milkdown/src/plugins/custom/selection-tooltip/types.ts
 * - 去除 React 依赖:图标组件类型改为图标键名(string)
 */
import type { MarkType } from '@milkdown/prose/model';
import type { EditorView } from '@milkdown/prose/view';
import type { BlockTransformCommand, EditorI18nMessages } from '../../../types/editor';

/**
 * 选区菜单图标键名(对应内联 SVG 图标表)。
 */
export type SelectionTooltipIcon = string;

/**
 * 选区菜单命令键名。
 */
export type SelectionTooltipCommand = 'strong' | 'em' | 'strike' | 'underline' | 'subscript' | 'superscript' | 'inlineCode' | 'link';

/**
 * 块级转换菜单图标键名。
 */
export type BlockTransformIcon = string;

/**
 * 选区菜单项配置。
 */
export interface SelectionTooltipItem {
  /** 命令键名。 */
  command: SelectionTooltipCommand;
  /** 按钮图标键名。 */
  icon: SelectionTooltipIcon;
  /** 无障碍标题。 */
  title: string;
  /** schema mark 候选名。 */
  markNames: string[];
}

/**
 * 块级转换菜单项配置。
 */
export interface SelectionBlockTransformItem {
  /** 命令键名。 */
  command: BlockTransformCommand;
  /** 按钮图标键名。 */
  icon: BlockTransformIcon;
  /** 展示文案。 */
  label: string;
  /** 快捷键展示文案。 */
  shortcut: string;
}

/**
 * mark 命令上下文。
 */
export interface MarkCommandContext {
  /** 编辑器视图。 */
  view: EditorView;
  /** mark 类型。 */
  markType: MarkType;
  /** 切换链接编辑器展开状态。 */
  toggleLinkPopover: (view: EditorView) => void;
}

/**
 * 链接编辑 Popover 控制器创建参数。
 */
export interface LinkPopoverControlOptions {
  /** 编辑器视图引用读取函数。 */
  getCurrentView: () => EditorView | null;
  /** Popover Portal 挂载容器。 */
  portalContainer: HTMLElement;
  /** Popover 碰撞边界,通常为编辑器滚动容器。 */
  collisionBoundary: HTMLElement | null;
  /** 链接按钮图标尺寸。 */
  iconSize: number;
  /** 链接按钮图标线宽。 */
  iconStrokeWidth: number;
  /** 链接弹层展开状态回调。 */
  onOpenChange: (nextOpen: boolean) => void;
  /** 编辑器文案。 */
  messages: EditorI18nMessages;
  /** 当前弹层展开状态读取函数。 */
  isOpen: () => boolean;
}

/**
 * 块级转换 Popover 控制器创建参数。
 */
export interface BlockTransformPopoverControlOptions {
  /** 编辑器视图读取函数。 */
  getCurrentView: () => EditorView | null;
  /** Popover Portal 挂载容器。 */
  portalContainer: HTMLElement;
  /** Popover 碰撞边界,通常为编辑器滚动容器。 */
  collisionBoundary: HTMLElement | null;
  /** 图标尺寸。 */
  iconSize: number;
  /** 图标线宽。 */
  iconStrokeWidth: number;
  /** 转换菜单标题。 */
  menuTitle: string;
  /** 转换菜单项。 */
  items: SelectionBlockTransformItem[];
  /** 弹层展开状态回调。 */
  onOpenChange: (nextOpen: boolean) => void;
  /** 当前弹层展开状态读取函数。 */
  isOpen: () => boolean;
}
