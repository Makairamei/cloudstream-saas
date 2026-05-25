import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AnalyticsService } from './analytics.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
@ApiTags('analytics') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}
  @Get('overview')  getOverview()    { return this.service.getOverview() }
  @Get('licenses')  getLicenseStats(){ return this.service.getLicenseStats() }
  @Get('trend')     getTrend(@Query('days') days: number) { return this.service.getActivityTrend(days) }
  @Get('plugins')   getTopPlugins()  { return this.service.getTopPlugins() }
  @Get('hourly')    getHourly()      { return this.service.getHourlyRequests() }
  @Get('geo')       getGeo()         { return this.service.getGeoDistribution() }
  @Get('activity')  getActivity(@Query('limit') limit: number) { return this.service.getRecentActivity(limit) }
  @Get('security')  getSecurity()    { return this.service.getSecurityStats() }
}
