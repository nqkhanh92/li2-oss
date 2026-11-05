import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { QueryProvider } from '@/shared/providers/query-provider'
import { Toaster } from '@/shared/components/ui/sonner'
import dynamicImport from 'next/dynamic'
import { ErrorBoundary } from 'next/dist/client/components/error-boundary'
import Error from './error'
import { FormWarningProvider } from '@/shared/providers/form-warning-provider'
import { NavigationGuardProvider } from 'next-navigation-guard'
import { GoogleAnalytics } from '@next/third-parties/google'
import Script from 'next/script'
import TranslationsProvider from '@/shared/providers/translations-provider'
import { ChatWoot } from '@/shared/providers/chat-woot'
import IdentityProvider from '@/shared/providers/identity-provider'
import { ConfirmDialogProvider } from '@/shared/components/customize/confirm-dialog'
import { DubProvider } from '@/shared/providers/dub-provider'
import { disabledFeatures } from '@/shared/constants/disabled-features'

const beVietnamPro = localFont({
  src: [
    {
      path: './fonts/BeVietnamPro-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/BeVietnamPro-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './fonts/BeVietnamPro-ExtraLight.ttf',
      weight: '200',
      style: 'normal',
    },
    {
      path: './fonts/BeVietnamPro-Thin.ttf',
      weight: '100',
      style: 'normal',
    },
    {
      path: './fonts/BeVietnamPro-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/BeVietnamPro-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: './fonts/BeVietnamPro-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: './fonts/BeVietnamPro-ExtraBold.ttf',
      weight: '800',
      style: 'normal',
    },
    {
      path: './fonts/BeVietnamPro-Black.ttf',
      weight: '900',
      style: 'normal',
    },
    {
      path: './fonts/BeVietnamPro-Italic.ttf',
      weight: '400',
      style: 'italic',
    },
    {
      path: './fonts/BeVietnamPro-LightItalic.ttf',
      weight: '300',
      style: 'italic',
    },
    {
      path: './fonts/BeVietnamPro-ExtraLightItalic.ttf',
      weight: '200',
      style: 'italic',
    },
    {
      path: './fonts/BeVietnamPro-ThinItalic.ttf',
      weight: '100',
      style: 'italic',
    },
    {
      path: './fonts/BeVietnamPro-MediumItalic.ttf',
      weight: '500',
      style: 'italic',
    },
    {
      path: './fonts/BeVietnamPro-SemiBoldItalic.ttf',
      weight: '600',
      style: 'italic',
    },
    {
      path: './fonts/BeVietnamPro-BoldItalic.ttf',
      weight: '700',
      style: 'italic',
    },
    {
      path: './fonts/BeVietnamPro-ExtraBoldItalic.ttf',
      weight: '800',
      style: 'italic',
    },
    {
      path: './fonts/BeVietnamPro-BlackItalic.ttf',
      weight: '900',
      style: 'italic',
    },
  ],
  variable: '--font-be-vietnam-pro',
  preload: false,
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Rút Gọn Link & Tạo QR Code Miễn Phí Với Analytics Chi Tiết',
    template: '%s | Li2.ai',
  },
  description:
    'Li2.ai - Công cụ rút gọn link #1 Việt Nam với tính năng tạo QR động, tracking clicks real-time, thống kê chi tiết lượt quét .Tất cả trong một nền tảng.',
  applicationName: 'Li2.ai',
  keywords: ['marketing', 'proximity', 'analytics', 'campaign'],
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const ThemeProvider = dynamicImport(
    () => import('next-themes').then((mod) => mod.ThemeProvider),
    {
      ssr: false,
      loading: () => <div className="min-h-screen bg-background" />,
    }
  )
  const identityBaseUrl = process.env.SHLINK_API_URL

  return (
    <html lang="en">
      {/* <DubProvider /> */}
      <body className={`${beVietnamPro.className} overflow-y-hidden! h-screen`}>
        {/*
          Google/Safari page translation swaps text nodes out from under React.
          React's next commit then calls removeChild/insertBefore on a node whose
          parent changed and throws "NotFoundError: The object can not be found
          here.", tearing down the whole tree. This guard makes those two ops
          no-op gracefully when the parent has been swapped, keeping the page
          alive while translated. Must run before hydration -> beforeInteractive.
        */}
        <Script id="translate-dom-guard" strategy="beforeInteractive">
          {`(function () {
            if (typeof Node !== 'function' || !Node.prototype) return;
            var rm = Node.prototype.removeChild;
            Node.prototype.removeChild = function (child) {
              if (child && child.parentNode !== this) return child;
              return rm.apply(this, arguments);
            };
            var ib = Node.prototype.insertBefore;
            Node.prototype.insertBefore = function (newNode, refNode) {
              if (refNode && refNode.parentNode !== this) return this.appendChild(newNode);
              return ib.apply(this, arguments);
            };
          })();`}
        </Script>
        <TranslationsProvider>
          <ErrorBoundary errorComponent={Error}>
            <GoogleAnalytics gaId={`${process.env.NEXT_PUBLIC_APP_GA_ID}`} />
            {process.env.NEXT_PUBLIC_APP_ENV !== 'production' && (
              <Script id="microsoft-clarity" strategy="afterInteractive">
                {`
                (function(c,l,a,r,i,t,y){
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "w8bd0a2abr");
              `}
              </Script>
            )}
            <IdentityProvider baseUrl={identityBaseUrl} />
            <QueryProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem={false}
                disableTransitionOnChange
              >
                <NavigationGuardProvider>
                  <ConfirmDialogProvider>
                    <FormWarningProvider>{children}</FormWarningProvider>
                  </ConfirmDialogProvider>
                </NavigationGuardProvider>
              </ThemeProvider>
              <Toaster style={{ fontFamily: 'inherit' }} />
              {!disabledFeatures.SUPPORT_CHAT && <ChatWoot />}
            </QueryProvider>
          </ErrorBoundary>
        </TranslationsProvider>
      </body>
    </html>
  )
}
