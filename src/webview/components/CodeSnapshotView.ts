import { Language, t } from '../i18n';
import { ICONS } from '../icons';

export interface SnapshotPreset {
  id: string;
  nameKey: keyof typeof import('../i18n').translations['en'];
  gradient: string;
  editorBg: string;
  textColor: string;
}

export const SNAPSHOT_PRESETS: SnapshotPreset[] = [
  {
    id: 'sunset',
    nameKey: 'snapshotPresetSunset',
    gradient: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 40%, #f97316 100%)',
    editorBg: '#1e1e2e',
    textColor: '#cdd6f4'
  },
  {
    id: 'ocean',
    nameKey: 'snapshotPresetOcean',
    gradient: 'linear-gradient(135deg, #0369a1 0%, #0284c7 40%, #6366f1 100%)',
    editorBg: '#0f172a',
    textColor: '#e2e8f0'
  },
  {
    id: 'midnight',
    nameKey: 'snapshotPresetMidnight',
    gradient: 'linear-gradient(135deg, #09090b 0%, #1e1b4b 50%, #4338ca 100%)',
    editorBg: '#121217',
    textColor: '#f4f4f5'
  },
  {
    id: 'emerald',
    nameKey: 'snapshotPresetEmerald',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)',
    editorBg: '#06281e',
    textColor: '#d1fae5'
  },
  {
    id: 'amber',
    nameKey: 'snapshotPresetAmber',
    gradient: 'linear-gradient(135deg, #78350f 0%, #b45309 50%, #f59e0b 100%)',
    editorBg: '#1c1917',
    textColor: '#fef3c7'
  },
  {
    id: 'monochrome',
    nameKey: 'snapshotPresetMonochrome',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
    editorBg: '#0b0f19',
    textColor: '#f8fafc'
  }
];

export class CodeSnapshotView {
  private container: HTMLElement;
  private currentLang: Language;
  private onMessage: (msg: any) => void;

  private code: string = `// Welcome to DevShelf Code Snapshot
function calculateFibonacci(n: number): number {
  if (n <= 1) return n;
  return calculateFibonacci(n - 1) + calculateFibonacci(n - 2);
}

const result = calculateFibonacci(10);
console.log("Fibonacci(10) =", result);`;

  private title: string = 'fibonacci.ts';
  private language: string = 'typescript';
  private selectedPresetId: string = 'sunset';
  private showLineNumbers: boolean = true;
  private showWatermark: boolean = true;
  private watermarkText: string = 'DevShelf Studio';
  private padding: number = 32;
  private statusMessage: string = '';

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

  public setCodeSnippet(code: string, languageId?: string, filename?: string) {
    if (code) {
      this.code = code;
    }
    if (languageId) {
      this.language = languageId;
    }
    if (filename) {
      this.title = filename;
    }
    this.render();
  }

  public getState() {
    return {
      code: this.code,
      title: this.title,
      language: this.language,
      selectedPresetId: this.selectedPresetId,
      showLineNumbers: this.showLineNumbers,
      showWatermark: this.showWatermark,
      watermarkText: this.watermarkText,
      padding: this.padding
    };
  }

  public restoreState(state: any) {
    if (!state) return;
    if (state.code !== undefined) this.code = state.code;
    if (state.title !== undefined) this.title = state.title;
    if (state.language !== undefined) this.language = state.language;
    if (state.selectedPresetId !== undefined) this.selectedPresetId = state.selectedPresetId;
    if (state.showLineNumbers !== undefined) this.showLineNumbers = state.showLineNumbers;
    if (state.showWatermark !== undefined) this.showWatermark = state.showWatermark;
    if (state.watermarkText !== undefined) this.watermarkText = state.watermarkText;
    if (state.padding !== undefined) this.padding = state.padding;
    this.render();
  }

  private getPreset(): SnapshotPreset {
    return SNAPSHOT_PRESETS.find(p => p.id === this.selectedPresetId) || SNAPSHOT_PRESETS[0];
  }

  private render() {
    const isRtl = this.currentLang === 'fa';
    const preset = this.getPreset();

    this.container.innerHTML = `
      <div class="snapshot-view" dir="${isRtl ? 'rtl' : 'ltr'}">
        <div class="deck-hero-banner">
          <div class="deck-hero-icon">${ICONS.camera}</div>
          <div class="deck-hero-content">
            <h3 class="deck-hero-title">${t('snapshotTitle', this.currentLang)}</h3>
            <p class="deck-hero-desc">${t('snapshotDesc', this.currentLang)}</p>
          </div>
        </div>

        <!-- Controls Toolbar -->
        <div class="card snapshot-controls-card">
          <div class="snapshot-controls-row">
            <div class="form-group flex-1">
              <label class="form-label">${t('snapshotTitleInput', this.currentLang)}</label>
              <input type="text" id="snapshot-title-input" class="form-input form-input-sm" value="${this.escapeHtml(this.title)}" placeholder="filename.ts" />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">${t('snapshotLanguage', this.currentLang)}</label>
              <select id="snapshot-lang-select" class="form-select form-input-sm">
                <option value="typescript" ${this.language === 'typescript' ? 'selected' : ''}>TypeScript</option>
                <option value="javascript" ${this.language === 'javascript' ? 'selected' : ''}>JavaScript</option>
                <option value="python" ${this.language === 'python' ? 'selected' : ''}>Python</option>
                <option value="rust" ${this.language === 'rust' ? 'selected' : ''}>Rust</option>
                <option value="go" ${this.language === 'go' ? 'selected' : ''}>Go</option>
                <option value="sql" ${this.language === 'sql' ? 'selected' : ''}>SQL</option>
                <option value="html" ${this.language === 'html' ? 'selected' : ''}>HTML</option>
                <option value="css" ${this.language === 'css' ? 'selected' : ''}>CSS</option>
                <option value="json" ${this.language === 'json' ? 'selected' : ''}>JSON</option>
              </select>
            </div>
          </div>

          <!-- Preset Gradient Selector -->
          <div class="form-group">
            <label class="form-label">${t('snapshotTheme', this.currentLang)}</label>
            <div class="snapshot-presets-grid">
              ${SNAPSHOT_PRESETS.map(p => `
                <button type="button" class="snapshot-preset-btn ${p.id === this.selectedPresetId ? 'active' : ''}" data-preset-id="${p.id}" title="${t(p.nameKey, this.currentLang)}">
                  <span class="snapshot-preset-color" style="background: ${p.gradient}"></span>
                  <span class="snapshot-preset-name">${t(p.nameKey, this.currentLang)}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Toggles & Options -->
          <div class="snapshot-options-row">
            <label class="checkbox-label">
              <input type="checkbox" id="snapshot-line-numbers-chk" ${this.showLineNumbers ? 'checked' : ''} />
              <span>${t('snapshotLineNumbers', this.currentLang)}</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="snapshot-watermark-chk" ${this.showWatermark ? 'checked' : ''} />
              <span>${t('snapshotWatermark', this.currentLang)}</span>
            </label>
            <div class="snapshot-padding-control">
              <label class="form-label-xs">${t('snapshotPadding', this.currentLang)}:</label>
              <select id="snapshot-padding-select" class="form-select form-input-xs">
                <option value="16" ${this.padding === 16 ? 'selected' : ''}>16px</option>
                <option value="24" ${this.padding === 24 ? 'selected' : ''}>24px</option>
                <option value="32" ${this.padding === 32 ? 'selected' : ''}>32px</option>
                <option value="48" ${this.padding === 48 ? 'selected' : ''}>48px</option>
              </select>
            </div>
          </div>

          ${this.showWatermark ? `
            <div class="form-group snapshot-watermark-input-wrap">
              <input type="text" id="snapshot-watermark-input" class="form-input form-input-sm" value="${this.escapeHtml(this.watermarkText)}" placeholder="${t('snapshotWatermark', this.currentLang)}" />
            </div>
          ` : ''}

          <!-- Action Buttons -->
          <div class="snapshot-actions-row">
            <button id="snapshot-import-sel-btn" class="btn btn-secondary btn-sm" title="${t('snapshotImportSelection', this.currentLang)}">
              ${ICONS.search} <span>${t('snapshotImportSelection', this.currentLang)}</span>
            </button>
            <button id="snapshot-copy-btn" class="btn btn-primary btn-sm">
              ${ICONS.copy} <span>${t('snapshotCopyImage', this.currentLang)}</span>
            </button>
            <button id="snapshot-save-btn" class="btn btn-primary btn-sm">
              ${ICONS.download} <span>${t('snapshotSavePng', this.currentLang)}</span>
            </button>
          </div>
          ${this.statusMessage ? `<div class="snapshot-status-alert">${this.statusMessage}</div>` : ''}
        </div>

        <!-- Live Code Input & Preview Container -->
        <div class="card snapshot-editor-wrapper">
          <div class="card-header-sm">
            <label class="form-label mb-0">Code Source</label>
          </div>
          <textarea id="snapshot-code-editor" class="snapshot-textarea" rows="8" placeholder="${t('snapshotPlaceholder', this.currentLang)}">${this.escapeHtml(this.code)}</textarea>
        </div>

        <!-- Rendered Code Card Preview -->
        <div class="card snapshot-preview-card">
          <div class="card-header-sm">
            <label class="form-label mb-0">Live Preview</label>
          </div>
          <div class="snapshot-canvas-outer" style="background: ${preset.gradient}; padding: ${this.padding}px;">
            <div class="snapshot-window-frame" style="background: ${preset.editorBg}; color: ${preset.textColor};">
              <div class="snapshot-window-header">
                <div class="snapshot-mac-dots">
                  <span class="mac-dot mac-dot-red"></span>
                  <span class="mac-dot mac-dot-yellow"></span>
                  <span class="mac-dot mac-dot-green"></span>
                </div>
                <div class="snapshot-window-title">${this.escapeHtml(this.title)}</div>
                <div class="snapshot-window-lang-tag">${this.language}</div>
              </div>
              <div class="snapshot-window-body">
                <pre class="snapshot-code-pre"><code>${this.renderSyntaxTokens(this.code)}</code></pre>
              </div>
              ${this.showWatermark ? `
                <div class="snapshot-window-footer">
                  <span class="snapshot-watermark-tag">${this.escapeHtml(this.watermarkText)}</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private attachEvents() {
    // Title change
    const titleInput = this.container.querySelector('#snapshot-title-input') as HTMLInputElement;
    if (titleInput) {
      titleInput.addEventListener('input', () => {
        this.title = titleInput.value.trim() || 'untitled';
        const titleEl = this.container.querySelector('.snapshot-window-title');
        if (titleEl) titleEl.textContent = this.title;
      });
    }

    // Language select
    const langSelect = this.container.querySelector('#snapshot-lang-select') as HTMLSelectElement;
    if (langSelect) {
      langSelect.addEventListener('change', () => {
        this.language = langSelect.value;
        const langEl = this.container.querySelector('.snapshot-window-lang-tag');
        if (langEl) langEl.textContent = this.language;
      });
    }

    // Preset selection
    this.container.querySelectorAll('.snapshot-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.presetId;
        if (id) {
          this.selectedPresetId = id;
          this.render();
        }
      });
    });

    // Line numbers toggle
    const linesChk = this.container.querySelector('#snapshot-line-numbers-chk') as HTMLInputElement;
    if (linesChk) {
      linesChk.addEventListener('change', () => {
        this.showLineNumbers = linesChk.checked;
        this.render();
      });
    }

    // Watermark toggle
    const wmChk = this.container.querySelector('#snapshot-watermark-chk') as HTMLInputElement;
    if (wmChk) {
      wmChk.addEventListener('change', () => {
        this.showWatermark = wmChk.checked;
        this.render();
      });
    }

    // Watermark text
    const wmInput = this.container.querySelector('#snapshot-watermark-input') as HTMLInputElement;
    if (wmInput) {
      wmInput.addEventListener('input', () => {
        this.watermarkText = wmInput.value;
        const tag = this.container.querySelector('.snapshot-watermark-tag');
        if (tag) tag.textContent = this.watermarkText;
      });
    }

    // Padding select
    const padSelect = this.container.querySelector('#snapshot-padding-select') as HTMLSelectElement;
    if (padSelect) {
      padSelect.addEventListener('change', () => {
        this.padding = parseInt(padSelect.value, 10) || 32;
        const outer = this.container.querySelector('.snapshot-canvas-outer') as HTMLElement;
        if (outer) outer.style.padding = `${this.padding}px`;
      });
    }

    // Code textarea
    const codeArea = this.container.querySelector('#snapshot-code-editor') as HTMLTextAreaElement;
    if (codeArea) {
      codeArea.addEventListener('input', () => {
        this.code = codeArea.value;
        const codePre = this.container.querySelector('.snapshot-code-pre code');
        if (codePre) {
          codePre.innerHTML = this.renderSyntaxTokens(this.code);
        }
      });
    }

    // Import selection from active editor
    const importBtn = this.container.querySelector('#snapshot-import-sel-btn');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        this.onMessage({ command: 'getEditorCode' });
      });
    }

    // Copy image
    const copyBtn = this.container.querySelector('#snapshot-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        await this.copyImageToClipboard();
      });
    }

    // Save PNG
    const saveBtn = this.container.querySelector('#snapshot-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.savePngImage();
      });
    }
  }

  private renderSyntaxTokens(code: string): string {
    const lines = code.split('\n');
    return lines.map((line, idx) => {
      const lineNum = this.showLineNumbers
        ? `<span class="snapshot-line-num">${(idx + 1).toString().padStart(2, ' ')}</span> `
        : '';
      const highlighted = this.highlightLine(line);
      return `<span class="snapshot-line">${lineNum}${highlighted}</span>`;
    }).join('\n');
  }

  private highlightLine(line: string): string {
    // Quick regex token highlighting
    let escaped = this.escapeHtml(line);

    // Comment
    if (escaped.trim().startsWith('//') || escaped.trim().startsWith('#')) {
      return `<span class="token-comment">${escaped}</span>`;
    }

    // Strings
    escaped = escaped.replace(/(["'`].*?["'`])/g, '<span class="token-string">$1</span>');

    // Keywords
    const keywords = ['const', 'let', 'var', 'function', 'return', 'class', 'import', 'export', 'from', 'if', 'else', 'for', 'while', 'def', 'async', 'await', 'switch', 'case', 'break', 'new', 'try', 'catch', 'finally', 'public', 'private', 'static'];
    const kwRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    escaped = escaped.replace(kwRegex, '<span class="token-keyword">$1</span>');

    // Numbers
    escaped = escaped.replace(/\b(\d+)\b/g, '<span class="token-number">$1</span>');

    return escaped;
  }

  private async generateCanvas(): Promise<HTMLCanvasElement> {
    const scale = 2; // Retina 2x
    const preset = this.getPreset();
    const lines = this.code.split('\n');

    const padding = this.padding;
    const headerHeight = 36;
    const footerHeight = this.showWatermark ? 28 : 12;
    const lineHeight = 20;
    const codeHeight = lines.length * lineHeight + 20;
    const windowHeight = headerHeight + codeHeight + footerHeight;

    // Estimate width based on longest line
    const maxLineLen = Math.max(...lines.map(l => l.length), 30);
    const charWidth = 8.5;
    const windowWidth = Math.min(Math.max(maxLineLen * charWidth + (this.showLineNumbers ? 60 : 30), 420), 800);

    const canvasWidth = windowWidth + padding * 2;
    const canvasHeight = windowHeight + padding * 2;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth * scale;
    canvas.height = canvasHeight * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.scale(scale, scale);

    // 1. Draw outer gradient background
    const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    if (preset.id === 'sunset') {
      grad.addColorStop(0, '#f43f5e');
      grad.addColorStop(0.5, '#fb7185');
      grad.addColorStop(1, '#f97316');
    } else if (preset.id === 'ocean') {
      grad.addColorStop(0, '#0369a1');
      grad.addColorStop(0.5, '#0284c7');
      grad.addColorStop(1, '#6366f1');
    } else if (preset.id === 'midnight') {
      grad.addColorStop(0, '#09090b');
      grad.addColorStop(0.5, '#1e1b4b');
      grad.addColorStop(1, '#4338ca');
    } else if (preset.id === 'emerald') {
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(0.5, '#047857');
      grad.addColorStop(1, '#10b981');
    } else if (preset.id === 'amber') {
      grad.addColorStop(0, '#78350f');
      grad.addColorStop(0.5, '#b45309');
      grad.addColorStop(1, '#f59e0b');
    } else {
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e293b');
      grad.addColorStop(1, '#334155');
    }

    this.roundRect(ctx, 0, 0, canvasWidth, canvasHeight, 16);
    ctx.fillStyle = grad;
    ctx.fill();

    // 2. Draw window container with shadow
    const winX = padding;
    const winY = padding;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 12;

    this.roundRect(ctx, winX, winY, windowWidth, windowHeight, 10);
    ctx.fillStyle = preset.editorBg;
    ctx.fill();
    ctx.restore();

    // 3. Draw window header & traffic light dots
    ctx.fillStyle = '#ff5f56';
    ctx.beginPath();
    ctx.arc(winX + 18, winY + 18, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffbd2e';
    ctx.beginPath();
    ctx.arc(winX + 34, winY + 18, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#27c93f';
    ctx.beginPath();
    ctx.arc(winX + 50, winY + 18, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Window title
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'center';
    ctx.fillText(this.title, winX + windowWidth / 2, winY + 22);

    // Header divider line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(winX, winY + headerHeight);
    ctx.lineTo(winX + windowWidth, winY + headerHeight);
    ctx.stroke();

    // 4. Draw Code lines
    ctx.font = '13px "JetBrains Mono", Consolas, "Courier New", monospace';
    ctx.textAlign = 'left';

    let currentY = winY + headerHeight + 20;
    const codeStartX = winX + (this.showLineNumbers ? 46 : 20);

    lines.forEach((line, idx) => {
      if (this.showLineNumbers) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillText((idx + 1).toString().padStart(2, ' '), winX + 16, currentY);
      }

      ctx.fillStyle = preset.textColor;
      // Simple coloring for comments or normal text
      if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
        ctx.fillStyle = '#6b7280';
      } else if (line.includes('function') || line.includes('const') || line.includes('return')) {
        ctx.fillStyle = '#93c5fd';
      }
      ctx.fillText(line, codeStartX, currentY);

      currentY += lineHeight;
    });

    // 5. Watermark in bottom right
    if (this.showWatermark && this.watermarkText) {
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.textAlign = 'right';
      ctx.fillText(this.watermarkText, winX + windowWidth - 16, winY + windowHeight - 10);
    }

    return canvas;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private async copyImageToClipboard() {
    try {
      const canvas = await this.generateCanvas();
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          if (navigator.clipboard && (window as any).ClipboardItem) {
            await navigator.clipboard.write([
              new (window as any).ClipboardItem({ 'image/png': blob })
            ]);
            this.showStatus(t('snapshotCopied', this.currentLang));
          } else {
            // Send to host as dataURL
            const dataUrl = canvas.toDataURL('image/png');
            this.onMessage({ command: 'copySnapshotDataUrl', dataUrl });
            this.showStatus(t('snapshotCopied', this.currentLang));
          }
        } catch {
          const dataUrl = canvas.toDataURL('image/png');
          this.onMessage({ command: 'copySnapshotDataUrl', dataUrl });
          this.showStatus(t('snapshotCopied', this.currentLang));
        }
      }, 'image/png');
    } catch (e: any) {
      this.showStatus(`Error: ${e.message || e}`);
    }
  }

  private async savePngImage() {
    try {
      const canvas = await this.generateCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      const filename = `${this.title.replace(/\.[^/.]+$/, '')}-snapshot.png`;
      this.onMessage({ command: 'saveSnapshotImage', dataUrl, filename });
      this.showStatus(t('snapshotSaved', this.currentLang));
    } catch (e: any) {
      this.showStatus(`Error: ${e.message || e}`);
    }
  }

  private showStatus(msg: string) {
    this.statusMessage = msg;
    const alert = this.container.querySelector('.snapshot-status-alert');
    if (alert) {
      alert.textContent = msg;
      alert.classList.add('visible');
      setTimeout(() => {
        alert.classList.remove('visible');
      }, 3500);
    } else {
      this.render();
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
