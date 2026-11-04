import { Language, t } from '../i18n';
import { ICONS } from '../icons';

export interface TunnelViewStatus {
  isActive: boolean;
  provider: 'cloudflare' | 'localtunnel' | 'ngrok';
  port: number;
  publicUrl: string | null;
  qrSvg: string | null;
  error?: string;
  logs: string[];
}

export interface TunnelViewState {
  provider: 'cloudflare' | 'localtunnel' | 'ngrok';
  port: number;
  showLogs: boolean;
}

export class TunnelView {
  private container: HTMLElement;
  private currentLang: Language;
  private onMessage: (msg: any) => void;

  private provider: 'cloudflare' | 'localtunnel' | 'ngrok' = 'cloudflare';
  private port: number = 4040;
  private isConnecting: boolean = false;
  private status: TunnelViewStatus = {
    isActive: false,
    provider: 'cloudflare',
    port: 4040,
    publicUrl: null,
    qrSvg: null,
    logs: []
  };
  private showLogs: boolean = true;

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

  public getState(): TunnelViewState {
    return {
      provider: this.provider,
      port: this.port,
      showLogs: this.showLogs
    };
  }

  public restoreState(state: TunnelViewState) {
    if (state.provider) this.provider = state.provider;
    if (state.port) this.port = state.port;
    if (typeof state.showLogs === 'boolean') this.showLogs = state.showLogs;
    this.render();
  }

  public setStatus(status: TunnelViewStatus) {
    this.status = status;
    this.provider = status.provider;
    this.port = status.port;
    this.isConnecting = false;
    this.render();
  }

  public appendLog(line: string) {
    this.status.logs.push(line);
    if (this.status.logs.length > 60) this.status.logs.shift();
    this.updateLogsBox();
  }

  private render() {
    this.container.innerHTML = `
      <div class="tunnel-view-wrapper">
        <!-- Configuration Card -->
        <div class="tunnel-config-card">
          <div class="form-group">
            <label class="form-label">${t('tunnelProvider', this.currentLang)}</label>
            <select id="tunnel-provider-select" class="input-text" ${this.status.isActive || this.isConnecting ? 'disabled' : ''}>
              <option value="cloudflare" ${this.provider === 'cloudflare' ? 'selected' : ''}>${t('tunnelCloudflare', this.currentLang)}</option>
              <option value="localtunnel" ${this.provider === 'localtunnel' ? 'selected' : ''}>${t('tunnelLocaltunnel', this.currentLang)}</option>
              <option value="ngrok" ${this.provider === 'ngrok' ? 'selected' : ''}>${t('tunnelNgrok', this.currentLang)}</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">${t('tunnelPort', this.currentLang)}</label>
            <div class="input-row">
              <input type="number" id="tunnel-port-input" class="input-text mono" min="1" max="65535" value="${this.port}" ${this.status.isActive || this.isConnecting ? 'disabled' : ''} />
              <button id="btn-toggle-tunnel" class="btn ${this.status.isActive ? 'btn-danger' : ''}" style="white-space: nowrap; min-width: 130px;">
                ${
                  this.isConnecting
                    ? `${ICONS.sync} ${t('tunnelConnecting', this.currentLang)}`
                    : this.status.isActive
                    ? `${ICONS.stop} ${t('tunnelDisconnect', this.currentLang)}`
                    : `${ICONS.tunnel} ${t('tunnelConnect', this.currentLang)}`
                }
              </button>
            </div>
          </div>

          <!-- Status Indicator Pill -->
          <div class="tunnel-status-bar">
            <span class="status-dot ${this.status.isActive ? 'dot-running' : this.isConnecting ? 'dot-restarting' : 'dot-stopped'}"></span>
            <span style="font-size: 11px; font-weight: 500;">
              ${this.isConnecting ? t('tunnelConnecting', this.currentLang) : this.status.isActive ? t('tunnelStatusActive', this.currentLang) : t('tunnelStatusInactive', this.currentLang)}
            </span>
            ${this.status.error ? `<span class="tunnel-error-inline">${this.status.error}</span>` : ''}
          </div>
        </div>

        <!-- Active Public URL & Scannable QR Code Card -->
        ${
          this.status.isActive && this.status.publicUrl
            ? `
          <div class="tunnel-share-card">
            <div class="tunnel-url-header">
              <span class="icon-wrap" style="color: var(--vscode-charts-green, #3fb950);">${ICONS.globe}</span>
              <span style="font-weight: 600; font-size: 11.5px;">${t('tunnelPublicUrl', this.currentLang)}</span>
            </div>

            <div class="tunnel-url-box">
              <input type="text" id="tunnel-url-field" class="input-text mono" readonly value="${this.status.publicUrl}" />
              <div class="tunnel-url-actions">
                <button id="btn-copy-tunnel-url" class="btn btn-secondary btn-icon-only" title="${t('copy', this.currentLang)}">
                  ${ICONS.copy}
                </button>
                <button id="btn-open-browser" class="btn btn-secondary btn-icon-only" title="${t('tunnelOpenBrowser', this.currentLang)}">
                  ${ICONS.externalLink}
                </button>
              </div>
            </div>

            <!-- QR Code Section -->
            <div class="tunnel-qr-container">
              <div class="qr-svg-wrapper">
                ${this.status.qrSvg || ''}
              </div>
              <span class="qr-helper-text">${ICONS.qrCode} ${t('tunnelScanQr', this.currentLang)}</span>
            </div>
          </div>
        `
            : ''
        }

        <!-- Logs Box -->
        <div class="mock-section-box" style="margin-top: 10px;">
          <div class="mock-section-header">
            <div class="mock-section-title">
              <span class="icon-wrap">${ICONS.terminal}</span>
              <span>${t('tunnelLogs', this.currentLang)}</span>
            </div>
            <button id="btn-clear-tunnel-logs" class="btn btn-secondary btn-icon-only" title="${t('clear', this.currentLang)}">
              ${ICONS.trash}
            </button>
          </div>
          <div class="code-container" style="margin-top: 6px;">
            <pre class="code-block mono" id="tunnel-logs-output" style="max-height: 140px; font-size: 10.5px;"></pre>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.updateLogsBox();
  }

  private attachEventListeners() {
    const providerSelect = this.container.querySelector('#tunnel-provider-select') as HTMLSelectElement;
    providerSelect?.addEventListener('change', () => {
      this.provider = providerSelect.value as any;
    });

    const portInput = this.container.querySelector('#tunnel-port-input') as HTMLInputElement;
    portInput?.addEventListener('input', () => {
      const val = parseInt(portInput.value || '4040', 10);
      if (!isNaN(val)) this.port = val;
    });

    const toggleBtn = this.container.querySelector('#btn-toggle-tunnel');
    toggleBtn?.addEventListener('click', () => {
      if (this.status.isActive) {
        this.onMessage({ type: 'tunnelStop' });
      } else {
        this.isConnecting = true;
        this.render();
        this.onMessage({
          type: 'tunnelStart',
          provider: this.provider,
          port: this.port
        });
      }
    });

    this.container.querySelector('#btn-copy-tunnel-url')?.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      if (this.status.publicUrl) {
        navigator.clipboard.writeText(this.status.publicUrl).then(() => {
          const orig = btn.innerHTML;
          btn.innerHTML = `${ICONS.check}`;
          setTimeout(() => { btn.innerHTML = orig; }, 1200);
        });
      }
    });

    this.container.querySelector('#btn-open-browser')?.addEventListener('click', () => {
      if (this.status.publicUrl) {
        this.onMessage({ type: 'openExternalUrl', url: this.status.publicUrl });
      }
    });

    this.container.querySelector('#btn-clear-tunnel-logs')?.addEventListener('click', () => {
      this.status.logs = [];
      this.updateLogsBox();
    });
  }

  private updateLogsBox() {
    const el = this.container.querySelector('#tunnel-logs-output');
    if (el) {
      el.textContent = this.status.logs.join('\n') || '[Waiting for tunnel execution...]';
      el.scrollTop = el.scrollHeight;
    }
  }
}
