import { Button } from '@/shared/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { buildJson, flattenContext, parseJsonFromContext } from './utils'
import { LockableSection } from '@/shared/components/customize/lockable-section'
import { FlowContext, interactionDeviceOs, interactionDeviceTypes } from '@/shared/types/campaigns'

type JsonBuilderProps = {
  fieldName: string
}
type FormValue = {
  [key: string]: Field[]
}
type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'expression'
export type Field = {
  type: FieldType
  value: string
  key: string | number | boolean | any
}
type Suggestion = {
  value: string
  description: string
  type: FieldType
}
const sampleContext: FlowContext = {
  interaction: {
    device_os: interactionDeviceOs.ANDROID.value,
    device_type: interactionDeviceTypes.MOBILE.value,
    type: 'QR',
  },
}

const FieldValue = ({
  type,
  value,
  onChange,
}: {
  type: FieldType
  value: string
  onChange: (value: string) => void
}) => {
  const suggestions = useMemo(() => {
    return flattenContext(sampleContext)
  }, [])
  const [dropdown, setDropdown] = useState<string[]>([])
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const match = value.slice(0, value.length).match(/\$([\w.]*)$/)
    if (match) {
      const partial = match[1]
      const filtered = suggestions.filter((s) => s.startsWith(partial))
      console.log({ partial, filtered, dropdown })
      setDropdown(filtered)
    } else {
      setDropdown([])
    }
    onChange(value)
  }
  const handleSelect = (suggestion: string) => {
    onChange(`$${suggestion}`)
    setDropdown([])
  }

  switch (type) {
    case 'string':
      return (
        <div className="relative">
          <Input
            value={value}
            onChange={handleChange}
            placeholder="Enter value or $user.name"
            className="w-full"
          />
          {dropdown.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-32 overflow-y-auto">
              {dropdown.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="px-2 py-1 text-sm cursor-pointer hover:bg-blue-50 font-mono"
                  onClick={() => handleSelect(suggestion)}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    case 'number':
      return <Input value={value} onChange={(e) => onChange(e.target.value)} />
    case 'boolean':
      return (
        <Select value={value} onValueChange={(value) => onChange(value)}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select a type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      )
    case 'array':
      return <Input value={value} onChange={(e) => onChange(e.target.value)} />
    case 'expression':
      return (
        <LockableSection locked={true} lockBy="coming_soon">
          <Input value={value} onChange={(e) => onChange(e.target.value)} />
        </LockableSection>
      )
  }
}
type FieldProps = {
  fieldName: string
  field: Field
  index: number
  onRemove: (index: number) => void
}
const SingleField = ({ fieldName, field, index, onRemove }: FieldProps) => {
  const { control, watch, resetField } = useFormContext<FormValue>()
  const watchType = watch(`${fieldName}.${index}.type`)
  return (
    <div className="grid grid-cols-12 gap-2 items-end">
      <FormField
        key={`${fieldName}.${index}.key`}
        control={control}
        name={`${fieldName}.${index}.key`}
        render={({ field }) => (
          <FormItem className="col-span-3">
            {index === 0 && <FormLabel>Key</FormLabel>}
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        key={`${fieldName}.${index}.type`}
        control={control}
        name={`${fieldName}.${index}.type`}
        render={({ field }) => (
          <FormItem className="col-span-2">
            {index === 0 && <FormLabel>Type</FormLabel>}
            <FormControl>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  resetField(`${fieldName}.${index}.value`, {
                    defaultValue: '',
                  })
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="array">Array</SelectItem>
                  <SelectItem value="expression">Expression</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        key={`${fieldName}.${index}.value`}
        control={control}
        name={`${fieldName}.${index}.value`}
        render={({ field: valueField }) => (
          <FormItem className="col-span-6">
            {index === 0 && <FormLabel>Value</FormLabel>}
            <FormControl>
              <FieldValue
                type={watchType}
                value={valueField.value}
                onChange={valueField.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button
        className="col-span-1 h-10"
        type="button"
        variant="destructive"
        size="icon"
        onClick={() => onRemove(index)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
export const JsonBuilderV2: React.FC<JsonBuilderProps> = ({ fieldName }) => {
  const { control, watch } = useFormContext<FormValue>()
  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldName,
  })
  const watchFields = watch(fieldName)
  const jsonValue = useMemo(() => {
    return buildJson(watchFields)
  }, [JSON.stringify(watchFields)])
  const previewValue = useMemo(() => {
    return parseJsonFromContext(jsonValue, sampleContext)
  }, [JSON.stringify(jsonValue)])
  return (
    <div>
      <div className="flex justify-end">
        <Button
          size="xs"
          type="button"
          onClick={() =>
            append({
              key: `field_${fields.length + 1}`,
              type: 'string',
              value: '',
            })
          }
        >
          Add field
        </Button>
      </div>
      <div className="flex flex-col gap-2 ">
        {fields.map((field, index) => (
          <SingleField
            key={`${fieldName}.${index}`}
            fieldName={fieldName}
            field={field}
            index={index}
            onRemove={remove}
          />
        ))}
      </div>
      <div className="font-medium mt-4">Preview</div>
      <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto max-h-60 mt-2">
        <pre className="font-mono whitespace-pre-wrap">{JSON.stringify(previewValue, null, 2)}</pre>
      </div>
    </div>
  )
}
