import { NextRequest } from 'next/server'
import { requireProjectAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/prisma'
import { PIPELINE_STATUS } from '@/lib/agent-pipeline/types'
import { resumePipeline } from '@/lib/agent-pipeline'

export const POST = apiHandler(async (
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params

  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const pipelineRun = await prisma.pipelineRun.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  })

  if (!pipelineRun) {
    throw new ApiError('NOT_FOUND', { message: 'No pipeline run found' })
  }

  if (pipelineRun.status !== PIPELINE_STATUS.PAUSED) {
    throw new ApiError('INVALID_PARAMS', { message: 'Pipeline is not paused' })
  }

  const result = await resumePipeline({
    userId: session.user.id,
    projectId,
    pipelineRunId: pipelineRun.id,
  })

  return Response.json(result)
})
