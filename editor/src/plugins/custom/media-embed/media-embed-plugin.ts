/**
 * plugins/custom/media-embed/media-embed-plugin.ts — 媒体嵌入块(视频/音频/书签/内嵌)
 *
 * markdown 表示(合法行内 HTML 块,其他渲染器按 HTML 渲染,MD 属性无损):
 *   视频    <video src="..." controls></video>(可携带 style="height: Npx;" 自定义高度)
 *   音频    <audio src="..." controls></audio>
 *   书签    <a href="URL" class="meditor-bookmark">URL</a>
 *   内嵌    <iframe src="..."></iframe>(可携带 style="height: Npx;" 自定义高度)
 *
 * - 解析:remark transformer 把上述 html 叶子(含 commonmark remarkHTMLTransformer
 *   的段落包装形态)就地改写为自定义类型 media-embed;
 * - 序列化:toMarkdown 还原为对应 html 叶子,round-trip 幂等;
 * - src 归一化走 normalizeSafeUrl(协议白名单外拒绝,与链接同规)。
 */
import { $nodeSchema, $remark } from '@milkdown/utils';
import { normalizeSafeUrl } from '../../../utils/security';

/**
 * 媒体嵌入块节点类型名。
 */
export const MEDIA_EMBED_NODE_NAME = 'media_embed';

/**
 * 嵌入种类。
 */
export type MediaEmbedKind = 'video' | 'audio' | 'bookmark' | 'embed';

/**
 * 全部种类(遍历/兜底)。
 */
export const MEDIA_EMBED_KINDS: readonly MediaEmbedKind[] = ['video', 'audio', 'bookmark', 'embed'];

/**
 * 内嵌 iframe 高度最小值(px)。
 */
export const MEDIA_EMBED_HEIGHT_MIN_PX = 120;

/**
 * 内嵌 iframe 高度最大值(px)。
 */
export const MEDIA_EMBED_HEIGHT_MAX_PX = 800;

/**
 * 从 style 属性值中匹配 height: Npx(要求以开头或分号分隔,避免误匹配其他属性值;位数不限,越界交给 clamp)。
 */
const MEDIA_EMBED_HEIGHT_STYLE_PATTERN = /(?:^|;)\s*height\s*:\s*(\d+)\s*px/i;

/**
 * 从 HTML 标签 markup 中提取 style 属性值(单/双引号均容)。
 */
const MEDIA_EMBED_STYLE_ATTR_PATTERN = /\bstyle\s*=\s*(["'])([^"']*)\1/i;

/**
 * 判断是否合法种类。
 */
export const isMediaEmbedKind = (value: unknown): value is MediaEmbedKind =>
  typeof value === 'string' && (MEDIA_EMBED_KINDS as readonly string[]).includes(value);

/** mdast 节点最小结构。 */
interface MdastNodeLike {
  type: string;
  children?: MdastNodeLike[];
  value?: string | null;
  data?: Record<string, unknown> | null;
  [key: string]: unknown;
}

/**
 * 开标签匹配:`<video src="...">` / `<audio src="...">` / `<iframe src="...">`
 * (CommonMark raw HTML 规则:开/闭标签是独立 html 叶子,需按跨度配对)。
 */
const MEDIA_OPEN_PATTERN = /^<(video|audio|iframe)\b[^>]*\ssrc="([^"]*)"[^>]*>$/i;

/**
 * 书签开标签:`<a href="..." ...class="meditor-bookmark"...>`。
 */
const BOOKMARK_OPEN_PATTERN = /^<a\s+[^>]*?href="([^"]*)"[^>]*class="meditor-bookmark"[^>]*>$/i;

/**
 * 闭标签匹配(动态构建:按开标签名生成 `^</tag>$` 使用)。
 */

/**
 * 归一化 src(空/协议外返回 null)。
 */
const normalizeMediaSrc = (src: string): string | null => {
  const normalized = normalizeSafeUrl(src.trim());
  return normalized || null;
};

/**
 * 限制内嵌高度到允许区间(并取整)。
 */
export const clampMediaEmbedHeight = (heightPx: number): number => {
  return Math.min(MEDIA_EMBED_HEIGHT_MAX_PX, Math.max(MEDIA_EMBED_HEIGHT_MIN_PX, Math.round(heightPx)));
};

/**
 * 解析 style 属性值中的内嵌高度(无/非法返回 0 表示自动 16:9)。
 */
export const parseMediaEmbedHeightStyle = (styleValue: unknown): number => {
  if (typeof styleValue !== 'string') {
    return 0;
  }

  // 高度匹配结果。
  const match = MEDIA_EMBED_HEIGHT_STYLE_PATTERN.exec(styleValue);
  if (!match) {
    return 0;
  }

  // 高度像素值。
  const heightPx = Number(match[1]);
  return Number.isFinite(heightPx) ? clampMediaEmbedHeight(heightPx) : 0;
};

/**
 * 从 HTML 标签 markup 中解析内嵌高度(供 mdast transformer 使用;无/非法返回 0)。
 */
export const parseMediaEmbedHeightMarkup = (markup: unknown): number => {
  if (typeof markup !== 'string') {
    return 0;
  }

  // style 属性值。
  const attrMatch = MEDIA_EMBED_STYLE_ATTR_PATTERN.exec(markup);
  return attrMatch ? parseMediaEmbedHeightStyle(attrMatch[2]) : 0;
};

/**
 * 格式化内嵌高度为 style 属性值。
 */
export const formatMediaEmbedHeightStyle = (heightPx: number): string => {
  return `height: ${clampMediaEmbedHeight(heightPx)}px;`;
};

/**
 * 序列化 media 节点为 html 叶子文本(video/embed 高度 > 0 时写入 style)。
 */
export const serializeMediaHtml = (kind: MediaEmbedKind, src: string, heightPx = 0): string => {
  // 转义属性值中的双引号。
  const safeSrc = src.replace(/"/g, '&quot;');
  // 自定义高度样式(0 = 自动高度,不写 style;video 与 embed 支持自定义高度)。
  const heightStyle =
    (kind === 'video' || kind === 'embed') && heightPx > 0
      ? ` style="${formatMediaEmbedHeightStyle(heightPx)}"`
      : '';
  switch (kind) {
    case 'video':
      return `<video src="${safeSrc}" controls${heightStyle}></video>`;
    case 'audio':
      return `<audio src="${safeSrc}" controls></audio>`;
    case 'bookmark':
      return `<a href="${safeSrc}" class="meditor-bookmark">${safeSrc}</a>`;
    case 'embed': {
      return `<iframe src="${safeSrc}"${heightStyle}></iframe>`;
    }
    default:
      return '';
  }
};

/**
 * 构建媒体节点 mdast data(video/embed 附带 markup 中解析到的自定义高度,> 0 才写入)。
 */
const buildMediaEmbedData = (
  kind: MediaEmbedKind,
  src: string,
  tagMarkup: string
): Record<string, unknown> => {
  if (kind !== 'video' && kind !== 'embed') {
    return { kind, src };
  }

  // 自定义高度(0 表示自动高度)。
  const heightPx = parseMediaEmbedHeightMarkup(tagMarkup);
  return heightPx > 0 ? { kind, src, height: heightPx } : { kind, src };
};

/**
 * 判断节点是否为媒体 html 载体(裸 html 叶子,或段落包装的唯一 html 叶子)。
 */
const resolveHtmlCarrierValue = (node: MdastNodeLike): string | null => {
  if (node.type === 'html' && typeof node.value === 'string') {
    return node.value;
  }
  if (
    node.type === 'paragraph' &&
    Array.isArray(node.children) &&
    node.children.length === 1
  ) {
    const only = node.children[0];
    if (only && only.type === 'html' && typeof only.value === 'string') {
      return only.value;
    }
  }
  return null;
};

/**
 * 在单个 children 数组内按跨度配对改写媒体 html 载体(返回新数组;嵌套容器递归)。
 * CommonMark 把开/闭标签拆为独立 html 叶子(video/audio/iframe/a 同理),
 * 因此向前扫描收集中间节点,命中对应闭标签时合成一个 media_embed。
 * 导出以便脱离 milkdown 运行时做纯 mdast 契约自测。
 */
export const rewriteMediaEmbedsInChildList = (
  children: MdastNodeLike[],
  allowedProtocols?: readonly string[]
): MdastNodeLike[] => {
  /** 改写结果。 */
  const result: MdastNodeLike[] = [];

  for (let index = 0; index < children.length; index += 1) {
    // 当前孩子节点。
    const child = children[index];
    if (!child) {
      continue;
    }

    // 节点携带的 html 值。
    const htmlValue = resolveHtmlCarrierValue(child);
    const trimmed = htmlValue?.trim() ?? '';

    // 自闭合单叶形式:`<iframe src=".."></iframe>` 整段在一个 html 叶子里
    // (micromark 对开闭标签紧邻的形式不再拆叶)。
    const selfContained = /^<(video|audio|iframe)\b/i.exec(trimmed);
    if (selfContained) {
      const match = /^<(video|audio|iframe)\b[^>]*\ssrc="([^"]*)"[^>]*>\s*<\/\1>$/i.exec(trimmed);
      const tag = selfContained[1]?.toLowerCase();
      const src = match ? normalizeMediaSrc(match[2] ?? '') : null;
      if (src) {
        const kind: MediaEmbedKind = tag === 'video' ? 'video' : tag === 'audio' ? 'audio' : 'embed';
        result.push({
          type: MEDIA_EMBED_NODE_NAME,
          data: buildMediaEmbedData(kind, src, trimmed)
        });
        continue;
      }
    }

    // 命中开标签:向前配对闭标签。
    const openMatch = MEDIA_OPEN_PATTERN.exec(trimmed);
    if (openMatch) {
      // 标签名与 src。
      const tag = openMatch[1]?.toLowerCase();
      const src = normalizeMediaSrc(openMatch[2] ?? '');
      // 闭标签扫描(闭标签与开标签同叶的自闭合形式已由正则排除,无需处理)。
      let closeIndex = -1;
      for (let scan = index + 1; scan < children.length; scan += 1) {
        // 扫描位置节点。
        const candidate = children[scan];
        if (!candidate) {
          continue;
        }
        const candidateValue = resolveHtmlCarrierValue(candidate)?.trim() ?? '';
        if (new RegExp(`^</${tag}>$`, 'i').test(candidateValue)) {
          closeIndex = scan;
          break;
        }
      }

      // src 合法且找到闭标签才改写;否则原样保留(降级)。
      if (src && closeIndex > index) {
        const kind: MediaEmbedKind = tag === 'video' ? 'video' : tag === 'audio' ? 'audio' : 'embed';
        result.push({
          type: MEDIA_EMBED_NODE_NAME,
          data: buildMediaEmbedData(kind, src, openMatch[0] ?? '')
        });
        index = closeIndex;
        continue;
      }
    }

    // 书签开标签:吞掉链接文本与闭标签(内容即 src 文案,由渲染重建)。
    const bookmarkMatch = BOOKMARK_OPEN_PATTERN.exec(trimmed);
    if (bookmarkMatch) {
      // 书签地址。
      const src = normalizeMediaSrc(bookmarkMatch[1] ?? '');
      let closeIndex = -1;
      for (let scan = index + 1; scan < children.length; scan += 1) {
        // 扫描位置节点。
        const candidate = children[scan];
        if (!candidate) {
          continue;
        }
        const candidateValue = resolveHtmlCarrierValue(candidate)?.trim() ?? '';
        if (/^<\/a>$/i.test(candidateValue)) {
          closeIndex = scan;
          break;
        }
      }

      if (src && closeIndex > index) {
        result.push({
          type: MEDIA_EMBED_NODE_NAME,
          data: { kind: 'bookmark', src }
        });
        index = closeIndex;
        continue;
      }
    }

    // 递归处理容器子级;段落解包:段落内仅剩单个 media_embed(block 节点
    // 不能进 paragraph content)时,以该节点替换段落本身。
    if (Array.isArray(child.children) && child.type !== MEDIA_EMBED_NODE_NAME) {
      child.children = rewriteMediaEmbedsInChildList(child.children, allowedProtocols);
      if (
        child.type === 'paragraph' &&
        child.children.length === 1 &&
        child.children[0]?.type === MEDIA_EMBED_NODE_NAME
      ) {
        result.push(child.children[0]!);
        continue;
      }
    }
    result.push(child);
  }
  return result;
};

/**
 * remark 插件工厂(带协议白名单参数)。
 */
export const createRemarkMediaEmbedPlugin = (allowedProtocols?: readonly string[]) =>
  $remark('remarkMediaEmbed', () => {
    // unified 插件:返回 mdast transformer。
    const plugin = () => (tree: MdastNodeLike) => {
      if (Array.isArray(tree.children)) {
        tree.children = rewriteMediaEmbedsInChildList(tree.children, allowedProtocols);
      }
    };
    return plugin as never;
  });

/**
 * 默认 remark 插件(无自定义白名单;schema 内不再重复过滤)。
 */
export const remarkMediaEmbedPlugin = createRemarkMediaEmbedPlugin();

/**
 * 媒体嵌入块节点 schema。
 */
export const mediaEmbedSchema = $nodeSchema(MEDIA_EMBED_NODE_NAME, () => {
  return {
    group: 'block',
    atom: true,
    isolating: true,
    attrs: {
      kind: { default: 'video', validate: 'string' },
      src: { default: '', validate: 'string' },
      // 内嵌 iframe 自定义高度(px;0 = 自动 16:9,仅 embed 种类使用)。
      height: { default: 0, validate: 'number' }
    },
    parseDOM: [
      {
        tag: 'video[src]',
        getAttrs: (dom) => ({
          kind: 'video',
          src: (dom as HTMLVideoElement).getAttribute('src') ?? '',
          height: parseMediaEmbedHeightStyle((dom as HTMLVideoElement).getAttribute('style'))
        })
      },
      {
        tag: 'audio[src]',
        getAttrs: (dom) => ({ kind: 'audio', src: (dom as HTMLAudioElement).getAttribute('src') ?? '' })
      },
      {
        tag: 'iframe[src]',
        getAttrs: (dom) => ({
          kind: 'embed',
          src: (dom as HTMLIFrameElement).getAttribute('src') ?? '',
          height: parseMediaEmbedHeightStyle((dom as HTMLIFrameElement).getAttribute('style'))
        })
      },
      {
        tag: 'a.meditor-bookmark[href]',
        getAttrs: (dom) => ({
          kind: 'bookmark',
          src: (dom as HTMLAnchorElement).getAttribute('href') ?? ''
        })
      }
    ],
    toDOM: (node) => {
      // 当前种类与地址。
      const kind = isMediaEmbedKind(node.attrs.kind) ? node.attrs.kind : 'video';
      const src = String(node.attrs.src ?? '');
      // 按种类产出兜底 DOM(atom 节点无 content hole)。
      if (kind === 'bookmark') {
        const anchor = document.createElement('a');
        anchor.href = src;
        anchor.className = 'meditor-bookmark';
        anchor.textContent = src;
        return anchor;
      }
      // video/audio/iframe 兜底。
      const element =
        kind === 'audio'
          ? document.createElement('audio')
          : kind === 'embed'
            ? document.createElement('iframe')
            : document.createElement('video');
      element.setAttribute('src', src);
      element.setAttribute('controls', '');
      // video/embed 自定义高度同步到兜底 DOM(剪贴板等场景与 NodeView 渲染一致)。
      if (kind === 'video' || kind === 'embed') {
        const heightPx = typeof node.attrs.height === 'number' ? node.attrs.height : 0;
        if (heightPx > 0) {
          element.setAttribute('style', formatMediaEmbedHeightStyle(heightPx));
        }
      }
      return element;
    },
    parseMarkdown: {
      match: (node) => node.type === MEDIA_EMBED_NODE_NAME,
      runner: (state, node, type) => {
        // mdast data 携带 kind/src/height。
        const data = (node.data ?? {}) as { kind?: string; src?: string; height?: number };
        state.addNode(type, {
          kind: isMediaEmbedKind(data.kind) ? data.kind : 'video',
          src: typeof data.src === 'string' ? data.src : '',
          height: typeof data.height === 'number' ? clampMediaEmbedHeight(data.height) : 0
        });
      }
    },
    toMarkdown: {
      match: (node) => node.type.name === MEDIA_EMBED_NODE_NAME,
      runner: (state, node) => {
        // 还原为对应 html 叶子。
        const kind = isMediaEmbedKind(node.attrs.kind) ? node.attrs.kind : 'video';
        const src = String(node.attrs.src ?? '');
        const heightPx = typeof node.attrs.height === 'number' ? node.attrs.height : 0;
        if (src) {
          state.addNode('html', undefined, serializeMediaHtml(kind, src, heightPx));
        }
      }
    }
  };
});

/**
 * 媒体嵌入块插件聚合(mdast 转换 + schema)。
 */
export const mediaEmbed: unknown[] = [remarkMediaEmbedPlugin, mediaEmbedSchema].flat();
