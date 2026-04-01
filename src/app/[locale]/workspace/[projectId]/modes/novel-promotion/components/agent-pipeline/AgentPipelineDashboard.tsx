'use client'

import { useEffect, useRef } from 'react'
import { usePipelineStatus } from '../../hooks/usePipelineStatus'
import { PipelineActionBar } from './PipelineActionBar'
import { WorkflowTimeline } from './WorkflowTimeline'
import { TokenUsageSummary } from './TokenUsageSummary'
import { PipelineLogStream } from './PipelineLogStream'

type Props = {
  projectId: string
  episodeId: string
  novelText: string
  disabled: boolean
  pipelineRunId: string | null
  onStarted: (pipelineRunId: string) => void
  onEnterEditor: () => void
}

export function AgentPipelineDashboard({
  projectId,
  episodeId,
  novelText,
  disabled,
  pipelineRunId,
  onStarted,
  onEnterEditor,
}: Props) {
  const { data } = usePipelineStatus(projectId, true)

  const dataPipelineRunId = data?.exists ? data.pipelineRunId : undefined
  const onStartedRef = useRef(onStarted)
  onStartedRef.current = onStarted

  useEffect(() => {
    if (dataPipelineRunId && !pipelineRunId) {
      onStartedRef.current(dataPipelineRunId)
    }
  }, [dataPipelineRunId, pipelineRunId])

  return (
    <div className="glass-surface rounded-xl p-5 space-y-4 sticky top-28">
      <PipelineActionBar
        projectId={projectId}
        episodeId={episodeId}
        novelText={novelText}
        disabled={disabled}
        pipelineStatus={data?.status}
        errorMessage={data?.errorMessage}
        runId={data?.runId ?? null}
        onStarted={onStarted}
        onEnterEditor={onEnterEditor}
      />

      <div className="glass-divider" />

      <WorkflowTimeline
        steps={data?.steps}
        currentPhase={data?.currentPhase}
        activeTask={data?.activeTask}
        logs={data?.logs}
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
