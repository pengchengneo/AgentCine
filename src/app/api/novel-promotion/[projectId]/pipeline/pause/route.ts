import { NextRequest } from 'next/server'
import { requireProjectAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/prisma'
import { PIPELINE_STATUS } from '@/lib/agent-pipeline/types'

export const POST = apiHandler(async (
  _request: NextRequest,
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
    throw new ApiError('NOT_FOUND', { message: 'No pipeline run found' })
  }

  if (pipelineRun.status !== PIPELINE_STATUS.RUNNING) {
    throw new ApiError('INVALID_PARAMS', { message: 'Pipeline is not running' })
  }

  await prisma.pipelineRun.update({
    where: { id: pipelineRun.id },
    data: { status: PIPELINE_STATUS.PAUSED },
  })

  return Response.json({ success: true })
})
