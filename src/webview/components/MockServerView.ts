import { Language, t } from '../i18n';
import { ICONS } from '../icons';

export interface MockRouteItem {
  id: string;
  method: 'ANY' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  statusCode: number;
  delayMs: number;
  contentType: string;
  responseBody: string;
  enabled: boolean;
}

export interface CapturedRequestItem {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string;
  isJson: boolean;
  clientIp: string;
  matchedRouteId?: string;
  responseStatus: number;
  delayMs: number;
}

export interface MockServerState {
  isRunning: boolean;
  port: number;
  routes: MockRouteItem[];
  captured: CapturedRequestItem[];
  selectedRequestId?: string;
  isAddingRoute?: boolean;
}

export class MockServerView {
  private container: HTMLElement;
  private currentLang: Language;
  private onMessage: (msg: any) => void;

  private isRunning: boolean = false;
  private port: number = 4040;
  private routes: MockRouteItem[] = [];
  private captured: CapturedRequestItem[] = [];
  private selectedRequestId: string | null = null;
  private isAddingRoute: boolean = false;

  constructor(container: HTMLElement, currentLang: Language, onMessage: (msg: any) => void) {
    this.container = container;
    this.currentLang = currentLang;
    this.onMessage = onMessage;
    this.render();
  }

  public setLanguage(lang: Language) {
    this.currentLang = lang;
    this.render();
  }

  public getState(): MockServerState {
    return {
      isRunning: this.isRunning,
      port: this.port,
      routes: this.routes,
      captured: this.captured,
      selectedRequestId: this.selectedRequestId || undefined,
      isAddingRoute: this.isAddingRoute
    };
  }

  public restoreState(state: MockServerState) {
    if (typeof state.isRunning === 'boolean') this.isRunning = state.isRunning;
    if (state.port) this.port = state.port;
    if (state.routes) this.routes = state.routes;
    if (state.captured) this.captured = state.captured;
    if (state.selectedRequestId) this.selectedRequestId = state.selectedRequestId;
    if (typeof state.isAddingRoute === 'boolean') this.isAddingRoute = state.isAddingRoute;
    this.render();
  }

  public updateStatus(data: { isRunning: boolean; port: number; lastError?: string }) {
    this.isRunning = data.isRunning;
    this.port = data.port;
    this.renderControlBar();
  }

  public setRoutes(routes: MockRouteItem[]) {
    this.routes = routes;
    this.renderRoutesList();
  }

  public addCapturedRequest(req: CapturedRequestItem) {
    this.captured.unshift(req);
    if (this.captured.length > 80) this.captured.pop();
    this.renderRequestsList();
  }

  public setCapturedRequests(requests: CapturedRequestItem[]) {
    this.captured = requests;
    this.renderRequestsList();
  }

  private render() {
    this.container.innerHTML = `
      <div class="mock-view-wrapper">
        <!-- Control Card -->
        <div class="mock-control-card" id="mock-control-card"></div>

        <!-- Sub Tabs / Accordion for Routes & Webhooks -->
        <div class="mock-section-box">
          <div class="mock-section-header">
            <div class="mock-section-title">
              <span class="icon-wrap">${ICONS.webhook}</span>
              <span>${t('mockRoutesTitle', this.currentLang)}</span>
              <span class="counter-badge" id="routes-count-badge">${this.routes.length}</span>
            </div>
            <button id="btn-toggle-add-route" class="btn btn-secondary btn-icon-only" title="${t('mockAddRoute', this.currentLang)}">
              ${ICONS.plus}
            </button>
          </div>

          <!-- Add / Edit Route Form -->
          <div id="mock-add-route-form" class="mock-route-form" style="display: ${this.isAddingRoute ? 'block' : 'none'};"></div>

          <!-- Routes List -->
          <div id="mock-routes-list" class="mock-routes-list"></div>
        </div>

        <!-- Live Webhook Traffic Section -->
        <div class="mock-section-box">
          <div class="mock-section-header">
            <div class="mock-section-title">
              <span class="icon-wrap">${ICONS.activity}</span>
              <span>${t('mockWebhooksTitle', this.currentLang)}</span>
              <span class="counter-badge" id="requests-count-badge">${this.captured.length}</span>
            </div>
            <button id="btn-clear-captured" class="btn btn-secondary btn-icon-only" title="${t('mockClearLogs', this.currentLang)}">
              ${ICONS.trash}
            </button>
          </div>

          <!-- Requests Feed -->
          <div id="mock-requests-list" class="mock-requests-list"></div>
        </div>
      </div>
    `;

    this.renderControlBar();
    this.renderAddRouteForm();
    this.renderRoutesList();
    this.renderRequestsList();

    this.container.querySelector('#btn-toggle-add-route')?.addEventListener('click', () => {
      this.isAddingRoute = !this.isAddingRoute;
      const formEl = this.container.querySelector('#mock-add-route-form') as HTMLElement;
      if (formEl) formEl.style.display = this.isAddingRoute ? 'block' : 'none';
    });

    this.container.querySelector('#btn-clear-captured')?.addEventListener('click', () => {
      this.captured = [];
      this.selectedRequestId = null;
      this.onMessage({ type: 'mockClearRequests' });
      this.renderRequestsList();
    });
  }

  private renderControlBar() {
    const card = this.container.querySelector('#mock-control-card');
    if (!card) return;

    card.innerHTML = `
      <div class="mock-status-row">
        <div class="mock-status-indicator">
          <span class="status-dot ${this.isRunning ? 'dot-running' : 'dot-stopped'}"></span>
          <span class="mock-status-text">
            ${this.isRunning ? `${t('mockListening', this.currentLang)}: <strong class="mono" style="color: var(--vscode-charts-green, #3fb950);">http://localhost:${this.port}</strong>` : t('mockStopped', this.currentLang)}
          </span>
        </div>
        <button id="btn-toggle-server" class="btn ${this.isRunning ? 'btn-danger' : ''}">
          ${this.isRunning ? `${ICONS.stop} ${t('mockStop', this.currentLang)}` : `${ICONS.play} ${t('mockStart', this.currentLang)}`}
        </button>
      </div>

      <div class="mock-port-config-row">
        <label class="form-label" style="margin: 0; white-space: nowrap;">${t('mockPort', this.currentLang)}:</label>
        <input type="number" id="mock-port-input" class="input-text mono" value="${this.port}" min="1024" max="65535" style="width: 90px; height: 26px;" ${this.isRunning ? 'disabled' : ''} />
        ${
          this.isRunning
            ? `<button id="btn-copy-mock-url" class="btn btn-secondary" style="padding: 3px 8px; font-size: 10.5px;">
                ${ICONS.copy} http://localhost:${this.port}
              </button>`
            : ''
        }
      </div>
    `;

    card.querySelector('#btn-toggle-server')?.addEventListener('click', () => {
      const portInput = card.querySelector('#mock-port-input') as HTMLInputElement;
      const parsedPort = parseInt(portInput?.value || '4040', 10);
      this.port = isNaN(parsedPort) ? 4040 : parsedPort;

      if (this.isRunning) {
        this.onMessage({ type: 'mockStopServer' });
      } else {
        this.onMessage({ type: 'mockStartServer', port: this.port });
      }
    });

    card.querySelector('#btn-copy-mock-url')?.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      navigator.clipboard.writeText(`http://localhost:${this.port}`).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = `${ICONS.check} ${t('copied', this.currentLang)}`;
        setTimeout(() => { btn.innerHTML = orig; }, 1200);
      });
    });
  }

  private renderAddRouteForm() {
    const form = this.container.querySelector('#mock-add-route-form');
    if (!form) return;

    form.innerHTML = `
      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label">${t('mockRouteMethod', this.currentLang)}</label>
          <select id="new-route-method" class="input-text">
            <option value="GET">GET</option>
            <option value="POST" selected>POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
            <option value="ANY">ANY</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${t('mockStatusCode', this.currentLang)}</label>
          <select id="new-route-status" class="input-text">
            <option value="200" selected>200 OK</option>
            <option value="201">201 Created</option>
            <option value="204">204 No Content</option>
            <option value="400">400 Bad Request</option>
            <option value="401">401 Unauthorized</option>
            <option value="404">404 Not Found</option>
            <option value="500">500 Server Error</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">${t('mockRoutePath', this.currentLang)}</label>
        <input type="text" id="new-route-path" class="input-text mono" placeholder="/api/webhook" value="/api/custom" />
      </div>

      <div class="form-group">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
          <label class="form-label" style="margin: 0;">${t('mockLatencyMs', this.currentLang)}</label>
          <span id="delay-val-label" class="mono" style="font-size: 11px; color: var(--vscode-descriptionForeground);">100ms</span>
        </div>
        <input type="range" id="new-route-delay" min="0" max="5000" step="50" value="100" style="width: 100%; cursor: pointer;" />
      </div>

      <div class="form-group">
        <label class="form-label">${t('mockResponseBody', this.currentLang)}</label>
        <textarea id="new-route-body" class="input-textarea" style="min-height: 70px;">{\n  "status": "success",\n  "data": "custom response"\n}</textarea>
      </div>

      <div style="display: flex; gap: 6px; justify-content: flex-end;">
        <button id="btn-cancel-route" class="btn btn-secondary">${t('clear', this.currentLang)}</button>
        <button id="btn-save-route" class="btn">${ICONS.plus} ${t('mockAddRoute', this.currentLang)}</button>
      </div>
    `;

    const delayInput = form.querySelector('#new-route-delay') as HTMLInputElement;
    const delayLabel = form.querySelector('#delay-val-label');
    delayInput?.addEventListener('input', () => {
      if (delayLabel) delayLabel.textContent = `${delayInput.value}ms`;
    });

    form.querySelector('#btn-cancel-route')?.addEventListener('click', () => {
      this.isAddingRoute = false;
      (form as HTMLElement).style.display = 'none';
    });

    form.querySelector('#btn-save-route')?.addEventListener('click', () => {
      const method = ((form.querySelector('#new-route-method') as HTMLSelectElement).value || 'GET') as any;
      const statusCode = parseInt((form.querySelector('#new-route-status') as HTMLSelectElement).value || '200', 10);
      const pathVal = (form.querySelector('#new-route-path') as HTMLInputElement).value.trim();
      const delayMs = parseInt(delayInput.value || '0', 10);
      const bodyVal = (form.querySelector('#new-route-body') as HTMLTextAreaElement).value.trim();

      if (!pathVal) return;

      const newRoute: MockRouteItem = {
        id: `route-${Date.now()}`,
        method,
        path: pathVal.startsWith('/') ? pathVal : `/${pathVal}`,
        statusCode,
        delayMs,
        contentType: bodyVal.startsWith('{') || bodyVal.startsWith('[') ? 'application/json' : 'text/plain',
        responseBody: bodyVal || '{"ok": true}',
        enabled: true
      };

      this.routes.push(newRoute);
      this.onMessage({ type: 'mockSaveRoute', route: newRoute });
      this.isAddingRoute = false;
      (form as HTMLElement).style.display = 'none';
      this.renderRoutesList();
    });
  }

  private renderRoutesList() {
    const list = this.container.querySelector('#mock-routes-list');
    const badge = this.container.querySelector('#routes-count-badge');
    if (badge) badge.textContent = String(this.routes.length);
    if (!list) return;

    if (this.routes.length === 0) {
      list.innerHTML = `<div class="empty-state">${t('mockNoRequests', this.currentLang)}</div>`;
      return;
    }

    list.innerHTML = this.routes
      .map(
        (r) => `
        <div class="mock-route-item ${r.enabled ? '' : 'route-disabled'}">
          <div class="mock-route-info">
            <span class="method-badge method-${r.method.toLowerCase()}">${r.method}</span>
            <span class="route-path mono" title="${r.path}">${r.path}</span>
            <span class="route-status-pill status-${r.statusCode < 400 ? 'valid' : 'expired'}">${r.statusCode}</span>
            ${r.delayMs > 0 ? `<span class="mono route-delay-pill">${r.delayMs}ms</span>` : ''}
          </div>
          <div class="mock-route-actions">
            <button class="btn btn-secondary btn-icon-only btn-toggle-route" data-id="${r.id}" title="Toggle Route">
              ${r.enabled ? ICONS.check : ICONS.clear}
            </button>
            <button class="btn btn-secondary btn-icon-only btn-delete-route" data-id="${r.id}" title="${t('mockDeleteRoute', this.currentLang)}">
              ${ICONS.trash}
            </button>
          </div>
        </div>
      `
      )
      .join('');

    list.querySelectorAll('.btn-toggle-route').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).getAttribute('data-id');
        const route = this.routes.find((r) => r.id === id);
        if (route) {
          route.enabled = !route.enabled;
          this.onMessage({ type: 'mockUpdateRoute', route });
          this.renderRoutesList();
        }
      });
    });

    list.querySelectorAll('.btn-delete-route').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).getAttribute('data-id');
        if (id) {
          this.routes = this.routes.filter((r) => r.id !== id);
          this.onMessage({ type: 'mockDeleteRoute', id });
          this.renderRoutesList();
        }
      });
    });
  }

  private renderRequestsList() {
    const list = this.container.querySelector('#mock-requests-list');
    const badge = this.container.querySelector('#requests-count-badge');
    if (badge) badge.textContent = String(this.captured.length);
    if (!list) return;

    if (this.captured.length === 0) {
      list.innerHTML = `<div class="empty-state">${t('mockNoRequests', this.currentLang)}</div>`;
      return;
    }

    list.innerHTML = this.captured
      .map((req) => {
        const isSelected = this.selectedRequestId === req.id;
        const timeStr = new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        return `
        <div class="mock-request-card ${isSelected ? 'selected' : ''}" data-id="${req.id}">
          <div class="mock-request-summary">
            <span class="method-badge method-${req.method.toLowerCase()}">${req.method}</span>
            <span class="mono request-path" title="${req.path}">${req.path}</span>
            <span class="route-status-pill status-${req.responseStatus < 400 ? 'valid' : 'expired'}">${req.responseStatus}</span>
            <span class="mono request-time">${timeStr}</span>
            <span class="chevron-icon">${isSelected ? ICONS.chevronDown : ICONS.chevronRight}</span>
          </div>

          ${
            isSelected
              ? `
            <div class="mock-request-detail">
              <div class="detail-meta-row">
                <span><strong>${t('mockClientIp', this.currentLang)}:</strong> <span class="mono">${req.clientIp}</span></span>
                ${req.delayMs > 0 ? `<span><strong>Delay:</strong> <span class="mono">${req.delayMs}ms</span></span>` : ''}
              </div>

              <!-- Headers Collapsible -->
              <div class="req-sub-box">
                <span class="form-label">${t('mockHeaders', this.currentLang)}:</span>
                <div class="code-container" style="margin-top: 4px;">
                  <pre class="code-block mono">${JSON.stringify(req.headers, null, 2)}</pre>
                </div>
              </div>

              <!-- Payload -->
              ${
                req.body
                  ? `
                <div class="req-sub-box">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span class="form-label" style="margin: 0;">${t('mockPayload', this.currentLang)}:</span>
                    <button class="btn btn-secondary btn-icon-only btn-copy-body" data-id="${req.id}" title="${t('mockCopyPayload', this.currentLang)}">
                      ${ICONS.copy}
                    </button>
                  </div>
                  <div class="code-container">
                    <pre class="code-block mono">${req.body}</pre>
                  </div>
                </div>
              `
                  : ''
              }

              <!-- Actions -->
              <div class="btn-group" style="margin-top: 6px;">
                <button class="btn btn-secondary btn-replay-request" data-id="${req.id}" style="font-size: 10.5px;">
                  ${ICONS.send} ${t('mockReplayRequest', this.currentLang)}
                </button>
              </div>
            </div>
          `
              : ''
          }
        </div>
      `;
      })
      .join('');

    list.querySelectorAll('.mock-request-card').forEach((card) => {
      const id = (card as HTMLElement).getAttribute('data-id');
      card.querySelector('.mock-request-summary')?.addEventListener('click', () => {
        this.selectedRequestId = this.selectedRequestId === id ? null : id;
        this.renderRequestsList();
      });
    });

    list.querySelectorAll('.btn-copy-body').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).getAttribute('data-id');
        const req = this.captured.find((c) => c.id === id);
        if (req && req.body) {
          navigator.clipboard.writeText(req.body).then(() => {
            const orig = btn.innerHTML;
            btn.innerHTML = `${ICONS.check}`;
            setTimeout(() => { btn.innerHTML = orig; }, 1200);
          });
        }
      });
    });

    list.querySelectorAll('.btn-replay-request').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).getAttribute('data-id');
        const req = this.captured.find((c) => c.id === id);
        if (req) {
          this.onMessage({
            type: 'replayInApiTester',
            request: {
              method: req.method,
              url: `http://localhost:${this.port}${req.url}`,
              headers: req.headers,
              body: req.body
            }
          });
        }
      });
    });
  }
}
