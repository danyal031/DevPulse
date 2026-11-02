import { Language, t, translations } from './i18n';
import { ICONS } from './icons';
import { JsonTsZodView } from './components/JsonTsZodView';
import { JwtView } from './components/JwtView';
import { PersianJalaliView } from './components/PersianJalaliView';
import { PortManagerView } from './components/PortManagerView';
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
      cryptoState: this.cryptoView ? this.cryptoView.getState() : undefined
    });
  }

  private initDom() {
    const root = document.getElementById('app-root')!;
    root.innerHTML = `
      <header class="header-bar">
        <div class="brand-wrapper">
          <span class="brand-title" id="brand-title">${t('appName', this.currentLang)}</span>
          <span class="brand-badge">PRO</span>
        </div>
        <button id="lang-toggle-btn" class="lang-toggle-btn">
          ${ICONS.globe} <span id="lang-toggle-label">${t('langToggle', this.currentLang)}</span>
        </button>
      </header>

      <nav class="tabs-nav">
        <button class="tab-btn active" data-tab="json" id="tab-nav-json">${t('tabJson', this.currentLang)}</button>
        <button class="tab-btn" data-tab="jwt" id="tab-nav-jwt">${t('tabJwt', this.currentLang)}</button>
        <button class="tab-btn" data-tab="persian" id="tab-nav-persian">${t('tabPersian', this.currentLang)}</button>
        <button class="tab-btn" data-tab="ports" id="tab-nav-ports">${t('tabPorts', this.currentLang)}</button>
        <button class="tab-btn" data-tab="crypto" id="tab-nav-crypto">${t('tabCrypto', this.currentLang)}</button>
      </nav>

      <main>
        <div id="view-json" class="view-panel active"></div>
        <div id="view-jwt" class="view-panel"></div>
        <div id="view-persian" class="view-panel"></div>
        <div id="view-ports" class="view-panel"></div>
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
    const cryptoContainer = document.getElementById('view-crypto')!;

    this.jsonView = new JsonTsZodView(jsonContainer, this.currentLang, postToHost);
    this.jwtView = new JwtView(jwtContainer, this.currentLang, postToHost);
    this.persianView = new PersianJalaliView(persianContainer, this.currentLang, postToHost);
    this.portView = new PortManagerView(portsContainer, this.currentLang, postToHost);
    this.cryptoView = new CryptoMockView(cryptoContainer, this.currentLang, postToHost);

    const state = vscode.getState();
    if (state) {
      if (state.jsonState) this.jsonView.restoreState(state.jsonState);
      if (state.jwtState) this.jwtView.restoreState(state.jwtState);
      if (state.persianState) this.persianView.restoreState(state.persianState);
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
        case 'portKilled':
          this.portView.handlePortKilled(message);
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
    if (langLabel) langLabel.textContent = t('langToggle', this.currentLang);

    const tabJson = document.getElementById('tab-nav-json');
    if (tabJson) tabJson.textContent = t('tabJson', this.currentLang);

    const tabJwt = document.getElementById('tab-nav-jwt');
    if (tabJwt) tabJwt.textContent = t('tabJwt', this.currentLang);

    const tabPersian = document.getElementById('tab-nav-persian');
    if (tabPersian) tabPersian.textContent = t('tabPersian', this.currentLang);

    const tabPorts = document.getElementById('tab-nav-ports');
    if (tabPorts) tabPorts.textContent = t('tabPorts', this.currentLang);

    const tabCrypto = document.getElementById('tab-nav-crypto');
    if (tabCrypto) tabCrypto.textContent = t('tabCrypto', this.currentLang);

    this.jsonView.setLanguage(this.currentLang);
    this.jwtView.setLanguage(this.currentLang);
    this.persianView.setLanguage(this.currentLang);
    this.portView.setLanguage(this.currentLang);
    this.cryptoView.setLanguage(this.currentLang);
  }

  private switchTab(tabName: string) {
    this.activeTab = tabName;

    // Update tab button styles
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      if ((btn as HTMLElement).getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
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
    }

    this.saveCurrentState();
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  new DevShelfApp();
});
