const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

export function formatBytes(bytes: number, fractionDigits = 1) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  const rounded = exponent === 0 ? Math.round(value) : Number(value.toFixed(fractionDigits))
  return `${rounded} ${UNITS[exponent]}`
}
