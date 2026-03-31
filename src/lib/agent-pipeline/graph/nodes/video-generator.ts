// src/lib/agent-pipeline/graph/nodes/video-generator.ts

import type { GraphNodeContext } from '@/lib/run-runtime/graph-executor'
import type { PipelineState } from '../state'
import { prisma } from '@/lib/prisma'
import { submitTask } from '@/lib/task/submitter'
import { TASK_TYPE } from '@/lib/task/types'
import { waitForMultipleTasksCompletion } from '../task-wait'
import { appendPipelineLog } from '../../pipeline-log'
import { createScopedLogger } from '@/lib/logging/core'
import { getProjectModelConfig } from '@/lib/config-service'

const AGENT = '视频生成 Agent'

export async function runVideoGenerationAgent(
  context: GraphNodeContext<PipelineState>,
): Promise<void> {
  const { state } = context
  const log = (message: string) =>
    appendPipelineLog(state.pipelineRunId, { agent: AGENT, message })
  const logger = createScopedLogger({
    module: 'agent-pipeline.video-generator',
    projectId: state.projectId,
  })

  logger.info({ action: 'video_generator.start', message: 'Starting video generation' })
  await log('开始视频生成')

  // Resolve video model from project config
  const projectModels = await getProjectModelConfig(state.projectId, state.userId)
  const videoModel = projectModels.videoModel

  if (!videoModel) {
    await log('⚠️ 未配置视频模型，跳过视频生成')
    logger.warn({ action: 'video_generator.skip', message: 'No video model configured' })
    state.videoGenerationComplete = true
    state.currentPhase = 'voice'
    await prisma.pipelineRun.update({
      where: { id: state.pipelineRunId },
      data: { currentPhase: 'voice' },
    })
    return
  }

  // Find all panels with images but no video
  const novelData = await prisma.novelPromotionProject.findUnique({
    where: { projectId: state.projectId },
    select: { id: true },
  })
  if (!novelData) throw new Error('NovelPromotionProject not found')

  const panels = await prisma.novelPromotionPanel.findMany({
    where: {
      storyboard: {
        clip: {
          episode: { novelPromotionProjectId: novelData.id },
        },
      },
      imageUrl: { not: null },
      OR: [
        { videoUrl: null },
        { videoUrl: '' },
      ],
    },
    select: { id: true, storyboard: { select: { episodeId: true } } },
  })

  if (panels.length === 0) {
    await log('所有面板已有视频，跳过视频生成')
    state.videoGenerationComplete = true
    state.currentPhase = 'voice'
    await prisma.pipelineRun.update({
      where: { id: state.pipelineRunId },
      data: { currentPhase: 'voice' },
    })
    return
  }

  await log(`提交 ${panels.length} 个视频生成任务 (video_panel)，模型: ${videoModel}`)

  const taskIds: string[] = []
  for (const panel of panels) {
    const result = await submitTask({
      userId: state.userId,
      locale: 'zh',
      projectId: state.projectId,
      episodeId: panel.storyboard.episodeId,
      type: TASK_TYPE.VIDEO_PANEL,
      targetType: 'NovelPromotionPanel',
      targetId: panel.id,
      payload: {
        videoModel,
        pipelineRunId: state.pipelineRunId,
      },
      dedupeKey: `video_panel:${panel.id}`,
    })
    taskIds.push(result.taskId)
  }

  await log(`等待 ${taskIds.length} 个视频生成任务完成...`)
  await waitForMultipleTasksCompletion(taskIds, state.projectId)

  state.videoGenerationComplete = true
  state.videoPanelCount = panels.length
  state.currentPhase = 'voice'

  await prisma.pipelineRun.update({
    where: { id: state.pipelineRunId },
    data: { currentPhase: 'voice' },
  })

  await log(`视频生成完成，共 ${panels.length} 个面板`)
  logger.info({
    action: 'video_generator.complete',
    message: `Generated videos for ${panels.length} panels`,
  })
}
