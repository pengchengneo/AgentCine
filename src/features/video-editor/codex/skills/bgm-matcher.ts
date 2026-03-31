import { VideoEditorProject } from '../../types/editor.types'
import { EditingSkill } from '../skills'

interface BgmCandidate {
    id: string
    name: string
    category: string
    mood: string
    duration: number
    audioUrl: string
}

/**
 * BGM Matcher — 作为 Codex skill 使用
 * 分析 screenplay 情绪并从候选列表中匹配最佳 BGM
 */
export const bgmMatcher: EditingSkill = {
    name: 'matchBgm',
    description: '根据场景情绪自动匹配最合适的 BGM。分析时间轴中各片段的描述信息，选择与情绪最匹配的 BGM 添加到轨道。',
    parameters: {
        bgmId: { type: 'string', description: '候选 BGM 的 ID', required: true },
        startFrame: { type: 'number', description: '起始帧', required: true },
        durationInFrames: { type: 'number', description: '播放帧数', required: true },
        volume: { type: 'number', description: '音量 0-1', required: false },
        fadeIn: { type: 'number', description: '淡入帧数', required: false },
        fadeOut: { type: 'number', description: '淡出帧数', required: false },
    },
    execute(project, params) {
        // This skill is a specialized version of addBgm
        // The LLM will choose the bgmId from the availableBgm list
        // and the audioUrl will be resolved before execution
        const audioUrl = params._resolvedAudioUrl as string || ''
        const newBgm = {
            id: `bgm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            src: audioUrl,
            startFrame: params.startFrame as number,
            durationInFrames: params.durationInFrames as number,
            volume: (params.volume as number) ?? 0.5,
            fadeIn: params.fadeIn as number | undefined,
            fadeOut: params.fadeOut as number | undefined,
        }
        return { ...project, bgmTrack: [...project.bgmTrack, newBgm] }
    },
}

/**
 * Mood-to-category mapping for local (non-LLM) matching
 */
const MOOD_KEYWORDS: Record<string, string[]> = {
    action: ['战斗', '打斗', '追逐', '紧张', '冲突', 'fight', 'battle', 'chase', 'tense'],
    emotional: ['感动', '温馨', '离别', '思念', '爱情', 'love', 'touching', 'warm', 'farewell'],
    comedy: ['搞笑', '滑稽', '轻松', '有趣', 'funny', 'comedy', 'humor', 'lighthearted'],
    epic: ['史诗', '宏大', '壮观', '英雄', 'epic', 'grand', 'heroic', 'majestic'],
    suspense: ['悬疑', '恐怖', '神秘', '阴暗', 'suspense', 'horror', 'mystery', 'dark'],
    peaceful: ['平静', '日常', '宁静', '放松', 'calm', 'peaceful', 'relaxing', 'gentle'],
}

/**
 * Simple local mood detection from text
 */
export function detectMood(text: string): string {
    let bestCategory = 'peaceful'
    let bestScore = 0

    for (const [category, keywords] of Object.entries(MOOD_KEYWORDS)) {
        const score = keywords.reduce((count, kw) => {
            return count + (text.toLowerCase().includes(kw.toLowerCase()) ? 1 : 0)
        }, 0)
        if (score > bestScore) {
            bestScore = score
            bestCategory = category
        }
    }

    return bestCategory
}

/**
 * Find best BGM match from candidates for a given mood
 */
export function findBestBgm(
    candidates: BgmCandidate[],
    targetMood: string,
    targetDuration?: number
): BgmCandidate | null {
    // Filter by category first
    const categoryMatches = candidates.filter(b => b.category === targetMood)
    const pool = categoryMatches.length > 0 ? categoryMatches : candidates

    if (pool.length === 0) return null

    // If target duration specified, prefer closest match
    if (targetDuration) {
        const sorted = [...pool].sort((a, b) =>
            Math.abs(a.duration - targetDuration) - Math.abs(b.duration - targetDuration)
        )
        return sorted[0]
    }

    return pool[0]
}
