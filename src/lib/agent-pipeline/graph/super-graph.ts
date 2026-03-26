// src/lib/agent-pipeline/graph/super-graph.ts

import { runPipelineGraph } from '@/lib/run-runtime/pipeline-graph'
import { createInitialPipelineState, type PipelineState } from './state'
import { runScriptAgent } from './nodes/script-agent'
import { runArtDirectorAgent } from './nodes/art-director'
import { runStoryboardAgent } from './nodes/storyboard-agent'
import { runProducerQualityCheck } from './nodes/producer'
import type { PipelineConfig } from '../types'

export type StartPipelineInput = {
  runId: string
  projectId: string
  userId: string
  pipelineRunId: string
  script: string
  artStyle: string
  aspectRatio: string
  config: PipelineConfig
}

export async function runAgentPipelineGraph(
  input: StartPipelineInput,
): Promise<PipelineState> {
  const initialState = createInitialPipelineState({
    projectId: input.projectId,
    userId: input.userId,
    pipelineRunId: input.pipelineRunId,
    script: input.script,
    artStyle: input.artStyle,
    aspectRatio: input.aspectRatio,
    config: input.config,
  })

  return await runPipelineGraph({
    runId: input.runId,
    projectId: input.projectId,
    userId: input.userId,
    state: initialState,
    nodes: [
      {
        key: 'script_agent',
        title: 'Script Analysis & Story-to-Script',
        maxAttempts: 2,
        timeoutMs: 30 * 60 * 1000, // 30 minutes
        run: runScriptAgent,
      },
      {
        key: 'art_director_agent',
        title: 'Character & Location Image Generation',
        maxAttempts: 2,
        timeoutMs: 30 * 60 * 1000,
        run: runArtDirectorAgent,
      },
      {
        key: 'storyboard_agent',
        title: 'Storyboard & Panel Image Generation',
        maxAttempts: 2,
        timeoutMs: 60 * 60 * 1000, // 60 minutes (many panels)
        run: runStoryboardAgent,
      },
      {
        key: 'producer_quality_check',
        title: 'Quality Check & Review Items',
        maxAttempts: 1,
        timeoutMs: 5 * 60 * 1000,
        run: runProducerQualityCheck,
      },
    ],
  })
}
