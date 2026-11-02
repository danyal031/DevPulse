export interface ApiRequestHeader {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface ApiRequest {
  method: HttpMethod;
  url: string;
  headers: ApiRequestHeader[];
  body?: string;
  timeoutMs?: number;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  timeMs: number;
  sizeBytes: number;
  headers: Record<string, string>;
  body: string;
  isJson: boolean;
  error?: string;
}

/**
 * Normalizes input URL. Prepends http:// if scheme is missing.
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  // Localhost or IP defaults to http://, others default to https://
  if (/^(localhost|127\.0\.0\.1)(:\d+)?/i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return `https://${trimmed}`;
}

/**
 * Formats byte size into human readable string.
 */
export function formatPayloadSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Executes an HTTP request using Node.js native fetch.
 * Runs in Extension Host to completely bypass browser CORS restrictions.
 */
export async function executeApiRequest(req: ApiRequest): Promise<ApiResponse> {
  const targetUrl = normalizeUrl(req.url);
  if (!targetUrl) {
    return {
      status: 0,
      statusText: 'Client Error',
      timeMs: 0,
      sizeBytes: 0,
      headers: {},
      body: '',
      isJson: false,
      error: 'Please enter a valid URL.'
    };
  }

  const timeoutMs = Math.max(1000, Math.min(req.timeoutMs || 30000, 120000));
  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

  // Prepare Headers
  const requestHeaders: Record<string, string> = {};
  let hasContentType = false;

  for (const h of req.headers || []) {
    if (h.enabled && h.key && h.key.trim()) {
      const k = h.key.trim();
      const v = h.value ?? '';
      requestHeaders[k] = v;
      if (k.toLowerCase() === 'content-type') {
        hasContentType = true;
      }
    }
  }

  // Handle Body
  let requestBody: string | undefined = undefined;
  const method = (req.method || 'GET').toUpperCase() as HttpMethod;
  const allowsBody = !['GET', 'HEAD'].includes(method);

  if (allowsBody && req.body && req.body.trim()) {
    requestBody = req.body.trim();
    if (!hasContentType) {
      try {
        JSON.parse(requestBody);
        requestHeaders['Content-Type'] = 'application/json';
      } catch {
        // Plain text
        requestHeaders['Content-Type'] = 'text/plain; charset=utf-8';
      }
    }
  }

  const startTime = performance.now();

  try {
    const response = await fetch(targetUrl, {
      method,
      headers: requestHeaders,
      body: requestBody,
      signal: controller.signal
    });

    const duration = Math.round(performance.now() - startTime);
    clearTimeout(timeoutTimer);

    // Collect response headers
    const resHeaders: Record<string, string> = {};
    response.headers.forEach((value, name) => {
      resHeaders[name] = value;
    });

    const rawText = await response.text();
    const sizeBytes = Buffer.byteLength(rawText, 'utf8');

    // Attempt to format JSON body if applicable
    let formattedBody = rawText;
    let isJson = false;

    const contentType = (resHeaders['content-type'] || '').toLowerCase();
    if (contentType.includes('json') || (rawText.startsWith('{') || rawText.startsWith('['))) {
      try {
        const parsed = JSON.parse(rawText);
        formattedBody = JSON.stringify(parsed, null, 2);
        isJson = true;
      } catch {
        // Keep original
      }
    }

    return {
      status: response.status,
      statusText: response.statusText || (response.ok ? 'OK' : 'Error'),
      timeMs: duration,
      sizeBytes,
      headers: resHeaders,
      body: formattedBody,
      isJson
    };
  } catch (err: any) {
    clearTimeout(timeoutTimer);
    const duration = Math.round(performance.now() - startTime);

    let errorMsg = err.message || 'Unknown network error occurred.';
    if (err.name === 'AbortError' || err.message?.includes('aborted')) {
      errorMsg = `Request timed out after ${timeoutMs} ms.`;
    } else if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
      errorMsg = 'Connection refused. Is the target server running?';
    } else if (err.code === 'ENOTFOUND' || err.message?.includes('ENOTFOUND')) {
      errorMsg = 'Host not found. Check DNS or internet connection.';
    }

    return {
      status: 0,
      statusText: 'Request Failed',
      timeMs: duration,
      sizeBytes: 0,
      headers: {},
      body: '',
      isJson: false,
      error: errorMsg
    };
  }
}
