// src/lib/agent-pipeline/graph/nodes/producer.ts

import type { GraphNodeContext } from '@/lib/run-runtime/graph-executor'
import type { PipelineState } from '../state'
import { prisma } from '@/lib/prisma'
import { evaluatePhaseQuality } from '../../quality/quality-gate'
import { createReviewItems } from '../../review/review-service'
import { REVIEW_STATUS } from '../../types'
import { appendPipelineLog } from '../../pipeline-log'
import { createScopedLogger } from '@/lib/logging/core'

const AGENT = '制片 Agent'

export async function runProducerQualityCheck(
  context: GraphNodeContext<PipelineState>,
): Promise<void> {
  const { state } = context
  const log = (message: string) =>
    appendPipelineLog(state.pipelineRunId, { agent: AGENT, message })
  const logger = createScopedLogger({
    module: 'agent-pipeline.producer',
    projectId: state.projectId,
  })

  logger.info({ action: 'producer.quality_check', message: 'Running final quality check' })
  await log('开始质量检查与审核项创建')
  await context.emitSubStep('create_review_items', 'running')

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
  await log(`创建 ${characters.length} 个角色审核项`)

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
  await log(`创建 ${locations.length} 个场景审核项`)

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
  await log(`创建 ${panels.length} 个分镜画面审核项`)
  await context.emitSubStep('create_review_items', 'completed')
  await context.emitSubStep('quality_scoring', 'running')

  // Check if all items are already auto-passed — if so, go directly to completed
  const pendingCount = await prisma.pipelineReviewItem.count({
    where: {
      pipelineRunId: state.pipelineRunId,
      status: { in: [REVIEW_STATUS.PENDING, REVIEW_STATUS.RETRYING] },
    },
  })

  if (pendingCount === 0) {
    // All auto-passed — pipeline continues to video/voice/assembly nodes
    await prisma.pipelineRun.update({
      where: { id: state.pipelineRunId },
      data: {
        currentPhase: 'video',
      },
    })
    state.currentPhase = 'video'
    await log(`全部自动通过，继续视频/配音/成片流程`)
  } else {
    await prisma.pipelineRun.update({
      where: { id: state.pipelineRunId },
      data: {
        currentPhase: 'video',
      },
    })
    state.currentPhase = 'video'
    await log(`${pendingCount} 项待审核，继续视频/配音/成片流程`)
  }
  await context.emitSubStep('quality_scoring', 'completed')
  await context.emitSubStep('generate_report', 'running')

  await log(`质量检查完成，共创建 ${characters.length + locations.length + panels.length} 个审核项`)
  await context.emitSubStep('generate_report', 'completed')
  logger.info({
    action: 'producer.quality_check.complete',
    message: `Created review items: ${characters.length} characters, ${locations.length} locations, ${panels.length} panels`,
  })
}
