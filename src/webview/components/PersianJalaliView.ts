import {
  gregorianToJalali,
  jalaliToGregorian,
  getJalaliDetailsFromGregorian,
  parseJalaliString,
  isJalaliLeapYear,
} from "../../utils/jalali";
import {
  normalizePersianText,
  toEnglishDigits,
  toPersianDigits,
} from "../../utils/persianSanitizer";
import { Language, t } from "../i18n";
import { ICONS } from "../icons";

export class PersianJalaliView {
  private container: HTMLElement;
  private currentLang: Language;
  private onMessage: (msg: any) => void;

  private gregInput!: HTMLInputElement;
  private jalaliInput!: HTMLInputElement;
  private secInput!: HTMLInputElement;
  private msInput!: HTMLInputElement;
  private dateBadges!: HTMLElement;

  private textInputArea!: HTMLTextAreaElement;
  private textOutputArea!: HTMLTextAreaElement;
  private chkDigitsEn!: HTMLInputElement;
  private chkDigitsFa!: HTMLInputElement;
  private chkArabic!: HTMLInputElement;
  private chkZwnj!: HTMLInputElement;
  private chkPunctuation!: HTMLInputElement;
  private chkHarakat!: HTMLInputElement;

  constructor(
    container: HTMLElement,
    currentLang: Language,
    onMessage: (msg: any) => void,
  ) {
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
      greg: this.gregInput ? this.gregInput.value : "",
      jalali: this.jalaliInput ? this.jalaliInput.value : "",
      textIn: this.textInputArea ? this.textInputArea.value : "",
      textOut: this.textOutputArea ? this.textOutputArea.value : "",
    };
  }

  public restoreState(state: {
    greg?: string;
    jalali?: string;
    textIn?: string;
    textOut?: string;
  }) {
    if (state.textIn && this.textInputArea) {
      this.textInputArea.value = state.textIn;
    }
    if (state.textOut && this.textOutputArea) {
      this.textOutputArea.value = state.textOut;
    }
    if (state.greg && this.gregInput) {
      this.gregInput.value = state.greg;
      this.syncFromGregorian(state.greg);
    } else {
      this.setNow();
    }
  }

  private render() {
    this.container.innerHTML = `
      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: 600; font-size: 11px;">${t("dateConverterTitle", this.currentLang)}</span>
          <button id="date-now-btn" class="btn btn-secondary" style="padding: 2px 7px; font-size: 10px;">
            ${t("nowButton", this.currentLang)}
          </button>
        </div>

        <div class="form-group">
          <label class="form-label">${t("gregorianDateLabel", this.currentLang)}</label>
          <div class="input-row">
            <input type="text" id="greg-input" class="input-text mono" placeholder="YYYY-MM-DD" />
            <button class="btn btn-secondary btn-icon-only copy-field-btn" data-target="greg-input" title="${t("copy", this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">${t("jalaliDateLabel", this.currentLang)}</label>
          <div class="input-row">
            <input type="text" id="jalali-input" class="input-text mono" placeholder="YYYY/MM/DD" />
            <button class="btn btn-secondary btn-icon-only copy-field-btn" data-target="jalali-input" title="${t("copy", this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">${t("timestampSecLabel", this.currentLang)}</label>
          <div class="input-row">
            <input type="text" id="sec-input" class="input-text mono" placeholder="1772439333" />
            <button class="btn btn-secondary btn-icon-only copy-field-btn" data-target="sec-input" title="${t("copy", this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">${t("timestampMsLabel", this.currentLang)}</label>
          <div class="input-row">
            <input type="text" id="ms-input" class="input-text mono" placeholder="1772439333000" />
            <button class="btn btn-secondary btn-icon-only copy-field-btn" data-target="ms-input" title="${t("copy", this.currentLang)}">
              ${ICONS.copy}
            </button>
          </div>
        </div>

        <div id="date-badges" style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;"></div>
      </div>

      <div style="border-top: 1px solid var(--devpulse-border); padding-top: 12px;">
        <span style="font-weight: 600; font-size: 11px; display: block; margin-bottom: 8px;">
          ${t("textSanitizerTitle", this.currentLang)}
        </span>

        <div class="form-group">
          <textarea id="persian-text-in" class="input-textarea" placeholder="${t("inputTextPlaceholder", this.currentLang)}" style="height: 70px;"></textarea>
        </div>

        <div style="margin-bottom: 8px;">
          <label class="checkbox-item">
            <input type="checkbox" id="chk-digits-en" checked />
            <span>${t("toEnglishDigits", this.currentLang)}</span>
          </label>
          <label class="checkbox-item">
            <input type="checkbox" id="chk-arabic" checked />
            <span>${t("normalizeArabic", this.currentLang)}</span>
          </label>
          <label class="checkbox-item">
            <input type="checkbox" id="chk-zwnj" checked />
            <span>${t("normalizeZwnj", this.currentLang)}</span>
          </label>
          <label class="checkbox-item">
            <input type="checkbox" id="chk-punct" />
            <span>Normalize Punctuation (؟ ، ؛)</span>
          </label>
          <label class="checkbox-item">
            <input type="checkbox" id="chk-harakat" />
            <span>${t("cleanHarakat", this.currentLang)}</span>
          </label>
        </div>

        <button id="sanitize-btn" class="btn" style="width: 100%; margin-bottom: 8px;">
          ${ICONS.sync} ${t("sanitizeButton", this.currentLang)}
        </button>

        <div class="code-container" id="sanitized-output-wrap" style="display: none;">
          <div class="code-header">
            <span>Result</span>
            <div class="code-actions">
              <button id="copy-sanitized" class="btn btn-secondary btn-icon-only" title="${t("copy", this.currentLang)}">
                ${ICONS.copy}
              </button>
              <button id="insert-sanitized" class="btn btn-secondary btn-icon-only" title="${t("insertAtCursor", this.currentLang)}">
                ${ICONS.insert}
              </button>
            </div>
          </div>
          <textarea id="persian-text-out" class="input-textarea" style="border: none; border-radius: 0; min-height: 70px;" readonly></textarea>
        </div>
      </div>
    `;

    this.gregInput = this.container.querySelector(
      "#greg-input",
    ) as HTMLInputElement;
    this.jalaliInput = this.container.querySelector(
      "#jalali-input",
    ) as HTMLInputElement;
    this.secInput = this.container.querySelector(
      "#sec-input",
    ) as HTMLInputElement;
    this.msInput = this.container.querySelector(
      "#ms-input",
    ) as HTMLInputElement;
    this.dateBadges = this.container.querySelector(
      "#date-badges",
    ) as HTMLElement;

    this.textInputArea = this.container.querySelector(
      "#persian-text-in",
    ) as HTMLTextAreaElement;
    this.textOutputArea = this.container.querySelector(
      "#persian-text-out",
    ) as HTMLTextAreaElement;
    this.chkDigitsEn = this.container.querySelector(
      "#chk-digits-en",
    ) as HTMLInputElement;
    this.chkArabic = this.container.querySelector(
      "#chk-arabic",
    ) as HTMLInputElement;
    this.chkZwnj = this.container.querySelector(
      "#chk-zwnj",
    ) as HTMLInputElement;
    this.chkPunctuation = this.container.querySelector(
      "#chk-punct",
    ) as HTMLInputElement;
    this.chkHarakat = this.container.querySelector(
      "#chk-harakat",
    ) as HTMLInputElement;

    this.attachEvents();
    this.setNow();
  }

  private attachEvents() {
    const nowBtn = this.container.querySelector(
      "#date-now-btn",
    ) as HTMLButtonElement;
    nowBtn?.addEventListener("click", () => this.setNow());

    this.gregInput?.addEventListener("input", () => {
      this.syncFromGregorian(this.gregInput.value.trim());
    });

    this.jalaliInput?.addEventListener("input", () => {
      this.syncFromJalali(this.jalaliInput.value.trim());
    });

    this.secInput?.addEventListener("input", () => {
      const sec = parseInt(this.secInput.value.trim(), 10);
      if (!isNaN(sec)) {
        this.syncFromTimestamp(sec * 1000, "sec");
      }
    });

    this.msInput?.addEventListener("input", () => {
      const ms = parseInt(this.msInput.value.trim(), 10);
      if (!isNaN(ms)) {
        this.syncFromTimestamp(ms, "ms");
      }
    });

    // Copy buttons
    this.container.querySelectorAll(".copy-field-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = (btn as HTMLElement).getAttribute("data-target");
        if (targetId) {
          const input = this.container.querySelector(
            `#${targetId}`,
          ) as HTMLInputElement;
          if (input && input.value) {
            this.copyText(input.value, btn as HTMLButtonElement);
          }
        }
      });
    });

    // Sanitizer events
    const sanitizeBtn = this.container.querySelector(
      "#sanitize-btn",
    ) as HTMLButtonElement;
    sanitizeBtn?.addEventListener("click", () => this.runSanitizer());

    const copySanitizedBtn = this.container.querySelector(
      "#copy-sanitized",
    ) as HTMLButtonElement;
    copySanitizedBtn?.addEventListener("click", () => {
      if (this.textOutputArea.value) {
        this.copyText(this.textOutputArea.value, copySanitizedBtn);
      }
    });

    const insertSanitizedBtn = this.container.querySelector(
      "#insert-sanitized",
    ) as HTMLButtonElement;
    insertSanitizedBtn?.addEventListener("click", () => {
      if (this.textOutputArea.value) {
        this.onMessage({ type: "insertText", text: this.textOutputArea.value });
      }
    });
  }

  private setNow() {
    const now = new Date();
    this.applyDate(now);
  }

  private applyDate(date: Date) {
    if (isNaN(date.getTime())) return;

    const details = getJalaliDetailsFromGregorian(date);
    const gy = date.getFullYear();
    const gm = String(date.getMonth() + 1).padStart(2, "0");
    const gd = String(date.getDate()).padStart(2, "0");

    this.gregInput.value = `${gy}-${gm}-${gd}`;
    this.jalaliInput.value = details.formatted;
    this.secInput.value = String(details.timestampSec);
    this.msInput.value = String(details.timestampMs);

    this.renderBadges(details);
  }

  private syncFromGregorian(str: string) {
    const parts = str.split(/[\-\/\.]/);
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (
        !isNaN(y) &&
        !isNaN(m) &&
        !isNaN(d) &&
        m >= 1 &&
        m <= 12 &&
        d >= 1 &&
        d <= 31
      ) {
        const date = new Date(y, m - 1, d);
        if (!isNaN(date.getTime())) {
          const details = getJalaliDetailsFromGregorian(date);
          this.jalaliInput.value = details.formatted;
          this.secInput.value = String(details.timestampSec);
          this.msInput.value = String(details.timestampMs);
          this.renderBadges(details);
        }
      }
    }
  }

  private syncFromJalali(str: string) {
    const parsed = parseJalaliString(str);
    if (parsed) {
      const { gy, gm, gd } = jalaliToGregorian(parsed.jy, parsed.jm, parsed.jd);
      const date = new Date(gy, gm - 1, gd);
      if (!isNaN(date.getTime())) {
        const padM = String(gm).padStart(2, "0");
        const padD = String(gd).padStart(2, "0");
        this.gregInput.value = `${gy}-${padM}-${padD}`;
        const details = getJalaliDetailsFromGregorian(date);
        this.secInput.value = String(details.timestampSec);
        this.msInput.value = String(details.timestampMs);
        this.renderBadges(details);
      }
    }
  }

  private syncFromTimestamp(ms: number, source: "sec" | "ms") {
    const date = new Date(ms);
    if (!isNaN(date.getTime())) {
      const details = getJalaliDetailsFromGregorian(date);
      const gy = date.getFullYear();
      const gm = String(date.getMonth() + 1).padStart(2, "0");
      const gd = String(date.getDate()).padStart(2, "0");

      this.gregInput.value = `${gy}-${gm}-${gd}`;
      this.jalaliInput.value = details.formatted;
      if (source === "sec") {
        this.msInput.value = String(details.timestampMs);
      } else {
        this.secInput.value = String(details.timestampSec);
      }
      this.renderBadges(details);
    }
  }

  private renderBadges(
    details: ReturnType<typeof getJalaliDetailsFromGregorian>,
  ) {
    const weekday =
      this.currentLang === "fa" ? details.weekdayFa : details.weekdayEn;
    const month =
      this.currentLang === "fa" ? details.monthNameFa : details.monthNameEn;
    const leapStr = details.isLeap
      ? t("leapYearBadge", this.currentLang)
      : t("commonYearBadge", this.currentLang);

    this.dateBadges.innerHTML = `
      <span class="status-pill status-neutral">${weekday}</span>
      <span class="status-pill status-neutral">${month}</span>
      <span class="status-pill ${details.isLeap ? "status-valid" : "status-neutral"}">${leapStr}</span>
    `;
  }

  private runSanitizer() {
    const raw = this.textInputArea.value;
    if (!raw) return;

    const result = normalizePersianText(raw, {
      convertDigitsToEnglish: this.chkDigitsEn.checked,
      normalizeArabicChars: this.chkArabic.checked,
      normalizeZwnj: this.chkZwnj.checked,
      normalizePunctuation: this.chkPunctuation.checked,
      removeHarakat: this.chkHarakat.checked,
    });

    this.textOutputArea.value = result;
    const outputWrap = this.container.querySelector(
      "#sanitized-output-wrap",
    ) as HTMLElement;
    if (outputWrap) outputWrap.style.display = "block";
  }

  private copyText(text: string, button: HTMLButtonElement) {
    navigator.clipboard.writeText(text).then(() => {
      const originalHtml = button.innerHTML;
      button.innerHTML = `${ICONS.check}`;
      button.classList.add("status-valid");
      setTimeout(() => {
        button.innerHTML = originalHtml;
        button.classList.remove("status-valid");
      }, 1400);
    });
  }
}
