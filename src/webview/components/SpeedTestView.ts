import { Language, t } from '../i18n';
import { ICONS } from '../icons';
import {
  SpeedTestEngine,
  SpeedTestProgress,
  SpeedTestResult,
  SpeedTestTelemetry,
  speedToLogFraction,
  speedToGaugeAngle
} from '../../utils/speedTestEngine';

export interface SpeedTestHistoryItem {
  id: string;
  timestamp: number;
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  jitterMs: number;
  colo: string;
  city: string;
  country: string;
}

export interface SpeedTestViewState {
  history: SpeedTestHistoryItem[];
  lastResult: SpeedTestResult | null;
}

export class SpeedTestView {
  private container: HTMLElement;
  private currentLang: Language;
  private onMessage: (msg: any) => void;

  private engine: SpeedTestEngine;
  private isTesting: boolean = false;
  private history: SpeedTestHistoryItem[] = [];
  private lastResult: SpeedTestResult | null = null;
  private isHistoryOpen: boolean = false;

  // Animation & 60fps gauge spring interpolation
  private targetSpeed: number = 0;
  private displayedSpeed: number = 0;
  private animFrameId: number | null = null;
  private currentPhase: string = 'idle';

  constructor(container: HTMLElement, currentLang: Language, onMessage: (msg: any) => void) {
    this.container = container;
    this.currentLang = currentLang;
    this.onMessage = onMessage;

    this.engine = new SpeedTestEngine({
      onProgress: (p) => this.handleProgress(p),
      onComplete: (res) => this.handleComplete(res),
      onError: (err) => this.handleError(err)
    });

    this.render();
    this.startInterpolationLoop();
  }

  public setLanguage(lang: Language) {
    this.currentLang = lang;
    this.render();
  }

  public getState(): SpeedTestViewState {
    return {
      history: this.history,
      lastResult: this.lastResult
    };
  }

  public restoreState(state: SpeedTestViewState) {
    if (state) {
      if (Array.isArray(state.history)) {
        this.history = state.history;
      }
      if (state.lastResult) {
        this.lastResult = state.lastResult;
      }
      this.render();
    }
  }

  private startInterpolationLoop() {
    const loop = () => {
      // Smooth spring interpolation toward target speed (damping factor 0.15)
      const diff = this.targetSpeed - this.displayedSpeed;
      if (Math.abs(diff) > 0.02) {
        this.displayedSpeed += diff * 0.15;
      } else {
        this.displayedSpeed = this.targetSpeed;
      }

      this.updateGaugeVisuals(this.displayedSpeed);
      this.animFrameId = requestAnimationFrame(loop);
    };

    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.animFrameId = requestAnimationFrame(loop);
  }

  private handleProgress(p: SpeedTestProgress) {
    this.currentPhase = p.phase;
    this.targetSpeed = p.currentSpeedMbps;

    // Update Phase Badge & Status Text
    const statusTextEl = document.getElementById('speed-status-text');
    const phaseBadgeEl = document.getElementById('speed-phase-badge');
    const containerEl = document.getElementById('speedtest-card');

    if (containerEl) {
      containerEl.className = `speedtest-card phase-${p.phase}`;
    }

    if (phaseBadgeEl) {
      phaseBadgeEl.textContent = p.phase.toUpperCase();
      phaseBadgeEl.className = `speed-phase-badge badge-${p.phase}`;
    }

    if (statusTextEl) {
      if (p.phase === 'ping') {
        statusTextEl.textContent = t('speedTestStatusPing', this.currentLang);
      } else if (p.phase === 'download') {
        statusTextEl.textContent = t('speedTestStatusDownload', this.currentLang);
      } else if (p.phase === 'upload') {
        statusTextEl.textContent = t('speedTestStatusUpload', this.currentLang);
      } else if (p.phase === 'completed') {
        statusTextEl.textContent = t('speedTestStatusComplete', this.currentLang);
      } else if (p.phase === 'aborted') {
        statusTextEl.textContent = t('speedTestStatusAborted', this.currentLang);
      } else if (p.phase === 'error') {
        statusTextEl.textContent = p.error || t('speedTestStatusError', this.currentLang);
      }
    }

    // Update Progress Bar
    const progressFill = document.getElementById('speed-progress-fill');
    if (progressFill) {
      progressFill.style.width = `${p.progressPercent}%`;
    }

    // Update Telemetry Bar
    if (p.telemetry) {
      this.updateTelemetryPill(p.telemetry);
    }

    // Update Metric Cards
    const valDownload = document.getElementById('metric-val-download');
    const valUpload = document.getElementById('metric-val-upload');
    const valPing = document.getElementById('metric-val-ping');
    const valJitter = document.getElementById('metric-val-jitter');

    if (valPing) valPing.textContent = p.pingMs > 0 ? p.pingMs.toFixed(1) : '--';
    if (valJitter) valJitter.textContent = p.jitterMs > 0 ? p.jitterMs.toFixed(1) : '--';
    if (valDownload && p.downloadMbps > 0) valDownload.textContent = p.downloadMbps.toFixed(2);
    if (valUpload && p.uploadMbps > 0) valUpload.textContent = p.uploadMbps.toFixed(2);

    // Update Sparkline Waveform
    this.renderSparkline(p.waveform);

    // Update Primary Button State
    const actionBtn = document.getElementById('btn-speed-action') as HTMLButtonElement;
    if (actionBtn && this.isTesting) {
      actionBtn.innerHTML = `${ICONS.stop} <span>${t('speedTestCancel', this.currentLang)}</span>`;
      actionBtn.className = 'btn btn-danger btn-speed-action is-cancel';
    }
  }

  private handleComplete(res: SpeedTestResult) {
    this.isTesting = false;
    this.currentPhase = 'completed';
    this.lastResult = res;
    this.targetSpeed = 0;

    // Add to history (capped at 10 items)
    const historyItem: SpeedTestHistoryItem = {
      id: res.id,
      timestamp: res.timestamp,
      downloadMbps: res.downloadMbps,
      uploadMbps: res.uploadMbps,
      pingMs: res.pingMs,
      jitterMs: res.jitterMs,
      colo: res.telemetry.colo,
      city: res.telemetry.coloCity,
      country: res.telemetry.coloCountry
    };

    this.history.unshift(historyItem);
    if (this.history.length > 10) {
      this.history.pop();
    }

    // Update action button
    const actionBtn = document.getElementById('btn-speed-action') as HTMLButtonElement;
    if (actionBtn) {
      actionBtn.innerHTML = `${ICONS.refresh} <span>${t('speedTestAgain', this.currentLang)}</span>`;
      actionBtn.className = 'btn btn-primary btn-speed-action is-again';
    }

    // Update history drawer if open
    this.renderHistoryList();
  }

  private handleError(err: string) {
    this.isTesting = false;
    this.currentPhase = 'error';
    this.targetSpeed = 0;

    const actionBtn = document.getElementById('btn-speed-action') as HTMLButtonElement;
    if (actionBtn) {
      actionBtn.innerHTML = `${ICONS.play} <span>${t('speedTestAgain', this.currentLang)}</span>`;
      actionBtn.className = 'btn btn-primary btn-speed-action';
    }
  }

  private updateTelemetryPill(telem: SpeedTestTelemetry) {
    const coloEl = document.getElementById('telemetry-colo');
    const ipEl = document.getElementById('telemetry-ip');
    const protoEl = document.getElementById('telemetry-proto');

    if (coloEl) {
      const city = telem.coloCity || telem.colo;
      coloEl.textContent = `${telem.colo} (${city})`;
      coloEl.title = `${telem.colo} - ${city}, ${telem.coloCountry}`;
    }
    if (ipEl) {
      ipEl.textContent = telem.ip;
    }
    if (protoEl) {
      protoEl.textContent = telem.protocol;
    }
  }

  private updateGaugeVisuals(speedMbps: number) {
    const digitalReadout = document.getElementById('speed-digital-value');
    if (digitalReadout) {
      digitalReadout.textContent = speedMbps.toFixed(2);
    }

    // SVG arc progress stroke calculation
    // R = 95, circumference C = 2 * PI * 95 = 596.90
    // Sweep = 240 deg => Arc length = 596.90 * (240 / 360) = 397.94
    const R = 95;
    const arcLength = 2 * Math.PI * R * (240 / 360); // 397.94
    const fraction = speedToLogFraction(speedMbps, 1000);
    const strokeOffset = arcLength * (1 - fraction);

    const progressPath = document.getElementById('gauge-progress-path') as unknown as SVGPathElement;
    if (progressPath) {
      progressPath.style.strokeDashoffset = `${strokeOffset}`;
      // Dynamic phase color
      if (this.currentPhase === 'upload') {
        progressPath.style.stroke = 'url(#upload-arc-gradient)';
      } else {
        progressPath.style.stroke = 'url(#download-arc-gradient)';
      }
    }

    // Needle rotation calculation
    const angle = speedToGaugeAngle(speedMbps, 150, 240);
    const needleGroup = document.getElementById('gauge-needle-group');
    if (needleGroup) {
      needleGroup.setAttribute('transform', `rotate(${angle} 140 135)`);
    }

    // Leading glowing bead position
    const rad = (angle * Math.PI) / 180;
    const beadX = 140 + R * Math.cos(rad);
    const beadY = 135 + R * Math.sin(rad);
    const beadEl = document.getElementById('gauge-leading-bead');
    if (beadEl) {
      beadEl.setAttribute('cx', `${beadX}`);
      beadEl.setAttribute('cy', `${beadY}`);
      beadEl.style.opacity = fraction > 0.005 ? '1' : '0';
      beadEl.style.fill = this.currentPhase === 'upload' ? '#f59e0b' : '#10b981';
    }
  }

  private renderSparkline(waveform: number[]) {
    const sparkPath = document.getElementById('sparkline-path');
    const sparkArea = document.getElementById('sparkline-area');
    if (!sparkPath || !sparkArea) return;

    if (!waveform || waveform.length < 2) {
      sparkPath.setAttribute('d', '');
      sparkArea.setAttribute('d', '');
      return;
    }

    const width = 320;
    const height = 48;
    const maxVal = Math.max(10, ...waveform) * 1.15;
    const stepX = width / (waveform.length - 1);

    const points = waveform.map((val, idx) => {
      const x = idx * stepX;
      const y = height - (val / maxVal) * (height - 6);
      return { x, y };
    });

    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
    }

    sparkPath.setAttribute('d', d);
    sparkArea.setAttribute('d', `${d} L ${width} ${height} L 0 ${height} Z`);
  }

  private toggleTesting() {
    if (this.isTesting) {
      this.engine.abort();
      this.isTesting = false;
      this.currentPhase = 'aborted';
      this.targetSpeed = 0;

      const actionBtn = document.getElementById('btn-speed-action') as HTMLButtonElement;
      if (actionBtn) {
        actionBtn.innerHTML = `${ICONS.play} <span>${t('speedTestStart', this.currentLang)}</span>`;
        actionBtn.className = 'btn btn-primary btn-speed-action';
      }
    } else {
      this.isTesting = true;
      this.currentPhase = 'ping';
      this.targetSpeed = 0;
      this.displayedSpeed = 0;

      const actionBtn = document.getElementById('btn-speed-action') as HTMLButtonElement;
      if (actionBtn) {
        actionBtn.innerHTML = `${ICONS.stop} <span>${t('speedTestCancel', this.currentLang)}</span>`;
        actionBtn.className = 'btn btn-danger btn-speed-action is-cancel';
      }

      this.engine.start();
    }
  }

  private renderHistoryList() {
    const listContainer = document.getElementById('speed-history-list');
    if (!listContainer) return;

    if (this.history.length === 0) {
      listContainer.innerHTML = `
        <div class="speed-empty-history">
          ${ICONS.history}
          <span>${t('speedTestNoHistory', this.currentLang)}</span>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = this.history
      .map((item, idx) => {
        const d = new Date(item.timestamp);
        const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
        return `
          <div class="speed-history-row" key="${item.id}">
            <div class="history-col-time">
              <span class="hist-time">${timeStr}</span>
              <span class="hist-date">${dateStr}</span>
            </div>
            <div class="history-col-server">
              <span class="hist-colo-badge">${item.colo}</span>
              <span class="hist-city">${item.city}</span>
            </div>
            <div class="history-col-speed">
              <div class="hist-metric-mini hist-down" title="Download">
                ${ICONS.download}
                <span>${item.downloadMbps.toFixed(1)} <small>Mbps</small></span>
              </div>
              <div class="hist-metric-mini hist-up" title="Upload">
                ${ICONS.upload}
                <span>${item.uploadMbps.toFixed(1)} <small>Mbps</small></span>
              </div>
            </div>
            <div class="history-col-latency">
              <span class="hist-ping">${item.pingMs.toFixed(0)} <small>ms</small></span>
              <span class="hist-jitter">±${item.jitterMs.toFixed(1)}</span>
            </div>
          </div>
        `;
      })
      .join('');
  }

  private generateGaugeTicksSvg(): string {
    const ticks = [0, 5, 10, 25, 50, 100, 250, 500, 1000];
    const cx = 140;
    const cy = 135;
    const R = 95;

    return ticks
      .map((val) => {
        const angle = speedToGaugeAngle(val, 150, 240);
        const rad = (angle * Math.PI) / 180;

        // Tick line
        const rInner = R - 7;
        const rOuter = R + 4;
        const x1 = (cx + rInner * Math.cos(rad)).toFixed(1);
        const y1 = (cy + rInner * Math.sin(rad)).toFixed(1);
        const x2 = (cx + rOuter * Math.cos(rad)).toFixed(1);
        const y2 = (cy + rOuter * Math.sin(rad)).toFixed(1);

        // Label position
        const rLabel = R - 18;
        const lx = (cx + rLabel * Math.cos(rad)).toFixed(1);
        const ly = (cy + rLabel * Math.sin(rad)).toFixed(1);

        const labelText = val >= 1000 ? '1k' : `${val}`;

        return `
          <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="gauge-tick-line" />
          <text x="${lx}" y="${ly}" class="gauge-tick-label" text-anchor="middle" dominant-baseline="central">${labelText}</text>
        `;
      })
      .join('');
  }

  public render() {
    const isFa = this.currentLang === 'fa';
    const R = 95;
    const arcLength = 2 * Math.PI * R * (240 / 360); // 397.94
    const circumference = 2 * Math.PI * R; // 596.90

    // Arc start (150 deg) and end (390 deg) points for background track
    const radStart = (150 * Math.PI) / 180;
    const radEnd = (390 * Math.PI) / 180;
    const xStart = (140 + R * Math.cos(radStart)).toFixed(2);
    const yStart = (135 + R * Math.sin(radStart)).toFixed(2);
    const xEnd = (140 + R * Math.cos(radEnd)).toFixed(2);
    const yEnd = (135 + R * Math.sin(radEnd)).toFixed(2);

    // SVG arc path from 150deg to 390deg (240 deg clockwise sweep)
    const arcD = `M ${xStart} ${yStart} A ${R} ${R} 0 1 1 ${xEnd} ${yEnd}`;

    this.container.innerHTML = `
      <div class="speedtest-wrapper" dir="${isFa ? 'rtl' : 'ltr'}">
        <!-- Main Speed Test Card (Obsidian Glassmorphism) -->
        <div class="speedtest-card phase-${this.currentPhase}" id="speedtest-card">
          
          <!-- Top Telemetry & Edge Server Pill -->
          <div class="speed-telemetry-pill">
            <div class="telem-item telem-server">
              <span class="telem-dot pulse-emerald"></span>
              <span class="telem-label">${t('speedTestServer', this.currentLang)}:</span>
              <strong id="telemetry-colo" class="telem-val">
                ${this.lastResult ? `${this.lastResult.telemetry.colo} (${this.lastResult.telemetry.coloCity})` : 'Cloudflare Edge'}
              </strong>
            </div>
            <div class="telem-divider"></div>
            <div class="telem-item telem-ip">
              <span class="telem-label">${t('speedTestClientIp', this.currentLang)}:</span>
              <strong id="telemetry-ip" class="telem-val">
                ${this.lastResult ? this.lastResult.telemetry.ip : '127.0.0.1'}
              </strong>
            </div>
            <div class="telem-divider"></div>
            <div class="telem-item telem-proto">
              <span class="telem-label">${t('speedTestProtocol', this.currentLang)}:</span>
              <span id="telemetry-proto" class="telem-proto-badge">
                ${this.lastResult ? this.lastResult.telemetry.protocol : 'HTTP/2'}
              </span>
            </div>
          </div>

          <!-- Central Gauge & Visual Readout Arena -->
          <div class="speed-gauge-stage">
            <svg class="speed-gauge-svg" viewBox="0 0 280 220" width="100%" height="220">
              <defs>
                <!-- Gradients for smooth phase transitions -->
                <linearGradient id="download-arc-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#06b6d4" />
                  <stop offset="50%" stop-color="#3b82f6" />
                  <stop offset="100%" stop-color="#10b981" />
                </linearGradient>

                <linearGradient id="upload-arc-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#8b5cf6" />
                  <stop offset="50%" stop-color="#ec4899" />
                  <stop offset="100%" stop-color="#f59e0b" />
                </linearGradient>

                <linearGradient id="sparkline-fill-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="rgba(6, 182, 212, 0.35)" />
                  <stop offset="100%" stop-color="rgba(6, 182, 212, 0.0)" />
                </linearGradient>

                <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              <!-- Outer Gauge Track Arc (Obsidian glass) -->
              <path d="${arcD}" class="gauge-track-arc" />

              <!-- Gauge Scale Ticks & Log Labels -->
              <g class="gauge-ticks-group">
                ${this.generateGaugeTicksSvg()}
              </g>

              <!-- Dynamic Animated Progress Arc -->
              <path id="gauge-progress-path" 
                    d="${arcD}" 
                    class="gauge-progress-arc" 
                    style="stroke-dasharray: ${arcLength.toFixed(1)} ${circumference.toFixed(1)}; stroke-dashoffset: ${arcLength.toFixed(1)};" 
                    filter="url(#gauge-glow)" />

              <!-- Leading Glowing Arc Bead -->
              <circle id="gauge-leading-bead" cx="140" cy="135" r="5" class="gauge-leading-bead" filter="url(#gauge-glow)" />

              <!-- Spring Animated Needle -->
              <g id="gauge-needle-group" transform="rotate(150 140 135)" class="gauge-needle-group">
                <line x1="140" y1="135" x2="225" y2="135" class="gauge-needle-stem" />
                <polygon points="228,135 212,131 212,139" class="gauge-needle-tip" />
                <circle cx="140" cy="135" r="8" class="gauge-needle-pivot-outer" />
                <circle cx="140" cy="135" r="4" class="gauge-needle-pivot-inner" />
              </g>
            </svg>

            <!-- Center Digital Tabular Readout -->
            <div class="speed-center-readout">
              <span class="speed-phase-badge" id="speed-phase-badge">READY</span>
              <div class="speed-digital-number-wrap">
                <span class="speed-digital-value" id="speed-digital-value">0.00</span>
                <span class="speed-unit-pill">${t('speedTestMbps', this.currentLang)}</span>
              </div>
              <div class="speed-status-subtext" id="speed-status-text">
                ${t('speedTestStatusIdle', this.currentLang)}
              </div>
            </div>
          </div>

          <!-- Overall Linear Progress Bar -->
          <div class="speed-progress-track">
            <div class="speed-progress-fill" id="speed-progress-fill" style="width: 0%;"></div>
          </div>

          <!-- Real-Time Waveform Sparkline Box -->
          <div class="speed-waveform-card">
            <div class="waveform-header">
              <span class="waveform-title">${t('speedTestWaveform', this.currentLang)}</span>
              <span class="waveform-live-dot"></span>
            </div>
            <svg class="speed-sparkline-svg" viewBox="0 0 320 48" width="100%" height="48" preserveAspectRatio="none">
              <path id="sparkline-area" class="sparkline-area-fill" fill="url(#sparkline-fill-grad)" d="" />
              <path id="sparkline-path" class="sparkline-stroke" d="" />
            </svg>
          </div>

          <!-- 4-Metric Telemetry Grid -->
          <div class="speed-telemetry-grid">
            <!-- 1. Download -->
            <div class="speed-metric-card metric-download" id="card-metric-download">
              <div class="metric-top">
                <div class="metric-icon-box cyan-glow">${ICONS.download}</div>
                <span class="metric-label">${t('speedTestDownload', this.currentLang)}</span>
              </div>
              <div class="metric-body">
                <span class="metric-val" id="metric-val-download">
                  ${this.lastResult ? this.lastResult.downloadMbps.toFixed(2) : '--'}
                </span>
                <span class="metric-unit">${t('speedTestMbps', this.currentLang)}</span>
              </div>
              <div class="metric-accent-line down-line"></div>
            </div>

            <!-- 2. Upload -->
            <div class="speed-metric-card metric-upload" id="card-metric-upload">
              <div class="metric-top">
                <div class="metric-icon-box violet-glow">${ICONS.upload}</div>
                <span class="metric-label">${t('speedTestUpload', this.currentLang)}</span>
              </div>
              <div class="metric-body">
                <span class="metric-val" id="metric-val-upload">
                  ${this.lastResult ? this.lastResult.uploadMbps.toFixed(2) : '--'}
                </span>
                <span class="metric-unit">${t('speedTestMbps', this.currentLang)}</span>
              </div>
              <div class="metric-accent-line up-line"></div>
            </div>

            <!-- 3. Ping Latency -->
            <div class="speed-metric-card metric-ping" id="card-metric-ping">
              <div class="metric-top">
                <div class="metric-icon-box emerald-glow">${ICONS.activity}</div>
                <span class="metric-label">${t('speedTestPing', this.currentLang)}</span>
              </div>
              <div class="metric-body">
                <span class="metric-val" id="metric-val-ping">
                  ${this.lastResult ? this.lastResult.pingMs.toFixed(1) : '--'}
                </span>
                <span class="metric-unit">${t('speedTestMs', this.currentLang)}</span>
              </div>
              <div class="metric-accent-line ping-line"></div>
            </div>

            <!-- 4. Latency Jitter -->
            <div class="speed-metric-card metric-jitter" id="card-metric-jitter">
              <div class="metric-top">
                <div class="metric-icon-box amber-glow">${ICONS.pulse}</div>
                <span class="metric-label">${t('speedTestJitter', this.currentLang)}</span>
              </div>
              <div class="metric-body">
                <span class="metric-val" id="metric-val-jitter">
                  ${this.lastResult ? this.lastResult.jitterMs.toFixed(1) : '--'}
                </span>
                <span class="metric-unit">${t('speedTestMs', this.currentLang)}</span>
              </div>
              <div class="metric-accent-line jitter-line"></div>
            </div>
          </div>

          <!-- Primary Tactile Action Control -->
          <div class="speed-action-area">
            <button id="btn-speed-action" class="btn btn-primary btn-speed-action">
              ${this.isTesting ? ICONS.stop : ICONS.play}
              <span>${this.isTesting ? t('speedTestCancel', this.currentLang) : (this.lastResult ? t('speedTestAgain', this.currentLang) : t('speedTestStart', this.currentLang))}</span>
            </button>
          </div>
        </div>

        <!-- Collapsible Results History Drawer -->
        <div class="speed-history-drawer">
          <div class="speed-history-header" id="btn-toggle-history">
            <div class="history-header-title">
              ${ICONS.history}
              <span>${t('speedTestHistory', this.currentLang)}</span>
              <span class="history-count-badge">${this.history.length}</span>
            </div>
            <div class="history-header-actions">
              ${
                this.history.length > 0
                  ? `<button id="btn-clear-speed-history" class="btn-clear-history-icon" title="${t('speedTestClearHistory', this.currentLang)}">${ICONS.trash}</button>`
                  : ''
              }
              <span class="history-chevron-icon ${this.isHistoryOpen ? 'open' : ''}">${ICONS.chevronDown}</span>
            </div>
          </div>
          <div class="speed-history-content ${this.isHistoryOpen ? 'open' : ''}" id="speed-history-content">
            <div class="speed-history-list" id="speed-history-list"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.renderHistoryList();
    if (this.lastResult) {
      this.updateGaugeVisuals(this.lastResult.downloadMbps);
    }
  }

  private bindEvents() {
    // Primary Action Button
    const actionBtn = document.getElementById('btn-speed-action');
    actionBtn?.addEventListener('click', () => {
      this.toggleTesting();
    });

    // History Toggle
    const historyHeader = document.getElementById('btn-toggle-history');
    historyHeader?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('#btn-clear-speed-history')) return;
      this.isHistoryOpen = !this.isHistoryOpen;
      const content = document.getElementById('speed-history-content');
      const chevron = document.querySelector('.history-chevron-icon');
      if (content) content.classList.toggle('open', this.isHistoryOpen);
      if (chevron) chevron.classList.toggle('open', this.isHistoryOpen);
    });

    // Clear History Button
    const clearBtn = document.getElementById('btn-clear-speed-history');
    clearBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.history = [];
      this.render();
    });
  }
}
