import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AdminLogsService {
  constructor(private prisma: PrismaService) {}
  findAll(q: any) {
    const where: any = {}
    if (q.adminId) where.adminId = q.adminId
    if (q.action) where.action = q.action
    return this.prisma.adminLog.findMany({
      where,
      include: { admin: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(q.limit) || 50,
      skip: ((parseInt(q.page) || 1) - 1) * (parseInt(q.limit) || 50),
    })
  }
}
