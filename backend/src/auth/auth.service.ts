import {
  Injectable, UnauthorizedException, ForbiddenException,
  ConflictException, NotFoundException, BadRequestException, Inject,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { REDIS_CLIENT } from '../redis/redis.module'
import Redis from 'ioredis'
import * as bcrypt from 'bcryptjs'
import { LoginDto } from './dto/login.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { nanoid } from 'nanoid'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async validateAdmin(email: string, password: string) {
    const admin = await this.prisma.admin.findUnique({ where: { email } })
    if (!admin || !admin.isActive) throw new UnauthorizedException('Invalid credentials')
    const valid = await bcrypt.compare(password, admin.password)
    if (!valid) throw new UnauthorizedException('Invalid credentials')
    return admin
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const admin = await this.validateAdmin(dto.email, dto.password)

    const accessToken = this.signAccessToken(admin.id, admin.email, admin.role)
    const refreshToken = nanoid(64)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await this.prisma.adminSession.create({
      data: { adminId: admin.id, refreshToken, ip, userAgent, expiresAt },
    })

    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    })

    await this.prisma.adminLog.create({
      data: { adminId: admin.id, action: 'LOGIN', ip, userAgent },
    })

    const { password: _, ...adminData } = admin
    return { user: adminData, accessToken, refreshToken }
  }

  async refresh(dto: RefreshTokenDto) {
    const session = await this.prisma.adminSession.findUnique({
      where: { refreshToken: dto.refreshToken },
      include: { admin: true },
    })

    if (!session || session.expiresAt < new Date()) {
      if (session) await this.prisma.adminSession.delete({ where: { id: session.id } })
      throw new UnauthorizedException('Session expired')
    }

    if (!session.admin.isActive) throw new ForbiddenException('Account deactivated')

    const accessToken = this.signAccessToken(session.admin.id, session.admin.email, session.admin.role)
    const { password: _, ...adminData } = session.admin
    return { user: adminData, accessToken }
  }

  async logout(adminId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.adminSession.deleteMany({ where: { refreshToken } })
    } else {
      await this.prisma.adminSession.deleteMany({ where: { adminId } })
    }

    await this.prisma.adminLog.create({
      data: { adminId, action: 'LOGOUT' },
    })
  }

  async getMe(adminId: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } })
    if (!admin) throw new NotFoundException('Admin not found')
    const { password: _, ...data } = admin
    return data
  }

  // ─────────────────────────────────────────────────────────────
  // Profile / password management (called by authenticated admin)
  // ─────────────────────────────────────────────────────────────

  async changePassword(adminId: string, dto: ChangePasswordDto, ip?: string, userAgent?: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } })
    if (!admin || !admin.isActive) throw new UnauthorizedException('Account inactive')

    const valid = await bcrypt.compare(dto.currentPassword, admin.password)
    if (!valid) throw new BadRequestException('Current password is incorrect')

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must differ from current password')
    }

    const sameAsOld = await bcrypt.compare(dto.newPassword, admin.password)
    if (sameAsOld) {
      throw new BadRequestException('New password must differ from current password')
    }

    const rounds = parseInt(this.config.get('BCRYPT_ROUNDS') ?? '12', 10)
    const hashed = await bcrypt.hash(dto.newPassword, rounds)

    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashed },
    })

    // Invalidate all refresh sessions except current behavior left to caller (force re-login on all devices)
    await this.prisma.adminSession.deleteMany({ where: { adminId: admin.id } })

    await this.prisma.adminLog.create({
      data: { adminId: admin.id, action: 'UPDATE_SETTINGS', target: 'password', targetType: 'ADMIN', ip, userAgent },
    })

    return { ok: true, message: 'Password changed. Please log in again on all devices.' }
  }

  async updateProfile(adminId: string, dto: UpdateProfileDto, ip?: string, userAgent?: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } })
    if (!admin || !admin.isActive) throw new UnauthorizedException('Account inactive')

    const data: { name?: string; email?: string } = {}
    if (dto.name && dto.name.trim() !== admin.name) data.name = dto.name.trim()
    if (dto.email && dto.email.toLowerCase() !== admin.email.toLowerCase()) {
      const conflict = await this.prisma.admin.findUnique({ where: { email: dto.email.toLowerCase() } })
      if (conflict && conflict.id !== admin.id) throw new ConflictException('Email already in use')
      data.email = dto.email.toLowerCase()
    }

    if (Object.keys(data).length === 0) {
      const { password: _, ...current } = admin
      return current
    }

    const updated = await this.prisma.admin.update({ where: { id: admin.id }, data })

    await this.prisma.adminLog.create({
      data: { adminId: admin.id, action: 'UPDATE_SETTINGS', target: 'profile', targetType: 'ADMIN', details: data, ip, userAgent },
    })

    const { password: _, ...safe } = updated
    return safe
  }

  private signAccessToken(id: string, email: string, role: string) {
    return this.jwt.sign({ sub: id, email, role }, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    })
  }
}
