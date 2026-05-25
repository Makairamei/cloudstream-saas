import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}
  findAll(q: any) { return this.prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: q.limit || 50 }) }
  markRead(id: string) { return this.prisma.notification.update({ where: { id }, data: { isRead: true } }) }
  markAllRead() { return this.prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } }) }
  getUnreadCount() { return this.prisma.notification.count({ where: { isRead: false } }) }
}
