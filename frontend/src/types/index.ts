// ─────────────────────────────────────────────────────────────
// CloudStream SaaS — Core Type Definitions
// ─────────────────────────────────────────────────────────────
import type { ReactNode } from 'react'

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'RESELLER' | 'ANALYST'

export type LicenseStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED' | 'TRIAL' | 'EXPIRING_SOON'

export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'BLOCKED' | 'SUSPICIOUS'

export type PluginStatus = 'ACTIVE' | 'INACTIVE' | 'DEPRECATED'

export type ActivityType =
  | 'VERIFY_OK'
  | 'VERIFY_FAIL'
  | 'DEVICE_REGISTERED'
  | 'PLUGIN_SESSION'
  | 'SELECTORS_OK'
  | 'PLAYBACK_START'
  | 'PLAYBACK_STOP'
  | 'ABUSE_DETECTED'
  | 'LICENSE_CREATED'
  | 'LICENSE_REVOKED'
  | 'LICENSE_EXPIRED'
  | 'DEVICE_BLOCKED'
  | 'DEVICE_UNBLOCKED'
  | 'IP_BLOCKED'

export type AbuseType =
  | 'DEVICE_OVERFLOW'
  | 'IP_ROTATION'
  | 'BURST_REQUEST'
  | 'MULTI_IP_LICENSE'
  | 'DEVICE_SPOOF'
  | 'VPN_DETECTED'
  | 'TOKEN_ABUSE'

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type AdminAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE_LICENSE'
  | 'UPDATE_LICENSE'
  | 'DELETE_LICENSE'
  | 'REVOKE_LICENSE'
  | 'RESTORE_LICENSE'
  | 'BLOCK_IP'
  | 'UNBLOCK_IP'
  | 'BLOCK_DEVICE'
  | 'UNBLOCK_DEVICE'
  | 'CREATE_PLUGIN'
  | 'UPDATE_PLUGIN'
  | 'DELETE_PLUGIN'
  | 'UPDATE_SETTINGS'
  | 'CREATE_ADMIN'
  | 'DELETE_ADMIN'
  | 'UPDATE_ROLE'

// ── User / Auth ─────────────────────────────────────────
export interface User {
  id: string
  email: string
  name: string
  role: Role
  avatar?: string
  createdAt: string
  lastLogin?: string
  twoFactorEnabled: boolean
  isActive: boolean
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface LoginDto {
  email: string
  password: string
  rememberMe?: boolean
  twoFactorCode?: string
}

export interface LoginResponse {
  user: User
  accessToken: string
  refreshToken: string
}

// ── License ─────────────────────────────────────────────
export interface License {
  id: string
  key: string
  name: string
  email?: string
  status: LicenseStatus
  maxDevices: number
  activeDevices: number
  expiresAt?: string
  gracePeriodDays: number
  isTrial: boolean
  allowedPlugins: string[]
  tags: string[]
  notes?: string
  resellerId?: string
  createdAt: string
  updatedAt: string
  lastVerifiedAt?: string
  revokedAt?: string
  revokedReason?: string
  playbackCount: number
  verifyCount: number
  trustScore: number
}

export interface LicenseStats {
  total: number
  active: number
  expired: number
  revoked: number
  trial: number
  expiringSoon: number
  suspended: number
}

export interface CreateLicenseDto {
  name: string
  email?: string
  expiresAt?: string
  maxDevices?: number
  gracePeriodDays?: number
  isTrial?: boolean
  allowedPlugins?: string[]
  tags?: string[]
  notes?: string
  count?: number
}

// ── Device ──────────────────────────────────────────────
export interface Device {
  id: string
  hash: string
  fingerprint: string
  model?: string
  osName?: string
  osVersion?: string
  appVersion?: string
  lastIp?: string
  lastSeen?: string
  status: DeviceStatus
  isOnline: boolean
  licenseId: string
  licenseKey: string
  trustScore: number
  flagCount: number
  country?: string
  city?: string
  registeredAt: string
  blockedAt?: string
  blockedReason?: string
}

export interface DeviceStats {
  total: number
  online: number
  offline: number
  blocked: number
  suspicious: number
}

// ── Plugin ──────────────────────────────────────────────
export interface Plugin {
  id: string
  name: string
  slug: string
  description?: string
  version: string
  latestVersion: string
  category: string
  status: PluginStatus
  isFeatured: boolean
  fileSize?: number
  fileHash?: string
  downloadUrl?: string
  thumbnailUrl?: string
  downloadCount: number
  activeCount: number
  createdAt: string
  updatedAt: string
  tags: string[]
  versions: PluginVersion[]
}

export interface PluginVersion {
  id: string
  version: string
  changelog?: string
  fileHash: string
  fileSize: number
  downloadCount: number
  createdAt: string
  isLatest: boolean
}

// ── Activity ─────────────────────────────────────────────
export interface ActivityLog {
  id: string
  type: ActivityType
  severity: Severity
  licenseKey?: string
  deviceHash?: string
  pluginName?: string
  ip?: string
  country?: string
  message: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface PlaybackLog {
  id: string
  licenseKey: string
  deviceHash: string
  pluginName: string
  videoTitle?: string
  videoUrl?: string
  ip?: string
  country?: string
  duration?: number
  startedAt: string
  stoppedAt?: string
  isActive: boolean
}

export interface PluginUsage {
  pluginId: string
  pluginName: string
  action: 'HOME' | 'SEARCH' | 'LOAD' | 'PLAY'
  count: number
  licenseKey?: string
  deviceHash?: string
  createdAt: string
}

// ── Analytics ─────────────────────────────────────────────
export interface AnalyticsOverview {
  totalLicenses: number
  activeLicenses: number
  onlineDevices: number
  pluginsToday: number
  playbacksToday: number
  blockedTotal: number
  revenue?: number
  growth: {
    licenses: number
    devices: number
    playbacks: number
  }
}

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface TimeSeriesData {
  timestamp: string
  [key: string]: number | string
}

export interface TopContent {
  title: string
  count: number
  pluginName: string
  trend: 'UP' | 'DOWN' | 'STABLE'
}

// ── Security ─────────────────────────────────────────────
export interface BlockedIP {
  id: string
  ip: string
  reason: string
  blockedAt: string
  expiresAt?: string
  requestCount: number
  country?: string
  isAutoBlocked: boolean
}

export interface BlockedDevice {
  id: string
  hash: string
  reason: string
  blockedAt: string
  licenseKey?: string
  isAutoBlocked: boolean
}

export interface AbuseAlert {
  id: string
  type: AbuseType
  severity: Severity
  licenseKey?: string
  deviceHash?: string
  ip?: string
  description: string
  metadata?: Record<string, unknown>
  isResolved: boolean
  resolvedAt?: string
  resolvedBy?: string
  createdAt: string
}

export interface ThreatScore {
  score: number
  level: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  factors: string[]
}

// ── Admin Log ─────────────────────────────────────────────
export interface AdminLog {
  id: string
  adminId: string
  adminEmail: string
  adminName: string
  action: AdminAction
  targetId?: string
  targetType?: string
  ip?: string
  userAgent?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  description: string
  createdAt: string
}

// ── Settings ─────────────────────────────────────────────
export interface AppSettings {
  general: {
    appName: string
    appUrl: string
    logoUrl?: string
    supportEmail?: string
    timezone: string
    maintenanceMode: boolean
  }
  security: {
    maxFailedLogins: number
    blockDurationMinutes: number
    sessionTimeoutMinutes: number
    requireTwoFactor: boolean
    ipWhitelist: string[]
    jwtExpiry: string
  }
  notifications: {
    smtpHost?: string
    smtpPort?: number
    smtpUser?: string
    smtpFrom?: string
    discordWebhook?: string
    telegramBotToken?: string
    telegramChatId?: string
    enableEmailAlerts: boolean
    enableDiscordAlerts: boolean
    enableTelegramAlerts: boolean
  }
  licenses: {
    defaultMaxDevices: number
    defaultGracePeriodDays: number
    defaultExpiryDays?: number
    licenseKeyPrefix: string
    autoRenewalReminder: boolean
    reminderDaysBefore: number
  }
  api: {
    rateLimit: number
    rateLimitWindow: number
    enablePublicApi: boolean
    webhookSecret?: string
  }
}

// ── Pagination ─────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  status?: string
  dateFrom?: string
  dateTo?: string
}

// ── WebSocket Events ───────────────────────────────────────
export interface WsActivityEvent {
  type: 'activity'
  data: ActivityLog
}

export interface WsStatsEvent {
  type: 'stats'
  data: {
    onlineDevices: number
    activePlaybacks: number
    requestsPerSec: number
    abuseAlerts: number
  }
}

export interface WsAbuseEvent {
  type: 'abuse'
  data: AbuseAlert
}

export type WsEvent = WsActivityEvent | WsStatsEvent | WsAbuseEvent

// ── API Response ───────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  statusCode?: number
}

// ── Table ──────────────────────────────────────────────────
export interface Column<T> {
  key: keyof T | string
  header: string
  sortable?: boolean
  width?: string
  render?: (value: unknown, row: T) => ReactNode
}

// ── Filter ─────────────────────────────────────────────────
export type FilterOption = {
  label: string
  value: string
  count?: number
}

export type DateRange = {
  from?: Date
  to?: Date
}

// ── Notifications ──────────────────────────────────────────
export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  isRead: boolean
  link?: string
  createdAt: string
}

// ── Dashboard Widgets ──────────────────────────────────────
export interface KpiCard {
  id: string
  title: string
  value: number | string
  change?: number
  changeLabel?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: string
  color: 'indigo' | 'emerald' | 'amber' | 'red' | 'cyan' | 'violet'
  suffix?: string
}
