'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Smartphone, Search, Shield, Ban, Wifi, WifiOff,
  RefreshCw, Trash2, Unlock, MoreHorizontal, X, ChevronLeft, ChevronRight, Copy, Check,
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { api, apiGet, apiPatch, apiDelete } from '@/lib/api'
import toast from 'react-hot-toast'
import type { DeviceStatus } from '@/types'

type Device = {
  id: string
  fingerprint: string
  name: string | null
  model: string | null
  os: string | null
  osVersion: string | null
  status: DeviceStatus
  trustScore: number
  ip: string | null
  lastIp: string | null
  appVersion: string | null
  lastSeenAt: string | null
  createdAt: string
  blockedReason: string | null
  licenseKey: string | null
  licenseName: string | null
  licenseId: string | null
  license?: { id: string; key: string; name: string; status: string } | null
}

const statusStyles: Record<string, string> = {
  ONLINE:     'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
  OFFLINE:    'bg-slate-500/10 text-slate-400 border border-slate-500/25',
  BLOCKED:    'bg-red-500/10 text-red-400 border border-red-500/25',
  SUSPICIOUS: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
}

const PAGE_SIZES = [20, 50, 100, 200]

export default function DevicesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'all'>('all')
  const [devices, setDevices] = useState<Device[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ action: 'block' | 'unblock' | 'delete'; device: Device } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const fetchDevices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search.trim()) params.set('search', search.trim())
      const data = await apiGet<{ items: Device[]; total: number }>(`/devices?${params}`)
      setDevices(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setDevices([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, limit, statusFilter, search])

  // Refetch on filter/page change with light debounce on search
  useEffect(() => {
    const t = setTimeout(fetchDevices, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchDevices, search])

  // Auto refresh every 30s
  useEffect(() => {
    const id = setInterval(fetchDevices, 30_000)
    return () => clearInterval(id)
  }, [fetchDevices])

  // Click outside menu to close
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const stats = devices.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  async function handleAction(action: 'block' | 'unblock' | 'delete', device: Device) {
    setBusyId(device.id)
    try {
      if (action === 'block') {
        await apiPatch(`/devices/${device.id}/block`, { reason: 'Manual block from dashboard' })
        toast.success(`Blocked ${device.name ?? device.fingerprint}`)
      } else if (action === 'unblock') {
        await apiPatch(`/devices/${device.id}/unblock`, {})
        toast.success(`Unblocked ${device.name ?? device.fingerprint}`)
      } else if (action === 'delete') {
        await apiDelete(`/devices/${device.id}`)
        toast.success(`Deleted ${device.name ?? device.fingerprint}`)
      }
      setConfirm(null)
      fetchDevices()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? `Failed to ${action} device`)
    } finally {
      setBusyId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Device Tracker</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString()} registered devices</p>
        </div>
        <button onClick={fetchDevices} className="btn-ghost btn-sm flex items-center gap-2">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Online',     value: stats.ONLINE     ?? 0, icon: Wifi,    color: 'text-emerald-400', status: 'ONLINE' as const },
          { label: 'Offline',    value: stats.OFFLINE    ?? 0, icon: WifiOff, color: 'text-slate-400',   status: 'OFFLINE' as const },
          { label: 'Blocked',    value: stats.BLOCKED    ?? 0, icon: Ban,     color: 'text-red-400',     status: 'BLOCKED' as const },
          { label: 'Suspicious', value: stats.SUSPICIOUS ?? 0, icon: Shield,  color: 'text-amber-400',   status: 'SUSPICIOUS' as const },
        ].map((s, i) => (
          <motion.button
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => { setStatusFilter(statusFilter === s.status ? 'all' : s.status); setPage(1) }}
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
        <div className="flex items-center gap-3 p-4 border-b border-white/[0.05] flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              type="text"
              placeholder="Search device, license key, IP, fingerprint..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="input pl-9 w-full"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'ONLINE', 'OFFLINE', 'BLOCKED', 'SUSPICIOUS'] as const).map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
                  statusFilter === s
                    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25'
                    : 'text-slate-500 hover:text-slate-300 border-transparent hover:bg-white/[0.04]'
                )}
              >
                {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                {['Device', 'Status', 'License', 'IP', 'App', 'Last Seen', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-2xs font-medium text-slate-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && devices.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">Loading devices...</td></tr>
              ) : devices.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">No devices found</td></tr>
              ) : devices.map((device, i) => {
                const lk = device.licenseKey ?? device.license?.key ?? null
                const lid = device.licenseId ?? device.license?.id ?? null
                const ip = device.ip ?? device.lastIp ?? null
                return (
                <motion.tr
                  key={device.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.015 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                        <Smartphone className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-200 truncate max-w-[220px]">
                          {device.name ?? device.model ?? 'Unknown'}
                        </div>
                        <div className="text-2xs text-slate-600 truncate max-w-[220px] font-mono">
                          {device.fingerprint?.startsWith('auto_') ? 'auto IP device' : device.fingerprint?.substring(0, 20)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-2xs font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1.5', statusStyles[device.status])}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', {
                        'bg-emerald-400 animate-pulse': device.status === 'ONLINE',
                        'bg-slate-400': device.status === 'OFFLINE',
                        'bg-red-400': device.status === 'BLOCKED',
                        'bg-amber-400': device.status === 'SUSPICIOUS',
                      })} />
                      {device.status.charAt(0) + device.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {lk ? (
                      <Link
                        href={lid ? `/licenses?focus=${lid}` : `/licenses?search=${encodeURIComponent(lk)}`}
                        className="text-xs font-mono text-indigo-400 hover:text-indigo-300 hover:underline transition"
                        title={device.licenseName ?? lk}
                      >
                        {lk}
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                    {device.licenseName && (
                      <div className="text-2xs text-slate-600 truncate max-w-[180px] mt-0.5">{device.licenseName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {ip ? (
                      <CopyCell value={ip} className="text-xs font-mono text-slate-300" />
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-500">{device.appVersion ? `v${device.appVersion}` : '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-500">
                      {device.lastSeenAt ? formatRelativeTime(device.lastSeenAt) : 'Never'}
                    </span>
                  </td>
                  <td className="px-4 py-3 relative">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="btn-icon btn-sm relative"
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === device.id ? null : device.id) }}
                        title="Manage device"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {menuOpen === device.id && (
                      <div ref={menuRef} className="absolute right-4 top-12 z-30 w-48 card p-1 shadow-2xl">
                        {device.status === 'BLOCKED' ? (
                          <button
                            onClick={() => { setConfirm({ action: 'unblock', device }); setMenuOpen(null) }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Unblock device
                          </button>
                        ) : (
                          <button
                            onClick={() => { setConfirm({ action: 'block', device }); setMenuOpen(null) }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 rounded-lg transition"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Block device
                          </button>
                        )}
                        <button
                          onClick={() => { setConfirm({ action: 'delete', device }); setMenuOpen(null) }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete device
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05] flex-wrap gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              Showing {devices.length === 0 ? 0 : (page - 1) * limit + 1}-{(page - 1) * limit + devices.length} of {total.toLocaleString()}
            </span>
            <select
              value={limit}
              onChange={e => { setLimit(parseInt(e.target.value)); setPage(1) }}
              className="bg-white/[0.04] border border-white/[0.08] rounded-md px-2 py-1 text-xs"
            >
              {PAGE_SIZES.map(n => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="btn-icon btn-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {pageNumbers(page, totalPages).map((n, idx) =>
              n === '…'
                ? <span key={idx} className="px-2 text-xs text-slate-600">…</span>
                : (
                  <button
                    key={idx}
                    onClick={() => setPage(n as number)}
                    className={cn(
                      'min-w-[28px] h-7 px-2 rounded-md text-xs font-medium transition',
                      n === page
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                    )}
                  >
                    {n}
                  </button>
                )
            )}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="btn-icon btn-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      <AnimatePresence>
        {confirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !busyId && setConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="card p-6 max-w-md w-full"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  confirm.action === 'delete' ? 'bg-red-500/15 text-red-400' :
                  confirm.action === 'block' ? 'bg-red-500/15 text-red-400' :
                  'bg-emerald-500/15 text-emerald-400'
                )}>
                  {confirm.action === 'delete' ? <Trash2 className="w-5 h-5" /> :
                   confirm.action === 'block' ? <Ban className="w-5 h-5" /> :
                   <Unlock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-100">
                    {confirm.action === 'delete' ? 'Delete device?' :
                     confirm.action === 'block' ? 'Block device?' :
                     'Unblock device?'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {confirm.device.name ?? confirm.device.fingerprint}
                  </p>
                </div>
                <button onClick={() => !busyId && setConfirm(null)} className="ml-auto btn-icon btn-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-5">
                {confirm.action === 'delete' && 'This permanently removes the device record. Activity logs will be preserved (unlinked).'}
                {confirm.action === 'block' && 'This device will be blocked from validating with any license until unblocked.'}
                {confirm.action === 'unblock' && 'This device will be marked OFFLINE and able to validate again.'}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => !busyId && setConfirm(null)}
                  disabled={!!busyId}
                  className="btn-ghost btn-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(confirm.action, confirm.device)}
                  disabled={!!busyId}
                  className={cn(
                    'btn-sm rounded-lg px-4 py-1.5 text-xs font-semibold transition disabled:opacity-50',
                    confirm.action === 'unblock'
                      ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/25'
                      : 'bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/25'
                  )}
                >
                  {busyId === confirm.device.id ? 'Working...' :
                   confirm.action === 'delete' ? 'Delete' :
                   confirm.action === 'block' ? 'Block' :
                   'Unblock'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const arr: (number | '…')[] = [1]
  if (current > 3) arr.push('…')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) arr.push(i)
  if (current < total - 2) arr.push('…')
  arr.push(total)
  return arr
}

function CopyCell({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
      className={cn('inline-flex items-center gap-1.5 hover:text-indigo-300 transition group', className)}
      title="Click to copy"
    >
      {value}
      {copied
        ? <Check className="w-3 h-3 text-emerald-400" />
        : <Copy className="w-3 h-3 text-slate-700 opacity-0 group-hover:opacity-100 transition" />
      }
    </button>
  )
}