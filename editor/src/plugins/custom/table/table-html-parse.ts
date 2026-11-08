/**
 * plugins/custom/table/table-html-parse.ts — HTML 表格 → PM 表格的 mdast 合成
 *
 * 合并单元格的 markdown 表示是 HTML `<table>`(见 table-span-schema)。
 * milkdown 的 remark 管线把行首 HTML 表格解析为「段落 + 行内 html 叶子序列」
 * (每个标签一枚 html 叶子,标签间是普通行内 mdast 节点),本模块的 transformer:
 * 1. 段落形态(主路径):扫描行内节点流,以表格标签叶子为结构标记(<tr>/<td>/<th>
 *    及闭合),标签之间的 mdast 行内节点原样作为单元格内容(粗体/公式/高亮等
 *    全保留);<td> 叶子的属性串解析 colspan/rowspan/text-align;
 * 2. 块级形态(兜底):顶层 html 块经 DOMParser 解析,内联文本降级为纯文本;
 * 3. 网格归一化:跨行占位 + 行宽一致化(补空单元格/截断越界跨距),
 *    保证 TableMap 网格一致,不合规输入不炸编辑器。
 */
import { $remark } from '@milkdown/utils';

/**
 * 最小化 mdast 节点结构。
 */
interface MdastNodeLike {
  type: string;
  value?: string | null;
  align?: unknown;
  aligns?: unknown;
  isHeader?: boolean;
  colspan?: number;
  rowspan?: number;
  children?: MdastNodeLike[];
  [key: string]: unknown;
}

/**
 * 归一化后的单元格(合成中间结构)。
 */
interface GridCell {
  /** 单元格行内内容(mdast 节点)。 */
  children: MdastNodeLike[];
  /** 是否表头。 */
  isHeader: boolean;
  /** 对齐。 */
  align: string | null;
  colspan: number;
  rowspan: number;
}

/**
 * 归一化后的行(合成中间结构)。
 */
interface GridRow {
  cells: GridCell[];
  isHeader: boolean;
}

// 表格结构标签(小写)。
const STRUCTURE_TAGS = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th']);

/**
 * 解析单个标签叶子的属性(colspan/rowspan/text-align)。
 */
const parseTagAttributes = (tagValue: string): { colspan: number; rowspan: number; align: string | null } => {
  const colspan = Math.max(1, Math.min(1000, Number(/colspan\s*=\s*"?\s*(\d+)/i.exec(tagValue)?.[1] ?? 1) || 1));
  const rowspan = Math.max(1, Math.min(1000, Number(/rowspan\s*=\s*"?\s*(\d+)/i.exec(tagValue)?.[1] ?? 1) || 1));
  const alignMatch = /text-align\s*:\s*([a-z]+)/i.exec(tagValue);
  const align = alignMatch?.[1]?.toLowerCase();
  return {
    colspan,
    rowspan,
    align: align === 'center' || align === 'right' || align === 'left' ? align : null
  };
};

/**
 * 归一化网格:列数取最大覆盖宽度;越界跨距截断,短行补空单元格。
 */
const normalizeGrid = (rows: GridRow[]): { rows: GridRow[]; columnCount: number } => {
  /** 占位网格(跨行单元格占据的后续行槽位)。 */
  const occupied: boolean[][] = [];
  rows.forEach((row, rowIndex) => {
    const occupiedRow = (): boolean[] => (occupied[rowIndex] ??= []);
    let column = 0;
    for (const cell of row.cells) {
      while (occupiedRow()[column]) {
        column += 1;
      }
      for (let r = rowIndex; r < rowIndex + cell.rowspan; r += 1) {
        const target = occupied[r] ?? (occupied[r] = []);
        for (let c = column; c < column + cell.colspan; c += 1) {
          target[c] = true;
        }
      }
      cell.align = cell.align ?? null;
      column += cell.colspan;
    }
  });

  let columnCount = 0;
  occupied.forEach((row) => {
    row.forEach((isUsed, column) => {
      if (isUsed && column + 1 > columnCount) {
        columnCount = column + 1;
      }
    });
  });

  rows.forEach((row) => {
    const covered = row.cells.reduce((sum, cell) => sum + cell.colspan, 0);
    if (covered > columnCount) {
      let remaining = columnCount;
      row.cells.forEach((cell) => {
        if (remaining <= 0) {
          cell.colspan = 0; // 标记丢弃。
          return;
        }
        cell.colspan = Math.min(cell.colspan, remaining);
        remaining -= cell.colspan;
      });
      row.cells = row.cells.filter((cell) => cell.colspan > 0);
    }
    const widthAfter = row.cells.reduce((sum, cell) => sum + cell.colspan, 0);
    for (let i = widthAfter; i < columnCount; i += 1) {
      row.cells.push({ children: [], isHeader: row.isHeader, align: null, colspan: 1, rowspan: 1 });
    }
  });

  return { rows, columnCount };
};

/**
 * 把归一化网格合成 gfm 可消费的 table mdast 节点。
 */
const buildTableMdast = (rows: GridRow[], columnCount: number): MdastNodeLike => {
  /** 列级对齐(首个出现该对齐的列;合成节点逐单元格携带,列级兜底)。 */
  const columnAligns: (string | null)[] = new Array(columnCount).fill(null);
  for (const row of rows) {
    let cursor = 0;
    for (const cell of row.cells) {
      if (cell.align && cursor < columnCount && !columnAligns[cursor]) {
        columnAligns[cursor] = cell.align;
      }
      cursor += cell.colspan;
    }
  }

  const mdastRows: MdastNodeLike[] = rows.map((row) => {
    /** 逐单元格对齐(合成节点专属字段,行 schema 包装优先读取)。 */
    const aligns: (string | null)[] = [];
    const cells: MdastNodeLike[] = row.cells.map((cell) => {
      const align = cell.align ?? columnAligns[aligns.length] ?? null;
      aligns.push(align);
      return {
        type: 'tableCell',
        isHeader: cell.isHeader,
        align,
        colspan: cell.colspan,
        rowspan: cell.rowspan,
        children: cell.children
      };
    });
    return { type: 'tableRow', aligns, children: cells };
  });

  return {
    type: 'table',
    align: columnAligns.map((align) => align ?? null),
    children: mdastRows
  };
};

/**
 * 结构扫描状态机:按 token 流合成表格(token = 标签或文本)。
 * 标签 token 由两形态适配器(节点流/字符串流)归一产出。
 */
interface ScanToken {
  /** 结构标签名(小写,无尖括号;非结构 token 为 null)。 */
  tag: string | null;
  /** 是否闭标签。 */
  closing: boolean;
  /** 标签属性原文(结构标签用)。 */
  attrs: string;
  /** 文本内容(非结构 token 用)。 */
  text: string;
  /** 行内 mdast 节点(混合形态的内容 token;优先于 text)。 */
  nodes?: MdastNodeLike[];
}

/**
 * 共享扫描:token 流 → 表格 mdast(无有效结构返回 null)。
 */
const scanTableTokens = (tokens: ScanToken[]): MdastNodeLike | null => {
  const rows: GridRow[] = [];
  let currentRow: GridRow | null = null;
  let currentCell: GridCell | null = null;
  let sawStructure = false;
  let closed = false;

  const closeCell = (): void => {
    if (currentCell && currentRow) {
      currentRow.cells.push(currentCell);
    }
    currentCell = null;
  };
  const closeRow = (): void => {
    closeCell();
    if (currentRow) {
      rows.push(currentRow);
    }
    currentRow = null;
  };

  for (const token of tokens) {
    if (closed) {
      break;
    }
    if (token.tag !== null) {
      sawStructure = true;
      if (token.tag === 'table' && !token.closing) {
        continue;
      }
      if (token.tag === 'table' && token.closing) {
        closed = true;
        break;
      }
      if (token.tag === 'tr' && !token.closing) {
        closeRow();
        currentRow = { cells: [], isHeader: false };
        continue;
      }
      if ((token.tag === 'td' || token.tag === 'th') && !token.closing) {
        closeCell();
        if (!currentRow) {
          currentRow = { cells: [], isHeader: false };
        }
        const attributes = parseTagAttributes(`<${token.tag}${token.attrs}>`);
        currentCell = {
          children: [],
          isHeader: token.tag === 'th',
          align: attributes.align,
          colspan: attributes.colspan,
          rowspan: attributes.rowspan
        };
        continue;
      }
      if ((token.tag === 'td' || token.tag === 'th') && token.closing) {
        closeCell();
        continue;
      }
      if (token.tag === 'tr' && token.closing) {
        closeRow();
        continue;
      }
      // thead/tbody/tfoot 等容器标签:仅作结构标记。
      continue;
    }
    // 内容 token:归属进行中的单元格(mdast 节点透传优先,纯文本兜底)。
    if (currentCell) {
      if (token.nodes && token.nodes.length > 0) {
        currentCell.children.push(...token.nodes);
      } else if (token.text.length > 0) {
        currentCell.children.push({ type: 'text', value: token.text });
      }
    }
  }
  closeRow();

  if (!sawStructure || rows.length === 0) {
    return null;
  }
  const normalized = normalizeGrid(rows);
  if (normalized.columnCount === 0) {
    return null;
  }
  return buildTableMdast(normalized.rows, normalized.columnCount);
};

/**
 * 字符串形态:整段 html 原文 → token 流(标签一枚一枚切,文本按 < 分段)。
 */
const scanHtmlString = (raw: string): MdastNodeLike | null => {
  const tokens: ScanToken[] = [];
  for (const match of raw.matchAll(/<[^>]+>|[^<]+/g)) {
    const piece = match[0];
    if (piece.startsWith('<')) {
      const tagMatch = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)([\s\S]*?)>$/.exec(piece);
      if (!tagMatch) {
        continue;
      }
      tokens.push({
        tag: (tagMatch[2] ?? '').toLowerCase(),
        closing: tagMatch[1] === '/',
        attrs: tagMatch[3] ?? '',
        text: ''
      });
    } else {
      tokens.push({ tag: null, closing: false, attrs: '', text: piece });
    }
  }
  return scanTableTokens(tokens);
};


/**
 * 段落形态合成:行首 HTML 表格在 milkdown remark 管线中解析为
 * 「段落 + html 叶子」,两种子形态都归一到共享状态机:
 * - 纯叶子形态:整表为单个 html 叶子(或叶子+文本),拼接原文走字符串 tokenizer;
 * - 混合形态:结构标签叶子 + 行内 mdast 节点(粗体/公式/高亮等已由更早的
 *   remark transformer 转换),内容节点原样透传。
 * 导出以便脱离 milkdown 运行时做纯转换自测。
 */
export const tryRewriteParagraphHtmlTable = (paragraph: MdastNodeLike): MdastNodeLike | null => {
  const children = paragraph.children ?? [];
  if (children.length === 0) {
    return null;
  }
  // 首个行内节点必须是 <table ...> 标签叶子,否则不是表格段落。
  const first = children[0];
  if (!first || first.type !== 'html' || !/^<table[\s>]/i.test(String(first.value ?? ''))) {
    return null;
  }

  // 形态一:叶子 + 文本(无其他行内节点)→ 拼接原文走字符串 tokenizer。
  if (children.every((child) => child.type === 'html' || child.type === 'text')) {
    const raw = children.map((child) => String(child.value ?? '')).join('');
    return scanHtmlString(raw);
  }

  // 形态二:结构标签叶子 + 行内 mdast 节点混合 → 节点适配器。
  const tokens: ScanToken[] = [];
  for (const child of children) {
    if (child.type === 'html') {
      const value = String(child.value ?? '');
      const tagMatch = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)/.exec(value);
      if (tagMatch && STRUCTURE_TAGS.has((tagMatch[2] ?? '').toLowerCase())) {
        const tagName = (tagMatch[2] ?? '').toLowerCase();
        const attrsRaw = value.slice(tagMatch[0].length).replace(/>$/, '');
        tokens.push({ tag: tagName, closing: tagMatch[1] === '/', attrs: attrsRaw, text: '' });
        continue;
      }
      // 非结构 html 叶子(<u>/<sub>/<mark> 等):作为行内内容透传。
      if (tokens.length > 0) {
        const lastToken = tokens[tokens.length - 1];
        if (lastToken?.nodes) {
          lastToken.nodes.push(child);
        } else {
          tokens.push({ tag: null, closing: false, attrs: '', text: '', nodes: [child] });
        }
      }
      continue;
    }
    // 普通行内节点(文本/粗体/公式/高亮包裹等):透传给当前单元格。
    if (tokens.length > 0) {
      const lastToken = tokens[tokens.length - 1];
      if (lastToken?.nodes) {
        lastToken.nodes.push(child);
      } else {
        tokens.push({ tag: null, closing: false, attrs: '', text: '', nodes: [child] });
      }
    }
  }
  return scanTableTokens(tokens);
};

/**
 * 块级形态兜底:html 块原始串经 DOMParser 解析(其他 remark 管线的形态)。
 * 导出以便脱离 milkdown 运行时做纯转换自测。
 */
export const tryRewriteBlockHtmlTable = (node: MdastNodeLike): MdastNodeLike | null => {
  if (node.type !== 'html' || typeof node.value !== 'string') {
    return null;
  }
  if (!/^\s*<table[\s>]/i.test(node.value)) {
    return null;
  }
  const parsed = new DOMParser().parseFromString(node.value, 'text/html');
  const table = parsed.querySelector('table');
  if (!table) {
    return null;
  }
  /** 收集行(与段落形态同构)。 */
  const rows: GridRow[] = [];
  const headerRowCount = table.querySelector('thead')?.querySelectorAll('tr').length ?? 0;
  const trElements = Array.from(table.querySelectorAll('tr')).filter((tr) =>
    ['table', 'thead', 'tbody', 'tfoot'].includes(tr.parentElement?.tagName.toLowerCase() ?? '')
  );
  trElements.forEach((tr, rowIndex) => {
    const cells: GridCell[] = [];
    Array.from(tr.children).forEach((element) => {
      if (!(element instanceof HTMLTableCellElement)) {
        return;
      }
      cells.push({
        children: element.textContent ? [{ type: 'text', value: element.textContent }] : [],
        isHeader: element.tagName.toLowerCase() === 'th' || rowIndex < headerRowCount,
        align: (() => {
          const align = element.style.textAlign;
          return align === 'center' || align === 'right' || align === 'left' ? align : null;
        })(),
        colspan: Math.max(1, Math.min(1000, Number(element.getAttribute('colspan') ?? 1) || 1)),
        rowspan: Math.max(1, Math.min(1000, Number(element.getAttribute('rowspan') ?? 1) || 1))
      });
    });
    rows.push({
      cells,
      isHeader: rowIndex < headerRowCount || (cells.length > 0 && cells.every((cell) => cell.isHeader))
    });
  });
  if (rows.length === 0) {
    return null;
  }
  const normalized = normalizeGrid(rows);
  if (normalized.columnCount === 0) {
    return null;
  }
  return buildTableMdast(normalized.rows, normalized.columnCount);
};

/**
 * mdast 遍历:段落形态整段替换,块级形态就地替换;
 * 段落内部不再递归合成(行内叶子单独不成表,避免把表格塞进段落)。
 * 导出以便脱离 milkdown 运行时做纯转换自测。
 */
export const transformHtmlTables = (node: MdastNodeLike): void => {
  const children = node.children;
  if (!Array.isArray(children)) {
    return;
  }
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (!child) {
      continue;
    }
    const blockTable = tryRewriteBlockHtmlTable(child);
    if (blockTable) {
      children[index] = blockTable;
      continue;
    }
    if (child.type === 'paragraph') {
      const paragraphTable = tryRewriteParagraphHtmlTable(child);
      if (paragraphTable) {
        children[index] = paragraphTable;
      }
      continue;
    }
    transformHtmlTables(child);
  }
};

/**
 * remark 插件包装器(mdast transformer)。
 */
export const remarkTableHtmlPlugin = $remark('remarkTableHtml', () => {
  const plugin = () => (tree: MdastNodeLike) => {
    transformHtmlTables(tree);
  };
  return plugin as never;
});
