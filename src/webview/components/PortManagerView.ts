import { Language, t } from '../i18n';
import { ICONS } from '../icons';

export interface PortItem {
  port: number;
  pid: number;
  processName: string;
  protocol: 'TCP';
  localAddress: string;
}

export interface NetworkDetailItem {
  interfaceName: string;
  family: 'IPv4' | 'IPv6';
  address: string;
  netmask: string;
  mac: string;
}

export interface SystemNetworkData {
  hostname: string;
  platform: string;
  primaryIpv4: string;
  interfaces: NetworkDetailItem[];
}

export class PortManagerView {
  private container: HTMLElement;
  private currentLang: Language;
  private onMessage: (msg: any) => void;

  private searchInput!: HTMLInputElement;
  private refreshBtn!: HTMLButtonElement;
  private portsTableBody!: HTMLElement;
  private emptyState!: HTMLElement;
  private statusNotice!: HTMLElement;

  private primaryIpField!: HTMLInputElement;
  private hostnameField!: HTMLInputElement;
  private publicIpField!: HTMLInputElement;
  private interfacesContainer!: HTMLElement;

  private allPorts: PortItem[] = [];
  private isScanning = false;
  private pendingKillPid: number | null = null;
  private killTimeoutId: any = null;

  constructor(container: HTMLElement, currentLang: Language, onMessage: (msg: any) => void) {
    this.container = container;
    this.currentLang = currentLang;
    this.onMessage = onMessage;
    this.render();
  }

  public setLanguage(lang: Language) {
    this.currentLang = lang;
    this.render();
    this.renderTable();
  }

  public setPorts(ports: PortItem[]) {
    this.isScanning = false;
    this.allPorts = ports;
    this.renderTable();
  }

  public setNetworkInfo(info: SystemNetworkData) {
    if (this.primaryIpField) {
      this.primaryIpField.value = info.primaryIpv4 || '127.0.0.1';
    }
    if (this.hostnameField) {
      this.hostnameField.value = info.hostname || '';
    }

    if (this.interfacesContainer && info.interfaces) {
      this.interfacesContainer.innerHTML = info.interfaces
        .map(
          (net) => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 3px 0; border-bottom: 1px dashed var(--devshelf-border); font-size: 11px;">
            <span style="font-weight: 500;">${net.interfaceName} (${net.family})</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span class="mono" style="color: #58a6ff;">${net.address}</span>
              <button class="btn btn-secondary btn-icon-only copy-text-btn" data-copy="${net.address}" title="${t('copy', this.currentLang)}">
                ${ICONS.copy}
              </button>
            </div>
          </div>
        `
        )
        .join('');

      this.attachCopyButtons(this.interfacesContainer);
    }
  }

  public setPublicIp(ip: string | null) {
    if (this.publicIpField) {
      this.publicIpField.value = ip || 'Unavailable';
    }
  }

  public handlePortKilled(result: { success: boolean; message: string; port: number; pid: number }) {
    this.pendingKillPid = null;
    this.showNotice(result.message, result.success);
    this.requestScan();
  }

  public requestScan() {
    this.isScanning = true;
    this.showScanning();
    this.onMessage({ type: 'scanPorts' });
    this.onMessage({ type: 'getNetworkInfo' });
  }

  private render() {
    this.container.innerHTML = `
      <!-- System IP & Network Section -->
      <div style="margin-bottom: 14px; border: 1px solid var(--devshelf-border); border-radius: 3px; padding: 8px; background-color: rgba(128, 128, 128, 0.05);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-weight: 600; font-size: 11px;">${t('networkTitle', this.currentLang)}</span>
          <button id="refresh-network-btn" class="btn btn-secondary" style="padding: 2px 6px; font-size: 10px;">
            ${ICONS.sync} ${t('refresh', this.currentLang)}
          </button>
        </div>

        <div class="form-group" style="margin-bottom: 6px;">
          <label class="form-label">${t('localIp', this.currentLang)}</label>
          <div class="input-row">
            <input type="text" id="net-primary-ip" class="input-text mono" readonly value="Scanning..." />
            <button class="btn btn-secondary btn-icon-only copy-field-btn" data-target="net-primary-ip" title="${t('copy', this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 6px;">
          <label class="form-label">${t('hostname', this.currentLang)}</label>
          <div class="input-row">
            <input type="text" id="net-hostname" class="input-text mono" readonly value="" />
            <button class="btn btn-secondary btn-icon-only copy-field-btn" data-target="net-hostname" title="${t('copy', this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <label class="form-label" style="margin: 0;">${t('publicIp', this.currentLang)}</label>
            <button id="check-public-ip-btn" class="btn btn-secondary" style="padding: 1px 5px; font-size: 10px;">
              ${t('checkPublicIp', this.currentLang)}
            </button>
          </div>
          <div class="input-row">
            <input type="text" id="net-public-ip" class="input-text mono" readonly placeholder="Click to check..." />
            <button class="btn btn-secondary btn-icon-only copy-field-btn" data-target="net-public-ip" title="${t('copy', this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
        </div>

        <details style="margin-top: 6px; cursor: pointer;">
          <summary style="font-size: 11px; color: var(--vscode-descriptionForeground); font-weight: 500;">
            ${t('interfaces', this.currentLang)}
          </summary>
          <div id="net-interfaces-list" style="margin-top: 6px; max-height: 120px; overflow-y: auto;"></div>
        </details>
      </div>

      <!-- Ports Manager Section -->
      <div style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-weight: 600; font-size: 11px;">${t('portsTitle', this.currentLang)}</span>
          <button id="refresh-ports-btn" class="btn btn-secondary" style="padding: 3px 7px; font-size: 11px;">
            ${ICONS.sync} ${t('refresh', this.currentLang)}
          </button>
        </div>
        <p style="color: var(--vscode-descriptionForeground); font-size: 11px; margin-bottom: 8px;">
          ${t('portsDescription', this.currentLang)}
        </p>

        <div class="search-wrapper">
          <span class="search-icon">${ICONS.search}</span>
          <input type="text" id="ports-search" class="input-text search-input" placeholder="${t('search', this.currentLang)}" />
        </div>

        <div id="port-status-notice" style="display: none; padding: 4px 6px; font-size: 11px; border-radius: 2px; margin-bottom: 6px;"></div>

        <div style="max-height: 280px; overflow-y: auto; border: 1px solid var(--devshelf-border); border-radius: 3px;">
          <table class="data-table" style="margin-top: 0;">
            <thead>
              <tr>
                <th style="width: 25%;">${t('portHeader', this.currentLang)}</th>
                <th style="width: 45%;">${t('processHeader', this.currentLang)}</th>
                <th style="width: 15%;">${t('pidHeader', this.currentLang)}</th>
                <th style="width: 15%; text-align: center;">${t('actionHeader', this.currentLang)}</th>
              </tr>
            </thead>
            <tbody id="ports-tbody"></tbody>
          </table>
          <div id="ports-empty" class="empty-state" style="display: none;">
            ${t('noPortsFound', this.currentLang)}
          </div>
        </div>
      </div>
    `;

    this.searchInput = this.container.querySelector('#ports-search') as HTMLInputElement;
    this.refreshBtn = this.container.querySelector('#refresh-ports-btn') as HTMLButtonElement;
    this.portsTableBody = this.container.querySelector('#ports-tbody') as HTMLElement;
    this.emptyState = this.container.querySelector('#ports-empty') as HTMLElement;
    this.statusNotice = this.container.querySelector('#port-status-notice') as HTMLElement;

    this.primaryIpField = this.container.querySelector('#net-primary-ip') as HTMLInputElement;
    this.hostnameField = this.container.querySelector('#net-hostname') as HTMLInputElement;
    this.publicIpField = this.container.querySelector('#net-public-ip') as HTMLInputElement;
    this.interfacesContainer = this.container.querySelector('#net-interfaces-list') as HTMLElement;

    this.attachEvents();
  }

  private attachEvents() {
    this.refreshBtn?.addEventListener('click', () => this.requestScan());
    this.searchInput?.addEventListener('input', () => this.renderTable());

    const refreshNetBtn = this.container.querySelector('#refresh-network-btn');
    refreshNetBtn?.addEventListener('click', () => {
      this.onMessage({ type: 'getNetworkInfo' });
    });

    const checkPublicIpBtn = this.container.querySelector('#check-public-ip-btn');
    checkPublicIpBtn?.addEventListener('click', () => {
      if (this.publicIpField) {
        this.publicIpField.value = t('fetching', this.currentLang);
      }
      this.onMessage({ type: 'getPublicIp' });
    });

    this.attachCopyButtons(this.container);
  }

  private attachCopyButtons(root: HTMLElement) {
    root.querySelectorAll('.copy-field-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = (btn as HTMLElement).getAttribute('data-target');
        if (targetId) {
          const input = root.querySelector(`#${targetId}`) as HTMLInputElement;
          if (input && input.value) {
            this.copyText(input.value, btn as HTMLButtonElement);
          }
        }
      });
    });

    root.querySelectorAll('.copy-text-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const text = (btn as HTMLElement).getAttribute('data-copy');
        if (text) {
          this.copyText(text, btn as HTMLButtonElement);
        }
      });
    });
  }

  private showScanning() {
    this.emptyState.textContent = t('scanning', this.currentLang);
    this.emptyState.style.display = 'block';
    this.portsTableBody.innerHTML = '';
  }

  private showNotice(msg: string, isSuccess: boolean) {
    this.statusNotice.textContent = msg;
    this.statusNotice.style.display = 'block';
    this.statusNotice.style.backgroundColor = isSuccess ? 'rgba(46, 160, 67, 0.2)' : 'rgba(248, 81, 73, 0.2)';
    this.statusNotice.style.color = isSuccess ? '#3fb950' : '#f85149';

    setTimeout(() => {
      this.statusNotice.style.display = 'none';
    }, 4000);
  }

  private renderTable() {
    const query = this.searchInput ? this.searchInput.value.trim().toLowerCase() : '';
    const filtered = this.allPorts.filter((p) => {
      if (!query) return true;
      return (
        String(p.port).includes(query) ||
        p.processName.toLowerCase().includes(query) ||
        String(p.pid).includes(query)
      );
    });

    if (filtered.length === 0) {
      this.portsTableBody.innerHTML = '';
      this.emptyState.textContent = t('noPortsFound', this.currentLang);
      this.emptyState.style.display = 'block';
      return;
    }

    this.emptyState.style.display = 'none';

    this.portsTableBody.innerHTML = filtered
      .map((p) => {
        const isConfirming = this.pendingKillPid === p.pid;
        const killBtnText = isConfirming ? t('confirmKill', this.currentLang) : ICONS.kill;
        const killBtnClass = isConfirming
          ? 'btn btn-danger kill-port-btn'
          : 'btn btn-danger btn-icon-only kill-port-btn';

        return `
        <tr>
          <td><span class="mono" style="font-weight: 600; color: #58a6ff;">:${p.port}</span></td>
          <td style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100px;" title="${p.processName}">${p.processName}</td>
          <td><span class="mono" style="color: var(--vscode-descriptionForeground);">${p.pid}</span></td>
          <td style="text-align: center;">
            <button class="${killBtnClass}" data-pid="${p.pid}" data-port="${p.port}" data-name="${p.processName}" title="${t('kill', this.currentLang)}" style="font-size: 10px; padding: 2px 6px;">
              ${killBtnText}
            </button>
          </td>
        </tr>
      `;
      })
      .join('');

    // Attach kill listeners with 2-step inline confirmation (no window.confirm!)
    this.portsTableBody.querySelectorAll('.kill-port-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = parseInt((btn as HTMLElement).getAttribute('data-pid') || '0', 10);
        const port = parseInt((btn as HTMLElement).getAttribute('data-port') || '0', 10);
        const name = (btn as HTMLElement).getAttribute('data-name') || '';

        if (pid <= 0) return;

        if (this.pendingKillPid === pid) {
          // Second click -> Trigger Kill!
          if (this.killTimeoutId) clearTimeout(this.killTimeoutId);
          this.pendingKillPid = null;
          (btn as HTMLButtonElement).disabled = true;
          btn.innerHTML = `${ICONS.sync}`;
          this.onMessage({ type: 'killPort', pid, port, name });
        } else {
          // First click -> Prompt inline confirmation
          if (this.killTimeoutId) clearTimeout(this.killTimeoutId);
          this.pendingKillPid = pid;
          this.renderTable();

          // Reset confirmation after 3.5 seconds
          this.killTimeoutId = setTimeout(() => {
            this.pendingKillPid = null;
            this.renderTable();
          }, 3500);
        }
      });
    });
  }

  private copyText(text: string, button: HTMLButtonElement) {
    navigator.clipboard.writeText(text).then(() => {
      const originalHtml = button.innerHTML;
      button.innerHTML = `${ICONS.check}`;
      button.classList.add('status-valid');
      setTimeout(() => {
        button.innerHTML = originalHtml;
        button.classList.remove('status-valid');
      }, 1400);
    });
  }
}
