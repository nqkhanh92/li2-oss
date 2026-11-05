import { Card, CardContent } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Button } from '../ui/button'
import { SparklesIcon } from 'lucide-react'
import Image from 'next/image'

type Props = {
  title: string
  description?: string
  className?: string
  children: React.ReactNode
  callToAction?: string | React.ReactNode
  blocked?: boolean
  imageError?: string
  blockBy: 'plan' | 'permission'
  showButtonPlan?: boolean
}
export const ContentBlock = ({
  title,
  description,
  className,
  children,
  blocked,
  blockBy,
  imageError,
  callToAction,
  showButtonPlan = true,
}: Props) => {
  if (blocked) {
    return (
      <div className="flex items-start justify-center h-full w-full">
        <div
          className={cn(
            'p-6 flex flex-col gap-6 bg-background rounded-[16px] lg:w-[700px] items-center',
            className
          )}
        >
          <Alert size={'lg'} variant={blockBy === 'plan' ? 'warning' : 'destructive'}>
            <AlertTitle>
              {title || (blockBy === 'plan' ? 'Plan limit' : 'Permission denied')}
            </AlertTitle>
            <AlertDescription>
              {description ||
                (blockBy === 'plan'
                  ? 'You have reached the limit of this feature for your plan'
                  : 'You do not have permission to do this')}
              {callToAction && callToAction}
            </AlertDescription>
          </Alert>
          {imageError && <Image src={imageError} alt="" width={300} height={165} className="" />}
          {blockBy === 'plan' && showButtonPlan && (
            <div className="flex gap-2 justify-center">
              <Button variant="default">
                <SparklesIcon /> View Plan
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  } else {
    return children
  }
}
