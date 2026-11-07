import { Language, t } from '../i18n';
import { ICONS } from '../icons';
import {
  LogLevel,
  LogEntry,
  parseLogText,
  filterLogEntries,
  exportCleanErrorSummary
} from '../../utils/logAnalyzer';

export interface LogAnalyzerState {
  rawLogs: string;
  searchQuery: string;
  selectedLevels: LogLevel[];
  showSummaryModal: boolean;
}

export class LogAnalyzerView {
  private container: HTMLElement;
  private currentLang: Language;
  private postMessage: (msg: any) => void;

  private rawLogs: string = '';
  private searchQuery: string = '';
  private selectedLevels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
  private parsedEntries: LogEntry[] = [];
  private logStats = { totalLines: 0, parsedEntries: 0, counts: { error: 0, warn: 0, info: 0, debug: 0 } };
  private showSummaryModal: boolean = false;
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

  public setLogText(text: string) {
    this.rawLogs = text;
    this.processLogs();
    this.render();
  }

  public getState(): LogAnalyzerState {
    return {
      rawLogs: this.rawLogs,
      searchQuery: this.searchQuery,
      selectedLevels: this.selectedLevels,
      showSummaryModal: this.showSummaryModal
    };
  }

  public restoreState(state: any) {
    if (!state) return;
    if (typeof state.rawLogs === 'string') this.rawLogs = state.rawLogs;
    if (typeof state.searchQuery === 'string') this.searchQuery = state.searchQuery;
    if (Array.isArray(state.selectedLevels)) this.selectedLevels = state.selectedLevels;
    if (typeof state.showSummaryModal === 'boolean') this.showSummaryModal = state.showSummaryModal;

    this.processLogs();
    this.render();
  }

  private processLogs() {
    const res = parseLogText(this.rawLogs);
    this.parsedEntries = res.entries;
    this.logStats = res.stats;
  }

  private render() {
    const filteredEntries = filterLogEntries(this.parsedEntries, {
      levels: this.selectedLevels,
      query: this.searchQuery
    });

    const isAllSelected = this.selectedLevels.length === 4;

    this.container.innerHTML = `
      <div class="logs-view-wrapper">
        <!-- Header -->
        <div class="section-header">
          <div class="section-title-wrap">
            <span class="section-icon logs-glow-icon">${ICONS.fileText}</span>
            <div class="section-text">
              <h3 class="section-title">${t('logsTitle', this.currentLang)}</h3>
              <p class="section-subtitle">${t('logsSubtitle', this.currentLang)}</p>
            </div>
          </div>
        </div>

        <!-- Input Area / Controls -->
        <div class="logs-input-card">
          <div class="logs-input-toolbar">
            <button id="logs-active-editor-btn" class="btn btn-secondary btn-xs">
              ${ICONS.fileText} <span>${t('logsAnalyzeActiveFile', this.currentLang)}</span>
            </button>
            <div class="action-btn-group">
              <button id="logs-sample-btn" class="btn btn-secondary btn-xs" title="Load realistic sample log">
                <span>Sample Log</span>
              </button>
              <button id="logs-clear-btn" class="icon-btn-secondary" title="Clear logs">
                ${ICONS.clear}
              </button>
            </div>
          </div>

          <textarea
            id="logs-raw-textarea"
            class="code-textarea logs-input-textarea"
            rows="4"
            placeholder="${t('logsInputPlaceholder', this.currentLang)}"
          >${this.escapeHtml(this.rawLogs)}</textarea>
        </div>

        ${this.parsedEntries.length > 0 ? `
          <!-- Telemetry HUD Grid -->
          <div class="logs-hud-grid">
            <div class="logs-hud-card">
              <div class="logs-hud-header">
                <span class="logs-hud-label">${t('logsFilterAll', this.currentLang)}</span>
              </div>
              <span class="logs-hud-val">${this.logStats.parsedEntries}</span>
            </div>
            <div class="logs-hud-card hud-error">
              <div class="logs-hud-header">
                <span class="logs-hud-label">${t('logsFilterError', this.currentLang)}</span>
                <span class="level-dot dot-error"></span>
              </div>
              <span class="logs-hud-val">${this.logStats.counts.error}</span>
            </div>
            <div class="logs-hud-card hud-warn">
              <div class="logs-hud-header">
                <span class="logs-hud-label">${t('logsFilterWarn', this.currentLang)}</span>
                <span class="level-dot dot-warn"></span>
              </div>
              <span class="logs-hud-val">${this.logStats.counts.warn}</span>
            </div>
            <div class="logs-hud-card hud-info">
              <div class="logs-hud-header">
                <span class="logs-hud-label">${t('logsFilterInfo', this.currentLang)}</span>
                <span class="level-dot dot-info"></span>
              </div>
              <span class="logs-hud-val">${this.logStats.counts.info}</span>
            </div>
            <div class="logs-hud-card hud-debug">
              <div class="logs-hud-header">
                <span class="logs-hud-label">${t('logsFilterDebug', this.currentLang)}</span>
                <span class="level-dot dot-debug"></span>
              </div>
              <span class="logs-hud-val">${this.logStats.counts.debug}</span>
            </div>
          </div>

          <!-- Stats Bar / Level Filter Chips -->
          <div class="logs-filter-toolbar">
            <div class="logs-level-chips">
              <button
                class="level-chip chip-all ${isAllSelected ? 'active' : ''}"
                id="filter-chip-all"
              >
                ${t('logsFilterAll', this.currentLang)} (${this.logStats.parsedEntries})
              </button>
              <button
                class="level-chip chip-error ${this.selectedLevels.includes('error') ? 'active' : ''}"
                data-level="error"
              >
                <span class="level-dot dot-error"></span>
                <span>${t('logsFilterError', this.currentLang)} (${this.logStats.counts.error})</span>
              </button>
              <button
                class="level-chip chip-warn ${this.selectedLevels.includes('warn') ? 'active' : ''}"
                data-level="warn"
              >
                <span class="level-dot dot-warn"></span>
                <span>${t('logsFilterWarn', this.currentLang)} (${this.logStats.counts.warn})</span>
              </button>
              <button
                class="level-chip chip-info ${this.selectedLevels.includes('info') ? 'active' : ''}"
                data-level="info"
              >
                <span class="level-dot dot-info"></span>
                <span>${t('logsFilterInfo', this.currentLang)} (${this.logStats.counts.info})</span>
              </button>
              <button
                class="level-chip chip-debug ${this.selectedLevels.includes('debug') ? 'active' : ''}"
                data-level="debug"
              >
                <span class="level-dot dot-debug"></span>
                <span>${t('logsFilterDebug', this.currentLang)} (${this.logStats.counts.debug})</span>
              </button>
            </div>

            <!-- Search input + Actions -->
            <div class="logs-search-row">
              <div class="logs-search-input-wrap">
                <span class="search-icon-inside">${ICONS.search}</span>
                <input
                  type="text"
                  id="logs-search-input"
                  class="logs-search-input"
                  placeholder="${t('logsSearchPlaceholder', this.currentLang)}"
                  value="${this.escapeHtml(this.searchQuery)}"
                />
                ${this.searchQuery ? `<button id="logs-clear-search" class="icon-btn-clear">${ICONS.clear}</button>` : ''}
              </div>

              <button id="logs-export-summary-btn" class="btn btn-secondary btn-xs" title="Generate error summary">
                ${ICONS.wand} <span>${t('logsExportSummary', this.currentLang)}</span>
              </button>

              <button id="logs-copy-filtered-btn" class="btn btn-secondary btn-xs" title="Copy filtered logs">
                ${ICONS.copy} <span id="logs-copy-text">${t('logsCopy', this.currentLang)}</span>
              </button>
            </div>
          </div>

          <!-- Log Stream Viewer Table -->
          <div class="logs-stream-container">
            ${filteredEntries.length === 0 ? `
              <div class="empty-state">
                <p>No log entries match the current filter or search query.</p>
              </div>
            ` : `
              <div class="logs-stream-list">
                ${filteredEntries.map((e) => this.renderLogEntryRow(e)).join('')}
              </div>
            `}
          </div>
        ` : `
          <div class="logs-welcome-card">
            <p class="welcome-text">${t('logsNoLogs', this.currentLang)}</p>
          </div>
        `}

        <!-- Clean Error Summary Modal -->
        ${this.showSummaryModal ? this.renderSummaryModal() : ''}
      </div>
    `;

    this.attachEvents();
  }

  private renderLogEntryRow(entry: LogEntry): string {
    const hasStack = entry.stackTrace && entry.stackTrace.length > 0;

    return `
      <div class="log-entry-row level-${entry.level}">
        <div class="log-meta-col">
          <span class="log-line-num">${entry.lineNumber}</span>
          <span class="log-level-badge badge-${entry.level}">${entry.level.toUpperCase()}</span>
          ${entry.timestamp ? `<span class="log-timestamp">${this.escapeHtml(entry.timestamp)}</span>` : ''}
        </div>
        <div class="log-msg-col">
          <div class="log-msg-text code-text">${this.escapeHtml(entry.message)}</div>
          ${hasStack ? `
            <details class="log-stack-details">
              <summary class="log-stack-summary">Stack Trace (${entry.stackTrace!.length} lines)</summary>
              <pre class="log-stack-content"><code>${this.escapeHtml(entry.stackTrace!.join('\n'))}</code></pre>
            </details>
          ` : ''}
        </div>
      </div>
    `;
  }

  private renderSummaryModal(): string {
    const summaryMarkdown = exportCleanErrorSummary(this.parsedEntries);

    return `
      <div class="logs-summary-modal">
        <div class="summary-modal-header">
          <span class="summary-title">${t('logsSummaryTitle', this.currentLang)}</span>
          <div class="action-btn-group">
            <button id="summary-copy-btn" class="btn btn-secondary btn-xs">
              ${ICONS.copy} <span>Copy Markdown</span>
            </button>
            <button id="summary-insert-btn" class="btn btn-secondary btn-xs">
              ${ICONS.insert} <span>${t('insertAtCursor', this.currentLang)}</span>
            </button>
            <button id="summary-close-btn" class="icon-btn-secondary" title="${t('logsCloseSummary', this.currentLang)}">
              ${ICONS.clear}
            </button>
          </div>
        </div>
        <div class="summary-modal-body">
          <pre class="summary-code-view"><code>${this.escapeHtml(summaryMarkdown)}</code></pre>
        </div>
      </div>
    `;
  }

  private attachEvents() {
    // Textarea input
    const textarea = this.container.querySelector('#logs-raw-textarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.addEventListener('input', (e) => {
        this.rawLogs = (e.target as HTMLTextAreaElement).value;
        this.processLogs();
        this.render();
      });
    }

    // Clear logs button
    const clearBtn = this.container.querySelector('#logs-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.rawLogs = '';
        this.processLogs();
        this.render();
      });
    }

    // Sample logs loader
    const sampleBtn = this.container.querySelector('#logs-sample-btn');
    if (sampleBtn) {
      sampleBtn.addEventListener('click', () => {
        this.rawLogs = getSampleLogStream();
        this.processLogs();
        this.render();
      });
    }

    // Active Editor File Grabber
    const activeEditorBtn = this.container.querySelector('#logs-active-editor-btn');
    if (activeEditorBtn) {
      activeEditorBtn.addEventListener('click', () => {
        this.postMessage({ type: 'getActiveEditorText' });
      });
    }

    // Level filter chips
    const levelChips = this.container.querySelectorAll('[data-level]');
    levelChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const lvl = (chip as HTMLElement).getAttribute('data-level') as LogLevel;
        if (lvl) {
          if (this.selectedLevels.includes(lvl)) {
            this.selectedLevels = this.selectedLevels.filter((l) => l !== lvl);
          } else {
            this.selectedLevels.push(lvl);
          }
          this.render();
        }
      });
    });

    const filterChipAll = this.container.querySelector('#filter-chip-all');
    if (filterChipAll) {
      filterChipAll.addEventListener('click', () => {
        if (this.selectedLevels.length === 4) {
          this.selectedLevels = ['error', 'warn'];
        } else {
          this.selectedLevels = ['error', 'warn', 'info', 'debug'];
        }
        this.render();
      });
    }

    // Search query input
    const searchInput = this.container.querySelector('#logs-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value;
        this.render();
      });
    }

    const clearSearchBtn = this.container.querySelector('#logs-clear-search');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.render();
      });
    }

    // Export error summary button
    const exportSummaryBtn = this.container.querySelector('#logs-export-summary-btn');
    if (exportSummaryBtn) {
      exportSummaryBtn.addEventListener('click', () => {
        this.showSummaryModal = true;
        this.render();
      });
    }

    // Copy Filtered Logs
    const copyFilteredBtn = this.container.querySelector('#logs-copy-filtered-btn');
    if (copyFilteredBtn) {
      copyFilteredBtn.addEventListener('click', async () => {
        const filtered = filterLogEntries(this.parsedEntries, {
          levels: this.selectedLevels,
          query: this.searchQuery
        });
        const text = filtered.map((e) => e.raw).join('\n');
        await navigator.clipboard.writeText(text);

        const copyText = this.container.querySelector('#logs-copy-text');
        if (copyText) {
          copyText.textContent = t('copied', this.currentLang);
          if (this.copyTimeout) clearTimeout(this.copyTimeout);
          this.copyTimeout = setTimeout(() => {
            if (copyText) copyText.textContent = t('logsCopy', this.currentLang);
          }, 2000);
        }
      });
    }

    // Summary Modal Events
    if (this.showSummaryModal) {
      const closeSummaryBtn = this.container.querySelector('#summary-close-btn');
      if (closeSummaryBtn) {
        closeSummaryBtn.addEventListener('click', () => {
          this.showSummaryModal = false;
          this.render();
        });
      }

      const copySummaryBtn = this.container.querySelector('#summary-copy-btn');
      if (copySummaryBtn) {
        copySummaryBtn.addEventListener('click', async () => {
          const report = exportCleanErrorSummary(this.parsedEntries);
          await navigator.clipboard.writeText(report);
        });
      }

      const insertSummaryBtn = this.container.querySelector('#summary-insert-btn');
      if (insertSummaryBtn) {
        insertSummaryBtn.addEventListener('click', () => {
          const report = exportCleanErrorSummary(this.parsedEntries);
          this.postMessage({ type: 'insertText', text: report });
        });
      }
    }
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

function getSampleLogStream(): string {
  return `2026-11-03 10:14:02.120 [INFO] Server started listening on port 3000
2026-11-03 10:14:05.450 [DEBUG] DB Pool initialized with 10 max connections
2026-11-03 10:14:12.890 [WARN] Query execution exceeded threshold (450ms): SELECT * FROM heavy_table
2026-11-03 10:14:18.230 [ERROR] Connection timeout to Redis cache server (127.0.0.1:6379)
    at RedisClient.connect (/app/node_modules/redis/client.js:142:19)
    at async CacheService.get (/app/src/services/cache.ts:24:5)
    at async UserController.getProfile (/app/src/controllers/user.ts:88:12)
2026-11-03 10:14:22.010 [INFO] Healthcheck probed successfully - 200 OK
2026-11-03 10:14:29.600 [ERROR] UnhandledPromiseRejection: JWT signature verification failed
    at verifyToken (/app/src/utils/jwt.ts:45:11)
    at authMiddleware (/app/src/middleware/auth.ts:18:22)
2026-11-03 10:14:35.710 [DEBUG] GC collected 14MB in 3.2ms`;
}
