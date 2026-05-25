import { Controller, Get, Patch, Delete, Post, Param, Query, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { DevicesService } from './devices.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator'

@ApiTags('devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(private readonly service: DevicesService) {}

  @Get() findAll(@Query() query: any) { return this.service.findAll(query) }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id) }
  @Patch(':id/block') block(@Param('id') id: string, @Body('reason') reason: string, @CurrentAdmin() a: any) { return this.service.block(id, reason, a.id) }
  @Patch(':id/unblock') unblock(@Param('id') id: string, @CurrentAdmin() a: any) { return this.service.unblock(id, a.id) }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) remove(@Param('id') id: string) { return this.service.remove(id) }
  @Post('bulk') @HttpCode(HttpStatus.OK) bulk(@Body('action') action: string, @Body('ids') ids: string[], @CurrentAdmin() a: any) { return this.service.bulk(action, ids, a.id) }
}
