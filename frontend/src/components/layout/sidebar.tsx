'use client'

import { useState, type ElementType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Key, Monitor, Puzzle, Activity, BarChart3,
  Shield, ScrollText, Settings, ChevronDown, ChevronRight,
  Zap, LogOut, User, Radio, PlaySquare, PlugZap, Bell,
  ChevronLeft, Command, AlertTriangle
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useUIStore } from '@/store/ui.store'
import { cn, getInitials } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: ElementType
  badge?: string | number
  badgeColor?: string
  children?: NavItem[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Licenses', href: '/licenses', icon: Key },
  { label: 'Devices', href: '/devices', icon: Monitor },
  { label: 'Plugins', href: '/plugins', icon: Puzzle },
  {
    label: 'Activity',
    href: '/activity',
    icon: Activity,
    children: [
      { label: 'Live Stream', href: '/activity/live', icon: Radio },
      { label: 'Playback Logs', href: '/activity/playback', icon: PlaySquare },
      { label: 'Plugin Usage', href: '/activity/plugins', icon: PlugZap },
    ],
  },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Security', href: '/security', icon: Shield },
  { label: 'Admin Logs', href: '/admin-logs', icon: ScrollText },
  { label: 'Settings', href: '/settings', icon: Settings },
]

interface NavLinkProps {
  item: NavItem
  collapsed: boolean
  depth?: number
}

function NavLinkItem({ item, collapsed, depth = 0 }: NavLinkProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(() => item.children?.some(c => pathname.startsWith(c.href)) ?? false)

  const isActive = item.children
    ? item.children.some(c => pathname.startsWith(c.href))
    : pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

  const Icon = item.icon

  if (item.children && !collapsed) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'nav-link w-full',
            isActive && 'nav-link active',
            depth > 0 && 'pl-8'
          )}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden ml-4 mt-0.5 border-l border-white/[0.05]"
            >
              <div className="pl-3 space-y-0.5 py-1">
                {item.children.map(child => (
                  <NavLinkItem key={child.href} item={child} collapsed={false} depth={depth + 1} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'nav-link group',
        isActive && 'nav-link active',
        collapsed && 'justify-center px-2',
        depth > 0 && !collapsed && 'text-xs py-2'
      )}
      title={collapsed ? item.label : undefined}
    >
      <div className="relative flex-shrink-0">
        <Icon className={cn('w-4 h-4', depth > 0 && 'w-3.5 h-3.5')} />
        {item.badge && (
          <span className={cn(
            'absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full text-[9px] font-bold flex items-center justify-center',
            item.badgeColor || 'bg-red-500 text-white'
          )}>
            {typeof item.badge === 'number' && item.badge > 9 ? '9+' : item.badge}
          </span>
        )}
      </div>
      {!collapsed && (
        <span className="flex-1">{item.label}</span>
      )}
      {!collapsed && item.badge && (
        <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', item.badgeColor || 'badge-red')}>
          {item.badge}
        </span>
      )}
    </Link>
  )
}

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar, setCommandPaletteOpen, pendingAbuseAlerts, realtimeConnected } = useUIStore()

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 60 : 256 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col h-full overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.015)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center gap-3 px-4 h-[60px] border-b border-white/[0.06] flex-shrink-0',
        sidebarCollapsed && 'justify-center'
      )}>
        <div className="relative flex-shrink-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 0 20px rgba(99,102,241,0.35)',
            }}
          >
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div className={cn(
            'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#050508]',
            realtimeConnected ? 'bg-emerald-500' : 'bg-amber-500'
          )} />
        </div>

        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-w-0"
            >
              <div className="text-sm font-semibold text-slate-100 truncate">CloudStream</div>
              <div className="text-2xs text-slate-600 truncate">Admin Panel v2</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Command palette trigger */}
      {!sidebarCollapsed && (
        <div className="px-3 py-3 border-b border-white/[0.04]">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-600 hover:text-slate-400 transition-colors"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Command className="w-3.5 h-3.5" />
            <span className="flex-1 text-left text-xs">Quick navigate...</span>
            <span className="text-2xs border border-white/10 rounded px-1 py-0.5 text-slate-700">⌘K</span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-none py-2 px-2 space-y-0.5">
        {pendingAbuseAlerts > 0 && !sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-1 mb-2 px-3 py-2 rounded-xl flex items-center gap-2 text-xs"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span className="text-red-400 font-medium">{pendingAbuseAlerts} abuse alert{pendingAbuseAlerts > 1 ? 's' : ''}</span>
          </motion.div>
        )}

        {NAV_ITEMS.map(item => (
          <NavLinkItem key={item.href} item={item} collapsed={sidebarCollapsed} />
        ))}
      </nav>

      {/* User profile footer */}
      <div className={cn(
        'flex-shrink-0 border-t border-white/[0.06] p-3',
        sidebarCollapsed ? 'flex flex-col items-center gap-2' : 'space-y-2'
      )}>
        {!sidebarCollapsed && user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 px-2 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.025)' }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {getInitials(user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-200 truncate">{user.name}</div>
              <div className="text-2xs text-slate-600 truncate">{user.role.replace('_', ' ')}</div>
            </div>
            <Link href="/settings" className="text-slate-600 hover:text-slate-300 transition-colors">
              <User className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        )}

        <div className={cn('flex gap-1', sidebarCollapsed && 'flex-col')}>
          <button
            onClick={toggleSidebar}
            className="btn-icon flex-1 flex items-center justify-center gap-1.5 text-xs"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <motion.div animate={{ rotate: sidebarCollapsed ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronLeft className="w-4 h-4" />
            </motion.div>
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>

          <button
            onClick={() => logout()}
            className="btn-icon text-red-500/60 hover:text-red-400 hover:bg-red-500/10"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.aside>
  )
}
