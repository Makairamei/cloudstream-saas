import { IsString, IsEmail, IsOptional, IsInt, IsBoolean, IsArray, IsDateString, Min, Max } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateLicenseDto {
  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  key?: string

  @ApiProperty()
  @IsString()
  name: string

  @ApiProperty({ required: false })
  @IsOptional() @IsEmail()
  email?: string

  @ApiProperty({ required: false, default: 3 })
  @IsOptional() @IsInt() @Min(1) @Max(100)
  maxDevices?: number

  @ApiProperty({ required: false, default: 7 })
  @IsOptional() @IsInt() @Min(0)
  gracePeriodDays?: number

  @ApiProperty({ required: false })
  @IsOptional() @IsBoolean()
  isTrial?: boolean

  @ApiProperty({ required: false })
  @IsOptional() @IsDateString()
  expiresAt?: string

  @ApiProperty({ required: false, type: [String] })
  @IsOptional() @IsArray()
  allowedPlugins?: string[]

  @ApiProperty({ required: false, type: [String] })
  @IsOptional() @IsArray()
  tags?: string[]

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  notes?: string

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  resellerId?: string
}
