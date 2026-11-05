import React, { useState, useCallback, useMemo } from 'react'
import { Plus, Trash2, Copy } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'

// Types
interface PlaceholderData {
  [key: string]: string | number | boolean | string[]
}

interface Placeholders {
  [key: string]: PlaceholderData
}

interface FieldData {
  type: DataType
  value: string
}

interface JsonData {
  [key: string]: FieldData
}

interface Suggestions {
  [key: string]: string[]
}

type DataType = 'string' | 'number' | 'boolean' | 'array' | 'null'

interface DataTypeOption {
  value: DataType
  label: string
}

// Constants
const DATA_TYPES: DataTypeOption[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'array', label: 'Array' },
  { value: 'null', label: 'Null' },
]

const PLACEHOLDERS: Placeholders = {
  user: {
    id: 'user_123',
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    active: true,
  },
  product: {
    id: 'prod_456',
    name: 'Laptop',
    price: 999.99,
    category: 'electronics',
    inStock: true,
  },
  order: {
    id: 'order_789',
    total: 1299.99,
    status: 'pending',
    items: ['item1', 'item2'],
  },
}

const usePlaceholderSuggestions = () => {
  const flattenPlaceholders = useCallback((obj: any, prefix = ''): string[] => {
    let results: string[] = []

    Object.entries(obj).forEach(([key, value]) => {
      const newPrefix = prefix ? `${prefix}.${key}` : key
      if (typeof value === 'object' && value !== null) {
        results = results.concat(flattenPlaceholders(value, newPrefix))
      } else {
        results.push(newPrefix)
      }
    })

    return results
  }, [])

  const generateSuggestions = useCallback(
    (input: string): string[] => {
      const flatKeys = flattenPlaceholders(PLACEHOLDERS).map((key) => `$${key}`)
      return flatKeys
        .filter((placeholder) => placeholder.toLowerCase().includes(input.toLowerCase()))
        .slice(0, 8)
    },
    [flattenPlaceholders]
  )

  return { generateSuggestions }
}

const useJsonConverter = () => {
  const resolvePlaceholder = useCallback((value: string): unknown => {
    if (!value.startsWith('$')) return value

    const path = value.substring(1)
    const parts = path.split('.')

    if (parts.length === 1) {
      return PLACEHOLDERS[parts[0]] || value
    } else if (parts.length === 2) {
      const [root, nested] = parts
      return PLACEHOLDERS[root]?.[nested] || value
    }

    return value
  }, [])

  const convertValue = useCallback(
    (fieldData: FieldData): unknown => {
      const resolvedValue = resolvePlaceholder(fieldData.value)

      if (typeof resolvedValue === 'string' && resolvedValue.startsWith('$')) {
        return resolvedValue
      }

      switch (fieldData.type) {
        case 'string':
          return String(resolvedValue || '')
        case 'number':
          return typeof resolvedValue === 'number' ? resolvedValue : Number(resolvedValue) || 0
        case 'boolean':
          return typeof resolvedValue === 'boolean' ? resolvedValue : resolvedValue === 'true'
        case 'array':
          if (Array.isArray(resolvedValue)) return resolvedValue
          try {
            return JSON.parse(fieldData.value || '[]')
          } catch {
            return fieldData.value
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s)
          }
        case 'null':
          return null
        default:
          return resolvedValue
      }
    },
    [resolvePlaceholder]
  )

  const buildNestedJson = useCallback(
    (jsonData: JsonData) => {
      const result: any = {}

      Object.entries(jsonData).forEach(([key, fieldData]) => {
        const value = convertValue(fieldData)
        const parts = key.split('.')

        let current = result
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i]
          if (!(part in current)) {
            current[part] = {}
          }
          current = current[part]
        }

        current[parts[parts.length - 1]] = value
      })

      return result
    },
    [convertValue]
  )

  return { convertValue, buildNestedJson }
}

// Components
interface ValueInputProps {
  fieldKey: string
  fieldData: FieldData
  suggestions: string[]
  onValueChange: (key: string, value: string) => void
  onSuggestionSelect: (key: string, suggestion: string) => void
  onFieldUpdate: (key: string, updates: Partial<FieldData>) => void
}

const ValueInput: React.FC<ValueInputProps> = ({
  fieldKey,
  fieldData,
  suggestions,
  onValueChange,
  onSuggestionSelect,
  onFieldUpdate,
}) => {
  const baseInputClass =
    'w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500'

  switch (fieldData.type) {
    case 'boolean':
      return (
        <Select
          value={fieldData.value || 'false'}
          onValueChange={(value) => onFieldUpdate(fieldKey, { value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">true</SelectItem>
            <SelectItem value="false">false</SelectItem>
          </SelectContent>
        </Select>
      )

    case 'array':
      return (
        <Textarea
          value={fieldData.value || ''}
          onChange={(e) => onFieldUpdate(fieldKey, { value: e.target.value })}
          placeholder='["item1", "item2"] or item1, item2, item3 or $order.items'
          className={`${baseInputClass} font-mono`}
          rows={2}
        />
      )

    case 'null':
      return (
        <input
          type="text"
          value="null"
          disabled
          className={`${baseInputClass} bg-gray-100 text-gray-500`}
        />
      )

    default:
      return (
        <div className="relative">
          <Input
            value={fieldData.value || ''}
            onChange={(e) => onValueChange(fieldKey, e.target.value)}
            placeholder="Enter value or $user.name"
            className={baseInputClass}
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-32 overflow-y-auto">
              {suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="px-2 py-1 text-sm cursor-pointer hover:bg-blue-50 font-mono"
                  onClick={() => onSuggestionSelect(fieldKey, suggestion)}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      )
  }
}

interface FieldRowProps {
  fieldKey: string
  fieldData: FieldData
  suggestions: string[]
  onKeyChange: (oldKey: string, newKey: string) => void
  onFieldUpdate: (key: string, updates: Partial<FieldData>) => void
  onValueChange: (key: string, value: string) => void
  onSuggestionSelect: (key: string, suggestion: string) => void
  onRemove: (key: string) => void
}

const FieldRow = ({
  fieldKey,
  fieldData,
  suggestions,
  onKeyChange,
  onFieldUpdate,
  onValueChange,
  onSuggestionSelect,
  onRemove,
}: FieldRowProps) => {
  return (
    <div className="p-3 border border-gray-200 rounded bg-gray-50">
      <div className="grid grid-cols-12 gap-2 items-start">
        <div className="col-span-4">
          <label className="block text-xs text-gray-600 mb-1">Key</label>
          <Input
            value={fieldKey}
            onChange={(e) => onKeyChange(fieldKey, e.target.value)}
            placeholder="user.name or items[0]"
          />
        </div>

        <div className="col-span-3">
          <label className="block text-xs text-gray-600 mb-1">Type</label>
          <Select
            value={fieldData.type}
            onValueChange={(value) =>
              onFieldUpdate(fieldKey, {
                type: value as DataType,
                value: '',
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {DATA_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-4">
          <label className="block text-xs text-gray-600 mb-1">Value</label>
          <ValueInput
            fieldKey={fieldKey}
            fieldData={fieldData}
            suggestions={suggestions}
            onValueChange={onValueChange}
            onSuggestionSelect={onSuggestionSelect}
            onFieldUpdate={onFieldUpdate}
          />
        </div>

        <div className="col-span-1 flex items-end">
          <button
            onClick={() => onRemove(fieldKey)}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
            aria-label="Remove field"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

interface PlaceholderReferenceProps {
  placeholders: Placeholders
}

const PlaceholderReference: React.FC<PlaceholderReferenceProps> = ({ placeholders }) => (
  <div className="bg-blue-50 p-3 rounded">
    <h3 className="text-sm font-semibold text-blue-900 mb-2">Available Placeholders</h3>
    <div className="space-y-2 text-xs">
      {Object.entries(placeholders).map(([key, obj]) => (
        <div key={key} className="bg-white p-2 rounded border">
          <div className="font-medium text-blue-800 mb-1">${key}</div>
          <div className="text-gray-600 space-y-1">
            {Object.entries(obj).map(([subKey, value]) => (
              <div key={subKey} className="font-mono">
                ${key}.{subKey} → {JSON.stringify(value)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
      <div className="text-yellow-800 text-xs">
        <strong>Tip:</strong> Use dot notation in field names to create nested objects:
        <div className="font-mono mt-1">
          • user.id → creates user object with id field
          <br />• order.items → creates order object with items field
        </div>
      </div>
    </div>
  </div>
)

// Main Component
type JsonBuilderProps = {
  onChange?: (value: string) => void
  value: JsonData
}
const JsonBuilder: React.FC<JsonBuilderProps> = ({ onChange, value }) => {
  const [jsonData, setJsonData] = useState<JsonData>(value)
  const [suggestions, setSuggestions] = useState<Suggestions>({})

  const { generateSuggestions } = usePlaceholderSuggestions()
  const { buildNestedJson } = useJsonConverter()

  const addField = useCallback(() => {
    const newKey = `field_${Object.keys(jsonData).length + 1}`
    setJsonData((prev) => ({
      ...prev,
      [newKey]: { type: 'string', value: '' },
    }))
  }, [jsonData])

  const removeField = useCallback((key: string) => {
    setJsonData((prev) => {
      const { [key]: removed, ...rest } = prev
      return rest
    })
    setSuggestions((prev) => {
      const { [key]: removed, ...rest } = prev
      return rest
    })
  }, [])

  const updateField = useCallback((key: string, updates: Partial<FieldData>) => {
    setJsonData((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...updates },
    }))
  }, [])

  const updateFieldKey = useCallback((oldKey: string, newKey: string) => {
    if (newKey === oldKey) return

    setJsonData((prev) => {
      const entries = Object.entries(prev)
      const newEntries = entries.map(([k, v]) => (k === oldKey ? [newKey, v] : [k, v]))
      return Object.fromEntries(newEntries)
    })
  }, [])

  const handleValueChange = useCallback(
    (key: string, value: string) => {
      updateField(key, { value })

      if (value.includes('$') && value.length > 1) {
        const newSuggestions = generateSuggestions(value)
        setSuggestions((prev) => ({ ...prev, [key]: newSuggestions }))
      } else {
        setSuggestions((prev) => ({ ...prev, [key]: [] }))
      }
    },
    [updateField, generateSuggestions]
  )

  const selectSuggestion = useCallback(
    (key: string, suggestion: string) => {
      updateField(key, { value: suggestion })
      setSuggestions((prev) => ({ ...prev, [key]: [] }))
    },
    [updateField]
  )

  const generatedJson = useMemo(() => {
    return buildNestedJson(jsonData)
  }, [jsonData, buildNestedJson])

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(generatedJson, null, 2))
  }, [generatedJson])

  const hasFields = Object.keys(jsonData).length > 0

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white ">
      {/* <header className="mb-6">
        <p className="text-sm text-gray-600">
          Build JSON with nested objects using dot notation (user.name) and
          placeholder values ($user.name)
        </p>
      </header> */}

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-800">Fields</h2>
            <Button
              type="button"
              onClick={addField}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Plus size={14} />
              Add Field
            </Button>
          </div>

          <div className="space-y-3">
            {hasFields ? (
              Object.entries(jsonData).map(([key, fieldData], idx) => (
                <FieldRow
                  key={idx}
                  fieldKey={key}
                  fieldData={fieldData}
                  suggestions={suggestions[key] || []}
                  onKeyChange={updateFieldKey}
                  onFieldUpdate={updateField}
                  onValueChange={handleValueChange}
                  onSuggestionSelect={selectSuggestion}
                  onRemove={removeField}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-3 text-sm">No fields added yet</p>
                <Button onClick={addField} type="button" variant="default">
                  <Plus size={14} />
                  Add Your First Field
                </Button>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-800">JSON Sample Output</h2>
              <div className="flex items-center gap-1">
                <Button
                  onClick={copyToClipboard}
                  type="button"
                  variant="ghost"
                  title="Copy to clipboard"
                >
                  <Copy size={14} />
                </Button>
              </div>
            </div>
            <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto max-h-60">
              <pre className="font-mono whitespace-pre-wrap">
                {JSON.stringify(generatedJson, null, 2)}
              </pre>
            </div>
          </div>

          <PlaceholderReference placeholders={PLACEHOLDERS} />
        </section>
      </div>
    </div>
  )
}

export default JsonBuilder
