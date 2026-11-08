/**
 * lib/translate.ts — 整篇 Markdown 翻译引擎(微软 Edge 免费翻译接口)
 *
 * 调用 Edge 浏览器同款免授权翻译端点(响应带 Access-Control-Allow-Origin: *,
 * 浏览器可直接 fetch,无需 API Key):
 *   POST https://edge.microsoft.com/translate/translatetext?from=&to=<lang>&isEnterpriseClient=false
 *   请求体:JSON 字符串数组;响应体:[{ translations: [{ text, to }] }]
 *
 * 结构保护策略:整篇 markdown 按行分类,代码块/公式块/HTML 块/分割线原样保留,
 * 标题/引用/列表只保留前缀标记翻译正文;行内代码/图片/链接 URL/行内公式/HTML 标签
 * 以 `{{n}}` 占位符保护(链接仅保护 URL,链接文字仍送翻),译文回填后结构不破坏。
 */

/**
 * 翻译接口端点(默认微软 Edge 免费翻译)。
 *
 * 合规说明:该端点是浏览器直连的第三方免授权接口,企业内网/有数据出境合规
 * 要求的场景应自建翻译网关,并经 createMeditor 的 `translateEndpoint` 选项
 * (或 TranslateMarkdownOptions.endpoint)注入自有端点覆盖此默认值。
 */
export const DEFAULT_TRANSLATE_ENDPOINT = 'https://edge.microsoft.com/translate/translatetext';

/** 单次请求文本条数上限(接口无公开限额文档,取保守值分批)。 */
const BATCH_MAX_ITEMS = 40;

/** 单次请求总字符上限(同上,防超长请求被拒)。 */
const BATCH_MAX_CHARS = 6000;

/** 行内占位符形态(送翻文本中的保护标记)。 */
const PLACEHOLDER_RE = /\{\{(\d+)\}\}/g;

/**
 * 翻译参数。
 */
export interface TranslateMarkdownOptions {
  /** 目标语言(IETF 标签,如 'zh-Hans' / 'en');缺省按 CJK 占比自动选择。 */
  to?: string;
  /**
   * 翻译请求端点(缺省 DEFAULT_TRANSLATE_ENDPOINT)。合规敏感场景应自建
   * 网关并注入,端点需与默认接口同协议:POST JSON 字符串数组,响应
   * `[{ translations: [{ text, to }] }]`。
   */
  endpoint?: string;
  /** 请求中止信号。 */
  signal?: AbortSignal;
}

/**
 * 单批送翻(顺序一一对应返回译文)。
 */
const translateBatch = async (
  texts: string[],
  to: string,
  endpoint: string,
  signal?: AbortSignal
): Promise<string[]> => {
  const response = await fetch(
    `${endpoint}?from=&to=${encodeURIComponent(to)}&isEnterpriseClient=false`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(texts),
      signal
    }
  );
  if (!response.ok) {
    throw new Error(`[meditor] translate request failed: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as Array<{ translations?: Array<{ text?: string }> }>;
  return payload.map((item, index) => {
    const text = item.translations?.[0]?.text;
    if (typeof text !== 'string') {
      throw new Error(`[meditor] translate response malformed at item ${index}`);
    }
    return text;
  });
};

/**
 * 按 CJK 字符占比自动选择目标语言:中文为主译英,否则译中文简体。
 */
export const detectTranslateTargetLang = (text: string): 'zh-Hans' | 'en' => {
  /** CJK 字符数。 */
  const cjkCount = (text.match(/[\u3400-\u9fff]/g) ?? []).length;
  /** 拉丁字母数。 */
  const latinCount = (text.match(/[A-Za-z]/g) ?? []).length;
  return cjkCount > latinCount ? 'en' : 'zh-Hans';
};

/**
 * 送翻片段:verbatim = 原样回填(结构保护部分),否则送翻。
 */
interface TranslateChunk {
  text: string;
  verbatim: boolean;
}

/**
 * 片段登记表:每登记一个片段返回其 `{{n}}` 占位符,索引即片段序号。
 */
interface ChunkTable {
  chunks: TranslateChunk[];
  push: (text: string, verbatim: boolean) => string;
}

/**
 * 创建片段登记表。
 */
const createChunkTable = (): ChunkTable => {
  const chunks: TranslateChunk[] = [];
  return {
    chunks,
    push: (text: string, verbatim: boolean): string => {
      chunks.push({ text, verbatim });
      return `{{${chunks.length - 1}}}`;
    }
  };
};

/**
 * 行内 token 匹配器:从 pos 起尝试匹配一个保护 token;命中返回
 * [匹配结束位置, 替换进行文本的内容(掺占位符)]。
 */
type InlineTokenMatcher = (text: string, pos: number, table: ChunkTable) => [number, string] | null;

/**
 * 整体原样保护的 token 匹配器(行内代码/图片/自动链接/行内公式/HTML 标签/字面占位符)。
 */
const verbatimToken =
  (pattern: RegExp): InlineTokenMatcher =>
  (text, pos, table) => {
    pattern.lastIndex = pos;
    const match = pattern.exec(text);
    if (!match) {
      return null;
    }
    return [pattern.lastIndex, table.push(match[0], true)];
  };

/**
 * 行内保护 token 集(顺序即尝试顺序;行内代码最先,防止内部被二次解析)。
 */
const INLINE_TOKEN_MATCHERS: InlineTokenMatcher[] = [
  // 字面 `{{n}}`:保护用户已有的同形文本,同时避免与回填占位符冲突。
  verbatimToken(/\{\{\d+\}\}/y),
  // 行内代码(`code` / ``code``)。
  verbatimToken(/`+[^`\n]*`+/y),
  // 图片 ![alt](src)。
  verbatimToken(/!\[[^\]\n]*\]\([^()\n]*\)/y),
  // 链接 [label](url):仅链接文字送翻;骨架 [ 与 ](url) 全部占位符保护,
  // 防止接口把 ASCII 括号本地化为全角(CJK 方向实测会发生)破坏 markdown 链接。
  (text, pos, table) => {
    const link = /\[([^\]\n]*)\]\(([^()\n]*)\)/y;
    link.lastIndex = pos;
    const match = link.exec(text);
    if (!match) {
      return null;
    }
    // 空文字链接整体原样保护;否则骨架保护、仅送翻链接文字。
    if ((match[1] ?? '').trim().length === 0) {
      return [link.lastIndex, table.push(match[0] ?? '', true)];
    }
    const head = table.push('[', true);
    const label = table.push(match[1] ?? '', false);
    const tail = table.push(`](${match[2] ?? ''})`, true);
    return [link.lastIndex, `${head}${label}${tail}`];
  },
  // 自动链接 <https://…>。
  verbatimToken(/<https?:\/\/[^\s>\n]+>/iy),
  // 行内公式 $x^2$。
  verbatimToken(/\$[^$\n]+\$/y),
  // 行内 HTML 标签。
  verbatimToken(/<\/?[A-Za-z][^>\n]*>/y)
];

/**
 * 对一段可送翻文本做行内保护,返回掺入占位符的文本并登记片段。
 */
const protectInlineTokens = (text: string, table: ChunkTable): string => {
  let result = '';
  let pos = 0;
  while (pos < text.length) {
    /** 当前位置命中的保护 token。 */
    let hit: [number, string] | null = null;
    for (const matcher of INLINE_TOKEN_MATCHERS) {
      hit = matcher(text, pos, table);
      if (hit) {
        break;
      }
    }
    if (hit) {
      result += hit[1];
      pos = hit[0];
      continue;
    }
    result += text[pos];
    pos += 1;
  }
  return result;
};

/**
 * 行处理计划:要么整行原样保留,要么"前缀标记 + 受保护正文"等待译文回填。
 */
interface LinePlan {
  /** 原样保留的行;null 表示该行由 prefix + protectedText 组成。 */
  literal: string | null;
  /** 前缀标记(标题井号/引用尖括号/列表记号,含尾随空格)。 */
  prefix: string;
  /** 已做行内保护、待送翻的正文(掺占位符);null 表示前缀后无正文。 */
  protectedText: string | null;
  /** 行级正文译文(接口回填;占位符意外丢失时不写入,渲染回退原文段)。 */
  translatedText?: string;
}

/**
 * 判定行是否为围栏代码块围栏(开始或结束)。
 */
const matchCodeFence = (line: string): boolean => /^\s{0,3}(`{3,}|~{3,})/.test(line);

/**
 * 判定行是否为主题分割线(--- / *** / ___)。
 */
const isThematicBreak = (line: string): boolean => /^\s{0,3}(?:[-*_]\s?){3,}$/.test(line);

/**
 * 判定行是否为表格行;返回拆出的单元格内容,非表格行返回 null。
 */
const matchTableRow = (line: string): string[] | null => {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
    return null;
  }
  // 逐字符扫描拆格,跳过转义竖线 \|。
  const cells: string[] = [];
  let current = '';
  for (let i = 1; i < trimmed.length - 1; i += 1) {
    const char = trimmed[i];
    if (char === '\\' && trimmed[i + 1] === '|') {
      current += '\\|';
      i += 1;
      continue;
    }
    if (char === '|') {
      cells.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
};

/**
 * 把单行解析为行计划(inFence/inMath 为跨行状态机,原地推进)。
 */
const parseLine = (line: string, table: ChunkTable, state: { inFence: boolean; inMath: boolean }): LinePlan => {
  // 围栏代码块:围栏行与内部行全部原样。
  if (state.inFence) {
    if (matchCodeFence(line)) {
      state.inFence = false;
    }
    return { literal: line, prefix: '', protectedText: null };
  }
  if (matchCodeFence(line)) {
    state.inFence = true;
    return { literal: line, prefix: '', protectedText: null };
  }

  // 公式块 $$…$$:定界行与内部行原样。
  const trimmed = line.trim();
  if (state.inMath) {
    if (trimmed.endsWith('$$')) {
      state.inMath = false;
    }
    return { literal: line, prefix: '', protectedText: null };
  }
  if (trimmed.startsWith('$$')) {
    // 单行 $$…$$ 不进入块状态。
    if (!(trimmed.length > 4 && trimmed.endsWith('$$'))) {
      state.inMath = true;
    }
    return { literal: line, prefix: '', protectedText: null };
  }

  // 空行 / 主题分割线 / HTML 块行:原样。
  if (trimmed.length === 0 || isThematicBreak(line) || /^\s{0,3}</.test(line)) {
    return { literal: line, prefix: '', protectedText: null };
  }

  // 表格行:逐格保护+送翻(对齐分隔行 | --- | 原样)。
  const cells = matchTableRow(line);
  if (cells) {
    const isAlignmentRow = cells.every((cell) => /^\s*:?-{3,}:?\s*$/.test(cell));
    if (isAlignmentRow) {
      return { literal: line, prefix: '', protectedText: null };
    }
    const protectedCells = cells.map((cell) => protectInlineTokens(cell, table));
    return { literal: null, prefix: '', protectedText: `|${protectedCells.join('|')}|` };
  }

  // 标题行:保留井号前缀,正文送翻。
  const heading = /^(\s{0,3}#{1,6}\s+)(.*)$/.exec(line);
  if (heading) {
    return { literal: null, prefix: heading[1] ?? '', protectedText: protectInlineTokens(heading[2] ?? '', table) };
  }

  // 引用行:保留 > 前缀,正文送翻(空引用行原样)。
  const blockquote = /^(\s{0,3}(?:>\s?)+)(.*)$/.exec(line);
  if (blockquote && (blockquote[2] ?? '').length > 0) {
    return { literal: null, prefix: blockquote[1] ?? '', protectedText: protectInlineTokens(blockquote[2] ?? '', table) };
  }

  // 列表项:保留记号(含任务框)前缀,正文送翻。
  const listItem = /^(\s*(?:[-*+]|\d{1,9}[.)])\s+(?:\[[ xX]\]\s+)?)(.*)$/.exec(line);
  if (listItem && (listItem[2] ?? '').length > 0) {
    return { literal: null, prefix: listItem[1] ?? '', protectedText: protectInlineTokens(listItem[2] ?? '', table) };
  }

  // 普通文本行:整行送翻。
  return { literal: null, prefix: '', protectedText: protectInlineTokens(line, table) };
};

/**
 * 整篇翻译计划:行计划 + 完整片段表。
 */
interface TranslatePlan {
  lines: LinePlan[];
  chunks: TranslateChunk[];
}

/**
 * 构建整篇翻译计划:解析全部行并收集片段(结构保护与链接文字登记)。
 */
const buildTranslatePlan = (markdown: string): TranslatePlan => {
  const table = createChunkTable();
  /** 行状态机。 */
  const state = { inFence: false, inMath: false };
  const lines = markdown.split(/\r?\n/).map((line) => parseLine(line, table, state));
  return { lines, chunks: table.chunks };
};

/**
 * 判定送翻文本是否可安全回填:译文必须保留原文全部占位符,否则视为损坏。
 */
const preservesAllPlaceholders = (source: string, translated: string): boolean => {
  const expected = [...source.matchAll(/\{\{(\d+)\}\}/g)].map((match) => match[1]);
  return expected.every((n) => translated.includes(`{{${n}}}`));
};

/**
 * 送翻单元:一段待译文本 + 译文落地回调(单元 = 行级正文 或 可翻片段)。
 */
interface TranslateUnit {
  text: string;
  apply: (translated: string | undefined) => void;
}

/**
 * 翻译整篇 markdown(结构保护 + 微软 Edge 免费接口;失败抛错,内容由调用方兜底)。
 *
 * 送翻单元两类:
 * 1. 行级受保护正文 — 掺占位符整段送翻,接口翻译周边文字并原样保留占位符;
 * 2. 可翻片段(链接文字)— 以占位符嵌在行级正文内,单独送翻后回填。
 *
 * @param markdown 原始 markdown 全文
 * @param options 目标语言 / 端点 / 中止信号
 * @returns 译后 markdown
 */
export const translateMarkdown = async (markdown: string, options?: TranslateMarkdownOptions): Promise<string> => {
  const plan = buildTranslatePlan(markdown);
  const endpoint = options?.endpoint ?? DEFAULT_TRANSLATE_ENDPOINT;

  /** 片段译文(索引与片段表对齐;undefined = 未送翻/送翻失败,回填回原文)。 */
  const chunkTranslations: Array<string | undefined> = new Array(plan.chunks.length);
  /** 全部送翻单元。 */
  const units: TranslateUnit[] = [];

  // 单元 1:可翻片段(链接文字)。
  plan.chunks.forEach((chunk, index) => {
    if (chunk.verbatim || chunk.text.trim().length === 0) {
      return;
    }
    units.push({
      text: chunk.text,
      apply: (translated) => {
        chunkTranslations[index] = translated;
      }
    });
  });

  // 单元 2:行级受保护正文。剥掉占位符后不含任何文字的段(纯图片行/链接壳等)不送翻。
  plan.lines.forEach((line) => {
    if (line.protectedText === null) {
      return;
    }
    const bare = line.protectedText.replace(/\{\{\d+\}\}/g, '');
    if (!/[A-Za-z\u3400-\u9fff]/.test(bare)) {
      return;
    }
    units.push({
      text: line.protectedText,
      apply: (translated) => {
        if (translated !== undefined) {
          line.translatedText = translated;
        }
      }
    });
  });

  if (units.length === 0) {
    return markdown;
  }

  const to = options?.to ?? detectTranslateTargetLang(units.map((unit) => unit.text).join('\n'));

  // 单元按序分批(条数与总字符双上限),逐批串行请求,避免频率风控。
  /** 当前批单元。 */
  let batch: TranslateUnit[] = [];
  /** 当前批字符量。 */
  let batchChars = 0;
  const flushBatch = async (): Promise<void> => {
    if (batch.length === 0) {
      return;
    }
    const results = await translateBatch(
      batch.map((unit) => unit.text),
      to,
      endpoint,
      options?.signal
    );
    batch.forEach((unit, i) => {
      const value = results[i];
      if (typeof value !== 'string') {
        throw new Error('[meditor] translate response truncated');
      }
      unit.apply(value);
    });
    batch = [];
    batchChars = 0;
  };
  for (const unit of units) {
    if (batch.length > 0 && (batch.length >= BATCH_MAX_ITEMS || batchChars + unit.text.length > BATCH_MAX_CHARS)) {
      await flushBatch();
    }
    batch.push(unit);
    batchChars += unit.text.length;
  }
  await flushBatch();

  // 渲染:片段回填(verbatim/未译回原文,译文丢占位符的片段同样回原文兜底),
  // 行级正文优先用译文(丢占位符则回退原文段),占位符统一展开。
  const resolveChunk = (index: number): string => {
    const chunk = plan.chunks[index];
    if (!chunk) {
      return '';
    }
    const translated = chunkTranslations[index];
    if (chunk.verbatim || typeof translated !== 'string' || !preservesAllPlaceholders(chunk.text, translated)) {
      return chunk.text;
    }
    return translated;
  };
  const substitute = (text: string): string =>
    text.replace(PLACEHOLDER_RE, (_, index: string) => resolveChunk(Number(index)));

  return plan.lines
    .map((line) => {
      if (line.literal !== null) {
        return line.literal;
      }
      if (line.protectedText === null) {
        return line.prefix;
      }
      let body = line.protectedText;
      if (line.translatedText !== undefined && preservesAllPlaceholders(line.protectedText, line.translatedText)) {
        body = line.translatedText;
      }
      return line.prefix + substitute(body);
    })
    .join('\n');
};
