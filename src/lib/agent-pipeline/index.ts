// src/lib/agent-pipeline/index.ts

import { prisma } from '@/lib/prisma'
import { createRun } from '@/lib/run-runtime/service'
import { getProjectModelConfig, checkRequiredModels } from '@/lib/config-service'
import { DEFAULT_PIPELINE_CONFIG, PIPELINE_STATUS, type PipelineConfig } from './types'
import { runAgentPipelineGraph } from './graph/super-graph'
import { PipelinePausedError } from '@/lib/run-runtime/graph-executor'
import { createScopedLogger } from '@/lib/logging/core'

export async function startPipeline(params: {
  userId: string
  projectId: string
  script: string
  config?: Partial<PipelineConfig>
}): Promise<{ pipelineRunId: string; runId: string }> {
  const logger = createScopedLogger({
    module: 'agent-pipeline',
    projectId: params.projectId,
    userId: params.userId,
  })

  const novelData = await prisma.novelPromotionProject.findUnique({
    where: { projectId: params.projectId },
    select: { artStyle: true, videoRatio: true },
  })
  if (!novelData) throw new Error('NovelPromotionProject not found')

  // Pre-validate required models before starting pipeline
  const modelConfig = await getProjectModelConfig(params.projectId, params.userId)
  const missingModels = checkRequiredModels(modelConfig, [
    'analysisModel',
    'characterModel',
    'locationModel',
    'storyboardModel',
  ])
  if (missingModels.length > 0) {
    throw new Error(`模型未配置: ${missingModels.join('、')}。请在项目设置中配置后重试。`)
  }

  const config: PipelineConfig = {
    ...DEFAULT_PIPELINE_CONFIG,
    ...params.config,
  }

  // Create PipelineRun record
  const pipelineRun = await prisma.pipelineRun.create({
    data: {
      projectId: params.projectId,
      userId: params.userId,
      status: PIPELINE_STATUS.RUNNING,
      currentPhase: 'script',
      config: config as never,
    },
  })

  // Create GraphRun for LangGraph tracking
  const graphRun = await createRun({
    userId: params.userId,
    projectId: params.projectId,
    workflowType: 'agent_pipeline',
    targetType: 'PipelineRun',
    targetId: pipelineRun.id,
    input: { script: params.script.slice(0, 500) }, // truncate for storage
  })

  // Update NovelPromotionProject to agent mode
  await prisma.novelPromotionProject.update({
    where: { projectId: params.projectId },
    data: { pipelineMode: 'agent' },
  })

  logger.info({
    action: 'pipeline.start',
    message: 'Agent pipeline started',
    details: { pipelineRunId: pipelineRun.id, runId: graphRun.id },
  })

  // Run pipeline in background (don't await — this is long-running)
  runAgentPipelineGraph({
    runId: graphRun.id,
    projectId: params.projectId,
    userId: params.userId,
    pipelineRunId: pipelineRun.id,
    script: params.script,
    artStyle: novelData.artStyle,
    aspectRatio: novelData.videoRatio,
    config,
  })
    .then(async () => {
      // Assembly node sets COMPLETED — only update if still RUNNING
      const current = await prisma.pipelineRun.findUnique({
        where: { id: pipelineRun.id },
        select: { status: true },
      })
      if (current?.status === PIPELINE_STATUS.RUNNING) {
        await prisma.pipelineRun.update({
          where: { id: pipelineRun.id },
          data: {
            status: PIPELINE_STATUS.COMPLETED,
            completedAt: new Date(),
          },
        })
      }
    })
    .catch(async (error: unknown) => {
      if (error instanceof PipelinePausedError) {
        // Pipeline was paused — update GraphRun status and leave PipelineRun as paused
        await prisma.graphRun.updateMany({
          where: { id: graphRun.id, status: { in: ['running', 'queued'] } },
          data: { status: 'paused' },
        })
        logger.info({
          action: 'pipeline.paused',
          message: 'Pipeline paused by user',
        })
        return
      }

      const message = error instanceof Error ? error.message : String(error)
      await prisma.pipelineRun.update({
        where: { id: pipelineRun.id },
        data: {
          status: PIPELINE_STATUS.FAILED,
          errorMessage: message,
          completedAt: new Date(),
        },
      })
      logger.error({
        action: 'pipeline.failed',
        message,
        errorCode: 'PIPELINE_FAILED',
        retryable: false,
      })
    })

  return { pipelineRunId: pipelineRun.id, runId: graphRun.id }
}

export async function resumePipeline(params: {
  userId: string
  projectId: string
  pipelineRunId: string
}): Promise<{ resumed: boolean }> {
  const logger = createScopedLogger({
    module: 'agent-pipeline',
    projectId: params.projectId,
    userId: params.userId,
  })

  const pipelineRun = await prisma.pipelineRun.findUnique({
    where: { id: params.pipelineRunId },
  })
  if (!pipelineRun || pipelineRun.status !== PIPELINE_STATUS.PAUSED) {
    throw new Error('Pipeline is not paused')
  }

  // Find the GraphRun
  const graphRun = await prisma.graphRun.findFirst({
    where: {
      targetType: 'PipelineRun',
      targetId: params.pipelineRunId,
    },
  })
  if (!graphRun) {
    throw new Error('GraphRun not found for pipeline')
  }

  // Get completed step keys
  const completedSteps = await prisma.graphStep.findMany({
    where: {
      runId: graphRun.id,
      status: 'completed',
    },
    select: { stepKey: true },
    orderBy: { stepIndex: 'asc' },
  })
  const completedNodes = completedSteps.map((s) => s.stepKey)

  const novelData = await prisma.novelPromotionProject.findUnique({
    where: { projectId: params.projectId },
    select: { artStyle: true, videoRatio: true },
  })

  // Get latest checkpoint state
  const checkpoints = await prisma.graphCheckpoint.findMany({
    where: { runId: graphRun.id },
    orderBy: { createdAt: 'desc' },
    take: 1,
  })

  if (checkpoints.length === 0) {
    throw new Error('No checkpoint found for paused pipeline — cannot resume')
  }

  // Build checkpoint state
  const saved = (checkpoints[0].stateJson || {}) as Record<string, unknown>
  const config = (pipelineRun.config as PipelineConfig) || DEFAULT_PIPELINE_CONFIG
  const checkpointState: Record<string, unknown> = {
    refs: saved.refs || {},
    meta: saved.meta || {},
    projectId: params.projectId,
    userId: params.userId,
    pipelineRunId: params.pipelineRunId,
    script: '',
    artStyle: novelData?.artStyle || '',
    aspectRatio: novelData?.videoRatio || '9:16',
    config,
    characters: [],
    locations: [],
    episodeIds: [],
    styleProfile: null,
    characterAssetsLocked: completedNodes.includes('art_director_agent'),
    locationAssetsLocked: completedNodes.includes('art_director_agent'),
    storyboardComplete: completedNodes.includes('storyboard_agent'),
    panelCount: 0,
    currentPhase: pipelineRun.currentPhase || 'script',
    qualityGates: [],
    error: null,
  }

  // Update statuses
  await prisma.pipelineRun.update({
    where: { id: params.pipelineRunId },
    data: { status: PIPELINE_STATUS.RUNNING },
  })
  await prisma.graphRun.updateMany({
    where: { id: graphRun.id },
    data: { status: 'running' },
  })

  // Reset any failed/running steps that will be re-run
  await prisma.graphStep.updateMany({
    where: {
      runId: graphRun.id,
      status: { in: ['running', 'failed'] },
    },
    data: {
      status: 'pending',
      finishedAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
    },
  })

  logger.info({
    action: 'pipeline.resume',
    message: `Resuming pipeline from after: ${completedNodes.join(', ') || 'beginning'}`,
  })

  // Run pipeline in background with resume context
  runAgentPipelineGraph({
    runId: graphRun.id,
    projectId: params.projectId,
    userId: params.userId,
    pipelineRunId: params.pipelineRunId,
    script: '',
    artStyle: novelData?.artStyle || '',
    aspectRatio: novelData?.videoRatio || '9:16',
    config: (pipelineRun.config as PipelineConfig) || DEFAULT_PIPELINE_CONFIG,
    resumeFrom: {
      completedNodes,
      checkpointState,
    },
  })
    .then(async () => {
      const current = await prisma.pipelineRun.findUnique({
        where: { id: params.pipelineRunId },
        select: { status: true },
      })
      if (current && current.status === PIPELINE_STATUS.RUNNING) {
        await prisma.pipelineRun.update({
          where: { id: params.pipelineRunId },
          data: {
            status: PIPELINE_STATUS.COMPLETED,
            completedAt: new Date(),
          },
        })
      }
    })
    .catch(async (error: unknown) => {
      if (error instanceof PipelinePausedError) {
        await prisma.graphRun.updateMany({
          where: { id: graphRun.id, status: { in: ['running', 'queued'] } },
          data: { status: 'paused' },
        })
        logger.info({ action: 'pipeline.paused', message: 'Pipeline paused again' })
        return
      }

      const message = error instanceof Error ? error.message : String(error)
      await prisma.pipelineRun.update({
        where: { id: params.pipelineRunId },
        data: {
          status: PIPELINE_STATUS.FAILED,
          errorMessage: message,
          completedAt: new Date(),
        },
      })
      logger.error({
        action: 'pipeline.failed',
        message,
        errorCode: 'PIPELINE_FAILED',
        retryable: false,
      })
    })

  return { resumed: true }
}
