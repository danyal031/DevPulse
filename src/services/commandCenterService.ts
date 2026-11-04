import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ProjectScript {
  id: string;
  name: string;
  command: string;
  manager: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'make' | 'docker' | 'cargo' | 'python' | 'custom';
  sourceFile: string;
  cwd: string;
  isRunning: boolean;
  startTime?: number;
}

export class CommandCenterService {
  private static instance: CommandCenterService;
  private activeTerminals: Map<string, { terminal: vscode.Terminal; startTime: number }> = new Map();
  private onStatusChangeCallback?: (scriptId: string, isRunning: boolean, startTime?: number) => void;

  private constructor() {
    vscode.window.onDidCloseTerminal((closedTerminal) => {
      for (const [id, record] of this.activeTerminals.entries()) {
        if (record.terminal === closedTerminal) {
          this.activeTerminals.delete(id);
          if (this.onStatusChangeCallback) {
            this.onStatusChangeCallback(id, false);
          }
          break;
        }
      }
    });
  }

  public static getInstance(): CommandCenterService {
    if (!CommandCenterService.instance) {
      CommandCenterService.instance = new CommandCenterService();
    }
    return CommandCenterService.instance;
  }

  public setStatusChangeCallback(cb: (scriptId: string, isRunning: boolean, startTime?: number) => void) {
    this.onStatusChangeCallback = cb;
  }

  public setTaskStatusCallback(cb: (taskId: string, isRunning: boolean, startTime?: number) => void) {
    this.setStatusChangeCallback(cb);
  }

  public async scanTasks(): Promise<any[]> {
    const scripts = await this.scanWorkspaceScripts();
    return scripts.map(s => {
      let src: 'package.json' | 'makefile' | 'docker-compose' | 'cargo' | 'python' = 'package.json';
      if (s.manager === 'make') src = 'makefile';
      else if (s.manager === 'docker') src = 'docker-compose';
      else if (s.manager === 'cargo') src = 'cargo';
      else if (s.manager === 'python') src = 'python';

      return {
        id: s.id,
        name: s.name,
        command: s.command,
        source: src,
        packageManager: s.manager,
        isRunning: this.isScriptRunning(s.id),
        startTime: this.activeTerminals.get(s.id)?.startTime
      };
    });
  }

  public async runTask(taskId: string): Promise<void> {
    const scripts = await this.scanWorkspaceScripts();
    const target = scripts.find(s => s.id === taskId);
    if (target) {
      this.runScript(target);
    }
  }

  public stopTask(taskId: string): void {
    this.stopScript(taskId);
  }

  public async restartTask(taskId: string): Promise<void> {
    const scripts = await this.scanWorkspaceScripts();
    const target = scripts.find(s => s.id === taskId);
    if (target) {
      this.restartScript(target);
    }
  }

  public openTerminal(taskId: string): void {
    this.showTerminal(taskId);
  }

  public isTaskRunning(taskId: string): boolean {
    return this.isScriptRunning(taskId);
  }

  public stopAllTasks(): void {
    this.disposeAll();
  }

  public async scanWorkspaceScripts(): Promise<ProjectScript[]> {
    const scripts: ProjectScript[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return scripts;
    }

    for (const folder of workspaceFolders) {
      const rootPath = folder.uri.fsPath;
      await this.scanDirectory(rootPath, scripts, true);

      // Also scan immediate 1-level subdirectories for monorepo packages/apps
      try {
        const entries = await fs.promises.readdir(rootPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'build') {
            const subDirPath = path.join(rootPath, entry.name);
            await this.scanDirectory(subDirPath, scripts, false);
          }
        }
      } catch {}
    }

    return scripts;
  }

  private async scanDirectory(dirPath: string, outScripts: ProjectScript[], isRoot: boolean): Promise<void> {
    const dirName = path.basename(dirPath);

    // 1. Detect Node.js package.json
    const pkgJsonPath = path.join(dirPath, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const raw = await fs.promises.readFile(pkgJsonPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.scripts && typeof parsed.scripts === 'object') {
          const manager = this.detectPackageManager(dirPath);
          const relativeSource = isRoot ? 'package.json' : `${dirName}/package.json`;

          for (const [name, cmd] of Object.entries(parsed.scripts)) {
            if (typeof cmd === 'string') {
              const fullCommand = this.buildRunnerCommand(manager, name);
              const scriptId = `pkg:${dirPath}:${name}`;
              const isRunning = this.activeTerminals.has(scriptId);
              outScripts.push({
                id: scriptId,
                name: isRoot ? name : `${dirName}:${name}`,
                command: fullCommand,
                manager,
                sourceFile: relativeSource,
                cwd: dirPath,
                isRunning,
                startTime: isRunning ? this.activeTerminals.get(scriptId)?.startTime : undefined
              });
            }
          }
        }
      } catch {}
    }

    // 2. Detect Makefile
    const makefilePath = path.join(dirPath, 'Makefile');
    if (fs.existsSync(makefilePath)) {
      try {
        const content = await fs.promises.readFile(makefilePath, 'utf8');
        const lines = content.split('\n');
        const targets: string[] = [];

        for (const line of lines) {
          const match = line.match(/^([a-zA-Z0-9_\-\.]+)\s*:/);
          if (match && !match[1].startsWith('.') && match[1] !== 'Makefile') {
            targets.push(match[1]);
          }
        }

        const relativeSource = isRoot ? 'Makefile' : `${dirName}/Makefile`;
        for (const target of targets) {
          const scriptId = `make:${dirPath}:${target}`;
          const isRunning = this.activeTerminals.has(scriptId);
          outScripts.push({
            id: scriptId,
            name: isRoot ? `make ${target}` : `${dirName}: make ${target}`,
            command: `make ${target}`,
            manager: 'make',
            sourceFile: relativeSource,
            cwd: dirPath,
            isRunning,
            startTime: isRunning ? this.activeTerminals.get(scriptId)?.startTime : undefined
          });
        }
      } catch {}
    }

    // 3. Detect Docker Compose
    const composeFiles = ['docker-compose.yml', 'compose.yaml', 'docker-compose.yaml'];
    for (const cf of composeFiles) {
      const composePath = path.join(dirPath, cf);
      if (fs.existsSync(composePath)) {
        const relativeSource = isRoot ? cf : `${dirName}/${cf}`;
        const composeActions = [
          { name: 'compose up', cmd: 'docker compose up -d' },
          { name: 'compose down', cmd: 'docker compose down' },
          { name: 'compose logs', cmd: 'docker compose logs -f' }
        ];

        for (const act of composeActions) {
          const scriptId = `docker:${dirPath}:${act.name}`;
          const isRunning = this.activeTerminals.has(scriptId);
          outScripts.push({
            id: scriptId,
            name: isRoot ? act.name : `${dirName}: ${act.name}`,
            command: act.cmd,
            manager: 'docker',
            sourceFile: relativeSource,
            cwd: dirPath,
            isRunning,
            startTime: isRunning ? this.activeTerminals.get(scriptId)?.startTime : undefined
          });
        }
        break;
      }
    }

    // 4. Detect Rust Cargo.toml
    const cargoPath = path.join(dirPath, 'Cargo.toml');
    if (fs.existsSync(cargoPath)) {
      const relativeSource = isRoot ? 'Cargo.toml' : `${dirName}/Cargo.toml`;
      const cargoActions = [
        { name: 'cargo check', cmd: 'cargo check' },
        { name: 'cargo build', cmd: 'cargo build' },
        { name: 'cargo run', cmd: 'cargo run' },
        { name: 'cargo test', cmd: 'cargo test' }
      ];

      for (const act of cargoActions) {
        const scriptId = `cargo:${dirPath}:${act.name}`;
        const isRunning = this.activeTerminals.has(scriptId);
        outScripts.push({
          id: scriptId,
          name: isRoot ? act.name : `${dirName}: ${act.name}`,
          command: act.cmd,
          manager: 'cargo',
          sourceFile: relativeSource,
          cwd: dirPath,
          isRunning,
          startTime: isRunning ? this.activeTerminals.get(scriptId)?.startTime : undefined
        });
      }
    }

    // 5. Detect Python pyproject.toml / requirements.txt
    const pyprojectPath = path.join(dirPath, 'pyproject.toml');
    const reqsPath = path.join(dirPath, 'requirements.txt');
    if (fs.existsSync(pyprojectPath) || fs.existsSync(reqsPath)) {
      const relativeSource = fs.existsSync(pyprojectPath)
        ? (isRoot ? 'pyproject.toml' : `${dirName}/pyproject.toml`)
        : (isRoot ? 'requirements.txt' : `${dirName}/requirements.txt`);

      const pyActions = [
        { name: 'pytest', cmd: 'pytest' },
        { name: 'pip install', cmd: 'pip install -r requirements.txt' }
      ];

      for (const act of pyActions) {
        const scriptId = `py:${dirPath}:${act.name}`;
        const isRunning = this.activeTerminals.has(scriptId);
        outScripts.push({
          id: scriptId,
          name: isRoot ? act.name : `${dirName}: ${act.name}`,
          command: act.cmd,
          manager: 'python',
          sourceFile: relativeSource,
          cwd: dirPath,
          isRunning,
          startTime: isRunning ? this.activeTerminals.get(scriptId)?.startTime : undefined
        });
      }
    }
  }

  private detectPackageManager(dirPath: string): 'npm' | 'pnpm' | 'yarn' | 'bun' {
    if (fs.existsSync(path.join(dirPath, 'bun.lockb')) || fs.existsSync(path.join(dirPath, 'bun.lock'))) {
      return 'bun';
    }
    if (fs.existsSync(path.join(dirPath, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (fs.existsSync(path.join(dirPath, 'yarn.lock'))) {
      return 'yarn';
    }
    return 'npm';
  }

  private buildRunnerCommand(manager: 'npm' | 'pnpm' | 'yarn' | 'bun', scriptName: string): string {
    switch (manager) {
      case 'pnpm':
        return `pnpm run ${scriptName}`;
      case 'yarn':
        return `yarn ${scriptName}`;
      case 'bun':
        return `bun run ${scriptName}`;
      case 'npm':
      default:
        return `npm run ${scriptName}`;
    }
  }

  public runScript(script: ProjectScript): void {
    // If already running, focus existing terminal
    if (this.activeTerminals.has(script.id)) {
      const record = this.activeTerminals.get(script.id)!;
      record.terminal.show();
      return;
    }

    const terminalName = `DevShelf: ${script.name}`;
    const terminal = vscode.window.createTerminal({
      name: terminalName,
      cwd: script.cwd
    });

    const startTime = Date.now();
    this.activeTerminals.set(script.id, { terminal, startTime });

    terminal.show();
    terminal.sendText(script.command);

    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(script.id, true, startTime);
    }
  }

  public stopScript(scriptId: string): void {
    const record = this.activeTerminals.get(scriptId);
    if (record) {
      record.terminal.dispose();
      this.activeTerminals.delete(scriptId);
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback(scriptId, false);
      }
    }
  }

  public restartScript(script: ProjectScript): void {
    this.stopScript(script.id);
    setTimeout(() => {
      this.runScript(script);
    }, 500);
  }

  public showTerminal(scriptId: string): void {
    const record = this.activeTerminals.get(scriptId);
    if (record) {
      record.terminal.show();
    }
  }

  public isScriptRunning(scriptId: string): boolean {
    return this.activeTerminals.has(scriptId);
  }

  public disposeAll(): void {
    for (const record of this.activeTerminals.values()) {
      try {
        record.terminal.dispose();
      } catch {}
    }
    this.activeTerminals.clear();
  }
}
