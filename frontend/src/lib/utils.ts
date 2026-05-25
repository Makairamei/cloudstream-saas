import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'
import type { LicenseStatus, DeviceStatus, Severity, AbuseType, ActivityType } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Formatting ─────────────────────────────────────────────
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy'): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    return format(d, fmt)
  } catch {
    return '—'
  }
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'MMM d, yyyy HH:mm')
}

export function formatRelativeTime(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return '—'
  }
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
}

// ── License ────────────────────────────────────────────────
export function getLicenseStatusColor(status: LicenseStatus): string {
  const map: Record<LicenseStatus, string> = {
    ACTIVE: 'badge-green',
    EXPIRED: 'badge-red',
    REVOKED: 'badge-red',
    SUSPENDED: 'badge-yellow',
    TRIAL: 'badge-cyan',
    EXPIRING_SOON: 'badge-yellow',
  }
  return map[status] ?? 'badge-muted'
}

export function getLicenseStatusLabel(status: LicenseStatus): string {
  const map: Record<LicenseStatus, string> = {
    ACTIVE: 'Active',
    EXPIRED: 'Expired',
    REVOKED: 'Revoked',
    SUSPENDED: 'Suspended',
    TRIAL: 'Trial',
    EXPIRING_SOON: 'Expiring Soon',
  }
  return map[status] ?? status
}

// ── Device ─────────────────────────────────────────────────
export function getDeviceStatusColor(status: DeviceStatus): string {
  const map: Record<DeviceStatus, string> = {
    ONLINE: 'badge-green',
    OFFLINE: 'badge-muted',
    BLOCKED: 'badge-red',
    SUSPICIOUS: 'badge-yellow',
  }
  return map[status] ?? 'badge-muted'
}

// ── Severity ───────────────────────────────────────────────
export function getSeverityColor(severity: Severity): string {
  const map: Record<Severity, string> = {
    LOW: 'badge-blue',
    MEDIUM: 'badge-yellow',
    HIGH: 'badge-red',
    CRITICAL: 'badge-red',
  }
  return map[severity] ?? 'badge-muted'
}

export function getSeverityDot(severity: Severity): string {
  const map: Record<Severity, string> = {
    LOW: 'bg-blue-400',
    MEDIUM: 'bg-amber-400',
    HIGH: 'bg-red-400',
    CRITICAL: 'bg-red-600',
  }
  return map[severity] ?? 'bg-slate-500'
}

// ── Activity ───────────────────────────────────────────────
export function getActivityColor(type: ActivityType): string {
  if (type.includes('FAIL') || type.includes('ABUSE') || type.includes('BLOCKED')) return 'text-red-400'
  if (type.includes('OK') || type.includes('START') || type.includes('REGISTERED')) return 'text-emerald-400'
  if (type.includes('STOP') || type.includes('EXPIRED') || type.includes('REVOKED')) return 'text-amber-400'
  return 'text-slate-400'
}

export function getActivityBg(type: ActivityType): string {
  if (type.includes('FAIL') || type.includes('ABUSE') || type.includes('BLOCKED')) return 'bg-red-500/10 border-red-500/20'
  if (type.includes('OK') || type.includes('START') || type.includes('REGISTERED')) return 'bg-emerald-500/10 border-emerald-500/20'
  if (type.includes('STOP') || type.includes('EXPIRED') || type.includes('REVOKED')) return 'bg-amber-500/10 border-amber-500/20'
  return 'bg-slate-500/10 border-slate-500/20'
}

// ── Abuse ──────────────────────────────────────────────────
export function getAbuseLabel(type: AbuseType): string {
  const map: Record<AbuseType, string> = {
    DEVICE_OVERFLOW: 'Device Overflow',
    IP_ROTATION: 'IP Rotation',
    BURST_REQUEST: 'Burst Request',
    MULTI_IP_LICENSE: 'Multi-IP License',
    DEVICE_SPOOF: 'Device Spoof',
    VPN_DETECTED: 'VPN Detected',
    TOKEN_ABUSE: 'Token Abuse',
  }
  return map[type] ?? type
}

// ── Trust Score ────────────────────────────────────────────
export function getTrustScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-amber-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

export function getTrustScoreLabel(score: number): string {
  if (score >= 80) return 'Trusted'
  if (score >= 60) return 'Neutral'
  if (score >= 40) return 'Suspicious'
  return 'High Risk'
}

// ── Misc ───────────────────────────────────────────────────
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

export function maskLicenseKey(key: string): string {
  if (key.length <= 8) return key
  return key.slice(0, 8) + '••••••••' + key.slice(-4)
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export function generateId(prefix = ''): string {
  return `${prefix}${Math.random().toString(36).substring(2, 11)}`
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const group = String(item[key])
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getCountryFlag(countryCode: string): string {
  const points = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...points)
}

export function isExpiringSoon(expiresAt: string, days = 7): boolean {
  const expiry = parseISO(expiresAt)
  const now = new Date()
  const diff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diff > 0 && diff <= days
}

export function getProgressColor(percent: number): string {
  if (percent >= 90) return 'bg-red-500'
  if (percent >= 70) return 'bg-amber-500'
  return 'bg-indigo-500'
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function buildQueryString(params: Record<string, unknown>): string {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      q.set(key, String(value))
    }
  }
  return q.toString()
}
