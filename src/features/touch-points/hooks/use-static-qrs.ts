'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

import type {
  StaticQrItem,
  StaticQrPayload,
} from '@/features/touch-points/components/static-qr/static-qr.types'
import { getQrDefaultOptions } from '@/features/touch-points/constants'

const STORAGE_KEY = 'quik.static_qrs.v1'

type StoredStaticQrItem = Omit<StaticQrItem, 'qr_customize_options'> & {
  qr_customize_options?: any
}

const safeParse = (raw: string | null): StoredStaticQrItem[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const payloadToQrData = (payload: StaticQrPayload) => {
  if (payload.type === 'wifi') {
    const ssid = payload.wifi?.ssid ?? ''
    const password = payload.wifi?.password ?? ''
    const security = payload.wifi?.security ?? (password ? 'WPA' : 'nopass')
    const hidden = payload.wifi?.hidden ? 'true' : 'false'
    return `WIFI:T:${security};S:${ssid};P:${password};H:${hidden};;`
  }
  if (payload.type === 'url') {
    return payload.url ?? ''
  }
  return payload.text ?? ''
}

export const useStaticQrs = (orgId: string) => {
  const [items, setItems] = useState<StaticQrItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    const stored = safeParse(raw)
      .filter((x) => x?.org_id === orgId)
      .map((x) => x as StaticQrItem)

    setItems(stored)
    setIsLoading(false)
  }, [orgId])

  const persist = useCallback(
    (next: StaticQrItem[]) => {
      if (typeof window === 'undefined') return

      const raw = window.localStorage.getItem(STORAGE_KEY)
      const storedAll = safeParse(raw)

      const keepOthers = storedAll.filter((x) => x?.org_id !== orgId)
      const merged: StoredStaticQrItem[] = [...keepOthers, ...(next as any)]

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      setItems(next)
    },
    [orgId]
  )

  const getById = useCallback(
    (id: string) => {
      return items.find((x) => x.id === id) ?? null
    },
    [items]
  )

  const create = useCallback(
    (input: { name: string; payload: StaticQrPayload; qr_customize_options?: any }) => {
      const now = new Date().toISOString()
      const data = payloadToQrData(input.payload)
      const created: StaticQrItem = {
        id: uuidv4(),
        org_id: orgId,
        name: input.name,
        payload: input.payload,
        qr_customize_options: {
          ...getQrDefaultOptions(data),
          ...(input.qr_customize_options ?? {}),
          data,
        } as any,
        created_at: now,
        updated_at: now,
      }

      persist([created, ...items])
      return created
    },
    [items, orgId, persist]
  )

  const update = useCallback(
    (id: string, input: { name: string; payload: StaticQrPayload; qr_customize_options?: any }) => {
      const now = new Date().toISOString()
      const data = payloadToQrData(input.payload)
      const next = items.map((x) => {
        if (x.id !== id) return x
        return {
          ...x,
          name: input.name,
          payload: input.payload,
          qr_customize_options: {
            ...getQrDefaultOptions(data),
            ...(input.qr_customize_options ?? {}),
            data,
          } as any,
          updated_at: now,
        }
      })

      persist(next)
      return next.find((x) => x.id === id) ?? null
    },
    [items, persist]
  )

  const remove = useCallback(
    (id: string) => {
      const next = items.filter((x) => x.id !== id)
      persist(next)
    },
    [items, persist]
  )

  const result = useMemo(
    () => ({
      items,
      isLoading,
      getById,
      create,
      update,
      remove,
    }),
    [create, getById, isLoading, items, remove, update]
  )

  return result
}
