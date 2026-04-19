import { isBrowserRuntime } from './runtime';
import { runtime } from './runtime';

type VsCodeBridge = { postMessage(msg: unknown): void };

type ElectronBridge = {
  postWebviewMessage?: (msg: unknown) => void;
  launchAgent?: (options?: { cwd?: string; bypassPermissions?: boolean }) => Promise<number>;
  setAgentName?: (id: number, name: string) => void;
  closeAgent?: (id: number) => void;
};

const electronBridge = Reflect.get(window as object, 'electronAPI') as ElectronBridge | undefined;
const acquire = Reflect.get(window as object, 'acquireVsCodeApi');
const vscodeBridge = typeof acquire === 'function' ? (acquire as () => VsCodeBridge)() : null;

export const vscode: VsCodeBridge =
  runtime === 'electron' && electronBridge?.launchAgent
    ? { postMessage: electronBridge.postWebviewMessage || (() => {}) }
    : isBrowserRuntime || !vscodeBridge
      ? { postMessage: (msg: unknown) => console.log('[vscode.postMessage]', msg) }
      : vscodeBridge;
