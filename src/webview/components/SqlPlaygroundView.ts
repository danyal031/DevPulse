import { Language, t } from '../i18n';
import { ICONS } from '../icons';
import {
  SqlDialect,
  SqlColumnDef,
  SqlTableSchema,
  COMMON_SQL_DATA_TYPES,
  generateCreateTableDdl,
  generateSampleQuery
} from '../../utils/sqlBuilder';

export interface SqlPlaygroundState {
  tableName: string;
  dialect: SqlDialect;
  columns: SqlColumnDef[];
  activeQueryType?: 'ddl' | 'select_all' | 'pagination' | 'insert' | 'update' | 'search' | 'join';
}

export class SqlPlaygroundView {
  private container: HTMLElement;
  private currentLang: Language;
  private postMessage: (msg: any) => void;

  private tableName: string = 'users';
  private dialect: SqlDialect = 'postgres';
  private columns: SqlColumnDef[] = [
    {
      id: '1',
      name: 'id',
      type: 'BIGINT',
      isPrimaryKey: true,
      isAutoIncrement: true,
      isNotNull: true,
      isUnique: true
    },
    {
      id: '2',
      name: 'email',
      type: 'VARCHAR',
      lengthOrPrecision: '255',
      isPrimaryKey: false,
      isAutoIncrement: false,
      isNotNull: true,
      isUnique: true
    },
    {
      id: '3',
      name: 'created_at',
      type: 'TIMESTAMP',
      isPrimaryKey: false,
      isAutoIncrement: false,
      isNotNull: true,
      isUnique: false,
      defaultValue: 'CURRENT_TIMESTAMP'
    }
  ];

  private activeQueryType: 'ddl' | 'select_all' | 'pagination' | 'insert' | 'update' | 'search' | 'join' = 'ddl';
  private copyTimeout: any = null;

  constructor(container: HTMLElement, lang: Language, postMessage: (msg: any) => void) {
    this.container = container;
    this.currentLang = lang;
    this.postMessage = postMessage;

    this.render();
  }

  public setLanguage(lang: Language) {
    this.currentLang = lang;
    this.render();
  }

  public getState(): SqlPlaygroundState {
    return {
      tableName: this.tableName,
      dialect: this.dialect,
      columns: this.columns,
      activeQueryType: this.activeQueryType
    };
  }

  public restoreState(state: any) {
    if (!state) return;
    if (typeof state.tableName === 'string') this.tableName = state.tableName;
    if (state.dialect) this.dialect = state.dialect;
    if (Array.isArray(state.columns)) this.columns = state.columns;
    if (state.activeQueryType) this.activeQueryType = state.activeQueryType;

    this.render();
  }

  private render() {
    const schema: SqlTableSchema = {
      tableName: this.tableName,
      dialect: this.dialect,
      columns: this.columns
    };

    let generatedCode = '';
    if (this.activeQueryType === 'ddl') {
      generatedCode = generateCreateTableDdl(schema);
    } else {
      generatedCode = generateSampleQuery(schema, this.activeQueryType);
    }

    this.container.innerHTML = `
      <div class="sql-view-wrapper">
        <!-- Header -->
        <div class="section-header">
          <div class="section-title-wrap">
            <span class="section-icon sql-glow-icon">${ICONS.database}</span>
            <div class="section-text">
              <h3 class="section-title">${t('sqlTitle', this.currentLang)}</h3>
              <p class="section-subtitle">${t('sqlSubtitle', this.currentLang)}</p>
            </div>
          </div>
        </div>

        <!-- Controls: Table Name & Dialect -->
        <div class="sql-top-controls card">
          <div class="sql-control-group">
            <label class="form-label">${t('sqlDialect', this.currentLang)}</label>
            <div class="segmented-pills">
              <button class="pill-btn ${this.dialect === 'postgres' ? 'active' : ''}" data-dialect="postgres">
                <span class="dialect-dot dot-postgres"></span> PostgreSQL
              </button>
              <button class="pill-btn ${this.dialect === 'mysql' ? 'active' : ''}" data-dialect="mysql">
                <span class="dialect-dot dot-mysql"></span> MySQL
              </button>
              <button class="pill-btn ${this.dialect === 'sqlite' ? 'active' : ''}" data-dialect="sqlite">
                <span class="dialect-dot dot-sqlite"></span> SQLite
              </button>
            </div>
          </div>

          <div class="sql-control-group">
            <label class="form-label">${t('sqlTableName', this.currentLang)}</label>
            <div class="sql-table-input-wrap">
              <span class="sql-table-prefix">${ICONS.database}</span>
              <input
                type="text"
                id="sql-table-name-input"
                class="sql-input code-text input-text"
                value="${this.escapeHtml(this.tableName)}"
                placeholder="e.g. users or orders"
              />
            </div>
          </div>
        </div>

        <!-- Column Designer Table -->
        <div class="sql-columns-designer card">
          <div class="columns-designer-header">
            <div class="designer-title-wrap">
              <span class="designer-title">Table Columns</span>
              <span class="col-count-pill">${this.columns.length}</span>
            </div>
            <button id="sql-add-column-btn" class="btn btn-sm btn-primary">
              ${ICONS.plus} <span>${t('sqlAddColumn', this.currentLang)}</span>
            </button>
          </div>

          <div class="sql-columns-list">
            ${this.columns.map((col, idx) => this.renderColumnRow(col, idx)).join('')}
          </div>
        </div>

        <!-- Query Templates Selector -->
        <div class="sql-templates-bar card">
          <div class="templates-header">
            <span class="templates-label">${t('sqlSampleQueries', this.currentLang)}</span>
          </div>
          <div class="templates-chips">
            <button class="tmpl-chip ${this.activeQueryType === 'ddl' ? 'active' : ''}" data-tmpl="ddl">
              CREATE TABLE
            </button>
            <button class="tmpl-chip ${this.activeQueryType === 'select_all' ? 'active' : ''}" data-tmpl="select_all">
              ${t('sqlQuerySelect', this.currentLang)}
            </button>
            <button class="tmpl-chip ${this.activeQueryType === 'pagination' ? 'active' : ''}" data-tmpl="pagination">
              ${t('sqlQueryPagination', this.currentLang)}
            </button>
            <button class="tmpl-chip ${this.activeQueryType === 'insert' ? 'active' : ''}" data-tmpl="insert">
              ${t('sqlQueryInsert', this.currentLang)}
            </button>
            <button class="tmpl-chip ${this.activeQueryType === 'update' ? 'active' : ''}" data-tmpl="update">
              ${t('sqlQueryUpdate', this.currentLang)}
            </button>
            <button class="tmpl-chip ${this.activeQueryType === 'search' ? 'active' : ''}" data-tmpl="search">
              ${t('sqlQuerySearch', this.currentLang)}
            </button>
            <button class="tmpl-chip ${this.activeQueryType === 'join' ? 'active' : ''}" data-tmpl="join">
              ${t('sqlQueryJoin', this.currentLang)}
            </button>
          </div>
        </div>

        <!-- Output Code Box -->
        <div class="sql-output-card card">
          <div class="output-header">
            <div class="output-badge-wrap">
              <span class="output-title-pill">${this.activeQueryType.toUpperCase()}</span>
              <span class="output-dialect-pill">${this.dialect.toUpperCase()}</span>
            </div>
            <div class="action-btn-group">
              <button id="sql-copy-btn" class="btn btn-sm">
                ${ICONS.copy} <span id="sql-copy-text">${t('sqlCopy', this.currentLang)}</span>
              </button>
              <button id="sql-insert-btn" class="btn btn-sm">
                ${ICONS.insert} <span>${t('sqlInsert', this.currentLang)}</span>
              </button>
            </div>
          </div>
          <pre class="sql-code-view"><code>${this.escapeHtml(generatedCode)}</code></pre>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderColumnRow(col: SqlColumnDef, idx: number): string {
    return `
      <div class="column-card" data-idx="${idx}">
        <!-- Row 1: Index Badge, Name, Type, Length, Delete -->
        <div class="col-main-row">
          <span class="col-idx-badge" title="Column #${idx + 1}">#${idx + 1}</span>
          <input
            type="text"
            class="col-name-input code-text input-text"
            data-idx="${idx}"
            placeholder="${t('sqlColName', this.currentLang)}"
            value="${this.escapeHtml(col.name)}"
          />

          <select class="col-type-select input-text" data-idx="${idx}">
            ${COMMON_SQL_DATA_TYPES.map((tName) => `
              <option value="${tName}" ${col.type.toUpperCase() === tName ? 'selected' : ''}>${tName}</option>
            `).join('')}
          </select>

          <input
            type="text"
            class="col-len-input code-text input-text"
            data-idx="${idx}"
            placeholder="Len"
            title="Length or Precision e.g. 255 or 10,2"
            value="${this.escapeHtml(col.lengthOrPrecision || '')}"
          />

          <button class="icon-btn-secondary col-delete-btn" data-idx="${idx}" title="Delete column">
            ${ICONS.trash}
          </button>
        </div>

        <!-- Row 2: Constraints Flags (PK, Auto, NotNull, Unique, Default) -->
        <div class="col-flags-row">
          <label class="flag-check-label flag-pk ${col.isPrimaryKey ? 'active-flag' : ''}" title="Primary Key">
            <input type="checkbox" class="col-pk-check" data-idx="${idx}" ${col.isPrimaryKey ? 'checked' : ''} />
            <span class="flag-label-text">${t('sqlPk', this.currentLang)}</span>
          </label>

          <label class="flag-check-label flag-auto ${col.isAutoIncrement ? 'active-flag' : ''}" title="Auto Increment">
            <input type="checkbox" class="col-auto-check" data-idx="${idx}" ${col.isAutoIncrement ? 'checked' : ''} />
            <span class="flag-label-text">${t('sqlAutoInc', this.currentLang)}</span>
          </label>

          <label class="flag-check-label flag-nn ${col.isNotNull ? 'active-flag' : ''}" title="Not Null">
            <input type="checkbox" class="col-nn-check" data-idx="${idx}" ${col.isNotNull ? 'checked' : ''} />
            <span class="flag-label-text">${t('sqlNotNull', this.currentLang)}</span>
          </label>

          <label class="flag-check-label flag-uq ${col.isUnique ? 'active-flag' : ''}" title="Unique">
            <input type="checkbox" class="col-uq-check" data-idx="${idx}" ${col.isUnique ? 'checked' : ''} />
            <span class="flag-label-text">${t('sqlUnique', this.currentLang)}</span>
          </label>

          <input
            type="text"
            class="col-default-input code-text input-text"
            data-idx="${idx}"
            placeholder="Default e.g. 0"
            title="Default value or expression"
            value="${this.escapeHtml(col.defaultValue || '')}"
          />
        </div>

        <!-- Optional Row 3: Foreign Key reference -->
        <div class="col-fk-row">
          <span class="fk-indicator-badge">FK</span>
          <input
            type="text"
            class="col-fk-table code-text input-text"
            data-idx="${idx}"
            placeholder="FK Table (e.g. roles)"
            value="${this.escapeHtml(col.foreignKey?.targetTable || '')}"
          />
          <input
            type="text"
            class="col-fk-col code-text input-text"
            data-idx="${idx}"
            placeholder="FK Column (e.g. id)"
            value="${this.escapeHtml(col.foreignKey?.targetColumn || '')}"
          />
          <select class="col-fk-on-del input-text" data-idx="${idx}">
            <option value="CASCADE" ${col.foreignKey?.onDelete === 'CASCADE' ? 'selected' : ''}>CASCADE</option>
            <option value="SET NULL" ${col.foreignKey?.onDelete === 'SET NULL' ? 'selected' : ''}>SET NULL</option>
            <option value="RESTRICT" ${col.foreignKey?.onDelete === 'RESTRICT' ? 'selected' : ''}>RESTRICT</option>
          </select>
        </div>
      </div>
    `;
  }

  private attachEvents() {
    // Dialect selector
    const dialectBtns = this.container.querySelectorAll('[data-dialect]');
    dialectBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = (btn as HTMLElement).getAttribute('data-dialect') as SqlDialect;
        if (d) {
          this.dialect = d;
          this.render();
        }
      });
    });

    // Table Name input
    const tableNameInput = this.container.querySelector('#sql-table-name-input') as HTMLInputElement;
    if (tableNameInput) {
      tableNameInput.addEventListener('input', (e) => {
        this.tableName = (e.target as HTMLInputElement).value;
        this.updateCodeView();
      });
    }

    // Add Column button
    const addColBtn = this.container.querySelector('#sql-add-column-btn');
    if (addColBtn) {
      addColBtn.addEventListener('click', () => {
        this.columns.push({
          id: String(Date.now()),
          name: `col_${this.columns.length + 1}`,
          type: 'VARCHAR',
          lengthOrPrecision: '255',
          isPrimaryKey: false,
          isAutoIncrement: false,
          isNotNull: false,
          isUnique: false
        });
        this.render();
      });
    }

    // Columns change listeners
    const columnCards = this.container.querySelectorAll('.column-card');
    columnCards.forEach((card) => {
      const idx = parseInt(card.getAttribute('data-idx') || '0', 10);
      const col = this.columns[idx];
      if (!col) return;

      const nameInput = card.querySelector('.col-name-input') as HTMLInputElement;
      const typeSelect = card.querySelector('.col-type-select') as HTMLSelectElement;
      const lenInput = card.querySelector('.col-len-input') as HTMLInputElement;
      const pkCheck = card.querySelector('.col-pk-check') as HTMLInputElement;
      const autoCheck = card.querySelector('.col-auto-check') as HTMLInputElement;
      const nnCheck = card.querySelector('.col-nn-check') as HTMLInputElement;
      const uqCheck = card.querySelector('.col-uq-check') as HTMLInputElement;
      const defInput = card.querySelector('.col-default-input') as HTMLInputElement;
      const delBtn = card.querySelector('.col-delete-btn') as HTMLElement;

      const fkTable = card.querySelector('.col-fk-table') as HTMLInputElement;
      const fkCol = card.querySelector('.col-fk-col') as HTMLInputElement;
      const fkOnDel = card.querySelector('.col-fk-on-del') as HTMLSelectElement;

      if (nameInput) nameInput.addEventListener('input', () => { col.name = nameInput.value; this.updateCodeView(); });
      if (typeSelect) typeSelect.addEventListener('change', () => { col.type = typeSelect.value; this.updateCodeView(); });
      if (lenInput) lenInput.addEventListener('input', () => { col.lengthOrPrecision = lenInput.value; this.updateCodeView(); });

      if (pkCheck) {
        pkCheck.addEventListener('change', () => {
          col.isPrimaryKey = pkCheck.checked;
          pkCheck.closest('.flag-check-label')?.classList.toggle('active-flag', col.isPrimaryKey);
          if (col.isPrimaryKey) {
            col.isNotNull = true;
            if (nnCheck) {
              nnCheck.checked = true;
              nnCheck.closest('.flag-check-label')?.classList.add('active-flag');
            }
          }
          this.updateCodeView();
        });
      }

      if (autoCheck) {
        autoCheck.addEventListener('change', () => {
          col.isAutoIncrement = autoCheck.checked;
          autoCheck.closest('.flag-check-label')?.classList.toggle('active-flag', col.isAutoIncrement);
          this.updateCodeView();
        });
      }

      if (nnCheck) {
        nnCheck.addEventListener('change', () => {
          col.isNotNull = nnCheck.checked;
          nnCheck.closest('.flag-check-label')?.classList.toggle('active-flag', col.isNotNull);
          this.updateCodeView();
        });
      }

      if (uqCheck) {
        uqCheck.addEventListener('change', () => {
          col.isUnique = uqCheck.checked;
          uqCheck.closest('.flag-check-label')?.classList.toggle('active-flag', col.isUnique);
          this.updateCodeView();
        });
      }
      if (defInput) defInput.addEventListener('input', () => { col.defaultValue = defInput.value; this.updateCodeView(); });

      if (fkTable || fkCol) {
        const updateFk = () => {
          if (fkTable.value.trim() && fkCol.value.trim()) {
            col.foreignKey = {
              targetTable: fkTable.value.trim(),
              targetColumn: fkCol.value.trim(),
              onDelete: fkOnDel.value as any
            };
          } else {
            col.foreignKey = undefined;
          }
          this.updateCodeView();
        };
        fkTable?.addEventListener('input', updateFk);
        fkCol?.addEventListener('input', updateFk);
        fkOnDel?.addEventListener('change', updateFk);
      }

      if (delBtn) {
        delBtn.addEventListener('click', () => {
          this.columns.splice(idx, 1);
          this.render();
        });
      }
    });

    // Template selector chips
    const tmplChips = this.container.querySelectorAll('[data-tmpl]');
    tmplChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const tType = (chip as HTMLElement).getAttribute('data-tmpl') as any;
        if (tType) {
          this.activeQueryType = tType;
          this.render();
        }
      });
    });

    // Copy Button
    const copyBtn = this.container.querySelector('#sql-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const codeView = this.container.querySelector('.sql-code-view code');
        if (codeView && codeView.textContent) {
          await navigator.clipboard.writeText(codeView.textContent);
          const copyText = this.container.querySelector('#sql-copy-text');
          if (copyText) {
            copyText.textContent = t('copied', this.currentLang);
            if (this.copyTimeout) clearTimeout(this.copyTimeout);
            this.copyTimeout = setTimeout(() => {
              if (copyText) copyText.textContent = t('sqlCopy', this.currentLang);
            }, 2000);
          }
        }
      });
    }

    // Insert at Cursor Button
    const insertBtn = this.container.querySelector('#sql-insert-btn');
    if (insertBtn) {
      insertBtn.addEventListener('click', () => {
        const codeView = this.container.querySelector('.sql-code-view code');
        if (codeView && codeView.textContent) {
          this.postMessage({
            type: 'insertText',
            text: codeView.textContent
          });
        }
      });
    }
  }

  private updateCodeView() {
    const codeView = this.container.querySelector('.sql-code-view code');
    if (!codeView) return;

    const schema: SqlTableSchema = {
      tableName: this.tableName,
      dialect: this.dialect,
      columns: this.columns
    };

    let generatedCode = '';
    if (this.activeQueryType === 'ddl') {
      generatedCode = generateCreateTableDdl(schema);
    } else {
      generatedCode = generateSampleQuery(schema, this.activeQueryType);
    }

    codeView.textContent = generatedCode;
  }

  private escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
