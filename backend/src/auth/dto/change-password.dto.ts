import { IsString, MinLength, MaxLength, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123' })
  @IsString()
  @MinLength(8)
  currentPassword: string

  @ApiProperty({
    example: 'NewStrongP@ss123',
    description: 'Min 12 chars, must contain upper, lower, digit, and special character',
  })
  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @MaxLength(128, { message: 'Password is too long' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one digit' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' })
  newPassword: string
}
