import { IsString, IsEmail, IsOptional, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string
}
