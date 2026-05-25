'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, ShieldX, Ban, Globe, Smartphone, AlertTriangle,
  CheckCircle, Search, Plus, RefreshCw, Eye, Trash2,
  TrendingUp, Activity, Zap, Clock
} from 'lucide-react'
import { cn, formatRelativeTime, formatDate, getAbuseLabel, getSeverityDot } from '@/lib/utils'
import type { AbuseType, Severity } from '@/types'

const BLOCKED_IPS = [
  { id: '1', ip: '185.220.101.3', country: '🇷🇺', reason: 'Brute force — 52 failed attempts', blockedAt: new Date(Date.now() - 3600000).toISOString(), requestCount: 2341, isAutoBlocked: true },
  { id: '2', ip: '91.108.4.45', country: '🇩🇪', reason: 'VPN/proxy detected + token abuse', blockedAt: new Date(Date.now() - 7200000).toISOString(), requestCount: 891, isAutoBlocked: true },
  { id: '3', ip: '198.7.0.139', country: '🇺🇸', reason: 'Replay attack detected', blockedAt: new Date(Date.now() - 86400000).toISOString(), requestCount: 445, isAutoBlocked: false },
  { id: '4', ip: '103.77.52.1', country: '🇨🇳', reason: 'Multi-IP license sharing', blockedAt: new Date(Date.now() - 172800000).toISOString(), requestCount: 1230, isAutoBlocked: true },
]

const ABUSE_ALERTS = [
  { id: '1', type: 'DEVICE_OVERFLOW' as AbuseType, severity: 'HIGH' as Severity, licenseKey: 'CS-PROD-4821', ip: '103.12.45.67', country: '🇮🇩', description: '5 devices registered on a 2-device license', createdAt: new Date(Date.now() - 300000).toISOString(), isResolved: false },
  { id: '2', type: 'TOKEN_ABUSE' as AbuseType, severity: 'CRITICAL' as Severity, licenseKey: 'CS-PROD-2298', ip: '198.7.0.139', country: '🇺🇸', description: 'License token replayed from 3 different IPs within 60 seconds', createdAt: new Date(Date.now() - 900000).toISOString(), isResolved: false },
  { id: '3', type: 'IP_ROTATION' as AbuseType, severity: 'MEDIUM' as Severity, licenseKey: 'CS-TRIAL-0012', ip: '185.220.101.3', country: '🇷🇺', description: '12 different IPs used for same license in 1 hour', createdAt: new Date(Date.now() - 3600000).toISOString(), isResolved: false },
  { id: '4', type: 'VPN_DETECTED' as AbuseType, severity: 'LOW' as Severity, licenseKey: 'CS-PROD-7734', ip: '104.21.98.7', country: '🇺🇸', description: 'Cloudflare WARP / VPN provider IP detected', createdAt: new Date(Date.now() - 7200000).toISOString(), isResolved: true },
  { id: '5', type: 'BURST_REQUEST' as AbuseType, severity: 'MEDIUM' as Severity, licenseKey: 'CS-PROD-9134', ip: '114.125.88.44', country: '🇮🇩', description: '200+ verify requests within 30 seconds', createdAt: new Date(Date.now() - 14400000).toISOString(), isResolved: true },
]

const severityStyle: Record<Severity, string> = {
  LOW: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  HIGH: 'bg-red-500/10 text-red-400 border border-red-500/20',
  CRITICAL: 'bg-red-600/15 text-red-300 border border-red-600/30',
}

export default function SecurityPage() {
  const [tab, setTab] = useState<'alerts' | 'blocked-ips' | 'blocked-devices'>('alerts')
  const [search, setSearch] = useState('')
  const [showResolved, setShowResolved] = useState(false)

  const filteredAlerts = ABUSE_ALERTS.filter(a => {
    if (!showResolved && a.isResolved) return false
    if (search && !a.licenseKey.includes(search) && !a.ip.includes(search)) return false
    return true
  })

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Security Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">Abuse detection, IP blocking & threat monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost btn-sm flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />Refresh
          </button>
          <button className="btn-primary btn-sm flex items-center gap-2">
            <Ban className="w-3.5 h-3.5" />Block IP
          </button>
        </div>
      </div>

      {/* Threat stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Open Alerts', value: ABUSE_ALERTS.filter(a => !a.isResolved).length, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Blocked IPs', value: BLOCKED_IPS.length, icon: Ban, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Critical', value: ABUSE_ALERTS.filter(a => a.severity === 'CRITICAL').length, icon: ShieldX, color: 'text-red-300', bg: 'bg-red-600/10 border-red-600/20' },
          { label: 'Resolved Today', value: ABUSE_ALERTS.filter(a => a.isResolved).length, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={cn('card p-5 border', s.bg)}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-100 tabular-nums">{s.value}</div>
                <div className="text-xs text-slate-500 mt-1">{s.label}</div>
              </div>
              <s.icon className={cn('w-6 h-6', s.color)} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {([
          { key: 'alerts', label: 'Abuse Alerts', count: filteredAlerts.length },
          { key: 'blocked-ips', label: 'Blocked IPs', count: BLOCKED_IPS.length },
          { key: 'blocked-devices', label: 'Blocked Devices', count: 89 },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              tab === t.key ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {t.label}
            <span className={cn('text-2xs px-1.5 py-0.5 rounded-full', tab === t.key ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/[0.06] text-slate-600')}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'alerts' && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-white/[0.05]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input type="text" placeholder="Search by license key or IP..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
              <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} className="rounded border-white/20 bg-white/[0.04] text-indigo-500" />
              Show resolved
            </label>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {filteredAlerts.map((alert, i) => (
              <motion.div key={alert.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-start gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group">
                <div className={cn('w-2 h-2 rounded-full mt-2 flex-shrink-0', getSeverityDot(alert.severity))} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={cn('text-2xs font-medium px-2.5 py-1 rounded-full', severityStyle[alert.severity])}>
                      {alert.severity}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">{getAbuseLabel(alert.type)}</span>
                    <code className="text-2xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{alert.licenseKey}</code>
                    {alert.isResolved && (
                      <span className="text-2xs text-emerald-500 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-1.5">{alert.description}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-2xs text-slate-600">{alert.country} {alert.ip}</span>
                    <span className="text-2xs text-slate-700">{formatRelativeTime(alert.createdAt)}</span>
                  </div>
                </div>
                {!alert.isResolved && (
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button className="btn-ghost btn-sm text-xs flex items-center gap-1">
                      <Ban className="w-3 h-3" />Block IP
                    </button>
                    <button className="btn-ghost btn-sm text-xs flex items-center gap-1 text-emerald-400">
                      <CheckCircle className="w-3 h-3" />Resolve
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {tab === 'blocked-ips' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['IP Address', 'Country', 'Reason', 'Requests', 'Blocked', 'Type', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-2xs font-medium text-slate-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BLOCKED_IPS.map((ip, i) => (
                <motion.tr key={ip.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                  <td className="px-5 py-3"><code className="text-sm font-mono text-slate-300">{ip.ip}</code></td>
                  <td className="px-5 py-3 text-sm">{ip.country}</td>
                  <td className="px-5 py-3 max-w-xs"><p className="text-sm text-slate-400 truncate">{ip.reason}</p></td>
                  <td className="px-5 py-3"><span className="text-sm font-medium text-slate-300 tabular-nums">{ip.requestCount.toLocaleString()}</span></td>
                  <td className="px-5 py-3"><span className="text-xs text-slate-500">{formatRelativeTime(ip.blockedAt)}</span></td>
                  <td className="px-5 py-3">
                    <span className={cn('text-2xs px-2 py-1 rounded-full', ip.isAutoBlocked ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20')}>
                      {ip.isAutoBlocked ? 'Auto' : 'Manual'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button className="btn-ghost btn-sm text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-emerald-400">
                      <CheckCircle className="w-3 h-3" />Unblock
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'blocked-devices' && (
        <div className="card p-8 text-center">
          <Smartphone className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">89 blocked devices</p>
          <p className="text-sm text-slate-600 mt-1">Connect to the API to load blocked device data</p>
        </div>
      )}
    </div>
  )
}
