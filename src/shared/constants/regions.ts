import regionsRaw from '@/shared/constants/world_regions.json'

const regionsTyped = regionsRaw as Record<
  string,
  {
    label: string // continent label
    countries: Record<
      string,
      {
        label: string // country label
        states: Record<string, { label: string }>
      }
    >
  }
>
export const regions = regionsTyped

export const flatContinents: { label: string; value: string }[] = Object.entries(regionsTyped).map(
  ([regionCode, continent]) => ({
    label: continent.label,
    value: regionCode,
  })
)

export const flatCountries: { label: string; value: string; region: string }[] = Object.entries(
  regionsTyped
).flatMap(([regionCode, continent]) =>
  Object.entries(continent.countries).map(([countryCode, ct]) => ({
    label: ct.label,
    value: countryCode, // country code
    region: regionCode, // region code (continent code)
  }))
)

export const flatStates: { label: string; value: string; country: string }[] = Object.entries(
  regionsTyped
).flatMap(([_, continent]) =>
  Object.entries(continent.countries).flatMap(([countryCode, country]) =>
    Object.entries(country.states).map(([code, state]) => ({
      label: state.label,
      value: code, // state code
      country: countryCode, // country code
    }))
  )
)
