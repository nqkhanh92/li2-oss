/**
 * Analytics filters state management
 * Types and reducer for filter state
 */

import { AllTouchPointVariants } from '@/features/touch-points/types'

export type AnalyticsFilters = {
  tag_ids: string[]
  tp_ids: string[] // touch-point IDs (link names)
  collection_ids: string[] // collection/space IDs
  exclude_bot: boolean // filter to exclude bot/crawler traffic
  utm_source_values: string[] // UTM source filter values
  utm_medium_values: string[] // UTM medium filter values
  utm_campaign_values: string[] // UTM campaign filter values
  interaction_types: AllTouchPointVariants[]
}

export type FilterAction =
  | { type: 'SET_TAG_IDS'; payload: string[] }
  | { type: 'SET_TP_IDS'; payload: string[] }
  | { type: 'SET_COLLECTION_IDS'; payload: string[] }
  | { type: 'ADD_TAG_ID'; payload: string }
  | { type: 'REMOVE_TAG_ID'; payload: string }
  | { type: 'ADD_TP_ID'; payload: string }
  | { type: 'REMOVE_TP_ID'; payload: string }
  | { type: 'ADD_COLLECTION_ID'; payload: string }
  | { type: 'REMOVE_COLLECTION_ID'; payload: string }
  | { type: 'SET_EXCLUDE_BOT'; payload: boolean }
  | { type: 'TOGGLE_EXCLUDE_BOT' }
  | { type: 'SET_UTM_SOURCE_VALUES'; payload: string[] }
  | { type: 'ADD_UTM_SOURCE_VALUE'; payload: string }
  | { type: 'REMOVE_UTM_SOURCE_VALUE'; payload: string }
  | { type: 'SET_UTM_MEDIUM_VALUES'; payload: string[] }
  | { type: 'ADD_UTM_MEDIUM_VALUE'; payload: string }
  | { type: 'REMOVE_UTM_MEDIUM_VALUE'; payload: string }
  | { type: 'SET_UTM_CAMPAIGN_VALUES'; payload: string[] }
  | { type: 'ADD_UTM_CAMPAIGN_VALUE'; payload: string }
  | { type: 'REMOVE_UTM_CAMPAIGN_VALUE'; payload: string }
  | { type: 'SET_INTERACTION_TYPES'; payload: AllTouchPointVariants[] }
  | { type: 'CLEAR_ALL_FILTERS' }

/**
 * Pure reducer function for analytics filters
 */
export function analyticsFilterReducer(
  state: AnalyticsFilters,
  action: FilterAction
): AnalyticsFilters {
  switch (action.type) {
    case 'SET_TAG_IDS':
      return {
        ...state,
        tag_ids: action.payload,
      }

    case 'SET_TP_IDS':
      return {
        ...state,
        tp_ids: action.payload,
      }

    case 'SET_COLLECTION_IDS':
      return {
        ...state,
        collection_ids: action.payload,
      }

    case 'ADD_TAG_ID':
      return {
        ...state,
        tag_ids: state.tag_ids.includes(action.payload)
          ? state.tag_ids
          : [...state.tag_ids, action.payload],
      }

    case 'REMOVE_TAG_ID':
      return {
        ...state,
        tag_ids: state.tag_ids.filter((id) => id !== action.payload),
      }

    case 'ADD_TP_ID':
      return {
        ...state,
        tp_ids: state.tp_ids.includes(action.payload)
          ? state.tp_ids
          : [...state.tp_ids, action.payload],
      }

    case 'REMOVE_TP_ID':
      return {
        ...state,
        tp_ids: state.tp_ids.filter((id) => id !== action.payload),
      }

    case 'ADD_COLLECTION_ID':
      return {
        ...state,
        collection_ids: state.collection_ids.includes(action.payload)
          ? state.collection_ids
          : [...state.collection_ids, action.payload],
      }

    case 'REMOVE_COLLECTION_ID':
      return {
        ...state,
        collection_ids: state.collection_ids.filter((id) => id !== action.payload),
      }

    case 'SET_EXCLUDE_BOT':
      return {
        ...state,
        exclude_bot: action.payload,
      }

    case 'TOGGLE_EXCLUDE_BOT':
      return {
        ...state,
        exclude_bot: !state.exclude_bot,
      }

    case 'SET_UTM_SOURCE_VALUES':
      return {
        ...state,
        utm_source_values: action.payload,
      }

    case 'ADD_UTM_SOURCE_VALUE':
      return {
        ...state,
        utm_source_values: state.utm_source_values.includes(action.payload)
          ? state.utm_source_values
          : [...state.utm_source_values, action.payload],
      }

    case 'REMOVE_UTM_SOURCE_VALUE':
      return {
        ...state,
        utm_source_values: state.utm_source_values.filter((val) => val !== action.payload),
      }

    case 'SET_UTM_MEDIUM_VALUES':
      return {
        ...state,
        utm_medium_values: action.payload,
      }

    case 'ADD_UTM_MEDIUM_VALUE':
      return {
        ...state,
        utm_medium_values: state.utm_medium_values.includes(action.payload)
          ? state.utm_medium_values
          : [...state.utm_medium_values, action.payload],
      }

    case 'REMOVE_UTM_MEDIUM_VALUE':
      return {
        ...state,
        utm_medium_values: state.utm_medium_values.filter((val) => val !== action.payload),
      }

    case 'SET_UTM_CAMPAIGN_VALUES':
      return {
        ...state,
        utm_campaign_values: action.payload,
      }

    case 'ADD_UTM_CAMPAIGN_VALUE':
      return {
        ...state,
        utm_campaign_values: state.utm_campaign_values.includes(action.payload)
          ? state.utm_campaign_values
          : [...state.utm_campaign_values, action.payload],
      }

    case 'REMOVE_UTM_CAMPAIGN_VALUE':
      return {
        ...state,
        utm_campaign_values: state.utm_campaign_values.filter((val) => val !== action.payload),
      }

    case 'SET_INTERACTION_TYPES':
      return {
        ...state,
        interaction_types: action.payload,
      }

    case 'CLEAR_ALL_FILTERS':
      return {
        interaction_types: [],
        tag_ids: [],
        tp_ids: [],
        collection_ids: [],
        exclude_bot: false,
        utm_source_values: [],
        utm_medium_values: [],
        utm_campaign_values: [],
      }

    default:
      return state
  }
}
