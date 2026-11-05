'use client'

import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Link2 } from 'lucide-react'

import type { ArtifactAccessMode, ArtifactDTO } from '@/core/types/artifact.type'
import { Button } from '@/shared/components/ui/button'
import { RelativeTime } from '@/shared/components/ui/relative-time'

import { getArtifactAccessView } from '../../utils/artifact-access'
import { ArtifactAccessFields } from '../artifact-access-fields'
import { ArtifactPasswordReveal } from '../artifact-password-reveal'
import { ArtifactNotice, ArtifactSection } from './artifact-section'
import { ArtifactViewersLine } from './artifact-viewers-line'
import type { ApplyArtifactChanges } from './use-apply-artifact-changes'

/**
 * Khối Quyền xem (spec wave 4 §3.2) — thân của hai hộp thoại cũ (đổi quyền xem, đổi mật khẩu) gộp
 * lại, bỏ cả ba nút Lưu / Đổi / Đổi mật khẩu: nút gộp ở header là nơi duy nhất gọi API. Đổi mật
 * khẩu giờ KHÔNG còn là một hộp thoại riêng, nó là "chọn radio Mật khẩu rồi nhập mật khẩu mới".
 *
 * Pha `done` (mật khẩu hiện một lần) chỉ tắt khi người dùng bấm Xong hoặc khi sang artifact khác —
 * KHÔNG tắt theo `artifact.access_mode`. Xem chú thích reset trong `useApplyArtifactChanges`.
 */
export const ArtifactAccessSection = ({
  orgId,
  artifact,
  access,
  modes,
  orgName,
  disabled,
}: {
  orgId: string
  artifact: ArtifactDTO
  access: ApplyArtifactChanges['access']
  modes: readonly ArtifactAccessMode[]
  orgName: string
  disabled?: boolean
}) => {
  const { t } = useTranslation(['artifact', 'common'])
  const errorId = useId()

  const isDraft = artifact.status === 'draft'
  const currentLabel = t(getArtifactAccessView(access.currentMode).labelKey)
  const leavingPassword = access.currentMode === 'password' && access.mode !== 'password'
  const showError = access.changed && !!access.reason

  return (
    <ArtifactSection
      id="sec-access"
      title={t('artifact:access.detail_title')}
      lead={
        <>
          {t('artifact:access.section_lead', { mode: currentLabel })}
          {access.currentMode === 'password' && (
            <>
              {t('artifact:access.section_set_at', { time: '' })}
              <RelativeTime date={artifact.password_set_at ?? artifact.created_at} />
            </>
          )}
          {'. '}
          {t(isDraft ? 'artifact:access.draft_note' : 'artifact:access.section_live_note')}
        </>
      }
    >
      {access.phase === 'done' && access.savedPassword ? (
        <div className="flex flex-col gap-4">
          <ArtifactPasswordReveal password={access.savedPassword} />
          <Button type="button" size="sm" className="self-end" onClick={access.finish}>
            {t('artifact:access.password_dialog.done')}
          </Button>
        </div>
      ) : (
        <>
          <ArtifactAccessFields
            value={access.mode}
            onChange={access.setMode}
            password={access.password}
            onPasswordChange={access.setPassword}
            modes={modes}
            orgName={orgName}
            disabled={disabled}
            currentMode={access.currentMode}
            passwordError={access.passwordTooShort ? t('artifact:access.password_too_short') : null}
          />

          {leavingPassword && (
            <ArtifactNotice
              tone="warning"
              Icon={AlertTriangle}
              title={t('artifact:access.leaving_password_title')}
              body={t('artifact:access.dialog.leaving_password')}
            />
          )}

          <ArtifactNotice
            tone="info"
            Icon={Link2}
            title={t('artifact:access.dialog.keep_qr_title')}
            body={t('artifact:access.dialog.keep_qr_body')}
          />

          {showError && (
            <p id={errorId} className="text-xs text-semantic-error">
              {access.reason}
            </p>
          )}
        </>
      )}

      {/**
       * "Ai đã xem" chỉ là MỘT dòng + đường vào Khách hàng (quyết định Q4, giữ nguyên 2026-11-01 khi
       * chủ sản phẩm bác bản dựng thành bảng): danh sách đầy đủ sống ở phần Khách hàng.
       *
       * Nháp thì không có — chưa có địa chỉ công khai nên chưa ai mở được nó, và một dòng nói về
       * người xem ở đó là một câu không có nội dung. `blocked` thì VẪN có: nó đã từng live.
       */}
      {!isDraft && (
        <ArtifactViewersLine
          orgId={orgId}
          artifactId={artifact.id}
          mode={access.currentMode}
          viewerCount={artifact.viewer_count}
        />
      )}
    </ArtifactSection>
  )
}
