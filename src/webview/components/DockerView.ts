import { Language, t } from '../i18n';
import { ICONS } from '../icons';

export interface DockerContainerData {
  id: string;
  name: string;
  image: string;
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'dead' | 'created';
  status: string;
  ports: string;
}

export interface DockerStatusPayload {
  isInstalled: boolean;
  isRunning: boolean;
  errorCode?: string;
  errorMessage?: string;
  containers: DockerContainerData[];
}

export class DockerView {
  private container: HTMLElement;
  private currentLang: Language;
  private postMessage: (msg: any) => void;

  private filterQuery: string = '';
  private filterState: 'all' | 'running' | 'stopped' = 'all';
  private isLoading: boolean = false;
  private statusPayload: DockerStatusPayload | null = null;
  private activeLogs: { containerId: string; name: string; logs: string; loading: boolean } | null = null;
  private actionInProgress: Record<string, string> = {};
  private copiedIdTimeout: any = null;
  private copiedContainerId: string | null = null;

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

  public setStatus(payload: DockerStatusPayload) {
    this.isLoading = false;
    this.statusPayload = payload;
    this.actionInProgress = {};
    this.render();
  }

  public setLogs(data: { containerId: string; name: string; logs: string; error?: string }) {
    this.activeLogs = {
      containerId: data.containerId,
      name: data.name,
      logs: data.error ? `Error fetching logs: ${data.error}` : data.logs,
      loading: false
    };
    this.render();
  }

  public handleActionResult(_res: { success: boolean; message: string }) {
    this.refreshContainers();
  }

  public refreshContainers() {
    this.isLoading = true;
    this.render();
    this.postMessage({ type: 'dockerGetContainers' });
  }

  public getState() {
    return {
      filterQuery: this.filterQuery,
      filterState: this.filterState
    };
  }

  public restoreState(state: any) {
    if (state) {
      if (typeof state.filterQuery === 'string') this.filterQuery = state.filterQuery;
      if (state.filterState) this.filterState = state.filterState;
    }
    this.refreshContainers();
  }

  private render() {
    const isInstalled = this.statusPayload?.isInstalled ?? true;
    const isRunning = this.statusPayload?.isRunning ?? true;
    const containers = this.statusPayload?.containers || [];

    const runningCount = containers.filter((c) => c.state === 'running').length;
    const stoppedCount = containers.length - runningCount;

    const filtered = containers.filter((c) => {
      // Filter by state tab
      if (this.filterState === 'running' && c.state !== 'running') return false;
      if (this.filterState === 'stopped' && c.state === 'running') return false;

      // Filter by query
      if (!this.filterQuery) return true;
      const q = this.filterQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.image.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.ports.toLowerCase().includes(q)
      );
    });

    this.container.innerHTML = `
      <div class="docker-view-wrapper">
        <!-- Header -->
        <div class="section-header">
          <div class="section-title-wrap">
            <span class="section-icon docker-glow-icon">${ICONS.docker}</span>
            <div class="section-text">
              <h3 class="section-title">${t('dockerTitle', this.currentLang)}</h3>
              <p class="section-subtitle">${t('dockerSubtitle', this.currentLang)}</p>
            </div>
          </div>
          <button id="docker-refresh-btn" class="icon-btn-secondary" title="${t('refresh', this.currentLang)}">
            ${this.isLoading ? `<span class="spin">${ICONS.sync}</span>` : ICONS.sync}
          </button>
        </div>

        ${!isInstalled ? `
          <div class="docker-alert-card alert-error">
            <div class="alert-header">
              <span class="alert-icon">${ICONS.docker}</span>
              <span class="alert-title">${t('error', this.currentLang)}</span>
            </div>
            <div class="alert-desc">${t('dockerNotInstalled', this.currentLang)}</div>
          </div>
        ` : !isRunning ? `
          <div class="docker-alert-card alert-warning">
            <div class="alert-header">
              <span class="alert-icon">${ICONS.docker}</span>
              <span class="alert-title">${t('error', this.currentLang)}</span>
            </div>
            <div class="alert-desc">${t('dockerDaemonOfflineTips', this.currentLang)}</div>
            <div class="alert-actions">
              <button id="docker-retry-btn" class="btn btn-primary btn-sm">
                ${ICONS.sync} ${t('dockerRetry', this.currentLang)}
              </button>
            </div>
          </div>
        ` : `
          <!-- Summary Dashboard Cards -->
          <div class="docker-stats-bar">
            <div class="docker-stat-card">
              <span class="stat-number">${containers.length}</span>
              <span class="stat-label">${t('dockerTotal', this.currentLang)}</span>
            </div>
            <div class="docker-stat-card stat-running">
              <span class="stat-number"><span class="stat-indicator-dot dot-running"></span>${runningCount}</span>
              <span class="stat-label">${t('dockerRunning', this.currentLang)}</span>
            </div>
            <div class="docker-stat-card stat-stopped">
              <span class="stat-number"><span class="stat-indicator-dot dot-stopped"></span>${stoppedCount}</span>
              <span class="stat-label">${t('dockerStopped', this.currentLang)}</span>
            </div>
          </div>

          <!-- Search & State Segmented Filters -->
          <div class="docker-toolbar">
            <div class="filter-search-box">
              <span class="search-icon-inside">${ICONS.search}</span>
              <input
                type="text"
                id="docker-filter-input"
                class="docker-search-input"
                placeholder="${t('dockerFilterPlaceholder', this.currentLang)}"
                value="${this.escapeHtml(this.filterQuery)}"
              />
              ${this.filterQuery ? `<button id="docker-clear-filter" class="icon-btn-clear">${ICONS.clear}</button>` : ''}
            </div>

            <div class="segmented-pills">
              <button class="pill-btn ${this.filterState === 'all' ? 'active' : ''}" data-state="all">
                ${t('dockerAll', this.currentLang)} (${containers.length})
              </button>
              <button class="pill-btn ${this.filterState === 'running' ? 'active' : ''}" data-state="running">
                ${t('dockerRunning', this.currentLang)} (${runningCount})
              </button>
              <button class="pill-btn ${this.filterState === 'stopped' ? 'active' : ''}" data-state="stopped">
                ${t('dockerStopped', this.currentLang)} (${stoppedCount})
              </button>
            </div>
          </div>

          ${this.isLoading && containers.length === 0 ? `
            <div class="empty-state">
              <span class="spin">${ICONS.sync}</span>
              <p>${t('dockerRefreshing', this.currentLang)}</p>
            </div>
          ` : filtered.length === 0 ? (containers.length === 0 ? this.renderStarterSamples() : `
            <div class="empty-state">
              <p>${t('dockerNoContainers', this.currentLang)}</p>
            </div>
          `) : `
            <div class="docker-containers-list">
              ${filtered.map((c) => this.renderContainerCard(c)).join('')}
            </div>
          `}
        `}

        ${this.activeLogs ? this.renderLogsModal() : ''}
      </div>
    `;

    this.attachEvents();
  }

  private renderStarterSamples(): string {
    return `
      <div class="docker-starter-box">
        <div class="starter-header">
          <span class="starter-title">${t('dockerQuickSamples', this.currentLang)}</span>
        </div>
        <p class="starter-desc">No containers are currently present on this host. You can spin up a lightweight test container right from here:</p>
        
        <div class="starter-item">
          <div class="starter-item-info">
            <span class="starter-name">Nginx Web Server</span>
            <span class="code-text starter-cmd">docker run -d -p 8080:80 --name test-nginx nginx:alpine</span>
          </div>
          <button class="btn btn-secondary btn-xs starter-run-btn" data-cmd="docker run -d -p 8080:80 --name test-nginx nginx:alpine">
            ${ICONS.terminal} <span>${t('dockerRunInTerminal', this.currentLang)}</span>
          </button>
        </div>

        <div class="starter-item">
          <div class="starter-item-info">
            <span class="starter-name">Redis In-Memory Store</span>
            <span class="code-text starter-cmd">docker run -d -p 6379:6379 --name test-redis redis:alpine</span>
          </div>
          <button class="btn btn-secondary btn-xs starter-run-btn" data-cmd="docker run -d -p 6379:6379 --name test-redis redis:alpine">
            ${ICONS.terminal} <span>${t('dockerRunInTerminal', this.currentLang)}</span>
          </button>
        </div>
      </div>
    `;
  }

  private renderContainerCard(c: DockerContainerData): string {
    const isRunning = c.state === 'running';
    const currentAction = this.actionInProgress[c.id];
    const isCopied = this.copiedContainerId === c.id;

    // Parse port mappings for neat display
    const portPills = this.extractPortPills(c.ports);

    return `
      <div class="docker-card ${isRunning ? 'is-running' : 'is-stopped'}" data-id="${c.id}">
        <!-- Top Row: Icon + Name + Status Badge -->
        <div class="docker-card-header">
          <div class="docker-title-col">
            <div class="docker-name-row">
              <span class="docker-status-dot ${isRunning ? 'dot-running' : 'dot-stopped'}"></span>
              <span class="docker-container-name" title="${this.escapeHtml(c.name)}">${this.escapeHtml(c.name)}</span>
              <button
                class="docker-id-pill"
                data-copy-id="${c.id}"
                title="Click to copy full ID"
              >
                ${isCopied ? ICONS.check : ICONS.copy}
                <span>${isCopied ? t('dockerCopiedId', this.currentLang) : c.id}</span>
              </button>
            </div>
          </div>

          <div class="docker-status-badge ${isRunning ? 'badge-running' : 'badge-stopped'}">
            <span>${this.escapeHtml(c.status || (isRunning ? 'Running' : 'Exited'))}</span>
          </div>
        </div>

        <!-- Body: Details Table -->
        <div class="docker-card-body">
          <div class="docker-detail-row">
            <span class="docker-detail-label">${t('dockerImage', this.currentLang)}</span>
            <span class="docker-detail-val code-text" title="${this.escapeHtml(c.image)}">${this.escapeHtml(c.image)}</span>
          </div>

          ${portPills.length > 0 ? `
            <div class="docker-detail-row">
              <span class="docker-detail-label">${t('dockerPorts', this.currentLang)}</span>
              <div class="docker-ports-wrap">
                ${portPills.map((p) => `
                  <span class="port-chip" title="${this.escapeHtml(p.raw)}">
                    ${ICONS.link} ${this.escapeHtml(p.display)}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Actions Toolbar -->
        <div class="docker-card-actions">
          <div class="action-btn-group">
            ${isRunning ? `
              <button
                class="btn btn-secondary btn-xs docker-action-btn action-stop"
                data-id="${c.id}"
                data-action="stop"
                ${currentAction ? 'disabled' : ''}
                title="${t('dockerStop', this.currentLang)}"
              >
                ${currentAction === 'stop' ? `<span class="spin">${ICONS.sync}</span>` : ICONS.stop}
                <span>${t('dockerStop', this.currentLang)}</span>
              </button>
              <button
                class="btn btn-secondary btn-xs docker-action-btn"
                data-id="${c.id}"
                data-action="restart"
                ${currentAction ? 'disabled' : ''}
                title="${t('dockerRestart', this.currentLang)}"
              >
                ${currentAction === 'restart' ? `<span class="spin">${ICONS.sync}</span>` : ICONS.restart}
                <span>${t('dockerRestart', this.currentLang)}</span>
              </button>
            ` : `
              <button
                class="btn btn-primary btn-xs docker-action-btn action-start"
                data-id="${c.id}"
                data-action="start"
                ${currentAction ? 'disabled' : ''}
                title="${t('dockerStart', this.currentLang)}"
              >
                ${currentAction === 'start' ? `<span class="spin">${ICONS.sync}</span>` : ICONS.play}
                <span>${t('dockerStart', this.currentLang)}</span>
              </button>
            `}

            <button
              class="btn btn-secondary btn-xs docker-logs-btn"
              data-id="${c.id}"
              data-name="${this.escapeHtml(c.name)}"
              title="${t('dockerLogs', this.currentLang)}"
            >
              ${ICONS.terminal}
              <span>${t('dockerLogs', this.currentLang)}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private extractPortPills(portsStr: string): { display: string; raw: string }[] {
    if (!portsStr || !portsStr.trim()) return [];
    const parts = portsStr.split(/,\s*/);
    const pills: { display: string; raw: string }[] = [];

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      // Example: 0.0.0.0:8080->80/tcp or 5432/tcp
      const arrowMatch = trimmed.match(/:(\d+)->(\d+)/);
      if (arrowMatch) {
        pills.push({ display: `:${arrowMatch[1]} → ${arrowMatch[2]}`, raw: trimmed });
      } else {
        pills.push({ display: trimmed, raw: trimmed });
      }
    }
    return pills;
  }

  private renderLogsModal(): string {
    if (!this.activeLogs) return '';

    return `
      <div class="docker-logs-panel">
        <div class="logs-header">
          <div class="logs-title">
            <span class="logs-icon">${ICONS.terminal}</span>
            <span class="logs-name">${t('dockerLogsTitle', this.currentLang)}: ${this.escapeHtml(this.activeLogs.name)}</span>
          </div>
          <div class="logs-actions">
            <button id="docker-logs-copy" class="btn btn-secondary btn-xs" title="Copy all logs">
              ${ICONS.copy} <span>Copy</span>
            </button>
            <button id="docker-logs-refresh" class="icon-btn-secondary" title="${t('refresh', this.currentLang)}">
              ${ICONS.sync}
            </button>
            <button id="docker-logs-close" class="icon-btn-secondary" title="${t('dockerCloseLogs', this.currentLang)}">
              ${ICONS.clear}
            </button>
          </div>
        </div>
        <div class="logs-viewer-body">
          ${this.activeLogs.loading ? `
            <div class="logs-loading">
              <span class="spin">${ICONS.sync}</span>
              <span>Loading logs...</span>
            </div>
          ` : `
            <pre class="logs-content" id="docker-logs-pre"><code>${this.escapeHtml(this.activeLogs.logs)}</code></pre>
          `}
        </div>
      </div>
    `;
  }

  private attachEvents() {
    // Refresh button
    const refreshBtn = this.container.querySelector('#docker-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshContainers());
    }

    const retryBtn = this.container.querySelector('#docker-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.refreshContainers());
    }

    // Filter input
    const filterInput = this.container.querySelector('#docker-filter-input') as HTMLInputElement;
    if (filterInput) {
      filterInput.addEventListener('input', (e) => {
        this.filterQuery = (e.target as HTMLInputElement).value;
        this.render();
      });
    }

    // Clear filter
    const clearBtn = this.container.querySelector('#docker-clear-filter');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.filterQuery = '';
        this.render();
      });
    }

    // Segmented state pills
    const pills = this.container.querySelectorAll('.pill-btn');
    pills.forEach((p) => {
      p.addEventListener('click', () => {
        const state = (p as HTMLElement).getAttribute('data-state') as 'all' | 'running' | 'stopped';
        if (state) {
          this.filterState = state;
          this.render();
        }
      });
    });

    // Copy container ID
    const copyIdBtns = this.container.querySelectorAll('[data-copy-id]');
    copyIdBtns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).getAttribute('data-copy-id');
        if (id) {
          await navigator.clipboard.writeText(id);
          this.copiedContainerId = id;
          this.render();
          if (this.copiedIdTimeout) clearTimeout(this.copiedIdTimeout);
          this.copiedIdTimeout = setTimeout(() => {
            this.copiedContainerId = null;
            this.render();
          }, 2000);
        }
      });
    });

    // Starter sample run in terminal
    const starterBtns = this.container.querySelectorAll('.starter-run-btn');
    starterBtns.forEach((b) => {
      b.addEventListener('click', () => {
        const cmd = (b as HTMLElement).getAttribute('data-cmd');
        if (cmd) {
          this.postMessage({
            type: 'runTerminalCommand',
            command: cmd
          });
        }
      });
    });

    // Action buttons (start / stop / restart)
    const actionBtns = this.container.querySelectorAll('.docker-action-btn');
    actionBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).getAttribute('data-id');
        const action = (btn as HTMLElement).getAttribute('data-action') as 'start' | 'stop' | 'restart';
        if (id && action) {
          this.actionInProgress[id] = action;
          this.render();
          this.postMessage({
            type: 'dockerAction',
            action,
            containerId: id
          });
        }
      });
    });

    // Logs buttons
    const logsBtns = this.container.querySelectorAll('.docker-logs-btn');
    logsBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).getAttribute('data-id');
        const name = (btn as HTMLElement).getAttribute('data-name');
        if (id && name) {
          this.activeLogs = {
            containerId: id,
            name,
            logs: '',
            loading: true
          };
          this.render();
          this.postMessage({
            type: 'dockerGetLogs',
            containerId: id,
            name
          });
        }
      });
    });

    // Close logs
    const closeLogsBtn = this.container.querySelector('#docker-logs-close');
    if (closeLogsBtn) {
      closeLogsBtn.addEventListener('click', () => {
        this.activeLogs = null;
        this.render();
      });
    }

    // Copy logs
    const copyLogsBtn = this.container.querySelector('#docker-logs-copy');
    if (copyLogsBtn && this.activeLogs) {
      copyLogsBtn.addEventListener('click', async () => {
        if (!this.activeLogs) return;
        await navigator.clipboard.writeText(this.activeLogs.logs);
      });
    }

    // Refresh logs
    const refreshLogsBtn = this.container.querySelector('#docker-logs-refresh');
    if (refreshLogsBtn && this.activeLogs) {
      refreshLogsBtn.addEventListener('click', () => {
        if (!this.activeLogs) return;
        this.activeLogs.loading = true;
        this.render();
        this.postMessage({
          type: 'dockerGetLogs',
          containerId: this.activeLogs.containerId,
          name: this.activeLogs.name
        });
      });
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
