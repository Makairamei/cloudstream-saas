'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Pause, Play, Trash2, Zap, RefreshCw, AlertTriangle } from 'lucide-react'
import { cn, getActivityColor, getActivityBg } from '@/lib/utils'
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
  DEVICE_BLOCKED: 'BLOCKED', LICENSE_REVOKED: 'REVOKED',
}

const POLL_MS = 15000

export default function LiveActivityPage() {
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchActivity = useCallback(async () => {
    try {
      const data = await apiGet<LiveEvent[]>('/activity?limit=100')
      setEvents(Array.isArray(data) ? data : [])
      setLastUpdated(new Date())
      setError(null)
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Gagal memuat aktivitas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchActivity() }, [fetchActivity])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!isPaused) {
      intervalRef.current = setInterval(fetchActivity, POLL_MS)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPaused, fetchActivity])

  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter)
  const stats = {
    total: events.length,
    ok: events.filter(e => e.type === 'VERIFY_OK').length,
    fail: events.filter(e => e.type === 'VERIFY_FAIL').length,
    abuse: events.filter(e => e.type === 'ABUSE_DETECTED' || e.type === 'DEVICE_BLOCKED').length,
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Live Activity Feed</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {lastUpdated ? `Diperbarui ${lastUpdated.toLocaleTimeString('id-ID')}` : 'Memuat aktivitas…'}
            </p>
          </div>
          <div className={cn('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border',
            isPaused
              ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20')}>
            <div className={cn('w-1.5 h-1.5 rounded-full', isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse')} />
            {isPaused ? 'PAUSED' : 'LIVE'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchActivity} className="btn-ghost btn-sm flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />Refresh
          </button>
          <button onClick={() => setEvents([])} className="btn-ghost btn-sm flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" />Clear
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
          { label: 'Verify OK', value: stats.ok, color: 'text-emerald-400' },
          { label: 'Verify Fail', value: stats.fail, color: 'text-red-400' },
          { label: 'Abuse / Blokir', value: stats.abuse, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={cn('text-2xl font-bold tabular-nums', s.color)}>{s.value}</div>
            <div className="text-xs text-slate-600 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05] flex-wrap">
          <Zap className="w-4 h-4 text-slate-600 flex-shrink-0" />
          {(['all', 'VERIFY_OK', 'VERIFY_FAIL', 'ABUSE_DETECTED', 'DEVICE_BLOCKED', 'DEVICE_REGISTERED', 'LICENSE_CREATED', 'LICENSE_EXPIRED'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-2.5 py-1 rounded-lg text-2xs font-medium transition-all',
                filter === f ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25' : 'text-slate-600 hover:text-slate-400 border border-transparent')}>
              {f === 'all' ? 'Semua' : TYPE_LABELS[f as ActivityType] ?? f}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-2xs text-slate-700">
            {!isPaused && <RefreshCw className="w-3 h-3 animate-spin opacity-40" />}
            {filtered.length} event
          </div>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-600">
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />Memuat aktivitas…
            </div>
          ) : (
            <div className="font-mono text-xs">
              <AnimatePresence initial={false}>
                {filtered.map(event => (
                  <motion.div key={event.id}
                    initial={{ opacity: 0, height: 0, y: -4 }} animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                    className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-slate-700 flex-shrink-0 w-20 text-right">
                      {new Date(event.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className={cn('flex-shrink-0 px-2 py-0.5 rounded text-2xs font-bold border', getActivityBg(event.type), getActivityColor(event.type))}>
                      {TYPE_LABELS[event.type] ?? event.type}
                    </span>
                    <span className="text-indigo-400 flex-shrink-0 w-36 truncate">{event.licenseKey || '—'}</span>
                    <span className="text-slate-400 flex-1 truncate">{event.message || event.type}</span>
                    <span className="text-slate-600 flex-shrink-0 font-mono">{event.ip || ''}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {filtered.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-700">
                  <Activity className="w-10 h-10 mb-3 text-slate-800" />
                  <p className="text-sm font-medium text-slate-600">Belum ada aktivitas</p>
                  <p className="text-xs text-slate-700 mt-1">Aktivitas akan muncul saat lisensi digunakan</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
