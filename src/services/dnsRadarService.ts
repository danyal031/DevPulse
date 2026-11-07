import * as dns from 'dns';
import * as net from 'net';
import * as https from 'https';
import * as http from 'http';
import * as child_process from 'child_process';
import * as os from 'os';
import { performance } from 'perf_hooks';

export interface DnsProvider {
  id: string;
  name: string;
  nameFa: string;
  category: 'anti-sanction' | 'global' | 'custom';
  primary: string;
  secondary?: string;
  latencyMs: number | null;
  status: 'idle' | 'testing' | 'fast' | 'medium' | 'slow' | 'timeout' | 'error';
  resolvedIps?: string[];
  isWinner?: boolean;
  notes?: string;
}

export interface ConnectivityTarget {
  id: string;
  name: string;
  url: string;
  iconName: string;
  status: 'pending' | 'reachable' | 'sanctioned' | 'blocked' | 'timeout';
  httpStatus?: number;
  latencyMs?: number;
  ip?: string;
  errorMsg?: string;
}

export interface TracerouteHop {
  hop: number;
  ip: string;
  hostname?: string;
  rtt1: number | null;
  rtt2: number | null;
  rtt3: number | null;
  avgRtt: number | null;
  lossPercent: number;
  status: 'success' | 'partial' | 'timeout';
}

export const BUILTIN_DNS_PROVIDERS: DnsProvider[] = [
  // Anti-Sanction Providers (سرویس‌های رفع تحریم)
  {
    id: 'shecan',
    name: 'Shecan (شکن)',
    nameFa: 'شکن (Shecan)',
    category: 'anti-sanction',
    primary: '178.22.122.100',
    secondary: '185.51.200.2',
    latencyMs: null,
    status: 'idle',
    notes: 'Free anti-sanction DNS for Iranian developers'
  },
  {
    id: '403online',
    name: '403.online',
    nameFa: '۴۰۳ آنلاین',
    category: 'anti-sanction',
    primary: '10.202.10.202',
    secondary: '10.202.10.102',
    latencyMs: null,
    status: 'idle',
    notes: 'Dedicated developer anti-sanction service'
  },
  {
    id: 'electro',
    name: 'Electro (الکترو)',
    nameFa: 'الکترو (Electro)',
    category: 'anti-sanction',
    primary: '78.157.42.100',
    secondary: '78.157.42.101',
    latencyMs: null,
    status: 'idle',
    notes: 'Gaming & developer anti-sanction DNS'
  },
  {
    id: 'radargame',
    name: 'Radar Game (رادار)',
    nameFa: 'رادار گیم (Radar)',
    category: 'anti-sanction',
    primary: '10.202.10.10',
    secondary: '10.202.10.11',
    latencyMs: null,
    status: 'idle',
    notes: 'Low latency anti-sanction network'
  },
  {
    id: 'begzar',
    name: 'Begzar (بگذر)',
    nameFa: 'بگذر (Begzar)',
    category: 'anti-sanction',
    primary: '185.55.226.26',
    secondary: '185.55.225.25',
    latencyMs: null,
    status: 'idle',
    notes: 'Developer anti-filtering & sanction bypass'
  },

  // Global Anycast DNS Providers
  {
    id: 'cloudflare',
    name: 'Cloudflare DNS',
    nameFa: 'کلودفلر (Cloudflare)',
    category: 'global',
    primary: '1.1.1.1',
    secondary: '1.0.0.1',
    latencyMs: null,
    status: 'idle',
    notes: 'Fastest privacy-first global resolver'
  },
  {
    id: 'google',
    name: 'Google Public DNS',
    nameFa: 'گوگل (Google DNS)',
    category: 'global',
    primary: '8.8.8.8',
    secondary: '8.8.4.4',
    latencyMs: null,
    status: 'idle',
    notes: 'Reliable global anycast resolver'
  },
  {
    id: 'quad9',
    name: 'Quad9 DNS',
    nameFa: 'کوادناین (Quad9)',
    category: 'global',
    primary: '9.9.9.9',
    secondary: '149.112.112.112',
    latencyMs: null,
    status: 'idle',
    notes: 'Security & malware-blocking resolver'
  }
];

export const CONNECTIVITY_TARGETS: ConnectivityTarget[] = [
  {
    id: 'github',
    name: 'GitHub',
    url: 'https://github.com',
    iconName: 'git',
    status: 'pending'
  },
  {
    id: 'npm',
    name: 'NPM Registry',
    url: 'https://registry.npmjs.org',
    iconName: 'box',
    status: 'pending'
  },
  {
    id: 'docker',
    name: 'Docker Hub',
    url: 'https://registry-1.docker.io/v2/',
    iconName: 'docker',
    status: 'pending'
  },
  {
    id: 'google_dl',
    name: 'Google / Android SDK',
    url: 'https://dl.google.com',
    iconName: 'globe',
    status: 'pending'
  },
  {
    id: 'openai',
    name: 'OpenAI API',
    url: 'https://api.openai.com',
    iconName: 'zap',
    status: 'pending'
  },
  {
    id: 'cloudflare_edge',
    name: 'Cloudflare Edge',
    url: 'https://1.1.1.1',
    iconName: 'shield',
    status: 'pending'
  }
];

export class DnsRadarService {
  private static instance: DnsRadarService;
  private customProviders: DnsProvider[] = [];
  private activeTracerouteProcess: child_process.ChildProcess | null = null;

  private constructor() {}

  public static getInstance(): DnsRadarService {
    if (!DnsRadarService.instance) {
      DnsRadarService.instance = new DnsRadarService();
    }
    return DnsRadarService.instance;
  }

  public getProviders(): DnsProvider[] {
    return [...BUILTIN_DNS_PROVIDERS, ...this.customProviders];
  }

  public addCustomProvider(name: string, primary: string, secondary?: string): DnsProvider {
    const id = `custom_${Date.now()}`;
    const newProvider: DnsProvider = {
      id,
      name,
      nameFa: name,
      category: 'custom',
      primary: primary.trim(),
      secondary: secondary?.trim() || undefined,
      latencyMs: null,
      status: 'idle',
      notes: 'Custom user defined DNS'
    };
    this.customProviders.push(newProvider);
    return newProvider;
  }

  public removeCustomProvider(id: string): boolean {
    const idx = this.customProviders.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.customProviders.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * Benchmarks a single DNS server using resolve4 and TCP port 53 fallback
   */
  public async testDnsServer(
    serverIp: string,
    testDomain: string = 'google.com',
    timeoutMs: number = 2500
  ): Promise<{ latencyMs: number | null; resolvedIps: string[]; success: boolean }> {
    const resolver = new dns.promises.Resolver();
    try {
      resolver.setServers([serverIp]);
    } catch {
      return { latencyMs: null, resolvedIps: [], success: false };
    }

    const startTime = performance.now();

    // 1. Attempt resolve4 with timeout
    const dnsQueryPromise = resolver.resolve4(testDomain, { ttl: false });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
    );

    try {
      const addresses = await Promise.race([dnsQueryPromise, timeoutPromise]);
      const duration = Math.round(performance.now() - startTime);
      return {
        latencyMs: Math.max(1, duration),
        resolvedIps: addresses as string[],
        success: true
      };
    } catch {
      // 2. Fallback to TCP handshake test on port 53 if UDP query blocked by sandbox
      const tcpLatency = await this.testTcpPing(serverIp, 53, timeoutMs);
      if (tcpLatency !== null) {
        return {
          latencyMs: tcpLatency,
          resolvedIps: [],
          success: true
        };
      }
      return { latencyMs: null, resolvedIps: [], success: false };
    }
  }

  private testTcpPing(host: string, port: number = 53, timeoutMs: number = 1500): Promise<number | null> {
    return new Promise((resolve) => {
      const start = performance.now();
      const socket = new net.Socket();
      let resolved = false;

      socket.setTimeout(timeoutMs);

      socket.connect(port, host, () => {
        if (!resolved) {
          resolved = true;
          const latency = Math.round(performance.now() - start);
          socket.destroy();
          resolve(Math.max(1, latency));
        }
      });

      socket.on('error', () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve(null);
        }
      });

      socket.on('timeout', () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve(null);
        }
      });
    });
  }

  /**
   * Runs concurrent benchmark against all DNS providers
   */
  public async benchmarkAll(testDomain: string = 'google.com'): Promise<DnsProvider[]> {
    const providers = this.getProviders();

    const results = await Promise.all(
      providers.map(async (provider) => {
        const res = await this.testDnsServer(provider.primary, testDomain, 2500);
        let status: DnsProvider['status'] = 'timeout';
        if (res.success && res.latencyMs !== null) {
          if (res.latencyMs < 80) status = 'fast';
          else if (res.latencyMs < 200) status = 'medium';
          else status = 'slow';
        }

        return {
          ...provider,
          latencyMs: res.latencyMs,
          resolvedIps: res.resolvedIps,
          status,
          isWinner: false
        };
      })
    );

    // Sort by lowest latency, placing timeouts/errors at bottom
    results.sort((a, b) => {
      if (a.latencyMs === null && b.latencyMs === null) return 0;
      if (a.latencyMs === null) return 1;
      if (b.latencyMs === null) return -1;
      return a.latencyMs - b.latencyMs;
    });

    // Mark winner (first successful provider)
    const firstWinner = results.find(r => r.latencyMs !== null && r.latencyMs > 0);
    if (firstWinner) {
      firstWinner.isWinner = true;
    }

    return results;
  }

  /**
   * Generates exact OS commands to apply DNS to network interface
   */
  public getDnsApplyCommand(provider: DnsProvider): { powershell: string; cmd: string; bash: string } {
    const p = provider.primary;
    const s = provider.secondary || '';

    const ps = s
      ? `Get-NetAdapter | Where-Object Status -eq 'Up' | Set-DnsClientServerAddress -ServerAddresses ('${p}','${s}')`
      : `Get-NetAdapter | Where-Object Status -eq 'Up' | Set-DnsClientServerAddress -ServerAddresses ('${p}')`;

    const cmd = s
      ? `netsh interface ip set dns name="Wi-Fi" static ${p} & netsh interface ip add dns name="Wi-Fi" ${s} index=2`
      : `netsh interface ip set dns name="Wi-Fi" static ${p}`;

    const bash = s
      ? `networksetup -setdnsservers Wi-Fi ${p} ${s} # macOS\n# Linux: resolvectl dns $(ip route show default | awk '{print $5}') ${p} ${s}`
      : `networksetup -setdnsservers Wi-Fi ${p} # macOS`;

    return { powershell: ps, cmd, bash };
  }

  /**
   * Flushes OS DNS cache
   */
  public async flushDnsCache(): Promise<{ success: boolean; message: string }> {
    const platform = os.platform();
    let command = '';

    if (platform === 'win32') {
      command = 'ipconfig /flushdns';
    } else if (platform === 'darwin') {
      command = 'dscacheutil -flushcache';
    } else {
      command = 'resolvectl flush-caches || systemd-resolve --flush-caches || true';
    }

    try {
      await new Promise<void>((resolve, reject) => {
        child_process.exec(command, (err) => {
          if (err && platform !== 'linux') reject(err);
          else resolve();
        });
      });
      return { success: true, message: 'OS DNS cache successfully flushed!' };
    } catch (err: any) {
      return { success: false, message: `Failed to flush DNS cache: ${err.message}` };
    }
  }

  /**
   * Checks current NPM registry
   */
  public async getNpmRegistry(): Promise<string> {
    return new Promise((resolve) => {
      child_process.exec('npm config get registry', (err, stdout) => {
        if (err || !stdout) {
          resolve('https://registry.npmjs.org/');
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  /**
   * Switches NPM registry
   */
  public async setNpmRegistry(registryUrl: string): Promise<{ success: boolean; registry: string; message: string }> {
    const cleanUrl = registryUrl.trim();
    return new Promise((resolve) => {
      child_process.exec(`npm config set registry ${cleanUrl}`, (err) => {
        if (err) {
          resolve({ success: false, registry: cleanUrl, message: err.message });
        } else {
          resolve({ success: true, registry: cleanUrl, message: `NPM registry set to ${cleanUrl}` });
        }
      });
    });
  }

  /**
   * Probes a single connectivity target to detect geo-blocking / sanctions vs reachability
   */
  public async checkTargetReachability(target: ConnectivityTarget): Promise<ConnectivityTarget> {
    const urlObj = new URL(target.url);
    const isHttps = urlObj.protocol === 'https:';
    const httpLib = isHttps ? https : http;

    const startTime = performance.now();

    return new Promise((resolve) => {
      const options: https.RequestOptions = {
        method: 'GET',
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        timeout: 4000,
        headers: {
          'User-Agent': 'DevShelf-Network-Radar/1.6.0 (VSCode-Extension)'
        }
      };

      const req = httpLib.request(options, (res) => {
        const latency = Math.round(performance.now() - startTime);
        const code = res.statusCode || 0;

        let status: ConnectivityTarget['status'] = 'reachable';
        // 403 or 451 indicates Sanction / Geo-blocked
        if (code === 403 || code === 451) {
          status = 'sanctioned';
        } else if (code >= 200 && code < 400) {
          status = 'reachable';
        } else if (code >= 500) {
          status = 'blocked';
        }

        res.resume(); // discard body
        resolve({
          ...target,
          status,
          httpStatus: code,
          latencyMs: latency
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          ...target,
          status: 'timeout',
          latencyMs: 4000,
          errorMsg: 'Connection Timeout'
        });
      });

      req.on('error', (err) => {
        const latency = Math.round(performance.now() - startTime);
        resolve({
          ...target,
          status: 'blocked',
          latencyMs: latency,
          errorMsg: err.message
        });
      });

      req.end();
    });
  }

  /**
   * Checks all developer sanction targets concurrently
   */
  public async checkAllConnectivity(): Promise<ConnectivityTarget[]> {
    return Promise.all(
      CONNECTIVITY_TARGETS.map(target => this.checkTargetReachability(target))
    );
  }

  /**
   * Starts cross-platform Traceroute / MTR streaming hops
   */
  public startTraceroute(
    targetHost: string,
    onHop: (hop: TracerouteHop) => void,
    onComplete: (code: number) => void
  ): void {
    this.stopTraceroute();

    const host = targetHost.trim() || '1.1.1.1';
    const isWin = os.platform() === 'win32';

    // Windows: tracert -d (no DNS resolution) -h 15 (max 15 hops) -w 1000 (1s timeout)
    // Linux/macOS: traceroute -n -m 15 -w 1
    const cmd = isWin ? 'tracert' : 'traceroute';
    const args = isWin
      ? ['-d', '-h', '15', '-w', '1000', host]
      : ['-n', '-m', '15', '-w', '1', host];

    try {
      this.activeTracerouteProcess = child_process.spawn(cmd, args);
    } catch (err) {
      onComplete(-1);
      return;
    }

    let buffer = '';

    this.activeTracerouteProcess.stdout?.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        const hop = this.parseTracerouteLine(line, isWin);
        if (hop) {
          onHop(hop);
        }
      }
    });

    this.activeTracerouteProcess.on('close', (code) => {
      this.activeTracerouteProcess = null;
      onComplete(code ?? 0);
    });

    this.activeTracerouteProcess.on('error', () => {
      this.activeTracerouteProcess = null;
      onComplete(-1);
    });
  }

  public stopTraceroute(): void {
    if (this.activeTracerouteProcess) {
      try {
        this.activeTracerouteProcess.kill();
      } catch {}
      this.activeTracerouteProcess = null;
    }
  }

  private parseTracerouteLine(line: string, isWin: boolean): TracerouteHop | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Windows tracert sample:
    // "  1    <1 ms    <1 ms    <1 ms  192.168.1.1"
    // "  2    12 ms    11 ms    14 ms  10.10.10.1"
    // "  3     *        *        *     Request timed out."
    // Unix traceroute sample:
    // " 1  192.168.1.1  0.512 ms  0.418 ms  0.398 ms"
    // " 2  * * *"

    const winRegex = /^(\d+)\s+([<\d*]+(?:\s+ms)?)\s+([<\d*]+(?:\s+ms)?)\s+([<\d*]+(?:\s+ms)?)\s+(.+)$/;
    const match = trimmed.match(winRegex);

    if (match) {
      const hopNum = parseInt(match[1], 10);
      const rtt1 = this.parseRtt(match[2]);
      const rtt2 = this.parseRtt(match[3]);
      const rtt3 = this.parseRtt(match[4]);
      const targetStr = match[5].trim();

      const validRtts = [rtt1, rtt2, rtt3].filter((r): r is number => r !== null);
      const avg = validRtts.length > 0 ? Math.round(validRtts.reduce((a, b) => a + b, 0) / validRtts.length) : null;
      const isTimeout = targetStr.includes('timed out') || validRtts.length === 0;

      return {
        hop: hopNum,
        ip: isTimeout ? '* * *' : targetStr,
        rtt1,
        rtt2,
        rtt3,
        avgRtt: avg,
        lossPercent: Math.round(((3 - validRtts.length) / 3) * 100),
        status: validRtts.length === 3 ? 'success' : validRtts.length > 0 ? 'partial' : 'timeout'
      };
    }

    // Unix style: "1 192.168.1.1 1.234 ms 1.111 ms 1.050 ms"
    const unixRegex = /^(\d+)\s+([^\s]+)\s+([\d.*]+(?:\s+ms)?)\s+([\d.*]+(?:\s+ms)?)\s+([\d.*]+(?:\s+ms)?)?/;
    const uMatch = trimmed.match(unixRegex);
    if (uMatch) {
      const hopNum = parseInt(uMatch[1], 10);
      const ip = uMatch[2];
      const rtt1 = this.parseRtt(uMatch[3]);
      const rtt2 = this.parseRtt(uMatch[4]);
      const rtt3 = uMatch[5] ? this.parseRtt(uMatch[5]) : null;

      const validRtts = [rtt1, rtt2, rtt3].filter((r): r is number => r !== null);
      const avg = validRtts.length > 0 ? Math.round(validRtts.reduce((a, b) => a + b, 0) / validRtts.length) : null;

      return {
        hop: hopNum,
        ip,
        rtt1,
        rtt2,
        rtt3,
        avgRtt: avg,
        lossPercent: Math.round(((3 - validRtts.length) / 3) * 100),
        status: validRtts.length === 3 ? 'success' : validRtts.length > 0 ? 'partial' : 'timeout'
      };
    }

    return null;
  }

  private parseRtt(valStr: string): number | null {
    if (!valStr || valStr.includes('*')) return null;
    const clean = valStr.replace(/[<ms]/g, '').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? null : Math.max(1, Math.round(num));
  }
}
