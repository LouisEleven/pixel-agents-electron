declare global {
  interface Window {
    electronAPI?: {
      // Agent management
      launchAgent?: (options?: {
        cwd?: string;
        bypassPermissions?: boolean;
        name?: string;
        palette?: number;
        hueShift?: number;
        personaPrompt?: string;
        rolePrompt?: string;
      }) => Promise<number>;
      killAgent?: (agentId: number) => Promise<boolean>;
      sendToAgent?: (agentId: number, text: string) => Promise<boolean>;
      getAgents?: () => Promise<
        Array<{
          id: number;
          sessionId: string;
          isWaiting: boolean;
          folderName?: string;
        }>
      >;
      focusAgent?: (agentId: number) => void;
      closeAgent?: (agentId: number) => void;
      setAgentName?: (agentId: number, name: string) => Promise<boolean>;

      // PTY terminals
      spawnTerminal?: (options?: {
        cwd?: string;
        folderName?: string;
        shell?: string;
      }) => Promise<number>;
      getPtySessions?: () => Promise<Array<{ id: number; folderName?: string }>>;
      sendTerminalInput?: (id: number, text: string) => void;
      resizeTerminal?: (id: number, cols: number, rows: number) => void;
      killTerminal?: (id: number) => Promise<boolean>;
      getTerminalSessions?: () => Promise<
        Array<{ id: number; sessionId: string; folderName?: string; output?: string }>
      >;

      // Layout
      saveLayout?: (layout: unknown) => void;
      exportLayout?: () => void;
      importLayout?: () => void;

      // Settings
      setAlwaysShowLabels?: (enabled: boolean) => void;
      setWatchAllSessions?: (enabled: boolean) => void;
      setHooksEnabled?: (enabled: boolean) => void;
      setHooksInfoShown?: () => void;
      setSoundEnabled?: (enabled: boolean) => void;
      openSessionsFolder?: () => void;
      addExternalAssetDirectory?: () => void;
      removeExternalAssetDirectory?: (path: string) => void;

      // Events
      postWebviewMessage?: (message: unknown) => void;
      onTerminalEvent?: (callback: (message: unknown) => void) => void;
    };
  }
}

export {};
