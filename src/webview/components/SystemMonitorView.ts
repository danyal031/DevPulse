import { Language, t } from '../i18n';
import { ICONS } from '../icons';

export interface SystemTelemetryData {
  cpuUsagePercent: number;
  cpuModel: string;
  cpuCores: number;
  totalMemBytes: number;
  freeMemBytes: number;
  usedMemBytes: number;
  memUsagePercent: number;
  uptimeSeconds: number;
  uptimeFormatted: string;
  platform: string;
  arch: string;
  timestamp: number;
}

export interface MonitoredProcessItem {
  pid: number;
  name: string;
  memoryMb: number;
  cpuPercent: number;
  isDevProcess: boolean;
  devCategory?: 'node' | 'python' | 'docker' | 'database' | 'editor' | 'compiler' | 'git' | 'other';
}

export class SystemMonitorView {
  private container: HTMLElement;
  private currentLang: Language;
  private onMessage: (msg: any) => void;

  private telemetry: SystemTelemetryData | null = null;
  private processes: MonitoredProcessItem[] = [];
  private devOnly: boolean = false;
  private autoRefresh: boolean = true;
  private refreshTimer: any = null;
  private pendingKillPid: number | null = null;
  private killTimeoutId: any = null;

  constructor(container: HTMLElement, currentLang: Language, onMessage: (msg: any) => void) {
    this.container = container;
    this.currentLang = currentLang;
    this.onMessage = onMessage;
    this.render();
    this.startAutoRefresh();
  }

  public setLanguage(lang: Language) {
    this.currentLang = lang;
    this.render();
  }

  public getState() {
    return {
      devOnly: this.devOnly,
      autoRefresh: this.autoRefresh
    };
  }

  public restoreState(state: { devOnly?: boolean; autoRefresh?: boolean }) {
    if (typeof state.devOnly === 'boolean') this.devOnly = state.devOnly;
    if (typeof state.autoRefresh === 'boolean') {
      this.autoRefresh = state.autoRefresh;
      if (this.autoRefresh) this.startAutoRefresh();
      else this.stopAutoRefresh();
    }
    this.render();
  }

  public setTelemetry(data: SystemTelemetryData) {
    this.telemetry = data;
    this.updateGauges();
  }

  public setProcesses(procs: MonitoredProcessItem[]) {
    this.processes = procs;
    this.renderProcessTable();
  }

  public handleProcessKilled(pid: number, success: boolean, message: string) {
    this.pendingKillPid = null;
    this.requestData();
  }

  public requestData() {
    this.onMessage({ type: 'sysmonGetTelemetry' });
    this.onMessage({ type: 'sysmonGetProcesses' });
  }

  public startAutoRefresh() {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => {
      this.requestData();
    }, 3000);
  }

  public stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private render() {
    this.container.innerHTML = `
      <div class="sysmon-view-wrapper">
        <!-- Telemetry Gauges Bar -->
        <div class="sysmon-telemetry-grid" id="sysmon-telemetry-grid"></div>

        <!-- System Details Pill Bar -->
        <div class="sysmon-system-meta" id="sysmon-system-meta"></div>

        <!-- Controls Toolbar -->
        <div class="sysmon-toolbar">
          <div class="sysmon-toolbar-left">
            <label class="checkbox-item" style="margin: 0; user-select: none;">
              <input type="checkbox" id="chk-dev-only" ${this.devOnly ? 'checked' : ''} />
              <span>${t('sysmonDevOnly', this.currentLang)}</span>
            </label>
          </div>
          <div class="sysmon-toolbar-actions">
            <label class="checkbox-item" style="margin: 0; user-select: none;">
              <input type="checkbox" id="chk-auto-refresh" ${this.autoRefresh ? 'checked' : ''} />
              <span>${t('sysmonAutoRefresh', this.currentLang)}</span>
            </label>
            <button id="btn-refresh-sysmon" class="btn btn-secondary btn-icon-only" title="${t('refresh', this.currentLang)}">
              ${ICONS.sync}
            </button>
          </div>
        </div>

        <!-- Quick Orphan Killer Action -->
        <div class="sysmon-orphan-card">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="icon-wrap" style="color: var(--vscode-statusBarItem-errorBackground, #d32f2f);">${ICONS.flame}</span>
            <span style="font-weight: 600; font-size: 11px;">${t('sysmonKillOrphans', this.currentLang)}</span>
          </div>
          <button id="btn-kill-orphans" class="btn btn-danger" style="font-size: 10px; padding: 3px 8px;">
            ${ICONS.kill} ${t('sysmonKillProc', this.currentLang)}
          </button>
        </div>

        <!-- Processes Section -->
        <div class="mock-section-box" style="margin-top: 8px;">
          <div class="mock-section-header">
            <div class="mock-section-title">
              <span class="icon-wrap">${ICONS.cpu}</span>
              <span>${t('sysmonTopHogs', this.currentLang)}</span>
              <span class="counter-badge" id="proc-count-badge">0</span>
            </div>
          </div>
          <div id="sysmon-proc-table-container"></div>
        </div>
      </div>
    `;

    this.attachListeners();
    this.updateGauges();
    this.renderProcessTable();
  }

  private attachListeners() {
    this.container.querySelector('#chk-dev-only')?.addEventListener('change', (e) => {
      this.devOnly = (e.target as HTMLInputElement).checked;
      this.renderProcessTable();
    });

    this.container.querySelector('#chk-auto-refresh')?.addEventListener('change', (e) => {
      this.autoRefresh = (e.target as HTMLInputElement).checked;
      if (this.autoRefresh) this.startAutoRefresh();
      else this.stopAutoRefresh();
    });

    this.container.querySelector('#btn-refresh-sysmon')?.addEventListener('click', () => {
      this.requestData();
    });

    this.container.querySelector('#btn-kill-orphans')?.addEventListener('click', () => {
      this.onMessage({ type: 'sysmonKillOrphans', targetType: 'all' });
    });
  }

  private updateGauges() {
    const grid = this.container.querySelector('#sysmon-telemetry-grid');
    const meta = this.container.querySelector('#sysmon-system-meta');
    if (!grid) return;

    const cpu = this.telemetry?.cpuUsagePercent ?? 0;
    const mem = this.telemetry?.memUsagePercent ?? 0;
    const totalGb = this.telemetry ? (this.telemetry.totalMemBytes / (1024 * 1024 * 1024)).toFixed(1) : '0';
    const usedGb = this.telemetry ? (this.telemetry.usedMemBytes / (1024 * 1024 * 1024)).toFixed(1) : '0';

    const getBarColor = (pct: number) => {
      if (pct > 85) return 'var(--vscode-charts-red, #f85149)';
      if (pct > 65) return 'var(--vscode-charts-yellow, #d29922)';
      return 'var(--vscode-charts-green, #3fb950)';
    };

    grid.innerHTML = `
      <div class="sysmon-gauge-card">
        <div class="gauge-title-row">
          <span>${t('sysmonCpuLoad', this.currentLang)}</span>
          <span class="mono" style="font-weight: 700; color: ${getBarColor(cpu)};">${cpu}%</span>
        </div>
        <div class="sysmon-progress-track">
          <div class="sysmon-progress-bar" style="width: ${cpu}%; background-color: ${getBarColor(cpu)};"></div>
        </div>
      </div>

      <div class="sysmon-gauge-card">
        <div class="gauge-title-row">
          <span>${t('sysmonRamUsage', this.currentLang)}</span>
          <span class="mono" style="font-weight: 700; color: ${getBarColor(mem)};">${usedGb}/${totalGb} GB (${mem}%)</span>
        </div>
        <div class="sysmon-progress-track">
          <div class="sysmon-progress-bar" style="width: ${mem}%; background-color: ${getBarColor(mem)};"></div>
        </div>
      </div>
    `;

    if (meta && this.telemetry) {
      meta.innerHTML = `
        <span><strong>${t('sysmonUptime', this.currentLang)}:</strong> <span class="mono">${this.telemetry.uptimeFormatted}</span></span>
        <span><strong>${t('sysmonCores', this.currentLang)}:</strong> <span class="mono">${this.telemetry.cpuCores} (${this.telemetry.arch})</span></span>
      `;
    }
  }

  private renderProcessTable() {
    const container = this.container.querySelector('#sysmon-proc-table-container');
    const countBadge = this.container.querySelector('#proc-count-badge');
    if (!container) return;

    let filtered = this.processes;
    if (this.devOnly) {
      filtered = filtered.filter((p) => p.isDevProcess);
    }

    if (countBadge) countBadge.textContent = String(filtered.length);

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state">${t('sysmonNoProcesses', this.currentLang)}</div>`;
      return;
    }

    container.innerHTML = `
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Process</th>
              <th>PID</th>
              <th>RAM</th>
              <th>CPU%</th>
              <th style="text-align: center;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${filtered
              .map((p) => {
                const isConfirming = this.pendingKillPid === p.pid;
                const killText = isConfirming ? t('confirmKill', this.currentLang) : ICONS.kill;
                const killClass = isConfirming ? 'btn btn-danger kill-proc-btn' : 'btn btn-danger btn-icon-only kill-proc-btn';

                return `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 4px;">
                      ${p.isDevProcess ? `<span class="dev-proc-dot" title="${p.devCategory || 'dev'}"></span>` : ''}
                      <span class="mono" style="font-weight: 500; max-width: 95px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.name}">${p.name}</span>
                    </div>
                  </td>
                  <td><span class="mono" style="color: var(--vscode-descriptionForeground); font-size: 10px;">${p.pid}</span></td>
                  <td><span class="mono" style="font-weight: 600; color: #58a6ff;">${p.memoryMb} MB</span></td>
                  <td><span class="mono">${p.cpuPercent}%</span></td>
                  <td style="text-align: center;">
                    <button class="${killClass}" data-pid="${p.pid}" style="font-size: 10px; padding: 2px 6px;">
                      ${killText}
                    </button>
                  </td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;

    container.querySelectorAll('.kill-proc-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = parseInt((btn as HTMLElement).getAttribute('data-pid') || '0', 10);
        if (pid <= 0) return;

        if (this.pendingKillPid === pid) {
          if (this.killTimeoutId) clearTimeout(this.killTimeoutId);
          this.pendingKillPid = null;
          (btn as HTMLButtonElement).disabled = true;
          btn.innerHTML = `${ICONS.sync}`;
          this.onMessage({ type: 'sysmonKillProcess', pid });
        } else {
          if (this.killTimeoutId) clearTimeout(this.killTimeoutId);
          this.pendingKillPid = pid;
          this.renderProcessTable();

          this.killTimeoutId = setTimeout(() => {
            this.pendingKillPid = null;
            this.renderProcessTable();
          }, 3500);
        }
      });
    });
  }
}
