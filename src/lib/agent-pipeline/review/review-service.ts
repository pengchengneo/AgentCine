// src/lib/agent-pipeline/review/review-service.ts

import { prisma } from '@/lib/prisma'
import { REVIEW_STATUS } from '../types'
import type { ReviewItemInput, ReviewSummary } from './types'

export async function createReviewItems(items: ReviewItemInput[]): Promise<void> {
  for (const item of items) {
    await prisma.pipelineReviewItem.create({
      data: {
        pipelineRunId: item.pipelineRunId,
        phase: item.phase,
        targetType: item.targetType,
        targetId: item.targetId,
        status: item.status,
        score: item.score ?? null,
        feedback: item.feedback ?? null,
      },
    })
  }
}

export async function approveReviewItem(reviewItemId: string): Promise<void> {
  await prisma.pipelineReviewItem.update({
    where: { id: reviewItemId },
    data: { status: REVIEW_STATUS.APPROVED },
  })
}

export async function rejectReviewItem(reviewItemId: string, feedback: string): Promise<void> {
  await prisma.pipelineReviewItem.update({
    where: { id: reviewItemId },
    data: { status: REVIEW_STATUS.REJECTED, feedback },
  })
}

export async function markRetrying(reviewItemId: string): Promise<void> {
  await prisma.pipelineReviewItem.update({
    where: { id: reviewItemId },
    data: {
      status: REVIEW_STATUS.RETRYING,
      retryCount: { increment: 1 },
    },
  })
}

export async function getReviewItemsByRun(
  pipelineRunId: string,
  phase?: string,
): Promise<Array<{
  id: string
  phase: string
  targetType: string
  targetId: string
  status: string
  score: number | null
  feedback: string | null
  retryCount: number
}>> {
  return prisma.pipelineReviewItem.findMany({
    where: {
      pipelineRunId,
      ...(phase ? { phase } : {}),
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getReviewSummary(pipelineRunId: string): Promise<ReviewSummary> {
  const items = await prisma.pipelineReviewItem.findMany({
    where: { pipelineRunId },
    select: { status: true },
  })

  const summary: ReviewSummary = {
    total: items.length,
    autoPassedCount: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    retryingCount: 0,
  }

  for (const item of items) {
    switch (item.status) {
      case REVIEW_STATUS.AUTO_PASSED: summary.autoPassedCount++; break
      case REVIEW_STATUS.PENDING: summary.pendingCount++; break
      case REVIEW_STATUS.APPROVED: summary.approvedCount++; break
      case REVIEW_STATUS.REJECTED: summary.rejectedCount++; break
      case REVIEW_STATUS.RETRYING: summary.retryingCount++; break
    }
  }

  return summary
}
