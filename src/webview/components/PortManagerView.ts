import { Language, t } from "../i18n";
import { ICONS } from "../icons";

export interface PortItem {
  port: number;
  pid: number;
  processName: string;
  protocol: "TCP";
  localAddress: string;
}

export class PortManagerView {
  private container: HTMLElement;
  private currentLang: Language;
  private onMessage: (msg: any) => void;

  private searchInput!: HTMLInputElement;
  private refreshBtn!: HTMLButtonElement;
  private portsTableBody!: HTMLElement;
  private emptyState!: HTMLElement;
  private statusNotice!: HTMLElement;

  private allPorts: PortItem[] = [];
  private isScanning = false;

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
    this.renderTable();
  }

  public setPorts(ports: PortItem[]) {
    this.isScanning = false;
    this.allPorts = ports;
    this.renderTable();
  }

  public handlePortKilled(result: {
    success: boolean;
    message: string;
    port: number;
    pid: number;
  }) {
    this.showNotice(result.message, result.success);
    // Request fresh scan
    this.requestScan();
  }

  public requestScan() {
    this.isScanning = true;
    this.showScanning();
    this.onMessage({ type: "scanPorts" });
  }

  private render() {
    this.container.innerHTML = `
      <div style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-weight: 600; font-size: 11px;">${t("portsTitle", this.currentLang)}</span>
          <button id="refresh-ports-btn" class="btn btn-secondary" style="padding: 3px 7px; font-size: 11px;">
            ${ICONS.sync} ${t("refresh", this.currentLang)}
          </button>
        </div>
        <p style="color: var(--vscode-descriptionForeground); font-size: 11px; margin-bottom: 8px;">
          ${t("portsDescription", this.currentLang)}
        </p>

        <div class="search-wrapper">
          <span class="search-icon">${ICONS.search}</span>
          <input type="text" id="ports-search" class="input-text search-input" placeholder="${t("search", this.currentLang)}" />
        </div>

        <div id="port-status-notice" style="display: none; padding: 4px 6px; font-size: 11px; border-radius: 2px; margin-bottom: 6px;"></div>

        <div style="max-height: 380px; overflow-y: auto; border: 1px solid var(--kaarbox-border); border-radius: 3px;">
          <table class="data-table" style="margin-top: 0;">
            <thead>
              <tr>
                <th style="width: 25%;">${t("portHeader", this.currentLang)}</th>
                <th style="width: 45%;">${t("processHeader", this.currentLang)}</th>
                <th style="width: 15%;">${t("pidHeader", this.currentLang)}</th>
                <th style="width: 15%; text-align: center;">${t("actionHeader", this.currentLang)}</th>
              </tr>
            </thead>
            <tbody id="ports-tbody"></tbody>
          </table>
          <div id="ports-empty" class="empty-state" style="display: none;">
            ${t("noPortsFound", this.currentLang)}
          </div>
        </div>
      </div>
    `;

    this.searchInput = this.container.querySelector(
      "#ports-search",
    ) as HTMLInputElement;
    this.refreshBtn = this.container.querySelector(
      "#refresh-ports-btn",
    ) as HTMLButtonElement;
    this.portsTableBody = this.container.querySelector(
      "#ports-tbody",
    ) as HTMLElement;
    this.emptyState = this.container.querySelector(
      "#ports-empty",
    ) as HTMLElement;
    this.statusNotice = this.container.querySelector(
      "#port-status-notice",
    ) as HTMLElement;

    this.attachEvents();
  }

  private attachEvents() {
    this.refreshBtn?.addEventListener("click", () => this.requestScan());
    this.searchInput?.addEventListener("input", () => this.renderTable());
  }

  private showScanning() {
    this.emptyState.textContent = t("scanning", this.currentLang);
    this.emptyState.style.display = "block";
    this.portsTableBody.innerHTML = "";
  }

  private showNotice(msg: string, isSuccess: boolean) {
    this.statusNotice.textContent = msg;
    this.statusNotice.style.display = "block";
    this.statusNotice.style.backgroundColor = isSuccess
      ? "rgba(46, 160, 67, 0.2)"
      : "rgba(248, 81, 73, 0.2)";
    this.statusNotice.style.color = isSuccess ? "#3fb950" : "#f85149";

    setTimeout(() => {
      this.statusNotice.style.display = "none";
    }, 3500);
  }

  private renderTable() {
    const query = this.searchInput
      ? this.searchInput.value.trim().toLowerCase()
      : "";
    const filtered = this.allPorts.filter((p) => {
      if (!query) return true;
      return (
        String(p.port).includes(query) ||
        p.processName.toLowerCase().includes(query) ||
        String(p.pid).includes(query)
      );
    });

    if (filtered.length === 0) {
      this.portsTableBody.innerHTML = "";
      this.emptyState.textContent = t("noPortsFound", this.currentLang);
      this.emptyState.style.display = "block";
      return;
    }

    this.emptyState.style.display = "none";

    this.portsTableBody.innerHTML = filtered
      .map(
        (p) => `
        <tr>
          <td><span class="mono" style="font-weight: 600; color: #58a6ff;">:${p.port}</span></td>
          <td style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100px;" title="${p.processName}">${p.processName}</td>
          <td><span class="mono" style="color: var(--vscode-descriptionForeground);">${p.pid}</span></td>
          <td style="text-align: center;">
            <button class="btn btn-danger btn-icon-only kill-port-btn" data-pid="${p.pid}" data-port="${p.port}" data-name="${p.processName}" title="${t("kill", this.currentLang)}">
              ${ICONS.kill}
            </button>
          </td>
        </tr>
      `,
      )
      .join("");

    // Attach kill listeners
    this.portsTableBody.querySelectorAll(".kill-port-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pid = parseInt(
          (btn as HTMLElement).getAttribute("data-pid") || "0",
          10,
        );
        const port = parseInt(
          (btn as HTMLElement).getAttribute("data-port") || "0",
          10,
        );
        const name = (btn as HTMLElement).getAttribute("data-name") || "";

        if (pid > 0) {
          const confirmMsg = t("killConfirm", this.currentLang)
            .replace("{pid}", String(pid))
            .replace("{name}", name);

          if (confirm(confirmMsg)) {
            this.onMessage({ type: "killPort", pid, port });
          }
        }
      });
    });
  }
}
