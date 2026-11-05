import { useState, useCallback, useRef } from "react";
import {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  ReactFlow,
  Background,
  Controls,
  ReactFlowInstance,
} from "@xyflow/react";
import BuilderSidebar from "./sidebar/builder-sidebar";
import { useNodesState, useEdgesState } from "@xyflow/react";
import { useBuilder } from "./builder-context-provider";
import { NodeType, nodeTypeMapping, nodeTypes } from "./nodes/type";
import { v4 as uuid } from "uuid";

export const Builder = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    setNodes,
    setEdges,
    setSelectedNodeId,
  } = useBuilder();
  const { screenToFlowPosition } = useReactFlow();
  const { draggingNodeType } = useBuilder();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!draggingNodeType) {
        return;
      }
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const id = uuid();
      const node = nodeTypeMapping[draggingNodeType].constructor(id);
      const newNode: NodeType<any> = {
        id,
        type: draggingNodeType,
        position,
        data: node,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, draggingNodeType]
  );
  return (
    <>
      <div className="h-full w-full">
        <ReactFlow
          nodeTypes={nodeTypes}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
          onPaneClick={() => setSelectedNodeId(null)}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      <BuilderSidebar />
    </>
  );
};
