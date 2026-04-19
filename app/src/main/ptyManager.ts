import * as pty from 'node-pty';
import log from 'electron-log';

export interface PtySession {
  id: number;
  pty: pty.IPty;
  folderName?: string;
}

export class PtyManager {
  private sessions: Map<number, PtySession> = new Map();
  private nextId = 1;
  private onOutput?: (id: number, data: string) => void;
  private onExit?: (id: number) => void;

  setCallbacks(onOutput: (id: number, data: string) => void, onExit: (id: number) => void) {
    this.onOutput = onOutput;
    this.onExit = onExit;
  }

  spawn(cwd?: string, folderName?: string, shell?: string): number {
    const id = this.nextId++;
    const shellToUse = shell || process.env.SHELL || '/bin/zsh';
    const cwdToUse = cwd || process.env.HOME || '/';

    log.info(`[PtyManager] Spawning: id=${id}, shell=${shellToUse}, cwd=${cwdToUse}`);

    const ptyProcess = pty.spawn(shellToUse, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: cwdToUse,
      env: process.env as { [key: string]: string },
    });

    ptyProcess.onData((data) => {
      this.onOutput?.(id, data);
    });

    ptyProcess.onExit(({ exitCode }) => {
      log.info(`[PtyManager] Terminal exited: id=${id}, code=${exitCode}`);
      this.sessions.delete(id);
      this.onExit?.(id);
    });

    this.sessions.set(id, { id, pty: ptyProcess, folderName });
    return id;
  }

  write(id: number, data: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.pty.write(data);
    }
  }

  resize(id: number, cols: number, rows: number): void {
    const session = this.sessions.get(id);
    if (session) {
      session.pty.resize(cols, rows);
    }
  }

  kill(id: number): void {
    const session = this.sessions.get(id);
    if (session) {
      session.pty.kill();
      this.sessions.delete(id);
    }
  }

  getSession(id: number): PtySession | undefined {
    return this.sessions.get(id);
  }

  getAllSessions(): PtySession[] {
    return Array.from(this.sessions.values());
  }
}

export const ptyManager = new PtyManager();
