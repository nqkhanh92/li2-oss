/**
 * Sanitize and extract a valid URL from user input.
 *
 * Handles common paste scenarios from non-technical users:
 * - "Link: https://fpt.vn/shop/" → "https://fpt.vn/shop/"
 * - "  https://fpt.vn/shop/  " → "https://fpt.vn/shop/"
 * - "fpt.vn/shop/" → "https://fpt.vn/shop/"
 * - "Visit https://fpt.vn for details" → "https://fpt.vn"
 *
 * Returns { url, error } — url is the cleaned URL string, error is a i18n key if invalid.
 */
export function sanitizeUrl(raw: string): { url: string; error: string | null } {
  const trimmed = raw.trim()

  if (!trimmed) {
    return { url: '', error: null }
  }

  // Try to extract a URL with protocol from the string
  const urlMatch = trimmed.match(/https?:\/\/[^\s<>"']+/i)
  if (urlMatch) {
    return validateUrl(urlMatch[0])
  }

  // No protocol found — check if it looks like a domain (has a dot)
  // Extract the domain-like portion from the string
  const domainMatch = trimmed.match(/(?:^|\s)([\w.-]+\.[a-z]{2,}[^\s<>"']*)/i)
  if (domainMatch) {
    return validateUrl(`https://${domainMatch[1]}`)
  }

  return { url: trimmed, error: 'errors.invalid_url' }
}

function validateUrl(candidate: string): { url: string; error: string | null } {
  try {
    const parsed = new URL(candidate)
    // Only allow http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { url: candidate, error: 'errors.invalid_url' }
    }
    // Must have a valid hostname with a dot (no "https://localhost")
    if (!parsed.hostname.includes('.')) {
      return { url: candidate, error: 'errors.invalid_url' }
    }
    return { url: parsed.href, error: null }
  } catch {
    return { url: candidate, error: 'errors.invalid_url' }
  }
}
