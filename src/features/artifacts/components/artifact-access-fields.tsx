'use client'

import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EyeIcon, EyeOffIcon, Shuffle } from 'lucide-react'

import { ARTIFACT_PASSWORD_MAX_LENGTH, type ArtifactAccessMode } from '@/core/types/artifact.type'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { cn } from '@/shared/lib/utils'

import { generateArtifactPassword, getArtifactAccessView } from '../utils/artifact-access'

interface ArtifactAccessFieldsProps {
  value: ArtifactAccessMode
  onChange: (mode: ArtifactAccessMode) => void
  password: string
  onPasswordChange: (value: string) => void
  /** Chế độ org được chọn hôm nay — từ `useArtifactAccessModes`. Google chỉ hiện khi server bật. */
  modes: readonly ArtifactAccessMode[]
  orgName: string
  disabled?: boolean
  /** Lỗi dưới ô mật khẩu (M2.1: "Mật khẩu cần ít nhất 8 ký tự."). Rỗng thì không hiện. */
  passwordError?: string | null
  /**
   * Chế độ đang áp hôm nay — gắn badge "hiện tại" cạnh đúng dòng radio của nó, để người dùng thấy
   * mình đang rời khỏi cái gì. Trang tạo không truyền: ở đó chưa có chế độ nào đang áp.
   */
  currentMode?: ArtifactAccessMode
}

/**
 * Mục "Ai xem được" (spec M2.1) — dùng chung cho trang tạo và hộp thoại đổi chế độ, để hai nơi không
 * tả cùng một chế độ bằng hai câu.
 *
 * Bốn dòng radio, KHÔNG dropdown: mô tả của từng chế độ là thứ quyết định, và dropdown giấu nó đi cho
 * tới khi mở. Chọn Riêng tư → câu nói rõ người ngoài {org} sẽ thấy gì. Chọn Mật khẩu → ô nhập + con mắt
 * + Tạo ngẫu nhiên, và câu NÓI CHO NGƯỜI TẠO ("Người xem nhập mật khẩu này một lần rồi xem được trong
 * một tuần") — con số một tuần chỉ hiện ở đây, không hiện cho người quét.
 */
export const ArtifactAccessFields = ({
  value,
  onChange,
  password,
  onPasswordChange,
  modes,
  orgName,
  disabled,
  passwordError,
  currentMode,
}: ArtifactAccessFieldsProps) => {
  const { t } = useTranslation(['artifact'])
  const idPrefix = useId()
  const [showPassword, setShowPassword] = useState(false)
  /**
   * `-password-input`, không `-password`: dòng radio của chế độ Mật khẩu đã dùng id
   * `${idPrefix}-password` (`${idPrefix}-${mode}`), nên tên cũ tạo HAI phần tử cùng một id và
   * `<Label htmlFor>` của ô mật khẩu trỏ vào cái radio thay vì vào ô nhập.
   */
  const passwordId = `${idPrefix}-password-input`
  const passwordErrorId = `${idPrefix}-password-error`

  return (
    <div className="flex flex-col gap-3">
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as ArtifactAccessMode)}
        disabled={disabled}
        aria-label={t('artifact:access.title')}
        className="gap-2"
      >
        {modes.map((mode) => {
          const { Icon, labelKey, descriptionKey } = getArtifactAccessView(mode)
          const id = `${idPrefix}-${mode}`
          const selected = value === mode
          return (
            <label
              key={mode}
              htmlFor={id}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-[12px] border p-3 transition-colors',
                selected
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 hover:border-slate-300',
                disabled && 'cursor-not-allowed opacity-60'
              )}
            >
              <RadioGroupItem id={id} value={mode} className="mt-0.5" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-s font-medium text-foreground">
                  <Icon className="size-4 text-slate-500" aria-hidden="true" />
                  {t(labelKey)}
                  {currentMode === mode && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal leading-4 text-slate-500">
                      {t('artifact:access.current_badge')}
                    </span>
                  )}
                </span>
                <span className="text-xs text-slate-500">{t(descriptionKey)}</span>
              </span>
            </label>
          )
        })}
      </RadioGroup>

      {value === 'private' && (
        <p className="text-xs text-slate-500">
          {t('artifact:access.private_note', { org: orgName })}
        </p>
      )}

      {value === 'password' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={passwordId}>{t('artifact:access.password_label')}</Label>
          <div className="flex gap-2">
            <Input
              id={passwordId}
              type={showPassword ? 'text' : 'password'}
              value={password}
              disabled={disabled}
              maxLength={ARTIFACT_PASSWORD_MAX_LENGTH}
              autoComplete="new-password"
              placeholder={t('artifact:access.password_placeholder')}
              onChange={(e) => onPasswordChange(e.target.value)}
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? passwordErrorId : undefined}
              endAdornment={
                <button
                  type="button"
                  aria-label={t(
                    showPassword ? 'artifact:access.password_hide' : 'artifact:access.password_show'
                  )}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                  className="flex items-center text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              }
            />
            {/* Không độ trễ giả: `getRandomValues` là đồng bộ, nút trả kết quả ngay. */}
            <Button
              type="button"
              variant="secondary"
              disabled={disabled}
              iconLeft={<Shuffle className="size-4" />}
              onClick={() => {
                onPasswordChange(generateArtifactPassword())
                setShowPassword(true)
              }}
            >
              {t('artifact:access.password_generate')}
            </Button>
          </div>
          {passwordError ? (
            <p id={passwordErrorId} className="text-xs text-semantic-error">
              {passwordError}
            </p>
          ) : (
            <p className="text-xs text-slate-500">{t('artifact:access.password_viewer_note')}</p>
          )}
        </div>
      )}

      {value === 'google' && (
        <p className="text-xs text-slate-500">{t('artifact:access.google_note')}</p>
      )}
    </div>
  )
}
