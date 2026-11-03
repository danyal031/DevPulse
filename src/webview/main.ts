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

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): any;
  setState(state: any): void;
};

const vscode = acquireVsCodeApi();

class DevShelfApp {
  private currentLang: Language = 'en';
  private activeTab: string = 'json';

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
    }
  }

  private saveCurrentState() {
    vscode.setState({
      lang: this.currentLang,
      activeTab: this.activeTab,
      jsonState: this.jsonView ? this.jsonView.getState() : undefined,
      jwtState: this.jwtView ? this.jwtView.getState() : undefined,
      persianState: this.persianView ? this.persianView.getState() : undefined,
      gitState: this.gitView ? this.gitView.getState() : undefined,
      dockerState: this.dockerView ? this.dockerView.getState() : undefined,
      apiState: this.apiView ? this.apiView.getState() : undefined,
      sqlState: this.sqlView ? this.sqlView.getState() : undefined,
      logsState: this.logsView ? this.logsView.getState() : undefined,
      cryptoState: this.cryptoView ? this.cryptoView.getState() : undefined
    });
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

      <div class="tabs-nav-container">
        <nav class="tabs-nav" id="tabs-nav-bar">
          <button class="tab-btn active" data-tab="json" id="tab-nav-json">
            <span class="tab-icon">${ICONS.brackets}</span>
            <span class="tab-label">${t('tabJson', this.currentLang)}</span>
          </button>
          <button class="tab-btn" data-tab="jwt" id="tab-nav-jwt">
            <span class="tab-icon">${ICONS.shield}</span>
            <span class="tab-label">${t('tabJwt', this.currentLang)}</span>
          </button>
          <button class="tab-btn" data-tab="persian" id="tab-nav-persian">
            <span class="tab-icon">${ICONS.calendar}</span>
            <span class="tab-label">${t('tabPersian', this.currentLang)}</span>
          </button>
          <button class="tab-btn" data-tab="ports" id="tab-nav-ports">
            <span class="tab-icon">${ICONS.server}</span>
            <span class="tab-label">${t('tabPorts', this.currentLang)}</span>
          </button>
          <button class="tab-btn" data-tab="git" id="tab-nav-git">
            <span class="tab-icon">${ICONS.git}</span>
            <span class="tab-label">${t('tabGit', this.currentLang)}</span>
          </button>
          <button class="tab-btn" data-tab="docker" id="tab-nav-docker">
            <span class="tab-icon">${ICONS.docker}</span>
            <span class="tab-label">${t('tabDocker', this.currentLang)}</span>
          </button>
          <button class="tab-btn" data-tab="api" id="tab-nav-api">
            <span class="tab-icon">${ICONS.send}</span>
            <span class="tab-label">${t('tabApi', this.currentLang)}</span>
          </button>
          <button class="tab-btn" data-tab="sql" id="tab-nav-sql">
            <span class="tab-icon">${ICONS.database}</span>
            <span class="tab-label">${t('tabSql', this.currentLang)}</span>
          </button>
          <button class="tab-btn" data-tab="logs" id="tab-nav-logs">
            <span class="tab-icon">${ICONS.fileText}</span>
            <span class="tab-label">${t('tabLogs', this.currentLang)}</span>
          </button>
          <button class="tab-btn" data-tab="crypto" id="tab-nav-crypto">
            <span class="tab-icon">${ICONS.key}</span>
            <span class="tab-label">${t('tabCrypto', this.currentLang)}</span>
          </button>
        </nav>
      </div>

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

    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = (btn as HTMLElement).getAttribute('data-tab');
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

  private updateLanguageUI() {
    const isFa = this.currentLang === 'fa';
    document.documentElement.setAttribute('dir', isFa ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', this.currentLang);

    const brandTitle = document.getElementById('brand-title');
    if (brandTitle) brandTitle.textContent = t('appName', this.currentLang);

    const langLabel = document.getElementById('lang-toggle-label');
    if (langLabel) langLabel.textContent = this.currentLang === 'en' ? 'FA' : 'EN';

    const setTabLabel = (id: string, text: string) => {
      const el = document.getElementById(id);
      const label = el?.querySelector('.tab-label');
      if (label) {
        label.textContent = text;
      } else if (el) {
        el.textContent = text;
      }
    };

    setTabLabel('tab-nav-json', t('tabJson', this.currentLang));
    setTabLabel('tab-nav-jwt', t('tabJwt', this.currentLang));
    setTabLabel('tab-nav-persian', t('tabPersian', this.currentLang));
    setTabLabel('tab-nav-ports', t('tabPorts', this.currentLang));
    setTabLabel('tab-nav-git', t('tabGit', this.currentLang));
    setTabLabel('tab-nav-docker', t('tabDocker', this.currentLang));
    setTabLabel('tab-nav-api', t('tabApi', this.currentLang));
    setTabLabel('tab-nav-sql', t('tabSql', this.currentLang));
    setTabLabel('tab-nav-logs', t('tabLogs', this.currentLang));
    setTabLabel('tab-nav-crypto', t('tabCrypto', this.currentLang));

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
  }

  private switchTab(tabName: string) {
    this.activeTab = tabName;

    // Update tab button styles
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      if ((btn as HTMLElement).getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } else {
        btn.classList.remove('active');
      }
    });

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
    }

    this.saveCurrentState();
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  new DevShelfApp();
});
