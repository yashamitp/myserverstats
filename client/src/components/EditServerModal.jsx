import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  X,
  Server,
  Key,
  Lock,
  Terminal,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

export default function EditServerModal({ server, isOpen, onClose, onUpdated }) {
  if (!isOpen || !server) return null;

  const [formData, setFormData] = useState({
    name: server.name || '',
    hostname: server.hostname || '',
    port: server.port || 22,
    username: server.username || '',
    authMethod: server.authMethod || 'key',
    password: '',
    privateKey: '',
    keyPassphrase: '',
    monitoringInterval: server.monitoringInterval || 10,
    tagsString: Array.isArray(server.tags) ? server.tags.join(', ') : '',
    isMonitoringEnabled: server.isMonitoringEnabled !== false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setFormData({
      name: server.name || '',
      hostname: server.hostname || '',
      port: server.port || 22,
      username: server.username || '',
      authMethod: server.authMethod || 'key',
      password: '',
      privateKey: '',
      keyPassphrase: '',
      monitoringInterval: server.monitoringInterval || 10,
      tagsString: Array.isArray(server.tags) ? server.tags.join(', ') : '',
      isMonitoringEnabled: server.isMonitoringEnabled !== false
    });
    setTestResult(null);
    setErrorMsg('');
  }, [server]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTestConnection = async () => {
    setErrorMsg('');
    setIsTesting(true);
    setTestResult(null);

    try {
      const payload = {
        hostname: formData.hostname,
        port: parseInt(formData.port, 10) || 22,
        username: formData.username,
        authMethod: formData.authMethod
      };

      if (formData.authMethod === 'key' && formData.privateKey) {
        payload.privateKey = formData.privateKey;
        if (formData.keyPassphrase) payload.keyPassphrase = formData.keyPassphrase;
      } else if (formData.authMethod === 'password' && formData.password) {
        payload.password = formData.password;
      }

      // If credentials were not re-entered, test existing server connection endpoint
      let res;
      if (!payload.privateKey && !payload.password) {
        res = await api.testServerConnection(server._id);
      } else {
        res = await api.testPreflightConnection(payload);
      }

      setTestResult(res.data);
    } catch (err) {
      setErrorMsg(err.message || 'Connection test failed');
      setTestResult({
        success: false,
        error: err.message
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSaving(true);

    try {
      const tags = formData.tagsString
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const updatePayload = {
        name: formData.name,
        hostname: formData.hostname,
        port: parseInt(formData.port, 10) || 22,
        username: formData.username,
        authMethod: formData.authMethod,
        tags,
        monitoringInterval: parseInt(formData.monitoringInterval, 10) || 10,
        isMonitoringEnabled: formData.isMonitoringEnabled
      };

      if (formData.authMethod === 'key' && formData.privateKey.trim()) {
        updatePayload.privateKey = formData.privateKey.trim();
        if (formData.keyPassphrase) {
          updatePayload.keyPassphrase = formData.keyPassphrase;
        }
      } else if (formData.authMethod === 'password' && formData.password.trim()) {
        updatePayload.password = formData.password.trim();
      }

      const res = await api.updateServer(server._id, updatePayload);
      if (onUpdated) {
        onUpdated(res.data);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update server credentials');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-dark-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-dark-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Edit VM Credentials & Settings</h3>
              <p className="text-xs text-slate-400">Modify SSH connection parameters and monitoring configuration.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Error updating server:</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Connection Test Result Banner */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              )}
              <div>
                <span className="font-semibold block">
                  {testResult.success ? 'SSH Connection Successful' : 'Connection Failed'}
                </span>
                <span className="text-[11px] opacity-90">
                  {testResult.success
                    ? `OS: ${testResult.os || 'Linux'} • Kernel: ${testResult.kernel || 'OK'} • Roundtrip: ${testResult.latencyMs || '<50'}ms`
                    : testResult.error}
                </span>
              </div>
            </div>
          )}

          {/* General Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Server Display Name</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Hostname or IP Address</label>
              <input
                type="text"
                name="hostname"
                required
                value={formData.hostname}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">SSH Port</label>
              <input
                type="number"
                name="port"
                min="1"
                max="65535"
                required
                value={formData.port}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">SSH Username</label>
              <input
                type="text"
                name="username"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Authentication Method Selection */}
          <div className="pt-2">
            <label className="block text-xs font-medium text-slate-300 mb-2">SSH Authentication Method</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, authMethod: 'key' }))}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  formData.authMethod === 'key'
                    ? 'bg-brand-600/10 border-brand-500 text-brand-300 ring-1 ring-brand-500/30'
                    : 'bg-dark-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Key className="w-4 h-4" />
                <div className="text-left">
                  <span className="block text-xs font-semibold">SSH Private Key</span>
                  <span className="text-[10px] text-slate-400">RSA, Ed25519</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, authMethod: 'password' }))}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  formData.authMethod === 'password'
                    ? 'bg-brand-600/10 border-brand-500 text-brand-300 ring-1 ring-brand-500/30'
                    : 'bg-dark-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Lock className="w-4 h-4" />
                <div className="text-left">
                  <span className="block text-xs font-semibold">Password</span>
                  <span className="text-[10px] text-slate-400">Encrypted AES-256</span>
                </div>
              </button>
            </div>
          </div>

          {/* Credentials Inputs */}
          {formData.authMethod === 'key' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  SSH Private Key
                  <span className="text-[11px] text-slate-500 font-normal ml-2">
                    (Leave blank to keep current encrypted key)
                  </span>
                </label>
                <textarea
                  rows={4}
                  name="privateKey"
                  value={formData.privateKey}
                  onChange={handleChange}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                  className="w-full p-3 bg-dark-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Key Passphrase (optional)
                </label>
                <input
                  type="password"
                  name="keyPassphrase"
                  value={formData.keyPassphrase}
                  onChange={handleChange}
                  placeholder="Only if your private key is passphrase-protected"
                  className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                SSH Password
                <span className="text-[11px] text-slate-500 font-normal ml-2">
                  (Leave blank to keep current password)
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Polling & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Polling Interval (seconds)</label>
              <input
                type="number"
                name="monitoringInterval"
                min="5"
                max="300"
                value={formData.monitoringInterval}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                name="tagsString"
                placeholder="web, production, db"
                value={formData.tagsString}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Monitoring Active Toggle */}
          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="isMonitoringEnabled"
              name="isMonitoringEnabled"
              checked={formData.isMonitoringEnabled}
              onChange={handleChange}
              className="w-4 h-4 rounded bg-dark-950 border-slate-800 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isMonitoringEnabled" className="text-xs text-slate-300 select-none cursor-pointer">
              Enable background real-time telemetry polling worker
            </label>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              disabled={isTesting || !formData.hostname || !formData.username}
              onClick={handleTestConnection}
              className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 border border-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-brand-400' : ''}`} />
              <span>{isTesting ? 'Testing SSH...' : 'Test Connection'}</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-brand-600/25 transition-all"
              >
                {isSaving ? 'Saving Changes...' : 'Save Credentials'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
