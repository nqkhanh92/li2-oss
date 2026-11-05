import { countryMapping } from '@/shared/constants/country-mapping'
import countries from '@/shared/constants/countries.json'

export interface GeoCoordinates {
  lat: number
  lng: number
}

/**
 * Map country alpha2 and alpha3 code to country name
 * 
 * Fallback to isoCode
 */
export function getCountryNameFromIso(isoCode: string) {
  const countriesName = countries.filter(c => c.iso2 === isoCode || c.iso3 === isoCode)
  return countriesName?.[0]?.name || isoCode
}

/**
 * Map country alpha2 code to geographic coordinates
 */
export function getCountryCoordinates(countryAlpha2: string): GeoCoordinates | null {
  const country = countryMapping.find((c) => c.alpha2 === countryAlpha2)
  if (!country || !country.center) return null

  return {
    lng: country.center[0],
    lat: country.center[1],
  }
}

/**
 * Map country name to geographic coordinates
 */
export function getCountryCoordinatesByName(countryName: string): GeoCoordinates | null {
  const country = countryMapping.find(
    (c) => c.name.toLowerCase() === countryName.toLowerCase()
  )
  if (!country || !country.center) return null

  return {
    lng: country.center[0],
    lat: country.center[1],
  }
}

/**
 * Generate random coordinates near a country center for city positioning
 * This is a simple approximation - adds random offset within ~100km
 */
export function getCityCoordinatesApprox(
  countryAlpha2: string,
  cityName?: string
): GeoCoordinates | null {
  const countryCoords = getCountryCoordinates(countryAlpha2)
  if (!countryCoords) return null

  // Add small random offset (approximately 0.5-1 degrees, roughly 50-100km)
  const latOffset = (Math.random() - 0.5) * 1.5
  const lngOffset = (Math.random() - 0.5) * 1.5

  return {
    lat: countryCoords.lat + latOffset,
    lng: countryCoords.lng + lngOffset,
  }
}
