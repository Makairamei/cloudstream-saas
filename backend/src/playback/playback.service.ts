import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class PlaybackService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const where: any = {}
    // Hide soft-deleted by default
    if (!query.includeDeleted) where.deletedAt = null
    if (query.licenseKey) where.licenseKey = query.licenseKey
    if (query.pluginSlug) where.pluginSlug = { contains: query.pluginSlug, mode: 'insensitive' }
    if (query.search) {
      where.OR = [
        { licenseKey: { contains: query.search, mode: 'insensitive' } },
        { pluginSlug: { contains: query.search, mode: 'insensitive' } },
        { videoTitle: { contains: query.search, mode: 'insensitive' } },
        { ip: { contains: query.search } },
      ]
    }

    const page = parseInt(query.page) || 1
    const limit = Math.min(parseInt(query.limit) || 20, 200)

    const [total, items] = await Promise.all([
      this.prisma.playbackLog.count({ where }),
      this.prisma.playbackLog.findMany({
        where,
        include: {
          license: { select: { key: true, name: true } },
          device: { select: { name: true, model: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    const decorated = items.map(p => ({
      id: p.id,
      licenseKey: p.licenseKey,
      licenseName: p.license?.name ?? null,
      pluginSlug: p.pluginSlug,
      pluginName: p.pluginSlug,
      contentTitle: p.videoTitle,
      videoUrl: p.videoUrl,
      deviceName: p.device?.name ?? null,
      deviceModel: p.device?.model ?? null,
      ip: p.ip,
      country: p.country,
      durationSeconds: p.duration,
      playedAt: p.createdAt,
      createdAt: p.createdAt,
    }))

    return { total, items: decorated, page, limit }
  }

  async stats() {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [total, today, uniqueViewers, byPlugin] = await Promise.all([
      this.prisma.playbackLog.count(),
      this.prisma.playbackLog.count({ where: { createdAt: { gte: dayAgo } } }),
      this.prisma.playbackLog.groupBy({ by: ['licenseKey'], _count: { id: true } }).then(g => g.length),
      this.prisma.playbackLog.groupBy({
        by: ['pluginSlug'],
        _count: { id: true },
        where: { createdAt: { gte: dayAgo } },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ])
    return { total, today, uniqueViewers, topPlugins: byPlugin.map(g => ({ plugin: g.pluginSlug, count: g._count.id })) }
  }
}