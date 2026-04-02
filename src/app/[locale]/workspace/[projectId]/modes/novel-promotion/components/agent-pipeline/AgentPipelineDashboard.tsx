'use client'

import { useEffect, useRef } from 'react'
import { usePipelineStatus } from '../../hooks/usePipelineStatus'
import { PipelineActionBar } from './PipelineActionBar'
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
    <div className="glass-surface rounded-xl p-4 space-y-3 h-full flex flex-col">
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

      <TokenUsageSummary
        totalUsage={data?.totalUsage}
        steps={data?.steps}
      />

      <div className="glass-divider" />

      <div className="flex-1 overflow-y-auto min-h-0">
        <PipelineLogStream logs={data?.logs} />
      </div>
    </div>
  )
}
