import 'server-only'
import { redis } from '@/infrastructure/cache/redis'
import { getExchangeRate as fetchExchangeRateFromAPI } from '@/shared/lib/currency/exchange-rate'
import { exchangeRateRepo } from '../repositories/exchange-rate.repository'

const REDIS_TTL = 60 * 60 // 1 hour in seconds
const REDIS_KEY_PREFIX = 'exchange_rate'

export class CurrencyService {
  /**
   * Get exchange rate with fallback: Redis -> API -> Database (backup)
   * - Redis: Fast cache (1 hour TTL)
   * - API: Source of truth for fresh rates
   * - Database: Backup when API fails
   *
   * @param baseCurrency - Source currency code (e.g., 'USD')
   * @param targetCurrency - Target currency code (e.g., 'VND')
   * @returns Exchange rate (1 base = X target)
   */
  async getExchangeRate(baseCurrency: string, targetCurrency: string): Promise<number> {
    // Validate inputs
    if (!baseCurrency || !targetCurrency) {
      console.error('Invalid currency parameters:', { baseCurrency, targetCurrency })
      return 1
    }

    const base = baseCurrency.toUpperCase()
    const target = targetCurrency.toUpperCase()

    // Same currency = 1:1
    if (base === target) return 1

    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    const cacheKey = `${REDIS_KEY_PREFIX}:${base}:${target}:${dateStr}`

    try {
      // 1. Check Redis cache
      const cached = await redis.get(cacheKey)
      if (cached) {
        return parseFloat(cached)
      }

      // 2. Fetch from external API (source of truth)
      try {
        const apiRate = await fetchExchangeRateFromAPI(base, target)

        // Cache in Redis and save to database (non-blocking)
        redis.setex(cacheKey, REDIS_TTL, apiRate.toString()).catch((err) => {
          console.error('Failed to cache exchange rate in Redis:', err)
        })
        exchangeRateRepo.saveRate(base, target, apiRate, today).catch((err) => {
          console.error('Failed to save exchange rate to database:', err)
        })

        return apiRate
      } catch (apiError) {
        // 3. API failed - fallback to database
        console.warn('Exchange rate API failed, falling back to database:', apiError)

        let dbRate = await exchangeRateRepo.getRate(base, target, today)
        if (!dbRate) {
          dbRate = await exchangeRateRepo.getLatestRate(base, target)
        }

        if (dbRate) {
          // Cache the DB rate in Redis
          redis.setex(cacheKey, REDIS_TTL, dbRate.toString()).catch((err) => {
            console.error('Failed to cache exchange rate in Redis:', err)
          })
          return dbRate
        }

        // No rate available anywhere
        console.error('No exchange rate available for', { base, target })
        return 1
      }
    } catch (error) {
      console.error('Currency conversion error:', error)
      return 1 // Fallback to 1:1 on any error
    }
  }

  /**
   * Batch get exchange rates for multiple currency pairs
   * Optimized for converting multiple amounts in different currencies
   */
  async getExchangeRates(
    pairs: Array<{ base: string; target: string }>
  ): Promise<Map<string, number>> {
    const rates = new Map<string, number>()

    // Handle empty or invalid input
    if (!pairs || pairs.length === 0) {
      return rates
    }

    // Deduplicate pairs and fetch in parallel
    const uniquePairs = new Map<string, { base: string; target: string }>()
    for (const pair of pairs) {
      if (!pair?.base || !pair?.target) {
        console.warn('Invalid currency pair:', pair)
        continue
      }
      const key = `${pair.base.toUpperCase()}:${pair.target.toUpperCase()}`
      uniquePairs.set(key, pair)
    }

    const results = await Promise.all(
      Array.from(uniquePairs.values()).map(async ({ base, target }) => {
        const rate = await this.getExchangeRate(base, target)
        return { key: `${base.toUpperCase()}:${target.toUpperCase()}`, rate }
      })
    )

    for (const { key, rate } of results) {
      rates.set(key, rate)
    }

    return rates
  }
}

export const currencyService = globalThis._currencyService ?? new CurrencyService()

if (process.env.NODE_ENV !== 'production') {
  globalThis._currencyService = currencyService
}
