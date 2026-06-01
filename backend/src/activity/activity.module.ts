import { Module } from '@nestjs/common'
import { ActivityController } from './activity.controller'
import { ActivityService } from './activity.service'
import { SettingsModule } from '../settings/settings.module'

@Module({
  imports: [SettingsModule],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}