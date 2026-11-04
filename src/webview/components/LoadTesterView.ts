import { Language, t } from '../i18n';
import { ICONS } from '../icons';

export interface LoadTesterConfigState {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  concurrency: number;
  mode: 'duration' | 'requests';
  durationSeconds: number;
  totalRequests: number;
  timeoutMs: number;
  keepAlive: boolean;
  headers: string;
  body: string;
}

export interface LatencyBucketData {
  label: string;
  minMs: number;
  maxMs: number;
  count: number;
  percentage: number;
}

export interface LoadTesterTelemetrySnapshot {
  isRunning: boolean;
  isCompleted: boolean;
  elapsedMs: number;
  totalDurationMs: number;
  progressPercent: number;
  activeWorkers: number;
  completedRequests: number;
  targetRequests?: number;
  rps: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  statusCodes: Record<string, number>;
  buckets: LatencyBucketData[];
  recentErrors: string[];
}

export class LoadTesterView {
  private container: HTMLElement;
  private currentLang: Language;
  private onMessage: (msg: any) => void;

  private config: LoadTesterConfigState = {
    url: 'http://localhost:4040/api/users',
    method: 'GET',
    concurrency: 10,
    mode: 'duration',
    durationSeconds: 10,
    totalRequests: 500,
    timeoutMs: 5000,
    keepAlive: true,
    headers: '',
    body: '{\n  "test": true\n}'
  };

  private isRunning: boolean = false;
  private isConfigOpen: boolean = false;
  private lastSnapshot: LoadTesterTelemetrySnapshot | null = null;

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

  public getState() {
    return {
      config: this.config,
      isConfigOpen: this.isConfigOpen
    };
  }

  public restoreState(state: any) {
    if (state?.config) this.config = { ...this.config, ...state.config };
    if (typeof state?.isConfigOpen === 'boolean') this.isConfigOpen = state.isConfigOpen;
    this.render();
  }

  public updateTelemetry(snapshot: LoadTesterTelemetrySnapshot) {
    this.isRunning = snapshot.isRunning;
    this.lastSnapshot = snapshot;
    this.updateDashboardMetrics();
  }

  private render() {
    const isDuration = this.config.mode === 'duration';

    this.container.innerHTML = `
      <div class="load-view-wrapper">
        <!-- Configuration Card -->
        <div class="load-config-card">
          <!-- URL & Method Row -->
          <div class="load-url-row">
            <select id="load-method-select" class="input-text mono" style="width: 82px;" ${this.isRunning ? 'disabled' : ''}>
              ${['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => `<option value="${m}" ${this.config.method === m ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
            <input type="text" id="load-url-input" class="input-text mono" value="${this.config.url}" placeholder="http://localhost:3000/api/test" style="flex: 1;" ${this.isRunning ? 'disabled' : ''} />
          </div>

          <!-- Concurrency Slider & Input -->
          <div class="form-group" style="margin-top: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
              <label class="form-label" style="margin: 0;">${t('loadConcurrency', this.currentLang)}:</label>
              <span id="load-concurrency-val" class="mono" style="font-weight: 700; color: #58a6ff;">${this.config.concurrency}</span>
            </div>
            <input type="range" id="load-concurrency-slider" min="1" max="100" value="${this.config.concurrency}" style="width: 100%; cursor: pointer;" ${this.isRunning ? 'disabled' : ''} />
          </div>

          <!-- Mode Selector (Duration vs Requests) -->
          <div class="form-group">
            <label class="form-label">${t('loadMode', this.currentLang)}</label>
            <div class="load-mode-tabs">
              <button id="btn-mode-duration" class="load-mode-btn ${isDuration ? 'active' : ''}" ${this.isRunning ? 'disabled' : ''}>
                ${t('loadDurationMode', this.currentLang)}
              </button>
              <button id="btn-mode-requests" class="load-mode-btn ${!isDuration ? 'active' : ''}" ${this.isRunning ? 'disabled' : ''}>
                ${t('loadRequestsMode', this.currentLang)}
              </button>
            </div>
          </div>

          <!-- Duration / Request Count Parameters -->
          <div class="form-grid-2">
            ${
              isDuration
                ? `
              <div class="form-group">
                <label class="form-label">${t('loadDurationSeconds', this.currentLang)}</label>
                <select id="load-duration-select" class="input-text mono" ${this.isRunning ? 'disabled' : ''}>
                  <option value="5" ${this.config.durationSeconds === 5 ? 'selected' : ''}>5s</option>
                  <option value="10" ${this.config.durationSeconds === 10 ? 'selected' : ''}>10s</option>
                  <option value="30" ${this.config.durationSeconds === 30 ? 'selected' : ''}>30s</option>
                  <option value="60" ${this.config.durationSeconds === 60 ? 'selected' : ''}>60s</option>
                </select>
              </div>
            `
                : `
              <div class="form-group">
                <label class="form-label">${t('loadTotalRequests', this.currentLang)}</label>
                <select id="load-total-select" class="input-text mono" ${this.isRunning ? 'disabled' : ''}>
                  <option value="100" ${this.config.totalRequests === 100 ? 'selected' : ''}>100 req</option>
                  <option value="500" ${this.config.totalRequests === 500 ? 'selected' : ''}>500 req</option>
                  <option value="1000" ${this.config.totalRequests === 1000 ? 'selected' : ''}>1,000 req</option>
                  <option value="2500" ${this.config.totalRequests === 2500 ? 'selected' : ''}>2,500 req</option>
                </select>
              </div>
            `
            }
            <div class="form-group">
              <label class="form-label">${t('loadTimeout', this.currentLang)}</label>
              <input type="number" id="load-timeout-input" class="input-text mono" value="${this.config.timeoutMs}" min="500" max="30000" step="500" ${this.isRunning ? 'disabled' : ''} />
            </div>
          </div>

          <!-- Collapsible Headers & Body -->
          <details ${this.isConfigOpen ? 'open' : ''} style="margin-top: 6px; cursor: pointer;" id="load-advanced-details">
            <summary style="font-size: 11px; color: var(--vscode-descriptionForeground); font-weight: 500;">
              ${t('options', this.currentLang)} (${t('loadHeaders', this.currentLang)} / ${t('loadBody', this.currentLang)})
            </summary>
            <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
              <div class="form-group">
                <label class="form-label">${t('loadHeaders', this.currentLang)} (JSON key-value):</label>
                <textarea id="load-headers-input" class="input-textarea mono" placeholder='{"Authorization": "Bearer ...", "X-Custom": "val"}' style="min-height: 50px;" ${this.isRunning ? 'disabled' : ''}>${this.config.headers}</textarea>
              </div>
              ${
                ['POST', 'PUT', 'PATCH'].includes(this.config.method)
                  ? `
                <div class="form-group">
                  <label class="form-label">${t('loadBody', this.currentLang)}:</label>
                  <textarea id="load-body-input" class="input-textarea mono" style="min-height: 65px;" ${this.isRunning ? 'disabled' : ''}>${this.config.body}</textarea>
                </div>
              `
                  : ''
              }
            </div>
          </details>

          <!-- Action Buttons Bar -->
          <div class="load-actions-bar" style="margin-top: 10px;">
            <button id="btn-toggle-benchmark" class="btn ${this.isRunning ? 'btn-danger pulse-action' : ''}" style="flex: 1; min-height: 30px;">
              ${this.isRunning ? `${ICONS.stop} ${t('loadAbort', this.currentLang)}` : `${ICONS.speed} ${t('loadStart', this.currentLang)}`}
            </button>
            <button id="btn-reset-benchmark" class="btn btn-secondary btn-icon-only" title="${t('loadReset', this.currentLang)}" ${this.isRunning ? 'disabled' : ''}>
              ${ICONS.sync}
            </button>
          </div>
        </div>

        <!-- Real-Time Telemetry Dashboard -->
        <div id="load-dashboard-area"></div>
      </div>
    `;

    this.attachListeners();
    this.updateDashboardMetrics();
  }

  private attachListeners() {
    const methodSelect = this.container.querySelector('#load-method-select') as HTMLSelectElement;
    methodSelect?.addEventListener('change', () => {
      this.config.method = methodSelect.value as any;
      this.render();
    });

    const urlInput = this.container.querySelector('#load-url-input') as HTMLInputElement;
    urlInput?.addEventListener('input', () => {
      this.config.url = urlInput.value.trim();
    });

    const slider = this.container.querySelector('#load-concurrency-slider') as HTMLInputElement;
    const label = this.container.querySelector('#load-concurrency-val');
    slider?.addEventListener('input', () => {
      this.config.concurrency = parseInt(slider.value, 10);
      if (label) label.textContent = String(this.config.concurrency);
    });

    this.container.querySelector('#btn-mode-duration')?.addEventListener('click', () => {
      this.config.mode = 'duration';
      this.render();
    });

    this.container.querySelector('#btn-mode-requests')?.addEventListener('click', () => {
      this.config.mode = 'requests';
      this.render();
    });

    const durationSelect = this.container.querySelector('#load-duration-select') as HTMLSelectElement;
    durationSelect?.addEventListener('change', () => {
      this.config.durationSeconds = parseInt(durationSelect.value, 10);
    });

    const totalSelect = this.container.querySelector('#load-total-select') as HTMLSelectElement;
    totalSelect?.addEventListener('change', () => {
      this.config.totalRequests = parseInt(totalSelect.value, 10);
    });

    const timeoutInput = this.container.querySelector('#load-timeout-input') as HTMLInputElement;
    timeoutInput?.addEventListener('input', () => {
      this.config.timeoutMs = parseInt(timeoutInput.value, 10) || 5000;
    });

    const details = this.container.querySelector('#load-advanced-details');
    details?.addEventListener('toggle', () => {
      this.isConfigOpen = (details as HTMLDetailsElement).open;
    });

    const headersInput = this.container.querySelector('#load-headers-input') as HTMLTextAreaElement;
    headersInput?.addEventListener('input', () => {
      this.config.headers = headersInput.value;
    });

    const bodyInput = this.container.querySelector('#load-body-input') as HTMLTextAreaElement;
    bodyInput?.addEventListener('input', () => {
      this.config.body = bodyInput.value;
    });

    // Start / Abort
    this.container.querySelector('#btn-toggle-benchmark')?.addEventListener('click', () => {
      if (this.isRunning) {
        this.onMessage({ type: 'loadTesterAbort' });
      } else {
        let parsedHeaders: Record<string, string> = {};
        if (this.config.headers.trim()) {
          try {
            parsedHeaders = JSON.parse(this.config.headers);
          } catch {}
        }

        this.isRunning = true;
        this.render();

        this.onMessage({
          type: 'loadTesterStart',
          config: {
            url: this.config.url,
            method: this.config.method,
            concurrency: this.config.concurrency,
            mode: this.config.mode,
            durationSeconds: this.config.durationSeconds,
            totalRequests: this.config.totalRequests,
            timeoutMs: this.config.timeoutMs,
            keepAlive: this.config.keepAlive,
            headers: parsedHeaders,
            body: ['POST', 'PUT', 'PATCH'].includes(this.config.method) ? this.config.body : undefined
          }
        });
      }
    });

    // Reset Metrics
    this.container.querySelector('#btn-reset-benchmark')?.addEventListener('click', () => {
      this.lastSnapshot = null;
      this.updateDashboardMetrics();
    });
  }

  private updateDashboardMetrics() {
    const area = this.container.querySelector('#load-dashboard-area');
    if (!area) return;

    if (!this.lastSnapshot && !this.isRunning) {
      area.innerHTML = `
        <div class="empty-state" style="padding: 24px 8px;">
          <span style="font-size: 24px; opacity: 0.3; display: block; margin-bottom: 6px;">${ICONS.speed}</span>
          ${t('loadIdle', this.currentLang)}
        </div>
      `;
      return;
    }

    const snap = this.lastSnapshot || {
      isRunning: this.isRunning,
      isCompleted: false,
      elapsedMs: 0,
      totalDurationMs: 0,
      progressPercent: 0,
      activeWorkers: 0,
      completedRequests: 0,
      rps: 0,
      minLatencyMs: 0,
      maxLatencyMs: 0,
      avgLatencyMs: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      successCount: 0,
      errorCount: 0,
      successRate: 100,
      statusCodes: {},
      buckets: [],
      recentErrors: []
    };

    const statusBadgeClass = snap.isRunning ? 'status-pill status-valid' : snap.isCompleted ? 'status-pill status-valid' : 'status-pill status-neutral';
    const statusText = snap.isRunning ? t('loadRunning', this.currentLang) : snap.isCompleted ? t('loadFinished', this.currentLang) : t('loadAborted', this.currentLang);

    area.innerHTML = `
      <div class="load-telemetry-container">
        <!-- Progress Bar & State Header -->
        <div class="load-status-bar-row">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="status-dot ${snap.isRunning ? 'dot-running' : 'dot-stopped'}"></span>
            <span class="load-status-label">${statusText}</span>
          </div>
          <span class="mono" style="font-size: 11px; color: var(--vscode-descriptionForeground);">
            ${(snap.elapsedMs / 1000).toFixed(1)}s elapsed
          </span>
        </div>

        <div class="sysmon-progress-track" style="margin-bottom: 10px;">
          <div class="sysmon-progress-bar" style="width: ${snap.progressPercent}%; background-color: var(--vscode-charts-blue, #388bfd);"></div>
        </div>

        <!-- 6 KPI Grid Cards -->
        <div class="load-kpi-grid">
          <!-- RPS Throughput -->
          <div class="load-kpi-card highlight-blue">
            <span class="kpi-label">${t('loadRps', this.currentLang)}</span>
            <span class="kpi-value mono" style="color: var(--vscode-charts-blue, #388bfd);">${snap.rps}</span>
            <span class="kpi-sub mono">${snap.completedRequests} reqs</span>
          </div>

          <!-- Average Latency -->
          <div class="load-kpi-card">
            <span class="kpi-label">${t('loadAvgLatency', this.currentLang)}</span>
            <span class="kpi-value mono">${snap.avgLatencyMs}<small style="font-size: 10px;">ms</small></span>
            <span class="kpi-sub mono">${t('loadMinMax', this.currentLang)}: ${snap.minLatencyMs}/${snap.maxLatencyMs}</span>
          </div>

          <!-- Median (P50) -->
          <div class="load-kpi-card">
            <span class="kpi-label">${t('loadP50', this.currentLang)}</span>
            <span class="kpi-value mono">${snap.p50LatencyMs}<small style="font-size: 10px;">ms</small></span>
            <span class="kpi-sub mono">50% under</span>
          </div>

          <!-- 95th Percentile -->
          <div class="load-kpi-card">
            <span class="kpi-label">${t('loadP95', this.currentLang)}</span>
            <span class="kpi-value mono" style="color: var(--vscode-charts-yellow, #d29922);">${snap.p95LatencyMs}<small style="font-size: 10px;">ms</small></span>
            <span class="kpi-sub mono">95% under</span>
          </div>

          <!-- 99th Percentile -->
          <div class="load-kpi-card">
            <span class="kpi-label">${t('loadP99', this.currentLang)}</span>
            <span class="kpi-value mono" style="color: var(--vscode-charts-red, #f85149);">${snap.p99LatencyMs}<small style="font-size: 10px;">ms</small></span>
            <span class="kpi-sub mono">Tail Latency</span>
          </div>

          <!-- Success Rate -->
          <div class="load-kpi-card">
            <span class="kpi-label">${t('loadSuccessRate', this.currentLang)}</span>
            <span class="kpi-value mono" style="color: ${snap.successRate > 98 ? 'var(--vscode-charts-green, #3fb950)' : 'var(--vscode-charts-red, #f85149)'};">
              ${snap.successRate}%
            </span>
            <span class="kpi-sub mono">${snap.successCount} OK / ${snap.errorCount} Err</span>
          </div>
        </div>

        <!-- Latency Distribution SVG Histogram -->
        <div class="mock-section-box" style="margin-top: 10px;">
          <div class="mock-section-header">
            <div class="mock-section-title">
              <span class="icon-wrap">${ICONS.chart}</span>
              <span>${t('loadLatencyDistribution', this.currentLang)}</span>
            </div>
            <button id="btn-export-load-report" class="btn btn-secondary" style="padding: 2px 8px; font-size: 10px;">
              ${ICONS.copy} ${t('loadExportReport', this.currentLang)}
            </button>
          </div>
          <div class="load-histogram-container">
            ${this.renderHistogramSvg(snap.buckets)}
          </div>
        </div>

        <!-- Status Codes Breakdown Table -->
        <div class="mock-section-box" style="margin-top: 8px;">
          <div class="mock-section-header">
            <div class="mock-section-title">
              <span class="icon-wrap">${ICONS.activity}</span>
              <span>${t('loadStatusCodes', this.currentLang)}</span>
            </div>
          </div>
          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Status / Error</th>
                  <th style="text-align: right;">Count</th>
                </tr>
              </thead>
              <tbody>
                ${
                  Object.keys(snap.statusCodes).length === 0
                    ? `<tr><td colspan="2" class="empty-state">No requests finished yet</td></tr>`
                    : Object.entries(snap.statusCodes)
                        .map(([code, count]) => {
                          const isOk = code.startsWith('2') || code.startsWith('3');
                          return `
                        <tr>
                          <td>
                            <span class="status-pill ${isOk ? 'status-valid' : 'status-expired'} mono">${code}</span>
                          </td>
                          <td style="text-align: right;"><span class="mono" style="font-weight: 600;">${count}</span></td>
                        </tr>
                      `;
                        })
                        .join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    area.querySelector('#btn-export-load-report')?.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      this.onMessage({ type: 'loadTesterExportReport' });
      const orig = btn.innerHTML;
      btn.innerHTML = `${ICONS.check} ${t('copied', this.currentLang)}`;
      setTimeout(() => { btn.innerHTML = orig; }, 1400);
    });
  }

  private renderHistogramSvg(buckets: LatencyBucketData[]): string {
    if (!buckets || buckets.length === 0) {
      return `<div class="empty-state">No distribution data yet</div>`;
    }

    const svgHeight = 90;
    const barWidth = 38;
    const gap = 14;
    const totalWidth = buckets.length * (barWidth + gap);
    const maxPct = Math.max(...buckets.map((b) => b.percentage), 10);

    const bars = buckets
      .map((b, idx) => {
        const x = idx * (barWidth + gap) + 6;
        const normalizedHeight = Math.max(4, Math.round((b.percentage / maxPct) * (svgHeight - 28)));
        const y = svgHeight - 20 - normalizedHeight;

        let fill = 'var(--vscode-charts-blue, #388bfd)';
        if (b.minMs >= 300) fill = 'var(--vscode-charts-yellow, #d29922)';
        if (b.minMs >= 500) fill = 'var(--vscode-charts-red, #f85149)';

        return `
        <g class="histogram-bar-group">
          <text x="${x + barWidth / 2}" y="${y - 3}" font-size="9" fill="var(--vscode-descriptionForeground)" text-anchor="middle" font-family="monospace">${b.percentage}%</text>
          <rect x="${x}" y="${y}" width="${barWidth}" height="${normalizedHeight}" rx="2" fill="${fill}" />
          <text x="${x + barWidth / 2}" y="${svgHeight - 4}" font-size="8.5" fill="var(--vscode-foreground)" text-anchor="middle" font-family="monospace">${b.label}</text>
        </g>
      `;
      })
      .join('');

    return `
      <svg width="100%" height="${svgHeight}" viewBox="0 0 ${totalWidth + 12} ${svgHeight}" preserveAspectRatio="xMidYMid meet" style="overflow: visible;">
        ${bars}
      </svg>
    `;
  }
}
