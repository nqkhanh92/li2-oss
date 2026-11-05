import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { CustomNodeInstance, CustomNodeType, NodeType } from './nodes/type'
import { Edge, NodeChange, EdgeChange, useEdgesState, useNodesState } from '@xyflow/react'
import { useCampaignBuilderStore } from '@/shared/stores/campaign-builder-store'

type BuilderContextValue = {
  nodes: NodeType<any>[]
  edges: Edge[]
  isDragging: boolean
  draggingNodeType: CustomNodeType | null
  selectedNodeId: string | null
}
type BuilderContextMethods = {
  setNodes: React.Dispatch<React.SetStateAction<NodeType<any>[]>>
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  setDraggingNodeType: React.Dispatch<React.SetStateAction<CustomNodeType | null>>
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>
  updateNodeData: (id: string, data: any) => void
}

type BuilderContextEvents = {
  onNodesChange: (changes: NodeChange<any>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
}
type BuilderContextType = BuilderContextValue & BuilderContextMethods & BuilderContextEvents

const BuilderContext = createContext<BuilderContextType>({
  nodes: [],
  edges: [],
  isDragging: false,
  draggingNodeType: null,
  selectedNodeId: null,
  setDraggingNodeType: () => {},
  setSelectedNodeId: () => {},
  setNodes: () => {},
  setEdges: () => {},
  onNodesChange: () => {},
  onEdgesChange: () => {},
  updateNodeData: () => {},
})
type BuilderProviderProps = {
  children: React.ReactNode
  initialData?: {
    nodes: any[]
    edges: any[]
  }
}
export const BuilderProvider = ({ children, initialData }: BuilderProviderProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeType<any>>(initialData?.nodes || [])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialData?.edges || [])

  const setNodesInStore = useCampaignBuilderStore((state) => state.setNodes)
  const setEdgesInStore = useCampaignBuilderStore((state) => state.setEdges)
  useEffect(() => {
    setNodesInStore(nodes)
    setEdgesInStore(edges)
  }, [nodes, edges])

  const [isDragging, setIsDragging] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [draggingNodeType, setDraggingNodeType] = useState<CustomNodeType | null>(null)
  const updateNodeData = useCallback(
    (id: string, data: any) => {
      setNodes((nodes) => {
        return nodes.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                attributes: {
                  ...node.data.attributes,
                  ...data,
                },
              },
            }
          }
          return node
        })
      })
    },
    [nodes]
  )

  return (
    <BuilderContext.Provider
      value={{
        nodes,
        edges,
        isDragging,
        draggingNodeType,
        setDraggingNodeType,
        selectedNodeId,
        setSelectedNodeId,
        setNodes,
        setEdges,
        onNodesChange,
        onEdgesChange,
        updateNodeData,
      }}
    >
      {children}
    </BuilderContext.Provider>
  )
}

export default BuilderContext

export const useBuilder = () => {
  return useContext(BuilderContext)
}
