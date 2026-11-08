/**
 * lib/virtual-list.ts — 零依赖虚拟列表助手(视图无关)
 *
 * 大数据集只渲染可视窗口条目:上下占位(spacer)撑起总滚动高度,窗口内条目由
 * 视图按 [start, end) 区间重建(不做 DOM 复用,重建即渲染)。设计要点:
 * - 不绑定 table 语义:table/kanban/gallery 等任何纵向条目容器都可接入,
 *   视图只需提供条目容器(anchor)、条目数与预估条目高度;
 * - 行高两种模式:固定行高(estimatedItemHeight 即精确值)与测量缓存
 *   (首行实测 + 假设同高,滚动时对窗口内条目逐个 measureItem 修正);
 * - 几何驱动而非绑定滚动容器:不假设谁在滚(页面 / 任意 overflow 祖先),
 *   document 捕获 scroll + window resize + ResizeObserver(anchor) 任意一个
 *   触发都按「窗口视口 ∩ 裁剪祖先矩形」重新求解窗口,嵌套滚动天然正确;
 * - scroll 高频触发经 rAF 节流,窗口未变化时不回调视图;destroy() 摘除全部监听。
 */

/**
 * 可视窗口区间(条目下标左闭右开)+ 上下占位高度(px)+ 总滚动高度(px)。
 */
export interface VirtualListRange {
  /** 窗口起始条目下标(含)。 */
  start: number;
  /** 窗口结束条目下标(不含)。 */
  end: number;
  /** 首条目之前的占位高度(px,撑起窗口上方滚动空间)。 */
  padTop: number;
  /** 末条目之后的占位高度(px,撑起窗口下方滚动空间)。 */
  padBottom: number;
  /** 条目总高度(px,含窗口外;由实测/预估高度累计)。 */
  totalHeight: number;
}

/**
 * 窗口求解参数(纯几何,不触碰 DOM;computeVirtualRange 用)。
 */
export interface VirtualRangeParams {
  /** 条目总数。 */
  count: number;
  /** 预估条目高度(px;测量缓存中缺失条目也用它兜底)。 */
  estimatedItemHeight: number;
  /** 视口上下额外渲染条数。 */
  overscan: number;
  /** 可视区顶边相对条目区顶边的偏移(px;条目区顶边即 anchor 顶边)。 */
  relTop: number;
  /** 可视区底边相对条目区顶边的偏移(px)。 */
  relBottom: number;
  /** 逐条实测高度缓存(null = 固定行高模式;缺失下标回落预估高度)。 */
  measurements: readonly number[] | null;
}

/**
 * VirtualList 构造参数。
 */
export interface VirtualListOptions {
  /** 条目容器(窗口条目的直接父元素;其顶边 = 条目 0 的顶边基准)。 */
  anchor: HTMLElement;
  /** 条目总数。 */
  count: number;
  /** 预估条目高度(px)。 */
  estimatedItemHeight: number;
  /** 视口上下额外渲染条数(默认 8)。 */
  overscan?: number;
  /** 固定行高模式:为 true 时忽略 measureItem(行高恒等于预估高度)。 */
  fixedItemHeight?: boolean;
  /** 可视窗口变化回调(窗口或占位变化时触发;构造时同步回调一次)。 */
  onRangeChange: (range: VirtualListRange) => void;
}

/** 未挂载时(DOM 树外构建)按「预估视口 = N 条」给初始窗口,挂载后自动修正。 */
const FALLBACK_VIEWPORT_ITEMS = 24;
/** 默认视口上下额外渲染条数。 */
const DEFAULT_OVERSCAN = 8;
/** 高度噪声阈值:实测与缓存差值不超过该像素数时不触发重算(亚像素抖动抑制)。 */
const MEASURE_EPSILON = 0.5;

/**
 * 纯函数:由几何参数求解可视窗口(无 DOM 依赖,可单测)。
 *
 * start 取「底边越过可视区顶」的首个条目,end 取「顶边到达可视区底」的首个
 * 条目(左闭右开);异常输入(视口翻出条目区)时收敛到边界并保证至少渲染
 * 一条——测量缓存模式需要真实行才能启动实测。
 */
export const computeVirtualRange = (params: VirtualRangeParams): VirtualListRange => {
  const { count, estimatedItemHeight, overscan, relTop, relBottom, measurements } = params;
  if (count <= 0) {
    return { start: 0, end: 0, padTop: 0, padBottom: 0, totalHeight: 0 };
  }
  // 条目高度:实测优先,缺失/非法回落预估(测量缓存与固定模式由此统一)。
  const heightAt = (index: number): number => {
    const measured = measurements?.[index];
    return typeof measured === 'number' && measured > 0 ? measured : estimatedItemHeight;
  };

  // 起点:跳过整体位于可视区顶之上的条目。
  let start = 0;
  let offset = 0;
  while (start < count) {
    const height = heightAt(start);
    if (offset + height > relTop) {
      break;
    }
    offset += height;
    start += 1;
  }
  // 滚动位置越过末尾(布局修正瞬间可能出现):收敛到最后一条。
  if (start >= count) {
    start = count - 1;
    // 回退一条,维持不变式 offset === offsetOf(start)(此前 offset 累计到 total)。
    offset -= heightAt(start);
  }

  // 终点:扫到条目顶边越过可视区底为止。
  let end = start;
  let endOffset = offset;
  const limit = Math.max(relBottom, relTop);
  while (end < count && endOffset < limit) {
    endOffset += heightAt(end);
    end += 1;
  }
  // 空窗兜底:至少渲染一条(视口高度 0 / 未挂载时也先出真实行)。
  if (end <= start) {
    // 补计该行高度,维持不变式 endOffset === offsetOf(end)(total 与占位依赖它)。
    endOffset += heightAt(end);
    end = Math.min(count, start + 1);
  }

  // overscan 向两侧扩窗;占位高度按扩窗后的边界计算(扩窗行在视口外仍真实存在)。
  const finalStart = Math.max(0, start - overscan);
  const finalEnd = Math.min(count, end + overscan);

  // 总高(从 end 处续扫到末尾;单趟 O(n),rAF 节流下开销可忽略)。
  let total = endOffset;
  for (let index = end; index < count; index += 1) {
    total += heightAt(index);
  }

  // 占位:窗口边界回退/推进 overscan 段(维持 offsetOf 语义,避免从 0 重扫)。
  let padTop = offset;
  for (let index = start - 1; index >= finalStart; index -= 1) {
    padTop -= heightAt(index);
  }
  let padEndOffset = endOffset;
  for (let index = end; index < finalEnd; index += 1) {
    padEndOffset += heightAt(index);
  }
  return {
    start: finalStart,
    end: finalEnd,
    padTop,
    padBottom: Math.max(0, total - padEndOffset),
    totalHeight: total,
  };
};

/**
 * 虚拟列表助手:监听视口变化,求解可视窗口并回调视图。
 */
export class VirtualList {
  /** 条目容器。 */
  private readonly anchor: HTMLElement;
  /** 条目总数。 */
  private count: number;
  /** 预估条目高度。 */
  private estimatedItemHeight: number;
  /** 视口上下额外渲染条数。 */
  private readonly overscan: number;
  /** 固定行高模式开关。 */
  private readonly fixed: boolean;
  /** 逐条实测高度缓存(固定模式为 null)。 */
  private measurements: number[] | null;
  /** 窗口变化回调。 */
  private readonly onRangeChange: (range: VirtualListRange) => void;
  /** 上一次回调的窗口(去重:窗口与占位均未变化时不重复回调)。 */
  private lastRange: VirtualListRange | null = null;
  /** rAF 句柄(0 = 无待执行重算)。 */
  private rafId = 0;
  /** anchor 尺寸观察器(挂载/行高变化时触发重算)。 */
  private readonly observer: ResizeObserver | null;
  /** 是否已销毁。 */
  private destroyed = false;

  /** 视口变化入口(rAF 节流后重算;具名引用保证 add/remove 配对)。 */
  private readonly handleViewportChange = (): void => {
    this.scheduleRecompute();
  };

  /**
   * 初始化并同步求解一次窗口(未挂载时给预估初始窗口,挂载后自动修正)。
   */
  constructor(options: VirtualListOptions) {
    this.anchor = options.anchor;
    this.count = Math.max(0, Math.floor(options.count));
    this.estimatedItemHeight = Math.max(1, options.estimatedItemHeight);
    this.overscan = Math.max(0, options.overscan ?? DEFAULT_OVERSCAN);
    this.fixed = options.fixedItemHeight === true;
    this.measurements = this.fixed
      ? null
      : new Array<number>(this.count).fill(this.estimatedItemHeight);
    this.onRangeChange = options.onRangeChange;

    // 任意层滚动(document 捕获兜住页面与全部嵌套滚动容器)+ 视口尺寸变化 + anchor 自身尺寸变化。
    document.addEventListener('scroll', this.handleViewportChange, {
      capture: true,
      passive: true,
    });
    window.addEventListener('resize', this.handleViewportChange);
    this.observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(this.handleViewportChange);
    this.observer?.observe(this.anchor);

    this.recompute();
  }

  /**
   * 读取当前窗口(尚未求解/已销毁时返回空窗口)。
   */
  getRange(): VirtualListRange {
    return this.lastRange ?? { start: 0, end: 0, padTop: 0, padBottom: 0, totalHeight: 0 };
  }

  /**
   * 读取实测高度缓存(只读;固定行高模式返回 null)。
   * 供视图计算「窗口外条目的偏移」(如画廊钉住行的中段占位高度),
   * 缺失下标由调用方按 estimatedItemHeight 兜底(与窗口求解规则一致)。
   */
  getMeasurements(): readonly number[] | null {
    return this.measurements;
  }

  /** 读取当前预估条目高度(测量缓存缺失下标的统一兜底值)。 */
  getEstimatedItemHeight(): number {
    return this.estimatedItemHeight;
  }

  /**
   * 更新条目数/预估高度(排序、筛选、数据集变化后调用)。
   * resetMeasurements 为 true 时清空实测缓存(条目顺序已变,旧测量不再可信)。
   */
  update(next: { count: number; estimatedItemHeight?: number; resetMeasurements?: boolean }): void {
    if (this.destroyed) {
      return;
    }
    const nextCount = Math.max(0, Math.floor(next.count));
    if (typeof next.estimatedItemHeight === 'number' && next.estimatedItemHeight > 0) {
      this.estimatedItemHeight = next.estimatedItemHeight;
    }
    if (this.measurements) {
      if (next.resetMeasurements === true) {
        this.measurements = new Array<number>(nextCount).fill(this.estimatedItemHeight);
      } else {
        // 保留下标 0..min-1 的实测,新增下标以预估高度兜底(滚动到实测即修正)。
        const merged = new Array<number>(nextCount).fill(this.estimatedItemHeight);
        const keep = Math.min(this.measurements.length, nextCount);
        for (let index = 0; index < keep; index += 1) {
          merged[index] = this.measurements[index] ?? this.estimatedItemHeight;
        }
        this.measurements = merged;
      }
    }
    this.count = nextCount;
    this.recompute();
  }

  /**
   * 上报条目实测高度(px;仅测量缓存模式生效,固定模式忽略)。
   */
  measureItem(index: number, height: number): void {
    if (this.destroyed || this.fixed || !this.measurements) {
      return;
    }
    if (index < 0 || index >= this.count || !Number.isFinite(height) || height <= 0) {
      return;
    }
    // 取整到百分位;与缓存差值在噪声阈值内不重算(滚动中行高实测天然抖动)。
    const normalized = Math.round(height * 100) / 100;
    const cached = this.measurements[index] ?? this.estimatedItemHeight;
    if (Math.abs(normalized - cached) <= MEASURE_EPSILON) {
      return;
    }
    this.measurements[index] = normalized;
    this.scheduleRecompute();
  }

  /**
   * 强制重算(行高/列宽等布局因素变化时由视图调用;常规情况 RO 已兜住)。
   */
  refresh(): void {
    if (this.destroyed) {
      return;
    }
    this.recompute();
  }

  /**
   * 销毁:摘除全部监听与观察器,取消待执行重算(幂等)。
   */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    document.removeEventListener('scroll', this.handleViewportChange, { capture: true });
    window.removeEventListener('resize', this.handleViewportChange);
    this.observer?.disconnect();
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.lastRange = null;
  }

  /**
   * rAF 节流的重算调度(scroll 高频触发合并为每帧一次)。
   */
  private scheduleRecompute(): void {
    if (this.destroyed || this.rafId !== 0) {
      return;
    }
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      this.recompute();
    });
  }

  /**
   * 求解当前窗口并按需回调视图(窗口与占位均未变化时不回调)。
   */
  private recompute(): void {
    if (this.destroyed) {
      return;
    }
    const range = this.computeRangeFromGeometry();
    if (!range) {
      return;
    }
    const last = this.lastRange;
    if (
      last !== null &&
      last.start === range.start &&
      last.end === range.end &&
      last.padTop === range.padTop &&
      last.padBottom === range.padBottom &&
      last.totalHeight === range.totalHeight
    ) {
      return;
    }
    this.lastRange = range;
    this.onRangeChange(range);
  }

  /**
   * 由实时几何求解窗口参数:可视区 = 窗口视口 ∩ 全部裁剪祖先矩形。
   * 不绑定具体滚动容器——auto/scroll/hidden 祖先都会裁剪内容,逐层求交后
   * 无论「谁在滚」(页面/嵌套容器)结果都正确;条目区顶边即 anchor 顶边。
   */
  private computeRangeFromGeometry(): VirtualListRange | null {
    const params = {
      count: this.count,
      estimatedItemHeight: this.estimatedItemHeight,
      overscan: this.overscan,
      measurements: this.measurements,
    };
    if (!this.anchor.isConnected) {
      // 未挂载:按预估视口给初始窗口,挂载后 ResizeObserver 触发修正。
      return computeVirtualRange({
        ...params,
        relTop: 0,
        relBottom: this.estimatedItemHeight * FALLBACK_VIEWPORT_ITEMS,
      });
    }
    const anchorTop = this.anchor.getBoundingClientRect().top;
    // 视口裁剪:先取窗口视口,再与每个裁剪祖先可见矩形求交。
    let clipTop = 0;
    let clipBottom = window.innerHeight;
    let node: HTMLElement | null = this.anchor.parentElement;
    while (node !== null) {
      const overflowY = window.getComputedStyle(node).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'hidden') {
        const rect = node.getBoundingClientRect();
        if (rect.height > 0) {
          clipTop = Math.max(clipTop, rect.top);
          clipBottom = Math.min(clipBottom, rect.bottom);
        }
      }
      node = node.parentElement;
    }
    return computeVirtualRange({
      ...params,
      relTop: Math.max(0, clipTop - anchorTop),
      relBottom: clipBottom - anchorTop,
    });
  }
}
