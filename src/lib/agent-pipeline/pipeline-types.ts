// Shared types for pipeline status — used by both server (service) and client (hook/components)

export type TokenUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export type StepInfo = {
  stepKey: string
  stepTitle: string
  status: string
  stepIndex: number
  startedAt: string | null
  finishedAt: string | null
  lastErrorMessage: string | null
  usage: TokenUsage
}

export type ActiveTaskInfo = {
  type: string
  targetType: string
  progress: number
  status: string
  model: string | null
}

export type PipelineLogEntry = {
  ts: string
  agent: string
  message: string
  model?: string
  detail?: string
}
