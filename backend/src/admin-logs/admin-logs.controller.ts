import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AdminLogsService } from './admin-logs.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
@ApiTags('admin-logs') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Controller('admin-logs')
export class AdminLogsController {
  constructor(private readonly service: AdminLogsService) {}
  @Get() findAll(@Query() q: any) { return this.service.findAll(q) }
}
