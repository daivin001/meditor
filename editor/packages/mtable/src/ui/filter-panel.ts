/**
 * ui/filter-panel.ts — 筛选面板浮层子系统
 *
 * 从 createMtable 函数体拆出:参照 Univer SheetsFilterPanel 的浮层
 * (重置 + 筛选/排序双 tab + 搜索 + 值列表 + 取消/确认)。
 * 面板打开状态与草稿(选中值集合/搜索关键字)为本模块内部状态;
 * pointer/touch 经 API 的 state/popup 只读访问做落点判定。
 * 筛选逻辑(条件应用/排序/隐藏行)见 core/filter-sort.ts。
 */

import { FILTER_ARROW_RIGHT_MARGIN, FILTER_ARROW_SIZE } from '../theme';
import { collectColumnValues } from '../values';
import type {
  MtableContext,
  MtableFilterPanelApi,
  MtableFilterPanelOpenState
} from '../context';

/** 面板固定宽度(px,定位用;与样式 .mtable-filter-panel 同步)。 */
const POPUP_WIDTH = 260;

/** 面板搜索框防抖间隔(ms;collectColumnValues 是全列扫描,逐键全量重建卡顿)。 */
const SEARCH_DEBOUNCE_MS = 150;

/** 创建筛选面板浮层子系统。 */
export function createFilterPanel(ctx: MtableContext): MtableFilterPanelApi {
  const { config, model } = ctx;

  // --- 面板运行态(原 createMtable 局部变量) ---
  /** 面板打开状态(null = 关闭;打开时记录目标列与 tab)。 */
  let state: MtableFilterPanelOpenState | null = null;
  /** 面板草稿:打开面板时复制的选中值集合(确认才写回 filters)。 */
  let draftChecked: Set<string> = new Set();
  /** 面板草稿:搜索关键字(空格分隔多关键字,任一命中即选中)。 */
  let draftSearch = '';
  /** 筛选面板浮层 DOM(null = 未创建)。 */
  let popup: HTMLDivElement | null = null;
  /** 筛选搜索框防抖定时器(input 每键触发全量重建列表区,防抖后统一刷新)。 */
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** 关闭筛选面板(不落地草稿)。 */
  const close = (): void => {
    // 取消未触发的防抖重建(面板已销毁,定时器回调不能再跑)。
    if (searchDebounceTimer !== null) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }
    state = null;
    if (popup) {
      popup.remove();
      popup = null;
    }
  };

  /** 确认筛选:把草稿选中值写回 filters 并应用(0 选中视为无效,不落地)。 */
  const confirmFilterPanel = (): void => {
    if (!state) return;
    const { col } = state;
    if (draftChecked.size === 0) {
      // 全不选 = 无有效筛选(与 Univer canApply 一致,确认按钮已禁用,此处兜底)
      close();
      return;
    }
    const active = new Set(draftChecked);
    const distinctCount = collectColumnValues(model, ctx.layout.getDataRowCount(), col).length;
    const before = ctx.filters.get(col);
    const beforeKey = before ? Array.from(before).sort().join('\u0000') : '';
    const afterKey = Array.from(active).sort().join('\u0000');
    if (afterKey !== beforeKey) {
      if (active.size >= distinctCount) {
        // 选中全部值 = 该列无筛选(选值子集语义)
        ctx.filters.delete(col);
      } else {
        ctx.filters.set(col, active);
      }
      ctx.filterSort.applyFilterChange();
    }
    close();
  };

  /** 面板当前 tab 下重建列表区/排序区内容(搜索框变更/切 tab 后调用)。 */
  const renderFilterPanelBody = (): void => {
    if (!popup || !state) return;
    const { col, tab } = state;
    const bodyHost = popup.querySelector<HTMLDivElement>('.mtable-filter-panel-body')!;
    bodyHost.innerHTML = '';
    const messages = config.messages;

    if (tab === 'sort') {
      // 排序 tab:两个菜单项(升序/降序),点击立即应用并关闭(同 Univer 排序菜单语义)
      const makeSortItem = (dir: 'asc' | 'desc'): HTMLElement => {
        const item = document.createElement('div');
        item.className = 'mtable-filter-sort-item';
        // 当前列已按该方向排序:高亮 + 对勾(重新打开面板时可见)
        const active = ctx.sortState?.col === col && ctx.sortState.dir === dir;
        if (active) item.dataset.active = 'true';
        item.innerHTML =
          `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${dir === 'asc'
            ? '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>'
            : '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>'}</svg><span>${dir === 'asc' ? messages.sortAsc : messages.sortDesc}</span>${active
            ? `<svg class="mtable-filter-sort-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`
            : ''}`;
        item.addEventListener('click', () => {
          ctx.filterSort.applySort(col, dir);
          close();
        });
        return item;
      };
      bodyHost.appendChild(makeSortItem('asc'));
      bodyHost.appendChild(makeSortItem('desc'));
      return;
    }

    // 筛选 tab:搜索框 + 全选行 + 值列表(带计数,参照 Univer FilterByValue)
    const values = collectColumnValues(model, ctx.layout.getDataRowCount(), col);
    const keywords = draftSearch
      .split(/\s+/)
      .map((k) => k.toLowerCase())
      .filter((k) => k.length > 0);

    /** 值是否匹配搜索关键字(无关键字 = 全匹配;任一关键字命中即可)。 */
    const matchSearch = (value: string): boolean => {
      if (keywords.length === 0) return true;
      const lower = value.toLowerCase();
      return keywords.some((k) => lower.includes(k));
    };

    // 搜索框
    const search = document.createElement('input');
    search.type = 'text';
    search.className = 'mtable-filter-search';
    search.spellcheck = false;
    search.placeholder = messages.searchPlaceholder;
    search.value = draftSearch;
    search.addEventListener('input', () => {
      draftSearch = search.value;
      // 防抖 ~150ms:collectColumnValues 是全列扫描,逐键全量重建卡顿;滚动行为不变。
      if (searchDebounceTimer !== null) {
        clearTimeout(searchDebounceTimer);
      }
      searchDebounceTimer = setTimeout(() => {
        searchDebounceTimer = null;
        // 面板已关闭(定时器晚到)时不再重建。
        if (popup && state) {
          renderFilterPanelBody();
        }
      }, SEARCH_DEBOUNCE_MS);
    });
    bodyHost.appendChild(search);

    // 值列表容器
    const listWrap = document.createElement('div');
    listWrap.className = 'mtable-filter-list';

    /** 建一行复选项(label = 显示文本,count = 出现次数;hover 显示"仅筛选")。 */
    const makeItem = (label: string, value: string, count: number | null): HTMLElement => {
      const item = document.createElement('label');
      item.className = 'mtable-filter-item';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = draftChecked.has(value);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          draftChecked.add(value);
        } else {
          draftChecked.delete(value);
        }
        // 更新全选行状态(不重建列表,保持滚动位置)
        const matched = values.filter((v) => matchSearch(v.value));
        const allChecked = matched.length > 0 && matched.every((v) => draftChecked.has(v.value));
        const noneChecked = matched.every((v) => !draftChecked.has(v.value));
        const selectAllBox = listWrap.querySelector<HTMLInputElement>('.mtable-filter-item input')!;
        if (selectAllBox) {
          selectAllBox.checked = allChecked;
          selectAllBox.indeterminate = !allChecked && !noneChecked;
        }
      });
      const text = document.createElement('span');
      text.className = 'mtable-filter-item-label';
      text.textContent = label;
      text.title = label;
      item.appendChild(checkbox);
      item.appendChild(text);
      if (count !== null) {
        const badge = document.createElement('span');
        badge.className = 'mtable-filter-item-count';
        badge.textContent = `(${count})`;
        item.appendChild(badge);
      }
      // "仅筛选"(同 Univer:行 hover 显现,点击后只勾选该值,确认生效)
      const only = document.createElement('a');
      only.className = 'mtable-filter-item-only';
      only.textContent = messages.filterOnly;
      only.addEventListener('click', (e) => {
        // 阻止 label 默认行为(否则会先 toggle 复选框)
        e.preventDefault();
        e.stopPropagation();
        draftChecked = new Set([value]);
        renderFilterPanelBody();
      });
      item.appendChild(only);
      return item;
    };

    // 全选行
    const matched = values.filter((v) => matchSearch(v.value));
    const allChecked = matched.length > 0 && matched.every((v) => draftChecked.has(v.value));
    const noneChecked = matched.every((v) => !draftChecked.has(v.value));
    const selectAllItem = document.createElement('label');
    selectAllItem.className = 'mtable-filter-item mtable-filter-select-all';
    const selectAllBox = document.createElement('input');
    selectAllBox.type = 'checkbox';
    selectAllBox.checked = allChecked;
    selectAllBox.indeterminate = !allChecked && !noneChecked;
    selectAllBox.addEventListener('change', () => {
      if (selectAllBox.checked) {
        for (const v of matched) draftChecked.add(v.value);
      } else {
        for (const v of matched) draftChecked.delete(v.value);
      }
      renderFilterPanelBody();
    });
    const selectAllText = document.createElement('span');
    selectAllText.className = 'mtable-filter-item-label';
    selectAllText.textContent = messages.selectAll;
    selectAllItem.appendChild(selectAllBox);
    selectAllItem.appendChild(selectAllText);
    const statBadge = document.createElement('span');
    statBadge.className = 'mtable-filter-item-count';
    const checkedCount = matched.filter((v) => draftChecked.has(v.value)).length;
    statBadge.textContent = `(${checkedCount}/${matched.length})`;
    selectAllItem.appendChild(statBadge);
    listWrap.appendChild(selectAllItem);

    // 值行(搜索命中的;空白值显示 "(空白)")
    for (const { value, count } of values) {
      if (!matchSearch(value)) continue;
      listWrap.appendChild(makeItem(value === '' ? messages.blankValue : value, value, count));
    }
    bodyHost.appendChild(listWrap);
  };

  /** 在指定列头下方打开筛选面板(首次点击时创建 DOM)。 */
  const open = (col: number): void => {
    close();
    ctx.contextMenu.close();
    state = { col, tab: 'filter' };
    // 草稿 = 当前生效的选中值;无筛选时预选全部值(取消勾选即"只看子集")
    const baseline = ctx.filters.get(col);
    draftChecked = baseline
      ? new Set(baseline)
      : new Set(collectColumnValues(model, ctx.layout.getDataRowCount(), col).map((v) => v.value));
    draftSearch = '';
    const messages = config.messages;

    popup = document.createElement('div');
    popup.className = 'mtable-filter-panel';

    // 双 tab:筛选 / 排序
    const tabs = document.createElement('div');
    tabs.className = 'mtable-filter-tabs';
    const makeTab = (id: 'filter' | 'sort', label: string): HTMLElement => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'mtable-filter-tab';
      tab.textContent = label;
      tab.addEventListener('click', () => {
        if (!state) return;
        state.tab = id;
        tabs.querySelectorAll('.mtable-filter-tab').forEach((el) => el.removeAttribute('data-active'));
        tab.dataset.active = 'true';
        renderFilterPanelBody();
      });
      return tab;
    };
    const filterTab = makeTab('filter', messages.filterTab);
    filterTab.dataset.active = 'true';
    tabs.appendChild(filterTab);
    tabs.appendChild(makeTab('sort', messages.sortTab));
    popup.appendChild(tabs);

    const body = document.createElement('div');
    body.className = 'mtable-filter-panel-body';
    popup.appendChild(body);

    // 底部按钮行:左侧"重置"(清除该列筛选与排序),右侧 取消 / 确认
    const footer = document.createElement('div');
    footer.className = 'mtable-filter-footer';
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'mtable-filter-btn mtable-filter-btn-link';
    resetBtn.textContent = messages.reset;
    resetBtn.addEventListener('click', () => {
      ctx.filterSort.resetColumnFilterSort(col);
      // 重置后草稿回到全选
      draftChecked = new Set(
        collectColumnValues(model, ctx.layout.getDataRowCount(), col).map((v) => v.value)
      );
      renderFilterPanelBody();
    });
    footer.appendChild(resetBtn);
    const footerRight = document.createElement('span');
    footerRight.className = 'mtable-filter-footer-right';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'mtable-filter-btn';
    cancelBtn.textContent = messages.cancel;
    cancelBtn.addEventListener('click', close);
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'mtable-filter-btn mtable-filter-btn-primary';
    confirmBtn.textContent = messages.confirm;
    confirmBtn.addEventListener('click', confirmFilterPanel);
    footerRight.appendChild(cancelBtn);
    footerRight.appendChild(confirmBtn);
    footer.appendChild(footerRight);
    popup.appendChild(footer);
    // 确认按钮可用性跟随草稿(勾选数变化时同步)
    popup.addEventListener('change', () => {
      if (!popup) return;
      confirmBtn.disabled = draftChecked.size === 0;
    });

    // 挂到当前浮层容器(body 或全屏弹窗宿主,见 maximize.setOverlayContainer)
    ctx.overlayContainer.appendChild(popup);
    renderFilterPanelBody();

    // 定位:目标列右缘对齐(箭头 x),列头带下方
    const colLeft = ctx.renderer.colToLeftPublic(col);
    const colWidth = ctx.columnWidths[col] ?? config.defaultColumnWidth;
    const arrowCenterX =
      config.rowHeaderWidth + colLeft + colWidth - FILTER_ARROW_RIGHT_MARGIN - FILTER_ARROW_SIZE / 2 - ctx.renderer.scrollX;
    const canvasRect = ctx.canvas.getBoundingClientRect();
    const x = canvasRect.left + arrowCenterX - POPUP_WIDTH / 2;
    const y = canvasRect.top + config.columnHeaderHeight + 4;
    popup.style.left = `${Math.max(x, 8)}px`;
    popup.style.top = `${Math.max(y, 8)}px`;
  };

  return {
    close,
    open,
    get state() {
      return state;
    },
    get popup() {
      return popup;
    }
  };
}
