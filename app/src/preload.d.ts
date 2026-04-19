declare global {
  interface Window {
    electronAPI: {
      launchAgent: (options?: { cwd?: string; bypassPermissions?: boolean }) => Promise<number>;
      killAgent: (agentId: number) => Promise<boolean>;
      sendToAgent: (agentId: number, text: string) => Promise<boolean>;
      getAgents: () => Promise<
        Array<{
          id: number;
          sessionId: string;
          isWaiting: boolean;
          folderName?: string;
        }>
      >;
      getTerminalSessions: () => Promise<
        Array<{
          id: number;
          sessionId: string;
          folderName?: string;
        }>
      >;
      sendTerminalInput: (id: number, text: string) => void;
      onAgentEvent: (callback: (eventType: string, data: unknown) => void) => void;
      onTerminalEvent: (callback: (message: unknown) => void) => void;
    };
  }
}

export {};
