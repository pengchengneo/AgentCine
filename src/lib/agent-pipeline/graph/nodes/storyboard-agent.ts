// src/lib/agent-pipeline/graph/nodes/storyboard-agent.ts

import type { GraphNodeContext } from '@/lib/run-runtime/graph-executor'
import type { PipelineState } from '../state'
import { prisma } from '@/lib/prisma'
import { submitTask } from '@/lib/task/submitter'
import { TASK_TYPE } from '@/lib/task/types'
import { waitForTaskCompletion, waitForMultipleTasksCompletion } from '../task-wait'
import { createScopedLogger } from '@/lib/logging/core'

export async function runStoryboardAgent(
  context: GraphNodeContext<PipelineState>,
): Promise<void> {
  const { state } = context
  const logger = createScopedLogger({
    module: 'agent-pipeline.storyboard-agent',
    projectId: state.projectId,
  })

  logger.info({ action: 'storyboard_agent.start', message: 'Starting storyboard generation' })

  // Step 1: Run script-to-storyboard for each episode
  for (const episodeId of state.episodeIds) {
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
      imageUrl: null, // only panels without images
    },
    select: { id: true },
  })

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

  logger.info({
    action: 'storyboard_agent.complete',
    message: `Generated storyboards and ${panels.length} panel images`,
  })
}
