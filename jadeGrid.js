/* =========================================================================
       MiniQuery：最小 jQuery 相容層（若已有 jQuery，則不載入此層）
       ========================================================================= */
    (function (global) {
      if (global.jQuery) { global.$ = global.jQuery; return; }

      const _dataStore = new WeakMap();
      function _ensureEntry(el) {
        if (!_dataStore.has(el)) _dataStore.set(el, Object.create(null));
        return _dataStore.get(el);
      }

      const fn = {
        each(cb) { this.elements.forEach((el, i) => cb.call(el, i, el)); return this; },
        on(type, handler, opts) { return this.each(function(){ this.addEventListener(type, handler, opts||false); }); },
        off(type, handler, opts) { return this.each(function(){ this.removeEventListener(type, handler, opts||false); }); },
        html(v) {
          if (v === undefined) return this.elements[0]?.innerHTML;
          return this.each(function(){ this.innerHTML = v; });
        },
        append(v) {
          return this.each(function(){
            if (typeof v === 'string') this.insertAdjacentHTML('beforeend', v);
            else if (v instanceof Node) this.appendChild(v.cloneNode(true));
            else if (v && v.elements) v.elements.forEach(n => this.appendChild(n.cloneNode(true)));
          });
        },
        empty() { return this.each(function(){ this.innerHTML = ''; }); },
        data(key, val) {
          if (val === undefined) {
            if (!this.elements[0]) return undefined;
            return _ensureEntry(this.elements[0])[key];
          }
          return this.each(function(){ _ensureEntry(this)[key] = val; });
        },
        attr(name, val) {
          if (val === undefined) return this.elements[0]?.getAttribute(name);
          return this.each(function(){ this.setAttribute(name, val); });
        },
        addClass(c) { return this.each(function(){ this.classList.add(c); }); },
        removeClass(c) { return this.each(function(){ this.classList.remove(c); }); },
        css(prop, val) {
          if (typeof prop === 'string') {
            if (val === undefined) return getComputedStyle(this.elements[0])[prop];
            return this.each(function(){ this.style[prop] = val; });
          } else {
            return this.each(function(){ Object.assign(this.style, prop); });
          }
        },
        first() { return $(this.elements[0]); },
        get(i) { return this.elements[i]; },
        length: 0
      };

      function $(sel, root) {
        let els = [];
        if (typeof sel === 'string') els = Array.from((root || document).querySelectorAll(sel));
        else if (sel instanceof Node) els = [sel];
        else if (sel && typeof sel.length === 'number') els = Array.from(sel);
        const api = Object.create($.fn);
        api.elements = els;
        api.length = els.length;
        return api;
      }
      $.fn = fn;
      global.$ = $;
    })(window);

    /* =========================================================================
       JadeGrid 核心
       ========================================================================= */
    (function (global, $) {
      "use strict";

      const i18n = {
        'zh-TW': {
          searchPlaceholder: '搜尋...',
          exportCSV: '匯出 CSV',
          theme: '主題',
          light: '亮',
          dark: '暗',
          page: '頁',
          of: '共',
          rows: '筆',
          perPage: '每頁',
          first: '最前',
          prev: '上一',
          next: '下一',
          last: '最後',
          sum: '合計',
          avg: '平均',
          min: '最小',
          max: '最大',
          count: '筆數',
          selectAll: '全選',
          clear: '清除',
          validations: {
            required: '此欄位為必填',
            email: 'Email 格式不正確',
            numeric: '必須為數字',
            range: (min, max) => `必須介於 ${min} 到 ${max}`,
          }
        }
      };

      const Utils = {
        deepMerge(target, src) {
          const out = Array.isArray(target) ? target.slice() : { ...target };
          for (const [k, v] of Object.entries(src || {})) {
            if (v && typeof v === 'object' && !Array.isArray(v)) {
              out[k] = Utils.deepMerge(target?.[k] || {}, v);
            } else {
              out[k] = v;
            }
          }
          return out;
        },
        // 穩定排序
        multiSort(data, sortModel) {
          if (!Array.isArray(sortModel) || sortModel.length === 0) return data;
          const arr = data.map((v, i) => ({ v, i }));
          arr.sort((a, b) => {
            for (const s of sortModel) {
              const av = Utils.get(a.v, s.field);
              const bv = Utils.get(b.v, s.field);
              if (av == null && bv != null) return s.dir === 'asc' ? -1 : 1;
              if (av != null && bv == null) return s.dir === 'asc' ? 1 : -1;
              if (av == null && bv == null) continue;
              if (av < bv) return s.dir === 'asc' ? -1 : 1;
              if (av > bv) return s.dir === 'asc' ? 1 : -1;
            }
            return a.i - b.i;
          });
          return arr.map(x => x.v);
        },
        // 取值（支援 a.b.c 路徑）
        get(obj, path) {
          if (!obj) return undefined;
          if (!path || typeof path !== 'string') return obj[path];
          return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
        },
        // 設值（支援 a.b.c 路徑）
        set(obj, path, value) {
          const keys = path.split('.');
          let o = obj;
          keys.forEach((k, i) => {
            if (i === keys.length - 1) o[k] = value;
            else {
              if (!o[k] || typeof o[k] !== 'object') o[k] = {};
              o = o[k];
            }
          });
        },
        // CSV 轉義
        toCSV(rows, columns) {
          const escape = (v) => {
            if (v == null) return '';
            const s = String(v);
            if (/[\",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
            return s;
          };
          const header = columns.filter(c => !c.hidden && !c.__select__).map(c => c.title || c.field);
          const lines = [header.map(escape).join(',')];
          rows.forEach(r => {
            const line = columns
              .filter(c => !c.hidden && !c.__select__)
              .map(c => {
                let v = Utils.get(r, c.field);
                if (c.type === 'date' && v instanceof Date) v = v.toISOString();
                return escape(v);
              }).join(',');
            lines.push(line);
          });
          return lines.join('\n');
        },
        // 基礎驗證器
        validators: {
          required(v) { return v !== null && v !== undefined && String(v).trim() !== ''; },
          email(v) { return v == null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)); },
          numeric(v) { return v == null || !isNaN(Number(v)); },
          range(v, { min = -Infinity, max = Infinity }) {
            if (v == null || v === '') return true;
            const n = Number(v);
            return !isNaN(n) && n >= min && n <= max;
          }
        },
        el(tag, cls, attrs) {
          const e = document.createElement(tag);
          if (cls) e.className = cls;
          if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
          return e;
        },
        text(s) { return document.createTextNode(String(s)); },
        clamp(n, min, max) { return Math.max(min, Math.min(max, n)); },
        throttleRAF(fn) {
          let ticking = false;
          return function (...args) {
            if (!ticking) {
              requestAnimationFrame(() => { fn.apply(this, args); ticking = false; });
              ticking = true;
            }
          };
        },
        uid: (() => { let i = 1; return () => i++; })()
      };

      // 預設參數
      const defaults = {
        columns: [], // { field, title, width, type, align, sortable, filter, editable, validator, summary }
        data: [],    // 本機資料 (array of objects)
        dataSource: null, // { transport: { read: fn|{url, method, headers, data} }, schema: { data, total } }
        height: 480,
        selection: { mode: 'multiple', checkbox: true, preserveOnPageChange: true },
        sorting: { multi: true, server: false },
        filtering: { server: false, searchPanel: { visible: true, placeholder: null } },
        pagination: { server: false, pageSize: 50, pageSizes: [20, 50, 100, 200] },
        virtualization: { rows: true, overscan: 6, rowHeight: 36 },
        editing: { mode: 'cell', validation: { showMessages: true, stopOnFirstError: true } },
        export: { excel: { enabled: true, filename: 'export.csv', onlySelected: false } },
        masterDetail: { enabled: false, lazy: true, template: null },
        locale: 'zh-TW',
        theme: 'light',
        onReady: null, onDataLoaded: null, onError: null,
        // 進階/保留
        rowKey: null // 若為 null，將自動以內建 __rowid
      };

      class JadeGrid {
        static version = '0.9.0';
        static plugins = {};
        static plugin(name, factory) { JadeGrid.plugins[name] = factory; }

        constructor(el, options = {}) {
          this.el = el;
          this.options = Utils.deepMerge(defaults, options || {});
          this.t = i18n[this.options.locale] || i18n['zh-TW'];
          this.state = {
            page: 1,
            pageSize: this.options.pagination.pageSize,
            total: 0,
            sortModel: [], // [{field, dir}]
            search: '',
            selected: new Set(),
            dataOriginal: [],
            dataView: [],
            rowHeight: this.options.virtualization.rowHeight || parseInt(getComputedStyle(document.documentElement).getPropertyValue('--jdg-row-height')) || 36,
          };
          this.columns = [];
          this._rowPool = [];
          this._rowPoolRange = { start: 0, end: -1 };
          this._editing = null; // {rowIndex, colIndex, field, editorEl, cellEl}
          this._events = {};
          this._init();
        }

        /* ----------------------------- 初始化 ------------------------------ */
        _init() {
          // 佈局
          this.el.innerHTML = '';
          this.el.classList.add('jdg-host');
          this.root = Utils.el('div', 'jdg');
          this.root.setAttribute('data-theme', this.options.theme);
          this.el.appendChild(this.root);

          this.toolbar = Utils.el('div', 'jdg-toolbar');
          this.header = Utils.el('div', 'jdg-header');
          this.body = Utils.el('div', 'jdg-body');
          this.footer = Utils.el('div', 'jdg-footer');

          this.body.style.height = (this.options.height || 480) + 'px';

          this.root.append(this.toolbar, this.header, this.body, this.footer);

          // 工具列
          this._buildToolbar();

          // 欄位
          this._setupColumns();

          // 表頭
          this._renderHeader();

          // 內容層（虛擬化）
          this._rowsLayer = Utils.el('div', 'jdg-rows-layer');
          this._spacer = Utils.el('div', 'jdg-virtual-spacer');
          this.body.append(this._rowsLayer, this._spacer);

          this.body.addEventListener('scroll', Utils.throttleRAF(this._onScroll.bind(this)));

          // 監聽大小調整（以簡化處理，使用 ResizeObserver）
          if (window.ResizeObserver) {
            const ro = new ResizeObserver(() => this._layout());
            ro.observe(this.body);
            this._ro = ro;
          }

          // 載入資料
          if (this.options.dataSource) {
            this.reload();
          } else {
            this.setData(this.options.data || []);
          }

          // 套用外掛
          if (Array.isArray(this.options.plugins)) {
            this.options.plugins.forEach(name => {
              const plugin = JadeGrid.plugins[name];
              if (plugin) plugin(this, this.options[name] || {});
            });
          }

          // 事件：ready
          this._emit('onReady', this);
        }

        _buildToolbar() {
          const tb = this.toolbar;
          tb.innerHTML = '';

          // 搜尋
          if (this.options.filtering?.searchPanel?.visible) {
            const input = Utils.el('input', 'jdg-input');
            input.type = 'search';
            input.placeholder = this.options.filtering.searchPanel.placeholder || this.t.searchPlaceholder;
            input.style.minWidth = '180px';
            input.addEventListener('input', () => {
              this.state.search = input.value.trim();
              this._applyPipeline();
            });
            tb.appendChild(input);
          }

          // 每頁筆數
          const per = Utils.el('span', '', { });
          const sel = Utils.el('select', 'jdg-select');
          const sizes = this.options.pagination.pageSizes || [20, 50, 100, 200];
          sizes.forEach(s => {
            const opt = Utils.el('option'); opt.value = s; opt.textContent = `${this.t.perPage}: ${s}`;
            if (s === this.options.pagination.pageSize) opt.selected = true;
            sel.appendChild(opt);
          });
          sel.addEventListener('change', () => {
            this.state.pageSize = parseInt(sel.value, 10);
            this.state.page = 1;
            this._applyPipeline();
          });
          per.appendChild(sel);
          tb.appendChild(per);

          tb.appendChild(Utils.el('div', 'jdg-spacer'));

          // 主題切換
          const themeSel = Utils.el('select', 'jdg-select');
          [['light', this.t.light], ['dark', this.t.dark]].forEach(([v, label]) => {
            const opt = Utils.el('option'); opt.value = v; opt.textContent = `${this.t.theme}: ${label}`;
            if (v === this.options.theme) opt.selected = true;
            themeSel.appendChild(opt);
          });
          themeSel.addEventListener('change', () => {
            this.options.theme = themeSel.value;
            this.root.setAttribute('data-theme', this.options.theme);
          });
          tb.appendChild(themeSel);

          // 匯出 CSV
          if (this.options.export?.excel?.enabled) {
            const btn = Utils.el('button', 'jdg-btn');
            btn.textContent = this.t.exportCSV;
            btn.addEventListener('click', () => this.exportToExcel());
            tb.appendChild(btn);
          }
        }

        _setupColumns() {
          const cols = (this.options.columns || []).map((c, idx) => ({
            field: c.field,
            title: c.title || c.field,
            width: c.width || 140,
            minWidth: Math.max(60, c.minWidth || 60),
            type: c.type || 'text',
            align: c.align || 'left',
            sortable: c.sortable !== false,
            filter: c.filter || null,
            editable: !!c.editable,
            validator: c.validator || null,
            summary: c.summary || null,
            hidden: !!c.hidden,
            resizable: c.resizable !== false,
            __index: idx
          }));

          // 選取欄（checkbox）
          if (this.options.selection?.checkbox) {
            cols.unshift({
              field: '__select__',
              title: '',
              width: 40,
              minWidth: 36,
              type: 'boolean',
              align: 'center',
              sortable: false,
              filter: null,
              editable: false,
              __select__: true,
              resizable: false,
              hidden: false
            });
          }

          this.columns = cols;
        }

        _renderHeader() {
          this.header.innerHTML = '';
          const row = Utils.el('div', 'jdg-header-row');
          this.header.appendChild(row);

          this.columns.forEach((col, idx) => {
            if (col.hidden) return;
            const cell = Utils.el('div', 'jdg-header-cell');
            cell.style.flex = `0 0 ${col.width}px`;
            cell.style.minWidth = `${col.minWidth}px`;
            cell.dataset.colIndex = String(idx);
            cell.dataset.field = col.field;

            // 標題
            const title = Utils.el('div', '');
            title.textContent = col.title || col.field;
            cell.appendChild(title);

            // 排序圖示
            if (col.sortable) {
              const sort = Utils.el('div', 'jdg-sort');
              sort.innerHTML = `<span class="asc">▲</span><span class="desc">▼</span>`;
              cell.appendChild(sort);

              cell.addEventListener('click', (e) => {
                // 點擊 resizer 不觸發排序
                if (e.target.classList.contains('jdg-resizer')) return;

                const exist = this.state.sortModel.find(s => s.field === col.field);
                const multi = e.shiftKey || (this.options.sorting.multi && (e.ctrlKey || e.metaKey));
                let nextDir = 'asc';
                if (exist?.dir === 'asc') nextDir = 'desc';
                else if (exist?.dir === 'desc') nextDir = null;

                if (!multi) this.state.sortModel = [];
                if (nextDir) {
                  const other = this.state.sortModel.filter(s => s.field !== col.field);
                  this.state.sortModel = [...other, { field: col.field, dir: nextDir }];
                } else {
                  this.state.sortModel = this.state.sortModel.filter(s => s.field !== col.field);
                }
                this._updateSortIndicators();
                this._applyPipeline();
              });
            }

            // 調整欄寬
            if (col.resizable) {
              const resizer = Utils.el('div', 'jdg-resizer');
              let startX = 0, startW = 0;
              const onMove = (ev) => {
                const dx = ev.clientX - startX;
                const newW = Math.max(col.minWidth, startW + dx);
                col.width = newW;
                cell.style.flex = `0 0 ${newW}px`;
                this._layout(); // 更新列寬
              };
              const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
              };
              resizer.addEventListener('mousedown', (ev) => {
                startX = ev.clientX;
                startW = col.width;
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
              });
              cell.appendChild(resizer);
            }

            row.appendChild(cell);
          });

          this._updateSortIndicators();
        }

        _updateSortIndicators() {
          // 更新表頭排序箭頭顏色
          const sortModel = this.state.sortModel;
          this.header.querySelectorAll('.jdg-header-cell').forEach(cell => {
            const field = cell.dataset.field;
            const indicator = cell.querySelector('.jdg-sort');
            if (!indicator) return;
            const m = sortModel.find(s => s.field === field);
            indicator.querySelector('.asc')?.classList.toggle('active', m?.dir === 'asc');
            indicator.querySelector('.desc')?.classList.toggle('active', m?.dir === 'desc');
          });
        }

        /* ----------------------------- 資料載入/管線 ------------------------------ */
        setData(array) {
          // 產生 rowKey
          const key = this.options.rowKey;
          array.forEach((r, i) => {
            if (key && r[key] != null) return;
            if (!r.__rowid) r.__rowid = Utils.uid();
          });
          this.state.dataOriginal = array.slice();
          this.state.page = 1;
          this._applyPipeline();
        }

        async reload() {
          if (!this.options.dataSource?.transport?.read) return;
          try {
            const params = this._composeServerParams();
            const { items, total } = await this._readDataSource(params);
            this.state.total = total;
            // server 分頁：直接用回傳 items
            this.state.dataOriginal = items || [];
            this._applyPipeline(/*serverMode*/true);
            this._emit('onDataLoaded', { data: this.state.dataView, total: this.state.total });
          } catch (err) {
            console.error(err);
            this._emit('onError', err);
          }
        }

        _composeServerParams() {
          return {
            page: this.state.page,
            pageSize: this.state.pageSize,
            sort: this.state.sortModel.slice(),
            filter: this.state.search ? [{ field: '*', op: 'contains', value: this.state.search }] : []
          };
        }

        _readDataSource(params) {
          const read = this.options.dataSource.transport.read;
          const schema = this.options.dataSource.schema || { data: 'items', total: 'total' };

          if (typeof read === 'function') {
            return Promise.resolve(read(params)).then(res => ({
              items: schema.data ? Utils.get(res, schema.data) : res.items || res.data || res,
              total: schema.total ? Utils.get(res, schema.total) : res.total ?? (res.items?.length ?? 0)
            }));
          } else {
            const { url, method = 'POST', headers = {}, data = null } = read;
            return fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json', ...headers },
              body: JSON.stringify(data || params)
            }).then(r => r.json()).then(res => ({
              items: schema.data ? Utils.get(res, schema.data) : res.items || res.data || res,
              total: schema.total ? Utils.get(res, schema.total) : res.total ?? (res.items?.length ?? 0)
            }));
          }
        }

        _applyPipeline(serverMode = false) {
          const { dataOriginal } = this.state;
          let rows = dataOriginal.slice();

          // 搜尋過濾（本機）
          if (!serverMode && this.state.search) {
            const q = this.state.search.toLowerCase();
            const searchFields = this.columns.filter(c => !c.__select__ && !c.hidden).map(c => c.field);
            rows = rows.filter(r => searchFields.some(f => {
              const v = Utils.get(r, f);
              return v != null && String(v).toLowerCase().includes(q);
            }));
          }

          // 排序（本機）
          if (!serverMode && this.state.sortModel.length) {
            rows = Utils.multiSort(rows, this.state.sortModel);
          }

          // 總筆數
          const total = serverMode ? (this.state.total || 0) : rows.length;

          // 分頁（本機或 server 返回後做頁面呈現）
          let pageRows = rows;
          if (!serverMode && this.options.pagination && !this.options.pagination.server) {
            const { page, pageSize } = this.state;
            const start = (page - 1) * pageSize;
            pageRows = rows.slice(start, start + pageSize);
          }

          this.state.dataView = pageRows;
          this.state.total = total;

          // 更新虛擬化高度與渲染
          const totalRenderCount = this._getRenderCount();
          this._spacer.style.height = (totalRenderCount * this.state.rowHeight) + 'px';

          // 重新建立 row pool（依視窗高度）
          this._ensureRowPool();

          // 初次布局與渲染
          this._layout();
          this._onScroll();

          // 更新分頁列
          this._renderFooter();
        }

        /* ------------------------------ 版面/捲動 ------------------------------- */
        _layout() {
          // 將每個資料列的 cell 寬度對齊表頭
          const widths = this._currentVisibleColumnWidths();
          // 更新 header cell flex (已隨時調整)
          // 更新 pool rows cell flex
          for (const row of this._rowPool) {
            const cells = row.querySelectorAll('.jdg-cell');
            let j = 0;
            this.columns.forEach((col) => {
              if (col.hidden) return;
              const cell = cells[j++];
              if (!cell) return;
              cell.style.flex = `0 0 ${widths[col.field]}px`;
              cell.style.minWidth = `${widths[col.field]}px`;
              cell.classList.toggle('align-right', col.align === 'right');
              cell.classList.toggle('align-center', col.align === 'center');
            });
          }
        }

        _getRenderCount() {
          // 虛擬化：以目前頁面資料數量為基礎
          const count = this.state.dataView.length;
          return count;
        }

        _ensureRowPool() {
          const vh = this.body.clientHeight || this.body.getBoundingClientRect().height || 480;
          const rowH = this.state.rowHeight;
          const overscan = this.options.virtualization.overscan || 6;
          const need = Math.min(this._getRenderCount(), Math.ceil(vh / rowH) + overscan * 2);

          if (this._rowPool.length === need) return;

          // 清空重建
          this._rowsLayer.innerHTML = '';
          this._rowPool = [];
          for (let i = 0; i < need; i++) {
            const rowEl = Utils.el('div', 'jdg-row');
            rowEl.dataset.poolIndex = String(i);

            // 生成 cells
            this.columns.forEach((col) => {
              if (col.hidden) return;
              const cell = Utils.el('div', 'jdg-cell');
              cell.dataset.field = col.field;
              // selection checkbox
              if (col.__select__) {
                const cb = Utils.el('input');
                cb.type = 'checkbox';
                cb.addEventListener('click', (e) => {
                  e.stopPropagation();
                  const absIndex = Number(rowEl.dataset.absIndex || -1);
                  const row = this._getAbsoluteRow(absIndex);
                  if (!row) return;
                  const key = this._rowKey(row);
                  const checked = cb.checked;
                  if (checked) this.state.selected.add(key);
                  else this.state.selected.delete(key);
                  this._updateRowSelectionVisual(rowEl, key);
                });
                cell.appendChild(cb);
                cell.style.justifyContent = 'center';
              }
              rowEl.appendChild(cell);
            });

            // 列點擊：選取 / 進入編輯
            rowEl.addEventListener('click', (e) => {
              const absIndex = Number(rowEl.dataset.absIndex || -1);
              const row = this._getAbsoluteRow(absIndex);
              if (!row) return;
              // 切換選取（若有 selection.mode）
              if (this.options.selection?.mode && !this.options.selection.checkbox) {
                const key = this._rowKey(row);
                const multi = e.ctrlKey || e.metaKey;
                if (this.options.selection.mode === 'single' && !multi) {
                  this.state.selected.clear();
                }
                if (this.state.selected.has(key)) this.state.selected.delete(key);
                else this.state.selected.add(key);
                this._updateRowSelectionVisual(rowEl, key);
                this._emit('onSelectionChanged', { rows: this.getSelectedRows() });
              }
            });

            // Cell 雙擊：啟動編輯
            rowEl.addEventListener('dblclick', (e) => {
              const cellEl = e.target.closest('.jdg-cell');
              if (!cellEl) return;
              const field = cellEl.dataset.field;
              const col = this.columns.find(c => c.field === field);
              if (!col || !col.editable) return;

              const absIndex = Number(rowEl.dataset.absIndex || -1);
              const row = this._getAbsoluteRow(absIndex);
              if (!row) return;

              const colIndex = this._visibleColumnIndex(field);
              this.startEdit({ rowIndex: absIndex, colKey: field, colIndex, cellEl });
            });

            this._rowsLayer.appendChild(rowEl);
            this._rowPool.push(rowEl);
          }
        }

        _visibleColumnIndex(field) {
          let j = 0;
          for (const c of this.columns) {
            if (c.hidden) continue;
            if (c.field === field) return j;
            j++;
          }
          return -1;
        }

        _onScroll() {
          const st = this.body.scrollTop;
          const rowH = this.state.rowHeight;
          const startIndex = Math.floor(st / rowH) - (this.options.virtualization.overscan || 6);
          const start = Utils.clamp(startIndex, 0, Math.max(0, this._getRenderCount() - this._rowPool.length));
          const end = Math.min(start + this._rowPool.length, this._getRenderCount());
          if (this._rowPoolRange.start === start && this._rowPoolRange.end === end) return;
          this._rowPoolRange = { start, end };

          for (let i = start; i < end; i++) {
            const poolRow = this._rowPool[i - start];
            const top = i * rowH;
            poolRow.style.transform = `translateY(${top}px)`;
            poolRow.dataset.absIndex = String(i);
            this._bindRow(poolRow, i);
          }
        }

        _bindRow(rowEl, absIndex) {
          const row = this._getAbsoluteRow(absIndex);
          const selectedKey = this._rowKey(row);
          const cells = rowEl.querySelectorAll('.jdg-cell');
          let j = 0;

          this.columns.forEach((col) => {
            if (col.hidden) return;
            const cell = cells[j++];
            if (!cell) return;

            // 值
            if (col.__select__) {
              const cb = cell.querySelector('input[type="checkbox"]');
              cb.checked = this.state.selected.has(selectedKey);
            } else {
              const v = Utils.get(row, col.field);
              cell.textContent = v == null ? '' : (col.type === 'date' && v instanceof Date ? v.toISOString().slice(0,10) : v);
              // 對齊
              cell.classList.toggle('align-right', col.align === 'right');
              cell.classList.toggle('align-center', col.align === 'center');
            }
          });

          this._updateRowSelectionVisual(rowEl, selectedKey);
        }

        _updateRowSelectionVisual(rowEl, key) {
          rowEl.classList.toggle('selected', this.state.selected.has(key));
        }

        _getAbsoluteRow(absIndex) {
          return this.state.dataView[absIndex];
        }

        _currentVisibleColumnWidths() {
          const widths = {};
          this.columns.forEach(c => {
            if (!c.hidden) widths[c.field] = c.width;
          });
          return widths;
        }

        /* ------------------------------- 分頁列 -------------------------------- */
        _renderFooter() {
          const f = this.footer;
          f.innerHTML = '';

          const page = this.state.page;
          const pageSize = this.state.pageSize;
          const total = this.state.total;
          const totalPages = Math.max(1, Math.ceil(total / pageSize));
          const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
          const end = Math.min(page * pageSize, total);

          const stats = Utils.el('div', 'stats');
          stats.textContent = `${start}-${end} / ${total} ${this.t.rows}`;
          f.appendChild(stats);

          const mkBtn = (label, onClick) => {
            const b = Utils.el('button', 'jdg-page-btn'); b.textContent = label; b.addEventListener('click', onClick); return b;
          };
          f.appendChild(mkBtn('⏮', () => { this.goToPage(1); })); // first
          f.appendChild(mkBtn('◀', () => { this.goToPage(page - 1); })); // prev

          const pageInput = Utils.el('input');
          pageInput.type = 'number'; pageInput.min = 1; pageInput.max = totalPages; pageInput.value = String(page);
          pageInput.addEventListener('change', () => {
            let p = parseInt(pageInput.value, 10);
            if (isNaN(p)) p = page;
            p = Utils.clamp(p, 1, totalPages);
            this.goToPage(p);
          });
          f.appendChild(pageInput);

          f.appendChild(Utils.el('span', '', { }).appendChild(document.createTextNode(` / ${totalPages}`)) || document.createTextNode(''));

          f.appendChild(mkBtn('▶', () => { this.goToPage(page + 1); })); // next
          f.appendChild(mkBtn('⏭', () => { this.goToPage(totalPages); })); // last
        }

        goToPage(p) {
          const pageSize = this.state.pageSize;
          const totalPages = Math.max(1, Math.ceil(this.state.total / pageSize));
          const page = Utils.clamp(p, 1, totalPages);
          if (page === this.state.page) return;
          this.state.page = page;
          if (this.options.pagination.server || this.options.filtering.server || this.options.sorting.server) {
            this.reload();
          } else {
            this._applyPipeline();
            this.body.scrollTop = 0;
          }
        }

        /* ------------------------------- 編輯 ----------------------------------- */
        startEdit({ rowIndex, colKey, colIndex, cellEl }) {
          const row = this._getAbsoluteRow(rowIndex);
          const col = this.columns.find(c => c.field === colKey);
          if (!row || !col || !col.editable) return;

          this.cancelEdits();

          // 計算編輯器位置與大小
          const cellRect = cellEl.getBoundingClientRect();
          const bodyRect = this.body.getBoundingClientRect();
          const left = cellRect.left - bodyRect.left + this.body.scrollLeft;
          const top = cellRect.top - bodyRect.top + this.body.scrollTop + 3;
          const width = cellRect.width - 6;
          const height = cellRect.height - 6;

          const editor = Utils.el('div', 'jdg-editor');
          editor.style.left = left + 'px';
          editor.style.top = top + 'px';
          editor.style.width = width + 'px';
          editor.style.height = height + 'px';

          const input = Utils.el('input');
          input.type = (col.type === 'number') ? 'number' : (col.type === 'date' ? 'date' : 'text');
          const current = Utils.get(row, col.field);
          input.value = current == null ? '' : (col.type === 'date' && current instanceof Date ? current.toISOString().slice(0,10) : current);
          editor.appendChild(input);

          const validateMsg = Utils.el('div', 'jdg-validate-msg');
          validateMsg.style.display = 'none';
          editor.appendChild(validateMsg);

          const done = (commit) => {
            if (commit) {
              // 驗證
              const { valid, message } = this._validateValue(col, input.value);
              if (!valid) {
                if (this.options.editing.validation.showMessages) {
                  validateMsg.textContent = message || '';
                  validateMsg.style.display = 'block';
                }
                input.focus();
                return;
              }
              let value = input.value;
              if (col.type === 'number') value = (value === '' ? null : Number(value));
              if (col.type === 'date') value = (value ? value : '');
              const oldValue = Utils.get(row, col.field);
              Utils.set(row, col.field, value);
              this._emit('onCellEditCommit', { row, col, oldValue, newValue: value, valid: true });
              // 局部刷新該 cell
              if (cellEl) cellEl.textContent = (value == null ? '' : value);
            } else {
              this._emit('onCellEditCancel', { row, col });
            }
            editor.remove();
            this._editing = null;
          };

          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { done(true); }
            else if (e.key === 'Escape') { done(false); }
          });
          input.addEventListener('blur', () => done(true));

          this.body.appendChild(editor);
          input.focus();
          input.select();

          this._editing = { rowIndex, colIndex, field: col.field, editorEl: editor, cellEl };
          this._emit('onCellEditStart', { row, col, oldValue: current });
        }

        _validateValue(col, val) {
          const vdefs = [].concat(col.validator || []);
          const msgs = this.t.validations || {};
          for (const rule of vdefs) {
            if (typeof rule === 'string') {
              const ok = Utils.validators[rule]?.(val);
              if (!ok) return { valid: false, message: msgs[rule] || 'Invalid' };
            } else if (typeof rule === 'object') {
              if (rule.type === 'range') {
                const ok = Utils.validators.range(val, rule);
                if (!ok) return { valid: false, message: msgs.range?.(rule.min, rule.max) || 'Out of range' };
              } else if (rule.type === 'numeric') {
                const ok = Utils.validators.numeric(val);
                if (!ok) return { valid: false, message: msgs.numeric };
              } else if (rule.type === 'custom' && typeof rule.fn === 'function') {
                const ok = rule.fn(val);
                if (!ok) return { valid: false, message: rule.message || 'Invalid' };
              }
            }
          }
          return { valid: true };
        }

        commitEdits() {
          if (!this._editing) return;
          const { editorEl } = this._editing;
          const input = editorEl.querySelector('input,select,textarea');
          input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        }

        cancelEdits() {
          if (!this._editing) return;
          const { editorEl } = this._editing;
          editorEl?.remove();
          this._editing = null;
        }

        /* ----------------------------- 選取與 API ------------------------------- */
        getSelectedRows() {
          const keys = this.state.selected;
          const arr = [];
          const keyName = this.options.rowKey || '__rowid';
          // 在目前視圖與原始資料中掃描
          for (const r of this.state.dataOriginal) {
            const k = r[keyName];
            if (keys.has(k)) arr.push(r);
          }
          return arr;
        }
        selectAll() {
          const keyName = this.options.rowKey || '__rowid';
          this.state.selected.clear();
          for (const r of this.state.dataOriginal) {
            this.state.selected.add(r[keyName]);
          }
          this._onScroll(); // 更新視覺
          this._emit('onSelectionChanged', { rows: this.getSelectedRows() });
        }
        clearSelection() {
          this.state.selected.clear();
          this._onScroll();
          this._emit('onSelectionChanged', { rows: [] });
        }

        getData() { return this.state.dataOriginal.slice(); }
        setState(state) {
          if (state.page) this.state.page = state.page;
          if (state.pageSize) this.state.pageSize = state.pageSize;
          if (state.sortModel) this.state.sortModel = state.sortModel.slice();
          this._updateSortIndicators();
          if (this.options.pagination.server || this.options.filtering.server || this.options.sorting.server) this.reload();
          else this._applyPipeline();
        }
        getState() {
          return {
            page: this.state.page,
            pageSize: this.state.pageSize,
            sortModel: this.state.sortModel.slice()
          };
        }

        scrollToRow(index) {
          const rowH = this.state.rowHeight;
          this.body.scrollTop = index * rowH;
        }

        exportToExcel(opts = {}) {
          const { filename, onlySelected } = Object.assign({}, this.options.export.excel, opts);
          let rows = onlySelected ? this.getSelectedRows() : this.state.dataOriginal;
          const csv = Utils.toCSV(rows, this.columns);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = filename || 'export.csv';
          document.body.appendChild(a);
          a.click();
          URL.revokeObjectURL(a.href);
          a.remove();
        }

        sizeColumnsToFit() {
          // 以容器寬平均分配（不含隱藏/選取欄）
          const width = this.body.clientWidth;
          const visibleCols = this.columns.filter(c => !c.hidden);
          const totalFixed = visibleCols.reduce((s, c) => s + (c.__select__ ? c.width : 0), 0);
          const freeCols = visibleCols.filter(c => !c.__select__);
          const w = Math.max(60, Math.floor((width - totalFixed) / freeCols.length));
          freeCols.forEach(c => c.width = w);
          // 套用至 header 與 rows
          this.header.querySelectorAll('.jdg-header-cell').forEach((cell, i) => {
            const field = cell.dataset.field;
            const col = this.columns.find(c => c.field === field);
            if (!col) return;
            cell.style.flex = `0 0 ${col.width}px`;
            cell.style.minWidth = `${col.minWidth}px`;
          });
          this._layout();
          this._onScroll();
        }

        destroy() {
          try { this._ro?.disconnect(); } catch {}
          this.el.innerHTML = '';
        }

        /* ------------------------------- 工具 ------------------------------- */
        _rowKey(row) {
          const key = this.options.rowKey || '__rowid';
          return row[key];
        }

        _emit(name, payload) {
          const handler = this.options[name];
          if (typeof handler === 'function') handler(payload);
        }
      }

      /* ------------------------------ jQuery 外掛 ------------------------------ */
      function jQueryAdapter($) {
        if (!$.fn) $.fn = {};
        $.fn.jadeGrid = function (arg1, ...args) {
          // 呼叫方法
          if (typeof arg1 === 'string') {
            const method = arg1;
            const el = this.get ? this.get(0) : (this.elements ? this.elements[0] : this[0]);
            if (!el) return this;
            const inst = ($(el).data && $(el).data('jadeGrid')) || el.__jadegrid__;
            if (!inst) { console.warn('JadeGrid instance not found'); return this; }
            const fn = inst[method] || inst?.api?.[method];
            if (typeof fn === 'function') {
              const ret = fn.apply(inst, args);
              return ret === undefined ? this : ret;
            } else {
              console.warn('Unknown method:', method);
              return this;
            }
          }

          // 建立實例
          return this.each(function () {
            const el = this;
            const inst = new JadeGrid(el, arg1 || {});
            if ($.fn.data) $(el).data('jadeGrid', inst);
            el.__jadegrid__ = inst;
          });
        };

        // 若不存在 data()（MiniQuery 有 data），略
      }

      // 導出到全域
      global.JadeGrid = JadeGrid;
      if ($) jQueryAdapter($);

    })(window, window.$);

    /* =========================================================================
       示例：生成 10,000 筆資料並初始化 JadeGrid
       ========================================================================= */
    (function(){
      // 產生範例資料
      function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
      const firstNames = ['John', 'Mary', 'Mike', 'Linda', 'Alex', 'Grace', 'Ben', 'Hannah', 'Leo', 'Sophie'];
      const lastNames = ['Chen', 'Wang', 'Lin', 'Lee', 'Liu', 'Huang', 'Zhang', 'Wu', 'Yang', 'Tsai'];
      const cities = ['Taipei', 'Taichung', 'Tainan', 'Kaohsiung', 'Hsinchu', 'Keelung', 'Taoyuan'];
      const roles = ['Admin', 'Editor', 'Viewer', 'Analyst'];
      const data = [];
      for (let i = 1; i <= 10000; i++) {
        const fn = firstNames[randInt(0, firstNames.length - 1)];
        const ln = lastNames[randInt(0, lastNames.length - 1)];
        const name = `${fn} ${ln}`;
        const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`;
        const age = randInt(18, 70);
        const city = cities[randInt(0, cities.length - 1)];
        const role = roles[randInt(0, roles.length - 1)];
        data.push({ id: i, name, email, age, city, role, createdAt: new Date(2020 + (i % 5), i % 12, (i % 28) + 1).toISOString().slice(0,10) });
      }

      // 初始化
      $('#grid').jadeGrid({
        height: 520,
        theme: 'light',
        rowKey: 'id',
        columns: [
          { field: 'name',  title: '姓名', sortable: true, editable: true, validator: ['required'] },
          { field: 'email', title: 'Email', sortable: true, editable: true, validator: ['required', 'email'], width: 220 },
          { field: 'age',   title: '年齡', type: 'number', align: 'right', sortable: true, editable: true, validator: [{ type: 'range', min: 0, max: 120 }], width: 80 },
          { field: 'city',  title: '城市', sortable: true, width: 120 },
          { field: 'role',  title: '角色', sortable: true, width: 120 },
          { field: 'createdAt', title: '建立日期', type: 'date', sortable: true, width: 120 }
        ],
        data,
        selection: { mode: 'multiple', checkbox: true, preserveOnPageChange: true },
        sorting: { multi: true, server: false },
        filtering: { server: false, searchPanel: { visible: true, placeholder: '搜尋姓名/Email/城市...' } },
        pagination: { pageSize: 50, pageSizes: [20, 50, 100, 200], server: false },
        virtualization: { rows: true, overscan: 8, rowHeight: 36 },
        editing: { mode: 'cell', validation: { showMessages: true } },
        export: { excel: { enabled: true, filename: 'users.csv', onlySelected: false } },
        onReady(grid) {
          console.log('JadeGrid ready v' + JadeGrid.version);
        },
        onSelectionChanged({ rows }) {
          console.log('選取筆數：', rows.length);
        },
        onCellEditCommit({ row, col, oldValue, newValue }) {
          console.log('編輯完成：', col.field, oldValue, '->', newValue);
        }
      });

      // 若要在其他地方呼叫 API（示例）：
      // const inst = $('#grid').data('jadeGrid');
      // inst.selectAll();
      // const selected = inst.getSelectedRows();
      // inst.exportToExcel({ onlySelected: true });

    })();