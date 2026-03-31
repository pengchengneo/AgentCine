import { NextRequest, NextResponse } from 'next/server'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { autoAssembleFromEpisode } from '@/features/video-editor/utils/auto-assembly'

/**
 * POST /api/novel-promotion/[projectId]/editor/auto-assemble
 * 一键成片: 自动从 episode 的 panels + voiceLines 装配编辑器项目
 */
export const POST = apiHandler(async (
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) => {
    const { projectId } = await params

    const authResult = await requireProjectAuthLight(projectId)
    if (isErrorResponse(authResult)) return authResult

    const body = await request.json()
    const { episodeId } = body

    if (!episodeId) {
        throw new ApiError('INVALID_PARAMS')
    }

    const project = await autoAssembleFromEpisode(episodeId)

    return NextResponse.json({
        success: true,
        project
    })
})
