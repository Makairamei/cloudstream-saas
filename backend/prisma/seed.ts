import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Super admin
  const hashedPassword = await bcrypt.hash('Admin@123456', 12)
  const superAdmin = await prisma.admin.upsert({
    where: { email: 'admin@cloudstream.app' },
    update: {},
    create: {
      email: 'admin@cloudstream.app',
      name: 'Super Admin',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      twoFactorEnabled: false,
      isActive: true,
    },
  })
  console.log(`✅ Super admin: ${superAdmin.email}`)

  // Plugins
  const plugins = await Promise.all([
    prisma.plugin.upsert({ where: { slug: 'netflix' }, update: {}, create: { slug: 'netflix', name: 'Netflix', version: '2.1.0', category: 'Streaming', description: 'Premium Netflix integration', isEnabled: true, isFeatured: true, downloadCount: 12450 } }),
    prisma.plugin.upsert({ where: { slug: 'disney-plus' }, update: {}, create: { slug: 'disney-plus', name: 'Disney+', version: '1.8.2', category: 'Streaming', description: 'Disney+ official plugin', isEnabled: true, isFeatured: true, downloadCount: 9820 } }),
    prisma.plugin.upsert({ where: { slug: 'amazon-prime' }, update: {}, create: { slug: 'amazon-prime', name: 'Amazon Prime', version: '3.0.1', category: 'Streaming', description: 'Amazon Prime Video', isEnabled: true, downloadCount: 8640 } }),
    prisma.plugin.upsert({ where: { slug: 'hbo-max' }, update: {}, create: { slug: 'hbo-max', name: 'HBO Max', version: '1.5.0', category: 'Streaming', description: 'HBO Max plugin', isEnabled: true, downloadCount: 7210 } }),
    prisma.plugin.upsert({ where: { slug: 'youtube' }, update: {}, create: { slug: 'youtube', name: 'YouTube', version: '4.2.0', category: 'Video', description: 'YouTube integration', isEnabled: true, downloadCount: 15300 } }),
  ])
  console.log(`✅ Seeded ${plugins.length} plugins`)

  // Demo licenses
  const licenses = await Promise.all([
    prisma.license.upsert({ where: { key: 'CS-PROD-DEMO01' }, update: {}, create: { key: 'CS-PROD-DEMO01', name: 'Demo License 1', email: 'user1@example.com', status: 'ACTIVE', maxDevices: 3, isTrial: false, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) } }),
    prisma.license.upsert({ where: { key: 'CS-PROD-DEMO02' }, update: {}, create: { key: 'CS-PROD-DEMO02', name: 'Demo License 2', email: 'user2@example.com', status: 'ACTIVE', maxDevices: 5, isTrial: false, expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) } }),
    prisma.license.upsert({ where: { key: 'CS-TRIAL-DEMO03' }, update: {}, create: { key: 'CS-TRIAL-DEMO03', name: 'Trial User', email: 'trial@example.com', status: 'TRIAL', maxDevices: 1, isTrial: true, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } }),
    prisma.license.upsert({ where: { key: 'CS-PROD-DEMO04' }, update: {}, create: { key: 'CS-PROD-DEMO04', name: 'Expired License', email: 'expired@example.com', status: 'EXPIRED', maxDevices: 3, isTrial: false, expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
  ])
  console.log(`✅ Seeded ${licenses.length} licenses`)

  // Settings
  await Promise.all([
    prisma.setting.upsert({ where: { key: 'app_name' }, update: {}, create: { key: 'app_name', value: 'CloudStream SaaS' } }),
    prisma.setting.upsert({ where: { key: 'max_devices_default' }, update: {}, create: { key: 'max_devices_default', value: 3 } }),
    prisma.setting.upsert({ where: { key: 'trial_days' }, update: {}, create: { key: 'trial_days', value: 7 } }),
    prisma.setting.upsert({ where: { key: 'grace_period_days' }, update: {}, create: { key: 'grace_period_days', value: 7 } }),
  ])
  console.log('✅ Seeded settings')

  console.log('\n🎉 Database seeded successfully!')
  console.log('─────────────────────────────────')
  console.log('Admin: admin@cloudstream.app')
  console.log('Password: Admin@123456')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
