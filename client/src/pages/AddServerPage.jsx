import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Server,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Terminal,
  Cpu,
  Clock,
  HelpCircle,
  Monitor
} from 'lucide-react';

export default function AddServerPage() {
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    hostname: '',
    port: 22,
    osDistro: 'ubuntu',
    monitoringMethod: 'ssh',
    authMethod: 'key',
    username: 'agentops',
    privateKey: '',
    password: '',
    keyPassphrase: '',
    tagsString: 'web, prod',
    monitoringInterval: 10
  });

  // UI state
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isWindows = formData.osDistro === 'windows';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'osDistro') {
        if (value === 'windows') {
          // Switch to Windows RDP defaults
          if (prev.port === 22 || !prev.port) {
            next.port = 3389;
          }
          if (prev.username === 'agentops' || prev.username === 'ubuntu' || !prev.username) {
            next.username = 'Administrator';
          }
          next.authMethod = 'password';
          next.monitoringMethod = parseInt(next.port, 10) === 22 ? 'ssh' : 'rdp';
        } else {
          // Switch back to Linux defaults
          if (prev.port === 3389) {
            next.port = 22;
          }
          if (prev.username === 'Administrator') {
            next.username = 'ubuntu';
          }
          next.monitoringMethod = 'ssh';
        }
      }
      if (name === 'port') {
        const portNum = parseInt(value, 10);
        if (next.osDistro === 'windows') {
          next.monitoringMethod = portNum === 22 ? 'ssh' : 'rdp';
        }
      }
      return next;
    });

    // Reset test result if connection params change
    if (['hostname', 'port', 'username', 'privateKey', 'password', 'osDistro'].includes(name)) {
      setTestResult(null);
    }
  };

  const handleTestConnection = async () => {
    setErrorMsg('');
    setIsTesting(true);
    setTestResult(null);

    try {
      const portNum = parseInt(formData.port, 10) || (formData.osDistro === 'windows' ? 3389 : 22);
      const isWin = formData.osDistro === 'windows';
      const monitoringMethod = isWin ? (portNum === 22 ? 'ssh' : 'rdp') : formData.monitoringMethod;

      const res = await api.testPreflightConnection({
        hostname: formData.hostname.trim(),
        port: portNum,
        osDistro: formData.osDistro,
        monitoringMethod,
        username: formData.username.trim(),
        authMethod: formData.authMethod,
        privateKey: formData.authMethod === 'key' ? formData.privateKey : undefined,
        password: formData.authMethod === 'password' ? formData.password : undefined,
        keyPassphrase: formData.keyPassphrase || undefined
      });

      setTestResult(res.data);
    } catch (err) {
      const msg = err.status === 401
        ? 'Session expired. Please sign in again or refresh the page.'
        : (err.message || 'Connection test failed');
      setErrorMsg(msg);
      setTestResult({
        success: false,
        error: msg,
        message: msg
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const tags = formData.tagsString
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const port = parseInt(formData.port, 10) || (formData.osDistro === 'windows' ? 3389 : 22);
      const isWin = formData.osDistro === 'windows';
      const monitoringMethod = isWin ? (port === 22 ? 'ssh' : 'rdp') : formData.monitoringMethod || 'ssh';

      const payload = {
        name: formData.name.trim(),
        hostname: formData.hostname.trim(),
        port,
        osDistro: formData.osDistro,
        monitoringMethod,
        authMethod: formData.authMethod,
        username: formData.username.trim(),
        tags,
        monitoringInterval: parseInt(formData.monitoringInterval, 10) || 10
      };

      if (formData.authMethod === 'key') {
        payload.privateKey = formData.privateKey;
        if (formData.keyPassphrase) payload.keyPassphrase = formData.keyPassphrase;
      } else {
        payload.password = formData.password;
      }

      const res = await api.createServer(payload);
      const newServerId = res.data._id;
      navigate(`/servers/${newServerId}`);
    } catch (err) {
      const msg = err.status === 401
        ? 'Session expired. Please sign in again or refresh the page.'
        : (err.message || 'Failed to create server');
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-2">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white tracking-tight">
          {isWindows ? 'Connect Remote Windows Server' : 'Connect Remote Server'}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {isWindows
            ? 'Add and monitor your Windows Server or Windows VM using standard Remote Desktop (RDP: 3389) or OpenSSH.'
            : 'Configure secure infrastructure monitoring for your Ubuntu, Debian, or Linux VPS instance.'}
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Connection Error:</span>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Basic Information */}
        <div className="bg-dark-850 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Server className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-semibold text-white">Step 1: Server Information</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Display Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={isWindows ? 'e.g. Production Windows Server' : 'e.g. Production Web VPS'}
                className="w-full px-3 py-2 bg-dark-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Operating System
              </label>
              <select
                name="osDistro"
                value={formData.osDistro}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-dark-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="ubuntu">Ubuntu Linux (20.04 / 22.04 / 24.04)</option>
                <option value="debian">Debian GNU/Linux (11 / 12)</option>
                <option value="windows">Windows Server / Windows 10/11 (RDP: 3389)</option>
                <option value="other">Other Distribution</option>
              </select>
            </div>

            {isWindows && (
              <div className="sm:col-span-2 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
                <Monitor className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold block">Windows Server / Remote Desktop (RDP) Login:</span>
                  <p className="text-[11px] text-blue-300/90 leading-relaxed">
                    Connects using standard Windows login credentials (just like Microsoft Remote Desktop Connection). The default port is set to <code className="bg-dark-900 px-1 py-0.5 rounded text-white font-mono">3389</code> (standard for RDP). You can customize the port if your Windows VM uses a custom port or gateway.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Hostname or IP Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                name="hostname"
                value={formData.hostname}
                onChange={handleChange}
                placeholder="203.0.113.10 or win.example.com"
                className="w-full px-3 py-2 bg-dark-900 border border-slate-800 rounded-lg text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {isWindows ? 'Port (Default RDP: 3389)' : 'SSH Port'} <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleChange}
                min={1}
                max={65535}
                placeholder={isWindows ? '3389' : '22'}
                className="w-full px-3 py-2 bg-dark-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              name="tagsString"
              value={formData.tagsString}
              onChange={handleChange}
              placeholder="production, windows, cloud"
              className="w-full px-3 py-2 bg-dark-900 border border-slate-800 rounded-lg text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Step 2: Authentication */}
        <div className="bg-dark-850 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Key className="w-4 h-4 text-accent-cyan" />
            <h3 className="text-sm font-semibold text-white">Step 2: Authentication Credentials</h3>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="authMethod"
                value="password"
                checked={formData.authMethod === 'password'}
                onChange={handleChange}
                className="text-brand-500 focus:ring-0"
              />
              <span className="text-slate-200 font-medium">
                {isWindows ? 'Password Authentication (Recommended for Windows)' : 'Password Authentication'}
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="authMethod"
                value="key"
                checked={formData.authMethod === 'key'}
                onChange={handleChange}
                className="text-brand-500 focus:ring-0"
              />
              <span className="text-slate-200 font-medium">SSH Private Key</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {isWindows ? 'Windows Username' : 'SSH Username'} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder={isWindows ? 'Administrator or your Windows user' : 'agentops or ubuntu'}
              className="w-full sm:w-1/2 px-3 py-2 bg-dark-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-brand-500"
            />
          </div>

          {formData.authMethod === 'key' ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  SSH Private Key (OpenSSH / RSA / Ed25519) <span className="text-rose-400">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Encrypted with AES-256-GCM</span>
              </div>
              <textarea
                required
                name="privateKey"
                rows={6}
                value={formData.privateKey}
                onChange={handleChange}
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                className="w-full px-3 py-2 bg-dark-900 border border-slate-800 rounded-lg text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  {isWindows ? 'Windows User Password' : 'SSH Password'} <span className="text-rose-400">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Encrypted with AES-256-GCM</span>
              </div>
              <input
                type="password"
                required
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••••••"
                className="w-full sm:w-1/2 px-3 py-2 bg-dark-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-brand-500"
              />
            </div>
          )}

          <div className="p-3 bg-dark-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Credentials are encrypted at rest using AES-256-GCM and never logged or exposed in plaintext.
            </span>
          </div>
        </div>

        {/* Step 3: Test Connection Section */}
        <div className="bg-dark-850 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Step 3: Test Connectivity & Security</h3>
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !formData.hostname || (!formData.privateKey && !formData.password)}
              className="px-4 py-1.5 rounded-lg bg-dark-750 hover:bg-dark-700 disabled:opacity-40 text-slate-200 text-xs font-semibold border border-slate-700/60 transition-colors flex items-center gap-2"
            >
              {isTesting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                  <span>Probing Host...</span>
                </>
              ) : (
                <>
                  <span>Test Connection</span>
                </>
              )}
            </button>
          </div>

          {/* Test Results Display */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs font-mono space-y-2 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                )}
                <span>{testResult.message || (testResult.success ? 'Probe Verified' : 'Probe Failed')}</span>
              </div>

              {testResult.success && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-slate-300 text-[11px]">
                  <div>
                    <span className="text-slate-500">Latency: </span>
                    <span className="text-emerald-400">{testResult.latencyMs} ms</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Protocol: </span>
                    <span className="uppercase text-brand-400">{testResult.protocol || 'SSH'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Detected OS: </span>
                    <span>{testResult.os?.distroName || testResult.os?.distro}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Endpoint: </span>
                    <span>{testResult.os?.kernel || 'Port Active'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !formData.hostname || (!formData.privateKey && !formData.password)}
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all flex items-center gap-2"
          >
            <span>{isSubmitting ? 'Registering Server...' : 'Add Server & Start Monitoring'}</span>
            {!isSubmitting && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
