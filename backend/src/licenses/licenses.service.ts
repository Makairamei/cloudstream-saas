import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import { CreateLicenseDto } from './dto/create-license.dto'
import { UpdateLicenseDto } from './dto/update-license.dto'
import { ListLicensesDto } from './dto/list-licenses.dto'
import { nanoid } from 'nanoid'
import { SettingsService } from '../settings/settings.service'

@Injectable()
export class LicensesService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  async findAll(dto: ListLicensesDto) {
    const onlyDeleted    = (dto as any).deleted === true || (dto as any).deleted === 'true'
    const includeDeleted = (dto as any).includeDeleted === true || (dto as any).includeDeleted === 'true'
    const where: any = onlyDeleted
      ? { deletedAt: { not: null } }
      : (includeDeleted ? {} : { deletedAt: null })
    if (dto.status) where.status = dto.status as any
    if (dto.search) {
      where.OR = [
        { key: { contains: dto.search, mode: 'insensitive' } },
        { name: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
      ]
    }
    if (dto.tag) where.tags = { has: dto.tag }

    const [total, raw] = await Promise.all([
      this.prisma.license.count({ where }),
      this.prisma.license.findMany({
        where,
        include: { _count: { select: { devices: { where: { deletedAt: null } } } } },
        orderBy: { [dto.sortBy || 'createdAt']: dto.order || 'desc' },
        skip: ((dto.page || 1) - 1) * (dto.limit || 20),
        take: dto.limit || 20,
      }),
    ])
    const items = raw.map(l => ({ ...l, activeDevices: l._count?.devices ?? 0 }))

    return { total, items, page: dto.page || 1, limit: dto.limit || 20 }
  }

  async findOne(id: string) {
    const license = await this.prisma.license.findFirst({
      where: { OR: [{ id }, { key: id }], deletedAt: null },
      include: {
        devices: { orderBy: { lastSeenAt: 'desc' } },
        _count: { select: { activityLogs: true, playbackLogs: true } },
      },
    })
    if (!license) throw new NotFoundException('License not found')
    return license
  }

  async create(dto: CreateLicenseDto, adminId: string) {
    const key = dto.key || (await this.generateKey(dto.isTrial))

    const existing = await this.prisma.license.findUnique({ where: { key } })
    if (existing) throw new ConflictException('License key already exists')

    // Pull configurable defaults from settings table
    const defaultMaxDevices = await this.settings.getValue<number>('default_max_devices', 2)
    const defaultGrace = await this.settings.getValue<number>('default_grace_period_days', 7)
    const defaultDuration = await this.settings.getValue<number>('default_duration_days', 30)
    const defaultTrialDays = await this.settings.getValue<number>('default_trial_days', 7)

    let expiresAt: Date | null = null
    if (dto.expiresAt) {
      expiresAt = new Date(dto.expiresAt)
    } else if (dto.isTrial) {
      expiresAt = new Date(Date.now() + defaultTrialDays * 86_400_000)
    } else if (defaultDuration > 0) {
      expiresAt = new Date(Date.now() + defaultDuration * 86_400_000)
    }

    const license = await this.prisma.license.create({
      data: {
        key,
        name: dto.name,
        email: dto.email,
        status: dto.isTrial ? 'TRIAL' : 'ACTIVE',
        maxDevices: dto.maxDevices ?? defaultMaxDevices,
        gracePeriodDays: dto.gracePeriodDays ?? defaultGrace,
        isTrial: dto.isTrial || false,
        expiresAt,
        allowedPlugins: dto.allowedPlugins || [],
        tags: dto.tags || [],
        notes: dto.notes,
        resellerId: dto.resellerId,
      },
    })

    await this.prisma.adminLog.create({
      data: { adminId, action: 'CREATE_LICENSE', target: license.key, targetType: 'LICENSE' },
    })

    return license
  }

  async update(id: string, dto: UpdateLicenseDto, adminId: string) {
    const license = await this.findOne(id)

    const updated = await this.prisma.license.update({
      where: { id: license.id },
      data: {
        name: dto.name,
        email: dto.email,
        status: dto.status as any,
        maxDevices: dto.maxDevices,
        gracePeriodDays: dto.gracePeriodDays,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        allowedPlugins: dto.allowedPlugins,
        tags: dto.tags,
        notes: dto.notes,
      },
    })

    await this.prisma.adminLog.create({
      data: { adminId, action: 'UPDATE_LICENSE', target: license.key, targetType: 'LICENSE' },
    })

    return updated
  }

  async revoke(id: string, reason: string, adminId: string) {
    const license = await this.findOne(id)

    const updated = await this.prisma.license.update({
      where: { id: license.id },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: reason },
    })

    await this.prisma.adminLog.create({
      data: { adminId, action: 'REVOKE_LICENSE', target: license.key, targetType: 'LICENSE', details: { reason } },
    })

    return updated
  }

  async restore(id: string, adminId: string) {
    const license = await this.prisma.license.findFirst({
      where: { OR: [{ id }, { key: id }] },
    })
    if (!license) throw new NotFoundException('License not found')

    // If license was soft-deleted, restore all child rows that were soft-deleted
    // at the SAME timestamp (cascade group). Tolerate small clock skew (Ã‚Â±2s).
    let cascadedCounts = { devices: 0, activityLogs: 0, playbackLogs: 0 }

    if (license.deletedAt) {
      const t = license.deletedAt
      const lo = new Date(t.getTime() - 2000)
      const hi = new Date(t.getTime() + 2000)

      const [devRes, actRes, playRes] = await this.prisma.$transaction([
        this.prisma.device.updateMany({
          where: { licenseId: license.id, deletedAt: { gte: lo, lte: hi } },
          data: { deletedAt: null },
        }),
        this.prisma.activityLog.updateMany({
          where: { licenseId: license.id, deletedAt: { gte: lo, lte: hi } },
          data: { deletedAt: null },
        }),
        this.prisma.playbackLog.updateMany({
          where: { licenseId: license.id, deletedAt: { gte: lo, lte: hi } },
          data: { deletedAt: null },
        }),
      ])
      cascadedCounts = { devices: devRes.count, activityLogs: actRes.count, playbackLogs: playRes.count }
    }

    const updated = await this.prisma.license.update({
      where: { id: license.id },
      data: { status: 'ACTIVE', revokedAt: null, revokedReason: null, deletedAt: null },
    })

    await this.prisma.adminLog.create({
      data: { adminId, action: 'RESTORE_LICENSE', target: license.key, targetType: 'LICENSE', details: cascadedCounts as any },
    })

    return { ...updated, restored: cascadedCounts }
  }

  async activate(id: string, adminId: string) {
    const license = await this.findOne(id)

    const updated = await this.prisma.license.update({
      where: { id: license.id },
      data: { status: 'ACTIVE', revokedAt: null, revokedReason: null },
    })

    await this.prisma.adminLog.create({
      data: { adminId, action: 'UPDATE_LICENSE', target: license.key, targetType: 'LICENSE', details: { action: 'activate' } },
    })

    return updated
  }

  async renew(id: string, days: number, adminId: string) {
    const license = await this.findOne(id)
    const base = license.expiresAt && license.expiresAt > new Date() ? license.expiresAt : new Date()
    const newExpiry = new Date(base.getTime() + days * 86_400_000)

    const updated = await this.prisma.license.update({
      where: { id: license.id },
      data: { expiresAt: newExpiry, status: 'ACTIVE', revokedAt: null, revokedReason: null },
    })

    await this.prisma.adminLog.create({
      data: { adminId, action: 'UPDATE_LICENSE', target: license.key, targetType: 'LICENSE', details: { action: 'renew', days } },
    })

    return updated
  }

  async bulk(action: string, ids: string[], adminId: string) {
    const validActions = ['revoke', 'activate', 'delete', 'restore']
    if (!validActions.includes(action)) throw new BadRequestException('Invalid bulk action')
    if (!ids?.length) throw new BadRequestException('ids required')

    let processed = 0
    for (const id of ids.slice(0, 200)) {
      try {
        if (action === 'revoke') await this.revoke(id, 'Bulk revoke', adminId)
        else if (action === 'activate') await this.activate(id, adminId)
        else if (action === 'delete') await this.remove(id, adminId)
        else if (action === 'restore') await this.restore(id, adminId)
        processed++
      } catch { /* skip invalid ids */ }
    }

    return { processed, action }
  }

  async remove(id: string, adminId: string) {
    const license = await this.findOne(id)
    const now = new Date()

    // Cascade soft delete: license + all related records get the same timestamp
    // so they restore together as a coherent group later.
    await this.prisma.$transaction([
      this.prisma.license.update({
        where: { id: license.id },
        data: { deletedAt: now, status: 'REVOKED' },
      }),
      this.prisma.device.updateMany({
        where: { licenseId: license.id, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.activityLog.updateMany({
        where: { licenseId: license.id, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.playbackLog.updateMany({
        where: { licenseId: license.id, deletedAt: null },
        data: { deletedAt: now },
      }),
    ])

    await this.prisma.adminLog.create({
      data: { adminId, action: 'DELETE_LICENSE', target: license.key, targetType: 'LICENSE', details: { softDelete: true, restorableUntil: new Date(now.getTime() + 7 * 86400000).toISOString() } as any },
    })
  }

  async verify(key: string, deviceHash: string, ip?: string) {
    const license = await this.prisma.license.findFirst({
      where: { key, deletedAt: null },
      include: { devices: true },
    })

    if (!license) {
      return { valid: false, reason: 'LICENSE_NOT_FOUND' }
    }

    if (license.status === 'REVOKED' || license.status === 'SUSPENDED') {
      return { valid: false, reason: license.status }
    }

    if (license.expiresAt && license.expiresAt < new Date()) {
      await this.prisma.license.update({ where: { id: license.id }, data: { status: 'EXPIRED' } })
      return { valid: false, reason: 'LICENSE_EXPIRED' }
    }

    const existingDevice = license.devices.find(d => d.hash === deviceHash)
    const activeDevices = license.devices.filter(d => d.status !== 'BLOCKED').length

    if (!existingDevice && activeDevices >= license.maxDevices) {
      await this.prisma.activityLog.create({
        data: {
          type: 'ABUSE_DETECTED',
          severity: 'HIGH',
          licenseId: license.id,
          licenseKey: key,
          ip,
          message: `DEVICE_OVERFLOW Ã¢â‚¬â€ ${activeDevices} devices on single license`,
        },
      })
      return { valid: false, reason: 'DEVICE_LIMIT_EXCEEDED' }
    }

    if (existingDevice && existingDevice.status === 'BLOCKED') {
      return { valid: false, reason: 'DEVICE_BLOCKED' }
    }

    await this.prisma.license.update({
      where: { id: license.id },
      data: { verifyCount: { increment: 1 }, lastVerifiedAt: new Date() },
    })

    await this.prisma.activityLog.create({
      data: { type: 'VERIFY_OK', severity: 'LOW', licenseId: license.id, licenseKey: key, ip, message: 'License verified successfully' },
    })

    return { valid: true, license: { key, status: license.status, expiresAt: license.expiresAt, maxDevices: license.maxDevices } }
  }

  // Recycle bin: list deleted licenses with countdown
  async recycleBin(dto: ListLicensesDto) {
    const list = await this.findAll({ ...dto, deleted: true } as any)
    const sevenDayMs = 7 * 86400000
    const now = Date.now()
    const items = (list.items as any[]).map(l => {
      const deletedAt = l.deletedAt ? new Date(l.deletedAt).getTime() : 0
      const purgeAt = deletedAt + sevenDayMs
      return {
        ...l,
        purgeAt: new Date(purgeAt).toISOString(),
        daysLeft: Math.max(0, Math.ceil((purgeAt - now) / 86400000)),
        hoursLeft: Math.max(0, Math.ceil((purgeAt - now) / 3600000)),
      }
    })
    return { ...list, items }
  }

  // Cascade purge: hard-delete licenses + related rows that were soft-deleted >= 7 days ago.
  // Cron runs every 6 hours.
  @Cron(CronExpression.EVERY_6_HOURS)
  async purgeExpired() {
    const cutoff = new Date(Date.now() - 7 * 86400000)
    const expired = await this.prisma.license.findMany({
      where: { deletedAt: { lte: cutoff } },
      select: { id: true, key: true, deletedAt: true },
    })
    if (expired.length === 0) return { purged: 0 }
    const ids = expired.map(l => l.id)
    const keys = expired.map(l => l.key)
    await this.prisma.$transaction([
      this.prisma.activityLog.deleteMany({ where: { licenseId: { in: ids } } }),
      this.prisma.playbackLog.deleteMany({ where: { licenseId: { in: ids } } }),
      this.prisma.device.deleteMany({ where: { licenseId: { in: ids } } }),
      this.prisma.securityEvent.deleteMany({ where: { licenseKey: { in: keys } } }),
      this.prisma.license.deleteMany({ where: { id: { in: ids } } }),
    ])
    return { purged: expired.length, keys: expired.map(l => l.key) }
  }

  // Manually purge a single soft-deleted license immediately (admin override)
  async hardDelete(id: string, adminId: string) {
    const license = await this.prisma.license.findFirst({ where: { OR: [{ id }, { key: id }] } })
    if (!license) throw new NotFoundException('License not found')
    await this.prisma.$transaction([
      this.prisma.activityLog.deleteMany({ where: { licenseId: license.id } }),
      this.prisma.playbackLog.deleteMany({ where: { licenseId: license.id } }),
      this.prisma.device.deleteMany({ where: { licenseId: license.id } }),
      this.prisma.securityEvent.deleteMany({ where: { licenseKey: license.key } }),
      this.prisma.license.delete({ where: { id: license.id } }),
    ])
    await this.prisma.adminLog.create({
      data: { adminId, action: 'DELETE_LICENSE', target: license.key, targetType: 'LICENSE', details: { hardDelete: true } as any },
    })
    return { ok: true, key: license.key }
  }

  private async generateKey(isTrial = false): Promise<string> {
    const customPrefix = await this.settings.getValue<string>('license_key_prefix', 'CS-PROD')
    const prefix = isTrial ? 'CS-TRIAL' : customPrefix
    const id = nanoid(10).toUpperCase().replace(/[^A-Z0-9]/g, '0')
    return `-${id}`
  }
}