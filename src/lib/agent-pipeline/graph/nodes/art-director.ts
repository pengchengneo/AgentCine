// src/lib/agent-pipeline/graph/nodes/art-director.ts

import type { GraphNodeContext } from '@/lib/run-runtime/graph-executor'
import type { PipelineState } from '../state'
import { prisma } from '@/lib/prisma'
import { submitTask } from '@/lib/task/submitter'
import { TASK_TYPE } from '@/lib/task/types'
import { getOrCreateStyleProfile, lockAsset, getCharacterAssets, getLocationAssets } from '../../asset-layer/registry'
import { waitForMultipleTasksCompletion } from '../task-wait'
import { getArtStylePrompt } from '@/lib/constants'
import { appendPipelineLog } from '../../pipeline-log'
import { createScopedLogger } from '@/lib/logging/core'

const AGENT = '美术总监'

export async function runArtDirectorAgent(
  context: GraphNodeContext<PipelineState>,
): Promise<void> {
  const { state } = context
  const log = (message: string, model?: string) =>
    appendPipelineLog(state.pipelineRunId, { agent: AGENT, message, model })
  const logger = createScopedLogger({
    module: 'agent-pipeline.art-director',
    projectId: state.projectId,
  })

  logger.info({ action: 'art_director.start', message: 'Starting art direction' })
  await log('开始美术资产生成')

  const novelData = await prisma.novelPromotionProject.findUnique({
    where: { projectId: state.projectId },
    select: { id: true, artStyle: true, artStylePrompt: true },
  })
  if (!novelData) throw new Error('NovelPromotionProject not found')

  // Step 1: Create StyleProfile
  const artStylePrompt = novelData.artStylePrompt || getArtStylePrompt(novelData.artStyle, 'zh')
  const styleProfile = await getOrCreateStyleProfile(state.projectId, {
    artStyle: novelData.artStyle,
    stylePrefix: artStylePrompt,
    negativePrompt: 'low quality, blurry, deformed, ugly, bad anatomy',
    colorPalette: null,
  })
  state.styleProfile = styleProfile
  await log(`风格配置: ${novelData.artStyle || 'default'}`)

  // Step 2: Generate character images
  const characters = await getCharacterAssets(novelData.id)
  const charsToGenerate = characters.filter((c) => !c.imageUrl)
  await log(`准备生成 ${charsToGenerate.length} 个角色图片 (image_character)`)

  const characterTaskIds: string[] = []
  for (const char of charsToGenerate) {
    await log(`提交角色图片任务: ${char.name}`)
    const result = await submitTask({
      userId: state.userId,
      locale: 'zh',
      projectId: state.projectId,
      type: TASK_TYPE.IMAGE_CHARACTER,
      targetType: 'NovelPromotionCharacter',
      targetId: char.id,
      payload: {
        id: char.id,
        pipelineRunId: state.pipelineRunId,
      },
    })
    characterTaskIds.push(result.taskId)
  }
  await waitForMultipleTasksCompletion(characterTaskIds, state.projectId)
  if (charsToGenerate.length > 0) {
    await log(`${charsToGenerate.length} 个角色图片生成完成`)
  }

  // Step 3: Generate location images
  const locations = await getLocationAssets(novelData.id)
  const locsToGenerate = locations.filter((l) => !l.imageUrl)
  await log(`准备生成 ${locsToGenerate.length} 个场景图片 (image_location)`)

  const locationTaskIds: string[] = []
  for (const loc of locsToGenerate) {
    await log(`提交场景图片任务: ${loc.name}`)
    const result = await submitTask({
      userId: state.userId,
      locale: 'zh',
      projectId: state.projectId,
      type: TASK_TYPE.IMAGE_LOCATION,
      targetType: 'NovelPromotionLocation',
      targetId: loc.id,
      payload: {
        id: loc.id,
        pipelineRunId: state.pipelineRunId,
      },
    })
    locationTaskIds.push(result.taskId)
  }
  await waitForMultipleTasksCompletion(locationTaskIds, state.projectId)
  if (locsToGenerate.length > 0) {
    await log(`${locsToGenerate.length} 个场景图片生成完成`)
  }

  // Step 4: Lock all assets
  const updatedCharacters = await getCharacterAssets(novelData.id)
  for (const char of updatedCharacters) {
    await lockAsset('character', char.id)
  }
  const updatedLocations = await getLocationAssets(novelData.id)
  for (const loc of updatedLocations) {
    await lockAsset('location', loc.id)
  }

  state.characterAssetsLocked = true
  state.locationAssetsLocked = true
  state.currentPhase = 'storyboard'

  await log('美术资产全部锁定，进入分镜阶段')
  logger.info({
    action: 'art_director.complete',
    message: `Generated images for ${characterTaskIds.length} characters, ${locationTaskIds.length} locations`,
  })
}
