// src/app/api/novel-promotion/[projectId]/pipeline/status/route.ts

import { NextRequest } from 'next/server'
import { requireProjectAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'
import { getPipelineRunDetail } from '@/lib/agent-pipeline/pipeline-status-service'

export const GET = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params

  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult

  const detail = await getPipelineRunDetail(projectId)
  return Response.json(detail)
})
