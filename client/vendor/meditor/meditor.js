var Qc = Object.defineProperty;
var ed = (e, t, n) => t in e ? Qc(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var m = (e, t, n) => ed(e, typeof t != "symbol" ? t + "" : t, n);
import { DecorationSet as Le, Decoration as jt } from "@milkdown/prose/view";
import { TextSelection as de, Plugin as ye, PluginKey as ke, NodeSelection as Ae } from "@milkdown/prose/state";
import { schemaCtx as td, editorViewCtx as Pn, Editor as nd, remarkStringifyOptionsCtx as od, rootCtx as rd, defaultValueCtx as id, editorViewOptionsCtx as sd, nodeViewCtx as ad, serializerCtx as ld, parserCtx as cd } from "@milkdown/core";
import { clipboard as dd } from "@milkdown/plugin-clipboard";
import { history as ud } from "@milkdown/plugin-history";
import { indent as hd, indentConfig as md } from "@milkdown/plugin-indent";
import { listenerCtx as pd, listener as fd } from "@milkdown/plugin-listener";
import { imageSchema as Wi, paragraphKeymap as gd, headingKeymap as bd, bulletListKeymap as yd, orderedListKeymap as kd, blockquoteKeymap as wd, codeBlockKeymap as vd, inlineCodeKeymap as Cd, codeBlockSchema as Ui, orderedListSchema as Ed, blockquoteSchema as zd, commonmark as Md } from "@milkdown/preset-commonmark";
import { tableCellSchema as Vi, tableHeaderSchema as qi, tableRowSchema as Gi, tableSchema as Xi, strikethroughSchema as Td, gfm as xd } from "@milkdown/preset-gfm";
import { $nodeSchema as Ke, $prose as ue, $remark as We, $markSchema as Ka, $useKeymap as Sd, $ctx as Ld, $inputRule as Kt, replaceAll as Ad } from "@milkdown/utils";
import { liftTarget as Id } from "@milkdown/prose/transform";
import Vn from "katex";
import { TooltipProvider as Rd } from "@milkdown/plugin-tooltip";
import { setBlockType as Dn, wrapIn as jr, toggleMark as Kr, lift as Nd } from "@milkdown/prose/commands";
import { wrapInList as Yi, liftListItem as Pd, sinkListItem as Dd } from "@milkdown/prose/schema-list";
import Bd from "remark-footnotes";
import { TableMap as _d, deleteRow as Od, deleteColumn as Hd, addRowBefore as Fd, addRowAfter as $d, addColumnBefore as jd, addColumnAfter as Kd, splitCell as Wd, mergeCells as Wa, CellSelection as Ud } from "@milkdown/prose/tables";
import { gapCursor as Vd, GapCursor as kr } from "@milkdown/prose/gapcursor";
import { DOMSerializer as qd } from "@milkdown/prose/model";
import { InputRule as pn, wrappingInputRule as Ua, inputRules as Gd } from "@milkdown/prose/inputrules";
import { findChildren as Xd, markRule as Yd } from "@milkdown/prose";
import { ySyncPluginKey as Zd, yXmlFragmentToProseMirrorRootNode as Jd, ySyncPlugin as Qd, yUndoPlugin as eu, yCursorPlugin as tu, prosemirrorJSONToYXmlFragment as nu } from "y-prosemirror";
import "yjs";
import { search as ou, getSearchState as Va, SearchQuery as qa, setSearchState as Zi, replaceAll as ru, findPrev as iu, findNext as su, replaceNext as au } from "prosemirror-search";
import { undo as Ga, redo as Xa } from "@milkdown/prose/history";
import { BlockProvider as lu, block as cu } from "@milkdown/kit/plugin/block";
import { keymap as du } from "@milkdown/prose/keymap";
import { refractor as Ya } from "refractor";
import { dropCursor as uu } from "@milkdown/prose/dropcursor";
import hu from "remark-math";
import mu from "remark-frontmatter";
const pu = (e, t) => typeof e != "function" ? () => {
} : (n) => {
  t.action(e(n));
}, Za = (e, t) => {
  try {
    return e.action((n) => n.get(t));
  } catch {
    return null;
  }
}, Bn = (e, t, n) => {
  const o = Za(e, t);
  return o !== null && n(o) ? o : null;
}, Ji = (e, t) => {
  try {
    return e.action(t);
  } catch {
    return null;
  }
}, Ja = {
  // --- 格式类 ---
  bold: '<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/>',
  italic: '<path d="M19 4h-9M14 20H5M15 4L9 20"/>',
  underline: '<path d="M6 4v6a6 6 0 0 0 12 0V4M4 20h16"/>',
  strikethrough: '<path d="M16 4H9a3 3 0 0 0-2.83 4M14 12a4 4 0 0 1 0 8H6M4 12h16"/>',
  // subscript/superscript:大 X 配角标位置的小 x(lucide 无原生图形,自绘)。
  subscript: '<path d="m3 5 7 9M10 5l-7 9"/><path d="m15 15 5 5M20 15l-5 5"/>',
  superscript: '<path d="m3 10 7 9M10 10l-7 9"/><path d="m15 4 5 5M20 4l-5 5"/>',
  // footnote:引用标记 [1](方括号 + 数字)。
  footnote: '<path d="M7 4H5a1 1 0 0 0-1 1v5c0 1-1 2-2 2 1 0 2 1 2 2v5a1 1 0 0 0 1 1h2"/><path d="M17 4h2a1 1 0 0 1 1 1v5c0 1 1 2 2 2-1 0-2 1-2 2v5a1 1 0 0 1-1 1h-2"/><path d="M11 10h2v5"/>',
  // toc:目录(标题行 + 缩进条目)。
  toc: '<path d="M4 6h10M4 12h16M4 18h12"/><circle cx="2.5" cy="6" r="0.5"/><circle cx="2.5" cy="12" r="0.5"/><circle cx="2.5" cy="18" r="0.5"/>',
  inlineCode: '<path d="M8 6l-6 6 6 6M16 6l6 6-6 6"/>',
  codeBlock: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M10 9l-3 3 3 3M14 9l3 3-3 3"/>',
  link: '<path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8"/>',
  clearFormat: '<path d="M4 7V4h16v3M5 20h6M13 4 8 20M15 15l5 5M20 15l-5 5"/>',
  formatBrush: '<path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>',
  erase: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
  highlight: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  textColor: '<path d="M12 4 6 16M12 4l6 12M8.5 12h7M5 20h14"/>',
  // --- 块结构类 ---
  paragraph: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>',
  // heading 图标数字采用 lucide 标准 path,保证 "H1~H6" 数字清晰可辨。
  heading1: '<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/>',
  heading2: '<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/>',
  heading3: '<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"/>',
  heading4: '<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17 10v3a1 1 0 0 0 1 1h3"/><path d="M21 10v8"/>',
  heading5: '<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17 13v-3h4"/><path d="M17 17.7c.4.2.8.3 1.3.3 1.5 0 2.7-1.1 2.7-2.5S19.8 13 18.3 13H17"/>',
  heading6: '<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M20 10c-2 2-3 3.5-3 6"/>',
  list: '<path d="M3 12h.01M3 18h.01M3 6h.01M8 12h13M8 18h13M8 6h13"/>',
  orderedList: '<path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
  taskList: '<path d="m3 17 2 2 4-4m-6-8 2 2 4-4M13 6h8M13 12h8M13 18h8"/>',
  quote: '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h1c1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>',
  hr: '<path d="M5 12h14"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10M15 10v10"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  video: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m10 8 6 4-6 4Z"/>',
  audio: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  math: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V8h6M9 12h5M13 12l4 5"/>',
  sigma: '<path d="M18 6V4H6l6 8-6 8h12v-2"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
  // --- 操作类 ---
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  redo: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  drag: '<circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/>',
  correct: '<path d="M20 6 9 17l-5-5"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  trash: '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>',
  preview: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  // translate:lucide "languages" 图形(双语言 A/文),表达全文翻译。
  translate: '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
  // layoutTemplate:lucide "layout-template" 图形(标题区 + 双子区),表达布局块。
  layoutTemplate: '<rect width="18" height="7" x="3" y="3" rx="1"/><rect width="9" height="7" x="3" y="14" rx="1"/><rect width="5" height="7" x="14" y="14" rx="1"/>',
  // sourceCode:lucide "file-code" 图形(文档 + 尖括号),表达整篇 Markdown 源码编辑。
  sourceCode: '<path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/><path d="M15.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/>',
  // ai:lucide "sparkles" 图形(主星 + 双小星),表达 AI 助手。
  ai: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>',
  // --- 表格操作类(插行/插列箭头 + 删行删列 X,语义与动作一一对应) ---
  insertRowAbove: '<path d="M4 20h16"/><path d="M12 20v-9"/><path d="m8 11 4-4 4 4"/>',
  insertRowBelow: '<path d="M4 4h16"/><path d="M12 4v9"/><path d="m8 13 4 4 4-4"/>',
  insertColumnLeft: '<path d="M4 4v16"/><path d="M4 12h9"/><path d="m13 8-4 4 4 4"/>',
  insertColumnRight: '<path d="M20 4v16"/><path d="M20 12H11"/><path d="m11 8 4 4-4 4"/>',
  deleteRow: '<path d="M4 12h16"/><path d="M9 9l6 6"/><path d="M15 9l-6 6"/>',
  deleteColumn: '<path d="M12 4v16"/><path d="M9 9l6 6"/><path d="M15 9l-6 6"/>',
  // mergeCells:两格箭头汇聚为一格(lucide combine 风格)。
  mergeCells: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 10h18M10 3v7"/><path d="m13 14 4 4m0-4-4 4"/>',
  // splitCells:一格拆分为两格(lucide split 风格)。
  splitCells: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 10h18M12 10v11"/><path d="m9 14-2 2 2 2"/>'
}, fu = (e) => e in Ja, gu = "paragraph", Ie = (e, t) => {
  const n = (t == null ? void 0 : t.size) ?? 18, o = (t == null ? void 0 : t.strokeWidth) ?? 2, r = (t == null ? void 0 : t.className) ?? "shared-icon", i = fu(e) ? e : gu, s = document.createElement("span");
  return s.className = r, s.setAttribute("aria-hidden", "true"), s.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${o}" stroke-linecap="round" stroke-linejoin="round">${Ja[i]}</svg>`, s;
}, Co = /* @__PURE__ */ new Set();
let Lo = !1;
const Wr = () => typeof document < "u", Qa = (e) => {
  Array.from(Co).forEach((n) => n(e));
}, bu = () => {
  Lo || !Wr() || (document.addEventListener("scroll", Qa, {
    capture: !0,
    passive: !0
  }), Lo = !0);
}, yu = () => {
  !Lo || !Wr() || (document.removeEventListener("scroll", Qa, !0), Lo = !1);
}, ku = (e) => {
  if (!Wr())
    return () => {
    };
  let t = !0;
  return Co.add(e), bu(), () => {
    t && (t = !1, Co.delete(e), Co.size === 0 && yu());
  };
}, Fo = ".zt-md-editor, .meditor-editor-area", $n = (e, t = Fo) => {
  if (!e)
    return null;
  if (!t)
    return e;
  try {
    return e.closest(t) ?? e;
  } catch {
    return e;
  }
}, wu = (e, t, n) => {
  const o = typeof window > "u" ? e.bottom : window.innerHeight, r = 0, i = o, s = e.top - r, a = i - e.bottom;
  return a < t && s > a ? "top" : "bottom";
}, Xe = (e, t) => {
  const n = t.getBoundingClientRect();
  return {
    anchorTopInContent: e.top - n.top + t.scrollTop,
    anchorBottomInContent: e.bottom - n.top + t.scrollTop,
    anchorLeftInContent: e.left - n.left + t.scrollLeft,
    anchorRightInContent: e.right - n.left + t.scrollLeft
  };
}, vu = (e) => {
  const { anchor: t, overlaySize: n, horizontalAlign: o = "start" } = e, r = t.anchorRightInContent ?? t.anchorLeftInContent;
  return o === "end" ? r - n.width : o === "center" ? t.anchorLeftInContent + (r - t.anchorLeftInContent - n.width) / 2 : t.anchorLeftInContent;
}, Cu = (e) => {
  const { wrapper: t, anchor: n, overlaySize: o, placement: r, offsetY: i, boundaryInset: s } = e, a = t.getBoundingClientRect(), l = t.scrollLeft + s, c = t.scrollLeft + t.clientWidth - o.width - s, d = vu(e), u = Math.min(Math.max(d, l), Math.max(l, c)), h = r === "top" ? n.anchorTopInContent - (o.height ?? 0) - i : n.anchorBottomInContent + i;
  return {
    left: a.left + u - t.scrollLeft,
    top: a.top + h - t.scrollTop
  };
}, el = (e, t) => {
  const n = Cu(e), o = t.getBoundingClientRect();
  return {
    left: n.left - o.left,
    top: n.top - o.top
  };
}, qn = (e) => {
  let t = 0, n = null, o = null, r = null, i = null;
  const s = () => {
    typeof window > "u" || (t && window.cancelAnimationFrame(t), t = window.requestAnimationFrame(() => {
      t = 0, e();
    }));
  }, a = () => {
    window.addEventListener("resize", s), o || (o = ku(s));
  }, l = () => {
    window.removeEventListener("resize", s), o == null || o(), o = null;
  }, c = (h) => {
    n !== h && (n && n.removeEventListener("scroll", s), n = h, n && n.addEventListener("scroll", s, { passive: !0 }));
  };
  return {
    schedule: s,
    bindGlobal: a,
    unbindGlobal: l,
    bindWrapper: c,
    bindElement: (h) => {
      i !== h && (i && (r == null || r.unobserve(i)), i = h, h && typeof ResizeObserver < "u" && (r || (r = new ResizeObserver(() => s())), r.observe(h)));
    },
    destroy: () => {
      typeof window < "u" && t && (window.cancelAnimationFrame(t), t = 0), l(), r == null || r.disconnect(), r = null, i = null, c(null);
    }
  };
}, dt = "meditor_ai_stream", Eu = Ke(dt, () => ({
  group: "block",
  atom: !0,
  selectable: !1,
  defining: !0,
  attrs: {
    /** 已生成的 Markdown 原文(增量累积)。 */
    text: { default: "" }
  },
  parseDOM: [
    {
      tag: `div[data-type="${dt}"]`
    }
  ],
  toDOM: (e) => [
    "div",
    {
      "data-type": dt,
      class: "zt-md-ai-stream",
      "data-text": String(e.attrs.text ?? "")
    }
  ],
  parseMarkdown: {
    // 临时节点永不从 Markdown 解析产生。
    match: () => !1,
    runner: () => {
    }
  },
  toMarkdown: {
    // 序列化输出空:流式中途的 onChange/存盘不落半成品语法。
    match: (e) => e.type.name === dt,
    runner: () => {
    }
  }
}));
class zu {
  constructor(t) {
    // 节点根容器。
    m(this, "dom");
    // 已生成文本容器。
    m(this, "textEl");
    this.dom = document.createElement("div"), this.dom.className = "zt-md-ai-stream", this.dom.dataset.type = dt, this.dom.contentEditable = "false";
    const n = document.createElement("div");
    n.className = "zt-md-ai-stream-header", n.appendChild(
      Ie("ai", { size: 14, strokeWidth: 2, className: "zt-md-ai-stream-icon" })
    );
    const o = document.createElement("span");
    o.className = "zt-md-ai-stream-label", o.textContent = t.aiStreamGeneratingLabel, n.appendChild(o);
    const r = document.createElement("span");
    r.className = "zt-md-ai-stream-pulse", n.appendChild(r), this.dom.appendChild(n), this.textEl = document.createElement("div"), this.textEl.className = "zt-md-ai-stream-text", this.dom.appendChild(this.textEl);
  }
  /** 保持流式块尾部在编辑区可视范围内(容器可滚时增量下滚)。 */
  scrollTailIntoView() {
    const t = this.dom.closest(Fo);
    if (!(t instanceof HTMLElement))
      return;
    const n = t.getBoundingClientRect(), r = this.dom.getBoundingClientRect().bottom - n.bottom;
    r > 8 && (t.scrollTop += r + 24);
  }
  update(t) {
    if (t.type.name !== dt)
      return !1;
    const n = String(t.attrs.text ?? "");
    return this.textEl.textContent !== n && (this.textEl.textContent = n, this.scrollTailIntoView()), !0;
  }
  stopEvent() {
    return !0;
  }
  ignoreMutation() {
    return !0;
  }
}
const Mu = (e) => (t, n) => new zu(e), Tu = (e) => {
  let t = null;
  const n = (r) => {
    r.setProps({ editable: () => !e.readOnly }), r.focus();
  }, o = (r) => {
    const i = e.getViewCtx(), s = t;
    if (t = null, !i || s === null)
      return;
    const { view: a } = i, l = a.state.doc.nodeAt(s);
    if (!l || l.type.name !== dt) {
      n(a);
      return;
    }
    const c = s + l.nodeSize, d = r.trim(), u = a.state.tr;
    let h = !1;
    if (d.length > 0) {
      const g = e.parseMarkdown(d);
      g && g.childCount > 0 && (u.replaceWith(s, c, g.content), h = !0);
    }
    h || u.delete(s, c);
    const p = Math.min(u.mapping.map(c), u.doc.content.size);
    u.setSelection(de.near(u.doc.resolve(Math.max(0, p)), -1)), a.dispatch(u.scrollIntoView()), n(a);
  };
  return {
    isStreaming: () => t !== null,
    begin: () => {
      const r = e.getViewCtx();
      if (!r || t !== null)
        return !1;
      const { view: i } = r, s = i.state.schema.nodes[dt];
      if (!s)
        return !1;
      i.setProps({ editable: () => !1 });
      const a = i.state.doc;
      let l;
      try {
        const c = i.state.selection.$from, d = c.depth >= 1 ? c.before(1) : c.pos, u = a.nodeAt(d);
        l = d + (u ? u.nodeSize : 0);
      } catch {
        l = a.content.size;
      }
      return (l < 0 || l > a.content.size) && (l = a.content.size), i.dispatch(
        i.state.tr.insert(l, s.create({ text: "" })).scrollIntoView()
      ), t = l, !0;
    },
    append: (r) => {
      if (!r || t === null)
        return;
      const i = e.getViewCtx();
      if (!i)
        return;
      const { view: s } = i, a = s.state.doc.nodeAt(t);
      !a || a.type.name !== dt || s.dispatch(
        s.state.tr.setNodeAttribute(t, "text", String(a.attrs.text ?? "") + r)
      );
    },
    end: (r) => o(r),
    cancel: (r) => o(r),
    fail: () => o("")
  };
}, xu = "heading", Su = (e) => {
  const n = e.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s+/g, "-");
  return n.length > 0 ? n : "heading";
}, jn = (e) => {
  const t = /* @__PURE__ */ new Map(), n = [];
  return e.descendants((o, r) => {
    if (o.type.name !== xu)
      return !0;
    const i = o.textContent.trim(), s = Su(i), a = t.get(s) ?? 0;
    return t.set(s, a + 1), n.push({
      id: a === 0 ? s : `${s}-${a}`,
      level: Math.min(6, Math.max(1, Number(o.attrs.level) || 1)),
      text: i,
      pos: r
    }), !0;
  }), n;
}, Qi = (e) => {
  const t = jn(e);
  if (t.length === 0)
    return Le.empty;
  const n = [];
  for (const o of t) {
    const r = e.nodeAt(o.pos);
    r && n.push(
      jt.node(o.pos, o.pos + r.nodeSize, {
        "data-anchor-id": o.id
      })
    );
  }
  return Le.create(e, n);
}, es = new ke("zt-md-heading-anchor"), Lu = ue(
  () => new ye({
    key: es,
    state: {
      init: (e, t) => Qi(t.doc),
      apply: (e, t) => e.docChanged ? Qi(e.doc) : t
    },
    props: {
      decorations: (e) => es.getState(e)
    }
  })
), tl = (e, t) => {
  const o = jn(e.state.doc).find((s) => s.id === t);
  if (!o)
    return !1;
  const r = e.nodeDOM(o.pos), i = r instanceof Element ? r : (r == null ? void 0 : r.parentElement) ?? null;
  return i ? (i.scrollIntoView({ block: "start", behavior: "auto" }), !0) : !1;
}, nl = /* @__PURE__ */ new Set(["http:", "https:", "mailto:", "tel:"]), Au = /* @__PURE__ */ new Set(["data:"]), Iu = /[\x00-\x20\x7f]+/g, Ru = /^([a-z][a-z\d+\-.]*:)/i, Nu = /[<>"'`]/, Pu = /[\x00-\x1f\x7f]/, Du = /* @__PURE__ */ new Set(["src", "alt", "title", "style"]), ol = (e, t) => {
  var i, s;
  if (typeof e != "string")
    return "";
  const n = e.trim();
  if (!n || Nu.test(n) || Pu.test(n))
    return "";
  const o = n.replace(Iu, "");
  if (o.startsWith("//"))
    return "";
  const r = ((s = (i = o.match(Ru)) == null ? void 0 : i[1]) == null ? void 0 : s.toLowerCase()) ?? "";
  if (!r)
    return n;
  if (!t.has(r))
    return "";
  try {
    return new URL(n).toString();
  } catch {
    return "";
  }
}, Kn = (e) => ol(e, nl), un = (e, t = []) => {
  const n = /* @__PURE__ */ new Set([
    ...nl,
    ...Au,
    ...t.map((o) => o.trim().toLowerCase())
  ]);
  return ol(e, n);
}, ts = (e, t, n = []) => {
  if (typeof e != "string")
    return null;
  const o = e.trim();
  if (!o)
    return null;
  const r = new DOMParser().parseFromString(o, "text/html");
  let i = null;
  for (const a of Array.from(r.body.childNodes))
    if (!(a.nodeType === Node.TEXT_NODE && !(a.textContent ?? "").trim())) {
      if (a instanceof HTMLImageElement && i === null) {
        i = a;
        continue;
      }
      return null;
    }
  if (!i || i.tagName.toLowerCase() !== "img")
    return null;
  for (const a of Array.from(i.attributes))
    if (!Du.has(a.name.toLowerCase()))
      return null;
  const s = un(i.getAttribute("src") ?? "", n);
  return s ? {
    src: s,
    alt: i.getAttribute("alt") ?? "",
    title: i.getAttribute("title") ?? "",
    style: t(i.getAttribute("style") ?? "")
  } : null;
}, rl = (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return null;
  const n = t.closest("a[href]");
  return n instanceof HTMLAnchorElement ? n : null;
}, Bu = (e) => (e == null ? void 0 : e.type.name) === "image", ns = (e, t, n) => {
  const o = rl(e);
  if (!o) return !1;
  const r = o.getAttribute("href") ?? "";
  if (r.startsWith("#")) {
    const s = decodeURIComponent(r.slice(1));
    return !s || !n ? !1 : (e.preventDefault(), e.stopPropagation(), tl(n, s));
  }
  const i = Kn(r);
  return !i || t || !e.ctrlKey ? !1 : (e.preventDefault(), e.stopPropagation(), window.open(i, "_blank", "noopener,noreferrer"), !0);
}, os = (e, t) => {
  const n = rl(e);
  return !t || !n || (n.getAttribute("href") ?? "").startsWith("#") ? !1 : (e.preventDefault(), e.stopPropagation(), !0);
}, Eo = (e, t, n, o) => {
  try {
    return t(e.cut(n, o));
  } catch {
    return "";
  }
}, rs = (e, t, n, o) => {
  let r = null;
  for (const u of n)
    if (u.start <= o) r = u;
    else break;
  if (!r) return null;
  const i = n.indexOf(r), s = i + 1 < n.length ? n[i + 1] : void 0, a = s ? s.pos : e.content.size;
  if (o <= r.start) return r.pos;
  if (o >= r.end) return Math.max(r.pos, a - 1);
  const l = o - r.start;
  let c = r.pos, d = Math.max(r.pos, a - 1);
  for (; c < d - 1; ) {
    const u = c + d >> 1;
    Eo(e, t, r.pos, u).length <= l ? c = u : d = u;
  }
  return c;
}, is = (e, t, n, o) => {
  let r = null;
  for (const c of n)
    if (c.pos <= o) r = c;
    else break;
  if (!r) return null;
  const i = n.indexOf(r), s = i + 1 < n.length ? n[i + 1] : void 0, a = s ? s.pos : e.content.size;
  if (o <= r.pos) return r.start;
  if (o >= a) return r.end;
  let l = 0;
  try {
    l = t(e.cut(r.pos, o)).length;
  } catch {
    l = 0;
  }
  return Math.min(r.end, r.start + l);
}, _u = (e, t) => {
  if ((e.type === "heading" || t.type === "heading") && !(e.type === "html" || t.type === "html"))
    return 0;
}, It = new ke("zt-md-remote-selection"), Ou = ue(
  () => new ye({
    key: It,
    state: {
      init: () => Le.empty,
      apply: (e, t) => {
        const n = e.getMeta(It);
        return n || (e.docChanged ? t.map(e.mapping, e.doc) : t);
      }
    },
    props: {
      decorations: (e) => It.getState(e)
    },
    view: () => ({
      // meditor 持焦即清(高亮只应出现在未聚焦侧);点击/mousedown 会先经
      // setSelection 触发 update。集为空时跳过,天然无 dispatch 循环。
      update: (e) => {
        if (!e.hasFocus) return;
        const t = It.getState(e.state);
        t && t.find().length > 0 && e.dispatch(e.state.tr.setMeta(It, Le.empty));
      }
    })
  })
), ie = (e, t, n) => {
  if (n != null) {
    if (Array.isArray(n)) {
      n.forEach((o, r) => {
        o != null && e.push({ name: `${t}-${r}`, plugin: o });
      });
      return;
    }
    e.push({ name: t, plugin: n });
  }
}, ss = (e, t = {}) => {
  const n = [], o = t.includeRuntime ?? !0;
  return ie(n, "listener", e.listener), e.slash && ie(n, "slash", e.slash), e.emojiAutocomplete && ie(n, "emoji-autocomplete", e.emojiAutocomplete), e.smartPunctuation && ie(n, "smart-punctuation", e.smartPunctuation), ie(n, "commonmark", e.commonmark), ie(n, "color-marks", e.colorMarks), ie(n, "inline-ext-marks", e.inlineExtMarks), ie(n, "inline-ext-input-rules", e.inlineExtInputRules), ie(n, "callout", e.callout), ie(n, "toggle", e.toggle), ie(n, "jsondata-view", e.jsondataView), ie(n, "media-embed", e.mediaEmbed), ie(n, "task-list-transform-keymap", e.taskListTransformKeymap), ie(
    n,
    "inline-code-boundary-navigation",
    e.inlineCodeBoundaryNavigation
  ), ie(n, "gfm", e.gfm), ie(n, "history", e.history), ie(n, "editor-search", e.editorSearch), ie(n, "code-block-prism", e.codeBlockPrism), ie(n, "table-html-parse", e.tableHtmlParse), o && (ie(n, "clipboard", e.clipboard), ie(n, "indent", e.indent)), ie(n, "image-delete-selection", e.imageDeleteSelection), ie(n, "image-paste", e.imagePaste), ie(n, "image-drop", e.imageDrop), ie(n, "table-arrow-entry", e.tableArrowEntry), ie(n, "layout-block-behavior", e.layoutBlockBehavior), ie(n, "layout-block-effect", e.layoutBlockEffect), ie(n, "block-boundary-navigation", e.blockBoundaryNavigation), ie(
    n,
    "heading-backspace-empty-paragraph",
    e.headingBackspaceEmptyParagraph
  ), ie(n, "math-backspace-entry", e.mathBackspaceEntry), ie(n, "blockquote-backspace-lift", e.blockquoteBackspaceLift), ie(n, "table-focus-actions", e.tableFocusActions), ie(n, "selection-tooltip", e.selectionTooltip), ie(n, "gap-cursor", e.gapCursor), ie(n, "drop-cursor", e.dropCursor), ie(n, "trailing-paragraph", e.trailingParagraph), ie(n, "math", e.math), ie(n, "math-inline-edit", e.mathInlineEdit), ie(n, "math-inline-arrow-navigation", e.mathInlineArrowNavigation), ie(n, "mtable", e.mtable), ie(n, "layout-block", e.layoutBlock), ie(n, "task-list-toggle", e.taskListToggle), ie(n, "task-list-input-rule", e.taskListInputRule), ie(n, "chinese-symbols-input-rule", e.chineseSymbolsInputRule), ie(n, "tab-space-indent", e.tabSpaceIndent), ie(n, "code-block-mod-a-select", e.codeBlockModASelect), ie(n, "cursor-navigate", e.cursorNavigate), ie(n, "remote-selection-highlight", e.remoteSelectionHighlight), ie(n, "heading-anchor", e.headingAnchor), e.headingsChange && ie(n, "headings-change", e.headingsChange), ie(n, "toc", e.toc), ie(n, "ai-stream", e.aiStream), ie(n, "footnote", e.footnote), ie(n, "front-matter", e.frontMatter), e.autoPair && ie(n, "auto-pair", e.autoPair), ie(n, "writing-mode", e.writingMode), e.blockHandle && ie(n, "block-handle", e.blockHandle), e.toolbar && ie(n, "toolbar", e.toolbar), n;
}, Hu = {
  placeholder: "",
  initError: "Editor initialization failed. Please refresh the page and try again.",
  editorAriaLabel: "Markdown editor",
  searchPanelAriaLabel: "Find and replace in document",
  searchInputPlaceholder: "Find in document",
  searchReplaceInputPlaceholder: "Replace with",
  searchPreviousAriaLabel: "Previous match",
  searchNextAriaLabel: "Next match",
  searchCloseAriaLabel: "Close search",
  searchCaseSensitiveLabel: "Match case",
  searchWholeWordLabel: "Match whole word",
  searchRegexpLabel: "Use regular expression",
  searchReplaceLabel: "Replace",
  searchReplaceAllLabel: "Replace all",
  searchInvalidRegexp: "Invalid regular expression",
  mathBlockSourceAriaLabel: "Math block source",
  mathBlockCopyAriaLabel: "Copy math source",
  mathBlockDeleteAriaLabel: "Delete math block",
  imageDeleteAriaLabel: "Delete image",
  tableDeleteAriaLabel: "Delete table",
  tableMoreAriaLabel: "More table actions",
  tableAlignLeftAriaLabel: "Align current column left",
  tableAlignCenterAriaLabel: "Align current column center",
  tableAlignRightAriaLabel: "Align current column right",
  tableInsertRowAboveLabel: "Insert row above",
  tableInsertRowBelowLabel: "Insert row below",
  tableInsertColumnLeftLabel: "Insert column left",
  tableInsertColumnRightLabel: "Insert column right",
  tableDeleteRowLabel: "Delete row",
  tableDeleteColumnLabel: "Delete column",
  tableMergeCellsLabel: "Merge cells",
  tableSplitCellLabel: "Split cell",
  mathRenderError: "Formula rendering failed. Please check the formula syntax.",
  imageUploadDialogTitle: "Insert image",
  imageUploadDropLabel: "Drop an image here, or choose a file",
  imageUploadPickFileLabel: "Choose file",
  imageUploadFileTab: "Upload file",
  imageUploadUrlTab: "Image URL",
  imageUploadUrlPlaceholder: "Paste image URL",
  imageUploadInsertUrlLabel: "Insert URL",
  imageUploadConfirmLabel: "Insert image",
  imageUploadAltLabel: "Alternative text (optional)",
  imageUploadAltPlaceholder: "Describe the image",
  imageUploadUploadingLabel: "Uploading...",
  imageUploadInsertingLabel: "Inserting...",
  imageUploadCancelLabel: "Cancel",
  imageUploadLoadFailed: "Image failed to load",
  imageUploadReselectHint: "Click or drag to reselect",
  imageUploadSupportsAndMax: "Supports PNG, JPG, GIF, WebP, SVG, and more, max {size}",
  imageUploadFileTooLarge: "The image file is too large.",
  imageUploadFileSizeExceeded: "Image size must not exceed {size}",
  imageUploadInvalidType: "Please choose an image file.",
  imageUploadFailed: "Image upload failed. Please try again.",
  imageUploadFileReadFailed: "File read failed. Please try again.",
  imageUploadInvalidUrl: "Please enter a valid image URL.",
  imageUploadUrlRequired: "Please enter an image URL.",
  imageUploadSelectOrEnterImage: "Please select an image or enter an image URL.",
  imageUploadUploadingWait: "Image is uploading, please wait.",
  imagePreviewDialogTitle: "Image preview",
  imagePreviewCloseAriaLabel: "Close preview",
  imagePreviewLoadFailed: "Failed to load the image.",
  imagePreviewEditDisabledHint: "Cross-origin image: preview only, editing is unavailable.",
  imagePreviewExportFailed: "Failed to export: cross-origin image pixels are not accessible.",
  imagePreviewZoomInAriaLabel: "Zoom in",
  imagePreviewZoomOutAriaLabel: "Zoom out",
  imagePreviewZoomActualAriaLabel: "Actual size",
  imagePreviewZoomFitAriaLabel: "Fit to window",
  imagePreviewRotateLeftAriaLabel: "Rotate left",
  imagePreviewRotateRightAriaLabel: "Rotate right",
  imagePreviewPanAriaLabel: "Pan canvas",
  imagePreviewCropAriaLabel: "Crop",
  imagePreviewCropConfirmAriaLabel: "Apply crop",
  imagePreviewCropCancelAriaLabel: "Cancel crop",
  imagePreviewRectAriaLabel: "Rectangle",
  imagePreviewCircleAriaLabel: "Circle",
  imagePreviewLineAriaLabel: "Line",
  imagePreviewArrowAriaLabel: "Arrow",
  imagePreviewBrushAriaLabel: "Brush",
  imagePreviewMosaicAriaLabel: "Mosaic",
  imagePreviewColorLabel: "Annotation color",
  imagePreviewColorCustomLabel: "Custom color",
  imagePreviewStrokeThinAriaLabel: "Thin stroke",
  imagePreviewStrokeMediumAriaLabel: "Medium stroke",
  imagePreviewStrokeThickAriaLabel: "Thick stroke",
  imagePreviewUndoAriaLabel: "Undo",
  imagePreviewResetAriaLabel: "Reset image",
  imagePreviewCancelLabel: "Cancel",
  imagePreviewConfirmLabel: "Apply",
  selectionTooltipStrongTitle: "Bold",
  selectionTooltipEmTitle: "Italic",
  selectionTooltipStrikeTitle: "Strikethrough",
  selectionTooltipInlineCodeTitle: "Inline code",
  selectionTooltipLinkTitle: "Link",
  selectionTooltipTransformLabel: "Turn into",
  selectionTooltipTransformParagraphLabel: "Paragraph",
  selectionTooltipTransformHeading1Label: "Heading 1",
  selectionTooltipTransformHeading2Label: "Heading 2",
  selectionTooltipTransformHeading3Label: "Heading 3",
  selectionTooltipTransformHeading4Label: "Heading 4",
  selectionTooltipTransformHeading5Label: "Heading 5",
  selectionTooltipTransformHeading6Label: "Heading 6",
  selectionTooltipTransformBulletListLabel: "Bullet list",
  selectionTooltipTransformOrderedListLabel: "Ordered list",
  selectionTooltipTransformTaskListLabel: "Task list",
  selectionTooltipTransformBlockquoteLabel: "Blockquote",
  selectionTooltipTransformCodeBlockLabel: "Code block",
  selectionLinkInputPlaceholder: "Type or paste a link",
  selectionLinkSaveAriaLabel: "Save link",
  selectionLinkRemoveAriaLabel: "Remove link",
  selectionTooltipColorTitle: "Text color",
  selectionTooltipHighlightTitle: "Highlight",
  colorDefaultLabel: "Default",
  colorNameGray: "Gray",
  colorNameBrown: "Brown",
  colorNameOrange: "Orange",
  colorNameYellow: "Yellow",
  colorNameGreen: "Green",
  colorNameBlue: "Blue",
  colorNamePurple: "Purple",
  colorNamePink: "Pink",
  colorNameRed: "Red",
  imageCaptionPlaceholder: "Add a caption...",
  imageCaptionAriaLabel: "Image caption",
  calloutKindNote: "Note",
  calloutKindTip: "Tip",
  calloutKindImportant: "Important",
  calloutKindWarning: "Warning",
  calloutKindCaution: "Caution",
  calloutKindButtonAriaLabel: "Change callout type",
  toggleSummaryPlaceholder: "Summary...",
  toggleSummaryAriaLabel: "Toggle summary",
  mediaEmbedVideoTitle: "Insert video",
  mediaEmbedAudioTitle: "Insert audio",
  mediaEmbedBookmarkTitle: "Insert bookmark",
  mediaEmbedEmbedTitle: "Insert embed",
  mediaEmbedUrlPlaceholder: "Paste video/audio/page URL",
  mediaEmbedConfirmLabel: "OK",
  mediaEmbedEditVideoTitle: "Edit video",
  mediaEmbedEditAudioTitle: "Edit audio",
  mediaEmbedEditBookmarkTitle: "Edit bookmark",
  mediaEmbedEditEmbedTitle: "Edit embed",
  mediaEmbedSaveLabel: "Save",
  mediaEmbedEditAriaLabel: "Edit media URL",
  mediaEmbedDeleteAriaLabel: "Delete media block",
  mediaEmbedLoadFailed: "Media failed to load",
  mediaEmbedUrlInvalid: "Invalid URL, please check the address",
  codeBlockLanguageSearchPlaceholder: "Search languages",
  codeBlockLanguagePlainText: "text",
  codeBlockCopyAriaLabel: "Copy code block",
  codeBlockPreviewAriaLabel: "Preview code block",
  codeBlockSourceAriaLabel: "View code block source",
  codeBlockDeleteAriaLabel: "Delete code block",
  toolbarUndoTitle: "Undo",
  toolbarRedoTitle: "Redo",
  toolbarClearFormatTitle: "Clear formatting",
  toolbarBlockMenuTitle: "Insert",
  toolbarSearchTitle: "Search",
  toolbarTranslateTitle: "Translate",
  toolbarTranslateExitTitle: "Exit translation",
  toolbarTranslateFailedTitle: "Translation failed. Please retry",
  toolbarLayoutModeTitle: "Layout mode",
  toolbarLayoutModeExitTitle: "Exit layout mode",
  toolbarSourceModeTitle: "Source mode",
  toolbarSourceModeExitTitle: "Exit source mode",
  toolbarOutlineTitle: "Outline",
  toolbarOutlineExitTitle: "Close outline",
  outlinePanelTitle: "Outline",
  outlineEmpty: "No headings",
  toolbarAiTitle: "AI assistant",
  toolbarAiExitTitle: "Close AI assistant",
  aiPanelInputPlaceholder: "Describe what to generate. Enter to send, Shift+Enter for newline",
  aiPanelGeneratingPlaceholder: "Generating… content streams into the document",
  aiPanelSendTitle: "Generate",
  aiPanelStopTitle: "Stop generating",
  aiPanelModelTitle: "Choose model",
  aiPanelNoModels: "No models configured",
  aiPanelRequestFailed: "Request failed. Check model settings or network",
  aiStreamGeneratingLabel: "AI is generating…",
  layoutBlockLinesLabel: "lines",
  layoutBlockDeleteAriaLabel: "Delete layout block",
  layoutBlockEditorAriaLabel: "Layout block source",
  layoutBlockRenderTitle: "Layout render card",
  toolbarBlockTransformParagraphLabel: "Text",
  toolbarBulletListTitle: "Bullet list",
  toolbarOrderedListTitle: "Ordered list",
  toolbarTaskListTitle: "Task list",
  toolbarBlockquoteTitle: "Blockquote",
  toolbarCodeBlockTitle: "Code block",
  toolbarHrTitle: "Horizontal rule",
  toolbarTableTitle: "Table",
  toolbarCalloutTitle: "Callout",
  toolbarToggleTitle: "Toggle",
  toolbarCsvTableTitle: "CSV table",
  toolbarDatabaseTitle: "Database",
  toolbarVideoTitle: "Video",
  toolbarAudioTitle: "Audio",
  toolbarBookmarkTitle: "Bookmark",
  toolbarEmbedTitle: "Embed",
  toolbarImageTitle: "Image",
  toolbarInlineMathTitle: "Inline math",
  toolbarMathBlockTitle: "Math block",
  toolbarEmojiTitle: "Emoji",
  emojiPickerTitle: "Pick an emoji",
  emojiPickerSearchPlaceholder: "Search emojis (zh / pinyin / en)",
  emojiPickerNoResults: "No matching emoji",
  emojiPickerCategorySmileys: "Smileys & Emotion",
  emojiPickerCategoryGestures: "People & Gestures",
  emojiPickerCategoryAnimals: "Animals & Nature",
  emojiPickerCategoryFood: "Food & Drink",
  emojiPickerCategoryActivities: "Activities & Sports",
  emojiPickerCategoryTravel: "Travel & Places",
  emojiPickerCategoryObjects: "Objects",
  emojiPickerCategorySymbols: "Symbols",
  selectionLinkInvalidUrl: "Invalid link URL",
  blockHandleInsertLabel: "Insert block here",
  blockHandleDragLabel: "Drag to move block; Shift+click to multi-select",
  historyPanelTitle: "Version history",
  historyPanelEmpty: "No versions yet",
  historyPanelRestore: "Restore",
  historyPanelDelete: "Delete",
  historyPanelSave: "Save version",
  historyPanelRestoreConfirm: "Restore this version? Current content will be saved first.",
  historyPanelDeleteConfirm: "Delete this version? This cannot be undone.",
  historyOriginAuto: "Auto",
  historyOriginManual: "Manual",
  historyOriginRestore: "Restored",
  historyOperationFailed: "Operation failed. Please try again.",
  commentsPanelTitle: "Comments",
  commentsPanelPlaceholder: "Write a comment…",
  commentsPanelAdd: "Add",
  commentsPanelResolve: "Resolve",
  commentsPanelReopen: "Reopen",
  commentsPanelDelete: "Delete",
  commentsPanelStale: "Original text not found",
  commentsPanelEmpty: "Select text and add your first comment",
  commentsPanelSelectFirst: "Select some text first to anchor a comment.",
  commentsPanelStaleAnchor: "Comment anchor is no longer available.",
  collabStatusConnecting: "Connecting",
  collabStatusConnected: "Connected",
  collabStatusDisconnected: "Disconnected",
  tocTitle: "Table of Contents",
  tocEmpty: "No headings yet",
  codeBlockMermaidRenderError: "Diagram render failed",
  selectionTooltipUnderlineTitle: "Underline",
  selectionTooltipSubscriptTitle: "Subscript",
  selectionTooltipSuperscriptTitle: "Superscript",
  toolbarUnderlineTitle: "Underline (Ctrl+U)",
  toolbarSubscriptTitle: "Subscript",
  toolbarSuperscriptTitle: "Superscript"
}, Fu = {
  placeholder: "",
  initError: "编辑器初始化失败，请刷新页面后重试。",
  editorAriaLabel: "Markdown 编辑器",
  searchPanelAriaLabel: "文档搜索与替换",
  searchInputPlaceholder: "搜索文档",
  searchReplaceInputPlaceholder: "替换为",
  searchPreviousAriaLabel: "上一个匹配项",
  searchNextAriaLabel: "下一个匹配项",
  searchCloseAriaLabel: "关闭搜索",
  searchCaseSensitiveLabel: "区分大小写",
  searchWholeWordLabel: "全词匹配",
  searchRegexpLabel: "使用正则表达式",
  searchReplaceLabel: "替换",
  searchReplaceAllLabel: "全部替换",
  searchInvalidRegexp: "正则表达式无效",
  mathBlockSourceAriaLabel: "公式块源码",
  mathBlockCopyAriaLabel: "复制公式源码",
  mathBlockDeleteAriaLabel: "删除公式块",
  imageDeleteAriaLabel: "删除图片",
  tableDeleteAriaLabel: "删除表格",
  tableMoreAriaLabel: "更多表格操作",
  tableAlignLeftAriaLabel: "当前列左对齐",
  tableAlignCenterAriaLabel: "当前列居中对齐",
  tableAlignRightAriaLabel: "当前列右对齐",
  tableInsertRowAboveLabel: "上方插入行",
  tableInsertRowBelowLabel: "下方插入行",
  tableInsertColumnLeftLabel: "左侧插入列",
  tableInsertColumnRightLabel: "右侧插入列",
  tableDeleteRowLabel: "删除该行",
  tableDeleteColumnLabel: "删除该列",
  tableMergeCellsLabel: "合并单元格",
  tableSplitCellLabel: "拆分单元格",
  mathRenderError: "公式渲染失败，请检查公式语法。",
  imageUploadDialogTitle: "插入图片",
  imageUploadDropLabel: "拖拽图片到这里，或选择文件",
  imageUploadPickFileLabel: "选择文件",
  imageUploadFileTab: "上传文件",
  imageUploadUrlTab: "图片链接",
  imageUploadUrlPlaceholder: "粘贴图片链接",
  imageUploadInsertUrlLabel: "插入链接",
  imageUploadConfirmLabel: "插入图片",
  imageUploadAltLabel: "替代文本（可选）",
  imageUploadAltPlaceholder: "描述图片内容",
  imageUploadUploadingLabel: "上传中...",
  imageUploadInsertingLabel: "正在插入...",
  imageUploadCancelLabel: "取消",
  imageUploadLoadFailed: "图片加载失败",
  imageUploadReselectHint: "点击或拖拽重新选择",
  imageUploadSupportsAndMax: "支持 PNG、JPG、GIF、WebP、SVG 等，最大 {size}",
  imageUploadFileTooLarge: "图片文件过大。",
  imageUploadFileSizeExceeded: "图片大小不能超过 {size}",
  imageUploadInvalidType: "请选择图片文件。",
  imageUploadFailed: "图片上传失败，请重试。",
  imageUploadFileReadFailed: "文件读取失败，请重试。",
  imageUploadInvalidUrl: "请输入有效的图片链接。",
  imageUploadUrlRequired: "请输入图片链接。",
  imageUploadSelectOrEnterImage: "请选择图片或输入图片链接。",
  imageUploadUploadingWait: "图片正在上传，请稍候。",
  imagePreviewDialogTitle: "图片预览",
  imagePreviewCloseAriaLabel: "关闭预览",
  imagePreviewLoadFailed: "图片加载失败，无法预览。",
  imagePreviewEditDisabledHint: "跨域图片仅支持预览，无法编辑。",
  imagePreviewExportFailed: "图片处理失败：跨域图片无法读取像素。",
  imagePreviewZoomInAriaLabel: "放大",
  imagePreviewZoomOutAriaLabel: "缩小",
  imagePreviewZoomActualAriaLabel: "实际大小",
  imagePreviewZoomFitAriaLabel: "适应窗口",
  imagePreviewRotateLeftAriaLabel: "向左旋转",
  imagePreviewRotateRightAriaLabel: "向右旋转",
  imagePreviewPanAriaLabel: "移动画布",
  imagePreviewCropAriaLabel: "裁切",
  imagePreviewCropConfirmAriaLabel: "确认裁切",
  imagePreviewCropCancelAriaLabel: "取消裁切",
  imagePreviewRectAriaLabel: "矩形标注",
  imagePreviewCircleAriaLabel: "圆形标注",
  imagePreviewLineAriaLabel: "直线标注",
  imagePreviewArrowAriaLabel: "箭头标注",
  imagePreviewBrushAriaLabel: "画笔标注",
  imagePreviewMosaicAriaLabel: "马赛克",
  imagePreviewColorLabel: "标注颜色",
  imagePreviewColorCustomLabel: "自定义颜色",
  imagePreviewStrokeThinAriaLabel: "细线",
  imagePreviewStrokeMediumAriaLabel: "中等",
  imagePreviewStrokeThickAriaLabel: "粗线",
  imagePreviewUndoAriaLabel: "撤销",
  imagePreviewResetAriaLabel: "还原图片",
  imagePreviewCancelLabel: "取消",
  imagePreviewConfirmLabel: "应用图片",
  selectionTooltipStrongTitle: "加粗",
  selectionTooltipEmTitle: "斜体",
  selectionTooltipStrikeTitle: "删除线",
  selectionTooltipInlineCodeTitle: "行内代码",
  selectionTooltipLinkTitle: "链接",
  selectionTooltipTransformLabel: "转换为",
  selectionTooltipTransformParagraphLabel: "段落",
  selectionTooltipTransformHeading1Label: "标题 1",
  selectionTooltipTransformHeading2Label: "标题 2",
  selectionTooltipTransformHeading3Label: "标题 3",
  selectionTooltipTransformHeading4Label: "标题 4",
  selectionTooltipTransformHeading5Label: "标题 5",
  selectionTooltipTransformHeading6Label: "标题 6",
  selectionTooltipTransformBulletListLabel: "无序列表",
  selectionTooltipTransformOrderedListLabel: "有序列表",
  selectionTooltipTransformTaskListLabel: "任务列表",
  selectionTooltipTransformBlockquoteLabel: "引用块",
  selectionTooltipTransformCodeBlockLabel: "代码块",
  selectionLinkInputPlaceholder: "输入或粘贴链接",
  selectionLinkSaveAriaLabel: "保存链接",
  selectionLinkRemoveAriaLabel: "移除链接",
  selectionTooltipColorTitle: "文字颜色",
  selectionTooltipHighlightTitle: "高亮颜色",
  colorDefaultLabel: "恢复默认",
  colorNameGray: "灰色",
  colorNameBrown: "棕色",
  colorNameOrange: "橙色",
  colorNameYellow: "黄色",
  colorNameGreen: "绿色",
  colorNameBlue: "蓝色",
  colorNamePurple: "紫色",
  colorNamePink: "粉色",
  colorNameRed: "红色",
  imageCaptionPlaceholder: "添加图片说明...",
  imageCaptionAriaLabel: "图片说明",
  calloutKindNote: "注意",
  calloutKindTip: "提示",
  calloutKindImportant: "重要",
  calloutKindWarning: "警告",
  calloutKindCaution: "危险",
  calloutKindButtonAriaLabel: "切换标注类型",
  toggleSummaryPlaceholder: "输入折叠标题...",
  toggleSummaryAriaLabel: "折叠标题",
  mediaEmbedVideoTitle: "插入视频",
  mediaEmbedAudioTitle: "插入音频",
  mediaEmbedBookmarkTitle: "插入网页书签",
  mediaEmbedEmbedTitle: "插入第三方内嵌",
  mediaEmbedUrlPlaceholder: "粘贴视频/音频/网页地址",
  mediaEmbedConfirmLabel: "确定",
  mediaEmbedEditVideoTitle: "编辑视频",
  mediaEmbedEditAudioTitle: "编辑音频",
  mediaEmbedEditBookmarkTitle: "编辑网页书签",
  mediaEmbedEditEmbedTitle: "编辑第三方内嵌",
  mediaEmbedSaveLabel: "保存",
  mediaEmbedEditAriaLabel: "编辑媒体地址",
  mediaEmbedDeleteAriaLabel: "删除媒体块",
  mediaEmbedLoadFailed: "媒体加载失败",
  mediaEmbedUrlInvalid: "链接无效，请检查地址",
  codeBlockLanguageSearchPlaceholder: "搜索语言",
  codeBlockLanguagePlainText: "text",
  codeBlockCopyAriaLabel: "复制代码块",
  codeBlockPreviewAriaLabel: "预览代码块",
  codeBlockSourceAriaLabel: "查看代码块源码",
  codeBlockDeleteAriaLabel: "删除代码块",
  toolbarUndoTitle: "撤销",
  toolbarRedoTitle: "重做",
  toolbarClearFormatTitle: "清除格式",
  toolbarBlockMenuTitle: "插入",
  toolbarSearchTitle: "搜索",
  toolbarTranslateTitle: "翻译",
  toolbarTranslateExitTitle: "退出翻译",
  toolbarTranslateFailedTitle: "翻译失败，请重试",
  toolbarLayoutModeTitle: "布局模式",
  toolbarLayoutModeExitTitle: "退出布局模式",
  toolbarSourceModeTitle: "源码模式",
  toolbarSourceModeExitTitle: "退出源码模式",
  toolbarOutlineTitle: "大纲",
  toolbarOutlineExitTitle: "关闭大纲",
  outlinePanelTitle: "大纲",
  outlineEmpty: "暂无标题",
  toolbarAiTitle: "AI 助手",
  toolbarAiExitTitle: "关闭 AI 助手",
  aiPanelInputPlaceholder: "向 AI 描述要生成的内容，Enter 发送，Shift+Enter 换行",
  aiPanelGeneratingPlaceholder: "正在生成，内容将实时插入文档…",
  aiPanelSendTitle: "生成",
  aiPanelStopTitle: "停止生成",
  aiPanelModelTitle: "选择模型",
  aiPanelNoModels: "未配置模型",
  aiPanelRequestFailed: "请求失败，请检查模型配置或网络",
  aiStreamGeneratingLabel: "AI 正在生成…",
  layoutBlockLinesLabel: "行",
  layoutBlockDeleteAriaLabel: "删除布局块",
  layoutBlockEditorAriaLabel: "布局块源码",
  layoutBlockRenderTitle: "布局展示卡",
  toolbarBlockTransformParagraphLabel: "正文",
  toolbarBulletListTitle: "无序列表",
  toolbarOrderedListTitle: "有序列表",
  toolbarTaskListTitle: "任务列表",
  toolbarBlockquoteTitle: "引用",
  toolbarCodeBlockTitle: "代码块",
  toolbarHrTitle: "分割线",
  toolbarTableTitle: "表格",
  toolbarCalloutTitle: "标注块",
  toolbarToggleTitle: "折叠块",
  toolbarCsvTableTitle: "CSV数据",
  toolbarDatabaseTitle: "Json数据",
  toolbarVideoTitle: "视频",
  toolbarAudioTitle: "音频",
  toolbarBookmarkTitle: "网页书签",
  toolbarEmbedTitle: "第三方内嵌",
  toolbarImageTitle: "图片",
  toolbarInlineMathTitle: "行内公式",
  toolbarMathBlockTitle: "公式块",
  toolbarEmojiTitle: "Emoji",
  emojiPickerTitle: "选择 Emoji 表情",
  emojiPickerSearchPlaceholder: "搜索表情(中文 / 拼音 / 英文)",
  emojiPickerNoResults: "没有匹配的表情",
  emojiPickerCategorySmileys: "笑脸与情感",
  emojiPickerCategoryGestures: "人物与手势",
  emojiPickerCategoryAnimals: "动物与自然",
  emojiPickerCategoryFood: "食物与饮料",
  emojiPickerCategoryActivities: "活动与运动",
  emojiPickerCategoryTravel: "旅行与地点",
  emojiPickerCategoryObjects: "物品",
  emojiPickerCategorySymbols: "符号",
  selectionLinkInvalidUrl: "链接格式无效",
  blockHandleInsertLabel: "在此插入块",
  blockHandleDragLabel: "拖拽移动块，Shift+点击多选",
  historyPanelTitle: "版本历史",
  historyPanelEmpty: "暂无历史版本",
  historyPanelRestore: "恢复",
  historyPanelDelete: "删除",
  historyPanelSave: "保存版本",
  historyPanelRestoreConfirm: "恢复到此版本？当前内容会先自动留存。",
  historyPanelDeleteConfirm: "删除此版本？该操作不可撤销。",
  historyOriginAuto: "自动保存",
  historyOriginManual: "手动保存",
  historyOriginRestore: "恢复保存",
  historyOperationFailed: "操作失败，请重试",
  commentsPanelTitle: "评论",
  commentsPanelPlaceholder: "写下评论…",
  commentsPanelAdd: "添加",
  commentsPanelResolve: "解决",
  commentsPanelReopen: "重新打开",
  commentsPanelDelete: "删除",
  commentsPanelStale: "原文已找不到",
  commentsPanelEmpty: "选中文字后添加第一条评论",
  commentsPanelSelectFirst: "请先选中文字，再添加评论",
  commentsPanelStaleAnchor: "评论锚点已失效",
  collabStatusConnecting: "连接中",
  collabStatusConnected: "已连接",
  collabStatusDisconnected: "已断开",
  tocTitle: "目录",
  tocEmpty: "暂无标题",
  codeBlockMermaidRenderError: "图表渲染失败",
  selectionTooltipUnderlineTitle: "下划线",
  selectionTooltipSubscriptTitle: "下标",
  selectionTooltipSuperscriptTitle: "上标",
  toolbarUnderlineTitle: "下划线 (Ctrl+U)",
  toolbarSubscriptTitle: "下标",
  toolbarSuperscriptTitle: "上标"
};
function il(e, t = {}) {
  const n = e.startsWith("\uFEFF") ? e.slice(1) : e, o = t.delimiter ?? ",", r = [];
  let i = [], s = "", a = !1, l = 0;
  const c = () => {
    i.push(s), s = "";
  }, d = () => {
    c(), r.push(i), i = [];
  };
  for (; l < n.length; ) {
    const u = n[l];
    if (a) {
      u === '"' ? n[l + 1] === '"' ? (s += '"', l += 2) : (a = !1, l += 1) : (s += u, l += 1);
      continue;
    }
    u === '"' && s.length === 0 ? (a = !0, l += 1) : u === o ? (c(), l += 1) : u === "\r" || u === `
` ? (u === "\r" && n[l + 1] === `
` ? l += 2 : l += 1, d()) : (s += u, l += 1);
  }
  if ((s.length > 0 || i.length > 0 || t.emptyAsBlankRow === !0 && r.length === 0) && d(), t.padColumns === !0) {
    let u = 0;
    for (const h of r)
      u = Math.max(u, h.length);
    for (const h of r)
      for (; h.length < u; )
        h.push("");
  }
  return r;
}
function $u(e, t, n) {
  return e.includes(t) || e.includes('"') || e.includes(`
`) || e.includes("\r") || n && e !== e.trim();
}
function sl(e, t = {}) {
  const n = t.delimiter ?? ",", o = t.quoteWhitespace === !0;
  return e.map(
    (r) => r.map(
      (i) => $u(i, n, o) ? `"${i.replace(/"/g, '""')}"` : i
    ).join(n)
  ).join(`\r
`);
}
function ju(e) {
  const t = e.replace(/\r\n/g, `
`).replace(/\r/g, `
`).split(`
`);
  return t.length < 2 ? !1 : t.every((n) => n.trim() === "" || n.includes(","));
}
function Ku(e) {
  if (!Number.isInteger(e) || e < 0)
    return "";
  let t = e, n = "";
  do
    n = String.fromCharCode(65 + t % 26) + n, t = Math.floor(t / 26) - 1;
  while (t >= 0);
  return n;
}
function al(e, t = ",") {
  return il(e, { delimiter: t, padColumns: !0, emptyAsBlankRow: !0 });
}
function ll(e, t = ",") {
  return sl(e, { delimiter: t, quoteWhitespace: !0 });
}
const Ho = class Ho {
  constructor(t) {
    /** 单元格数据(行 → 列 → 文本)。 */
    m(this, "cells", []);
    /** 列宽数组(px;下标 = 列号)。 */
    m(this, "columnWidths", []);
    /** 行高数组(px;下标 = 行号)。 */
    m(this, "rowHeights", []);
    /** 撤销栈(最新在末尾)。 */
    m(this, "undoStack", []);
    /** 重做栈(最新在末尾)。 */
    m(this, "redoStack", []);
    this.config = t;
  }
  /** 行数。 */
  get rowCount() {
    return this.cells.length;
  }
  /** 列数(第一行长度;空表为 0)。 */
  get columnCount() {
    var t;
    return ((t = this.cells[0]) == null ? void 0 : t.length) ?? 0;
  }
  /** 读取单元格(越界返回空串)。 */
  getCell(t, n) {
    var o;
    return ((o = this.cells[t]) == null ? void 0 : o[n]) ?? "";
  }
  /**
   * 批量写单元格并记录撤销单元。
   * @param changes 坐标 → 新文本(坐标必须在界内)
   */
  applyCellChanges(t) {
    if (t.length === 0) return;
    const n = [];
    for (const { row: o, col: r, after: i } of t) {
      const s = this.getCell(o, r);
      if (s === i) continue;
      for (; this.cells.length <= o; )
        this.cells.push(new Array(Math.max(this.columnCount, 1)).fill(""));
      const a = this.cells[o];
      if (a && a.length <= r)
        for (; a.length <= r; )
          a.push("");
      this.cells[o][r] = i, n.push({ row: o, col: r, before: s, after: i });
    }
    n.length > 0 && this.pushOp({ type: "cells", changes: n });
  }
  /**
   * 在指定行号前插入 N 个空行。
   * @param at 插入位置(0..rowCount)
   * @param count 插入行数(≥1)
   */
  insertRows(t, n) {
    const o = Math.min(Math.max(t, 0), this.rowCount), r = Math.max(this.columnCount, this.config.minColumnCount), i = Array.from({ length: n }, () => new Array(r).fill(""));
    this.cells.splice(o, 0, ...i), this.rowHeights.splice(o, 0, ...Array.from({ length: n }, () => this.config.defaultRowHeight)), this.pushOp({ type: "insertRows", at: o, count: n });
  }
  /**
   * 删除 [at, at+count) 的行。
   * @returns 被删除的行数据(供撤销)
   */
  deleteRows(t, n) {
    const o = this.clampSpan(t, n, this.rowCount);
    if (o.count === 0) return;
    const r = this.cells.splice(o.at, o.count);
    this.rowHeights.splice(o.at, o.count), this.pushOp({ type: "deleteRows", at: o.at, removed: r });
  }
  /**
   * 在指定列号前插入 N 个空列(含列宽/既有行扩列)。
   * @param at 插入位置(0..columnCount)
   * @param count 插入列数(≥1)
   */
  insertCols(t, n) {
    const o = Math.min(Math.max(t, 0), this.columnCount);
    for (const r of this.cells)
      r.splice(o, 0, ...Array.from({ length: n }, () => ""));
    this.columnWidths.splice(o, 0, ...Array.from({ length: n }, () => this.config.defaultColumnWidth)), this.pushOp({ type: "insertCols", at: o, count: n });
  }
  /**
   * 删除 [at, at+count) 的列。
   * @returns 被删除的列数据(供撤销;按行取列)
   */
  deleteCols(t, n) {
    const o = this.clampSpan(t, n, this.columnCount);
    if (o.count === 0) return;
    const r = this.cells.map((i) => i.splice(o.at, o.count));
    this.columnWidths.splice(o.at, o.count), this.pushOp({ type: "deleteCols", at: o.at, removed: r });
  }
  /**
   * 纯空白扩容到至少 minRows × minCols(不记录撤销)。
   *
   * 用于无限滚动追行与粘贴自动扩容:只在尾部追加空白行列,既有索引全部不变,
   * 因此撤销栈中已记录的行列坐标依然有效。
   * @param minRows 目标行数下限
   * @param minCols 目标列数下限
   */
  ensureCapacity(t, n) {
    const o = Math.max(n, this.columnCount);
    if (o > this.columnCount) {
      for (const r of this.cells)
        for (; r.length < o; )
          r.push("");
      for (; this.columnWidths.length < o; )
        this.columnWidths.push(this.config.defaultColumnWidth);
    }
    for (; this.cells.length < t; )
      this.cells.push(new Array(o).fill("")), this.rowHeights.push(this.config.defaultRowHeight);
  }
  /**
   * 按索引映射重排数据行(排序及撤销/重放内部用;不记录撤销)。
   * @param order 长度 = 当前行数的索引数组:新第 i 行 = 旧第 order[i] 行
   */
  reorderRows(t) {
    t.length === this.cells.length && (this.cells = t.map((n) => this.cells[n]), this.rowHeights = t.map((n) => this.rowHeights[n] ?? this.config.defaultRowHeight));
  }
  /**
   * 排序:按索引映射重排全部行并记录撤销单元。
   * @param order 排序映射:新第 i 行 = 旧第 order[i] 行(重做时再次应用)
   * @param restore order 的逆映射(撤销时应用,还原到排序前顺序)
   */
  sortRows(t, n) {
    t.length !== this.cells.length || n.length !== this.cells.length || (this.reorderRows(t), this.pushOp({ type: "sortRows", from: n, to: t }));
  }
  /**
   * 按当前行数生成原始行号序列 [0..rowCount),配合 reorderRows/sortRows 计算映射。
   */
  rowIndexes() {
    return Array.from({ length: this.cells.length }, (t, n) => n);
  }
  /** 撤销一次操作;返回是否发生撤销。 */
  undo() {
    const t = this.undoStack.pop();
    return t ? (this.invertOp(t), this.redoStack.push(t), !0) : !1;
  }
  /** 重做一次操作;返回是否发生重做。 */
  redo() {
    const t = this.redoStack.pop();
    return t ? (this.applyOp(t), this.undoStack.push(t), !0) : !1;
  }
  /** 清空撤销/重做栈(setCsv 等整体替换时调用)。 */
  clearHistory() {
    this.undoStack = [], this.redoStack = [];
  }
  /** 记录操作(清空重做栈;限深)。 */
  pushOp(t) {
    this.redoStack = [], this.undoStack.push(t), this.undoStack.length > Ho.MAX_UNDO && this.undoStack.shift();
  }
  /** 正向执行操作(重做路径)。 */
  applyOp(t) {
    switch (t.type) {
      case "cells":
        for (const { row: n, col: o, after: r } of t.changes)
          this.ensureCell(n, o), this.cells[n][o] = r;
        break;
      case "sortRows":
        this.reorderRows(t.to);
        break;
      case "insertRows":
        this.insertRowsSilent(t.at, t.count);
        break;
      case "deleteRows":
        this.cells.splice(t.at, t.removed.length), this.rowHeights.splice(t.at, t.removed.length);
        break;
      case "insertCols": {
        for (const n of this.cells)
          n.splice(t.at, 0, ...Array.from({ length: t.count }, () => ""));
        this.columnWidths.splice(t.at, 0, ...Array.from({ length: t.count }, () => this.config.defaultColumnWidth));
        break;
      }
      case "deleteCols":
        for (const n of this.cells)
          n.splice(t.at, t.removed.length);
        this.columnWidths.splice(t.at, t.removed.length);
        break;
    }
  }
  /** 逆向执行操作(撤销路径)。 */
  invertOp(t) {
    var n;
    switch (t.type) {
      case "cells":
        for (const { row: o, col: r, before: i } of t.changes)
          this.ensureCell(o, r), this.cells[o][r] = i;
        break;
      case "sortRows":
        this.reorderRows(t.from);
        break;
      case "insertRows":
        this.cells.splice(t.at, t.count), this.rowHeights.splice(t.at, t.count);
        break;
      case "deleteRows":
        this.cells.splice(t.at, 0, ...t.removed.map((o) => [...o])), this.rowHeights.splice(
          t.at,
          0,
          ...Array.from({ length: t.removed.length }, () => this.config.defaultRowHeight)
        );
        break;
      case "insertCols":
        for (const o of this.cells)
          o.splice(t.at, t.count);
        this.columnWidths.splice(t.at, t.count);
        break;
      case "deleteCols":
        for (let o = 0; o < this.cells.length; o += 1)
          (n = this.cells[o]) == null || n.splice(t.at, 0, ...t.removed[o] ?? []);
        this.columnWidths.splice(t.at, 0, ...Array.from({ length: t.removed.length }, () => this.config.defaultColumnWidth));
        break;
    }
  }
  /** 无记录插行(applyOp 内部用,避免递归记栈)。 */
  insertRowsSilent(t, n) {
    const o = Math.max(this.columnCount, this.config.minColumnCount), r = Array.from({ length: n }, () => new Array(o).fill(""));
    this.cells.splice(t, 0, ...r), this.rowHeights.splice(t, 0, ...Array.from({ length: n }, () => this.config.defaultRowHeight));
  }
  /** 确保坐标处格子存在(undo/redo 恢复时可能落在扩容区)。 */
  ensureCell(t, n) {
    for (; this.cells.length <= t; )
      this.cells.push(new Array(Math.max(this.columnCount, 1)).fill(""));
    const o = this.cells[t];
    if (o && o.length <= n)
      for (; o.length <= n; )
        o.push("");
  }
  /** 把 [at, at+count) 夹到 [0, total] 界内。 */
  clampSpan(t, n, o) {
    const r = Math.min(Math.max(t, 0), o), i = Math.min(n, o - r);
    return { at: r, count: Math.max(i, 0) };
  }
};
/** 撤销栈深度上限(内存保护)。 */
m(Ho, "MAX_UNDO", 200);
let wr = Ho;
const _n = '"Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Heiti SC", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif', On = 13, Rn = 18, zo = 6, as = "#1B1C1F", Mt = "#F7F8F8", Zt = "#EEEEEE", Wu = "#1B1C1F", Uu = "#FFFFFF", ro = "#E6E6E6", cl = "#2C53F1", Vu = "rgba(0, 0, 0, 0.05)", ls = "#F0F0F0", cs = "#E8E8E8", qu = 4, dl = 24, Gu = cl, ul = 16, hl = 5, Xu = "#E8E8E8", Yu = "#DCDCDC", Zu = "#5F646E", Ju = "#1B1C1F", Qu = 3, lt = 10, eh = 17, th = "#D4D4D4", nh = "#BFBFBF", oh = "#8F8F8F", ds = "#F7F8F8", rh = "#DCDCDC", us = 6, ih = 2, sh = 1, Xo = "__mtable_measure_ctx__";
function ml() {
  const e = globalThis;
  if (!e[Xo]) {
    const t = document.createElement("canvas");
    t.width = 1, t.height = 1, e[Xo] = t.getContext("2d");
  }
  return e[Xo];
}
function pl(e, t) {
  const n = ml();
  n.font = `${On}px ${_n}`;
  const o = [];
  for (const r of e.split(`
`)) {
    let i = "", s = 0;
    for (const a of r) {
      const l = n.measureText(a).width;
      i.length > 0 && s + l > t ? (o.push(i), i = a, s = l) : (i += a, s += l);
    }
    o.push(i);
  }
  return o.length > 0 ? o : [""];
}
function ah(e, t, n) {
  if (e.measureText(t).width <= n) return t;
  let o = t;
  for (; o.length > 0 && e.measureText(`${o}…`).width > n; )
    o = o.slice(0, -1);
  return `${o}…`;
}
function vr(e, t, n) {
  if (t < e.rowHeaderWidth || n < e.columnHeaderHeight) return null;
  const o = t - e.rowHeaderWidth, r = n - e.columnHeaderHeight;
  let i = 0, s = -1;
  for (let c = 0; c < e.source.columnWidths.length; c += 1) {
    const d = e.getColumnWidth(c), u = i - e.colScrollOffset(c);
    if (o >= u && o < u + d) {
      s = c;
      break;
    }
    i += d;
  }
  let a = -1, l = 0;
  for (let c = 0; c < e.source.rowHeights.length; c += 1) {
    const d = e.getLayoutRowHeight(c), u = l - e.rowScrollOffset(c);
    if (r >= u && r < u + d) {
      a = c;
      break;
    }
    l += d;
  }
  return a < 0 || s < 0 ? null : { row: a, col: s };
}
function lh(e, t, n) {
  if (n < e.columnHeaderHeight && t >= e.rowHeaderWidth) {
    const o = vr(e, t, e.columnHeaderHeight + 1);
    return o ? { type: "col", index: o.col } : null;
  }
  if (t < e.rowHeaderWidth && n >= e.columnHeaderHeight) {
    const o = vr(e, e.rowHeaderWidth + 1, n);
    return o ? { type: "row", index: o.row } : null;
  }
  return null;
}
function ch(e, t, n) {
  const o = e.canvas.clientWidth, r = e.canvas.clientHeight, i = lt;
  return t >= o - i && n >= e.columnHeaderHeight ? e.verticalScrollbarGeometry ? "v" : null : n >= r - i && t >= e.rowHeaderWidth && t < o - i && e.horizontalScrollbarGeometry ? "h" : null;
}
function dh(e, t, n, o = 2) {
  var r;
  if (n >= e.columnHeaderHeight || t < e.rowHeaderWidth) return null;
  for (let i = 0; i < e.view.colLefts.length; i += 1) {
    const s = e.view.firstCol + i, a = ((r = e.source.hoveredHeader) == null ? void 0 : r.type) === "col" && e.source.hoveredHeader.index === s;
    if (!e.filteredColsCache.has(s) && !a) continue;
    const l = e.filterArrowRect(s, e.view.colLefts[i]);
    if (t >= l.x - o && t <= l.x + l.size + o && n >= l.y - o && n <= l.y + l.size + o)
      return s;
  }
  return null;
}
class uh {
  constructor(t) {
    m(this, "canvas");
    m(this, "ctx");
    m(this, "source");
    m(this, "defaultColumnWidth");
    m(this, "defaultRowHeight");
    m(this, "rowHeaderWidth");
    m(this, "columnHeaderHeight");
    /** 滚动偏移(px)。 */
    m(this, "scrollX", 0);
    m(this, "scrollY", 0);
    /** 鼠标悬停/拖拽的滚动条(由宿主 mousemove/mousedown 设置,null = 无;驱动滑块加深变粗)。 */
    m(this, "scrollbarActive", null);
    /** 滚动条是否正处于拖拽中(颜色比 hover 更深一档)。 */
    m(this, "scrollbarDragging", !1);
    /** 列宽拖拽中的定位线(屏幕坐标 px,null = 无;由宿主拖拽时设置,render 绘制)。 */
    m(this, "columnResizeLine", null);
    /** 悬停中的筛选箭头列号(null = 无;由宿主 mousemove 设置,箭头底色加深)。 */
    m(this, "hoveredFilterArrow", null);
    /** 每帧缓存的筛选列集合(绘制与命中测试共用;renderer-hit-test 经宿主访问)。 */
    m(this, "filteredColsCache", /* @__PURE__ */ new Set());
    /** 最近一次绘制的滚动条几何(null = 内容未溢出、滑块不显示)。 */
    m(this, "scrollbarGeometryV", null);
    m(this, "scrollbarGeometryH", null);
    /** 最近一次绘制的可见几何(命中测试用,绘制时刷新)。 */
    m(this, "view", {
      colLefts: [],
      rowTops: [],
      firstCol: 0,
      lastCol: 0,
      firstRow: 0,
      lastRow: 0,
      gridWidth: 0,
      gridHeight: 0
    });
    this.canvas = t.canvas, this.ctx = t.canvas.getContext("2d"), this.source = t.source, this.defaultColumnWidth = t.defaultColumnWidth, this.defaultRowHeight = t.defaultRowHeight, this.rowHeaderWidth = t.rowHeaderWidth, this.columnHeaderHeight = t.columnHeaderHeight;
  }
  /**
   * 同步刷新筛选/排序生效列缓存(公开:宿主在筛选/排序状态变化后、
   * 下一帧渲染前调用,保证随后的箭头命中测试与绘制立即反映新状态)。
   */
  refreshFilteredCols() {
    this.filteredColsCache = this.source.getFilteredCols();
  }
  /** 垂直滚动条几何(render 后有效;内容未溢出为 null)。 */
  get verticalScrollbarGeometry() {
    return this.scrollbarGeometryV;
  }
  /** 水平滚动条几何(render 后有效;内容未溢出为 null)。 */
  get horizontalScrollbarGeometry() {
    return this.scrollbarGeometryH;
  }
  /** 列宽(越界取默认)。 */
  getColumnWidth(t) {
    return this.source.columnWidths[t] ?? this.defaultColumnWidth;
  }
  /** 行高(越界取默认)。 */
  getRowHeight(t) {
    return this.source.rowHeights[t] ?? this.defaultRowHeight;
  }
  /** 行布局高度(被筛选隐藏的行折叠为 0,不占布局)。 */
  getLayoutRowHeight(t) {
    return this.source.hiddenRows.has(t) ? 0 : this.getRowHeight(t);
  }
  /** 列的滚动偏移:冻结列(≤ freezeCol)偏移为 0(不滚),其余正常滚动。 */
  colScrollOffset(t) {
    return this.freezeCol >= 0 && t <= this.freezeCol ? 0 : this.scrollX;
  }
  /** 行的滚动偏移:冻结行(≤ freezeRow)偏移为 0(不滚),其余正常滚动。 */
  rowScrollOffset(t) {
    return this.freezeRow >= 0 && t <= this.freezeRow ? 0 : this.scrollY;
  }
  /** 冻结列(0 基;-1 = 无冻结)。 */
  get freezeCol() {
    return this.source.freezeCol;
  }
  /** 冻结行(0 基;-1 = 无冻结)。 */
  get freezeRow() {
    return this.source.freezeRow;
  }
  /** 列号 → 未滚动数据区 x(px;越界列按默认宽外推)。 */
  unscrolledColLeft(t) {
    let n = 0;
    for (let o = 0; o < t && o < this.source.columnWidths.length; o += 1)
      n += this.getColumnWidth(o);
    for (let o = this.source.columnWidths.length; o < t; o += 1)
      n += this.defaultColumnWidth;
    return n;
  }
  /** 行号 → 未滚动数据区 y(px;越界行按默认高外推)。 */
  unscrolledRowTop(t) {
    let n = 0;
    for (let o = 0; o < t && o < this.source.rowHeights.length; o += 1)
      n += this.getLayoutRowHeight(o);
    for (let o = this.source.rowHeights.length; o < t; o += 1)
      n += this.defaultRowHeight;
    return n;
  }
  /** 数据区总宽(px)。 */
  get totalWidth() {
    return this.source.columnWidths.reduce((t, n) => t + n, 0);
  }
  /** 数据区总高(px,隐藏行不计)。 */
  get totalHeight() {
    let t = 0;
    for (let n = 0; n < this.source.rowHeights.length; n += 1)
      t += this.getLayoutRowHeight(n);
    return t;
  }
  /**
   * 命中测试:数据区坐标(px,视口内) → 单元格坐标。
   * @returns null 表示落在表头区或界外
   */
  hitTestCell(t, n) {
    return vr(this, t, n);
  }
  /** 命中测试:表头(px 坐标 → 行/列号)。 */
  hitTestHeader(t, n) {
    return lh(this, t, n);
  }
  /**
   * 绘制一帧(完整重绘;数据量与可见区域小,性能足够)。
   */
  render() {
    const { canvas: t, ctx: n, source: o } = this, r = Math.min(window.devicePixelRatio || 1, Qu), i = t.clientWidth, s = t.clientHeight, a = Math.round(i * r), l = Math.round(s * r);
    (t.width !== a || t.height !== l) && (t.width = a, t.height = l), n.setTransform(r, 0, 0, r, 0, 0);
    const c = Math.max(this.totalWidth - (i - this.rowHeaderWidth - lt), 0), d = Math.max(this.totalHeight - (s - this.columnHeaderHeight - lt), 0);
    this.scrollX > c && (this.scrollX = c), this.scrollY > d && (this.scrollY = d), this.refreshFilteredCols(), n.fillStyle = Uu, n.fillRect(0, 0, i, s);
    const { firstCol: u, lastCol: h, firstRow: p, lastRow: g } = this.computeVisibleRange(
      i - lt,
      s - lt
    ), y = this.computeColLefts(u, h), f = this.computeRowTops(p, g);
    this.view = {
      colLefts: y,
      rowTops: f,
      firstCol: u,
      lastCol: h,
      firstRow: p,
      lastRow: g,
      gridWidth: i - this.rowHeaderWidth - lt,
      gridHeight: s - this.columnHeaderHeight - lt
    };
    const w = o.selection, b = this.rowHeaderWidth + this.view.gridWidth, k = this.columnHeaderHeight + this.view.gridHeight, v = Math.min(
      Math.max(this.columnHeaderHeight + this.totalHeight - this.scrollY, this.columnHeaderHeight),
      k
    );
    n.save(), n.beginPath(), n.rect(this.rowHeaderWidth, this.columnHeaderHeight, this.view.gridWidth, this.view.gridHeight), n.clip(), this.drawCells(u, h, p, g, y, f), this.drawGridLines(p, y, f, b, v), w && this.drawSelection(w, b, k), n.restore();
    const E = this.computeVerticalScrollbar() !== null, M = this.computeHorizontalScrollbar() !== null;
    (E || M) && (n.strokeStyle = ro, n.lineWidth = 1, n.beginPath(), E && (n.moveTo(b + 0.5, this.columnHeaderHeight), n.lineTo(b + 0.5, k)), M && (n.moveTo(this.rowHeaderWidth, k + 0.5), n.lineTo(b, k + 0.5)), n.stroke()), v > this.columnHeaderHeight && v < k && (n.strokeStyle = ro, n.lineWidth = 1, n.beginPath(), n.moveTo(0, Math.round(v) + 0.5), n.lineTo(b, Math.round(v) + 0.5), n.stroke());
    const x = this.freezeCol, T = this.freezeRow;
    if (x >= 0 || T >= 0) {
      if (n.strokeStyle = rh, n.lineWidth = 2, n.beginPath(), x >= 0) {
        const L = this.rowHeaderWidth + this.unscrolledColLeft(x + 1);
        n.moveTo(L, this.columnHeaderHeight), n.lineTo(L, k);
      }
      if (T >= 0) {
        const L = this.columnHeaderHeight + this.unscrolledRowTop(T + 1);
        n.moveTo(this.rowHeaderWidth, L), n.lineTo(b, L);
      }
      n.stroke();
    }
    this.columnResizeLine !== null && (n.strokeStyle = Gu, n.lineWidth = 2, n.beginPath(), n.moveTo(this.columnResizeLine, this.columnHeaderHeight), n.lineTo(this.columnResizeLine, k), n.stroke()), n.save(), n.beginPath(), n.rect(this.rowHeaderWidth, 0, this.view.gridWidth, this.columnHeaderHeight), n.clip(), this.drawColumnHeaders(u, y, b, w);
    for (let L = 0; L < y.length; L += 1)
      this.drawFilterArrow(n, u + L, y[L]);
    n.restore(), n.save(), n.beginPath(), n.rect(0, this.columnHeaderHeight, this.rowHeaderWidth, this.view.gridHeight), n.clip(), this.drawRowHeaders(p, f, k, w), v < k && (n.fillStyle = Mt, n.fillRect(0, v, this.rowHeaderWidth, k - v)), n.restore(), n.strokeStyle = Zt, n.lineWidth = 1, n.beginPath(), n.moveTo(Math.round(this.rowHeaderWidth) + 0.5, this.columnHeaderHeight), n.lineTo(Math.round(this.rowHeaderWidth) + 0.5, k), n.stroke(), n.fillStyle = Mt, n.fillRect(b, 0, i - b, this.columnHeaderHeight), n.fillStyle = Mt, n.fillRect(0, 0, this.rowHeaderWidth, this.columnHeaderHeight), n.strokeStyle = Zt, n.lineWidth = 1, n.strokeRect(0.5, 0.5, this.rowHeaderWidth - 1, this.columnHeaderHeight - 1), this.drawScrollbars();
  }
  /**
   * 计算滚动条几何(画布坐标)。
   * 滑块长度 = track²/content(Univer scroll-bar.ts 同式,最小 SCROLLBAR_MIN_THUMB_SIZE),
   * 位置按 scroll/maxScroll 在轨道有效范围内等比映射;内容未溢出时返回 null。
   * @param dataStart 轨道起点(垂直=列头高,水平=行头宽)
   * @param viewport 数据区视口长(px,垂直=gridHeight,水平=gridWidth)
   * @param content 内容总长(px,垂直=totalHeight,水平=totalWidth)
   * @param scroll 当前滚动偏移
   * @param reserved 另一轴滚动条占用的厚度(0 = 不显示)
   */
  computeScrollbarGeometry(t, n, o, r, i) {
    const s = Math.max(n - i, 0), a = Math.max(o - n, 0);
    if (a <= 0 || s <= 0) return null;
    const l = s * s / o, c = Math.min(Math.max(l, eh), s), d = t + r / a * (s - c);
    return { trackStart: t, trackLength: s, thumbStart: d, thumbLength: c, maxScroll: a };
  }
  /** 垂直滚动条几何(render 后刷新;null = 纵向无溢出)。轨道带独立于网格(右缘),不占网格宽度。 */
  computeVerticalScrollbar() {
    return this.computeScrollbarGeometry(
      this.columnHeaderHeight,
      this.view.gridHeight,
      this.totalHeight,
      this.scrollY,
      0
    );
  }
  /** 水平滚动条几何(render 后刷新;null = 横向无溢出)。轨道带独立于网格(底缘),不占网格高度。 */
  computeHorizontalScrollbar() {
    return this.computeScrollbarGeometry(
      this.rowHeaderWidth,
      this.view.gridWidth,
      this.totalWidth,
      this.scrollX,
      0
    );
  }
  /** 绘制滚动条(轨道带独立于网格:垂直贴网格右缘、水平贴网格底缘,均不与网格区域重叠)。 */
  drawScrollbars() {
    const { ctx: t } = this;
    this.scrollbarGeometryH = this.computeHorizontalScrollbar(), this.scrollbarGeometryV = this.computeVerticalScrollbar();
    const n = lt, o = this.view.gridWidth, r = this.view.gridHeight, i = this.rowHeaderWidth + o, s = this.columnHeaderHeight + r, a = i + n, l = s + n, c = this.scrollbarGeometryV, d = this.scrollbarGeometryH;
    c && (t.fillStyle = ds, t.fillRect(
      i,
      this.columnHeaderHeight,
      n,
      d ? r : l - this.columnHeaderHeight
    )), d && (t.fillStyle = ds, t.fillRect(this.rowHeaderWidth, s, c ? o : a - this.rowHeaderWidth, n), t.fillStyle = Mt, t.fillRect(0, s, this.rowHeaderWidth, n)), c && d && (t.fillStyle = Mt, t.fillRect(i, s, n, n), t.strokeStyle = Zt, t.lineWidth = 1, t.strokeRect(i + 0.5, s + 0.5, n - 1, n - 1));
    const u = this.scrollbarActive !== null || this.scrollbarDragging ? sh : ih, h = Math.max(n - u * 2, 1), p = this.scrollbarDragging ? oh : this.scrollbarActive !== null ? nh : th;
    if (t.fillStyle = p, c) {
      const g = i + u;
      this.fillRoundedRect(g, c.thumbStart, h, c.thumbLength, us);
    }
    if (d) {
      const g = s + u;
      this.fillRoundedRect(d.thumbStart, g, d.thumbLength, h, us);
    }
  }
  /** 圆角矩形填充(圆角半径自动夹到宽高一半以内)。 */
  fillRoundedRect(t, n, o, r, i) {
    const { ctx: s } = this, a = Math.min(i, o / 2, r / 2);
    s.beginPath(), s.moveTo(t + a, n), s.arcTo(t + o, n, t + o, n + r, a), s.arcTo(t + o, n + r, t, n + r, a), s.arcTo(t, n + r, t, n, a), s.arcTo(t, n, t + o, n, a), s.closePath(), s.fill();
  }
  /**
   * 命中测试滚动条(轨道区域含滑块;右下角占位块归垂直条)。
   * @returns 命中的滚动条轴,未命中返回 null
   */
  hitTestScrollbar(t, n) {
    return ch(this, t, n);
  }
  /**
   * 命中测试列头筛选箭头(圆圈外扩容错,便于点中;触摸点按用更大容差)。
   * @returns 命中的列号,未命中返回 null
   */
  hitTestFilterArrow(t, n, o = 2) {
    return dh(this, t, n, o);
  }
  /** 筛选箭头圆圈的屏幕矩形(列头带内,右缘对齐;绘制与命中共用)。 */
  filterArrowRect(t, n) {
    const o = this.getColumnWidth(t), r = this.rowHeaderWidth + n + o, i = ul;
    return { x: r - hl - i, y: (this.columnHeaderHeight - i) / 2, size: i };
  }
  /** 绘制某列的筛选箭头(hover 列常显,设置过筛选/排序的列常显)。 */
  drawFilterArrow(t, n, o) {
    var u;
    const r = this.filteredColsCache.has(n), i = ((u = this.source.hoveredHeader) == null ? void 0 : u.type) === "col" && this.source.hoveredHeader.index === n;
    if (!r && !i)
      return;
    const s = this.hoveredFilterArrow === n, a = this.filterArrowRect(n, o);
    if (a.x < this.rowHeaderWidth) return;
    t.save(), t.fillStyle = s ? Yu : Xu, t.beginPath(), t.arc(a.x + a.size / 2, a.y + a.size / 2, a.size / 2, 0, Math.PI * 2), t.fill();
    const l = a.x + a.size / 2, c = a.y + a.size / 2, d = 3.2;
    t.strokeStyle = r ? Ju : Zu, t.lineWidth = 1.5, t.lineCap = "round", t.lineJoin = "round", t.beginPath(), t.moveTo(l - d, c - 1.2), t.lineTo(l, c + 2.2), t.lineTo(l + d, c - 1.2), t.stroke(), t.restore();
  }
  /**
   * 拖拽滚动条:把指针位置(画布坐标)映射为滚动偏移(夹在 [0, maxScroll])。
   * 轨道点击跳转复用本方法:grabOffset 传滑块长度一半即"滑块中心对齐点击处"(Univer scrollToBarPos 语义)。
   * @param type 滚动条轴
   * @param x 指针画布 x
   * @param y 指针画布 y
   * @param grabOffset mousedown 时指针相对滑块起点的偏移(px,沿轨道方向)
   */
  dragScrollbarTo(t, n, o, r) {
    const i = t === "v" ? this.scrollbarGeometryV : this.scrollbarGeometryH;
    if (!i) return;
    const a = (t === "v" ? o : n) - r, l = Math.max(i.trackLength - i.thumbLength, 1), d = Math.min(Math.max((a - i.trackStart) / l, 0), 1) * i.maxScroll;
    t === "v" ? this.scrollY = d : this.scrollX = d;
  }
  /** 计算可见行列范围(冻结感知:冻结行列始终可见,非冻结区按滚动偏移折叠)。 */
  computeVisibleRange(t, n) {
    const o = t - this.rowHeaderWidth, r = n - this.columnHeaderHeight;
    let i = -1, s = -1, a = -1, l = -1, c = 0;
    for (let u = 0; u < this.source.columnWidths.length; u += 1) {
      const h = this.getColumnWidth(u), p = c - this.colScrollOffset(u);
      c += h, p + h > 0 && p < o && h > 0 && (i < 0 && (i = u), s = u);
    }
    let d = 0;
    for (let u = 0; u < this.source.rowHeights.length; u += 1) {
      const h = this.getLayoutRowHeight(u), p = d - this.rowScrollOffset(u);
      d += h, p + h > 0 && p < r && h > 0 && (a < 0 && (a = u), l = u);
    }
    return {
      firstCol: Math.max(i, 0),
      lastCol: Math.max(s, 0),
      firstRow: Math.max(a, 0),
      lastRow: Math.max(l, 0)
    };
  }
  /** 可见列的 x 起点(数据区坐标系,冻结感知:冻结列偏移为 0)。 */
  computeColLefts(t, n) {
    const o = [];
    let r = 0;
    for (let i = 0; i < t; i += 1)
      r += this.getColumnWidth(i);
    for (let i = t; i <= n; i += 1)
      o.push(r - this.colScrollOffset(i)), r += this.getColumnWidth(i);
    return o;
  }
  /** 可见行的 y 起点(数据区坐标系,冻结感知:冻结行偏移为 0;隐藏行折叠为 0)。 */
  computeRowTops(t, n) {
    const o = [];
    let r = 0;
    for (let i = 0; i < t; i += 1)
      r += this.getLayoutRowHeight(i);
    for (let i = t; i <= n; i += 1)
      o.push(r - this.rowScrollOffset(i)), r += this.getLayoutRowHeight(i);
    return o;
  }
  /**
   * 数据区单元格:底色 + 文本(按列宽自动换行,整块垂直居中)。
   * 行高由宿主按换行行数预先算好(recalcRowHeights 与 wrapCellText 同源),
   * 极端情况下(行高容纳不下所有行)只绘制能容纳的行数,不越行重叠。
   */
  drawCells(t, n, o, r, i, s) {
    var c, d;
    const { ctx: a, source: l } = this;
    a.font = `${On}px ${_n}`, a.textBaseline = "middle";
    for (let u = o; u <= r && u < l.cells.length; u += 1) {
      if (l.hiddenRows.has(u)) continue;
      const h = s[u - o], p = this.getRowHeight(u);
      for (let g = t; g <= n && g < (((c = l.cells[u]) == null ? void 0 : c.length) ?? 0); g += 1) {
        const y = ((d = l.cells[u]) == null ? void 0 : d[g]) ?? "";
        if (y.length === 0) continue;
        const f = i[g - t], w = this.getColumnWidth(g), b = this.rowHeaderWidth + f, k = this.columnHeaderHeight + h;
        if (b + w < this.rowHeaderWidth || b > this.canvas.clientWidth) continue;
        a.fillStyle = Wu, a.textAlign = l.isNumericCell(u, g) ? "right" : "left";
        const v = w - zo * 2, E = a.textAlign === "right" ? b + w - zo : b + zo, M = Math.max(Math.floor((p - 2) / Rn), 1), x = pl(y, v).slice(0, M), T = x.length * Rn;
        let L = k + (p - T) / 2 + Rn / 2;
        for (const S of x)
          S.length > 0 && a.fillText(ah(a, S, v), E, L), L += Rn;
      }
    }
  }
  /** 数据区网格线(0.5px 对齐的 1px 线;隐藏行的横线跳过)。 */
  drawGridLines(t, n, o, r, i) {
    const { ctx: s, source: a } = this;
    s.strokeStyle = ro, s.lineWidth = 1, s.beginPath();
    for (let l = 0; l < n.length; l += 1) {
      const c = Math.round(this.rowHeaderWidth + n[l]) + 0.5;
      s.moveTo(c, this.columnHeaderHeight), s.lineTo(c, i);
    }
    for (let l = 0; l < o.length; l += 1) {
      const c = t + l;
      if (a.hiddenRows.has(c)) continue;
      const d = Math.round(this.columnHeaderHeight + o[l]) + 0.5;
      s.moveTo(this.rowHeaderWidth, d), s.lineTo(r, d);
    }
    s.stroke();
  }
  /** 选区:alpha 0.07 填充 + primary.600 描边。 */
  drawSelection(t, n, o) {
    const { ctx: r } = this, i = this.colToLeft(t.startCol) - this.colScrollOffset(t.startCol) + this.rowHeaderWidth, s = this.rowToTop(t.startRow) - this.rowScrollOffset(t.startRow) + this.columnHeaderHeight, a = this.colToLeft(t.endCol + 1) - this.colScrollOffset(t.endCol + 1) + this.rowHeaderWidth, l = this.rowToTop(t.endRow + 1) - this.rowScrollOffset(t.endRow + 1) + this.columnHeaderHeight, c = Math.max(i, this.rowHeaderWidth), d = Math.max(s, this.columnHeaderHeight), u = Math.min(a, n), h = Math.min(l, o);
    u <= this.rowHeaderWidth || h <= this.columnHeaderHeight || (r.fillStyle = Vu, r.fillRect(c, d, u - c, h - d), r.strokeStyle = cl, r.lineWidth = 1, r.strokeRect(i + 0.5, s + 0.5, a - i - 1, l - s - 1));
  }
  /** 列头行(A B C …,gray.50 底,选区覆盖高亮)。 */
  drawColumnHeaders(t, n, o, r) {
    var a;
    const { ctx: i, source: s } = this;
    i.font = `${On}px ${_n}`, i.textAlign = "center", i.textBaseline = "middle";
    for (let l = 0; l < n.length; l += 1) {
      const c = t + l, d = this.rowHeaderWidth + n[l], u = this.getColumnWidth(c);
      if (d + u < this.rowHeaderWidth || d > o) continue;
      const h = r !== null && c >= r.startCol && c <= r.endCol, p = ((a = s.hoveredHeader) == null ? void 0 : a.type) === "col" && s.hoveredHeader.index === c;
      i.fillStyle = h ? ls : p ? cs : Mt, i.fillRect(d, 0, u, this.columnHeaderHeight), i.strokeStyle = Zt, i.lineWidth = 1, i.beginPath(), i.moveTo(Math.round(d + u) + 0.5, 0), i.lineTo(Math.round(d + u) + 0.5, this.columnHeaderHeight), i.stroke(), i.fillStyle = as, i.fillText(Ku(c), d + u / 2, this.columnHeaderHeight / 2);
    }
    i.strokeStyle = Zt, i.beginPath(), i.moveTo(0, Math.round(this.columnHeaderHeight) + 0.5), i.lineTo(o, Math.round(this.columnHeaderHeight) + 0.5), i.stroke();
  }
  /** 行头列(1 2 3 …,gray.50 底,选区覆盖高亮)。 */
  drawRowHeaders(t, n, o, r) {
    var a;
    const { ctx: i, source: s } = this;
    i.font = `${On}px ${_n}`, i.textAlign = "center", i.textBaseline = "middle";
    for (let l = 0; l < n.length; l += 1) {
      const c = t + l;
      if (s.hiddenRows.has(c)) continue;
      if (c >= this.source.rowHeights.length) break;
      const d = this.columnHeaderHeight + n[l], u = this.getRowHeight(c);
      if (d + u < this.columnHeaderHeight || d > o) continue;
      const h = r !== null && c >= r.startRow && c <= r.endRow, p = ((a = s.hoveredHeader) == null ? void 0 : a.type) === "row" && s.hoveredHeader.index === c;
      i.fillStyle = h ? ls : p ? cs : Mt, i.fillRect(0, d, this.rowHeaderWidth, u), i.strokeStyle = ro, i.lineWidth = 1, i.beginPath(), i.moveTo(0, Math.round(d + u) + 0.5), i.lineTo(this.rowHeaderWidth, Math.round(d + u) + 0.5), i.stroke(), i.fillStyle = as, i.fillText(String(c + 1), this.rowHeaderWidth / 2, d + u / 2);
    }
    i.strokeStyle = Zt, i.beginPath(), i.moveTo(Math.round(this.rowHeaderWidth) + 0.5, 0), i.lineTo(Math.round(this.rowHeaderWidth) + 0.5, o), i.stroke();
  }
  /** 列号 → 数据区 x(px;越界列按默认宽外推;公开供编辑框定位)。 */
  colToLeftPublic(t) {
    return this.colToLeft(t);
  }
  /** 行号 → 数据区 y(px;越界行按默认高外推;公开供编辑框定位)。 */
  rowToTopPublic(t) {
    return this.rowToTop(t);
  }
  /** 列号 → 数据区 x(px;越界列按默认宽外推)。 */
  colToLeft(t) {
    let n = 0;
    for (let o = 0; o < t && o < this.source.columnWidths.length; o += 1)
      n += this.getColumnWidth(o);
    for (let o = this.source.columnWidths.length; o < t; o += 1)
      n += this.defaultColumnWidth;
    return n;
  }
  /** 行号 → 数据区 y(px;隐藏行 0 高折叠,越界行按默认高外推)。 */
  rowToTop(t) {
    let n = 0;
    for (let o = 0; o < t && o < this.source.rowHeights.length; o += 1)
      n += this.getLayoutRowHeight(o);
    for (let o = this.source.rowHeights.length; o < t; o += 1)
      n += this.defaultRowHeight;
    return n;
  }
  /** 滚动到使指定单元格可见(必要时更新 scrollX/scrollY;冻结区内跳过)。 */
  scrollCellIntoView(t, n) {
    const o = this.colToLeft(n), r = this.rowToTop(t), i = this.getColumnWidth(n), s = this.getLayoutRowHeight(t);
    if (!(this.freezeCol >= 0 && n <= this.freezeCol)) {
      const a = this.freezeCol >= 0 ? this.colToLeft(this.freezeCol + 1) : 0, l = a, c = this.view.gridWidth - a;
      o - a < this.scrollX ? this.scrollX = o - a : o + i > this.scrollX + l + c && (this.scrollX = o + i - l - c);
    }
    if (!(this.freezeRow >= 0 && t <= this.freezeRow)) {
      const a = this.freezeRow >= 0 ? this.rowToTop(this.freezeRow + 1) : 0, l = a, c = this.view.gridHeight - a;
      r - a < this.scrollY ? this.scrollY = r - a : r + s > this.scrollY + l + c && (this.scrollY = r + s - l - c);
    }
  }
}
const hh = (e) => e.length > 0 && Number.isFinite(Number(e)) && /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(e.trim()), hs = (e) => /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(e.trim()), fl = (e, t) => {
  if (e === t) return 0;
  if (e === "") return 1;
  if (t === "") return -1;
  const n = hs(e), o = hs(t);
  return n && o ? Number(e) - Number(t) : n ? -1 : o ? 1 : e.localeCompare(t, "zh-CN");
}, io = (e, t, n) => {
  const o = /* @__PURE__ */ new Map();
  for (let r = 0; r < t; r += 1) {
    const i = e.getCell(r, n);
    o.set(i, (o.get(i) ?? 0) + 1);
  }
  return Array.from(o.entries()).sort((r, i) => fl(r[0], i[0])).map(([r, i]) => ({ value: r, count: i }));
};
function Ot(e, t, n) {
  const o = Math.max(t - 1, 0), r = Math.max(n - 1, 0), i = Math.min(Math.max(e.startRow, 0), o), s = Math.min(Math.max(e.endRow, 0), o), a = Math.min(Math.max(e.startCol, 0), r), l = Math.min(Math.max(e.endCol, 0), r);
  return {
    startRow: Math.min(i, s),
    endRow: Math.max(i, s),
    startCol: Math.min(a, l),
    endCol: Math.max(a, l)
  };
}
function mh(e) {
  const { model: t } = e;
  return { setAnchorAndSelection: (i, s) => {
    e.anchor = { row: i, col: s }, e.selection = Ot(
      { startRow: i, startCol: s, endRow: i, endCol: s },
      t.rowCount,
      t.columnCount
    ), e.layout.scrollCellIntoViewWithExpand(i, s);
  }, extendSelectionTo: (i, s) => {
    e.selection = Ot(
      { startRow: e.anchor.row, startCol: e.anchor.col, endRow: i, endCol: s },
      t.rowCount,
      t.columnCount
    ), e.layout.scrollCellIntoViewWithExpand(i, s);
  }, clampSelection: () => {
    e.selection && (e.selection = Ot(e.selection, t.rowCount, t.columnCount), e.anchor = {
      row: Math.min(e.anchor.row, t.rowCount - 1),
      col: Math.min(e.anchor.col, t.columnCount - 1)
    });
  } };
}
const ph = {
  "zh-CN": {
    insertRow: "插入行",
    deleteRow: "删除行",
    insertColumn: "插入列",
    deleteColumn: "删除列",
    clearContents: "清空内容",
    reset: "重置",
    filterTab: "筛选",
    sortTab: "排序",
    sortAsc: "升序",
    sortDesc: "降序",
    selectAll: "全选",
    searchPlaceholder: "使用空格分隔关键字",
    blankValue: "(空白)",
    filterOnly: "仅筛选",
    cancel: "取消",
    confirm: "确认",
    fullscreenTitle: "表格",
    fullscreen: "全屏编辑表格",
    close: "关闭",
    freezeRow: "冻结至第 {0} 行",
    freezeCol: "冻结至第 {0} 列",
    unfreezeRow: "取消冻结行",
    unfreezeCol: "取消冻结列"
  },
  "en-US": {
    insertRow: "Insert row",
    deleteRow: "Delete row",
    insertColumn: "Insert column",
    deleteColumn: "Delete column",
    clearContents: "Clear contents",
    reset: "Reset",
    filterTab: "Filter",
    sortTab: "Sort",
    sortAsc: "Sort A → Z",
    sortDesc: "Sort Z → A",
    selectAll: "Select all",
    searchPlaceholder: "Separate keywords with spaces",
    blankValue: "(Blanks)",
    filterOnly: "Filter only",
    cancel: "Cancel",
    confirm: "OK",
    fullscreenTitle: "Table",
    fullscreen: "Open table fullscreen",
    close: "Close",
    freezeRow: "Freeze to row {0}",
    freezeCol: "Freeze to column {0}",
    unfreezeRow: "Unfreeze rows",
    unfreezeCol: "Unfreeze columns"
  }
}, fh = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="14" y1="21" x2="21" y2="14"/><line x1="3" y1="21" x2="10" y2="14"/><line x1="10" y1="3" x2="3" y2="10"/></svg>', gh = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>', bh = 260;
function yh(e) {
  const { config: t, model: n } = e, o = (g) => {
    const y = Array.from(e.manualWidthCols, (f) => f >= g ? f + 1 : f);
    e.manualWidthCols.clear();
    for (const f of y) e.manualWidthCols.add(f);
  }, r = (g) => {
    const y = Array.from(e.manualWidthCols, (f) => f === g ? -1 : f > g ? f - 1 : f).filter((f) => f >= 0);
    e.manualWidthCols.clear();
    for (const f of y) e.manualWidthCols.add(f);
  }, i = () => {
    if (!t.autoColumnWidth) {
      e.columnWidths = Array.from(
        { length: n.columnCount },
        (y, f) => e.manualWidthCols.has(f) ? e.columnWidths[f] ?? t.defaultColumnWidth : t.defaultColumnWidth
      );
      return;
    }
    const g = ml();
    g.font = `${On}px ${_n}`, e.columnWidths = Array.from({ length: n.columnCount }, (y, f) => {
      if (e.manualWidthCols.has(f))
        return e.columnWidths[f] ?? t.defaultColumnWidth;
      let w = 0;
      for (let b = 0; b < n.rowCount; b += 1) {
        const k = n.getCell(b, f);
        k.length > 0 && (w = Math.max(w, g.measureText(k).width));
      }
      return Math.min(Math.max(Math.ceil(w) + 12, t.defaultColumnWidth), bh);
    });
  }, s = (g) => {
    let y = 1;
    for (let f = 0; f < n.columnCount; f += 1) {
      const w = n.getCell(g, f);
      if (w.length === 0) continue;
      const b = e.columnWidths[f] ?? t.defaultColumnWidth, k = pl(w, Math.max(b - zo * 2, 8)).length;
      k > y && (y = k);
    }
    return y <= 1 ? t.defaultRowHeight : Math.max(t.defaultRowHeight, y * Rn + 6);
  }, a = (g) => {
    var b;
    const y = n.rowHeights.reduce((k, v) => k + v, 0), f = l();
    if (g === void 0)
      for (let k = 0; k < f; k += 1)
        n.rowHeights[k] = s(k);
    else
      for (let k = 0; k < f; k += 1)
        n.getCell(k, g) === "" && n.rowHeights[k] === t.defaultRowHeight || (n.rowHeights[k] = s(k));
    n.rowHeights.reduce((k, v) => k + v, 0) !== y && ((b = t.onLayoutChange) == null || b.call(t));
  }, l = () => {
    var y;
    let g = n.cells.length - 1;
    for (; g >= 0 && ((y = n.cells[g]) != null && y.every((f) => f === "")); )
      g -= 1;
    return g + 1;
  }, c = () => {
    let g = -1;
    for (const y of n.cells)
      for (let f = y.length - 1; f > g; f -= 1)
        if (y[f] !== "") {
          g = f;
          break;
        }
    return g + 1;
  }, d = () => {
    const g = l();
    if (n.rowCount - g <= Math.max(t.autoAppendRowsThreshold, 0)) {
      const f = Math.min(
        g + Math.max(t.autoAppendRowsThreshold, 0) + Math.max(t.autoAppendRowsStep, 1),
        t.maxRowCount
      );
      n.rowCount < f && n.ensureCapacity(f, n.columnCount);
    }
  }, u = () => {
    if (!t.isAutoAppendCols)
      return;
    const g = Math.max(t.autoAppendColsStep, 1), y = c(), f = n.columnCount - y;
    let w = n.columnCount;
    f <= Math.max(t.autoAppendColsThreshold, 0) && (w = y + Math.max(t.autoAppendColsThreshold, 0) + g);
    const b = (E) => {
      let M = 0;
      for (let x = 0; x < E; x += 1)
        M += e.columnWidths[x] ?? t.defaultColumnWidth;
      return M;
    }, k = Math.max(e.canvas.clientWidth - t.rowHeaderWidth, 0);
    let v = 0;
    for (; k > 0 && b(w) < k && v < 1e3; )
      w += g, v += 1;
    w > n.columnCount && (n.ensureCapacity(n.rowCount, w), i());
  }, h = (g) => {
    if (t.isAutoAppendRows)
      return;
    const f = g + e.renderer.view.gridHeight + 200, w = Math.ceil(f / t.defaultRowHeight), b = Math.min(Math.max(w, t.minRowCount), t.maxRowCount);
    b > n.rowCount && n.ensureCapacity(b, n.columnCount);
  };
  return {
    shiftManualWidthColsForInsert: o,
    shiftManualWidthColsForDelete: r,
    recalcColumnWidths: i,
    recalcRowHeights: a,
    getDataRowCount: l,
    getDataColCount: c,
    ensureTrailingEmptyRows: d,
    ensureColumnCoverage: u,
    ensureRowsForViewport: h,
    scrollCellIntoViewWithExpand: (g, y) => {
      g >= n.rowCount - 1 && h(e.renderer.rowToTopPublic(Math.min(g + 1, t.maxRowCount - 1))), e.renderer.scrollCellIntoView(g, y);
    }
  };
}
function kh(e) {
  const { config: t, model: n } = e;
  let o = /* @__PURE__ */ new Set(), r = !0;
  const i = (g) => {
    if (e.filters.size === 0) return !0;
    for (const [y, f] of e.filters)
      if (f.size !== 0 && !f.has(n.getCell(g, y)))
        return !1;
    return !0;
  }, s = () => {
    const g = /* @__PURE__ */ new Set();
    if (e.filters.size === 0) return g;
    const y = e.layout.getDataRowCount();
    for (let f = 0; f < y; f += 1)
      i(f) || g.add(f);
    return g;
  }, a = () => {
    r = !0;
  }, l = () => (r && (o = s(), r = !1), o);
  return {
    invalidateHiddenRows: a,
    getHiddenRows: l,
    nextVisibleRow: (g, y) => {
      let f = g + y;
      const w = l();
      for (; f >= 0 && f < n.rowCount && w.has(f); )
        f += y;
      return Math.min(Math.max(f, 0), n.rowCount - 1);
    },
    applySort: (g, y) => {
      if (t.readOnly) return;
      const f = e.layout.getDataRowCount();
      if (f === 0) return;
      const w = n.cells.length, b = Array.from({ length: f }, (E, M) => M);
      b.sort((E, M) => {
        const x = fl(n.getCell(E, g), n.getCell(M, g));
        return y === "asc" ? x : -x;
      });
      const k = [...b, ...Array.from({ length: w - f }, (E, M) => f + M)], v = new Array(w);
      for (let E = 0; E < w; E += 1)
        v[k[E]] = E;
      n.sortRows(k, v), e.sortState = { col: g, dir: y }, a(), e.renderer.refreshFilteredCols(), e.selectionOps.clampSelection(), e.layout.recalcColumnWidths(), e.layout.recalcRowHeights(), e.emitChange(), e.scheduleRender();
    },
    resetColumnFilterSort: (g) => {
      var y;
      e.filters.delete(g), ((y = e.sortState) == null ? void 0 : y.col) === g && (e.sortState = null), a(), e.renderer.refreshFilteredCols(), e.scheduleRender();
    },
    applyFilterChange: () => {
      var f;
      const g = e.renderer.totalHeight;
      a(), e.renderer.refreshFilteredCols();
      const y = e.renderer.totalHeight;
      g !== y && ((f = t.onLayoutChange) == null || f.call(t)), e.scheduleRender();
    },
    getFilteredCols: () => {
      const g = /* @__PURE__ */ new Set();
      for (const [y, f] of e.filters)
        f.size > 0 && g.add(y);
      return e.sortState && g.add(e.sortState.col), g;
    }
  };
}
function wh(e) {
  const { config: t, model: n } = e, o = (i) => {
    if (!e.editing) return;
    const { row: s, col: a, initialValue: l } = e.editing, c = e.editorEl.value;
    if (e.editing = null, e.editorEl.style.display = "none", c !== l && (n.applyCellChanges([{ row: s, col: a, after: c }]), t.autoColumnWidth && e.layout.recalcColumnWidths(), e.layout.recalcRowHeights(a), t.isAutoAppendRows && e.layout.ensureTrailingEmptyRows(), e.emitChange()), i) {
      const d = e.filterSort.nextVisibleRow(s, 1);
      e.selectionOps.setAnchorAndSelection(d, a);
    }
    e.scheduleRender();
  };
  return { commitEdit: o, openEditor: (i, s, a) => {
    if (t.readOnly) return;
    o(!1);
    const l = e.renderer.colToLeftPublic(s) - e.renderer.scrollX + t.rowHeaderWidth, c = e.renderer.rowToTopPublic(i) - e.renderer.scrollY + t.columnHeaderHeight, d = e.columnWidths[s] ?? t.defaultColumnWidth, u = n.rowHeights[i] ?? t.defaultRowHeight;
    e.editorEl.value = a ?? n.getCell(i, s), e.editing = { row: i, col: s, initialValue: e.editorEl.value }, e.editorEl.style.display = "block", e.editorEl.style.left = `${l}px`, e.editorEl.style.top = `${c}px`, e.editorEl.style.width = `${d}px`, e.editorEl.style.height = `${u}px`, e.editorEl.focus(), a === void 0 ? e.editorEl.select() : e.editorEl.setSelectionRange(e.editorEl.value.length, e.editorEl.value.length), e.scheduleRender();
  } };
}
function vh(e) {
  const { config: t, model: n } = e, o = document.createElement("div");
  o.className = "mtable-context-menu", e.overlayContainer.appendChild(o);
  const r = () => {
    o.style.display = "none";
  };
  return { element: o, close: r, build: (s, a) => {
    o.innerHTML = "";
    const l = t.messages, c = [
      {
        label: l.insertRow,
        action: () => {
          t.readOnly || (n.insertRows(s, 1), e.selectionOps.clampSelection(), t.isAutoAppendRows && e.layout.ensureTrailingEmptyRows(), e.emitChange(), e.scheduleRender());
        }
      },
      {
        label: l.deleteRow,
        action: () => {
          t.readOnly || (n.deleteRows(s, 1), e.selectionOps.clampSelection(), t.isAutoAppendRows && e.layout.ensureTrailingEmptyRows(), e.emitChange(), e.scheduleRender());
        }
      },
      {
        label: l.insertColumn,
        action: () => {
          t.readOnly || (n.insertCols(a, 1), e.layout.shiftManualWidthColsForInsert(a), t.autoColumnWidth && e.layout.recalcColumnWidths(), e.layout.recalcRowHeights(), e.selectionOps.clampSelection(), e.emitChange(), e.scheduleRender());
        }
      },
      {
        label: l.deleteColumn,
        action: () => {
          t.readOnly || (n.deleteCols(a, 1), e.layout.shiftManualWidthColsForDelete(a), t.autoColumnWidth && e.layout.recalcColumnWidths(), e.layout.recalcRowHeights(), e.selectionOps.clampSelection(), e.layout.ensureColumnCoverage(), e.emitChange(), e.scheduleRender());
        }
      },
      {
        label: l.clearContents,
        action: () => {
          if (t.readOnly || !e.selection) return;
          const d = [];
          for (let u = e.selection.startRow; u <= e.selection.endRow; u += 1)
            for (let h = e.selection.startCol; h <= e.selection.endCol; h += 1)
              n.getCell(u, h) !== "" && d.push({ row: u, col: h, after: "" });
          n.applyCellChanges(d), e.layout.recalcRowHeights(), e.emitChange(), e.scheduleRender();
        }
      },
      {
        label: e.freezeRow === s ? l.unfreezeRow : l.freezeRow.replace("{0}", String(s + 1)),
        action: () => {
          e.freezeRow = e.freezeRow === s ? -1 : s, e.filterSort.invalidateHiddenRows(), e.filterSort.applyFilterChange();
        }
      },
      {
        label: e.freezeCol === a ? l.unfreezeCol : l.freezeCol.replace("{0}", String(a + 1)),
        action: () => {
          e.freezeCol = e.freezeCol === a ? -1 : a, e.filterSort.invalidateHiddenRows(), e.filterSort.applyFilterChange();
        }
      }
    ];
    for (const d of c) {
      const u = document.createElement("div");
      u.className = "mtable-context-menu-item", u.textContent = d.label, t.readOnly && (u.dataset.disabled = "true"), u.addEventListener("click", () => {
        r(), t.readOnly || d.action();
      }), o.appendChild(u);
    }
  } };
}
const Ch = 260, Eh = 150;
function zh(e) {
  const { config: t, model: n } = e;
  let o = null, r = /* @__PURE__ */ new Set(), i = "", s = null, a = null;
  const l = () => {
    a !== null && (clearTimeout(a), a = null), o = null, s && (s.remove(), s = null);
  }, c = () => {
    if (!o) return;
    const { col: h } = o;
    if (r.size === 0) {
      l();
      return;
    }
    const p = new Set(r), g = io(n, e.layout.getDataRowCount(), h).length, y = e.filters.get(h), f = y ? Array.from(y).sort().join("\0") : "";
    Array.from(p).sort().join("\0") !== f && (p.size >= g ? e.filters.delete(h) : e.filters.set(h, p), e.filterSort.applyFilterChange()), l();
  }, d = () => {
    if (!s || !o) return;
    const { col: h, tab: p } = o, g = s.querySelector(".mtable-filter-panel-body");
    g.innerHTML = "";
    const y = t.messages;
    if (p === "sort") {
      const V = (K) => {
        var D;
        const z = document.createElement("div");
        z.className = "mtable-filter-sort-item";
        const H = ((D = e.sortState) == null ? void 0 : D.col) === h && e.sortState.dir === K;
        return H && (z.dataset.active = "true"), z.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${K === "asc" ? '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>' : '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>'}</svg><span>${K === "asc" ? y.sortAsc : y.sortDesc}</span>${H ? '<svg class="mtable-filter-sort-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>' : ""}`, z.addEventListener("click", () => {
          e.filterSort.applySort(h, K), l();
        }), z;
      };
      g.appendChild(V("asc")), g.appendChild(V("desc"));
      return;
    }
    const f = io(n, e.layout.getDataRowCount(), h), w = i.split(/\s+/).map((V) => V.toLowerCase()).filter((V) => V.length > 0), b = (V) => {
      if (w.length === 0) return !0;
      const K = V.toLowerCase();
      return w.some((z) => K.includes(z));
    }, k = document.createElement("input");
    k.type = "text", k.className = "mtable-filter-search", k.spellcheck = !1, k.placeholder = y.searchPlaceholder, k.value = i, k.addEventListener("input", () => {
      i = k.value, a !== null && clearTimeout(a), a = setTimeout(() => {
        a = null, s && o && d();
      }, Eh);
    }), g.appendChild(k);
    const v = document.createElement("div");
    v.className = "mtable-filter-list";
    const E = (V, K, z) => {
      const H = document.createElement("label");
      H.className = "mtable-filter-item";
      const D = document.createElement("input");
      D.type = "checkbox", D.checked = r.has(K), D.addEventListener("change", () => {
        D.checked ? r.add(K) : r.delete(K);
        const re = f.filter((fe) => b(fe.value)), B = re.length > 0 && re.every((fe) => r.has(fe.value)), te = re.every((fe) => !r.has(fe.value)), G = v.querySelector(".mtable-filter-item input");
        G && (G.checked = B, G.indeterminate = !B && !te);
      });
      const N = document.createElement("span");
      if (N.className = "mtable-filter-item-label", N.textContent = V, N.title = V, H.appendChild(D), H.appendChild(N), z !== null) {
        const re = document.createElement("span");
        re.className = "mtable-filter-item-count", re.textContent = `(${z})`, H.appendChild(re);
      }
      const ee = document.createElement("a");
      return ee.className = "mtable-filter-item-only", ee.textContent = y.filterOnly, ee.addEventListener("click", (re) => {
        re.preventDefault(), re.stopPropagation(), r = /* @__PURE__ */ new Set([K]), d();
      }), H.appendChild(ee), H;
    }, M = f.filter((V) => b(V.value)), x = M.length > 0 && M.every((V) => r.has(V.value)), T = M.every((V) => !r.has(V.value)), L = document.createElement("label");
    L.className = "mtable-filter-item mtable-filter-select-all";
    const S = document.createElement("input");
    S.type = "checkbox", S.checked = x, S.indeterminate = !x && !T, S.addEventListener("change", () => {
      if (S.checked)
        for (const V of M) r.add(V.value);
      else
        for (const V of M) r.delete(V.value);
      d();
    });
    const I = document.createElement("span");
    I.className = "mtable-filter-item-label", I.textContent = y.selectAll, L.appendChild(S), L.appendChild(I);
    const O = document.createElement("span");
    O.className = "mtable-filter-item-count";
    const J = M.filter((V) => r.has(V.value)).length;
    O.textContent = `(${J}/${M.length})`, L.appendChild(O), v.appendChild(L);
    for (const { value: V, count: K } of f)
      b(V) && v.appendChild(E(V === "" ? y.blankValue : V, V, K));
    g.appendChild(v);
  };
  return {
    close: l,
    open: (h) => {
      l(), e.contextMenu.close(), o = { col: h, tab: "filter" };
      const p = e.filters.get(h);
      r = p ? new Set(p) : new Set(io(n, e.layout.getDataRowCount(), h).map((V) => V.value)), i = "";
      const g = t.messages;
      s = document.createElement("div"), s.className = "mtable-filter-panel";
      const y = document.createElement("div");
      y.className = "mtable-filter-tabs";
      const f = (V, K) => {
        const z = document.createElement("button");
        return z.type = "button", z.className = "mtable-filter-tab", z.textContent = K, z.addEventListener("click", () => {
          o && (o.tab = V, y.querySelectorAll(".mtable-filter-tab").forEach((H) => H.removeAttribute("data-active")), z.dataset.active = "true", d());
        }), z;
      }, w = f("filter", g.filterTab);
      w.dataset.active = "true", y.appendChild(w), y.appendChild(f("sort", g.sortTab)), s.appendChild(y);
      const b = document.createElement("div");
      b.className = "mtable-filter-panel-body", s.appendChild(b);
      const k = document.createElement("div");
      k.className = "mtable-filter-footer";
      const v = document.createElement("button");
      v.type = "button", v.className = "mtable-filter-btn mtable-filter-btn-link", v.textContent = g.reset, v.addEventListener("click", () => {
        e.filterSort.resetColumnFilterSort(h), r = new Set(
          io(n, e.layout.getDataRowCount(), h).map((V) => V.value)
        ), d();
      }), k.appendChild(v);
      const E = document.createElement("span");
      E.className = "mtable-filter-footer-right";
      const M = document.createElement("button");
      M.type = "button", M.className = "mtable-filter-btn", M.textContent = g.cancel, M.addEventListener("click", l);
      const x = document.createElement("button");
      x.type = "button", x.className = "mtable-filter-btn mtable-filter-btn-primary", x.textContent = g.confirm, x.addEventListener("click", c), E.appendChild(M), E.appendChild(x), k.appendChild(E), s.appendChild(k), s.addEventListener("change", () => {
        s && (x.disabled = r.size === 0);
      }), e.overlayContainer.appendChild(s), d();
      const T = e.renderer.colToLeftPublic(h), L = e.columnWidths[h] ?? t.defaultColumnWidth, S = t.rowHeaderWidth + T + L - hl - ul / 2 - e.renderer.scrollX, I = e.canvas.getBoundingClientRect(), O = I.left + S - Ch / 2, J = I.top + t.columnHeaderHeight + 4;
      s.style.left = `${Math.max(O, 8)}px`, s.style.top = `${Math.max(J, 8)}px`;
    },
    get state() {
      return o;
    },
    get popup() {
      return s;
    }
  };
}
function Mh(e) {
  const { config: t, wrapper: n, canvas: o } = e;
  let r = null, i = null;
  const s = (c) => {
    const d = c ?? document.body;
    d !== e.overlayContainer && (e.filterPanel.close(), d.appendChild(e.contextMenu.element), e.overlayContainer = d);
  }, a = () => {
    const c = r;
    c && (r = null, document.removeEventListener("keydown", c.handleKeyDown), s(i), i = null, c.host.remove(), t.root.appendChild(n), o.focus());
  }, l = () => {
    if (r) return;
    e.filterPanel.close(), e.contextMenu.close();
    const c = n.getRootNode(), d = c instanceof ShadowRoot ? c : document.body, u = t.messages, h = document.createElement("div");
    h.className = "mtable-dialog-host", h.style.zIndex = "2147483647";
    const p = document.createElement("div");
    p.className = "mtable-fullscreen-overlay";
    const g = document.createElement("div");
    g.className = "mtable-fullscreen-window", g.setAttribute("role", "dialog"), g.setAttribute("aria-label", u.fullscreenTitle);
    const y = document.createElement("div");
    y.className = "mtable-fullscreen-header";
    const f = document.createElement("span");
    f.className = "mtable-fullscreen-title", f.textContent = u.fullscreenTitle;
    const w = document.createElement("button");
    w.type = "button", w.className = "mtable-fullscreen-close", w.innerHTML = gh, w.title = `${u.close} (Esc)`, w.setAttribute("aria-label", w.title), w.addEventListener("click", a), y.append(f, w);
    const b = document.createElement("div");
    b.className = "mtable-fullscreen-body", g.append(y, b), p.appendChild(g), h.appendChild(p), d.appendChild(h), i = e.overlayContainer, s(h), n.style.height = "100%", b.appendChild(n);
    const k = (v) => {
      v.key !== "Escape" || v.defaultPrevented || (v.preventDefault(), a());
    };
    document.addEventListener("keydown", k), r = { host: h, handleKeyDown: k }, o.focus();
  };
  return e.expandButton.addEventListener("click", l), { open: l, close: a, setOverlayContainer: s };
}
const Hn = 10, Ze = (e, t) => {
  const n = e.getBoundingClientRect();
  return { x: t.clientX - n.left, y: t.clientY - n.top };
}, Mo = (e, t, n, o = qu) => {
  if (n >= e.config.columnHeaderHeight || t < e.config.rowHeaderWidth) return null;
  const r = t - e.config.rowHeaderWidth + e.renderer.scrollX;
  let i = 0;
  for (let s = 0; s < e.columnWidths.length; s += 1)
    if (i += e.columnWidths[s] ?? e.config.defaultColumnWidth, Math.abs(r - i) <= o)
      return s;
  return null;
}, Th = (e, t, n) => {
  const o = t - e.config.rowHeaderWidth + e.renderer.scrollX;
  let r = 0;
  for (let i = 0; i < e.columnWidths.length; i += 1)
    if (r += e.columnWidths[i] ?? e.config.defaultColumnWidth, Math.abs(o - r) <= n)
      return i;
  return null;
}, Ao = (e, t) => e.config.rowHeaderWidth + e.renderer.colToLeftPublic(t + 1) - e.renderer.scrollX, so = 28, ao = 10;
function xh(e) {
  const { config: t, canvas: n, model: o } = e;
  let r = !1, i = null, s = null, a = null, l = { x: 0, y: 0 }, c = { x: 0, y: 0 };
  const d = () => {
    a !== null && (cancelAnimationFrame(a), a = null);
  }, u = () => {
    if (a = null, !r || l.x === 0 && l.y === 0) return;
    const T = Math.max(e.renderer.totalWidth - e.renderer.view.gridWidth, 0), L = Math.max(e.renderer.totalHeight - e.renderer.view.gridHeight, 0);
    e.renderer.scrollX = Math.min(Math.max(e.renderer.scrollX + l.x, 0), T), e.renderer.scrollY = Math.min(Math.max(e.renderer.scrollY + l.y, 0), L), t.isAutoAppendRows || e.layout.ensureRowsForViewport(e.renderer.scrollY);
    const S = Math.min(Math.max(c.x, t.rowHeaderWidth), t.rowHeaderWidth + e.renderer.view.gridWidth - 1), I = Math.min(Math.max(c.y, t.columnHeaderHeight), t.columnHeaderHeight + e.renderer.view.gridHeight - 1), O = e.renderer.hitTestCell(S, I);
    O && e.selectionOps.extendSelectionTo(O.row, O.col), e.scheduleRender(), a = requestAnimationFrame(u);
  }, h = (T, L) => {
    c = { x: T, y: L };
    const S = t.rowHeaderWidth, I = t.columnHeaderHeight, O = t.rowHeaderWidth + e.renderer.view.gridWidth, J = t.columnHeaderHeight + e.renderer.view.gridHeight, V = (z, H, D) => {
      if (z < H) return -ao * 3;
      if (z > D) return ao * 3;
      const N = z - H, ee = D - z;
      return N < so ? -ao * (1 + (1 - N / so) * 2) : ee < so ? ao * (1 + (1 - ee / so) * 2) : 0;
    };
    l = { x: V(T, S, O), y: V(L, I, J) };
    const K = r && (l.x !== 0 || l.y !== 0);
    K && a === null ? a = requestAnimationFrame(u) : !K && a !== null && d();
  }, p = (T) => {
    var H;
    if (e.contextMenu.close(), T.button !== 0) return;
    const { x: L, y: S } = Ze(n, T), I = e.renderer.hitTestFilterArrow(L, S);
    e.filterPanel.state && e.filterPanel.popup && !e.filterPanel.popup.contains(T.target) && I !== e.filterPanel.state.col && e.filterPanel.close();
    const O = e.renderer.hitTestScrollbar(L, S);
    if (O) {
      const D = O === "v" ? e.renderer.verticalScrollbarGeometry : e.renderer.horizontalScrollbarGeometry;
      if (D) {
        const N = O === "v" ? S : L, ee = N >= D.thumbStart && N <= D.thumbStart + D.thumbLength;
        e.renderer.scrollbarActive = O, e.renderer.scrollbarDragging = !0, i = { type: O, grabOffset: ee ? N - D.thumbStart : D.thumbLength / 2 }, e.renderer.dragScrollbarTo(O, L, S, i.grabOffset), O === "v" && e.layout.ensureRowsForViewport(e.renderer.scrollY), n.style.cursor = "default", window.addEventListener("mousemove", g), n.focus(), e.scheduleRender();
      }
      return;
    }
    if (e.editing) {
      const D = e.renderer.hitTestCell(L, S);
      if (!D || D.row !== e.editing.row || D.col !== e.editing.col)
        e.cellEditor.commitEdit(!1);
      else
        return;
    }
    const J = e.renderer.hitTestFilterArrow(L, S, e.touchTapDispatch ? Hn : void 0);
    if (J !== null) {
      ((H = e.filterPanel.state) == null ? void 0 : H.col) === J ? e.filterPanel.close() : e.filterPanel.open(J), n.style.cursor = "pointer", e.scheduleRender();
      return;
    }
    const V = Mo(e, L, S, e.touchTapDispatch ? Hn : void 0);
    if (V !== null) {
      s = { col: V, startX: L, startWidth: e.columnWidths[V] ?? t.defaultColumnWidth }, e.renderer.columnResizeLine = Ao(e, V), n.style.cursor = "col-resize", window.addEventListener("mousemove", y), window.addEventListener("mouseup", f), e.scheduleRender();
      return;
    }
    const K = e.renderer.hitTestHeader(L, S);
    if (K) {
      K.type === "col" ? (e.anchor = { row: 0, col: K.index }, e.selection = Ot(
        { startRow: 0, startCol: K.index, endRow: o.rowCount - 1, endCol: K.index },
        o.rowCount,
        o.columnCount
      )) : (e.anchor = { row: K.index, col: 0 }, e.selection = Ot(
        { startRow: K.index, startCol: 0, endRow: K.index, endCol: o.columnCount - 1 },
        o.rowCount,
        o.columnCount
      )), r = !0, e.scheduleRender(), n.focus();
      return;
    }
    const z = e.renderer.hitTestCell(L, S);
    z && (T.shiftKey ? e.selectionOps.extendSelectionTo(z.row, z.col) : e.selectionOps.setAnchorAndSelection(z.row, z.col), r = !0, e.scheduleRender(), n.focus());
  }, g = (T) => {
    if (!i) return;
    const { x: L, y: S } = Ze(n, T);
    e.renderer.dragScrollbarTo(i.type, L, S, i.grabOffset), i.type === "v" && e.layout.ensureRowsForViewport(e.renderer.scrollY), e.scheduleRender();
  }, y = (T) => {
    if (!s) return;
    const { x: L } = Ze(n, T), S = Math.max(s.startWidth + (L - s.startX), dl), I = s.col;
    (e.columnWidths[I] ?? t.defaultColumnWidth) !== S && (e.columnWidths[I] = S, e.manualWidthCols.add(I), e.renderer.columnResizeLine = Ao(e, I), e.layout.recalcRowHeights(I), e.scheduleRender());
  }, f = (T) => {
    if (!s) return;
    s = null, e.renderer.columnResizeLine = null, window.removeEventListener("mousemove", y), window.removeEventListener("mouseup", f);
    const { x: L, y: S } = Ze(n, T);
    n.style.cursor = Mo(e, L, S) !== null ? "col-resize" : "", e.scheduleRender();
  };
  return {
    handleMouseDown: p,
    handleMouseMove: (T) => {
      var H, D;
      if (i || s) return;
      const { x: L, y: S } = Ze(n, T), I = e.renderer.hitTestScrollbar(L, S);
      I !== e.renderer.scrollbarActive && (e.renderer.scrollbarActive = I, e.scheduleRender());
      const O = Mo(e, L, S), J = e.renderer.hitTestFilterArrow(L, S);
      J !== e.renderer.hoveredFilterArrow && (e.renderer.hoveredFilterArrow = J, e.scheduleRender()), n.style.cursor = I ? "default" : J !== null ? "pointer" : O !== null ? "col-resize" : "";
      const K = O !== null ? null : e.renderer.hitTestHeader(L, S);
      if (((K == null ? void 0 : K.type) !== ((H = e.hoveredHeader) == null ? void 0 : H.type) || (K == null ? void 0 : K.index) !== ((D = e.hoveredHeader) == null ? void 0 : D.index)) && (e.hoveredHeader = K, e.scheduleRender()), r) {
        const N = e.renderer.hitTestCell(L, S);
        N && (e.selectionOps.extendSelectionTo(N.row, N.col), e.scheduleRender()), h(L, S);
      }
    },
    handleMouseUp: (T) => {
      if (r = !1, d(), i) {
        i = null, e.renderer.scrollbarDragging = !1, window.removeEventListener("mousemove", g);
        const { x: L, y: S } = Ze(n, T);
        e.renderer.scrollbarActive = e.renderer.hitTestScrollbar(L, S), n.style.cursor = e.renderer.scrollbarActive ? "default" : "", e.scheduleRender();
      }
    },
    handleMouseLeave: () => {
      !i && !s && ((e.hoveredHeader !== null || e.renderer.scrollbarActive !== null) && (e.hoveredHeader = null, e.renderer.scrollbarActive = null, e.scheduleRender()), n.style.cursor = "");
    },
    handleDoubleClick: (T) => {
      const { x: L, y: S } = Ze(n, T), I = e.renderer.hitTestCell(L, S);
      !I || t.readOnly || e.cellEditor.openEditor(I.row, I.col, o.getCell(I.row, I.col));
    },
    handleContextMenu: (T) => {
      T.preventDefault();
      const { x: L, y: S } = Ze(n, T), I = e.renderer.hitTestHeader(L, S), O = e.renderer.hitTestCell(L, S), J = (I == null ? void 0 : I.type) === "row" ? I.index : O == null ? void 0 : O.row, V = (I == null ? void 0 : I.type) === "col" ? I.index : O == null ? void 0 : O.col;
      J === void 0 || V === void 0 || ((!e.selection || J < e.selection.startRow || J > e.selection.endRow || V < e.selection.startCol || V > e.selection.endCol) && (e.selectionOps.setAnchorAndSelection(J, V), e.scheduleRender()), e.contextMenu.build(J, V), e.contextMenu.element.style.display = "block", e.contextMenu.element.style.left = `${T.clientX}px`, e.contextMenu.element.style.top = `${T.clientY}px`);
    },
    handleWheel: (T) => {
      e.touch.stopMomentum(), d();
      const L = T.deltaMode === 1 ? T.deltaX * 16 : T.deltaX, S = T.deltaMode === 1 ? T.deltaY * 16 : T.deltaY;
      if (t.isAutoAppendRows) {
        const J = Math.max(e.renderer.totalWidth - e.renderer.view.gridWidth, 0), V = Math.max(e.renderer.totalHeight - e.renderer.view.gridHeight, 0), K = e.renderer.scrollY <= 0 && S < 0, z = e.renderer.scrollY >= V && S > 0;
        if (S !== 0 && (K || z))
          return;
        T.preventDefault(), e.renderer.scrollX = Math.min(Math.max(e.renderer.scrollX + L, 0), J), e.renderer.scrollY = Math.min(Math.max(e.renderer.scrollY + S, 0), V), e.scheduleRender();
        return;
      }
      T.preventDefault(), e.layout.ensureRowsForViewport(e.renderer.scrollY + S);
      const I = Math.max(e.renderer.totalWidth - e.renderer.view.gridWidth, 0), O = Math.max(e.renderer.totalHeight - e.renderer.view.gridHeight, 0);
      e.renderer.scrollX = Math.min(Math.max(e.renderer.scrollX + L, 0), I), e.renderer.scrollY = Math.min(Math.max(e.renderer.scrollY + S, 0), O), e.scheduleRender();
    },
    stopAutoScroll: d,
    dispose: () => {
      window.removeEventListener("mousemove", g), window.removeEventListener("mousemove", y), window.removeEventListener("mouseup", f);
    }
  };
}
const Sh = 10, Lh = 500;
function Ah(e) {
  const { config: t, canvas: n } = e;
  let o = null, r = null, i = null;
  const s = () => {
    i !== null && (cancelAnimationFrame(i), i = null);
  }, a = (y) => {
    let f = n.parentElement;
    for (; f && f !== document.body; ) {
      const w = getComputedStyle(f).overflowY;
      if ((w === "auto" || w === "scroll") && f.scrollHeight > f.clientHeight) {
        f.scrollTop += y;
        return;
      }
      f = f.parentElement;
    }
    window.scrollBy(0, y);
  }, l = (y, f) => {
    const w = Math.max(e.renderer.totalWidth - e.renderer.view.gridWidth, 0), b = Math.max(e.renderer.totalHeight - e.renderer.view.gridHeight, 0), k = e.renderer.scrollX - y, v = e.renderer.scrollY - f;
    e.renderer.scrollX = Math.min(Math.max(k, 0), w), e.renderer.scrollY = Math.min(Math.max(v, 0), b), t.isAutoAppendRows || e.layout.ensureRowsForViewport(e.renderer.scrollY);
    const E = v - e.renderer.scrollY;
    return t.isAutoAppendRows && Math.abs(E) > 0.5 && a(E), e.scheduleRender(), E;
  }, c = (y, f) => {
    s();
    let w = y, b = f, k = performance.now();
    const v = (E) => {
      const M = Math.min(E - k, 48);
      k = E;
      const x = 0.93 ** (M / 16.7);
      if (w *= x, b *= x, Math.abs(w) < 0.01 && Math.abs(b) < 0.01) {
        i = null;
        return;
      }
      const T = e.renderer.scrollX, L = e.renderer.scrollY, S = l(w * M, b * M), I = e.renderer.scrollX === T && Math.abs(w) > Math.abs(b), O = (S !== 0 || e.renderer.scrollY === L) && Math.abs(b) >= Math.abs(w);
      if (I || O) {
        i = null;
        return;
      }
      i = requestAnimationFrame(v);
    };
    i = requestAnimationFrame(v);
  }, d = () => {
    (o == null ? void 0 : o.longPressTimer) !== null && (o == null ? void 0 : o.longPressTimer) !== void 0 && window.clearTimeout(o.longPressTimer), o = null;
  };
  return {
    handleTouchStart: (y) => {
      s(), e.contextMenu.close();
      const f = Ze(n, y.changedTouches[0]), w = e.renderer.hitTestFilterArrow(f.x, f.y, Hn);
      e.filterPanel.state && e.filterPanel.popup && !e.filterPanel.popup.contains(y.target) && w !== e.filterPanel.state.col && e.filterPanel.close();
      const b = y.changedTouches[0], k = Ze(n, b);
      e.hoveredHeader = null, e.renderer.hoveredFilterArrow = null, o = {
        id: b.identifier,
        startX: k.x,
        startY: k.y,
        lastX: k.x,
        lastY: k.y,
        lastTime: y.timeStamp || performance.now(),
        moved: !1,
        mode: "pan",
        scrollbar: null,
        colResize: null,
        resizeCandidate: null,
        velocityX: 0,
        velocityY: 0,
        longPressTimer: null,
        longPressFired: !1
      };
      const v = o, E = e.renderer.hitTestScrollbar(k.x, k.y);
      if (E) {
        const M = E === "v" ? e.renderer.verticalScrollbarGeometry : e.renderer.horizontalScrollbarGeometry;
        if (e.renderer.scrollbarActive = E, M) {
          const x = E === "v" ? k.y : k.x, T = x >= M.thumbStart && x <= M.thumbStart + M.thumbLength;
          e.renderer.scrollbarDragging = !0, v.mode = "scrollbar", v.scrollbar = { type: E, grabOffset: T ? x - M.thumbStart : M.thumbLength / 2 }, e.renderer.dragScrollbarTo(E, k.x, k.y, v.scrollbar.grabOffset), E === "v" && e.layout.ensureRowsForViewport(e.renderer.scrollY);
        }
      } else {
        const M = k.y < t.columnHeaderHeight ? Mo(e, k.x, k.y, Hn) : Th(e, k.x, Hn);
        if (M !== null)
          v.resizeCandidate = { col: M, startWidth: e.columnWidths[M] ?? t.defaultColumnWidth };
        else if (e.editing) {
          const x = e.renderer.hitTestCell(k.x, k.y);
          (!x || x.row !== e.editing.row || x.col !== e.editing.col) && e.cellEditor.commitEdit(!1);
        }
        v.longPressTimer = window.setTimeout(() => {
          !o || o.id !== b.identifier || o.moved || (o.longPressFired = !0, n.dispatchEvent(new MouseEvent("contextmenu", {
            bubbles: !0,
            cancelable: !0,
            clientX: b.clientX,
            clientY: b.clientY
          })));
        }, Lh);
      }
      y.preventDefault();
    },
    handleTouchMove: (y) => {
      var x;
      const f = o;
      if (!f) return;
      let w = null;
      for (let T = 0; T < y.changedTouches.length; T += 1)
        if (((x = y.changedTouches[T]) == null ? void 0 : x.identifier) === f.id) {
          w = y.changedTouches[T];
          break;
        }
      if (!w) return;
      const b = Ze(n, w), k = y.timeStamp || performance.now(), v = Math.max(k - f.lastTime, 1), E = b.x - f.lastX, M = b.y - f.lastY;
      if (f.lastX = b.x, f.lastY = b.y, f.lastTime = k, !f.moved) {
        if (Math.hypot(b.x - f.startX, b.y - f.startY) < Sh)
          return;
        f.moved = !0, f.longPressTimer !== null && (window.clearTimeout(f.longPressTimer), f.longPressTimer = null), f.resizeCandidate && (Math.abs(b.x - f.startX) >= Math.abs(b.y - f.startY) && (f.mode = "colResize", f.colResize = f.resizeCandidate, e.renderer.columnResizeLine = Ao(e, f.colResize.col)), f.resizeCandidate = null);
      }
      if (!f.longPressFired) {
        if (f.velocityX = f.velocityX * 0.7 + E / v * 0.3, f.velocityY = f.velocityY * 0.7 + M / v * 0.3, f.mode === "scrollbar" && f.scrollbar)
          e.renderer.dragScrollbarTo(f.scrollbar.type, b.x, b.y, f.scrollbar.grabOffset), f.scrollbar.type === "v" && e.layout.ensureRowsForViewport(e.renderer.scrollY);
        else if (f.mode === "colResize" && f.colResize) {
          const T = Math.max(f.colResize.startWidth + (b.x - f.startX), dl);
          (e.columnWidths[f.colResize.col] ?? t.defaultColumnWidth) !== T && (e.columnWidths[f.colResize.col] = T, e.manualWidthCols.add(f.colResize.col), e.renderer.columnResizeLine = Ao(e, f.colResize.col), e.layout.recalcRowHeights(f.colResize.col));
        } else
          l(E, M);
        e.scheduleRender(), y.preventDefault();
      }
    },
    handleTouchEnd: (y) => {
      var T;
      const f = o;
      if (!f) return;
      let w = !1;
      for (let L = 0; L < y.changedTouches.length; L += 1)
        if (((T = y.changedTouches[L]) == null ? void 0 : T.identifier) === f.id) {
          w = !0;
          break;
        }
      if (!w) return;
      f.longPressTimer !== null && window.clearTimeout(f.longPressTimer);
      const b = f.moved, k = f.longPressFired, v = f.mode, E = f.velocityX, M = f.velocityY, x = { x: f.lastX, y: f.lastY };
      if (o = null, y.preventDefault(), v === "scrollbar") {
        e.renderer.scrollbarDragging = !1, e.renderer.scrollbarActive = e.renderer.hitTestScrollbar(x.x, x.y), e.scheduleRender();
        return;
      }
      if (v === "colResize") {
        e.renderer.columnResizeLine = null, e.scheduleRender();
        return;
      }
      if (!k) {
        if (!b) {
          const L = performance.now(), S = r !== null && L - r.time < 350 && Math.hypot(x.x - r.x, x.y - r.y) < 20;
          r = S ? null : { time: L, x: x.x, y: x.y };
          const I = n.getBoundingClientRect();
          e.touchTapDispatch = !0;
          try {
            if (S) {
              n.dispatchEvent(new MouseEvent("dblclick", {
                bubbles: !0,
                cancelable: !0,
                clientX: I.left + x.x,
                clientY: I.top + x.y
              }));
              return;
            }
            n.dispatchEvent(new MouseEvent("mousedown", {
              bubbles: !0,
              cancelable: !0,
              button: 0,
              clientX: I.left + x.x,
              clientY: I.top + x.y
            })), window.dispatchEvent(new MouseEvent("mouseup", {
              bubbles: !0,
              cancelable: !0,
              button: 0,
              clientX: I.left + x.x,
              clientY: I.top + x.y
            }));
          } finally {
            e.touchTapDispatch = !1;
          }
          return;
        }
        (Math.abs(E) > 0.05 || Math.abs(M) > 0.05) && c(E, M);
      }
    },
    handleTouchCancel: (y) => {
      var w;
      const f = o;
      if (f) {
        for (let b = 0; b < y.changedTouches.length; b += 1)
          if (((w = y.changedTouches[b]) == null ? void 0 : w.identifier) === f.id) {
            f.mode === "colResize" && (e.renderer.columnResizeLine = null), f.mode === "scrollbar" && (e.renderer.scrollbarDragging = !1, e.renderer.scrollbarActive = null), d(), e.scheduleRender();
            break;
          }
      }
    },
    stopMomentum: s
  };
}
const Ih = /Mac|iPhone|iPad|iPod/, Rh = () => {
  if (typeof navigator > "u")
    return !1;
  const e = navigator.userAgentData;
  return typeof (e == null ? void 0 : e.platform) == "string" && e.platform.length > 0 ? /mac|iphone|ipad|ipod/i.test(e.platform) : Ih.test(navigator.userAgent);
};
function Nh(e) {
  const { config: t, canvas: n, model: o } = e, r = (s) => {
    var c, d;
    if (e.editing) {
      if (s.key === "Enter")
        s.preventDefault(), e.cellEditor.commitEdit(!0), n.focus({ preventScroll: !0 });
      else if (s.key === "Escape")
        s.preventDefault(), e.editing = null, e.editorEl.style.display = "none", n.focus(), e.scheduleRender();
      else if (s.key === "Tab") {
        s.preventDefault();
        const u = ((c = e.selection) == null ? void 0 : c.startRow) ?? e.editing.row, h = ((d = e.selection) == null ? void 0 : d.startCol) ?? e.editing.col;
        e.cellEditor.commitEdit(!1), e.selectionOps.setAnchorAndSelection(u, Math.min(h + 1, o.columnCount - 1)), n.focus({ preventScroll: !0 });
      }
      return;
    }
    const l = Rh() ? s.metaKey : s.ctrlKey;
    if (l && (s.key === "z" || s.key === "Z")) {
      s.preventDefault(), s.shiftKey ? o.redo() : o.undo(), i(s.shiftKey ? "redo" : "undo");
      return;
    }
    if (l && (s.key === "y" || s.key === "Y")) {
      s.preventDefault(), o.redo(), i("redo");
      return;
    }
    if (s.key === "ArrowUp" || s.key === "ArrowDown" || s.key === "ArrowLeft" || s.key === "ArrowRight") {
      if (s.preventDefault(), !e.selection) {
        e.selectionOps.setAnchorAndSelection(0, 0), e.scheduleRender();
        return;
      }
      const u = s.shiftKey ? { row: s.key === "ArrowUp" ? -1 : s.key === "ArrowDown" ? 1 : 0, col: s.key === "ArrowLeft" ? -1 : s.key === "ArrowRight" ? 1 : 0 } : null;
      if (u) {
        const h = u.row < 0 ? -1 : 1, p = u.row !== 0 ? e.filterSort.nextVisibleRow(e.selection.endRow, h) : e.selection.endRow;
        e.selectionOps.extendSelectionTo(
          Math.min(Math.max(p, 0), o.rowCount - 1),
          Math.min(Math.max(e.selection.endCol + u.col, 0), o.columnCount - 1)
        );
      } else {
        const h = s.key === "ArrowUp" ? e.filterSort.nextVisibleRow(e.selection.startRow, -1) : s.key === "ArrowDown" ? e.filterSort.nextVisibleRow(e.selection.startRow, 1) : e.selection.startRow, p = s.key === "ArrowLeft" ? Math.max(e.selection.startCol - 1, 0) : s.key === "ArrowRight" ? Math.min(e.selection.startCol + 1, o.columnCount - 1) : e.selection.startCol;
        e.selectionOps.setAnchorAndSelection(h, p);
      }
      e.scheduleRender();
      return;
    }
    if (s.key === "Enter" || s.key === "F2") {
      if (!e.selection)
        return;
      s.preventDefault(), e.cellEditor.openEditor(e.selection.startRow, e.selection.startCol);
      return;
    }
    if (s.key === "Delete" || s.key === "Backspace") {
      if (s.preventDefault(), t.readOnly || !e.selection) return;
      const u = [];
      for (let h = e.selection.startRow; h <= e.selection.endRow; h += 1)
        for (let p = e.selection.startCol; p <= e.selection.endCol; p += 1)
          o.getCell(h, p) !== "" && u.push({ row: h, col: p, after: "" });
      o.applyCellChanges(u), e.layout.recalcRowHeights(), e.emitChange(), e.scheduleRender();
      return;
    }
    if (s.key === "Tab") {
      if (!e.selection)
        return;
      s.preventDefault();
      const u = s.shiftKey ? Math.max(e.selection.startCol - 1, 0) : Math.min(e.selection.startCol + 1, o.columnCount - 1);
      e.selectionOps.setAnchorAndSelection(e.selection.startRow, u), e.scheduleRender();
      return;
    }
    if (s.key === "Home") {
      if (!e.selection)
        return;
      s.preventDefault(), e.selectionOps.setAnchorAndSelection(s.ctrlKey ? 0 : e.selection.startRow, 0), e.scheduleRender();
      return;
    }
    if (s.key === "End") {
      if (!e.selection)
        return;
      s.preventDefault(), e.selectionOps.setAnchorAndSelection(e.selection.startRow, o.columnCount - 1), e.scheduleRender();
      return;
    }
    if (s.key === "PageUp" || s.key === "PageDown") {
      if (!e.selection)
        return;
      s.preventDefault();
      const u = Math.max(Math.floor(e.renderer.view.gridHeight / t.defaultRowHeight) - 1, 1), h = s.key === "PageUp" ? -1 : 1;
      let p = e.selection.startRow;
      for (let g = 0; g < u; g += 1) {
        const y = e.filterSort.nextVisibleRow(p, h);
        if (y === p) break;
        p = y;
      }
      e.selectionOps.setAnchorAndSelection(p, e.selection.startCol), e.scheduleRender();
      return;
    }
    if (!l && !s.altKey && s.key.length === 1) {
      if (!e.selection)
        return;
      s.preventDefault(), e.cellEditor.openEditor(e.selection.startRow, e.selection.startCol, s.key);
    }
  }, i = (s) => {
    e.layout.recalcColumnWidths(), e.layout.recalcRowHeights(), t.isAutoAppendRows && e.layout.ensureTrailingEmptyRows(), e.layout.ensureColumnCoverage(), e.selectionOps.clampSelection(), e.emitChange(s), e.scheduleRender();
  };
  return { handleKeyDown: r };
}
function Ph(e) {
  const { config: t, model: n } = e, o = (s) => {
    var l;
    if (e.editing || !e.selection) return;
    const a = [];
    for (let c = e.selection.startRow; c <= e.selection.endRow; c += 1) {
      const d = [];
      for (let u = e.selection.startCol; u <= e.selection.endCol; u += 1)
        d.push(n.getCell(c, u));
      a.push(d);
    }
    (l = s.clipboardData) == null || l.setData("text/plain", ll(a, t.delimiter)), s.preventDefault();
  };
  return { handleCopy: o, handleCut: (s) => {
    if (e.editing || t.readOnly || !e.selection) return;
    o(s);
    const a = [];
    for (let l = e.selection.startRow; l <= e.selection.endRow; l += 1)
      for (let c = e.selection.startCol; c <= e.selection.endCol; c += 1)
        n.getCell(l, c) !== "" && a.push({ row: l, col: c, after: "" });
    n.applyCellChanges(a), e.layout.recalcRowHeights(), e.emitChange(), e.scheduleRender();
  }, handlePaste: (s) => {
    var h, p, g;
    if (e.editing || t.readOnly || !e.selection) return;
    const a = (h = s.clipboardData) == null ? void 0 : h.getData("text/plain");
    if (a === void 0 || a.length === 0) return;
    s.preventDefault();
    const l = al(a, t.delimiter), c = Math.min(e.selection.startRow + l.length, t.maxRowCount), d = e.selection.startCol + (((p = l[0]) == null ? void 0 : p.length) ?? 1);
    (c > n.rowCount || d > n.columnCount) && n.ensureCapacity(
      t.isAutoAppendRows ? c : Math.max(c, t.minRowCount),
      t.isAutoAppendCols ? d : Math.max(d, t.minColumnCount)
    );
    const u = [];
    for (let y = 0; y < l.length; y += 1) {
      const f = l[y] ?? [];
      for (let w = 0; w < f.length; w += 1) {
        const b = e.selection.startRow + y, k = e.selection.startCol + w;
        b < n.rowCount && k < n.columnCount && u.push({ row: b, col: k, after: f[w] ?? "" });
      }
    }
    n.applyCellChanges(u), e.layout.recalcColumnWidths(), e.layout.recalcRowHeights(), t.isAutoAppendRows && e.layout.ensureTrailingEmptyRows(), e.selection = Ot(
      {
        startRow: e.selection.startRow,
        startCol: e.selection.startCol,
        endRow: e.selection.startRow + l.length - 1,
        endCol: e.selection.startCol + (((g = l[0]) == null ? void 0 : g.length) ?? 1) - 1
      },
      n.rowCount,
      n.columnCount
    ), e.emitChange(), e.scheduleRender();
  } };
}
function Dh(e) {
  const {
    root: t,
    defaultValue: n = "",
    value: o,
    onChange: r,
    onLayoutChange: i,
    readOnly: s = !1,
    locale: a = "zh-CN",
    messages: l,
    fullscreenButton: c = !0,
    delimiter: d = ",",
    autoColumnWidth: u = !0,
    defaultColumnWidth: h = 88,
    defaultRowHeight: p = 24,
    rowHeaderWidth: g = 46,
    columnHeaderHeight: y = 20,
    rowMode: f = "infiniteScroll",
    autoAppendRowsThreshold: w = 1,
    autoAppendRowsStep: b = 1,
    colMode: k = "infiniteScroll",
    autoAppendColsThreshold: v = 2,
    autoAppendColsStep: E = 5,
    minRowCount: M = 100,
    minColumnCount: x = 20,
    maxRowCount: T = 5e3
  } = e, L = { ...ph[a], ...l }, S = document.createElement("div");
  S.className = "mtable-wrapper";
  const I = document.createElement("canvas");
  I.className = "mtable-canvas", S.appendChild(I), t.appendChild(S);
  const O = document.createElement("input");
  O.type = "text", O.className = "mtable-editor", O.spellcheck = !1, S.appendChild(O);
  const J = document.createElement("button");
  J.type = "button", J.className = "mtable-expand", J.innerHTML = fh, J.title = L.fullscreen, J.setAttribute("aria-label", J.title), c && S.appendChild(J);
  const V = {
    root: t,
    readOnly: s,
    delimiter: d,
    autoColumnWidth: u,
    defaultColumnWidth: h,
    defaultRowHeight: p,
    rowHeaderWidth: g,
    columnHeaderHeight: y,
    isAutoAppendRows: f === "autoAppendRows",
    isAutoAppendCols: k === "autoAppendCols",
    autoAppendRowsThreshold: w,
    autoAppendRowsStep: b,
    autoAppendColsThreshold: v,
    autoAppendColsStep: E,
    minRowCount: M,
    minColumnCount: x,
    maxRowCount: T,
    messages: L,
    onChange: r,
    onLayoutChange: i
  }, K = new wr({
    defaultColumnWidth: h,
    defaultRowHeight: p,
    minRowCount: M,
    minColumnCount: x
  }), z = {
    config: V,
    wrapper: S,
    canvas: I,
    editorEl: O,
    expandButton: J,
    overlayContainer: document.body,
    model: K,
    columnWidths: [],
    manualWidthCols: /* @__PURE__ */ new Set(),
    selection: null,
    editing: null,
    anchor: { row: 0, col: 0 },
    hoveredHeader: null,
    touchTapDispatch: !1,
    filters: /* @__PURE__ */ new Map(),
    sortState: null,
    freezeRow: -1,
    freezeCol: -1
  }, H = {
    get freezeRow() {
      return z.freezeRow;
    },
    get freezeCol() {
      return z.freezeCol;
    },
    get cells() {
      return z.model.cells;
    },
    get columnWidths() {
      return z.columnWidths;
    },
    get rowHeights() {
      return z.model.rowHeights;
    },
    /**
     * 被筛选隐藏的数据行号集合(渲染层跳过其绘制并折叠布局)。
     * 空集合 = 无筛选,全量渲染。
     */
    get hiddenRows() {
      return z.filterSort.getHiddenRows();
    },
    get selection() {
      return z.editing ? {
        startRow: z.editing.row,
        endRow: z.editing.row,
        startCol: z.editing.col,
        endCol: z.editing.col
      } : z.selection;
    },
    get editing() {
      return z.editing ? { row: z.editing.row, col: z.editing.col } : null;
    },
    get hoveredHeader() {
      return z.hoveredHeader;
    },
    isNumericCell(X, se) {
      return hh(z.model.getCell(X, se));
    },
    getFilteredCols() {
      return z.filterSort.getFilteredCols();
    }
  };
  z.renderer = new uh({
    canvas: I,
    source: H,
    defaultColumnWidth: h,
    defaultRowHeight: p,
    rowHeaderWidth: g,
    columnHeaderHeight: y
  });
  let D = null;
  z.scheduleRender = () => {
    D === null && (D = requestAnimationFrame(() => {
      D = null, z.renderer.render();
    }));
  };
  const N = () => {
    var ne;
    let X = z.model.cells.length - 1;
    for (; X >= 0 && ((ne = z.model.cells[X]) != null && ne.every((le) => le === "")); )
      X -= 1;
    if (X < 0)
      return "";
    const se = z.model.cells.slice(0, X + 1);
    let ae = -1;
    for (const le of se)
      for (let me = le.length - 1; me > ae; me -= 1)
        if (le[me] !== "") {
          ae = me;
          break;
        }
    return ae < 0 ? "" : ll(
      se.map((le) => le.length > ae + 1 ? le.slice(0, ae + 1) : le),
      d
    );
  };
  z.emitChange = (X = "input") => {
    z.filterSort.invalidateHiddenRows(), r == null || r(N(), X);
  };
  const ee = (X) => {
    z.model.cells = al(X, d), z.model.rowHeights = Array.from({ length: z.model.cells.length }, () => p), z.manualWidthCols.clear(), z.filters.clear(), z.sortState = null, z.freezeRow = -1, z.freezeCol = -1, z.filterSort.invalidateHiddenRows(), z.filterPanel.close();
    const se = z.model.cells.reduce((ae, ne) => Math.max(ae, ne.length), 0);
    z.model.ensureCapacity(
      0,
      V.isAutoAppendCols ? se + Math.max(v, 0) + Math.max(E, 1) : x
    ), V.isAutoAppendRows ? z.model.ensureCapacity(
      z.model.cells.length + Math.max(w, 0) + Math.max(b, 1),
      z.model.columnCount
    ) : z.model.ensureCapacity(
      Math.max(M, z.model.cells.length),
      z.model.columnCount
    ), z.model.clearHistory(), z.layout.recalcColumnWidths(), z.layout.ensureColumnCoverage(), z.layout.recalcRowHeights(), z.selection = null, z.anchor = { row: 0, col: 0 }, z.renderer.scrollX = 0, z.renderer.scrollY = 0, z.scheduleRender();
  }, re = (X) => {
    const se = X.composedPath(), ae = se.length > 0 ? se[0] : X.target;
    if (ae instanceof Node) {
      const ne = z.filterPanel.popup;
      if (ne != null && ne.contains(ae) || z.contextMenu.element.contains(ae) || S.contains(ae))
        return;
    }
    z.filterPanel.close(), z.contextMenu.close();
  };
  z.layout = yh(z), z.filterSort = kh(z), z.cellEditor = wh(z), z.selectionOps = mh(z), z.contextMenu = vh(z), z.filterPanel = zh(z), z.maximize = Mh(z), z.touch = Ah(z);
  const B = xh(z), te = Nh(z), G = Ph(z), fe = new ResizeObserver(() => {
    z.layout.ensureColumnCoverage(), z.scheduleRender();
  });
  fe.observe(S), I.tabIndex = 0, I.addEventListener("mousedown", B.handleMouseDown), I.addEventListener("mousemove", B.handleMouseMove), I.addEventListener("mouseleave", B.handleMouseLeave), window.addEventListener("mouseup", B.handleMouseUp), I.addEventListener("dblclick", B.handleDoubleClick), I.addEventListener("contextmenu", B.handleContextMenu), I.addEventListener("wheel", B.handleWheel, { passive: !1 }), I.addEventListener("touchstart", z.touch.handleTouchStart, { passive: !1 }), I.addEventListener("touchmove", z.touch.handleTouchMove, { passive: !1 }), I.addEventListener("touchend", z.touch.handleTouchEnd, { passive: !1 }), I.addEventListener("touchcancel", z.touch.handleTouchCancel, { passive: !1 }), I.addEventListener("keydown", te.handleKeyDown), O.addEventListener("keydown", te.handleKeyDown), I.addEventListener("copy", G.handleCopy), I.addEventListener("cut", G.handleCut), I.addEventListener("paste", G.handlePaste), O.addEventListener("blur", () => {
    z.cellEditor.commitEdit(!1);
  });
  const Ce = (X) => {
    re(X);
  };
  document.addEventListener("mousedown", Ce);
  let W = o;
  const U = o !== void 0 ? window.setInterval(() => {
    o !== W && (W = o, ee(o));
  }, 160) : null;
  return ee(n), {
    // 外部按下扩展点:宿主统一广播桥接入口(落点在表格/浮层外时收起浮层)
    notifyOutsidePress: re,
    getCsv: () => N(),
    setCsv: (X) => {
      ee(X), o !== void 0 && (W = o), z.emitChange();
    },
    getSelection: () => z.selection ? { ...z.selection } : null,
    setSelection: (X) => {
      const se = Math.min(Math.max(X.startRow, X.endRow) + 1, T), ae = Math.max(X.startCol, X.endCol) + 1;
      (se > z.model.rowCount || ae > z.model.columnCount) && z.model.ensureCapacity(
        V.isAutoAppendRows ? se : Math.max(se, M),
        V.isAutoAppendCols ? ae : Math.max(ae, x)
      ), z.selection = Ot(X, z.model.rowCount, z.model.columnCount), z.layout.scrollCellIntoViewWithExpand(z.selection.endRow, z.selection.startCol), z.scheduleRender();
    },
    clearSelection: () => {
      z.selection = null, z.anchor = { row: 0, col: 0 }, z.scheduleRender();
    },
    // 内容总高含水平滚动条轨道带(轨道带独立于网格,网格高度之外);
    // 行高取渲染布局高度(被筛选隐藏的行折叠为 0)
    getContentHeight: () => y + lt + z.renderer.totalHeight,
    getScroll: () => ({ x: z.renderer.scrollX, y: z.renderer.scrollY }),
    /** 当前生效的筛选条件(列 → 选中的原始值集合)。 */
    getFilters: () => {
      const X = {};
      for (const [se, ae] of z.filters)
        X[se] = Array.from(ae);
      return X;
    },
    /** 清除所有筛选(不改动数据)。 */
    clearFilters: () => {
      z.filters.size !== 0 && (z.filters.clear(), z.filterSort.applyFilterChange());
    },
    // 浮层挂载容器切换入口(宿主全屏弹窗打开时把浮层挂进弹窗宿主)
    setOverlayContainer: (X) => {
      z.maximize.setOverlayContainer(X);
    },
    undo: () => {
      z.model.undo(), z.layout.recalcColumnWidths(), z.layout.recalcRowHeights(), V.isAutoAppendRows && z.layout.ensureTrailingEmptyRows(), z.layout.ensureColumnCoverage(), z.selectionOps.clampSelection(), z.emitChange("undo"), z.scheduleRender();
    },
    redo: () => {
      z.model.redo(), z.layout.recalcColumnWidths(), z.layout.recalcRowHeights(), V.isAutoAppendRows && z.layout.ensureTrailingEmptyRows(), z.layout.ensureColumnCoverage(), z.selectionOps.clampSelection(), z.emitChange("redo"), z.scheduleRender();
    },
    focus: () => {
      I.focus();
    },
    destroy: () => {
      U !== null && window.clearInterval(U), D !== null && cancelAnimationFrame(D), fe.disconnect(), I.removeEventListener("mousedown", B.handleMouseDown), I.removeEventListener("mousemove", B.handleMouseMove), I.removeEventListener("mouseleave", B.handleMouseLeave), window.removeEventListener("mouseup", B.handleMouseUp), B.dispose(), I.removeEventListener("dblclick", B.handleDoubleClick), I.removeEventListener("contextmenu", B.handleContextMenu), I.removeEventListener("wheel", B.handleWheel), I.removeEventListener("touchstart", z.touch.handleTouchStart), I.removeEventListener("touchmove", z.touch.handleTouchMove), I.removeEventListener("touchend", z.touch.handleTouchEnd), I.removeEventListener("touchcancel", z.touch.handleTouchCancel), z.touch.stopMomentum(), B.stopAutoScroll(), I.removeEventListener("keydown", te.handleKeyDown), O.removeEventListener("keydown", te.handleKeyDown), I.removeEventListener("copy", G.handleCopy), I.removeEventListener("cut", G.handleCut), I.removeEventListener("paste", G.handlePaste), document.removeEventListener("mousedown", Ce), z.filterPanel.close(), z.maximize.close(), z.expandButton.removeEventListener("click", z.maximize.open), z.contextMenu.element.remove(), S.remove();
    }
  };
}
const Bh = {
  "zh-CN": {
    namePlaceholder: "JSON数据",
    addField: "添加字段",
    addRecord: "添加记录",
    deleteField: "删除字段",
    deleteRecord: "删除记录",
    newFieldName: "字段 {0}",
    fieldNamePlaceholder: "字段名",
    invalidData: "数据格式无效，已降级为只读展示。",
    typeNameText: "文本",
    typeNameNumber: "数字",
    typeNameSelect: "单选",
    typeNameMultiSelect: "多选",
    typeNameCheckbox: "勾选",
    typeNameDate: "日期",
    typeNameUrl: "链接",
    viewNameTable: "表格视图",
    viewNameKanban: "看板视图",
    viewNameGallery: "画廊视图",
    viewNameList: "列表视图",
    viewNameCalendar: "日历视图",
    viewNameGantt: "甘特视图",
    viewNameText: "文本视图",
    queryButton: "筛选与排序",
    filterSection: "筛选",
    sortSection: "排序",
    addFilter: "添加条件",
    sortNone: "不排序",
    sortAsc: "升序",
    sortDesc: "降序",
    removeCondition: "删除条件",
    filterFieldPlaceholder: "选择字段",
    filterValuePlaceholder: "值",
    calendarDateLabel: "日期字段",
    ganttStartLabel: "开始字段",
    ganttEndLabel: "结束字段",
    ungroupedLabel: "未分组",
    galleryNoImage: "画廊视图需要一个链接字段存放图片",
    kanbanNoGroup: "看板视图需要一个单选或多选字段进行分组",
    calendarNoDate: "日历视图需要一个日期字段",
    ganttNoDate: "甘特图视图需要开始与结束日期字段",
    addCard: "添加",
    opContains: "包含",
    opEquals: "等于",
    opNotEquals: "不等于",
    opGt: "大于",
    opLt: "小于",
    opIsEmpty: "为空",
    opIsNotEmpty: "不为空",
    undoButton: "撤销",
    redoButton: "重做",
    csvImport: "导入 CSV（追加记录，表头匹配字段名）",
    csvExport: "导出 CSV（文本字段）",
    csvExportNoField: "没有可导出的文本字段",
    tsvConfirm: "粘贴 {0} 行 × {1} 列",
    tsvAppend: "追加为新记录",
    tsvOverwrite: "覆盖到当前格",
    tsvCancel: "取消",
    calendarMonth: "{0} 年 {1} 月",
    calendarPrev: "上月",
    calendarNext: "下月",
    calendarToday: "今天",
    calendarWeekdays: "日,一,二,三,四,五,六",
    viewSelectLabel: "切换视图",
    codeFormat: "格式化",
    codeCopy: "复制全部",
    codeSelectAll: "全选",
    codeClear: "清空",
    invalidCsv: "不是有效的 CSV 文件",
    noImportableRecords: "没有可导入的记录",
    csvReadFailed: "读取文件失败，请重试",
    deleteFieldConfirm: "删除字段将同时清除该列数据",
    tableEmptyGuide: "点击 + 创建第一个字段，或导入 CSV",
    kanbanDropHere: "拖卡片到这里"
  },
  "en-US": {
    namePlaceholder: "JSON Data",
    addField: "Add field",
    addRecord: "Add record",
    deleteField: "Delete field",
    deleteRecord: "Delete record",
    newFieldName: "Field {0}",
    fieldNamePlaceholder: "Field name",
    invalidData: "Invalid data, shown as read-only.",
    typeNameText: "Text",
    typeNameNumber: "Number",
    typeNameSelect: "Select",
    typeNameMultiSelect: "Multi-select",
    typeNameCheckbox: "Checkbox",
    typeNameDate: "Date",
    typeNameUrl: "URL",
    viewNameTable: "Table view",
    viewNameKanban: "Kanban view",
    viewNameGallery: "Gallery view",
    viewNameList: "List view",
    viewNameCalendar: "Calendar view",
    viewNameGantt: "Gantt view",
    viewNameText: "Text view",
    queryButton: "Filter & sort",
    filterSection: "Filter",
    sortSection: "Sort",
    addFilter: "Add condition",
    sortNone: "Unsorted",
    sortAsc: "Ascending",
    sortDesc: "Descending",
    removeCondition: "Remove condition",
    filterFieldPlaceholder: "Pick a field",
    filterValuePlaceholder: "Value",
    calendarDateLabel: "Date field",
    ganttStartLabel: "Start field",
    ganttEndLabel: "End field",
    ungroupedLabel: "Ungrouped",
    galleryNoImage: "Gallery view needs a URL field for images",
    kanbanNoGroup: "Kanban view needs a select or multi-select field to group by",
    calendarNoDate: "Calendar view needs a date field",
    ganttNoDate: "Gantt view needs start and end date fields",
    addCard: "Add",
    opContains: "contains",
    opEquals: "is",
    opNotEquals: "is not",
    opGt: "greater than",
    opLt: "less than",
    opIsEmpty: "is empty",
    opIsNotEmpty: "is not empty",
    undoButton: "Undo",
    redoButton: "Redo",
    csvImport: "Import CSV (appends records, headers match field names)",
    csvExport: "Export CSV (text fields)",
    csvExportNoField: "No text field to export",
    tsvConfirm: "Paste {0} rows × {1} columns",
    tsvAppend: "Append as new records",
    tsvOverwrite: "Overwrite from current cell",
    tsvCancel: "Cancel",
    calendarMonth: "{0} {1}",
    calendarPrev: "Previous month",
    calendarNext: "Next month",
    calendarToday: "Today",
    calendarWeekdays: "Sun,Mon,Tue,Wed,Thu,Fri,Sat",
    viewSelectLabel: "Switch view",
    codeFormat: "Format",
    codeCopy: "Copy all",
    codeSelectAll: "Select all",
    codeClear: "Clear",
    invalidCsv: "Not a valid CSV file",
    noImportableRecords: "No importable records",
    csvReadFailed: "Failed to read the file. Please try again.",
    deleteFieldConfirm: "Deleting a field also clears its column data",
    tableEmptyGuide: "Click + to create your first field, or import a CSV",
    kanbanDropHere: "Drop cards here"
  }
}, ms = {
  text: "typeNameText",
  number: "typeNameNumber",
  select: "typeNameSelect",
  multiSelect: "typeNameMultiSelect",
  checkbox: "typeNameCheckbox",
  date: "typeNameDate",
  url: "typeNameUrl"
}, _h = [
  "text",
  "number",
  "select",
  "multiSelect",
  "checkbox",
  "date",
  "url"
], Oh = (e) => typeof e == "string" && _h.includes(e), To = (e) => typeof e == "string" ? !1 : typeof e == "object" && e !== null && !Array.isArray(e), Ur = (e, t) => {
  if (t == null)
    return null;
  switch (e) {
    case "text":
    case "url":
    case "date":
      return typeof t == "string" && t !== "" ? t : null;
    case "number": {
      if (typeof t == "number" && Number.isFinite(t))
        return t;
      if (typeof t == "string" && t.trim() !== "") {
        const n = Number(t);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    }
    case "select":
      return typeof t == "string" && t !== "" ? t : null;
    case "multiSelect": {
      if (Array.isArray(t)) {
        const n = t.filter((o) => typeof o == "string" && o !== "");
        return n.length > 0 ? n : null;
      }
      return typeof t == "string" && t !== "" ? [t] : null;
    }
    case "checkbox":
      return typeof t == "boolean" ? t : null;
    default:
      return null;
  }
}, Hh = (e) => {
  if (!To(e))
    return null;
  const t = typeof e.id == "string" ? e.id.trim() : "";
  if (!t)
    return null;
  const n = {
    id: t,
    name: typeof e.name == "string" ? e.name : "",
    type: Oh(e.type) ? e.type : "text"
  };
  if ((n.type === "select" || n.type === "multiSelect") && Array.isArray(e.options)) {
    const o = e.options.filter((r) => typeof r == "string");
    o.length > 0 && (n.options = o);
  }
  return n;
}, Pt = (e) => {
  var i;
  let t;
  try {
    t = JSON.parse(e);
  } catch (s) {
    return { ok: !1, error: s instanceof Error ? s.message : "JSON parse failed" };
  }
  if (!To(t))
    return { ok: !1, error: "root is not an object" };
  if (t.version !== 1)
    return { ok: !1, error: `unsupported version: ${String(t.version)}` };
  if (!Array.isArray(t.fields))
    return { ok: !1, error: "fields is not an array" };
  const n = t.fields.map((s) => Hh(s)).filter((s) => s !== null), o = /* @__PURE__ */ new Set();
  for (const s of n)
    o.has(s.id) || o.add(s.id);
  const r = [];
  if (Array.isArray(t.records))
    for (const s of t.records) {
      if (!To(s))
        continue;
      const a = typeof s.id == "string" ? s.id.trim() : "";
      if (!a)
        continue;
      const l = {};
      if (To(s.cells))
        for (const [c, d] of Object.entries(s.cells)) {
          if (!o.has(c))
            continue;
          const u = (i = n.find((p) => p.id === c)) == null ? void 0 : i.type;
          if (!u)
            continue;
          const h = Ur(u, d);
          h !== null && (l[c] = h);
        }
      r.push({ id: a, cells: l });
    }
  return {
    ok: !0,
    doc: {
      version: 1,
      name: typeof t.name == "string" ? t.name : "",
      fields: n,
      records: r
    }
  };
}, Fh = (e) => !!(e == null || typeof e == "string" && e === "" || Array.isArray(e) && e.length === 0), je = (e) => {
  const t = {
    version: e.version,
    fields: e.fields,
    records: e.records.map((n) => ({
      id: n.id,
      cells: Object.fromEntries(
        e.fields.map((o) => [o.id, n.cells[o.id] ?? null]).filter(([, o]) => !Fh(o))
      )
    }))
  };
  return e.name !== "" && (t.name = e.name), JSON.stringify(t, null, 2);
}, gl = (e) => {
  let t = 0;
  for (const n of e.fields) {
    const o = /^f(\d+)$/.exec(n.id);
    o != null && o[1] && (t = Math.max(t, Number.parseInt(o[1], 10)));
  }
  return `f${t + 1}`;
}, Wt = (e) => {
  let t = 0;
  for (const n of e.records) {
    const o = /^r(\d+)$/.exec(n.id);
    o != null && o[1] && (t = Math.max(t, Number.parseInt(o[1], 10)));
  }
  return `r${t + 1}`;
}, $h = 600, ps = 100, jh = 200 * 1024;
class Kh {
  /**
   * 初始化(初始文档为栈底基准)。
   */
  constructor(t) {
    /** 撤销栈(旧 → 新)。 */
    m(this, "undoList", []);
    /** 重做栈(新 → 旧)。 */
    m(this, "redoList", []);
    /** 当前文档 canonical JSON(分批时作为下一步的 before 快照)。 */
    m(this, "currentJson");
    /** 当前分批是否已开启(开启后首个编辑落栈)。 */
    m(this, "batchOpen", !1);
    /** 分批定时器句柄。 */
    m(this, "batchTimer", null);
    /** 上一编辑的种类签名(种类切换强制分批:单元格编辑/结构操作不合并)。 */
    m(this, "lastEditKind", null);
    /** 程序性回放中(undo/redo/setDoc),期间接收的 edit 不入栈。 */
    m(this, "replaying", !1);
    this.currentJson = t;
  }
  /**
   * 记录一次用户编辑(kind:操作种类签名,如 'cell'/'field'/'record'/'tsv'/'drag')。
   * beforeJson 为编辑前的 canonical JSON;afterJson 为编辑后的 canonical JSON。
   */
  push(t, n, o) {
    this.currentJson = o, !this.replaying && (this.batchOpen && this.lastEditKind !== t && this.closeBatch(), this.batchOpen || (this.undoList.push(n), this.undoList.length > ps && this.undoList.splice(0, this.undoList.length - ps), this.redoList = [], this.batchOpen = !0), this.lastEditKind = t, this.shrinkIfNeeded(), this.scheduleBatchClose());
  }
  /**
   * 静默窗口到期关闭当前批次。
   */
  scheduleBatchClose() {
    this.batchTimer !== null && clearTimeout(this.batchTimer), this.batchTimer = setTimeout(() => {
      this.closeBatch();
    }, $h);
  }
  /**
   * 立即封批(种类切换/undo/redo/destroy 前)。
   */
  closeBatch() {
    this.batchTimer !== null && (clearTimeout(this.batchTimer), this.batchTimer = null), this.batchOpen = !1, this.lastEditKind = null;
  }
  /**
   * 快照超限时的容量收缩(丢最旧,保留最近 20 步)。
   */
  shrinkIfNeeded() {
    var t;
    this.undoList.length > 0 && (((t = this.undoList[this.undoList.length - 1]) == null ? void 0 : t.length) ?? 0) > jh && (this.undoList = this.undoList.slice(-20));
  }
  /**
   * 撤销:返回回放 JSON(null = 无可撤销);栈顶即当前态之前的状态。
   */
  undo() {
    this.closeBatch();
    const t = this.undoList.pop();
    return t === void 0 ? null : (this.redoList.push(this.currentJson), this.replaying = !0, this.currentJson = t, t);
  }
  /**
   * 重做:返回回放 JSON(null = 无可重做)。
   */
  redo() {
    this.closeBatch();
    const t = this.redoList.pop();
    return t === void 0 ? null : (this.undoList.push(this.currentJson), this.replaying = !0, this.currentJson = t, t);
  }
  /**
   * 回放结束标记(setDoc/undo/redo 的 onChange 事件处理后调用,恢复入栈)。
   */
  endReplay() {
    this.replaying = !1;
  }
  /**
   * 外部整体替换文档(受控回填):重置整栈。
   */
  reset(t) {
    this.closeBatch(), this.undoList = [], this.redoList = [], this.currentJson = t, this.replaying = !1;
  }
  /**
   * 是否可撤销。
   */
  canUndo() {
    return this.undoList.length > 0;
  }
  /**
   * 是否可重做。
   */
  canRedo() {
    return this.redoList.length > 0;
  }
  /**
   * 当前文档 JSON(栈视角,与视图同步)。
   */
  getCurrent() {
    return this.currentJson;
  }
  /**
   * 同步当前文档(视图侧文档被直接替换时,如 TSV 整批提交)。
   */
  setCurrent(t) {
    this.currentJson = t;
  }
  /**
   * 销毁(清定时器)。
   */
  destroy() {
    this.closeBatch(), this.undoList = [], this.redoList = [];
  }
}
const Wh = (e) => {
  const t = e.filter((n) => n.trim() !== "");
  return t.length === 0 ? "text" : t.every(
    (n) => ["true", "false", "x", "✓", "是", "否", "yes", "no", "y", "n", "1", "0"].includes(
      n.trim().toLowerCase()
    )
  ) ? "checkbox" : t.every((n) => n.trim() !== "" && Number.isFinite(Number(n))) ? "number" : t.every((n) => /^https?:\/\/\S+$/.test(n.trim())) ? "url" : t.every((n) => /^\d{4}-\d{2}-\d{2}$/.test(n.trim())) ? "date" : "text";
}, Uh = (e) => {
  const t = e.trim().toLowerCase();
  return t === "" ? null : ["true", "x", "✓", "是", "yes", "y", "1"].includes(t);
}, fs = (e, t) => {
  let n = 0;
  for (const o of e) {
    const r = new RegExp(`^${t}(\\d+)$`).exec(o);
    r != null && r[1] && (n = Math.max(n, Number.parseInt(r[1], 10)));
  }
  return `${t}${n + 1}`;
}, Vh = (e, t) => {
  var h;
  const n = il(t);
  if (n.length < 2)
    return { doc: e, appendedFieldIds: [], appendedRecordIds: [] };
  const o = (h = n[0]) == null ? void 0 : h.map((p) => p.trim());
  if (!o)
    return { doc: e, appendedFieldIds: [], appendedRecordIds: [] };
  const r = n.slice(1).filter((p) => p.some((g) => g.trim() !== ""));
  if (r.length === 0)
    return { doc: e, appendedFieldIds: [], appendedRecordIds: [] };
  const i = Math.max(o.length, ...r.map((p) => p.length)), s = [];
  for (let p = 0; p < i; p += 1)
    s.push(r.map((g) => g[p] ?? ""));
  const a = [], l = e.fields.map((p) => ({ ...p })), c = [];
  o.forEach((p, g) => {
    const y = s[g] ?? [], f = p !== "" ? l.find((k) => k.name === p) : void 0;
    if (f && ["text", "number", "date", "url", "checkbox"].includes(f.type)) {
      c.push(f.id);
      return;
    }
    const w = fs(
      l.map((k) => k.id),
      "f"
    ), b = Wh(y);
    l.push({ id: w, name: p !== "" ? p : `列 ${g + 1}`, type: b }), a.push(w), c.push(w);
  });
  const d = [], u = e.records.map((p) => ({ id: p.id, cells: { ...p.cells } }));
  return r.forEach((p) => {
    const g = fs(
      u.map((f) => f.id),
      "r"
    ), y = {};
    p.forEach((f, w) => {
      const b = c[w];
      if (!b)
        return;
      const k = l.find((E) => E.id === b);
      if (!k)
        return;
      const v = f.trim();
      if (v !== "") {
        if (k.type === "checkbox") {
          const E = Uh(v);
          E !== null && (y[b] = E);
          return;
        }
        if (k.type === "number") {
          const E = Number(v);
          Number.isFinite(E) && (y[b] = E);
          return;
        }
        y[b] = v;
      }
    }), u.push({ id: g, cells: y }), d.push(g);
  }), {
    doc: { ...e, fields: l, records: u },
    appendedFieldIds: a,
    appendedRecordIds: d
  };
}, qh = (e, t, n) => {
  if (!t || !n)
    return null;
  const o = e.fields.find((s) => s.id === t), r = e.fields.find((s) => s.id === n);
  if (!o || !r)
    return null;
  const i = [[o.name || "标题", r.name || "字段"]];
  for (const s of e.records) {
    const a = s.cells[o.id], l = s.cells[r.id];
    i.push([
      a == null ? "" : String(a),
      l == null ? "" : Array.isArray(l) ? l.join(", ") : String(l)
    ]);
  }
  return sl(i);
}, bl = (e) => e == null ? "" : Array.isArray(e) ? e.join(", ") : typeof e == "boolean" ? e ? "true" : "false" : String(e), yl = (e) => {
  if (typeof e == "number")
    return e;
  if (typeof e == "string" && e.trim() !== "") {
    const t = Number(e);
    return Number.isFinite(t) ? t : null;
  }
  return null;
}, gs = (e) => e == null || e === "" || Array.isArray(e) && e.length === 0, Gh = (e, t, n) => {
  const o = e.fields.find((a) => a.id === n.fieldId);
  if (!o)
    return !0;
  const r = t.cells[n.fieldId] ?? null, i = bl(r).toLowerCase(), s = n.value.trim().toLowerCase();
  switch (n.op) {
    case "contains":
      return s === "" ? !0 : i.includes(s);
    case "equals":
      if (o.type === "checkbox") {
        const l = ["true", "x", "✓", "是", "yes", "y", "1"].includes(s);
        return typeof r == "boolean" ? r === l : !1;
      }
      return i === s;
    case "notEquals":
      return i !== s;
    case "gt":
    case "lt": {
      const a = o.type === "date" ? typeof r == "string" ? Date.parse(r) : Number.NaN : yl(r), l = o.type === "date" ? Date.parse(n.value) : Number(n.value);
      return a === null || Number.isNaN(a) || Number.isNaN(l) ? !0 : n.op === "gt" ? a > l : a < l;
    }
    case "isEmpty":
      return gs(r);
    case "isNotEmpty":
      return !gs(r);
    default:
      return !0;
  }
}, bs = (e, t, n) => {
  const o = e.fields.find((i) => i.id === n), r = t.cells[n] ?? null;
  if (!o)
    return "";
  if (r == null || r === "" || Array.isArray(r) && r.length === 0)
    return null;
  if (o.type === "checkbox")
    return r === !0 ? 1 : 0;
  if (o.type === "number")
    return yl(r) ?? null;
  if (o.type === "date") {
    const i = typeof r == "string" ? Date.parse(r) : Number.NaN;
    return Number.isNaN(i) ? null : i;
  }
  return bl(r);
}, bn = (e, t, n) => {
  const o = t.filter(
    (a) => e.fields.some((l) => l.id === a.fieldId)
  ), r = o.length === 0 ? e.records : e.records.filter((a) => o.every((l) => Gh(e, a, l)));
  if (!n || !e.fields.some((a) => a.id === n.fieldId))
    return r;
  const i = (a) => {
    const l = a.cells[n.fieldId];
    return l == null || l === "" || Array.isArray(l) && l.length === 0;
  };
  return [...r].sort((a, l) => {
    const c = i(a), d = i(l);
    if (c || d)
      return c && d ? 0 : c ? 1 : -1;
    const u = bs(e, a, n.fieldId), h = bs(e, l, n.fieldId);
    let p;
    return typeof u == "number" && typeof h == "number" ? p = u - h : p = String(u).localeCompare(String(h), "zh-CN"), n.direction === "desc" ? -p : p;
  });
}, Xh = (e) => {
  const n = e.replace(/\r\n/g, `
`).replace(/\r/g, `
`).split(`
`);
  return n.length > 0 && n[n.length - 1] === "" && n.pop(), n.map((o) => o.split("	"));
}, Yh = (e) => {
  if (e.includes("	"))
    return !0;
  const t = e.replace(/\r\n/g, `
`).replace(/\r/g, `
`).split(`
`);
  return t.length > 1 && t.some((n) => n.trim() !== "");
}, Zh = (e) => {
  const t = e.trim().toLowerCase();
  return t === "" ? null : ["true", "x", "✓", "是", "yes", "y", "1"].includes(t);
}, Jh = (e, t) => {
  const n = t.trim();
  if (e === "checkbox")
    return Zh(n);
  if (e === "multiSelect") {
    if (n === "")
      return null;
    const o = n.split(/[,，、]/).map((r) => r.trim()).filter((r) => r !== "");
    return o.length > 0 ? o : null;
  }
  return Ur(e, n);
}, Qh = (e, t, n) => {
  const o = [], r = [], i = t.filter((g) => g.some((y) => y.trim() !== ""));
  if (i.length === 0)
    return { doc: e, appendedFieldIds: o, appendedRecordIds: r };
  const s = n ? Math.max(0, Math.min(n.recordIndex, e.records.length)) : e.records.length, a = n ? Math.max(0, Math.min(n.fieldIndex, e.fields.length)) : 0, l = Math.max(...i.map((g) => g.length));
  let c = [...e.fields];
  const d = a + l;
  for (; c.length < d; ) {
    const g = gl({ ...e, fields: c });
    c = [...c, { id: g, name: "", type: "text" }], o.push(g);
  }
  let u = [...e.records];
  const h = s + i.length;
  for (; u.length < h; ) {
    const g = Wt({ ...e, records: u });
    u = [...u, { id: g, cells: {} }], r.push(g);
  }
  const p = u.map((g) => ({ id: g.id, cells: { ...g.cells } }));
  return i.forEach((g, y) => {
    const f = p[s + y];
    f && g.forEach((w, b) => {
      const k = c[a + b];
      if (!k)
        return;
      const v = Jh(k.type, w);
      v === null ? delete f.cells[k.id] : f.cells[k.id] = v;
    });
  }), {
    doc: { ...e, fields: c, records: p },
    appendedFieldIds: o,
    appendedRecordIds: r
  };
}, kl = (e) => {
  window.addEventListener("resize", e), document.addEventListener("scroll", e, !0);
  let t = !0;
  return () => {
    t && (t = !1, window.removeEventListener("resize", e), document.removeEventListener("scroll", e, !0));
  };
}, em = '<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2.5 4.25 6 7.75l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>', lo = 4;
let Jt = null;
class Wn {
  /**
   * 初始化下拉(构建触发钮;浮层懒创建)。
   */
  constructor(t) {
    /** 触发钮。 */
    m(this, "dom");
    /** 选项列表。 */
    m(this, "options");
    /** 当前选中值。 */
    m(this, "value");
    /** 回调。 */
    m(this, "callbacks");
    /** 开启中的浮层(null = 关闭)。 */
    m(this, "popup", null);
    /** 全局按下:点击触发钮与浮层以外区域关闭(capture,先于块内 stopEvent)。 */
    m(this, "handleDocPointerDown", (t) => {
      var o;
      const n = t.target;
      n instanceof Node && ((o = this.popup) != null && o.contains(n) || this.dom.contains(n) || this.close());
    });
    /** 全局按键:Escape 关闭并吞掉(capture),避免漏进编辑器快捷键。 */
    m(this, "handleDocKeyDown", (t) => {
      !this.popup || t.key !== "Escape" || (t.stopPropagation(), this.close(!0));
    });
    /** 全局滚动/缩放:浮层不跟随,直接关闭(浮层自身内部滚动除外)。 */
    m(this, "handleDocScroll", (t) => {
      var o;
      const n = t.target;
      n instanceof Node && ((o = this.popup) != null && o.contains(n)) || this.close();
    });
    /** 视口变化订阅取消函数(resize + 捕获滚动统一绑定;null = 未开启)。 */
    m(this, "unsubscribeViewport", null);
    this.options = t.options, this.value = t.value, this.callbacks = t.callbacks;
    const n = document.createElement("button");
    n.type = "button", n.className = t.className ? `zt-jsonview-dd ${t.className}` : "zt-jsonview-dd", n.setAttribute("aria-haspopup", "listbox"), n.setAttribute("aria-expanded", "false"), t.ariaLabel && n.setAttribute("aria-label", t.ariaLabel), t.title && (n.title = t.title), t.disabled && (n.disabled = !0), n.addEventListener("click", (o) => {
      o.stopPropagation(), this.toggle();
    }), n.addEventListener("keydown", (o) => {
      this.popup || (o.key === "ArrowDown" || o.key === "ArrowUp") && (o.preventDefault(), this.toggle());
    }), this.dom = n, this.syncTrigger();
  }
  /**
   * 整体更新选项与选中值(开启中先收起,防陈旧浮层)。
   */
  setOptions(t, n) {
    this.popup && this.close(), this.options = t, this.setValue(n);
  }
  /**
   * 更新选中值(仅刷新触发钮文案)。
   */
  setValue(t) {
    this.popup && this.close(), this.value = t, this.syncTrigger();
  }
  /**
   * 读取当前选中值。
   */
  getValue() {
    return this.value;
  }
  /**
   * 销毁(收浮层、摘全局监听)。
   */
  destroy() {
    this.close();
  }
  /**
   * 刷新触发钮文案与箭头。
   */
  syncTrigger() {
    const t = this.options.find((i) => i.value === this.value) ?? null, n = (t == null ? void 0 : t.label) ?? "";
    if (this.dom.textContent = "", t != null && t.icon) {
      const i = document.createElement("span");
      i.className = "zt-jsonview-dd-icon", i.innerHTML = t.icon, this.dom.appendChild(i);
    }
    const o = document.createElement("span");
    o.className = "zt-jsonview-dd-label", o.dataset.empty = n === "" ? "true" : "false", o.textContent = n, this.dom.appendChild(o);
    const r = document.createElement("span");
    r.className = "zt-jsonview-dd-caret", r.innerHTML = em, this.dom.appendChild(r);
  }
  /**
   * 开/关浮层。
   */
  toggle() {
    if (this.popup) {
      this.close(!0);
      return;
    }
    this.options.length === 0 || this.dom.disabled || (Jt && Jt !== this && Jt.close(), this.open());
  }
  /**
   * 展开浮层(定位 + 焦点移到选中项 + 挂全局监听)。
   */
  open() {
    const t = this.dom.offsetParent ?? document.body, n = document.createElement("div");
    n.className = "zt-jsonview-dd-pop", n.setAttribute("role", "listbox"), this.options.forEach((p) => {
      n.appendChild(this.buildOption(p));
    }), n.addEventListener("keydown", (p) => {
      this.handlePopupKeyDown(p, n);
    }), t.appendChild(n);
    const o = this.dom.getBoundingClientRect(), r = n.offsetWidth, i = n.offsetHeight;
    n.style.minWidth = `${Math.max(o.width, 160)}px`;
    const s = Math.max(r, 160);
    let a = o.left, l = o.bottom + lo;
    const c = o.bottom + i + lo <= window.innerHeight, d = o.top - i - lo >= 0;
    !c && d && (l = o.top - i - lo);
    const u = o.left + s - window.innerWidth + 8;
    u > 0 && (a -= u), n.style.left = `${Math.max(0, a)}px`, n.style.top = `${Math.max(0, l)}px`, this.popup = n, Jt = this, this.dom.setAttribute("aria-expanded", "true"), document.addEventListener("pointerdown", this.handleDocPointerDown, !0), document.addEventListener("keydown", this.handleDocKeyDown, !0), this.unsubscribeViewport = kl(this.handleDocScroll);
    const h = n.querySelector("[data-selected='true']") ?? n.querySelector(".zt-jsonview-dd-opt");
    h == null || h.focus({ preventScroll: !0 });
  }
  /**
   * 构建单个选项钮(选中项打勾)。
   */
  buildOption(t) {
    const n = document.createElement("button");
    if (n.type = "button", n.className = "zt-jsonview-dd-opt", n.setAttribute("role", "option"), n.dataset.value = t.value, n.dataset.selected = t.value === this.value ? "true" : "false", n.dataset.empty = t.label === "" ? "true" : "false", n.addEventListener("click", (i) => {
      i.stopPropagation(), this.pick(t.value);
    }), t.icon) {
      const i = document.createElement("span");
      i.className = "zt-jsonview-dd-opt-icon", i.innerHTML = t.icon, n.appendChild(i);
    }
    const o = document.createElement("span");
    o.className = "zt-jsonview-dd-opt-label", o.textContent = t.label === "" ? "—" : t.label, n.appendChild(o);
    const r = document.createElement("span");
    return r.className = "zt-jsonview-dd-opt-check", r.textContent = "✓", t.value !== this.value && (r.hidden = !0), n.appendChild(r), n;
  }
  /**
   * 浮层键盘导航(焦点在选项钮间循环;Tab 关闭)。
   */
  handlePopupKeyDown(t, n) {
    var i, s;
    const o = Array.from(n.querySelectorAll(".zt-jsonview-dd-opt")), r = o.indexOf(document.activeElement);
    if (t.key === "ArrowDown") {
      t.preventDefault(), (i = o[r + 1] ?? o[0]) == null || i.focus({ preventScroll: !0 });
      return;
    }
    if (t.key === "ArrowUp") {
      t.preventDefault(), (s = o[r - 1] ?? o[o.length - 1]) == null || s.focus({ preventScroll: !0 });
      return;
    }
    t.key === "Tab" && this.close();
  }
  /**
   * 选中并收起(与当前值相同只收起不回调)。
   */
  pick(t) {
    this.close(!0), t !== this.value && (this.value = t, this.syncTrigger(), this.callbacks.onSelect(t));
  }
  /**
   * 收起浮层并摘全局监听(refocus = 焦点还给触发钮)。
   */
  close(t = !1) {
    var n, o;
    (n = this.popup) == null || n.remove(), this.popup = null, Jt === this && (Jt = null), this.dom.setAttribute("aria-expanded", "false"), document.removeEventListener("pointerdown", this.handleDocPointerDown, !0), document.removeEventListener("keydown", this.handleDocKeyDown, !0), (o = this.unsubscribeViewport) == null || o.call(this), this.unsubscribeViewport = null, t && this.dom.focus({ preventScroll: !0 });
  }
}
const Gn = (e, t, n) => {
  const o = e.cells[t.id] ?? null;
  switch (t.type) {
    case "checkbox": {
      const r = document.createElement("input");
      return r.type = "checkbox", r.checked = o === !0, r.addEventListener("change", () => {
        n.onWrite(e.id, t.id, r.checked);
      }), r;
    }
    case "select": {
      const r = typeof o == "string" ? o : "", i = [...t.options ?? []];
      return r !== "" && !i.includes(r) && i.push(r), new Wn({
        options: [{ value: "", label: "" }, ...i.map((a) => ({ value: a, label: a }))],
        value: r,
        className: "zt-jsonview-input",
        ariaLabel: t.name || t.id,
        callbacks: {
          onSelect: (a) => {
            n.onWrite(e.id, t.id, a === "" ? null : a);
          }
        }
      }).dom;
    }
    case "multiSelect": {
      const r = document.createElement("input");
      return r.type = "text", r.className = "zt-jsonview-input", r.value = Array.isArray(o) ? o.join(", ") : "", r.placeholder = (t.options ?? []).join(", "), r.addEventListener("change", () => {
        const i = r.value.split(/[,，]/).map((s) => s.trim()).filter((s) => s !== "");
        n.onWrite(e.id, t.id, i.length > 0 ? i : null);
      }), r;
    }
    default: {
      const r = document.createElement("input");
      return r.className = "zt-jsonview-input", r.type = t.type === "number" ? "number" : t.type === "date" ? "date" : "text", r.value = t.type === "number" && typeof o == "number" ? String(o) : typeof o == "string" ? o : "", r.addEventListener("change", () => {
        if (t.type === "number") {
          const i = r.value.trim() === "" ? null : Number(r.value);
          n.onWrite(e.id, t.id, i !== null && Number.isFinite(i) ? i : null);
          return;
        }
        n.onWrite(e.id, t.id, r.value.trim() === "" ? null : r.value.trim());
      }), r;
    }
  }
}, Ge = (e, t) => {
  const n = document.createElement("span");
  if (n.className = "zt-jsonview-static", t == null)
    return n;
  if (e.type === "checkbox")
    return n.textContent = t ? "✓" : "", n;
  if (e.type === "multiSelect" && Array.isArray(t))
    return n.textContent = t.join(", "), n;
  if (e.type === "url" && typeof t == "string" && t !== "") {
    const o = document.createElement("a");
    return o.href = t, o.target = "_blank", o.rel = "noopener noreferrer", o.textContent = t, n.appendChild(o), n;
  }
  return n.textContent = String(t), n;
}, Ht = (e, t) => Ur(e, t), tm = 24, nm = 8, om = 0.5, ys = (e) => {
  const { count: t, estimatedItemHeight: n, overscan: o, relTop: r, relBottom: i, measurements: s } = e;
  if (t <= 0)
    return { start: 0, end: 0, padTop: 0, padBottom: 0, totalHeight: 0 };
  const a = (b) => {
    const k = s == null ? void 0 : s[b];
    return typeof k == "number" && k > 0 ? k : n;
  };
  let l = 0, c = 0;
  for (; l < t; ) {
    const b = a(l);
    if (c + b > r)
      break;
    c += b, l += 1;
  }
  l >= t && (l = t - 1, c -= a(l));
  let d = l, u = c;
  const h = Math.max(i, r);
  for (; d < t && u < h; )
    u += a(d), d += 1;
  d <= l && (u += a(d), d = Math.min(t, l + 1));
  const p = Math.max(0, l - o), g = Math.min(t, d + o);
  let y = u;
  for (let b = d; b < t; b += 1)
    y += a(b);
  let f = c;
  for (let b = l - 1; b >= p; b -= 1)
    f -= a(b);
  let w = u;
  for (let b = d; b < g; b += 1)
    w += a(b);
  return {
    start: p,
    end: g,
    padTop: f,
    padBottom: Math.max(0, y - w),
    totalHeight: y
  };
};
class Vr {
  /**
   * 初始化并同步求解一次窗口(未挂载时给预估初始窗口,挂载后自动修正)。
   */
  constructor(t) {
    /** 条目容器。 */
    m(this, "anchor");
    /** 条目总数。 */
    m(this, "count");
    /** 预估条目高度。 */
    m(this, "estimatedItemHeight");
    /** 视口上下额外渲染条数。 */
    m(this, "overscan");
    /** 固定行高模式开关。 */
    m(this, "fixed");
    /** 逐条实测高度缓存(固定模式为 null)。 */
    m(this, "measurements");
    /** 窗口变化回调。 */
    m(this, "onRangeChange");
    /** 上一次回调的窗口(去重:窗口与占位均未变化时不重复回调)。 */
    m(this, "lastRange", null);
    /** rAF 句柄(0 = 无待执行重算)。 */
    m(this, "rafId", 0);
    /** anchor 尺寸观察器(挂载/行高变化时触发重算)。 */
    m(this, "observer");
    /** 是否已销毁。 */
    m(this, "destroyed", !1);
    /** 视口变化入口(rAF 节流后重算;具名引用保证 add/remove 配对)。 */
    m(this, "handleViewportChange", () => {
      this.scheduleRecompute();
    });
    var n;
    this.anchor = t.anchor, this.count = Math.max(0, Math.floor(t.count)), this.estimatedItemHeight = Math.max(1, t.estimatedItemHeight), this.overscan = Math.max(0, t.overscan ?? nm), this.fixed = t.fixedItemHeight === !0, this.measurements = this.fixed ? null : new Array(this.count).fill(this.estimatedItemHeight), this.onRangeChange = t.onRangeChange, document.addEventListener("scroll", this.handleViewportChange, {
      capture: !0,
      passive: !0
    }), window.addEventListener("resize", this.handleViewportChange), this.observer = typeof ResizeObserver > "u" ? null : new ResizeObserver(this.handleViewportChange), (n = this.observer) == null || n.observe(this.anchor), this.recompute();
  }
  /**
   * 读取当前窗口(尚未求解/已销毁时返回空窗口)。
   */
  getRange() {
    return this.lastRange ?? { start: 0, end: 0, padTop: 0, padBottom: 0, totalHeight: 0 };
  }
  /**
   * 读取实测高度缓存(只读;固定行高模式返回 null)。
   * 供视图计算「窗口外条目的偏移」(如画廊钉住行的中段占位高度),
   * 缺失下标由调用方按 estimatedItemHeight 兜底(与窗口求解规则一致)。
   */
  getMeasurements() {
    return this.measurements;
  }
  /** 读取当前预估条目高度(测量缓存缺失下标的统一兜底值)。 */
  getEstimatedItemHeight() {
    return this.estimatedItemHeight;
  }
  /**
   * 更新条目数/预估高度(排序、筛选、数据集变化后调用)。
   * resetMeasurements 为 true 时清空实测缓存(条目顺序已变,旧测量不再可信)。
   */
  update(t) {
    if (this.destroyed)
      return;
    const n = Math.max(0, Math.floor(t.count));
    if (typeof t.estimatedItemHeight == "number" && t.estimatedItemHeight > 0 && (this.estimatedItemHeight = t.estimatedItemHeight), this.measurements)
      if (t.resetMeasurements === !0)
        this.measurements = new Array(n).fill(this.estimatedItemHeight);
      else {
        const o = new Array(n).fill(this.estimatedItemHeight), r = Math.min(this.measurements.length, n);
        for (let i = 0; i < r; i += 1)
          o[i] = this.measurements[i] ?? this.estimatedItemHeight;
        this.measurements = o;
      }
    this.count = n, this.recompute();
  }
  /**
   * 上报条目实测高度(px;仅测量缓存模式生效,固定模式忽略)。
   */
  measureItem(t, n) {
    if (this.destroyed || this.fixed || !this.measurements || t < 0 || t >= this.count || !Number.isFinite(n) || n <= 0)
      return;
    const o = Math.round(n * 100) / 100, r = this.measurements[t] ?? this.estimatedItemHeight;
    Math.abs(o - r) <= om || (this.measurements[t] = o, this.scheduleRecompute());
  }
  /**
   * 强制重算(行高/列宽等布局因素变化时由视图调用;常规情况 RO 已兜住)。
   */
  refresh() {
    this.destroyed || this.recompute();
  }
  /**
   * 销毁:摘除全部监听与观察器,取消待执行重算(幂等)。
   */
  destroy() {
    var t;
    this.destroyed || (this.destroyed = !0, document.removeEventListener("scroll", this.handleViewportChange, { capture: !0 }), window.removeEventListener("resize", this.handleViewportChange), (t = this.observer) == null || t.disconnect(), this.rafId !== 0 && (cancelAnimationFrame(this.rafId), this.rafId = 0), this.lastRange = null);
  }
  /**
   * rAF 节流的重算调度(scroll 高频触发合并为每帧一次)。
   */
  scheduleRecompute() {
    this.destroyed || this.rafId !== 0 || (this.rafId = requestAnimationFrame(() => {
      this.rafId = 0, this.recompute();
    }));
  }
  /**
   * 求解当前窗口并按需回调视图(窗口与占位均未变化时不回调)。
   */
  recompute() {
    if (this.destroyed)
      return;
    const t = this.computeRangeFromGeometry();
    if (!t)
      return;
    const n = this.lastRange;
    n !== null && n.start === t.start && n.end === t.end && n.padTop === t.padTop && n.padBottom === t.padBottom && n.totalHeight === t.totalHeight || (this.lastRange = t, this.onRangeChange(t));
  }
  /**
   * 由实时几何求解窗口参数:可视区 = 窗口视口 ∩ 全部裁剪祖先矩形。
   * 不绑定具体滚动容器——auto/scroll/hidden 祖先都会裁剪内容,逐层求交后
   * 无论「谁在滚」(页面/嵌套容器)结果都正确;条目区顶边即 anchor 顶边。
   */
  computeRangeFromGeometry() {
    const t = {
      count: this.count,
      estimatedItemHeight: this.estimatedItemHeight,
      overscan: this.overscan,
      measurements: this.measurements
    };
    if (!this.anchor.isConnected)
      return ys({
        ...t,
        relTop: 0,
        relBottom: this.estimatedItemHeight * tm
      });
    const n = this.anchor.getBoundingClientRect().top;
    let o = 0, r = window.innerHeight, i = this.anchor.parentElement;
    for (; i !== null; ) {
      const s = window.getComputedStyle(i).overflowY;
      if (s === "auto" || s === "scroll" || s === "hidden") {
        const a = i.getBoundingClientRect();
        a.height > 0 && (o = Math.max(o, a.top), r = Math.min(r, a.bottom));
      }
      i = i.parentElement;
    }
    return ys({
      ...t,
      relTop: Math.max(0, o - n),
      relBottom: r - n
    });
  }
}
const ks = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>', rm = 200, im = 33, sm = 8;
class Yo {
  /**
   * 初始化视图。
   */
  constructor(t, n, o, r, i) {
    /** 根元素。 */
    m(this, "dom");
    /** 当前文档。 */
    m(this, "doc");
    /** 只读态。 */
    m(this, "readOnly");
    /** 当前文案。 */
    m(this, "messages");
    /** 回调。 */
    m(this, "callbacks");
    /** 运行时筛选条件。 */
    m(this, "filter");
    /** 运行时排序。 */
    m(this, "sort");
    /** TSV 粘贴确认条(存在时拦截重复粘贴)。 */
    m(this, "tsvBar", null);
    /** 待粘贴矩阵。 */
    m(this, "tsvPending", null);
    /** 删除字段确认条(存在时拦截重复点击)。 */
    m(this, "deleteFieldBar", null);
    /** 待删除字段 id。 */
    m(this, "deleteFieldPending", null);
    /** 虚拟列表助手(记录数达阈值时创建;null = 全量渲染路径)。 */
    m(this, "virtual", null);
    /** 当前视图记录序列(queryRecords 结果;窗口渲染按下标取行)。 */
    m(this, "viewRecords", []);
    /** 已渲染窗口(窗口与占位均未变化时不重复重建,避免扰动焦点)。 */
    m(this, "renderedRange", null);
    /** 数据行 tbody 引用(虚拟窗口的重渲染目标)。 */
    m(this, "tbody", null);
    this.doc = t, this.readOnly = n, this.messages = o, this.callbacks = r, this.filter = i.filter, this.sort = i.sort, this.dom = document.createElement("div"), this.dom.className = "zt-jsonview-table-view", this.render();
  }
  /**
   * 更新运行时筛选/排序(渲染器状态变化时调用,整表重绘)。
   */
  setQuery(t) {
    this.filter = t.filter, this.sort = t.sort, this.render();
  }
  /**
   * 提交文档变更(渲染器负责 canonical 序列化与 onChange)。
   */
  commit(t) {
    this.callbacks.onDocChange(this.doc, t);
  }
  /**
   * 外部整体替换文档(整表重绘)。
   */
  setDoc(t) {
    this.doc = t, this.dismissTsvBar(), this.dismissDeleteFieldBar(), this.render();
  }
  /**
   * 读取当前文档。
   */
  getDoc() {
    return this.doc;
  }
  /**
   * 整表重绘(数据库名称行由渲染器顶栏提供,视图内不再重复渲染)。
   */
  render() {
    if (this.deleteFieldBar = null, this.deleteFieldPending = null, this.tsvBar = null, this.teardownVirtual(), this.tbody = null, this.dom.textContent = "", this.dom.appendChild(this.buildTable()), this.doc.fields.length === 0 && this.doc.records.length === 0) {
      const t = document.createElement("div");
      t.className = "zt-jsonview-table-empty-guide", t.textContent = this.messages.tableEmptyGuide, this.dom.appendChild(t);
    }
  }
  /**
   * 构建表格。
   */
  buildTable() {
    const t = document.createElement("table");
    t.className = "zt-jsonview-table", t.appendChild(this.buildHeadRow()), this.viewRecords = bn(this.doc, this.filter, this.sort);
    const n = document.createElement("tbody");
    return this.tbody = n, this.renderedRange = null, this.viewRecords.length >= rm ? (t.appendChild(n), this.virtual = new Vr({
      // 锚点取 tbody:其顶边即「条目 0 顶边」基准,表头高度不参与偏移计算。
      anchor: n,
      count: this.viewRecords.length,
      estimatedItemHeight: im,
      overscan: sm,
      onRangeChange: (o) => {
        this.handleRangeChange(o);
      }
    })) : (this.viewRecords.forEach((o, r) => {
      n.appendChild(this.buildRecordRow(o, r));
    }), t.appendChild(n)), t.appendChild(this.buildAddRecordRow()), t;
  }
  /**
   * 虚拟窗口变化入口:窗口与占位均未变化时不重建(保持编辑焦点不扰动)。
   */
  handleRangeChange(t) {
    const n = this.renderedRange;
    n !== null && n.start === t.start && n.end === t.end && n.padTop === t.padTop && n.padBottom === t.padBottom || (this.renderedRange = { ...t }, this.renderWindowRows(t));
  }
  /**
   * 重建窗口行:占位行 ×2 + [start, end) 记录行(无 DOM 复用,重建即渲染)。
   */
  renderWindowRows(t) {
    const n = this.tbody;
    if (!n)
      return;
    const o = this.captureFocus(), r = [];
    for (let s = t.start; s < t.end; s += 1) {
      const a = this.viewRecords[s];
      a && r.push(this.buildRecordRow(a, s));
    }
    n.textContent = "", n.appendChild(this.buildSpacerRow(t.padTop)), r.forEach((s) => n.appendChild(s)), n.appendChild(this.buildSpacerRow(t.padBottom));
    const i = this.virtual;
    if (i) {
      let s = t.start;
      for (const a of r)
        i.measureItem(s, a.offsetHeight), s += 1;
    }
    this.restoreFocus(o);
  }
  /**
   * 构建虚拟占位行(单个跨列格以高度撑起滚动空间;网格线由样式表关闭)。
   */
  buildSpacerRow(t) {
    const n = document.createElement("tr");
    n.className = "zt-jsonview-virtual-spacer";
    const o = document.createElement("td");
    return o.colSpan = this.doc.fields.length + 2, o.style.height = `${Math.max(0, Math.round(t))}px`, n.appendChild(o), n;
  }
  /**
   * 捕获焦点格快照(正在 tbody 内编辑时返回快照,否则 null)。
   */
  captureFocus() {
    var a;
    const t = document.activeElement;
    if (!(t instanceof HTMLElement) || !(((a = this.tbody) == null ? void 0 : a.contains(t)) ?? !1))
      return null;
    const n = t.closest("td.zt-jsonview-cell"), o = t.closest("tr.zt-jsonview-record-row"), r = o instanceof HTMLTableRowElement ? o.dataset.recordId : void 0;
    if (!(n instanceof HTMLTableCellElement) || !(o instanceof HTMLTableRowElement) || !r)
      return null;
    const i = Array.from(o.children).indexOf(n) - 1;
    if (i < 0)
      return null;
    const s = t instanceof HTMLInputElement ? t : null;
    return {
      recordId: r,
      fieldIndex: i,
      selectionStart: (s == null ? void 0 : s.selectionStart) ?? null,
      selectionEnd: (s == null ? void 0 : s.selectionEnd) ?? null
    };
  }
  /**
   * 恢复焦点格(preventScroll 避免恢复焦点反向扰动滚动位置)。
   */
  restoreFocus(t) {
    if (!t || !this.tbody)
      return;
    const n = this.tbody.querySelector(`tr[data-record-id="${CSS.escape(t.recordId)}"]`), o = n == null ? void 0 : n.children[t.fieldIndex + 1];
    if (!(o instanceof HTMLElement))
      return;
    const r = o.querySelector("input, button, select, textarea") ?? o;
    if (r.focus({ preventScroll: !0 }), r instanceof HTMLInputElement && r.type === "text" && t.selectionStart !== null) {
      const i = t.selectionEnd ?? t.selectionStart;
      try {
        r.setSelectionRange(t.selectionStart, i);
      } catch {
      }
    }
  }
  /**
   * 销毁虚拟列表助手(render 重建 / 视图销毁前必须调用,摘 document 级监听)。
   */
  teardownVirtual() {
    var t;
    (t = this.virtual) == null || t.destroy(), this.virtual = null;
  }
  /**
   * 视图销毁:摘除虚拟列表的 document/window 级监听(渲染器卸载视图时调用)。
   */
  destroy() {
    this.teardownVirtual();
  }
  /**
   * 构建列头行。
   */
  buildHeadRow() {
    const t = document.createElement("tr");
    t.className = "zt-jsonview-head-row";
    const n = document.createElement("th");
    n.className = "zt-jsonview-corner-cell", t.appendChild(n), this.doc.fields.forEach((r) => {
      t.appendChild(this.buildFieldHead(r));
    });
    const o = document.createElement("th");
    if (o.className = "zt-jsonview-add-field-cell", !this.readOnly) {
      const r = document.createElement("button");
      r.type = "button", r.className = "zt-jsonview-add-field", r.textContent = "+", r.title = this.messages.addField, r.setAttribute("aria-label", this.messages.addField), r.addEventListener("click", () => {
        const i = this.callbacks.formatNewFieldName(this.doc.fields.filter((a) => /^字段 \d+$|^Field \d+$/.test(a.name)).length + 1), s = gl(this.doc);
        this.doc = { ...this.doc, fields: [...this.doc.fields, { id: s, name: i, type: "text" }] }, this.render(), this.commit("field");
      }), o.appendChild(r);
    }
    return t.appendChild(o), t;
  }
  /**
   * 构建单个字段列表头(名称 + 类型 + 删除)。
   */
  buildFieldHead(t) {
    const n = document.createElement("th");
    n.className = "zt-jsonview-field-head", n.dataset.fieldType = t.type;
    const o = document.createElement("div");
    o.className = "zt-jsonview-field-head-inner";
    let r = null;
    const i = document.createElement("input");
    if (i.type = "text", i.className = "zt-jsonview-field-name", i.placeholder = this.messages.fieldNamePlaceholder, i.value = t.name, i.disabled = this.readOnly, i.addEventListener("change", () => {
      this.readOnly || (this.doc = {
        ...this.doc,
        fields: this.doc.fields.map((s) => s.id === t.id ? { ...s, name: i.value.trim() } : s)
      }, this.commit("field"), r == null || r.dom.setAttribute("aria-label", i.value.trim() || t.name));
    }), o.appendChild(i), !this.readOnly) {
      const s = new Wn({
        options: Object.keys(ms).map((l) => ({
          value: l,
          label: this.messages[ms[l]]
        })),
        value: t.type,
        className: "zt-jsonview-field-type",
        ariaLabel: i.value || t.name,
        callbacks: {
          onSelect: (l) => {
            this.doc = this.retype(t.id, l), this.render(), this.commit("field");
          }
        }
      });
      r = s, o.appendChild(s.dom);
      const a = document.createElement("button");
      a.type = "button", a.className = "zt-jsonview-remove-field", a.innerHTML = ks, a.title = this.messages.deleteField, a.setAttribute("aria-label", this.messages.deleteField), a.addEventListener("click", () => {
        this.showDeleteFieldBar(t.id);
      }), o.appendChild(a);
    }
    return n.appendChild(o), n;
  }
  /**
   * 执行删除字段(移除列定义并清洗各记录该列取值)。
   */
  performRemoveField(t) {
    this.doc = {
      ...this.doc,
      fields: this.doc.fields.filter((n) => n.id !== t),
      records: this.doc.records.map((n) => {
        if (!(t in n.cells))
          return n;
        const o = { ...n.cells };
        return delete o[t], { ...n, cells: o };
      })
    }, this.render(), this.commit("field");
  }
  /**
   * 显示删除字段确认条(复用 TSV 确认条的条形样式)。
   */
  showDeleteFieldBar(t) {
    this.dismissDeleteFieldBar(), this.deleteFieldPending = t;
    const n = document.createElement("div");
    n.className = "zt-jsonview-tsv-bar";
    const o = document.createElement("span");
    o.className = "zt-jsonview-tsv-label", o.textContent = this.messages.deleteFieldConfirm, n.appendChild(o);
    const r = document.createElement("button");
    r.type = "button", r.className = "zt-jsonview-tsv-apply", r.textContent = this.messages.deleteField, r.addEventListener("click", () => {
      const s = this.deleteFieldPending;
      this.deleteFieldPending = null, this.dismissDeleteFieldBar(), s && this.performRemoveField(s);
    }), n.appendChild(r);
    const i = document.createElement("button");
    i.type = "button", i.className = "zt-jsonview-tsv-cancel", i.textContent = this.messages.tsvCancel, i.addEventListener("click", () => {
      this.deleteFieldPending = null, this.dismissDeleteFieldBar();
    }), n.appendChild(i), this.deleteFieldBar = n, this.dom.insertBefore(n, this.dom.firstChild);
  }
  /**
   * 关闭删除字段确认条。
   */
  dismissDeleteFieldBar() {
    var t;
    (t = this.deleteFieldBar) == null || t.remove(), this.deleteFieldBar = null;
  }
  /**
   * 构建单条记录行。
   */
  buildRecordRow(t, n) {
    const o = document.createElement("tr");
    o.className = "zt-jsonview-record-row", o.dataset.recordId = t.id;
    const r = document.createElement("td");
    if (r.className = "zt-jsonview-rownum-cell", r.textContent = String(n + 1), !this.readOnly) {
      const s = document.createElement("button");
      s.type = "button", s.className = "zt-jsonview-remove-record", s.innerHTML = ks, s.title = this.messages.deleteRecord, s.setAttribute("aria-label", this.messages.deleteRecord), s.addEventListener("click", () => {
        this.doc = { ...this.doc, records: this.doc.records.filter((a) => a.id !== t.id) }, this.render(), this.commit("record");
      }), r.appendChild(s);
    }
    o.appendChild(r), this.doc.fields.forEach((s) => {
      o.appendChild(this.buildCell(t, s));
    });
    const i = document.createElement("td");
    return i.className = "zt-jsonview-tail-cell", o.appendChild(i), o;
  }
  /**
   * 构建数据格(按字段类型)。
   */
  buildCell(t, n) {
    const o = document.createElement("td");
    o.className = "zt-jsonview-cell", o.dataset.fieldType = n.type;
    const r = t.cells[n.id] ?? null;
    return this.readOnly ? (o.appendChild(Ge(n, r)), o) : (o.appendChild(
      Gn(t, n, {
        onWrite: (i, s, a) => {
          var l;
          this.writeCell(i, s, Ht(
            ((l = this.doc.fields.find((c) => c.id === s)) == null ? void 0 : l.type) ?? "text",
            a
          ));
        }
      })
    ), o);
  }
  /**
   * 构建添加记录行。
   */
  buildAddRecordRow() {
    const t = document.createElement("tr");
    t.className = "zt-jsonview-add-record-row";
    const n = document.createElement("td");
    if (n.className = "zt-jsonview-add-record-cell", n.colSpan = this.doc.fields.length + 2, !this.readOnly) {
      const o = document.createElement("button");
      o.type = "button", o.className = "zt-jsonview-add-record", o.textContent = `+ ${this.messages.addRecord}`, o.setAttribute("aria-label", this.messages.addRecord), o.addEventListener("click", () => {
        const r = Wt(this.doc);
        this.doc = { ...this.doc, records: [...this.doc.records, { id: r, cells: {} }] }, this.render(), this.commit("record");
      }), n.appendChild(o);
    }
    return t.appendChild(n), t;
  }
  /**
   * 写入单元格并提交(原地更新,不整表重绘)。
   */
  writeCell(t, n, o) {
    var l;
    const r = this.doc.records.find((c) => c.id === t);
    if (!r)
      return;
    const i = (l = this.doc.fields.find((c) => c.id === n)) == null ? void 0 : l.type;
    if (!i)
      return;
    const s = Ht(i, o), a = { ...r.cells };
    s === null ? delete a[n] : a[n] = s, this.doc = {
      ...this.doc,
      records: this.doc.records.map((c) => c.id === t ? { id: c.id, cells: a } : c)
    }, this.commit("cell");
  }
  /**
   * 字段类型切换(值清洗走注入的 coerce + model 规则)。
   */
  retype(t, n) {
    const o = this.doc.fields.find((s) => s.id === t);
    if (!o || o.type === n)
      return this.doc;
    const r = this.doc.fields.map((s) => s.id === t ? { ...s, type: n } : s), i = this.doc.records.map((s) => {
      if (!(t in s.cells))
        return s;
      const a = Ht(n, s.cells[t] ?? null), l = { ...s.cells };
      return a === null ? delete l[t] : l[t] = a, { id: s.id, cells: l };
    });
    return { ...this.doc, fields: r, records: i };
  }
  /**
   * TSV 粘贴:表格容器(非输入控件)粘贴多行多列文本时,弹出确认条。
   */
  handlePaste(t) {
    var r;
    if (this.readOnly || this.tsvPending !== null)
      return !1;
    const n = t.target;
    if (n instanceof HTMLElement && n.closest("input, select, textarea"))
      return !1;
    const o = ((r = t.clipboardData) == null ? void 0 : r.getData("text/plain")) ?? "";
    return Yh(o) ? (t.preventDefault(), t.stopPropagation(), this.tsvPending = Xh(o), this.showTsvBar(), !0) : !1;
  }
  /**
   * 显示 TSV 确认条(追加 / 覆盖 / 取消)。
   */
  showTsvBar() {
    this.dismissTsvBar();
    const t = this.tsvPending;
    if (!t)
      return;
    const n = document.createElement("div");
    n.className = "zt-jsonview-tsv-bar";
    const o = t.filter((c) => c.some((d) => d.trim() !== "")).length, r = Math.max(...t.map((c) => c.length)), i = document.createElement("span");
    i.className = "zt-jsonview-tsv-label", i.textContent = this.messages.tsvConfirm.replace("{0}", String(o)).replace("{1}", String(r)), n.appendChild(i);
    const s = document.createElement("button");
    s.type = "button", s.className = "zt-jsonview-tsv-apply", s.textContent = this.messages.tsvAppend, s.addEventListener("click", () => {
      this.applyTsv(t, null);
    }), n.appendChild(s);
    const a = document.createElement("button");
    a.type = "button", a.className = "zt-jsonview-tsv-apply", a.textContent = this.messages.tsvOverwrite, a.addEventListener("click", () => {
      this.applyTsv(t, { recordIndex: 0, fieldIndex: 0 });
    }), n.appendChild(a);
    const l = document.createElement("button");
    l.type = "button", l.className = "zt-jsonview-tsv-cancel", l.textContent = this.messages.tsvCancel, l.addEventListener("click", () => {
      this.tsvPending = null, this.dismissTsvBar();
    }), n.appendChild(l), this.tsvBar = n, this.dom.insertBefore(n, this.dom.firstChild);
  }
  /**
   * 关闭确认条。
   */
  dismissTsvBar() {
    var t;
    (t = this.tsvBar) == null || t.remove(), this.tsvBar = null;
  }
  /**
   * 应用 TSV 矩阵并整表重绘 + 提交。
   */
  applyTsv(t, n) {
    const o = Qh(this.doc, t, n);
    this.tsvPending = null, this.dismissTsvBar(), this.doc = o.doc, this.render(), this.commit("tsv");
  }
}
const am = 3, lm = 200, cm = 64, dm = 8, co = 6;
class ws {
  /**
   * 初始化视图。
   */
  constructor(t, n, o, r, i, s) {
    /** 根元素。 */
    m(this, "dom");
    /** 当前文档。 */
    m(this, "doc");
    /** 只读态。 */
    m(this, "readOnly");
    /** 当前文案。 */
    m(this, "messages");
    /** 回调。 */
    m(this, "callbacks");
    /** 分组字段 id。 */
    m(this, "groupFieldId");
    /** 运行时筛选。 */
    m(this, "filter");
    /** 运行时排序。 */
    m(this, "sort");
    /** 拖拽中的记录 id。 */
    m(this, "draggingRecordId", null);
    /** 拖拽冻结标记:拖拽期间源列暂停虚拟化(dragstart 置位、dragend/drop 复位)。 */
    m(this, "dragFrozen", !1);
    /** 各列虚拟化状态(键 = 卡片内容容器;render 重建时全部销毁)。 */
    m(this, "columnVirtuals", /* @__PURE__ */ new Map());
    this.doc = t, this.readOnly = n, this.messages = o, this.groupFieldId = r, this.filter = i.filter, this.sort = i.sort, this.callbacks = s, this.dom = document.createElement("div"), this.dom.className = "zt-jsonview-kanban-view", this.render();
  }
  /**
   * 外部整体替换文档。
   */
  setDoc(t) {
    this.doc = t, this.render();
  }
  /**
   * 读取当前文档。
   */
  getDoc() {
    return this.doc;
  }
  /**
   * 重绘。
   */
  render() {
    this.teardownColumnVirtuals(), this.dom.textContent = "";
    const t = this.resolveGroupField();
    if (!t) {
      const c = document.createElement("div");
      c.className = "zt-jsonview-view-notice", c.textContent = this.messages.kanbanNoGroup, this.dom.appendChild(c);
      return;
    }
    const n = [...t.options ?? []], o = bn(this.doc, this.filter, this.sort), r = /* @__PURE__ */ new Map(), i = (c, d) => {
      const u = r.get(c) ?? [];
      u.push(d), r.set(c, u);
    };
    for (const c of o) {
      const d = c.cells[t.id] ?? null;
      if (d === null || d === "") {
        i("", c.id);
        continue;
      }
      if (Array.isArray(d)) {
        d.forEach((u) => i(u, c.id));
        continue;
      }
      i(String(d), c.id);
    }
    for (const c of r.keys())
      c !== "" && !n.includes(c) && n.push(c);
    const s = n.map((c) => ({
      key: c,
      label: c === "" ? this.messages.ungroupedLabel : c,
      recordIds: r.get(c) ?? []
    }));
    r.has("") && s.push({
      key: "",
      label: this.messages.ungroupedLabel,
      recordIds: r.get("") ?? []
    });
    const a = document.createElement("div");
    a.className = "zt-jsonview-kanban";
    const l = new Map(this.doc.records.map((c) => [c.id, c]));
    s.forEach((c) => {
      a.appendChild(
        this.buildColumn(t, c.key, c.label, c.recordIds, l)
      );
    }), this.dom.appendChild(a);
  }
  /**
   * 解析分组字段(注入 id 失效时取第一个 select/multiSelect 字段兜底)。
   */
  resolveGroupField() {
    const t = this.doc.fields.filter(
      (o) => o.type === "select" || o.type === "multiSelect"
    );
    return t.length === 0 ? null : (this.groupFieldId ? t.find((o) => o.id === this.groupFieldId) : void 0) ?? t[0];
  }
  /**
   * 构建单列(组头 + 卡片 + 添加按钮;recordIds 为空时渲染占位行)。
   */
  buildColumn(t, n, o, r, i) {
    const s = document.createElement("div");
    s.className = "zt-jsonview-kanban-column", s.dataset.groupKey = n;
    const a = document.createElement("div");
    a.className = "zt-jsonview-kanban-column-head", a.textContent = o, s.appendChild(a);
    const l = document.createElement("div");
    l.className = "zt-jsonview-kanban-cards";
    const c = document.createElement("div");
    if (c.className = "zt-jsonview-kanban-cards-content", l.appendChild(c), this.readOnly || (l.addEventListener("dragover", (u) => {
      u.preventDefault(), l.classList.add("zt-jsonview-kanban-dragover");
    }), l.addEventListener("dragleave", () => {
      l.classList.remove("zt-jsonview-kanban-dragover");
    }), l.addEventListener("drop", (u) => {
      var p;
      u.preventDefault(), l.classList.remove("zt-jsonview-kanban-dragover"), this.dragFrozen = !1;
      const h = ((p = u.dataTransfer) == null ? void 0 : p.getData("text/meditor-jsonview-record")) || this.draggingRecordId;
      h && this.moveRecordToGroup(t, h, n), this.draggingRecordId = null;
    })), r.length === 0 && !this.readOnly) {
      const u = document.createElement("div");
      u.className = "zt-jsonview-kanban-empty", u.textContent = this.messages.kanbanDropHere, c.appendChild(u);
    }
    const d = this.resolveTitleField();
    if (r.length >= lm && !this.dragFrozen) {
      let u = null;
      const h = new Vr({
        anchor: c,
        count: r.length,
        estimatedItemHeight: cm,
        overscan: dm,
        onRangeChange: (g) => {
          u && this.renderColumnWindow(u, g);
        }
      }), p = {
        container: c,
        recordIds: r,
        recordById: i,
        groupField: t,
        titleField: d,
        virtual: h,
        renderedRange: null
      };
      u = p, this.columnVirtuals.set(c, p), h.refresh(), s.appendChild(l);
    } else {
      for (const u of r) {
        const h = i.get(u);
        h && c.appendChild(this.buildCard(h, t, d));
      }
      s.appendChild(l);
    }
    if (!this.readOnly) {
      const u = document.createElement("button");
      u.type = "button", u.className = "zt-jsonview-kanban-add", u.textContent = `+ ${this.messages.addCard}`, u.addEventListener("click", () => {
        const h = Wt(this.doc), p = {};
        n !== "" && (p[t.id] = t.type === "multiSelect" ? [n] : n), this.doc = { ...this.doc, records: [...this.doc.records, { id: h, cells: p }] }, this.render(), this.callbacks.onDocChange(this.doc, "record");
      }), s.appendChild(u);
    }
    return s;
  }
  /**
   * 虚拟窗口渲染:占位(spacer)×2 + [start, end) 卡片(无 DOM 复用,重建即渲染)。
   * 同窗口去重,滚动中不反复重建。
   */
  renderColumnWindow(t, n) {
    const o = t.renderedRange;
    if (o !== null && o.start === n.start && o.end === n.end && o.padTop === n.padTop && o.padBottom === n.padBottom)
      return;
    t.renderedRange = { ...n };
    const r = t.container, i = t.recordIds.length, s = [];
    for (let c = n.start; c < n.end; c += 1) {
      const d = t.recordIds[c], u = d ? t.recordById.get(d) : void 0;
      u && s.push(this.buildCard(u, t.groupField, t.titleField));
    }
    if (r.textContent = "", n.start > 0) {
      const c = n.padTop + n.start * co - co;
      r.appendChild(this.buildKanbanSpacer(Math.max(0, c), "top"));
    }
    if (s.forEach((c) => r.appendChild(c)), n.end < i) {
      const c = n.padBottom + (i - n.end) * co - co;
      r.appendChild(this.buildKanbanSpacer(Math.max(0, c), "bottom"));
    }
    const a = t.virtual;
    let l = n.start;
    for (const c of s)
      a.measureItem(l, c.offsetHeight), l += 1;
  }
  /**
   * 构建虚拟占位块(dataset.side 标记顶部/底部,冻结展开时定向摘除底部)。
   */
  buildKanbanSpacer(t, n) {
    const o = document.createElement("div");
    return o.className = "zt-jsonview-kanban-virtual-spacer", o.dataset.side = n, o.style.height = `${Math.max(0, Math.round(t))}px`, o;
  }
  /**
   * 拖拽冻结:源列就地展开为全量渲染(dragstart 触发)。
   *
   * 不整列重建 —— 重建会替换拖拽中的卡片元素,浏览器在 dragstart 处理完才捕获
   * 拖影,源元素被移除会直接取消拖拽。就地展开:保留顶部占位与既有窗口卡片,
   * 追加窗口尾部之后的全部卡片、摘除底部占位;布局零位移,拖拽中的卡片元素
   * 始终不被销毁。此后该列不再有 VirtualList(滚动不触发窗口重建)。
   */
  freezeColumnForDrag(t) {
    this.dragFrozen = !0;
    const n = t.parentElement, o = n ? this.columnVirtuals.get(n) : void 0;
    if (!o)
      return;
    const r = o.virtual.getRange(), i = o.recordIds.length;
    for (let s = r.end; s < i; s += 1) {
      const a = o.recordIds[s], l = a ? o.recordById.get(a) : void 0;
      l && o.container.appendChild(this.buildCard(l, o.groupField, o.titleField));
    }
    o.container.querySelectorAll(
      ':scope > .zt-jsonview-kanban-virtual-spacer[data-side="bottom"]'
    ).forEach((s) => s.remove()), o.virtual.destroy(), this.columnVirtuals.delete(o.container);
  }
  /**
   * 拖拽结束恢复:复位冻结标记并整体重建(各列恢复虚拟化;drop 已渲染过时幂等)。
   */
  unfreezeAfterDrag() {
    this.dragFrozen && (this.dragFrozen = !1, this.render());
  }
  /**
   * 销毁全部列虚拟列表(render 重建前 / 视图销毁时调用,摘 document 级监听)。
   */
  teardownColumnVirtuals() {
    this.columnVirtuals.forEach((t) => t.virtual.destroy()), this.columnVirtuals.clear();
  }
  /**
   * 视图销毁:摘除虚拟列表的 document/window 级监听(渲染器卸载视图时调用)。
   */
  destroy() {
    this.teardownColumnVirtuals();
  }
  /**
   * 解析标题字段(第一个 text 字段;无则首个非分组字段;再无则 null)。
   */
  resolveTitleField() {
    var o;
    const t = (o = this.resolveGroupField()) == null ? void 0 : o.id, n = this.doc.fields.filter((r) => r.id !== t);
    return n.find((r) => r.type === "text") ?? n[0] ?? null;
  }
  /**
   * 构建单张卡片(标题 + 次要字段摘要;可拖拽)。
   */
  buildCard(t, n, o) {
    const r = document.createElement("div");
    r.className = "zt-jsonview-kanban-card", r.draggable = !this.readOnly, r.dataset.recordId = t.id, this.readOnly || (r.addEventListener("dragstart", (l) => {
      var c;
      this.draggingRecordId = t.id, (c = l.dataTransfer) == null || c.setData("text/meditor-jsonview-record", t.id), l.dataTransfer && (l.dataTransfer.effectAllowed = "move"), r.classList.add("zt-jsonview-kanban-dragging"), this.freezeColumnForDrag(r);
    }), r.addEventListener("dragend", () => {
      r.classList.remove("zt-jsonview-kanban-dragging"), this.draggingRecordId = null, this.unfreezeAfterDrag();
    }));
    const i = document.createElement("div");
    i.className = "zt-jsonview-kanban-card-title", o && i.appendChild(Ge(o, t.cells[o.id] ?? null)), r.appendChild(i);
    const s = document.createElement("div");
    s.className = "zt-jsonview-kanban-card-summary";
    let a = 0;
    for (const l of this.doc.fields) {
      if (a >= am)
        break;
      if (l.id === n.id || l.id === (o == null ? void 0 : o.id))
        continue;
      const c = t.cells[l.id];
      if (c == null || c === "" || Array.isArray(c) && c.length === 0)
        continue;
      const d = document.createElement("div");
      d.className = "zt-jsonview-kanban-card-line";
      const u = document.createElement("span");
      u.className = "zt-jsonview-kanban-card-key", u.textContent = l.name;
      const h = document.createElement("span");
      h.appendChild(Ge(l, c)), d.appendChild(u), d.appendChild(h), s.appendChild(d), a += 1;
    }
    return a > 0 && r.appendChild(s), r;
  }
  /**
   * 换组写回:multiSelect = 增删数组项;select = 直接覆盖;同组无操作。
   */
  moveRecordToGroup(t, n, o) {
    const r = this.doc.records.find((c) => c.id === n);
    if (!r)
      return;
    const i = r.cells[t.id] ?? null;
    if (t.type === "multiSelect" ? Array.isArray(i) && i.includes(o) : i === o)
      return;
    let a;
    if (t.type === "multiSelect") {
      const u = (Array.isArray(i) ? i : []).filter((h) => h !== o).filter((h) => h !== "" && !this.isAnyGroupKey(t, h));
      a = o === "" ? u : [...u, o], a.length === 0 && (a = null);
    } else
      a = o === "" ? null : o;
    const l = this.doc.records.map((c) => {
      if (c.id !== n)
        return c;
      const d = { ...c.cells };
      return a === null ? delete d[t.id] : d[t.id] = a, { id: c.id, cells: d };
    });
    this.doc = { ...this.doc, records: l }, this.render(), this.callbacks.onDocChange(this.doc, "drag");
  }
  /**
   * 判断值是否属于任何分组键(换组时清理旧组残留)。
   */
  isAnyGroupKey(t, n) {
    const o = /* @__PURE__ */ new Set([...t.options ?? []]);
    for (const r of this.doc.records) {
      const i = r.cells[t.id];
      Array.isArray(i) ? i.forEach((s) => o.add(s)) : typeof i == "string" && i !== "" && o.add(i);
    }
    return o.has(n);
  }
}
const um = /^(https?:\/\/|data:image\/)/i, hm = 200, mm = 210, pm = 8, fm = 170, vs = 10;
class gm {
  /**
   * 初始化视图。
   */
  constructor(t, n, o, r, i, s, a) {
    /** 根元素。 */
    m(this, "dom");
    /** 当前文档。 */
    m(this, "doc");
    /** 只读态。 */
    m(this, "readOnly");
    /** 当前文案。 */
    m(this, "messages");
    /** 回调。 */
    m(this, "callbacks");
    /** 图片字段 id。 */
    m(this, "imageFieldId");
    /** 标题字段 id。 */
    m(this, "titleFieldId");
    /** 运行时筛选。 */
    m(this, "filter");
    /** 运行时排序。 */
    m(this, "sort");
    /** 展开编辑中的记录 id。 */
    m(this, "expandedRecordId", null);
    /** 虚拟列表助手(按行索引;记录数低于阈值时为 null)。 */
    m(this, "virtual", null);
    /** 上一次渲染的窗口(去重:窗口/占位/列数均未变化时不重建)。 */
    m(this, "renderedRange", null);
    /** 上一次渲染时的行内列数(列数变化后强制重建)。 */
    m(this, "renderedColumns", 0);
    /** 行内列数(未挂载时按 3 估计,挂载后实测修正)。 */
    m(this, "columnsPerRow", 3);
    /** 当前视图记录(筛选/排序后)。 */
    m(this, "viewRecords", []);
    /** 记录 id → 视图下标(展开行定位用)。 */
    m(this, "recordIndexById", /* @__PURE__ */ new Map());
    /** 画廊网格容器(虚拟化时是 VirtualList 锚点)。 */
    m(this, "grid", null);
    this.doc = t, this.readOnly = n, this.messages = o, this.imageFieldId = r, this.titleFieldId = i, this.filter = s.filter, this.sort = s.sort, this.callbacks = a, this.dom = document.createElement("div"), this.dom.className = "zt-jsonview-gallery-view", this.render();
  }
  /**
   * 外部整体替换文档。
   */
  setDoc(t) {
    this.doc = t, this.render();
  }
  /**
   * 读取当前文档。
   */
  getDoc() {
    return this.doc;
  }
  /**
   * 重绘。
   */
  render() {
    this.teardownVirtual(), this.dom.textContent = "";
    const t = this.resolveField(this.imageFieldId, "url");
    if (!t) {
      const r = document.createElement("div");
      r.className = "zt-jsonview-view-notice", r.textContent = this.messages.galleryNoImage, this.dom.appendChild(r);
      return;
    }
    const n = this.resolveField(this.titleFieldId, "text");
    this.viewRecords = bn(this.doc, this.filter, this.sort), this.recordIndexById.clear(), this.viewRecords.forEach((r, i) => {
      this.recordIndexById.set(r.id, i);
    });
    const o = document.createElement("div");
    if (o.className = "zt-jsonview-gallery-grid", this.grid = o, this.renderedRange = null, this.viewRecords.length >= hm)
      o.classList.add("zt-jsonview-gallery-grid-virtual"), this.dom.appendChild(o), this.columnsPerRow = this.resolveColumnsPerRow(), this.renderedColumns = this.columnsPerRow, this.virtual = new Vr({
        anchor: o,
        count: Math.ceil(this.viewRecords.length / this.columnsPerRow),
        estimatedItemHeight: mm,
        overscan: pm,
        onRangeChange: (r) => {
          this.handleRangeChange(r);
        }
      }), this.virtual.refresh();
    else {
      for (const r of this.viewRecords)
        o.appendChild(this.buildCard(r, t, n));
      this.dom.appendChild(o);
    }
    if (!this.readOnly) {
      const r = document.createElement("button");
      r.type = "button", r.className = "zt-jsonview-view-add", r.textContent = `+ ${this.messages.addCard}`, r.addEventListener("click", () => {
        const i = Wt(this.doc);
        this.doc = { ...this.doc, records: [...this.doc.records, { id: i, cells: {} }] }, this.expandedRecordId = i, this.render(), this.callbacks.onDocChange(this.doc, "record");
      }), this.dom.appendChild(r);
    }
  }
  /**
   * 虚拟窗口变化入口:实测行内列数,窗口/占位/列数均未变化时不重建。
   */
  handleRangeChange(t) {
    var r;
    const n = this.resolveColumnsPerRow();
    n !== this.columnsPerRow && (this.columnsPerRow = n, (r = this.virtual) == null || r.update({ count: Math.ceil(this.viewRecords.length / n) }), this.renderedRange = null);
    const o = this.renderedRange;
    o !== null && this.renderedColumns === this.columnsPerRow && o.start === t.start && o.end === t.end && o.padTop === t.padTop && o.padBottom === t.padBottom || (this.renderedRange = { ...t }, this.renderedColumns = this.columnsPerRow, this.renderWindowRows(t));
  }
  /**
   * 重建窗口行:占位(spacer)+ 窗口行 + 展开编辑行(在窗口外时钉住渲染)。
   */
  renderWindowRows(t) {
    const n = this.grid, o = this.virtual;
    if (!n || !o)
      return;
    const r = this.columnsPerRow, i = this.resolveField(this.imageFieldId, "url"), s = this.resolveField(this.titleFieldId, "text");
    if (!i)
      return;
    const a = Math.ceil(this.viewRecords.length / r), l = this.resolvePinnedRow(r), c = [
      { start: t.start, end: t.end }
    ];
    l !== null && (l < t.start || l >= t.end) && (l < t.start ? c.unshift({ start: l, end: l + 1 }) : c.push({ start: l, end: l + 1 })), n.textContent = "";
    const d = [];
    let u = 0;
    for (const h of c) {
      h.start > u && n.appendChild(
        this.buildGallerySpacer(this.offsetOfRows(h.start) - this.offsetOfRows(u))
      );
      for (let p = h.start; p < h.end; p += 1) {
        const g = this.buildGalleryRow(p, r, i, s);
        g && (n.appendChild(g), d.push({ row: p, element: g }));
      }
      u = h.end;
    }
    u < a && n.appendChild(
      this.buildGallerySpacer(this.offsetOfRows(a) - this.offsetOfRows(u))
    );
    for (const { row: h, element: p } of d)
      o.measureItem(h, p.offsetHeight);
  }
  /**
   * 构建单行包装(行内按列数铺卡片;空行返回 null 不占位)。
   */
  buildGalleryRow(t, n, o, r) {
    const i = document.createElement("div");
    i.className = "zt-jsonview-gallery-row";
    for (let s = 0; s < n; s += 1) {
      const a = t * n + s, l = this.viewRecords[a];
      l && i.appendChild(this.buildCard(l, o, r));
    }
    return i.childElementCount > 0 ? i : null;
  }
  /**
   * 行下标 → 内容区纵向偏移(px;实测优先,缺失按预估行高兜底,与窗口求解一致)。
   */
  offsetOfRows(t) {
    const n = this.virtual;
    if (!n || t <= 0)
      return 0;
    const o = n.getMeasurements(), r = n.getEstimatedItemHeight();
    let i = 0;
    for (let s = 0; s < t; s += 1) {
      const a = o == null ? void 0 : o[s];
      i += typeof a == "number" && a > 0 ? a : r;
    }
    return i;
  }
  /**
   * 展开编辑中的记录所在行(无展开/记录已删除时返回 null)。
   */
  resolvePinnedRow(t) {
    if (!this.expandedRecordId)
      return null;
    const n = this.recordIndexById.get(this.expandedRecordId);
    return n === void 0 ? null : Math.floor(n / t);
  }
  /**
   * 构建虚拟占位块(以高度撑起窗口外的行空间)。
   */
  buildGallerySpacer(t) {
    const n = document.createElement("div");
    return n.className = "zt-jsonview-gallery-virtual-spacer", n.style.height = `${Math.max(0, Math.round(t))}px`, n;
  }
  /**
   * 实测行内列数(容器宽度 / 列最小宽;未挂载时沿用当前估计,挂载后 RO 修正)。
   */
  resolveColumnsPerRow() {
    var n;
    const t = ((n = this.grid) == null ? void 0 : n.clientWidth) ?? 0;
    return t <= 0 ? this.columnsPerRow : Math.max(
      1,
      Math.floor((t + vs) / (fm + vs))
    );
  }
  /**
   * 销毁虚拟列表助手(render 重建 / 视图销毁前必须调用,摘 document 级监听)。
   */
  teardownVirtual() {
    var t;
    (t = this.virtual) == null || t.destroy(), this.virtual = null, this.grid = null;
  }
  /**
   * 视图销毁:摘除虚拟列表的 document/window 级监听(渲染器卸载视图时调用)。
   */
  destroy() {
    this.teardownVirtual();
  }
  /**
   * 解析注入字段(失效/未注入时按类型取第一个兜底)。
   */
  resolveField(t, n) {
    const o = t ? this.doc.fields.find((r) => r.id === t) : void 0;
    return o && o.type === n ? o : this.doc.fields.find((r) => r.type === n) ?? null;
  }
  /**
   * 构建单卡(图片 + 标题 + 点击展开编辑区)。
   */
  buildCard(t, n, o) {
    const r = document.createElement("div");
    r.className = "zt-jsonview-gallery-card", this.expandedRecordId === t.id && r.classList.add("zt-jsonview-gallery-card-open");
    const i = document.createElement("div");
    i.className = "zt-jsonview-gallery-image";
    const s = t.cells[n.id];
    if (typeof s == "string" && um.test(s.trim())) {
      const l = document.createElement("img");
      l.src = s.trim(), l.alt = "", l.loading = "lazy", l.addEventListener("error", () => {
        i.classList.add("zt-jsonview-gallery-image-broken");
      }), i.appendChild(l);
    }
    r.appendChild(i);
    const a = document.createElement("div");
    return a.className = "zt-jsonview-gallery-card-title", o && a.appendChild(Ge(o, t.cells[o.id] ?? null)), r.appendChild(a), this.expandedRecordId === t.id ? r.appendChild(this.buildEditorArea(t)) : this.readOnly || r.addEventListener("click", () => {
      this.expandedRecordId = t.id, this.render();
    }), r;
  }
  /**
   * 构建展开编辑区(全部字段控件;含删除记录)。
   */
  buildEditorArea(t) {
    const n = document.createElement("div");
    n.className = "zt-jsonview-gallery-editor", this.doc.fields.forEach((r) => {
      const i = document.createElement("div");
      i.className = "zt-jsonview-editor-line";
      const s = document.createElement("span");
      s.className = "zt-jsonview-editor-label", s.textContent = r.name || r.id, i.appendChild(s), this.readOnly ? i.appendChild(Ge(r, t.cells[r.id] ?? null)) : i.appendChild(
        Gn(t, r, {
          onWrite: (a, l, c) => {
            this.writeCell(a, l, c);
          }
        })
      ), n.appendChild(i);
    });
    const o = document.createElement("button");
    if (o.type = "button", o.className = "zt-jsonview-editor-collapse", o.textContent = "▴", o.addEventListener("click", (r) => {
      r.stopPropagation(), this.expandedRecordId = null, this.render();
    }), n.appendChild(o), !this.readOnly) {
      const r = document.createElement("button");
      r.type = "button", r.className = "zt-jsonview-editor-remove", r.textContent = `× ${this.messages.deleteRecord}`, r.addEventListener("click", (i) => {
        i.stopPropagation(), this.doc = {
          ...this.doc,
          records: this.doc.records.filter((s) => s.id !== t.id)
        }, this.expandedRecordId = null, this.render(), this.callbacks.onDocChange(this.doc, "record");
      }), n.appendChild(r);
    }
    return n;
  }
  /**
   * 写入单元格并提交。
   */
  writeCell(t, n, o) {
    const r = this.doc.records.find((l) => l.id === t), i = this.doc.fields.find((l) => l.id === n);
    if (!r || !i)
      return;
    const s = Ht(i.type, o), a = { ...r.cells };
    s === null ? delete a[n] : a[n] = s, this.doc = {
      ...this.doc,
      records: this.doc.records.map(
        (l) => l.id === t ? { id: l.id, cells: a } : l
      )
    }, this.callbacks.onDocChange(this.doc, "cell");
  }
}
const bm = 3;
class ym {
  /**
   * 初始化视图。
   */
  constructor(t, n, o, r, i, s) {
    /** 根元素。 */
    m(this, "dom");
    /** 当前文档。 */
    m(this, "doc");
    /** 只读态。 */
    m(this, "readOnly");
    /** 当前文案。 */
    m(this, "messages");
    /** 回调。 */
    m(this, "callbacks");
    /** 标题字段 id。 */
    m(this, "titleFieldId");
    /** 运行时筛选。 */
    m(this, "filter");
    /** 运行时排序。 */
    m(this, "sort");
    /** 展开编辑中的记录 id。 */
    m(this, "expandedRecordId", null);
    this.doc = t, this.readOnly = n, this.messages = o, this.titleFieldId = r, this.filter = i.filter, this.sort = i.sort, this.callbacks = s, this.dom = document.createElement("div"), this.dom.className = "zt-jsonview-list-view", this.render();
  }
  /**
   * 外部整体替换文档。
   */
  setDoc(t) {
    this.doc = t, this.render();
  }
  /**
   * 读取当前文档。
   */
  getDoc() {
    return this.doc;
  }
  /**
   * 重绘。
   */
  render() {
    this.dom.textContent = "";
    const t = this.resolveTitleField(), n = document.createElement("div");
    n.className = "zt-jsonview-list";
    for (const o of bn(this.doc, this.filter, this.sort))
      n.appendChild(this.buildRow(o, t));
    if (this.dom.appendChild(n), !this.readOnly) {
      const o = document.createElement("button");
      o.type = "button", o.className = "zt-jsonview-view-add", o.textContent = `+ ${this.messages.addRecord}`, o.addEventListener("click", () => {
        const r = Wt(this.doc);
        this.doc = { ...this.doc, records: [...this.doc.records, { id: r, cells: {} }] }, this.expandedRecordId = r, this.render(), this.callbacks.onDocChange(this.doc, "record");
      }), this.dom.appendChild(o);
    }
  }
  /**
   * 解析标题字段(第一个 text 字段;无则首个非多选字段)。
   */
  resolveTitleField() {
    const t = this.titleFieldId ? this.doc.fields.find((n) => n.id === this.titleFieldId) : void 0;
    return t || (this.doc.fields.find((n) => n.type === "text") ?? this.doc.fields.find((n) => n.type !== "multiSelect") ?? null);
  }
  /**
   * 构建单行(标题 + 摘要 + 展开编辑)。
   */
  buildRow(t, n) {
    const o = document.createElement("div");
    o.className = "zt-jsonview-list-row", this.expandedRecordId === t.id && o.classList.add("zt-jsonview-list-row-open");
    const r = document.createElement("div");
    r.className = "zt-jsonview-list-row-main";
    const i = document.createElement("span");
    i.className = "zt-jsonview-list-row-title", n && i.appendChild(Ge(n, t.cells[n.id] ?? null)), r.appendChild(i);
    let s = 0;
    for (const a of this.doc.fields) {
      if (s >= bm)
        break;
      if (a.id === (n == null ? void 0 : n.id))
        continue;
      const l = t.cells[a.id];
      if (l == null || l === "" || Array.isArray(l) && l.length === 0)
        continue;
      const c = document.createElement("span");
      c.className = "zt-jsonview-list-row-chip";
      const d = document.createElement("span");
      d.className = "zt-jsonview-kanban-card-key", d.textContent = a.name;
      const u = document.createElement("span");
      u.appendChild(Ge(a, l)), c.appendChild(d), c.appendChild(u), r.appendChild(c), s += 1;
    }
    return !this.readOnly && this.expandedRecordId !== t.id && o.addEventListener("click", () => {
      this.expandedRecordId = t.id, this.render();
    }), o.appendChild(r), this.expandedRecordId === t.id && o.appendChild(this.buildEditorArea(t)), o;
  }
  /**
   * 构建展开编辑区(全部字段控件 + 收起 + 删除)。
   */
  buildEditorArea(t) {
    const n = document.createElement("div");
    n.className = "zt-jsonview-gallery-editor", this.doc.fields.forEach((r) => {
      const i = document.createElement("div");
      i.className = "zt-jsonview-editor-line";
      const s = document.createElement("span");
      s.className = "zt-jsonview-editor-label", s.textContent = r.name || r.id, i.appendChild(s), this.readOnly ? i.appendChild(Ge(r, t.cells[r.id] ?? null)) : i.appendChild(
        Gn(t, r, {
          onWrite: (a, l, c) => {
            this.writeCell(a, l, c);
          }
        })
      ), n.appendChild(i);
    });
    const o = document.createElement("button");
    if (o.type = "button", o.className = "zt-jsonview-editor-collapse", o.textContent = "▴", o.addEventListener("click", (r) => {
      r.stopPropagation(), this.expandedRecordId = null, this.render();
    }), n.appendChild(o), !this.readOnly) {
      const r = document.createElement("button");
      r.type = "button", r.className = "zt-jsonview-editor-remove", r.textContent = `× ${this.messages.deleteRecord}`, r.addEventListener("click", (i) => {
        i.stopPropagation(), this.doc = { ...this.doc, records: this.doc.records.filter((s) => s.id !== t.id) }, this.expandedRecordId = null, this.render(), this.callbacks.onDocChange(this.doc, "record");
      }), n.appendChild(r);
    }
    return n;
  }
  /**
   * 写入单元格并提交。
   */
  writeCell(t, n, o) {
    const r = this.doc.records.find((l) => l.id === t), i = this.doc.fields.find((l) => l.id === n);
    if (!r || !i)
      return;
    const s = Ht(i.type, o), a = { ...r.cells };
    s === null ? delete a[n] : a[n] = s, this.doc = {
      ...this.doc,
      records: this.doc.records.map((l) => l.id === t ? { id: l.id, cells: a } : l)
    }, this.callbacks.onDocChange(this.doc, "cell");
  }
}
class Cs {
  /**
   * 初始化视图。
   */
  constructor(t, n, o, r, i, s, a) {
    /** 根元素。 */
    m(this, "dom");
    /** 当前文档。 */
    m(this, "doc");
    /** 只读态。 */
    m(this, "readOnly");
    /** 当前文案。 */
    m(this, "messages");
    /** 回调。 */
    m(this, "callbacks");
    /** 日期字段 id。 */
    m(this, "dateFieldId");
    /** 月份锚点('YYYY-MM')。 */
    m(this, "month");
    /** 运行时筛选。 */
    m(this, "filter");
    /** 展开编辑中的记录 id。 */
    m(this, "expandedRecordId", null);
    /** 拖拽中的记录 id。 */
    m(this, "draggingRecordId", null);
    this.doc = t, this.readOnly = n, this.messages = o, this.dateFieldId = r, this.month = i ?? Zo.currentMonthKey(), this.filter = s.filter, this.callbacks = a, this.dom = document.createElement("div"), this.dom.className = "zt-jsonview-calendar-view", this.render();
  }
  /**
   * 外部整体替换文档。
   */
  setDoc(t) {
    this.doc = t, this.render();
  }
  /**
   * 读取当前文档。
   */
  getDoc() {
    return this.doc;
  }
  /**
   * 读取当前日期字段 id(渲染器回存运行时状态)。
   */
  getDateFieldId() {
    var t;
    return ((t = this.resolveDateField()) == null ? void 0 : t.id) ?? null;
  }
  /**
   * 重绘。
   */
  render() {
    this.dom.textContent = "";
    const t = this.resolveDateField();
    if (!t) {
      const o = document.createElement("div");
      o.className = "zt-jsonview-view-notice", o.textContent = this.messages.calendarNoDate, this.dom.appendChild(o);
      return;
    }
    this.dom.appendChild(this.buildMonthNav());
    const n = this.doc.records.filter((o) => this.recordDayKey(o, t) === null);
    n.length > 0 && this.dom.appendChild(this.buildUnscheduledStrip(n, t)), this.dom.appendChild(this.buildMonthGrid(t));
  }
  /**
   * 解析日期字段(注入失效时取第一个 date 字段兜底)。
   */
  resolveDateField() {
    const t = this.doc.fields.filter((o) => o.type === "date");
    return t.length === 0 ? null : (this.dateFieldId ? t.find((o) => o.id === this.dateFieldId) : void 0) ?? t[0];
  }
  /**
   * 记录的日期键('YYYY-MM-DD' | null)。
   */
  recordDayKey(t, n) {
    const o = t.cells[n.id];
    if (typeof o != "string" || o.trim() === "")
      return null;
    const r = /^(\d{4}-\d{2}-\d{2})/.exec(o.trim());
    return (r == null ? void 0 : r[1]) ?? null;
  }
  /**
   * 构建月导航(‹ 标题 › + 今天)。
   */
  buildMonthNav() {
    const t = document.createElement("div");
    t.className = "zt-jsonview-calendar-nav";
    const [n, o] = this.month.split("-"), r = document.createElement("span");
    if (r.className = "zt-jsonview-calendar-title", r.textContent = this.messages.calendarMonth.replace("{0}", n ?? "").replace("{1}", String(Number.parseInt(o ?? "1", 10))), t.appendChild(r), !this.readOnly) {
      const i = document.createElement("button");
      i.type = "button", i.className = "zt-jsonview-calendar-nav-btn", i.textContent = "‹", i.title = this.messages.calendarPrev, i.setAttribute("aria-label", this.messages.calendarPrev), i.addEventListener("click", () => this.shiftMonth(-1)), t.appendChild(i);
      const s = document.createElement("button");
      s.type = "button", s.className = "zt-jsonview-calendar-nav-btn", s.textContent = this.messages.calendarToday, s.addEventListener("click", () => {
        this.month = Zo.currentMonthKey(), this.callbacks.onMonthChange(this.month), this.render();
      }), t.appendChild(s);
      const a = document.createElement("button");
      a.type = "button", a.className = "zt-jsonview-calendar-nav-btn", a.textContent = "›", a.title = this.messages.calendarNext, a.setAttribute("aria-label", this.messages.calendarNext), a.addEventListener("click", () => this.shiftMonth(1)), t.appendChild(a);
    }
    return t;
  }
  /**
   * 切月。
   */
  shiftMonth(t) {
    const [n, o] = this.month.split("-").map((i) => Number.parseInt(i, 10)), r = new Date(Date.UTC(n || 1970, (o || 1) - 1 + t, 1));
    this.month = `${r.getUTCFullYear()}-${String(r.getUTCMonth() + 1).padStart(2, "0")}`, this.callbacks.onMonthChange(this.month), this.render();
  }
  /**
   * 构建「未排期」条(无日期值记录;可拖拽入格)。
   */
  buildUnscheduledStrip(t, n) {
    const o = document.createElement("div");
    o.className = "zt-jsonview-calendar-unscheduled";
    const r = document.createElement("span");
    r.className = "zt-jsonview-calendar-unscheduled-label", r.textContent = this.messages.ungroupedLabel, o.appendChild(r);
    for (const i of t)
      o.appendChild(this.buildChip(i, n, null));
    return o;
  }
  /**
   * 构建月网格(表头 + 6 行 × 7 列)。
   */
  buildMonthGrid(t) {
    const n = document.createElement("div");
    n.className = "zt-jsonview-calendar-grid", this.messages.calendarWeekdays.split(",").forEach((a) => {
      const l = document.createElement("div");
      l.className = "zt-jsonview-calendar-weekday", l.textContent = a.trim(), n.appendChild(l);
    });
    const r = Zo.buildMonthDays(this.month), i = /* @__PURE__ */ new Map(), s = bn(this.doc, this.filter, null);
    for (const a of s) {
      const l = this.recordDayKey(a, t);
      if (!l)
        continue;
      const c = i.get(l) ?? [];
      c.push(a), i.set(l, c);
    }
    for (const a of r)
      n.appendChild(this.buildDayCell(a, t, i.get(a.iso) ?? []));
    return n;
  }
  /**
   * 构建单日格。
   */
  buildDayCell(t, n, o) {
    const r = document.createElement("div");
    r.className = "zt-jsonview-calendar-day", t.inMonth || r.classList.add("zt-jsonview-calendar-day-out"), t.isToday && r.classList.add("zt-jsonview-calendar-day-today"), r.dataset.date = t.iso;
    const i = document.createElement("div");
    i.className = "zt-jsonview-calendar-day-num", i.textContent = String(t.dayOfMonth), r.appendChild(i);
    for (const s of o)
      r.appendChild(this.buildChip(s, n, t.iso));
    return this.readOnly || (r.addEventListener("dragover", (s) => {
      s.preventDefault(), r.classList.add("zt-jsonview-calendar-dragover");
    }), r.addEventListener("dragleave", () => {
      r.classList.remove("zt-jsonview-calendar-dragover");
    }), r.addEventListener("drop", (s) => {
      var l;
      s.preventDefault(), r.classList.remove("zt-jsonview-calendar-dragover");
      const a = ((l = s.dataTransfer) == null ? void 0 : l.getData("text/meditor-jsonview-record")) || this.draggingRecordId;
      a && this.scheduleRecord(a, n, t.iso), this.draggingRecordId = null;
    }), r.addEventListener("click", (s) => {
      if (s.target !== r && s.target !== i)
        return;
      const a = Wt(this.doc);
      this.doc = {
        ...this.doc,
        records: [...this.doc.records, { id: a, cells: { [n.id]: t.iso } }]
      }, this.expandedRecordId = a, this.render(), this.callbacks.onDocChange(this.doc, "record");
    })), r;
  }
  /**
   * 构建记录 chip(标题文本;可拖拽;点击展开编辑)。
   */
  buildChip(t, n, o) {
    const r = document.createElement("div");
    r.className = "zt-jsonview-calendar-chip", r.draggable = !this.readOnly, r.dataset.recordId = t.id;
    const i = this.doc.fields.find((s) => s.type === "text" && s.id !== n.id) ?? this.doc.fields.find((s) => s.id !== n.id);
    return i && r.appendChild(Ge(i, t.cells[i.id] ?? null)), this.readOnly || (r.addEventListener("dragstart", (s) => {
      var a;
      this.draggingRecordId = t.id, (a = s.dataTransfer) == null || a.setData("text/meditor-jsonview-record", t.id), s.dataTransfer && (s.dataTransfer.effectAllowed = "move"), r.classList.add("zt-jsonview-kanban-dragging");
    }), r.addEventListener("dragend", () => {
      r.classList.remove("zt-jsonview-kanban-dragging"), this.draggingRecordId = null;
    }), r.addEventListener("click", (s) => {
      s.stopPropagation(), this.expandedRecordId = this.expandedRecordId === t.id ? null : t.id, this.render();
    })), this.expandedRecordId === t.id && r.appendChild(this.buildChipEditor(t, n, o)), r;
  }
  /**
   * chip 展开编辑器(日期字段 + 标题字段快捷编辑)。
   */
  buildChipEditor(t, n, o) {
    const r = document.createElement("div");
    r.className = "zt-jsonview-calendar-chip-editor";
    const i = document.createElement("input");
    i.type = "date", i.value = o ?? "", i.addEventListener("change", () => {
      i.value && this.scheduleRecord(t.id, n, i.value);
    }), r.appendChild(i);
    const s = this.doc.fields.find((a) => a.type === "text" && a.id !== n.id);
    if (s && r.appendChild(
      Gn(t, s, {
        onWrite: (a, l, c) => {
          this.writeCell(a, l, c);
        }
      })
    ), !this.readOnly) {
      const a = document.createElement("button");
      a.type = "button", a.className = "zt-jsonview-editor-remove", a.textContent = `× ${this.messages.deleteRecord}`, a.addEventListener("click", (l) => {
        l.stopPropagation(), this.doc = { ...this.doc, records: this.doc.records.filter((c) => c.id !== t.id) }, this.expandedRecordId = null, this.render(), this.callbacks.onDocChange(this.doc, "record");
      }), r.appendChild(a);
    }
    return r;
  }
  /**
   * 改期写回(kind 'drag')。
   */
  scheduleRecord(t, n, o) {
    this.writeCell(t, n.id, o), this.callbacks.onDocChange(this.doc, "drag");
  }
  /**
   * 写入单元格并提交。
   */
  writeCell(t, n, o) {
    const r = this.doc.records.find((l) => l.id === t), i = this.doc.fields.find((l) => l.id === n);
    if (!r || !i)
      return;
    const s = Ht(i.type, o), a = { ...r.cells };
    s === null ? delete a[n] : a[n] = s, this.doc = {
      ...this.doc,
      records: this.doc.records.map((l) => l.id === t ? { id: l.id, cells: a } : l)
    }, this.callbacks.onDocChange(this.doc, "cell");
  }
}
const Zo = {
  /**
   * 当前月份键('YYYY-MM')。
   */
  currentMonthKey: () => {
    const e = /* @__PURE__ */ new Date();
    return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}`;
  },
  /**
   * 构建月矩阵 42 格(前补上月尾,后补下月头;含今天标记)。
   */
  buildMonthDays: (e) => {
    const [t, n] = e.split("-").map((a) => Number.parseInt(a, 10)), o = new Date(Date.UTC(t || 1970, (n || 1) - 1, 1)), r = new Date(o);
    r.setUTCDate(r.getUTCDate() - r.getUTCDay());
    const i = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), s = [];
    for (let a = 0; a < 42; a += 1) {
      const l = new Date(r);
      l.setUTCDate(r.getUTCDate() + a);
      const c = l.toISOString().slice(0, 10);
      s.push({
        iso: c,
        dayOfMonth: l.getUTCDate(),
        inMonth: c.startsWith(e),
        isToday: c === i
      });
    }
    return s;
  }
}, ht = 28, km = 26, Es = (e) => {
  if (typeof e != "string" || e.trim() === "")
    return null;
  const t = /^(\d{4}-\d{2}-\d{2})/.exec(e.trim());
  return (t == null ? void 0 : t[1]) ?? null;
}, Qt = (e) => Math.floor(Date.parse(`${e}T00:00:00Z`) / 864e5);
class zs {
  /**
   * 初始化视图。
   */
  constructor(t, n, o, r, i, s, a) {
    /** 根元素。 */
    m(this, "dom");
    /** 当前文档。 */
    m(this, "doc");
    /** 只读态。 */
    m(this, "readOnly");
    /** 当前文案。 */
    m(this, "messages");
    /** 回调。 */
    m(this, "callbacks");
    /** 开始日期字段 id。 */
    m(this, "startFieldId");
    /** 结束日期字段 id。 */
    m(this, "endFieldId");
    /** 运行时筛选。 */
    m(this, "filter");
    /** 运行时排序。 */
    m(this, "sort");
    /** 展开编辑中的记录 id。 */
    m(this, "expandedRecordId", null);
    this.doc = t, this.readOnly = n, this.messages = o, this.startFieldId = r, this.endFieldId = i, this.filter = s.filter, this.sort = s.sort, this.callbacks = a, this.dom = document.createElement("div"), this.dom.className = "zt-jsonview-gantt-view", this.render();
  }
  /**
   * 外部整体替换文档。
   */
  setDoc(t) {
    this.doc = t, this.render();
  }
  /**
   * 读取当前文档。
   */
  getDoc() {
    return this.doc;
  }
  /**
   * 读取当前开始/结束字段 id(渲染器回存运行时状态)。
   */
  getDateFieldIds() {
    const t = this.doc.fields.filter((o) => o.type === "date"), n = (o) => o && t.some((r) => r.id === o) ? o : null;
    return { startFieldId: n(this.startFieldId), endFieldId: n(this.endFieldId) };
  }
  /**
   * 重绘。
   */
  render() {
    this.dom.textContent = "";
    const t = this.doc.fields.filter((i) => i.type === "date");
    if (t.length === 0) {
      const i = document.createElement("div");
      i.className = "zt-jsonview-view-notice", i.textContent = this.messages.ganttNoDate, this.dom.appendChild(i);
      return;
    }
    const n = this.resolveStartField(t), o = this.resolveEndField(t), r = bn(this.doc, this.filter, this.sort);
    if (this.dom.appendChild(this.buildTimeline(r, n, o)), !this.readOnly) {
      const i = document.createElement("button");
      i.type = "button", i.className = "zt-jsonview-view-add", i.textContent = `+ ${this.messages.addRecord}`, i.addEventListener("click", () => {
        const s = Wt(this.doc);
        this.doc = { ...this.doc, records: [...this.doc.records, { id: s, cells: {} }] }, this.expandedRecordId = s, this.render(), this.callbacks.onDocChange(this.doc, "record");
      }), this.dom.appendChild(i);
    }
  }
  /**
   * 解析开始字段(注入失效时取第一个 date 字段兜底)。
   */
  resolveStartField(t) {
    return (this.startFieldId ? t.find((o) => o.id === this.startFieldId) : void 0) ?? t[0];
  }
  /**
   * 解析结束字段(注入失效时取第二个 date 字段兜底;仍缺失则与开始字段相同)。
   */
  resolveEndField(t) {
    return (this.endFieldId ? t.find((o) => o.id === this.endFieldId) : void 0) ?? t[1] ?? t[0];
  }
  /**
   * 记录的起止 ISO 日期(缺失起期返回 null)。
   */
  recordRange(t, n, o) {
    const r = Es(t.cells[n.id] ?? null);
    if (!r)
      return null;
    const i = Es(t.cells[o.id] ?? null), s = i && i >= r ? i : r;
    return { start: r, end: s };
  }
  /**
   * 构建时间轴(头部刻度 + 行条形 + 今日线)。
   */
  buildTimeline(t, n, o) {
    const r = document.createElement("div");
    r.className = "zt-jsonview-gantt-timeline";
    let i = Number.MAX_SAFE_INTEGER, s = Number.MIN_SAFE_INTEGER;
    for (const u of t) {
      const h = this.recordRange(u, n, o);
      h && (i = Math.min(i, Qt(h.start)), s = Math.max(s, Qt(h.end)));
    }
    if (i > s) {
      const u = Qt((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
      i = u, s = u + 13;
    }
    const a = Math.max(s - i + 1, 14), l = a * ht;
    r.appendChild(this.buildHeader(i, a)), r.appendChild(this.buildTodayLine(i, a));
    const c = document.createElement("div");
    c.className = "zt-jsonview-gantt-body";
    const d = this.resolveTitleField(n);
    for (const u of t)
      c.appendChild(this.buildRow(u, n, o, d, i, a, l));
    return r.appendChild(c), r;
  }
  /**
   * 构建头部(月分组 + 逐日数字)。
   */
  buildHeader(t, n) {
    const o = document.createElement("div");
    o.className = "zt-jsonview-gantt-header", o.style.width = `${n * ht}px`;
    const r = document.createElement("div");
    r.className = "zt-jsonview-gantt-months";
    let i = 0;
    for (; i < n; ) {
      const l = new Date((t + i) * 864e5).toISOString().slice(0, 10).slice(0, 7);
      let c = 1;
      for (; i + c < n && new Date((t + i + c) * 864e5).toISOString().slice(0, 10).startsWith(l); )
        c += 1;
      const d = document.createElement("div");
      d.className = "zt-jsonview-gantt-month", d.style.width = `${c * ht}px`, d.textContent = l.replace("-", "/"), r.appendChild(d), i += c;
    }
    o.appendChild(r);
    const s = document.createElement("div");
    s.className = "zt-jsonview-gantt-days";
    for (let a = 0; a < n; a += 1) {
      const l = new Date((t + a) * 864e5), c = document.createElement("div");
      c.className = "zt-jsonview-gantt-day", l.toISOString().slice(0, 10) === (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) && c.classList.add("zt-jsonview-gantt-day-today"), (l.getUTCDay() === 0 || l.getUTCDay() === 6) && c.classList.add("zt-jsonview-gantt-day-weekend"), c.style.width = `${ht}px`, c.style.height = `${km}px`, c.textContent = String(l.getUTCDate()), s.appendChild(c);
    }
    return o.appendChild(s), o;
  }
  /**
   * 构建今日竖线。
   */
  buildTodayLine(t, n) {
    const o = document.createElement("div");
    o.className = "zt-jsonview-gantt-today-line";
    const r = Qt((/* @__PURE__ */ new Date()).toISOString().slice(0, 10)) - t;
    return r >= 0 && r < n ? o.style.left = `${r * ht + ht / 2}px` : o.style.display = "none", o;
  }
  /**
   * 构建单行(标题列 + 条形轨道)。
   */
  buildRow(t, n, o, r, i, s, a) {
    const l = document.createElement("div");
    l.className = "zt-jsonview-gantt-row", this.expandedRecordId === t.id && l.classList.add("zt-jsonview-gantt-row-open");
    const c = document.createElement("div");
    c.className = "zt-jsonview-gantt-row-title", r && c.appendChild(Ge(r, t.cells[r.id] ?? null)), l.appendChild(c);
    const d = document.createElement("div");
    d.className = "zt-jsonview-gantt-row-track", d.style.width = `${a}px`;
    const u = this.recordRange(t, n, o);
    if (u) {
      const h = Qt(u.start) - i, p = Qt(u.end) - i;
      if (p >= 0 && h < s) {
        const g = document.createElement("div");
        g.className = "zt-jsonview-gantt-bar", g.style.left = `${Math.max(h, 0) * ht}px`, g.style.width = `${(Math.min(p, s - 1) - Math.max(h, 0) + 1) * ht - 4}px`, g.title = `${u.start} ~ ${u.end}`, r && g.appendChild(Ge(r, t.cells[r.id] ?? null)), d.appendChild(g);
      }
    }
    return l.appendChild(d), this.readOnly || l.addEventListener("click", () => {
      this.expandedRecordId = this.expandedRecordId === t.id ? null : t.id, this.render();
    }), this.expandedRecordId === t.id && l.appendChild(this.buildEditorArea(t)), l;
  }
  /**
   * 解析标题字段(第一个 text 字段;无则首个非多选字段)。
   */
  resolveTitleField(t) {
    return this.doc.fields.find((n) => n.type === "text" && n.id !== t.id) ?? this.doc.fields.find((n) => n.id !== t.id && n.type !== "multiSelect") ?? null;
  }
  /**
   * 构建行内编辑区(全部字段控件 + 删除)。
   */
  buildEditorArea(t) {
    const n = document.createElement("div");
    if (n.className = "zt-jsonview-gantt-editor", this.doc.fields.forEach((o) => {
      const r = document.createElement("div");
      r.className = "zt-jsonview-editor-line";
      const i = document.createElement("span");
      i.className = "zt-jsonview-editor-label", i.textContent = o.name || o.id, r.appendChild(i), this.readOnly ? r.appendChild(Ge(o, t.cells[o.id] ?? null)) : r.appendChild(
        Gn(t, o, {
          onWrite: (s, a, l) => {
            this.writeCell(s, a, l);
          }
        })
      ), n.appendChild(r);
    }), !this.readOnly) {
      const o = document.createElement("button");
      o.type = "button", o.className = "zt-jsonview-editor-remove", o.textContent = `× ${this.messages.deleteRecord}`, o.addEventListener("click", (r) => {
        r.stopPropagation(), this.doc = { ...this.doc, records: this.doc.records.filter((i) => i.id !== t.id) }, this.expandedRecordId = null, this.render(), this.callbacks.onDocChange(this.doc, "record");
      }), n.appendChild(o);
    }
    return n;
  }
  /**
   * 写入单元格并提交。
   */
  writeCell(t, n, o) {
    const r = this.doc.records.find((l) => l.id === t), i = this.doc.fields.find((l) => l.id === n);
    if (!r || !i)
      return;
    const s = Ht(i.type, o), a = { ...r.cells };
    s === null ? delete a[n] : a[n] = s, this.doc = {
      ...this.doc,
      records: this.doc.records.map((l) => l.id === t ? { id: l.id, cells: a } : l)
    }, this.callbacks.onDocChange(this.doc, "cell");
  }
}
const wm = {
  property: "token property",
  string: "token string",
  number: "token number",
  boolean: "token boolean",
  null: "token null keyword",
  operator: "token operator",
  punctuation: "token punctuation"
}, vm = 1e5, Cm = 600, Em = 120, zm = 420, Mm = (e) => {
  const t = [], n = (r, i) => {
    r !== "" && t.push({ text: r, kind: i });
  };
  let o = 0;
  for (; o < e.length; ) {
    const r = e[o];
    if (/\s/.test(r)) {
      let s = o + 1;
      for (; s < e.length && /\s/.test(e[s]); )
        s += 1;
      n(e.slice(o, s), null), o = s;
      continue;
    }
    if (r === '"') {
      let s = o + 1;
      for (; s < e.length; ) {
        if (e[s] === "\\") {
          s = Math.min(s + 2, e.length);
          continue;
        }
        if (s += 1, e[s - 1] === '"')
          break;
      }
      const a = e.slice(o, s);
      let l = s;
      for (; l < e.length && /\s/.test(e[l]); )
        l += 1;
      n(a, e[l] === ":" ? "property" : "string"), o = s;
      continue;
    }
    const i = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(e.slice(o));
    if (i != null && i[0]) {
      n(i[0], "number"), o += i[0].length;
      continue;
    }
    if (e.startsWith("true", o) || e.startsWith("false", o)) {
      const s = o + (e.startsWith("true", o) ? 4 : 5);
      n(e.slice(o, s), "boolean"), o = s;
      continue;
    }
    if (e.startsWith("null", o)) {
      n(e.slice(o, o + 4), "null"), o += 4;
      continue;
    }
    /[{}[\],]/.test(r) ? n(r, "punctuation") : r === ":" ? n(r, "operator") : n(r, null), o += 1;
  }
  return t;
};
class Tm {
  /**
   * 初始化视图(签名与其余视图一致;query 参数仅为接口对齐,代码编辑器不做筛选排序)。
   */
  constructor(t, n, o, r, i) {
    /** 根元素。 */
    m(this, "dom");
    /** 当前文档。 */
    m(this, "doc");
    /** 只读态。 */
    m(this, "readOnly");
    /** 当前文案。 */
    m(this, "messages");
    /** 回调。 */
    m(this, "callbacks");
    /** 编辑器中的原始文本(输入中可能尚未合法;非提交态)。 */
    m(this, "code");
    /** 当前文本是否可解析为合法文档。 */
    m(this, "valid", !0);
    /** 提交防抖定时器。 */
    m(this, "commitTimer", null);
    /** 编辑器容器。 */
    m(this, "editor");
    /** 高亮层 code 元素(重着色目标)。 */
    m(this, "codeEl");
    /** 输入层(只读态为 null)。 */
    m(this, "textarea");
    /** 高亮层 pre(滚动同步目标)。 */
    m(this, "highlight");
    /** 高亮/输入叠层容器(JS 撑高目标)。 */
    m(this, "codeArea");
    /** 右键菜单(打开时非 null)。 */
    m(this, "contextMenu", null);
    /** 全局按下:点击菜单以外区域关闭(capture)。 */
    m(this, "handleMenuPointerDown", (t) => {
      var o;
      const n = t.target;
      n instanceof Node && ((o = this.contextMenu) != null && o.contains(n)) || this.closeContextMenu();
    });
    /** 全局按键:Escape 关闭并吞掉。 */
    m(this, "handleMenuKeyDown", (t) => {
      t.key === "Escape" && (t.stopPropagation(), this.closeContextMenu());
    });
    /** 全局滚动/缩放:菜单不跟随,直接关闭。 */
    m(this, "handleMenuScroll", () => {
      this.closeContextMenu();
    });
    /** 菜单视口变化订阅取消函数(resize + 捕获滚动统一绑定;null = 菜单未开)。 */
    m(this, "unsubscribeMenuViewport", null);
    if (this.doc = t, this.readOnly = n, this.messages = o, this.callbacks = i, this.code = je(t), this.dom = document.createElement("div"), this.dom.className = "zt-jsonview-text-view", this.editor = document.createElement("div"), this.editor.className = "zt-jsonview-code-editor", n && (this.editor.dataset.static = "true"), this.dom.appendChild(this.editor), this.codeArea = document.createElement("div"), this.codeArea.className = "zt-jsonview-code-area", this.editor.appendChild(this.codeArea), this.highlight = document.createElement("pre"), this.highlight.className = "zt-jsonview-code-highlight", this.highlight.setAttribute("aria-hidden", "true"), this.codeEl = document.createElement("code"), this.codeEl.className = "zt-jsonview-code-body", this.highlight.appendChild(this.codeEl), this.codeArea.appendChild(this.highlight), n)
      this.textarea = null;
    else {
      const s = document.createElement("textarea");
      s.className = "zt-jsonview-code-input", s.spellcheck = !1, s.wrap = "off", s.value = this.code, s.addEventListener("input", () => {
        this.handleInput();
      }), s.addEventListener("blur", () => {
        this.commit();
      }), s.addEventListener("scroll", () => {
        this.highlight.scrollTop = s.scrollTop, this.highlight.scrollLeft = s.scrollLeft;
      }), this.textarea = s, this.codeArea.appendChild(s);
    }
    this.editor.addEventListener("contextmenu", (s) => {
      this.openContextMenu(s);
    }), this.paint(), this.updateValidity(), requestAnimationFrame(() => {
      this.syncSize();
    });
  }
  /**
   * 外部整体替换文档(宿主回声不重写,防打字中光标跳动)。
   */
  setDoc(t) {
    const n = je(t);
    if (n === je(this.doc)) {
      this.doc = t;
      return;
    }
    this.doc = t, this.code = n, this.textarea && (this.textarea.value = n), this.paint(), this.updateValidity();
  }
  /**
   * 读取当前文档。
   */
  getDoc() {
    return this.doc;
  }
  /**
   * 输入处理:更新文本、重着色、更新合法性态、防抖提交。
   */
  handleInput() {
    this.textarea && (this.code = this.textarea.value, this.paint(), this.updateValidity(), this.syncSize(), this.commitTimer !== null && clearTimeout(this.commitTimer), this.commitTimer = setTimeout(() => {
      this.commitTimer = null, this.commit();
    }, Cm));
  }
  /**
   * 提交当前文本(合法才回调宿主;非法保持编辑态不打断输入)。
   */
  commit() {
    if (this.commitTimer !== null && (clearTimeout(this.commitTimer), this.commitTimer = null), !this.dom.isConnected)
      return;
    const t = Pt(this.code);
    !t.ok || je(t.doc) === je(this.doc) || (this.doc = t.doc, this.callbacks.onDocChange(this.doc, "json"));
  }
  /**
   * 格式化当前文本(非法时仅重排可解析内容外不可用,直接忽略)。
   */
  format() {
    const t = Pt(this.code);
    if (!t.ok)
      return;
    const n = je(t.doc);
    n !== this.code && (this.code = n, this.doc = t.doc, this.textarea && (this.textarea.value = n, this.syncSize()), this.paint(), this.updateValidity(), this.callbacks.onDocChange(this.doc, "json"));
  }
  /**
   * 清空:重置为保留名称的空库(合法 canonical JSON,立即提交,可撤销)。
   */
  clearAll() {
    const t = { version: 1, name: this.doc.name, fields: [], records: [] }, n = je(t);
    this.code = n, this.doc = t, this.textarea && (this.textarea.value = n, this.syncSize()), this.paint(), this.updateValidity(), this.callbacks.onDocChange(this.doc, "json");
  }
  /**
   * 打开右键菜单(视口定位,越界回拉;全局点击/按键/滚动关闭)。
   */
  openContextMenu(t) {
    t.preventDefault(), t.stopPropagation(), this.closeContextMenu();
    const n = document.createElement("div");
    if (n.className = "zt-jsonview-code-menu", n.setAttribute("role", "menu"), !this.readOnly) {
      const s = this.buildMenuItem(this.messages.codeFormat, () => {
        this.format();
      });
      s.disabled = !this.valid, n.appendChild(s), n.appendChild(
        this.buildMenuItem(this.messages.codeSelectAll, () => {
          var a, l;
          (a = this.textarea) == null || a.focus(), (l = this.textarea) == null || l.select();
        })
      );
    }
    n.appendChild(
      this.buildMenuItem(this.messages.codeCopy, () => {
        navigator.clipboard.writeText(this.code).catch(() => {
          this.copyViaExecCommand();
        });
      })
    ), this.readOnly || n.appendChild(this.buildMenuItem(this.messages.codeClear, () => {
      this.clearAll();
    }, "zt-jsonview-code-menu-item zt-jsonview-code-menu-danger")), document.body.appendChild(n);
    const o = n.getBoundingClientRect(), r = Math.min(t.clientX, window.innerWidth - o.width - 8), i = Math.min(t.clientY, window.innerHeight - o.height - 8);
    n.style.left = `${Math.max(0, r)}px`, n.style.top = `${Math.max(0, i)}px`, this.contextMenu = n, document.addEventListener("pointerdown", this.handleMenuPointerDown, !0), document.addEventListener("keydown", this.handleMenuKeyDown, !0), this.unsubscribeMenuViewport = kl(this.handleMenuScroll);
  }
  /**
   * 构建单个菜单项。
   */
  buildMenuItem(t, n, o = "zt-jsonview-code-menu-item") {
    const r = document.createElement("button");
    return r.type = "button", r.className = o, r.setAttribute("role", "menuitem"), r.textContent = t, r.addEventListener("click", (i) => {
      i.stopPropagation(), this.closeContextMenu(), n();
    }), r;
  }
  /**
   * 剪贴板 API 不可用时的复制兜底(临时 textarea + execCommand)。
   */
  copyViaExecCommand() {
    const t = document.createElement("textarea");
    t.value = this.code, t.style.position = "fixed", t.style.opacity = "0", document.body.appendChild(t), t.select(), document.execCommand("copy"), t.remove();
  }
  /**
   * 关闭右键菜单并摘除全局监听。
   */
  closeContextMenu() {
    var t, n;
    (t = this.contextMenu) == null || t.remove(), this.contextMenu = null, document.removeEventListener("pointerdown", this.handleMenuPointerDown, !0), document.removeEventListener("keydown", this.handleMenuKeyDown, !0), (n = this.unsubscribeMenuViewport) == null || n.call(this), this.unsubscribeMenuViewport = null;
  }
  /**
   * 重建高亮层(token span 拼装;超长文档降级纯文本)。
   */
  paint() {
    if (this.codeEl.textContent = "", this.code.length > vm) {
      this.codeEl.textContent = this.code;
      return;
    }
    const t = document.createDocumentFragment();
    this.code.split(`
`).forEach((o, r) => {
      r > 0 && t.appendChild(document.createTextNode(`
`));
      for (const i of Mm(o)) {
        if (i.kind === null) {
          t.appendChild(document.createTextNode(i.text));
          continue;
        }
        const s = document.createElement("span");
        s.className = wm[i.kind], s.textContent = i.text, t.appendChild(s);
      }
    }), this.codeEl.appendChild(t);
  }
  /**
   * 更新合法性态(编辑器标红 + 提示行显隐)。
   */
  updateValidity() {
    const t = Pt(this.code).ok;
    t !== this.valid && (this.valid = t, this.editor.dataset.invalid = t ? "false" : "true");
  }
  /**
   * 按内容高度撑开叠层(夹在上下限之间;超出上限由 textarea 滚动并同步高亮层)。
   */
  syncSize() {
    if (!this.textarea)
      return;
    const t = Math.min(Math.max(this.textarea.scrollHeight, Em), zm);
    this.codeArea.style.height = `${t}px`;
  }
}
const Jo = {
  text: ["contains", "equals", "notEquals", "isEmpty", "isNotEmpty"],
  url: ["contains", "equals", "notEquals", "isEmpty", "isNotEmpty"],
  select: ["equals", "notEquals", "contains", "isEmpty", "isNotEmpty"],
  multiSelect: ["contains", "isEmpty", "isNotEmpty"],
  number: ["equals", "gt", "lt", "isEmpty", "isNotEmpty"],
  date: ["equals", "gt", "lt", "isEmpty", "isNotEmpty"],
  checkbox: ["equals"]
}, xm = {
  contains: "opContains",
  equals: "opEquals",
  notEquals: "opNotEquals",
  gt: "opGt",
  lt: "opLt",
  isEmpty: "opIsEmpty",
  isNotEmpty: "opIsNotEmpty"
};
class Sm {
  /**
   * 初始化面板。
   */
  constructor(t, n, o, r, i) {
    /** 根元素(弹出层)。 */
    m(this, "dom");
    /** 当前文档。 */
    m(this, "doc");
    /** 当前文案。 */
    m(this, "messages");
    /** 回调。 */
    m(this, "callbacks");
    /** 筛选条件。 */
    m(this, "conditions");
    /** 排序。 */
    m(this, "sort");
    this.doc = t, this.messages = n, this.conditions = [...o], this.sort = r, this.callbacks = i, this.dom = document.createElement("div"), this.dom.className = "zt-jsonview-query-panel", this.render();
  }
  /**
   * 外部同步(文档替换后字段集可能变化)。
   */
  update(t, n, o) {
    this.doc = t, this.conditions = n.filter(
      (r) => t.fields.some((i) => i.id === r.fieldId)
    ), this.sort = o, this.render();
  }
  /**
   * 重绘面板。
   */
  render() {
    this.dom.textContent = "", this.dom.appendChild(this.buildFilterSection()), this.dom.appendChild(this.buildSortSection());
  }
  /**
   * 构建筛选区。
   */
  buildFilterSection() {
    const t = document.createElement("div");
    t.className = "zt-jsonview-query-section";
    const n = document.createElement("div");
    if (n.className = "zt-jsonview-query-title", n.textContent = this.messages.filterSection, t.appendChild(n), this.conditions.forEach((o, r) => {
      t.appendChild(this.buildConditionRow(o, r));
    }), !this.readOnly()) {
      const o = document.createElement("button");
      o.type = "button", o.className = "zt-jsonview-query-add", o.textContent = `+ ${this.messages.addFilter}`, o.addEventListener("click", () => {
        var s;
        const r = this.doc.fields[0];
        if (!r)
          return;
        const i = ((s = Jo[r.type]) == null ? void 0 : s[0]) ?? "contains";
        this.conditions = [...this.conditions, { fieldId: r.id, op: i, value: "" }], this.render(), this.callbacks.onFilterChange(this.conditions);
      }), t.appendChild(o);
    }
    return t;
  }
  /**
   * 面板是否可编辑(有可选字段即视为可编辑;只读整表渲染已由视图层处理)。
   */
  readOnly() {
    return this.doc.fields.length === 0;
  }
  /**
   * 构建面板行内下拉(字段/比较符/排序方向通用)。
   */
  buildDropdown(t) {
    return new Wn({
      options: t.options,
      value: t.value,
      className: t.className,
      ariaLabel: t.ariaLabel,
      callbacks: { onSelect: t.onSelect }
    }).dom;
  }
  /**
   * 构建单条筛选条件行。
   */
  buildConditionRow(t, n) {
    const o = document.createElement("div");
    o.className = "zt-jsonview-query-row";
    const r = this.buildDropdown({
      className: "zt-jsonview-query-field",
      ariaLabel: this.messages.filterFieldPlaceholder,
      options: this.doc.fields.map((c) => ({ value: c.id, label: c.name || c.id })),
      value: t.fieldId,
      onSelect: (c) => {
        var h;
        const d = this.doc.fields.find((p) => p.id === c), u = ((h = Jo[(d == null ? void 0 : d.type) ?? "text"]) == null ? void 0 : h[0]) ?? "contains";
        this.conditions = this.conditions.map(
          (p, g) => g === n ? { ...p, fieldId: c, op: u } : p
        ), this.render(), this.callbacks.onFilterChange(this.conditions);
      }
    });
    o.appendChild(r);
    const i = this.doc.fields.find((c) => c.id === t.fieldId), s = this.buildDropdown({
      className: "zt-jsonview-query-op",
      options: (Jo[(i == null ? void 0 : i.type) ?? "text"] ?? ["contains"]).map((c) => ({
        value: c,
        label: this.messages[xm[c]]
      })),
      value: t.op,
      onSelect: (c) => {
        this.conditions = this.conditions.map(
          (d, u) => u === n ? { ...d, op: c } : d
        ), this.render(), this.callbacks.onFilterChange(this.conditions);
      }
    });
    if (o.appendChild(s), t.op !== "isEmpty" && t.op !== "isNotEmpty" && (i == null ? void 0 : i.type) !== "checkbox") {
      const c = document.createElement("input");
      c.type = (i == null ? void 0 : i.type) === "date" ? "date" : "text", c.className = "zt-jsonview-query-value", c.placeholder = this.messages.filterValuePlaceholder, c.value = t.value, c.addEventListener("change", () => {
        this.conditions = this.conditions.map(
          (d, u) => u === n ? { ...d, value: c.value } : d
        ), this.callbacks.onFilterChange(this.conditions);
      }), o.appendChild(c);
    }
    const l = document.createElement("button");
    return l.type = "button", l.className = "zt-jsonview-query-remove", l.textContent = "×", l.title = this.messages.removeCondition, l.setAttribute("aria-label", this.messages.removeCondition), l.addEventListener("click", () => {
      this.conditions = this.conditions.filter((c, d) => d !== n), this.render(), this.callbacks.onFilterChange(this.conditions);
    }), o.appendChild(l), o;
  }
  /**
   * 构建排序区。
   */
  buildSortSection() {
    var i;
    const t = document.createElement("div");
    t.className = "zt-jsonview-query-section";
    const n = document.createElement("div");
    n.className = "zt-jsonview-query-title", n.textContent = this.messages.sortSection, t.appendChild(n);
    const o = document.createElement("div");
    o.className = "zt-jsonview-query-row";
    const r = this.buildDropdown({
      className: "zt-jsonview-query-field",
      options: [
        { value: "", label: this.messages.sortNone },
        ...this.doc.fields.map((s) => ({ value: s.id, label: s.name || s.id }))
      ],
      value: ((i = this.sort) == null ? void 0 : i.fieldId) ?? "",
      onSelect: (s) => {
        var a;
        this.sort = s === "" ? null : { fieldId: s, direction: ((a = this.sort) == null ? void 0 : a.direction) ?? "asc" }, this.render(), this.callbacks.onSortChange(this.sort);
      }
    });
    if (o.appendChild(r), this.sort) {
      const s = this.buildDropdown({
        className: "zt-jsonview-query-op",
        options: [
          { value: "asc", label: this.messages.sortAsc },
          { value: "desc", label: this.messages.sortDesc }
        ],
        value: this.sort.direction,
        onSelect: (a) => {
          this.sort && (this.sort = { fieldId: this.sort.fieldId, direction: a }, this.callbacks.onSortChange(this.sort));
        }
      });
      o.appendChild(s);
    }
    return t.appendChild(o), t;
  }
}
const Qo = [
  "table",
  "kanban",
  "gallery",
  "list",
  "calendar",
  "gantt",
  "text"
], Tn = {
  /** undo-2。 */
  undo: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>',
  /** redo-2。 */
  redo: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13"/></svg>',
  /** import:箭头入托盘。 */
  import: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
  /** export:箭头出托盘。 */
  export: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
  /** settings 齿轮。 */
  gear: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>'
}, Tt = {
  /** table:网格表格。 */
  table: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>',
  /** kanban:三列看板。 */
  kanban: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 5v11"/><path d="M12 5v6"/><path d="M18 5v14"/></svg>',
  /** gallery:图片画框。 */
  gallery: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
  /** list:三行列表。 */
  list: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/></svg>',
  /** calendar:日历页。 */
  calendar: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></svg>',
  /** gantt:横条进度。 */
  gantt: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h10"/><path d="M8 12h12"/><path d="M6 18h8"/></svg>',
  /** text:大括号代码。 */
  text: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 6-6 6 6 6"/><path d="m16 6 6 6-6 6"/></svg>'
}, Lm = [
  { kind: "table", messageKey: "viewNameTable", icon: Tt.table },
  { kind: "kanban", messageKey: "viewNameKanban", icon: Tt.kanban },
  { kind: "gallery", messageKey: "viewNameGallery", icon: Tt.gallery },
  { kind: "list", messageKey: "viewNameList", icon: Tt.list },
  { kind: "calendar", messageKey: "viewNameCalendar", icon: Tt.calendar },
  { kind: "gantt", messageKey: "viewNameGantt", icon: Tt.gantt },
  { kind: "text", messageKey: "viewNameText", icon: Tt.text }
];
function Am(e) {
  const {
    root: t,
    doc: n,
    onChange: o,
    onChangeViewKind: r,
    readOnly: i = !1,
    locale: s = "zh-CN",
    messages: a
  } = e, l = Qo.includes(
    e.viewKind
  ) ? e.viewKind : "table", c = {
    ...Bh[s],
    ...a
  }, d = document.createElement("div");
  d.className = "zt-jsonview-wrapper", d.dataset.readOnly = i ? "true" : "false", t.appendChild(d);
  const u = Pt(n);
  let h = u.ok ? u.doc : null;
  if (!u.ok) {
    const W = document.createElement("div");
    W.className = "zt-jsonview-invalid", W.textContent = c.invalidData, d.appendChild(W);
  }
  const p = {
    viewKind: l,
    filter: [],
    sort: null,
    kanbanGroupFieldId: null,
    calendarDateFieldId: null,
    calendarMonth: null,
    ganttStartFieldId: null,
    ganttEndFieldId: null,
    galleryImageFieldId: null,
    galleryTitleFieldId: null,
    listTitleFieldId: null
  }, g = new Kh(
    u.ok ? je(u.doc) : n
  ), y = (W) => {
    h && (o == null || o(je(h), W));
  }, f = (W, U) => {
    h && (g.push(U, je(h), je(W)), h = W, y("edit"), fe(), z());
  }, w = document.createElement("div");
  w.className = "zt-jsonview-header", d.appendChild(w);
  const b = document.createElement("div");
  b.className = "zt-jsonview-context-row", d.appendChild(b);
  const k = document.createElement("div");
  k.className = "zt-jsonview-view-host", d.appendChild(k);
  const v = document.createElement("input");
  v.type = "text", v.className = "zt-jsonview-name", v.placeholder = c.namePlaceholder, v.disabled = i, v.addEventListener("change", () => {
    if (!h || i)
      return;
    const W = { ...h, name: v.value.trim() };
    f(W, "name");
  }), w.appendChild(v);
  const E = document.createElement("div");
  E.className = "zt-jsonview-header-actions", w.appendChild(E);
  const M = document.createElement("button");
  M.type = "button", M.className = "zt-jsonview-tool-btn", M.innerHTML = Tn.undo, M.title = c.undoButton, M.setAttribute("aria-label", c.undoButton), M.disabled = !0, M.addEventListener("click", () => {
    Ce.undo();
  }), E.appendChild(M);
  const x = document.createElement("button");
  x.type = "button", x.className = "zt-jsonview-tool-btn", x.innerHTML = Tn.redo, x.title = c.redoButton, x.setAttribute("aria-label", c.redoButton), x.disabled = !0, x.addEventListener("click", () => {
    Ce.redo();
  }), E.appendChild(x);
  const T = new Wn({
    options: Lm.map((W) => ({
      value: W.kind,
      label: c[W.messageKey],
      icon: W.icon
    })),
    value: p.viewKind,
    className: "zt-jsonview-view-select",
    ariaLabel: c.viewSelectLabel,
    callbacks: {
      onSelect: (W) => {
        !Qo.includes(W) || W === p.viewKind || (p.viewKind = W, re(), te(), r == null || r(p.viewKind));
      }
    }
  });
  E.appendChild(T.dom);
  const L = document.createElement("input");
  if (L.type = "file", L.accept = ".csv,text/csv", L.style.display = "none", d.appendChild(L), !i) {
    const W = document.createElement("button");
    W.type = "button", W.className = "zt-jsonview-tool-btn", W.innerHTML = Tn.import, W.title = c.csvImport, W.setAttribute("aria-label", c.csvImport), W.addEventListener("click", () => {
      L.click();
    }), E.appendChild(W);
    const U = document.createElement("button");
    U.type = "button", U.className = "zt-jsonview-tool-btn", U.innerHTML = Tn.export, U.title = c.csvExport, U.setAttribute("aria-label", c.csvExport), U.addEventListener("click", () => {
      D();
    }), E.appendChild(U);
  }
  const S = document.createElement("button");
  S.type = "button", S.className = "zt-jsonview-tool-btn", S.innerHTML = Tn.gear, S.title = c.queryButton, S.setAttribute("aria-label", c.queryButton), E.appendChild(S);
  let I = null, O = !1;
  const J = document.createElement("div");
  J.className = "zt-jsonview-query-popover", J.style.display = "none", d.appendChild(J), S.addEventListener("click", (W) => {
    W.stopPropagation(), K();
  }), document.addEventListener("pointerdown", V);
  function V(W) {
    if (!O)
      return;
    const U = W.target;
    U instanceof Node && (J.contains(U) || S.contains(U)) || K(!1);
  }
  function K(W) {
    const U = W ?? !O;
    U !== O && (O = U, J.style.display = U ? "" : "none", S.classList.toggle("zt-jsonview-tool-btn-active", U), U ? (I = new Sm(
      h ?? { version: 1, name: "", fields: [], records: [] },
      c,
      p.filter,
      p.sort,
      {
        onFilterChange: (X) => {
          p.filter = X, H();
        },
        onSortChange: (X) => {
          p.sort = X, H();
        }
      }
    ), J.textContent = "", J.appendChild(I.dom)) : (J.textContent = "", I = null));
  }
  function z() {
    I && h && I.update(h, p.filter, p.sort);
  }
  function H() {
    const W = B;
    W && (W instanceof Yo ? W.setQuery({ filter: p.filter, sort: p.sort }) : te());
  }
  L.addEventListener("change", () => {
    var U;
    const W = (U = L.files) == null ? void 0 : U[0];
    L.value = "", !(!W || !h) && W.text().then((X) => {
      if (!ju(X)) {
        N(c.invalidCsv);
        return;
      }
      const se = Vh(h, X);
      if (se.appendedRecordIds.length === 0 && se.appendedFieldIds.length === 0) {
        N(c.noImportableRecords);
        return;
      }
      h = se.doc, y("edit"), fe(), G();
    }).catch(() => {
      N(c.csvReadFailed);
    });
  });
  function D() {
    if (!h)
      return;
    const W = h.fields.find((le) => le.type === "text") ?? h.fields.find((le) => ["url", "number", "date"].includes(le.type)), U = h.fields.find(
      (le) => le !== W && ["text", "url", "number", "date"].includes(le.type)
    );
    if (!W || !U) {
      N(c.csvExportNoField);
      return;
    }
    const X = qh(h, W.id, U.id);
    if (!X) {
      N(c.csvExportNoField);
      return;
    }
    const se = new Blob([`\uFEFF${X}`], { type: "text/csv;charset=utf-8" }), ae = URL.createObjectURL(se), ne = document.createElement("a");
    ne.href = ae, ne.download = `${h.name || "database"}.csv`, ne.click(), setTimeout(() => {
      URL.revokeObjectURL(ae);
    }, 1e3);
  }
  function N(W) {
    const U = document.createElement("div");
    U.className = "zt-jsonview-toast", U.setAttribute("role", "status"), U.textContent = W, d.appendChild(U), setTimeout(() => {
      U.remove();
    }, 2500);
  }
  function ee() {
    T.setValue(p.viewKind);
  }
  function re() {
    if (b.textContent = "", !h)
      return;
    const W = (U, X, se, ae) => {
      var Te;
      if (X.length === 0)
        return;
      const ne = document.createElement("label");
      ne.className = "zt-jsonview-context-item";
      const le = document.createElement("span");
      le.textContent = U, ne.appendChild(le);
      const me = X.some((j) => j.id === se) ? se : ((Te = X[0]) == null ? void 0 : Te.id) ?? "", Pe = new Wn({
        options: X.map((j) => ({ value: j.id, label: j.name || j.id })),
        value: me,
        className: "zt-jsonview-context-select",
        callbacks: {
          onSelect: (j) => {
            ae(j), te();
          }
        }
      });
      ne.appendChild(Pe.dom), b.appendChild(ne);
    };
    if (p.viewKind === "calendar" && W(
      c.calendarDateLabel,
      h.fields.filter((U) => U.type === "date"),
      p.calendarDateFieldId,
      (U) => {
        p.calendarDateFieldId = U;
      }
    ), p.viewKind === "gantt") {
      const U = h.fields.filter((X) => X.type === "date");
      W(
        c.ganttStartLabel,
        U,
        p.ganttStartFieldId,
        (X) => {
          p.ganttStartFieldId = X;
        }
      ), U.length > 1 && W(
        c.ganttEndLabel,
        U,
        p.ganttEndFieldId,
        (X) => {
          p.ganttEndFieldId = X;
        }
      );
    }
  }
  let B = null;
  function te() {
    var U;
    if ((U = B == null ? void 0 : B.destroy) == null || U.call(B), k.textContent = "", !h) {
      B = null;
      return;
    }
    const W = { filter: p.filter, sort: p.sort };
    switch (p.viewKind) {
      case "table":
        B = new Yo(
          h,
          i,
          c,
          {
            onDocChange: f,
            formatNewFieldName: (X) => c.newFieldName.replace("{0}", String(X))
          },
          W
        );
        break;
      case "kanban":
        B = new ws(
          h,
          i,
          c,
          p.kanbanGroupFieldId,
          W,
          {
            onDocChange: f
          }
        );
        break;
      case "gallery":
        B = new gm(
          h,
          i,
          c,
          p.galleryImageFieldId,
          p.galleryTitleFieldId,
          W,
          {
            onDocChange: f
          }
        );
        break;
      case "list":
        B = new ym(
          h,
          i,
          c,
          p.listTitleFieldId,
          W,
          {
            onDocChange: f
          }
        );
        break;
      case "calendar":
        B = new Cs(
          h,
          i,
          c,
          p.calendarDateFieldId,
          p.calendarMonth,
          W,
          {
            onDocChange: f,
            onMonthChange: (X) => {
              p.calendarMonth = X;
            }
          }
        );
        break;
      case "gantt":
        B = new zs(
          h,
          i,
          c,
          p.ganttStartFieldId,
          p.ganttEndFieldId,
          W,
          {
            onDocChange: f
          }
        );
        break;
      case "text":
        B = new Tm(h, i, c, W, {
          onDocChange: f
        });
        break;
    }
    if (B && k.appendChild(B.dom), B instanceof ws && (p.kanbanGroupFieldId = B.groupFieldId ?? p.kanbanGroupFieldId), B instanceof Cs && (p.calendarDateFieldId = B.getDateFieldId() ?? p.calendarDateFieldId), B instanceof zs) {
      const X = B.getDateFieldIds();
      p.ganttStartFieldId = X.startFieldId ?? p.ganttStartFieldId, p.ganttEndFieldId = X.endFieldId ?? p.ganttEndFieldId;
    }
  }
  function G() {
    h && (v.value = h.name), ee(), re(), te(), z(), fe();
  }
  function fe() {
    M.disabled = !g.canUndo(), x.disabled = !g.canRedo();
  }
  d.addEventListener("paste", (W) => {
    B instanceof Yo && B.handlePaste(W);
  });
  const Ce = {
    setDoc: (W) => {
      const U = Pt(W);
      U.ok && (h = U.doc, g.reset(je(h)), G());
    },
    getDoc: () => h ? je(h) : n,
    setViewKind: (W) => {
      !Qo.includes(W) || W === p.viewKind || (p.viewKind = W, ee(), re(), te());
    },
    getViewKind: () => p.viewKind,
    undo: () => {
      if (!h)
        return;
      const W = g.undo();
      if (W === null)
        return;
      const U = Pt(W);
      if (!U.ok) {
        g.endReplay();
        return;
      }
      h = U.doc, y("undo"), g.endReplay(), G();
    },
    redo: () => {
      if (!h)
        return;
      const W = g.redo();
      if (W === null)
        return;
      const U = Pt(W);
      if (!U.ok) {
        g.endReplay();
        return;
      }
      h = U.doc, y("redo"), g.endReplay(), G();
    },
    canUndo: () => g.canUndo(),
    canRedo: () => g.canRedo(),
    destroy: () => {
      var W;
      document.removeEventListener("pointerdown", V), (W = B == null ? void 0 : B.destroy) == null || W.call(B), T.destroy(), g.destroy(), d.remove(), h = null, B = null;
    }
  };
  return h && G(), Ce;
}
const Cr = "zh-CN", Ms = {
  "zh-CN": Fu,
  "en-US": Hu
}, Im = (e = Cr) => Ms[e] ?? Ms[Cr], Qe = (e = Cr, t, n) => {
  const o = {
    ...Im(e),
    ...t
  };
  return n !== void 0 && (o.placeholder = n), o;
}, Ts = 0.05, xs = 16, Ss = 1.25, Ls = 48, Rm = 24e6, As = 8192, Nm = 20, Is = 8, Pm = 6, Er = [2, 4, 7], qr = ["#f43f5e", "#f59e0b", "#22c55e", "#3b82f6", "#ffffff", "#111827"], zr = qr[0], en = 16, Rs = 12, Dm = 3, Bm = 64, Ne = (e, t = 16) => `<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`, Ns = Ne('<path d="M18 6 6 18M6 6l12 12"/>'), _m = Ne('<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/>'), Om = Ne('<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/>'), Hm = Ne('<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>'), Fm = Ne('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'), $m = Ne('<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>'), jm = Ne('<path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="m7 15-1.76-1.76a2 2 0 0 0-2.83 2.82l3.6 3.6C7.5 21.14 9.2 22 12 22h2a8 8 0 0 0 8-8V7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v4"/>'), Km = Ne('<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>'), Wm = Ne('<rect width="18" height="18" x="3" y="3" rx="2"/>'), Um = Ne('<circle cx="12" cy="12" r="10"/>'), Vm = Ne('<line x1="5" y1="19" x2="19" y2="5"/>'), qm = Ne('<line x1="6" y1="18" x2="18" y2="6"/><polyline points="9 6 18 6 18 15"/>'), Gm = Ne('<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>'), Xm = Ne('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18M12 3v18"/>'), Ym = Ne('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>'), Zm = Ne('<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>'), Jm = Ne('<path d="M20 6 9 17l-5-5"/>'), Qm = (e) => {
  var o, r;
  const t = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(e.trim());
  if (!t)
    return { red: 244, green: 63, blue: 94 };
  const n = ((o = t[1]) == null ? void 0 : o.length) === 3 ? (r = t[1]) == null ? void 0 : r.split("").map((i) => i + i).join("") : t[1];
  return {
    red: Number.parseInt(n.slice(0, 2), 16),
    green: Number.parseInt(n.slice(2, 4), 16),
    blue: Number.parseInt(n.slice(4, 6), 16)
  };
}, ep = (e, t) => {
  const { red: n, green: o, blue: r } = Qm(e);
  return `rgba(${n}, ${o}, ${r}, ${t})`;
}, tp = (e) => {
  var n;
  const t = document.createElement("canvas");
  return t.width = e.width, t.height = e.height, (n = t.getContext("2d")) == null || n.drawImage(e, 0, 0), t;
}, np = (e) => {
  const t = document.createElement("div");
  t.className = "zt-md-ipe-overlay", t.dataset.editable = e.editable ? "true" : "false", t.dataset.state = "loading", t.dataset.crop = "false";
  const n = document.createElement("div");
  n.className = "zt-md-ipe-header";
  const o = document.createElement("span");
  o.className = "zt-md-ipe-title", o.textContent = e.messages.imagePreviewDialogTitle;
  const r = document.createElement("span");
  r.className = "zt-md-ipe-hint";
  const i = document.createElement("button");
  i.type = "button", i.className = "zt-md-ipe-button zt-md-ipe-close", i.setAttribute("aria-label", e.messages.imagePreviewCloseAriaLabel), i.title = e.messages.imagePreviewCloseAriaLabel, i.innerHTML = Ns, n.append(o, r, i);
  const s = document.createElement("div");
  s.className = "zt-md-ipe-stage";
  const a = document.createElement("canvas");
  a.className = "zt-md-ipe-canvas";
  const l = document.createElement("div");
  l.className = "zt-md-ipe-loading", l.innerHTML = '<span class="zt-md-ipe-spinner" aria-hidden="true"></span>';
  const c = document.createElement("div");
  c.className = "zt-md-ipe-load-error", c.textContent = e.messages.imagePreviewLoadFailed, s.append(a, l, c);
  const d = document.createElement("div");
  d.className = "zt-md-ipe-toolbar";
  const u = (ae, ne, le = "") => {
    const me = document.createElement("button");
    return me.type = "button", me.className = `zt-md-ipe-button${le ? ` ${le}` : ""}`, me.setAttribute("aria-label", ne), me.title = ne, me.innerHTML = ae, me;
  }, h = (...ae) => {
    const ne = document.createElement("div");
    return ne.className = "zt-md-ipe-group", ne.append(...ae), ne;
  }, p = () => {
    const ae = document.createElement("span");
    return ae.className = "zt-md-ipe-separator", ae.setAttribute("aria-hidden", "true"), ae;
  }, g = e.messages, y = u(Om, g.imagePreviewZoomOutAriaLabel), f = document.createElement("button");
  f.type = "button", f.className = "zt-md-ipe-zoom-label", f.setAttribute("aria-label", g.imagePreviewZoomActualAriaLabel), f.title = g.imagePreviewZoomActualAriaLabel, f.textContent = "100%";
  const w = u(_m, g.imagePreviewZoomInAriaLabel), b = u(Hm, g.imagePreviewZoomFitAriaLabel), k = u(Fm, g.imagePreviewRotateLeftAriaLabel), v = u($m, g.imagePreviewRotateRightAriaLabel), E = u(jm, g.imagePreviewPanAriaLabel), M = h(
    y,
    f,
    w,
    b,
    p(),
    k,
    v,
    p(),
    E
  ), x = u(
    Jm,
    g.imagePreviewCropConfirmAriaLabel,
    "zt-md-ipe-crop-only"
  ), T = u(
    Ns,
    g.imagePreviewCropCancelAriaLabel,
    "zt-md-ipe-crop-only"
  ), L = h(x, T);
  L.classList.add("zt-md-ipe-edit-only");
  const S = u(Km, g.imagePreviewCropAriaLabel), I = u(Wm, g.imagePreviewRectAriaLabel), O = u(Um, g.imagePreviewCircleAriaLabel), J = u(Vm, g.imagePreviewLineAriaLabel), V = u(qm, g.imagePreviewArrowAriaLabel), K = u(Gm, g.imagePreviewBrushAriaLabel), z = u(Xm, g.imagePreviewMosaicAriaLabel), H = h(
    S,
    I,
    O,
    J,
    V,
    K,
    z
  );
  H.classList.add("zt-md-ipe-edit-only");
  const D = document.createElement("div");
  D.className = "zt-md-ipe-group zt-md-ipe-color-group", D.setAttribute("aria-label", g.imagePreviewColorLabel);
  const N = qr.map((ae) => {
    const ne = document.createElement("button");
    return ne.type = "button", ne.className = "zt-md-ipe-swatch", ne.dataset.color = ae, ne.style.backgroundColor = ae, ne.setAttribute("aria-label", `${g.imagePreviewColorLabel} ${ae}`), ne.title = ae, ne;
  }), ee = document.createElement("label");
  ee.className = "zt-md-ipe-swatch zt-md-ipe-swatch-custom", ee.title = g.imagePreviewColorCustomLabel, ee.setAttribute("aria-label", g.imagePreviewColorCustomLabel);
  const re = document.createElement("input");
  re.type = "color", re.value = zr, re.setAttribute("aria-label", g.imagePreviewColorCustomLabel), ee.appendChild(re), D.append(...N, ee);
  const B = document.createElement("div");
  B.className = "zt-md-ipe-group zt-md-ipe-stroke-group";
  const te = Er.map((ae, ne) => {
    const le = [
      g.imagePreviewStrokeThinAriaLabel,
      g.imagePreviewStrokeMediumAriaLabel,
      g.imagePreviewStrokeThickAriaLabel
    ], me = document.createElement("button");
    return me.type = "button", me.className = "zt-md-ipe-button zt-md-ipe-stroke-button", me.dataset.widthIndex = String(ne), me.setAttribute("aria-label", le[ne] ?? le[1]), me.title = le[ne] ?? le[1], me.innerHTML = `<span class="zt-md-ipe-stroke-dot" style="width:${2 + ne * 3}px;height:${2 + ne * 3}px"></span>`, me;
  });
  B.append(...te);
  const G = h();
  G.append(D, p(), B), G.classList.add("zt-md-ipe-edit-only");
  const fe = u(Ym, g.imagePreviewUndoAriaLabel), Ce = u(Zm, g.imagePreviewResetAriaLabel), W = h(fe, Ce);
  W.classList.add("zt-md-ipe-edit-only");
  const U = document.createElement("button");
  U.type = "button", U.className = "zt-md-ipe-text-button", U.textContent = g.imagePreviewCancelLabel;
  const X = document.createElement("button");
  X.type = "button", X.className = "zt-md-ipe-text-button zt-md-ipe-confirm zt-md-ipe-edit-only", X.textContent = g.imagePreviewConfirmLabel;
  const se = h(U, X);
  return d.append(
    M,
    L,
    p(),
    H,
    G,
    W,
    p(),
    se
  ), t.append(n, s, d), e.container.appendChild(t), {
    overlay: t,
    closeButton: i,
    hintLabel: r,
    stage: s,
    canvas: a,
    zoomOutButton: y,
    zoomLabelButton: f,
    zoomInButton: w,
    fitButton: b,
    rotateLeftButton: k,
    rotateRightButton: v,
    panToolButton: E,
    cropConfirmButton: x,
    cropCancelButton: T,
    cropToolButton: S,
    rectToolButton: I,
    circleToolButton: O,
    lineToolButton: J,
    arrowToolButton: V,
    brushToolButton: K,
    mosaicToolButton: z,
    colorSwatches: N,
    customColorInput: re,
    strokeButtons: te,
    undoButton: fe,
    resetButton: Ce,
    cancelButton: U,
    confirmButton: X
  };
}, op = (e) => {
  const {
    overlay: t,
    closeButton: n,
    hintLabel: o,
    stage: r,
    canvas: i,
    zoomOutButton: s,
    zoomLabelButton: a,
    zoomInButton: l,
    fitButton: c,
    rotateLeftButton: d,
    rotateRightButton: u,
    panToolButton: h,
    cropConfirmButton: p,
    cropCancelButton: g,
    cropToolButton: y,
    rectToolButton: f,
    circleToolButton: w,
    lineToolButton: b,
    arrowToolButton: k,
    brushToolButton: v,
    mosaicToolButton: E,
    colorSwatches: M,
    customColorInput: x,
    strokeButtons: T,
    undoButton: L,
    resetButton: S,
    cancelButton: I,
    confirmButton: O
  } = np(e), J = e.messages, V = i.getContext("2d");
  let K = null, z = !1, H = null;
  const D = [], N = { scale: 1, tx: 0, ty: 0 };
  let ee = "pan", re = zr, B = 1, te = !1, G = null, fe = null, Ce = !0, W = null, U = null, X = null, se = null, ae = null, ne = null, le = "", me = !1;
  const Pe = (C, _, q) => {
    if (!H)
      return;
    const Q = Math.min(xs, Math.max(Ts, N.scale * C)), be = Q / N.scale;
    N.tx = _ - (_ - N.tx) * be, N.ty = q - (q - N.ty) * be, N.scale = Q, _e(), ce();
  }, Te = () => {
    if (!H)
      return;
    const C = r.clientWidth, _ = r.clientHeight;
    if (C <= 0 || _ <= 0)
      return;
    const q = Math.min(
      (C - Ls) / H.width,
      (_ - Ls) / H.height,
      1
    );
    N.scale = Math.max(0.02, q), N.tx = (C - H.width * N.scale) / 2, N.ty = (_ - H.height * N.scale) / 2, _e(), ce();
  }, j = () => {
    if (!H)
      return;
    const C = r.clientWidth, _ = r.clientHeight, q = C / 2, Q = _ / 2;
    Pe(1 / N.scale, q, Q), N.scale = 1, N.tx = (C - H.width) / 2, N.ty = (_ - H.height) / 2, ce();
  }, F = () => {
    H && (D.push(tp(H)), D.length > Nm && D.shift(), _e());
  }, A = () => {
    const C = D.pop();
    C && (H = C, Ce = !0, te && ve(), _e(), ce());
  }, P = () => {
    K && (F(), H = $(K), Ce = !0, te && ve(), Te());
  }, $ = (C) => {
    var Q;
    const _ = Math.min(
      1,
      Rm / Math.max(1, C.naturalWidth * C.naturalHeight),
      As / Math.max(1, C.naturalWidth),
      As / Math.max(1, C.naturalHeight)
    ), q = document.createElement("canvas");
    return q.width = Math.max(1, Math.round(C.naturalWidth * _)), q.height = Math.max(1, Math.round(C.naturalHeight * _)), (Q = q.getContext("2d")) == null || Q.drawImage(C, 0, 0, q.width, q.height), q;
  }, Y = () => {
    if (!H)
      return null;
    if (!fe || Ce) {
      const C = document.createElement("canvas");
      C.width = Math.max(1, Math.ceil(H.width / Is)), C.height = Math.max(1, Math.ceil(H.height / Is));
      const _ = C.getContext("2d");
      _ == null || _.drawImage(H, 0, 0, C.width, C.height), fe = document.createElement("canvas"), fe.width = H.width, fe.height = H.height;
      const q = fe.getContext("2d");
      q && (q.imageSmoothingEnabled = !1, q.drawImage(C, 0, 0, fe.width, fe.height)), Ce = !1;
    }
    return fe;
  }, Z = (C) => {
    if (!H)
      return;
    F();
    const _ = document.createElement("canvas");
    _.width = H.height, _.height = H.width;
    const q = _.getContext("2d");
    q && (q.translate(_.width / 2, _.height / 2), q.rotate(C * Math.PI / 2), q.drawImage(H, -H.width / 2, -H.height / 2)), H = _, Ce = !0, Te();
  }, ge = (C, _) => {
    const q = _.points[0], Q = _.points[_.points.length - 1];
    if (!q || !Q)
      return;
    if (C.save(), C.strokeStyle = _.color, C.fillStyle = ep(_.color, 0.14), C.lineWidth = _.width, C.lineCap = "round", C.lineJoin = "round", _.tool === "brush") {
      if (C.beginPath(), _.points.length === 1)
        C.arc(q.x, q.y, _.width / 2, 0, Math.PI * 2), C.fillStyle = _.color, C.fill();
      else {
        C.moveTo(q.x, q.y);
        for (const Ve of _.points.slice(1))
          C.lineTo(Ve.x, Ve.y);
        C.stroke();
      }
      C.restore();
      return;
    }
    const be = Math.min(q.x, Q.x), Me = Math.min(q.y, Q.y), Oe = Math.abs(Q.x - q.x), De = Math.abs(Q.y - q.y);
    if (_.tool === "rect")
      C.beginPath(), C.rect(be, Me, Oe, De), C.fill(), C.stroke();
    else if (_.tool === "circle")
      C.beginPath(), C.ellipse(be + Oe / 2, Me + De / 2, Oe / 2, De / 2, 0, 0, Math.PI * 2), C.fill(), C.stroke();
    else if (_.tool === "line")
      C.beginPath(), C.moveTo(q.x, q.y), C.lineTo(Q.x, Q.y), C.stroke();
    else {
      const Ve = Math.atan2(Q.y - q.y, Q.x - q.x), st = _.width * 4.5;
      C.beginPath(), C.moveTo(q.x, q.y), C.lineTo(Q.x, Q.y), C.stroke(), C.beginPath(), C.moveTo(Q.x, Q.y), C.lineTo(Q.x - st * Math.cos(Ve - 0.44), Q.y - st * Math.sin(Ve - 0.44)), C.lineTo(Q.x - st * Math.cos(Ve + 0.44), Q.y - st * Math.sin(Ve + 0.44)), C.closePath(), C.fillStyle = _.color, C.fill();
    }
    C.restore();
  }, we = (C) => {
    if (!H)
      return;
    F();
    const _ = H.getContext("2d");
    _ && ge(_, C), ce();
  }, ze = (C, _, q) => {
    if (!H)
      return;
    const Q = Y(), be = H.getContext("2d");
    if (!Q || !be)
      return;
    const Me = Math.min(C.x, _.x) - q, Oe = Math.min(C.y, _.y) - q, De = Math.ceil(Math.max(C.x, _.x) + q - Me), Ve = Math.ceil(Math.max(C.y, _.y) + q - Oe);
    if (De <= 0 || Ve <= 0)
      return;
    const st = document.createElement("canvas");
    st.width = De, st.height = Ve;
    const Ye = st.getContext("2d");
    Ye && (Ye.drawImage(Q, Me, Oe, De, Ve, 0, 0, De, Ve), Ye.globalCompositeOperation = "destination-in", Ye.lineWidth = q * 2, Ye.lineCap = "round", Ye.strokeStyle = "#000", Ye.beginPath(), Ye.moveTo(C.x - Me, C.y - Oe), Ye.lineTo(_.x - Me, _.y - Oe), Ye.stroke(), Ye.globalCompositeOperation = "source-over", be.drawImage(st, Me, Oe));
  }, ce = () => {
    ae === null && (ae = requestAnimationFrame(() => {
      ne !== null && (window.clearTimeout(ne), ne = null), ae = null, Se();
    }), ne = window.setTimeout(() => {
      ae !== null && (cancelAnimationFrame(ae), ae = null, Se());
    }, Bm));
  }, he = () => {
    const C = window.devicePixelRatio || 1, _ = Math.max(1, Math.round(r.clientWidth * C)), q = Math.max(1, Math.round(r.clientHeight * C));
    (i.width !== _ || i.height !== q) && (i.width = _, i.height = q);
  }, Se = () => {
    if (me)
      return;
    const C = V;
    if (!C)
      return;
    const _ = window.devicePixelRatio || 1, q = r.clientWidth, Q = r.clientHeight;
    C.setTransform(_, 0, 0, _, 0, 0), C.clearRect(0, 0, q, Q), H && (C.save(), C.translate(N.tx, N.ty), C.scale(N.scale, N.scale), C.imageSmoothingEnabled = N.scale < 3, C.drawImage(H, 0, 0), U && ge(C, U), C.restore(), te && G && He(C, q, Q));
    const be = `${Math.round(N.scale * 100)}%`;
    be !== le && (le = be, a.textContent = be);
  }, He = (C, _, q) => {
    if (!G)
      return;
    const Q = G.x * N.scale + N.tx, be = G.y * N.scale + N.ty, Me = G.width * N.scale, Oe = G.height * N.scale;
    C.save(), C.fillStyle = "rgba(0, 0, 0, 0.55)", C.beginPath(), C.rect(0, 0, _, q), C.rect(Q, be, Me, Oe), C.fill("evenodd"), C.strokeStyle = "rgba(255, 255, 255, 0.9)", C.lineWidth = 1, C.strokeRect(Q + 0.5, be + 0.5, Me - 1, Oe - 1), C.strokeStyle = "rgba(255, 255, 255, 0.25)", C.beginPath();
    for (const De of [1 / 3, 2 / 3])
      C.moveTo(Q + Me * De, be), C.lineTo(Q + Me * De, be + Oe), C.moveTo(Q, be + Oe * De), C.lineTo(Q + Me, be + Oe * De);
    C.stroke(), C.fillStyle = "#ffffff", C.strokeStyle = "rgba(0, 0, 0, 0.45)";
    for (const De of Fe())
      C.beginPath(), C.rect(De.x - 4, De.y - 4, 8, 8), C.fill(), C.stroke();
    C.restore();
  }, Fe = () => {
    if (!G)
      return [];
    const C = G.x * N.scale + N.tx, _ = G.y * N.scale + N.ty, q = G.width * N.scale, Q = G.height * N.scale, be = C + q / 2, Me = _ + Q / 2;
    return [
      { id: "nw", x: C, y: _ },
      { id: "n", x: be, y: _ },
      { id: "ne", x: C + q, y: _ },
      { id: "e", x: C + q, y: Me },
      { id: "se", x: C + q, y: _ + Q },
      { id: "s", x: be, y: _ + Q },
      { id: "sw", x: C, y: _ + Q },
      { id: "w", x: C, y: Me }
    ];
  }, Ee = (C) => {
    const _ = i.getBoundingClientRect();
    return {
      x: (C.clientX - _.left - N.tx) / N.scale,
      y: (C.clientY - _.top - N.ty) / N.scale
    };
  }, Ut = (C) => {
    const _ = i.getBoundingClientRect(), q = C.clientX - _.left, Q = C.clientY - _.top;
    for (const be of Fe())
      if (Math.abs(q - be.x) <= Rs && Math.abs(Q - be.y) <= Rs)
        return be.id;
    return null;
  }, Vt = (C) => {
    if (!G)
      return !1;
    const _ = i.getBoundingClientRect(), q = C.clientX - _.left, Q = C.clientY - _.top, be = G.x * N.scale + N.tx, Me = G.y * N.scale + N.ty;
    return q >= be && q <= be + G.width * N.scale && Q >= Me && Q <= Me + G.height * N.scale;
  }, vt = (C, _) => {
    if (!G || !H)
      return;
    let q = G.x, Q = G.y, be = G.x + G.width, Me = G.y + G.height;
    C.includes("w") && (q = Math.min(Math.max(0, _.x), be - en)), C.includes("e") && (be = Math.max(Math.min(H.width, _.x), q + en)), C.includes("n") && (Q = Math.min(Math.max(0, _.y), Me - en)), C.includes("s") && (Me = Math.max(Math.min(H.height, _.y), Q + en)), G = { x: q, y: Q, width: be - q, height: Me - Q };
  }, oe = (C) => {
    if (!H || C.button === 2)
      return;
    C.preventDefault();
    try {
      i.setPointerCapture(C.pointerId);
    } catch {
    }
    if (C.button === 1) {
      Qn(C);
      return;
    }
    if (te) {
      const Q = Ut(C);
      Q ? se = { kind: "resize", handle: Q } : Vt(C) ? se = {
        kind: "move",
        startRect: G ? { ...G } : { x: 0, y: 0, width: 0, height: 0 },
        startClientX: C.clientX,
        startClientY: C.clientY
      } : se = { kind: "new", startPoint: Ee(C) };
      return;
    }
    if (ee === "pan") {
      Qn(C);
      return;
    }
    if (!e.editable)
      return;
    const _ = Ee(C), q = Er[B] ?? Er[1];
    if (ee === "mosaic") {
      F();
      const Q = q * Pm / 2 / N.scale;
      X = { last: _, radius: Q }, ze(_, _, Q), ce();
      return;
    }
    if (ee === "brush") {
      U = {
        tool: "brush",
        points: [_],
        color: re,
        width: q / N.scale
      };
      return;
    }
    U = {
      tool: ee,
      points: [_, _],
      color: re,
      width: q / N.scale
    };
  }, Qn = (C) => {
    W = {
      startClientX: C.clientX,
      startClientY: C.clientY,
      startTx: N.tx,
      startTy: N.ty
    }, i.dataset.panning = "true";
  }, eo = (C) => {
    if (H) {
      if (W) {
        C.preventDefault(), N.tx = W.startTx + (C.clientX - W.startClientX), N.ty = W.startTy + (C.clientY - W.startClientY), ce();
        return;
      }
      if (te) {
        qt(C);
        return;
      }
      if (X != null && X.last) {
        C.preventDefault();
        const _ = Ee(C);
        ze(X.last, _, X.radius), X.last = _, ce();
        return;
      }
      U && (C.preventDefault(), U.tool === "brush" ? U.points.push(Ee(C)) : U.points[U.points.length - 1] = Ee(C), ce());
    }
  }, qt = (C) => {
    if (se) {
      C.preventDefault();
      const q = Ee(C);
      if (se.kind === "move") {
        if (!G || !H)
          return;
        const Q = (C.clientX - se.startClientX) / N.scale, be = (C.clientY - se.startClientY) / N.scale;
        G.x = Math.min(
          Math.max(0, se.startRect.x + Q),
          Math.max(0, H.width - se.startRect.width)
        ), G.y = Math.min(
          Math.max(0, se.startRect.y + be),
          Math.max(0, H.height - se.startRect.height)
        );
      } else se.kind === "resize" ? vt(se.handle, q) : vn(se.startPoint, q);
      ce();
      return;
    }
    const _ = Ut(C);
    _ ? i.style.cursor = Gt[_] : i.style.cursor = "default";
  }, vn = (C, _) => {
    if (!H)
      return;
    const q = Math.max(0, Math.min(C.x, _.x)), Q = Math.max(0, Math.min(C.y, _.y)), be = Math.min(H.width, Math.max(C.x, _.x)), Me = Math.min(H.height, Math.max(C.y, _.y));
    G = { x: q, y: Q, width: be - q, height: Me - Q };
  }, Gt = {
    nw: "nwse-resize",
    se: "nwse-resize",
    ne: "nesw-resize",
    sw: "nesw-resize",
    n: "ns-resize",
    s: "ns-resize",
    e: "ew-resize",
    w: "ew-resize"
  }, to = () => {
    if (W) {
      W = null, delete i.dataset.panning, et();
      return;
    }
    if (se) {
      se = null, et();
      return;
    }
    if (X) {
      X = null;
      return;
    }
    if (U) {
      const C = U;
      U = null;
      const _ = C.points[0], q = C.points[C.points.length - 1];
      if (_ && q) {
        const Q = Math.hypot(q.x - _.x, q.y - _.y) * N.scale;
        (C.tool === "brush" || Q >= Dm) && we(C);
      }
      ce();
    }
  }, Ct = () => {
    W = null, U = null, X = null, se = null, delete i.dataset.panning, et(), ce();
  }, Xt = (C) => {
    if (!H)
      return;
    C.preventDefault();
    const _ = i.getBoundingClientRect(), q = Math.min(2, Math.max(0.5, 1.0015 ** -C.deltaY));
    Pe(q, C.clientX - _.left, C.clientY - _.top);
  }, Cn = (C) => {
    H && (C.preventDefault(), Math.abs(N.scale - 1) < 0.01 ? Te() : j());
  }, et = () => {
    if (te) {
      i.style.cursor = "default";
      return;
    }
    if (ee === "pan") {
      i.style.cursor = "grab";
      return;
    }
    i.style.cursor = "crosshair";
  }, Yt = () => {
    H && (te = !0, G = { x: 0, y: 0, width: H.width, height: H.height }, t.dataset.crop = "true", _e(), et(), ce());
  }, ve = () => {
    te = !1, G = null, se = null, t.dataset.crop = "false", _e(), et(), ce();
  }, $e = () => {
    var _;
    if (!H || !G)
      return;
    if (G.width < en || G.height < en || G.x <= 0 && G.y <= 0 && G.width >= H.width && G.height >= H.height) {
      ve();
      return;
    }
    F();
    const C = document.createElement("canvas");
    C.width = Math.max(1, Math.round(G.width)), C.height = Math.max(1, Math.round(G.height)), (_ = C.getContext("2d")) == null || _.drawImage(
      H,
      Math.round(G.x),
      Math.round(G.y),
      C.width,
      C.height,
      0,
      0,
      C.width,
      C.height
    ), H = C, Ce = !0, ve(), Te();
  }, En = [
    { tool: "pan", button: h },
    { tool: "crop", button: y },
    { tool: "rect", button: f },
    { tool: "circle", button: w },
    { tool: "line", button: b },
    { tool: "arrow", button: k },
    { tool: "brush", button: v },
    { tool: "mosaic", button: E }
  ], _e = () => {
    for (const C of En) {
      const _ = C.tool === "crop" ? te : C.tool === ee && !te;
      C.button.dataset.active = _ ? "true" : "false", C.button.disabled = te && C.tool !== "crop";
    }
    p.disabled = !G, L.disabled = D.length === 0, O.disabled = !H, l.disabled = !H || N.scale >= xs, s.disabled = !H || N.scale <= Ts, c.disabled = !H, a.disabled = !H, d.disabled = !H, u.disabled = !H;
    for (const C of M)
      C.dataset.active = C.dataset.color === re ? "true" : "false";
    for (const C of T)
      C.dataset.active = C.dataset.widthIndex === String(B) ? "true" : "false";
  }, tt = (C) => {
    C !== ee && (ee = C, te && ve(), _e(), et());
  }, no = () => {
    if (!H)
      throw new Error("Nothing to export");
    if (/^data:image\/jpe?g/i.test(e.src)) {
      const C = document.createElement("canvas");
      C.width = H.width, C.height = H.height;
      const _ = C.getContext("2d");
      return _ && (_.fillStyle = "#ffffff", _.fillRect(0, 0, C.width, C.height), _.drawImage(H, 0, 0)), C.toDataURL("image/jpeg", 0.92);
    }
    return H.toDataURL("image/png");
  }, oo = () => {
    if (!H)
      return;
    let C;
    try {
      C = no();
    } catch {
      o.textContent = J.imagePreviewExportFailed;
      return;
    }
    e.onConfirm(C), Et();
  }, Et = () => {
    var C;
    if (!me) {
      me = !0, ae !== null && (cancelAnimationFrame(ae), ae = null), ne !== null && (window.clearTimeout(ne), ne = null), ji.disconnect(), window.removeEventListener("keydown", $i, !0), n.removeEventListener("click", zt), i.removeEventListener("pointerdown", oe), i.removeEventListener("pointermove", eo), i.removeEventListener("pointerup", to), i.removeEventListener("pointercancel", Ct), i.removeEventListener("wheel", Xt), i.removeEventListener("dblclick", Cn), i.removeEventListener("contextmenu", Fi), r.removeEventListener("mousedown", Hi), s.removeEventListener("click", Mn), l.removeEventListener("click", R), a.removeEventListener("click", pe), c.removeEventListener("click", Ue), d.removeEventListener("click", it), u.removeEventListener("click", Mi), h.removeEventListener("click", Ti), y.removeEventListener("click", xi), p.removeEventListener("click", Si), g.removeEventListener("click", Li), f.removeEventListener("click", Ai), w.removeEventListener("click", Ii), b.removeEventListener("click", Ri), k.removeEventListener("click", Ni), v.removeEventListener("click", Pi), E.removeEventListener("click", Di), L.removeEventListener("click", Bi), S.removeEventListener("click", _i), I.removeEventListener("click", zt), O.removeEventListener("click", zn);
      for (const [_, q] of M.entries()) {
        const Q = Xc[_];
        Q && q.removeEventListener("click", Q);
      }
      x.removeEventListener("input", Oi);
      for (const [_, q] of T.entries()) {
        const Q = Yc[_];
        Q && q.removeEventListener("click", Q);
      }
      t.remove(), (C = e.onClose) == null || C.call(e);
    }
  }, zt = () => {
    Et();
  }, zn = () => {
    oo();
  }, Mn = () => {
    Pe(1 / Ss, r.clientWidth / 2, r.clientHeight / 2);
  }, R = () => {
    Pe(Ss, r.clientWidth / 2, r.clientHeight / 2);
  }, pe = () => {
    j();
  }, Ue = () => {
    Te();
  }, it = () => {
    e.editable && Z(-1);
  }, Mi = () => {
    e.editable && Z(1);
  }, Ti = () => {
    tt("pan");
  }, xi = () => {
    te ? ve() : Yt();
  }, Si = () => {
    $e();
  }, Li = () => {
    ve();
  }, Ai = () => {
    tt("rect");
  }, Ii = () => {
    tt("circle");
  }, Ri = () => {
    tt("line");
  }, Ni = () => {
    tt("arrow");
  }, Pi = () => {
    tt("brush");
  }, Di = () => {
    tt("mosaic");
  }, Bi = () => {
    e.editable && A();
  }, _i = () => {
    e.editable && P();
  }, Xc = M.map((C, _) => {
    const q = () => {
      re = qr[_] ?? zr, _e();
    };
    return C.addEventListener("click", q), q;
  }), Oi = () => {
    re = x.value, _e();
  };
  x.addEventListener("input", Oi);
  const Yc = T.map((C, _) => {
    const q = () => {
      B = _, _e();
    };
    return C.addEventListener("click", q), q;
  }), Hi = (C) => {
    C.target === r && C.preventDefault();
  }, Fi = (C) => {
    C.preventDefault();
  }, $i = (C) => {
    if (C.key === "Escape") {
      C.preventDefault(), C.stopPropagation(), te ? ve() : Et();
      return;
    }
    (C.metaKey || C.ctrlKey) && C.key.toLowerCase() === "z" && e.editable && !te && (C.preventDefault(), C.stopPropagation(), A());
  }, ji = new ResizeObserver(() => {
    he(), H ? Te() : ce();
  });
  ji.observe(r), n.addEventListener("click", zt), i.addEventListener("pointerdown", oe), i.addEventListener("pointermove", eo), i.addEventListener("pointerup", to), i.addEventListener("pointercancel", Ct), i.addEventListener("wheel", Xt, { passive: !1 }), i.addEventListener("dblclick", Cn), i.addEventListener("contextmenu", Fi), r.addEventListener("mousedown", Hi), s.addEventListener("click", Mn), l.addEventListener("click", R), a.addEventListener("click", pe), c.addEventListener("click", Ue), d.addEventListener("click", it), u.addEventListener("click", Mi), h.addEventListener("click", Ti), y.addEventListener("click", xi), p.addEventListener("click", Si), g.addEventListener("click", Li), f.addEventListener("click", Ai), w.addEventListener("click", Ii), b.addEventListener("click", Ri), k.addEventListener("click", Ni), v.addEventListener("click", Pi), E.addEventListener("click", Di), L.addEventListener("click", Bi), S.addEventListener("click", _i), I.addEventListener("click", zt), O.addEventListener("click", zn);
  const Ki = () => {
    if (me || !K || !K.naturalWidth || !K.naturalHeight) {
      t.dataset.state = "error";
      return;
    }
    H = $(K), he(), Te(), t.dataset.state = "ready", z && (t.dataset.editable = "false", o.textContent = J.imagePreviewEditDisabledHint), _e();
  }, Zc = () => {
    if (!me) {
      if (K && !z && /^https?:/i.test(e.src)) {
        z = !0;
        const C = new Image();
        C.onload = Ki, C.onerror = () => {
          t.dataset.state = "error";
        }, K = C, C.src = e.src;
        return;
      }
      t.dataset.state = "error";
    }
  }, Jc = () => {
    if (!e.src) {
      t.dataset.state = "error";
      return;
    }
    const C = new Image();
    /^https?:/i.test(e.src) && (C.crossOrigin = "anonymous"), C.onload = Ki, C.onerror = Zc, K = C, C.src = e.src;
  };
  return { open: () => {
    t.dataset.open = "true", window.addEventListener("keydown", $i, !0), Jc(), _e(), et(), e.editable || (t.dataset.editable = "false"), requestAnimationFrame(() => {
      n.focus();
    });
  }, close: Et };
}, rp = [
  "--zt-font",
  "--zt-bg",
  "--zt-surface",
  "--zt-fg",
  "--zt-muted",
  "--zt-border",
  "--zt-primary",
  "--zt-primary-foreground",
  "--zt-destructive",
  "--zt-radius",
  "--zt-radius-lg"
], wl = (e, t) => {
  if (!t)
    return;
  const n = window.getComputedStyle(t);
  rp.forEach((o) => {
    const r = n.getPropertyValue(o);
    r && e.style.setProperty(o, r.trim());
  });
}, ip = (e, t) => {
  const n = e.closest(".zt-md"), o = n != null && n.classList.contains("zt-md-dark") ? "zt-md-dark" : "zt-md-light", r = e.getRootNode(), i = r instanceof ShadowRoot ? r : document.body, s = document.createElement("div");
  return s.className = `zt-md zt-md-dialog-host ${t} ${o}`, wl(s, n), s.style.zIndex = "2147483647", i.appendChild(s), s;
}, vl = (e, t) => {
  if (document.getElementById(e))
    return;
  const n = document.createElement("style");
  n.id = e, n.textContent = t, document.head.appendChild(n);
}, Cl = (e, t) => {
  const n = e.closest(".zt-md"), o = n != null && n.classList.contains("zt-md-dark") ? "zt-md-dark" : "zt-md-light", r = document.createElement("div");
  return r.className = `zt-md zt-md-dialog-host ${t} ${o}`, wl(r, n), r.style.zIndex = "2147483647", document.body.appendChild(r), r;
}, sp = ".zt-md .zt-md-ipe-overlay{position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483000;display:none;flex-direction:column;background:#0a0c12d1;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);pointer-events:auto}.zt-md .zt-md-ipe-overlay[data-open=true]{display:flex}.zt-md .zt-md-ipe-header{display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;color:#ffffffeb}.zt-md .zt-md-ipe-title{font-size:14px;font-weight:600;letter-spacing:.02em}.zt-md .zt-md-ipe-hint{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff9;font-size:12px}.zt-md .zt-md-ipe-stage{position:relative;flex:1;min-height:0;overflow:hidden}.zt-md .zt-md-ipe-canvas{position:absolute;top:0;right:0;bottom:0;left:0;width:100%;height:100%;display:block;touch-action:none;-webkit-user-select:none;user-select:none}.zt-md .zt-md-ipe-canvas[data-panning=true]{cursor:grabbing!important}.zt-md .zt-md-ipe-loading,.zt-md .zt-md-ipe-load-error{position:absolute;top:0;right:0;bottom:0;left:0;display:none;align-items:center;justify-content:center;color:#ffffffa6;font-size:13px;pointer-events:none}.zt-md .zt-md-ipe-overlay[data-state=loading] .zt-md-ipe-loading,.zt-md .zt-md-ipe-overlay[data-state=error] .zt-md-ipe-load-error{display:flex}.zt-md .zt-md-ipe-spinner{width:1.75rem;height:1.75rem;border:2px solid rgba(255,255,255,.25);border-top-color:#ffffffd9;border-radius:50%;animation:zt-md-ipe-spinner-rotate .9s linear infinite}@keyframes zt-md-ipe-spinner-rotate{to{transform:rotate(360deg)}}.zt-md .zt-md-ipe-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.25rem;padding:.5rem .875rem;background:#0f121af0;border-top:1px solid rgba(255,255,255,.08)}.zt-md .zt-md-ipe-group{display:inline-flex;align-items:center;gap:.25rem}.zt-md .zt-md-ipe-separator{width:1px;height:1.25rem;margin:0 .375rem;background:#ffffff24}.zt-md .zt-md-ipe-button{display:inline-flex;width:2rem;height:2rem;align-items:center;justify-content:center;border:1px solid transparent;border-radius:.5rem;background:transparent;color:#ffffffd9;cursor:pointer;transition:background-color .12s ease,color .12s ease}.zt-md .zt-md-ipe-button:hover:not(:disabled){background:#ffffff1a;color:#fff}.zt-md .zt-md-ipe-button:disabled{opacity:.35;cursor:not-allowed}.zt-md .zt-md-ipe-button[data-active=true]{background:var(--zt-primary, #4b7bec);color:var(--zt-primary-foreground, #ffffff)}.zt-md .zt-md-ipe-button svg{width:1rem;height:1rem}.zt-md .zt-md-ipe-zoom-label{min-width:3.25rem;height:1.75rem;border:none;border-radius:.375rem;background:#ffffff14;color:#ffffffd9;font-size:12px;text-align:center;cursor:pointer}.zt-md .zt-md-ipe-zoom-label:hover:not(:disabled){background:#ffffff29}.zt-md .zt-md-ipe-zoom-label:disabled{opacity:.35;cursor:not-allowed}.zt-md .zt-md-ipe-swatch{position:relative;display:inline-flex;width:1.25rem;height:1.25rem;padding:0;align-items:center;justify-content:center;border:none;border-radius:50%;outline:1px solid rgba(255,255,255,.35);outline-offset:1px;cursor:pointer}.zt-md .zt-md-ipe-swatch[data-active=true]{outline:2px solid #ffffff}.zt-md .zt-md-ipe-swatch-custom{background:conic-gradient(#f43f5e,#f59e0b,#22c55e,#3b82f6,#a855f7,#f43f5e)}.zt-md .zt-md-ipe-swatch-custom input[type=color]{position:absolute;top:0;right:0;bottom:0;left:0;opacity:0;cursor:pointer;border:none;padding:0}.zt-md .zt-md-ipe-stroke-dot{display:inline-block;border-radius:50%;background:currentColor}.zt-md .zt-md-ipe-text-button{height:2rem;padding:0 .875rem;border:1px solid rgba(255,255,255,.2);border-radius:.5rem;background:transparent;color:#ffffffd9;font-size:13px;cursor:pointer;transition:background-color .12s ease,border-color .12s ease}.zt-md .zt-md-ipe-text-button:hover{background:#ffffff1a;color:#fff}.zt-md .zt-md-ipe-confirm{border-color:transparent;background:var(--zt-primary, #4b7bec);color:var(--zt-primary-foreground, #ffffff);font-weight:600}.zt-md .zt-md-ipe-confirm:hover:not(:disabled){background:color-mix(in srgb,var(--zt-primary, #4b7bec) 85%,#ffffff);color:var(--zt-primary-foreground, #ffffff)}.zt-md .zt-md-ipe-confirm:disabled{opacity:.4;cursor:not-allowed}.zt-md .zt-md-ipe-overlay[data-crop=true] .zt-md-ipe-toolbar .zt-md-ipe-hide-in-crop,.zt-md .zt-md-ipe-crop-only{display:none}.zt-md .zt-md-ipe-overlay[data-crop=true] .zt-md-ipe-crop-only{display:inline-flex}.zt-md .zt-md-ipe-overlay[data-editable=false] .zt-md-ipe-edit-only{display:none!important}", ap = "zt-md-image-preview-editor-styles";
let er = null;
const lp = (e) => {
  if (er)
    return;
  vl(ap, sp);
  const t = Cl(e.view.dom, "zt-md-image-preview-host");
  let n = !1;
  const o = () => {
    er = null, queueMicrotask(() => {
      var s, a;
      t.remove(), n && ((a = (s = e.view) == null ? void 0 : s.focus) == null || a.call(s));
    });
  }, r = (s) => {
    const { view: a } = e;
    if (!a || !cp(a))
      return;
    const l = e.getPosition();
    if (l === null)
      return;
    const c = a.state.doc.nodeAt(l);
    if ((c == null ? void 0 : c.type.name) !== e.node.type.name)
      return;
    const d = a.state.tr.setNodeMarkup(l, void 0, {
      ...e.node.attrs,
      src: s
    });
    a.dispatch(d), n = !0;
  }, i = op({
    container: t,
    src: typeof e.node.attrs.src == "string" ? e.node.attrs.src : "",
    messages: e.messages,
    editable: e.editable,
    onConfirm: r,
    onClose: o
  });
  er = () => i.close(), i.open();
}, cp = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable, dp = 10, up = 100, hp = /^\s*width\s*:\s*(\d{1,3})%\s*;?\s*$/i, Io = (e) => Math.min(up, Math.max(dp, e)), El = (e) => `width: ${Io(Math.round(e))}%;`, zl = (e) => {
  if (typeof e != "string")
    return null;
  const t = e.match(hp);
  if (!t)
    return null;
  const n = Number(t[1]);
  return Number.isFinite(n) ? Io(n) : null;
}, dn = (e) => {
  const t = zl(e);
  return t === null ? "" : El(t);
}, uo = (e) => typeof e != "string" ? "" : e.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"), mp = (e, t) => {
  const n = un(e.src, t);
  if (!n)
    return "";
  const o = typeof e.alt == "string" ? e.alt : "", r = typeof e.title == "string" ? e.title : "", i = r ? ` title="${uo(r)}"` : "", s = dn(e.style);
  return `<img src="${uo(n)}" alt="${uo(o)}"${i} style="${uo(s)}">`;
}, pp = (e, t) => (n) => {
  const o = e(n);
  return {
    ...o,
    attrs: {
      ...o.attrs,
      style: { default: "", validate: "string" }
    },
    parseDOM: [
      {
        tag: "img[src]",
        getAttrs: (r) => {
          const i = r, s = un(i.getAttribute("src") ?? "", t);
          return s ? {
            src: s,
            alt: i.getAttribute("alt") ?? "",
            title: i.getAttribute("title") ?? i.getAttribute("alt") ?? "",
            style: dn(i.getAttribute("style") ?? "")
          } : !1;
        }
      }
    ],
    parseMarkdown: {
      match: (r) => r.type === "image" || r.type === "html" && ts(r.value, dn, t) !== null,
      runner: (r, i, s) => {
        var l;
        if (i.type === "html") {
          const c = ts(
            i.value,
            dn,
            t
          );
          if (!c)
            return;
          if ((l = r.top()) != null && l.type.isTextblock) {
            r.addNode(s, c);
            return;
          }
          const d = r.schema.nodes.paragraph;
          if (!d) {
            r.addNode(s, c);
            return;
          }
          r.openNode(d), r.addNode(s, c), r.closeNode();
          return;
        }
        const a = un(String(i.url ?? ""), t);
        a && r.addNode(s, {
          src: a,
          alt: String(i.alt ?? ""),
          title: String(i.title ?? ""),
          style: ""
        });
      }
    },
    toMarkdown: {
      match: (r) => r.type.name === "image",
      runner: (r, i) => {
        const s = un(i.attrs.src, t);
        if (!s)
          return;
        const a = dn(i.attrs.style);
        if (a) {
          const l = mp({ ...i.attrs, src: s, style: a }, t);
          l && r.addNode("html", void 0, l);
          return;
        }
        r.addNode("image", void 0, void 0, {
          title: i.attrs.title,
          url: s,
          alt: i.attrs.alt
        });
      }
    }
  };
}, fp = (e, t = []) => {
  const n = e.get(Wi.key);
  e.set(Wi.key, pp(n, t));
}, Ps = "image", ho = "left", Ds = "right", gp = 160, bp = 400, Ml = (e) => `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`, yp = Ml(
  '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>'
), kp = Ml(
  '<path d="M16 16v-1a4 4 0 0 0-7-2.6M7 10a4 4 0 0 0-1 8h4m8 0h2a3 3 0 0 0 1-5.8A5 5 0 0 0 15.5 6 5 5 0 0 0 6 8"/><line x1="2" x2="22" y1="2" y2="22"/>'
), tn = (e) => typeof e != "function" ? null : e(), nn = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable;
class wp {
  /**
   * 初始化图片视图。
   */
  constructor(t, n, o, r, i) {
    // 当前节点快照。
    m(this, "node");
    // 节点根容器。
    m(this, "dom");
    // 编辑器视图。
    m(this, "view");
    // 节点位置获取器。
    m(this, "getPos");
    // 编辑器文案(预览弹窗等一次性 UI 的文案来源)。
    m(this, "messages");
    // 图片删除文案。
    m(this, "deleteAriaLabel");
    // 图片元素。
    m(this, "imageElement");
    // 图片加载失败占位元素。
    m(this, "imageLoadErrorElement");
    // 操作区容器。
    m(this, "actionsContainer");
    // 删除按钮。
    m(this, "deleteButton");
    // 左侧缩放手柄。
    m(this, "leftResizeHandle");
    // 右侧缩放手柄。
    m(this, "rightResizeHandle");
    // 当前缩放状态。
    m(this, "resizeState", null);
    // 当前图片是否处于节点选中态。
    m(this, "isSelected", !1);
    // 当前图片地址。
    m(this, "currentImageSrc", "");
    // 当前加载态开始时间。
    m(this, "imageLoadingStartedAt", 0);
    // 图片加载结束定时器。
    m(this, "imageLoadingFinishTimer", null);
    // 图片说明输入元素。
    m(this, "captionElement");
    // 图片说明提交防抖定时器。
    m(this, "captionCommitTimer", null);
    // 图片说明无障碍标签。
    m(this, "captionAriaLabel");
    // 图片是否独占所在段落(独占时按块级居中,与文字并存时退回行内排版)。
    // 图片节点自身未变化时 ProseMirror 不会回调 update,需另行监听段落内容增删。
    m(this, "paragraphObserver", null);
    // 当前被监听的段落 DOM。
    m(this, "observedParagraph", null);
    // 是否已销毁(构造时排队的延迟同步可能在销毁后触发)。
    m(this, "isDestroyed", !1);
    // 图片显示地址解析器(文档 src 原样,仅显示时转换;为空则原地址直显)。
    m(this, "resolveImageUrl");
    /**
     * 响应说明输入:防抖后写回节点 alt 属性。
     */
    m(this, "handleCaptionInput", () => {
      this.captionCommitTimer !== null && window.clearTimeout(this.captionCommitTimer), this.captionCommitTimer = window.setTimeout(() => {
        this.captionCommitTimer = null, this.commitCaption();
      }, bp);
    });
    /**
     * 响应说明失焦:立即提交并同步一次节点快照。
     */
    m(this, "handleCaptionBlur", () => {
      this.clearCaptionCommitTimer(), this.commitCaption();
    });
    /**
     * 响应说明内按键:Enter/Escape 提交并退出(说明保持单行)。
     */
    m(this, "handleCaptionKeyDown", (t) => {
      t.key !== "Enter" && t.key !== "Escape" || (t.preventDefault(), t.stopPropagation(), this.captionElement.blur());
    });
    /**
     * 响应图片双击,打开预览/标注编辑弹窗(确认后回写节点 src)。
     */
    m(this, "handleImageDoubleClick", (t) => {
      t.preventDefault(), t.stopPropagation(), this.dom.dataset.loadError !== "true" && lp({
        view: this.view,
        getPosition: () => tn(this.getPos),
        node: this.node,
        messages: this.messages,
        editable: nn(this.view)
      });
    });
    /**
     * 响应删除按钮点击,删除当前图片。
     */
    m(this, "handleDeleteClick", (t) => {
      t.preventDefault(), t.stopPropagation(), nn(this.view) && this.deleteCurrentImage();
    });
    /**
     * 响应图片加载完成。
     */
    m(this, "handleImageLoad", () => {
      delete this.dom.dataset.loadError, this.finishImageLoadingWithMinimumDuration();
    });
    /**
     * 响应图片加载失败。
     */
    m(this, "handleImageError", () => {
      this.dom.dataset.loadError = "true", this.finishImageLoadingWithMinimumDuration();
    });
    /**
     * 响应图片缩放开始。
     */
    m(this, "handleResizePointerDown", (t) => {
      if (t.preventDefault(), t.stopPropagation(), !nn(this.view))
        return;
      const n = t.currentTarget;
      if (!(n instanceof HTMLElement))
        return;
      const o = n.dataset.side === ho ? ho : Ds, r = this.dom.parentElement;
      if (!r)
        return;
      const i = this.imageElement.getBoundingClientRect(), s = r.getBoundingClientRect();
      if (i.width <= 0 || s.width <= 0)
        return;
      const a = Io(i.width / s.width * 100);
      this.resizeState = {
        side: o,
        startClientX: t.clientX,
        startWidth: i.width,
        containerWidth: s.width,
        widthPercent: a
      }, this.dom.dataset.resizing = "true", this.applyPreviewWidth(a), window.addEventListener("pointermove", this.handleResizePointerMove), window.addEventListener("pointerup", this.handleResizePointerUp), window.addEventListener("pointercancel", this.handleResizePointerUp);
    });
    /**
     * 响应图片缩放移动。
     */
    m(this, "handleResizePointerMove", (t) => {
      if (!this.resizeState)
        return;
      t.preventDefault();
      const n = t.clientX - this.resizeState.startClientX, o = this.resizeState.side === ho ? -n : n, r = this.resizeState.startWidth + o, i = Io(r / this.resizeState.containerWidth * 100);
      this.resizeState.widthPercent = i, this.applyPreviewWidth(i);
    });
    /**
     * 响应图片缩放结束。
     */
    m(this, "handleResizePointerUp", (t) => {
      if (t.preventDefault(), !this.resizeState)
        return;
      const n = Math.round(this.resizeState.widthPercent);
      this.resizeState = null, delete this.dom.dataset.resizing, this.removeResizeWindowListeners(), this.commitImageWidth(n);
    });
    this.node = t, this.view = n, this.getPos = o, this.messages = r, this.resolveImageUrl = i ?? null, this.deleteAriaLabel = r.imageDeleteAriaLabel, this.captionAriaLabel = r.imageCaptionAriaLabel, this.dom = document.createElement("span"), this.dom.dataset.type = Ps, this.dom.className = "zt-md-image", this.updateEditableState(), this.syncSelectedState(), this.imageElement = document.createElement("img"), this.imageElement.addEventListener("load", this.handleImageLoad), this.imageElement.addEventListener("error", this.handleImageError), this.imageLoadErrorElement = document.createElement("span"), this.imageLoadErrorElement.className = "zt-md-image-load-error", this.imageLoadErrorElement.contentEditable = "false", this.imageLoadErrorElement.innerHTML = kp, this.imageLoadErrorElement.append(r.imageUploadLoadFailed), this.leftResizeHandle = this.createResizeHandle(ho), this.rightResizeHandle = this.createResizeHandle(Ds), this.actionsContainer = document.createElement("span"), this.actionsContainer.className = "zt-md-image-actions", this.captionElement = document.createElement("span"), this.captionElement.className = "zt-md-image-caption", this.captionElement.setAttribute("aria-label", this.captionAriaLabel), this.captionElement.dataset.placeholder = r.imageCaptionPlaceholder, this.captionElement.contentEditable = "true", this.captionElement.addEventListener("input", this.handleCaptionInput), this.captionElement.addEventListener("blur", this.handleCaptionBlur), this.captionElement.addEventListener("keydown", this.handleCaptionKeyDown), this.deleteButton = document.createElement("button"), this.deleteButton.type = "button", this.deleteButton.className = "zt-md-image-action-button zt-md-image-action-button-danger", this.deleteButton.setAttribute("aria-label", this.deleteAriaLabel), this.deleteButton.innerHTML = yp, this.actionsContainer.appendChild(this.deleteButton), this.dom.append(
      this.imageElement,
      this.imageLoadErrorElement,
      this.leftResizeHandle,
      this.rightResizeHandle,
      this.actionsContainer,
      this.captionElement
    ), this.syncFromNode(t), this.syncInitialSelection(), queueMicrotask(() => this.syncSoloState()), this.deleteButton.addEventListener("click", this.handleDeleteClick), this.imageElement.addEventListener("dblclick", this.handleImageDoubleClick), this.leftResizeHandle.addEventListener("pointerdown", this.handleResizePointerDown), this.rightResizeHandle.addEventListener("pointerdown", this.handleResizePointerDown);
  }
  /**
   * 同步初始选中态:初始 state 已携带本节点 NodeSelection 时(如文档首块即图片),
   * ProseMirror mount 不会回调 selectNode,需在构造时补齐 DOM 高亮。
   */
  syncInitialSelection() {
    const t = tn(this.getPos), { selection: n } = this.view.state;
    t !== null && n instanceof Ae && n.from === t && this.selectNode();
  }
  /**
   * 同步图片独占段落标记:图片是段落内唯一子节点时按块级居中展示(保持旧版
   * 块级图片的视觉),同段落一旦出现文字/其他元素即退回行内排版,图文同行。
   */
  syncSoloState() {
    if (this.isDestroyed)
      return;
    const t = tn(this.getPos);
    if (t === null)
      return;
    let n = !1;
    try {
      n = this.view.state.doc.resolve(t).parent.childCount === 1;
    } catch {
      n = !1;
    }
    const o = n ? "true" : "false";
    this.dom.dataset.solo !== o && (this.dom.dataset.solo = o), this.observeParagraph();
  }
  /**
   * 监听图片所在段落的直接子节点变化:图文同行结构的切换信号就是段落内容
   * 增删,反映为段落 DOM 的 childList/characterData 变更。节点视图被
   * ProseMirror 移动到新段落时父级随之变化,这里同步重挂监听。
   */
  observeParagraph() {
    var n;
    const t = this.dom.parentElement;
    t !== this.observedParagraph && ((n = this.paragraphObserver) == null || n.disconnect(), this.observedParagraph = t, t && (this.paragraphObserver = new MutationObserver(() => this.syncSoloState()), this.paragraphObserver.observe(t, { childList: !0, characterData: !0 })));
  }
  /**
   * 清理说明提交防抖定时器。
   */
  clearCaptionCommitTimer() {
    this.captionCommitTimer !== null && (window.clearTimeout(this.captionCommitTimer), this.captionCommitTimer = null);
  }
  /**
   * 把说明文本提交到节点 alt 属性(文本未变化时不产生事务)。
   */
  commitCaption() {
    var i;
    if (!nn(this.view))
      return;
    const t = tn(this.getPos);
    if (t === null)
      return;
    const n = ((i = this.captionElement.textContent) == null ? void 0 : i.trim()) ?? "", o = typeof this.node.attrs.alt == "string" ? this.node.attrs.alt : "";
    if (n === o)
      return;
    const r = this.view.state.tr.setNodeMarkup(t, void 0, {
      ...this.node.attrs,
      alt: n
    });
    this.view.dispatch(r);
  }
  /**
   * 创建图片缩放手柄。
   */
  createResizeHandle(t) {
    const n = document.createElement("span");
    return n.className = `zt-md-image-resize-handle zt-md-image-resize-handle-${t}`, n.dataset.side = t, n.setAttribute("aria-hidden", "true"), n;
  }
  /**
   * 删除当前图片并将焦点归还编辑器。
   */
  deleteCurrentImage() {
    const t = tn(this.getPos);
    if (t === null)
      return;
    const n = this.view.state.tr.delete(t, t + this.node.nodeSize).scrollIntoView();
    this.view.dispatch(n), requestAnimationFrame(() => {
      this.view.focus();
    });
  }
  /**
   * 更新图片可编辑状态标记。
   */
  updateEditableState() {
    this.dom.dataset.editable = nn(this.view) ? "true" : "false";
  }
  /**
   * 更新图片选中态标记。
   */
  syncSelectedState() {
    this.dom.dataset.selected = this.isSelected ? "true" : "false";
  }
  /**
   * 标记图片正在加载。
   */
  markImageLoading() {
    this.clearImageLoadingFinishTimer(), this.imageLoadingStartedAt = performance.now(), delete this.dom.dataset.loadError, this.dom.dataset.loading = "true";
  }
  /**
   * 标记图片加载结束。
   */
  finishImageLoading() {
    this.clearImageLoadingFinishTimer(), delete this.dom.dataset.loading;
  }
  /**
   * 延迟结束图片加载态,避免占位符一闪而过。
   */
  finishImageLoadingWithMinimumDuration() {
    const t = performance.now() - this.imageLoadingStartedAt, n = Math.max(0, gp - t);
    if (n <= 0) {
      this.finishImageLoading();
      return;
    }
    this.clearImageLoadingFinishTimer(), this.imageLoadingFinishTimer = window.setTimeout(() => {
      this.finishImageLoading();
    }, n);
  }
  /**
   * 清理图片加载结束定时器。
   */
  clearImageLoadingFinishTimer() {
    this.imageLoadingFinishTimer !== null && (window.clearTimeout(this.imageLoadingFinishTimer), this.imageLoadingFinishTimer = null);
  }
  /**
   * 移除图片缩放全局监听。
   */
  removeResizeWindowListeners() {
    window.removeEventListener("pointermove", this.handleResizePointerMove), window.removeEventListener("pointerup", this.handleResizePointerUp), window.removeEventListener("pointercancel", this.handleResizePointerUp);
  }
  /**
   * 应用图片宽度预览。
   */
  applyPreviewWidth(t) {
    this.dom.style.width = `${Math.round(t)}%`, this.dom.dataset.hasWidth = "true";
  }
  /**
   * 提交图片宽度到节点属性。
   */
  commitImageWidth(t) {
    const n = tn(this.getPos);
    if (n === null)
      return;
    const o = {
      ...this.node.attrs,
      style: El(t)
    }, r = this.view.state.tr.setNodeMarkup(n, void 0, o);
    this.view.dispatch(r), requestAnimationFrame(() => {
      this.view.focus();
    });
  }
  /**
   * 更新图片 DOM 属性。
   */
  syncFromNode(t) {
    this.updateEditableState();
    const n = typeof t.attrs.src == "string" ? t.attrs.src : "", o = typeof t.attrs.alt == "string" ? t.attrs.alt : "", r = typeof t.attrs.title == "string" ? t.attrs.title : "", i = dn(t.attrs.style), s = zl(i);
    n !== this.currentImageSrc && (delete this.dom.dataset.loadError, n && this.markImageLoading()), this.imageElement.setAttribute("src", this.resolveImageUrl && this.resolveImageUrl(n) || n), this.currentImageSrc = n, this.imageElement.setAttribute("alt", o), r ? this.imageElement.title = r : this.imageElement.removeAttribute("title"), s !== null ? (this.dom.style.width = `${s}%`, this.dom.dataset.hasWidth = "true") : (this.dom.style.removeProperty("width"), delete this.dom.dataset.hasWidth), n ? this.imageElement.complete && this.imageElement.naturalWidth > 0 && this.finishImageLoadingWithMinimumDuration() : this.finishImageLoading(), !(document.activeElement === this.captionElement) && (this.captionElement.textContent ?? "") !== o && (this.captionElement.textContent = o);
    const c = nn(this.view);
    this.captionElement.contentEditable = c ? "true" : "false", this.captionElement.style.display = !c && !o ? "none" : "";
  }
  /**
   * 处理节点更新。
   */
  update(t) {
    return t.type.name !== Ps ? !1 : (this.node = t, this.syncFromNode(t), this.syncSoloState(), !0);
  }
  /**
   * 节点被选中时同步图片选中态。
   */
  selectNode() {
    this.isSelected = !0, this.syncSelectedState();
  }
  /**
   * 节点取消选中时同步图片选中态。
   */
  deselectNode() {
    this.isSelected = !1, this.syncSelectedState();
  }
  /**
   * 只拦截删除按钮和缩放手柄内部事件(双击图片交由预览弹窗处理)。
   */
  stopEvent(t) {
    const n = t.target;
    return n instanceof Node ? t.type === "dblclick" && this.imageElement.contains(n) || this.deleteButton.contains(n) || this.leftResizeHandle.contains(n) || this.rightResizeHandle.contains(n) || this.captionElement.contains(n) || this.resizeState !== null : !1;
  }
  /**
   * 忽略 NodeView 内部的 DOM 变更观察。
   */
  ignoreMutation() {
    return !0;
  }
  /**
   * 销毁时解绑监听器。
   */
  destroy() {
    var t;
    this.isDestroyed = !0, (t = this.paragraphObserver) == null || t.disconnect(), this.paragraphObserver = null, this.observedParagraph = null, this.clearCaptionCommitTimer(), this.removeResizeWindowListeners(), this.clearImageLoadingFinishTimer(), this.imageElement.removeEventListener("load", this.handleImageLoad), this.imageElement.removeEventListener("error", this.handleImageError), this.captionElement.removeEventListener("input", this.handleCaptionInput), this.captionElement.removeEventListener("blur", this.handleCaptionBlur), this.captionElement.removeEventListener("keydown", this.handleCaptionKeyDown), this.deleteButton.removeEventListener("click", this.handleDeleteClick), this.imageElement.removeEventListener("dblclick", this.handleImageDoubleClick), this.leftResizeHandle.removeEventListener("pointerdown", this.handleResizePointerDown), this.rightResizeHandle.removeEventListener("pointerdown", this.handleResizePointerDown);
  }
}
const vp = (e = Qe(), t) => (n, o, r) => {
  const i = typeof r == "function" ? () => {
    const s = r();
    return typeof s == "number" ? s : 0;
  } : !1;
  return new wp(n, o, i, e, t);
}, Cp = "image", Ep = "media_embed", zp = /* @__PURE__ */ new Set([Ep]), Gr = {
  Backspace: "before",
  Delete: "after"
}, Mp = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable, Bs = (e) => e instanceof Element ? !!e.closest(
  ".zt-md-image-actions, .zt-md-image-resize-handle, .zt-md-media-embed-actions"
) : !1, Xr = (e) => zp.has((e == null ? void 0 : e.type.name) ?? ""), Tp = (e, t) => !Gr[t.key] || t.defaultPrevented || t.altKey || t.ctrlKey || t.metaKey || t.shiftKey || !Mp(e) || Bs(t.target) || Bs(document.activeElement), xp = (e) => {
  if (e.parent.type.name !== "paragraph" || e.parentOffset !== 0 || e.parent.textContent.length > 0 || e.depth < 1)
    return null;
  const t = e.index(e.depth - 1);
  if (t <= 0)
    return null;
  const o = e.node(e.depth - 1).child(t - 1);
  return Xr(o) ? {
    previousBlockStart: e.before(e.depth) - o.nodeSize
  } : null;
}, Tl = (e, t) => {
  try {
    return de.create(e, t);
  } catch {
    return de.near(e.resolve(t), -1);
  }
}, Sp = (e, t, n) => {
  n.preventDefault();
  const o = t.from, r = e.state.tr.delete(t.from, t.to), i = r.doc.content.size, s = Math.min(o, i);
  return r.setSelection(Tl(r.doc, s)).scrollIntoView(), e.dispatch(r), e.focus(), !0;
}, Lp = (e, t) => {
  if (t.key !== "Backspace")
    return !1;
  const { selection: n } = e.state;
  if (!n.empty)
    return !1;
  const o = n.$from, r = xp(o);
  if (!r)
    return !1;
  const i = o.before(o.depth), s = i + o.parent.nodeSize;
  t.preventDefault();
  const a = e.state.tr;
  return a.delete(i, s), a.setSelection(
    Ae.create(a.doc, r.previousBlockStart)
  ).scrollIntoView(), e.dispatch(a), e.focus(), !0;
}, Ap = (e, t) => {
  if (Lp(e, t))
    return !0;
  const n = Gr[t.key];
  if (!n)
    return !1;
  const { selection: o } = e.state;
  if (!o.empty)
    return !1;
  const r = o.$from, i = n === "before" ? r.nodeBefore : r.nodeAfter;
  if (!Xr(i))
    return !1;
  t.preventDefault();
  const s = n === "before" ? o.from - i.nodeSize : o.from;
  return e.dispatch(
    e.state.tr.setSelection(Ae.create(e.state.doc, s)).scrollIntoView()
  ), e.focus(), !0;
}, Ip = (e, t) => {
  const n = Gr[t.key];
  if (!n)
    return !1;
  const { selection: o } = e.state;
  if (!o.empty)
    return !1;
  const r = o.$from, i = n === "before" ? r.nodeBefore : r.nodeAfter;
  if ((i == null ? void 0 : i.type.name) !== Cp)
    return !1;
  const s = n === "before" ? o.from - i.nodeSize : o.from, a = s + i.nodeSize;
  t.preventDefault();
  const l = e.state.tr.delete(s, a), c = Math.min(s, l.doc.content.size);
  return l.setSelection(Tl(l.doc, c)).scrollIntoView(), e.dispatch(l), e.focus(), !0;
}, Rp = (e, t) => {
  if (Tp(e, t))
    return !1;
  if (Ip(e, t))
    return !0;
  const { selection: n } = e.state;
  return n instanceof Ae && Xr(n.node) ? Sp(e, n, t) : Ap(e, t);
}, Np = ue(() => new ye({
  key: new ke("zt-md-image-delete-selection"),
  props: {
    handleKeyDown: (e, t) => Rp(e, t)
  }
})), Pp = (e, t) => {
  const n = e.state.schema.nodes.image;
  return (n == null ? void 0 : n.create(t)) ?? null;
}, Yr = (e, t, n = e.state.selection) => {
  const o = Pp(e, t);
  return o ? (e.dispatch(
    e.state.tr.setSelection(n).replaceSelectionWith(o).scrollIntoView()
  ), !0) : !1;
}, Zr = 5 * 1024 * 1024, _s = "zt-md-image-upload-file-input", Os = "zt-md-image-upload-alt-input", Jr = (e) => new Promise((t, n) => {
  const o = new FileReader();
  o.onload = () => {
    const r = o.result;
    if (typeof r == "string") {
      t(r);
      return;
    }
    n(new Error("Invalid file result"));
  }, o.onerror = () => {
    n(o.error ?? new Error("File read failed"));
  }, o.readAsDataURL(e);
}), Ro = (e) => e < 1024 * 1024 ? `${Math.ceil(e / 1024)}KB` : `${(e / 1024 / 1024).toFixed(1)}MB`, Hs = (e) => {
  try {
    const t = new URL(e);
    return !!(t.protocol && t.host);
  } catch {
    return !1;
  }
}, Dp = (e) => new Promise((t, n) => {
  const o = new Image();
  o.onload = () => {
    t();
  }, o.onerror = () => {
    n(new Error("Image load failed"));
  }, o.src = e;
}), Qr = (e) => e.replace(/\.[^/.]+$/, ""), fn = new ke("zt-md-image-paste");
let Fs = 0;
const Bp = (e) => (typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable) && !e.state.selection.$from.parent.type.spec.code, _p = (e) => {
  const t = Array.from(e.items).find(
    (o) => o.kind === "file" && o.type.startsWith("image/")
  ), n = t == null ? void 0 : t.getAsFile();
  return n || (Array.from(e.files).find((o) => o.type.startsWith("image/")) ?? null);
}, Op = () => (Fs += 1, `image-paste-${Fs}`), Hp = (e, t) => {
  const n = /* @__PURE__ */ new Map();
  t.forEach((r, i) => {
    n.set(i, r.map(e.mapping));
  });
  const o = e.getMeta(fn);
  return (o == null ? void 0 : o.type) === "add" && n.set(o.requestId, o.bookmark), (o == null ? void 0 : o.type) === "remove" && n.delete(o.requestId), n;
}, $s = (e, t) => {
  var n;
  e.isDestroyed || !((n = fn.getState(e.state)) != null && n.has(t)) || e.dispatch(
    e.state.tr.setMeta(fn, { type: "remove", requestId: t })
  );
}, Fp = async (e, t, n) => {
  const o = t != null && t.upload ? await t.upload(e) : await Jr(e);
  if (!o)
    throw new Error(n.imageUploadFailed);
  return o;
}, $p = async (e, t, n, o, r) => {
  var i;
  try {
    const s = await Fp(t, o, r);
    if (e.isDestroyed)
      return;
    const a = (i = fn.getState(e.state)) == null ? void 0 : i.get(n);
    if (!a)
      return;
    const l = a.resolve(e.state.doc);
    $s(e, n), Yr(
      e,
      {
        src: s,
        alt: Qr(t.name),
        title: ""
      },
      l
    );
  } catch (s) {
    console.error(s);
  } finally {
    $s(e, n);
  }
}, jp = (e, t) => ue(() => new ye({
  key: fn,
  state: {
    /** 初始化待处理图片粘贴集合。 */
    init: () => /* @__PURE__ */ new Map(),
    /** 让待处理粘贴位置跟随编辑事务。 */
    apply: Hp
  },
  props: {
    /** 优先消费剪贴板中的第一张图片。 */
    handlePaste: (n, o) => {
      if (!Bp(n))
        return !1;
      const r = o.clipboardData ? _p(o.clipboardData) : null;
      if (!r)
        return !1;
      o.preventDefault();
      const i = (e == null ? void 0 : e.maxFileSize) ?? Zr;
      if (r.size > i)
        return console.error(
          new Error(t.imageUploadFileSizeExceeded.replace("{size}", Ro(i)))
        ), !0;
      const s = Op(), a = n.state.selection.getBookmark();
      return n.dispatch(
        n.state.tr.setMeta(fn, {
          type: "add",
          requestId: s,
          bookmark: a
        })
      ), $p(n, r, s, e, t), !0;
    }
  }
})), Xn = (e, t = 24) => `<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`, Kp = Xn('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', 16), Wp = Xn(
  '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  40
), Up = Xn('<path d="M21 12a9 9 0 1 1-6.219-8.56"/>', 40), tr = (e) => Xn(
  '<line x1="2" x2="22" y1="2" y2="22"/><path d="M10.41 5.41C10.87 5.15 11.42 5 12 5h6a2 2 0 0 1 2 2v6"/><path d="M4 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h.34"/><circle cx="9" cy="10" r="1"/><path d="m17 15-5.41-5.41"/>',
  e
), js = Xn(
  '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  14
), Vp = (e) => {
  const t = document.createElement("div");
  t.className = "zt-md-image-upload-dialog-overlay", t.style.display = "none";
  const n = document.createElement("div");
  n.className = "zt-md-image-upload-content-shell", n.setAttribute("role", "dialog"), n.setAttribute("aria-label", e.messages.imageUploadDialogTitle), t.appendChild(n), e.container.appendChild(t);
  let o = "file", r = "", i = "", s = !1, a = "", l = !1, c = !1, d = !1, u = null, h = null;
  const p = e.config.maxFileSize ?? Zr, g = () => l || c, y = () => o === "file" && !!r && !g(), f = () => a || (y() ? e.messages.imageUploadReselectHint : ""), w = () => !!r && !a && !l && !s, b = () => !r || !!a || g() || s, k = async (D) => {
    if (!D.type.startsWith("image/")) {
      r = "", i = "", a = e.messages.imageUploadInvalidType, I();
      return;
    }
    if (D.size > p) {
      r = "", i = "", a = e.messages.imageUploadFileSizeExceeded.replace("{size}", Ro(p)), I();
      return;
    }
    a = "", i = Qr(D.name), s = !1, l = !0, I();
    try {
      const N = e.config.upload ? await e.config.upload(D) : await Jr(D);
      if (!N) {
        r = "", a = e.messages.imageUploadFailed;
        return;
      }
      r = N;
    } catch (N) {
      const ee = e.config.upload ? N instanceof Error ? N.message : e.messages.imageUploadFailed : e.messages.imageUploadFileReadFailed;
      r = "", a = ee || e.messages.imageUploadFailed;
    } finally {
      l = !1, I();
    }
  }, v = (D) => {
    if (s = !1, r = D, !D) {
      a = "";
      return;
    }
    a = Hs(D) ? "" : e.messages.imageUploadInvalidUrl, O();
  }, E = async () => {
    if (g()) {
      a = e.messages.imageUploadUploadingWait, I();
      return;
    }
    if (!r) {
      a = e.messages.imageUploadSelectOrEnterImage, I();
      return;
    }
    if (o === "url" && !Hs(r)) {
      a = e.messages.imageUploadInvalidUrl, I();
      return;
    }
    a = "", c = !0, I();
    try {
      await Dp(r);
      const D = un(r, e.config.allowedProtocols);
      if (!D) {
        s = !1, a = e.messages.imageUploadInvalidUrl;
        return;
      }
      e.onConfirm(D, i.trim(), ""), H.close();
    } catch {
      s = !0, a = e.messages.imageUploadLoadFailed;
    } finally {
      c = !1, I();
    }
  }, M = (D) => {
    g() || (o = D, r = "", i = "", s = !1, a = "", I());
  }, x = () => l ? `<div class="zt-md-image-upload-file-icon">${Up.replace("<svg ", '<svg class="zt-md-image-upload-spin" ')}</div><div class="zt-md-image-upload-file-text">${S(e.messages.imageUploadUploadingLabel)}</div>` : r ? s ? `<div class="zt-md-image-upload-file-preview"><div class="zt-md-image-upload-preview-error">${tr(40)}<span>${S(e.messages.imageUploadLoadFailed)}</span></div></div>` : `<div class="zt-md-image-upload-file-preview"><img src="${S(r)}" alt="" /></div>` : `<div class="zt-md-image-upload-file-icon">${Wp}</div><div class="zt-md-image-upload-file-text">${S(e.messages.imageUploadDropLabel)}</div><div class="zt-md-image-upload-file-hint">${S(
    e.messages.imageUploadSupportsAndMax.replace("{size}", Ro(p))
  )}</div>`, T = () => {
    const D = r && !a ? s ? `<div class="zt-md-image-upload-url-preview"><div class="zt-md-image-upload-preview-error">${tr(32)}<span>${S(e.messages.imageUploadLoadFailed)}</span></div></div>` : `<div class="zt-md-image-upload-url-preview"><img src="${S(r)}" alt="" /></div>` : "";
    return `<label class="zt-md-image-upload-label" for="zt-md-image-upload-url-input">${S(
      e.messages.imageUploadUrlTab
    )}</label><input id="zt-md-image-upload-url-input" type="url" class="zt-md-image-upload-url-input" placeholder="${S(e.messages.imageUploadUrlPlaceholder)}" value="${S(r)}"${g() ? " disabled" : ""} />${D}`;
  }, L = () => {
    const D = o === "file" ? `<div class="zt-md-image-upload-file"><input id="${_s}" type="file" accept="image/*" class="zt-md-image-upload-file-input"${g() ? " disabled" : ""} /><label for="${_s}" class="zt-md-image-upload-file-label" data-drag-over="${d ? "true" : "false"}" data-has-preview="${r ? "true" : "false"}" data-disabled="${g() ? "true" : "false"}"${g() ? ' aria-disabled="true"' : ""}>${x()}</label></div>` : `<div class="zt-md-image-upload-url">${T()}</div>`, N = w() ? `<div class="zt-md-image-upload-alt"><label class="zt-md-image-upload-label" for="${Os}">${S(
      e.messages.imageUploadAltLabel
    )}</label><input id="${Os}" type="text" class="zt-md-image-upload-alt-input" placeholder="${S(e.messages.imageUploadAltPlaceholder)}" value="${S(i)}"${g() ? " disabled" : ""} /></div>` : "", ee = f(), re = `<div class="zt-md-image-upload-file-hint zt-md-image-upload-reselect-hint" data-error="${a ? "true" : "false"}" data-placeholder="${ee ? "false" : "true"}"${a ? ' role="alert" aria-live="polite"' : ' aria-live="off" aria-hidden="true"'}>${a ? js : ""}<span class="zt-md-image-upload-hint-text">${S(ee || e.messages.imageUploadReselectHint)}</span></div>`;
    return `<div class="zt-md-image-upload-segmented" role="group" aria-label="${S(
      e.messages.imageUploadDialogTitle
    )}"><button type="button" class="zt-md-image-upload-segment" data-upload-type="file" data-active="${o === "file" ? "true" : "false"}" aria-pressed="${o === "file"}"${g() ? " disabled" : ""}>${S(e.messages.imageUploadFileTab)}</button><button type="button" class="zt-md-image-upload-segment" data-upload-type="url" data-active="${o === "url" ? "true" : "false"}" aria-pressed="${o === "url"}"${g() ? " disabled" : ""}>${S(e.messages.imageUploadUrlTab)}</button></div><div class="zt-md-image-upload-content"><div class="zt-md-image-upload-control">${D}${N}${re}</div></div><div class="zt-md-image-upload-dialog-footer"><button type="button" class="zt-md-image-upload-dialog-cancel">${S(
      e.messages.imageUploadCancelLabel
    )}</button><button type="button" class="zt-md-image-upload-dialog-confirm"${b() ? " disabled" : ""}>${S(
      l ? e.messages.imageUploadUploadingLabel : c ? e.messages.imageUploadInsertingLabel : e.messages.imageUploadConfirmLabel
    )}</button></div>`;
  };
  function S(D) {
    return D.replace(/[&<>"]/g, (N) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[N] ?? N);
  }
  const I = () => {
    n.innerHTML = `<div class="zt-md-image-upload-dialog-header"><span class="zt-md-image-upload-dialog-title">${S(e.messages.imageUploadDialogTitle)}</span><button type="button" class="zt-md-image-upload-dialog-close" aria-label="${S(
      e.messages.imageUploadCancelLabel
    )}" title="${S(e.messages.imageUploadCancelLabel)}">${Kp}</button></div>${L()}`, K();
  }, O = () => {
    var N;
    const D = n.querySelector(".zt-md-image-upload-control");
    if (!D) {
      I();
      return;
    }
    if ((N = D.querySelector(".zt-md-image-upload-url-preview")) == null || N.remove(), r && !a) {
      const ee = document.createElement("div");
      if (ee.className = "zt-md-image-upload-url-preview", s)
        ee.innerHTML = `<div class="zt-md-image-upload-preview-error">${tr(32)}<span>${S(e.messages.imageUploadLoadFailed)}</span></div>`;
      else {
        const re = document.createElement("img");
        re.src = r, re.alt = "", ee.appendChild(re);
      }
      D.appendChild(ee);
    }
    J(), V();
  }, J = () => {
    const D = n.querySelector(".zt-md-image-upload-reselect-hint");
    if (!D)
      return;
    const N = f();
    D.dataset.error = a ? "true" : "false", D.dataset.placeholder = N ? "false" : "true", a ? (D.setAttribute("role", "alert"), D.setAttribute("aria-live", "polite"), D.removeAttribute("aria-hidden")) : (D.removeAttribute("role"), D.setAttribute("aria-live", "off"), D.setAttribute("aria-hidden", "true"));
    const ee = D.querySelector(".zt-md-image-upload-hint-icon");
    a && !ee ? D.insertAdjacentHTML("afterbegin", js) : !a && ee && ee.remove();
    const re = D.querySelector(".zt-md-image-upload-hint-text");
    re && (re.textContent = N || e.messages.imageUploadReselectHint);
  }, V = () => {
    const D = n.querySelector(".zt-md-image-upload-dialog-confirm");
    D && (D.disabled = b(), D.textContent = l ? e.messages.imageUploadUploadingLabel : c ? e.messages.imageUploadInsertingLabel : e.messages.imageUploadConfirmLabel);
  }, K = () => {
    const D = n.querySelector(".zt-md-image-upload-dialog-close");
    D == null || D.addEventListener("click", () => H.close());
    const N = n.querySelector(".zt-md-image-upload-dialog-cancel");
    N == null || N.addEventListener("click", () => H.close());
    const ee = n.querySelector(".zt-md-image-upload-dialog-confirm");
    ee == null || ee.addEventListener("click", () => {
      E();
    }), n.querySelectorAll(".zt-md-image-upload-segment").forEach((te) => {
      te.addEventListener("click", () => {
        M(te.dataset.uploadType ?? "file");
      });
    }), u = n.querySelector(".zt-md-image-upload-file-input");
    const re = n.querySelector(".zt-md-image-upload-file-label");
    u && re && (u.addEventListener("change", () => {
      var G;
      const te = (G = u == null ? void 0 : u.files) == null ? void 0 : G[0];
      te && k(te), u && (u.value = "");
    }), re.addEventListener("click", (te) => {
      g() && te.preventDefault();
    }), re.addEventListener("dragover", (te) => {
      te.preventDefault(), te.stopPropagation(), !g() && (te.dataTransfer && (te.dataTransfer.dropEffect = "copy"), d = !0, re.dataset.dragOver = "true");
    }), re.addEventListener("dragleave", (te) => {
      te.preventDefault(), te.stopPropagation(), re.contains(te.relatedTarget) || (d = !1, re.dataset.dragOver = "false");
    }), re.addEventListener("drop", (te) => {
      var fe, Ce;
      if (te.preventDefault(), te.stopPropagation(), d = !1, re.dataset.dragOver = "false", g())
        return;
      const G = (Ce = (fe = te.dataTransfer) == null ? void 0 : fe.files) == null ? void 0 : Ce[0];
      G && k(G);
    })), h = n.querySelector(".zt-md-image-upload-url-input"), h == null || h.addEventListener("input", () => {
      v((h == null ? void 0 : h.value) ?? "");
    });
    const B = n.querySelector(".zt-md-image-upload-alt-input");
    B == null || B.addEventListener("input", () => {
      i = B.value;
    });
  }, z = (D) => {
    D.key === "Enter" && !D.shiftKey && o === "url" && (D.preventDefault(), E());
  };
  n.addEventListener("keydown", z);
  const H = {
    open: () => {
      o = "file", r = "", i = "", s = !1, a = "", l = !1, c = !1, d = !1, I(), t.style.display = "";
    },
    close: () => {
      var D;
      t.style.display = "none", (D = e.onClose) == null || D.call(e);
    },
    setMessages: (D) => {
      e.messages = D, I();
    }
  };
  return H;
}, qp = ".zt-md.zt-md-dialog-host{position:fixed;top:0;right:0;bottom:0;left:0;width:100vw;height:100dvh;min-height:100vh;overflow:visible;border:0;border-radius:0;background:transparent;box-shadow:none;color:var(--zt-fg);font-family:var(--zt-font);z-index:1300;pointer-events:none;transition:none}.zt-md-image-upload-dialog-overlay{position:absolute;top:0;right:0;bottom:0;left:0;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--zt-fg) 62%,transparent);pointer-events:auto}.zt-md-image-upload-host.zt-md-dark .zt-md-image-upload-dialog-overlay{background:color-mix(in srgb,var(--zt-bg) 72%,transparent)}.zt-md-image-upload-content-shell{box-sizing:border-box;display:flex;width:min(640px,calc(100vw - 32px));max-height:min(90vh,620px);flex-direction:column;gap:0;overflow:hidden;border:1px solid color-mix(in srgb,var(--zt-border) 78%,transparent);border-radius:var(--zt-radius-lg);background:var(--zt-surface);box-shadow:0 18px 42px color-mix(in srgb,var(--zt-fg) 22%,transparent);padding:12px 24px 0}.zt-md-image-upload-content-shell *,.zt-md-image-upload-content-shell *:before,.zt-md-image-upload-content-shell *:after{box-sizing:border-box}.zt-md-image-upload-dialog-header{position:relative;margin-bottom:4px}.zt-md-image-upload-dialog-title{display:block;color:var(--zt-fg);font-size:20px;font-weight:700;line-height:1.35;padding-right:36px}.zt-md-image-upload-dialog-close{position:absolute;top:0;right:0;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:0;border-radius:var(--zt-radius);background:transparent;color:var(--zt-muted);cursor:pointer}.zt-md-image-upload-dialog-close:hover{background:var(--zt-bg-hover);color:var(--zt-fg)}.zt-md-image-upload-segmented{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0;border-radius:var(--zt-radius);background:color-mix(in srgb,var(--zt-muted) 9%,var(--zt-surface));padding:4px}.zt-md-image-upload-segment{border:1px solid transparent;border-radius:6px;background:transparent;color:color-mix(in srgb,var(--zt-muted) 88%,var(--zt-fg));font:inherit;font-size:14px;font-weight:500;height:30px;line-height:1.4;box-shadow:none;min-width:0;cursor:pointer}.zt-md-image-upload-segment[data-active=true]{border-color:color-mix(in srgb,var(--zt-primary) 24%,var(--zt-border));background:var(--zt-bg-hover);color:var(--zt-primary);box-shadow:none}.zt-md-image-upload-segment:hover:not(:disabled){background:var(--zt-bg-active);color:var(--zt-fg)}.zt-md-image-upload-segment:disabled{opacity:.6;cursor:not-allowed}.zt-md-image-upload-content{display:flex;min-height:0;flex:1 1 auto;flex-direction:column;gap:16px;overflow-x:hidden;overflow-y:auto;padding:12px 0 6px}.zt-md-image-upload-control{width:100%}.zt-md-image-upload-file{position:relative;width:100%}.zt-md-image-upload-file-input{position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none}.zt-md-image-upload-file-label{display:flex;width:100%;min-height:240px;flex-direction:column;align-items:center;justify-content:center;border:2px dashed color-mix(in srgb,var(--zt-border) 74%,var(--zt-surface));border-radius:var(--zt-radius);background:color-mix(in srgb,var(--zt-muted) 6%,var(--zt-surface));color:color-mix(in srgb,var(--zt-muted) 90%,var(--zt-fg));cursor:pointer;padding:48px 24px;text-align:center;transition:border-color .2s,background-color .2s,color .2s}.zt-md-image-upload-file-label:hover,.zt-md-image-upload-file-label[data-drag-over=true]{border-color:color-mix(in srgb,var(--zt-primary) 45%,var(--zt-border));background:var(--zt-bg-hover);color:var(--zt-fg)}.zt-md-image-upload-file-label[data-disabled=true]{cursor:not-allowed;opacity:.7}.zt-md-image-upload-file-label[data-disabled=true]:hover{border-color:color-mix(in srgb,var(--zt-border) 74%,var(--zt-surface));background:color-mix(in srgb,var(--zt-muted) 6%,var(--zt-surface));color:var(--zt-muted)}.zt-md-image-upload-file-label[data-has-preview=true]{overflow:hidden;padding:0}.zt-md-image-upload-file-icon{display:flex;align-items:center;justify-content:center;margin-bottom:14px;color:color-mix(in srgb,var(--zt-muted) 82%,var(--zt-fg))}.zt-md-image-upload-spin{animation:zt-md-image-upload-spin .8s linear infinite}.zt-md-image-upload-file-text{margin-bottom:6px;color:var(--zt-fg);font-size:16px;font-weight:500;line-height:1.4}.zt-md-image-upload-file-hint{color:color-mix(in srgb,var(--zt-muted) 88%,var(--zt-fg));font-size:14px;line-height:1.5}.zt-md-image-upload-file-preview{display:block;width:100%;height:240px;overflow:hidden}.zt-md-image-upload-file-preview img,.zt-md-image-upload-url-preview img{display:block;width:100%;height:100%;object-fit:contain}.zt-md-image-upload-preview-error{display:flex;width:100%;height:100%;min-height:160px;flex-direction:column;align-items:center;justify-content:center;gap:8px;border-radius:6px;background:color-mix(in srgb,var(--zt-muted) 14%,var(--zt-surface));color:var(--zt-muted);font-size:14px}.zt-md-image-upload-reselect-hint{display:flex;height:20px;align-items:center;justify-content:center;gap:6px;margin-top:8px;line-height:20px;text-align:center}.zt-md-image-upload-reselect-hint[data-error=true]{color:var(--zt-destructive)}.zt-md-image-upload-hint-icon{flex:0 0 auto}.zt-md-image-upload-hint-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.zt-md-image-upload-reselect-hint[data-placeholder=true]{visibility:hidden}.zt-md-image-upload-url{display:flex;flex-direction:column;gap:8px}.zt-md-image-upload-label{color:var(--zt-fg);font-size:14px;font-weight:500;line-height:1.4}.zt-md-image-upload-alt{display:flex;flex-direction:column;gap:8px;margin-top:12px}.zt-md-image-upload-url-input,.zt-md-image-upload-alt-input{width:100%;border:1px solid color-mix(in srgb,var(--zt-border) 84%,var(--zt-surface));border-radius:var(--zt-radius);background:var(--zt-surface);color:var(--zt-fg);font:inherit;font-size:14px;line-height:1.4;outline:none;padding:9px 12px;transition:border-color .2s,box-shadow .2s}.zt-md-image-upload-url-input:focus,.zt-md-image-upload-alt-input:focus{border-color:color-mix(in srgb,var(--zt-primary) 58%,var(--zt-border));box-shadow:0 0 0 3px color-mix(in srgb,var(--zt-primary) 14%,transparent)}.zt-md-image-upload-url-input::placeholder,.zt-md-image-upload-alt-input::placeholder{color:var(--zt-muted)}.zt-md-image-upload-url-input:disabled,.zt-md-image-upload-alt-input:disabled{cursor:not-allowed;opacity:.75}.zt-md-image-upload-url-preview{height:240px;overflow:hidden;border:1px solid color-mix(in srgb,var(--zt-border) 84%,var(--zt-surface));border-radius:var(--zt-radius);background:color-mix(in srgb,var(--zt-muted) 6%,var(--zt-surface))}.zt-md-image-upload-dialog-footer{display:flex;justify-content:flex-end;align-items:center;margin:0 -24px;gap:8px;border-top:1px solid color-mix(in srgb,var(--zt-border) 72%,var(--zt-surface));border-radius:0;background:var(--zt-surface);padding:12px 24px 16px}.zt-md-image-upload-dialog-cancel,.zt-md-image-upload-dialog-confirm{display:inline-flex;align-items:center;justify-content:center;min-width:62px;height:36px;border:1px solid transparent;border-radius:var(--zt-radius);padding:0 16px;font:inherit;font-size:14px;font-weight:500;cursor:pointer}.zt-md-image-upload-dialog-cancel{border-color:color-mix(in srgb,var(--zt-border) 84%,var(--zt-surface));background:var(--zt-surface);color:var(--zt-fg)}.zt-md-image-upload-dialog-cancel:hover{background:color-mix(in srgb,var(--zt-muted) 8%,var(--zt-surface))}.zt-md-image-upload-dialog-confirm{background:var(--zt-primary);color:var(--zt-primary-foreground)}.zt-md-image-upload-dialog-confirm:hover:not(:disabled){background:color-mix(in srgb,var(--zt-primary) 88%,var(--zt-fg))}.zt-md-image-upload-dialog-confirm:disabled{background:color-mix(in srgb,var(--zt-fg) 48%,var(--zt-surface));color:color-mix(in srgb,var(--zt-primary-foreground) 72%,transparent);cursor:not-allowed}@keyframes zt-md-image-upload-spin{0%{transform:rotate(0)}to{transform:rotate(360deg)}}@media (max-width: 640px){.zt-md-image-upload-content-shell{max-height:95vh;padding:20px 20px 0}.zt-md-image-upload-dialog-title{padding-right:48px}.zt-md-image-upload-dialog-close{width:44px;height:44px}.zt-md-image-upload-content{padding:6px 0 20px}.zt-md-image-upload-file-label{min-height:200px;padding:32px 16px}.zt-md-image-upload-file-preview,.zt-md-image-upload-url-preview{height:200px}.zt-md-image-upload-dialog-footer{margin:0 -20px;padding:12px 20px 16px}}@media (max-width: 767px){.zt-md-image-upload-segment,.zt-md-image-upload-url-input,.zt-md-image-upload-alt-input,.zt-md-image-upload-dialog-cancel,.zt-md-image-upload-dialog-confirm{min-height:44px}}", Gp = "zt-md-image-upload-dialog-styles", ei = (e) => {
  vl(Gp, qp);
  const t = Cl(e.portalContainer, "zt-md-image-upload-host");
  let n = !1, o = !1;
  const r = () => {
    queueMicrotask(() => {
      var i, s;
      t.remove(), (!n || o) && ((s = (i = e.view) == null ? void 0 : i.focus) == null || s.call(i));
    });
  };
  Vp({
    container: t,
    config: e.imageUpload ?? {},
    messages: e.messages,
    onConfirm: (i, s, a) => {
      n = !0, o = Yr(e.view, { src: i, alt: s, title: "" });
    },
    onClose: r
  }).open();
}, $t = "meditorSpan", Xp = "color", Yp = "highlight", Zp = /^<(span|mark)\s+style="\s*(color|background-color)\s*:\s*([^";]+?)\s*;?\s*"?>$/i, Jp = /^<mark>$/i, Qp = /^<\/(span|mark)>$/i, ef = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)$/i, tf = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, Ft = (e) => {
  const t = e.trim(), n = ef.exec(t);
  if (n) {
    const o = n[1], r = n[2], i = n[3];
    if (!o || !r || !i)
      return "";
    const s = (a) => Math.max(0, Math.min(255, Number.parseInt(a, 10))).toString(16).padStart(2, "0");
    return `#${s(o)}${s(r)}${s(i)}`;
  }
  return tf.test(t) ? t.toLowerCase() : "";
}, nf = [
  { messageKey: "colorNameGray", value: "#787774" },
  { messageKey: "colorNameBrown", value: "#9f6b53" },
  { messageKey: "colorNameOrange", value: "#d9730d" },
  { messageKey: "colorNameYellow", value: "#cb912f" },
  { messageKey: "colorNameGreen", value: "#448361" },
  { messageKey: "colorNameBlue", value: "#337ea9" },
  { messageKey: "colorNamePurple", value: "#9065b0" },
  { messageKey: "colorNamePink", value: "#c14c8a" },
  { messageKey: "colorNameRed", value: "#d44c47" }
], of = [
  { messageKey: "colorNameGray", value: "#f1f1ef" },
  { messageKey: "colorNameBrown", value: "#f4eeee" },
  { messageKey: "colorNameOrange", value: "#faebdd" },
  { messageKey: "colorNameYellow", value: "#fbf3db" },
  { messageKey: "colorNameGreen", value: "#edf3ec" },
  { messageKey: "colorNameBlue", value: "#e7f3f8" },
  { messageKey: "colorNamePurple", value: "#f6f3f9" },
  { messageKey: "colorNamePink", value: "#faf1f5" },
  { messageKey: "colorNameRed", value: "#fdebec" }
], ti = "#fbf3db", rf = (e) => e === "highlight" ? "background-color" : "color", sf = (e, t, n, o) => {
  const r = e.data ?? {}, i = Ft(String(r.color ?? ""));
  if (!i) {
    const l = n.enter($t), c = n.containerPhrasing(e, { before: "", after: "" });
    return l(), c;
  }
  const s = n.enter($t), a = n.containerPhrasing(e, { before: "<", after: ">" });
  return s(), `<span style="${rf(r.kind)}: ${i}">${a}</span>`;
}, xl = (e) => {
  const t = [], n = [], o = (r) => {
    const i = n[n.length - 1];
    i ? i.collected.push(r) : t.push(r);
  };
  for (const r of e) {
    if (r.type === "html" && typeof r.value == "string") {
      const i = r.value.trim(), s = Zp.exec(i);
      if (s) {
        const a = s[2], l = s[3];
        if (a && l) {
          n.push({
            kind: a.toLowerCase() === "background-color" ? "highlight" : "color",
            color: Ft(l),
            collected: []
          });
          continue;
        }
      }
      if (Jp.test(i)) {
        n.push({ kind: "highlight", color: ti, collected: [] });
        continue;
      }
      if (Qp.test(i) && n.length > 0) {
        const a = n.pop();
        a && a.collected.length > 0 && o({
          type: $t,
          data: { kind: a.kind, color: a.color },
          children: a.collected
        });
        continue;
      }
    }
    Array.isArray(r.children) && r.type !== $t && (r.children = xl(r.children)), o(r);
  }
  for (; n.length > 0; ) {
    const r = n.pop();
    r && t.push(...r.collected);
  }
  return t;
}, af = function() {
  const t = this.data();
  return (t.toMarkdownExtensions ?? (t.toMarkdownExtensions = [])).push({ handlers: { [$t]: sf } }), (o) => {
    Array.isArray(o.children) && (o.children = xl(o.children));
  };
}, lf = We("remarkMeditorSpan", () => af), Ks = (e, t) => {
  if (e.type !== $t)
    return !1;
  const n = e.data ?? {};
  return (n.kind ?? "color") !== t || typeof n.color != "string" || n.color === "" ? !1 : n.color;
}, Sl = (e, t) => Ka(e, () => ({
  attrs: {
    color: { default: "", validate: "string" }
  },
  // 编辑器渲染与自身粘贴回读:data-* 保底 + style 即视觉。
  parseDOM: [
    {
      tag: "span[style]",
      getAttrs: (n) => {
        const o = n, r = t === "highlight" ? o.style.backgroundColor : o.style.color;
        return r ? { color: Ft(r) } : !1;
      }
    }
  ],
  toDOM: (n) => {
    const o = Ft(String(n.attrs.color ?? "")), r = o ? t === "highlight" ? `background-color: ${o};` : `color: ${o};` : "";
    return [
      "span",
      t === "highlight" ? { "data-highlight": o, style: r } : { "data-color": o, style: r }
    ];
  },
  parseMarkdown: {
    match: (n) => Ks(n, t) !== !1,
    runner: (n, o, r) => {
      const i = Ks(o, t);
      n.openMark(r, { color: typeof i == "string" ? i : "" }), n.next(o.children ?? []), n.closeMark(r);
    }
  },
  toMarkdown: {
    match: (n) => n.type.name === e,
    runner: (n, o) => {
      n.withMark(o, $t, void 0, {
        data: { kind: t, color: Ft(String(o.attrs.color ?? "")) }
      });
    }
  }
})), cf = Sl(Xp, "color"), df = Sl(Yp, "highlight"), uf = [lf, cf, df].flat(), Ws = (e, t, n) => {
  const { from: o, to: r } = e.state.selection, i = e.state.tr.removeMark(o, r, t);
  n && i.addMark(o, r, t.create({ color: Ft(n) })), e.dispatch(i.scrollIntoView()), e.focus();
}, hf = (e, t) => {
  const { from: n, to: o } = e.selection;
  let r = null;
  return e.doc.nodesBetween(n, o, (i) => {
    const s = i.marks.find((a) => a.type === t);
    return s ? (r = Ft(String(s.attrs.color ?? "")), !1) : !0;
  }), r;
}, ft = "callout", xo = ["note", "tip", "important", "warning", "caution"], hn = (e) => typeof e == "string" && xo.includes(e), mf = (e) => (hn(e) ? e : "note").toUpperCase(), pf = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*([^\n]*)/i, ff = (e) => {
  var u, h;
  const t = (u = e.children) == null ? void 0 : u[0];
  if (!t || t.type !== "paragraph")
    return null;
  const n = (h = t.children) == null ? void 0 : h[0];
  if (!n || n.type !== "text" || typeof n.value != "string")
    return null;
  const o = pf.exec(n.value);
  if (!o)
    return null;
  const r = o[1], i = o[2];
  if (!r)
    return null;
  const s = r.toLowerCase(), a = (i ?? "").trim(), l = a.length > 0 ? a : "", c = n.value, d = c.indexOf(`
`);
  return n.value = d >= 0 ? c.slice(d + 1) : "", {
    ...e,
    type: ft,
    data: { kind: s, title: l }
  };
}, Mr = (e) => {
  const t = e.children;
  if (Array.isArray(t))
    for (let n = 0; n < t.length; n += 1) {
      const o = t[n];
      if (o) {
        if (o.type === "blockquote") {
          Mr(o);
          const r = ff(o);
          r && (t[n] = r);
          continue;
        }
        Mr(o);
      }
    }
}, gf = We("remarkCallout", () => () => (t) => {
  Mr(t);
}), bf = Ke(ft, () => ({
  group: "block",
  content: "block+",
  defining: !0,
  attrs: {
    kind: { default: "note", validate: "string" },
    title: { default: "", validate: "string" }
  },
  parseDOM: [
    {
      tag: `div[data-type="${ft}"]`,
      getAttrs: (e) => {
        const t = e;
        return {
          kind: hn(t.dataset.kind) ? t.dataset.kind : "note",
          title: t.dataset.title ?? ""
        };
      }
    }
  ],
  toDOM: (e) => {
    const t = hn(e.attrs.kind) ? e.attrs.kind : "note", n = {
      "data-type": ft,
      "data-kind": t,
      class: "zt-md-callout"
    };
    return e.attrs.title && (n["data-title"] = String(e.attrs.title)), ["div", n, 0];
  },
  parseMarkdown: {
    match: (e) => e.type === ft,
    runner: (e, t, n) => {
      const o = t.data ?? {};
      e.openNode(n, {
        kind: hn(o.kind) ? o.kind : "note",
        title: typeof o.title == "string" ? o.title : ""
      }), e.next(t.children ?? []), e.closeNode();
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === ft,
    runner: (e, t) => {
      const n = mf(String(t.attrs.kind ?? "note")), o = String(t.attrs.title ?? "").trim(), r = `[!${n}]${o ? ` ${o}` : ""}`;
      e.openNode("blockquote");
      const i = t.firstChild;
      i !== null && (i == null ? void 0 : i.type.name) === "paragraph" && i ? (e.openNode("paragraph"), e.addNode("text", void 0, `${r}
`), i.forEach((a) => {
        e.next(a);
      }), e.closeNode(), t.forEach((a, l, c) => {
        c >= 1 && e.next(a);
      })) : (e.openNode("paragraph"), e.addNode("text", void 0, r), e.closeNode(), t.forEach((a) => {
        e.next(a);
      })), e.closeNode();
    }
  }
})), yf = [gf, bf].flat(), kf = (e) => `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`, wf = {
  // info 圆圈。
  note: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  // 灯泡。
  tip: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/>',
  // 对话气泡。
  important: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  // 三角警示。
  warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
  // 八角警示。
  caution: '<rect width="16" height="16" x="4" y="4" rx="2"/><path d="M12 16v-4M12 8h.01"/>'
}, Us = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable, vf = (e) => typeof e != "function" ? null : e();
class Cf {
  /**
   * 初始化标注块视图。
   */
  constructor(t, n, o, r) {
    // 当前节点快照。
    m(this, "node");
    // 节点根容器。
    m(this, "dom");
    // 内容区(ProseMirror 块孩子渲染宿主)。
    m(this, "contentDOM");
    // 编辑器视图。
    m(this, "view");
    // 节点位置获取器。
    m(this, "getPos");
    // 头部行(kind 按钮 + 标题)。
    m(this, "headerElement");
    // kind 循环按钮。
    m(this, "kindButton");
    // 自定义标题展示元素。
    m(this, "titleElement");
    // kind 按钮提示文案表(按当前 attrs 取)。
    m(this, "kindLabels");
    // 按钮无障碍文案模板。
    m(this, "kindButtonAriaTemplate");
    /**
     * 响应 kind 按钮点击:循环切换标注类型。
     */
    m(this, "handleKindClick", (t) => {
      if (t.preventDefault(), t.stopPropagation(), !Us(this.view))
        return;
      const n = vf(this.getPos);
      if (n === null)
        return;
      const o = hn(this.node.attrs.kind) ? this.node.attrs.kind : "note", r = xo.indexOf(o), i = xo[(r + 1) % xo.length], s = this.view.state.tr.setNodeMarkup(n, void 0, {
        ...this.node.attrs,
        kind: i
      });
      this.view.dispatch(s);
    });
    this.node = t, this.view = n, this.getPos = o, this.kindLabels = {
      note: r.calloutKindNote,
      tip: r.calloutKindTip,
      important: r.calloutKindImportant,
      warning: r.calloutKindWarning,
      caution: r.calloutKindCaution
    }, this.kindButtonAriaTemplate = r.calloutKindButtonAriaLabel, this.dom = document.createElement("div"), this.dom.dataset.type = ft, this.dom.className = "zt-md-callout", this.headerElement = document.createElement("div"), this.headerElement.className = "zt-md-callout-header", this.headerElement.contentEditable = "false", this.kindButton = document.createElement("button"), this.kindButton.type = "button", this.kindButton.className = "zt-md-callout-kind", this.kindButton.addEventListener("click", this.handleKindClick), this.titleElement = document.createElement("span"), this.titleElement.className = "zt-md-callout-title", this.headerElement.append(this.kindButton, this.titleElement), this.contentDOM = document.createElement("div"), this.contentDOM.className = "zt-md-callout-content", this.dom.append(this.headerElement, this.contentDOM), this.syncFromNode(t);
  }
  /**
   * 从节点快照同步视图。
   */
  syncFromNode(t) {
    const n = hn(t.attrs.kind) ? t.attrs.kind : "note", o = typeof t.attrs.title == "string" ? t.attrs.title.trim() : "";
    this.dom.dataset.kind = n, this.dom.dataset.editable = Us(this.view) ? "true" : "false", this.kindButton.innerHTML = kf(wf[n]), this.kindButton.title = this.kindLabels[n], this.kindButton.setAttribute("aria-label", `${this.kindButtonAriaTemplate}(${this.kindLabels[n]})`), this.titleElement.textContent = o, this.titleElement.style.display = o ? "" : "none";
  }
  /**
   * 处理节点更新。
   */
  update(t) {
    return t.type.name !== ft ? !1 : (this.node = t, this.syncFromNode(t), !0);
  }
  /**
   * 只拦截 kind 按钮事件(头部其余为静态展示)。
   */
  stopEvent(t) {
    const n = t.target;
    return n instanceof Node ? this.kindButton.contains(n) : !1;
  }
  /**
   * 内容区变更交给 ProseMirror 观察,头部自身变更忽略。
   */
  ignoreMutation(t) {
    const n = t.target;
    return !(this.contentDOM.contains(n) || this.contentDOM === n);
  }
  /**
   * 销毁时解绑监听器。
   */
  destroy() {
    this.kindButton.removeEventListener("click", this.handleKindClick);
  }
}
const Ef = (e) => (t, n, o) => {
  const r = typeof o == "function" ? () => {
    const i = o();
    return typeof i == "number" ? i : 0;
  } : !1;
  return new Cf(t, n, r, e);
}, ct = "toggle", zf = /^<details(\s[^>]*)?>\s*(?:\n\s*)?$/i, Mf = /^<details(\s[^>]*)?>\s*(?:\n\s*)?<summary>([\s\S]*?)<\/summary>\s*$/i, Tf = /^<summary>([\s\S]*?)<\/summary>\s*$/i, xf = /^<\/details>\s*$/i, ni = (e) => {
  if (e.type === "html" && typeof e.value == "string")
    return e.value;
  if (e.type === "paragraph" && Array.isArray(e.children) && e.children.length === 1) {
    const t = e.children[0];
    if (t && t.type === "html" && typeof t.value == "string")
      return t.value;
  }
  return null;
}, Sf = (e) => {
  const t = ni(e);
  if (t === null)
    return null;
  const n = Mf.exec(t.trim());
  return n ? { summary: n[2] ?? "" } : zf.test(t.trim()) ? { summary: null } : null;
}, Lf = (e) => {
  const t = ni(e);
  if (t === null)
    return null;
  const n = Tf.exec(t.trim());
  return n ? n[1] ?? "" : null;
}, Af = (e) => {
  const t = ni(e);
  return t !== null && xf.test(t.trim());
}, Ll = (e) => {
  const t = [];
  for (let n = 0; n < e.length; n += 1) {
    const o = e[n];
    if (!o)
      continue;
    const r = Sf(o);
    if (r) {
      const i = [];
      let s = -1, a = r.summary;
      for (let l = n + 1; l < e.length; l += 1) {
        const c = e[l];
        if (c) {
          if (Af(c)) {
            s = l;
            break;
          }
          if (a === null) {
            const d = Lf(c);
            if (d !== null) {
              a = d;
              continue;
            }
          }
          i.push(c);
        }
      }
      if (s < 0) {
        t.push(o);
        continue;
      }
      t.push({
        type: ct,
        data: { summary: a ?? "" },
        children: i
      }), n = s;
      continue;
    }
    Array.isArray(o.children) && o.type !== ct && (o.children = Ll(o.children)), t.push(o);
  }
  return t;
}, If = We("remarkToggle", () => () => (t) => {
  Array.isArray(t.children) && (t.children = Ll(t.children));
}), Rf = Ke(ct, () => ({
  group: "block",
  content: "block+",
  defining: !0,
  attrs: {
    summary: { default: "", validate: "string" }
  },
  parseDOM: [
    {
      tag: `div[data-type="${ct}"]`,
      getAttrs: (e) => ({ summary: e.dataset.summary ?? "" })
    }
  ],
  toDOM: (e) => [
    "div",
    {
      "data-type": ct,
      "data-summary": String(e.attrs.summary ?? ""),
      class: "zt-md-toggle"
    },
    0
  ],
  parseMarkdown: {
    match: (e) => e.type === ct,
    runner: (e, t, n) => {
      const o = t.data ?? {};
      e.openNode(n, {
        summary: typeof o.summary == "string" ? o.summary : ""
      }), e.next(t.children ?? []), e.closeNode();
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === ct,
    runner: (e, t) => {
      const n = String(t.attrs.summary ?? "");
      e.addNode("html", void 0, `<details>
<summary>${n}</summary>`), t.forEach((o) => {
        e.next(o);
      }), e.addNode("html", void 0, "</details>");
    }
  }
})), Nf = [If, Rf].flat(), Pf = 400, Df = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>', Vs = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable, Bf = (e) => typeof e != "function" ? null : e();
class _f {
  /**
   * 初始化折叠块视图。
   */
  constructor(t, n, o, r) {
    // 当前节点快照。
    m(this, "node");
    // 节点根容器。
    m(this, "dom");
    // 内容区(ProseMirror 块孩子渲染宿主)。
    m(this, "contentDOM");
    // 编辑器视图。
    m(this, "view");
    // 节点位置获取器。
    m(this, "getPos");
    // 头部行(折叠按钮 + 标题编辑)。
    m(this, "headerElement");
    // 折叠切换按钮。
    m(this, "foldButton");
    // 标题编辑元素。
    m(this, "summaryElement");
    // 标题提交防抖定时器。
    m(this, "summaryCommitTimer", null);
    /**
     * 响应折叠按钮点击:切换运行时展开状态(不产生事务)。
     */
    m(this, "handleFoldClick", (t) => {
      t.preventDefault(), t.stopPropagation(), this.dom.dataset.open = this.dom.dataset.open === "true" ? "false" : "true";
    });
    /**
     * 响应标题输入:防抖后写回节点 summary 属性。
     */
    m(this, "handleSummaryInput", () => {
      this.summaryCommitTimer !== null && window.clearTimeout(this.summaryCommitTimer), this.summaryCommitTimer = window.setTimeout(() => {
        this.summaryCommitTimer = null, this.commitSummary();
      }, Pf);
    });
    /**
     * 响应标题失焦:立即提交。
     */
    m(this, "handleSummaryBlur", () => {
      this.clearSummaryCommitTimer(), this.commitSummary();
    });
    /**
     * 响应标题内按键:Enter/Escape 提交并退出(标题保持单行)。
     */
    m(this, "handleSummaryKeyDown", (t) => {
      t.key !== "Enter" && t.key !== "Escape" || (t.preventDefault(), t.stopPropagation(), this.summaryElement.blur());
    });
    this.node = t, this.view = n, this.getPos = o, this.dom = document.createElement("div"), this.dom.dataset.type = ct, this.dom.dataset.open = "true", this.dom.className = "zt-md-toggle", this.headerElement = document.createElement("div"), this.headerElement.className = "zt-md-toggle-header", this.headerElement.contentEditable = "false", this.foldButton = document.createElement("button"), this.foldButton.type = "button", this.foldButton.className = "zt-md-toggle-fold", this.foldButton.innerHTML = Df, this.foldButton.addEventListener("click", this.handleFoldClick), this.summaryElement = document.createElement("div"), this.summaryElement.className = "zt-md-toggle-summary", this.summaryElement.dataset.placeholder = r.toggleSummaryPlaceholder, this.summaryElement.setAttribute("aria-label", r.toggleSummaryAriaLabel), this.summaryElement.contentEditable = "true", this.summaryElement.addEventListener("input", this.handleSummaryInput), this.summaryElement.addEventListener("blur", this.handleSummaryBlur), this.summaryElement.addEventListener("keydown", this.handleSummaryKeyDown), this.headerElement.append(this.foldButton, this.summaryElement), this.contentDOM = document.createElement("div"), this.contentDOM.className = "zt-md-toggle-content", this.dom.append(this.headerElement, this.contentDOM), this.syncFromNode(t);
  }
  /**
   * 清理标题提交防抖定时器。
   */
  clearSummaryCommitTimer() {
    this.summaryCommitTimer !== null && (window.clearTimeout(this.summaryCommitTimer), this.summaryCommitTimer = null);
  }
  /**
   * 把标题文本提交到节点 summary 属性(文本未变化时不产生事务)。
   */
  commitSummary() {
    var i;
    if (!Vs(this.view))
      return;
    const t = Bf(this.getPos);
    if (t === null)
      return;
    const n = ((i = this.summaryElement.textContent) == null ? void 0 : i.trim()) ?? "", o = typeof this.node.attrs.summary == "string" ? this.node.attrs.summary : "";
    if (n === o)
      return;
    const r = this.view.state.tr.setNodeMarkup(t, void 0, {
      ...this.node.attrs,
      summary: n
    });
    this.view.dispatch(r);
  }
  /**
   * 从节点快照同步视图。
   */
  syncFromNode(t) {
    const n = typeof t.attrs.summary == "string" ? t.attrs.summary : "", o = Vs(this.view);
    this.dom.dataset.editable = o ? "true" : "false", this.summaryElement.contentEditable = o ? "true" : "false", document.activeElement !== this.summaryElement && (this.summaryElement.textContent ?? "") !== n && (this.summaryElement.textContent = n);
  }
  /**
   * 处理节点更新。
   */
  update(t) {
    return t.type.name !== ct ? !1 : (this.node = t, this.syncFromNode(t), !0);
  }
  /**
   * 只拦截头部行事件(标题编辑与折叠按钮由 NodeView 自理)。
   */
  stopEvent(t) {
    const n = t.target;
    return n instanceof Node ? this.headerElement.contains(n) : !1;
  }
  /**
   * 内容区变更交给 ProseMirror 观察,头部自身变更忽略。
   */
  ignoreMutation(t) {
    const n = t.target;
    return !(this.contentDOM.contains(n) || this.contentDOM === n);
  }
  /**
   * 销毁时解绑监听器。
   */
  destroy() {
    this.clearSummaryCommitTimer(), this.foldButton.removeEventListener("click", this.handleFoldClick), this.summaryElement.removeEventListener("input", this.handleSummaryInput), this.summaryElement.removeEventListener("blur", this.handleSummaryBlur), this.summaryElement.removeEventListener("keydown", this.handleSummaryKeyDown);
  }
}
const Of = (e) => (t, n, o) => {
  const r = typeof o == "function" ? () => {
    const i = o();
    return typeof i == "number" ? i : 0;
  } : !1;
  return new _f(t, n, r, e);
}, ut = "jsondata-view:", $o = ["table", "kanban", "gantt", "calendar", "list", "gallery", "text"], Tr = (e) => `${ut}${e}`, Hf = $o.map(Tr), qs = (e) => e.startsWith(ut) ? Al(e.slice(ut.length)) : null, Al = (e) => {
  const t = e.trim().toLowerCase();
  if (t === "meditor-db")
    return "table";
  const n = t.startsWith(ut) ? t.slice(ut.length) : t;
  return $o.includes(n) ? n : null;
}, Il = (e) => {
  const t = e.children;
  if (Array.isArray(t))
    for (let n = 0; n < t.length; n += 1) {
      const o = t[n];
      if (o) {
        if (o.type === "code" && typeof o.lang == "string") {
          const r = Al(o.lang);
          if (r) {
            t[n] = {
              type: `${ut}${r}`,
              value: typeof o.value == "string" ? o.value : ""
            };
            continue;
          }
        }
        Il(o);
      }
    }
}, Ff = We("remarkJsondataView", () => () => (t) => {
  Il(t);
}), $f = (e) => ({
  group: "block",
  atom: !0,
  isolating: !0,
  // 注意:不设 draggable——同 mtable,避免块内交互误触发浏览器拖拽。
  attrs: {
    value: {
      default: ""
    }
  },
  parseDOM: [
    {
      tag: `div[data-type="${e}"]`,
      getAttrs: (t) => {
        var o;
        return {
          value: ((o = t.dataset) == null ? void 0 : o.value) ?? ""
        };
      }
    }
  ],
  toDOM: (t) => {
    const n = String(t.attrs.value ?? ""), o = document.createElement("div");
    o.dataset.type = e, o.dataset.value = n, o.className = "zt-md-jsondata-view-block";
    const r = document.createElement("pre");
    return r.textContent = n, o.appendChild(r), o;
  },
  parseMarkdown: {
    match: ({ type: t }) => t === e,
    runner: (t, n, o) => {
      const r = String(n.value ?? "");
      t.addNode(o, { value: r });
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === e,
    runner: (t, n) => {
      const o = String(n.attrs.value ?? "");
      t.addNode("code", void 0, o, { lang: e });
    }
  }
}), jf = (e) => Ke(Tr(e), () => $f(Tr(e))), Kf = $o.map((e) => jf(e)), Wf = [
  ...Ff,
  ...Kf.flatMap((e) => [e[0], e[1]])
], Uf = 2, Vf = "var(--zt-primary)", qf = ue(() => uu({
  color: Vf,
  width: Uf
})), Gf = ue(() => Vd()), yn = -1, oi = 1, Xf = /* @__PURE__ */ new Set([
  "math_block",
  "code_block",
  "table",
  "media_embed",
  "hr",
  "csvdata"
]), ri = (e) => Xf.has(e) || e.startsWith("jsondata-view:"), Rl = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable, Yf = (e, t, n) => {
  const o = e.state.doc.resolve(t);
  return kr.valid(o) ? new kr(o) : de.near(o, n);
}, Zf = (e, t) => t === yn ? e.nodeBefore !== null : e.nodeAfter !== null, ii = (e, t) => {
  const n = e.state.schema.nodes.paragraph;
  if (!n)
    return !1;
  const o = e.state.doc.resolve(t), r = o.index();
  if (!o.parent.canReplaceWith(r, r, n))
    return !1;
  const i = n.createAndFill();
  if (!i)
    return !1;
  const s = e.state.tr.insert(t, i), a = t + 1;
  return s.setSelection(de.near(s.doc.resolve(a), 1)).scrollIntoView(), e.dispatch(s), e.focus(), !0;
}, xr = (e, t, n, o) => {
  if (!ri(n.type.name))
    return !1;
  const r = o === yn ? t : t + n.nodeSize;
  if (r < 0 || r > e.state.doc.content.size)
    return !1;
  const i = e.state.doc.resolve(r);
  if (!Zf(i, o) && ii(e, r))
    return !0;
  const s = e.state.tr.setSelection(Yf(e, r, o)).scrollIntoView();
  return e.dispatch(s), e.focus(), !0;
}, Jf = (e) => {
  for (let t = e.depth; t > 0; t -= 1) {
    const n = e.node(t);
    if (ri(n.type.name))
      return {
        node: n,
        position: e.before(t),
        depth: t
      };
  }
  return null;
}, Nl = (e, t, n) => {
  for (let o = t; o < e.depth; o += 1) {
    const r = e.node(o), i = e.index(o), s = n === yn ? 0 : r.childCount - 1;
    if (i !== s)
      return !1;
  }
  return !0;
}, Pl = (e, t) => {
  const { selection: n } = e.state;
  if (n instanceof Ae)
    return xr(e, n.from, n.node, t);
  if (!n.empty)
    return !1;
  const o = Jf(n.$from);
  return !o || !Nl(n.$from, o.depth, t) || !e.endOfTextblock(
    t === yn ? "up" : "down"
  ) ? !1 : xr(
    e,
    o.position,
    o.node,
    t
  );
}, Qf = (e) => {
  const { doc: t, selection: n } = e.state;
  return !(n instanceof de) || !n.empty || !(n.$from.after(1) === t.content.size && Nl(n.$from, 1, oi)) || !e.endOfTextblock("down") ? !1 : ii(e, t.content.size);
}, eg = (e) => Pl(e, yn), tg = (e) => {
  const { selection: t } = e.state;
  return !(t instanceof Ae) || !ri(t.node.type.name) ? !1 : ii(e, t.from + t.node.nodeSize);
}, ng = (e) => Pl(e, oi) || Qf(e), og = {
  ArrowUp: eg,
  ArrowDown: ng,
  Enter: tg
}, rg = (e, t) => t.defaultPrevented || t.altKey || t.ctrlKey || t.metaKey || t.shiftKey || !Rl(e), si = (e, t, n, o) => {
  const r = o === "ArrowUp" ? yn : o === "ArrowDown" ? oi : null;
  return r === null || !Rl(e) ? !1 : xr(e, t, n, r);
}, ig = ue(() => new ye({
  key: new ke("zt-md-block-boundary-navigation"),
  props: {
    handleKeyDown: (e, t) => {
      const n = og[t.key];
      if (!n || rg(e, t))
        return !1;
      const o = n(e);
      return o && t.preventDefault(), o;
    }
  }
})), Gs = (e) => e ? e.type.name !== "paragraph" && e.type.name !== "heading" : !1, sg = ue(() => {
  const e = new ke("zt-md-trailing-paragraph");
  return new ye({
    key: e,
    state: {
      init: (n, o) => Gs(o.doc.lastChild),
      apply: (n, o) => n.docChanged ? Gs(n.doc.lastChild) : o
    },
    appendTransaction: (n, o, r) => {
      if (!e.getState(r))
        return null;
      const i = r.schema.nodes.paragraph;
      if (!i)
        return null;
      const s = i.createAndFill();
      return s ? r.tr.insert(r.doc.content.size, s) : null;
    }
  });
}), ag = /Mac|iPhone|iPad|iPod/, Yn = () => {
  if (typeof navigator > "u")
    return !1;
  const e = navigator.userAgentData;
  return typeof (e == null ? void 0 : e.platform) == "string" && e.platform.length > 0 ? /mac|iphone|ipad|ipod/i.test(e.platform) : ag.test(navigator.userAgent);
}, mo = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable, nr = (e) => typeof e != "function" ? null : e();
class lg {
  /**
   * 初始化视图。
   */
  constructor(t, n, o, r) {
    // 当前节点快照。
    m(this, "node");
    // 节点根容器。
    m(this, "dom");
    // 编辑器视图。
    m(this, "view");
    // 节点位置获取器。
    m(this, "getPos");
    // jsonview 渲染实例。
    m(this, "jsonview");
    // 挂载宿主。
    m(this, "host");
    // 当前视图种类(由节点名解析)。
    m(this, "viewKind");
    /**
     * jsonview 文档变更 → 写回节点 value attr(内容一致时跳过,防回环)。
     */
    m(this, "handleDocChange", (t, n) => {
      const o = nr(this.getPos);
      if (o === null || String(this.node.attrs.value ?? "") === t)
        return;
      const r = this.view.state.tr.setNodeMarkup(o, void 0, {
        ...this.node.attrs,
        value: t
      });
      (n === "undo" || n === "redo") && r.setMeta("addToHistory", !1), r.docChanged && this.view.dispatch(r);
    });
    /**
     * 用户切换视图下拉 → 换节点类型(块名 jsondata-view:<kind> 随视图迁移,
     * 围栏 lang 序列化自动跟随;value 保留)。
     */
    m(this, "handleViewKindChange", (t) => {
      this.viewKind = t;
      const n = nr(this.getPos);
      if (n === null)
        return;
      const o = `${ut}${t}`;
      if (this.node.type.name === o)
        return;
      const r = this.view.state.schema.nodes[o];
      r && this.view.dispatch(this.view.state.tr.setNodeMarkup(n, r, { ...this.node.attrs }));
    });
    this.node = t, this.view = n, this.getPos = o, this.viewKind = qs(t.type.name) ?? "table", this.dom = document.createElement("div"), this.dom.dataset.type = t.type.name, this.dom.className = "zt-md-jsondata-view-block", this.dom.dataset.editable = mo(n) ? "true" : "false", this.host = document.createElement("div"), this.host.className = "zt-md-jsondata-view-host", this.dom.appendChild(this.host), this.jsonview = Am({
      root: this.host,
      doc: String(t.attrs.value ?? ""),
      viewKind: this.viewKind,
      readOnly: !mo(n),
      locale: r,
      onChange: this.handleDocChange,
      onChangeViewKind: this.handleViewKindChange
    });
  }
  /**
   * 处理节点更新:外部变更(setMarkdown/受控回填)回填到视图。
   * 节点类型变化(块名迁移)时同步切换视图种类。
   */
  update(t) {
    if (!t.type.name.startsWith(ut))
      return !1;
    this.node = t, this.dom.dataset.type = t.type.name, this.dom.dataset.editable = mo(this.view) ? "true" : "false";
    const n = qs(t.type.name) ?? "table";
    n !== this.viewKind && (this.viewKind = n, this.jsonview.setViewKind(n));
    const o = String(t.attrs.value ?? "");
    return o !== this.jsonview.getDoc() && this.jsonview.setDoc(o), !0;
  }
  /**
   * 判断块内焦点是否处于指定方向的内容边界:
   * 上 = 焦点在首个可聚焦控件;下 = 焦点在末个可聚焦控件。
   * 多行文本域(文本视图的 JSON 编辑器)额外要求光标在值的首/末端点,避免编辑中途被劫持。
   */
  isFocusAtBlockBoundary(t) {
    const n = this.dom.ownerDocument.activeElement;
    if (!(n instanceof HTMLElement) || !this.dom.contains(n))
      return !1;
    const o = this.dom.querySelectorAll(
      "button, input, select, textarea, [tabindex]:not([tabindex='-1'])"
    ), r = Array.prototype.indexOf.call(o, n);
    if (r < 0 || (t === "ArrowUp" ? r !== 0 : r !== o.length - 1))
      return !1;
    if (n instanceof HTMLTextAreaElement) {
      const i = n.selectionStart === 0 && n.selectionEnd === 0, s = n.selectionStart === n.value.length && n.selectionEnd === n.value.length;
      return t === "ArrowUp" ? i : s;
    }
    return !0;
  }
  /**
   * 块内事件全部就地消费(输入控件/下拉/勾选不进 PM 管线);
   * Ctrl+Z / Ctrl+Shift+Z(或 Ctrl+Y)拦截分发给 jsonview 内部撤销栈;
   * ArrowUp/ArrowDown 在内容边界时移出块外(对齐 math_block 逃生做法)。
   */
  stopEvent(t) {
    const n = t.target;
    if (!(n instanceof Node) || !this.dom.contains(n))
      return !1;
    if (t.type === "keydown" && mo(this.view)) {
      const o = t, r = Yn(), i = r ? o.metaKey : o.ctrlKey;
      if (i && !o.altKey) {
        const s = o.key.toLowerCase(), a = s === "z" && !o.shiftKey, l = s === "z" && o.shiftKey || !r && s === "y";
        if (a && this.jsonview.canUndo())
          return o.preventDefault(), o.stopPropagation(), this.jsonview.undo(), !0;
        if (l && this.jsonview.canRedo())
          return o.preventDefault(), o.stopPropagation(), this.jsonview.redo(), !0;
      }
      if ((o.key === "ArrowDown" || o.key === "ArrowUp") && !i && !o.altKey && this.isFocusAtBlockBoundary(o.key)) {
        const s = nr(this.getPos);
        if (s !== null && si(this.view, s, this.node, o.key))
          return o.preventDefault(), o.stopPropagation(), !0;
      }
    }
    return !0;
  }
  /**
   * 忽略 NodeView 内部的 DOM 变更观察(DOM 视图自身管理)。
   */
  ignoreMutation() {
    return !0;
  }
  /**
   * 销毁 jsonview 实例。
   */
  destroy() {
    this.jsonview.destroy();
  }
}
const cg = (e = "zh-CN") => (t, n, o) => {
  const r = typeof o == "function" ? () => {
    const i = o();
    return typeof i == "number" ? i : 0;
  } : !1;
  return new lg(t, n, r, e);
}, nt = "media_embed", dg = ["video", "audio", "bookmark", "embed"], ug = 120, hg = 800, mg = /(?:^|;)\s*height\s*:\s*(\d+)\s*px/i, pg = /\bstyle\s*=\s*(["'])([^"']*)\1/i, mn = (e) => typeof e == "string" && dg.includes(e), fg = /^<(video|audio|iframe)\b[^>]*\ssrc="([^"]*)"[^>]*>$/i, gg = /^<a\s+[^>]*?href="([^"]*)"[^>]*class="meditor-bookmark"[^>]*>$/i, or = (e) => Kn(e.trim()) || null, Dt = (e) => Math.min(hg, Math.max(ug, Math.round(e))), Sr = (e) => {
  if (typeof e != "string")
    return 0;
  const t = mg.exec(e);
  if (!t)
    return 0;
  const n = Number(t[1]);
  return Number.isFinite(n) ? Dt(n) : 0;
}, bg = (e) => {
  if (typeof e != "string")
    return 0;
  const t = pg.exec(e);
  return t ? Sr(t[2]) : 0;
}, Dl = (e) => `height: ${Dt(e)}px;`, yg = (e, t, n = 0) => {
  const o = t.replace(/"/g, "&quot;"), r = (e === "video" || e === "embed") && n > 0 ? ` style="${Dl(n)}"` : "";
  switch (e) {
    case "video":
      return `<video src="${o}" controls${r}></video>`;
    case "audio":
      return `<audio src="${o}" controls></audio>`;
    case "bookmark":
      return `<a href="${o}" class="meditor-bookmark">${o}</a>`;
    case "embed":
      return `<iframe src="${o}"${r}></iframe>`;
    default:
      return "";
  }
}, Xs = (e, t, n) => {
  if (e !== "video" && e !== "embed")
    return { kind: e, src: t };
  const o = bg(n);
  return o > 0 ? { kind: e, src: t, height: o } : { kind: e, src: t };
}, rr = (e) => {
  if (e.type === "html" && typeof e.value == "string")
    return e.value;
  if (e.type === "paragraph" && Array.isArray(e.children) && e.children.length === 1) {
    const t = e.children[0];
    if (t && t.type === "html" && typeof t.value == "string")
      return t.value;
  }
  return null;
}, Bl = (e, t) => {
  var o, r, i, s, a;
  const n = [];
  for (let l = 0; l < e.length; l += 1) {
    const c = e[l];
    if (!c)
      continue;
    const d = rr(c), u = (d == null ? void 0 : d.trim()) ?? "", h = /^<(video|audio|iframe)\b/i.exec(u);
    if (h) {
      const y = /^<(video|audio|iframe)\b[^>]*\ssrc="([^"]*)"[^>]*>\s*<\/\1>$/i.exec(u), f = (o = h[1]) == null ? void 0 : o.toLowerCase(), w = y ? or(y[2] ?? "") : null;
      if (w) {
        const b = f === "video" ? "video" : f === "audio" ? "audio" : "embed";
        n.push({
          type: nt,
          data: Xs(b, w, u)
        });
        continue;
      }
    }
    const p = fg.exec(u);
    if (p) {
      const y = (r = p[1]) == null ? void 0 : r.toLowerCase(), f = or(p[2] ?? "");
      let w = -1;
      for (let b = l + 1; b < e.length; b += 1) {
        const k = e[b];
        if (!k)
          continue;
        const v = ((i = rr(k)) == null ? void 0 : i.trim()) ?? "";
        if (new RegExp(`^</${y}>$`, "i").test(v)) {
          w = b;
          break;
        }
      }
      if (f && w > l) {
        const b = y === "video" ? "video" : y === "audio" ? "audio" : "embed";
        n.push({
          type: nt,
          data: Xs(b, f, p[0] ?? "")
        }), l = w;
        continue;
      }
    }
    const g = gg.exec(u);
    if (g) {
      const y = or(g[1] ?? "");
      let f = -1;
      for (let w = l + 1; w < e.length; w += 1) {
        const b = e[w];
        if (!b)
          continue;
        const k = ((s = rr(b)) == null ? void 0 : s.trim()) ?? "";
        if (/^<\/a>$/i.test(k)) {
          f = w;
          break;
        }
      }
      if (y && f > l) {
        n.push({
          type: nt,
          data: { kind: "bookmark", src: y }
        }), l = f;
        continue;
      }
    }
    if (Array.isArray(c.children) && c.type !== nt && (c.children = Bl(c.children), c.type === "paragraph" && c.children.length === 1 && ((a = c.children[0]) == null ? void 0 : a.type) === nt)) {
      n.push(c.children[0]);
      continue;
    }
    n.push(c);
  }
  return n;
}, kg = (e) => We("remarkMediaEmbed", () => () => (n) => {
  Array.isArray(n.children) && (n.children = Bl(n.children));
}), wg = kg(), vg = Ke(nt, () => ({
  group: "block",
  atom: !0,
  isolating: !0,
  attrs: {
    kind: { default: "video", validate: "string" },
    src: { default: "", validate: "string" },
    // 内嵌 iframe 自定义高度(px;0 = 自动 16:9,仅 embed 种类使用)。
    height: { default: 0, validate: "number" }
  },
  parseDOM: [
    {
      tag: "video[src]",
      getAttrs: (e) => ({
        kind: "video",
        src: e.getAttribute("src") ?? "",
        height: Sr(e.getAttribute("style"))
      })
    },
    {
      tag: "audio[src]",
      getAttrs: (e) => ({ kind: "audio", src: e.getAttribute("src") ?? "" })
    },
    {
      tag: "iframe[src]",
      getAttrs: (e) => ({
        kind: "embed",
        src: e.getAttribute("src") ?? "",
        height: Sr(e.getAttribute("style"))
      })
    },
    {
      tag: "a.meditor-bookmark[href]",
      getAttrs: (e) => ({
        kind: "bookmark",
        src: e.getAttribute("href") ?? ""
      })
    }
  ],
  toDOM: (e) => {
    const t = mn(e.attrs.kind) ? e.attrs.kind : "video", n = String(e.attrs.src ?? "");
    if (t === "bookmark") {
      const r = document.createElement("a");
      return r.href = n, r.className = "meditor-bookmark", r.textContent = n, r;
    }
    const o = t === "audio" ? document.createElement("audio") : t === "embed" ? document.createElement("iframe") : document.createElement("video");
    if (o.setAttribute("src", n), o.setAttribute("controls", ""), t === "video" || t === "embed") {
      const r = typeof e.attrs.height == "number" ? e.attrs.height : 0;
      r > 0 && o.setAttribute("style", Dl(r));
    }
    return o;
  },
  parseMarkdown: {
    match: (e) => e.type === nt,
    runner: (e, t, n) => {
      const o = t.data ?? {};
      e.addNode(n, {
        kind: mn(o.kind) ? o.kind : "video",
        src: typeof o.src == "string" ? o.src : "",
        height: typeof o.height == "number" ? Dt(o.height) : 0
      });
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === nt,
    runner: (e, t) => {
      const n = mn(t.attrs.kind) ? t.attrs.kind : "video", o = String(t.attrs.src ?? ""), r = typeof t.attrs.height == "number" ? t.attrs.height : 0;
      o && e.addNode("html", void 0, yg(n, o, r));
    }
  }
})), Cg = [wg, vg].flat(), on = (e, t) => e(t.state, t.dispatch, t), Eg = (e, t) => {
  var o, r, i, s, a;
  const n = (r = (o = e == null ? void 0 : e.state) == null ? void 0 : o.selection) == null ? void 0 : r.$from;
  if (!n || !(e != null && e.dispatch))
    return !1;
  for (let l = n.depth; l > 0; l -= 1) {
    const c = n.node(l);
    if (((i = c == null ? void 0 : c.type) == null ? void 0 : i.name) !== "list_item")
      continue;
    const d = (a = (s = c.type) == null ? void 0 : s.spec) == null ? void 0 : a.attrs;
    if (!(d != null && d.checked))
      return !1;
    const u = n.before(l);
    return e.dispatch(
      e.state.tr.setNodeMarkup(u, void 0, {
        ...c.attrs,
        checked: t
      })
    ), !0;
  }
  return !1;
}, Ys = {
  heading1: 1,
  heading2: 2,
  heading3: 3,
  heading4: 4,
  heading5: 5,
  heading6: 6
}, Zs = {
  bulletList: "bullet_list",
  orderedList: "ordered_list"
}, zg = [
  "codeBlock",
  "heading1",
  "heading2",
  "heading3",
  "heading4",
  "heading5",
  "heading6",
  "taskList",
  "orderedList",
  "bulletList",
  "blockquote",
  "paragraph"
], jo = (e, t) => {
  if (!(e != null && e.state) || !(e != null && e.dispatch))
    return !1;
  const n = e.state.schema.nodes;
  if (t === "paragraph") {
    const o = n.paragraph;
    if (!o)
      return !1;
    const r = Dn(
      o
    );
    return on(r, e);
  }
  if (t in Ys) {
    const o = n.heading, r = Ys[t];
    if (!o || typeof r != "number")
      return !1;
    const i = Dn(
      o,
      { level: r }
    );
    return on(i, e);
  }
  if (t === "blockquote") {
    const o = n.blockquote;
    if (!o)
      return !1;
    const r = jr(o);
    return on(r, e);
  }
  if (t === "taskList") {
    const o = n.bullet_list;
    if (!o)
      return !1;
    const r = Yi(o);
    return on(r, e) ? Eg(e, !1) : !1;
  }
  if (t === "codeBlock") {
    const o = n.code_block;
    if (!o)
      return !1;
    const r = Dn(
      o,
      { language: "text" }
    );
    return on(r, e);
  }
  if (t in Zs) {
    const o = n[Zs[t]];
    if (!o)
      return !1;
    const r = Yi(o);
    return on(r, e);
  }
  return !1;
}, Ko = (e) => {
  var o, r;
  const t = e.state.selection.$from, n = /* @__PURE__ */ new Set();
  for (let i = t.depth; i > 0; i -= 1) {
    const s = t.node(i), a = s.type.name;
    if (a === "code_block") {
      n.add("codeBlock");
      continue;
    }
    if (a === "blockquote") {
      n.add("blockquote");
      continue;
    }
    if (a === "heading") {
      const l = Number(((o = s.attrs) == null ? void 0 : o.level) ?? 0), d = {
        1: "heading1",
        2: "heading2",
        3: "heading3",
        4: "heading4",
        5: "heading5",
        6: "heading6"
      }[l];
      d && n.add(d);
      continue;
    }
    if (a === "list_item") {
      typeof ((r = s.attrs) == null ? void 0 : r.checked) == "boolean" && n.add("taskList");
      continue;
    }
    if (a === "ordered_list") {
      n.add("orderedList");
      continue;
    }
    if (a === "bullet_list") {
      n.add("bulletList");
      continue;
    }
    a === "paragraph" && n.add("paragraph");
  }
  return n.has("taskList") && n.delete("bulletList"), n.size === 0 && n.add("paragraph"), n;
}, _l = (e) => {
  const t = Ko(e), n = zg.find((o) => t.has(o));
  return n || "paragraph";
}, Mg = {
  paragraph: {
    key: "p",
    code: "KeyP",
    modeOverrides: {
      modAlt: { key: "0", code: "Digit0" }
    }
  },
  heading1: { key: "1", code: "Digit1" },
  heading2: { key: "2", code: "Digit2" },
  heading3: { key: "3", code: "Digit3" },
  heading4: { key: "4", code: "Digit4" },
  heading5: { key: "5", code: "Digit5" },
  heading6: { key: "6", code: "Digit6" },
  bulletList: { key: "u", code: "KeyU" },
  orderedList: { key: "o", code: "KeyO" },
  taskList: { key: "9", code: "Digit9" },
  blockquote: { key: "q", code: "KeyQ" },
  inlineCode: { key: "e", code: "KeyE" },
  codeBlock: { key: "c", code: "KeyC" },
  table: { key: "t", code: "KeyT" },
  link: { key: "l", code: "KeyL" },
  inlineMath: { key: "f", code: "KeyF" },
  csvTable: { key: "s", code: "KeyS" },
  mathBlock: { key: "b", code: "KeyB" },
  emoji: { key: "j", code: "KeyJ" },
  image: { key: "i", code: "KeyI" },
  callout: { key: "a", code: "KeyA" },
  toggle: { key: "g", code: "KeyG" },
  database: { key: "d", code: "KeyD" },
  dateMention: { key: "m", code: "KeyM" },
  video: { key: "v", code: "KeyV" },
  audio: { key: "n", code: "KeyN" },
  bookmark: { key: "k", code: "KeyK" },
  embed: { key: "x", code: "KeyX" },
  layoutBlock: { key: "h", code: "KeyH" },
  footnote: { key: "r", code: "KeyR" },
  toc: { key: "y", code: "KeyY" },
  mermaid: { key: "w", code: "KeyW" }
}, Ol = (e) => Object.fromEntries(
  Object.entries(Mg).map(([t, n]) => {
    var o;
    return [
      t,
      ((o = n.modeOverrides) == null ? void 0 : o[e]) ?? n
    ];
  })
), Tg = {
  Mod: "Ctrl",
  Alt: "Alt",
  Shift: "Shift"
}, xg = {
  Mod: "⌘",
  Alt: "⌥",
  Shift: "⇧"
}, Sg = Yn, ai = (e) => {
  const t = e === "modAlt" ? "Mod-Alt" : "Mod-Shift", n = Ol(e);
  return Object.fromEntries(
    Object.entries(n).map(([o, r]) => [
      o,
      `${t}-${r.key}`
    ])
  );
}, Lg = (e) => {
  const t = Sg(), n = t ? xg : Tg;
  return e.split("-").map((r) => n[r] ?? r.toUpperCase()).join(t ? "" : "+");
}, Hl = (e) => {
  const t = ai(e);
  return Object.fromEntries(
    Object.entries(t).map(([n, o]) => [n, Lg(o)])
  );
}, Ag = (e) => {
  const t = Hl(e);
  return {
    paragraph: t.paragraph,
    heading1: t.heading1,
    heading2: t.heading2,
    heading3: t.heading3,
    heading4: t.heading4,
    heading5: t.heading5,
    heading6: t.heading6,
    bulletList: t.bulletList,
    orderedList: t.orderedList,
    taskList: t.taskList,
    blockquote: t.blockquote,
    codeBlock: t.codeBlock
  };
}, Ig = (e, t) => {
  const n = ai(t);
  e.update(gd.key, (o) => ({
    ...o,
    TurnIntoText: { ...o.TurnIntoText, shortcuts: n.paragraph }
  })), e.update(bd.key, (o) => ({
    ...o,
    TurnIntoH1: { ...o.TurnIntoH1, shortcuts: n.heading1 },
    TurnIntoH2: { ...o.TurnIntoH2, shortcuts: n.heading2 },
    TurnIntoH3: { ...o.TurnIntoH3, shortcuts: n.heading3 },
    TurnIntoH4: { ...o.TurnIntoH4, shortcuts: n.heading4 },
    TurnIntoH5: { ...o.TurnIntoH5, shortcuts: n.heading5 },
    TurnIntoH6: { ...o.TurnIntoH6, shortcuts: n.heading6 }
  })), e.update(yd.key, (o) => ({
    ...o,
    WrapInBulletList: { ...o.WrapInBulletList, shortcuts: n.bulletList }
  })), e.update(kd.key, (o) => ({
    ...o,
    WrapInOrderedList: { ...o.WrapInOrderedList, shortcuts: n.orderedList }
  })), e.update(wd.key, (o) => ({
    ...o,
    WrapInBlockquote: { ...o.WrapInBlockquote, shortcuts: n.blockquote }
  })), e.update(vd.key, (o) => ({
    ...o,
    CreateCodeBlock: { ...o.CreateCodeBlock, shortcuts: n.codeBlock }
  })), e.update(Cd.key, (o) => ({
    ...o,
    ToggleInlineCode: { ...o.ToggleInlineCode, shortcuts: n.inlineCode }
  }));
}, Rg = (e) => {
  const t = ai(e).taskList;
  return Sd("taskListTransform", {
    WrapInTaskList: {
      shortcuts: t,
      /**
       * 创建任务列表块转换命令。
       */
      command: () => (n, o, r) => r ? jo(r, "taskList") : !1
    }
  });
}, No = "footnote_reference", Bt = "footnote_definition", Ng = We("remarkFootnote", () => Bd), Fl = (e) => typeof e.label == "string" && e.label.length > 0 ? e.label : typeof e.identifier == "string" ? e.identifier : "", Pg = Ke(No, () => ({
  group: "inline",
  inline: !0,
  atom: !0,
  attrs: {
    label: { default: "", validate: "string" }
  },
  parseDOM: [
    {
      tag: "sup[data-footnote-ref]",
      getAttrs: (e) => ({
        label: e.getAttribute("data-footnote-ref") ?? ""
      })
    }
  ],
  toDOM: (e) => [
    "sup",
    { "data-footnote-ref": String(e.attrs.label ?? ""), class: "zt-md-footnote-ref" },
    String(e.attrs.label ?? "")
  ],
  parseMarkdown: {
    match: (e) => e.type === "footnoteReference",
    runner: (e, t, n) => {
      e.addNode(n, { label: Fl(t) });
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === No,
    runner: (e, t) => {
      e.addNode("footnoteReference", void 0, void 0, {
        identifier: String(t.attrs.label ?? ""),
        label: String(t.attrs.label ?? "")
      });
    }
  }
})), Dg = Ke(Bt, () => ({
  group: "block",
  content: "block+",
  defining: !0,
  attrs: {
    label: { default: "", validate: "string" }
  },
  parseDOM: [
    {
      tag: `div[data-type="${Bt}"]`,
      getAttrs: (e) => ({
        label: e.getAttribute("data-footnote-label") ?? ""
      })
    }
  ],
  toDOM: (e) => [
    "div",
    {
      "data-type": Bt,
      "data-footnote-label": String(e.attrs.label ?? ""),
      class: "zt-md-footnote-definition"
    },
    0
  ],
  parseMarkdown: {
    match: (e) => e.type === "footnoteDefinition",
    runner: (e, t, n) => {
      e.openNode(n, { label: Fl(t) }), e.next(t.children ?? []), e.closeNode();
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === Bt,
    runner: (e, t) => {
      e.openNode("footnoteDefinition", void 0, {
        identifier: String(t.attrs.label ?? ""),
        label: String(t.attrs.label ?? "")
      }), t.forEach((n) => {
        e.next(n);
      }), e.closeNode();
    }
  }
})), Bg = ue(
  () => new ye({
    key: new ke("zt-md-footnote-click"),
    props: {
      handleClick: (e, t, n) => {
        const o = n.target;
        if (!(o instanceof Element))
          return !1;
        const r = o.closest("sup[data-footnote-ref]");
        if (!r)
          return !1;
        const i = r.getAttribute("data-footnote-ref") ?? "";
        let s = null;
        if (e.state.doc.descendants((c, d) => s !== null ? !1 : c.type.name === Bt && c.attrs.label === i ? (s = d, !1) : !0), s === null)
          return !1;
        n.preventDefault();
        const a = e.nodeDOM(s), l = a instanceof Element ? a : null;
        return l && l.scrollIntoView({ behavior: "smooth", block: "center" }), !0;
      }
    }
  })
), _g = (e) => {
  let t = 0;
  return e.descendants((n) => {
    if (n.type.name !== No && n.type.name !== Bt)
      return !0;
    const o = Number.parseInt(String(n.attrs.label ?? ""), 10);
    return Number.isFinite(o) && o > t && (t = o), !0;
  }), String(t + 1);
}, Og = (e) => {
  var a;
  const t = e.state.schema.nodes, n = t[No], o = t[Bt];
  if (!n || !o)
    return !1;
  const r = _g(e.state.doc), i = e.state.tr;
  i.replaceSelectionWith(n.create({ label: r }));
  const s = i.doc.content.size;
  return i.insert(
    s,
    o.create({ label: r }, (a = e.state.schema.nodes.paragraph) == null ? void 0 : a.create())
  ), e.dispatch(i), e.focus(), !0;
}, Hg = [Ng, Pg, Dg, Bg].flat(), Fg = {
  "zh-CN": {
    linkPlaceholder: "链接",
    dbFieldTitle: "标题",
    dbFieldStatus: "状态",
    dbStatusOptions: ["待办", "进行中", "完成"],
    dbSampleTasks: ["任务一", "任务二"],
    // 布局块模板自描述头:声明本块为纯显示控制信息,大模型处理文档时可忽略
    // (兜底文件脱离工具链被整读的场景;主通道是 stripMeditorLayoutBlocks 剥离导出)。
    layoutBlockTemplate: `// 纯显示控制信息:非 Markdown 正文内容，大模型处理本文档时可忽略本代码块。
`
  },
  "en-US": {
    linkPlaceholder: "Link",
    dbFieldTitle: "Title",
    dbFieldStatus: "Status",
    dbStatusOptions: ["To do", "In progress", "Done"],
    dbSampleTasks: ["Task 1", "Task 2"],
    layoutBlockTemplate: `// Display-only metadata: not Markdown content; LLMs may ignore this block.
`
  }
};
let $l = "zh-CN";
const $g = (e) => {
  (e === "zh-CN" || e === "en-US") && ($l = e);
}, li = () => Fg[$l], jl = "zt-md-open-link-popover", ci = "zt-md-open-media-embed", Wo = (e, t) => e(t.state, t.dispatch, t), Kl = (e) => {
  var n, o, r;
  const t = (o = (n = e == null ? void 0 : e.state) == null ? void 0 : n.selection) == null ? void 0 : o.$from;
  if (!t)
    return !1;
  for (let i = t.depth; i > 0; i -= 1) {
    const s = t.node(i);
    if (((r = s == null ? void 0 : s.type) == null ? void 0 : r.name) === "table")
      return !0;
  }
  return !1;
}, Js = (e, t) => {
  var i, s;
  const n = (i = e == null ? void 0 : e.state) == null ? void 0 : i.doc;
  if (!n || typeof t != "number")
    return -1;
  const o = Math.min(Math.max(t, 0), n.content.size), r = n.resolve(o);
  for (let a = r.depth; a > 0; a -= 1) {
    const l = r.node(a);
    if (((s = l == null ? void 0 : l.type) == null ? void 0 : s.name) === "table")
      return r.before(a);
  }
  return -1;
}, jg = (e, t, n, o) => {
  var p, g;
  const r = (g = (p = e == null ? void 0 : e.state) == null ? void 0 : p.schema) == null ? void 0 : g.nodes;
  if (!r)
    return null;
  const i = r.table, s = r.table_header_row, a = r.table_row, l = r.table_header, c = r.table_cell;
  if (!i || !s || !a || !l || !c)
    return null;
  const d = Math.max(1, t), u = Math.max(1, n), h = Array.from({ length: d }, (y, f) => {
    const w = f === 0, b = w ? s : a, k = w ? l : c, v = Array.from({ length: u }, () => k.createAndFill()).filter(Boolean);
    return b.create(void 0, v);
  });
  return i.create(void 0, h);
}, Wl = (e) => {
  if (!(e != null && e.state) || !(e != null && e.dispatch) || Kl(e))
    return !1;
  const t = e.state.selection.from, n = jg(e, 3, 3);
  if (!n)
    return !1;
  e.dispatch(e.state.tr.replaceSelectionWith(n).scrollIntoView());
  let o = Js(e, t);
  if (o < 0 && t > 0 && (o = Js(e, t - 1)), o < 0)
    return !0;
  const r = o + 2;
  if (r > e.state.doc.content.size)
    return !0;
  const i = de.near(e.state.doc.resolve(r), 1);
  return e.dispatch(e.state.tr.setSelection(i).scrollIntoView()), e.focus(), !0;
}, Kg = (e, t) => {
  var r, i;
  const n = ((i = (r = e == null ? void 0 : e.state) == null ? void 0 : r.schema) == null ? void 0 : i.marks) ?? {}, o = t.find((s) => n[s]);
  return o ? n[o] ?? null : null;
}, Wg = /* @__PURE__ */ new Set([
  "paragraph",
  "heading1",
  "heading2",
  "heading3",
  "heading4",
  "heading5",
  "heading6",
  "bulletList",
  "orderedList",
  "taskList",
  "blockquote",
  "codeBlock"
]), Ug = (e) => Wg.has(e), Ul = (e) => {
  var o, r, i;
  const t = (i = (r = (o = e == null ? void 0 : e.state) == null ? void 0 : o.schema) == null ? void 0 : r.nodes) == null ? void 0 : i.math_inline;
  if (!t || !(e != null && e.dispatch))
    return !1;
  const n = t.create({ value: "" });
  return e.dispatch(
    e.state.tr.replaceSelectionWith(n).scrollIntoView()
  ), !0;
}, Vg = (e) => {
  const t = Kg(e, ["inlineCode", "code_inline"]);
  if (!t)
    return !1;
  const n = Kr(
    t
  );
  return Wo(n, e);
}, Vl = (e) => {
  var a, l, c;
  const t = (a = e.state.schema.nodes) == null ? void 0 : a.math_block;
  if (!t)
    return !1;
  const n = Dn(
    t
  );
  if (!Wo(n, e))
    return !1;
  const r = (l = e.state.selection) == null ? void 0 : l.$from;
  if (!r)
    return !0;
  let i = null;
  for (let d = r.depth; d > 0; d -= 1) {
    const u = r.node(d);
    if (((c = u == null ? void 0 : u.type) == null ? void 0 : c.name) === "math_block") {
      i = r.before(d);
      break;
    }
  }
  if (i === null)
    return !0;
  const s = Ae.create(e.state.doc, i);
  return e.dispatch(e.state.tr.setSelection(s).scrollIntoView()), !0;
}, qg = (e) => {
  var s, a, l, c;
  const t = (l = (a = (s = e == null ? void 0 : e.state) == null ? void 0 : s.schema) == null ? void 0 : a.nodes) == null ? void 0 : l.csvdata;
  if (!t || !(e != null && e.dispatch) || Kl(e))
    return !1;
  const n = t.create({ value: "" });
  e.dispatch(e.state.tr.replaceSelectionWith(n).scrollIntoView());
  let o = null;
  const r = e.state.selection.$from.nodeBefore;
  if (((c = r == null ? void 0 : r.type) == null ? void 0 : c.name) === "csvdata" && (o = e.state.selection.from - r.nodeSize), o === null && e.state.doc.descendants((d, u) => o !== null ? !1 : d.type.name === "csvdata" ? (o = u, !1) : !0), o === null)
    return !0;
  const i = Ae.create(e.state.doc, o);
  return e.dispatch(e.state.tr.setSelection(i).scrollIntoView()), e.focus(), !0;
}, Gg = (e) => {
  var i, s, a;
  if (!((a = (s = (i = e == null ? void 0 : e.state) == null ? void 0 : i.schema) == null ? void 0 : s.marks) == null ? void 0 : a.link) || !(e != null && e.dispatch))
    return !1;
  const n = e.state.selection.from, o = e.state.schema.text(li().linkPlaceholder);
  if (!o)
    return !1;
  const r = e.state.tr.replaceWith(n, e.state.selection.to, o);
  return r.setSelection(de.create(r.doc, n, n + o.nodeSize)), r.setMeta(jl, !0), e.dispatch(r.scrollIntoView()), e.focus(), !0;
}, Xg = (e) => {
  var i, s, a, l;
  const t = (a = (s = (i = e == null ? void 0 : e.state) == null ? void 0 : i.schema) == null ? void 0 : s.nodes) == null ? void 0 : a.callout;
  if (!t || !(e != null && e.dispatch))
    return !1;
  const n = jr(t);
  if (Wo(n, e))
    return e.focus(), !0;
  const o = (l = e.state.schema.nodes) == null ? void 0 : l.paragraph;
  if (!o)
    return !1;
  const r = t.create(void 0, o.create());
  return e.dispatch(e.state.tr.replaceSelectionWith(r).scrollIntoView()), e.focus(), !0;
}, Yg = (e) => {
  var i, s, a, l;
  const t = (a = (s = (i = e == null ? void 0 : e.state) == null ? void 0 : i.schema) == null ? void 0 : s.nodes) == null ? void 0 : a.toggle;
  if (!t || !(e != null && e.dispatch))
    return !1;
  const n = jr(t);
  if (Wo(n, e))
    return e.focus(), !0;
  const o = (l = e.state.schema.nodes) == null ? void 0 : l.paragraph;
  if (!o)
    return !1;
  const r = t.create(void 0, o.create());
  return e.dispatch(e.state.tr.replaceSelectionWith(r).scrollIntoView()), e.focus(), !0;
}, Zg = (e) => {
  const n = $o.map((u) => `${ut}${u}`).map((u) => {
    var h, p, g;
    return ((g = (p = (h = e == null ? void 0 : e.state) == null ? void 0 : h.schema) == null ? void 0 : p.nodes) == null ? void 0 : g[u]) ?? null;
  }).find((u) => u !== null);
  if (!n || !(e != null && e.dispatch))
    return !1;
  const o = li(), [r, i, s] = o.dbStatusOptions, [a, l] = o.dbSampleTasks, c = {
    version: 1,
    name: "",
    fields: [
      { id: "f1", name: o.dbFieldTitle, type: "text" },
      { id: "f2", name: o.dbFieldStatus, type: "select", options: [r, i, s] }
    ],
    records: [
      { id: "r1", cells: { f1: a, f2: r } },
      { id: "r2", cells: { f1: l, f2: i } }
    ]
  }, d = n.create({ value: JSON.stringify(c, null, 2) });
  return e.dispatch(e.state.tr.replaceSelectionWith(d).scrollIntoView()), e.focus(), !0;
}, Jg = (e) => {
  var s, a, l, c;
  const t = (l = (a = (s = e == null ? void 0 : e.state) == null ? void 0 : s.schema) == null ? void 0 : a.nodes) == null ? void 0 : l.meditor_layout;
  if (!t || !(e != null && e.dispatch))
    return !1;
  const n = t.create({ value: li().layoutBlockTemplate });
  e.dispatch(e.state.tr.replaceSelectionWith(n).scrollIntoView());
  let o = null;
  const r = e.state.selection.$from.nodeBefore;
  if (((c = r == null ? void 0 : r.type) == null ? void 0 : c.name) === "meditor_layout" && (o = e.state.selection.from - r.nodeSize), o === null && e.state.doc.descendants((d, u) => o !== null ? !1 : d.type.name === "meditor_layout" ? (o = u, !1) : !0), o === null)
    return !0;
  const i = Ae.create(e.state.doc, o);
  return e.dispatch(e.state.tr.setSelection(i).scrollIntoView()), e.focus(), !0;
}, Qg = (e, t) => {
  if (!(e != null && e.dispatch))
    return !1;
  const n = e.state.tr.setMeta(ci, { kind: t });
  return e.dispatch(n), e.focus(), !0;
}, eb = (e) => {
  var l, c, d;
  const t = (d = (c = (l = e == null ? void 0 : e.state) == null ? void 0 : l.schema) == null ? void 0 : c.marks) == null ? void 0 : d.link;
  if (!t || !(e != null && e.dispatch))
    return !1;
  const n = /* @__PURE__ */ new Date(), o = (u) => {
    const h = new Date(n);
    return h.setDate(h.getDate() + u), `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
  }, { from: r, to: i } = e.state.selection, s = `@${o(0)}`, a = e.state.schema.text(s, [
    t.create({ href: `mention:date?value=${o(0)}`, title: s })
  ]);
  return a ? (e.dispatch(e.state.tr.replaceWith(r, i, a).scrollIntoView()), e.focus(), !0) : !1;
}, tb = (e) => Og(e), nb = (e) => {
  var n, o, r;
  const t = (r = (o = (n = e == null ? void 0 : e.state) == null ? void 0 : n.schema) == null ? void 0 : o.nodes) == null ? void 0 : r.meditor_toc;
  return !t || !(e != null && e.dispatch) ? !1 : (e.dispatch(e.state.tr.replaceSelectionWith(t.create()).scrollIntoView()), e.focus(), !0);
}, ob = (e) => {
  var r, i, s;
  const t = (s = (i = (r = e == null ? void 0 : e.state) == null ? void 0 : r.schema) == null ? void 0 : i.nodes) == null ? void 0 : s.code_block;
  if (!t || !(e != null && e.dispatch))
    return !1;
  const n = e.state.schema.text(`graph TD
  A --> B`), o = t.create({ language: "mermaid" }, n ? [n] : void 0);
  return e.dispatch(e.state.tr.replaceSelectionWith(o).scrollIntoView()), e.focus(), !0;
}, rb = {
  callout: Xg,
  toggle: Yg,
  database: Zg,
  layoutBlock: Jg,
  dateMention: eb,
  csvTable: qg,
  inlineCode: Vg,
  inlineMath: Ul,
  mathBlock: Vl,
  table: Wl,
  link: Gg,
  footnote: tb,
  toc: nb,
  mermaid: ob
}, di = (e, t) => {
  const n = e;
  return !(n != null && n.state) || !(n != null && n.dispatch) ? !1 : Ug(t) ? jo(n, t) : t === "image" || t === "emoji" ? !1 : t === "video" || t === "audio" || t === "bookmark" || t === "embed" ? Qg(n, t) : rb[t](n);
}, ib = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>', ui = (e, t = 14) => `<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`, sb = ui(
  '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>'
), ab = ui(
  '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>'
), lb = ui(
  '<path d="m16 16 2 2 4-4M22 13V6l-9.29 3.71M7 8H2v8h5l7 4V10l-2.5 1.14"/><line x1="2" x2="22" y1="2" y2="22"/>',
  24
), xn = "top", ir = "bottom", Qs = (e) => e.button === 0, mt = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable, Sn = (e) => typeof e != "function" ? null : e(), ea = (e) => e === "video" || e === "embed";
class cb {
  /**
   * 初始化视图。
   */
  constructor(t, n, o, r) {
    // 当前节点快照。
    m(this, "node");
    // 节点根容器。
    m(this, "dom");
    // 编辑器视图。
    m(this, "view");
    // 节点位置获取器。
    m(this, "getPos");
    // i18n 文案。
    m(this, "messages");
    // 高度可缩放的媒体元素(embed 为 iframe,video 为 video;其余种类为 null)。
    m(this, "mediaElement", null);
    // 加载失败占位元素(video/audio 才有)。
    m(this, "loadErrorElement", null);
    // 悬停操作区容器(编辑/删除按钮)。
    m(this, "actionsContainer");
    // 编辑按钮。
    m(this, "editButton");
    // 删除按钮。
    m(this, "deleteButton");
    // 顶部缩放提示手柄(video/embed 才有;纯视觉,命中靠热区)。
    m(this, "topResizeHandle", null);
    // 底部缩放提示手柄(video/embed 才有;纯视觉,命中靠热区)。
    m(this, "bottomResizeHandle", null);
    // 顶部缩放热区(video/embed 才有;常驻可命中,解决 iframe 吞掉父文档 hover 的问题)。
    m(this, "topResizeZone", null);
    // 底部缩放热区(video/embed 才有)。
    m(this, "bottomResizeZone", null);
    // 当前拖拽缩放状态。
    m(this, "resizeState", null);
    /**
     * 响应媒体加载失败:切换错误占位(video/audio)。
     */
    m(this, "handleMediaError", () => {
      this.dom.dataset.loadError = "true";
    });
    /**
     * 响应点击选中:把当前节点切为 NodeSelection(不阻断媒体原生控件交互)。
     */
    m(this, "handleSelectPointerDown", (t) => {
      !Qs(t) || !mt(this.view) || this.dispatchNodeSelection();
    });
    /**
     * 响应书签卡片点击:编辑态阻止跳转(选中已在 pointerdown 完成);只读态放行。
     */
    m(this, "handleBookmarkClick", (t) => {
      mt(this.view) && t.preventDefault();
    });
    /**
     * 响应编辑按钮点击:经 meta 请求打开 URL 浮层(编辑模式,回填当前地址)。
     */
    m(this, "handleEditClick", (t) => {
      if (t.preventDefault(), t.stopPropagation(), !mt(this.view))
        return;
      const n = Sn(this.getPos);
      if (n === null)
        return;
      const o = mn(this.node.attrs.kind) ? this.node.attrs.kind : "video";
      this.view.dispatch(
        this.view.state.tr.setMeta(ci, {
          kind: o,
          editPos: n,
          editSrc: String(this.node.attrs.src ?? "")
        })
      );
    });
    /**
     * 响应删除按钮点击,删除当前媒体块。
     */
    m(this, "handleDeleteClick", (t) => {
      if (t.preventDefault(), t.stopPropagation(), !mt(this.view))
        return;
      const n = Sn(this.getPos);
      if (n === null)
        return;
      const o = this.view.state.tr.delete(n, n + this.node.nodeSize).scrollIntoView();
      this.view.dispatch(o), requestAnimationFrame(() => {
        this.view.focus();
      });
    });
    /**
     * 响应内嵌缩放开始(热区 pointerdown,仅左键;同时选中原节点)。
     */
    m(this, "handleResizePointerDown", (t) => {
      var s;
      if (!Qs(t) || (t.preventDefault(), t.stopPropagation(), !mt(this.view)))
        return;
      const n = t.currentTarget;
      if (!(n instanceof HTMLElement))
        return;
      const o = this.dom.dataset.loadError === "true" && this.loadErrorElement ? this.loadErrorElement : this.mediaElement;
      if (!o)
        return;
      const r = o.getBoundingClientRect();
      if (r.height <= 0)
        return;
      const i = n.dataset.side === xn ? xn : ir;
      this.dispatchNodeSelection(), this.resizeState = {
        side: i,
        startClientY: t.clientY,
        startHeight: r.height,
        height: Dt(r.height)
      }, this.dom.dataset.resizing = "true", (s = this.mediaElement) == null || s.style.setProperty("pointer-events", "none"), this.applyMediaHeight(this.resizeState.height), window.addEventListener("pointermove", this.handleResizePointerMove), window.addEventListener("pointerup", this.handleResizePointerUp), window.addEventListener("pointercancel", this.handleResizePointerUp);
    });
    /**
     * 响应内嵌缩放移动(拖上方手柄向上增高,拖下方手柄向下增高)。
     */
    m(this, "handleResizePointerMove", (t) => {
      if (!this.resizeState)
        return;
      t.preventDefault();
      const n = t.clientY - this.resizeState.startClientY, o = this.resizeState.side === xn ? -n : n, r = Dt(this.resizeState.startHeight + o);
      this.resizeState.height = r, this.applyMediaHeight(r);
    });
    /**
     * 响应内嵌缩放结束,提交高度到节点属性。
     */
    m(this, "handleResizePointerUp", (t) => {
      if (t.preventDefault(), !this.resizeState)
        return;
      const n = this.resizeState.height;
      this.resizeState = null, delete this.dom.dataset.resizing, this.removeResizeWindowListeners(), this.mediaElement && (this.mediaElement.style.pointerEvents = ""), this.commitMediaHeight(n);
    });
    this.node = t, this.view = n, this.getPos = o, this.messages = r, this.dom = document.createElement("div"), this.dom.dataset.type = nt, this.dom.className = "zt-md-media-embed", this.dom.dataset.editable = mt(n) ? "true" : "false", this.actionsContainer = document.createElement("span"), this.actionsContainer.className = "zt-md-media-embed-actions", this.editButton = document.createElement("button"), this.editButton.type = "button", this.editButton.className = "zt-md-media-embed-action-button", this.editButton.setAttribute("aria-label", r.mediaEmbedEditAriaLabel), this.editButton.title = r.mediaEmbedEditAriaLabel, this.editButton.innerHTML = sb, this.deleteButton = document.createElement("button"), this.deleteButton.type = "button", this.deleteButton.className = "zt-md-media-embed-action-button zt-md-media-embed-action-button-danger", this.deleteButton.setAttribute("aria-label", r.mediaEmbedDeleteAriaLabel), this.deleteButton.title = r.mediaEmbedDeleteAriaLabel, this.deleteButton.innerHTML = ab, this.actionsContainer.append(this.editButton, this.deleteButton), this.editButton.addEventListener("click", this.handleEditClick), this.deleteButton.addEventListener("click", this.handleDeleteClick), this.renderContent(t), this.dom.appendChild(this.actionsContainer), this.syncInitialSelection();
  }
  /**
   * 同步初始选中态:初始 state 已携带本节点 NodeSelection 时(如文档首块即媒体块),
   * ProseMirror mount 不会回调 selectNode,需在构造时补齐 DOM 高亮。
   */
  syncInitialSelection() {
    const t = Sn(this.getPos), { selection: n } = this.view.state;
    t !== null && n instanceof Ae && n.from === t && this.selectNode();
  }
  /**
   * 按种类渲染内容。
   */
  renderContent(t) {
    this.mediaElement = null, this.loadErrorElement = null, this.topResizeHandle = null, this.bottomResizeHandle = null, this.topResizeZone = null, this.bottomResizeZone = null, this.dom.textContent = "";
    const n = mn(t.attrs.kind) ? t.attrs.kind : "video", o = String(t.attrs.src ?? "");
    if (this.dom.dataset.kind = n, n === "bookmark") {
      const r = document.createElement("a");
      r.href = o, r.target = "_blank", r.rel = "noopener noreferrer", r.className = "zt-md-bookmark-card";
      const i = document.createElement("span");
      i.className = "zt-md-bookmark-icon", i.innerHTML = ib;
      const s = document.createElement("span");
      s.className = "zt-md-bookmark-url", s.textContent = o, r.append(i, s), r.addEventListener("pointerdown", this.handleSelectPointerDown), r.addEventListener("click", this.handleBookmarkClick), this.dom.appendChild(r);
      return;
    }
    if (n === "embed") {
      const r = document.createElement("iframe");
      r.src = o, r.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation allow-popups"), r.setAttribute("loading", "lazy"), r.allowFullscreen = !0, this.mediaElement = r, this.dom.appendChild(r);
    } else {
      const r = n === "audio" ? document.createElement("audio") : document.createElement("video");
      r.src = o, r.controls = !0, r.preload = "metadata", r.addEventListener("error", this.handleMediaError), r.addEventListener("pointerdown", this.handleSelectPointerDown), this.loadErrorElement = document.createElement("span"), this.loadErrorElement.className = "zt-md-media-embed-load-error", this.loadErrorElement.innerHTML = lb, this.loadErrorElement.append(this.messages.mediaEmbedLoadFailed), this.dom.append(r, this.loadErrorElement), r instanceof HTMLVideoElement && (this.mediaElement = r);
    }
    ea(n) && (this.applyMediaHeight(this.resolveNodeHeightPx(t)), this.topResizeHandle = this.createResizeHandle(xn), this.bottomResizeHandle = this.createResizeHandle(ir), this.topResizeZone = this.createResizeZone(xn), this.bottomResizeZone = this.createResizeZone(ir), this.topResizeZone.addEventListener("pointerdown", this.handleResizePointerDown), this.bottomResizeZone.addEventListener("pointerdown", this.handleResizePointerDown), this.dom.append(
      this.topResizeHandle,
      this.bottomResizeHandle,
      this.topResizeZone,
      this.bottomResizeZone
    ));
  }
  /**
   * 创建内嵌高度缩放视觉手柄(悬停热区时显现,不参与命中)。
   */
  createResizeHandle(t) {
    const n = document.createElement("span");
    return n.className = `zt-md-media-embed-resize-handle zt-md-media-embed-resize-handle-${t}`, n.dataset.side = t, n.setAttribute("aria-hidden", "true"), n;
  }
  /**
   * 创建内嵌高度缩放热区(常驻可命中的透明横条)。
   */
  createResizeZone(t) {
    const n = document.createElement("span");
    return n.className = `zt-md-media-embed-resize-zone zt-md-media-embed-resize-zone-${t}`, n.dataset.side = t, n.setAttribute("aria-hidden", "true"), n;
  }
  /**
   * 读取节点属性中的媒体高度(0 = 自动)。
   */
  resolveNodeHeightPx(t) {
    const n = t.attrs.height;
    return typeof n == "number" && n > 0 ? Dt(n) : 0;
  }
  /**
   * 应用媒体高度到 video/iframe(0 = 移除自定义高度,回落自动高度)。
   * 错误占位同步承接高度:错误态下原生媒体隐藏,拖拽预览与自定义高度由占位呈现,
   * 链接修复后高度无缝回到媒体元素。
   */
  applyMediaHeight(t) {
    var n, o, r, i;
    if (t > 0) {
      const s = `${Math.round(t)}px`;
      (n = this.mediaElement) == null || n.style.setProperty("height", s), (o = this.loadErrorElement) == null || o.style.setProperty("height", s), this.dom.dataset.hasHeight = "true";
    } else
      (r = this.mediaElement) == null || r.style.removeProperty("height"), (i = this.loadErrorElement) == null || i.style.removeProperty("height"), delete this.dom.dataset.hasHeight;
  }
  /**
   * 把当前节点设为 NodeSelection(已选中时不重复派发事务)。
   */
  dispatchNodeSelection() {
    const t = Sn(this.getPos);
    if (t === null)
      return;
    const { selection: n } = this.view.state;
    this.dom.dataset.selected === "true" && n instanceof Ae && n.from === t || this.view.dispatch(
      this.view.state.tr.setSelection(Ae.create(this.view.state.doc, t))
    );
  }
  /**
   * 移除内嵌缩放全局监听。
   */
  removeResizeWindowListeners() {
    window.removeEventListener("pointermove", this.handleResizePointerMove), window.removeEventListener("pointerup", this.handleResizePointerUp), window.removeEventListener("pointercancel", this.handleResizePointerUp);
  }
  /**
   * 提交媒体高度到节点属性。
   */
  commitMediaHeight(t) {
    if (!mt(this.view))
      return;
    const n = Sn(this.getPos);
    if (n === null)
      return;
    const o = this.view.state.tr.setNodeMarkup(n, void 0, {
      ...this.node.attrs,
      height: Dt(t)
    });
    this.view.dispatch(o), requestAnimationFrame(() => {
      this.view.focus();
    });
  }
  /**
   * 处理节点更新。
   */
  update(t) {
    if (t.type.name !== nt)
      return !1;
    const n = this.dom.dataset.kind, o = mn(t.attrs.kind) ? t.attrs.kind : "video", r = String(t.attrs.src ?? "");
    return n !== o || r !== String(this.node.attrs.src ?? "") ? (this.node = t, this.renderContent(t), this.dom.appendChild(this.actionsContainer), !0) : (this.node = t, this.dom.dataset.editable = mt(this.view) ? "true" : "false", ea(o) && !this.resizeState && this.applyMediaHeight(this.resolveNodeHeightPx(t)), !0);
  }
  /**
   * 节点被选中时高亮。
   */
  selectNode() {
    this.dom.dataset.selected = "true";
  }
  /**
   * 节点取消选中。
   */
  deselectNode() {
    delete this.dom.dataset.selected;
  }
  /**
   * 拦截媒体块内部事件交给 NodeView 自理(媒体控件/操作按钮/缩放热区)。
   */
  stopEvent(t) {
    const n = t.target;
    return n instanceof Node ? this.dom.contains(n) || this.resizeState !== null : !1;
  }
  /**
   * 忽略内部 DOM 变更观察。
   */
  ignoreMutation() {
    return !0;
  }
  /**
   * 销毁时解绑监听器。
   */
  destroy() {
    var t, n;
    this.removeResizeWindowListeners(), (t = this.topResizeZone) == null || t.removeEventListener("pointerdown", this.handleResizePointerDown), (n = this.bottomResizeZone) == null || n.removeEventListener("pointerdown", this.handleResizePointerDown), this.editButton.removeEventListener("click", this.handleEditClick), this.deleteButton.removeEventListener("click", this.handleDeleteClick);
  }
}
const db = (e = Qe()) => (t, n, o) => {
  const r = typeof o == "function" ? () => {
    const i = o();
    return typeof i == "number" ? i : 0;
  } : !1;
  return new cb(t, n, r, e);
}, ub = "blockquote", hb = "paragraph", mb = "Backspace", pb = (e) => e.key !== mb || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey, fb = (e) => {
  if (e.parent.type.name !== hb || e.parentOffset !== 0)
    return null;
  for (let t = e.depth; t > 0; t -= 1) {
    const n = e.node(t);
    if (n.type.name !== ub)
      continue;
    const o = e.depth, r = e.index(t);
    return o <= t || r !== 0 ? null : {
      paragraphDepth: o,
      blockquoteDepth: t,
      blockquoteType: n.type
    };
  }
  return null;
}, gb = (e, t) => {
  const { selection: n } = e.state;
  if (!n.empty)
    return !1;
  const o = n.$from, r = fb(o);
  if (!r)
    return !1;
  const i = o.blockRange(o, (l) => l.type === r.blockquoteType);
  if (!i)
    return !1;
  const s = Id(i);
  if (s === null)
    return !1;
  t.preventDefault();
  const a = e.state.tr.lift(i, s).scrollIntoView();
  return e.dispatch(a), !0;
}, bb = ue(() => new ye({
  key: new ke("zt-md-blockquote-backspace-lift"),
  props: {
    handleKeyDown: (e, t) => pb(t) ? !1 : gb(e, t)
  }
})), yb = "Backspace", kb = "heading", wb = "paragraph", vb = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable, Cb = (e) => {
  if (e.type.name !== wb)
    return !1;
  const t = e.textContent;
  return t.trim().length === 0 && e.content.size === t.length;
}, Eb = (e) => {
  if (e.parent.type.name !== kb || e.parentOffset !== 0 || e.depth < 1)
    return null;
  const t = e.index(e.depth - 1);
  if (t <= 0)
    return null;
  const o = e.node(e.depth - 1).child(t - 1);
  if (!Cb(o))
    return null;
  const r = e.before(e.depth);
  return {
    from: r - o.nodeSize,
    to: r
  };
}, zb = (e, t) => {
  if (t.key !== yb || t.defaultPrevented || t.altKey || t.ctrlKey || t.metaKey || t.shiftKey || !vb(e))
    return !1;
  const { selection: n } = e.state;
  if (!n.empty)
    return !1;
  const o = Eb(n.$from);
  if (!o)
    return !1;
  t.preventDefault();
  const r = e.state.tr.delete(o.from, o.to);
  return r.setSelection(de.create(r.doc, o.from + 1)).scrollIntoView(), e.dispatch(r), !0;
}, Mb = () => new ye({
  key: new ke("zt-md-heading-backspace-empty-paragraph"),
  props: {
    /**
     * 优先删除标题前的空白段落,未命中时放行默认标题降级。
     */
    handleKeyDown: (e, t) => zb(e, t)
  }
}), Tb = ue(
  Mb
), xb = "math_block", Sb = "Backspace", Lb = (e) => e.key !== Sb || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey, Ab = (e) => {
  if (e.parent.type.name !== "paragraph" || e.parentOffset !== 0 || e.depth < 1)
    return null;
  const t = e.index(e.depth - 1);
  if (t <= 0)
    return null;
  const o = e.node(e.depth - 1).child(t - 1);
  if (o.type.name !== xb)
    return null;
  const r = e.before(e.depth);
  return {
    previousBlock: o,
    previousBlockStart: r - o.nodeSize
  };
}, Ib = (e, t) => {
  const { selection: n } = e.state;
  if (!n.empty)
    return !1;
  const o = n.$from, r = Ab(o);
  if (!r)
    return !1;
  const i = o.parent.textContent.length === 0, s = o.before(o.depth), a = s + o.parent.nodeSize;
  t.preventDefault();
  const l = e.state.tr;
  return i && l.delete(s, a), l.setSelection(Ae.create(l.doc, r.previousBlockStart)).scrollIntoView(), e.dispatch(l), !0;
}, Rb = ue(() => new ye({
  key: new ke("zt-md-math-backspace-entry"),
  props: {
    handleKeyDown: (e, t) => Lb(t) ? !1 : Ib(e, t)
  }
})), ta = "math_block", na = 5, Nb = 1200, hi = (e) => `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`, sr = hi(
  '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'
), Pb = hi('<path d="M20 6 9 17l-5-5"/>'), Db = hi(
  '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>'
), po = (e) => typeof e != "function" ? null : e(), fo = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable;
class Bb {
  /**
   * 初始化公式块视图。
   */
  constructor(t, n, o, r) {
    // 当前节点快照。
    m(this, "node");
    // 节点根容器。
    m(this, "dom");
    // 编辑器视图。
    m(this, "view");
    // 节点位置获取器。
    m(this, "getPos");
    // 编辑器文案。
    m(this, "messages");
    // 源码编辑容器。
    m(this, "sourceContainer");
    // 源码输入框。
    m(this, "sourceTextarea");
    // 渲染结果容器。
    m(this, "previewContainer");
    // 操作区容器。
    m(this, "actionsContainer");
    // 复制按钮。
    m(this, "copyButton");
    // 删除按钮。
    m(this, "deleteButton");
    // 渲染错误提示节点。
    m(this, "errorContainer");
    // 指针按下时的横坐标。
    m(this, "pointerStartX", null);
    // 指针按下时的纵坐标。
    m(this, "pointerStartY", null);
    // 当前交互是否已判定为拖动。
    m(this, "hasDragged", !1);
    // 是否由删块触发失焦(用于避免 blur 与回焦互相干扰)。
    m(this, "isDeletingByBackspace", !1);
    // 复制成功反馈计时器。
    m(this, "copyFeedbackTimer", null);
    /**
     * 响应公式块点击,进入编辑态。
     */
    m(this, "handleClick", () => {
      if (this.hasDragged) {
        this.hasDragged = !1;
        return;
      }
      this.enterEditMode();
    });
    /**
     * 记录指针按下位置并重置拖动状态。
     */
    m(this, "handlePointerDown", (t) => {
      this.pointerStartX = t.clientX, this.pointerStartY = t.clientY, this.hasDragged = !1;
    });
    /**
     * 根据位移判断是否发生拖动。
     */
    m(this, "handlePointerMove", (t) => {
      if (this.pointerStartX === null || this.pointerStartY === null)
        return;
      const n = Math.abs(t.clientX - this.pointerStartX), o = Math.abs(t.clientY - this.pointerStartY);
      (n >= na || o >= na) && (this.hasDragged = !0);
    });
    /**
     * 清理指针按下位置。
     */
    m(this, "handlePointerUp", () => {
      this.pointerStartX = null, this.pointerStartY = null;
    });
    /**
     * 响应复制按钮点击,复制公式源码。
     */
    m(this, "handleCopyClick", (t) => {
      var r;
      if (t.preventDefault(), t.stopPropagation(), !fo(this.view))
        return;
      const n = typeof this.node.attrs.value == "string" ? this.node.attrs.value : "";
      (typeof navigator < "u" && ((r = navigator.clipboard) != null && r.writeText) ? navigator.clipboard.writeText(n) : Promise.resolve()).then(() => {
        this.copyButton.innerHTML = Pb, this.copyButton.dataset.copied = "true", this.copyFeedbackTimer !== null && clearTimeout(this.copyFeedbackTimer), this.copyFeedbackTimer = setTimeout(() => {
          this.copyButton.innerHTML = sr, delete this.copyButton.dataset.copied, this.copyFeedbackTimer = null;
        }, Nb);
      }).catch(() => {
      });
    });
    /**
     * 响应删除按钮点击,删除当前公式块。
     */
    m(this, "handleDeleteClick", (t) => {
      t.preventDefault(), t.stopPropagation(), fo(this.view) && this.deleteCurrentMathBlock();
    });
    /**
     * 响应源码输入,实时更新节点并刷新渲染。
     */
    m(this, "handleInput", () => {
      const t = this.sourceTextarea.value, n = po(this.getPos);
      if (n === null)
        return;
      this.renderMath(t);
      const o = this.view.state.tr.setNodeMarkup(n, void 0, {
        ...this.node.attrs,
        value: t
      });
      o.docChanged && this.view.dispatch(o);
    });
    /**
     * 处理源码输入框键盘事件。
     */
    m(this, "handleKeyDown", (t) => {
      const n = this.sourceTextarea.selectionStart, o = this.sourceTextarea.selectionEnd;
      if (t.key === "Backspace") {
        if (!(n === 0 && o === 0) || po(this.getPos) === null)
          return;
        t.preventDefault(), this.deleteCurrentMathBlock();
        return;
      }
      if (t.key !== "ArrowUp" && t.key !== "ArrowDown" || t.defaultPrevented || t.altKey || t.ctrlKey || t.metaKey || t.shiftKey || n !== o)
        return;
      const r = this.sourceTextarea.value, i = r.slice(0, n), s = r.slice(o), a = !i.includes(`
`), l = !s.includes(`
`);
      if (!(t.key === "ArrowUp" && a || t.key === "ArrowDown" && l))
        return;
      const d = po(this.getPos);
      d !== null && si(this.view, d, this.node, t.key) && t.preventDefault();
    });
    /**
     * 源码输入框失焦后退出编辑态。
     */
    m(this, "handleBlur", () => {
      this.isDeletingByBackspace || this.exitEditMode();
    });
    this.node = t, this.view = n, this.getPos = o, this.messages = r, this.dom = document.createElement("div"), this.dom.dataset.type = ta, this.dom.className = "zt-md-math-block", this.syncEditableState(), this.sourceContainer = document.createElement("div"), this.sourceContainer.className = "zt-md-math-block-source", this.sourceContainer.hidden = !0, this.sourceTextarea = document.createElement("textarea"), this.sourceTextarea.className = "zt-md-math-block-textarea", this.sourceTextarea.setAttribute("aria-label", this.messages.mathBlockSourceAriaLabel), this.sourceTextarea.spellcheck = !1, this.previewContainer = document.createElement("div"), this.previewContainer.className = "zt-md-math-block-preview", this.actionsContainer = document.createElement("div"), this.actionsContainer.className = "zt-md-math-block-actions", this.copyButton = document.createElement("button"), this.copyButton.type = "button", this.copyButton.className = "zt-md-math-block-action-button", this.copyButton.setAttribute("aria-label", this.messages.mathBlockCopyAriaLabel), this.copyButton.innerHTML = sr, this.deleteButton = document.createElement("button"), this.deleteButton.type = "button", this.deleteButton.className = "zt-md-math-block-action-button zt-md-math-block-action-button-danger", this.deleteButton.setAttribute("aria-label", this.messages.mathBlockDeleteAriaLabel), this.deleteButton.innerHTML = Db, this.errorContainer = document.createElement("div"), this.errorContainer.className = "zt-md-math-block-error", this.errorContainer.hidden = !0, this.actionsContainer.append(this.copyButton, this.deleteButton), this.sourceContainer.appendChild(this.sourceTextarea), this.previewContainer.appendChild(this.errorContainer), this.dom.append(this.actionsContainer, this.sourceContainer, this.previewContainer), this.syncFromNode(t), this.dom.addEventListener("click", this.handleClick), this.dom.addEventListener("pointerdown", this.handlePointerDown), this.dom.addEventListener("pointermove", this.handlePointerMove), this.dom.addEventListener("pointerup", this.handlePointerUp), this.dom.addEventListener("pointercancel", this.handlePointerUp), this.copyButton.addEventListener("click", this.handleCopyClick), this.deleteButton.addEventListener("click", this.handleDeleteClick), this.sourceTextarea.addEventListener("input", this.handleInput), this.sourceTextarea.addEventListener("keydown", this.handleKeyDown), this.sourceTextarea.addEventListener("blur", this.handleBlur);
  }
  /**
   * 同步公式块可编辑状态标记,供样式层判断只读态。
   */
  syncEditableState() {
    this.dom.dataset.editable = fo(this.view) ? "true" : "false";
  }
  /**
   * 删除当前公式块并将焦点归还编辑器。
   */
  deleteCurrentMathBlock() {
    const t = po(this.getPos);
    if (t === null)
      return;
    this.isDeletingByBackspace = !0;
    const n = this.view.state.tr.delete(t, t + this.node.nodeSize), o = Math.min(t, n.doc.content.size);
    n.setSelection(de.near(n.doc.resolve(o), -1)).scrollIntoView(), this.view.dispatch(n), requestAnimationFrame(() => {
      this.view.focus(), this.isDeletingByBackspace = !1;
    });
  }
  /**
   * 更新 DOM 与渲染结果。
   */
  syncFromNode(t) {
    const n = typeof t.attrs.value == "string" ? t.attrs.value : "";
    this.dom.dataset.value = n, this.sourceTextarea.value = n, this.renderMath(n);
  }
  /**
   * 渲染公式预览。
   */
  renderMath(t) {
    this.errorContainer.hidden = !0, this.errorContainer.textContent = "";
    try {
      Vn.render(t, this.previewContainer, {
        displayMode: !0,
        throwOnError: !0
      }), this.previewContainer.appendChild(this.errorContainer);
    } catch {
      this.previewContainer.textContent = t, this.errorContainer.hidden = !1, this.errorContainer.textContent = this.messages.mathRenderError, this.previewContainer.appendChild(this.errorContainer);
    }
  }
  /**
   * 进入编辑态并展示源码输入区。
   */
  enterEditMode() {
    fo(this.view) && (this.sourceContainer.hidden = !1, this.dom.classList.add("zt-md-math-block-editing"), this.sourceTextarea.focus());
  }
  /**
   * 退出编辑态并隐藏源码输入区。
   */
  exitEditMode() {
    this.sourceContainer.hidden = !0, this.dom.classList.remove("zt-md-math-block-editing");
  }
  /**
   * 处理节点更新。
   */
  update(t) {
    return t.type.name !== ta ? !1 : (this.node = t, this.syncEditableState(), this.syncFromNode(t), !0);
  }
  /**
   * 节点被选中时进入编辑态。
   */
  selectNode() {
    this.enterEditMode();
  }
  /**
   * 节点取消选中时退出编辑态。
   */
  deselectNode() {
    this.exitEditMode();
  }
  /**
   * 允许输入框事件在 NodeView 内部消费。
   */
  stopEvent(t) {
    const n = t.target;
    return n instanceof Node ? this.sourceContainer.contains(n) || this.actionsContainer.contains(n) : !1;
  }
  /**
   * 忽略 NodeView 内部的 DOM 变更观察。
   */
  ignoreMutation() {
    return !0;
  }
  /**
   * 销毁时解绑监听器。
   */
  destroy() {
    this.dom.removeEventListener("click", this.handleClick), this.dom.removeEventListener("pointerdown", this.handlePointerDown), this.dom.removeEventListener("pointermove", this.handlePointerMove), this.dom.removeEventListener("pointerup", this.handlePointerUp), this.dom.removeEventListener("pointercancel", this.handlePointerUp), this.copyButton.removeEventListener("click", this.handleCopyClick), this.deleteButton.removeEventListener("click", this.handleDeleteClick), this.sourceTextarea.removeEventListener("input", this.handleInput), this.sourceTextarea.removeEventListener("keydown", this.handleKeyDown), this.sourceTextarea.removeEventListener("blur", this.handleBlur), this.copyFeedbackTimer !== null && (clearTimeout(this.copyFeedbackTimer), this.copyFeedbackTimer = null), this.copyButton.innerHTML = sr, delete this.copyButton.dataset.copied;
  }
}
const _b = (e = Qe()) => (t, n, o) => {
  const r = typeof o == "function" ? () => {
    const i = o();
    return typeof i == "number" ? i : 0;
  } : !1;
  return new Bb(t, n, r, e);
}, Ob = "math_inline", Hb = "zt-md-math-inline-edit", _t = new ke(Hb), Lr = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable, Ar = (e) => (e == null ? void 0 : e.type.name) === Ob, Fb = (e) => String(e.attrs.value ?? e.textContent ?? ""), mi = (e, t, n) => {
  Lr(e) && e.dispatch(
    e.state.tr.setMeta(_t, {
      type: "open",
      position: t,
      // 默认将光标置于末尾，兼容点击进入编辑的既有行为。
      caret: (n == null ? void 0 : n.caret) === "start" ? "start" : "end"
    })
  );
};
class $b {
  /**
   * 初始化行内公式编辑器插件视图。
   */
  constructor(t, n) {
    // 编辑器视图。
    m(this, "view");
    // 编辑器文案。
    m(this, "messages");
    // 编辑器宿主节点。
    m(this, "host");
    // 源码输入框。
    m(this, "sourceInput");
    // 渲染结果容器。
    m(this, "previewContainer");
    // 渲染错误提示节点。
    m(this, "errorContainer");
    // 当前编辑节点位置。
    m(this, "currentPosition", null);
    // 当前承载编辑器的行内公式 DOM。
    m(this, "currentMathInlineElement", null);
    // 当前是否正在提交。
    m(this, "isCommitting", !1);
    // 当前进入输入框的光标落点。
    m(this, "currentCaret", "end");
    /**
     * 阻止编辑器控件点击抢走 ProseMirror 选区。
     */
    m(this, "handleMouseDown", (t) => {
      t.stopPropagation();
    });
    /**
     * 阻止原生输入事件冒泡到 ProseMirror。
     */
    m(this, "handleBeforeInput", (t) => {
      t.stopPropagation();
    });
    /**
     * 响应源码输入，更新本地预览。
     */
    m(this, "handleInput", (t) => {
      t.stopPropagation(), this.renderMath(this.sourceInput.value);
    });
    /**
     * 响应键盘提交或取消。
     */
    m(this, "handleKeyDown", (t) => {
      if (t.stopPropagation(), this.shouldDeleteMathInlineOnBackspace(t)) {
        t.preventDefault(), this.deleteCurrentMathInlineAndFocusEditor();
        return;
      }
      const n = this.resolveArrowExitTarget(t);
      if (n !== null) {
        t.preventDefault(), this.commitCurrentValue(n);
        return;
      }
      if (t.key === "Enter") {
        t.preventDefault(), this.commitCurrentValue();
        return;
      }
      t.key === "Escape" && (t.preventDefault(), this.closeEditor(!0));
    });
    /**
     * 失焦时提交当前输入。
     */
    m(this, "handleBlur", () => {
      this.isCommitting || this.currentPosition === null || this.commitCurrentValue();
    });
    /**
     * 编辑区重新获得焦点时关闭残留的行内公式编辑器。
     */
    m(this, "handleEditorFocusIn", (t) => {
      if (this.isCommitting || this.currentPosition === null)
        return;
      const n = t.target;
      n instanceof Node && this.host.contains(n) || this.commitCurrentValue();
    });
    this.view = t, this.messages = n, this.host = document.createElement("span"), this.host.className = "zt-md-math-inline-editor", this.host.hidden = !0, this.sourceInput = document.createElement("input"), this.sourceInput.type = "text", this.sourceInput.className = "zt-md-math-inline-editor-input", this.sourceInput.setAttribute("aria-label", this.messages.mathBlockSourceAriaLabel), this.sourceInput.spellcheck = !1, this.previewContainer = document.createElement("span"), this.previewContainer.className = "zt-md-math-inline-editor-preview", this.errorContainer = document.createElement("span"), this.errorContainer.className = "zt-md-math-inline-editor-error", this.errorContainer.hidden = !0, this.host.append(this.sourceInput, this.previewContainer, this.errorContainer), this.sourceInput.addEventListener("input", this.handleInput), this.sourceInput.addEventListener("beforeinput", this.handleBeforeInput), this.sourceInput.addEventListener("keydown", this.handleKeyDown), this.sourceInput.addEventListener("blur", this.handleBlur), this.host.addEventListener("mousedown", this.handleMouseDown), this.view.dom.addEventListener("focusin", this.handleEditorFocusIn), this.update(t);
  }
  /**
   * 创建稳定的文本选区，避免极端位置构造失败。
   */
  createSafeTextSelection(t, n) {
    try {
      return de.create(t, n);
    } catch {
      return de.near(t.resolve(n), -1);
    }
  }
  /**
   * 判断当前 input 是否应通过方向键回到编辑器光标。
   */
  resolveArrowExitTarget(t) {
    if (this.currentPosition === null)
      return null;
    const n = this.resolveCurrentNode();
    if (!n)
      return null;
    const o = this.sourceInput.selectionStart, r = this.sourceInput.selectionEnd;
    if (o === null || r === null || o !== r)
      return null;
    if (t.key === "ArrowLeft" && o === 0)
      return this.currentPosition;
    if (t.key === "ArrowUp")
      return this.currentPosition;
    const i = this.sourceInput.value.length;
    return t.key === "ArrowRight" && o === i ? this.currentPosition + n.nodeSize : t.key === "ArrowDown" ? this.currentPosition + n.nodeSize : null;
  }
  /**
   * 判断当前 input 是否命中首位 Backspace 删除整节点。
   */
  shouldDeleteMathInlineOnBackspace(t) {
    if (t.key !== "Backspace" || this.currentPosition === null)
      return !1;
    const n = this.sourceInput.selectionStart, o = this.sourceInput.selectionEnd;
    return n === null || o === null || n !== 0 || o !== 0 ? !1 : !!this.resolveCurrentNode();
  }
  /**
   * 删除当前行内公式并将焦点回退到编辑器文本光标。
   */
  deleteCurrentMathInlineAndFocusEditor() {
    if (this.currentPosition === null)
      return;
    const t = this.resolveCurrentNode();
    if (!t) {
      this.closeEditor(!1);
      return;
    }
    const n = this.currentPosition, o = this.currentPosition + t.nodeSize, r = this.view.state.tr.delete(n, o);
    r.setSelection(this.createSafeTextSelection(r.doc, n)).setMeta(_t, { type: "close" }).scrollIntoView(), this.view.dispatch(r), this.view.focus();
  }
  /**
   * 渲染公式预览。
   */
  renderMath(t) {
    this.errorContainer.hidden = !0, this.errorContainer.textContent = "", this.previewContainer.textContent = "";
    try {
      Vn.render(t, this.previewContainer, {
        displayMode: !1,
        throwOnError: !0
      });
    } catch {
      this.previewContainer.textContent = t, this.errorContainer.hidden = !1, this.errorContainer.textContent = this.messages.mathRenderError;
    }
  }
  /**
   * 读取当前编辑的行内公式节点。
   */
  resolveCurrentNode() {
    if (this.currentPosition === null)
      return null;
    const t = this.view.state.doc.nodeAt(this.currentPosition);
    return Ar(t) ? t : null;
  }
  /**
   * 打开编辑器并载入源码。
   */
  openEditor(t) {
    if (!Lr(this.view)) {
      this.closeEditor(!1);
      return;
    }
    const n = this.view.state.doc.nodeAt(t);
    if (!Ar(n)) {
      this.closeEditor(!1);
      return;
    }
    this.currentPosition = t, this.sourceInput.value = Fb(n), this.renderMath(this.sourceInput.value);
    const o = this.resolveMathInlineElement(t);
    if (!o) {
      this.closeEditor(!1);
      return;
    }
    this.currentMathInlineElement = o, o.dataset.editing = "true", o.append(this.host), this.host.hidden = !1, requestAnimationFrame(() => {
      if (this.currentPosition !== t)
        return;
      this.sourceInput.focus();
      const r = this.sourceInput.value.length;
      if (this.currentCaret === "start") {
        this.sourceInput.setSelectionRange(0, 0);
        return;
      }
      this.sourceInput.setSelectionRange(r, r);
    });
  }
  /**
   * 提交当前输入值。
   */
  commitCurrentValue(t) {
    if (this.currentPosition === null)
      return;
    const n = this.resolveCurrentNode();
    if (!n) {
      this.closeEditor(!1);
      return;
    }
    const o = this.sourceInput.value, r = typeof t == "number" ? t : this.currentPosition + n.nodeSize, i = this.view.state.tr.setNodeMarkup(this.currentPosition, void 0, {
      ...n.attrs,
      value: o
    });
    i.setSelection(this.createSafeTextSelection(i.doc, r)).setMeta(_t, { type: "close" }).scrollIntoView(), this.isCommitting = !0, this.view.dispatch(i), this.isCommitting = !1, this.view.focus();
  }
  /**
   * 关闭编辑器。
   */
  closeEditor(t) {
    this.currentMathInlineElement && (this.currentMathInlineElement.dataset.editing = "false"), this.currentPosition = null, this.currentMathInlineElement = null, this.host.hidden = !0, this.host.remove(), t && this.view.dispatch(this.view.state.tr.setMeta(_t, { type: "close" }));
  }
  /**
   * 解析当前行内公式 DOM。
   */
  resolveMathInlineElement(t) {
    const n = this.view.nodeDOM(t);
    return n instanceof HTMLElement ? n : null;
  }
  /**
   * 同步插件状态与视图。
   */
  update(t) {
    if (this.view = t, !Lr(t)) {
      this.closeEditor(!1);
      return;
    }
    const n = _t.getState(t.state);
    if (!n || n.position === null) {
      this.currentPosition !== null && this.closeEditor(!1);
      return;
    }
    if (this.currentPosition !== n.position) {
      this.currentCaret = n.caret, this.openEditor(n.position);
      return;
    }
    if (!this.resolveCurrentNode()) {
      this.closeEditor(!0);
      return;
    }
  }
  /**
   * 销毁插件视图。
   */
  destroy() {
    this.sourceInput.removeEventListener("input", this.handleInput), this.sourceInput.removeEventListener("beforeinput", this.handleBeforeInput), this.sourceInput.removeEventListener("keydown", this.handleKeyDown), this.sourceInput.removeEventListener("blur", this.handleBlur), this.host.removeEventListener("mousedown", this.handleMouseDown), this.view.dom.removeEventListener("focusin", this.handleEditorFocusIn), this.closeEditor(!1);
  }
}
const jb = (e, t) => ue(() => new ye({
  key: _t,
  state: {
    init: () => ({ position: null, caret: "end" }),
    apply: (n, o) => {
      const r = n.getMeta(_t);
      if ((r == null ? void 0 : r.type) === "open" && typeof r.position == "number")
        return { position: r.position, caret: r.caret === "start" ? "start" : "end" };
      if ((r == null ? void 0 : r.type) === "close")
        return { position: null, caret: "end" };
      if (o.position === null || !n.docChanged)
        return o;
      const i = n.mapping.map(o.position, -1), s = n.doc.nodeAt(i);
      return Ar(s) ? { position: i, caret: o.caret } : { position: null, caret: "end" };
    }
  },
  view: (n) => new $b(n, e)
})), oa = "math_inline", Kb = (e) => typeof e != "function" ? null : e(), ar = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable, Wb = (e) => String(e.attrs.value ?? e.textContent ?? "");
class Ub {
  /**
   * 初始化行内公式视图。
   */
  constructor(t, n, o, r) {
    // 当前节点快照。
    m(this, "node");
    // 节点根容器。
    m(this, "dom");
    // 编辑器视图。
    m(this, "view");
    // 节点位置获取器。
    m(this, "getPos");
    // 编辑器文案。
    m(this, "messages");
    // 渲染结果容器。
    m(this, "previewContainer");
    // 渲染错误提示节点。
    m(this, "errorContainer");
    /**
     * 只读模式下阻断按下事件,避免 ProseMirror 进入节点选中态。
     */
    m(this, "handleMouseDown", (t) => {
      ar(this.view) || (t.preventDefault(), t.stopPropagation());
    });
    /**
     * 响应行内公式点击,交给独立插件打开编辑器。
     */
    m(this, "handleClick", (t) => {
      if (t.preventDefault(), t.stopPropagation(), !ar(this.view))
        return;
      const n = Kb(this.getPos);
      n !== null && mi(this.view, n);
    });
    this.node = t, this.view = n, this.getPos = o, this.messages = r, this.dom = document.createElement("span"), this.dom.dataset.type = oa, this.dom.className = "zt-md-math-inline", this.dom.dataset.editing = "false", this.syncEditableState(), this.previewContainer = document.createElement("span"), this.previewContainer.className = "zt-md-math-inline-preview", this.errorContainer = document.createElement("span"), this.errorContainer.className = "zt-md-math-inline-error", this.errorContainer.hidden = !0, this.dom.append(this.previewContainer, this.errorContainer), this.syncFromNode(t), this.dom.addEventListener("mousedown", this.handleMouseDown), this.dom.addEventListener("click", this.handleClick);
  }
  /**
   * 同步行内公式可编辑状态标记,供样式层判断只读态。
   */
  syncEditableState() {
    this.dom.dataset.editable = ar(this.view) ? "true" : "false";
  }
  /**
   * 更新 DOM 与渲染结果。
   */
  syncFromNode(t) {
    const n = Wb(t);
    this.dom.dataset.value = n, this.renderMath(n);
  }
  /**
   * 渲染公式预览。
   */
  renderMath(t) {
    this.errorContainer.hidden = !0, this.errorContainer.textContent = "", this.previewContainer.textContent = "";
    try {
      Vn.render(t, this.previewContainer, {
        displayMode: !1,
        throwOnError: !0
      });
    } catch {
      this.previewContainer.textContent = t, this.errorContainer.hidden = !1, this.errorContainer.textContent = this.messages.mathRenderError;
    }
  }
  /**
   * 处理节点更新。
   */
  update(t) {
    return t.type.name !== oa ? !1 : (this.node = t, this.syncEditableState(), this.syncFromNode(t), !0);
  }
  /**
   * 阻止编辑控件事件落回编辑器默认选区逻辑。
   */
  stopEvent(t) {
    const n = t.target;
    return n instanceof Element ? t.type === "click" || !!n.closest(".zt-md-math-inline-editor") : t.type === "click";
  }
  /**
   * 忽略 NodeView 内部的 DOM 变更观察。
   */
  ignoreMutation() {
    return !0;
  }
  /**
   * 销毁时解绑监听器。
   */
  destroy() {
    this.dom.removeEventListener("mousedown", this.handleMouseDown), this.dom.removeEventListener("click", this.handleClick);
  }
}
const Vb = (e = Qe()) => (t, n, o) => {
  const r = typeof o == "function" ? () => {
    const i = o();
    return typeof i == "number" ? i : 0;
  } : !1;
  return new Ub(t, n, r, e);
}, pi = "math_inline", qb = "zt-md-math-inline-arrow-navigation", ql = {
  ArrowLeft: { positionKey: "from" },
  ArrowRight: { positionKey: "to" }
}, Gl = {
  ArrowLeft: "end",
  ArrowRight: "start"
}, Xl = {
  Backspace: "before",
  Delete: "after"
}, Un = (e) => e instanceof Element ? !!e.closest(".zt-md-math-inline-editor") : !1, fi = (e) => (e == null ? void 0 : e.type.name) === pi, Gb = (e) => !Xl[e.key] || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || Un(e.target) || Un(document.activeElement), Xb = (e, t) => {
  if (!ql[t.key] || Un(t.target))
    return !1;
  const { selection: o } = e.state;
  return !(o instanceof Ae) || o.node.type.name !== pi ? !1 : (t.preventDefault(), mi(e, o.from, { caret: Gl[t.key] ?? "end" }), !0);
}, Yb = (e, t) => {
  const n = ql[t.key];
  if (!n || Un(t.target))
    return !1;
  const { selection: o } = e.state;
  if (!o.empty)
    return !1;
  const r = o.$from, i = n.positionKey === "from" ? r.nodeBefore : r.nodeAfter;
  if (!fi(i))
    return !1;
  t.preventDefault();
  const s = n.positionKey === "from" ? o.from - i.nodeSize : o.from;
  return mi(e, s, { caret: Gl[t.key] ?? "end" }), !0;
}, Zb = (e, t) => {
  try {
    return de.create(e, t);
  } catch {
    return de.near(e.resolve(t), -1);
  }
}, Jb = (e, t, n) => {
  n.preventDefault();
  const o = t.from, r = e.state.tr.delete(t.from, t.to), i = r.doc.content.size, s = Math.min(o, i);
  return r.setSelection(Zb(r.doc, s)).scrollIntoView(), e.dispatch(r), e.focus(), !0;
}, Qb = (e, t) => {
  const n = Xl[t.key];
  if (!n)
    return !1;
  const { selection: o } = e.state;
  if (!o.empty)
    return !1;
  const r = o.$from, i = n === "before" ? r.nodeBefore : r.nodeAfter;
  if (!fi(i))
    return !1;
  t.preventDefault();
  const s = n === "before" ? o.from - i.nodeSize : o.from;
  return e.dispatch(
    e.state.tr.setSelection(Ae.create(e.state.doc, s)).scrollIntoView()
  ), e.focus(), !0;
}, ey = (e, t) => {
  if (Gb(t))
    return !1;
  const { selection: n } = e.state;
  return n instanceof Ae && fi(n.node) ? Jb(e, n, t) : Qb(e, t);
}, ty = (e, t) => {
  if (Un(document.activeElement))
    return !1;
  const { selection: n } = e.state;
  if (!(n instanceof Ae) || n.node.type.name !== pi)
    return !1;
  const o = n.to, r = o + t.length, i = e.state.tr.insertText(t, o, o);
  return i.setSelection(de.create(i.doc, r)).scrollIntoView(), e.dispatch(i), e.focus(), !0;
}, ny = ue(() => new ye({
  key: new ke(qb),
  props: {
    handleKeyDown: (e, t) => Yb(e, t) || ey(e, t) ? !0 : Xb(e, t),
    handleTextInput: (e, t, n, o) => ty(e, o)
  }
})), go = "math_inline", bo = "math_block", oy = /(?:\$)([^$]+)(?:\$)$/, ry = /^\$\$\s$/, iy = We("remarkMath", () => hu), gi = Ld({}, "katexOptions"), Yl = Ke(go, (e) => ({
  group: "inline",
  inline: !0,
  atom: !0,
  attrs: {
    value: {
      default: ""
    }
  },
  parseDOM: [
    {
      tag: `span[data-type="${go}"]`,
      getAttrs: (t) => {
        const n = t;
        return {
          value: n.dataset.value ?? n.textContent ?? ""
        };
      }
    }
  ],
  toDOM: (t) => {
    const n = String(t.attrs.value ?? t.textContent ?? ""), o = document.createElement("span");
    o.dataset.type = go, o.dataset.value = n;
    try {
      Vn.render(n, o, e.get(gi.key));
    } catch {
      o.textContent = n, o.classList.add("zt-md-math-inline-error");
    }
    return o;
  },
  parseMarkdown: {
    match: (t) => t.type === "inlineMath",
    runner: (t, n, o) => {
      const r = String(n.value ?? "");
      t.addNode(o, { value: r });
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === go,
    runner: (t, n) => {
      const o = String(n.attrs.value ?? n.textContent ?? "");
      t.addNode("inlineMath", void 0, o);
    }
  }
})), Zl = Ke(bo, (e) => ({
  content: "text*",
  group: "block",
  marks: "",
  defining: !0,
  atom: !0,
  isolating: !0,
  attrs: {
    value: {
      default: ""
    }
  },
  parseDOM: [
    {
      tag: `div[data-type="${bo}"]`,
      preserveWhitespace: "full",
      getAttrs: (t) => ({
        value: t.dataset.value ?? ""
      })
    }
  ],
  toDOM: (t) => {
    const n = String(t.attrs.value ?? ""), o = document.createElement("div");
    o.dataset.type = bo, o.dataset.value = n;
    try {
      Vn.render(n, o, e.get(gi.key));
    } catch {
      o.textContent = n, o.classList.add("zt-md-math-inline-error");
    }
    return o;
  },
  parseMarkdown: {
    match: (t) => t.type === "math",
    runner: (t, n, o) => {
      const r = String(n.value ?? "");
      t.addNode(o, { value: r });
    }
  },
  toMarkdown: {
    match: (t) => t.type.name === bo,
    runner: (t, n) => {
      const o = String(n.attrs.value ?? "");
      t.addNode("math", void 0, o);
    }
  }
})), sy = Kt((e) => new pn(oy, (t, n, o, r) => {
  const i = Yl.type(e), s = n[1] ?? "", a = t.doc.resolve(o);
  return a.parent.canReplaceWith(a.index(), a.indexAfter(), i) ? t.tr.replaceWith(o, r, i.create({ value: s })) : null;
})), ay = Kt((e) => new pn(ry, (t, n, o, r) => {
  const i = t.doc.resolve(o), s = Zl.type(e);
  return i.node(-1).canReplaceWith(i.index(-1), i.indexAfter(-1), s) ? t.tr.delete(o, r).setBlockType(o, o, s) : null;
})), ly = [
  iy,
  gi,
  Yl,
  Zl,
  ay,
  sy
].flat(), gt = "csvdata", cy = /* @__PURE__ */ new Set(["csvdata", "csv"]), Jl = (e) => {
  const t = e.children;
  if (Array.isArray(t))
    for (let n = 0; n < t.length; n += 1) {
      const o = t[n];
      if (o) {
        if (o.type === "code" && typeof o.lang == "string" && cy.has(o.lang.trim().toLowerCase())) {
          t[n] = {
            type: gt,
            value: typeof o.value == "string" ? o.value : ""
          };
          continue;
        }
        Jl(o);
      }
    }
}, dy = We("remarkMtable", () => () => (t) => {
  Jl(t);
}), uy = Ke(gt, () => ({
  group: "block",
  atom: !0,
  isolating: !0,
  // 注意:不设 draggable——PM 会给节点 DOM 写原生 draggable 属性,
  // canvas 内框选单元格的按下拖动会误触发整块表格的浏览器拖拽。
  attrs: {
    value: {
      default: ""
    }
  },
  parseDOM: [
    {
      tag: `div[data-type="${gt}"]`,
      getAttrs: (e) => ({
        value: e.dataset.value ?? ""
      })
    }
  ],
  toDOM: (e) => {
    const t = String(e.attrs.value ?? ""), n = document.createElement("div");
    n.dataset.type = gt, n.dataset.value = t, n.className = "zt-md-mtable-block";
    const o = document.createElement("pre");
    return o.textContent = t, n.appendChild(o), n;
  },
  parseMarkdown: {
    match: (e) => e.type === gt,
    runner: (e, t, n) => {
      const o = String(t.value ?? "");
      e.addNode(n, { value: o });
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === gt,
    runner: (e, t) => {
      const n = String(t.attrs.value ?? "");
      e.addNode("code", void 0, n, { lang: "csvdata" });
    }
  }
})), hy = [dy, uy].flat(), Ir = "zt-md:outside-press";
let ra = !1;
const my = () => {
  ra || (ra = !0, document.addEventListener(
    "pointerdown",
    (e) => {
      document.dispatchEvent(new CustomEvent(Ir, { detail: { event: e } }));
    },
    !0
  ));
}, py = (e) => {
  my();
  const t = (n) => {
    const o = n.detail;
    o && e(o.event);
  };
  return document.addEventListener(Ir, t), () => {
    document.removeEventListener(Ir, t);
  };
}, fy = 300, gy = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="14" x2="21" y1="10" y2="3"/><line x1="3" x2="10" y1="21" y2="14"/><line x1="10" x2="3" y1="14" y2="21"/></svg>', by = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>', yy = (e) => typeof e != "function" ? null : e(), ia = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable;
class ky {
  /**
   * 初始化 CSV 表格块视图并挂载 mtable 实例。
   */
  constructor(t, n, o, r) {
    // 当前节点快照。
    m(this, "node");
    // 节点根容器。
    m(this, "dom");
    // 编辑器视图。
    m(this, "view");
    // 编辑器文案语言。
    m(this, "locale");
    // 节点位置获取器。
    m(this, "getPos");
    // mtable 挂载宿主。
    m(this, "host");
    // 左上角全屏按钮(行头列 × 列头行交叉的小方块)。
    m(this, "expandButton");
    // mtable 实例。
    m(this, "mtable");
    // 编辑器内容区外部点击监听(清除表格内选区,捕获阶段)。
    m(this, "handleEditorMouseDown");
    // 外部按下广播退订函数(桥接 mtable 浮层关闭,销毁时退订)。
    m(this, "unsubscribeOutsidePress");
    // 全屏 dialog 运行态(null = 未打开)。
    m(this, "fullscreenDialog", null);
    /**
     * 全屏按钮点击:弹出最大化 dialog 展示表格。
     */
    m(this, "handleExpandClick", () => {
      this.openFullscreenDialog();
    });
    /**
     * 关闭最大化 dialog:mtable 宿主搬回文档流并恢复嵌入态高度。
     */
    m(this, "closeFullscreenDialog", () => {
      const t = this.fullscreenDialog;
      t && (this.fullscreenDialog = null, this.mtable.setOverlayContainer(null), document.removeEventListener("keydown", t.handleKeyDown), t.host.remove(), this.dom.insertBefore(this.host, this.expandButton), this.syncHostHeight(), this.mtable.focus());
    });
    /**
     * mtable 内容变更 → 写回节点 value attr。
     * (update() 收到本次事务后会因 attr 与表格内容一致而跳过 setCsv 回填,无回环。
     *  CRLF 规范为 LF:markdown 围栏内容用 LF 存储,避免行尾噪声。)
     * mtable 内部 undo/redo 回放(addToHistory:false)不进 PM 历史,
     * 与 jsondata-view-node-view 对齐,避免双轨撤销互相串联。
     */
    m(this, "handleCsvChange", (t, n = "input") => {
      const o = t.replace(/\r\n/g, `
`), r = yy(this.getPos);
      if (r === null || String(this.node.attrs.value ?? "") === o)
        return;
      const i = this.view.state.tr.setNodeMarkup(r, void 0, {
        ...this.node.attrs,
        value: o
      });
      (n === "undo" || n === "redo") && i.setMeta("addToHistory", !1), i.docChanged && this.view.dispatch(i), this.syncHostHeight();
    });
    this.node = t, this.view = n, this.locale = r, this.getPos = o, this.dom = document.createElement("div"), this.dom.dataset.type = gt, this.dom.className = "zt-md-mtable-block", this.syncEditableState(), this.host = document.createElement("div"), this.host.className = "zt-md-mtable-host", this.dom.appendChild(this.host), this.expandButton = document.createElement("button"), this.expandButton.type = "button", this.expandButton.className = "zt-md-mtable-expand", this.expandButton.innerHTML = gy, this.expandButton.title = this.resolveExpandTitle(), this.expandButton.setAttribute("aria-label", this.expandButton.title), this.expandButton.addEventListener("click", this.handleExpandClick), this.dom.appendChild(this.expandButton);
    const i = String(t.attrs.value ?? "");
    this.mtable = Dh({
      root: this.host,
      defaultValue: i,
      readOnly: !ia(n),
      locale: r,
      // meditor 嵌入采用自动加行模式:数据末尾保留 1 行可输入空行,
      // 表格有底——滚到顶/底后滚轮交给编辑区滚动(scroll chaining)。
      rowMode: "autoAppendRows",
      // 列自动增加:最少 10 列;总列宽不足可视宽度时按 10 列的倍数补列直至覆盖
      // (宿主宽度始终 100%,列覆盖由 mtable 内部在尺寸变化时保证)。
      colMode: "autoAppendCols",
      onChange: this.handleCsvChange,
      // 拖拽列宽/自动换行重算等布局变化不产生 CSV 变更,经此回调同步宿主高度。
      onLayoutChange: () => this.syncHostHeight()
    }), this.syncHostHeight(), this.handleEditorMouseDown = (s) => {
      s.target instanceof Node && this.dom.contains(s.target) || this.mtable.getSelection() !== null && this.mtable.clearSelection();
    }, n.dom.addEventListener("mousedown", this.handleEditorMouseDown, !0), this.unsubscribeOutsidePress = py((s) => {
      this.mtable.notifyOutsidePress(s);
    });
  }
  /**
   * 同步 CSV 表格块可编辑状态标记,供样式层判断只读态(全屏按钮文案随之切换)。
   */
  syncEditableState() {
    const t = this.dom.dataset.editable;
    this.dom.dataset.editable = ia(this.view) ? "true" : "false", this.expandButton && t !== void 0 && t !== this.dom.dataset.editable && (this.expandButton.title = this.resolveExpandTitle(), this.expandButton.setAttribute("aria-label", this.expandButton.title));
  }
  /**
   * 自适应宿主高度:以网格内容高(列头 + 行高合计)为准,上限 MTABLE_MAX_HEIGHT,
   * 超出后内部滚动。
   */
  syncHostHeight() {
    this.fullscreenDialog || (this.host.style.height = `${Math.min(this.mtable.getContentHeight(), fy)}px`);
  }
  /**
   * 全屏按钮提示文案:可编辑态为"全屏编辑表格",只读态为"放大查看"。
   */
  resolveExpandTitle() {
    const t = this.dom.dataset.editable === "false";
    return this.locale === "en-US" ? t ? "View table fullscreen" : "Open table fullscreen" : t ? "放大查看表格" : "全屏编辑表格";
  }
  /**
   * 打开最大化 dialog:把 mtable 宿主整体搬进 body 弹窗(单实例搬移——
   * 选区/撤销栈/单元格编辑态连续),尺寸变化由 mtable 内部 ResizeObserver
   * 触发重渲染自适应;onChange 照常写回节点 attr,无需额外同步。
   */
  openFullscreenDialog() {
    if (this.fullscreenDialog)
      return;
    const t = this.locale === "en-US" ? "Table" : "表格", n = ip(this.view.dom, "zt-md-mtable-fullscreen-host"), o = document.createElement("div");
    o.className = "zt-md-mtable-fullscreen-overlay";
    const r = document.createElement("div");
    r.className = "zt-md-mtable-fullscreen-window", r.setAttribute("role", "dialog"), r.setAttribute("aria-label", t);
    const i = document.createElement("div");
    i.className = "zt-md-mtable-fullscreen-header";
    const s = document.createElement("span");
    s.className = "zt-md-mtable-fullscreen-title", s.textContent = t;
    const a = document.createElement("button");
    a.type = "button", a.className = "zt-md-mtable-fullscreen-close", a.innerHTML = by, a.title = this.locale === "en-US" ? "Close (Esc)" : "关闭 (Esc)", a.setAttribute("aria-label", a.title), a.addEventListener("click", this.closeFullscreenDialog), i.append(s, a);
    const l = document.createElement("div");
    l.className = "zt-md-mtable-fullscreen-body", l.appendChild(this.host), this.host.style.height = "100%", r.append(i, l), o.appendChild(r), n.appendChild(o), this.mtable.setOverlayContainer(n);
    const c = (d) => {
      d.key !== "Escape" || d.defaultPrevented || (d.preventDefault(), this.closeFullscreenDialog());
    };
    document.addEventListener("keydown", c), this.fullscreenDialog = { host: n, handleKeyDown: c }, this.mtable.focus();
  }
  /**
   * 处理节点更新:外部变更(setMarkdown/受控回填)回填到表格。
   */
  update(t) {
    if (t.type.name !== gt)
      return !1;
    this.node = t, this.syncEditableState();
    const n = String(t.attrs.value ?? "");
    return n !== this.mtable.getCsv().replace(/\r\n/g, `
`) && this.mtable.setCsv(n), this.syncHostHeight(), !0;
  }
  /**
   * 节点被选中时高亮边框。
   */
  selectNode() {
    this.dom.dataset.selected = "true";
  }
  /**
   * 节点取消选中时移除高亮。
   */
  deselectNode() {
    delete this.dom.dataset.selected;
  }
  /**
   * 表格内部事件全部就地消费(键鼠/滚轮/剪贴板/右键菜单)。
   */
  stopEvent(t) {
    const n = t.target;
    return n instanceof Node ? this.dom.contains(n) : !1;
  }
  /**
   * 忽略 NodeView 内部的 DOM 变更观察(canvas 渲染不产生可观察文本变更)。
   */
  ignoreMutation() {
    return !0;
  }
  /**
   * 销毁 mtable 实例(含右键菜单清理)、全屏弹窗与各监听。
   */
  destroy() {
    this.fullscreenDialog && this.closeFullscreenDialog(), this.expandButton.removeEventListener("click", this.handleExpandClick), this.view.dom.removeEventListener("mousedown", this.handleEditorMouseDown, !0), this.unsubscribeOutsidePress(), this.mtable.destroy();
  }
}
const wy = (e = "zh-CN") => (t, n, o) => {
  const r = typeof o == "function" ? () => {
    const i = o();
    return typeof i == "number" ? i : 0;
  } : !1;
  return new ky(t, n, r, e);
}, sa = "meditor-layout", Ql = (e) => {
  if (typeof e != "string")
    return !1;
  const t = e.trim().toLowerCase();
  return t === sa || t.startsWith(`${sa}:`);
}, vy = /^ {0,3}(`{3,}|~{3,})[ \t]*(.*)$/, ec = (e) => {
  const t = new RegExp(`^ {0,3}\\${e.charAt(0)}{${e.length},}\\s*$`);
  return (n) => t.test(n);
}, tc = (e) => {
  const t = vy.exec(e);
  if (!t)
    return null;
  const n = t[1] ?? "", o = (t[2] ?? "").trim(), r = o.split(/\s+/)[0] ?? "";
  if (!Ql(r))
    return null;
  const i = o.slice(r.length).trim();
  return { marker: n, lang: r, meta: i.length > 0 ? i : null };
}, V1 = (e) => {
  const t = e.split(`
`), n = [];
  let o = 0;
  for (; o < t.length; ) {
    const r = t[o] ?? "";
    o += 1;
    const i = tc(r);
    if (!i)
      continue;
    const s = ec(i.marker), a = [];
    for (; o < t.length; ) {
      const l = t[o] ?? "";
      if (o += 1, s(l))
        break;
      a.push(l);
    }
    n.push({ lang: i.lang, meta: i.meta, value: a.join(`
`) });
  }
  return n;
}, Cy = (e) => {
  const t = e.split(`
`), n = [];
  let o = 0;
  for (; o < t.length; ) {
    const r = t[o] ?? "", i = tc(r);
    if (!i) {
      n.push(r), o += 1;
      continue;
    }
    const s = ec(i.marker);
    for (o += 1; o < t.length; ) {
      const a = t[o] ?? "";
      if (o += 1, s(a))
        break;
    }
  }
  return n.join(`
`);
}, ot = "meditor_layout", Ln = "meditor-layout", nc = (e) => {
  const t = e.children;
  if (Array.isArray(t))
    for (let n = 0; n < t.length; n += 1) {
      const o = t[n];
      if (o) {
        if (o.type === "code" && Ql(o.lang)) {
          t[n] = {
            type: ot,
            lang: o.lang,
            meta: typeof o.meta == "string" ? o.meta : null,
            value: typeof o.value == "string" ? o.value : ""
          };
          continue;
        }
        nc(o);
      }
    }
}, Ey = We(
  "remarkMeditorLayout",
  () => () => (t) => {
    nc(t);
  }
), zy = Ke(ot, () => ({
  group: "block",
  atom: !0,
  isolating: !0,
  // 不设 draggable:布局块在正常模式完全隐藏,拖拽无意义且会放大误操作面。
  attrs: {
    // 围栏内容原文(黑盒保存,字节级往返)。
    value: {
      default: ""
    },
    // 原始围栏 lang(保留大小写与 :kind 后缀)。
    lang: {
      default: Ln
    },
    // 原始 info string 中 lang 之后的剩余部分(无则为 null)。
    meta: {
      default: null
    }
  },
  parseDOM: [
    {
      tag: `div[data-type="${ot}"]`,
      getAttrs: (e) => {
        const t = e;
        return {
          value: t.dataset.value ?? "",
          lang: t.dataset.lang || Ln,
          meta: t.dataset.meta ?? null
        };
      }
    }
  ],
  toDOM: (e) => {
    const t = String(e.attrs.value ?? ""), n = document.createElement("div");
    n.dataset.type = ot, n.dataset.value = t;
    const o = String(e.attrs.lang ?? Ln);
    n.dataset.lang = o;
    const r = e.attrs.meta;
    typeof r == "string" && r.length > 0 && (n.dataset.meta = r), n.className = "zt-md-layout-block";
    const i = document.createElement("pre");
    return i.textContent = t, n.appendChild(i), n;
  },
  parseMarkdown: {
    match: (e) => e.type === ot,
    runner: (e, t, n) => {
      const o = String(t.value ?? ""), r = typeof t.lang == "string" && t.lang.length > 0 ? t.lang : Ln, i = typeof t.meta == "string" && t.meta.length > 0 ? t.meta : null;
      e.addNode(n, { value: o, lang: r, meta: i });
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === ot,
    runner: (e, t) => {
      const n = String(t.attrs.value ?? ""), o = String(t.attrs.lang ?? Ln), r = t.attrs.meta;
      e.addNode("code", void 0, n, {
        lang: o,
        meta: typeof r == "string" && r.length > 0 ? r : null
      });
    }
  }
})), My = [Ey, zy].flat(), Ty = "meditor-layout:html", xy = "meditor-layout:js", Sy = (e) => typeof e != "string" ? !1 : e.trim().toLowerCase() === Ty, Ly = (e) => typeof e != "string" ? !1 : e.trim().toLowerCase() === xy, Ay = /* @__PURE__ */ new Set(["narrow", "normal", "wide", "full"]), Iy = /* @__PURE__ */ new Set(["left", "center", "right"]), Ry = /^[a-zA-Z0-9_-]{1,40}$/, Ny = 200, aa = (e) => typeof e != "string" || !Ry.test(e) || e.toLowerCase().startsWith("zt-md") ? null : e, Py = (e) => {
  if (typeof e != "string" || e.trim().length === 0)
    return null;
  let t;
  try {
    t = JSON.parse(e);
  } catch {
    return null;
  }
  if (typeof t != "object" || t === null || Array.isArray(t))
    return null;
  const n = t, o = n.scope === "next" || n.scope === "document", r = typeof n.width == "string" && Ay.has(n.width), i = n.class !== void 0, s = typeof n.heading == "string" && n.heading.trim().length > 0, a = n.hidden === !0, l = typeof n.align == "string" && Iy.has(n.align);
  if (!o && !r && !i && !s && !a && !l)
    return null;
  const c = {
    scope: n.scope === "document" ? "document" : "next",
    classes: []
  };
  if (r && (c.width = n.width), s) {
    const d = n.heading.trim().slice(0, Ny);
    d.length > 0 && (c.heading = d);
  }
  if (a && (c.hidden = !0), l && (c.align = n.align), typeof n.class == "string") {
    const d = aa(n.class);
    d !== null && c.classes.push(d);
  } else if (Array.isArray(n.class))
    for (const d of n.class) {
      const u = aa(d);
      u !== null && !c.classes.includes(u) && c.classes.push(u);
    }
  return c;
}, oc = "__meditorLayout", rc = "app", Dy = (e) => e.replace(/<\/(script)/gi, "<\\/$1"), By = (e) => e.replace(/<\/(script)/gi, "<\\/$1"), ic = `
var __post = function (msg) {
  msg[${JSON.stringify(oc)}] = true;
  parent.postMessage(msg, '*');
};
window.meditorLayout = {
  resize: function (h) { __post({ type: 'resize', height: Number(h) || 0 }); }
};
var __scheduled = false;
var __report = function () {
  if (__scheduled) return;
  __scheduled = true;
  requestAnimationFrame(function () {
    __scheduled = false;
    var b = document.body;
    __post({ type: 'resize', height: b ? Math.ceil(b.getBoundingClientRect().height) : 0 });
  });
};
window.addEventListener('load', __report);
window.addEventListener('resize', __report);
new MutationObserver(__report).observe(document.documentElement, { childList: true, subtree: true, attributes: true });`, _y = (e) => [
  '<!doctype html><html><head><meta charset="utf-8">',
  '<style>html,body{margin:0;padding:0;}body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",system-ui,sans-serif;font-size:14px;line-height:1.6;color:#1f2329;}</style>',
  `<script>${ic}<\/script>`,
  `</head><body><div id="${rc}"></div>`,
  `<script>${Dy(e)}<\/script>`,
  "</body></html>"
].join(""), Oy = (e) => [
  '<!doctype html><html><head><meta charset="utf-8">',
  '<style>html,body{margin:0;padding:0;}body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",system-ui,sans-serif;font-size:14px;line-height:1.6;color:#1f2329;}</style>',
  `<script>${ic}<\/script>`,
  `</head><body><div id="${rc}">`,
  By(e),
  "</div></body></html>"
].join(""), Hy = 300, Fy = 720, $y = 64, la = (e) => typeof e != "function" ? null : e(), jy = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable;
class Ky {
  /**
   * 初始化布局块视图(源码面板 + 渲染卡宿主)。
   */
  constructor(t, n, o, r, i = {}) {
    // 当前节点快照。
    m(this, "node");
    // 节点根容器。
    m(this, "dom");
    // 编辑器视图。
    m(this, "view");
    // 节点位置获取器。
    m(this, "getPos");
    // 编辑器文案。
    m(this, "messages");
    // 是否允许 :js 沙箱执行(宿主可关闭;关闭后 js 块与普通隐藏块同待遇)。
    m(this, "scriptEnabled");
    // 源码面板(头部 + 编辑区;布局模式显示)。
    m(this, "panel");
    // info string 徽标(lang + meta)。
    m(this, "langBadge");
    // 内容行数徽标。
    m(this, "lineCountBadge");
    // 删除按钮。
    m(this, "deleteButton");
    // 源码编辑区。
    m(this, "editor");
    // 渲染卡宿主(html kind 且正常模式显示)。
    m(this, "renderHost");
    // 沙箱展示 iframe。
    m(this, "iframe");
    // 布局模式切换观察器:块在隐藏态挂载时尺寸不可量,模式切换/展开后需重新
    // 自适应与切换视图。
    m(this, "modeObserver", null);
    // 输入防抖定时器(销毁时清理)。
    m(this, "writebackTimer", null);
    /**
     * 沙箱的 resize 消息桥:仅接受本 iframe contentWindow 发出的、带约定标记
     * 的 resize 消息,高度夹取到 [MIN, MAX](不透明 origin 下无法量高,高度完全
     * 由沙箱内脚手架引导上报;html kind 由脚手架引导脚本回报,js kind 的用户
     * 脚本可经 meditorLayout.resize 助手覆写)。
     */
    m(this, "handleRenderMessage", (t) => {
      const n = this.iframe;
      if (!n || t.source !== n.contentWindow)
        return;
      const o = t.data;
      if (!o || o[oc] !== !0 || o.type !== "resize")
        return;
      const r = Number(o.height);
      Number.isFinite(r) && (n.style.height = `${Math.min(Math.max(r, $y), Fy)}px`);
    });
    /**
     * 删除按钮:整块删除(布局模式下删除保护放行;正常模式按钮不可见,
     * html 渲染卡不含按钮,删除走布局模式源码面板)。
     */
    m(this, "handleDeleteClick", () => {
      const t = la(this.getPos);
      if (t === null)
        return;
      const n = this.view.state.tr.delete(t, t + this.node.nodeSize);
      this.view.dispatch(n), this.view.focus();
    });
    /**
     * textarea 输入 → 防抖写回节点 value attr。
     * (CRLF 规范为 LF:markdown 围栏内容用 LF 存储,避免行尾噪声。)
     */
    m(this, "handleEditorInput", () => {
      this.syncLineCount(this.editor.value), this.syncEditorHeight(), this.writebackTimer !== null && clearTimeout(this.writebackTimer), this.writebackTimer = setTimeout(this.flushWriteback, Hy);
    });
    /**
     * 写回当前 textarea 内容到节点 value attr(等值时跳过,避免无谓历史步)。
     */
    m(this, "flushWriteback", () => {
      this.writebackTimer = null;
      const t = la(this.getPos);
      if (t === null)
        return;
      const n = this.editor.value.replace(/\r\n/g, `
`);
      if (String(this.node.attrs.value ?? "") === n)
        return;
      const o = this.view.state.tr.setNodeMarkup(t, void 0, {
        ...this.node.attrs,
        value: n
      });
      o.docChanged && this.view.dispatch(o);
    });
    /**
     * textarea 内 Escape 交还编辑器焦点(布局模式下面板是独立编辑域)。
     */
    m(this, "handleEditorKeyDown", (t) => {
      t.key === "Escape" && (t.preventDefault(), this.view.focus());
    });
    this.node = t, this.view = n, this.getPos = o, this.messages = r, this.scriptEnabled = i.scriptEnabled ?? !0, this.dom = document.createElement("div"), this.dom.dataset.type = ot, this.dom.className = "zt-md-layout-block", this.panel = document.createElement("div"), this.panel.className = "zt-md-layout-block-panel";
    const s = document.createElement("div");
    s.className = "zt-md-layout-block-header", this.langBadge = document.createElement("span"), this.langBadge.className = "zt-md-layout-block-lang", s.appendChild(this.langBadge), this.lineCountBadge = document.createElement("span"), this.lineCountBadge.className = "zt-md-layout-block-lines", s.appendChild(this.lineCountBadge);
    const a = document.createElement("span");
    a.className = "zt-md-layout-block-spacer", s.appendChild(a), this.deleteButton = document.createElement("button"), this.deleteButton.type = "button", this.deleteButton.className = "zt-md-layout-block-delete", this.deleteButton.appendChild(
      Ie("trash", { size: 14, strokeWidth: 2, className: "zt-md-layout-block-delete-icon" })
    ), this.deleteButton.title = r.layoutBlockDeleteAriaLabel, this.deleteButton.setAttribute("aria-label", r.layoutBlockDeleteAriaLabel), this.deleteButton.addEventListener("click", this.handleDeleteClick), s.appendChild(this.deleteButton), this.panel.appendChild(s), this.editor = document.createElement("textarea"), this.editor.className = "zt-md-layout-block-editor", this.editor.spellcheck = !1, this.editor.setAttribute("aria-label", r.layoutBlockEditorAriaLabel), this.editor.addEventListener("input", this.handleEditorInput), this.editor.addEventListener("keydown", this.handleEditorKeyDown), this.panel.appendChild(this.editor), this.dom.appendChild(this.panel), this.renderHost = document.createElement("div"), this.renderHost.className = "zt-md-layout-block-render", this.iframe = document.createElement("iframe"), this.iframe.setAttribute("sandbox", ""), this.iframe.setAttribute("loading", "lazy"), this.iframe.title = r.layoutBlockRenderTitle, this.renderHost.appendChild(this.iframe), this.dom.appendChild(this.renderHost), window.addEventListener("message", this.handleRenderMessage), this.syncEditableState(), this.renderContent(), this.syncRenderView();
    const l = n.dom.closest(".zt-md");
    l && (this.modeObserver = new MutationObserver(() => {
      this.syncRenderView(), this.syncEditorHeight();
    }), this.modeObserver.observe(l, { attributes: !0, attributeFilter: ["data-layout-mode"] }));
  }
  /**
   * 判断布局模式是否生效。
   */
  isLayoutModeOn() {
    const t = this.view.dom.closest(".zt-md");
    return (t == null ? void 0 : t.getAttribute("data-layout-mode")) === "on";
  }
  /**
   * 同步可编辑状态标记(textarea 只读态与删除按钮禁用态随动)。
   */
  syncEditableState() {
    const t = jy(this.view);
    this.dom.dataset.editable = t ? "true" : "false", this.editor.readOnly = !t, this.deleteButton.disabled = !t;
  }
  /**
   * 渲染内容:徽标文案、textarea 值、行数与渲染卡视图。
   */
  renderContent() {
    const t = String(this.node.attrs.lang ?? "meditor-layout"), n = this.node.attrs.meta;
    this.langBadge.textContent = typeof n == "string" && n.length > 0 ? `${t} ${n}` : t;
    const o = String(this.node.attrs.value ?? "").replace(/\r\n/g, `
`);
    this.editor.value !== o && (this.editor.value = o), this.syncLineCount(o), this.syncEditorHeight(), this.syncRenderView();
  }
  /**
   * 同步行数徽标。
   */
  syncLineCount(t) {
    const n = t.length === 0 ? 0 : t.split(`
`).length;
    this.lineCountBadge.textContent = `${n} ${this.messages.layoutBlockLinesLabel}`;
  }
  /**
   * 编辑区自适应内容高度。
   */
  syncEditorHeight() {
    this.editor.style.height = "auto", this.editor.style.height = `${this.editor.scrollHeight}px`;
  }
  /**
   * 同步视图分支:html kind → 全禁沙箱展示卡(脚手架包装,内容原样内联,
   * postMessage 量高);js kind(且允许执行)→ 执行沙箱(脚手架包装,
   * allow-scripts,postMessage 量高);其余(布局模式 / 指令块 / 其他
   * kind / 禁用执行)→ 源码面板或保持隐藏。
   */
  syncRenderView() {
    const t = String(this.node.attrs.lang ?? ""), n = Sy(t), o = this.scriptEnabled && Ly(t), r = String(this.node.attrs.value ?? "");
    if ((n || o) && !this.isLayoutModeOn()) {
      const i = this.iframe;
      if (i) {
        const s = o ? "allow-scripts" : "", a = n ? Oy(r) : _y(r);
        i.getAttribute("sandbox") !== s && i.setAttribute("sandbox", s), i.getAttribute("srcdoc") !== a && i.setAttribute("srcdoc", a);
      }
      this.dom.dataset.view = "render";
      return;
    }
    delete this.dom.dataset.view;
  }
  /**
   * 处理节点更新:外部变更(setMarkdown/受控回填)回填 textarea 与渲染卡。
   */
  update(t) {
    return t.type.name !== ot ? !1 : (this.node = t, this.syncEditableState(), this.renderContent(), !0);
  }
  /**
   * 节点被选中时高亮边框。
   */
  selectNode() {
    this.dom.dataset.selected = "true";
  }
  /**
   * 节点取消选中时移除高亮。
   */
  deselectNode() {
    delete this.dom.dataset.selected;
  }
  /**
   * 面板/渲染卡内部事件全部就地消费(键鼠/剪贴板),不进 ProseMirror 事件管线。
   */
  stopEvent(t) {
    const n = t.target;
    return n instanceof Node ? this.dom.contains(n) : !1;
  }
  /**
   * 忽略 NodeView 内部的 DOM 变更观察(textarea/iframe 不产生可观察文本变更)。
   */
  ignoreMutation() {
    return !0;
  }
  /**
   * 销毁:清理防抖定时器、模式观察器与各监听。
   */
  destroy() {
    var t;
    this.writebackTimer !== null && (clearTimeout(this.writebackTimer), this.writebackTimer = null), (t = this.modeObserver) == null || t.disconnect(), window.removeEventListener("message", this.handleRenderMessage), this.deleteButton.removeEventListener("click", this.handleDeleteClick), this.editor.removeEventListener("input", this.handleEditorInput), this.editor.removeEventListener("keydown", this.handleEditorKeyDown);
  }
}
const Wy = (e, t = {}) => (n, o, r) => {
  const i = typeof r == "function" ? () => {
    const s = r();
    return typeof s == "number" ? s : 0;
  } : !1;
  return new Ky(n, o, i, e, t);
}, Uy = () => {
  let e = !1, t = !1;
  return {
    setModeActive: (n) => {
      e = n;
    },
    isActive: () => e,
    runUnprotected: (n) => {
      const o = t;
      t = !0;
      try {
        return n();
      } finally {
        t = o;
      }
    },
    isBypassed: () => t
  };
}, Po = (e) => (e == null ? void 0 : e.type.name) === ot, Vy = (e, t, n) => {
  let o = t, r = !1;
  for (let i = 0; i < 512; i += 1) {
    const s = e.resolve(o), a = n === 1 ? s.nodeAfter : s.nodeBefore;
    if (a && Po(a)) {
      r = !0, o = n === 1 ? o + a.nodeSize : o - a.nodeSize;
      continue;
    }
    if (!a && s.depth > 0) {
      o = n === 1 ? s.after(s.depth) : s.before(s.depth);
      continue;
    }
    break;
  }
  return r ? o : null;
}, ca = (e, t, n) => {
  const { state: o } = e, { doc: r, selection: i } = o;
  if (!i.empty)
    return !1;
  let s;
  if (i instanceof Ae && Po(i.node))
    s = n === 1 ? i.to : i.from;
  else {
    const c = r.resolve(i.from);
    s = c.depth === 0 ? i.from : n === 1 ? c.after(c.depth) : c.before(c.depth);
  }
  const a = Vy(r, s, n);
  if (a === null)
    return !1;
  t.preventDefault();
  const l = de.near(r.resolve(a), n);
  return e.dispatch(o.tr.setSelection(l).scrollIntoView()), !0;
}, qy = (e) => ue(() => new ye({
  key: new ke("zt-md-layout-block-behavior"),
  props: {
    handleKeyDown: (t, n) => n.key === "ArrowDown" ? ca(t, n, 1) : n.key === "ArrowUp" ? ca(t, n, -1) : !1
  },
  /**
   * 删除保护:布局模式关闭时,拦截删除/覆盖布局块的用户侧事务。
   * (filterTransaction 是 Plugin 顶层钩子,不属于 props。)
   */
  filterTransaction: (t, n) => {
    if (!t.docChanged || e.isActive() || e.isBypassed() || t.getMeta(Zd) !== void 0 || t.getMeta("history$") !== void 0)
      return !0;
    let o = !1;
    return n.doc.descendants((r, i) => {
      if (o || !Po(r))
        return;
      const s = t.mapping.map(i, 1), a = t.doc.nodeAt(s);
      (!Po(a) || String((a == null ? void 0 : a.attrs.value) ?? "") !== String(r.attrs.value ?? "")) && (o = !0);
    }), !o;
  }
})), lr = new ke("zt-md-layout-block-effect"), Gy = (e) => {
  const t = [];
  let n = 0;
  return e.forEach((o) => {
    const r = n, i = n + o.nodeSize;
    n = i;
    const s = o.type.name === ot ? Py(String(o.attrs.value ?? "")) : null;
    t.push({ node: o, from: r, to: i, directive: s });
  }), t;
}, Xy = (e) => {
  var o;
  const t = e.filter((r) => r.node.type.name === "heading").map((r) => ({
    entry: r,
    level: Number(r.node.attrs.level ?? 1),
    text: r.node.textContent.trim()
  })), n = [];
  for (const r of e) {
    const i = r.directive;
    if (!(i != null && i.heading))
      continue;
    const s = t.find((l) => l.text === i.heading);
    if (!s)
      continue;
    let a = e.length > 0 ? ((o = e[e.length - 1]) == null ? void 0 : o.to) ?? s.entry.to : s.entry.to;
    for (const l of t)
      if (l.entry.from > s.entry.from && l.level <= s.level) {
        a = l.entry.from;
        break;
      }
    n.push({ directive: i, directiveFrom: r.from, from: s.entry.from, to: a });
  }
  return n;
}, Yy = (e) => {
  let t, n = !1, o;
  const r = [];
  for (const s of e) {
    s.width && (t = s.width), s.hidden !== void 0 && (n = s.hidden), s.align && (o = s.align);
    for (const a of s.classes)
      r.includes(a) || r.push(a);
  }
  const i = [];
  t && t !== "normal" && i.push(`zt-md-ml-w-${t}`), n && i.push("zt-md-ml-hidden"), o && o !== "left" && i.push(`zt-md-ml-align-${o}`);
  for (const s of r)
    i.push(`zt-md-ml-c-${s}`);
  return i;
}, da = (e) => {
  const t = Gy(e), n = Xy(t), o = [];
  let r = null;
  const i = [];
  let s = null;
  for (let a = 0; a < t.length; a += 1) {
    const l = t[a];
    if (l.directive !== null) {
      l.directive.heading || (l.directive.scope === "document" ? (r = l.directive.width ?? null, i.length = 0, i.push(...l.directive.classes)) : s = l.directive);
      continue;
    }
    const c = [];
    s !== null && c.push(s);
    for (const u of n)
      l.from >= u.from && l.to <= u.to && c.push(u.directive);
    if (c.length === 0)
      continue;
    const d = Yy(c);
    d.length > 0 && o.push(jt.node(l.from, l.to, { class: d.join(" ") }));
  }
  return {
    decorations: Le.create(e, o),
    documentWidth: r,
    documentClasses: i
  };
}, Zy = () => ue(() => new ye({
  key: lr,
  state: {
    // StateField.init 的首参是 EditorStateConfig(doc 可选),用 instance.doc。
    init: (e, t) => da(t.doc),
    apply: (e, t) => e.docChanged ? da(e.doc) : t
  },
  props: {
    decorations: (e) => {
      var t;
      return ((t = lr.getState(e)) == null ? void 0 : t.decorations) ?? Le.empty;
    }
  },
  view: (e) => {
    let t, n = [];
    const o = (r) => {
      const i = lr.getState(r.state);
      if (!i)
        return;
      const s = r.dom.closest(".zt-md");
      if (!s)
        return;
      i.documentWidth !== t && (i.documentWidth ? s.setAttribute("data-ml-width", i.documentWidth) : s.removeAttribute("data-ml-width"), t = i.documentWidth);
      const a = i.documentClasses.map((l) => `zt-md-ml-c-${l}`);
      for (const l of n)
        a.includes(l) || s.classList.remove(l);
      for (const l of a)
        n.includes(l) || s.classList.add(l);
      n = a;
    };
    return o(e), {
      update: (r) => {
        o(r);
      }
    };
  }
})), gn = "mermaid";
let ua = 0, rn = null, yo = null;
const Jy = (e) => e.closest(".zt-md-dark") !== null ? "dark" : "default", Qy = async (e) => {
  if (rn && yo === e)
    return rn;
  if (rn && yo !== e)
    return rn.initialize({ startOnLoad: !1, securityLevel: "strict", theme: e }), yo = e, rn;
  const t = await import("mermaid"), n = t.default ?? t;
  return typeof (n == null ? void 0 : n.initialize) != "function" || typeof (n == null ? void 0 : n.render) != "function" ? null : (n.initialize({ startOnLoad: !1, securityLevel: "strict", theme: e }), rn = n, yo = e, n);
}, ek = async (e, t) => {
  const n = await Qy(Jy(t));
  if (!n)
    throw new Error("mermaid unavailable");
  ua += 1;
  const { svg: o } = await n.render(`meditor-mermaid-${ua}`, e);
  return o;
}, tk = (e) => `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; object-src 'none'; frame-src 'none'; script-src 'none'; base-uri 'none'" />
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
        background: transparent;
        overflow-wrap: anywhere;
      }
      svg { max-width: 100%; height: auto; }
      #D { display: none; }
    </style>
  </head>
  <body>${e}</body>
</html>`, nk = (e, t) => {
  const n = document.createElement("div");
  return n.className = "zt-md-code-block-preview-error", n.setAttribute("role", "alert"), n.textContent = `${t.codeBlockMermaidRenderError}${e instanceof Error && e.message ? `: ${e.message}` : ""}`, n;
}, Do = "text", ok = (e, t = {}) => {
  const n = Ya.listLanguages(), r = [...new Set(
    n.map((i) => Je(i)).filter((i) => i !== Do)
  )].sort((i, s) => i.localeCompare(s));
  return [
    {
      value: Do,
      label: e.codeBlockLanguagePlainText
    },
    // Mermaid 非 refractor 语言,显式补进语言下拉(图表代码块入口;语法关闭时不出现)。
    ...t.mermaidEnabled ?? !0 ? [{ value: gn, label: Rr(gn) }] : [],
    ...r.map((i) => ({
      value: i,
      label: Rr(i)
    }))
  ];
}, rk = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  jsx: "JSX",
  tsx: "TSX",
  json: "JSON",
  html: "HTML",
  css: "CSS",
  bash: "Bash",
  shell: "Shell",
  sh: "Shell",
  markdown: "Markdown",
  md: "Markdown",
  yaml: "YAML",
  yml: "YAML",
  sql: "SQL",
  xml: "XML",
  mermaid: "Mermaid"
}, Rr = (e) => {
  const t = Je(e);
  return rk[t] ?? t;
}, ik = {
  svg: "svg",
  html: "html"
}, sk = {
  html: !0,
  svg: !0,
  mermaid: !0
}, ak = {
  mermaid: !0
}, Je = (e) => {
  var n;
  const t = e.trim().toLowerCase();
  return t ? t.startsWith("canvas-") ? ((n = Object.entries(ik).find(
    ([r]) => t.includes(r)
  )) == null ? void 0 : n[1]) ?? t : t : Do;
}, lk = (e) => (t) => {
  const n = e(t);
  return {
    ...n,
    attrs: {
      ...n.attrs,
      language: {
        default: Do,
        validate: "string"
      }
    },
    parseMarkdown: {
      ...n.parseMarkdown,
      runner: (o, r, i) => {
        const s = {
          ...r,
          lang: Je(String(r.lang ?? ""))
        };
        n.parseMarkdown.runner(o, s, i);
      }
    },
    toMarkdown: {
      ...n.toMarkdown,
      runner: (o, r) => {
        var s;
        const i = Je(String(r.attrs.language ?? ""));
        o.addNode("code", void 0, ((s = r.content.firstChild) == null ? void 0 : s.text) || "", { lang: i });
      }
    }
  };
}, ck = (e) => {
  const t = e.get(Ui.key);
  e.set(Ui.key, lk(t));
}, dk = (e, t = {}) => {
  const n = Je(e);
  return n === gn && !(t.mermaidEnabled ?? !0) ? !1 : sk[n] === !0;
}, uk = (e, t = {}) => {
  const n = Je(e);
  return n === gn && !(t.mermaidEnabled ?? !0) ? !1 : ak[n] === !0;
}, cr = "code_block", hk = 1200, mk = "html", pk = "ZT_MD_CODE_BLOCK_PREVIEW_LAYOUT", fk = [
  "default-src 'none'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data:",
  "media-src data: blob:",
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "form-action 'none'",
  "base-uri 'none'"
], wt = (e) => `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`, dr = wt(
  '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'
), gk = wt('<path d="M20 6 9 17l-5-5"/>'), bk = wt(
  '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>'
), ha = wt(
  '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'
), yk = wt('<path d="m18 16 4-4-4-4M6 8l-4 4 4 4m8.5-12-5 16"/>'), kk = wt('<path d="m6 9 6 6 6-6"/>'), wk = wt('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'), vk = wt('<path d="M20 6 9 17l-5-5"/>'), Ck = (e, t) => `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="${[
  ...fk,
  ...t ? ["script-src 'unsafe-inline'"] : []
].join("; ")}" />
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      html, body { min-height: 100%; margin: 0; }
      body { padding: 1rem; overflow-wrap: anywhere; }
      svg { max-width: 100%; height: auto; }
    </style>
  </head>
  <body>${e}</body>
</html>`, ko = (e) => typeof e != "function" ? null : e(), wo = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable;
class Ek {
  /**
   * 初始化代码块视图。
   */
  constructor(t, n, o, r, i = {}) {
    // 当前节点快照。
    m(this, "node");
    // 节点根容器。
    m(this, "dom");
    // 内容容器。
    m(this, "contentDOM");
    // 编辑器视图。
    m(this, "view");
    // 节点位置获取器。
    m(this, "getPos");
    // 编辑器文案。
    m(this, "messages");
    // header 容器(语言触发钮 + 操作按钮,flex 垂直居中)。
    m(this, "header");
    // 语言触发按钮。
    m(this, "langTrigger");
    // 语言触发按钮文案节点。
    m(this, "langTriggerLabel");
    // 语言面板容器。
    m(this, "langPanel");
    // 语言面板搜索输入框。
    m(this, "langSearchInput");
    // 语言面板选项容器。
    m(this, "langOptionsContainer");
    // 语言面板展开状态。
    m(this, "langPanelOpen", !1);
    // 语言面板搜索关键字。
    m(this, "langKeyword", "");
    // 语言面板键盘高亮项索引。
    m(this, "langActiveOptionIndex", 0);
    // 语言下拉项列表。
    m(this, "languageOptions");
    // 操作区容器。
    m(this, "actionsContainer");
    // 预览切换按钮。
    m(this, "previewButton");
    // 复制按钮。
    m(this, "copyButton");
    // 删除按钮。
    m(this, "deleteButton");
    // 预览区域。
    m(this, "previewContainer");
    // 当前挂载的预览 iframe。
    m(this, "previewFrame", null);
    // 当前是否支持预览。
    m(this, "isPreviewAvailable", !1);
    // 当前是否显示预览。
    m(this, "isPreviewMode", !1);
    // 用户是否手动切换过预览(切换后不再自动回到预览,直到语言变化)。
    m(this, "previewToggled", !1);
    // 上一次预览语言(语言切换时重置 previewToggled)。
    m(this, "lastPreviewLanguage", null);
    // Mermaid 异步渲染令牌(丢弃过期渲染结果)。
    m(this, "mermaidRenderToken", 0);
    // 已渲染的预览标识。
    m(this, "renderedPreviewKey", null);
    // 复制成功反馈计时器。
    m(this, "copyFeedbackTimer", null);
    // 行号/自动换行/Mermaid 开关配置。
    m(this, "codeOptions");
    // 行号槽(绝对定位覆盖在 pre 左侧;aria-hidden 纯视觉)。
    m(this, "gutterEl");
    // 行号同步信号(内容长度 + 内容盒高度;未变化时跳过重建)。
    m(this, "gutterSyncKey", "");
    // 内容尺寸观察器(换行数变化/编辑增高时重排行号)。
    m(this, "gutterResizeObserver", null);
    /**
     * 响应预览按钮点击,切换源码与静态预览。
     */
    m(this, "handlePreviewClick", (t) => {
      t.preventDefault(), t.stopPropagation(), this.isPreviewAvailable && (this.isPreviewMode = !this.isPreviewMode, this.previewToggled = !0, this.syncPreviewState(), this.view.dispatch(this.view.state.tr.setMeta(pk, !0)));
    });
    /**
     * 处理预览容器方向键边界导航。
     */
    m(this, "handlePreviewKeyDown", (t) => {
      if (t.defaultPrevented || t.altKey || t.ctrlKey || t.metaKey || t.shiftKey || t.key !== "ArrowUp" && t.key !== "ArrowDown")
        return;
      const n = ko(this.getPos);
      n !== null && si(this.view, n, this.node, t.key) && t.preventDefault();
    });
    /**
     * 响应复制按钮点击,复制当前代码块文本。
     */
    m(this, "handleCopyClick", (t) => {
      var r;
      if (t.preventDefault(), t.stopPropagation(), !wo(this.view))
        return;
      const n = this.node.textContent;
      (typeof navigator < "u" && ((r = navigator.clipboard) != null && r.writeText) ? navigator.clipboard.writeText(n) : Promise.resolve()).then(() => {
        this.copyButton.innerHTML = gk, this.copyButton.dataset.copied = "true", this.copyFeedbackTimer !== null && clearTimeout(this.copyFeedbackTimer), this.copyFeedbackTimer = setTimeout(() => {
          this.copyButton.innerHTML = dr, delete this.copyButton.dataset.copied, this.copyFeedbackTimer = null;
        }, hk);
      }).catch(() => {
      });
    });
    /**
     * 响应删除按钮点击,删除当前代码块。
     */
    m(this, "handleDeleteClick", (t) => {
      t.preventDefault(), t.stopPropagation(), wo(this.view) && this.deleteCurrentCodeBlock();
    });
    /**
     * 判断事件目标是否允许保留默认聚焦行为(输入框/可编辑区)。
     */
    m(this, "isLangFocusAllowedTarget", (t) => t instanceof HTMLElement ? t.closest('input, textarea, [contenteditable]:not([contenteditable="false"])') !== null : !1);
    /**
     * 阻止非输入控件点击导致编辑器选区丢失。
     */
    m(this, "handleLangPanelMouseDown", (t) => {
      this.isLangFocusAllowedTarget(t.target) || t.preventDefault();
    });
    /**
     * 点击语言面板外任意位置时收起面板(面板/触发钮/输入框除外)。
     */
    m(this, "handleDocumentMouseDown", (t) => {
      if (!this.langPanelOpen)
        return;
      const n = t.target;
      this.langPanel.contains(n) || this.langTrigger.contains(n) || this.setLangPanelOpen(!1);
    });
    /**
     * 切换语言面板展开状态。
     */
    m(this, "handleLangTriggerClick", () => {
      if (this.langPanelOpen) {
        this.setLangPanelOpen(!1);
        return;
      }
      const t = this.langTrigger.dataset.language ?? "", n = this.filteredLangOptions.findIndex((o) => o.value === t);
      this.langActiveOptionIndex = n >= 0 ? n : 0, this.setLangPanelOpen(!0);
    });
    /**
     * 处理语言面板搜索输入。
     */
    m(this, "handleLangSearchInput", (t) => {
      this.langKeyword = t.target.value, this.langActiveOptionIndex = 0, this.renderLangOptions();
    });
    /**
     * 处理语言面板搜索框键盘导航。
     */
    m(this, "handleLangSearchKeyDown", (t) => {
      if (t.key === "Escape") {
        t.preventDefault(), this.setLangPanelOpen(!1);
        return;
      }
      const o = {
        ArrowDown: () => this.moveLangActiveOption(1),
        ArrowUp: () => this.moveLangActiveOption(-1),
        Enter: () => this.confirmLangActiveOption()
      }[t.key];
      o && (t.preventDefault(), o());
    });
    /**
     * 选择目标语言写回代码块。
     */
    m(this, "handleLangSelect", (t) => {
      this.applyLanguage(t), this.setLangPanelOpen(!1), this.langKeyword = "", this.langSearchInput.value = "";
    });
    this.node = t, this.view = n, this.getPos = o, this.messages = r, this.codeOptions = i, this.dom = document.createElement("div"), this.dom.className = "zt-md-code-block", this.dom.dataset.type = cr, this.dom.dataset.wrap = i.wordWrap ? "on" : "off", i.lineNumbers ? (this.dom.dataset.lineNumbers = "on", this.gutterEl = document.createElement("div"), this.gutterEl.className = "zt-md-code-block-gutter", this.gutterEl.setAttribute("aria-hidden", "true")) : this.gutterEl = null, this.contentDOM = document.createElement("pre"), this.languageOptions = ok(r, {
      mermaidEnabled: i.mermaidEnabled ?? !0
    }), this.header = document.createElement("div"), this.header.className = "zt-md-code-block-header", this.langTrigger = document.createElement("button"), this.langTrigger.type = "button", this.langTrigger.className = "zt-md-code-block-lang-trigger", this.langTrigger.addEventListener("mousedown", this.handleLangPanelMouseDown), this.langTrigger.addEventListener("click", this.handleLangTriggerClick), this.langTriggerLabel = document.createElement("span"), this.langTriggerLabel.className = "zt-md-code-block-lang-trigger-label", this.langTrigger.appendChild(this.langTriggerLabel);
    const s = document.createElement("span");
    s.className = "zt-md-code-block-lang-trigger-icon", s.innerHTML = kk, this.langTrigger.appendChild(s), this.langPanel = document.createElement("div"), this.langPanel.className = "zt-md-code-block-lang-panel", this.langPanel.style.display = "none", this.langPanel.addEventListener("mousedown", this.handleLangPanelMouseDown);
    const a = document.createElement("label");
    a.className = "zt-md-code-block-lang-search";
    const l = document.createElement("span");
    l.className = "zt-md-code-block-lang-search-icon", l.innerHTML = wk, a.appendChild(l), this.langSearchInput = document.createElement("input"), this.langSearchInput.type = "text", this.langSearchInput.placeholder = r.codeBlockLanguageSearchPlaceholder, this.langSearchInput.className = "zt-md-code-block-lang-search-input", this.langSearchInput.addEventListener("input", this.handleLangSearchInput), this.langSearchInput.addEventListener("keydown", this.handleLangSearchKeyDown), a.appendChild(this.langSearchInput), this.langPanel.appendChild(a), this.langOptionsContainer = document.createElement("div"), this.langOptionsContainer.className = "zt-md-code-block-lang-options", this.langOptionsContainer.setAttribute("role", "listbox"), this.langPanel.appendChild(this.langOptionsContainer), this.header.appendChild(this.langTrigger), this.previewContainer = document.createElement("div"), this.previewContainer.className = "zt-md-code-block-preview", this.previewContainer.contentEditable = "false", this.previewContainer.hidden = !0, this.previewContainer.tabIndex = -1, this.previewContainer.setAttribute("role", "region"), this.previewContainer.setAttribute("aria-label", r.codeBlockPreviewAriaLabel), this.actionsContainer = document.createElement("span"), this.actionsContainer.className = "zt-md-code-block-actions", this.actionsContainer.contentEditable = "false", this.previewButton = document.createElement("button"), this.previewButton.type = "button", this.previewButton.className = "zt-md-code-block-action-button", this.previewButton.hidden = !0, this.previewButton.innerHTML = ha, this.copyButton = document.createElement("button"), this.copyButton.type = "button", this.copyButton.className = "zt-md-code-block-action-button zt-md-code-block-editable-action", this.copyButton.setAttribute("aria-label", r.codeBlockCopyAriaLabel), this.copyButton.innerHTML = dr, this.deleteButton = document.createElement("button"), this.deleteButton.type = "button", this.deleteButton.className = "zt-md-code-block-action-button zt-md-code-block-editable-action zt-md-code-block-action-button-danger", this.deleteButton.setAttribute("aria-label", r.codeBlockDeleteAriaLabel), this.deleteButton.innerHTML = bk, this.actionsContainer.append(this.previewButton, this.copyButton, this.deleteButton), this.header.appendChild(this.actionsContainer), this.header.appendChild(this.langPanel), this.dom.append(this.header, this.contentDOM, this.previewContainer), this.gutterEl && (this.dom.insertBefore(this.gutterEl, this.contentDOM), typeof ResizeObserver == "function" && (this.gutterResizeObserver = new ResizeObserver(() => this.scheduleGutterSync()), this.gutterResizeObserver.observe(this.contentDOM))), this.updateEditableState(), this.syncLanguageAttribute(t), this.syncPreviewAvailability(t), this.previewButton.addEventListener("click", this.handlePreviewClick), this.copyButton.addEventListener("click", this.handleCopyClick), this.deleteButton.addEventListener("click", this.handleDeleteClick), this.previewContainer.addEventListener("keydown", this.handlePreviewKeyDown), document.addEventListener("mousedown", this.handleDocumentMouseDown, !0);
  }
  /**
   * 同步代码块语言:触发钮展示名 + pre[data-language](Prism 高亮读 attrs.language,data-language 仅语义保留)。
   */
  syncLanguageAttribute(t) {
    const n = typeof t.attrs.language == "string" ? t.attrs.language.trim() : "";
    if (!n) {
      this.contentDOM.removeAttribute("data-language"), this.langTriggerLabel.textContent = "", this.langTrigger.setAttribute("aria-label", "");
      return;
    }
    this.contentDOM.setAttribute("data-language", Je(n));
    const o = Rr(n);
    this.langTrigger.dataset.language = Je(n), this.langTrigger.setAttribute("aria-label", o), this.langTriggerLabel.textContent = o;
  }
  /**
   * 重排行号(update 逐事务/尺寸回调触发;同步执行:后台标签页 rAF/RO 回调
   * 可能长期不派发,同步路径保证任何可见性下编辑后行号立即对齐)。
   */
  scheduleGutterSync() {
    this.gutterEl && this.syncGutter();
  }
  /**
   * 重排行号:按每个逻辑行首字符的实测坐标定位(自动换行下与可视行精确对齐)。
   */
  syncGutter() {
    const t = this.gutterEl;
    if (!t)
      return;
    const n = this.contentDOM, o = n.getBoundingClientRect();
    if (o.height <= 0)
      return;
    const r = this.node.textContent, i = `${r.length}|${Math.round(o.height)}|${o.width}`;
    if (i === this.gutterSyncKey)
      return;
    this.gutterSyncKey = i, t.style.top = `${n.offsetTop}px`, t.style.height = `${n.offsetHeight}px`;
    const s = r.split(`
`), a = document.createDocumentFragment();
    if (s.length > 1e3) {
      const u = o.height / s.length;
      s.forEach((h, p) => {
        const g = document.createElement("div");
        g.className = "zt-md-code-block-gutter-line", g.style.top = `${p * u}px`, g.textContent = String(p + 1), a.appendChild(g);
      }), t.replaceChildren(a);
      return;
    }
    const l = ko(this.getPos);
    if (l === null) {
      t.replaceChildren();
      return;
    }
    let c = 0, d = Number.NaN;
    s.forEach((u, h) => {
      const p = l + 1 + Math.min(c, r.length);
      let g = Number.NaN;
      try {
        g = this.view.coordsAtPos(Math.min(p, l + 1 + r.length)).top - o.top;
      } catch {
      }
      if (c += u.length + 1, !Number.isFinite(g) || Number.isFinite(d) && Math.abs(g - d) < 2)
        return;
      d = g;
      const y = document.createElement("div");
      y.className = "zt-md-code-block-gutter-line", y.style.top = `${g}px`, y.textContent = String(h + 1), a.appendChild(y);
    }), t.replaceChildren(a);
  }
  /**
   * 删除当前代码块并将焦点归还编辑器。
   */
  deleteCurrentCodeBlock() {
    const t = ko(this.getPos);
    if (t === null)
      return;
    const n = this.view.state.tr.delete(t, t + this.node.nodeSize), o = Math.min(t, n.doc.content.size);
    n.setSelection(de.near(n.doc.resolve(o), -1)).scrollIntoView(), this.view.dispatch(n), requestAnimationFrame(() => {
      this.view.focus();
    });
  }
  /**
   * 当前语言下拉项过滤结果。
   */
  get filteredLangOptions() {
    const t = this.langKeyword.trim().toLowerCase();
    return t ? this.languageOptions.filter((n) => {
      const o = n.label.toLowerCase(), r = n.value.toLowerCase();
      return o.includes(t) || r.includes(t);
    }) : this.languageOptions;
  }
  /**
   * 按指定偏移循环移动语言面板键盘高亮项。
   */
  moveLangActiveOption(t) {
    const n = this.filteredLangOptions;
    n.length !== 0 && (this.langActiveOptionIndex = (this.langActiveOptionIndex + t + n.length) % n.length, this.renderLangOptions(), this.scrollLangActiveOptionIntoView());
  }
  /**
   * 确认当前键盘高亮语言项。
   */
  confirmLangActiveOption() {
    const t = this.filteredLangOptions[this.langActiveOptionIndex];
    t && this.handleLangSelect(t.value);
  }
  /**
   * 切换语言面板展开态并同步界面。
   */
  setLangPanelOpen(t) {
    this.langPanelOpen = t, this.langTrigger.setAttribute("aria-expanded", t ? "true" : "false"), this.langPanel.style.display = t ? "block" : "none", t && (this.renderLangOptions(), this.langSearchInput.focus({ preventScroll: !0 }), this.scrollLangActiveOptionIntoView());
  }
  /**
   * 将当前高亮语言项滚入面板内部选项容器可视区。
   *
   * 只调整 options 容器的 scrollTop,不调用 scrollIntoView;
   * scrollIntoView 会连带滚动整个页面/编辑器,导致面板整体跳位。
   */
  scrollLangActiveOptionIntoView() {
    const t = this.langOptionsContainer.querySelector('[data-active="true"]');
    if (!t)
      return;
    const n = this.langOptionsContainer.getBoundingClientRect(), o = t.getBoundingClientRect(), r = n.top - o.top, i = o.bottom - n.bottom;
    r > 0 ? this.langOptionsContainer.scrollTop -= r : i > 0 && (this.langOptionsContainer.scrollTop += i);
  }
  /**
   * 渲染语言选项列表。
   */
  renderLangOptions() {
    const t = this.filteredLangOptions, n = this.langTrigger.dataset.language ?? "";
    if (this.langOptionsContainer.innerHTML = "", t.length === 0) {
      const o = document.createElement("div");
      o.className = "zt-md-code-block-lang-empty", o.textContent = "-", this.langOptionsContainer.appendChild(o);
      return;
    }
    t.forEach((o, r) => {
      const i = document.createElement("button");
      i.type = "button", i.className = "zt-md-code-block-lang-option", i.dataset.active = r === this.langActiveOptionIndex ? "true" : "false", i.dataset.selected = o.value === n ? "true" : "false", i.addEventListener("click", () => {
        this.handleLangSelect(o.value);
      });
      const s = document.createElement("span");
      if (s.textContent = o.label, i.appendChild(s), o.value === n) {
        const a = document.createElement("span");
        a.className = "zt-md-code-block-lang-option-check", a.innerHTML = vk, i.appendChild(a);
      }
      this.langOptionsContainer.appendChild(i);
    });
  }
  /**
   * 写回当前代码块的语言属性。
   */
  applyLanguage(t) {
    const n = ko(this.getPos);
    if (n === null)
      return;
    const o = this.view.state.doc.nodeAt(n);
    if (!o || o.type.name !== cr)
      return;
    const r = Je(t);
    if (String(o.attrs.language ?? "") === r)
      return;
    const s = {
      ...o.attrs,
      language: r
    }, a = this.view.state.tr.setNodeMarkup(
      n,
      o.type,
      s,
      o.marks
    );
    this.view.dispatch(a), this.syncLanguageAttribute(this.node);
  }
  /**
   * 更新代码块可编辑状态标记。
   */
  updateEditableState() {
    this.dom.dataset.editable = wo(this.view) ? "true" : "false";
  }
  /**
   * 同步当前语言对应的预览能力。
   */
  syncPreviewAvailability(t) {
    const n = typeof t.attrs.language == "string" ? t.attrs.language : "", o = Je(n || "");
    o !== this.lastPreviewLanguage && (this.lastPreviewLanguage = o, this.previewToggled = !1), this.isPreviewAvailable = dk(n, {
      mermaidEnabled: this.codeOptions.mermaidEnabled ?? !0
    }), this.isPreviewAvailable ? (
      // Mermaid 等动态图表:未手动切回源码且有内容时,默认直接渲染。
      !this.previewToggled && uk(n, {
        mermaidEnabled: this.codeOptions.mermaidEnabled ?? !0
      }) && t.textContent.trim().length > 0 && (this.isPreviewMode = !0)
    ) : this.isPreviewMode = !1, this.previewButton.hidden = !this.isPreviewAvailable, this.syncPreviewState(), this.syncActionsVisibility();
  }
  /**
   * 同步代码块预览状态与无障碍属性。
   */
  syncPreviewState() {
    const t = this.isPreviewAvailable && this.isPreviewMode, n = t ? this.messages.codeBlockSourceAriaLabel : this.messages.codeBlockPreviewAriaLabel;
    if (this.dom.dataset.viewMode = t ? "preview" : "source", this.previewContainer.hidden = !t, this.previewContainer.tabIndex = t ? 0 : -1, this.previewButton.dataset.active = t ? "true" : "false", this.previewButton.setAttribute("aria-pressed", t ? "true" : "false"), this.previewButton.setAttribute("aria-label", n), this.previewButton.title = n, this.previewButton.innerHTML = t ? yk : ha, t) {
      this.contentDOM.setAttribute("aria-hidden", "true"), this.renderPreview();
      return;
    }
    this.contentDOM.removeAttribute("aria-hidden"), this.clearPreview();
  }
  /**
   * 同步当前模式可见的操作按钮。
   */
  syncActionsVisibility() {
    const t = wo(this.view) || this.isPreviewAvailable;
    this.actionsContainer.dataset.visible = t ? "true" : "false";
  }
  /**
   * 渲染当前代码块的隔离预览文档。
   */
  renderPreview() {
    const t = this.node.textContent, n = Je(String(this.node.attrs.language ?? ""));
    if (n === gn) {
      this.renderMermaidPreview(t);
      return;
    }
    const o = n === mk, r = `${n} ${t}`;
    if (this.renderedPreviewKey === r)
      return;
    this.renderedPreviewKey = r;
    const i = document.createElement("iframe");
    i.className = "zt-md-code-block-preview-frame", i.title = this.messages.codeBlockPreviewAriaLabel, i.tabIndex = -1, i.referrerPolicy = "no-referrer", i.setAttribute("sandbox", o ? "allow-scripts" : ""), i.srcdoc = Ck(t, o), this.previewContainer.replaceChildren(i), this.previewFrame = i;
  }
  /**
   * 异步渲染 Mermaid 图表预览(失败展示错误提示,过期渲染经令牌丢弃)。
   */
  renderMermaidPreview(t) {
    this.mermaidRenderToken += 1;
    const n = this.mermaidRenderToken, o = `${gn} ${t}`;
    this.renderedPreviewKey === o && this.previewContainer.childElementCount > 0 || (this.renderedPreviewKey = o, this.previewContainer.replaceChildren(), ek(t, this.dom).then((r) => {
      if (n !== this.mermaidRenderToken)
        return;
      const i = document.createElement("iframe");
      i.className = "zt-md-code-block-preview-frame", i.title = this.messages.codeBlockPreviewAriaLabel, i.tabIndex = -1, i.referrerPolicy = "no-referrer", i.setAttribute("sandbox", ""), i.srcdoc = tk(r), n === this.mermaidRenderToken && (this.previewContainer.replaceChildren(i), this.previewFrame = i);
    }).catch((r) => {
      n === this.mermaidRenderToken && this.previewContainer.replaceChildren(nk(r, this.messages));
    }));
  }
  /**
   * 清理当前预览文档。
   */
  clearPreview() {
    var t;
    this.mermaidRenderToken += 1, this.renderedPreviewKey = null, (t = this.previewFrame) == null || t.remove(), this.previewFrame = null;
  }
  /**
   * 处理节点更新。
   */
  update(t) {
    return t.type.name !== cr ? !1 : (this.node = t, this.updateEditableState(), this.syncLanguageAttribute(t), this.syncPreviewAvailability(t), this.scheduleGutterSync(), !0);
  }
  /**
   * 只拦截操作按钮 / 语言面板内部事件。
   */
  stopEvent(t) {
    const n = t.target;
    return n instanceof Node ? this.actionsContainer.contains(n) || this.previewContainer.contains(n) || this.langTrigger.contains(n) || this.langPanel.contains(n) : !1;
  }
  /**
   * 忽略 NodeView 内部的 DOM 变更观察。
   */
  ignoreMutation(t) {
    var o;
    return t.type === "selection" ? !1 : t.type === "attributes" && (t.target === this.dom && t.attributeName === "data-view-mode" || t.target === this.contentDOM && t.attributeName === "aria-hidden") ? !0 : !!(this.actionsContainer.contains(t.target) || this.previewContainer.contains(t.target) || this.langTrigger.contains(t.target) || this.langPanel.contains(t.target) || (o = this.gutterEl) != null && o.contains(t.target));
  }
  /**
   * 销毁时解绑监听器。
   */
  destroy() {
    var t;
    this.previewButton.removeEventListener("click", this.handlePreviewClick), this.copyButton.removeEventListener("click", this.handleCopyClick), this.deleteButton.removeEventListener("click", this.handleDeleteClick), this.previewContainer.removeEventListener("keydown", this.handlePreviewKeyDown), this.langTrigger.removeEventListener("mousedown", this.handleLangPanelMouseDown), this.langTrigger.removeEventListener("click", this.handleLangTriggerClick), this.langPanel.removeEventListener("mousedown", this.handleLangPanelMouseDown), this.langSearchInput.removeEventListener("input", this.handleLangSearchInput), this.langSearchInput.removeEventListener("keydown", this.handleLangSearchKeyDown), document.removeEventListener("mousedown", this.handleDocumentMouseDown, !0), this.copyFeedbackTimer !== null && (clearTimeout(this.copyFeedbackTimer), this.copyFeedbackTimer = null), this.copyButton.innerHTML = dr, delete this.copyButton.dataset.copied, this.clearPreview(), (t = this.gutterResizeObserver) == null || t.disconnect(), this.gutterResizeObserver = null;
  }
}
const zk = (e = Qe(), t = {}) => (n, o, r) => {
  const i = typeof r == "function" ? () => {
    const s = r();
    return typeof s == "number" ? s : 0;
  } : !1;
  return new Ek(n, o, i, e, t);
}, Mk = "code_block", Tk = (e, t) => {
  const { state: n } = e, { selection: o } = n;
  if (!o.empty || !o.$from.parent || o.$from.parent.type.name !== Mk || !(Yn() ? t.metaKey : t.ctrlKey) || !t.key.toLowerCase().startsWith("a"))
    return !1;
  t.preventDefault();
  const i = o.$from.start(), s = o.$from.end();
  return e.dispatch(n.tr.setSelection(de.create(n.doc, i, s))), !0;
}, xk = ue(() => new ye({
  key: new ke("zt-md-code-block-mod-a-select"),
  props: {
    handleKeyDown: (e, t) => Tk(e, t)
  }
})), Sk = "code_block", Lk = "ZT_MD_CODE_BLOCK_PRISM", sc = (e, t = []) => e.flatMap((n) => {
  var o;
  if (n.type === "element") {
    const r = [...t, ...((o = n.properties) == null ? void 0 : o.className) ?? []];
    return sc(n.children ?? [], r);
  }
  return [
    {
      text: n.value ?? "",
      className: t
    }
  ];
}), Ak = (e, t) => t.listLanguages().includes(e), ma = (e, t) => {
  const n = [];
  return Xd((o) => o.type.name === Sk)(e).forEach((o) => {
    const r = String(o.node.attrs.language ?? "");
    if (!r || !Ak(r, t))
      return;
    let i = o.pos + 1;
    const s = t.highlight(o.node.textContent, r);
    sc(s.children).forEach((l) => {
      const c = i + l.text.length;
      l.className.length > 0 && n.push(
        jt.inline(i, c, {
          class: l.className.join(" ")
        })
      ), i = c;
    });
  }), Le.create(e, n);
}, Ik = ue(() => {
  const e = Ya;
  return new ye({
    key: new ke(Lk),
    state: {
      init: (t, n) => ma(n.doc, e),
      apply: (t, n) => t.docChanged ? ma(t.doc, e) : n.map(t.mapping, t.doc)
    },
    props: {
      decorations(t) {
        return this.getState(t);
      }
    }
  });
}), Rk = {
  标: "biao",
  题: "ti",
  无: "wu",
  序: "xu",
  有: "you",
  列: "lie",
  任: "ren",
  务: "wu",
  表: "biao",
  引: "yin",
  用: "yong",
  块: "kuai",
  注: "zhu",
  折: "zhe",
  叠: "die",
  行: "xing",
  内: "nei",
  代: "dai",
  码: "ma",
  链: "lian",
  接: "jie",
  普: "pu",
  通: "tong",
  格: "ge",
  数: "shu",
  据: "ju",
  视: "shi",
  频: "pin",
  音: "yin",
  网: "wang",
  页: "ye",
  书: "shu",
  签: "qian",
  第: "di",
  三: "san",
  嵌: "qian",
  公: "gong",
  式: "shi",
  图: "tu",
  片: "pian",
  方: "fang",
  入: "ru",
  插: "cha",
  媒: "mei",
  体: "ti"
}, Nk = (e) => /[\u4e00-\u9fff]/.test(e), Pk = (e) => {
  let t = "", n = "";
  for (const o of e) {
    if (/\s/.test(o))
      continue;
    const r = Rk[o];
    if (r)
      t += r, n += r[0];
    else if (!Nk(o)) {
      const i = o.toLowerCase();
      t += i, n += i;
    }
  }
  return { full: t, initials: n };
}, Dk = (e, t) => {
  if (e.toLowerCase().includes(t))
    return !0;
  const { full: n, initials: o } = Pk(e);
  return n.includes(t) || o.includes(t);
}, bt = (e) => {
  var n;
  const t = e;
  return typeof ((n = t == null ? void 0 : t.props) == null ? void 0 : n.editable) == "function" ? t.props.editable(void 0) : !!(t != null && t.editable);
}, Bk = [
  { id: "heading-1", label: "标题 1", group: "", icon: "heading1", command: "heading1" },
  { id: "heading-2", label: "标题 2", group: "", icon: "heading2", command: "heading2" },
  { id: "heading-3", label: "标题 3", group: "", icon: "heading3", command: "heading3" },
  { id: "heading-4", label: "标题 4", group: "", icon: "heading4", command: "heading4" },
  { id: "heading-5", label: "标题 5", group: "", icon: "heading5", command: "heading5" },
  { id: "heading-6", label: "标题 6", group: "", icon: "heading6", command: "heading6" },
  { id: "bullet-list", label: "无序列表", group: "列表", icon: "list", command: "bulletList" },
  { id: "ordered-list", label: "有序列表", group: "列表", icon: "orderedList", command: "orderedList" },
  { id: "task-list", label: "任务列表", group: "列表", icon: "taskList", command: "taskList" },
  { id: "blockquote", label: "引用块", group: "插入", icon: "quote", command: "blockquote" },
  { id: "callout", label: "标注块", group: "插入", icon: "quote", command: "callout" },
  { id: "toggle", label: "折叠块", group: "插入", icon: "chevronDown", command: "toggle" },
  { id: "inline-code", label: "行内代码", group: "插入", icon: "inlineCode", command: "inlineCode" },
  { id: "code-block", label: "代码块", group: "插入", icon: "codeBlock", command: "codeBlock" },
  { id: "link", label: "链接", group: "插入", icon: "link", command: "link" },
  { id: "table", label: "普通表格", group: "插入", icon: "table", command: "table" },
  { id: "csv-table", label: "CSV数据", group: "插入", icon: "table", command: "csvTable" },
  { id: "database", label: "Json数据", group: "插入", icon: "table", command: "database" },
  { id: "layout-block", label: "布局块", group: "插入", icon: "layoutTemplate", command: "layoutBlock" },
  { id: "video", label: "视频", group: "媒体", icon: "image", command: "video" },
  { id: "audio", label: "音频", group: "媒体", icon: "image", command: "audio" },
  { id: "bookmark", label: "网页书签", group: "媒体", icon: "link", command: "bookmark" },
  { id: "embed", label: "第三方内嵌", group: "媒体", icon: "codeBlock", command: "embed" },
  { id: "inline-math", label: "行内公式", group: "公式", icon: "sigma", command: "inlineMath" },
  { id: "math-block", label: "公式块", group: "公式", icon: "math", command: "mathBlock" },
  { id: "mermaid", label: "Mermaid 图表", group: "插入", icon: "codeBlock", command: "mermaid" },
  { id: "toc", label: "目录", group: "插入", icon: "toc", command: "toc" },
  { id: "footnote", label: "脚注", group: "插入", icon: "footnote", command: "footnote" },
  { id: "image", label: "图片", group: "媒体", icon: "image", command: "image" },
  { id: "emoji", label: "Emoji", group: "媒体", icon: "smile", command: "emoji" }
], _k = [
  { id: "heading-1", label: "Heading 1", group: "", icon: "heading1", command: "heading1" },
  { id: "heading-2", label: "Heading 2", group: "", icon: "heading2", command: "heading2" },
  { id: "heading-3", label: "Heading 3", group: "", icon: "heading3", command: "heading3" },
  { id: "heading-4", label: "Heading 4", group: "", icon: "heading4", command: "heading4" },
  { id: "heading-5", label: "Heading 5", group: "", icon: "heading5", command: "heading5" },
  { id: "heading-6", label: "Heading 6", group: "", icon: "heading6", command: "heading6" },
  { id: "bullet-list", label: "Bullet list", group: "Lists", icon: "list", command: "bulletList" },
  { id: "ordered-list", label: "Ordered list", group: "Lists", icon: "orderedList", command: "orderedList" },
  { id: "task-list", label: "Task list", group: "Lists", icon: "taskList", command: "taskList" },
  { id: "blockquote", label: "Blockquote", group: "Insert", icon: "quote", command: "blockquote" },
  { id: "callout", label: "Callout", group: "Insert", icon: "quote", command: "callout" },
  { id: "toggle", label: "Toggle", group: "Insert", icon: "chevronDown", command: "toggle" },
  { id: "inline-code", label: "Inline code", group: "Insert", icon: "inlineCode", command: "inlineCode" },
  { id: "code-block", label: "Code block", group: "Insert", icon: "codeBlock", command: "codeBlock" },
  { id: "link", label: "Link", group: "Insert", icon: "link", command: "link" },
  { id: "table", label: "Table", group: "Insert", icon: "table", command: "table" },
  { id: "csv-table", label: "CSV table", group: "Insert", icon: "table", command: "csvTable" },
  { id: "database", label: "Database", group: "Insert", icon: "table", command: "database" },
  { id: "layout-block", label: "Layout block", group: "Insert", icon: "layoutTemplate", command: "layoutBlock" },
  { id: "video", label: "Video", group: "Media", icon: "image", command: "video" },
  { id: "audio", label: "Audio", group: "Media", icon: "image", command: "audio" },
  { id: "bookmark", label: "Bookmark", group: "Media", icon: "link", command: "bookmark" },
  { id: "embed", label: "Embed", group: "Media", icon: "codeBlock", command: "embed" },
  { id: "inline-math", label: "Inline math", group: "Math", icon: "sigma", command: "inlineMath" },
  { id: "math-block", label: "Math block", group: "Math", icon: "math", command: "mathBlock" },
  { id: "mermaid", label: "Mermaid diagram", group: "Insert", icon: "codeBlock", command: "mermaid" },
  { id: "toc", label: "Table of Contents", group: "Insert", icon: "toc", command: "toc" },
  { id: "footnote", label: "Footnote", group: "Insert", icon: "footnote", command: "footnote" },
  { id: "image", label: "Image", group: "Media", icon: "image", command: "image" },
  { id: "emoji", label: "Emoji", group: "Media", icon: "smile", command: "emoji" }
], ac = (e, t = "zh-CN") => e != null && e.items && e.items.length > 0 ? e.items : t === "en-US" ? _k : Bk, Nr = (e) => {
  var r, i, s, a, l, c;
  const t = e, n = (i = (r = t == null ? void 0 : t.state) == null ? void 0 : r.selection) == null ? void 0 : i.$from;
  if (!n)
    return !1;
  const o = String(((a = (s = n.parent) == null ? void 0 : s.type) == null ? void 0 : a.name) ?? "");
  if (o.includes("code") || o === "math_block")
    return !0;
  for (let d = n.depth; d > 0; d -= 1) {
    const u = String(((c = (l = n.node(d)) == null ? void 0 : l.type) == null ? void 0 : c.name) ?? "");
    if (u === "table" || u === "table_cell" || u === "table_header")
      return !0;
  }
  return !1;
}, Ok = (e) => {
  var i, s;
  const t = e == null ? void 0 : e.state, n = (i = t == null ? void 0 : t.selection) == null ? void 0 : i.$from;
  if (!t || !n)
    return "";
  const o = n.start(), r = n.pos;
  return ((s = t.doc) == null ? void 0 : s.textBetween(o, r, `
`, `
`)) ?? "";
}, Hk = (e) => {
  const t = Ok(e), n = t.lastIndexOf("/");
  if (n < 0)
    return null;
  const o = t.slice(n + 1);
  return /\s/.test(o) ? null : o;
}, Fk = (e, t) => {
  if (t === null || t.length === 0)
    return e;
  const n = t.toLowerCase();
  return e.filter((o) => [o.label, o.group, o.command, o.id].some((i) => Dk(String(i), n)));
}, $k = (e, t) => {
  if (!bt(e))
    return { visibleItems: [], shouldShow: !1 };
  const n = Hk(e), o = Fk(t, n), r = !Nr(e) && n !== null && o.length > 0;
  return { visibleItems: o, shouldShow: r };
}, pa = (e) => {
  var d;
  const t = e, n = t == null ? void 0 : t.state, o = (d = n == null ? void 0 : n.selection) == null ? void 0 : d.$from;
  if (!n || !o || !(t != null && t.dispatch))
    return !1;
  const r = o.start(), i = o.pos, a = n.doc.textBetween(r, i, `
`, `
`).lastIndexOf("/");
  if (a < 0)
    return !1;
  const l = r + a, c = n.tr.delete(l, i);
  return t.dispatch(c.scrollIntoView()), !0;
}, pt = (e) => e.map(([t, n]) => ({ char: t, keywords: n })), lc = [
  {
    labelKey: "emojiPickerCategorySmileys",
    emojis: pt([
      ["😀", "笑脸 开心 微笑 xiaolian kaixin weixin smile happy grin"],
      ["😂", "笑哭 大笑 笑死了 xiaoku daxiao joy lol laugh tears"],
      ["😃", "开心 哈哈 笑脸 haha kaixin smiley smile"],
      ["😄", "大笑 开心 眼睛笑弯 daxiao kaixin smile laugh happy"],
      ["😁", "嘿嘿 咧嘴笑 眯眼 heihei liezuixiao miyan grin beaming"],
      ["😆", "哈哈 眯眼大笑 狂笑 haha kuangxiao laugh squint"],
      ["😅", "流汗笑 尴尬 笑 liuhanxiao ganca sweat smile awkward"],
      ["🤣", "笑倒 打滚笑 笑死 xiaodao gunxiao rofl rolling laugh"],
      ["😊", "微笑 脸红 羞涩 weixin lianhong xiuse blush smile"],
      ["😇", "天使 光环 无辜 tianshi guanghuan wugu angel halo innocent"],
      ["🥰", "被爱 喜欢 三颗心 beiai xihuan sankexin love hearts adore"],
      ["😍", "爱慕 花痴 心形眼 aimu huachi xinxingyan love eyes heart"],
      ["🤩", "星星眼 崇拜 惊叹 xingxingyan chongbai jingtan star struck wow"],
      ["😘", "亲亲 飞吻 么么 qinqin feiwen kiss blow"],
      ["😗", "亲吻 亲亲 qinwen kissing kiss"],
      ["😙", "笑着亲吻 亲亲 kissing qinwen kiss smiling"],
      ["😉", "眨眼 暗示 调皮 zhayan anshi zhaoyanjing wink tease"],
      ["😌", "安心 舒服 松口气 anxin shufu songkouqi relieved calm"],
      ["😒", "不屑 无语 白眼 buxie wuyu baiyan unamused meh"],
      ["😑", "面无表情 麻木 淡定 mianwubiaoqing mamu danding expressionless deadpan"],
      ["😶", "沉默 无言 闭嘴 chenmo wuyan bizui no mouth quiet mute"],
      ["😏", "得意 挑衅 smug deyi tiaoxin smirk"],
      ["😓", "流汗 冷汗 郁闷 liuhan lenhan yumen downcast sweat"],
      ["😔", "沮丧 失望 低迷 jusang shiwang pensive sad"],
      ["😬", "尴尬 龇牙 呲牙 ganca ziya grimace awkward"],
      ["🤥", "说谎 长鼻子 撒谎 shuohuang changbizi sahuang lying pinocchio liar"],
      ["😐", "面无表情 中性 无话 mianwubiaoqing zhongxing neutral"],
      ["😨", "害怕 恐惧 吓到 haipa kongju xiadao fearful scared afraid"],
      ["😰", "冷汗 紧张 焦虑 lenhan jinzhang jiaolu anxious nervous sweat"],
      ["😯", "惊讶 呆住 咦 jingya daizhu surprised hushed"],
      ["😲", "震惊 目瞪口呆 天呐 zhenjing mudengkoudai astonished shocked wow"],
      ["😠", "生气 不高兴 不满意 shengqi bugaoxing manyi angry"],
      ["😡", "愤怒 暴怒 怒 fennu baonu nu rage angry"],
      ["😤", "得意 哼 气鼓鼓 deyi heng qigu triumph steam"],
      ["😵", "晕 头晕 昏 yun touyun dizzy knockout"],
      ["🙁", "皱眉 不开心 失望 zhoumei bugaoxing shiwang slightly frowning sad"],
      ["😭", "大哭 嚎啕 泪流成河 daku haotiao loudly crying sob tears"],
      ["😱", "惊恐 吓一跳 尖叫 jingkong xiajiao scream fear"],
      ["😖", "困扰 为难 烦 kunnrao weinan fan confounded puzzled"],
      ["😣", "忍耐 委屈 熬 renai weiqu ao persevering effort"],
      ["😟", "担忧 发愁 不安 danyou fachou buan worried"],
      ["😢", "流泪 委屈 泪 liulei weiqu lei cry teardrop sad"],
      ["😳", "脸红 害羞 惊呆 lianhong haixiu jingdai flushed shy blush"],
      ["😫", "累 疲惫 受不了 lei pubei shoubuliao tired exhausted"],
      ["😴", "睡觉 睡着 困 shuijiao shuizhao kun sleeping zzz"],
      ["😷", "口罩 生病 感冒 kouzhao shengbing ganmao mask sick"],
      ["🤒", "发烧 生病 体温计 fashao shengbing tiwenji thermometer sick fever"],
      ["🤕", "受伤 绷带 挂彩 shoushang bengdai guacai bandage hurt injury"],
      ["🤢", "恶心 想吐 反胃 exin xiangtu fanwei nauseated sick green"],
      ["🤮", "呕吐 吐了 吐 vomit outu tule"],
      ["🤧", "打喷嚏 感冒 过敏 dapenti ganmao guomin sneeze"],
      ["😈", "小恶魔 调皮 坏笑 xiaoemo diaopi huaixiao imp devil"],
      ["👿", "恶魔 怒 愤怒 emo fennu angry devil imp"],
      ["🤡", "小丑 小丑妆 clown xiaochou clown circus"],
      ["👻", "幽灵 鬼 鬼魂 youling gui guihun ghost boo halloween"],
      ["💀", "骷髅 头骨 死亡 kilou tougu siwang skull skeleton death"],
      ["💩", "便便 大便 屎 bianbian daben shi poop poo"],
      ["🦠", "细菌 病毒 微生物 xijun bingdu weishengwu microbe virus germ"],
      ["💯", "一百分 满分 完美 yibaifen manfen wanmei hundred points perfect score"],
      ["💥", "爆炸 碰撞 炸裂 baozha pengzhuang zhalie collision boom explosion"],
      ["💫", "头晕 目眩 星星转 touyun muxuan dizzy star sleepy"],
      ["💨", "气流 快跑 风 qiliu kuaipao feng dash wind blowing"],
      ["💢", "怒气 愤怒标记 气炸 nuqi fennu qizha anger mark"],
      ["💦", "汗滴 水花 溅 handi shuihua jian splash sweat water"],
      ["💧", "水滴 液滴 汗 shuidi yedi han drop droplet water"]
    ])
  },
  {
    labelKey: "emojiPickerCategoryGestures",
    emojis: pt([
      ["👍", "点赞 赞 好 dianzan zan hao thumbs up like approve"],
      ["👌", "OK 好的 没问题 okay haode meiwenti ok perfect"],
      ["👊", "出拳 拳头 加油 chuiquan quotou jiayou fist punch bump"],
      ["🤝", "握手 合作 达成 wushou hezuo dacheng handshake deal"],
      ["👏", "鼓掌 拍手 棒 guzhang paishou bang clap praise"],
      ["🙌", "万岁 举双手 欢呼 wansui jushuangshou huanhu raising hands hooray celebrate"],
      ["🙏", "拜托 感谢 祈祷 baituo ganxie qidao pray thanks please"],
      ["👋", "打招呼 挥手 拜拜 dazhaohu huishou baibai waving hello hi bye"],
      ["🤚", "举手 举起的手 jushou juqideshou raised hand open high five"],
      ["🖐", "张开手 停 splayed hand zhangkaishou ting stop hand five"],
      ["👄", "嘴唇 唇 嘴 zuichun chun zui mouth lips kiss"],
      ["👅", "舌头 舔 tongue shetou tian tongue lick"],
      ["👃", "鼻子 闻 nose bizi wen nose smell"],
      ["👤", "人像 头像 单人 renxiang touxiang dansheng bust silhouette user avatar"],
      ["👥", "人群 多人 双人 renqun duoren shuangren group users busts"],
      ["👦", "男孩 男生 boy nanhai nansheng boy"],
      ["👧", "女孩 女生 girl nvhai nvsheng girl"],
      ["👨", "男人 成年男 man nanren chengniannan man"],
      ["👩", "女人 成年女 woman nüren chengniannü woman"],
      ["👶", "婴儿 宝宝 baby yinger baobao baby infant"],
      ["👱", "金发的人 卷发 blond jinfaren juanfa blond person"],
      ["👴", "老爷爷 爷爷 old man laoyeye yeye grandpa"],
      ["👵", "老奶奶 奶奶 old woman laonainai nainai grandma"],
      ["👮", "警察 警官 police jingcha jingguan police officer cop"],
      ["👷", "工人 建筑工人 工地 worker gongren jianzhu construction"],
      ["👸", "公主 princess gongzhu princess royal"],
      ["🎅", "圣诞老人 圣诞 santa claus shengdanlaoren christmas santa"],
      ["🤶", "圣诞太太 圣诞 mrs claus shengdantaitei christmas"],
      ["🦸", "超人 超级英雄 superhero chaoren chaoji hero"],
      ["🦹", "反派 超级反派 supervillain fanpai villain evil"],
      ["🧚", "仙女 精灵 fairy xiannü jingling fairy sprite"],
      ["💪", "加油 肌肉 强壮 jiayou jirou qiangzhuang flexed biceps muscle strong"],
      ["🦵", "腿 肢体 leg tui zhiti leg"],
      ["🦶", "脚 foot jiao foot kick"],
      ["👂", "耳朵 听 ear erduo ting ear listen hear"],
      ["👀", "眼睛 看 eye yanjing kan eye look see"],
      ["🧠", "大脑 脑子 聪明 danao naozi congming brain smart mind"],
      ["🦷", "牙齿 牙 tooth yachi ya tooth dentist"],
      ["🦴", "骨头 bone gutou bone"],
      ["👣", "脚印 足迹 footprint jiaoyin zuji footprint trace"],
      ["👆", "向上指 上面 up xiangshangzhi shangmian pointing up"],
      ["👇", "向下指 下面 down xiangxiazhi xiamian pointing down"],
      ["👈", "向左指 左边 left xiangzuozhi zuobian pointing left"],
      ["👉", "向右指 右边 right xiangyouzhi youbian pointing right"],
      ["🙋", "举手 提问 raising hand jushou tiwen raising hand question"],
      ["🧏", "听障 手语 deaf tingzhang shouyu deaf sign language"],
      ["🤺", "击剑 fencing jijian fencing sword"],
      ["🤸", "侧翻 体操 cartwheel cefan ticao cartwheel gymnastics"],
      ["🤹", "杂耍 抛接 juggling zashua paojie juggling"],
      ["🚶", "步行 走路 walking buxing zoulu walking pedestrian"],
      ["🏃", "跑步 奔跑 running paobu benpao run running"],
      ["🧍", "站立 stand zhanli stand person"],
      ["🧎", "跪下 kneel guixia kneeling person"],
      ["🧘", "冥想 瑜伽 打坐 meditation mingxiang yujia dazuo lotus yoga"]
    ])
  },
  {
    labelKey: "emojiPickerCategoryAnimals",
    emojis: pt([
      ["🐶", "狗 小狗 汪 dog gou xiaoquan dog puppy pet"],
      ["🐱", "猫 喵 咪 mao miao cat kitty meow pet"],
      ["🐽", "猪鼻子 猪 pig nose zhubizi pig snout"],
      ["🐸", "青蛙 蛙 frog qingwa wa frog toad"],
      ["🐯", "老虎 虎 tiger laohu hu tiger"],
      ["🦊", "狐狸 狐 fox huli hu fox"],
      ["🐻", "熊 bear xiong bear"],
      ["🐨", "考拉 树袋熊 koala kaola shu daixiong koala"],
      ["🐼", "熊猫 panda xiongmao panda"],
      ["🐷", "猪 小猪 pig zhu xiaozhu pig piglet"],
      ["🐖", "猪 母猪 sow zhu muzhu pig sow"],
      ["🐘", "大象 象 elephant daxiang xiang elephant"],
      ["🦁", "狮子 狮 lion shizi shi lion face"],
      ["🦒", "长颈鹿 giraffe changjinglu giraffe"],
      ["🦔", "刺猬 hedgehog ciwei hedgehog"],
      ["🐭", "老鼠 鼠 mouse laoshu shu mouse"],
      ["🐹", "仓鼠 hamster cangshu hamster pet"],
      ["🐗", "野猪 boar yezhu boar pig"],
      ["🐔", "母鸡 鸡 chicken muji ji chicken hen"],
      ["🐓", "公鸡 rooster gongji rooster cock"],
      ["🐣", "孵化 小鸡 破壳 hatching xiaoji poken chick hatch egg"],
      ["🐤", "小鸡 雏鸟 baby chick xiaoji chuniao baby chick"],
      ["🐥", "小鸡 正面 baby chick front xiaoji zhengmian chick"],
      ["🐦", "小鸟 鸟 bird xiaoniao niao bird"],
      ["🐧", "企鹅 penguin qie penguin"],
      ["🦆", "鸭子 鸭 duck yazi ya duck"],
      ["🦢", "天鹅 swan tiane swan"],
      ["🦅", "鹰 老鹰 eagle ying laoying eagle bald"],
      ["🦄", "独角兽 unicorn dujiaoshou unicorn magical"],
      ["🦈", "鲨鱼 shark shayu shark"],
      ["🐙", "章鱼 octopus zhangyu octopus"],
      ["🐚", "贝壳 海螺 shell beike hailuo shell sea snail"],
      ["🐠", "热带鱼 tropical fish redaiyu tropical fish reef"],
      ["🐟", "鱼 fish yu fish"],
      ["🐬", "海豚 dolphin haitun dolphin"],
      ["🐋", "鲸鱼 whale jingyu whale"],
      ["🐍", "蛇 snake she snake serpent"],
      ["🐊", "鳄鱼 crocodile eyu crocodile alligator"],
      ["🐅", "老虎 tiger laohu tiger"],
      ["🐆", "豹子 豹 leopard baozi bao leopard"],
      ["🐎", "马 马 horse ma horse racing"],
      ["🐿", "松鼠 chipmunk songshu squirrel chipmunk rodent"],
      ["🐝", "蜜蜂 蜂 bee mifeng feng bee honey"],
      ["🐛", "毛毛虫 虫 bug maomaochong chong bug caterpillar"],
      ["🦋", "蝴蝶 butterfly hudie butterfly"],
      ["🐌", "蜗牛 snail woniu snail slow"],
      ["🐜", "蚂蚁 ant mayi ant"],
      ["🐞", "瓢虫 ladybug piaochong ladybug beetle lucky"],
      ["🐫", "骆驼 双峰驼 camel luotuo shuangfeng camel two humps"],
      ["🐢", "乌龟 龟 turtle wugui gui turtle tortoise slow"]
    ])
  },
  {
    labelKey: "emojiPickerCategoryFood",
    emojis: pt([
      ["🍎", "苹果 红 apple pingguo hong apple red fruit"],
      ["🍏", "青苹果 绿 apple qing pingguo lü green apple fruit"],
      ["🍐", "梨 pear li pear fruit"],
      ["🍊", "橘子 橙 mandarin juzi cheng orange tangerine citrus fruit"],
      ["🍋", "柠檬 lemon ningmeng lemon sour citrus fruit"],
      ["🍌", "香蕉 banana xiangjiao banana fruit"],
      ["🍉", "西瓜 watermelon xigua watermelon melon summer fruit"],
      ["🍈", "哈密瓜 甜瓜 melon hamigua tiangua melon fruit"],
      ["🍇", "葡萄 grape putao grape grapes fruit"],
      ["🍓", "草莓 strawberry caomei strawberry berry fruit"],
      ["🍒", "樱桃 cherry yingtao cherry fruit"],
      ["🍑", "桃子 水蜜桃 peach taozi peach fruit"],
      ["🍅", "番茄 西红柿 tomato fanqie xihongshi tomato"],
      ["🥥", "椰子 coconut yézi coconut tropical"],
      ["🥑", "牛油果 鳄梨 avocado niuyouguo èlí avocado"],
      ["🍆", "茄子 eggplant qiézi eggplant aubergine vegetable"],
      ["🥔", "土豆 马铃薯 potato tudou málíngshu potato vegetable"],
      ["🥕", "胡萝卜 carrot húluóbo carrot vegetable"],
      ["🌽", "玉米 corn yumi corn maize vegetable"],
      ["🌶", "辣椒 辣 chili pepper làjiào là pepper spicy hot"],
      ["🥒", "黄瓜 cucumber huánggua cucumber vegetable"],
      ["🥦", "西兰花 椰菜花 broccoli xīlánhuā broccoli vegetable"],
      ["🍄", "蘑菇 菌 mushroom mógu mushroom fungus vegetable"],
      ["🥜", "花生 peanut huāshēng peanut nut"],
      ["🌰", "板栗 栗子 chestnut bǎnlì lìzi chestnut nut"],
      ["🍞", "面包 bread miànbāo bread loaf"],
      ["🥐", "牛角包 可颂 croissant niújiǎobāo kèsòng croissant bread"],
      ["🥖", "法棍 长棍面包 baguette fǎgùn baguette french bread"],
      ["🥞", "煎饼 薄饼 pancake jiānbǐng pancake breakfast"],
      ["🧀", "芝士 奶酪 cheese zhīshì cheese wedge"],
      ["🍖", "肉 骨头连肉 meat ròu meat bone shank"],
      ["🍗", "鸡腿 鸡肉 chicken leg jītuǐ chicken drumstick poultry"],
      ["🍔", "汉堡 hamburger hànbǎo burger fast food"],
      ["🍟", "薯条 french fries shǔtiáo fries chips potato fast food"],
      ["🍕", "披萨 比萨 pizza pīsà pizza slice italian"],
      ["🌭", "热狗 hot dog re gou hotdog sausage fast food"],
      ["🥪", "三明治 sandwich sānmíngzhì sandwich bread"],
      ["🌮", "塔可 墨西哥卷 taco tǎkě taco mexican"],
      ["🥙", "皮塔饼 口袋饼 pita pítǎbǐng flatbread pita pocket"],
      ["🥚", "鸡蛋 蛋 egg jidan egg chicken"],
      ["☕", "咖啡 热饮 咖啡杯 coffee kafei hot beverage tea cafe"],
      ["🍳", "煎蛋 炒菜 烹饪 cooking jiāndàn fried egg pan cooking"],
      ["🍲", "炖菜 砂锅 汤锅 stew dùncài shāguō pot stew soup"],
      ["🥣", "碗勺 早餐 麦片粥 bowl with spoon wǎnsháo breakfast cereal porridge"],
      ["🥗", "沙拉 蔬菜沙拉 salad shālā salad healthy"],
      ["🍛", "咖喱饭 curry gali curry rice spicy"],
      ["🍜", "面条 拉面 汤面 noodles miàntiáo ramen noodle soup"],
      ["🍙", "饭团 rice ball fàntuán onigiri rice ball japanese"],
      ["🍚", "米饭 米 cooked rice mǐfàn mǐ rice bowl"],
      ["🍝", "意面 意大利面 spaghetti yìmiàn pasta spaghetti noodles italian"],
      ["🍠", "红薯 地瓜 roasted sweet potato hóngshǔ dìguā sweet potato roasted"],
      ["🍤", "炸虾 天妇罗 fried shrimp zháxiā tempura shrimp fried seafood"],
      ["🥄", "勺子 调羹 spoon sháozi tiáogēng spoon utensil"],
      ["🍿", "爆米花 popcorn bàomǐhuā popcorn movie snack"],
      ["🥫", "罐头 canned food guàntóu canned food tin"],
      ["🍱", "便当 bento biàndang bento box japanese lunch"],
      ["🍘", "米果 米饼 rice cracker mǐgu rice cracker japanese"],
      ["🍦", "甜筒 冰淇淋 soft ice cream tiántǒng bīngqílín soft serve icecream cone"],
      ["🍨", "冰激凌 冰淇淋 ice cream bīngjīlín ice cream dessert"],
      ["🍧", "刨冰 shaved ice baobing shaved ice dessert"],
      ["🍩", "甜甜圈 doughnut tiántiánquān donut doughnut sweet"],
      ["🍪", "曲奇 饼干 cookie qūqí bǐnggān cookie biscuit sweet"],
      ["🍫", "巧克力 chocolate qiǎokèlì chocolate bar sweet"],
      ["🍬", "糖果 糖 candy tángguǒ táng candy sweet"],
      ["🍭", "棒棒糖 lollipop bàngbàngtáng lollipop sweet candy"],
      ["🍮", "布丁 甜点 custard bùdīng pudding custard dessert flan"],
      ["🍯", "蜂蜜 蜜罐 honey fēngmì honey pot bee"],
      ["🍰", "蛋糕 切块蛋糕 shortcake dàngāo cake slice dessert strawberry"],
      ["🥓", "培根 bacon péigēn bacon pork"],
      ["🥧", "馅饼 派 pie xiànbǐng pie pastry dessert"],
      ["🎂", "生日蛋糕 蛋糕 birthday cake shēngrì dàngāo birthday cake party celebrate"],
      ["🧁", "纸杯蛋糕 cupcake zhǐbēidàngāo cupcake baking dessert"],
      ["🍻", "香槟 开瓶 champagne xiāngbīn champagne celebrate party bottle"],
      ["🍺", "啤酒 干杯 beer píjiǔ gānbēi beer drink mug cheer"],
      ["🥤", "奶茶 吸管饮料 cup with straw nǎichá xīguǎn straw cup drink bubble tea"],
      ["🍼", "奶瓶 婴儿 baby bottle nǎipíng baby milk bottle infant"],
      ["🥩", "肉排 牛排 steak ròupái niúpái steak meat cut"],
      ["🥯", "贝果 bagel bèiguǒ bagel bread"],
      ["🧂", "盐 调料 salt yán tiàoliào salt seasoning shaker"],
      ["🧃", "果汁 盒装饮料 juice guǒzhī juice box drink beverage"],
      ["🧊", "冰块 冰 ice cube bīngkuài ice cube cold"]
    ])
  },
  {
    labelKey: "emojiPickerCategoryActivities",
    emojis: pt([
      ["⚽", "足球 足球赛 soccer zúqiú soccer football ball"],
      ["🏀", "篮球 basketball lánqiú basketball ball"],
      ["🏈", "橄榄球 美式足球 american football gǎnlǎnqiú football american"],
      ["🎾", "网球 tennis wǎngqiú tennis ball racket"],
      ["🏐", "排球 volleyball páiqiú volleyball ball"],
      ["🏓", "乒乓 乒乓球 ping pong pīngpāng table tennis paddle"],
      ["🏄", "冲浪 surfing chōnglàng surf wave sea"],
      ["🏊", "游泳 swimming yóuyǒng swim swimmer pool"],
      ["🏋", "举重 健身 weightlifting jǔzhòng jiànshēn weightlifting gym"],
      ["🚴", "骑车 自行车 cycling qíchē zìxíngchē cycling bike bicycle"],
      ["🏆", "奖杯 冠军 trophy jiǎngbēi guànjūn trophy champion winner"],
      ["🥇", "金牌 第一 gold medal jīnpái dìyī gold medal first winner"],
      ["🥈", "银牌 第二 silver medal yínpái dìèr silver medal second"],
      ["🥉", "铜牌 第三 bronze medal tóngpái dìsān bronze medal third"],
      ["🏅", "奖牌 徽章 medal jiǎngpái huīzhāng sports medal badge"],
      ["🎖", "军功章 荣誉 military honor jūngōngzhāng róngyù military medal honor"],
      ["🎯", "靶心 目标 命中 target bǎxīn mùbiāo target dart bullseye goal"],
      ["🎮", "游戏手柄 游戏 game pad yóuxìshǒubǐng yóuxì game controller video"],
      ["🕹", "摇杆 街机 joystick yáogǎn jiējī joystick arcade game"],
      ["🎲", "骰子 色子 dice tóuzi shǎizi dice game random"],
      ["🧩", "拼图 puzzle pīntú puzzle piece jigsaw"],
      ["🧸", "玩具熊 泰迪熊 teddy wánjùxióng tàidí teddy bear toy plush"],
      ["🎰", "老虎机 抽奖 slot machine lǎohǔjī chōujiǎng slot machine casino luck"],
      ["🎭", "戏剧 面具 表演 theater xìjù miànjù biǎoyǎn theater masks drama act"],
      ["🎨", "调色板 美术 画画 palette tiáosèbǎn art paint draw artist"],
      ["🎬", "场记板 电影 开拍 movie chǎngjìbǎn diànyǐng clapper film action"],
      ["🎤", "麦克风 唱歌 KTV microphone màikèfēng chànggē microphone sing karaoke"],
      ["🎧", "耳机 调音 headphone ěrjī headphone music audio listen"],
      ["🎵", "音符 音乐 music note yīnfú yīnyuè music note"],
      ["🎶", "歌曲 音符 旋律 melody gēqǔ xuánlǜ music notes melody"],
      ["🎻", "小提琴 violin xiǎotíqín violin instrument"],
      ["🎷", "萨克斯 saxophone sàkèsī saxophone jazz instrument"],
      ["🎸", "吉他 guitar jítā guitar rock instrument"],
      ["🎹", "钢琴 键盘 piano gāngqín piano keyboard instrument"],
      ["🎺", "小号 喇叭 trumpet xiǎohào lǎba trumpet horn instrument"],
      ["🥁", "鼓 打鼓 drum gǔ dǎgǔ drum percussion"],
      ["🎿", "滑雪 skiing huáxuě ski snow sport"],
      ["⛷", "滑雪 滑雪者 skier huáxuě skier snow sport"],
      ["🏒", "冰球 hockey bīngqiú hockey puck ice sport"],
      ["🏌", "高尔夫 golf gāoěrfū golf golfer sport"],
      ["🏁", "方格旗 终点 checkered fānggèqí zhōngdiǎn checkered flag finish racing"],
      ["🏵", "徽章 花环 rosette huīzhāng huāhuán rosette award"],
      ["🎓", "学士帽 毕业 graduation xuéshìmào bìyè graduation cap student"],
      ["🎑", "赏月 中秋 moon viewing shǎngyuè zhōngqiū moon ceremony festival"],
      ["🎉", "派对 礼花 庆祝 party pàiduì qìngzhù party popper celebrate tada"],
      ["🎊", "彩带 礼花筒 confetti cǎidài confetti celebration"],
      ["🎈", "气球 balloon qìqiú balloon party"],
      ["🎆", "烟花 焰火 fireworks yānhuā fireworks celebration"]
    ])
  },
  {
    labelKey: "emojiPickerCategoryTravel",
    emojis: pt([
      ["🛑", "停止 停 octagon stop tíngzhǐ octagon stop sign halt"],
      ["🚦", "红绿灯 信号灯 traffic light hónglǜdēng traffic signal light"],
      ["🚗", "汽车 轿车 car qìchē jiàochē car auto"],
      ["🚕", "出租车 的士 taxi chūzūchē taxi cab"],
      ["🚌", "公交车 巴士 bus gōngjiāochē bus"],
      ["🚃", "车厢 火车车厢 railway carriage chēxiāng huǒchē railway car"],
      ["🚎", "无轨电车 电车 trolleybus diànchē trolley bus"],
      ["🚙", "休旅车 越野车 SUV xiūlǚchē yuèyě suv recreational"],
      ["🚛", "货车 卡车 truck huòchē kǎchē truck lorry delivery"],
      ["🚑", "救护车 ambulance jiùhùchē ambulance emergency"],
      ["🚒", "消防车 fire truck xiāofángchē fire engine truck"],
      ["🚓", "警车 police car jǐngchē police car"],
      ["🚐", "面包车 厢式车 van miànbāochē minibus van"],
      ["🚲", "自行车 单车 bicycle zìxíngchē dānchē bicycle bike cycle"],
      ["🛴", "滑板车 scooter huábǎnchē scooter kick"],
      ["🚁", "直升机 helicopter zhíshēngjī helicopter"],
      ["🚂", "蒸汽火车 火车 locomotive zhēngqìhuǒchē steam locomotive train"],
      ["🛫", "起飞 离港 takeoff qǐfēi airplane departure takeoff flight"],
      ["🚍", "公交车 双层巴士 bus gōngjiāochē bus doubledecker"],
      ["⛵", "帆船 帆板 sailboat fānchuán sailing sailboat"],
      ["🛶", "独木舟 小船 canoe dūmùzhōu canoe boat kayak"],
      ["⛴", "渡轮 轮渡 ferry dùlún ferry boat ship"],
      ["🚀", "火箭 发射 rocket huǒjiàn fāshè rocket launch space"],
      ["🛺", "三轮车 tuk-tuk sānlúnchē auto rickshaw taxi"],
      ["🗺", "世界地图 地图 map shìjièdìtú world map travel navigate"],
      ["🗼", "东京塔 tokyo tower dōngjīngtǎ tower landmark japan"],
      ["🌋", "火山 volcano huǒshān volcano eruption"],
      ["🗻", "富士山 fuji fùshìshān mount fuji japan volcano"],
      ["🏔", "雪山 雪峰 mountain xuěshān mountain snow peak"],
      ["🏖", "海滩 沙滩伞 beach hǎitān beach umbrella sea"],
      ["🏜", "沙漠 desert shāmò desert"],
      ["🏝", "热带岛屿 荒岛 desert island rèdàidǎoyǔ island tropical palm"],
      ["🌊", "海浪 浪 wave hǎilàng wave sea ocean water"],
      ["🏠", "房子 家 house fángzi jiā home house"],
      ["🏡", "花园房 小屋 house garden huāyuánfáng cottage home"],
      ["🏗", "建造 工地 建筑 construction jiànzào gōngdì building crane"],
      ["🏭", "工厂 factory gōngchǎng factory industrial"],
      ["🏢", "办公楼 写字楼 office bàngōnglóu office building work"],
      ["🏥", "医院 hospital yīyuàn hospital"],
      ["🏦", "银行 bank yínháng bank money"],
      ["🏪", "便利店 商店 convenience store biànlìdiàn store shop 24"],
      ["🏫", "学校 school xuéxiào school"],
      ["🏬", "百货公司 商场 department store bǎihuò shāngchǎng store mall"],
      ["🏨", "酒店 旅馆 hotel jiǔdiàn hotel"],
      ["🏯", "城堡(日式) 天守阁 japanese castle tiānshǒugé japanese castle"],
      ["🏰", "城堡 欧式 castle chéngbǎo castle european fairy"],
      ["💒", "婚礼 教堂 wedding hūnlǐ wedding chapel marry"],
      ["🗽", "自由女神 liberty zìyóunǚshén statue liberty new york"]
    ])
  },
  {
    labelKey: "emojiPickerCategoryObjects",
    emojis: pt([
      ["⌚", "手表 watch shǒubiǎo watch wristwatch time"],
      ["📱", "手机 phone shǒujī phone mobile smartphone"],
      ["💻", "笔记本电脑 电脑 laptop bǐjìběndiànnǎo computer laptop notebook"],
      ["🖥", "台式机 显示器 desktop táishìjī computer display monitor"],
      ["🖨", "打印机 printer dǎyìnjī printer print"],
      ["⌨", "键盘 keyboard jiànpán keyboard typing"],
      ["🖱", "鼠标 mouse shǔbiāo mouse click computer"],
      ["🖲", "轨迹球 trackball guǐjìqiú trackball"],
      ["💽", "光盘 光碟 minidisc guāngdié disc optical"],
      ["💾", "软盘 保存 floppy disk ruǎnpán bǎocún floppy save disk"],
      ["📀", "光盘 DVD DVD guāngpán disc dvd cd optical"],
      ["📷", "相机 拍照 camera xiàngjī pāizhào camera photo"],
      ["📸", "闪光灯 拍照 拍立得 flash pāizhào pāilìdé camera flash photograph"],
      ["📼", "录像带 VHS lùxiàngdài video tape vhs record"],
      ["🔍", "放大镜 搜索 magnify fàngdàjìng magnifying search zoom find"],
      ["🔬", "显微镜 科学 microscope xiǎnwēijìng microscope science research"],
      ["🔭", "望远镜 天文 telescope wàngyuǎnjìng telescope stars astronomy"],
      ["💡", "灯泡 主意 点子 bulb dēngpào idea light bulb"],
      ["🔦", "手电筒 flashlight shǒudiàntǒng flashlight torch"],
      ["🕯", "蜡烛 candle làzhú candle light"],
      ["🗑", "垃圾桶 删除 trash lajitong trash bin delete garbage"],
      ["🛡", "盾牌 防护 shield dùnpái shield defense protection"],
      ["🔧", "扳手 工具 wrench bānshǒu wrench tool fix"],
      ["🔨", "锤子 敲 hammer chuízi hammer tool"],
      ["🛠", "锤子扳手 工具 设置 tools tools settings fix hammer wrench"],
      ["🔗", "链接 连接 link lianjie link chain url"],
      ["📎", "回形针 别针 paperclip huíxíngzhēn paperclip attach clip"],
      ["📐", "直尺 三角板 ruler zhíchǐ ruler measure design triangle"],
      ["✏", "铅笔 pencil qiānbǐ pencil write draw"],
      ["✒", "钢笔 笔尖 pen gāngbǐ pen nib fountain"],
      ["🖋", "钢笔 写字 fountain pen gāngbǐ pen write"],
      ["🖊", "笔 pen bǐ pen write"],
      ["📌", "图钉 定位 pushpin túdīng pushpin pin mark"],
      ["📍", "圆图钉 定位 位置 round pushpin dìngwèi wèizh location pin gps"],
      ["📑", "书签 标签页 bookmark shūqiān bookmark tabs marker"],
      ["📚", "书堆 书籍 学习 books shūjí books study reading"],
      ["📖", "打开的书 阅读 open book yuèdú open book reading"],
      ["📦", "包裹 箱子 快递 package bāoguǒ kuàidì package box shipping"],
      ["📥", "收件箱 收到 inbox shōujiànxiāng inbox receive"],
      ["📢", "大喇叭 喊话 announcement dàlǎba loudspeaker announce"],
      ["📣", "扬声器 应援 megaphone yángshēngqì megaphone cheer"],
      ["📫", "信箱 有信 mailbox xìnxiāng mailbox mail post"],
      ["📮", "邮筒 信件 postbox yóutǒng postbox mail"],
      ["📝", "写字 记录 备忘 note xiězì jìlù memo note write record"],
      ["📅", "日历 日期 calendar rìlì rìqī calendar date"],
      ["📆", "台历 撕日历 tear calendar táilì calendar"],
      ["📋", "剪贴板 清单 clipboard jiǎntiēbǎn clipboard checklist"],
      ["📄", "文件 文档 page file wénjiàn page document file"],
      ["💲", "美元 价格 dollar měiyuán dollar price money sign"],
      ["💴", "日元 yen rìyuán yen banknote money"],
      ["💷", "英镑 pound yīngbàng pound banknote gbp money"],
      ["💰", "钱袋 金钱 钱 money bag qiándài qián money bag cash rich"],
      ["💳", "信用卡 刷卡 credit card xìnyòngkǎ shuākǎ credit card payment"],
      ["💋", "唇印 吻 kiss mark chunyin kiss mark lipstick"],
      ["🔮", "水晶球 占卜 crystal ball shuǐjīngqiú crystal fortune future"],
      ["🗿", "石像 摩艾 moai shíxiàng moai statue easter island"],
      ["💄", "口红 化妆 lipstick kǒuhóng lipstick makeup"],
      ["💍", "戒指 求婚 ring jièzhi ring diamond propose"],
      ["💎", "宝石 钻石 gem bǎoshí zuànshí gem diamond jewel"],
      ["👟", "运动鞋 跑鞋 sneaker yùndòngxiē sneaker shoe running"],
      ["👞", "男鞋 皮鞋 mans shoe nánxiē leather shoe dress"],
      ["👠", "高跟鞋 high heel gāogēnt high heel shoe"],
      ["👡", "凉鞋 sandal liángxiē sandal women shoe"],
      ["👜", "手提包 包包 handbag shǒutíbāo handbag bag purse"]
    ])
  },
  {
    labelKey: "emojiPickerCategorySymbols",
    emojis: pt([
      ["❤", "红心 爱心 喜欢 爱 heart hongxin aixin love red heart like"],
      ["🧡", "橙心 orange heart chéngxīn orange heart love"],
      ["💛", "黄心 yellow heart huángxīn yellow heart love"],
      ["💚", "绿心 green heart lǜxīn green heart love"],
      ["💙", "蓝心 blue heart lánxīn blue heart love"],
      ["💜", "紫心 purple heart zǐxīn purple heart love"],
      ["💔", "心碎 分手 broken heart xīnsuì fēnshǒu broken heart breakup"],
      ["💕", "两颗心 爱心 恋爱 two hearts liangkexin aixin love couple"],
      ["💞", "转圈心 恩爱 revolving hearts zhuānquānxīn revolving hearts couple"],
      ["💓", "心跳 爱心 恋爱中 beating heart xintiao aixin love pulse"],
      ["💖", "闪亮心 爱心 心动 sparkling heart shanliangxin aixin love"],
      ["💗", "心动 爱心 成长的心 growing heart xindong aixin love"],
      ["💘", "心形箭头 一箭穿心 arrow heart xīnxíngjiàntóu arrow heart cupid love"],
      ["💝", "心形礼盒 礼物 heart ribbon xīnxínglǐhé heart gift ribbon present"],
      ["💟", "心形装饰 heart decoration xīnxíngzhuāngshì heart decoration"],
      ["💠", "菱形 花钻 diamond dot língxíng diamond dot flower"],
      ["♥", "红心牌 heart suit hóngxīn heart suit card"],
      ["♠", "黑桃 spade suit hēitáo spade card poker"],
      ["♦", "方块 diamond suit fāngkuài diamond card poker"],
      ["♣", "梅花 club suit méihuā club card poker"],
      ["✅", "对 勾 正确 完成 check duì gōu zhèngquè check mark correct done yes"],
      ["⚠", "警告 注意 warning jǐnggào zhùyì warning caution alert"],
      ["🚫", "禁止 不允许 prohibited jìnzhǐ prohibited forbidden no"],
      ["🚩", "红旗 标记 flag hóngqí flag mark triangle"],
      ["⛔", "禁行 禁止通行 no entry jìnxíng no entry"],
      ["⭐", "星星 star xīngxīng star"],
      ["🌟", "闪亮星星 发光 glowing star shǎnliàng fāguāng glowing star"],
      ["✨", "闪亮亮 亮点 效果 sparkles shǎnliàngliàng sparkles shiny magic"],
      ["⚡", "闪电 高能 电 lightning bolt shǎndiàn lightning zap flash power"],
      ["🔥", "火 热门 燃 fire huǒ flame hot lit popular"],
      ["🌈", "彩虹 rainbow cǎihóng rainbow"],
      ["☀", "太阳 晴 sun tàiyáng sun sunny"],
      ["☁", "云 阴天 cloud yún yīntiān cloud"],
      ["⛅", "多云 晴间多云 sun behind cloud duōyún partly cloudy"],
      ["⛄", "雪人 snowman xuěrén snowman winter"],
      ["🌧", "下雨 雨 rain xiàyǔ rain cloud"],
      ["🌨", "下雪 雪 snow xiàxuě snow cloud"],
      ["🌩", "打雷 雷电 thunder dǎléi thunder storm lightning"],
      ["🌪", "龙卷风 tornado lóngjuǎnfēng tornado hurricane"],
      ["🌫", "雾 fog wù fog mist"],
      ["🌬", "刮风 风 wind guāfēng wind face blow"],
      ["❌", "叉 错误 错 cha cuòwù cross mark wrong error x"],
      ["❎", "叉号按钮 取消 cross button chàhào cross mark button cancel"],
      ["❗", "感叹号 注意 exclamation gǎntànhào exclamation important"],
      ["❓", "问号 疑问 question wènhào question doubt"],
      ["❕", "白色感叹号 white exclamation báisè gǎntànhào exclamation outline"],
      ["❔", "白色问号 white question báisè wènhào question outline"],
      ["⁉", "双感叹号 双叹 double exclamation shuāng gǎntànhào double bang"],
      ["🔟", "数字十 十 keycap ten shùzì ten number 10"],
      ["🔢", "数字 输入数字 numbers shùzì numbers 1234 input"],
      ["🔣", "符号 symbols fúhào symbols"],
      ["🔤", "字母 输入字母 abc letters zìmǔ abc alphabet letters input"],
      ["🔝", "顶部 置顶 top top dǐngbù top up arrow"],
      ["🔞", "未成年禁止 18 jìnzhǐ wèichéngnián no one under eighteen adult"],
      ["📴", "手机关机 勿扰 phone off shǒujī guānjī mobile phone off mute"],
      ["🔆", "亮度 调亮 brightness liàngdù brightness high bright"]
    ])
  }
], xt = "zt-md-emoji-picker";
let St = null;
const jk = (e, t) => {
  !bt(e) || !e.dispatch || (e.dispatch(e.state.tr.insertText(t).scrollIntoView()), e.focus());
}, fa = (e, t, n) => {
  const o = t.getBoundingClientRect(), r = e.offsetWidth || 320, i = e.offsetHeight || 380;
  let s = (o.width - r) / 2, a = (o.height - i) / 2;
  n && (s = n.left - o.left, a = n.bottom - o.top + 8), s = Math.min(Math.max(s, 8), Math.max(8, o.width - r - 8)), a = Math.min(Math.max(a, 8), Math.max(8, o.height - i - 8)), e.style.left = `${s}px`, e.style.top = `${a}px`;
}, bi = (e) => {
  const { portalContainer: t, view: n, messages: o } = e;
  if (St == null || St(), St = null, !bt(n))
    return;
  const r = document.createElement("div");
  r.className = xt, r.setAttribute("role", "dialog"), r.setAttribute("aria-label", o.emojiPickerTitle);
  const i = document.createElement("input");
  i.type = "text", i.className = `${xt}-search`, i.placeholder = o.emojiPickerSearchPlaceholder, i.setAttribute("aria-label", o.emojiPickerSearchPlaceholder), r.appendChild(i);
  const s = document.createElement("div");
  s.className = `${xt}-body`, r.appendChild(s), t.appendChild(r);
  const a = (g) => (
    // biome-ignore lint/suspicious/noMisleadingCharacterClass: NFD 后该范围本身即组合附加符号,逐字剥离无"字符+组合符"合并问题
    g.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  ), l = (g, y, f) => {
    const w = a(g.toLowerCase());
    return y !== "" && new RegExp("\\P{ASCII}", "u").test(y) && w.includes(y) ? !0 : f === "" || !f ? !1 : w.split(/\s+/).some((b) => b.startsWith(f));
  }, c = (g) => {
    s.innerHTML = "";
    const y = a(g.trim().toLowerCase()), f = y.replace(/\s+/g, "");
    let w = !1;
    if (lc.forEach((b) => {
      const k = o[b.labelKey], v = y !== "" && k.toLowerCase().includes(y), E = y === "" ? b.emojis : b.emojis.filter((T) => v || l(T.keywords, y, f));
      if (E.length === 0)
        return;
      w = !0;
      const M = document.createElement("div");
      M.className = `${xt}-group`, M.textContent = k, s.appendChild(M);
      const x = document.createElement("div");
      x.className = `${xt}-grid`, E.forEach((T) => {
        const L = document.createElement("button");
        L.type = "button", L.className = `${xt}-cell`, L.textContent = T.char, L.title = Kk(T), L.setAttribute("aria-label", L.title), L.addEventListener("mousedown", (S) => {
          S.preventDefault();
        }), L.addEventListener("click", () => {
          jk(n, T.char), u();
        }), x.appendChild(L);
      }), s.appendChild(x);
    }), !w) {
      const b = document.createElement("div");
      b.className = `${xt}-empty`, b.textContent = o.emojiPickerNoResults, s.appendChild(b);
    }
  }, d = qn(() => {
    var g;
    fa(r, t, ((g = e.anchorEl) == null ? void 0 : g.getBoundingClientRect()) ?? e.anchorRect ?? null);
  }), u = () => {
    St === u && (St = null, document.removeEventListener("mousedown", h, !0), document.removeEventListener("keydown", p, !0), d.destroy(), r.remove());
  };
  St = u;
  const h = (g) => {
    const y = g.target;
    r.contains(y) || u();
  }, p = (g) => {
    g.key === "Escape" && (g.stopPropagation(), u());
  };
  document.addEventListener("mousedown", h, !0), document.addEventListener("keydown", p, !0), d.bindGlobal(), d.bindElement(t), i.addEventListener("input", () => {
    c(i.value);
  }), c(""), fa(r, t, e.anchorRect ?? Wk(n)), i.focus();
}, Kk = (e) => e.keywords.split(/\s+/)[0] ?? e.char, Wk = (e) => {
  var o, r;
  const t = (r = (o = e == null ? void 0 : e.state) == null ? void 0 : o.selection) == null ? void 0 : r.from;
  if (typeof t != "number")
    return null;
  const n = e.coordsAtPos(t);
  return n ? new DOMRect(n.left, n.top, Math.max(n.right - n.left, 1), n.bottom - n.top) : null;
}, Pr = /* @__PURE__ */ new WeakMap(), ga = (e, t) => {
  if (t === null) {
    Pr.delete(e);
    return;
  }
  Pr.set(e, t);
}, cc = (e, t) => {
  const n = Pr.get(e);
  return n ? (n(e, t), !0) : !1;
}, Dr = "slash-menu", sn = `${Dr}-item`, ba = "selected", Uk = 320, Vk = "command", qk = (e, t) => {
  const n = document.createElement("div");
  n.className = Dr, n.style.display = "none", n.setAttribute("role", "listbox"), e.appendChild(n);
  const o = Hl(t);
  let r = null, i = -1, s = null, a = !1;
  const l = (b, k) => {
    if (n.innerHTML = "", b.length === 0)
      return;
    let v = "";
    b.forEach((E, M) => {
      if (E.group !== v) {
        v = E.group;
        const S = document.createElement("div");
        S.className = `${Dr}-group`, S.textContent = E.group, n.appendChild(S);
      }
      const x = document.createElement("div");
      x.className = sn, x.dataset[Vk] = E.command, x.dataset[ba] = M === k ? "true" : "false", x.setAttribute("role", "option"), x.setAttribute("aria-selected", M === k ? "true" : "false"), x.appendChild(Ie(E.icon ?? "paragraph", { size: 16, strokeWidth: 2, className: `${sn}-icon` }));
      const T = document.createElement("span");
      T.className = `${sn}-label`, T.textContent = E.label, x.appendChild(T);
      const L = o[E.command];
      if (L) {
        const S = document.createElement("kbd");
        S.className = `${sn}-shortcut`, S.textContent = L, x.appendChild(S);
      }
      n.appendChild(x);
    }), n.scrollTop = 0;
  }, c = (b) => {
    n.querySelectorAll(`.${sn}`).forEach((v, E) => {
      v.dataset[ba] = E === b ? "true" : "false", v.setAttribute("aria-selected", E === b ? "true" : "false");
    });
  }, d = () => {
    if (!s || !a)
      return;
    const { editorWrapper: b, anchorTopInContent: k, anchorBottomInContent: v, anchorLeftInContent: E, placement: M, offsetY: x } = s, T = e.getBoundingClientRect(), L = b.getBoundingClientRect(), S = L.left + E - b.scrollLeft, I = n.offsetWidth || 210, O = T.width - I - 8, J = Math.min(Math.max(S - T.left, 8), Math.max(8, O)), V = n.offsetHeight || Uk, z = (M === "top" ? L.top + k - b.scrollTop - V - x : L.top + v - b.scrollTop + x) - T.top;
    n.style.left = `${J}px`, n.style.top = `${Math.max(z, 8)}px`;
  };
  return {
    menu: n,
    renderIfNeeded: (b, k) => {
      if (r !== b) {
        r = b, i = k, l(b, k);
        return;
      }
      i !== k && (i = k, c(k));
    },
    setVisible: (b, k) => {
      a = b, b ? (n.style.display = "block", n.scrollTop = 0, d(), k == null || k()) : (n.style.display = "none", r = null, i = -1);
    },
    isVisible: () => a,
    updatePosition: () => {
      d();
    },
    updatePositionContext: (b) => {
      s = b;
    },
    scrollActiveItemIntoView: (b) => {
      const k = n.querySelector(`.${sn}[data-selected="true"]`), v = k;
      v && typeof v.scrollIntoViewIfNeeded == "function" ? v.scrollIntoViewIfNeeded(!1) : k == null || k.scrollIntoView({ block: "nearest" }), b == null || b();
    },
    destroy: () => {
      n.remove();
    }
  };
}, Gk = (e) => ue((t) => {
  $g(e.locale);
  const n = ac(e.config, e.locale ?? "zh-CN");
  let o = n;
  try {
    const b = t.get(td).nodes;
    o = n.filter((k) => k.command === "inlineMath" ? !!b.math_inline : k.command === "mathBlock" ? !!b.math_block : k.command === "csvTable" ? !!b.csvdata : k.command === "layoutBlock" ? !!b.meditor_layout : !0);
  } catch {
  }
  const r = qk(
    e.portalContainer,
    e.shortcutMode ?? "modShift"
  );
  let i = 0, s = null, a = o, l = !1, c = !1, d = !1;
  const u = /* @__PURE__ */ new Set(["ArrowDown", "ArrowUp", "Enter", "Escape"]), h = (b) => {
    if (!u.has(b.key) || !l)
      return !1;
    if (b.key === "ArrowDown")
      return b.preventDefault(), a.length === 0 || (i = (i + 1) % a.length, r.renderIfNeeded(a, i), r.scrollActiveItemIntoView(() => {
        r.updatePosition();
      })), !0;
    if (b.key === "ArrowUp")
      return b.preventDefault(), a.length === 0 || (i = (i - 1 + a.length) % a.length, r.renderIfNeeded(a, i), r.scrollActiveItemIntoView(() => {
        r.updatePosition();
      })), !0;
    if (b.key === "Enter")
      return b.preventDefault(), f(), !0;
    if (b.key === "Escape") {
      b.preventDefault();
      const k = c;
      return c = !1, l = !1, r.setVisible(!1), !k && s && bt(s) && pa(s), !0;
    }
    return !1;
  }, p = (b) => {
    var E, M, x;
    const k = (M = (E = b == null ? void 0 : b.state) == null ? void 0 : E.selection) == null ? void 0 : M.from;
    if (typeof k != "number")
      return null;
    const v = (x = b == null ? void 0 : b.coordsAtPos) == null ? void 0 : x.call(b, k);
    return v ? new DOMRect(
      v.left,
      v.top,
      Math.max(v.right - v.left, 1),
      v.bottom - v.top
    ) : null;
  }, g = (b, k) => {
    const v = (k == null ? void 0 : k.docChanged) !== !1;
    if (!bt(b)) {
      a = [], l = !1, c = !1, r.updatePositionContext(null), r.setVisible(!1);
      return;
    }
    if (c) {
      if (Nr(b)) {
        c = !1, l = !1, r.updatePositionContext(null), r.setVisible(!1);
        return;
      }
      a = o, l = !0;
    } else {
      const x = $k(b, o);
      if (a = x.visibleItems, l = x.shouldShow, !x.shouldShow || !r.isVisible() && !v) {
        l = !1, r.updatePositionContext(null), r.setVisible(!1);
        return;
      }
    }
    i >= a.length && (i = 0), r.isVisible() || (i = 0);
    const E = p(b), M = $n(
      b == null ? void 0 : b.dom,
      e.scrollContainerSelector
    );
    if (E && M) {
      const T = wu(E, 320), L = Xe(E, M);
      r.updatePositionContext({
        editorWrapper: M,
        anchorTopInContent: L.anchorTopInContent,
        anchorBottomInContent: L.anchorBottomInContent,
        anchorLeftInContent: L.anchorLeftInContent,
        placement: T,
        offsetY: 8
      });
    }
    r.renderIfNeeded(a, i), r.isVisible() ? r.updatePosition() : r.setVisible(!0, () => {
      r.updatePosition();
    });
  }, y = (b, k) => {
    if (bt(b)) {
      if (typeof k == "number") {
        if (k < 0 || k > b.state.doc.content.size)
          return;
        const v = b.state.doc.resolve(k).nodeAfter;
        if (!v)
          return;
        const E = b.state.schema.nodes.paragraph;
        if (!E)
          return;
        if (v.type.name === "paragraph" && v.content.size === 0) {
          const M = de.near(b.state.doc.resolve(k + 1), 1);
          b.dispatch(
            b.state.tr.setSelection(M).setMeta("zt-md-slash-menu-pin", !0).scrollIntoView()
          );
        } else {
          const M = k + v.nodeSize, x = b.state.tr.insert(M, E.create()), T = de.near(x.doc.resolve(M + 1), 1);
          b.dispatch(
            x.setSelection(T).setMeta("zt-md-slash-menu-pin", !0).scrollIntoView()
          );
        }
        b.focus();
      } else if (Nr(b))
        return;
      c = !0, d = !0, i = 0, g(b);
    }
  }, f = () => {
    var M;
    const b = c;
    if (c = !1, !bt(s)) {
      l = !1, r.updatePositionContext(null), r.setVisible(!1);
      return;
    }
    if (!s || i < 0 || i >= a.length)
      return;
    const k = a[i];
    if (!k || !pa(s) && !b)
      return;
    if (k.command === "image") {
      r.setVisible(!1), e.messages && ei({
        portalContainer: e.portalContainer,
        view: s,
        messages: e.messages,
        imageUpload: e.imageUpload
      });
      return;
    }
    if (k.command === "emoji") {
      r.setVisible(!1), e.messages && bi({
        portalContainer: e.portalContainer,
        view: s,
        messages: e.messages
      });
      return;
    }
    di(s, k.command) && (k.command === "layoutBlock" && ((M = e.onRequestLayoutMode) == null || M.call(e)), r.setVisible(!1));
  };
  r.menu.addEventListener("mousedown", (b) => {
    b.preventDefault();
    const k = b.target, v = k == null ? void 0 : k.closest(".slash-menu-item"), E = (v == null ? void 0 : v.dataset.command) ?? "";
    if (!E)
      return;
    const M = a.findIndex((x) => x.command === E);
    M < 0 || (i = M, f());
  }), r.menu.addEventListener("mouseover", (b) => {
    if (!l)
      return;
    const k = b.target, v = k == null ? void 0 : k.closest(".slash-menu-item"), E = (v == null ? void 0 : v.dataset.command) ?? "";
    if (!E)
      return;
    const M = a.findIndex((x) => x.command === E);
    M < 0 || M === i || (i = M, r.renderIfNeeded(a, i));
  });
  const w = qn(() => {
    r.isVisible() && s && g(s);
  });
  return new ye({
    key: new ke("zt-md-slash-menu"),
    props: {
      handleKeyDown: (b, k) => h(k)
    },
    view: (b) => {
      const k = (v) => {
        if (!c)
          return;
        const E = v.target;
        r.menu.contains(E) || (c = !1, l = !1, r.updatePositionContext(null), r.setVisible(!1));
      };
      return document.addEventListener("mousedown", k, !0), w.bindGlobal(), w.bindElement(
        $n(b.dom, e.scrollContainerSelector)
      ), ga(b, y), {
        update: (v, E) => {
          s = v;
          const M = !E || E.doc !== v.state.doc;
          c && !d && E && (E.doc !== v.state.doc || !E.selection.eq(v.state.selection)) && (c = !1), d = !1, g(v, { docChanged: M });
        },
        destroy: () => {
          l = !1, c = !1, w.destroy(), ga(b, null), document.removeEventListener("mousedown", k, !0), r.destroy();
        }
      };
    }
  });
}), Xk = (e, t) => (Yn() ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey) ? t === "modAlt" ? e.altKey && !e.shiftKey : e.shiftKey && !e.altKey : !1, Yk = (e, t, n, o) => (ei({
  portalContainer: t,
  view: e,
  messages: n,
  imageUpload: o
}), !0), Zk = (e, t, n) => (bi({ portalContainer: t, view: e, messages: n }), !0), Jk = (e, t, n, o) => {
  const r = Ol(n), i = Object.fromEntries(
    Object.entries(r).map(([a, l]) => [
      l.code,
      a
    ])
  );
  return (a, l) => {
    if (l.isComposing || !Xk(l, n) || !bt(a))
      return !1;
    const c = i[l.code];
    if (!c)
      return !1;
    const d = c === "image" ? Yk(a, e, t, o) : c === "emoji" ? Zk(a, e, t) : di(a, c);
    return d && l.preventDefault(), d;
  };
}, Qk = ".zt-md-code-block-action-button[data-active='true']", ew = ".zt-md-search-panel", ur = 8, Br = {
  matchIndex: 0,
  matchCount: 0,
  isInvalidExpression: !1
}, ya = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable, tw = (e) => new qa({
  search: e.search,
  replace: e.replace,
  caseSensitive: e.caseSensitive,
  wholeWord: e.wholeWord,
  regexp: e.regexp,
  literal: !0
}), dc = (e, t) => {
  if (!t.valid)
    return [];
  const n = [];
  let o = 0;
  const r = e.doc.content.size;
  for (; o < r; ) {
    const i = t.findNext(e, o, r);
    if (!i)
      break;
    n.push(i), o = Math.max(i.to, o + 1);
  }
  return n;
}, nw = (e) => {
  const t = Va(e);
  if (!t)
    return Br;
  const n = t.query, o = n.regexp && n.search.length > 0 && !n.valid, r = dc(e, n), i = r.findIndex((s) => s.from === e.selection.from && s.to === e.selection.to);
  return {
    matchIndex: i < 0 ? 0 : i + 1,
    matchCount: r.length,
    isInvalidExpression: o
  };
}, ow = (e, t) => e.matchIndex === t.matchIndex && e.matchCount === t.matchCount && e.isInvalidExpression === t.isInvalidExpression, _r = (e, t) => {
  var h;
  if (e.state.selection.empty)
    return;
  const n = $n(e.dom, t);
  if (!n)
    return;
  const o = e.coordsAtPos(e.state.selection.from), r = e.coordsAtPos(e.state.selection.to), i = Math.min(o.top, r.top), s = Math.max(o.bottom, r.bottom), a = n.getBoundingClientRect(), l = (h = n.closest(".zt-md")) == null ? void 0 : h.querySelector(ew), c = l == null ? void 0 : l.getBoundingClientRect(), d = Math.max(
    a.top + ur,
    ((c == null ? void 0 : c.bottom) ?? a.top) + ur
  ), u = a.bottom - ur;
  if (i < d) {
    n.scrollTop += i - d;
    return;
  }
  s > u && (n.scrollTop += s - u);
}, ka = (e, t) => {
  if (e.state.selection.empty)
    return;
  const n = e.domAtPos(e.state.selection.from), o = n.node instanceof Element ? n.node : n.node.parentElement, r = o == null ? void 0 : o.closest(".zt-md-code-block");
  if ((r == null ? void 0 : r.dataset.viewMode) !== "preview") {
    _r(e, t);
    return;
  }
  const i = r.querySelector(
    Qk
  );
  i == null || i.click(), window.requestAnimationFrame(() => {
    _r(e, t);
  });
};
class rw {
  /**
   * 创建搜索快照监听视图。
   */
  constructor(t, n) {
    // 最近一次已输出的搜索快照。
    m(this, "snapshot", Br);
    this.onSnapshotChange = n, this.emitSnapshot(t.state);
  }
  /**
   * 响应 ProseMirror 状态更新。
   */
  update(t) {
    this.emitSnapshot(t.state);
  }
  /**
   * 销毁时重置外部搜索状态。
   */
  destroy() {
    this.onSnapshotChange(Br);
  }
  /**
   * 在快照发生变化时通知外部。
   */
  emitSnapshot(t) {
    const n = nw(t);
    ow(this.snapshot, n) || (this.snapshot = n, this.onSnapshotChange(n));
  }
}
const iw = (e) => {
  const t = ue(() => ou()), n = ue(() => new ye({
    view: (o) => new rw(o, e)
  }));
  return [t, n];
}, sw = (e, t) => {
  const n = (d) => {
    e((h) => {
      const p = tw(d), g = Zi(h.state.tr, p);
      if (p.valid) {
        const f = p.findNext(h.state, h.state.selection.from) ?? p.findNext(h.state, 0, h.state.selection.from);
        f && g.setSelection(de.create(g.doc, f.from, f.to)).scrollIntoView();
      }
      h.dispatch(g), ka(h, t);
    });
  }, o = (d, u) => {
    const h = (p) => {
      u.dispatch(p.scrollIntoView());
    };
    d(u.state, h) && ka(u, t);
  };
  return {
    updateQuery: n,
    findPrevious: () => {
      e((u) => {
        o(iu, u);
      });
    },
    findNext: () => {
      e((u) => {
        o(su, u);
      });
    },
    replaceCurrent: () => {
      e((u) => {
        ya(u) && o(au, u);
      });
    },
    replaceAll: () => {
      e((u) => {
        if (!ya(u))
          return;
        const h = Va(u.state);
        if (!h || dc(u.state, h.query).length === 0)
          return;
        const p = (g) => {
          u.dispatch(g);
        };
        ru(u.state, p);
      });
    },
    clear: () => {
      e((u) => {
        const h = new qa({ search: "", literal: !0 });
        u.dispatch(Zi(u.state.tr, h));
      });
    },
    focusCurrent: () => {
      e((u) => {
        u.dispatch(u.state.tr.scrollIntoView()), _r(u, t), u.focus();
      });
    }
  };
}, aw = "zt-md-selection-tooltip", lw = (e) => [
  { command: "strong", icon: "bold", title: e.selectionTooltipStrongTitle, markNames: ["strong"] },
  { command: "em", icon: "italic", title: e.selectionTooltipEmTitle, markNames: ["em", "emphasis"] },
  {
    command: "strike",
    icon: "strikethrough",
    title: e.selectionTooltipStrikeTitle,
    markNames: ["strike_through", "strikeThrough"]
  },
  {
    command: "underline",
    icon: "underline",
    title: e.selectionTooltipUnderlineTitle,
    markNames: ["underline"]
  },
  {
    command: "subscript",
    icon: "subscript",
    title: e.selectionTooltipSubscriptTitle,
    markNames: ["subscript"]
  },
  {
    command: "superscript",
    icon: "superscript",
    title: e.selectionTooltipSuperscriptTitle,
    markNames: ["superscript"]
  },
  {
    command: "inlineCode",
    icon: "inlineCode",
    title: e.selectionTooltipInlineCodeTitle,
    markNames: ["inlineCode", "code_inline"]
  },
  { command: "link", icon: "link", title: e.selectionTooltipLinkTitle, markNames: ["link"] }
], qe = {
  paragraph: "paragraph",
  heading1: "heading1",
  heading2: "heading2",
  heading3: "heading3",
  heading4: "heading4",
  heading5: "heading5",
  heading6: "heading6",
  bulletList: "list",
  orderedList: "orderedList",
  taskList: "taskList",
  blockquote: "quote",
  codeBlock: "codeBlock"
}, uc = (e, t) => {
  const n = Ag(t);
  return [
    {
      command: "paragraph",
      icon: qe.paragraph,
      label: e.selectionTooltipTransformParagraphLabel,
      shortcut: n.paragraph
    },
    {
      command: "heading1",
      icon: qe.heading1,
      label: e.selectionTooltipTransformHeading1Label,
      shortcut: n.heading1
    },
    {
      command: "heading2",
      icon: qe.heading2,
      label: e.selectionTooltipTransformHeading2Label,
      shortcut: n.heading2
    },
    {
      command: "heading3",
      icon: qe.heading3,
      label: e.selectionTooltipTransformHeading3Label,
      shortcut: n.heading3
    },
    {
      command: "heading4",
      icon: qe.heading4,
      label: e.selectionTooltipTransformHeading4Label,
      shortcut: n.heading4
    },
    {
      command: "heading5",
      icon: qe.heading5,
      label: e.selectionTooltipTransformHeading5Label,
      shortcut: n.heading5
    },
    {
      command: "heading6",
      icon: qe.heading6,
      label: e.selectionTooltipTransformHeading6Label,
      shortcut: n.heading6
    },
    {
      command: "bulletList",
      icon: qe.bulletList,
      label: e.selectionTooltipTransformBulletListLabel,
      shortcut: n.bulletList
    },
    {
      command: "orderedList",
      icon: qe.orderedList,
      label: e.selectionTooltipTransformOrderedListLabel,
      shortcut: n.orderedList
    },
    {
      command: "taskList",
      icon: qe.taskList,
      label: e.selectionTooltipTransformTaskListLabel,
      shortcut: n.taskList
    },
    {
      command: "blockquote",
      icon: qe.blockquote,
      label: e.selectionTooltipTransformBlockquoteLabel,
      shortcut: n.blockquote
    },
    {
      command: "codeBlock",
      icon: qe.codeBlock,
      label: e.selectionTooltipTransformCodeBlockLabel,
      shortcut: n.codeBlock
    }
  ];
}, Bo = 14, _o = 2, cw = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable, rt = (e, t) => {
  const n = e.state.schema.marks, o = t.find((r) => n[r]);
  return o ? n[o] ?? null : null;
}, yi = (e, t) => {
  const { from: n, to: o } = e.selection;
  return e.doc.rangeHasMark(n, o, t);
}, dw = (e, t) => {
  const { from: n, to: o } = e.selection;
  let r = "";
  return e.doc.nodesBetween(n, o, (i) => {
    const s = i.marks.find((a) => a.type === t);
    return s ? (r = typeof s.attrs.href == "string" ? s.attrs.href : "", !1) : !0;
  }), r;
}, Lt = (e) => {
  Kr(e.markType)(e.view.state, e.view.dispatch, e.view), e.view.focus();
}, uw = (e) => {
  e.toggleLinkPopover(e.view);
}, hw = (e, t) => {
  ({
    strong: Lt,
    em: Lt,
    strike: Lt,
    underline: Lt,
    subscript: Lt,
    superscript: Lt,
    inlineCode: Lt,
    link: uw
  })[e](t);
}, Zn = (e) => {
  const { panelElement: t, portalContainer: n } = e;
  let o = e;
  const r = qn(() => {
    i();
  }), i = () => {
    const l = o.resolveAnchor() ?? o.anchor, c = el(
      {
        wrapper: o.wrapper,
        anchor: l,
        overlaySize: { width: o.width, height: o.height },
        placement: o.placement,
        horizontalAlign: o.horizontalAlign,
        offsetY: o.offsetY,
        boundaryInset: o.boundaryInset
      },
      n
    );
    t.style.position = "absolute", t.style.left = `${c.left}px`, t.style.top = `${c.top}px`, t.style.width = `${o.width}px`, o.height !== void 0 && (t.style.height = `${o.height}px`);
  }, s = () => {
    n.appendChild(t), t.style.position = "absolute", r.bindGlobal(), r.bindElement(o.wrapper), i();
  }, a = () => {
    r.destroy(), t.parentNode === n && n.removeChild(t);
  };
  return s(), {
    panelRef: t,
    update: (l) => {
      o = { ...o, ...l }, l.wrapper !== void 0 && r.bindElement(o.wrapper), r.schedule();
    },
    destroy: a
  };
}, mw = (e, t, n, o) => {
  const r = document.createElement("button");
  return r.type = "button", r.className = "zt-md-selection-tooltip-button", r.dataset.command = e.command, r.title = e.title, r.setAttribute("aria-label", e.title), r.append(Ie(e.icon, { size: Bo, strokeWidth: _o, className: "zt-md-selection-tooltip-icon-host" })), r.addEventListener("mousedown", (i) => {
    i.preventDefault();
  }), r.addEventListener("click", (i) => {
    i.preventDefault();
    const s = n();
    !s || s.state.selection.empty || !t || hw(e.command, {
      view: s,
      markType: t,
      toggleLinkPopover: o
    });
  }), r;
}, pw = (e, t, n, o) => {
  const r = document.createElement("div");
  return r.className = "zt-md-selection-tooltip", t.forEach((i) => {
    const s = rt(e, i.markNames);
    s && i.command !== "link" && r.append(mw(i, s, n, o));
  }), r;
}, fw = (e) => {
  const { portalContainer: t, collisionBoundary: n, menuTitle: o, items: r, onOpenChange: i, getCurrentView: s } = e, a = document.createElement("span"), l = document.createElement("div");
  l.className = "zt-md-selection-transform-popover", l.style.display = "none";
  const c = document.createElement("p");
  c.className = "zt-md-selection-transform-popover-title", c.textContent = o, l.appendChild(c);
  const d = document.createElement("div");
  d.className = "zt-md-selection-transform-popover-list", r.forEach((f) => {
    const w = document.createElement("button");
    w.type = "button", w.className = "zt-md-selection-transform-item", w.dataset.command = f.command, w.addEventListener("mousedown", (v) => {
      v.preventDefault();
    }), w.addEventListener("click", (v) => {
      v.preventDefault();
      const E = s();
      if (!E || E.state.selection.empty) {
        i(!1);
        return;
      }
      jo(E, f.command), i(!1), E.focus();
    }), w.append(
      Ie(f.icon, { size: Bo, strokeWidth: _o, className: "zt-md-selection-tooltip-icon-host" })
    );
    const b = document.createElement("span");
    b.className = "zt-md-selection-transform-item-label", b.textContent = f.label, w.appendChild(b);
    const k = document.createElement("kbd");
    k.className = "zt-md-selection-transform-item-shortcut", k.textContent = f.shortcut, w.appendChild(k), d.appendChild(w);
  }), l.appendChild(d);
  const u = document.createElement("button");
  u.type = "button", u.className = "zt-md-selection-transform-trigger", u.setAttribute("aria-label", o), u.setAttribute("aria-expanded", "false"), u.title = o;
  const h = document.createElement("span");
  h.className = "zt-md-selection-transform-trigger-label", u.appendChild(h), u.appendChild(Ie("chevronDown", { size: Bo, strokeWidth: _o, className: "zt-md-selection-tooltip-icon-host" })), u.addEventListener("mousedown", (f) => {
    f.preventDefault();
  }), u.addEventListener("click", (f) => {
    f.preventDefault(), i(!e.isOpen());
  }), a.appendChild(u);
  const p = Zn({
    panelElement: l,
    portalContainer: t,
    wrapper: n ?? t,
    anchor: { anchorTopInContent: 0, anchorBottomInContent: 0, anchorLeftInContent: 0 },
    // resize 重定位时按触发钮实时矩形重锚(回流后触发钮会移位,静态锚点会钉在旧坐标)。
    resolveAnchor: () => {
      const f = n ?? t;
      return Xe(u.getBoundingClientRect(), f);
    },
    width: 224,
    height: void 0,
    placement: "bottom",
    offsetY: 8,
    boundaryInset: 8
  }), g = (f) => {
    if (!e.isOpen())
      return;
    const w = f.target;
    a.contains(w) || l.contains(w) || i(!1);
  };
  document.addEventListener("mousedown", g, !0);
  const y = () => {
    const f = u.getBoundingClientRect(), w = n ?? t, b = Xe(f, w);
    p.update({
      wrapper: w,
      anchor: b,
      placement: "bottom"
    });
  };
  return {
    host: a,
    trigger: u,
    panelElement: l,
    /**
     * 刷新控件状态(展开态 + 激活命令高亮 + 按钮文案)。
     */
    refresh: (f) => {
      const w = r.find((b) => b.command === f) ?? r[0];
      h.textContent = (w == null ? void 0 : w.label) ?? o, u.setAttribute("aria-expanded", e.isOpen() ? "true" : "false");
    },
    /**
     * 刷新菜单项激活高亮。
     */
    refreshActiveCommands: (f) => {
      d.querySelectorAll(".zt-md-selection-transform-item").forEach((w) => {
        const b = w;
        b.dataset.active = f.has(b.dataset.command) ? "true" : "false";
      });
    },
    /**
     * 展开浮层(先定位再显示)。
     */
    openPanel: () => {
      y(), l.style.display = "block";
    },
    /**
     * 收起浮层。
     */
    closePanel: () => {
      l.style.display = "none";
    },
    /**
     * 销毁控制器。
     */
    destroy: () => {
      document.removeEventListener("mousedown", g, !0), p.destroy(), a.remove();
    }
  };
}, hc = (e) => {
  const { portalContainer: t, collisionBoundary: n, iconSize: o, iconStrokeWidth: r, onOpenChange: i, messages: s, getCurrentView: a } = e, l = document.createElement("span"), c = document.createElement("div");
  c.className = "zt-md-selection-link-popover", c.style.display = "none";
  const d = document.createElement("div");
  d.className = "zt-md-selection-link-popover-row";
  const u = document.createElement("input");
  u.type = "text", u.placeholder = s.selectionLinkInputPlaceholder, u.className = "zt-md-selection-link-popover-input";
  const h = document.createElement("button");
  h.type = "button", h.className = "zt-md-selection-link-popover-action", h.setAttribute("aria-label", s.selectionLinkSaveAriaLabel), h.appendChild(Ie("correct", { size: o, strokeWidth: r, className: "zt-md-selection-tooltip-icon-host" }));
  const p = document.createElement("button");
  p.type = "button", p.className = "zt-md-selection-link-popover-action zt-md-selection-link-popover-action-danger", p.setAttribute("aria-label", s.selectionLinkRemoveAriaLabel), p.appendChild(Ie("trash", { size: o, strokeWidth: r, className: "zt-md-selection-tooltip-icon-host" }));
  const g = document.createElement("div");
  g.className = "zt-md-selection-link-popover-error", g.textContent = s.selectionLinkInvalidUrl ?? "", g.hidden = !0, d.appendChild(u), d.appendChild(h), d.appendChild(p), c.appendChild(d), c.appendChild(g);
  const y = document.createElement("button");
  y.type = "button", y.className = "zt-md-selection-tooltip-button", y.dataset.command = "link", y.title = s.selectionTooltipLinkTitle, y.setAttribute("aria-label", s.selectionTooltipLinkTitle), y.setAttribute("aria-expanded", "false"), y.appendChild(Ie("link", { size: o, strokeWidth: r, className: "zt-md-selection-tooltip-icon-host" })), y.addEventListener("mousedown", (v) => {
    v.preventDefault();
  }), y.addEventListener("click", (v) => {
    if (v.preventDefault(), e.isOpen()) {
      i(!1);
      return;
    }
    w();
  }), l.appendChild(y);
  const f = (v) => {
    const E = a();
    if (!E || E.state.selection.empty) {
      i(!1);
      return;
    }
    const M = rt(E, ["link"]);
    if (!M) {
      i(!1);
      return;
    }
    if (v === "") {
      g.hidden = !0;
      const { from: I, to: O } = E.state.selection;
      E.dispatch(E.state.tr.removeMark(I, O, M).scrollIntoView()), i(!1), E.focus();
      return;
    }
    const x = Kn(v);
    if (!x) {
      g.hidden = s.selectionLinkInvalidUrl === void 0;
      return;
    }
    g.hidden = !0;
    const { from: T, to: L } = E.state.selection, S = E.state.tr.addMark(T, L, M.create({ href: x }));
    E.dispatch(S.scrollIntoView()), i(!1), E.focus();
  }, w = (v) => {
    const E = a(), M = E ? rt(E, ["link"]) : null;
    if (!E || !M || E.state.selection.empty) {
      i(!1);
      return;
    }
    u.value = Kn(dw(E.state, M)), g.hidden = !0, i(!0);
  };
  h.addEventListener("mousedown", (v) => {
    v.preventDefault();
  }), h.addEventListener("click", (v) => {
    v.preventDefault(), f(u.value.trim());
  }), p.addEventListener("mousedown", (v) => {
    v.preventDefault();
  }), p.addEventListener("click", (v) => {
    v.preventDefault(), f("");
  }), u.addEventListener("keydown", (v) => {
    v.key === "Enter" && (v.preventDefault(), f(u.value.trim()));
  });
  const b = Zn({
    panelElement: c,
    portalContainer: t,
    wrapper: n ?? t,
    anchor: { anchorTopInContent: 0, anchorBottomInContent: 0, anchorLeftInContent: 0 },
    // resize 重定位时按触发钮实时矩形重锚(回流后触发钮会移位,静态锚点会钉在旧坐标)。
    resolveAnchor: () => {
      const v = n ?? t;
      return Xe(y.getBoundingClientRect(), v);
    },
    width: 266,
    height: void 0,
    placement: "bottom",
    horizontalAlign: "center",
    offsetY: 8,
    boundaryInset: 8
  }), k = (v) => {
    if (!e.isOpen())
      return;
    const E = v.target;
    l.contains(E) || c.contains(E) || i(!1);
  };
  return document.addEventListener("mousedown", k, !0), {
    host: l,
    trigger: y,
    panelElement: c,
    /**
     * 刷新展开态。
     */
    refresh: () => {
      y.setAttribute("aria-expanded", e.isOpen() ? "true" : "false");
    },
    /**
     * 展开浮层(先定位再显示并聚焦输入框)。
     */
    openPanel: () => {
      const v = y.getBoundingClientRect(), E = n ?? t;
      b.update({
        wrapper: E,
        anchor: Xe(v, E),
        placement: "bottom"
      }), c.style.display = "block", u.focus();
    },
    /**
     * 收起浮层。
     */
    closePanel: () => {
      c.style.display = "none";
    },
    /**
     * 销毁控制器。
     */
    destroy: () => {
      document.removeEventListener("mousedown", k, !0), b.destroy(), l.remove();
    }
  };
}, gw = (e, t, n) => {
  n.forEach((o) => {
    const r = rt(t, o.markNames);
    if (!r)
      return;
    const i = e.querySelector(`[data-command="${o.command}"]`);
    i instanceof HTMLButtonElement && (i.dataset.active = yi(t.state, r) ? "true" : "false");
  });
}, bw = (e) => {
  const { from: t, to: n } = e.state.selection;
  let o = !1;
  return e.state.doc.nodesBetween(t, n, (r) => r.type.name !== "code_block" ? !0 : (o = !0, !1)), o;
}, yw = (e, t, n) => (o) => {
  const { selection: r, doc: i } = o.state, s = e.contains(document.activeElement);
  return !cw(o) || r.empty || !(r instanceof de) || !o.hasFocus() && !s && !t() && !n() || bw(o) ? !1 : e.childElementCount > 0 && i.textBetween(r.from, r.to).trim().length > 0;
}, kw = (e, t) => e[t.messageKey] ?? t.value, wa = (e) => {
  const { kind: t, markType: n, getCurrentView: o, portalContainer: r, collisionBoundary: i, onOpenChange: s, isOpen: a, messages: l } = e, c = t === "highlight" ? l.selectionTooltipHighlightTitle : l.selectionTooltipColorTitle, d = t === "highlight" ? of : nf, u = document.createElement("span"), h = document.createElement("div");
  h.className = "zt-md-selection-color-popover", h.style.display = "none";
  const p = document.createElement("div");
  p.className = "zt-md-selection-color-grid";
  const g = /* @__PURE__ */ new Map();
  d.forEach((E) => {
    const M = document.createElement("button");
    M.type = "button", M.className = "zt-md-selection-color-swatch", M.dataset.color = E.value, M.title = kw(l, E), M.setAttribute("aria-label", `${c}: ${M.title}`), M.style.setProperty("--zt-swatch-color", E.value), M.addEventListener("mousedown", (x) => {
      x.preventDefault();
    }), M.addEventListener("click", (x) => {
      x.preventDefault();
      const T = o();
      if (!T || T.state.selection.empty) {
        s(!1);
        return;
      }
      Ws(T, n, E.value), s(!1);
    }), g.set(E.value, M), p.appendChild(M);
  }), h.appendChild(p);
  const y = document.createElement("button");
  y.type = "button", y.className = "zt-md-selection-color-reset", y.textContent = l.colorDefaultLabel, y.addEventListener("mousedown", (E) => {
    E.preventDefault();
  }), y.addEventListener("click", (E) => {
    E.preventDefault();
    const M = o();
    if (!M || M.state.selection.empty) {
      s(!1);
      return;
    }
    Ws(M, n, null), s(!1);
  }), h.appendChild(y);
  const f = document.createElement("button");
  f.type = "button", f.className = "zt-md-selection-tooltip-button", f.dataset.command = t, f.title = c, f.setAttribute("aria-label", c), f.setAttribute("aria-expanded", "false");
  const w = Ie(t === "highlight" ? "highlight" : "textColor", {
    size: Bo,
    strokeWidth: _o,
    className: "zt-md-selection-tooltip-icon-host"
  });
  f.appendChild(w), f.addEventListener("mousedown", (E) => {
    E.preventDefault();
  }), f.addEventListener("click", (E) => {
    E.preventDefault(), s(!a());
  }), u.appendChild(f);
  const b = Zn({
    panelElement: h,
    portalContainer: r,
    wrapper: i ?? r,
    anchor: { anchorTopInContent: 0, anchorBottomInContent: 0, anchorLeftInContent: 0 },
    // resize 重定位时按触发钮实时矩形重锚(回流后触发钮会移位,静态锚点会钉在旧坐标)。
    resolveAnchor: () => {
      const E = i ?? r;
      return Xe(f.getBoundingClientRect(), E);
    },
    width: 132,
    height: void 0,
    placement: "bottom",
    horizontalAlign: "center",
    offsetY: 8,
    boundaryInset: 8
  }), k = (E) => {
    if (!a())
      return;
    const M = E.target;
    u.contains(M) || h.contains(M) || s(!1);
  };
  document.addEventListener("mousedown", k, !0);
  const v = () => {
    const E = o(), M = E ? hf(E.state, n) : null;
    f.dataset.active = M ? "true" : "false", w.style.color = t === "color" && M ? M : "", g.forEach((x, T) => {
      x.dataset.active = T === M ? "true" : "false";
    });
  };
  return {
    host: u,
    trigger: f,
    panelElement: h,
    /**
     * 刷新展开态与激活态。
     */
    refresh: () => {
      f.setAttribute("aria-expanded", a() ? "true" : "false"), v();
    },
    /**
     * 展开浮层(先定位再显示)。
     */
    openPanel: () => {
      const E = f.getBoundingClientRect(), M = i ?? r;
      b.update({
        wrapper: M,
        anchor: Xe(E, M),
        placement: "bottom"
      }), h.style.display = "block";
    },
    /**
     * 收起浮层。
     */
    closePanel: () => {
      h.style.display = "none";
    },
    /**
     * 销毁控制器。
     */
    destroy: () => {
      document.removeEventListener("mousedown", k, !0), b.destroy(), u.remove();
    }
  };
}, ww = (e) => {
  const { portalContainer: t, collisionBoundary: n, messages: o, getView: r } = e;
  let i = { kind: "video" }, s = !1;
  const a = document.createElement("div");
  a.className = "zt-md-media-embed-panel", a.style.display = "none";
  const l = document.createElement("p");
  l.className = "zt-md-media-embed-panel-title";
  const c = document.createElement("div");
  c.className = "zt-md-media-embed-panel-row";
  const d = document.createElement("input");
  d.type = "text", d.className = "zt-md-media-embed-panel-input", d.spellcheck = !1;
  const u = document.createElement("button");
  u.type = "button", u.className = "zt-md-media-embed-panel-confirm";
  const h = document.createElement("p");
  h.className = "zt-md-media-embed-panel-error", h.textContent = o.mediaEmbedUrlInvalid, h.style.display = "none", c.append(d, u), a.append(l, c, h);
  let p = null;
  const g = Zn({
    panelElement: a,
    portalContainer: t,
    wrapper: n ?? t,
    anchor: { anchorTopInContent: 0, anchorBottomInContent: 0, anchorLeftInContent: 0 },
    // resize 重定位时按锚定位置实时重取坐标(回流后锚点会移位,静态锚点会钉在旧坐标)。
    resolveAnchor: () => {
      if (!p)
        return null;
      const v = n ?? t, E = r(), M = p.editMode ? p.editPos : E == null ? void 0 : E.state.selection.from;
      if (!E || typeof M != "number")
        return null;
      try {
        const x = E.coordsAtPos(Math.min(M, E.state.doc.content.size));
        return Xe(
          new DOMRect(x.left, x.top, Math.max(x.right - x.left, 1), x.bottom - x.top),
          v
        );
      } catch {
        return null;
      }
    },
    width: 380,
    height: void 0,
    placement: "bottom",
    horizontalAlign: "start",
    offsetY: 8,
    boundaryInset: 8
  }), y = (v) => {
    h.style.display = v ? "block" : "none", d.classList.toggle("zt-md-media-embed-panel-input-invalid", v);
  }, f = () => {
    var L;
    const v = r(), E = Kn(d.value.trim());
    if (!v || E === "") {
      y(!0), d.focus();
      return;
    }
    const M = (L = v.state.schema.nodes) == null ? void 0 : L.media_embed;
    if (!M) {
      w();
      return;
    }
    const x = i.editPos;
    if (typeof x == "number") {
      const S = v.state.doc.nodeAt(x);
      if ((S == null ? void 0 : S.type.name) !== "media_embed") {
        w();
        return;
      }
      v.dispatch(v.state.tr.setNodeMarkup(x, void 0, { ...S.attrs, src: E })), v.focus(), w();
      return;
    }
    const T = M.create({ kind: i.kind, src: E });
    v.dispatch(v.state.tr.replaceSelectionWith(T).scrollIntoView()), v.focus(), w();
  }, w = () => {
    s && (s = !1, d.value = "", y(!1), a.style.display = "none");
  };
  let b = "OK";
  u.addEventListener("mousedown", (v) => {
    v.preventDefault();
  }), u.addEventListener("click", (v) => {
    v.preventDefault(), f();
  }), d.addEventListener("keydown", (v) => {
    if (v.key === "Enter") {
      v.preventDefault(), f();
      return;
    }
    v.key === "Escape" && (v.preventDefault(), w());
  }), d.addEventListener("input", () => {
    y(!1);
  });
  const k = (v) => {
    if (!s)
      return;
    const E = v.target;
    a.contains(E) || w();
  };
  return document.addEventListener("mousedown", k, !0), {
    /**
     * 打开浮层:锚定光标(编辑模式锚定目标节点) + 聚焦输入框。
     */
    open: (v) => {
      i = v;
      const E = {
        video: o.mediaEmbedVideoTitle,
        audio: o.mediaEmbedAudioTitle,
        bookmark: o.mediaEmbedBookmarkTitle,
        embed: o.mediaEmbedEmbedTitle
      }, M = {
        video: o.mediaEmbedEditVideoTitle,
        audio: o.mediaEmbedEditAudioTitle,
        bookmark: o.mediaEmbedEditBookmarkTitle,
        embed: o.mediaEmbedEditEmbedTitle
      }, x = typeof v.editPos == "number";
      l.textContent = x ? M[v.kind] : E[v.kind], d.placeholder = o.mediaEmbedUrlPlaceholder, b = x ? o.mediaEmbedSaveLabel : o.mediaEmbedConfirmLabel, u.textContent = b, d.value = x ? v.editSrc ?? "" : "", y(!1), w(), s = !0, p = { editMode: x, editPos: x ? v.editPos : void 0 };
      const T = r(), L = n ?? t;
      let S = L.getBoundingClientRect();
      if (T) {
        const I = x ? v.editPos : T.state.selection.from;
        try {
          const O = T.coordsAtPos(Math.min(I, T.state.doc.content.size));
          S = DOMRect.fromRect({
            x: O.left,
            y: O.top,
            width: 0,
            height: Math.max(1, O.bottom - O.top)
          });
        } catch {
        }
      }
      g.update({
        wrapper: L,
        anchor: Xe(S, L),
        placement: "bottom"
      }), a.style.display = "block", d.focus();
    },
    /**
     * 销毁。
     */
    destroy: () => {
      document.removeEventListener("mousedown", k, !0), s = !1, g.destroy();
    }
  };
}, vw = (e, t, n, o, r, i, s) => {
  const a = lw(n), l = uc(n, o);
  let c = e, d = !1, u = !1, h = !1, p = !1, g = !1;
  const y = t.closest(
    s ?? Fo
  ), f = (B) => {
    d !== B && (d = B, B ? M.openPanel() : M.closePanel(), M.refresh());
  }, w = (B, te) => {
    const G = B === "highlight" ? I : S;
    !G || (B === "highlight" ? p : h) === te || (B === "highlight" ? p = te : h = te, te ? (f(!1), b(!1), G.openPanel()) : G.closePanel(), G.refresh());
  }, b = (B) => {
    u !== B && (u = B, B ? E.openPanel() : E.closePanel(), v());
  }, k = (B) => {
    B.state.selection.empty || f(!d);
  }, v = () => {
    const B = c ? _l(c) : "paragraph";
    E.refresh(B);
    const te = c ? Ko(c) : /* @__PURE__ */ new Set(["paragraph"]);
    E.refreshActiveCommands(te);
  }, E = fw({
    getCurrentView: () => c,
    portalContainer: t,
    collisionBoundary: y,
    iconSize: 14,
    iconStrokeWidth: 2,
    menuTitle: n.selectionTooltipTransformLabel,
    items: l,
    onOpenChange: b,
    isOpen: () => u
  }), M = hc({
    getCurrentView: () => c,
    portalContainer: t,
    collisionBoundary: y,
    iconSize: 14,
    iconStrokeWidth: 2,
    onOpenChange: f,
    messages: n,
    isOpen: () => d
  }), x = ww({
    portalContainer: t,
    collisionBoundary: y,
    messages: n,
    getView: () => c
  }), T = rt(e, ["color"]), L = rt(e, ["highlight"]), S = T ? wa({
    kind: "color",
    markType: T,
    getCurrentView: () => c,
    portalContainer: t,
    collisionBoundary: y,
    onOpenChange: (B) => w("color", B),
    isOpen: () => h,
    messages: n
  }) : null, I = L ? wa({
    kind: "highlight",
    markType: L,
    getCurrentView: () => c,
    portalContainer: t,
    collisionBoundary: y,
    onOpenChange: (B) => w("highlight", B),
    isOpen: () => p,
    messages: n
  }) : null, O = pw(e, a, () => c, k);
  O.prepend(E.host), S && O.append(S.host), I && O.append(I.host), rt(e, ["link"]) && O.append(M.host);
  const J = yw(
    O,
    () => d,
    () => u
  ), V = new Rd({
    content: O,
    debounce: 80,
    offset: 8,
    root: t,
    shouldShow: J,
    floatingUIOptions: {
      placement: "top"
    }
  }), K = () => {
    O.parentElement || t.appendChild(O);
  }, z = () => {
    O.remove();
  };
  V.onHide = z;
  const H = () => {
    f(!1), b(!1), w("color", !1), w("highlight", !1), V.hide(), z();
  }, D = (B) => B instanceof Node ? !!(c != null && c.dom.contains(B)) || O.contains(B) || t.contains(B) : !1, N = () => {
    requestAnimationFrame(() => {
      g || D(document.activeElement) || H();
    });
  }, ee = (B) => {
    D(B.target) || H();
  }, re = (B) => {
    B.key === "Escape" && (!d && !u && !h && !p || (B.stopPropagation(), f(!1), b(!1), w("color", !1), w("highlight", !1)));
  };
  return e.dom.addEventListener("blur", N), e.dom.addEventListener("keydown", re, !0), document.addEventListener("mousedown", ee, !0), {
    update: (B, te) => {
      c = B, c.state.selection.empty && (f(!1), b(!1), w("color", !1), w("highlight", !1)), gw(O, c, a), v();
      const G = M.trigger, fe = rt(c, ["link"]);
      G.dataset.active = fe && yi(c.state, fe) ? "true" : "false", S == null || S.refresh(), I == null || I.refresh();
      const Ce = i();
      if (Ce && requestAnimationFrame(() => x.open(Ce)), !J(c)) {
        V.hide(), z();
        return;
      }
      K(), V.update(c, te), r() && requestAnimationFrame(() => f(!0));
    },
    destroy: () => {
      g = !0, c = null, e.dom.removeEventListener("blur", N), e.dom.removeEventListener("keydown", re, !0), document.removeEventListener("mousedown", ee, !0), E.destroy(), M.destroy(), S == null || S.destroy(), I == null || I.destroy(), x.destroy(), V.destroy(), O.remove();
    }
  };
}, Cw = (e, t, n, o) => ue(() => {
  let r = !1, i = null;
  return new ye({
    key: new ke(aw),
    state: {
      init: () => !1,
      apply: (s) => {
        s.getMeta(jl) && (r = !0);
        const a = s.getMeta(ci);
        return a && typeof a.kind == "string" && typeof a.editPos == "number" ? i = a : a && typeof a.kind == "string" && (i = { kind: a.kind }), !1;
      }
    },
    view: (s) => vw(
      s,
      e,
      t,
      n,
      () => {
        const a = r;
        return r = !1, a;
      },
      () => {
        const a = i;
        return i = null, a;
      },
      o
    )
  });
}), Ew = (e) => `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`, zw = Ew(
  '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>'
), Mw = (e) => {
  const { messages: t, portalContainer: n, collisionBoundary: o } = e, r = document.createElement("button");
  r.type = "button", r.className = "zt-md-table-action-button", r.setAttribute("aria-label", t.tableMoreAriaLabel), r.setAttribute("aria-expanded", "false"), r.innerHTML = zw;
  const i = document.createElement("div");
  i.className = "zt-md-table-action-popover";
  const s = (x, T, L, S, I) => {
    const O = document.createElement("button");
    O.type = "button", O.className = `zt-md-table-action-menu-item${L ? " zt-md-table-action-menu-item-danger" : ""}`, O.appendChild(
      Ie(T, { size: 16, strokeWidth: 2, className: "zt-md-table-action-menu-item-icon" })
    );
    const J = document.createElement("span");
    return J.className = "zt-md-table-action-menu-item-label", J.textContent = x, O.appendChild(J), O.addEventListener("mousedown", (V) => {
      V.preventDefault();
    }), O.addEventListener("click", (V) => {
      V.preventDefault(), !S() && (I(), M(!1));
    }), O;
  }, a = s(
    t.tableInsertRowAboveLabel,
    "insertRowAbove",
    !1,
    () => !e.canInsertRowAbove(),
    e.onInsertRowAbove
  ), l = s(
    t.tableInsertRowBelowLabel,
    "insertRowBelow",
    !1,
    () => !1,
    e.onInsertRowBelow
  ), c = s(
    t.tableInsertColumnLeftLabel,
    "insertColumnLeft",
    !1,
    () => !e.canInsertColumn(),
    e.onInsertColumnLeft
  ), d = s(
    t.tableInsertColumnRightLabel,
    "insertColumnRight",
    !1,
    () => !e.canInsertColumn(),
    e.onInsertColumnRight
  ), u = s(
    t.tableDeleteRowLabel,
    "deleteRow",
    !0,
    () => !e.canDeleteRow(),
    e.onDeleteRow
  ), h = s(
    t.tableDeleteColumnLabel,
    "deleteColumn",
    !0,
    () => !e.canDeleteColumn(),
    e.onDeleteColumn
  ), p = s(
    t.tableMergeCellsLabel,
    "mergeCells",
    !1,
    () => !e.canMergeCells(),
    e.onMergeCells
  ), g = s(
    t.tableSplitCellLabel,
    "splitCells",
    !1,
    () => !e.canSplitCell(),
    e.onSplitCell
  ), y = document.createElement("div");
  y.className = "zt-md-table-action-menu-group", y.append(p, g);
  const f = document.createElement("div");
  f.className = "zt-md-table-action-menu-group", f.append(a, l, c, d);
  const w = document.createElement("div");
  w.className = "zt-md-table-action-menu-divider", w.setAttribute("aria-hidden", "true");
  const b = document.createElement("div");
  b.className = "zt-md-table-action-menu-group", b.append(u, h), i.append(y, f, w, b);
  let k = !1;
  const v = Zn({
    panelElement: i,
    portalContainer: n ?? document.body,
    wrapper: o ?? n ?? document.body,
    anchor: { anchorTopInContent: 0, anchorBottomInContent: 0, anchorLeftInContent: 0 },
    // resize 重定位时按触发钮实时矩形重锚(回流后触发钮会移位,静态锚点会钉在旧坐标)。
    resolveAnchor: () => {
      const x = o ?? n ?? document.body;
      return Xe(r.getBoundingClientRect(), x);
    },
    width: 168,
    placement: "bottom",
    horizontalAlign: "end",
    offsetY: 6,
    boundaryInset: 8
  }), E = (x) => {
    if (!k)
      return;
    const T = x.target;
    r.contains(T) || i.contains(T) || M(!1);
  };
  document.addEventListener("mousedown", E, !0);
  const M = (x) => {
    if (k = x, r.setAttribute("aria-expanded", x ? "true" : "false"), x) {
      const T = r.getBoundingClientRect(), L = o ?? n ?? document.body;
      v.update({
        wrapper: L,
        anchor: Xe(T, L),
        placement: "bottom"
      }), i.style.display = "block";
    } else
      i.style.display = "none";
  };
  return r.addEventListener("mousedown", (x) => {
    x.preventDefault();
  }), r.addEventListener("click", (x) => {
    x.preventDefault(), M(!k);
  }), {
    trigger: r,
    panelElement: i,
    /** 当前是否展开。 */
    isOpen: () => k,
    /** 强制收起。 */
    close: () => M(!1),
    /** 销毁。 */
    destroy: () => {
      document.removeEventListener("mousedown", E, !0), v.destroy(), i.remove();
    }
  };
}, Tw = "table", xw = "table_header_row", Sw = "table_row", Lw = "table_header", Aw = "table_cell", Rt = (e) => {
  const t = e.selection.$from;
  let n = -1, o = -1;
  for (let r = t.depth; r >= 0; r -= 1) {
    const i = t.node(r);
    if (o < 0 && (i.type.name === Aw || i.type.name === Lw) && (o = t.index(r - 1)), n < 0 && (i.type.name === Sw || i.type.name === xw) && (n = t.index(r - 1)), i.type.name === Tw)
      return {
        tableNode: i,
        tableStart: r === 0 ? 0 : t.before(r),
        tableNodeSize: i.nodeSize,
        rowIndex: n,
        columnIndex: o
      };
  }
  return null;
}, Iw = (e, t, n, o) => {
  if (n < 0 || n >= e.childCount)
    return null;
  let r = 0;
  for (let a = 0; a < n; a += 1)
    r += e.child(a).nodeSize;
  const i = e.child(n);
  if (o < 0 || o >= i.childCount)
    return null;
  let s = 0;
  for (let a = 0; a < o; a += 1)
    s += i.child(a).nodeSize;
  return t + 1 + r + 1 + s + 1 + 1;
}, Rw = (e) => {
  if (e.columnIndex < 0 || e.tableNode.childCount === 0)
    return !1;
  const t = e.tableNode.child(0);
  return e.columnIndex < t.childCount;
}, Uo = (e, t, n, o) => {
  const r = Iw(t.tableNode, t.tableStart, n, o);
  if (r === null)
    return !1;
  const i = e.state.tr.setSelection(de.near(e.state.tr.doc.resolve(r), 1));
  return e.dispatch(i), !0;
}, Vo = (e, t) => t(e.state, e.dispatch, e) ? (e.dispatch(e.state.tr.scrollIntoView()), e.focus(), !0) : !1, va = (e, t, n) => t.rowIndex < 0 || t.columnIndex < 0 || !Uo(e, t, t.rowIndex, t.columnIndex) ? !1 : Vo(e, n === "above" ? Fd : $d), Nw = (e, t) => t.rowIndex <= 0 || t.columnIndex < 0 || !Uo(e, t, t.rowIndex, t.columnIndex) ? !1 : Vo(e, Od), Pw = (e, t, n) => t.rowIndex < 0 || t.columnIndex < 0 || !Uo(e, t, t.rowIndex, t.columnIndex) ? !1 : Vo(e, n === "left" ? jd : Kd), Dw = (e, t) => t.rowIndex < 0 || t.columnIndex < 0 || (t.tableNode.childCount > 0 ? t.tableNode.child(0).childCount : 0) <= 1 || !Uo(e, t, t.rowIndex, t.columnIndex) ? !1 : Vo(e, Hd), Bw = (e, t, n) => {
  if (t.columnIndex < 0)
    return !1;
  const o = _d.get(t.tableNode), r = t.tableStart + 1, i = t.columnIndex, s = e.state.tr;
  for (let a = 0; a < o.height; a += 1) {
    const l = a * o.width + i, c = o.map[l];
    if (typeof c != "number")
      continue;
    const d = r + c, u = s.doc.nodeAt(d);
    if (!u)
      continue;
    const h = { ...u.attrs, alignment: n };
    s.setNodeMarkup(d, u.type, h, u.marks);
  }
  return s.docChanged ? (s.scrollIntoView(), e.dispatch(s), e.focus(), !0) : !1;
}, _w = (e) => {
  const t = Rt(e.state);
  !t || t.rowIndex <= 0 || Nw(e, t);
}, Ow = (e) => {
  const t = Rt(e.state);
  !t || t.rowIndex < 0 || t.columnIndex < 0 || Dw(e, t);
}, mc = "table_header", pc = "table_cell", Hw = (e) => e.selection instanceof Ud, Fw = (e) => {
  let t = null;
  try {
    e.doc.nodesBetween(e.selection.from, e.selection.to, (n, o) => t ? !1 : n.type.name === pc || n.type.name === mc ? (t = { cell: n, pos: o }, !1) : !0);
  } catch {
    return null;
  }
  return t;
}, fc = (e) => {
  if (!Hw(e))
    return !1;
  try {
    return Wa(e, void 0) === !0;
  } catch {
    return !1;
  }
}, $w = (e) => {
  if (!fc(e.state))
    return !1;
  const t = Wa(e.state, e.dispatch) === !0;
  return t && e.focus(), t;
}, gc = (e) => {
  const t = Fw(e);
  if (!t)
    return !1;
  const { cell: n } = t, o = Number(n.attrs.colspan ?? 1), r = Number(n.attrs.rowspan ?? 1);
  return o > 1 || r > 1;
}, jw = (e) => {
  if (!gc(e.state))
    return !1;
  const t = Wd(e.state, e.dispatch) === !0;
  return t && e.focus(), t;
}, Kw = (e) => {
  let t = !1;
  return e.descendants((n) => t ? !1 : (n.type.name === pc || n.type.name === mc) && (Number(n.attrs.colspan ?? 1) > 1 || Number(n.attrs.rowspan ?? 1) > 1) ? (t = !0, !1) : !0), t;
}, Ww = "zt-md-table-focus-actions", Uw = 0, Vw = 24, qw = 4, Gw = 4, Xw = "top", hr = "left", qo = (e) => `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`, Yw = qo(
  '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>'
), Zw = qo(
  '<line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/>'
), Jw = qo(
  '<line x1="21" x2="3" y1="6" y2="6"/><line x1="17" x2="7" y1="12" y2="12"/><line x1="19" x2="5" y1="18" y2="18"/>'
), Qw = qo(
  '<line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="9" y1="12" y2="12"/><line x1="21" x2="7" y1="18" y2="18"/>'
), ev = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable;
class tv {
  /**
   * 初始化插件视图。
   */
  constructor(t, n, o, r) {
    // 编辑器视图。
    m(this, "view");
    // 操作区容器 DOM。
    m(this, "actionsContainer");
    // 删除按钮 DOM。
    m(this, "deleteButton");
    // 左对齐按钮 DOM。
    m(this, "alignLeftButton");
    // 居中按钮 DOM。
    m(this, "alignCenterButton");
    // 右对齐按钮 DOM。
    m(this, "alignRightButton");
    // 更多菜单挂载 DOM。
    m(this, "moreActionsMount");
    // 更多菜单控制器。
    m(this, "moreActions");
    // 编辑器滚动容器。
    m(this, "editorWrapper");
    // 编辑器内部浮层 Portal 容器。
    m(this, "portalContainer");
    // 当前聚焦表格起始位置。
    m(this, "currentTableStart", null);
    // 当前聚焦表格节点大小。
    m(this, "currentTableNodeSize", null);
    // 当前聚焦列索引。
    m(this, "currentColumnIndex", null);
    // 当前聚焦列对齐方式。
    m(this, "currentColumnAlignment", hr);
    // 当前聚焦表格 DOM。
    m(this, "currentTableElement", null);
    // 当前锚点位置是否有效。
    m(this, "hasPositionContext", !1);
    // 浮层重定位调度器。
    m(this, "repositionScheduler", qn(() => {
      this.hasPositionContext && this.updateOverlayPosition();
    }));
    // 当前周期菜单可用态快照(更多菜单以函数读取)。
    m(this, "currentCanInsertRowAbove", !1);
    m(this, "currentCanInsertColumn", !1);
    m(this, "currentCanDeleteRow", !1);
    m(this, "currentCanDeleteColumn", !1);
    /**
     * 阻止按钮点击导致编辑器选区丢失。
     */
    m(this, "handleActionsMouseDown", (t) => {
      t.preventDefault();
    });
    /**
     * 删除当前聚焦表格。
     */
    m(this, "handleDeleteClick", (t) => {
      if (t.preventDefault(), this.currentTableStart === null || this.currentTableNodeSize === null)
        return;
      const n = this.currentTableStart, o = this.currentTableStart + this.currentTableNodeSize, r = this.view.state.tr.delete(n, o).scrollIntoView();
      this.view.dispatch(r), this.view.focus();
    });
    /**
     * 将当前列设置为左对齐。
     */
    m(this, "handleAlignLeftClick", () => {
      this.applyColumnAlignment("left");
    });
    /**
     * 将当前列设置为居中对齐。
     */
    m(this, "handleAlignCenterClick", () => {
      this.applyColumnAlignment("center");
    });
    /**
     * 将当前列设置为右对齐。
     */
    m(this, "handleAlignRightClick", () => {
      this.applyColumnAlignment("right");
    });
    /**
     * 在当前行下方插入一行。
     */
    m(this, "handleInsertRowBelow", () => {
      const t = Rt(this.view.state);
      !t || t.rowIndex < 0 || va(this.view, t, "below");
    });
    /**
     * 在当前行上方插入一行。
     */
    m(this, "handleInsertRowAbove", () => {
      const t = Rt(this.view.state);
      !t || t.rowIndex <= 0 || va(this.view, t, "above");
    });
    /**
     * 在当前列左侧插入一列。
     */
    m(this, "handleInsertColumnLeft", () => {
      this.insertColumn("left");
    });
    /**
     * 在当前列右侧插入一列。
     */
    m(this, "handleInsertColumnRight", () => {
      this.insertColumn("right");
    });
    /**
     * 删除当前普通表格行。
     */
    m(this, "handleDeleteRow", () => {
      _w(this.view);
    });
    /**
     * 删除当前表格列。
     */
    m(this, "handleDeleteColumn", () => {
      Ow(this.view);
    });
    this.view = t, this.portalContainer = o, this.editorWrapper = $n(t.dom, r), this.actionsContainer = document.createElement("div"), this.actionsContainer.className = "zt-md-table-actions-overlay", this.deleteButton = document.createElement("button"), this.deleteButton.type = "button", this.deleteButton.className = "zt-md-table-action-button zt-md-table-action-button-danger", this.deleteButton.style.display = "inline-flex", this.deleteButton.setAttribute("aria-label", n.tableDeleteAriaLabel), this.deleteButton.innerHTML = Yw, this.alignLeftButton = this.createColumnAlignmentButton(
      n.tableAlignLeftAriaLabel,
      Zw
    ), this.alignCenterButton = this.createColumnAlignmentButton(
      n.tableAlignCenterAriaLabel,
      Jw
    ), this.alignRightButton = this.createColumnAlignmentButton(
      n.tableAlignRightAriaLabel,
      Qw
    ), this.moreActionsMount = document.createElement("span"), this.moreActionsMount.className = "zt-md-table-more-actions-mount", this.moreActions = Mw({
      messages: n,
      portalContainer: o,
      collisionBoundary: this.editorWrapper,
      canInsertRowAbove: () => this.currentTableStart !== null ? this.currentCanInsertRowAbove : !1,
      canInsertColumn: () => this.currentTableStart !== null ? this.currentCanInsertColumn : !1,
      canDeleteRow: () => this.currentTableStart !== null ? this.currentCanDeleteRow : !1,
      canDeleteColumn: () => this.currentTableStart !== null ? this.currentCanDeleteColumn : !1,
      onInsertRowAbove: () => this.handleInsertRowAbove(),
      onInsertRowBelow: () => this.handleInsertRowBelow(),
      onInsertColumnLeft: () => this.handleInsertColumnLeft(),
      onInsertColumnRight: () => this.handleInsertColumnRight(),
      onDeleteRow: () => this.handleDeleteRow(),
      onDeleteColumn: () => this.handleDeleteColumn(),
      canMergeCells: () => fc(this.view.state),
      canSplitCell: () => gc(this.view.state),
      onMergeCells: () => $w(this.view),
      onSplitCell: () => jw(this.view)
    }), this.moreActionsMount.appendChild(this.moreActions.trigger), this.actionsContainer.append(
      this.moreActionsMount,
      this.alignLeftButton,
      this.alignCenterButton,
      this.alignRightButton,
      this.deleteButton
    ), this.actionsContainer.addEventListener("mousedown", this.handleActionsMouseDown), this.deleteButton.addEventListener("click", this.handleDeleteClick), this.alignLeftButton.addEventListener("click", this.handleAlignLeftClick), this.alignCenterButton.addEventListener("click", this.handleAlignCenterClick), this.alignRightButton.addEventListener("click", this.handleAlignRightClick), this.repositionScheduler.bindGlobal(), this.repositionScheduler.bindWrapper(this.editorWrapper), this.repositionScheduler.bindElement(this.editorWrapper), this.update(t);
  }
  /**
   * 创建列对齐按钮。
   */
  createColumnAlignmentButton(t, n) {
    const o = document.createElement("button");
    return o.type = "button", o.className = "zt-md-table-action-button", o.style.display = "inline-flex", o.setAttribute("aria-label", t), o.innerHTML = n, o;
  }
  /**
   * 解析列对齐状态。
   */
  resolveColumnAlignment(t) {
    return t === "center" || t === "right" ? t : hr;
  }
  /**
   * 刷新列对齐按钮可用性与激活态。
   */
  updateAlignmentButtonsState(t) {
    this.alignLeftButton.disabled = !t, this.alignCenterButton.disabled = !t, this.alignRightButton.disabled = !t, this.alignLeftButton.classList.toggle(
      "zt-md-table-action-button-active",
      t && this.currentColumnAlignment === "left"
    ), this.alignCenterButton.classList.toggle(
      "zt-md-table-action-button-active",
      t && this.currentColumnAlignment === "center"
    ), this.alignRightButton.classList.toggle(
      "zt-md-table-action-button-active",
      t && this.currentColumnAlignment === "right"
    );
  }
  /**
   * 将当前聚焦列设置为目标对齐方式。
   */
  applyColumnAlignment(t) {
    const n = Rt(this.view.state);
    !n || n.rowIndex < 0 || n.columnIndex < 0 || Bw(this.view, n, t);
  }
  /**
   * 在当前列附近插入一列。
   */
  insertColumn(t) {
    const n = Rt(this.view.state);
    !n || n.rowIndex < 0 || n.columnIndex < 0 || Pw(this.view, n, t);
  }
  /**
   * 同步更多菜单可用态快照。
   */
  syncMoreActionsState(t, n, o, r) {
    this.currentCanInsertRowAbove = t, this.currentCanInsertColumn = n, this.currentCanDeleteRow = o, this.currentCanDeleteColumn = r;
  }
  /**
   * 解析可定位的 table DOM 节点。
   */
  resolveTableElement(t) {
    if (t instanceof HTMLTableElement)
      return t;
    const n = t.querySelector("table");
    return n instanceof HTMLTableElement ? n : null;
  }
  /**
   * 解析当前表格对应的浮层锚点。
   */
  resolveTableAnchor(t, n) {
    if (!this.editorWrapper)
      return null;
    const o = t.getBoundingClientRect(), r = Xe(o, this.editorWrapper), i = o.width, a = r.anchorLeftInContent + i - n - Uw, l = r.anchorTopInContent - Vw + qw;
    return {
      anchorLeftInContent: a,
      anchorTopInContent: l,
      anchorBottomInContent: l
    };
  }
  /**
   * 解析按钮容器实时宽度。
   */
  resolveActionsContainerWidth() {
    const t = this.actionsContainer.getBoundingClientRect().width;
    return t <= 0 ? null : t;
  }
  /**
   * 基于当前实时几何信息更新按钮定位(Portal 内 absolute 坐标)。
   */
  updateOverlayPosition() {
    if (!this.editorWrapper || !this.currentTableElement || this.actionsContainer.parentElement !== this.portalContainer)
      return;
    const t = this.resolveActionsContainerWidth();
    if (t === null)
      return;
    const n = this.resolveTableAnchor(this.currentTableElement, t);
    if (!n)
      return;
    const o = el(
      {
        wrapper: this.editorWrapper,
        anchor: n,
        overlaySize: { width: t },
        placement: Xw,
        offsetY: 0,
        boundaryInset: Gw
      },
      this.portalContainer
    );
    this.actionsContainer.style.left = `${o.left}px`, this.actionsContainer.style.top = `${o.top}px`;
  }
  /**
   * 更新按钮显示与绑定目标。
   */
  update(t) {
    var d, u;
    if (this.view = t, !this.editorWrapper || !ev(t)) {
      this.detach();
      return;
    }
    const n = Rt(t.state);
    if (!n) {
      this.detach();
      return;
    }
    const o = t.nodeDOM(n.tableStart);
    if (!(o instanceof HTMLElement)) {
      this.detach();
      return;
    }
    const r = this.resolveTableElement(o);
    if (!r) {
      this.detach();
      return;
    }
    this.actionsContainer.parentElement !== this.portalContainer && this.portalContainer.append(this.actionsContainer);
    const i = Rw(n), s = i && n.tableNode.child(0).childCount > 1, a = n.rowIndex > 0, l = n.rowIndex > 0, c = n.tableNode.childCount > 0 ? n.tableNode.child(0) : null;
    this.currentColumnIndex = i ? n.columnIndex : null, this.currentColumnAlignment = this.resolveColumnAlignment(
      this.currentColumnIndex === null ? null : (u = (d = c == null ? void 0 : c.maybeChild(this.currentColumnIndex)) == null ? void 0 : d.attrs) == null ? void 0 : u.alignment
    ), this.updateAlignmentButtonsState(i), this.syncMoreActionsState(a, i, l, s), this.currentTableElement = r, this.currentTableStart = n.tableStart, this.currentTableNodeSize = n.tableNodeSize, this.hasPositionContext = !0, this.updateOverlayPosition(), this.repositionScheduler.schedule();
  }
  /**
   * 卸载按钮与容器状态。
   */
  detach() {
    this.moreActions.close(), this.actionsContainer.remove(), this.currentTableElement = null, this.currentTableStart = null, this.currentTableNodeSize = null, this.currentColumnIndex = null, this.currentColumnAlignment = hr, this.updateAlignmentButtonsState(!1), this.currentCanInsertRowAbove = !1, this.currentCanInsertColumn = !1, this.currentCanDeleteRow = !1, this.currentCanDeleteColumn = !1, this.hasPositionContext = !1;
  }
  /**
   * 销毁插件视图。
   */
  destroy() {
    this.detach(), this.moreActions.destroy(), this.repositionScheduler.destroy(), this.actionsContainer.removeEventListener("mousedown", this.handleActionsMouseDown), this.deleteButton.removeEventListener("click", this.handleDeleteClick), this.alignLeftButton.removeEventListener("click", this.handleAlignLeftClick), this.alignCenterButton.removeEventListener("click", this.handleAlignCenterClick), this.alignRightButton.removeEventListener("click", this.handleAlignRightClick);
  }
}
const nv = (e, t, n) => {
  const o = Qe(void 0, t);
  return ue(() => new ye({
    key: new ke(Ww),
    view: (r) => new tv(
      r,
      o,
      e,
      n
    )
  }));
}, bc = "table", ov = "ArrowUp", rv = (e) => e.key !== ov || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey, iv = (e, t) => {
  const n = t.nodeBefore;
  return !n || n.type.name !== bc ? null : {
    tableNode: n,
    tableStart: e - n.nodeSize
  };
}, sv = (e) => {
  if (e.parent.type.name !== "paragraph" || e.parentOffset !== 0 || e.parent.childCount > 0 || e.depth < 1)
    return null;
  const t = e.index(e.depth - 1);
  if (t <= 0)
    return null;
  const o = e.node(e.depth - 1).child(t - 1);
  if (o.type.name !== bc)
    return null;
  const r = e.before(e.depth);
  return {
    tableNode: o,
    tableStart: r - o.nodeSize
  };
}, av = (e, t) => {
  if (e.childCount === 0)
    return null;
  const n = e.childCount - 1, o = e.child(n);
  if (o.childCount === 0)
    return null;
  let r = 0;
  for (let d = 0; d < n; d += 1)
    r += e.child(d).nodeSize;
  const i = o.childCount - 1, s = o.child(i);
  let a = 0;
  for (let d = 0; d < i; d += 1)
    a += o.child(d).nodeSize;
  return t + 1 + r + 1 + a + s.nodeSize - 1;
}, lv = (e) => {
  const { selection: t } = e.state, n = t.$from;
  let o = null;
  if (t instanceof kr ? o = iv(t.from, n) : t.empty && (o = sv(n)), !o)
    return !1;
  const r = av(o.tableNode, o.tableStart);
  if (r === null)
    return !1;
  const i = e.state.tr.setSelection(de.near(e.state.doc.resolve(r), -1)).scrollIntoView();
  return e.dispatch(i), e.focus(), !0;
}, cv = ue(() => new ye({
  key: new ke("zt-md-table-arrow-entry"),
  props: {
    handleKeyDown: (e, t) => rv(t) ? !1 : lv(e)
  }
})), dv = "table_header_row", uv = "table_header", hv = (e) => {
  try {
    const t = qd.fromSchema(e.type.schema).serializeFragment(e.content), n = document.createElement("div");
    return n.appendChild(t), n.innerHTML;
  } catch {
    return e.textContent;
  }
}, mv = (e) => {
  const t = String(e ?? "left");
  return t === "center" || t === "right" ? ` style="text-align: ${t}"` : "";
}, pv = (e) => {
  const t = [], n = [];
  e.forEach((i) => {
    const s = i.type.name === dv, a = [];
    i.forEach((c) => {
      const d = s || c.type.name === uv ? "th" : "td", u = Number(c.attrs.colspan ?? 1), h = Number(c.attrs.rowspan ?? 1);
      let p = "";
      u > 1 && (p += ` colspan="${u}"`), h > 1 && (p += ` rowspan="${h}"`), p += mv(c.attrs.alignment), a.push(`<${d}${p}>${hv(c)}</${d}>`);
    });
    const l = `<tr>${a.join("")}</tr>`;
    (s ? t : n).push(l);
  });
  const o = t.length > 0 ? `<thead>${t.join("")}</thead>` : "", r = n.length > 0 ? `<tbody>${n.join("")}</tbody>` : "";
  return `<table>${o}${r}</table>`;
}, Ca = (e) => (t) => {
  const n = e(t);
  return {
    ...n,
    parseMarkdown: {
      ...n.parseMarkdown,
      runner: (o, r, i) => {
        const s = r, a = Math.max(1, Math.min(1e3, Number(s.colspan ?? 1) || 1)), l = Math.max(1, Math.min(1e3, Number(s.rowspan ?? 1) || 1)), c = typeof s.align == "string" ? s.align : void 0;
        o.openNode(i, {
          alignment: c ?? "left",
          colspan: a,
          rowspan: l
        });
        const d = o.schema.nodes.paragraph;
        d && (o.openNode(d), o.next(r.children ?? []), o.closeNode(), o.closeNode());
      }
    }
  };
}, fv = (e) => {
  const t = e.get(Vi.key);
  e.set(Vi.key, Ca(t));
  const n = e.get(qi.key);
  e.set(qi.key, Ca(n));
}, gv = (e) => {
  const t = e.get(Gi.key), n = (o) => {
    const r = t(o);
    return {
      ...r,
      parseMarkdown: {
        ...r.parseMarkdown,
        runner: (i, s, a) => {
          const l = s.aligns, c = s.align, d = (s.children ?? []).map(
            (u, h) => {
              const p = l && Array.isArray(l) ? l[h] : Array.isArray(c) ? c[h] : void 0;
              return { ...u, align: p ?? u.align };
            }
          );
          i.openNode(a), i.next(d), i.closeNode();
        }
      }
    };
  };
  e.set(Gi.key, n);
}, bv = (e) => {
  const t = e.get(Xi.key), n = (o) => {
    const r = t(o);
    return {
      ...r,
      toMarkdown: {
        ...r.toMarkdown,
        runner: (i, s) => {
          if (!Kw(s)) {
            r.toMarkdown.runner(i, s);
            return;
          }
          i.addNode("html", void 0, pv(s));
        }
      }
    };
  };
  e.set(Xi.key, n);
}, yv = /* @__PURE__ */ new Set(["table", "thead", "tbody", "tfoot", "tr", "td", "th"]), kv = (e) => {
  var i, s, a;
  const t = Math.max(1, Math.min(1e3, Number(((i = /colspan\s*=\s*"?\s*(\d+)/i.exec(e)) == null ? void 0 : i[1]) ?? 1) || 1)), n = Math.max(1, Math.min(1e3, Number(((s = /rowspan\s*=\s*"?\s*(\d+)/i.exec(e)) == null ? void 0 : s[1]) ?? 1) || 1)), o = /text-align\s*:\s*([a-z]+)/i.exec(e), r = (a = o == null ? void 0 : o[1]) == null ? void 0 : a.toLowerCase();
  return {
    colspan: t,
    rowspan: n,
    align: r === "center" || r === "right" || r === "left" ? r : null
  };
}, yc = (e) => {
  const t = [];
  e.forEach((o, r) => {
    const i = () => t[r] ?? (t[r] = []);
    let s = 0;
    for (const a of o.cells) {
      for (; i()[s]; )
        s += 1;
      for (let l = r; l < r + a.rowspan; l += 1) {
        const c = t[l] ?? (t[l] = []);
        for (let d = s; d < s + a.colspan; d += 1)
          c[d] = !0;
      }
      a.align = a.align ?? null, s += a.colspan;
    }
  });
  let n = 0;
  return t.forEach((o) => {
    o.forEach((r, i) => {
      r && i + 1 > n && (n = i + 1);
    });
  }), e.forEach((o) => {
    if (o.cells.reduce((s, a) => s + a.colspan, 0) > n) {
      let s = n;
      o.cells.forEach((a) => {
        if (s <= 0) {
          a.colspan = 0;
          return;
        }
        a.colspan = Math.min(a.colspan, s), s -= a.colspan;
      }), o.cells = o.cells.filter((a) => a.colspan > 0);
    }
    const i = o.cells.reduce((s, a) => s + a.colspan, 0);
    for (let s = i; s < n; s += 1)
      o.cells.push({ children: [], isHeader: o.isHeader, align: null, colspan: 1, rowspan: 1 });
  }), { rows: e, columnCount: n };
}, kc = (e, t) => {
  const n = new Array(t).fill(null);
  for (const r of e) {
    let i = 0;
    for (const s of r.cells)
      s.align && i < t && !n[i] && (n[i] = s.align), i += s.colspan;
  }
  const o = e.map((r) => {
    const i = [], s = r.cells.map((a) => {
      const l = a.align ?? n[i.length] ?? null;
      return i.push(l), {
        type: "tableCell",
        isHeader: a.isHeader,
        align: l,
        colspan: a.colspan,
        rowspan: a.rowspan,
        children: a.children
      };
    });
    return { type: "tableRow", aligns: i, children: s };
  });
  return {
    type: "table",
    align: n.map((r) => r ?? null),
    children: o
  };
}, wc = (e) => {
  const t = [];
  let n = null, o = null, r = !1, i = !1;
  const s = () => {
    o && n && n.cells.push(o), o = null;
  }, a = () => {
    s(), n && t.push(n), n = null;
  };
  for (const c of e) {
    if (i)
      break;
    if (c.tag !== null) {
      if (r = !0, c.tag === "table" && !c.closing)
        continue;
      if (c.tag === "table" && c.closing) {
        i = !0;
        break;
      }
      if (c.tag === "tr" && !c.closing) {
        a(), n = { cells: [], isHeader: !1 };
        continue;
      }
      if ((c.tag === "td" || c.tag === "th") && !c.closing) {
        s(), n || (n = { cells: [], isHeader: !1 });
        const d = kv(`<${c.tag}${c.attrs}>`);
        o = {
          children: [],
          isHeader: c.tag === "th",
          align: d.align,
          colspan: d.colspan,
          rowspan: d.rowspan
        };
        continue;
      }
      if ((c.tag === "td" || c.tag === "th") && c.closing) {
        s();
        continue;
      }
      if (c.tag === "tr" && c.closing) {
        a();
        continue;
      }
      continue;
    }
    o && (c.nodes && c.nodes.length > 0 ? o.children.push(...c.nodes) : c.text.length > 0 && o.children.push({ type: "text", value: c.text }));
  }
  if (a(), !r || t.length === 0)
    return null;
  const l = yc(t);
  return l.columnCount === 0 ? null : kc(l.rows, l.columnCount);
}, wv = (e) => {
  const t = [];
  for (const n of e.matchAll(/<[^>]+>|[^<]+/g)) {
    const o = n[0];
    if (o.startsWith("<")) {
      const r = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)([\s\S]*?)>$/.exec(o);
      if (!r)
        continue;
      t.push({
        tag: (r[2] ?? "").toLowerCase(),
        closing: r[1] === "/",
        attrs: r[3] ?? "",
        text: ""
      });
    } else
      t.push({ tag: null, closing: !1, attrs: "", text: o });
  }
  return wc(t);
}, vv = (e) => {
  const t = e.children ?? [];
  if (t.length === 0)
    return null;
  const n = t[0];
  if (!n || n.type !== "html" || !/^<table[\s>]/i.test(String(n.value ?? "")))
    return null;
  if (t.every((r) => r.type === "html" || r.type === "text")) {
    const r = t.map((i) => String(i.value ?? "")).join("");
    return wv(r);
  }
  const o = [];
  for (const r of t) {
    if (r.type === "html") {
      const i = String(r.value ?? ""), s = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)/.exec(i);
      if (s && yv.has((s[2] ?? "").toLowerCase())) {
        const a = (s[2] ?? "").toLowerCase(), l = i.slice(s[0].length).replace(/>$/, "");
        o.push({ tag: a, closing: s[1] === "/", attrs: l, text: "" });
        continue;
      }
      if (o.length > 0) {
        const a = o[o.length - 1];
        a != null && a.nodes ? a.nodes.push(r) : o.push({ tag: null, closing: !1, attrs: "", text: "", nodes: [r] });
      }
      continue;
    }
    if (o.length > 0) {
      const i = o[o.length - 1];
      i != null && i.nodes ? i.nodes.push(r) : o.push({ tag: null, closing: !1, attrs: "", text: "", nodes: [r] });
    }
  }
  return wc(o);
}, Cv = (e) => {
  var a;
  if (e.type !== "html" || typeof e.value != "string" || !/^\s*<table[\s>]/i.test(e.value))
    return null;
  const n = new DOMParser().parseFromString(e.value, "text/html").querySelector("table");
  if (!n)
    return null;
  const o = [], r = ((a = n.querySelector("thead")) == null ? void 0 : a.querySelectorAll("tr").length) ?? 0;
  if (Array.from(n.querySelectorAll("tr")).filter(
    (l) => {
      var c;
      return ["table", "thead", "tbody", "tfoot"].includes(((c = l.parentElement) == null ? void 0 : c.tagName.toLowerCase()) ?? "");
    }
  ).forEach((l, c) => {
    const d = [];
    Array.from(l.children).forEach((u) => {
      u instanceof HTMLTableCellElement && d.push({
        children: u.textContent ? [{ type: "text", value: u.textContent }] : [],
        isHeader: u.tagName.toLowerCase() === "th" || c < r,
        align: (() => {
          const h = u.style.textAlign;
          return h === "center" || h === "right" || h === "left" ? h : null;
        })(),
        colspan: Math.max(1, Math.min(1e3, Number(u.getAttribute("colspan") ?? 1) || 1)),
        rowspan: Math.max(1, Math.min(1e3, Number(u.getAttribute("rowspan") ?? 1) || 1))
      });
    }), o.push({
      cells: d,
      isHeader: c < r || d.length > 0 && d.every((u) => u.isHeader)
    });
  }), o.length === 0)
    return null;
  const s = yc(o);
  return s.columnCount === 0 ? null : kc(s.rows, s.columnCount);
}, vc = (e) => {
  const t = e.children;
  if (Array.isArray(t))
    for (let n = 0; n < t.length; n += 1) {
      const o = t[n];
      if (!o)
        continue;
      const r = Cv(o);
      if (r) {
        t[n] = r;
        continue;
      }
      if (o.type === "paragraph") {
        const i = vv(o);
        i && (t[n] = i);
        continue;
      }
      vc(o);
    }
}, Ev = We("remarkTableHtml", () => () => (t) => {
  vc(t);
}), zv = "list_item", Mv = 'li[data-item-type="task"]', Ea = 24, Cc = (e, t) => {
  const n = t.getBoundingClientRect();
  return e.clientX >= n.left && e.clientX <= n.left + Ea && e.clientY >= n.top && e.clientY <= n.top + Ea;
}, Ec = (e) => {
  if (!(e instanceof Element))
    return null;
  const t = e.closest(Mv);
  return t instanceof HTMLElement ? t : null;
}, za = (e, t) => {
  if (!e.editable)
    return !1;
  const n = Ec(t.target);
  return !n || !Cc(t, n) ? !1 : (t.preventDefault(), !0);
}, Tv = (e, t) => {
  const n = e.posAtDOM(t, 0) - 1, o = e.state.doc.nodeAt(n);
  return !o || o.type.name !== zv || o.attrs.checked == null ? !1 : (e.dispatch(
    e.state.tr.setNodeMarkup(n, void 0, {
      ...o.attrs,
      checked: !o.attrs.checked
    })
  ), !0);
}, xv = ue(() => new ye({
  props: {
    handleDOMEvents: {
      mousedown: (e, t) => za(e, t),
      dblclick: (e, t) => za(e, t),
      click: (e, t) => {
        if (!e.editable)
          return !1;
        const n = Ec(t.target);
        return !n || !Cc(t, n) || !Tv(e, n) ? !1 : (t.preventDefault(), !0);
      }
    }
  }
})), Ma = "list_item", zc = (e, t, n, o) => {
  const r = e.doc.resolve(n);
  let i = 0, s = r.node(i);
  for (; s && s.type.name !== Ma; )
    i -= 1, s = r.node(i);
  if (!s || s.type.name !== Ma || s.attrs.checked != null)
    return null;
  const l = String(t[1] ?? "").toLowerCase() === "x", c = r.before(i), d = e.tr;
  return d.deleteRange(n, o).setNodeMarkup(c, void 0, {
    ...s.attrs,
    checked: l
  }), d;
}, Ta = Kt(
  // (\s|[xX])? 空组 → [] / [x] / [X];与内置 gfm 规则(要求括号内空格)完全不相交。
  () => new pn(/^\[([xX])?\] $/, zc)
), Sv = Kt(
  () => new pn(/^【([xX])?】 $/, zc)
), Lv = (e) => e ? [Ta, Sv] : [Ta], Av = Kt(
  (e) => Ua(
    /^\s*(\d+)[。、]\s$/,
    Ed.type(e),
    (t) => ({ order: Number(t[1]) }),
    (t, n) => n.childCount + n.attrs.order === Number(t[1])
  )
), Iv = Kt(
  (e) => Ua(/^\s*》\s$/, zd.type(e))
), Rv = Kt(
  (e) => Yd(new RegExp("(?<![\\w:/])(～{2})(.+?)\\1(?!\\w|\\/)$"), Td.type(e))
), Nv = (e) => e ? [
  Av,
  Iv,
  Rv
] : [], Pv = "Tab", Mc = 4, Dv = /^ */, Bv = "list_item", _v = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable, Ov = (e) => {
  const { $from: t } = e.selection;
  for (let n = t.depth; n >= 0; n -= 1) {
    const o = t.node(n);
    if (o.type.name === Bv)
      return o.type;
  }
  return null;
}, Tc = (e) => {
  const { selection: t, doc: n } = e;
  if (t.empty)
    return [t.$from.start()];
  const o = /* @__PURE__ */ new Set();
  return n.nodesBetween(t.from, t.to, (r, i) => {
    r.isTextblock && o.add(i + 1);
  }), Array.from(o);
}, Hv = (e, t) => {
  const { state: n } = e, o = " ".repeat(Mc), r = Tc(n).sort((s, a) => a - s), i = n.tr;
  return n.selection.empty ? i.insertText(o, n.selection.to) : r.forEach((s) => {
    i.insertText(o, s);
  }), i.docChanged ? (t.preventDefault(), e.dispatch(i), !0) : !1;
}, Fv = (e, t) => {
  const { state: n } = e, { selection: o } = n;
  if (!(o instanceof de))
    return !1;
  const r = Tc(n).sort((s, a) => a - s), i = n.tr;
  return r.forEach((s) => {
    var u;
    const c = ((u = n.doc.resolve(s).parent.textContent.match(Dv)) == null ? void 0 : u[0].length) ?? 0, d = Math.min(c, Mc);
    d <= 0 || i.delete(s, s + d);
  }), i.docChanged ? (t.preventDefault(), e.dispatch(i), !0) : !1;
}, $v = ue(() => new ye({
  key: new ke("zt-md-tab-space-indent"),
  props: {
    handleKeyDown: (e, t) => {
      const n = e;
      if (!_v(n) || t.defaultPrevented || t.key !== Pv || t.altKey || t.ctrlKey || t.metaKey)
        return !1;
      const o = Ov(n.state);
      if (o) {
        const i = (t.shiftKey ? Pd(o) : Dd(o))(n.state, n.dispatch);
        return t.preventDefault(), i || !0;
      }
      return t.shiftKey ? Fv(n, t) : Hv(n, t);
    }
  }
})), xc = (e) => {
  const t = e instanceof Element ? e : e.parentElement, n = t == null ? void 0 : t.closest("code");
  return n instanceof HTMLElement && !n.closest("pre") ? n : null;
}, ki = (e, t, n) => {
  const o = e.domAtPos(t, n);
  return xc(o.node);
}, jv = (e) => {
  const t = e.ownerDocument.createTreeWalker(e, NodeFilter.SHOW_TEXT);
  let n = t.nextNode(), o = null;
  for (; n; )
    n.data.length > 0 && (o = n), n = t.nextNode();
  return o;
}, Jn = (e, t, n) => {
  const o = e.domAtPos(t, n), r = e.dom.ownerDocument.getSelection();
  r == null || r.collapse(o.node, o.offset);
}, Sc = (e, t) => {
  const n = e.domAtPos(t, -1), o = xc(n.node), r = e.dom.ownerDocument.getSelection();
  if (!o) {
    r == null || r.collapse(n.node, n.offset);
    return;
  }
  const i = jv(o);
  if (!i) {
    const a = o.childNodes.length;
    r == null || r.collapse(o, a);
    return;
  }
  const s = i.data.length;
  r == null || r.collapse(i, s);
}, Kv = {
  left: {
    inwardKey: "ArrowRight",
    outwardKey: "ArrowLeft"
  },
  right: {
    inwardKey: "ArrowLeft",
    outwardKey: "ArrowRight"
  }
}, Wv = {
  left: "nodeAfter",
  right: "nodeBefore"
}, Or = (e, t) => {
  e.dispatch(e.state.tr.setMeta(t, null));
}, Uv = (e, t, n, o, r) => {
  if (t.key === "ArrowRight")
    return Or(e, r), !1;
  if (t.key !== "ArrowLeft")
    return !1;
  t.preventDefault();
  const s = (e.state.storedMarks ?? e.state.selection.$from.marks()).filter((a) => a.type !== n);
  return e.dispatch(
    e.state.tr.setStoredMarks(s).setMeta(r, {
      ...o,
      placement: "outside"
    })
  ), !0;
}, Vv = (e, t, n, o, r) => {
  if (o.placement === "inside")
    return Uv(
      e,
      t,
      n,
      o,
      r
    );
  const i = Kv[o.side];
  if (t.key === i.outwardKey)
    return Or(e, r), !1;
  if (t.key !== i.inwardKey)
    return !1;
  const s = Wv[o.side], a = e.state.selection.$from[s], l = a ? n.isInSet(a.marks) : null;
  if (!l)
    return Or(e, r), !1;
  t.preventDefault();
  const c = e.state.storedMarks ?? e.state.selection.$from.marks(), d = l.addToSet(c);
  return e.dispatch(
    e.state.tr.setSelection(de.create(e.state.doc, o.position)).setStoredMarks(d).setMeta(
      r,
      o.side === "left" ? {
        ...o,
        placement: "inside"
      } : null
    )
  ), o.side === "right" && Sc(e, o.position), !0;
}, Be = (e, t) => !!t.isInSet(e), Lc = (e, t, n) => {
  const o = e.state.doc.resolve(t), r = o.nodeBefore, i = o.nodeAfter;
  return !i || Be((r == null ? void 0 : r.marks) ?? [], n) || !Be(i.marks, n) ? null : n.isInSet(i.marks) ?? null;
}, Ac = (e, t, n) => {
  const o = e.state.doc.resolve(t), r = o.nodeBefore, i = o.nodeAfter;
  return !r || !Be(r.marks, n) || Be((i == null ? void 0 : i.marks) ?? [], n) ? null : n.isInSet(r.marks) ?? null;
}, qv = "zt-md-inline-code-boundary-navigation", Re = new ke(qv), Gv = "inlineCode", Xv = 2, Yv = (e, t, n, o) => {
  const r = t > 0 ? [t, t - 1] : [t];
  for (const [i, s] of r.entries()) {
    const a = Ac(e, s, o);
    if (!a)
      continue;
    const c = e.state.doc.resolve(s).nodeAfter;
    if (c !== null && !c.isText)
      continue;
    const d = ki(e, s, -1);
    if (!d)
      continue;
    const u = d.getBoundingClientRect(), h = n <= u.right + Xv;
    if (!(i > 0 && !h))
      return {
        boundaryPosition: s,
        inlineCodeMark: a,
        rightPlainTextNode: c,
        codeElement: d
      };
  }
  return null;
}, Zv = (e, t) => {
  var f;
  if (t.button !== 0 || t.altKey || t.ctrlKey || t.metaKey || t.shiftKey || !e.editable)
    return !1;
  const n = e.posAtCoords({
    left: t.clientX,
    top: t.clientY
  }), o = e.state.schema.marks[Gv];
  if (!n || !o)
    return !1;
  const r = n.pos, i = e.state.doc.resolve(r), s = Lc(
    e,
    r,
    o
  ), a = i.nodeBefore;
  if (s && (!a || a.isText)) {
    const w = ki(e, r, 1);
    if (!w)
      return !1;
    const b = w.getBoundingClientRect(), k = t.clientX >= b.left, v = ((a == null ? void 0 : a.marks) ?? i.marks()).filter((x) => x.type !== o), E = k ? s.addToSet(i.marks()) : v, M = k ? {
      position: r,
      side: "left",
      placement: "inside"
    } : null;
    return t.preventDefault(), e.dispatch(
      e.state.tr.setSelection(de.create(e.state.doc, r)).setStoredMarks(E).setMeta(Re, M)
    ), e.focus(), k || Jn(e, r, -1), !0;
  }
  const l = Yv(
    e,
    r,
    t.clientX,
    o
  );
  if (!l)
    return !1;
  const c = l.boundaryPosition, d = e.state.doc.resolve(c), u = l.codeElement.getBoundingClientRect(), h = t.clientX >= u.right, p = (((f = l.rightPlainTextNode) == null ? void 0 : f.marks) ?? d.marks()).filter((w) => w.type !== o), g = h ? p : l.inlineCodeMark.addToSet(d.marks()), y = h ? {
    position: c,
    side: "right",
    placement: "outside"
  } : null;
  return t.preventDefault(), e.dispatch(
    e.state.tr.setSelection(de.create(e.state.doc, c)).setStoredMarks(g).setMeta(Re, y)
  ), e.focus(), h || Sc(e, c), !0;
}, Jv = "inlineCode", Ic = "zt-md-inline-code-boundary-indicator", Qv = "zt-md-inline-code-boundary-indicator-widget", xa = "zt-md-inline-code-boundary-active", eC = {
  left: -1,
  right: 1
}, tC = {
  left: 1,
  right: -1
}, nC = (e) => {
  const t = document.createElement("span");
  return t.className = Ic, t.dataset.side = e.side, t.dataset.placement = e.placement, t.contentEditable = "false", t.setAttribute("aria-hidden", "true"), t;
}, oC = (e, t) => {
  if (t.placement === "outside")
    return [];
  const n = e.schema.marks[Jv], o = e.doc.resolve(t.position).nodeAfter, r = o && n ? n.isInSet(o.marks) : null;
  return r ? [r] : null;
}, rC = (e) => {
  const t = Re.getState(e);
  if (!t)
    return Le.empty;
  const n = oC(e, t);
  if (!n)
    return Le.empty;
  const o = t.placement === "inside" ? 1 : eC[t.side], r = nC(t), i = jt.widget(
    t.position,
    r,
    {
      side: o,
      marks: n,
      key: `${Qv}-${t.side}-${t.placement}`,
      ignoreSelection: !0,
      relaxedSide: !0
    }
  );
  return Le.create(e.doc, [i]);
}, iC = (e, t) => {
  if ((t == null ? void 0 : t.placement) !== "outside")
    return;
  const n = e.dom.querySelector(
    `.${Ic}[data-side='${t.side}'][data-placement='outside']`
  ), o = tC[t.side], r = ki(e, t.position, o);
  if (!n || !r)
    return;
  const i = n.getBoundingClientRect().left, s = r.getBoundingClientRect(), a = t.side === "left" ? s.left - 1 : s.right + 1, l = Math.round(a - i);
  n.style.setProperty(
    "--zt-md-inline-code-boundary-offset-x",
    `${l}px`
  );
}, Rc = "inlineCode", Nc = (e, t) => {
  const { selection: n } = e.state;
  if (!n.empty)
    return !1;
  const o = n.$from.nodeBefore, r = n.$from.nodeAfter;
  return !!(o && Be(o.marks, t) && (!r || !Be(r.marks, t)));
}, Pc = (e, t) => {
  const { selection: n } = e.state;
  if (!n.empty)
    return !1;
  const o = n.$from.nodeBefore, r = n.$from.nodeAfter;
  return !!(r && Be(r.marks, t) && (!o || !Be(o.marks, t)));
}, Dc = (e, t, n) => {
  const o = Lc(e, t, n);
  if (!o)
    return !1;
  const r = e.state.storedMarks ?? e.state.doc.resolve(t).marks(), i = o.addToSet(r);
  return e.dispatch(
    e.state.tr.setSelection(de.create(e.state.doc, t)).setStoredMarks(i).setMeta(Re, {
      position: t,
      side: "left",
      placement: "inside"
    })
  ), !0;
}, sC = (e, t) => t.defaultPrevented || t.altKey || t.ctrlKey || t.metaKey || t.shiftKey || !e.editable, aC = (e, t) => {
  const { selection: n } = e.state;
  if (!n.empty)
    return null;
  const o = n.$from.nodeBefore;
  return !o || !Be(o.marks, t) ? null : Array.from(o.textContent).length === 1 ? n.from - o.nodeSize : null;
}, lC = (e, t, n) => {
  if (t.key !== "ArrowLeft")
    return !1;
  const o = aC(e, n);
  if (o === null)
    return !1;
  const r = e.state.storedMarks ?? e.state.selection.$from.marks();
  return Be(r, n) ? (t.preventDefault(), e.dispatch(
    e.state.tr.setSelection(de.create(e.state.doc, o)).setStoredMarks(r).setMeta(Re, {
      position: o,
      side: "left",
      placement: "inside"
    })
  ), !0) : !1;
}, cC = (e, t, n) => {
  if (!Pc(e, n))
    return !1;
  const o = e.state.storedMarks ?? e.state.selection.$from.marks();
  if (!Be(o, n))
    return wi(e), !1;
  t.preventDefault();
  const r = o.filter((i) => i.type !== n);
  return e.dispatch(
    e.state.tr.setStoredMarks(r).setMeta(Re, {
      position: e.state.selection.from,
      side: "left",
      placement: "outside"
    })
  ), Jn(e, e.state.selection.from, -1), !0;
}, dC = (e, t, n) => {
  if (t.key !== "ArrowLeft" || !Nc(e, n))
    return !1;
  const o = e.state.storedMarks ?? e.state.selection.$from.marks();
  return Be(o, n) ? !1 : (t.preventDefault(), e.dispatch(
    e.state.tr.setStoredMarks(o).setMeta(Re, {
      position: e.state.selection.from,
      side: "right",
      placement: "outside"
    })
  ), Jn(e, e.state.selection.from, 1), !0);
}, uC = (e, t) => {
  const { selection: n } = e.state;
  if (!n.empty)
    return null;
  const o = n.$from.nodeBefore;
  if (!(o != null && o.isText) || Be(o.marks, t) || Array.from(o.textContent).length !== 1)
    return null;
  const r = n.from - o.nodeSize;
  return Ac(e, r, t) ? r : null;
}, hC = (e, t, n) => {
  var s;
  if (t.key !== "ArrowLeft")
    return !1;
  const o = uC(e, n);
  if (o === null)
    return !1;
  const i = (((s = e.state.selection.$from.nodeBefore) == null ? void 0 : s.marks) ?? []).filter((a) => a.type !== n);
  return t.preventDefault(), e.dispatch(
    e.state.tr.setSelection(de.create(e.state.doc, o)).setStoredMarks(i).setMeta(Re, {
      position: o,
      side: "right",
      placement: "outside"
    })
  ), Jn(e, o, 1), !0;
}, mC = (e, t, n) => hC(e, t, n) || dC(e, t, n) || lC(e, t, n) || cC(e, t, n), pC = () => null, fC = (e, t) => {
  const n = e.getMeta(Re);
  return n !== void 0 ? n : e.docChanged || e.selectionSet || e.storedMarksSet ? null : t;
}, wi = (e) => {
  Re.getState(e.state) != null && e.dispatch(e.state.tr.setMeta(Re, null));
}, gC = (e) => (wi(e), !1);
class bC {
  /**
   * 初始化插件视图并同步当前退出状态。
   */
  constructor(t) {
    /** 编辑器根 DOM。 */
    m(this, "editorDom");
    this.editorDom = t.dom, this.update(t);
  }
  /**
   * 根据插件状态控制原生 caret 可见性。
   */
  update(t) {
    const n = Re.getState(t.state), o = n != null;
    this.editorDom.classList.toggle(xa, o), iC(t, n ?? null);
  }
  /**
   * 销毁插件视图时恢复原生 caret。
   */
  destroy() {
    this.editorDom.classList.remove(xa);
  }
}
const yC = (e) => new bC(e), kC = (e) => {
  if (!(e instanceof Element))
    return !1;
  const t = e.closest("code");
  return !!(t && !t.closest("pre"));
}, wC = (e, t, n) => {
  if (!e.state.selection.empty)
    return !1;
  if (Zv(e, n))
    return !0;
  const o = kC(n.target), r = e.state.schema.marks[Rc];
  if (r && o && Dc(e, t, r))
    return n.preventDefault(), !0;
  const i = Re.getState(e.state);
  if (!o || !i)
    return !1;
  const s = e.state.storedMarks, a = e.state.tr.setMeta(Re, null);
  return s !== null && r && !Be(s, r) && a.setStoredMarks(null), e.dispatch(a), !1;
}, vC = (e, t, n) => {
  if (t.key !== "ArrowRight" || !Pc(e, n))
    return !1;
  const o = e.state.storedMarks ?? e.state.selection.$from.marks();
  return Be(o, n) || !Dc(e, e.state.selection.from, n) ? !1 : (t.preventDefault(), !0);
}, CC = (e, t, n) => {
  if (t.key !== "ArrowRight")
    return !1;
  if (vC(e, t, n))
    return !0;
  if (!Nc(e, n))
    return !1;
  const o = e.state.storedMarks ?? e.state.selection.$from.marks();
  if (!Be(o, n))
    return wi(e), !1;
  t.preventDefault();
  const r = o.filter((i) => i.type !== n);
  return e.dispatch(
    e.state.tr.setStoredMarks(r).setMeta(Re, {
      position: e.state.selection.from,
      side: "right",
      placement: "outside"
    })
  ), Jn(e, e.state.selection.from, 1), !0;
}, EC = {
  ArrowLeft: mC,
  ArrowRight: CC
}, zC = (e, t) => {
  if (sC(e, t))
    return !1;
  const n = EC[t.key];
  if (!n)
    return !1;
  const o = e.state.schema.marks[Rc];
  if (!o)
    return !1;
  const r = Re.getState(e.state);
  return r ? Vv(
    e,
    t,
    o,
    r,
    Re
  ) : n(e, t, o);
}, MC = ue(() => new ye({
  key: Re,
  view: yC,
  state: {
    init: pC,
    apply: fC
  },
  props: {
    handleKeyDown: zC,
    handleClick: wC,
    decorations: rC,
    handleDOMEvents: {
      blur: gC
    }
  }
})), TC = (e, t) => {
  let n = null, o = null;
  const r = () => {
    if (n = null, o !== null) {
      const s = o;
      o = null, e(...s);
    }
  }, i = (...s) => {
    o = s, n !== null && clearTimeout(n), n = setTimeout(r, t);
  };
  return i.cancel = () => {
    n !== null && (clearTimeout(n), n = null), o = null;
  }, i.flush = () => {
    n !== null && (clearTimeout(n), r());
  }, i.pending = () => n !== null, i;
}, xC = Math.floor, SC = () => /* @__PURE__ */ new Set(), LC = Array.from, Hr = Date.now, mr = () => /* @__PURE__ */ new Map(), AC = (e, t, n) => {
  let o = e.get(t);
  return o === void 0 && e.set(t, o = n()), o;
};
class IC {
  constructor() {
    this._observers = mr();
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  on(t, n) {
    AC(this._observers, t, SC).add(n);
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  once(t, n) {
    const o = (...r) => {
      this.off(t, o), n(...r);
    };
    this.on(t, o);
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  off(t, n) {
    const o = this._observers.get(t);
    o !== void 0 && (o.delete(n), o.size === 0 && this._observers.delete(t));
  }
  /**
   * Emit a named event. All registered event listeners that listen to the
   * specified name will receive the event.
   *
   * @todo This should catch exceptions
   *
   * @param {N} name The event name.
   * @param {Array<any>} args The arguments that are applied to the event listener.
   */
  emit(t, n) {
    return LC((this._observers.get(t) || mr()).values()).forEach((o) => o(...n));
  }
  destroy() {
    this._observers = mr();
  }
}
const Sa = Symbol("Equality"), RC = Object.keys, La = (e) => RC(e).length, NC = (e, t) => Object.prototype.hasOwnProperty.call(e, t), So = (e, t) => {
  if (e === t)
    return !0;
  if (e == null || t == null || e.constructor !== t.constructor && (e.constructor || Object) !== (t.constructor || Object))
    return !1;
  if (e[Sa] != null)
    return e[Sa](t);
  switch (e.constructor) {
    case ArrayBuffer:
      e = new Uint8Array(e), t = new Uint8Array(t);
    case Uint8Array: {
      if (e.byteLength !== t.byteLength)
        return !1;
      for (let n = 0; n < e.length; n++)
        if (e[n] !== t[n])
          return !1;
      break;
    }
    case Set: {
      if (e.size !== t.size)
        return !1;
      for (const n of e)
        if (!t.has(n))
          return !1;
      break;
    }
    case Map: {
      if (e.size !== t.size)
        return !1;
      for (const n of e.keys())
        if (!t.has(n) || !So(e.get(n), t.get(n)))
          return !1;
      break;
    }
    case void 0:
    case Object:
      if (La(e) !== La(t))
        return !1;
      for (const n in e)
        if (!NC(e, n) || !So(e[n], t[n]))
          return !1;
      break;
    case Array:
      if (e.length !== t.length)
        return !1;
      for (let n = 0; n < e.length; n++)
        if (!So(e[n], t[n]))
          return !1;
      break;
    default:
      return !1;
  }
  return !0;
}, pr = 3e4;
class PC extends IC {
  /**
   * @param {Y.Doc} doc
   */
  constructor(t) {
    super(), this.doc = t, this.clientID = t.clientID, this.states = /* @__PURE__ */ new Map(), this.meta = /* @__PURE__ */ new Map(), this._checkInterval = /** @type {any} */
    setInterval(() => {
      const n = Hr();
      this.getLocalState() !== null && pr / 2 <= n - /** @type {{lastUpdated:number}} */
      this.meta.get(this.clientID).lastUpdated && this.setLocalState(this.getLocalState());
      const o = [];
      this.meta.forEach((r, i) => {
        i !== this.clientID && pr <= n - r.lastUpdated && this.states.has(i) && o.push(i);
      }), o.length > 0 && DC(this, o, "timeout");
    }, xC(pr / 10)), t.on("destroy", () => {
      this.destroy();
    }), this.setLocalState({});
  }
  destroy() {
    this.emit("destroy", [this]), this.setLocalState(null), super.destroy(), clearInterval(this._checkInterval);
  }
  /**
   * @return {Object<string,any>|null}
   */
  getLocalState() {
    return this.states.get(this.clientID) || null;
  }
  /**
   * @param {Object<string,any>|null} state
   */
  setLocalState(t) {
    const n = this.clientID, o = this.meta.get(n), r = o === void 0 ? 0 : o.clock + 1, i = this.states.get(n);
    t === null ? this.states.delete(n) : this.states.set(n, t), this.meta.set(n, {
      clock: r,
      lastUpdated: Hr()
    });
    const s = [], a = [], l = [], c = [];
    t === null ? c.push(n) : i == null ? t != null && s.push(n) : (a.push(n), So(i, t) || l.push(n)), (s.length > 0 || l.length > 0 || c.length > 0) && this.emit("change", [{ added: s, updated: l, removed: c }, "local"]), this.emit("update", [{ added: s, updated: a, removed: c }, "local"]);
  }
  /**
   * @param {string} field
   * @param {any} value
   */
  setLocalStateField(t, n) {
    const o = this.getLocalState();
    o !== null && this.setLocalState({
      ...o,
      [t]: n
    });
  }
  /**
   * @return {Map<number,Object<string,any>>}
   */
  getStates() {
    return this.states;
  }
}
const DC = (e, t, n) => {
  const o = [];
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    if (e.states.has(i)) {
      if (e.states.delete(i), i === e.clientID) {
        const s = (
          /** @type {MetaClientState} */
          e.meta.get(i)
        );
        e.meta.set(i, {
          clock: s.clock + 1,
          lastUpdated: Hr()
        });
      }
      o.push(i);
    }
  }
  o.length > 0 && (e.emit("change", [{ added: [], updated: [], removed: o }, n]), e.emit("update", [{ added: [], updated: [], removed: o }, n]));
}, Bc = "meditor-local", Fr = /* @__PURE__ */ new WeakSet(), BC = (e) => Fr.has(e), _C = (e, t, n) => {
  e.length > 0 || t.state.doc.childCount === 0 || n.transact(() => {
    nu(t.state.schema, t.state.doc.toJSON(), e);
  }, Bc);
}, OC = async (e, t) => {
  var f;
  const { ydoc: n, fragmentName: o = "document", user: r, provider: i } = t, s = Bn(e, Pn, (w) => w.state != null);
  if (!s)
    throw new Error("[meditor collab] editor view not ready; call after editor.create() resolved");
  const a = n.getXmlFragment(o), l = (i == null ? void 0 : i.awareness) ?? new PC(n);
  r && l.setLocalStateField("user", r), _C(a, s, n);
  const c = Jd(a, s.state.schema);
  s.updateState(
    s.state.apply(
      s.state.tr.replaceWith(0, s.state.doc.content.size, c.content)
    )
  );
  const d = Qd(a), u = eu({ trackedOrigins: [Bc] }), h = tu(l, {}), p = [d, u, h];
  s.updateState(
    s.state.reconfigure({
      plugins: [...s.state.plugins, ...p]
    })
  ), (f = i == null ? void 0 : i.connect) == null || f.call(i), Fr.add(e);
  let g = null;
  const y = /* @__PURE__ */ new Set();
  return i != null && i.onStatusChange && i.onStatusChange((w) => {
    g = w, y.forEach((b) => b(w));
  }), {
    fragment: a,
    awareness: l,
    ...i != null && i.onStatusChange ? {
      onCollabStatus: (w) => (y.add(w), w(g ?? "disconnected"), () => {
        y.delete(w);
      })
    } : {},
    destroy: () => {
      var w;
      y.clear(), Fr.delete(e), s.isDestroyed || s.updateState(
        s.state.reconfigure({
          plugins: s.state.plugins.filter((b) => !p.includes(b))
        })
      ), (w = i == null ? void 0 : i.disconnect) == null || w.call(i), l.destroy();
    }
  };
}, an = (e, t) => (t === "undo" ? Ga : Xa)(e, void 0, void 0) === !0, At = (e, t) => {
  const n = rt(e, t);
  return n ? (Kr(n)(e.state, e.dispatch, e), e.focus(), !0) : !1;
}, HC = (e) => {
  const t = e.state.schema.nodes, n = t.horizontal_rule, o = t.paragraph;
  if (!n || !e.state || !e.dispatch)
    return !1;
  e.dispatch(e.state.tr.replaceSelectionWith(n.create()).scrollIntoView());
  const r = e.state.selection.from, i = e.state.doc.nodeAt(r);
  if (i && i.type === n) {
    const s = r + i.nodeSize, a = e.state.tr;
    o && a.insert(s, o.create()), a.setSelection(de.near(a.doc.resolve(s + 1), 1)), e.dispatch(a.scrollIntoView());
  }
  return e.focus(), !0;
}, FC = (e) => {
  if (!e.state || !e.dispatch)
    return !1;
  const { from: t, to: n } = e.state.selection;
  e.dispatch(e.state.tr.removeMark(t, n).scrollIntoView());
  for (let r = 0; r < 10 && Nd(e.state, e.dispatch, e); r += 1)
    ;
  const o = e.state.schema.nodes.paragraph;
  return o && Dn(o)(e.state, e.dispatch, e), e.focus(), !0;
}, $C = (e, t) => {
  const { view: n, portalContainer: o, messages: r, imageUpload: i, onOpenSearch: s, closeDropdown: a, anchorRect: l, anchorEl: c } = t, d = (u) => {
    const h = jo(n, u);
    return h && n.focus(), h;
  };
  switch (e) {
    case "blockMenu":
      return a(), cc(n);
    case "undo": {
      const u = Ga(n.state, n.dispatch, n);
      return u && n.focus(), u;
    }
    case "redo": {
      const u = Xa(n.state, n.dispatch, n);
      return u && n.focus(), u;
    }
    case "strong":
      return At(n, ["strong"]);
    case "em":
      return At(n, ["em", "emphasis"]);
    case "strike":
      return At(n, ["strike_through", "strikeThrough"]);
    case "underline":
      return At(n, ["underline"]);
    case "subscript":
      return At(n, ["subscript"]);
    case "superscript":
      return At(n, ["superscript"]);
    case "inlineCode":
      return At(n, ["inlineCode", "code_inline"]);
    case "paragraph":
      return d("paragraph");
    case "heading1":
      return d("heading1");
    case "heading2":
      return d("heading2");
    case "heading3":
      return d("heading3");
    case "heading4":
      return d("heading4");
    case "heading5":
      return d("heading5");
    case "heading6":
      return d("heading6");
    case "bulletList":
      return d("bulletList");
    case "orderedList":
      return d("orderedList");
    case "taskList":
      return d("taskList");
    case "blockquote":
      return d("blockquote");
    case "codeBlock":
      return d("codeBlock");
    case "hr":
      return a(), HC(n);
    case "table":
      return a(), Wl(n);
    case "callout":
    case "toggle":
    case "csvTable":
    case "database":
    case "video":
    case "audio":
    case "bookmark":
    case "embed":
      return a(), di(n, e);
    case "image":
      return a(), ei({ portalContainer: o, view: n, messages: r, imageUpload: i }), !0;
    case "inlineMath":
      return a(), Ul(n);
    case "mathBlock":
      return a(), Vl(n);
    case "emoji":
      return a(), bi({ portalContainer: o, view: n, messages: r, anchorRect: l, anchorEl: c }), !0;
    case "clearFormat":
      return FC(n);
    case "search":
      return a(), s(), !0;
    default:
      return !1;
  }
}, jC = {
  strong: ["strong"],
  em: ["em", "emphasis"],
  strike: ["strike_through", "strikeThrough"],
  inlineCode: ["inlineCode", "code_inline"],
  link: ["link"]
}, KC = {
  blockTransform: "paragraph",
  heading1: "heading1",
  heading2: "heading2",
  heading3: "heading3",
  heading4: "heading4",
  heading5: "heading5",
  heading6: "heading6",
  bulletList: "bulletList",
  orderedList: "orderedList",
  taskList: "taskList",
  blockquote: "blockquote",
  codeBlock: "codeBlock"
}, WC = (e, t) => {
  const n = jC[t];
  if (n) {
    const r = rt(e, n);
    return r ? yi(e.state, r) : !1;
  }
  const o = KC[t];
  return o ? Ko(e).has(o) : !1;
}, UC = "zt-md-toolbar", Aa = 16, Ia = 2, _c = {
  blockMenu: "plus",
  undo: "undo",
  redo: "redo",
  blockTransform: "paragraph",
  paragraph: "paragraph",
  heading1: "heading1",
  heading2: "heading2",
  heading3: "heading3",
  heading4: "heading4",
  heading5: "heading5",
  heading6: "heading6",
  strong: "bold",
  em: "italic",
  strike: "strikethrough",
  underline: "underline",
  subscript: "subscript",
  superscript: "superscript",
  inlineCode: "inlineCode",
  link: "link",
  bulletList: "list",
  orderedList: "orderedList",
  taskList: "taskList",
  blockquote: "quote",
  callout: "quote",
  toggle: "chevronDown",
  codeBlock: "codeBlock",
  hr: "hr",
  table: "table",
  csvTable: "table",
  database: "database",
  image: "image",
  video: "video",
  audio: "audio",
  bookmark: "bookmark",
  embed: "codeBlock",
  inlineMath: "sigma",
  mathBlock: "math",
  emoji: "smile",
  clearFormat: "clearFormat",
  search: "search",
  ai: "ai",
  outline: "toc",
  layoutMode: "layoutTemplate",
  sourceMode: "sourceCode",
  translate: "translate"
}, fr = {
  blockMenu: "insert-menu",
  undo: "history",
  redo: "history",
  blockTransform: "block-type",
  paragraph: "block-type",
  heading1: "block-type",
  heading2: "block-type",
  heading3: "block-type",
  heading4: "block-type",
  heading5: "block-type",
  heading6: "block-type",
  strong: "text-style",
  em: "text-style",
  strike: "text-style",
  underline: "text-style",
  subscript: "text-style",
  superscript: "text-style",
  inlineCode: "text-style",
  link: "text-style",
  bulletList: "list",
  orderedList: "list",
  taskList: "list",
  blockquote: "block",
  callout: "block",
  toggle: "block",
  codeBlock: "block",
  hr: "block",
  table: "embed",
  csvTable: "embed",
  database: "embed",
  image: "embed",
  video: "embed",
  audio: "embed",
  bookmark: "embed",
  embed: "embed",
  inlineMath: "embed",
  mathBlock: "embed",
  emoji: "embed",
  clearFormat: "tools",
  search: "tools",
  ai: "tools",
  outline: "display",
  layoutMode: "display",
  sourceMode: "display",
  translate: "translate"
}, Oc = (e) => ({
  blockMenu: e.toolbarBlockMenuTitle,
  undo: e.toolbarUndoTitle,
  redo: e.toolbarRedoTitle,
  blockTransform: e.toolbarBlockTransformParagraphLabel,
  paragraph: e.toolbarBlockTransformParagraphLabel,
  heading1: e.selectionTooltipTransformHeading1Label,
  heading2: e.selectionTooltipTransformHeading2Label,
  heading3: e.selectionTooltipTransformHeading3Label,
  heading4: e.selectionTooltipTransformHeading4Label,
  heading5: e.selectionTooltipTransformHeading5Label,
  heading6: e.selectionTooltipTransformHeading6Label,
  strong: e.selectionTooltipStrongTitle,
  em: e.selectionTooltipEmTitle,
  strike: e.selectionTooltipStrikeTitle,
  underline: e.toolbarUnderlineTitle,
  subscript: e.toolbarSubscriptTitle,
  superscript: e.toolbarSuperscriptTitle,
  inlineCode: e.selectionTooltipInlineCodeTitle,
  link: e.selectionTooltipLinkTitle,
  bulletList: e.toolbarBulletListTitle,
  orderedList: e.toolbarOrderedListTitle,
  taskList: e.toolbarTaskListTitle,
  blockquote: e.toolbarBlockquoteTitle,
  codeBlock: e.toolbarCodeBlockTitle,
  hr: e.toolbarHrTitle,
  table: e.toolbarTableTitle,
  callout: e.toolbarCalloutTitle,
  toggle: e.toolbarToggleTitle,
  csvTable: e.toolbarCsvTableTitle,
  database: e.toolbarDatabaseTitle,
  image: e.toolbarImageTitle,
  video: e.toolbarVideoTitle,
  audio: e.toolbarAudioTitle,
  bookmark: e.toolbarBookmarkTitle,
  embed: e.toolbarEmbedTitle,
  inlineMath: e.toolbarInlineMathTitle,
  mathBlock: e.toolbarMathBlockTitle,
  emoji: e.toolbarEmojiTitle,
  clearFormat: e.toolbarClearFormatTitle,
  search: e.toolbarSearchTitle,
  ai: e.toolbarAiTitle,
  outline: e.toolbarOutlineTitle,
  layoutMode: e.toolbarLayoutModeTitle,
  sourceMode: e.toolbarSourceModeTitle,
  translate: e.toolbarTranslateTitle
}), VC = [
  "undo",
  "redo",
  "blockTransform",
  "strong",
  "em",
  "strike",
  "underline",
  "subscript",
  "superscript",
  "inlineCode",
  "link",
  "bulletList",
  "orderedList",
  "taskList",
  "blockquote",
  "callout",
  "toggle",
  "codeBlock",
  "hr",
  "table",
  "csvTable",
  "database",
  "image",
  "video",
  "audio",
  "bookmark",
  "embed",
  "inlineMath",
  "mathBlock",
  "emoji",
  "clearFormat",
  "search",
  // AI 助手固定在大纲左侧:同为全文级面板开关。
  "ai",
  // 大纲面板固定在布局模式左侧:同为全文级显示开关,与编辑类命令以分隔线隔开。
  "outline",
  // 布局模式固定在源码左侧:同为全文级模式开关,与编辑类命令以分隔线隔开。
  "layoutMode",
  // 源码模式固定在翻译左侧:整篇源码编辑是全文级模式开关,与编辑类命令以分隔线隔开。
  "sourceMode",
  // 翻译固定最右:整篇翻译是全文级操作,与编辑类命令以分隔线隔开。
  "translate"
], qC = [
  "blockTransform",
  "strong",
  "em",
  "strike",
  "underline",
  "inlineCode",
  "bulletList",
  "orderedList",
  "taskList",
  "link",
  "translate"
], Hc = [
  // 第一段:长尾数据/内嵌/媒体能力(完整模式才有,日常编辑少用)。
  "database",
  "csvTable",
  "embed",
  "bookmark",
  "audio",
  "video",
  "emoji",
  "mathBlock",
  "inlineMath",
  "callout",
  "toggle",
  "hr",
  "clearFormat",
  "ai",
  "outline",
  "layoutMode",
  "sourceMode",
  "codeBlock",
  "search",
  "table",
  "blockquote",
  "image",
  // 第二段:高频但有快捷键/斜杠输入兜底,简洁模式不含。
  "redo",
  "undo",
  // 第三段:简洁模式集的让位顺序(极窄时逐个退化;bulletList 最后)。
  "strike",
  "superscript",
  "subscript",
  "underline",
  "inlineCode",
  "taskList",
  "translate",
  "orderedList",
  "bulletList",
  // 第四段:仅宿主显式配置才出现的项(高阶标题先让位)。
  "heading6",
  "heading5",
  "heading4",
  "heading3",
  "blockMenu",
  "heading1",
  "heading2",
  "paragraph"
], GC = /* @__PURE__ */ new Set([
  "blockTransform",
  "strong",
  "em",
  "link"
]), XC = new Map(
  Hc.map((e, t) => [e, t])
), YC = (e) => GC.has(e) ? Number.POSITIVE_INFINITY : XC.get(e) ?? Hc.length, ZC = (e, t) => {
  const n = Oc(t);
  return e.map((o) => ({
    command: o,
    icon: _c[o],
    title: n[o]
  }));
}, JC = (e, t, n, o) => {
  const r = e && e.length > 0 ? e : ZC(t === "simple" ? qC : VC, n);
  return !o || o.size === 0 ? r : r.filter((i) => !o.has(i.command));
}, kn = "zt-md-toolbar", An = `${kn}-divider`, Ra = `${kn}-button`, gr = `${kn}-block-trigger`, at = `${kn}-dropdown`, Na = `${kn}-collapsed`, QC = (e) => {
  const { messages: t, shortcutMode: n, items: o } = e, r = Oc(t), i = document.createElement("div");
  i.className = kn;
  const s = document.createElement("span");
  s.className = `${gr}-label`;
  const a = document.createElement("div");
  a.className = at, a.style.display = "none";
  let l = null, c = null, d = -1;
  const u = [];
  let h = { active: !1, loading: !1 }, p = null;
  const g = r.translate;
  let y = !1;
  const f = r.layoutMode;
  let w = !1;
  const b = r.sourceMode;
  let k = !1;
  const v = r.outline;
  let E = !1;
  const M = r.ai, x = () => i.querySelector('button[data-command="translate"]'), T = () => {
    const j = h.active || h.loading;
    i.querySelectorAll("button[data-command]").forEach((F) => {
      if (F.dataset.command === "translate") {
        F.disabled = h.loading;
        return;
      }
      F.disabled = j;
    });
  }, L = (j) => {
    h = { active: j.active, loading: j.loading }, ee(), T();
    const F = x();
    if (F) {
      if (F.dataset.active = j.active ? "true" : "false", F.dataset.loading = j.loading ? "true" : "false", F.setAttribute("aria-pressed", j.active ? "true" : "false"), p !== null && (clearTimeout(p), p = null), j.failed) {
        F.title = t.toolbarTranslateFailedTitle, F.setAttribute("aria-label", F.title), p = setTimeout(() => {
          p = null, F.title = h.active ? t.toolbarTranslateExitTitle : g, F.setAttribute("aria-label", F.title);
        }, 2600);
        return;
      }
      F.title = j.active ? t.toolbarTranslateExitTitle : g, F.setAttribute("aria-label", F.title);
    }
  }, S = () => i.querySelector('button[data-command="layoutMode"]'), I = (j) => {
    y = j.active;
    const F = S();
    F && (F.dataset.active = j.active ? "true" : "false", F.setAttribute("aria-pressed", j.active ? "true" : "false"), F.title = j.active ? t.toolbarLayoutModeExitTitle : f, F.setAttribute("aria-label", F.title));
  }, O = () => i.querySelector('button[data-command="sourceMode"]'), J = () => {
    i.querySelectorAll("button[data-command]").forEach((j) => {
      j.dataset.command !== "sourceMode" && (j.disabled = w);
    });
  }, V = (j) => {
    w = j.active, ee(), J();
    const F = O();
    F && (F.dataset.active = j.active ? "true" : "false", F.setAttribute("aria-pressed", j.active ? "true" : "false"), F.title = j.active ? t.toolbarSourceModeExitTitle : b, F.setAttribute("aria-label", F.title));
  }, K = () => i.querySelector('button[data-command="outline"]'), z = (j) => {
    k = j.active;
    const F = K();
    F && (F.dataset.active = j.active ? "true" : "false", F.setAttribute("aria-pressed", j.active ? "true" : "false"), F.title = j.active ? t.toolbarOutlineExitTitle : v, F.setAttribute("aria-label", F.title));
  }, H = () => i.querySelector('button[data-command="ai"]'), D = (j) => {
    E = j.active;
    const F = H();
    F && (F.dataset.active = j.active ? "true" : "false", F.setAttribute("aria-pressed", j.active ? "true" : "false"), F.title = j.active ? t.toolbarAiExitTitle : M, F.setAttribute("aria-label", F.title));
  }, N = () => {
    u.forEach((j, F) => {
      const A = F === d;
      j.setAttribute("aria-selected", A ? "true" : "false"), j.dataset.keyboardActive = A ? "true" : "false";
    });
  }, ee = () => {
    l !== null && (l = null, d = -1, a.style.display = "none", c == null || c.setAttribute("aria-expanded", "false"));
  }, re = (j) => {
    const F = document.createElement("button");
    F.type = "button", F.className = Ra, F.dataset.command = j.command, F.title = j.title ?? r[j.command], F.setAttribute("aria-label", F.title), F.appendChild(
      Ie(j.icon ?? _c[j.command], {
        size: Aa,
        strokeWidth: Ia,
        className: `${Ra}-icon`
      })
    ), F.addEventListener("mousedown", (A) => {
      A.preventDefault();
    }), F.addEventListener("click", (A) => {
      A.preventDefault(), e.onCommand(j.command, F);
    }), i.appendChild(F);
  };
  let B = null;
  o.forEach((j) => {
    if (j.command === "blockTransform") {
      if (B !== null && B !== fr.blockTransform) {
        const P = document.createElement("span");
        P.className = An, i.appendChild(P);
      }
      B = fr.blockTransform;
      const A = document.createElement("button");
      A.type = "button", A.className = gr, A.dataset.command = "blockTransform", A.setAttribute("aria-expanded", "false"), A.title = t.selectionTooltipTransformLabel, A.appendChild(s), A.appendChild(
        Ie("chevronDown", {
          size: 12,
          strokeWidth: 2,
          className: `${gr}-chevron`
        })
      ), A.addEventListener("mousedown", (P) => {
        P.preventDefault();
      }), A.addEventListener("click", (P) => {
        if (P.preventDefault(), l === "blockTransform") {
          ee(), A.focus();
          return;
        }
        l = "blockTransform", a.style.display = "block";
        const $ = Math.min(
          A.offsetLeft,
          Math.max(8, i.clientWidth - a.offsetWidth - 8)
        );
        a.style.left = `${$}px`, A.setAttribute("aria-expanded", "true"), d = 0, N(), A.focus();
      }), A.addEventListener("keydown", (P) => {
        if (l === "blockTransform") {
          if (P.key === "ArrowDown" || P.key === "ArrowUp") {
            if (P.preventDefault(), u.length === 0)
              return;
            d = P.key === "ArrowDown" ? (d + 1) % u.length : (d - 1 + u.length) % u.length, N();
            return;
          }
          if (P.key === "Enter") {
            P.preventDefault();
            const $ = u[d];
            if (!$)
              return;
            e.onCommand($.dataset.command), ee(), A.focus();
            return;
          }
          P.key === "Escape" && (P.preventDefault(), ee(), A.focus());
        }
      }), i.appendChild(A), i.appendChild(a), c = A;
      return;
    }
    const F = fr[j.command];
    if (B !== null && F !== void 0 && F !== B) {
      const A = document.createElement("span");
      A.className = An, i.appendChild(A);
    }
    B = F ?? B, re(j);
  });
  const te = uc(t, n);
  a.setAttribute("role", "listbox"), te.forEach((j) => {
    const F = document.createElement("button");
    F.type = "button", F.className = `${at}-item`, F.dataset.command = j.command, F.setAttribute("role", "option"), F.setAttribute("aria-selected", "false"), F.appendChild(
      Ie(j.icon, {
        size: Aa,
        strokeWidth: Ia,
        className: `${at}-item-icon`
      })
    );
    const A = document.createElement("span");
    A.className = `${at}-item-label`, A.textContent = j.label, F.appendChild(A);
    const P = document.createElement("kbd");
    P.className = `${at}-item-shortcut`, P.textContent = j.shortcut, F.appendChild(P), F.addEventListener("mousedown", ($) => {
      $.preventDefault();
    }), F.addEventListener("click", ($) => {
      $.preventDefault(), e.onCommand(j.command), ee();
    }), a.appendChild(F), u.push(F);
  });
  const G = (j) => {
    if (l === null)
      return;
    const F = j.target;
    i.contains(F) || ee();
  };
  document.addEventListener("mousedown", G, !0);
  const fe = (j, F) => {
    j.classList.toggle(Na, F);
  }, Ce = (j) => j.classList.contains(Na), W = (j) => {
    var F;
    return j.dataset.command ?? ((F = j.querySelector("[data-command]")) == null ? void 0 : F.dataset.command) ?? "";
  }, U = () => {
    const j = [], F = [];
    return Array.from(i.children).forEach((A) => {
      if (!(!(A instanceof HTMLElement) || A.classList.contains(at))) {
        if (A.classList.contains(An)) {
          F.push(A);
          return;
        }
        j.push(A);
      }
    }), { content: j, dividers: F };
  }, X = () => {
    let j = Number.POSITIVE_INFINITY, F = Number.NEGATIVE_INFINITY, A = 0;
    for (const P of Array.from(i.children)) {
      if (!(P instanceof HTMLElement) || P.classList.contains(at) || Ce(P))
        continue;
      const $ = P.offsetTop + P.offsetHeight / 2;
      j = Math.min(j, $), F = Math.max(F, $), A += 1;
    }
    return A > 0 && F - j > 1;
  }, se = () => {
    const j = Array.from(i.children).filter(
      ($) => $ instanceof HTMLElement && !$.classList.contains(at)
    ), F = new Array(j.length).fill(!1);
    let A = !1;
    for (let $ = j.length - 1; $ >= 0; $ -= 1) {
      const Y = j[$];
      F[$] = A, Y && !Y.classList.contains(An) && !Ce(Y) && (A = !0);
    }
    let P = !1;
    for (let $ = 0; $ < j.length; $ += 1) {
      const Y = j[$];
      if (Y) {
        if (Y.classList.contains(An)) {
          fe(Y, !(P && F[$])), P = !1;
          continue;
        }
        Ce(Y) || (P = !0);
      }
    }
  }, ae = (j) => {
    let F = null, A = Number.POSITIVE_INFINITY;
    for (const P of j) {
      if (Ce(P))
        continue;
      const $ = YC(W(P));
      $ < A && (A = $, F = P);
    }
    return F;
  }, ne = () => {
    const { content: j, dividers: F } = U();
    for ([...j, ...F].forEach((A) => fe(A, !1)); X(); ) {
      const A = ae(j);
      if (!A)
        break;
      fe(A, !0), se();
    }
    se();
  };
  let le = -1;
  const me = () => {
    const j = i.clientWidth;
    j !== le && (le = j, ne());
  }, Pe = new ResizeObserver(() => me());
  Pe.observe(i);
  const Te = () => me();
  return window.addEventListener("resize", Te), queueMicrotask(me), {
    root: i,
    /**
     * 刷新按钮激活态与块转换触发钮文案。
     */
    refresh: (j) => {
      const F = Ko(j), A = _l(j), P = te.find(($) => $.command === A);
      s.textContent = (P == null ? void 0 : P.label) ?? t.toolbarBlockTransformParagraphLabel, i.querySelectorAll("button[data-command]").forEach(($) => {
        const Y = $.dataset.command;
        if (Y !== "blockTransform") {
          if (Y === "translate") {
            $.dataset.active = h.active ? "true" : "false";
            return;
          }
          if (Y === "layoutMode") {
            $.dataset.active = y ? "true" : "false";
            return;
          }
          if (Y === "sourceMode") {
            $.dataset.active = w ? "true" : "false";
            return;
          }
          if (Y === "outline") {
            $.dataset.active = k ? "true" : "false";
            return;
          }
          if (Y === "ai") {
            $.dataset.active = E ? "true" : "false";
            return;
          }
          $.dataset.active = WC(j, Y) ? "true" : "false";
        }
      }), a.querySelectorAll(`.${at}-item`).forEach(($) => {
        const Y = $.dataset.command;
        $.dataset.active = F.has(Y) ? "true" : "false";
      });
    },
    /**
     * 刷新撤销/重做按钮禁用态。
     */
    refreshHistory: (j, F) => {
      i.querySelectorAll('button[data-command="undo"], button[data-command="redo"]').forEach((A) => {
        const P = A.dataset.command, $ = h.active || h.loading || w ? !1 : P === "undo" ? j : F;
        A.disabled = !$;
      });
    },
    closeDropdown: ee,
    setTranslateMode: L,
    setLayoutMode: I,
    setSourceMode: V,
    setOutlineMode: z,
    setAiMode: D,
    /**
     * 销毁视图。
     */
    destroy: () => {
      p !== null && (clearTimeout(p), p = null), Pe.disconnect(), window.removeEventListener("resize", Te), document.removeEventListener("mousedown", G, !0), i.remove();
    }
  };
}, eE = (e) => {
  const t = JC(
    e.items,
    e.mode,
    e.messages,
    e.exclude ? new Set(e.exclude) : void 0
  );
  return ue(() => {
    let n = null;
    return new ye({
      key: new ke(UC),
      view: (o) => {
        var d, u, h, p, g;
        let r = !1;
        const i = QC({
          messages: e.messages,
          shortcutMode: e.shortcutMode,
          items: t,
          onCommand: a
        });
        i.root.dataset.align = e.align ?? "left";
        const s = (y) => {
          r !== y && (r = y, y ? l.openPanel() : l.closePanel(), l.refresh());
        };
        function a(y, f) {
          var w, b, k, v, E;
          if (y === "translate") {
            (w = e.onToggleTranslate) == null || w.call(e);
            return;
          }
          if (y === "layoutMode") {
            (b = e.onToggleLayoutMode) == null || b.call(e);
            return;
          }
          if (y === "sourceMode") {
            (k = e.onToggleSourceMode) == null || k.call(e);
            return;
          }
          if (y === "outline") {
            (v = e.onToggleOutline) == null || v.call(e);
            return;
          }
          if (y === "ai") {
            (E = e.onToggleAi) == null || E.call(e);
            return;
          }
          n && ($C(y, {
            view: n,
            portalContainer: e.portalContainer,
            messages: e.messages,
            imageUpload: e.imageUpload,
            onOpenSearch: e.onOpenSearch,
            closeDropdown: i.closeDropdown,
            // 触发按钮矩形(emoji 面板等锚定浮层使用;无按钮时缺省锚定光标)。
            anchorRect: (f == null ? void 0 : f.getBoundingClientRect()) ?? null,
            // 触发按钮元素(emoji 面板 resize 实时重锚用)。
            anchorEl: f
          }), i.refresh(n), i.refreshHistory(
            an(n.state, "undo"),
            an(n.state, "redo")
          ));
        }
        const l = hc({
          getCurrentView: () => n,
          portalContainer: e.portalContainer,
          collisionBoundary: e.portalContainer.closest(
            e.scrollContainerSelector ?? Fo
          ),
          iconSize: 16,
          iconStrokeWidth: 2,
          onOpenChange: s,
          messages: e.messages,
          isOpen: () => r
        });
        l.host.classList.add("zt-md-toolbar-link-host");
        const c = i.root.querySelector('button[data-command="link"]');
        return c && c.replaceWith(l.host), (e.visible === !1 || e.readOnly) && (i.root.style.display = "none"), e.toolbarHost.appendChild(i.root), n = o, (d = e.onTranslateApiReady) == null || d.call(e, { setMode: i.setTranslateMode }), (u = e.onLayoutModeApiReady) == null || u.call(e, { setMode: i.setLayoutMode }), (h = e.onSourceModeApiReady) == null || h.call(e, { setMode: i.setSourceMode }), (p = e.onOutlineApiReady) == null || p.call(e, { setMode: i.setOutlineMode }), (g = e.onAiApiReady) == null || g.call(e, { setMode: i.setAiMode }), i.refresh(o), i.refreshHistory(
          an(o.state, "undo"),
          an(o.state, "redo")
        ), {
          update: (y) => {
            n = y, !(e.visible === !1 || e.readOnly) && (y.state.selection.empty && r && s(!1), i.refresh(y), i.refreshHistory(
              an(y.state, "undo"),
              an(y.state, "redo")
            ));
          },
          destroy: () => {
            var y, f, w, b, k;
            n = null, (y = e.onTranslateApiReady) == null || y.call(e, null), (f = e.onLayoutModeApiReady) == null || f.call(e, null), (w = e.onSourceModeApiReady) == null || w.call(e, null), (b = e.onOutlineApiReady) == null || b.call(e, null), (k = e.onAiApiReady) == null || k.call(e, null), l.destroy(), i.destroy();
          }
        };
      }
    });
  });
}, yt = new ke("zt-md-block-multi-select"), br = { anchor: null, head: null }, Oo = (e, t) => {
  try {
    const n = e.doc.resolve(t);
    if (n.depth < 1)
      return null;
    const o = n.before(1), r = n.after(1);
    return { from: o, to: r };
  } catch {
    return null;
  }
}, vi = (e) => {
  const t = yt.getState(e.state);
  if (!t || t.anchor === null || t.head === null)
    return null;
  const n = Oo(e.state, t.anchor), o = Oo(e.state, t.head);
  return !n || !o ? null : {
    from: Math.min(n.from, o.from),
    to: Math.max(n.to, o.to)
  };
}, Ci = (e) => vi(e) !== null, tE = (e, t, n) => {
  const o = { type: "set", anchor: t, head: n };
  e.dispatch(e.state.tr.setMeta(yt, o));
}, Fc = (e) => {
  if (!Ci(e))
    return;
  const t = { type: "clear" };
  e.dispatch(e.state.tr.setMeta(yt, t));
}, nE = () => new ye({
  key: yt,
  state: {
    init: () => br,
    apply: (e, t) => {
      const n = e.getMeta(yt);
      return (n == null ? void 0 : n.type) === "set" && typeof n.anchor == "number" && typeof n.head == "number" ? { anchor: n.anchor, head: n.head } : (n == null ? void 0 : n.type) === "clear" || e.docChanged || e.selectionSet ? br : t;
    }
  },
  props: {
    // 区间内全部顶层块加选中类。
    decorations: (e) => {
      const t = yt.getState(e);
      if (!t || t.anchor === null || t.head === null)
        return Le.empty;
      const n = Oo(e, t.anchor), o = Oo(e, t.head);
      if (!n || !o)
        return Le.empty;
      const r = Math.min(n.from, o.from), i = Math.max(n.to, o.to);
      return Le.create(e.doc, [jt.node(r, i, { class: "zt-md-block-selected" })]);
    },
    // 批删 + Esc 清除。
    handleKeyDown: (e, t) => {
      if (t.key === "Escape" && Ci(e))
        return Fc(e), !1;
      if (t.key !== "Backspace" && t.key !== "Delete")
        return !1;
      const n = vi(e);
      if (!n)
        return !1;
      t.preventDefault();
      const o = e.state.tr.delete(n.from, n.to).setMeta(yt, { type: "clear" });
      return o.setSelection(de.near(o.doc.resolve(n.from), 1)), e.dispatch(o.scrollIntoView()), e.focus(), !0;
    }
  }
}), Nt = "zt-md-block-handle", oE = /* @__PURE__ */ new Set([
  "heading",
  "code_block",
  "math_block",
  "horizontal_rule"
]), rE = (e) => {
  var o;
  const t = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
  let n;
  for (; n = t.nextNode(); ) {
    if (!((o = n.textContent) != null && o.trim())) continue;
    const r = document.createRange();
    r.setStart(n, 0), r.setEnd(n, Math.min(1, n.length));
    const i = r.getBoundingClientRect();
    if (i.height > 0) return i;
  }
  return null;
}, iE = (e) => {
  const t = document.createElement("div");
  t.className = Nt, t.dataset.show = "false";
  const n = document.createElement("button");
  n.type = "button", n.className = `${Nt}-plus`, n.appendChild(
    Ie("plus", {
      size: 18,
      strokeWidth: 2.5,
      className: `${Nt}-icon`
    })
  ), e != null && e.blockHandleInsertLabel && (n.title = e.blockHandleInsertLabel, n.setAttribute("aria-label", e.blockHandleInsertLabel));
  const o = document.createElement("span");
  return o.className = `${Nt}-grip`, o.appendChild(
    Ie("drag", {
      size: 18,
      strokeWidth: 1.8,
      className: `${Nt}-icon`
    })
  ), o.setAttribute("role", "button"), o.tabIndex = 0, e != null && e.blockHandleDragLabel && (o.setAttribute("aria-label", e.blockHandleDragLabel), o.title = e.blockHandleDragLabel), t.appendChild(n), t.appendChild(o), n.addEventListener("dragstart", (r) => {
    r.preventDefault(), r.stopPropagation();
  }), t;
}, sE = (e, t, n) => {
  const o = e.domAtPos(t), r = o.node;
  if (!(r instanceof HTMLElement))
    return null;
  let i = 0;
  if (e.state.doc.nodesBetween(t, n, (l) => l.isBlock ? (i += 1, !1) : !0), i === 0)
    return null;
  const s = document.createElement("div");
  s.className = "zt-md-multi-drag-image";
  let a = o.offset;
  for (; i > 0 && a < r.childNodes.length; ) {
    const l = r.childNodes[a];
    l instanceof HTMLElement && (s.appendChild(l.cloneNode(!0)), i -= 1), a += 1;
  }
  return document.body.appendChild(s), s;
}, aE = (e) => {
  const t = iE(e.messages), n = t.querySelector(
    `.${Nt}-plus`
  ), o = t.querySelector(
    `.${Nt}-grip`
  ), r = ue((s) => {
    let a = null, l = null;
    const c = qn(() => {
      const h = a == null ? void 0 : a.active;
      h && (a == null || a.show(h));
    });
    n == null || n.addEventListener("click", (h) => {
      if (h.preventDefault(), h.stopPropagation(), !a || !l)
        return;
      const p = a.active;
      p && cc(l, p.$pos.pos);
    }), o == null || o.addEventListener("click", (h) => {
      h.shiftKey || !l || Fc(l);
    });
    const d = (h) => {
      if (!h.shiftKey || !a || !l)
        return;
      const p = h.target;
      if (!(p instanceof Node) || !(o != null && o.contains(p)))
        return;
      const g = a.active;
      if (!g)
        return;
      h.preventDefault(), h.stopPropagation();
      const y = yt.getState(l.state), f = (y == null ? void 0 : y.anchor) ?? g.$pos.pos;
      tE(l, f, g.$pos.pos), l.focus();
    }, u = (h) => {
      const p = h;
      if (!l || !Ci(l))
        return;
      const g = vi(l);
      if (!g)
        return;
      p.stopPropagation();
      const y = l.state.doc.slice(g.from, g.to);
      if (p.dataTransfer) {
        p.dataTransfer.effectAllowed = "copyMove";
        const { dom: f, text: w } = l.serializeForClipboard(y);
        p.dataTransfer.clearData(), p.dataTransfer.setData("text/html", f.innerHTML), p.dataTransfer.setData("text/plain", w);
        const b = sE(l, g.from, g.to);
        b && (p.dataTransfer.setDragImage(b, 0, 0), window.setTimeout(() => b.remove(), 0));
      }
      l.dragging = { slice: y, move: !0 };
    };
    return e.portalContainer.addEventListener("mousedown", d, !0), e.portalContainer.addEventListener("dragstart", u, !0), new ye({
      key: new ke("zt-md-block-handle"),
      view: (h) => (l = h, a = new lu({
        ctx: s,
        content: t,
        root: e.portalContainer,
        // 手柄悬在块左侧外;mainAxis 为水平收进量(正值更靠左),
        // 与编辑区左 padding(3.25rem)配合决定手柄列位置。
        getPlacement: () => "left",
        getOffset: () => ({ mainAxis: 2, crossAxis: 0 }),
        // 两轴解耦,各一条规则(勿按块型添加水平分支):
        // - 水平:所有块统一锚定编辑器内容左缘 —— 手柄永远在同一列手柄槽,
        //   引用/表格/代码块等内部缩进不影响水平位置;
        // - 垂直:整体型块(标题/代码块/公式块/分割线)居中于整块;
        //   文本类块(段落/引用/列表项)居中于首行墨迹(与列表点同一中心);
        //   无文本块(空段落/纯图片段落)回退整块矩形。
        getPosition: ({ active: p, editorDom: g }) => {
          const y = oE.has(p.node.type.name), f = p.el.closest("li"), w = g.getBoundingClientRect().left, b = y && !f ? p.el.getBoundingClientRect() : rE(p.el) ?? (f ?? p.el).getBoundingClientRect();
          return {
            x: w,
            y: b.top,
            width: 1,
            height: b.height,
            top: b.top,
            left: w,
            bottom: b.bottom,
            right: w
          };
        },
        floatingUIOptions: { strategy: "fixed" }
      }), a.update(), c.bindGlobal(), c.bindElement(
        $n(h.dom, e.scrollContainerSelector)
      ), {
        update: () => {
          a == null || a.update();
        },
        destroy: () => {
          c.destroy(), e.portalContainer.removeEventListener("mousedown", d, !0), e.portalContainer.removeEventListener("dragstart", u, !0), a == null || a.destroy(), a = null, l = null;
        }
      })
    });
  }), i = ue(() => nE());
  return [cu, i, r];
}, Go = (e) => ({
  highlight: (e == null ? void 0 : e.highlight) ?? !0,
  superscript: (e == null ? void 0 : e.superscript) ?? !0,
  subscript: (e == null ? void 0 : e.subscript) ?? !0
}), wn = "meditorInlineTag", lE = "underline", cE = "subscript", dE = "superscript", uE = /^<(u|sub|sup)>$/i, hE = /^<\/(u|sub|sup)>$/i, mE = /==([^=\s][^=]*?[^=\s]|[^=\s])==/g, pE = /\^([^\^\s][^^]*?[^\^\s]|[^\^\s])\^/g, fE = (e, t) => {
  var s;
  const n = [], o = [], r = (a) => a === "u" || (a === "sub" ? t.subscript : t.superscript), i = (a) => {
    const l = o[o.length - 1];
    l ? l.collected.push(a) : n.push(a);
  };
  for (const a of e) {
    if (a.type === "html" && typeof a.value == "string") {
      const l = a.value.trim(), c = uE.exec(l);
      if (c) {
        const d = (s = c[1]) == null ? void 0 : s.toLowerCase();
        if (d === "u" || d === "sub" || d === "sup") {
          r(d) && o.push({ tag: d, collected: [] });
          continue;
        }
      }
      if (hE.test(l) && o.length > 0) {
        const d = o.pop();
        d && d.collected.length > 0 && i({
          type: wn,
          data: { tag: d.tag },
          children: d.collected
        });
        continue;
      }
    }
    i(a);
  }
  for (; o.length > 0; ) {
    const a = o.pop();
    a && n.push(...a.collected);
  }
  return n;
}, gE = (e, t) => {
  const n = e.value;
  if (typeof n != "string")
    return null;
  const o = [];
  if (t.highlight)
    for (const s of n.matchAll(mE)) {
      const a = s.index ?? -1;
      a >= 0 && s[1] !== void 0 && o.push({ start: a, end: a + s[0].length, content: s[1], tag: "highlight" });
    }
  if (t.superscript)
    for (const s of n.matchAll(pE)) {
      const a = s.index ?? -1;
      a >= 0 && s[1] !== void 0 && o.push({ start: a, end: a + s[0].length, content: s[1], tag: "sup" });
    }
  if (o.length === 0)
    return null;
  o.sort((s, a) => s.start - a.start || a.end - s.end);
  const r = [];
  let i = 0;
  for (const s of o)
    s.start < i || (s.start > i && r.push({ type: "text", value: n.slice(i, s.start) }), r.push(
      s.tag === "highlight" ? {
        type: "meditorSpan",
        data: { kind: "highlight", color: ti },
        children: [{ type: "text", value: s.content }]
      } : {
        type: wn,
        data: { tag: s.tag },
        children: [{ type: "text", value: s.content }]
      }
    ), i = s.end);
  return i < n.length && r.push({ type: "text", value: n.slice(i) }), r;
}, $c = (e, t = Go()) => {
  for (const o of e)
    Array.isArray(o.children) && (o.children = $c(o.children, t));
  const n = [];
  for (const o of e) {
    const r = o.type === "text" ? gE(o, t) : null;
    r ? n.push(...r) : n.push(o);
  }
  return fE(n, t);
}, jc = (e) => function() {
  const n = this.data();
  return (n.toMarkdownExtensions ?? (n.toMarkdownExtensions = [])).push({
    handlers: {
      [wn]: bE
    }
  }), (r) => {
    Array.isArray(r.children) && (r.children = $c(r.children, e));
  };
};
jc(Go());
const bE = (e, t, n, o) => {
  const r = e.data ?? {}, i = r.tag === "sub" || r.tag === "sup" ? r.tag : "u", s = n.enter(wn), a = n.containerPhrasing(e, { before: "<", after: ">" });
  return s(), `<${i}>${a}</${i}>`;
}, Kc = (e) => We("remarkInlineExt", () => jc(e));
Kc(Go());
const yE = (e) => {
  if (e.type !== wn)
    return !1;
  const t = e.data ?? {};
  return t.tag === "sub" || t.tag === "sup" ? t.tag : t.tag === "u" ? "u" : !1;
}, Ei = (e, t) => Ka(e, () => ({
  parseDOM: [
    {
      tag: t,
      getAttrs: () => ({}),
      // 下标/上标浏览器默认渲染即正确;下划线沿用 <u> 语义样式。
      preserveWhitespace: !1
    }
  ],
  toDOM: () => [t, 0],
  parseMarkdown: {
    match: (n) => yE(n) === t,
    runner: (n, o, r) => {
      n.openMark(r), n.next(o.children ?? []), n.closeMark(r);
    }
  },
  toMarkdown: {
    match: (n) => n.type.name === e,
    runner: (n, o) => {
      n.withMark(o, wn, void 0, { data: { tag: t } });
    }
  }
})), kE = Ei(lE, "u"), wE = Ei(cE, "sub"), vE = Ei(dE, "sup"), Wc = (e) => {
  const t = Go(e), n = [
    Kc(t),
    kE
  ];
  return t.subscript && n.push(wE), t.superscript && n.push(vE), n.flat();
};
Wc();
const CE = "highlight", EE = "superscript", zE = "underline", Pa = (e, t) => (n, o, r, i) => {
  const s = n.schema.marks[e];
  if (!s)
    return null;
  const a = String(o[1] ?? "");
  if (!a)
    return null;
  const l = n.tr;
  return l.deleteRange(r, i), l.insertText(a, r), l.addMark(r, r + a.length, s.create(t)), l;
}, Uc = (e) => {
  const t = [];
  return ((e == null ? void 0 : e.highlight) ?? !0) && t.push(
    new pn(
      /==([^=\s][^=]*?[^=\s]|[^=\s])==$/,
      Pa(CE, { color: ti })
    )
  ), ((e == null ? void 0 : e.superscript) ?? !0) && t.push(
    new pn(
      /\^([^\^\s][^^]*?[^\^\s]|[^\^\s])\^$/,
      Pa(EE)
    )
  ), [
    ue(() => Gd({ rules: t })),
    // Mod-U:下划线开关(与工具栏/选区菜单同语义)。
    ue(
      () => du({
        "Mod-u": (n, o) => {
          const r = n.schema.marks[zE];
          if (!r)
            return !1;
          const { from: i, to: s } = n.selection;
          return n.doc.rangeHasMark(i, s, r) ? o == null || o(n.tr.removeMark(i, s, r)) : o == null || o(n.tr.addMark(i, s, r.create())), !0;
        }
      })
    )
  ].flat();
};
Uc();
const Vc = "meditorToc", Nn = "meditor_toc", ME = (e) => {
  var n, o;
  if (e.type !== "paragraph" || !Array.isArray(e.children) || e.children.length !== 1 || ((n = e.children[0]) == null ? void 0 : n.type) !== "text")
    return null;
  const t = (o = e.children[0]) == null ? void 0 : o.value;
  return typeof t != "string" || t.trim() !== "[toc]" ? null : { type: Vc };
}, qc = (e) => {
  const t = e.children;
  if (Array.isArray(t))
    for (let n = 0; n < t.length; n += 1) {
      const o = t[n];
      if (!o)
        continue;
      const r = ME(o);
      if (r) {
        t[n] = r;
        continue;
      }
      qc(o);
    }
}, TE = We("remarkToc", () => () => (t) => {
  qc(t);
}), $r = /* @__PURE__ */ new Set(), xE = (e) => ($r.add(e), () => {
  $r.delete(e);
}), SE = Ke(Nn, () => ({
  group: "block",
  atom: !0,
  defining: !0,
  attrs: {},
  parseDOM: [
    {
      tag: `div[data-type="${Nn}"]`
    }
  ],
  toDOM: () => ["div", { "data-type": Nn, class: "zt-md-toc" }],
  parseMarkdown: {
    match: (e) => e.type === Vc,
    runner: (e, t, n) => {
      e.addNode(n);
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === Nn,
    runner: (e) => {
      e.openNode("paragraph"), e.addNode("html", void 0, "[toc]"), e.closeNode();
    }
  }
}));
class LE {
  constructor(t, n) {
    // 节点根容器。
    m(this, "dom");
    // 编辑器视图。
    m(this, "view");
    // 文案。
    m(this, "messages");
    // 注销刷新注册。
    m(this, "unregister");
    this.view = t, this.messages = n, this.dom = document.createElement("div"), this.dom.className = "zt-md-toc", this.dom.dataset.type = Nn, this.dom.contentEditable = "false";
    const o = () => {
      this.render();
    };
    this.unregister = xE(o), this.render();
  }
  /**
   * 依据当前文档标题清单渲染目录。
   */
  render() {
    this.dom.replaceChildren();
    const t = document.createElement("div");
    t.className = "zt-md-toc-title", t.textContent = this.messages.tocTitle, this.dom.appendChild(t);
    const n = jn(this.view.state.doc);
    if (n.length === 0) {
      const r = document.createElement("div");
      r.className = "zt-md-toc-empty", r.textContent = this.messages.tocEmpty, this.dom.appendChild(r);
      return;
    }
    const o = document.createElement("ul");
    o.className = "zt-md-toc-list";
    for (const r of n) {
      const i = document.createElement("li");
      i.className = "zt-md-toc-item", i.style.paddingLeft = `${Math.max(0, r.level - 1) * 16}px`;
      const s = document.createElement("a");
      s.className = "zt-md-toc-link", s.textContent = r.text.length > 0 ? r.text : this.messages.tocEmpty, s.href = `#${r.id}`, s.addEventListener("click", (a) => {
        a.preventDefault(), this.jumpTo(r.pos);
      }), i.appendChild(s), o.appendChild(i);
    }
    this.dom.appendChild(o);
  }
  /**
   * 跳转到标题:光标移至标题处并滚动定位(标题滚入视口顶部)。
   */
  jumpTo(t) {
    const n = this.view, o = n.state.doc.resolve(t), r = de.near(o, 1);
    n.dispatch(n.state.tr.setSelection(r));
    const i = n.nodeDOM(t), s = i instanceof Element ? i : (i == null ? void 0 : i.parentElement) ?? null;
    s == null || s.scrollIntoView({ block: "start", behavior: "auto" }), n.focus();
  }
  update(t) {
    return !0;
  }
  stopEvent() {
    return !0;
  }
  ignoreMutation() {
    return !0;
  }
  destroy() {
    this.unregister();
  }
}
const AE = (e) => (t, n) => new LE(n, e), IE = ue(
  () => new ye({
    key: new ke("zt-md-toc-refresh"),
    view: () => ({
      update: (e, t) => {
        e.state.doc !== t.doc && $r.forEach((n) => {
          try {
            n();
          } catch {
          }
        });
      }
    })
  })
), RE = [TE, SE, IE].flat(), vo = "yaml", NE = We("remarkFrontmatter", () => mu, "yaml"), PE = Ke(vo, () => ({
  content: "text*",
  group: "block",
  code: !0,
  defining: !0,
  isolating: !0,
  marks: "",
  attrs: {},
  parseDOM: [
    {
      tag: 'pre[data-type="yaml"]',
      preserveWhitespace: "full"
    }
  ],
  toDOM: () => ["pre", { "data-type": vo, class: "zt-md-frontmatter" }, ["code", 0]],
  parseMarkdown: {
    match: (e) => e.type === vo,
    runner: (e, t, n) => {
      e.openNode(n);
      const o = t.value;
      typeof o == "string" && o.length > 0 && e.addText(o), e.closeNode();
    }
  },
  toMarkdown: {
    match: (e) => e.type.name === vo,
    runner: (e, t) => {
      var n;
      e.addNode("yaml", void 0, ((n = t.content.firstChild) == null ? void 0 : n.text) ?? "");
    }
  }
})), DE = [NE, PE].flat(), Gc = {
  "(": ")",
  "[": "]",
  "{": "}",
  "（": "）",
  "【": "】",
  "《": "》",
  "「": "」",
  "『": "』"
}, BE = new Set(Object.values(Gc)), _E = (e) => {
  const { $from: t } = e.state.selection;
  return t.parent.type.spec.code ? !0 : t.marks().some((n) => n.type.name === "inline_code" || n.type.name === "inlineCode");
}, OE = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable, HE = (e) => ue(
  () => new ye({
    key: new ke("zt-md-auto-pair"),
    props: {
      handleTextInput: (t, n, o, r) => {
        if (!OE(t) || _E(t))
          return !1;
        const i = Gc[r];
        if (i !== void 0) {
          const s = t.state.tr;
          return n === o ? (s.insertText(`${r}${i}`, n, o), s.setSelection(de.near(s.doc.resolve(n + 1), 1))) : (s.insertText(i, o, o), s.insertText(r, n, n), s.setSelection(
            de.create(s.doc, n + 1, o + 1)
          )), t.dispatch(s), !0;
        }
        if (BE.has(r) && n === o && t.state.doc.textBetween(n, n + 1, "\0") === r) {
          const a = t.state.tr;
          return a.setSelection(de.near(a.doc.resolve(n + 1), 1)), t.dispatch(a), !0;
        }
        return !1;
      }
    }
  })
), yr = 8, ln = {
  active: !1,
  triggerPos: 0,
  query: "",
  activeIndex: 0
}, FE = (e) => /[\p{L}\p{N}_-]/u.test(e), $E = () => {
  const e = [];
  for (const t of lc)
    e.push(...t.emojis);
  return e;
}, Da = (e) => {
  const t = e.trim().toLowerCase();
  if (t.length === 0)
    return Ba.slice(0, yr);
  const n = t.split(/\s+/), o = [];
  for (const r of Ba) {
    const i = r.keywords.toLowerCase();
    if (n.every((s) => i.includes(s)) && (o.push(r), o.length >= yr * 4))
      break;
  }
  return o.slice(0, yr);
}, Ba = $E();
class jE {
  constructor(t, n) {
    /** 面板容器。 */
    m(this, "dom");
    /** 当前候选(渲染后由插件读取做插入)。 */
    m(this, "suggestions", []);
    /** 键盘高亮索引。 */
    m(this, "activeIndex", 0);
    /** 确认回调(插件注入)。 */
    m(this, "onPick", () => {
    });
    /** 编辑器文案。 */
    m(this, "messages");
    this.dom = document.createElement("div"), this.dom.className = "zt-md-emoji-autocomplete", this.dom.setAttribute("role", "listbox"), this.dom.style.display = "none", t.appendChild(this.dom), this.messages = n;
  }
  /**
   * 渲染候选列表。
   */
  render(t, n) {
    if (this.suggestions = t, this.activeIndex = n, t.length === 0) {
      this.dom.replaceChildren();
      const r = document.createElement("div");
      r.className = "zt-md-emoji-autocomplete-empty", r.textContent = this.messages.emojiPickerNoResults, this.dom.appendChild(r), this.dom.style.display = "block";
      return;
    }
    this.dom.replaceChildren(), t.forEach((r, i) => {
      const s = document.createElement("button");
      s.type = "button", s.className = "zt-md-emoji-autocomplete-item", s.dataset.active = i === n ? "true" : "false", s.setAttribute("role", "option");
      const a = document.createElement("span");
      a.className = "zt-md-emoji-autocomplete-char", a.textContent = r.char;
      const l = document.createElement("span");
      l.className = "zt-md-emoji-autocomplete-keywords", l.textContent = r.keywords.split(/\s+/).slice(0, 3).join(" · "), s.append(a, l), s.addEventListener("mousedown", (c) => {
        c.preventDefault(), this.onPick(r);
      }), this.dom.appendChild(s);
    }), this.dom.style.display = "block";
    const o = this.dom.querySelector('[data-active="true"]');
    if (o) {
      const r = this.dom.getBoundingClientRect(), i = o.getBoundingClientRect();
      (i.top < r.top || i.bottom > r.bottom) && o.scrollIntoView({ block: "nearest" });
    }
  }
  /**
   * 定位面板(锚定光标坐标,翻转防溢出交给 CSS max-height/边界夹取)。
   */
  positionAt(t, n) {
    const o = t.coordsAtPos(n);
    this.dom.style.left = `${Math.max(4, o.left)}px`, this.dom.style.top = `${o.bottom + 4}px`;
  }
  /**
   * 关闭面板。
   */
  close() {
    this.dom.style.display = "none", this.suggestions = [];
  }
  destroy() {
    this.dom.remove();
  }
}
const KE = (e, t, n) => {
  const o = new ke("zt-md-emoji-autocomplete");
  let r = null;
  if (!n)
    return ue(() => new ye({ key: o }));
  const i = new jE(e, t), s = (a, l) => {
    const c = o.getState(a.state);
    if (!(c != null && c.active))
      return;
    const d = c.triggerPos, u = a.state.selection.from;
    a.dispatch(a.state.tr.insertText(l.char, Math.min(d, u), u)), a.focus();
  };
  return i.onPick = (a) => {
    r && s(r, a);
  }, ue(
    () => new ye({
      key: o,
      state: {
        init: () => ln,
        apply: (a, l) => {
          const c = a.getMeta(o);
          if (c)
            return c;
          if (!a.docChanged)
            return l;
          if (!l.active)
            return ln;
          try {
            const d = a.doc.textBetween(l.triggerPos, Math.min(l.triggerPos + 1 + l.query.length, a.doc.content.size), "\0");
            if (d.startsWith(":") && d.slice(1) === l.query)
              return l;
          } catch {
          }
          return ln;
        }
      },
      props: {
        handleTextInput: (a, l, c, d) => {
          if (!(typeof a.props.editable == "function" ? a.props.editable(a.state) : a.editable) || l !== c)
            return !1;
          const h = o.getState(a.state);
          if (d === ":") {
            const p = l > 0 ? a.state.doc.textBetween(l - 1, l, "\0") : `
`;
            return p === "" || /\s|\n/.test(p) ? (a.dispatch(
              a.state.tr.setMeta(o, {
                active: !0,
                triggerPos: l,
                query: "",
                activeIndex: 0
              })
            ), !1) : (a.dispatch(a.state.tr.setMeta(o, ln)), !1);
          }
          return h != null && h.active && FE(d) ? (a.dispatch(
            a.state.tr.setMeta(o, {
              ...h,
              query: h.query + d,
              activeIndex: 0
            })
          ), !1) : (h != null && h.active && a.dispatch(a.state.tr.setMeta(o, ln)), !1);
        },
        handleKeyDown: (a, l) => {
          const c = o.getState(a.state);
          if (!(c != null && c.active))
            return !1;
          const d = Da(c.query);
          if (l.key === "Escape")
            return l.preventDefault(), a.dispatch(a.state.tr.setMeta(o, ln)), !0;
          if (d.length === 0)
            return !1;
          if (l.key === "ArrowDown" || l.key === "ArrowUp") {
            l.preventDefault();
            const u = l.key === "ArrowDown" ? 1 : -1, h = (c.activeIndex + u + d.length) % d.length;
            return a.dispatch(
              a.state.tr.setMeta(o, { ...c, activeIndex: h })
            ), !0;
          }
          if (l.key === "Enter" || l.key === "Tab") {
            l.preventDefault();
            const u = d[c.activeIndex] ?? d[0];
            return u && s(a, u), !0;
          }
          return !1;
        }
      },
      view: (a) => (r = a, {
        update: (l) => {
          r = l;
          const c = o.getState(l.state);
          if (!(c != null && c.active)) {
            i.close();
            return;
          }
          const d = Da(c.query);
          i.render(d, c.activeIndex), i.positionAt(l, c.triggerPos + 1), c.activeIndex >= d.length && l.dispatch(
            l.state.tr.setMeta(o, { ...c, activeIndex: 0 })
          );
        },
        destroy: () => {
          i.close(), r = null;
        }
      })
    })
  );
}, WE = (e) => typeof e.props.editable == "function" ? e.props.editable(e.state) : e.editable, UE = (e) => Array.from(e.files).find((t) => t.type.startsWith("image/")) ?? null, VE = (e, t) => ue(
  () => new ye({
    key: new ke("zt-md-image-drop"),
    props: {
      handleDrop: (n, o, r, i) => {
        if (i || r != null && r.size || !WE(n))
          return !1;
        const s = o, a = s.dataTransfer;
        if (!a)
          return !1;
        const l = UE(a);
        if (!l)
          return !1;
        o.preventDefault();
        const c = (e == null ? void 0 : e.maxFileSize) ?? Zr;
        if (l.size > c)
          return console.error(
            new Error(
              t.imageUploadFileSizeExceeded.replace("{size}", Ro(c))
            )
          ), !0;
        const d = n.posAtCoords({ left: s.clientX, top: s.clientY }), u = (d == null ? void 0 : d.pos) ?? n.state.selection.from;
        return (async () => {
          try {
            const h = e != null && e.upload ? await e.upload(l) : await Jr(l);
            if (n.isDestroyed)
              return;
            const p = Math.min(u, n.state.doc.content.size);
            Yr(
              n,
              {
                src: h,
                alt: Qr(l.name),
                title: ""
              },
              de.near(n.state.doc.resolve(p), 1)
            );
          } catch (h) {
            console.error(h);
          }
        })(), !0;
      }
    }
  })
), qE = "zt-md-focus-current", GE = () => {
  let e = !1, t = !1;
  return {
    controller: {
      isFocusModeActive: () => e,
      isTypewriterModeActive: () => t
    },
    setFocusMode: (n) => {
      e = n;
    },
    setTypewriterMode: (n) => {
      t = n;
    }
  };
}, _a = (e, t) => {
  let n;
  try {
    const r = e.resolve(t);
    n = r.depth >= 1 ? r.before(1) : r.pos;
  } catch {
    return Le.empty;
  }
  const o = e.nodeAt(n);
  return o ? Le.create(e, [
    jt.node(n, n + o.nodeSize, { class: qE })
  ]) : Le.empty;
}, XE = (e, t) => {
  if (!(!e.hasFocus || e.composing))
    try {
      const n = e.coordsAtPos(e.state.selection.head), r = t.getBoundingClientRect().top + t.clientHeight / 2, i = n.bottom - r;
      Math.abs(i) > 24 && (t.scrollTop += i);
    } catch {
    }
}, YE = (e, t) => ue(
  () => new ye({
    key: new ke("zt-md-writing-mode"),
    state: {
      init: (n, o) => _a(o.doc, o.selection.head),
      apply: (n, o) => n.docChanged || n.selectionSet ? _a(n.doc, n.selection.head) : o
    },
    props: {
      decorations: (n) => e.isFocusModeActive() ? ZE.getState(n) : Le.empty
    },
    view: () => ({
      update: (n, o) => {
        e.isTypewriterModeActive() && (n.state.doc !== o.doc || !n.state.selection.eq(o.selection)) && requestAnimationFrame(() => {
          XE(n, t);
        });
      }
    })
  })
), ZE = new ke("zt-md-writing-mode"), JE = new ke("zt-md-smart-punctuation"), QE = /[\s(\[{'"“‘—–-]$/, ez = (e) => {
  const { state: t } = e, { from: n } = t.selection;
  return n === 0 ? null : t.doc.textBetween(n - 1, n, `
`, `
`);
}, tz = (e) => {
  const { state: t } = e, { from: n } = t.selection, o = t.selection.$from, r = t.schema.marks.code;
  if (r && t.doc.rangeHasMark(n, n, r))
    return !0;
  for (let i = o.depth; i > 0; i -= 1) {
    const s = o.node(i);
    if (s.type.spec.code || s.type.name === "math_inline" || s.type.name === "math_block")
      return !0;
  }
  return !1;
}, nz = (e, t) => {
  const n = t === null || t === `
` || QE.test(t);
  return e === '"' ? n ? "“" : "”" : n ? "‘" : "’";
}, oz = (e, t) => e === "-" ? t === "–" ? { backspace: 1, text: "—" } : t === "-" ? { backspace: 1, text: "–" } : null : e === "." && t === "." ? { backspace: 2, text: "…" } : null, rz = () => ue(
  () => new ye({
    key: JE,
    props: {
      handleTextInput: (e, t, n, o) => {
        if (o.length !== 1 || !(o === '"' || o === "'" || o === "-" || o === ".") || e.composing || t !== n || tz(e))
          return !1;
        const r = ez(e);
        if (o === '"' || o === "'") {
          const s = nz(o, r);
          return e.dispatch(e.state.tr.insertText(s, t, n)), !0;
        }
        const i = oz(o, r);
        if (i) {
          const s = Math.max(0, t - i.backspace);
          return e.dispatch(e.state.tr.insertText(i.text, s, n)), !0;
        }
        return !1;
      }
    }
  })
), iz = `/* styles/editor.css — Meditor 基础样式(编辑器主体)
 *
 * 1:1 翻译自 zt-react-milkdown/src/styles/style.css
 * - 去除 Tailwind 依赖,改用纯 CSS;令牌见 tokens.css,功能模块见 modules/
 * - 保留 meditor-* 布局类(外部 document-tab 依赖),与 zt-md-* 视觉类并存
 */

@import './tokens.css';
@import './modules/slash-menu.css';
@import './modules/emoji-picker.css';
@import './modules/image.css';
@import './modules/image-upload-dialog.css';
@import './modules/image-preview-editor.css';
@import './modules/selection-menu.css';
@import './modules/inline-color.css';
@import './modules/callout.css';
@import './modules/toggle.css';
@import './modules/media-embed.css';
@import './modules/gap-cursor.css';
@import './modules/drop-cursor.css';
@import './modules/math-block.css';
@import './modules/math-inline.css';
@import './modules/typography.css';
@import './modules/blockquote.css';
@import './modules/inline-code.css';
@import './modules/code-block.css';
@import './modules/search.css';
@import './modules/ai.css';
@import './modules/outline.css';
@import './modules/task-list.css';
@import './modules/table.css';
@import './modules/layout-block.css';
@import './modules/toc.css';
@import './modules/footnote.css';
@import './modules/front-matter.css';
@import './modules/emoji-autocomplete.css';
@import './modules/writing-mode.css';
@import './modules/source-mode.css';
@import './modules/heading-numbering.css';

/* ===== 编辑器主体(卡片容器) ===== */

.zt-md {
  position: relative;
  width: 100%;
  overflow: visible;
  border: 1px solid var(--zt-border);
  border-radius: var(--zt-radius-lg);
  background: var(--zt-surface);
  /* 字体/字号/行距暴露为 CSS 变量(宿主排版偏好注入;缺省走内置值)。 */
  font-family: var(--zt-md-font-family, var(--zt-font));
  font-size: var(--zt-md-font-size, 15.5px);
  line-height: var(--zt-md-line-height, 1.75);
  color: var(--zt-fg);
  transition: border-color 150ms ease-out;
}

.zt-md[data-readonly='true']::after {
  content: attr(data-readonly-label);
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 20;
  padding: 4px 7px;
  border: 1px solid var(--zt-border);
  border-radius: var(--zt-radius);
  background: var(--zt-elevated);
  color: var(--zt-muted);
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.01em;
  line-height: 1;
  pointer-events: none;
}

.zt-md-header {
  position: relative;
  border-bottom: 1px solid var(--zt-border);
  padding: 1rem 1.25rem;
  font-size: 0.875rem;
  color: var(--zt-muted);
  background: var(--zt-surface);
  letter-spacing: 0.01em;
}

.zt-md-body {
  position: relative;
  min-height: 160px;
  background: var(--zt-surface);
  border-radius: var(--zt-radius-lg);
}

.zt-md-header + .zt-md-body {
  border-radius: 0 0 var(--zt-radius-lg) var(--zt-radius-lg);
}

.zt-md-error {
  position: absolute;
  right: 1rem;
  top: 1rem;
  z-index: 20;
  border: 1px solid color-mix(in srgb, var(--zt-destructive) 42%, var(--zt-border));
  border-radius: calc(var(--zt-radius) - 2px);
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: color-mix(in srgb, var(--zt-destructive) 9%, var(--zt-surface));
  color: var(--zt-destructive);
}

/* ===== 编辑区 ===== */

.zt-md-editor {
  min-height: 160px;
  /* 左侧留白供块手柄(+ / 拖拽)悬浮;右侧保持等宽留白,两侧视觉对称。 */
  padding: 1rem 3.25rem;
  font-size: var(--zt-md-font-size, 15.5px);
  line-height: var(--zt-md-line-height, 1.75);
  outline: none;
  position: relative;
}

/* 块手柄关闭态(如简洁模式):无手柄悬浮需求,左右同为常规留白保持对称。 */
.zt-md[data-block-handle='off'] .zt-md-editor {
  padding: 1rem 1.25rem;
}

.zt-md-editor:focus-visible {
  outline: none;
}

.zt-md-editor .ProseMirror {
  outline: none;
  white-space: pre-wrap;
  caret-color: var(--zt-primary);
}

/* 严格换行(GFM):段落内单独换行折叠为空格;代码/公式块自带 white-space,不受影响。 */
.zt-md[data-strict-breaks='on'] .zt-md-editor .ProseMirror {
  white-space: normal;
  overflow-wrap: break-word;
}

.zt-md-editor .ProseMirror ::selection {
  background: color-mix(in srgb, var(--zt-primary) 24%, transparent);
}

/* 双栏同步:对侧远端选区高亮(meditor 未聚焦,原生选区不渲染,以此可见)。 */
.zt-md-editor .zt-md-remote-selection {
  background: color-mix(in srgb, var(--zt-primary) 20%, transparent);
  border-radius: 2px;
}

.zt-md-editor .ProseMirror p {
  margin: 0;
}

.zt-md-editor .ProseMirror img {
  display: block;
  max-width: 100%;
  height: auto;
}

.zt-md-editor .ProseMirror img.ProseMirror-separator {
  display: inline !important;
  border: none !important;
  margin: 0 !important;
}

.zt-md-editor .ProseMirror:focus,
.zt-md-editor .ProseMirror:focus-visible {
  outline: none !important;
}

.zt-md-editor .ProseMirror-hideselection *::selection {
  background: transparent;
}

.zt-md-editor .ProseMirror-hideselection *::-moz-selection {
  background: transparent;
}

.zt-md-editor .ProseMirror-hideselection {
  caret-color: transparent;
}

/* NodeSelection 选中态一律不显示蓝框:
 * 块手柄 BlockService 在 mousedown(含点击 + 按钮,手柄在 draggable 根内)时
 * 会创建 NodeSelection,ProseMirror 渲染为 .ProseMirror-selectednode;
 * 拖拽松手后 NodeSelection 仍存活,点 + 插入新行亦然。
 * 视觉上该蓝框(原 1px 主色调 outline + li:after 描边)在上述所有场景
 * 均属多余,产品决定任何时刻都不显示,故统一抑制(含 li 包裹层)。
 * prosemirror-view 的基础样式表(2px solid #8cf)目前未被引入,
 * 此处显式抑制可避免其将来被引入时蓝框回潮。 */
.zt-md-editor .ProseMirror-selectednode {
  outline: none !important;
}

.zt-md-editor li.ProseMirror-selectednode:after {
  content: none !important;
}

/* 只读态覆盖浏览器默认锚点交互样式，避免出现手型与 active 红色。 */
.zt-md-editor.zt-md-readonly .ProseMirror a,
.zt-md-editor.zt-md-readonly .ProseMirror a:link,
.zt-md-editor.zt-md-readonly .ProseMirror a:visited,
.zt-md-editor.zt-md-readonly .ProseMirror a:hover,
.zt-md-editor.zt-md-readonly .ProseMirror a:active {
  cursor: text;
}

/* 统一编辑器内部滚动条样式，新增滚动容器默认自动继承。 */
.zt-md * {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--zt-muted) 42%, var(--zt-surface)) transparent;
}

.zt-md *::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.zt-md *::-webkit-scrollbar-track {
  background: transparent;
}

.zt-md *::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background-clip: padding-box;
  background-color: color-mix(in srgb, var(--zt-muted) 42%, var(--zt-surface));
}

.zt-md *:hover::-webkit-scrollbar-thumb {
  background-color: color-mix(in srgb, var(--zt-muted) 68%, var(--zt-surface));
}

.zt-md-readonly {
  cursor: default;
}

.zt-md-editable {
  cursor: text;
}

/* ===== 翻译只读视图(工具栏翻译按钮进入,data-translate 驱动) ===== */

/* 翻译视图隐藏编辑交互浮层:块手柄(+/拖拽)与选区工具栏均为编辑动作,
   只读下保留会诱导出可改译文的操作路径。 */
.zt-md[data-translate='true'] .zt-md-block-handle,
.zt-md[data-translate='true'] .zt-md-selection-tooltip {
  display: none !important;
}

.zt-md
  :is(
    .zt-md-code-block-action-button,
    .zt-md-image-action-button,
    .zt-md-math-block-action-button,
    .zt-md-selection-tooltip-button,
    .zt-md-selection-transform-trigger,
    .zt-md-selection-transform-item,
    .zt-md-selection-link-popover-action,
    .zt-md-table-action-button,
    .zt-md-table-action-menu-item,
    .zt-md-code-block-lang-trigger,
    .zt-md-code-block-lang-option
  ):focus-visible {
  outline: 2px solid var(--zt-primary);
  outline-offset: 1px;
}

/* ===== Portal 浮层 ===== */

.zt-md-portal,
.zt-md-content-portal {
  position: absolute;
  inset: 0;
  z-index: 30;
  pointer-events: none;
}

.zt-md-portal > *,
.zt-md-content-portal > *,
.zt-md-content-portal [data-slot='popover-content'] {
  pointer-events: auto;
}

/* ===== Meditor 布局兼容段(meditor-* 结构类,外部 document-tab 依赖) ===== */

.meditor-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.meditor-header-slot {
  flex-shrink: 0;
}

.meditor-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 编辑区:占满剩余高度并在内部滚动(视觉样式由 .zt-md-editor 提供) */
.meditor-editor-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* 搜索面板宿主:工具栏之后的文档流空盒(高 0),作为面板的 absolute 定位基准,
   面板因此落在工具栏下方;工具栏隐藏(只读)/换行时宿主位置自动跟随。
   旧版 display: contents 使面板相对 .meditor-body 顶部定位,会盖住顶部工具栏。 */
.meditor-search-panel-host {
  position: relative;
}

.meditor-portal,
.meditor-content-portal {
  position: absolute;
  inset: 0;
  z-index: 30;
  pointer-events: none;
}

.meditor-portal > *,
.meditor-content-portal > * {
  pointer-events: auto;
}

.meditor-image-upload-dialog-host {
  position: relative;
}

/* ===== 无障碍与响应式 ===== */

@media (max-width: 767px) {
  .zt-md
    :is(
      .zt-md-code-block-action-button,
      .zt-md-image-action-button,
      .zt-md-math-block-action-button,
      .zt-md-selection-tooltip-button,
      .zt-md-selection-transform-trigger,
      .zt-md-selection-transform-item,
      .zt-md-selection-link-popover-action,
      .zt-md-table-action-button,
      .zt-md-table-action-menu-item,
      .zt-md-code-block-lang-trigger,
      .zt-md-code-block-lang-option,
      .zt-md-toolbar-button,
      .zt-md-toolbar-block-trigger
    ) {
    min-width: 44px;
    min-height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .zt-md,
  .zt-md *,
  .zt-md *::before,
  .zt-md *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`, sz = `@font-face{font-display:block;font-family:KaTeX_AMS;font-style:normal;font-weight:400;src:url(fonts/KaTeX_AMS-Regular.woff2) format("woff2"),url(fonts/KaTeX_AMS-Regular.woff) format("woff"),url(fonts/KaTeX_AMS-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Caligraphic;font-style:normal;font-weight:700;src:url(fonts/KaTeX_Caligraphic-Bold.woff2) format("woff2"),url(fonts/KaTeX_Caligraphic-Bold.woff) format("woff"),url(fonts/KaTeX_Caligraphic-Bold.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Caligraphic;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Caligraphic-Regular.woff2) format("woff2"),url(fonts/KaTeX_Caligraphic-Regular.woff) format("woff"),url(fonts/KaTeX_Caligraphic-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Fraktur;font-style:normal;font-weight:700;src:url(fonts/KaTeX_Fraktur-Bold.woff2) format("woff2"),url(fonts/KaTeX_Fraktur-Bold.woff) format("woff"),url(fonts/KaTeX_Fraktur-Bold.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Fraktur;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Fraktur-Regular.woff2) format("woff2"),url(fonts/KaTeX_Fraktur-Regular.woff) format("woff"),url(fonts/KaTeX_Fraktur-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Main;font-style:normal;font-weight:700;src:url(fonts/KaTeX_Main-Bold.woff2) format("woff2"),url(fonts/KaTeX_Main-Bold.woff) format("woff"),url(fonts/KaTeX_Main-Bold.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Main;font-style:italic;font-weight:700;src:url(fonts/KaTeX_Main-BoldItalic.woff2) format("woff2"),url(fonts/KaTeX_Main-BoldItalic.woff) format("woff"),url(fonts/KaTeX_Main-BoldItalic.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Main;font-style:italic;font-weight:400;src:url(fonts/KaTeX_Main-Italic.woff2) format("woff2"),url(fonts/KaTeX_Main-Italic.woff) format("woff"),url(fonts/KaTeX_Main-Italic.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Main;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Main-Regular.woff2) format("woff2"),url(fonts/KaTeX_Main-Regular.woff) format("woff"),url(fonts/KaTeX_Main-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Math;font-style:italic;font-weight:700;src:url(fonts/KaTeX_Math-BoldItalic.woff2) format("woff2"),url(fonts/KaTeX_Math-BoldItalic.woff) format("woff"),url(fonts/KaTeX_Math-BoldItalic.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Math;font-style:italic;font-weight:400;src:url(fonts/KaTeX_Math-Italic.woff2) format("woff2"),url(fonts/KaTeX_Math-Italic.woff) format("woff"),url(fonts/KaTeX_Math-Italic.ttf) format("truetype")}@font-face{font-display:block;font-family:"KaTeX_SansSerif";font-style:normal;font-weight:700;src:url(fonts/KaTeX_SansSerif-Bold.woff2) format("woff2"),url(fonts/KaTeX_SansSerif-Bold.woff) format("woff"),url(fonts/KaTeX_SansSerif-Bold.ttf) format("truetype")}@font-face{font-display:block;font-family:"KaTeX_SansSerif";font-style:italic;font-weight:400;src:url(fonts/KaTeX_SansSerif-Italic.woff2) format("woff2"),url(fonts/KaTeX_SansSerif-Italic.woff) format("woff"),url(fonts/KaTeX_SansSerif-Italic.ttf) format("truetype")}@font-face{font-display:block;font-family:"KaTeX_SansSerif";font-style:normal;font-weight:400;src:url(fonts/KaTeX_SansSerif-Regular.woff2) format("woff2"),url(fonts/KaTeX_SansSerif-Regular.woff) format("woff"),url(fonts/KaTeX_SansSerif-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Script;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Script-Regular.woff2) format("woff2"),url(fonts/KaTeX_Script-Regular.woff) format("woff"),url(fonts/KaTeX_Script-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Size1;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Size1-Regular.woff2) format("woff2"),url(fonts/KaTeX_Size1-Regular.woff) format("woff"),url(fonts/KaTeX_Size1-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Size2;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Size2-Regular.woff2) format("woff2"),url(fonts/KaTeX_Size2-Regular.woff) format("woff"),url(fonts/KaTeX_Size2-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Size3;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Size3-Regular.woff2) format("woff2"),url(fonts/KaTeX_Size3-Regular.woff) format("woff"),url(fonts/KaTeX_Size3-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Size4;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Size4-Regular.woff2) format("woff2"),url(fonts/KaTeX_Size4-Regular.woff) format("woff"),url(fonts/KaTeX_Size4-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Typewriter;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Typewriter-Regular.woff2) format("woff2"),url(fonts/KaTeX_Typewriter-Regular.woff) format("woff"),url(fonts/KaTeX_Typewriter-Regular.ttf) format("truetype")}.katex{font:normal 1.21em KaTeX_Main,Times New Roman,serif;line-height:1.2;position:relative;text-indent:0;text-rendering:auto}.katex *{-ms-high-contrast-adjust:none!important;border-color:currentColor}.katex .katex-version:after{content:"0.16.47"}.katex .katex-mathml{border:0;-webkit-clip-path:inset(50%);clip-path:inset(50%);height:1px;overflow:hidden;padding:0;position:absolute;width:1px}.katex .katex-html>.newline{display:block}.katex .base{position:relative;white-space:nowrap;width:-webkit-min-content;width:-moz-min-content;width:min-content}.katex .base,.katex .strut{display:inline-block}.katex .textbf{font-weight:700}.katex .textit{font-style:italic}.katex .textrm{font-family:KaTeX_Main}.katex .textsf{font-family:KaTeX_SansSerif}.katex .texttt{font-family:KaTeX_Typewriter}.katex .mathnormal{font-family:KaTeX_Math;font-style:italic}.katex .mathit{font-family:KaTeX_Main;font-style:italic}.katex .mathrm{font-style:normal}.katex .mathbf{font-family:KaTeX_Main;font-weight:700}.katex .boldsymbol{font-family:KaTeX_Math;font-style:italic;font-weight:700}.katex .amsrm,.katex .mathbb,.katex .textbb{font-family:KaTeX_AMS}.katex .mathcal{font-family:KaTeX_Caligraphic}.katex .mathfrak,.katex .textfrak{font-family:KaTeX_Fraktur}.katex .mathboldfrak,.katex .textboldfrak{font-family:KaTeX_Fraktur;font-weight:700}.katex .mathtt{font-family:KaTeX_Typewriter}.katex .mathscr,.katex .textscr{font-family:KaTeX_Script}.katex .mathsf,.katex .textsf{font-family:KaTeX_SansSerif}.katex .mathboldsf,.katex .textboldsf{font-family:KaTeX_SansSerif;font-weight:700}.katex .mathitsf,.katex .mathsfit,.katex .textitsf{font-family:KaTeX_SansSerif;font-style:italic}.katex .mainrm{font-family:KaTeX_Main;font-style:normal}.katex .vlist-t{border-collapse:collapse;display:inline-table;table-layout:fixed}.katex .vlist-r{display:table-row}.katex .vlist{display:table-cell;position:relative;vertical-align:bottom}.katex .vlist>span{display:block;height:0;position:relative}.katex .vlist>span>span{display:inline-block}.katex .vlist>span>.pstrut{overflow:hidden;width:0}.katex .vlist-t2{margin-right:-2px}.katex .vlist-s{display:table-cell;font-size:1px;min-width:2px;vertical-align:bottom;width:2px}.katex .vbox{align-items:baseline;display:inline-flex;flex-direction:column}.katex .hbox{width:100%}.katex .hbox,.katex .thinbox{display:inline-flex;flex-direction:row}.katex .thinbox{max-width:0;width:0}.katex .msupsub{text-align:left}.katex .mfrac>span>span{text-align:center}.katex .mfrac .frac-line{border-bottom-style:solid;display:inline-block;width:100%}.katex .hdashline,.katex .hline,.katex .mfrac .frac-line,.katex .overline .overline-line,.katex .rule,.katex .underline .underline-line{min-height:1px}.katex .mspace{display:inline-block}.katex .smash{display:inline;line-height:0}.katex .clap,.katex .llap,.katex .rlap{position:relative;width:0}.katex .clap>.inner,.katex .llap>.inner,.katex .rlap>.inner{position:absolute}.katex .clap>.fix,.katex .llap>.fix,.katex .rlap>.fix{display:inline-block}.katex .llap>.inner{right:0}.katex .clap>.inner,.katex .rlap>.inner{left:0}.katex .clap>.inner>span{margin-left:-50%;margin-right:50%}.katex .rule{border:0 solid;display:inline-block;position:relative}.katex .hline,.katex .overline .overline-line,.katex .underline .underline-line{border-bottom-style:solid;display:inline-block;width:100%}.katex .hdashline{border-bottom-style:dashed;display:inline-block;width:100%}.katex .sqrt>.root{margin-left:.2777777778em;margin-right:-.5555555556em}.katex .fontsize-ensurer.reset-size1.size1,.katex .sizing.reset-size1.size1{font-size:1em}.katex .fontsize-ensurer.reset-size1.size2,.katex .sizing.reset-size1.size2{font-size:1.2em}.katex .fontsize-ensurer.reset-size1.size3,.katex .sizing.reset-size1.size3{font-size:1.4em}.katex .fontsize-ensurer.reset-size1.size4,.katex .sizing.reset-size1.size4{font-size:1.6em}.katex .fontsize-ensurer.reset-size1.size5,.katex .sizing.reset-size1.size5{font-size:1.8em}.katex .fontsize-ensurer.reset-size1.size6,.katex .sizing.reset-size1.size6{font-size:2em}.katex .fontsize-ensurer.reset-size1.size7,.katex .sizing.reset-size1.size7{font-size:2.4em}.katex .fontsize-ensurer.reset-size1.size8,.katex .sizing.reset-size1.size8{font-size:2.88em}.katex .fontsize-ensurer.reset-size1.size9,.katex .sizing.reset-size1.size9{font-size:3.456em}.katex .fontsize-ensurer.reset-size1.size10,.katex .sizing.reset-size1.size10{font-size:4.148em}.katex .fontsize-ensurer.reset-size1.size11,.katex .sizing.reset-size1.size11{font-size:4.976em}.katex .fontsize-ensurer.reset-size2.size1,.katex .sizing.reset-size2.size1{font-size:.8333333333em}.katex .fontsize-ensurer.reset-size2.size2,.katex .sizing.reset-size2.size2{font-size:1em}.katex .fontsize-ensurer.reset-size2.size3,.katex .sizing.reset-size2.size3{font-size:1.1666666667em}.katex .fontsize-ensurer.reset-size2.size4,.katex .sizing.reset-size2.size4{font-size:1.3333333333em}.katex .fontsize-ensurer.reset-size2.size5,.katex .sizing.reset-size2.size5{font-size:1.5em}.katex .fontsize-ensurer.reset-size2.size6,.katex .sizing.reset-size2.size6{font-size:1.6666666667em}.katex .fontsize-ensurer.reset-size2.size7,.katex .sizing.reset-size2.size7{font-size:2em}.katex .fontsize-ensurer.reset-size2.size8,.katex .sizing.reset-size2.size8{font-size:2.4em}.katex .fontsize-ensurer.reset-size2.size9,.katex .sizing.reset-size2.size9{font-size:2.88em}.katex .fontsize-ensurer.reset-size2.size10,.katex .sizing.reset-size2.size10{font-size:3.4566666667em}.katex .fontsize-ensurer.reset-size2.size11,.katex .sizing.reset-size2.size11{font-size:4.1466666667em}.katex .fontsize-ensurer.reset-size3.size1,.katex .sizing.reset-size3.size1{font-size:.7142857143em}.katex .fontsize-ensurer.reset-size3.size2,.katex .sizing.reset-size3.size2{font-size:.8571428571em}.katex .fontsize-ensurer.reset-size3.size3,.katex .sizing.reset-size3.size3{font-size:1em}.katex .fontsize-ensurer.reset-size3.size4,.katex .sizing.reset-size3.size4{font-size:1.1428571429em}.katex .fontsize-ensurer.reset-size3.size5,.katex .sizing.reset-size3.size5{font-size:1.2857142857em}.katex .fontsize-ensurer.reset-size3.size6,.katex .sizing.reset-size3.size6{font-size:1.4285714286em}.katex .fontsize-ensurer.reset-size3.size7,.katex .sizing.reset-size3.size7{font-size:1.7142857143em}.katex .fontsize-ensurer.reset-size3.size8,.katex .sizing.reset-size3.size8{font-size:2.0571428571em}.katex .fontsize-ensurer.reset-size3.size9,.katex .sizing.reset-size3.size9{font-size:2.4685714286em}.katex .fontsize-ensurer.reset-size3.size10,.katex .sizing.reset-size3.size10{font-size:2.9628571429em}.katex .fontsize-ensurer.reset-size3.size11,.katex .sizing.reset-size3.size11{font-size:3.5542857143em}.katex .fontsize-ensurer.reset-size4.size1,.katex .sizing.reset-size4.size1{font-size:.625em}.katex .fontsize-ensurer.reset-size4.size2,.katex .sizing.reset-size4.size2{font-size:.75em}.katex .fontsize-ensurer.reset-size4.size3,.katex .sizing.reset-size4.size3{font-size:.875em}.katex .fontsize-ensurer.reset-size4.size4,.katex .sizing.reset-size4.size4{font-size:1em}.katex .fontsize-ensurer.reset-size4.size5,.katex .sizing.reset-size4.size5{font-size:1.125em}.katex .fontsize-ensurer.reset-size4.size6,.katex .sizing.reset-size4.size6{font-size:1.25em}.katex .fontsize-ensurer.reset-size4.size7,.katex .sizing.reset-size4.size7{font-size:1.5em}.katex .fontsize-ensurer.reset-size4.size8,.katex .sizing.reset-size4.size8{font-size:1.8em}.katex .fontsize-ensurer.reset-size4.size9,.katex .sizing.reset-size4.size9{font-size:2.16em}.katex .fontsize-ensurer.reset-size4.size10,.katex .sizing.reset-size4.size10{font-size:2.5925em}.katex .fontsize-ensurer.reset-size4.size11,.katex .sizing.reset-size4.size11{font-size:3.11em}.katex .fontsize-ensurer.reset-size5.size1,.katex .sizing.reset-size5.size1{font-size:.5555555556em}.katex .fontsize-ensurer.reset-size5.size2,.katex .sizing.reset-size5.size2{font-size:.6666666667em}.katex .fontsize-ensurer.reset-size5.size3,.katex .sizing.reset-size5.size3{font-size:.7777777778em}.katex .fontsize-ensurer.reset-size5.size4,.katex .sizing.reset-size5.size4{font-size:.8888888889em}.katex .fontsize-ensurer.reset-size5.size5,.katex .sizing.reset-size5.size5{font-size:1em}.katex .fontsize-ensurer.reset-size5.size6,.katex .sizing.reset-size5.size6{font-size:1.1111111111em}.katex .fontsize-ensurer.reset-size5.size7,.katex .sizing.reset-size5.size7{font-size:1.3333333333em}.katex .fontsize-ensurer.reset-size5.size8,.katex .sizing.reset-size5.size8{font-size:1.6em}.katex .fontsize-ensurer.reset-size5.size9,.katex .sizing.reset-size5.size9{font-size:1.92em}.katex .fontsize-ensurer.reset-size5.size10,.katex .sizing.reset-size5.size10{font-size:2.3044444444em}.katex .fontsize-ensurer.reset-size5.size11,.katex .sizing.reset-size5.size11{font-size:2.7644444444em}.katex .fontsize-ensurer.reset-size6.size1,.katex .sizing.reset-size6.size1{font-size:.5em}.katex .fontsize-ensurer.reset-size6.size2,.katex .sizing.reset-size6.size2{font-size:.6em}.katex .fontsize-ensurer.reset-size6.size3,.katex .sizing.reset-size6.size3{font-size:.7em}.katex .fontsize-ensurer.reset-size6.size4,.katex .sizing.reset-size6.size4{font-size:.8em}.katex .fontsize-ensurer.reset-size6.size5,.katex .sizing.reset-size6.size5{font-size:.9em}.katex .fontsize-ensurer.reset-size6.size6,.katex .sizing.reset-size6.size6{font-size:1em}.katex .fontsize-ensurer.reset-size6.size7,.katex .sizing.reset-size6.size7{font-size:1.2em}.katex .fontsize-ensurer.reset-size6.size8,.katex .sizing.reset-size6.size8{font-size:1.44em}.katex .fontsize-ensurer.reset-size6.size9,.katex .sizing.reset-size6.size9{font-size:1.728em}.katex .fontsize-ensurer.reset-size6.size10,.katex .sizing.reset-size6.size10{font-size:2.074em}.katex .fontsize-ensurer.reset-size6.size11,.katex .sizing.reset-size6.size11{font-size:2.488em}.katex .fontsize-ensurer.reset-size7.size1,.katex .sizing.reset-size7.size1{font-size:.4166666667em}.katex .fontsize-ensurer.reset-size7.size2,.katex .sizing.reset-size7.size2{font-size:.5em}.katex .fontsize-ensurer.reset-size7.size3,.katex .sizing.reset-size7.size3{font-size:.5833333333em}.katex .fontsize-ensurer.reset-size7.size4,.katex .sizing.reset-size7.size4{font-size:.6666666667em}.katex .fontsize-ensurer.reset-size7.size5,.katex .sizing.reset-size7.size5{font-size:.75em}.katex .fontsize-ensurer.reset-size7.size6,.katex .sizing.reset-size7.size6{font-size:.8333333333em}.katex .fontsize-ensurer.reset-size7.size7,.katex .sizing.reset-size7.size7{font-size:1em}.katex .fontsize-ensurer.reset-size7.size8,.katex .sizing.reset-size7.size8{font-size:1.2em}.katex .fontsize-ensurer.reset-size7.size9,.katex .sizing.reset-size7.size9{font-size:1.44em}.katex .fontsize-ensurer.reset-size7.size10,.katex .sizing.reset-size7.size10{font-size:1.7283333333em}.katex .fontsize-ensurer.reset-size7.size11,.katex .sizing.reset-size7.size11{font-size:2.0733333333em}.katex .fontsize-ensurer.reset-size8.size1,.katex .sizing.reset-size8.size1{font-size:.3472222222em}.katex .fontsize-ensurer.reset-size8.size2,.katex .sizing.reset-size8.size2{font-size:.4166666667em}.katex .fontsize-ensurer.reset-size8.size3,.katex .sizing.reset-size8.size3{font-size:.4861111111em}.katex .fontsize-ensurer.reset-size8.size4,.katex .sizing.reset-size8.size4{font-size:.5555555556em}.katex .fontsize-ensurer.reset-size8.size5,.katex .sizing.reset-size8.size5{font-size:.625em}.katex .fontsize-ensurer.reset-size8.size6,.katex .sizing.reset-size8.size6{font-size:.6944444444em}.katex .fontsize-ensurer.reset-size8.size7,.katex .sizing.reset-size8.size7{font-size:.8333333333em}.katex .fontsize-ensurer.reset-size8.size8,.katex .sizing.reset-size8.size8{font-size:1em}.katex .fontsize-ensurer.reset-size8.size9,.katex .sizing.reset-size8.size9{font-size:1.2em}.katex .fontsize-ensurer.reset-size8.size10,.katex .sizing.reset-size8.size10{font-size:1.4402777778em}.katex .fontsize-ensurer.reset-size8.size11,.katex .sizing.reset-size8.size11{font-size:1.7277777778em}.katex .fontsize-ensurer.reset-size9.size1,.katex .sizing.reset-size9.size1{font-size:.2893518519em}.katex .fontsize-ensurer.reset-size9.size2,.katex .sizing.reset-size9.size2{font-size:.3472222222em}.katex .fontsize-ensurer.reset-size9.size3,.katex .sizing.reset-size9.size3{font-size:.4050925926em}.katex .fontsize-ensurer.reset-size9.size4,.katex .sizing.reset-size9.size4{font-size:.462962963em}.katex .fontsize-ensurer.reset-size9.size5,.katex .sizing.reset-size9.size5{font-size:.5208333333em}.katex .fontsize-ensurer.reset-size9.size6,.katex .sizing.reset-size9.size6{font-size:.5787037037em}.katex .fontsize-ensurer.reset-size9.size7,.katex .sizing.reset-size9.size7{font-size:.6944444444em}.katex .fontsize-ensurer.reset-size9.size8,.katex .sizing.reset-size9.size8{font-size:.8333333333em}.katex .fontsize-ensurer.reset-size9.size9,.katex .sizing.reset-size9.size9{font-size:1em}.katex .fontsize-ensurer.reset-size9.size10,.katex .sizing.reset-size9.size10{font-size:1.2002314815em}.katex .fontsize-ensurer.reset-size9.size11,.katex .sizing.reset-size9.size11{font-size:1.4398148148em}.katex .fontsize-ensurer.reset-size10.size1,.katex .sizing.reset-size10.size1{font-size:.2410800386em}.katex .fontsize-ensurer.reset-size10.size2,.katex .sizing.reset-size10.size2{font-size:.2892960463em}.katex .fontsize-ensurer.reset-size10.size3,.katex .sizing.reset-size10.size3{font-size:.337512054em}.katex .fontsize-ensurer.reset-size10.size4,.katex .sizing.reset-size10.size4{font-size:.3857280617em}.katex .fontsize-ensurer.reset-size10.size5,.katex .sizing.reset-size10.size5{font-size:.4339440694em}.katex .fontsize-ensurer.reset-size10.size6,.katex .sizing.reset-size10.size6{font-size:.4821600771em}.katex .fontsize-ensurer.reset-size10.size7,.katex .sizing.reset-size10.size7{font-size:.5785920926em}.katex .fontsize-ensurer.reset-size10.size8,.katex .sizing.reset-size10.size8{font-size:.6943105111em}.katex .fontsize-ensurer.reset-size10.size9,.katex .sizing.reset-size10.size9{font-size:.8331726133em}.katex .fontsize-ensurer.reset-size10.size10,.katex .sizing.reset-size10.size10{font-size:1em}.katex .fontsize-ensurer.reset-size10.size11,.katex .sizing.reset-size10.size11{font-size:1.1996142719em}.katex .fontsize-ensurer.reset-size11.size1,.katex .sizing.reset-size11.size1{font-size:.2009646302em}.katex .fontsize-ensurer.reset-size11.size2,.katex .sizing.reset-size11.size2{font-size:.2411575563em}.katex .fontsize-ensurer.reset-size11.size3,.katex .sizing.reset-size11.size3{font-size:.2813504823em}.katex .fontsize-ensurer.reset-size11.size4,.katex .sizing.reset-size11.size4{font-size:.3215434084em}.katex .fontsize-ensurer.reset-size11.size5,.katex .sizing.reset-size11.size5{font-size:.3617363344em}.katex .fontsize-ensurer.reset-size11.size6,.katex .sizing.reset-size11.size6{font-size:.4019292605em}.katex .fontsize-ensurer.reset-size11.size7,.katex .sizing.reset-size11.size7{font-size:.4823151125em}.katex .fontsize-ensurer.reset-size11.size8,.katex .sizing.reset-size11.size8{font-size:.578778135em}.katex .fontsize-ensurer.reset-size11.size9,.katex .sizing.reset-size11.size9{font-size:.6945337621em}.katex .fontsize-ensurer.reset-size11.size10,.katex .sizing.reset-size11.size10{font-size:.8336012862em}.katex .fontsize-ensurer.reset-size11.size11,.katex .sizing.reset-size11.size11{font-size:1em}.katex .delimsizing.size1{font-family:KaTeX_Size1}.katex .delimsizing.size2{font-family:KaTeX_Size2}.katex .delimsizing.size3{font-family:KaTeX_Size3}.katex .delimsizing.size4{font-family:KaTeX_Size4}.katex .delimsizing.mult .delim-size1>span{font-family:KaTeX_Size1}.katex .delimsizing.mult .delim-size4>span{font-family:KaTeX_Size4}.katex .nulldelimiter{display:inline-block;width:.12em}.katex .delimcenter,.katex .op-symbol{position:relative}.katex .op-symbol.small-op{font-family:KaTeX_Size1}.katex .op-symbol.large-op{font-family:KaTeX_Size2}.katex .accent>.vlist-t,.katex .op-limits>.vlist-t{text-align:center}.katex .accent .accent-body{position:relative}.katex .accent .accent-body:not(.accent-full){width:0}.katex .overlay{display:block}.katex .mtable .vertical-separator{display:inline-block;min-width:1px}.katex .mtable .arraycolsep{display:inline-block}.katex .mtable .col-align-c>.vlist-t{text-align:center}.katex .mtable .col-align-l>.vlist-t{text-align:left}.katex .mtable .col-align-r>.vlist-t{text-align:right}.katex .svg-align{text-align:left}.katex svg{fill:currentColor;stroke:currentColor;display:block;height:inherit;position:absolute;width:100%}.katex svg path{stroke:none}.katex svg{fill-rule:nonzero;fill-opacity:1;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1}.katex img{border-style:none;max-height:none;max-width:none;min-height:0;min-width:0}.katex .stretchy{display:block;overflow:hidden;position:relative;width:100%}.katex .stretchy:after,.katex .stretchy:before{content:""}.katex .hide-tail{overflow:hidden;position:relative;width:100%}.katex .halfarrow-left{left:0;overflow:hidden;position:absolute;width:50.2%}.katex .halfarrow-right{overflow:hidden;position:absolute;right:0;width:50.2%}.katex .brace-left{left:0;overflow:hidden;position:absolute;width:25.1%}.katex .brace-center{left:25%;overflow:hidden;position:absolute;width:50%}.katex .brace-right{overflow:hidden;position:absolute;right:0;width:25.1%}.katex .x-arrow-pad{padding:0 .5em}.katex .cd-arrow-pad{padding:0 .55556em 0 .27778em}.katex .mover,.katex .munder,.katex .x-arrow{text-align:center}.katex .boxpad{padding:0 .3em}.katex .fbox,.katex .fcolorbox{border:.04em solid;box-sizing:border-box}.katex .cancel-pad{padding:0 .2em}.katex .cancel-lap{margin-left:-.2em;margin-right:-.2em}.katex .sout{border-bottom-style:solid;border-bottom-width:.08em}.katex .angl{border-right:.049em solid;border-top:.049em solid;box-sizing:border-box;margin-right:.03889em}.katex .anglpad{padding:0 .03889em}.katex .eqn-num:before{content:"(" counter(katexEqnNo) ")";counter-increment:katexEqnNo}.katex .mml-eqn-num:before{content:"(" counter(mmlEqnNo) ")";counter-increment:mmlEqnNo}.katex .mtr-glue{width:50%}.katex .cd-vert-arrow{display:inline-block;position:relative}.katex .cd-label-left{display:inline-block;position:absolute;right:calc(50% + .3em);text-align:left}.katex .cd-label-right{display:inline-block;left:calc(50% + .3em);position:absolute;text-align:right}.katex-display{display:block;margin:1em 0;text-align:center}.katex-display>.katex{display:block;text-align:center;white-space:nowrap}.katex-display>.katex>.katex-html{display:block;position:relative}.katex-display>.katex>.katex-html>.tag{position:absolute;right:0}.katex-display.leqno>.katex>.katex-html>.tag{left:0;right:auto}.katex-display.fleqn>.katex{padding-left:2em;text-align:left}body{counter-reset:katexEqnNo mmlEqnNo}
`, az = ["contenteditable", "aria-label", "aria-readonly", "spellcheck"], lz = (e) => {
  e.querySelectorAll("[data-anchor-id]").forEach((t) => {
    const n = t.getAttribute("data-anchor-id");
    n && !t.id && (t.id = n), t.removeAttribute("data-anchor-id");
  });
}, cz = (e) => {
  e.querySelectorAll("*").forEach((t) => {
    for (const n of az)
      t.removeAttribute(n);
  });
}, dz = (e) => {
  var o;
  const t = e.querySelector("h1, h2, h3, h4, h5, h6"), n = (o = t == null ? void 0 : t.textContent) == null ? void 0 : o.trim();
  return n && n.length > 0 ? n : "未命名文档";
}, uz = (e) => e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"), hz = (e, t) => {
  const n = new DOMParser().parseFromString(`<div id="meditor-export-root">${e}</div>`, "text/html"), o = n.getElementById("meditor-export-root");
  o && (lz(o), cz(o));
  const r = (o == null ? void 0 : o.innerHTML) ?? e;
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="generator" content="Meditor" />
<title>${uz(dz(o ?? n.body))}</title>
<style>
${sz}
</style>
<style>
${iz}
</style>
<style>
/* 导出文档壳:纸质版心 + 打印适配(编辑器 chrome 类不参与) */
html, body { margin: 0; padding: 0; background: var(--zt-bg, #f5f5f5); }
.meditor-export {
  margin: 0 auto;
  max-width: 820px;
  padding: 48px 32px 96px;
}
.meditor-export .zt-md-editor { overflow: visible; }
@media print {
  html, body { background: #ffffff; }
  .meditor-export { max-width: none; padding: 0; }
  .zt-md { box-shadow: none !important; border: none !important; }
}
</style>
</head>
<body>
<main class="meditor-export">
  <div class="zt-md zt-md-light meditor-export-doc">
    <div class="zt-md-editor" aria-readonly="true">
      <div class="ProseMirror">
${r}
      </div>
    </div>
  </div>
</main>
</body>
</html>`;
}, mz = 150, pz = (e) => {
  var W, U, X, se, ae, ne, le, me, Pe, Te, j, F;
  const t = e.messages ?? Qe(), n = {
    math: ((W = e.markdownFeatures) == null ? void 0 : W.math) ?? !0,
    superscript: ((U = e.markdownFeatures) == null ? void 0 : U.superscript) ?? !0,
    subscript: ((X = e.markdownFeatures) == null ? void 0 : X.subscript) ?? !0,
    highlight: ((se = e.markdownFeatures) == null ? void 0 : se.highlight) ?? !0,
    mermaid: ((ae = e.markdownFeatures) == null ? void 0 : ae.mermaid) ?? !0
  }, o = TC(
    (A) => e.onChange(A),
    mz
  ), r = iw(e.onSearchSnapshotChange), i = Uy(), s = GE();
  let a = null;
  const l = () => {
    e.onHeadingsChange && (a !== null && clearTimeout(a), a = setTimeout(() => {
      var P;
      a = null;
      const A = y();
      A && ((P = e.onHeadingsChange) == null || P.call(e, jn(A.view.state.doc)));
    }, 200));
  }, c = ue(
    () => new ye({
      key: new ke("zt-md-headings-change"),
      view: () => ({
        update: (A, P) => {
          A.state.doc !== P.doc && l();
        }
      })
    })
  ), d = n.mermaid ? e.slashMenu : (() => {
    const A = ac(e.slashMenu, e.locale).filter(
      (P) => P.command !== "mermaid"
    );
    return { ...e.slashMenu, items: A };
  })(), u = ((ne = e.slashMenu) == null ? void 0 : ne.enabled) === !1 ? null : Gk({
    portalContainer: e.portalContainer,
    config: d,
    locale: e.locale,
    shortcutMode: e.shortcutMode,
    messages: t,
    imageUpload: e.imageUpload,
    scrollContainerSelector: e.scrollContainerSelector,
    onRequestLayoutMode: e.onRequestLayoutMode
  }), h = Jk(
    e.portalContainer,
    t,
    e.shortcutMode,
    e.imageUpload
  ), p = e.root;
  let g = null;
  const y = () => {
    const A = Bn(N, Pn, ($) => $.state != null);
    if (!A) return null;
    const P = Bn(
      N,
      ld,
      ($) => typeof $ == "function"
    );
    return P ? { view: A, serializer: P } : null;
  }, f = (A, P) => {
    const $ = A.nodeDOM(P);
    return $ instanceof Element ? $ : ($ == null ? void 0 : $.parentElement) ?? null;
  }, w = () => {
    const A = y();
    if (!A) return null;
    const { view: P, serializer: $ } = A, Y = P.state.doc, Z = p.getBoundingClientRect(), ge = [];
    Y.forEach((ze, ce) => {
      const he = f(P, ce);
      if (!he) return;
      const Se = he.getBoundingClientRect();
      Se.height <= 0 || Se.bottom < Z.top || Se.top > Z.bottom || ge.push({
        pos: ce,
        top: Se.top - Z.top,
        markdown: Eo(Y, $, ce, ce + ze.nodeSize)
      });
    });
    const we = Math.max(0, p.scrollHeight - p.clientHeight);
    return {
      scrollContainer: p,
      scrollTop: p.scrollTop,
      scrollHeight: p.scrollHeight,
      clientHeight: p.clientHeight,
      progress: we > 0 ? p.scrollTop / we : 0,
      blocks: ge
    };
  }, b = () => {
    const A = y();
    if (!A) return null;
    const { view: P, serializer: $ } = A, Y = P.state.doc;
    let Z;
    try {
      const ce = Y.resolve(P.state.selection.from);
      Z = ce.depth >= 1 ? ce.before(1) : ce.pos;
    } catch {
      return null;
    }
    const ge = Y.nodeAt(Z);
    if (!ge) return null;
    const we = f(P, Z), ze = p.getBoundingClientRect();
    return {
      pos: Z,
      top: we ? we.getBoundingClientRect().top - ze.top : 0,
      markdown: Eo(Y, $, Z, Z + ge.nodeSize)
    };
  }, k = () => {
    const A = y();
    if (!A) return null;
    const { view: P, serializer: $ } = A, Y = P.state.doc;
    if (g && g.doc === Y)
      return {
        doc: Y,
        full: g.full,
        blocks: g.blocks,
        serializer: $
      };
    let Z = "";
    try {
      Z = $(Y);
    } catch {
      Z = "";
    }
    const ge = [];
    let we = 0, ze = 0;
    return Y.forEach((ce, he) => {
      const Se = Eo(Y, $, he, he + ce.nodeSize);
      let He = ze;
      if (Se.length > 0) {
        const Ee = Z.indexOf(Se, we);
        Ee >= 0 && (He = Ee, we = Ee + Se.length);
      }
      const Fe = He + Se.length;
      ge.push({ pos: he, markdown: Se, start: He, end: Fe }), ze = Fe + 2;
    }), g = { doc: Y, full: Z, blocks: ge }, { doc: Y, full: Z, blocks: ge, serializer: $ };
  }, v = () => {
    var A;
    return ((A = k()) == null ? void 0 : A.blocks) ?? null;
  }, E = (A, P = "auto") => {
    const $ = y();
    if (!$) return;
    const Y = f($.view, A);
    if (!Y) return;
    const Z = p.getBoundingClientRect(), ge = Y.getBoundingClientRect();
    if (P === "start") {
      p.scrollTop += ge.top - Z.top;
      return;
    }
    ge.top < Z.top ? p.scrollTop += ge.top - Z.top : ge.bottom > Z.bottom && (p.scrollTop += ge.bottom - Z.bottom);
  }, M = (A) => {
    const P = Math.max(0, p.scrollHeight - p.clientHeight);
    P <= 0 || (p.scrollTop = Math.min(P, Math.max(0, A * P)));
  };
  let x = !1;
  const T = (A, P) => {
    const $ = y();
    if (!$) return;
    const { view: Y } = $;
    if (A >= P) {
      if (!x) return;
      x = !1;
      try {
        Y.dispatch(Y.state.tr.setMeta(It, Le.empty));
      } catch {
      }
      return;
    }
    try {
      const Z = Le.create(Y.state.doc, [
        jt.inline(A, P, { class: "zt-md-remote-selection" })
      ]);
      Y.dispatch(Y.state.tr.setMeta(It, Z)), x = !0;
    } catch {
    }
  }, L = () => {
    var A;
    return ((A = k()) == null ? void 0 : A.full) ?? null;
  }, S = () => {
    const A = y();
    if (!A) return null;
    const P = A.view.state.doc.textBetween(0, A.view.state.doc.content.size, `
`), $ = P.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g), Y = P.replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, " ").match(/[A-Za-z0-9][A-Za-z0-9_'-]*/g);
    return {
      characters: P.replace(/\n/g, "").length,
      words: (($ == null ? void 0 : $.length) ?? 0) + ((Y == null ? void 0 : Y.length) ?? 0)
    };
  }, I = () => {
    const A = y();
    if (!A) return null;
    const { from: P, to: $ } = A.view.state.selection;
    if (P === $) return null;
    const Y = k();
    if (!Y) return null;
    const { doc: Z, full: ge, blocks: we, serializer: ze } = Y, ce = is(Z, ze, we, P), he = is(Z, ze, we, $);
    return ce === null || he === null || he <= ce ? null : { start: ce, end: he, text: ge.slice(ce, he) };
  }, O = (A, P) => {
    const $ = y();
    if (!$) return !1;
    const { view: Y } = $, Z = k();
    if (!Z) return !1;
    const { doc: ge, blocks: we, serializer: ze } = Z, ce = rs(ge, ze, we, A), he = A === P ? ce : rs(ge, ze, we, P);
    if (ce === null || he === null || he < ce) return !1;
    try {
      const Se = de.between(ge.resolve(ce), ge.resolve(he), 1);
      Y.dispatch(Y.state.tr.setSelection(Se));
    } catch {
      return !1;
    }
    return T(ce, he), !0;
  }, J = () => {
    T(0, 0);
  }, V = ue(
    () => new ye({
      key: new ke("zt-md-cursor-navigate"),
      view: () => ({
        update: (A, P) => {
          const $ = e.onCursorNavigate;
          $ && A.hasFocus && A.state.doc === P.doc && (A.state.selection.eq(P.selection) || $(b()));
        }
      })
    })
  ), K = {
    listener: fd,
    commonmark: Md,
    colorMarks: uf,
    callout: yf,
    toggle: Nf,
    jsondataView: Wf,
    mediaEmbed: Cg,
    taskListTransformKeymap: Rg(e.shortcutMode),
    inlineCodeBoundaryNavigation: MC,
    gfm: xd,
    history: ud,
    editorSearch: r,
    codeBlockPrism: Ik,
    tableHtmlParse: Ev,
    clipboard: dd,
    indent: hd,
    imageDeleteSelection: Np,
    imagePaste: jp(e.imageUpload, t),
    tableArrowEntry: cv,
    blockBoundaryNavigation: ig,
    headingBackspaceEmptyParagraph: Tb,
    mathBackspaceEntry: n.math ? Rb : null,
    blockquoteBackspaceLift: bb,
    tableFocusActions: nv(
      e.portalContainer,
      t,
      e.scrollContainerSelector
    ),
    selectionTooltip: Cw(
      e.portalContainer,
      t,
      e.shortcutMode,
      e.scrollContainerSelector
    ),
    gapCursor: Gf,
    dropCursor: qf,
    trailingParagraph: sg,
    math: n.math ? ly : null,
    mathInlineEdit: n.math ? jb(t, e.portalContainer) : null,
    mathInlineArrowNavigation: n.math ? ny : null,
    mtable: hy,
    layoutBlock: My,
    layoutBlockBehavior: qy(i),
    layoutBlockEffect: Zy(),
    taskListToggle: xv,
    taskListInputRule: Lv(e.chineseSymbols ?? !0),
    chineseSymbolsInputRule: Nv(e.chineseSymbols ?? !0),
    tabSpaceIndent: $v,
    codeBlockModASelect: xk,
    cursorNavigate: V,
    remoteSelectionHighlight: Ou,
    inlineExtMarks: Wc(n),
    inlineExtInputRules: Uc(n),
    headingAnchor: Lu,
    headingsChange: c,
    toc: RE,
    aiStream: Eu,
    footnote: Hg,
    frontMatter: DE,
    autoPair: e.autoPair === !1 ? null : HE(),
    emojiAutocomplete: KE(
      e.portalContainer,
      t,
      e.emojiAutocomplete !== !1
    ),
    smartPunctuation: e.smartPunctuation ? rz() : null,
    imageDrop: VE(e.imageUpload, t),
    writingMode: YE(s.controller, p),
    slash: u,
    blockHandle: ((le = e.blockHandle) == null ? void 0 : le.enabled) === !1 ? null : aE({
      portalContainer: e.portalContainer,
      messages: t,
      scrollContainerSelector: e.scrollContainerSelector
    }),
    toolbar: eE({
      toolbarHost: e.toolbarHost,
      portalContainer: e.portalContainer,
      messages: t,
      shortcutMode: e.shortcutMode,
      mode: (me = e.toolbar) == null ? void 0 : me.mode,
      items: (Pe = e.toolbar) == null ? void 0 : Pe.items,
      // 扩展语法关闭时收起对应按钮(与宿主 exclude 叠加)。
      exclude: [
        ...((Te = e.toolbar) == null ? void 0 : Te.exclude) ?? [],
        ...n.math ? [] : ["inlineMath", "mathBlock"],
        ...n.superscript ? [] : ["superscript"],
        ...n.subscript ? [] : ["subscript"]
      ],
      align: (j = e.toolbar) == null ? void 0 : j.align,
      visible: ((F = e.toolbar) == null ? void 0 : F.visible) ?? !0,
      readOnly: e.readOnly,
      imageUpload: e.imageUpload,
      scrollContainerSelector: e.scrollContainerSelector,
      onOpenSearch: e.onOpenSearch ?? (() => {
      }),
      onToggleTranslate: e.onToggleTranslate,
      onTranslateApiReady: e.onTranslateApiReady,
      onToggleLayoutMode: e.onToggleLayoutMode,
      onLayoutModeApiReady: e.onLayoutModeApiReady,
      onToggleSourceMode: e.onToggleSourceMode,
      onSourceModeApiReady: e.onSourceModeApiReady,
      onToggleOutline: e.onToggleOutline,
      onOutlineApiReady: e.onOutlineApiReady,
      onToggleAi: e.onToggleAi,
      onAiApiReady: e.onAiApiReady
    })
  }, z = ss(K, {
    includeRuntime: !1
  }), D = ss(K, {
    includeRuntime: !0
  }).filter(
    (A) => A.name === "clipboard" || A.name === "indent"
  ), N = nd.make();
  N.config((A) => {
    var P;
    Ig(A, e.shortcutMode), fp(A, (P = e.imageUpload) == null ? void 0 : P.allowedProtocols), ck(A), fv(A), gv(A), bv(A), A.update(od, ($) => ({
      ...$,
      join: [...$.join ?? [], _u]
    })), A.set(rd, e.root), A.set(id, e.markdown), A.set(sd, {
      editable: () => !e.readOnly,
      handleKeyDown: h,
      handleDOMEvents: {
        mousedown: ($, Y) => Y instanceof MouseEvent ? os(Y, e.readOnly) : !1,
        click: ($, Y) => Y instanceof MouseEvent ? os(Y, e.readOnly) : !1
      },
      handleClick: ($, Y, Z) => ns(Z, e.readOnly, $),
      handleClickOn: ($, Y, Z, ge, we, ze) => ns(we, e.readOnly, $) ? !0 : e.readOnly && ze && Bu(Z) ? (we.preventDefault(), !0) : !1
    }), A.update(ad, ($ = []) => {
      var Z;
      const Y = Hf.map(
        (ge) => [ge, cg(e.locale)]
      );
      return [
        ...$,
        ["image", vp(t, e.resolveImageUrl)],
        ["math_block", _b(t)],
        ["inline_math", Vb(t)],
        ["code_block", zk(t, {
          ...e.codeBlock ?? {},
          mermaidEnabled: n.mermaid
        })],
        ["csvdata", wy(e.locale)],
        ["meditor_layout", Wy(t, {
          // meditor-layout:js 沙箱执行开关(宿主面向不可信文档可关闭)。
          scriptEnabled: ((Z = e.layoutBlock) == null ? void 0 : Z.enableScript) ?? !0
        })],
        ["callout", Ef(t)],
        ["toggle", Of(t)],
        ...Y,
        ["media_embed", db(t)],
        ["meditor_toc", AE(t)],
        ["meditor_ai_stream", Mu(t)]
      ];
    }), A.update(pd, ($) => ($ && $.markdownUpdated((Y, Z) => {
      o(Z);
    }), $));
  }), z.forEach((A) => {
    N.use(A.plugin);
  });
  const re = sw(
    (A) => {
      const P = Ji(N, ($) => $.get(Pn));
      P && A(P);
    },
    e.scrollContainerSelector
  ), B = () => {
    D.forEach((A) => {
      try {
        if (N.use(A.plugin), A.name === "indent") {
          const P = {
            type: "space",
            size: 4
          };
          Ji(N, ($) => $.set(md.key, P));
        }
      } catch (P) {
        console.error(P);
      }
    });
  }, te = pu(Ad, N), fe = Tu({
    parseMarkdown: (A) => {
      const P = Za(N, cd);
      if (typeof P != "function")
        return null;
      try {
        return P(A) ?? null;
      } catch {
        return null;
      }
    },
    getViewCtx: y,
    readOnly: e.readOnly
  });
  return {
    editor: N,
    installRuntimePlugins: B,
    focusEditor: (A) => {
      const P = Bn(N, Pn, (he) => he.state != null);
      if (!P)
        return;
      const $ = P.state.doc.lastChild, Y = $ ? P.state.doc.content.size - $.nodeSize : null, Z = Y === null ? null : P.nodeDOM(Y), ge = Z instanceof Element ? Z : (Z == null ? void 0 : Z.parentElement) ?? null;
      if (A !== void 0 && ge !== null && A.top > ge.getBoundingClientRect().bottom) {
        const he = P.state.schema.nodes.paragraph;
        if (!(!!he && ($ == null ? void 0 : $.type) === he && $.content.size === 0) && he) {
          const He = P.state.tr.insert(
            P.state.doc.content.size,
            he.create()
          );
          He.setSelection(de.atEnd(He.doc)).scrollIntoView(), P.dispatch(He), P.focus();
          return;
        }
      }
      const ze = A ? P.posAtCoords(A) : null, ce = ze && ze.pos !== void 0 ? de.near(P.state.doc.resolve(ze.pos), 1) : de.atEnd(P.state.doc);
      P.state.selection.eq(ce) || P.dispatch(P.state.tr.setSelection(ce).scrollIntoView()), P.focus();
    },
    searchController: re,
    getViewportInfo: w,
    getCursorBlock: b,
    getMarkdownBlocks: v,
    scrollToBlock: E,
    scrollToProgress: M,
    getMarkdown: L,
    getStats: S,
    getMarkdownSelection: I,
    setMarkdownSelection: O,
    clearMarkdownSelectionHighlight: J,
    setMarkdown: (A) => {
      BC(N) && console.info(
        "[meditor] whole-document replace under realtime: synced to Yjs atomically via ySyncPlugin"
      ), i.runUnprotected(() => te(A));
    },
    setLayoutModeActive: (A) => {
      i.setModeActive(A);
    },
    getHeadings: () => {
      const A = y();
      return A ? jn(A.view.state.doc) : null;
    },
    scrollToHeading: (A) => {
      const P = y();
      return P ? tl(P.view, A) : !1;
    },
    getStandaloneHtml: () => {
      const A = y();
      return A ? hz(A.view.dom.innerHTML) : null;
    },
    setSpellcheck: (A) => {
      const P = y();
      P && P.view.dom.setAttribute("spellcheck", String(A));
    },
    setSpellcheckLang: (A) => {
      const P = y();
      P && (A ? P.view.dom.setAttribute("lang", A) : P.view.dom.removeAttribute("lang"));
    },
    setFocusMode: (A) => {
      s.setFocusMode(A);
      const P = y();
      P && P.view.dispatch(P.view.state.tr.setMeta("zt-md-writing-mode-refresh", !0));
    },
    setTypewriterMode: (A) => {
      s.setTypewriterMode(A);
    },
    aiStream: fe,
    setEditable: (A) => {
      var P;
      (P = y()) == null || P.view.setProps({ editable: () => A });
    },
    destroy: () => {
      o.flush(), N.destroy();
    }
  };
}, fz = (e) => e.length === 0 ? '""' : `"${e.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r\n|\r|\n/g, "\\A ")}"`, gz = {
  "zh-CN": "只读",
  "en-US": "Read only"
}, bz = (e) => {
  const {
    root: t,
    theme: n,
    readOnly: o,
    locale: r,
    blockHandleEnabled: i,
    className: s,
    headerSlot: a,
    strictLineBreaks: l,
    headingNumbering: c,
    resolvedMessages: d,
    maxHeight: u
  } = e, h = document.createElement("div");
  h.className = "meditor-wrapper", h.classList.add("zt-md", n === "dark" ? "zt-md-dark" : "zt-md-light"), h.setAttribute("data-readonly", o ? "true" : "false"), h.setAttribute("data-readonly-label", gz[r ?? "zh-CN"]), h.setAttribute("data-block-handle", i ? "on" : "off"), h.setAttribute("data-strict-breaks", l ? "on" : "off"), h.setAttribute("data-heading-numbering", c ? "on" : "off"), s && h.classList.add(...s.split(/\s+/).filter(Boolean));
  const p = document.createElement("div");
  p.className = "meditor-header-slot", a instanceof Node && (p.classList.add("zt-md-header"), p.appendChild(a));
  const g = document.createElement("div");
  g.className = "meditor-body", g.classList.add("zt-md-body");
  const y = document.createElement("div");
  y.className = "meditor-toolbar-host", g.appendChild(y);
  const f = document.createElement("div");
  f.className = "meditor-search-panel-host", g.appendChild(f);
  const w = document.createElement("div");
  w.className = "meditor-editor-area", w.classList.add("zt-md-editor", o ? "zt-md-readonly" : "zt-md-editable"), w.setAttribute("aria-label", d.editorAriaLabel), w.setAttribute("aria-readonly", String(o)), w.style.setProperty(
    "--zt-gap-placeholder-content",
    fz(d.placeholder)
  ), u != null && (w.style.maxHeight = typeof u == "number" ? `${u}px` : u, w.style.overflowY = "auto");
  const b = document.createElement("div");
  b.className = "meditor-content-row", b.appendChild(w);
  const k = document.createElement("div");
  k.className = "meditor-outline-host", b.appendChild(k), g.appendChild(b);
  const v = document.createElement("div");
  v.className = "meditor-ai-panel-host", v.dataset.open = "false", g.appendChild(v);
  const E = document.createElement("div");
  E.className = "meditor-portal", E.classList.add("zt-md-portal"), g.appendChild(E);
  const M = document.createElement("div");
  return M.className = "meditor-content-portal", M.classList.add("zt-md-content-portal"), g.appendChild(M), h.appendChild(p), h.appendChild(g), t.appendChild(h), {
    wrapper: h,
    toolbarHostDiv: y,
    searchPanelDiv: f,
    editorArea: w,
    contentRow: b,
    outlinePanelDiv: k,
    aiPanelDiv: v,
    portalContainer: E,
    contentPortalContainer: M
  };
}, yz = {
  search: "",
  replace: "",
  caseSensitive: !1,
  wholeWord: !1,
  regexp: !1
}, kz = {
  matchCount: 0,
  matchIndex: 0,
  isInvalidExpression: !1
}, wz = (e) => {
  const t = document.createElement("section");
  return t.className = "zt-md-search-panel", t.setAttribute("role", "search"), t.setAttribute("aria-label", e.searchPanelAriaLabel), t.innerHTML = `
    <div class="zt-md-search-row zt-md-search-main-row">
      <button class="zt-md-search-icon-button zt-md-search-replace-toggle" type="button"
              aria-label="${xe(e.searchReplaceLabel)}" aria-expanded="false"
              title="${xe(e.searchReplaceLabel)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 6 15 12 9 18"/>
        </svg>
      </button>
      <input class="zt-md-search-input" type="text"
             placeholder="${xe(e.searchInputPlaceholder)}"
             aria-label="${xe(e.searchInputPlaceholder)}" />
      <div class="zt-md-search-options" role="group"
           aria-label="${xe(e.searchPanelAriaLabel)}">
        <button class="zt-md-search-option" type="button" data-option="caseSensitive"
                aria-pressed="false" aria-label="${xe(e.searchCaseSensitiveLabel)}"
                title="${xe(e.searchCaseSensitiveLabel)}">Aa</button>
        <button class="zt-md-search-option" type="button" data-option="wholeWord"
                aria-pressed="false" aria-label="${xe(e.searchWholeWordLabel)}"
                title="${xe(e.searchWholeWordLabel)}">W</button>
        <button class="zt-md-search-option" type="button" data-option="regexp"
                aria-pressed="false" aria-label="${xe(e.searchRegexpLabel)}"
                title="${xe(e.searchRegexpLabel)}">.*</button>
      </div>
      <output class="zt-md-search-count" aria-live="polite">0 / 0</output>
      <div class="zt-md-search-navigation">
        <div class="zt-md-search-navigation-buttons">
          <button class="zt-md-search-icon-button zt-md-search-prev" type="button"
                  aria-label="${xe(e.searchPreviousAriaLabel)}"
                  title="${xe(e.searchPreviousAriaLabel)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
          <button class="zt-md-search-icon-button zt-md-search-next" type="button"
                  aria-label="${xe(e.searchNextAriaLabel)}"
                  title="${xe(e.searchNextAriaLabel)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
        <button class="zt-md-search-icon-button zt-md-search-close-button" type="button"
                aria-label="${xe(e.searchCloseAriaLabel)}"
                title="${xe(e.searchCloseAriaLabel)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="zt-md-search-row zt-md-search-replace-row" hidden>
      <input class="zt-md-search-input zt-md-search-replace-input" type="text"
             placeholder="${xe(e.searchReplaceInputPlaceholder)}"
             aria-label="${xe(e.searchReplaceInputPlaceholder)}" />
      <button class="zt-md-search-action-button zt-md-search-action-primary" type="button"
              data-role="replace-current">${xe(e.searchReplaceLabel)}</button>
      <button class="zt-md-search-action-button" type="button"
              data-role="replace-all">${xe(e.searchReplaceAllLabel)}</button>
    </div>
  `, t;
}, xe = (e) => e.replace(/[&<>"]/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[t] ?? t), vz = (e) => {
  const t = wz(e.messages);
  e.container.appendChild(t);
  let n = { ...yz }, o = kz, r = !1;
  const i = t.querySelector(".zt-md-search-input:not(.zt-md-search-replace-input)"), s = t.querySelector(".zt-md-search-replace-input"), a = t.querySelector(".zt-md-search-replace-toggle"), l = t.querySelector(".zt-md-search-replace-row"), c = t.querySelector(".zt-md-search-prev"), d = t.querySelector(".zt-md-search-next"), u = t.querySelector(".zt-md-search-close-button"), h = t.querySelector('[data-role="replace-current"]'), p = t.querySelector('[data-role="replace-all"]'), g = t.querySelector(".zt-md-search-count"), y = t.querySelectorAll(".zt-md-search-option"), f = () => {
    i.value !== n.search && (i.value = n.search), s.value !== n.replace && (s.value = n.replace), y.forEach((O) => {
      const J = O.dataset.option;
      if (!J) return;
      const V = n[J] === !0;
      O.setAttribute("aria-pressed", V ? "true" : "false");
    });
  }, w = () => {
    g.textContent = o.isInvalidExpression ? e.messages.searchInvalidRegexp : `${o.matchIndex} / ${o.matchCount}`;
    const O = o.matchCount === 0 || o.isInvalidExpression;
    c.disabled = O, d.disabled = O, h.disabled = O, p.disabled = O;
  }, b = () => {
    e.onOptionsChange({ ...n });
  }, k = () => {
    n = { ...n, search: i.value }, b();
  }, v = () => {
    n = { ...n, replace: s.value }, b();
  }, E = (O) => {
    const V = O.currentTarget.dataset.option;
    if (!V) return;
    const K = n[V] === !0;
    n = { ...n, [V]: !K }, f(), b();
  }, M = () => {
    r = !r, l.hidden = !r, a.setAttribute("aria-expanded", r ? "true" : "false");
  }, x = () => {
    e.onFindPrevious();
  }, T = () => {
    e.onFindNext();
  }, L = () => {
    e.onReplaceCurrent(n.replace);
  }, S = () => {
    e.onReplaceAll(n.replace);
  };
  i.addEventListener("input", k), s.addEventListener("input", v), a.addEventListener("click", M), c.addEventListener("click", x), d.addEventListener("click", T);
  const I = () => {
    t.style.display = "none", e.onClose();
  };
  return u.addEventListener("click", I), h.addEventListener("click", L), p.addEventListener("click", S), y.forEach((O) => O.addEventListener("click", E)), f(), w(), {
    open: () => {
      t.style.display = "", requestAnimationFrame(() => {
        i.focus(), i.select();
      });
    },
    close: () => {
      I();
    },
    updateOptions: (O) => {
      n = { ...O }, f();
    },
    updateSnapshot: (O) => {
      o = O, w();
    },
    getOptions: () => ({ ...n })
  };
}, Cz = 88, Ez = (e) => {
  const { host: t, messages: n, scrollContainer: o, onJump: r } = e;
  let i = [], s = !1, a = null, l = null;
  const c = document.createElement("nav");
  c.className = "zt-md-outline", c.setAttribute("aria-label", n.outlinePanelTitle);
  const d = document.createElement("div");
  d.className = "zt-md-outline-header";
  const u = document.createElement("span");
  u.className = "zt-md-outline-title", u.textContent = n.outlinePanelTitle, d.appendChild(u), c.appendChild(d);
  const h = document.createElement("ul");
  h.className = "zt-md-outline-list", c.appendChild(h), t.appendChild(c), t.dataset.open = "false";
  const p = () => {
    if (h.replaceChildren(), i.length === 0) {
      const k = document.createElement("li");
      k.className = "zt-md-outline-empty", k.textContent = n.outlineEmpty, h.appendChild(k);
      return;
    }
    for (const k of i) {
      const v = document.createElement("li");
      v.className = "zt-md-outline-item";
      const E = document.createElement("button");
      E.type = "button", E.className = "zt-md-outline-link", E.dataset.headingId = k.id, E.style.paddingLeft = `${4 + Math.max(0, k.level - 1) * 12}px`, E.title = k.text, E.textContent = k.text, E.addEventListener("click", (M) => {
        M.preventDefault(), r(k.id);
      }), k.id === a && (E.dataset.active = "true", E.setAttribute("aria-current", "true")), v.appendChild(E), h.appendChild(v);
    }
  }, g = (k) => {
    a !== k && (a = k, h.querySelectorAll(".zt-md-outline-link").forEach((v) => {
      const E = v.dataset.headingId === k;
      v.dataset.active = E ? "true" : "false", E ? v.setAttribute("aria-current", "true") : v.removeAttribute("aria-current");
    }));
  }, y = () => {
    if (!s || i.length === 0)
      return;
    const k = Math.max(o.getBoundingClientRect().top, 0) + Cz;
    let v = null;
    for (const E of i) {
      const M = o.querySelector(
        `[data-anchor-id="${CSS.escape(E.id)}"]`
      );
      M instanceof Element && M.getBoundingClientRect().top <= k && (v = E.id);
    }
    g(v);
  }, f = () => {
    l === null && (l = requestAnimationFrame(() => {
      l = null, y();
    }));
  }, w = () => {
    o.addEventListener("scroll", f, { passive: !0 }), window.addEventListener("scroll", f, { passive: !0 }), window.addEventListener("resize", f);
  }, b = () => {
    o.removeEventListener("scroll", f), window.removeEventListener("scroll", f), window.removeEventListener("resize", f);
  };
  return {
    open: () => {
      s || (s = !0, t.dataset.open = "true", p(), w(), y());
    },
    close: () => {
      s && (s = !1, t.dataset.open = "false", b());
    },
    isOpen: () => s,
    setHeadings: (k) => {
      i = k, s && (p(), f());
    },
    destroy: () => {
      b(), l !== null && (cancelAnimationFrame(l), l = null), c.remove();
    }
  };
};
async function* zz(e, t) {
  const n = e.getReader(), o = new TextDecoder();
  let r = "";
  try {
    for (; ; ) {
      if (t.aborted)
        throw new DOMException("Aborted", "AbortError");
      const { done: i, value: s } = await n.read();
      if (i)
        break;
      r += o.decode(s, { stream: !0 });
      let a = r.indexOf(`
`);
      for (; a >= 0; ) {
        const l = r.slice(0, a).replace(/\r$/, "");
        if (r = r.slice(a + 1), l.startsWith("data:")) {
          const c = l.slice(5).trim();
          c.length > 0 && (yield c === "[DONE]" ? null : c);
        }
        a = r.indexOf(`
`);
      }
    }
  } finally {
    n.releaseLock();
  }
}
const Mz = async (e) => {
  var l, c, d;
  const { model: t, messages: n, signal: o, onDelta: r } = e, i = `${t.baseUrl.replace(/\/+$/, "")}/chat/completions`, s = await fetch(i, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${t.apiKey}`
    },
    body: JSON.stringify({
      model: t.model,
      messages: n,
      stream: !0
    }),
    signal: o
  });
  if (!s.ok) {
    const u = await s.text().catch(() => "");
    throw new Error(`AI request failed: HTTP ${s.status} ${u.slice(0, 300)}`);
  }
  const a = s.body;
  if (!a)
    throw new Error("AI request failed: response has no body");
  for await (const u of zz(a, o)) {
    if (u === null)
      break;
    try {
      const p = (d = (c = (l = JSON.parse(u).choices) == null ? void 0 : l[0]) == null ? void 0 : c.delta) == null ? void 0 : d.content;
      typeof p == "string" && p.length > 0 && r(p);
    } catch {
    }
  }
}, Tz = (e, t) => [
  ...e ? [{ role: "system", content: e }] : [],
  { role: "user", content: t }
], xz = [
  "你是 Markdown 写作助手,嵌入在一款所见即所得 Markdown 编辑器中。",
  "请直接输出 Markdown 格式的正文内容,不要包裹代码围栏,不要额外解释。",
  "合理使用标题、列表、表格等结构组织内容。"
].join(""), Sz = (e) => e.name.trim().length > 0 && e.baseUrl.trim().length > 0 && e.model.trim().length > 0, Lz = (e) => {
  const { host: t, messages: n } = e;
  let o = [...e.ai.models ?? []];
  const r = e.ai.streamChat ?? (() => {
    throw new Error("AI streamChat is not configured");
  }), i = e.ai.systemPrompt ?? xz;
  let s = !1, a = !1, l = 0, c = null;
  const d = document.createElement("section");
  d.className = "zt-md-ai-panel", d.setAttribute("aria-label", n.toolbarAiTitle);
  const u = document.createElement("textarea");
  u.className = "zt-md-ai-input", u.rows = 1, u.placeholder = n.aiPanelInputPlaceholder, d.appendChild(u);
  const h = document.createElement("div");
  h.className = "zt-md-ai-controls", d.appendChild(h);
  const p = document.createElement("button");
  p.type = "button", p.className = "zt-md-ai-model-chip", p.appendChild(
    Ie("ai", { size: 14, strokeWidth: 2, className: "zt-md-ai-model-icon" })
  );
  const g = document.createElement("span");
  g.className = "zt-md-ai-model-label", p.appendChild(g), p.appendChild(
    Ie("chevronDown", { size: 12, strokeWidth: 2, className: "zt-md-ai-model-chevron" })
  ), h.appendChild(p);
  const y = document.createElement("div");
  y.className = "zt-md-ai-model-menu", y.setAttribute("role", "listbox"), y.style.display = "none", d.appendChild(y);
  const f = document.createElement("span");
  f.className = "zt-md-ai-status", h.appendChild(f);
  const w = document.createElement("div");
  w.className = "zt-md-ai-actions";
  const b = document.createElement("button");
  b.type = "button", b.className = "zt-md-ai-send", b.title = n.aiPanelSendTitle, b.setAttribute("aria-label", n.aiPanelSendTitle), w.appendChild(b), h.appendChild(w), t.appendChild(d);
  const k = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  k.setAttribute("viewBox", "0 0 24 24"), k.setAttribute("fill", "none"), k.setAttribute("stroke", "currentColor"), k.setAttribute("stroke-width", "2"), k.setAttribute("stroke-linecap", "round"), k.setAttribute("stroke-linejoin", "round"), k.setAttribute("width", "16"), k.setAttribute("height", "16"), k.setAttribute("aria-hidden", "true"), b.appendChild(k);
  const v = () => {
    if (k.replaceChildren(), a) {
      const K = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      K.setAttribute("x", "7"), K.setAttribute("y", "7"), K.setAttribute("width", "10"), K.setAttribute("height", "10"), K.setAttribute("rx", "2"), K.setAttribute("fill", "currentColor"), K.setAttribute("stroke", "none"), k.appendChild(K), b.title = n.aiPanelStopTitle;
    } else {
      const K = document.createElementNS("http://www.w3.org/2000/svg", "path");
      K.setAttribute("d", "M12 19V5M5 12l7-7 7 7"), k.appendChild(K), b.title = n.aiPanelSendTitle;
    }
    b.setAttribute("aria-label", b.title);
  }, E = () => {
    u.style.height = "auto", u.style.height = `${Math.min(140, u.scrollHeight)}px`;
  }, M = () => o.filter(Sz), x = () => {
    var z, H;
    const K = M();
    if (K.length === 0) {
      g.textContent = n.aiPanelNoModels, p.disabled = !0, L();
      return;
    }
    l >= K.length && (l = 0), g.textContent = ((z = K[l]) == null ? void 0 : z.name) ?? "", p.title = `${n.aiPanelModelTitle}: ${((H = K[l]) == null ? void 0 : H.model) ?? ""}`, p.disabled = a;
  }, T = () => {
    v(), x();
    const K = M();
    b.disabled = a ? !1 : K.length === 0, u.disabled = a, u.placeholder = a ? n.aiPanelGeneratingPlaceholder : n.aiPanelInputPlaceholder, d.dataset.generating = a ? "true" : "false";
  }, L = () => {
    y.style.display = "none", p.setAttribute("aria-expanded", "false");
  }, S = () => {
    const K = M();
    y.replaceChildren(), K.forEach((z, H) => {
      const D = document.createElement("button");
      D.type = "button", D.className = "zt-md-ai-model-item", D.dataset.active = H === l ? "true" : "false", D.setAttribute("role", "option"), D.setAttribute("aria-selected", H === l ? "true" : "false");
      const N = document.createElement("span");
      N.className = "zt-md-ai-model-item-name", N.textContent = z.name;
      const ee = document.createElement("span");
      ee.className = "zt-md-ai-model-item-id", ee.textContent = z.model, D.append(N, ee), D.addEventListener("click", (re) => {
        re.preventDefault(), l = H, L(), x();
      }), y.appendChild(D);
    }), y.style.display = "block", p.setAttribute("aria-expanded", "true");
  }, I = async () => {
    if (a) {
      c == null || c.abort();
      return;
    }
    const z = M()[l], H = u.value.trim();
    if (!z || H.length === 0 || !e.delegate.beginStream())
      return;
    a = !0, c = new AbortController(), f.textContent = "", f.dataset.kind = "", T();
    let D = "";
    try {
      await r({
        model: z,
        messages: Tz(i, H),
        signal: c.signal,
        onDelta: (N) => {
          D += N, e.delegate.appendChunk(N);
        }
      }), e.delegate.endStream(D);
    } catch (N) {
      c.signal.aborted ? e.delegate.cancelStream(D) : (e.delegate.failStream(), f.textContent = n.aiPanelRequestFailed, f.dataset.kind = "error", console.error("[meditor] ai generate failed", N));
    } finally {
      a = !1, c = null, u.value = "", E(), T(), u.focus();
    }
  };
  b.addEventListener("click", (K) => {
    K.preventDefault(), I();
  }), p.addEventListener("click", (K) => {
    K.preventDefault(), y.style.display === "block" ? L() : S();
  }), u.addEventListener("input", E), u.addEventListener("keydown", (K) => {
    K.key === "Enter" && !K.shiftKey && !K.isComposing && (K.preventDefault(), I());
  });
  const O = (K) => {
    const z = K.target;
    y.contains(z) || p.contains(z) || L();
  };
  document.addEventListener("mousedown", O, !0);
  const J = () => {
    s = !0, t.dataset.open = "true", T(), requestAnimationFrame(() => {
      u.focus();
    });
  }, V = () => {
    a || (s = !1, t.dataset.open = "false", L());
  };
  return T(), {
    open: J,
    close: V,
    isOpen: () => s,
    isGenerating: () => a,
    setModels: (K) => {
      var N;
      const z = (N = M()[l]) == null ? void 0 : N.name;
      o = [...K];
      const D = M().findIndex((ee) => ee.name === z);
      l = D >= 0 ? D : 0, T();
    },
    destroy: () => {
      c == null || c.abort(), c = null, document.removeEventListener("mousedown", O, !0), d.remove();
    }
  };
}, kt = 120, Az = 150, Fn = (e) => {
  const t = e.split(/\r?\n/);
  for (const n of t)
    if (n.trim().length > 0) return n;
  return "";
}, Iz = (e) => {
  let t = 0, n = null, o = null;
  const r = () => {
    Date.now() < t || o == null || o();
  };
  return {
    ensureAttached: () => {
      var s;
      if (n) return !0;
      const i = ((s = e.getViewportInfo()) == null ? void 0 : s.scrollContainer) ?? null;
      return i ? (n = i, i.addEventListener("scroll", r, { passive: !0 }), !0) : !1;
    },
    setOnUserScroll: (i) => {
      o = i;
    },
    getSnapshot: () => {
      const i = e.getViewportInfo();
      if (!i) return null;
      let s = null, a = null;
      for (const l of i.blocks)
        if (l.markdown.trim().length !== 0 && (a = l, l.top >= 0)) {
          s = { markdown: l.markdown };
          break;
        }
      return !s && a && (s = { markdown: a.markdown }), { anchor: s, progress: i.progress };
    },
    applyAnchor: (i) => {
      const s = e.getMarkdownBlocks();
      if (!s) return !1;
      const a = i.trim();
      if (!a) return !1;
      const l = Fn(i);
      for (const c of s) {
        const d = c.markdown.trim();
        if (d && (d === a || l && Fn(c.markdown) === l))
          return t = Date.now() + kt, e.scrollToBlock(c.pos, "start"), !0;
      }
      return !1;
    },
    applyProgress: (i) => {
      t = Date.now() + kt, e.scrollToProgress(i);
    },
    revealMarkdown: (i) => {
      const s = e.getMarkdownBlocks();
      if (!s) return !1;
      const a = Fn(i);
      if (!a) return !1;
      for (const l of s)
        if (l.markdown.includes(a))
          return t = Date.now() + kt, e.scrollToBlock(l.pos, "auto"), !0;
      return !1;
    },
    revealBlock: (i) => {
      t = Date.now() + kt, e.scrollToBlock(i, "auto");
    },
    destroy: () => {
      n == null || n.removeEventListener("scroll", r), n = null;
    }
  };
}, Rz = (e) => {
  let t = 0, n = null;
  const o = e.scrollDOM, r = () => {
    Date.now() < t || n == null || n();
  };
  return o.addEventListener("scroll", r, { passive: !0 }), {
    setOnUserScroll: (i) => {
      n = i;
    },
    getSnapshot: () => {
      const i = o.getBoundingClientRect();
      let s = null, a = null;
      for (const c of e.viewportLineBlocks) {
        const d = e.documentTop + c.top;
        if (d + c.height <= i.top || d >= i.bottom)
          continue;
        const u = e.state.doc.lineAt(c.from);
        if (u.text.trim().length !== 0 && (a = u.text, d >= i.top)) {
          s = { markdown: u.text };
          break;
        }
      }
      !s && a && (s = { markdown: a });
      const l = Math.max(0, o.scrollHeight - o.clientHeight);
      return {
        anchor: s,
        progress: l > 0 ? Math.min(1, Math.max(0, o.scrollTop / l)) : 0
      };
    },
    applyAnchor: (i) => {
      const s = e.state.doc.toString();
      let a = s.indexOf(i);
      if (a < 0) {
        const u = Fn(i);
        a = u ? s.indexOf(u) : -1;
      }
      if (a < 0) return !1;
      const l = e.state.doc.lineAt(a), c = e.lineBlockAt(l.from), d = o.getBoundingClientRect();
      return t = Date.now() + kt, o.scrollTop += e.documentTop + c.top - d.top, !0;
    },
    applyProgress: (i) => {
      const s = Math.max(0, o.scrollHeight - o.clientHeight);
      t = Date.now() + kt, o.scrollTop = Math.max(0, Math.min(1, i)) * s;
    },
    revealMarkdown: (i) => {
      const s = e.state.doc.toString();
      let a = s.indexOf(i);
      if (a < 0) {
        const u = Fn(i);
        a = u ? s.indexOf(u) : -1;
      }
      if (a < 0) return !1;
      const l = e.state.doc.lineAt(a), c = o.getBoundingClientRect(), d = e.coordsAtPos(l.from);
      if (d && d.top >= c.top && d.bottom <= c.bottom)
        return !0;
      if (t = Date.now() + kt, d)
        d.top < c.top ? o.scrollTop += d.top - c.top : d.bottom > c.bottom && (o.scrollTop += d.bottom - c.bottom);
      else {
        const u = e.lineBlockAt(l.from);
        o.scrollTop = e.documentTop + u.top - c.height / 2;
      }
      return !0;
    },
    revealPos: (i) => {
      const s = e.lineBlockAt(i), a = e.documentTop + s.top, l = a + s.height, c = o.scrollTop, d = c + o.clientHeight;
      a >= c && l <= d || (t = Date.now() + kt, a < c ? o.scrollTop = Math.max(0, a) : o.scrollTop = Math.max(0, l - o.clientHeight));
    },
    destroy: () => {
      o.removeEventListener("scroll", r);
    }
  };
}, Nz = (e, t, n, o) => {
  let r = -1;
  for (let i = 0; i < e.length; i += 1) {
    const s = e[i];
    if (!s) break;
    if (t(s) <= n)
      r = i;
    else
      break;
  }
  return r;
}, Pz = (e, t) => {
  let n = 0;
  const o = Math.min(e.length, t.length);
  for (; n < o && e.charCodeAt(n) === t.charCodeAt(n); )
    n += 1;
  let r = e.length, i = t.length;
  for (; r > n && i > n && e.charCodeAt(r - 1) === t.charCodeAt(i - 1); )
    r -= 1, i -= 1;
  return { from: n, to: r, insert: t.slice(n, i) };
}, Dz = (e, t) => {
  var x;
  const n = Iz(e), o = Rz(t);
  let r = !1, i = 0, s = 0, a = null, l = t.state.doc, c = t.state.doc.toString(), d = null, u = 0;
  const h = (T) => {
    if (r) return;
    const L = T === "meditor" ? n : o, S = T === "meditor" ? o : n, I = L.getSnapshot();
    I && (I.anchor && S.applyAnchor(I.anchor.markdown) || S.applyProgress(I.progress));
  }, p = (T) => {
    r || (a = T, !i && (i = requestAnimationFrame(() => {
      i = 0;
      const L = a;
      a = null, L && h(L);
    })));
  }, g = () => {
    const T = t.state.doc.toString();
    if (T === c) return;
    c = T, e.setMarkdown(T);
    const L = t.state.selection.main, S = Math.min(L.anchor, L.head), I = Math.max(L.anchor, L.head);
    e.setMarkdownSelection(S, I);
  }, y = () => {
    r || !t.hasFocus || g();
  };
  (x = t.contentDOM) == null || x.addEventListener("input", y);
  const f = () => {
    u = 0;
    const T = d;
    if (d = null, r || T === null || t.hasFocus) return;
    const L = t.state.doc.toString();
    L !== T && (t.dispatch({ changes: Pz(L, T), addToHistory: !1 }), l = t.state.doc);
  }, w = (T) => {
    r || t.hasFocus || (d = T, u || (u = window.setTimeout(f, Az)));
  }, b = (T, L) => {
    const S = e.getMarkdownBlocks();
    if (!S || S.length === 0 || !e.setMarkdownSelection(T, L)) return;
    const I = Nz(S, (J) => J.start, T), O = I >= 0 ? S[I] : void 0;
    O && n.revealBlock(O.pos);
  }, k = () => {
    const T = e.getMarkdownSelection();
    if (!T) return;
    const L = t.state.doc.toString();
    let S = T.start, I = T.end;
    if (T.text.length > 0 && L.slice(S, I) !== T.text) {
      const J = L.indexOf(T.text);
      J >= 0 && (S = J, I = J + T.text.length);
    }
    if (S = Math.max(0, Math.min(S, L.length)), I = Math.max(S, Math.min(I, L.length)), I <= S) return;
    const O = t.state.selection.main;
    O.anchor === S && O.head === I || (t.dispatch({ selection: { anchor: S, head: I }, addToHistory: !1 }), o.revealPos(S));
  }, v = () => {
    const T = t.state.selection.main;
    T.from !== T.to && t.dispatch({ selection: { anchor: T.head, head: T.head }, addToHistory: !1 });
  }, E = () => {
    if (r) return;
    if (t.state.doc !== l) {
      l = t.state.doc, t.hasFocus && g();
      return;
    }
    if (!t.hasFocus) return;
    const T = t.state.selection.main;
    if (!T.empty) {
      b(Math.min(T.anchor, T.head), Math.max(T.anchor, T.head));
      return;
    }
    e.clearMarkdownSelectionHighlight();
    const L = t.state.doc.lineAt(T.head);
    L.text.trim().length !== 0 && n.revealMarkdown(L.text);
  };
  document.addEventListener("selectionchange", E), n.setOnUserScroll(() => p("meditor")), o.setOnUserScroll(() => p("partner"));
  const M = () => {
    if (r) return;
    let T = !1;
    try {
      T = n.ensureAttached();
    } catch {
      T = !1;
    }
    T || (s = requestAnimationFrame(M));
  };
  return M(), {
    notifyMeditorCursor: (T) => {
      if (r || !T) return;
      if (e.getMarkdownSelection()) {
        k();
        return;
      }
      v(), o.revealMarkdown(T.markdown);
    },
    notifyMeditorContent: w,
    destroy: () => {
      var T;
      r = !0, (T = t.contentDOM) == null || T.removeEventListener("input", y), document.removeEventListener("selectionchange", E), window.clearTimeout(u), u = 0, d = null, i && cancelAnimationFrame(i), i = 0, s && cancelAnimationFrame(s), s = 0, n.destroy(), o.destroy();
    }
  };
}, Bz = "https://edge.microsoft.com/translate/translatetext", _z = 40, Oz = 6e3, Hz = /\{\{(\d+)\}\}/g, Fz = async (e, t, n, o) => {
  const r = await fetch(
    `${n}?from=&to=${encodeURIComponent(t)}&isEnterpriseClient=false`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e),
      signal: o
    }
  );
  if (!r.ok)
    throw new Error(`[meditor] translate request failed: HTTP ${r.status}`);
  return (await r.json()).map((s, a) => {
    var c, d;
    const l = (d = (c = s.translations) == null ? void 0 : c[0]) == null ? void 0 : d.text;
    if (typeof l != "string")
      throw new Error(`[meditor] translate response malformed at item ${a}`);
    return l;
  });
}, $z = (e) => {
  const t = (e.match(/[\u3400-\u9fff]/g) ?? []).length, n = (e.match(/[A-Za-z]/g) ?? []).length;
  return t > n ? "en" : "zh-Hans";
}, jz = () => {
  const e = [];
  return {
    chunks: e,
    push: (t, n) => (e.push({ text: t, verbatim: n }), `{{${e.length - 1}}}`)
  };
}, cn = (e) => (t, n, o) => {
  e.lastIndex = n;
  const r = e.exec(t);
  return r ? [e.lastIndex, o.push(r[0], !0)] : null;
}, Kz = [
  // 字面 `{{n}}`:保护用户已有的同形文本,同时避免与回填占位符冲突。
  cn(/\{\{\d+\}\}/y),
  // 行内代码(`code` / ``code``)。
  cn(/`+[^`\n]*`+/y),
  // 图片 ![alt](src)。
  cn(/!\[[^\]\n]*\]\([^()\n]*\)/y),
  // 链接 [label](url):仅链接文字送翻;骨架 [ 与 ](url) 全部占位符保护,
  // 防止接口把 ASCII 括号本地化为全角(CJK 方向实测会发生)破坏 markdown 链接。
  (e, t, n) => {
    const o = /\[([^\]\n]*)\]\(([^()\n]*)\)/y;
    o.lastIndex = t;
    const r = o.exec(e);
    if (!r)
      return null;
    if ((r[1] ?? "").trim().length === 0)
      return [o.lastIndex, n.push(r[0] ?? "", !0)];
    const i = n.push("[", !0), s = n.push(r[1] ?? "", !1), a = n.push(`](${r[2] ?? ""})`, !0);
    return [o.lastIndex, `${i}${s}${a}`];
  },
  // 自动链接 <https://…>。
  cn(/<https?:\/\/[^\s>\n]+>/iy),
  // 行内公式 $x^2$。
  cn(/\$[^$\n]+\$/y),
  // 行内 HTML 标签。
  cn(/<\/?[A-Za-z][^>\n]*>/y)
], In = (e, t) => {
  let n = "", o = 0;
  for (; o < e.length; ) {
    let r = null;
    for (const i of Kz)
      if (r = i(e, o, t), r)
        break;
    if (r) {
      n += r[1], o = r[0];
      continue;
    }
    n += e[o], o += 1;
  }
  return n;
}, Oa = (e) => /^\s{0,3}(`{3,}|~{3,})/.test(e), Wz = (e) => /^\s{0,3}(?:[-*_]\s?){3,}$/.test(e), Uz = (e) => {
  const t = e.trim();
  if (!t.startsWith("|") || !t.endsWith("|"))
    return null;
  const n = [];
  let o = "";
  for (let r = 1; r < t.length - 1; r += 1) {
    const i = t[r];
    if (i === "\\" && t[r + 1] === "|") {
      o += "\\|", r += 1;
      continue;
    }
    if (i === "|") {
      n.push(o), o = "";
      continue;
    }
    o += i;
  }
  return n.push(o), n;
}, Vz = (e, t, n) => {
  if (n.inFence)
    return Oa(e) && (n.inFence = !1), { literal: e, prefix: "", protectedText: null };
  if (Oa(e))
    return n.inFence = !0, { literal: e, prefix: "", protectedText: null };
  const o = e.trim();
  if (n.inMath)
    return o.endsWith("$$") && (n.inMath = !1), { literal: e, prefix: "", protectedText: null };
  if (o.startsWith("$$"))
    return o.length > 4 && o.endsWith("$$") || (n.inMath = !0), { literal: e, prefix: "", protectedText: null };
  if (o.length === 0 || Wz(e) || /^\s{0,3}</.test(e))
    return { literal: e, prefix: "", protectedText: null };
  const r = Uz(e);
  if (r)
    return r.every((d) => /^\s*:?-{3,}:?\s*$/.test(d)) ? { literal: e, prefix: "", protectedText: null } : { literal: null, prefix: "", protectedText: `|${r.map((d) => In(d, t)).join("|")}|` };
  const i = /^(\s{0,3}#{1,6}\s+)(.*)$/.exec(e);
  if (i)
    return { literal: null, prefix: i[1] ?? "", protectedText: In(i[2] ?? "", t) };
  const s = /^(\s{0,3}(?:>\s?)+)(.*)$/.exec(e);
  if (s && (s[2] ?? "").length > 0)
    return { literal: null, prefix: s[1] ?? "", protectedText: In(s[2] ?? "", t) };
  const a = /^(\s*(?:[-*+]|\d{1,9}[.)])\s+(?:\[[ xX]\]\s+)?)(.*)$/.exec(e);
  return a && (a[2] ?? "").length > 0 ? { literal: null, prefix: a[1] ?? "", protectedText: In(a[2] ?? "", t) } : { literal: null, prefix: "", protectedText: In(e, t) };
}, qz = (e) => {
  const t = jz(), n = { inFence: !1, inMath: !1 };
  return { lines: e.split(/\r?\n/).map((r) => Vz(r, t, n)), chunks: t.chunks };
}, Ha = (e, t) => [...e.matchAll(/\{\{(\d+)\}\}/g)].map((o) => o[1]).every((o) => t.includes(`{{${o}}}`)), Gz = async (e, t) => {
  const n = qz(e), o = (t == null ? void 0 : t.endpoint) ?? Bz, r = new Array(n.chunks.length), i = [];
  if (n.chunks.forEach((h, p) => {
    h.verbatim || h.text.trim().length === 0 || i.push({
      text: h.text,
      apply: (g) => {
        r[p] = g;
      }
    });
  }), n.lines.forEach((h) => {
    if (h.protectedText === null)
      return;
    const p = h.protectedText.replace(/\{\{\d+\}\}/g, "");
    /[A-Za-z\u3400-\u9fff]/.test(p) && i.push({
      text: h.protectedText,
      apply: (g) => {
        g !== void 0 && (h.translatedText = g);
      }
    });
  }), i.length === 0)
    return e;
  const s = (t == null ? void 0 : t.to) ?? $z(i.map((h) => h.text).join(`
`));
  let a = [], l = 0;
  const c = async () => {
    if (a.length === 0)
      return;
    const h = await Fz(
      a.map((p) => p.text),
      s,
      o,
      t == null ? void 0 : t.signal
    );
    a.forEach((p, g) => {
      const y = h[g];
      if (typeof y != "string")
        throw new Error("[meditor] translate response truncated");
      p.apply(y);
    }), a = [], l = 0;
  };
  for (const h of i)
    a.length > 0 && (a.length >= _z || l + h.text.length > Oz) && await c(), a.push(h), l += h.text.length;
  await c();
  const d = (h) => {
    const p = n.chunks[h];
    if (!p)
      return "";
    const g = r[h];
    return p.verbatim || typeof g != "string" || !Ha(p.text, g) ? p.text : g;
  }, u = (h) => h.replace(Hz, (p, g) => d(Number(g)));
  return n.lines.map((h) => {
    if (h.literal !== null)
      return h.literal;
    if (h.protectedText === null)
      return h.prefix;
    let p = h.protectedText;
    return h.translatedText !== void 0 && Ha(h.protectedText, h.translatedText) && (p = h.translatedText), h.prefix + u(p);
  }).join(`
`);
}, zi = new ke("zt-md-comment-anchor"), Xz = "ppb", Fa = (e, t) => {
  const n = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map();
  let r = (t == null ? void 0 : t.counter) ?? 0;
  const i = /* @__PURE__ */ new Map();
  if (t && t.doc === e)
    return t;
  if (t) {
    const a = /* @__PURE__ */ new Map();
    t.idToPos.forEach((l, c) => {
      const d = t.doc.nodeAt(l);
      if (d) {
        const u = a.get(d.textContent) ?? 0;
        a.set(d.textContent, u + 1), i.set(`${d.textContent}\0${u}`, c);
      }
    });
  }
  const s = /* @__PURE__ */ new Map();
  return e.forEach((a, l) => {
    const c = a.textContent, d = s.get(c) ?? 0;
    s.set(c, d + 1);
    const u = `${c}\0${d}`;
    let h = i.get(u);
    h || (r += 1, h = `${Xz}${r.toString(36)}`), n.set(l, h), o.set(h, l);
  }), { doc: e, blockIds: n, idToPos: o, counter: r };
}, Yz = () => new ye({
  key: zi,
  state: {
    init: (e, t) => Fa(t.doc, null),
    apply: (e, t) => e.docChanged ? Fa(e.doc, t) : t
  }
}), Zz = ue(() => Yz()), Jz = (e) => zi.getState(e.state) ?? null, Qz = (e, t) => {
  const n = Jz(e), o = n == null ? void 0 : n.idToPos.get(t);
  return o === void 0 ? null : o;
};
class e1 {
  constructor() {
    /** 文档 → 评论列表。 */
    m(this, "buckets", /* @__PURE__ */ new Map());
  }
  /**
   * 列出评论。
   */
  list(t) {
    return [...this.buckets.get(t) ?? []];
  }
  /**
   * 追加评论。
   */
  append(t, n) {
    const o = this.buckets.get(t) ?? [];
    o.push(n), this.buckets.set(t, o);
  }
  /**
   * 更新评论。
   */
  update(t, n) {
    const o = this.buckets.get(t);
    o && this.buckets.set(t, o.map((r) => r.id === n.id ? n : r));
  }
  /**
   * 删除评论。
   */
  remove(t, n) {
    const o = this.buckets.get(t);
    o && this.buckets.set(t, o.filter((r) => r.id !== n));
  }
}
const t1 = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, n1 = (e, t, n, o) => {
  if (t === "")
    return { from: 0, to: e.length, drifted: !1 };
  let r = e.indexOf(t);
  if (r >= 0)
    return { from: r, to: r + t.length, drifted: r !== n || r + t.length !== o };
  let i = t;
  for (; i.length > 4; )
    if (i = i.slice(0, Math.max(4, Math.floor(i.length * 0.8))), r = e.indexOf(i), r >= 0)
      return { from: r, to: r + t.length, drifted: !0 };
  return null;
}, o1 = (e, t, n) => {
  const { documentId: o, author: r } = n, i = () => Promise.resolve(t.list(o)).then(
    (s) => [...s].sort((a, l) => a.createdAt.localeCompare(l.createdAt))
  );
  return {
    createFromSelection: (s) => {
      const a = s.trim();
      if (a === "")
        return Promise.resolve(null);
      const l = e.getSelectionAnchor();
      if (!l)
        return Promise.resolve(null);
      const c = {
        id: t1(),
        blockId: l.blockId,
        quotedText: l.blockText.slice(l.from, l.to),
        relFrom: l.from,
        relTo: l.to,
        ...r ? { author: r } : {},
        body: a,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        resolved: !1
      };
      return Promise.resolve(t.append(o, c)).then(() => c);
    },
    listResolved: () => i().then(async (s) => {
      var d, u;
      const a = e.getMarkdown(), l = ((d = e.getBlockAnchors) == null ? void 0 : d.call(e)) ?? null, c = [];
      for (const h of s) {
        let p = null;
        if (l ? p = ((u = l.get(h.blockId)) == null ? void 0 : u.text) ?? null : a !== null && (p = a), p === null) {
          c.push({ comment: h, status: "stale" });
          continue;
        }
        const g = n1(p, h.quotedText, h.relFrom, h.relTo);
        if (!g) {
          c.push({ comment: h, status: "stale" });
          continue;
        }
        c.push({ comment: h, status: "ok", range: { from: g.from, to: g.to }, drifted: g.drifted });
      }
      return c;
    }),
    setResolved: (s, a) => i().then(async (l) => {
      const c = l.find((d) => d.id === s);
      c && await t.update(o, { ...c, resolved: a });
    }),
    remove: (s) => Promise.resolve(t.remove(o, s)).then(() => {
    })
  };
}, $a = 50;
class r1 {
  constructor() {
    /** 文档 → 快照列表(追加序;list 时倒序输出)。 */
    m(this, "buckets", /* @__PURE__ */ new Map());
  }
  /**
   * 追加快照。
   */
  append(t, n) {
    const o = this.buckets.get(t) ?? [];
    o.push(n), o.length > $a && o.splice(0, o.length - $a), this.buckets.set(t, o);
  }
  /**
   * 列出快照(新 → 旧)。
   */
  list(t) {
    return [...this.buckets.get(t) ?? []].reverse();
  }
  /**
   * 读取单条快照。
   */
  get(t, n) {
    var o;
    return ((o = this.buckets.get(t)) == null ? void 0 : o.find((r) => r.id === n)) ?? null;
  }
  /**
   * 删除单条快照。
   */
  remove(t, n) {
    const o = this.buckets.get(t);
    if (!o)
      return;
    const r = o.filter((i) => i.id !== n);
    r.length !== o.length && (r.length === 0 ? this.buckets.delete(t) : this.buckets.set(t, r));
  }
  /**
   * 清空该文档全部快照。
   */
  clear(t) {
    this.buckets.delete(t);
  }
}
const i1 = () => `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, s1 = 45e3, a1 = (e, t, n) => {
  const { documentId: o, autoSnapshotIntervalMs: r = s1 } = n;
  let i = null, s = null;
  const a = (l, c) => {
    const d = e.getMarkdown();
    if (d === null || d === i)
      return Promise.resolve(null);
    const u = {
      id: i1(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      origin: l,
      markdown: d,
      ...c ? { label: c } : {}
    };
    return i = d, Promise.resolve(t.append(o, u)).then(() => u);
  };
  return r > 0 ? (i = e.getMarkdown(), s = setInterval(() => {
    a("auto").catch((l) => {
      console.error("[meditor collab] auto snapshot failed", l);
    });
  }, r)) : i = e.getMarkdown(), {
    snapshot: (l) => a("manual", l),
    restore: (l) => Promise.resolve(t.get(o, l)).then((c) => c ? Promise.resolve(a("restore")).then(() => (e.setMarkdown(c.markdown), i = c.markdown, !0)) : !1),
    list: () => Promise.resolve(t.list(o)).then((l) => l),
    remove: (l) => Promise.resolve(t.remove(o, l)).then(() => {
    }),
    destroy: () => {
      s !== null && (clearInterval(s), s = null);
    }
  };
}, l1 = (e) => {
  const t = Qe(e);
  return {
    historyPanelTitle: t.historyPanelTitle,
    historyPanelEmpty: t.historyPanelEmpty,
    historyPanelRestore: t.historyPanelRestore,
    historyPanelDelete: t.historyPanelDelete,
    historyPanelSave: t.historyPanelSave,
    historyPanelRestoreConfirm: t.historyPanelRestoreConfirm,
    historyPanelDeleteConfirm: t.historyPanelDeleteConfirm,
    historyOriginAuto: t.historyOriginAuto,
    historyOriginManual: t.historyOriginManual,
    historyOriginRestore: t.historyOriginRestore,
    historyOperationFailed: t.historyOperationFailed
  };
}, c1 = (e, t) => e === "auto" ? t.historyOriginAuto : e === "manual" ? t.historyOriginManual : t.historyOriginRestore, q1 = (e, t, n = "zh-CN") => {
  const o = l1(n), r = document.createElement("div");
  r.className = "zt-md-history-panel", e.appendChild(r);
  let i = null;
  const s = () => {
    r.querySelectorAll(":scope > .zt-md-history-error").forEach((c) => c.remove());
    const l = document.createElement("div");
    l.className = "zt-md-history-error", l.textContent = o.historyOperationFailed, r.insertBefore(l, r.firstChild), i !== null && clearTimeout(i), i = setTimeout(() => {
      l.remove(), i = null;
    }, 4e3);
  }, a = () => {
    r.textContent = "";
    const l = document.createElement("div");
    l.className = "zt-md-history-head";
    const c = document.createElement("span");
    c.textContent = o.historyPanelTitle, l.appendChild(c);
    const d = document.createElement("button");
    d.type = "button", d.className = "zt-md-history-save", d.textContent = o.historyPanelSave, d.addEventListener("click", () => {
      t.snapshot().then(() => a()).catch(s);
    }), l.appendChild(d), r.appendChild(l), Promise.resolve(t.list()).then((u) => {
      if (!r.isConnected)
        return;
      if (u.length === 0) {
        const p = document.createElement("div");
        p.className = "zt-md-history-empty", p.textContent = o.historyPanelEmpty, r.appendChild(p);
        return;
      }
      const h = document.createElement("div");
      h.className = "zt-md-history-list";
      for (const p of u) {
        const g = document.createElement("div");
        g.className = "zt-md-history-row";
        const y = document.createElement("span");
        y.className = "zt-md-history-label";
        const f = new Date(p.createdAt);
        y.textContent = `${p.label ?? `${f.toLocaleDateString()} ${f.toLocaleTimeString()}`} · ${c1(p.origin, o)}`, y.title = p.markdown.slice(0, 200), g.appendChild(y);
        const w = document.createElement("button");
        w.type = "button", w.className = "zt-md-history-restore", w.textContent = o.historyPanelRestore, w.addEventListener("click", () => {
          window.confirm(o.historyPanelRestoreConfirm) && t.restore(p.id).then(() => a()).catch(s);
        }), g.appendChild(w);
        const b = document.createElement("button");
        b.type = "button", b.className = "zt-md-history-remove", b.textContent = o.historyPanelDelete, b.addEventListener("click", () => {
          window.confirm(o.historyPanelDeleteConfirm) && t.remove(p.id).then(() => a()).catch(s);
        }), g.appendChild(b), h.appendChild(g);
      }
      r.appendChild(h);
    }).catch(s);
  };
  return a(), {
    refresh: a,
    destroy: () => {
      i !== null && (clearTimeout(i), i = null), r.remove();
    }
  };
}, G1 = (e, t, n = "zh-CN", o = {}) => {
  const r = Qe(n), i = document.createElement("div");
  i.className = "zt-md-comments-panel", e.appendChild(i);
  const s = document.createElement("textarea");
  s.className = "zt-md-comments-input", s.rows = 2, s.placeholder = r.commentsPanelPlaceholder;
  const a = document.createElement("div");
  a.className = "zt-md-comments-hint", a.hidden = !0;
  let l = null;
  const c = (h) => {
    a.textContent = h, a.hidden = !1, l !== null && clearTimeout(l), l = setTimeout(() => {
      a.hidden = !0, l = null;
    }, 4e3);
  }, d = () => {
    a.hidden = !0, l !== null && (clearTimeout(l), l = null);
  }, u = () => {
    i.textContent = "";
    const h = document.createElement("div");
    h.className = "zt-md-comments-head", h.textContent = r.commentsPanelTitle, i.appendChild(h);
    const p = document.createElement("div");
    p.className = "zt-md-comments-composer", p.appendChild(s);
    const g = document.createElement("button");
    g.type = "button", g.className = "zt-md-comments-add", g.textContent = r.commentsPanelAdd, g.addEventListener("click", () => {
      s.value.trim() !== "" && t.createFromSelection(s.value).then((y) => {
        if (!y) {
          c(r.commentsPanelSelectFirst);
          return;
        }
        d(), s.value = "", u();
      });
    }), p.appendChild(g), i.appendChild(p), i.appendChild(a), t.listResolved().then((y) => {
      if (!i.isConnected)
        return;
      if (y.length === 0) {
        const w = document.createElement("div");
        w.className = "zt-md-comments-empty", w.textContent = r.commentsPanelEmpty, i.appendChild(w);
        return;
      }
      const f = document.createElement("div");
      f.className = "zt-md-comments-list";
      for (const w of y) {
        const b = document.createElement("div");
        b.className = "zt-md-comments-card", w.comment.resolved && b.classList.add("zt-md-comments-card-resolved"), w.status === "stale" && b.classList.add("zt-md-comments-card-stale");
        const k = document.createElement("div");
        k.className = "zt-md-comments-quote", k.textContent = w.comment.quotedText || "…", o.jumpToBlock && (k.classList.add("zt-md-comments-quote-clickable"), k.addEventListener("click", () => {
          var L;
          (((L = o.jumpToBlock) == null ? void 0 : L.call(o, w.comment.blockId)) ?? !1) || c(r.commentsPanelStaleAnchor);
        })), b.appendChild(k);
        const v = document.createElement("div");
        if (v.className = "zt-md-comments-body", v.textContent = `${w.comment.author ? `${w.comment.author}: ` : ""}${w.comment.body}`, b.appendChild(v), w.status === "stale") {
          const T = document.createElement("div");
          T.className = "zt-md-comments-stale-tag", T.textContent = r.commentsPanelStale, b.appendChild(T);
        }
        const E = document.createElement("div");
        E.className = "zt-md-comments-actions";
        const M = document.createElement("button");
        M.type = "button", M.className = "zt-md-comments-action", M.textContent = w.comment.resolved ? r.commentsPanelReopen : r.commentsPanelResolve, M.addEventListener("click", () => {
          t.setResolved(w.comment.id, !w.comment.resolved).then(() => u());
        }), E.appendChild(M);
        const x = document.createElement("button");
        x.type = "button", x.className = "zt-md-comments-action zt-md-comments-action-danger", x.textContent = r.commentsPanelDelete, x.addEventListener("click", () => {
          t.remove(w.comment.id).then(() => u());
        }), E.appendChild(x), b.appendChild(E), f.appendChild(b);
      }
      i.appendChild(f);
    });
  };
  return u(), {
    refresh: u,
    destroy: () => {
      l !== null && (clearTimeout(l), l = null), i.remove();
    }
  };
}, d1 = {
  connecting: "collabStatusConnecting",
  connected: "collabStatusConnected",
  disconnected: "collabStatusDisconnected"
}, X1 = (e, t, n = "zh-CN") => {
  const o = Qe(n), r = document.createElement("div");
  r.className = "zt-md-collab-status", r.dataset.status = "connecting";
  const i = document.createElement("span");
  i.className = "zt-md-collab-status-dot";
  const s = document.createElement("span");
  s.className = "zt-md-collab-status-text", s.textContent = o.collabStatusConnecting, r.append(i, s);
  const a = (d) => {
    r.dataset.status = d, s.textContent = o[d1[d]];
  }, l = t.onCollabStatus;
  if (!l)
    return { destroy: () => {
    } };
  const c = l(a);
  return e.appendChild(r), {
    destroy: () => {
      c(), r.remove();
    }
  };
}, ja = "zt-md-comment-jump-highlight", u1 = (e, t, n = {}) => {
  const {
    documentId: o = "default",
    historyStore: r = new r1(),
    history: i,
    commentStore: s = new e1(),
    author: a,
    locale: l = "zh-CN"
  } = n, c = a1(e, r, {
    documentId: o,
    ...i
  });
  try {
    t.editor.use(Zz);
  } catch (f) {
    console.error("[meditor collab] comment anchor plugin registration failed", f);
  }
  const d = () => Bn(
    t.editor,
    Pn,
    (w) => w.state != null
  ), u = () => {
    const f = d();
    return f ? zi.getState(f.state) ?? null : null;
  }, h = {
    getMarkdown: () => e.getMarkdown(),
    getSelectionAnchor: () => {
      const f = d(), w = u();
      if (!f || !w)
        return null;
      const { from: b, to: k } = f.state.selection;
      if (b === k)
        return null;
      let v;
      try {
        const O = f.state.doc.resolve(b);
        v = O.depth >= 1 ? O.before(1) : O.pos;
      } catch {
        return null;
      }
      const E = w.blockIds.get(v);
      if (!E)
        return null;
      const M = E, x = f.state.doc.nodeAt(v);
      if (!x)
        return null;
      const T = x.textContent, L = (O) => Math.max(0, Math.min(T.length, O)), S = L(b - v - 1), I = L(k - v - 1);
      return { blockId: M, blockText: T, from: Math.min(S, I), to: Math.max(S, I) };
    },
    getBlockAnchors: () => {
      const f = u();
      if (!f)
        return null;
      const w = /* @__PURE__ */ new Map();
      return f.idToPos.forEach((b, k) => {
        const v = f.doc.nodeAt(b);
        v && w.set(k, { text: v.textContent });
      }), w;
    }
  }, p = o1(h, s, {
    documentId: o,
    ...a ? { author: a } : {}
  }), g = (f) => {
    const w = d();
    if (!w || w.isDestroyed)
      return !1;
    const b = Qz(w, f);
    if (b === null)
      return !1;
    try {
      const k = de.near(
        w.state.doc.resolve(Math.min(b + 1, w.state.doc.content.size)),
        1
      );
      w.dispatch(w.state.tr.setSelection(k).scrollIntoView());
    } catch {
      return !1;
    }
    try {
      const k = w.domAtPos(b), v = k.node, E = v instanceof HTMLElement && v.childNodes[k.offset] instanceof HTMLElement ? v.childNodes[k.offset] : v instanceof HTMLElement ? v : null;
      E && (E.classList.add(ja), window.setTimeout(() => {
        E.classList.remove(ja);
      }, 1e3));
    } catch {
    }
    return !0;
  };
  let y = null;
  return {
    history: c,
    comments: p,
    enableRealtime: (f) => y ? Promise.resolve(y) : OC(t.editor, f).then((w) => (y = w, w)),
    get realtime() {
      return y;
    },
    getSelectionAnchor: () => h.getSelectionAnchor(),
    getBlockTexts: () => {
      const f = h.getBlockAnchors();
      if (!f)
        return null;
      const w = /* @__PURE__ */ new Map();
      return f.forEach((b, k) => w.set(k, b.text)), w;
    },
    jumpToCommentAnchor: g,
    destroy: () => {
      c.destroy(), y == null || y.destroy(), y = null;
    }
  };
}, h1 = () => ({
  matchCount: 0,
  matchIndex: 0,
  isInvalidExpression: !1
});
function Y1(e) {
  var Et, zt, zn, Mn;
  const {
    root: t,
    defaultValue: n = "",
    readOnly: o = !1,
    locale: r,
    messages: i,
    className: s,
    placeholder: a,
    maxHeight: l,
    headerSlot: c,
    slashMenu: d,
    imageUpload: u,
    shortcutMode: h = "modShift",
    theme: p = "light",
    debounceMs: g = 250,
    toolbar: y,
    blockHandle: f,
    chineseSymbols: w,
    layoutBlock: b,
    scrollContainerSelector: k,
    onCursorNavigate: v,
    onSearchSnapshotChange: E,
    translateEndpoint: M,
    autoPair: x,
    emojiAutocomplete: T,
    markdownFeatures: L,
    resolveImageUrl: S,
    strictLineBreaks: I,
    smartPunctuation: O,
    codeBlock: J,
    headingNumbering: V,
    onHeadingsChange: K,
    onOutlineOpenChange: z
  } = e, H = (f == null ? void 0 : f.enabled) ?? (y == null ? void 0 : y.mode) !== "simple", D = Qe(r, i, a), {
    wrapper: N,
    toolbarHostDiv: ee,
    searchPanelDiv: re,
    editorArea: B,
    outlinePanelDiv: te,
    aiPanelDiv: G,
    portalContainer: fe,
    contentPortalContainer: Ce
  } = bz({
    root: t,
    theme: p,
    readOnly: o,
    locale: r,
    blockHandleEnabled: H,
    className: s,
    headerSlot: c,
    strictLineBreaks: I === !0,
    headingNumbering: V === !0,
    resolvedMessages: D,
    maxHeight: l
  }), W = e.value !== void 0;
  let U = W ? e.value : n;
  const X = (R) => {
    var pe;
    U = R, ne == null || ne.notifyMeditorContent(R), (pe = e.onChange) == null || pe.call(e, R);
  };
  let se = h1();
  const ae = (R) => {
    se = R, ve == null || ve.updateSnapshot(R), E == null || E(R);
  };
  let ne = null, le = null, me = !1, Pe = !1, Te = null, j = null, F = !1, A = null, P = !1, $ = null, Y = !1, Z = null, ge = null, we = null, ze = null, ce = !1, he = null;
  const Se = ((Et = e.ai) == null ? void 0 : Et.enabled) === !0;
  let He = null, Fe = !1, Ee = null, Ut = [...((zt = e.ai) == null ? void 0 : zt.models) ?? []];
  const Vt = (R) => {
    R === ce || R && Y || (ce = R, R ? (he || (he = Ez({
      host: te,
      messages: D,
      // 编辑区即滚动容器(maxHeight 内滚或随宿主页面滚动均由其承接)。
      scrollContainer: B,
      onJump: (pe) => {
        oe.scrollToHeading(pe);
      }
    })), he.setHeadings(oe.getHeadings() ?? []), he.open()) : he == null || he.close(), ze == null || ze.setMode({ active: R }), z == null || z(R));
  }, vt = (R) => {
    var pe, Ue;
    !Se || R === Fe || (Fe = R, R ? (Ee || (Ee = Lz({
      host: G,
      messages: D,
      ai: {
        models: Ut,
        // 缺省内置 OpenAI 兼容 SSE 客户端;宿主可注入自有网关实现。
        streamChat: ((pe = e.ai) == null ? void 0 : pe.streamChat) ?? Mz,
        ...(Ue = e.ai) != null && Ue.systemPrompt ? { systemPrompt: e.ai.systemPrompt } : {}
      },
      delegate: {
        // 生成开始:编辑器锁定并在光标处建占位块(未就绪返回 false 放弃本次)。
        beginStream: () => oe.aiStream.begin(),
        appendChunk: (it) => {
          oe.aiStream.append(it);
        },
        endStream: (it) => {
          oe.aiStream.end(it);
        },
        cancelStream: (it) => {
          oe.aiStream.cancel(it);
        },
        failStream: () => {
          oe.aiStream.fail();
        }
      }
    })), Ee.open()) : Ee == null || Ee.close(), He == null || He.setMode({ active: R }));
  }, oe = pz({
    root: B,
    portalContainer: fe,
    contentPortalContainer: Ce,
    toolbarHost: ee,
    markdown: U,
    readOnly: o,
    messages: D,
    locale: r,
    slashMenu: d,
    imageUpload: u,
    shortcutMode: h,
    // 滚动容器选择器(缺省 meditor 自带类名,行为不变;宿主改类名时经此注入)。
    scrollContainerSelector: k,
    // 纯导航光标 → 内部双栏同步引擎 + 外部回调(引擎先行,外部兜底)。
    onCursorNavigate: (R) => {
      ne == null || ne.notifyMeditorCursor(R), v == null || v(R);
    },
    // AI 未启用时从工具栏剔除 AI 按钮(与宿主 exclude 叠加)。
    toolbar: Se ? y : { ...y, exclude: [...(y == null ? void 0 : y.exclude) ?? [], "ai"] },
    // 传入解析后的生效值(简洁模式默认关),createEditor 据此决定是否注册块手柄插件。
    blockHandle: { enabled: H },
    chineseSymbols: w,
    // 显示控制布局块能力配置(js 沙箱执行开关等)。
    layoutBlock: b,
    // 自动配对括号(默认开)。
    autoPair: x,
    // Emoji `:` 输入自动补全(默认开)。
    emojiAutocomplete: T,
    // Markdown 扩展语法开关(行内公式/上下标/高亮/Mermaid;缺省全开)。
    markdownFeatures: L,
    // 图片显示地址解析器(相对路径图片显示期转换)。
    resolveImageUrl: S,
    // 严格换行(GFM)/智能标点/代码块行为。
    strictLineBreaks: I,
    smartPunctuation: O,
    codeBlock: J,
    // 标题清单变更(宿主回调 + 内部大纲面板增量刷新共用同一推送)。
    onHeadingsChange: (R) => {
      he == null || he.setHeadings(R), K == null || K(R);
    },
    // 大纲面板开关态变更(宿主据此同步菜单/侧栏态)。
    onOutlineOpenChange: z,
    // 搜索面板在 runtime 之后才创建,回调运行时 searchPanel 变量已初始化。
    onOpenSearch: () => En(),
    // 工具栏翻译按钮 → 整篇翻译编排;按钮态由就绪回调注入的 API 驱动。
    onToggleTranslate: () => {
      Cn();
    },
    onTranslateApiReady: (R) => {
      le = R;
    },
    // 工具栏布局按钮 → 布局模式编排;按钮态由就绪回调注入的 API 驱动。
    onToggleLayoutMode: () => {
      qt(!P);
    },
    onLayoutModeApiReady: (R) => {
      A = R;
    },
    // 工具栏源码按钮 → 源码模式编排;按钮态由就绪回调注入的 API 驱动。
    onToggleSourceMode: () => {
      Ct(!Y);
    },
    onSourceModeApiReady: (R) => {
      $ = R;
    },
    // 工具栏大纲按钮 → 大纲面板开关;按钮态由就绪回调注入的 API 驱动。
    onToggleOutline: () => {
      Vt(!ce);
    },
    onOutlineApiReady: (R) => {
      ze = R;
    },
    // 工具栏 AI 按钮 → AI 会话框开关;按钮态由就绪回调注入的 API 驱动。
    onToggleAi: () => {
      vt(!Fe);
    },
    onAiApiReady: (R) => {
      He = R;
    },
    // slash 菜单插入布局块后自动进入布局模式(正常模式下块不可见)。
    onRequestLayoutMode: () => {
      qt(!0);
    },
    onChange: X,
    onSearchSnapshotChange: ae
  }), Qn = (R) => {
    N.setAttribute("data-focus-mode", R ? "on" : "off"), oe.setFocusMode(R);
  }, eo = (R) => {
    N.setAttribute("data-typewriter-mode", R ? "on" : "off"), oe.setTypewriterMode(R);
  }, qt = (R) => {
    P = R, N.setAttribute("data-layout-mode", R ? "on" : "off"), oe.setLayoutModeActive(R), A == null || A.setMode({ active: R });
  }, vn = () => {
    Z && (Z.style.height = "auto", Z.style.height = `${Z.scrollHeight}px`);
  }, Gt = (R) => {
    Y && Z && Z.value !== R && (Z.value = R, vn());
  }, to = () => {
    Z && (vn(), U = Z.value, we !== null && clearTimeout(we), we = setTimeout(() => {
      we = null, X(U);
    }, g));
  }, Ct = (R) => {
    if (!(R === Y || o || me) && !(R && oe.aiStream.isStreaming())) {
      if (Y = R, N.setAttribute("data-source-mode", R ? "on" : "off"), R) {
        ve == null || ve.close(), Vt(!1), Fe && vt(!1), Z || (Z = document.createElement("textarea"), Z.className = "meditor-source-editor", Z.setAttribute("aria-label", D.toolbarSourceModeTitle), Z.spellcheck = !1, Z.addEventListener("input", to), B.appendChild(Z)), ge = U, Z.value = ge;
        const pe = B.scrollTop;
        requestAnimationFrame(() => {
          vn(), B.scrollTop = pe, Z == null || Z.focus(), Z == null || Z.setSelectionRange(0, 0);
        });
      } else {
        if (we !== null && (clearTimeout(we), we = null), Z && ge !== null && Z.value !== ge) {
          const pe = Z.value;
          oe.setMarkdown(pe), W || (U = pe), X(pe);
        }
        ge = null;
      }
      $ == null || $.setMode({ active: R });
    }
  }, Xt = (R, pe) => {
    R && (ve == null || ve.close());
    const Ue = B.scrollTop;
    oe.setMarkdown(pe), oe.setEditable(!R), requestAnimationFrame(() => {
      B.scrollTop = Ue;
    }), me = R, N.setAttribute("data-translate", R ? "true" : "false"), N.setAttribute("data-readonly", o ? "true" : "false"), B.classList.toggle("zt-md-readonly", R || o), B.classList.toggle("zt-md-editable", !(R || o)), B.setAttribute("aria-readonly", String(R || o)), le == null || le.setMode({ active: R, loading: !1 });
  };
  async function Cn() {
    if (Pe || Y || oe.aiStream.isStreaming())
      return;
    if (me) {
      const pe = Te ?? "";
      Te = null, Xt(!1, pe);
      return;
    }
    const R = oe.getMarkdown() ?? U;
    if (R.trim().length !== 0) {
      if (j && j.source === R) {
        Te = R, Xt(!0, j.result);
        return;
      }
      Pe = !0, le == null || le.setMode({ active: !1, loading: !0 });
      try {
        const pe = await Gz(
          R,
          M !== void 0 ? { endpoint: M } : void 0
        );
        if (F)
          return;
        if ((oe.getMarkdown() ?? U) !== R) {
          console.info("[meditor] translate skipped: document changed during translation"), le == null || le.setMode({ active: !1, loading: !1 });
          return;
        }
        j = { source: R, result: pe }, Te = R, Xt(!0, pe);
      } catch (pe) {
        console.error("[meditor] translate failed", pe), F || le == null || le.setMode({ active: !1, loading: !1, failed: !0 });
      } finally {
        Pe = !1;
      }
    }
  }
  const et = () => {
    if (B.querySelector(":scope > .zt-md-error"))
      return;
    const R = document.createElement("div");
    R.className = "zt-md-error", R.setAttribute("role", "alert"), R.textContent = D.initError, B.appendChild(R);
  };
  try {
    oe.editor.create().then(() => {
      requestAnimationFrame(() => {
        oe.installRuntimePlugins();
      });
    }).catch((R) => {
      console.error("[meditor] editor.create() failed", R), console.error("[meditor] stack:", R == null ? void 0 : R.stack), et();
    });
  } catch (R) {
    console.error("[meditor] editor.create() sync failed", R), et();
  }
  const Yt = ((zn = e.collab) == null ? void 0 : zn.enabled) === !0 ? u1(
    {
      getMarkdown: () => oe.getMarkdown() ?? U,
      setMarkdown: (R) => {
        oe.aiStream.isStreaming() || (oe.setMarkdown(R), W || (U = R), Gt(R));
      }
    },
    oe,
    {
      ...(Mn = e.collab) != null && Mn.documentId ? { documentId: e.collab.documentId } : {},
      locale: r
    }
  ) : null;
  let ve = null, $e = {
    search: "",
    replace: "",
    caseSensitive: !1,
    wholeWord: !1,
    regexp: !1
  };
  const En = () => {
    ve || (ve = vz({
      container: re,
      messages: D,
      onOptionsChange: (R) => {
        $e = { ...$e, ...R }, oe.searchController.updateQuery($e);
      },
      onFindNext: () => {
        oe.searchController.findNext();
      },
      onFindPrevious: () => {
        oe.searchController.findPrevious();
      },
      onClose: () => {
        N.setAttribute("data-search-open", "false");
      },
      onReplaceCurrent: (R) => {
        $e = { ...$e, replace: R }, oe.searchController.replaceCurrent();
      },
      onReplaceAll: (R) => {
        $e = { ...$e, replace: R }, oe.searchController.replaceAll();
      }
    })), ve.open(), N.setAttribute("data-search-open", "true");
  }, _e = (R) => {
    if ((Yn() ? R.metaKey : R.ctrlKey) && R.key === "f") {
      !me && !Y && (R.preventDefault(), En());
      return;
    }
    if (R.key === "Escape") {
      ve == null || ve.close(), Fe && !(Ee != null && Ee.isGenerating()) && vt(!1), Y && R.target === Z && Ct(!1);
      return;
    }
    if (!(!ve || R.isComposing || !(R.target instanceof HTMLInputElement && R.target.closest(".zt-md-search-panel") !== null) || R.key !== "Enter")) {
      if (R.preventDefault(), R.shiftKey) {
        oe.searchController.findPrevious();
        return;
      }
      oe.searchController.findNext();
    }
  };
  t.addEventListener("keydown", _e);
  const tt = (R) => {
    if (R.button !== 0 || o || me || Y || R.target !== B || !B.querySelector(".ProseMirror"))
      return;
    const pe = B.getBoundingClientRect();
    R.clientX > pe.left + B.clientWidth || (R.preventDefault(), oe.focusEditor({ top: R.clientY, left: R.clientX }));
  };
  B.addEventListener("mousedown", tt);
  let no = e.value;
  const oo = W ? setInterval(() => {
    const R = e.value;
    if (R !== void 0 && R !== no) {
      if (oe.aiStream.isStreaming())
        return;
      no = R, U = R, oe.setMarkdown(R), Gt(R);
    }
  }, g) : null;
  return {
    getMarkdown: () => U,
    getStats: () => oe.getStats(),
    collab: Yt,
    setMarkdown: (R) => {
      oe.aiStream.isStreaming() || (oe.setMarkdown(R), W || (U = R), Gt(R));
    },
    focus: () => {
      oe.focusEditor();
    },
    openSearch: () => En(),
    closeSearch: () => ve == null ? void 0 : ve.close(),
    getSearchSnapshot: () => se,
    updateSearchOptions: (R) => {
      $e = { ...$e, ...R }, ve == null || ve.updateOptions($e), oe.searchController.updateQuery($e);
    },
    replaceCurrent: () => {
      oe.searchController.replaceCurrent();
    },
    replaceAll: () => {
      oe.searchController.replaceAll();
    },
    getViewportInfo: () => oe.getViewportInfo(),
    getCursorBlock: () => oe.getCursorBlock(),
    getMarkdownBlocks: () => oe.getMarkdownBlocks(),
    scrollToBlock: (R, pe) => {
      oe.scrollToBlock(R, pe);
    },
    scrollToProgress: (R) => {
      oe.scrollToProgress(R);
    },
    toggleTranslate: () => Cn(),
    setLayoutMode: (R) => {
      qt(R);
    },
    toggleLayoutMode: () => (qt(!P), P),
    setSourceMode: (R) => {
      Ct(R);
    },
    toggleSourceMode: () => (Ct(!Y), Y),
    getMarkdownForLLM: () => Cy(U),
    getHeadings: () => oe.getHeadings(),
    scrollToHeading: (R) => oe.scrollToHeading(R),
    setAiOpen: (R) => {
      vt(R);
    },
    toggleAi: () => (vt(!Fe), Fe),
    isAiOpen: () => Fe,
    setAiModels: (R) => {
      Ut = [...R], Ee == null || Ee.setModels(Ut);
    },
    setOutlineOpen: (R) => {
      Vt(R);
    },
    toggleOutline: () => (Vt(!ce), ce),
    isOutlineOpen: () => ce,
    getStandaloneHtml: () => oe.getStandaloneHtml(),
    setSpellcheck: (R) => {
      oe.setSpellcheck(R);
    },
    setSpellcheckLang: (R) => {
      oe.setSpellcheckLang(R);
    },
    setFocusMode: (R) => {
      Qn(R);
    },
    setTypewriterMode: (R) => {
      eo(R);
    },
    setSplitPartner: (R) => {
      ne == null || ne.destroy(), ne = null, R && (ne = Dz(
        {
          getViewportInfo: () => oe.getViewportInfo(),
          getMarkdownBlocks: () => oe.getMarkdownBlocks(),
          scrollToBlock: (pe, Ue) => {
            oe.scrollToBlock(pe, Ue);
          },
          scrollToProgress: (pe) => {
            oe.scrollToProgress(pe);
          },
          // 内容双向同步基准:以运行时序列化结果为准(实时性优于闭包缓存)。
          getMarkdown: () => oe.getMarkdown() ?? U,
          setMarkdown: (pe) => {
            oe.aiStream.isStreaming() || (oe.setMarkdown(pe), W || (U = pe), Gt(pe));
          },
          getMarkdownSelection: () => oe.getMarkdownSelection(),
          setMarkdownSelection: (pe, Ue) => oe.setMarkdownSelection(pe, Ue),
          clearMarkdownSelectionHighlight: () => oe.clearMarkdownSelectionHighlight()
        },
        R
      ));
    },
    destroy: () => {
      F = !0, we !== null && (clearTimeout(we), we = null), ne == null || ne.destroy(), ne = null, he == null || he.destroy(), he = null, Ee == null || Ee.destroy(), Ee = null, oo !== null && clearInterval(oo), Yt == null || Yt.destroy(), t.removeEventListener("keydown", _e), B.removeEventListener("mousedown", tt), oe.destroy(), N.remove();
    }
  };
}
export {
  sa as MEDITOR_LAYOUT_FENCE_PREFIX,
  Ty as MEDITOR_LAYOUT_HTML_KIND,
  xy as MEDITOR_LAYOUT_JS_KIND,
  e1 as MemoryCommentStore,
  r1 as MemoryHistoryStore,
  X1 as createCollabStatusBadge,
  G1 as createCommentsPanel,
  Y1 as createMeditor,
  u1 as createMeditorCollab,
  q1 as createVersionHistoryPanel,
  Jz as getCommentAnchorState,
  Sy as isHtmlLayoutFenceLang,
  Ql as isMeditorLayoutFenceLang,
  Ly as isScriptLayoutFenceLang,
  V1 as listMeditorLayoutBlocks,
  Py as parseLayoutDirective,
  Cy as stripMeditorLayoutBlocks
};
