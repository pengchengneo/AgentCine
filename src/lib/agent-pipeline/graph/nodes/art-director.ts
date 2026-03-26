// src/lib/agent-pipeline/graph/nodes/art-director.ts

import type { GraphNodeContext } from '@/lib/run-runtime/graph-executor'
import type { PipelineState } from '../state'
import { prisma } from '@/lib/prisma'
import { submitTask } from '@/lib/task/submitter'
import { TASK_TYPE } from '@/lib/task/types'
import { getOrCreateStyleProfile, lockAsset, getCharacterAssets, getLocationAssets } from '../../asset-layer/registry'
import { waitForTaskCompletion } from '../task-wait'
import { getArtStylePrompt } from '@/lib/constants'
import { createScopedLogger } from '@/lib/logging/core'

export async function runArtDirectorAgent(
  context: GraphNodeContext<PipelineState>,
): Promise<void> {
  const { state } = context
  const logger = createScopedLogger({
    module: 'agent-pipeline.art-director',
    projectId: state.projectId,
  })

  logger.info({ action: 'art_director.start', message: 'Starting art direction' })

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

  // Step 2: Generate character images
  const characters = await getCharacterAssets(novelData.id)
  const characterTaskIds: string[] = []
  for (const char of characters) {
    if (char.imageUrl) continue // already has image
    const result = await submitTask({
      userId: state.userId,
      locale: 'zh',
      projectId: state.projectId,
      type: TASK_TYPE.IMAGE_CHARACTER,
      targetType: 'NovelPromotionCharacter',
      targetId: char.id,
      payload: {
        pipelineRunId: state.pipelineRunId,
      },
    })
    characterTaskIds.push(result.taskId)
  }
  for (const taskId of characterTaskIds) {
    await waitForTaskCompletion(taskId, state.projectId)
  }

  // Step 3: Generate location images
  const locations = await getLocationAssets(novelData.id)
  const locationTaskIds: string[] = []
  for (const loc of locations) {
    if (loc.imageUrl) continue
    const result = await submitTask({
      userId: state.userId,
      locale: 'zh',
      projectId: state.projectId,
      type: TASK_TYPE.IMAGE_LOCATION,
      targetType: 'NovelPromotionLocation',
      targetId: loc.id,
      payload: {
        pipelineRunId: state.pipelineRunId,
      },
    })
    locationTaskIds.push(result.taskId)
  }
  for (const taskId of locationTaskIds) {
    await waitForTaskCompletion(taskId, state.projectId)
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

  logger.info({
    action: 'art_director.complete',
    message: `Generated images for ${characterTaskIds.length} characters, ${locationTaskIds.length} locations`,
  })
}
