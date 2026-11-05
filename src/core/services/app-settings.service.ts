import 'server-only'
import { redis } from '@/infrastructure/cache/redis'
import { REDIS_KEYS } from '@/infrastructure/cache/redis/key'
import { appSettingsRepo, AppSettings, AppSettingsRepository } from '../repositories/app-settings.repository'

const TTL_SECONDS = 60 * 60 // 60 minutes

export class AppSettingsService {
  constructor(private readonly repo: AppSettingsRepository) {}

  async get(): Promise<AppSettings | null> {
    const cached = await redis.get(REDIS_KEYS.APP_SETTINGS)
    if (cached) return JSON.parse(cached) as AppSettings

    const settings = await this.repo.get()
    if (settings) {
      await redis.set(REDIS_KEYS.APP_SETTINGS, JSON.stringify(settings), 'EX', TTL_SECONDS)
    }
    return settings
  }

  async getDestinationBlacklist(): Promise<string[]> {
    const settings = await this.get()
    return settings?.destination_blacklist ?? []
  }

  async invalidateCache(): Promise<void> {
    await redis.del(REDIS_KEYS.APP_SETTINGS)
  }
}

export const appSettingsService =
  globalThis._appSettingsService ?? new AppSettingsService(appSettingsRepo)

if (process.env.NODE_ENV !== 'production') globalThis._appSettingsService = appSettingsService
