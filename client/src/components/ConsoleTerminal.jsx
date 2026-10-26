import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useSocket } from '../contexts/SocketContext';
import WindowsRdpConsole from './WindowsRdpConsole';
import {
  Terminal as TerminalIcon,
  RefreshCw,
  Power,
  Trash2,
  Copy,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function ConsoleTerminal({ server }) {
  const isWindows = server.os?.distro === 'windows' || server.port === 3389 || server.monitoringMethod === 'rdp';
  if (isWindows) {
    return <WindowsRdpConsole server={server} />;
  }

  const { socket, isConnected: isSocketConnected } = useSocket();
  const terminalRef = useRef(null);
  const xtermInstance = useRef(null);
  const fitAddonInstance = useRef(null);

  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connecting', 'connected', 'disconnected', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [durationSec, setDurationSec] = useState(0);

  // References to eliminate stale closures in event listeners
  const sessionIdRef = useRef(null);
  const socketRef = useRef(null);
  const autoConnectedRef = useRef(false);

  // Keep refs in sync with current state/props
  sessionIdRef.current = sessionId;
  socketRef.current = socket;

  const shellName = 'Bash / Sh';

  // Duration timer
  useEffect(() => {
    let interval = null;
    if (connectionStatus === 'connected' && sessionStartTime) {
      interval = setInterval(() => {
        setDurationSec(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
    } else {
      setDurationSec(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connectionStatus, sessionStartTime]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Initialize terminal and connect session
  const startSession = () => {
    const activeSocket = socketRef.current || socket;
    if (!activeSocket) {
      setConnectionStatus('error');
      setErrorMessage('WebSocket connection to AgentOps server is unavailable.');
      return;
    }

    setConnectionStatus('connecting');
    setErrorMessage('');

    if (xtermInstance.current) {
      xtermInstance.current.clear();
      xtermInstance.current.writeln('\x1b[38;5;39m=== Establishing Secure Shell Console Session ===\x1b[0m');
      xtermInstance.current.writeln(`\x1b[90mTarget: ${server.name} (${server.hostname}:${server.port || 22})\x1b[0m`);
      xtermInstance.current.writeln(`\x1b[90mShell: ${shellName} via Host-Verified OpenSSH\x1b[0m`);
      xtermInstance.current.focus();
    }

    const cols = xtermInstance.current?.cols || 80;
    const rows = xtermInstance.current?.rows || 24;

    activeSocket.emit('console:start', {
      serverId: server._id,
      cols,
      rows
    });
  };

  // Disconnect session
  const disconnectSession = () => {
    const activeSessionId = sessionIdRef.current;
    const activeSocket = socketRef.current;
    if (activeSocket && activeSessionId) {
      activeSocket.emit('console:close', { sessionId: activeSessionId });
    }
    if (xtermInstance.current) {
      xtermInstance.current.writeln('\r\n\x1b[33m[Session disconnected by user]\x1b[0m\r\n');
    }
    setConnectionStatus('disconnected');
    setSessionId(null);
    sessionIdRef.current = null;
    setSessionStartTime(null);
  };

  // Clear terminal
  const clearTerminal = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
      xtermInstance.current.focus();
    }
  };

  // Copy selection or buffer
  const copyTerminalSelection = () => {
    if (!xtermInstance.current) return;
    const selection = xtermInstance.current.getSelection();
    if (selection) {
      navigator.clipboard.writeText(selection);
    }
  };

  // Setup xterm instance once on mount
  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      convertEol: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      theme: {
        background: '#090d16',
        foreground: '#e2e8f0',
        cursor: '#38bdf8',
        selectionBackground: 'rgba(56, 189, 248, 0.3)',
        black: '#0f172a',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#fbbf24',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#38bdf8',
        white: '#f1f5f9',
        brightBlack: '#475569',
        brightRed: '#ef4444',
        brightGreen: '#22c55e',
        brightYellow: '#f59e0b',
        brightBlue: '#3b82f6',
        brightMagenta: '#a855f7',
        brightCyan: '#06b6d4',
        brightWhite: '#ffffff'
      }
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);

    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch (e) {}
    }, 100);

    xtermInstance.current = term;
    fitAddonInstance.current = fitAddon;

    term.writeln('\x1b[38;5;39mAgentOps 2.0 Web Console\x1b[0m');
    term.writeln(`Click 'Connect Session' to launch an interactive remote terminal on ${server.name}.\r\n`);
    term.focus();

    // Handle input typed in terminal - accesses refs to prevent stale closure!
    const onDataDisposable = term.onData((data) => {
      const activeSessionId = sessionIdRef.current;
      const activeSocket = socketRef.current;
      if (activeSessionId && activeSocket) {
        activeSocket.emit('console:input', { sessionId: activeSessionId, data });
      }
    });

    // Handle window resize
    const handleResize = () => {
      try {
        fitAddon.fit();
        const activeSessionId = sessionIdRef.current;
        const activeSocket = socketRef.current;
        if (activeSessionId && activeSocket && term.cols && term.rows) {
          activeSocket.emit('console:resize', {
            sessionId: activeSessionId,
            cols: term.cols,
            rows: term.rows
          });
        }
      } catch (e) {}
    };

    window.addEventListener('resize', handleResize);

    // Clipboard paste support into terminal
    const handlePaste = (e) => {
      const text = e.clipboardData?.getData('text');
      const activeSessionId = sessionIdRef.current;
      const activeSocket = socketRef.current;
      if (text && activeSessionId && activeSocket) {
        activeSocket.emit('console:input', { sessionId: activeSessionId, data: text });
      }
    };

    const termContainer = terminalRef.current;
    const handleContainerClick = () => {
      term.focus();
    };

    if (termContainer) {
      termContainer.addEventListener('paste', handlePaste);
      termContainer.addEventListener('click', handleContainerClick);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (termContainer) {
        termContainer.removeEventListener('paste', handlePaste);
        termContainer.removeEventListener('click', handleContainerClick);
      }
      onDataDisposable.dispose();
      term.dispose();
      xtermInstance.current = null;
      fitAddonInstance.current = null;
    };
  }, []);

  // Auto-connect once socket is ready
  useEffect(() => {
    if (isSocketConnected && socket && connectionStatus === 'disconnected' && !autoConnectedRef.current) {
      autoConnectedRef.current = true;
      startSession();
    }
  }, [isSocketConnected, socket]);

  // Socket event listeners for console
  useEffect(() => {
    if (!socket) return;

    const onConsoleReady = (data) => {
      setSessionId(data.sessionId);
      sessionIdRef.current = data.sessionId;
      setConnectionStatus('connected');
      setSessionStartTime(Date.now());
      setErrorMessage('');

      if (xtermInstance.current) {
        xtermInstance.current.writeln(`\x1b[32m✔ Shell session authenticated and ready (${data.distroName || shellName})\x1b[0m\r\n`);
        xtermInstance.current.focus();
      }
    };

    const onConsoleOutput = (data) => {
      if (xtermInstance.current && data.data) {
        xtermInstance.current.write(data.data);
      }
    };

    const onConsoleClosed = (data) => {
      setConnectionStatus('disconnected');
      setSessionId(null);
      sessionIdRef.current = null;
      setSessionStartTime(null);
      if (xtermInstance.current) {
        xtermInstance.current.writeln(`\r\n\x1b[31m[Session terminated: ${data.reason || 'Closed by remote host'}]\x1b[0m\r\n`);
      }
    };

    const onConsoleError = (data) => {
      setConnectionStatus('error');
      setErrorMessage(data.message || 'Console connection error occurred');
      if (xtermInstance.current) {
        xtermInstance.current.writeln(`\r\n\x1b[31m[Connection Error: ${data.message || 'Unknown error'}]\x1b[0m\r\n`);
      }
    };

    socket.on('console:ready', onConsoleReady);
    socket.on('console:output', onConsoleOutput);
    socket.on('console:closed', onConsoleClosed);
    socket.on('console:error', onConsoleError);

    return () => {
      socket.off('console:ready', onConsoleReady);
      socket.off('console:output', onConsoleOutput);
      socket.off('console:closed', onConsoleClosed);
      socket.off('console:error', onConsoleError);
    };
  }, [socket]);

  // Cleanup active session only when component unmounts
  useEffect(() => {
    return () => {
      const activeSessionId = sessionIdRef.current;
      const activeSocket = socketRef.current;
      if (activeSessionId && activeSocket) {
        activeSocket.emit('console:close', { sessionId: activeSessionId });
      }
    };
  }, []);

  return (
    <div className="bg-dark-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-lg">
      {/* Terminal Toolbar */}
      <div className="bg-dark-850 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Server info & status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-brand-400" />
            <span className="font-semibold text-slate-200">{server.name}</span>
            <span className="text-slate-500 font-mono">({server.hostname})</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-dark-800">
            <span className="capitalize text-slate-300">{shellName}</span>
          </div>

          {/* Connection Status Pill */}
          <div className="flex items-center gap-1.5">
            {connectionStatus === 'connected' && (
              <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Connected
              </span>
            )}
            {connectionStatus === 'connecting' && (
              <span className="flex items-center gap-1.5 text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2.5 py-0.5 rounded-full font-medium">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Connecting...
              </span>
            )}
            {connectionStatus === 'disconnected' && (
              <span className="text-slate-400 bg-slate-800/60 border border-slate-700/60 px-2.5 py-0.5 rounded-full font-medium">
                Disconnected
              </span>
            )}
            {connectionStatus === 'error' && (
              <span className="flex items-center gap-1 text-rose-400 bg-rose-950/60 border border-rose-800/80 px-2.5 py-0.5 rounded-full font-medium">
                <AlertCircle className="w-3 h-3" />
                Connection Error
              </span>
            )}
          </div>
        </div>

        {/* Right: Duration & Actions */}
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' && (
            <div className="flex items-center gap-1 text-slate-400 font-mono mr-2">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatTimer(durationSec)}</span>
            </div>
          )}

          {connectionStatus === 'connected' ? (
            <button
              type="button"
              onClick={disconnectSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors font-medium"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startSession}
              disabled={connectionStatus === 'connecting'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-colors font-medium shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
              <span>{connectionStatus === 'error' ? 'Retry Connection' : 'Connect Session'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={copyTerminalSelection}
            title="Copy Selection"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dark-800 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={clearTerminal}
            title="Clear Terminal Screen"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dark-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="bg-rose-950/40 border-b border-rose-900/60 px-4 py-2 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Terminal Viewport */}
      <div
        ref={terminalRef}
        className="w-full h-[520px] p-2 bg-[#090d16] overflow-hidden cursor-text"
      />

      {/* Terminal Security Notice Footer */}
      <div className="bg-dark-850/80 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Encrypted PTY Channel • Server-side credentials • Host key verified</span>
        </div>
        <span>Idle timeout: 15 min</span>
      </div>
    </div>
  );
}
