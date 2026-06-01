import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { PlaybackService } from './playback.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@ApiTags('playback') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Controller('playback')
export class PlaybackController {
  constructor(private readonly service: PlaybackService) {}
  @Get() findAll(@Query() q: any) { return this.service.findAll(q) }
  @Get('stats') stats() { return this.service.stats() }
}