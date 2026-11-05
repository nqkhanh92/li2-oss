'use client'

import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/utils'

import { CREATE_KINDS, type CreateKind } from './create-kind'

/**
 * Công tắc `[Link rút gọn | Artifact · file / trang]` ở đầu trình tạo chung (trang 2 thiết kế).
 *
 * `role="tablist"` + `aria-selected` chứ không phải hai nút rời: người dùng trình đọc màn hình
 * cần nghe được đây là **một lựa chọn hai nhánh**, và nhánh nào đang chọn. Hai `<button>` thường
 * chỉ đọc ra hai nút không liên quan, và trạng thái "đang chọn" thì chỉ thấy bằng màu.
 *
 * Điều hướng bằng phím mũi tên là quy ước của tablist; `Tab` chỉ vào ô đang chọn (`tabIndex`),
 * đúng mẫu tab chuẩn — nếu không thì mỗi lần Tab qua công tắc phải bấm hai lần.
 */
export const CreateKindSwitch = ({
  value,
  onChange,
}: {
  value: CreateKind
  onChange: (kind: CreateKind) => void
}) => {
  const { t } = useTranslation(['touchpoint'])

  const move = (direction: -1 | 1) => {
    const index = CREATE_KINDS.indexOf(value)
    onChange(CREATE_KINDS[(index + direction + CREATE_KINDS.length) % CREATE_KINDS.length])
  }

  return (
    <div
      role="tablist"
      aria-label={t('touchpoint:merged_list.create.kind_switch_label')}
      data-testid="create-kind-switch"
      className="mx-auto inline-flex items-center gap-1 rounded-[10px] bg-slate-100 p-1"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault()
          move(1)
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault()
          move(-1)
        }
      }}
    >
      {CREATE_KINDS.map((kind) => {
        const selected = kind === value
        return (
          <button
            key={kind}
            type="button"
            role="tab"
            data-testid={`create-kind-${kind}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(kind)}
            className={cn(
              'rounded-[8px] px-3 py-1.5 text-s transition-colors',
              // Tab chọn TÔ MÀU, không chỉ nền trắng + bóng đổ: trắng trên xám nhạt là chênh
              // lệch quá yếu, và đó là lý do công tắc trông như chưa chọn gì.
              selected
                ? 'bg-primary font-medium text-primary-foreground shadow-sm'
                : 'text-slate-500 hover:text-foreground'
            )}
          >
            {t(`touchpoint:merged_list.create.kind.${kind}`)}
          </button>
        )
      })}
    </div>
  )
}
