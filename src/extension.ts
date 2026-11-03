import * as vscode from 'vscode';
import { SidebarProvider } from './providers/SidebarProvider';
import { normalizePersianText } from './utils/persianSanitizer';
import {
  gregorianToJalali,
  getJalaliDetailsFromGregorian,
  parseJalaliString,
  jalaliToGregorian
} from './utils/jalali';
import { generateUuidV4, generateSecret } from './utils/cryptoMock';
import { generateTsAndZod } from './utils/jsonToTsZod';
import { formatJson } from './utils/jsonFormatter';
import { scanListeningPorts, killProcessByPid } from './utils/portManager';
import { getSystemNetworkInfo } from './utils/networkInfo';
import { getGitChanges, getGitDiff, generateConventionalCommit } from './utils/gitCommit';
import { GIT_CHEAT_SHEET } from './utils/gitScenarios';
import { translations } from './webview/i18n';

export function activate(context: vscode.ExtensionContext) {
  const sidebarProvider = new SidebarProvider(context.extensionUri, context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarProvider.viewType,
      sidebarProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );

  // Command 1: Open Sidebar
  context.subscriptions.push(
    vscode.commands.registerCommand('devshelf.openSidebar', () => {
      vscode.commands.executeCommand('devshelf.sidebarView.focus');
    })
  );

  // Command 2: Normalize Persian Selection
  context.subscriptions.push(
    vscode.commands.registerCommand('devshelf.normalizePersianSelection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('DevShelf: No active editor found.');
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection.isEmpty ? undefined : selection);

      if (!text) {
        vscode.window.showInformationMessage('DevShelf: Please select Persian text to normalize.');
        return;
      }

      const normalized = normalizePersianText(text, {
        convertDigitsToEnglish: true,
        normalizeArabicChars: true,
        normalizeZwnj: true,
        normalizePunctuation: true
      });

      await editor.edit((editBuilder) => {
        if (selection.isEmpty) {
          const fullRange = new vscode.Range(
            editor.document.positionAt(0),
            editor.document.positionAt(text.length)
          );
          editBuilder.replace(fullRange, normalized);
        } else {
          editBuilder.replace(selection, normalized);
        }
      });

      vscode.window.showInformationMessage('DevShelf: Normalized Persian text and digits successfully.');
    })
  );

  // Command 3: Convert Date/Timestamp to Jalali
  context.subscriptions.push(
    vscode.commands.registerCommand('devshelf.convertToJalali', async () => {
      const editor = vscode.window.activeTextEditor;
      let input = '';

      if (editor && !editor.selection.isEmpty) {
        input = editor.document.getText(editor.selection).trim();
      }

      if (!input) {
        const prompted = await vscode.window.showInputBox({
          prompt: 'Enter Gregorian Date (YYYY-MM-DD) or Unix Timestamp (sec/ms):',
          placeHolder: 'e.g. 2026-11-02 or 1772439333'
        });
        if (!prompted) return;
        input = prompted.trim();
      }

      let result = '';

      if (/^\d+$/.test(input)) {
        const num = parseInt(input, 10);
        const ms = input.length <= 10 ? num * 1000 : num;
        const date = new Date(ms);
        if (!isNaN(date.getTime())) {
          const details = getJalaliDetailsFromGregorian(date);
          result = `${details.formatted} (${details.weekdayFa}، ${details.dayStr} ${details.monthNameFa} ${details.yearStr})`;
        }
      } else {
        const parts = input.split(/[\-\/\.]/);
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const d = parseInt(parts[2], 10);
          const date = new Date(y, m - 1, d);
          if (!isNaN(date.getTime())) {
            const details = getJalaliDetailsFromGregorian(date);
            result = details.formatted;
          }
        }
      }

      if (!result) {
        vscode.window.showErrorMessage('DevShelf: Could not parse input as a valid date or timestamp.');
        return;
      }

      if (editor && !editor.selection.isEmpty) {
        await editor.edit((editBuilder) => {
          editBuilder.replace(editor.selection, result);
        });
      } else {
        const action = await vscode.window.showInformationMessage(
          `Jalali Date: ${result}`,
          'Copy',
          'Insert at Cursor'
        );
        if (action === 'Copy') {
          await vscode.env.clipboard.writeText(result);
        } else if (action === 'Insert at Cursor' && editor) {
          await editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, result);
          });
        }
      }
    })
  );

  // Command 4: Generate UUID v4
  context.subscriptions.push(
    vscode.commands.registerCommand('devshelf.generateUuid', async () => {
      const uuid = generateUuidV4();
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await editor.edit((editBuilder) => {
          editBuilder.replace(editor.selection, uuid);
        });
      } else {
        await vscode.env.clipboard.writeText(uuid);
        vscode.window.showInformationMessage(`DevShelf: Copied UUID to clipboard: ${uuid}`);
      }
    })
  );

  // Command 5: Generate 64-byte Secret
  context.subscriptions.push(
    vscode.commands.registerCommand('devshelf.generateSecret', async () => {
      const secret = generateSecret(64, 'hex');
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await editor.edit((editBuilder) => {
          editBuilder.replace(editor.selection, secret);
        });
      } else {
        await vscode.env.clipboard.writeText(secret);
        vscode.window.showInformationMessage('DevShelf: Copied 64-byte secret to clipboard.');
      }
    })
  );

  // Command 6: Convert Selected JSON to TypeScript & Zod
  context.subscriptions.push(
    vscode.commands.registerCommand('devshelf.jsonToTypescript', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('DevShelf: No active editor found.');
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection).trim();

      if (!text) {
        vscode.window.showInformationMessage('DevShelf: Please select valid JSON text in the editor.');
        return;
      }

      try {
        const result = generateTsAndZod(text, { rootName: 'GeneratedType' });
        const choice = await vscode.window.showQuickPick(
          [
            { label: 'Insert TypeScript Interfaces', detail: 'Inserts generated interface definitions' },
            { label: 'Insert Zod Schemas', detail: 'Inserts generated Zod schema validation code' },
            { label: 'Insert Both (TS + Zod)', detail: 'Inserts both TypeScript and Zod definitions' }
          ],
          { placeHolder: 'Choose format to insert:' }
        );

        if (!choice) return;

        let toInsert = '';
        if (choice.label.startsWith('Insert TypeScript')) toInsert = result.typescript;
        else if (choice.label.startsWith('Insert Zod')) toInsert = result.zod;
        else toInsert = result.combined;

        await editor.edit((editBuilder) => {
          editBuilder.replace(selection, toInsert);
        });
      } catch (err: any) {
        vscode.window.showErrorMessage(`DevShelf JSON Parser Error: ${err.message}`);
      }
    })
  );

  // Command 7: Quick Kill Process on Port
  context.subscriptions.push(
    vscode.commands.registerCommand('devshelf.killPort', async () => {
      const ports = await scanListeningPorts();

      if (ports.length === 0) {
        vscode.window.showInformationMessage('DevShelf: No listening TCP ports detected.');
        return;
      }

      const items = ports.map((p) => ({
        label: `:${p.port} — ${p.processName}`,
        description: `PID: ${p.pid}`,
        port: p.port,
        pid: p.pid,
        name: p.processName
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a listening port to terminate process:'
      });

      if (selected) {
        const confirm = await vscode.window.showWarningMessage(
          `Are you sure you want to terminate port :${selected.port} (${selected.name}, PID ${selected.pid})?`,
          { modal: true },
          'Kill Process'
        );

        if (confirm === 'Kill Process') {
          const result = await killProcessByPid(selected.pid, selected.port);
          if (result.success) {
            vscode.window.showInformationMessage(`DevShelf: Successfully killed :${selected.port} (${selected.name})`);
          } else {
            vscode.window.showErrorMessage(`DevShelf: Failed to kill process: ${result.message}`);
          }
        }
      }
    })
  );

  // Command 8: Format JSON in Selection or Document
  context.subscriptions.push(
    vscode.commands.registerCommand('devshelf.formatJson', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('DevShelf: No active editor found.');
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection.isEmpty ? undefined : selection).trim();

      if (!text) {
        vscode.window.showInformationMessage('DevShelf: Please open or select JSON text to format.');
        return;
      }

      const res = formatJson(text, 2);
      if (res.isValid) {
        await editor.edit((editBuilder) => {
          if (selection.isEmpty) {
            const fullRange = new vscode.Range(
              editor.document.positionAt(0),
              editor.document.positionAt(editor.document.getText().length)
            );
            editBuilder.replace(fullRange, res.output);
          } else {
            editBuilder.replace(selection, res.output);
          }
        });
        vscode.window.showInformationMessage('DevShelf: JSON formatted successfully.');
      } else {
        vscode.window.showErrorMessage(`DevShelf: Invalid JSON format: ${res.error}`);
      }
    })
  );

  // Command 9: Copy System Local IP
  context.subscriptions.push(
    vscode.commands.registerCommand('devshelf.copySystemIp', async () => {
      const netInfo = getSystemNetworkInfo();
      await vscode.env.clipboard.writeText(netInfo.primaryIpv4);
      vscode.window.showInformationMessage(`DevShelf: Copied Local IP to clipboard: ${netInfo.primaryIpv4} (${netInfo.hostname})`);
    })
  );

  // Command 10: Generate Conventional Commit Message (SCM Integration)
  context.subscriptions.push(
    vscode.commands.registerCommand('devshelf.generateCommitMessage', async (uri?: vscode.SourceControl | vscode.SourceControlResourceGroup) => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showInformationMessage('DevShelf: No open workspace folder detected for git.');
        return;
      }

      const rootPath = workspaceFolders[0].uri.fsPath;
      const changes = await getGitChanges(rootPath);

      if (changes.length === 0) {
        vscode.window.showInformationMessage('DevShelf: No git changes detected in this repository.');
        return;
      }

      const diffText = await getGitDiff(rootPath);
      const commit = generateConventionalCommit(changes, diffText);

      // 1. Try to set commit message in VS Code Git Source Control input box directly
      let insertedIntoScm = false;
      try {
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (gitExtension) {
          const gitApi = gitExtension.isActive ? gitExtension.exports.getAPI(1) : (await gitExtension.activate())?.getAPI(1);
          if (gitApi && gitApi.repositories && gitApi.repositories.length > 0) {
            const repo = gitApi.repositories[0];
            repo.inputBox.value = commit.fullMessage;
            insertedIntoScm = true;
          }
        }
      } catch {}

      // 2. Also copy to clipboard for convenience
      await vscode.env.clipboard.writeText(commit.fullMessage);

      if (insertedIntoScm) {
        vscode.window.showInformationMessage(
          `DevShelf: Commit message inserted: "${commit.type}(${commit.scope}): ${commit.subject}"`,
          'View SCM'
        ).then((action) => {
          if (action === 'View SCM') {
            vscode.commands.executeCommand('workbench.view.scm');
          }
        });
      } else {
        const action = await vscode.window.showInformationMessage(
          `Generated Commit: "${commit.type}(${commit.scope}): ${commit.subject}" (Copied to clipboard)`,
          'Paste in Editor',
          'Open SCM'
        );
        if (action === 'Open SCM') {
          vscode.commands.executeCommand('workbench.view.scm');
        } else if (action === 'Paste in Editor') {
          const editor = vscode.window.activeTextEditor;
          if (editor) {
            editor.edit((eb) => eb.insert(editor.selection.active, commit.fullMessage));
          }
        }
      }
    })
  );

  // Command 11: Open Git Command Wizard
  context.subscriptions.push(
    vscode.commands.registerCommand('devshelf.openGitWizard', () => {
      vscode.commands.executeCommand('devshelf.sidebarView.focus');
      sidebarProvider.switchTab('git');
    })
  );

  // Command 12: Git Rescue Cheat Sheet QuickPick
  context.subscriptions.push(
    vscode.commands.registerCommand('devshelf.gitCheatSheet', async () => {
      const savedLang = context.globalState.get<string>('devshelf.language', 'en');
      const isFa = savedLang === 'fa';
      const dict = isFa ? translations.fa : translations.en;

      const items = GIT_CHEAT_SHEET.map((item) => {
        const title = (dict as any)[item.titleKey] || item.id;
        const desc = (dict as any)[item.descKey] || '';
        return {
          label: item.command,
          description: title,
          detail: desc,
          command: item.command
        };
      });

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: isFa ? 'جستجو و انتخاب دستور گیت:' : 'Search and select a Git rescue command:',
        matchOnDescription: true,
        matchOnDetail: true
      });

      if (selected) {
        const action = await vscode.window.showInformationMessage(
          `DevShelf Git: ${selected.command}`,
          'Run in Terminal',
          'Copy Command',
          'Insert in Editor'
        );

        if (action === 'Run in Terminal') {
          const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
          let terminal = vscode.window.terminals.find((t) => t.name === 'DevShelf Terminal') || vscode.window.activeTerminal;
          if (!terminal) {
            terminal = vscode.window.createTerminal({ name: 'DevShelf Terminal', cwd });
          }
          terminal.show(true);
          terminal.sendText(selected.command);
        } else if (action === 'Copy Command') {
          await vscode.env.clipboard.writeText(selected.command);
          vscode.window.showInformationMessage(`DevShelf: Copied "${selected.command}" to clipboard.`);
        } else if (action === 'Insert in Editor') {
          const editor = vscode.window.activeTextEditor;
          if (editor) {
            editor.edit((eb) => eb.insert(editor.selection.active, selected.command));
          }
        }
      }
    })
  );

  // Command 13: Open Docker Quick Deck
  context.subscriptions.push(
    vscode.commands.registerCommand('devshelf.openDockerDeck', () => {
      vscode.commands.executeCommand('devshelf.sidebarView.focus');
      sidebarProvider.switchTab('docker');
    })
  );

  // Command 14: Open Mini API Tester
  context.subscriptions.push(
    vscode.commands.registerCommand('devshelf.openApiTester', () => {
      vscode.commands.executeCommand('devshelf.sidebarView.focus');
      sidebarProvider.switchTab('api');
    })
  );
}

export function deactivate() {}
