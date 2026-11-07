import { Language, t } from '../i18n';
import { ICONS } from '../icons';
import { DnsProvider, ConnectivityTarget, TracerouteHop } from '../../services/dnsRadarService';

export class DnsRadarView {
  private container: HTMLElement;
  private currentLang: Language;
  private onMessage: (msg: any) => void;

  // Active sub-tab: 'benchmark' | 'matrix' | 'registry' | 'traceroute'
  private activeSubTab: string = 'benchmark';

  // State
  private providers: DnsProvider[] = [];
  private isBenchmarking: boolean = false;
  private testDomain: string = 'google.com';
  private showCustomForm: boolean = false;
  private statusMessage: string = '';

  // Registry state
  private currentRegistry: string = 'https://registry.npmjs.org/';
  private isSwitchingRegistry: boolean = false;

  // Connectivity matrix state
  private targets: ConnectivityTarget[] = [];
  private isProbingMatrix: boolean = false;

  // Traceroute state
  private traceHost: string = '1.1.1.1';
  private isTracing: boolean = false;
  private hops: TracerouteHop[] = [];

  constructor(container: HTMLElement, currentLang: Language, onMessage: (msg: any) => void) {
    this.container = container;
    this.currentLang = currentLang;
    this.onMessage = onMessage;
    this.render();

    // Initial data requests
    this.onMessage({ command: 'getDnsProviders' });
    this.onMessage({ command: 'getNpmRegistry' });
    this.onMessage({ command: 'getConnectivityTargets' });
  }

  public setLanguage(lang: Language) {
    this.currentLang = lang;
    this.render();
  }

  public setProviders(providers: DnsProvider[]) {
    this.providers = providers;
    this.isBenchmarking = false;
    this.render();
  }

  public setBenchmarking(benchmarking: boolean) {
    this.isBenchmarking = benchmarking;
    this.render();
  }

  public setRegistry(registry: string) {
    this.currentRegistry = registry;
    this.isSwitchingRegistry = false;
    this.render();
  }

  public setConnectivityTargets(targets: ConnectivityTarget[]) {
    this.targets = targets;
    this.isProbingMatrix = false;
    this.render();
  }

  public setTargetResult(target: ConnectivityTarget) {
    const idx = this.targets.findIndex(t => t.id === target.id);
    if (idx !== -1) {
      this.targets[idx] = target;
      this.render();
    }
  }

  public setProbingMatrix(probing: boolean) {
    this.isProbingMatrix = probing;
    this.render();
  }

  public addTracerouteHop(hop: TracerouteHop) {
    // Avoid duplicate hops
    const idx = this.hops.findIndex(h => h.hop === hop.hop);
    if (idx !== -1) {
      this.hops[idx] = hop;
    } else {
      this.hops.push(hop);
    }
    this.render();
  }

  public onTracerouteComplete(code: number) {
    this.isTracing = false;
    this.render();
  }

  public showNotice(msg: string) {
    this.statusMessage = msg;
    const alertEl = this.container.querySelector('.dns-status-alert');
    if (alertEl) {
      alertEl.textContent = msg;
      alertEl.classList.add('visible');
      setTimeout(() => {
        alertEl.classList.remove('visible');
      }, 3500);
    } else {
      this.render();
    }
  }

  public getState() {
    return {
      activeSubTab: this.activeSubTab,
      testDomain: this.testDomain,
      traceHost: this.traceHost
    };
  }

  public restoreState(state: any) {
    if (!state) return;
    if (state.activeSubTab) this.activeSubTab = state.activeSubTab;
    if (state.testDomain) this.testDomain = state.testDomain;
    if (state.traceHost) this.traceHost = state.traceHost;
    this.render();
  }

  private render() {
    const isRtl = this.currentLang === 'fa';

    this.container.innerHTML = `
      <div class="dns-radar-view" dir="${isRtl ? 'rtl' : 'ltr'}">
        <div class="deck-hero-banner">
          <div class="deck-hero-icon">${ICONS.radar}</div>
          <div class="deck-hero-content">
            <h3 class="deck-hero-title">${t('dnsRadarTitle', this.currentLang)}</h3>
            <p class="deck-hero-desc">${t('dnsRadarDesc', this.currentLang)}</p>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="css-subtabs-nav">
          <button class="css-subtab-btn ${this.activeSubTab === 'benchmark' ? 'active' : ''}" data-tab="benchmark">
            ${ICONS.speed} <span>${t('dnsSectionBenchmark', this.currentLang)}</span>
          </button>
          <button class="css-subtab-btn ${this.activeSubTab === 'matrix' ? 'active' : ''}" data-tab="matrix">
            ${ICONS.shieldCheck} <span>${t('dnsSectionMatrix', this.currentLang)}</span>
          </button>
          <button class="css-subtab-btn ${this.activeSubTab === 'registry' ? 'active' : ''}" data-tab="registry">
            ${ICONS.box} <span>${t('dnsSectionRegistry', this.currentLang)}</span>
          </button>
          <button class="css-subtab-btn ${this.activeSubTab === 'traceroute' ? 'active' : ''}" data-tab="traceroute">
            ${ICONS.route} <span>${t('dnsSectionTraceroute', this.currentLang)}</span>
          </button>
        </div>

        ${this.statusMessage ? `
          <div class="dns-status-alert visible">${this.statusMessage}</div>
        ` : ''}

        <!-- Active Tab Content -->
        <div class="dns-tab-body">
          ${this.renderActiveTabContent()}
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderActiveTabContent(): string {
    switch (this.activeSubTab) {
      case 'benchmark': return this.renderBenchmarkTab();
      case 'matrix': return this.renderMatrixTab();
      case 'registry': return this.renderRegistryTab();
      case 'traceroute': return this.renderTracerouteTab();
      default: return this.renderBenchmarkTab();
    }
  }

  // ==========================================
  // TAB 1: DNS & Anti-Sanction Benchmarker
  // ==========================================
  private renderBenchmarkTab(): string {
    const isFa = this.currentLang === 'fa';
    const maxLatency = Math.max(...this.providers.map(p => p.latencyMs || 0), 250);

    return `
      <div class="card dns-card">
        <!-- Control Bar -->
        <div class="dns-controls-bar">
          <div class="dns-actions-main">
            <button id="dns-run-benchmark-btn" class="btn btn-primary btn-sm" ${this.isBenchmarking ? 'disabled' : ''}>
              ${ICONS.radar} <span>${this.isBenchmarking ? t('dnsBenchmarking', this.currentLang) : t('dnsRunBenchmark', this.currentLang)}</span>
            </button>
            <button id="dns-flush-cache-btn" class="btn btn-secondary btn-sm" title="${t('dnsFlushCache', this.currentLang)}">
              ${ICONS.broom} <span>${t('dnsFlushCache', this.currentLang)}</span>
            </button>
          </div>

          <div class="dns-domain-row mt-2">
            <label class="form-label-xs mb-0">Domain:</label>
            <select id="dns-test-domain-select" class="form-select form-input-xs flex-1">
              <option value="google.com" ${this.testDomain === 'google.com' ? 'selected' : ''}>google.com</option>
              <option value="github.com" ${this.testDomain === 'github.com' ? 'selected' : ''}>github.com</option>
              <option value="registry.npmjs.org" ${this.testDomain === 'registry.npmjs.org' ? 'selected' : ''}>registry.npmjs.org</option>
              <option value="docker.com" ${this.testDomain === 'docker.com' ? 'selected' : ''}>docker.com</option>
              <option value="openai.com" ${this.testDomain === 'openai.com' ? 'selected' : ''}>openai.com</option>
            </select>
            <button id="dns-toggle-custom-btn" class="btn btn-secondary btn-xs">
              ${ICONS.plus} <span>${t('dnsCustomAdd', this.currentLang)}</span>
            </button>
          </div>
        </div>

        <!-- Custom DNS Form (collapsible) -->
        ${this.showCustomForm ? `
          <div class="dns-custom-form-box mt-2">
            <div class="form-group mb-1">
              <input type="text" id="dns-custom-name-input" class="form-input form-input-xs" placeholder="${t('dnsCustomName', this.currentLang)}" />
            </div>
            <div class="dns-custom-inputs-row">
              <input type="text" id="dns-custom-p1-input" class="form-input form-input-xs flex-1" placeholder="${t('dnsCustomPrimary', this.currentLang)}" />
              <input type="text" id="dns-custom-p2-input" class="form-input form-input-xs flex-1" placeholder="${t('dnsCustomSecondary', this.currentLang)}" />
            </div>
            <div class="dns-custom-actions-row mt-1">
              <button id="dns-custom-save-btn" class="btn btn-primary btn-xs flex-1">${t('dnsCustomSave', this.currentLang)}</button>
              <button id="dns-custom-cancel-btn" class="btn btn-secondary btn-xs flex-1">${t('dnsCustomCancel', this.currentLang)}</button>
            </div>
          </div>
        ` : ''}

        <!-- Providers Leaderboard Grid -->
        <div class="dns-providers-list mt-3">
          ${this.providers.map(provider => {
            const displayName = isFa ? provider.nameFa : provider.name;
            const latency = provider.latencyMs;
            const pct = latency !== null ? Math.min(100, Math.round((latency / maxLatency) * 100)) : 100;

            let colorClass = 'bar-gray';
            let statusText = '—';
            if (provider.status === 'testing') {
              statusText = '...';
            } else if (latency !== null) {
              statusText = `${latency} ms`;
              if (latency < 80) colorClass = 'bar-fast';
              else if (latency < 200) colorClass = 'bar-medium';
              else colorClass = 'bar-slow';
            } else if (provider.status === 'timeout') {
              statusText = 'Timeout';
              colorClass = 'bar-timeout';
            }

            return `
              <div class="dns-provider-card ${provider.isWinner ? 'is-winner' : ''}" data-id="${provider.id}">
                <div class="dns-provider-header">
                  <div class="dns-provider-meta">
                    <span class="dns-provider-name">${displayName}</span>
                    <span class="dns-category-tag ${provider.category}">${provider.category}</span>
                    ${provider.isWinner ? `
                      <span class="dns-winner-badge">${ICONS.check} ${t('dnsFastestWinner', this.currentLang)}</span>
                    ` : ''}
                  </div>
                  <div class="dns-provider-latency ${colorClass}">
                    ${statusText}
                  </div>
                </div>

                <!-- Animated SVG Horizontal Latency Bar -->
                <div class="dns-progress-bar-bg">
                  <div class="dns-progress-bar-fill ${colorClass}" style="width: ${latency !== null ? pct : (provider.status === 'timeout' ? 100 : 0)}%"></div>
                </div>

                <div class="dns-provider-footer">
                  <span class="dns-ips-label" title="${provider.primary}${provider.secondary ? ' • ' + provider.secondary : ''}">
                    ${provider.primary}${provider.secondary ? ` • ${provider.secondary}` : ''}
                  </span>
                  <div class="dns-card-actions">
                    <button class="btn-icon dns-apply-btn" data-id="${provider.id}" title="${t('dnsApplyCommand', this.currentLang)}">
                      ${ICONS.copy}
                    </button>
                    ${provider.category === 'custom' ? `
                      <button class="btn-icon btn-icon-danger dns-delete-custom-btn" data-id="${provider.id}" title="${t('kill', this.currentLang)}">
                        ${ICONS.trash}
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // ==========================================
  // TAB 2: Developer Sanction & Health Matrix
  // ==========================================
  private renderMatrixTab(): string {
    return `
      <div class="card dns-card">
        <div class="dns-matrix-header-bar">
          <div class="dns-matrix-meta">
            <span class="font-bold">${t('dnsSectionMatrix', this.currentLang)}</span>
            <span class="text-muted text-xs">Real-time HTTP Sanction & Reachability Prober</span>
          </div>
          <button id="dns-probe-matrix-btn" class="btn btn-primary btn-sm" ${this.isProbingMatrix ? 'disabled' : ''}>
            ${ICONS.sync} <span>${this.isProbingMatrix ? t('dnsMatrixProbing', this.currentLang) : t('dnsMatrixCheckAll', this.currentLang)}</span>
          </button>
        </div>

        <div class="dns-matrix-grid mt-3">
          ${this.targets.map(target => {
            let statusBadge = '<span class="badge-status badge-pending">Pending</span>';
            let statusClass = 'border-pending';

            if (target.status === 'reachable') {
              statusBadge = `<span class="badge-status badge-reachable">${ICONS.check} ${t('dnsStatusReachable', this.currentLang)} (${target.latencyMs}ms)</span>`;
              statusClass = 'border-reachable';
            } else if (target.status === 'sanctioned') {
              statusBadge = `<span class="badge-status badge-sanctioned">${ICONS.shieldAlert} ${t('dnsStatusSanctioned', this.currentLang)} (${target.httpStatus})</span>`;
              statusClass = 'border-sanctioned';
            } else if (target.status === 'blocked' || target.status === 'timeout') {
              statusBadge = `<span class="badge-status badge-blocked">${ICONS.clear} ${t('dnsStatusBlocked', this.currentLang)}</span>`;
              statusClass = 'border-blocked';
            }

            return `
              <div class="dns-target-card ${statusClass}">
                <div class="dns-target-header">
                  <div class="dns-target-title-box">
                    <span class="dns-target-icon">${this.getServiceIcon(target.iconName)}</span>
                    <span class="dns-target-name">${target.name}</span>
                  </div>
                  ${statusBadge}
                </div>
                <div class="dns-target-url-line" title="${target.url}">
                  ${target.url}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // ==========================================
  // TAB 3: Developer Registry Switcher
  // ==========================================
  private renderRegistryTab(): string {
    const isOfficial = this.currentRegistry.includes('registry.npmjs.org');
    const isMirror = this.currentRegistry.includes('npmmirror.com');

    return `
      <div class="card dns-card">
        <div class="dns-registry-header">
          <div class="dns-registry-meta">
            <span class="font-bold">${t('dnsSectionRegistry', this.currentLang)}</span>
            <span class="text-muted text-xs">${t('dnsNpmRegistryLabel', this.currentLang)}</span>
          </div>
          <button id="dns-refresh-reg-btn" class="btn-icon" title="${t('refresh', this.currentLang)}">
            ${ICONS.sync}
          </button>
        </div>

        <div class="dns-active-reg-card mt-2">
          <code class="dns-active-reg-url">${this.currentRegistry}</code>
          <span class="badge-status ${isMirror ? 'badge-reachable' : 'badge-pending'}">
            ${isMirror ? 'Mirror Active' : 'Official Active'}
          </span>
        </div>

        <div class="dns-registry-options-grid mt-3">
          <div class="dns-reg-card ${isOfficial ? 'active-reg' : ''}" data-url="https://registry.npmjs.org/">
            <div class="dns-reg-card-header">
              <span class="dns-reg-title">${t('dnsRegistryOfficial', this.currentLang)}</span>
              ${isOfficial ? `<span class="badge-active-dot">${ICONS.check}</span>` : ''}
            </div>
            <code class="dns-reg-code">https://registry.npmjs.org/</code>
            <p class="dns-reg-desc">Official global NPM registry directly from npmjs.com</p>
            <button class="btn btn-secondary btn-xs dns-switch-reg-btn mt-2" data-url="https://registry.npmjs.org/" ${isOfficial || this.isSwitchingRegistry ? 'disabled' : ''}>
              Switch to Official
            </button>
          </div>

          <div class="dns-reg-card ${isMirror ? 'active-reg' : ''}" data-url="https://registry.npmmirror.com/">
            <div class="dns-reg-card-header">
              <span class="dns-reg-title">${t('dnsRegistryMirror', this.currentLang)}</span>
              ${isMirror ? `<span class="badge-active-dot">${ICONS.check}</span>` : ''}
            </div>
            <code class="dns-reg-code">https://registry.npmmirror.com/</code>
            <p class="dns-reg-desc">Ultra-fast mirror to bypass download timeouts & connection blocks</p>
            <button class="btn btn-primary btn-xs dns-switch-reg-btn mt-2" data-url="https://registry.npmmirror.com/" ${isMirror || this.isSwitchingRegistry ? 'disabled' : ''}>
              Switch to Mirror
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // TAB 4: Visual MTR & Traceroute Radar
  // ==========================================
  private renderTracerouteTab(): string {
    return `
      <div class="card dns-card">
        <div class="dns-trace-header-bar">
          <div class="input-with-action flex-1">
            <span class="input-icon">${ICONS.route}</span>
            <input type="text" id="dns-trace-host-input" class="form-input form-input-sm" value="${this.traceHost}" placeholder="${t('dnsTraceTarget', this.currentLang)}" />
          </div>
          ${this.isTracing ? `
            <button id="dns-stop-trace-btn" class="btn btn-danger btn-sm">
              ${ICONS.stop} <span>${t('dnsTraceStop', this.currentLang)}</span>
            </button>
          ` : `
            <button id="dns-start-trace-btn" class="btn btn-primary btn-sm">
              ${ICONS.play} <span>${t('dnsTraceStart', this.currentLang)}</span>
            </button>
          `}
        </div>

        ${this.isTracing ? `
          <div class="dns-trace-status-banner mt-2">
            <span class="status-dot dot-running pulsing"></span>
            <span>${t('dnsTraceRunning', this.currentLang)} (${this.traceHost})</span>
          </div>
        ` : ''}

        <!-- Vertical Timeline Hops -->
        <div class="dns-timeline-container mt-3">
          ${this.hops.length === 0 ? `
            <div class="cleaner-empty-hint">${t('dnsNoHops', this.currentLang)}</div>
          ` : `
            <div class="dns-timeline-list">
              ${this.hops.map(h => {
                const isTimeout = h.status === 'timeout' || h.ip.includes('*');
                let rttColor = 'text-fast';
                if (h.avgRtt && h.avgRtt > 200) rttColor = 'text-slow';
                else if (h.avgRtt && h.avgRtt >= 80) rttColor = 'text-medium';

                return `
                  <div class="dns-hop-node ${isTimeout ? 'hop-timeout' : ''}">
                    <div class="dns-hop-badge">${h.hop}</div>
                    <div class="dns-hop-content">
                      <div class="dns-hop-top-row">
                        <code class="dns-hop-ip">${h.ip}</code>
                        <span class="dns-hop-rtt ${rttColor}">
                          ${isTimeout ? '* * *' : `${h.avgRtt} ms`}
                        </span>
                      </div>
                      ${!isTimeout && h.avgRtt ? `
                        <div class="dns-hop-sparkbar-bg">
                          <div class="dns-hop-sparkbar-fill ${rttColor}" style="width: ${Math.min(100, Math.round((h.avgRtt / 300) * 100))}%"></div>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  private attachEvents() {
    // Sub-tab navigation
    this.container.querySelectorAll('.css-subtab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = (btn as HTMLElement).dataset.tab;
        if (tab) {
          this.activeSubTab = tab;
          this.render();
        }
      });
    });

    // Run benchmark
    const runBtn = this.container.querySelector('#dns-run-benchmark-btn');
    if (runBtn) {
      runBtn.addEventListener('click', () => {
        this.isBenchmarking = true;
        this.render();
        this.onMessage({ command: 'runDnsBenchmark', testDomain: this.testDomain });
      });
    }

    // Flush cache
    const flushBtn = this.container.querySelector('#dns-flush-cache-btn');
    if (flushBtn) {
      flushBtn.addEventListener('click', () => {
        this.onMessage({ command: 'flushDnsCache' });
      });
    }

    // Domain select
    const domainSelect = this.container.querySelector('#dns-test-domain-select') as HTMLSelectElement;
    if (domainSelect) {
      domainSelect.addEventListener('change', () => {
        this.testDomain = domainSelect.value;
      });
    }

    // Toggle custom DNS form
    const toggleCustomBtn = this.container.querySelector('#dns-toggle-custom-btn');
    if (toggleCustomBtn) {
      toggleCustomBtn.addEventListener('click', () => {
        this.showCustomForm = !this.showCustomForm;
        this.render();
      });
    }

    // Save custom DNS
    const saveCustomBtn = this.container.querySelector('#dns-custom-save-btn');
    if (saveCustomBtn) {
      saveCustomBtn.addEventListener('click', () => {
        const nameInput = this.container.querySelector('#dns-custom-name-input') as HTMLInputElement;
        const p1Input = this.container.querySelector('#dns-custom-p1-input') as HTMLInputElement;
        const p2Input = this.container.querySelector('#dns-custom-p2-input') as HTMLInputElement;

        if (nameInput && p1Input && p1Input.value.trim()) {
          this.onMessage({
            command: 'addCustomDns',
            name: nameInput.value.trim() || 'Custom DNS',
            primary: p1Input.value.trim(),
            secondary: p2Input?.value.trim()
          });
          this.showCustomForm = false;
        }
      });
    }

    // Cancel custom DNS
    const cancelCustomBtn = this.container.querySelector('#dns-custom-cancel-btn');
    if (cancelCustomBtn) {
      cancelCustomBtn.addEventListener('click', () => {
        this.showCustomForm = false;
        this.render();
      });
    }

    // Apply DNS command copy
    this.container.querySelectorAll('.dns-apply-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) {
          this.onMessage({ command: 'applyDnsProvider', providerId: id });
        }
      });
    });

    // Delete custom DNS
    this.container.querySelectorAll('.dns-delete-custom-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) {
          this.onMessage({ command: 'removeCustomDns', providerId: id });
        }
      });
    });

    // Probe matrix
    const probeBtn = this.container.querySelector('#dns-probe-matrix-btn');
    if (probeBtn) {
      probeBtn.addEventListener('click', () => {
        this.isProbingMatrix = true;
        this.render();
        this.onMessage({ command: 'checkConnectivityMatrix' });
      });
    }

    // Refresh registry
    const refreshRegBtn = this.container.querySelector('#dns-refresh-reg-btn');
    if (refreshRegBtn) {
      refreshRegBtn.addEventListener('click', () => {
        this.onMessage({ command: 'getNpmRegistry' });
      });
    }

    // Switch registry
    this.container.querySelectorAll('.dns-switch-reg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = (btn as HTMLElement).dataset.url;
        if (url) {
          this.isSwitchingRegistry = true;
          this.render();
          this.onMessage({ command: 'setNpmRegistry', registryUrl: url });
        }
      });
    });

    // Traceroute Host input
    const hostInput = this.container.querySelector('#dns-trace-host-input') as HTMLInputElement;
    if (hostInput) {
      hostInput.addEventListener('input', () => {
        this.traceHost = hostInput.value.trim();
      });
    }

    // Start traceroute
    const startTraceBtn = this.container.querySelector('#dns-start-trace-btn');
    if (startTraceBtn) {
      startTraceBtn.addEventListener('click', () => {
        this.isTracing = true;
        this.hops = [];
        this.render();
        this.onMessage({ command: 'startTraceroute', targetHost: this.traceHost });
      });
    }

    // Stop traceroute
    const stopTraceBtn = this.container.querySelector('#dns-stop-trace-btn');
    if (stopTraceBtn) {
      stopTraceBtn.addEventListener('click', () => {
        this.isTracing = false;
        this.render();
        this.onMessage({ command: 'stopTraceroute' });
      });
    }
  }

  private getServiceIcon(iconName: string): string {
    switch (iconName) {
      case 'git': return ICONS.git;
      case 'box': return ICONS.box;
      case 'docker': return ICONS.docker;
      case 'globe': return ICONS.globe;
      case 'zap': return ICONS.zap;
      case 'shield': return ICONS.shield;
      default: return ICONS.globe;
    }
  }
}
