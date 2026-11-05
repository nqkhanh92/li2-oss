import { useFieldArray, UseFieldArrayReturn, UseFormReturn } from 'react-hook-form'
import { DataField } from './type'
import { z } from 'zod'
import { mappingOperatorLabel } from './type'
import { ConditionInput } from './condition-input'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Select } from '@radix-ui/react-select'
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { PlusCircle, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { cn } from '@/shared/lib/cn'
import { mappingGroupOperatorLabel } from './constants'

const groupOperators = Object.keys(mappingGroupOperatorLabel) as [
  keyof typeof mappingGroupOperatorLabel
]
const allOperators = Object.keys(mappingOperatorLabel) as [keyof typeof mappingOperatorLabel]
export const conditionSchema = z.object({
  type: z.literal('comparison'),
  field: z.string().min(1, 'Field is required'),
  operator: z
    .enum(allOperators)
    .optional()
    .refine((value) => value !== null, 'Operator is required'),
  value: z.string().or(z.number()).or(z.boolean()),
})
export const conditionsSchema = z.array(conditionSchema)
export const groupConditionSchema = z.object({
  type: z.literal('group'),
  operator: z.enum(groupOperators),
  conditions: conditionsSchema,
})
type ConditionGroupInputProps = {
  form: UseFormReturn<{ condition: z.infer<typeof groupConditionSchema> }>
  dataFields: DataField[]
  maxFields: number
}
export const ConditionGroupInput: React.FC<ConditionGroupInputProps> = ({
  form,
  dataFields,
  maxFields,
}) => {
  const { fields, insert, update, remove } = useFieldArray({
    control: form.control,
    name: 'condition.conditions',
  })
  const watchOperator = form.watch('condition.operator')

  return (
    <div className="w-[450px]">
      <div className="bg-slate-50 p-2 rounded-sm space-y-2">
        <div
          className={cn(
            `border border-dashed p-2 rounded-sm space-y-2`,
            mappingGroupOperatorLabel[watchOperator].className
          )}
        >
          <div className="mb-4 space-x-2 mt-2">
            <FormField
              name="condition.operator"
              control={form.control}
              render={({ field }) => (
                <FormControl>
                  <FormItem>
                    <div className="flex gap-2 items-center">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger
                          className={`select-operator flex-1 bg-background text-${mappingGroupOperatorLabel[watchOperator].color}-600 border-${mappingGroupOperatorLabel[watchOperator].color}-600`}
                        >
                          {mappingGroupOperatorLabel[watchOperator].label.toUpperCase()} - Logic
                        </SelectTrigger>
                        <SelectContent>
                          {groupOperators.map((operator) => (
                            <SelectItem key={operator} value={operator}>
                              {mappingGroupOperatorLabel[operator].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="w-full">
                        <span className="text-xs text-slate-500">
                          {mappingGroupOperatorLabel[watchOperator].description}
                        </span>
                      </FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                </FormControl>
              )}
            ></FormField>
          </div>
          {fields.map((field, index) => (
            <>
              <div key={field.id} className="flex items-center justify-between gap-2 w-full">
                <FormField
                  name={`condition.conditions.${index}`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <FormItem className="w-full">
                      {/* <FormLabel>Condition</FormLabel> */}
                      <FormControl>
                        <ConditionInput
                          value={field.value}
                          dataFields={dataFields}
                          onChange={(value) => {
                            field.onChange(value)
                          }}
                        />
                      </FormControl>
                      {fieldState.error &&
                        Object.values(fieldState.error).map((error) => (
                          <Alert variant="destructive">
                            <AlertDescription>
                              {/* @ts-ignore */}
                              {error?.message || 'Field error!'}
                            </AlertDescription>
                          </Alert>
                        ))}
                    </FormItem>
                  )}
                />
                <Button
                  className="w-[32px]"
                  size={'icon'}
                  variant={'outline'}
                  onClick={() => remove(index)}
                >
                  <Trash2 />
                </Button>
              </div>
            </>
          ))}
          {fields.length < maxFields && (
            <Button
              size={'icon'}
              variant={'outline'}
              type="button"
              onClick={() =>
                insert(fields.length, {
                  type: 'comparison',
                  field: '',
                  operator: undefined,
                  value: '',
                })
              }
            >
              <PlusCircle />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
