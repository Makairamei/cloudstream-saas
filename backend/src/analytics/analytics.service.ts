import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const prevWeekStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

    const [totalLicenses, activeDevices, pluginsToday, playbacksToday, blockedTotal, prevWeekLicenses, prevWeekDevices] = await Promise.all([
      this.prisma.license.count({ where: { deletedAt: null } }),
      this.prisma.device.count({ where: { status: 'ONLINE' } }),
      this.prisma.activityLog.count({ where: { type: 'PLUGIN_SESSION', createdAt: { gte: dayAgo } } }),
      this.prisma.activityLog.count({ where: { type: 'PLAYBACK_START', createdAt: { gte: dayAgo } } }),
      this.prisma.securityEvent.count({ where: { resolved: false } }),
      this.prisma.license.count({ where: { deletedAt: null, createdAt: { gte: prevWeekStart, lte: weekAgo } } }),
      this.prisma.device.count({ where: { status: 'ONLINE', createdAt: { gte: prevWeekStart, lte: weekAgo } } }),
    ])

    const licensesChange = prevWeekLicenses > 0
      ? ((totalLicenses - prevWeekLicenses) / prevWeekLicenses) * 100
      : 0
    const devicesChange = prevWeekDevices > 0
      ? ((activeDevices - prevWeekDevices) / prevWeekDevices) * 100
      : 0

    return {
      totalLicenses,
      activeDevices,
      pluginsToday,
      playbacksToday,
      blockedTotal,
      licensesChange: Math.round(licensesChange * 10) / 10,
      devicesChange: Math.round(devicesChange * 10) / 10,
    }
  }

  async getLicenseStats() {
    const groups = await this.prisma.license.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { deletedAt: null },
    })
    return groups.map(g => ({ status: g.status, count: g._count.id }))
  }

  async getActivityTrend(days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const logs = await this.prisma.activityLog.findMany({
      where: { createdAt: { gte: since } },
      select: { type: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    // Group by hour
    const buckets: Record<string, { time: string; licenses: number; devices: number; playbacks: number }> = {}
    for (const log of logs) {
      const hour = new Date(log.createdAt)
      hour.setMinutes(0, 0, 0)
      const key = hour.toISOString()
      if (!buckets[key]) buckets[key] = { time: hour.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }), licenses: 0, devices: 0, playbacks: 0 }
      if (log.type === 'VERIFY_OK' || log.type === 'PLUGIN_SESSION') buckets[key].licenses++
      if (log.type === 'DEVICE_REGISTERED') buckets[key].devices++
      if (log.type === 'PLAYBACK_START') buckets[key].playbacks++
    }

    return Object.values(buckets)
  }

  async getTopPlugins(limit = 10) {
    return this.prisma.plugin.findMany({
      where: { isEnabled: true },
      orderBy: { downloadCount: 'desc' },
      take: limit,
      select: { id: true, slug: true, name: true, iconUrl: true, downloadCount: true, version: true },
    })
  }

  async getHourlyRequests() {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const logs = await this.prisma.activityLog.findMany({
      where: { createdAt: { gte: dayAgo } },
      select: { createdAt: true, type: true },
    })

    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}h`, requests: 0, errors: 0 }))
    for (const log of logs) {
      const h = new Date(log.createdAt).getHours()
      hours[h].requests++
      if (log.type === 'VERIFY_FAIL' || log.type === 'ABUSE_DETECTED') hours[h].errors++
    }
    return hours
  }

  async getGeoDistribution(limit = 8) {
    const groups = await this.prisma.activityLog.groupBy({
      by: ['country'],
      _count: { id: true },
      where: { country: { not: null }, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    })
    const total = groups.reduce((s, g) => s + g._count.id, 0)
    return groups.map(g => ({ country: g.country ?? 'Unknown', count: g._count.id, pct: total > 0 ? Math.round((g._count.id / total) * 100) : 0 }))
  }

  async getRecentActivity(limit = 20) {
    return this.prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async getSecurityStats() {
    const [open, high, week] = await Promise.all([
      this.prisma.securityEvent.count({ where: { resolved: false } }),
      this.prisma.securityEvent.count({ where: { resolved: false, severity: { in: ['HIGH', 'CRITICAL'] } } }),
      this.prisma.securityEvent.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    ])
    return { openAlerts: open, highSeverity: high, lastWeek: week }
  }
}
