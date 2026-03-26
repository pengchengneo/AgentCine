'use client'

import { CheckCircle2, Loader2, Circle, XCircle } from 'lucide-react'
import type { StepInfo } from '../../hooks/usePipelineStatus'

const STEP_LABELS: Record<string, string> = {
  script_agent: '剧本分析',
  art_director_agent: '美术生成',
  storyboard_agent: '分镜生成',
  producer_quality_check: '质量审核',
}

const DEFAULT_STEPS = [
  { stepKey: 'script_agent', status: 'pending' },
  { stepKey: 'art_director_agent', status: 'pending' },
  { stepKey: 'storyboard_agent', status: 'pending' },
  { stepKey: 'producer_quality_check', status: 'pending' },
]

function formatDuration(startedAt: string | null, finishedAt: string | null): string | null {
  if (!startedAt) return null
  const start = new Date(startedAt).getTime()
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now()
  const seconds = Math.floor((end - start) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

const tokenFormatter = new Intl.NumberFormat()

function StepIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-emerald-400" />
    case 'running':
      return <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-400" />
    default:
      return <Circle className="h-5 w-5 text-(--glass-text-tertiary)" />
  }
}

function StepConnector({ status }: { status: string }) {
  return (
    <div
      className={`absolute left-[9px] top-7 w-0.5 h-[calc(100%-12px)] ${
        status === 'completed' ? 'bg-emerald-400/40' : 'bg-(--glass-stroke-base)'
      }`}
    />
  )
}

type Props = {
  steps?: StepInfo[]
  currentPhase?: string | null
}

export function WorkflowTimeline({ steps, currentPhase }: Props) {
  const displaySteps = steps && steps.length > 0 ? steps : DEFAULT_STEPS

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-(--glass-text-secondary) mb-3">
        Workflow
      </h3>
      <div className="space-y-0">
        {displaySteps.map((step, index) => {
          const isLast = index === displaySteps.length - 1
          const label = STEP_LABELS[step.stepKey] || step.stepKey
          const fullStep = step as StepInfo
          const duration = fullStep.startedAt
            ? formatDuration(fullStep.startedAt, fullStep.finishedAt)
            : null
          const hasTokens = fullStep.usage && fullStep.usage.totalTokens > 0

          return (
            <div key={step.stepKey} className="relative pb-4">
              {!isLast && <StepConnector status={step.status} />}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <StepIcon status={step.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        step.status === 'running'
                          ? 'text-(--glass-text-primary)'
                          : step.status === 'completed'
                            ? 'text-emerald-400'
                            : step.status === 'failed'
                              ? 'text-red-400'
                              : 'text-(--glass-text-tertiary)'
                      }`}
                    >
                      {label}
                    </span>
                    {duration && (
                      <span className="text-xs text-(--glass-text-tertiary)">
                        {duration}
                      </span>
                    )}
                  </div>
                  {hasTokens && (
                    <div className="text-xs text-(--glass-text-tertiary) mt-0.5">
                      {tokenFormatter.format(fullStep.usage.totalTokens)} tokens
                    </div>
                  )}
                  {step.status === 'failed' && fullStep.lastErrorMessage && (
                    <div className="text-xs text-red-400 mt-0.5 truncate">
                      {fullStep.lastErrorMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
