import { Controller, Get, Post, Put, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { PluginsService } from './plugins.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator'

@ApiTags('plugins') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Controller('plugins')
export class PluginsController {
  constructor(private readonly service: PluginsService) {}
  @Get() findAll(@Query() q: any) { return this.service.findAll(q) }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id) }
  @Post() create(@Body() body: any, @CurrentAdmin() a: any) { return this.service.create(body, a?.id) }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any, @CurrentAdmin() a: any) { return this.service.update(id, body, a?.id) }
  @Put(':id') updateFull(@Param('id') id: string, @Body() body: any, @CurrentAdmin() a: any) { return this.service.update(id, body, a?.id) }
  @Delete(':id') remove(@Param('id') id: string, @CurrentAdmin() a: any) { return this.service.remove(id, a?.id) }
  @Post('validate-repo') validateRepo(@Body('url') url: string) { return this.service.validateRepo(url) }
  @Post('import') importFromRepo(@Body('url') url: string, @CurrentAdmin() a: any) { return this.service.importFromRepo(url, a?.id) }
  @Post('sync') syncFromRepo(@Body('url') url: string, @CurrentAdmin() a: any) { return this.service.syncFromRepo(url, a?.id) }
  @Post('clear') clearAll(@CurrentAdmin() a: any) { return this.service.clearAll(a?.id) }
}