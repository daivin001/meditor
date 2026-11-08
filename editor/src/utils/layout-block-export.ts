/**
 * utils/layout-block-export.ts — 布局块(meditor-layout 围栏)纯文本剥离/枚举
 *
 * 供"LLM 导出"等管线使用:md 文件中的 ```meditor-layout 围栏承载纯显示控制
 * 信息(非 Markdown 正文),喂给大模型前应整块剥离,避免污染正文信息量。
 *
 * 实现为行扫描器(不依赖 remark 管线,宿主拿到 markdown 字符串即可调用):
 * - 识别 CommonMark 围栏开始行(3+ 个 ` 或 ~,缩进 ≤ 3 空格);
 * - info string 首个空白前 token 为 lang,lang 为 meditor-layout(大小写/空白
 *   不敏感)或 meditor-layout:kind 可选后缀形式时命中;
 * - 结束围栏遵循 CommonMark 配对规则(同字符、长度不短于开始围栏、行内仅空白);
 * - 围栏内容(含未闭合围栏的剩余行)一律归入该块。
 */

/**
 * 布局块围栏语言标记前缀(小写比对;与编辑器插件共用同一约定)。
 */
export const MEDITOR_LAYOUT_FENCE_PREFIX = 'meditor-layout';

/**
 * 判断围栏 lang 是否为布局块(大小写/空白不敏感;兼容 meditor-layout:kind 后缀)。
 */
export const isMeditorLayoutFenceLang = (lang: string | null | undefined): boolean => {
  if (typeof lang !== 'string') {
    return false;
  }
  const normalized = lang.trim().toLowerCase();
  return (
    normalized === MEDITOR_LAYOUT_FENCE_PREFIX ||
    normalized.startsWith(`${MEDITOR_LAYOUT_FENCE_PREFIX}:`)
  );
};

/**
 * 布局块信息(lang 为原始 info string 首 token,保留大小写与 :kind 后缀)。
 */
export interface MeditorLayoutBlockInfo {
  /** 围栏 lang(原始首 token,如 meditor-layout / meditor-layout:html)。 */
  lang: string;
  /** info string 中 lang 之后的剩余部分(无则为 null)。 */
  meta: string | null;
  /** 围栏内容原文(不含围栏行)。 */
  value: string;
}

/** 围栏开始行匹配(缩进 ≤ 3 空格 + 3+ 同字符围栏标记 + info string)。 */
const FENCE_OPEN_PATTERN = /^ {0,3}(`{3,}|~{3,})[ \t]*(.*)$/;

/**
 * 构建结束围栏行匹配(同字符、长度不短于开始标记、行内仅空白)。
 */
const createFenceCloseMatcher = (marker: string): ((line: string) => boolean) => {
  const pattern = new RegExp(`^ {0,3}\\${marker.charAt(0)}{${marker.length},}\\s*$`);
  return (line: string) => pattern.test(line);
};

/**
 * 解析围栏开始行的 info string(返回 null 表示该行不是布局块围栏)。
 */
const matchLayoutFenceOpen = (line: string): { marker: string; lang: string; meta: string | null } | null => {
  const open = FENCE_OPEN_PATTERN.exec(line);
  if (!open) {
    return null;
  }
  const marker = open[1] ?? '';
  // info string 首个空白前 token 为 lang(反引号围栏的 info 不允许含 `,remark 已保证)。
  const info = (open[2] ?? '').trim();
  const lang = info.split(/\s+/)[0] ?? '';
  if (!isMeditorLayoutFenceLang(lang)) {
    return null;
  }
  const rest = info.slice(lang.length).trim();
  return { marker, lang, meta: rest.length > 0 ? rest : null };
};

/**
 * 枚举 markdown 中的全部布局块(按文档顺序;不校验块内内容格式)。
 */
export const listMeditorLayoutBlocks = (markdown: string): MeditorLayoutBlockInfo[] => {
  const lines = markdown.split('\n');
  const blocks: MeditorLayoutBlockInfo[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? '';
    index += 1;
    const open = matchLayoutFenceOpen(line);
    if (!open) {
      continue;
    }
    const isClose = createFenceCloseMatcher(open.marker);
    const valueLines: string[] = [];
    while (index < lines.length) {
      const inner = lines[index] ?? '';
      index += 1;
      if (isClose(inner)) {
        break;
      }
      valueLines.push(inner);
    }
    blocks.push({ lang: open.lang, meta: open.meta, value: valueLines.join('\n') });
  }
  return blocks;
};

/**
 * 剥离 markdown 中的全部布局块(整块移除含围栏行;其余内容原样保留)。
 * 供"喂给大模型"管线使用:剥离后的文本即纯 Markdown 正文。
 */
export const stripMeditorLayoutBlocks = (markdown: string): string => {
  const lines = markdown.split('\n');
  const kept: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? '';
    const open = matchLayoutFenceOpen(line);
    if (!open) {
      kept.push(line);
      index += 1;
      continue;
    }
    // 布局块:跳过围栏内容与结束行(未闭合时跳到文末)。
    const isClose = createFenceCloseMatcher(open.marker);
    index += 1;
    while (index < lines.length) {
      const inner = lines[index] ?? '';
      index += 1;
      if (isClose(inner)) {
        break;
      }
    }
  }
  return kept.join('\n');
};
