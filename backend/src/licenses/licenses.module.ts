import { Module } from '@nestjs/common'
import { LicensesController } from './licenses.controller'
import { LicensesService } from './licenses.service'
import { SettingsModule } from '../settings/settings.module'

@Module({
  imports: [SettingsModule],
  controllers: [LicensesController],
  providers: [LicensesService],
  exports: [LicensesService],
})
export class LicensesModule {}