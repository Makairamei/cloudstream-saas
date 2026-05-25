'use client'

import { motion } from 'framer-motion'
import { Bell, X, Check, CheckCheck, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react'
import { useUIStore } from '@/store/ui.store'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'Abuse Detected', message: 'License CS-ABCD1234 triggered DEVICE_OVERFLOW alert', type: 'error', isRead: false, createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: '2', title: 'New License Created', message: '50 licenses bulk created by admin@cloudstream.app', type: 'success', isRead: false, createdAt: new Date(Date.now() - 15 * 60000).toISOString() },
  { id: '3', title: 'Plugin Updated', message: 'Netflix v2.1.0 has been uploaded and published', type: 'info', isRead: false, createdAt: new Date(Date.now() - 45 * 60000).toISOString() },
  { id: '4', title: 'IP Auto-blocked', message: '103.45.67.89 was blocked after 15 failed attempts', type: 'warning', isRead: true, createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: '5', title: 'System Health', message: 'Database response time normalized to <50ms', type: 'success', isRead: true, createdAt: new Date(Date.now() - 6 * 3600000).toISOString() },
]

const icons = {
  error: <XCircle className="w-4 h-4 text-red-400" />,
  success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  info: <Info className="w-4 h-4 text-blue-400" />,
}

const colors = {
  error: 'border-l-red-500/60',
  success: 'border-l-emerald-500/60',
  warning: 'border-l-amber-500/60',
  info: 'border-l-blue-500/60',
}

export function NotificationCenter() {
  const { setNotificationPanelOpen, markAllNotificationsRead, notifications, unreadCount } = useUIStore()

  const allNotifications = notifications.length > 0 ? notifications : MOCK_NOTIFICATIONS

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => setNotificationPanelOpen(false)}
      />

      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col w-full max-w-sm h-full"
        style={{
          background: '#0c0c18',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-200">Notifications</h2>
            {unreadCount > 0 && (
              <span className="badge-red text-2xs px-1.5 py-0.5">{unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="btn-icon btn-sm text-slate-600 hover:text-slate-300"
                title="Mark all read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setNotificationPanelOpen(false)}
              className="btn-icon btn-sm text-slate-600 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto py-2">
          {allNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <Bell className="w-8 h-8 text-slate-700 mb-2" />
              <p className="text-sm text-slate-600">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-1 px-2">
              {allNotifications.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    'flex gap-3 px-3 py-3 rounded-xl border-l-2 transition-all duration-200 cursor-pointer',
                    n.isRead
                      ? 'bg-transparent border-l-transparent hover:bg-white/[0.02]'
                      : `bg-white/[0.03] ${colors[n.type]} hover:bg-white/[0.05]`
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">{icons[n.type]}</div>
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      'text-sm font-medium leading-snug',
                      n.isRead ? 'text-slate-400' : 'text-slate-200'
                    )}>
                      {n.title}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-snug">{n.message}</p>
                    <span className="text-2xs text-slate-700 mt-1 block">{formatRelativeTime(n.createdAt)}</span>
                  </div>
                  {!n.isRead && (
                    <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <button className="w-full text-xs text-slate-600 hover:text-indigo-400 transition-colors py-1">
            View all notifications →
          </button>
        </div>
      </motion.div>
    </div>
  )
}
