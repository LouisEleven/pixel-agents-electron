// ── JSONL File Watching ─────────────────────────────────────
export const JSONL_POLL_INTERVAL_MS = 1000;
export const FILE_WATCHER_POLL_INTERVAL_MS = 500;
export const PROJECT_SCAN_INTERVAL_MS = 1000;

// ── Heuristic Agent Status Detection ────────────────────────
export const TOOL_DONE_DELAY_MS = 300;
export const PERMISSION_TIMER_DELAY_MS = 7000;
export const TEXT_IDLE_DELAY_MS = 5000;
export const CLEAR_IDLE_THRESHOLD_MS = 2000;

// ── External Session Detection ──────────────────────────────
export const EXTERNAL_SCAN_INTERVAL_MS = 3000;
export const EXTERNAL_ACTIVE_THRESHOLD_MS = 120_000;
export const EXTERNAL_STALE_CHECK_INTERVAL_MS = 30_000;
export const DISMISSED_COOLDOWN_MS = 180_000;

// ── Global Session Scanning ─────────────────────────────────
export const GLOBAL_SCAN_ACTIVE_MIN_SIZE = 3_072;
export const GLOBAL_SCAN_ACTIVE_MAX_AGE_MS = 600_000;

// ── Display Truncation ──────────────────────────────────────
export const BASH_COMMAND_DISPLAY_MAX_LENGTH = 30;
export const TASK_DESCRIPTION_DISPLAY_MAX_LENGTH = 40;

// ── Claude Code Paths ───────────────────────────────────────
export const CLAUDE_PROJECTS_DIR = '.claude/projects';
