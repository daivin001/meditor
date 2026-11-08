/**
 * plugins/custom/layout-block/layout-block-effect.ts — 布局指令渲染效果插件
 *
 * 扫描顶层 meditor_layout 指令块(parseLayoutDirective 可解析的 JSON),把指令
 * 合并应用为渲染效果(与编辑模式无关,所见即所得)。三种作用域:
 * - 位置作用域(scope:"next",默认):作用于其后顶层块,直到下一个位置指令块;
 * - 标题绑定(heading):作用于首个文本匹配(去空格精确比对)的顶层标题及其
 *   章节,章节边界为下一个级别 ≤ 该标题的标题(标题改名即失联,已知取舍);
 * - 文档作用域(scope:"document"):取最后一个此类指令,同步 wrapper 的
 *   data-ml-width 属性与 zt-md-ml-c-* class。
 * 一个块同时命中多个指令时按指令块文档顺序合并:width/hidden/align 后者覆盖
 * 前者,class 累加。产出 Decoration.node class(前缀 zt-md-ml-w-、zt-md-ml-hidden、
 * zt-md-ml-align- 与 zt-md-ml-c-)+ wrapper 属性/类。纯只读派生,不产生事务。
 */
import { Plugin, PluginKey } from '@milkdown/prose/state';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import type { EditorView } from '@milkdown/prose/view';
import type { Node as ProseNode } from '@milkdown/prose/model';
import { $prose } from '@milkdown/utils';
import { parseLayoutDirective, type LayoutDirective, type LayoutWidth } from '../../../utils/layout-directive';
import { MEDITOR_LAYOUT_NODE_NAME } from './layout-block-plugin';

/**
 * 效果插件 key。
 */
export const LAYOUT_BLOCK_EFFECT_KEY = new PluginKey<LayoutEffectState>('zt-md-layout-block-effect');

/**
 * 效果插件状态(纯 doc 派生,docChanged 时全量重算)。
 */
export interface LayoutEffectState {
  /** 合并后的 node decorations。 */
  decorations: DecorationSet;
  /** 文档级宽度(最后一个 document 指令;无则 null)。 */
  documentWidth: LayoutWidth | null;
  /** 文档级自定义类名。 */
  documentClasses: string[];
}

/**
 * 顶层条目(遍历中间结构)。
 */
interface LayoutEffectEntry {
  node: ProseNode;
  from: number;
  to: number;
  /** 指令块携带的指令(非指令块为 null)。 */
  directive: LayoutDirective | null;
}

/**
 * 标题绑定指令的解析结果(章节区间)。
 */
interface HeadingBinding {
  directive: LayoutDirective;
  /** 指令块自身位置(合并排序用)。 */
  directiveFrom: number;
  /** 章节起点(标题块 from)。 */
  from: number;
  /** 章节终点(下一同级-or-higher 标题的 from,或文档尾)。 */
  to: number;
}

/**
 * 单遍扫描收集顶层条目。
 */
const collectEntries = (doc: ProseNode): LayoutEffectEntry[] => {
  const entries: LayoutEffectEntry[] = [];
  let pos = 0;
  doc.forEach((node) => {
    const from = pos;
    const to = pos + node.nodeSize;
    pos = to;
    const directive =
      node.type.name === MEDITOR_LAYOUT_NODE_NAME
        ? parseLayoutDirective(String(node.attrs.value ?? ''))
        : null;
    entries.push({ node, from, to, directive });
  });
  return entries;
};

/**
 * 解析标题绑定:首个文本匹配(去空格精确比对)的顶层标题,章节终点为下一个
 * 级别 ≤ 该标题的标题起点(无则文档尾)。无匹配则该指令不生效。
 */
const resolveHeadingBindings = (entries: LayoutEffectEntry[]): HeadingBinding[] => {
  /** 顶层标题信息。 */
  const headings = entries
    .filter((entry) => entry.node.type.name === 'heading')
    .map((entry) => ({
      entry,
      level: Number(entry.node.attrs.level ?? 1),
      text: entry.node.textContent.trim(),
    }));

  const bindings: HeadingBinding[] = [];
  for (const entry of entries) {
    const directive = entry.directive;
    if (!directive?.heading) {
      continue;
    }
    const matched = headings.find((heading) => heading.text === directive.heading);
    if (!matched) {
      continue;
    }
    let to = entries.length > 0 ? entries[entries.length - 1]?.to ?? matched.entry.to : matched.entry.to;
    for (const heading of headings) {
      if (heading.entry.from > matched.entry.from && heading.level <= matched.level) {
        to = heading.entry.from;
        break;
      }
    }
    bindings.push({ directive, directiveFrom: entry.from, from: matched.entry.from, to });
  }
  return bindings;
};

/**
 * 合并作用于同一块的指令集为 decoration class 列表
 * (width/hidden/align 按顺序后者覆盖前者,class 累加)。
 */
const resolveEffectClasses = (directives: LayoutDirective[]): string[] => {
  let width: LayoutWidth | undefined;
  let hidden = false;
  let align: string | undefined;
  const classes: string[] = [];
  for (const directive of directives) {
    if (directive.width) {
      width = directive.width;
    }
    if (directive.hidden !== undefined) {
      hidden = directive.hidden;
    }
    if (directive.align) {
      align = directive.align;
    }
    for (const item of directive.classes) {
      if (!classes.includes(item)) {
        classes.push(item);
      }
    }
  }

  const out: string[] = [];
  if (width && width !== 'normal') {
    out.push(`zt-md-ml-w-${width}`);
  }
  if (hidden) {
    out.push('zt-md-ml-hidden');
  }
  if (align && align !== 'left') {
    out.push(`zt-md-ml-align-${align}`);
  }
  for (const item of classes) {
    out.push(`zt-md-ml-c-${item}`);
  }
  return out;
};

/**
 * 计算整篇效果状态。
 */
const computeLayoutEffectState = (doc: ProseNode): LayoutEffectState => {
  const entries = collectEntries(doc);
  const bindings = resolveHeadingBindings(entries);
  const decorations: Decoration[] = [];
  let documentWidth: LayoutWidth | null = null;
  const documentClasses: string[] = [];

  // 位置作用域状态机 + 逐块合并(指令块自身不吃效果)。
  let current: LayoutDirective | null = null;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    if (entry.directive !== null) {
      // 标题绑定是独立作用域:仅按章节 span 生效,不进入位置/文档状态机。
      if (!entry.directive.heading) {
        if (entry.directive.scope === 'document') {
          // 取最后一个 document 指令。
          documentWidth = entry.directive.width ?? null;
          documentClasses.length = 0;
          documentClasses.push(...entry.directive.classes);
        } else {
          current = entry.directive;
        }
      }
      continue;
    }

    // 命中该块的全部指令:位置作用域(若有)+ 覆盖该块的标题绑定,按指令块
    // 文档顺序合并。
    const applied: LayoutDirective[] = [];
    if (current !== null) {
      applied.push(current);
    }
    for (const binding of bindings) {
      if (entry.from >= binding.from && entry.to <= binding.to) {
        applied.push(binding.directive);
      }
    }
    if (applied.length === 0) {
      continue;
    }
    const classes = resolveEffectClasses(applied);
    if (classes.length > 0) {
      decorations.push(Decoration.node(entry.from, entry.to, { class: classes.join(' ') }));
    }
  }

  return {
    decorations: DecorationSet.create(doc, decorations),
    documentWidth,
    documentClasses,
  };
};

/**
 * 创建布局指令渲染效果插件。
 */
export const createLayoutBlockEffectPlugin = () => {
  return $prose((): Plugin<LayoutEffectState> => {
    return new Plugin<LayoutEffectState>({
      key: LAYOUT_BLOCK_EFFECT_KEY,
      state: {
        // StateField.init 的首参是 EditorStateConfig(doc 可选),用 instance.doc。
        init: (_config, instance) => computeLayoutEffectState(instance.doc),
        apply: (tr, prev) => {
          if (!tr.docChanged) {
            return prev;
          }
          return computeLayoutEffectState(tr.doc);
        },
      },
      props: {
        decorations: (state) => {
          return LAYOUT_BLOCK_EFFECT_KEY.getState(state)?.decorations ?? DecorationSet.empty;
        },
      },
      view: (view: EditorView) => {
        // wrapper 同步:文档级宽度属性 + 自定义 class(增量;wrapper 随编辑器
        // 销毁整体移除,无需清理)。
        let lastWidth: LayoutWidth | null | undefined;
        let lastClasses: readonly string[] = [];

        const sync = (target: EditorView): void => {
          const state = LAYOUT_BLOCK_EFFECT_KEY.getState(target.state);
          if (!state) {
            return;
          }
          const wrapper = target.dom.closest('.zt-md') as HTMLElement | null;
          if (!wrapper) {
            return;
          }
          if (state.documentWidth !== lastWidth) {
            if (state.documentWidth) {
              wrapper.setAttribute('data-ml-width', state.documentWidth);
            } else {
              wrapper.removeAttribute('data-ml-width');
            }
            lastWidth = state.documentWidth;
          }
          const wanted = state.documentClasses.map((item) => `zt-md-ml-c-${item}`);
          for (const item of lastClasses) {
            if (!wanted.includes(item)) {
              wrapper.classList.remove(item);
            }
          }
          for (const item of wanted) {
            if (!lastClasses.includes(item)) {
              wrapper.classList.add(item);
            }
          }
          lastClasses = wanted;
        };

        sync(view);
        return {
          update: (nextView: EditorView) => {
            sync(nextView);
          },
        };
      },
    });
  });
};
