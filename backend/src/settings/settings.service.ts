import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}
  async get(key: string) { return this.prisma.setting.findUnique({ where: { key } }) }
  async getAll() { return this.prisma.setting.findMany() }
  async set(key: string, value: any) {
    return this.prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } })
  }
}
