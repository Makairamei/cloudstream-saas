'use client'

import { useState, useEffect, type ElementType } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  useDashboardOverview, useActivityTrend, useRecentActivity,
  useLicenseStats, useTopPlugins,
} from '@/hooks/useApi'
import {
  Key, Monitor, Puzzle, Play, ShieldX, TrendingUp, TrendingDown,
  Activity, Zap, Server, RefreshCw, Radio, ArrowUpRight,
  Inbox, ExternalLink, Clock, AlertTriangle,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { cn, formatNumber, formatRelativeTime, getActivityBg } from '@/lib/utils'
import type { ActivityType, Severity } from '@/types'

// ----- KPI Card --------------------------------------------------------------

interface KpiProps {
  title: string
  value: number
  change: number
  icon: ElementType
  color: string
  glowColor: string
  delay?: number
  href?: string
}

function KpiCard({ title, value, change, icon: Icon, color, glowColor, delay = 0, href }: KpiProps) {
  const router = useRouter()
  const isPositive = change >= 0
  const showChange = change !== 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => href && router.push(href)}
      className={cn(
        'card p-5 group transition-all duration-300 relative overflow-hidden',
        href ? 'cursor-pointer hover:border-white/[0.15] hover:-translate-y-0.5' : 'cursor-default hover:border-white/[0.12]',
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: color, boxShadow: `0 0 20px ${glowColor}` }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex items-center gap-2">
          {showChange && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium',
              isPositive ? 'text-emerald-400' : 'text-red-400',
            )}>
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {Math.abs(change)}%
            </div>
          )}
          {href && <ArrowUpRight className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-100 mb-1 tabular-nums">{value.toLocaleString()}</div>
      <div className="text-xs text-slate-500">{title}</div>
    </motion.div>
  )
}

const ACTIVITY_HOVER_COLORS: Record<string, { glow: string; border: string; bar: string }> = {
  VERIFY_OK:         { glow: 'rgba(16,185,129,0.22)',  border: 'rgba(16,185,129,0.5)',  bar: '#10b981' },
  PLAYBACK_START:    { glow: 'rgba(6,182,212,0.22)',   border: 'rgba(6,182,212,0.5)',   bar: '#06b6d4' },
  DEVICE_REGISTERED: { glow: 'rgba(99,102,241,0.22)',  border: 'rgba(99,102,241,0.5)',  bar: '#6366f1' },
  PLUGIN_SESSION:    { glow: 'rgba(6,182,212,0.22)',   border: 'rgba(6,182,212,0.5)',   bar: '#06b6d4' },
  SELECTORS_OK:      { glow: 'rgba(16,185,129,0.16)',  border: 'rgba(16,185,129,0.4)',  bar: '#10b981' },
  VERIFY_FAIL:       { glow: 'rgba(239,68,68,0.22)',   border: 'rgba(239,68,68,0.5)',   bar: '#ef4444' },
  ABUSE_DETECTED:    { glow: 'rgba(239,68,68,0.28)',   border: 'rgba(239,68,68,0.55)',  bar: '#ef4444' },
  LICENSE_CREATED:   { glow: 'rgba(99,102,241,0.22)',  border: 'rgba(99,102,241,0.5)',  bar: '#6366f1' },
  LICENSE_EXPIRED:   { glow: 'rgba(245,158,11,0.22)',  border: 'rgba(245,158,11,0.5)',  bar: '#f59e0b' },
  DEVICE_BLOCKED:    { glow: 'rgba(239,68,68,0.22)',   border: 'rgba(239,68,68,0.5)',   bar: '#ef4444' },
  _default:          { glow: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.4)', bar: '#64748b' },
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="px-3 py-2 rounded-xl text-xs"
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      }}
    >
      <p className="text-slate-500 mb-1.5 font-medium">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <strong>{formatNumber(p.value)}</strong>
        </p>
      ))}
    </div>
  )
}

function HealthMetric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-xs font-medium text-slate-300">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  )
}

function Empty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 text-slate-500">
      <Inbox className="w-8 h-8 mb-2 opacity-50" />
      <p className="text-xs">{message}</p>
    </div>
  )
}

const DONUT_COLORS: Record<string, string> = {
  ACTIVE: '#10b981',
  EXPIRED: '#ef4444',
  TRIAL: '#06b6d4',
  EXPIRING_SOON: '#f59e0b',
  REVOKED: '#6366f1',
  SUSPENDED: '#64748b',
}

export default function DashboardPage() {
  const [activityFilter, setActivityFilter] = useState<'all' | 'abuse' | 'verify' | 'playback'>('all')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [trendRange, setTrendRange] = useState<'today' | '7d' | '30d' | '1y'>('today')

  const { data: overview, refetch: refetchOverview } = useDashboardOverview({
    fallback: {
      totalLicenses: 0, activeDevices: 0, pluginsToday: 0, playbacksToday: 0, blockedTotal: 0,
      licensesChange: 0, devicesChange: 0, pluginsChange: 0, playbacksChange: 0, blockedChange: 0,
      expiredCount: 0, expiringSoonCount: 0, revokedCount: 0, blockedDevicesCount: 0,
    },
  })
  const { data: areaRaw } = useActivityTrend(trendRange)
  const { data: activityRaw, refetch: refetchActivity } = useRecentActivity(40)
  const { data: licenseStatsRaw } = useLicenseStats()
  const { data: topPluginsRaw } = useTopPlugins(5)

  const areaData = (areaRaw && areaRaw.length > 0) ? areaRaw : []
  const topPlugins = (topPluginsRaw && topPluginsRaw.length > 0)
    ? topPluginsRaw.map(p => ({ name: p.name, uses: p.downloadCount, trend: 0 }))
    : []
  const donutData = (licenseStatsRaw && licenseStatsRaw.length > 0)
    ? licenseStatsRaw.map(s => ({
        name: s.status.charAt(0) + s.status.slice(1).toLowerCase().replace('_', ' '),
        value: s.count,
        color: DONUT_COLORS[s.status] ?? '#6366f1',
      }))
    : []
  const liveActivity = (activityRaw && activityRaw.length > 0)
    ? activityRaw.map(a => ({
        id: a.id,
        type: a.type as ActivityType,
        severity: a.severity as Severity,
        message: a.message,
        licenseKey: a.licenseKey,
        ip: a.ip ?? '',
        country: a.country ?? '',
        time: formatRelativeTime(a.createdAt),
      }))
    : []

  useEffect(() => { setLastRefresh(new Date()) }, [])

  const filteredActivity = liveActivity.filter(a => {
    if (activityFilter === 'all') return true
    if (activityFilter === 'abuse') return a.type === 'ABUSE_DETECTED'
    if (activityFilter === 'verify') return a.type.startsWith('VERIFY')
    if (activityFilter === 'playback') return a.type.startsWith('PLAYBACK')
    return true
  })

  const handleRefresh = () => {
    refetchOverview()
    refetchActivity()
    setLastRefresh(new Date())
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Command Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time overview &middot; {lastRefresh ? `Updated ${formatRelativeTime(lastRefresh.toISOString())}` : 'Live'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="btn-ghost btn-sm flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs badge-green">
            <span className="pulse-green" />
            Live
          </div>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <KpiCard title="Total Licenses"  value={overview?.totalLicenses ?? 0}   change={overview?.licensesChange ?? 0}  icon={Key}     color="linear-gradient(135deg,#6366f1,#818cf8)" glowColor="rgba(99,102,241,0.45)" delay={0}    href="/licenses" />
        <KpiCard title="Online Devices"  value={overview?.activeDevices ?? 0}   change={overview?.devicesChange ?? 0}   icon={Monitor} color="linear-gradient(135deg,#10b981,#34d399)" glowColor="rgba(16,185,129,0.45)" delay={0.05} href="/devices" />
        <KpiCard title="Plugins Today"   value={overview?.pluginsToday ?? 0}    change={overview?.pluginsChange ?? 0}   icon={Puzzle}  color="linear-gradient(135deg,#8b5cf6,#a78bfa)" glowColor="rgba(139,92,246,0.45)" delay={0.1}  href="/plugins" />
        <KpiCard title="Playbacks Today" value={overview?.playbacksToday ?? 0}  change={overview?.playbacksChange ?? 0} icon={Play}    color="linear-gradient(135deg,#06b6d4,#22d3ee)" glowColor="rgba(6,182,212,0.45)"  delay={0.15} href="/activity/playback" />
        <KpiCard title="Blocked Total"   value={overview?.blockedTotal ?? 0}    change={overview?.blockedChange ?? 0}   icon={ShieldX} color="linear-gradient(135deg,#ef4444,#f87171)" glowColor="rgba(239,68,68,0.45)"  delay={0.2}  href="/security" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Expired Licenses',  value: overview?.expiredCount ?? 0,        icon: Clock,         color: 'text-slate-400' },
          { label: 'Expiring Soon',     value: overview?.expiringSoonCount ?? 0,   icon: AlertTriangle, color: 'text-amber-400' },
          { label: 'Blocked Devices',   value: overview?.blockedDevicesCount ?? 0, icon: ShieldX,       color: 'text-red-400' },
          { label: 'Revoked Licenses',  value: overview?.revokedCount ?? 0,        icon: Activity,      color: 'text-indigo-400' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="glass rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <s.icon className={cn('w-4 h-4 flex-shrink-0', s.color)} />
            <div>
              <div className="text-sm font-semibold text-slate-200 tabular-nums">{s.value.toLocaleString()}</div>
              <div className="text-2xs text-slate-600">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Activity Trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="card p-5 xl:col-span-2"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="section-title">Activity Trend</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {trendRange === 'today' && 'Hourly breakdown over the last 24 hours'}
                {trendRange === '7d'    && 'Daily totals for the last 7 days'}
                {trendRange === '30d'   && 'Daily totals for the last 30 days'}
                {trendRange === '1y'    && 'Monthly totals for the last 12 months'}
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              {([
                { v: 'today', label: 'Today' },
                { v: '7d',    label: '7D' },
                { v: '30d',   label: '30D' },
                { v: '1y',    label: '1Y' },
              ] as const).map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setTrendRange(opt.v)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150',
                    trendRange === opt.v
                      ? 'bg-indigo-500/20 text-indigo-300 shadow-sm'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" />Licenses</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Devices</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500" />Playbacks</span>
          </div>

          {areaData.length === 0 || areaData.every(d => (d.licenses ?? 0) + (d.devices ?? 0) + (d.playbacks ?? 0) === 0) ? (
            <Empty message="No activity in this period yet." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={areaData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-licenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-devices" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-playbacks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.10)" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={36}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(99,102,241,0.25)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Area type="monotone" dataKey="licenses"  name="Licenses"  stroke="#6366f1" strokeWidth={2.2} fill="url(#g-licenses)"  activeDot={{ r: 4, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="devices"   name="Devices"   stroke="#10b981" strokeWidth={2.2} fill="url(#g-devices)"   activeDot={{ r: 4, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="playbacks" name="Playbacks" stroke="#06b6d4" strokeWidth={2.2} fill="url(#g-playbacks)" activeDot={{ r: 4, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* License Status Donut */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-title">License Status</h3>
              <p className="text-xs text-slate-600 mt-0.5">Distribution overview</p>
            </div>
          </div>
          {donutData.length === 0 ? (
            <Empty message="No licenses yet." />
          ) : (
            <>
              <div className="flex items-center justify-center mb-4">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={75}
                      paddingAngle={3} dataKey="value" strokeWidth={0}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} opacity={0.9} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {donutData.map(d => {
                  const total = donutData.reduce((a, b) => a + b.value, 0)
                  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0'
                  return (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-xs text-slate-400">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-200">{formatNumber(d.value)}</span>
                        <span className="text-2xs text-slate-600">{pct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Bottom row: Live Activity + System Health side-by-side, equal height */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
        {/* Live Activity Feed (scrollable, equal height with right column) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="card p-5 xl:col-span-2 flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="section-title">Live Activity</h3>
              <div className="flex items-center gap-1 badge-green text-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {(['all', 'abuse', 'verify', 'playback'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setActivityFilter(f)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150',
                    activityFilter === f
                      ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25'
                      : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.04]',
                  )}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              <Link href="/activity/live" className="btn-icon btn-sm ml-1">
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto cs-scroll pr-1 space-y-1.5" style={{ maxHeight: 480 }}>
            {filteredActivity.length === 0 ? (
              <Empty message="No recent activity." />
            ) : filteredActivity.map((item, i) => {
              const hc = ACTIVITY_HOVER_COLORS[item.type] ?? ACTIVITY_HOVER_COLORS._default
              const isHov = hoveredId === item.id
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ y: -2, transition: { duration: 0.15, ease: 'easeOut' } }}
                  transition={{ delay: Math.min(i, 12) * 0.02, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    'relative flex items-start gap-3 px-3 py-2.5 rounded-xl border cursor-pointer overflow-hidden',
                    getActivityBg(item.type),
                  )}
                  style={{
                    borderColor: isHov ? hc.border : undefined,
                    boxShadow: isHov ? `0 6px 20px ${hc.glow}, 0 2px 6px rgba(0,0,0,0.05)` : undefined,
                    transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
                  }}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
                    style={{
                      background: hc.bar,
                      opacity: isHov ? 1 : 0,
                      transform: isHov ? 'scaleY(1)' : 'scaleY(0.3)',
                      transformOrigin: 'center',
                      transition: 'opacity 0.18s ease, transform 0.2s ease',
                    }}
                  />
                  <div
                    className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 transition-transform duration-150', {
                      'bg-emerald-400': item.type === 'VERIFY_OK' || item.type === 'PLAYBACK_START',
                      'bg-red-400': item.type === 'VERIFY_FAIL' || item.type === 'ABUSE_DETECTED',
                      'bg-blue-400': item.type === 'DEVICE_REGISTERED' || item.type === 'PLUGIN_SESSION',
                      'bg-slate-400': item.type === 'SELECTORS_OK',
                    })}
                    style={{ transform: isHov ? 'scale(1.4)' : 'scale(1)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code
                        className="text-2xs font-mono px-1.5 py-0.5 rounded font-semibold"
                        style={{
                          background: isHov ? `${hc.bar}1a` : 'rgba(100,116,139,0.1)',
                          color: isHov ? hc.bar : '#64748b',
                          transition: 'background 0.18s ease, color 0.18s ease',
                        }}
                      >
                        {item.type}
                      </code>
                      {(item.severity === 'HIGH' || item.severity === 'CRITICAL') && (
                        <span className="badge-red text-2xs">{item.severity}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{item.message}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-2xs text-slate-600 font-mono">{item.licenseKey}</span>
                      <span className="text-2xs text-slate-700">{item.country} {item.ip}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                    <span className="text-2xs text-slate-700">{item.time}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Right column: Top Plugins + System Health */}
        <div className="space-y-4 flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Top Plugins</h3>
              <Link href="/plugins" className="text-xs text-slate-600 hover:text-indigo-400 transition-colors">View all</Link>
            </div>
            {topPlugins.length === 0 ? (
              <Empty message="No plugins yet." />
            ) : (
              <div className="space-y-3">
                {topPlugins.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-2xs font-bold text-slate-600 bg-white/[0.04] flex-shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-300 truncate">{p.name}</span>
                        <span className="text-xs font-semibold text-slate-200">{formatNumber(p.uses)}</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(p.uses / (topPlugins[0]?.uses || 1)) * 100}%` }}
                          transition={{ duration: 1, delay: 0.5 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full rounded-full"
                          style={{ background: `hsl(${240 - i * 30}, 80%, 65%)` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="card p-5 flex-1"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">System Health</h3>
              <div className="flex items-center gap-1 badge-green text-2xs">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                Healthy
              </div>
            </div>
            <div className="space-y-3">
              <HealthMetric label="API Latency"     value={24} color="#10b981" />
              <HealthMetric label="CPU Usage"       value={38} color="#6366f1" />
              <HealthMetric label="Memory Usage"    value={61} color="#f59e0b" />
              <HealthMetric label="DB Connections"  value={45} color="#06b6d4" />
              <HealthMetric label="Redis Cache Hit" value={94} color="#10b981" />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/[0.05]">
              {[
                { label: 'Uptime', value: '99.9%', icon: Server },
                { label: 'Req/s',  value: '247',   icon: Zap },
                { label: 'WS Conn', value: '1.2K', icon: Radio },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <s.icon className="w-4 h-4 text-slate-600 mx-auto mb-1" />
                  <div className="text-sm font-semibold text-slate-200">{s.value}</div>
                  <div className="text-2xs text-slate-600">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}