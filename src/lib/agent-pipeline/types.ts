export const ASSET_STATUS = {
  DRAFT: 'draft',
  LOCKED: 'locked',
} as const

export type AssetStatus = (typeof ASSET_STATUS)[keyof typeof ASSET_STATUS]

export const PIPELINE_STATUS = {
  QUEUED: 'queued',
  RUNNING: 'running',
  PAUSED: 'paused',
  REVIEW: 'review',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

export type PipelineStatus = (typeof PIPELINE_STATUS)[keyof typeof PIPELINE_STATUS]

export const PIPELINE_PHASE = {
  SCRIPT: 'script',
  ART: 'art',
  STORYBOARD: 'storyboard',
  REVIEW: 'review',
} as const

export type PipelinePhase = (typeof PIPELINE_PHASE)[keyof typeof PIPELINE_PHASE]

export const REVIEW_STATUS = {
  AUTO_PASSED: 'auto_passed',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RETRYING: 'retrying',
} as const

export type ReviewStatus = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS]

export const REVIEW_MODE = {
  RELAXED: 'relaxed',
  STANDARD: 'standard',
  STRICT: 'strict',
} as const

export type ReviewMode = (typeof REVIEW_MODE)[keyof typeof REVIEW_MODE]

export const PIPELINE_MODE = {
  MANUAL: 'manual',
  AGENT: 'agent',
} as const

export type PipelineMode = (typeof PIPELINE_MODE)[keyof typeof PIPELINE_MODE]

export type PipelineConfig = {
  reviewMode: ReviewMode
  consistencyThreshold: number // default 0.7
  maxRetriesPerItem: number   // default 3
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  reviewMode: REVIEW_MODE.STANDARD,
  consistencyThreshold: 0.7,
  maxRetriesPerItem: 3,
}

export type QualityCheckResult = {
  phase: PipelinePhase
  passed: boolean
  score: number
  details: string
}
