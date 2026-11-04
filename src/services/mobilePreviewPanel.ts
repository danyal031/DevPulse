import * as vscode from 'vscode';

export class MobilePreviewPanel {
  public static currentPanel: MobilePreviewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _targetUrl: string;
  private _currentDevice: 'iphone' | 'ipad' | 'desktop' = 'iphone';
  private _isLandscape: boolean = false;
  private _scalePercent: number = 90;

  private constructor(panel: vscode.WebviewPanel, initialUrl: string) {
    this._panel = panel;
    this._targetUrl = initialUrl || 'http://localhost:3000';

    this._update();

    this._panel.onDidDispose(() => {
      MobilePreviewPanel.currentPanel = undefined;
    });

    this._panel.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case 'setDevice':
          this._currentDevice = msg.device;
          this._update();
          break;
        case 'toggleOrientation':
          this._isLandscape = !this._isLandscape;
          this._update();
          break;
        case 'setScale':
          this._scalePercent = msg.scale;
          this._update();
          break;
        case 'navigate':
          this._targetUrl = msg.url;
          this._update();
          break;
      }
    });
  }

  public static createOrShow(initialUrlOrUri: string | vscode.Uri = 'http://localhost:3000') {
    const initialUrl = typeof initialUrlOrUri === 'string' ? initialUrlOrUri : 'http://localhost:3000';
    const column = vscode.ViewColumn.Beside;

    if (MobilePreviewPanel.currentPanel) {
      MobilePreviewPanel.currentPanel._panel.reveal(column);
      if (initialUrl && initialUrl !== MobilePreviewPanel.currentPanel._targetUrl) {
        MobilePreviewPanel.currentPanel._targetUrl = initialUrl;
        MobilePreviewPanel.currentPanel._update();
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'devshelf.mobilePreview',
      'DevShelf: Mobile Viewport Preview',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    MobilePreviewPanel.currentPanel = new MobilePreviewPanel(panel, initialUrl);
  }

  private _update() {
    this._panel.title = `Mobile Preview: ${this._currentDevice.toUpperCase()}`;
    this._panel.webview.html = this._getHtmlForWebview();
  }

  private _getHtmlForWebview(): string {
    const devices = {
      iphone: { name: 'iPhone 16 Pro', width: 393, height: 852, radius: 44, notch: true },
      ipad: { name: 'iPad Air', width: 820, height: 1180, radius: 24, notch: false },
      desktop: { name: 'Compact Desktop', width: 1024, height: 768, radius: 10, notch: false }
    };

    const dev = devices[this._currentDevice];
    const frameW = this._isLandscape ? dev.height : dev.width;
    const frameH = this._isLandscape ? dev.width : dev.height;
    const scale = this._scalePercent / 100;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Viewport Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-foreground, #cccccc);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      user-select: none;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--vscode-sideBar-background, #252526);
      border-bottom: 1px solid var(--vscode-widget-border, #3c3c3c);
      flex-wrap: wrap;
    }
    .device-tabs {
      display: flex;
      background: var(--vscode-input-background, #3c3c3c);
      border-radius: 6px;
      padding: 2px;
      gap: 2px;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--vscode-foreground, #ccc);
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 500;
      border-radius: 4px;
      cursor: pointer;
    }
    .tab-btn.active {
      background: var(--vscode-button-background, #007acc);
      color: var(--vscode-button-foreground, #fff);
    }
    .url-bar {
      display: flex;
      flex: 1;
      min-width: 200px;
      align-items: center;
      gap: 4px;
    }
    .url-input {
      flex: 1;
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, #ccc);
      border: 1px solid var(--vscode-input-border, #555);
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 11px;
      font-family: monospace;
      outline: none;
    }
    .url-input:focus {
      border-color: var(--vscode-focusBorder, #007acc);
    }
    .action-btn {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #fff);
      border: 1px solid var(--vscode-widget-border, #555);
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 11px;
      cursor: pointer;
    }
    .action-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }
    .preview-canvas {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
      padding: 20px;
      background: radial-gradient(circle, rgba(128,128,128,0.1) 1px, transparent 1px);
      background-size: 16px 16px;
    }
    .device-shell {
      position: relative;
      background: #121316;
      border: 4px solid #2b2e35;
      border-radius: ${dev.radius}px;
      box-shadow: 0 25px 60px -15px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08);
      overflow: hidden;
      transform: scale(${scale});
      transform-origin: center center;
      transition: transform 0.2s ease, width 0.25s ease, height 0.25s ease;
      width: ${frameW}px;
      height: ${frameH}px;
      display: flex;
      flex-direction: column;
    }
    .dynamic-island {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      width: 100px;
      height: 24px;
      background: #000;
      border-radius: 14px;
      z-index: 10;
      pointer-events: none;
      display: ${dev.notch && !this._isLandscape ? 'block' : 'none'};
    }
    .viewport-frame {
      width: 100%;
      height: 100%;
      border: none;
      background: #fff;
    }
    .dim-badge {
      font-size: 10px;
      color: var(--vscode-descriptionForeground, #888);
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="device-tabs">
      <button class="tab-btn ${this._currentDevice === 'iphone' ? 'active' : ''}" onclick="switchDev('iphone')">iPhone 16</button>
      <button class="tab-btn ${this._currentDevice === 'ipad' ? 'active' : ''}" onclick="switchDev('ipad')">iPad Air</button>
      <button class="tab-btn ${this._currentDevice === 'desktop' ? 'active' : ''}" onclick="switchDev('desktop')">Desktop</button>
    </div>

    <button class="action-btn" onclick="toggleOrient()" title="Rotate Device">
      Rotate (${this._isLandscape ? 'Landscape' : 'Portrait'})
    </button>

    <div class="url-bar">
      <input type="text" id="url-input" class="url-input" value="${this._targetUrl}" placeholder="http://localhost:3000" />
      <button class="action-btn" onclick="applyUrl()">Go</button>
      <button class="action-btn" onclick="reloadFrame()" title="Reload Frame">Reload</button>
    </div>

    <span class="dim-badge">${frameW} × ${frameH} px</span>

    <select class="action-btn" onchange="changeScale(this.value)" style="padding: 3px 6px;">
      <option value="50" ${this._scalePercent === 50 ? 'selected' : ''}>50%</option>
      <option value="75" ${this._scalePercent === 75 ? 'selected' : ''}>75%</option>
      <option value="90" ${this._scalePercent === 90 ? 'selected' : ''}>90%</option>
      <option value="100" ${this._scalePercent === 100 ? 'selected' : ''}>100%</option>
    </select>
  </div>

  <div class="preview-canvas">
    <div class="device-shell">
      <div class="dynamic-island"></div>
      <iframe id="target-frame" class="viewport-frame" src="${this._targetUrl}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function switchDev(dev) {
      vscode.postMessage({ type: 'setDevice', device: dev });
    }
    function toggleOrient() {
      vscode.postMessage({ type: 'toggleOrientation' });
    }
    function changeScale(val) {
      vscode.postMessage({ type: 'setScale', scale: parseInt(val, 10) });
    }
    function applyUrl() {
      const val = document.getElementById('url-input').value.trim();
      vscode.postMessage({ type: 'navigate', url: val });
    }
    function reloadFrame() {
      const frame = document.getElementById('target-frame');
      if (frame) frame.src = frame.src;
    }
    document.getElementById('url-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyUrl();
    });
  </script>
</body>
</html>`;
  }
}
