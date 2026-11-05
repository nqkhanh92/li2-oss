import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { useEffect, useMemo, useState } from 'react'
import {
  AllOperator,
  BooleanOperator,
  DataField,
  DateOperator,
  NumberOperator,
  SelectOperator,
  StringOperator,
} from './type'
import { z } from 'zod'
import { conditionSchema } from './condition-group-input'

type ConditionInputProps = {
  dataFields: DataField[]
  value: z.infer<typeof conditionSchema>
  onChange: (value: z.infer<typeof conditionSchema>) => void
}

export const ConditionInput: React.FC<ConditionInputProps> = ({
  dataFields,
  value: formValue,
  onChange,
}) => {
  const [selectedField, setSelectedField] = useState<DataField | null>(null)
  useEffect(() => {
    const field = dataFields.find((field) => field.value === formValue.field)
    if (field) {
      setSelectedField(field)
    }
  }, [formValue.field])
  const valueField = useMemo(() => {
    switch (selectedField?.type) {
      case 'string':
        return (
          <Input
            className="bg-background"
            value={`${formValue.value}`}
            onChange={(e) => onChange({ ...formValue, value: e.target.value })}
            type="text"
          />
        )
      case 'number':
        return (
          <Input
            value={formValue.value as number}
            onChange={(e) => onChange({ ...formValue, value: Number(e.target.value) })}
            className="min-w-16 h-9! bg-background"
            type="number"
          />
        )
      case 'boolean':
        return (
          <Select
            value={`${formValue.value}`}
            onValueChange={(value) => {
              onChange({
                ...formValue,
                value: value === 'true' ? true : value === 'false' ? false : value,
              })
            }}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select a value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        )
      case 'select':
        return (
          <Select
            value={`${formValue.value}`}
            onValueChange={(value) => {
              onChange({
                ...formValue,
                value,
              })
            }}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={selectedField?.placeholder ?? 'Select a value'} />
            </SelectTrigger>
            <SelectContent>
              {selectedField?.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'date':
        return <Input type="date" />
      default:
        return <Input className="h-9! bg-background" placeholder="Select field first" disabled />
    }
  }, [selectedField, formValue])
  const operators = useMemo(() => {
    switch (selectedField?.type) {
      case 'string':
        return [
          'contains',
          'equals',
          'notEquals',
          'contains',
          'notContains',
        ] satisfies StringOperator[]
      case 'number':
        return [
          'equals',
          'notEquals',
          'greaterThan',
          'lessThan',
          'greaterThanOrEqual',
          'lessThanOrEqual',
        ] satisfies NumberOperator[]
      case 'boolean':
        return ['equals'] satisfies BooleanOperator[]
      case 'date':
        return [
          'equals',
          'notEquals',
          'greaterThan',
          'lessThan',
          'greaterThanOrEqual',
          'lessThanOrEqual',
        ] satisfies DateOperator[]
      case 'select':
        return ['equals', 'notEquals'] satisfies SelectOperator[]
      default:
        return []
    }
  }, [selectedField])
  return (
    <div className="grid grid-cols-12 gap-2 w-full">
      <div className="col-span-5 truncate">
        <Select
          value={selectedField?.value}
          onValueChange={(value) => {
            const field = dataFields.find((field) => field.value === value)
            if (field) {
              setSelectedField(field)
              onChange({
                ...formValue,
                field: value,
              })
            }
          }}
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Field" />
          </SelectTrigger>
          <SelectContent>
            {dataFields.map((field) => (
              <SelectItem key={field.value} value={field.value}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-3 truncate">
        <Select
          value={formValue.operator}
          onValueChange={(value) => {
            onChange({
              ...formValue,
              operator: value as AllOperator,
            })
          }}
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Operator" />
          </SelectTrigger>
          <SelectContent>
            {operators.map((operator) => (
              <SelectItem key={operator} value={operator}>
                {operator}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-4 truncate">{valueField}</div>
    </div>
  )
}
