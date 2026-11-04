import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { performance } from 'perf_hooks';

export interface LoadTestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  concurrency: number;
  mode: 'duration' | 'requests';
  durationSeconds?: number;
  totalRequests?: number;
  timeoutMs?: number;
  keepAlive?: boolean;
}

export interface LatencyBucket {
  label: string;
  minMs: number;
  maxMs: number;
  count: number;
  percentage: number;
}

export interface LoadTestSnapshot {
  isRunning: boolean;
  isCompleted: boolean;
  elapsedMs: number;
  totalDurationMs: number;
  progressPercent: number;
  activeWorkers: number;
  completedRequests: number;
  targetRequests?: number;
  rps: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  statusCodes: Record<string, number>;
  buckets: LatencyBucket[];
  recentErrors: string[];
}

export class LoadTesterService {
  private static instance: LoadTesterService;
  private isRunning: boolean = false;
  private isAborted: boolean = false;
  private abortController: AbortController | null = null;
  private currentConfig: LoadTestConfig | null = null;

  private startTime: number = 0;
  private endTime: number = 0;
  private latencies: number[] = [];
  private statusCodes: Record<string, number> = {};
  private recentErrors: string[] = [];
  private activeWorkers: number = 0;
  private completedRequests: number = 0;
  private requestsDispatched: number = 0;
  private successCount: number = 0;
  private errorCount: number = 0;

  private streamTimer: any = null;
  private durationTimer: any = null;
  private onSnapshotCallback?: (snapshot: LoadTestSnapshot) => void;
  private onCompleteCallback?: (snapshot: LoadTestSnapshot) => void;

  private httpAgent: http.Agent | null = null;
  private httpsAgent: https.Agent | null = null;

  private constructor() {}

  public static getInstance(): LoadTesterService {
    if (!LoadTesterService.instance) {
      LoadTesterService.instance = new LoadTesterService();
    }
    return LoadTesterService.instance;
  }

  public setCallbacks(
    onSnapshot: (snapshot: LoadTestSnapshot) => void,
    onComplete: (snapshot: LoadTestSnapshot) => void
  ) {
    this.onSnapshotCallback = onSnapshot;
    this.onCompleteCallback = onComplete;
  }

  public isTestRunning(): boolean {
    return this.isRunning;
  }

  public getSnapshot(): LoadTestSnapshot {
    return this.computeSnapshot(!this.isRunning);
  }

  public getCurrentConfig(): LoadTestConfig | null {
    return this.currentConfig;
  }

  public async start(config: LoadTestConfig): Promise<void> {
    if (this.isRunning) {
      this.abort();
    }

    this.currentConfig = config;
    this.isRunning = true;
    this.isAborted = false;
    this.abortController = new AbortController();

    this.latencies = [];
    this.statusCodes = {};
    this.recentErrors = [];
    this.activeWorkers = 0;
    this.completedRequests = 0;
    this.requestsDispatched = 0;
    this.successCount = 0;
    this.errorCount = 0;

    const concurrency = Math.max(1, Math.min(200, config.concurrency || 10));
    const keepAlive = config.keepAlive !== false;

    this.httpAgent = new http.Agent({ keepAlive, maxSockets: concurrency + 10 });
    this.httpsAgent = new https.Agent({ keepAlive, maxSockets: concurrency + 10 });

    this.startTime = Date.now();
    const durationSeconds = config.durationSeconds || 10;
    this.endTime = config.mode === 'duration' ? this.startTime + durationSeconds * 1000 : 0;

    if (config.mode === 'duration') {
      this.durationTimer = setTimeout(() => {
        this.finishTest();
      }, durationSeconds * 1000);
    }

    // Start 250ms telemetry streaming
    this.streamTimer = setInterval(() => {
      if (this.onSnapshotCallback) {
        this.onSnapshotCallback(this.computeSnapshot(false));
      }
    }, 250);

    // Initial snapshot
    if (this.onSnapshotCallback) {
      this.onSnapshotCallback(this.computeSnapshot(false));
    }

    // Launch worker pool
    const workers: Promise<void>[] = [];
    for (let i = 0; i < concurrency; i++) {
      workers.push(this.runWorker(config));
    }

    // Await completion of all workers
    await Promise.all(workers);

    this.finishTest();
  }

  private async runWorker(config: LoadTestConfig): Promise<void> {
    const targetRequests = config.totalRequests || 100;
    const isDuration = config.mode === 'duration';

    while (!this.isAborted) {
      if (isDuration) {
        if (Date.now() >= this.endTime) break;
      } else {
        if (this.requestsDispatched >= targetRequests) break;
      }

      this.requestsDispatched++;
      this.activeWorkers++;

      try {
        await this.dispatchSingleRequest(config);
      } catch {}

      this.activeWorkers--;
    }
  }

  private dispatchSingleRequest(config: LoadTestConfig): Promise<void> {
    return new Promise((resolve) => {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(config.url);
      } catch (err: any) {
        this.recordResult(0, 'INVALID_URL', 0, false, 'Invalid URL format');
        return resolve();
      }

      const isHttps = parsedUrl.protocol === 'https:';
      const lib = isHttps ? https : http;
      const agent = isHttps ? this.httpsAgent : this.httpAgent;

      const headers: Record<string, string> = {
        'User-Agent': 'DevShelf-LoadTester/1.3',
        ...(config.headers || {})
      };

      if (config.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      const reqOptions: http.RequestOptions = {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: config.method,
        headers,
        agent: agent || undefined,
        timeout: config.timeoutMs || 5000
      };

      const start = performance.now();
      let finished = false;

      const req = lib.request(reqOptions, (res) => {
        // Drain response stream to allow connection reuse
        res.on('data', () => {});
        res.on('end', () => {
          if (finished) return;
          finished = true;
          const durationMs = Math.round((performance.now() - start) * 10) / 10;
          const code = res.statusCode || 0;
          const isSuccess = code >= 200 && code < 400;
          this.recordResult(code, `${code} ${res.statusMessage || ''}`.trim(), durationMs, isSuccess);
          resolve();
        });
        res.on('error', (err: any) => {
          if (finished) return;
          finished = true;
          const durationMs = Math.round((performance.now() - start) * 10) / 10;
          this.recordResult(0, err.code || 'RESP_ERROR', durationMs, false, err.message);
          resolve();
        });
        res.on('close', () => {
          if (finished) return;
          finished = true;
          const durationMs = Math.round((performance.now() - start) * 10) / 10;
          this.recordResult(0, 'CONN_CLOSED', durationMs, false, 'Connection closed');
          resolve();
        });
      });

      req.on('timeout', () => {
        req.destroy();
        if (finished) return;
        finished = true;
        const durationMs = Math.round((performance.now() - start) * 10) / 10;
        this.recordResult(0, 'TIMEOUT', durationMs, false, 'Request timed out');
        resolve();
      });

      req.on('error', (err: any) => {
        if (finished) return;
        finished = true;
        const durationMs = Math.round((performance.now() - start) * 10) / 10;
        const errCode = err.code || 'ERROR';
        this.recordResult(0, errCode, durationMs, false, err.message);
        resolve();
      });

      // Handle external abort signal
      if (this.abortController?.signal) {
        this.abortController.signal.addEventListener('abort', () => {
          if (!finished) {
            finished = true;
            req.destroy();
            resolve();
          }
        });
      }

      if (config.body) {
        req.write(config.body);
      }
      req.end();
    });
  }

  private recordResult(
    statusCode: number,
    statusKey: string,
    latencyMs: number,
    isSuccess: boolean,
    errorMsg?: string
  ) {
    this.completedRequests++;
    this.latencies.push(latencyMs);

    this.statusCodes[statusKey] = (this.statusCodes[statusKey] || 0) + 1;

    if (isSuccess) {
      this.successCount++;
    } else {
      this.errorCount++;
      if (errorMsg && !this.recentErrors.includes(errorMsg)) {
        this.recentErrors.push(errorMsg);
        if (this.recentErrors.length > 5) this.recentErrors.shift();
      }
    }
  }

  public abort(): void {
    if (!this.isRunning) return;
    this.isAborted = true;
    if (this.abortController) {
      this.abortController.abort();
    }
    this.finishTest();
  }

  private finishTest(): void {
    if (!this.isRunning && !this.streamTimer) return;
    this.isRunning = false;
    const isCompleted = !this.isAborted;
    this.isAborted = true;

    if (this.durationTimer) {
      clearTimeout(this.durationTimer);
      this.durationTimer = null;
    }

    if (this.abortController) {
      this.abortController.abort();
    }

    if (this.streamTimer) {
      clearInterval(this.streamTimer);
      this.streamTimer = null;
    }

    if (this.httpAgent) {
      this.httpAgent.destroy();
      this.httpAgent = null;
    }
    if (this.httpsAgent) {
      this.httpsAgent.destroy();
      this.httpsAgent = null;
    }

    const finalSnapshot = this.computeSnapshot(isCompleted);
    if (this.onCompleteCallback) {
      this.onCompleteCallback(finalSnapshot);
    }
  }

  public computeSnapshot(isCompleted: boolean): LoadTestSnapshot {
    const now = Date.now();
    const elapsedMs = Math.max(1, now - this.startTime);
    const totalDurationMs = this.currentConfig?.mode === 'duration'
      ? (this.currentConfig.durationSeconds || 10) * 1000
      : 0;

    let progressPercent = 0;
    if (this.currentConfig?.mode === 'duration') {
      progressPercent = Math.min(100, Math.round((elapsedMs / totalDurationMs) * 100));
    } else if (this.currentConfig?.totalRequests) {
      progressPercent = Math.min(100, Math.round((this.completedRequests / this.currentConfig.totalRequests) * 100));
    }

    if (isCompleted) {
      progressPercent = 100;
    }

    // RPS calculation
    const elapsedSec = elapsedMs / 1000;
    const rps = elapsedSec > 0 ? Math.round((this.completedRequests / elapsedSec) * 10) / 10 : 0;

    // Latency Percentiles & Stats
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const len = sorted.length;

    let minLatencyMs = 0;
    let maxLatencyMs = 0;
    let avgLatencyMs = 0;
    let p50LatencyMs = 0;
    let p95LatencyMs = 0;
    let p99LatencyMs = 0;

    if (len > 0) {
      minLatencyMs = sorted[0];
      maxLatencyMs = sorted[len - 1];
      const sum = sorted.reduce((acc, val) => acc + val, 0);
      avgLatencyMs = Math.round((sum / len) * 10) / 10;
      p50LatencyMs = sorted[Math.floor(len * 0.5)];
      p95LatencyMs = sorted[Math.min(len - 1, Math.floor(len * 0.95))];
      p99LatencyMs = sorted[Math.min(len - 1, Math.floor(len * 0.99))];
    }

    // Success Rate
    const totalFinished = this.successCount + this.errorCount;
    const successRate = totalFinished > 0 ? Math.round((this.successCount / totalFinished) * 1000) / 10 : 100;

    // Latency Distribution Buckets
    const buckets: LatencyBucket[] = [
      { label: '< 50ms', minMs: 0, maxMs: 50, count: 0, percentage: 0 },
      { label: '50-150ms', minMs: 50, maxMs: 150, count: 0, percentage: 0 },
      { label: '150-300ms', minMs: 150, maxMs: 300, count: 0, percentage: 0 },
      { label: '300-500ms', minMs: 300, maxMs: 500, count: 0, percentage: 0 },
      { label: '> 500ms', minMs: 500, maxMs: Infinity, count: 0, percentage: 0 }
    ];

    for (const lat of sorted) {
      for (const b of buckets) {
        if (lat >= b.minMs && lat < b.maxMs) {
          b.count++;
          break;
        }
      }
    }

    if (len > 0) {
      for (const b of buckets) {
        b.percentage = Math.round((b.count / len) * 1000) / 10;
      }
    }

    return {
      isRunning: this.isRunning,
      isCompleted,
      elapsedMs,
      totalDurationMs,
      progressPercent,
      activeWorkers: this.activeWorkers,
      completedRequests: this.completedRequests,
      targetRequests: this.currentConfig?.totalRequests,
      rps,
      minLatencyMs,
      maxLatencyMs,
      avgLatencyMs,
      p50LatencyMs,
      p95LatencyMs,
      p99LatencyMs,
      successCount: this.successCount,
      errorCount: this.errorCount,
      successRate,
      statusCodes: { ...this.statusCodes },
      buckets,
      recentErrors: [...this.recentErrors]
    };
  }

  public generateMarkdownReport(snapshot: LoadTestSnapshot, config: LoadTestConfig): string {
    const dateStr = new Date().toISOString();
    return `# DevShelf Load Benchmark Report

**Generated:** ${dateStr}  
**Target URL:** \`${config.method} ${config.url}\`  
**Concurrency (Virtual Users):** ${config.concurrency}  
**Test Mode:** ${config.mode === 'duration' ? `${config.durationSeconds}s duration` : `${config.totalRequests} total requests`}  

---

### Core Performance Metrics

| Metric | Value |
| :--- | :--- |
| **Total Requests** | ${snapshot.completedRequests} |
| **Throughput (RPS)** | **${snapshot.rps} req/sec** |
| **Success Rate** | **${snapshot.successRate}%** (${snapshot.successCount} OK / ${snapshot.errorCount} Errors) |
| **Total Test Duration** | ${(snapshot.elapsedMs / 1000).toFixed(2)}s |

---

### Latency Percentiles (Response Times)

| Percentile | Response Time |
| :--- | :--- |
| **Min Latency** | ${snapshot.minLatencyMs} ms |
| **P50 (Median)** | **${snapshot.p50LatencyMs} ms** |
| **Average** | ${snapshot.avgLatencyMs} ms |
| **P95** | **${snapshot.p95LatencyMs} ms** |
| **P99** | **${snapshot.p99LatencyMs} ms** |
| **Max Latency** | ${snapshot.maxLatencyMs} ms |

---

### Latency Distribution

| Range | Count | Share |
| :--- | :--- | :--- |
${snapshot.buckets.map((b) => `| ${b.label} | ${b.count} | ${b.percentage}% |`).join('\n')}

---

### Status Codes Breakdown

| Status Code / Error | Count |
| :--- | :--- |
${Object.entries(snapshot.statusCodes).map(([code, count]) => `| \`${code}\` | ${count} |`).join('\n')}
`;
  }
}
