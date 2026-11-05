'use client'
import { useEffect } from 'react'

export const DubProvider = () => {
  useEffect(() => {
    // if (process.env.NODE_ENV == 'development') return
    const script = document.createElement('script')
    script.src = 'https://www.dubcdn.com/analytics/script.js'
    script.async = true
    const domainsConfig = {
      outbound: ['li2.ai', 'app.li2.ai'],
    }

    script.setAttribute('data-domains', JSON.stringify(domainsConfig))

    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  return null
}
