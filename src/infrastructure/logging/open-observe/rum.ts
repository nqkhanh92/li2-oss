'use client'

import { openobserveRum } from '@openobserve/browser-rum'
import { openobserveLogs } from '@openobserve/browser-logs'
import type { User } from '@openobserve/browser-core'
import { openObserveConfig, isOpenObserveEnabled } from './config'

let isInitialized = false

export const initializeOpenObserve = () => {
  if (process.env.NEXT_PUBLIC_APP_ENV !== 'production') {
    return
  }

  if (isInitialized || !isOpenObserveEnabled()) {
    return
  }

  try {
    // Initialize RUM
    openobserveRum.init({
      applicationId: openObserveConfig.applicationId,
      clientToken: openObserveConfig.clientToken,
      site: openObserveConfig.site,
      service: openObserveConfig.service,
      env: openObserveConfig.env,
      version: openObserveConfig.version,
      organizationIdentifier: openObserveConfig.organizationIdentifier,
      insecureHTTP: openObserveConfig.insecureHTTP,
      apiVersion: openObserveConfig.apiVersion,
      trackResources: true,
      trackLongTasks: true,
      trackUserInteractions: true,
      defaultPrivacyLevel: 'allow', // 'allow' or 'mask-user-input' or 'mask'. Use one of the 3 values.
      sessionSampleRate: 100,
      sessionReplaySampleRate: 100,
      enableExperimentalFeatures: ['clickmap'],
    })

    // Initialize Logs
    openobserveLogs.init({
      clientToken: openObserveConfig.clientToken,
      site: openObserveConfig.site,
      service: openObserveConfig.service,
      env: openObserveConfig.env,
      version: openObserveConfig.version,
      organizationIdentifier: openObserveConfig.organizationIdentifier,
      insecureHTTP: openObserveConfig.insecureHTTP,
      apiVersion: openObserveConfig.apiVersion,
      forwardErrorsToLogs: true,
      sessionSampleRate: 100,
    })

    // Start session replay recording
    openobserveRum.startSessionReplayRecording()

    isInitialized = true
    console.log('OpenObserve RUM and Logs initialized successfully')
  } catch (error) {
    console.error('Failed to initialize OpenObserve:', error)
  }
}

export const setUser = (user: User) => {
  if (!isInitialized) return

  try {
    openobserveRum.setUser(user)
  } catch (error) {
    console.error('Failed to set user in OpenObserve:', error)
  }
}

export const addLogContext = (key: string, value: any) => {
  if (!isInitialized) return

  try {
    openobserveLogs.addLoggerGlobalContext(key, value)
  } catch (error) {
    console.error('Failed to add log context:', error)
  }
}

export const logCustomEvent = (name: string, context?: Record<string, any>) => {
  if (!isInitialized) return

  try {
    openobserveRum.addAction(name, context)
  } catch (error) {
    console.error('Failed to log custom event:', error)
  }
}
