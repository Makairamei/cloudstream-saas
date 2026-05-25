'use client'

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Key, Plus, Search, Filter, Download, MoreHorizontal,
  Copy, RotateCcw, Ban, CheckCircle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, ChevronsUpDown, Shield, Eye, Trash2
} from 'lucide-react'
import { cn, formatDate, formatRelativeTime, getLicenseStatusColor, getLicenseStatusLabel, maskLicenseKey, copyToClipboard } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { LicenseStatus, CreateLicenseDto } from '@/types'
import { LicenseDrawer } from '@/components/ui/license-drawer'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'

type License = {
  id: string; key: string; name: string; email: string; status: LicenseStatus
  maxDevices: number; activeDevices: number; expiresAt: string; createdAt: string
  lastVerifiedAt: string; trustScore: number; verifyCount: number
}

const statusColors: Record<LicenseStatus, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  EXPIRED: 'bg-red-500/15 text-red-400 border border-red-500/25',
  REVOKED: 'bg-red-500/15 text-red-400 border border-red-500/25',
  SUSPENDED: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  TRIAL: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25',
  EXPIRING_SOON: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
}

export default function LicensesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null)
  const [actionMenu, setActionMenu] = useState<{ license: License; top: number; right: number } | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ action: 'revoke' | 'activate' | 'delete'; license: License } | null>(null)
  const [bulkConfirm, setBulkConfirm] = useState<'deactivate' | 'delete' | null>(null)

  const fetchLicenses = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await apiGet<{ items: License[]; total: number }>('/licenses?limit=500')
      setLicenses(data.items ?? [])
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Gagal memuat lisensi'
      setLoadError(msg)
      toast.error('Gagal memuat lisensi — klik Retry')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchLicenses() }, [fetchLicenses])

  const STATUS_FILTERS = [
    { label: 'All', value: 'all', count: licenses.length },
    { label: 'Active', value: 'ACTIVE', count: licenses.filter(l => l.status === 'ACTIVE').length },
    { label: 'Expired', value: 'EXPIRED', count: licenses.filter(l => l.status === 'EXPIRED').length },
    { label: 'Trial', value: 'TRIAL', count: licenses.filter(l => l.status === 'TRIAL').length },
    { label: 'Expiring', value: 'EXPIRING_SOON', count: licenses.filter(l => l.status === 'EXPIRING_SOON').length },
    { label: 'Revoked', value: 'REVOKED', count: licenses.filter(l => l.status === 'REVOKED').length },
  ]

  const filtered = licenses.filter(l => {
    const matchSearch = !search ||
      l.key?.toLowerCase().includes(search.toLowerCase()) ||
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    return matchSearch && matchStatus
  })

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const toggleAll = () => {
    setSelected(prev => prev.length === filtered.length ? [] : filtered.map(l => l.id))
  }

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30" />
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-indigo-400" /> : <ChevronDown className="w-3 h-3 text-indigo-400" />
  }

  return (
    <>
      <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">License Manager</h1>
          <p className="text-sm text-slate-500 mt-0.5">{licenses.length} total licenses</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost btn-sm flex items-center gap-2">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary btn-sm flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            New License
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {STATUS_FILTERS.slice(1).map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'glass rounded-xl px-4 py-3 text-center transition-all duration-200',
              statusFilter === f.value ? 'border-indigo-500/30 bg-indigo-500/5' : 'hover:border-white/[0.1]'
            )}
          >
            <div className="text-lg font-bold text-slate-100 tabular-nums">{f.count}</div>
            <div className="text-2xs text-slate-600 mt-0.5">{f.label}</div>
          </button>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="card p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-white/[0.05]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              type="text"
              placeholder="Search by key, name, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150',
                  statusFilter === f.value
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25'
                    : 'text-slate-600 hover:text-slate-400 border border-transparent hover:border-white/[0.08]'
                )}
              >
                {f.label} <span className="opacity-60">{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bulk actions */}
        {selected.length > 0 && (
          <AnimatePresence mode="wait">
            {bulkConfirm ? (
              <motion.div
                key="bulk-confirm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-3 px-4 py-3 border-b"
                style={{
                  borderColor: bulkConfirm === 'delete' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)',
                  background:  bulkConfirm === 'delete' ? 'rgba(239,68,68,0.05)'  : 'rgba(245,158,11,0.05)',
                }}
              >
                <AlertTriangle className={cn('w-4 h-4 flex-shrink-0', bulkConfirm === 'delete' ? 'text-red-400' : 'text-amber-400')} />
                <span className="text-xs text-slate-400">
                  {bulkConfirm === 'delete'
                    ? `Permanently delete ${selected.length} license(s)? Cannot be undone.`
                    : `Deactivate ${selected.length} license(s)?`}
                </span>
                <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                  <button onClick={() => setBulkConfirm(null)} className="btn-ghost btn-sm text-xs">Cancel</button>
                  <button
                    onClick={async () => {
                      try {
                        if (bulkConfirm === 'delete') {
                          await Promise.all(selected.map(id => apiDelete(`/licenses/${id}`)))
                          setLicenses(prev => prev.filter(l => !selected.includes(l.id)))
                          toast.success(`${selected.length} lisensi dihapus`)
                        } else {
                          await Promise.all(selected.map(id => apiPatch(`/licenses/${id}/revoke`, { reason: 'Bulk revoke' })))
                          setLicenses(prev => prev.map(l => selected.includes(l.id) ? { ...l, status: 'REVOKED' as LicenseStatus } : l))
                          toast.success(`${selected.length} lisensi dinonaktifkan`)
                        }
                        setSelected([])
                        setBulkConfirm(null)
                      } catch (e: any) {
                        toast.error(e?.response?.data?.message || 'Aksi gagal')
                      }
                    }}
                    className={cn(
                      'text-xs text-white font-medium px-3 py-1.5 rounded-lg transition-colors',
                      bulkConfirm === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'
                    )}
                  >
                    Confirm {bulkConfirm === 'delete' ? 'Delete' : 'Deactivate'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="bulk-actions"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex items-center gap-3 px-4 py-3 border-b border-indigo-500/20 bg-indigo-500/[0.04]"
              >
                <span className="text-xs font-medium text-indigo-400">{selected.length} selected</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBulkConfirm('deactivate')}
                    className="btn-ghost btn-sm text-xs flex items-center gap-1.5"
                  >
                    <Ban className="w-3 h-3" />Deactivate
                  </button>
                  <button
                    onClick={() => setBulkConfirm('delete')}
                    className="btn-ghost btn-sm text-xs flex items-center gap-1.5 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-3 h-3" />Delete
                  </button>
                  <button
                    onClick={() => {
                      const lic = licenses.find(l => l.id === selected[0])
                      if (lic) setSelectedLicense(lic)
                    }}
                    className="btn-ghost btn-sm text-xs flex items-center gap-1.5"
                  >
                    <Shield className="w-3 h-3" />Manage
                  </button>
                </div>
                <button onClick={() => setSelected([])} className="ml-auto text-xs text-slate-600 hover:text-slate-400">Clear</button>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Error banner */}
        {loadError && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm border border-red-500/25 bg-red-500/[0.08] text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">Gagal memuat lisensi: <span className="font-mono text-xs opacity-80">{loadError}</span></span>
            <button onClick={fetchLicenses} className="px-3 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-xs font-semibold border border-red-500/25 transition-colors">
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[900px]">
            <thead>
              <tr className="border-b border-white/[0.05]">
                <th className="w-10 px-4 py-3 text-left align-middle">
                  <input
                    type="checkbox"
                    checked={selected.length === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-indigo-500 cursor-pointer block"
                  />
                </th>
                {[
                  { label: 'License Key', col: 'key', width: 'w-48' },
                  { label: 'User', col: 'name', width: 'w-36' },
                  { label: 'Status', col: 'status', width: 'w-32' },
                  { label: 'Devices', col: 'activeDevices', width: 'w-24' },
                  { label: 'Expires', col: 'expiresAt', width: 'w-32' },
                  { label: 'Trust', col: 'trustScore', width: 'w-24' },
                  { label: 'Last Seen', col: 'lastVerifiedAt', width: 'w-32' },
                  { label: '', col: '', width: 'w-16' },
                ].map(h => (
                  <th
                    key={h.col}
                    className={cn('px-4 py-3 text-left text-2xs font-medium text-slate-600 uppercase tracking-wider', h.width, h.col && 'cursor-pointer hover:text-slate-400 transition-colors')}
                    onClick={() => h.col && handleSort(h.col)}
                  >
                    <div className="flex items-center gap-1">
                      {h.label}
                      {h.col && <SortIcon col={h.col} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((license, i) => (
                <motion.tr
                  key={license.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02, duration: 0.3 }}
                  className={cn(
                    'border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-100 group cursor-pointer',
                    selected.includes(license.id) && 'bg-indigo-500/[0.04]'
                  )}
                  onClick={e => { if ((e.target as HTMLElement).closest('input,button')) return; setSelectedLicense(license) }}
                >
                  <td className="px-4 py-3 align-middle">
                    <input
                      type="checkbox"
                      checked={selected.includes(license.id)}
                      onChange={() => toggleSelect(license.id)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer block"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-indigo-300">{license.key}</code>
                      <button
                        onClick={() => { const u = `${window.location.origin}/r/${license.key}/repo.json`; copyToClipboard(u); toast.success('Repo URL disalin!') }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-slate-300"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-300 font-medium truncate">{license.name}</div>
                    <div className="text-2xs text-slate-600 truncate">{license.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-2xs font-medium px-2.5 py-1 rounded-full', statusColors[license.status])}>
                      {getLicenseStatusLabel(license.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-slate-300">
                        {license.activeDevices}/{license.maxDevices}
                      </div>
                      <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden w-12">
                        <div
                          className={cn('h-full rounded-full', license.activeDevices / license.maxDevices >= 0.9 ? 'bg-red-500' : license.activeDevices / license.maxDevices >= 0.6 ? 'bg-amber-500' : 'bg-indigo-500')}
                          style={{ width: `${(license.activeDevices / license.maxDevices) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={cn('text-xs', license.status === 'EXPIRED' ? 'text-red-400' : license.status === 'EXPIRING_SOON' ? 'text-amber-400' : 'text-slate-400')}>
                      {formatDate(license.expiresAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className={cn('w-1.5 h-1.5 rounded-full', license.trustScore >= 80 ? 'bg-emerald-500' : license.trustScore >= 60 ? 'bg-amber-500' : 'bg-red-500')} />
                      <span className="text-xs font-medium text-slate-300">{license.trustScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-600">{formatRelativeTime(license.lastVerifiedAt)}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        const rect = e.currentTarget.getBoundingClientRect()
                        setActionMenu({ license, top: rect.bottom + 4, right: window.innerWidth - rect.right })
                      }}
                      className="btn-icon btn-sm opacity-30 hover:opacity-100 transition-opacity"
                      title="More actions"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
          <span className="text-xs text-slate-600">
            Showing {filtered.length} of {licenses.length} licenses
          </span>
          <div className="flex items-center gap-2">
            <button className="btn-ghost btn-sm text-xs">Previous</button>
            <span className="text-xs text-slate-600 px-2">Page 1 of 1</span>
            <button className="btn-ghost btn-sm text-xs">Next</button>
          </div>
        </div>
      </div>
    </div>

    {/* Create License Modal */}
    <AnimatePresence>
      {showCreateModal && (
        <CreateLicenseModal
          onClose={() => setShowCreateModal(false)}
          onCreated={license => { setLicenses(prev => [license as License, ...prev]); setShowCreateModal(false) }}
        />
      )}
    </AnimatePresence>

    {/* License Drawer */}
    <LicenseDrawer
      license={selectedLicense}
      onClose={() => setSelectedLicense(null)}
      onDeleted={(id) => { setLicenses(prev => prev.filter(l => l.id !== id)); setSelectedLicense(null) }}
      onStatusChange={(id, status) => setLicenses(prev => prev.map(l => l.id === id ? { ...l, status: status as LicenseStatus } : l))}
    />

    {/* ─── Action dropdown menu ─── */}
    {actionMenu && createPortal(
      <>
        <div className="fixed inset-0 z-[100]" onClick={() => setActionMenu(null)} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed z-[101] w-48 rounded-xl overflow-hidden py-1.5"
          style={{
            top: actionMenu.top,
            right: actionMenu.right,
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          }}
        >
          <button
            onClick={() => { setSelectedLicense(actionMenu.license); setActionMenu(null) }}
            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-slate-300 hover:bg-white/[0.05] transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" /> View Details
          </button>
          <button
            onClick={() => { setConfirmModal({ action: 'activate', license: actionMenu.license }); setActionMenu(null) }}
            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-emerald-400 hover:bg-white/[0.05] transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> Activate
          </button>
          <button
            onClick={() => { setConfirmModal({ action: 'revoke', license: actionMenu.license }); setActionMenu(null) }}
            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-amber-400 hover:bg-white/[0.05] transition-colors"
          >
            <Ban className="w-3.5 h-3.5 flex-shrink-0" /> Revoke
          </button>
          <div className="border-t border-white/[0.06] my-1" />
          <button
            onClick={() => { setConfirmModal({ action: 'delete', license: actionMenu.license }); setActionMenu(null) }}
            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-red-400 hover:bg-red-500/[0.07] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> Delete License
          </button>
        </motion.div>
      </>,
      document.body
    )}

    {/* ─── Confirm action modal ─── */}
    {confirmModal && createPortal(
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
        onClick={e => { if (e.target === e.currentTarget) setConfirmModal(null) }}
      >
        <motion.div
          initial={{ scale: 0.95, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm rounded-2xl p-6"
          style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}
        >
          <div className="flex items-start gap-3 mb-5">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
              confirmModal.action === 'delete' ? 'bg-red-500/15' :
              confirmModal.action === 'revoke' ? 'bg-amber-500/15' : 'bg-emerald-500/15'
            )}>
              {confirmModal.action === 'delete' && <Trash2 className="w-5 h-5 text-red-400" />}
              {confirmModal.action === 'revoke' && <Ban className="w-5 h-5 text-amber-400" />}
              {confirmModal.action === 'activate' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-100 mb-1">
                {confirmModal.action === 'delete' ? 'Delete License' :
                 confirmModal.action === 'revoke' ? 'Revoke License' : 'Activate License'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {confirmModal.action === 'delete'
                  ? `Permanently delete license for ${confirmModal.license.name}? This cannot be undone.`
                  : confirmModal.action === 'revoke'
                  ? `Revoke access for ${confirmModal.license.name}? They will immediately lose access.`
                  : `Re-activate license for ${confirmModal.license.name}?`}
              </p>
              <code className="text-xs font-mono text-indigo-400 mt-2 block opacity-75">
                {confirmModal.license.key}
              </code>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setConfirmModal(null)} className="btn-ghost btn-sm px-4">Cancel</button>
            <button
              onClick={async () => {
                try {
                  if (confirmModal.action === 'delete') {
                    await apiDelete(`/licenses/${confirmModal.license.id}`)
                    setLicenses(prev => prev.filter(l => l.id !== confirmModal.license.id))
                    toast.success('Lisensi dihapus')
                  } else if (confirmModal.action === 'revoke') {
                    await apiPatch(`/licenses/${confirmModal.license.id}/revoke`, { reason: 'Admin action' })
                    setLicenses(prev => prev.map(l => l.id === confirmModal.license.id ? { ...l, status: 'REVOKED' as LicenseStatus } : l))
                    toast.success('Lisensi dicabut')
                  } else if (confirmModal.action === 'activate') {
                    await apiPatch(`/licenses/${confirmModal.license.id}/restore`)
                    setLicenses(prev => prev.map(l => l.id === confirmModal.license.id ? { ...l, status: 'ACTIVE' as LicenseStatus } : l))
                    toast.success('Lisensi diaktifkan')
                  }
                  setConfirmModal(null)
                } catch (e: any) {
                  toast.error(e?.response?.data?.message || 'Aksi gagal')
                }
              }}
              className={cn(
                'btn-sm px-5 font-semibold text-white rounded-xl text-xs transition-colors',
                confirmModal.action === 'delete' ? 'bg-red-500 hover:bg-red-600' :
                confirmModal.action === 'revoke' ? 'bg-amber-500 hover:bg-amber-600' :
                'bg-emerald-500 hover:bg-emerald-600'
              )}
            >
              {confirmModal.action === 'delete' ? 'Delete' :
               confirmModal.action === 'revoke' ? 'Revoke' : 'Activate'}
            </button>
          </div>
        </motion.div>
      </motion.div>,
      document.body
    )}
    </>
  )
}

// ── Create License Modal ────────────────────────────────────
function CreateLicenseModal({ onClose, onCreated }: { onClose: () => void; onCreated: (license: unknown) => void }) {
  const [form, setForm] = useState<CreateLicenseDto>({
    name: '',
    email: '',
    maxDevices: 3,
    gracePeriodDays: 7,
    isTrial: false,
    expiresAt: '',
    allowedPlugins: [],
    tags: [],
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Nama wajib diisi'); return }
    setIsSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email?.trim() || undefined,
        maxDevices: form.maxDevices ?? 3,
        gracePeriodDays: form.gracePeriodDays ?? 7,
        isTrial: form.isTrial,
        notes: form.notes?.trim() || undefined,
      }
      if (!form.isTrial && form.expiresAt) payload.expiresAt = new Date(form.expiresAt).toISOString()
      const created = await apiPost('/licenses', payload)
      toast.success(`Lisensi berhasil dibuat!`)
      onCreated(created)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal membuat lisensi')
    } finally {
      setIsSubmitting(false)
    }
  }, [form, onCreated])

  const set = (field: keyof CreateLicenseDto, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const INPUT = 'w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 transition-all'

  const EXPIRY_PRESETS = [
    { label: '1 Bulan',       months: 1  },
    { label: '3 Bulan',       months: 3  },
    { label: '6 Bulan',       months: 6  },
    { label: '1 Tahun',       months: 12 },
    { label: '2 Tahun',       months: 24 },
  ]
  const addMonthsToNow = (n: number) => {
    const d = new Date(); d.setMonth(d.getMonth() + n)
    return d.toISOString().split('T')[0]
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg bg-white dark:bg-[#0d0d1a] rounded-[20px] border border-slate-200 dark:border-white/[0.1] shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Key className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">New License</h2>
              <p className="text-xs text-slate-500">Generate a new license key</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all">
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">

            {/* Trial toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
              <div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Trial License</div>
                <div className="text-xs text-slate-500">Limited time, 1 device max</div>
              </div>
              <button
                type="button"
                onClick={() => set('isTrial', !form.isTrial)}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0',
                  form.isTrial ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-white/10'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200',
                  form.isTrial ? 'left-[22px]' : 'left-0.5'
                )} />
              </button>
            </div>

            {/* Name + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Owner Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Ahmad Fauzi" className={INPUT} required />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Email</label>
                <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)}
                  placeholder="user@example.com" className={INPUT} />
              </div>
            </div>

            {/* Max Devices + Grace Period */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Max Devices</label>
                <input type="number" value={form.maxDevices ?? 3} onChange={e => set('maxDevices', Number(e.target.value))}
                  min={1} max={100} className={INPUT} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Grace Period (days)</label>
                <input type="number" value={form.gracePeriodDays ?? 7} onChange={e => set('gracePeriodDays', Number(e.target.value))}
                  min={0} max={30} className={INPUT} />
              </div>
            </div>

            {/* Expiry */}
            {!form.isTrial && (
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">
                  Masa Aktif <span className="text-slate-400">(kosong = seumur hidup)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {EXPIRY_PRESETS.map(p => (
                    <button key={p.label} type="button"
                      onClick={() => set('expiresAt', addMonthsToNow(p.months))}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all font-medium ${
                        form.expiresAt === addMonthsToNow(p.months)
                          ? 'bg-indigo-500/15 border-indigo-400/40 text-indigo-600 dark:text-indigo-400'
                          : 'border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-400 hover:border-indigo-400/40'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                  <button type="button"
                    onClick={() => set('expiresAt', '')}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-all font-medium ${
                      !form.expiresAt
                        ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-600 dark:text-emerald-400'
                        : 'border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-400 hover:border-emerald-400/40'
                    }`}>
                    Seumur Hidup ♾
                  </button>
                </div>
                <input type="date" value={form.expiresAt || ''} onChange={e => set('expiresAt', e.target.value)}
                  className={INPUT} min={new Date().toISOString().split('T')[0]} />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">
                Notes <span className="text-slate-400">(optional)</span>
              </label>
              <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)}
                placeholder="Internal notes..." rows={2} className={cn(INPUT, 'resize-none')} />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-white/[0.07]">
            <p className="text-xs text-slate-400">Key will be auto-generated</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="btn-ghost btn-sm">Cancel</button>
              <button type="submit" disabled={isSubmitting}
                className="btn-primary btn-sm flex items-center gap-2 min-w-[130px] justify-center">
                {isSubmitting
                  ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</>
                  : <><Plus className="w-3.5 h-3.5" />Create License</>}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
