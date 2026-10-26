import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  ExternalLink,
  X
} from 'lucide-react';
import { formatTimeAgo } from '../utils/formatters';

export default function NotificationBell() {
  const { unreadNotificationCount, setUnreadNotificationCount, recentNotifications } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'critical'
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch initial unread count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await api.getUnreadNotificationCount();
        if (res?.data?.unreadCount !== undefined) {
          setUnreadNotificationCount(res.data.unreadCount);
        }
      } catch (e) {}
    };
    fetchUnread();
  }, []);

  // Update list when socket receives new notification
  useEffect(() => {
    if (recentNotifications.length > 0) {
      setNotifications((prev) => {
        const ids = new Set(prev.map((n) => n._id));
        const newItems = recentNotifications.filter((n) => !ids.has(n._id));
        return [...newItems, ...prev].slice(0, 50);
      });
    }
  }, [recentNotifications]);

  // Load notifications when dropdown opens
  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (filter === 'unread') params.isRead = 'false';
      if (filter === 'critical') params.severity = 'critical';

      const res = await api.getNotifications(params);
      setNotifications(res?.data?.notifications || []);
      if (res?.data?.unreadCount !== undefined) {
        setUnreadNotificationCount(res.data.unreadCount);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, filter]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotificationCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const getSeverityIcon = (sev) => {
    switch (sev) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-brand-400 shrink-0" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors focus:outline-none"
      >
        <Bell className="w-5 h-5" />
        {unreadNotificationCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold border-2 border-dark-900 animate-pulse">
            {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
          </span>
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-dark-850 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[520px]">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-dark-900/60">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-white">Notifications</span>
              {unreadNotificationCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {unreadNotificationCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadNotificationCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  title="Mark all as read"
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-3 py-2 bg-dark-900/30 border-b border-slate-800/80 flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${filter === 'all' ? 'bg-dark-750 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 rounded-md transition-colors ${filter === 'unread' ? 'bg-dark-750 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Unread
            </button>
            <button
              type="button"
              onClick={() => setFilter('critical')}
              className={`px-2.5 py-1 rounded-md transition-colors ${filter === 'critical' ? 'bg-dark-750 text-rose-300 font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Critical
            </button>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto divide-y divide-slate-800/60 flex-1">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <Bell className="w-6 h-6 text-slate-600" />
                <span>No notifications in this view</span>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`p-3.5 transition-colors flex items-start gap-3 hover:bg-dark-800/60 ${!notif.isRead ? 'bg-brand-950/10' : ''}`}
                >
                  <div className="mt-0.5">{getSeverityIcon(notif.severity)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`text-xs font-semibold truncate ${!notif.isRead ? 'text-white' : 'text-slate-300'}`}>
                        {notif.title}
                      </h4>
                      {!notif.isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(notif._id, e)}
                          title="Mark as read"
                          className="text-slate-500 hover:text-slate-300 p-0.5 rounded"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(notif.createdAt)}
                      </span>

                      {notif.link && (
                        <Link
                          to={notif.link}
                          onClick={() => setIsOpen(false)}
                          className="text-brand-400 hover:text-brand-300 font-medium flex items-center gap-0.5"
                        >
                          <span>View</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
