import * as os from 'os';
import * as https from 'https';

export interface NetworkDetail {
  interfaceName: string;
  family: 'IPv4' | 'IPv6';
  address: string;
  netmask: string;
  mac: string;
  internal: boolean;
}

export interface SystemNetworkInfo {
  hostname: string;
  platform: string;
  primaryIpv4: string;
  interfaces: NetworkDetail[];
}

export function getSystemNetworkInfo(): SystemNetworkInfo {
  const hostname = os.hostname();
  const platform = `${os.type()} ${os.arch()}`;
  const rawInterfaces = os.networkInterfaces();

  const details: NetworkDetail[] = [];
  let primaryIpv4 = '127.0.0.1';

  for (const [name, netList] of Object.entries(rawInterfaces)) {
    if (!netList) continue;

    for (const net of netList) {
      details.push({
        interfaceName: name,
        family: net.family,
        address: net.address,
        netmask: net.netmask,
        mac: net.mac,
        internal: net.internal
      });

      // Prefer non-internal IPv4 that looks like a LAN or Wi-Fi IP
      if (!net.internal && net.family === 'IPv4') {
        if (
          primaryIpv4 === '127.0.0.1' ||
          name.toLowerCase().includes('wi-fi') ||
          name.toLowerCase().includes('wlan') ||
          name.toLowerCase().includes('ethernet') ||
          name.toLowerCase().includes('eth')
        ) {
          primaryIpv4 = net.address;
        }
      }
    }
  }

  return {
    hostname,
    platform,
    primaryIpv4,
    interfaces: details.filter((d) => !d.internal)
  };
}

export function fetchPublicIp(): Promise<string | null> {
  return new Promise((resolve) => {
    const req = https.get('https://api.ipify.org?format=json', { timeout: 2500 }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.ip || null);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}
