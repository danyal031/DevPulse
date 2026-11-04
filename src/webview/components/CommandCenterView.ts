import { Language, t } from '../i18n';
import { ICONS } from '../icons';

export interface DiscoveredTask {
  id: string;
  name: string;
  command: string;
  source: 'package.json' | 'makefile' | 'docker-compose' | 'cargo' | 'python';
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
  isRunning: boolean;
  startTime?: number;
}

export class CommandCenterView {
  private container: HTMLElement;
  private currentLang: Language;
  private onMessage: (msg: any) => void;

  private tasks: DiscoveredTask[] = [];
  private searchQuery: string = '';
  private selectedCategory: string = 'all';
  private timerInterval: any = null;

  constructor(container: HTMLElement, currentLang: Language, onMessage: (msg: any) => void) {
    this.container = container;
    this.currentLang = currentLang;
    this.onMessage = onMessage;
    this.render();
    this.startTimer();
    // Request initial task scan
    this.onMessage({ command: 'scanTasks' });
  }

  public setLanguage(lang: Language) {
    this.currentLang = lang;
    this.render();
  }

  public setTasks(tasks: DiscoveredTask[]) {
    this.tasks = tasks;
    this.render();
  }

  public updateTaskStatus(taskId: string, isRunning: boolean, startTime?: number) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.isRunning = isRunning;
      task.startTime = startTime;
      this.render();
    }
  }

  public getState() {
    return {
      searchQuery: this.searchQuery,
      selectedCategory: this.selectedCategory
    };
  }

  public restoreState(state: any) {
    if (!state) return;
    if (state.searchQuery !== undefined) this.searchQuery = state.searchQuery;
    if (state.selectedCategory !== undefined) this.selectedCategory = state.selectedCategory;
    this.render();
  }

  public dispose() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      const runningTasks = this.tasks.filter(t => t.isRunning && t.startTime);
      if (runningTasks.length > 0) {
        this.updateElapsedTimers();
      }
    }, 1000);
  }

  private updateElapsedTimers() {
    const now = Date.now();
    this.tasks.forEach(task => {
      if (task.isRunning && task.startTime) {
        const diffSec = Math.floor((now - task.startTime) / 1000);
        const mins = Math.floor(diffSec / 60).toString().padStart(2, '0');
        const secs = (diffSec % 60).toString().padStart(2, '0');
        const timerEl = this.container.querySelector(`.cmd-elapsed[data-task-id="${task.id}"]`);
        if (timerEl) {
          timerEl.textContent = `${mins}:${secs}`;
        }
      }
    });
  }

  private getFilteredTasks(): DiscoveredTask[] {
    return this.tasks.filter(task => {
      // Category filter
      if (this.selectedCategory !== 'all') {
        if (this.selectedCategory === 'package' && task.source !== 'package.json') return false;
        if (this.selectedCategory === 'makefile' && task.source !== 'makefile') return false;
        if (this.selectedCategory === 'docker' && task.source !== 'docker-compose') return false;
        if (this.selectedCategory === 'cargo' && task.source !== 'cargo') return false;
        if (this.selectedCategory === 'python' && task.source !== 'python') return false;
      }
      // Search filter
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        return task.name.toLowerCase().includes(q) || task.command.toLowerCase().includes(q);
      }
      return true;
    });
  }

  private render() {
    const isRtl = this.currentLang === 'fa';
    const filteredTasks = this.getFilteredTasks();
    const runningCount = this.tasks.filter(t => t.isRunning).length;

    this.container.innerHTML = `
      <div class="cmd-center-view" dir="${isRtl ? 'rtl' : 'ltr'}">
        <div class="deck-hero-banner">
          <div class="deck-hero-icon">${ICONS.playCircle}</div>
          <div class="deck-hero-content">
            <h3 class="deck-hero-title">${t('cmdTitle', this.currentLang)}</h3>
            <p class="deck-hero-desc">${t('cmdDesc', this.currentLang)}</p>
          </div>
        </div>

        <!-- Controls Bar -->
        <div class="card cmd-controls-card">
          <div class="cmd-search-row">
            <div class="input-with-icon flex-1">
              <span class="input-icon">${ICONS.search}</span>
              <input type="text" id="cmd-search-input" class="form-input form-input-sm" value="${this.escapeHtml(this.searchQuery)}" placeholder="${t('cmdFilterPlaceholder', this.currentLang)}" />
            </div>
            <button id="cmd-scan-btn" class="btn btn-secondary btn-sm" title="${t('cmdScanScripts', this.currentLang)}">
              ${ICONS.sync} <span>${t('cmdScanScripts', this.currentLang)}</span>
            </button>
          </div>

          <!-- Category filter pills -->
          <div class="cmd-cat-pills">
            <button class="cmd-cat-pill ${this.selectedCategory === 'all' ? 'active' : ''}" data-cat="all">
              ${t('deckCatAll', this.currentLang)} (${this.tasks.length})
            </button>
            <button class="cmd-cat-pill ${this.selectedCategory === 'package' ? 'active' : ''}" data-cat="package">
              Node & Web
            </button>
            <button class="cmd-cat-pill ${this.selectedCategory === 'makefile' ? 'active' : ''}" data-cat="makefile">
              Makefile
            </button>
            <button class="cmd-cat-pill ${this.selectedCategory === 'docker' ? 'active' : ''}" data-cat="docker">
              Docker
            </button>
            <button class="cmd-cat-pill ${this.selectedCategory === 'cargo' ? 'active' : ''}" data-cat="cargo">
              Rust / Cargo
            </button>
            <button class="cmd-cat-pill ${this.selectedCategory === 'python' ? 'active' : ''}" data-cat="python">
              Python
            </button>
          </div>
        </div>

        <!-- Task Count Bar -->
        <div class="cmd-status-banner">
          <span class="cmd-status-badge ${runningCount > 0 ? 'badge-running' : ''}">
            <span class="status-dot ${runningCount > 0 ? 'dot-running' : 'dot-idle'}"></span>
            ${runningCount} ${t('cmdRunning', this.currentLang)}
          </span>
          <span class="cmd-total-tag">${filteredTasks.length} / ${this.tasks.length} tasks</span>
        </div>

        <!-- Task List Cards -->
        <div class="cmd-tasks-grid">
          ${filteredTasks.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state-icon">${ICONS.playCircle}</div>
              <div class="empty-state-title">${t('cmdNoScriptsFound', this.currentLang)}</div>
              <button id="cmd-empty-scan-btn" class="btn btn-secondary btn-sm mt-2">
                ${ICONS.sync} ${t('cmdScanScripts', this.currentLang)}
              </button>
            </div>
          ` : filteredTasks.map(task => this.renderTaskCard(task)).join('')}
        </div>
      </div>
    `;

    this.attachEvents();
    this.updateElapsedTimers();
  }

  private renderTaskCard(task: DiscoveredTask): string {
    const isRunning = task.isRunning;
    const pm = task.packageManager || (task.source === 'package.json' ? 'npm' : task.source);

    return `
      <div class="cmd-task-card ${isRunning ? 'is-running' : ''}" data-task-id="${task.id}">
        <div class="cmd-task-header">
          <div class="cmd-task-title-group">
            <span class="status-dot ${isRunning ? 'dot-running pulsing' : 'dot-idle'}"></span>
            <span class="cmd-task-name" title="${this.escapeHtml(task.name)}">${this.escapeHtml(task.name)}</span>
            <span class="cmd-badge cmd-badge-${pm}">${pm}</span>
          </div>

          <div class="cmd-task-actions">
            ${isRunning ? `
              <span class="cmd-elapsed" data-task-id="${task.id}">00:00</span>
              <button class="btn-icon btn-icon-warn cmd-action-restart" data-task-id="${task.id}" title="${t('cmdRestart', this.currentLang)}">
                ${ICONS.restart}
              </button>
              <button class="btn-icon btn-icon-danger cmd-action-stop" data-task-id="${task.id}" title="${t('cmdStop', this.currentLang)}">
                ${ICONS.stop}
              </button>
              <button class="btn-icon cmd-action-terminal" data-task-id="${task.id}" title="${t('cmdOpenTerminal', this.currentLang)}">
                ${ICONS.terminal}
              </button>
            ` : `
              <button class="btn btn-primary btn-xs cmd-action-run" data-task-id="${task.id}">
                ${ICONS.play} <span>${t('cmdRun', this.currentLang)}</span>
              </button>
            `}
          </div>
        </div>

        <div class="cmd-task-body">
          <code class="cmd-code-line" title="${this.escapeHtml(task.command)}">${this.escapeHtml(task.command)}</code>
        </div>
      </div>
    `;
  }

  private attachEvents() {
    // Search input
    const searchInput = this.container.querySelector('#cmd-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.searchQuery = searchInput.value.trim();
        this.render();
      });
    }

    // Scan button
    const scanBtn = this.container.querySelector('#cmd-scan-btn');
    if (scanBtn) {
      scanBtn.addEventListener('click', () => {
        this.onMessage({ command: 'scanTasks' });
      });
    }

    const emptyScanBtn = this.container.querySelector('#cmd-empty-scan-btn');
    if (emptyScanBtn) {
      emptyScanBtn.addEventListener('click', () => {
        this.onMessage({ command: 'scanTasks' });
      });
    }

    // Category pills
    this.container.querySelectorAll('.cmd-cat-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const cat = (pill as HTMLElement).dataset.cat;
        if (cat) {
          this.selectedCategory = cat;
          this.render();
        }
      });
    });

    // Run action
    this.container.querySelectorAll('.cmd-action-run').forEach(btn => {
      btn.addEventListener('click', () => {
        const taskId = (btn as HTMLElement).dataset.taskId;
        if (taskId) {
          this.onMessage({ command: 'runTask', taskId });
        }
      });
    });

    // Stop action
    this.container.querySelectorAll('.cmd-action-stop').forEach(btn => {
      btn.addEventListener('click', () => {
        const taskId = (btn as HTMLElement).dataset.taskId;
        if (taskId) {
          this.onMessage({ command: 'stopTask', taskId });
        }
      });
    });

    // Restart action
    this.container.querySelectorAll('.cmd-action-restart').forEach(btn => {
      btn.addEventListener('click', () => {
        const taskId = (btn as HTMLElement).dataset.taskId;
        if (taskId) {
          this.onMessage({ command: 'restartTask', taskId });
        }
      });
    });

    // Open terminal action
    this.container.querySelectorAll('.cmd-action-terminal').forEach(btn => {
      btn.addEventListener('click', () => {
        const taskId = (btn as HTMLElement).dataset.taskId;
        if (taskId) {
          this.onMessage({ command: 'openTaskTerminal', taskId });
        }
      });
    });
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
