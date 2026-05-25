import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as https from 'https'
import * as http from 'http'

@Injectable()
export class PluginsService {
  constructor(private prisma: PrismaService) {}

  findAll(query: any) {
    const skip = query.page ? (parseInt(query.page) - 1) * parseInt(query.limit || 50) : 0
    const take = parseInt(query.limit || 50)
    const where: any = {}
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' }
    return this.prisma.plugin.findMany({ where, orderBy: { downloadCount: 'desc' }, skip, take })
      .then(items => this.prisma.plugin.count({ where }).then(total => ({ items, total })))
  }

  async findOne(id: string) {
    const plugin = await this.prisma.plugin.findFirst({ where: { OR: [{ id }, { slug: id }] } })
    if (!plugin) throw new NotFoundException('Plugin not found')
    return plugin
  }

  create(data: any) { return this.prisma.plugin.create({ data }) }
  update(id: string, data: any) { return this.prisma.plugin.update({ where: { id }, data }) }
  remove(id: string) { return this.prisma.plugin.delete({ where: { id } }) }

  private fetchUrl(url: string, timeoutMs = 15000): Promise<any> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http
      const req = client.get(url, { headers: { 'User-Agent': 'CloudStreamAdmin/2.0' } }, (res) => {
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return }
        let data = ''
        res.on('data', c => { data += c })
        res.on('end', () => {
          try { resolve(JSON.parse(data)) }
          catch { reject(new Error('Invalid JSON response')) }
        })
      })
      req.on('error', reject)
      req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Request timeout')) })
    })
  }

  private normalizePlugin(p: any) {
    const slug = (p.internalName || p.slug || p.name || '').toLowerCase().replace(/[^a-z0-9-]/g, '-')
    return {
      slug,
      name: p.name || p.internalName || slug,
      description: p.description || '',
      version: String(p.version || '1.0.0'),
      category: (p.tvTypes?.[0] || p.types?.[0] || p.category || 'General'),
      fileUrl: p.url || p.fileUrl || null,
      iconUrl: p.iconUrl || null,
      isEnabled: true,
      metadata: {
        authors: p.authors || [],
        language: p.language || p.lang || 'id',
        tvTypes: p.tvTypes || p.types || [],
        internalName: p.internalName || slug,
        status: p.status ?? 1,
      },
    }
  }

  async validateRepo(url: string) {
    if (!url) throw new BadRequestException('URL is required')
    const json = await this.fetchUrl(url)
    const list: any[] = Array.isArray(json) ? json : (json.plugins || json.data || [])
    if (!Array.isArray(list)) throw new BadRequestException('URL must return a JSON array')
    return {
      valid: true,
      count: list.length,
      preview: list.slice(0, 10).map(p => ({
        name: p.name || p.internalName,
        version: p.version,
        iconUrl: p.iconUrl || null,
        description: p.description || '',
      })),
    }
  }

  async importFromRepo(url: string) {
    if (!url) throw new BadRequestException('URL is required')
    const json = await this.fetchUrl(url)
    const list: any[] = Array.isArray(json) ? json : (json.plugins || json.data || [])
    if (!Array.isArray(list)) throw new BadRequestException('URL must return a JSON array')

    let imported = 0, skipped = 0
    const errors: string[] = []

    for (const p of list) {
      if (!p.internalName && !p.name) { skipped++; continue }
      try {
        const data = this.normalizePlugin(p)
        await this.prisma.plugin.upsert({
          where: { slug: data.slug },
          update: { name: data.name, description: data.description, version: data.version,
            category: data.category, fileUrl: data.fileUrl, iconUrl: data.iconUrl, metadata: data.metadata },
          create: data,
        })
        imported++
      } catch (e: any) {
        errors.push(`${p.internalName || p.name}: ${e.message}`)
        skipped++
      }
    }

    const plugins = await this.prisma.plugin.findMany({ orderBy: { downloadCount: 'desc' } })
    return { imported, skipped, errors, total: plugins.length, items: plugins }
  }

  async clearAll() {
    await this.prisma.pluginUsageLog.deleteMany()
    await this.prisma.pluginVersion.deleteMany()
    const { count } = await this.prisma.plugin.deleteMany()
    return { deleted: count }
  }

  async syncFromRepo(url: string) {
    if (!url) throw new BadRequestException('URL is required')
    const json = await this.fetchUrl(url)
    const list: any[] = Array.isArray(json) ? json : (json.plugins || json.data || [])
    if (!Array.isArray(list)) throw new BadRequestException('URL must return a JSON array')

    const deleted = await this.prisma.plugin.count()
    await this.prisma.pluginUsageLog.deleteMany()
    await this.prisma.pluginVersion.deleteMany()
    await this.prisma.plugin.deleteMany()

    let imported = 0, skipped = 0
    const errors: string[] = []

    for (const p of list) {
      if (!p.internalName && !p.name) { skipped++; continue }
      try {
        await this.prisma.plugin.create({ data: this.normalizePlugin(p) })
        imported++
      } catch (e: any) {
        errors.push(`${p.internalName || p.name}: ${e.message}`)
        skipped++
      }
    }

    const plugins = await this.prisma.plugin.findMany({ orderBy: { downloadCount: 'desc' } })
    return { deleted, imported, skipped, errors, total: plugins.length, items: plugins }
  }
}
