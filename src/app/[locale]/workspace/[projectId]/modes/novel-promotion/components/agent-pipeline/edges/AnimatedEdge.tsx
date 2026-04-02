'use client'

import { memo } from 'react'
import { BaseEdge, getSmoothStepPath, type Edge, type EdgeProps } from '@xyflow/react'

export type AnimatedEdgeData = {
  sourceStatus: 'pending' | 'running' | 'completed' | 'failed'
  targetStatus: 'pending' | 'running' | 'completed' | 'failed'
  sourceColor: string
  targetColor: string
}

type AnimatedEdgeType = Edge<AnimatedEdgeData>

function getEdgeStyle(
  sourceStatus: AnimatedEdgeData['sourceStatus'],
  targetStatus: AnimatedEdgeData['targetStatus'],
): React.CSSProperties & { animated?: boolean } {
  if (sourceStatus === 'failed' || targetStatus === 'failed') {
    return {
      stroke: '#ef4444',
      strokeOpacity: 0.8,
      strokeDasharray: '6,4',
    }
  }
  if (sourceStatus === 'completed' && targetStatus === 'completed') {
    return {
      stroke: '#10b981',
      strokeOpacity: 1,
    }
  }
  if (sourceStatus === 'completed' && targetStatus === 'running') {
    return {
      stroke: '#f59e0b',
      strokeOpacity: 1,
      strokeDasharray: '6,4',
    }
  }
  if (sourceStatus === 'completed' && targetStatus === 'pending') {
    return {
      stroke: 'rgba(255,255,255,0.25)',
      strokeOpacity: 0.6,
    }
  }
  if (sourceStatus === 'running' && targetStatus === 'pending') {
    return {
      stroke: 'rgba(255,255,255,0.15)',
      strokeOpacity: 0.4,
      strokeDasharray: '6,4',
    }
  }
  // pending→pending and all other combinations
  return {
    stroke: 'rgba(255,255,255,0.10)',
    strokeOpacity: 0.2,
    strokeDasharray: '6,4',
  }
}

function isFlowAnimated(
  sourceStatus: AnimatedEdgeData['sourceStatus'],
  targetStatus: AnimatedEdgeData['targetStatus'],
): boolean {
  return sourceStatus === 'completed' && targetStatus === 'running'
}

function AnimatedEdgeInner({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<AnimatedEdgeType>) {
  const sourceStatus: AnimatedEdgeData['sourceStatus'] = (data as AnimatedEdgeData | undefined)?.sourceStatus ?? 'pending'
  const targetStatus: AnimatedEdgeData['targetStatus'] = (data as AnimatedEdgeData | undefined)?.targetStatus ?? 'pending'

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  })

  const style = getEdgeStyle(sourceStatus, targetStatus)
  const animated = isFlowAnimated(sourceStatus, targetStatus)

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          strokeWidth: 2,
          fill: 'none',
          ...style,
        }}
      />
      {animated && (
        <path
          d={edgePath}
          fill="none"
          stroke={style.stroke as string}
          strokeWidth={2}
          strokeDasharray="10,20"
          strokeDashoffset={0}
          strokeOpacity={0.9}
          className="animated-edge-flow"
        />
      )}
    </>
  )
}

export const AnimatedEdge = memo(AnimatedEdgeInner)
