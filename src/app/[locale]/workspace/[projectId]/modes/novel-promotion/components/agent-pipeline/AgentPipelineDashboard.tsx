'use client'

import { useState, useEffect } from 'react'
import { usePipelineStatus } from '../../hooks/usePipelineStatus'
import { PipelineActionBar } from './PipelineActionBar'
import { WorkflowTimeline } from './WorkflowTimeline'
import { ActiveTaskIndicator } from './ActiveTaskIndicator'
import { TokenUsageSummary } from './TokenUsageSummary'
import { PipelineLogStream } from './PipelineLogStream'

type Props = {
  projectId: string
  novelText: string
  disabled: boolean
  pipelineRunId: string | null
  onStarted: (pipelineRunId: string) => void
}

export function AgentPipelineDashboard({
  projectId,
  novelText,
  disabled,
  pipelineRunId,
  onStarted,
}: Props) {
  const [enabled, setEnabled] = useState(false)

  // Enable polling once we have a pipelineRunId or on mount to check for existing runs
  useEffect(() => {
    setEnabled(true)
  }, [])

  const { data } = usePipelineStatus(projectId, enabled)

  // Sync pipelineRunId from existing pipeline runs
  useEffect(() => {
    if (data?.exists && data.pipelineRunId && !pipelineRunId) {
      onStarted(data.pipelineRunId)
    }
  }, [data, pipelineRunId, onStarted])

  return (
    <div className="glass-surface rounded-xl p-5 space-y-4 sticky top-28">
      <PipelineActionBar
        projectId={projectId}
        novelText={novelText}
        disabled={disabled}
        pipelineStatus={data?.status}
        pipelineRunId={data?.pipelineRunId ?? pipelineRunId}
        runId={data?.runId ?? null}
        onStarted={onStarted}
      />

      <div className="glass-divider" />

      <WorkflowTimeline
        steps={data?.steps}
        currentPhase={data?.currentPhase}
      />

      <div className="glass-divider" />

      <ActiveTaskIndicator
        activeTask={data?.activeTask}
        currentPhase={data?.currentPhase}
      />

      <div className="glass-divider" />

      <TokenUsageSummary
        totalUsage={data?.totalUsage}
        steps={data?.steps}
      />

      <div className="glass-divider" />

      <PipelineLogStream logs={data?.logs} />
    </div>
  )
}
