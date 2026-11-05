'use client'
import { useFormWarningProvider } from '@/shared/providers/form-warning-provider'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
interface NavbarProps {
  title: string | React.ReactNode
  subTitle?: string | React.ReactNode
  extra?: React.ReactNode
  isBackable?: boolean
  className?: string
  backPath?: string
  compact?: boolean
}
export function Navbar({
  title,
  subTitle,
  extra,
  isBackable = true,
  className,
  backPath,
  compact,
}: NavbarProps) {
  const { back, push } = useFormWarningProvider()
  return (
    <>
      {/* Fixed Title Section - stays right below header */}
      <div
        className={cn(
          'bg-background h-[60px] min-h-[60px] w-full z-5 px-4 md:px-12 border-b',
          subTitle ? 'py-2' : 'py-3',
          className
        )}
      >
        <div
          className={cn(
            'h-full mx-auto flex items-center gap-3',
            compact ? 'max-w-7xl' : 'max-w-full'
          )}
        >
          {isBackable && (
            <span
              onClick={backPath ? () => push(backPath) : () => back()}
              className="cursor-pointer flex items-center text-slate-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </span>
          )}
          <div
            id="content-layout-title"
            className="flex flex-col justify-center space-x-4 lg:space-x-0 space-y-0.5"
          >
            <h3 className="font-medium text-l w-full text-foreground">{title}</h3>
            {subTitle && <span className="text-s text-slate-500">{subTitle}</span>}
          </div>
          {extra && <div className="flex flex-1 items-center justify-end gap-2">{extra}</div>}
        </div>
      </div>
    </>
  )
  // <header className="gap-4 sticky z-40 w-full bg-background/95 supports-backdrop-filter:bg-background/60 p-4 sm:p-6 flex h-14 items-center">
  {
    /* <SidebarTrigger className="absolute left-[-15px] bg-background" /> */
  }
  {
    /* <Select
        onValueChange={(value) => {
          if (value === "action-create") {
            push("/org/create");
          } else {
            setOrganization(value);
          }
        }}
        value={organization?.id}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
          {isLoading && <Loader2Icon className="animate-spin" />}
        </SelectTrigger>
        <SelectContent>
          {orgs?.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
          <SelectItem value="action-create">
            <span className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" /> New
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
      <Separator className="h-14" orientation="vertical" /> */
  }
  {
    /* <div className="flex items-center justify-between w-full pt-0 pb-0 gap-4">
        <span onClick={() => back()} className="cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </span>
        <div className="flex items-start space-x-4 lg:space-x-0 flex-col">
          <h1 className="font-bold">{title}</h1>
          {title === "Dashboard" && (
            <div className="flex items-center space-x-2 text-neutral-600">
              <span className="text-sm font-medium">Welcome back,</span>
              <span className="text-sm font-medium">{profile?.email}</span>
            </div>
          )}
        </div>
        <div className="flex flex-1 items-center space-x-2 justify-end">
          <UserNav />
        </div>
      </div>
    </header> */
  }
  // );
}
