'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  availableEvents,
  AvailableEvents,
  availableEventsList,
  useBootstrapStore,
} from '../stores/bootstrap-store'
import { useTriggerBootstrapEvent } from '../../../shared/hooks/mutations/use-bootstrap-event'
import { useParams, useSearchParams } from 'next/navigation'
import { identityStore } from '@/shared/stores/identity-store'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { CustomDialog, DialogCustomRef } from '@/shared/components/customize/custom-dialog'
import { Button } from '@/shared/components/ui/button'
import { Alert } from '@/shared/components/ui/alert'
import { CheckCircle } from 'lucide-react'
import { MigratedAnonDialog } from './migrated-anon-dialog'
import { useOrganizationStore } from '@/shared/stores/organization-store'

export default function BootstrapOnce() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const completedEvents = useBootstrapStore().completedEvents
  const eventQueue = useBootstrapStore().eventQueue
  const idle = useBootstrapStore().idle
  const dispatch = useBootstrapStore().dispatch
  const { org_id } = useParams<{ org_id: string }>()
  const { isOrgOwner } = useOrganizationStore()

  const [dialogComponent, setDialogComponent] = useState<JSX.Element | null>(null)

  const { mutate } = useTriggerBootstrapEvent()
  const onEventSuccess = useCallback(
    (event: AvailableEvents, data: any) => {
      dispatch({
        type: 'COMPLETED_EVENT',
        payload: event,
      })
      switch (event) {
        case availableEvents.FIRST_200_PREMIUM_GRANT:
          break
        case availableEvents.MIGRATE_FROM_ANONYMOUS:
          if (data && data.migrated_count > 0) {
            setDialogComponent(
              <MigratedAnonDialog
                orgId={data.org_id}
                migratedCount={data.migrated_count}
                migratedAnonTp={data.migrated_anon_tp}
                migratedUnsavedTp={data.migrated_unsaved_tp}
              />
            )
          }
          break
        case availableEvents.LOGIN_COMPLETED:
          break
        default:
          break
      }
    },
    [dispatch, org_id, router]
  )

  const anonId = identityStore().uid
  const onEventFailure = (event: AvailableEvents) => {
    dispatch({
      type: 'SET_IDLE',
      payload: true,
    })
    dispatch({
      type: 'REMOVE_EVENT_FROM_QUEUE',
      payload: event,
    })
  }
  const migrateFromAnonymous = useCallback(
    (event: AvailableEvents, payload: { anonId: string }) => {
      if (isOrgOwner) {
        mutate(
          { event, anonId: payload.anonId },
          {
            onSuccess: ({ data }) => onEventSuccess(event, data),
            onError: () => onEventFailure(event),
          }
        )
      } else {
        dispatch({
          type: 'MOVE_EVENT_TO_END',
          payload: event,
        })
      }
    },
    [mutate, isOrgOwner]
  )

  const serverEventHandlers = useCallback(
    (
      event: AvailableEvents,
      payload: {
        anonId: string
      }
    ) => {
      mutate(
        { event, anonId: payload.anonId },
        {
          onSuccess: ({ data }) => onEventSuccess(event, data),
          onError: () => onEventFailure(event),
        }
      )
    },
    [mutate]
  )

  useEffect(() => {
    if (!idle || eventQueue.length === 0) return
    const interval = setInterval(() => {
      const event = eventQueue[0]
      if (!event || !org_id || !anonId) return

      const eventHandlers: Record<AvailableEvents, () => void> = {
        FIRST_200_PREMIUM_GRANT: () => serverEventHandlers(event, { anonId }),
        MIGRATE_FROM_ANONYMOUS: () => migrateFromAnonymous(event, { anonId }),
        LOGIN_COMPLETED: () => serverEventHandlers(event, { anonId }),
      }
      dispatch({
        type: 'SET_IDLE',
        payload: false,
      })

      eventHandlers[event]?.()
    }, 3000)

    return () => clearInterval(interval)
  }, [eventQueue, anonId, completedEvents, org_id, idle, migrateFromAnonymous, serverEventHandlers])

  useEffect(() => {
    const loginCompleted = searchParams.get('LOGIN_COMPLETED')
    if (loginCompleted) {
      dispatch({
        type: 'ADD_EVENT_TO_QUEUE',
        payload: 'MIGRATE_FROM_ANONYMOUS',
      })
    }
  }, [searchParams])
  return <>{dialogComponent}</>
}
