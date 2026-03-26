// src/lib/agent-pipeline/pipeline-log.ts

import { prisma } from '@/lib/prisma'
import type { PipelineLogEntry } from './pipeline-types'

export type { PipelineLogEntry }

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
