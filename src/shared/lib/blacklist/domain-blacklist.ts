import 'server-only'
import { createHash } from 'node:crypto'
import { redis } from '@/infrastructure/cache/redis'

const PREFIX = 'blacklist:domain'
const CUR_KEY = `${PREFIX}:bloom:current`
const TMP_KEY = `${PREFIX}:bloom:tmp`
const META_KEY = `${PREFIX}:bloom:meta`

const ERROR_RATE = Number(process.env.BLACKLIST_ERROR_RATE ?? 1e-4)
const CAPACITY = Number(process.env.BLACKLIST_CAPACITY ?? 500_000)
const BATCH = 5_000
const SOURCE_URL = 'http://sbc.io/hosts/alternates/fakenews-gambling-porn-only/hosts'

function normalizeDomain(d: string) {
  let s = d.trim().toLowerCase()
  s = s.replace(/#.*$/, '').replace(/\.$/, '')
  if (!s) return null
  if (s.startsWith('www.')) s = s.slice(4)
  if (!/^[a-z0-9\-._]+$/.test(s)) return null
  if (s.includes('/') || s.includes(' ')) return null
  return s
}

export function parseHosts(content: string) {
  const out = new Set<string>()
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const parts = line.split(/\s+/)
    if (parts.length < 2) continue
    for (let i = 1; i < parts.length; i++) {
      const dom = normalizeDomain(parts[i].split('#')[0])
      if (dom) out.add(dom)
    }
  }
  return [...out]
}

async function fetchIfChanged() {
  const prev = await redis.hgetall(META_KEY)
  const headers: Record<string, string> = {}
  if (prev.etag) headers['If-None-Match'] = prev.etag
  if (prev.lastModified) headers['If-Modified-Since'] = prev.lastModified

  const res = await fetch(SOURCE_URL, { headers, redirect: 'follow' })
  if (res.status === 304) return { status: 304 as const }
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
  const body = await res.text()
  return {
    status: 200 as const,
    body,
    etag: res.headers.get('etag') ?? '',
    lastModified: res.headers.get('last-modified') ?? '',
  }
}

async function reserveBloom(key: string) {
  // BF.RESERVE key error_rate capacity
  // if exists, this errors — we DEL first in refresh flow
  await redis.call('BF.RESERVE', key, ERROR_RATE, CAPACITY)
}

async function bulkAdd(key: string, values: string[]) {
  for (let i = 0; i < values.length; i += BATCH) {
    const chunk = values.slice(i, i + BATCH)
    await redis.call('BF.MADD', key, ...chunk)
  }
}

/** Refresh Bloom filter from source URL. Returns metadata. */
export async function refreshBlacklist() {
  const fetched = await fetchIfChanged()
  if (fetched.status === 304) {
    return { updated: false, reason: 'not-modified' }
  }

  const { body, etag, lastModified } = fetched
  const domains = parseHosts(body)
  if (domains.length === 0) throw new Error('Source parsed to 0 domains')

  // build tmp
  await redis.del(TMP_KEY)
  await reserveBloom(TMP_KEY)
  await bulkAdd(TMP_KEY, domains)

  // swap atomically
  await redis.call('RENAME', CUR_KEY, `${CUR_KEY}:backup`).catch(() => {})
  await redis.call('RENAME', TMP_KEY, CUR_KEY)
  await redis.del(`${CUR_KEY}:backup`).catch(() => {})

  // meta
  const sha256 = createHash('sha256').update(body).digest('hex')
  await redis.hset(META_KEY, {
    etag,
    lastModified,
    sha256,
    itemCount: String(domains.length),
    updatedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
  })

  return {
    updated: true,
    itemCount: domains.length,
    sha256,
  }
}

export async function isBlacklisted(domain: string): Promise<boolean> {
  try {
    // Check if Bloom filter exists
    const exists = await redis.exists(CUR_KEY)
    if (!exists) {
      // Auto-refresh if filter doesn't exist
      await refreshBlacklist()
    }
    const res = await redis.call('BF.EXISTS', CUR_KEY, domain.toLowerCase())
    const result = Number(res) === 1
    return result
  } catch (error) {
    console.error('Error checking blacklist:', error)
    return false
  }
}

export async function logBlacklistCount() {
  const meta = await redis.hgetall(META_KEY)
  console.log('Blacklist metadata:', meta)
  console.log(`Currently stored domains: ${meta.itemCount ?? 0}`)
}
