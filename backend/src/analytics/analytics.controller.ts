import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AnalyticsService } from './analytics.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
@ApiTags('analytics') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}
  @Get('overview')   getOverview()    { return this.service.getOverview() }
  @Get('licenses')   getLicenseStats(){ return this.service.getLicenseStats() }
  @Get('trend')      getTrend(@Query('range') range?: string) { const r = (['today','7d','30d','1y'].includes(range ?? '') ? range : 'today') as 'today' | '7d' | '30d' | '1y'; return this.service.getActivityTrend(r) }
  @Get('plugins')    getTopPlugins(@Query('limit') limit?: string, @Query('days') days?: string) { return this.service.getTopPlugins(limit ? +limit : 10, days ? +days : 30) }
  @Get('hourly')     getHourly()      { return this.service.getHourlyRequests() }
  @Get('geo')        getGeo(@Query('limit') limit?: number) { return this.service.getGeoDistribution(limit ? +limit : 8) }
  @Get('activity')   getActivity(@Query('limit') limit: number) { return this.service.getRecentActivity(limit) }
  @Get('security')   getSecurity()    { return this.service.getSecurityStats() }
  @Get('top-active') getTopActive(@Query('limit') limit?: number) { return this.service.getTopActiveLicenses(limit ? +limit : 5) }
}