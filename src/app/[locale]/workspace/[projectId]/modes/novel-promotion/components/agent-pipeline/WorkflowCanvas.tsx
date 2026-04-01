'use client'

import { useCallback } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './workflow-canvas.css'
import { AgentNode } from './nodes/AgentNode'
import { AnimatedEdge } from './edges/AnimatedEdge'
import { useWorkflowNodes } from '../../hooks/useWorkflowNodes'

const nodeTypes: NodeTypes = { agent: AgentNode as NodeTypes['agent'] }
const edgeTypes: EdgeTypes = { animated: AnimatedEdge as EdgeTypes['animated'] }

type Props = {
  projectId: string
  onNodeClick: (stepKey: string) => void
}

export function WorkflowCanvas({ projectId, onNodeClick }: Props) {
  const { nodes, edges } = useWorkflowNodes(projectId)

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string }) => {
      onNodeClick(node.id)
    },
    [onNodeClick],
  )

  return (
    <div className="workflow-canvas w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,0.08)" />
        <MiniMap
          nodeStrokeWidth={2}
          nodeColor={(node) => {
            const status = (node.data as { status?: string })?.status
            switch (status) {
              case 'completed': return '#10b981'
              case 'running': return '#f59e0b'
              case 'failed': return '#ef4444'
              default: return 'rgba(255,255,255,0.2)'
            }
          }}
          maskColor="rgba(0,0,0,0.5)"
          position="bottom-right"
        />
        <Controls
          showInteractive={false}
          position="bottom-center"
        />
      </ReactFlow>
    </div>
  )
}
