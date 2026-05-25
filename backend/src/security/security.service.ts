import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class SecurityService {
  constructor(private prisma: PrismaService) {}
  findEvents(q: any) { return this.prisma.securityEvent.findMany({ orderBy: { createdAt: 'desc' }, take: q.limit || 50 }) }
  blockIp(ip: string, reason: string) { return this.prisma.blockedIp.create({ data: { ip, reason } }) }
  unblockIp(ip: string) { return this.prisma.blockedIp.delete({ where: { ip } }) }
  getBlockedIps() { return this.prisma.blockedIp.findMany({ orderBy: { createdAt: 'desc' } }) }
  resolveEvent(id: string) { return this.prisma.securityEvent.update({ where: { id }, data: { resolved: true, resolvedAt: new Date() } }) }
}
