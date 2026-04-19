import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import log from 'electron-log';

let db: Database.Database | null = null;

export function initDatabase(): Database.Database {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'pixel-agents.db');

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  log.info(`[Database] SQLite opened: ${dbPath}`);
  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    log.info('[Database] Closed');
  }
}

export function ensureTables(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT NOT NULL UNIQUE,
      session_id TEXT NOT NULL,
      project_dir TEXT,
      workspace_dir TEXT,
      jsonl_file TEXT,
      folder_name TEXT,
      name TEXT,
      palette INTEGER DEFAULT 0,
      hue_shift INTEGER DEFAULT 0,
      avatar_config TEXT,
      memory TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_agents_uid ON agents(uid);
    CREATE INDEX IF NOT EXISTS idx_agents_session_id ON agents(session_id);

    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const columns = db
    .prepare("PRAGMA table_info(agents)")
    .all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === 'workspace_dir')) {
    db.exec('ALTER TABLE agents ADD COLUMN workspace_dir TEXT');
    log.info('[Database] Added workspace_dir column');
  }

  log.info('[Database] Tables ensured');
}
