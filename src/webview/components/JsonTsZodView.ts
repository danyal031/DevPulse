import { generateTsAndZod } from '../../utils/jsonToTsZod';
import { translations, Language, t } from '../i18n';
import { ICONS } from '../icons';

export class JsonTsZodView {
  private container: HTMLElement;
  private currentLang: Language;
  private onMessage: (msg: any) => void;

  private inputArea!: HTMLTextAreaElement;
  private rootInput!: HTMLInputElement;
  private tsCodeBlock!: HTMLElement;
  private zodCodeBlock!: HTMLElement;
  private tsContainer!: HTMLElement;
  private zodContainer!: HTMLElement;
  private errorMsg!: HTMLElement;

  private latestTs: string = '';
  private latestZod: string = '';

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
      input: this.inputArea ? this.inputArea.value : '',
      rootName: this.rootInput ? this.rootInput.value : 'Root'
    };
  }

  public restoreState(state: { input?: string; rootName?: string }) {
    if (state.input && this.inputArea) {
      this.inputArea.value = state.input;
    }
    if (state.rootName && this.rootInput) {
      this.rootInput.value = state.rootName;
    }
    if (state.input) {
      this.processConversion();
    }
  }

  private render() {
    const savedInput = this.inputArea ? this.inputArea.value : '';
    const savedRoot = this.rootInput ? this.rootInput.value : 'Root';

    this.container.innerHTML = `
      <div class="form-group">
        <div class="input-row" style="margin-bottom: 6px;">
          <label class="form-label" style="margin: 0; white-space: nowrap;">${t('jsonRootNameLabel', this.currentLang)}</label>
          <input type="text" id="json-root-name" class="input-text" value="${savedRoot}" style="max-width: 140px;" />
          <button id="json-clear-btn" class="btn btn-secondary btn-icon-only" title="${t('clear', this.currentLang)}">
            ${ICONS.clear}
          </button>
        </div>
        <textarea id="json-input" class="input-textarea" placeholder="${t('jsonInputPlaceholder', this.currentLang)}" style="height: 110px;">${savedInput}</textarea>
        <div id="json-error" style="color: #f85149; font-size: 11px; margin-top: 4px; display: none;"></div>
        <div class="btn-group">
          <button id="json-convert-btn" class="btn">
            ${ICONS.sync} ${t('convert', this.currentLang)}
          </button>
          <button id="copy-both-btn" class="btn btn-secondary" style="display: none;">
            ${ICONS.copy} ${t('copyBoth', this.currentLang)}
          </button>
        </div>
      </div>

      <div id="ts-output-container" class="code-container" style="display: none;">
        <div class="code-header">
          <span>${t('jsonOutputTs', this.currentLang)}</span>
          <div class="code-actions">
            <button id="copy-ts-btn" class="btn btn-secondary btn-icon-only" title="${t('copyTs', this.currentLang)}">
              ${ICONS.copy}
            </button>
            <button id="insert-ts-btn" class="btn btn-secondary btn-icon-only" title="${t('insertTs', this.currentLang)}">
              ${ICONS.insert}
            </button>
          </div>
        </div>
        <pre class="code-block" id="ts-code"></pre>
      </div>

      <div id="zod-output-container" class="code-container" style="display: none;">
        <div class="code-header">
          <span>${t('jsonOutputZod', this.currentLang)}</span>
          <div class="code-actions">
            <button id="copy-zod-btn" class="btn btn-secondary btn-icon-only" title="${t('copyZod', this.currentLang)}">
              ${ICONS.copy}
            </button>
            <button id="insert-zod-btn" class="btn btn-secondary btn-icon-only" title="${t('insertZod', this.currentLang)}">
              ${ICONS.insert}
            </button>
          </div>
        </div>
        <pre class="code-block" id="zod-code"></pre>
      </div>
    `;

    this.inputArea = this.container.querySelector('#json-input') as HTMLTextAreaElement;
    this.rootInput = this.container.querySelector('#json-root-name') as HTMLInputElement;
    this.tsCodeBlock = this.container.querySelector('#ts-code') as HTMLElement;
    this.zodCodeBlock = this.container.querySelector('#zod-code') as HTMLElement;
    this.tsContainer = this.container.querySelector('#ts-output-container') as HTMLElement;
    this.zodContainer = this.container.querySelector('#zod-output-container') as HTMLElement;
    this.errorMsg = this.container.querySelector('#json-error') as HTMLElement;

    this.attachEvents();
  }

  private attachEvents() {
    const convertBtn = this.container.querySelector('#json-convert-btn') as HTMLButtonElement;
    const clearBtn = this.container.querySelector('#json-clear-btn') as HTMLButtonElement;
    const copyBothBtn = this.container.querySelector('#copy-both-btn') as HTMLButtonElement;
    const copyTsBtn = this.container.querySelector('#copy-ts-btn') as HTMLButtonElement;
    const copyZodBtn = this.container.querySelector('#copy-zod-btn') as HTMLButtonElement;
    const insertTsBtn = this.container.querySelector('#insert-ts-btn') as HTMLButtonElement;
    const insertZodBtn = this.container.querySelector('#insert-zod-btn') as HTMLButtonElement;

    convertBtn?.addEventListener('click', () => this.processConversion());
    this.inputArea?.addEventListener('input', () => {
      if (this.inputArea.value.trim().length > 0) {
        this.processConversion();
      }
    });

    clearBtn?.addEventListener('click', () => {
      this.inputArea.value = '';
      this.tsContainer.style.display = 'none';
      this.zodContainer.style.display = 'none';
      this.errorMsg.style.display = 'none';
      if (copyBothBtn) copyBothBtn.style.display = 'none';
    });

    copyTsBtn?.addEventListener('click', () => {
      this.copyText(this.latestTs, copyTsBtn);
    });

    copyZodBtn?.addEventListener('click', () => {
      this.copyText(this.latestZod, copyZodBtn);
    });

    copyBothBtn?.addEventListener('click', () => {
      const combined = `${this.latestTs}\n${this.latestZod}`;
      this.copyText(combined, copyBothBtn);
    });

    insertTsBtn?.addEventListener('click', () => {
      this.onMessage({ type: 'insertText', text: this.latestTs });
    });

    insertZodBtn?.addEventListener('click', () => {
      this.onMessage({ type: 'insertText', text: this.latestZod });
    });
  }

  private processConversion() {
    const raw = this.inputArea.value.trim();
    if (!raw) {
      this.errorMsg.style.display = 'none';
      return;
    }

    try {
      const rootName = this.rootInput.value.trim() || 'Root';
      const output = generateTsAndZod(raw, { rootName });

      this.latestTs = output.typescript;
      this.latestZod = output.zod;

      this.tsCodeBlock.textContent = output.typescript;
      this.zodCodeBlock.textContent = output.zod;

      this.tsContainer.style.display = 'block';
      this.zodContainer.style.display = 'block';
      this.errorMsg.style.display = 'none';

      const copyBothBtn = this.container.querySelector('#copy-both-btn') as HTMLElement;
      if (copyBothBtn) copyBothBtn.style.display = 'inline-flex';
    } catch (err: any) {
      this.errorMsg.textContent = err.message || t('invalidJson', this.currentLang);
      this.errorMsg.style.display = 'block';
      this.tsContainer.style.display = 'none';
      this.zodContainer.style.display = 'none';
    }
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
