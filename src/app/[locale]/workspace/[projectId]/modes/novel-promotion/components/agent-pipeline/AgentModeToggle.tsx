'use client'

import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

type Props = {
  isAgentMode: boolean
  onToggle: () => void
}

export function AgentModeToggle({ isAgentMode, onToggle }: Props) {
  const t = useTranslations('pipeline')

  return (
    <div className="glass-surface-nav flex rounded-full p-1 shadow-lg">
      <button
        onClick={!isAgentMode ? undefined : onToggle}
        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
          !isAgentMode
            ? 'bg-(--glass-bg-surface-strong) text-(--glass-text-primary) shadow-sm'
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
