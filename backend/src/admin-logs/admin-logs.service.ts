import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AdminLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(q: any) {
    const where: any = {}
    if (q.adminId) where.adminId = q.adminId
    if (q.action) where.action = q.action
    if (q.search) {
      where.OR = [
        { target: { contains: q.search, mode: 'insensitive' } },
        { admin: { email: { contains: q.search, mode: 'insensitive' } } },
        { admin: { name: { contains: q.search, mode: 'insensitive' } } },
        { ip: { contains: q.search } },
      ]
    }
    if (q.from) where.createdAt = { ...(where.createdAt ?? {}), gte: new Date(q.from) }
    if (q.to)   where.createdAt = { ...(where.createdAt ?? {}), lte: new Date(q.to) }

    const page = parseInt(q.page) || 1
    const limit = Math.min(parseInt(q.limit) || 50, 200)

    const [total, items] = await Promise.all([
      this.prisma.adminLog.count({ where }),
      this.prisma.adminLog.findMany({
        where,
        include: { admin: { select: { id: true, name: true, email: true, role: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])
    return { total, items, page, limit }
  }

  async stats() {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [todayCount, byAction] = await Promise.all([
      this.prisma.adminLog.count({ where: { createdAt: { gte: dayAgo } } }),
      this.prisma.adminLog.groupBy({
        by: ['action'],
        _count: { id: true },
        where: { createdAt: { gte: dayAgo } },
        orderBy: { _count: { id: 'desc' } },
        take: 6,
      }),
    ])
    return { todayCount, byAction: byAction.map(a => ({ action: a.action, count: a._count.id })) }
  }
}