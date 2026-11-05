'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CheckCircle2, LoaderCircle, RefreshCw, XCircle } from 'lucide-react'

import {
  ARTIFACT_MAX_BYTES,
  artifactKindForFileName,
  type ArtifactAccessMode,
} from '@/core/types/artifact.type'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'

import {
  ARTIFACT_PHASE1_ACCESS_MODES,
  useArtifactAccessModes,
  useCreateArtifact,
  usePublishArtifact,
} from '../../hooks/use-artifacts'
import {
  fileNameWithoutExtension,
  hasAcceptedExtension,
  isValidSlug,
  normalizeSlugInput,
  randomSlug,
  slugMaxLength,
  slugMinLength,
} from '../../constants'
import { useSlugValidation } from '@/features/touch-points/hooks/use-slug-validation'
import { useDebounceFn } from '@/shared/hooks/use-debounce'
import { MAX_TOUCHPOINTS_NAME_LENGTH } from '@/shared/schemas/touch-points'
import { formatBytes } from '../../utils/format-bytes'
import { artifactApiI18n, artifactApiStatus } from '../../utils/api-error'
import { isArtifactPasswordLongEnough } from '../../utils/artifact-access'
import { ArtifactAccessFields } from '../artifact-access-fields'
import { ArtifactCreatedDialog } from '../artifact-created-dialog'
import { ArtifactDropzone } from './artifact-dropzone'
import { ArtifactCreateSidebar } from './create-sidebar'
import { ArtifactCreateRightPanel } from './create-right-panel'
import { ArtifactCreateQuotaNote } from './create-quota-note'
import type { ArtifactCreateSection } from './create-sections'
import {
  CREATE_TITLE_NAV_CLASS,
  CreateTitleBar,
} from '@/features/short-links/components/unified-create/create-title-bar'
import { getArtifactBackPath } from '@/features/artifacts/utils/list-path'

/** `titleSlot`: xem ghi chú cùng tên ở `ShortLinkCreate` — công tắc loại đứng đúng chỗ tiêu đề. */
export const ArtifactCreate = ({ titleSlot }: { titleSlot?: React.ReactNode } = {}) => {
  const { org_id } = useParams<{ org_id: string }>()
  const router = useRouter()
  const { t } = useTranslation(['artifact', 'common'])
  const { organization } = useOrganizationStoreProvider()
  const reasonId = useId()

  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  // Điền sẵn một slug ngẫu nhiên để người dùng xuất bản được ngay; họ sửa lại tuỳ ý.
  // Hàm khởi tạo lười, không gọi lại mỗi lần render.
  const [slug, setSlug] = useState(randomSlug)
  const [accessMode, setAccessMode] = useState<ArtifactAccessMode>('public')
  const [section, setSection] = useState<ArtifactCreateSection>('basic')
  const [password, setPassword] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)
  /**
   * TÁCH khỏi `fileError` một cách có chủ đích.
   *
   * `fileError` nghĩa là "file đang chọn có vấn đề" và nó KHOÁ nút — đúng, vì file đó không dùng
   * được. Còn "chưa chọn file" thì không được khoá (chủ sản phẩm 2026-10-27). Nhét nó vào
   * `fileError` thì bấm một lần là nút khoá lại, tức bỏ `!!file` khỏi `canSubmit` xong lại tự
   * dựng lại hàng rào ấy bằng đường khác.
   */
  const [noFileNotice, setNoFileNotice] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [published, setPublished] = useState<{
    id: string
    shortUrl: string
    accessMode: ArtifactAccessMode
    password: string
  } | null>(null)

  const { mutateAsync: createArtifact, isPending: isCreating } = useCreateArtifact(org_id)
  const { mutateAsync: publishArtifact, isPending: isPublishing } = usePublishArtifact(org_id)
  const { data: accessModes } = useArtifactAccessModes(org_id)
  const isPending = isCreating || isPublishing

  /**
   * Lỗi của backend nói rõ hơn câu chung của FE — nhất là quota: `field_exceed_limit` với
   * `label.storage` (vượt trục dung lượng) và `field_exceed_number_limit` với
   * `label.artifact` (vượt trục số artifact live) là hai việc khác nhau phải làm. Chỉ rơi
   * về câu chung khi không đọc được gì (mất mạng, 502 của proxy).
   */
  const messageFor = (error: unknown, fallbackKey: string) => {
    const i18n = artifactApiI18n(error)
    return i18n ? t(i18n.key, i18n.params) : t(fallbackKey)
  }

  const handleFileChange = (next: File | null) => {
    setFile(next)
    setProgress(0)
    // Mọi lần đụng vào ô file đều xoá câu "chưa chọn file" — kể cả khi file mới cũng hỏng, vì
    // lúc đó `fileError` mới là câu đúng và hai câu cùng lúc thì không câu nào đọc được.
    setNoFileNotice(null)
    if (!next) {
      setFileError(null)
      return
    }
    if (!hasAcceptedExtension(next.name)) {
      setFileError(t('artifact:errors.wrong_type', { max: formatBytes(ARTIFACT_MAX_BYTES) }))
      return
    }
    if (next.size > ARTIFACT_MAX_BYTES) {
      /**
       * Video có câu riêng vì người dùng chạm lỗi này thường xuyên nhất ở đó: một đoạn `.mov`
       * quay bằng iPhone gần như luôn vượt 10MB. Câu chung chỉ báo là đã hỏng; câu cho video
       * nói được việc tiếp theo — quay ở chất lượng thấp hơn, hoặc cắt ngắn.
       */
      const isVideo = artifactKindForFileName(next.name) === 'video'
      setFileError(
        t(isVideo ? 'artifact:create.too_large_video' : 'artifact:errors.file_too_large', {
          max: formatBytes(ARTIFACT_MAX_BYTES),
          size: formatBytes(next.size),
        })
      )
      return
    }
    setFileError(null)
    // Chỉ điền hộ khi ô còn trống, để không đè thứ người dùng đã sửa.
    setName(
      (current) =>
        current || fileNameWithoutExtension(next.name).slice(0, MAX_TOUCHPOINTS_NAME_LENGTH)
    )
  }

  // Slug rỗng là hợp lệ (backend tự sinh). Chỉ chặn khi người dùng đã gõ một slug hỏng —
  // để nó đi tiếp nghĩa là upload thành công rồi publish ném 500 và artifact kẹt draft.
  const slugFormatError =
    slug && !isValidSlug(slug)
      ? t('artifact:create.slug.invalid', { min: slugMinLength, max: slugMaxLength })
      : null

  /**
   * Slug trùng phải chặn NGAY tại ô, không để tới lúc bấm: artifact đã upload xong rồi mới
   * publish, nên một slug trùng nghĩa là file nằm lại ở trạng thái draft và người dùng phải
   * sang trang chi tiết dọn. Dùng đúng endpoint mà short link dùng (`/slugs/check`) vì slug
   * của artifact và của short link nằm chung một không gian tên.
   */
  const { mutateAsync: checkSlug, isPending: isCheckingSlug } = useSlugValidation()
  const [slugTaken, setSlugTaken] = useState(false)
  const runSlugCheck = useDebounceFn(async (value: string) => {
    if (!value || !isValidSlug(value)) return
    try {
      const { exists } = await checkSlug(value)
      // Người dùng có thể đã gõ tiếp trong lúc chờ mạng; chỉ nhận kết quả cho giá trị hiện tại.
      setSlugTaken((current) => (value === slugRef.current ? exists : current))
    } catch {
      // Mạng hỏng thì không kết luận là trùng — để nút mở và backend nói lời cuối.
      setSlugTaken(false)
    }
  }, 500)
  const slugRef = useRef(slug)
  useEffect(() => {
    slugRef.current = slug
    setSlugTaken(false)
    runSlugCheck(slug)
  }, [slug])

  const slugError = slugFormatError ?? (slugTaken ? t('artifact:create.slug.taken') : null)
  const slugAvailable = !!slug && !slugError && !isCheckingSlug

  /**
   * M2.1: Mật khẩu mà ô trống → nút khoá với lý do "Đặt mật khẩu trước đã" (cùng `reasonId`); gõ dưới 8
   * → lỗi DƯỚI Ô và nút vẫn khoá. Hai thông điệp ở hai chỗ vì hai việc khác nhau: chưa làm, và làm sai.
   */
  const needsPassword = accessMode === 'password'
  const passwordTyped = password.trim() !== ''
  const passwordTooShort = needsPassword && passwordTyped && !isArtifactPasswordLongEnough(password)
  const passwordMissing = needsPassword && !passwordTyped
  /**
   * ⚠ KHÔNG còn `!!file` — chủ sản phẩm 2026-10-27, và CỐ Ý hẹp đúng ca "chưa chọn file".
   *
   * Ô thả file to đùng ngay trên nút đã nói rồi, nên khoá thêm là thừa. Ba lý do còn lại (`slug`
   * trùng · thiếu mật khẩu · mật khẩu quá ngắn) **vẫn khoá**: chúng sửa được ngay tại chỗ trên
   * màn hình, nên khoá nút là tín hiệu đúng.
   *
   * Đi kèm bắt buộc: `handleSubmit` phải TỰ CHẶN và báo lỗi. Bỏ `!!file` khỏi đây mà để nguyên
   * `if (!file) return` thì nút bấm được nhưng không xảy ra gì cả — im lặng hoàn toàn, tệ hơn
   * cả nút khoá.
   */
  const canSubmit =
    !fileError && !slugError && !isCheckingSlug && !passwordMissing && !passwordTooShort
  const lockedReason =
    fileError ??
    (slugTaken
      ? t('artifact:create.slug.taken')
      : passwordMissing
        ? t('artifact:access.password_required_reason')
        : null)

  /**
   * Hai request nối tiếp cho một hành động của người dùng. Nếu publish hỏng thì
   * artifact vẫn tồn tại ở trạng thái draft — đưa họ sang trang chi tiết để bấm
   * Xuất bản lại, chứ không báo "tạo thất bại" rồi để họ tải lên lần nữa và sinh
   * ra bản trùng.
   */
  const handleSubmit = async () => {
    /**
     * Chưa chọn file thì BÁO LỖI, không `return` trần.
     *
     * Ghim câu lỗi xuống dưới ô chọn file (`fileError`) chứ không chỉ toast: toast tắt sau vài
     * giây, còn người vừa bấm một nút không thấy gì xảy ra sẽ bấm tiếp. Câu ghim ở lại cho tới
     * khi họ chọn file — lúc đó `onPickFile` tự xoá nó.
     */
    if (!file) {
      setNoFileNotice(t('artifact:create.no_file_reason'))
      toast.error(t('artifact:create.no_file_reason'))
      // Câu ghim nằm dưới ô chọn file, ở mục Thông tin cơ bản. Đang đứng ở mục khác mà chỉ ghim
      // thôi thì người dùng nhận một toast rồi không thấy gì nữa.
      setSection('basic')
      return
    }
    let artifactId: string
    try {
      const created = await createArtifact({
        file,
        name: name || undefined,
        onUploadProgress: setProgress,
      })
      artifactId = created.id
    } catch (error) {
      const message = messageFor(error, 'artifact:errors.upload_failed')
      toast.error(message)
      /**
       * 403 ở bước này là quota dung lượng của tổ chức, không phải file hỏng: file đang chọn
       * vẫn hợp lệ nên nút Xuất bản sẽ sáng lại ngay và người dùng bấm lần nữa vào đúng bức
       * tường cũ. Ghim câu của backend xuống dưới ô chọn file để nó còn đó sau khi toast tắt,
       * và để nút khoá lại cho tới khi họ đổi file.
       */
      if (artifactApiStatus(error) === 403) {
        setFileError(message)
        setSection('basic')
      }
      return
    }

    try {
      const published = await publishArtifact({
        artifact_id: artifactId,
        slug: slug || undefined,
        access_mode: accessMode,
        password: needsPassword ? password.trim() : undefined,
      })
      if (published.short_url) {
        setPublished({
          id: published.id,
          shortUrl: published.short_url,
          accessMode,
          password: needsPassword ? password.trim() : '',
        })
      } else {
        router.push(`/org/${org_id}/artifacts/${artifactId}`)
      }
    } catch (error) {
      toast.warning(messageFor(error, 'artifact:errors.publish_failed_draft_kept'))
      router.push(`/org/${org_id}/artifacts/${artifactId}`)
    }
  }

  return (
    <ContentLayout
      title={
        titleSlot ? (
          <CreateTitleBar center={titleSlot} right={<ArtifactCreateQuotaNote orgId={org_id} />} />
        ) : (
          t('artifact:create.title')
        )
      }
      navBarClassName={titleSlot ? CREATE_TITLE_NAV_CLASS : undefined}
      backPath={getArtifactBackPath(org_id)}
      footer={
        <div className="w-full max-w-7xl mx-auto my-auto px-6 lg:px-12">
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-4 justify-center">
              <Button
                type="button"
                variant="tertiary"
                disabled={isPending}
                onClick={() => router.push(getArtifactBackPath(org_id))}
              >
                {t('common:buttons.cancel')}
              </Button>
              <LoadingButton
                type="button"
                isLoading={isPending}
                disabled={!canSubmit}
                aria-describedby={canSubmit ? undefined : reasonId}
                onClick={handleSubmit}
              >
                {t('artifact:create.submit')}
              </LoadingButton>
            </div>
            {/* Nút khoá phải tự nói vì sao, ngay tại chỗ. Mật khẩu ngắn đã có câu dưới ô, không lặp. */}
            {!canSubmit && lockedReason && (
              <p id={reasonId} className="text-xs text-slate-500">
                {lockedReason}
              </p>
            )}
          </div>
        </div>
      }
    >
      {/*
        Ba cột, cùng khung và cùng khoảng cách với trang tạo Short link (`short-link-form/index.tsx`):
        cột trái là một thẻ riêng, cột giữa và cột phải nằm trong MỘT thẻ chung có vách ngăn.
        Dưới `xl` thì xếp dọc — cột trái thành một dải mục ở trên, cột phải xuống dưới cùng.
      */}
      <div className="mx-auto flex w-full flex-col gap-5 xl:flex-row">
        <div className="xl:w-[252px] 2xl:w-[302px] xl:shrink-0">
          <ArtifactCreateSidebar selected={section} onSelect={setSection} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-6 p-6">
            {section === 'basic' && (
              <>
                <ArtifactDropzone
                  file={file}
                  onFileChange={handleFileChange}
                  error={fileError ?? noFileNotice}
                  disabled={isPending}
                />

                {isCreating && (
                  <div
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t('artifact:create.uploading')}
                    className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="artifact-name">{t('artifact:create.name.label')}</Label>
                  <Input
                    id="artifact-name"
                    maxLength={MAX_TOUCHPOINTS_NAME_LENGTH}
                    value={name}
                    disabled={isPending}
                    placeholder={t('artifact:create.name.placeholder')}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">{t('artifact:create.name.hint')}</p>
                </div>

                {/* Slug hiện sẵn: đây là thứ duy nhất không sửa được sau khi QR đã in */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="artifact-slug">{t('artifact:create.slug.label')}</Label>
                  <div className="relative">
                    <Input
                      id="artifact-slug"
                      value={slug}
                      disabled={isPending}
                      placeholder={t('artifact:create.slug.placeholder')}
                      onChange={(e) => setSlug(normalizeSlugInput(e.target.value))}
                      aria-invalid={!!slugError}
                      aria-describedby={slugError ? 'artifact-slug-error' : undefined}
                      className="pr-16"
                    />
                    <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                      {isCheckingSlug ? (
                        <LoaderCircle className="size-4 animate-spin text-slate-400" />
                      ) : slugError ? (
                        <XCircle className="size-4 text-semantic-error" />
                      ) : slugAvailable ? (
                        <CheckCircle2 className="size-4 text-green-600" />
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        disabled={isPending}
                        onClick={() => setSlug(randomSlug())}
                        title={t('artifact:create.slug.regenerate')}
                        aria-label={t('artifact:create.slug.regenerate')}
                      >
                        <RefreshCw className="size-3.5 text-slate-500" />
                      </Button>
                    </div>
                  </div>
                  {slugError ? (
                    <p id="artifact-slug-error" className="text-xs text-semantic-error">
                      {slugError}
                    </p>
                  ) : slugAvailable ? (
                    <p className="text-xs text-green-600">{t('artifact:create.slug.available')}</p>
                  ) : (
                    <p className="text-xs text-slate-500">{t('artifact:create.slug.hint')}</p>
                  )}
                </div>
              </>
            )}

            {/*
              M2.1 — Ai xem được, giờ là MỘT MỤC riêng ở cột trái (mockup §3), không còn nằm lẫn
              dưới cùng một cột dài. `ArtifactAccessFields` dùng lại nguyên vẹn: bộ chọn chế độ chỉ
              được tả ở một chỗ, nếu không thì trang tạo và hộp thoại đổi chế độ sẽ nói hai câu khác
              nhau về cùng một chế độ.
            */}
            {section === 'access' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-lg font-semibold text-slate-700">
                    {t('artifact:create.access_lead')}
                  </h2>
                  <p className="text-sm text-slate-500">{t('artifact:create.access_sub')}</p>
                </div>
                <ArtifactAccessFields
                  value={accessMode}
                  onChange={setAccessMode}
                  password={password}
                  onPasswordChange={setPassword}
                  modes={accessModes?.modes ?? ARTIFACT_PHASE1_ACCESS_MODES}
                  orgName={organization?.name ?? ''}
                  disabled={isPending}
                  passwordError={passwordTooShort ? t('artifact:access.password_too_short') : null}
                />
              </div>
            )}

            {section === 'qr' && (
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-slate-700">
                  {t('artifact:create.sections.qr')}
                </h2>
                <p className="text-sm text-slate-500">{t('artifact:create.qr.section_note')}</p>
                {/* Mã QR thật nằm ở cột phải; mục này chỉ nói nó đến từ đâu và khi nào tải được. */}
                <p className="text-sm text-slate-500">{t('artifact:create.qr.publish_first')}</p>
              </div>
            )}

            {/*
              Thẻ: bảng `artifacts` KHÔNG có cột thẻ và `publish` không nhận thẻ. Nên ở đây là một
              câu nói thật, không phải một ô chọn thẻ nuốt mất thứ người dùng gõ vào.
            */}
            {section === 'tags' && (
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-slate-700">
                  {t('artifact:create.sections.tags')}
                </h2>
                <p className="text-sm text-slate-500">{t('artifact:create.tags.unavailable')}</p>
              </div>
            )}
          </div>

          <ArtifactCreateRightPanel
            slug={slug}
            accessMode={accessMode}
            className="shrink-0 border-t border-border lg:w-[252px] lg:border-l lg:border-t-0 2xl:w-[302px]"
          />
        </div>
      </div>

      {published && (
        <ArtifactCreatedDialog
          shortUrl={published.shortUrl}
          accessMode={published.accessMode}
          password={published.password || undefined}
          onClose={() => router.push(`/org/${org_id}/artifacts/${published.id}`)}
        />
      )}
    </ContentLayout>
  )
}
