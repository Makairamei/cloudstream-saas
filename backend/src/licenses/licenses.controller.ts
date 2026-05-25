import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { LicensesService } from './licenses.service'
import { CreateLicenseDto } from './dto/create-license.dto'
import { UpdateLicenseDto } from './dto/update-license.dto'
import { ListLicensesDto } from './dto/list-licenses.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator'

@ApiTags('licenses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('licenses')
export class LicensesController {
  constructor(private readonly service: LicensesService) {}

  @Get()
  findAll(@Query() dto: ListLicensesDto) {
    return this.service.findAll(dto)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateLicenseDto, @CurrentAdmin() admin: any) {
    return this.service.create(dto, admin.id)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLicenseDto, @CurrentAdmin() admin: any) {
    return this.service.update(id, dto, admin.id)
  }

  @Patch(':id/revoke')
  revoke(@Param('id') id: string, @Body('reason') reason: string, @CurrentAdmin() admin: any) {
    return this.service.revoke(id, reason, admin.id)
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string, @CurrentAdmin() admin: any) {
    return this.service.restore(id, admin.id)
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string, @CurrentAdmin() admin: any) {
    return this.service.activate(id, admin.id)
  }

  @Patch(':id/renew')
  renew(@Param('id') id: string, @Body('days') days: number, @CurrentAdmin() admin: any) {
    return this.service.renew(id, days || 30, admin.id)
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  bulk(@Body('action') action: string, @Body('ids') ids: string[], @CurrentAdmin() admin: any) {
    return this.service.bulk(action, ids, admin.id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentAdmin() admin: any) {
    return this.service.remove(id, admin.id)
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verify(@Body('key') key: string, @Body('deviceHash') deviceHash: string) {
    return this.service.verify(key, deviceHash)
  }
}
