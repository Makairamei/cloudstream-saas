import {
  Controller, Get, Post, Body, Param, Query, Req, Res,
  Headers, HttpCode, HttpStatus, Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { PublicApiService } from './public-api.service'
import * as https from 'https'
import * as http from 'http'

// ─────────────────────────────────────────────────────────────
// Helper: extract real client IP from forwarded headers
// ─────────────────────────────────────────────────────────────
function clientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim()
  return req.ip ?? req.socket?.remoteAddress ?? ''
}

function isBot(ua: string): boolean {
  return /TelegramBot|Googlebot|Bingbot|YandexBot|Slackbot|WhatsApp|Discordbot|LinkedInBot|Applebot|Bytespider/i.test(ua)
}

function getServerUrl(req: Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim()
    || (process.env.SERVER_URL ? '' : req.protocol)
  if (process.env.SERVER_URL) return process.env.SERVER_URL.replace(/\/$/, '')
  return `${proto}://${req.get('host')}`
}

// ─────────────────────────────────────────────────────────────
// All routes below are excluded from the global api/v1 prefix
// ─────────────────────────────────────────────────────────────

@Controller()
export class PublicApiController {
  private readonly logger = new Logger(PublicApiController.name)

  constructor(private readonly service: PublicApiService) {}

  // ── Health & config ──────────────────────────────────────

  @Get('api/health')
  health(@Req() req: Request) {
    return { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() }
  }


  // ── License validate (initial activation) ───────────────

  @Post('api/validate')
  @HttpCode(HttpStatus.OK)
  async validate(@Body() body: any, @Req() req: Request) {
    const key = (body.key ?? '').trim()
    const deviceId = (body.device_id ?? '').trim()
    const deviceModel = (body.device_name ?? body.device_model ?? '').trim()
    const ua = req.headers['user-agent'] ?? ''

    if (!deviceId) return { status: 'error', message: 'Device ID required. Please enter Repo URL first.' }
    if (!key) return { status: 'error', message: 'License key required' }

    const result = await this.service.verifyAndTrack({
      key, fingerprint: deviceId, deviceModel,
      pluginName: '', action: 'VALIDATE', data: '',
      ip: clientIp(req), ua,
    })

    if (!result.ok) return { status: 'error', message: result.message, reason: result.reason }
    return { status: 'active', message: 'License valid', days_left: result.daysLeft, expires_at: result.expiresAt }
  }

  // ── Main plugin API (unified verify + track) ────────────

  @Post('api/verify_activity')
  @HttpCode(HttpStatus.OK)
  async verifyActivity(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store')
    const key = (body.key ?? '').trim()
    const deviceId = (body.device_id ?? '').trim()
    const deviceModel = (body.device_model ?? '').trim()
    const pluginName = (body.plugin_name ?? '').trim()
    const action = (body.action ?? 'OPEN').toUpperCase()
    const data = (body.data ?? '').trim()
    const ua = req.headers['user-agent'] ?? ''

    const result = await this.service.verifyAndTrack({
      key, fingerprint: deviceId, deviceModel,
      pluginName, action, data,
      ip: clientIp(req), ua,
    })

    if (!result.ok) return { status: 'error', message: result.message, reason: result.reason }
    return { status: 'active', message: 'Valid', days_left: result.daysLeft }
  }

  // ── Legacy check-ip (GET variant used by older plugins) ──

  @Get('api/check-ip')
  async checkIp(@Query() q: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store')
    const key = (q.key ?? '').trim()
    const deviceId = (q.device_id ?? '').trim()
    const pluginName = (q.plugin ?? '').trim()
    const action = (q.action ?? 'CHECK').toUpperCase()
    const data = (q.data ?? '').trim()
    const ua = req.headers['user-agent'] ?? ''

    if (!deviceId) return { status: 'error', message: 'Device ID tidak valid. Update plugin terbaru.' }

    const result = await this.service.verifyAndTrack({
      key, fingerprint: deviceId, deviceModel: '',
      pluginName, action, data,
      ip: clientIp(req), ua,
    })

    if (!result.ok) return { status: 'error', message: result.message, reason: result.reason }
    return { status: 'active', message: 'Valid', days_left: result.daysLeft, expiry: result.expiresAt }
  }

  // ── Heartbeat ────────────────────────────────────────────

  @Post('api/heartbeat')
  @HttpCode(HttpStatus.OK)
  async heartbeat(@Body() body: any, @Req() req: Request) {
    const key = (body.key ?? '').trim()
    const deviceId = (body.device_id ?? '').trim()

    if (!key || !deviceId) return { status: 'error', message: 'Key and device_id required' }

    const result = await this.service.heartbeat({ key, fingerprint: deviceId, ip: clientIp(req) })
    if (!result.ok) return { status: 'error', reason: result.reason }
    return { status: 'active', days_left: result.daysLeft }
  }

  // ── Auto-discover license from device/IP ─────────────────

  @Get('api/discover')
  async discover(@Query() q: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.setHeader('Pragma', 'no-cache')

    const deviceId = (q.device_id ?? '').trim()

    if (!deviceId || deviceId.toLowerCase() === 'unknown') {
      return { status: 'error', message: 'Device ID tidak valid.' }
    }

    const result = await this.service.discoverLicense({ fingerprint: deviceId, ip: clientIp(req) })
    return result
  }

  // ── Plugin session JWT ───────────────────────────────────

  @Post('api/plugin/session')
  @HttpCode(HttpStatus.OK)
  async pluginSession(@Body() body: any, @Req() req: Request) {
    const key = (body.key ?? '').trim()
    const deviceId = (body.device_id ?? '').trim()
    const deviceModel = (body.device_model ?? '').trim()
    const pluginName = (body.plugin_name ?? '').trim()
    const ua = req.headers['user-agent'] ?? ''

    const result = await this.service.issuePluginSession({
      key, fingerprint: deviceId, deviceModel, pluginName,
      ip: clientIp(req), ua,
    })

    if (!result.ok) return { status: 'error', message: result.message }
    return { status: 'ok', session_token: result.token, expires_in: result.expiresIn, plugin_name: pluginName }
  }

  // ── Plugin selectors (requires plugin session JWT) ───────

  @Post('api/selectors')
  @HttpCode(HttpStatus.OK)
  async selectors(
    @Body() body: any,
    @Headers('authorization') authHeader: string,
    @Headers('x-plugin-session') sessionHeader: string,
    @Req() req: Request,
  ) {
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : sessionHeader
    if (!token) return { status: 'error', message: 'Plugin session required' }

    const { valid, payload, error } = this.service.verifyPluginToken(token)
    if (!valid) return { status: 'error', message: error }

    const pluginName = payload.plugin_name ?? (body.plugin_name ?? '')
    const result = await this.service.getSelectors(pluginName)
    if (!result.ok) return { status: 'error', message: result.message }

    return { status: 'ok', plugin: pluginName, selectors: result.selectors, expires_at: Date.now() + 60_000 }
  }

  // ── Plugin API secrets ───────────────────────────────────

  @Post('api/secret')
  @HttpCode(HttpStatus.OK)
  async secret(
    @Body() body: any,
    @Headers('authorization') authHeader: string,
    @Headers('x-plugin-session') sessionHeader: string,
  ) {
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : sessionHeader
    if (!token) return { status: 'error', message: 'Plugin session required' }

    const { valid, payload, error } = this.service.verifyPluginToken(token)
    if (!valid) return { status: 'error', message: error }

    const pluginName = payload.plugin_name ?? ''
    const result = await this.service.getSecretKeys(pluginName)
    if (!result.ok) return { status: 'error', message: result.message }

    return { status: 'ok', ...result.keys }
  }

  // ── CloudStream repo manifest ────────────────────────────

  @Get('r/:key/repo.json')
  async repoJson(@Param('key') key: string, @Req() req: Request, @Res() res: Response) {
    const serverUrl = getServerUrl(req)
    const result = await this.service.getRepoManifest(key, serverUrl, clientIp(req))
    if (!result.ok) return res.status(403).json({ status: 'error', message: result.message })
    return res.json(result.data)
  }

  @Get('r/:key/:token/repo.json')
  async repoJsonToken(
    @Param('key') key: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.repoJson(key, req, res)
  }

  // ── Legacy aliases ────────────────────────────────────────

  @Get('plugin/:key/repo.json')
  redirectRepo(@Param('key') key: string, @Res() res: Response) {
    return res.redirect(302, `/r/${encodeURIComponent(key)}/repo.json`)
  }

  @Get('plugin/:key/plugins.json')
  redirectPlugins(@Param('key') key: string, @Res() res: Response) {
    return res.redirect(302, `/r/${encodeURIComponent(key)}/plugins.json`)
  }

  // ── CloudStream plugin list ───────────────────────────────

  @Get('r/:key/plugins.json')
  async pluginsJson(@Param('key') key: string, @Req() req: Request, @Res() res: Response) {
    const serverUrl = getServerUrl(req)
    const result = await this.service.getPluginsList(key, serverUrl, clientIp(req))
    if (!result.ok) return res.status(403).json({ status: 'error', message: result.message })
    return res.json(result.plugins)
  }

  @Get('r/:key/:token/plugins.json')
  async pluginsJsonToken(
    @Param('key') key: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.pluginsJson(key, req, res)
  }

  // ── Plugin .cs3 file proxy (via GitHub raw) ──────────────

  @Get('r/:key/:filename')
  async servePlugin(
    @Param('key') key: string,
    @Param('filename') filename: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '')
    if (!safeFilename || safeFilename === 'repo.json' || safeFilename === 'plugins.json') {
      return res.status(404).send('Not found')
    }

    const ua = req.headers['user-agent'] ?? ''
    if (isBot(ua)) return res.status(403).send('Forbidden')

    // Validate license
    const serverUrl = `${req.protocol}://${req.get('host')}`
    const manifest = await this.service.getRepoManifest(key, serverUrl)
    if (!manifest.ok) return res.status(403).send(manifest.message)

    // Resolve download URL: use fileUrl from DB if available, fallback to GitHub
    const slug = safeFilename.replace(/\.cs3$/i, '')
    const pluginFileUrl = await this.service.resolvePluginFileUrl(slug, safeFilename)

    this.logger.log(`Serving plugin: ${safeFilename} for key ${key} -> ${pluginFileUrl}`)

    const client = pluginFileUrl.startsWith('https') ? https : http
    const request = client.get(pluginFileUrl, { headers: { 'User-Agent': 'CloudStreamSaaS/2.0' } }, (response) => {
      if (response.statusCode !== 200) {
        return res.status(404).send('Plugin not found')
      }
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`)
      res.setHeader('Content-Type', 'application/octet-stream')
      if (response.headers['content-length']) {
        res.setHeader('Content-Length', response.headers['content-length'])
      }
      response.pipe(res)
    })
    request.on('error', () => res.status(500).send('Download error'))
  }

  @Get('r/:key/:token/:filename')
  async servePluginToken(
    @Param('key') key: string,
    @Param('filename') filename: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.servePlugin(key, filename, req, res)
  }
}
