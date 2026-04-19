import * as pty from 'node-pty';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

import { CLAUDE_PROJECTS_DIR } from '../shared/constants.js';
import { randomUUID } from 'crypto';
import log from 'electron-log';

export interface ProcessInfo {
  id: number;
  sessionId: string;
  pty: pty.IPty;
  projectDir: string;
  workspaceDir: string;
  jsonlFile: string;
  folderName?: string;
  agentName?: string;
  restoreUid?: string;
  output: string;
}

function quoteShellArg(value: string): string {
  if (/^[A-Za-z0-9_./:-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export class ProcessManager {
  private processes: Map<number, ProcessInfo> = new Map();
  private nextId = 1;
  private onProcessStart?: (processInfo: ProcessInfo) => void;
  private onJsonlReady?: (processInfo: ProcessInfo) => void;
  private onProcessExit?: (processId: number) => void;
  private onProcessOutput?: (processId: number, data: string) => void;

  private async trustWorkspace(workspacePath: string): Promise<void> {
    const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
    let settings: { trustedWorkspacePaths?: string[] } = {};

    try {
      if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      }
    } catch {
      // Ignore parse errors
    }

    if (!settings.trustedWorkspacePaths) {
      settings.trustedWorkspacePaths = [];
    }

    if (!settings.trustedWorkspacePaths.includes(workspacePath)) {
      settings.trustedWorkspacePaths.push(workspacePath);
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      log.info(`[ProcessManager] Trusted workspace: ${workspacePath}`);
    }
  }

  setCallbacks(
    onProcessStart: (processInfo: ProcessInfo) => void,
    onJsonlReady: (processInfo: ProcessInfo) => void,
    onProcessExit: (processId: number) => void,
    onProcessOutput?: (processId: number, data: string) => void,
  ) {
    this.onProcessStart = onProcessStart;
    this.onJsonlReady = onJsonlReady;
    this.onProcessExit = onProcessExit;
    this.onProcessOutput = onProcessOutput;
  }

  private getProjectDir(cwd?: string): string {
    const workspacePath = cwd || os.homedir();
    const dirName = workspacePath.replace(/[^a-zA-Z0-9-]/g, '-');
    const projectDir = path.join(os.homedir(), CLAUDE_PROJECTS_DIR, dirName);

    if (!fs.existsSync(projectDir)) {
      const projectsRoot = path.join(os.homedir(), CLAUDE_PROJECTS_DIR);
      try {
        if (fs.existsSync(projectsRoot)) {
          const candidates = fs.readdirSync(projectsRoot);
          const lowerDirName = dirName.toLowerCase();
          const match = candidates.find((candidate) => candidate.toLowerCase() === lowerDirName);
          if (match) {
            return path.join(projectsRoot, match);
          }
        }
      } catch {
        // Ignore scan errors
      }
    }

    return projectDir;
  }

  private findJsonlFile(sessionId: string): string | null {
    const projectsRoot = path.join(os.homedir(), CLAUDE_PROJECTS_DIR);
    try {
      if (!fs.existsSync(projectsRoot)) {
        return null;
      }

      for (const entry of fs.readdirSync(projectsRoot)) {
        const candidateDir = path.join(projectsRoot, entry);
        let stat: fs.Stats;
        try {
          stat = fs.statSync(candidateDir);
        } catch {
          continue;
        }
        if (!stat.isDirectory()) {
          continue;
        }

        const candidateFile = path.join(candidateDir, `${sessionId}.jsonl`);
        if (fs.existsSync(candidateFile)) {
          return candidateFile;
        }
      }
    } catch (error) {
      log.warn('[ProcessManager] Failed to scan Claude projects for JSONL files', error);
    }

    return null;
  }

  private resolveShell(): string {
    const candidates = [process.env.SHELL, '/bin/zsh', '/bin/bash', '/bin/sh'];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.length > 0 && fs.existsSync(candidate)) {
        return candidate;
      }
    }
    throw new Error('No usable shell found for PTY launch.');
  }

  private ensureSpawnHelperExecutable(): void {
    if (process.platform !== 'darwin') {
      return;
    }

    try {
      const packageJsonPath = require.resolve('node-pty/package.json');
      const packageDir = path.dirname(packageJsonPath);
      const helperPath = path.join(packageDir, 'prebuilds', `darwin-${process.arch}`, 'spawn-helper');

      if (!fs.existsSync(helperPath)) {
        return;
      }

      if (helperPath.includes('app.asar')) {
        log.info(`[ProcessManager] node-pty spawn-helper is packaged in asar, skipping chmod: ${helperPath}`);
        return;
      }

      const mode = fs.statSync(helperPath).mode & 0o777;
      if ((mode & 0o111) === 0) {
        fs.chmodSync(helperPath, 0o755);
        log.info(`[ProcessManager] Fixed node-pty spawn-helper permissions: ${helperPath}`);
      }
    } catch (error) {
      log.warn('[ProcessManager] Failed to ensure node-pty spawn-helper permissions', error);
    }
  }

  launchClaudeCode(cwd?: string, sessionId?: string, restoreUid?: string, agentName?: string): number {
    const id = this.nextId++;
    const useSessionId = sessionId || this.generateSessionId();
    const cwdToUse = cwd || os.homedir();
    const projectDir = this.getProjectDir(cwdToUse);

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    this.trustWorkspace(cwdToUse);

    const folderName = cwd ? path.basename(cwd) : undefined;
    const preferredName = agentName || folderName;

    const claudeArgs = ['--session-id', useSessionId, '--dangerously-skip-permissions'];

    if (preferredName) {
      claudeArgs.push(
        '--append-system-prompt',
        `You are Claude Code Agent '${preferredName}'. Remember your name is ${preferredName}.`,
      );
    }

    const claudeCmd = ['claude', ...claudeArgs].map(quoteShellArg).join(' ');

    log.info(
      `[ProcessManager] Launching Claude Code: id=${id}, session=${useSessionId}, cmd=${claudeCmd}`,
    );

    const childEnv = { ...process.env } as Record<string, string | undefined>;
    delete childEnv.CLAUDECODE;

    const shellPath = this.resolveShell();
    this.ensureSpawnHelperExecutable();
    log.info(`[ProcessManager] Using PTY shell: ${shellPath}`);

    const proc = pty.spawn(shellPath, ['-lc', claudeCmd], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: cwdToUse,
      env: { ...childEnv, CLAUDE_TRUST_WORKSPACE: 'true' } as { [key: string]: string },
    });

    proc.onData((data) => {
      const current = this.processes.get(id);
      if (current) {
        current.output = `${current.output}${data}`.slice(-40000);
      }
      this.onProcessOutput?.(id, data);
    });

    proc.onExit(({ exitCode }) => {
      log.info(`[ProcessManager] PTY exited: id=${id}, code=${exitCode}`);
      this.processes.delete(id);
      this.onProcessExit?.(id);
    });

    const info: ProcessInfo = {
      id,
      sessionId: useSessionId,
      pty: proc,
      projectDir,
      workspaceDir: cwdToUse,
      jsonlFile: path.join(projectDir, `${useSessionId}.jsonl`),
      folderName,
      agentName,
      restoreUid,
      output: '',
    };

    this.processes.set(id, info);
    this.onProcessStart?.(info);

    this.waitForJsonlFile(info);

    return id;
  }

  private async waitForJsonlFile(info: ProcessInfo): Promise<void> {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      if (!this.processes.has(info.id)) {
        return;
      }

      if (fs.existsSync(info.jsonlFile)) {
        log.info(`[ProcessManager] JSONL file found: ${info.jsonlFile}`);
        this.onJsonlReady?.(info);
        return;
      }

      const discoveredJsonl = this.findJsonlFile(info.sessionId);
      if (discoveredJsonl) {
        info.jsonlFile = discoveredJsonl;
        info.projectDir = path.dirname(discoveredJsonl);
        log.info(`[ProcessManager] Adopted discovered JSONL file: ${info.jsonlFile}`);
        this.onJsonlReady?.(info);
        return;
      }

      await new Promise((r) => setTimeout(r, 1000));
      attempts++;
    }

    log.warn(`[ProcessManager] JSONL file not found after ${maxAttempts}s: ${info.jsonlFile}`);
  }

  private generateSessionId(): string {
    return randomUUID();
  }

  getProcess(id: number): ProcessInfo | undefined {
    return this.processes.get(id);
  }

  getAllProcesses(): ProcessInfo[] {
    return Array.from(this.processes.values());
  }

  killProcess(id: number): void {
    const info = this.processes.get(id);
    if (info) {
      log.info(`[ProcessManager] Killing PTY: id=${id}`);
      info.pty.kill();
      this.processes.delete(id);
    }
  }

  killAll(): void {
    for (const [id] of this.processes) {
      this.killProcess(id);
    }
  }

  write(id: number, data: string): void {
    const info = this.processes.get(id);
    if (info) {
      info.pty.write(data);
    }
  }

  resize(id: number, cols: number, rows: number): void {
    const info = this.processes.get(id);
    if (info) {
      info.pty.resize(cols, rows);
    }
  }
}

export const processManager = new ProcessManager();
