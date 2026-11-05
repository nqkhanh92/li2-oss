'use client'

import { useReducer, useCallback } from 'react'
import {
  analyticsFilterReducer,
  type AnalyticsFilters,
} from '@/features/analytics/lib/analytics-filters'
import { AllTouchPointVariants } from '@/features/touch-points/types'

/**
 * Hook for managing analytics filters state
 * Uses a reducer for predictable state management
 */
export function useAnalyticsFilters(initialState?: Partial<AnalyticsFilters>) {
  const [filters, dispatch] = useReducer(analyticsFilterReducer, {
    interaction_types: initialState?.interaction_types || [],
    tag_ids: initialState?.tag_ids || [],
    tp_ids: initialState?.tp_ids || [],
    collection_ids: initialState?.collection_ids || [],
    exclude_bot: initialState?.exclude_bot ?? true,
    utm_source_values: initialState?.utm_source_values || [],
    utm_medium_values: initialState?.utm_medium_values || [],
    utm_campaign_values: initialState?.utm_campaign_values || [],
  })

  // Tag ID operations
  const setTagIds = useCallback((tagIds: string[]) => {
    dispatch({ type: 'SET_TAG_IDS', payload: tagIds })
  }, [])

  const setInteractionTypes = useCallback((interactionTypes: AllTouchPointVariants[]) => {
    dispatch({ type: 'SET_INTERACTION_TYPES', payload: interactionTypes })
  }, [])

  const addTagId = useCallback((tagId: string) => {
    dispatch({ type: 'ADD_TAG_ID', payload: tagId })
  }, [])

  const removeTagId = useCallback((tagId: string) => {
    dispatch({ type: 'REMOVE_TAG_ID', payload: tagId })
  }, [])

  // Touch-point ID operations
  const setTpIds = useCallback((tpIds: string[]) => {
    dispatch({ type: 'SET_TP_IDS', payload: tpIds })
  }, [])

  const addTpId = useCallback((tpId: string) => {
    dispatch({ type: 'ADD_TP_ID', payload: tpId })
  }, [])

  const removeTpId = useCallback((tpId: string) => {
    dispatch({ type: 'REMOVE_TP_ID', payload: tpId })
  }, [])

  // Collection ID operations
  const setCollectionIds = useCallback((collectionIds: string[]) => {
    dispatch({ type: 'SET_COLLECTION_IDS', payload: collectionIds })
  }, [])

  const addCollectionId = useCallback((collectionId: string) => {
    dispatch({ type: 'ADD_COLLECTION_ID', payload: collectionId })
  }, [])

  const removeCollectionId = useCallback((collectionId: string) => {
    dispatch({ type: 'REMOVE_COLLECTION_ID', payload: collectionId })
  }, [])

  // Bot filter operations
  const setExcludeBot = useCallback((exclude: boolean) => {
    dispatch({ type: 'SET_EXCLUDE_BOT', payload: exclude })
  }, [])

  const toggleExcludeBot = useCallback(() => {
    dispatch({ type: 'TOGGLE_EXCLUDE_BOT' })
  }, [])

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_FILTERS' })
  }, [])

  // UTM Source operations
  const setUtmSourceValues = useCallback((values: string[]) => {
    dispatch({ type: 'SET_UTM_SOURCE_VALUES', payload: values })
  }, [])

  const addUtmSourceValue = useCallback((value: string) => {
    dispatch({ type: 'ADD_UTM_SOURCE_VALUE', payload: value })
  }, [])

  const removeUtmSourceValue = useCallback((value: string) => {
    dispatch({ type: 'REMOVE_UTM_SOURCE_VALUE', payload: value })
  }, [])

  // UTM Medium operations
  const setUtmMediumValues = useCallback((values: string[]) => {
    dispatch({ type: 'SET_UTM_MEDIUM_VALUES', payload: values })
  }, [])

  const addUtmMediumValue = useCallback((value: string) => {
    dispatch({ type: 'ADD_UTM_MEDIUM_VALUE', payload: value })
  }, [])

  const removeUtmMediumValue = useCallback((value: string) => {
    dispatch({ type: 'REMOVE_UTM_MEDIUM_VALUE', payload: value })
  }, [])

  // UTM Campaign operations
  const setUtmCampaignValues = useCallback((values: string[]) => {
    dispatch({ type: 'SET_UTM_CAMPAIGN_VALUES', payload: values })
  }, [])

  const addUtmCampaignValue = useCallback((value: string) => {
    dispatch({ type: 'ADD_UTM_CAMPAIGN_VALUE', payload: value })
  }, [])

  const removeUtmCampaignValue = useCallback((value: string) => {
    dispatch({ type: 'REMOVE_UTM_CAMPAIGN_VALUE', payload: value })
  }, [])

  return {
    filters,
    setTagIds,
    addTagId,
    removeTagId,
    setTpIds,
    addTpId,
    removeTpId,
    setCollectionIds,
    addCollectionId,
    removeCollectionId,
    setExcludeBot,
    toggleExcludeBot,
    clearAllFilters,
    setUtmSourceValues,
    addUtmSourceValue,
    removeUtmSourceValue,
    setUtmMediumValues,
    addUtmMediumValue,
    removeUtmMediumValue,
    setUtmCampaignValues,
    addUtmCampaignValue,
    removeUtmCampaignValue,
    setInteractionTypes,
  }
}
