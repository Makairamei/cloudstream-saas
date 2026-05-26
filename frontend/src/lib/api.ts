import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse } from '@/types'

function clearAllAuth() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('cs_access_token')
  localStorage.removeItem('cs_refresh_token')
  localStorage.removeItem('cs-auth-storage')
}

const RAW_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
const BASE_URL = `${RAW_URL}/api/v1`

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: true,
})

// â”€â”€ Token helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('cs_access_token')
}

function setAccessToken(token: string): void {
  localStorage.setItem('cs_access_token', token)
}

function clearTokens(): void {
  localStorage.removeItem('cs_access_token')
  localStorage.removeItem('cs_refresh_token')
}

// â”€â”€ Request interceptor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// â”€â”€ Response interceptor (refresh token) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let isRefreshing = false
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        }).then(token => {
          if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('cs_refresh_token') : null

      if (!refreshToken) {
        clearAllAuth()
        if (typeof window !== 'undefined') window.location.replace('/login')
        return Promise.reject(error)
      }

      try {
        const response = await axios.post<{ accessToken: string }>(`${BASE_URL}/auth/refresh`, { refreshToken })
        const newToken = response.data?.accessToken
        if (newToken) {
          setAccessToken(newToken)
          refreshQueue.forEach(({ resolve }) => resolve(newToken))
          refreshQueue = []
          if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${newToken}`
        }
        return api(originalRequest)
      } catch (refreshError) {
        refreshQueue.forEach(({ reject }) => reject(refreshError))
        refreshQueue = []
        clearAllAuth()
        if (typeof window !== 'undefined') window.location.replace('/login')
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// â”€â”€ API helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await api.get<T>(url, { params })
  return response.data
}

export async function apiPost<T>(url: string, data?: unknown): Promise<T> {
  const response = await api.post<T>(url, data)
  return response.data
}

export async function apiPut<T>(url: string, data?: unknown): Promise<T> {
  const response = await api.put<T>(url, data)
  return response.data
}

export async function apiPatch<T>(url: string, data?: unknown): Promise<T> {
  const response = await api.patch<T>(url, data)
  return response.data
}

export async function apiDelete<T>(url: string): Promise<T> {
  const response = await api.delete<T>(url)
  return response.data
}

// â”€â”€ API Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const endpoints = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
    updateProfile: '/auth/me/profile',
    changePassword: '/auth/me/password',
    sessions: '/auth/sessions',
    revokeSession: (id: string) => `/auth/sessions/${id}`,
  },
  licenses: {
    list: '/licenses',
    create: '/licenses',
    bulkCreate: '/licenses/bulk',
    detail: (id: string) => `/licenses/${id}`,
    update: (id: string) => `/licenses/${id}`,
    delete: (id: string) => `/licenses/${id}`,
    restore: (id: string) => `/licenses/${id}/restore`,
    revoke: (id: string) => `/licenses/${id}/revoke`,
    activate: (id: string) => `/licenses/${id}/activate`,
    export: '/licenses/export',
    stats: '/licenses/stats',
  },
  devices: {
    list: '/devices',
    detail: (id: string) => `/devices/${id}`,
    block: (id: string) => `/devices/${id}/block`,
    unblock: (id: string) => `/devices/${id}/unblock`,
    bulk: '/devices/bulk',
    stats: '/devices/stats',
  },
  plugins: {
    list: '/plugins',
    create: '/plugins',
    detail: (id: string) => `/plugins/${id}`,
    update: (id: string) => `/plugins/${id}`,
    delete: (id: string) => `/plugins/${id}`,
    upload: '/plugins/upload',
    versions: (id: string) => `/plugins/${id}/versions`,
    rollback: (id: string, version: string) => `/plugins/${id}/rollback/${version}`,
    stats: '/plugins/stats',
  },
  activity: {
    logs: '/activity/logs',
    playback: '/activity/playback',
    pluginUsage: '/activity/plugins',
    export: '/activity/export',
  },
  analytics: {
    overview:       '/analytics/overview',
    licenseStats:   '/analytics/licenses',
    trend:          '/analytics/trend',
    plugins:        '/analytics/plugins',
    hourly:         '/analytics/hourly',
    geo:            '/analytics/geo',
    activity:       '/analytics/activity',
    security:       '/analytics/security',
  },
  security: {
    blockedIps: '/security/blocked-ips',
    blockIp: '/security/block-ip',
    unblockIp: (id: string) => `/security/blocked-ips/${id}`,
    blockedDevices: '/security/blocked-devices',
    abuseAlerts: '/security/abuse-alerts',
    resolveAbuse: (id: string) => `/security/abuse-alerts/${id}/resolve`,
    threatScore: '/security/threat-score',
  },
  adminLogs: {
    list: '/admin-logs',
    detail: (id: string) => `/admin-logs/${id}`,
  },
  settings: {
    get: '/settings',
    update: '/settings',
    uploadLogo: '/settings/logo',
    testSmtp: '/settings/test-smtp',
    testWebhook: '/settings/test-webhook',
    apiKeys: '/settings/api-keys',
    revokeApiKey: (id: string) => `/settings/api-keys/${id}`,
  },
  dashboard: {
    overview: '/dashboard/overview',
    recentActivity: '/dashboard/recent-activity',
    topPlugins: '/dashboard/top-plugins',
    systemHealth: '/dashboard/system-health',
  },
  notifications: {
    list: '/notifications',
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
  },
}
