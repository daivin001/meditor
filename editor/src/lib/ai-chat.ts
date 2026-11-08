/**
 * lib/ai-chat.ts — OpenAI 兼容流式对话客户端(缺省 AI 传输实现)
 *
 * - POST {baseUrl}/chat/completions,stream: true,按 SSE 解析
 *   `data: {...}` 行,取 choices[0].delta.content 经 onDelta 逐段回调;
 * - DeepSeek/Moonshot/自建网关等 OpenAI 兼容服务均适用;企业内网/合规场景
 *   宿主可经 options.ai.streamChat 注入自有实现(此文件只是缺省实现);
 * - 中断经 AbortSignal 透传;非 2xx 抛出含状态码的错误。
 */

import type { AiChatMessage, AiModelConfig, AiStreamChat } from '../types/editor';

/** 读取流式响应体并按 SSE 帧切分(返回每帧的 data 载荷;[DONE] 以 null 表示)。 */
async function* iterateSseData(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal
): AsyncGenerator<string | null> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      // SSE 帧以空行分隔;data 行可能跨 chunk,按行累积后再分发。
      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex).replace(/\r$/, '');
        buffer = buffer.slice(newlineIndex + 1);
        if (line.startsWith('data:')) {
          const payload = line.slice(5).trim();
          if (payload.length > 0) {
            yield payload === '[DONE]' ? null : payload;
          }
        }
        newlineIndex = buffer.indexOf('\n');
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** OpenAI 兼容 /chat/completions 流式对话(编辑器缺省 AI 传输实现)。 */
export const streamOpenAiCompatibleChat: AiStreamChat = async (request) => {
  const { model, messages, signal, onDelta } = request;
  const endpoint = `${model.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${model.apiKey}`,
    },
    body: JSON.stringify({
      model: model.model,
      messages,
      stream: true,
    }),
    signal,
  });
  if (!response.ok) {
    // 读一段响应体帮助定位(鉴权失败/模型不存在等错误信息都在 body 里)。
    const detail = await response.text().catch(() => '');
    throw new Error(`AI request failed: HTTP ${response.status} ${detail.slice(0, 300)}`);
  }
  const body = response.body;
  if (!body) {
    throw new Error('AI request failed: response has no body');
  }
  for await (const payload of iterateSseData(body, signal)) {
    if (payload === null) {
      break;
    }
    try {
      const parsed = JSON.parse(payload) as {
        choices?: { delta?: { content?: string | null } }[];
      };
      const delta = parsed.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta.length > 0) {
        onDelta(delta);
      }
      // reasoning_content(DeepSeek R1 思考链)刻意忽略:仅正文入文档。
    } catch {
      // 单帧解析失败不中断整流(网关偶发心跳/注释帧)。
    }
  }
};

/** 构建默认消息序列(系统提示 + 用户输入)。 */
export const buildAiMessages = (
  systemPrompt: string,
  prompt: string
): AiChatMessage[] => [
  ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
  { role: 'user' as const, content: prompt },
];

/** 缺省系统提示词:输出 Markdown 供所见即所得编辑器直接渲染。 */
export const DEFAULT_AI_SYSTEM_PROMPT = [
  '你是 Markdown 写作助手,嵌入在一款所见即所得 Markdown 编辑器中。',
  '请直接输出 Markdown 格式的正文内容,不要包裹代码围栏,不要额外解释。',
  '合理使用标题、列表、表格等结构组织内容。',
].join('');

/** 模型配置合法性(名称与接口地址非空即可用)。 */
export const isAiModelUsable = (model: AiModelConfig): boolean =>
  model.name.trim().length > 0 && model.baseUrl.trim().length > 0 && model.model.trim().length > 0;
