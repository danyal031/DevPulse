import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'dead' | 'created';
  status: string;
  ports: string;
  createdAt?: string;
}

export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: string;
  createdSince: string;
  createdAt?: string;
}

export interface DockerVolume {
  name: string;
  driver: string;
  scope: string;
  size?: string;
}

export interface DockerNetwork {
  id: string;
  name: string;
  driver: string;
  scope: string;
  internal?: boolean;
}

export interface DockerContainerStat {
  id: string;
  name: string;
  cpuPerc: string;
  memUsage: string;
  memPerc: string;
  netIO: string;
  blockIO: string;
  pids: string;
}

export type DockerErrorCode = 'DOCKER_NOT_INSTALLED' | 'DAEMON_NOT_RUNNING' | 'EXECUTION_ERROR';

export interface DockerDaemonStatus {
  isInstalled: boolean;
  isRunning: boolean;
  errorCode?: DockerErrorCode;
  errorMessage?: string;
  containers: DockerContainer[];
}

export type DockerStatusPayload = DockerDaemonStatus;

export interface DockerRunContainerConfig {
  image: string;
  name?: string;
  ports?: string;
  env?: string;
  detached?: boolean;
  restartPolicy?: 'no' | 'always' | 'unless-stopped' | 'on-failure';
}

// ============================================================================
// Safety & Validation Helpers
// ============================================================================

/**
 * Validates container/volume/network ID or simple names to avoid shell injection.
 */
export function isSafeContainerIdentifier(idOrName: string): boolean {
  return /^[a-zA-Z0-9_\-\.]+$/.test(idOrName.trim());
}

/**
 * Validates image references including registry domains, namespaces, and tags (e.g., "myregistry.io/org/app:v1.0").
 */
export function isSafeDockerIdentifier(val: string): boolean {
  return /^[a-zA-Z0-9_\-\.\:\/@]+$/.test(val.trim());
}

// ============================================================================
// Parsing Engines (JSON line-by-line, JSON arrays, and Tabular Fallback)
// ============================================================================

/**
 * Normalizes a raw container object into typed DockerContainer.
 */
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
  const createdAt = String(raw.CreatedAt || raw.createdAt || raw.Created || '');

  let state: DockerContainer['state'] = 'exited';
  if (rawState === 'running' || status.toLowerCase().startsWith('up')) {
    state = 'running';
  } else if (rawState === 'paused' || status.toLowerCase().includes('(paused)')) {
    state = 'paused';
  } else if (rawState === 'restarting' || status.toLowerCase().startsWith('restart')) {
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
    ports,
    createdAt
  };
}

/**
 * Parses container list from Docker CLI output.
 */
export function parseDockerContainersOutput(rawOutput: string): DockerContainer[] {
  if (!rawOutput || !rawOutput.trim()) {
    return [];
  }

  const trimmed = rawOutput.trim();
  const containers: DockerContainer[] = [];

  // JSON Array parsing
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
      // Fall through
    }
  }

  // JSON line-by-line parsing
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

  // Fallback: parse tabular docker ps output
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
        const isPaused = status.toLowerCase().includes('(paused)');

        containers.push({
          id,
          name: name.replace(/^\//, ''),
          image,
          state: isPaused ? 'paused' : isUp ? 'running' : 'exited',
          status,
          ports
        });
      }
    }
  }

  return containers;
}

/**
 * Parses image list from Docker CLI output.
 */
export function parseDockerImagesOutput(rawOutput: string): DockerImage[] {
  if (!rawOutput || !rawOutput.trim()) {
    return [];
  }

  const trimmed = rawOutput.trim();
  const images: DockerImage[] = [];

  // JSON line-by-line
  const lines = trimmed.split('\n');
  let hasParsedJsonLines = false;

  for (const line of lines) {
    const lineTrimmed = line.trim();
    if (!lineTrimmed) continue;

    if (lineTrimmed.startsWith('{') && lineTrimmed.endsWith('}')) {
      try {
        const item = JSON.parse(lineTrimmed);
        const id = String(item.ID || item.Id || item.id || '').replace(/^sha256:/, '').substring(0, 12);
        const repository = String(item.Repository || item.repository || '<none>');
        const tag = String(item.Tag || item.tag || '<none>');
        const size = String(item.Size || item.size || '0 B');
        const createdSince = String(item.CreatedSince || item.createdSince || item.Created || '');
        const createdAt = String(item.CreatedAt || item.createdAt || '');

        images.push({
          id,
          repository,
          tag,
          size,
          createdSince: createdSince || createdAt || 'unknown',
          createdAt
        });
        hasParsedJsonLines = true;
      } catch {
        // Continue
      }
    }
  }

  if (hasParsedJsonLines) {
    return images;
  }

  // Fallback: tabular output
  // REPOSITORY   TAG       IMAGE ID       CREATED        SIZE
  if (lines.length > 1 && lines[0].includes('IMAGE ID')) {
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].trim();
      if (!row) continue;
      const parts = row.split(/\s{2,}/);
      if (parts.length >= 4) {
        images.push({
          repository: parts[0] || '<none>',
          tag: parts[1] || '<none>',
          id: (parts[2] || '').substring(0, 12),
          createdSince: parts[3] || '',
          size: parts[4] || ''
        });
      }
    }
  }

  return images;
}

/**
 * Parses volume list from Docker CLI output.
 */
export function parseDockerVolumesOutput(rawOutput: string): DockerVolume[] {
  if (!rawOutput || !rawOutput.trim()) {
    return [];
  }

  const trimmed = rawOutput.trim();
  const volumes: DockerVolume[] = [];
  const lines = trimmed.split('\n');

  let hasParsedJson = false;
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
      try {
        const item = JSON.parse(trimmedLine);
        volumes.push({
          name: String(item.Name || item.name || ''),
          driver: String(item.Driver || item.driver || 'local'),
          scope: String(item.Scope || item.scope || 'local'),
          size: item.Size ? String(item.Size) : undefined
        });
        hasParsedJson = true;
      } catch {}
    }
  }

  if (hasParsedJson) {
    return volumes;
  }

  // Fallback tabular: DRIVER    VOLUME NAME
  if (lines.length > 1 && lines[0].includes('VOLUME NAME')) {
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].trim();
      if (!row) continue;
      const parts = row.split(/\s{2,}/);
      if (parts.length >= 2) {
        volumes.push({
          driver: parts[0] || 'local',
          name: parts[1] || '',
          scope: 'local'
        });
      }
    }
  }

  return volumes;
}

/**
 * Parses network list from Docker CLI output.
 */
export function parseDockerNetworksOutput(rawOutput: string): DockerNetwork[] {
  if (!rawOutput || !rawOutput.trim()) {
    return [];
  }

  const trimmed = rawOutput.trim();
  const networks: DockerNetwork[] = [];
  const lines = trimmed.split('\n');

  let hasParsedJson = false;
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
      try {
        const item = JSON.parse(trimmedLine);
        networks.push({
          id: String(item.ID || item.Id || '').substring(0, 12),
          name: String(item.Name || item.name || ''),
          driver: String(item.Driver || item.driver || ''),
          scope: String(item.Scope || item.scope || 'local'),
          internal: Boolean(item.Internal)
        });
        hasParsedJson = true;
      } catch {}
    }
  }

  if (hasParsedJson) {
    return networks;
  }

  // Fallback tabular: NETWORK ID   NAME      DRIVER    SCOPE
  if (lines.length > 1 && lines[0].includes('NETWORK ID')) {
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].trim();
      if (!row) continue;
      const parts = row.split(/\s{2,}/);
      if (parts.length >= 3) {
        networks.push({
          id: (parts[0] || '').substring(0, 12),
          name: parts[1] || '',
          driver: parts[2] || '',
          scope: parts[3] || 'local'
        });
      }
    }
  }

  return networks;
}

/**
 * Parses docker stats output into structured stats.
 */
export function parseDockerStatsOutput(rawOutput: string): DockerContainerStat[] {
  if (!rawOutput || !rawOutput.trim()) {
    return [];
  }

  const trimmed = rawOutput.trim();
  const stats: DockerContainerStat[] = [];
  const lines = trimmed.split('\n');

  let hasParsedJson = false;
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
      try {
        const item = JSON.parse(trimmedLine);
        stats.push({
          id: String(item.ID || item.Container || '').substring(0, 12),
          name: String(item.Name || ''),
          cpuPerc: String(item.CPUPerc || '0.00%'),
          memUsage: String(item.MemUsage || '0B / 0B'),
          memPerc: String(item.MemPerc || '0.00%'),
          netIO: String(item.NetIO || '0B / 0B'),
          blockIO: String(item.BlockIO || '0B / 0B'),
          pids: String(item.PIDs || '0')
        });
        hasParsedJson = true;
      } catch {}
    }
  }

  if (hasParsedJson) {
    return stats;
  }

  // Fallback tabular
  if (lines.length > 1 && lines[0].includes('CPU %')) {
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].trim();
      if (!row) continue;
      const parts = row.split(/\s{2,}/);
      if (parts.length >= 6) {
        stats.push({
          id: (parts[0] || '').substring(0, 12),
          name: parts[1] || '',
          cpuPerc: parts[2] || '0.00%',
          memUsage: parts[3] || '0B',
          memPerc: parts[4] || '0.00%',
          netIO: parts[5] || '0B',
          blockIO: parts[6] || '0B',
          pids: parts[7] || '0'
        });
      }
    }
  }

  return stats;
}

// ============================================================================
// Core Execution Functions (Containers)
// ============================================================================

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
 * Executes a container lifecycle action: start, stop, restart, pause, unpause, or remove.
 */
export async function dockerContainerAction(
  action: 'start' | 'stop' | 'restart' | 'pause' | 'unpause' | 'remove',
  containerId: string,
  options: { force?: boolean } = {}
): Promise<{ success: boolean; message: string }> {
  const cleanId = containerId.trim();
  if (!isSafeContainerIdentifier(cleanId)) {
    return { success: false, message: 'Invalid container identifier.' };
  }

  try {
    if (action === 'remove') {
      const args = options.force ? ['rm', '-f', cleanId] : ['rm', cleanId];
      await execFileAsync('docker', args, { timeout: 15000 });
      return {
        success: true,
        message: `Container ${cleanId} removed successfully.`
      };
    }

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

/**
 * Inspects any Docker object (container, image, volume, network) and returns formatted JSON.
 */
export async function inspectDockerObject(
  target: string
): Promise<{ success: boolean; data?: any; jsonString?: string; error?: string }> {
  const cleanTarget = target.trim();
  if (!isSafeDockerIdentifier(cleanTarget)) {
    return { success: false, error: 'Invalid Docker identifier.' };
  }

  try {
    const { stdout } = await execFileAsync('docker', ['inspect', cleanTarget], {
      timeout: 10000,
      maxBuffer: 2 * 1024 * 1024
    });

    const parsed = JSON.parse(stdout);
    const item = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : parsed;
    return {
      success: true,
      data: item,
      jsonString: JSON.stringify(item, null, 2)
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.stderr || err.message || 'Failed to inspect Docker object.'
    };
  }
}

// ============================================================================
// Core Execution Functions (Images)
// ============================================================================

/**
 * Lists local Docker images.
 */
export async function getDockerImages(): Promise<{ success: boolean; images: DockerImage[]; error?: string }> {
  try {
    const { stdout } = await execFileAsync(
      'docker',
      ['images', '--format', '{{json .}}'],
      { timeout: 10000 }
    );
    return {
      success: true,
      images: parseDockerImagesOutput(stdout)
    };
  } catch (err: any) {
    return {
      success: false,
      images: [],
      error: err.stderr || err.message || 'Failed to list images.'
    };
  }
}

/**
 * Pulls a Docker image from registry.
 */
export async function pullDockerImage(
  imageName: string
): Promise<{ success: boolean; message: string }> {
  const cleanName = imageName.trim();
  if (!cleanName || !isSafeDockerIdentifier(cleanName)) {
    return { success: false, message: 'Invalid image name specified.' };
  }

  try {
    const { stdout } = await execFileAsync('docker', ['pull', cleanName], {
      timeout: 120000, // 2 minutes for pull
      maxBuffer: 1024 * 1024
    });
    return {
      success: true,
      message: `Successfully pulled ${cleanName}.\n${stdout.slice(-200).trim()}`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.stderr || err.message || `Failed to pull image ${cleanName}.`
    };
  }
}

/**
 * Removes a local Docker image.
 */
export async function removeDockerImage(
  imageIdOrName: string,
  force: boolean = false
): Promise<{ success: boolean; message: string }> {
  const cleanId = imageIdOrName.trim();
  if (!cleanId || !isSafeDockerIdentifier(cleanId)) {
    return { success: false, message: 'Invalid image identifier.' };
  }

  try {
    const args = force ? ['rmi', '-f', cleanId] : ['rmi', cleanId];
    await execFileAsync('docker', args, { timeout: 15000 });
    return {
      success: true,
      message: `Image ${cleanId} removed successfully.`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.stderr || err.message || `Failed to remove image ${cleanId}.`
    };
  }
}

/**
 * Prunes unused or dangling Docker images.
 */
export async function pruneDockerImages(
  all: boolean = true
): Promise<{ success: boolean; message: string; output?: string }> {
  try {
    const args = all ? ['image', 'prune', '-a', '-f'] : ['image', 'prune', '-f'];
    const { stdout } = await execFileAsync('docker', args, { timeout: 30000 });
    return {
      success: true,
      message: 'Unused images pruned successfully.',
      output: stdout.trim()
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.stderr || err.message || 'Failed to prune images.'
    };
  }
}

/**
 * Runs a new Docker container with configuration parameters.
 */
export async function runDockerContainer(
  config: DockerRunContainerConfig
): Promise<{ success: boolean; message: string; containerId?: string }> {
  const image = (config.image || '').trim();
  if (!image || !isSafeDockerIdentifier(image)) {
    return { success: false, message: 'A valid Docker image is required.' };
  }

  const args: string[] = ['run'];
  if (config.detached !== false) {
    args.push('-d');
  }

  if (config.name && config.name.trim()) {
    const cleanName = config.name.trim();
    if (!isSafeContainerIdentifier(cleanName)) {
      return { success: false, message: 'Invalid container name.' };
    }
    args.push('--name', cleanName);
  }

  if (config.restartPolicy && config.restartPolicy !== 'no') {
    args.push('--restart', config.restartPolicy);
  }

  // Parse ports: "8080:80, 3000:3000"
  if (config.ports && config.ports.trim()) {
    const portPairs = config.ports.split(',').map((p) => p.trim()).filter(Boolean);
    for (const p of portPairs) {
      if (!/^\d+(:\d+)?(\/(tcp|udp))?$/.test(p)) {
        return { success: false, message: `Invalid port mapping format: "${p}". Expected "8080:80".` };
      }
      args.push('-p', p);
    }
  }

  // Parse env: "KEY=VALUE, FOO=BAR"
  if (config.env && config.env.trim()) {
    const envVars = config.env.split(',').map((e) => e.trim()).filter(Boolean);
    for (const e of envVars) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*=.*$/.test(e)) {
        return { success: false, message: `Invalid environment variable format: "${e}". Expected "KEY=VALUE".` };
      }
      args.push('-e', e);
    }
  }

  args.push(image);

  try {
    const { stdout } = await execFileAsync('docker', args, { timeout: 30000 });
    const containerId = stdout.trim().substring(0, 12);
    return {
      success: true,
      message: `Container started successfully (ID: ${containerId}).`,
      containerId
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.stderr || err.message || 'Failed to start container.'
    };
  }
}

// ============================================================================
// Core Execution Functions (Volumes & Networks)
// ============================================================================

/**
 * Lists Docker volumes.
 */
export async function getDockerVolumes(): Promise<{ success: boolean; volumes: DockerVolume[]; error?: string }> {
  try {
    const { stdout } = await execFileAsync(
      'docker',
      ['volume', 'ls', '--format', '{{json .}}'],
      { timeout: 8000 }
    );
    return {
      success: true,
      volumes: parseDockerVolumesOutput(stdout)
    };
  } catch (err: any) {
    return {
      success: false,
      volumes: [],
      error: err.stderr || err.message || 'Failed to list volumes.'
    };
  }
}

/**
 * Removes a Docker volume.
 */
export async function removeDockerVolume(
  volumeName: string
): Promise<{ success: boolean; message: string }> {
  const cleanName = volumeName.trim();
  if (!cleanName || !isSafeContainerIdentifier(cleanName)) {
    return { success: false, message: 'Invalid volume name.' };
  }

  try {
    await execFileAsync('docker', ['volume', 'rm', cleanName], { timeout: 15000 });
    return {
      success: true,
      message: `Volume ${cleanName} removed successfully.`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.stderr || err.message || `Failed to remove volume ${cleanName}.`
    };
  }
}

/**
 * Prunes unused Docker volumes.
 */
export async function pruneDockerVolumes(): Promise<{ success: boolean; message: string }> {
  try {
    const { stdout } = await execFileAsync('docker', ['volume', 'prune', '-f'], { timeout: 20000 });
    return {
      success: true,
      message: stdout.trim() || 'Unused volumes pruned successfully.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.stderr || err.message || 'Failed to prune volumes.'
    };
  }
}

/**
 * Lists Docker networks.
 */
export async function getDockerNetworks(): Promise<{ success: boolean; networks: DockerNetwork[]; error?: string }> {
  try {
    const { stdout } = await execFileAsync(
      'docker',
      ['network', 'ls', '--format', '{{json .}}'],
      { timeout: 8000 }
    );
    return {
      success: true,
      networks: parseDockerNetworksOutput(stdout)
    };
  } catch (err: any) {
    return {
      success: false,
      networks: [],
      error: err.stderr || err.message || 'Failed to list networks.'
    };
  }
}

/**
 * Removes a Docker network.
 */
export async function removeDockerNetwork(
  networkIdOrName: string
): Promise<{ success: boolean; message: string }> {
  const cleanTarget = networkIdOrName.trim();
  if (!cleanTarget || !isSafeContainerIdentifier(cleanTarget)) {
    return { success: false, message: 'Invalid network identifier.' };
  }

  try {
    await execFileAsync('docker', ['network', 'rm', cleanTarget], { timeout: 15000 });
    return {
      success: true,
      message: `Network ${cleanTarget} removed successfully.`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.stderr || err.message || `Failed to remove network ${cleanTarget}.`
    };
  }
}

// ============================================================================
// Core Execution Functions (Stats & System Pruning)
// ============================================================================

/**
 * Fetches real-time snapshot of Docker container stats.
 */
export async function getDockerStats(): Promise<{ success: boolean; stats: DockerContainerStat[]; error?: string }> {
  try {
    const { stdout } = await execFileAsync(
      'docker',
      ['stats', '--no-stream', '--format', '{{json .}}'],
      { timeout: 12000 }
    );
    return {
      success: true,
      stats: parseDockerStatsOutput(stdout)
    };
  } catch (err: any) {
    return {
      success: false,
      stats: [],
      error: err.stderr || err.message || 'Failed to read container stats.'
    };
  }
}

/**
 * Performs a master Docker system prune to reclaim disk space.
 */
export async function dockerSystemPrune(
  includeVolumes: boolean = true
): Promise<{ success: boolean; message: string; output?: string }> {
  try {
    const args = ['system', 'prune', '-a', '-f'];
    if (includeVolumes) {
      args.push('--volumes');
    }

    const { stdout } = await execFileAsync('docker', args, { timeout: 60000 });
    return {
      success: true,
      message: 'Docker system cleanup completed successfully.',
      output: stdout.trim()
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.stderr || err.message || 'Failed to execute system prune.'
    };
  }
}
