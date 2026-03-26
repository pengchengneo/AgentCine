'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Zap } from 'lucide-react'
import type { StepInfo } from '../../hooks/usePipelineStatus'

type TokenUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

const STEP_LABELS: Record<string, string> = {
  script_agent: '剧本分析',
  art_director_agent: '美术生成',
  storyboard_agent: '分镜生成',
  producer_quality_check: '质量审核',
}

const fmt = new Intl.NumberFormat()

type Props = {
  totalUsage?: TokenUsage
  steps?: StepInfo[]
}

export function TokenUsageSummary({ totalUsage, steps }: Props) {
  const [expanded, setExpanded] = useState(false)
  const total = totalUsage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  const hasData = total.totalTokens > 0
  const stepsWithTokens = (steps || []).filter((s) => s.usage && s.usage.totalTokens > 0)

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-(--glass-text-secondary) mb-3">
        Token 用量
      </h3>

      {!hasData ? (
        <div className="text-sm text-(--glass-text-tertiary)">暂无数据</div>
      ) : (
        <div className="space-y-2">
          {/* Total */}
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <span className="text-lg font-semibold text-(--glass-text-primary)">
              {fmt.format(total.totalTokens)}
            </span>
          </div>

          {/* Input / Output breakdown */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-(--glass-bg-surface-strong) px-3 py-2">
              <div className="text-xs text-(--glass-text-tertiary)">输入</div>
              <div className="text-sm font-medium text-(--glass-text-primary)">
                {fmt.format(total.promptTokens)}
              </div>
            </div>
            <div className="rounded-lg bg-(--glass-bg-surface-strong) px-3 py-2">
              <div className="text-xs text-(--glass-text-tertiary)">输出</div>
              <div className="text-sm font-medium text-(--glass-text-primary)">
                {fmt.format(total.completionTokens)}
              </div>
            </div>
          </div>

          {/* Per-step breakdown (collapsible) */}
          {stepsWithTokens.length > 0 && (
            <div>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-(--glass-text-tertiary) hover:text-(--glass-text-secondary) transition-colors"
              >
                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                按阶段查看
              </button>
              {expanded && (
                <div className="mt-2 space-y-1.5">
                  {stepsWithTokens.map((step) => (
                    <div key={step.stepKey} className="flex items-center justify-between text-xs">
                      <span className="text-(--glass-text-secondary)">
                        {STEP_LABELS[step.stepKey] || step.stepKey}
                      </span>
                      <span className="font-mono text-(--glass-text-tertiary)">
                        {fmt.format(step.usage.totalTokens)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
