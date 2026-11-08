/**
 * text-measure.ts — 通用文本测量与断行(renderer 与布局子系统共用)
 *
 * 从 renderer.ts 拆出的模块级纯函数:屏幕外测量 context 单例、按可用宽度
 * 断行、单行超宽时的省略号截断。渲染绘制与行高计算共用同一断行实现,
 * 保证两者一致。
 */

import { HEADER_FONT_SIZE, MTABLE_FONT_FAMILY } from './theme';

/** 通用文本测量(屏幕外 context 单例,列宽计算等用)。 */
const MEASURE_CTX_KEY = '__mtable_measure_ctx__';

/** 拿一个屏幕外 context 做文本测量。 */
export function getMeasureContext(): CanvasRenderingContext2D {
  // 单例挂到 globalThis,避免每次测量新建 canvas
  const holder = globalThis as unknown as { [MEASURE_CTX_KEY]?: CanvasRenderingContext2D };
  if (!holder[MEASURE_CTX_KEY]) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    holder[MEASURE_CTX_KEY] = canvas.getContext('2d')!;
  }
  return holder[MEASURE_CTX_KEY]!;
}

/**
 * 按可用宽度把单元格文本断行为多行(渲染绘制与行高计算共用,保证两者一致)。
 * - 逐字符累计宽度断行(中日韩文本无空格断点,与 Excel CJK 断行行为一致)
 * - 字段内换行符(\n,CSV 引号字段)强制断行
 * - 行高由 CELL_LINE_HEIGHT 决定,调用方以 lines.length × CELL_LINE_HEIGHT 布局
 * @param text 单元格文本
 * @param maxWidth 可用文本宽度(px,通常 = 列宽 − 2×CELL_TEXT_PADDING)
 * @returns 断行后的行数组(至少一行;空文本返回 [''])
 */
export function wrapCellText(text: string, maxWidth: number): string[] {
  const ctx = getMeasureContext();
  ctx.font = `${HEADER_FONT_SIZE}px ${MTABLE_FONT_FAMILY}`;
  const lines: string[] = [];
  for (const segment of text.split('\n')) {
    let current = '';
    let currentWidth = 0;
    for (const ch of segment) {
      // for..of 按码点迭代,emoji 等代理对字符不会被拆散
      const chWidth = ctx.measureText(ch).width;
      if (current.length > 0 && currentWidth + chWidth > maxWidth) {
        lines.push(current);
        current = ch;
        currentWidth = chWidth;
      } else {
        current += ch;
        currentWidth += chWidth;
      }
    }
    lines.push(current);
  }
  return lines.length > 0 ? lines : [''];
}

/** 单行仍超宽时逐字符截断加省略号(换行后单字符断行的兜底,如超长无空格词)。 */
export function ellipsisTextLine(measureCtx: CanvasRenderingContext2D, line: string, maxWidth: number): string {
  if (measureCtx.measureText(line).width <= maxWidth) return line;
  let display = line;
  while (display.length > 0 && measureCtx.measureText(`${display}…`).width > maxWidth) {
    display = display.slice(0, -1);
  }
  return `${display}…`;
}
