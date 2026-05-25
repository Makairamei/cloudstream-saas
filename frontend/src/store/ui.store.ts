'use client'

import { create } from 'zustand'
import type { Notification } from '@/types'

interface UIStore {
  sidebarCollapsed: boolean
  commandPaletteOpen: boolean
  notificationPanelOpen: boolean
  notifications: Notification[]
  unreadCount: number
  activePage: string
  theme: 'dark' | 'light'
  realtimeConnected: boolean
  onlineDevices: number
  activePlaybacks: number
  requestsPerSec: number
  pendingAbuseAlerts: number

  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  setCommandPaletteOpen: (open: boolean) => void
  setNotificationPanelOpen: (open: boolean) => void
  addNotification: (n: Notification) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  setActivePage: (page: string) => void
  setRealtimeConnected: (connected: boolean) => void
  updateRealtimeStats: (stats: { onlineDevices?: number; activePlaybacks?: number; requestsPerSec?: number; pendingAbuseAlerts?: number }) => void
}

export const useUIStore = create<UIStore>(set => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  notificationPanelOpen: false,
  notifications: [],
  unreadCount: 0,
  activePage: 'dashboard',
  theme: 'dark',
  realtimeConnected: false,
  onlineDevices: 0,
  activePlaybacks: 0,
  requestsPerSec: 0,
  pendingAbuseAlerts: 0,

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setNotificationPanelOpen: (open) => set({ notificationPanelOpen: open }),

  addNotification: (n) =>
    set(state => ({
      notifications: [n, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + (n.isRead ? 0 : 1),
    })),

  markNotificationRead: (id) =>
    set(state => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllNotificationsRead: () =>
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),

  setActivePage: (page) => set({ activePage: page }),
  setRealtimeConnected: (connected) => set({ realtimeConnected: connected }),

  updateRealtimeStats: (stats) =>
    set(state => ({
      onlineDevices: stats.onlineDevices ?? state.onlineDevices,
      activePlaybacks: stats.activePlaybacks ?? state.activePlaybacks,
      requestsPerSec: stats.requestsPerSec ?? state.requestsPerSec,
      pendingAbuseAlerts: stats.pendingAbuseAlerts ?? state.pendingAbuseAlerts,
    })),
}))
