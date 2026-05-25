'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Search, RefreshCw, Trash2, Eye, EyeOff, ExternalLink,
  ChevronDown, Check, X, Loader2, Zap, FileDown,
  Download, CheckSquare, Square, Layers, Filter, ArrowUpDown,
  AlertTriangle, ShieldOff, Clock, Link2, BookLock, TrendingUp,
  BarChart3, Keyboard
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import toast from 'react-hot-toast'

// ── Types ────────────────────────────────────────────────────
type Plugin = {
  id: string; slug: string; name: string; description: string | null
  version: string; category: string | null; fileUrl: string | null
  iconUrl: string | null; isEnabled: boolean; downloadCount: number
  metadata: { authors?: string[]; language?: string; tvTypes?: string[]; internalName?: string; status?: number } | null
  createdAt: string; updatedAt: string
}
type SyncResult = { imported: number; skipped: number; deleted?: number; errors: string[]; total: number; items?: Plugin[] }

// ── Constants ────────────────────────────────────────────────
const DEFAULT_URL = 'https://raw.githubusercontent.com/Makairamei/CSNEW/master/plugins.json'
const ADULT_TYPES = ['AnimH', 'AnimeH', 'NSFW', 'Adult', 'XXX', 'Hentai', '18+']
const CS_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: 'Working', color: '#10b981' },
  2: { label: 'Slow',    color: '#f59e0b' },
  3: { label: 'Beta',    color: '#38bdf8' },
  4: { label: 'Broken',  color: '#ef4444' },
}

// ── Helpers ──────────────────────────────────────────────────
function isAdult(p: Plugin) {
  const types = p.metadata?.tvTypes ?? []
  return types.some(t => ADULT_TYPES.some(a => t.toLowerCase().includes(a.toLowerCase())))
}
function fmtDate(s: string) {
  const d = new Date(s)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtTime(s: string) {
  const d = new Date(s)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m} WIB`
}

// ── Confirm Modal ────────────────────────────────────────────
function ConfirmModal({ open, title, message, danger, onConfirm, onCancel, confirmText = 'Konfirmasi' }:
  { open: boolean; title: string; message: string; danger?: boolean; onConfirm: () => void; onCancel: () => void; confirmText?: string }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.65)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.5)', width: '100%', maxWidth: 420, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            background: danger ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)' }}>
            <AlertTriangle style={{ width: 20, height: 20, color: danger ? '#ef4444' : '#f59e0b' }} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{title}</p>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{message}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 500, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>Batal</button>
          <button onClick={onConfirm} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, borderRadius: 10, border: 'none', cursor: 'pointer', color: '#fff',
            background: danger ? '#ef4444' : 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>{confirmText}</button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────
export default function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled' | 'adult'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'version' | 'downloads'>('name')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<{ title: string; message: string; danger?: boolean; onConfirm: () => void; confirmText?: string } | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [autoDisableAdult, setAutoDisableAdult] = useState(true)
  const [groupAdult, setGroupAdult] = useState(true)
  const searchRef = useRef<HTMLInputElement>(null)

  // Import panel
  const [showImport, setShowImport] = useState(true)
  const [repoUrl, setRepoUrl] = useState(DEFAULT_URL)
  const [importing, setImporting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [actionResult, setActionResult] = useState<SyncResult | null>(null)

  useEffect(() => {
    const s = localStorage.getItem('cs_last_sync')
    if (s) setLastSyncAt(s)
    const saved = localStorage.getItem('cs_auto_disable_adult')
    if (saved !== null) setAutoDisableAdult(saved === 'true')
  }, [])

  useEffect(() => {
    localStorage.setItem('cs_auto_disable_adult', String(autoDisableAdult))
  }, [autoDisableAdult])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const fetchPlugins = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiGet<Plugin[] | { items: Plugin[] }>('/plugins?limit=1000')
      setPlugins(Array.isArray(data) ? data : (data.items ?? []))
    } catch { setPlugins([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPlugins() }, [fetchPlugins])

  const filtered = useMemo(() => {
    let list = [...plugins]
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase()))
    if (filterStatus === 'enabled') list = list.filter(p => p.isEnabled)
    if (filterStatus === 'disabled') list = list.filter(p => !p.isEnabled)
    if (filterStatus === 'adult') list = list.filter(p => isAdult(p))
    list.sort((a, b) => {
      if (sortBy === 'date') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      if (sortBy === 'version') return b.version.localeCompare(a.version)
      if (sortBy === 'downloads') return b.downloadCount - a.downloadCount
      return a.name.localeCompare(b.name)
    })
    return list
  }, [plugins, search, filterStatus, sortBy])

  const activeCount = plugins.filter(p => p.isEnabled).length
  const adultCount = plugins.filter(p => isAdult(p)).length
  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id))
  const someSelected = selected.size > 0

  const toggleSelect = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map(p => p.id)))

  const toggleEnabled = async (p: Plugin) => {
    const next = !p.isEnabled
    setPlugins(prev => prev.map(x => x.id === p.id ? { ...x, isEnabled: next } : x))
    try { await apiPatch(`/plugins/${p.id}`, { isEnabled: next }) }
    catch { setPlugins(prev => prev.map(x => x.id === p.id ? { ...x, isEnabled: p.isEnabled } : x)); toast.error('Gagal update') }
  }

  const handleDelete = (p: Plugin) => setConfirm({
    title: 'Hapus Plugin', danger: true, confirmText: 'Hapus',
    message: `Plugin "${p.name}" akan dihapus permanen.`,
    onConfirm: async () => {
      setConfirm(null)
      setPlugins(prev => prev.filter(x => x.id !== p.id))
      try { await apiDelete(`/plugins/${p.id}`); toast.success('Plugin dihapus') }
      catch { toast.error('Gagal hapus'); fetchPlugins() }
    }
  })

  const handleBulkToggle = async (enable: boolean) => {
    const ids = [...selected]; setSelected(new Set())
    setPlugins(prev => prev.map(p => ids.includes(p.id) ? { ...p, isEnabled: enable } : p))
    await Promise.allSettled(ids.map(id => apiPatch(`/plugins/${id}`, { isEnabled: enable })))
    toast.success(`${ids.length} plugin ${enable ? 'diaktifkan' : 'dinonaktifkan'}`)
  }

  const handleBulkDelete = () => setConfirm({
    title: `Hapus ${selected.size} Plugin`, danger: true, confirmText: `Hapus ${selected.size}`,
    message: `${selected.size} plugin yang dipilih akan dihapus permanen.`,
    onConfirm: async () => {
      const ids = [...selected]; setConfirm(null); setSelected(new Set())
      setPlugins(prev => prev.filter(p => !ids.includes(p.id)))
      const res = await Promise.allSettled(ids.map(id => apiDelete(`/plugins/${id}`)))
      const ok = res.filter(r => r.status === 'fulfilled').length
      toast[ok === ids.length ? 'success' : 'error'](`Dihapus: ${ok}${ok < ids.length ? `, Gagal: ${ids.length - ok}` : ''}`)
      if (ok < ids.length) fetchPlugins()
    }
  })

  const saveSync = (items: Plugin[]) => {
    const now = new Date().toISOString()
    localStorage.setItem('cs_last_sync', now)
    setLastSyncAt(now)
    if (autoDisableAdult) {
      items = items.map(p => isAdult(p) ? { ...p, isEnabled: false } : p)
    }
    setPlugins(items)
  }

  const handleImport = async () => {
    if (!repoUrl) return
    setImporting(true); setActionResult(null)
    try {
      const data = await apiPost<SyncResult>('/plugins/import', { url: repoUrl })
      saveSync(data.items ?? [])
      setActionResult(data)
      toast.success(`✓ Import: ${data.imported} plugin, skip ${data.skipped}`)
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Import gagal') }
    finally { setImporting(false) }
  }

  const handleSync = () => setConfirm({
    title: 'Sync dari Repo', danger: false, confirmText: 'Sync Sekarang',
    message: `Semua plugin lama akan DIHAPUS, lalu diganti dengan plugin terbaru dari:\n${repoUrl}\n\nProses ini tidak bisa dibatalkan.`,
    onConfirm: async () => {
      setConfirm(null); setSyncing(true); setActionResult(null)
      try {
        const data = await apiPost<SyncResult>('/plugins/sync', { url: repoUrl })
        saveSync(data.items ?? [])
        setActionResult(data)
        toast.success(`✓ Sync selesai: ${data.imported} diimport, ${data.deleted ?? 0} dihapus`)
      } catch (e: any) { toast.error(e?.response?.data?.message || 'Sync gagal') }
      finally { setSyncing(false) }
    }
  })

  const handleClearAll = () => setConfirm({
    title: 'Hapus Semua Plugin', danger: true, confirmText: `Hapus Semua (${plugins.length})`,
    message: `Semua ${plugins.length} plugin akan dihapus permanen dari database.\nGunakan ini sebelum re-import untuk data bersih.`,
    onConfirm: async () => {
      setConfirm(null); setClearing(true)
      try {
        const data = await apiPost<{ deleted: number }>('/plugins/clear', {})
        setPlugins([]); setSelected(new Set())
        toast.success(`${data.deleted} plugin dihapus. Silakan Import ulang.`)
      } catch (e: any) { toast.error(e?.response?.data?.message || 'Clear gagal') }
      finally { setClearing(false) }
    }
  })

  const busy = importing || syncing || clearing

  const handleExportCSV = () => {
    const headers = ['Nama', 'Slug', 'Versi', 'Status', 'Types', 'Authors', 'Aktif', 'Ditambah', 'Jam']
    const rows = filtered.map(p => [
      p.name, p.slug, `v${p.version}`,
      CS_STATUS[p.metadata?.status ?? 1]?.label ?? 'Unknown',
      (p.metadata?.tvTypes ?? []).join('; '),
      (p.metadata?.authors ?? []).join('; '),
      p.isEnabled ? 'Ya' : 'Tidak',
      fmtDate(p.createdAt), fmtTime(p.createdAt)
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `plugins-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast.success(`${filtered.length} plugin diekspor ke CSV`)
  }

  const handleDisableAllAdult = async () => {
    const adultPlugins = plugins.filter(p => isAdult(p) && p.isEnabled)
    if (!adultPlugins.length) { toast('Semua plugin 18+ sudah nonaktif'); return }
    setPlugins(prev => prev.map(p => isAdult(p) ? { ...p, isEnabled: false } : p))
    await Promise.allSettled(adultPlugins.map(p => apiPatch(`/plugins/${p.id}`, { isEnabled: false })))
    toast.success(`${adultPlugins.length} plugin 18+ dinonaktifkan`)
  }

  const normalPlugins = useMemo(() => filtered.filter(p => !isAdult(p)), [filtered])
  const adultPlugins  = useMemo(() => filtered.filter(p =>  isAdult(p)), [filtered])
  const displayList   = useMemo(() => groupAdult ? [...normalPlugins, ...adultPlugins] : filtered, [groupAdult, normalPlugins, adultPlugins, filtered])

  const COL = '36px minmax(180px,1fr) 64px 130px 88px 118px 100px'

  return (
    <div className="page-wrapper">
      {confirm && <ConfirmModal open title={confirm.title} message={confirm.message} danger={confirm.danger} confirmText={confirm.confirmText} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      {/* ── Header ── */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Plugin Manager</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{activeCount}</span> aktif
                <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{plugins.length}</span> total
                <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{adultCount}</span> 18+
              </p>
              {lastSyncAt && (
                <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="w-3 h-3" />
                  Sync {formatRelativeTime(lastSyncAt)}
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={fetchPlugins} className="btn-ghost btn-sm flex items-center gap-2">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Plugins', value: plugins.length, Icon: Package,  iconCls: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/15',  val: 'text-indigo-700 dark:text-indigo-300' },
          { label: 'Aktif',         value: activeCount,    Icon: Eye,       iconCls: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/15', val: 'text-emerald-700 dark:text-emerald-300' },
          { label: 'Nonaktif',      value: plugins.length - activeCount, Icon: EyeOff, iconCls: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-700/40', val: 'text-slate-600 dark:text-slate-300' },
          { label: 'Konten 18+',    value: adultCount,     Icon: ShieldOff, iconCls: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-500/15',   val: 'text-amber-700 dark:text-amber-300', badge: autoDisableAdult ? 'auto-off' : '' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', s.bg)}>
                <s.Icon className={cn('w-[18px] h-[18px]', s.iconCls)} />
              </div>
              {s.badge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-500/30 uppercase tracking-wider">{s.badge}</span>
              )}
            </div>
            <div className={cn('text-[28px] font-bold tracking-tight leading-none mb-1', s.val)}>{s.value}</div>
            <div className="text-xs text-slate-500 font-medium">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Import / Sync Panel ── */}
      <div className="card overflow-hidden">
        <button onClick={() => setShowImport(!showImport)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Import / Sync Repository</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-500/30">Cara Tercepat</span>
          </div>
          <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform duration-200', showImport && 'rotate-180')} />
        </button>

        <AnimatePresence initial={false}>
          {showImport && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-slate-100 dark:border-white/[0.06]">
              <div className="px-5 py-4 space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Import</span> = tambah/update tanpa hapus existing.{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Sync</span> = hapus semua lalu import ulang.{' '}
                  Plugin 18+ otomatis <span className="font-semibold text-amber-600 dark:text-amber-400">dinonaktifkan</span> jika toggle aktif.
                </p>

                {/* URL row */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                      value={repoUrl}
                      onChange={e => { setRepoUrl(e.target.value); setActionResult(null) }}
                      placeholder="https://raw.githubusercontent.com/.../plugins.json"
                      className="w-full pl-9 pr-3 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <button onClick={handleImport} disabled={busy || !repoUrl}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap">
                    {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    Import
                  </button>
                  <button onClick={handleSync} disabled={busy || !repoUrl}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-indigo-500/35 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap">
                    {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Sync
                  </button>
                  <button onClick={handleClearAll} disabled={busy || plugins.length === 0}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap">
                    {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Hapus Semua
                  </button>
                </div>

                {/* Adult toggle */}
                <div className="flex items-center gap-2.5">
                  <button onClick={() => setAutoDisableAdult(v => !v)} className="relative flex-shrink-0 focus:outline-none"
                    style={{ width: 36, height: 20, borderRadius: 999, border: 'none', cursor: 'pointer', background: autoDisableAdult ? '#6366f1' : '#cbd5e1', transition: 'background .2s', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 2, left: autoDisableAdult ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
                  </button>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    <ShieldOff className="w-3 h-3 inline mr-1 text-amber-500" />
                    Auto nonaktifkan plugin{' '}
                    <span className="font-semibold text-amber-600 dark:text-amber-400">18+ / NSFW / AnimeH</span>{' '}
                    saat sync/import
                  </span>
                </div>

                {/* Result */}
                <AnimatePresence>
                  {actionResult && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={cn('rounded-xl border px-4 py-3', actionResult.errors?.length
                        ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10'
                        : 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10')}>
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <Check className={cn('w-3.5 h-3.5 flex-shrink-0', actionResult.errors?.length ? 'text-amber-500' : 'text-emerald-500')} />
                        <span className={cn('font-semibold', actionResult.errors?.length ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300')}>Selesai</span>
                        {actionResult.deleted !== undefined && <span className="text-slate-500">· Dihapus: <strong className="text-slate-700 dark:text-slate-200">{actionResult.deleted}</strong></span>}
                        <span className="text-slate-500">· Imported: <strong className="text-slate-700 dark:text-slate-200">{actionResult.imported}</strong></span>
                        <span className="text-slate-500">· Skip: <strong className="text-slate-700 dark:text-slate-200">{actionResult.skipped}</strong></span>
                        <span className="text-slate-500">· Total: <strong className="text-slate-700 dark:text-slate-200">{actionResult.total}</strong></span>
                      </div>
                      {actionResult.errors?.length > 0 && (
                        <div className="mt-2 text-xs text-red-600 dark:text-red-400 space-y-0.5 border-t border-red-200 dark:border-red-500/20 pt-2">
                          {actionResult.errors.slice(0, 3).map((e, i) => <div key={i} className="truncate">{e}</div>)}
                          {actionResult.errors.length > 3 && <div className="text-slate-400">+{actionResult.errors.length - 3} lainnya...</div>}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 18+ Policy Card ── */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25">
        <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <BookLock className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-red-700 dark:text-red-300">Kebijakan Konten 18+</p>
          <p className="text-[11px] text-red-600/70 dark:text-red-400/70 mt-0.5">
            Plugin 18+ dipisah di bawah &amp; otomatis dinonaktifkan saat sync/import.
            Lisensi baru disarankan memblokir konten ini.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handleDisableAllAdult} disabled={!adultCount}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-red-200 dark:border-red-500/30">
            <ShieldOff className="w-3 h-3" />
            Nonaktifkan Semua ({adultCount})
          </button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            ref={searchRef}
            value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari plugin…"
            className="w-full pl-9 pr-16 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 transition-all"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-300 dark:text-slate-600 font-mono bg-slate-100 dark:bg-white/[0.06] px-1 py-px rounded hidden sm:block">
            Ctrl+F
          </span>
        </div>
        <div className="relative">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
            className="appearance-none pl-3 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 cursor-pointer transition-all">
            <option value="all">Semua ({plugins.length})</option>
            <option value="enabled">Aktif ({activeCount})</option>
            <option value="disabled">Nonaktif ({plugins.length - activeCount})</option>
            <option value="adult">18+ ({adultCount})</option>
          </select>
          <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            className="appearance-none pl-3 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 cursor-pointer transition-all">
            <option value="name">A–Z</option>
            <option value="date">Terbaru</option>
            <option value="version">Versi</option>
            <option value="downloads">Downloads</option>
          </select>
          <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>
        <button onClick={() => setGroupAdult(v => !v)}
          className={cn('flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-all',
            groupAdult
              ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400'
              : 'bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.1] text-slate-500')}>
          <BarChart3 className="w-3 h-3" />
          Pisah 18+
        </button>
        <button onClick={handleExportCSV} disabled={!filtered.length}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-500 hover:text-slate-700 hover:border-slate-300 disabled:opacity-40 transition-all">
          <FileDown className="w-3 h-3" />
          Export CSV
        </button>
        <span className="text-xs text-slate-400 ml-auto font-medium">{filtered.length} plugin</span>
      </div>

      {/* ── Bulk Action Bar ── */}
      <AnimatePresence>
        {someSelected && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/25">
            <Layers className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">{selected.size} plugin dipilih</span>
            <div className="flex items-center gap-1.5 ml-auto">
              <button onClick={() => handleBulkToggle(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/25 transition-colors">
                <Eye className="w-3 h-3" />Aktifkan
              </button>
              <button onClick={() => handleBulkToggle(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/[0.07] text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors">
                <EyeOff className="w-3 h-3" />Nonaktifkan
              </button>
              <button onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/25 transition-colors">
                <Trash2 className="w-3 h-3" />Hapus {selected.size}
              </button>
              <button onClick={() => setSelected(new Set())}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Plugin Table ── */}
      <div className="card overflow-hidden">
        {/* Head */}
        <div className="grid items-center px-4 py-2.5 bg-slate-50 dark:bg-black/20 border-b border-slate-100 dark:border-white/[0.06]"
          style={{ gridTemplateColumns: COL }}>
          <button onClick={toggleAll} className="flex items-center justify-center">
            {allSelected
              ? <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
              : someSelected
                ? <CheckSquare className="w-3.5 h-3.5 text-indigo-400 opacity-60" />
                : <Square className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />}
          </button>
          {['Plugin', 'Ver', 'Types', 'Status', 'Ditambah', 'Aksi'].map(h => (
            <div key={h} className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{h}</div>
          ))}
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto overflow-x-hidden" style={{ maxHeight: 540, scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Memuat plugin...</p>
          </div>
        ) : displayList.length === 0 ? (
          <div className="py-16 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada plugin'}
            </p>
            <p className="text-xs text-slate-400 mb-4">
              {search ? 'Coba kata kunci lain' : 'Import plugin dari repository untuk memulai'}
            </p>
            {!search && (
              <button onClick={() => setShowImport(true)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline transition-colors">
                Buka panel Import →
              </button>
            )}
          </div>
        ) : displayList.map((p, idx) => {
          const types  = p.metadata?.tvTypes ?? []
          const authors = p.metadata?.authors ?? []
          const status  = CS_STATUS[p.metadata?.status ?? 1] ?? CS_STATUS[1]
          const adult   = isAdult(p)
          const isSel   = selected.has(p.id)
          const isFirstAdult = groupAdult && adult && idx > 0 && !isAdult(displayList[idx - 1])
          return (
            <div key={p.id}>
              {/* 18+ Section Divider */}
              {isFirstAdult && (
                <div className="grid items-center px-4 py-2 bg-red-50 dark:bg-red-500/8 border-y border-red-200 dark:border-red-500/20"
                  style={{ gridTemplateColumns: COL }}>
                  <div />
                  <div className="col-span-6 flex items-center gap-2">
                    <ShieldOff className="w-3 h-3 text-red-500" />
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest">Konten 18+ / NSFW — {adultPlugins.length} Plugin</span>
                    <span className="text-[9px] px-1.5 py-px rounded-full bg-red-100 dark:bg-red-500/20 text-red-500 border border-red-200 dark:border-red-500/25 font-semibold ml-1">Dipisahkan otomatis</span>
                  </div>
                </div>
              )}

            <div
              className={cn(
                'grid items-center px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.04] transition-colors',
                'hover:bg-slate-50/80 dark:hover:bg-white/[0.025]',
                adult && 'bg-red-50/30 dark:bg-red-500/3 hover:bg-red-50/60 dark:hover:bg-red-500/6',
                isSel  && 'bg-indigo-50/70 dark:bg-indigo-500/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/8',
                !p.isEnabled && 'opacity-50'
              )}
              style={{ gridTemplateColumns: COL }}>

              {/* ☐ */}
              <button onClick={() => toggleSelect(p.id)} className="flex items-center justify-center">
                {isSel
                  ? <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                  : <Square className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />}
              </button>

              {/* Plugin */}
              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                {p.iconUrl ? (
                  <img src={p.iconUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 ring-1 ring-black/5 dark:ring-white/10"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ring-1',
                    adult
                      ? 'bg-gradient-to-br from-red-100 to-red-50 dark:from-red-500/20 dark:to-red-500/5 ring-red-200 dark:ring-red-500/20'
                      : 'bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-500/20 dark:to-indigo-500/5 ring-indigo-200 dark:ring-indigo-500/20')}>
                    <Package className={cn('w-[15px] h-[15px]', adult ? 'text-red-400' : 'text-indigo-500')} />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">{p.name}</span>
                    {adult && (
                      <span className="flex-shrink-0 text-[9px] px-1.5 py-px rounded font-bold bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/25 uppercase tracking-wider">18+</span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">{p.metadata?.internalName || p.slug}</div>
                  {authors.length > 0 && <div className="text-[10px] text-slate-400 truncate">{authors.slice(0, 2).join(', ')}</div>}
                </div>
              </div>

              {/* Ver */}
              <div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-mono font-semibold bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20">
                  v{p.version}
                </span>
              </div>

              {/* Types */}
              <div className="flex flex-wrap gap-1 pr-2">
                {types.slice(0, 2).map((t: string) => (
                  <span key={t} className={cn('text-[9px] px-1.5 py-px rounded-md font-medium border',
                    adult
                      ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
                      : 'bg-slate-100 dark:bg-white/[0.07] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/[0.08]')}>{t}</span>
                ))}
                {types.length > 2 && <span className="text-[9px] text-slate-400 font-medium">+{types.length - 2}</span>}
              </div>

              {/* Status */}
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border"
                  style={{ color: status.color, background: `${status.color}15`, borderColor: `${status.color}35` }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: status.color }} />
                  {status.label}
                </span>
              </div>

              {/* Date + Time */}
              <div className="whitespace-nowrap">
                <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-tight">{fmtDate(p.createdAt)}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{fmtTime(p.createdAt)}</div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 justify-end">
                {p.fileUrl && (
                  <a href={p.fileUrl} target="_blank" rel="noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
                    title="Buka URL">
                    <ExternalLink className="w-[13px] h-[13px]" />
                  </a>
                )}
                <button onClick={() => toggleEnabled(p)} title={p.isEnabled ? 'Nonaktifkan' : 'Aktifkan'}
                  className={cn('p-1.5 rounded-lg transition-colors',
                    p.isEnabled
                      ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                      : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10')}>
                  {p.isEnabled
                    ? <Eye className="w-[13px] h-[13px]" />
                    : <EyeOff className="w-[13px] h-[13px]" />}
                </button>
                <button onClick={() => handleDelete(p)} title="Hapus"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-[13px] h-[13px]" />
                </button>
              </div>
            </div>
            </div>
          )
        })}
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/60 dark:bg-black/10 border-t border-slate-100 dark:border-white/[0.05]">
            <span className="text-xs text-slate-400 font-medium">
              {filtered.length} dari {plugins.length} plugin
              {someSelected && <span className="ml-2 text-indigo-600 dark:text-indigo-400 font-semibold">· {selected.size} dipilih</span>}
            </span>
            <button onClick={() => setSelected(new Set(filtered.map(p => p.id)))}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline transition-colors">
              Pilih semua {filtered.length}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
