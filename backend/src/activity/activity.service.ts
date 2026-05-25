import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  findAll(query: any) {
    const where: any = {}
    if (query.type) where.type = query.type
    if (query.severity) where.severity = query.severity
    if (query.licenseKey) where.licenseKey = { contains: query.licenseKey }
    return this.prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(query.limit) || 100,
      skip: ((parseInt(query.page) || 1) - 1) * (parseInt(query.limit) || 100),
    })
  }

  getStats() {
    return this.prisma.activityLog.groupBy({
      by: ['type'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })
  }
}
