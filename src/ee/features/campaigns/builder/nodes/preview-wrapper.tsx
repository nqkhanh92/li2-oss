import { useState } from 'react'
import { colorSchemes } from './base-wrapper'
import { Settings } from 'lucide-react'

type PreviewWrapperProps = {
  children: React.ReactNode
  color?: keyof typeof colorSchemes
  icon?: React.ReactNode
  title?: string
}
export const PreviewWrapper = ({
  children,
  color = 'purple',
  icon,
  title,
}: PreviewWrapperProps) => {
  const scheme = colorSchemes[color]
  return (
    <div className={`p-0 relative rounded-md border-2 transition-all duration-200 cursor-move`}>
      <div
        className={`${scheme.gradient} px-4 py-2 rounded-t-sm flex justify-between items-center`}
      >
        <div className="flex items-center gap-2">
          <div className={`${scheme.iconBg} p-1 rounded-full text-white`}>{icon}</div>
          <h3 className="text-white font-medium text-sm">{title}</h3>
        </div>
      </div>
      <div className="bg-background p-2">
        {/* <div className="p-2 bg-slate-50 rounded-md border border-slate-100"> */}
        {children}
        {/* </div> */}
      </div>
    </div>
  )
}
