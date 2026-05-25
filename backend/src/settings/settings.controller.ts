import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { SettingsService } from './settings.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
@ApiTags('settings') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}
  @Get() getAll() { return this.service.getAll() }
  @Get(':key') get(@Param('key') key: string) { return this.service.get(key) }
  @Put(':key') set(@Param('key') key: string, @Body('value') value: any) { return this.service.set(key, value) }
}
