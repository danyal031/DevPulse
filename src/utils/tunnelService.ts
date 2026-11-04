import { spawn, ChildProcess } from 'child_process';
import { generateQrSvg } from './qrCode';

export type TunnelProvider = 'cloudflare' | 'localtunnel' | 'ngrok';

export interface TunnelStatus {
  isActive: boolean;
  provider: TunnelProvider;
  port: number;
  publicUrl: string | null;
  qrSvg: string | null;
  error?: string;
  logs: string[];
}

export class TunnelService {
  private static instance: TunnelService;
  private currentProcess: ChildProcess | null = null;
  private status: TunnelStatus = {
    isActive: false,
    provider: 'cloudflare',
    port: 4040,
    publicUrl: null,
    qrSvg: null,
    logs: []
  };
  private onStatusChange?: (status: TunnelStatus) => void;

  private constructor() {}

  public static getInstance(): TunnelService {
    if (!TunnelService.instance) {
      TunnelService.instance = new TunnelService();
    }
    return TunnelService.instance;
  }

  public setCallback(cb: (status: TunnelStatus) => void) {
    this.onStatusChange = cb;
  }

  public getStatus(): TunnelStatus {
    return { ...this.status, logs: [...this.status.logs] };
  }

  public async startTunnel(
    provider: TunnelProvider,
    port: number
  ): Promise<TunnelStatus> {
    if (this.status.isActive) {
      await this.stopTunnel();
    }

    this.status = {
      isActive: false,
      provider,
      port,
      publicUrl: null,
      qrSvg: null,
      logs: [`[DevShelf Tunnel] Starting ${provider} tunnel for port :${port}...`]
    };
    this.notify();

    let cmd = '';
    let args: string[] = [];

    if (provider === 'cloudflare') {
      cmd = 'npx';
      args = ['--yes', 'cloudflared', 'tunnel', '--url', `http://localhost:${port}`];
    } else if (provider === 'localtunnel') {
      cmd = 'npx';
      args = ['--yes', 'localtunnel', '--port', String(port)];
    } else if (provider === 'ngrok') {
      cmd = 'ngrok';
      args = ['http', String(port)];
    }

    return new Promise((resolve) => {
      let resolved = false;

      try {
        const isWindows = process.platform === 'win32';
        const spawned = spawn(cmd, args, {
          shell: isWindows,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env }
        });

        this.currentProcess = spawned;

        const urlPatterns: Record<TunnelProvider, RegExp> = {
          cloudflare: /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/i,
          localtunnel: /https:\/\/[a-zA-Z0-9-]+\.loca\.lt/i,
          ngrok: /https:\/\/[a-zA-Z0-9-]+\.ngrok(?:-free)?\.(?:app|io)/i
        };

        const handleOutput = (data: Buffer) => {
          const text = data.toString('utf-8');
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

          for (const line of lines) {
            this.status.logs.push(line);
            if (this.status.logs.length > 50) this.status.logs.shift();

            // Match URL
            if (!this.status.publicUrl) {
              const match = line.match(urlPatterns[provider]);
              if (match) {
                const url = match[0];
                this.status.publicUrl = url;
                this.status.isActive = true;
                this.status.qrSvg = generateQrSvg(url, {
                  size: 160,
                  margin: 2,
                  darkColor: '#ffffff',
                  lightColor: 'transparent'
                });
                this.status.logs.push(`[DevShelf Tunnel] Public URL active: ${url}`);
                this.notify();

                if (!resolved) {
                  resolved = true;
                  resolve(this.getStatus());
                }
              }
            }
          }
          this.notify();
        };

        spawned.stdout?.on('data', handleOutput);
        spawned.stderr?.on('data', handleOutput);

        spawned.on('error', (err) => {
          this.status.isActive = false;
          this.status.error = `Failed to start ${provider}: ${err.message}`;
          this.status.logs.push(`[DevShelf Tunnel Error] ${err.message}`);
          this.notify();
          if (!resolved) {
            resolved = true;
            resolve(this.getStatus());
          }
        });

        spawned.on('close', (code) => {
          this.currentProcess = null;
          this.status.isActive = false;
          this.status.publicUrl = null;
          this.status.qrSvg = null;
          this.status.logs.push(`[DevShelf Tunnel] Process exited with code ${code}`);
          this.notify();
          if (!resolved) {
            resolved = true;
            resolve(this.getStatus());
          }
        });

        // 30s timeout in case no URL was captured
        setTimeout(() => {
          if (!resolved && !this.status.publicUrl) {
            resolved = true;
            this.status.error = `Tunnel initialization timed out. Check provider logs below.`;
            this.notify();
            resolve(this.getStatus());
          }
        }, 30000);
      } catch (err: any) {
        this.status.isActive = false;
        this.status.error = err.message;
        this.notify();
        resolve(this.getStatus());
      }
    });
  }

  public async stopTunnel(): Promise<void> {
    if (this.currentProcess && this.currentProcess.pid) {
      const pid = this.currentProcess.pid;
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'ignore' });
        } else {
          this.currentProcess.kill('SIGTERM');
        }
      } catch {}
      this.currentProcess = null;
    }

    this.status.isActive = false;
    this.status.publicUrl = null;
    this.status.qrSvg = null;
    this.status.logs.push('[DevShelf Tunnel] Tunnel disconnected.');
    this.notify();
  }

  private notify() {
    if (this.onStatusChange) {
      this.onStatusChange(this.getStatus());
    }
  }
}
