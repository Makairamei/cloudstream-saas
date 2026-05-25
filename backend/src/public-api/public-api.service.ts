import { Injectable, Logger, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { AppGateway } from '../websocket/app.gateway'
import { REDIS_CLIENT } from '../redis/redis.module'
import Redis from 'ioredis'
import * as crypto from 'crypto'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface VerifyResult {
  ok: boolean
  daysLeft?: number
  expiresAt?: string | null
  reason?: string
  message?: string
}

export interface PluginEntry {
  internalName: string
  name: string
  description: string
  authors: string[]
  url: string
  version: number
  iconUrl: string | null
  language: string
  tvTypes: string[]
  status: number
  apiVersion: number
  repositoryUrl: string
  fileSize: number
}

// ─────────────────────────────────────────────────────────────
// Error messages (Indonesian, matches old server)
// ─────────────────────────────────────────────────────────────

const ERR_MESSAGES: Record<string, string> = {
  LICENSE_NOT_FOUND: 'Lisensi tidak ditemukan',
  REVOKED:           'Lisensi telah dicabut oleh admin',
  SUSPENDED:         'Lisensi ditangguhkan',
  EXPIRED:           'Lisensi telah kadaluarsa',
  EXPIRING_SOON:     'Lisensi segera kadaluarsa',
  DEVICE_LIMIT:      'Batas perangkat maksimal tercapai',
  DEVICE_BLOCKED:    'Perangkat ini diblokir',
  IP_BLOCKED:        'IP ini diblokir',
  NO_KEY:            'Lisensi tidak ditemukan di plugin.',
  INVALID_DEVICE:    'Device ID tidak valid.',
}

@Injectable()
export class PublicApiService {
  private readonly logger = new Logger(PublicApiService.name)

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private gateway: AppGateway,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  // ──────────────────────────────────────────────────────────
  // Internal helpers
  // ──────────────────────────────────────────────────────────

  private deviceHash(fingerprint: string, licenseId: string): string {
    return crypto.createHash('sha256').update(`${fingerprint}:${licenseId}`).digest('hex')
  }

  private safeDecodePlugin(raw: string | undefined): string {
    if (!raw) return ''
    let decoded = raw
    try { decoded = decodeURIComponent(raw.trim()) } catch { decoded = raw.trim() }
    return decoded.replace(/[^\x00-\x7F]/g, '').trim().substring(0, 200)
  }

  private extractDeviceModel(ua: string): string {
    if (/Windows NT|Macintosh/i.test(ua) && !/Android/i.test(ua)) return 'Android Device'
    if (/CloudStreamApp/i.test(ua)) return 'Android Device'
    const m = ua.match(/Android\s[\d.]+;\s([^)]+?)\s+Build\//i)
    if (m && m[1]) return m[1].trim().substring(0, 100)
    const m2 = ua.match(/\(Linux;[^)]*Android\s[\d.]+;\s*([^;)]+)[^)]*\)/i)
    if (m2 && m2[1]) {
      const model = m2[1].trim()
      if (model && !['android', 'u'].includes(model.toLowerCase())) return model.substring(0, 100)
    }
    return 'Android Device'
  }

  private calcDaysLeft(expiresAt: Date | null): number {
    if (!expiresAt) return 9999
    return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000))
  }

  private async isIpBlocked(ip: string): Promise<boolean> {
    const blocked = await this.prisma.blockedIp.findFirst({
      where: {
        ip,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
    })
    return !!blocked
  }

  private async isDeviceBlocked(hash: string): Promise<boolean> {
    const blocked = await this.prisma.blockedDevice.findFirst({ where: { hash } })
    return !!blocked
  }

  private async logActivity(data: {
    type: string
    severity?: string
    licenseId?: string
    deviceId?: string
    licenseKey: string
    ip?: string
    country?: string
    message: string
    metadata?: any
  }) {
    try {
      const log = await this.prisma.activityLog.create({
        data: {
          type: data.type as any,
          severity: (data.severity ?? 'LOW') as any,
          licenseId: data.licenseId,
          deviceId: data.deviceId,
          licenseKey: data.licenseKey,
          ip: data.ip,
          message: data.message,
          metadata: data.metadata,
        },
      })
      this.gateway.emitActivity({
        id: log.id,
        type: log.type,
        severity: log.severity,
        licenseKey: log.licenseKey,
        message: log.message,
        ip: log.ip,
        createdAt: log.createdAt,
      })
    } catch (e) {
      this.logger.error('Failed to log activity', e)
    }
  }

  private async runAbuseChecks(licenseKey: string, licenseId: string, ip: string): Promise<void> {
    try {
      // Check for burst requests from same license in last 30s
      const recentCount = await this.prisma.activityLog.count({
        where: {
          licenseKey,
          createdAt: { gte: new Date(Date.now() - 30_000) },
        },
      })

      if (recentCount > 50) {
        await this.prisma.securityEvent.create({
          data: {
            type: 'BURST_REQUEST',
            severity: 'MEDIUM',
            licenseKey,
            ip,
            message: `${recentCount}+ verify requests within 30 seconds`,
          },
        })
        this.gateway.emitSecurityAlert({ type: 'BURST_REQUEST', licenseKey, ip, count: recentCount })
      }

      // Check for too many unique IPs on same license in last 1h
      const recentLogs = await this.prisma.activityLog.findMany({
        where: { licenseKey, createdAt: { gte: new Date(Date.now() - 3_600_000) }, ip: { not: null } },
        select: { ip: true },
        distinct: ['ip'],
      })

      if (recentLogs.length > 12) {
        await this.prisma.securityEvent.create({
          data: {
            type: 'IP_ROTATION',
            severity: 'MEDIUM',
            licenseKey,
            ip,
            message: `${recentLogs.length} different IPs used for same license in 1 hour`,
          },
        })
        this.gateway.emitSecurityAlert({ type: 'IP_ROTATION', licenseKey, ipCount: recentLogs.length })
      }
    } catch (e) {
      this.logger.warn('Abuse check failed', e)
    }
  }

  // ──────────────────────────────────────────────────────────
  // Core: verify license + register/check device
  // ──────────────────────────────────────────────────────────

  async verifyAndTrack(params: {
    key: string
    fingerprint: string
    deviceModel: string
    pluginName: string
    action: string
    data: string
    ip: string
    ua: string
  }): Promise<VerifyResult> {
    const { key, fingerprint, action, ip, ua } = params
    const pluginName = this.safeDecodePlugin(params.pluginName)
    const deviceModel = params.deviceModel || this.extractDeviceModel(ua) || 'Android Device'

    if (!key) {
      await this.logActivity({ type: 'VERIFY_FAIL', severity: 'LOW', licenseKey: '', ip, message: 'No license key provided' })
      return { ok: false, reason: 'NO_KEY', message: ERR_MESSAGES.NO_KEY }
    }

    if (!fingerprint) {
      return { ok: false, reason: 'INVALID_DEVICE', message: ERR_MESSAGES.INVALID_DEVICE }
    }

    // IP block check
    if (await this.isIpBlocked(ip)) {
      await this.logActivity({ type: 'VERIFY_FAIL', severity: 'HIGH', licenseKey: key, ip, message: 'IP is blocked' })
      return { ok: false, reason: 'IP_BLOCKED', message: ERR_MESSAGES.IP_BLOCKED }
    }

    // License lookup
    const license = await this.prisma.license.findFirst({
      where: { key, deletedAt: null },
      include: { devices: true },
    })

    if (!license) {
      await this.logActivity({ type: 'VERIFY_FAIL', severity: 'LOW', licenseKey: key, ip, message: 'License not found' })
      return { ok: false, reason: 'LICENSE_NOT_FOUND', message: ERR_MESSAGES.LICENSE_NOT_FOUND }
    }

    // Status checks
    if (license.status === 'REVOKED') {
      await this.logActivity({ type: 'VERIFY_FAIL', severity: 'MEDIUM', licenseId: license.id, licenseKey: key, ip, message: 'License revoked' })
      return { ok: false, reason: 'REVOKED', message: ERR_MESSAGES.REVOKED }
    }

    if (license.status === 'SUSPENDED') {
      return { ok: false, reason: 'SUSPENDED', message: ERR_MESSAGES.SUSPENDED }
    }

    // Expiry check — auto-expire in DB
    if (license.expiresAt && license.expiresAt < new Date()) {
      if (license.status !== 'EXPIRED') {
        await this.prisma.license.update({ where: { id: license.id }, data: { status: 'EXPIRED' } })
      }
      await this.logActivity({ type: 'VERIFY_FAIL', severity: 'LOW', licenseId: license.id, licenseKey: key, ip, message: 'License expired' })
      return { ok: false, reason: 'EXPIRED', message: ERR_MESSAGES.EXPIRED }
    }

    // Device management
    const hash = this.deviceHash(fingerprint, license.id)

    if (await this.isDeviceBlocked(hash)) {
      await this.logActivity({ type: 'VERIFY_FAIL', severity: 'HIGH', licenseId: license.id, licenseKey: key, ip, message: 'Device is blocked' })
      return { ok: false, reason: 'DEVICE_BLOCKED', message: ERR_MESSAGES.DEVICE_BLOCKED }
    }

    const existingDevice = license.devices.find(d => d.hash === hash)
    const activeDevices = license.devices.filter(d => d.status !== 'BLOCKED')
    let deviceRecord = existingDevice
    let isNewDevice = false

    if (!existingDevice) {
      if (activeDevices.length >= license.maxDevices) {
        await this.logActivity({
          type: 'ABUSE_DETECTED', severity: 'HIGH',
          licenseId: license.id, licenseKey: key, ip,
          message: `DEVICE_OVERFLOW — ${activeDevices.length} devices on single license`,
          metadata: { maxDevices: license.maxDevices, currentDevices: activeDevices.length },
        })
        await this.prisma.securityEvent.create({
          data: {
            type: 'DEVICE_OVERFLOW', severity: 'HIGH',
            licenseKey: key, ip,
            message: `${activeDevices.length} devices on a ${license.maxDevices}-device license`,
          },
        })
        this.gateway.emitSecurityAlert({ type: 'DEVICE_OVERFLOW', licenseKey: key, ip })
        return { ok: false, reason: 'DEVICE_LIMIT', message: ERR_MESSAGES.DEVICE_LIMIT }
      }

      // Register new device
      deviceRecord = await this.prisma.device.create({
        data: {
          licenseId: license.id,
          fingerprint,
          hash,
          name: deviceModel,
          model: deviceModel,
          status: 'ONLINE',
          lastIp: ip,
          lastSeenAt: new Date(),
          appVersion: this.extractAppVersion(params.ua),
        },
      })
      isNewDevice = true

      await this.logActivity({
        type: 'DEVICE_REGISTERED', severity: 'LOW',
        licenseId: license.id, deviceId: deviceRecord.id, licenseKey: key, ip,
        message: `New device registered — ${deviceModel}`,
        metadata: { plugin: pluginName, action },
      })
    } else {
      // Update existing device last seen
      await this.prisma.device.update({
        where: { id: existingDevice.id },
        data: { status: 'ONLINE', lastIp: ip, lastSeenAt: new Date() },
      })
      deviceRecord = existingDevice
    }

    // Track plugin IP history
    if (deviceRecord) {
      await this.prisma.deviceIp.create({
        data: { deviceId: deviceRecord.id, ip, seenAt: new Date() },
      }).catch(() => {})
    }

    // Track plugin usage
    if (pluginName && action) {
      await this.prisma.pluginUsageLog.create({
        data: {
          pluginId: await this.resolvePluginId(pluginName),
          licenseKey: key,
          action,
          ip,
        },
      }).catch(() => {})

      // Increment plugin download/use count
      if (['PLAY', 'OPEN', 'HOME'].includes(action.toUpperCase())) {
        await this.prisma.plugin.updateMany({
          where: { slug: pluginName },
          data: { downloadCount: { increment: 1 } },
        }).catch(() => {})
      }
    }

    // Log success
    const actType = isNewDevice ? 'DEVICE_REGISTERED' : this.actionToActivityType(action)
    if (!isNewDevice) {
      await this.logActivity({
        type: actType, severity: 'LOW',
        licenseId: license.id, deviceId: deviceRecord?.id, licenseKey: key, ip,
        message: this.buildSuccessMessage(action, pluginName, params.data),
        metadata: { plugin: pluginName, action },
      })
    }

    // Update license counters
    await this.prisma.license.update({
      where: { id: license.id },
      data: { verifyCount: { increment: 1 }, lastVerifiedAt: new Date() },
    })

    // Async abuse checks
    setImmediate(() => this.runAbuseChecks(key, license.id, ip))

    return {
      ok: true,
      daysLeft: this.calcDaysLeft(license.expiresAt),
      expiresAt: license.expiresAt?.toISOString() ?? null,
    }
  }

  // ──────────────────────────────────────────────────────────
  // Issue plugin session JWT
  // ──────────────────────────────────────────────────────────

  async issuePluginSession(params: {
    key: string
    fingerprint: string
    deviceModel: string
    pluginName: string
    ip: string
    ua: string
  }): Promise<{ ok: boolean; token?: string; expiresIn?: number; message?: string }> {
    const result = await this.verifyAndTrack({
      key: params.key,
      fingerprint: params.fingerprint,
      deviceModel: params.deviceModel,
      pluginName: params.pluginName,
      action: 'SESSION',
      data: '',
      ip: params.ip,
      ua: params.ua,
    })

    if (!result.ok) return { ok: false, message: result.message }

    const token = this.jwt.sign(
      { type: 'plugin', license_key: params.key, device_id: params.fingerprint, plugin_name: this.safeDecodePlugin(params.pluginName) },
      { secret: this.config.get('JWT_SECRET'), expiresIn: '90s' },
    )

    return { ok: true, token, expiresIn: 90 }
  }

  // ──────────────────────────────────────────────────────────
  // Heartbeat
  // ──────────────────────────────────────────────────────────

  async heartbeat(params: { key: string; fingerprint: string; ip: string }): Promise<VerifyResult> {
    if (!params.key || !params.fingerprint) {
      return { ok: false, reason: 'INVALID_DEVICE', message: ERR_MESSAGES.INVALID_DEVICE }
    }

    const license = await this.prisma.license.findFirst({
      where: { key: params.key, deletedAt: null },
    })
    if (!license || !['ACTIVE', 'TRIAL', 'EXPIRING_SOON'].includes(license.status)) {
      return { ok: false, reason: license?.status || 'LICENSE_NOT_FOUND', message: ERR_MESSAGES[license?.status ?? 'LICENSE_NOT_FOUND'] }
    }

    if (license.expiresAt && license.expiresAt < new Date()) {
      await this.prisma.license.update({ where: { id: license.id }, data: { status: 'EXPIRED' } })
      return { ok: false, reason: 'EXPIRED', message: ERR_MESSAGES.EXPIRED }
    }

    const hash = this.deviceHash(params.fingerprint, license.id)
    await this.prisma.device.updateMany({
      where: { hash, licenseId: license.id },
      data: { status: 'ONLINE', lastSeenAt: new Date(), lastIp: params.ip },
    })

    return { ok: true, daysLeft: this.calcDaysLeft(license.expiresAt) }
  }

  // ──────────────────────────────────────────────────────────
  // Discover — find license key from device/IP/cookie
  // ──────────────────────────────────────────────────────────

  async discoverLicense(params: { fingerprint: string; ip: string }): Promise<{ status: string; key?: string; expiresAt?: string }> {
    const { fingerprint, ip } = params

    // Strategy 1: Look up device record
    if (fingerprint) {
      const devices = await this.prisma.device.findMany({
        where: { fingerprint },
        include: { license: true },
        orderBy: { lastSeenAt: 'desc' },
        take: 1,
      })
      const dev = devices[0]
      if (dev?.license && ['ACTIVE', 'TRIAL', 'EXPIRING_SOON'].includes(dev.license.status)) {
        return { status: 'active', key: dev.license.key, expiresAt: dev.license.expiresAt?.toISOString() }
      }
    }

    // Strategy 2: Recent activity by IP (last 24h)
    if (ip) {
      const recentLog = await this.prisma.activityLog.findFirst({
        where: {
          ip,
          licenseKey: { not: '' },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
      })
      if (recentLog?.licenseKey) {
        const lic = await this.prisma.license.findFirst({ where: { key: recentLog.licenseKey } })
        if (lic && ['ACTIVE', 'TRIAL', 'EXPIRING_SOON'].includes(lic.status)) {
          return { status: 'active', key: lic.key, expiresAt: lic.expiresAt?.toISOString() }
        }
      }
    }

    return { status: 'error' }
  }

  // ──────────────────────────────────────────────────────────
  // Repo serving
  // ──────────────────────────────────────────────────────────

  async getRepoManifest(key: string, serverUrl: string): Promise<{ ok: boolean; data?: any; message?: string }> {
    const license = await this.prisma.license.findFirst({
      where: { key, deletedAt: null, status: { in: ['ACTIVE', 'TRIAL', 'EXPIRING_SOON'] } },
    })
    if (!license) return { ok: false, message: 'License inactive or not found' }

    return {
      ok: true,
      data: {
        name: 'CS Premium',
        description: 'CloudStream Premium Extensions',
        manifestVersion: 1,
        pluginLists: [`${serverUrl}/r/${key}/plugins.json`],
      },
    }
  }

  async getPluginsList(key: string, serverUrl: string): Promise<{ ok: boolean; plugins?: PluginEntry[]; message?: string }> {
    const license = await this.prisma.license.findFirst({
      where: { key, deletedAt: null, status: { in: ['ACTIVE', 'TRIAL', 'EXPIRING_SOON'] } },
    })
    if (!license) return { ok: false, message: 'License inactive' }

    const where: any = { isEnabled: true }
    if (license.allowedPlugins?.length > 0) {
      where.slug = { in: license.allowedPlugins }
    }

    const plugins = await this.prisma.plugin.findMany({ where, orderBy: { name: 'asc' } })

    const pluginList: PluginEntry[] = plugins.map(p => {
      let url = p.fileUrl || `${serverUrl}/r/${key}/${p.slug}.cs3`
      const meta = (p.metadata ?? {}) as any

      return {
        internalName: p.slug,
        name: p.name,
        description: p.description ?? '',
        authors: meta.authors ?? [],
        url,
        version: parseInt(p.version) || 1,
        iconUrl: p.iconUrl ?? null,
        language: meta.language ?? 'id',
        tvTypes: meta.tvTypes ?? [],
        status: meta.csStatus ?? 1,
        apiVersion: 1,
        repositoryUrl: serverUrl,
        fileSize: p.size ?? 0,
      }
    })

    // Log access async
    setImmediate(() =>
      this.logActivity({ type: 'PLUGIN_SESSION', severity: 'LOW', licenseKey: key, ip: '', message: `Plugins list accessed (${pluginList.length} plugins)` })
    )

    return { ok: true, plugins: pluginList }
  }

  // ──────────────────────────────────────────────────────────
  // Selectors / Secret keys
  // ──────────────────────────────────────────────────────────

  verifyPluginToken(token: string): { valid: boolean; payload?: any; error?: string } {
    try {
      const payload = this.jwt.verify(token, { secret: this.config.get('JWT_SECRET') }) as any
      if (payload.type !== 'plugin') return { valid: false, error: 'Invalid token type' }
      return { valid: true, payload }
    } catch {
      return { valid: false, error: 'Invalid or expired plugin session' }
    }
  }

  async getSelectors(pluginName: string): Promise<{ ok: boolean; selectors?: any; message?: string }> {
    const plugin = await this.prisma.plugin.findFirst({ where: { slug: pluginName } })
    if (!plugin?.metadata) return { ok: false, message: 'Selector config not found' }

    const meta = plugin.metadata as any
    if (!meta.selectors) return { ok: false, message: 'No selectors configured for this plugin' }

    const { secret_key_default, secret_key_alt, ...safeSelectors } = meta.selectors
    return { ok: true, selectors: safeSelectors }
  }

  async getSecretKeys(pluginName: string): Promise<{ ok: boolean; keys?: any; message?: string }> {
    const plugin = await this.prisma.plugin.findFirst({ where: { slug: pluginName } })
    if (!plugin?.metadata) return { ok: false, message: 'Secret config not found' }

    const meta = plugin.metadata as any
    if (meta.selectors?.type !== 'api_secret') return { ok: false, message: 'Plugin does not use API secrets' }

    return {
      ok: true,
      keys: {
        k1: meta.selectors?.secret_key_default,
        k2: meta.selectors?.secret_key_alt,
        expiresAt: Date.now() + 5 * 60 * 1000,
      },
    }
  }

  // ──────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────

  async resolvePluginFileUrl(slug: string, filename: string): Promise<string> {
    const plugin = await this.prisma.plugin.findFirst({ where: { slug } })
    if (plugin?.fileUrl) return plugin.fileUrl
    return `https://raw.githubusercontent.com/Makairamei/CSNEW/master/builds/${filename}`
  }

  private async resolvePluginId(slug: string): Promise<string> {
    const plugin = await this.prisma.plugin.findFirst({ where: { slug } })
    if (plugin) return plugin.id
    // Auto-create unknown plugin record
    const created = await this.prisma.plugin.create({
      data: { slug, name: slug, version: '1', isEnabled: true },
    }).catch(() => null)
    return created?.id ?? slug
  }

  private actionToActivityType(action: string): string {
    const map: Record<string, string> = {
      PLAY: 'PLAYBACK_START',
      OPEN: 'PLUGIN_SESSION',
      HOME: 'PLUGIN_SESSION',
      SESSION: 'PLUGIN_SESSION',
      SELECTORS: 'SELECTORS_OK',
      VERIFY: 'VERIFY_OK',
    }
    return map[action?.toUpperCase()] ?? 'VERIFY_OK'
  }

  private buildSuccessMessage(action: string, pluginName: string, data: string): string {
    const act = action?.toUpperCase() ?? ''
    if (act === 'PLAY' && data) return `Playback started via ${pluginName}`
    if (act === 'SELECTORS') return `Selector config loaded successfully`
    if (pluginName) return `Plugin session — ${pluginName}`
    return 'License verified successfully'
  }

  private extractAppVersion(ua: string): string | undefined {
    const m = ua.match(/CloudStreamApp\/([^ ]+)/i)
    return m ? m[1] : undefined
  }
}
