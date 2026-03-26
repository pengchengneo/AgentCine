// src/lib/agent-pipeline/pipeline-log.ts

import { prisma } from '@/lib/prisma'

export type PipelineLogEntry = {
  ts: string
  agent: string
  message: string
  model?: string
  detail?: string
}

export async function appendPipelineLog(
  pipelineRunId: string,
  entry: Omit<PipelineLogEntry, 'ts'>,
): Promise<void> {
  const run = await prisma.pipelineRun.findUnique({
    where: { id: pipelineRunId },
    select: { logs: true },
  })
  const existing = Array.isArray(run?.logs) ? (run.logs as PipelineLogEntry[]) : []
  const newEntry: PipelineLogEntry = {
    ts: new Date().toISOString(),
    ...entry,
  }
  existing.push(newEntry)
  await prisma.pipelineRun.update({
    where: { id: pipelineRunId },
    data: { logs: existing as never },
  })
}
