'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, Activity, Globe, Zap, Users, Key, BarChart2, CalendarDays } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'

const PERIODS = ['7d', '30d', '90d', '1y']

const generateDays = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      requests: Math.floor(Math.random() * 8000 + 12000),
      activeLicenses: Math.floor(Math.random() * 500 + 4200),
      newLicenses: Math.floor(Math.random() * 80 + 10),
      failures: Math.floor(Math.random() * 200 + 100),
      revenue: Math.floor(Math.random() * 2000 + 3000),
    }
  })

const GEO_DATA = [
  { country: 'Indonesia', code: '🇮🇩', requests: 48291, percent: 42 },
  { country: 'Malaysia', code: '🇲🇾', requests: 18440, percent: 16 },
  { country: 'Philippines', code: '🇵🇭', requests: 12030, percent: 11 },
  { country: 'Bangladesh', code: '🇧🇩', requests: 9821, percent: 9 },
  { country: 'India', code: '🇮🇳', requests: 8443, percent: 7 },
  { country: 'Others', code: '🌍', requests: 17231, percent: 15 },
]

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#64748b']

const PLUGIN_USAGE = [
  { name: 'Netflix', uses: 18921 },
  { name: 'Prime', uses: 12840 },
  { name: 'Disney+', uses: 9234 },
  { name: 'YouTube', uses: 8812 },
  { name: 'Spotify', uses: 5492 },
  { name: 'Viu', uses: 3211 },
]

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d')
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365
  const data = generateDays(Math.min(days, 60))

  const totalRequests = data.reduce((a, b) => a + b.requests, 0)
  const totalNew = data.reduce((a, b) => a + b.newLicenses, 0)

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Deep insights into license ecosystem performance</p>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                period === p ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20' : 'text-slate-500 hover:text-slate-300')}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: formatNumber(totalRequests), change: '+12.4%', up: true, icon: Activity },
          { label: 'New Licenses', value: formatNumber(totalNew), change: '+8.1%', up: true, icon: Key },
          { label: 'Avg Daily RPM', value: formatNumber(Math.round(totalRequests / days)), change: '+5.3%', up: true, icon: Zap },
          { label: 'Failure Rate', value: '1.8%', change: '-0.4%', up: false, icon: TrendingDown },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-600">{kpi.label}</span>
              <kpi.icon className="w-4 h-4 text-slate-700" />
            </div>
            <div className="text-2xl font-bold text-slate-100 tabular-nums">{kpi.value}</div>
            <div className={cn('text-xs mt-1 flex items-center gap-1', kpi.up ? 'text-emerald-400' : 'text-red-400')}>
              {kpi.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {kpi.change} vs prev period
            </div>
          </motion.div>
        ))}
      </div>

      {/* Request trend */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="font-semibold text-slate-200">Request Volume</div>
            <div className="text-xs text-slate-600 mt-0.5">Total API verification requests over time</div>
          </div>
          <BarChart2 className="w-4 h-4 text-slate-700" />
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />
            <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor(data.length / 6)} />
            <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => formatNumber(v)} />
            <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '12px' }} labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#a5b4fc' }} />
            <Area type="monotone" dataKey="requests" stroke="#6366f1" strokeWidth={2} fill="url(#analyticsGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* License + revenue row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="font-semibold text-slate-200 mb-1">New Licenses / Day</div>
          <div className="text-xs text-slate-600 mb-5">License issuance trend</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '12px' }} labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#34d399' }} />
              <Bar dataKey="newLicenses" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div className="font-semibold text-slate-200 mb-1">Plugin Usage Distribution</div>
          <div className="text-xs text-slate-600 mb-4">Requests per plugin</div>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={PLUGIN_USAGE} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="uses">
                  {PLUGIN_USAGE.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 flex-1">
              {PLUGIN_USAGE.map((p, idx) => (
                <div key={p.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  <span className="text-xs text-slate-400 flex-1">{p.name}</span>
                  <span className="text-xs font-medium text-slate-300 tabular-nums">{formatNumber(p.uses)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Geo breakdown */}
      <div className="card p-5">
        <div className="font-semibold text-slate-200 mb-1">Geographic Distribution</div>
        <div className="text-xs text-slate-600 mb-5">License verifications by country</div>
        <div className="space-y-3">
          {GEO_DATA.map((g, i) => (
            <motion.div key={g.country} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-4">
              <span className="text-lg w-6 flex-shrink-0">{g.code}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-300">{g.country}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 tabular-nums">{formatNumber(g.requests)}</span>
                    <span className="text-xs font-medium text-slate-400 w-10 text-right">{g.percent}%</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--card-bg)' }}>
                  <motion.div className="h-full rounded-full bg-indigo-500" initial={{ width: 0 }} animate={{ width: `${g.percent}%` }} transition={{ delay: i * 0.05 + 0.3, duration: 0.6 }} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
