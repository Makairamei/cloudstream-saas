import { IsEmail, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ example: 'admin@cloudstream.app' })
  @IsEmail()
  email: string

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  twoFactorCode?: string
}
