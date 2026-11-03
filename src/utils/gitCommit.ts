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
    exec(`git ${cmd}`, { cwd, maxBuffer: 15 * 1024 * 1024 }, (error, stdout) => {
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

/**
 * Retrieves git diff patch text. Checks staged diff first; falls back to unstaged diff.
 */
export async function getGitDiff(cwd: string): Promise<string> {
  const stagedDiff = await runGitCommand('diff --cached', cwd);
  if (stagedDiff) return stagedDiff;
  return await runGitCommand('diff', cwd);
}

/**
 * Parses raw git diff output to extract semantic descriptions of changes within each file.
 */
export function analyzeDiffHunks(diffText: string): Map<string, string[]> {
  const fileSummaries = new Map<string, string[]>();
  if (!diffText || !diffText.trim()) {
    return fileSummaries;
  }

  // Split diff into per-file chunks
  const fileChunks = diffText.split(/^diff --git /m);

  for (const chunk of fileChunks) {
    if (!chunk.trim()) continue;

    const firstLine = chunk.split(/\r?\n/)[0];
    const match = firstLine.match(/a\/(\S+)\s+b\/(\S+)/);
    if (!match) continue;

    const filePath = match[2];
    const descriptions: string[] = [];

    const lines = chunk.split(/\r?\n/);
    const addedLines: string[] = [];
    const removedLines: string[] = [];

    for (const l of lines) {
      if (l.startsWith('+++') || l.startsWith('---')) continue;
      if (l.startsWith('+')) addedLines.push(l.substring(1).trim());
      else if (l.startsWith('-')) removedLines.push(l.substring(1).trim());
    }

    // 1. Detect version bump in package.json
    if (filePath.endsWith('package.json')) {
      for (const line of addedLines) {
        const verMatch = line.match(/"version":\s*"([^"]+)"/);
        if (verMatch) {
          descriptions.push(`bump version to ${verMatch[1]}`);
          break;
        }
      }
      for (const line of addedLines) {
        const cmdMatch = line.match(/"command":\s*"devshelf\.([^"]+)"/);
        if (cmdMatch) {
          descriptions.push(`register ${cmdMatch[1]} command`);
        }
      }
    }

    // 2. Detect functions, classes, interfaces, or types
    const addedFuncs = new Set<string>();
    const modifiedFuncs = new Set<string>();
    const addedTypes = new Set<string>();

    for (const line of addedLines) {
      // Functions
      const fnMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/);
      if (fnMatch) addedFuncs.add(fnMatch[1]);

      // Classes
      const clsMatch = line.match(/(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/);
      if (clsMatch) addedFuncs.add(clsMatch[1]);

      // Interfaces & Types
      const typeMatch = line.match(/(?:export\s+)?(?:interface|type)\s+([a-zA-Z0-9_$]+)/);
      if (typeMatch) addedTypes.add(typeMatch[1]);

      // Command registrations
      const regMatch = line.match(/registerCommand\(['"]devshelf\.([^'"]+)['"]/);
      if (regMatch) descriptions.push(`register devshelf.${regMatch[1]} command`);

      // Event/Message handlers
      const caseMatch = line.match(/case\s+['"]([a-zA-Z0-9_$]+)['"]:/);
      if (caseMatch && !['get', 'post', 'put', 'delete'].includes(caseMatch[1].toLowerCase())) {
        descriptions.push(`handle ${caseMatch[1]} message`);
      }
    }

    if (addedFuncs.size > 0) {
      const names = Array.from(addedFuncs).slice(0, 3).join(', ');
      descriptions.push(`implement ${names}${addedFuncs.size > 3 ? ` (+${addedFuncs.size - 3} more)` : ''}`);
    }

    if (addedTypes.size > 0) {
      const types = Array.from(addedTypes).slice(0, 3).join(', ');
      descriptions.push(`define ${types}`);
    }

    // 3. UI/CSS styles
    if (filePath.endsWith('.css')) {
      const addedClasses = new Set<string>();
      for (const line of addedLines) {
        const classMatch = line.match(/\.([a-zA-Z0-9\-_]+)\s*\{/);
        if (classMatch) addedClasses.add(classMatch[1]);
      }
      if (addedClasses.size > 0) {
        const sel = Array.from(addedClasses).slice(0, 3).map((c) => `.${c}`).join(', ');
        descriptions.push(`add UI styles for ${sel}`);
      }
    }

    // 4. Docs / Markdown sections
    if (filePath.endsWith('.md')) {
      const sections: string[] = [];
      for (const line of addedLines) {
        const hMatch = line.match(/^#{1,3}\s+(.+)$/);
        if (hMatch) sections.push(hMatch[1].replace(/[\*\_`]/g, '').trim());
      }
      if (sections.length > 0) {
        descriptions.push(`document ${sections.slice(0, 2).join(' and ')}`);
      }
    }

    // 5. Bug fix / error handling detection
    const hasErrorFix = addedLines.some((l) =>
      l.includes('catch') ||
      l.includes('try {') ||
      l.includes('validate') ||
      l.includes('sanitize') ||
      l.includes('timeout') ||
      l.includes('error')
    );
    if (hasErrorFix && descriptions.length === 0) {
      descriptions.push('enhance error handling and input validation');
    }

    // Fallback if no specific patterns matched
    if (descriptions.length === 0) {
      if (addedLines.length > 0 && removedLines.length === 0) {
        descriptions.push('add component logic and utilities');
      } else if (removedLines.length > 0 && addedLines.length === 0) {
        descriptions.push('remove obsolete code and cleanup');
      } else {
        descriptions.push('update implementation details');
      }
    }

    fileSummaries.set(filePath, descriptions);
  }

  return fileSummaries;
}

export function generateConventionalCommit(changes: FileChange[], diffText?: string): GeneratedCommit {
  if (changes.length === 0) {
    return {
      type: 'chore',
      scope: 'repo',
      subject: 'update project files',
      fullMessage: 'chore: update project files'
    };
  }

  const detailedSummaries = diffText ? analyzeDiffHunks(diffText) : new Map<string, string[]>();

  // Detect types by inspecting file paths, statuses, and diff contents
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

  // Detect scope from folder or component name
  let scope = 'app';
  if (filePaths.some((f) => f.includes('docker'))) {
    scope = 'docker';
  } else if (filePaths.some((f) => f.includes('api') || f.includes('curl') || f.includes('tester'))) {
    scope = 'api';
  } else if (filePaths.some((f) => f.includes('port') || f.includes('network'))) {
    scope = 'network';
  } else if (filePaths.some((f) => f.includes('json') || f.includes('zod'))) {
    scope = 'json';
  } else if (filePaths.some((f) => f.includes('jwt'))) {
    scope = 'jwt';
  } else if (filePaths.some((f) => f.includes('jalali') || f.includes('persian'))) {
    scope = 'persian';
  } else if (filePaths.some((f) => f.includes('scm') || f.includes('commit') || f.includes('git'))) {
    scope = 'git';
  } else if (filePaths.some((f) => f.includes('webview') || f.includes('components'))) {
    scope = 'ui';
  } else if (filePaths.some((f) => f.includes('package') || f.includes('deps'))) {
    scope = 'deps';
  }

  // Generate concise, informative subject
  let subject = '';
  if (changes.length === 1) {
    const single = changes[0];
    const baseName = path.basename(single.filePath, path.extname(single.filePath));
    const verb = single.status === 'A' || single.status === '?' ? 'add' : single.status === 'D' ? 'remove' : 'update';
    const detailList = detailedSummaries.get(single.filePath);
    if (detailList && detailList.length > 0) {
      subject = `${detailList[0]} in ${baseName}`;
    } else {
      subject = `${verb} ${baseName}`;
    }
  } else {
    // Check if we have specific actions analyzed from the diff
    const allActions: string[] = [];
    for (const [_, actions] of detailedSummaries) {
      allActions.push(...actions);
    }

    if (allActions.length > 0) {
      // Pick the most descriptive action for the subject
      const primaryAction = allActions.find((a) => a.startsWith('implement') || a.startsWith('add') || a.startsWith('bump')) || allActions[0];
      subject = `${primaryAction} and update ${scope} components`;
    } else {
      const verbs: string[] = [];
      if (changes.some((c) => c.status === 'A' || c.status === '?')) verbs.push('add');
      if (changes.some((c) => c.status === 'M')) verbs.push('update');
      if (changes.some((c) => c.status === 'D')) verbs.push('remove');

      const primaryVerb = verbs.join(' and ') || 'update';
      subject = `${primaryVerb} ${scope} components and utilities`;
    }
  }

  // Ensure subject is within reasonable length
  if (subject.length > 70) {
    subject = subject.substring(0, 67) + '...';
  }

  // Generate rich bullet points detailing actual changes inside each file
  const bullets = changes.slice(0, 10).map((c) => {
    const action = c.status === 'A' || c.status === '?' ? 'add' : c.status === 'D' ? 'remove' : 'update';
    const details = detailedSummaries.get(c.filePath);

    if (details && details.length > 0) {
      return `- ${c.filePath}: ${details.join('; ')}`;
    }
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
