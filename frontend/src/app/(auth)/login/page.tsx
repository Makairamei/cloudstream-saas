'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Shield, Zap, Lock, AlertCircle, ArrowRight, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  duration: Math.random() * 8 + 6,
  delay: Math.random() * 4,
}))

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, isAuthenticated, _hasHydrated, error, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (_hasHydrated && isAuthenticated) router.replace('/dashboard')
  }, [isAuthenticated, _hasHydrated, router])

  useEffect(() => {
    if (error) {
      toast.error(error, { id: 'login-error' })
      clearError()
    }
  }, [error, clearError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }
    try {
      await login({ email, password, rememberMe, twoFactorCode: showTwoFactor ? twoFactorCode : undefined })
      toast.success('Welcome back!')
      router.replace('/dashboard')
    } catch {
      // Error handled in store
    }
  }

  if (!isMounted) return null

  return (
    <div className="relative min-h-dvh flex items-center justify-center overflow-hidden bg-slate-50">
      {/* Subtle background pattern */}
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(99,102,241,0.08) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

      {/* Main login card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md px-4"
      >
        {/* Brand header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
              }}>
                <Zap className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-50">
                <div className="w-full h-full rounded-full bg-emerald-400 animate-ping opacity-75" />
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">CloudStream Admin</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your control panel</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
        >
          <div className="p-8">
            <AnimatePresence mode="wait">
              {!showTwoFactor ? (
                <motion.form
                  key="login-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="admin@cloudstream.app"
                        autoComplete="email"
                        autoFocus
                        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                        disabled={isLoading}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Shield className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Password
                      </label>
                      <button type="button" className="text-xs text-indigo-500 hover:text-indigo-600 transition-colors" tabIndex={-1}>
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        autoComplete="current-password"
                        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember me */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setRememberMe(!rememberMe)}
                      className={cn(
                        'w-4 h-4 rounded border-2 transition-all duration-200 flex items-center justify-center flex-shrink-0',
                        rememberMe ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 bg-white'
                      )}
                    >
                      {rememberMe && (
                        <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5 3.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </motion.svg>
                      )}
                    </button>
                    <span className="text-sm text-slate-600 select-none cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                      Remember me for 30 days
                    </span>
                  </div>

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={isLoading || !email || !password}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all',
                      'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600',
                      'shadow-lg shadow-indigo-500/25',
                      (isLoading || !email || !password) && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Authenticating...</span></>
                    ) : (
                      <><Lock className="w-4 h-4" /><span>Sign In</span><ArrowRight className="w-4 h-4 ml-auto" /></>
                    )}
                  </motion.button>

                  <div className="text-center">
                    <button type="button" onClick={() => setShowTwoFactor(true)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                      Use Two-Factor Authentication instead
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div
                  key="2fa-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-3">
                      <Shield className="w-6 h-6 text-indigo-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">Two-Factor Auth</h3>
                    <p className="text-sm text-slate-500 mt-1">Enter your 6-digit authenticator code</p>
                  </div>

                  <div className="flex gap-2 justify-center">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <input
                        key={i}
                        type="text"
                        maxLength={1}
                        className="w-10 h-12 text-center text-lg font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        value={twoFactorCode[i] || ''}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '')
                          const newCode = twoFactorCode.split('')
                          newCode[i] = val
                          setTwoFactorCode(newCode.join('').slice(0, 6))
                          if (val && i < 5) {
                            const next = document.querySelectorAll<HTMLInputElement>('input[type="text"]')[i + 1]
                            next?.focus()
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Backspace' && !twoFactorCode[i] && i > 0) {
                            const prev = document.querySelectorAll<HTMLInputElement>('input[type="text"]')[i - 1]
                            prev?.focus()
                          }
                        }}
                      />
                    ))}
                  </div>

                  <motion.button
                    type="button"
                    onClick={handleSubmit}
                    disabled={twoFactorCode.length !== 6 || isLoading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25',
                      (twoFactorCode.length !== 6 || isLoading) && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                    Verify & Sign In
                  </motion.button>

                  <button type="button" onClick={() => { setShowTwoFactor(false); setTwoFactorCode('') }} className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors py-1">
                    ← Back to password login
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.4 }} className="mt-6 text-center space-y-3">
          <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Systems operational
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              256-bit encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              SOC2 compliant
            </span>
          </div>
          <p className="text-xs text-slate-400">CloudStream SaaS v2.0 · Enterprise Edition</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.4 }} className="mt-4 flex items-center gap-2 justify-center flex-wrap">
          {(['Super Admin', 'Admin', 'Moderator', 'Reseller', 'Analyst'] as const).map((role, i) => (
            <span key={role} className="text-xs text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 bg-white">
              {role}
            </span>
          ))}
        </motion.div>
      </motion.div>

      <div className="absolute bottom-4 left-4 text-xs text-slate-400 flex items-center gap-2">
        <AlertCircle className="w-3 h-3" />
        <span>Unauthorized access is strictly prohibited</span>
      </div>
    </div>
  )
}
