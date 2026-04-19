import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import log from 'electron-log';
import { app } from 'electron';
import {
  FILE_WATCHER_POLL_INTERVAL_MS,
  PERMISSION_TIMER_DELAY_MS,
  TEXT_IDLE_DELAY_MS,
  TOOL_DONE_DELAY_MS,
  BASH_COMMAND_DISPLAY_MAX_LENGTH,
  TASK_DESCRIPTION_DISPLAY_MAX_LENGTH,
} from '../shared/constants.js';
import type { AgentState, AgentEvent } from '../shared/types.js';
import {
  getAllAgents,
  getAgentBySessionId,
  getAgentByUid,
  replaceAgentSession,
  updateAgent,
  upsertAgentBySessionId,
} from './agentRepo.js';

const PERMISSION_EXEMPT_TOOLS = new Set(['Task', 'Agent', 'AskUserQuestion']);

function getDataPath(): string {
  return path.join(app.getPath('userData'), 'agents.json');
}

export class AgentManager {
  private agents: Map<number, AgentState> = new Map();
  private pollingTimers: Map<number, NodeJS.Timeout> = new Map();
  private waitingTimers: Map<number, NodeJS.Timeout> = new Map();
  private permissionTimers: Map<number, NodeJS.Timeout> = new Map();
  private onEvent?: (event: AgentEvent) => void;

  setEventHandler(handler: (event: AgentEvent) => void) {
    this.onEvent = handler;
  }

  createAgent(
    id: number,
    sessionId: string,
    jsonlFile: string,
    projectDir: string,
    options?: {
      workspaceDir?: string;
      folderName?: string;
      restoreUid?: string;
      preferredPalette?: number;
      preferredHueShift?: number;
      preferredName?: string;
      personaPrompt?: string;
      rolePrompt?: string;
    },
  ): number {
    const existingRecord = options?.restoreUid
      ? getAgentByUid(options.restoreUid)
      : getAgentBySessionId(sessionId);
    const agent: AgentState = {
      id,
      uid: existingRecord?.uid || randomUUID(),
      sessionId,
      isExternal: false,
      projectDir,
      workspaceDir: options?.workspaceDir,
      jsonlFile,
      fileOffset: 0,
      lineBuffer: '',
      activeToolIds: new Set(),
      activeToolStatuses: new Map(),
      activeToolNames: new Map(),
      activeSubagentToolIds: new Map(),
      activeSubagentToolNames: new Map(),
      backgroundAgentToolIds: new Set(),
      isWaiting: false,
      permissionSent: false,
      hadToolsInTurn: false,
      lastDataAt: Date.now(),
      linesProcessed: 0,
      seenUnknownRecordTypes: new Set(),
      hookDelivered: false,
      folderName: options?.folderName,
      palette: existingRecord?.palette ?? options?.preferredPalette ?? Math.floor(Math.random() * 8),
      hueShift: existingRecord?.hueShift ?? options?.preferredHueShift ?? 0,
      name: existingRecord?.name ?? options?.preferredName,
      personaPrompt: options?.personaPrompt,
      rolePrompt: options?.rolePrompt,
      history: existingRecord?.memory ? JSON.parse(existingRecord.memory) : [],
    };

    this.agents.set(id, agent);
    log.info(`[AgentManager] Created agent: id=${id}, session=${sessionId}`);

    this.startWatching(id);
    this.onEvent?.({
      type: 'agentCreated',
      id,
      folderName: options?.folderName,
      palette: agent.palette,
      hueShift: agent.hueShift,
      name: agent.name,
      personaPrompt: agent.personaPrompt,
      rolePrompt: agent.rolePrompt,
    });

    try {
      if (existingRecord && options?.restoreUid) {
        replaceAgentSession(agent.uid, agent.sessionId);
        updateAgent(agent.uid, {
          projectDir: agent.projectDir,
          workspaceDir: options?.workspaceDir,
          jsonlFile: agent.jsonlFile,
          folderName: agent.folderName,
          name: agent.name,
          palette: agent.palette,
          hueShift: agent.hueShift,
          personaPrompt: agent.personaPrompt,
          rolePrompt: agent.rolePrompt,
          memory: JSON.stringify(agent.history),
        });
      } else {
        upsertAgentBySessionId({
          uid: agent.uid,
          sessionId: agent.sessionId,
          projectDir: agent.projectDir,
          workspaceDir: options?.workspaceDir,
          jsonlFile: agent.jsonlFile,
          folderName: agent.folderName,
          name: agent.name,
          palette: agent.palette,
          hueShift: agent.hueShift,
          personaPrompt: agent.personaPrompt,
          rolePrompt: agent.rolePrompt,
          memory: JSON.stringify(agent.history),
        });
      }
    } catch (e) {
      log.error('[AgentManager] Failed to save agent to DB:', e);
    }

    return id;
  }

  removeAgent(id: number): void {
    const agent = this.agents.get(id);
    if (!agent) return;

    log.info(`[AgentManager] Removing agent: id=${id}`);

    const pollTimer = this.pollingTimers.get(id);
    if (pollTimer) clearInterval(pollTimer);
    this.pollingTimers.delete(id);

    this.cancelWaitingTimer(id);
    this.cancelPermissionTimer(id);

    this.agents.delete(id);
    this.onEvent?.({ type: 'agentClosed', id });
  }

  private persistAgents(): void {
    try {
      const agentsData = Array.from(this.agents.values()).map((a) => ({
        uid: a.uid,
        id: a.id,
        sessionId: a.sessionId,
        projectDir: a.projectDir,
        jsonlFile: a.jsonlFile,
        folderName: a.folderName,
        palette: a.palette,
        hueShift: a.hueShift,
        name: a.name,
        history: a.history,
      }));
      fs.writeFileSync(getDataPath(), JSON.stringify(agentsData, null, 2));
      log.info(`[AgentManager] Persisted ${agentsData.length} agents`);
    } catch (e) {
      log.error('[AgentManager] Failed to persist agents:', e);
    }
  }

  loadPersistedAgents(): AgentState[] {
    return [];
  }

  loadAgentsFromDb(): AgentState[] {
    try {
      const agents = getAllAgents();
      log.info(`[AgentManager] Loaded ${agents.length} agents from DB`);
      return agents.map((a) => ({
        id: 0,
        uid: a.uid,
        sessionId: a.sessionId,
        isExternal: false,
        projectDir: a.projectDir || '',
        workspaceDir: a.workspaceDir || undefined,
        jsonlFile: a.jsonlFile || '',
        fileOffset: 0,
        lineBuffer: '',
        activeToolIds: new Set(),
        activeToolStatuses: new Map(),
        activeToolNames: new Map(),
        activeSubagentToolIds: new Map(),
        activeSubagentToolNames: new Map(),
        backgroundAgentToolIds: new Set(),
        isWaiting: false,
        permissionSent: false,
        hadToolsInTurn: false,
        lastDataAt: Date.now(),
        linesProcessed: 0,
        seenUnknownRecordTypes: new Set(),
        hookDelivered: false,
        folderName: a.folderName,
        palette: a.palette,
        hueShift: a.hueShift,
        name: a.name,
        personaPrompt: a.personaPrompt,
        rolePrompt: a.rolePrompt,
        history: a.memory ? JSON.parse(a.memory) : [],
      }));
    } catch (e) {
      log.error('[AgentManager] Failed to load agents from DB:', e);
      return [];
    }
  }

  private startWatching(agentId: number): void {
    const interval = setInterval(() => {
      this.readNewLines(agentId);
    }, FILE_WATCHER_POLL_INTERVAL_MS);
    this.pollingTimers.set(agentId, interval);
  }

  private readNewLines(agentId: number): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    try {
      const stat = fs.statSync(agent.jsonlFile);
      if (agent.fileOffset === 0) {
        updateAgent(agent.uid, {
          projectDir: agent.projectDir,
          workspaceDir: agent.workspaceDir,
          jsonlFile: agent.jsonlFile,
        });
      }
      if (stat.size <= agent.fileOffset) return;

      const MAX_READ_BYTES = 65536;
      const bytesToRead = Math.min(stat.size - agent.fileOffset, MAX_READ_BYTES);
      const buf = Buffer.alloc(bytesToRead);
      const fd = fs.openSync(agent.jsonlFile, 'r');
      fs.readSync(fd, buf, 0, buf.length, agent.fileOffset);
      fs.closeSync(fd);
      agent.fileOffset += bytesToRead;

      const text = agent.lineBuffer + buf.toString('utf-8');
      const lines = text.split('\n');
      agent.lineBuffer = lines.pop() || '';

      if (lines.some((l) => l.trim())) {
        this.cancelWaitingTimer(agentId);
        this.cancelPermissionTimer(agentId);
      }

      for (const line of lines) {
        if (!line.trim()) continue;
        this.processTranscriptLine(agentId, line);
      }
    } catch (e) {
      if (e instanceof Error && 'code' in e && (e as NodeJS.ErrnoException).code !== 'ENOENT') {
        log.info(`[AgentManager] Read error: ${e}`);
      }
    }
  }

  private processTranscriptLine(agentId: number, line: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.lastDataAt = Date.now();
    agent.linesProcessed++;

    try {
      const record = JSON.parse(line);
      const content = record.message?.content ?? record.content;

      if (record.type === 'assistant' && Array.isArray(content)) {
        const hasToolUse = content.some((b: { type: string }) => b.type === 'tool_use');

        if (hasToolUse) {
          this.cancelWaitingTimer(agentId);
          agent.isWaiting = false;
          agent.hadToolsInTurn = true;
          this.onEvent?.({ type: 'agentStatus', id: agentId, status: 'active' });

          let hasNonExemptTool = false;
          for (const block of content) {
            if (block.type === 'tool_use' && block.id) {
              const toolName = block.name || '';
              const status = this.formatToolStatus(toolName, block.input || {});
              agent.activeToolIds.add(block.id);
              agent.activeToolStatuses.set(block.id, status);
              agent.activeToolNames.set(block.id, toolName);

              if (!PERMISSION_EXEMPT_TOOLS.has(toolName)) {
                hasNonExemptTool = true;
              }

              this.onEvent?.({
                type: 'agentToolStart',
                id: agentId,
                toolId: block.id,
                status,
                toolName,
              });
            }
          }

          if (hasNonExemptTool) {
            this.startPermissionTimer(agentId);
          }
        } else if (
          content.some((b: { type: string }) => b.type === 'text') &&
          !agent.hadToolsInTurn
        ) {
          // Text-only response, start waiting timer
          this.triggerWaitingTimer(agentId);
        }
      } else if (record.type === 'user') {
        const userContent = record.message?.content ?? record.content;
        if (Array.isArray(userContent)) {
          const hasToolResult = userContent.some((b: { type: string }) => b.type === 'tool_result');
          if (hasToolResult) {
            for (const block of userContent) {
              if (block.type === 'tool_result' && block.tool_use_id) {
                const toolId = block.tool_use_id;
                agent.activeToolIds.delete(toolId);
                agent.activeToolStatuses.delete(toolId);
                agent.activeToolNames.delete(toolId);

                setTimeout(() => {
                  this.onEvent?.({ type: 'agentToolDone', id: agentId, toolId });
                }, TOOL_DONE_DELAY_MS);
              }
            }

            if (agent.activeToolIds.size === 0) {
              agent.hadToolsInTurn = false;
            }
          }
        }
      } else if (record.type === 'system' && record.subtype === 'turn_duration') {
        this.cancelWaitingTimer(agentId);
        this.cancelPermissionTimer(agentId);
        agent.activeToolIds.clear();
        agent.activeToolStatuses.clear();
        agent.activeToolNames.clear();
        agent.isWaiting = true;
        agent.permissionSent = false;
        agent.hadToolsInTurn = false;

        this.onEvent?.({ type: 'agentToolsClear', id: agentId });
        this.onEvent?.({ type: 'agentStatus', id: agentId, status: 'idle' });
      }
    } catch {
      // Ignore malformed lines
    }
  }

  private formatToolStatus(toolName: string, input: Record<string, unknown>): string {
    const base = (p: unknown) => (typeof p === 'string' ? path.basename(p) : '');
    switch (toolName) {
      case 'Read':
        return `Reading ${base(input.file_path)}`;
      case 'Edit':
        return `Editing ${base(input.file_path)}`;
      case 'Write':
        return `Writing ${base(input.file_path)}`;
      case 'Bash': {
        const cmd = (input.command as string) || '';
        return `Running: ${cmd.length > BASH_COMMAND_DISPLAY_MAX_LENGTH ? cmd.slice(0, BASH_COMMAND_DISPLAY_MAX_LENGTH) + '\u2026' : cmd}`;
      }
      case 'Glob':
        return 'Searching files';
      case 'Grep':
        return 'Searching code';
      case 'WebFetch':
        return 'Fetching web content';
      case 'Task':
      case 'Agent': {
        const desc = typeof input.description === 'string' ? input.description : '';
        return desc
          ? `Subtask: ${desc.length > TASK_DESCRIPTION_DISPLAY_MAX_LENGTH ? desc.slice(0, TASK_DESCRIPTION_DISPLAY_MAX_LENGTH) + '\u2026' : desc}`
          : 'Running subtask';
      }
      default:
        return `Using ${toolName}`;
    }
  }

  private startPermissionTimer(agentId: number): void {
    this.cancelPermissionTimer(agentId);
    const timer = setTimeout(() => {
      log.info(`[AgentManager] Permission timer fired: agent=${agentId}`);
    }, PERMISSION_TIMER_DELAY_MS);
    this.permissionTimers.set(agentId, timer);
  }

  private cancelPermissionTimer(agentId: number): void {
    const timer = this.permissionTimers.get(agentId);
    if (timer) {
      clearTimeout(timer);
      this.permissionTimers.delete(agentId);
    }
  }

  private startWaitingTimer(agentId: number): void {
    this.cancelWaitingTimer(agentId);
    const timer = setTimeout(() => {
      const agent = this.agents.get(agentId);
      if (agent && !agent.hadToolsInTurn) {
        agent.isWaiting = true;
        this.onEvent?.({ type: 'agentStatus', id: agentId, status: 'waiting' });
      }
    }, TEXT_IDLE_DELAY_MS);
    this.waitingTimers.set(agentId, timer);
  }

  private triggerWaitingTimer(agentId: number): void {
    const agent = this.agents.get(agentId);
    if (agent && !agent.hadToolsInTurn && !agent.hookDelivered) {
      this.startWaitingTimer(agentId);
    }
  }

  // Expose for testing
  triggerWaiting = (agentId: number) => this.triggerWaitingTimer(agentId);

  private cancelWaitingTimer(agentId: number): void {
    const timer = this.waitingTimers.get(agentId);
    if (timer) {
      clearTimeout(timer);
      this.waitingTimers.delete(agentId);
    }
  }

  getAgent(id: number): AgentState | undefined {
    return this.agents.get(id);
  }

  setAgentName(id: number, name: string): void {
    const agent = this.agents.get(id);
    if (!agent) return;

    agent.name = name;
    try {
      updateAgent(agent.uid, { name });
    } catch (error) {
      log.error('[AgentManager] Failed to persist agent name:', error);
    }
  }

  getAllAgents(): AgentState[] {
    return Array.from(this.agents.values());
  }
}

export const agentManager = new AgentManager();
