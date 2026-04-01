'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { AgentCard } from './AgentCard'
import { getAgentByStepKey } from '@/lib/agent-pipeline/agent-identities'
import type { StepInfo, ActiveTaskInfo, PipelineLogEntry, SubStepInfo } from '../../hooks/usePipelineStatus'
import { TASK_TYPE_KEYS } from './constants'

const fmt = new Intl.NumberFormat()

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

type Props = {
  step: StepInfo
  isLast?: boolean
  activeTask?: ActiveTaskInfo | null
  logs?: PipelineLogEntry[]
}

function SubStepStatusIcon({ status }: { status: SubStepInfo['status'] }) {
  switch (status) {
    case 'running':
      return <AppIcon name="loader" className="h-3 w-3 text-blue-400 animate-spin shrink-0" />
    case 'completed':
      return <AppIcon name="checkCircle" className="h-3 w-3 text-emerald-400 shrink-0" />
    case 'failed':
      return <AppIcon name="alertCircle" className="h-3 w-3 text-red-400 shrink-0" />
    default:
      return <div className="h-3 w-3 rounded-full border border-(--glass-stroke-base) shrink-0" />
  }
}

function SubStepList({ subSteps }: { subSteps: SubStepInfo[] }) {
  if (subSteps.length === 0) return null

  return (
    <div className="pt-2 space-y-1 px-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-(--glass-text-tertiary) mb-1">
        Steps
      </div>
      <div className="space-y-0.5">
        {subSteps.map((sub) => (
          <div key={sub.key} className="flex items-center gap-2 py-0.5">
            <SubStepStatusIcon status={sub.status} />
            <span className={`text-xs ${
              sub.status === 'pending'
                ? 'text-(--glass-text-tertiary)'
                : sub.status === 'running'
                  ? 'text-(--glass-text-primary)'
                  : sub.status === 'completed'
                    ? 'text-(--glass-text-secondary)'
                    : 'text-red-300'
            }`}>
              {sub.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ExpandableStepCard({ step, isLast, activeTask, logs }: Props) {
  const t = useTranslations('pipeline')
  const [expanded, setExpanded] = useState(false)
  const identity = getAgentByStepKey(step.stepKey)

  // Auto-expand when step starts running
  useEffect(() => {
    if (step.status === 'running') {
      setExpanded(true)
    }
  }, [step.status])

  if (!identity) return null

  const duration = formatDuration(step.startedAt, step.finishedAt)
  const hasTokens = step.usage && step.usage.totalTokens > 0
  const isRunning = step.status === 'running'
  const progress = activeTask ? Math.min(Math.max(activeTask.progress, 0), 100) : 0

  // Filter logs for this agent's step
  const STEP_TO_LOG_AGENT: Record<string, string> = {
    script_agent: '剧本 agent',
    art_director_agent: '美术总监',
    storyboard_agent: '分镜 agent',
    producer_quality_check: '制片 agent',
  }
  const expectedAgent = STEP_TO_LOG_AGENT[step.stepKey]
  const agentLogs = expectedAgent
    ? (logs ?? []).filter((entry) => entry.agent.toLowerCase() === expectedAgent)
    : []

  return (
    <div className="relative">

      <div
        className={`glass-surface rounded-lg transition-all ${
          isRunning ? 'ring-1 ring-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.15)]' : ''
        }`}
      >
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 p-3 text-left"
        >
          <div className="flex-1 min-w-0">
            <AgentCard
              identity={identity}
              status={step.status as 'pending' | 'running' | 'completed' | 'failed'}
              usage={step.usage}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {duration && (
              <span className="text-xs text-(--glass-text-tertiary) font-mono">{duration}</span>
            )}
            <AppIcon
              name={expanded ? 'chevronUp' : 'chevronDown'}
              className="h-4 w-4 text-(--glass-text-tertiary)"
            />
          </div>
        </button>

        {/* Inline progress bar — always visible when running */}
        {isRunning && activeTask && !expanded && (
          <div className="px-3 pb-3 space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <AppIcon name="loader" className="h-3 w-3 text-blue-400 animate-spin shrink-0" />
              <span className="text-(--glass-text-secondary) truncate">
                {TASK_TYPE_KEYS[activeTask.type] ? t(TASK_TYPE_KEYS[activeTask.type]) : activeTask.type}
              </span>
              {activeTask.model && (
                <span className="ml-auto text-[10px] font-mono text-(--glass-text-tertiary) shrink-0">
                  {activeTask.model}
                </span>
              )}
              <span className="text-[10px] font-mono text-(--glass-text-tertiary) shrink-0">{progress}%</span>
            </div>
            <div className="h-1 rounded-full bg-(--glass-stroke-base) overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Expanded details */}
        {expanded && (
          <div className="px-3 pb-3 space-y-2 border-t border-(--glass-stroke-base)/50">
            {/* Active task indicator — prominent when running */}
            {isRunning && activeTask && (
              <div className="mt-2 rounded-lg bg-blue-900/15 border border-blue-800/30 px-3 py-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <AppIcon name="loader" className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                  <span className="text-xs font-medium text-(--glass-text-secondary)">
                    {TASK_TYPE_KEYS[activeTask.type] ? t(TASK_TYPE_KEYS[activeTask.type]) : activeTask.type}
                  </span>
                  {activeTask.model && (
                    <span className="ml-auto text-[10px] font-mono text-(--glass-text-tertiary)">
                      {activeTask.model}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] text-(--glass-text-tertiary) mb-1">
                    <span>{t('progress')}</span>
                    <span className="font-mono">{progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-(--glass-stroke-base) overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                {duration && (
                  <div className="text-[10px] text-(--glass-text-tertiary)">
                    {t('duration')}: <span className="font-mono">{duration}</span>
                  </div>
                )}
              </div>
            )}

            {/* Sub-step progress */}
            {step.subSteps && step.subSteps.length > 0 && (
              <SubStepList subSteps={step.subSteps} />
            )}

            {/* Stats grid — for completed/failed steps */}
            {!isRunning && (duration || hasTokens) && (
              <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                {duration && (
                  <div className="rounded-lg bg-(--glass-bg-surface-strong) px-3 py-2">
                    <div className="text-(--glass-text-tertiary)">{t('duration')}</div>
                    <div className="font-mono text-(--glass-text-primary)">{duration}</div>
                  </div>
                )}
                {hasTokens && (
                  <div className="rounded-lg bg-(--glass-bg-surface-strong) px-3 py-2">
                    <div className="text-(--glass-text-tertiary)">{t('tokenUsage')}</div>
                    <div className="font-mono text-(--glass-text-primary)">
                      {fmt.format(step.usage.totalTokens)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Token breakdown */}
            {hasTokens && (
              <div className="flex gap-4 text-xs text-(--glass-text-tertiary) px-1">
                <span>{t('inputTokens')}: <span className="font-mono">{fmt.format(step.usage.promptTokens)}</span></span>
                <span>{t('outputTokens')}: <span className="font-mono">{fmt.format(step.usage.completionTokens)}</span></span>
              </div>
            )}

            {/* Error message */}
            {step.status === 'failed' && step.lastErrorMessage && (
              <div className="flex items-start gap-2 rounded-lg bg-red-900/20 border border-red-800/50 px-3 py-2 text-xs text-red-300">
                <AppIcon name="alertCircle" className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span className="break-all">{step.lastErrorMessage}</span>
              </div>
            )}

            {/* Pending state — show role description */}
            {step.status === 'pending' && !duration && !hasTokens && !activeTask && (
              <div className="pt-2 text-xs text-(--glass-text-tertiary) px-1">
                {t(identity.roleKey)}
              </div>
            )}

            {/* Agent log entries */}
            {agentLogs.length > 0 && (
              <div className="pt-2 space-y-1 px-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-(--glass-text-tertiary) mb-1">
                  {t('executionLogs')}
                </div>
                <div className="space-y-0.5 max-h-32 overflow-y-auto scrollbar-thin">
                  {agentLogs.map((entry, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] leading-relaxed">
                      <span className="text-(--glass-text-tertiary) shrink-0 font-mono">•</span>
                      <span className="text-(--glass-text-secondary)">{entry.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
