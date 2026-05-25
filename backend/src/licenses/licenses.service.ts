import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateLicenseDto } from './dto/create-license.dto'
import { UpdateLicenseDto } from './dto/update-license.dto'
import { ListLicensesDto } from './dto/list-licenses.dto'
import { nanoid } from 'nanoid'

@Injectable()
export class LicensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(dto: ListLicensesDto) {
    const where: any = { deletedAt: null }
    if (dto.status) where.status = dto.status
    if (dto.search) {
      where.OR = [
        { key: { contains: dto.search, mode: 'insensitive' } },
        { name: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
      ]
    }
    if (dto.tag) where.tags = { has: dto.tag }

    const [total, items] = await Promise.all([
      this.prisma.license.count({ where }),
      this.prisma.license.findMany({
        where,
        include: { _count: { select: { devices: true } } },
        orderBy: { [dto.sortBy || 'createdAt']: dto.order || 'desc' },
        skip: ((dto.page || 1) - 1) * (dto.limit || 20),
        take: dto.limit || 20,
      }),
    ])

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
    const key = dto.key || this.generateKey(dto.isTrial)

    const existing = await this.prisma.license.findUnique({ where: { key } })
    if (existing) throw new ConflictException('License key already exists')

    const license = await this.prisma.license.create({
      data: {
        key,
        name: dto.name,
        email: dto.email,
        status: dto.isTrial ? 'TRIAL' : 'ACTIVE',
        maxDevices: dto.maxDevices || 3,
        gracePeriodDays: dto.gracePeriodDays || 7,
        isTrial: dto.isTrial || false,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
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
    const license = await this.findOne(id)

    const updated = await this.prisma.license.update({
      where: { id: license.id },
      data: { status: 'ACTIVE', revokedAt: null, revokedReason: null },
    })

    await this.prisma.adminLog.create({
      data: { adminId, action: 'RESTORE_LICENSE', target: license.key, targetType: 'LICENSE' },
    })

    return updated
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

    await this.prisma.license.update({
      where: { id: license.id },
      data: { deletedAt: new Date() },
    })

    await this.prisma.adminLog.create({
      data: { adminId, action: 'DELETE_LICENSE', target: license.key, targetType: 'LICENSE' },
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
          message: `DEVICE_OVERFLOW — ${activeDevices} devices on single license`,
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

  private generateKey(isTrial = false): string {
    const prefix = isTrial ? 'CS-TRIAL' : 'CS-PROD'
    const id = nanoid(8).toUpperCase().replace(/[^A-Z0-9]/g, '0')
    return `${prefix}-${id}`
  }
}
