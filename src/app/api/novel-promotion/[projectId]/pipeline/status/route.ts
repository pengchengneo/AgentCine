// src/app/api/novel-promotion/[projectId]/pipeline/status/route.ts

import { NextRequest } from 'next/server'
import { requireProjectAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'
import { prisma } from '@/lib/prisma'
import { getReviewSummary } from '@/lib/agent-pipeline/review/review-service'

export const GET = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params

  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult

  const pipelineRun = await prisma.pipelineRun.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  })

  if (!pipelineRun) {
    return Response.json({ exists: false })
  }

  const reviewSummary = await getReviewSummary(pipelineRun.id)

  return Response.json({
    exists: true,
    pipelineRunId: pipelineRun.id,
    status: pipelineRun.status,
    currentPhase: pipelineRun.currentPhase,
    startedAt: pipelineRun.startedAt,
    completedAt: pipelineRun.completedAt,
    errorMessage: pipelineRun.errorMessage,
    review: reviewSummary,
  })
})
