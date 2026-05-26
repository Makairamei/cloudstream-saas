import {
  Controller, Post, Get, Patch, Body, Req, Res, UseGuards,
  HttpCode, HttpStatus, Headers,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { CurrentAdmin } from './decorators/current-admin.decorator'
import type { Request } from 'express'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.ip, req.headers['user-agent'])
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto)
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentAdmin() admin: { id: string },
    @Body('refreshToken') refreshToken?: string,
  ) {
    return this.authService.logout(admin.id, refreshToken)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async me(@CurrentAdmin() admin: { id: string }) {
    return this.authService.getMe(admin.id)
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateProfile(
    @CurrentAdmin() admin: { id: string },
    @Body() dto: UpdateProfileDto,
    @Req() req: Request,
  ) {
    return this.authService.updateProfile(admin.id, dto, req.ip, req.headers['user-agent'])
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentAdmin() admin: { id: string },
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    return this.authService.changePassword(admin.id, dto, req.ip, req.headers['user-agent'])
  }
}