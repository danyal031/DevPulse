import { exec } from 'child_process';
import * as os from 'os';

export interface ListeningPortInfo {
  port: number;
  pid: number;
  processName: string;
  protocol: 'TCP';
  localAddress: string;
}

export function scanListeningPorts(): Promise<ListeningPortInfo[]> {
  const platform = os.platform();

  if (platform === 'win32') {
    return scanWindowsPorts();
  } else {
    return scanUnixPorts();
  }
}

export function killProcessByPid(pid: number): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    if (pid <= 4) {
      resolve({ success: false, message: 'Cannot kill system kernel process.' });
      return;
    }

    const platform = os.platform();
    const command = platform === 'win32' ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve({
          success: false,
          message: stderr.trim() || error.message
        });
      } else {
        resolve({
          success: true,
          message: stdout.trim() || `Process ${pid} terminated.`
        });
      }
    });
  });
}

function scanWindowsPorts(): Promise<ListeningPortInfo[]> {
  return new Promise((resolve) => {
    // 1. Fetch process map (PID -> Image Name)
    exec('tasklist /FO CSV /NH', { maxBuffer: 10 * 1024 * 1024 }, (errProcesses, stdoutProcesses) => {
      const pidToName = new Map<number, string>();

      if (!errProcesses && stdoutProcesses) {
        const lines = stdoutProcesses.split(/\r?\n/);
        for (const line of lines) {
          const match = line.match(/^"([^"]+)","(\d+)"/);
          if (match) {
            const name = match[1];
            const pid = parseInt(match[2], 10);
            pidToName.set(pid, name);
          }
        }
      }

      // 2. Fetch listening TCP ports
      exec('netstat -ano -p tcp', { maxBuffer: 10 * 1024 * 1024 }, (errNetstat, stdoutNetstat) => {
        if (errNetstat || !stdoutNetstat) {
          resolve([]);
          return;
        }

        const lines = stdoutNetstat.split(/\r?\n/);
        const map = new Map<number, ListeningPortInfo>();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('TCP')) {
            continue;
          }

          const parts = trimmed.split(/\s+/);
          // Columns: [0] TCP, [1] Local Address, [2] Foreign Address, [3] State, [4] PID
          if (parts.length >= 5 && parts[3].toUpperCase() === 'LISTENING') {
            const localAddr = parts[1];
            const pid = parseInt(parts[4], 10);

            // Extract port from local address (e.g. 0.0.0.0:3000, [::]:8080, 127.0.0.1:5432)
            const lastColonIndex = localAddr.lastIndexOf(':');
            if (lastColonIndex !== -1) {
              const portStr = localAddr.slice(lastColonIndex + 1);
              const port = parseInt(portStr, 10);

              if (!isNaN(port) && !isNaN(pid) && port > 0) {
                const processName = pidToName.get(pid) ?? `PID ${pid}`;
                // Deduplicate by port number
                if (!map.has(port)) {
                  map.set(port, {
                    port,
                    pid,
                    processName,
                    protocol: 'TCP',
                    localAddress: localAddr
                  });
                }
              }
            }
          }
        }

        const sorted = Array.from(map.values()).sort((a, b) => a.port - b.port);
        resolve(sorted);
      });
    });
  });
}

function scanUnixPorts(): Promise<ListeningPortInfo[]> {
  return new Promise((resolve) => {
    // Try lsof first (standard on macOS and most Linux distros)
    exec('lsof -iTCP -sTCP:LISTEN -n -P', { maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
      if (!error && stdout) {
        const lines = stdout.split('\n');
        const map = new Map<number, ListeningPortInfo>();

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const parts = line.split(/\s+/);
          // Typical output: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
          if (parts.length >= 9) {
            const processName = parts[0];
            const pid = parseInt(parts[1], 10);
            const address = parts[8];

            const colonIndex = address.lastIndexOf(':');
            if (colonIndex !== -1) {
              const portStr = address.slice(colonIndex + 1);
              const port = parseInt(portStr, 10);

              if (!isNaN(port) && !isNaN(pid) && port > 0) {
                if (!map.has(port)) {
                  map.set(port, {
                    port,
                    pid,
                    processName,
                    protocol: 'TCP',
                    localAddress: address
                  });
                }
              }
            }
          }
        }

        resolve(Array.from(map.values()).sort((a, b) => a.port - b.port));
        return;
      }

      // Fallback for Linux ss command
      exec('ss -tulpn', { maxBuffer: 10 * 1024 * 1024 }, (ssErr, ssStdout) => {
        if (ssErr || !ssStdout) {
          resolve([]);
          return;
        }

        const lines = ssStdout.split('\n');
        const map = new Map<number, ListeningPortInfo>();

        for (const line of lines) {
          if (!line.includes('LISTEN')) continue;

          // Look for port in format e.g. 127.0.0.1:3000 or *:8080
          const portMatch = line.match(/(?:(?::|\*|\[::\]|0\.0\.0\.0):)(\d+)/);
          const pidMatch = line.match(/users:\(\("([^"]+)",pid=(\d+)/);

          if (portMatch) {
            const port = parseInt(portMatch[1], 10);
            const processName = pidMatch ? pidMatch[1] : 'unknown';
            const pid = pidMatch ? parseInt(pidMatch[2], 10) : 0;

            if (!map.has(port)) {
              map.set(port, {
                port,
                pid,
                processName,
                protocol: 'TCP',
                localAddress: portMatch[0]
              });
            }
          }
        }

        resolve(Array.from(map.values()).sort((a, b) => a.port - b.port));
      });
    });
  });
}
