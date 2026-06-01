'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Play, Search, Download, Copy, ChevronLeft, ChevronRight, RefreshCw, Clock, AlertTriangle } from 'lucide-react'
import { cn, formatDate, copyToClipboard } from '@/lib/utils'
import { apiGet } from '@/lib/api'
import toast from 'react-hot-toast'

interface PlaybackLog {
  id: string
  licenseKey: string
  licenseName?: string
  pluginSlug: string
  pluginName?: string
  contentTitle: string | null
  deviceName: string | null
  ip: string | null
  durationSeconds: number | null
  playedAt: string
  createdAt: string
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}m ${sec < 10 ? '0' : ''}${sec}s`
}

const PAGE_SIZE = 25

export default function PlaybackLogsPage() {
  const [logs, setLogs] = useState<PlaybackLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet<{ items: PlaybackLog[]; total: number }>('/playback?limit=500')
      const list = data?.items ?? []
      setLogs(list)
    } catch {
      setLogs([])
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  useEffect(() => { setPage(1) }, [search])

  const filtered = logs.filter(l =>
    !search ||
    (l.pluginSlug ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (l.pluginName ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (l.licenseName ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (l.contentTitle ?? '').toLowerCase().includes(search.toLowerCase()) ||
    l.licenseKey.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const exportCsv = () => {
    if (!filtered.length) { toast.error('Nothing to export'); return }
    const header = 'License Key,Plugin,Content,Device,IP,Duration,Time'
    const rows = [header, ...filtered.map(l =>
      `"${l.licenseKey}","${l.pluginName ?? l.pluginSlug}","${l.contentTitle ?? ''}","${l.deviceName ?? ''}","${l.ip ?? ''}","${l.durationSeconds ? formatDuration(l.durationSeconds) : ''}","${l.playedAt ?? l.createdAt}"`
    )].join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows)
    a.download = `playback-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    toast.success('CSV exported')
  }

  const totalDurationHours = logs.reduce((a, l) => a + (l.durationSeconds ?? 0), 0) / 3600

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Playback Logs</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? 'Loading...' : `${filtered.length} playback record${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchLogs} className="btn-ghost btn-sm flex items-center gap-1.5">
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </button>
          <button onClick={exportCsv} disabled={!filtered.length} className="btn-ghost btn-sm flex items-center gap-1.5 disabled:opacity-40">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm border border-red-500/25 bg-red-500/[0.08] text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchLogs} className="px-3 py-1 rounded-lg bg-red-500/15 border border-red-500/25 text-xs font-semibold hover:bg-red-500/25 transition-colors">Retry</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Playback',     value: logs.length || 0,                                                color: 'text-indigo-400' },
          { label: 'Unique Licenses',    value: new Set(logs.map(l => l.licenseKey)).size || 0,                  color: 'text-slate-300' },
          { label: 'Plugins Used',       value: new Set(logs.map(l => l.pluginSlug)).size || 0,                  color: 'text-emerald-400' },
          { label: 'Total Watch Time',   value: logs.length ? `${Math.floor(totalDurationHours)}h` : '0h',       color: 'text-cyan-400' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-4">
            <div className={cn('text-xl font-bold tabular-nums', s.color)}>{s.value}</div>
            <div className="text-xs text-slate-600 mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search plugin, license, content..."
            className="input pl-8 w-64 h-9 text-xs"
          />
        </div>
        <span className="text-xs text-slate-500">{filtered.length} records</span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-600">
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />Loading...
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
              <Play className="w-7 h-7 text-slate-700" />
            </div>
            <p className="text-sm font-semibold text-slate-500 mb-1">No playback records yet</p>
            <p className="text-xs text-slate-700 text-center max-w-xs">
              Playback logs will appear here when users start watching content via plugins.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-[180px]">License</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-[110px]">Plugin</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Content</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-[120px]">Device / IP</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-[80px]">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-[130px]">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((l, i) => (
                    <motion.tr
                      key={l.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        {l.licenseName && <div className="text-xs font-semibold text-slate-200 truncate">{l.licenseName}</div>}
                        <button
                          onClick={() => { copyToClipboard(l.licenseKey); toast.success('Key copied') }}
                          className="flex items-center gap-1 font-mono text-2xs text-indigo-400 hover:text-indigo-300"
                        >
                          {l.licenseKey.substring(0, 16)}
                          <Copy className="w-2.5 h-2.5 opacity-50" />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-slate-300">{l.pluginName ?? l.pluginSlug}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-300 truncate">{l.contentTitle || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-400 truncate">{l.deviceName || '-'}</div>
                        <div className="text-2xs font-mono text-slate-600">{l.ip || ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        {l.durationSeconds ? (
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="w-3 h-3 text-slate-600" />
                            {formatDuration(l.durationSeconds)}
                          </div>
                        ) : <span className="text-slate-700">-</span>}
                      </td>
                      <td className="px-4 py-3 text-2xs text-slate-500 whitespace-nowrap">
                        {formatDate(l.playedAt ?? l.createdAt)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05] text-xs text-slate-500">
              <span>{filtered.length} total records</span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost btn-sm disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <span>Page {page} / {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-ghost btn-sm disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}