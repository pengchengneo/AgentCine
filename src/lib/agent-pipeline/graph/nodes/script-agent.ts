// src/lib/agent-pipeline/graph/nodes/script-agent.ts

import type { GraphNodeContext } from '@/lib/run-runtime/graph-executor'
import type { PipelineState } from '../state'
import { prisma } from '@/lib/prisma'
import { submitTask } from '@/lib/task/submitter'
import { TASK_TYPE } from '@/lib/task/types'
import { updatePromptFragment } from '../../asset-layer/registry'
import { waitForTaskCompletion } from '../task-wait'
import { createScopedLogger } from '@/lib/logging/core'

export async function runScriptAgent(
  context: GraphNodeContext<PipelineState>,
): Promise<void> {
  const { state } = context
  const logger = createScopedLogger({
    module: 'agent-pipeline.script-agent',
    projectId: state.projectId,
  })

  logger.info({ action: 'script_agent.start', message: 'Starting script analysis' })

  // Step 1: Get novel project
  const novelData = await prisma.novelPromotionProject.findUnique({
    where: { projectId: state.projectId },
    select: { id: true, artStyle: true },
  })
  if (!novelData) throw new Error('NovelPromotionProject not found')

  // Step 2: Submit analyze_novel task and wait
  const analyzeResult = await submitTask({
    userId: state.userId,
    locale: 'zh',
    projectId: state.projectId,
    type: TASK_TYPE.ANALYZE_NOVEL,
    targetType: 'NovelPromotionProject',
    targetId: state.projectId,
    payload: {
      novelText: state.script,
      pipelineRunId: state.pipelineRunId,
    },
  })
  await waitForTaskCompletion(analyzeResult.taskId, state.projectId)

  // Step 3: Read extracted characters and locations from DB
  const characters = await prisma.novelPromotionCharacter.findMany({
    where: { novelPromotionProjectId: novelData.id },
    include: { appearances: { orderBy: { appearanceIndex: 'asc' }, take: 1 } },
  })
  const locations = await prisma.novelPromotionLocation.findMany({
    where: { novelPromotionProjectId: novelData.id },
  })

  // Step 4: Auto-generate promptFragments from appearance descriptions
  for (const char of characters) {
    const desc = char.appearances[0]?.description
    if (desc && !char.promptFragment) {
      await updatePromptFragment('character', char.id, desc)
    }
  }
  for (const loc of locations) {
    if (loc.summary && !loc.promptFragment) {
      await updatePromptFragment('location', loc.id, loc.summary)
    }
  }

  // Step 5: Submit story_to_script_run task for each episode
  const episodes = await prisma.novelPromotionEpisode.findMany({
    where: { novelPromotionProjectId: novelData.id },
    select: { id: true },
    orderBy: { episodeNumber: 'asc' },
  })

  for (const episode of episodes) {
    const storyResult = await submitTask({
      userId: state.userId,
      locale: 'zh',
      projectId: state.projectId,
      episodeId: episode.id,
      type: TASK_TYPE.STORY_TO_SCRIPT_RUN,
      targetType: 'NovelPromotionEpisode',
      targetId: episode.id,
      payload: {
        pipelineRunId: state.pipelineRunId,
      },
    })
    await waitForTaskCompletion(storyResult.taskId, state.projectId)
  }

  // Update state
  state.characters = characters.map((c) => ({
    id: c.id,
    name: c.name,
    aliases: c.aliases,
    appearance: c.appearances[0]?.description ?? null,
    imageUrl: c.appearances[0]?.imageUrl ?? null,
    promptFragment: c.appearances[0]?.description ?? null,
    assetStatus: 'draft' as const,
  }))
  state.locations = locations.map((l) => ({
    id: l.id,
    name: l.name,
    summary: l.summary,
    imageUrl: null,
    promptFragment: l.summary ?? null,
    assetStatus: 'draft' as const,
  }))
  state.episodeIds = episodes.map((e) => e.id)
  state.currentPhase = 'art'

  logger.info({
    action: 'script_agent.complete',
    message: `Extracted ${characters.length} characters, ${locations.length} locations, ${episodes.length} episodes`,
  })
}
