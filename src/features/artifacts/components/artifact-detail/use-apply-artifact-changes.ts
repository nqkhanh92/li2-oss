'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  ARTIFACT_MAX_BYTES,
  artifactFormatForFileName,
  isArtifactAccessMode,
  type ArtifactAccessMode,
  type ArtifactDTO,
  type ArtifactUploadKind,
  type ReplaceArtifactResult,
} from '@/core/types/artifact.type'
import { useDebounceFn } from '@/shared/hooks/use-debounce'
import { useSlugValidation } from '@/features/touch-points/hooks/use-slug-validation'
import { slugMaxLength, slugMinLength } from '@/shared/schemas/slug'

import {
  artifactKeys,
  useArtifactQuota,
  useChangeArtifactSlug,
  useReplaceArtifact,
  useUpdateArtifactAccess,
} from '../../hooks/use-artifacts'
import { isValidSlug } from '../../constants'
import { formatBytes } from '../../utils/format-bytes'
import { getArtifactAccessView, isArtifactPasswordLongEnough } from '../../utils/artifact-access'
import { artifactApiI18n, artifactApiStatus } from '../../utils/api-error'

/**
 * `select` gom mọi trạng thái "chưa gửi byte nào" (đã chọn file hay chưa, hợp lệ hay không) — khác
 * nhau ở dữ liệu suy ra, không ở máy trạng thái. Ba pha còn lại mới là chỗ máy đổi hình: đang gửi,
 * xong, và hàng đã bị gỡ giữa đường.
 */
export type ArtifactReplacePhase = 'select' | 'uploading' | 'done' | 'gone'

/** Khối Quyền xem chỉ có hai hình: đang sửa, và "đây là mật khẩu, lần duy nhất". */
export type ArtifactAccessPhase = 'edit' | 'done'

type ServerRefusal = { slot: 'file' | 'quota'; message: string }

const stripProtocol = (url: string) => url.replace(/^https?:\/\//, '')

/** Slug hiện tại của một artifact đã live nằm ở đuôi `short_url` — DTO không trả riêng. */
export const artifactCurrentSlug = (artifact: ArtifactDTO) => {
  if (!artifact.short_url) return ''
  const path = artifact.short_url.replace(/^https?:\/\/[^/]+\/?/, '')
  return path.split(/[?#]/)[0].replace(/\/+$/, '')
}

/** Host của short link, để ô nhập slug hiện tiền tố và để ghép URL mới cho toast. */
export const artifactShortLinkHost = (artifact: ArtifactDTO) => {
  if (artifact.short_url) {
    const match = artifact.short_url.match(/^https?:\/\/([^/]+)/)
    if (match) return match[1]
  }
  const fallback = process.env.NEXT_PUBLIC_SHORT_LINK_URL ?? ''
  return fallback ? stripProtocol(fallback).replace(/\/+$/, '') : ''
}

const extensionOf = (fileName: string) => {
  const match = fileName.match(/\.[^.]+$/)
  return match ? match[0].toLowerCase() : fileName
}

export type ApplyArtifactChanges = ReturnType<typeof useApplyArtifactChanges>

/**
 * Nút lưu gộp của trang chi tiết (spec wave 4 §4). Ba khối trên trang — Link, Cập nhật nội dung,
 * Quyền xem — không có nút riêng nào; chúng chỉ *ghi nhận ý định*, và hook này là nơi duy nhất gọi
 * API. Vì vậy state của cả ba sống ở đây chứ không trong từng section: nhãn nút ở header phải đếm
 * được bao nhiêu thay đổi đang chờ, và `apply()` phải chặn TRƯỚC khi gọi khi một trong ba còn lỗi.
 *
 * Thứ tự file → quyền → slug là cố ý: thay file là bước nặng và dễ hỏng nhất (quota 403, quá cỡ
 * 413), nên nó đứng đầu để hỏng thì chưa động gì; đổi slug đứng cuối vì nó KHÔNG hoàn tác được
 * (hàng `slugs` đã insert). Không có transaction nào bọc ba bước, nên khi bước sau hỏng thì toast
 * phải nói rõ các bước trước đã áp.
 */
export const useApplyArtifactChanges = ({
  orgId,
  artifact,
}: {
  orgId: string
  artifact: ArtifactDTO
}) => {
  const { t } = useTranslation(['artifact', 'common'])
  const queryClient = useQueryClient()

  const isLive = artifact.status === 'live'
  const dtoMode: ArtifactAccessMode = isArtifactAccessMode(artifact.access_mode)
    ? artifact.access_mode
    : 'private'
  const dtoSlug = artifactCurrentSlug(artifact)

  // --- khối Cập nhật nội dung ---------------------------------------------------------------
  const [file, setFile] = useState<File | null>(null)
  const [replacePhase, setReplacePhase] = useState<ArtifactReplacePhase>('select')
  const [progress, setProgress] = useState(0)
  const [replaceResult, setReplaceResult] = useState<ReplaceArtifactResult | null>(null)
  const [refusal, setRefusal] = useState<ServerRefusal | null>(null)

  // --- khối Quyền xem -----------------------------------------------------------------------
  const [mode, setMode] = useState<ArtifactAccessMode>(dtoMode)
  const [password, setPassword] = useState('')
  const [accessPhase, setAccessPhase] = useState<ArtifactAccessPhase>('edit')
  const [savedPassword, setSavedPassword] = useState<string | null>(null)

  // --- khối Link ----------------------------------------------------------------------------
  const [slug, setSlugState] = useState(dtoSlug)
  const [slugTaken, setSlugTaken] = useState(false)
  const [slugServerError, setSlugServerError] = useState<string | null>(null)

  /**
   * Thứ vừa được áp THÀNH CÔNG trong phiên này. Không thể suy từ `artifact` prop: khi bước 3 của
   * chuỗi hỏng, bước 1–2 đã ghi vào DB nhưng trang chưa chắc đã render lại với DTO mới, và nếu
   * "đã đổi" vẫn tính theo DTO cũ thì nút gộp còn đếm một thay đổi đã áp — bấm lần nữa là gọi
   * PATCH lần hai cho cùng một giá trị.
   */
  const [appliedMode, setAppliedMode] = useState<ArtifactAccessMode | null>(null)
  const [appliedSlug, setAppliedSlug] = useState<string | null>(null)

  const [applying, setApplying] = useState(false)

  const { data: quota } = useArtifactQuota(orgId)
  const { mutateAsync: replaceAsync } = useReplaceArtifact(orgId)
  const { mutateAsync: updateAccessAsync } = useUpdateArtifactAccess(orgId)
  const { mutateAsync: changeSlugAsync } = useChangeArtifactSlug(orgId)
  const { mutateAsync: checkSlug, isPending: isCheckingSlug } = useSlugValidation()

  /**
   * Reset CHỈ khi sang một artifact khác. Không reset theo `artifact.access_mode`: bản cũ làm vậy
   * (hộp thoại đổi quyền xem cũ) và hệ quả là người dùng không bao giờ thấy mật khẩu vừa
   * đặt — `onSuccess` ghi DTO mới vào cache, `access_mode` đổi, effect chạy, pha `done` bị xoá
   * trong cùng một nhịp render (`log.md` 2026-10-06).
   */
  const lastIdRef = useRef(artifact.id)
  useEffect(() => {
    if (lastIdRef.current === artifact.id) return
    lastIdRef.current = artifact.id
    setFile(null)
    setReplacePhase('select')
    setProgress(0)
    setReplaceResult(null)
    setRefusal(null)
    setMode(dtoMode)
    setPassword('')
    setAccessPhase('edit')
    setSavedPassword(null)
    setSlugState(dtoSlug)
    setSlugTaken(false)
    setSlugServerError(null)
    setAppliedMode(null)
    setAppliedSlug(null)
  }, [artifact.id, dtoMode, dtoSlug])

  /** Mốc để tính "đã đổi": thứ vừa áp xong, nếu chưa có thì DTO. */
  const currentMode = appliedMode ?? dtoMode
  const currentSlug = appliedSlug ?? dtoSlug

  // ---- kiểm phía client, cùng thứ tự với hộp thoại cũ: đuôi → dung lượng file → delta quota ---
  const format = file ? artifactFormatForFileName(file.name) : null
  const fileIssue: string | null = !file
    ? null
    : !format
      ? t('artifact:update.wrong_type', { ext: extensionOf(file.name) })
      : file.size > ARTIFACT_MAX_BYTES
        ? t(
            format.kind === 'video'
              ? 'artifact:create.too_large_video'
              : 'artifact:errors.file_too_large',
            { max: formatBytes(ARTIFACT_MAX_BYTES), size: formatBytes(file.size) }
          )
        : refusal?.slot === 'file'
          ? refusal.message
          : null

  const delta = file ? file.size - artifact.size_bytes : 0
  const freeBytes = quota ? quota.quota_bytes - quota.used_bytes : null
  const quotaIssue: string | null =
    file && format && !fileIssue
      ? freeBytes !== null && delta > freeBytes
        ? t('artifact:update.quota_delta', {
            delta: formatBytes(delta),
            free: formatBytes(Math.max(freeBytes, 0)),
          })
        : refusal?.slot === 'quota'
          ? refusal.message
          : null
      : null

  const nextKind: ArtifactUploadKind | null = format?.kind ?? null

  // ---- quyền xem ---------------------------------------------------------------------------
  const needsPassword = mode === 'password'
  const passwordTooShort =
    needsPassword && password.trim() !== '' && !isArtifactPasswordLongEnough(password)
  const accessChanged =
    accessPhase === 'edit' && (mode !== currentMode || (needsPassword && password.trim() !== ''))
  const accessReason: string | null = !accessChanged
    ? t('artifact:access.unchanged')
    : needsPassword && password.trim() === ''
      ? t('artifact:access.password_required_reason')
      : passwordTooShort
        ? t('artifact:access.password_too_short')
        : null

  // ---- link --------------------------------------------------------------------------------
  const trimmedSlug = slug.trim()
  const slugChanged = trimmedSlug !== currentSlug
  const slugReason: string | null = !slugChanged
    ? t('artifact:detail.link.unchanged')
    : trimmedSlug === ''
      ? t('artifact:detail.link.empty')
      : !isValidSlug(trimmedSlug)
        ? t('artifact:create.slug.invalid', { min: slugMinLength, max: slugMaxLength })
        : slugTaken
          ? t('artifact:detail.link.taken', { slug: trimmedSlug })
          : slugServerError

  /**
   * Trùng slug hỏi server, debounce 500ms như `use-slug-check.tsx:20-31`. Chỉ hỏi khi slug đã đúng
   * định dạng và thật sự khác slug hiện tại — hỏi về chính slug của mình thì `exists` luôn `true`
   * và ô nhập sẽ đỏ ngay lúc mở trang.
   */
  const runSlugCheck = useDebounceFn((value: string) => {
    if (!value || value === currentSlug || !isValidSlug(value)) return
    checkSlug(value)
      .then(({ exists }) => setSlugTaken(exists))
      .catch(() => setSlugTaken(false))
  }, 500)

  const setSlug = useCallback(
    (next: string) => {
      setSlugState(next)
      setSlugTaken(false)
      setSlugServerError(null)
      runSlugCheck(next.trim())
    },
    [runSlugCheck]
  )

  const setFileAndClearRefusal = useCallback((next: File | null) => {
    setFile(next)
    setRefusal(null)
    setProgress(0)
    setReplacePhase('select')
  }, [])

  const finishAccess = useCallback(() => {
    setAccessPhase('edit')
    setSavedPassword(null)
    setPassword('')
  }, [])

  const resetReplace = useCallback(() => {
    setFile(null)
    setReplacePhase('select')
    setProgress(0)
    setReplaceResult(null)
    setRefusal(null)
  }, [])

  const pending = useMemo(
    () => ({
      file: !!file && replacePhase === 'select',
      access: accessChanged,
      // Draft đổi đường dẫn qua `publish`, không qua endpoint `…/slug` — nên nó không phải một
      // "thay đổi đang chờ" của nút gộp.
      slug: isLive && slugChanged,
    }),
    [file, replacePhase, accessChanged, isLive, slugChanged]
  )

  const count = Number(pending.file) + Number(pending.access) + Number(pending.slug)

  const tooltip = useMemo(() => {
    const parts: string[] = []
    if (pending.file) parts.push(t('artifact:detail.apply.part_file'))
    if (pending.access) parts.push(t('artifact:detail.apply.part_access'))
    if (pending.slug) parts.push(t('artifact:detail.apply.part_slug'))
    return parts.length
      ? t('artifact:detail.apply.tooltip', { parts: parts.join(' + ') })
      : t('artifact:detail.apply.tooltip_empty')
  }, [pending, t])

  const handleReplaceError = (error: unknown) => {
    const status = artifactApiStatus(error)
    const i18n = artifactApiI18n(error)
    const message = i18n ? t(i18n.key, i18n.params) : null

    // Hàng đã bị gỡ (hoặc không còn thuộc org) trong lúc trang đang mở.
    if (status === 404) {
      setReplacePhase('gone')
      return
    }
    if (status === 409) {
      toast.error(message ?? t('artifact:update.status_refuses'))
      queryClient.invalidateQueries({ queryKey: artifactKeys.detail(orgId, artifact.id) })
      setReplacePhase('select')
      return
    }
    // 403 quota / 413 quá cỡ / 400 file hỏng: ghim câu của server vào đúng ô, file vẫn pending.
    if (status === 403 || status === 413 || status === 400) {
      setRefusal({
        slot: status === 403 ? 'quota' : 'file',
        message: message ?? t('artifact:errors.generic'),
      })
      setReplacePhase('select')
      return
    }
    toast.error(message ?? t('artifact:errors.generic'))
    setReplacePhase('select')
  }

  const apply = async () => {
    if (applying) return

    if (count === 0) {
      document.getElementById('sec-replace')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      toast.info(t('artifact:detail.apply.nothing_pending'))
      return
    }
    // Chặn TRƯỚC khi gọi: một thay đổi hỏng không được kéo hai thay đổi kia đi theo.
    if (pending.file && (fileIssue || quotaIssue)) {
      toast.error((fileIssue ?? quotaIssue) as string)
      return
    }
    if (pending.access && accessReason) {
      toast.error(accessReason)
      return
    }
    if (pending.slug && slugReason) {
      toast.error(slugReason)
      return
    }

    setApplying(true)
    let appliedFile = false
    let appliedAccess = false
    try {
      if (pending.file && file) {
        setReplacePhase('uploading')
        setProgress(0)
        try {
          const replaced = await replaceAsync({
            artifact_id: artifact.id,
            file,
            onUploadProgress: setProgress,
          })
          setReplaceResult(replaced)
          setReplacePhase('done')
          appliedFile = true
        } catch (error) {
          handleReplaceError(error)
          return
        }
      }

      if (pending.access) {
        try {
          await updateAccessAsync({
            artifact_id: artifact.id,
            access_mode: mode,
            password: needsPassword ? password.trim() : undefined,
          })
          setAppliedMode(mode)
          if (needsPassword) {
            // Server băm rồi không bao giờ trả lại — đây là lần duy nhất người tạo thấy nó.
            setSavedPassword(password.trim())
            setPassword('')
            setAccessPhase('done')
          }
          appliedAccess = true
        } catch (error) {
          const i18n = artifactApiI18n(error)
          const reason =
            (i18n ? t(i18n.key, i18n.params) : null) ??
            (artifactApiStatus(error) === 409
              ? t('artifact:access.conflict')
              : t('artifact:access.dialog.failed', {
                  mode: t(getArtifactAccessView(currentMode).labelKey),
                }))
          toast.error(appliedFile ? t('artifact:detail.apply.partial_access', { reason }) : reason)
          return
        }
      }

      if (pending.slug) {
        try {
          await changeSlugAsync({ artifact_id: artifact.id, slug: trimmedSlug })
          setAppliedSlug(trimmedSlug)
        } catch (error) {
          const i18n = artifactApiI18n(error)
          const reason = i18n ? t(i18n.key, i18n.params) : t('artifact:errors.generic')
          // Lỗi hiện cả ở toast và inline dưới ô slug: toast biến mất, ô nhập thì không.
          setSlugServerError(reason)
          toast.error(
            appliedFile || appliedAccess
              ? t('artifact:detail.apply.partial_slug', { reason })
              : reason
          )
          return
        }
      }

      const parts: string[] = []
      if (pending.file) parts.push(t('artifact:detail.apply.success_content'))
      if (pending.access)
        parts.push(
          t('artifact:detail.apply.success_access', {
            mode: t(getArtifactAccessView(mode).labelKey),
          })
        )
      if (pending.slug) {
        const host = artifactShortLinkHost(artifact)
        parts.push(
          t('artifact:detail.apply.success_slug', {
            url: host ? `${host}/${trimmedSlug}` : trimmedSlug,
          })
        )
      }
      toast.success(
        t('artifact:detail.apply.success', {
          parts: parts.join(', '),
          note: pending.slug
            ? t('artifact:detail.apply.slug_note')
            : t('artifact:access.dialog.keep_qr_title'),
        })
      )
    } finally {
      setApplying(false)
    }
  }

  return {
    link: {
      slug,
      setSlug,
      currentSlug,
      host: artifactShortLinkHost(artifact),
      changed: slugChanged,
      reason: slugReason,
      isChecking: isCheckingSlug,
    },
    replace: {
      file,
      setFile: setFileAndClearRefusal,
      phase: replacePhase,
      progress,
      result: replaceResult,
      fileIssue,
      quotaIssue,
      nextKind,
      delta,
      reset: resetReplace,
    },
    access: {
      mode,
      setMode,
      password,
      setPassword,
      phase: accessPhase,
      savedPassword,
      changed: accessChanged,
      reason: accessReason,
      passwordTooShort,
      currentMode,
      finish: finishAccess,
    },
    pending,
    count,
    tooltip,
    applying,
    apply,
  }
}
