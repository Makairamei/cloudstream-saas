'use client'

import { useState, type ElementType } from 'react'
import { motion } from 'framer-motion'
import { ScrollText, Search, Filter, Download, User, Key, Shield, Settings, RefreshCw } from 'lucide-react'
import { cn, formatDateTime, formatRelativeTime } from '@/lib/utils'

type AdminAction = 'CREATE_LICENSE' | 'REVOKE_LICENSE' | 'BLOCK_IP' | 'UNBLOCK_IP' | 'UPDATE_PLUGIN' | 'DELETE_PLUGIN' | 'CHANGE_SETTINGS' | 'BAN_DEVICE' | 'LOGIN' | 'EXPORT_DATA'

const ACTION_ICONS: Record<string, ElementType> = {
  CREATE_LICENSE: Key,
  REVOKE_LICENSE: Key,
  BLOCK_IP: Shield,
  UNBLOCK_IP: Shield,
  UPDATE_PLUGIN: Settings,
  DELETE_PLUGIN: Settings,
  CHANGE_SETTINGS: Settings,
  BAN_DEVICE: Shield,
  LOGIN: User,
  EXPORT_DATA: Download,
}

const ACTION_COLORS: Record<string, string> = {
  CREATE_LICENSE: 'text-emerald-400 bg-emerald-500/10',
  REVOKE_LICENSE: 'text-red-400 bg-red-500/10',
  BLOCK_IP: 'text-red-400 bg-red-500/10',
  UNBLOCK_IP: 'text-emerald-400 bg-emerald-500/10',
  UPDATE_PLUGIN: 'text-indigo-400 bg-indigo-500/10',
  DELETE_PLUGIN: 'text-red-400 bg-red-500/10',
  CHANGE_SETTINGS: 'text-amber-400 bg-amber-500/10',
  BAN_DEVICE: 'text-red-400 bg-red-500/10',
  LOGIN: 'text-blue-400 bg-blue-500/10',
  EXPORT_DATA: 'text-cyan-400 bg-cyan-500/10',
}

const LOGS = [
  { id: '1', action: 'BLOCK_IP' as AdminAction, actor: 'admin@cloudstream.app', target: '185.220.101.3', description: 'Blocked IP after 52 brute force attempts', ip: '192.168.1.1', createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: '2', action: 'CREATE_LICENSE' as AdminAction, actor: 'admin@cloudstream.app', target: '50 licenses bulk', description: 'Created 50 PROD licenses batch #B-2024-11', ip: '192.168.1.1', createdAt: new Date(Date.now() - 15 * 60000).toISOString() },
  { id: '3', action: 'REVOKE_LICENSE' as AdminAction, actor: 'support@cloudstream.app', target: 'CS-PROD-4821', description: 'Revoked license — abuse confirmed', ip: '10.0.0.2', createdAt: new Date(Date.now() - 45 * 60000).toISOString() },
  { id: '4', action: 'UPDATE_PLUGIN' as AdminAction, actor: 'admin@cloudstream.app', target: 'Netflix v2.1.0', description: 'Updated Netflix plugin to version 2.1.0', ip: '192.168.1.1', createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: '5', action: 'CHANGE_SETTINGS' as AdminAction, actor: 'admin@cloudstream.app', target: 'max_devices', description: 'Changed default max_devices from 3 to 2', ip: '192.168.1.1', createdAt: new Date(Date.now() - 4 * 3600000).toISOString() },
  { id: '6', action: 'BAN_DEVICE' as AdminAction, actor: 'support@cloudstream.app', target: 'fp_abc123def456', description: 'Banned device fingerprint — device spoof', ip: '10.0.0.2', createdAt: new Date(Date.now() - 6 * 3600000).toISOString() },
  { id: '7', action: 'LOGIN' as AdminAction, actor: 'admin@cloudstream.app', target: 'admin panel', description: 'Admin login from new IP — 2FA verified', ip: '203.0.113.4', createdAt: new Date(Date.now() - 8 * 3600000).toISOString() },
  { id: '8', action: 'EXPORT_DATA' as AdminAction, actor: 'admin@cloudstream.app', target: 'licenses.csv', description: 'Exported 10,896 license records', ip: '192.168.1.1', createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: '9', action: 'UNBLOCK_IP' as AdminAction, actor: 'support@cloudstream.app', target: '91.108.4.45', description: 'Unblocked IP — false positive confirmed', ip: '10.0.0.2', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: '10', action: 'DELETE_PLUGIN' as AdminAction, actor: 'admin@cloudstream.app', target: 'DeprecatedPlugin v0.9', description: 'Deleted deprecated plugin', ip: '192.168.1.1', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
]

export default function AdminLogsPage() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')

  const actions = ['all', ...Array.from(new Set(LOGS.map(l => l.action)))]

  const filtered = LOGS.filter(l => {
    const matchSearch = !search || l.description.toLowerCase().includes(search.toLowerCase()) || l.actor.includes(search) || l.target.includes(search)
    const matchAction = actionFilter === 'all' || l.action === actionFilter
    return matchSearch && matchAction
  })

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Admin Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-0.5">Full audit trail of all admin actions</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost btn-sm flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />Refresh
          </button>
          <button className="btn-ghost btn-sm flex items-center gap-2">
            <Download className="w-3.5 h-3.5" />Export
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-white/[0.05]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input type="text" placeholder="Search by actor, target, or description..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" />
          </div>
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="input max-w-[200px] text-sm"
          >
            {actions.map(a => (
              <option key={a} value={a}>{a === 'all' ? 'All Actions' : a.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {filtered.map((log, i) => {
            const Icon = ACTION_ICONS[log.action] ?? ScrollText
            const colors = ACTION_COLORS[log.action] ?? 'text-slate-400 bg-slate-500/10'
            return (
              <motion.div key={log.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-start gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', colors)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-semibold text-slate-300">{log.action.replace(/_/g, ' ')}</span>
                    <code className="text-2xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{log.target}</code>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{log.description}</p>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="text-2xs text-slate-600 flex items-center gap-1">
                      <User className="w-2.5 h-2.5" />{log.actor}
                    </span>
                    <span className="text-2xs text-slate-700">{log.ip}</span>
                    <span className="text-2xs text-slate-700">{formatDateTime(log.createdAt)}</span>
                  </div>
                </div>
                <span className="text-2xs text-slate-700 flex-shrink-0">{formatRelativeTime(log.createdAt)}</span>
              </motion.div>
            )
          })}
        </div>

        <div className="px-5 py-3 border-t border-white/[0.05] flex items-center justify-between">
          <span className="text-xs text-slate-600">Showing {filtered.length} of {LOGS.length} entries</span>
          <div className="flex items-center gap-2">
            <button className="btn-ghost btn-sm text-xs">Previous</button>
            <span className="text-xs text-slate-600 px-2">Page 1 of 1</span>
            <button className="btn-ghost btn-sm text-xs">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
