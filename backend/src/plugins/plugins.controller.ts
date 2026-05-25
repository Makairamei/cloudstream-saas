import { Controller, Get, Post, Put, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { PluginsService } from './plugins.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@ApiTags('plugins') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Controller('plugins')
export class PluginsController {
  constructor(private readonly service: PluginsService) {}
  @Get() findAll(@Query() q: any) { return this.service.findAll(q) }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id) }
  @Post() create(@Body() body: any) { return this.service.create(body) }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body) }
  @Put(':id') updateFull(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body) }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id) }
  @Post('validate-repo') validateRepo(@Body('url') url: string) { return this.service.validateRepo(url) }
  @Post('import') importFromRepo(@Body('url') url: string) { return this.service.importFromRepo(url) }
  @Post('sync') syncFromRepo(@Body('url') url: string) { return this.service.syncFromRepo(url) }
  @Post('clear') clearAll() { return this.service.clearAll() }
}
