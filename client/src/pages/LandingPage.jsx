import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Terminal,
  Server,
  Activity,
  Sparkles,
  ShieldCheck,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  Monitor,
  HardDrive,
  Wifi,
  Bell,
  Mail,
  FileText,
  Calendar,
  ChevronRight,
  ExternalLink,
  Shield,
  Zap,
  Check,
  Play,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [activeFeatureTab, setActiveFeatureTab] = useState('cross-platform'); // 'cross-platform', 'consoles', 'ai', 'incidents', 'security'
  const [expandedFaq, setExpandedFaq] = useState(null);

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const featureTabs = [
    {
      id: 'cross-platform',
      name: 'Cross-Platform Monitoring',
      icon: Server,
      badge: 'Linux + Windows',
      title: 'Unified Telemetry Across Linux & Windows Server Fleets',
      description: 'Stop context-switching between separate monitoring tools. AgentOps 2.0 unifies Ubuntu, Debian, and Windows Server 2016/2019/2022 into a normalized, single pane of glass.',
      bullets: [
        'Linux Telemetry: Accurate active-to-total CPU cycles from /proc/stat, real MemAvailable memory accounting, disk mounts, and dynamic Rx/Tx network rates.',
        'Windows Server Telemetry: Automated RDP PDU heartbeat on port 3389, normalized CPU, RAM capacity, volume storage, and interface counters.',
        'Processes & Services: Paginated top processes and real-time service inspections (systemd units and Windows Services like TermService, WinRM, W3SVC, SQL Server).',
        'Event Log Streaming: Live access to Linux journalctl and Windows Event Log streams without installing heavy third-party agents.'
      ],
      previewSnippet: {
        server1: { name: 'prod-ubuntu-cluster-01', os: 'Ubuntu 24.04 LTS', proto: 'SSH:22', cpu: '24.6%', ram: '46.2%', status: 'Healthy' },
        server2: { name: 'win-datacenter-dc-01', os: 'Windows Server 2022', proto: 'RDP:3389', cpu: '32.4%', ram: '54.8%', status: 'Healthy' }
      }
    },
    {
      id: 'consoles',
      name: 'Browser-Based Consoles',
      icon: Terminal,
      badge: 'Interactive & Secure',
      title: 'OS-Aware Administration Consoles Straight in the Browser',
      description: 'Control your servers from anywhere without third-party desktop clients or complex VPNs. The web console automatically adapts to the remote host operating system.',
      bullets: [
        'Windows RDP GUI Desktop: An interactive Windows Server 2022 desktop simulator complete with wallpaper, Start Menu, Server Manager, Task Manager, and PowerShell CLI.',
        '1-Click Native RDP Launcher: Generates and downloads pre-configured .rdp connection files for immediate native Remote Desktop client launching.',
        'Linux Web SSH Terminal: Low-latency interactive terminal powered by xterm.js with server-side PTY allocation, ANSI colors, and copy/paste support.',
        'Session Governance: Active session duration tracking, idle disconnect protection, and concurrency controls.'
      ],
      previewSnippet: {
        type: 'console',
        activeShell: 'PowerShell / Bash PTY',
        encryption: 'AES-256-GCM Session Auth',
        controls: ['Launch Native RDP', 'Interactive Terminal', 'Clear Screen', 'Disconnect']
      }
    },
    {
      id: 'ai',
      name: 'Autonomous AI Diagnostics',
      icon: Sparkles,
      badge: 'Zero Hallucinations',
      title: 'Evidence-Grounded AI Infrastructure Troubleshooting',
      description: 'When an outage occurs, AgentOps AI investigates the root cause in seconds using 10 strictly read-only system diagnostic tools.',
      bullets: [
        'Tool-Calling Architecture: Equipped with tools like get_top_processes, get_cpu_metrics, get_system_services, get_recent_logs, and get_server_info.',
        'Evidence-Grounded Explanations: Zero guessing. Every diagnosis correlates real CPU load averages, memory allocations, and log traces.',
        'Read-Only Safety Guarantee: The AI agent cannot execute arbitrary destructive commands or modify production server state.',
        'Multimodal LLM Support: Powered by Google Gemini and OpenAI models with comprehensive tool calling and structured reasoning.'
      ],
      previewSnippet: {
        type: 'ai',
        query: 'Why is SQL Server consuming elevated CPU on win-datacenter-dc-01?',
        toolsCalled: ['get_top_processes', 'get_cpu_metrics', 'get_system_services'],
        diagnosis: 'Process sqlservr.exe (PID 3180) executing heavy index aggregation (14.2% CPU). System overall CPU is healthy (32.4%). TermService & WinRM fully operational.'
      }
    },
    {
      id: 'incidents',
      name: 'Incident Deduplication',
      icon: Bell,
      badge: 'No Alert Fatigue',
      title: 'Intelligent Incident Management & Multi-Channel Alerts',
      description: 'Eliminate alert fatigue. Continuous metric breaches are grouped into smart incident occurrences with automated recovery and multi-channel notifications.',
      bullets: [
        'Deterministic Fingerprinting: Uniquely identifies breaches by server:metric:severity, incrementing occurrence counters instead of spamming alerts.',
        'Hysteresis & Cooldown: Configurable cooldown durations prevent alert flapping when metrics hover near threshold limits.',
        'Automatic Recovery: Resolves open incidents automatically when system metrics drop back into normal operational thresholds.',
        'In-App Notification Center: Real-time bell notification badge with unread counts and one-click mark-as-read via Socket.IO.',
        'Transactional SMTP Alerts: Alerts delivered strictly to your verified primary login email address.'
      ],
      previewSnippet: {
        type: 'incident',
        title: 'High CPU Utilization Threshold Breached (>80%)',
        occurrences: 6,
        status: 'Active (Deduped)',
        delivery: 'admin@agentops.io • Primary Email Locked'
      }
    },
    {
      id: 'security',
      name: 'Enterprise Security',
      icon: ShieldCheck,
      badge: 'Defense in Depth',
      title: 'Hardened Architecture Designed for Production Workloads',
      description: 'AgentOps treats remote server credentials and outbound connections as critical security boundaries.',
      bullets: [
        'AES-256-GCM Encryption: Passwords, private SSH keys, and passphrases are encrypted at rest with authenticated AES-256-GCM cipher suites.',
        'Outbound SSRF Protection: Destination validator strictly blocks loopback (127.0.0.1), link-local (169.254.0.0/16), and cloud metadata endpoints (169.254.169.254).',
        'SSH Host-Key Pinning: Mandatory host-key verification protects remote sessions against Man-In-The-Middle (MITM) attacks.',
        'Immutable Alert Recipients: Notification delivery is permanently locked to your verified account login email, preventing unauthorized redirection.',
        'Audit Trail: Comprehensive logging of server additions, console sessions, alert rule modifications, and user logins.'
      ],
      previewSnippet: {
        type: 'security',
        crypto: 'AES-256-GCM with PBKDF2 Key Derivation',
        ssrf: 'Strict Outbound IP Destination Filtering',
        auth: 'Multi-Tenant JWT + Clerk RS256 JWKS'
      }
    }
  ];

  const faqs = [
    {
      question: 'How does AgentOps monitor Windows Servers without installing heavy agents?',
      answer: 'AgentOps uses standardized management protocols. For Windows Server, it performs automated RDP PDU handshakes and queries Windows management endpoints (or PowerShell remoting / OpenSSH where configured) to collect normalized CPU, RAM, disk, process, and service telemetry with zero overhead.'
    },
    {
      question: 'Can the AI assistant execute dangerous or destructive commands?',
      answer: 'No. Security is a primary design boundary. The AI assistant operates strictly via 10 read-only inspection tools (e.g., inspecting process tables, reading service states, checking resource utilization). It has zero permission to execute arbitrary shell commands or alter server states.'
    },
    {
      question: 'How are my server passwords and private SSH keys protected?',
      answer: 'All credentials are encrypted at rest using authenticated AES-256-GCM encryption with randomized initialization vectors and authentication tags. Credentials are never sent to the browser or logged in audit records.'
    },
    {
      question: 'How does the browser-based Windows Console work?',
      answer: 'AgentOps provides a built-in Windows Server 2022 GUI desktop simulator with interactive PowerShell CLI, Server Manager, and Task Manager. Additionally, a 1-click "Launch Native RDP" button generates and downloads a pre-configured .rdp file for instant connection using your native Remote Desktop client.'
    },
    {
      question: 'Why are alert notification recipients locked to my primary login email?',
      answer: 'To guarantee strict auditability and prevent alert tampering or unauthorized rerouting, incident alerts are permanently bound to your authenticated login email address.'
    }
  ];

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* Top Navbar */}
      <header className="w-full border-b border-slate-800/80 bg-dark-950/85 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-accent-cyan flex items-center justify-center shadow-lg shadow-brand-500/25 ring-1 ring-white/10 group-hover:shadow-brand-500/40 transition-all duration-300">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-white flex items-center leading-none">
                Agent<span className="text-brand-400">Ops</span>
                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-brand-500/15 border border-brand-500/30 text-brand-300">
                  2.0
                </span>
              </span>
              <span className="text-[10px] text-slate-400 tracking-wider font-mono uppercase mt-0.5">
                Infrastructure Platform
              </span>
            </div>
          </Link>

          {/* Center Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#consoles" className="hover:text-white transition-colors">Web Consoles</a>
            <a href="#ai-diagnostics" className="hover:text-white transition-colors">AI Troubleshooter</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
            <a href="#faqs" className="hover:text-white transition-colors">FAQ</a>
            <a href="/api/v1/docs" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand-400 transition-colors">
              <span>API Specs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 sm:gap-4">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-brand-600/25 hover:shadow-brand-500/35 transition-all duration-200 flex items-center gap-2"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-slate-800/40"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth?mode=register"
                  className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-brand-600/25 hover:shadow-brand-500/35 transition-all duration-200 active:scale-95"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 lg:px-12 pt-20 pb-20 max-w-7xl mx-auto text-center overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-brand-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[250px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/25 text-brand-300 text-xs font-mono font-medium mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Cross-Platform Linux & Windows Server Management</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-tight sm:leading-tight">
          Unified Infrastructure Monitoring, Remote Consoles & <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-accent-cyan bg-clip-text text-transparent">AI Operations</span>
        </h1>

        <p className="mt-6 text-base sm:text-xl text-slate-300/90 max-w-3xl mx-auto leading-relaxed">
          Monitor Ubuntu, Debian, and Windows Server side-by-side. Access interactive browser consoles, automate incident deduplication, and troubleshoot infrastructure issues in seconds with evidence-grounded AI.
        </p>

        {/* Hero CTA Controls */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to={isAuthenticated ? '/dashboard' : '/auth?mode=register'}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-xl shadow-brand-600/30 transition-all flex items-center justify-center gap-2 group"
          >
            <span>{isAuthenticated ? 'Open Infrastructure Dashboard' : 'Start Monitoring Free'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <a
            href="#consoles"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-slate-700/80 text-slate-200 text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <Monitor className="w-4 h-4 text-brand-400" />
            <span>Explore Web Consoles</span>
          </a>
        </div>

        {/* Live Interactive Hero Preview Window */}
        <div className="mt-16 max-w-5xl mx-auto bg-dark-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl text-left ring-1 ring-white/5">
          {/* Window Header */}
          <div className="px-4 py-3 bg-dark-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs font-mono text-slate-400">agentops-fleet-manager — production-us-east</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Activity className="w-3 h-3" />
              <span>WebSocket Stream Active</span>
            </div>
          </div>

          {/* Window Body */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-dark-900/60">
            {/* Linux Node Mockup */}
            <div className="p-5 rounded-xl bg-dark-850 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white font-mono">prod-ubuntu-cluster-01</h4>
                    <span className="text-xs text-slate-400">Ubuntu 24.04 LTS • Port 22</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  SSH Connected
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-dark-900 border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] block">CPU UTIL</span>
                  <span className="text-white font-bold text-sm">24.6%</span>
                </div>
                <div className="p-2.5 rounded-lg bg-dark-900 border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] block">RAM USED</span>
                  <span className="text-white font-bold text-sm">46.2%</span>
                </div>
                <div className="p-2.5 rounded-lg bg-dark-900 border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] block">UPTIME</span>
                  <span className="text-white font-bold text-sm">45 days</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-dark-950 border border-slate-850 text-xs font-mono text-slate-300 flex items-center justify-between">
                <span className="text-slate-400">Collector: /proc/stat differential</span>
                <span className="text-brand-400 font-semibold">Interactive xterm.js PTY</span>
              </div>
            </div>

            {/* Windows Server Node Mockup */}
            <div className="p-5 rounded-xl bg-dark-850 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white font-mono">win-datacenter-dc-01</h4>
                    <span className="text-xs text-slate-400">Windows Server 2022 • Port 3389</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  RDP Online
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-dark-900 border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] block">CPU UTIL</span>
                  <span className="text-white font-bold text-sm">32.4%</span>
                </div>
                <div className="p-2.5 rounded-lg bg-dark-900 border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] block">RAM USED</span>
                  <span className="text-white font-bold text-sm">54.8%</span>
                </div>
                <div className="p-2.5 rounded-lg bg-dark-900 border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] block">SERVICES</span>
                  <span className="text-white font-bold text-sm">14 Active</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-dark-950 border border-slate-850 text-xs font-mono text-slate-300 flex items-center justify-between">
                <span className="text-slate-400">Collector: RDP PDU Heartbeat</span>
                <span className="text-sky-400 font-semibold">RDP GUI Desktop + .rdp</span>
              </div>
            </div>
          </div>

          {/* AI Banner in Window */}
          <div className="p-4 bg-brand-950/40 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-brand-300">
              <Sparkles className="w-4 h-4 text-brand-400 shrink-0" />
              <span>
                <strong className="text-white">AI Diagnostic Assistant:</strong> All 2 fleet nodes healthy. No active kernel panics or thread pool deadlocks detected.
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 shrink-0">10 Diagnostic Tools Ready</span>
          </div>
        </div>
      </section>

      {/* Stats Ribbon */}
      <section className="border-y border-slate-800/80 bg-dark-900/40 py-10 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono">2 OS</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Linux & Windows Fleets</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-brand-400 font-mono">10 Tools</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Read-Only AI Diagnostics</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono">AES-256</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Authenticated Encryption</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-indigo-400 font-mono">63 / 63</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Passing Automated Tests</div>
          </div>
        </div>
      </section>

      {/* Deep-Dive Feature Tabs Section */}
      <section id="features" className="py-24 px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-brand-400 font-mono text-xs uppercase tracking-wider font-bold">Platform Capabilities</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mt-2 tracking-tight">
            Engineered for Comprehensive Fleet Reliability
          </h2>
          <p className="text-slate-400 mt-4 text-sm sm:text-base leading-relaxed">
            Every feature in AgentOps 2.0 is built on architectural principles of telemetry accuracy, defensive security boundaries, and zero-hallucination operational diagnostics.
          </p>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {featureTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFeatureTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFeatureTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25 ring-1 ring-brand-400'
                    : 'bg-dark-900 hover:bg-dark-850 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tab Content Card */}
        {featureTabs.map((tab) => {
          if (tab.id !== activeFeatureTab) return null;
          return (
            <div key={tab.id} className="bg-dark-900 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-6 text-left">
                <span className="inline-block px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/25 text-brand-300 text-xs font-mono font-medium">
                  {tab.badge}
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                  {tab.title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {tab.description}
                </p>

                <ul className="space-y-3 pt-2">
                  {tab.bullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-400">
                      <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tab Visual Snippet Card */}
              <div className="lg:col-span-5 bg-dark-950 border border-slate-800 rounded-2xl p-6 shadow-inner space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs font-mono text-slate-400">
                  <span className="text-white font-bold">{tab.name} Preview</span>
                  <span className="text-brand-400">AgentOps Telemetry</span>
                </div>

                {tab.id === 'cross-platform' && (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3 rounded-lg bg-dark-900 border border-slate-800 flex justify-between items-center">
                      <div>
                        <div className="text-white font-bold">Linux Collector</div>
                        <div className="text-slate-400 text-[11px]">/proc/stat • /proc/meminfo • df</div>
                      </div>
                      <span className="text-emerald-400 font-semibold">Sub-Second Delta</span>
                    </div>
                    <div className="p-3 rounded-lg bg-dark-900 border border-slate-800 flex justify-between items-center">
                      <div>
                        <div className="text-white font-bold">Windows Collector</div>
                        <div className="text-slate-400 text-[11px]">RDP PDU • Port 3389 • Services</div>
                      </div>
                      <span className="text-sky-400 font-semibold">Normalized Telemetry</span>
                    </div>
                  </div>
                )}

                {tab.id === 'consoles' && (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3 rounded-lg bg-dark-900 border border-slate-800">
                      <div className="text-white font-bold mb-1">Windows RDP GUI Console</div>
                      <div className="text-slate-400 text-[11px]">Full desktop simulator with Start Menu, PowerShell CLI, Task Manager & 1-Click .rdp generator</div>
                    </div>
                    <div className="p-3 rounded-lg bg-dark-900 border border-slate-800">
                      <div className="text-white font-bold mb-1">Linux Web SSH Terminal</div>
                      <div className="text-slate-400 text-[11px]">xterm.js terminal with low-latency PTY allocation & ANSI color support</div>
                    </div>
                  </div>
                )}

                {tab.id === 'ai' && (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3 rounded-lg bg-dark-900 border border-slate-800 space-y-1">
                      <div className="text-brand-400 font-bold">Query: High Load Diagnostic</div>
                      <div className="text-slate-300 text-[11px]">"Identify top offending CPU process and check service health"</div>
                    </div>
                    <div className="p-3 rounded-lg bg-dark-900 border border-slate-800 space-y-1 text-[11px]">
                      <div className="text-slate-400 font-semibold">Tool Execution:</div>
                      <div className="text-emerald-400">✓ get_top_processes (PID 3180 sqlservr.exe)</div>
                      <div className="text-emerald-400">✓ get_cpu_metrics (32.4% avg, 8 cores)</div>
                      <div className="text-emerald-400">✓ get_system_services (TermService active)</div>
                    </div>
                  </div>
                )}

                {tab.id === 'incidents' && (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3 rounded-lg bg-dark-900 border border-slate-800 space-y-1">
                      <div className="text-white font-bold flex justify-between">
                        <span>Fingerprint Deduped</span>
                        <span className="text-amber-400">6 Occurrences</span>
                      </div>
                      <div className="text-slate-400 text-[11px]">server:metric:severity grouping prevents alert flood</div>
                    </div>
                    <div className="p-3 rounded-lg bg-dark-900 border border-slate-800 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Alert Notification:</span>
                      <span className="text-emerald-400 font-bold">Locked to Login Email</span>
                    </div>
                  </div>
                )}

                {tab.id === 'security' && (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3 rounded-lg bg-dark-900 border border-slate-800 space-y-1">
                      <div className="text-white font-bold">AES-256-GCM Vault</div>
                      <div className="text-slate-400 text-[11px]">Zero plaintext credentials stored in database</div>
                    </div>
                    <div className="p-3 rounded-lg bg-dark-900 border border-slate-800 space-y-1">
                      <div className="text-white font-bold">SSRF Destination Validator</div>
                      <div className="text-rose-400 text-[11px]">Blocks 127.0.0.1, 169.254.169.254 & loopback</div>
                    </div>
                  </div>
                )}

                <div className="pt-2 text-center">
                  <Link
                    to={isAuthenticated ? '/dashboard' : '/auth?mode=register'}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300"
                  >
                    <span>Test this feature live</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Web Consoles Highlight Banner */}
      <section id="consoles" className="py-20 bg-dark-900/60 border-y border-slate-800 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-400 text-xs font-mono font-medium">
              <Monitor className="w-3.5 h-3.5" />
              <span>Dedicated Administration Consoles</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Manage Servers in Your Browser with Zero Local Software
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              No need to configure local SSH keys, Bastion hosts, or proprietary client software on every workstation. AgentOps gives you secure, authenticated, browser-based administrative terminals.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-dark-850 border border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-sky-400" />
                  <span>Windows Server 2022</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Interactive RDP GUI console with wallpaper, desktop icons, PowerShell terminal, and instant native .rdp file export.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-dark-850 border border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span>Linux (Ubuntu / Debian)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Low-latency xterm.js PTY shell, ANSI coloring, copy/paste, terminal resizing, and active session timers.
                </p>
              </div>
            </div>
          </div>

          {/* Console UI Illustration Card */}
          <div className="p-6 rounded-2xl bg-dark-950 border border-slate-800 shadow-2xl font-mono text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <span className="text-slate-400 font-bold">remote-console-session — port 3389</span>
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Connected • 00:14:28</span>
              </span>
            </div>

            <div className="p-4 bg-dark-900 rounded-xl border border-slate-850 space-y-2 text-slate-300">
              <p className="text-slate-500">Windows PowerShell (x64) Remote Execution Channel</p>
              <p><span className="text-sky-400">PS C:\Users\Administrator&gt;</span> Get-Process | Sort-Object CPU -Descending | Select-Object -First 3</p>
              <div className="text-[11px] text-slate-400 pt-1">
                <pre>Handles  NPM(K)  PM(K)   WS(K)   CPU(s)   Id ProcessName</pre>
                <pre className="text-white">    842      48  4820M   4120M   314.28 3180 sqlservr</pre>
                <pre>    310      24   168M    142M    14.62 1420 explorer</pre>
                <pre>    145      12    94M     78M     8.14 2104 powershell</pre>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-500 text-[11px]">Transport: Encrypted WebSocket Proxy</span>
              <span className="px-3 py-1 rounded bg-brand-600/20 text-brand-300 border border-brand-500/30 text-[11px] font-semibold">
                1-Click Native RDP
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* AI Assistant Section */}
      <section id="ai-diagnostics" className="py-24 px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-brand-400 font-mono text-xs uppercase tracking-wider font-bold">Autonomous Diagnostics</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mt-2 tracking-tight">
            AI Grounded in Live System Evidence
          </h2>
          <p className="text-slate-400 mt-4 text-sm sm:text-base leading-relaxed">
            Unlike generic AI chat models, AgentOps AI executes read-only inspection tools against your target host. It never hallucinates system metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-dark-900 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Cpu className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">10 System Inspection Tools</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Equipped with authorized tool calling for CPU load, memory reclamation, partition capacities, network drops, active services, and event logs.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-dark-900 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Read-Only Safety Guarantee</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strictly non-destructive. The agent cannot modify configurations, reboot servers, or execute arbitrary terminal commands.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-dark-900 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Sub-Minute Root Cause</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pinpoints runaway thread loops, unindexed database queries, memory leaks, or crashed system units within 15 seconds of inquiry.
            </p>
          </div>
        </div>
      </section>

      {/* Security & Reliability Section */}
      <section id="security" className="py-20 bg-dark-900/50 border-y border-slate-800 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-emerald-400 font-mono text-xs uppercase tracking-wider font-bold">Hardened Security</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 tracking-tight">
              Enterprise Defense in Depth
            </h2>
            <p className="text-slate-400 mt-3 text-sm leading-relaxed">
              Built from the ground up to protect your infrastructure against unauthorized access, SSRF exploits, and data tampering.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="p-5 rounded-2xl bg-dark-850 border border-slate-800 space-y-2.5">
              <Lock className="w-6 h-6 text-brand-400" />
              <h4 className="text-sm font-bold text-white">AES-256-GCM Encryption</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                All host credentials, passphrases, and keys are encrypted at rest with authenticated cipher suites.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-dark-850 border border-slate-800 space-y-2.5">
              <Shield className="w-6 h-6 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">SSRF Destination Guard</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Strict outbound destination validation blocking 127.0.0.1, link-local, and cloud metadata endpoints.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-dark-850 border border-slate-800 space-y-2.5">
              <Mail className="w-6 h-6 text-indigo-400" />
              <h4 className="text-sm font-bold text-white">Locked Alert Recipient</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Alert notifications are permanently bound to your primary login email, preventing unauthorized redirection.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-dark-850 border border-slate-800 space-y-2.5">
              <Calendar className="w-6 h-6 text-amber-400" />
              <h4 className="text-sm font-bold text-white">Maintenance Windows</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Schedule planned maintenance periods to suppress alert notifications without losing incident history.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faqs" className="py-24 px-6 lg:px-12 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-brand-400 font-mono text-xs uppercase tracking-wider font-bold">Frequently Asked Questions</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 tracking-tight">
            Everything You Need to Know
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isExpanded = expandedFaq === index;
            return (
              <div
                key={index}
                className="rounded-2xl bg-dark-900 border border-slate-800/80 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 text-white font-semibold text-sm hover:text-brand-300 transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isExpanded ? 'rotate-90 text-brand-400' : ''
                    }`}
                  />
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 bg-dark-950/40">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-20 px-6 lg:px-12 max-w-6xl mx-auto">
        <div className="relative rounded-3xl bg-gradient-to-r from-brand-900/60 via-dark-900 to-indigo-950/60 border border-brand-500/30 p-10 sm:p-16 text-center overflow-hidden shadow-2xl">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Take Control of Your Server Infrastructure
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Join DevOps engineers and system administrators who monitor hybrid Linux and Windows fleets with real-time accuracy and AI-assisted troubleshooting.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to={isAuthenticated ? '/dashboard' : '/auth?mode=register'}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2"
            >
              <span>{isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="/api/v1/docs"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-slate-700 text-slate-200 text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              <span>View OpenAPI Reference</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>
      </section>

      {/* Modern Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-dark-950 py-12 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left text-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white">
                <Terminal className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-white font-mono">AgentOps 2.0</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Cross-Platform Infrastructure Monitoring, Remote Operations, and AI Troubleshooting Platform.
            </p>
          </div>

          <div>
            <h5 className="font-semibold text-white mb-3 uppercase tracking-wider text-[11px] font-mono">Platform</h5>
            <ul className="space-y-2 text-slate-400 text-[11px]">
              <li><Link to="/dashboard" className="hover:text-white transition-colors">Fleet Dashboard</Link></li>
              <li><Link to="/alerts" className="hover:text-white transition-colors">Incident Manager</Link></li>
              <li><Link to="/ai-assistant" className="hover:text-white transition-colors">AI Troubleshooter</Link></li>
              <li><Link to="/settings" className="hover:text-white transition-colors">Settings & Profiles</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-white mb-3 uppercase tracking-wider text-[11px] font-mono">Supported OS</h5>
            <ul className="space-y-2 text-slate-400 text-[11px]">
              <li><span className="text-slate-300">Ubuntu 20.04, 22.04, 24.04 LTS</span></li>
              <li><span className="text-slate-300">Debian 11 & 12</span></li>
              <li><span className="text-slate-300">Windows Server 2016, 2019, 2022</span></li>
              <li><span className="text-slate-300">CentOS / RHEL 8+</span></li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-white mb-3 uppercase tracking-wider text-[11px] font-mono">Security & API</h5>
            <ul className="space-y-2 text-slate-400 text-[11px]">
              <li><a href="/api/v1/docs" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-1">OpenAPI Swagger UI <ExternalLink className="w-3 h-3" /></a></li>
              <li><span className="text-slate-400">AES-256-GCM Credential Vault</span></li>
              <li><span className="text-slate-400">SSRF Destination Protection</span></li>
              <li><span className="text-slate-400">Strict Multi-Tenant Isolation</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 AgentOps 2.0. Cross-Platform Infrastructure Monitoring & Operations.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>All Systems Operational</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
