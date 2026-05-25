'use client'

import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Bell, Command, Wifi, WifiOff, Activity, Zap, ChevronDown, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useUIStore } from '@/store/ui.store'
import { useAuthStore } from '@/store/auth.store'
import { cn, formatNumber, getInitials } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'

export function Header() {
  const { user } = useAuthStore()
  const {
    setCommandPaletteOpen,
    setNotificationPanelOpen,
    unreadCount,
    realtimeConnected,
    onlineDevices,
    activePlaybacks,
    requestsPerSec,
    pendingAbuseAlerts,
  } = useUIStore()

  const [showStats, setShowStats] = useState(false)
  const { theme, setTheme } = useTheme()

  return (
    <header
      className="flex items-center justify-between px-6 h-[60px] flex-shrink-0"
      style={{
        background: 'var(--header-bg)',
        borderBottom: '1px solid var(--header-border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Left — Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-600 hover:text-slate-400 transition-all duration-200 group"
          style={{
            background: 'var(--input-bg)',
            border: '1px solid var(--border-subtle)',
            minWidth: '200px',
          }}
        >
          <Search className="w-3.5 h-3.5 group-hover:text-indigo-400 transition-colors" />
          <span className="flex-1 text-left">Search anything...</span>
          <div className="flex items-center gap-0.5 text-2xs">
            <kbd className="px-1 py-0.5 rounded border border-white/10 text-slate-700 bg-white/[0.03]">⌘</kbd>
            <kbd className="px-1 py-0.5 rounded border border-white/10 text-slate-700 bg-white/[0.03]">K</kbd>
          </div>
        </button>
      </div>

      {/* Center — Realtime stats */}
      <div className="flex items-center gap-1">
        {/* Connection indicator */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}
          onClick={() => setShowStats(!showStats)}
        >
          <div className="relative flex h-2 w-2">
            <span className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75',
              realtimeConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
            )} />
            <span className={cn(
              'relative inline-flex rounded-full h-2 w-2',
              realtimeConnected ? 'bg-emerald-500' : 'bg-amber-500'
            )} />
          </div>
          {realtimeConnected
            ? <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            : <WifiOff className="w-3.5 h-3.5 text-amber-500" />
          }
          <span className="text-xs text-slate-500 hidden sm:block">
            {realtimeConnected ? 'Live' : 'Connecting...'}
          </span>
        </div>

        {/* Live stats chips */}
        <div className="hidden md:flex items-center gap-1">
          <StatChip
            icon={<Activity className="w-3 h-3" />}
            value={formatNumber(onlineDevices)}
            label="online"
            color="emerald"
          />
          <StatChip
            icon={<Zap className="w-3 h-3" />}
            value={`${requestsPerSec}/s`}
            label="req"
            color="indigo"
          />
          {pendingAbuseAlerts > 0 && (
            <StatChip
              icon={<div className="w-2 h-2 rounded-full bg-red-500" />}
              value={String(pendingAbuseAlerts)}
              label="alerts"
              color="red"
            />
          )}
        </div>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="btn-icon"
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark'
            ? <Sun  className="w-4 h-4 text-amber-400" />
            : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <button
          onClick={() => setNotificationPanelOpen(true)}
          className="relative btn-icon"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border border-[#050508]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </button>

        {/* Command palette */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="btn-icon hidden sm:flex"
          aria-label="Command palette"
        >
          <Command className="w-4 h-4" />
        </button>

        {/* User menu */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-white/[0.06]">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {getInitials(user.name)}
            </div>
            <div className="hidden md:block">
              <div className="text-sm font-medium text-slate-300 leading-none">{user.name.split(' ')[0]}</div>
              <div className="text-2xs text-slate-600 mt-0.5">{user.role.replace(/_/g, ' ')}</div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-600 hidden md:block" />
          </div>
        )}
      </div>
    </header>
  )
}

function StatChip({ icon, value, label, color }: {
  icon: ReactNode
  value: string
  label: string
  color: 'emerald' | 'indigo' | 'red' | 'amber'
}) {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  }

  return (
    <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium', colors[color])}>
      {icon}
      <span>{value}</span>
      <span className="opacity-60">{label}</span>
    </div>
  )
}
