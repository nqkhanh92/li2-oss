import { ReactFlowProvider } from '@xyflow/react'
import { BuilderProvider } from './builder-context-provider'
import { SidebarProvider } from '@/shared/components/ui/sidebar'
import '@xyflow/react/dist/style.css'
type Props = {
  initialData?: {
    nodes: any[]
    edges: any[]
  }
  children: React.ReactNode
}
export const BuilderWrapper = ({ initialData, children }: Props) => {
  return (
    <ReactFlowProvider>
      <BuilderProvider initialData={initialData}>{children}</BuilderProvider>
    </ReactFlowProvider>
  )
}
