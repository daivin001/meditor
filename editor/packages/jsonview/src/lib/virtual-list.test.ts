/**
 * lib/virtual-list.test.ts — computeVirtualRange 纯函数单测(固定行高/测量缓存/边界)
 *
 * VirtualList 类的几何采样依赖真实 DOM,不在 node 环境测试范围;窗口求解的
 * 全部数学(起点/终点/overscan/占位/总高)收敛在该纯函数,此处覆盖其行为。
 */
import { describe, expect, it } from 'vitest';
import { computeVirtualRange } from './virtual-list';

/** 固定行高模式快捷入参(1000 条 × 30px,总高 30000)。 */
const fixed = (relTop: number, relBottom: number, count = 1000, overscan = 0): ReturnType<typeof computeVirtualRange> =>
  computeVirtualRange({ count, estimatedItemHeight: 30, overscan, relTop, relBottom, measurements: null });

describe('computeVirtualRange — 固定行高', () => {
  it('顶部窗口:渲染视口内条目,占位合计等于总高', () => {
    const range = fixed(0, 600);
    expect(range.start).toBe(0);
    expect(range.end).toBe(20);
    expect(range.padTop).toBe(0);
    expect(range.padBottom).toBe(30000 - 600);
    expect(range.totalHeight).toBe(30000);
  });

  it('中部滚动:窗口平移,上下占位随动且合计等于总高', () => {
    const range = fixed(3000, 3600);
    expect(range.start).toBe(100);
    expect(range.end).toBe(120);
    expect(range.padTop).toBe(3000);
    expect(range.padBottom).toBe(30000 - 3600);
    expect(range.padTop + (range.end - range.start) * 30 + range.padBottom).toBe(range.totalHeight);
  });

  it('overscan 向两侧扩窗,占位按扩窗边界收缩', () => {
    const range = fixed(3000, 3600, 1000, 5);
    expect(range.start).toBe(95);
    expect(range.end).toBe(125);
    expect(range.padTop).toBe(95 * 30);
    expect(range.padBottom).toBe(30000 - 125 * 30);
  });

  it('滚动越过末尾:收敛到最后一条,底部占位为 0', () => {
    const range = fixed(999999, 1000599);
    expect(range.start).toBe(999);
    expect(range.end).toBe(1000);
    expect(range.padTop).toBe(999 * 30);
    expect(range.padBottom).toBe(0);
  });

  it('零高度视口:至少渲染一条(测量模式需真实行启动实测),总高不被少计', () => {
    const range = fixed(0, 0);
    expect(range.start).toBe(0);
    expect(range.end).toBe(1);
    expect(range.padTop).toBe(0);
    expect(range.padBottom).toBe(30000 - 30);
    expect(range.totalHeight).toBe(30000);
    expect(range.padTop + (range.end - range.start) * 30 + range.padBottom).toBe(range.totalHeight);
  });

  it('空数据:空窗口且总高为 0', () => {
    expect(fixed(0, 600, 0)).toEqual({ start: 0, end: 0, padTop: 0, padBottom: 0, totalHeight: 0 });
  });
});

describe('computeVirtualRange — 测量缓存', () => {
  it('缓存缺失的下标回落预估高度', () => {
    const range = computeVirtualRange({
      count: 4,
      estimatedItemHeight: 10,
      overscan: 0,
      relTop: 0,
      relBottom: 1000,
      measurements: [50, 20]
    });
    expect(range.totalHeight).toBe(50 + 20 + 10 + 10);
    expect(range.end).toBe(4);
  });

  it('按实测高度定位窗口与占位(非均匀行高)', () => {
    // 累计偏移:0 / 30 / 60 / 120 / 150。
    const measurements = [30, 30, 60, 30];
    const range = computeVirtualRange({ count: 4, estimatedItemHeight: 10, overscan: 0, relTop: 75, relBottom: 200, measurements });
    expect(range.start).toBe(2);
    expect(range.end).toBe(4);
    expect(range.padTop).toBe(60);
    expect(range.padBottom).toBe(0);
    expect(range.totalHeight).toBe(150);
  });

  it('测量模式下占位与窗口高度仍满足恒等式', () => {
    const measurements = Array.from({ length: 100 }, (_, index) => 20 + (index % 5) * 10);
    const range = computeVirtualRange({ count: 100, estimatedItemHeight: 30, overscan: 0, relTop: 333, relBottom: 900, measurements });
    const total = measurements.reduce((sum, height) => sum + height, 0);
    const windowHeight = measurements.slice(range.start, range.end).reduce((sum, height) => sum + height, 0);
    expect(range.totalHeight).toBe(total);
    expect(range.padTop + windowHeight + range.padBottom).toBe(total);
  });
});
