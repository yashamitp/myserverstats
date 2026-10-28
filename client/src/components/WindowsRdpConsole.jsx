import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  Download,
  Key,
  Maximize2,
  Minimize2,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Terminal as TerminalIcon,
  Activity,
  Folder,
  Trash2,
  HardDrive,
  Cpu,
  Clock,
  ExternalLink,
  Power,
  X,
  Minus,
  Square
} from 'lucide-react';

export default function WindowsRdpConsole({ server }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [activeWindow, setActiveWindow] = useState('powershell'); // 'powershell', 'serverManager', 'taskManager', null
  const [windowMinimized, setWindowMinimized] = useState({ powershell: false, serverManager: false, taskManager: false });
  const [latencyMs, setLatencyMs] = useState(28);
  const [connectedDuration, setConnectedDuration] = useState(0);

  // Simulated PowerShell Terminal state inside Windows GUI
  const [psHistory, setPsHistory] = useState([
    { type: 'banner', text: 'Windows PowerShell\r\nCopyright (C) Microsoft Corporation. All rights reserved.\r\n' },
    { type: 'info', text: `Connected to ${server.name} (${server.hostname}:${server.port || 3389}) via Remote Desktop Session Host\r\n` }
  ]);
  const [psInput, setPsInput] = useState('');
  const psEndRef = useRef(null);
  const containerRef = useRef(null);

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setConnectedDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Scroll terminal to bottom
  useEffect(() => {
    if (activeWindow === 'powershell') {
      psEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [psHistory, activeWindow]);

  // Download .rdp connection file for native 1-click client launch
  const downloadRdpFile = () => {
    const host = server.hostname;
    const port = server.port || 3389;
    const user = server.username || 'Administrator';

    const rdpContent = [
      'screen mode id:i:2',
      'use multimon:i:0',
      'desktopwidth:i:1920',
      'desktopheight:i:1080',
      'session bpp:i:32',
      'winposstr:s:0,3,0,0,800,600',
      'compression:i:1',
      'keyboardhook:i:2',
      'audiomode:i:0',
      'redirectprinters:i:0',
      'redirectcomports:i:0',
      'redirectsmartcards:i:1',
      'redirectclipboard:i:1',
      'displayconnectionbar:i:1',
      'autoreconnection enabled:i:1',
      'authentication level:i:2',
      'prompt for credentials:i:1',
      'negotiate security layer:i:1',
      `full address:s:${host}:${port}`,
      `username:s:${user}`
    ].join('\r\n');

    const blob = new Blob([rdpContent], { type: 'application/x-rdp' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${server.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_RDP.rdp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy mstsc command to clipboard
  const copyMstscCommand = () => {
    const cmd = `mstsc /v:${server.hostname}:${server.port || 3389}`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Handle simulated PowerShell command execution
  const handlePsSubmit = (e) => {
    e.preventDefault();
    const cmd = psInput.trim();
    if (!cmd) return;

    const userPrompt = `PS C:\\Users\\${server.username || 'Administrator'}> ${cmd}`;
    const newItems = [{ type: 'command', text: userPrompt }];

    const lower = cmd.toLowerCase();
    if (lower === 'cls' || lower === 'clear') {
      setPsHistory([]);
      setPsInput('');
      return;
    } else if (lower === 'hostname') {
      newItems.push({ type: 'output', text: `${server.name.toUpperCase().replace(/\s+/g, '-')}-WIN` });
    } else if (lower === 'whoami') {
      newItems.push({ type: 'output', text: `${server.name.toUpperCase()}\\${server.username || 'Administrator'}` });
    } else if (lower === 'ipconfig') {
      newItems.push({
        type: 'output',
        text: `Windows IP Configuration\r\n\r\nEthernet adapter Ethernet 1:\r\n   Connection-specific DNS Suffix  . :\r\n   Link-local IPv6 Address . . . . . : fe80::2c61:815:b3d:e89a%4\r\n   IPv4 Address. . . . . . . . . . . : ${server.hostname}\r\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\r\n   Default Gateway . . . . . . . . . : ${server.hostname.replace(/\\d+$/, '1')}`
      });
    } else if (lower.startsWith('get-process') || lower === 'ps' || lower === 'tasklist') {
      newItems.push({
        type: 'output',
        text: `Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id ProcessName\r\n-------  ------    -----      -----     ------     -- -----------\r\n      0       0        0          4       0.80      4 System\r\n     64       5     1420       4200       0.12    368 smss\r\n    180       9     2840       7600       0.35    452 csrss\r\n    120       7     2100       6400       0.10    560 wininit\r\n    450      18     6200      18400       0.40    640 services\r\n    280      12     4800      14200       0.25    652 lsass\r\n    980      45    18400      42000       1.45    912 svchost (TermService)\r\n   1420      68    38200      78400       2.10   1480 explorer\r\n    380      22     8400      22100       0.45   1640 taskhostw\r\n    420      24    12400      26800       0.85   2840 wsmprovhost`
      });
    } else if (lower.startsWith('get-service') || lower === 'services') {
      newItems.push({
        type: 'output',
        text: `Status   Name               DisplayName\r\n------   ----               -----------\r\nRunning  Dnscache           DNS Client\r\nRunning  EventLog           Windows Event Log\r\nRunning  LanmanServer       Server (SMB)\r\nRunning  MpsSvc             Windows Defender Firewall\r\nRunning  RpcSs              Remote Procedure Call (RPC)\r\nRunning  TermService        Remote Desktop Services\r\nRunning  WinDefend          Microsoft Defender Antivirus\r\nRunning  WinRM              Windows Remote Management`
      });
    } else if (lower === 'systeminfo') {
      newItems.push({
        type: 'output',
        text: `Host Name:                 ${server.name.toUpperCase()}-WIN\r\nOS Name:                   Microsoft Windows Server 2022 Datacenter\r\nOS Version:                10.0.20348 N/A Build 20348\r\nOS Manufacturer:           Microsoft Corporation\r\nSystem Type:               x64-based PC\r\nTotal Physical Memory:     16,384 MB\r\nAvailable Physical Memory: 10,240 MB\r\nDomain:                    WORKGROUP\r\nRemote Desktop:            Enabled (Port ${server.port || 3389})`
      });
    } else if (lower === 'help' || lower === '?') {
      newItems.push({
        type: 'output',
        text: `Available commands in Windows console:\r\n  hostname    - Display machine host name\r\n  whoami      - Display current security principal\r\n  ipconfig    - Display network configuration\r\n  Get-Process - List active Windows processes\r\n  Get-Service - List Windows system services\r\n  systeminfo  - Display full Windows system specifications\r\n  cls         - Clear terminal display`
      });
    } else {
      newItems.push({
        type: 'output',
        text: `'${cmd}' is recognized as an internal command. Type 'help' for available diagnostic probes.`
      });
    }

    setPsHistory((prev) => [...prev, ...newItems]);
    setPsInput('');
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div
      ref={containerRef}
      className={`bg-dark-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* Top RDP Session Header / Toolbar */}
      <div className="bg-[#111827] border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
        {/* Left: Server details & RDP status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-slate-100">{server.name}</span>
            <span className="text-slate-400 font-mono text-[11px]">({server.hostname}:{server.port || 3389})</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-950/70 border border-blue-800/80 text-blue-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            <span>RDP Active (GUI)</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 font-mono">
            <span>Latency:</span>
            <span className="text-emerald-400">{latencyMs} ms</span>
          </div>
        </div>

        {/* Right: Actions (1-Click Launch RDP, Copy mstsc, Fullscreen, etc.) */}
        <div className="flex items-center gap-2">
          {/* Duration */}
          <div className="hidden md:flex items-center gap-1 text-slate-400 font-mono mr-2 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{formatTimer(connectedDuration)}</span>
          </div>

          {/* 1-Click Launch Native RDP client */}
          <button
            type="button"
            onClick={downloadRdpFile}
            title="Download .rdp file to launch Microsoft Remote Desktop Connection"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Launch Native RDP</span>
          </button>

          {/* Copy mstsc command */}
          <button
            type="button"
            onClick={copyMstscCommand}
            title="Copy 'mstsc /v:...' command line to clipboard"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dark-800 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Send Ctrl+Alt+Del */}
          <button
            type="button"
            onClick={() => {
              setActiveWindow('taskManager');
              setWindowMinimized((prev) => ({ ...prev, taskManager: false }));
            }}
            title="Send Ctrl+Alt+Del (Open Task Manager)"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-300 border border-slate-700/60 font-medium transition-colors text-[11px]"
          >
            <Key className="w-3 h-3 text-amber-400" />
            <span>Ctrl+Alt+Del</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dark-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main RDP Graphical Desktop Display */}
      <div
        className="relative w-full h-[460px] sm:h-[540px] bg-gradient-to-br from-[#0c2340] via-[#0a192f] to-[#040d1a] overflow-hidden select-none"
        onClick={() => setStartMenuOpen(false)}
      >
        {/* Windows Desktop Background Grid Texture */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        {/* Windows Server System Watermark (Bottom Right) */}
        <div className="absolute bottom-14 right-6 text-right pointer-events-none opacity-40 text-white font-sans text-xs">
          <div className="font-semibold text-sm">Windows Server 2022 Datacenter</div>
          <div className="text-[11px]">Evaluation copy. Build 20348</div>
          <div className="text-[10px] font-mono mt-0.5">RDP Port 3389 • {server.hostname}</div>
        </div>

        {/* Windows Desktop Icons */}
        <div className="absolute top-4 left-4 flex flex-col gap-5 text-white text-xs z-10">
          {/* This PC */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setActiveWindow('serverManager');
              setWindowMinimized((prev) => ({ ...prev, serverManager: false }));
            }}
            className="flex flex-col items-center gap-1.5 w-20 p-2 rounded hover:bg-white/10 cursor-pointer transition-colors group"
          >
            <div className="w-10 h-10 rounded bg-blue-600/80 border border-blue-400/40 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <HardDrive className="w-6 h-6 text-white" />
            </div>
            <span className="text-[11px] text-center drop-shadow-md text-slate-200 font-medium">This PC</span>
          </div>

          {/* Windows PowerShell */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setActiveWindow('powershell');
              setWindowMinimized((prev) => ({ ...prev, powershell: false }));
            }}
            className="flex flex-col items-center gap-1.5 w-20 p-2 rounded hover:bg-white/10 cursor-pointer transition-colors group"
          >
            <div className="w-10 h-10 rounded bg-[#012456] border border-blue-400/40 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <TerminalIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-[11px] text-center drop-shadow-md text-slate-200 font-medium">PowerShell</span>
          </div>

          {/* Server Manager */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setActiveWindow('serverManager');
              setWindowMinimized((prev) => ({ ...prev, serverManager: false }));
            }}
            className="flex flex-col items-center gap-1.5 w-20 p-2 rounded hover:bg-white/10 cursor-pointer transition-colors group"
          >
            <div className="w-10 h-10 rounded bg-emerald-600/80 border border-emerald-400/40 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-[11px] text-center drop-shadow-md text-slate-200 font-medium">Server Manager</span>
          </div>

          {/* Task Manager */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setActiveWindow('taskManager');
              setWindowMinimized((prev) => ({ ...prev, taskManager: false }));
            }}
            className="flex flex-col items-center gap-1.5 w-20 p-2 rounded hover:bg-white/10 cursor-pointer transition-colors group"
          >
            <div className="w-10 h-10 rounded bg-purple-600/80 border border-purple-400/40 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <span className="text-[11px] text-center drop-shadow-md text-slate-200 font-medium">Task Manager</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* WINDOW 1: INTERACTIVE WINDOWS POWERSHELL TERMINAL WINDOW */}
        {/* ========================================================= */}
        {activeWindow === 'powershell' && !windowMinimized.powershell && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-2 sm:top-8 left-2 sm:left-28 right-2 sm:right-8 bottom-14 sm:bottom-16 bg-[#012456] border border-[#0d47a1] rounded-lg shadow-2xl flex flex-col overflow-hidden z-20"
          >
            {/* PowerShell Titlebar */}
            <div className="bg-[#0c3975] px-3 py-1.5 flex items-center justify-between text-xs text-white border-b border-[#0d47a1]">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-3.5 h-3.5 text-blue-300" />
                <span className="font-semibold text-[11px] truncate max-w-[200px] sm:max-w-none">Administrator: Windows PowerShell</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setWindowMinimized((prev) => ({ ...prev, powershell: true }))}
                  className="p-1 hover:bg-white/20 rounded"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWindow(null)}
                  className="p-1 hover:bg-rose-600 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* PowerShell Output Canvas */}
            <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-[#eeedf0] leading-relaxed space-y-1">
              {psHistory.map((item, idx) => (
                <div key={idx} className="whitespace-pre-wrap">
                  {item.type === 'command' && (
                    <span className="text-[#eeedf0] font-semibold">{item.text}</span>
                  )}
                  {item.type === 'banner' && (
                    <span className="text-white font-bold">{item.text}</span>
                  )}
                  {item.type === 'info' && (
                    <span className="text-cyan-300">{item.text}</span>
                  )}
                  {item.type === 'output' && (
                    <span className="text-slate-200">{item.text}</span>
                  )}
                </div>
              ))}
              <div ref={psEndRef} />
            </div>

            {/* PowerShell Input Prompt Bar */}
            <form
              onSubmit={handlePsSubmit}
              className="bg-[#011c44] border-t border-[#0c3975] px-3 py-2 flex items-center gap-2 font-mono text-xs"
            >
              <span className="text-white font-semibold whitespace-nowrap">
                <span className="hidden sm:inline">PS C:\Users\{server.username || 'Administrator'}&gt;</span>
                <span className="sm:hidden text-cyan-400">PS&gt;</span>
              </span>
              <input
                type="text"
                value={psInput}
                onChange={(e) => setPsInput(e.target.value)}
                autoFocus
                placeholder="Type command (ipconfig, Get-Process)..."
                className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder-slate-500 text-xs font-mono"
              />
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* WINDOW 2: SERVER MANAGER (System Information)            */}
        {/* ========================================================= */}
        {activeWindow === 'serverManager' && !windowMinimized.serverManager && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-2 sm:top-10 left-2 sm:left-32 right-2 sm:right-12 bottom-14 sm:bottom-20 bg-dark-850 border border-slate-700 rounded-lg shadow-2xl flex flex-col overflow-hidden z-20 text-slate-200"
          >
            {/* Titlebar */}
            <div className="bg-dark-900 px-3 py-1.5 flex items-center justify-between text-xs border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-white">Server Manager • {server.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setWindowMinimized((prev) => ({ ...prev, serverManager: true }))}
                  className="p-1 hover:bg-white/20 rounded"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWindow(null)}
                  className="p-1 hover:bg-rose-600 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Server Manager Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white">Properties for {server.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Windows Server 2022 Datacenter x64</p>
                </div>
                <div className="px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium text-[11px]">
                  RDP Online (Port {server.port || 3389})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-dark-900 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400">Computer Name:</span>
                  <div className="font-semibold text-white font-mono">{server.name.toUpperCase()}-WIN</div>
                </div>
                <div className="p-3 bg-dark-900 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400">Domain / Workgroup:</span>
                  <div className="font-semibold text-white font-mono">WORKGROUP</div>
                </div>
                <div className="p-3 bg-dark-900 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400">Remote Desktop Status:</span>
                  <div className="font-semibold text-emerald-400">Enabled (Allowing connections)</div>
                </div>
                <div className="p-3 bg-dark-900 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400">Windows Firewall:</span>
                  <div className="font-semibold text-white">Public: On (Port 3389 rule active)</div>
                </div>
              </div>

              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold block">Need full desktop GUI interactive session?</span>
                  <span className="text-[11px] opacity-90">Click to launch with your native Windows Remote Desktop client (mstsc.exe).</span>
                </div>
                <button
                  type="button"
                  onClick={downloadRdpFile}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Launch RDP</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* WINDOW 3: TASK MANAGER                                    */}
        {/* ========================================================= */}
        {activeWindow === 'taskManager' && !windowMinimized.taskManager && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-2 sm:top-12 left-2 sm:left-36 right-2 sm:right-16 bottom-14 sm:bottom-20 bg-dark-850 border border-slate-700 rounded-lg shadow-2xl flex flex-col overflow-hidden z-20 text-slate-200"
          >
            {/* Titlebar */}
            <div className="bg-dark-900 px-3 py-1.5 flex items-center justify-between text-xs border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-semibold text-white">Task Manager</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setWindowMinimized((prev) => ({ ...prev, taskManager: true }))}
                  className="p-1 hover:bg-white/20 rounded"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWindow(null)}
                  className="p-1 hover:bg-rose-600 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Task Manager Content */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-dark-900 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">CPU Utilization</div>
                  <div className="text-xl font-bold text-white mt-1">22%</div>
                  <div className="text-[10px] text-slate-500 font-mono">2.60 GHz • 4 Cores</div>
                </div>
                <div className="p-3 bg-dark-900 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Memory</div>
                  <div className="text-xl font-bold text-cyan-400 mt-1">45%</div>
                  <div className="text-[10px] text-slate-500 font-mono">7.2 / 16.0 GB (In Use)</div>
                </div>
                <div className="p-3 bg-dark-900 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Disk C:</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">38%</div>
                  <div className="text-[10px] text-slate-500 font-mono">48 / 128 GB (NTFS)</div>
                </div>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-dark-900 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-2">Name</th>
                      <th className="p-2">PID</th>
                      <th className="p-2">CPU</th>
                      <th className="p-2">Memory</th>
                      <th className="p-2">User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    <tr className="hover:bg-dark-800/60">
                      <td className="p-2 font-medium text-white">explorer.exe</td>
                      <td className="p-2 text-slate-400">1480</td>
                      <td className="p-2 text-emerald-400">2.1%</td>
                      <td className="p-2 text-slate-300">78.4 MB</td>
                      <td className="p-2 text-slate-400">{server.username || 'Administrator'}</td>
                    </tr>
                    <tr className="hover:bg-dark-800/60">
                      <td className="p-2 font-medium text-white">svchost.exe (TermService)</td>
                      <td className="p-2 text-slate-400">912</td>
                      <td className="p-2 text-emerald-400">1.4%</td>
                      <td className="p-2 text-slate-300">42.0 MB</td>
                      <td className="p-2 text-slate-400">NETWORK SERVICE</td>
                    </tr>
                    <tr className="hover:bg-dark-800/60">
                      <td className="p-2 font-medium text-white">MsMpEng.exe</td>
                      <td className="p-2 text-slate-400">2180</td>
                      <td className="p-2 text-emerald-400">1.6%</td>
                      <td className="p-2 text-slate-300">120.4 MB</td>
                      <td className="p-2 text-slate-400">SYSTEM</td>
                    </tr>
                    <tr className="hover:bg-dark-800/60">
                      <td className="p-2 font-medium text-white">wsmprovhost.exe</td>
                      <td className="p-2 text-slate-400">2840</td>
                      <td className="p-2 text-emerald-400">0.8%</td>
                      <td className="p-2 text-slate-300">26.8 MB</td>
                      <td className="p-2 text-slate-400">SYSTEM</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Windows Start Menu Popup */}
        {startMenuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-12 left-2 w-72 bg-[#1f2937]/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl z-30 p-3 text-slate-200 select-none animate-in fade-in slide-in-from-bottom-2 duration-150"
          >
            {/* User Header */}
            <div className="flex items-center gap-3 p-2 border-b border-slate-700 pb-3 mb-2">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm shadow">
                {(server.username || 'A')[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <div className="font-semibold text-white truncate text-xs">{server.username || 'Administrator'}</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">{server.hostname}</div>
              </div>
            </div>

            {/* Apps List */}
            <div className="space-y-1 text-xs">
              <div
                onClick={() => {
                  setActiveWindow('powershell');
                  setWindowMinimized((prev) => ({ ...prev, powershell: false }));
                  setStartMenuOpen(false);
                }}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
              >
                <TerminalIcon className="w-4 h-4 text-blue-400" />
                <span>Windows PowerShell</span>
              </div>

              <div
                onClick={() => {
                  setActiveWindow('serverManager');
                  setWindowMinimized((prev) => ({ ...prev, serverManager: false }));
                  setStartMenuOpen(false);
                }}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
              >
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Server Manager</span>
              </div>

              <div
                onClick={() => {
                  setActiveWindow('taskManager');
                  setWindowMinimized((prev) => ({ ...prev, taskManager: false }));
                  setStartMenuOpen(false);
                }}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
              >
                <Cpu className="w-4 h-4 text-purple-400" />
                <span>Task Manager</span>
              </div>

              <div
                onClick={() => {
                  downloadRdpFile();
                  setStartMenuOpen(false);
                }}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors text-blue-400 font-semibold"
              >
                <Download className="w-4 h-4" />
                <span>Connect via Microsoft RDP</span>
              </div>
            </div>
          </div>
        )}

        {/* Windows Taskbar at bottom */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 h-11 bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-700/80 px-2 flex items-center justify-between text-xs z-30 select-none"
        >
          {/* Left: Start Button & Taskbar Pinned Apps */}
          <div className="flex items-center gap-1 h-full">
            {/* Start Button */}
            <button
              type="button"
              onClick={() => setStartMenuOpen(!startMenuOpen)}
              className={`h-9 px-2.5 rounded-lg flex items-center justify-center transition-colors ${
                startMenuOpen ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
            >
              {/* Windows 4-Square Logo */}
              <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
                <div className="bg-blue-400 rounded-[1px]" />
                <div className="bg-blue-400 rounded-[1px]" />
                <div className="bg-blue-400 rounded-[1px]" />
                <div className="bg-blue-400 rounded-[1px]" />
              </div>
            </button>

            {/* Taskbar App Tabs */}
            <button
              type="button"
              onClick={() => {
                setActiveWindow('powershell');
                setWindowMinimized((prev) => ({ ...prev, powershell: !prev.powershell }));
              }}
              className={`h-9 px-2 sm:px-3 rounded-lg flex items-center gap-1.5 transition-colors text-[11px] ${
                activeWindow === 'powershell' && !windowMinimized.powershell
                  ? 'bg-blue-600/30 border border-blue-500/40 text-white font-medium'
                  : 'text-slate-400 hover:bg-white/10'
              }`}
            >
              <TerminalIcon className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">PowerShell</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveWindow('serverManager');
                setWindowMinimized((prev) => ({ ...prev, serverManager: !prev.serverManager }));
              }}
              className={`h-9 px-2 sm:px-3 rounded-lg flex items-center gap-1.5 transition-colors text-[11px] ${
                activeWindow === 'serverManager' && !windowMinimized.serverManager
                  ? 'bg-emerald-600/30 border border-emerald-500/40 text-white font-medium'
                  : 'text-slate-400 hover:bg-white/10'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Server Manager</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveWindow('taskManager');
                setWindowMinimized((prev) => ({ ...prev, taskManager: !prev.taskManager }));
              }}
              className={`h-9 px-2 sm:px-3 rounded-lg flex items-center gap-1.5 transition-colors text-[11px] ${
                activeWindow === 'taskManager' && !windowMinimized.taskManager
                  ? 'bg-purple-600/30 border border-purple-500/40 text-white font-medium'
                  : 'text-slate-400 hover:bg-white/10'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Task Manager</span>
            </button>
          </div>

          {/* Right: System Tray (Network, Sound, Clock) */}
          <div className="flex items-center gap-3 px-2 text-[11px] text-slate-300">
            <span className="text-slate-400 font-medium">ENG</span>
            <div className="flex flex-col text-right leading-tight font-mono text-[10px]">
              <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-slate-400">{currentTime.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info Banner */}
      <div className="bg-dark-850 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Windows Remote Desktop (RDP) Protocol • Port {server.port || 3389} Active</span>
        </div>
        <span>Use 'Launch Native RDP' to open standard Microsoft Remote Desktop Connection on your PC</span>
      </div>
    </div>
  );
}
