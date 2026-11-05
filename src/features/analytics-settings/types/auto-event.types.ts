export type TriggerType = 'click' | 'pageview' | 'form_submit'

export type ConditionOperator =
  | 'contains'
  | 'equals'
  | 'starts_with'
  | 'ends_with'
  | 'matches_regex'

export type ConditionType =
  | 'page_path'
  | 'page_title'
  | 'element_text'
  | 'element_id'
  | 'element_class'
  | 'css_selector'

export interface TriggerCondition {
  id: string
  type: ConditionType
  operator: ConditionOperator
  value: string
}

export interface EventTrigger {
  id: string
  type: TriggerType
  conditions: TriggerCondition[]
}

export type EventActionType = 'lead' | 'sale'

export interface EventAction {
  id: string
  type: EventActionType
  customData: Record<string, string>
}

export interface AutoEvent {
  id: string
  name: string
  enabled: boolean
  trigger: EventTrigger
  action: EventAction
}
