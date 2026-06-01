import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'

const ONLINE_TIMEOUT_MS = 5 * 60 * 1000  // 5 minutes inactivity → mark OFFLINE

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name)
  constructor(private prisma: PrismaService) {}

  // Auto-mark devices OFFLINE after 5 min of inactivity. Runs every minute.
  @Cron(CronExpression.EVERY_MINUTE)
  async autoMarkOfflineDevices() {
    const cutoff = new Date(Date.now() - ONLINE_TIMEOUT_MS)
    try {
      const result = await this.prisma.device.updateMany({
        where: {
          status: 'ONLINE',
          OR: [
            { lastSeenAt: null },
            { lastSeenAt: { lt: cutoff } },
          ],
        },
        data: { status: 'OFFLINE' },
      })
      if (result.count > 0) {
        this.logger.log(`Marked ${result.count} stale devices OFFLINE`)
      }
    } catch (e) {
      this.logger.warn('autoMarkOfflineDevices failed', e as any)
    }
  }

  async findAll(query: any) {
    const where: any = {}
    if (query.status) where.status = query.status
    if (query.licenseId) where.licenseId = query.licenseId
    // Hide soft-deleted by default unless explicitly requested
    if (!query.includeDeleted) where.deletedAt = null
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { model: { contains: query.search, mode: 'insensitive' } },
        { fingerprint: { contains: query.search, mode: 'insensitive' } },
        { lastIp: { contains: query.search } },
        { license: { key: { contains: query.search, mode: 'insensitive' } } },
      ]
    }
    const page = parseInt(query.page) || 1
    const limit = Math.min(parseInt(query.limit) || 20, 200)

    const [total, items] = await Promise.all([
      this.prisma.device.count({ where }),
      this.prisma.device.findMany({
        where,
        include: { license: { select: { id: true, key: true, name: true, status: true } } },
        orderBy: { lastSeenAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    // Compute live status: even if DB says ONLINE but lastSeenAt > 5min, treat as OFFLINE
    const cutoff = Date.now() - ONLINE_TIMEOUT_MS
    const decorated = items.map(d => {
      const seen = d.lastSeenAt ? new Date(d.lastSeenAt).getTime() : 0
      const liveStatus = (d.status === 'BLOCKED' || d.status === 'SUSPICIOUS')
        ? d.status
        : (seen >= cutoff ? 'ONLINE' : 'OFFLINE')
      return {
        ...d,
        status: liveStatus,
        ip: d.lastIp ?? null,
        licenseKey: d.license?.key ?? null,
        licenseName: d.license?.name ?? null,
        licenseId: d.license?.id ?? null,
      }
    })

    return { total, items: decorated, page, limit }
  }

  async findOne(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: { license: true, ipHistory: { orderBy: { seenAt: 'desc' }, take: 20 } },
    })
    if (!device) throw new NotFoundException('Device not found')
    return device
  }

  async block(id: string, reason: string, adminId: string) {
    const device = await this.findOne(id)
    return this.prisma.device.update({
      where: { id: device.id },
      data: { status: 'BLOCKED', blockedAt: new Date(), blockedReason: reason },
    })
  }

  async unblock(id: string, adminId: string) {
    const device = await this.findOne(id)
    return this.prisma.device.update({
      where: { id: device.id },
      data: { status: 'OFFLINE', blockedAt: null, blockedReason: null },
    })
  }

  async remove(id: string) {
    const device = await this.findOne(id)
    await this.prisma.deviceIp.deleteMany({ where: { deviceId: device.id } })
    await this.prisma.activityLog.updateMany({ where: { deviceId: device.id }, data: { deviceId: null } })
    await this.prisma.playbackLog.updateMany({ where: { deviceId: device.id }, data: { deviceId: null } })
    await this.prisma.device.delete({ where: { id: device.id } })
  }

  async bulk(action: string, ids: string[], adminId: string) {
    const valid = ['block', 'unblock', 'delete']
    if (!valid.includes(action)) throw new BadRequestException('Invalid bulk action')
    if (!ids?.length) throw new BadRequestException('ids required')

    let processed = 0
    for (const id of ids.slice(0, 500)) {
      try {
        if (action === 'block') await this.block(id, 'Bulk block', adminId)
        else if (action === 'unblock') await this.unblock(id, adminId)
        else if (action === 'delete') await this.remove(id)
        processed++
      } catch { /* skip */ }
    }
    return { processed, action }
  }
}