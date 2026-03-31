import type { AppIconName } from '@/components/ui/icons/registry'

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
  },
  {
    stepKey: 'art_director_agent',
    phaseKey: 'art',
    icon: 'sparkles',
    gradientClass: 'from-amber-500 to-orange-500',
    accentColor: 'text-amber-400',
    nameKey: 'agentArt',
    roleKey: 'agentRoleArt',
  },
  {
    stepKey: 'storyboard_agent',
    phaseKey: 'storyboard',
    icon: 'layout',
    gradientClass: 'from-cyan-500 to-blue-500',
    accentColor: 'text-cyan-400',
    nameKey: 'agentStoryboard',
    roleKey: 'agentRoleStoryboard',
  },
  {
    stepKey: 'producer_quality_check',
    phaseKey: 'review',
    icon: 'clipboardCheck',
    gradientClass: 'from-emerald-500 to-teal-500',
    accentColor: 'text-emerald-400',
    nameKey: 'agentProducer',
    roleKey: 'agentRoleProducer',
  },
]

export function getAgentByStepKey(stepKey: string): AgentIdentity | undefined {
  return AGENT_IDENTITIES.find((a) => a.stepKey === stepKey)
}

export function getAgentByPhase(phase: string): AgentIdentity | undefined {
  return AGENT_IDENTITIES.find((a) => a.phaseKey === phase)
}
