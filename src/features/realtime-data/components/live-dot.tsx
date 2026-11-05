'use client'

export function LiveDot({ label, className }: { label?: string; className?: string }) {
  return (
    <span className={`flex items-center gap-1.5 ${className ?? ''}`}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      {label && <span className="text-xs font-medium text-green-600">{label}</span>}
    </span>
  )
}
