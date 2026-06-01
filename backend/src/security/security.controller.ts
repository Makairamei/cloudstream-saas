import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { SecurityService } from './security.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator'

@ApiTags('security') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Controller('security')
export class SecurityController {
  constructor(private readonly service: SecurityService) {}

  @Get('stats') stats() { return this.service.getStats() }

  @Get('events') findEvents(@Query() q: any) { return this.service.findEvents(q) }
  @Patch('events/:id/resolve') resolveEvent(@Param('id') id: string) { return this.service.resolveEvent(id) }
  @Post('events/bulk-resolve') @HttpCode(HttpStatus.OK) bulkResolve(@Body('ids') ids: string[]) { return this.service.bulkResolve(ids ?? []) }

  @Get('blocked-ips') getBlockedIps(@Query() q: any) { return this.service.getBlockedIps(q) }
  @Post('blocked-ips') @HttpCode(HttpStatus.OK) blockIp(@Body('ip') ip: string, @Body('reason') reason: string, @Body('expiresAt') expiresAt?: string) {
    return this.service.blockIp(ip, reason, expiresAt ? new Date(expiresAt) : null)
  }
  @Delete('blocked-ips/:id') @HttpCode(HttpStatus.NO_CONTENT) unblockIp(@Param('id') id: string) { return this.service.unblockIp(id) }
  @Post('blocked-ips/bulk-unblock') @HttpCode(HttpStatus.OK) bulkUnblockIps(@Body('ids') ids: string[]) { return this.service.bulkUnblockIps(ids ?? []) }

  @Get('blocked-devices') getBlockedDevices(@Query() q: any) { return this.service.getBlockedDevices(q) }
}