// src/lib/agent-pipeline/pipeline-status-service.ts

import { prisma } from '@/lib/prisma'
import { getReviewSummary } from './review/review-service'
import type { ReviewSummary } from './review/types'
import { getAgentByStepKey, AGENT_IDENTITIES } from './agent-identities'
import type { TokenUsage, StepInfo, SubStepInfo, ActiveTaskInfo, PipelineLogEntry } from './pipeline-types'

export type PipelineStatusDetail = {
  exists: true
  pipelineRunId: string
  status: string
  currentPhase: string | null
  startedAt: string | null
  completedAt: string | null
  errorMessage: string | null
  runId: string | null
  steps: StepInfo[]
  totalUsage: TokenUsage
  activeTask: ActiveTaskInfo | null
  review: ReviewSummary
  logs: PipelineLogEntry[]
}

export type PipelineStatusResponse =
  | { exists: false }
  | PipelineStatusDetail

function sumUsageFromJson(usageJson: unknown): TokenUsage {
  if (!usageJson || typeof usageJson !== 'object') {
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  }
  const u = usageJson as Record<string, unknown>
  const prompt = typeof u.promptTokens === 'number' ? u.promptTokens : 0
  const completion = typeof u.completionTokens === 'number' ? u.completionTokens : 0
  return { promptTokens: prompt, completionTokens: completion, totalTokens: prompt + completion }
}

function buildSubSteps(
  stepKey: string,
  events: Array<{ eventType: string; payload: unknown; createdAt: Date }>,
  parentStepStatus: string,
): SubStepInfo[] {
  const identity = getAgentByStepKey(stepKey)
  if (!identity) return []

  const subStepStates = new Map<string, { status: SubStepInfo['status']; startedAt: Date | null; completedAt: Date | null }>()

  for (const event of events) {
    const payload = event.payload as Record<string, unknown> | null
    const subStepKey = payload?.subStepKey as string | undefined
    if (!subStepKey) continue

    const existing = subStepStates.get(subStepKey) || { status: 'pending' as const, startedAt: null, completedAt: null }

    if (event.eventType === 'substep.start') {
      existing.status = 'running'
      existing.startedAt = event.createdAt
    } else if (event.eventType === 'substep.complete') {
      existing.status = 'completed'
      existing.completedAt = event.createdAt
    } else if (event.eventType === 'substep.error') {
      existing.status = 'failed'
      existing.completedAt = event.createdAt
    }

    subStepStates.set(subStepKey, existing)
  }

  // When the parent step completed but no sub-step events exist (e.g. due to
  // the earlier seq=0 bug), infer all sub-steps as completed.
  const hasNoEvents = subStepStates.size === 0
  const parentDone = parentStepStatus === 'completed' || parentStepStatus === 'failed'

  return identity.subSteps.map((def) => {
    const state = subStepStates.get(def.key)
    const fallbackStatus: SubStepInfo['status'] = hasNoEvents && parentDone ? 'completed' : 'pending'
    return {
      key: def.key,
      title: def.titleFallback,
      status: state?.status ?? fallbackStatus,
      startedAt: state?.startedAt?.toISOString() ?? null,
      completedAt: state?.completedAt?.toISOString() ?? null,
    }
  })
}

export async function getPipelineRunDetail(projectId: string): Promise<PipelineStatusResponse> {
  const pipelineRun = await prisma.pipelineRun.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  })

  if (!pipelineRun) {
    return { exists: false }
  }

  // Find the GraphRun linked to this PipelineRun
  const graphRun = await prisma.graphRun.findFirst({
    where: {
      targetType: 'PipelineRun',
      targetId: pipelineRun.id,
    },
    select: { id: true },
  })

  // Parallelize independent queries
  const [graphSteps, activeTasks, reviewSummary, subStepEvents] = await Promise.all([
    graphRun
      ? prisma.graphStep.findMany({
          where: { runId: graphRun.id },
          orderBy: { stepIndex: 'asc' },
          include: {
            attempts: {
              select: { usageJson: true, provider: true, modelKey: true },
            },
          },
        })
      : Promise.resolve([]),
    prisma.task.findMany({
      where: {
        projectId,
        status: { in: ['queued', 'processing'] },
      },
      orderBy: { updatedAt: 'desc' },
      take: 1,
      select: {
        type: true,
        targetType: true,
        progress: true,
        status: true,
        billingInfo: true,
      },
    }),
    getReviewSummary(pipelineRun.id),
    graphRun
      ? prisma.graphEvent.findMany({
          where: {
            runId: graphRun.id,
            eventType: { startsWith: 'substep.' },
          },
          orderBy: { createdAt: 'asc' },
        })
      : Promise.resolve([]),
  ])

  const totalUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  let steps: StepInfo[]

  if (graphSteps.length > 0) {
    steps = graphSteps.map((s) => {
      const stepUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      for (const attempt of s.attempts) {
        const au = sumUsageFromJson(attempt.usageJson)
        stepUsage.promptTokens += au.promptTokens
        stepUsage.completionTokens += au.completionTokens
        stepUsage.totalTokens += au.totalTokens
      }
      totalUsage.promptTokens += stepUsage.promptTokens
      totalUsage.completionTokens += stepUsage.completionTokens
      totalUsage.totalTokens += stepUsage.totalTokens

      const stepSubEvents = subStepEvents.filter((e) => e.stepKey === s.stepKey)

      return {
        stepKey: s.stepKey,
        stepTitle: s.stepTitle,
        status: s.status,
        stepIndex: s.stepIndex,
        startedAt: s.startedAt?.toISOString() ?? null,
        finishedAt: s.finishedAt?.toISOString() ?? null,
        lastErrorMessage: s.lastErrorMessage,
        usage: stepUsage,
        subSteps: buildSubSteps(s.stepKey, stepSubEvents, s.status),
      }
    })
  } else {
    // No GraphStep records — build fallback steps from agent identities
    // and infer status from sub-step events
    const pipelineFailed = pipelineRun.status === 'failed'

    steps = AGENT_IDENTITIES.map((agent, index) => {
      const stepSubEvents = subStepEvents.filter((e) => e.stepKey === agent.stepKey)
      const hasEvents = stepSubEvents.length > 0

      // Count completed sub-steps from events
      const completedKeys = new Set<string>()
      const startedKeys = new Set<string>()
      const failedKeys = new Set<string>()
      for (const e of stepSubEvents) {
        const key = (e.payload as Record<string, unknown> | null)?.subStepKey as string | undefined
        if (!key) continue
        if (e.eventType === 'substep.complete') completedKeys.add(key)
        else if (e.eventType === 'substep.start') startedKeys.add(key)
        else if (e.eventType === 'substep.error') failedKeys.add(key)
      }

      const identity = getAgentByStepKey(agent.stepKey)
      const totalSubSteps = identity?.subSteps.length ?? 0
      const allSubStepsDone = totalSubSteps > 0 && completedKeys.size >= totalSubSteps

      let stepStatus: string
      if (allSubStepsDone) {
        stepStatus = 'completed'
      } else if (failedKeys.size > 0) {
        stepStatus = 'failed'
      } else if (hasEvents && pipelineFailed) {
        // Had some events but not all completed, and pipeline failed
        stepStatus = 'failed'
      } else if (hasEvents) {
        stepStatus = 'running'
      } else {
        stepStatus = 'pending'
      }

      // Only attach error message to the step that actually failed
      const isFailedStep = stepStatus === 'failed'

      return {
        stepKey: agent.stepKey,
        stepTitle: '',
        status: stepStatus,
        stepIndex: index,
        startedAt: null,
        finishedAt: null,
        lastErrorMessage: isFailedStep ? pipelineRun.errorMessage : null,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        subSteps: buildSubSteps(agent.stepKey, stepSubEvents, stepStatus),
      }
    })
  }

  let activeTask: ActiveTaskInfo | null = null
  if (activeTasks.length > 0) {
    const task = activeTasks[0]
    let model: string | null = null
    if (task.billingInfo && typeof task.billingInfo === 'object') {
      const bi = task.billingInfo as Record<string, unknown>
      if (typeof bi.model === 'string') model = bi.model
    }
    activeTask = {
      type: task.type,
      targetType: task.targetType ?? '',
      progress: task.progress ?? 0,
      status: task.status,
      model,
    }
  }

  const logs = Array.isArray(pipelineRun.logs) ? (pipelineRun.logs as PipelineLogEntry[]) : []

  return {
    exists: true,
    pipelineRunId: pipelineRun.id,
    status: pipelineRun.status,
    currentPhase: pipelineRun.currentPhase,
    startedAt: pipelineRun.startedAt?.toISOString() ?? pipelineRun.createdAt.toISOString(),
    completedAt: pipelineRun.completedAt?.toISOString() ?? null,
    errorMessage: pipelineRun.errorMessage,
    runId: graphRun?.id ?? null,
    steps,
    totalUsage,
    activeTask,
    review: reviewSummary,
    logs,
  }
}
