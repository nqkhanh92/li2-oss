import {
  ruleBlockSchema,
  RuleOperator,
  ruleSingleSchema,
} from '@/shared/schemas/touch-points/dynamic-targeting'
import { z } from 'zod'
import { DynamicTargetingTypes } from '@/core/types/touch-point.type'
import { RuleType } from '@/shared/schemas/touch-points/dynamic-targeting'
import {
  Ampersand,
  LucideIcon,
  MapPinned,
  MonitorSmartphone,
  MousePointerClick,
  Tally2,
} from 'lucide-react'

export const singleRules: Record<
  string,
  { defaultValues: z.infer<typeof ruleSingleSchema>; labelKey: string; icon: LucideIcon }
> = {
  // continent: {
  //   defaultValues: {
  //     ruleType: DynamicTargetingTypes.GEOGRAPHY_TARGETING,
  //     type: RuleType.SINGLE,
  //     config: {
  //       type: 'continent',
  //       values: [],
  //     },
  //     destination: '',
  //   },
  //   labelKey: 'dynamic_targeting.rule_types.continents',
  // },
  country: {
    defaultValues: {
      ruleType: DynamicTargetingTypes.GEOGRAPHY_TARGETING,
      type: RuleType.SINGLE,
      config: {
        type: 'country',
        values: [],
      },
      destination: '',
    },
    labelKey: 'dynamic_targeting.rule_types.countries',
    icon: MapPinned,
  },
  // city: {
  //   defaultValues: {
  //     ruleType: DynamicTargetingTypes.GEOGRAPHY_TARGETING,
  //     type: RuleType.SINGLE,
  //     config: {
  //       type: 'city',
  //       values: [],
  //     },
  //     destination: '',
  //   },
  //   labelKey: 'dynamic_targeting.rule_types.cities',
  // },
  device: {
    defaultValues: {
      ruleType: DynamicTargetingTypes.DEVICE_TARGETING,
      type: RuleType.SINGLE,
      config: {
        values: [],
      },
      destination: '',
    },
    labelKey: 'dynamic_targeting.rule_types.devices',
    icon: MonitorSmartphone,
  },
  interaction: {
    defaultValues: {
      ruleType: DynamicTargetingTypes.INTERACTION_TARGETING,
      type: RuleType.SINGLE,
      config: {
        values: [],
      },
      destination: '',
    },
    labelKey: 'dynamic_targeting.rule_types.interaction_channels',
    icon: MousePointerClick,
  },
}

export const blockRules: Record<
  string,
  {
    defaultValues: z.infer<typeof ruleBlockSchema>
    labelKey: string
    icon: LucideIcon
    className?: string
  }
> = {
  and: {
    defaultValues: {
      type: RuleType.BLOCK,
      operator: RuleOperator.AND,
      rules: [],
      destination: '',
    },
    labelKey: 'dynamic_targeting.block_operators.and',
    icon: Ampersand,
    className: '[&_svg]:text-semantic-success',
  },
  or: {
    defaultValues: {
      type: RuleType.BLOCK,
      operator: RuleOperator.OR,
      rules: [],
      destination: '',
    },
    labelKey: 'dynamic_targeting.block_operators.or',
    icon: Tally2,
    className: '[&_svg]:text-semantic-warning',
  },
}
