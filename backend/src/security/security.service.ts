import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class SecurityService {
  constructor(private prisma: PrismaService) {}

  // ── Abuse alerts (security events) ──────────────────────────────
  async findEvents(q: any) {
    const where: any = {}
    if (q.severity) where.severity = q.severity
    if (q.type) where.type = q.type
    if (q.resolved === 'true' || q.resolved === true) where.resolved = true
    else if (q.resolved === 'false' || q.resolved === false) where.resolved = false
    if (q.search) {
      where.OR = [
        { licenseKey: { contains: q.search, mode: 'insensitive' } },
        { ip: { contains: q.search } },
        { message: { contains: q.search, mode: 'insensitive' } },
      ]
    }
    const page = parseInt(q.page) || 1
    const limit = Math.min(parseInt(q.limit) || 50, 200)
    const [total, items] = await Promise.all([
      this.prisma.securityEvent.count({ where }),
      this.prisma.securityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])
    return { total, items, page, limit }
  }

  async resolveEvent(id: string) {
    const evt = await this.prisma.securityEvent.findUnique({ where: { id } })
    if (!evt) throw new NotFoundException('Event not found')
    return this.prisma.securityEvent.update({
      where: { id },
      data: { resolved: true, resolvedAt: new Date() },
    })
  }

  async bulkResolve(ids: string[]) {
    const result = await this.prisma.securityEvent.updateMany({
      where: { id: { in: ids } },
      data: { resolved: true, resolvedAt: new Date() },
    })
    return { resolved: result.count }
  }

  // ── Blocked IPs ────────────────────────────────────────────────
  async getBlockedIps(q: any = {}) {
    const where: any = {}
    if (q.search) where.ip = { contains: q.search }
    return this.prisma.blockedIp.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(q.limit) || 200,
    })
  }

  async blockIp(ip: string, reason: string, expiresAt?: Date | null) {
    if (!ip) throw new NotFoundException('IP required')
    return this.prisma.blockedIp.upsert({
      where: { ip },
      create: { ip, reason: reason ?? 'Manual block', expiresAt },
      update: { reason: reason ?? 'Manual block', expiresAt },
    })
  }

  async unblockIp(ipOrId: string) {
    // Accept both raw IP and id
    const existing = await this.prisma.blockedIp.findFirst({
      where: { OR: [{ ip: ipOrId }, { id: ipOrId }] },
    })
    if (!existing) throw new NotFoundException('IP not blocked')
    await this.prisma.blockedIp.delete({ where: { id: existing.id } })
    return { ok: true }
  }

  async bulkUnblockIps(ids: string[]) {
    const result = await this.prisma.blockedIp.deleteMany({ where: { id: { in: ids } } })
    return { unblocked: result.count }
  }

  // ── Blocked devices ────────────────────────────────────────────
  async getBlockedDevices(q: any = {}) {
    const where: any = { status: 'BLOCKED', deletedAt: null }
    if (q.search) {
      where.OR = [
        { fingerprint: { contains: q.search } },
        { name: { contains: q.search, mode: 'insensitive' } },
        { lastIp: { contains: q.search } },
        { license: { key: { contains: q.search, mode: 'insensitive' } } },
      ]
    }
    const page = parseInt(q.page) || 1
    const limit = Math.min(parseInt(q.limit) || 50, 200)
    const [total, items] = await Promise.all([
      this.prisma.device.count({ where }),
      this.prisma.device.findMany({
        where,
        include: { license: { select: { key: true, name: true } } },
        orderBy: { blockedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])
    return { total, items, page, limit }
  }

  // ── Stats ──────────────────────────────────────────────────────
  async getStats() {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [openAlerts, criticalOpen, blockedIpCount, blockedDeviceCount, resolvedToday, alertsBySeverity] = await Promise.all([
      this.prisma.securityEvent.count({ where: { resolved: false } }),
      this.prisma.securityEvent.count({ where: { resolved: false, severity: 'CRITICAL' } }),
      this.prisma.blockedIp.count(),
      this.prisma.device.count({ where: { status: 'BLOCKED', deletedAt: null } }),
      this.prisma.securityEvent.count({ where: { resolved: true, resolvedAt: { gte: dayAgo } } }),
      this.prisma.securityEvent.groupBy({
        by: ['severity'],
        _count: { id: true },
        where: { resolved: false },
      }),
    ])
    const bySev: Record<string, number> = {}
    for (const g of alertsBySeverity) bySev[g.severity] = g._count.id
    return {
      openAlerts, criticalOpen, blockedIpCount, blockedDeviceCount, resolvedToday,
      bySeverity: bySev,
    }
  }
}