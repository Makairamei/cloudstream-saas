'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Copy, Key, Monitor, Activity, Play, Shield, Puzzle, Edit2,
  CheckCircle, Clock, Ban, AlertTriangle, Wifi, WifiOff,
  RefreshCw, ExternalLink, User, Mail, Calendar, Hash,
  ChevronRight, ToggleLeft, ToggleRight, Globe, Smartphone,
} from 'lucide-react'
import { cn, formatDate, formatRelativeTime, copyToClipboard } from '@/lib/utils'
import type { LicenseStatus, ActivityType, Severity } from '@/types'
import { apiGet, apiPatch, apiDelete } from '@/lib/api'
import toast from 'react-hot-toast'

// ── Types ──────────────────────────────────────────────────
interface DrawerLicense {
  id: string
  key: string
  name: string
  email: string
  status: LicenseStatus
  maxDevices: number
  activeDevices: number
  expiresAt: string
  createdAt: string
  lastVerifiedAt: string
  trustScore: number
  verifyCount: number
  allowedPlugins?: string[]
  notes?: string
}

function getApiBase() {
  if (typeof window !== 'undefined') return window.location.origin
  return (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
}

type DrawerTab = 'info' | 'devices' | 'activity' | 'playback' | 'access'


// ── Helpers ────────────────────────────────────────────────
const STATUS_STYLES: Record<LicenseStatus, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  EXPIRED: 'bg-red-500/15 text-red-400 border border-red-500/25',
  REVOKED: 'bg-red-500/15 text-red-400 border border-red-500/25',
  SUSPENDED: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  TRIAL: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25',
  EXPIRING_SOON: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
}

const ACTIVITY_COLORS: Partial<Record<ActivityType, string>> = {
  VERIFY_OK: 'text-emerald-400',
  VERIFY_FAIL: 'text-red-400',
  PLAYBACK_START: 'text-cyan-400',
  DEVICE_REGISTERED: 'text-indigo-400',
  ABUSE_DETECTED: 'text-red-500',
}


// ── Info Tab ───────────────────────────────────────────────
function InfoTab({ lic }: { lic: DrawerLicense }) {
  const copy = (v: string, label: string) => { copyToClipboard(v); toast.success(`${label} copied`) }

  const row = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div className="flex items-center gap-3 px-4 py-3 last:border-0" style={{ borderBottom: '1px solid var(--card-border)' }}>
      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-slate-500">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-slate-500 mb-0.5 leading-none">{label}</div>
        <div className="text-sm text-slate-200 font-medium leading-snug">{value}</div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Key */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500">License Key</span>
          <button onClick={() => copy(lic.key, 'License key')} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            <Copy className="w-3 h-3" /> Copy Key
          </button>
        </div>
        <code className="text-sm font-mono text-indigo-300 font-semibold">{lic.key}</code>
      </div>

      {/* Status + trust */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="text-xs text-slate-500 mb-2">Status</div>
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_STYLES[lic.status])}>
            {lic.status.replace('_', ' ')}
          </span>
        </div>
        <div className="p-3 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="text-xs text-slate-500 mb-1">Trust Score</div>
          <div className={cn('text-2xl font-bold', lic.trustScore >= 80 ? 'text-emerald-400' : lic.trustScore >= 60 ? 'text-amber-400' : 'text-red-400')}>
            {lic.trustScore}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
        {row(<User className="w-4 h-4" />, 'Owner', lic.name)}
        {row(<Mail className="w-4 h-4" />, 'Email', lic.email || '—')}
        {row(<Monitor className="w-4 h-4" />, 'Devices', `${lic.activeDevices} / ${lic.maxDevices} active`)}
        {row(<Calendar className="w-4 h-4" />, 'Expires', lic.expiresAt ? formatDate(lic.expiresAt) : 'Lifetime')}
        {row(<Clock className="w-4 h-4" />, 'Created', formatDate(lic.createdAt))}
        {row(<Activity className="w-4 h-4" />, 'Last Verified', formatRelativeTime(lic.lastVerifiedAt))}
        {row(<Hash className="w-4 h-4" />, 'Total Verifications', lic.verifyCount.toLocaleString())}
      </div>

      {/* Repo URL */}
      <div className="p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500 font-medium">Repo URL (siap pakai di CloudStream)</span>
          <button onClick={() => copy(`${getApiBase()}/r/${lic.key}/repo.json`, 'Repo URL')} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold">
            <Copy className="w-3 h-3" /> Salin URL
          </button>
        </div>
        <code className="text-xs font-mono text-indigo-300 break-all leading-relaxed">{`${getApiBase()}/r/${lic.key}/repo.json`}</code>
        <p className="text-[10px] text-slate-500 mt-1.5">Paste URL ini ke CloudStream → Settings → Repositories</p>
      </div>
    </div>
  )
}

// ── Devices Tab ────────────────────────────────────────────
function DevicesTab({ lic }: { lic: DrawerLicense }) {
  const [devices, setDevices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiGet<{ items: any[]; total: number }>(`/devices?licenseId=${lic.id}&limit=50`)
      .then(d => setDevices(d.items ?? []))
      .catch(() => setDevices([]))
      .finally(() => setLoading(false))
  }, [lic.id])

  if (loading) return (
    <div className="py-12 text-center">
      <RefreshCw className="w-5 h-5 mx-auto text-slate-600 animate-spin mb-2" />
      <p className="text-xs text-slate-500">Memuat perangkat...</p>
    </div>
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500">{devices.length} perangkat terdaftar</span>
        <span className="text-xs text-slate-600">Maks: {lic.maxDevices}</span>
      </div>
      {devices.map(d => (
        <div key={d.id} className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className={cn('w-2 h-2 rounded-full flex-shrink-0', d.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-600')} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-200 truncate">{d.name || d.model || 'Android Device'}</div>
            <div className="text-xs text-slate-500">{d.model || ''}{d.lastIp ? ` · ${d.lastIp}` : ''}</div>
            <div className="text-xs text-slate-600 mt-1">{formatRelativeTime(d.lastSeenAt)}</div>
          </div>
          <div className={cn('flex-shrink-0', d.status === 'ONLINE' ? 'text-emerald-400' : 'text-slate-500')}>
            {d.status === 'ONLINE' ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          </div>
        </div>
      ))}
      {devices.length === 0 && (
        <div className="py-12 text-center">
          <Monitor className="w-8 h-8 mx-auto text-slate-700 mb-2" />
          <p className="text-sm text-slate-500">Belum ada perangkat</p>
          <p className="text-xs text-slate-600 mt-1">Muncul setelah lisensi pertama kali diverifikasi</p>
        </div>
      )}
    </div>
  )
}

// ── Activity Tab ───────────────────────────────────────────
function ActivityTab({ lic }: { lic: DrawerLicense }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiGet<any[]>(`/activity?licenseKey=${encodeURIComponent(lic.key)}&limit=50`)
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [lic.key])

  if (loading) return (
    <div className="py-12 text-center">
      <RefreshCw className="w-5 h-5 mx-auto text-slate-600 animate-spin mb-2" />
      <p className="text-xs text-slate-500">Memuat aktivitas...</p>
    </div>
  )

  return (
    <div className="space-y-2">
      {logs.map((l, i) => (
        <div key={l.id ?? i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
            l.severity === 'CRITICAL' || l.severity === 'HIGH' ? 'bg-red-500' :
            l.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
          )} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={cn('text-xs font-semibold', ACTIVITY_COLORS[l.type as ActivityType] || 'text-slate-400')}>
                {l.type?.replace(/_/g, ' ')}
              </span>
              {l.ip && <span className="text-xs font-mono text-slate-600">{l.ip}</span>}
            </div>
            <div className="text-xs text-slate-400">{l.message}</div>
            <div className="text-xs text-slate-600 mt-1">{formatRelativeTime(l.createdAt)}</div>
          </div>
        </div>
      ))}
      {logs.length === 0 && (
        <div className="py-12 text-center">
          <Activity className="w-8 h-8 mx-auto text-slate-700 mb-2" />
          <p className="text-sm text-slate-500">Belum ada aktivitas</p>
          <p className="text-xs text-slate-600 mt-1">Log muncul setelah lisensi digunakan</p>
        </div>
      )}
    </div>
  )
}

// ── Playback Tab ───────────────────────────────────────────
function PlaybackTab({ lic }: { lic: DrawerLicense }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiGet<any[]>(`/activity?licenseKey=${encodeURIComponent(lic.key)}&type=PLAYBACK_START&limit=50`)
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [lic.key])

  if (loading) return (
    <div className="py-12 text-center">
      <RefreshCw className="w-5 h-5 mx-auto text-slate-600 animate-spin mb-2" />
      <p className="text-xs text-slate-500">Memuat riwayat playback...</p>
    </div>
  )

  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-500 mb-3">{logs.length} playback</div>
      {logs.map((l, i) => (
        <div key={l.id ?? i} className="p-3 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-indigo-400">{(l.metadata as any)?.plugin || 'Plugin'}</span>
          </div>
          <div className="text-sm font-medium text-slate-200 mb-1.5">{l.message}</div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {l.ip && <span className="font-mono">{l.ip}</span>}
            <span className="ml-auto">{formatRelativeTime(l.createdAt)}</span>
          </div>
        </div>
      ))}
      {logs.length === 0 && (
        <div className="py-12 text-center">
          <Play className="w-8 h-8 mx-auto text-slate-700 mb-2" />
          <p className="text-sm text-slate-500">Belum ada riwayat playback</p>
          <p className="text-xs text-slate-600 mt-1">Muncul saat user memutar konten via plugin</p>
        </div>
      )}
    </div>
  )
}

// ── Access Tab ─────────────────────────────────────────────
type ApiPlugin = { id: string; slug: string; name: string; isEnabled: boolean; iconUrl: string | null; metadata?: any }

function AccessTab({ lic }: { lic: DrawerLicense }) {
  const [allPlugins, setAllPlugins] = useState<ApiPlugin[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiGet<ApiPlugin[] | { items: ApiPlugin[] }>('/plugins?limit=1000&isEnabled=true')
      .then(data => {
        const list = Array.isArray(data) ? data : ((data as { items: ApiPlugin[] }).items ?? [])
        setAllPlugins(list)
        if ((lic.allowedPlugins ?? []).length === 0) {
          // Default: select all non-NSFW plugins; NSFW stays off until explicitly enabled
          const safe = list.filter(p => !(p.metadata?.isNsfw === true))
          setSelected(new Set(safe.map(p => p.slug)))
        } else {
          setSelected(new Set(lic.allowedPlugins!))
        }
      })
      .catch(() => setAllPlugins([]))
      .finally(() => setLoading(false))
  }, [lic.id])

  const toggle = useCallback((slug: string) => {
    setSelected(prev => { const s = new Set(prev); s.has(slug) ? s.delete(slug) : s.add(slug); return s })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const slugs = [...selected]
      const isAll = slugs.length === allPlugins.length
      await apiPatch(`/licenses/${lic.id}`, { allowedPlugins: isAll ? [] : slugs })
      toast.success('Akses plugin disimpan')
    } catch { toast.error('Gagal menyimpan') }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="py-12 text-center">
      <RefreshCw className="w-5 h-5 mx-auto text-slate-600 animate-spin mb-2" />
      <p className="text-xs text-slate-500">Memuat plugin...</p>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{selected.size}/{allPlugins.length} plugin diizinkan</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setSelected(new Set(allPlugins.map(p => p.slug)))} className="text-xs text-indigo-400 hover:text-indigo-300">Semua</button>
          <span className="text-slate-700">·</span>
          <button onClick={() => setSelected(new Set())} className="text-xs text-slate-500 hover:text-slate-400">Kosongkan</button>
        </div>
      </div>
      <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'thin' }}>
        {allPlugins.map(p => (
          <div key={p.slug} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', minHeight: '44px' }}>
            {p.iconUrl
              ? <img src={p.iconUrl} alt="" className="w-5 h-5 rounded flex-shrink-0 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              : <Puzzle className="w-4 h-4 text-slate-600 flex-shrink-0" />}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-sm font-medium text-slate-300 truncate">{p.name}</span>
              {p.metadata?.isNsfw && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold flex-shrink-0">NSFW</span>}
            </div>
            <button onClick={() => toggle(p.slug)} aria-label={`Toggle ${p.name}`}
              className={cn('relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0',
                selected.has(p.slug) ? 'bg-indigo-500' : 'bg-white/[0.12]')}>
              <span className={cn('absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200',
                selected.has(p.slug) ? 'left-[22px]' : 'left-[3px]')} />
            </button>
          </div>
        ))}
        {allPlugins.length === 0 && (
          <div className="py-10 text-center">
            <Puzzle className="w-7 h-7 mx-auto text-slate-700 mb-2" />
            <p className="text-xs text-slate-500">Belum ada plugin aktif</p>
          </div>
        )}
      </div>
      <button onClick={handleSave} disabled={saving}
        className="w-full py-2 rounded-xl text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
        {saving
          ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Menyimpan...</>
          : <><CheckCircle className="w-3.5 h-3.5" />Simpan Akses Plugin</>}
      </button>
    </div>
  )
}

// ── Edit Form ─────────────────────────────────────────────
interface EditData {
  name: string
  email: string
  maxDevices: number
  gracePeriodDays: number
  expiresAt: string
  notes: string
}

function EditForm({ data, onChange }: {
  data: EditData
  onChange: (k: keyof EditData, v: string | number) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-slate-500 mb-1.5 block">Owner Name</label>
        <input
          value={data.name}
          onChange={e => onChange('name', e.target.value)}
          className="input w-full"
          placeholder="e.g. Ahmad Fauzi"
        />
      </div>
      <div>
        <label className="text-xs text-slate-500 mb-1.5 block">Email</label>
        <input
          type="email"
          value={data.email}
          onChange={e => onChange('email', e.target.value)}
          className="input w-full"
          placeholder="user@example.com"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1.5 block">Max Devices</label>
          <input
            type="number" min={1} max={100}
            value={data.maxDevices}
            onChange={e => onChange('maxDevices', Number(e.target.value))}
            className="input w-full"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1.5 block">Grace Period (days)</label>
          <input
            type="number" min={0} max={30}
            value={data.gracePeriodDays}
            onChange={e => onChange('gracePeriodDays', Number(e.target.value))}
            className="input w-full"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-500 mb-1.5 block">
          Masa Aktif <span className="text-slate-600">(blank = seumur hidup)</span>
        </label>
        {(() => {
          const addM = (n: number) => { const d = new Date(); d.setMonth(d.getMonth()+n); return d.toISOString().split('T')[0] }
          const presets = [{ l:'1 Bln',m:1},{ l:'3 Bln',m:3},{ l:'6 Bln',m:6},{ l:'1 Thn',m:12},{ l:'2 Thn',m:24}]
          return (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {presets.map(p => (
                <button key={p.l} type="button" onClick={() => onChange('expiresAt', addM(p.m))}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all font-medium ${
                    data.expiresAt === addM(p.m)
                      ? 'bg-indigo-500/15 border-indigo-400/40 text-indigo-400'
                      : 'border-white/[0.1] text-slate-500 hover:border-indigo-400/40 hover:text-slate-300'
                  }`}>{p.l}</button>
              ))}
              <button type="button" onClick={() => onChange('expiresAt', '')}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-all font-medium ${
                  !data.expiresAt
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-400'
                    : 'border-white/[0.1] text-slate-500 hover:border-emerald-400/40'
                }`}>♾ Seumur Hidup</button>
            </div>
          )
        })()}
        <input
          type="date"
          value={data.expiresAt}
          onChange={e => onChange('expiresAt', e.target.value)}
          className="input w-full"
        />
      </div>
      <div>
        <label className="text-xs text-slate-500 mb-1.5 block">
          Notes <span className="text-slate-600">(internal only)</span>
        </label>
        <textarea
          rows={3}
          value={data.notes}
          onChange={e => onChange('notes', e.target.value)}
          placeholder="Internal notes about this license..."
          className="input w-full resize-none"
        />
      </div>
      <div className="p-3 rounded-xl text-xs text-slate-500" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', color: 'var(--text-secondary)' }}>
        💡 Tip: Switch to the <span className="text-indigo-400 font-medium">Access</span> tab to manage plugin permissions for this license.
      </div>
    </div>
  )
}

// ── Main Drawer ────────────────────────────────────────────
interface LicenseDrawerProps {
  license: DrawerLicense | null
  onClose: () => void
  onDeleted?: (id: string) => void
  onStatusChange?: (id: string, status: string) => void
}

const TABS: { id: DrawerTab; label: string; icon: React.ReactNode }[] = [
  { id: 'info',     label: 'Info',     icon: <Key className="w-3 h-3" /> },
  { id: 'devices',  label: 'Devices',  icon: <Monitor className="w-3 h-3" /> },
  { id: 'activity', label: 'Activity', icon: <Activity className="w-3 h-3" /> },
  { id: 'playback', label: 'Playback', icon: <Play className="w-3 h-3" /> },
  { id: 'access',   label: 'Access',   icon: <Puzzle className="w-3 h-3" /> },
]

export function LicenseDrawer({ license, onClose, onDeleted, onStatusChange }: LicenseDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>('info')
  const [confirmAction, setConfirmAction] = useState<'revoke' | 'activate' | 'renew' | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditData>({
    name: '', email: '', maxDevices: 3, gracePeriodDays: 7, expiresAt: '', notes: '',
  })

  useEffect(() => {
    if (!license) return
    setTab('info')
    setConfirmAction(null)
    setIsEditing(false)
    setEditForm({
      name: license.name,
      email: license.email || '',
      maxDevices: license.maxDevices,
      gracePeriodDays: 7,
      expiresAt: license.expiresAt ? license.expiresAt.substring(0, 10) : '',
      notes: '',
    })
  }, [license?.id])

  return (
    <AnimatePresence>
      {license && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col overflow-hidden"
            style={{
              background: 'var(--panel-bg)',
              borderLeft: '1px solid var(--panel-border)',
              boxShadow: '-24px 0 80px rgba(0,0,0,0.25)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 16px rgba(99,102,241,0.35)' }}>
                  <Key className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-100 truncate">{license.name}</div>
                  <code className="text-xs font-mono text-indigo-400 truncate block">{license.key}</code>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/[0.1] transition-all"
                    title="Edit license"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs — hidden while editing */}
            {!isEditing && (
              <div className="flex items-center gap-0.5 px-3 py-2 border-b border-white/[0.05] flex-shrink-0 overflow-x-auto scrollbar-none">
                {TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap flex-shrink-0',
                      tab === t.id
                        ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]'
                    )}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-5">
              {isEditing ? (
                <EditForm
                  data={editForm}
                  onChange={(k, v) => setEditForm(prev => ({ ...prev, [k]: v }))}
                />
              ) : (
                <>
                  {tab === 'info'     && <InfoTab     lic={license} />}
                  {tab === 'devices'  && <DevicesTab  lic={license} />}
                  {tab === 'activity' && <ActivityTab lic={license} />}
                  {tab === 'playback' && <PlaybackTab lic={license} />}
                  {tab === 'access'   && <AccessTab   lic={license} />}
                </>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center gap-2 px-5 py-4 border-t border-white/[0.06] flex-shrink-0">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn-ghost btn-sm flex items-center gap-1.5 flex-1 justify-center"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const payload: Record<string, unknown> = {
                          name: editForm.name.trim(),
                          email: editForm.email.trim() || undefined,
                          maxDevices: editForm.maxDevices,
                          gracePeriodDays: editForm.gracePeriodDays,
                          notes: editForm.notes.trim() || undefined,
                        }
                        if (editForm.expiresAt) payload.expiresAt = new Date(editForm.expiresAt).toISOString()
                        else payload.expiresAt = null
                        await apiPatch(`/licenses/${license.id}`, payload)
                        toast.success('Lisensi diperbarui')
                        setIsEditing(false)
                      } catch { toast.error('Gagal menyimpan') }
                    }}
                    className="btn-primary btn-sm flex items-center gap-1.5 flex-1 justify-center"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Simpan
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setConfirmAction('revoke')}
                    className="btn-ghost btn-sm flex items-center gap-1.5 flex-1 justify-center text-amber-400 hover:text-amber-300"
                  >
                    <Ban className="w-3.5 h-3.5" /> Revoke
                  </button>
                  <button
                    onClick={() => setConfirmAction('renew')}
                    className="btn-ghost btn-sm flex items-center gap-1.5 flex-1 justify-center"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Renew
                  </button>
                  <button
                    onClick={() => setConfirmAction('activate')}
                    className="btn-primary btn-sm flex items-center gap-1.5 flex-1 justify-center"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Activate
                  </button>
                </>
              )}
            </div>

            {/* ── Inline confirm overlay ── */}
            <AnimatePresence>
              {confirmAction && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 z-20 flex items-end"
                  style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
                  onClick={() => setConfirmAction(null)}
                >
                  <motion.div
                    initial={{ y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 24, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full p-5 space-y-4"
                    style={{ background: 'var(--confirm-bg)', borderTop: '1px solid var(--panel-border)' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                        confirmAction === 'revoke' ? 'bg-amber-500/15' :
                        confirmAction === 'renew'  ? 'bg-indigo-500/15' : 'bg-emerald-500/15'
                      )}>
                        {confirmAction === 'revoke'   && <Ban        className="w-4 h-4 text-amber-400" />}
                        {confirmAction === 'renew'    && <RefreshCw  className="w-4 h-4 text-indigo-400" />}
                        {confirmAction === 'activate' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-100 mb-1">
                          {confirmAction === 'revoke' ? 'Revoke License?' :
                           confirmAction === 'renew'  ? 'Renew License?' : 'Activate License?'}
                        </div>
                        <div className="text-xs text-slate-400 leading-relaxed">
                          {confirmAction === 'revoke'
                            ? 'This will immediately revoke access. The user will lose all access.'
                            : confirmAction === 'renew'
                            ? 'Extend the expiry by 30 days from today.'
                            : 'Re-activate this license and restore user access.'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmAction(null)}
                        className="btn-ghost btn-sm flex-1 justify-center"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (!license) return
                          try {
                            if (confirmAction === 'revoke') {
                              await apiPatch(`/licenses/${license.id}/revoke`, { reason: 'Admin action' })
                              onStatusChange?.(license.id, 'REVOKED')
                              toast.success('Lisensi dicabut')
                            } else if (confirmAction === 'activate') {
                              await apiPatch(`/licenses/${license.id}/restore`)
                              onStatusChange?.(license.id, 'ACTIVE')
                              toast.success('Lisensi diaktifkan')
                            } else if (confirmAction === 'renew') {
                              const newExpiry = new Date(Date.now() + 30 * 86400 * 1000).toISOString()
                              await apiPatch(`/licenses/${license.id}`, { expiresAt: newExpiry })
                              toast.success('Lisensi diperpanjang 30 hari')
                            }
                            setConfirmAction(null)
                          } catch (e: any) {
                            toast.error(e?.response?.data?.message || 'Aksi gagal')
                          }
                        }}
                        className={cn(
                          'btn-sm flex-1 justify-center font-semibold text-white rounded-xl text-xs transition-colors',
                          confirmAction === 'revoke'   ? 'bg-amber-500 hover:bg-amber-600' :
                          confirmAction === 'renew'    ? 'bg-indigo-500 hover:bg-indigo-600' :
                          'bg-emerald-500 hover:bg-emerald-600'
                        )}
                      >
                        Confirm {confirmAction.charAt(0).toUpperCase() + confirmAction.slice(1)}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
