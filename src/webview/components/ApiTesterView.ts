import { Language, t } from '../i18n';
import { ICONS } from '../icons';

export interface HeaderRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface ApiTesterState {
  method: string;
  url: string;
  headers: HeaderRow[];
  body: string;
  activeReqTab: 'headers' | 'body';
  activeRespTab: 'body' | 'headers';
  lastResponse?: {
    status: number;
    statusText: string;
    timeMs: number;
    sizeBytes: number;
    headers: Record<string, string>;
    body: string;
    isJson: boolean;
    error?: string;
  } | null;
}

export class ApiTesterView {
  private container: HTMLElement;
  private currentLang: Language;
  private postMessage: (msg: any) => void;

  private method: string = 'GET';
  private url: string = 'https://jsonplaceholder.typicode.com/posts/1';
  private headers: HeaderRow[] = [
    { id: '1', key: 'Accept', value: 'application/json', enabled: true }
  ];
  private body: string = '{\n  "title": "foo",\n  "body": "bar",\n  "userId": 1\n}';
  private activeReqTab: 'headers' | 'body' = 'headers';
  private activeRespTab: 'body' | 'headers' = 'body';

  private isSending: boolean = false;
  private lastResponse: ApiTesterState['lastResponse'] = null;
  private copyTimeout: any = null;

  constructor(container: HTMLElement, lang: Language, postMessage: (msg: any) => void) {
    this.container = container;
    this.currentLang = lang;
    this.postMessage = postMessage;

    this.render();
  }

  public setLanguage(lang: Language) {
    this.currentLang = lang;
    this.render();
  }

  public setResponse(res: NonNullable<ApiTesterState['lastResponse']>) {
    this.isSending = false;
    this.lastResponse = res;
    this.render();
  }

  public getState(): ApiTesterState {
    return {
      method: this.method,
      url: this.url,
      headers: this.headers,
      body: this.body,
      activeReqTab: this.activeReqTab,
      activeRespTab: this.activeRespTab,
      lastResponse: this.lastResponse
    };
  }

  public restoreState(state: any) {
    if (!state) return;
    if (typeof state.method === 'string') this.method = state.method;
    if (typeof state.url === 'string') this.url = state.url;
    if (Array.isArray(state.headers)) this.headers = state.headers;
    if (typeof state.body === 'string') this.body = state.body;
    if (state.activeReqTab) this.activeReqTab = state.activeReqTab;
    if (state.activeRespTab) this.activeRespTab = state.activeRespTab;
    if (state.lastResponse) this.lastResponse = state.lastResponse;

    this.render();
  }

  private render() {
    const isFa = this.currentLang === 'fa';
    const allowsBody = !['GET', 'HEAD'].includes(this.method);

    this.container.innerHTML = `
      <div class="api-tester-wrapper">
        <div class="section-header">
          <div class="section-title-wrap">
            <span class="section-icon">${ICONS.send}</span>
            <div class="section-text">
              <h3 class="section-title">${t('apiTitle', this.currentLang)}</h3>
              <p class="section-subtitle">${t('apiSubtitle', this.currentLang)}</p>
            </div>
          </div>
        </div>

        <!-- Request Line -->
        <div class="api-request-bar">
          <select id="api-method-select" class="api-method-select method-${this.method.toLowerCase()}">
            <option value="GET" ${this.method === 'GET' ? 'selected' : ''}>GET</option>
            <option value="POST" ${this.method === 'POST' ? 'selected' : ''}>POST</option>
            <option value="PUT" ${this.method === 'PUT' ? 'selected' : ''}>PUT</option>
            <option value="PATCH" ${this.method === 'PATCH' ? 'selected' : ''}>PATCH</option>
            <option value="DELETE" ${this.method === 'DELETE' ? 'selected' : ''}>DELETE</option>
            <option value="HEAD" ${this.method === 'HEAD' ? 'selected' : ''}>HEAD</option>
          </select>

          <input
            type="text"
            id="api-url-input"
            class="api-url-input"
            placeholder="${t('apiUrlPlaceholder', this.currentLang)}"
            value="${this.escapeHtml(this.url)}"
          />

          <button id="api-send-btn" class="btn btn-primary api-send-btn" ${this.isSending ? 'disabled' : ''}>
            ${this.isSending ? `<span class="spin">${ICONS.sync}</span>` : ICONS.send}
            <span>${this.isSending ? t('apiSending', this.currentLang) : t('apiSend', this.currentLang)}</span>
          </button>
        </div>

        <!-- Request Sub-Tabs -->
        <div class="api-subtabs-nav">
          <button
            class="subtab-btn ${this.activeReqTab === 'headers' ? 'active' : ''}"
            id="subtab-req-headers"
          >
            ${t('apiTabHeaders', this.currentLang)} (${this.headers.filter((h) => h.enabled && h.key).length})
          </button>
          ${allowsBody ? `
            <button
              class="subtab-btn ${this.activeReqTab === 'body' ? 'active' : ''}"
              id="subtab-req-body"
            >
              ${t('apiTabBody', this.currentLang)}
            </button>
          ` : ''}
        </div>

        <!-- Request Panel -->
        <div class="api-req-panel">
          ${this.activeReqTab === 'headers' ? this.renderHeadersEditor() : this.renderBodyEditor()}
        </div>

        <!-- Response Section -->
        <div class="api-response-container">
          ${this.renderResponseSection()}
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderHeadersEditor(): string {
    return `
      <div class="headers-editor-wrap">
        <div class="headers-table">
          ${this.headers.map((h, idx) => `
            <div class="header-row" data-id="${h.id}">
              <input
                type="checkbox"
                class="header-enable-check"
                data-idx="${idx}"
                ${h.enabled ? 'checked' : ''}
                title="Enable/Disable header"
              />
              <input
                type="text"
                class="header-key-input"
                data-idx="${idx}"
                placeholder="${t('apiHeaderKey', this.currentLang)}"
                value="${this.escapeHtml(h.key)}"
              />
              <input
                type="text"
                class="header-val-input"
                data-idx="${idx}"
                placeholder="${t('apiHeaderValue', this.currentLang)}"
                value="${this.escapeHtml(h.value)}"
              />
              <button
                class="icon-btn-secondary header-delete-btn"
                data-idx="${idx}"
                title="Delete header"
              >
                ${ICONS.trash}
              </button>
            </div>
          `).join('')}
        </div>
        <button id="api-add-header-btn" class="btn btn-secondary btn-sm" style="margin-top: 6px;">
          ${ICONS.plus} ${t('apiAddHeader', this.currentLang)}
        </button>
      </div>
    `;
  }

  private renderBodyEditor(): string {
    return `
      <div class="body-editor-wrap">
        <div class="body-actions-bar">
          <span class="text-muted">JSON / Raw Body</span>
          <button id="api-format-body-btn" class="btn btn-secondary btn-xs">
            ${ICONS.wand} ${t('apiFormatJson', this.currentLang)}
          </button>
        </div>
        <textarea
          id="api-body-textarea"
          class="code-textarea"
          rows="5"
          placeholder="${t('apiBodyPlaceholder', this.currentLang)}"
        >${this.escapeHtml(this.body)}</textarea>
      </div>
    `;
  }

  private renderResponseSection(): string {
    if (this.isSending) {
      return `
        <div class="response-loading-state">
          <span class="spin">${ICONS.sync}</span>
          <p>${t('apiSending', this.currentLang)}</p>
        </div>
      `;
    }

    if (!this.lastResponse) {
      return `
        <div class="response-empty-state">
          <p class="text-muted">${t('apiNoResponseYet', this.currentLang)}</p>
        </div>
      `;
    }

    const res = this.lastResponse;
    const isError = res.status === 0 || res.status >= 400;
    const statusClass = res.status >= 200 && res.status < 300
      ? 'status-2xx'
      : res.status >= 300 && res.status < 400
      ? 'status-3xx'
      : 'status-error';

    const headerKeys = Object.keys(res.headers || {});

    return `
      <div class="response-card">
        <div class="response-meta-bar">
          <div class="status-badge ${statusClass}">
            <span class="status-code">${res.status || 'ERR'}</span>
            <span class="status-text">${this.escapeHtml(res.statusText || (res.error ? 'Failed' : 'OK'))}</span>
          </div>

          <div class="meta-item">
            <span class="meta-label">${t('apiResponseTime', this.currentLang)}:</span>
            <span class="meta-val">${res.timeMs} ms</span>
          </div>

          <div class="meta-item">
            <span class="meta-label">${t('apiResponseSize', this.currentLang)}:</span>
            <span class="meta-val">${this.formatBytes(res.sizeBytes)}</span>
          </div>
        </div>

        ${res.error ? `
          <div class="alert-box alert-error" style="margin-top: 8px;">
            <div class="alert-title">${t('error', this.currentLang)}</div>
            <div class="alert-desc">${this.escapeHtml(res.error)}</div>
          </div>
        ` : ''}

        <!-- Response Sub-Tabs -->
        <div class="api-subtabs-nav" style="margin-top: 10px;">
          <button
            class="subtab-btn ${this.activeRespTab === 'body' ? 'active' : ''}"
            id="subtab-resp-body"
          >
            ${t('apiTabRespBody', this.currentLang)}
          </button>
          <button
            class="subtab-btn ${this.activeRespTab === 'headers' ? 'active' : ''}"
            id="subtab-resp-headers"
          >
            ${t('apiTabRespHeaders', this.currentLang)} (${headerKeys.length})
          </button>
        </div>

        <div class="response-content-panel">
          ${this.activeRespTab === 'body' ? `
            <div class="resp-body-wrap">
              <div class="resp-body-actions">
                <span class="text-muted">${res.isJson ? 'JSON' : 'Text'}</span>
                <div class="action-btn-group">
                  <button id="resp-copy-btn" class="btn btn-secondary btn-xs">
                    ${ICONS.copy} <span id="resp-copy-text">${t('apiCopyResponse', this.currentLang)}</span>
                  </button>
                  <button id="resp-insert-btn" class="btn btn-secondary btn-xs">
                    ${ICONS.insert} <span>${t('insertAtCursor', this.currentLang)}</span>
                  </button>
                </div>
              </div>
              <pre class="resp-code-view"><code>${this.escapeHtml(res.body || '(empty response)')}</code></pre>
            </div>
          ` : `
            <div class="resp-headers-wrap">
              <table class="headers-display-table">
                <tbody>
                  ${headerKeys.map((k) => `
                    <tr>
                      <td class="header-name">${this.escapeHtml(k)}</td>
                      <td class="header-val code-text">${this.escapeHtml(res.headers[k])}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  }

  private attachEvents() {
    // Method change
    const methodSelect = this.container.querySelector('#api-method-select') as HTMLSelectElement;
    if (methodSelect) {
      methodSelect.addEventListener('change', (e) => {
        this.method = (e.target as HTMLSelectElement).value;
        if (['GET', 'HEAD'].includes(this.method) && this.activeReqTab === 'body') {
          this.activeReqTab = 'headers';
        }
        this.render();
      });
    }

    // URL change
    const urlInput = this.container.querySelector('#api-url-input') as HTMLInputElement;
    if (urlInput) {
      urlInput.addEventListener('input', (e) => {
        this.url = (e.target as HTMLInputElement).value;
      });
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.sendRequest();
        }
      });
    }

    // Send button
    const sendBtn = this.container.querySelector('#api-send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendRequest());
    }

    // Request Tabs
    const reqHeadersTab = this.container.querySelector('#subtab-req-headers');
    if (reqHeadersTab) {
      reqHeadersTab.addEventListener('click', () => {
        this.activeReqTab = 'headers';
        this.render();
      });
    }

    const reqBodyTab = this.container.querySelector('#subtab-req-body');
    if (reqBodyTab) {
      reqBodyTab.addEventListener('click', () => {
        this.activeReqTab = 'body';
        this.render();
      });
    }

    // Headers editing
    const headerRows = this.container.querySelectorAll('.header-row');
    headerRows.forEach((row) => {
      const idx = parseInt(row.querySelector('.header-enable-check')?.getAttribute('data-idx') || '0', 10);
      const enableCheck = row.querySelector('.header-enable-check') as HTMLInputElement;
      const keyInput = row.querySelector('.header-key-input') as HTMLInputElement;
      const valInput = row.querySelector('.header-val-input') as HTMLInputElement;
      const delBtn = row.querySelector('.header-delete-btn') as HTMLElement;

      if (enableCheck) {
        enableCheck.addEventListener('change', () => {
          if (this.headers[idx]) this.headers[idx].enabled = enableCheck.checked;
        });
      }

      if (keyInput) {
        keyInput.addEventListener('input', () => {
          if (this.headers[idx]) this.headers[idx].key = keyInput.value;
        });
      }

      if (valInput) {
        valInput.addEventListener('input', () => {
          if (this.headers[idx]) this.headers[idx].value = valInput.value;
        });
      }

      if (delBtn) {
        delBtn.addEventListener('click', () => {
          this.headers.splice(idx, 1);
          this.render();
        });
      }
    });

    // Add header button
    const addHeaderBtn = this.container.querySelector('#api-add-header-btn');
    if (addHeaderBtn) {
      addHeaderBtn.addEventListener('click', () => {
        this.headers.push({
          id: String(Date.now()),
          key: '',
          value: '',
          enabled: true
        });
        this.render();
      });
    }

    // Body textarea
    const bodyTextarea = this.container.querySelector('#api-body-textarea') as HTMLTextAreaElement;
    if (bodyTextarea) {
      bodyTextarea.addEventListener('input', (e) => {
        this.body = (e.target as HTMLTextAreaElement).value;
      });
    }

    // Format body JSON
    const formatBodyBtn = this.container.querySelector('#api-format-body-btn');
    if (formatBodyBtn) {
      formatBodyBtn.addEventListener('click', () => {
        try {
          const parsed = JSON.parse(this.body);
          this.body = JSON.stringify(parsed, null, 2);
          this.render();
        } catch {}
      });
    }

    // Response Tabs
    const respBodyTab = this.container.querySelector('#subtab-resp-body');
    if (respBodyTab) {
      respBodyTab.addEventListener('click', () => {
        this.activeRespTab = 'body';
        this.render();
      });
    }

    const respHeadersTab = this.container.querySelector('#subtab-resp-headers');
    if (respHeadersTab) {
      respHeadersTab.addEventListener('click', () => {
        this.activeRespTab = 'headers';
        this.render();
      });
    }

    // Copy Response
    const copyBtn = this.container.querySelector('#resp-copy-btn');
    if (copyBtn && this.lastResponse) {
      copyBtn.addEventListener('click', async () => {
        if (!this.lastResponse) return;
        await navigator.clipboard.writeText(this.lastResponse.body);
        const textSpan = this.container.querySelector('#resp-copy-text');
        if (textSpan) {
          textSpan.textContent = t('copied', this.currentLang);
          if (this.copyTimeout) clearTimeout(this.copyTimeout);
          this.copyTimeout = setTimeout(() => {
            if (textSpan) textSpan.textContent = t('apiCopyResponse', this.currentLang);
          }, 2000);
        }
      });
    }

    // Insert Response in Editor
    const insertBtn = this.container.querySelector('#resp-insert-btn');
    if (insertBtn && this.lastResponse) {
      insertBtn.addEventListener('click', () => {
        if (!this.lastResponse) return;
        this.postMessage({
          type: 'insertText',
          text: this.lastResponse.body
        });
      });
    }
  }

  private sendRequest() {
    if (!this.url.trim()) return;

    this.isSending = true;
    this.render();

    this.postMessage({
      type: 'apiSendRequest',
      request: {
        method: this.method,
        url: this.url,
        headers: this.headers,
        body: this.body
      }
    });
  }

  private formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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
