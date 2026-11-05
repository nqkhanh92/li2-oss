'use client'
import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useRef } from 'react'
import { useCannySso } from '../hooks/use-canny-sso'
import { Dialog, DialogContent } from '../components/ui/dialog'
import { SkeletonCard } from '../components/customize/skeleton-card'
import { cn } from '../lib/utils'
import { Button } from '../components/ui/button'
import { disabledFeatures } from '../constants/disabled-features'

interface CannyContextType {
  scriptLoaded: boolean
  initChangelog: () => void
  openBoard: () => void
  isLoading: boolean
  roadMapUrl: string
}

const CannyContext = createContext<CannyContextType | undefined>(undefined)

export const CannyProvider = ({ children }: { children: ReactNode }) => {
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [frDialogLoading, setFrDialogLoading] = useState(false)
  const [frDialogOpen, setFrDialogOpen] = useState(false)
  const { ssoToken, isLoading: isLoadingToken } = useCannySso({
    enabled: !disabledFeatures.ROADMAP,
  })
  const roadMapUrl = `https://li2.canny.io/?ssoToken=${ssoToken}`

  useEffect(() => {
    // Ẩn Roadmap = không tải SDK bên thứ ba, không chỉ ẩn nút.
    if (disabledFeatures.ROADMAP) return
    const script = document.createElement('script')
    script.src = 'https://sdk.canny.io/sdk.js'
    document.body.appendChild(script)
    script.onload = () => {
      setScriptLoaded(true)
    }
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  const initChangelog = () => {
    if (scriptLoaded && window.Canny) {
      window.Canny('initChangelog', {
        appID: '697b27cdb05360f75646c8fd',
        position: 'top',
        align: 'left',
        theme: 'light',
      })
    }
  }

  const openBoard = () => {
    if (scriptLoaded && window.Canny) {
      setFrDialogOpen(true)
      setFrDialogLoading(true)

      setTimeout(() => {
        window.Canny('render', {
          boardToken: process.env.NEXT_PUBLIC_CANNY_BOARD_TOKEN,
          basePath: null,
          ssoToken: ssoToken || undefined,
          theme: 'light',
        })
        setFrDialogLoading(false)
      }, 100)
    }
  }

  return (
    <CannyContext.Provider
      value={{
        scriptLoaded,
        initChangelog,
        openBoard,
        isLoading: isLoadingToken,
        roadMapUrl,
      }}
    >
      {children}
      <Dialog modal={true} open={frDialogOpen} onOpenChange={setFrDialogOpen}>
        <DialogContent
          className="
            w-[900px] max-w-[95vw]
            h-[650px] max-h-[90vh]
            bg-white rounded-xl shadow-lg
            p-0
            translate-x-[-50%]! translate-y-[-50%]!
          "
        >
          <div
            data-canny
            className={cn(
              'w-[850px] h-[600px] my-auto mx-auto',
              (isLoadingToken || frDialogLoading) && 'hidden'
            )}
          />
          {(isLoadingToken || frDialogLoading) && (
            <SkeletonCard bodyParts={4} className="w-full h-[600px] border-none" />
          )}
        </DialogContent>
      </Dialog>
    </CannyContext.Provider>
  )
}

export const useCanny = () => {
  const context = useContext(CannyContext)
  if (context === undefined) {
    throw new Error('useCanny must be used within a CannyProvider')
  }
  return context
}
