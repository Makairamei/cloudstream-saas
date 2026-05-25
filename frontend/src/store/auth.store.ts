'use client'

import { create, type StateCreator } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, LoginDto, LoginResponse } from '@/types'
import { api, endpoints } from '@/lib/api'

const IS_DEV = process.env.NODE_ENV === 'development'

const DEV_USER: User = {
  id: 'dev-admin-001',
  email: 'admin@cloudstream.app',
  name: 'Super Admin',
  role: 'SUPER_ADMIN',
  twoFactorEnabled: false,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
}

interface AuthStore {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  _hasHydrated: boolean
  error: string | null

  login: (dto: LoginDto) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
  updateUser: (user: Partial<User>) => void
  clearError: () => void
  setLoading: (loading: boolean) => void
  setHasHydrated: (v: boolean) => void
  resetAuth: () => void
}

const storeImpl: StateCreator<AuthStore> = (set, get) => ({
  user: IS_DEV ? DEV_USER : null,
  accessToken: IS_DEV ? 'dev-access-token' : null,
  refreshToken: IS_DEV ? 'dev-refresh-token' : null,
  isAuthenticated: IS_DEV,
  isLoading: !IS_DEV,
  _hasHydrated: IS_DEV,
  error: null,

  login: async (dto: LoginDto) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<LoginResponse>(endpoints.auth.login, dto)
      const { user, accessToken, refreshToken } = response.data
      localStorage.setItem('cs_access_token', accessToken)
      localStorage.setItem('cs_refresh_token', refreshToken)
      set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false })
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed'
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  logout: async () => {
    if (!IS_DEV) {
      try { await api.post(endpoints.auth.logout) } catch { /* ignore */ }
      localStorage.removeItem('cs_access_token')
      localStorage.removeItem('cs_refresh_token')
    }
    set({ user: IS_DEV ? DEV_USER : null, accessToken: null, refreshToken: null, isAuthenticated: IS_DEV })
    if (!IS_DEV) window.location.href = '/login'
  },

  refreshAuth: async () => {
    if (IS_DEV) return
    const refreshToken = get().refreshToken
    if (!refreshToken) return
    try {
      const response = await api.post<{ accessToken: string; user: User }>(endpoints.auth.refresh, { refreshToken })
      const { accessToken, user } = response.data
      localStorage.setItem('cs_access_token', accessToken)
      set({ accessToken, user, isAuthenticated: true })
    } catch {
      get().logout()
    }
  },

  updateUser: (updates: Partial<User>) => {
    set({ user: get().user ? { ...get().user!, ...updates } : null })
  },

  clearError: () => set({ error: null }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setHasHydrated: (v: boolean) => set({ _hasHydrated: v, isLoading: false }),
  resetAuth: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cs_access_token')
      localStorage.removeItem('cs_refresh_token')
      localStorage.removeItem('cs-auth-storage')
    }
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false })
  },
})

export const useAuthStore = IS_DEV
  ? create<AuthStore>()(storeImpl)
  : create<AuthStore>()(
      persist(storeImpl, {
        name: 'cs-auth-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: state => ({
          user: state.user,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.setHasHydrated(true)
          } else {
            useAuthStore.getState().setHasHydrated(true)
          }
        },
      })
    )
