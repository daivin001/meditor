/**
 * icons.ts — mtable 内联 SVG 图标(lucide 风格)
 *
 * 从 mtable.ts 拆出的纯字符串常量;筛选面板内的排序箭头/对勾 SVG
 * 体量小且仅面板使用,保留在 ui/filter-panel.ts 内联。
 */

/** 全屏按钮图标(lucide maximize-2 风格对角双箭头)。 */
export const MAXIMIZE_ICON_MARKUP =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>' +
  '<line x1="21" y1="3" x2="14" y2="10"/><line x1="14" y1="21" x2="21" y2="14"/>' +
  '<line x1="3" y1="21" x2="10" y2="14"/><line x1="10" y1="3" x2="3" y2="10"/>' +
  '</svg>';

/** 全屏弹窗关闭图标(lucide x)。 */
export const CLOSE_ICON_MARKUP =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' +
  '</svg>';
