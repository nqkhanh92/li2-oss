import { UAParser } from 'ua-parser-js'

// Note: This utility runs in browser, so we use console for logging
// Pino logger is server-only

export interface ParsedUserAgent {
  browser: { name: string; version: string } | null
  os: { name: string; version: string } | null
  device: {
    type: 'mobile' | 'tablet' | 'desktop' | 'unknown'
    vendor: string
    model: string
  } | null
}

/**
 * Parse user agent string into structured device/browser/OS info
 * @param userAgent - Raw user agent string from request
 * @returns Parsed user agent or null if invalid/empty
 */
export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent | null {
  if (!userAgent || userAgent.trim() === '') {
    return null
  }

  try {
    // UAParser v2: call without 'new' to get result directly
    const result = UAParser(userAgent)

    // Normalize device type to our union type
    const rawDeviceType = result.device.type || ''
    const deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown' =
      rawDeviceType === 'mobile' || rawDeviceType === 'tablet'
        ? rawDeviceType
        : rawDeviceType === ''
          ? 'desktop'
          : 'unknown'

    return {
      browser: result.browser.name
        ? { name: result.browser.name, version: result.browser.version || '' }
        : null,
      os: result.os.name ? { name: result.os.name, version: result.os.version || '' } : null,
      device: {
        type: deviceType,
        vendor: result.device.vendor || '',
        model: result.device.model || '',
      },
    }
  } catch (error) {
    // Silent fail - parsing errors are non-critical
    if (process.env.NODE_ENV === 'development') {
      console.warn('[user-agent-parser] Failed to parse:', userAgent, error)
    }
    return null
  }
}

/**
 * Format parsed user agent into human-readable string
 * @example "Mobile • iOS 17.2 • Safari"
 * @example "Windows 11 • Chrome"
 */
export function formatDeviceInfo(parsed: ParsedUserAgent | null): string {
  if (!parsed) return 'Unknown device'

  const parts: string[] = []

  // Device type (only show if not desktop)
  if (parsed.device?.type && parsed.device.type !== 'desktop') {
    parts.push(capitalize(parsed.device.type))
  }

  // OS with version
  if (parsed.os?.name) {
    const osStr = parsed.os.version ? `${parsed.os.name} ${parsed.os.version}` : parsed.os.name
    parts.push(osStr)
  }

  // Browser name (skip version for brevity)
  if (parsed.browser?.name) {
    parts.push(parsed.browser.name)
  }

  return parts.length > 0 ? parts.join(' • ') : 'Unknown device'
}

/**
 * Get device icon name based on device type
 */
export function getDeviceIconName(
  parsed: ParsedUserAgent | null,
  fallbackPlatform?: string | null
): 'smartphone' | 'tablet' | 'monitor' {
  const deviceType = parsed?.device?.type || fallbackPlatform?.toLowerCase()

  if (deviceType === 'mobile') return 'smartphone'
  if (deviceType === 'tablet') return 'tablet'
  return 'monitor'
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
