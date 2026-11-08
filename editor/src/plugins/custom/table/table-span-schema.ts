/**
 * plugins/custom/table/table-span-schema.ts — 合并单元格的 schema 配置与 HTML 序列化
 *
 * GFM 管道表格无法表达跨列/跨行。约定(Typora 同款策略):
 * - 不含合并的表格照常序列化为管道表格;
 * - 含 colspan/rowspan 的表格序列化为 HTML `<table>` 块(合法 CommonMark,
 *   其他渲染器可直接渲染),单元格内容经 DOMSerializer 转为内联 HTML;
 * - 解析侧:table-html-parse 把 HTML 表格 mdast 化,经 gfm 既有 runner 进 PM;
 *   本模块只补三处 gfm runner 的包装:
 *   - table:toMarkdown 分流(合并 → html 节点);
 *   - tableRow:parseMarkdown 优先取合成节点携带的逐单元格对齐(aligns);
 *   - tableCell/tableHeader:parseMarkdown 读合成节点的 colspan/rowspan。
 */
import type { Ctx } from '@milkdown/ctx';
import { tableCellSchema, tableHeaderSchema, tableRowSchema, tableSchema } from '@milkdown/preset-gfm';
import { DOMSerializer } from '@milkdown/prose/model';
import type { Node as ProseNode } from '@milkdown/prose/model';
import type { GetNodeSchema } from '@milkdown/utils';
import { tableHasMerges } from './table-merge-actions';

// 表头行节点名。
const TABLE_HEADER_ROW_NODE_NAME = 'table_header_row';
// 表头单元格节点名。
const TABLE_HEADER_NODE_NAME = 'table_header';

/**
 * 把单元格内容序列化为内联 HTML(DOMSerializer 按各 mark 的 toDOM 渲染)。
 */
const serializeCellContentToHtml = (cell: ProseNode): string => {
  try {
    const fragment = DOMSerializer.fromSchema(cell.type.schema).serializeFragment(cell.content);
    const container = document.createElement('div');
    container.appendChild(fragment);
    return container.innerHTML;
  } catch {
    return cell.textContent;
  }
};

/**
 * 单元格对齐 → HTML style 片段(left 为默认不写)。
 */
const cellAlignStyle = (alignment: unknown): string => {
  const align = String(alignment ?? 'left');
  return align === 'center' || align === 'right' ? ` style="text-align: ${align}"` : '';
};

/**
 * 把含合并的表格节点序列化为 HTML `<table>` 字符串。
 * thead = 表头行(table_header_row);单元格携带 colspan/rowspan 与对齐。
 */
export const serializeMergedTableToHtml = (tableNode: ProseNode): string => {
  /** 行 HTML 片段收集区(thead/tbody 分开)。 */
  const headRows: string[] = [];
  const bodyRows: string[] = [];

  tableNode.forEach((row) => {
    const isHeaderRow = row.type.name === TABLE_HEADER_ROW_NODE_NAME;
    const cells: string[] = [];
    row.forEach((cell) => {
      const tag = isHeaderRow || cell.type.name === TABLE_HEADER_NODE_NAME ? 'th' : 'td';
      const colspan = Number(cell.attrs.colspan ?? 1);
      const rowspan = Number(cell.attrs.rowspan ?? 1);
      let attributes = '';
      if (colspan > 1) {
        attributes += ` colspan="${colspan}"`;
      }
      if (rowspan > 1) {
        attributes += ` rowspan="${rowspan}"`;
      }
      attributes += cellAlignStyle(cell.attrs.alignment);
      cells.push(`<${tag}${attributes}>${serializeCellContentToHtml(cell)}</${tag}>`);
    });
    const rowHtml = `<tr>${cells.join('')}</tr>`;
    (isHeaderRow ? headRows : bodyRows).push(rowHtml);
  });

  const headSection = headRows.length > 0 ? `<thead>${headRows.join('')}</thead>` : '';
  const bodySection = bodyRows.length > 0 ? `<tbody>${bodyRows.join('')}</tbody>` : '';
  return `<table>${headSection}${bodySection}</table>`;
};

/**
 * 包装 gfm 单元格 schema 的 parseMarkdown:读取合成 mdast 节点携带的
 * colspan/rowspan(管道表格节点无此字段,落到默认值 1)。
 */
const wrapCellParseMarkdown = (previousSchema: GetNodeSchema): GetNodeSchema => {
  return (ctx) => {
    const schema = previousSchema(ctx);
    return {
      ...schema,
      parseMarkdown: {
        ...schema.parseMarkdown,
        runner: (state, node, type) => {
          // 合成节点可能携带的跨列/跨行(HTML 表格还原)。
          const source = node as { colspan?: unknown; rowspan?: unknown; align?: unknown };
          const colspan = Math.max(1, Math.min(1000, Number(source.colspan ?? 1) || 1));
          const rowspan = Math.max(1, Math.min(1000, Number(source.rowspan ?? 1) || 1));
          const align = typeof source.align === 'string' ? source.align : undefined;
          state.openNode(type, {
            alignment: align ?? 'left',
            colspan,
            rowspan
          });
          const paragraphType = state.schema.nodes.paragraph;
          if (!paragraphType) {
            return;
          }
          state.openNode(paragraphType);
          state.next(node.children ?? []);
          state.closeNode();
          state.closeNode();
        }
      }
    };
  };
};

/**
 * 配置单元格 schema(colspan/rowspan 解析)。需在 schema 就绪前调用。
 */
export const configureTableCellSpanSchemas = (ctx: Ctx): void => {
  const previousCellSchema = ctx.get(tableCellSchema.key) as GetNodeSchema;
  ctx.set(tableCellSchema.key, wrapCellParseMarkdown(previousCellSchema));
  const previousHeaderSchema = ctx.get(tableHeaderSchema.key) as GetNodeSchema;
  ctx.set(tableHeaderSchema.key, wrapCellParseMarkdown(previousHeaderSchema));
};

/**
 * 配置行 schema 的 parseMarkdown:合成节点逐单元格对齐(aligns)优先,
 * 回退 gfm 原生按列索引映射。
 */
export const configureTableRowSpanSchema = (ctx: Ctx): void => {
  const previousSchema = ctx.get(tableRowSchema.key) as GetNodeSchema;
  const wrapped: GetNodeSchema = (ctx) => {
    const schema = previousSchema(ctx);
    return {
      ...schema,
      parseMarkdown: {
        ...schema.parseMarkdown,
        runner: (state, node, type) => {
          // 合成节点携带逐单元格对齐(合并行单元数 ≠ 列数,索引映射会错位)。
          const aligns = (node as { aligns?: unknown }).aligns;
          const tableAlign = (node as { align?: unknown }).align;
          const children = ((node as { children?: unknown[] }).children ?? []).map(
            (child: unknown, index: number) => {
              const perCell =
                aligns && Array.isArray(aligns)
                  ? aligns[index]
                  : Array.isArray(tableAlign)
                    ? (tableAlign as unknown[])[index]
                    : undefined;
              return { ...(child as { align?: unknown }), align: perCell ?? (child as { align?: unknown }).align };
            }
          );
          state.openNode(type);
          state.next(children as never);
          state.closeNode();
        }
      }
    };
  };
  ctx.set(tableRowSchema.key, wrapped);
};

/**
 * 配置表格 schema 的 toMarkdown:含合并 → HTML 表格块,否则原样走管道表格。
 * 需在 schema 就绪前调用。
 */
export const configureTableSpanSchema = (ctx: Ctx): void => {
  const previousSchema = ctx.get(tableSchema.key) as GetNodeSchema;
  const wrapped: GetNodeSchema = (ctx) => {
    const schema = previousSchema(ctx);
    return {
      ...schema,
      toMarkdown: {
        ...schema.toMarkdown,
        runner: (state, node) => {
          if (!tableHasMerges(node)) {
            schema.toMarkdown.runner(state, node);
            return;
          }
          // 合并表格以 HTML 块表达(管道表格无 colspan/rowspan 语义)。
          state.addNode('html', undefined, serializeMergedTableToHtml(node));
        }
      }
    };
  };
  ctx.set(tableSchema.key, wrapped);
};
