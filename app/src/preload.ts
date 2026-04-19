import { contextBridge, ipcRenderer } from 'electron';

export interface AgentInfo {
  id: number;
  sessionId: string;
  isWaiting: boolean;
  folderName?: string;
}

export interface TerminalSessionInfo {
  id: number;
  sessionId: string;
  folderName?: string;
}

export interface PtySessionInfo {
  id: number;
  folderName?: string;
}

export interface ElectronAPI {
  launchAgent: (options?: { cwd?: string; bypassPermissions?: boolean }) => Promise<number>;
  killAgent: (agentId: number) => Promise<boolean>;
  sendToAgent: (agentId: number, text: string) => Promise<boolean>;
  getAgents: () => Promise<AgentInfo[]>;
  focusAgent: (agentId: number) => void;
  closeAgent: (agentId: number) => void;
  setAgentName: (agentId: number, name: string) => Promise<boolean>;
  // PTY terminals
  spawnTerminal: (options?: {
    cwd?: string;
    folderName?: string;
    shell?: string;
  }) => Promise<number>;
  getPtySessions: () => Promise<PtySessionInfo[]>;
  sendTerminalInput: (id: number, text: string) => void;
  resizeTerminal: (id: number, cols: number, rows: number) => void;
  killTerminal: (id: number) => Promise<boolean>;
  // Layout
  saveLayout: (layout: unknown) => void;
  exportLayout: () => void;
  importLayout: () => void;
  // Settings
  setAlwaysShowLabels: (enabled: boolean) => void;
  setWatchAllSessions: (enabled: boolean) => void;
  setHooksEnabled: (enabled: boolean) => void;
  setHooksInfoShown: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  openSessionsFolder: () => void;
  addExternalAssetDirectory: () => void;
  removeExternalAssetDirectory: (path: string) => void;
  // Legacy
  getTerminalSessions: () => Promise<TerminalSessionInfo[]>;
  showNotification: (title: string, body: string) => Promise<boolean>;
  showWindow: () => Promise<boolean>;
  postWebviewMessage: (message: unknown) => void;
  onWebviewMessage: (callback: (message: unknown) => void) => void;
  onAgentEvent: (callback: (eventType: string, data: unknown) => void) => void;
  onMenuAction: (callback: (action: string) => void) => void;
  onTerminalEvent: (callback: (message: unknown) => void) => void;
}

const api: ElectronAPI = {
  launchAgent: (options) => ipcRenderer.invoke('launchAgent', options),
  killAgent: (agentId) => ipcRenderer.invoke('killAgent', agentId),
  sendToAgent: (agentId, text) => ipcRenderer.invoke('sendToAgent', agentId, text),
  getAgents: () => ipcRenderer.invoke('getAgents'),
  focusAgent: (agentId) => ipcRenderer.invoke('focusAgent', agentId),
  closeAgent: (agentId) => ipcRenderer.invoke('closeAgent', agentId),
  setAgentName: (agentId, name) => ipcRenderer.invoke('setAgentName', agentId, name),
  // PTY terminals
  spawnTerminal: (options) => ipcRenderer.invoke('spawnTerminal', options),
  getPtySessions: () => ipcRenderer.invoke('getTerminalSessions'),
  sendTerminalInput: (id, text) => ipcRenderer.send('terminalInput', { id, text }),
  resizeTerminal: (id, cols, rows) => ipcRenderer.send('terminalResize', { id, cols, rows }),
  killTerminal: (id) => ipcRenderer.invoke('killTerminal', id),
  // Layout
  saveLayout: (layout) => ipcRenderer.invoke('saveLayout', layout),
  exportLayout: () => ipcRenderer.invoke('exportLayout'),
  importLayout: () => ipcRenderer.invoke('importLayout'),
  // Settings
  setAlwaysShowLabels: (enabled) => ipcRenderer.invoke('setAlwaysShowLabels', enabled),
  setWatchAllSessions: (enabled) => ipcRenderer.invoke('setWatchAllSessions', enabled),
  setHooksEnabled: (enabled) => ipcRenderer.invoke('setHooksEnabled', enabled),
  setHooksInfoShown: () => ipcRenderer.invoke('setHooksInfoShown'),
  setSoundEnabled: (enabled) => ipcRenderer.invoke('setSoundEnabled', enabled),
  openSessionsFolder: () => ipcRenderer.invoke('openSessionsFolder'),
  addExternalAssetDirectory: () => ipcRenderer.invoke('addExternalAssetDirectory'),
  removeExternalAssetDirectory: (path) => ipcRenderer.invoke('removeExternalAssetDirectory', path),
  // Legacy
  getTerminalSessions: () => ipcRenderer.invoke('getTerminalSessions'),
  showNotification: (title, body) => ipcRenderer.invoke('showNotification', title, body),
  showWindow: () => ipcRenderer.invoke('showWindow'),
  postWebviewMessage: (message) => ipcRenderer.send('webview:message', message),
  onWebviewMessage: (callback) => {
    ipcRenderer.on('webview:message', (_event, message) => {
      callback(message);
    });
  },
  onAgentEvent: (callback) => {
    ipcRenderer.on('agent:event', (_event, eventType, data) => {
      callback(eventType, data);
    });
  },
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (_event, action) => {
      callback(action);
    });
  },
  onTerminalEvent: (callback) => {
    ipcRenderer.on('terminal:event', (_event, message) => {
      callback(message);
    });
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
contextBridge.exposeInMainWorld('acquireVsCodeApi', () => ({
  postMessage: (message: unknown) => ipcRenderer.send('webview:message', message),
}));

ipcRenderer.on('webview:message', (_event, message) => {
  window.dispatchEvent(new MessageEvent('message', { data: message }));
});
