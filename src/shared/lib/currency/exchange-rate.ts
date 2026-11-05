import { formatCurrency, normalizeCurrency } from './index'

const API_BASE = 'https://hexarate.paikama.co/api/rates'

/**
 * Response from hexarate API
 * Example: GET /api/rates/USD/VND/latest
 * {
 *   "status_code": 200,
 *   "data": {
 *     "base": "USD",
 *     "target": "VND",
 *     "mid": 25445.0,
 *     "unit": 1,
 *     "timestamp": "2026-01-14T00:00:00.000Z"
 *   }
 * }
 */
interface ExchangeRateResponse {
  status_code: number
  data: {
    base: string
    target: string
    mid: number
    unit: number
    timestamp: string
  }
}

/**
 * Fetch exchange rate between two currencies
 *
 * @param base - Base currency code (e.g., 'USD')
 * @param target - Target currency code (e.g., 'VND')
 * @returns Exchange rate (1 base = X target)
 *
 * @example
 * const rate = await getExchangeRate('USD', 'VND')
 * // rate = 25445.0 (1 USD = 25,445 VND)
 */
export async function getExchangeRate(base: string, target: string): Promise<number> {
  // Same currency = 1:1
  if (base.toUpperCase() === target.toUpperCase()) {
    return 1
  }

  try {
    const response = await fetch(
      `${API_BASE}/${base.toUpperCase()}/${target.toUpperCase()}/latest`
    )

    if (!response.ok) {
      console.error(`Exchange rate API error: ${response.status}`)
      return 1 // Fallback to 1:1 on error
    }

    const data: ExchangeRateResponse = await response.json()
    return data.data.mid
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error)
    return 1 // Fallback to 1:1 on error
  }
}

/**
 * Convert amount from one currency to another
 *
 * @param amount - Amount in source currency
 * @param rate - Exchange rate from getExchangeRate()
 * @returns Converted amount (rounded for VND)
 */
export function convertAmount(amount: number, rate: number): number {
  return Math.round(amount * rate)
}

/**
 * Convert and format in a single operation
 *
 * @param amount - Amount in source currency
 * @param sourceCurrency - Source currency code
 * @param targetCurrency - Target currency code
 * @param rate - Exchange rate
 * @returns Formatted string in target currency
 */
export function convertAndFormat(
  amount: number,
  sourceCurrency: string,
  targetCurrency: string,
  rate: number
): string {
  const converted = convertAmount(amount, rate)
  return formatCurrency(converted, normalizeCurrency(targetCurrency))
}
