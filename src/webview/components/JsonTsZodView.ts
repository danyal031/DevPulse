import { generateTsAndZod } from '../../utils/jsonToTsZod';
import { formatJson, minifyJson, repairCommonJson, validateJson } from '../../utils/jsonFormatter';
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
  private statusBadge!: HTMLElement;

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
      this.validateLive();
    }
  }

  private render() {
    const savedInput = this.inputArea ? this.inputArea.value : '';
    const savedRoot = this.rootInput ? this.rootInput.value : 'Root';

    this.container.innerHTML = `
      <!-- Formatter & Action Toolbar -->
      <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">
        <button id="json-fmt-2" class="btn btn-secondary" style="font-size: 10px; padding: 3px 6px;">
          ${t('format2Spaces', this.currentLang)}
        </button>
        <button id="json-fmt-4" class="btn btn-secondary" style="font-size: 10px; padding: 3px 6px;">
          ${t('format4Spaces', this.currentLang)}
        </button>
        <button id="json-minify" class="btn btn-secondary" style="font-size: 10px; padding: 3px 6px;">
          ${t('minifyJson', this.currentLang)}
        </button>
        <button id="json-sort" class="btn btn-secondary" style="font-size: 10px; padding: 3px 6px;">
          ${t('sortKeys', this.currentLang)}
        </button>
        <button id="json-autofix" class="btn btn-secondary" style="font-size: 10px; padding: 3px 6px;">
          ${t('repairJson', this.currentLang)}
        </button>
      </div>

      <div class="form-group">
        <div class="input-row" style="margin-bottom: 6px; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <label class="form-label" style="margin: 0; white-space: nowrap;">${t('jsonRootNameLabel', this.currentLang)}</label>
            <input type="text" id="json-root-name" class="input-text" value="${savedRoot}" style="max-width: 100px; padding: 2px 5px;" />
          </div>
          <div style="display: flex; gap: 4px; align-items: center;">
            <span id="json-status-badge" class="status-pill status-neutral" style="font-size: 10px; display: none;"></span>
            <button id="json-clear-btn" class="btn btn-secondary btn-icon-only" title="${t('clear', this.currentLang)}">
              ${ICONS.clear}
            </button>
          </div>
        </div>

        <textarea id="json-input" class="input-textarea" placeholder="${t('jsonInputPlaceholder', this.currentLang)}" style="height: 120px;">${savedInput}</textarea>
        <div id="json-error" style="color: #f85149; font-size: 11px; margin-top: 4px; display: none;"></div>

        <div class="btn-group" style="margin-top: 6px;">
          <button id="json-convert-btn" class="btn">
            ${ICONS.sync} ${t('generate', this.currentLang)} TS & Zod
          </button>
          <button id="copy-json-btn" class="btn btn-secondary">
            ${ICONS.copy} ${t('copy', this.currentLang)} JSON
          </button>
          <button id="insert-json-btn" class="btn btn-secondary" title="${t('insertAtCursor', this.currentLang)}">
            ${ICONS.insert} ${t('insertAtCursor', this.currentLang)}
          </button>
          <button id="copy-both-btn" class="btn btn-secondary" style="display: none;">
            ${ICONS.copy} ${t('copyBoth', this.currentLang)}
          </button>
        </div>
      </div>

      <!-- Generated TypeScript Block -->
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

      <!-- Generated Zod Block -->
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
    this.statusBadge = this.container.querySelector('#json-status-badge') as HTMLElement;

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
    const copyJsonBtn = this.container.querySelector('#copy-json-btn') as HTMLButtonElement;
    const insertJsonBtn = this.container.querySelector('#insert-json-btn') as HTMLButtonElement;

    // Formatter toolbar buttons
    this.container.querySelector('#json-fmt-2')?.addEventListener('click', () => this.applyFormat(2));
    this.container.querySelector('#json-fmt-4')?.addEventListener('click', () => this.applyFormat(4));
    this.container.querySelector('#json-minify')?.addEventListener('click', () => this.applyMinify());
    this.container.querySelector('#json-sort')?.addEventListener('click', () => this.applySortKeys());
    this.container.querySelector('#json-autofix')?.addEventListener('click', () => this.applyAutoFix());

    convertBtn?.addEventListener('click', () => this.processConversion());
    this.inputArea?.addEventListener('input', () => this.validateLive());

    clearBtn?.addEventListener('click', () => {
      this.inputArea.value = '';
      this.tsContainer.style.display = 'none';
      this.zodContainer.style.display = 'none';
      this.errorMsg.style.display = 'none';
      this.statusBadge.style.display = 'none';
      if (copyBothBtn) copyBothBtn.style.display = 'none';
    });

    copyJsonBtn?.addEventListener('click', () => {
      if (this.inputArea.value) {
        this.copyText(this.inputArea.value, copyJsonBtn);
      }
    });

    insertJsonBtn?.addEventListener('click', () => {
      if (this.inputArea.value) {
        this.onMessage({ type: 'insertText', text: this.inputArea.value });
      }
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

  private validateLive() {
    const raw = this.inputArea.value.trim();
    if (!raw) {
      this.statusBadge.style.display = 'none';
      this.errorMsg.style.display = 'none';
      return;
    }

    const res = validateJson(raw);
    this.statusBadge.style.display = 'inline-flex';

    if (res.isValid) {
      this.statusBadge.className = 'status-pill status-valid';
      this.statusBadge.textContent = t('jsonValidBadge', this.currentLang);
      this.errorMsg.style.display = 'none';
    } else {
      this.statusBadge.className = 'status-pill status-expired';
      this.statusBadge.textContent = t('jsonInvalidBadge', this.currentLang);
      const loc = res.line && res.column ? ` (Line ${res.line}, Col ${res.column})` : '';
      this.errorMsg.textContent = `${res.error}${loc}`;
      this.errorMsg.style.display = 'block';
    }
  }

  private applyFormat(spaces: number) {
    const raw = this.inputArea.value.trim();
    if (!raw) return;

    const res = formatJson(raw, spaces);
    if (res.isValid) {
      this.inputArea.value = res.output;
      this.validateLive();
    } else {
      this.errorMsg.textContent = res.error || t('invalidJson', this.currentLang);
      this.errorMsg.style.display = 'block';
    }
  }

  private applyMinify() {
    const raw = this.inputArea.value.trim();
    if (!raw) return;

    const res = minifyJson(raw);
    if (res.isValid) {
      this.inputArea.value = res.output;
      this.validateLive();
    } else {
      this.errorMsg.textContent = res.error || t('invalidJson', this.currentLang);
      this.errorMsg.style.display = 'block';
    }
  }

  private applySortKeys() {
    const raw = this.inputArea.value.trim();
    if (!raw) return;

    const res = formatJson(raw, 2, true);
    if (res.isValid) {
      this.inputArea.value = res.output;
      this.validateLive();
    }
  }

  private applyAutoFix() {
    const raw = this.inputArea.value.trim();
    if (!raw) return;

    const repaired = repairCommonJson(raw);
    const res = formatJson(repaired, 2);
    if (res.isValid) {
      this.inputArea.value = res.output;
      this.validateLive();
    } else {
      this.inputArea.value = repaired;
      this.validateLive();
    }
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
