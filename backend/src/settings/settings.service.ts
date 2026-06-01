import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

const DEFAULTS: Record<string, any> = {
  default_max_devices: 2,
  default_duration_days: 30,
  default_grace_period_days: 7,
  default_trial_days: 7,
  license_key_prefix: 'CS-PROD',
  app_name: 'CloudStream SaaS',
  auto_block_enabled: true,
  trust_score_threshold: 40,
  maintenance_mode: false,
  timezone: 'Asia/Jakarta',
  max_failed_attempts: 5,
  burst_threshold: 100,
  burst_window_secs: 30,
  ip_rotation_limit: 10,
  vpn_block_enabled: false,
  auto_revoke_on_abuse: true,
  require_device_fingerprint: true,
  abuse_alert_email: '',
  daily_report_enabled: true,
  critical_alert_enabled: true,
  expiry_warning_days: 7,
  log_retention_days: 30,
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get(key: string) {
    const row = await this.prisma.setting.findUnique({ where: { key } })
    if (row) return { key, value: row.value }
    if (key in DEFAULTS) return { key, value: DEFAULTS[key], isDefault: true }
    return null
  }

  async getAll() {
    const rows = await this.prisma.setting.findMany()
    const map: Record<string, any> = { ...DEFAULTS }
    for (const r of rows) map[r.key] = r.value
    return map
  }

  async set(key: string, value: any) {
    return this.prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })
  }

  // Typed helper used by other services
  async getValue<T = any>(key: string, fallback: T): Promise<T> {
    try {
      const row = await this.prisma.setting.findUnique({ where: { key } })
      if (row && row.value !== null && row.value !== undefined) return row.value as T
      if (key in DEFAULTS) return DEFAULTS[key] as T
    } catch { /* ignore */ }
    return fallback
  }
}