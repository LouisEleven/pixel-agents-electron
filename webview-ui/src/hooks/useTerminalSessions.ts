import { useEffect, useMemo, useState } from 'react';

export interface TerminalSession {
  id: number;
  sessionId: string;
  folderName?: string;
  output: string;
}

interface TerminalSessionInfo {
  id: number;
  sessionId: string;
  folderName?: string;
  output?: string;
}

type TerminalEvent =
  | { type: 'terminal-session'; session: TerminalSessionInfo }
  | { type: 'terminal-output'; id: number; chunk?: string }
  | { type: 'terminal-exit'; id: number };

export function useTerminalSessions(onNewSession?: () => void) {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.getTerminalSessions) return;

    void window.electronAPI.getTerminalSessions().then((items: TerminalSessionInfo[]) => {
      setSessions(
        items.map((item: TerminalSessionInfo) => ({ ...item, output: item.output ?? '' })),
      );
      setActiveSessionId((prev) => prev ?? items.at(-1)?.id ?? null);
    });

    window.electronAPI?.onTerminalEvent?.((message: unknown) => {
      const event = message as TerminalEvent;

      if (event.type === 'terminal-session') {
        setSessions((prev) => {
          if (prev.some((session) => session.id === event.session.id)) return prev;
          return [...prev, { ...event.session, output: '' }];
        });
        setActiveSessionId(event.session.id);
        onNewSession?.();
        return;
      }

      if (event.type === 'terminal-output') {
        setSessions((prev) =>
          prev.map((session) =>
            session.id === event.id
              ? { ...session, output: `${session.output}${event.chunk ?? ''}`.slice(-40000) }
              : session,
          ),
        );
        setActiveSessionId((prev) => prev ?? event.id);
        return;
      }

      if (event.type === 'terminal-exit') {
        setSessions((prev) => prev.filter((session) => session.id !== event.id));
        setActiveSessionId((prev) => (prev === event.id ? null : prev));
      }
    });
  }, []);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );

  const sendInput = (text: string) => {
    if (!activeSessionId || !window.electronAPI?.sendTerminalInput) return;
    window.electronAPI.sendTerminalInput(activeSessionId, text);
  };

  const selectSession = (id: number) => {
    setActiveSessionId(id);
    window.electronAPI?.focusAgent?.(id);
  };

  return {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId: selectSession,
    sendInput,
  };
}
