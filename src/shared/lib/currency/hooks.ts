import { useQuery } from '@tanstack/react-query'
import { getExchangeRate } from './exchange-rate'
import { normalizeCurrency, type SupportedCurrency } from './index'
import { useOrganizationStore } from '@/shared/stores/organization-store'

/**
 * Hook to get the organization's default currency
 * Normalizes the currency value and provides type-safe fallback
 *
 * @returns SupportedCurrency - Organization's default currency (USD or VND)
 *
 * @example
 * const defaultCurrency = useOrganizationCurrency()
 * const formatted = formatCurrency(amount, defaultCurrency)
 */
export function useOrganizationCurrency(): SupportedCurrency {
  const { organization } = useOrganizationStore()
  // Type assertion needed until database types are regenerated after migration
  return normalizeCurrency(
    (organization as { default_currency?: string | null })?.default_currency
  )
}

/**
 * Hook to fetch and cache exchange rate between two currencies
 *
 * @param base - Base currency code
 * @param target - Target currency code
 * @returns React Query result with exchange rate
 *
 * @example
 * const { data: rate, isLoading } = useExchangeRate('USD', 'VND')
 * const convertedAmount = amount * (rate ?? 1)
 */
export function useExchangeRate(base: string, target: string) {
  return useQuery({
    queryKey: ['exchange-rate', base.toUpperCase(), target.toUpperCase()],
    queryFn: () => getExchangeRate(base, target),
    staleTime: 1000 * 60 * 60, // 1 hour - rates don't change frequently
    gcTime: 1000 * 60 * 60 * 24, // 24 hours cache
    enabled: base.toUpperCase() !== target.toUpperCase(), // Skip if same currency
    placeholderData: 1, // Default to 1:1 while loading
  })
}

/**
 * Hook to get exchange rates for all supported currencies to a target
 * Useful for dashboards that need to convert multiple currencies
 *
 * @param targetCurrency - Target currency to convert TO
 * @returns Map of source currency to exchange rate
 */
export function useExchangeRates(targetCurrency: SupportedCurrency) {
  const usdRate = useExchangeRate('USD', targetCurrency)
  const vndRate = useExchangeRate('VND', targetCurrency)

  return {
    USD: usdRate.data ?? 1,
    VND: vndRate.data ?? 1,
    isLoading: usdRate.isLoading || vndRate.isLoading,
    isError: usdRate.isError || vndRate.isError,
  }
}
