import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') return
    const models = Reflect.ownKeys(this).filter(key => key[0] !== '_' && key[0] !== '$')
    return Promise.all(models.map((model) => (this as any)[model].deleteMany()))
  }
}
