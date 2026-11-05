'use client'
import { Card, CardTitle, CardDescription, CardContent } from '@/shared/components/ui/card'
import { Label } from '@/shared/components/ui/label'

import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { Separator } from '@/shared/components/ui/separator'
import { Button } from '@/shared/components/ui/button'
import { MomoIcon } from '@/shared/components/icons/momo-icon'
import { useCreateMomoPayment } from '@/ee/features/payment/hooks/mutation'
import { useProfileProvider } from '@/shared/providers/auth-provider'
import { useMemo, useState } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'

const plans = [
  {
    name: 'ANNUAL',
    price: 50000,
    isRecommended: true,
    description: 'Unlock powerful data',
    features: [
      { title: '3 Organizations' },
      { title: 'Unlimited Touchpoints' },
      { title: '10 Tags per touchpoint' },
      { title: 'Unlimited clicks & QR Code scans' },
      { title: 'QR Code customizations' },
    ],
    buttonText: 'Get Started',
    redirectUrl: '/pricing',
    isPopular: true,
  },
  {
    name: 'MONTHLY',
    price: 29900,
    isRecommended: true,
    description: 'Unlock powerful data',
    features: [
      { title: '3 Organizations' },
      { title: 'Unlimited Touchpoints' },
      { title: '10 Tags per touchpoint' },
      { title: 'Unlimited clicks & QR Code scans' },
      { title: 'QR Code customizations' },
    ],
    buttonText: 'Get Started',
    redirectUrl: '/pricing',
    isPopular: true,
  },
]

export default function PaymentPage() {
  const { mutate: createMomoPayment, isPending } = useCreateMomoPayment()
  const { profile } = useProfileProvider()
  const [selectedPlan, setSelectedPlan] = useState('annual')
  const cost = useMemo(() => {
    if (selectedPlan === 'annual') {
      return plans[0].price
    }
    return plans[1].price
  }, [selectedPlan])
  const handleCreateMomoPayment = async () => {
    if (!profile) {
      return
    }
    createMomoPayment({
      plan_name: plans.find((plan) => plan.name === selectedPlan)?.name || '',
      plan_price: cost.toString(),
      retention_days: selectedPlan === 'annual' ? 365 : 30,
    })
  }

  const handleRadioChange = (value: string) => {
    setSelectedPlan(value)
  }

  const router = useRouter()
  const { t } = useTranslation()
  return (
    <div className="py-8 px-4 mx-auto bg-neutral-700 w-full h-full justify-center flex flex-col gap-2 items-start lg:px-[90px]">
      <Button
        type="button"
        variant="outline"
        className="text-guest-primary-dark flex text-[26px] leading-[40px] font-bold bg-transparent outline-hidden border-none hover:bg-transparent"
        onClick={() => router.push('/')}
      >
        {t('common:appName')}
      </Button>
      <div className="w-full justify-center flex">
        <CardContent className="flex-col flex gap-6 max-w-3xl w-full rounded-[36px] bg-background p-9 items-start justify-center">
          <h1 className="text-[28px] leading-[40px] font-bold">Upgrade Your Plan</h1>
          <div className="grid gap-6 w-full">
            <CardContent className="p-0 flex-col flex gap-3">
              <CardTitle className="text-foreground font-semibold text-lg leading-[28px]">
                Billing cycle
              </CardTitle>
              <RadioGroup
                defaultValue={selectedPlan}
                className="grid grid-cols-1 gap-4"
                onValueChange={handleRadioChange}
              >
                <Label
                  htmlFor="annual"
                  className="flex flex-row items-center justify-start rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary gap-2"
                >
                  <RadioGroupItem value="annual" id="annual" />
                  <div className="flex items-center gap-6 w-full">
                    <span className="text-base font-medium">Annual</span>
                    <Badge className="bg-red-600 rounded-full px-4 py-2 text-base font-medium text-white hover:bg-red-600 hover:text-white">
                      Save 17% on annual plan
                    </Badge>
                  </div>
                  <p className="text-xl font-medium text-foreground">${plans[0].price}</p>
                </Label>
                <Label
                  htmlFor="monthly"
                  className="flex flex-row items-center justify-start rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary gap-4"
                >
                  <RadioGroupItem value="monthly" id="monthly" />
                  <div className="flex items-center gap-6 w-full">
                    <span className="text-base font-medium">Monthly</span>
                  </div>
                  <p className="text-xl font-medium text-foreground">${plans[1].price}</p>
                </Label>
              </RadioGroup>
            </CardContent>
          </div>
          <CardContent className="p-0 flex-col flex gap-3 w-full">
            <CardTitle className="text-foreground font-semibold text-lg leading-[28px]">
              Payment Options
            </CardTitle>
            <RadioGroup defaultValue="momo" className="grid grid-cols-1 gap-4">
              <div>
                <RadioGroupItem value="momo" id="momo" className="peer sr-only" />
                <Label
                  htmlFor="momo"
                  className="flex flex-row gap-2 items-center justify-start rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <MomoIcon className="w-12 h-12" />
                  <p className="text-slate-700 font-semibold text-sm leading-[22px]">Momo</p>
                </Label>
              </div>
              {/* <div>
                <RadioGroupItem
                value="digital-wallet"
                id="digital-wallet"
                className="peer sr-only"
                />
                <Label
                htmlFor="digital-wallet"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                <WalletCardsIcon className="mb-3 h-6 w-6" />
                Digital Wallet
                </Label>
                </div>
                <div>
                <RadioGroupItem
                value="other"
                id="other"
                className="peer sr-only"
                />
                <Label
                htmlFor="other"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                <DollarSignIcon className="mb-3 h-6 w-6" />
                Other
                </Label>
                </div> */}
            </RadioGroup>
          </CardContent>
          <div className="grid gap-6 w-full">
            <Card className="bg-slate-100 rounded-3xl">
              <CardContent className="gap-4 flex flex-col pt-6">
                <div className="flex flex-col gap-[2px]">
                  <CardTitle className="text-foreground font-semibold text-lg leading-[28px]">
                    Summary
                  </CardTitle>
                  <CardDescription className="text-slate-600 text-sm font-normal">
                    Review your order details
                  </CardDescription>
                </div>
                <div className="grid gap-1">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span>{cost} </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Discount</span>
                    {/* <span>-$10.00</span> */}
                  </div>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between text-[15px] leading-[22px] text-foreground font-semibold">
                    <span>Total</span>
                    <span className="text-[28px] leading-[28px] font-semibold">${cost}</span>
                  </div>
                </div>
                {/* <div className="grid gap-2">
                <div className="flex items-center justify-between">
                <span>Items</span>
                <span>1</span>
                </div>
                <div className="flex items-center justify-between">
                <span>Delivery</span>
                <span>Standard (3-5 days)</span>
                </div>
                </div> */}
              </CardContent>
            </Card>
            <Button
              size="lg"
              className="w-full"
              onClick={handleCreateMomoPayment}
              disabled={isPending}
            >
              Place Order
            </Button>
          </div>
        </CardContent>
      </div>
    </div>
  )
}

function MomoCardIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function CreditCardIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  )
}

function DollarSignIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function WalletCardsIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2" />
      <path d="M3 11h3c.8 0 1.6.3 2.1.9l1.1.9c1.6 1.6 4.1 1.6 5.7 0l1.1-.9c.5-.5 1.3-.9 2.1-.9H21" />
    </svg>
  )
}
