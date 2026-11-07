import * as vscode from 'vscode';
import { BundleRadarService } from './bundleRadarService';

const NODE_BUILTINS = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain',
  'events', 'fs', 'fs/promises', 'http', 'http2', 'https', 'inspector',
  'module', 'net', 'os', 'path', 'perf_hooks', 'process', 'punycode',
  'querystring', 'readline', 'repl', 'stream', 'stream/promises',
  'string_decoder', 'timers', 'timers/promises', 'tls', 'trace_events',
  'tty', 'url', 'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib'
]);

export class ImportCostService {
  private static instance: ImportCostService;
  private lightDecorationType: vscode.TextEditorDecorationType;
  private moderateDecorationType: vscode.TextEditorDecorationType;
  private heavyDecorationType: vscode.TextEditorDecorationType;
  private updateTimeout: NodeJS.Timeout | null = null;
  private disposables: vscode.Disposable[] = [];
  private enabled: boolean = true;

  private constructor() {
    this.lightDecorationType = vscode.window.createTextEditorDecorationType({
      after: {
        margin: '0 0 0 1.5rem',
        color: 'var(--vscode-charts-green, #4ec9b0)',
        fontStyle: 'normal',
        fontWeight: 'normal'
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen
    });

    this.moderateDecorationType = vscode.window.createTextEditorDecorationType({
      after: {
        margin: '0 0 0 1.5rem',
        color: 'var(--vscode-charts-yellow, #cca700)',
        fontStyle: 'normal',
        fontWeight: 'normal'
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen
    });

    this.heavyDecorationType = vscode.window.createTextEditorDecorationType({
      after: {
        margin: '0 0 0 1.5rem',
        color: 'var(--vscode-charts-red, #f14c4c)',
        fontStyle: 'normal',
        fontWeight: 'bold'
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen
    });
  }

  public static getInstance(): ImportCostService {
    if (!ImportCostService.instance) {
      ImportCostService.instance = new ImportCostService();
    }
    return ImportCostService.instance;
  }

  public init(context: vscode.ExtensionContext) {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.triggerUpdate(editor);
        }
      })
    );

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && event.document === activeEditor.document) {
          this.triggerUpdate(activeEditor);
        }
      })
    );

    // Initial run on active editor
    if (vscode.window.activeTextEditor) {
      this.triggerUpdate(vscode.window.activeTextEditor);
    }

    context.subscriptions.push(this);
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      if (enabled) {
        this.triggerUpdate(activeEditor);
      } else {
        this.clearDecorations(activeEditor);
      }
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private triggerUpdate(editor: vscode.TextEditor) {
    if (!this.enabled) return;
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.updateTimeout = setTimeout(() => {
      this.updateDecorations(editor);
    }, 400);
  }

  private isSupportedLanguage(langId: string): boolean {
    return (
      langId === 'javascript' ||
      langId === 'typescript' ||
      langId === 'javascriptreact' ||
      langId === 'typescriptreact' ||
      langId === 'vue' ||
      langId === 'svelte'
    );
  }

  private async updateDecorations(editor: vscode.TextEditor) {
    if (!editor || !editor.document || !this.isSupportedLanguage(editor.document.languageId)) {
      if (editor) this.clearDecorations(editor);
      return;
    }

    const doc = editor.document;
    const text = doc.getText();
    const lines = text.split(/\r?\n/);

    const lightDecorations: vscode.DecorationOptions[] = [];
    const moderateDecorations: vscode.DecorationOptions[] = [];
    const heavyDecorations: vscode.DecorationOptions[] = [];

    // Regex for ES6 import: import ... from 'package' or import 'package'
    const esImportRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([^'".]+)['"]/g;
    // Regex for CommonJS require: require('package')
    const cjsRequireRegex = /require\s*\(\s*['"]([^'".]+)['"]\s*\)/g;

    const bundleService = BundleRadarService.getInstance();

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const lineText = lines[lineIndex];
      // Skip commented lines
      const trimmed = lineText.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        continue;
      }

      // Find all package imports in this line
      const matchedPackages = new Set<string>();

      let match: RegExpExecArray | null;
      while ((match = esImportRegex.exec(lineText)) !== null) {
        const pkg = this.extractPackageName(match[1]);
        if (pkg) matchedPackages.add(pkg);
      }

      while ((match = cjsRequireRegex.exec(lineText)) !== null) {
        const pkg = this.extractPackageName(match[1]);
        if (pkg) matchedPackages.add(pkg);
      }

      for (const pkgName of matchedPackages) {
        const sizeRes = await bundleService.resolvePackageSize(pkgName, 'latest');
        const gzipKb = sizeRes.gzipBytes / 1024;
        const formattedSize = bundleService.formatBytes(sizeRes.gzipBytes);

        const lineEndPos = new vscode.Position(lineIndex, lineText.length);
        const range = new vscode.Range(lineEndPos, lineEndPos);

        if (gzipKb < 20) {
          lightDecorations.push({
            range,
            renderOptions: {
              after: {
                contentText: ` ⚡ ${formattedSize} (gzip)`
              }
            }
          });
        } else if (gzipKb <= 70) {
          moderateDecorations.push({
            range,
            renderOptions: {
              after: {
                contentText: ` ⚡ ${formattedSize} (gzip)`
              }
            }
          });
        } else {
          heavyDecorations.push({
            range,
            renderOptions: {
              after: {
                contentText: ` ⚠ ${formattedSize} (gzip - bloated)`
              }
            }
          });
        }
      }
    }

    // Apply decorations
    editor.setDecorations(this.lightDecorationType, lightDecorations);
    editor.setDecorations(this.moderateDecorationType, moderateDecorations);
    editor.setDecorations(this.heavyDecorationType, heavyDecorations);
  }

  private clearDecorations(editor: vscode.TextEditor) {
    editor.setDecorations(this.lightDecorationType, []);
    editor.setDecorations(this.moderateDecorationType, []);
    editor.setDecorations(this.heavyDecorationType, []);
  }

  public extractPackageName(specifier: string): string | null {
    const clean = specifier.trim();
    // Exclude relative, absolute, and alias imports
    if (
      clean.startsWith('.') ||
      clean.startsWith('/') ||
      clean.startsWith('~') ||
      clean.startsWith('@/')
    ) {
      return null;
    }

    // Exclude Node.js built-ins
    const prefixFree = clean.startsWith('node:') ? clean.slice(5) : clean;
    if (NODE_BUILTINS.has(prefixFree)) {
      return null;
    }

    // Scoped package e.g. @angular/core/something -> @angular/core
    if (clean.startsWith('@')) {
      const parts = clean.split('/');
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
      return clean;
    }

    // Normal package e.g. lodash/debounce -> lodash
    const parts = clean.split('/');
    return parts[0] || null;
  }

  public dispose() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.lightDecorationType.dispose();
    this.moderateDecorationType.dispose();
    this.heavyDecorationType.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}
