/**
 * High-Precision Internet Speed Test Engine
 * Powered by Cloudflare Global Edge Telemetry
 * Download, Upload, Ping & Jitter measurement pipeline
 */

export interface SpeedTestTelemetry {
  ip: string;
  colo: string;
  coloCity: string;
  coloCountry: string;
  protocol: string;
  loc: string;
}

export interface SpeedTestResult {
  id: string;
  timestamp: number;
  pingMs: number;
  jitterMs: number;
  downloadMbps: number;
  uploadMbps: number;
  telemetry: SpeedTestTelemetry;
}

export type SpeedTestPhase = 'idle' | 'ping' | 'download' | 'upload' | 'completed' | 'error' | 'aborted';

export interface SpeedTestProgress {
  phase: SpeedTestPhase;
  currentSpeedMbps: number;
  progressPercent: number; // 0 - 100
  pingMs: number;
  jitterMs: number;
  downloadMbps: number;
  uploadMbps: number;
  elapsedSeconds: number;
  telemetry: SpeedTestTelemetry;
  waveform: number[];
  error?: string;
}

/**
 * Cloudflare Edge IATA Colocation Cities Mapping
 */
export const COLO_CITIES: Record<string, { city: string; country: string }> = {
  // Middle East & West Asia
  DXB: { city: 'Dubai', country: 'United Arab Emirates' },
  AUH: { city: 'Abu Dhabi', country: 'United Arab Emirates' },
  DOH: { city: 'Doha', country: 'Qatar' },
  BAH: { city: 'Manama', country: 'Bahrain' },
  KWI: { city: 'Kuwait City', country: 'Kuwait' },
  MCT: { city: 'Muscat', country: 'Oman' },
  RUH: { city: 'Riyadh', country: 'Saudi Arabia' },
  JED: { city: 'Jeddah', country: 'Saudi Arabia' },
  IST: { city: 'Istanbul', country: 'Turkey' },
  SAW: { city: 'Istanbul', country: 'Turkey' },
  ESB: { city: 'Ankara', country: 'Turkey' },
  EVN: { city: 'Yerevan', country: 'Armenia' },
  TBS: { city: 'Tbilisi', country: 'Georgia' },
  GYD: { city: 'Baku', country: 'Azerbaijan' },
  BGW: { city: 'Baghdad', country: 'Iraq' },
  THR: { city: 'Tehran', country: 'Iran' },

  // Europe
  FRA: { city: 'Frankfurt', country: 'Germany' },
  LHR: { city: 'London', country: 'United Kingdom' },
  AMS: { city: 'Amsterdam', country: 'Netherlands' },
  CDG: { city: 'Paris', country: 'France' },
  MAD: { city: 'Madrid', country: 'Spain' },
  MXP: { city: 'Milan', country: 'Italy' },
  FCO: { city: 'Rome', country: 'Italy' },
  VIE: { city: 'Vienna', country: 'Austria' },
  ZRH: { city: 'Zurich', country: 'Switzerland' },
  MUC: { city: 'Munich', country: 'Germany' },
  BER: { city: 'Berlin', country: 'Germany' },
  DUS: { city: 'Dusseldorf', country: 'Germany' },
  ARN: { city: 'Stockholm', country: 'Sweden' },
  CPH: { city: 'Copenhagen', country: 'Denmark' },
  OSL: { city: 'Oslo', country: 'Norway' },
  HEL: { city: 'Helsinki', country: 'Finland' },
  WAW: { city: 'Warsaw', country: 'Poland' },
  PRG: { city: 'Prague', country: 'Czechia' },
  BUD: { city: 'Budapest', country: 'Hungary' },
  ATH: { city: 'Athens', country: 'Greece' },
  LIS: { city: 'Lisbon', country: 'Portugal' },
  DUB: { city: 'Dublin', country: 'Ireland' },

  // North America
  IAD: { city: 'Ashburn / DC', country: 'United States' },
  ORD: { city: 'Chicago', country: 'United States' },
  EWR: { city: 'Newark', country: 'United States' },
  JFK: { city: 'New York', country: 'United States' },
  ATL: { city: 'Atlanta', country: 'United States' },
  MIA: { city: 'Miami', country: 'United States' },
  DFW: { city: 'Dallas', country: 'United States' },
  DEN: { city: 'Denver', country: 'United States' },
  LAX: { city: 'Los Angeles', country: 'United States' },
  SFO: { city: 'San Francisco', country: 'United States' },
  SEA: { city: 'Seattle', country: 'United States' },
  YYZ: { city: 'Toronto', country: 'Canada' },
  YUL: { city: 'Montreal', country: 'Canada' },
  YVR: { city: 'Vancouver', country: 'Canada' },

  // Asia & Pacific
  SIN: { city: 'Singapore', country: 'Singapore' },
  HKG: { city: 'Hong Kong', country: 'Hong Kong' },
  NRT: { city: 'Tokyo', country: 'Japan' },
  HND: { city: 'Tokyo', country: 'Japan' },
  KIX: { city: 'Osaka', country: 'Japan' },
  ICN: { city: 'Seoul', country: 'South Korea' },
  TPE: { city: 'Taipei', country: 'Taiwan' },
  BOM: { city: 'Mumbai', country: 'India' },
  DEL: { city: 'New Delhi', country: 'India' },
  BLR: { city: 'Bengaluru', country: 'India' },
  SYD: { city: 'Sydney', country: 'Australia' },
  MEL: { city: 'Melbourne', country: 'Australia' }
};

/**
 * Calculates numerical median of sample array
 */
export function calculateMedian(samples: number[]): number {
  if (!samples || samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return Math.round(sorted[mid] * 10) / 10;
  }
  return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
}

/**
 * Computes Jitter as the mean absolute difference of consecutive latency measurements
 * Jitter = (1 / (N - 1)) * Sum(|s[i+1] - s[i]|)
 */
export function calculateJitter(samples: number[]): number {
  if (!samples || samples.length <= 1) return 0;
  let totalDelta = 0;
  for (let i = 0; i < samples.length - 1; i++) {
    totalDelta += Math.abs(samples[i + 1] - samples[i]);
  }
  const jitter = totalDelta / (samples.length - 1);
  return Math.round(jitter * 10) / 10;
}

/**
 * Throughput formula in Megabits per second (Mbps)
 * Mbps = (bytes * 8) / (elapsedSeconds * 1,000,000)
 */
export function calculateThroughputMbps(bytes: number, elapsedMs: number): number {
  if (bytes <= 0 || elapsedMs <= 0) return 0;
  const elapsedSec = elapsedMs / 1000;
  const mbps = (bytes * 8) / (elapsedSec * 1_000_000);
  return Math.round(mbps * 100) / 100;
}

/**
 * Maps throughput in Mbps to a logarithmic fraction (0.0 to 1.0)
 * Scale ticks: 0, 5, 10, 25, 50, 100, 250, 500, 1000 Mbps
 */
export function speedToLogFraction(speedMbps: number, maxSpeed: number = 1000): number {
  if (speedMbps <= 0) return 0;
  if (speedMbps >= maxSpeed) return 1;
  const minLog = Math.log10(1); // 0
  const maxLog = Math.log10(maxSpeed + 1); // ~3.0004
  const valLog = Math.log10(speedMbps + 1);
  return Math.max(0, Math.min(1, (valLog - minLog) / (maxLog - minLog)));
}

/**
 * Converts speed in Mbps to gauge rotation angle
 * Default sweep: 240 degrees (from 150deg to 390deg)
 */
export function speedToGaugeAngle(speedMbps: number, startAngle: number = 150, sweepAngle: number = 240): number {
  const fraction = speedToLogFraction(speedMbps, 1000);
  return startAngle + fraction * sweepAngle;
}

/**
 * Parses Cloudflare trace output (key=value text format)
 */
export function parseCloudflareTrace(traceText: string): SpeedTestTelemetry {
  const lines = traceText.split('\n');
  const kv: Record<string, string> = {};
  for (const line of lines) {
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const k = line.substring(0, eqIdx).trim();
      const v = line.substring(eqIdx + 1).trim();
      kv[k] = v;
    }
  }

  const colo = (kv['colo'] || 'UNKNOWN').toUpperCase();
  const cityData = COLO_CITIES[colo];

  return {
    ip: kv['ip'] || '127.0.0.1',
    colo: colo,
    coloCity: cityData?.city || colo,
    coloCountry: cityData?.country || kv['loc'] || 'Global',
    protocol: kv['http'] ? kv['http'].toUpperCase() : 'HTTP/2',
    loc: kv['loc'] || 'US'
  };
}

/**
 * Generates a pseudo-random binary payload for upload tests
 */
export function createUploadPayload(sizeBytes: number = 10 * 1024 * 1024): Uint8Array {
  const buffer = new Uint8Array(sizeBytes);
  // Efficiently seed pattern
  for (let i = 0; i < sizeBytes; i += 128) {
    const chunk = Math.min(128, sizeBytes - i);
    for (let j = 0; j < chunk; j++) {
      buffer[i + j] = ((i * 37) ^ (j * 73)) & 0xff;
    }
  }
  return buffer;
}

export class SpeedTestEngine {
  private abortController: AbortController | null = null;
  private activeXhr: XMLHttpRequest | null = null;
  private isAborted: boolean = false;
  private currentPhase: SpeedTestPhase = 'idle';

  private telemetry: SpeedTestTelemetry = {
    ip: '--',
    colo: '--',
    coloCity: '--',
    coloCountry: '--',
    protocol: '--',
    loc: '--'
  };

  private pingMs: number = 0;
  private jitterMs: number = 0;
  private downloadMbps: number = 0;
  private uploadMbps: number = 0;
  private waveform: number[] = [];

  private onProgressCallback?: (p: SpeedTestProgress) => void;
  private onCompleteCallback?: (res: SpeedTestResult) => void;
  private onErrorCallback?: (err: string) => void;

  constructor(callbacks?: {
    onProgress?: (p: SpeedTestProgress) => void;
    onComplete?: (res: SpeedTestResult) => void;
    onError?: (err: string) => void;
  }) {
    if (callbacks) {
      this.onProgressCallback = callbacks.onProgress;
      this.onCompleteCallback = callbacks.onComplete;
      this.onErrorCallback = callbacks.onError;
    }
  }

  public setCallbacks(
    onProgress: (p: SpeedTestProgress) => void,
    onComplete: (res: SpeedTestResult) => void,
    onError: (err: string) => void
  ) {
    this.onProgressCallback = onProgress;
    this.onCompleteCallback = onComplete;
    this.onErrorCallback = onError;
  }

  public abort() {
    this.isAborted = true;
    this.currentPhase = 'aborted';
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {}
      this.abortController = null;
    }
    if (this.activeXhr) {
      try {
        this.activeXhr.abort();
      } catch {}
      this.activeXhr = null;
    }
    this.emitProgress(0, 0, 0);
  }

  public async start(): Promise<SpeedTestResult | null> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const err = 'Network offline: No active internet connection detected.';
      this.currentPhase = 'error';
      this.onErrorCallback?.(err);
      this.emitProgress(0, 0, 0, err);
      return null;
    }

    this.isAborted = false;
    this.abortController = new AbortController();
    this.waveform = [];
    this.pingMs = 0;
    this.jitterMs = 0;
    this.downloadMbps = 0;
    this.uploadMbps = 0;

    try {
      // -----------------------------------------------------------------
      // STAGE 1: TELEMETRY & LATENCY (PING & JITTER)
      // -----------------------------------------------------------------
      this.currentPhase = 'ping';
      this.emitProgress(0, 5, 0);

      // 1. Fetch Cloudflare Trace
      try {
        const traceResp = await fetch('https://speed.cloudflare.com/cdn-cgi/trace', {
          cache: 'no-store',
          signal: this.abortController.signal
        });
        if (traceResp.ok) {
          const traceText = await traceResp.text();
          this.telemetry = parseCloudflareTrace(traceText);
        }
      } catch (err: any) {
        if (this.isAborted) return null;
        // Non-fatal telemetry fallback
        this.telemetry = {
          ip: 'Dynamic Client',
          colo: 'AUTO',
          coloCity: 'Cloudflare Edge',
          coloCountry: 'Global',
          protocol: 'HTTP/2',
          loc: 'GL'
        };
      }

      if (this.isAborted) return null;

      // 2. Perform 8 sequential latency probes
      const samples: number[] = [];
      const PROBE_COUNT = 8;

      for (let i = 0; i < PROBE_COUNT; i++) {
        if (this.isAborted) return null;
        const t0 = performance.now();
        try {
          await fetch(`https://speed.cloudflare.com/__down?bytes=0&_t=${Date.now()}_${i}`, {
            cache: 'no-store',
            signal: this.abortController.signal
          });
          const delta = performance.now() - t0;
          samples.push(delta);

          // Discard first cold-start sample when computing live interim metrics
          const warmed = samples.length > 1 ? samples.slice(1) : samples;
          this.pingMs = calculateMedian(warmed);
          this.jitterMs = calculateJitter(warmed);

          const pingProgress = 5 + Math.round(((i + 1) / PROBE_COUNT) * 15);
          this.emitProgress(0, pingProgress, (performance.now() - t0) / 1000);
        } catch (e: any) {
          if (this.isAborted) return null;
          // In case single probe fails, retry or continue
        }
      }

      // Finalize Ping & Jitter
      const warmedSamples = samples.length > 1 ? samples.slice(1) : samples;
      this.pingMs = calculateMedian(warmedSamples);
      this.jitterMs = calculateJitter(warmedSamples);

      if (this.isAborted) return null;

      // -----------------------------------------------------------------
      // STAGE 2: MULTI-STREAM DOWNLOAD THROUGHPUT (3 STREAMS, 8 SECONDS)
      // -----------------------------------------------------------------
      this.currentPhase = 'download';
      this.waveform = [];
      const DOWNLOAD_DURATION_MS = 8000;
      const CHUNK_SIZE = 25_000_000; // 25 MB chunks
      const CONCURRENCY = 3;
      const downloadStart = performance.now();
      let totalDownloadedBytes = 0;
      let lastWindowBytes = 0;
      let lastWindowTime = downloadStart;

      // Interval ticker for 100ms smooth telemetry updates
      let interimMbps = 0;
      const downloadTicker = setInterval(() => {
        if (this.isAborted || this.currentPhase !== 'download') return;
        const now = performance.now();
        const elapsed = now - downloadStart;
        const windowElapsed = now - lastWindowTime;

        if (windowElapsed >= 200) {
          const deltaBytes = totalDownloadedBytes - lastWindowBytes;
          interimMbps = calculateThroughputMbps(deltaBytes, windowElapsed);
          lastWindowBytes = totalDownloadedBytes;
          lastWindowTime = now;
          this.waveform.push(interimMbps);
          if (this.waveform.length > 50) this.waveform.shift();
        }

        const cumulativeMbps = calculateThroughputMbps(totalDownloadedBytes, elapsed);
        const activeSpeed = interimMbps > 0 ? interimMbps : cumulativeMbps;
        this.downloadMbps = cumulativeMbps;

        const stageProgress = Math.min(100, (elapsed / DOWNLOAD_DURATION_MS) * 100);
        const overallProgress = 20 + Math.round(stageProgress * 0.4); // 20% to 60%

        this.emitProgress(activeSpeed, overallProgress, elapsed / 1000);
      }, 100);

      // Worker runner for concurrent streams
      const runDownloadWorker = async (workerId: number) => {
        while (!this.isAborted && performance.now() - downloadStart < DOWNLOAD_DURATION_MS) {
          try {
            const resp = await fetch(
              `https://speed.cloudflare.com/__down?bytes=${CHUNK_SIZE}&_w=${workerId}_${Date.now()}`,
              {
                cache: 'no-store',
                signal: this.abortController?.signal
              }
            );

            if (!resp.body) {
              const buf = await resp.arrayBuffer();
              totalDownloadedBytes += buf.byteLength;
              continue;
            }

            const reader = resp.body.getReader();
            while (!this.isAborted && performance.now() - downloadStart < DOWNLOAD_DURATION_MS) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                totalDownloadedBytes += value.byteLength;
              }
            }
            try {
              reader.cancel();
            } catch {}
          } catch (err: any) {
            if (this.isAborted || performance.now() - downloadStart >= DOWNLOAD_DURATION_MS) break;
            // Short backoff on worker network transient hiccup
            await new Promise((r) => setTimeout(r, 100));
          }
        }
      };

      // Run 3 workers in parallel
      const workers = Array.from({ length: CONCURRENCY }, (_, i) => runDownloadWorker(i));
      // Sleep until 8s deadline is reached
      const timeRemaining = Math.max(0, DOWNLOAD_DURATION_MS - (performance.now() - downloadStart));
      await new Promise((resolve) => setTimeout(resolve, timeRemaining));

      clearInterval(downloadTicker);

      // Cancel workers
      try {
        this.abortController.abort();
      } catch {}
      this.abortController = new AbortController();

      const totalDownloadElapsed = performance.now() - downloadStart;
      this.downloadMbps = calculateThroughputMbps(totalDownloadedBytes, totalDownloadElapsed);
      this.emitProgress(this.downloadMbps, 60, totalDownloadElapsed / 1000);

      if (this.isAborted) return null;

      // -----------------------------------------------------------------
      // STAGE 3: HIGH-FREQUENCY UPLOAD THROUGHPUT (XHR / PROGRESS, 8 SECONDS)
      // -----------------------------------------------------------------
      this.currentPhase = 'upload';
      this.waveform = [];
      const UPLOAD_DURATION_MS = 8000;
      const uploadStart = performance.now();
      const payload = createUploadPayload(10 * 1024 * 1024); // 10MB payload
      let completedUploadBytes = 0;
      let currentFlightUploaded = 0;
      let lastUploadWindowBytes = 0;
      let lastUploadWindowTime = uploadStart;
      let uploadInterimMbps = 0;

      const uploadTicker = setInterval(() => {
        if (this.isAborted || this.currentPhase !== 'upload') return;
        const now = performance.now();
        const elapsed = now - uploadStart;
        const totalUploadedSoFar = completedUploadBytes + currentFlightUploaded;
        const windowElapsed = now - lastUploadWindowTime;

        if (windowElapsed >= 200) {
          const deltaBytes = totalUploadedSoFar - lastUploadWindowBytes;
          uploadInterimMbps = calculateThroughputMbps(deltaBytes, windowElapsed);
          lastUploadWindowBytes = totalUploadedSoFar;
          lastUploadWindowTime = now;
          this.waveform.push(uploadInterimMbps);
          if (this.waveform.length > 50) this.waveform.shift();
        }

        const cumulativeUploadMbps = calculateThroughputMbps(totalUploadedSoFar, elapsed);
        const activeUploadSpeed = uploadInterimMbps > 0 ? uploadInterimMbps : cumulativeUploadMbps;
        this.uploadMbps = cumulativeUploadMbps;

        const stageProgress = Math.min(100, (elapsed / UPLOAD_DURATION_MS) * 100);
        const overallProgress = 60 + Math.round(stageProgress * 0.4); // 60% to 100%

        this.emitProgress(activeUploadSpeed, overallProgress, elapsed / 1000);
      }, 100);

      // Upload runner using XMLHttpRequest for fine-grained sub-second progress
      const runUploadChunk = (): Promise<void> => {
        return new Promise<void>((resolve) => {
          if (typeof XMLHttpRequest === 'undefined') {
            // Node/non-browser fallback using fetch
            fetch(`https://speed.cloudflare.com/__up?_t=${Date.now()}`, {
              method: 'POST',
              body: payload.buffer as ArrayBuffer,
              signal: this.abortController?.signal
            })
              .then(() => {
                completedUploadBytes += payload.byteLength;
                resolve();
              })
              .catch(() => resolve());
            return;
          }

          const xhr = new XMLHttpRequest();
          this.activeXhr = xhr;
          xhr.open('POST', `https://speed.cloudflare.com/__up?_t=${Date.now()}`);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && !this.isAborted) {
              currentFlightUploaded = event.loaded;
            }
          };

          xhr.onload = () => {
            completedUploadBytes += payload.byteLength;
            currentFlightUploaded = 0;
            this.activeXhr = null;
            resolve();
          };

          xhr.onerror = () => {
            currentFlightUploaded = 0;
            this.activeXhr = null;
            resolve();
          };

          xhr.onabort = () => {
            currentFlightUploaded = 0;
            this.activeXhr = null;
            resolve();
          };

          try {
            xhr.send(payload.buffer as ArrayBuffer);
          } catch {
            resolve();
          }
        });
      };

      // Loop uploads until 8s expires
      while (!this.isAborted && performance.now() - uploadStart < UPLOAD_DURATION_MS) {
        await runUploadChunk();
      }

      clearInterval(uploadTicker);
      if (this.activeXhr) {
        try {
          this.activeXhr.abort();
        } catch {}
        this.activeXhr = null;
      }

      const totalUploadElapsed = performance.now() - uploadStart;
      const totalFinalUploadBytes = completedUploadBytes + currentFlightUploaded;
      this.uploadMbps = calculateThroughputMbps(totalFinalUploadBytes, totalUploadElapsed);

      if (this.isAborted) return null;

      // -----------------------------------------------------------------
      // STAGE 4: FINALIZATION & RESULT PRODUCTION
      // -----------------------------------------------------------------
      this.currentPhase = 'completed';
      this.emitProgress(0, 100, (performance.now() - downloadStart) / 1000);

      const result: SpeedTestResult = {
        id: `speed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        pingMs: this.pingMs,
        jitterMs: this.jitterMs,
        downloadMbps: this.downloadMbps,
        uploadMbps: this.uploadMbps,
        telemetry: this.telemetry
      };

      this.onCompleteCallback?.(result);
      return result;
    } catch (err: any) {
      if (this.isAborted) return null;
      this.currentPhase = 'error';
      const errMsg = err?.message || 'Internet speed test failed to complete.';
      this.onErrorCallback?.(errMsg);
      this.emitProgress(0, 0, 0, errMsg);
      return null;
    }
  }

  private emitProgress(currentSpeedMbps: number, progressPercent: number, elapsedSeconds: number, error?: string) {
    if (this.onProgressCallback) {
      this.onProgressCallback({
        phase: this.currentPhase,
        currentSpeedMbps: Math.max(0, currentSpeedMbps),
        progressPercent: Math.max(0, Math.min(100, progressPercent)),
        pingMs: this.pingMs,
        jitterMs: this.jitterMs,
        downloadMbps: this.downloadMbps,
        uploadMbps: this.uploadMbps,
        elapsedSeconds: Math.round(elapsedSeconds * 10) / 10,
        telemetry: this.telemetry,
        waveform: [...this.waveform],
        error
      });
    }
  }
}
