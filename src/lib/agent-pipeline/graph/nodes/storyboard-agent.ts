// src/lib/agent-pipeline/graph/nodes/storyboard-agent.ts

import type { GraphNodeContext } from '@/lib/run-runtime/graph-executor'
import type { PipelineState } from '../state'
import { prisma } from '@/lib/prisma'
import { submitTask } from '@/lib/task/submitter'
import { TASK_TYPE } from '@/lib/task/types'
import { waitForTaskCompletion, waitForMultipleTasksCompletion } from '../task-wait'
import { appendPipelineLog } from '../../pipeline-log'
import { createScopedLogger } from '@/lib/logging/core'

const AGENT = '分镜 Agent'

export async function runStoryboardAgent(
  context: GraphNodeContext<PipelineState>,
): Promise<void> {
  const { state } = context
  const log = (message: string) =>
    appendPipelineLog(state.pipelineRunId, { agent: AGENT, message })
  const logger = createScopedLogger({
    module: 'agent-pipeline.storyboard-agent',
    projectId: state.projectId,
  })

  logger.info({ action: 'storyboard_agent.start', message: 'Starting storyboard generation' })
  await log('开始分镜生成')
  await context.emitSubStep('generate_storyboard_scripts', 'running')

  // Step 1: Run script-to-storyboard for each episode
  for (let i = 0; i < state.episodeIds.length; i++) {
    const episodeId = state.episodeIds[i]
    await log(`生成分镜 ${i + 1}/${state.episodeIds.length} (script_to_storyboard)`)
    const storyboardResult = await submitTask({
      userId: state.userId,
      locale: 'zh',
      projectId: state.projectId,
      episodeId,
      type: TASK_TYPE.SCRIPT_TO_STORYBOARD_RUN,
      targetType: 'NovelPromotionEpisode',
      targetId: episodeId,
      payload: {
        pipelineRunId: state.pipelineRunId,
      },
    })
    await waitForTaskCompletion(storyboardResult.taskId, state.projectId)
  }
  await context.emitSubStep('generate_storyboard_scripts', 'completed')
  await context.emitSubStep('batch_generate_panels', 'running')

  // Step 2: Batch generate panel images
  const novelData = await prisma.novelPromotionProject.findUnique({
    where: { projectId: state.projectId },
    select: { id: true },
  })
  if (!novelData) throw new Error('NovelPromotionProject not found')

  const panels = await prisma.novelPromotionPanel.findMany({
    where: {
      storyboard: {
        clip: {
          episode: {
            novelPromotionProjectId: novelData.id,
          },
        },
      },
      imageUrl: null,
    },
    select: { id: true },
  })

  await log(`提交 ${panels.length} 个分镜画面图片任务 (image_panel)`)

  const panelTaskIds: string[] = []
  for (const panel of panels) {
    const result = await submitTask({
      userId: state.userId,
      locale: 'zh',
      projectId: state.projectId,
      type: TASK_TYPE.IMAGE_PANEL,
      targetType: 'NovelPromotionPanel',
      targetId: panel.id,
      payload: {
        pipelineRunId: state.pipelineRunId,
      },
    })
    panelTaskIds.push(result.taskId)
  }

  await waitForMultipleTasksCompletion(panelTaskIds, state.projectId)

  state.storyboardComplete = true
  state.panelCount = panels.length
  state.currentPhase = 'review'

  await log(`分镜生成完成，共 ${panels.length} 个画面`)
  await context.emitSubStep('batch_generate_panels', 'completed')
  logger.info({
    action: 'storyboard_agent.complete',
    message: `Generated storyboards and ${panels.length} panel images`,
  })
}
