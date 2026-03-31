// src/lib/agent-pipeline/graph/nodes/voice-generator.ts

import type { GraphNodeContext } from '@/lib/run-runtime/graph-executor'
import type { PipelineState } from '../state'
import { prisma } from '@/lib/prisma'
import { submitTask } from '@/lib/task/submitter'
import { TASK_TYPE } from '@/lib/task/types'
import { waitForTaskCompletion, waitForMultipleTasksCompletion } from '../task-wait'
import { appendPipelineLog } from '../../pipeline-log'
import { createScopedLogger } from '@/lib/logging/core'
import { getProjectModelConfig } from '@/lib/config-service'
import { estimateVoiceLineMaxSeconds } from '@/lib/voice/generate-voice-line'
import {
  parseSpeakerVoiceMap,
  hasVoiceBindingForProvider,
} from '@/lib/voice/provider-voice-binding'
import { getProviderKey, resolveModelSelectionOrSingle } from '@/lib/api-config'

const AGENT = '配音 Agent'

export async function runVoiceGenerationAgent(
  context: GraphNodeContext<PipelineState>,
): Promise<void> {
  const { state } = context
  const log = (message: string) =>
    appendPipelineLog(state.pipelineRunId, { agent: AGENT, message })
  const logger = createScopedLogger({
    module: 'agent-pipeline.voice-generator',
    projectId: state.projectId,
  })

  logger.info({ action: 'voice_generator.start', message: 'Starting voice generation' })
  await log('开始配音生成')

  const novelData = await prisma.novelPromotionProject.findUnique({
    where: { projectId: state.projectId },
    select: {
      id: true,
      characters: {
        select: {
          name: true,
          customVoiceUrl: true,
          voiceId: true,
        },
      },
    },
  })
  if (!novelData) throw new Error('NovelPromotionProject not found')

  // Step 1: Voice analysis — extract voice lines from screenplay for each episode
  for (let i = 0; i < state.episodeIds.length; i++) {
    const episodeId = state.episodeIds[i]

    // Check if voice lines already exist
    const existingLines = await prisma.novelPromotionVoiceLine.count({
      where: { episodeId },
    })
    if (existingLines > 0) {
      await log(`集 ${i + 1} 已有 ${existingLines} 条台词，跳过分析`)
      continue
    }

    await log(`分析台词 ${i + 1}/${state.episodeIds.length} (voice_analyze)`)
    const analyzeResult = await submitTask({
      userId: state.userId,
      locale: 'zh',
      projectId: state.projectId,
      episodeId,
      type: TASK_TYPE.VOICE_ANALYZE,
      targetType: 'NovelPromotionEpisode',
      targetId: episodeId,
      payload: {
        pipelineRunId: state.pipelineRunId,
        displayMode: 'detail',
      },
      dedupeKey: `voice_analyze:${episodeId}`,
      priority: 1,
    })
    await waitForTaskCompletion(analyzeResult.taskId, state.projectId)
  }

  state.voiceAnalysisComplete = true
  await log('台词分析完成')

  // Step 2: Generate voice audio for each voice line
  const projectModels = await getProjectModelConfig(state.projectId, state.userId)
  const audioModelKey = projectModels.audioModel

  let providerKey = ''
  let resolvedAudioModelKey = ''
  try {
    const resolved = await resolveModelSelectionOrSingle(
      state.userId,
      audioModelKey || null,
      'audio',
    )
    providerKey = getProviderKey(resolved.provider).toLowerCase()
    resolvedAudioModelKey = resolved.modelKey
  } catch {
    await log('⚠️ 未配置音频模型，跳过配音生成')
    logger.warn({ action: 'voice_generator.skip_audio', message: 'No audio model available' })
    state.voiceGenerationComplete = true
    state.currentPhase = 'assembly'
    await prisma.pipelineRun.update({
      where: { id: state.pipelineRunId },
      data: { currentPhase: 'assembly' },
    })
    return
  }

  const characters = novelData.characters || []
  const taskIds: string[] = []

  for (const episodeId of state.episodeIds) {
    const episode = await prisma.novelPromotionEpisode.findUnique({
      where: { id: episodeId },
      select: { speakerVoices: true },
    })
    const speakerVoices = parseSpeakerVoiceMap(episode?.speakerVoices as string | null)

    // Get voice lines without audio
    const voiceLines = await prisma.novelPromotionVoiceLine.findMany({
      where: {
        episodeId,
        audioUrl: null,
      },
      orderBy: { lineIndex: 'asc' },
      select: { id: true, speaker: true, content: true },
    })

    // Filter to lines with voice bindings
    const generatableLines = voiceLines.filter((line) => {
      const character = characters.find(
        (c) => c.name.trim().toLowerCase() === line.speaker.trim().toLowerCase(),
      )
      return hasVoiceBindingForProvider({
        providerKey,
        character: character || null,
        speakerVoice: speakerVoices[line.speaker] || null,
      })
    })

    if (generatableLines.length < voiceLines.length) {
      const skipped = voiceLines.length - generatableLines.length
      await log(`集 ${episodeId}: ${skipped} 条台词无音色绑定，已跳过`)
    }

    for (const line of generatableLines) {
      const result = await submitTask({
        userId: state.userId,
        locale: 'zh',
        projectId: state.projectId,
        episodeId,
        type: TASK_TYPE.VOICE_LINE,
        targetType: 'NovelPromotionVoiceLine',
        targetId: line.id,
        payload: {
          episodeId,
          lineId: line.id,
          maxSeconds: estimateVoiceLineMaxSeconds(line.content),
          audioModel: resolvedAudioModelKey,
          pipelineRunId: state.pipelineRunId,
        },
        dedupeKey: `voice_line:${line.id}`,
      })
      taskIds.push(result.taskId)
    }
  }

  if (taskIds.length > 0) {
    await log(`提交 ${taskIds.length} 个配音任务，等待完成...`)
    await waitForMultipleTasksCompletion(taskIds, state.projectId)
    await log(`配音生成完成，共 ${taskIds.length} 条`)
  } else {
    await log('无可生成的配音任务（缺少音色绑定或已全部完成）')
  }

  state.voiceGenerationComplete = true
  state.voiceLineCount = taskIds.length
  state.currentPhase = 'assembly'

  await prisma.pipelineRun.update({
    where: { id: state.pipelineRunId },
    data: { currentPhase: 'assembly' },
  })

  logger.info({
    action: 'voice_generator.complete',
    message: `Voice generation complete: ${taskIds.length} lines`,
  })
}
