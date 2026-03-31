import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { createScopedLogger } from '@/lib/logging/core'
import { uploadObject, getSignedObjectUrl } from '@/lib/storage'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

const logger = createScopedLogger({ module: 'render-api' })

/**
 * POST /api/novel-promotion/[projectId]/editor/render
 * 启动视频渲染
 */
export const POST = apiHandler(async (
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) => {
    const { projectId } = await params

    const authResult = await requireProjectAuthLight(projectId)
    if (isErrorResponse(authResult)) return authResult

    const body = await request.json()
    const { editorProjectId, episodeId, format = 'mp4', quality = 'high' } = body

    if (!editorProjectId && !episodeId) {
        throw new ApiError('INVALID_PARAMS')
    }

    // Load editor project by id or episodeId
    const editorProject = editorProjectId
        ? await prisma.videoEditorProject.findUnique({ where: { id: editorProjectId } })
        : await prisma.videoEditorProject.findUnique({ where: { episodeId } })

    if (!editorProject) {
        throw new ApiError('NOT_FOUND')
    }

    // Already rendering
    if (editorProject.renderStatus === 'rendering') {
        return NextResponse.json({
            status: 'rendering',
            message: 'Render already in progress'
        }, { status: 409 })
    }

    // Mark as rendering
    await prisma.videoEditorProject.update({
        where: { id: editorProject.id },
        data: {
            renderStatus: 'pending',
            renderTaskId: `render_${Date.now()}`,
            outputUrl: null
        }
    })

    // Start rendering in background (fire-and-forget)
    executeRender(editorProject.id, format, quality).catch(err => {
        logger.error('Background render failed:', err)
    })

    return NextResponse.json({
        status: 'pending',
        editorProjectId: editorProject.id,
        message: 'Render started'
    })
})

/**
 * GET /api/novel-promotion/[projectId]/editor/render
 * 查询渲染状态
 */
export const GET = apiHandler(async (
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) => {
    const { projectId } = await params

    const authResult = await requireProjectAuthLight(projectId)
    if (isErrorResponse(authResult)) return authResult

    const editorProjectId = request.nextUrl.searchParams.get('id')
    const episodeId = request.nextUrl.searchParams.get('episodeId')

    if (!editorProjectId && !episodeId) {
        throw new ApiError('INVALID_PARAMS')
    }

    const editorProject = editorProjectId
        ? await prisma.videoEditorProject.findUnique({
            where: { id: editorProjectId },
            select: { renderStatus: true, renderTaskId: true, outputUrl: true }
        })
        : await prisma.videoEditorProject.findUnique({
            where: { episodeId: episodeId! },
            select: { renderStatus: true, renderTaskId: true, outputUrl: true }
        })

    if (!editorProject) {
        throw new ApiError('NOT_FOUND')
    }

    // If completed and has storage key, generate signed URL
    let outputUrl = editorProject.outputUrl
    if (editorProject.renderStatus === 'completed' && outputUrl && !outputUrl.startsWith('http')) {
        outputUrl = await getSignedObjectUrl(outputUrl, 3600)
    }

    return NextResponse.json({
        status: editorProject.renderStatus || 'idle',
        taskId: editorProject.renderTaskId,
        outputUrl
    })
})

/**
 * Background render execution
 */
async function executeRender(
    editorProjectId: string,
    format: 'mp4' | 'webm',
    quality: 'draft' | 'high'
) {
    const tmpDir = path.join(os.tmpdir(), `remotion-render-${editorProjectId}`)

    try {
        await prisma.videoEditorProject.update({
            where: { id: editorProjectId },
            data: { renderStatus: 'rendering' }
        })

        const editorProject = await prisma.videoEditorProject.findUnique({
            where: { id: editorProjectId }
        })

        if (!editorProject) throw new Error('Editor project not found')

        const projectData = JSON.parse(editorProject.projectData)

        // Dynamic imports for server-side Remotion
        const { bundle } = await import('@remotion/bundler')
        const { renderMedia, selectComposition } = await import('@remotion/renderer')
        const { calculateTimelineDuration } = await import('@/features/video-editor/utils/time-utils')

        // Resolve media URLs to signed URLs for rendering
        const resolvedProjectData = await resolveMediaUrls(projectData)

        // Bundle the Remotion composition
        const entryPoint = path.resolve(
            process.cwd(),
            'src/features/video-editor/remotion/entry.tsx'
        )

        logger.info(`Bundling composition from ${entryPoint}`)
        const bundleLocation = await bundle({
            entryPoint,
            onProgress: (progress: number) => {
                logger.info(`Bundle progress: ${Math.round(progress * 100)}%`)
            }
        })

        // Calculate total duration
        const totalDuration = calculateTimelineDuration(resolvedProjectData.timeline)

        // Select and configure the composition
        const composition = await selectComposition({
            serveUrl: bundleLocation,
            id: 'AgentCineVideo',
            inputProps: {
                clips: resolvedProjectData.timeline,
                bgmTrack: resolvedProjectData.bgmTrack || [],
                config: resolvedProjectData.config
            }
        })

        // Override duration with actual timeline duration
        composition.durationInFrames = totalDuration || 300
        composition.fps = resolvedProjectData.config?.fps || 30
        composition.width = resolvedProjectData.config?.width || 1920
        composition.height = resolvedProjectData.config?.height || 1080

        // Render
        await fs.mkdir(tmpDir, { recursive: true })
        const outputPath = path.join(tmpDir, `output.${format}`)

        logger.info(`Starting render: ${totalDuration} frames @ ${composition.fps}fps`)

        await renderMedia({
            composition,
            serveUrl: bundleLocation,
            codec: format === 'mp4' ? 'h264' : 'vp8',
            outputLocation: outputPath,
            inputProps: {
                clips: resolvedProjectData.timeline,
                bgmTrack: resolvedProjectData.bgmTrack || [],
                config: resolvedProjectData.config
            },
            ...(quality === 'draft' ? { crf: 28 } : { crf: 18 })
        })

        // Upload to storage
        const videoBuffer = await fs.readFile(outputPath)
        const storageKey = `renders/${editorProjectId}/output.${format}`
        const contentType = format === 'mp4' ? 'video/mp4' : 'video/webm'

        await uploadObject(videoBuffer, storageKey, 3, contentType)

        // Update DB with completed status
        await prisma.videoEditorProject.update({
            where: { id: editorProjectId },
            data: {
                renderStatus: 'completed',
                outputUrl: storageKey
            }
        })

        logger.info(`Render completed for ${editorProjectId}`)
    } catch (error) {
        logger.error(`Render failed for ${editorProjectId}:`, error)

        await prisma.videoEditorProject.update({
            where: { id: editorProjectId },
            data: {
                renderStatus: 'failed',
                outputUrl: null
            }
        })
    } finally {
        // Cleanup temp files
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => { })
    }
}

/**
 * Resolve storage keys in project data to signed URLs for Remotion rendering
 */
async function resolveMediaUrls(projectData: Record<string, unknown>) {
    const resolved = JSON.parse(JSON.stringify(projectData))

    // Resolve clip video URLs
    if (Array.isArray(resolved.timeline)) {
        for (const clip of resolved.timeline) {
            if (clip.src && !clip.src.startsWith('http')) {
                clip.src = await getSignedObjectUrl(clip.src, 7200)
            }
            if (clip.attachment?.audio?.src && !clip.attachment.audio.src.startsWith('http')) {
                clip.attachment.audio.src = await getSignedObjectUrl(clip.attachment.audio.src, 7200)
            }
        }
    }

    // Resolve BGM URLs
    if (Array.isArray(resolved.bgmTrack)) {
        for (const bgm of resolved.bgmTrack) {
            if (bgm.src && !bgm.src.startsWith('http')) {
                bgm.src = await getSignedObjectUrl(bgm.src, 7200)
            }
        }
    }

    return resolved
}
