import {
  GIT_SCENARIOS,
  GIT_CHEAT_SHEET,
  GitScenario,
  DangerLevel
} from '../../utils/gitScenarios';
import { Language, t } from '../i18n';
import { ICONS } from '../icons';

export class GitWizardView {
  private container: HTMLElement;
  private currentLang: Language;
  private onMessage: (msg: any) => void;

  private subMode: 'wizard' | 'cheatsheet' = 'wizard';
  private selectedCategory: string = 'all';
  private selectedScenarioId: string = 'amend_commit';
  private scenarioSearchQuery: string = '';
  private cheatSheetSearchQuery: string = '';

  private currentParams: Record<string, any> = {};

  constructor(container: HTMLElement, currentLang: Language, onMessage: (msg: any) => void) {
    this.container = container;
    this.currentLang = currentLang;
    this.onMessage = onMessage;
    this.initDefaultParams();
    this.render();
  }

  public setLanguage(lang: Language) {
    this.currentLang = lang;
    this.render();
  }

  public getState() {
    return {
      subMode: this.subMode,
      selectedScenarioId: this.selectedScenarioId,
      currentParams: this.currentParams
    };
  }

  public restoreState(state: { subMode?: 'wizard' | 'cheatsheet'; selectedScenarioId?: string; currentParams?: any }) {
    if (state.subMode) this.subMode = state.subMode;
    if (state.selectedScenarioId) this.selectedScenarioId = state.selectedScenarioId;
    if (state.currentParams) this.currentParams = state.currentParams;
    this.render();
  }

  private initDefaultParams() {
    const scenario = GIT_SCENARIOS.find((s) => s.id === this.selectedScenarioId) || GIT_SCENARIOS[0];
    this.currentParams = {};
    for (const input of scenario.inputs) {
      this.currentParams[input.name] = input.defaultValue;
    }
  }

  private render() {
    this.container.innerHTML = `
      <!-- Sub-Mode Segmented Control -->
      <div style="display: flex; gap: 4px; margin-bottom: 12px; border-bottom: 1px solid var(--devshelf-border); padding-bottom: 8px;">
        <button id="git-sub-wizard" class="btn ${this.subMode === 'wizard' ? '' : 'btn-secondary'}" style="flex: 1; font-size: 11px;">
          ${ICONS.wand} ${t('gitSubModeWizard', this.currentLang)}
        </button>
        <button id="git-sub-cs" class="btn ${this.subMode === 'cheatsheet' ? '' : 'btn-secondary'}" style="flex: 1; font-size: 11px;">
          ${ICONS.book} ${t('gitSubModeCheatSheet', this.currentLang)}
        </button>
      </div>

      <div id="git-wizard-panel" style="display: ${this.subMode === 'wizard' ? 'block' : 'none'};"></div>
      <div id="git-cs-panel" style="display: ${this.subMode === 'cheatsheet' ? 'block' : 'none'};"></div>
    `;

    const wizardPanel = this.container.querySelector('#git-wizard-panel') as HTMLElement;
    const csPanel = this.container.querySelector('#git-cs-panel') as HTMLElement;

    if (this.subMode === 'wizard') {
      this.renderWizard(wizardPanel);
    } else {
      this.renderCheatSheet(csPanel);
    }

    this.container.querySelector('#git-sub-wizard')?.addEventListener('click', () => {
      this.subMode = 'wizard';
      this.render();
    });

    this.container.querySelector('#git-sub-cs')?.addEventListener('click', () => {
      this.subMode = 'cheatsheet';
      this.render();
    });
  }

  private renderWizard(panel: HTMLElement) {
    const categories: { id: string; labelKey: any }[] = [
      { id: 'all', labelKey: 'catAll' },
      { id: 'commits', labelKey: 'catCommits' },
      { id: 'undo', labelKey: 'catUndo' },
      { id: 'branches', labelKey: 'catBranches' },
      { id: 'stash', labelKey: 'catStash' },
      { id: 'rescue', labelKey: 'catRescue' },
      { id: 'remote', labelKey: 'catRemote' }
    ];

    const filteredScenarios = GIT_SCENARIOS.filter((s) => {
      const matchesCategory = this.selectedCategory === 'all' || s.category === this.selectedCategory;
      const title = t(s.titleKey as any, this.currentLang).toLowerCase();
      const desc = t(s.descKey as any, this.currentLang).toLowerCase();
      const query = this.scenarioSearchQuery.toLowerCase();
      const matchesQuery = !query || title.includes(query) || desc.includes(query);
      return matchesCategory && matchesQuery;
    });

    let currentScenario = filteredScenarios.find((s) => s.id === this.selectedScenarioId);
    if (!currentScenario && filteredScenarios.length > 0) {
      currentScenario = filteredScenarios[0];
      this.selectedScenarioId = currentScenario.id;
      this.initDefaultParams();
    }

    panel.innerHTML = `
      <!-- Category Pills -->
      <div style="display: flex; gap: 4px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 8px;">
        ${categories
          .map(
            (c) => `
          <button class="btn ${this.selectedCategory === c.id ? '' : 'btn-secondary'} git-cat-btn" data-cat="${c.id}" style="font-size: 10px; padding: 2px 7px; white-space: nowrap;">
            ${t(c.labelKey, this.currentLang)}
          </button>
        `
          )
          .join('')}
      </div>

      <!-- Scenario Selector Dropdown -->
      <div class="form-group" style="margin-bottom: 8px;">
        <label class="form-label">${t('selectScenario', this.currentLang)}</label>
        <select id="scenario-select" class="input-text" style="cursor: pointer;">
          ${filteredScenarios
            .map(
              (s) => `
            <option value="${s.id}" ${s.id === this.selectedScenarioId ? 'selected' : ''}>
              ${t(s.titleKey as any, this.currentLang)}
            </option>
          `
            )
            .join('')}
        </select>
      </div>

      ${
        currentScenario
          ? `
        <!-- Scenario Description & Danger Badge -->
        <div style="margin-bottom: 10px; padding: 8px; border: 1px solid var(--devshelf-border); border-radius: 3px; background-color: rgba(128, 128, 128, 0.04);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 600; font-size: 11px;">${t(currentScenario.titleKey as any, this.currentLang)}</span>
            ${this.renderDangerBadge(currentScenario.dangerLevel)}
          </div>
          <p style="font-size: 11px; color: var(--vscode-descriptionForeground); margin: 0;">
            ${t(currentScenario.descKey as any, this.currentLang)}
          </p>
        </div>

        <!-- Dynamic Form Fields -->
        <div id="dynamic-form-fields" style="margin-bottom: 12px;">
          ${this.renderDynamicInputs(currentScenario)}
        </div>

        <!-- Live Generated Command Preview -->
        <div class="code-container" style="margin-bottom: 12px;">
          <div class="code-header">
            <span>${t('generatedCommand', this.currentLang)}</span>
            <div class="code-actions">
              <button id="copy-git-cmd" class="btn btn-secondary btn-icon-only" title="${t('copy', this.currentLang)}">
                ${ICONS.copy}
              </button>
              <button id="run-git-cmd" class="btn btn-secondary btn-icon-only" title="${t('runInTerminal', this.currentLang)}">
                ${ICONS.terminal}
              </button>
            </div>
          </div>
          <pre class="code-block mono" id="git-cmd-output" style="color: #58a6ff; font-weight: 600; padding: 10px;"></pre>
        </div>

        <!-- Action Buttons -->
        <div class="btn-group">
          <button id="run-git-cmd-primary" class="btn" style="flex: 1;">
            ${ICONS.terminal} ${t('runInTerminal', this.currentLang)}
          </button>
          <button id="copy-git-cmd-primary" class="btn btn-secondary">
            ${ICONS.copy} ${t('copy', this.currentLang)}
          </button>
        </div>
      `
          : `<div class="empty-state">${t('noPortsFound', this.currentLang)}</div>`
      }
    `;

    this.attachWizardEvents(panel, currentScenario);
  }

  private renderDangerBadge(level: DangerLevel): string {
    if (level === 'dangerous') {
      return `<span class="status-pill status-expired">${t('dangerDangerous', this.currentLang)}</span>`;
    }
    if (level === 'caution') {
      return `<span class="status-pill" style="background: rgba(210, 153, 34, 0.2); color: #d29922; border: 1px solid rgba(210, 153, 34, 0.4);">${t('dangerCaution', this.currentLang)}</span>`;
    }
    return `<span class="status-pill status-valid">${t('dangerSafe', this.currentLang)}</span>`;
  }

  private renderDynamicInputs(scenario: GitScenario): string {
    return scenario.inputs
      .map((input) => {
        const value = this.currentParams[input.name] ?? input.defaultValue;

        if (input.type === 'select') {
          return `
          <div class="form-group" style="margin-bottom: 8px;">
            <label class="form-label">${t(input.labelKey as any, this.currentLang)}</label>
            <select class="input-text dynamic-input" data-name="${input.name}">
              ${(input.options || [])
                .map(
                  (opt) => `
                <option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>
                  ${t(opt.labelKey as any, this.currentLang)}
                </option>
              `
                )
                .join('')}
            </select>
          </div>
        `;
        }

        if (input.type === 'checkbox') {
          return `
          <label class="checkbox-item" style="margin-bottom: 6px;">
            <input type="checkbox" class="dynamic-input" data-name="${input.name}" ${value ? 'checked' : ''} />
            <span>${t(input.labelKey as any, this.currentLang)}</span>
          </label>
        `;
        }

        if (input.type === 'number') {
          return `
          <div class="form-group" style="margin-bottom: 8px;">
            <label class="form-label">${t(input.labelKey as any, this.currentLang)}</label>
            <input type="number" class="input-text dynamic-input" data-name="${input.name}" value="${value}" min="1" max="100" style="max-width: 100px;" />
          </div>
        `;
        }

        // text
        const ph = input.placeholderKey ? t(input.placeholderKey as any, this.currentLang) : '';
        return `
        <div class="form-group" style="margin-bottom: 8px;">
          <label class="form-label">${t(input.labelKey as any, this.currentLang)}</label>
          <input type="text" class="input-text dynamic-input mono" data-name="${input.name}" value="${value}" placeholder="${ph}" />
        </div>
      `;
      })
      .join('');
  }

  private attachWizardEvents(panel: HTMLElement, scenario?: GitScenario) {
    // Category click
    panel.querySelectorAll('.git-cat-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedCategory = (btn as HTMLElement).getAttribute('data-cat') || 'all';
        this.renderWizard(panel);
      });
    });

    // Scenario select change
    const select = panel.querySelector('#scenario-select') as HTMLSelectElement;
    select?.addEventListener('change', () => {
      this.selectedScenarioId = select.value;
      this.initDefaultParams();
      this.renderWizard(panel);
    });

    if (!scenario) return;

    // Dynamic inputs change
    const updatePreview = () => {
      const generated = scenario.generate(this.currentParams);
      const codeOutput = panel.querySelector('#git-cmd-output') as HTMLElement;
      if (codeOutput) {
        codeOutput.textContent = `$ ${generated}`;
      }
    };

    panel.querySelectorAll('.dynamic-input').forEach((el) => {
      const name = (el as HTMLElement).getAttribute('data-name');
      if (!name) return;

      const handler = () => {
        if ((el as HTMLInputElement).type === 'checkbox') {
          this.currentParams[name] = (el as HTMLInputElement).checked;
        } else {
          this.currentParams[name] = (el as HTMLInputElement).value;
        }
        updatePreview();
      };

      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
    });

    updatePreview();

    // Copy Command buttons
    const triggerCopy = (btn: HTMLButtonElement) => {
      const cmd = scenario.generate(this.currentParams);
      navigator.clipboard.writeText(cmd).then(() => {
        const original = btn.innerHTML;
        btn.innerHTML = `${ICONS.check}`;
        btn.classList.add('status-valid');
        setTimeout(() => {
          btn.innerHTML = original;
          btn.classList.remove('status-valid');
        }, 1400);
      });
    };

    const copyBtn1 = panel.querySelector('#copy-git-cmd') as HTMLButtonElement;
    const copyBtn2 = panel.querySelector('#copy-git-cmd-primary') as HTMLButtonElement;
    copyBtn1?.addEventListener('click', () => triggerCopy(copyBtn1));
    copyBtn2?.addEventListener('click', () => triggerCopy(copyBtn2));

    // Run in Terminal buttons
    const triggerRun = (btn: HTMLButtonElement) => {
      const cmd = scenario.generate(this.currentParams);
      this.onMessage({ type: 'runTerminalCommand', command: cmd });
      const original = btn.innerHTML;
      btn.innerHTML = `${ICONS.check} ${t('runningInTerminal', this.currentLang)}`;
      setTimeout(() => {
        btn.innerHTML = original;
      }, 1800);
    };

    const runBtn1 = panel.querySelector('#run-git-cmd') as HTMLButtonElement;
    const runBtn2 = panel.querySelector('#run-git-cmd-primary') as HTMLButtonElement;
    runBtn1?.addEventListener('click', () => triggerRun(runBtn1));
    runBtn2?.addEventListener('click', () => triggerRun(runBtn2));
  }

  private renderCheatSheet(panel: HTMLElement) {
    const query = this.cheatSheetSearchQuery.toLowerCase();
    const items = GIT_CHEAT_SHEET.filter((item) => {
      if (!query) return true;
      const title = t(item.titleKey as any, this.currentLang).toLowerCase();
      const desc = t(item.descKey as any, this.currentLang).toLowerCase();
      return title.includes(query) || desc.includes(query) || item.command.toLowerCase().includes(query);
    });

    panel.innerHTML = `
      <div class="search-wrapper" style="margin-bottom: 10px;">
        <span class="search-icon">${ICONS.search}</span>
        <input type="text" id="cs-search-input" class="input-text search-input" placeholder="${t('cheatSheetSearch', this.currentLang)}" value="${this.cheatSheetSearchQuery}" />
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${items
          .map(
            (item) => `
          <div style="border: 1px solid var(--devshelf-border); border-radius: 3px; padding: 8px; background-color: rgba(128, 128, 128, 0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-weight: 600; font-size: 11px;">${t(item.titleKey as any, this.currentLang)}</span>
              ${this.renderDangerBadge(item.dangerLevel)}
            </div>
            <p style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 6px;">
              ${t(item.descKey as any, this.currentLang)}
            </p>
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--devshelf-editor-bg); border: 1px solid var(--devshelf-border); border-radius: 2px; padding: 4px 6px;">
              <span class="mono" style="color: #58a6ff; font-size: 11px; overflow-x: auto; white-space: nowrap; margin-inline-end: 6px;">$ ${item.command}</span>
              <div style="display: flex; gap: 4px; flex-shrink: 0;">
                <button class="btn btn-secondary btn-icon-only cs-copy-btn" data-cmd="${item.command}" title="${t('copy', this.currentLang)}">
                  ${ICONS.copy}
                </button>
                <button class="btn btn-secondary btn-icon-only cs-run-btn" data-cmd="${item.command}" title="${t('runInTerminal', this.currentLang)}">
                  ${ICONS.terminal}
                </button>
              </div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;

    const searchInput = panel.querySelector('#cs-search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      this.cheatSheetSearchQuery = searchInput.value;
      this.renderCheatSheet(panel);
    });

    panel.querySelectorAll('.cs-copy-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cmd = (btn as HTMLElement).getAttribute('data-cmd');
        if (cmd) {
          navigator.clipboard.writeText(cmd).then(() => {
            const original = btn.innerHTML;
            btn.innerHTML = `${ICONS.check}`;
            btn.classList.add('status-valid');
            setTimeout(() => {
              btn.innerHTML = original;
              btn.classList.remove('status-valid');
            }, 1400);
          });
        }
      });
    });

    panel.querySelectorAll('.cs-run-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cmd = (btn as HTMLElement).getAttribute('data-cmd');
        if (cmd) {
          this.onMessage({ type: 'runTerminalCommand', command: cmd });
          const original = btn.innerHTML;
          btn.innerHTML = `${ICONS.check}`;
          setTimeout(() => {
            btn.innerHTML = original;
          }, 1400);
        }
      });
    });
  }
}
