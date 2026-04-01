'use client'

import { useTranslations } from 'next-intl'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppIcon } from '@/components/ui/icons'
import type { AppIconName } from '@/components/ui/icons/registry'
import { MediaImage } from '@/components/media/MediaImage'
import { getAgentByStepKey } from '@/lib/agent-pipeline/agent-identities'
import type { StepInfo, ActiveTaskInfo, PipelineLogEntry } from '@/lib/agent-pipeline/pipeline-types'

type ReviewItem = {
  id: string
  phase: string
  targetType: string
  targetId: string
  status: string
  score: number | null
  feedback: string | null
  retryCount: number
  targetName: string | null
  targetImageUrl: string | null
}

type Props = {
  stepKey: string | null
  projectId: string
  step?: StepInfo | null
  activeTask?: ActiveTaskInfo | null
  logs?: PipelineLogEntry[]
  onClose: () => void
}

const REVIEW_PHASES = new Set(['art_director_agent', 'storyboard_agent'])

function StatusBadge({ status, t }: { status: string; t: ReturnType<typeof useTranslations> }) {
  const label =
    status === 'running'
      ? (t as (k: string) => string | undefined)('statusRunning') ?? '运行中'
      : status === 'completed'
        ? (t as (k: string) => string | undefined)('statusCompleted') ?? '已完成'
        : status === 'failed'
          ? (t as (k: string) => string | undefined)('statusFailed') ?? '失败'
          : (t as (k: string) => string | undefined)('statusPending') ?? '待运行'

  const cls =
    status === 'running'
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      : status === 'completed'
        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        : status === 'failed'
          ? 'bg-red-500/20 text-red-400 border-red-500/30'
          : 'bg-white/10 text-(--glass-text-tertiary) border-white/10'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status === 'running' && (
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
      )}
      {label}
    </span>
  )
}

function SubStepIcon({ status }: { status: string }) {
  if (status === 'completed')
    return <AppIcon name="checkCircle" className="h-4 w-4 text-emerald-400 shrink-0" />
  if (status === 'running')
    return <span className="h-4 w-4 shrink-0 flex items-center justify-center"><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /></span>
  if (status === 'failed')
    return <AppIcon name="xCircle" className="h-4 w-4 text-red-400 shrink-0" />
  return <AppIcon name="circle" className="h-4 w-4 text-(--glass-text-tertiary) shrink-0" />
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

export function NodeDetailPanel({ stepKey, projectId, step, activeTask, logs, onClose }: Props) {
  const t = useTranslations('pipeline')
  const queryClient = useQueryClient()

  const agent = stepKey ? getAgentByStepKey(stepKey) : undefined

  // Determine review phase for art/storyboard nodes
  const reviewPhase = stepKey && REVIEW_PHASES.has(stepKey) ? agent?.phaseKey : undefined

  const { data: reviewItems } = useQuery<ReviewItem[]>({
    queryKey: ['pipeline-review', projectId, reviewPhase],
    queryFn: async () => {
      const res = await fetch(
        `/api/novel-promotion/${projectId}/pipeline/review?phase=${reviewPhase}`,
      )
      if (!res.ok) throw new Error('Failed to fetch review items')
      return res.json()
    },
    enabled: !!reviewPhase,
  })

  const approveMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/novel-promotion/${projectId}/pipeline/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, action: 'approve' }),
      })
      if (!res.ok) throw new Error('Failed to approve item')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-review', projectId, reviewPhase] })
    },
  })

  if (!stepKey || !agent) return null

  // Filter logs for this agent's phase
  const filteredLogs = logs?.filter((log) => {
    const msg = log.agent.toLowerCase() + ' ' + log.message.toLowerCase()
    return (
      msg.includes(agent.phaseKey) ||
      msg.includes(agent.stepKey.replace(/_/g, '')) ||
      log.agent.toLowerCase().includes(agent.phaseKey)
    )
  })

  // Compute duration
  let durationStr = '—'
  if (step?.startedAt) {
    const start = new Date(step.startedAt).getTime()
    const end = step.finishedAt ? new Date(step.finishedAt).getTime() : Date.now()
    const secs = Math.floor((end - start) / 1000)
    if (secs < 60) durationStr = `${secs}s`
    else durationStr = `${Math.floor(secs / 60)}m ${secs % 60}s`
  }

  const totalTokens = step?.usage?.totalTokens ?? 0

  return (
    <div className="glass-surface fixed right-0 top-16 bottom-0 w-[400px] z-30 flex flex-col overflow-hidden animate-slide-in-right">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 border-b border-white/10 shrink-0">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${agent.gradientClass} flex items-center justify-center shrink-0`}>
          <AppIcon name={agent.icon as AppIconName} className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-(--glass-text-primary) truncate">
              {(t as (k: string) => string | undefined)(agent.nameKey) ?? agent.nameKey}
            </span>
            {step && <StatusBadge status={step.status} t={t} />}
          </div>
          <p className="text-xs text-(--glass-text-tertiary) mt-0.5 truncate">
            {(t as (k: string) => string | undefined)(agent.roleKey) ?? agent.roleKey}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 text-(--glass-text-tertiary) hover:text-(--glass-text-primary) hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <AppIcon name="close" className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Sub-steps */}
        {agent.subSteps.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-(--glass-text-secondary) mb-2">
              {(t as (k: string) => string | undefined)('subSteps') ?? '执行步骤'}
            </h3>
            <ul className="space-y-2">
              {agent.subSteps.map((sub) => {
                const subStepData = step?.subSteps?.find((s) => s.key === sub.key)
                const status = subStepData?.status ?? 'pending'
                return (
                  <li key={sub.key} className="flex items-center gap-2.5">
                    <SubStepIcon status={status} />
                    <span
                      className={`text-sm ${
                        status === 'completed'
                          ? 'text-(--glass-text-primary)'
                          : status === 'running'
                            ? 'text-emerald-300'
                            : 'text-(--glass-text-tertiary)'
                      }`}
                    >
                      {(t as (k: string) => string | undefined)(sub.titleKey) ?? sub.titleFallback}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* Active task progress */}
        {activeTask && step?.status === 'running' && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-(--glass-text-secondary) mb-2">
              {(t as (k: string) => string | undefined)('activeTask') ?? '当前任务'}
            </h3>
            <div className="rounded-lg bg-white/5 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-(--glass-text-secondary)">{activeTask.targetType}</span>
                <span className={`font-semibold ${agent.accentColor}`}>
                  {Math.round(activeTask.progress * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${agent.gradientClass} transition-all duration-300 rounded-full`}
                  style={{ width: `${Math.round(activeTask.progress * 100)}%` }}
                />
              </div>
            </div>
          </section>
        )}

        {/* Review items grid */}
        {reviewItems && reviewItems.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-(--glass-text-secondary) mb-2">
              {(t as (k: string) => string | undefined)('reviewItems') ?? '待审核资产'}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {reviewItems.map((item) => (
                <div key={item.id} className="rounded-lg bg-white/5 overflow-hidden flex flex-col">
                  <div className="relative aspect-square bg-white/5">
                    {item.targetImageUrl ? (
                      <MediaImage
                        src={item.targetImageUrl}
                        alt={item.targetName ?? item.targetType}
                        fill
                        className="object-cover"
                        sizes="160px"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <AppIcon name="image" className="h-6 w-6 text-(--glass-text-tertiary)" />
                      </div>
                    )}
                  </div>
                  <div className="p-2 space-y-1">
                    <p className="text-[11px] text-(--glass-text-secondary) truncate">
                      {item.targetName ?? item.targetType}
                    </p>
                    {item.status !== 'approved' ? (
                      <button
                        onClick={() => approveMutation.mutate(item.id)}
                        disabled={approveMutation.isPending}
                        className={`w-full rounded px-2 py-1 text-[11px] font-medium bg-gradient-to-r ${agent.gradientClass} text-white transition-opacity hover:opacity-80 disabled:opacity-40`}
                      >
                        {(t as (k: string) => string | undefined)('approve') ?? '批准'}
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                        <AppIcon name="checkCircle" className="h-3 w-3" />
                        {(t as (k: string) => string | undefined)('approved') ?? '已批准'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Stats */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-(--glass-text-secondary) mb-2">
            {(t as (k: string) => string | undefined)('stats') ?? '统计'}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/5 p-3">
              <p className="text-[11px] text-(--glass-text-tertiary) mb-1">
                {(t as (k: string) => string | undefined)('duration') ?? '耗时'}
              </p>
              <p className="text-sm font-semibold text-(--glass-text-primary)">{durationStr}</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3">
              <p className="text-[11px] text-(--glass-text-tertiary) mb-1">
                {(t as (k: string) => string | undefined)('tokens') ?? 'Tokens'}
              </p>
              <p className="text-sm font-semibold text-(--glass-text-primary)">
                {totalTokens > 0 ? totalTokens.toLocaleString() : '—'}
              </p>
            </div>
          </div>
        </section>

        {/* Error display */}
        {step?.status === 'failed' && step.lastErrorMessage && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">
              {(t as (k: string) => string | undefined)('errorMessage') ?? '错误信息'}
            </h3>
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-xs text-red-300 break-words">{step.lastErrorMessage}</p>
            </div>
          </section>
        )}

        {/* Filtered logs */}
        {filteredLogs && filteredLogs.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-(--glass-text-secondary) mb-2">
              {(t as (k: string) => string | undefined)('executionLogs') ?? '执行日志'}
            </h3>
            <div className="rounded-lg bg-black/20 p-2 space-y-0.5 font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto custom-scrollbar">
              {filteredLogs.map((entry, i) => {
                const timeStr = timeFormatter.format(new Date(entry.ts))
                return (
                  <div key={i} className="flex gap-2 py-0.5">
                    <span className="text-(--glass-text-tertiary) shrink-0">{timeStr}</span>
                    <span className={`shrink-0 ${agent.accentColor}`}>[{entry.agent}]</span>
                    <span className="text-(--glass-text-primary)">{entry.message}</span>
                    {entry.model && (
                      <span className="text-(--glass-text-tertiary) ml-auto shrink-0">
                        ({entry.model})
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
