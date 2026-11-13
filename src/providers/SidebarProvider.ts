import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { scanListeningPorts, killProcessByPid } from '../utils/portManager';
import { getSystemNetworkInfo, fetchPublicIp } from '../utils/networkInfo';
import {
  getDockerContainers,
  dockerContainerAction,
  getDockerLogs,
  inspectDockerObject,
  getDockerImages,
  pullDockerImage,
  removeDockerImage,
  pruneDockerImages,
  runDockerContainer,
  getDockerVolumes,
  removeDockerVolume,
  pruneDockerVolumes,
  getDockerNetworks,
  removeDockerNetwork,
  getDockerStats,
  dockerSystemPrune
} from '../utils/dockerManager';
import { executeApiRequest } from '../utils/apiTester';
import { MockServerService } from '../utils/mockServerService';
import { TunnelService } from '../utils/tunnelService';
import { SystemMonitorService } from '../utils/systemMonitorService';
import { LoadTesterService } from '../utils/loadTesterService';
import { getSelectedCodeSnippet, saveSnapshotImage } from '../services/codeSnapshotService';
import { CommandCenterService } from '../services/commandCenterService';
import { CacheCleanerService } from '../services/cacheCleanerService';
import { MobilePreviewPanel } from '../services/mobilePreviewPanel';
import { BundleRadarService } from '../services/bundleRadarService';
import { ImportCostService } from '../services/importCostService';

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

    BundleRadarService.getInstance().setPersistentState(this._context.globalState);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      const actionType = data.type || data.command;
      switch (actionType) {
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

        case 'getActiveEditorText': {
          const editor = vscode.window.activeTextEditor;
          if (editor) {
            const text = editor.document.getText();
            this.postMessage({ type: 'activeEditorText', text });
          } else {
            vscode.window.showInformationMessage('DevShelf: No active editor file found to analyze.');
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
            const { containerId, name, tail } = data;
            const res = await getDockerLogs(containerId, tail || 100);
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

        case 'dockerInspect': {
          try {
            const { target, targetType } = data;
            const res = await inspectDockerObject(target);
            this.postMessage({
              type: 'dockerInspectResult',
              target,
              targetType,
              ...res
            });
          } catch (err: any) {
            this.postMessage({
              type: 'dockerInspectResult',
              target: data.target,
              targetType: data.targetType,
              success: false,
              error: err.message
            });
          }
          break;
        }

        case 'dockerExecTerminal': {
          try {
            const { containerId, name, shell } = data;
            const targetShell = shell || 'sh';
            const termName = `Docker: ${name || containerId}`;
            let terminal = vscode.window.terminals.find((t) => t.name === termName);
            if (!terminal) {
              terminal = vscode.window.createTerminal({
                name: termName
              });
            }
            terminal.show(true);
            terminal.sendText(`docker exec -it ${containerId} ${targetShell}`);
            vscode.window.showInformationMessage(`DevShelf: Opened terminal session in container ${name || containerId}`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`DevShelf: Failed to open container terminal: ${err.message}`);
          }
          break;
        }

        case 'dockerGetImages': {
          try {
            const res = await getDockerImages();
            this.postMessage({ type: 'dockerImagesList', ...res });
          } catch (err: any) {
            this.postMessage({ type: 'dockerImagesList', success: false, images: [], error: err.message });
          }
          break;
        }

        case 'dockerPullImage': {
          try {
            const { imageName } = data;
            vscode.window.showInformationMessage(`DevShelf: Pulling Docker image "${imageName}"...`);
            const res = await pullDockerImage(imageName);
            this.postMessage({ type: 'dockerPullResult', ...res, imageName });
            if (res.success) {
              vscode.window.showInformationMessage(`DevShelf Docker: Pulled "${imageName}" successfully.`);
            } else {
              vscode.window.showErrorMessage(`DevShelf Docker: ${res.message}`);
            }
          } catch (err: any) {
            this.postMessage({ type: 'dockerPullResult', success: false, message: err.message, imageName: data.imageName });
            vscode.window.showErrorMessage(`DevShelf Docker Pull Error: ${err.message}`);
          }
          break;
        }

        case 'dockerRemoveImage': {
          try {
            const { imageId, force } = data;
            const res = await removeDockerImage(imageId, force);
            this.postMessage({ type: 'dockerRemoveImageResult', ...res, imageId });
            if (res.success) {
              vscode.window.showInformationMessage(`DevShelf Docker: ${res.message}`);
            } else {
              vscode.window.showErrorMessage(`DevShelf Docker: ${res.message}`);
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`DevShelf Docker Image Error: ${err.message}`);
          }
          break;
        }

        case 'dockerPruneImages': {
          try {
            const res = await pruneDockerImages(data.all ?? true);
            this.postMessage({ type: 'dockerPruneImagesResult', ...res });
            if (res.success) {
              vscode.window.showInformationMessage(`DevShelf Docker: ${res.message}`);
            } else {
              vscode.window.showErrorMessage(`DevShelf Docker: ${res.message}`);
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`DevShelf Docker Prune Error: ${err.message}`);
          }
          break;
        }

        case 'dockerRunContainer': {
          try {
            const res = await runDockerContainer(data.config);
            this.postMessage({ type: 'dockerRunContainerResult', ...res });
            if (res.success) {
              vscode.window.showInformationMessage(`DevShelf Docker: ${res.message}`);
            } else {
              vscode.window.showErrorMessage(`DevShelf Docker: ${res.message}`);
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`DevShelf Docker Run Error: ${err.message}`);
          }
          break;
        }

        case 'dockerGetVolumes': {
          try {
            const res = await getDockerVolumes();
            this.postMessage({ type: 'dockerVolumesList', ...res });
          } catch (err: any) {
            this.postMessage({ type: 'dockerVolumesList', success: false, volumes: [], error: err.message });
          }
          break;
        }

        case 'dockerRemoveVolume': {
          try {
            const { name } = data;
            const res = await removeDockerVolume(name);
            this.postMessage({ type: 'dockerRemoveVolumeResult', ...res, name });
            if (res.success) {
              vscode.window.showInformationMessage(`DevShelf Docker: ${res.message}`);
            } else {
              vscode.window.showErrorMessage(`DevShelf Docker: ${res.message}`);
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`DevShelf Docker Volume Error: ${err.message}`);
          }
          break;
        }

        case 'dockerPruneVolumes': {
          try {
            const res = await pruneDockerVolumes();
            this.postMessage({ type: 'dockerPruneVolumesResult', ...res });
            if (res.success) {
              vscode.window.showInformationMessage(`DevShelf Docker: ${res.message}`);
            } else {
              vscode.window.showErrorMessage(`DevShelf Docker: ${res.message}`);
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`DevShelf Docker Prune Error: ${err.message}`);
          }
          break;
        }

        case 'dockerGetNetworks': {
          try {
            const res = await getDockerNetworks();
            this.postMessage({ type: 'dockerNetworksList', ...res });
          } catch (err: any) {
            this.postMessage({ type: 'dockerNetworksList', success: false, networks: [], error: err.message });
          }
          break;
        }

        case 'dockerRemoveNetwork': {
          try {
            const { id } = data;
            const res = await removeDockerNetwork(id);
            this.postMessage({ type: 'dockerRemoveNetworkResult', ...res, id });
            if (res.success) {
              vscode.window.showInformationMessage(`DevShelf Docker: ${res.message}`);
            } else {
              vscode.window.showErrorMessage(`DevShelf Docker: ${res.message}`);
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`DevShelf Docker Network Error: ${err.message}`);
          }
          break;
        }

        case 'dockerGetStats': {
          try {
            const res = await getDockerStats();
            this.postMessage({ type: 'dockerStatsList', ...res });
          } catch (err: any) {
            this.postMessage({ type: 'dockerStatsList', success: false, stats: [], error: err.message });
          }
          break;
        }

        case 'dockerSystemPrune': {
          try {
            const res = await dockerSystemPrune(data.includeVolumes ?? true);
            this.postMessage({ type: 'dockerSystemPruneResult', ...res });
            if (res.success) {
              vscode.window.showInformationMessage(`DevShelf Docker: ${res.message}`);
            } else {
              vscode.window.showErrorMessage(`DevShelf Docker: ${res.message}`);
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`DevShelf Docker Prune Error: ${err.message}`);
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

        // Mock Server Messages
        case 'mockStartServer': {
          const res = await MockServerService.getInstance().startServer(data.port || 4040);
          this.postMessage({ type: 'mockStatus', status: MockServerService.getInstance().getStatus() });
          if (res.success) {
            vscode.window.showInformationMessage(`DevShelf: Mock server listening on http://localhost:${res.port}`);
          } else {
            vscode.window.showErrorMessage(`DevShelf Mock Server: ${res.error}`);
          }
          break;
        }

        case 'mockStopServer': {
          await MockServerService.getInstance().stopServer();
          this.postMessage({ type: 'mockStatus', status: MockServerService.getInstance().getStatus() });
          vscode.window.showInformationMessage('DevShelf: Mock server stopped.');
          break;
        }

        case 'mockGetStatus': {
          this.postMessage({ type: 'mockStatus', status: MockServerService.getInstance().getStatus() });
          break;
        }

        case 'mockGetRoutes': {
          this.postMessage({ type: 'mockRoutes', routes: MockServerService.getInstance().getRoutes() });
          break;
        }

        case 'mockSaveRoute': {
          MockServerService.getInstance().addRoute(data.route);
          this.postMessage({ type: 'mockRoutes', routes: MockServerService.getInstance().getRoutes() });
          break;
        }

        case 'mockUpdateRoute': {
          MockServerService.getInstance().updateRoute(data.route);
          this.postMessage({ type: 'mockRoutes', routes: MockServerService.getInstance().getRoutes() });
          break;
        }

        case 'mockDeleteRoute': {
          MockServerService.getInstance().deleteRoute(data.id);
          this.postMessage({ type: 'mockRoutes', routes: MockServerService.getInstance().getRoutes() });
          break;
        }

        case 'mockGetRequests': {
          this.postMessage({ type: 'mockCapturedList', requests: MockServerService.getInstance().getCapturedRequests() });
          break;
        }

        case 'mockClearRequests': {
          MockServerService.getInstance().clearCapturedRequests();
          this.postMessage({ type: 'mockCapturedList', requests: [] });
          break;
        }

        // Tunnel Messages
        case 'tunnelStart': {
          try {
            const status = await TunnelService.getInstance().startTunnel(data.provider, data.port);
            this.postMessage({ type: 'tunnelStatus', status });
            if (status.publicUrl) {
              vscode.window.showInformationMessage(`DevShelf: Public tunnel active: ${status.publicUrl}`);
            } else if (status.error) {
              vscode.window.showErrorMessage(`DevShelf Tunnel: ${status.error}`);
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`DevShelf Tunnel Error: ${err.message}`);
          }
          break;
        }

        case 'tunnelStop': {
          await TunnelService.getInstance().stopTunnel();
          this.postMessage({ type: 'tunnelStatus', status: TunnelService.getInstance().getStatus() });
          vscode.window.showInformationMessage('DevShelf: Public tunnel disconnected.');
          break;
        }

        case 'tunnelGetStatus': {
          this.postMessage({ type: 'tunnelStatus', status: TunnelService.getInstance().getStatus() });
          break;
        }

        case 'openExternalUrl': {
          if (data.url) {
            vscode.env.openExternal(vscode.Uri.parse(data.url));
          }
          break;
        }

        // System Monitor Messages
        case 'sysmonGetTelemetry': {
          try {
            const telemetry = SystemMonitorService.getInstance().getTelemetry();
            this.postMessage({ type: 'sysmonTelemetry', telemetry });
          } catch {}
          break;
        }

        case 'sysmonGetProcesses': {
          try {
            const processes = await SystemMonitorService.getInstance().getTopProcesses(25);
            this.postMessage({ type: 'sysmonProcesses', processes });
          } catch {}
          break;
        }

        case 'sysmonKillProcess': {
          const res = await SystemMonitorService.getInstance().killProcess(data.pid);
          this.postMessage({
            type: 'sysmonProcessKilled',
            pid: data.pid,
            success: res.success,
            message: res.message
          });
          if (res.success) {
            vscode.window.showInformationMessage(`DevShelf: ${res.message}`);
          } else {
            vscode.window.showErrorMessage(`DevShelf: ${res.message}`);
          }
          break;
        }

        case 'sysmonKillOrphans': {
          const res = await SystemMonitorService.getInstance().killDevOrphans(data.targetType || 'all');
          if (res.success) {
            vscode.window.showInformationMessage(`DevShelf: ${res.message}`);
          } else {
            vscode.window.showErrorMessage(`DevShelf: ${res.message}`);
          }
          const processes = await SystemMonitorService.getInstance().getTopProcesses(25);
          this.postMessage({ type: 'sysmonProcesses', processes });
          break;
        }

        // Load Tester Messages
        case 'loadTesterStart': {
          try {
            await LoadTesterService.getInstance().start(data.config);
          } catch (err: any) {
            vscode.window.showErrorMessage(`DevShelf Load Tester: ${err.message}`);
          }
          break;
        }

        case 'loadTesterAbort': {
          LoadTesterService.getInstance().abort();
          vscode.window.showInformationMessage('DevShelf: Load test aborted.');
          break;
        }

        case 'loadTesterExportReport': {
          try {
            const snapshot = LoadTesterService.getInstance().getSnapshot();
            const config = LoadTesterService.getInstance().getCurrentConfig();
            if (snapshot && config) {
              const markdown = LoadTesterService.getInstance().generateMarkdownReport(snapshot, config);
              await vscode.env.clipboard.writeText(markdown);
              vscode.window.showInformationMessage('DevShelf: Load benchmark report copied to clipboard!');
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`DevShelf: Failed to export report: ${err.message}`);
          }
          break;
        }

        // Snapshot Studio Messages
        case 'getEditorCode': {
          const snippet = getSelectedCodeSnippet();
          this.postMessage({
            type: 'activeCodeUpdate',
            code: snippet.code,
            languageId: snippet.languageId,
            filename: snippet.filename
          });
          break;
        }

        case 'saveSnapshotImage': {
          if (data.dataUrl) {
            await saveSnapshotImage(data.dataUrl, data.filename);
          }
          break;
        }

        case 'copySnapshotDataUrl': {
          if (data.dataUrl) {
            await vscode.env.clipboard.writeText(data.dataUrl);
          }
          break;
        }

        // Command Center Messages
        case 'scanTasks': {
          try {
            const tasks = await CommandCenterService.getInstance().scanTasks();
            this.postMessage({ type: 'tasksList', tasks });
          } catch {}
          break;
        }

        case 'runTask': {
          if (data.taskId) {
            await CommandCenterService.getInstance().runTask(data.taskId);
          }
          break;
        }

        case 'stopTask': {
          if (data.taskId) {
            CommandCenterService.getInstance().stopTask(data.taskId);
          }
          break;
        }

        case 'restartTask': {
          if (data.taskId) {
            await CommandCenterService.getInstance().restartTask(data.taskId);
          }
          break;
        }

        case 'openTaskTerminal': {
          if (data.taskId) {
            CommandCenterService.getInstance().openTerminal(data.taskId);
          }
          break;
        }

        // CSS Designer & Mobile Viewport Messages
        case 'openMobilePreview': {
          MobilePreviewPanel.createOrShow(this._extensionUri);
          break;
        }

        case 'copyToClipboard': {
          if (data.text) {
            await vscode.env.clipboard.writeText(data.text);
          }
          break;
        }

        // Dev Junk & Cache Cleaner Messages
        case 'scanJunk': {
          try {
            const items = await CacheCleanerService.getInstance().scanJunk();
            this.postMessage({ type: 'junkItemsList', items });
          } catch {}
          break;
        }

        case 'purgeJunkItems': {
          try {
            const freedBytes = await CacheCleanerService.getInstance().purgeItems(data.itemIds || []);
            this.postMessage({ type: 'junkPurgeResult', freedBytes });
            const formatted = CacheCleanerService.getInstance().formatBytes(freedBytes);
            vscode.window.showInformationMessage(`DevShelf: Reclaimed ${formatted} of disk space!`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`DevShelf: Failed to purge items: ${err.message}`);
          }
          break;
        }

        // --- Bundle Size Radar & Package Diet ---
        case 'scanDependencies': {
          try {
            const includeDev = !!data.includeDev;
            const { items, packageManager } = await BundleRadarService.getInstance().scanWorkspaceDependencies(undefined, includeDev);

            // Send initial summary calculated from local disk or fast heuristic
            const initialSummary = BundleRadarService.getInstance().computeSummary(items, packageManager);
            this.postMessage({ type: 'dependenciesList', items, summary: initialSummary });

            // Stream size resolution for each item
            items.forEach(async (item) => {
              try {
                const sizeRes = await BundleRadarService.getInstance().resolvePackageSize(item.name, item.version, item.localSizeBytes);
                item.minifiedSizeBytes = sizeRes.minBytes;
                item.gzippedSizeBytes = sizeRes.gzipBytes;
                item.status = sizeRes.status;
                item.category = BundleRadarService.getInstance().categorizeWeight(sizeRes.gzipBytes);

                this.postMessage({ type: 'packageSizeResult', item });
              } catch {}
            });

            // Recompute final summary after remote telemetry
            setTimeout(() => {
              const finalSummary = BundleRadarService.getInstance().computeSummary(items, packageManager);
              this.postMessage({ type: 'dependenciesList', items, summary: finalSummary });
            }, 1800);
          } catch (err: any) {
            vscode.window.showErrorMessage(`DevShelf: Failed to scan dependencies: ${err.message}`);
          }
          break;
        }

        case 'toggleInlineDecorator': {
          ImportCostService.getInstance().setEnabled(!!data.enabled);
          break;
        }

        case 'copyMigrationCommand': {
          if (data.commandText) {
            await vscode.env.clipboard.writeText(data.commandText);
            this.postMessage({ type: 'migrationCommandCopied' });
            vscode.window.showInformationMessage('DevShelf: Migration command copied to clipboard!');
          }
          break;
        }

        case 'runMigrationCommand': {
          if (data.commandText) {
            const terminal = vscode.window.createTerminal({ name: 'DevShelf Package Migration' });
            terminal.show(true);
            terminal.sendText(data.commandText);
          }
          break;
        }
      }
    });

    // Wire callbacks for MockServer, Tunnel, LoadTester, and CommandCenter live events
    MockServerService.getInstance().setCallbacks(
      (captured) => this.postMessage({ type: 'mockCapturedRequest', request: captured }),
      (status) => this.postMessage({ type: 'mockStatus', status })
    );

    TunnelService.getInstance().setCallback((status) => {
      this.postMessage({ type: 'tunnelStatus', status });
    });

    LoadTesterService.getInstance().setCallbacks(
      (snapshot) => this.postMessage({ type: 'loadTesterSnapshot', snapshot }),
      (snapshot) => this.postMessage({ type: 'loadTesterSnapshot', snapshot })
    );

    CommandCenterService.getInstance().setTaskStatusCallback((taskId, isRunning, startTime) => {
      this.postMessage({ type: 'taskStatusUpdate', taskId, isRunning, startTime });
    });

    webviewView.onDidDispose(() => {
      LoadTesterService.getInstance().abort();
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src ${webview.cspSource} https://speed.cloudflare.com https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https: data:;" />
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
