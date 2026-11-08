/**
 * core/link-click.ts — 编辑器链接点击行为(编辑态 Ctrl+点击外链 / 文内锚点跳转)
 */

import type { EditorView } from '@milkdown/prose/view';
import type { Node as ProseNode } from '@milkdown/prose/model';
import { scrollToHeadingAnchor } from '../plugins/custom/heading/heading-anchor';
import { normalizeSafeUrl } from '../utils/security';

/**
 * 从点击事件解析命中的链接锚元素(非链接目标返回 null)。
 */
export const resolveEventAnchor = (event: MouseEvent): HTMLAnchorElement | null => {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const anchor = target.closest('a[href]');
  return anchor instanceof HTMLAnchorElement ? anchor : null;
};

export const isImageNode = (node: ProseNode | null | undefined): boolean => {
  return node?.type.name === 'image';
};

/**
 * 编辑态链接点击:文内锚点(#标题)直接跳转;外链需 Ctrl+点击且经安全规范化。
 * 返回是否已处理(已处理的事件会被阻止默认行为与冒泡)。
 */
export const handleEditorLinkClick = (event: MouseEvent, readOnly: boolean, view?: EditorView): boolean => {
  const anchor = resolveEventAnchor(event);
  if (!anchor) return false;
  const rawHref = anchor.getAttribute('href') ?? '';
  // 文内锚点(#标题):普通点击即跳转(只读态亦可),不经外链安全规范化。
  if (rawHref.startsWith('#')) {
    const anchorId = decodeURIComponent(rawHref.slice(1));
    if (!anchorId || !view) return false;
    event.preventDefault();
    event.stopPropagation();
    return scrollToHeadingAnchor(view, anchorId);
  }
  const href = normalizeSafeUrl(rawHref);
  if (!href) return false;
  if (readOnly) return false;
  if (!event.ctrlKey) return false;
  event.preventDefault();
  event.stopPropagation();
  window.open(href, '_blank', 'noopener,noreferrer');
  return true;
};

/**
 * 只读态链接拦截:放行文内锚点跳转(大纲/目录导航是只读核心体验),仅拦截外链。
 */
export const blockReadonlyLinkClick = (event: MouseEvent, readOnly: boolean): boolean => {
  const anchor = resolveEventAnchor(event);
  if (!readOnly || !anchor) return false;
  if ((anchor.getAttribute('href') ?? '').startsWith('#')) {
    return false;
  }
  event.preventDefault();
  event.stopPropagation();
  return true;
};
