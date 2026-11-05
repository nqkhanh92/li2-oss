'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import { CustomDialog } from '@/shared/components/customize/custom-dialog'
import { Button } from '@/shared/components/ui/button'
import { useRouter } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { CooldownButton } from '@/shared/components/customize/cooldown-button'
import { useTimeZoneStore } from '../stores/time-zone.store'
import { AvailableEvents, useBootstrapStore } from '../../features/bootstrap/stores/bootstrap-store'
import { authStore, AuthStoreValue } from '../stores/profile-store'

export interface UserProfile {
  email: string
  name: string
  created_at?: string
  display_name?: string
  address?: string
  createdTime?: string
  id?: string
  dob?: Date
  timezone?: string
  completed_events?: AvailableEvents[]
  is_banned?: boolean
  ban_reason?: string
  banned_at?: string
  avatar?: string | null
}

const Context = React.createContext<AuthStoreValue | null>(null)
const ProfileProvider = ({
  children,
  profile: _profile,
}: {
  children: React.ReactNode
  profile: UserProfile | null
}) => {
  const store = authStore()

  const router = useRouter()
  const setTimezone = useTimeZoneStore().setTimezone
  useEffect(() => {
    if (_profile) {
      store.setProfile(_profile)
    }
    const tz = _profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    setTimezone(tz)
  }, [_profile])
  const dispatch = useBootstrapStore().dispatch

  useEffect(() => {
    if (_profile && _profile.id && window.$chatwoot) {
      window.$chatwoot.setUser(_profile.id, {
        email: _profile.email,
        name: _profile.name,
      })
    }

    if (_profile) {
      dispatch({
        type: 'SET_COMPLETED_EVENTS',
        payload: _profile.completed_events || [],
      })
    }
  }, [_profile])

  return (
    <Context.Provider value={store}>
      {!_profile && (
        <CustomDialog
          size="sm"
          noButton
          initialOpen={!_profile}
          noFooter
          disableBackdropClose
          title="Expired Session"
        >
          {({ close }) => (
            <div className="space-y-4">
              <p>Your session has expired. Please login again.</p>
              <div className="flex justify-end gap-2">
                <CooldownButton
                  cooldownUntil={null}
                  cooldown={{ duration: 3000, key: 'retry-session' }}
                  onClick={() => {
                    router.refresh()
                  }}
                >
                  Retry
                </CooldownButton>
                <Button
                  onClick={() => {
                    store.logout()
                  }}
                >
                  Logout
                </Button>
              </div>
            </div>
          )}
        </CustomDialog>
      )}
      {children}
    </Context.Provider>
  )
}
const useProfileProvider = (): AuthStoreValue => {
  const ctx = React.useContext(Context)
  if (!ctx) throw Error(`Lack of provider`)
  return ctx
}

export { ProfileProvider, useProfileProvider }
