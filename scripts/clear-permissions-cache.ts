/**
 * Script to clear all cached user permissions in Redis
 * Run this after updating role permissions in the database
 *
 * Usage: npx tsx scripts/clear-permissions-cache.ts
 */

import { redis } from '../src/infrastructure/cache/redis'

async function clearPermissionsCache() {
  try {
    console.log('🔍 Scanning for cached permission keys...')

    // Find all keys matching the pattern user:*:permissions:org:*
    const keys = await redis.keys('user:*:permissions:org:*')

    if (keys.length === 0) {
      console.log('✅ No cached permissions found')
      return
    }

    console.log(`📦 Found ${keys.length} cached permission entries`)

    // Delete all matching keys
    const deleted = await redis.del(...keys)

    console.log(`✅ Successfully cleared ${deleted} permission cache entries`)
    console.log('🎉 Users will now get fresh permissions from the database')
  } catch (error) {
    console.error('❌ Error clearing permissions cache:', error)
    process.exit(1)
  } finally {
    // Close Redis connection
    await redis.quit()
  }
}

clearPermissionsCache()
