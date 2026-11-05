import { Navbar } from '@/shared/components/layout/navbar/navbar'
import { AppSidebar } from '@/shared/components/layout/sidebar/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/shared/components/ui/sidebar'
// import { OrganizationProvider } from "@/providers/organization-provider";
import { cookies, headers } from 'next/headers'
import { ensureOrgMember, getUserOrgPermissions } from '@/shared/lib/permission/permissions'
import { notFound, redirect } from 'next/navigation'
import { OrganizationProvider } from '@/shared/providers/organization-store-provider'
import { getOrganizationById } from '@/app/actions/organization'
import { ErrorBoundary } from 'next/dist/client/components/error-boundary'
import OrgError from './error'
import { getOrganizationPlan } from '@/shared/lib/plan/plans'
import { logger } from '@/infrastructure/logging/logger'
import { NotificationProvider } from '@/shared/providers/notification-provider'
import { AgentChatProvider } from '@/shared/providers/agent-chat-provider'
import { AgentChatDockGate } from '@/features/agent-chat/components'
import { validate } from 'uuid'
import { CannyProvider } from '@/shared/providers/canny-provider'
import { disabledFeatures } from '@/shared/constants/disabled-features'
export const dynamic = 'force-dynamic'

export default async function Layout({
  children,
  params,
  //searchParams,
}: {
  children: React.ReactNode
  params: { org_id: string; rest?: string[] }
  // searchParams: {
  //   [key: string]: string | string[] | undefined
  // }
}) {
  const org = await getOrganizationById(params.org_id)
  if (!org) {
    notFound()
  }
  const orgPlan = await getOrganizationPlan(org.id)
  try {
    await ensureOrgMember(org.id)
  } catch (error) {
    redirect('/forbidden')
  }

  const h = headers()
  const fullPath = h.get('x-full-path') || ''

  // Redirect url to org slug when got org id in Path
  if (validate(params.org_id) && org.org_slug) {
    if (fullPath) {
      const newPath = fullPath.replace(`/org/${params.org_id}`, `/org/${org.org_slug}`)
      redirect(newPath)
    }
  }

  const orgPermissions = await getUserOrgPermissions(org.id)

  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar_state')?.value
    ? cookieStore.get('sidebar_state')?.value === 'true'
    : true
  return (
    <OrganizationProvider
      organization={org}
      permissions={orgPermissions || null}
      orgPlan={orgPlan || null}
      org_id={params.org_id}
    >
      <NotificationProvider>
        <AgentChatProvider>
          <CannyProvider>
            <SidebarProvider defaultOpen={defaultOpen} className="bg-slate-800">
              <AppSidebar />
              <div className="flex flex-col h-svh overflow-hidden bg-slate-800 w-full">
                {/* Fixed Header - stays at top always */}
                <Navbar />
                <div className="bg-background rounded-tl-3xl md:rounded-tl-none rounded-tr-3xl overflow-hidden w-full relative" style={{ marginTop: 'var(--navbar-total-height, 52px)', height: 'calc(100svh - var(--navbar-total-height, 52px))' }}>
                  <ErrorBoundary errorComponent={OrgError}>
                    {/*
                      Chừa chỗ cho dock chat lúc THU GỌN. Dock là `position: fixed` nên nó không
                      chiếm chỗ trong dòng chảy và sẽ che phần cuối vùng cuộn; biến này do
                      `AgentChatDockGate` đặt, và chỉ có giá trị trên trang có dock.
                    */}
                    <main
                      className="w-full h-full overflow-hidden"
                      style={{ paddingBottom: 'var(--agent-dock-height, 0px)' }}
                    >
                      {children}
                    </main>
                  </ErrorBoundary>
                </div>
              </div>
              {/*
                Dock chat. Nhúng MỘT lần ở đây để hội thoại sống qua các lần chuyển trang, nhưng
                `AgentChatDockGate` mới quyết định nó có hiện hay không — chốt mục 7: chỉ trên
                trang Link & Artifact.
              */}
              {!disabledFeatures.AI_CHAT && <AgentChatDockGate />}
            </SidebarProvider>
          </CannyProvider>
        </AgentChatProvider>
      </NotificationProvider>
    </OrganizationProvider>
  )
}
