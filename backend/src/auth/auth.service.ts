import {
  Injectable, UnauthorizedException, ForbiddenException,
  ConflictException, NotFoundException, Inject,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { REDIS_CLIENT } from '../redis/redis.module'
import Redis from 'ioredis'
import * as bcrypt from 'bcryptjs'
import { LoginDto } from './dto/login.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
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

  private signAccessToken(id: string, email: string, role: string) {
    return this.jwt.sign({ sub: id, email, role }, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    })
  }
}
