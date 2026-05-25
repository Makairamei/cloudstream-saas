import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { ScheduleModule } from '@nestjs/schedule'
import { PrismaModule } from './prisma/prisma.module'
import { RedisModule } from './redis/redis.module'
import { AuthModule } from './auth/auth.module'
import { LicensesModule } from './licenses/licenses.module'
import { DevicesModule } from './devices/devices.module'
import { PluginsModule } from './plugins/plugins.module'
import { ActivityModule } from './activity/activity.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { SecurityModule } from './security/security.module'
import { AdminLogsModule } from './admin-logs/admin-logs.module'
import { SettingsModule } from './settings/settings.module'
import { WebsocketModule } from './websocket/websocket.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PublicApiModule } from './public-api/public-api.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    LicensesModule,
    DevicesModule,
    PluginsModule,
    ActivityModule,
    AnalyticsModule,
    SecurityModule,
    AdminLogsModule,
    SettingsModule,
    WebsocketModule,
    NotificationsModule,
    PublicApiModule,
  ],
})
export class AppModule {}
