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
  private isLoading: boolean = false;
  private statusPayload: DockerStatusPayload | null = null;
  private activeLogs: { containerId: string; name: string; logs: string; loading: boolean } | null = null;
  private actionInProgress: Record<string, string> = {}; // containerId -> action

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
      filterQuery: this.filterQuery
    };
  }

  public restoreState(state: any) {
    if (state && typeof state.filterQuery === 'string') {
      this.filterQuery = state.filterQuery;
    }
    this.refreshContainers();
  }

  private render() {
    const isFa = this.currentLang === 'fa';
    const isInstalled = this.statusPayload?.isInstalled ?? true;
    const isRunning = this.statusPayload?.isRunning ?? true;
    const containers = this.statusPayload?.containers || [];

    const filtered = containers.filter((c) => {
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
        <div class="section-header">
          <div class="section-title-wrap">
            <span class="section-icon">${ICONS.docker}</span>
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
          <div class="alert-box alert-error">
            <div class="alert-title">${t('error', this.currentLang)}</div>
            <div class="alert-desc">${t('dockerNotInstalled', this.currentLang)}</div>
          </div>
        ` : !isRunning ? `
          <div class="alert-box alert-warning">
            <div class="alert-title">${t('error', this.currentLang)}</div>
            <div class="alert-desc">${t('dockerDaemonNotRunning', this.currentLang)}</div>
            <button id="docker-retry-btn" class="btn btn-secondary btn-sm" style="margin-top: 8px;">
              ${ICONS.sync} ${t('refresh', this.currentLang)}
            </button>
          </div>
        ` : `
          <div class="filter-bar">
            <div class="input-with-icon">
              <span class="input-icon">${ICONS.search}</span>
              <input
                type="text"
                id="docker-filter-input"
                class="filter-input"
                placeholder="${t('dockerFilterPlaceholder', this.currentLang)}"
                value="${this.escapeHtml(this.filterQuery)}"
              />
            </div>
          </div>

          ${this.isLoading && containers.length === 0 ? `
            <div class="empty-state">
              <span class="spin">${ICONS.sync}</span>
              <p>${t('dockerRefreshing', this.currentLang)}</p>
            </div>
          ` : filtered.length === 0 ? `
            <div class="empty-state">
              <p>${t('dockerNoContainers', this.currentLang)}</p>
            </div>
          ` : `
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

  private renderContainerCard(c: DockerContainerData): string {
    const isRunning = c.state === 'running';
    const currentAction = this.actionInProgress[c.id];

    return `
      <div class="docker-card ${isRunning ? 'is-running' : 'is-stopped'}" data-id="${c.id}">
        <div class="docker-card-header">
          <div class="docker-name-badge">
            <span class="docker-status-dot ${isRunning ? 'dot-running' : 'dot-stopped'}"></span>
            <span class="docker-container-name" title="${this.escapeHtml(c.name)}">${this.escapeHtml(c.name)}</span>
            <span class="docker-container-id">${c.id}</span>
          </div>
          <div class="docker-status-text">${this.escapeHtml(c.status)}</div>
        </div>

        <div class="docker-card-body">
          <div class="docker-meta-row">
            <span class="docker-meta-label">${t('dockerImage', this.currentLang)}</span>
            <span class="docker-meta-val code-text" title="${this.escapeHtml(c.image)}">${this.escapeHtml(c.image)}</span>
          </div>
          ${c.ports ? `
            <div class="docker-meta-row">
              <span class="docker-meta-label">${t('dockerPorts', this.currentLang)}</span>
              <span class="docker-meta-val code-text" title="${this.escapeHtml(c.ports)}">${this.escapeHtml(c.ports)}</span>
            </div>
          ` : ''}
        </div>

        <div class="docker-card-actions">
          ${isRunning ? `
            <button
              class="btn btn-secondary btn-xs docker-action-btn"
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
              class="btn btn-primary btn-xs docker-action-btn"
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
            ${ICONS.log}
            <span>${t('dockerLogs', this.currentLang)}</span>
          </button>
        </div>
      </div>
    `;
  }

  private renderLogsModal(): string {
    if (!this.activeLogs) return '';

    return `
      <div class="docker-logs-panel">
        <div class="logs-header">
          <div class="logs-title">
            <span class="logs-icon">${ICONS.log}</span>
            <span class="logs-name">${t('dockerLogsTitle', this.currentLang)}: ${this.escapeHtml(this.activeLogs.name)}</span>
          </div>
          <div class="logs-actions">
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
            <pre class="logs-content"><code>${this.escapeHtml(this.activeLogs.logs)}</code></pre>
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
