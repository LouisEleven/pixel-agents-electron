import log from 'electron-log';
import { getDb } from './database.js';

export interface AgentRecord {
  id?: number;
  uid: string;
  sessionId: string;
  projectDir?: string;
  workspaceDir?: string;
  jsonlFile?: string;
  folderName?: string;
  name?: string;
  palette?: number;
  hueShift?: number;
  personaPrompt?: string;
  rolePrompt?: string;
  avatarConfig?: Record<string, unknown>;
  memory?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function createAgent(agent: AgentRecord): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO agents (uid, session_id, project_dir, workspace_dir, jsonl_file, folder_name, name, palette, hue_shift, persona_prompt, role_prompt, avatar_config, memory)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    agent.uid,
    agent.sessionId,
    agent.projectDir || null,
    agent.workspaceDir || null,
    agent.jsonlFile || null,
    agent.folderName || null,
    agent.name || null,
    agent.palette || 0,
    agent.hueShift || 0,
    agent.personaPrompt || null,
    agent.rolePrompt || null,
    agent.avatarConfig ? JSON.stringify(agent.avatarConfig) : null,
    agent.memory || null,
  );

  log.info(`[AgentRepo] Created agent: uid=${agent.uid}, id=${result.lastInsertRowid}`);
  return Number(result.lastInsertRowid);
}

export function updateAgent(uid: string, updates: Partial<AgentRecord>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.sessionId !== undefined) {
    fields.push('session_id = ?');
    values.push(updates.sessionId);
  }
  if (updates.projectDir !== undefined) {
    fields.push('project_dir = ?');
    values.push(updates.projectDir);
  }
  if (updates.workspaceDir !== undefined) {
    fields.push('workspace_dir = ?');
    values.push(updates.workspaceDir);
  }
  if (updates.jsonlFile !== undefined) {
    fields.push('jsonl_file = ?');
    values.push(updates.jsonlFile);
  }
  if (updates.folderName !== undefined) {
    fields.push('folder_name = ?');
    values.push(updates.folderName);
  }
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.palette !== undefined) {
    fields.push('palette = ?');
    values.push(updates.palette);
  }
  if (updates.hueShift !== undefined) {
    fields.push('hue_shift = ?');
    values.push(updates.hueShift);
  }
  if (updates.personaPrompt !== undefined) {
    fields.push('persona_prompt = ?');
    values.push(updates.personaPrompt);
  }
  if (updates.rolePrompt !== undefined) {
    fields.push('role_prompt = ?');
    values.push(updates.rolePrompt);
  }
  if (updates.avatarConfig !== undefined) {
    fields.push('avatar_config = ?');
    values.push(JSON.stringify(updates.avatarConfig));
  }
  if (updates.memory !== undefined) {
    fields.push('memory = ?');
    values.push(updates.memory);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(uid);

  const stmt = db.prepare(`UPDATE agents SET ${fields.join(', ')} WHERE uid = ?`);
  stmt.run(...values);
  log.info(`[AgentRepo] Updated agent: uid=${uid}`);
}

export function deleteAgent(uid: string): void {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM agents WHERE uid = ?');
  stmt.run(uid);
  log.info(`[AgentRepo] Deleted agent: uid=${uid}`);
}

export function deleteAgentsNotInUids(uids: string[]): void {
  const db = getDb();
  if (uids.length === 0) {
    db.prepare('DELETE FROM agents').run();
    log.info('[AgentRepo] Deleted all agents');
    return;
  }

  const placeholders = uids.map(() => '?').join(', ');
  db.prepare(`DELETE FROM agents WHERE uid NOT IN (${placeholders})`).run(...uids);
  log.info(`[AgentRepo] Deleted agents not in restore set: kept=${uids.length}`);
}

function mapAgentRow(row: Record<string, unknown> | undefined): AgentRecord | null {
  if (!row) return null;
  return {
    id: row.id as number | undefined,
    uid: row.uid as string,
    sessionId: row.session_id as string,
    projectDir: row.project_dir as string | undefined,
    workspaceDir: row.workspace_dir as string | undefined,
    jsonlFile: row.jsonl_file as string | undefined,
    folderName: row.folder_name as string | undefined,
    name: row.name as string | undefined,
    palette: row.palette as number | undefined,
    hueShift: row.hue_shift as number | undefined,
    personaPrompt: row.persona_prompt as string | undefined,
    rolePrompt: row.role_prompt as string | undefined,
    avatarConfig:
      typeof row.avatar_config === 'string'
        ? (JSON.parse(row.avatar_config as string) as Record<string, unknown>)
        : undefined,
    memory: row.memory as string | undefined,
    createdAt: row.created_at as string | undefined,
    updatedAt: row.updated_at as string | undefined,
  };
}

export function getAgentByUid(uid: string): AgentRecord | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM agents WHERE uid = ?');
  const row = stmt.get(uid) as Record<string, unknown> | undefined;
  return mapAgentRow(row);
}

export function replaceAgentSession(uid: string, sessionId: string): void {
  updateAgent(uid, { sessionId });
}

export function getAgentBySessionId(sessionId: string): AgentRecord | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM agents WHERE session_id = ?');
  const row = stmt.get(sessionId) as Record<string, unknown> | undefined;
  return mapAgentRow(row);
}

export function upsertAgentBySessionId(agent: AgentRecord): void {
  const existing = getAgentBySessionId(agent.sessionId);
  if (existing) {
    updateAgent(existing.uid, {
      projectDir: agent.projectDir,
      workspaceDir: agent.workspaceDir,
      jsonlFile: agent.jsonlFile,
      folderName: agent.folderName,
      name: agent.name,
      palette: agent.palette,
      hueShift: agent.hueShift,
      personaPrompt: agent.personaPrompt,
      rolePrompt: agent.rolePrompt,
      avatarConfig: agent.avatarConfig,
      memory: agent.memory,
    });
    return;
  }

  createAgent(agent);
}

export function getAllAgents(): AgentRecord[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM agents ORDER BY created_at DESC');
  return (stmt.all() as Record<string, unknown>[]).map((row) => mapAgentRow(row)).filter(Boolean) as AgentRecord[];
}

export function saveAgentMemory(uid: string, memory: string): void {
  updateAgent(uid, { memory });
}

export function updateAgentAvatar(uid: string, avatarConfig: Record<string, unknown>): void {
  updateAgent(uid, { avatarConfig });
}
