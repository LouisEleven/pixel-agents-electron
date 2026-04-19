/**
 * Runtime detection, provider-agnostic
 *
 * Single source of truth for determining whether the webview is running
 * inside an IDE extension (VS Code, Cursor, Windsurf, etc.) or standalone
 * in a browser.
 */

type Runtime = 'vscode' | 'browser' | 'electron';
// Future: 'cursor' | 'windsurf' | 'electron' | etc.

const hasElectronAPI =
  typeof window !== 'undefined' &&
  typeof Reflect.get(window as object, 'electronAPI') === 'object' &&
  Reflect.get(window as object, 'electronAPI') !== null;

export const runtime: Runtime = hasElectronAPI ? 'electron' : 'browser';

export const isBrowserRuntime = runtime === 'browser';
