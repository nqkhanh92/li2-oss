import { Condition, GroupCondition } from '@/ee/features/campaigns/builder/nodes/conditions/type'
export const interactionDeviceOs = {
  ANDROID: {
    label: 'Android',
    value: 'Android',
  },
  IOS: {
    label: 'iOS',
    value: 'iOS',
  },
  WINDOWS: {
    label: 'Windows',
    value: 'Windows',
  },
  MAC: {
    label: 'Mac OS X',
    value: 'Mac OS X',
  },
  LINUX: {
    label: 'Linux',
    value: 'Linux',
  },
} as const

export const interactionDeviceTypes = {
  MOBILE: {
    label: 'Mobile',
    value: 'Mobile',
  },
  DESKTOP: {
    label: 'Desktop',
    value: 'Desktop',
  },
} as const

export type ConditionBranch = {
  nodeId: string
  expectedResult: boolean
  condition: GroupCondition
}
export type SavedPath = {
  actionId: string
  path: string[]
  conditionBranches: ConditionBranch[]
}
export type InteractionContext = {
  device_os: string
  device_type: string
  type: string
}
export type FlowContext = {
  interaction: InteractionContext
}

export enum DataFieldType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  ARRAY = 'array',
  OBJECT = 'object',
  NULL = 'null',
  SELECT = 'select',
}
