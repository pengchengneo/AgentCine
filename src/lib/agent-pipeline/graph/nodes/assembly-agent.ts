// src/lib/agent-pipeline/graph/nodes/assembly-agent.ts

import type { GraphNodeContext } from '@/lib/run-runtime/graph-executor'
import type { PipelineState } from '../state'
import { prisma } from '@/lib/prisma'
import { autoAssembleFromEpisode } from '@/features/video-editor/utils/auto-assembly'
import { appendPipelineLog } from '../../pipeline-log'
import { PIPELINE_STATUS } from '../../types'
import { createScopedLogger } from '@/lib/logging/core'

const AGENT = '成片 Agent'

export async function runAssemblyAgent(
  context: GraphNodeContext<PipelineState>,
): Promise<void> {
  const { state } = context
  const log = (message: string) =>
    appendPipelineLog(state.pipelineRunId, { agent: AGENT, message })
  const logger = createScopedLogger({
    module: 'agent-pipeline.assembly-agent',
    projectId: state.projectId,
  })

  logger.info({ action: 'assembly_agent.start', message: 'Starting auto-assembly' })
  await log('开始自动成片')

  // Auto-assemble for each episode
  for (let i = 0; i < state.episodeIds.length; i++) {
    const episodeId = state.episodeIds[i]
    await log(`装配集 ${i + 1}/${state.episodeIds.length}`)

    const project = await autoAssembleFromEpisode(episodeId)
    await log(`集 ${i + 1} 装配完成：${project.timeline.length} 个片段`)
  }

  state.assemblyComplete = true
  state.currentPhase = 'assembly'

  // Set pipeline to COMPLETED
  await prisma.pipelineRun.update({
    where: { id: state.pipelineRunId },
    data: {
      status: PIPELINE_STATUS.COMPLETED,
      currentPhase: 'assembly',
      completedAt: new Date(),
    },
  })

  await log('自动成片完成，Pipeline 已完成')
  logger.info({
    action: 'assembly_agent.complete',
    message: 'Auto-assembly complete, pipeline finished',
  })
}
