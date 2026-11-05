import Script from 'next/script'

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src={`https://cdn.li2.ai/${process.env.NEXT_PUBLIC_IDENTITY_API_KEY}`}
        strategy="afterInteractive"
      />
      {children}
    </>
  )
}
