import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/shared/components/ui/sidebar'
import { useBuilder } from '../builder-context-provider'
import { actionNodes, conditionNodes, nodes, nodeTypeMapping, triggerNodes } from '../nodes/type'
import { CustomNodeType } from '../nodes/type'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Separator } from '@/shared/components/ui/separator'
import { useMemo } from 'react'
import { PropertiesForm } from './properties-form'

export default () => {
  const { setDraggingNodeType, selectedNodeId, nodes } = useBuilder()

  const onDragStart = (event: React.DragEvent, nodeType: CustomNodeType) => {
    setDraggingNodeType(nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }
  const selectedNode = useMemo(() => {
    if (!selectedNodeId || nodes.length === 0) return null
    return nodes.find((node) => node.id === selectedNodeId)
  }, [nodes, selectedNodeId])
  return (
    <aside className="bg-white absolute top-0 mt-[calc(60px+52px)] h-[calc(100svh-60px-52px)] right-0 min-w-[320px] max-w-[560px] overflow-y-scroll">
      {selectedNode ? (
        <PropertiesForm instance={selectedNode.data} />
      ) : (
        <Tabs defaultValue="trigger" className="w-[320px]">
          <TabsList className="flex justify-between bg-inherit">
            <TabsTrigger value="trigger">Trigger</TabsTrigger>
            <TabsTrigger value="condition">Condition</TabsTrigger>
            <TabsTrigger value="action">Action</TabsTrigger>
          </TabsList>
          <TabsContent value="trigger">
            <div>
              {triggerNodes.map((node, index) => (
                <>
                  <div
                    key={node.type}
                    className="dndnode px-4 py-2"
                    onDragStart={(event) => onDragStart(event, node.type)}
                    draggable
                  >
                    <node.SidebarItem />
                  </div>
                  {index < nodes.length - 1 && <Separator orientation="horizontal" />}
                </>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="condition">
            <div>
              {conditionNodes.map((node, index) => (
                <>
                  <div
                    key={node.type}
                    className="dndnode px-4 py-2"
                    onDragStart={(event) => onDragStart(event, node.type)}
                    draggable
                  >
                    <node.SidebarItem />
                  </div>
                  {index < nodes.length - 1 && <Separator orientation="horizontal" />}
                </>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="action">
            <div>
              {actionNodes.map((node, index) => (
                <>
                  <div
                    key={node.type}
                    className="dndnode px-4 py-2"
                    onDragStart={(event) => onDragStart(event, node.type)}
                    draggable
                  >
                    <node.SidebarItem />
                  </div>
                  {index < nodes.length - 1 && <Separator orientation="horizontal" />}
                </>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </aside>
  )
}
