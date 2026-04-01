'use client'

import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

type Props = {
  isAgentMode: boolean
  onToggle: () => void
  pipelineActive?: boolean
  hasCompletedOnce?: boolean
}

export function AgentModeToggle({ isAgentMode, onToggle, pipelineActive, hasCompletedOnce }: Props) {
  const t = useTranslations('pipeline')

  const manualDisabled = isAgentMode && pipelineActive && !hasCompletedOnce

  return (
    <div className="glass-surface-nav flex rounded-full p-1 shadow-lg">
      <button
        onClick={manualDisabled ? undefined : (!isAgentMode ? undefined : onToggle)}
        disabled={!!manualDisabled}
        title={manualDisabled ? ((t as (k: string) => string | undefined)('exitProtectionHint') ?? 'Pipeline 运行中，完成后可切换到手动模式') : undefined}
        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
          !isAgentMode
            ? 'bg-(--glass-bg-surface-strong) text-(--glass-text-primary) shadow-sm'
            : manualDisabled
              ? 'text-(--glass-text-tertiary) cursor-not-allowed opacity-40'
              : 'text-(--glass-text-tertiary) hover:text-(--glass-text-secondary)'
        }`}
      >
        <AppIcon name="wrench" className="h-3.5 w-3.5" />
        {t('manual')}
      </button>
      <button
        onClick={isAgentMode ? undefined : onToggle}
        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
          isAgentMode
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-(--glass-text-tertiary) hover:text-(--glass-text-secondary)'
        }`}
      >
        <AppIcon name="bot" className="h-3.5 w-3.5" />
        {t('agent')}
      </button>
    </div>
  )
}
