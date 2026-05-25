'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Key, Monitor, Puzzle, Activity, BarChart3,
  Shield, ScrollText, Settings, Radio, PlaySquare, PlugZap,
  Search, ArrowRight, Hash, X
} from 'lucide-react'
import { useUIStore } from '@/store/ui.store'
import { cn } from '@/lib/utils'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ElementType
  href?: string
  action?: () => void
  group: string
  keywords?: string[]
}

const COMMANDS: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Command center overview', icon: LayoutDashboard, href: '/dashboard', group: 'Navigation', keywords: ['home', 'overview', 'stats'] },
  { id: 'licenses', label: 'Licenses', description: 'Manage license keys', icon: Key, href: '/licenses', group: 'Navigation', keywords: ['keys', 'manage'] },
  { id: 'devices', label: 'Devices', description: 'Track registered devices', icon: Monitor, href: '/devices', group: 'Navigation', keywords: ['hardware', 'fingerprint'] },
  { id: 'plugins', label: 'Plugin Manager', description: 'Manage plugin repository', icon: Puzzle, href: '/plugins', group: 'Navigation', keywords: ['cs3', 'apk', 'repo'] },
  { id: 'live', label: 'Live Activity', description: 'Real-time event stream', icon: Radio, href: '/activity/live', group: 'Navigation', keywords: ['realtime', 'stream', 'websocket'] },
  { id: 'playback', label: 'Playback Logs', description: 'Video playback history', icon: PlaySquare, href: '/activity/playback', group: 'Navigation', keywords: ['video', 'watch', 'play'] },
  { id: 'plugin-usage', label: 'Plugin Usage', description: 'Plugin analytics', icon: PlugZap, href: '/activity/plugins', group: 'Navigation', keywords: ['usage', 'analytics'] },
  { id: 'analytics', label: 'Analytics', description: 'Advanced analytics & reports', icon: BarChart3, href: '/analytics', group: 'Navigation', keywords: ['charts', 'reports', 'metrics'] },
  { id: 'security', label: 'Security Center', description: 'Block IPs, detect abuse', icon: Shield, href: '/security', group: 'Navigation', keywords: ['block', 'abuse', 'threat'] },
  { id: 'admin-logs', label: 'Admin Logs', description: 'Audit trail', icon: ScrollText, href: '/admin-logs', group: 'Navigation', keywords: ['audit', 'log', 'history'] },
  { id: 'settings', label: 'Settings', description: 'System configuration', icon: Settings, href: '/settings', group: 'Navigation', keywords: ['config', 'setup', 'smtp'] },
]

export function CommandPalette() {
  const router = useRouter()
  const { setCommandPaletteOpen } = useUIStore()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filtered = query.length === 0
    ? COMMANDS
    : COMMANDS.filter(cmd => {
        const q = query.toLowerCase()
        return cmd.label.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.keywords?.some(k => k.includes(q))
      })

  const handleSelect = useCallback((item: CommandItem) => {
    if (item.href) router.push(item.href)
    if (item.action) item.action()
    setCommandPaletteOpen(false)
  }, [router, setCommandPaletteOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCommandPaletteOpen(false)
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[selectedIndex]) handleSelect(filtered[selectedIndex])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filtered, selectedIndex, handleSelect, setCommandPaletteOpen])

  const groups = filtered.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {} as Record<string, CommandItem[]>)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setCommandPaletteOpen(false)}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-xl mx-4 rounded-2xl overflow-hidden"
        style={{
          background: '#0c0c18',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.1)',
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07]">
          <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, actions, shortcuts..."
            autoFocus
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-600 hover:text-slate-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="text-2xs px-1.5 py-1 rounded-lg border border-white/10 text-slate-600">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Hash className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-600">No results for &quot;{query}&quot;</p>
            </div>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group} className="px-2 mb-2">
                <div className="px-3 py-1.5 text-2xs font-medium text-slate-600 uppercase tracking-wider">
                  {group}
                </div>
                {items.map((item, idx) => {
                  const globalIdx = filtered.indexOf(item)
                  const Icon = item.icon
                  const isSelected = globalIdx === selectedIndex
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-100 text-left group',
                        isSelected
                          ? 'bg-indigo-500/10 border border-indigo-500/20'
                          : 'hover:bg-white/[0.04]'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                        isSelected
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'bg-white/[0.05] text-slate-500 group-hover:text-slate-300'
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn('text-sm font-medium', isSelected ? 'text-indigo-300' : 'text-slate-300')}>
                          {item.label}
                        </div>
                        {item.description && (
                          <div className="text-2xs text-slate-600 truncate">{item.description}</div>
                        )}
                      </div>
                      {isSelected && <ArrowRight className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2.5 border-t border-white/[0.05] flex items-center gap-4 text-2xs text-slate-700">
          <span className="flex items-center gap-1"><kbd className="border border-white/10 rounded px-1">↑</kbd><kbd className="border border-white/10 rounded px-1">↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="border border-white/10 rounded px-1">↵</kbd> select</span>
          <span className="flex items-center gap-1"><kbd className="border border-white/10 rounded px-1">ESC</kbd> close</span>
        </div>
      </motion.div>
    </div>
  )
}
