import { ORG_HOME_SECTION } from './disabled-features'
import dashboard_banner from '@/public/images/dashboard_banner.webp'
import insight_layer_1 from '@/public/images/insight_layer_1.png'

export interface BenefitIncludeOrg {
  id: string
  plan: string
  title: string
  description: string
  insight: string[]
  button: string
  hasNoise?: boolean
  buttonLink?: string
  bgImage: string
  bgImageCss?: any
  iconLayerBehindImg?: string
  iconLayerBehindImgCss?: any
  iconLayerFrontImg?: string
  iconLayerFrontImgClass?: string
  iconLayerFrontImgWidthHeight?: { width: number; height: number }
}

export interface MetaTags {
  enabled: boolean
  title: string
  description: string
  image: string
}

export interface DefaultPlan {
  name: string
  price: number | string
  isPopular?: boolean
  description: string
  benefit_include: string
  features: { title: string }[]
  buttonText: string
  redirectUrl: string
}

export const defaultMetaTags = {
  isAutoFetched: false,
  enabled: false,
  title: 'Smart Link Shortener & QR Code Generation',
  description:
    "Li2.ai - Vietnam's #1 Link Shortener with dynamic QR codes, real-time click tracking, and detailed analytics. All in one platform.",
  // image: 'https://supa.li2.ai/storage/v1/object/public/casdoor-logo/ftc/li2-logo-withtext.png',
  image: 'https://supa.li2.ai/storage/v1/object/public/casdoor-logo/ftc/meta-img.png',
}

export const defaultUTM = {
  enabled: false,
  overrideable: false,
  utm_id: undefined,
  utm_source: undefined,
  utm_medium: undefined,
  utm_campaign: undefined,
  utm_term: undefined,
  utm_content: undefined,
}

export const defaultPlans: DefaultPlan[] = [
  {
    name: 'Free',
    price: 0,
    description: 'Try it out for free',
    benefit_include: 'Perfect for getting started:',
    features: [
      { title: '1 Organization' },
      { title: '5 Tags/touchpoint' },
      { title: '10 Touchpoints/month' },
      { title: '1 Custom Slug/touchpoint' },
      { title: 'Unlimited clicks & QR Code scans' },
      { title: 'QR Code customizations' },
    ],
    buttonText: 'Get started',
    redirectUrl: '/auth/login',
  },
  {
    name: 'Free Trial',
    price: 0,
    description: 'Try it out for free',
    benefit_include: 'Try premium features before committing:',
    features: [
      { title: '1 Organization' },
      { title: '5 Tags/touchpoint' },
      { title: '10 Touchpoints/month' },
      { title: '1 Custom Slug/touchpoint' },
      { title: 'UTM Builder' },
      { title: 'Custom Meta tags' },
    ],
    buttonText: 'Get started',
    redirectUrl: '/payment?plan=free_trial',
  },
  {
    name: 'Premium',
    price: 29,
    isPopular: true,
    description: 'Unlock powerful data',
    benefit_include: 'Everything in Free, plus:',
    features: [
      { title: '3 Organizations' },
      { title: '100 Touchpoints/month' },
      { title: '3 Custom Slugs/touchpoint' },
      { title: '3 Members/organization' },
      { title: 'Advanced touchpoint types' },
      { title: 'Custom domains' },
      { title: 'Integrations' },
    ],
    buttonText: 'Get started',
    redirectUrl: 'https://li2.ai/vi/support',
  },
  {
    name: 'Enterprise',
    price: 'Custom pricing',
    description: 'Unlock powerful data',
    benefit_include: 'Everything in Premium, plus:',
    features: [
      { title: 'Custom number of organizations' },
      { title: 'Custom number tags/touchpoint' },
      { title: 'Custom number of touchpoints' },
      { title: 'Custom number of custom slugs' },
      { title: 'Advanced performance tracking' },
      { title: 'Priority support' },
    ],
    buttonText: 'Get a Quote',
    redirectUrl: 'https://li2.ai/vi/support',
  },
]

export enum PlanId {
  FREE = '80e46841-b185-4640-a95b-103cb9a85be3',
  FREE_TRIAL = '374e934f-bcd3-412f-81fe-7cbe9b8c7575',
  PREMIUM = '8c337bdb-eb2b-4d27-9814-2f8d520c7e59',
  PREMIUM_TRIAL = '804ad067-6a44-4b20-959a-ed67e670d3d6',
}

const defaultFrontImg = '/images/home_page/rocket.png'
const defaultFrontCss =
  'absolute lg:-top-[35px] lg:right-7 lg:-rotate-[15deg] lg:w-[266px] lg:h-[286px] w-[286px] h-[286px] -top-16 -right-10 -rotate-[5deg]'

export const benefitIncludeOrg: Record<PlanId, BenefitIncludeOrg> = {
  [PlanId.FREE]: {
    id: PlanId.FREE,
    plan: 'banner.have_expired.non_warning.free.plan',
    title: 'banner.have_expired.non_warning.free.title',
    description: 'banner.have_expired.non_warning.free.description',
    insight: [
      'banner.have_expired.non_warning.free.insight.0',
      'banner.have_expired.non_warning.free.insight.1',
      'banner.have_expired.non_warning.free.insight.2',
    ],
    button: 'banner.have_expired.non_warning.free.button',
    buttonLink: 'banner.have_expired.non_warning.free.buttonLink',
    bgImage: dashboard_banner.src,
    bgImageCss: {
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
    },
    hasNoise: false,
    iconLayerBehindImg: insight_layer_1.src,
    iconLayerBehindImgCss: {
      height: '200px',
    },
    iconLayerFrontImg: defaultFrontImg,
    iconLayerFrontImgClass: defaultFrontCss,
  },

  [PlanId.FREE_TRIAL]: {
    id: PlanId.FREE_TRIAL,
    plan: 'banner.have_expired.non_warning.free_trial.plan',
    title: 'banner.have_expired.non_warning.free_trial.title',
    description: 'banner.have_expired.non_warning.free_trial.description',
    insight: [
      'banner.have_expired.non_warning.free_trial.insight.0',
      'banner.have_expired.non_warning.free_trial.insight.1',
      'banner.have_expired.non_warning.free_trial.insight.2',
    ],
    button: 'banner.have_expired.non_warning.free_trial.button',
    buttonLink: 'banner.have_expired.non_warning.free_trial.buttonLink',
    bgImage: dashboard_banner.src,
    bgImageCss: {
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
    },
    hasNoise: false,
    iconLayerBehindImg: insight_layer_1.src,
    iconLayerBehindImgCss: {
      height: '200px',
    },
    iconLayerFrontImg: defaultFrontImg,
    iconLayerFrontImgClass: defaultFrontCss,
  },
  [PlanId.PREMIUM]: {
    id: PlanId.PREMIUM,
    plan: 'banner.have_expired.non_warning.premium.plan',
    title: 'banner.have_expired.non_warning.premium.title',
    description: 'banner.have_expired.non_warning.premium.description',
    insight: [
      'banner.have_expired.non_warning.premium.insight.0',
      'banner.have_expired.non_warning.premium.insight.1',
      'banner.have_expired.non_warning.premium.insight.2',
    ],
    button: 'banner.have_expired.non_warning.premium.button',
    buttonLink: 'banner.have_expired.non_warning.premium.buttonLink',
    // Styling / Visuals
    bgImage: dashboard_banner.src,
    bgImageCss: {
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
    },
    // hasNoise: false,
    iconLayerBehindImg: insight_layer_1.src,
    iconLayerBehindImgCss: {
      height: '200px',
    },
    iconLayerFrontImg: defaultFrontImg,
    iconLayerFrontImgClass: defaultFrontCss,
  },

  [PlanId.PREMIUM_TRIAL]: {
    id: PlanId.PREMIUM_TRIAL,
    plan: 'banner.have_expired.non_warning.premium_trial.plan',
    title: 'banner.have_expired.non_warning.premium_trial.title',
    description: 'banner.have_expired.non_warning.premium_trial.description',
    insight: [],
    button: 'banner.have_expired.non_warning.premium_trial.button',
    buttonLink: 'banner.have_expired.non_warning.premium_trial.buttonLink',
    bgImage: '',
    bgImageCss: {
      borderRadius: '16px',
      background:
        'linear-gradient(90deg, #509EEC -13.91%, #BBA5FF 32.87%, #EEE3FF 73.8%, #EEE3FF 85.49%, #93E2F9 103.03%)',
    },
    // hasNoise: false,
    iconLayerBehindImg: '',
    iconLayerFrontImg: '/images/home_page/gift-premium.png',
    iconLayerFrontImgWidthHeight: { width: 280, height: 167 },
    iconLayerFrontImgClass: 'absolute',
  },
}

export const protectedDefaultPath = '/org'
export const orgHomePath = (orgId: string) =>
  `/org/${orgId}/${ORG_HOME_SECTION || 'overview'}`
export const PRICING_URL = 'https://li2.ai/pricing'
