/**
 * plugins/custom/toolbar/toolbar.ts — 顶部工具栏主插件
 *
 * 语雀风格固定工具栏:文档流元素挂载于编辑器上方的 toolbarHost,
 * 事务订阅刷新按钮激活态/撤销重做禁用态,命令统一经 runToolbarCommand 分发。
 * 支持参数控制:items 显式按钮集、mode 简洁/完整、visible 整体显隐。
 */
import { Plugin, PluginKey, type PluginView } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import { $prose } from '@milkdown/utils';
import type {
  EditorI18nMessages,
  EditorShortcutMode,
  ImageUploadConfig,
  ToolbarAlign,
  ToolbarCommand,
  ToolbarItem,
  ToolbarMode,
  ToolbarLayoutModeApi,
  ToolbarSourceModeApi,
  ToolbarTranslateApi,
  ToolbarOutlineApi,
  ToolbarAiApi,
} from '../../../types/editor';
import { createLinkControl } from '../selection-tooltip/tooltip-view';
import { canRunHistoryCommand, runToolbarCommand } from './toolbar-commands';
import { TOOLBAR_ID, resolveToolbarItems } from './toolbar-constants';
import { createToolbarViewController } from './toolbar-view';
import { EDITOR_SCROLL_CONTAINER_SELECTOR } from '../../../lib/editor-overlay-position';
import './toolbar.css';

/**
 * toolbar 插件创建参数。
 */
export interface ToolbarPluginOptions {
  /** 工具栏挂载宿主(编辑器上方文档流容器)。 */
  toolbarHost: HTMLElement;
  /** 编辑器内部浮层 Portal 容器(链接弹层/图片上传弹窗宿主)。 */
  portalContainer: HTMLElement;
  /** 编辑器文案。 */
  messages: EditorI18nMessages;
  /** 快捷键展示模式。 */
  shortcutMode: EditorShortcutMode;
  /** 编辑区滚动容器选择器(缺省 meditor 自带类名,行为不变)。 */
  scrollContainerSelector?: string;
  /** 内置模式(items 缺省时生效)。 */
  mode?: ToolbarMode;
  /** 工具栏项配置(items 缺省时按 mode 取内置集)。 */
  items?: ToolbarItem[];
  /** 从最终按钮集剔除的命令(对 items 与默认集同样生效)。 */
  exclude?: ToolbarCommand[];
  /** 工具栏对齐方式(默认 'left' 靠左)。 */
  align?: ToolbarAlign;
  /** 工具栏整体是否显示(默认 true)。 */
  visible?: boolean;
  /** 是否只读(只读时工具栏隐藏)。 */
  readOnly?: boolean;
  /** 图片上传配置(图片按钮使用)。 */
  imageUpload?: ImageUploadConfig;
  /** 打开搜索面板回调(搜索按钮使用)。 */
  onOpenSearch: () => void;
  /** 切换整篇翻译模式回调(翻译按钮使用,编排逻辑在 meditor 层)。 */
  onToggleTranslate?: () => void;
  /** 工具栏翻译控制 API 就绪回调(视图销毁时回传 null)。 */
  onTranslateApiReady?: (api: ToolbarTranslateApi | null) => void;
  /** 切换布局模式回调(布局按钮使用,编排逻辑在 meditor 层)。 */
  onToggleLayoutMode?: () => void;
  /** 工具栏布局模式控制 API 就绪回调(视图销毁时回传 null)。 */
  onLayoutModeApiReady?: (api: ToolbarLayoutModeApi | null) => void;
  /** 切换源码模式回调(源码按钮使用,编排逻辑在 meditor 层)。 */
  onToggleSourceMode?: () => void;
  /** 工具栏源码模式控制 API 就绪回调(视图销毁时回传 null)。 */
  onSourceModeApiReady?: (api: ToolbarSourceModeApi | null) => void;
  /** 切换大纲面板回调(大纲按钮使用,编排逻辑在 meditor 层)。 */
  onToggleOutline?: () => void;
  /** 工具栏大纲控制 API 就绪回调(视图销毁时回传 null)。 */
  onOutlineApiReady?: (api: ToolbarOutlineApi | null) => void;
  /** 切换 AI 会话框回调(AI 按钮使用,编排逻辑在 meditor 层)。 */
  onToggleAi?: () => void;
  /** 工具栏 AI 控制 API 就绪回调(视图销毁时回传 null)。 */
  onAiApiReady?: (api: ToolbarAiApi | null) => void;
}

/**
 * 创建顶部工具栏插件(Milkdown 插件,传给 editor.use)。
 */
export const createToolbarPlugin = (options: ToolbarPluginOptions) => {
  // 最终渲染项(items/默认集 → 按 exclude 剔除)。
  const items = resolveToolbarItems(
    options.items,
    options.mode,
    options.messages,
    options.exclude ? new Set(options.exclude) : undefined,
  );

  return $prose((): Plugin => {
    /** 当前编辑器视图引用。 */
    let currentView: EditorView | null = null;

    return new Plugin({
      key: new PluginKey(TOOLBAR_ID),
      view: (view: EditorView): PluginView => {
        /** 链接弹层展开状态。 */
        let isLinkPopoverOpen = false;

        // 工具栏视图控制器。
        const controller = createToolbarViewController({
          messages: options.messages,
          shortcutMode: options.shortcutMode,
          items,
          onCommand: handleCommand,
        });

        // 对齐方式:data-align 驱动 CSS justify-content(缺省靠左)。
        controller.root.dataset.align = options.align ?? 'left';

        /**
         * 控制链接弹层展开状态。
         */
        const setLinkPopoverOpen = (nextOpen: boolean): void => {
          if (isLinkPopoverOpen === nextOpen) {
            return;
          }

          isLinkPopoverOpen = nextOpen;
          if (nextOpen) {
            linkControl.openPanel();
          } else {
            linkControl.closePanel();
          }
          linkControl.refresh();
        };

        // 命令点击统一入口。
        function handleCommand(command: ToolbarCommand, anchorEl?: HTMLElement): void {
          // 翻译按钮:全文级模式开关,不进入编辑器命令分发。
          if (command === 'translate') {
            options.onToggleTranslate?.();
            return;
          }

          // 布局按钮:全文级模式开关,不进入编辑器命令分发。
          if (command === 'layoutMode') {
            options.onToggleLayoutMode?.();
            return;
          }

          // 源码按钮:全文级模式开关,不进入编辑器命令分发。
          if (command === 'sourceMode') {
            options.onToggleSourceMode?.();
            return;
          }

          // 大纲按钮:全文级显示开关,不进入编辑器命令分发。
          if (command === 'outline') {
            options.onToggleOutline?.();
            return;
          }

          // AI 按钮:全文级面板开关,不进入编辑器命令分发。
          if (command === 'ai') {
            options.onToggleAi?.();
            return;
          }

          if (!currentView) {
            return;
          }

          runToolbarCommand(command, {
            view: currentView,
            portalContainer: options.portalContainer,
            messages: options.messages,
            imageUpload: options.imageUpload,
            onOpenSearch: options.onOpenSearch,
            closeDropdown: controller.closeDropdown,
            // 触发按钮矩形(emoji 面板等锚定浮层使用;无按钮时缺省锚定光标)。
            anchorRect: anchorEl?.getBoundingClientRect() ?? null,
            // 触发按钮元素(emoji 面板 resize 实时重锚用)。
            anchorEl,
          });
          // 命令执行后立即刷新一次按钮态。
          controller.refresh(currentView);
          controller.refreshHistory(
            canRunHistoryCommand(currentView.state, 'undo'),
            canRunHistoryCommand(currentView.state, 'redo'),
          );
        }

        // 链接编辑弹层控件:替换占位链接按钮(保留位置与 data-command 供激活态刷新)。
        const linkControl = createLinkControl({
          getCurrentView: () => currentView,
          portalContainer: options.portalContainer,
          collisionBoundary: options.portalContainer.closest(
            options.scrollContainerSelector ?? EDITOR_SCROLL_CONTAINER_SELECTOR,
          ) as HTMLElement | null,
          iconSize: 16,
          iconStrokeWidth: 2,
          onOpenChange: setLinkPopoverOpen,
          messages: options.messages,
          isOpen: () => isLinkPopoverOpen,
        });
        // 工具栏语境下给宿主套专用类,保证与直接按钮等宽等高、图标垂直居中。
        linkControl.host.classList.add('zt-md-toolbar-link-host');
        const linkButton = controller.root.querySelector('button[data-command="link"]');
        if (linkButton) {
          linkButton.replaceWith(linkControl.host);
        }

        // 整体显隐:visible=false 或只读时隐藏(保留 DOM 便于运行时切换)。
        if (options.visible === false || options.readOnly) {
          controller.root.style.display = 'none';
        }

        // 挂载到文档流宿主。
        options.toolbarHost.appendChild(controller.root);

        currentView = view;
        // 翻译控制 API 就绪:交由 meditor 编排层驱动按钮态;视图销毁时回收。
        options.onTranslateApiReady?.({ setMode: controller.setTranslateMode });
        // 布局模式控制 API 就绪:同上。
        options.onLayoutModeApiReady?.({ setMode: controller.setLayoutMode });
        // 源码模式控制 API 就绪:由 meditor 源码编排层驱动按钮态;视图销毁时回收。
        options.onSourceModeApiReady?.({ setMode: controller.setSourceMode });
        // 大纲控制 API 就绪:由 meditor 大纲编排层驱动按钮态;视图销毁时回收。
        options.onOutlineApiReady?.({ setMode: controller.setOutlineMode });
        // AI 控制 API 就绪:由 meditor AI 编排层驱动按钮态;视图销毁时回收。
        options.onAiApiReady?.({ setMode: controller.setAiMode });
        // 首次刷新(激活态 + 撤销重做禁用态)。
        controller.refresh(view);
        controller.refreshHistory(
          canRunHistoryCommand(view.state, 'undo'),
          canRunHistoryCommand(view.state, 'redo'),
        );

        return {
          update: (nextView: EditorView) => {
            currentView = nextView;
            if (options.visible === false || options.readOnly) {
              return;
            }

            // 选区为空时收起链接弹层。
            if (nextView.state.selection.empty && isLinkPopoverOpen) {
              setLinkPopoverOpen(false);
            }

            controller.refresh(nextView);
            controller.refreshHistory(
              canRunHistoryCommand(nextView.state, 'undo'),
              canRunHistoryCommand(nextView.state, 'redo'),
            );
          },
          destroy: () => {
            currentView = null;
            options.onTranslateApiReady?.(null);
            options.onLayoutModeApiReady?.(null);
            options.onSourceModeApiReady?.(null);
            options.onOutlineApiReady?.(null);
            options.onAiApiReady?.(null);
            linkControl.destroy();
            controller.destroy();
          },
        };
      },
    });
  });
};
