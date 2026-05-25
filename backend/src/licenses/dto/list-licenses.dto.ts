import { IsOptional, IsString, IsInt, IsEnum, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class ListLicensesDto {
  @IsOptional() @IsString()
  search?: string

  @IsOptional()
  @IsEnum(['ACTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED', 'TRIAL', 'EXPIRING_SOON'])
  status?: string

  @IsOptional() @IsString()
  tag?: string

  @IsOptional() @IsString()
  sortBy?: string

  @IsOptional() @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc'

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000)
  limit?: number
}
