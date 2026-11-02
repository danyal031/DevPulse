import {
  generateUuidV4,
  generateUlid,
  generateSecret,
  computeHash,
  encodeBase64,
  decodeBase64,
  generateIranianMockDataSet,
  IranianTestData
} from '../../utils/cryptoMock';
import { Language, t } from '../i18n';
import { ICONS } from '../icons';

export class CryptoMockView {
  private container: HTMLElement;
  private currentLang: Language;
  private onMessage: (msg: any) => void;

  private uuidInput!: HTMLInputElement;
  private ulidInput!: HTMLInputElement;
  private secret32Input!: HTMLInputElement;
  private secret64Input!: HTMLInputElement;
  private secretBase64Input!: HTMLInputElement;

  private hasherInput!: HTMLInputElement;
  private hashResult!: HTMLInputElement;

  private b64RawInput!: HTMLTextAreaElement;
  private b64Output!: HTMLInputElement;

  private nationalCodeInput!: HTMLInputElement;
  private mobileInput!: HTMLInputElement;
  private postalInput!: HTMLInputElement;
  private shebaInput!: HTMLInputElement;

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
      hasher: this.hasherInput ? this.hasherInput.value : '',
      b64: this.b64RawInput ? this.b64RawInput.value : ''
    };
  }

  public restoreState(state: { hasher?: string; b64?: string }) {
    if (state.hasher && this.hasherInput) {
      this.hasherInput.value = state.hasher;
      this.updateHash();
    }
    if (state.b64 && this.b64RawInput) {
      this.b64RawInput.value = state.b64;
    }
  }

  private render() {
    this.container.innerHTML = `
      <div style="margin-bottom: 14px;">
        <span style="font-weight: 600; font-size: 11px; display: block; margin-bottom: 8px;">
          ${t('cryptoTitle', this.currentLang)}
        </span>

        <div class="form-group">
          <label class="form-label">${t('uuidLabel', this.currentLang)}</label>
          <div class="input-row">
            <input type="text" id="uuid-field" class="input-text mono" readonly />
            <button id="gen-uuid-btn" class="btn btn-secondary btn-icon-only" title="${t('generate', this.currentLang)}">
              ${ICONS.sync}
            </button>
            <button class="btn btn-secondary btn-icon-only copy-field-btn" data-target="uuid-field" title="${t('copy', this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">${t('ulidLabel', this.currentLang)}</label>
          <div class="input-row">
            <input type="text" id="ulid-field" class="input-text mono" readonly />
            <button id="gen-ulid-btn" class="btn btn-secondary btn-icon-only" title="${t('generate', this.currentLang)}">
              ${ICONS.sync}
            </button>
            <button class="btn btn-secondary btn-icon-only copy-field-btn" data-target="ulid-field" title="${t('copy', this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">${t('secret32Label', this.currentLang)}</label>
          <div class="input-row">
            <input type="text" id="sec32-field" class="input-text mono" readonly />
            <button id="gen-sec32-btn" class="btn btn-secondary btn-icon-only" title="${t('generate', this.currentLang)}">
              ${ICONS.sync}
            </button>
            <button class="btn btn-secondary btn-icon-only copy-field-btn" data-target="sec32-field" title="${t('copy', this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">${t('secret64Label', this.currentLang)}</label>
          <div class="input-row">
            <input type="text" id="sec64-field" class="input-text mono" readonly />
            <button id="gen-sec64-btn" class="btn btn-secondary btn-icon-only" title="${t('generate', this.currentLang)}">
              ${ICONS.sync}
            </button>
            <button class="btn btn-secondary btn-icon-only copy-field-btn" data-target="sec64-field" title="${t('copy', this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
        </div>
      </div>

      <!-- Hasher Section -->
      <div style="border-top: 1px solid var(--devshelf-border); padding-top: 12px; margin-bottom: 14px;">
        <span style="font-weight: 600; font-size: 11px; display: block; margin-bottom: 8px;">
          ${t('hasherTitle', this.currentLang)}
        </span>

        <div class="form-group">
          <input type="text" id="hasher-input" class="input-text" placeholder="${t('hasherInputPlaceholder', this.currentLang)}" />
        </div>

        <div class="form-group">
          <label class="form-label">SHA-256</label>
          <div class="input-row">
            <input type="text" id="hash-sha256" class="input-text mono" readonly />
            <button class="btn btn-secondary btn-icon-only copy-field-btn" data-target="hash-sha256" title="${t('copy', this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
        </div>
      </div>

      <!-- Base64 Section -->
      <div style="border-top: 1px solid var(--devshelf-border); padding-top: 12px; margin-bottom: 14px;">
        <span style="font-weight: 600; font-size: 11px; display: block; margin-bottom: 8px;">
          Base64 & URL Encode / Decode
        </span>

        <div class="form-group">
          <textarea id="b64-raw" class="input-textarea" placeholder="Text to encode / decode..." style="height: 55px;"></textarea>
        </div>

        <div class="btn-group" style="margin-bottom: 8px;">
          <button id="b64-enc-btn" class="btn btn-secondary">Encode Base64</button>
          <button id="b64-dec-btn" class="btn btn-secondary">Decode Base64</button>
          <button id="url-enc-btn" class="btn btn-secondary">URL Encode</button>
          <button id="url-dec-btn" class="btn btn-secondary">URL Decode</button>
        </div>

        <div class="form-group">
          <div class="input-row">
            <input type="text" id="b64-out" class="input-text mono" readonly />
            <button class="btn btn-secondary btn-icon-only copy-field-btn" data-target="b64-out" title="${t('copy', this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
        </div>
      </div>

      <!-- Iranian Mock Data Section -->
      <div style="border-top: 1px solid var(--devshelf-border); padding-top: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: 600; font-size: 11px;">${t('iranMockTitle', this.currentLang)}</span>
          <button id="regen-mock-btn" class="btn btn-secondary" style="padding: 2px 7px; font-size: 10px;">
            ${ICONS.sync} ${t('regenerateMock', this.currentLang)}
          </button>
        </div>

        <div class="form-group">
          <label class="form-label">${t('nationalCodeLabel', this.currentLang)}</label>
          <div class="input-row">
            <input type="text" id="mock-national" class="input-text mono" readonly />
            <button class="btn btn-secondary btn-icon-only copy-field-btn" data-target="mock-national" title="${t('copy', this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">${t('mobileNumberLabel', this.currentLang)}</label>
          <div class="input-row">
            <input type="text" id="mock-mobile" class="input-text mono" readonly />
            <button class="btn btn-secondary btn-icon-only copy-field-btn" data-target="mock-mobile" title="${t('copy', this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">${t('postalCodeLabel', this.currentLang)}</label>
          <div class="input-row">
            <input type="text" id="mock-postal" class="input-text mono" readonly />
            <button class="btn btn-secondary btn-icon-only copy-field-btn" data-target="mock-postal" title="${t('copy', this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">${t('shebaLabel', this.currentLang)}</label>
          <div class="input-row">
            <input type="text" id="mock-sheba" class="input-text mono" readonly />
            <button class="btn btn-secondary btn-icon-only copy-field-btn" data-target="mock-sheba" title="${t('copy', this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
        </div>
      </div>
    `;

    this.uuidInput = this.container.querySelector('#uuid-field') as HTMLInputElement;
    this.ulidInput = this.container.querySelector('#ulid-field') as HTMLInputElement;
    this.secret32Input = this.container.querySelector('#sec32-field') as HTMLInputElement;
    this.secret64Input = this.container.querySelector('#sec64-field') as HTMLInputElement;

    this.hasherInput = this.container.querySelector('#hasher-input') as HTMLInputElement;
    this.hashResult = this.container.querySelector('#hash-sha256') as HTMLInputElement;

    this.b64RawInput = this.container.querySelector('#b64-raw') as HTMLTextAreaElement;
    this.b64Output = this.container.querySelector('#b64-out') as HTMLInputElement;

    this.nationalCodeInput = this.container.querySelector('#mock-national') as HTMLInputElement;
    this.mobileInput = this.container.querySelector('#mock-mobile') as HTMLInputElement;
    this.postalInput = this.container.querySelector('#mock-postal') as HTMLInputElement;
    this.shebaInput = this.container.querySelector('#mock-sheba') as HTMLInputElement;

    this.attachEvents();
    this.generateAllDefaults();
  }

  private attachEvents() {
    this.container.querySelector('#gen-uuid-btn')?.addEventListener('click', () => {
      this.uuidInput.value = generateUuidV4();
    });

    this.container.querySelector('#gen-ulid-btn')?.addEventListener('click', () => {
      this.ulidInput.value = generateUlid();
    });

    this.container.querySelector('#gen-sec32-btn')?.addEventListener('click', () => {
      this.secret32Input.value = generateSecret(32, 'hex');
    });

    this.container.querySelector('#gen-sec64-btn')?.addEventListener('click', () => {
      this.secret64Input.value = generateSecret(64, 'hex');
    });

    this.hasherInput?.addEventListener('input', () => this.updateHash());

    // Base64 & URL
    this.container.querySelector('#b64-enc-btn')?.addEventListener('click', () => {
      if (this.b64RawInput.value) {
        try {
          this.b64Output.value = encodeBase64(this.b64RawInput.value);
        } catch {}
      }
    });

    this.container.querySelector('#b64-dec-btn')?.addEventListener('click', () => {
      if (this.b64RawInput.value) {
        try {
          this.b64Output.value = decodeBase64(this.b64RawInput.value);
        } catch {
          this.b64Output.value = 'Invalid Base64 format.';
        }
      }
    });

    this.container.querySelector('#url-enc-btn')?.addEventListener('click', () => {
      if (this.b64RawInput.value) {
        this.b64Output.value = encodeURIComponent(this.b64RawInput.value);
      }
    });

    this.container.querySelector('#url-dec-btn')?.addEventListener('click', () => {
      if (this.b64RawInput.value) {
        try {
          this.b64Output.value = decodeURIComponent(this.b64RawInput.value);
        } catch {
          this.b64Output.value = 'Invalid URL encoded format.';
        }
      }
    });

    // Mock data
    this.container.querySelector('#regen-mock-btn')?.addEventListener('click', () => {
      this.generateMockData();
    });

    // Copy buttons
    this.container.querySelectorAll('.copy-field-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = (btn as HTMLElement).getAttribute('data-target');
        if (targetId) {
          const input = this.container.querySelector(`#${targetId}`) as HTMLInputElement;
          if (input && input.value) {
            this.copyText(input.value, btn as HTMLButtonElement);
          }
        }
      });
    });
  }

  private generateAllDefaults() {
    this.uuidInput.value = generateUuidV4();
    this.ulidInput.value = generateUlid();
    this.secret32Input.value = generateSecret(32, 'hex');
    this.secret64Input.value = generateSecret(64, 'hex');
    this.generateMockData();
  }

  private generateMockData() {
    const data = generateIranianMockDataSet();
    this.nationalCodeInput.value = data.nationalCode;
    this.mobileInput.value = data.mobileNumber;
    this.postalInput.value = data.postalCode;
    this.shebaInput.value = data.sheba;
  }

  private async updateHash() {
    const raw = this.hasherInput.value;
    if (!raw) {
      this.hashResult.value = '';
      return;
    }
    const hash = await computeHash(raw, 'SHA-256');
    this.hashResult.value = hash;
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
