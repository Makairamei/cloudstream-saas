import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name)
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  findAll(query: any) {
    const where: any = {}
    if (!query.includeDeleted) where.deletedAt = null
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

  // Auto-purge activity & playback logs older than configured retention (default 30 days).
  // Runs daily at 03:00 server time.
  @Cron('0 3 * * *')
  async purgeOldLogs() {
    try {
      const retention = await this.settings.getValue<number>('log_retention_days', 30)
      if (retention <= 0) return // 0 = keep forever

      const cutoff = new Date(Date.now() - retention * 86_400_000)

      const [activity, playback] = await Promise.all([
        this.prisma.activityLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
        this.prisma.playbackLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
      ])

      this.logger.log(`Purged old logs (retention ${retention}d): ${activity.count} activity + ${playback.count} playback`)
      return { retention, activityPurged: activity.count, playbackPurged: playback.count, cutoff }
    } catch (e) {
      this.logger.warn('purgeOldLogs failed', e as any)
    }
  }

  // Manual trigger (called by admin via endpoint)
  async runPurgeNow() {
    return this.purgeOldLogs()
  }
}