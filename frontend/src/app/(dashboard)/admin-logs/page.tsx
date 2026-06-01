'use client'

import { useState, useEffect, useCallback, type ElementType } from 'react'
import { motion } from 'framer-motion'
import {
  ScrollText, Search, Download, User, Key, Shield, Settings, RefreshCw,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, LogIn, LogOut, FileText, Trash2, Plus, Edit3,
} from 'lucide-react'
import { cn, formatDateTime, formatRelativeTime } from '@/lib/utils'
import { apiGet } from '@/lib/api'
import toast from 'react-hot-toast'

type LogItem = {
  id: string
  action: string
  target: string | null
  targetType: string | null
  details: any
  diff: any
  ip: string | null
  userAgent: string | null
  createdAt: string
  admin: { id: string; name: string; email: string; role: string; avatar?: string | null } | null
}

const ACTION_ICONS: Record<string, ElementType> = {
  CREATE_LICENSE: Key, UPDATE_LICENSE: Key, REVOKE_LICENSE: Key, RESTORE_LICENSE: Key, DELETE_LICENSE: Trash2,
  BLOCK_IP: Shield, UNBLOCK_IP: Shield, BLOCK_DEVICE: Shield, UNBLOCK_DEVICE: Shield,
  CREATE_PLUGIN: Plus, UPDATE_PLUGIN: Edit3, DELETE_PLUGIN: Trash2,
  UPDATE_SETTINGS: Settings, UPDATE_ROLE: User,
  CREATE_ADMIN: User, DELETE_ADMIN: User,
  LOGIN: LogIn, LOGOUT: LogOut,
}

const ACTION_COLORS: Record<string, string> = {
  CREATE_LICENSE:  'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  UPDATE_LICENSE:  'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
  REVOKE_LICENSE:  'text-red-300 bg-red-500/10 border-red-500/20',
  RESTORE_LICENSE: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  DELETE_LICENSE:  'text-red-300 bg-red-500/10 border-red-500/20',
  BLOCK_IP:        'text-red-300 bg-red-500/10 border-red-500/20',
  UNBLOCK_IP:      'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  BLOCK_DEVICE:    'text-red-300 bg-red-500/10 border-red-500/20',
  UNBLOCK_DEVICE:  'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  CREATE_PLUGIN:   'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  UPDATE_PLUGIN:   'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
  DELETE_PLUGIN:   'text-red-300 bg-red-500/10 border-red-500/20',
  UPDATE_SETTINGS: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  UPDATE_ROLE:     'text-violet-300 bg-violet-500/10 border-violet-500/20',
  CREATE_ADMIN:    'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  DELETE_ADMIN:    'text-red-300 bg-red-500/10 border-red-500/20',
  LOGIN:           'text-blue-300 bg-blue-500/10 border-blue-500/20',
  LOGOUT:          'text-slate-300 bg-slate-500/10 border-slate-500/20',
}

const ALL_ACTIONS = [
  'all',
  'LOGIN', 'LOGOUT',
  'CREATE_LICENSE', 'UPDATE_LICENSE', 'REVOKE_LICENSE', 'RESTORE_LICENSE', 'DELETE_LICENSE',
  'BLOCK_IP', 'UNBLOCK_IP', 'BLOCK_DEVICE', 'UNBLOCK_DEVICE',
  'CREATE_PLUGIN', 'UPDATE_PLUGIN', 'DELETE_PLUGIN',
  'UPDATE_SETTINGS', 'UPDATE_ROLE', 'CREATE_ADMIN', 'DELETE_ADMIN',
]

const DESCRIPTIONS: Record<string, (t: string | null, d: any) => string> = {
  LOGIN:            ()    => 'Admin signed in',
  LOGOUT:           ()    => 'Admin signed out',
  CREATE_LICENSE:   (t)   => `Created license ${t ?? ''}`.trim(),
  UPDATE_LICENSE:   (t,d) => d?.action ? `${d.action.charAt(0).toUpperCase() + d.action.slice(1)} license ${t ?? ''}` : `Updated license ${t ?? ''}`,
  REVOKE_LICENSE:   (t,d) => `Revoked license ${t ?? ''}${d?.reason ? ` — ${d.reason}` : ''}`,
  RESTORE_LICENSE:  (t)   => `Restored license ${t ?? ''}`,
  DELETE_LICENSE:   (t)   => `Deleted license ${t ?? ''}`,
  BLOCK_IP:         (t)   => `Blocked IP ${t ?? ''}`,
  UNBLOCK_IP:       (t)   => `Unblocked IP ${t ?? ''}`,
  BLOCK_DEVICE:     (t)   => `Blocked device ${t ?? ''}`,
  UNBLOCK_DEVICE:   (t)   => `Unblocked device ${t ?? ''}`,
  CREATE_PLUGIN:    (t)   => `Created plugin ${t ?? ''}`,
  UPDATE_PLUGIN:    (t)   => `Updated plugin ${t ?? ''}`,
  DELETE_PLUGIN:    (t)   => `Deleted plugin ${t ?? ''}`,
  UPDATE_SETTINGS:  (t)   => `Updated setting ${t ?? ''}`,
  UPDATE_ROLE:      (t)   => `Updated role for ${t ?? ''}`,
  CREATE_ADMIN:     (t)   => `Created admin ${t ?? ''}`,
  DELETE_ADMIN:     (t)   => `Deleted admin ${t ?? ''}`,
}

const PAGE_SIZE = 25

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(PAGE_SIZE))
      if (actionFilter !== 'all') params.set('action', actionFilter)
      if (search.trim()) params.set('search', search.trim())
      const data = await apiGet<{ items: LogItem[]; total: number }>(`/admin-logs?${params}`)
      setLogs(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setLogs([]); setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, search])

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const exportCsv = () => {
    if (!logs.length) { toast.error('Nothing to export'); return }
    const header = 'Time,Admin,Email,Action,Target,IP,Description'
    const rows = [header, ...logs.map(l => {
      const desc = DESCRIPTIONS[l.action]?.(l.target, l.details) ?? l.action
      const safe = (s: string | null | undefined) => `"${(s ?? '').replace(/"/g, '""')}"`
      return [
        safe(l.createdAt),
        safe(l.admin?.name),
        safe(l.admin?.email),
        safe(l.action),
        safe(l.target),
        safe(l.ip),
        safe(desc),
      ].join(',')
    })].join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows)
    a.download = `admin-logs-page${page}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    toast.success('CSV exported')
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Admin Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-0.5">Full audit trail of every admin action</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-ghost btn-sm flex items-center gap-2">
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </button>
          <button onClick={exportCsv} className="btn-ghost btn-sm flex items-center gap-2 disabled:opacity-50" disabled={!logs.length}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-white/[0.05]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              type="text"
              placeholder="Search by admin email, target, or IP..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="input pl-9"
            />
          </div>
          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(1) }}
            className="input max-w-[220px] text-sm"
          >
            {ALL_ACTIONS.map(a => (
              <option key={a} value={a}>{a === 'all' ? 'All Actions' : a.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />Loading logs…
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ScrollText className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-sm font-medium text-slate-500">No matching audit log entries</p>
              <p className="text-xs text-slate-700 mt-1">Try a different filter or search term</p>
            </div>
          ) : logs.map((log, i) => {
            const Icon = ACTION_ICONS[log.action] ?? ScrollText
            const color = ACTION_COLORS[log.action] ?? 'text-slate-300 bg-slate-500/10 border-slate-500/20'
            const isOpen = expanded === log.id
            const desc = DESCRIPTIONS[log.action]?.(log.target, log.details) ?? log.action.replace(/_/g, ' ')
            const hasDetails = !!(log.details || log.diff)
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className={cn('px-5 py-4 hover:bg-white/[0.02] transition-colors', isOpen && 'bg-white/[0.02]')}
              >
                <div className="flex items-start gap-4">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border', color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-200">{log.action.replace(/_/g, ' ')}</span>
                      {log.target && (
                        <code className="text-2xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                          {log.target}
                        </code>
                      )}
                      {log.targetType && (
                        <span className="text-2xs text-slate-700 uppercase tracking-wider">{log.targetType}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{desc}</p>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="text-2xs text-slate-600 flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[8px] font-bold">
                          {log.admin?.name?.charAt(0) ?? '?'}
                        </div>
                        <span className="font-medium text-slate-500">{log.admin?.name ?? 'Unknown'}</span>
                        <span className="text-slate-700">·</span>
                        <span>{log.admin?.email ?? ''}</span>
                      </span>
                      {log.ip && <span className="text-2xs text-slate-700 font-mono">IP {log.ip}</span>}
                      <span className="text-2xs text-slate-700">{formatDateTime(log.createdAt)}</span>
                    </div>
                    {hasDetails && (
                      <button
                        onClick={() => setExpanded(isOpen ? null : log.id)}
                        className="mt-2 text-2xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {isOpen ? 'Hide details' : 'Show details'}
                      </button>
                    )}
                    {isOpen && hasDetails && (
                      <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {log.details && (
                          <div className="rounded-lg bg-black/30 border border-white/[0.05] p-3">
                            <div className="text-2xs text-slate-600 mb-2 font-semibold uppercase tracking-wider">Details</div>
                            <pre className="text-2xs text-slate-300 font-mono whitespace-pre-wrap break-all">
{JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.diff && (
                          <div className="rounded-lg bg-black/30 border border-white/[0.05] p-3">
                            <div className="text-2xs text-slate-600 mb-2 font-semibold uppercase tracking-wider">Diff</div>
                            <pre className="text-2xs text-slate-300 font-mono whitespace-pre-wrap break-all">
{JSON.stringify(log.diff, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-2xs text-slate-700 flex-shrink-0">{formatRelativeTime(log.createdAt)}</span>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="px-5 py-3 border-t border-white/[0.05] flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-slate-600">
            Showing {logs.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-{(page - 1) * PAGE_SIZE + logs.length} of {total.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="btn-icon btn-sm disabled:opacity-30">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {pageNumbers(page, totalPages).map((n, idx) =>
              n === '…'
                ? <span key={idx} className="px-2 text-xs text-slate-600">…</span>
                : <button
                    key={idx}
                    onClick={() => setPage(n as number)}
                    className={cn(
                      'min-w-[28px] h-7 px-2 rounded-md text-xs font-medium transition',
                      n === page ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                    )}
                  >{n}</button>
            )}
            <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="btn-icon btn-sm disabled:opacity-30">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const arr: (number | '…')[] = [1]
  if (current > 3) arr.push('…')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) arr.push(i)
  if (current < total - 2) arr.push('…')
  arr.push(total)
  return arr
}