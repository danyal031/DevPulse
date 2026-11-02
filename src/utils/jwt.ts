export interface DecodedJwt {
  raw: string;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  isValidStructure: boolean;
  isExpired: boolean;
  isNotYetValid: boolean;
  expiresInSeconds: number | null;
  issuedAt: Date | null;
  expiresAt: Date | null;
  notBefore: Date | null;
  headerFormatted: string;
  payloadFormatted: string;
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }

  // Cross-environment UTF-8 decode
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } else {
    return Buffer.from(base64, 'base64').toString('utf-8');
  }
}

export function parseJwt(token: string): DecodedJwt {
  const trimmed = token.trim();
  const parts = trimmed.split('.');

  if (parts.length !== 3) {
    throw new Error('Invalid JWT format: Token must have exactly three dot-separated segments.');
  }

  const [rawHeader, rawPayload, signature] = parts;

  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;

  try {
    const decodedHeader = base64UrlDecode(rawHeader);
    header = JSON.parse(decodedHeader);
  } catch (err) {
    throw new Error('Failed to decode JWT Header: Invalid Base64Url or JSON syntax.');
  }

  try {
    const decodedPayload = base64UrlDecode(rawPayload);
    payload = JSON.parse(decodedPayload);
  } catch (err) {
    throw new Error('Failed to decode JWT Payload: Invalid Base64Url or JSON syntax.');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const exp = typeof payload.exp === 'number' ? payload.exp : null;
  const nbf = typeof payload.nbf === 'number' ? payload.nbf : null;
  const iat = typeof payload.iat === 'number' ? payload.iat : null;

  const isExpired = exp !== null && nowSec >= exp;
  const isNotYetValid = nbf !== null && nowSec < nbf;
  const expiresInSeconds = exp !== null ? exp - nowSec : null;

  return {
    raw: trimmed,
    header,
    payload,
    signature,
    isValidStructure: true,
    isExpired,
    isNotYetValid,
    expiresInSeconds,
    issuedAt: iat !== null ? new Date(iat * 1000) : null,
    expiresAt: exp !== null ? new Date(exp * 1000) : null,
    notBefore: nbf !== null ? new Date(nbf * 1000) : null,
    headerFormatted: JSON.stringify(header, null, 2),
    payloadFormatted: JSON.stringify(payload, null, 2)
  };
}

export function formatTimeSpan(seconds: number, isPersian = false): string {
  const abs = Math.abs(seconds);
  const days = Math.floor(abs / 86400);
  const hours = Math.floor((abs % 86400) / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  const remainingSec = abs % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(isPersian ? `${days} روز` : `${days}d`);
  if (hours > 0) parts.push(isPersian ? `${hours} ساعت` : `${hours}h`);
  if (minutes > 0) parts.push(isPersian ? `${minutes} دقیقه` : `${minutes}m`);
  if (parts.length === 0 || remainingSec > 0) {
    parts.push(isPersian ? `${remainingSec} ثانیه` : `${remainingSec}s`);
  }

  const durationStr = parts.slice(0, 2).join(' ');

  if (seconds >= 0) {
    return isPersian ? `${durationStr} مانده` : `in ${durationStr}`;
  } else {
    return isPersian ? `${durationStr} پیش` : `${durationStr} ago`;
  }
}
