'use client'

import { useState, useEffect, useRef, type ElementType } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  useDashboardOverview, useActivityTrend, useRecentActivity,
  useLicenseStats, useHourlyRequests, useTopPlugins,
} from '@/hooks/useApi'
import {
  Key, Monitor, Puzzle, Play, ShieldX, TrendingUp, TrendingDown,
  Clock, AlertTriangle, Activity, Zap, Server,
  RefreshCw, ExternalLink, Radio, ArrowUpRight
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts'
import Link from 'next/link'
import { cn, formatNumber, formatRelativeTime, getActivityBg } from '@/lib/utils'
import type { ActivityType, Severity } from '@/types'

// ── Mock data ─────────────────────────────────────────────
const AREA_DATA = [
  { time: '00:00', licenses: 1240, devices: 890, playbacks: 320 },
  { time: '03:00', licenses: 980, devices: 740, playbacks: 210 },
  { time: '06:00', licenses: 1100, devices: 820, playbacks: 280 },
  { time: '09:00', licenses: 1850, devices: 1340, playbacks: 580 },
  { time: '12:00', licenses: 2340, devices: 1780, playbacks: 820 },
  { time: '15:00', licenses: 2180, devices: 1620, playbacks: 750 },
  { time: '18:00', licenses: 2560, devices: 1940, playbacks: 920 },
  { time: '21:00', licenses: 2120, devices: 1580, playbacks: 680 },
  { time: '23:59', licenses: 1890, devices: 1350, playbacks: 540 },
]

const DONUT_DATA = [
  { name: 'Active', value: 8432, color: '#10b981' },
  { name: 'Expired', value: 1240, color: '#ef4444' },
  { name: 'Trial', value: 654, color: '#06b6d4' },
  { name: 'Expiring', value: 387, color: '#f59e0b' },
  { name: 'Revoked', value: 183, color: '#6366f1' },
]

const HOURLY_REQUESTS = [198, 145, 123, 112, 134, 189, 267, 412, 534, 612, 578, 523, 489, 512, 634, 598, 545, 478, 423, 367, 312, 278, 234, 198]
const HOURLY_ERRORS = [8, 5, 3, 2, 4, 7, 11, 18, 22, 25, 19, 16, 14, 16, 22, 20, 17, 13, 9, 7, 6, 5, 4, 3]
const HOURLY_DATA = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}h`,
  requests: HOURLY_REQUESTS[i],
  errors: HOURLY_ERRORS[i],
}))

const ACTIVITY_FEED = [
  { id: '1', type: 'VERIFY_OK' as ActivityType, severity: 'LOW' as Severity, message: 'License verified successfully', licenseKey: 'CS-PROD-4821', ip: '103.12.45.67', country: '🇮🇩', time: '2s ago' },
  { id: '2', type: 'ABUSE_DETECTED' as ActivityType, severity: 'HIGH' as Severity, message: 'DEVICE_OVERFLOW — 5 devices on single license', licenseKey: 'CS-TRIAL-0012', ip: '185.220.101.3', country: '🇷🇺', time: '8s ago' },
  { id: '3', type: 'PLAYBACK_START' as ActivityType, severity: 'LOW' as Severity, message: 'Playback started via Netflix plugin', licenseKey: 'CS-PROD-9134', ip: '36.75.22.88', country: '🇮🇩', time: '12s ago' },
  { id: '4', type: 'DEVICE_REGISTERED' as ActivityType, severity: 'LOW' as Severity, message: 'New device registered — Android 14', licenseKey: 'CS-PROD-5521', ip: '180.244.33.21', country: '🇮🇩', time: '28s ago' },
  { id: '5', type: 'VERIFY_FAIL' as ActivityType, severity: 'MEDIUM' as Severity, message: 'License verification failed — key not found', licenseKey: 'CS-XXXX-0000', ip: '91.108.4.45', country: '🇩🇪', time: '45s ago' },
  { id: '6', type: 'SELECTORS_OK' as ActivityType, severity: 'LOW' as Severity, message: 'Selector config loaded successfully', licenseKey: 'CS-PROD-7734', ip: '27.50.100.12', country: '🇮🇩', time: '1m ago' },
  { id: '7', type: 'ABUSE_DETECTED' as ActivityType, severity: 'CRITICAL' as Severity, message: 'TOKEN_ABUSE — Replay attack detected', licenseKey: 'CS-PROD-2298', ip: '198.7.0.139', country: '🇺🇸', time: '1m ago' },
  { id: '8', type: 'PLUGIN_SESSION' as ActivityType, severity: 'LOW' as Severity, message: 'Plugin session started — Prime Video', licenseKey: 'CS-PROD-6612', ip: '114.125.88.44', country: '🇮🇩', time: '2m ago' },
]

const TOP_PLUGINS = [
  { name: 'Netflix', uses: 4821, trend: 12 },
  { name: 'Prime Video', uses: 3209, trend: 8 },
  { name: 'Disney+', uses: 2144, trend: -3 },
  { name: 'YouTube', uses: 1988, trend: 21 },
  { name: 'Spotify', uses: 1203, trend: 5 },
]

// ── Animated counter ──────────────────────────────────────
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef(false)

  useEffect(() => {
    if (ref.current) return
    ref.current = true
    const duration = 1200
    const steps = 60
    const increment = target / steps
    let current = 0
    const timer = setInterval(() => {
      current = Math.min(current + increment, target)
      setCount(Math.floor(current))
      if (current >= target) clearInterval(timer)
    }, duration / steps)
    return () => clearInterval(timer)
  }, [target])

  return <span>{formatNumber(count)}{suffix}</span>
}

// ── KPI Card ──────────────────────────────────────────────
interface KpiProps {
  title: string
  value: number
  change: number
  icon: ElementType
  color: string
  glowColor: string
  suffix?: string
  delay?: number
  href?: string
}

function KpiCard({ title, value, change, icon: Icon, color, glowColor, suffix, delay = 0, href }: KpiProps) {
  const router = useRouter()
  const isPositive = change >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => href && router.push(href)}
      className={cn(
        'card p-5 group transition-all duration-300 relative overflow-hidden',
        href ? 'cursor-pointer hover:border-white/[0.15] hover:-translate-y-0.5' : 'cursor-default hover:border-white/[0.12]'
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
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium',
            isPositive ? 'text-emerald-400' : 'text-red-400'
          )}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(change)}%
          </div>
          {href && <ArrowUpRight className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
        </div>
      </div>

      <div className="text-2xl font-bold text-slate-100 mb-1 tabular-nums">
        <AnimatedCounter target={value} suffix={suffix} />
      </div>
      <div className="text-xs text-slate-500">{title}</div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl"
        style={{ background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)` }}
      />
    </motion.div>
  )
}

// ── Activity hover colours ───────────────────────────────────
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

// ── Custom Tooltip ─────────────────────────────────────────
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

// ── System Health ──────────────────────────────────────────
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

// ── Main Page ──────────────────────────────────────────────
export default function DashboardPage() {
  const [activityFilter, setActivityFilter] = useState<'all' | 'abuse' | 'verify' | 'playback'>('all')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Real API data with mock fallback
  const { data: overview } = useDashboardOverview({ fallback: { totalLicenses: 10896, activeDevices: 3241, pluginsToday: 18723, playbacksToday: 8912, blockedTotal: 234, licensesChange: 8.2, devicesChange: 12.4 } })
  const { data: areaRaw } = useActivityTrend(1)
  const { data: activityRaw, refetch: refetchActivity } = useRecentActivity(20)
  const { data: licenseStatsRaw } = useLicenseStats()
  const { data: hourlyRaw } = useHourlyRequests()
  const { data: topPluginsRaw } = useTopPlugins(5)

  const areaData = (areaRaw && areaRaw.length > 0) ? areaRaw : AREA_DATA
  const hourlyData = (hourlyRaw && hourlyRaw.length > 0) ? hourlyRaw : HOURLY_DATA
  const topPlugins = (topPluginsRaw && topPluginsRaw.length > 0)
    ? topPluginsRaw.map(p => ({ name: p.name, uses: p.downloadCount, trend: 0 }))
    : TOP_PLUGINS
  const donutData = (licenseStatsRaw && licenseStatsRaw.length > 0)
    ? licenseStatsRaw.map((s, i) => ({ name: s.status.charAt(0) + s.status.slice(1).toLowerCase(), value: s.count, color: DONUT_DATA[i % DONUT_DATA.length]?.color ?? '#6366f1' }))
    : DONUT_DATA
  const liveActivity = (activityRaw && activityRaw.length > 0)
    ? activityRaw.map(a => ({ id: a.id, type: a.type as ActivityType, severity: a.severity as Severity, message: a.message, licenseKey: a.licenseKey, ip: a.ip ?? '', country: a.country ?? '', time: formatRelativeTime(a.createdAt) }))
    : ACTIVITY_FEED

  useEffect(() => { setLastRefresh(new Date()) }, [])

  const filteredActivity = liveActivity.filter(a => {
    if (activityFilter === 'all') return true
    if (activityFilter === 'abuse') return a.type === 'ABUSE_DETECTED'
    if (activityFilter === 'verify') return a.type.startsWith('VERIFY')
    if (activityFilter === 'playback') return a.type.startsWith('PLAYBACK')
    return true
  })

  return (
    <div className="page-wrapper">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Command Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time overview · {lastRefresh ? `Updated ${formatRelativeTime(lastRefresh.toISOString())}` : 'Live'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLastRefresh(new Date())}
            className="btn-ghost btn-sm flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs badge-green">
            <span className="pulse-green" />
            Live
          </div>
        </div>
      </div>

      {/* KPI Cards — primary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <KpiCard title="Total Licenses" value={overview?.totalLicenses ?? 10896} change={overview?.licensesChange ?? 8.2} icon={Key} color="linear-gradient(135deg,#6366f1,#818cf8)" glowColor="rgba(99,102,241,0.45)" delay={0} href="/licenses" />
        <KpiCard title="Online Devices" value={overview?.activeDevices ?? 3241} change={overview?.devicesChange ?? 12.4} icon={Monitor} color="linear-gradient(135deg,#10b981,#34d399)" glowColor="rgba(16,185,129,0.45)" delay={0.05} href="/devices" />
        <KpiCard title="Plugins Today" value={overview?.pluginsToday ?? 18723} change={5.7} icon={Puzzle} color="linear-gradient(135deg,#8b5cf6,#a78bfa)" glowColor="rgba(139,92,246,0.45)" delay={0.1} href="/plugins" />
        <KpiCard title="Playbacks Today" value={overview?.playbacksToday ?? 8912} change={-2.3} icon={Play} color="linear-gradient(135deg,#06b6d4,#22d3ee)" glowColor="rgba(6,182,212,0.45)" delay={0.15} href="/activity/playback" />
        <KpiCard title="Blocked Total" value={overview?.blockedTotal ?? 234} change={-4.1} icon={ShieldX} color="linear-gradient(135deg,#ef4444,#f87171)" glowColor="rgba(239,68,68,0.45)" delay={0.2} href="/security" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Expired Licenses', value: '1,240', icon: Clock, color: 'text-slate-400' },
          { label: 'Expiring Soon', value: '387', icon: AlertTriangle, color: 'text-amber-400' },
          { label: 'Blocked Devices', value: '89', icon: ShieldX, color: 'text-red-400' },
          { label: 'Revoked Licenses', value: '183', icon: Activity, color: 'text-indigo-400' },
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
              <div className="text-sm font-semibold text-slate-200 tabular-nums">{s.value}</div>
              <div className="text-2xs text-slate-600">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* License Activity Trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="card p-5 xl:col-span-2"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="section-title">Activity Trend</h3>
              <p className="text-xs text-slate-600 mt-0.5">24-hour license & device activity</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" />Licenses</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Devices</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500" />Playbacks</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={areaData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="licenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="devices" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="playbacks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />
              <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="licenses" stroke="#6366f1" strokeWidth={2} fill="url(#licenses)" dot={false} />
              <Area type="monotone" dataKey="devices" stroke="#10b981" strokeWidth={2} fill="url(#devices)" dot={false} />
              <Area type="monotone" dataKey="playbacks" stroke="#06b6d4" strokeWidth={2} fill="url(#playbacks)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
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
          <div className="flex items-center justify-center mb-4">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {donutData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} opacity={0.9} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {donutData.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-xs text-slate-400">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-200">{formatNumber(d.value)}</span>
                  <span className="text-2xs text-slate-600">
                    {((d.value / donutData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Live Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="card p-5 xl:col-span-2"
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
                      : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.04]'
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

          <div className="space-y-1.5">
            {filteredActivity.map((item, i) => {
              const hc = ACTIVITY_HOVER_COLORS[item.type] ?? ACTIVITY_HOVER_COLORS._default
              const isHov = hoveredId === item.id
              return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ y: -2, transition: { duration: 0.15, ease: 'easeOut' } }}
                transition={{ delay: i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  'relative flex items-start gap-3 px-3 py-2.5 rounded-xl border cursor-pointer overflow-hidden',
                  getActivityBg(item.type)
                )}
                style={{
                  borderColor: isHov ? hc.border : undefined,
                  boxShadow: isHov ? `0 6px 20px ${hc.glow}, 0 2px 6px rgba(0,0,0,0.05)` : undefined,
                  transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
                }}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Left accent bar */}
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
                <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 transition-transform duration-150', {
                  'bg-emerald-400': item.type === 'VERIFY_OK' || item.type === 'PLAYBACK_START',
                  'bg-red-400': item.type === 'VERIFY_FAIL' || item.type === 'ABUSE_DETECTED',
                  'bg-blue-400': item.type === 'DEVICE_REGISTERED' || item.type === 'PLUGIN_SESSION',
                  'bg-slate-400': item.type === 'SELECTORS_OK',
                })} style={{ transform: isHov ? 'scale(1.4)' : 'scale(1)' }} />
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
                    {item.severity === 'HIGH' || item.severity === 'CRITICAL' ? (
                      <span className="badge-red text-2xs">{item.severity}</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{item.message}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-2xs text-slate-600 font-mono">{item.licenseKey}</span>
                    <span className="text-2xs text-slate-700">{item.country} {item.ip}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                  <span className="text-2xs text-slate-700">{item.time}</span>
                  <span
                    className="text-xs font-bold leading-none"
                    style={{
                      color: hc.bar,
                      opacity: isHov ? 1 : 0,
                      transform: isHov ? 'translateX(0)' : 'translateX(-4px)',
                      display: 'inline-block',
                      transition: 'opacity 0.18s ease, transform 0.18s ease',
                    }}
                  >
                    →
                  </span>
                </div>
              </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Top Plugins */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Top Plugins</h3>
              <Link href="/plugins" className="text-xs text-slate-600 hover:text-indigo-400 transition-colors">
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {topPlugins.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-2xs font-bold text-slate-600 bg-white/[0.04] flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-300 truncate">{p.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-slate-200">{formatNumber(p.uses)}</span>
                        <span className={cn('text-2xs', p.trend >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {p.trend >= 0 ? '+' : ''}{p.trend}%
                        </span>
                      </div>
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
          </motion.div>

          {/* System Health */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">System Health</h3>
              <div className="flex items-center gap-1 badge-green text-2xs">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                Healthy
              </div>
            </div>
            <div className="space-y-3">
              <HealthMetric label="API Latency (avg 24ms)" value={24} color="#10b981" />
              <HealthMetric label="CPU Usage" value={38} color="#6366f1" />
              <HealthMetric label="Memory Usage" value={61} color="#f59e0b" />
              <HealthMetric label="DB Connections" value={45} color="#06b6d4" />
              <HealthMetric label="Redis Cache Hit" value={94} color="#10b981" />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/[0.05]">
              {[
                { label: 'Uptime', value: '99.9%', icon: Server },
                { label: 'Req/s', value: '247', icon: Zap },
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

      {/* Hourly requests bar chart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="card p-5"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="section-title">Hourly Request Distribution</h3>
            <p className="text-xs text-slate-600 mt-0.5">Requests vs errors over 24 hours</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-indigo-500" />Requests</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-500" />Errors</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" vertical={false} />
            <XAxis dataKey="hour" tick={{ fill: '#334155', fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
            <YAxis tick={{ fill: '#334155', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="requests" fill="#6366f1" opacity={0.8} radius={[2, 2, 0, 0]} />
            <Bar dataKey="errors" fill="#ef4444" opacity={0.8} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  )
}
