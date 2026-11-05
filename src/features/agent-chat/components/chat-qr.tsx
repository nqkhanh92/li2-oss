'use client'

/**
 * One QR tile on an assistant message — Track after charts in the message render (prose →
 * approval card → charts → QR tiles).
 *
 * The data comes from a structured `qr` SSE event (never parsed out of the model's prose), so
 * this component is dumb: it takes a typed QrState and draws it. Reuses the exact QR stack the
 * short-link list already uses (`QrRenderWithRef` / `DownloadQrPopover` / `handleCopyQr`) — the
 * chat needs the LIVE `qr-code-styling` instance for download (size/format) and copy, so it
 * renders the QR client-side from `short_url` rather than depending on a stored thumbnail. See
 * `touchpoint-card.tsx` for the precedent of this cross-feature import.
 */

import { useMemo, useRef } from 'react'
import { CopyIcon, DownloadIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  DownloadQrPopover,
  QrRenderRef,
  QrRenderWithRef,
} from '@/features/bootstrap/components/qr-render'
import { getQrDefaultOptions } from '@/features/touch-points/constants'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { Button } from '@/shared/components/ui/button'
import type { QrState } from '../types'

export function ChatQr({ qr }: { qr: QrState }) {
  const { t } = useTranslation(['common'])
  const qrRef = useRef<QrRenderRef>(null)
  const { organization } = useOrganizationStoreProvider()

  // `?t=1` is the QR-attribution flag the redirect handler reads to count a scan as a QR variant
  // (not a plain link click) — must always be appended, same convention as touchpoint-card.tsx.
  const qrOptions = useMemo(() => getQrDefaultOptions(`${qr.short_url}?t=1`), [qr.short_url])

  // In-app detail page for this link (opens in a new tab). Root-relative — the route accepts the
  // org id (`/org/[org_id]/short-links/[touch_point_id]`, org_slug OR id both resolve). Only built
  // when BOTH ids are known: an older server omits `linkId`, so fall back to a plain-text name
  // rather than a broken link.
  const detailHref =
    organization?.id && qr.linkId ? `/org/${organization.id}/short-links/${qr.linkId}` : null

  return (
    <div className="flex items-center gap-2 rounded-lg border p-2">
      <div className="shrink-0">
        <QrRenderWithRef
          ref={qrRef}
          qrOptions={qrOptions}
          size={64}
          border={false}
          className="p-0"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {detailHref ? (
          <a
            href={detailHref}
            target="_blank"
            rel="noopener noreferrer"
            title={qr.name}
            className="block truncate text-xs font-medium text-primary underline
              underline-offset-2 hover:text-primary/80"
          >
            {qr.name}
          </a>
        ) : (
          <p className="truncate text-xs font-medium text-foreground">{qr.name}</p>
        )}
        <div className="flex items-center gap-1">
          <DownloadQrPopover
            qrOptions={qrOptions}
            popoverAlign="start"
            button={
              <Button type="button" size="xs" variant="tertiary" iconLeft={<DownloadIcon />}>
                {t('common:buttons.download_qr')}
              </Button>
            }
          />
          <Button
            type="button"
            size="xs"
            variant="tertiary"
            iconLeft={<CopyIcon />}
            onClick={() => qrRef.current?.handleCopyQr()}
          >
            {t('common:buttons.copy_qr')}
          </Button>
        </div>
      </div>
    </div>
  )
}
