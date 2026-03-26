import { safeParseJsonObject } from '@/lib/json-repair'

export type ConsistencyCheckResult = {
  characterScore: number
  sceneScore: number
  styleScore: number
  overallScore: number
  issues: string[]
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

export function parseConsistencyResponse(response: string): ConsistencyCheckResult {
  try {
    const parsed = safeParseJsonObject(response)
    return {
      characterScore: clamp(Number(parsed.characterScore) || 0, 0, 1),
      sceneScore: clamp(Number(parsed.sceneScore) || 0, 0, 1),
      styleScore: clamp(Number(parsed.styleScore) || 0, 0, 1),
      overallScore: clamp(Number(parsed.overallScore) || 0, 0, 1),
      issues: Array.isArray(parsed.issues)
        ? parsed.issues.filter((i: unknown) => typeof i === 'string')
        : [],
    }
  } catch {
    return {
      characterScore: 0,
      sceneScore: 0,
      styleScore: 0,
      overallScore: 0,
      issues: ['Failed to parse consistency check response'],
    }
  }
}

export type ConsistencyDecision = 'pass' | 'retry' | 'manual_review'

export function makeDecision(
  score: number,
  threshold: number,
  currentRetry: number,
  maxRetries: number,
): ConsistencyDecision {
  if (score >= threshold) return 'pass'
  if (currentRetry >= maxRetries) return 'manual_review'
  return 'retry'
}

export const CONSISTENCY_CHECK_PROMPT = `You are an image quality inspector for a comic/manga production pipeline.

Compare the generated image against the reference description and reference images provided.

Score each dimension from 0.0 to 1.0:
- characterScore: Does the character match the reference appearance (hair, outfit, body type)?
- sceneScore: Does the background/environment match the scene description?
- styleScore: Is the art style consistent with the target style?
- overallScore: Weighted average (character 0.5, scene 0.3, style 0.2)

Respond in JSON only:
{
  "characterScore": <float>,
  "sceneScore": <float>,
  "styleScore": <float>,
  "overallScore": <float>,
  "issues": ["list of specific issues found"]
}`
