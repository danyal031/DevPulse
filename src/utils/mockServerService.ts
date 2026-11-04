import * as http from 'http';
import * as crypto from 'crypto';
import { URL } from 'url';

export interface MockRoute {
  id: string;
  method: 'ANY' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  statusCode: number;
  delayMs: number;
  contentType: string;
  responseBody: string;
  enabled: boolean;
}

export interface CapturedRequest {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string;
  isJson: boolean;
  clientIp: string;
  matchedRouteId?: string;
  responseStatus: number;
  delayMs: number;
}

export interface MockServerStatus {
  isRunning: boolean;
  port: number;
  requestCount: number;
  activeRoutesCount: number;
  lastError?: string;
}

export class MockServerService {
  private static instance: MockServerService;
  private server: http.Server | null = null;
  private currentPort: number = 4040;
  private isRunning: boolean = false;
  private routes: MockRoute[] = [];
  private capturedRequests: CapturedRequest[] = [];
  private maxCapturedRequests: number = 100;
  private onRequestCaptured?: (req: CapturedRequest) => void;
  private onStatusChange?: (status: MockServerStatus) => void;

  private constructor() {
    this.initDefaultRoutes();
  }

  public static getInstance(): MockServerService {
    if (!MockServerService.instance) {
      MockServerService.instance = new MockServerService();
    }
    return MockServerService.instance;
  }

  private initDefaultRoutes() {
    this.routes = [
      {
        id: 'default-webhook',
        method: 'POST',
        path: '/api/webhook',
        statusCode: 200,
        delayMs: 150,
        contentType: 'application/json',
        responseBody: JSON.stringify({ success: true, message: 'Webhook received and processed successfully', timestamp: 0 }, null, 2),
        enabled: true
      },
      {
        id: 'default-users',
        method: 'GET',
        path: '/api/users',
        statusCode: 200,
        delayMs: 300,
        contentType: 'application/json',
        responseBody: JSON.stringify([
          { id: 1, name: 'Danial', role: 'Staff Engineer', active: true },
          { id: 2, name: 'Sara', role: 'Frontend Lead', active: true },
          { id: 3, name: 'Ali', role: 'DevOps Architect', active: false }
        ], null, 2),
        enabled: true
      }
    ];
  }

  public setCallbacks(
    onCaptured: (req: CapturedRequest) => void,
    onStatusChange: (status: MockServerStatus) => void
  ) {
    this.onRequestCaptured = onCaptured;
    this.onStatusChange = onStatusChange;
  }

  public getStatus(): MockServerStatus {
    return {
      isRunning: this.isRunning,
      port: this.currentPort,
      requestCount: this.capturedRequests.length,
      activeRoutesCount: this.routes.filter((r) => r.enabled).length
    };
  }

  public getRoutes(): MockRoute[] {
    return [...this.routes];
  }

  public setRoutes(routes: MockRoute[]) {
    this.routes = routes;
    this.notifyStatusChange();
  }

  public addRoute(route: MockRoute) {
    this.routes.push(route);
    this.notifyStatusChange();
  }

  public updateRoute(updated: MockRoute) {
    const idx = this.routes.findIndex((r) => r.id === updated.id);
    if (idx !== -1) {
      this.routes[idx] = updated;
      this.notifyStatusChange();
    }
  }

  public deleteRoute(id: string) {
    this.routes = this.routes.filter((r) => r.id !== id);
    this.notifyStatusChange();
  }

  public getCapturedRequests(): CapturedRequest[] {
    return [...this.capturedRequests];
  }

  public clearCapturedRequests() {
    this.capturedRequests = [];
    this.notifyStatusChange();
  }

  public async startServer(port: number): Promise<{ success: boolean; port: number; error?: string }> {
    if (this.isRunning) {
      if (this.currentPort === port) {
        return { success: true, port: this.currentPort };
      }
      await this.stopServer();
    }

    this.currentPort = port;

    return new Promise((resolve) => {
      try {
        const srv = http.createServer((req, res) => {
          this.handleIncomingRequest(req, res);
        });

        srv.on('error', (err: any) => {
          this.isRunning = false;
          this.server = null;
          const errMsg = err.code === 'EADDRINUSE' ? `Port :${port} is already in use by another process.` : err.message;
          this.notifyStatusChange(errMsg);
          resolve({ success: false, port, error: errMsg });
        });

        srv.listen(port, () => {
          this.server = srv;
          this.isRunning = true;
          this.notifyStatusChange();
          resolve({ success: true, port });
        });
      } catch (err: any) {
        this.isRunning = false;
        this.server = null;
        resolve({ success: false, port, error: err.message });
      }
    });
  }

  public async stopServer(): Promise<{ success: boolean; error?: string }> {
    if (!this.server || !this.isRunning) {
      this.isRunning = false;
      this.server = null;
      this.notifyStatusChange();
      return { success: true };
    }

    return new Promise((resolve) => {
      this.server!.close((err) => {
        this.server = null;
        this.isRunning = false;
        this.notifyStatusChange();
        if (err) {
          resolve({ success: false, error: err.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  private async handleIncomingRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const startTimestamp = Date.now();
    const parsedUrl = new URL(req.url || '/', `http://localhost:${this.currentPort}`);
    const pathname = parsedUrl.pathname;
    const method = (req.method || 'GET').toUpperCase();

    // Universal CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');

    // Handle OPTIONS Preflight
    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Read body
    const bodyChunks: Buffer[] = [];
    req.on('data', (chunk) => {
      if (bodyChunks.reduce((acc, c) => acc + c.length, 0) < 5 * 1024 * 1024) {
        bodyChunks.push(chunk);
      }
    });

    req.on('end', async () => {
      const rawBody = Buffer.concat(bodyChunks).toString('utf-8');
      let isJson = false;
      try {
        if (rawBody.trim().startsWith('{') || rawBody.trim().startsWith('[')) {
          JSON.parse(rawBody);
          isJson = true;
        }
      } catch {}

      // Match Route
      const matched = this.matchRoute(method, pathname);
      const delayMs = matched ? matched.delayMs : 0;
      const statusCode = matched ? matched.statusCode : 200;
      const contentType = matched ? matched.contentType : 'application/json';

      let responsePayload = '';
      if (matched) {
        responsePayload = matched.responseBody;
        if (matched.contentType.includes('json') && responsePayload.includes('"timestamp": 0')) {
          responsePayload = responsePayload.replace('"timestamp": 0', `"timestamp": ${Date.now()}`);
        }
      } else {
        responsePayload = JSON.stringify({
          status: 'ok',
          message: 'Captured by DevShelf Mock Server (No specific route matched)',
          path: pathname,
          method: method,
          timestamp: new Date().toISOString()
        }, null, 2);
      }

      // Record captured request
      const queryParams: Record<string, string> = {};
      parsedUrl.searchParams.forEach((val, key) => {
        queryParams[key] = val;
      });

      const headerMap: Record<string, string> = {};
      for (const [key, val] of Object.entries(req.headers)) {
        if (val) {
          headerMap[key] = Array.isArray(val) ? val.join(', ') : val;
        }
      }

      const clientIp = req.socket.remoteAddress || '127.0.0.1';

      const captured: CapturedRequest = {
        id: crypto.randomUUID(),
        timestamp: startTimestamp,
        method,
        url: req.url || '/',
        path: pathname,
        query: queryParams,
        headers: headerMap,
        body: rawBody,
        isJson,
        clientIp,
        matchedRouteId: matched ? matched.id : undefined,
        responseStatus: statusCode,
        delayMs
      };

      this.capturedRequests.unshift(captured);
      if (this.capturedRequests.length > this.maxCapturedRequests) {
        this.capturedRequests.pop();
      }

      if (this.onRequestCaptured) {
        this.onRequestCaptured(captured);
      }

      // Delay response if configured
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      res.writeHead(statusCode, {
        'Content-Type': contentType,
        'X-Powered-By': 'DevShelf-Mock-Server'
      });
      res.end(responsePayload);
    });
  }

  private matchRoute(method: string, path: string): MockRoute | undefined {
    const cleanPath = path.toLowerCase().replace(/\/$/, '') || '/';

    return this.routes.find((r) => {
      if (!r.enabled) return false;

      // Method match
      const methodMatches = r.method === 'ANY' || r.method.toUpperCase() === method;
      if (!methodMatches) return false;

      // Path match (exact or wildcard *)
      const routePath = r.path.toLowerCase().replace(/\/$/, '') || '/';
      if (routePath === cleanPath || routePath === '*') return true;

      if (routePath.endsWith('/*')) {
        const prefix = routePath.slice(0, -2);
        return cleanPath.startsWith(prefix);
      }

      return false;
    });
  }

  private notifyStatusChange(lastError?: string) {
    if (this.onStatusChange) {
      const status = this.getStatus();
      if (lastError) status.lastError = lastError;
      this.onStatusChange(status);
    }
  }
}
