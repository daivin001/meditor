/**
 * views/text-view.ts — Text 文本视图(整库 JSON 代码编辑器)
 *
 * 文本视图不再逐记录渲染段落卡,直接把整库文档以 canonical JSON(2 空格缩进)呈现
 * 在一个代码编辑器里,视觉对齐 markdown 代码块:
 * - 结构:高亮层(pre + code)与输入层(textarea)叠放同一区域,等宽同排版;输入层
 *   文字透明只留光标,选区高亮透出高亮层,滚动同步;
 * - 着色:内置零依赖 JSON 分词器,token 类名与 prism 命名对齐(property/string/
 *   number/boolean/null/keyword/operator/punctuation),配色由 jsonview.css 消费
 *   meditor 的 --zt-* 变量,与代码块同一套色板;
 * - 编辑:input 实时重着色 + 防抖 600ms 提交(parse 合法才回调 onDocChange,非法时
 *   编辑器标红不提交,恢复合法或失焦合法时自动提交);blur 立即提交;
 * - 外部回填(setDoc/undo/redo 回放):整值重写编辑器;
 * - 只读态:仅高亮展示,无输入层;
 * - 右键菜单:格式化 / 全选 / 复制全部 / 清空(只读态仅复制全部),替代原头部工具栏。
 */
import type { JsonviewDoc, JsonviewMessages } from '../types';
import { parseJsonviewValue, serializeJsonviewDoc } from '../validate';
import { subscribeViewportChange } from '../lib/viewport-listener';

/**
 * Text 视图回调。
 */
export interface JsonviewTextViewCallbacks {
  /** 文档变更(kind:'json' 整库编辑)。 */
  onDocChange: (doc: JsonviewDoc, kind: string) => void;
}

/**
 * JSON token 类名映射(prism 命名,与 meditor 代码块配色规则对齐)。
 */
const JSON_TOKEN_CLASSES = {
  property: 'token property',
  string: 'token string',
  number: 'token number',
  boolean: 'token boolean',
  null: 'token null keyword',
  operator: 'token operator',
  punctuation: 'token punctuation'
} as const;

/** JSON token 种类。 */
type JsonTokenKind = keyof typeof JSON_TOKEN_CLASSES;

/**
 * 单个着色 token(类名 null = 纯文本,不包 span)。
 */
interface JsonToken {
  text: string;
  kind: JsonTokenKind | null;
}

/**
 * 着色字符数上限(超出按纯文本渲染,防超大文档逐字符开销)。
 */
const MAX_HIGHLIGHT_CHARS = 100_000;

/** 提交防抖窗口(ms),与内部撤销栈分批静默窗口一致。 */
const COMMIT_IDLE_MS = 600;

/** 代码编辑器高度下限/上限(px)。 */
const CODE_MIN_HEIGHT = 120;
const CODE_MAX_HEIGHT = 420;

/**
 * 扫描一段 JSON 文本生成 token 序列(单遍字符扫描;未闭合字符串兜底到行尾)。
 */
const tokenizeJsonLine = (line: string): JsonToken[] => {
  const tokens: JsonToken[] = [];
  const push = (text: string, kind: JsonTokenKind | null): void => {
    if (text !== '') {
      tokens.push({ text, kind });
    }
  };
  let index = 0;
  while (index < line.length) {
    const char = line[index]!;
    // 空白。
    if (/\s/.test(char)) {
      let end = index + 1;
      while (end < line.length && /\s/.test(line[end]!)) {
        end += 1;
      }
      push(line.slice(index, end), null);
      index = end;
      continue;
    }
    // 字符串(含 \ 转义;后随冒号判定为对象键 property)。
    if (char === '"') {
      let end = index + 1;
      while (end < line.length) {
        if (line[end] === '\\') {
          end = Math.min(end + 2, line.length);
          continue;
        }
        end += 1;
        if (line[end - 1] === '"') {
          break;
        }
      }
      const text = line.slice(index, end);
      let probe = end;
      while (probe < line.length && /\s/.test(line[probe]!)) {
        probe += 1;
      }
      push(text, line[probe] === ':' ? 'property' : 'string');
      index = end;
      continue;
    }
    // 数字。
    const numberMatch = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(line.slice(index));
    if (numberMatch?.[0]) {
      push(numberMatch[0], 'number');
      index += numberMatch[0].length;
      continue;
    }
    // 字面量。
    if (line.startsWith('true', index) || line.startsWith('false', index)) {
      const end = index + (line.startsWith('true', index) ? 4 : 5);
      push(line.slice(index, end), 'boolean');
      index = end;
      continue;
    }
    if (line.startsWith('null', index)) {
      push(line.slice(index, index + 4), 'null');
      index += 4;
      continue;
    }
    // 标点与其余字符逐个消费。
    if (/[{}[\],]/.test(char)) {
      push(char, 'punctuation');
    } else if (char === ':') {
      push(char, 'operator');
    } else {
      push(char, null);
    }
    index += 1;
  }
  return tokens;
};

/**
 * Text 文本视图(JSON 代码编辑器)。
 */
export class JsonviewTextView {
  /** 根元素。 */
  readonly dom: HTMLElement;
  /** 当前文档。 */
  private doc: JsonviewDoc;
  /** 只读态。 */
  private readonly readOnly: boolean;
  /** 当前文案。 */
  private readonly messages: JsonviewMessages;
  /** 回调。 */
  private readonly callbacks: JsonviewTextViewCallbacks;
  /** 编辑器中的原始文本(输入中可能尚未合法;非提交态)。 */
  private code: string;
  /** 当前文本是否可解析为合法文档。 */
  private valid = true;
  /** 提交防抖定时器。 */
  private commitTimer: ReturnType<typeof setTimeout> | null = null;
  /** 编辑器容器。 */
  private readonly editor: HTMLElement;
  /** 高亮层 code 元素(重着色目标)。 */
  private readonly codeEl: HTMLElement;
  /** 输入层(只读态为 null)。 */
  private readonly textarea: HTMLTextAreaElement | null;
  /** 高亮层 pre(滚动同步目标)。 */
  private readonly highlight: HTMLElement;
  /** 高亮/输入叠层容器(JS 撑高目标)。 */
  private readonly codeArea: HTMLElement;
  /** 右键菜单(打开时非 null)。 */
  private contextMenu: HTMLElement | null = null;

  /**
   * 初始化视图(签名与其余视图一致;query 参数仅为接口对齐,代码编辑器不做筛选排序)。
   */
  constructor(
    doc: JsonviewDoc,
    readOnly: boolean,
    messages: JsonviewMessages,
    _query: { filter: unknown; sort: unknown },
    callbacks: JsonviewTextViewCallbacks
  ) {
    this.doc = doc;
    this.readOnly = readOnly;
    this.messages = messages;
    this.callbacks = callbacks;
    this.code = serializeJsonviewDoc(doc);

    this.dom = document.createElement('div');
    this.dom.className = 'zt-jsonview-text-view';

    // 编辑器容器:高亮/输入叠层(原头部格式化工具栏已移除,操作入口收敛到右键菜单)。
    this.editor = document.createElement('div');
    this.editor.className = 'zt-jsonview-code-editor';
    if (readOnly) {
      this.editor.dataset.static = 'true';
    }
    this.dom.appendChild(this.editor);

    // 高亮层 + 输入层叠放于同一容器(pre 定义内容,textarea 透明覆盖只留光标)。
    this.codeArea = document.createElement('div');
    this.codeArea.className = 'zt-jsonview-code-area';
    this.editor.appendChild(this.codeArea);

    this.highlight = document.createElement('pre');
    this.highlight.className = 'zt-jsonview-code-highlight';
    this.highlight.setAttribute('aria-hidden', 'true');
    this.codeEl = document.createElement('code');
    this.codeEl.className = 'zt-jsonview-code-body';
    this.highlight.appendChild(this.codeEl);
    this.codeArea.appendChild(this.highlight);

    // 输入层(编辑态)。
    if (!readOnly) {
      const textarea = document.createElement('textarea');
      textarea.className = 'zt-jsonview-code-input';
      textarea.spellcheck = false;
      textarea.wrap = 'off';
      textarea.value = this.code;
      textarea.addEventListener('input', () => {
        this.handleInput();
      });
      textarea.addEventListener('blur', () => {
        this.commit();
      });
      textarea.addEventListener('scroll', () => {
        this.highlight.scrollTop = textarea.scrollTop;
        this.highlight.scrollLeft = textarea.scrollLeft;
      });
      this.textarea = textarea;
      this.codeArea.appendChild(textarea);
    } else {
      this.textarea = null;
    }

    // 右键菜单(阻止原生菜单,弹出常用操作;只读态仅复制全部)。
    this.editor.addEventListener('contextmenu', (event) => {
      this.openContextMenu(event);
    });

    this.paint();
    this.updateValidity();
    // 首帧布局后按内容高度撑开编辑器(scrollHeight 需已入文档)。
    requestAnimationFrame(() => {
      this.syncSize();
    });
  }

  /**
   * 外部整体替换文档(宿主回声不重写,防打字中光标跳动)。
   */
  setDoc(doc: JsonviewDoc): void {
    const json = serializeJsonviewDoc(doc);
    // 自身提交经宿主 attr 回写回来的回声:与当前编辑器文档一致则只同步引用。
    if (json === serializeJsonviewDoc(this.doc)) {
      this.doc = doc;
      return;
    }
    this.doc = doc;
    this.code = json;
    if (this.textarea) {
      this.textarea.value = json;
    }
    this.paint();
    this.updateValidity();
  }

  /**
   * 读取当前文档。
   */
  getDoc(): JsonviewDoc {
    return this.doc;
  }

  /**
   * 输入处理:更新文本、重着色、更新合法性态、防抖提交。
   */
  private handleInput(): void {
    if (!this.textarea) {
      return;
    }
    this.code = this.textarea.value;
    this.paint();
    this.updateValidity();
    this.syncSize();
    if (this.commitTimer !== null) {
      clearTimeout(this.commitTimer);
    }
    this.commitTimer = setTimeout(() => {
      this.commitTimer = null;
      this.commit();
    }, COMMIT_IDLE_MS);
  }

  /**
   * 提交当前文本(合法才回调宿主;非法保持编辑态不打断输入)。
   */
  private commit(): void {
    if (this.commitTimer !== null) {
      clearTimeout(this.commitTimer);
      this.commitTimer = null;
    }
    // 实例已随视图宿主移除:丢弃过期提交。
    if (!this.dom.isConnected) {
      return;
    }
    const parsed = parseJsonviewValue(this.code);
    if (!parsed.ok) {
      return;
    }
    const next = serializeJsonviewDoc(parsed.doc);
    if (next === serializeJsonviewDoc(this.doc)) {
      return;
    }
    this.doc = parsed.doc;
    this.callbacks.onDocChange(this.doc, 'json');
  }

  /**
   * 格式化当前文本(非法时仅重排可解析内容外不可用,直接忽略)。
   */
  private format(): void {
    const parsed = parseJsonviewValue(this.code);
    if (!parsed.ok) {
      return;
    }
    const formatted = serializeJsonviewDoc(parsed.doc);
    if (formatted === this.code) {
      return;
    }
    this.code = formatted;
    this.doc = parsed.doc;
    if (this.textarea) {
      this.textarea.value = formatted;
      this.syncSize();
    }
    this.paint();
    this.updateValidity();
    this.callbacks.onDocChange(this.doc, 'json');
  }

  /**
   * 清空:重置为保留名称的空库(合法 canonical JSON,立即提交,可撤销)。
   */
  private clearAll(): void {
    const empty: JsonviewDoc = { version: 1, name: this.doc.name, fields: [], records: [] };
    const json = serializeJsonviewDoc(empty);
    this.code = json;
    this.doc = empty;
    if (this.textarea) {
      this.textarea.value = json;
      this.syncSize();
    }
    this.paint();
    this.updateValidity();
    this.callbacks.onDocChange(this.doc, 'json');
  }

  /**
   * 打开右键菜单(视口定位,越界回拉;全局点击/按键/滚动关闭)。
   */
  private openContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'zt-jsonview-code-menu';
    menu.setAttribute('role', 'menu');
    if (!this.readOnly) {
      // 格式化(非法 JSON 时禁用:格式化依赖可解析)。
      const formatItem = this.buildMenuItem(this.messages.codeFormat, () => {
        this.format();
      });
      formatItem.disabled = !this.valid;
      menu.appendChild(formatItem);
      menu.appendChild(
        this.buildMenuItem(this.messages.codeSelectAll, () => {
          this.textarea?.focus();
          this.textarea?.select();
        })
      );
    }
    menu.appendChild(
      this.buildMenuItem(this.messages.codeCopy, () => {
        void navigator.clipboard.writeText(this.code).catch(() => {
          this.copyViaExecCommand();
        });
      })
    );
    if (!this.readOnly) {
      menu.appendChild(this.buildMenuItem(this.messages.codeClear, () => {
        this.clearAll();
      }, 'zt-jsonview-code-menu-item zt-jsonview-code-menu-danger'));
    }

    document.body.appendChild(menu);
    // 视口内回拉(先量尺寸再落位,同一帧内不闪)。
    const menuRect = menu.getBoundingClientRect();
    const left = Math.min(event.clientX, window.innerWidth - menuRect.width - 8);
    const top = Math.min(event.clientY, window.innerHeight - menuRect.height - 8);
    menu.style.left = `${Math.max(0, left)}px`;
    menu.style.top = `${Math.max(0, top)}px`;
    this.contextMenu = menu;

    document.addEventListener('pointerdown', this.handleMenuPointerDown, true);
    document.addEventListener('keydown', this.handleMenuKeyDown, true);
    // 滚动/缩放收起:统一经视口变化订阅辅助绑定。
    this.unsubscribeMenuViewport = subscribeViewportChange(this.handleMenuScroll);
  }

  /**
   * 构建单个菜单项。
   */
  private buildMenuItem(label: string, action: () => void, className = 'zt-jsonview-code-menu-item'): HTMLButtonElement {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = className;
    item.setAttribute('role', 'menuitem');
    item.textContent = label;
    item.addEventListener('click', (event) => {
      event.stopPropagation();
      this.closeContextMenu();
      action();
    });
    return item;
  }

  /**
   * 剪贴板 API 不可用时的复制兜底(临时 textarea + execCommand)。
   */
  private copyViaExecCommand(): void {
    const helper = document.createElement('textarea');
    helper.value = this.code;
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    document.execCommand('copy');
    helper.remove();
  }

  /** 全局按下:点击菜单以外区域关闭(capture)。 */
  private readonly handleMenuPointerDown = (event: PointerEvent): void => {
    const target = event.target;
    if (target instanceof Node && this.contextMenu?.contains(target)) {
      return;
    }
    this.closeContextMenu();
  };

  /** 全局按键:Escape 关闭并吞掉。 */
  private readonly handleMenuKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.closeContextMenu();
    }
  };

  /** 全局滚动/缩放:菜单不跟随,直接关闭。 */
  private readonly handleMenuScroll = (): void => {
    this.closeContextMenu();
  };

  /** 菜单视口变化订阅取消函数(resize + 捕获滚动统一绑定;null = 菜单未开)。 */
  private unsubscribeMenuViewport: (() => void) | null = null;

  /**
   * 关闭右键菜单并摘除全局监听。
   */
  private closeContextMenu(): void {
    this.contextMenu?.remove();
    this.contextMenu = null;
    document.removeEventListener('pointerdown', this.handleMenuPointerDown, true);
    document.removeEventListener('keydown', this.handleMenuKeyDown, true);
    this.unsubscribeMenuViewport?.();
    this.unsubscribeMenuViewport = null;
  }

  /**
   * 重建高亮层(token span 拼装;超长文档降级纯文本)。
   */
  private paint(): void {
    this.codeEl.textContent = '';
    if (this.code.length > MAX_HIGHLIGHT_CHARS) {
      this.codeEl.textContent = this.code;
      return;
    }
    const fragment = document.createDocumentFragment();
    const lines = this.code.split('\n');
    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        fragment.appendChild(document.createTextNode('\n'));
      }
      for (const token of tokenizeJsonLine(line)) {
        if (token.kind === null) {
          fragment.appendChild(document.createTextNode(token.text));
          continue;
        }
        const span = document.createElement('span');
        span.className = JSON_TOKEN_CLASSES[token.kind];
        span.textContent = token.text;
        fragment.appendChild(span);
      }
    });
    this.codeEl.appendChild(fragment);
  }

  /**
   * 更新合法性态(编辑器标红 + 提示行显隐)。
   */
  private updateValidity(): void {
    const ok = parseJsonviewValue(this.code).ok;
    if (ok === this.valid) {
      return;
    }
    this.valid = ok;
    this.editor.dataset.invalid = ok ? 'false' : 'true';
  }

  /**
   * 按内容高度撑开叠层(夹在上下限之间;超出上限由 textarea 滚动并同步高亮层)。
   */
  private syncSize(): void {
    if (!this.textarea) {
      return;
    }
    const height = Math.min(Math.max(this.textarea.scrollHeight, CODE_MIN_HEIGHT), CODE_MAX_HEIGHT);
    this.codeArea.style.height = `${height}px`;
  }
}
