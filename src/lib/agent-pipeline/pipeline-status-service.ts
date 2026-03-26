// src/lib/agent-pipeline/pipeline-status-service.ts

import { prisma } from '@/lib/prisma'
import { getReviewSummary } from './review/review-service'
import type { ReviewSummary } from './review/types'
import type { PipelineLogEntry } from './pipeline-log'

type TokenUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

type StepInfo = {
  stepKey: string
  stepTitle: string
  status: string
  stepIndex: number
  startedAt: string | null
  finishedAt: string | null
  lastErrorMessage: string | null
  usage: TokenUsage
}

type ActiveTaskInfo = {
  type: string
  targetType: string
  progress: number
  status: string
  model: string | null
}

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

  let steps: StepInfo[] = []
  const totalUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

  if (graphRun) {
    const graphSteps = await prisma.graphStep.findMany({
      where: { runId: graphRun.id },
      orderBy: { stepIndex: 'asc' },
      include: {
        attempts: {
          select: { usageJson: true, provider: true, modelKey: true },
        },
      },
    })

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

      return {
        stepKey: s.stepKey,
        stepTitle: s.stepTitle,
        status: s.status,
        stepIndex: s.stepIndex,
        startedAt: s.startedAt?.toISOString() ?? null,
        finishedAt: s.finishedAt?.toISOString() ?? null,
        lastErrorMessage: s.lastErrorMessage,
        usage: stepUsage,
      }
    })
  }

  // Find active tasks for this project
  let activeTask: ActiveTaskInfo | null = null
  const activeTasks = await prisma.task.findMany({
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
  })

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

  const reviewSummary = await getReviewSummary(pipelineRun.id)

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
