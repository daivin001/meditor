/**
 * undo-stack.test.ts — jsonview 数据库内部撤销栈回归
 * 覆盖:静默分批(同类编辑折叠为一步)、种类切换强制分批、undo/redo 往返、
 * 回放期间入栈屏蔽、受控 reset、容量上限。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JsonviewUndoStack } from './undo-stack.js';

describe('JsonviewUndoStack', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('同类连续编辑在静默窗口内折叠为一个撤销步', () => {
    const stack = new JsonviewUndoStack('A');
    stack.push('cell', 'A', 'B');
    stack.push('cell', 'B', 'C');
    expect(stack.canUndo()).toBe(true);
    expect(stack.undo()).toBe('A'); // A →(B、C 折叠)一步
    expect(stack.canUndo()).toBe(false);
  });

  it('静默窗口到期后再次编辑开新批次', () => {
    const stack = new JsonviewUndoStack('A');
    stack.push('cell', 'A', 'B');
    vi.advanceTimersByTime(700); // > BATCH_IDLE_MS(600)
    stack.push('cell', 'B', 'C');
    expect(stack.undo()).toBe('B');
    expect(stack.undo()).toBe('A');
  });

  it('操作种类切换强制分批(单元格编辑与结构操作不合并)', () => {
    const stack = new JsonviewUndoStack('A');
    stack.push('cell', 'A', 'B');
    stack.push('field', 'B', 'C');
    expect(stack.undo()).toBe('B');
    expect(stack.undo()).toBe('A');
  });

  it('undo/redo 往返一致', () => {
    const stack = new JsonviewUndoStack('A');
    stack.push('cell', 'A', 'B');
    vi.advanceTimersByTime(700);
    stack.push('cell', 'B', 'C');
    expect(stack.undo()).toBe('B');
    expect(stack.getCurrent()).toBe('B');
    expect(stack.redo()).toBe('C');
    expect(stack.getCurrent()).toBe('C');
    expect(stack.canRedo()).toBe(false);
  });

  it('undo 后新编辑清空重做分支', () => {
    const stack = new JsonviewUndoStack('A');
    stack.push('cell', 'A', 'B');
    stack.undo();
    stack.endReplay();
    stack.push('cell', 'A', 'X');
    expect(stack.canRedo()).toBe(false);
    expect(stack.undo()).toBe('A');
  });

  it('回放期间(replaying)的 push 不动栈,但同步 current(echo 语义)', () => {
    const stack = new JsonviewUndoStack('A');
    stack.push('cell', 'A', 'B');
    stack.undo(); // 进入 replaying,返回 'A'
    // 视图回放 'A' 后 echo 回来:current 同步,但不再入栈
    stack.push('undo', 'B', 'A');
    expect(stack.getCurrent()).toBe('A');
    expect(stack.canUndo()).toBe(false);
    stack.endReplay();
    stack.push('cell', 'A', 'C');
    expect(stack.getCurrent()).toBe('C');
    expect(stack.undo()).toBe('A');
  });

  it('reset 受控回填后整栈清空', () => {
    const stack = new JsonviewUndoStack('A');
    stack.push('cell', 'A', 'B');
    stack.reset('R');
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(false);
    expect(stack.getCurrent()).toBe('R');
  });

  it('栈容量上限 100 步,超出丢最旧', () => {
    const stack = new JsonviewUndoStack('S0');
    for (let i = 1; i <= 150; i++) {
      // 交替种类强制每步独立成批
      stack.push(i % 2 === 0 ? 'cell' : 'field', `S${i - 1}`, `S${i}`);
    }
    let steps = 0;
    while (stack.canUndo()) {
      stack.undo();
      stack.endReplay();
      steps++;
    }
    expect(steps).toBe(100);
  });

  it('destroy 清定时器与栈', () => {
    const stack = new JsonviewUndoStack('A');
    stack.push('cell', 'A', 'B');
    stack.destroy();
    expect(stack.canUndo()).toBe(false);
    // destroy 后挂起定时器已清:推进时间不应再有任何影响(不抛错即可)
    vi.advanceTimersByTime(2000);
  });
});
