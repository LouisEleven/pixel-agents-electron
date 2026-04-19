import { useEffect, useRef, useState, useCallback } from 'react';
import { OfficeState } from './officeState.js';
import { renderFrame } from './renderer.js';
import { MAX_DELTA_TIME_SEC } from './constants.js';

declare global {
  interface Window {
    electronAPI: {
      launchAgent: (options?: {
        cwd?: string;
        bypassPermissions?: boolean;
        name?: string;
        palette?: number;
        hueShift?: number;
      }) => Promise<number>;
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
      onAgentEvent: (callback: (eventType: string, data: unknown) => void) => void;
    };
  }
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const officeRef = useRef(new OfficeState());
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const panRef = useRef({ x: 0, y: 0 });
  const [agents, setAgents] = useState<number[]>([]);

  const update = useCallback((dt: number) => {
    officeRef.current.update(dt);
  }, []);

  const render = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderFrame(
      ctx,
      canvas.width,
      canvas.height,
      officeRef.current.tileMap,
      officeRef.current.furniture,
      officeRef.current.getCharacters(),
      2,
      panRef.current.x,
      panRef.current.y,
    );
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const frame = (time: number) => {
      const dt =
        lastTimeRef.current === 0
          ? 0
          : Math.min((time - lastTimeRef.current) / 1000, MAX_DELTA_TIME_SEC);
      lastTimeRef.current = time;

      update(dt);
      render(ctx);

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [update, render]);

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onAgentEvent((eventType, data) => {
      switch (eventType) {
        case 'agentCreated': {
          const { id } = data as { id: number };
          setAgents((prev) => [...prev, id]);
          officeRef.current.addAgent(id);
          break;
        }
        case 'agentClosed': {
          const { id } = data as { id: number };
          setAgents((prev) => prev.filter((a) => a !== id));
          officeRef.current.removeAgent(id);
          break;
        }
        case 'agentStatus': {
          const { id, status } = data as { id: number; status: string };
          officeRef.current.setAgentActive(id, status === 'active');
          if (status === 'waiting') {
            officeRef.current.showWaitingBubble(id);
          }
          break;
        }
        case 'agentToolStart': {
          const { id, toolName } = data as { id: number; toolName: string };
          officeRef.current.setAgentTool(id, toolName);
          break;
        }
        case 'agentToolDone':
        case 'agentToolsClear': {
          const { id } = data as { id: number };
          officeRef.current.setAgentTool(id, null);
          break;
        }
      }
    });
  }, []);

  const handleLaunchAgent = async () => {
    console.log('[App] handleLaunchAgent called');
    console.log('[App] electronAPI:', window.electronAPI);

    if (!window.electronAPI) {
      console.log('[App] No electronAPI!');
      return;
    }

    try {
      console.log('[App] Calling launchAgent...');
      await window.electronAPI.launchAgent();
      console.log('[App] launchAgent returned');
    } catch (error) {
      console.log('[App] launchAgent error:', error);
      const message = error instanceof Error ? error.message : 'Failed to launch agent';
      window.alert(message);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // TODO: Calculate world coordinates with zoom and pan
    const agentId = officeRef.current.getCharacterAt(x, y);
    if (agentId !== null) {
      officeRef.current.selectedAgentId = agentId;
      officeRef.current.cameraFollowId = agentId;
    } else {
      officeRef.current.selectedAgentId = null;
      officeRef.current.cameraFollowId = null;
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#1e1e2e',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          padding: '8px 16px',
          background: '#2a2a3e',
          borderBottom: '2px solid #3d3d5c',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <button
          onClick={handleLaunchAgent}
          style={{
            padding: '8px 16px',
            background: '#4ecdc4',
            color: '#1e1e2e',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
          }}
        >
          + Agent
        </button>
        <span style={{ color: '#cdd6f4', fontSize: '14px' }}>
          {agents.length} agent{agents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight - 50}
        onClick={handleCanvasClick}
        style={{
          flex: 1,
          cursor: 'pointer',
        }}
      />

      {/* Status bar */}
      <div
        style={{
          padding: '4px 16px',
          background: '#2a2a3e',
          borderTop: '2px solid #3d3d5c',
          color: '#6c7086',
          fontSize: '12px',
        }}
      >
        Pixel Agents - Click agent to select
      </div>
    </div>
  );
}
