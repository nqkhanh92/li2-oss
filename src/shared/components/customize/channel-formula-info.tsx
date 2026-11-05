'use client'

import { HelpCircle } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'

const CHANNEL_RULES = [
  { priority: 1,  name: 'Direct',           color: 'bg-slate-400',   desc: 'Source empty or "(direct)", medium empty/(none)/(not set), no referrer' },
  { priority: 2,  name: 'Cross-network',    color: 'bg-purple-500',  desc: 'Campaign contains "cross-network"' },
  { priority: 3,  name: 'Email',            color: 'bg-yellow-500',  desc: 'Source or medium matches email / e-mail / e_mail / e mail' },
  { priority: 4,  name: 'SMS',              color: 'bg-green-500',   desc: 'Source or medium = "sms"' },
  { priority: 5,  name: 'Mobile Push',      color: 'bg-cyan-500',    desc: 'Medium ends with "push", contains "mobile"/"notification", or source = "firebase"' },
  { priority: 6,  name: 'Affiliates',       color: 'bg-orange-400',  desc: 'Medium = "affiliate"' },
  { priority: 7,  name: 'Audio',            color: 'bg-pink-400',    desc: 'Medium = "audio"' },
  { priority: 8,  name: 'Paid Shopping',    color: 'bg-red-500',     desc: 'Source in shopping list or campaign matches shopping regex, and medium matches paid regex' },
  { priority: 9,  name: 'Paid Search',      color: 'bg-red-500',     desc: 'Source in search engine list and medium matches paid regex' },
  { priority: 10, name: 'Paid Social',      color: 'bg-red-500',     desc: 'Source in social list and medium matches paid regex' },
  { priority: 11, name: 'Paid Video',       color: 'bg-red-500',     desc: 'Source in video list and medium matches paid regex' },
  { priority: 12, name: 'Display',          color: 'bg-red-400',     desc: 'Medium ∈ display / banner / expandable / interstitial / cpm' },
  { priority: 13, name: 'Paid Other',       color: 'bg-red-400',     desc: 'Medium matches paid regex: cp* / ppc / retargeting / paid*' },
  { priority: 14, name: 'Organic Shopping', color: 'bg-emerald-500', desc: 'Source in shopping list or campaign matches shopping regex' },
  { priority: 15, name: 'Organic Social',   color: 'bg-emerald-500', desc: 'Source in social list or medium ∈ social / social-network / social-media / sm' },
  { priority: 16, name: 'Organic Video',    color: 'bg-emerald-500', desc: 'Source in video list or medium matches *video*' },
  { priority: 17, name: 'Organic Search',   color: 'bg-emerald-500', desc: 'Source in search engine list or medium = "organic"' },
  { priority: 18, name: 'Referral',         color: 'bg-blue-500',    desc: 'Medium ∈ referral / app / link, or no UTM but referrer is present' },
  { priority: 19, name: 'Unassigned',       color: 'bg-slate-300',   desc: 'None of the above matched' },
]

function ChannelFormulaPopoverContent() {
  return (
    <div className="flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold text-foreground">Channel Classification</p>
        <p className="text-xs text-muted-foreground mt-0.5">Rules are evaluated in priority order — first match wins</p>
      </div>
      <div className="px-2 py-2 max-h-[380px] overflow-y-auto">
        {CHANNEL_RULES.map((rule) => (
          <div key={rule.priority} className="flex items-start gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
            <span className="text-[11px] text-muted-foreground w-4 shrink-0 mt-0.5 text-right">{rule.priority}</span>
            <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${rule.color}`} />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-foreground leading-tight">{rule.name}</span>
              <span className="text-[11px] text-muted-foreground leading-tight mt-0.5">{rule.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ChannelFormulaInfoProps {
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
}

export function ChannelFormulaInfo({ side = 'bottom', align = 'start' }: ChannelFormulaInfoProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} align={align} className="w-[420px] p-0">
        <ChannelFormulaPopoverContent />
      </PopoverContent>
    </Popover>
  )
}
