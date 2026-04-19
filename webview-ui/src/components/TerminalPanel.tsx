import '@xterm/xterm/css/xterm.css';

import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { useEffect, useRef } from 'react';

import type { TerminalSession } from '../hooks/useTerminalSessions.js';

interface TerminalPanelProps {
  isOpen: boolean;
  activeSessionId: number | null;
  activeSession: TerminalSession | null;
}

export function TerminalPanel({ isOpen, activeSessionId, activeSession }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lastSessionIdRef = useRef<number | null>(null);
  const writtenLengthRef = useRef<Map<number, number>>(new Map());
  const activeSessionIdRef = useRef<number | null>(activeSessionId);

  const focusTerminal = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        xtermRef.current?.focus();
      });
    });
  };

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    if (!isOpen) return;
    if (!containerRef.current) return;

    if (!xtermRef.current) {
      const term = new Terminal({
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 13,
        lineHeight: 1.2,
        theme: {
          background: '#1e1e1e',
          foreground: '#cccccc',
          cursor: '#cccccc',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#ffffff',
        },
        cursorBlink: true,
        cursorStyle: 'bar',
        scrollback: 5000,
        allowTransparency: false,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      term.open(containerRef.current);

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      term.onData((data) => {
        const targetSessionId = activeSessionIdRef.current;
        if (targetSessionId && window.electronAPI?.sendTerminalInput) {
          window.electronAPI.sendTerminalInput(targetSessionId, data);
        }
      });

      const resizeObserver = new ResizeObserver(() => {
        try {
          fitAddonRef.current?.fit();
        } catch {
          // Ignore fit errors
        }
      });
      resizeObserver.observe(containerRef.current);

      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          focusTerminal();
        } catch {
          // Ignore
        }
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!xtermRef.current || !activeSession) return;

    if (lastSessionIdRef.current !== activeSession.id) {
      xtermRef.current.clear();
      xtermRef.current.write(activeSession.output);
      writtenLengthRef.current.set(activeSession.id, activeSession.output.length);
      lastSessionIdRef.current = activeSession.id;
    } else {
      const prevLength = writtenLengthRef.current.get(activeSession.id) || 0;
      const newOutput = activeSession.output;
      if (newOutput.length > prevLength) {
        xtermRef.current.write(newOutput.slice(prevLength));
        writtenLengthRef.current.set(activeSession.id, newOutput.length);
        xtermRef.current.scrollToBottom();
      }
    }
  }, [activeSessionId, activeSession]);

  useEffect(() => {
    if (isOpen && xtermRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          focusTerminal();
        } catch {
          // Ignore
        }
      }, 50);
    }
  }, [isOpen, activeSessionId]);

  // Focus terminal on session change
  useEffect(() => {
    if (xtermRef.current && activeSessionId) {
      setTimeout(() => {
        focusTerminal();
      }, 50);
    }
  }, [activeSessionId]);

  if (!isOpen) return null;

  return (
    <div className="flex h-full bg-[#1e1e1e]">
      <div
        className="flex-1 min-w-0 relative"
        onClick={() => xtermRef.current?.focus()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files);
          for (const file of files) {
            const filePath = (file as File & { path?: string }).path || file.name;
            if (activeSessionId && window.electronAPI?.sendTerminalInput) {
              window.electronAPI.sendTerminalInput(activeSessionId, `"${filePath}" `);
            }
          }
        }}
      >
        <div ref={containerRef} className="absolute inset-0 p-2" />
      </div>
    </div>
  );
}
