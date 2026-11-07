import { Language, t } from '../i18n';
import { ICONS } from '../icons';
import { DependencyItem, BundleRadarSummary, PackageAlternative } from '../../services/bundleRadarService';

export class BundleRadarView {
  private container: HTMLElement;
  private currentLang: Language;
  private onMessage: (msg: any) => void;

  // State
  private items: DependencyItem[] = [];
  private summary: BundleRadarSummary | null = null;
  private isScanning: boolean = false;
  private searchQuery: string = '';
  private sortBy: 'heaviest' | 'alpha' | 'disk' = 'heaviest';
  private includeDev: boolean = false;
  private inlineDecoratorEnabled: boolean = true;
  private expandedPackages: Set<string> = new Set();
  private statusNotice: string = '';

  constructor(container: HTMLElement, currentLang: Language, onMessage: (msg: any) => void) {
    this.container = container;
    this.currentLang = currentLang;
    this.onMessage = onMessage;
    this.render();

    // Trigger initial scan
    this.onMessage({ command: 'scanDependencies', includeDev: this.includeDev });
  }

  public setLanguage(lang: Language) {
    this.currentLang = lang;
    this.render();
  }

  public setData(items: DependencyItem[], summary: BundleRadarSummary) {
    this.items = items;
    this.summary = summary;
    this.isScanning = false;
    this.render();
  }

  public updatePackageItem(updated: DependencyItem) {
    const idx = this.items.findIndex((i) => i.name === updated.name);
    if (idx !== -1) {
      this.items[idx] = updated;
      this.render();
    }
  }

  public setScanning(scanning: boolean) {
    this.isScanning = scanning;
    this.render();
  }

  public setInlineDecoratorEnabled(enabled: boolean) {
    this.inlineDecoratorEnabled = enabled;
    this.render();
  }

  public showNotice(notice: string) {
    this.statusNotice = notice;
    this.render();
    setTimeout(() => {
      this.statusNotice = '';
      this.render();
    }, 3500);
  }

  private getFilteredAndSortedItems(): DependencyItem[] {
    let filtered = this.items.filter((item) => {
      if (this.searchQuery) {
        return item.name.toLowerCase().includes(this.searchQuery.toLowerCase());
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (this.sortBy === 'heaviest') {
        const aGzip = a.gzippedSizeBytes || 0;
        const bGzip = b.gzippedSizeBytes || 0;
        return bGzip - aGzip;
      }
      if (this.sortBy === 'disk') {
        const aDisk = a.localSizeBytes || 0;
        const bDisk = b.localSizeBytes || 0;
        return bDisk - aDisk;
      }
      return a.name.localeCompare(b.name);
    });
  }

  private formatBytes(bytes: number | null): string {
    if (bytes === null || bytes === undefined || isNaN(bytes)) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  private renderDonutChartSvg(): string {
    if (!this.summary || this.summary.topPackages.length === 0 || this.summary.totalGzipBytes === 0) {
      return '';
    }

    const radius = 38;
    const circumference = 2 * Math.PI * radius; // ~238.76
    let accumulatedPercent = 0;

    const circles = this.summary.topPackages.map((pkg) => {
      const strokeDash = (pkg.percent / 100) * circumference;
      const strokeOffset = circumference - (accumulatedPercent / 100) * circumference;
      accumulatedPercent += pkg.percent;

      return `
        <circle
          cx="50"
          cy="50"
          r="${radius}"
          fill="none"
          stroke="${pkg.color}"
          stroke-width="12"
          stroke-dasharray="${strokeDash} ${circumference}"
          stroke-dashoffset="${strokeOffset}"
          transform="rotate(-90 50 50)"
          class="donut-segment"
        >
          <title>${pkg.name}: ${pkg.percent}% (${this.formatBytes(pkg.gzipBytes)})</title>
        </circle>
      `;
    }).join('');

    return `
      <div class="bundle-donut-wrapper">
        <svg viewBox="0 0 100 100" class="bundle-donut-svg">
          <circle cx="50" cy="50" r="${radius}" fill="none" stroke="var(--vscode-editorWidget-background, #252526)" stroke-width="12" />
          ${circles}
          <text x="50" y="47" text-anchor="middle" class="donut-center-val">
            ${this.formatBytes(this.summary.totalGzipBytes)}
          </text>
          <text x="50" y="58" text-anchor="middle" class="donut-center-lbl">GZIP</text>
        </svg>

        <div class="bundle-donut-legend">
          <div class="legend-header">${t('bundleTopHeavyDonut', this.currentLang)}</div>
          <div class="legend-list">
            ${this.summary.topPackages.map((p) => `
              <div class="legend-item" title="${p.name} - ${this.formatBytes(p.gzipBytes)}">
                <span class="legend-dot" style="background-color: ${p.color}"></span>
                <span class="legend-name">${p.name}</span>
                <span class="legend-pct">${p.percent}%</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  public render() {
    const filteredItems = this.getFilteredAndSortedItems();

    this.container.innerHTML = `
      <div class="bundle-radar-view">
        <!-- Header Controls Banner -->
        <div class="bundle-header-card">
          <div class="bundle-title-row">
            <div class="bundle-title-box">
              <span class="bundle-header-icon">${ICONS.weight}</span>
              <div>
                <h3 class="bundle-title">${t('bundleRadarTitle', this.currentLang)}</h3>
                <p class="bundle-desc">${t('bundleRadarDesc', this.currentLang)}</p>
              </div>
            </div>
            <button id="bundle-scan-btn" class="btn-primary" ${this.isScanning ? 'disabled' : ''}>
              ${this.isScanning ? ICONS.sync : ICONS.refresh}
              <span>${this.isScanning ? t('bundleScanning', this.currentLang) : t('bundleScanDeps', this.currentLang)}</span>
            </button>
          </div>

          <!-- Notification Toast -->
          ${this.statusNotice ? `<div class="bundle-toast">${this.statusNotice}</div>` : ''}

          <!-- Filters & Options Row -->
          <div class="bundle-toolbar-row">
            <div class="bundle-search-box">
              <span class="search-icon">${ICONS.search}</span>
              <input 
                type="text" 
                id="bundle-search-input" 
                class="bundle-search-input" 
                placeholder="${t('bundleFilterPlaceholder', this.currentLang)}" 
                value="${this.searchQuery}"
              />
              ${this.searchQuery ? `<button id="bundle-clear-search-btn" class="search-clear-btn">${ICONS.clear}</button>` : ''}
            </div>

            <div class="bundle-options-group">
              <select id="bundle-sort-select" class="bundle-select">
                <option value="heaviest" ${this.sortBy === 'heaviest' ? 'selected' : ''}>${t('bundleSortHeaviest', this.currentLang)}</option>
                <option value="alpha" ${this.sortBy === 'alpha' ? 'selected' : ''}>${t('bundleSortAlpha', this.currentLang)}</option>
                <option value="disk" ${this.sortBy === 'disk' ? 'selected' : ''}>${t('bundleSortDisk', this.currentLang)}</option>
              </select>

              <button id="bundle-toggle-dev-btn" class="bundle-pill-btn ${this.includeDev ? 'active' : ''}" title="${t('bundleIncludeDev', this.currentLang)}">
                <span class="pill-indicator"></span>
                <span>${t('bundleIncludeDev', this.currentLang)}</span>
              </button>

              <button id="bundle-toggle-inline-btn" class="bundle-pill-btn ${this.inlineDecoratorEnabled ? 'active' : ''}" title="${t('bundleInlineDecoratorToggle', this.currentLang)}">
                <span class="pill-indicator"></span>
                <span>${t('bundleInlineDecoratorToggle', this.currentLang)}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Telemetry Summary Cards -->
        ${this.summary ? `
          <div class="bundle-summary-grid">
            <div class="metric-card metric-primary">
              <span class="metric-icon">${ICONS.gauge}</span>
              <div class="metric-body">
                <span class="metric-label">${t('bundleTotalOverhead', this.currentLang)}</span>
                <span class="metric-value font-mono">${this.formatBytes(this.summary.totalGzipBytes)}</span>
              </div>
            </div>

            <div class="metric-card">
              <span class="metric-icon">${ICONS.box}</span>
              <div class="metric-body">
                <span class="metric-label">${t('bundleTotalPkgs', this.currentLang)}</span>
                <span class="metric-value font-mono">${this.summary.totalDependencies} <small>(${this.summary.productionCount} prod / ${this.summary.devCount} dev)</small></span>
              </div>
            </div>

            <div class="metric-card ${this.summary.bloatedCount > 0 ? 'metric-warning' : ''}">
              <span class="metric-icon">${ICONS.flame}</span>
              <div class="metric-body">
                <span class="metric-label">${t('bundleBloatedCount', this.currentLang)}</span>
                <span class="metric-value font-mono ${this.summary.bloatedCount > 0 ? 'text-red pulse-glow' : ''}">${this.summary.bloatedCount}</span>
              </div>
            </div>

            <div class="metric-card">
              <span class="metric-icon">${ICONS.layers}</span>
              <div class="metric-body">
                <span class="metric-label">${t('bundleTotalMinified', this.currentLang)}</span>
                <span class="metric-value font-mono">${this.formatBytes(this.summary.totalMinBytes)}</span>
              </div>
            </div>
          </div>

          <!-- SVG Donut Chart Section -->
          ${this.renderDonutChartSvg()}
        ` : ''}

        <!-- Dependencies List -->
        <div class="bundle-list-wrapper">
          ${filteredItems.length === 0 ? `
            <div class="bundle-empty-state">
              <span class="empty-icon">${ICONS.packageIcon}</span>
              <p>${t('bundleNoDepsFound', this.currentLang)}</p>
            </div>
          ` : `
            <div class="bundle-items-list">
              ${filteredItems.map((item) => {
                const gzipBytes = item.gzippedSizeBytes || 0;
                const minBytes = item.minifiedSizeBytes || 0;
                const localBytes = item.localSizeBytes;
                const isBloated = item.category === 'bloated';
                const isModerate = item.category === 'moderate';
                const isLight = item.category === 'light';

                // Progress calculation relative to 150KB reference
                const progressPct = Math.min(100, Math.max(4, Math.round((gzipBytes / (120 * 1024)) * 100)));
                const isExpanded = this.expandedPackages.has(item.name);

                let badgeClass = 'badge-light';
                let badgeLabel = t('bundleStatusLight', this.currentLang);
                if (isBloated) {
                  badgeClass = 'badge-bloated pulse-red';
                  badgeLabel = t('bundleStatusBloated', this.currentLang);
                } else if (isModerate) {
                  badgeClass = 'badge-moderate';
                  badgeLabel = t('bundleStatusModerate', this.currentLang);
                }

                return `
                  <div class="bundle-pkg-card ${isBloated ? 'card-bloated' : ''}" data-name="${item.name}">
                    <div class="pkg-header-row">
                      <div class="pkg-title-area">
                        <span class="pkg-icon">${ICONS.box}</span>
                        <span class="pkg-name">${item.name}</span>
                        <span class="pkg-version font-mono">${item.version}</span>
                        <span class="pkg-type-badge ${item.isDev ? 'type-dev' : 'type-prod'}">
                          ${item.isDev ? t('bundleDevBadge', this.currentLang) : t('bundleProdBadge', this.currentLang)}
                        </span>
                      </div>

                      <div class="pkg-actions-area">
                        <span class="pkg-weight-badge ${badgeClass}">${badgeLabel}</span>
                        <a href="${item.homepage}" target="_blank" class="icon-link-btn" title="${t('bundleNpmLink', this.currentLang)}">
                          ${ICONS.externalLink}
                        </a>
                      </div>
                    </div>

                    <!-- Size Visual Progress Bars -->
                    <div class="pkg-metrics-row">
                      <div class="pkg-size-label">
                        <span class="lbl-gzip font-mono"><strong>${this.formatBytes(gzipBytes)}</strong> gzip</span>
                        <span class="lbl-min font-mono">${this.formatBytes(minBytes)} min</span>
                        ${localBytes !== null ? `<span class="lbl-disk font-mono">(${this.formatBytes(localBytes)} disk)</span>` : ''}
                      </div>
                      <div class="pkg-progress-track">
                        <div class="pkg-progress-fill ${badgeClass}" style="width: ${progressPct}%"></div>
                      </div>
                    </div>

                    <!-- Smart Alternative Accordion Trigger -->
                    ${item.alternative ? `
                      <div class="alternative-banner">
                        <button class="alt-toggle-btn" data-target="${item.name}">
                          <div class="alt-toggle-meta">
                            <span class="sparkle-icon">${ICONS.sparkle}</span>
                            <span class="alt-label">${t('bundleLighterAlternative', this.currentLang)}:</span>
                            <strong class="alt-replacement">${item.alternative.replacementPackage}</strong>
                            <span class="alt-savings-badge">${item.alternative.estimatedSavings}</span>
                          </div>
                          <span class="alt-chevron">${isExpanded ? ICONS.chevronUp : ICONS.chevronDown}</span>
                        </button>

                        ${isExpanded ? `
                          <div class="alternative-details-drawer">
                            <p class="alt-reason">${this.currentLang === 'fa' ? item.alternative.reasonFa : item.alternative.reasonEn}</p>
                            <div class="migration-command-box">
                              <code class="migration-cmd-code font-mono">${this.getMigrationCommand(item.name, item.alternative.replacementPackage)}</code>
                              <div class="cmd-actions">
                                <button class="btn-sm btn-copy-migration" data-cmd="${this.getMigrationCommand(item.name, item.alternative.replacementPackage)}" title="${t('bundleCopyMigrationCmd', this.currentLang)}">
                                  ${ICONS.copy} <span>${t('copy', this.currentLang)}</span>
                                </button>
                                <button class="btn-sm btn-primary btn-run-migration" data-cmd="${this.getMigrationCommand(item.name, item.alternative.replacementPackage)}" title="${t('bundleRunMigrationCmd', this.currentLang)}">
                                  ${ICONS.terminal} <span>${t('bundleRunMigrationCmd', this.currentLang)}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ` : ''}
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private getMigrationCommand(oldPkg: string, newPkg: string): string {
    const pkgMgr = this.summary?.packageManager || 'npm';
    const cleanNew = newPkg.split(' ')[0];
    const isSpecial = cleanNew.includes('native') || cleanNew.includes('dynamic');

    switch (pkgMgr) {
      case 'pnpm':
        return isSpecial ? `pnpm remove ${oldPkg}` : `pnpm remove ${oldPkg} && pnpm add ${cleanNew}`;
      case 'yarn':
        return isSpecial ? `yarn remove ${oldPkg}` : `yarn remove ${oldPkg} && yarn add ${cleanNew}`;
      case 'bun':
        return isSpecial ? `bun remove ${oldPkg}` : `bun remove ${oldPkg} && bun add ${cleanNew}`;
      case 'npm':
      default:
        return isSpecial ? `npm uninstall ${oldPkg}` : `npm uninstall ${oldPkg} && npm install ${cleanNew}`;
    }
  }

  private attachEvents() {
    // Scan button
    const scanBtn = this.container.querySelector('#bundle-scan-btn');
    if (scanBtn) {
      scanBtn.addEventListener('click', () => {
        this.isScanning = true;
        this.render();
        this.onMessage({ command: 'scanDependencies', includeDev: this.includeDev });
      });
    }

    // Search input
    const searchInput = this.container.querySelector('#bundle-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.searchQuery = searchInput.value;
        this.render();
      });
    }

    // Clear search
    const clearSearchBtn = this.container.querySelector('#bundle-clear-search-btn');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.render();
      });
    }

    // Sort select
    const sortSelect = this.container.querySelector('#bundle-sort-select') as HTMLSelectElement;
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        this.sortBy = sortSelect.value as any;
        this.render();
      });
    }

    // DevDependencies toggle
    const devToggleBtn = this.container.querySelector('#bundle-toggle-dev-btn');
    if (devToggleBtn) {
      devToggleBtn.addEventListener('click', () => {
        this.includeDev = !this.includeDev;
        this.isScanning = true;
        this.render();
        this.onMessage({ command: 'scanDependencies', includeDev: this.includeDev });
      });
    }

    // Inline decorator toggle
    const inlineToggleBtn = this.container.querySelector('#bundle-toggle-inline-btn');
    if (inlineToggleBtn) {
      inlineToggleBtn.addEventListener('click', () => {
        this.inlineDecoratorEnabled = !this.inlineDecoratorEnabled;
        this.render();
        this.onMessage({ command: 'toggleInlineDecorator', enabled: this.inlineDecoratorEnabled });
      });
    }

    // Accordion toggles for alternatives
    this.container.querySelectorAll('.alt-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = (btn as HTMLElement).dataset.target;
        if (target) {
          if (this.expandedPackages.has(target)) {
            this.expandedPackages.delete(target);
          } else {
            this.expandedPackages.add(target);
          }
          this.render();
        }
      });
    });

    // Copy migration command
    this.container.querySelectorAll('.btn-copy-migration').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cmd = (btn as HTMLElement).dataset.cmd;
        if (cmd) {
          this.onMessage({ command: 'copyMigrationCommand', commandText: cmd });
        }
      });
    });

    // Run migration command in terminal
    this.container.querySelectorAll('.btn-run-migration').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cmd = (btn as HTMLElement).dataset.cmd;
        if (cmd) {
          this.onMessage({ command: 'runMigrationCommand', commandText: cmd });
        }
      });
    });
  }
}
