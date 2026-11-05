import { Field } from './json-builder-v2'

function parseValue(type: Field['type'], value: any): any {
  switch (type) {
    case 'string':
      return String(value)
    case 'number':
      return typeof value === 'number' ? value : parseFloat(value)
    case 'boolean':
      return typeof value === 'boolean' ? value : value === 'true'
    case 'array':
      if (Array.isArray(value)) return value
      if (typeof value !== 'string') return []

      try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) return parsed
      } catch {
        // fall back to CSV-style
      }

      return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item !== '')
        .map((item) => {
          if (item === 'true') return true
          if (item === 'false') return false
          if (!isNaN(Number(item))) return Number(item)
          return item
        })

    case 'expression':
      return value
    default:
      return value
  }
}

function setNestedValue(obj: any, path: string[], value: any) {
  let current = obj
  for (let i = 0; i < path.length - 1; i++) {
    const part = path[i]
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {}
    }
    current = current[part]
  }
  current[path[path.length - 1]] = value
}
export function parseJsonFromContext(
  obj: Record<string, any>,
  context: Record<string, any>
): Record<string, any> {
  function resolveValue(value: any): any {
    if (typeof value === 'string' && value.startsWith('$')) {
      const path = value.slice(1).split('.')
      return path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : value), context)
    } else if (Array.isArray(value)) {
      return value.map(resolveValue)
    } else if (typeof value === 'object' && value !== null) {
      return parseJsonFromContext(value, context)
    }
    return value
  }

  const result: Record<string, any> = {}
  for (const key in obj) {
    result[key] = resolveValue(obj[key])
  }
  return result
}

export function buildJson(entries: Field[]): Record<string, any> {
  if (!entries.length) return {}
  const result: Record<string, any> = {}

  for (const entry of entries) {
    const value = parseValue(entry.type, entry.value)
    const path = entry.key.split('.')
    setNestedValue(result, path, value)
  }

  return result
}

export const flattenContext = (obj: Record<string, any>, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === 'object' && value !== null
      ? [path, ...flattenContext(value, path)]
      : [path]
  })
