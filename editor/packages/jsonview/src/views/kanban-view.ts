/**
 * views/kanban-view.ts — kanban 看板视图(M2)
 *
 * - 分组:select/multiSelect 字段(渲染器注入 kanbanGroupFieldId;multiSelect
 *   一条记录可出现在多列);空值进「未分组」列;
 * - 卡片:标题字段文本 + 次要字段摘要(≤3 行非标题字段);
 * - 拖拽换组:HTML5 DnD,drop 写回分组字段的 cells(整批 'drag' 提交);
 *   跨库数据不落盘,DnD 仅看板内;
 * - 列尾 + 添加记录(新记录直接写入该组值);
 * - 换组只改 cells,记录顺序/其余字段不动;
 * - 虚拟化:单列卡片数达阈值(同表格 200)后按列独立窗口渲染(滚动容器是列内
 *   .zt-jsonview-kanban-cards,窗口由 VirtualList 依滚动几何驱动);拖拽期间
 *   源列冻结为全量渲染(dragstart 就地展开、dragend 恢复),窗口重建不得销毁
 *   拖拽中的卡片。
 */
import type {
  JsonviewCellValue,
  JsonviewDoc,
  JsonviewField,
  JsonviewMessages,
  JsonviewRecord,
  JsonviewFilterCondition,
  JsonviewSortSpec,
} from '../types';
import { nextRecordId } from '../validate';
import { queryRecords } from '../query';
import { createCellStatic } from './cell-editor';
import { VirtualList } from '../lib/virtual-list';
import type { VirtualListRange } from '../lib/virtual-list';

/**
 * kanban 视图回调。
 */
export interface JsonviewKanbanViewCallbacks {
  /** 文档变更(kind:'drag' 换组 / 'record' 增删)。 */
  onDocChange: (doc: JsonviewDoc, kind: string) => void;
}

/** 每卡片次要字段摘要行数上限。 */
const SUMMARY_FIELD_LIMIT = 3;

/** 单列虚拟化阈值(卡片数达阈值后启用窗口渲染,同表格)。 */
const KANBAN_VIRTUALIZATION_THRESHOLD = 200;

/** 卡片预估高度(px;实测缓存建立前的兜底值)。 */
const ESTIMATED_CARD_HEIGHT = 64;

/** 视口上下额外渲染卡片数(同表格)。 */
const KANBAN_VIRTUAL_OVERSCAN = 8;

/** 卡片间距(px;与样式表 .zt-jsonview-kanban-cards-content 的 gap 一致)。 */
const KANBAN_CARD_GAP = 6;

/**
 * 单列虚拟化状态(键控其卡片内容容器;render 重建/冻结展开时销毁)。
 */
interface KanbanColumnVirtualState {
  /** 卡片内容容器(VirtualList 锚点;其父 .zt-jsonview-kanban-cards 是滚动容器)。 */
  container: HTMLElement;
  /** 该列记录 id 顺序。 */
  recordIds: string[];
  /** 渲染入口建好的 id → record 映射。 */
  recordById: Map<string, JsonviewRecord>;
  /** 分组字段。 */
  groupField: JsonviewField;
  /** 标题字段。 */
  titleField: JsonviewField | null;
  /** 该列虚拟列表助手。 */
  virtual: VirtualList;
  /** 上一次渲染的窗口(去重)。 */
  renderedRange: VirtualListRange | null;
}

/**
 * kanban 看板视图。
 */
export class JsonviewKanbanView {
  /** 根元素。 */
  readonly dom: HTMLElement;
  /** 当前文档。 */
  private doc: JsonviewDoc;
  /** 只读态。 */
  private readonly readOnly: boolean;
  /** 当前文案。 */
  private readonly messages: JsonviewMessages;
  /** 回调。 */
  private readonly callbacks: JsonviewKanbanViewCallbacks;
  /** 分组字段 id。 */
  private groupFieldId: string | null;
  /** 运行时筛选。 */
  private readonly filter: JsonviewFilterCondition[];
  /** 运行时排序。 */
  private readonly sort: JsonviewSortSpec | null;
  /** 拖拽中的记录 id。 */
  private draggingRecordId: string | null = null;
  /** 拖拽冻结标记:拖拽期间源列暂停虚拟化(dragstart 置位、dragend/drop 复位)。 */
  private dragFrozen = false;
  /** 各列虚拟化状态(键 = 卡片内容容器;render 重建时全部销毁)。 */
  private readonly columnVirtuals = new Map<HTMLElement, KanbanColumnVirtualState>();

  /**
   * 初始化视图。
   */
  constructor(
    doc: JsonviewDoc,
    readOnly: boolean,
    messages: JsonviewMessages,
    groupFieldId: string | null,
    query: { filter: JsonviewFilterCondition[]; sort: JsonviewSortSpec | null },
    callbacks: JsonviewKanbanViewCallbacks,
  ) {
    this.doc = doc;
    this.readOnly = readOnly;
    this.messages = messages;
    this.groupFieldId = groupFieldId;
    this.filter = query.filter;
    this.sort = query.sort;
    this.callbacks = callbacks;

    this.dom = document.createElement('div');
    this.dom.className = 'zt-jsonview-kanban-view';
    this.render();
  }

  /**
   * 外部整体替换文档。
   */
  setDoc(doc: JsonviewDoc): void {
    this.doc = doc;
    this.render();
  }

  /**
   * 读取当前文档。
   */
  getDoc(): JsonviewDoc {
    return this.doc;
  }

  /**
   * 重绘。
   */
  render(): void {
    this.teardownColumnVirtuals();
    this.dom.textContent = '';
    const groupField = this.resolveGroupField();
    if (!groupField) {
      // 无 select/multiSelect 字段:提示(与画廊/日历缺字段提示同款)。
      const notice = document.createElement('div');
      notice.className = 'zt-jsonview-view-notice';
      notice.textContent = this.messages.kanbanNoGroup;
      this.dom.appendChild(notice);
      return;
    }

    // 分组取值(select:候选值 + 未分组;multiSelect:全部出现过的值 + 未分组)。
    const keys: string[] = [...(groupField.options ?? [])];
    const visible = queryRecords(this.doc, this.filter, this.sort);
    const membership = new Map<string, string[]>();

    const addToGroup = (key: string, recordId: string): void => {
      const list = membership.get(key) ?? [];
      list.push(recordId);
      membership.set(key, list);
    };

    for (const record of visible) {
      const value = record.cells[groupField.id] ?? null;
      if (value === null || value === '') {
        addToGroup('', record.id);
        continue;
      }
      if (Array.isArray(value)) {
        value.forEach((item) => addToGroup(item, record.id));
        continue;
      }
      addToGroup(String(value), record.id);
    }
    // 运行中新值(不在 options 中)补到键序尾部。
    for (const key of membership.keys()) {
      if (key !== '' && !keys.includes(key)) {
        keys.push(key);
      }
    }

    const groups = keys.map((key) => ({
      key,
      label: key === '' ? this.messages.ungroupedLabel : key,
      recordIds: membership.get(key) ?? [],
    }));
    // 未分组列(有成员时)排最后。
    if (membership.has('')) {
      groups.push({
        key: '',
        label: this.messages.ungroupedLabel,
        recordIds: membership.get('') ?? [],
      });
    }
    const kanban = document.createElement('div');
    kanban.className = 'zt-jsonview-kanban';
    // 渲染入口建一次 id → record 映射(避免每卡 records.find 的 O(n²))。
    const recordById = new Map(this.doc.records.map((record) => [record.id, record]));
    groups.forEach((group) => {
      kanban.appendChild(
        this.buildColumn(groupField, group.key, group.label, group.recordIds, recordById),
      );
    });
    this.dom.appendChild(kanban);
  }

  /**
   * 解析分组字段(注入 id 失效时取第一个 select/multiSelect 字段兜底)。
   */
  private resolveGroupField(): JsonviewField | null {
    const groupable = this.doc.fields.filter(
      (field) => field.type === 'select' || field.type === 'multiSelect',
    );
    if (groupable.length === 0) {
      return null;
    }
    const injected = this.groupFieldId
      ? groupable.find((field) => field.id === this.groupFieldId)
      : undefined;
    return injected ?? groupable[0]!;
  }

  /**
   * 构建单列(组头 + 卡片 + 添加按钮;recordIds 为空时渲染占位行)。
   */
  private buildColumn(
    groupField: JsonviewField,
    key: string,
    label: string,
    recordIds: string[],
    recordById: Map<string, JsonviewRecord>,
  ): HTMLElement {
    // 列容器。
    const column = document.createElement('div');
    column.className = 'zt-jsonview-kanban-column';
    column.dataset.groupKey = key;

    // 列头。
    const head = document.createElement('div');
    head.className = 'zt-jsonview-kanban-column-head';
    head.textContent = label;
    column.appendChild(head);

    // 卡片区(dragover/drop 目标;滚动容器)。
    const cards = document.createElement('div');
    cards.className = 'zt-jsonview-kanban-cards';
    // 卡片内容容器:虚拟化时作为 VirtualList 锚点(锚点顶边 = 卡片 0 顶边基准;
    // 其父容器 cards 是 overflow-y 滚动容器,窗口几何由祖先裁剪矩形求解)。
    const content = document.createElement('div');
    content.className = 'zt-jsonview-kanban-cards-content';
    cards.appendChild(content);
    if (!this.readOnly) {
      cards.addEventListener('dragover', (event) => {
        event.preventDefault();
        cards.classList.add('zt-jsonview-kanban-dragover');
      });
      cards.addEventListener('dragleave', () => {
        cards.classList.remove('zt-jsonview-kanban-dragover');
      });
      cards.addEventListener('drop', (event) => {
        event.preventDefault();
        cards.classList.remove('zt-jsonview-kanban-dragover');
        // drop 即拖拽结束:先复位冻结,换组渲染即恢复虚拟化路径。
        this.dragFrozen = false;
        const recordId =
          event.dataTransfer?.getData('text/meditor-jsonview-record') || this.draggingRecordId;
        if (recordId) {
          this.moveRecordToGroup(groupField, recordId, key);
        }
        this.draggingRecordId = null;
      });
    }

    // 空列占位(「拖卡片到这里」;禁用态不渲染)。
    if (recordIds.length === 0 && !this.readOnly) {
      const placeholder = document.createElement('div');
      placeholder.className = 'zt-jsonview-kanban-empty';
      placeholder.textContent = this.messages.kanbanDropHere;
      content.appendChild(placeholder);
    }

    const titleField = this.resolveTitleField();
    // 虚拟化:单列卡片数达阈值且非拖拽冻结期,只渲染可视窗口卡片。
    if (recordIds.length >= KANBAN_VIRTUALIZATION_THRESHOLD && !this.dragFrozen) {
      // VirtualList 构造内会同步回调首窗,先建列表再补状态引用(onRangeChange 经
      // stateRef 解引用),构造完成后 refresh 一次完成首窗渲染。
      let stateRef: KanbanColumnVirtualState | null = null;
      const virtual = new VirtualList({
        anchor: content,
        count: recordIds.length,
        estimatedItemHeight: ESTIMATED_CARD_HEIGHT,
        overscan: KANBAN_VIRTUAL_OVERSCAN,
        onRangeChange: (range) => {
          if (stateRef) {
            this.renderColumnWindow(stateRef, range);
          }
        },
      });
      const state: KanbanColumnVirtualState = {
        container: content,
        recordIds,
        recordById,
        groupField,
        titleField,
        virtual,
        renderedRange: null,
      };
      stateRef = state;
      this.columnVirtuals.set(content, state);
      virtual.refresh();
      column.appendChild(cards);
    } else {
      // 小数据 / 拖拽冻结期:全量渲染(不付虚拟化复杂度)。
      for (const recordId of recordIds) {
        // 取列记录走 Map(渲染入口已建,避免逐卡 find)。
        const record = recordById.get(recordId);
        if (!record) {
          continue;
        }
        content.appendChild(this.buildCard(record, groupField, titleField));
      }
      column.appendChild(cards);
    }

    // 添加记录(写入该组值)。
    if (!this.readOnly) {
      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'zt-jsonview-kanban-add';
      addButton.textContent = `+ ${this.messages.addCard}`;
      addButton.addEventListener('click', () => {
        const recordId = nextRecordId(this.doc);
        const cells: Record<string, JsonviewCellValue> = {};
        if (key !== '') {
          cells[groupField.id] = groupField.type === 'multiSelect' ? [key] : key;
        }
        this.doc = { ...this.doc, records: [...this.doc.records, { id: recordId, cells }] };
        this.render();
        this.callbacks.onDocChange(this.doc, 'record');
      });
      column.appendChild(addButton);
    }
    return column;
  }

  /**
   * 虚拟窗口渲染:占位(spacer)×2 + [start, end) 卡片(无 DOM 复用,重建即渲染)。
   * 同窗口去重,滚动中不反复重建。
   */
  private renderColumnWindow(state: KanbanColumnVirtualState, range: VirtualListRange): void {
    const last = state.renderedRange;
    if (
      last !== null &&
      last.start === range.start &&
      last.end === range.end &&
      last.padTop === range.padTop &&
      last.padBottom === range.padBottom
    ) {
      return;
    }
    state.renderedRange = { ...range };
    const content = state.container;
    const total = state.recordIds.length;

    const cardsInWindow: HTMLElement[] = [];
    for (let index = range.start; index < range.end; index += 1) {
      const recordId = state.recordIds[index];
      const record = recordId ? state.recordById.get(recordId) : undefined;
      if (!record) {
        continue;
      }
      cardsInWindow.push(this.buildCard(record, state.groupField, state.titleField));
    }

    content.textContent = '';
    // 顶部占位:高度 = 上方缺失卡片实测高之和(padTop)+ 其间 flex gap;自身与
    // 首卡片之间还有 1 个 gap,故减掉。start=0 时无占位(不引入多余 gap)。
    if (range.start > 0) {
      const height = range.padTop + range.start * KANBAN_CARD_GAP - KANBAN_CARD_GAP;
      content.appendChild(this.buildKanbanSpacer(Math.max(0, height), 'top'));
    }
    cardsInWindow.forEach((card) => content.appendChild(card));
    // 底部占位:同理 = 下方缺失卡片实测高之和 + gap 数 − 1;end=total 时不挂。
    if (range.end < total) {
      const height = range.padBottom + (total - range.end) * KANBAN_CARD_GAP - KANBAN_CARD_GAP;
      content.appendChild(this.buildKanbanSpacer(Math.max(0, height), 'bottom'));
    }

    // 实测回填(DOM 写入完成后统一读高度,避免逐卡读反复强制布局)。
    const virtual = state.virtual;
    let measuredIndex = range.start;
    for (const card of cardsInWindow) {
      virtual.measureItem(measuredIndex, card.offsetHeight);
      measuredIndex += 1;
    }
  }

  /**
   * 构建虚拟占位块(dataset.side 标记顶部/底部,冻结展开时定向摘除底部)。
   */
  private buildKanbanSpacer(height: number, side: 'top' | 'bottom'): HTMLElement {
    const spacer = document.createElement('div');
    spacer.className = 'zt-jsonview-kanban-virtual-spacer';
    spacer.dataset.side = side;
    spacer.style.height = `${Math.max(0, Math.round(height))}px`;
    return spacer;
  }

  /**
   * 拖拽冻结:源列就地展开为全量渲染(dragstart 触发)。
   *
   * 不整列重建 —— 重建会替换拖拽中的卡片元素,浏览器在 dragstart 处理完才捕获
   * 拖影,源元素被移除会直接取消拖拽。就地展开:保留顶部占位与既有窗口卡片,
   * 追加窗口尾部之后的全部卡片、摘除底部占位;布局零位移,拖拽中的卡片元素
   * 始终不被销毁。此后该列不再有 VirtualList(滚动不触发窗口重建)。
   */
  private freezeColumnForDrag(card: HTMLElement): void {
    this.dragFrozen = true;
    const container = card.parentElement;
    const state = container ? this.columnVirtuals.get(container) : undefined;
    if (!state) {
      return;
    }
    const range = state.virtual.getRange();
    const total = state.recordIds.length;
    for (let index = range.end; index < total; index += 1) {
      const recordId = state.recordIds[index];
      const record = recordId ? state.recordById.get(recordId) : undefined;
      if (!record) {
        continue;
      }
      state.container.appendChild(this.buildCard(record, state.groupField, state.titleField));
    }
    state.container
      .querySelectorAll<HTMLElement>(
        ':scope > .zt-jsonview-kanban-virtual-spacer[data-side="bottom"]',
      )
      .forEach((spacer) => spacer.remove());
    state.virtual.destroy();
    this.columnVirtuals.delete(state.container);
  }

  /**
   * 拖拽结束恢复:复位冻结标记并整体重建(各列恢复虚拟化;drop 已渲染过时幂等)。
   */
  private unfreezeAfterDrag(): void {
    if (!this.dragFrozen) {
      return;
    }
    this.dragFrozen = false;
    this.render();
  }

  /**
   * 销毁全部列虚拟列表(render 重建前 / 视图销毁时调用,摘 document 级监听)。
   */
  private teardownColumnVirtuals(): void {
    this.columnVirtuals.forEach((state) => state.virtual.destroy());
    this.columnVirtuals.clear();
  }

  /**
   * 视图销毁:摘除虚拟列表的 document/window 级监听(渲染器卸载视图时调用)。
   */
  destroy(): void {
    this.teardownColumnVirtuals();
  }

  /**
   * 解析标题字段(第一个 text 字段;无则首个非分组字段;再无则 null)。
   */
  private resolveTitleField(): JsonviewField | null {
    const groupFieldId = this.resolveGroupField()?.id;
    const candidates = this.doc.fields.filter((field) => field.id !== groupFieldId);
    return candidates.find((field) => field.type === 'text') ?? candidates[0] ?? null;
  }

  /**
   * 构建单张卡片(标题 + 次要字段摘要;可拖拽)。
   */
  private buildCard(
    record: JsonviewRecord,
    groupField: JsonviewField,
    titleField: JsonviewField | null,
  ): HTMLElement {
    // 卡片容器。
    const card = document.createElement('div');
    card.className = 'zt-jsonview-kanban-card';
    card.draggable = !this.readOnly;
    card.dataset.recordId = record.id;

    if (!this.readOnly) {
      card.addEventListener('dragstart', (event) => {
        this.draggingRecordId = record.id;
        event.dataTransfer?.setData('text/meditor-jsonview-record', record.id);
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
        }
        card.classList.add('zt-jsonview-kanban-dragging');
        // 源列冻结为全量渲染:拖拽期间窗口重建不得销毁拖拽中的卡片。
        this.freezeColumnForDrag(card);
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('zt-jsonview-kanban-dragging');
        this.draggingRecordId = null;
        // 拖拽结束(含取消):恢复各列虚拟化。
        this.unfreezeAfterDrag();
      });
    }

    // 标题。
    const title = document.createElement('div');
    title.className = 'zt-jsonview-kanban-card-title';
    if (titleField) {
      title.appendChild(createCellStatic(titleField, record.cells[titleField.id] ?? null));
    }
    card.appendChild(title);

    // 次要字段摘要(非分组/标题字段,前 3 个有值字段)。
    const summary = document.createElement('div');
    summary.className = 'zt-jsonview-kanban-card-summary';
    let shown = 0;
    for (const field of this.doc.fields) {
      if (shown >= SUMMARY_FIELD_LIMIT) {
        break;
      }
      if (field.id === groupField.id || field.id === titleField?.id) {
        continue;
      }
      const value = record.cells[field.id];
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      ) {
        continue;
      }
      const line = document.createElement('div');
      line.className = 'zt-jsonview-kanban-card-line';
      const keySpan = document.createElement('span');
      keySpan.className = 'zt-jsonview-kanban-card-key';
      keySpan.textContent = field.name;
      const valueSpan = document.createElement('span');
      valueSpan.appendChild(createCellStatic(field, value));
      line.appendChild(keySpan);
      line.appendChild(valueSpan);
      summary.appendChild(line);
      shown += 1;
    }
    if (shown > 0) {
      card.appendChild(summary);
    }
    return card;
  }

  /**
   * 换组写回:multiSelect = 增删数组项;select = 直接覆盖;同组无操作。
   */
  private moveRecordToGroup(groupField: JsonviewField, recordId: string, targetKey: string): void {
    const record = this.doc.records.find((item) => item.id === recordId);
    if (!record) {
      return;
    }
    const current = record.cells[groupField.id] ?? null;
    // 同组判定(multiSelect 含目标值即同组)。
    const alreadyInGroup =
      groupField.type === 'multiSelect'
        ? Array.isArray(current) && current.includes(targetKey)
        : current === targetKey;
    if (alreadyInGroup) {
      return;
    }

    let nextValue: JsonviewCellValue;
    if (groupField.type === 'multiSelect') {
      // 原数组剔除全部旧值后并入目标键(空目标 = 仅剔除)。
      const base = Array.isArray(current) ? current : [];
      const kept = base.filter((item) => item !== targetKey);
      const filtered = kept.filter((item) => item !== '' && !this.isAnyGroupKey(groupField, item));
      nextValue = targetKey === '' ? filtered : [...filtered, targetKey];
      if (nextValue.length === 0) {
        nextValue = null;
      }
    } else {
      nextValue = targetKey === '' ? null : targetKey;
    }

    const records = this.doc.records.map((item) => {
      if (item.id !== recordId) {
        return item;
      }
      const cells = { ...item.cells };
      if (nextValue === null) {
        delete cells[groupField.id];
      } else {
        cells[groupField.id] = nextValue;
      }
      return { id: item.id, cells };
    });
    this.doc = { ...this.doc, records };
    this.render();
    this.callbacks.onDocChange(this.doc, 'drag');
  }

  /**
   * 判断值是否属于任何分组键(换组时清理旧组残留)。
   */
  private isAnyGroupKey(groupField: JsonviewField, value: string): boolean {
    const keys = new Set([...(groupField.options ?? [])]);
    for (const record of this.doc.records) {
      const cell = record.cells[groupField.id];
      if (Array.isArray(cell)) {
        cell.forEach((item) => keys.add(item));
      } else if (typeof cell === 'string' && cell !== '') {
        keys.add(cell);
      }
    }
    return keys.has(value);
  }
}
