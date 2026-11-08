/**
 * views/dropdown.ts — jsonview 通用自定义下拉(替代原生 select)
 *
 * 原生 select 的弹出列表无法定制样式,统一改用「触发钮 + 浮层选项列表」:
 * - 触发钮:button(aria-haspopup/aria-expanded),内容 = 当前选中文案 + 旋转箭头;
 *   经 className 混入尺寸变体(格内满格 zt-jsonview-input / 列头迷你 zt-jsonview-field-type /
 *   顶栏 zt-jsonview-view-select / 面板行 zt-jsonview-query-*),布局类名沿用原 select;
 * - 浮层:absolute 挂在最近定位祖先(offsetParent,最终都落在块容器内,NodeView
 *   stopEvent 就地消费事件,不漏进 ProseMirror 管线);定位用 position:fixed +
 *   触发钮视口坐标(下方放不下向上翻,右缘越界回拉,选项多时限高内部滚动);
 * - 交互:全局同时只开一个;点击外部/滚动/缩放/Escape 关闭(capture 全局监听,仅开启时挂载);
 *   浮层内 ArrowUp/Down 循环移动焦点,Enter/Space 走按钮原生 click,Tab 关闭。
 */
import { subscribeViewportChange } from '../lib/viewport-listener';

/**
 * 下拉选项。
 */
export interface JsonviewDropdownOption {
  /** 选项值。 */
  value: string;
  /** 选项文案(空串渲染为占位破折号,用于「清空」类选项)。 */
  label: string;
  /** 选项图标(内联 SVG 素色,触发钮与浮层选项同步渲染;缺省不渲染)。 */
  icon?: string;
}

/**
 * 下拉回调。
 */
export interface JsonviewDropdownCallbacks {
  /** 选中回调(值为所选项 value;与当前值相同的不触发)。 */
  onSelect: (value: string) => void;
}

/**
 * 下拉构造参数。
 */
export interface JsonviewDropdownParams {
  /** 选项列表。 */
  options: JsonviewDropdownOption[];
  /** 当前选中值。 */
  value: string;
  /** 触发钮附加类(控制尺寸/布局变体)。 */
  className?: string;
  /** 触发钮 aria 标签。 */
  ariaLabel?: string;
  /** 触发钮 hover 标题。 */
  title?: string;
  /** 是否禁用。 */
  disabled?: boolean;
  /** 回调。 */
  callbacks: JsonviewDropdownCallbacks;
}

/** 箭头图标(随 aria-expanded 旋转)。 */
const CARET_SVG =
  '<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2.5 4.25 6 7.75l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** 浮层与触发钮的间距(px)。 */
const POPUP_GAP = 4;

/** 当前开启中的下拉(全局互斥:同一时刻只开一个)。 */
let activeDropdown: JsonviewDropdown | null = null;

/**
 * 自定义下拉组件。
 */
export class JsonviewDropdown {
  /** 触发钮。 */
  readonly dom: HTMLButtonElement;
  /** 选项列表。 */
  private options: JsonviewDropdownOption[];
  /** 当前选中值。 */
  private value: string;
  /** 回调。 */
  private readonly callbacks: JsonviewDropdownCallbacks;
  /** 开启中的浮层(null = 关闭)。 */
  private popup: HTMLElement | null = null;

  /** 全局按下:点击触发钮与浮层以外区域关闭(capture,先于块内 stopEvent)。 */
  private readonly handleDocPointerDown = (event: PointerEvent): void => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (this.popup?.contains(target) || this.dom.contains(target)) {
      return;
    }
    this.close();
  };

  /** 全局按键:Escape 关闭并吞掉(capture),避免漏进编辑器快捷键。 */
  private readonly handleDocKeyDown = (event: KeyboardEvent): void => {
    if (!this.popup || event.key !== 'Escape') {
      return;
    }
    event.stopPropagation();
    this.close(true);
  };

  /** 全局滚动/缩放:浮层不跟随,直接关闭(浮层自身内部滚动除外)。 */
  private readonly handleDocScroll = (event: Event): void => {
    const target = event.target;
    if (target instanceof Node && this.popup?.contains(target)) {
      return;
    }
    this.close();
  };

  /** 视口变化订阅取消函数(resize + 捕获滚动统一绑定;null = 未开启)。 */
  private unsubscribeViewport: (() => void) | null = null;

  /**
   * 初始化下拉(构建触发钮;浮层懒创建)。
   */
  constructor(params: JsonviewDropdownParams) {
    this.options = params.options;
    this.value = params.value;
    this.callbacks = params.callbacks;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = params.className ? `zt-jsonview-dd ${params.className}` : 'zt-jsonview-dd';
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    if (params.ariaLabel) {
      button.setAttribute('aria-label', params.ariaLabel);
    }
    if (params.title) {
      button.title = params.title;
    }
    if (params.disabled) {
      button.disabled = true;
    }
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggle();
    });
    // 触发钮聚焦时方向键直接展开。
    button.addEventListener('keydown', (event) => {
      if (this.popup) {
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.toggle();
      }
    });
    this.dom = button;
    this.syncTrigger();
  }

  /**
   * 整体更新选项与选中值(开启中先收起,防陈旧浮层)。
   */
  setOptions(options: JsonviewDropdownOption[], value: string): void {
    if (this.popup) {
      this.close();
    }
    this.options = options;
    this.setValue(value);
  }

  /**
   * 更新选中值(仅刷新触发钮文案)。
   */
  setValue(value: string): void {
    if (this.popup) {
      this.close();
    }
    this.value = value;
    this.syncTrigger();
  }

  /**
   * 读取当前选中值。
   */
  getValue(): string {
    return this.value;
  }

  /**
   * 销毁(收浮层、摘全局监听)。
   */
  destroy(): void {
    this.close();
  }

  /**
   * 刷新触发钮文案与箭头。
   */
  private syncTrigger(): void {
    const current = this.options.find((option) => option.value === this.value) ?? null;
    const label = current?.label ?? '';
    this.dom.textContent = '';
    // 当前选项图标(素色,缺省不渲染)。
    if (current?.icon) {
      const icon = document.createElement('span');
      icon.className = 'zt-jsonview-dd-icon';
      icon.innerHTML = current.icon;
      this.dom.appendChild(icon);
    }
    const labelSpan = document.createElement('span');
    labelSpan.className = 'zt-jsonview-dd-label';
    labelSpan.dataset.empty = label === '' ? 'true' : 'false';
    labelSpan.textContent = label;
    this.dom.appendChild(labelSpan);
    const caret = document.createElement('span');
    caret.className = 'zt-jsonview-dd-caret';
    caret.innerHTML = CARET_SVG;
    this.dom.appendChild(caret);
  }

  /**
   * 开/关浮层。
   */
  private toggle(): void {
    if (this.popup) {
      this.close(true);
      return;
    }
    if (this.options.length === 0 || this.dom.disabled) {
      return;
    }
    if (activeDropdown && activeDropdown !== this) {
      activeDropdown.close();
    }
    this.open();
  }

  /**
   * 展开浮层(定位 + 焦点移到选中项 + 挂全局监听)。
   */
  private open(): void {
    // 挂在最近定位祖先(块容器)内:NodeView stopEvent 就地消费事件,不漏进编辑器;
    // 定位用 position:fixed + 视口坐标,不依赖 offsetParent 的矩形换算
    // (表格单元格里 offsetParent 是 td,换算值会套错定位基准,浮层跑到左上角)。
    const host = (this.dom.offsetParent as HTMLElement | null) ?? document.body;
    const popup = document.createElement('div');
    popup.className = 'zt-jsonview-dd-pop';
    popup.setAttribute('role', 'listbox');
    this.options.forEach((option) => {
      popup.appendChild(this.buildOption(option));
    });
    popup.addEventListener('keydown', (event) => {
      this.handlePopupKeyDown(event, popup);
    });
    host.appendChild(popup);

    // 定位:默认触发钮下方;视口下方放不下且上方放得下则向上翻;右缘越界回拉。
    // minWidth 取「触发钮宽」与「浮层最小宽 160px」的较大者,窄触发钮(格内)也保证菜单可读。
    const triggerRect = this.dom.getBoundingClientRect();
    const popupWidth = popup.offsetWidth;
    const popupHeight = popup.offsetHeight;
    popup.style.minWidth = `${Math.max(triggerRect.width, 160)}px`;
    const layoutWidth = Math.max(popupWidth, 160);
    let left = triggerRect.left;
    let top = triggerRect.bottom + POPUP_GAP;
    const belowFits = triggerRect.bottom + popupHeight + POPUP_GAP <= window.innerHeight;
    const aboveFits = triggerRect.top - popupHeight - POPUP_GAP >= 0;
    if (!belowFits && aboveFits) {
      top = triggerRect.top - popupHeight - POPUP_GAP;
    }
    const rightOverflow = triggerRect.left + layoutWidth - window.innerWidth + 8;
    if (rightOverflow > 0) {
      left -= rightOverflow;
    }
    popup.style.left = `${Math.max(0, left)}px`;
    popup.style.top = `${Math.max(0, top)}px`;

    this.popup = popup;
    activeDropdown = this;
    this.dom.setAttribute('aria-expanded', 'true');

    document.addEventListener('pointerdown', this.handleDocPointerDown, true);
    document.addEventListener('keydown', this.handleDocKeyDown, true);
    // 滚动/缩放收起:统一经视口变化订阅辅助绑定。
    this.unsubscribeViewport = subscribeViewportChange(this.handleDocScroll);

    // 焦点移到选中项(无选中则首项),方向键即刻可用。
    const selected =
      popup.querySelector<HTMLElement>("[data-selected='true']") ?? popup.querySelector<HTMLElement>('.zt-jsonview-dd-opt');
    selected?.focus({ preventScroll: true });
  }

  /**
   * 构建单个选项钮(选中项打勾)。
   */
  private buildOption(option: JsonviewDropdownOption): HTMLElement {
    const optionEl = document.createElement('button');
    optionEl.type = 'button';
    optionEl.className = 'zt-jsonview-dd-opt';
    optionEl.setAttribute('role', 'option');
    optionEl.dataset.value = option.value;
    optionEl.dataset.selected = option.value === this.value ? 'true' : 'false';
    optionEl.dataset.empty = option.label === '' ? 'true' : 'false';
    optionEl.addEventListener('click', (event) => {
      event.stopPropagation();
      this.pick(option.value);
    });
    // 选项图标(素色)。
    if (option.icon) {
      const icon = document.createElement('span');
      icon.className = 'zt-jsonview-dd-opt-icon';
      icon.innerHTML = option.icon;
      optionEl.appendChild(icon);
    }
    const label = document.createElement('span');
    label.className = 'zt-jsonview-dd-opt-label';
    label.textContent = option.label === '' ? '—' : option.label;
    optionEl.appendChild(label);
    const check = document.createElement('span');
    check.className = 'zt-jsonview-dd-opt-check';
    check.textContent = '✓';
    if (option.value !== this.value) {
      check.hidden = true;
    }
    optionEl.appendChild(check);
    return optionEl;
  }

  /**
   * 浮层键盘导航(焦点在选项钮间循环;Tab 关闭)。
   */
  private handlePopupKeyDown(event: KeyboardEvent, popup: HTMLElement): void {
    const options = Array.from(popup.querySelectorAll<HTMLElement>('.zt-jsonview-dd-opt'));
    const currentIndex = options.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      (options[currentIndex + 1] ?? options[0])?.focus({ preventScroll: true });
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      (options[currentIndex - 1] ?? options[options.length - 1])?.focus({ preventScroll: true });
      return;
    }
    if (event.key === 'Tab') {
      this.close();
    }
  }

  /**
   * 选中并收起(与当前值相同只收起不回调)。
   */
  private pick(value: string): void {
    this.close(true);
    if (value === this.value) {
      return;
    }
    this.value = value;
    this.syncTrigger();
    this.callbacks.onSelect(value);
  }

  /**
   * 收起浮层并摘全局监听(refocus = 焦点还给触发钮)。
   */
  private close(refocus = false): void {
    this.popup?.remove();
    this.popup = null;
    if (activeDropdown === this) {
      activeDropdown = null;
    }
    this.dom.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', this.handleDocPointerDown, true);
    document.removeEventListener('keydown', this.handleDocKeyDown, true);
    this.unsubscribeViewport?.();
    this.unsubscribeViewport = null;
    if (refocus) {
      this.dom.focus({ preventScroll: true });
    }
  }
}
