/**
 * views/gallery-view.ts — Gallery 画廊视图(M3)
 *
 * - 卡片:url 字段渲染图片(url 只认 http/https/data:image),标题字段文本;
 * - 图片字段/标题字段由渲染器注入(默认第一个 url 字段 / 第一个 text 字段),
 *   仅运行时选择,不写回文档;
 * - 点击卡片展开行内编辑区(全部字段控件,共用 cell-editor);
 * - 列表渲染按运行时筛选/排序;
 * - 虚拟化:记录数达阈值(同表格 200)后按「行」分组窗口渲染——CSS grid 列数
 *   随容器宽度变化,行内列数实测(行高随列数测量),窗口由 VirtualList 依滚动
 *   几何驱动;展开编辑中的卡片所在行始终完整渲染(排除在窗口裁剪外),
 *   展开态在滚动中不丢。
 */
import type {
  JsonviewCellValue,
  JsonviewDoc,
  JsonviewField,
  JsonviewFilterCondition,
  JsonviewMessages,
  JsonviewRecord,
  JsonviewSortSpec,
} from '../types';
import { nextRecordId } from '../validate';
import { queryRecords } from '../query';
import { createCellEditor, createCellStatic, coerceForWrite } from './cell-editor';
import { VirtualList } from '../lib/virtual-list';
import type { VirtualListRange } from '../lib/virtual-list';

/**
 * Gallery 视图回调。
 */
export interface JsonviewGalleryViewCallbacks {
  /** 文档变更(kind:'cell' 单元格 / 'record' 增删)。 */
  onDocChange: (doc: JsonviewDoc, kind: string) => void;
}

/** 可作图片源的 url 前缀。 */
const IMAGE_URL_PATTERN = /^(https?:\/\/|data:image\/)/i;

/** 画廊虚拟化阈值(记录数达阈值后启用窗口渲染,同表格)。 */
const GALLERY_VIRTUALIZATION_THRESHOLD = 200;

/** 行预估高度(px;实测缓存建立前的兜底值)。 */
const ESTIMATED_GALLERY_ROW_HEIGHT = 210;

/** 视口上下额外渲染行数(同表格)。 */
const GALLERY_VIRTUAL_OVERSCAN = 8;

/** 画廊列最小宽度(px;与样式表 .zt-jsonview-gallery-grid 的 minmax 保持一致)。 */
const GALLERY_COL_MIN_WIDTH = 170;

/** 画廊列间距(px;与样式表 gap 保持一致)。 */
const GALLERY_COL_GAP = 10;

/**
 * Gallery 画廊视图。
 */
export class JsonviewGalleryView {
  /** 根元素。 */
  readonly dom: HTMLElement;
  /** 当前文档。 */
  private doc: JsonviewDoc;
  /** 只读态。 */
  private readonly readOnly: boolean;
  /** 当前文案。 */
  private readonly messages: JsonviewMessages;
  /** 回调。 */
  private readonly callbacks: JsonviewGalleryViewCallbacks;
  /** 图片字段 id。 */
  private imageFieldId: string | null;
  /** 标题字段 id。 */
  private titleFieldId: string | null;
  /** 运行时筛选。 */
  private readonly filter: JsonviewFilterCondition[];
  /** 运行时排序。 */
  private readonly sort: JsonviewSortSpec | null;
  /** 展开编辑中的记录 id。 */
  private expandedRecordId: string | null = null;
  /** 虚拟列表助手(按行索引;记录数低于阈值时为 null)。 */
  private virtual: VirtualList | null = null;
  /** 上一次渲染的窗口(去重:窗口/占位/列数均未变化时不重建)。 */
  private renderedRange: VirtualListRange | null = null;
  /** 上一次渲染时的行内列数(列数变化后强制重建)。 */
  private renderedColumns = 0;
  /** 行内列数(未挂载时按 3 估计,挂载后实测修正)。 */
  private columnsPerRow = 3;
  /** 当前视图记录(筛选/排序后)。 */
  private viewRecords: JsonviewRecord[] = [];
  /** 记录 id → 视图下标(展开行定位用)。 */
  private readonly recordIndexById = new Map<string, number>();
  /** 画廊网格容器(虚拟化时是 VirtualList 锚点)。 */
  private grid: HTMLElement | null = null;

  /**
   * 初始化视图。
   */
  constructor(
    doc: JsonviewDoc,
    readOnly: boolean,
    messages: JsonviewMessages,
    imageFieldId: string | null,
    titleFieldId: string | null,
    query: { filter: JsonviewFilterCondition[]; sort: JsonviewSortSpec | null },
    callbacks: JsonviewGalleryViewCallbacks,
  ) {
    this.doc = doc;
    this.readOnly = readOnly;
    this.messages = messages;
    this.imageFieldId = imageFieldId;
    this.titleFieldId = titleFieldId;
    this.filter = query.filter;
    this.sort = query.sort;
    this.callbacks = callbacks;

    this.dom = document.createElement('div');
    this.dom.className = 'zt-jsonview-gallery-view';
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
    this.teardownVirtual();
    this.dom.textContent = '';
    const imageField = this.resolveField(this.imageFieldId, 'url');
    if (!imageField) {
      const notice = document.createElement('div');
      notice.className = 'zt-jsonview-view-notice';
      notice.textContent = this.messages.galleryNoImage;
      this.dom.appendChild(notice);
      return;
    }
    const titleField = this.resolveField(this.titleFieldId, 'text');

    // 视图记录与 id → 下标映射(展开行定位用)。
    this.viewRecords = queryRecords(this.doc, this.filter, this.sort);
    this.recordIndexById.clear();
    this.viewRecords.forEach((record, index) => {
      this.recordIndexById.set(record.id, index);
    });

    const grid = document.createElement('div');
    grid.className = 'zt-jsonview-gallery-grid';
    this.grid = grid;
    this.renderedRange = null;
    if (this.viewRecords.length >= GALLERY_VIRTUALIZATION_THRESHOLD) {
      // 大数据:按「行」分组窗口渲染——行内列数随容器宽度实测,行高随列数测量;
      // grid 变为块容器,每行一个行包装(grid-column 模板同整排 grid)。
      grid.classList.add('zt-jsonview-gallery-grid-virtual');
      this.dom.appendChild(grid);
      this.columnsPerRow = this.resolveColumnsPerRow();
      this.renderedColumns = this.columnsPerRow;
      this.virtual = new VirtualList({
        anchor: grid,
        count: Math.ceil(this.viewRecords.length / this.columnsPerRow),
        estimatedItemHeight: ESTIMATED_GALLERY_ROW_HEIGHT,
        overscan: GALLERY_VIRTUAL_OVERSCAN,
        onRangeChange: (range) => {
          this.handleRangeChange(range);
        },
      });
      // 构造内的同步首窗回调发生在赋值前(this.virtual 尚为 null),显式刷新一次。
      this.virtual.refresh();
    } else {
      // 小数据:全量渲染(不付虚拟化复杂度)。
      for (const record of this.viewRecords) {
        grid.appendChild(this.buildCard(record, imageField, titleField));
      }
      this.dom.appendChild(grid);
    }

    // 添加记录。
    if (!this.readOnly) {
      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'zt-jsonview-view-add';
      addButton.textContent = `+ ${this.messages.addCard}`;
      addButton.addEventListener('click', () => {
        const recordId = nextRecordId(this.doc);
        this.doc = { ...this.doc, records: [...this.doc.records, { id: recordId, cells: {} }] };
        this.expandedRecordId = recordId;
        this.render();
        this.callbacks.onDocChange(this.doc, 'record');
      });
      this.dom.appendChild(addButton);
    }
  }

  /**
   * 虚拟窗口变化入口:实测行内列数,窗口/占位/列数均未变化时不重建。
   */
  private handleRangeChange(range: VirtualListRange): void {
    // 列数随容器宽度变化:更新行数映射(行高与列数无关,保留实测缓存)。
    const columns = this.resolveColumnsPerRow();
    if (columns !== this.columnsPerRow) {
      this.columnsPerRow = columns;
      this.virtual?.update({ count: Math.ceil(this.viewRecords.length / columns) });
      this.renderedRange = null;
    }
    const last = this.renderedRange;
    if (
      last !== null &&
      this.renderedColumns === this.columnsPerRow &&
      last.start === range.start &&
      last.end === range.end &&
      last.padTop === range.padTop &&
      last.padBottom === range.padBottom
    ) {
      return;
    }
    this.renderedRange = { ...range };
    this.renderedColumns = this.columnsPerRow;
    this.renderWindowRows(range);
  }

  /**
   * 重建窗口行:占位(spacer)+ 窗口行 + 展开编辑行(在窗口外时钉住渲染)。
   */
  private renderWindowRows(range: VirtualListRange): void {
    const grid = this.grid;
    const virtual = this.virtual;
    if (!grid || !virtual) {
      return;
    }
    const columns = this.columnsPerRow;
    const imageField = this.resolveField(this.imageFieldId, 'url');
    const titleField = this.resolveField(this.titleFieldId, 'text');
    if (!imageField) {
      return;
    }
    const rowCount = Math.ceil(this.viewRecords.length / columns);
    // 展开编辑中的卡片始终完整渲染:其所在行在窗口外时作为附加段渲染。
    const pinnedRow = this.resolvePinnedRow(columns);
    const segments: Array<{ start: number; end: number }> = [
      { start: range.start, end: range.end },
    ];
    if (pinnedRow !== null && (pinnedRow < range.start || pinnedRow >= range.end)) {
      if (pinnedRow < range.start) {
        segments.unshift({ start: pinnedRow, end: pinnedRow + 1 });
      } else {
        segments.push({ start: pinnedRow, end: pinnedRow + 1 });
      }
    }

    grid.textContent = '';
    /** 待实测的行(写入完成后统一读高度,避免逐行读反复强制布局)。 */
    const measuredRows: Array<{ row: number; element: HTMLElement }> = [];
    let cursor = 0;
    for (const segment of segments) {
      if (segment.start > cursor) {
        grid.appendChild(
          this.buildGallerySpacer(this.offsetOfRows(segment.start) - this.offsetOfRows(cursor)),
        );
      }
      for (let row = segment.start; row < segment.end; row += 1) {
        const wrapper = this.buildGalleryRow(row, columns, imageField, titleField);
        if (wrapper) {
          grid.appendChild(wrapper);
          measuredRows.push({ row, element: wrapper });
        }
      }
      cursor = segment.end;
    }
    if (cursor < rowCount) {
      grid.appendChild(
        this.buildGallerySpacer(this.offsetOfRows(rowCount) - this.offsetOfRows(cursor)),
      );
    }
    for (const { row, element } of measuredRows) {
      virtual.measureItem(row, element.offsetHeight);
    }
  }

  /**
   * 构建单行包装(行内按列数铺卡片;空行返回 null 不占位)。
   */
  private buildGalleryRow(
    row: number,
    columns: number,
    imageField: JsonviewField,
    titleField: JsonviewField | null,
  ): HTMLElement | null {
    const wrapper = document.createElement('div');
    wrapper.className = 'zt-jsonview-gallery-row';
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const record = this.viewRecords[index];
      if (!record) {
        continue;
      }
      wrapper.appendChild(this.buildCard(record, imageField, titleField));
    }
    return wrapper.childElementCount > 0 ? wrapper : null;
  }

  /**
   * 行下标 → 内容区纵向偏移(px;实测优先,缺失按预估行高兜底,与窗口求解一致)。
   */
  private offsetOfRows(rowIndex: number): number {
    const virtual = this.virtual;
    if (!virtual || rowIndex <= 0) {
      return 0;
    }
    const measurements = virtual.getMeasurements();
    const fallback = virtual.getEstimatedItemHeight();
    let total = 0;
    for (let index = 0; index < rowIndex; index += 1) {
      const measured = measurements?.[index];
      total += typeof measured === 'number' && measured > 0 ? measured : fallback;
    }
    return total;
  }

  /**
   * 展开编辑中的记录所在行(无展开/记录已删除时返回 null)。
   */
  private resolvePinnedRow(columns: number): number | null {
    if (!this.expandedRecordId) {
      return null;
    }
    const index = this.recordIndexById.get(this.expandedRecordId);
    if (index === undefined) {
      return null;
    }
    return Math.floor(index / columns);
  }

  /**
   * 构建虚拟占位块(以高度撑起窗口外的行空间)。
   */
  private buildGallerySpacer(height: number): HTMLElement {
    const spacer = document.createElement('div');
    spacer.className = 'zt-jsonview-gallery-virtual-spacer';
    spacer.style.height = `${Math.max(0, Math.round(height))}px`;
    return spacer;
  }

  /**
   * 实测行内列数(容器宽度 / 列最小宽;未挂载时沿用当前估计,挂载后 RO 修正)。
   */
  private resolveColumnsPerRow(): number {
    const width = this.grid?.clientWidth ?? 0;
    if (width <= 0) {
      return this.columnsPerRow;
    }
    return Math.max(
      1,
      Math.floor((width + GALLERY_COL_GAP) / (GALLERY_COL_MIN_WIDTH + GALLERY_COL_GAP)),
    );
  }

  /**
   * 销毁虚拟列表助手(render 重建 / 视图销毁前必须调用,摘 document 级监听)。
   */
  private teardownVirtual(): void {
    this.virtual?.destroy();
    this.virtual = null;
    this.grid = null;
  }

  /**
   * 视图销毁:摘除虚拟列表的 document/window 级监听(渲染器卸载视图时调用)。
   */
  destroy(): void {
    this.teardownVirtual();
  }

  /**
   * 解析注入字段(失效/未注入时按类型取第一个兜底)。
   */
  private resolveField(fieldId: string | null, type: JsonviewField['type']): JsonviewField | null {
    const injected = fieldId ? this.doc.fields.find((field) => field.id === fieldId) : undefined;
    if (injected && injected.type === type) {
      return injected;
    }
    return this.doc.fields.find((field) => field.type === type) ?? null;
  }

  /**
   * 构建单卡(图片 + 标题 + 点击展开编辑区)。
   */
  private buildCard(
    record: JsonviewRecord,
    imageField: JsonviewField,
    titleField: JsonviewField | null,
  ): HTMLElement {
    // 卡片容器。
    const card = document.createElement('div');
    card.className = 'zt-jsonview-gallery-card';
    if (this.expandedRecordId === record.id) {
      card.classList.add('zt-jsonview-gallery-card-open');
    }

    // 图片(url 不合法时渲染占位)。
    const imageBox = document.createElement('div');
    imageBox.className = 'zt-jsonview-gallery-image';
    const rawUrl = record.cells[imageField.id];
    if (typeof rawUrl === 'string' && IMAGE_URL_PATTERN.test(rawUrl.trim())) {
      const img = document.createElement('img');
      img.src = rawUrl.trim();
      img.alt = '';
      img.loading = 'lazy';
      img.addEventListener('error', () => {
        imageBox.classList.add('zt-jsonview-gallery-image-broken');
      });
      imageBox.appendChild(img);
    }
    card.appendChild(imageBox);

    // 标题(点击卡片展开/收起编辑区)。
    const titleRow = document.createElement('div');
    titleRow.className = 'zt-jsonview-gallery-card-title';
    if (titleField) {
      titleRow.appendChild(createCellStatic(titleField, record.cells[titleField.id] ?? null));
    }
    card.appendChild(titleRow);

    if (this.expandedRecordId === record.id) {
      card.appendChild(this.buildEditorArea(record));
    } else if (!this.readOnly) {
      card.addEventListener('click', () => {
        this.expandedRecordId = record.id;
        this.render();
      });
    }

    return card;
  }

  /**
   * 构建展开编辑区(全部字段控件;含删除记录)。
   */
  private buildEditorArea(record: JsonviewRecord): HTMLElement {
    // 编辑区容器。
    const area = document.createElement('div');
    area.className = 'zt-jsonview-gallery-editor';

    this.doc.fields.forEach((field) => {
      const line = document.createElement('div');
      line.className = 'zt-jsonview-editor-line';
      const label = document.createElement('span');
      label.className = 'zt-jsonview-editor-label';
      label.textContent = field.name || field.id;
      line.appendChild(label);
      if (this.readOnly) {
        line.appendChild(createCellStatic(field, record.cells[field.id] ?? null));
      } else {
        line.appendChild(
          createCellEditor(record, field, {
            onWrite: (recordId, fieldId, value) => {
              this.writeCell(recordId, fieldId, value);
            },
          }),
        );
      }
      area.appendChild(line);
    });

    // 收起按钮。
    const collapse = document.createElement('button');
    collapse.type = 'button';
    collapse.className = 'zt-jsonview-editor-collapse';
    collapse.textContent = '▴';
    collapse.addEventListener('click', (event) => {
      event.stopPropagation();
      this.expandedRecordId = null;
      this.render();
    });
    area.appendChild(collapse);

    // 删除记录。
    if (!this.readOnly) {
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'zt-jsonview-editor-remove';
      removeButton.textContent = `× ${this.messages.deleteRecord}`;
      removeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        this.doc = {
          ...this.doc,
          records: this.doc.records.filter((item) => item.id !== record.id),
        };
        this.expandedRecordId = null;
        this.render();
        this.callbacks.onDocChange(this.doc, 'record');
      });
      area.appendChild(removeButton);
    }
    return area;
  }

  /**
   * 写入单元格并提交。
   */
  private writeCell(recordId: string, fieldId: string, value: JsonviewCellValue): void {
    const record = this.doc.records.find((item) => item.id === recordId);
    const field = this.doc.fields.find((item) => item.id === fieldId);
    if (!record || !field) {
      return;
    }
    const coerced = coerceForWrite(field.type, value);
    const nextCells = { ...record.cells };
    if (coerced === null) {
      delete nextCells[fieldId];
    } else {
      nextCells[fieldId] = coerced;
    }
    this.doc = {
      ...this.doc,
      records: this.doc.records.map((item) =>
        item.id === recordId ? { id: item.id, cells: nextCells } : item,
      ),
    };
    this.callbacks.onDocChange(this.doc, 'cell');
  }
}
