// src/lib/agent-pipeline/review/review-service.ts

import { prisma } from '@/lib/prisma'
import { resolveMediaRef } from '@/lib/media/service'
import { REVIEW_STATUS } from '../types'
import type { ReviewItemInput, ReviewSummary } from './types'

export type EnrichedReviewItem = {
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

export async function enrichReviewItems(
  items: Array<{
    id: string; phase: string; targetType: string; targetId: string
    status: string; score: number | null; feedback: string | null; retryCount: number
  }>,
): Promise<EnrichedReviewItem[]> {
  return Promise.all(items.map(async (item) => {
    let targetName: string | null = null
    let targetImageUrl: string | null = null

    try {
      if (item.targetType === 'character') {
        const character = await prisma.novelPromotionCharacter.findUnique({
          where: { id: item.targetId },
          include: { appearances: { orderBy: { appearanceIndex: 'asc' }, take: 1 } },
        })
        if (character) {
          targetName = character.name
          const app = character.appearances[0]
          if (app) {
            const media = await resolveMediaRef(app.imageMediaId, app.imageUrl)
            targetImageUrl = media?.url ?? null
          }
        }
      } else if (item.targetType === 'location') {
        const location = await prisma.novelPromotionLocation.findUnique({
          where: { id: item.targetId },
          include: {
            selectedImage: true,
            images: { orderBy: { imageIndex: 'asc' }, take: 1 },
          },
        })
        if (location) {
          targetName = location.name
          const img = location.selectedImage ?? location.images[0]
          if (img) {
            const media = await resolveMediaRef(img.imageMediaId, img.imageUrl)
            targetImageUrl = media?.url ?? null
          }
        }
      } else if (item.targetType === 'panel') {
        const panel = await prisma.novelPromotionPanel.findUnique({
          where: { id: item.targetId },
        })
        if (panel) {
          targetName = panel.panelNumber != null ? `#${panel.panelNumber}` : `Panel ${panel.panelIndex + 1}`
          const media = await resolveMediaRef(panel.imageMediaId, panel.imageUrl)
          targetImageUrl = media?.url ?? null
        }
      }
    } catch {
      // Silently fall back to no enrichment for this item
    }

    return { ...item, targetName, targetImageUrl }
  }))
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
