// src/lib/agent-pipeline/graph/state.ts

import type { GraphExecutorState } from '@/lib/run-runtime/graph-executor'
import type { PipelineConfig, PipelinePhase, QualityCheckResult } from '../types'
import type { CharacterAssetRef, LocationAssetRef, StyleProfileData } from '../asset-layer/types'

export type PipelineState = GraphExecutorState & {
  // Input
  projectId: string
  userId: string
  pipelineRunId: string
  script: string
  artStyle: string
  aspectRatio: string
  config: PipelineConfig

  // ScriptAgent output
  characters: CharacterAssetRef[]
  locations: LocationAssetRef[]
  episodeIds: string[]

  // ArtDirectorAgent output
  styleProfile: StyleProfileData | null
  characterAssetsLocked: boolean
  locationAssetsLocked: boolean

  // StoryboardAgent output
  storyboardComplete: boolean
  panelCount: number

  // ProducerAgent control
  currentPhase: PipelinePhase
  qualityGates: QualityCheckResult[]
  error: string | null
}

export function createInitialPipelineState(input: {
  projectId: string
  userId: string
  pipelineRunId: string
  script: string
  artStyle: string
  aspectRatio: string
  config: PipelineConfig
}): PipelineState {
  return {
    refs: {},
    meta: {},
    projectId: input.projectId,
    userId: input.userId,
    pipelineRunId: input.pipelineRunId,
    script: input.script,
    artStyle: input.artStyle,
    aspectRatio: input.aspectRatio,
    config: input.config,
    characters: [],
    locations: [],
    episodeIds: [],
    styleProfile: null,
    characterAssetsLocked: false,
    locationAssetsLocked: false,
    storyboardComplete: false,
    panelCount: 0,
    currentPhase: 'script',
    qualityGates: [],
    error: null,
  }
}
