import { exec } from 'child_process';
import * as path from 'path';

export interface FileChange {
  status: 'A' | 'M' | 'D' | 'R' | '?';
  filePath: string;
}

export interface GeneratedCommit {
  type: string;
  scope: string;
  subject: string;
  fullMessage: string;
}

function runGitCommand(cmd: string, cwd: string): Promise<string> {
  return new Promise((resolve) => {
    exec(`git ${cmd}`, { cwd, maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
      if (error) {
        resolve('');
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

export async function getGitChanges(cwd: string): Promise<FileChange[]> {
  // Check staged changes first
  const stagedOutput = await runGitCommand('diff --cached --name-status', cwd);
  const changes: FileChange[] = [];

  if (stagedOutput) {
    const lines = stagedOutput.split(/\r?\n/);
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const status = parts[0].charAt(0).toUpperCase() as 'A' | 'M' | 'D' | 'R';
        const filePath = parts[1];
        changes.push({ status, filePath });
      }
    }
  }

  // If no staged changes, check working directory diff and untracked files
  if (changes.length === 0) {
    const statusOutput = await runGitCommand('status --porcelain', cwd);
    if (statusOutput) {
      const lines = statusOutput.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length >= 3) {
          const rawStatus = trimmed.slice(0, 2).trim();
          const filePath = trimmed.slice(2).trim();
          let status: 'A' | 'M' | 'D' | 'R' | '?' = 'M';
          if (rawStatus.includes('A')) status = 'A';
          else if (rawStatus.includes('D')) status = 'D';
          else if (rawStatus.includes('R')) status = 'R';
          else if (rawStatus.includes('?')) status = '?';

          changes.push({ status, filePath });
        }
      }
    }
  }

  return changes;
}

export function generateConventionalCommit(changes: FileChange[]): GeneratedCommit {
  if (changes.length === 0) {
    return {
      type: 'chore',
      scope: 'repo',
      subject: 'update project files',
      fullMessage: 'chore: update project files'
    };
  }

  // Detect types by inspecting file paths and statuses
  let type = 'feat';
  const filePaths = changes.map((c) => c.filePath.toLowerCase());

  const hasOnlyDocs = filePaths.every((f) => f.endsWith('.md') || f.includes('docs/'));
  const hasOnlyStyles = filePaths.every((f) => f.endsWith('.css') || f.endsWith('.scss') || f.endsWith('.svg'));
  const hasOnlyTests = filePaths.every((f) => f.includes('test') || f.endsWith('.spec.ts') || f.endsWith('.test.ts'));
  const hasOnlyConfigs = filePaths.every((f) =>
    f.endsWith('package.json') ||
    f.endsWith('package-lock.json') ||
    f.endsWith('tsconfig.json') ||
    f.includes('.vscode') ||
    f.endsWith('.gitignore') ||
    f.endsWith('esbuild.js')
  );

  if (hasOnlyDocs) {
    type = 'docs';
  } else if (hasOnlyStyles) {
    type = 'style';
  } else if (hasOnlyTests) {
    type = 'test';
  } else if (hasOnlyConfigs) {
    type = 'chore';
  } else {
    // Check if changes indicate a fix vs a feature
    const isFix = filePaths.some((f) => f.includes('fix') || f.includes('error') || f.includes('kill') || f.includes('port'));
    const isNew = changes.some((c) => c.status === 'A' || c.status === '?');

    if (isNew) {
      type = 'feat';
    } else if (isFix) {
      type = 'fix';
    } else {
      type = 'refactor';
    }
  }

  // Detect scope from common folder or component name
  let scope = 'app';
  if (filePaths.some((f) => f.includes('port') || f.includes('network'))) {
    scope = 'network';
  } else if (filePaths.some((f) => f.includes('json') || f.includes('zod'))) {
    scope = 'json';
  } else if (filePaths.some((f) => f.includes('jwt'))) {
    scope = 'jwt';
  } else if (filePaths.some((f) => f.includes('jalali') || f.includes('persian'))) {
    scope = 'persian';
  } else if (filePaths.some((f) => f.includes('scm') || f.includes('commit') || f.includes('git'))) {
    scope = 'scm';
  } else if (filePaths.some((f) => f.includes('webview') || f.includes('components'))) {
    scope = 'ui';
  } else if (filePaths.some((f) => f.includes('package') || f.includes('deps'))) {
    scope = 'deps';
  }

  // Generate concise subject
  let subject = '';
  if (changes.length === 1) {
    const single = changes[0];
    const baseName = path.basename(single.filePath, path.extname(single.filePath));
    const verb = single.status === 'A' || single.status === '?' ? 'add' : single.status === 'D' ? 'remove' : 'update';
    subject = `${verb} ${baseName}`;
  } else {
    const verbs: string[] = [];
    if (changes.some((c) => c.status === 'A' || c.status === '?')) verbs.push('add');
    if (changes.some((c) => c.status === 'M')) verbs.push('update');
    if (changes.some((c) => c.status === 'D')) verbs.push('remove');

    const primaryVerb = verbs.join(' and ') || 'update';
    subject = `${primaryVerb} ${scope} components and utilities`;
  }

  // Generate bullet points for body
  const bullets = changes.slice(0, 8).map((c) => {
    const action = c.status === 'A' || c.status === '?' ? 'add' : c.status === 'D' ? 'remove' : 'update';
    return `- ${action} ${c.filePath}`;
  });

  const fullMessage = `${type}(${scope}): ${subject}\n\n${bullets.join('\n')}`;

  return {
    type,
    scope,
    subject,
    fullMessage
  };
}
