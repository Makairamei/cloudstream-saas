'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Monitor, Smartphone, Tablet, Search, Shield, Ban, Eye, Wifi, WifiOff, RefreshCw, MoreHorizontal } from 'lucide-react'
import { cn, formatRelativeTime, formatDate, getTrustScoreColor, getTrustScoreLabel } from '@/lib/utils'
import { apiGet } from '@/lib/api'
import type { DeviceStatus } from '@/types'

type Device = {
  id: string; fingerprint: string; name: string; model: string; osVersion: string
  status: DeviceStatus; licenseKey: string; ip: string; country: string
  appVersion: string; trustScore: number; lastSeenAt: string; registeredAt: string
}

const statusStyles: Record<DeviceStatus, string> = {
  ONLINE: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  OFFLINE: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  BLOCKED: 'bg-red-500/10 text-red-400 border border-red-500/20',
  SUSPICIOUS: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
}

export default function DevicesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'all'>('all')
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDevices = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiGet<{ items: Device[]; total: number }>('/devices?limit=500')
      setDevices(data.items ?? [])
    } catch { setDevices([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchDevices() }, [fetchDevices])

  const filtered = devices.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false
    if (search && !d.name?.toLowerCase().includes(search.toLowerCase()) && !d.licenseKey?.includes(search) && !d.ip?.includes(search)) return false
    return true
  })

  const stats = {
    online: devices.filter(d => d.status === 'ONLINE').length,
    offline: devices.filter(d => d.status === 'OFFLINE').length,
    blocked: devices.filter(d => d.status === 'BLOCKED').length,
    suspicious: devices.filter(d => d.status === 'SUSPICIOUS').length,
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Device Tracker</h1>
          <p className="text-sm text-slate-500 mt-0.5">{devices.length} registered devices</p>
        </div>
        <button onClick={fetchDevices} className="btn-ghost btn-sm flex items-center gap-2">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Online', value: stats.online, icon: Wifi, color: 'text-emerald-400', status: 'ONLINE' as DeviceStatus },
          { label: 'Offline', value: stats.offline, icon: WifiOff, color: 'text-slate-400', status: 'OFFLINE' as DeviceStatus },
          { label: 'Blocked', value: stats.blocked, icon: Ban, color: 'text-red-400', status: 'BLOCKED' as DeviceStatus },
          { label: 'Suspicious', value: stats.suspicious, icon: Shield, color: 'text-amber-400', status: 'SUSPICIOUS' as DeviceStatus },
        ].map((s, i) => (
          <motion.button
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setStatusFilter(statusFilter === s.status ? 'all' : s.status)}
            className={cn('card p-5 text-left transition-all duration-200', statusFilter === s.status && 'border-indigo-500/30 bg-indigo-500/5')}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-100 tabular-nums">{s.value}</div>
                <div className="text-xs text-slate-500 mt-1">{s.label}</div>
              </div>
              <s.icon className={cn('w-6 h-6', s.color)} />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Filter + table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-white/[0.05]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input type="text" placeholder="Search device name, license key, IP..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" />
          </div>
          <div className="flex items-center gap-1.5">
            {(['all', 'ONLINE', 'OFFLINE', 'BLOCKED', 'SUSPICIOUS'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn('px-3 py-1.5 rounded-xl text-xs font-medium transition-all', statusFilter === s ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25' : 'text-slate-600 hover:text-slate-400 border border-transparent')}>
                {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Device', 'OS', 'Status', 'License', 'IP / Location', 'App', 'Trust', 'Last Seen', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-2xs font-medium text-slate-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">Loading devices...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">No devices found</td></tr>
              ) : filtered.map((device, i) => (
                <motion.tr key={device.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                        <Smartphone className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-300 truncate max-w-[160px]">{device.name}</div>
                        <div className="text-2xs text-slate-600 truncate max-w-[160px]">{device.model}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs text-slate-400">{device.osVersion}</span></td>
                  <td className="px-4 py-3">
                    <span className={cn('text-2xs font-medium px-2.5 py-1 rounded-full', statusStyles[device.status])}>
                      {device.status.charAt(0) + device.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3"><code className="text-xs font-mono text-indigo-400">{device.licenseKey}</code></td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-400">{device.country} {device.ip}</div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs text-slate-500">v{device.appVersion}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className={cn('w-1.5 h-1.5 rounded-full', device.trustScore >= 80 ? 'bg-emerald-500' : device.trustScore >= 60 ? 'bg-amber-500' : 'bg-red-500')} />
                      <span className={cn('text-xs font-medium', getTrustScoreColor(device.trustScore))}>{device.trustScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs text-slate-600">{formatRelativeTime(device.lastSeenAt)}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="btn-icon btn-sm"><Eye className="w-3.5 h-3.5" /></button>
                      <button className="btn-icon btn-sm"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
          <span className="text-xs text-slate-600">Showing {filtered.length} of {devices.length} devices</span>
          <div className="flex items-center gap-2">
            <button className="btn-ghost btn-sm text-xs">Previous</button>
            <span className="text-xs text-slate-600 px-2">Page 1 of 1</span>
            <button className="btn-ghost btn-sm text-xs">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
