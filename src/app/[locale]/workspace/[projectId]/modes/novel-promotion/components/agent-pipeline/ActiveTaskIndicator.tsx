'use client'

import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import type { ActiveTaskInfo } from '../../hooks/usePipelineStatus'
import { AGENT_NAME_KEYS, TASK_TYPE_KEYS } from './constants'

type Props = {
  activeTask?: ActiveTaskInfo | null
  currentPhase?: string | null
}

export function ActiveTaskIndicator({ activeTask, currentPhase }: Props) {
  const t = useTranslations('pipeline')
  const agentNameKey = currentPhase ? AGENT_NAME_KEYS[currentPhase] : null
  const agentName = agentNameKey ? t(agentNameKey) : currentPhase

  if (!activeTask) {
    return (
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-(--glass-text-secondary) mb-3">
          {t('currentActivity')}
        </h3>
        <div className="flex items-center gap-2 text-sm text-(--glass-text-tertiary)">
          <AppIcon name="bot" className="h-4 w-4" />
          <span>{t('noActiveTask')}</span>
        </div>
      </div>
    )
  }

  const taskKey = TASK_TYPE_KEYS[activeTask.type]
  const taskLabel = taskKey ? t(taskKey) : activeTask.type
  const progress = Math.min(Math.max(activeTask.progress, 0), 100)

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-(--glass-text-secondary) mb-3">
        {t('currentActivity')}
      </h3>
      <div className="space-y-2">
        {agentName && (
          <div className="flex items-center gap-2">
            <AppIcon name="bot" className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-(--glass-text-primary)">{agentName}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <AppIcon name="loader" className="h-3.5 w-3.5 text-blue-400 animate-spin" />
          <span className="text-sm text-(--glass-text-secondary)">{taskLabel}</span>
        </div>

        {activeTask.model && (
          <div className="flex items-center gap-2">
            <AppIcon name="cpu" className="h-3.5 w-3.5 text-(--glass-text-tertiary)" />
            <span className="text-xs font-mono text-(--glass-text-tertiary)">{activeTask.model}</span>
          </div>
        )}

        <div className="mt-1">
          <div className="flex items-center justify-between text-xs text-(--glass-text-tertiary) mb-1">
            <span>{t('progress')}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-(--glass-stroke-base) overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
