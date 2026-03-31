import { VideoEditorProject, VideoClip, BgmClip, ClipTransition } from '../types/editor.types'

// ========================================
// Codex Editing Skills
// ========================================

export interface EditingSkill {
    name: string
    description: string
    parameters: Record<string, { type: string; description: string; required?: boolean }>
    execute: (project: VideoEditorProject, params: Record<string, unknown>) => VideoEditorProject
}

// ---- setTransition ----

const setTransition: EditingSkill = {
    name: 'setTransition',
    description: '设置两个片段之间的转场效果。支持 dissolve(溶解)、fade(淡入淡出)、slide(滑动)、none(无)。',
    parameters: {
        clipIndex: { type: 'number', description: '目标片段索引 (0-based)', required: true },
        type: { type: 'string', description: '转场类型: none | dissolve | fade | slide', required: true },
        durationInFrames: { type: 'number', description: '转场时长(帧数)，默认 15', required: false },
    },
    execute(project, params) {
        const clipIndex = params.clipIndex as number
        const type = params.type as ClipTransition['type']
        const durationInFrames = (params.durationInFrames as number) ?? 15

        if (clipIndex < 0 || clipIndex >= project.timeline.length) return project

        const timeline = project.timeline.map((clip, i) => {
            if (i !== clipIndex) return clip
            return {
                ...clip,
                transition: type === 'none' ? undefined : { type, durationInFrames },
            }
        })
        return { ...project, timeline }
    },
}

// ---- adjustClipDuration ----

const adjustClipDuration: EditingSkill = {
    name: 'adjustClipDuration',
    description: '调整指定片段的播放时长(帧数)。',
    parameters: {
        clipIndex: { type: 'number', description: '目标片段索引', required: true },
        durationInFrames: { type: 'number', description: '新的播放时长(帧数)', required: true },
    },
    execute(project, params) {
        const clipIndex = params.clipIndex as number
        const durationInFrames = params.durationInFrames as number

        if (clipIndex < 0 || clipIndex >= project.timeline.length) return project
        if (durationInFrames <= 0) return project

        const timeline = project.timeline.map((clip, i) => {
            if (i !== clipIndex) return clip
            return { ...clip, durationInFrames }
        })
        return { ...project, timeline }
    },
}

// ---- addBgm ----

const addBgm: EditingSkill = {
    name: 'addBgm',
    description: '添加一段背景音乐到 BGM 轨道。需要指定音频 URL、起始帧、时长和音量。',
    parameters: {
        src: { type: 'string', description: 'BGM 音频 URL', required: true },
        startFrame: { type: 'number', description: '起始帧 (绝对定位)', required: true },
        durationInFrames: { type: 'number', description: '播放时长(帧数)', required: true },
        volume: { type: 'number', description: '音量 0-1，默认 0.5', required: false },
        fadeIn: { type: 'number', description: '淡入帧数', required: false },
        fadeOut: { type: 'number', description: '淡出帧数', required: false },
    },
    execute(project, params) {
        const newBgm: BgmClip = {
            id: `bgm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            src: params.src as string,
            startFrame: params.startFrame as number,
            durationInFrames: params.durationInFrames as number,
            volume: (params.volume as number) ?? 0.5,
            fadeIn: params.fadeIn as number | undefined,
            fadeOut: params.fadeOut as number | undefined,
        }
        return { ...project, bgmTrack: [...project.bgmTrack, newBgm] }
    },
}

// ---- setSubtitleStyle ----

const setSubtitleStyle: EditingSkill = {
    name: 'setSubtitleStyle',
    description: '设置指定片段的字幕样式。',
    parameters: {
        clipIndex: { type: 'number', description: '目标片段索引', required: true },
        style: { type: 'string', description: '字幕样式: default | cinematic', required: true },
    },
    execute(project, params) {
        const clipIndex = params.clipIndex as number
        const style = params.style as 'default' | 'cinematic'

        if (clipIndex < 0 || clipIndex >= project.timeline.length) return project

        const timeline = project.timeline.map((clip, i) => {
            if (i !== clipIndex) return clip
            if (!clip.attachment?.subtitle) return clip
            return {
                ...clip,
                attachment: {
                    ...clip.attachment,
                    subtitle: { ...clip.attachment.subtitle, style },
                },
            }
        })
        return { ...project, timeline }
    },
}

// ---- reorderClips ----

const reorderClips: EditingSkill = {
    name: 'reorderClips',
    description: '重新排列时间轴上的片段。提供新的索引顺序数组。',
    parameters: {
        order: { type: 'number[]', description: '新的索引顺序，例如 [2, 0, 1, 3] 表示将第3个片段移到最前', required: true },
    },
    execute(project, params) {
        const order = params.order as number[]
        if (order.length !== project.timeline.length) return project

        const timeline = order.map(i => project.timeline[i]).filter(Boolean)
        if (timeline.length !== project.timeline.length) return project

        return { ...project, timeline }
    },
}

// ---- splitClip ----

const splitClip: EditingSkill = {
    name: 'splitClip',
    description: '在指定帧位置将一个片段拆分为两个。',
    parameters: {
        clipIndex: { type: 'number', description: '目标片段索引', required: true },
        splitAtFrame: { type: 'number', description: '拆分位置(帧数，相对于片段开头)', required: true },
    },
    execute(project, params) {
        const clipIndex = params.clipIndex as number
        const splitAtFrame = params.splitAtFrame as number
        const clip = project.timeline[clipIndex]

        if (!clip) return project
        if (splitAtFrame <= 0 || splitAtFrame >= clip.durationInFrames) return project

        const clip1: VideoClip = {
            ...clip,
            id: `${clip.id}_a`,
            durationInFrames: splitAtFrame,
            transition: undefined,
        }
        const clip2: VideoClip = {
            ...clip,
            id: `${clip.id}_b`,
            durationInFrames: clip.durationInFrames - splitAtFrame,
            trim: clip.trim
                ? { from: clip.trim.from + splitAtFrame, to: clip.trim.to }
                : undefined,
            attachment: undefined,
        }

        const timeline = [...project.timeline]
        timeline.splice(clipIndex, 1, clip1, clip2)
        return { ...project, timeline }
    },
}

// ---- mergeClips ----

const mergeClips: EditingSkill = {
    name: 'mergeClips',
    description: '合并两个相邻的片段为一个，保留第一个片段的属性。',
    parameters: {
        clipIndex: { type: 'number', description: '第一个片段的索引（会与 clipIndex+1 合并）', required: true },
    },
    execute(project, params) {
        const clipIndex = params.clipIndex as number
        const clip1 = project.timeline[clipIndex]
        const clip2 = project.timeline[clipIndex + 1]

        if (!clip1 || !clip2) return project

        const merged: VideoClip = {
            ...clip1,
            durationInFrames: clip1.durationInFrames + clip2.durationInFrames,
            transition: clip2.transition,
        }

        const timeline = [...project.timeline]
        timeline.splice(clipIndex, 2, merged)
        return { ...project, timeline }
    },
}

// ---- setClipVolume ----

const setClipVolume: EditingSkill = {
    name: 'setClipVolume',
    description: '调整指定片段的配音音量，或调整 BGM 片段的音量。',
    parameters: {
        clipIndex: { type: 'number', description: '目标片段索引（视频轨）或 BGM 轨索引', required: true },
        volume: { type: 'number', description: '音量 0-1', required: true },
        track: { type: 'string', description: '轨道: video | bgm，默认 video', required: false },
    },
    execute(project, params) {
        const clipIndex = params.clipIndex as number
        const volume = params.volume as number
        const track = (params.track as string) ?? 'video'

        if (track === 'bgm') {
            const bgm = project.bgmTrack[clipIndex]
            if (!bgm) return project
            const bgmTrack = project.bgmTrack.map((b, i) =>
                i === clipIndex ? { ...b, volume: Math.max(0, Math.min(1, volume)) } : b
            )
            return { ...project, bgmTrack }
        }

        const clip = project.timeline[clipIndex]
        if (!clip?.attachment?.audio) return project

        const timeline = project.timeline.map((c, i) => {
            if (i !== clipIndex) return c
            return {
                ...c,
                attachment: {
                    ...c.attachment!,
                    audio: { ...c.attachment!.audio!, volume: Math.max(0, Math.min(1, volume)) },
                },
            }
        })
        return { ...project, timeline }
    },
}

// ---- removeClip ----

const removeClip: EditingSkill = {
    name: 'removeClip',
    description: '从时间轴中移除指定片段。',
    parameters: {
        clipIndex: { type: 'number', description: '目标片段索引', required: true },
    },
    execute(project, params) {
        const clipIndex = params.clipIndex as number
        if (clipIndex < 0 || clipIndex >= project.timeline.length) return project

        const timeline = project.timeline.filter((_, i) => i !== clipIndex)
        return { ...project, timeline }
    },
}

// ========================================
// Skills Registry
// ========================================

export const CODEX_SKILLS: Record<string, EditingSkill> = {
    setTransition,
    adjustClipDuration,
    addBgm,
    setSubtitleStyle,
    reorderClips,
    splitClip,
    mergeClips,
    setClipVolume,
    removeClip,
}

/**
 * Generate a human-readable description of all available skills for LLM prompts.
 */
export function getSkillsDescription(): string {
    return Object.values(CODEX_SKILLS)
        .map(skill => {
            const paramLines = Object.entries(skill.parameters)
                .map(([k, v]) => `    - ${k} (${v.type}${v.required ? ', required' : ''}): ${v.description}`)
                .join('\n')
            return `## ${skill.name}\n${skill.description}\nParameters:\n${paramLines}`
        })
        .join('\n\n')
}
