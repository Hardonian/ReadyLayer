'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, Check, ShieldAlert, AlertTriangle, Info, CheckCircle2, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface NotificationItem {
  id: string;
  type: 'alert' | 'info' | 'warning' | 'error' | 'success';
  title: string;
  body: string;
  cta?: {
    label: string;
    url: string;
  };
  timestamp: string | Date;
}

export function NotificationBell(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotifications = async (): Promise<void> => {
      try {
        const res = await fetch('/api/v1/notifications');
        if (res.ok) {
          const data = (await res.json()) as {
            data?: { notifications: NotificationItem[]; unreadCount: number };
          };
          if (data.data) {
            setNotifications(data.data.notifications || []);
            setUnreadCount(data.data.unreadCount || 0);
          }
        }
      } catch {
        // Fallback default notifications if offline
        setNotifications([
          {
            id: 'local_1',
            type: 'info',
            title: 'ReadyLayer Governance Active',
            body: 'Deterministic policy evaluation and audit chains are operational.',
            cta: { label: 'Audit Logs', url: '/dashboard/audit' },
            timestamp: new Date(),
          },
        ]);
        setUnreadCount(1);
      }
    };

    void fetchNotifications();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = async (): Promise<void> => {
    setUnreadCount(0);
    try {
      await fetch('/api/v1/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
    } catch {
      // Ignored
    }
  };

  const getIcon = (type: NotificationItem['type']): React.JSX.Element => {
    switch (type) {
      case 'alert':
      case 'error':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      default:
        return <Info className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        aria-label="View notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-800 bg-slate-900/95 backdrop-blur-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="bg-indigo-500/15 text-indigo-400 border-indigo-500/20 text-xs px-1.5 py-0.5">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 text-xs text-slate-400 hover:text-white gap-1 px-2"
              >
                <Check className="w-3.5 h-3.5" />
                Mark all read
              </Button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No notifications right now.
              </div>
            ) : (
              notifications.map((item) => (
                <div key={item.id} className="p-3.5 hover:bg-slate-800/40 transition-colors space-y-1.5">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex-shrink-0">{getIcon(item.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-white truncate">{item.title}</h4>
                        <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{item.body}</p>
                      {item.cta && (
                        <div className="mt-2">
                          <Link
                            href={item.cta.url}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300"
                          >
                            {item.cta.label}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 text-center">
            <Link
              href="/dashboard/audit"
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-slate-400 hover:text-white transition-colors"
            >
              View Full Audit Trail &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
