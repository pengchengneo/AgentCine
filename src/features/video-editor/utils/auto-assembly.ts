import { prisma } from '@/lib/prisma'
import type { VideoEditorProject, VideoClip, ClipTransition } from '../types/editor.types'
import { createScopedLogger } from '@/lib/logging/core'

const logger = createScopedLogger({ module: 'auto-assembly' })

interface PanelWithMedia {
    id: string
    panelIndex: number
    storyboardId: string
    shotType: string | null
    description: string | null
    duration: number | null
    videoUrl: string | null
    lipSyncVideoUrl: string | null
    imageUrl: string | null
}

interface VoiceLineData {
    id: string
    lineIndex: number
    speaker: string
    content: string
    audioUrl: string | null
    audioDuration: number | null
    matchedPanelId: string | null
    matchedPanelIndex: number | null
    matchedStoryboardId: string | null
}

/**
 * Choose smart transition based on shot type context
 */
function chooseTransition(
    currentShotType: string | null,
    nextShotType: string | null
): ClipTransition | undefined {
    const current = (currentShotType || '').toLowerCase()
    const next = (nextShotType || '').toLowerCase()

    // Action shots: no transition for quick cuts
    const actionTypes = ['action', 'close-up', 'extreme-close-up', 'insert']
    if (actionTypes.some(t => current.includes(t)) || actionTypes.some(t => next.includes(t))) {
        return undefined
    }

    // Scene changes: fade transition
    if (current && next && current !== next) {
        const sceneChangeIndicators = ['establishing', 'wide', 'aerial', 'panoramic']
        if (sceneChangeIndicators.some(t => next.includes(t))) {
            return { type: 'fade', durationInFrames: 20 }
        }
    }

    // Emotional / dialogue shots: dissolve
    const emotionalTypes = ['medium', 'over-shoulder', 'two-shot', 'reaction']
    if (emotionalTypes.some(t => current.includes(t)) || emotionalTypes.some(t => next.includes(t))) {
        return { type: 'dissolve', durationInFrames: 15 }
    }

    // Default: dissolve
    return { type: 'dissolve', durationInFrames: 15 }
}

/**
 * Auto-assemble a VideoEditorProject from an episode's panels and voice lines
 */
export async function autoAssembleFromEpisode(episodeId: string): Promise<VideoEditorProject> {
    // Fetch episode with related data
    const episode = await prisma.novelPromotionEpisode.findUnique({
        where: { id: episodeId },
        include: {
            storyboards: {
                include: {
                    panels: {
                        orderBy: { panelIndex: 'asc' }
                    }
                },
                orderBy: { createdAt: 'asc' }
            },
            voiceLines: {
                orderBy: { lineIndex: 'asc' }
            }
        }
    })

    if (!episode) {
        throw new Error(`Episode not found: ${episodeId}`)
    }

    // Flatten panels from all storyboards, ordered
    const allPanels: PanelWithMedia[] = episode.storyboards
        .flatMap(sb => sb.panels.map(p => ({
            id: p.id,
            panelIndex: p.panelIndex,
            storyboardId: p.storyboardId,
            shotType: p.shotType,
            description: p.description,
            duration: p.duration,
            videoUrl: p.videoUrl,
            lipSyncVideoUrl: p.lipSyncVideoUrl,
            imageUrl: p.imageUrl
        })))

    // Filter to panels with video or image content
    const usablePanels = allPanels.filter(p => p.videoUrl || p.lipSyncVideoUrl || p.imageUrl)

    if (usablePanels.length === 0) {
        logger.warn(`No usable panels found for episode ${episodeId}`)
        // Return empty project
        const emptyProject: VideoEditorProject = {
            id: `editor_${episodeId}_${Date.now()}`,
            episodeId,
            schemaVersion: '1.0',
            config: { fps: 30, width: 1920, height: 1080 },
            timeline: [],
            bgmTrack: []
        }
        await prisma.videoEditorProject.upsert({
            where: { episodeId },
            create: { episodeId, projectData: JSON.stringify(emptyProject) },
            update: { projectData: JSON.stringify(emptyProject), renderStatus: null, outputUrl: null, updatedAt: new Date() }
        })
        return emptyProject
    }

    const voiceLines: VoiceLineData[] = episode.voiceLines.map(vl => ({
        id: vl.id,
        lineIndex: vl.lineIndex,
        speaker: vl.speaker,
        content: vl.content,
        audioUrl: vl.audioUrl,
        audioDuration: vl.audioDuration,
        matchedPanelId: vl.matchedPanelId,
        matchedPanelIndex: vl.matchedPanelIndex,
        matchedStoryboardId: vl.matchedStoryboardId
    }))

    // Build voice line index by panelId for quick lookup
    const voiceByPanelId = new Map<string, VoiceLineData>()
    const voiceByIndex = new Map<number, VoiceLineData>()

    for (const vl of voiceLines) {
        if (vl.matchedPanelId) {
            voiceByPanelId.set(vl.matchedPanelId, vl)
        }
        if (vl.matchedPanelIndex !== null) {
            voiceByIndex.set(vl.matchedPanelIndex, vl)
        }
    }

    // Build timeline clips
    const timeline: VideoClip[] = usablePanels.map((panel, index) => {
        // Prefer lip-sync video > video > image (as static frame)
        const videoSrc = panel.lipSyncVideoUrl || panel.videoUrl || panel.imageUrl!
        const isImageOnly = !panel.videoUrl && !panel.lipSyncVideoUrl

        // Match voice line: by panelId first, then by index
        const matchedVoice = voiceByPanelId.get(panel.id)
            || voiceByIndex.get(panel.panelIndex)
            || voiceLines[index] // fallback: positional

        // Calculate duration: use audio duration if available, else panel duration, else 3s (5s for image-only)
        const defaultDuration = isImageOnly ? 5 : 3
        const durationSeconds = matchedVoice?.audioDuration
            ? matchedVoice.audioDuration / 1000 // audioDuration is in ms
            : (panel.duration || defaultDuration)
        const durationInFrames = Math.max(Math.round(durationSeconds * 30), 30)

        // Smart transition based on shot types
        const nextPanel = usablePanels[index + 1]
        const transition = index < usablePanels.length - 1
            ? chooseTransition(panel.shotType, nextPanel?.shotType || null)
            : undefined

        return {
            id: `clip_${panel.id}`,
            src: videoSrc,
            durationInFrames,
            attachment: {
                audio: matchedVoice?.audioUrl ? {
                    src: matchedVoice.audioUrl,
                    volume: 1,
                    voiceLineId: matchedVoice.id
                } : undefined,
                subtitle: matchedVoice ? {
                    text: matchedVoice.content,
                    style: 'cinematic' as const
                } : undefined
            },
            transition,
            metadata: {
                panelId: panel.id,
                storyboardId: panel.storyboardId,
                description: panel.description || undefined
            }
        }
    })

    const project: VideoEditorProject = {
        id: `editor_${episodeId}_${Date.now()}`,
        episodeId,
        schemaVersion: '1.0',
        config: {
            fps: 30,
            width: 1920,
            height: 1080
        },
        timeline,
        bgmTrack: []
    }

    // Save to database
    await prisma.videoEditorProject.upsert({
        where: { episodeId },
        create: {
            episodeId,
            projectData: JSON.stringify(project)
        },
        update: {
            projectData: JSON.stringify(project),
            renderStatus: null,
            outputUrl: null,
            updatedAt: new Date()
        }
    })

    logger.info(`Auto-assembled project for episode ${episodeId}: ${timeline.length} clips`)

    return project
}
