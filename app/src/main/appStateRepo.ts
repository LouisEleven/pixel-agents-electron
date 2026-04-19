import log from 'electron-log';
import { getDb } from './database.js';

export interface AppSettings {
  soundEnabled: boolean;
  lastSeenVersion: string;
  extensionVersion: string;
  watchAllSessions: boolean;
  alwaysShowLabels: boolean;
  hooksEnabled: boolean;
  hooksInfoShown: boolean;
  externalAssetDirectories: string[];
}

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  lastSeenVersion: '',
  extensionVersion: 'app-dev',
  watchAllSessions: false,
  alwaysShowLabels: false,
  hooksEnabled: false,
  hooksInfoShown: true,
  externalAssetDirectories: [],
};

function getStateValue<T>(key: string): T | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM app_state WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  if (!row) return null;

  try {
    return JSON.parse(row.value) as T;
  } catch (error) {
    log.error(`[AppStateRepo] Failed to parse state for key=${key}:`, error);
    return null;
  }
}

function setStateValue(key: string, value: unknown): void {
  const db = getDb();
  const serialized = JSON.stringify(value);
  db.prepare(
    `
      INSERT INTO app_state (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = datetime('now')
    `,
  ).run(key, serialized);
}

export function getLayout(): Record<string, unknown> | null {
  return getStateValue<Record<string, unknown>>('layout');
}

export function saveLayout(layout: Record<string, unknown>): void {
  setStateValue('layout', layout);
}

export function getAgentSeats(): Record<string, unknown> {
  return getStateValue<Record<string, unknown>>('agentSeats') || {};
}

export function saveAgentSeats(seats: Record<string, unknown>): void {
  setStateValue('agentSeats', seats);
}

export function getSettings(): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...(getStateValue<Partial<AppSettings>>('settings') || {}),
  };
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const next = {
    ...getSettings(),
    ...settings,
  };
  setStateValue('settings', next);
  return next;
}

export function getRestoredAgentUids(): string[] {
  const value = getStateValue<unknown>('restoredAgentUids');
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function saveRestoredAgentUids(uids: string[]): void {
  setStateValue('restoredAgentUids', Array.from(new Set(uids)));
}

export function addRestoredAgentUid(uid: string): void {
  const current = getRestoredAgentUids();
  if (current.includes(uid)) return;
  saveRestoredAgentUids([...current, uid]);
}

export function removeRestoredAgentUid(uid: string): void {
  saveRestoredAgentUids(getRestoredAgentUids().filter((item) => item !== uid));
}
