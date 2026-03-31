'use client'

import { useTranslations } from 'next-intl'
import type { StepInfo, TokenUsage, ActiveTaskInfo, PipelineLogEntry } from '../../hooks/usePipelineStatus'
import { ExpandableStepCard } from './ExpandableStepCard'
import { getAgentByPhase } from '@/lib/agent-pipeline/agent-identities'

const EMPTY_USAGE: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

const DEFAULT_STEPS: StepInfo[] = [
  { stepKey: 'script_agent', stepTitle: '', status: 'pending', stepIndex: 0, startedAt: null, finishedAt: null, lastErrorMessage: null, usage: EMPTY_USAGE },
  { stepKey: 'art_director_agent', stepTitle: '', status: 'pending', stepIndex: 1, startedAt: null, finishedAt: null, lastErrorMessage: null, usage: EMPTY_USAGE },
  { stepKey: 'storyboard_agent', stepTitle: '', status: 'pending', stepIndex: 2, startedAt: null, finishedAt: null, lastErrorMessage: null, usage: EMPTY_USAGE },
  { stepKey: 'producer_quality_check', stepTitle: '', status: 'pending', stepIndex: 3, startedAt: null, finishedAt: null, lastErrorMessage: null, usage: EMPTY_USAGE },
  { stepKey: 'video_generation_agent', stepTitle: '', status: 'pending', stepIndex: 4, startedAt: null, finishedAt: null, lastErrorMessage: null, usage: EMPTY_USAGE },
  { stepKey: 'voice_generation_agent', stepTitle: '', status: 'pending', stepIndex: 5, startedAt: null, finishedAt: null, lastErrorMessage: null, usage: EMPTY_USAGE },
  { stepKey: 'assembly_agent', stepTitle: '', status: 'pending', stepIndex: 6, startedAt: null, finishedAt: null, lastErrorMessage: null, usage: EMPTY_USAGE },
]

type Props = {
  steps?: StepInfo[]
  currentPhase?: string | null
  activeTask?: ActiveTaskInfo | null
  logs?: PipelineLogEntry[]
}

export function WorkflowTimeline({ steps, currentPhase, activeTask, logs }: Props) {
  const t = useTranslations('pipeline')
  const displaySteps = steps && steps.length > 0 ? steps : DEFAULT_STEPS
  const activeAgent = currentPhase ? getAgentByPhase(currentPhase) : null

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-(--glass-text-secondary) mb-3">
        {t('workflow')}
      </h3>
      <div className="space-y-2">
        {displaySteps.map((step, index) => (
          <ExpandableStepCard
            key={step.stepKey}
            step={step}
            isLast={index === displaySteps.length - 1}
            activeTask={activeAgent?.stepKey === step.stepKey ? activeTask : undefined}
            logs={logs}
          />
        ))}
      </div>
    </div>
  )
}
