import { Language, t } from '../i18n';
import { ICONS } from '../icons';

interface TailwindColor {
  name: string;
  hex: string;
  r: number;
  g: number;
  b: number;
}

// Standard Tailwind Color Palette (subset of core shades for high accuracy)
const TAILWIND_PALETTE: TailwindColor[] = [
  // Slate
  { name: 'slate-50', hex: '#f8fafc', r: 248, g: 250, b: 252 },
  { name: 'slate-100', hex: '#f1f5f9', r: 241, g: 245, b: 249 },
  { name: 'slate-200', hex: '#e2e8f0', r: 226, g: 232, b: 240 },
  { name: 'slate-300', hex: '#cbd5e1', r: 203, g: 213, b: 225 },
  { name: 'slate-400', hex: '#94a3b8', r: 148, g: 163, b: 184 },
  { name: 'slate-500', hex: '#64748b', r: 100, g: 116, b: 139 },
  { name: 'slate-600', hex: '#475569', r: 71, g: 85, b: 105 },
  { name: 'slate-700', hex: '#334155', r: 51, g: 65, b: 85 },
  { name: 'slate-800', hex: '#1e293b', r: 30, g: 41, b: 59 },
  { name: 'slate-900', hex: '#0f172a', r: 15, g: 23, b: 42 },
  { name: 'slate-950', hex: '#020617', r: 2, g: 6, b: 23 },

  // Red
  { name: 'red-500', hex: '#ef4444', r: 239, g: 68, b: 68 },
  { name: 'red-600', hex: '#dc2626', r: 220, g: 38, b: 38 },
  { name: 'red-700', hex: '#b91c1c', r: 185, g: 28, b: 28 },

  // Orange
  { name: 'orange-500', hex: '#f97316', r: 249, g: 115, b: 22 },
  { name: 'orange-600', hex: '#ea580c', r: 234, g: 88, b: 12 },

  // Amber
  { name: 'amber-400', hex: '#fbbf24', r: 251, g: 191, b: 36 },
  { name: 'amber-500', hex: '#f59e0b', r: 245, g: 158, b: 11 },

  // Yellow
  { name: 'yellow-400', hex: '#facc15', r: 250, g: 204, b: 21 },

  // Emerald & Green
  { name: 'emerald-500', hex: '#10b981', r: 16, g: 185, b: 129 },
  { name: 'emerald-600', hex: '#059669', r: 5, g: 150, b: 105 },
  { name: 'green-500', hex: '#22c55e', r: 34, g: 197, b: 94 },

  // Cyan & Sky
  { name: 'cyan-500', hex: '#06b6d4', r: 6, g: 182, b: 212 },
  { name: 'sky-500', hex: '#0ea5e9', r: 14, g: 165, b: 233 },

  // Blue
  { name: 'blue-500', hex: '#3b82f6', r: 59, g: 130, b: 246 },
  { name: 'blue-600', hex: '#2563eb', r: 37, g: 99, b: 235 },
  { name: 'blue-700', hex: '#1d4ed8', r: 29, g: 78, b: 216 },

  // Indigo
  { name: 'indigo-500', hex: '#6366f1', r: 99, g: 102, b: 241 },
  { name: 'indigo-600', hex: '#4f46e5', r: 79, g: 70, b: 229 },

  // Violet & Purple
  { name: 'violet-500', hex: '#8b5cf6', r: 139, g: 92, b: 246 },
  { name: 'purple-500', hex: '#a855f7', r: 168, g: 85, b: 247 },

  // Pink & Rose
  { name: 'pink-500', hex: '#ec4899', r: 236, g: 72, b: 153 },
  { name: 'rose-500', hex: '#f43f5e', r: 244, g: 63, b: 94 },

  // Neutral Black/White
  { name: 'black', hex: '#000000', r: 0, g: 0, b: 0 },
  { name: 'white', hex: '#ffffff', r: 255, g: 255, b: 255 }
];

export class CssDesignerView {
  private container: HTMLElement;
  private currentLang: Language;
  private onMessage: (msg: any) => void;

  // Active section tab: 'color' | 'glass' | 'units' | 'viewport'
  private activeSubTab: string = 'color';

  // Color state
  private colorHex: string = '#6366f1';
  private colorRgb: { r: number; g: number; b: number } = { r: 99, g: 102, b: 241 };
  private colorHsl: { h: number; s: number; l: number } = { h: 239, s: 84, l: 67 };
  private nearestTailwind: TailwindColor = TAILWIND_PALETTE.find(c => c.name === 'indigo-500')!;

  // Glassmorphism state
  private glassBlur: number = 16;
  private glassOpacity: number = 25;
  private glassBorderOpacity: number = 20;
  private glassRadius: number = 14;
  private glassElevation: number = 24;

  // Units converter state
  private rootFontSize: number = 16;
  private pxValue: number = 16;
  private remValue: number = 1.0;

  constructor(container: HTMLElement, currentLang: Language, onMessage: (msg: any) => void) {
    this.container = container;
    this.currentLang = currentLang;
    this.onMessage = onMessage;
    this.updateColorFromHex('#6366f1');
    this.render();
  }

  public setLanguage(lang: Language) {
    this.currentLang = lang;
    this.render();
  }

  public getState() {
    return {
      activeSubTab: this.activeSubTab,
      colorHex: this.colorHex,
      glassBlur: this.glassBlur,
      glassOpacity: this.glassOpacity,
      glassBorderOpacity: this.glassBorderOpacity,
      glassRadius: this.glassRadius,
      glassElevation: this.glassElevation,
      rootFontSize: this.rootFontSize,
      pxValue: this.pxValue
    };
  }

  public restoreState(state: any) {
    if (!state) return;
    if (state.activeSubTab) this.activeSubTab = state.activeSubTab;
    if (state.colorHex) this.updateColorFromHex(state.colorHex);
    if (state.glassBlur !== undefined) this.glassBlur = state.glassBlur;
    if (state.glassOpacity !== undefined) this.glassOpacity = state.glassOpacity;
    if (state.glassBorderOpacity !== undefined) this.glassBorderOpacity = state.glassBorderOpacity;
    if (state.glassRadius !== undefined) this.glassRadius = state.glassRadius;
    if (state.glassElevation !== undefined) this.glassElevation = state.glassElevation;
    if (state.rootFontSize !== undefined) this.rootFontSize = state.rootFontSize;
    if (state.pxValue !== undefined) {
      this.pxValue = state.pxValue;
      this.remValue = parseFloat((this.pxValue / this.rootFontSize).toFixed(4));
    }
    this.render();
  }

  private updateColorFromHex(hex: string) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length !== 6) return;

    this.colorHex = '#' + hex;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    this.colorRgb = { r, g, b };

    // HSL
    this.colorHsl = this.rgbToHsl(r, g, b);

    // Nearest Tailwind color (Euclidean distance)
    let minDistance = Infinity;
    let closest = TAILWIND_PALETTE[0];

    for (const tw of TAILWIND_PALETTE) {
      const dist = Math.sqrt(
        Math.pow(r - tw.r, 2) + Math.pow(g - tw.g, 2) + Math.pow(b - tw.b, 2)
      );
      if (dist < minDistance) {
        minDistance = dist;
        closest = tw;
      }
    }
    this.nearestTailwind = closest;
  }

  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  private render() {
    const isRtl = this.currentLang === 'fa';

    this.container.innerHTML = `
      <div class="css-designer-view" dir="${isRtl ? 'rtl' : 'ltr'}">
        <div class="deck-hero-banner">
          <div class="deck-hero-icon">${ICONS.palette}</div>
          <div class="deck-hero-content">
            <h3 class="deck-hero-title">${t('cssTitle', this.currentLang)}</h3>
            <p class="deck-hero-desc">${t('cssDesc', this.currentLang)}</p>
          </div>
        </div>

        <!-- Sub Tabs Navigation -->
        <div class="css-subtabs-nav">
          <button class="css-subtab-btn ${this.activeSubTab === 'color' ? 'active' : ''}" data-tab="color">
            ${ICONS.palette} <span>${t('cssTabColor', this.currentLang)}</span>
          </button>
          <button class="css-subtab-btn ${this.activeSubTab === 'glass' ? 'active' : ''}" data-tab="glass">
            ${ICONS.sliders} <span>${t('cssTabGlass', this.currentLang)}</span>
          </button>
          <button class="css-subtab-btn ${this.activeSubTab === 'units' ? 'active' : ''}" data-tab="units">
            ${ICONS.brackets} <span>${t('cssTabUnits', this.currentLang)}</span>
          </button>
          <button class="css-subtab-btn ${this.activeSubTab === 'viewport' ? 'active' : ''}" data-tab="viewport">
            ${ICONS.smartphone} <span>${t('cssTabViewport', this.currentLang)}</span>
          </button>
        </div>

        <!-- Sub Tab Content -->
        <div class="css-subtab-body">
          ${this.renderActiveTabContent()}
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderActiveTabContent(): string {
    switch (this.activeSubTab) {
      case 'color': return this.renderColorTab();
      case 'glass': return this.renderGlassTab();
      case 'units': return this.renderUnitsTab();
      case 'viewport': return this.renderViewportTab();
      default: return this.renderColorTab();
    }
  }

  private renderColorTab(): string {
    const { r, g, b } = this.colorRgb;
    const { h, s, l } = this.colorHsl;
    const tw = this.nearestTailwind;

    return `
      <div class="card css-tool-card">
        <div class="css-color-picker-row">
          <div class="css-color-swatch-wrap">
            <input type="color" id="css-native-color-picker" class="css-color-input" value="${this.colorHex}" />
            <div class="css-color-preview-circle" style="background: ${this.colorHex}"></div>
          </div>
          <div class="css-color-hex-group flex-1">
            <label class="form-label">${t('cssColorHex', this.currentLang)}</label>
            <div class="input-with-action">
              <input type="text" id="css-hex-input" class="form-input form-input-sm" value="${this.colorHex}" />
              <button class="btn-icon css-copy-btn" data-copy="${this.colorHex}" title="${t('copy', this.currentLang)}">
                ${ICONS.copy}
              </button>
            </div>
          </div>
        </div>

        <div class="css-color-formats-grid mt-2">
          <div class="css-format-box">
            <span class="css-format-label">${t('cssColorRgb', this.currentLang)}</span>
            <code class="css-format-val">rgb(${r}, ${g}, ${b})</code>
            <button class="btn-icon css-copy-btn" data-copy="rgb(${r}, ${g}, ${b})" title="${t('copy', this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
          <div class="css-format-box">
            <span class="css-format-label">${t('cssColorHsl', this.currentLang)}</span>
            <code class="css-format-val">hsl(${h}, ${s}%, ${l}%)</code>
            <button class="btn-icon css-copy-btn" data-copy="hsl(${h}, ${s}%, ${l}%)" title="${t('copy', this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
        </div>

        <!-- Nearest Tailwind Matcher -->
        <div class="css-tailwind-match-card mt-3">
          <div class="card-header-sm">
            <span class="badge-accent">Tailwind CSS Match</span>
            <span class="css-tw-exact-name">${tw.name} (${tw.hex})</span>
          </div>

          <div class="css-tw-classes-list">
            <div class="css-tw-item">
              <span class="css-tw-type">${t('cssTailwindBg', this.currentLang)}:</span>
              <code class="css-tw-code">bg-${tw.name}</code>
              <button class="btn-icon css-copy-btn" data-copy="bg-${tw.name}" title="${t('copy', this.currentLang)}">${ICONS.copy}</button>
            </div>
            <div class="css-tw-item">
              <span class="css-tw-type">${t('cssTailwindText', this.currentLang)}:</span>
              <code class="css-tw-code">text-${tw.name}</code>
              <button class="btn-icon css-copy-btn" data-copy="text-${tw.name}" title="${t('copy', this.currentLang)}">${ICONS.copy}</button>
            </div>
            <div class="css-tw-item">
              <span class="css-tw-type">${t('cssTailwindBorder', this.currentLang)}:</span>
              <code class="css-tw-code">border-${tw.name}</code>
              <button class="btn-icon css-copy-btn" data-copy="border-${tw.name}" title="${t('copy', this.currentLang)}">${ICONS.copy}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderGlassTab(): string {
    const cssCode = `background: rgba(255, 255, 255, ${(this.glassOpacity / 100).toFixed(2)});\nbackdrop-filter: blur(${this.glassBlur}px);\n-webkit-backdrop-filter: blur(${this.glassBlur}px);\nborder: 1px solid rgba(255, 255, 255, ${(this.glassBorderOpacity / 100).toFixed(2)});\nborder-radius: ${this.glassRadius}px;\nbox-shadow: 0 8px ${this.glassElevation}px 0 rgba(0, 0, 0, 0.3);`;

    const twClasses = `bg-white/${this.glassOpacity} backdrop-blur-${this.glassBlur > 16 ? 'xl' : 'md'} border border-white/${this.glassBorderOpacity} rounded-${this.glassRadius > 16 ? '2xl' : 'xl'} shadow-lg`;

    return `
      <div class="card css-tool-card">
        <!-- Live Glassmorphism Interactive Canvas -->
        <div class="css-glass-mesh-stage">
          <div class="css-mesh-bubble bubble-1"></div>
          <div class="css-mesh-bubble bubble-2"></div>
          <div class="css-mesh-bubble bubble-3"></div>

          <!-- Glass Card Overlay -->
          <div class="css-glass-card-preview" style="
            background: rgba(255, 255, 255, ${(this.glassOpacity / 100).toFixed(2)});
            backdrop-filter: blur(${this.glassBlur}px);
            -webkit-backdrop-filter: blur(${this.glassBlur}px);
            border: 1px solid rgba(255, 255, 255, ${(this.glassBorderOpacity / 100).toFixed(2)});
            border-radius: ${this.glassRadius}px;
            box-shadow: 0 8px ${this.glassElevation}px 0 rgba(0, 0, 0, 0.3);
          ">
            <div class="css-glass-preview-content">
              <div class="css-glass-dot"></div>
              <div class="css-glass-title">Glassmorphism Live</div>
              <div class="css-glass-subtitle">Blur ${this.glassBlur}px • Opacity ${this.glassOpacity}%</div>
            </div>
          </div>
        </div>

        <!-- Visual Sliders -->
        <div class="css-sliders-list mt-3">
          <div class="form-group">
            <div class="slider-header">
              <label class="form-label mb-0">${t('cssGlassBlur', this.currentLang)}</label>
              <span class="slider-val">${this.glassBlur}px</span>
            </div>
            <input type="range" id="css-glass-blur-range" class="form-range" min="0" max="40" value="${this.glassBlur}" />
          </div>

          <div class="form-group">
            <div class="slider-header">
              <label class="form-label mb-0">${t('cssGlassOpacity', this.currentLang)}</label>
              <span class="slider-val">${this.glassOpacity}%</span>
            </div>
            <input type="range" id="css-glass-opacity-range" class="form-range" min="5" max="90" value="${this.glassOpacity}" />
          </div>

          <div class="form-group">
            <div class="slider-header">
              <label class="form-label mb-0">${t('cssGlassBorder', this.currentLang)}</label>
              <span class="slider-val">${this.glassBorderOpacity}%</span>
            </div>
            <input type="range" id="css-glass-border-range" class="form-range" min="5" max="80" value="${this.glassBorderOpacity}" />
          </div>

          <div class="form-group">
            <div class="slider-header">
              <label class="form-label mb-0">${t('cssGlassRadius', this.currentLang)}</label>
              <span class="slider-val">${this.glassRadius}px</span>
            </div>
            <input type="range" id="css-glass-radius-range" class="form-range" min="0" max="32" value="${this.glassRadius}" />
          </div>
        </div>

        <!-- Export Buttons -->
        <div class="css-glass-actions mt-3">
          <button class="btn btn-secondary btn-sm flex-1 css-copy-btn" data-copy="${this.escapeHtml(cssCode)}">
            ${ICONS.copy} <span>${t('cssCopyCss', this.currentLang)}</span>
          </button>
          <button class="btn btn-primary btn-sm flex-1 css-copy-btn" data-copy="${this.escapeHtml(twClasses)}">
            ${ICONS.copy} <span>${t('cssCopyTailwind', this.currentLang)}</span>
          </button>
        </div>
      </div>
    `;
  }

  private renderUnitsTab(): string {
    const presets = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64];

    return `
      <div class="card css-tool-card">
        <div class="form-group">
          <label class="form-label">${t('cssBaseFontSize', this.currentLang)}</label>
          <input type="number" id="css-root-font-size" class="form-input form-input-sm" value="${this.rootFontSize}" min="8" max="32" />
        </div>

        <div class="css-units-sync-row">
          <div class="form-group flex-1">
            <label class="form-label">${t('cssPxValue', this.currentLang)}</label>
            <div class="input-with-action">
              <input type="number" id="css-px-input" class="form-input form-input-sm" value="${this.pxValue}" step="1" />
              <button class="btn-icon css-copy-btn" data-copy="${this.pxValue}px" title="${t('copy', this.currentLang)}">${ICONS.copy}</button>
            </div>
          </div>

          <div class="css-units-arrow-divider">⇄</div>

          <div class="form-group flex-1">
            <label class="form-label">${t('cssRemValue', this.currentLang)}</label>
            <div class="input-with-action">
              <input type="number" id="css-rem-input" class="form-input form-input-sm" value="${this.remValue}" step="0.0625" />
              <button class="btn-icon css-copy-btn" data-copy="${this.remValue}rem" title="${t('copy', this.currentLang)}">${ICONS.copy}</button>
            </div>
          </div>
        </div>

        <!-- Quick Presets Grid -->
        <div class="form-group mt-3">
          <label class="form-label-xs">Common Breakpoint & Spacing Presets:</label>
          <div class="css-presets-grid">
            ${presets.map(px => {
              const rem = (px / this.rootFontSize).toFixed(px % 16 === 0 ? 1 : 3);
              return `
                <button type="button" class="btn-preset-pill" data-px="${px}">
                  <strong>${px}px</strong> <span class="text-muted">(${rem}rem)</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  private renderViewportTab(): string {
    return `
      <div class="card css-tool-card text-center p-4">
        <div class="css-viewport-hero-icon">${ICONS.smartphone}</div>
        <h4 class="css-viewport-title">${t('cssOpenMobilePreview', this.currentLang)}</h4>
        <p class="css-viewport-desc">${t('cssPreviewNotice', this.currentLang)}</p>

        <div class="css-devices-badges mt-3">
          <span class="badge-device">${ICONS.smartphone} iPhone 16 Pro (393 × 852)</span>
          <span class="badge-device">${ICONS.tablet} iPad Air (820 × 1180)</span>
          <span class="badge-device">${ICONS.monitor} Desktop (1024 × 768)</span>
        </div>

        <button id="css-launch-preview-btn" class="btn btn-primary btn-md mt-4 w-100">
          ${ICONS.externalLink} <span>${t('cssOpenMobilePreview', this.currentLang)}</span>
        </button>
      </div>
    `;
  }

  private attachEvents() {
    // Subtab switching
    this.container.querySelectorAll('.css-subtab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = (btn as HTMLElement).dataset.tab;
        if (tab) {
          this.activeSubTab = tab;
          this.render();
        }
      });
    });

    // Native color picker
    const nativeColor = this.container.querySelector('#css-native-color-picker') as HTMLInputElement;
    if (nativeColor) {
      nativeColor.addEventListener('input', () => {
        this.updateColorFromHex(nativeColor.value);
        this.render();
      });
    }

    // HEX input
    const hexInput = this.container.querySelector('#css-hex-input') as HTMLInputElement;
    if (hexInput) {
      hexInput.addEventListener('change', () => {
        this.updateColorFromHex(hexInput.value);
        this.render();
      });
    }

    // Glass sliders
    const blurRange = this.container.querySelector('#css-glass-blur-range') as HTMLInputElement;
    if (blurRange) {
      blurRange.addEventListener('input', () => {
        this.glassBlur = parseInt(blurRange.value, 10);
        this.updateGlassPreview();
      });
    }

    const opRange = this.container.querySelector('#css-glass-opacity-range') as HTMLInputElement;
    if (opRange) {
      opRange.addEventListener('input', () => {
        this.glassOpacity = parseInt(opRange.value, 10);
        this.updateGlassPreview();
      });
    }

    const borderRange = this.container.querySelector('#css-glass-border-range') as HTMLInputElement;
    if (borderRange) {
      borderRange.addEventListener('input', () => {
        this.glassBorderOpacity = parseInt(borderRange.value, 10);
        this.updateGlassPreview();
      });
    }

    const radiusRange = this.container.querySelector('#css-glass-radius-range') as HTMLInputElement;
    if (radiusRange) {
      radiusRange.addEventListener('input', () => {
        this.glassRadius = parseInt(radiusRange.value, 10);
        this.updateGlassPreview();
      });
    }

    // Units converter inputs
    const rootInput = this.container.querySelector('#css-root-font-size') as HTMLInputElement;
    if (rootInput) {
      rootInput.addEventListener('input', () => {
        this.rootFontSize = parseFloat(rootInput.value) || 16;
        this.remValue = parseFloat((this.pxValue / this.rootFontSize).toFixed(4));
        const remIn = this.container.querySelector('#css-rem-input') as HTMLInputElement;
        if (remIn) remIn.value = this.remValue.toString();
      });
    }

    const pxInput = this.container.querySelector('#css-px-input') as HTMLInputElement;
    const remInput = this.container.querySelector('#css-rem-input') as HTMLInputElement;

    if (pxInput && remInput) {
      pxInput.addEventListener('input', () => {
        this.pxValue = parseFloat(pxInput.value) || 0;
        this.remValue = parseFloat((this.pxValue / this.rootFontSize).toFixed(4));
        remInput.value = this.remValue.toString();
      });

      remInput.addEventListener('input', () => {
        this.remValue = parseFloat(remInput.value) || 0;
        this.pxValue = parseFloat((this.remValue * this.rootFontSize).toFixed(2));
        pxInput.value = this.pxValue.toString();
      });
    }

    // Presets buttons
    this.container.querySelectorAll('.btn-preset-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const px = parseFloat((btn as HTMLElement).dataset.px || '16');
        this.pxValue = px;
        this.remValue = parseFloat((this.pxValue / this.rootFontSize).toFixed(4));
        if (pxInput) pxInput.value = this.pxValue.toString();
        if (remInput) remInput.value = this.remValue.toString();
      });
    });

    // Launch mobile preview panel
    const launchBtn = this.container.querySelector('#css-launch-preview-btn');
    if (launchBtn) {
      launchBtn.addEventListener('click', () => {
        this.onMessage({ command: 'openMobilePreview' });
      });
    }

    // Universal copy buttons
    this.container.querySelectorAll('.css-copy-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const textToCopy = (btn as HTMLElement).dataset.copy;
        if (textToCopy) {
          try {
            await navigator.clipboard.writeText(textToCopy);
            this.flashCopied(btn as HTMLElement);
          } catch {
            this.onMessage({ command: 'copyToClipboard', text: textToCopy });
            this.flashCopied(btn as HTMLElement);
          }
        }
      });
    });
  }

  private updateGlassPreview() {
    const card = this.container.querySelector('.css-glass-card-preview') as HTMLElement;
    if (card) {
      card.style.background = `rgba(255, 255, 255, ${(this.glassOpacity / 100).toFixed(2)})`;
      card.style.backdropFilter = `blur(${this.glassBlur}px)`;
      (card.style as any).webkitBackdropFilter = `blur(${this.glassBlur}px)`;
      card.style.border = `1px solid rgba(255, 255, 255, ${(this.glassBorderOpacity / 100).toFixed(2)})`;
      card.style.borderRadius = `${this.glassRadius}px`;
      card.style.boxShadow = `0 8px ${this.glassElevation}px 0 rgba(0, 0, 0, 0.3)`;
    }

    const sub = this.container.querySelector('.css-glass-subtitle');
    if (sub) {
      sub.textContent = `Blur ${this.glassBlur}px • Opacity ${this.glassOpacity}%`;
    }
  }

  private flashCopied(el: HTMLElement) {
    const originalHtml = el.innerHTML;
    el.innerHTML = ICONS.check;
    setTimeout(() => {
      el.innerHTML = originalHtml;
    }, 1500);
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
