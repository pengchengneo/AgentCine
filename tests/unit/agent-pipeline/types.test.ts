import { describe, expect, it } from 'vitest'
import {
  ASSET_STATUS,
  DEFAULT_PIPELINE_CONFIG,
  PIPELINE_MODE,
  PIPELINE_PHASE,
  PIPELINE_STATUS,
  REVIEW_MODE,
  REVIEW_STATUS,
} from '@/lib/agent-pipeline/types'

describe('agent-pipeline types', () => {
  it('ASSET_STATUS has draft and locked', () => {
    expect(ASSET_STATUS.DRAFT).toBe('draft')
    expect(ASSET_STATUS.LOCKED).toBe('locked')
  })

  it('PIPELINE_STATUS includes all states', () => {
    expect(Object.values(PIPELINE_STATUS)).toEqual([
      'queued', 'running', 'paused', 'review', 'completed', 'failed',
    ])
  })

  it('PIPELINE_PHASE includes first-phase stages', () => {
    expect(PIPELINE_PHASE.SCRIPT).toBe('script')
    expect(PIPELINE_PHASE.ART).toBe('art')
    expect(PIPELINE_PHASE.STORYBOARD).toBe('storyboard')
    expect(PIPELINE_PHASE.REVIEW).toBe('review')
  })

  it('REVIEW_STATUS includes all states', () => {
    expect(Object.values(REVIEW_STATUS)).toEqual([
      'auto_passed', 'pending', 'approved', 'rejected', 'retrying',
    ])
  })

  it('DEFAULT_PIPELINE_CONFIG has correct defaults', () => {
    expect(DEFAULT_PIPELINE_CONFIG.consistencyThreshold).toBe(0.7)
    expect(DEFAULT_PIPELINE_CONFIG.maxRetriesPerItem).toBe(3)
    expect(DEFAULT_PIPELINE_CONFIG.reviewMode).toBe('standard')
  })

  it('PIPELINE_MODE has manual and agent', () => {
    expect(PIPELINE_MODE.MANUAL).toBe('manual')
    expect(PIPELINE_MODE.AGENT).toBe('agent')
  })
})
