/**
 * Import all plugins from the CSNEW plugins.json into the database.
 *
 * Usage:
 *   npx ts-node scripts/import-plugins.ts
 *   npx ts-node scripts/import-plugins.ts --source=local  (reads from CSNEW_PATH env)
 *   npx ts-node scripts/import-plugins.ts --source=github (fetches from GitHub raw)
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'

const prisma = new PrismaClient()

const GITHUB_URL =
  'https://raw.githubusercontent.com/Makairamei/CSNEW/master/plugins.json'

const LOCAL_PATH =
  process.env.CSNEW_PATH || path.resolve(__dirname, '../../repos/CSNEW/plugins.json')

interface CsPlugin {
  internalName: string
  name: string
  description: string
  url: string
  iconUrl?: string
  version: number
  apiVersion: number
  fileSize: number
  status: number
  language: string
  authors: string[]
  tvTypes: string[]
  repositoryUrl: string
  fileHash?: string
}

async function fetchFromGitHub(): Promise<CsPlugin[]> {
  return new Promise((resolve, reject) => {
    https.get(GITHUB_URL, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`GitHub returned ${res.statusCode}`))
      }
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          reject(new Error('Failed to parse plugins.json from GitHub'))
        }
      })
    }).on('error', reject)
  })
}

function fetchFromLocal(): CsPlugin[] {
  if (!fs.existsSync(LOCAL_PATH)) {
    throw new Error(`Local plugins.json not found at: ${LOCAL_PATH}\nSet CSNEW_PATH env var to the correct path.`)
  }
  return JSON.parse(fs.readFileSync(LOCAL_PATH, 'utf8'))
}

async function main() {
  const source = process.argv.includes('--source=local') ? 'local' : 'github'
  console.log(`\n📦 Importing plugins from: ${source === 'local' ? LOCAL_PATH : GITHUB_URL}\n`)

  let raw: CsPlugin[]
  if (source === 'local') {
    raw = fetchFromLocal()
  } else {
    console.log('⬇️  Fetching from GitHub...')
    raw = await fetchFromGitHub()
  }

  console.log(`📋 Found ${raw.length} plugins in plugins.json`)

  let created = 0
  let updated = 0
  let failed = 0

  for (const p of raw) {
    try {
      const slug = p.internalName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
      const existing = await prisma.plugin.findFirst({ where: { slug } })

      const data = {
        slug,
        name: p.name,
        description: p.description ?? '',
        version: String(p.version ?? 1),
        fileUrl: p.url,
        iconUrl: p.iconUrl ?? null,
        size: p.fileSize ?? 0,
        isEnabled: true,
        metadata: {
          language: p.language ?? 'id',
          authors: p.authors ?? [],
          tvTypes: p.tvTypes ?? [],
          csStatus: p.status ?? 1,
          apiVersion: p.apiVersion ?? 1,
          repositoryUrl: p.repositoryUrl,
          fileHash: p.fileHash ?? null,
          internalName: p.internalName,
        },
      }

      if (existing) {
        await prisma.plugin.update({ where: { id: existing.id }, data })
        updated++
      } else {
        await prisma.plugin.create({ data })
        created++
      }
    } catch (e) {
      console.error(`  ❌ Failed: ${p.name} — ${(e as Error).message}`)
      failed++
    }
  }

  console.log('\n─────────────────────────────────────────')
  console.log(`✅ Created: ${created}`)
  console.log(`🔄 Updated: ${updated}`)
  console.log(`❌ Failed:  ${failed}`)
  console.log(`📦 Total:   ${raw.length}`)
  console.log('─────────────────────────────────────────\n')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
