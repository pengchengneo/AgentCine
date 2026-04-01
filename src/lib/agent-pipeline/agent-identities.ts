import type { AppIconName } from '@/components/ui/icons/registry'

export type AgentSubStep = {
  /** Unique key within the agent */
  key: string
  /** i18n key under 'pipeline' namespace */
  titleKey: string
  /** Fallback title (Chinese) */
  titleFallback: string
}

export type AgentIdentity = {
  /** Pipeline step key matching StepInfo.stepKey */
  stepKey: string
  /** Phase key matching currentPhase */
  phaseKey: string
  /** Icon name from AppIcon registry */
  icon: AppIconName
  /** Tailwind gradient class for avatar background */
  gradientClass: string
  /** Tailwind text color for accents */
  accentColor: string
  /** i18n key for agent name (under 'pipeline' namespace) */
  nameKey: string
  /** i18n key for agent role description */
  roleKey: string
  /** Ordered list of sub-steps for this agent */
  subSteps: AgentSubStep[]
}

export const AGENT_IDENTITIES: AgentIdentity[] = [
  {
    stepKey: 'script_agent',
    phaseKey: 'script',
    icon: 'fileText',
    gradientClass: 'from-violet-600 to-purple-500',
    accentColor: 'text-violet-400',
    nameKey: 'agentScript',
    roleKey: 'agentRoleScript',
    subSteps: [
      { key: 'analyze_novel', titleKey: 'subStepAnalyzeNovel', titleFallback: '分析小说文本' },
      { key: 'extract_characters', titleKey: 'subStepExtractCharacters', titleFallback: '提取角色与场景' },
      { key: 'generate_scripts', titleKey: 'subStepGenerateScripts', titleFallback: '生成分集剧本' },
    ],
  },
  {
    stepKey: 'art_director_agent',
    phaseKey: 'art',
    icon: 'sparkles',
    gradientClass: 'from-amber-500 to-orange-500',
    accentColor: 'text-amber-400',
    nameKey: 'agentArt',
    roleKey: 'agentRoleArt',
    subSteps: [
      { key: 'create_style_profile', titleKey: 'subStepCreateStyleProfile', titleFallback: '创建风格档案' },
      { key: 'generate_characters', titleKey: 'subStepGenerateCharacters', titleFallback: '生成角色立绘' },
      { key: 'generate_locations', titleKey: 'subStepGenerateLocations', titleFallback: '生成场景图' },
    ],
  },
  {
    stepKey: 'storyboard_agent',
    phaseKey: 'storyboard',
    icon: 'layout',
    gradientClass: 'from-cyan-500 to-blue-500',
    accentColor: 'text-cyan-400',
    nameKey: 'agentStoryboard',
    roleKey: 'agentRoleStoryboard',
    subSteps: [
      { key: 'generate_storyboard_scripts', titleKey: 'subStepGenerateStoryboardScripts', titleFallback: '生成分镜脚本' },
      { key: 'batch_generate_panels', titleKey: 'subStepBatchGeneratePanels', titleFallback: '批量生成分镜图' },
    ],
  },
  {
    stepKey: 'producer_quality_check',
    phaseKey: 'review',
    icon: 'clipboardCheck',
    gradientClass: 'from-emerald-500 to-teal-500',
    accentColor: 'text-emerald-400',
    nameKey: 'agentProducer',
    roleKey: 'agentRoleProducer',
    subSteps: [
      { key: 'create_review_items', titleKey: 'subStepCreateReviewItems', titleFallback: '创建审核项' },
      { key: 'quality_scoring', titleKey: 'subStepQualityScoring', titleFallback: '质量评分' },
      { key: 'generate_report', titleKey: 'subStepGenerateReport', titleFallback: '生成审核报告' },
    ],
  },
  {
    stepKey: 'video_generation_agent',
    phaseKey: 'video',
    icon: 'video',
    gradientClass: 'from-rose-500 to-pink-500',
    accentColor: 'text-rose-400',
    nameKey: 'agentVideo',
    roleKey: 'agentRoleVideo',
    subSteps: [],
  },
  {
    stepKey: 'voice_generation_agent',
    phaseKey: 'voice',
    icon: 'mic',
    gradientClass: 'from-sky-500 to-indigo-500',
    accentColor: 'text-sky-400',
    nameKey: 'agentVoice',
    roleKey: 'agentRoleVoice',
    subSteps: [],
  },
  {
    stepKey: 'assembly_agent',
    phaseKey: 'assembly',
    icon: 'film',
    gradientClass: 'from-yellow-500 to-orange-500',
    accentColor: 'text-yellow-400',
    nameKey: 'agentAssembly',
    roleKey: 'agentRoleAssembly',
    subSteps: [],
  },
]

export function getAgentByStepKey(stepKey: string): AgentIdentity | undefined {
  return AGENT_IDENTITIES.find((a) => a.stepKey === stepKey)
}

export function getAgentByPhase(phase: string): AgentIdentity | undefined {
  return AGENT_IDENTITIES.find((a) => a.phaseKey === phase)
}
