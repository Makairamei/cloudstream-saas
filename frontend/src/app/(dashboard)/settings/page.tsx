'use client'

import { useState, type ElementType, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Settings, Save, RotateCcw, Shield, Bell, Key, Database,
  Globe, Clock, AlertTriangle, Lock, Webhook, Mail, Server
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type SettingSection = 'general' | 'security' | 'notifications' | 'api' | 'webhooks'

const SECTIONS: { key: SettingSection; label: string; icon: ElementType; desc: string }[] = [
  { key: 'general', label: 'General', icon: Settings, desc: 'License defaults, system config' },
  { key: 'security', label: 'Security', icon: Shield, desc: 'Abuse thresholds, IP policies' },
  { key: 'notifications', label: 'Notifications', icon: Bell, desc: 'Email alerts and triggers' },
  { key: 'api', label: 'API Keys', icon: Key, desc: 'Manage API access tokens' },
  { key: 'webhooks', label: 'Webhooks', icon: Webhook, desc: 'Event delivery endpoints' },
]

export default function SettingsPage() {
  const [section, setSection] = useState<SettingSection>('general')
  const [isDirty, setIsDirty] = useState(false)

  const [general, setGeneral] = useState({
    defaultMaxDevices: 3,
    defaultTrialDays: 7,
    licenseKeyPrefix: 'CS-PROD',
    autoBlockEnabled: true,
    trustScoreThreshold: 40,
    maintenanceMode: false,
    timezone: 'Asia/Jakarta',
  })

  const [security, setSecurity] = useState({
    maxFailedAttempts: 5,
    burstThreshold: 100,
    burstWindowSecs: 30,
    vpnBlockEnabled: false,
    ipRotationLimit: 10,
    autoRevokeOnAbuse: true,
    requireDeviceFingerprint: true,
  })

  const [notifications, setNotifications] = useState({
    abuseAlertEmail: 'admin@cloudstream.app',
    dailyReportEnabled: true,
    criticalAlertEnabled: true,
    expiryWarningDays: 7,
    smtpHost: 'smtp.resend.com',
    smtpPort: 465,
    emailFrom: 'noreply@cloudstream.app',
  })

  const handleSave = () => {
    toast.success('Settings saved successfully')
    setIsDirty(false)
  }

  const mark = () => setIsDirty(true)

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">System Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure license system behavior and security policies</p>
        </div>
        {isDirty && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
            <button onClick={() => setIsDirty(false)} className="btn-ghost btn-sm flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />Discard
            </button>
            <button onClick={handleSave} className="btn-primary btn-sm flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" />Save Changes
            </button>
          </motion.div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar nav */}
        <div className="flex-shrink-0 lg:w-56">
          <div className="space-y-1">
            {SECTIONS.map(s => (
              <button key={s.key} onClick={() => setSection(s.key)}
                className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 text-left',
                  section === s.key ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]')}>
                <s.icon className="w-4 h-4 flex-shrink-0" />
                <div>
                  <div className="font-medium leading-tight">{s.label}</div>
                  <div className="text-2xs opacity-60 mt-0.5 hidden lg:block">{s.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

            {section === 'general' && (
              <div className="space-y-5">
                <SectionCard title="License Defaults" icon={Key}>
                  <FieldRow label="Default Max Devices" desc="Number of devices per license">
                    <input type="number" value={general.defaultMaxDevices} onChange={e => { setGeneral(p => ({ ...p, defaultMaxDevices: +e.target.value })); mark() }} className="input w-24 text-center" min={1} max={10} />
                  </FieldRow>
                  <FieldRow label="Trial Duration (days)" desc="Days given for trial licenses">
                    <input type="number" value={general.defaultTrialDays} onChange={e => { setGeneral(p => ({ ...p, defaultTrialDays: +e.target.value })); mark() }} className="input w-24 text-center" min={1} max={90} />
                  </FieldRow>
                  <FieldRow label="License Key Prefix" desc="Prefix used in generated keys">
                    <input type="text" value={general.licenseKeyPrefix} onChange={e => { setGeneral(p => ({ ...p, licenseKeyPrefix: e.target.value })); mark() }} className="input w-32" />
                  </FieldRow>
                </SectionCard>

                <SectionCard title="System" icon={Server}>
                  <FieldRow label="Timezone" desc="Server-side time reference">
                    <select value={general.timezone} onChange={e => { setGeneral(p => ({ ...p, timezone: e.target.value })); mark() }} className="input w-48">
                      <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                      <option value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </FieldRow>
                  <FieldRow label="Auto-Block Abusers" desc="Automatically block flagged IPs">
                    <Toggle value={general.autoBlockEnabled} onChange={v => { setGeneral(p => ({ ...p, autoBlockEnabled: v })); mark() }} />
                  </FieldRow>
                  <FieldRow label="Maintenance Mode" desc="Puts API in read-only mode">
                    <Toggle value={general.maintenanceMode} onChange={v => { setGeneral(p => ({ ...p, maintenanceMode: v })); mark() }} danger />
                  </FieldRow>
                </SectionCard>
              </div>
            )}

            {section === 'security' && (
              <div className="space-y-5">
                <SectionCard title="Abuse Detection" icon={Shield}>
                  <FieldRow label="Max Failed Attempts" desc="Triggers auto-block">
                    <input type="number" value={security.maxFailedAttempts} onChange={e => { setSecurity(p => ({ ...p, maxFailedAttempts: +e.target.value })); mark() }} className="input w-24 text-center" />
                  </FieldRow>
                  <FieldRow label="Burst Threshold" desc="Max requests in burst window">
                    <input type="number" value={security.burstThreshold} onChange={e => { setSecurity(p => ({ ...p, burstThreshold: +e.target.value })); mark() }} className="input w-24 text-center" />
                  </FieldRow>
                  <FieldRow label="Burst Window (seconds)" desc="Time window for burst check">
                    <input type="number" value={security.burstWindowSecs} onChange={e => { setSecurity(p => ({ ...p, burstWindowSecs: +e.target.value })); mark() }} className="input w-24 text-center" />
                  </FieldRow>
                  <FieldRow label="IP Rotation Limit" desc="Unique IPs per license per hour">
                    <input type="number" value={security.ipRotationLimit} onChange={e => { setSecurity(p => ({ ...p, ipRotationLimit: +e.target.value })); mark() }} className="input w-24 text-center" />
                  </FieldRow>
                </SectionCard>

                <SectionCard title="Policies" icon={Lock}>
                  <FieldRow label="Block VPN / Proxy" desc="Reject requests from known VPN IPs">
                    <Toggle value={security.vpnBlockEnabled} onChange={v => { setSecurity(p => ({ ...p, vpnBlockEnabled: v })); mark() }} />
                  </FieldRow>
                  <FieldRow label="Auto-Revoke on Abuse" desc="Revoke license on confirmed abuse">
                    <Toggle value={security.autoRevokeOnAbuse} onChange={v => { setSecurity(p => ({ ...p, autoRevokeOnAbuse: v })); mark() }} />
                  </FieldRow>
                  <FieldRow label="Require Device Fingerprint" desc="All verifications must include fingerprint">
                    <Toggle value={security.requireDeviceFingerprint} onChange={v => { setSecurity(p => ({ ...p, requireDeviceFingerprint: v })); mark() }} />
                  </FieldRow>
                </SectionCard>
              </div>
            )}

            {section === 'notifications' && (
              <div className="space-y-5">
                <SectionCard title="Email Alerts" icon={Mail}>
                  <FieldRow label="Alert Recipient" desc="Email for abuse/critical alerts">
                    <input type="email" value={notifications.abuseAlertEmail} onChange={e => { setNotifications(p => ({ ...p, abuseAlertEmail: e.target.value })); mark() }} className="input w-64" />
                  </FieldRow>
                  <FieldRow label="Daily Report" desc="Receive daily summary email">
                    <Toggle value={notifications.dailyReportEnabled} onChange={v => { setNotifications(p => ({ ...p, dailyReportEnabled: v })); mark() }} />
                  </FieldRow>
                  <FieldRow label="Critical Alerts" desc="Immediate email on CRITICAL events">
                    <Toggle value={notifications.criticalAlertEnabled} onChange={v => { setNotifications(p => ({ ...p, criticalAlertEnabled: v })); mark() }} />
                  </FieldRow>
                  <FieldRow label="Expiry Warning (days)" desc="Days before expiry to send warning">
                    <input type="number" value={notifications.expiryWarningDays} onChange={e => { setNotifications(p => ({ ...p, expiryWarningDays: +e.target.value })); mark() }} className="input w-24 text-center" />
                  </FieldRow>
                </SectionCard>

                <SectionCard title="SMTP Configuration" icon={Server}>
                  <FieldRow label="SMTP Host"><input type="text" value={notifications.smtpHost} onChange={e => { setNotifications(p => ({ ...p, smtpHost: e.target.value })); mark() }} className="input w-64" /></FieldRow>
                  <FieldRow label="SMTP Port"><input type="number" value={notifications.smtpPort} onChange={e => { setNotifications(p => ({ ...p, smtpPort: +e.target.value })); mark() }} className="input w-24 text-center" /></FieldRow>
                  <FieldRow label="From Address"><input type="email" value={notifications.emailFrom} onChange={e => { setNotifications(p => ({ ...p, emailFrom: e.target.value })); mark() }} className="input w-64" /></FieldRow>
                </SectionCard>
              </div>
            )}

            {(section === 'api' || section === 'webhooks') && (
              <div className="card p-10 text-center">
                <Key className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">{section === 'api' ? 'API Key Management' : 'Webhook Configuration'}</p>
                <p className="text-sm text-slate-600 mt-1">Connect to backend API to manage {section === 'api' ? 'API keys' : 'webhooks'}</p>
              </div>
            )}

          </motion.div>
        </div>
      </div>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: ElementType; children: ReactNode }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.05]">
        <Icon className="w-4 h-4 text-slate-500" />
        <h3 className="font-semibold text-slate-300 text-sm">{title}</h3>
      </div>
      <div className="divide-y divide-white/[0.04]">{children}</div>
    </div>
  )
}

function FieldRow({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div>
        <div className="text-sm font-medium text-slate-300">{label}</div>
        {desc && <div className="text-2xs text-slate-600 mt-0.5">{desc}</div>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ value, onChange, danger = false }: { value: boolean; onChange: (v: boolean) => void; danger?: boolean }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        'relative w-10 h-5.5 rounded-full transition-all duration-200',
        value ? (danger ? 'bg-red-500' : 'bg-indigo-500') : 'bg-white/[0.1]'
      )}
    >
      <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200', value ? 'left-[22px]' : 'left-0.5')} />
    </button>
  )
}
