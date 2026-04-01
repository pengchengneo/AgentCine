// src/lib/agent-pipeline/graph/nodes/script-agent.ts

import type { GraphNodeContext } from '@/lib/run-runtime/graph-executor'
import type { PipelineState } from '../state'
import { prisma } from '@/lib/prisma'
import { submitTask } from '@/lib/task/submitter'
import { TASK_TYPE } from '@/lib/task/types'
import { updatePromptFragment } from '../../asset-layer/registry'
import { waitForTaskCompletion } from '../task-wait'
import { appendPipelineLog } from '../../pipeline-log'
import { createScopedLogger } from '@/lib/logging/core'

const AGENT = '剧本 Agent'

export async function runScriptAgent(
  context: GraphNodeContext<PipelineState>,
): Promise<void> {
  const { state } = context
  const log = (message: string, model?: string) =>
    appendPipelineLog(state.pipelineRunId, { agent: AGENT, message, model })
  const logger = createScopedLogger({
    module: 'agent-pipeline.script-agent',
    projectId: state.projectId,
  })

  logger.info({ action: 'script_agent.start', message: 'Starting script analysis' })
  await log('开始剧本分析')
  await context.emitSubStep('analyze_novel', 'running')

  // Step 1: Get novel project
  const novelData = await prisma.novelPromotionProject.findUnique({
    where: { projectId: state.projectId },
    select: { id: true, artStyle: true },
  })
  if (!novelData) throw new Error('NovelPromotionProject not found')

  // Step 2: Submit analyze_novel task and wait
  await log('提交小说分析任务 (analyze_novel)')
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
  await log('小说分析完成')
  await context.emitSubStep('analyze_novel', 'completed')
  await context.emitSubStep('extract_characters', 'running')

  // Step 3: Read extracted characters and locations from DB
  const characters = await prisma.novelPromotionCharacter.findMany({
    where: { novelPromotionProjectId: novelData.id },
    include: { appearances: { orderBy: { appearanceIndex: 'asc' }, take: 1 } },
  })
  const locations = await prisma.novelPromotionLocation.findMany({
    where: { novelPromotionProjectId: novelData.id },
  })

  await log(`提取到 ${characters.length} 个角色、${locations.length} 个场景`)

  // Step 4: Auto-generate promptFragments from appearance descriptions (skip locked assets)
  for (const char of characters) {
    const desc = char.appearances[0]?.description
    if (desc && !char.promptFragment && char.assetStatus !== 'locked') {
      await updatePromptFragment('character', char.id, desc)
    }
  }
  for (const loc of locations) {
    if (loc.summary && !loc.promptFragment && loc.assetStatus !== 'locked') {
      await updatePromptFragment('location', loc.id, loc.summary)
    }
  }
  await context.emitSubStep('extract_characters', 'completed')
  await context.emitSubStep('generate_scripts', 'running')

  // Step 5: Submit story_to_script_run task for each episode
  const episodes = await prisma.novelPromotionEpisode.findMany({
    where: { novelPromotionProjectId: novelData.id },
    select: { id: true },
    orderBy: { episodeNumber: 'asc' },
  })

  for (let i = 0; i < episodes.length; i++) {
    const episode = episodes[i]
    await log(`生成剧本 ${i + 1}/${episodes.length} (story_to_script)`)
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

  await log(`剧本生成完成，共 ${episodes.length} 集`)
  await context.emitSubStep('generate_scripts', 'completed')

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
