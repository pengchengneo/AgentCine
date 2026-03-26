// src/lib/agent-pipeline/index.ts

import { prisma } from '@/lib/prisma'
import { createRun } from '@/lib/run-runtime/service'
import { getProjectModelConfig, checkRequiredModels } from '@/lib/config-service'
import { DEFAULT_PIPELINE_CONFIG, PIPELINE_STATUS, type PipelineConfig } from './types'
import { runAgentPipelineGraph } from './graph/super-graph'
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
      await prisma.pipelineRun.update({
        where: { id: pipelineRun.id },
        data: {
          status: PIPELINE_STATUS.REVIEW,
          completedAt: new Date(),
        },
      })
    })
    .catch(async (error: unknown) => {
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
