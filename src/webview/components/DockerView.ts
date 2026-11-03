import { Language, t } from '../i18n';
import { ICONS } from '../icons';
import {
  DockerContainer,
  DockerImage,
  DockerVolume,
  DockerNetwork,
  DockerContainerStat,
  DockerStatusPayload,
  DockerRunContainerConfig
} from '../../utils/dockerManager';

export interface DockerViewState {
  activeSubTab: 'containers' | 'images' | 'volumesNetworks' | 'statsPrune';
  subToggleVN: 'volumes' | 'networks';
  filterQuery: string;
  filterState: 'all' | 'running' | 'stopped';
}

export class DockerView {
  private container: HTMLElement;
  private currentLang: Language;
  private postMessage: (msg: any) => void;

  // Navigation State
  private activeSubTab: 'containers' | 'images' | 'volumesNetworks' | 'statsPrune' = 'containers';
  private subToggleVN: 'volumes' | 'networks' = 'volumes';

  // Filters
  private filterQuery: string = '';
  private filterState: 'all' | 'running' | 'stopped' = 'all';

  // Loading States
  private isLoading: boolean = false;
  private isPullingImage: boolean = false;
  private isPruningSystem: boolean = false;
  private actionInProgress: Record<string, string> = {};

  // Data Payloads
  private statusPayload: DockerStatusPayload | null = null;
  private imagesList: DockerImage[] = [];
  private volumesList: DockerVolume[] = [];
  private networksList: DockerNetwork[] = [];
  private statsList: DockerContainerStat[] = [];
  private statsError: string | null = null;

  // Active Modals / Floating Viewers
  private activeLogs: {
    containerId: string;
    name: string;
    logs: string;
    tail: number;
    searchQuery: string;
  } | null = null;

  private activeInspect: {
    title: string;
    jsonString: string;
  } | null = null;

  private activeRunModal: {
    image: string;
    name: string;
    ports: string;
    env: string;
    detached: boolean;
  } | null = null;

  private activeConfirmModal: {
    title: string;
    message: string;
    confirmText: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null = null;

  // Copy Feedback
  private copiedIdTimeout: any = null;
  private copiedId: string | null = null;

  constructor(container: HTMLElement, lang: Language, postMessage: (msg: any) => void) {
    this.container = container;
    this.currentLang = lang;
    this.postMessage = postMessage;

    this.render();
  }

  // ============================================================================
  // Public Lifecycle & Messaging Methods
  // ============================================================================

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
    if (this.activeLogs && this.activeLogs.containerId === data.containerId) {
      this.activeLogs.logs = data.error ? `Error fetching logs: ${data.error}` : data.logs;
    } else {
      this.activeLogs = {
        containerId: data.containerId,
        name: data.name,
        logs: data.error ? `Error fetching logs: ${data.error}` : data.logs,
        tail: 100,
        searchQuery: ''
      };
    }
    this.render();
  }

  public handleActionResult(_res: { success: boolean; message: string }) {
    this.refreshContainers();
  }

  public setInspectResult(data: { target: string; targetType: string; success: boolean; jsonString?: string; error?: string }) {
    if (data.success && data.jsonString) {
      this.activeInspect = {
        title: `${data.targetType.toUpperCase()}: ${data.target}`,
        jsonString: data.jsonString
      };
    } else {
      this.activeInspect = {
        title: `Inspect Error: ${data.target}`,
        jsonString: JSON.stringify({ error: data.error || 'Failed to inspect object' }, null, 2)
      };
    }
    this.render();
  }

  public setImages(images: DockerImage[], _error?: string) {
    this.isLoading = false;
    this.imagesList = images || [];
    this.render();
  }

  public handlePullResult(_res: { success: boolean; message: string; imageName: string }) {
    this.isPullingImage = false;
    this.refreshImages();
  }

  public handleImageActionResult(_res: { success: boolean; message: string }) {
    this.refreshImages();
  }

  public handleRunContainerResult(res: { success: boolean; message: string; containerId?: string }) {
    if (res.success) {
      this.activeRunModal = null;
      this.activeSubTab = 'containers';
      this.refreshContainers();
    } else {
      this.render();
    }
  }

  public setVolumes(volumes: DockerVolume[], _error?: string) {
    this.isLoading = false;
    this.volumesList = volumes || [];
    this.render();
  }

  public handleVolumeActionResult(_res: { success: boolean; message: string }) {
    this.refreshVolumes();
  }

  public setNetworks(networks: DockerNetwork[], _error?: string) {
    this.isLoading = false;
    this.networksList = networks || [];
    this.render();
  }

  public handleNetworkActionResult(_res: { success: boolean; message: string }) {
    this.refreshNetworks();
  }

  public setStats(stats: DockerContainerStat[], error?: string) {
    this.isLoading = false;
    this.statsList = stats || [];
    this.statsError = error || null;
    this.render();
  }

  public handleSystemPruneResult(_res: { success: boolean; message: string; output?: string }) {
    this.isPruningSystem = false;
    this.refreshAll();
  }

  // ============================================================================
  // Refresh Dispatchers
  // ============================================================================

  public refreshContainers() {
    this.isLoading = true;
    this.render();
    this.postMessage({ type: 'dockerGetContainers' });
  }

  public refreshImages() {
    this.isLoading = true;
    this.render();
    this.postMessage({ type: 'dockerGetImages' });
  }

  public refreshVolumes() {
    this.isLoading = true;
    this.render();
    this.postMessage({ type: 'dockerGetVolumes' });
  }

  public refreshNetworks() {
    this.isLoading = true;
    this.render();
    this.postMessage({ type: 'dockerGetNetworks' });
  }

  public refreshStats() {
    this.isLoading = true;
    this.render();
    this.postMessage({ type: 'dockerGetStats' });
  }

  public refreshAll() {
    this.refreshContainers();
    this.refreshImages();
    this.refreshVolumes();
    this.refreshNetworks();
    this.refreshStats();
  }

  // ============================================================================
  // State Persistence
  // ============================================================================

  public getState(): DockerViewState {
    return {
      activeSubTab: this.activeSubTab,
      subToggleVN: this.subToggleVN,
      filterQuery: this.filterQuery,
      filterState: this.filterState
    };
  }

  public restoreState(state: any) {
    if (state) {
      if (state.activeSubTab) this.activeSubTab = state.activeSubTab;
      if (state.subToggleVN) this.subToggleVN = state.subToggleVN;
      if (typeof state.filterQuery === 'string') this.filterQuery = state.filterQuery;
      if (state.filterState) this.filterState = state.filterState;
    }
    this.refreshActiveTab();
  }

  private refreshActiveTab() {
    switch (this.activeSubTab) {
      case 'containers':
        this.refreshContainers();
        break;
      case 'images':
        this.refreshImages();
        break;
      case 'volumesNetworks':
        if (this.subToggleVN === 'volumes') this.refreshVolumes();
        else this.refreshNetworks();
        break;
      case 'statsPrune':
        this.refreshStats();
        break;
    }
  }

  // ============================================================================
  // Main Render Engine
  // ============================================================================

  private render() {
    const isInstalled = this.statusPayload?.isInstalled ?? true;
    const isRunning = this.statusPayload?.isRunning ?? true;

    // Handle Docker offline or not installed
    if (!isInstalled || !isRunning) {
      this.renderOfflineView(!isInstalled);
      return;
    }

    const containers = this.statusPayload?.containers || [];
    const runningContainersCount = containers.filter((c) => c.state === 'running').length;

    this.container.innerHTML = `
      <div class="docker-superdeck-wrapper">
        <!-- Sub-Nav Tab Bar -->
        <div class="docker-subnav-bar">
          <button class="docker-subtab-btn ${this.activeSubTab === 'containers' ? 'active' : ''}" data-subtab="containers">
            ${ICONS.box}
            <span>${t('dockerTabContainers', this.currentLang)}</span>
            <span class="subtab-counter-badge">${runningContainersCount}/${containers.length}</span>
          </button>

          <button class="docker-subtab-btn ${this.activeSubTab === 'images' ? 'active' : ''}" data-subtab="images">
            ${ICONS.layers}
            <span>${t('dockerTabImages', this.currentLang)}</span>
            <span class="subtab-counter-badge">${this.imagesList.length}</span>
          </button>

          <button class="docker-subtab-btn ${this.activeSubTab === 'volumesNetworks' ? 'active' : ''}" data-subtab="volumesNetworks">
            ${ICONS.database}
            <span>${t('dockerTabVolumesNetworks', this.currentLang)}</span>
          </button>

          <button class="docker-subtab-btn ${this.activeSubTab === 'statsPrune' ? 'active' : ''}" data-subtab="statsPrune">
            ${ICONS.activity}
            <span>${t('dockerTabStatsPrune', this.currentLang)}</span>
          </button>
        </div>

        <!-- Sub-View Content -->
        <div class="docker-subview-content">
          ${this.renderActiveSubTabContent()}
        </div>

        <!-- Floating Modals -->
        ${this.renderActiveModals()}
      </div>
    `;

    this.setupEventListeners();
  }

  // ============================================================================
  // Sub-Tab Views
  // ============================================================================

  private renderActiveSubTabContent(): string {
    switch (this.activeSubTab) {
      case 'containers':
        return this.renderContainersTab();
      case 'images':
        return this.renderImagesTab();
      case 'volumesNetworks':
        return this.renderVolumesNetworksTab();
      case 'statsPrune':
        return this.renderStatsPruneTab();
    }
  }

  /**
   * 1. Containers Dashboard
   */
  private renderContainersTab(): string {
    const containers = this.statusPayload?.containers || [];
    const runningCount = containers.filter((c) => c.state === 'running').length;
    const stoppedCount = containers.length - runningCount;

    const filtered = containers.filter((c) => {
      if (this.filterState === 'running' && c.state !== 'running') return false;
      if (this.filterState === 'stopped' && c.state === 'running') return false;

      if (this.filterQuery) {
        const q = this.filterQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.image.toLowerCase().includes(q) ||
          c.ports.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return `
      <!-- Toolbar: Filters & Search -->
      <div class="docker-toolbar">
        <div class="docker-filter-chips">
          <button class="filter-pill ${this.filterState === 'all' ? 'active' : ''}" data-filter="all">
            ${t('dockerAll', this.currentLang)} (${containers.length})
          </button>
          <button class="filter-pill ${this.filterState === 'running' ? 'active' : ''}" data-filter="running">
            <span class="status-dot dot-running"></span>
            ${t('dockerRunning', this.currentLang)} (${runningCount})
          </button>
          <button class="filter-pill ${this.filterState === 'stopped' ? 'active' : ''}" data-filter="stopped">
            <span class="status-dot dot-stopped"></span>
            ${t('dockerStopped', this.currentLang)} (${stoppedCount})
          </button>
        </div>

        <div class="docker-search-bar">
          <span class="search-icon">${ICONS.search}</span>
          <input
            type="text"
            id="docker-container-search"
            class="input-box docker-search-input"
            placeholder="${t('dockerFilterPlaceholder', this.currentLang)}"
            value="${this.escapeHtml(this.filterQuery)}"
          />
          <button class="icon-btn-secondary" id="docker-refresh-containers" title="${t('refresh', this.currentLang)}">
            <span class="${this.isLoading ? 'spin-icon' : ''}">${ICONS.sync}</span>
          </button>
        </div>
      </div>

      <!-- Container Cards List -->
      ${
        filtered.length === 0
          ? `
        <div class="docker-empty-state">
          <span class="empty-icon">${ICONS.docker}</span>
          <p>${t('dockerNoContainers', this.currentLang)}</p>
        </div>
      `
          : `
        <div class="docker-cards-list">
          ${filtered.map((c) => this.renderContainerCard(c)).join('')}
        </div>
      `
      }
    `;
  }

  private renderContainerCard(c: DockerContainer): string {
    const isRunning = c.state === 'running';
    const isPaused = c.state === 'paused';
    const isBusy = Boolean(this.actionInProgress[c.id]);

    let dotClass = 'dot-stopped';
    let statusText = t('dockerExitedBadge', this.currentLang);
    if (isRunning) {
      dotClass = 'dot-running';
      statusText = t('dockerRunningBadge', this.currentLang);
    } else if (isPaused) {
      dotClass = 'dot-paused';
      statusText = t('dockerPausedBadge', this.currentLang);
    }

    return `
      <div class="docker-item-card ${isRunning ? 'card-running' : 'card-stopped'}">
        <div class="card-header">
          <div class="card-title-group">
            <span class="status-dot ${dotClass}" title="${statusText}"></span>
            <span class="container-name" title="${c.name}">${this.escapeHtml(c.name)}</span>
            <span class="container-id-badge copy-id-trigger" data-id="${c.id}" title="Click to copy ID">
              ${c.id.substring(0, 10)}
              ${this.copiedId === c.id ? `<span class="copied-indicator">${ICONS.check}</span>` : ''}
            </span>
          </div>

          <div class="card-actions-toolbar">
            ${
              isRunning
                ? `
              <button class="icon-btn-secondary btn-action" data-action="stop" data-id="${c.id}" title="${t('dockerStop', this.currentLang)}" ${isBusy ? 'disabled' : ''}>
                ${ICONS.stop}
              </button>
              <button class="icon-btn-secondary btn-action" data-action="restart" data-id="${c.id}" title="${t('dockerRestart', this.currentLang)}" ${isBusy ? 'disabled' : ''}>
                ${ICONS.restart}
              </button>
              <button class="icon-btn-secondary btn-action" data-action="pause" data-id="${c.id}" title="${t('dockerPause', this.currentLang)}" ${isBusy ? 'disabled' : ''}>
                ${ICONS.pause}
              </button>
              <button class="icon-btn-secondary btn-terminal" data-id="${c.id}" data-name="${c.name}" title="${t('dockerTerminal', this.currentLang)}">
                ${ICONS.terminal}
              </button>
            `
                : isPaused
                ? `
              <button class="icon-btn-secondary btn-action" data-action="unpause" data-id="${c.id}" title="${t('dockerUnpause', this.currentLang)}" ${isBusy ? 'disabled' : ''}>
                ${ICONS.play}
              </button>
              <button class="icon-btn-secondary btn-action" data-action="stop" data-id="${c.id}" title="${t('dockerStop', this.currentLang)}" ${isBusy ? 'disabled' : ''}>
                ${ICONS.stop}
              </button>
            `
                : `
              <button class="icon-btn-secondary btn-action" data-action="start" data-id="${c.id}" title="${t('dockerStart', this.currentLang)}" ${isBusy ? 'disabled' : ''}>
                ${ICONS.play}
              </button>
              <button class="icon-btn-secondary btn-delete-container" data-id="${c.id}" data-name="${c.name}" title="${t('dockerRemove', this.currentLang)}" ${isBusy ? 'disabled' : ''}>
                ${ICONS.trash}
              </button>
            `
            }

            <button class="icon-btn-secondary btn-logs" data-id="${c.id}" data-name="${c.name}" title="${t('dockerLogs', this.currentLang)}">
              ${ICONS.log}
            </button>
            <button class="icon-btn-secondary btn-inspect" data-target="${c.id}" data-type="container" title="${t('dockerInspect', this.currentLang)}">
              ${ICONS.eye}
            </button>
          </div>
        </div>

        <div class="card-details-grid">
          <div class="detail-row">
            <span class="detail-label">${t('dockerImage', this.currentLang)}</span>
            <span class="detail-value monospace" title="${c.image}">${this.escapeHtml(c.image)}</span>
          </div>

          ${
            c.ports
              ? `
            <div class="detail-row">
              <span class="detail-label">${t('dockerPorts', this.currentLang)}</span>
              <span class="detail-value monospace port-val" title="${c.ports}">${this.escapeHtml(c.ports)}</span>
            </div>
          `
              : ''
          }

          <div class="detail-row">
            <span class="detail-label">${t('dockerStatus', this.currentLang)}</span>
            <span class="detail-value status-subtext">${this.escapeHtml(c.status)}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 2. Images Management
   */
  private renderImagesTab(): string {
    const images = this.imagesList;
    const filtered = images.filter((img) => {
      if (this.filterQuery) {
        const q = this.filterQuery.toLowerCase();
        return (
          img.repository.toLowerCase().includes(q) ||
          img.tag.toLowerCase().includes(q) ||
          img.id.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return `
      <!-- Pull Image Header Box -->
      <div class="docker-pull-box">
        <div class="pull-input-wrap">
          <input
            type="text"
            id="docker-pull-input"
            class="input-box pull-input"
            placeholder="${t('dockerPullPlaceholder', this.currentLang)}"
          />
          <button class="btn btn-primary btn-pull" id="docker-pull-btn" ${this.isPullingImage ? 'disabled' : ''}>
            ${this.isPullingImage ? `<span class="spin-icon">${ICONS.sync}</span>` : ICONS.download}
            <span>${this.isPullingImage ? t('dockerPulling', this.currentLang) : t('dockerPull', this.currentLang)}</span>
          </button>
        </div>

        <div class="pull-actions-bar">
          <button class="btn btn-secondary btn-sm" id="docker-prune-images-btn" title="Remove dangling images">
            ${ICONS.trash}
            <span>${t('dockerPruneImages', this.currentLang)}</span>
          </button>
          <button class="icon-btn-secondary" id="docker-refresh-images" title="${t('refresh', this.currentLang)}">
            <span class="${this.isLoading ? 'spin-icon' : ''}">${ICONS.sync}</span>
          </button>
        </div>
      </div>

      <!-- Search Images Filter -->
      <div class="docker-search-bar">
        <span class="search-icon">${ICONS.search}</span>
        <input
          type="text"
          id="docker-image-search"
          class="input-box docker-search-input"
          placeholder="${t('dockerSearchImages', this.currentLang)}"
          value="${this.escapeHtml(this.filterQuery)}"
        />
      </div>

      <!-- Images List -->
      ${
        filtered.length === 0
          ? `
        <div class="docker-empty-state">
          <span class="empty-icon">${ICONS.layers}</span>
          <p>${t('dockerNoImages', this.currentLang)}</p>
        </div>
      `
          : `
        <div class="docker-cards-list">
          ${filtered.map((img) => this.renderImageCard(img)).join('')}
        </div>
      `
      }
    `;
  }

  private renderImageCard(img: DockerImage): string {
    const fullTag = `${img.repository}:${img.tag}`;
    return `
      <div class="docker-item-card image-card">
        <div class="card-header">
          <div class="card-title-group">
            <span class="image-repo-title" title="${fullTag}">${this.escapeHtml(img.repository)}</span>
            <span class="image-tag-badge">${this.escapeHtml(img.tag)}</span>
            <span class="container-id-badge copy-id-trigger" data-id="${img.id}">
              ${img.id.substring(0, 10)}
            </span>
          </div>

          <div class="card-actions-toolbar">
            <button class="icon-btn-secondary btn-run-image" data-image="${fullTag}" title="${t('dockerRunImage', this.currentLang)}">
              ${ICONS.play}
            </button>
            <button class="icon-btn-secondary btn-inspect" data-target="${img.id}" data-type="image" title="${t('dockerInspect', this.currentLang)}">
              ${ICONS.eye}
            </button>
            <button class="icon-btn-secondary btn-delete-image" data-id="${img.id}" title="${t('dockerDeleteImage', this.currentLang)}">
              ${ICONS.trash}
            </button>
          </div>
        </div>

        <div class="card-details-grid">
          <div class="detail-row">
            <span class="detail-label">${t('dockerImageSize', this.currentLang)}</span>
            <span class="detail-value monospace">${this.escapeHtml(img.size)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">${t('dockerImageCreated', this.currentLang)}</span>
            <span class="detail-value status-subtext">${this.escapeHtml(img.createdSince)}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 3. Volumes & Networks Explorer
   */
  private renderVolumesNetworksTab(): string {
    return `
      <!-- Segmented Sub-Toggle -->
      <div class="segmented-control">
        <button class="seg-btn ${this.subToggleVN === 'volumes' ? 'active' : ''}" data-vntoggle="volumes">
          ${ICONS.database}
          <span>${t('dockerTabVolumes', this.currentLang)} (${this.volumesList.length})</span>
        </button>
        <button class="seg-btn ${this.subToggleVN === 'networks' ? 'active' : ''}" data-vntoggle="networks">
          ${ICONS.network}
          <span>${t('dockerTabNetworks', this.currentLang)} (${this.networksList.length})</span>
        </button>
      </div>

      ${this.subToggleVN === 'volumes' ? this.renderVolumesView() : this.renderNetworksView()}
    `;
  }

  private renderVolumesView(): string {
    const volumes = this.volumesList;
    const filtered = volumes.filter((v) => {
      if (this.filterQuery) {
        return v.name.toLowerCase().includes(this.filterQuery.toLowerCase());
      }
      return true;
    });

    return `
      <div class="docker-toolbar">
        <button class="btn btn-secondary btn-sm" id="docker-prune-volumes-btn">
          ${ICONS.trash}
          <span>${t('dockerPruneVolumes', this.currentLang)}</span>
        </button>
        <button class="icon-btn-secondary" id="docker-refresh-volumes" title="${t('refresh', this.currentLang)}">
          <span class="${this.isLoading ? 'spin-icon' : ''}">${ICONS.sync}</span>
        </button>
      </div>

      <div class="docker-search-bar">
        <span class="search-icon">${ICONS.search}</span>
        <input
          type="text"
          id="docker-vn-search"
          class="input-box docker-search-input"
          placeholder="${t('dockerSearchVolumes', this.currentLang)}"
          value="${this.escapeHtml(this.filterQuery)}"
        />
      </div>

      ${
        filtered.length === 0
          ? `
        <div class="docker-empty-state">
          <span class="empty-icon">${ICONS.database}</span>
          <p>${t('dockerNoVolumes', this.currentLang)}</p>
        </div>
      `
          : `
        <div class="docker-cards-list">
          ${filtered
            .map(
              (v) => `
            <div class="docker-item-card vn-card">
              <div class="card-header">
                <div class="card-title-group">
                  <span class="vn-title copy-id-trigger" data-id="${v.name}" title="Click to copy name">${this.escapeHtml(v.name)}</span>
                </div>
                <div class="card-actions-toolbar">
                  <button class="icon-btn-secondary btn-inspect" data-target="${v.name}" data-type="volume" title="${t('dockerInspect', this.currentLang)}">
                    ${ICONS.eye}
                  </button>
                  <button class="icon-btn-secondary btn-delete-volume" data-name="${v.name}" title="${t('dockerDeleteVolume', this.currentLang)}">
                    ${ICONS.trash}
                  </button>
                </div>
              </div>
              <div class="card-details-grid">
                <div class="detail-row">
                  <span class="detail-label">${t('dockerVolumeDriver', this.currentLang)}</span>
                  <span class="detail-value monospace">${this.escapeHtml(v.driver)}</span>
                </div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `
      }
    `;
  }

  private renderNetworksView(): string {
    const networks = this.networksList;
    const filtered = networks.filter((n) => {
      if (this.filterQuery) {
        return (
          n.name.toLowerCase().includes(this.filterQuery.toLowerCase()) ||
          n.id.toLowerCase().includes(this.filterQuery.toLowerCase())
        );
      }
      return true;
    });

    return `
      <div class="docker-toolbar">
        <div style="flex: 1;"></div>
        <button class="icon-btn-secondary" id="docker-refresh-networks" title="${t('refresh', this.currentLang)}">
          <span class="${this.isLoading ? 'spin-icon' : ''}">${ICONS.sync}</span>
        </button>
      </div>

      <div class="docker-search-bar">
        <span class="search-icon">${ICONS.search}</span>
        <input
          type="text"
          id="docker-vn-search"
          class="input-box docker-search-input"
          placeholder="${t('dockerSearchNetworks', this.currentLang)}"
          value="${this.escapeHtml(this.filterQuery)}"
        />
      </div>

      ${
        filtered.length === 0
          ? `
        <div class="docker-empty-state">
          <span class="empty-icon">${ICONS.network}</span>
          <p>${t('dockerNoNetworks', this.currentLang)}</p>
        </div>
      `
          : `
        <div class="docker-cards-list">
          ${filtered
            .map(
              (n) => `
            <div class="docker-item-card vn-card">
              <div class="card-header">
                <div class="card-title-group">
                  <span class="vn-title" title="${n.name}">${this.escapeHtml(n.name)}</span>
                  <span class="container-id-badge">${n.id.substring(0, 10)}</span>
                </div>
                <div class="card-actions-toolbar">
                  <button class="icon-btn-secondary btn-inspect" data-target="${n.id}" data-type="network" title="${t('dockerInspect', this.currentLang)}">
                    ${ICONS.eye}
                  </button>
                  ${
                    !['bridge', 'host', 'none'].includes(n.name)
                      ? `
                    <button class="icon-btn-secondary btn-delete-network" data-id="${n.id}" data-name="${n.name}" title="${t('dockerDeleteNetwork', this.currentLang)}">
                      ${ICONS.trash}
                    </button>
                  `
                      : ''
                  }
                </div>
              </div>
              <div class="card-details-grid">
                <div class="detail-row">
                  <span class="detail-label">${t('dockerNetworkDriver', this.currentLang)}</span>
                  <span class="detail-value monospace">${this.escapeHtml(n.driver)} (${this.escapeHtml(n.scope)})</span>
                </div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `
      }
    `;
  }

  /**
   * 4. System Resource Stats & Prune Hub
   */
  private renderStatsPruneTab(): string {
    const stats = this.statsList;

    return `
      <!-- Section 1: Resource Monitor -->
      <div class="stats-section-card">
        <div class="section-card-header">
          <div class="header-title-wrap">
            ${ICONS.activity}
            <span class="header-title">${t('dockerStatsTitle', this.currentLang)}</span>
          </div>
          <button class="btn btn-secondary btn-sm" id="docker-refresh-stats-btn">
            <span class="${this.isLoading ? 'spin-icon' : ''}">${ICONS.sync}</span>
            <span>${t('dockerRefreshStats', this.currentLang)}</span>
          </button>
        </div>

        ${
          stats.length === 0
            ? `
          <div class="stats-empty-wrap">
            <p>${t('dockerNoRunningStats', this.currentLang)}</p>
          </div>
        `
            : `
          <div class="stats-cards-grid">
            ${stats.map((s) => this.renderStatItem(s)).join('')}
          </div>
        `
        }
      </div>

      <!-- Section 2: Global System Prune Hub -->
      <div class="prune-hub-card">
        <div class="prune-card-header">
          <div class="prune-title-wrap">
            ${ICONS.kill}
            <span class="prune-title">${t('dockerPruneHubTitle', this.currentLang)}</span>
          </div>
        </div>

        <p class="prune-desc">${t('dockerPruneHubDesc', this.currentLang)}</p>

        <div class="prune-action-row">
          <button class="btn btn-danger btn-master-prune" id="docker-system-prune-btn" ${this.isPruningSystem ? 'disabled' : ''}>
            ${this.isPruningSystem ? `<span class="spin-icon">${ICONS.sync}</span>` : ICONS.trash}
            <span>${this.isPruningSystem ? t('dockerPruning', this.currentLang) : t('dockerRunSystemPrune', this.currentLang)}</span>
          </button>
        </div>
      </div>
    `;
  }

  private renderStatItem(s: DockerContainerStat): string {
    const cpuFloat = parseFloat(s.cpuPerc.replace('%', '')) || 0;
    const memFloat = parseFloat(s.memPerc.replace('%', '')) || 0;

    return `
      <div class="stat-container-card">
        <div class="stat-card-top">
          <span class="stat-container-name" title="${s.name}">${this.escapeHtml(s.name || s.id)}</span>
          <span class="stat-pid-badge">${s.pids} PIDs</span>
        </div>

        <!-- CPU Bar -->
        <div class="stat-metric-row">
          <div class="metric-labels">
            <span>${t('dockerCpuUsage', this.currentLang)}</span>
            <span class="metric-val ${cpuFloat > 75 ? 'val-high' : ''}">${this.escapeHtml(s.cpuPerc)}</span>
          </div>
          <div class="metric-bar-bg">
            <div class="metric-bar-fill fill-cpu" style="width: ${Math.min(100, Math.max(2, cpuFloat))}%;"></div>
          </div>
        </div>

        <!-- Mem Bar -->
        <div class="stat-metric-row">
          <div class="metric-labels">
            <span>${t('dockerMemUsage', this.currentLang)} (${this.escapeHtml(s.memPerc)})</span>
            <span class="metric-val ${memFloat > 80 ? 'val-high' : ''}">${this.escapeHtml(s.memUsage)}</span>
          </div>
          <div class="metric-bar-bg">
            <div class="metric-bar-fill fill-mem" style="width: ${Math.min(100, Math.max(2, memFloat))}%;"></div>
          </div>
        </div>

        <div class="stat-io-row">
          <div class="io-item">
            <span class="io-label">${t('dockerNetIo', this.currentLang)}:</span>
            <span class="io-val monospace">${this.escapeHtml(s.netIO)}</span>
          </div>
          <div class="io-item">
            <span class="io-label">${t('dockerBlockIo', this.currentLang)}:</span>
            <span class="io-val monospace">${this.escapeHtml(s.blockIO)}</span>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================================
  // Modals & Popups Rendering
  // ============================================================================

  private renderActiveModals(): string {
    let html = '';

    // 1. Logs Modal
    if (this.activeLogs) {
      const logs = this.activeLogs;
      let displayLogs = logs.logs;
      if (logs.searchQuery) {
        const q = logs.searchQuery.toLowerCase();
        displayLogs = logs.logs
          .split('\n')
          .filter((line) => line.toLowerCase().includes(q))
          .join('\n');
      }

      html += `
        <div class="docker-modal-backdrop">
          <div class="docker-modal-dialog logs-modal">
            <div class="docker-modal-header">
              <div class="modal-title-wrap">
                ${ICONS.log}
                <span class="modal-title">${t('dockerLogsTitle', this.currentLang)}: ${this.escapeHtml(logs.name)}</span>
              </div>
              <button class="icon-btn-secondary" id="modal-close-logs">${ICONS.clear}</button>
            </div>

            <!-- Logs Toolbar -->
            <div class="logs-modal-toolbar">
              <div class="logs-search-wrap">
                <span class="search-icon">${ICONS.search}</span>
                <input
                  type="text"
                  id="logs-search-filter"
                  class="input-box logs-search-input"
                  placeholder="${t('dockerSearchLogs', this.currentLang)}"
                  value="${this.escapeHtml(logs.searchQuery)}"
                />
              </div>

              <div class="logs-tail-control">
                <span class="tail-label">${t('dockerTailLines', this.currentLang)}</span>
                <select id="logs-tail-select" class="input-box tail-select">
                  <option value="50" ${logs.tail === 50 ? 'selected' : ''}>50</option>
                  <option value="100" ${logs.tail === 100 ? 'selected' : ''}>100</option>
                  <option value="200" ${logs.tail === 200 ? 'selected' : ''}>200</option>
                  <option value="500" ${logs.tail === 500 ? 'selected' : ''}>500</option>
                </select>
              </div>

              <button class="btn btn-secondary btn-sm" id="logs-copy-btn">
                ${ICONS.copy}
                <span>${t('dockerCopyLogs', this.currentLang)}</span>
              </button>
            </div>

            <div class="docker-modal-body">
              <pre class="logs-viewer-pre">${this.escapeHtml(displayLogs || 'No logs found.')}</pre>
            </div>

            <div class="docker-modal-footer">
              <button class="btn btn-secondary" id="modal-footer-close-logs">${t('dockerCloseLogs', this.currentLang)}</button>
            </div>
          </div>
        </div>
      `;
    }

    // 2. Inspect Modal
    if (this.activeInspect) {
      html += `
        <div class="docker-modal-backdrop">
          <div class="docker-modal-dialog inspect-modal">
            <div class="docker-modal-header">
              <div class="modal-title-wrap">
                ${ICONS.eye}
                <span class="modal-title">${this.escapeHtml(this.activeInspect.title)}</span>
              </div>
              <button class="icon-btn-secondary" id="modal-close-inspect">${ICONS.clear}</button>
            </div>

            <div class="docker-modal-body">
              <pre class="inspect-viewer-pre">${this.escapeHtml(this.activeInspect.jsonString)}</pre>
            </div>

            <div class="docker-modal-footer">
              <button class="btn btn-secondary" id="inspect-copy-btn">${ICONS.copy} ${t('copy', this.currentLang)}</button>
              <button class="btn btn-primary" id="modal-footer-close-inspect">${t('clear', this.currentLang)}</button>
            </div>
          </div>
        </div>
      `;
    }

    // 3. Run Container Modal
    if (this.activeRunModal) {
      const modal = this.activeRunModal;
      html += `
        <div class="docker-modal-backdrop">
          <div class="docker-modal-dialog run-modal">
            <div class="docker-modal-header">
              <div class="modal-title-wrap">
                ${ICONS.play}
                <span class="modal-title">${t('dockerRunModalTitle', this.currentLang)}</span>
              </div>
              <button class="icon-btn-secondary" id="modal-close-run">${ICONS.clear}</button>
            </div>

            <div class="docker-modal-body">
              <div class="form-group">
                <label class="form-label">${t('dockerImage', this.currentLang)}</label>
                <input type="text" class="input-box" value="${this.escapeHtml(modal.image)}" readonly />
              </div>

              <div class="form-group">
                <label class="form-label">${t('dockerRunContainerName', this.currentLang)}</label>
                <input type="text" id="run-container-name" class="input-box" placeholder="e.g. my-app-1" value="${this.escapeHtml(modal.name)}" />
              </div>

              <div class="form-group">
                <label class="form-label">${t('dockerRunPorts', this.currentLang)}</label>
                <input type="text" id="run-container-ports" class="input-box" placeholder="e.g. 8080:80, 3000:3000" value="${this.escapeHtml(modal.ports)}" />
              </div>

              <div class="form-group">
                <label class="form-label">${t('dockerRunEnv', this.currentLang)}</label>
                <input type="text" id="run-container-env" class="input-box" placeholder="e.g. NODE_ENV=production, PORT=80" value="${this.escapeHtml(modal.env)}" />
              </div>

              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="run-container-detached" ${modal.detached ? 'checked' : ''} />
                  <span>${t('dockerRunDetached', this.currentLang)}</span>
                </label>
              </div>
            </div>

            <div class="docker-modal-footer">
              <button class="btn btn-secondary" id="modal-cancel-run">${t('dockerCancel', this.currentLang)}</button>
              <button class="btn btn-primary" id="modal-submit-run">${ICONS.play} ${t('dockerRunLaunch', this.currentLang)}</button>
            </div>
          </div>
        </div>
      `;
    }

    // 4. Safe Confirm Modal
    if (this.activeConfirmModal) {
      const confirm = this.activeConfirmModal;
      html += `
        <div class="docker-modal-backdrop">
          <div class="docker-modal-dialog confirm-modal">
            <div class="docker-modal-header">
              <span class="modal-title">${this.escapeHtml(confirm.title)}</span>
              <button class="icon-btn-secondary" id="modal-close-confirm">${ICONS.clear}</button>
            </div>

            <div class="docker-modal-body">
              <p class="confirm-message">${this.escapeHtml(confirm.message)}</p>
            </div>

            <div class="docker-modal-footer">
              <button class="btn btn-secondary" id="modal-cancel-confirm">${t('dockerCancel', this.currentLang)}</button>
              <button class="btn ${confirm.danger ? 'btn-danger' : 'btn-primary'}" id="modal-action-confirm">${this.escapeHtml(confirm.confirmText)}</button>
            </div>
          </div>
        </div>
      `;
    }

    return html;
  }

  /**
   * Offline Alert View
   */
  private renderOfflineView(isMissingCli: boolean) {
    this.container.innerHTML = `
      <div class="docker-superdeck-wrapper">
        <div class="docker-alert-card ${isMissingCli ? 'alert-error' : 'alert-warning'}">
          <div class="alert-header">
            ${ICONS.docker}
            <span class="alert-title">
              ${isMissingCli ? t('dockerNotInstalled', this.currentLang) : t('dockerDaemonNotRunning', this.currentLang)}
            </span>
          </div>

          <p class="alert-desc">${t('dockerDaemonOfflineTips', this.currentLang)}</p>

          <div class="alert-actions">
            <button class="btn btn-primary" id="docker-retry-btn">
              ${ICONS.sync}
              <span>${t('dockerRetry', this.currentLang)}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const retryBtn = this.container.querySelector('#docker-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.refreshContainers();
      });
    }
  }

  // ============================================================================
  // Event Listeners Setup
  // ============================================================================

  private setupEventListeners() {
    // 1. Sub-Tab Switcher
    const subTabButtons = this.container.querySelectorAll('.docker-subtab-btn');
    subTabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = (btn as HTMLElement).getAttribute('data-subtab') as any;
        if (target && target !== this.activeSubTab) {
          this.activeSubTab = target;
          this.filterQuery = '';
          this.render();
          this.refreshActiveTab();
        }
      });
    });

    // 2. Volumes / Networks Toggle
    const vnButtons = this.container.querySelectorAll('[data-vntoggle]');
    vnButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const toggle = (btn as HTMLElement).getAttribute('data-vntoggle') as any;
        if (toggle && toggle !== this.subToggleVN) {
          this.subToggleVN = toggle;
          this.render();
          if (this.subToggleVN === 'volumes') this.refreshVolumes();
          else this.refreshNetworks();
        }
      });
    });

    // 3. Filter state pills (all, running, stopped)
    const filterPills = this.container.querySelectorAll('[data-filter]');
    filterPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const st = (pill as HTMLElement).getAttribute('data-filter') as any;
        if (st) {
          this.filterState = st;
          this.render();
        }
      });
    });

    // 4. Search inputs
    const containerSearch = this.container.querySelector('#docker-container-search') as HTMLInputElement;
    if (containerSearch) {
      containerSearch.addEventListener('input', (e) => {
        this.filterQuery = (e.target as HTMLInputElement).value;
        this.render();
      });
    }

    const imageSearch = this.container.querySelector('#docker-image-search') as HTMLInputElement;
    if (imageSearch) {
      imageSearch.addEventListener('input', (e) => {
        this.filterQuery = (e.target as HTMLInputElement).value;
        this.render();
      });
    }

    const vnSearch = this.container.querySelector('#docker-vn-search') as HTMLInputElement;
    if (vnSearch) {
      vnSearch.addEventListener('input', (e) => {
        this.filterQuery = (e.target as HTMLInputElement).value;
        this.render();
      });
    }

    // 5. Refresh buttons
    this.container.querySelector('#docker-refresh-containers')?.addEventListener('click', () => this.refreshContainers());
    this.container.querySelector('#docker-refresh-images')?.addEventListener('click', () => this.refreshImages());
    this.container.querySelector('#docker-refresh-volumes')?.addEventListener('click', () => this.refreshVolumes());
    this.container.querySelector('#docker-refresh-networks')?.addEventListener('click', () => this.refreshNetworks());
    this.container.querySelector('#docker-refresh-stats-btn')?.addEventListener('click', () => this.refreshStats());

    // 6. Action buttons on containers (start, stop, restart, pause, unpause)
    const actionButtons = this.container.querySelectorAll('.btn-action');
    actionButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).getAttribute('data-action') as any;
        const containerId = (btn as HTMLElement).getAttribute('data-id');
        if (action && containerId) {
          this.actionInProgress[containerId] = action;
          this.render();
          this.postMessage({ type: 'dockerAction', action, containerId });
        }
      });
    });

    // 7. Container delete button (with confirmation)
    const deleteContainerButtons = this.container.querySelectorAll('.btn-delete-container');
    deleteContainerButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const containerId = (btn as HTMLElement).getAttribute('data-id');
        const containerName = (btn as HTMLElement).getAttribute('data-name');
        if (containerId) {
          this.activeConfirmModal = {
            title: t('dockerRemove', this.currentLang),
            message: `Are you sure you want to remove container "${containerName || containerId}"?`,
            confirmText: t('dockerRemove', this.currentLang),
            danger: true,
            onConfirm: () => {
              this.postMessage({ type: 'dockerAction', action: 'remove', containerId });
            }
          };
          this.render();
        }
      });
    });

    // 8. Terminal button
    const terminalButtons = this.container.querySelectorAll('.btn-terminal');
    terminalButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const containerId = (btn as HTMLElement).getAttribute('data-id');
        const name = (btn as HTMLElement).getAttribute('data-name');
        if (containerId) {
          this.postMessage({ type: 'dockerExecTerminal', containerId, name, shell: 'sh' });
        }
      });
    });

    // 9. Inspect buttons
    const inspectButtons = this.container.querySelectorAll('.btn-inspect');
    inspectButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = (btn as HTMLElement).getAttribute('data-target');
        const targetType = (btn as HTMLElement).getAttribute('data-type');
        if (target) {
          this.postMessage({ type: 'dockerInspect', target, targetType });
        }
      });
    });

    // 10. Logs buttons
    const logsButtons = this.container.querySelectorAll('.btn-logs');
    logsButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const containerId = (btn as HTMLElement).getAttribute('data-id');
        const name = (btn as HTMLElement).getAttribute('data-name');
        if (containerId) {
          this.postMessage({ type: 'dockerGetLogs', containerId, name, tail: 100 });
        }
      });
    });

    // 11. Pull Image button
    const pullBtn = this.container.querySelector('#docker-pull-btn');
    const pullInput = this.container.querySelector('#docker-pull-input') as HTMLInputElement;
    if (pullBtn && pullInput) {
      pullBtn.addEventListener('click', () => {
        const imageName = pullInput.value.trim();
        if (imageName) {
          this.isPullingImage = true;
          this.render();
          this.postMessage({ type: 'dockerPullImage', imageName });
        }
      });
    }

    // 12. Prune Images button
    this.container.querySelector('#docker-prune-images-btn')?.addEventListener('click', () => {
      this.activeConfirmModal = {
        title: t('dockerPruneImages', this.currentLang),
        message: t('dockerConfirmPruneImages', this.currentLang),
        confirmText: t('dockerPruneImages', this.currentLang),
        danger: true,
        onConfirm: () => {
          this.postMessage({ type: 'dockerPruneImages', all: true });
        }
      };
      this.render();
    });

    // 13. Run Image button -> opens Run Modal
    const runImageButtons = this.container.querySelectorAll('.btn-run-image');
    runImageButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const image = (btn as HTMLElement).getAttribute('data-image');
        if (image) {
          this.activeRunModal = {
            image,
            name: '',
            ports: '',
            env: '',
            detached: true
          };
          this.render();
        }
      });
    });

    // 14. Delete Image button
    const deleteImageButtons = this.container.querySelectorAll('.btn-delete-image');
    deleteImageButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const imageId = (btn as HTMLElement).getAttribute('data-id');
        if (imageId) {
          this.activeConfirmModal = {
            title: t('dockerDeleteImage', this.currentLang),
            message: t('dockerConfirmDeleteImage', this.currentLang),
            confirmText: t('dockerDeleteImage', this.currentLang),
            danger: true,
            onConfirm: () => {
              this.postMessage({ type: 'dockerRemoveImage', imageId, force: false });
            }
          };
          this.render();
        }
      });
    });

    // 15. Delete Volume button
    const deleteVolumeButtons = this.container.querySelectorAll('.btn-delete-volume');
    deleteVolumeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const name = (btn as HTMLElement).getAttribute('data-name');
        if (name) {
          this.activeConfirmModal = {
            title: t('dockerDeleteVolume', this.currentLang),
            message: t('dockerConfirmDeleteVolume', this.currentLang),
            confirmText: t('dockerDeleteVolume', this.currentLang),
            danger: true,
            onConfirm: () => {
              this.postMessage({ type: 'dockerRemoveVolume', name });
            }
          };
          this.render();
        }
      });
    });

    // 16. Prune Volumes button
    this.container.querySelector('#docker-prune-volumes-btn')?.addEventListener('click', () => {
      this.activeConfirmModal = {
        title: t('dockerPruneVolumes', this.currentLang),
        message: t('dockerConfirmDeleteVolume', this.currentLang),
        confirmText: t('dockerPruneVolumes', this.currentLang),
        danger: true,
        onConfirm: () => {
          this.postMessage({ type: 'dockerPruneVolumes' });
        }
      };
      this.render();
    });

    // 17. Delete Network button
    const deleteNetworkButtons = this.container.querySelectorAll('.btn-delete-network');
    deleteNetworkButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).getAttribute('data-id');
        const name = (btn as HTMLElement).getAttribute('data-name');
        if (id) {
          this.activeConfirmModal = {
            title: t('dockerDeleteNetwork', this.currentLang),
            message: `Are you sure you want to delete network "${name || id}"?`,
            confirmText: t('dockerDeleteNetwork', this.currentLang),
            danger: true,
            onConfirm: () => {
              this.postMessage({ type: 'dockerRemoveNetwork', id });
            }
          };
          this.render();
        }
      });
    });

    // 18. Master System Prune button
    this.container.querySelector('#docker-system-prune-btn')?.addEventListener('click', () => {
      this.activeConfirmModal = {
        title: t('dockerRunSystemPrune', this.currentLang),
        message: t('dockerConfirmSystemPrune', this.currentLang),
        confirmText: t('dockerRunSystemPrune', this.currentLang),
        danger: true,
        onConfirm: () => {
          this.isPruningSystem = true;
          this.render();
          this.postMessage({ type: 'dockerSystemPrune', includeVolumes: true });
        }
      };
      this.render();
    });

    // 19. Copy ID triggers
    const copyTriggers = this.container.querySelectorAll('.copy-id-trigger');
    copyTriggers.forEach((el) => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = (el as HTMLElement).getAttribute('data-id');
        if (id) {
          await navigator.clipboard.writeText(id);
          this.copiedId = id;
          this.render();
          if (this.copiedIdTimeout) clearTimeout(this.copiedIdTimeout);
          this.copiedIdTimeout = setTimeout(() => {
            this.copiedId = null;
            this.render();
          }, 1500);
        }
      });
    });

    // 20. Modal Event Listeners
    this.setupModalEventListeners();
  }

  private setupModalEventListeners() {
    // Logs Modal Events
    if (this.activeLogs) {
      const closeLogs = () => {
        this.activeLogs = null;
        this.render();
      };
      this.container.querySelector('#modal-close-logs')?.addEventListener('click', closeLogs);
      this.container.querySelector('#modal-footer-close-logs')?.addEventListener('click', closeLogs);

      const logsSearch = this.container.querySelector('#logs-search-filter') as HTMLInputElement;
      if (logsSearch) {
        logsSearch.addEventListener('input', (e) => {
          if (this.activeLogs) {
            this.activeLogs.searchQuery = (e.target as HTMLInputElement).value;
            this.render();
          }
        });
      }

      const tailSelect = this.container.querySelector('#logs-tail-select') as HTMLSelectElement;
      if (tailSelect) {
        tailSelect.addEventListener('change', () => {
          if (this.activeLogs) {
            const tail = parseInt(tailSelect.value, 10) || 100;
            this.activeLogs.tail = tail;
            this.postMessage({
              type: 'dockerGetLogs',
              containerId: this.activeLogs.containerId,
              name: this.activeLogs.name,
              tail
            });
          }
        });
      }

      this.container.querySelector('#logs-copy-btn')?.addEventListener('click', async () => {
        if (this.activeLogs) {
          await navigator.clipboard.writeText(this.activeLogs.logs);
        }
      });
    }

    // Inspect Modal Events
    if (this.activeInspect) {
      const closeInspect = () => {
        this.activeInspect = null;
        this.render();
      };
      this.container.querySelector('#modal-close-inspect')?.addEventListener('click', closeInspect);
      this.container.querySelector('#modal-footer-close-inspect')?.addEventListener('click', closeInspect);

      this.container.querySelector('#inspect-copy-btn')?.addEventListener('click', async () => {
        if (this.activeInspect) {
          await navigator.clipboard.writeText(this.activeInspect.jsonString);
        }
      });
    }

    // Run Modal Events
    if (this.activeRunModal) {
      const closeRun = () => {
        this.activeRunModal = null;
        this.render();
      };
      this.container.querySelector('#modal-close-run')?.addEventListener('click', closeRun);
      this.container.querySelector('#modal-cancel-run')?.addEventListener('click', closeRun);

      this.container.querySelector('#modal-submit-run')?.addEventListener('click', () => {
        if (!this.activeRunModal) return;
        const nameInput = this.container.querySelector('#run-container-name') as HTMLInputElement;
        const portsInput = this.container.querySelector('#run-container-ports') as HTMLInputElement;
        const envInput = this.container.querySelector('#run-container-env') as HTMLInputElement;
        const detachedInput = this.container.querySelector('#run-container-detached') as HTMLInputElement;

        const config: DockerRunContainerConfig = {
          image: this.activeRunModal.image,
          name: nameInput?.value.trim() || undefined,
          ports: portsInput?.value.trim() || undefined,
          env: envInput?.value.trim() || undefined,
          detached: detachedInput ? detachedInput.checked : true
        };

        this.postMessage({ type: 'dockerRunContainer', config });
      });
    }

    // Confirm Modal Events
    if (this.activeConfirmModal) {
      const closeConfirm = () => {
        this.activeConfirmModal = null;
        this.render();
      };
      this.container.querySelector('#modal-close-confirm')?.addEventListener('click', closeConfirm);
      this.container.querySelector('#modal-cancel-confirm')?.addEventListener('click', closeConfirm);

      this.container.querySelector('#modal-action-confirm')?.addEventListener('click', () => {
        if (this.activeConfirmModal) {
          const cb = this.activeConfirmModal.onConfirm;
          this.activeConfirmModal = null;
          this.render();
          cb();
        }
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
