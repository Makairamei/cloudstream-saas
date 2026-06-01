import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'

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

  private async downloadCs3ToVps(sourceUrl: string, internalName: string): Promise<{ vpsUrl: string; size: number; filename: string }> {
    // Fast path: allow disabling mirroring to avoid timeouts on large imports
    const disableMirror = String(process.env.DISABLE_PLUGIN_MIRROR ?? 'true').toLowerCase() === 'true'
    if (disableMirror) {
      const filename = path.basename(sourceUrl.split('?')[0] || 'plugin.cs3')
      return { vpsUrl: sourceUrl, size: 0, filename }
    }
    const uploadDir = process.env.APK_UPLOAD_DIR || '/var/www/html/apk-uploads'
    try { await fs.promises.mkdir(uploadDir, { recursive: true }) } catch {}
    const ts = Date.now()
    const safe = (internalName || 'plugin').toString().replace(/[^a-zA-Z0-9_-]/g, '') || 'plugin'
    const filename = `${ts}_${safe}.cs3`
    const filepath = path.join(uploadDir, filename)

    const client = sourceUrl.startsWith('https') ? https : http
    const ua = { headers: { 'User-Agent': 'CloudStreamAdmin/2.0' } }

    await new Promise<void>((resolve, reject) => {
      const file = fs.createWriteStream(filepath)
      const req = client.get(sourceUrl, ua, (res) => {
        if (res.statusCode !== 200) { file.close(); fs.unlink(filepath, () => {}); reject(new Error(`HTTP ${res.statusCode}`)); return }
        res.pipe(file)
        file.on('finish', () => { file.close(); resolve() })
      })
      req.on('error', (err) => { file.close(); fs.unlink(filepath, () => {}); reject(err) })
      req.setTimeout(20000, () => { req.destroy(new Error('timeout')) })
    })

    const stat = await fs.promises.stat(filepath)
    const baseUrl = (process.env.SERVER_URL || 'https://faxecez.eu.org').replace(/\/$/, '')
    return { vpsUrl: `${baseUrl}/apk/${filename}`, size: stat.size, filename }
  }

  async findOne(id: string) {
    const plugin = await this.prisma.plugin.findFirst({ where: { OR: [{ id }, { slug: id }] } })
    if (!plugin) throw new NotFoundException('Plugin not found')
    return plugin
  }

  async create(data: any, adminId?: string) {
    const plugin = await this.prisma.plugin.create({ data })
    if (adminId) {
      await this.prisma.adminLog.create({
        data: { adminId, action: 'CREATE_PLUGIN', target: plugin.name, targetType: 'PLUGIN', details: { slug: plugin.slug } as any },
      }).catch(() => {})
    }
    return plugin
  }
  async update(id: string, data: any, adminId?: string) {
    const before = await this.prisma.plugin.findUnique({ where: { id } })
    const plugin = await this.prisma.plugin.update({ where: { id }, data })
    if (adminId) {
      const diff: any = {}
      if (before) {
        for (const k of Object.keys(data)) {
          if (JSON.stringify((before as any)[k]) !== JSON.stringify((data as any)[k])) {
            diff[k] = { from: (before as any)[k], to: (data as any)[k] }
          }
        }
      }
      await this.prisma.adminLog.create({
        data: { adminId, action: 'UPDATE_PLUGIN', target: plugin.name, targetType: 'PLUGIN', diff: diff as any },
      }).catch(() => {})
    }
    return plugin
  }
  async remove(id: string, adminId?: string) {
    const plugin = await this.prisma.plugin.findUnique({ where: { id } })
    await this.prisma.plugin.delete({ where: { id } })
    if (adminId && plugin) {
      await this.prisma.adminLog.create({
        data: { adminId, action: 'DELETE_PLUGIN', target: plugin.name, targetType: 'PLUGIN', details: { slug: plugin.slug } as any },
      }).catch(() => {})
    }
    return { id }
  }

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
      size: 0,
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

  async importFromRepo(url: string, adminId?: string) {
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
        // Mirror to VPS when possible
        if (data.fileUrl) {
          try {
            const info = await this.downloadCs3ToVps(data.fileUrl, p.internalName || data.slug)
            data.fileUrl = info.vpsUrl
            data.size = info.size
          } catch (_) {
            // keep original URL on failure
          }
        }
        await this.prisma.plugin.upsert({
          where: { slug: data.slug },
          update: { name: data.name, description: data.description, version: data.version,
            category: data.category, fileUrl: data.fileUrl, size: data.size, iconUrl: data.iconUrl, metadata: data.metadata },
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

  async clearAll(adminId?: string) {
    await this.prisma.pluginUsageLog.deleteMany()
    await this.prisma.pluginVersion.deleteMany()
    const { count } = await this.prisma.plugin.deleteMany()
    if (adminId) await this.prisma.adminLog.create({ data: { adminId, action: 'DELETE_PLUGIN' as any, target: 'all plugins (clear)', targetType: 'PLUGIN', details: { count } as any } }).catch(() => {})

    return { deleted: count }
  }

  async syncFromRepo(url: string, adminId?: string) {
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
        const data = this.normalizePlugin(p)
        if (data.fileUrl) {
          try {
            const info = await this.downloadCs3ToVps(data.fileUrl, p.internalName || data.slug)
            data.fileUrl = info.vpsUrl
            data.size = info.size
          } catch (_) {}
        }
        await this.prisma.plugin.create({ data })
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
