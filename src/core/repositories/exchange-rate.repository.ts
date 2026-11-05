import { BaseRepository } from '@/core/repositories/base.repository'

export class ExchangeRateRepository extends BaseRepository<'exchange_rates'> {
  constructor() {
    super('exchange_rates')
  }

  /**
   * Get cached exchange rate for a specific date
   * Returns null if not found in database
   */
  async getRate(
    baseCurrency: string,
    targetCurrency: string,
    date: Date = new Date()
  ): Promise<number | null> {
    const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD

    const { data, error } = await this.query()
      .select('rate')
      .eq('base_currency', baseCurrency.toUpperCase())
      .eq('target_currency', targetCurrency.toUpperCase())
      .eq('rate_date', dateStr)
      .single()

    if (error || !data) return null
    return Number((data as { rate: number }).rate)
  }

  /**
   * Get the most recent rate for a currency pair (fallback when today's rate not found)
   */
  async getLatestRate(baseCurrency: string, targetCurrency: string): Promise<number | null> {
    const { data, error } = await this.query()
      .select('rate')
      .eq('base_currency', baseCurrency.toUpperCase())
      .eq('target_currency', targetCurrency.toUpperCase())
      .order('rate_date', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return null
    return Number((data as { rate: number }).rate)
  }

  /**
   * Save exchange rate to database
   * Uses upsert to handle duplicates gracefully
   */
  async saveRate(
    baseCurrency: string,
    targetCurrency: string,
    rate: number,
    date: Date = new Date()
  ): Promise<void> {
    const dateStr = date.toISOString().split('T')[0]

    const { error } = await this.query().upsert(
      {
        base_currency: baseCurrency.toUpperCase(),
        target_currency: targetCurrency.toUpperCase(),
        rate: rate,
        rate_date: dateStr,
      },
      {
        onConflict: 'base_currency,target_currency,rate_date',
      }
    )

    if (error) {
      console.error('Failed to save exchange rate:', error)
      // Don't throw - saving is best-effort
    }
  }
}

export const exchangeRateRepo =
  globalThis._exchangeRateRepo ?? new ExchangeRateRepository()

if (process.env.NODE_ENV !== 'production') {
  globalThis._exchangeRateRepo = exchangeRateRepo
}
