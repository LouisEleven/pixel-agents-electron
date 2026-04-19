import { app, BrowserWindow, dialog, ipcMain, Notification, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import log from 'electron-log';
import { processManager } from './processManager.js';
import { agentManager } from './agentManager.js';
import { ptyManager } from './ptyManager.js';
import { deleteAgentsNotInUids } from './agentRepo.js';
import { createTray, destroyTray } from './tray.js';
import { createAppMenu } from './menu.js';
import { loadWebviewAssets } from './webviewAssets.js';
import { initDatabase, ensureTables } from './database.js';
import {
  addRestoredAgentUid,
  getAgentSeats,
  getLayout,
  getRestoredAgentUids,
  getSettings,
  removeRestoredAgentUid,
  saveAgentSeats,
  saveLayout,
  saveSettings,
} from './appStateRepo.js';

log.initialize();
log.info('Pixel Agents starting...');

function initDb() {
  try {
    initDatabase();
    ensureTables();
    appSettings = getSettings();
    log.info('[App] Database initialized');
  } catch (e) {
    log.error('[App] Database init failed:', e);
  }
}

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;
let webviewAssetsCache: ReturnType<typeof loadWebviewAssets> | null = null;
let appSettings = {
  soundEnabled: true,
  lastSeenVersion: '',
  extensionVersion: 'app-dev',
  watchAllSessions: false,
  alwaysShowLabels: false,
  hooksEnabled: false,
  hooksInfoShown: true,
  externalAssetDirectories: [],
};

function getWebviewDistPath(...segments: string[]): string {
  const appPath = app.getAppPath();
  const candidateInApp = path.join(appPath, 'dist', 'webview', ...segments);
  if (fs.existsSync(candidateInApp)) {
    return candidateInApp;
  }
  return path.resolve(__dirname, '..', '..', '..', 'dist', 'webview', ...segments);
}

function createWindow() {
  log.info('Creating main window');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Agent办公室',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#1e1e2e',
    show: false,
  });

  const webviewEntry = getWebviewDistPath('index.html');
  log.info('[App] Loading webview entry:', webviewEntry);
  mainWindow.loadFile(webviewEntry);

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    log.error('[App] Failed to load webview', {
      errorCode,
      errorDescription,
      validatedURL,
      webviewEntry,
    });
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.insertCSS(`
      .xterm {
        font-family: "SF Mono", Menlo, Monaco, "Courier New", monospace !important;
      }
      .xterm-viewport {
        scrollbar-width: thin;
        scrollbar-color: #484f58 #0d1117;
      }
      .xterm-viewport::-webkit-scrollbar {
        width: 8px;
      }
      .xterm-viewport::-webkit-scrollbar-track {
        background: #0d1117;
      }
      .xterm-viewport::-webkit-scrollbar-thumb {
        background: #484f58;
        border-radius: 4px;
      }
    `);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    log.info('Window ready to show');
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('Window loaded successfully');
    sendExistingAgents();
  });
}

function showWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  }
}

function postWebviewMessage(message: unknown) {
  mainWindow?.webContents.send('webview:message', message);
}

function postTerminalEvent(message: unknown) {
  mainWindow?.webContents.send('terminal:event', message);
}

function ensureWebviewAssets() {
  if (webviewAssetsCache) return webviewAssetsCache;
  const assetsDir = getWebviewDistPath('assets');
  webviewAssetsCache = loadWebviewAssets(assetsDir);
  return webviewAssetsCache;
}

function sendInitialWebviewData() {
  const assets = ensureWebviewAssets();
  const savedLayout = getLayout();
  const agentSeats = getAgentSeats();
  const layout = savedLayout || assets.layout;

  postWebviewMessage({ type: 'characterSpritesLoaded', characters: assets.characters });
  postWebviewMessage({ type: 'floorTilesLoaded', sprites: assets.floors });
  postWebviewMessage({ type: 'wallTilesLoaded', sets: assets.walls });
  postWebviewMessage({
    type: 'furnitureAssetsLoaded',
    catalog: assets.furnitureCatalog,
    sprites: assets.furnitureSprites,
  });
  postWebviewMessage({ type: 'layoutLoaded', layout });
  if (Object.keys(agentSeats).length > 0) {
    postWebviewMessage({ type: 'agentSeatsLoaded', seats: agentSeats });
  }
  postWebviewMessage({
    type: 'settingsLoaded',
    soundEnabled: appSettings.soundEnabled,
    lastSeenVersion: appSettings.lastSeenVersion,
    extensionVersion: appSettings.extensionVersion,
    watchAllSessions: appSettings.watchAllSessions,
    alwaysShowLabels: appSettings.alwaysShowLabels,
    hooksEnabled: appSettings.hooksEnabled,
    hooksInfoShown: appSettings.hooksInfoShown,
    externalAssetDirectories: appSettings.externalAssetDirectories,
  });
}

function forgetAgentPersistence(agentId: number) {
  const agent = agentManager.getAgent(agentId);
  if (!agent) return;
  removeRestoredAgentUid(agent.uid);
}

function sendExistingAgents() {
  const agents = agentManager.getAllAgents();
  const agentIds = agents.map((a) => a.id).sort((a, b) => a - b);
  const folderNames = Object.fromEntries(
    agents.filter((a) => a.folderName).map((a) => [a.id, a.folderName]),
  );
  const customNames = Object.fromEntries(agents.filter((a) => a.name).map((a) => [a.id, a.name]));
  const seatMap = getAgentSeats() as Record<
    string,
    { palette?: number; hueShift?: number; seatId?: string | null }
  >;
  const agentMeta = Object.fromEntries(
    agents.map((a) => {
      const persisted = seatMap[a.uid] || {};
      return [
        a.id,
        {
          palette: persisted.palette ?? a.palette,
          hueShift: persisted.hueShift ?? a.hueShift,
          seatId: persisted.seatId,
        },
      ];
    }),
  );
  postWebviewMessage({
    type: 'existingAgents',
    agents: agentIds,
    folderNames,
    customNames,
    agentMeta,
  });
  log.info(
    `[IPC] Sent existingAgents: ids=${JSON.stringify(agentIds)}, meta=${JSON.stringify(agentMeta)}`,
  );
}

function setupPtyEvents() {
  ptyManager.setCallbacks(
    (id, data) => {
      postTerminalEvent({ type: 'terminal-output', id, chunk: data });
    },
    (id) => {
      postTerminalEvent({ type: 'terminal-exit', id });
    },
  );
}

function setupIpc() {
  // PTY terminals
  ipcMain.handle(
    'spawnTerminal',
    (_event, options?: { cwd?: string; folderName?: string; shell?: string }) => {
      const termId = ptyManager.spawn(options?.cwd, options?.folderName, options?.shell);
      log.info(`[IPC] spawnTerminal: id=${termId}`);
      return termId;
    },
  );

  ipcMain.on('terminalInput', (_event, payload) => {
    const { id, text } = payload as { id: number; text: string };
    if (typeof id === 'number' && typeof text === 'string') {
      processManager.write(id, text);
    }
  });

  ipcMain.on('terminalResize', (_event, payload) => {
    const { id, cols, rows } = payload as { id: number; cols: number; rows: number };
    if (typeof id === 'number' && typeof cols === 'number' && typeof rows === 'number') {
      processManager.resize(id, cols, rows);
    }
  });

  ipcMain.handle('killTerminal', (_event, id: number) => {
    ptyManager.kill(id);
    return true;
  });

  // Claude Code process
  ipcMain.handle(
    'launchAgent',
    (
      _event,
      options?: {
        cwd?: string;
        bypassPermissions?: boolean;
        name?: string;
        palette?: number;
        hueShift?: number;
      },
    ) => {
      try {
        log.info(`[IPC] launchAgent: cwd=${options?.cwd}, name=${options?.name ?? ''}`);
        const agentId = processManager.launchClaudeCode(
          options?.cwd,
          undefined,
          undefined,
          options?.name,
          options?.palette,
          options?.hueShift,
        );
        return agentId;
      } catch (error) {
      log.error(`[IPC] launchAgent error: ${error}`);
      throw error;
    }
  });

  ipcMain.handle('killAgent', (_event, agentId: number) => {
    log.info(`[IPC] killAgent: id=${agentId}`);
    forgetAgentPersistence(agentId);
    processManager.killProcess(agentId);
    agentManager.removeAgent(agentId);
    return true;
  });

  ipcMain.handle('closeAgent', (_event, agentId: number) => {
    log.info(`[IPC] closeAgent: id=${agentId}`);
    forgetAgentPersistence(agentId);
    processManager.killProcess(agentId);
    agentManager.removeAgent(agentId);
    return true;
  });

  ipcMain.handle('sendToAgent', (_event, agentId: number, text: string) => {
    processManager.write(agentId, text);
    return true;
  });

  ipcMain.handle('getAgents', () => {
    return agentManager.getAllAgents().map((a) => ({
      id: a.id,
      sessionId: a.sessionId,
      isWaiting: a.isWaiting,
      folderName: a.folderName,
    }));
  });

  ipcMain.handle('showNotification', (_event, title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
    return true;
  });

  ipcMain.handle('showWindow', () => {
    showWindow();
    return true;
  });

  ipcMain.handle('focusAgent', (_event, agentId: number) => {
    log.info(`[IPC] focusAgent: id=${agentId}`);
    const agent = agentManager.getAgent(agentId);
    if (agent) {
      mainWindow?.show();
      mainWindow?.focus();
      mainWindow?.webContents.focus();
    }
    return true;
  });

  ipcMain.handle('setAgentName', (_event, agentId: number, name: string) => {
    log.info(`[IPC] setAgentName: id=${agentId}, name=${name}`);
    if (typeof name === 'string' && name.trim()) {
      agentManager.setAgentName(agentId, name.trim());
    }
    return true;
  });

  ipcMain.handle('saveLayout', (_event, layout: unknown) => {
    log.info('[IPC] saveLayout');
    if (layout && typeof layout === 'object') {
      saveLayout(layout as Record<string, unknown>);
    }
    return true;
  });

  ipcMain.handle('exportLayout', async () => {
    log.info('[IPC] exportLayout');
    const layout = getLayout();
    if (!layout) return false;

    const result = await dialog.showSaveDialog({
      title: 'Export Layout',
      defaultPath: 'pixel-agents-layout.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return false;

    fs.writeFileSync(result.filePath, JSON.stringify(layout, null, 2), 'utf-8');
    return true;
  });

  ipcMain.handle('importLayout', async () => {
    log.info('[IPC] importLayout');
    const result = await dialog.showOpenDialog({
      title: 'Import Layout',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return false;

    const raw = fs.readFileSync(result.filePaths[0], 'utf-8');
    const layout = JSON.parse(raw) as Record<string, unknown>;
    saveLayout(layout);
    postWebviewMessage({ type: 'layoutLoaded', layout });
    return true;
  });

  ipcMain.handle('setAlwaysShowLabels', (_event, enabled: boolean) => {
    log.info(`[IPC] setAlwaysShowLabels: ${enabled}`);
    appSettings = saveSettings({ alwaysShowLabels: enabled });
    return true;
  });

  ipcMain.handle('setWatchAllSessions', (_event, enabled: boolean) => {
    log.info(`[IPC] setWatchAllSessions: ${enabled}`);
    appSettings = saveSettings({ watchAllSessions: enabled });
    return true;
  });

  ipcMain.handle('setHooksEnabled', (_event, enabled: boolean) => {
    log.info(`[IPC] setHooksEnabled: ${enabled}`);
    appSettings = saveSettings({ hooksEnabled: enabled });
    return true;
  });

  ipcMain.handle('setHooksInfoShown', () => {
    log.info('[IPC] setHooksInfoShown');
    appSettings = saveSettings({ hooksInfoShown: true });
    return true;
  });

  ipcMain.handle('setSoundEnabled', (_event, enabled: boolean) => {
    log.info(`[IPC] setSoundEnabled: ${enabled}`);
    appSettings = saveSettings({ soundEnabled: enabled });
    return true;
  });

  ipcMain.handle('openSessionsFolder', () => {
    const { shell } = require('electron');
    shell.openPath(path.join(os.homedir(), '.claude', 'projects'));
    return true;
  });

  ipcMain.handle('getTerminalSessions', () => {
    return processManager.getAllProcesses().map((proc) => ({
      id: proc.id,
      sessionId: proc.sessionId,
      folderName: proc.folderName,
      output: proc.output,
    }));
  });

  ipcMain.on('terminal:input', (_event, payload) => {
    const { id, text } = payload as { id?: number; text?: string };
    if (typeof id === 'number' && typeof text === 'string') {
      processManager.write(id, text);
    }
  });

  ipcMain.on('webview:message', (_event, message) => {
    const payload = message as {
      type?: string;
      folderPath?: string;
      id?: number;
      bypassPermissions?: boolean;
      layout?: unknown;
      seats?: unknown;
    };
    if (payload.type === 'webviewReady') {
      sendInitialWebviewData();
      sendExistingAgents();
      return;
    }
    if (payload.type === 'saveLayout') {
      if (payload.layout && typeof payload.layout === 'object') {
        saveLayout(payload.layout as Record<string, unknown>);
      }
      return;
    }
    if (payload.type === 'saveAgentSeats') {
      if (payload.seats && typeof payload.seats === 'object') {
        const existingSeats = getAgentSeats() as Record<
          string,
          { palette?: number; hueShift?: number; seatId?: string | null }
        >;
        const seatsByUid = Object.fromEntries(
          Object.entries(payload.seats as Record<string, unknown>).flatMap(([agentId, seatValue]) => {
            const numericId = Number(agentId);
            const agent = Number.isFinite(numericId) ? agentManager.getAgent(numericId) : undefined;
            if (!agent) {
              return [];
            }
            const incoming =
              seatValue && typeof seatValue === 'object'
                ? (seatValue as { palette?: number; hueShift?: number; seatId?: string | null })
                : {};
            const current = existingSeats[agent.uid] || {};
            return [
              [
                agent.uid,
                {
                  palette: incoming.palette ?? current.palette ?? agent.palette,
                  hueShift: incoming.hueShift ?? current.hueShift ?? agent.hueShift,
                  seatId: incoming.seatId ?? current.seatId ?? null,
                },
              ],
            ];
          }),
        );
        saveAgentSeats({ ...existingSeats, ...seatsByUid });
      }
      return;
    }
    if (payload.type === 'openClaude') {
      processManager.launchClaudeCode(payload.folderPath);
      return;
    }
    if (payload.type === 'closeAgent' && typeof payload.id === 'number') {
      forgetAgentPersistence(payload.id);
      processManager.killProcess(payload.id);
      agentManager.removeAgent(payload.id);
      return;
    }
  });

  log.info('[IPC] IPC handlers registered');
}

function forwardAgentEvents() {
  agentManager.setEventHandler((event) => {
    postWebviewMessage(event);
    mainWindow?.webContents.send('agent:event', event.type, event);
    log.info(`[IPC] Forwarding event: ${event.type}`);

    if (event.type === 'agentStatus') {
      const data = event as { id: number; status: string };
      if (data.status === 'waiting' && Notification.isSupported()) {
        const notification = new Notification({
          title: 'Pixel Agents',
          body: `Agent #${data.id} is waiting for input`,
        });
        notification.show();
      }
    }
  });

  processManager.setCallbacks(
    (processInfo) => {
      agentManager.createAgent(
        processInfo.id,
        processInfo.sessionId,
        processInfo.jsonlFile,
        processInfo.projectDir,
        processInfo.workspaceDir,
        processInfo.folderName,
        processInfo.restoreUid,
        processInfo.preferredPalette,
        processInfo.preferredHueShift,
        processInfo.agentName,
      );
      const createdAgent = agentManager.getAgent(processInfo.id);
      if (createdAgent) {
        addRestoredAgentUid(createdAgent.uid);
      }
      postTerminalEvent({
        type: 'terminal-session',
        session: {
          id: processInfo.id,
          sessionId: processInfo.sessionId,
          folderName: processInfo.folderName,
        },
      });
      postTerminalEvent({
        type: 'terminal-output',
        id: processInfo.id,
        chunk: `[launching Claude] session=${processInfo.sessionId}\n`,
      });
    },
    (processInfo) => {
      const agent = agentManager.getAgent(processInfo.id);
      if (agent) {
        agent.projectDir = processInfo.projectDir;
        agent.workspaceDir = processInfo.workspaceDir;
        agent.jsonlFile = processInfo.jsonlFile;
      }
      postTerminalEvent({
        type: 'terminal-output',
        id: processInfo.id,
        chunk: `[transcript ready] ${processInfo.jsonlFile}\n`,
      });
    },
    (processId) => {
      agentManager.removeAgent(processId);
      postTerminalEvent({ type: 'terminal-exit', id: processId });
    },
    (processId, chunk) => {
      postTerminalEvent({ type: 'terminal-output', id: processId, chunk });
    },
  );
}

function setupMacOS() {
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      showWindow();
    }
  });
}

app.whenReady().then(async () => {
  log.info('App ready');
  await initDb();
  setupPtyEvents();
  setupIpc();
  forwardAgentEvents();
  createWindow();

  const restoredAgentUids = getRestoredAgentUids();
  deleteAgentsNotInUids(restoredAgentUids);
  const restoreUidSet = new Set(restoredAgentUids);
  const persistedAgents = agentManager
    .loadAgentsFromDb()
    .filter((agentData) => restoreUidSet.has(agentData.uid));
  for (const agentData of persistedAgents) {
    const restoreCwd = agentData.workspaceDir || agentData.projectDir || undefined;
    log.info(
      `[App] Restoring agent identity: uid=${agentData.uid}, name=${agentData.name}, cwd=${restoreCwd ?? '(default)'}`,
    );
    processManager.launchClaudeCode(restoreCwd, undefined, agentData.uid, agentData.name);
  }

  // Create tray
  createTray(
    showWindow,
    () => {
      showWindow();
      mainWindow?.webContents.send('menu-action', 'newAgent');
    },
    () => {
      isQuitting = true;
      app.quit();
    },
  );

  // Create app menu
  createAppMenu(
    () => {
      showWindow();
      mainWindow?.webContents.send('menu-action', 'newAgent');
    },
    () => {
      showWindow();
      mainWindow?.webContents.send('menu-action', 'showLayout');
    },
    () => {
      mainWindow?.webContents.toggleDevTools();
    },
  );

  setupMacOS();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  log.info('App quitting');
  destroyTray();
  processManager.killAll();
});
