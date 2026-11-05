import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { useStepper } from './add-stepper'
import { AlertCircleIcon, Check } from 'lucide-react'
import { useDomainStore } from '@/shared/stores/domain-stepper-store'
import { useShowCustomDomain } from '@/features/custom-domains/hooks/queries'
import { useParams } from 'next/navigation'
import { LoadingMask } from '@/shared/components/customize/loading-mask'

export const FinishStep = ({ onFinish }: { onFinish: () => void }) => {
  const { org_id } = useParams<{ org_id: string }>()
  const { domainId } = useDomainStore()
  const { data, isLoading } = useShowCustomDomain(org_id, domainId)
  const { prev } = useStepper()
  return (
    <div>
      <LoadingMask loading={isLoading} className="w-full">
        {data?.is_verified ? (
          <>
            <Alert variant="success" size="lg">
              <AlertTitle className="text-xl font-semibold">
                Domain verified successfully
              </AlertTitle>
              <AlertDescription className="text-sm">
                Your domain has been verified successfully. You can now use it to shorten links.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end mt-4">
              <Button className="w-full" type="button" onClick={() => onFinish()}>
                Close
              </Button>
            </div>
          </>
        ) : (
          <>
            <Alert variant="warning" size="lg">
              <AlertTitle className="text-xl font-semibold">
                You need to verify your domain before using it
              </AlertTitle>
              <AlertDescription className="text-sm">
                Please verify your domain before using it to shorten links.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end mt-4 gap-2">
              <Button type="button" onClick={() => prev()}>
                Back
              </Button>
              <Button type="button" variant="outline" onClick={() => onFinish()}>
                Close
              </Button>
            </div>
          </>
        )}
      </LoadingMask>
    </div>
  )
}
