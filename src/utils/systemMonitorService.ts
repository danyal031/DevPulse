import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SystemTelemetry {
  cpuUsagePercent: number;
  cpuModel: string;
  cpuCores: number;
  totalMemBytes: number;
  freeMemBytes: number;
  usedMemBytes: number;
  memUsagePercent: number;
  uptimeSeconds: number;
  uptimeFormatted: string;
  platform: string;
  arch: string;
  timestamp: number;
}

export interface MonitoredProcess {
  pid: number;
  name: string;
  memoryMb: number;
  cpuPercent: number;
  isDevProcess: boolean;
  devCategory?: 'node' | 'python' | 'docker' | 'database' | 'editor' | 'compiler' | 'git' | 'other';
}

const DEV_PATTERNS: { regex: RegExp; category: MonitoredProcess['devCategory'] }[] = [
  { regex: /^(node|ts-node|nodemon)(\.exe)?$/i, category: 'node' },
  { regex: /^(python|python3|py|pypy)(\.exe)?$/i, category: 'python' },
  { regex: /^(docker|dockerd|containerd)(\.exe)?$/i, category: 'docker' },
  { regex: /^(postgres|mysqld|mongod|redis-server)(\.exe)?$/i, category: 'database' },
  { regex: /^(code|code-insiders|electron)(\.exe)?$/i, category: 'editor' },
  { regex: /^(cargo|rustc|go|javac|java|dotnet)(\.exe)?$/i, category: 'compiler' },
  { regex: /^(git|git-remote-https)(\.exe)?$/i, category: 'git' }
];

export class SystemMonitorService {
  private static instance: SystemMonitorService;
  private prevCpuSnapshot: { idle: number; total: number } | null = null;

  private constructor() {
    this.prevCpuSnapshot = this.takeCpuSnapshot();
  }

  public static getInstance(): SystemMonitorService {
    if (!SystemMonitorService.instance) {
      SystemMonitorService.instance = new SystemMonitorService();
    }
    return SystemMonitorService.instance;
  }

  private takeCpuSnapshot(): { idle: number; total: number } {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        total += (cpu.times as any)[type];
      }
      idle += cpu.times.idle;
    }

    return { idle, total };
  }

  public getTelemetry(): SystemTelemetry {
    const curSnapshot = this.takeCpuSnapshot();
    let cpuUsagePercent = 0;

    if (this.prevCpuSnapshot && curSnapshot.total > this.prevCpuSnapshot.total) {
      const totalDelta = curSnapshot.total - this.prevCpuSnapshot.total;
      const idleDelta = curSnapshot.idle - this.prevCpuSnapshot.idle;
      cpuUsagePercent = Math.max(0, Math.min(100, Math.round(((totalDelta - idleDelta) / totalDelta) * 100)));
    }
    this.prevCpuSnapshot = curSnapshot;

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = Math.round((usedMem / totalMem) * 100);

    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model || 'Unknown CPU';
    const cpuCores = cpus.length;

    const uptimeSeconds = os.uptime();
    const uptimeFormatted = this.formatUptime(uptimeSeconds);

    return {
      cpuUsagePercent,
      cpuModel,
      cpuCores,
      totalMemBytes: totalMem,
      freeMemBytes: freeMem,
      usedMemBytes: usedMem,
      memUsagePercent,
      uptimeSeconds,
      uptimeFormatted,
      platform: os.platform(),
      arch: os.arch(),
      timestamp: Date.now()
    };
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  public async getTopProcesses(limit: number = 20): Promise<MonitoredProcess[]> {
    const platform = os.platform();

    try {
      if (platform === 'win32') {
        return await this.getWindowsProcesses(limit);
      } else {
        return await this.getUnixProcesses(limit);
      }
    } catch {
      return [];
    }
  }

  private async getWindowsProcesses(limit: number): Promise<MonitoredProcess[]> {
    const cmd = `powershell -NoProfile -Command "Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First ${limit} Id, ProcessName, WorkingSet64, CPU | ConvertTo-Json"`;
    const { stdout } = await execAsync(cmd, { timeout: 4000 });
    const trimmed = stdout.trim();
    if (!trimmed) return [];

    let parsed: any;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return [];
    }

    const items = Array.isArray(parsed) ? parsed : [parsed];
    const result: MonitoredProcess[] = [];

    for (const item of items) {
      if (!item || !item.Id || item.Id === 0) continue;
      const name = item.ProcessName || 'Unknown';
      const memoryMb = Math.round(((item.WorkingSet64 || 0) / (1024 * 1024)) * 10) / 10;
      const cpuVal = typeof item.CPU === 'number' ? Math.round(item.CPU * 10) / 10 : 0;

      const devMatch = DEV_PATTERNS.find((p) => p.regex.test(name));

      result.push({
        pid: item.Id,
        name,
        memoryMb,
        cpuPercent: cpuVal,
        isDevProcess: Boolean(devMatch),
        devCategory: devMatch?.category
      });
    }

    return result;
  }

  private async getUnixProcesses(limit: number): Promise<MonitoredProcess[]> {
    const cmd = `ps -eo pid,%cpu,rss,comm --sort=-rss | head -n ${limit + 1}`;
    const { stdout } = await execAsync(cmd, { timeout: 4000 });
    const lines = stdout.trim().split('\n').slice(1);
    const result: MonitoredProcess[] = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 4) continue;

      const pid = parseInt(parts[0], 10);
      const cpuPercent = parseFloat(parts[1]) || 0;
      const rssKb = parseInt(parts[2], 10) || 0;
      const name = parts.slice(3).join(' ');

      if (pid <= 0) continue;
      const memoryMb = Math.round((rssKb / 1024) * 10) / 10;
      const devMatch = DEV_PATTERNS.find((p) => p.regex.test(name));

      result.push({
        pid,
        name,
        memoryMb,
        cpuPercent,
        isDevProcess: Boolean(devMatch),
        devCategory: devMatch?.category
      });
    }

    return result;
  }

  public async killProcess(pid: number): Promise<{ success: boolean; message: string }> {
    if (pid <= 0 || pid === process.pid) {
      return { success: false, message: 'Invalid or protected process ID.' };
    }

    try {
      if (os.platform() === 'win32') {
        await execAsync(`taskkill /F /T /PID ${pid}`);
      } else {
        await execAsync(`kill -9 ${pid}`);
      }
      return { success: true, message: `Process (PID: ${pid}) was successfully terminated.` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to terminate process.' };
    }
  }

  public async killDevOrphans(
    targetType: 'node' | 'python' | 'all'
  ): Promise<{ success: boolean; count: number; message: string }> {
    const processes = await this.getTopProcesses(60);
    const currentPid = process.pid;

    const toKill = processes.filter((p) => {
      if (p.pid === currentPid || p.pid <= 4) return false;
      if (targetType === 'node') return p.devCategory === 'node';
      if (targetType === 'python') return p.devCategory === 'python';
      return p.devCategory === 'node' || p.devCategory === 'python';
    });

    if (toKill.length === 0) {
      return { success: true, count: 0, message: 'No orphan developer processes found.' };
    }

    let killedCount = 0;
    for (const proc of toKill) {
      const res = await this.killProcess(proc.pid);
      if (res.success) killedCount++;
    }

    return {
      success: true,
      count: killedCount,
      message: `Cleaned up ${killedCount} orphan developer process(es).`
    };
  }
}
