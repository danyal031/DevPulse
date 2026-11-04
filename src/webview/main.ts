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
}

const FEATURE_TOOLS: FeatureTool[] = [
  // Dev & Design (7)
  { id: 'json', category: 'dev', icon: ICONS.brackets, titleKey: 'tabJson', subKey: 'subJson' },
  { id: 'jwt', category: 'dev', icon: ICONS.shield, titleKey: 'tabJwt', subKey: 'subJwt' },
  { id: 'persian', category: 'dev', icon: ICONS.calendar, titleKey: 'tabPersian', subKey: 'subPersian' },
  { id: 'crypto', category: 'dev', icon: ICONS.key, titleKey: 'tabCrypto', subKey: 'subCrypto' },
  { id: 'sql', category: 'dev', icon: ICONS.database, titleKey: 'tabSql', subKey: 'subSql' },
  { id: 'snapshot', category: 'dev', icon: ICONS.camera, titleKey: 'tabSnapshot', subKey: 'subSnapshot' },
  { id: 'cssdesign', category: 'dev', icon: ICONS.palette, titleKey: 'tabCssDesigner', subKey: 'subCssDesigner' },

  // Network & API (4)
  { id: 'api', category: 'network', icon: ICONS.send, titleKey: 'tabApi', subKey: 'subApi' },
  { id: 'mock', category: 'network', icon: ICONS.webhook, titleKey: 'tabMock', subKey: 'subMock' },
  { id: 'tunnel', category: 'network', icon: ICONS.tunnel, titleKey: 'tabTunnel', subKey: 'subTunnel' },
  { id: 'loadtest', category: 'network', icon: ICONS.speed, titleKey: 'tabLoadTest', subKey: 'subLoadtest' },

  // Project & Ops (3)
  { id: 'commandcenter', category: 'ops', icon: ICONS.playCircle, titleKey: 'tabCommandCenter', subKey: 'subCommandCenter' },
  { id: 'docker', category: 'ops', icon: ICONS.docker, titleKey: 'tabDocker', subKey: 'subDocker' },
  { id: 'git', category: 'ops', icon: ICONS.git, titleKey: 'tabGit', subKey: 'subGit' },

  // System & Cleanup (4)
  { id: 'ports', category: 'system', icon: ICONS.server, titleKey: 'tabPorts', subKey: 'subPorts' },
  { id: 'sysmon', category: 'system', icon: ICONS.cpu, titleKey: 'tabSysMon', subKey: 'subSysmon' },
  { id: 'logs', category: 'system', icon: ICONS.fileText, titleKey: 'tabLogs', subKey: 'subLogs' },
  { id: 'cleaner', category: 'system', icon: ICONS.broom, titleKey: 'tabCleaner', subKey: 'subCleaner' }
];

class DevShelfApp {
  private currentLang: Language = 'en';
  private activeTab: string = 'json';
  private isDeckExpanded: boolean = true;
  private selectedCategory: string = 'all';

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
      if (typeof state.isDeckExpanded === 'boolean') {
        this.isDeckExpanded = state.isDeckExpanded;
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
      isDeckExpanded: this.isDeckExpanded,
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
      cleanerState: this.cleanerView ? this.cleanerView.getState() : undefined
    });
  }

  private renderFeatureCardsHtml(): string {
    return FEATURE_TOOLS.map((tool) => {
      const isVisible = this.selectedCategory === 'all' || tool.category === this.selectedCategory;
      const isActive = this.activeTab === tool.id;
      return `
        <button class="feature-card tab-btn ${isActive ? 'active' : ''} ${!isVisible ? 'hidden' : ''}" 
                data-tab="${tool.id}" 
                data-cat="${tool.category}" 
                id="feature-card-${tool.id}"
                title="${t(tool.titleKey, this.currentLang)} — ${t(tool.subKey, this.currentLang)}">
          <div class="feature-card-indicator"></div>
          <div class="feature-card-icon-box">
            ${tool.icon}
          </div>
          <div class="feature-card-content">
            <div class="feature-card-title">${t(tool.titleKey, this.currentLang)}</div>
            <div class="feature-card-sub">${t(tool.subKey, this.currentLang)}</div>
          </div>
        </button>
      `;
    }).join('');
  }

  private initDom() {
    const root = document.getElementById('app-root')!;
    const currentTool = FEATURE_TOOLS.find((t) => t.id === this.activeTab) || FEATURE_TOOLS[0];

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

      <!-- Feature Cards Deck Navigation -->
      <section class="cards-deck-wrapper" id="cards-deck-wrapper">
        <!-- Deck Header / Active Tool Summary -->
        <div class="deck-header-bar">
          <button class="deck-active-pill" id="deck-active-pill" title="${t('exploreDeck', this.currentLang)}">
            <span class="deck-active-icon" id="deck-active-icon">${currentTool.icon}</span>
            <div class="deck-active-meta">
              <span class="deck-active-title" id="deck-active-title">${t(currentTool.titleKey, this.currentLang)}</span>
              <span class="deck-active-sub" id="deck-active-sub">${t(currentTool.subKey, this.currentLang)}</span>
            </div>
          </button>
          <div class="deck-header-controls">
            <button id="deck-toggle-btn" class="deck-toggle-btn" title="${this.isDeckExpanded ? t('collapseDeck', this.currentLang) : t('exploreDeck', this.currentLang)}">
              <span class="deck-toggle-icon" id="deck-toggle-icon">${this.isDeckExpanded ? ICONS.chevronUp : ICONS.apps}</span>
              <span class="deck-toggle-label" id="deck-toggle-label">${this.isDeckExpanded ? t('collapseDeck', this.currentLang) : t('exploreDeck', this.currentLang)}</span>
            </button>
          </div>
        </div>

        <!-- Collapsible Cards Deck Body -->
        <div class="deck-body ${this.isDeckExpanded ? 'expanded' : 'collapsed'}" id="deck-body">
          <!-- Category Chips Filter -->
          <div class="deck-categories-bar" id="deck-categories-bar">
            <button class="deck-cat-chip ${this.selectedCategory === 'all' ? 'active' : ''}" data-cat="all">
              <span>${t('deckCatAll', this.currentLang)}</span>
              <span class="cat-count">18</span>
            </button>
            <button class="deck-cat-chip ${this.selectedCategory === 'dev' ? 'active' : ''}" data-cat="dev">
              <span>${t('deckCatDev', this.currentLang)}</span>
              <span class="cat-count">7</span>
            </button>
            <button class="deck-cat-chip ${this.selectedCategory === 'network' ? 'active' : ''}" data-cat="network">
              <span>${t('deckCatNetwork', this.currentLang)}</span>
              <span class="cat-count">4</span>
            </button>
            <button class="deck-cat-chip ${this.selectedCategory === 'ops' ? 'active' : ''}" data-cat="ops">
              <span>${t('deckCatOps', this.currentLang)}</span>
              <span class="cat-count">3</span>
            </button>
            <button class="deck-cat-chip ${this.selectedCategory === 'system' ? 'active' : ''}" data-cat="system">
              <span>${t('deckCatSystem', this.currentLang)}</span>
              <span class="cat-count">4</span>
            </button>
          </div>

          <!-- 2-Column Responsive Cards Grid -->
          <div class="feature-cards-grid" id="feature-cards-grid">
            ${this.renderFeatureCardsHtml()}
          </div>
        </div>
      </section>

      <main class="main-content-area">
        <div id="view-json" class="view-panel active"></div>
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
      </main>
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

    // Deck Toggle (collapse / expand)
    document.getElementById('deck-toggle-btn')?.addEventListener('click', () => {
      this.toggleDeck();
    });
    document.getElementById('deck-active-pill')?.addEventListener('click', () => {
      this.toggleDeck();
    });

    // Category Filter Chips
    const catChips = document.querySelectorAll('.deck-cat-chip');
    catChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const cat = chip.getAttribute('data-cat') || 'all';
        this.setCategory(cat);
      });
    });

    // Feature Card Click Navigation
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        const tab = (card as HTMLElement).getAttribute('data-tab');
        if (tab) {
          this.switchTab(tab);
        }
      });
    });

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

  private toggleDeck() {
    this.isDeckExpanded = !this.isDeckExpanded;
    const body = document.getElementById('deck-body');
    const toggleIcon = document.getElementById('deck-toggle-icon');
    const toggleLabel = document.getElementById('deck-toggle-label');

    if (body) {
      if (this.isDeckExpanded) {
        body.classList.remove('collapsed');
        body.classList.add('expanded');
      } else {
        body.classList.remove('expanded');
        body.classList.add('collapsed');
      }
    }

    if (toggleIcon) {
      toggleIcon.innerHTML = this.isDeckExpanded ? ICONS.chevronUp : ICONS.apps;
    }
    if (toggleLabel) {
      toggleLabel.textContent = this.isDeckExpanded ? t('collapseDeck', this.currentLang) : t('exploreDeck', this.currentLang);
    }
    this.saveCurrentState();
  }

  private setCategory(cat: string) {
    this.selectedCategory = cat;
    document.querySelectorAll('.deck-cat-chip').forEach((chip) => {
      if ((chip as HTMLElement).getAttribute('data-cat') === cat) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    document.querySelectorAll('.feature-card').forEach((card) => {
      const cardCat = (card as HTMLElement).getAttribute('data-cat');
      if (cat === 'all' || cardCat === cat) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
    this.saveCurrentState();
  }

  private updateLanguageUI() {
    const isFa = this.currentLang === 'fa';
    document.documentElement.setAttribute('dir', isFa ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', this.currentLang);

    const brandTitle = document.getElementById('brand-title');
    if (brandTitle) brandTitle.textContent = t('appName', this.currentLang);

    const langLabel = document.getElementById('lang-toggle-label');
    if (langLabel) langLabel.textContent = this.currentLang === 'en' ? 'FA' : 'EN';

    const toggleLabel = document.getElementById('deck-toggle-label');
    if (toggleLabel) {
      toggleLabel.textContent = this.isDeckExpanded ? t('collapseDeck', this.currentLang) : t('exploreDeck', this.currentLang);
    }

    // Update Category Chips
    const setCatText = (cat: string, labelKey: keyof typeof translations['en'], count: number) => {
      const el = document.querySelector(`.deck-cat-chip[data-cat="${cat}"]`);
      if (el) {
        el.innerHTML = `<span>${t(labelKey, this.currentLang)}</span><span class="cat-count">${count}</span>`;
      }
    };
    setCatText('all', 'deckCatAll', 18);
    setCatText('dev', 'deckCatDev', 7);
    setCatText('network', 'deckCatNetwork', 4);
    setCatText('ops', 'deckCatOps', 3);
    setCatText('system', 'deckCatSystem', 4);

    // Update all cards in the deck
    FEATURE_TOOLS.forEach((tool) => {
      const card = document.getElementById(`feature-card-${tool.id}`);
      if (card) {
        const titleEl = card.querySelector('.feature-card-title');
        const subEl = card.querySelector('.feature-card-sub');
        if (titleEl) titleEl.textContent = t(tool.titleKey, this.currentLang);
        if (subEl) subEl.textContent = t(tool.subKey, this.currentLang);
        card.setAttribute('title', `${t(tool.titleKey, this.currentLang)} — ${t(tool.subKey, this.currentLang)}`);
      }
    });

    // Update active summary pill
    const currentTool = FEATURE_TOOLS.find((t) => t.id === this.activeTab) || FEATURE_TOOLS[0];
    const activeIcon = document.getElementById('deck-active-icon');
    const activeTitle = document.getElementById('deck-active-title');
    const activeSub = document.getElementById('deck-active-sub');
    if (activeIcon) activeIcon.innerHTML = currentTool.icon;
    if (activeTitle) activeTitle.textContent = t(currentTool.titleKey, this.currentLang);
    if (activeSub) activeSub.textContent = t(currentTool.subKey, this.currentLang);

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
  }

  private switchTab(tabName: string) {
    this.activeTab = tabName;

    // Update feature card active styles
    document.querySelectorAll('.feature-card').forEach((card) => {
      if ((card as HTMLElement).getAttribute('data-tab') === tabName) {
        card.classList.add('active');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        card.classList.remove('active');
      }
    });

    // Update active summary pill
    const currentTool = FEATURE_TOOLS.find((t) => t.id === tabName) || FEATURE_TOOLS[0];
    const activeIcon = document.getElementById('deck-active-icon');
    const activeTitle = document.getElementById('deck-active-title');
    const activeSub = document.getElementById('deck-active-sub');
    if (activeIcon) activeIcon.innerHTML = currentTool.icon;
    if (activeTitle) activeTitle.textContent = t(currentTool.titleKey, this.currentLang);
    if (activeSub) activeSub.textContent = t(currentTool.subKey, this.currentLang);

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

    this.saveCurrentState();
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  new DevShelfApp();
});
