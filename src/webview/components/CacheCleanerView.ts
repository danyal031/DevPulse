import { Language, t } from '../i18n';
import { ICONS } from '../icons';

export interface JunkItem {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  sizeFormatted: string;
  category: 'workspace-deps' | 'workspace-build' | 'global-cache';
  safe: boolean;
  lastModifiedMs?: number;
}

export class CacheCleanerView {
  private container: HTMLElement;
  private currentLang: Language;
  private onMessage: (msg: any) => void;

  private items: JunkItem[] = [];
  private selectedIds: Set<string> = new Set();
  private isScanning: boolean = false;
  private isPurging: boolean = false;
  private statusMessage: string = '';
  private showConfirmModal: boolean = false;

  constructor(container: HTMLElement, currentLang: Language, onMessage: (msg: any) => void) {
    this.container = container;
    this.currentLang = currentLang;
    this.onMessage = onMessage;
    this.render();
    // Initial scan request
    this.onMessage({ command: 'scanJunk' });
  }

  public setLanguage(lang: Language) {
    this.currentLang = lang;
    this.render();
  }

  public setScanning(scanning: boolean) {
    this.isScanning = scanning;
    this.render();
  }

  public setPurging(purging: boolean) {
    this.isPurging = purging;
    this.render();
  }

  public setItems(items: JunkItem[]) {
    this.items = items;
    this.isScanning = false;
    // Default select safe items
    this.selectedIds = new Set(items.filter(i => i.safe).map(i => i.id));
    this.render();
  }

  public onPurgeSuccess(freedBytes: number) {
    this.isPurging = false;
    this.showConfirmModal = false;
    const freedFormatted = this.formatBytes(freedBytes);
    this.statusMessage = `${t('cleanerPurgeSuccess', this.currentLang)} (${freedFormatted})`;
    // Rescan after purge
    this.onMessage({ command: 'scanJunk' });
  }

  public getState() {
    return {
      selectedIds: Array.from(this.selectedIds)
    };
  }

  public restoreState(state: any) {
    if (state && Array.isArray(state.selectedIds)) {
      this.selectedIds = new Set(state.selectedIds);
      this.render();
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private getTotalSelectedBytes(): number {
    return this.items
      .filter(item => this.selectedIds.has(item.id))
      .reduce((acc, cur) => acc + cur.sizeBytes, 0);
  }

  private getTotalReclaimableBytes(): number {
    return this.items.reduce((acc, cur) => acc + cur.sizeBytes, 0);
  }

  private render() {
    const isRtl = this.currentLang === 'fa';
    const totalBytes = this.getTotalReclaimableBytes();
    const selectedBytes = this.getTotalSelectedBytes();
    const totalFormatted = this.formatBytes(totalBytes);
    const selectedFormatted = this.formatBytes(selectedBytes);

    const workspaceItems = this.items.filter(i => i.category.startsWith('workspace'));
    const globalItems = this.items.filter(i => i.category === 'global-cache');

    this.container.innerHTML = `
      <div class="cleaner-view" dir="${isRtl ? 'rtl' : 'ltr'}">
        <div class="deck-hero-banner">
          <div class="deck-hero-icon">${ICONS.broom}</div>
          <div class="deck-hero-content">
            <h3 class="deck-hero-title">${t('cleanerTitle', this.currentLang)}</h3>
            <p class="deck-hero-desc">${t('cleanerDesc', this.currentLang)}</p>
          </div>
        </div>

        <!-- Master Telemetry & Action Bar -->
        <div class="card cleaner-summary-card">
          <div class="cleaner-stats-row">
            <div class="cleaner-metric-box">
              <span class="cleaner-metric-label">${t('cleanerReclaimable', this.currentLang)}</span>
              <span class="cleaner-metric-value text-accent">${totalFormatted}</span>
            </div>
            <div class="cleaner-actions-group">
              <button id="cleaner-scan-btn" class="btn btn-secondary btn-sm" ${this.isScanning ? 'disabled' : ''}>
                ${ICONS.sync} <span>${this.isScanning ? t('cleanerScanning', this.currentLang) : t('cleanerScan', this.currentLang)}</span>
              </button>
              <button id="cleaner-purge-trigger-btn" class="btn btn-primary btn-sm" ${this.selectedIds.size === 0 || this.isPurging ? 'disabled' : ''}>
                ${ICONS.trash} <span>${t('cleanerPurgeSelected', this.currentLang)} (${selectedFormatted})</span>
              </button>
            </div>
          </div>

          <!-- SVG Storage Distribution Bar -->
          ${this.renderStorageBreakdownSvg(totalBytes)}
        </div>

        ${this.statusMessage ? `
          <div class="card cleaner-alert-card">
            <span>${this.statusMessage}</span>
          </div>
        ` : ''}

        <!-- Workspace Build & Deps Section -->
        <div class="card cleaner-section-card mt-3">
          <div class="card-header-sm">
            <span class="font-bold">${t('cleanerWorkspaceJunk', this.currentLang)}</span>
            <span class="badge-count">${workspaceItems.length}</span>
          </div>

          <div class="cleaner-items-list">
            ${workspaceItems.length === 0 ? `
              <div class="cleaner-empty-hint">${t('cleanerNoJunkFound', this.currentLang)}</div>
            ` : workspaceItems.map(item => this.renderJunkItemRow(item)).join('')}
          </div>
        </div>

        <!-- Global Caches Section -->
        <div class="card cleaner-section-card mt-3">
          <div class="card-header-sm">
            <span class="font-bold">${t('cleanerGlobalCaches', this.currentLang)}</span>
            <span class="badge-count">${globalItems.length}</span>
          </div>

          <div class="cleaner-items-list">
            ${globalItems.length === 0 ? `
              <div class="cleaner-empty-hint">${t('cleanerNoJunkFound', this.currentLang)}</div>
            ` : globalItems.map(item => this.renderJunkItemRow(item)).join('')}
          </div>
        </div>

        <!-- Confirmation Modal -->
        ${this.showConfirmModal ? this.renderConfirmationModal(selectedFormatted) : ''}
      </div>
    `;

    this.attachEvents();
  }

  private renderStorageBreakdownSvg(totalBytes: number): string {
    if (totalBytes === 0) return '';

    const buildBytes = this.items.filter(i => i.category === 'workspace-build').reduce((a, c) => a + c.sizeBytes, 0);
    const depsBytes = this.items.filter(i => i.category === 'workspace-deps').reduce((a, c) => a + c.sizeBytes, 0);
    const cacheBytes = this.items.filter(i => i.category === 'global-cache').reduce((a, c) => a + c.sizeBytes, 0);

    const buildPct = (buildBytes / totalBytes) * 100;
    const depsPct = (depsBytes / totalBytes) * 100;
    const cachePct = (cacheBytes / totalBytes) * 100;

    return `
      <div class="cleaner-bar-wrap mt-3">
        <div class="cleaner-multi-bar">
          <div class="bar-segment bar-build" style="width: ${buildPct}%" title="Build: ${this.formatBytes(buildBytes)}"></div>
          <div class="bar-segment bar-deps" style="width: ${depsPct}%" title="Deps: ${this.formatBytes(depsBytes)}"></div>
          <div class="bar-segment bar-cache" style="width: ${cachePct}%" title="Cache: ${this.formatBytes(cacheBytes)}"></div>
        </div>
        <div class="cleaner-bar-legend mt-1">
          <span class="legend-item"><span class="legend-dot dot-build"></span> Build (${buildPct.toFixed(0)}%)</span>
          <span class="legend-item"><span class="legend-dot dot-deps"></span> Dependencies (${depsPct.toFixed(0)}%)</span>
          <span class="legend-item"><span class="legend-dot dot-cache"></span> Global Cache (${cachePct.toFixed(0)}%)</span>
        </div>
      </div>
    `;
  }

  private renderJunkItemRow(item: JunkItem): string {
    const isSelected = this.selectedIds.has(item.id);

    return `
      <div class="cleaner-item-row ${isSelected ? 'row-selected' : ''}" data-item-id="${item.id}">
        <div class="cleaner-item-left">
          <input type="checkbox" class="cleaner-item-chk" data-item-id="${item.id}" ${isSelected ? 'checked' : ''} />
          <div class="cleaner-item-info">
            <div class="cleaner-item-name-group">
              <span class="cleaner-item-name">${this.escapeHtml(item.name)}</span>
              <span class="badge-safety ${item.safe ? 'badge-safe' : 'badge-danger'}">
                ${item.safe ? t('cleanerSafeToPurge', this.currentLang) : t('cleanerDangerous', this.currentLang)}
              </span>
            </div>
            <span class="cleaner-item-path" title="${this.escapeHtml(item.path)}">${this.escapeHtml(item.path)}</span>
          </div>
        </div>

        <div class="cleaner-item-right">
          <span class="cleaner-item-size">${item.sizeFormatted}</span>
          <button class="btn-icon btn-icon-danger cleaner-single-purge-btn" data-item-id="${item.id}" title="${t('kill', this.currentLang)}">
            ${ICONS.trash}
          </button>
        </div>
      </div>
    `;
  }

  private renderConfirmationModal(selectedFormatted: string): string {
    return `
      <div class="cleaner-modal-backdrop">
        <div class="cleaner-modal-box">
          <h4 class="cleaner-modal-title">${t('cleanerConfirmTitle', this.currentLang)}</h4>
          <p class="cleaner-modal-msg">
            ${t('cleanerConfirmMsg', this.currentLang)}
          </p>
          <div class="cleaner-modal-highlight">
            ${this.selectedIds.size} items (${selectedFormatted})
          </div>
          <div class="cleaner-modal-actions mt-3">
            <button id="cleaner-modal-cancel-btn" class="btn btn-secondary btn-sm flex-1">
              ${t('clear', this.currentLang)}
            </button>
            <button id="cleaner-modal-confirm-btn" class="btn btn-danger btn-sm flex-1">
              ${ICONS.trash} <span>${t('cleanerPurgeSelected', this.currentLang)}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private attachEvents() {
    // Scan button
    const scanBtn = this.container.querySelector('#cleaner-scan-btn');
    if (scanBtn) {
      scanBtn.addEventListener('click', () => {
        this.isScanning = true;
        this.render();
        this.onMessage({ command: 'scanJunk' });
      });
    }

    // Trigger confirmation modal
    const purgeTriggerBtn = this.container.querySelector('#cleaner-purge-trigger-btn');
    if (purgeTriggerBtn) {
      purgeTriggerBtn.addEventListener('click', () => {
        if (this.selectedIds.size > 0) {
          this.showConfirmModal = true;
          this.render();
        }
      });
    }

    // Modal cancel
    const cancelBtn = this.container.querySelector('#cleaner-modal-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.showConfirmModal = false;
        this.render();
      });
    }

    // Modal confirm purge
    const confirmBtn = this.container.querySelector('#cleaner-modal-confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        this.showConfirmModal = false;
        this.isPurging = true;
        this.render();
        const targetIds = Array.from(this.selectedIds);
        this.onMessage({ command: 'purgeJunkItems', itemIds: targetIds });
      });
    }

    // Item checkboxes
    this.container.querySelectorAll('.cleaner-item-chk').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = (chk as HTMLElement).dataset.itemId;
        if (id) {
          if ((e.target as HTMLInputElement).checked) {
            this.selectedIds.add(id);
          } else {
            this.selectedIds.delete(id);
          }
          this.render();
        }
      });
    });

    // Individual item purge button
    this.container.querySelectorAll('.cleaner-single-purge-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.itemId;
        if (id) {
          this.isPurging = true;
          this.render();
          this.onMessage({ command: 'purgeJunkItems', itemIds: [id] });
        }
      });
    });
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
