const DEV_DOMAINS = ['dev.li2.link', 'dev.li2.sh'] as const
const PROD_DOMAINS = ['li2.link', 'li2.sh'] as const

export const AVAILABLE_DOMAINS =
  process.env.NEXT_PUBLIC_APP_ENV === 'development' ? DEV_DOMAINS : PROD_DOMAINS
