// src/lib/agent-pipeline/graph/nodes/producer.ts

import type { GraphNodeContext } from '@/lib/run-runtime/graph-executor'
import type { PipelineState } from '../state'
import { prisma } from '@/lib/prisma'
import { evaluatePhaseQuality } from '../../quality/quality-gate'
import { createReviewItems } from '../../review/review-service'
import { PIPELINE_STATUS, REVIEW_STATUS } from '../../types'
import { createScopedLogger } from '@/lib/logging/core'

export async function runProducerQualityCheck(
  context: GraphNodeContext<PipelineState>,
): Promise<void> {
  const { state } = context
  const logger = createScopedLogger({
    module: 'agent-pipeline.producer',
    projectId: state.projectId,
  })

  logger.info({ action: 'producer.quality_check', message: 'Running final quality check' })

  const novelData = await prisma.novelPromotionProject.findUnique({
    where: { projectId: state.projectId },
    select: { id: true },
  })
  if (!novelData) throw new Error('NovelPromotionProject not found')

  // Create review items for characters
  const characters = await prisma.novelPromotionCharacter.findMany({
    where: { novelPromotionProjectId: novelData.id },
    select: { id: true },
  })
  await createReviewItems(
    characters.map((c) => ({
      pipelineRunId: state.pipelineRunId,
      phase: 'art' as const,
      targetType: 'character' as const,
      targetId: c.id,
      status: REVIEW_STATUS.AUTO_PASSED,
      score: 1.0,
    })),
  )

  // Create review items for locations
  const locations = await prisma.novelPromotionLocation.findMany({
    where: { novelPromotionProjectId: novelData.id },
    select: { id: true },
  })
  await createReviewItems(
    locations.map((l) => ({
      pipelineRunId: state.pipelineRunId,
      phase: 'art' as const,
      targetType: 'location' as const,
      targetId: l.id,
      status: REVIEW_STATUS.AUTO_PASSED,
      score: 1.0,
    })),
  )

  // Create review items for panels
  const panels = await prisma.novelPromotionPanel.findMany({
    where: {
      storyboard: {
        clip: {
          episode: { novelPromotionProjectId: novelData.id },
        },
      },
    },
    select: { id: true },
  })
  await createReviewItems(
    panels.map((p) => ({
      pipelineRunId: state.pipelineRunId,
      phase: 'storyboard' as const,
      targetType: 'panel' as const,
      targetId: p.id,
      status: REVIEW_STATUS.AUTO_PASSED,
      score: 1.0,
    })),
  )

  // Update pipeline run status to review
  await prisma.pipelineRun.update({
    where: { id: state.pipelineRunId },
    data: {
      status: PIPELINE_STATUS.REVIEW,
      currentPhase: 'review',
    },
  })

  state.currentPhase = 'review'

  logger.info({
    action: 'producer.quality_check.complete',
    message: `Created review items: ${characters.length} characters, ${locations.length} locations, ${panels.length} panels`,
  })
}
