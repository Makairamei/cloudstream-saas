'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Pause, Play, Zap, RefreshCw, AlertTriangle,
  ChevronLeft, ChevronRight, Search,
} from 'lucide-react'
import { cn, getActivityColor, getActivityBg, formatRelativeTime } from '@/lib/utils'
import { apiGet } from '@/lib/api'
import type { ActivityType } from '@/types'

interface LiveEvent {
  id: string
  type: ActivityType
  licenseKey: string
  ip: string | null
  message: string | null
  severity: string
  createdAt: string
}

const TYPE_LABELS: Partial<Record<ActivityType, string>> = {
  VERIFY_OK: 'VERIFY OK', VERIFY_FAIL: 'VERIFY FAIL', DEVICE_REGISTERED: 'DEVICE REG',
  LICENSE_CREATED: 'CREATED', LICENSE_EXPIRED: 'EXPIRED', ABUSE_DETECTED: 'ABUSE',
  DEVICE_BLOCKED: 'BLOCKED', LICENSE_REVOKED: 'REVOKED', PLAYBACK_START: 'PLAYBACK',
  PLUGIN_SESSION: 'PLUGIN OPEN', SELECTORS_OK: 'SELECTORS', IP_BLOCKED: 'IP BLOCK',
}

const POLL_MS = 15000
const PAGE_SIZE = 25

export default function LiveActivityPage() {
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchActivity = useCallback(async () => {
    try {
      const data = await apiGet<LiveEvent[]>('/activity?limit=500')
      setEvents(Array.isArray(data) ? data : [])
      setLastUpdated(new Date())
      setError(null)
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to load activity')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchActivity() }, [fetchActivity])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!isPaused) intervalRef.current = setInterval(fetchActivity, POLL_MS)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPaused, fetchActivity])

  // Reset page when filter/search changes
  useEffect(() => { setPage(1) }, [filter, search])

  const filtered = events.filter(e => {
    if (filter !== 'all' && e.type !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        e.licenseKey?.toLowerCase().includes(q) ||
        e.message?.toLowerCase().includes(q) ||
        e.ip?.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q)
      )
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageStart = (page - 1) * PAGE_SIZE
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  const stats = {
    total: events.length,
    ok: events.filter(e => e.type === 'VERIFY_OK' || e.type === 'PLUGIN_SESSION').length,
    fail: events.filter(e => e.type === 'VERIFY_FAIL').length,
    abuse: events.filter(e => e.type === 'ABUSE_DETECTED' || e.type === 'DEVICE_BLOCKED' || e.type === 'IP_BLOCKED').length,
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Live Activity Feed</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {lastUpdated ? `Updated ${formatRelativeTime(lastUpdated.toISOString())}` : 'Loading…'}
            </p>
          </div>
          <div className={cn(
            'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border',
            isPaused
              ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
          )}>
            <div className={cn('w-1.5 h-1.5 rounded-full', isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse')} />
            {isPaused ? 'PAUSED' : 'LIVE'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchActivity} className="btn-ghost btn-sm flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />Refresh
          </button>
          <button onClick={() => setIsPaused(p => !p)} className={cn('btn-sm flex items-center gap-1.5', isPaused ? 'btn-primary' : 'btn-ghost')}>
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm border border-red-500/25 bg-red-500/[0.08] text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchActivity} className="px-3 py-1 rounded-lg bg-red-500/15 border border-red-500/25 text-xs font-semibold hover:bg-red-500/25 transition-colors">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: stats.total, color: 'text-slate-300' },
          { label: 'Verify OK',    value: stats.ok,    color: 'text-emerald-400' },
          { label: 'Verify Fail',  value: stats.fail,  color: 'text-red-400' },
          { label: 'Abuse / Block',value: stats.abuse, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={cn('text-2xl font-bold tabular-nums', s.color)}>{s.value}</div>
            <div className="text-xs text-slate-600 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
            <input
              type="text"
              placeholder="Search license, IP, message…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 w-full text-sm h-9"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Zap className="w-4 h-4 text-slate-600 flex-shrink-0" />
            {(['all', 'VERIFY_OK', 'VERIFY_FAIL', 'ABUSE_DETECTED', 'DEVICE_BLOCKED', 'PLAYBACK_START', 'PLUGIN_SESSION'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-2xs font-medium transition-all',
                  filter === f
                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent hover:bg-white/[0.04]'
                )}
              >
                {f === 'all' ? 'All' : TYPE_LABELS[f as ActivityType] ?? f}
              </button>
            ))}
          </div>
          <div className="ml-auto text-2xs text-slate-700">
            {filtered.length} event{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="font-mono text-xs">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-600">
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />Loading activity…
            </div>
          ) : pageItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-700">
              <Activity className="w-10 h-10 mb-3 text-slate-800" />
              <p className="text-sm font-medium text-slate-600">No activity matching filter</p>
              <p className="text-xs text-slate-700 mt-1">Try a different filter or search</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {pageItems.map(event => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className="grid grid-cols-[80px_120px_140px_1fr_120px] gap-3 items-center px-4 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-slate-700 truncate">
                    {new Date(event.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className={cn('px-2 py-0.5 rounded text-2xs font-bold border truncate', getActivityBg(event.type), getActivityColor(event.type))}>
                    {TYPE_LABELS[event.type] ?? event.type}
                  </span>
                  <span className="text-indigo-400 truncate">{event.licenseKey || '—'}</span>
                  <span className="text-slate-400 truncate">{event.message || event.type}</span>
                  <span className="text-slate-600 font-mono truncate text-right">{event.ip || ''}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05] flex-wrap gap-3">
            <span className="text-xs text-slate-500">
              Showing {pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="btn-icon btn-sm disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {pageNumbers(page, totalPages).map((n, idx) =>
                n === '…'
                  ? <span key={idx} className="px-2 text-xs text-slate-600">…</span>
                  : (
                    <button
                      key={idx}
                      onClick={() => setPage(n as number)}
                      className={cn(
                        'min-w-[28px] h-7 px-2 rounded-md text-xs font-medium transition',
                        n === page
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                      )}
                    >
                      {n}
                    </button>
                  )
              )}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="btn-icon btn-sm disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
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