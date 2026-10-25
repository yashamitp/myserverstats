import React, { useState } from 'react';
import { api } from '../services/api';
import {
  X,
  AlertTriangle,
  Trash2,
  Server,
  RefreshCw
} from 'lucide-react';

export default function DeleteServerModal({ server, isOpen, onClose, onDeleted }) {
  if (!isOpen || !server) return null;

  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleDelete = async () => {
    setErrorMsg('');
    setIsDeleting(true);

    try {
      await api.deleteServer(server._id);
      if (onDeleted) {
        onDeleted(server._id);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete server');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-dark-900 border border-rose-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Delete Server</h3>
              <p className="text-xs text-rose-400/90 font-medium">Permanently revoke VM access</p>
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

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-dark-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Server Name:</span>
              <span className="font-semibold text-white">{server.name}</span>
            </div>
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-400">Address:</span>
              <span className="text-slate-200">{server.hostname}:{server.port || 22}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Distro:</span>
              <span className="text-slate-200 capitalize">{server.os?.distro || 'Linux'}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Are you sure you want to delete this server? This will immediately stop the telemetry collection worker, remove all historical CPU/RAM/Disk metrics, and delete all associated alert rules.
          </p>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800/80 bg-dark-950/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-rose-600/25 transition-all flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Server</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
