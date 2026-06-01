'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Ban, AlertTriangle, CheckCircle, Search, RefreshCw, Smartphone,
  ShieldX, X, Plus, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { apiGet, apiPost, apiDelete, apiPatch } from '@/lib/api'
import toast from 'react-hot-toast'

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface AbuseEvent {
  id: string
  type: string
  severity: Severity
  licenseKey: string
  ip: string | null
  message: string
  resolved: boolean
  resolvedAt: string | null
  createdAt: string
}

interface BlockedIp {
  id: string
  ip: string
  reason: string | null
  expiresAt: string | null
  createdAt: string
}

interface BlockedDevice {
  id: string
  fingerprint: string
  name: string | null
  model: string | null
  lastIp: string | null
  blockedAt: string | null
  blockedReason: string | null
  license: { key: string; name: string } | null
}

interface Stats {
  openAlerts: number
  criticalOpen: number
  blockedIpCount: number
  blockedDeviceCount: number
  resolvedToday: number
  bySeverity: Record<string, number>
}

const severityStyle: Record<Severity, string> = {
  LOW:      'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30',
  MEDIUM:   'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30',
  HIGH:     'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/30',
  CRITICAL: 'bg-red-600/15 text-red-700 dark:text-red-300 border border-red-600/40',
}
const severityDot: Record<Severity, string> = {
  LOW: 'bg-blue-500', MEDIUM: 'bg-amber-500', HIGH: 'bg-red-500', CRITICAL: 'bg-red-600',
}

const PAGE_SIZE = 25

export default function SecurityPage() {
  const [tab, setTab] = useState<'alerts' | 'ips' | 'devices'>('alerts')
  const [search, setSearch] = useState('')
  const [showResolved, setShowResolved] = useState(false)

  const [stats, setStats] = useState<Stats | null>(null)
  const [alerts, setAlerts] = useState<AbuseEvent[]>([])
  const [alertsTotal, setAlertsTotal] = useState(0)
  const [ips, setIps] = useState<BlockedIp[]>([])
  const [devices, setDevices] = useState<BlockedDevice[]>([])
  const [devicesTotal, setDevicesTotal] = useState(0)

  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)

  const loadStats = useCallback(async () => {
    try { setStats(await apiGet<Stats>('/security/stats')) } catch {}
  }, [])

  const loadAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(PAGE_SIZE))
      if (!showResolved) params.set('resolved', 'false')
      if (search.trim()) params.set('search', search.trim())
      const data = await apiGet<{ items: AbuseEvent[]; total: number }>(`/security/events?${params}`)
      setAlerts(data.items ?? [])
      setAlertsTotal(data.total ?? 0)
    } catch { setAlerts([]); setAlertsTotal(0) } finally { setLoading(false) }
  }, [page, showResolved, search])

  const loadIps = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      const data = await apiGet<BlockedIp[]>(`/security/blocked-ips?${params}`)
      setIps(Array.isArray(data) ? data : [])
    } catch { setIps([]) } finally { setLoading(false) }
  }, [search])

  const loadDevices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(PAGE_SIZE))
      if (search.trim()) params.set('search', search.trim())
      const data = await apiGet<{ items: BlockedDevice[]; total: number }>(`/security/blocked-devices?${params}`)
      setDevices(data.items ?? [])
      setDevicesTotal(data.total ?? 0)
    } catch { setDevices([]); setDevicesTotal(0) } finally { setLoading(false) }
  }, [search, page])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { setPage(1) }, [tab, search, showResolved])
  useEffect(() => {
    if (tab === 'alerts') loadAlerts()
    else if (tab === 'ips') loadIps()
    else loadDevices()
  }, [tab, loadAlerts, loadIps, loadDevices])

  const refreshAll = () => {
    loadStats()
    if (tab === 'alerts') loadAlerts()
    else if (tab === 'ips') loadIps()
    else loadDevices()
  }

  const resolveAlert = async (id: string) => {
    setBusy(true)
    try {
      await apiPatch(`/security/events/${id}/resolve`, {})
      toast.success('Alert resolved')
      loadAlerts(); loadStats()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to resolve')
    } finally { setBusy(false) }
  }

  const unblockIp = async (id: string) => {
    setBusy(true)
    try {
      await apiDelete(`/security/blocked-ips/${id}`)
      toast.success('IP unblocked')
      loadIps(); loadStats()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to unblock')
    } finally { setBusy(false) }
  }

  const totalPages = tab === 'alerts'
    ? Math.max(1, Math.ceil(alertsTotal / PAGE_SIZE))
    : tab === 'devices'
      ? Math.max(1, Math.ceil(devicesTotal / PAGE_SIZE))
      : 1

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Security Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">Abuse detection, IP blocking, and threat monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refreshAll} className="btn-ghost btn-sm flex items-center gap-2">
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </button>
          <button onClick={() => setShowBlockModal(true)} className="btn-primary btn-sm flex items-center gap-2">
            <Ban className="w-3.5 h-3.5" />
            Block IP
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Open Alerts',     value: stats?.openAlerts ?? 0,        icon: AlertTriangle, color: 'text-red-400'     },
          { label: 'Critical',         value: stats?.criticalOpen ?? 0,      icon: ShieldX,        color: 'text-red-300'     },
          { label: 'Blocked IPs',      value: stats?.blockedIpCount ?? 0,    icon: Ban,            color: 'text-amber-400'   },
          { label: 'Blocked Devices',  value: stats?.blockedDeviceCount ?? 0, icon: Smartphone,    color: 'text-slate-400'   },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-5">
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

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit card">
        {([
          { key: 'alerts',   label: 'Abuse Alerts',     count: stats?.openAlerts ?? 0 },
          { key: 'ips',      label: 'Blocked IPs',       count: stats?.blockedIpCount ?? 0 },
          { key: 'devices',  label: 'Blocked Devices',   count: stats?.blockedDeviceCount ?? 0 },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition',
              tab === t.key
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {t.label}
            <span className={cn('text-2xs px-1.5 py-0.5 rounded-full', tab === t.key ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/[0.06] text-slate-600')}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input
            type="text"
            placeholder={
              tab === 'alerts' ? 'Search license, IP, message...' :
              tab === 'ips' ? 'Search IP...' :
              'Search fingerprint, name, IP, license...'
            }
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9 w-full"
          />
        </div>
        {tab === 'alerts' && (
          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
            <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} className="cs-checkbox" />
            Show resolved
          </label>
        )}
      </div>

      {/* Tab content */}
      {tab === 'alerts' && (
        <div className="card p-0 overflow-hidden">
          {loading && alerts.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />Loading alerts...
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-500 mb-3" />
              <p className="text-sm font-medium text-slate-500">No abuse alerts</p>
              <p className="text-xs text-slate-700 mt-1">{showResolved ? 'No alerts found' : 'All clear right now. Resolved alerts hidden.'}</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {alerts.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className={cn('w-2 h-2 rounded-full mt-2 flex-shrink-0', severityDot[a.severity])} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={cn('text-2xs font-medium px-2.5 py-1 rounded-full', severityStyle[a.severity])}>
                        {a.severity}
                      </span>
                      <span className="text-xs font-semibold text-slate-300">{a.type.replace(/_/g, ' ')}</span>
                      {a.licenseKey && (
                        <code className="text-2xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{a.licenseKey}</code>
                      )}
                      {a.resolved && (
                        <span className="text-2xs text-emerald-500 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1.5">{a.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-2xs text-slate-600">
                      {a.ip && <span className="font-mono">IP {a.ip}</span>}
                      <span>{formatRelativeTime(a.createdAt)}</span>
                    </div>
                  </div>
                  {!a.resolved && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {a.ip && (
                        <button
                          onClick={async () => {
                            setBusy(true)
                            try {
                              await apiPost('/security/blocked-ips', { ip: a.ip, reason: `Auto-block from ${a.type}` })
                              toast.success(`Blocked IP ${a.ip}`)
                              loadStats()
                            } catch (e: any) {
                              toast.error(e?.response?.data?.message ?? 'Failed to block')
                            } finally { setBusy(false) }
                          }}
                          disabled={busy}
                          className="btn-ghost btn-sm text-xs flex items-center gap-1 disabled:opacity-50"
                        >
                          <Ban className="w-3 h-3" />Block IP
                        </button>
                      )}
                      <button
                        onClick={() => resolveAlert(a.id)}
                        disabled={busy}
                        className="btn-sm rounded-lg px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/40 transition disabled:opacity-50 flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />Resolve
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'ips' && (
        <div className="card p-0 overflow-hidden">
          {loading && ips.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />Loading...
            </div>
          ) : ips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Ban className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-sm font-medium text-slate-500">No blocked IPs</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                  {['IP Address', 'Reason', 'Expires', 'Blocked', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-2xs font-medium text-slate-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ips.map((ip, i) => (
                  <motion.tr
                    key={ip.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-5 py-3"><code className="text-sm font-mono text-slate-300">{ip.ip}</code></td>
                    <td className="px-5 py-3"><p className="text-sm text-slate-400">{ip.reason ?? '-'}</p></td>
                    <td className="px-5 py-3"><span className="text-xs text-slate-500">{ip.expiresAt ? formatRelativeTime(ip.expiresAt) : 'Permanent'}</span></td>
                    <td className="px-5 py-3"><span className="text-xs text-slate-500">{formatRelativeTime(ip.createdAt)}</span></td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => unblockIp(ip.id)}
                        disabled={busy}
                        className="btn-sm rounded-lg px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/40 transition disabled:opacity-50 flex items-center gap-1 opacity-0 group-hover:opacity-100"
                      >
                        <CheckCircle className="w-3 h-3" />Unblock
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'devices' && (
        <div className="card p-0 overflow-hidden">
          {loading && devices.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />Loading...
            </div>
          ) : devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Smartphone className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-sm font-medium text-slate-500">No blocked devices</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                  {['Device', 'License', 'Last IP', 'Reason', 'Blocked'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-2xs font-medium text-slate-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devices.map((d, i) => (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3">
                      <div className="text-sm font-medium text-slate-300">{d.name ?? d.model ?? 'Unknown'}</div>
                      <code className="text-2xs font-mono text-slate-600">{d.fingerprint?.substring(0, 24)}</code>
                    </td>
                    <td className="px-5 py-3">
                      {d.license ? <code className="text-xs font-mono text-indigo-400">{d.license.key}</code> : <span className="text-slate-700">-</span>}
                    </td>
                    <td className="px-5 py-3"><code className="text-xs font-mono text-slate-300">{d.lastIp ?? '-'}</code></td>
                    <td className="px-5 py-3"><p className="text-xs text-slate-400">{d.blockedReason ?? '-'}</p></td>
                    <td className="px-5 py-3"><span className="text-xs text-slate-500">{d.blockedAt ? formatRelativeTime(d.blockedAt) : '-'}</span></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Pagination for paged tabs */}
      {(tab === 'alerts' || tab === 'devices') && totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="btn-icon btn-sm disabled:opacity-30">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="btn-icon btn-sm disabled:opacity-30">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Block IP modal */}
      <AnimatePresence>
        {showBlockModal && (
          <BlockIpModal
            onClose={() => setShowBlockModal(false)}
            onBlocked={() => { loadIps(); loadStats(); setShowBlockModal(false) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function BlockIpModal({ onClose, onBlocked }: { onClose: () => void; onBlocked: () => void }) {
  const [ip, setIp] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!ip.trim()) { toast.error('IP address required'); return }
    setBusy(true)
    try {
      await apiPost('/security/blocked-ips', { ip: ip.trim(), reason: reason.trim() || 'Manual block' })
      toast.success(`Blocked ${ip}`)
      onBlocked()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to block IP')
    } finally { setBusy(false) }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !busy && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="card p-6 max-w-md w-full"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/40 flex items-center justify-center">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">Block IP Address</h3>
            <p className="text-xs text-slate-500 mt-0.5">Prevent this IP from validating any license</p>
          </div>
          <button onClick={() => !busy && onClose()} className="ml-auto btn-icon btn-sm">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">IP Address</label>
            <input
              type="text"
              value={ip}
              onChange={e => setIp(e.target.value)}
              placeholder="e.g. 192.168.1.1 or 2001:db8::1"
              className="input w-full font-mono text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Brute force attempts"
              className="input w-full text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} disabled={busy} className="btn-ghost btn-sm">Cancel</button>
          <button
            onClick={submit}
            disabled={busy || !ip.trim()}
            className="btn-sm rounded-lg px-4 py-1.5 text-xs font-semibold bg-red-500/10 text-red-700 dark:text-red-300 hover:bg-red-500/20 border border-red-500/40 transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {busy ? 'Blocking...' : 'Block IP'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}