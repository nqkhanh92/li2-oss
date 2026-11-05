import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Circle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Skeleton } from '../ui/skeleton'
import { Button } from '../ui/button'
import { Trans, useTranslation } from 'react-i18next'
import Link from 'next/link'

interface CountdownCardProps {
  value: number
  displayLabel: string
  isHighlighted?: boolean
  isLoading?: boolean
  containerClassName?: string
  textClassName?: string
}

export interface CustomCountdownProps {
  containerClassName?: string
  startContent?: React.ReactNode
  expirationDate: Date | string
  planName: string
  displayUpgradeLink?: boolean
  upgradeLink?: string
  showTitle?: boolean
  countdownCardClassName?: string
  textClassName?: string
  animationClassName?: string
  spacerClassName?: string
  isPlanningSection?: boolean
  isExpanded?: boolean
  contentStyle?: string
  onButtonClick?: () => void
}

const CountdownCard = ({
  value,
  displayLabel,
  isHighlighted = false,
  isLoading = false,
  containerClassName,
  textClassName,
}: CountdownCardProps) => (
  <div className={cn('flex flex-col items-center gap-1', textClassName)}>
    <div
      className={cn(
        'flex items-center h-[50px] rounded-xl border-[1.5px] px-[10px] min-w-[50px] justify-center relative overflow-hidden text-slate-600',
        {
          'border-guest-secondary-default': isHighlighted,
          'border-slate-400': !isHighlighted,
        },
        containerClassName
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.div
            key="skeleton"
            className="w-5 h-5 bg-slate-300 rounded animate-pulse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        ) : (
          <motion.p
            key={value}
            className={cn('text-2xl font-medium z-10', {
              'text-guest-secondary-default': isHighlighted,
              'text-primary': !isHighlighted,
            })}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
          >
            {String(value).padStart(2, '0')}
          </motion.p>
        )}
      </AnimatePresence>

      <div
        className={cn('absolute top-0 left-0 h-1/2 w-full', {
          'bg-yellow-100': isHighlighted,
          'bg-slate-200': !isHighlighted,
        })}
      />
    </div>
    <span className={cn('text-center text-[10px] leading-4 font-medium', textClassName)}>
      {displayLabel.toUpperCase()}
    </span>
  </div>
)

const SpacerDots = ({
  spacerClassName,
  containerClassName,
  isExpanded = false,
}: {
  spacerClassName?: string
  containerClassName?: string
  isExpanded?: boolean
}) => (
  <div
    className={cn(
      'flex flex-col gap-2 text-slate-400 text-center items-center mb-4',
      isExpanded ? 'flex-col' : 'flex-row mb-0',
      containerClassName
    )}
  >
    {[...Array(2)].map((_, idx) => (
      <Circle key={idx} className={cn('w-1 h-1 rounded-full', spacerClassName)} />
    ))}
  </div>
)

const CountdownMessage = ({
  planName,
  isEndingSoon,
  formattedExpiryDate,
  displayUpgradeLink = true,
  upgradeLink = 'https://li2.ai/vi/support',
  startContent,
  endContent,
  containerClassName,
}: {
  planName: string
  isEndingSoon: boolean
  formattedExpiryDate: string
  displayUpgradeLink?: boolean
  upgradeLink?: string
  startContent?: React.ReactNode
  endContent?: React.ReactNode
  containerClassName?: string
}) => {
  const capitalizedPlan = planName?.charAt(0).toUpperCase() + planName?.slice(1).toLowerCase()
  const { t } = useTranslation('dashboard')
  if (isEndingSoon) {
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="flex flex-col items-start gap-[2px]">
          {startContent && startContent}
          {/* <div className="flex flex-col items-start text-sm text-slate-600"> */}
          <div className="inline items-start text-xs text-slate-600">
            <Trans
              i18nKey="dashboard:banner.have_expired.is_warning.mobile_heading_ending_soon"
              values={{ plan_to_change: capitalizedPlan || '' }}
              components={[
                <Link
                  href={upgradeLink}
                  className="text-primary font-medium inline" // ensure inline
                />,
              ]}
            />
          </div>
        </div>
        {endContent && endContent}
      </div>
    )
  }
  return (
    <div className="flex flex-col items-start gap-[2px]">
      {startContent && startContent}
      <div className="text-xs text-slate-700">
        <span className={cn('hidden lg:inline', containerClassName)}>
          {capitalizedPlan?.toLowerCase().includes('trial')
            ? t('dashboard:banner.have_expired.non_warning.description_field_trial', {
                plan: capitalizedPlan,
                date: formattedExpiryDate,
              })
            : t('dashboard:banner.have_expired.non_warning.description_field', {
                plan: capitalizedPlan,
                date: formattedExpiryDate,
              })}
        </span>
        <span className={cn('inline lg:hidden')}>
          {capitalizedPlan?.toLowerCase().includes('trial')
            ? t('dashboard:banner.have_expired.non_warning.description_field_trial', {
                plan: capitalizedPlan,
                date: formattedExpiryDate,
              })
            : t('dashboard:banner.have_expired.non_warning.description_field', {
                plan: capitalizedPlan,
                date: formattedExpiryDate,
              })}
        </span>
      </div>
    </div>
  )
}

// Main countdown component
export const CustomCountdown = ({
  containerClassName,
  showTitle = true,
  expirationDate,
  planName,
  startContent,
  displayUpgradeLink = true,
  upgradeLink = 'https://li2.ai/vi/support',
  countdownCardClassName = '',
  animationClassName = '',
  textClassName = 'text-slate-600',
  spacerClassName = 'text-slate-400 fill-slate-400',
  isExpanded = true,
  contentStyle = '',
  isPlanningSection = false,
  onButtonClick,
}: CustomCountdownProps) => {
  const [remainingMonths, setRemainingMonths] = useState(0)
  const [remainingDays, setRemainingDays] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const isEndingSoon = remainingMonths === 0 && remainingDays < 30

  useEffect(() => {
    const calculateRemainingTime = () => {
      const now = new Date()
      const expireDate =
        typeof expirationDate === 'string' ? new Date(expirationDate) : expirationDate
      const timeDifference = expireDate.getTime() - now.getTime()

      if (timeDifference <= 0) {
        setRemainingMonths(0)
        setRemainingDays(0)
        setIsLoading(false)
        return
      }

      const totalRemainingDays = Math.floor(timeDifference / (1000 * 60 * 60 * 24))
      setRemainingMonths(Math.floor(totalRemainingDays / 30))
      setRemainingDays(totalRemainingDays % 30)
      setIsLoading(false)
    }
    calculateRemainingTime()
    const interval = setInterval(calculateRemainingTime, 60000)
    return () => clearInterval(interval)
  }, [expirationDate])

  const formattedExpiryDate = useMemo(() => {
    return new Date(expirationDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }, [expirationDate])
  const { t } = useTranslation('dashboard')
  if (isPlanningSection) {
    return (
      <div className={cn('flex flex-row gap-6 items-center w-full', containerClassName)}>
        {startContent && (isLoading ? <Skeleton className="w-full h-[50px]" /> : startContent)}
        <motion.div
          className={cn('flex flex-col items-start gap-2 w-full', animationClassName)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {isLoading ? (
            <Skeleton className="w-full h-[50px]" />
          ) : (
            <div className="flex flex-row items-center w-full justify-between">
              {showTitle && (
                <CountdownMessage
                  planName={planName}
                  isEndingSoon={isEndingSoon}
                  formattedExpiryDate={formattedExpiryDate}
                  displayUpgradeLink={displayUpgradeLink}
                  upgradeLink={upgradeLink}
                  startContent={
                    <span className="text-lg font-semibold text-foreground">
                      {planName.toLowerCase().charAt(0).toUpperCase() +
                        planName.toLowerCase().slice(1)}
                    </span>
                  }
                  endContent={
                    <Button
                      type="button"
                      onClick={onButtonClick}
                      variant="special"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      {t('banner.have_expired.is_warning.button')}
                    </Button>
                  }
                  containerClassName={cn('lg:inline inline', containerClassName)}
                />
              )}
              <div className={cn('flex flex-row items-center justify-center gap-2', contentStyle)}>
                <CountdownCard
                  value={remainingMonths}
                  displayLabel="Months"
                  isHighlighted={isEndingSoon}
                  containerClassName={countdownCardClassName}
                  textClassName={cn(textClassName, 'lg:flex-row')}
                />
                <SpacerDots
                  spacerClassName={spacerClassName}
                  containerClassName={cn('lg:mb-0')}
                  isExpanded={isExpanded}
                />
                <CountdownCard
                  value={remainingDays}
                  displayLabel="Days"
                  isHighlighted={isEndingSoon}
                  containerClassName={countdownCardClassName}
                  textClassName={cn(textClassName, 'lg:flex-row')}
                />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    )
  } else {
    return (
      <div className={cn('flex flex-row gap-6 items-center w-full', containerClassName)}>
        {startContent && (isLoading ? <Skeleton className="w-full h-[50px]" /> : startContent)}
        <motion.div
          className={cn('flex flex-col items-start gap-2 w-full', animationClassName)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {isLoading ? (
            <Skeleton className="w-full h-[50px]" />
          ) : (
            <>
              {showTitle && isExpanded && (
                <CountdownMessage
                  planName={planName}
                  isEndingSoon={isEndingSoon}
                  formattedExpiryDate={formattedExpiryDate}
                  displayUpgradeLink={displayUpgradeLink}
                  upgradeLink={upgradeLink}
                  startContent={startContent}
                  containerClassName={containerClassName}
                />
              )}
              <div className={cn('flex flex-row items-center justify-center gap-2', contentStyle)}>
                <CountdownCard
                  value={remainingMonths}
                  displayLabel="Months"
                  isHighlighted={isEndingSoon}
                  containerClassName={countdownCardClassName}
                  textClassName={textClassName}
                />
                <SpacerDots spacerClassName={spacerClassName} isExpanded={isExpanded} />
                <CountdownCard
                  value={remainingDays}
                  displayLabel="Days"
                  isHighlighted={isEndingSoon}
                  containerClassName={countdownCardClassName}
                  textClassName={textClassName}
                />
              </div>
            </>
          )}
        </motion.div>
      </div>
    )
  }
}
