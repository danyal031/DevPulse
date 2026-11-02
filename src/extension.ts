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
import { scanListeningPorts, killProcessByPid } from './utils/portManager';

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
    vscode.commands.registerCommand('kaarbox.openSidebar', () => {
      vscode.commands.executeCommand('kaarbox.sidebarView.focus');
    })
  );

  // Command 2: Normalize Persian Selection
  context.subscriptions.push(
    vscode.commands.registerCommand('kaarbox.normalizePersianSelection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('Kaarbox: No active editor found.');
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection.isEmpty ? undefined : selection);

      if (!text) {
        vscode.window.showInformationMessage('Kaarbox: Please select Persian text to normalize.');
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

      vscode.window.showInformationMessage('Kaarbox: Normalized Persian text and digits successfully.');
    })
  );

  // Command 3: Convert Date/Timestamp to Jalali
  context.subscriptions.push(
    vscode.commands.registerCommand('kaarbox.convertToJalali', async () => {
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

      // Check if input is a numeric timestamp
      if (/^\d+$/.test(input)) {
        const num = parseInt(input, 10);
        const ms = input.length <= 10 ? num * 1000 : num;
        const date = new Date(ms);
        if (!isNaN(date.getTime())) {
          const details = getJalaliDetailsFromGregorian(date);
          result = `${details.formatted} (${details.weekdayFa}، ${details.dayStr} ${details.monthNameFa} ${details.yearStr})`;
        }
      } else {
        // Assume Gregorian date
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
        vscode.window.showErrorMessage('Kaarbox: Could not parse input as a valid date or timestamp.');
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
    vscode.commands.registerCommand('kaarbox.generateUuid', async () => {
      const uuid = generateUuidV4();
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await editor.edit((editBuilder) => {
          editBuilder.replace(editor.selection, uuid);
        });
      } else {
        await vscode.env.clipboard.writeText(uuid);
        vscode.window.showInformationMessage(`Kaarbox: Copied UUID to clipboard: ${uuid}`);
      }
    })
  );

  // Command 5: Generate 64-byte Secret
  context.subscriptions.push(
    vscode.commands.registerCommand('kaarbox.generateSecret', async () => {
      const secret = generateSecret(64, 'hex');
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await editor.edit((editBuilder) => {
          editBuilder.replace(editor.selection, secret);
        });
      } else {
        await vscode.env.clipboard.writeText(secret);
        vscode.window.showInformationMessage('Kaarbox: Copied 64-byte secret to clipboard.');
      }
    })
  );

  // Command 6: Convert Selected JSON to TypeScript & Zod
  context.subscriptions.push(
    vscode.commands.registerCommand('kaarbox.jsonToTypescript', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('Kaarbox: No active editor found.');
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection).trim();

      if (!text) {
        vscode.window.showInformationMessage('Kaarbox: Please select valid JSON text in the editor.');
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
        vscode.window.showErrorMessage(`Kaarbox JSON Parser Error: ${err.message}`);
      }
    })
  );

  // Command 7: Quick Kill Process on Port
  context.subscriptions.push(
    vscode.commands.registerCommand('kaarbox.killPort', async () => {
      const ports = await scanListeningPorts();

      if (ports.length === 0) {
        vscode.window.showInformationMessage('Kaarbox: No listening TCP ports detected.');
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
          const result = await killProcessByPid(selected.pid);
          if (result.success) {
            vscode.window.showInformationMessage(`Kaarbox: Successfully killed :${selected.port} (${selected.name})`);
          } else {
            vscode.window.showErrorMessage(`Kaarbox: Failed to kill process: ${result.message}`);
          }
        }
      }
    })
  );
}

export function deactivate() {}
