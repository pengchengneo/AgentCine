// src/lib/agent-pipeline/quality/scoring.ts

export function shouldAutoPass(score: number, threshold: number): boolean {
  return score >= threshold
}

export function computePhaseScore(itemScores: number[]): number {
  if (itemScores.length === 0) return 1.0
  const sum = itemScores.reduce((acc, s) => acc + s, 0)
  return sum / itemScores.length
}
