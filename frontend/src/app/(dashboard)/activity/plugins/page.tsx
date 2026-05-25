'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Puzzle, BarChart2, Search, RefreshCw, AlertTriangle } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { apiGet } from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

type Plugin = {
  id: string; slug: string; name: string; isEnabled: boolean
  downloadCount: number; iconUrl: string | null; category: string | null
  version: string; metadata: { tvTypes?: string[] } | null
}

const COLORS = ['#6366f1','#10b981','#f59e0b','#38bdf8','#ec4899','#a78bfa','#fb923c','#34d399']

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs" style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="text-slate-400 mb-1">{label}</div>
      <div className="font-bold text-slate-200">{formatNumber(payload[0].value)} download</div>
    </div>
  )
}

export default function PluginAnalyticsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const fetchPlugins = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet<Plugin[] | { items: Plugin[]; total: number }>('/plugins?limit=500')
      const list = Array.isArray(data) ? data : ((data as { items: Plugin[] }).items ?? [])
      setPlugins(list.sort((a, b) => b.downloadCount - a.downloadCount))
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Gagal memuat plugin')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlugins() }, [fetchPlugins])

  const filtered = plugins.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase())
  )

  const activePlugins = plugins.filter(p => p.isEnabled)
  const totalDownloads = plugins.reduce((a, p) => a + p.downloadCount, 0)
  const topFive = activePlugins.slice(0, 5).map(p => ({ name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name, value: p.downloadCount }))

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Plugin Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Statistik plugin yang terdaftar di sistem</p>
        </div>
        <button onClick={fetchPlugins} className="btn-ghost btn-sm flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm border border-red-500/25 bg-red-500/[0.08] text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /><span className="flex-1">{error}</span>
          <button onClick={fetchPlugins} className="px-3 py-1 rounded-lg bg-red-500/15 border border-red-500/25 text-xs font-semibold hover:bg-red-500/25 transition-colors">Retry</button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Plugin', value: loading ? '…' : plugins.length, color: 'text-indigo-400' },
          { label: 'Plugin Aktif', value: loading ? '…' : activePlugins.length, color: 'text-emerald-400' },
          { label: 'Total Download', value: loading ? '…' : formatNumber(totalDownloads), color: 'text-cyan-400' },
          { label: 'Kategori', value: loading ? '…' : new Set(plugins.map(p => p.category).filter(Boolean)).size, color: 'text-violet-400' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-4">
            <div className={cn('text-2xl font-bold tabular-nums', s.color)}>{s.value}</div>
            <div className="text-xs text-slate-600 mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      {!loading && topFive.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Top Plugin by Download</h3>
              <p className="text-xs text-slate-500">Berdasarkan total download terdaftar</p>
            </div>
            <BarChart2 className="w-4 h-4 text-slate-600" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topFive} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} tickFormatter={v => formatNumber(v)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20} fill="rgba(99,102,241,0.5)" activeBar={{ fill: '#6366f1' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari plugin…" className="input pl-8 h-8 text-xs w-52" />
          </div>
          <span className="text-xs text-slate-600">{filtered.length} plugin</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-600">
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />Memuat plugin…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Puzzle className="w-10 h-10 text-slate-800 mb-3" />
            <p className="text-sm font-semibold text-slate-500 mb-1">Belum ada plugin</p>
            <p className="text-xs text-slate-700">Tambah plugin melalui menu Plugins</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Plugin</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Versi</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Kategori</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Download</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Share</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const maxDl = filtered[0]?.downloadCount || 1
                  const pct = Math.round((p.downloadCount / maxDl) * 100)
                  return (
                    <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {p.iconUrl
                            ? <img src={p.iconUrl} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                            : <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                <Puzzle className="w-3.5 h-3.5 text-indigo-400" />
                              </div>}
                          <div>
                            <div className="text-sm font-semibold text-slate-200">{p.name}</div>
                            <div className="text-xs text-slate-600 font-mono">/{p.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-400 font-mono">v{p.version}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-400">{p.category || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-slate-300 tabular-nums">
                        {formatNumber(p.downloadCount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border',
                          p.isEnabled
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-500/15 text-slate-500 border-slate-500/20')}>
                          {p.isEnabled ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] + '99' }} />
                          </div>
                          <span className="text-xs text-slate-600 w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
