'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { api, endpoints } from '@/lib/api'

// ─────────────────────────────────────────────────────────────
// Generic fetch hook with loading/error/refetch states
// ─────────────────────────────────────────────────────────────

interface UseApiOptions<T> {
  fallback?: T
  enabled?: boolean
  refetchInterval?: number
}

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  opts: UseApiOptions<T> = {},
): UseApiResult<T> {
  const { fallback = null, enabled = true, refetchInterval } = opts
  const [data, setData] = useState<T | null>(fallback ?? null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const initialFetchDone = useRef(false)

  const fetchSilent = useCallback(async () => {
    if (!enabled) return
    try {
      const result = await fetcher()
      if (mountedRef.current) { setData(result); setError(null) }
    } catch (e: unknown) {
      if (mountedRef.current) {
        setError((e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? 'Request failed')
        if (fallback !== undefined && data === null) setData(fallback as T)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])

  const fetch = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      if (mountedRef.current) setData(result)
    } catch (e: unknown) {
      if (mountedRef.current) {
        setError((e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? 'Request failed')
        if (fallback !== undefined) setData(fallback as T)
      }
    } finally {
      if (mountedRef.current) { setLoading(false); initialFetchDone.current = true }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])

  useEffect(() => {
    mountedRef.current = true
    initialFetchDone.current = false
    fetch()
    return () => { mountedRef.current = false }
  }, [fetch])

  useEffect(() => {
    if (!refetchInterval) return
    const id = setInterval(() => {
      if (initialFetchDone.current) fetchSilent()
    }, refetchInterval)
    return () => clearInterval(id)
  }, [fetchSilent, refetchInterval])

  return { data, loading, error, refetch: fetch }
}

// ─────────────────────────────────────────────────────────────
// Dashboard stats
// ─────────────────────────────────────────────────────────────

export interface DashboardOverview {
  totalLicenses: number
  activeDevices: number
  pluginsToday: number
  playbacksToday: number
  blockedTotal: number
  licensesChange: number
  devicesChange: number
}

export function useDashboardOverview(opts: UseApiOptions<DashboardOverview> = {}) {
  return useApi<DashboardOverview>(
    () => api.get(endpoints.analytics.overview).then(r => r.data),
    [],
    { refetchInterval: 30_000, ...opts },
  )
}

export function useActivityTrend(days = 1) {
  return useApi<Array<{ time: string; licenses: number; devices: number; playbacks: number }>>(
    () => api.get(`${endpoints.analytics.trend}?days=${days}`).then(r => r.data),
    [days],
    { refetchInterval: 60_000 },
  )
}

export function useHourlyRequests() {
  return useApi<Array<{ hour: string; requests: number; errors: number }>>(
    () => api.get(endpoints.analytics.hourly).then(r => r.data),
    [],
    { refetchInterval: 60_000 },
  )
}

export function useTopPlugins(limit = 5) {
  return useApi<Array<{ id: string; slug: string; name: string; iconUrl: string | null; downloadCount: number; version: string }>>(
    () => api.get(`${endpoints.analytics.plugins}?limit=${limit}`).then(r => r.data),
    [limit],
  )
}

export function useLicenseStats() {
  return useApi<Array<{ status: string; count: number }>>(
    () => api.get(endpoints.analytics.licenseStats).then(r => r.data),
    [],
    { refetchInterval: 30_000 },
  )
}

export function useGeoDistribution() {
  return useApi<Array<{ country: string; count: number; pct: number }>>(
    () => api.get(endpoints.analytics.geo).then(r => r.data),
    [],
    { refetchInterval: 60_000 },
  )
}

// ─────────────────────────────────────────────────────────────
// Live activity feed
// ─────────────────────────────────────────────────────────────

export interface ActivityItem {
  id: string
  type: string
  severity: string
  licenseKey: string
  ip: string | null
  country: string | null
  message: string
  createdAt: string
}

export function useRecentActivity(limit = 20) {
  return useApi<ActivityItem[]>(
    () => api.get(`${endpoints.analytics.activity}?limit=${limit}`).then(r => r.data),
    [limit],
    { refetchInterval: 5_000 },
  )
}

// ─────────────────────────────────────────────────────────────
// Licenses
// ─────────────────────────────────────────────────────────────

export interface LicensePage {
  total: number
  items: LicenseItem[]
  page: number
  limit: number
}

export interface LicenseItem {
  id: string
  key: string
  name: string
  email: string | null
  status: string
  maxDevices: number
  expiresAt: string | null
  createdAt: string
  _count?: { devices: number }
}

export function useLicenses(params: {
  page?: number
  limit?: number
  search?: string
  status?: string
} = {}) {
  return useApi<LicensePage>(
    () => {
      const q = new URLSearchParams()
      if (params.page) q.set('page', String(params.page))
      if (params.limit) q.set('limit', String(params.limit))
      if (params.search) q.set('search', params.search)
      if (params.status) q.set('status', params.status)
      return api.get(`${endpoints.licenses.list}?${q}`).then(r => r.data)
    },
    [params.page, params.limit, params.search, params.status],
  )
}

// ─────────────────────────────────────────────────────────────
// Plugins
// ─────────────────────────────────────────────────────────────

export interface Plugin {
  id: string
  slug: string
  name: string
  description: string | null
  version: string
  iconUrl: string | null
  isEnabled: boolean
  downloadCount: number
  createdAt: string
}

export function usePlugins(search?: string) {
  return useApi<Plugin[]>(
    () => api.get(`${endpoints.plugins.list}${search ? `?search=${encodeURIComponent(search)}` : ''}`).then(r => r.data),
    [search],
  )
}

// ─────────────────────────────────────────────────────────────
// Security stats
// ─────────────────────────────────────────────────────────────

export function useSecurityStats() {
  return useApi<{ openAlerts: number; highSeverity: number; lastWeek: number }>(
    () => api.get(endpoints.analytics.security).then(r => r.data),
    [],
    { refetchInterval: 30_000 },
  )
}
