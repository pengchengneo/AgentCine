// src/app/api/novel-promotion/[projectId]/pipeline/review/route.ts

import { NextRequest } from 'next/server'
import { requireProjectAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import {
  approveReviewItem,
  rejectReviewItem,
  getReviewItemsByRun,
  enrichReviewItems,
} from '@/lib/agent-pipeline/review/review-service'
import { prisma } from '@/lib/prisma'
import { PIPELINE_STATUS } from '@/lib/agent-pipeline/types'

export const GET = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params
  const { searchParams } = new URL(request.url)
  const phase = searchParams.get('phase') || undefined

  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult

  const pipelineRun = await prisma.pipelineRun.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  })
  if (!pipelineRun) {
    throw new ApiError('NOT_FOUND', { message: 'No pipeline run found' })
  }

  const items = await getReviewItemsByRun(pipelineRun.id, phase)
  const enriched = await enrichReviewItems(items)
  return Response.json({ items: enriched })
})

export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params
  const body = await request.json().catch(() => ({}))

  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult

  const action = body?.action as string
  const reviewItemId = body?.reviewItemId as string

  if (!reviewItemId || !action) {
    throw new ApiError('INVALID_PARAMS', { message: 'reviewItemId and action required' })
  }

  switch (action) {
    case 'approve':
      await approveReviewItem(reviewItemId)
      break
    case 'reject':
      await rejectReviewItem(reviewItemId, body?.feedback || '')
      break
    default:
      throw new ApiError('INVALID_PARAMS', { message: `Unknown action: ${action}` })
  }

  // Check if all items are resolved — if so, mark pipeline as completed
  const pipelineRun = await prisma.pipelineRun.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  })
  if (pipelineRun) {
    const pendingItems = await prisma.pipelineReviewItem.count({
      where: {
        pipelineRunId: pipelineRun.id,
        status: { in: ['pending', 'retrying'] },
      },
    })
    if (pendingItems === 0) {
      await prisma.pipelineRun.update({
        where: { id: pipelineRun.id },
        data: { status: PIPELINE_STATUS.COMPLETED, completedAt: new Date() },
      })
    }
  }

  return Response.json({ success: true })
})
