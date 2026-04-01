'use client'

import { useMemo } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { usePipelineStatus } from './usePipelineStatus'
import type { StepInfo } from '@/lib/agent-pipeline/pipeline-types'
import { AGENT_IDENTITIES, getAgentByStepKey } from '@/lib/agent-pipeline/agent-identities'
import { calculateNodePositions } from '../components/agent-pipeline/workflow-layout'
import type { AgentNodeData } from '../components/agent-pipeline/nodes/AgentNode'
import type { AnimatedEdgeData } from '../components/agent-pipeline/edges/AnimatedEdge'

export type { PipelineStatusResponse } from './usePipelineStatus'
import type { PipelineStatusResponse } from './usePipelineStatus'

const ACCENT_HEX: Record<string, string> = {
  'text-violet-400': '#a78bfa',
  'text-amber-400': '#fbbf24',
  'text-cyan-400': '#22d3ee',
  'text-emerald-400': '#34d399',
  'text-rose-400': '#fb7185',
  'text-sky-400': '#38bdf8',
  'text-yellow-400': '#facc15',
}

function statusFromString(s: string | undefined): AgentNodeData['status'] {
  if (s === 'running') return 'running'
  if (s === 'completed') return 'completed'
  if (s === 'failed') return 'failed'
  return 'pending'
}

export function useWorkflowNodes(projectId: string): {
  nodes: Node<AgentNodeData>[]
  edges: Edge<AnimatedEdgeData>[]
  isLoading: boolean
  pipelineData: PipelineStatusResponse | undefined
} {
  const { data, isLoading } = usePipelineStatus(projectId, true)

  const { nodes, edges } = useMemo(() => {
    // Build steps: either from API data or defaults from AGENT_IDENTITIES
    let steps: StepInfo[] = []
    const hasSteps = data?.steps && data.steps.length > 0

    if (hasSteps) {
      steps = data!.steps!
    }

    const currentPhase = data?.currentPhase ?? null

    // Build nodes
    const identityList = hasSteps
      ? steps.map((s) => getAgentByStepKey(s.stepKey)).filter(Boolean)
      : AGENT_IDENTITIES

    const positions = calculateNodePositions(identityList.length)

    const builtNodes: Node<AgentNodeData>[] = identityList.map((identity, i) => {
      const step: StepInfo | undefined = hasSteps ? steps[i] : undefined
      const status = statusFromString(step?.status)

      // Only attach activeTask to the node whose phase matches currentPhase
      const isCurrentPhase = identity!.phaseKey === currentPhase
      const activeTask = isCurrentPhase ? (data?.activeTask ?? null) : null

      // Duration in seconds
      let duration: number | null = null
      if (step?.startedAt && step?.finishedAt) {
        const start = new Date(step.startedAt).getTime()
        const end = new Date(step.finishedAt).getTime()
        duration = Math.round((end - start) / 1000)
      }

      const nodeData: AgentNodeData = {
        stepKey: identity!.stepKey,
        status,
        identity: identity!,
        subSteps: step?.subSteps ?? [],
        activeTask,
        duration,
        tokenUsage: step?.usage?.totalTokens,
        error: step?.lastErrorMessage ?? null,
        isFirst: i === 0,
        isLast: i === identityList.length - 1,
      }

      return {
        id: identity!.stepKey,
        type: 'agent',
        position: positions[i],
        data: nodeData,
        draggable: false,
        selectable: true,
      }
    })

    // Build edges between consecutive nodes
    const builtEdges: Edge<AnimatedEdgeData>[] = []
    for (let i = 0; i < builtNodes.length - 1; i++) {
      const source = builtNodes[i]
      const target = builtNodes[i + 1]
      const sourceIdentity = source.data.identity
      const targetIdentity = target.data.identity

      const edgeData: AnimatedEdgeData = {
        sourceStatus: source.data.status,
        targetStatus: target.data.status,
        sourceColor: ACCENT_HEX[sourceIdentity.accentColor] ?? '#ffffff',
        targetColor: ACCENT_HEX[targetIdentity.accentColor] ?? '#ffffff',
      }

      builtEdges.push({
        id: `${source.id}->${target.id}`,
        source: source.id,
        target: target.id,
        type: 'animated',
        data: edgeData,
      })
    }

    return { nodes: builtNodes, edges: builtEdges }
  }, [data])

  return { nodes, edges, isLoading, pipelineData: data }
}
