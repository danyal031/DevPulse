import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { scanListeningPorts, killProcessByPid } from '../utils/portManager';

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'kaarbox.sidebarView';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'insertText': {
          const editor = vscode.window.activeTextEditor;
          if (editor) {
            await editor.edit((editBuilder) => {
              const selection = editor.selection;
              editBuilder.replace(selection, data.text);
            });
          } else {
            vscode.window.showInformationMessage('Kaarbox: No active text editor found to insert text.');
          }
          break;
        }

        case 'scanPorts': {
          try {
            const ports = await scanListeningPorts();
            this.postMessage({ type: 'portsList', ports });
          } catch (err: any) {
            this.postMessage({ type: 'portsList', ports: [] });
            vscode.window.showErrorMessage(`Kaarbox Port Scan Error: ${err.message}`);
          }
          break;
        }

        case 'killPort': {
          try {
            const { pid, port } = data;
            const result = await killProcessByPid(pid);
            this.postMessage({
              type: 'portKilled',
              success: result.success,
              message: result.message,
              port,
              pid
            });

            if (result.success) {
              vscode.window.showInformationMessage(`Kaarbox: Terminated process on port :${port} (PID: ${pid})`);
            } else {
              vscode.window.showErrorMessage(`Kaarbox: Failed to kill process: ${result.message}`);
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`Kaarbox: Error killing process: ${err.message}`);
          }
          break;
        }

        case 'languageChanged': {
          await this._context.globalState.update('kaarbox.language', data.lang);
          break;
        }
      }
    });

    // Send initial saved language if exists
    const savedLang = this._context.globalState.get<string>('kaarbox.language');
    if (savedLang) {
      this.postMessage({ type: 'setLanguage', lang: savedLang });
    }
  }

  public postMessage(message: unknown) {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  public switchTab(tab: string) {
    if (this._view) {
      this._view.show?.(true);
      this.postMessage({ type: 'switchTab', tab });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.css')
    );

    const nonce = crypto.randomBytes(16).toString('base64');
    const savedLang = this._context.globalState.get<string>('kaarbox.language', 'en');
    const isFa = savedLang === 'fa';

    return `<!DOCTYPE html>
<html lang="${savedLang}" dir="${isFa ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https: data:;" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" type="text/css" href="${styleUri}" />
  <title>Kaarbox</title>
</head>
<body>
  <div id="app-root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
