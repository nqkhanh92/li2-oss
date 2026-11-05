export type SupportedCurrency = 'USD' | 'VND'

export interface CurrencyConfig {
  locale: string
  symbol: string
  decimals: number
  symbolPosition: 'prefix' | 'suffix'
}

/**
 * Currency configuration for supported currencies
 * - USD: US Dollar with en-US locale ($1,234.56)
 * - VND: Vietnamese Dong with vi-VN locale (2.600.000 ₫)
 */
export const CURRENCY_CONFIG: Record<SupportedCurrency, CurrencyConfig> = {
  USD: {
    locale: 'en-US',
    symbol: '$',
    decimals: 2,
    symbolPosition: 'prefix',
  },
  VND: {
    locale: 'vi-VN',
    symbol: '₫',
    decimals: 0,
    symbolPosition: 'suffix',
  },
}

export const DEFAULT_CURRENCY: SupportedCurrency = 'USD'

// Pre-create formatters for performance (Intl.NumberFormat is expensive to instantiate)
const formatters: Record<SupportedCurrency, Intl.NumberFormat> = {
  USD: new Intl.NumberFormat(CURRENCY_CONFIG.USD.locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: CURRENCY_CONFIG.USD.decimals,
    maximumFractionDigits: CURRENCY_CONFIG.USD.decimals,
  }),
  VND: new Intl.NumberFormat(CURRENCY_CONFIG.VND.locale, {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: CURRENCY_CONFIG.VND.decimals,
    maximumFractionDigits: CURRENCY_CONFIG.VND.decimals,
  }),
}

/**
 * Format a currency value using Intl.NumberFormat
 * Uses cached formatters for optimal performance in table rendering
 *
 * @param amount - Amount in base units (not cents for USD, full units for VND)
 * @param currency - Currency code (USD or VND)
 * @returns Formatted string (e.g., "$1,234.56" or "2.600.000 ₫")
 *
 * @example
 * formatCurrency(1234.56, 'USD') // "$1,234.56"
 * formatCurrency(2600000, 'VND') // "2.600.000 ₫"
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency = DEFAULT_CURRENCY
): string {
  const formatter = formatters[currency] ?? formatters[DEFAULT_CURRENCY]
  return formatter.format(amount)
}

/**
 * Format currency from cents (for amounts stored as integers)
 *
 * @param cents - Amount in cents/smallest unit
 * @param currency - Currency code
 * @returns Formatted string
 *
 * @example
 * formatCurrencyFromCents(123456, 'USD') // "$1,234.56"
 * formatCurrencyFromCents(2600000, 'VND') // "2.600.000 ₫" (VND has no cents)
 */
export function formatCurrencyFromCents(
  cents: number,
  currency: SupportedCurrency = DEFAULT_CURRENCY
): string {
  const config = CURRENCY_CONFIG[currency]
  // Convert from cents to main unit (VND doesn't use cents, so no division)
  const amount = config.decimals > 0 ? cents / 100 : cents
  return formatCurrency(amount, currency)
}

/**
 * Get display configuration for a currency
 */
export function getCurrencyConfig(currency: SupportedCurrency): CurrencyConfig {
  return CURRENCY_CONFIG[currency]
}

/**
 * Validate if a string is a supported currency
 * Uses CURRENCY_CONFIG keys to stay in sync automatically
 */
export function isSupportedCurrency(value: string): value is SupportedCurrency {
  return value in CURRENCY_CONFIG
}

/**
 * Normalize currency code (uppercase, validate, fallback to default)
 *
 * @param value - Raw currency string from API/database
 * @returns Validated SupportedCurrency
 *
 * @example
 * normalizeCurrency('usd')     // 'USD'
 * normalizeCurrency('VND')     // 'VND'
 * normalizeCurrency('EUR')     // 'USD' (unsupported, fallback)
 * normalizeCurrency(null)      // 'USD' (fallback)
 */
export function normalizeCurrency(value: string | null | undefined): SupportedCurrency {
  if (!value) return DEFAULT_CURRENCY
  const upper = value.toUpperCase()
  return isSupportedCurrency(upper) ? upper : DEFAULT_CURRENCY
}

/**
 * Get currency options for select dropdowns
 */
export function getCurrencyOptions(): Array<{ value: SupportedCurrency; label: string }> {
  return [
    { value: 'USD', label: '$ USD - US Dollar' },
    { value: 'VND', label: '₫ VND - Vietnamese Dong' },
  ]
}

// Re-export exchange rate utilities
export { getExchangeRate, convertAmount, convertAndFormat } from './exchange-rate'
export { useExchangeRate, useExchangeRates, useOrganizationCurrency } from './hooks'
