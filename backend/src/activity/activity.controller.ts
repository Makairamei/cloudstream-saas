import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ActivityService } from './activity.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@ApiTags('activity') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Controller('activity')
export class ActivityController {
  constructor(private readonly service: ActivityService) {}
  @Get() findAll(@Query() q: any) { return this.service.findAll(q) }
  @Get('stats') getStats() { return this.service.getStats() }
}
