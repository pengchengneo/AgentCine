import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { runCodexAgent } from '@/features/video-editor/codex/codex-agent'
import { resolveAnalysisModel } from '@/lib/workers/handlers/resolve-analysis-model'

type Params = { params: Promise<{ projectId: string }> }

/**
 * POST /api/novel-promotion/[projectId]/editor/codex
 * 触发 Codex 自动编排
 */
export const POST = apiHandler(async (
    request: NextRequest,
    { params }: Params
) => {
    const { projectId } = await params
    const authResult = await requireProjectAuthLight(projectId)
    if (isErrorResponse(authResult)) return authResult

    const { session } = authResult
    const userId = session.user.id

    const body = await request.json()
    const { episodeId } = body

    if (!episodeId) {
        throw new ApiError('INVALID_PARAMS', { message: 'Missing episodeId' })
    }

    // 1. Load VideoEditorProject
    const editorProject = await prisma.videoEditorProject.findUnique({
        where: { episodeId },
        include: { episode: true },
    })

    if (!editorProject) {
        throw new ApiError('NOT_FOUND', { message: 'Editor project not found for this episode' })
    }

    const projectData = JSON.parse(editorProject.projectData)

    // 2. Load episode screenplay and panel metadata
    const episode = editorProject.episode
    const clips = await prisma.novelPromotionClip.findMany({
        where: { episodeId },
        include: {
            storyboard: {
                include: { panels: true },
            },
        },
    })

    const screenplay = clips
        .map(c => c.screenplay || c.content)
        .join('\n\n---\n\n')

    const panelMetadata = clips.flatMap((clip, clipIdx) => {
        const panels = clip.storyboard?.panels || []
        return panels.map((panel, panelIdx) => ({
            clipIndex: clipIdx * 10 + panelIdx, // approximate mapping
            shotType: panel.shotType || undefined,
            cameraMove: panel.cameraMove || undefined,
            description: panel.description || undefined,
        }))
    })

    // 3. Load available BGM
    const bgmAssets = await prisma.bgmAsset.findMany({
        where: {
            OR: [
                { isBuiltIn: true },
                { userId },
            ],
        },
    })

    const availableBgm = bgmAssets.map(b => ({
        id: b.id,
        name: b.name,
        category: b.category,
        mood: b.mood,
        duration: b.duration,
        audioUrl: b.audioUrl,
    }))

    // 4. Resolve analysis model
    const novelProject = await prisma.novelPromotionProject.findUnique({
        where: { projectId },
        select: { analysisModel: true },
    })

    const model = await resolveAnalysisModel({
        userId,
        projectAnalysisModel: novelProject?.analysisModel,
    })

    // 5. Run Codex agent
    const result = await runCodexAgent({
        userId,
        model,
        projectId,
        project: projectData,
        screenplay,
        availableBgm,
        panelMetadata,
    })

    // 6. Save optimized project
    await prisma.videoEditorProject.update({
        where: { episodeId },
        data: {
            projectData: JSON.stringify(result.appliedProject),
        },
    })

    // 7. Return result
    return NextResponse.json({
        success: true,
        skillCalls: result.skillCalls,
        errors: result.errors,
        project: result.appliedProject,
    })
})
