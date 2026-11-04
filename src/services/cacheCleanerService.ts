import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CleanableItem {
  id: string;
  name: string;
  path: string;
  category: 'workspace_deps' | 'workspace_build' | 'global_cache' | 'python_rust';
  sizeBytes: number;
  sizeFormatted: string;
  fileCount: number;
  lastModifiedMs: number;
  lastModifiedFormatted: string;
  isSafeToPurge: boolean;
}

export interface CacheScanResult {
  items: CleanableItem[];
  totalSizeBytes: number;
  totalSizeFormatted: string;
  totalFileCount: number;
  categoryTotals: {
    workspace_deps: number;
    workspace_build: number;
    global_cache: number;
    python_rust: number;
  };
}

export class CacheCleanerService {
  private static instance: CacheCleanerService;

  private constructor() {}

  public static getInstance(): CacheCleanerService {
    if (!CacheCleanerService.instance) {
      CacheCleanerService.instance = new CacheCleanerService();
    }
    return CacheCleanerService.instance;
  }

  public async scanAll(): Promise<CacheScanResult> {
    const items: CleanableItem[] = [];

    // 1. Scan Workspace Folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      for (const folder of workspaceFolders) {
        await this.scanWorkspaceDirectory(folder.uri.fsPath, items);
      }
    }

    // 2. Scan Global Package Manager Caches
    await this.scanGlobalCaches(items);

    // Compute Totals
    let totalSizeBytes = 0;
    let totalFileCount = 0;
    const categoryTotals = {
      workspace_deps: 0,
      workspace_build: 0,
      global_cache: 0,
      python_rust: 0
    };

    for (const item of items) {
      totalSizeBytes += item.sizeBytes;
      totalFileCount += item.fileCount;
      if (item.category in categoryTotals) {
        categoryTotals[item.category] += item.sizeBytes;
      }
    }

    return {
      items,
      totalSizeBytes,
      totalSizeFormatted: this.formatBytes(totalSizeBytes),
      totalFileCount,
      categoryTotals
    };
  }

  private async scanWorkspaceDirectory(rootPath: string, outItems: CleanableItem[]): Promise<void> {
    const targets = [
      { name: 'node_modules', category: 'workspace_deps' as const, safe: false },
      { name: '.next', category: 'workspace_build' as const, safe: true },
      { name: '.nuxt', category: 'workspace_build' as const, safe: true },
      { name: 'dist', category: 'workspace_build' as const, safe: true },
      { name: 'build', category: 'workspace_build' as const, safe: true },
      { name: '.turbo', category: 'workspace_build' as const, safe: true },
      { name: '__pycache__', category: 'python_rust' as const, safe: true },
      { name: '.pytest_cache', category: 'python_rust' as const, safe: true },
      { name: '.venv', category: 'python_rust' as const, safe: false },
      { name: 'venv', category: 'python_rust' as const, safe: false },
      { name: 'target', category: 'python_rust' as const, safe: true }
    ];

    // Check root
    for (const target of targets) {
      const fullPath = path.join(rootPath, target.name);
      if (fs.existsSync(fullPath)) {
        await this.inspectAndAddItem(fullPath, target.name, target.category, target.safe, outItems);
      }
    }

    // Check 1-level subdirectories (packages/*, apps/*, client, server)
    try {
      const subEntries = await fs.promises.readdir(rootPath, { withFileTypes: true });
      for (const entry of subEntries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'build') {
          const subDirPath = path.join(rootPath, entry.name);
          for (const target of targets) {
            const subFullPath = path.join(subDirPath, target.name);
            if (fs.existsSync(subFullPath)) {
              await this.inspectAndAddItem(subFullPath, `${entry.name}/${target.name}`, target.category, target.safe, outItems);
            }
          }
        }
      }
    } catch {}
  }

  private async scanGlobalCaches(outItems: CleanableItem[]): Promise<void> {
    const isWindows = process.platform === 'win32';
    const homedir = os.homedir();

    const globalCachePaths = [
      // NPM Cache
      {
        name: 'NPM Global Cache',
        path: isWindows
          ? (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'npm-cache') : path.join(homedir, 'AppData', 'Local', 'npm-cache'))
          : path.join(homedir, '.npm'),
        safe: true
      },
      // PNPM Store
      {
        name: 'PNPM Store',
        path: isWindows
          ? (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'pnpm', 'store') : path.join(homedir, 'AppData', 'Local', 'pnpm', 'store'))
          : path.join(homedir, '.local', 'share', 'pnpm', 'store'),
        safe: true
      },
      // Yarn Cache
      {
        name: 'Yarn Cache',
        path: isWindows
          ? (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Yarn', 'Cache') : path.join(homedir, 'AppData', 'Local', 'Yarn', 'Cache'))
          : path.join(homedir, '.cache', 'yarn'),
        safe: true
      },
      // Pip Cache
      {
        name: 'Pip Cache',
        path: isWindows
          ? (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'pip', 'Cache') : path.join(homedir, 'AppData', 'Local', 'pip', 'Cache'))
          : path.join(homedir, '.cache', 'pip'),
        safe: true
      }
    ];

    for (const g of globalCachePaths) {
      if (fs.existsSync(g.path)) {
        await this.inspectAndAddItem(g.path, g.name, 'global_cache', g.safe, outItems);
      }
    }
  }

  private async inspectAndAddItem(
    itemPath: string,
    displayName: string,
    category: CleanableItem['category'],
    isSafeToPurge: boolean,
    outItems: CleanableItem[]
  ): Promise<void> {
    try {
      const stats = await this.calculateDirSize(itemPath);
      if (stats.sizeBytes > 0) {
        outItems.push({
          id: `item:${itemPath}`,
          name: displayName,
          path: itemPath,
          category,
          sizeBytes: stats.sizeBytes,
          sizeFormatted: this.formatBytes(stats.sizeBytes),
          fileCount: stats.fileCount,
          lastModifiedMs: stats.lastModifiedMs,
          lastModifiedFormatted: this.formatRelativeTime(stats.lastModifiedMs),
          isSafeToPurge
        });
      }
    } catch {}
  }

  public async calculateDirSize(dirPath: string): Promise<{ sizeBytes: number; fileCount: number; lastModifiedMs: number }> {
    let sizeBytes = 0;
    let fileCount = 0;
    let lastModifiedMs = 0;

    const queue: string[] = [dirPath];

    while (queue.length > 0) {
      const current = queue.shift()!;
      try {
        const stat = await fs.promises.stat(current);
        if (stat.mtimeMs > lastModifiedMs) {
          lastModifiedMs = stat.mtimeMs;
        }

        if (stat.isDirectory()) {
          const entries = await fs.promises.readdir(current, { withFileTypes: true });
          for (const entry of entries) {
            queue.push(path.join(current, entry.name));
          }
        } else {
          sizeBytes += stat.size;
          fileCount++;
        }
      } catch {}
    }

    return { sizeBytes, fileCount, lastModifiedMs };
  }

  public async purgeItem(itemPath: string): Promise<{ success: boolean; message: string }> {
    if (!fs.existsSync(itemPath)) {
      return { success: true, message: 'Item already deleted' };
    }

    try {
      await fs.promises.rm(itemPath, { recursive: true, force: true });
      return { success: true, message: `Successfully deleted ${path.basename(itemPath)}` };
    } catch (err: any) {
      return { success: false, message: `Failed to delete: ${err.message}` };
    }
  }

  public async purgeItems(itemPaths: string[]): Promise<any> {
    const scan = await this.scanAll();
    let freedBytes = 0;

    for (const idOrPath of itemPaths) {
      const match = scan.items.find(i => i.id === idOrPath || i.path === idOrPath);
      const targetPath = match ? match.path : idOrPath;
      const res = await this.purgeItem(targetPath);
      if (res.success && match) {
        freedBytes += match.sizeBytes;
      }
    }

    return freedBytes;
  }

  public async scanJunk(): Promise<any[]> {
    const res = await this.scanAll();
    return res.items.map(item => ({
      id: item.id,
      name: item.name,
      path: item.path,
      sizeBytes: item.sizeBytes,
      sizeFormatted: item.sizeFormatted,
      category: item.category === 'workspace_deps' ? 'workspace-deps'
        : item.category === 'workspace_build' ? 'workspace-build'
        : item.category === 'global_cache' ? 'global-cache'
        : 'workspace-build',
      safe: item.isSafeToPurge,
      lastModifiedMs: item.lastModifiedMs
    }));
  }

  public formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    return `${val} ${sizes[i]}`;
  }

  private formatRelativeTime(timestampMs: number): string {
    if (!timestampMs) return 'Unknown';
    const now = Date.now();
    const diffMs = Math.max(0, now - timestampMs);
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} mo ago`;
    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears} yr ago`;
  }
}
