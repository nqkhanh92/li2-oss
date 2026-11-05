'use client'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { CardContent } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { defaultPlans } from '@/shared/constants'
import { useTranslation } from 'react-i18next'

export default function PricingPage() {
  const router = useRouter()
  const { t } = useTranslation()
  // const [selectedBillingPeriod, setSelectedBillingPeriod] = useState("monthly");
  return (
    <div
      className="flex flex-col items-start justify-center gap-9 px-6 md:px-[90px] py-12 xs:py-20"
      style={{
        backgroundColor: 'hsla(0,0%,100%,1)',
        backgroundImage: `
          radial-gradient(at 52% 27%, hsla(29,100%,99%,0.73) 0px, transparent 50%),
          radial-gradient(at 36% 21%, hsla(29,100%,99%,0.73) 0px, transparent 50%),
          radial-gradient(at 45% 78%, hsla(0,20%,99%,0.66) 0px, transparent 50%),
          radial-gradient(at 55% 67%, hsla(0,20%,99%,0.64) 0px, transparent 50%),
          radial-gradient(at 58% 40%, hsla(182,98%,79%,0.37) 0px, transparent 50%),
          radial-gradient(at 52% 96%, hsla(182,98%,79%,1) 0px, transparent 50%),
          radial-gradient(at 64% 10%, hsla(182,98%,79%,1) 0px, transparent 50%),
          radial-gradient(at 99% 2%, hsla(197,100%,50%,1) 0px, transparent 50%),
          radial-gradient(at 86% 42%, hsla(213,100%,50%,1) 0px, transparent 50%),
          radial-gradient(at 89% 73%, hsla(213,100%,50%,1) 0px, transparent 50%),
          radial-gradient(at 83% 90%, hsla(213,100%,50%,1) 0px, transparent 50%),
          radial-gradient(at 99% 62%, hsla(213,100%,50%,1) 0px, transparent 50%),
          radial-gradient(at 0% 12%, hsla(34,100%,78%,0.36) 0px, transparent 50%),
          radial-gradient(at 0% 37%, hsla(345,100%,74%,0.49) 0px, transparent 50%),
          radial-gradient(at 1% 74%, hsla(289,71%,64%,0.25) 0px, transparent 50%),
          radial-gradient(at 0% 100%, hsla(221,62%,71%,1) 0px, transparent 50%)`,
      }}
    >
      <Button
        type="button"
        variant="outline"
        className="text-guest-primary-dark flex text-[26px] leading-[40px] font-bold bg-transparent outline-hidden border-none hover:bg-transparent"
        onClick={() => router.push('/')}
      >
        {t('common:appName')}
      </Button>
      <div className="overflow-y-scroll scroll-smooth [&::-webkit-scrollbar]:hidden h-[calc(100vh-100px)] mx-auto flex flex-col gap-9">
        <div className="flex flex-col gap-2 text-center items-center w-full">
          <h1 className="text-guest-primary-dark text-center text-[32px] leading-[40px] font-semibold">
            Find the plan for you
          </h1>
          <p className="text-slate-500 text-center text-ellipsis text-lg leading-[26px] font-normal">
            You can cancel at any time.
          </p>
        </div>
        <div className="mx-auto lg:grid lg:grid-cols-4 md:grid-cols-2 grid items-center gap-12">
          {defaultPlans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'rounded-[36px] bg-background items-center justify-center h-full flex flex-col gap-4 shadow-[0px_4px_6px_0px_rgba(65,37,185,0.10)] border-8 border-white',
                {
                  'relative border-primary': plan.isPopular,
                }
              )}
            >
              {plan.isPopular && (
                <Badge className="absolute -top-2 text-secondary bg-guest-primary-dark py-1 px-4 text-nowrap text-center justify-center items-center font-semibold rounded-xl hover:bg-guest-primary-dark">
                  RECOMMENDED
                </Badge>
              )}
              <div className="bg-slate-50 rounded-[36px] h-full">
                <CardContent className="p-6 flex flex-col gap-4 items-start self-stretch rounded-[36px] bg-background shadow-[0px_4px_6px_0px_rgba(65,37,185,0.10)]">
                  <h3 className="text-[28px] leading-7 font-bold text-guest-primary-dark">
                    {plan.name}
                  </h3>
                  <div className="flex flex-col gap-1 items-start">
                    <p className="text-[28px] leading-7 font-semibold text-guest-primary-dark">
                      ${plan.price}
                      <br />
                      <span className="text-lg font-semibold">/month</span>
                    </p>
                    <p className="text-slate-500 text-sm">{plan.description}</p>
                  </div>
                  <Button
                    size="lg"
                    className="w-full text-base border-primary px-6 py-3 rounded-full"
                    onClick={() => {
                      router.push(plan.redirectUrl)
                    }}
                  >
                    {plan.buttonText}
                  </Button>
                </CardContent>
                <div className="flex flex-col gap-4 p-6 mt-4">
                  <span className="text-ellipsis text-foreground text-sm font-semibold">
                    {plan.benefit_include}
                  </span>
                  <div className="flex flex-col items-start gap-2 self-stretch">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 self-stretch">
                        <Image
                          src="/images/CHECK_violet_white.svg"
                          width={24}
                          height={24}
                          alt="logo"
                          className="aspect-square w-[24px] h-[24px]"
                        />
                        <span className="text-slate-600 text-left text-base font-normal">
                          {feature.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
