/**
 * components/ai-panel.ts — AI 会话框(纯 DOM 实现,编辑器底部)
 *
 * DeepSeek 风格输入框:多行输入 + 左侧模型选择器 + 右侧发送/停止按钮;
 * 发送后经注入的 streamChat 实现流式请求,增量经 delegate 回调插入文档
 * (插入编排在外层,面板只负责请求生命周期与输入交互)。
 * 生成期间:输入禁用、发送钮变停止钮;完成/中断/失败后恢复。
 */
import type {
  AiConfig,
  AiModelConfig,
  AiStreamChat,
  EditorI18nMessages,
} from '../types/editor';
import { buildAiMessages, DEFAULT_AI_SYSTEM_PROMPT, isAiModelUsable } from '../lib/ai-chat';
import { createSharedIcon } from '../icons';

/** AI 面板与编辑器编排层的桥接回调。 */
export interface AiPanelDelegate {
  /** 生成开始:编辑器锁定并在光标处建占位块;返回 false 表示无法开始(未就绪等)。 */
  beginStream: () => boolean;
  /** 追加增量文本。 */
  appendChunk: (delta: string) => void;
  /** 生成完成:以完整 Markdown 替换占位块并解锁编辑。 */
  endStream: (markdown: string) => void;
  /** 用户中断:以已收内容替换占位块并解锁编辑。 */
  cancelStream: (markdownSoFar: string) => void;
  /** 请求失败:移除占位块并解锁编辑。 */
  failStream: () => void;
}

/** AI 面板 API。 */
export interface AiPanelApi {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
  /** 是否生成中(生成中不允许收起面板/退出)。 */
  isGenerating: () => boolean;
  /** 全量替换模型清单(宿主设置变更时推送;选中项按名称尽量保留)。 */
  setModels: (models: AiModelConfig[]) => void;
  destroy: () => void;
}

/** AI 面板配置。 */
export interface AiPanelConfig {
  /** 面板挂载宿主(body 内编辑区下方的文档流容器)。 */
  host: HTMLElement;
  /** 编辑器文案。 */
  messages: EditorI18nMessages;
  /** AI 能力配置(模型清单/流式实现/系统提示)。 */
  ai: AiConfig;
  /** 编排层桥接回调。 */
  delegate: AiPanelDelegate;
}

/**
 * 创建 AI 会话框。
 */
export const createAiPanel = (config: AiPanelConfig): AiPanelApi => {
  const { host, messages } = config;
  let models: AiModelConfig[] = [...(config.ai.models ?? [])];
  const resolvedStreamChat: AiStreamChat = config.ai.streamChat ?? (() => {
    throw new Error('AI streamChat is not configured');
  });
  const systemPrompt = config.ai.systemPrompt ?? DEFAULT_AI_SYSTEM_PROMPT;

  /** 展开态。 */
  let open = false;
  /** 生成进行中。 */
  let generating = false;
  /** 当前模型索引(选择器状态)。 */
  let currentModelIndex = 0;
  /** 在途请求中断控制器。 */
  let abortController: AbortController | null = null;

  // --- DOM 构建 ---
  const root = document.createElement('section');
  root.className = 'zt-md-ai-panel';
  root.setAttribute('aria-label', messages.toolbarAiTitle);

  const input = document.createElement('textarea');
  input.className = 'zt-md-ai-input';
  input.rows = 1;
  input.placeholder = messages.aiPanelInputPlaceholder;
  root.appendChild(input);

  const controls = document.createElement('div');
  controls.className = 'zt-md-ai-controls';
  root.appendChild(controls);

  // 模型选择 chip(左)。
  const modelChip = document.createElement('button');
  modelChip.type = 'button';
  modelChip.className = 'zt-md-ai-model-chip';
  modelChip.appendChild(
    createSharedIcon('ai', { size: 14, strokeWidth: 2, className: 'zt-md-ai-model-icon' })
  );
  const modelChipLabel = document.createElement('span');
  modelChipLabel.className = 'zt-md-ai-model-label';
  modelChip.appendChild(modelChipLabel);
  modelChip.appendChild(
    createSharedIcon('chevronDown', { size: 12, strokeWidth: 2, className: 'zt-md-ai-model-chevron' })
  );
  controls.appendChild(modelChip);

  // 模型下拉清单。
  const modelMenu = document.createElement('div');
  modelMenu.className = 'zt-md-ai-model-menu';
  modelMenu.setAttribute('role', 'listbox');
  modelMenu.style.display = 'none';
  root.appendChild(modelMenu);

  // 状态/错误文案(中)。
  const statusEl = document.createElement('span');
  statusEl.className = 'zt-md-ai-status';
  controls.appendChild(statusEl);

  // 右侧发送/停止圆钮(收起经工具栏 AI 按钮或 Escape,面板内不设关闭钮)。
  const rightGroup = document.createElement('div');
  rightGroup.className = 'zt-md-ai-actions';
  const sendButton = document.createElement('button');
  sendButton.type = 'button';
  sendButton.className = 'zt-md-ai-send';
  sendButton.title = messages.aiPanelSendTitle;
  sendButton.setAttribute('aria-label', messages.aiPanelSendTitle);
  rightGroup.appendChild(sendButton);
  controls.appendChild(rightGroup);

  host.appendChild(root);

  /** 发送按钮图标(发送 ↑ / 停止 ■ 随状态切换)。 */
  const sendIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  sendIcon.setAttribute('viewBox', '0 0 24 24');
  sendIcon.setAttribute('fill', 'none');
  sendIcon.setAttribute('stroke', 'currentColor');
  sendIcon.setAttribute('stroke-width', '2');
  sendIcon.setAttribute('stroke-linecap', 'round');
  sendIcon.setAttribute('stroke-linejoin', 'round');
  sendIcon.setAttribute('width', '16');
  sendIcon.setAttribute('height', '16');
  sendIcon.setAttribute('aria-hidden', 'true');
  sendButton.appendChild(sendIcon);

  const syncSendIcon = (): void => {
    sendIcon.replaceChildren();
    if (generating) {
      // 停止:实心方块。
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '7');
      rect.setAttribute('y', '7');
      rect.setAttribute('width', '10');
      rect.setAttribute('height', '10');
      rect.setAttribute('rx', '2');
      rect.setAttribute('fill', 'currentColor');
      rect.setAttribute('stroke', 'none');
      sendIcon.appendChild(rect);
      sendButton.title = messages.aiPanelStopTitle;
    } else {
      // 发送:向上箭头。
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M12 19V5M5 12l7-7 7 7');
      sendIcon.appendChild(path);
      sendButton.title = messages.aiPanelSendTitle;
    }
    sendButton.setAttribute('aria-label', sendButton.title);
  };

  /** 输入框随内容自动增高(上限 140px)。 */
  const resizeInput = (): void => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(140, input.scrollHeight)}px`;
  };

  /** 当前可用模型(过滤掉名称/地址/模型 ID 为空的半配置项)。 */
  const usableModels = (): AiModelConfig[] => models.filter(isAiModelUsable);

  /** 同步模型 chip 文案与禁用态。 */
  const syncModelChip = (): void => {
    const usable = usableModels();
    if (usable.length === 0) {
      modelChipLabel.textContent = messages.aiPanelNoModels;
      modelChip.disabled = true;
      closeModelMenu();
      return;
    }
    if (currentModelIndex >= usable.length) {
      currentModelIndex = 0;
    }
    modelChipLabel.textContent = usable[currentModelIndex]?.name ?? '';
    modelChip.title = `${messages.aiPanelModelTitle}: ${usable[currentModelIndex]?.model ?? ''}`;
    modelChip.disabled = generating;
  };

  /** 同步整体交互态(生成中:输入禁用/发送变停止;无模型:发送禁用)。 */
  const syncUi = (): void => {
    syncSendIcon();
    syncModelChip();
    const usable = usableModels();
    sendButton.disabled = generating ? false : usable.length === 0;
    input.disabled = generating;
    input.placeholder = generating
      ? messages.aiPanelGeneratingPlaceholder
      : messages.aiPanelInputPlaceholder;
    root.dataset.generating = generating ? 'true' : 'false';
  };

  /** 关闭模型下拉。 */
  const closeModelMenu = (): void => {
    modelMenu.style.display = 'none';
    modelChip.setAttribute('aria-expanded', 'false');
  };

  /** 渲染模型下拉清单。 */
  const openModelMenu = (): void => {
    const usable = usableModels();
    modelMenu.replaceChildren();
    usable.forEach((model, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'zt-md-ai-model-item';
      item.dataset.active = index === currentModelIndex ? 'true' : 'false';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', index === currentModelIndex ? 'true' : 'false');
      const name = document.createElement('span');
      name.className = 'zt-md-ai-model-item-name';
      name.textContent = model.name;
      const id = document.createElement('span');
      id.className = 'zt-md-ai-model-item-id';
      id.textContent = model.model;
      item.append(name, id);
      item.addEventListener('click', (event) => {
        event.preventDefault();
        currentModelIndex = index;
        closeModelMenu();
        syncModelChip();
      });
      modelMenu.appendChild(item);
    });
    modelMenu.style.display = 'block';
    modelChip.setAttribute('aria-expanded', 'true');
  };

  /** 发起生成(Enter/发送按钮;生成中该按钮变停止)。 */
  const send = async (): Promise<void> => {
    if (generating) {
      // 生成中点击 = 停止。
      abortController?.abort();
      return;
    }
    const usable = usableModels();
    const model = usable[currentModelIndex];
    const prompt = input.value.trim();
    if (!model || prompt.length === 0) {
      return;
    }
    if (!config.delegate.beginStream()) {
      return;
    }
    generating = true;
    abortController = new AbortController();
    statusEl.textContent = '';
    statusEl.dataset.kind = '';
    syncUi();
    /** 已累积的完整响应(结束/中断时交回编排层落盘)。 */
    let accumulated = '';
    try {
      await resolvedStreamChat({
        model,
        messages: buildAiMessages(systemPrompt, prompt),
        signal: abortController.signal,
        onDelta: (delta) => {
          accumulated += delta;
          config.delegate.appendChunk(delta);
        },
      });
      config.delegate.endStream(accumulated);
    } catch (error) {
      if (abortController.signal.aborted) {
        config.delegate.cancelStream(accumulated);
      } else {
        config.delegate.failStream();
        statusEl.textContent = messages.aiPanelRequestFailed;
        statusEl.dataset.kind = 'error';
        console.error('[meditor] ai generate failed', error);
      }
    } finally {
      generating = false;
      abortController = null;
      input.value = '';
      resizeInput();
      syncUi();
      input.focus();
    }
  };

  // --- 事件 ---
  sendButton.addEventListener('click', (event) => {
    event.preventDefault();
    void send();
  });
  modelChip.addEventListener('click', (event) => {
    event.preventDefault();
    if (modelMenu.style.display === 'block') {
      closeModelMenu();
    } else {
      openModelMenu();
    }
  });
  input.addEventListener('input', resizeInput);
  input.addEventListener('keydown', (event) => {
    // Enter 发送,Shift+Enter 换行;输入法组合中不触发。
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      void send();
    }
  });
  // 外部点击收起模型下拉。
  const handleDocumentMouseDown = (event: MouseEvent): void => {
    const target = event.target as Node | null;
    if (modelMenu.contains(target) || modelChip.contains(target)) {
      return;
    }
    closeModelMenu();
  };
  document.addEventListener('mousedown', handleDocumentMouseDown, true);

  /** 展开面板(命名局部函数:事件处理器内不得裸调 open/close,那会解析到
   * window.open/window.close——Tauri 下 window.close 直接关闭窗口)。 */
  const openPanel = (): void => {
    open = true;
    host.dataset.open = 'true';
    syncUi();
    requestAnimationFrame(() => {
      input.focus();
    });
  };

  /** 收起面板(生成中不收起:先经停止按钮中断,待编排层落盘)。 */
  const closePanel = (): void => {
    if (generating) {
      return;
    }
    open = false;
    host.dataset.open = 'false';
    closeModelMenu();
  };

  syncUi();

  return {
    open: openPanel,
    close: closePanel,
    isOpen: () => open,
    isGenerating: () => generating,
    setModels: (nextModels: AiModelConfig[]) => {
      const previousName = usableModels()[currentModelIndex]?.name;
      models = [...nextModels];
      const usable = usableModels();
      const retained = usable.findIndex((model) => model.name === previousName);
      currentModelIndex = retained >= 0 ? retained : 0;
      syncUi();
    },
    destroy: () => {
      abortController?.abort();
      abortController = null;
      document.removeEventListener('mousedown', handleDocumentMouseDown, true);
      root.remove();
    },
  };
};
