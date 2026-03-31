import { readFileSync } from 'fs'
import { join } from 'path'
import { VideoEditorProject } from '../types/editor.types'
import { CODEX_SKILLS, getSkillsDescription } from './skills'
import { executeAiTextStep } from '@/lib/ai-runtime'
import { safeParseJsonArray } from '@/lib/json-repair'

// ========================================
// Codex Agent Types
// ========================================

export interface CodexInput {
    userId: string
    model: string
    projectId?: string
    project: VideoEditorProject
    screenplay: string
    availableBgm: Array<{
        id: string
        name: string
        category: string
        mood: string
        duration: number
        audioUrl: string
    }>
    panelMetadata: Array<{
        clipIndex: number
        shotType?: string
        cameraMove?: string
        description?: string
    }>
}

export interface SkillCall {
    skill: string
    params: Record<string, unknown>
    reason: string
}

export interface CodexOutput {
    skillCalls: SkillCall[]
    appliedProject: VideoEditorProject
    errors: string[]
}

// ========================================
// Prompt Builder
// ========================================

let cachedPromptTemplate: string | null = null

function getPromptTemplate(): string {
    if (cachedPromptTemplate) return cachedPromptTemplate
    cachedPromptTemplate = readFileSync(
        join(__dirname, 'prompts', 'auto-edit.txt'),
        'utf-8'
    )
    return cachedPromptTemplate
}

function buildCodexPrompt(input: CodexInput): string {
    const template = getPromptTemplate()
    const systemPrompt = template.replace('{{SKILLS_DESCRIPTION}}', getSkillsDescription())

    const userContent = JSON.stringify({
        project: {
            timeline: input.project.timeline.map((clip, i) => ({
                index: i,
                id: clip.id,
                durationInFrames: clip.durationInFrames,
                transition: clip.transition,
                hasAudio: !!clip.attachment?.audio,
                hasSubtitle: !!clip.attachment?.subtitle,
                description: clip.metadata?.description,
            })),
            bgmTrack: input.project.bgmTrack,
            config: input.project.config,
        },
        screenplay: input.screenplay,
        panelMetadata: input.panelMetadata,
        availableBgm: input.availableBgm,
    }, null, 2)

    return `${systemPrompt}\n\n---\n\n${userContent}`
}

// ========================================
// Codex Agent
// ========================================

export async function runCodexAgent(input: CodexInput): Promise<CodexOutput> {
    const promptContent = buildCodexPrompt(input)

    const completion = await executeAiTextStep({
        userId: input.userId,
        model: input.model,
        messages: [{ role: 'user', content: promptContent }],
        projectId: input.projectId,
        action: 'codex-auto-edit',
        meta: {
            stepId: 'codex-auto-edit',
            stepTitle: 'Codex Auto Edit',
            stepIndex: 1,
            stepTotal: 1,
        },
        temperature: 0.7,
    })

    const skillCalls = safeParseJsonArray(completion.text, 'skillCalls') as unknown as SkillCall[]

    // Execute skill calls sequentially
    let currentProject = input.project
    const errors: string[] = []

    for (const call of skillCalls) {
        const skill = CODEX_SKILLS[call.skill]
        if (!skill) {
            errors.push(`Unknown skill: ${call.skill}`)
            continue
        }
        try {
            currentProject = skill.execute(currentProject, call.params)
        } catch (e) {
            errors.push(`Skill ${call.skill} failed: ${(e as Error).message}`)
        }
    }

    return {
        skillCalls,
        appliedProject: currentProject,
        errors,
    }
}
