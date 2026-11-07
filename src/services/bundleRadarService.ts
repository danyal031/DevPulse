import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

export interface PackageAlternative {
  targetPackage: string;
  replacementPackage: string;
  estimatedSavings: string;
  reasonEn: string;
  reasonFa: string;
  oldSizeGzipKb: number;
  newSizeGzipKb: number;
}

export interface DependencyItem {
  name: string;
  version: string;
  isDev: boolean;
  localSizeBytes: number | null;
  minifiedSizeBytes: number | null;
  gzippedSizeBytes: number | null;
  status: 'pending' | 'success' | 'fallback' | 'error';
  category: 'light' | 'moderate' | 'bloated';
  alternative: PackageAlternative | null;
  description?: string;
  homepage?: string;
}

export interface BundleRadarSummary {
  totalDependencies: number;
  productionCount: number;
  devCount: number;
  totalGzipBytes: number;
  totalMinBytes: number;
  bloatedCount: number;
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun';
  topPackages: { name: string; gzipBytes: number; percent: number; color: string }[];
}

export const CURATED_ALTERNATIVES: Record<string, Omit<PackageAlternative, 'targetPackage'>> = {
  moment: {
    replacementPackage: 'dayjs',
    estimatedSavings: '~70 KB (-97%)',
    reasonEn: 'Day.js has an identical chaining API to Moment but is only ~2 KB gzipped versus Moment (~72 KB gzipped) with zero tree-shaking.',
    reasonFa: 'پکیج Day.js متدهای زنجیره‌ای کاملاً مشابه Moment دارد اما حجم آن فقط ۲ کیلوبایت است در برابر Moment که ۷۲ کیلوبایت حجم دارد و از Tree-shaking پشتیبانی نمی‌کند.',
    oldSizeGzipKb: 72,
    newSizeGzipKb: 2
  },
  lodash: {
    replacementPackage: 'radash',
    estimatedSavings: '~23 KB (-90%)',
    reasonEn: 'Radash is a modern, typed utility belt with zero dependencies and full tree-shakability, or use native ES2024 array/object methods.',
    reasonFa: 'پکیج Radash مدرن، تایپ‌شده و ماژولار است و صفر وابستگی دارد، یا می‌توانید از متدهای استاندارد جاوااسکریپت ES2024 استفاده کنید.',
    oldSizeGzipKb: 25,
    newSizeGzipKb: 2
  },
  underscore: {
    replacementPackage: 'radash',
    estimatedSavings: '~18 KB (-88%)',
    reasonEn: 'Underscore is largely superseded by modern ES6+ language features or lightweight tree-shakable utilities like Radash.',
    reasonFa: 'پکیج Underscore قدیمی شده و متدهای بومی ES6+ یا پکیج‌های سبک مثل Radash جایگزین بسیار بهتری برای آن هستند.',
    oldSizeGzipKb: 20,
    newSizeGzipKb: 2
  },
  axios: {
    replacementPackage: 'ky',
    estimatedSavings: '~10 KB (-75%)',
    reasonEn: 'Native fetch is built-in to modern browsers and Node 18+. Ky is an elegant 3 KB wrapper around fetch with retries and hooks.',
    reasonFa: 'متد fetch در نود ۱۸ و تمام مرورگرها استاندارد است. پکیج Ky یک لایه مدرن و ۳ کیلوبایتی با پشتیبانی از retry است.',
    oldSizeGzipKb: 13,
    newSizeGzipKb: 3
  },
  uuid: {
    replacementPackage: 'nanoid',
    estimatedSavings: '~3.8 KB (-95%)',
    reasonEn: 'NanoID is 130 bytes, 2x faster, and URL-friendly, or use the native crypto.randomUUID() API available in modern Node and browsers.',
    reasonFa: 'پکیج NanoID تنها ۱۳۰ بایت است و دو برابر سریع‌تر است، همچنین می‌توانید از متد بومی crypto.randomUUID() استفاده کنید.',
    oldSizeGzipKb: 4,
    newSizeGzipKb: 0.2
  },
  chalk: {
    replacementPackage: 'picocolors',
    estimatedSavings: '~6 KB (-85%)',
    reasonEn: 'Picocolors is 14x faster and 4x smaller than Chalk with zero dependencies for terminal colorization.',
    reasonFa: 'پکیج Picocolors تا ۱۴ برابر سریع‌تر و ۴ برابر سبک‌تر از Chalk است و هیچ وابستگی اضافه ندارد.',
    oldSizeGzipKb: 7,
    newSizeGzipKb: 1
  },
  faker: {
    replacementPackage: '@faker-js/faker (dynamic import) or @ngneat/falso',
    estimatedSavings: '~1.4 MB (-95%)',
    reasonEn: 'Faker bundles massive dictionary files. Use tree-shakable @ngneat/falso or load Faker lazily with dynamic import().',
    reasonFa: 'پکیج Faker دیکشنری‌های بسیار حجیمی دارد. از پکیج ماژولار Falso استفاده کنید یا آن را با dynamic import لود کنید.',
    oldSizeGzipKb: 1500,
    newSizeGzipKb: 25
  },
  '@faker-js/faker': {
    replacementPackage: '@ngneat/falso',
    estimatedSavings: '~1.4 MB (-95%)',
    reasonEn: 'Falso is modular and tree-shakable, only importing the mock generators you actually use.',
    reasonFa: 'پکیج Falso ماژولار بوده و فقط داده‌های ساختگی مورد نیاز شما را در باندل نهایی قرار می‌دهد.',
    oldSizeGzipKb: 1500,
    newSizeGzipKb: 25
  },
  validator: {
    replacementPackage: 'zod',
    estimatedSavings: '~20 KB (-70%)',
    reasonEn: 'Validator is ~30 KB gzipped; Zod provides full runtime validation and TypeScript type inference in a modular bundle.',
    reasonFa: 'پکیج Validator حدود ۳۰ کیلوبایت حجم دارد؛ Zod علاوه بر اعتبارسنجی سبک، تایپ‌های تایپ‌اسکریپت را نیز همزمان می‌سازد.',
    oldSizeGzipKb: 28,
    newSizeGzipKb: 8
  },
  request: {
    replacementPackage: 'ky',
    estimatedSavings: '~500 KB (-99%)',
    reasonEn: 'Request has been officially deprecated since 2020 and carries huge legacy dependencies. Switch to Ky or native fetch.',
    reasonFa: 'پکیج Request از سال ۲۰۲۰ رسماً منسوخ شده و وابستگی‌های بسیار حجیمی دارد. از Ky یا fetch بومی استفاده کنید.',
    oldSizeGzipKb: 500,
    newSizeGzipKb: 3
  },
  bluebird: {
    replacementPackage: 'Native Promise',
    estimatedSavings: '~65 KB (-100%)',
    reasonEn: 'Native Promises and async/await in Node.js and modern browsers are faster and run directly in V8 without any external library.',
    reasonFa: 'پرامیس‌های بومی و async/await در نود و مرورگرها مستقیماً توسط موتور V8 بهینه شده و به پکیج کمکی نیاز ندارند.',
    oldSizeGzipKb: 65,
    newSizeGzipKb: 0
  }
};

const CHART_PALETTE = ['#38bdf8', '#34d399', '#f43f5e', '#a855f7', '#fbbf24', '#94a3b8'];

export class BundleRadarService {
  private static instance: BundleRadarService;
  private sizeCache: Map<string, { minBytes: number; gzipBytes: number; timestamp: number }> = new Map();
  private persistentState?: vscode.Memento;

  private constructor() {}

  public static getInstance(): BundleRadarService {
    if (!BundleRadarService.instance) {
      BundleRadarService.instance = new BundleRadarService();
    }
    return BundleRadarService.instance;
  }

  public setPersistentState(memento: vscode.Memento) {
    this.persistentState = memento;
    // Load cached sizes from persistent storage
    const cachedData = this.persistentState.get<Record<string, { minBytes: number; gzipBytes: number; timestamp: number }>>('devshelf.bundleRadarCache');
    if (cachedData) {
      for (const [key, val] of Object.entries(cachedData)) {
        this.sizeCache.set(key, val);
      }
    }
  }

  private saveCacheToPersistentStorage() {
    if (this.persistentState) {
      const obj: Record<string, { minBytes: number; gzipBytes: number; timestamp: number }> = {};
      this.sizeCache.forEach((val, key) => {
        obj[key] = val;
      });
      this.persistentState.update('devshelf.bundleRadarCache', obj);
    }
  }

  /**
   * Detects the package manager used in the workspace
   */
  public detectPackageManager(workspaceRoot: string): 'npm' | 'pnpm' | 'yarn' | 'bun' {
    try {
      if (fs.existsSync(path.join(workspaceRoot, 'pnpm-lock.yaml'))) return 'pnpm';
      if (fs.existsSync(path.join(workspaceRoot, 'bun.lockb')) || fs.existsSync(path.join(workspaceRoot, 'bun.lock'))) return 'bun';
      if (fs.existsSync(path.join(workspaceRoot, 'yarn.lock'))) return 'yarn';
    } catch {}
    return 'npm';
  }

  /**
   * Discovers and parses dependencies from package.json in the workspace
   */
  public async scanWorkspaceDependencies(
    workspaceRoot?: string,
    includeDev: boolean = false
  ): Promise<{ items: DependencyItem[]; packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun'; workspacePath: string }> {
    let rootPath = workspaceRoot;
    if (!rootPath) {
      const folders = vscode.workspace.workspaceFolders;
      if (folders && folders.length > 0) {
        rootPath = folders[0].uri.fsPath;
      }
    }

    if (!rootPath) {
      return { items: [], packageManager: 'npm', workspacePath: '' };
    }

    const packageJsonPath = path.join(rootPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return { items: [], packageManager: 'npm', workspacePath: rootPath };
    }

    const pkgMgr = this.detectPackageManager(rootPath);
    let pkgJson: any = {};
    try {
      const content = await fs.promises.readFile(packageJsonPath, 'utf8');
      pkgJson = JSON.parse(content);
    } catch {
      return { items: [], packageManager: pkgMgr, workspacePath: rootPath };
    }

    const items: DependencyItem[] = [];
    const prodDeps: Record<string, string> = pkgJson.dependencies || {};
    const devDeps: Record<string, string> = pkgJson.devDependencies || {};

    // Process production dependencies
    for (const [name, rawVersion] of Object.entries(prodDeps)) {
      const cleanVer = this.cleanVersionString(rawVersion);
      const alt = this.findAlternative(name, pkgMgr);
      const localSize = await this.calculateLocalPackageDiskSize(rootPath, name);

      items.push({
        name,
        version: rawVersion,
        isDev: false,
        localSizeBytes: localSize,
        minifiedSizeBytes: null,
        gzippedSizeBytes: null,
        status: 'pending',
        category: 'light',
        alternative: alt,
        description: '',
        homepage: `https://www.npmjs.com/package/${name}`
      });
    }

    // Process devDependencies if requested
    if (includeDev) {
      for (const [name, rawVersion] of Object.entries(devDeps)) {
        const cleanVer = this.cleanVersionString(rawVersion);
        const alt = this.findAlternative(name, pkgMgr);
        const localSize = await this.calculateLocalPackageDiskSize(rootPath, name);

        items.push({
          name,
          version: rawVersion,
          isDev: true,
          localSizeBytes: localSize,
          minifiedSizeBytes: null,
          gzippedSizeBytes: null,
          status: 'pending',
          category: 'light',
          alternative: alt,
          description: '',
          homepage: `https://www.npmjs.com/package/${name}`
        });
      }
    }

    return { items, packageManager: pkgMgr, workspacePath: rootPath };
  }

  /**
   * Clean version string from npm prefixes like ^, ~, >=, etc.
   */
  public cleanVersionString(version: string): string {
    return version.replace(/^[\^~>=<v\s]+/, '').split(' ')[0] || '';
  }

  /**
   * Find matching lightweight alternative if exists in knowledge base
   */
  public findAlternative(packageName: string, pkgManager: 'npm' | 'pnpm' | 'yarn' | 'bun'): PackageAlternative | null {
    const lowerName = packageName.toLowerCase();
    const entry = CURATED_ALTERNATIVES[lowerName];
    if (!entry) return null;

    return {
      targetPackage: packageName,
      replacementPackage: entry.replacementPackage,
      estimatedSavings: entry.estimatedSavings,
      reasonEn: entry.reasonEn,
      reasonFa: entry.reasonFa,
      oldSizeGzipKb: entry.oldSizeGzipKb,
      newSizeGzipKb: entry.newSizeGzipKb
    };
  }

  /**
   * Computes the exact shell command to install the replacement and remove the old dependency
   */
  public generateMigrationCommand(
    pkgManager: 'npm' | 'pnpm' | 'yarn' | 'bun',
    oldPkg: string,
    newPkg: string
  ): string {
    // If the replacement suggests a dynamic import or native feature, don't create an install command for that
    const cleanNewPkg = newPkg.split(' ')[0];
    const lowerNew = newPkg.toLowerCase();
    const isSpecial = lowerNew.includes('native') || lowerNew.includes('dynamic');

    switch (pkgManager) {
      case 'pnpm':
        return isSpecial
          ? `pnpm remove ${oldPkg}`
          : `pnpm remove ${oldPkg} && pnpm add ${cleanNewPkg}`;
      case 'yarn':
        return isSpecial
          ? `yarn remove ${oldPkg}`
          : `yarn remove ${oldPkg} && yarn add ${cleanNewPkg}`;
      case 'bun':
        return isSpecial
          ? `bun remove ${oldPkg}`
          : `bun remove ${oldPkg} && bun add ${cleanNewPkg}`;
      case 'npm':
      default:
        return isSpecial
          ? `npm uninstall ${oldPkg}`
          : `npm uninstall ${oldPkg} && npm install ${cleanNewPkg}`;
    }
  }

  /**
   * Computes local package size from node_modules if present
   */
  public async calculateLocalPackageDiskSize(workspaceRoot: string, packageName: string): Promise<number | null> {
    try {
      const pkgPath = path.join(workspaceRoot, 'node_modules', packageName);
      if (!fs.existsSync(pkgPath)) {
        return null;
      }
      return await this.fastFolderSize(pkgPath, 4);
    } catch {
      return null;
    }
  }

  private async fastFolderSize(dirPath: string, maxDepth: number = 4): Promise<number> {
    if (maxDepth <= 0) return 0;
    let total = 0;
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        // Skip hidden files, tests, and deep nested node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '__tests__') {
          continue;
        }
        const full = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          total += await this.fastFolderSize(full, maxDepth - 1);
        } else if (entry.isFile()) {
          const st = await fs.promises.stat(full);
          total += st.size;
        }
      }
    } catch {}
    return total;
  }

  /**
   * Resolves remote bundle impact (minified & gzipped size) with caching & local fallback
   */
  public async resolvePackageSize(
    name: string,
    rawVersion: string,
    localDiskSize: number | null = null
  ): Promise<{ minBytes: number; gzipBytes: number; status: 'success' | 'fallback' | 'error' }> {
    const cleanVer = this.cleanVersionString(rawVersion);
    const cacheKey = `${name}@${cleanVer || 'latest'}`;

    // 1. Check in-memory / persistent cache
    if (this.sizeCache.has(cacheKey)) {
      const cached = this.sizeCache.get(cacheKey)!;
      return {
        minBytes: cached.minBytes,
        gzipBytes: cached.gzipBytes,
        status: 'success'
      };
    }

    // 2. Query Bundlephobia API
    try {
      const queryPkg = cleanVer ? `${name}@${cleanVer}` : name;
      const url = `https://bundlephobia.com/api/size?package=${encodeURIComponent(queryPkg)}`;

      const data = await this.fetchJsonWithTimeout(url, 3800);
      if (data && typeof data.gzip === 'number' && typeof data.size === 'number') {
        const result = {
          minBytes: data.size,
          gzipBytes: data.gzip
        };
        this.sizeCache.set(cacheKey, { ...result, timestamp: Date.now() });
        this.saveCacheToPersistentStorage();
        return { ...result, status: 'success' };
      }
    } catch {
      // Bundlephobia failed, try Bundlejs fallback
    }

    // 3. Query Bundlejs API Fallback
    try {
      const queryPkg = cleanVer ? `${name}@${cleanVer}` : name;
      const bundlejsUrl = `https://deno.bundlejs.com/?q=${encodeURIComponent(queryPkg)}&config={%22esbuild%22:{%22minify%22:true}}`;
      const data = await this.fetchJsonWithTimeout(bundlejsUrl, 3500);
      if (data && data.size) {
        const rawSize = data.size.raw || 0;
        const gzipSize = data.size.gzip || Math.round(rawSize * 0.32);
        const result = {
          minBytes: rawSize,
          gzipBytes: gzipSize
        };
        this.sizeCache.set(cacheKey, { ...result, timestamp: Date.now() });
        this.saveCacheToPersistentStorage();
        return { ...result, status: 'success' };
      }
    } catch {}

    // 4. Offline / Local Fallback Estimation
    if (localDiskSize !== null && localDiskSize > 0) {
      // Estimate bundle impact based on local node_modules dist footprint (usually ~25-35% of JS files are gzipped code)
      const estimatedMin = Math.round(localDiskSize * 0.45);
      const estimatedGzip = Math.round(estimatedMin * 0.30);
      return {
        minBytes: Math.max(500, estimatedMin),
        gzipBytes: Math.max(200, estimatedGzip),
        status: 'fallback'
      };
    }

    // Default heuristic fallback for known popular packages
    const lower = name.toLowerCase();
    if (CURATED_ALTERNATIVES[lower]) {
      const known = CURATED_ALTERNATIVES[lower];
      return {
        minBytes: known.oldSizeGzipKb * 3 * 1024,
        gzipBytes: known.oldSizeGzipKb * 1024,
        status: 'fallback'
      };
    }

    return {
      minBytes: 25 * 1024,
      gzipBytes: 8 * 1024,
      status: 'fallback'
    };
  }

  private fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = https.get(
        url,
        {
          headers: {
            'User-Agent': 'DevShelf-BundleRadar/1.7.0 (VSCode-Extension)',
            'Accept': 'application/json'
          },
          timeout: timeoutMs
        },
        (res) => {
          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            res.resume();
            return reject(new Error(`HTTP Status ${res.statusCode}`));
          }
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(e);
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('TIMEOUT'));
      });

      req.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Computes high-level bundle metrics and percentage breakdown for donut chart
   */
  public computeSummary(
    items: DependencyItem[],
    pkgManager: 'npm' | 'pnpm' | 'yarn' | 'bun'
  ): BundleRadarSummary {
    let totalGzipBytes = 0;
    let totalMinBytes = 0;
    let bloatedCount = 0;
    let prodCount = 0;
    let devCount = 0;

    for (const item of items) {
      if (item.isDev) devCount++;
      else prodCount++;

      const gzip = item.gzippedSizeBytes || 0;
      const min = item.minifiedSizeBytes || 0;
      totalGzipBytes += gzip;
      totalMinBytes += min;

      if (item.category === 'bloated') {
        bloatedCount++;
      }
    }

    // Top 5 heaviest packages
    const sorted = [...items]
      .filter((i) => (i.gzippedSizeBytes || 0) > 0)
      .sort((a, b) => (b.gzippedSizeBytes || 0) - (a.gzippedSizeBytes || 0));

    const top5 = sorted.slice(0, 5);
    const topPackages = top5.map((pkg, idx) => {
      const gzip = pkg.gzippedSizeBytes || 0;
      const percent = totalGzipBytes > 0 ? parseFloat(((gzip / totalGzipBytes) * 100).toFixed(1)) : 0;
      return {
        name: pkg.name,
        gzipBytes: gzip,
        percent,
        color: CHART_PALETTE[idx % CHART_PALETTE.length]
      };
    });

    return {
      totalDependencies: items.length,
      productionCount: prodCount,
      devCount,
      totalGzipBytes,
      totalMinBytes,
      bloatedCount,
      packageManager: pkgManager,
      topPackages
    };
  }

  /**
   * Formats raw bytes to human-readable string (B, KB, MB)
   */
  public formatBytes(bytes: number | null): string {
    if (bytes === null || bytes === undefined || isNaN(bytes)) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Categorizes package by Gzip weight
   */
  public categorizeWeight(gzipBytes: number): 'light' | 'moderate' | 'bloated' {
    const kb = gzipBytes / 1024;
    if (kb < 20) return 'light';
    if (kb <= 70) return 'moderate';
    return 'bloated';
  }
}
