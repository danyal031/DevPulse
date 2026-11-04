import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface EditorCodeSelection {
  code: string;
  language: string;
  fileName: string;
  lineCount: number;
}

export class CodeSnapshotService {
  private static instance: CodeSnapshotService;

  private constructor() {}

  public static getInstance(): CodeSnapshotService {
    if (!CodeSnapshotService.instance) {
      CodeSnapshotService.instance = new CodeSnapshotService();
    }
    return CodeSnapshotService.instance;
  }

  public getActiveEditorSelection(): EditorCodeSelection | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }

    const selection = editor.selection;
    let code = editor.document.getText(selection.isEmpty ? undefined : selection);
    
    // If entire file is empty, return null
    if (!code || code.trim().length === 0) {
      return null;
    }

    // Limit selection to reasonable size (max 500 lines) for image rendering
    const lines = code.split('\n');
    if (lines.length > 500) {
      code = lines.slice(0, 500).join('\n');
    }

    const fileName = path.basename(editor.document.fileName) || 'snippet';
    const language = editor.document.languageId || 'typescript';

    return {
      code,
      language,
      fileName,
      lineCount: lines.length
    };
  }

  public async savePngImage(base64DataUrl: string, suggestedName?: string): Promise<string | null> {
    if (!base64DataUrl || !base64DataUrl.includes(',')) {
      throw new Error('Invalid base64 image data');
    }

    const base64Content = base64DataUrl.split(',')[1];
    const imageBuffer = Buffer.from(base64Content, 'base64');

    const defaultFileName = suggestedName
      ? `${suggestedName.replace(/\.[^/.]+$/, '')}-snippet.png`
      : 'code-snippet.png';

    const defaultUri = vscode.workspace.workspaceFolders?.[0]
      ? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, defaultFileName)
      : undefined;

    const targetUri = await vscode.window.showSaveDialog({
      defaultUri,
      saveLabel: 'Save Code Image',
      filters: {
        'PNG Images': ['png']
      }
    });

    if (!targetUri) {
      return null;
    }

    await fs.promises.writeFile(targetUri.fsPath, imageBuffer);
    return targetUri.fsPath;
  }
}

export function getSelectedCodeSnippet(): { code: string; languageId: string; filename: string; lineCount: number } {
  const sel = CodeSnapshotService.getInstance().getActiveEditorSelection();
  if (sel) {
    return {
      code: sel.code,
      languageId: sel.language,
      filename: sel.fileName,
      lineCount: sel.lineCount
    };
  }
  return {
    code: '',
    languageId: 'typescript',
    filename: 'untitled.ts',
    lineCount: 0
  };
}

export async function saveSnapshotImage(base64DataUrl: string, suggestedName?: string): Promise<string | null> {
  return CodeSnapshotService.getInstance().savePngImage(base64DataUrl, suggestedName);
}
