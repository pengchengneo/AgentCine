'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import type { TokenUsage, StepInfo } from '../../hooks/usePipelineStatus'
import { STEP_LABEL_KEYS } from './constants'

const fmt = new Intl.NumberFormat()

type Props = {
  totalUsage?: TokenUsage
  steps?: StepInfo[]
}

export function TokenUsageSummary({ totalUsage, steps }: Props) {
  const t = useTranslations('pipeline')
  const [expanded, setExpanded] = useState(false)
  const total = totalUsage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  const hasData = total.totalTokens > 0
  const stepsWithTokens = (steps || []).filter((s) => s.usage && s.usage.totalTokens > 0)

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-(--glass-text-secondary) mb-3">
        {t('tokenUsage')}
      </h3>

      {!hasData ? (
        <div className="text-sm text-(--glass-text-tertiary)">{t('noData')}</div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AppIcon name="bolt" className="h-4 w-4 text-amber-400" />
            <span className="text-lg font-semibold text-(--glass-text-primary)">
              {fmt.format(total.totalTokens)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-(--glass-bg-surface-strong) px-3 py-2">
              <div className="text-xs text-(--glass-text-tertiary)">{t('inputTokens')}</div>
              <div className="text-sm font-medium text-(--glass-text-primary)">
                {fmt.format(total.promptTokens)}
              </div>
            </div>
            <div className="rounded-lg bg-(--glass-bg-surface-strong) px-3 py-2">
              <div className="text-xs text-(--glass-text-tertiary)">{t('outputTokens')}</div>
              <div className="text-sm font-medium text-(--glass-text-primary)">
                {fmt.format(total.completionTokens)}
              </div>
            </div>
          </div>

          {stepsWithTokens.length > 0 && (
            <div>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-(--glass-text-tertiary) hover:text-(--glass-text-secondary) transition-colors"
              >
                {expanded ? <AppIcon name="chevronDown" className="h-3 w-3" /> : <AppIcon name="chevronRight" className="h-3 w-3" />}
                {t('viewByStep')}
              </button>
              {expanded && (
                <div className="mt-2 space-y-1.5">
                  {stepsWithTokens.map((step) => {
                    const labelKey = STEP_LABEL_KEYS[step.stepKey]
                    return (
                      <div key={step.stepKey} className="flex items-center justify-between text-xs">
                        <span className="text-(--glass-text-secondary)">
                          {labelKey ? t(labelKey) : step.stepKey}
                        </span>
                        <span className="font-mono text-(--glass-text-tertiary)">
                          {fmt.format(step.usage.totalTokens)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
