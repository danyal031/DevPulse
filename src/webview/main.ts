import { Language, t, translations } from './i18n';
import { ICONS } from './icons';
import { JsonTsZodView } from './components/JsonTsZodView';
import { JwtView } from './components/JwtView';
import { PersianJalaliView } from './components/PersianJalaliView';
import { PortManagerView } from './components/PortManagerView';
import { GitWizardView } from './components/GitWizardView';
import { DockerView } from './components/DockerView';
import { ApiTesterView } from './components/ApiTesterView';
import { SqlPlaygroundView } from './components/SqlPlaygroundView';
import { LogAnalyzerView } from './components/LogAnalyzerView';
import { CryptoMockView } from './components/CryptoMockView';
import { MockServerView } from './components/MockServerView';
import { TunnelView } from './components/TunnelView';
import { SystemMonitorView } from './components/SystemMonitorView';
import { LoadTesterView } from './components/LoadTesterView';
import { CodeSnapshotView } from './components/CodeSnapshotView';
import { CommandCenterView } from './components/CommandCenterView';
import { CssDesignerView } from './components/CssDesignerView';
import { CacheCleanerView } from './components/CacheCleanerView';
import { BundleRadarView } from './components/BundleRadarView';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): any;
  setState(state: any): void;
};

const vscode = acquireVsCodeApi();

interface FeatureTool {
  id: string;
  category: 'dev' | 'network' | 'ops' | 'system';
  icon: string;
  titleKey: keyof typeof translations['en'];
  subKey: keyof typeof translations['en'];
  guideKey: keyof typeof translations['en'];
}

const FEATURE_TOOLS: FeatureTool[] = [
  // Dev & Design (8)
  { id: 'json', category: 'dev', icon: ICONS.brackets, titleKey: 'tabJson', subKey: 'subJson', guideKey: 'guide_json' },
  { id: 'jwt', category: 'dev', icon: ICONS.shield, titleKey: 'tabJwt', subKey: 'subJwt', guideKey: 'guide_jwt' },
  { id: 'persian', category: 'dev', icon: ICONS.calendar, titleKey: 'tabPersian', subKey: 'subPersian', guideKey: 'guide_persian' },
  { id: 'crypto', category: 'dev', icon: ICONS.key, titleKey: 'tabCrypto', subKey: 'subCrypto', guideKey: 'guide_crypto' },
  { id: 'sql', category: 'dev', icon: ICONS.database, titleKey: 'tabSql', subKey: 'subSql', guideKey: 'guide_sql' },
  { id: 'snapshot', category: 'dev', icon: ICONS.camera, titleKey: 'tabSnapshot', subKey: 'subSnapshot', guideKey: 'guide_snapshot' },
  { id: 'cssdesign', category: 'dev', icon: ICONS.palette, titleKey: 'tabCssDesigner', subKey: 'subCssDesigner', guideKey: 'guide_cssdesign' },
  { id: 'bundleradar', category: 'dev', icon: ICONS.weight, titleKey: 'tabBundleRadar', subKey: 'subBundleRadar', guideKey: 'guide_bundleradar' },

  // Network & API (4)
  { id: 'api', category: 'network', icon: ICONS.send, titleKey: 'tabApi', subKey: 'subApi', guideKey: 'guide_api' },
  { id: 'mock', category: 'network', icon: ICONS.webhook, titleKey: 'tabMock', subKey: 'subMock', guideKey: 'guide_mock' },
  { id: 'tunnel', category: 'network', icon: ICONS.tunnel, titleKey: 'tabTunnel', subKey: 'subTunnel', guideKey: 'guide_tunnel' },
  { id: 'loadtest', category: 'network', icon: ICONS.speed, titleKey: 'tabLoadTest', subKey: 'subLoadtest', guideKey: 'guide_loadtest' },

  // Project & Ops (3)
  { id: 'commandcenter', category: 'ops', icon: ICONS.playCircle, titleKey: 'tabCommandCenter', subKey: 'subCommandCenter', guideKey: 'guide_commandcenter' },
  { id: 'docker', category: 'ops', icon: ICONS.docker, titleKey: 'tabDocker', subKey: 'subDocker', guideKey: 'guide_docker' },
  { id: 'git', category: 'ops', icon: ICONS.git, titleKey: 'tabGit', subKey: 'subGit', guideKey: 'guide_git' },

  // System & Cleanup (4)
  { id: 'ports', category: 'system', icon: ICONS.server, titleKey: 'tabPorts', subKey: 'subPorts', guideKey: 'guide_ports' },
  { id: 'sysmon', category: 'system', icon: ICONS.cpu, titleKey: 'tabSysMon', subKey: 'subSysmon', guideKey: 'guide_sysmon' },
  { id: 'logs', category: 'system', icon: ICONS.fileText, titleKey: 'tabLogs', subKey: 'subLogs', guideKey: 'guide_logs' },
  { id: 'cleaner', category: 'system', icon: ICONS.broom, titleKey: 'tabCleaner', subKey: 'subCleaner', guideKey: 'guide_cleaner' }
];

class DevShelfApp {
  private currentLang: Language = 'en';
  private activeTab: string = 'hub';
  private selectedCategory: string = 'all';
  private searchQuery: string = '';

  private jsonView!: JsonTsZodView;
  private jwtView!: JwtView;
  private persianView!: PersianJalaliView;
  private portView!: PortManagerView;
  private gitView!: GitWizardView;
  private dockerView!: DockerView;
  private apiView!: ApiTesterView;
  private sqlView!: SqlPlaygroundView;
  private logsView!: LogAnalyzerView;
  private cryptoView!: CryptoMockView;
  private mockView!: MockServerView;
  private tunnelView!: TunnelView;
  private sysmonView!: SystemMonitorView;
  private loadTesterView!: LoadTesterView;
  private snapshotView!: CodeSnapshotView;
  private commandCenterView!: CommandCenterView;
  private cssDesignerView!: CssDesignerView;
  private cleanerView!: CacheCleanerView;
  private bundleRadarView!: BundleRadarView;

  constructor() {
    this.restoreState();
    this.initDom();
    this.initViews();
    this.setupListeners();
    this.updateLanguageUI();
    this.switchTab(this.activeTab);
  }

  private restoreState() {
    const state = vscode.getState();
    if (state) {
      if (state.lang) {
        this.currentLang = state.lang;
      }
      if (state.activeTab) {
        this.activeTab = state.activeTab;
      }
      if (state.selectedCategory) {
        this.selectedCategory = state.selectedCategory;
      }
    }
  }

  private saveCurrentState() {
    vscode.setState({
      lang: this.currentLang,
      activeTab: this.activeTab,
      selectedCategory: this.selectedCategory,
      jsonState: this.jsonView ? this.jsonView.getState() : undefined,
      jwtState: this.jwtView ? this.jwtView.getState() : undefined,
      persianState: this.persianView ? this.persianView.getState() : undefined,
      gitState: this.gitView ? this.gitView.getState() : undefined,
      dockerState: this.dockerView ? this.dockerView.getState() : undefined,
      apiState: this.apiView ? this.apiView.getState() : undefined,
      sqlState: this.sqlView ? this.sqlView.getState() : undefined,
      logsState: this.logsView ? this.logsView.getState() : undefined,
      cryptoState: this.cryptoView ? this.cryptoView.getState() : undefined,
      mockState: this.mockView ? this.mockView.getState() : undefined,
      tunnelState: this.tunnelView ? this.tunnelView.getState() : undefined,
      sysmonState: this.sysmonView ? this.sysmonView.getState() : undefined,
      loadTesterState: this.loadTesterView ? this.loadTesterView.getState() : undefined,
      snapshotState: this.snapshotView ? this.snapshotView.getState() : undefined,
      commandCenterState: this.commandCenterView ? this.commandCenterView.getState() : undefined,
      cssDesignerState: this.cssDesignerView ? this.cssDesignerView.getState() : undefined,
      cleanerState: this.cleanerView ? this.cleanerView.getState() : undefined,
      bundleRadarState: this.bundleRadarView ? this.bundleRadarView.getState() : undefined
    });
  }

  private renderHubCardsHtml(): string {
    const q = this.searchQuery.trim().toLowerCase();
    return FEATURE_TOOLS.map((tool) => {
      const matchesCat = this.selectedCategory === 'all' || tool.category === this.selectedCategory;
      const title = t(tool.titleKey, this.currentLang).toLowerCase();
      const sub = t(tool.subKey, this.currentLang).toLowerCase();
      const guide = t(tool.guideKey, this.currentLang).toLowerCase();
      const matchesSearch = !q || title.includes(q) || sub.includes(q) || guide.includes(q) || tool.id.toLowerCase().includes(q);
      const isVisible = matchesCat && matchesSearch;
      return `
        <div class="hub-card cat-${tool.category} ${!isVisible ? 'hidden' : ''}" 
             data-tab="${tool.id}" 
             id="hub-card-${tool.id}"
             role="button"
             tabindex="0"
             title="${t(tool.titleKey, this.currentLang)} — ${t(tool.subKey, this.currentLang)}">
          <div class="hub-card-top">
            <div class="hub-card-icon-box">
              ${tool.icon}
            </div>
            <span class="hub-card-cat-badge">${tool.category.toUpperCase()}</span>
          </div>
          <div class="hub-card-body">
            <div class="hub-card-title">${t(tool.titleKey, this.currentLang)}</div>
            <div class="hub-card-sub">${t(tool.subKey, this.currentLang)}</div>
            <div class="hub-card-guide">${t(tool.guideKey, this.currentLang)}</div>
          </div>
          <div class="hub-card-footer">
            <span class="hub-card-action">${this.currentLang === 'fa' ? 'ورود به ابزار' : 'Launch Workspace'}</span>
            <span class="hub-card-chevron">${this.currentLang === 'fa' ? ICONS.chevronLeft : ICONS.chevronRight}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  private initDom() {
    const root = document.getElementById('app-root')!;

    root.innerHTML = `
      <header class="header-bar">
        <div class="brand-wrapper">
          <span class="brand-icon">${ICONS.wand}</span>
          <span class="brand-title" id="brand-title">${t('appName', this.currentLang)}</span>
          <span class="brand-badge">PRO</span>
        </div>
        <div class="header-actions">
          <button id="lang-toggle-btn" class="lang-toggle-btn" title="Toggle Language (English / فارسی)">
            ${ICONS.globe} <span id="lang-toggle-label">${this.currentLang === 'en' ? 'FA' : 'EN'}</span>
          </button>
        </div>
      </header>

      <!-- Dedicated Hub Page (Visible when activeTab === 'hub') -->
      <section class="hub-page-container" id="hub-page-container">
        <div class="hub-hero-card">
          <div class="hub-hero-meta">
            <h2 class="hub-hero-title" id="hub-hero-title">${t('hubTitle', this.currentLang)}</h2>
            <p class="hub-hero-desc" id="hub-hero-desc">${t('hubSubtitle', this.currentLang)}</p>
          </div>
          <div class="hub-stats-badge">
            <span class="hub-count-num">19</span>
            <span class="hub-count-label" id="hub-count-label">${t('hubToolsCount', this.currentLang)}</span>
          </div>
        </div>

        <!-- Hub Search & Filters -->
        <div class="hub-filter-bar">
          <div class="hub-search-box">
            <span class="hub-search-icon">${ICONS.search}</span>
            <input type="text" id="hub-search-input" class="hub-search-input" placeholder="${t('searchTools', this.currentLang)}" value="${this.searchQuery}" />
            <button id="hub-search-clear" class="hub-search-clear ${this.searchQuery ? 'visible' : ''}" title="${t('clearSearch', this.currentLang)}">${ICONS.clear}</button>
          </div>

          <div class="hub-categories-bar" id="hub-categories-bar">
            <button class="hub-cat-chip ${this.selectedCategory === 'all' ? 'active' : ''}" data-cat="all">
              <span>${t('deckCatAll', this.currentLang)}</span>
              <span class="cat-count">19</span>
            </button>
            <button class="hub-cat-chip ${this.selectedCategory === 'dev' ? 'active' : ''}" data-cat="dev">
              <span>${t('deckCatDev', this.currentLang)}</span>
              <span class="cat-count">8</span>
            </button>
            <button class="hub-cat-chip ${this.selectedCategory === 'network' ? 'active' : ''}" data-cat="network">
              <span>${t('deckCatNetwork', this.currentLang)}</span>
              <span class="cat-count">4</span>
            </button>
            <button class="hub-cat-chip ${this.selectedCategory === 'ops' ? 'active' : ''}" data-cat="ops">
              <span>${t('deckCatOps', this.currentLang)}</span>
              <span class="cat-count">3</span>
            </button>
            <button class="hub-cat-chip ${this.selectedCategory === 'system' ? 'active' : ''}" data-cat="system">
              <span>${t('deckCatSystem', this.currentLang)}</span>
              <span class="cat-count">4</span>
            </button>
          </div>
        </div>

        <!-- Large, High-Readability Hub Cards Grid -->
        <div class="hub-cards-grid" id="hub-cards-grid">
          ${this.renderHubCardsHtml()}
        </div>
      </section>

      <!-- Dedicated Tool Workspace (Visible when activeTab !== 'hub') -->
      <section class="tool-workspace-container" id="tool-workspace-container">
        <!-- Top Tool Navigation Bar with Back Button -->
        <div class="tool-top-bar" id="tool-top-bar">
          <button id="btn-back-to-hub" class="btn btn-secondary btn-sm back-to-hub-btn" title="${t('backToHub', this.currentLang)}">
            <span class="back-icon" id="back-chevron-icon">${this.currentLang === 'fa' ? ICONS.chevronRight : ICONS.chevronLeft}</span>
            <span id="btn-back-label">${t('backToHub', this.currentLang)}</span>
          </button>

          <div class="current-tool-badge" id="current-tool-badge">
            <span class="current-tool-icon" id="current-tool-icon"></span>
            <span class="current-tool-title" id="current-tool-title"></span>
            <span class="current-tool-cat" id="current-tool-cat"></span>
          </div>
        </div>

        <!-- Tool Scope & Explanatory Guide Banner -->
        <div class="tool-guide-card" id="tool-guide-card">
          <div class="tool-guide-header">
            <div class="tool-guide-title-wrap">
              <span class="tool-guide-icon">${ICONS.info}</span>
              <span class="tool-guide-title" id="tool-guide-title">${t('toolGuideTitle', this.currentLang)}</span>
            </div>
          </div>
          <p class="tool-guide-text" id="tool-guide-text"></p>
        </div>

        <!-- Main View Panels (Only the active one is shown) -->
        <main class="main-content-area">
          <div id="view-json" class="view-panel"></div>
          <div id="view-jwt" class="view-panel"></div>
          <div id="view-persian" class="view-panel"></div>
          <div id="view-ports" class="view-panel"></div>
          <div id="view-git" class="view-panel"></div>
          <div id="view-docker" class="view-panel"></div>
          <div id="view-api" class="view-panel"></div>
          <div id="view-sql" class="view-panel"></div>
          <div id="view-logs" class="view-panel"></div>
          <div id="view-crypto" class="view-panel"></div>
          <div id="view-mock" class="view-panel"></div>
          <div id="view-tunnel" class="view-panel"></div>
          <div id="view-sysmon" class="view-panel"></div>
          <div id="view-loadtest" class="view-panel"></div>
          <div id="view-snapshot" class="view-panel"></div>
          <div id="view-commandcenter" class="view-panel"></div>
          <div id="view-cssdesign" class="view-panel"></div>
          <div id="view-cleaner" class="view-panel"></div>
          <div id="view-bundleradar" class="view-panel"></div>
        </main>
      </section>
    `;
  }

  private initViews() {
    const postToHost = (msg: any) => vscode.postMessage(msg);

    const jsonContainer = document.getElementById('view-json')!;
    const jwtContainer = document.getElementById('view-jwt')!;
    const persianContainer = document.getElementById('view-persian')!;
    const portsContainer = document.getElementById('view-ports')!;
    const gitContainer = document.getElementById('view-git')!;
    const dockerContainer = document.getElementById('view-docker')!;
    const apiContainer = document.getElementById('view-api')!;
    const sqlContainer = document.getElementById('view-sql')!;
    const logsContainer = document.getElementById('view-logs')!;
    const cryptoContainer = document.getElementById('view-crypto')!;
    const mockContainer = document.getElementById('view-mock')!;
    const tunnelContainer = document.getElementById('view-tunnel')!;
    const sysmonContainer = document.getElementById('view-sysmon')!;
    const loadtestContainer = document.getElementById('view-loadtest')!;
    const snapshotContainer = document.getElementById('view-snapshot')!;
    const cmdCenterContainer = document.getElementById('view-commandcenter')!;
    const cssDesignContainer = document.getElementById('view-cssdesign')!;
    const cleanerContainer = document.getElementById('view-cleaner')!;
    const bundleRadarContainer = document.getElementById('view-bundleradar')!;

    this.jsonView = new JsonTsZodView(jsonContainer, this.currentLang, postToHost);
    this.jwtView = new JwtView(jwtContainer, this.currentLang, postToHost);
    this.persianView = new PersianJalaliView(persianContainer, this.currentLang, postToHost);
    this.portView = new PortManagerView(portsContainer, this.currentLang, postToHost);
    this.gitView = new GitWizardView(gitContainer, this.currentLang, postToHost);
    this.dockerView = new DockerView(dockerContainer, this.currentLang, postToHost);
    this.apiView = new ApiTesterView(apiContainer, this.currentLang, postToHost);
    this.sqlView = new SqlPlaygroundView(sqlContainer, this.currentLang, postToHost);
    this.logsView = new LogAnalyzerView(logsContainer, this.currentLang, postToHost);
    this.cryptoView = new CryptoMockView(cryptoContainer, this.currentLang, postToHost);
    this.mockView = new MockServerView(mockContainer, this.currentLang, postToHost);
    this.tunnelView = new TunnelView(tunnelContainer, this.currentLang, postToHost);
    this.sysmonView = new SystemMonitorView(sysmonContainer, this.currentLang, postToHost);
    this.loadTesterView = new LoadTesterView(loadtestContainer, this.currentLang, postToHost);
    this.snapshotView = new CodeSnapshotView(snapshotContainer, this.currentLang, postToHost);
    this.commandCenterView = new CommandCenterView(cmdCenterContainer, this.currentLang, postToHost);
    this.cssDesignerView = new CssDesignerView(cssDesignContainer, this.currentLang, postToHost);
    this.cleanerView = new CacheCleanerView(cleanerContainer, this.currentLang, postToHost);
    this.bundleRadarView = new BundleRadarView(bundleRadarContainer, this.currentLang, postToHost);

    const state = vscode.getState();
    if (state) {
      if (state.jsonState) this.jsonView.restoreState(state.jsonState);
      if (state.jwtState) this.jwtView.restoreState(state.jwtState);
      if (state.persianState) this.persianView.restoreState(state.persianState);
      if (state.gitState) this.gitView.restoreState(state.gitState);
      if (state.dockerState) this.dockerView.restoreState(state.dockerState);
      if (state.apiState) this.apiView.restoreState(state.apiState);
      if (state.sqlState) this.sqlView.restoreState(state.sqlState);
      if (state.logsState) this.logsView.restoreState(state.logsState);
      if (state.cryptoState) this.cryptoView.restoreState(state.cryptoState);
      if (state.mockState) this.mockView.restoreState(state.mockState);
      if (state.tunnelState) this.tunnelView.restoreState(state.tunnelState);
      if (state.sysmonState) this.sysmonView.restoreState(state.sysmonState);
      if (state.loadTesterState) this.loadTesterView.restoreState(state.loadTesterState);
      if (state.snapshotState) this.snapshotView.restoreState(state.snapshotState);
      if (state.commandCenterState) this.commandCenterView.restoreState(state.commandCenterState);
      if (state.cssDesignerState) this.cssDesignerView.restoreState(state.cssDesignerState);
      if (state.cleanerState) this.cleanerView.restoreState(state.cleanerState);
      if (state.bundleRadarState) this.bundleRadarView.restoreState(state.bundleRadarState);
    }
  }

  private setupListeners() {
    // Language Toggle
    const langBtn = document.getElementById('lang-toggle-btn')!;
    langBtn.addEventListener('click', () => {
      this.currentLang = this.currentLang === 'en' ? 'fa' : 'en';
      this.updateLanguageUI();
      this.saveCurrentState();
      vscode.postMessage({ type: 'languageChanged', lang: this.currentLang });
    });

    // Back to Hub Button
    document.getElementById('btn-back-to-hub')?.addEventListener('click', () => {
      this.switchTab('hub');
    });

    // Hub Quick Search Input
    const searchInput = document.getElementById('hub-search-input') as HTMLInputElement;
    const clearBtn = document.getElementById('hub-search-clear') as HTMLButtonElement;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.searchQuery = searchInput.value;
        if (clearBtn) clearBtn.classList.toggle('visible', !!this.searchQuery);
        this.updateCardsVisibility();
      });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.searchQuery = '';
          searchInput.value = '';
          if (clearBtn) clearBtn.classList.remove('visible');
          this.updateCardsVisibility();
        }
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.searchQuery = '';
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        clearBtn.classList.remove('visible');
        this.updateCardsVisibility();
      });
    }

    // Hub Category Filter Chips
    const catChips = document.querySelectorAll('.hub-cat-chip');
    catChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const cat = chip.getAttribute('data-cat') || 'all';
        this.setCategory(cat);
      });
    });

    // Hub Cards Click Navigation
    this.bindHubCardListeners();

    // Host message handling
    window.addEventListener('message', (event) => {
      const message = event.data;
      switch (message.type) {
        case 'portsList':
          this.portView.setPorts(message.ports || []);
          break;
        case 'networkInfo':
          this.portView.setNetworkInfo(message.data);
          break;
        case 'publicIp':
          this.portView.setPublicIp(message.ip);
          break;
        case 'portKilled':
          this.portView.handlePortKilled(message);
          break;
        case 'dockerContainersList':
          this.dockerView.setStatus(message.status);
          break;
        case 'dockerLogsResult':
          this.dockerView.setLogs(message);
          break;
        case 'dockerActionResult':
          this.dockerView.handleActionResult(message);
          break;
        case 'dockerInspectResult':
          this.dockerView.setInspectResult(message);
          break;
        case 'dockerImagesList':
          this.dockerView.setImages(message.images, message.error);
          break;
        case 'dockerPullResult':
          this.dockerView.handlePullResult(message);
          break;
        case 'dockerRemoveImageResult':
        case 'dockerPruneImagesResult':
          this.dockerView.handleImageActionResult(message);
          break;
        case 'dockerRunContainerResult':
          this.dockerView.handleRunContainerResult(message);
          break;
        case 'dockerVolumesList':
          this.dockerView.setVolumes(message.volumes, message.error);
          break;
        case 'dockerRemoveVolumeResult':
        case 'dockerPruneVolumesResult':
          this.dockerView.handleVolumeActionResult(message);
          break;
        case 'dockerNetworksList':
          this.dockerView.setNetworks(message.networks, message.error);
          break;
        case 'dockerRemoveNetworkResult':
          this.dockerView.handleNetworkActionResult(message);
          break;
        case 'dockerStatsList':
          this.dockerView.setStats(message.stats, message.error);
          break;
        case 'dockerSystemPruneResult':
          this.dockerView.handleSystemPruneResult(message);
          break;
        case 'apiResponseResult':
          this.apiView.setResponse(message.response);
          break;
        case 'activeEditorText':
          this.logsView.setLogText(message.text || '');
          break;
        case 'mockStatus':
          this.mockView.updateStatus(message.status);
          break;
        case 'mockRoutes':
          this.mockView.setRoutes(message.routes || []);
          break;
        case 'mockCapturedRequest':
          this.mockView.addCapturedRequest(message.request);
          break;
        case 'mockCapturedList':
          this.mockView.setCapturedRequests(message.requests || []);
          break;
        case 'tunnelStatus':
          this.tunnelView.setStatus(message.status);
          break;
        case 'tunnelLog':
          this.tunnelView.appendLog(message.line);
          break;
        case 'sysmonTelemetry':
          this.sysmonView.setTelemetry(message.telemetry);
          break;
        case 'sysmonProcesses':
          this.sysmonView.setProcesses(message.processes || []);
          break;
        case 'sysmonProcessKilled':
          this.sysmonView.handleProcessKilled(message.pid, message.success, message.message);
          break;
        case 'loadTesterSnapshot':
          this.loadTesterView.updateTelemetry(message.snapshot);
          break;
        case 'tasksList':
          this.commandCenterView.setTasks(message.tasks || []);
          break;
        case 'taskStatusUpdate':
          this.commandCenterView.updateTaskStatus(message.taskId, message.isRunning, message.startTime);
          break;
        case 'activeCodeUpdate':
          this.snapshotView.setCodeSnippet(message.code, message.languageId, message.filename);
          break;
        case 'junkItemsList':
          this.cleanerView.setItems(message.items || []);
          break;
        case 'junkPurgeResult':
          this.cleanerView.onPurgeSuccess(message.freedBytes || 0);
          break;
        case 'dependenciesList':
          this.bundleRadarView.setData(message.items || [], message.summary);
          break;
        case 'packageSizeResult':
          this.bundleRadarView.updatePackageItem(message.item);
          break;
        case 'migrationCommandCopied':
          this.bundleRadarView.showNotice(t('bundleMigrationCopied', this.currentLang));
          break;
        case 'replayInApiTester':
          this.switchTab('api');
          this.apiView.prefillRequest(message.request);
          break;
        case 'setLanguage':
          if (message.lang && message.lang !== this.currentLang) {
            this.currentLang = message.lang;
            this.updateLanguageUI();
            this.saveCurrentState();
          }
          break;
        case 'switchTab':
          if (message.tab) {
            this.switchTab(message.tab);
          }
          break;
      }
    });

    // Auto-save state on input changes
    window.addEventListener('input', () => {
      this.saveCurrentState();
    });
  }

  private bindHubCardListeners() {
    const cards = document.querySelectorAll('.hub-card');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        const tab = (card as HTMLElement).getAttribute('data-tab');
        if (tab) {
          this.switchTab(tab);
        }
      });
      card.addEventListener('keydown', (e: any) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const tab = (card as HTMLElement).getAttribute('data-tab');
          if (tab) {
            this.switchTab(tab);
          }
        }
      });
    });
  }

  private setCategory(cat: string) {
    this.selectedCategory = cat;
    document.querySelectorAll('.hub-cat-chip').forEach((chip) => {
      if ((chip as HTMLElement).getAttribute('data-cat') === cat) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    this.updateCardsVisibility();
    this.saveCurrentState();
  }

  private updateCardsVisibility() {
    const q = this.searchQuery.trim().toLowerCase();
    FEATURE_TOOLS.forEach((tool) => {
      const card = document.getElementById(`hub-card-${tool.id}`);
      if (card) {
        const matchesCat = this.selectedCategory === 'all' || tool.category === this.selectedCategory;
        const title = t(tool.titleKey, this.currentLang).toLowerCase();
        const sub = t(tool.subKey, this.currentLang).toLowerCase();
        const guide = t(tool.guideKey, this.currentLang).toLowerCase();
        const matchesSearch = !q || title.includes(q) || sub.includes(q) || guide.includes(q) || tool.id.toLowerCase().includes(q);
        card.classList.toggle('hidden', !(matchesCat && matchesSearch));
      }
    });
  }

  private updateLanguageUI() {
    const isFa = this.currentLang === 'fa';
    document.documentElement.setAttribute('dir', isFa ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', this.currentLang);

    const brandTitle = document.getElementById('brand-title');
    if (brandTitle) brandTitle.textContent = t('appName', this.currentLang);

    const langLabel = document.getElementById('lang-toggle-label');
    if (langLabel) langLabel.textContent = this.currentLang === 'en' ? 'FA' : 'EN';

    const hubHeroTitle = document.getElementById('hub-hero-title');
    if (hubHeroTitle) hubHeroTitle.textContent = t('hubTitle', this.currentLang);

    const hubHeroDesc = document.getElementById('hub-hero-desc');
    if (hubHeroDesc) hubHeroDesc.textContent = t('hubSubtitle', this.currentLang);

    const hubCountLabel = document.getElementById('hub-count-label');
    if (hubCountLabel) hubCountLabel.textContent = t('hubToolsCount', this.currentLang);

    const searchInput = document.getElementById('hub-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.placeholder = t('searchTools', this.currentLang);
    }

    const btnBackLabel = document.getElementById('btn-back-label');
    if (btnBackLabel) btnBackLabel.textContent = t('backToHub', this.currentLang);

    const backChevron = document.getElementById('back-chevron-icon');
    if (backChevron) backChevron.innerHTML = isFa ? ICONS.chevronRight : ICONS.chevronLeft;

    const toolGuideTitle = document.getElementById('tool-guide-title');
    if (toolGuideTitle) toolGuideTitle.textContent = t('toolGuideTitle', this.currentLang);

    // Update Category Chips
    const setCatText = (cat: string, labelKey: keyof typeof translations['en'], count: number) => {
      const el = document.querySelector(`.hub-cat-chip[data-cat="${cat}"]`);
      if (el) {
        el.innerHTML = `<span>${t(labelKey, this.currentLang)}</span><span class="cat-count">${count}</span>`;
      }
    };
    setCatText('all', 'deckCatAll', 19);
    setCatText('dev', 'deckCatDev', 8);
    setCatText('network', 'deckCatNetwork', 4);
    setCatText('ops', 'deckCatOps', 3);
    setCatText('system', 'deckCatSystem', 4);

    // Re-render Hub Cards
    const hubGrid = document.getElementById('hub-cards-grid');
    if (hubGrid) {
      hubGrid.innerHTML = this.renderHubCardsHtml();
      this.bindHubCardListeners();
    }

    // Update active tool info if in tool workspace
    if (this.activeTab !== 'hub') {
      const tool = FEATURE_TOOLS.find((t) => t.id === this.activeTab);
      if (tool) {
        const titleEl = document.getElementById('current-tool-title');
        const iconEl = document.getElementById('current-tool-icon');
        const catEl = document.getElementById('current-tool-cat');
        const guideEl = document.getElementById('tool-guide-text');
        if (titleEl) titleEl.textContent = t(tool.titleKey, this.currentLang);
        if (iconEl) iconEl.innerHTML = tool.icon;
        if (catEl) catEl.textContent = tool.category.toUpperCase();
        if (guideEl) guideEl.textContent = t(tool.guideKey, this.currentLang);
      }
    }

    this.jsonView.setLanguage(this.currentLang);
    this.jwtView.setLanguage(this.currentLang);
    this.persianView.setLanguage(this.currentLang);
    this.portView.setLanguage(this.currentLang);
    this.gitView.setLanguage(this.currentLang);
    this.dockerView.setLanguage(this.currentLang);
    this.apiView.setLanguage(this.currentLang);
    this.sqlView.setLanguage(this.currentLang);
    this.logsView.setLanguage(this.currentLang);
    this.cryptoView.setLanguage(this.currentLang);
    this.mockView.setLanguage(this.currentLang);
    this.tunnelView.setLanguage(this.currentLang);
    this.sysmonView.setLanguage(this.currentLang);
    this.loadTesterView.setLanguage(this.currentLang);
    this.snapshotView.setLanguage(this.currentLang);
    this.commandCenterView.setLanguage(this.currentLang);
    this.cssDesignerView.setLanguage(this.currentLang);
    this.cleanerView.setLanguage(this.currentLang);
    this.bundleRadarView.setLanguage(this.currentLang);
  }

  private switchTab(tabName: string) {
    this.activeTab = tabName;

    const hubContainer = document.getElementById('hub-page-container');
    const toolContainer = document.getElementById('tool-workspace-container');

    if (tabName === 'hub') {
      if (hubContainer) hubContainer.style.display = 'flex';
      if (toolContainer) toolContainer.style.display = 'none';

      // Re-render and bind listeners to ensure fresh state
      const hubGrid = document.getElementById('hub-cards-grid');
      if (hubGrid) {
        hubGrid.innerHTML = this.renderHubCardsHtml();
        this.bindHubCardListeners();
      }
    } else {
      if (hubContainer) hubContainer.style.display = 'none';
      if (toolContainer) toolContainer.style.display = 'block';

      // Update current tool info
      const tool = FEATURE_TOOLS.find((t) => t.id === tabName);
      if (tool) {
        const titleEl = document.getElementById('current-tool-title');
        const iconEl = document.getElementById('current-tool-icon');
        const catEl = document.getElementById('current-tool-cat');
        const guideEl = document.getElementById('tool-guide-text');
        if (titleEl) titleEl.textContent = t(tool.titleKey, this.currentLang);
        if (iconEl) iconEl.innerHTML = tool.icon;
        if (catEl) {
          catEl.textContent = tool.category.toUpperCase();
          catEl.className = `current-tool-cat cat-${tool.category}`;
        }
        if (guideEl) guideEl.textContent = t(tool.guideKey, this.currentLang);
      }

      // Update view panels
      document.querySelectorAll('.view-panel').forEach((panel) => {
        if (panel.id === `view-${tabName}`) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });

      if (tabName === 'ports') {
        this.portView.requestScan();
      } else if (tabName === 'docker') {
        this.dockerView.refreshContainers();
      } else if (tabName === 'sysmon') {
        this.sysmonView.requestData();
      } else if (tabName === 'mock') {
        vscode.postMessage({ type: 'mockGetStatus' });
        vscode.postMessage({ type: 'mockGetRoutes' });
        vscode.postMessage({ type: 'mockGetRequests' });
      } else if (tabName === 'tunnel') {
        vscode.postMessage({ type: 'tunnelGetStatus' });
      } else if (tabName === 'commandcenter') {
        vscode.postMessage({ command: 'scanTasks' });
      } else if (tabName === 'cleaner') {
        vscode.postMessage({ command: 'scanJunk' });
      } else if (tabName === 'snapshot') {
        vscode.postMessage({ command: 'getEditorCode' });
      }
    }

    this.saveCurrentState();
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  new DevShelfApp();
});
