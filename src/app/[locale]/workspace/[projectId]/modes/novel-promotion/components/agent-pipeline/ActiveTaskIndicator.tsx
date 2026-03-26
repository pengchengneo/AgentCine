'use client'

import { Bot, Cpu, Loader2 } from 'lucide-react'
import type { ActiveTaskInfo } from '../../hooks/usePipelineStatus'

const AGENT_NAMES: Record<string, string> = {
  script: '剧本 Agent',
  art: '美术总监',
  storyboard: '分镜 Agent',
  review: '制片人',
}

const TASK_TYPE_LABELS: Record<string, string> = {
  analyze_novel: '分析小说文本',
  story_to_script_run: '生成剧本',
  script_to_storyboard_run: '生成分镜',
  image_character: '生成角色图片',
  image_location: '生成场景图片',
  image_panel: '生成分镜画面',
  image_panel_variant: '生成画面变体',
}

type Props = {
  activeTask?: ActiveTaskInfo | null
  currentPhase?: string | null
}

export function ActiveTaskIndicator({ activeTask, currentPhase }: Props) {
  const agentName = currentPhase ? AGENT_NAMES[currentPhase] || currentPhase : null

  if (!activeTask) {
    return (
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-(--glass-text-secondary) mb-3">
          当前任务
        </h3>
        <div className="flex items-center gap-2 text-sm text-(--glass-text-tertiary)">
          <Bot className="h-4 w-4" />
          <span>等待中...</span>
        </div>
      </div>
    )
  }

  const taskLabel = TASK_TYPE_LABELS[activeTask.type] || activeTask.type
  const progress = Math.min(Math.max(activeTask.progress, 0), 100)

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-(--glass-text-secondary) mb-3">
        当前任务
      </h3>
      <div className="space-y-2">
        {/* Agent name */}
        {agentName && (
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-(--glass-text-primary)">{agentName}</span>
          </div>
        )}

        {/* Task type */}
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />
          <span className="text-sm text-(--glass-text-secondary)">{taskLabel}</span>
        </div>

        {/* Model */}
        {activeTask.model && (
          <div className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-(--glass-text-tertiary)" />
            <span className="text-xs font-mono text-(--glass-text-tertiary)">{activeTask.model}</span>
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-1">
          <div className="flex items-center justify-between text-xs text-(--glass-text-tertiary) mb-1">
            <span>进度</span>
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
