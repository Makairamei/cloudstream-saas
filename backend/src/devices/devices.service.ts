import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const where: any = {}
    if (query.status) where.status = query.status
    if (query.licenseId) where.licenseId = query.licenseId
    const [total, items] = await Promise.all([
      this.prisma.device.count({ where }),
      this.prisma.device.findMany({
        where,
        include: { license: { select: { key: true, name: true, status: true } } },
        orderBy: { lastSeenAt: 'desc' },
        skip: ((parseInt(query.page) || 1) - 1) * (parseInt(query.limit) || 20),
        take: parseInt(query.limit) || 20,
      }),
    ])
    return { total, items }
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
