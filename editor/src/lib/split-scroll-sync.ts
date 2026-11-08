/**
 * lib/split-scroll-sync.ts — 双栏同步引擎(meditor 内置能力)
 *
 * 两侧持有同一份 markdown:meditor 序列化输出 ↔ 对侧源码面板(CodeMirror 6
 * EditorView 结构兼容;对侧以结构化最小接口描述,本包不引入 CodeMirror 依赖)。
 *
 * - 滚动同步:以"视口顶部锚点块"做块级对齐(两侧字体/行高不同,块内 px
 *   级映射无定义,块顶对齐是正确锚粒度);锚点缺失(空文档/无可见非空块)
 *   时退化为滚动进度比例同步。
 * - 内容双向同步(右侧编辑支持):对侧用户编辑(input 事件 + selectionchange
 *   doc 引用比对双通道)→ meditor 全量替换收敛;meditor 编辑(onChange 上报)
 *   → 防抖 diff 回写对侧(对侧持焦时以对侧为权威源,跳过回写防打断输入)。
 *   程序性写入不触发 input 事件、不更新 DOM selection,天然不产生回环。
 * - 选区双向同步:任意一侧非空选区时,另一侧对应内容同步选中。meditor 侧
 *   以远端选区装饰高亮(未聚焦侧可见,不改焦点、不污染撤销历史);对侧
 *   经 dispatch({selection}) 设置真实选区(未聚焦经 drawSelection 渲染)。
 *   纯光标导航维持既有语义(只滚动定位,不移动对侧光标),并把对侧残留的
 *   同步选区收拢为光标。
 * - 光标定位:一侧光标纯导航(点击/方向键,内容未变)时对侧最小滚动定位
 *   到对应文本;对侧光标侦测经 document selectionchange + doc 引用比对实现
 *   (输入产生新 doc 引用被过滤),消费侧零桥接代码。
 * - 防回环:程序滚动写入后 ECHO_WINDOW_MS 内自身 scroll 事件被回声窗口吞掉,
 *   引擎只消费真实用户滚动;用户中途接管另一侧时自然切换主导侧。
 */

import type {
  MeditorMarkdownBlock,
  MeditorViewport,
  MeditorViewportBlock
} from '../types/editor';

/** 程序滚动后的回声抑制窗口(ms)。 */
const ECHO_WINDOW_MS = 120;

/** meditor 内容 → 对侧回写的防抖窗口(ms):连续输入暂停后一次性 diff 收敛。 */
const PARTNER_WRITE_DEBOUNCE_MS = 150;

/** 对侧面板行块最小结构(CodeMirror 6 BlockInfo 天然满足)。 */
export interface SplitSyncLineBlock {
  /** 行块起始文档位置。 */
  from: number;
  /** 行块顶相对文档顶的高度(px)。 */
  top: number;
  /** 行块高度(px)。 */
  height: number;
}

/**
 * 引擎派发给对侧的事务结构(CodeMirror 6 TransactionSpec 结构兼容子集):
 * 消费侧直接传 CM 视图实例即可,无需任何适配层。
 */
export interface MeditorSplitSyncDispatchSpec {
  changes?: { from: number; to?: number; insert?: string };
  selection?: { anchor: number; head?: number };
  scrollIntoView?: boolean;
  /** 程序性写入不进对侧撤销栈(引擎全部写入固定 false;CodeMirror 6 TransactionSpec 原生字段)。 */
  addToHistory?: boolean;
}

/**
 * 对侧源码面板视图最小结构(CodeMirror 6 EditorView 结构兼容)。
 */
export interface MeditorSplitSyncPartner {
  /** 滚动容器(CodeMirror 6 为 view.scrollDOM)。 */
  scrollDOM: HTMLElement;
  /** 文档顶相对滚动内容顶的偏移(CodeMirror 6 为 view.documentTop)。 */
  documentTop: number;
  /** 当前视口内行块列表。 */
  readonly viewportLineBlocks: readonly SplitSyncLineBlock[];
  /** 取文档位置所在行块。 */
  lineBlockAt(pos: number): SplitSyncLineBlock;
  /** 编辑器状态(文档文本、长度与选区)。 */
  state: {
    doc: {
      toString(): string;
      /** 文档字符长度(CodeMirror 6 Text.length)。 */
      readonly length: number;
      lineAt(pos: number): { from: number; text: string };
    };
    selection: {
      main: { anchor: number; head: number; from: number; to: number; empty: boolean };
    };
  };
  /** 可编辑内容 DOM(用户输入事件侦测;CodeMirror 6 为 view.contentDOM)。 */
  readonly contentDOM?: HTMLElement;
  /** 是否持有焦点。 */
  hasFocus: boolean;
  /** 文档位置 → 视口坐标(位置不可见时为 null)。 */
  coordsAtPos(pos: number): { top: number; bottom: number } | null;
  /** 应用文档变更/选区(CodeMirror 6 dispatch 结构兼容)。 */
  dispatch(spec: MeditorSplitSyncDispatchSpec): void;
}

/** meditor 侧同步依赖(MeditorApi 视口/内容原语子集)。 */
export interface SplitScrollSyncDeps {
  getViewportInfo(): MeditorViewport | null;
  getMarkdownBlocks(): MeditorMarkdownBlock[] | null;
  scrollToBlock(pos: number, align?: 'start' | 'auto'): void;
  scrollToProgress(progress: number): void;
  /** meditor 当前完整 markdown(内容同步比对基准)。 */
  getMarkdown(): string;
  /** meditor 内容整体替换(对侧编辑 → 左栏收敛)。 */
  setMarkdown(markdown: string): void;
  /** meditor 当前选区对应的整篇 markdown 区间(空选区/未就绪返回 null)。 */
  getMarkdownSelection(): { start: number; end: number; text: string } | null;
  /** 把整篇 markdown 区间应用为 meditor 选区(空区间仅移动光标;失败返回 false)。 */
  setMarkdownSelection(start: number, end: number): boolean;
  /** 清除 meditor 侧远端选区高亮。 */
  clearMarkdownSelectionHighlight(): void;
}

/** 同步引擎句柄。 */
export interface SplitScrollSyncHandle {
  /** meditor 光标纯导航上报(门面内部接线,消费侧无需关心)。 */
  notifyMeditorCursor(block: MeditorViewportBlock | null): void;
  /** meditor 内容变更上报(门面内部接线;左 → 右内容同步入口)。 */
  notifyMeditorContent(markdown: string): void;
  /** 解绑全部监听(编辑器 destroy 时自动释放)。 */
  destroy(): void;
}

/** 滚动快照:锚点块 markdown(可空)+ 进度兜底。 */
interface SplitSnapshot {
  anchor: { markdown: string } | null;
  progress: number;
}

/** 抽取多行 markdown 的首个非空文本行(跨侧匹配键)。 */
const firstNonEmptyLine = (markdown: string): string => {
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    if (line.trim().length > 0) return line;
  }
  return '';
};

/** meditor 侧同步面板(基于视口原语)。 */
interface MeditorPane {
  /** 惰性绑定滚动容器(编辑器未就绪时返回 false,由引擎逐帧重试)。 */
  ensureAttached(): boolean;
  setOnUserScroll(handler: () => void): void;
  getSnapshot(): SplitSnapshot | null;
  applyAnchor(markdown: string): boolean;
  applyProgress(progress: number): void;
  revealMarkdown(markdown: string): boolean;
  /** 最小滚动把指定顶层块滚入视口(带回声抑制;已可见则不动)。 */
  revealBlock(pos: number): void;
  destroy(): void;
}

/** 对侧源码面板同步面板。 */
interface PartnerPane {
  setOnUserScroll(handler: () => void): void;
  getSnapshot(): SplitSnapshot | null;
  applyAnchor(markdown: string): boolean;
  applyProgress(progress: number): void;
  revealMarkdown(markdown: string): boolean;
  /** 最小滚动把文档位置所在行滚入视口(带回声抑制;已可见则不动)。 */
  revealPos(pos: number): void;
  destroy(): void;
}

/**
 * 创建 meditor 侧同步面板。
 */
const createMeditorPane = (deps: SplitScrollSyncDeps): MeditorPane => {
  let echoUntil = 0;
  let attachedContainer: HTMLElement | null = null;
  let userScrollHandler: (() => void) | null = null;
  const handleScroll = (): void => {
    if (Date.now() < echoUntil) return;
    userScrollHandler?.();
  };

  return {
    ensureAttached: (): boolean => {
      if (attachedContainer) return true;
      const container = deps.getViewportInfo()?.scrollContainer ?? null;
      if (!container) return false;
      attachedContainer = container;
      container.addEventListener('scroll', handleScroll, { passive: true });
      return true;
    },
    setOnUserScroll: (handler) => {
      userScrollHandler = handler;
    },
    getSnapshot: (): SplitSnapshot | null => {
      const viewport = deps.getViewportInfo();
      if (!viewport) return null;
      // 锚点:视口顶之下首个完整可见(top >= 0)的非空块;全部相交块都在
      // 视口顶上方时取最后一个(最接近视口顶)。
      let anchor: { markdown: string } | null = null;
      let lastNonEmpty: MeditorViewportBlock | null = null;
      for (const block of viewport.blocks) {
        if (block.markdown.trim().length === 0) continue;
        lastNonEmpty = block;
        if (block.top >= 0) {
          anchor = { markdown: block.markdown };
          break;
        }
      }
      if (!anchor && lastNonEmpty) {
        anchor = { markdown: lastNonEmpty.markdown };
      }
      return { anchor, progress: viewport.progress };
    },
    applyAnchor: (markdown): boolean => {
      const blocks = deps.getMarkdownBlocks();
      if (!blocks) return false;
      const key = markdown.trim();
      if (!key) return false;
      const keyFirst = firstNonEmptyLine(markdown);
      for (const block of blocks) {
        const blockKey = block.markdown.trim();
        if (!blockKey) continue;
        // 全文一致或首行一致(列表等多行块在对侧表现为单行)均视为命中。
        if (blockKey === key || (keyFirst && firstNonEmptyLine(block.markdown) === keyFirst)) {
          echoUntil = Date.now() + ECHO_WINDOW_MS;
          deps.scrollToBlock(block.pos, 'start');
          return true;
        }
      }
      return false;
    },
    applyProgress: (progress) => {
      echoUntil = Date.now() + ECHO_WINDOW_MS;
      deps.scrollToProgress(progress);
    },
    revealMarkdown: (markdown): boolean => {
      const blocks = deps.getMarkdownBlocks();
      if (!blocks) return false;
      const key = firstNonEmptyLine(markdown);
      if (!key) return false;
      for (const block of blocks) {
        if (block.markdown.includes(key)) {
          echoUntil = Date.now() + ECHO_WINDOW_MS;
          deps.scrollToBlock(block.pos, 'auto');
          return true;
        }
      }
      return false;
    },
    revealBlock: (pos): void => {
      echoUntil = Date.now() + ECHO_WINDOW_MS;
      deps.scrollToBlock(pos, 'auto');
    },
    destroy: () => {
      attachedContainer?.removeEventListener('scroll', handleScroll);
      attachedContainer = null;
    }
  };
};

/**
 * 创建对侧源码面板同步面板。
 */
const createPartnerPane = (partner: MeditorSplitSyncPartner): PartnerPane => {
  let echoUntil = 0;
  let userScrollHandler: (() => void) | null = null;
  const scrollEl = partner.scrollDOM;
  const handleScroll = (): void => {
    if (Date.now() < echoUntil) return;
    userScrollHandler?.();
  };
  scrollEl.addEventListener('scroll', handleScroll, { passive: true });

  return {
    setOnUserScroll: (handler) => {
      userScrollHandler = handler;
    },
    getSnapshot: (): SplitSnapshot | null => {
      const scrollRect = scrollEl.getBoundingClientRect();
      // 锚点:视口顶之下首个完整可见(pageTop >= 视口顶)的文本非空行块;
      // 全部行块都在视口顶上方时取最后一个(最接近视口顶)。
      let anchor: { markdown: string } | null = null;
      let lastNonEmpty: string | null = null;
      for (const block of partner.viewportLineBlocks) {
        const pageTop = partner.documentTop + block.top;
        if (pageTop + block.height <= scrollRect.top || pageTop >= scrollRect.bottom) {
          continue;
        }
        const line = partner.state.doc.lineAt(block.from);
        if (line.text.trim().length === 0) continue;
        lastNonEmpty = line.text;
        if (pageTop >= scrollRect.top) {
          anchor = { markdown: line.text };
          break;
        }
      }
      if (!anchor && lastNonEmpty) {
        anchor = { markdown: lastNonEmpty };
      }
      const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
      return {
        anchor,
        progress: maxScroll > 0 ? Math.min(1, Math.max(0, scrollEl.scrollTop / maxScroll)) : 0
      };
    },
    applyAnchor: (markdown): boolean => {
      const docText = partner.state.doc.toString();
      // 全文匹配优先,首行匹配兜底(meditor 块可能为多行 markdown)。
      let index = docText.indexOf(markdown);
      if (index < 0) {
        const first = firstNonEmptyLine(markdown);
        index = first ? docText.indexOf(first) : -1;
      }
      if (index < 0) return false;
      const line = partner.state.doc.lineAt(index);
      const block = partner.lineBlockAt(line.from);
      const scrollRect = scrollEl.getBoundingClientRect();
      echoUntil = Date.now() + ECHO_WINDOW_MS;
      scrollEl.scrollTop += partner.documentTop + block.top - scrollRect.top;
      return true;
    },
    applyProgress: (progress) => {
      const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
      echoUntil = Date.now() + ECHO_WINDOW_MS;
      scrollEl.scrollTop = Math.max(0, Math.min(1, progress)) * maxScroll;
    },
    revealMarkdown: (markdown): boolean => {
      const docText = partner.state.doc.toString();
      // 全文匹配优先,首行匹配兜底。
      let index = docText.indexOf(markdown);
      if (index < 0) {
        const first = firstNonEmptyLine(markdown);
        index = first ? docText.indexOf(first) : -1;
      }
      if (index < 0) return false;
      const line = partner.state.doc.lineAt(index);
      const scrollRect = scrollEl.getBoundingClientRect();
      const coords = partner.coordsAtPos(line.from);
      // 已在视口内则不动(避免光标微动引发跳滚)。
      if (coords && coords.top >= scrollRect.top && coords.bottom <= scrollRect.bottom) {
        return true;
      }
      echoUntil = Date.now() + ECHO_WINDOW_MS;
      if (coords) {
        // 最小滚动进入视口(与 meditor scrollToBlock 'auto' 语义一致)。
        if (coords.top < scrollRect.top) {
          scrollEl.scrollTop += coords.top - scrollRect.top;
        } else if (coords.bottom > scrollRect.bottom) {
          scrollEl.scrollTop += coords.bottom - scrollRect.bottom;
        }
      } else {
        // 位置不可见且无坐标(如折叠区):按行块几何定位到视口中部。
        const block = partner.lineBlockAt(line.from);
        scrollEl.scrollTop = partner.documentTop + block.top - scrollRect.height / 2;
      }
      return true;
    },
    revealPos: (pos): void => {
      // 行块几何最小滚动:不依赖 coordsAtPos(远端位置可能尚未渲染)。
      const block = partner.lineBlockAt(pos);
      const top = partner.documentTop + block.top;
      const bottom = top + block.height;
      const viewTop = scrollEl.scrollTop;
      const viewBottom = viewTop + scrollEl.clientHeight;
      if (top >= viewTop && bottom <= viewBottom) return;
      echoUntil = Date.now() + ECHO_WINDOW_MS;
      if (top < viewTop) {
        scrollEl.scrollTop = Math.max(0, top);
      } else {
        scrollEl.scrollTop = Math.max(0, bottom - scrollEl.clientHeight);
      }
    },
    destroy: () => {
      scrollEl.removeEventListener('scroll', handleScroll);
    }
  };
};

/**
 * 在有序块列表中取 key ≤ / < 目标位置的最后一个块的索引(无命中返回 -1)。
 * strict=false 用于选区起点(块首含),strict=true 用于选区终点(块首不含,
 * 终点落在块间空隙时归属前一块)。core/createEditor 的选区原语同款复用。
 */
export const lastBlockIndexAt = (
  blocks: readonly MeditorMarkdownBlock[],
  getKey: (block: MeditorMarkdownBlock) => number,
  offset: number,
  strict: boolean
): number => {
  let found = -1;
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (!block) break;
    const key = getKey(block);
    if (strict ? key < offset : key <= offset) {
      found = i;
    } else {
      break;
    }
  }
  return found;
};

/**
 * 计算最小文本变更区间(公共前缀/后缀裁剪):把全文替换收敛为局部 diff,
 * 避免对侧光标/视图整体跳动。
 */
const diffChanges = (
  oldText: string,
  newText: string
): { from: number; to: number; insert: string } => {
  let start = 0;
  const maxStart = Math.min(oldText.length, newText.length);
  while (start < maxStart && oldText.charCodeAt(start) === newText.charCodeAt(start)) {
    start += 1;
  }
  let endOld = oldText.length;
  let endNew = newText.length;
  while (
    endOld > start &&
    endNew > start &&
    oldText.charCodeAt(endOld - 1) === newText.charCodeAt(endNew - 1)
  ) {
    endOld -= 1;
    endNew -= 1;
  }
  return { from: start, to: endOld, insert: newText.slice(start, endNew) };
};

/**
 * 创建双栏同步引擎:接线滚动联动、内容双向同步与选区双向同步。
 */
export const createSplitScrollSync = (
  deps: SplitScrollSyncDeps,
  partner: MeditorSplitSyncPartner
): SplitScrollSyncHandle => {
  const meditorPane = createMeditorPane(deps);
  const partnerPane = createPartnerPane(partner);
  let destroyed = false;
  let rafId = 0;
  let bindRafId = 0;
  /** 待处理同步的来源侧(同一帧多次滚动合并为一次)。 */
  let pendingSource: 'meditor' | 'partner' | null = null;

  // --- 内容同步状态 ---
  /** 对侧 doc 引用(区分"输入产生新 doc"与"纯导航")。 */
  let lastPartnerDoc = partner.state.doc;
  /** 上次从对侧收敛到 meditor 的内容(输入 + selectionchange 双通道去重)。 */
  let lastSyncedFromPartner = partner.state.doc.toString();
  /** meditor → 对侧待回写内容与防抖定时器。 */
  let pendingMeditorMd: string | null = null;
  let meditorWriteTimer = 0;

  const syncFrom = (source: 'meditor' | 'partner'): void => {
    if (destroyed) return;
    const sourcePane = source === 'meditor' ? meditorPane : partnerPane;
    const targetPane = source === 'meditor' ? partnerPane : meditorPane;
    const snapshot = sourcePane.getSnapshot();
    if (!snapshot) return;
    // 锚点优先;映射失败(内容短暂不同步等)回退进度兜底。
    if (snapshot.anchor && targetPane.applyAnchor(snapshot.anchor.markdown)) {
      return;
    }
    targetPane.applyProgress(snapshot.progress);
  };

  const scheduleSync = (source: 'meditor' | 'partner'): void => {
    if (destroyed) return;
    pendingSource = source;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      const source = pendingSource;
      pendingSource = null;
      if (source) syncFrom(source);
    });
  };

  // ============ 内容双向同步 ============

  /** 对侧用户编辑 → meditor 全量收敛(输入 + selectionchange 兜底双通道)。 */
  const syncPartnerContentToMeditor = (): void => {
    const docText = partner.state.doc.toString();
    if (docText === lastSyncedFromPartner) return;
    lastSyncedFromPartner = docText;
    deps.setMarkdown(docText);
    // meditor 为全文替换后的新文档:按对侧选区映射光标/选区
    // (对侧持焦、meditor 未聚焦,纯状态同步无视觉扰动)。
    const main = partner.state.selection.main;
    const from = Math.min(main.anchor, main.head);
    const to = Math.max(main.anchor, main.head);
    deps.setMarkdownSelection(from, to);
  };

  /** 对侧内容 DOM 用户输入(打字/粘贴/删除;程序性 dispatch 不触发)。 */
  const onPartnerInput = (): void => {
    if (destroyed || !partner.hasFocus) return;
    syncPartnerContentToMeditor();
  };
  partner.contentDOM?.addEventListener('input', onPartnerInput);

  /** meditor 内容 → 对侧 diff 回写(对侧持焦时以对侧为权威源,丢弃回声)。 */
  const flushMeditorToPartner = (): void => {
    meditorWriteTimer = 0;
    const md = pendingMeditorMd;
    pendingMeditorMd = null;
    if (destroyed || md === null) return;
    if (partner.hasFocus) return;
    const cur = partner.state.doc.toString();
    if (cur === md) return;
    partner.dispatch({ changes: diffChanges(cur, md), addToHistory: false });
    // 程序性 dispatch 不触发 input/selectionchange,主动刷新 doc 引用基准。
    lastPartnerDoc = partner.state.doc;
  };

  const notifyMeditorContent = (markdown: string): void => {
    if (destroyed) return;
    if (partner.hasFocus) return;
    pendingMeditorMd = markdown;
    if (!meditorWriteTimer) {
      meditorWriteTimer = window.setTimeout(flushMeditorToPartner, PARTNER_WRITE_DEBOUNCE_MS);
    }
  };

  // ============ 选区双向同步 ============

  /**
   * 对侧选区 → meditor:markdown 偏移直映(CM 文本 = meditor 序列化文本),
   * 非空选区应用选区 + 远端高亮;映射失败由 deps 内部退化块级。
   */
  const applyPartnerSelectionToMeditor = (from: number, to: number): void => {
    const blocks = deps.getMarkdownBlocks();
    if (!blocks || blocks.length === 0) return;
    if (!deps.setMarkdownSelection(from, to)) return;
    // 选区起点块最小滚入视口(meditor 未聚焦,高亮需可见)。
    const firstIdx = lastBlockIndexAt(blocks, (b) => b.start, from, false);
    const firstBlock = firstIdx >= 0 ? blocks[firstIdx] : undefined;
    if (firstBlock) {
      meditorPane.revealBlock(firstBlock.pos);
    }
  };

  /**
   * meditor 选区 → 对侧:真实选区同步(对侧未聚焦,经 drawSelection 渲染)。
   * 文本精确匹配优先(两侧同步时一致),偏移直映兜底。
   */
  const applyMeditorSelectionToPartner = (): void => {
    const sel = deps.getMarkdownSelection();
    if (!sel) return;
    const docText = partner.state.doc.toString();
    let start = sel.start;
    let end = sel.end;
    if (sel.text.length > 0 && docText.slice(start, end) !== sel.text) {
      const index = docText.indexOf(sel.text);
      if (index >= 0) {
        start = index;
        end = index + sel.text.length;
      }
    }
    start = Math.max(0, Math.min(start, docText.length));
    end = Math.max(start, Math.min(end, docText.length));
    if (end <= start) return;
    const main = partner.state.selection.main;
    if (main.anchor === start && main.head === end) return;
    partner.dispatch({ selection: { anchor: start, head: end }, addToHistory: false });
    partnerPane.revealPos(start);
  };

  /** 对侧残留的同步选区收拢为光标(清除高亮;对侧未聚焦无视觉扰动)。 */
  const collapsePartnerSelection = (): void => {
    const main = partner.state.selection.main;
    if (main.from === main.to) return;
    partner.dispatch({ selection: { anchor: main.head, head: main.head }, addToHistory: false });
  };

  // ============ 事件接线 ============

  /**
   * 对侧 selectionchange:doc 引用比对区分"输入产生新 doc"(内容同步)与
   * "纯导航/选区变化"(选区同步 + 定位滚动)。
   */
  const onSelectionChange = (): void => {
    if (destroyed) return;
    if (partner.state.doc !== lastPartnerDoc) {
      lastPartnerDoc = partner.state.doc;
      // 引擎自己的 diff 回写不触发 selectionchange(未聚焦),此处命中
      // 说明 doc 变化来自对侧侧命令(撤销等):视为用户编辑兜底同步。
      if (partner.hasFocus) {
        syncPartnerContentToMeditor();
      }
      return;
    }
    if (!partner.hasFocus) return;
    const main = partner.state.selection.main;
    if (!main.empty) {
      // 非空选区:meditor 侧同步选中 + 高亮。
      applyPartnerSelectionToMeditor(Math.min(main.anchor, main.head), Math.max(main.anchor, main.head));
      return;
    }
    // 光标纯导航:清除遗留选区高亮 + 定位滚动(只滚动,不移动 meditor 光标)。
    deps.clearMarkdownSelectionHighlight();
    const line = partner.state.doc.lineAt(main.head);
    if (line.text.trim().length === 0) return;
    meditorPane.revealMarkdown(line.text);
  };
  document.addEventListener('selectionchange', onSelectionChange);

  meditorPane.setOnUserScroll(() => scheduleSync('meditor'));
  partnerPane.setOnUserScroll(() => scheduleSync('partner'));
  // meditor 异步就绪前滚动容器拿不到,逐帧重试绑定。
  const tryBind = (): void => {
    if (destroyed) return;
    let bound = false;
    try {
      bound = meditorPane.ensureAttached();
    } catch {
      // 瞬态错误(如编辑器初始化窗口期)不应打断重试循环。
      bound = false;
    }
    if (!bound) bindRafId = requestAnimationFrame(tryBind);
  };
  tryBind();

  return {
    notifyMeditorCursor: (block) => {
      if (destroyed || !block) return;
      const sel = deps.getMarkdownSelection();
      if (sel) {
        // 非空选区:对侧同步选中(meditor 持焦 → 对侧必然未聚焦)。
        applyMeditorSelectionToPartner();
        return;
      }
      // 纯光标导航:定位滚动(只滚动,不改对侧光标),并收拢对侧残留选区。
      collapsePartnerSelection();
      partnerPane.revealMarkdown(block.markdown);
    },
    notifyMeditorContent,
    destroy: () => {
      destroyed = true;
      partner.contentDOM?.removeEventListener('input', onPartnerInput);
      document.removeEventListener('selectionchange', onSelectionChange);
      window.clearTimeout(meditorWriteTimer);
      meditorWriteTimer = 0;
      pendingMeditorMd = null;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      if (bindRafId) cancelAnimationFrame(bindRafId);
      bindRafId = 0;
      meditorPane.destroy();
      partnerPane.destroy();
    }
  };
};
