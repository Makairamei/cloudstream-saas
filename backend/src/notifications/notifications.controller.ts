import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { NotificationsService } from './notifications.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
@ApiTags('notifications') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}
  @Get() findAll(@Query() q: any) { return this.service.findAll(q) }
  @Get('unread-count') unreadCount() { return this.service.getUnreadCount() }
  @Patch(':id/read') markRead(@Param('id') id: string) { return this.service.markRead(id) }
  @Patch('read-all') markAllRead() { return this.service.markAllRead() }
}
