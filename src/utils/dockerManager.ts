import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'dead' | 'created';
  status: string;
  ports: string;
}

export type DockerErrorCode = 'DOCKER_NOT_INSTALLED' | 'DAEMON_NOT_RUNNING' | 'EXECUTION_ERROR';

export interface DockerDaemonStatus {
  isInstalled: boolean;
  isRunning: boolean;
  errorCode?: DockerErrorCode;
  errorMessage?: string;
  containers: DockerContainer[];
}

/**
 * Parses container list from Docker CLI output.
 * Supports newline-delimited JSON objects (--format "{{json .}}"),
 * JSON arrays, or space-delimited table fallback.
 */
export function parseDockerContainersOutput(rawOutput: string): DockerContainer[] {
  if (!rawOutput || !rawOutput.trim()) {
    return [];
  }

  const trimmed = rawOutput.trim();
  const containers: DockerContainer[] = [];

  // Check if output is a JSON array
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsedArray = JSON.parse(trimmed);
      if (Array.isArray(parsedArray)) {
        for (const item of parsedArray) {
          containers.push(normalizeRawContainer(item));
        }
        return containers;
      }
    } catch {
      // Fall through to line-by-line parsing
    }
  }

  // Parse line-by-line (each line is a JSON object in modern Docker CLI)
  const lines = trimmed.split('\n');
  let hasParsedJsonLines = false;

  for (const line of lines) {
    const lineTrimmed = line.trim();
    if (!lineTrimmed) continue;

    if (lineTrimmed.startsWith('{') && lineTrimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(lineTrimmed);
        containers.push(normalizeRawContainer(parsed));
        hasParsedJsonLines = true;
      } catch {
        // Not valid JSON line
      }
    }
  }

  if (hasParsedJsonLines) {
    return containers;
  }

  // Fallback: parse classic tabular docker ps output
  // Header: CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
  if (lines.length > 1 && lines[0].includes('CONTAINER ID')) {
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].trim();
      if (!row) continue;
      const parts = row.split(/\s{2,}/);
      if (parts.length >= 4) {
        const id = parts[0] || '';
        const image = parts[1] || '';
        const status = parts[parts.length - 3] || parts[parts.length - 2] || '';
        const ports = parts.length > 5 ? parts[parts.length - 2] : '';
        const name = parts[parts.length - 1] || '';
        const isUp = status.toLowerCase().startsWith('up');

        containers.push({
          id,
          name: name.replace(/^\//, ''),
          image,
          state: isUp ? 'running' : 'exited',
          status,
          ports
        });
      }
    }
  }

  return containers;
}

function normalizeRawContainer(raw: any): DockerContainer {
  const id = String(raw.ID || raw.Id || raw.id || '').substring(0, 12);
  let name = String(raw.Names || raw.Name || raw.name || '');
  if (name.startsWith('/')) {
    name = name.substring(1);
  }

  const image = String(raw.Image || raw.image || '');
  const rawState = String(raw.State || raw.state || '').toLowerCase();
  const status = String(raw.Status || raw.status || '');
  const ports = String(raw.Ports || raw.ports || '');

  let state: DockerContainer['state'] = 'exited';
  if (rawState === 'running' || status.toLowerCase().startsWith('up')) {
    state = 'running';
  } else if (rawState === 'paused') {
    state = 'paused';
  } else if (rawState === 'restarting') {
    state = 'restarting';
  } else if (rawState === 'dead') {
    state = 'dead';
  } else if (rawState === 'created') {
    state = 'created';
  }

  return {
    id,
    name: name || id || 'unknown',
    image: image || 'unknown',
    state,
    status: status || state,
    ports
  };
}

/**
 * Scans active and stopped Docker containers.
 */
export async function getDockerContainers(): Promise<DockerDaemonStatus> {
  try {
    const { stdout } = await execFileAsync(
      'docker',
      ['ps', '-a', '--format', '{{json .}}'],
      { timeout: 7000 }
    );

    const containers = parseDockerContainersOutput(stdout);
    return {
      isInstalled: true,
      isRunning: true,
      containers
    };
  } catch (error: any) {
    const errorMsg = (error.message || '').toLowerCase();
    const stderrMsg = (error.stderr || '').toLowerCase();
    const combined = `${errorMsg} ${stderrMsg}`;

    if (error.code === 'ENOENT' || combined.includes('not recognized') || combined.includes('command not found')) {
      return {
        isInstalled: false,
        isRunning: false,
        errorCode: 'DOCKER_NOT_INSTALLED',
        errorMessage: 'Docker CLI was not found in your system PATH.',
        containers: []
      };
    }

    if (
      combined.includes('daemon') ||
      combined.includes('error during connect') ||
      combined.includes('connect to the docker daemon') ||
      combined.includes('is the docker daemon running') ||
      combined.includes('pipe')
    ) {
      return {
        isInstalled: true,
        isRunning: false,
        errorCode: 'DAEMON_NOT_RUNNING',
        errorMessage: 'Docker daemon is not running or unreachable.',
        containers: []
      };
    }

    return {
      isInstalled: true,
      isRunning: false,
      errorCode: 'EXECUTION_ERROR',
      errorMessage: error.stderr || error.message || 'Failed to inspect Docker daemon.',
      containers: []
    };
  }
}

/**
 * Safe container ID validator to avoid command injection.
 */
export function isSafeContainerIdentifier(idOrName: string): boolean {
  return /^[a-zA-Z0-9_\-\.]+$/.test(idOrName.trim());
}

/**
 * Executes a container lifecycle action: start, stop, or restart.
 */
export async function dockerContainerAction(
  action: 'start' | 'stop' | 'restart',
  containerId: string
): Promise<{ success: boolean; message: string }> {
  const cleanId = containerId.trim();
  if (!isSafeContainerIdentifier(cleanId)) {
    return { success: false, message: 'Invalid container identifier.' };
  }

  try {
    await execFileAsync('docker', [action, cleanId], { timeout: 15000 });
    return {
      success: true,
      message: `Container ${cleanId} ${action}ed successfully.`
    };
  } catch (err: any) {
    const msg = err.stderr || err.message || `Failed to ${action} container.`;
    return { success: false, message: msg.trim() };
  }
}

/**
 * Fetches recent logs for a given container ID.
 */
export async function getDockerLogs(
  containerId: string,
  tail: number = 50
): Promise<{ success: boolean; logs: string; error?: string }> {
  const cleanId = containerId.trim();
  if (!isSafeContainerIdentifier(cleanId)) {
    return { success: false, logs: '', error: 'Invalid container identifier.' };
  }

  const safeTail = Math.min(Math.max(1, tail), 500);

  try {
    const { stdout, stderr } = await execFileAsync(
      'docker',
      ['logs', '--tail', String(safeTail), cleanId],
      { timeout: 10000, maxBuffer: 1024 * 1024 }
    );

    const combinedLogs = (stdout + (stderr ? '\n' + stderr : '')).trim();
    return {
      success: true,
      logs: combinedLogs || 'No logs recorded for this container.'
    };
  } catch (err: any) {
    return {
      success: false,
      logs: '',
      error: err.stderr || err.message || 'Failed to read container logs.'
    };
  }
}
