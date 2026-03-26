// src/app/api/novel-promotion/[projectId]/pipeline/start/route.ts

import { NextRequest } from 'next/server'
import { requireProjectAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { startPipeline } from '@/lib/agent-pipeline'

export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params
  const body = await request.json().catch(() => ({}))

  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult
  const { session, project } = authResult

  if (project.mode !== 'novel-promotion') {
    throw new ApiError('INVALID_PARAMS')
  }

  const script = typeof body?.script === 'string' ? body.script : ''
  if (!script.trim()) {
    throw new ApiError('INVALID_PARAMS', { message: 'script is required' })
  }

  const result = await startPipeline({
    userId: session.user.id,
    projectId,
    script,
    config: body?.config,
  })

  return Response.json({
    success: true,
    pipelineRunId: result.pipelineRunId,
    runId: result.runId,
  })
})
