export interface AgentState {
  id: number;
  uid: string; // Unique ID for persistence
  sessionId: string;
  isExternal: boolean;
  projectDir: string;
  workspaceDir?: string;
  jsonlFile: string;
  fileOffset: number;
  lineBuffer: string;
  activeToolIds: Set<string>;
  activeToolStatuses: Map<string, string>;
  activeToolNames: Map<string, string>;
  activeSubagentToolIds: Map<string, Set<string>>;
  activeSubagentToolNames: Map<string, Map<string, string>>;
  backgroundAgentToolIds: Set<string>;
  isWaiting: boolean;
  permissionSent: boolean;
  hadToolsInTurn: boolean;
  folderName?: string;
  lastDataAt: number;
  linesProcessed: number;
  seenUnknownRecordTypes: Set<string>;
  hookDelivered: boolean;
  // Custom fields
  palette?: number;
  hueShift?: number;
  name?: string;
  history: string[];
}

export interface PersistedAgent {
  id: number;
  sessionId?: string;
  isExternal?: boolean;
  jsonlFile: string;
  projectDir: string;
  folderName?: string;
  processId?: number;
}

export interface AgentCreatedEvent {
  type: 'agentCreated';
  id: number;
  folderName?: string;
  isExternal?: boolean;
  palette?: number;
  hueShift?: number;
  name?: string;
}

export interface AgentClosedEvent {
  type: 'agentClosed';
  id: number;
}

export interface AgentToolStartEvent {
  type: 'agentToolStart';
  id: number;
  toolId: string;
  status: string;
  toolName: string;
  permissionActive?: boolean;
}

export interface AgentToolDoneEvent {
  type: 'agentToolDone';
  id: number;
  toolId: string;
}

export interface AgentToolsClearEvent {
  type: 'agentToolsClear';
  id: number;
}

export interface AgentStatusEvent {
  type: 'agentStatus';
  id: number;
  status: 'waiting' | 'active' | 'idle';
}

export type AgentEvent =
  | AgentCreatedEvent
  | AgentClosedEvent
  | AgentToolStartEvent
  | AgentToolDoneEvent
  | AgentToolsClearEvent
  | AgentStatusEvent;
