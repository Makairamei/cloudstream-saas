'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trash2, RefreshCw, Undo2, AlertTriangle, ArrowLeft, Search, X,
  Clock, Smartphone, Activity, Play,
} from 'lucide-react'
import { cn, formatDate, formatRelativeTime } from '@/lib/utils'
import { apiGet, apiPatch, apiDelete } from '@/lib/api'
import toast from 'react-hot-toast'

type DeletedLicense = {
  id: string
  key: string
  name: string
  email: string | null
  status: string
  maxDevices: number
  expiresAt: string | null
  deletedAt: string
  purgeAt: string
  daysLeft: number
  hoursLeft: number
  _count?: { devices: number }
}

export default function RecycleBinPage() {
  const [items, setItems] = useState<DeletedLicense[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ action: 'restore' | 'purge'; license: DeletedLicense } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiGet<{ items: DeletedLicense[]; total: number }>('/licenses/recycle-bin?limit=200')
      setItems(data.items ?? [])
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load recycle bin')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(l =>
    !search ||
    l.key.toLowerCase().includes(search.toLowerCase()) ||
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAction(action: 'restore' | 'purge', license: DeletedLicense) {
    setBusy(license.id)
    try {
      if (action === 'restore') {
        const res = await apiPatch<{ restored: { devices: number; activityLogs: number; playbackLogs: number } }>(`/licenses/${license.id}/restore`, {})
        const r = res.restored
        toast.success(`Restored ${license.key} — ${r?.devices ?? 0} devices, ${r?.activityLogs ?? 0} logs`)
      } else {
        await apiDelete(`/licenses/${license.id}/hard`)
        toast.success(`Permanently deleted ${license.key}`)
      }
      setConfirm(null)
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? `Failed to ${action}`)
    } finally {
      setBusy(null)
    }
  }

  const colorByDays = (d: number) => {
    if (d <= 1) return 'text-red-400 bg-red-500/10 border-red-500/25'
    if (d <= 3) return 'text-amber-400 bg-amber-500/10 border-amber-500/25'
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/licenses" className="btn-icon btn-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-amber-400" />
              Recycle Bin
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Soft-deleted licenses are kept for 7 days before permanent deletion.
              Restore brings back the license <strong>and</strong> all related devices, activity logs, and playback history.
            </p>
          </div>
        </div>
        <button onClick={load} className="btn-ghost btn-sm flex items-center gap-2">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              type="text"
              placeholder="Search deleted licenses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
          <span className="text-xs text-slate-700">
            {filtered.length} item{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <Trash2 className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-slate-300">Recycle bin is empty</p>
            <p className="text-xs text-slate-600 mt-1 max-w-sm">
              Deleted licenses will appear here. Auto-purged after 7 days.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((lic, i) => (
              <motion.div
                key={lic.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="px-5 py-4 hover:bg-white/[0.02] transition-colors flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-mono font-semibold text-slate-200">{lic.key}</code>
                    <span className={cn('text-2xs font-medium px-2 py-0.5 rounded-full border', colorByDays(lic.daysLeft))}>
                      <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                      {lic.daysLeft <= 0 ? 'Purging soon' : `${lic.daysLeft} day${lic.daysLeft !== 1 ? 's' : ''} left`}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{lic.name}{lic.email && <span className="text-slate-600"> · {lic.email}</span>}</p>
                  <div className="flex items-center gap-4 mt-2 flex-wrap text-2xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-3 h-3" />
                      {lic._count?.devices ?? 0} devices
                    </span>
                    <span>Max devices: {lic.maxDevices}</span>
                    <span>Deleted {formatRelativeTime(lic.deletedAt)}</span>
                    <span>Purges {formatDate(lic.purgeAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setConfirm({ action: 'restore', license: lic })}
                    disabled={!!busy}
                    className="btn-sm rounded-lg px-3 py-1.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25 transition flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Restore
                  </button>
                  <button
                    onClick={() => setConfirm({ action: 'purge', license: lic })}
                    disabled={!!busy}
                    className="btn-icon btn-sm text-red-400 hover:bg-red-500/15 disabled:opacity-50"
                    title="Delete permanently now"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="px-5 py-3 border-t border-white/[0.05] flex items-center gap-3 text-2xs text-slate-700">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          Items here are auto-purged 7 days after deletion. Restoring brings back the license and all related devices, activity logs, and playback history.
        </div>
      </div>

      <AnimatePresence>
        {confirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !busy && setConfirm(null)}
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
                  confirm.action === 'restore'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-red-500/15 text-red-400'
                )}>
                  {confirm.action === 'restore' ? <Undo2 className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-slate-100">
                    {confirm.action === 'restore' ? 'Restore license?' : 'Permanently delete?'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-mono">{confirm.license.key}</p>
                </div>
                <button onClick={() => !busy && setConfirm(null)} className="btn-icon btn-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-2">
                {confirm.action === 'restore' && (
                  <>
                    This will restore <code className="text-indigo-300">{confirm.license.key}</code> together with{' '}
                    <strong>all its devices, activity logs, and playback history</strong> that were deleted with it.
                  </>
                )}
                {confirm.action === 'purge' && (
                  <>
                    This will <strong>permanently delete</strong> the license, all its devices, IP history, activity logs, and playback records.{' '}
                    <span className="text-red-400 font-semibold">This action cannot be undone.</span>
                  </>
                )}
              </p>

              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => !busy && setConfirm(null)} disabled={!!busy} className="btn-ghost btn-sm">
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(confirm.action, confirm.license)}
                  disabled={!!busy}
                  className={cn(
                    'btn-sm rounded-lg px-4 py-1.5 text-xs font-semibold transition disabled:opacity-50',
                    confirm.action === 'restore'
                      ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/25'
                      : 'bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/25'
                  )}
                >
                  {busy === confirm.license.id
                    ? 'Working…'
                    : confirm.action === 'restore'
                      ? 'Restore'
                      : 'Delete forever'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}