import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { scanListeningPorts, killProcessByPid } from '../utils/portManager';
import { getSystemNetworkInfo, fetchPublicIp } from '../utils/networkInfo';
import { getDockerContainers, dockerContainerAction, getDockerLogs } from '../utils/dockerManager';
import { executeApiRequest } from '../utils/apiTester';

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'devshelf.sidebarView';
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
            vscode.window.showInformationMessage('DevShelf: No active text editor found to insert text.');
          }
          break;
        }

        case 'scanPorts': {
          try {
            const ports = await scanListeningPorts();
            this.postMessage({ type: 'portsList', ports });
          } catch (err: any) {
            this.postMessage({ type: 'portsList', ports: [] });
            vscode.window.showErrorMessage(`DevShelf Port Scan Error: ${err.message}`);
          }
          break;
        }

        case 'getNetworkInfo': {
          try {
            const netInfo = getSystemNetworkInfo();
            this.postMessage({ type: 'networkInfo', data: netInfo });
          } catch (err: any) {
            vscode.window.showErrorMessage(`DevShelf Network Info Error: ${err.message}`);
          }
          break;
        }

        case 'getPublicIp': {
          try {
            const ip = await fetchPublicIp();
            this.postMessage({ type: 'publicIp', ip });
          } catch (err: any) {
            this.postMessage({ type: 'publicIp', ip: null });
          }
          break;
        }

        case 'killPort': {
          try {
            const { pid, port, name } = data;
            const result = await killProcessByPid(pid, port);
            this.postMessage({
              type: 'portKilled',
              success: result.success,
              message: result.message,
              port,
              pid
            });

            if (result.success) {
              const info = name ? ` (${name})` : '';
              vscode.window.showInformationMessage(`DevShelf: Terminated port :${port}${info} (PID: ${pid})`);
            } else {
              vscode.window.showErrorMessage(`DevShelf: Failed to kill process: ${result.message}`);
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`DevShelf: Error killing process: ${err.message}`);
          }
          break;
        }

        case 'runTerminalCommand': {
          try {
            const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            let terminal = vscode.window.terminals.find((t) => t.name === 'DevShelf Terminal') || vscode.window.activeTerminal;
            if (!terminal) {
              terminal = vscode.window.createTerminal({
                name: 'DevShelf Terminal',
                cwd
              });
            }
            terminal.show(true);
            terminal.sendText(data.command);
            vscode.window.showInformationMessage(`DevShelf: Executing in terminal: ${data.command}`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`DevShelf Terminal Error: ${err.message}`);
          }
          break;
        }

        case 'dockerGetContainers': {
          try {
            const status = await getDockerContainers();
            this.postMessage({ type: 'dockerContainersList', status });
          } catch (err: any) {
            this.postMessage({
              type: 'dockerContainersList',
              status: {
                isInstalled: true,
                isRunning: false,
                errorMessage: err.message,
                containers: []
              }
            });
          }
          break;
        }

        case 'dockerAction': {
          try {
            const { action, containerId } = data;
            const res = await dockerContainerAction(action, containerId);
            this.postMessage({ type: 'dockerActionResult', ...res, containerId, action });
            if (res.success) {
              vscode.window.showInformationMessage(`DevShelf Docker: ${res.message}`);
            } else {
              vscode.window.showErrorMessage(`DevShelf Docker: ${res.message}`);
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`DevShelf Docker Action Error: ${err.message}`);
          }
          break;
        }

        case 'dockerGetLogs': {
          try {
            const { containerId, name } = data;
            const res = await getDockerLogs(containerId, 50);
            this.postMessage({
              type: 'dockerLogsResult',
              containerId,
              name,
              logs: res.logs,
              error: res.error,
              success: res.success
            });
          } catch (err: any) {
            this.postMessage({
              type: 'dockerLogsResult',
              containerId: data.containerId,
              name: data.name,
              logs: '',
              error: err.message,
              success: false
            });
          }
          break;
        }

        case 'apiSendRequest': {
          try {
            const response = await executeApiRequest(data.request);
            this.postMessage({ type: 'apiResponseResult', response });
          } catch (err: any) {
            this.postMessage({
              type: 'apiResponseResult',
              response: {
                status: 0,
                statusText: 'Error',
                timeMs: 0,
                sizeBytes: 0,
                headers: {},
                body: '',
                isJson: false,
                error: err.message
              }
            });
          }
          break;
        }

        case 'languageChanged': {
          await this._context.globalState.update('devshelf.language', data.lang);
          break;
        }
      }
    });

    // Send initial saved language if exists
    const savedLang = this._context.globalState.get<string>('devshelf.language');
    if (savedLang) {
      this.postMessage({ type: 'setLanguage', lang: savedLang });
    }

    // Send initial network info
    try {
      const netInfo = getSystemNetworkInfo();
      this.postMessage({ type: 'networkInfo', data: netInfo });
    } catch {}
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
    const savedLang = this._context.globalState.get<string>('devshelf.language', 'en');
    const isFa = savedLang === 'fa';

    return `<!DOCTYPE html>
<html lang="${savedLang}" dir="${isFa ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https: data:;" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" type="text/css" href="${styleUri}" />
  <title>DevShelf</title>
</head>
<body>
  <div id="app-root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
