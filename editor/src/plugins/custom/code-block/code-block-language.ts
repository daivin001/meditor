/**
 * plugins/custom/code-block/code-block-language.ts — 代码块语言 schema 配置
 *
 * 1:1 翻译自 zt-react-milkdown/src/plugins/custom/code-block/code-block-language.ts
 */
import { codeBlockSchema } from '@milkdown/preset-commonmark';
import type { GetNodeSchema } from '@milkdown/utils';
import { refractor } from 'refractor';
import type { EditorI18nMessages } from '../../../types/editor';
import { MERMAID_LANGUAGE } from './code-block-mermaid';

// 纯文本语言值。
export const PLAIN_TEXT_LANGUAGE_VALUE = 'text';

/**
 * 语言能力查询选项(Mermaid 开关按编辑器实例传入,避免多实例互相污染)。
 */
export interface CodeLanguageQueryOptions {
  /** 是否启用 Mermaid 图表语法(默认 true)。 */
  mermaidEnabled?: boolean;
}

/**
 * 可选语言项。
 */
export interface CodeLanguageOption {
  /** 语言值。 */
  value: string;
  /** 展示文本。 */
  label: string;
}

/**
 * 解析语言下拉项列表(refractor 支持语言集 + 展示名映射)。
 */
export const resolveLanguageOptions = (
  messages: EditorI18nMessages,
  options: CodeLanguageQueryOptions = {}
): CodeLanguageOption[] => {
  // refractor 支持的语言值集合。
  const supportedLanguages = refractor.listLanguages() as string[];
  // 语言去重集合。
  const languageSet = new Set(
    supportedLanguages
      .map((language) => normalizeCodeBlockLanguage(language))
      .filter((language) => language !== PLAIN_TEXT_LANGUAGE_VALUE)
  );
  // 排序后的语言集合。
  const sortedLanguages = [...languageSet].sort((left, right) => left.localeCompare(right));

  return [
    {
      value: PLAIN_TEXT_LANGUAGE_VALUE,
      label: messages.codeBlockLanguagePlainText
    },
    // Mermaid 非 refractor 语言,显式补进语言下拉(图表代码块入口;语法关闭时不出现)。
    ...(options.mermaidEnabled ?? true
      ? [{ value: MERMAID_LANGUAGE, label: resolveCodeBlockLanguageLabel(MERMAID_LANGUAGE) }]
      : []),
    ...sortedLanguages.map((language) => ({
      value: language,
      label: resolveCodeBlockLanguageLabel(language)
    }))
  ];
};

// 语言值 → 展示名映射表(代码块左上角标签 / 语言下拉项复用)。
const LANGUAGE_LABEL_MAP: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  jsx: 'JSX',
  tsx: 'TSX',
  json: 'JSON',
  html: 'HTML',
  css: 'CSS',
  bash: 'Bash',
  shell: 'Shell',
  sh: 'Shell',
  markdown: 'Markdown',
  md: 'Markdown',
  yaml: 'YAML',
  yml: 'YAML',
  sql: 'SQL',
  xml: 'XML',
  mermaid: 'Mermaid'
};

/**
 * 解析代码块语言的展示名(如小的语言值 typescript → 'TypeScript')。
 */
export const resolveCodeBlockLanguageLabel = (language: string): string => {
  const normalizedLanguage = normalizeCodeBlockLanguage(language);

  return LANGUAGE_LABEL_MAP[normalizedLanguage] ?? normalizedLanguage;
};

/**
 * 代码块语言 schema 配置上下文。
 */
interface CodeBlockLanguageSchemaConfigContext {
  /** 读取代码块 schema 配置。 */
  get: (key: typeof codeBlockSchema.key) => GetNodeSchema;
  /** 写入代码块 schema 配置。 */
  set: (key: typeof codeBlockSchema.key, value: GetNodeSchema) => void;
}

// Canvas 代码块语言关键字映射表。
const CANVAS_LANGUAGE_KEYWORD_MAP: Record<string, string> = {
  svg: 'svg',
  html: 'html'
};

// 支持预览的代码块语言映射表。
const CODE_BLOCK_PREVIEW_LANGUAGE_MAP: Record<string, true> = {
  html: true,
  svg: true,
  mermaid: true
};

// 默认即进入预览的语言映射表(动态图表类:源码只是中间产物,渲染结果才是正文)。
const CODE_BLOCK_AUTO_PREVIEW_LANGUAGE_MAP: Record<string, true> = {
  mermaid: true
};

/**
 * 规范化代码块语言值。
 */
export const normalizeCodeBlockLanguage = (language: string): string => {
  const normalizedLanguage = language.trim().toLowerCase();
  if (!normalizedLanguage) {
    return PLAIN_TEXT_LANGUAGE_VALUE;
  }

  if (normalizedLanguage.startsWith('canvas-')) {
    // Canvas 代码块对应的标准语言值。
    const canvasLanguage = Object.entries(CANVAS_LANGUAGE_KEYWORD_MAP).find(([keyword]) =>
      normalizedLanguage.includes(keyword)
    )?.[1];

    return canvasLanguage ?? normalizedLanguage;
  }

  return normalizedLanguage;
};

/**
 * 创建默认使用 text 语言的代码块 schema。
 */
const createCodeBlockLanguageSchema = (previousSchema: GetNodeSchema): GetNodeSchema => {
  return (ctx) => {
    // Milkdown 原始代码块 schema。
    const schema = previousSchema(ctx);

    return {
      ...schema,
      attrs: {
        ...schema.attrs,
        language: {
          default: PLAIN_TEXT_LANGUAGE_VALUE,
          validate: 'string'
        }
      },
      parseMarkdown: {
        ...schema.parseMarkdown,
        runner: (state, node, type) => {
          // 已补全默认语言的 Markdown 节点。
          const normalizedNode = {
            ...node,
            lang: normalizeCodeBlockLanguage(String(node.lang ?? ''))
          };
          schema.parseMarkdown.runner(state, normalizedNode, type);
        }
      },
      toMarkdown: {
        ...schema.toMarkdown,
        runner: (state, node) => {
          // 规范化后的序列化语言。
          const language = normalizeCodeBlockLanguage(String(node.attrs.language ?? ''));
          state.addNode('code', undefined, node.content.firstChild?.text || '', { lang: language });
        }
      }
    };
  };
};

/**
 * 配置代码块语言的默认值与 Markdown 转换规则。
 */
export const configureCodeBlockLanguageSchema = (
  ctx: CodeBlockLanguageSchemaConfigContext
): void => {
  // 原始代码块 schema 工厂。
  const previousSchema = ctx.get(codeBlockSchema.key) as GetNodeSchema;
  ctx.set(codeBlockSchema.key, createCodeBlockLanguageSchema(previousSchema));
};

/**
 * 判断代码块语言是否支持静态预览。
 */
export const isCodeBlockPreviewLanguage = (
  language: string,
  options: CodeLanguageQueryOptions = {}
): boolean => {
  const normalized = normalizeCodeBlockLanguage(language);
  if (normalized === MERMAID_LANGUAGE && !(options.mermaidEnabled ?? true)) {
    return false;
  }
  return CODE_BLOCK_PREVIEW_LANGUAGE_MAP[normalized] === true;
};

/**
 * 判断代码块语言是否默认进入预览(mermaid 等动态图表:有内容即直接渲染)。
 */
export const isCodeBlockAutoPreviewLanguage = (
  language: string,
  options: CodeLanguageQueryOptions = {}
): boolean => {
  const normalized = normalizeCodeBlockLanguage(language);
  if (normalized === MERMAID_LANGUAGE && !(options.mermaidEnabled ?? true)) {
    return false;
  }
  return CODE_BLOCK_AUTO_PREVIEW_LANGUAGE_MAP[normalized] === true;
};
