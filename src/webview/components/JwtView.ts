import { parseJwt, formatTimeSpan, DecodedJwt } from '../../utils/jwt';
import { Language, t } from '../i18n';
import { ICONS } from '../icons';

export class JwtView {
  private container: HTMLElement;
  private currentLang: Language;
  private onMessage: (msg: any) => void;

  private inputArea!: HTMLTextAreaElement;
  private statusBadge!: HTMLElement;
  private claimsContainer!: HTMLElement;
  private headerBlock!: HTMLElement;
  private payloadBlock!: HTMLElement;
  private outputSections!: HTMLElement;
  private errorMsg!: HTMLElement;

  private decoded: DecodedJwt | null = null;

  constructor(container: HTMLElement, currentLang: Language, onMessage: (msg: any) => void) {
    this.container = container;
    this.currentLang = currentLang;
    this.onMessage = onMessage;
    this.render();
  }

  public setLanguage(lang: Language) {
    this.currentLang = lang;
    this.render();
  }

  public getState() {
    return {
      input: this.inputArea ? this.inputArea.value : ''
    };
  }

  public restoreState(state: { input?: string }) {
    if (state.input && this.inputArea) {
      this.inputArea.value = state.input;
      this.processJwt();
    }
  }

  private render() {
    const savedInput = this.inputArea ? this.inputArea.value : '';

    this.container.innerHTML = `
      <div class="form-group">
        <div class="input-row" style="margin-bottom: 6px; justify-content: space-between;">
          <span class="form-label" style="margin: 0;">${t('tabJwt', this.currentLang)}</span>
          <button id="jwt-clear-btn" class="btn btn-secondary btn-icon-only" title="${t('clear', this.currentLang)}">
            ${ICONS.clear}
          </button>
        </div>
        <textarea id="jwt-input" class="input-textarea" placeholder="${t('jwtInputPlaceholder', this.currentLang)}" style="height: 85px;">${savedInput}</textarea>
        <div id="jwt-error" style="color: #f85149; font-size: 11px; margin-top: 4px; display: none;"></div>
      </div>

      <div id="jwt-status-bar" style="margin-bottom: 10px; display: none;">
        <span id="jwt-badge" class="status-pill"></span>
      </div>

      <div id="jwt-outputs" style="display: none;">
        <div id="jwt-claims-summary" style="margin-bottom: 10px;"></div>

        <div class="code-container" style="margin-bottom: 10px;">
          <div class="code-header">
            <span>${t('jwtPayload', this.currentLang)}</span>
            <button id="copy-jwt-payload" class="btn btn-secondary btn-icon-only" title="${t('copy', this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
          <pre class="code-block" id="jwt-payload-code"></pre>
        </div>

        <div class="code-container">
          <div class="code-header">
            <span>${t('jwtHeader', this.currentLang)}</span>
            <button id="copy-jwt-header" class="btn btn-secondary btn-icon-only" title="${t('copy', this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
          <pre class="code-block" id="jwt-header-code"></pre>
        </div>
      </div>
    `;

    this.inputArea = this.container.querySelector('#jwt-input') as HTMLTextAreaElement;
    this.statusBadge = this.container.querySelector('#jwt-badge') as HTMLElement;
    this.claimsContainer = this.container.querySelector('#jwt-claims-summary') as HTMLElement;
    this.headerBlock = this.container.querySelector('#jwt-header-code') as HTMLElement;
    this.payloadBlock = this.container.querySelector('#jwt-payload-code') as HTMLElement;
    this.outputSections = this.container.querySelector('#jwt-outputs') as HTMLElement;
    this.errorMsg = this.container.querySelector('#jwt-error') as HTMLElement;

    this.attachEvents();
  }

  private attachEvents() {
    this.inputArea?.addEventListener('input', () => this.processJwt());

    const clearBtn = this.container.querySelector('#jwt-clear-btn') as HTMLButtonElement;
    clearBtn?.addEventListener('click', () => {
      this.inputArea.value = '';
      this.outputSections.style.display = 'none';
      const statusBar = this.container.querySelector('#jwt-status-bar') as HTMLElement;
      if (statusBar) statusBar.style.display = 'none';
      this.errorMsg.style.display = 'none';
    });

    const copyPayloadBtn = this.container.querySelector('#copy-jwt-payload') as HTMLButtonElement;
    copyPayloadBtn?.addEventListener('click', () => {
      if (this.decoded) {
        this.copyText(this.decoded.payloadFormatted, copyPayloadBtn);
      }
    });

    const copyHeaderBtn = this.container.querySelector('#copy-jwt-header') as HTMLButtonElement;
    copyHeaderBtn?.addEventListener('click', () => {
      if (this.decoded) {
        this.copyText(this.decoded.headerFormatted, copyHeaderBtn);
      }
    });
  }

  private processJwt() {
    const raw = this.inputArea.value.trim();
    if (!raw) {
      this.outputSections.style.display = 'none';
      const statusBar = this.container.querySelector('#jwt-status-bar') as HTMLElement;
      if (statusBar) statusBar.style.display = 'none';
      this.errorMsg.style.display = 'none';
      return;
    }

    try {
      this.decoded = parseJwt(raw);
      this.errorMsg.style.display = 'none';
      this.renderDecodedData(this.decoded);
    } catch (err: any) {
      this.decoded = null;
      this.errorMsg.textContent = err.message || t('invalidJwt', this.currentLang);
      this.errorMsg.style.display = 'block';
      this.outputSections.style.display = 'none';
      const statusBar = this.container.querySelector('#jwt-status-bar') as HTMLElement;
      if (statusBar) statusBar.style.display = 'none';
    }
  }

  private renderDecodedData(jwt: DecodedJwt) {
    const statusBar = this.container.querySelector('#jwt-status-bar') as HTMLElement;
    statusBar.style.display = 'block';

    const isFa = this.currentLang === 'fa';

    if (jwt.expiresInSeconds !== null) {
      const timeSpanStr = formatTimeSpan(jwt.expiresInSeconds, isFa);
      if (jwt.isExpired) {
        this.statusBadge.className = 'status-pill status-expired';
        this.statusBadge.textContent = `${t('jwtStatusExpired', this.currentLang)} (${timeSpanStr})`;
      } else {
        this.statusBadge.className = 'status-pill status-valid';
        this.statusBadge.textContent = `${t('jwtStatusValid', this.currentLang)} (${timeSpanStr})`;
      }
    } else {
      this.statusBadge.className = 'status-pill status-neutral';
      this.statusBadge.textContent = t('jwtStatusNoExpiry', this.currentLang);
    }

    // Claims summary
    const claims: { label: string; value: string }[] = [];
    if (jwt.expiresAt) {
      claims.push({ label: t('jwtExpiresAt', this.currentLang), value: jwt.expiresAt.toLocaleString() });
    }
    if (jwt.issuedAt) {
      claims.push({ label: t('jwtIssuedAt', this.currentLang), value: jwt.issuedAt.toLocaleString() });
    }
    if (jwt.notBefore) {
      claims.push({ label: t('jwtNotBefore', this.currentLang), value: jwt.notBefore.toLocaleString() });
    }
    if (jwt.payload.sub) {
      claims.push({ label: 'Subject (sub):', value: String(jwt.payload.sub) });
    }
    if (jwt.payload.iss) {
      claims.push({ label: 'Issuer (iss):', value: String(jwt.payload.iss) });
    }

    if (claims.length > 0) {
      this.claimsContainer.innerHTML = `
        <table class="data-table">
          <tbody>
            ${claims.map((c) => `
              <tr>
                <td style="width: 40%; color: var(--vscode-descriptionForeground);">${c.label}</td>
                <td class="mono">${c.value}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      this.claimsContainer.innerHTML = '';
    }

    this.headerBlock.textContent = jwt.headerFormatted;
    this.payloadBlock.textContent = jwt.payloadFormatted;
    this.outputSections.style.display = 'block';
  }

  private copyText(text: string, button: HTMLButtonElement) {
    navigator.clipboard.writeText(text).then(() => {
      const originalHtml = button.innerHTML;
      button.innerHTML = `${ICONS.check}`;
      button.classList.add('status-valid');
      setTimeout(() => {
        button.innerHTML = originalHtml;
        button.classList.remove('status-valid');
      }, 1400);
    });
  }
}
