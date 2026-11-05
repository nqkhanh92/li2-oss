import { defineStepper } from '@/shared/components/ui/stepper'
import { CreateDomainStep } from './create-domain-step'
import { VerifyDomainStep } from './verify-domain-step'
import React, { useEffect } from 'react'
import { Button } from '@/shared/components/ui/button'
import { FinishStep } from './finish-step'
import { useDomainStore } from '@/shared/stores/domain-stepper-store'
import { Separator } from '@/shared/components/ui/separator'
import { cn } from '@/shared/lib/utils'
import { Trans, useTranslation } from 'react-i18next'
import { t } from 'i18next'

export const {
  StepperProvider,
  StepperControls,
  StepperNavigation,
  StepperPanel,
  StepperStep,
  StepperTitle,
  useStepper,
  StepperDescription,
} = defineStepper(
  {
    id: 'create-domain-stepper',
    title: 'domain:forms.addDomainStep.title',
    description: 'domain:forms.addDomainStep.description',
  },
  {
    id: 'verify-domain-step',
    title: 'domain:forms.verifyDomainStep.title',
    description: 'domain:forms.verifyDomainStep.description',
  }
)
type AddCustomDomainStepperProps = {
  onFinish: () => void
  setDialogSize: React.Dispatch<React.SetStateAction<'lg' | 'md' | 'sm'>>
  setDialogTitle: React.Dispatch<React.SetStateAction<string>>
  setDialogDescription: React.Dispatch<React.SetStateAction<string>>
}
export const AddCustomDomainStepper = ({
  onFinish,
  setDialogSize,
  setDialogTitle,
  setDialogDescription,
}: AddCustomDomainStepperProps) => {
  const { t } = useTranslation('domain')
  return (
    <StepperProvider className="space-y-4" variant="horizontal">
      {({ methods }) => {
        useEffect(() => {
          setDialogTitle?.(t(methods.current.title))
          setDialogDescription?.(t(methods.current.description))
          switch (methods.current.id) {
            case 'create-domain-stepper':
              setDialogSize?.('sm')
              break
            case 'verify-domain-step':
              setDialogSize?.('lg')
              break
          }
        }, [methods.current])

        return (
          <React.Fragment>
            <div className="flex items-center space-x-8 w-full">
              {methods.all.map((step) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center space-x-3">
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full min-w-5 min-h-5 flex items-center justify-center text-sm font-medium',
                        methods.current.id >= step.id
                          ? 'bg-primary'
                          : 'bg-background border border-gray-200'
                      )}
                    >
                      <div
                        className={cn(
                          'bg-background w-2 h-2 rounded-full',
                          methods.current.id >= step.id ? 'bg-background' : 'bg-gray-200'
                        )}
                      ></div>
                    </div>

                    <span
                      className={cn(
                        'text-sm',
                        methods.current.id >= step.id ? 'text-gray-900' : 'text-gray-400'
                      )}
                    >
                      <Trans i18nKey={t(step.title)} components={{ br: <br /> }} />
                    </span>
                  </div>

                  {/* Connector Line (don't show after last step) */}
                  {methods.all.indexOf(step) < methods.all.length - 1 && (
                    <Separator className="ml-6 md:w-32 w-16 h-px bg-gray-200" />
                  )}
                </div>
              ))}
            </div>
            {methods.switch({
              'create-domain-stepper': () => {
                return <CreateDomainStep />
              },
              'verify-domain-step': () => {
                return <VerifyDomainStep onFinish={onFinish} />
              },
            })}
          </React.Fragment>
        )
      }}
    </StepperProvider>
  )
}
export const VerifyDomainStepper = ({
  onFinish,
  domainId,
}: {
  onFinish: () => void
  domainId: string
}) => {
  const setDomainId = useDomainStore((state) => state.setDomainId)
  setDomainId(domainId)

  return (
    <StepperProvider className="space-y-6" variant="horizontal" initialStep="verify-domain-step">
      {({ methods }) => (
        <React.Fragment>
          <div className="flex items-center space-x-8 w-full">
            {methods.all.map((step) => (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center space-x-3">
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full min-w-5 min-h-5 flex items-center justify-center text-sm font-medium',
                      methods.current.id >= step.id
                        ? 'bg-primary'
                        : 'bg-background border border-gray-200'
                    )}
                  >
                    <div
                      className={cn(
                        'bg-background w-2 h-2 rounded-full',
                        methods.current.id >= step.id ? 'bg-background' : 'bg-gray-200'
                      )}
                    ></div>
                  </div>

                  <span
                    className={cn(
                      'text-sm',
                      methods.current.id >= step.id ? 'text-slate-700' : 'text-gray-400'
                    )}
                  >
                    <Trans i18nKey={t(step.title)} components={{ br: <br /> }} />
                  </span>
                </div>

                {/* Connector Line (don't show after last step) */}
                {methods.all.indexOf(step) < methods.all.length - 1 && (
                  <Separator className="ml-6 md:w-32 w-16 h-px bg-gray-200" />
                )}
              </div>
            ))}
          </div>
          {methods.switch({
            'verify-domain-step': () => {
              return <VerifyDomainStep onFinish={onFinish} />
            },
          })}
        </React.Fragment>
      )}
    </StepperProvider>
  )
}
