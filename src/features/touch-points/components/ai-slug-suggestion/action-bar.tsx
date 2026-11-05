import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { isCloud } from '@/shared/constants/edition'
import { cn } from '@/shared/lib/cn'
import { Pencil, RefreshCw, Check } from 'lucide-react'

type ActionsBarProps = {
  creditsRemaining: number
  maxCredits: number
  isLoading: boolean
  handleRegenerate: (regenerate: boolean) => void
}
export const ActionsBar = ({
  creditsRemaining,
  maxCredits,
  isLoading,
  handleRegenerate,
}: ActionsBarProps) => {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
      {/* Dòng tín dụng và lời mời nâng cấp chỉ có nghĩa ở bản cloud. Bản OSS dùng khoá LLM của
          chính người vận hành, nên không có hạn mức nào để đếm. */}
      <div className="text-xs text-muted-foreground">
        {/* ⚠ Phải bọc CẢ ba ngôi, không chỉ chèn `isCloud &&` vào điều kiện: viết
            `{isCloud && x > 0 ? A : B}` thì bản OSS rơi vào nhánh B và hiện "No credits
            remaining" — ngược hẳn ý định. Mắc đúng lỗi này một lần rồi mới thấy. */}
        {isCloud &&
          (creditsRemaining > 0 ? (
            `💡 Free users: ${creditsRemaining}/${maxCredits} AI suggestions left`
          ) : (
            <span className="text-amber-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> No credits remaining
            </span>
          ))}
        {isCloud && creditsRemaining <= 2 && creditsRemaining > 0 && (
          <div className="mt-1">
            <button className="text-primary hover:underline text-xs">
              Upgrade for unlimited AI
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleRegenerate(true)}
          disabled={isLoading || creditsRemaining <= 0}
          iconLeft={<RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />}
        >
          {t('common:buttons.regenerate')}
        </Button>
      </div>
    </div>
  )
}
