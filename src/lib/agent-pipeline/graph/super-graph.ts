// src/lib/agent-pipeline/graph/super-graph.ts

import { runPipelineGraph } from '@/lib/run-runtime/pipeline-graph'
import { createInitialPipelineState, type PipelineState } from './state'
import { runScriptAgent } from './nodes/script-agent'
import { runArtDirectorAgent } from './nodes/art-director'
import { runStoryboardAgent } from './nodes/storyboard-agent'
import { runProducerQualityCheck } from './nodes/producer'
import { runVideoGenerationAgent } from './nodes/video-generator'
import { runVoiceGenerationAgent } from './nodes/voice-generator'
import { runAssemblyAgent } from './nodes/assembly-agent'
import type { PipelineConfig } from '../types'
import type { ResumeContext } from '../pipeline-types'

export type StartPipelineInput = {
  runId: string
  projectId: string
  userId: string
  pipelineRunId: string
  script: string
  artStyle: string
  aspectRatio: string
  config: PipelineConfig
  resumeFrom?: ResumeContext
}

export async function runAgentPipelineGraph(
  input: StartPipelineInput,
): Promise<PipelineState> {
  const allNodes = [
    {
      key: 'script_agent',
      title: 'Script Analysis & Story-to-Script',
      maxAttempts: 2,
      timeoutMs: 30 * 60 * 1000,
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
      timeoutMs: 60 * 60 * 1000,
      run: runStoryboardAgent,
    },
    {
      key: 'producer_quality_check',
      title: 'Quality Check & Review Items',
      maxAttempts: 1,
      timeoutMs: 5 * 60 * 1000,
      run: runProducerQualityCheck,
    },
    {
      key: 'video_generation_agent',
      title: 'Video Generation for Panels',
      maxAttempts: 2,
      timeoutMs: 60 * 60 * 1000,
      run: runVideoGenerationAgent,
    },
    {
      key: 'voice_generation_agent',
      title: 'Voice Analysis & Audio Generation',
      maxAttempts: 2,
      timeoutMs: 30 * 60 * 1000,
      run: runVoiceGenerationAgent,
    },
    {
      key: 'assembly_agent',
      title: 'Auto Assembly & Final Composition',
      maxAttempts: 2,
      timeoutMs: 30 * 60 * 1000,
      run: runAssemblyAgent,
    },
  ]

  let initialState: PipelineState
  let nodes = allNodes

  if (input.resumeFrom) {
    // Restore state from checkpoint
    initialState = input.resumeFrom.checkpointState as PipelineState
    // Ensure refs and meta exist (checkpoint might have lean state)
    initialState.refs = initialState.refs || {}
    initialState.meta = initialState.meta || {}

    // Filter out completed nodes
    const completedSet = new Set(input.resumeFrom.completedNodes)
    nodes = allNodes.filter((n) => !completedSet.has(n.key))
  } else {
    initialState = createInitialPipelineState({
      projectId: input.projectId,
      userId: input.userId,
      pipelineRunId: input.pipelineRunId,
      script: input.script,
      artStyle: input.artStyle,
      aspectRatio: input.aspectRatio,
      config: input.config,
    })
  }

  if (nodes.length === 0) {
    return initialState
  }

  return await runPipelineGraph({
    runId: input.runId,
    projectId: input.projectId,
    userId: input.userId,
    state: initialState,
    nodes,
  })
}
