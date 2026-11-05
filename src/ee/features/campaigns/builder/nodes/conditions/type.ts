import {
  DataFieldType,
  interactionDeviceOs,
  interactionDeviceTypes,
} from '@/shared/types/campaigns'
import { mappingTouchPointVariantInteractions } from '@/features/touch-points/types'

type StringOperator = 'equals' | 'notEquals' | 'contains' | 'notContains'
type SelectOperator = 'equals' | 'notEquals'
type NumberOperator =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
type BooleanOperator = 'equals'
type DateOperator = NumberOperator

type AllOperator = StringOperator | NumberOperator | BooleanOperator | DateOperator

const mappingOperatorLabel = {
  equals: '==',
  notEquals: '!=',
  contains: 'Contains',
  notContains: 'Not Contains',
  greaterThan: '>',
  lessThan: '<',
  greaterThanOrEqual: '>=',
  lessThanOrEqual: '<=',
} as const
type Condition = {
  type: 'comparison'
  field: string
  operator: AllOperator
  value: string | number | boolean
}
type GroupOperator = 'and' | 'or' | 'not' | 'xor'
type GroupCondition = {
  type: 'group'
  operator: GroupOperator
  conditions: Condition[] // recursive!
}
type DataField = {
  label: string
  value: string
  type: DataFieldType
  options?: { value: string; label: string }[]
  placeholder?: string
}

export { mappingOperatorLabel }
export type {
  StringOperator,
  SelectOperator,
  NumberOperator,
  BooleanOperator,
  DateOperator,
  AllOperator,
  Condition,
  GroupCondition,
  GroupOperator,
  DataField,
}
