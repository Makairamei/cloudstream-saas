import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { SecurityService } from './security.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
@ApiTags('security') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Controller('security')
export class SecurityController {
  constructor(private readonly service: SecurityService) {}
  @Get('events') findEvents(@Query() q: any) { return this.service.findEvents(q) }
  @Get('blocked-ips') getBlockedIps() { return this.service.getBlockedIps() }
  @Post('block-ip') blockIp(@Body('ip') ip: string, @Body('reason') reason: string) { return this.service.blockIp(ip, reason) }
  @Delete('block-ip/:ip') unblockIp(@Param('ip') ip: string) { return this.service.unblockIp(ip) }
  @Patch('events/:id/resolve') resolveEvent(@Param('id') id: string) { return this.service.resolveEvent(id) }
}
