/** Map status prefixes back to tool names for animation selection */
const STATUS_TO_TOOL: Record<string, string> = {
  Reading: 'Read',
  Searching: 'Grep',
  Globbing: 'Glob',
  Fetching: 'WebFetch',
  'Searching web': 'WebSearch',
  Writing: 'Write',
  Editing: 'Edit',
  Running: 'Bash',
  Task: 'Task',
};

export function extractToolName(status: string): string | null {
  for (const [prefix, tool] of Object.entries(STATUS_TO_TOOL)) {
    if (status.startsWith(prefix)) return tool;
  }
  const first = status.split(/[\s:]/)[0];
  return first || null;
}

import { ZOOM_MAX, ZOOM_MIN } from '../constants.js';

const DEFAULT_ZOOM_LEVEL = 6;

/** Compute a default integer zoom level (device pixels per sprite pixel) */
export function defaultZoom(): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, DEFAULT_ZOOM_LEVEL));
}
