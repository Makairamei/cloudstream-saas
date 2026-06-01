'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Activity, Zap, Key, BarChart2, RefreshCw,
} from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { apiGet } from '@/lib/api'

const PERIODS: Array<{ key: 'today' | '7d' | '30d' | '1y'; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '1y', label: '1 year' },
]

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#64748b', '#ec4899']

interface TrendPoint { time: string; licenses: number; devices: number; playbacks: number }
interface PluginItem { id: string; slug: string; name: string; downloadCount: number }
interface GeoItem { country: string; count: number; pct: number }
interface Overview {
  totalLicenses: number; activeDevices: number; pluginsToday: number; playbacksToday: number;
  blockedTotal: number; licensesChange: number; devicesChange: number;
  pluginsChange: number; playbacksChange: number; blockedChange: number;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | '1y'>('30d')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [plugins, setPlugins] = useState<PluginItem[]>([])
  const [geo, setGeo] = useState<GeoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)


  const load = async () => {
    setRefreshing(true)
    try {
      const [ov, tr, pl, ge] = await Promise.all([
        apiGet<Overview>('/analytics/overview'),
        apiGet<TrendPoint[]>(`/analytics/trend?range=${period}`),
        apiGet<PluginItem[]>('/analytics/plugins?limit=8&days=30'),
        apiGet<GeoItem[]>('/analytics/geo?limit=10'),
      ])
      setOverview(ov)
      setTrend(tr ?? [])
      setPlugins(pl ?? [])
      setGeo(ge ?? [])
    } catch { /* ignore */ } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [period])

  const totalRequests = trend.reduce((a, b) => a + (b.licenses || 0), 0)
  const totalNew = 0 // computed from trend later if needed
  const flagFor = (cc: string) => {
    if (!cc || cc.length !== 2) return 'ðŸŒ'
    const code = cc.toUpperCase()
    return String.fromCodePoint(...code.split('').map(c => 127397 + c.charCodeAt(0)))
  }

  const pluginPie = plugins.map(p => ({ name: p.name, uses: p.downloadCount || 0 }))

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time data from your license ecosystem</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-ghost btn-sm flex items-center gap-1.5">
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            Refresh
          </button>
          <div className="flex items-center gap-1.5 p-1 rounded-xl card">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  period === p.key
                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                    : 'text-slate-500 hover:text-slate-300'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI cards (real data from /analytics/overview) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiTile label="Total Licenses"   value={overview?.totalLicenses ?? 0}   change={overview?.licensesChange ?? 0}  icon={Key}      />
        <KpiTile label="Active Devices"   value={overview?.activeDevices ?? 0}   change={overview?.devicesChange ?? 0}   icon={Activity} />
        <KpiTile label="Plugin Sessions"  value={overview?.pluginsToday ?? 0}    change={overview?.pluginsChange ?? 0}   icon={Zap}      suffix=" /day" />
        <KpiTile label="Playbacks Today"  value={overview?.playbacksToday ?? 0}  change={overview?.playbacksChange ?? 0} icon={BarChart2} />
      </div>

      {/* Activity trend */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="font-semibold text-slate-200">Activity Trend</div>
            <div className="text-xs text-slate-600 mt-0.5">
              Verifications, devices, and playbacks per hour ({period})
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" />Verifications</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />New Devices</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500" />Playbacks</span>
          </div>
        </div>
        {loading ? (
          <div className="h-[220px] flex items-center justify-center text-slate-600 text-sm">Loadingâ€¦</div>
        ) : trend.length === 0 ? (
          <EmptyState message="No activity in this period yet." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="grdLic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grdDev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grdPlay" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />
              <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(trend.length / 8))} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => formatNumber(v)} />
              <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '12px' }} labelStyle={{ color: '#94a3b8' }} />
              <Area type="monotone" dataKey="licenses"  stroke="#6366f1" strokeWidth={2} fill="url(#grdLic)"  dot={false} />
              <Area type="monotone" dataKey="devices"   stroke="#10b981" strokeWidth={2} fill="url(#grdDev)"  dot={false} />
              <Area type="monotone" dataKey="playbacks" stroke="#06b6d4" strokeWidth={2} fill="url(#grdPlay)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Plugins + Geo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="font-semibold text-slate-200 mb-1">Plugin Usage Distribution</div>
          <div className="text-xs text-slate-600 mb-4">Plugin sessions in the last 30 days</div>
          {loading ? (
            <div className="h-[180px] flex items-center justify-center text-slate-600 text-sm">Loadingâ€¦</div>
          ) : pluginPie.length === 0 || pluginPie.every(p => p.uses === 0) ? (
            <EmptyState message="No plugin usage recorded yet." />
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={pluginPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="uses">
                    {pluginPie.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 flex-1 max-h-[160px] overflow-y-auto cs-scroll pr-1">
                {pluginPie.map((p, idx) => (
                  <div key={p.name + idx} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="text-xs text-slate-400 flex-1 truncate">{p.name}</span>
                    <span className="text-xs font-medium text-slate-300 tabular-nums">{formatNumber(p.uses)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="font-semibold text-slate-200 mb-1">Geographic Distribution</div>
          <div className="text-xs text-slate-600 mb-4">License verifications by country (last 7 days)</div>
          {loading ? (
            <div className="h-[180px] flex items-center justify-center text-slate-600 text-sm">Loadingâ€¦</div>
          ) : geo.length === 0 ? (
            <EmptyState message="No geo data yet. Country data accumulates as plugins make requests." />
          ) : (
            <div className="space-y-3 max-h-[260px] overflow-y-auto cs-scroll pr-1">
              {geo.map((g, i) => (
                <motion.div
                  key={g.country + i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-4"
                >
                  <span className="text-lg w-6 flex-shrink-0">{flagFor(g.country)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-300">{g.country}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 tabular-nums">{formatNumber(g.count)}</span>
                        <span className="text-xs font-medium text-slate-400 w-10 text-right tabular-nums">{g.pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.05]">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${g.pct}%` }}
                        transition={{ delay: i * 0.04 + 0.2, duration: 0.6 }}
                        style={{ background: `hsl(${190 + i * 15}, 75%, 60%)` }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Plugin bar chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="font-semibold text-slate-200">Top Plugins by Usage</div>
            <div className="text-xs text-slate-600 mt-0.5">Real-time activity over the last 30 days</div>
          </div>
          <span className="text-xs text-slate-700">{plugins.length} plugins</span>
        </div>
        {plugins.length === 0 ? (
          <EmptyState message="No plugin downloads recorded yet." />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, plugins.length * 32)}>
            <BarChart data={plugins} layout="vertical" margin={{ top: 0, right: 16, left: 60, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.10)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => formatNumber(v)} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} width={120} />
              <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '12px' }} />
              <Bar dataKey="downloadCount" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function KpiTile({ label, value, change, icon: Icon, suffix = '' }: { label: string; value: number; change: number; icon: any; suffix?: string }) {
  const up = change >= 0
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-600">{label}</span>
        <Icon className="w-4 h-4 text-slate-700" />
      </div>
      <div className="text-2xl font-bold text-slate-100 tabular-nums">{formatNumber(value)}{suffix}</div>
      <div className={cn('text-xs mt-1 flex items-center gap-1', up ? 'text-emerald-400' : 'text-red-400')}>
        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(change).toFixed(1)}% vs prev period
      </div>
    </motion.div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-[180px] flex flex-col items-center justify-center text-center px-6">
      <Activity className="w-8 h-8 text-slate-700 mb-2" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  )
}