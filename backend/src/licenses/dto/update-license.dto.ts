import { PartialType } from '@nestjs/swagger'
import { CreateLicenseDto } from './create-license.dto'
import { IsOptional, IsEnum } from 'class-validator'

export class UpdateLicenseDto extends PartialType(CreateLicenseDto) {
  @IsOptional()
  @IsEnum(['ACTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED', 'TRIAL', 'EXPIRING_SOON'])
  status?: string
}
