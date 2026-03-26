'use client'

import { useRef, useEffect, useState } from 'react'
import { AppIcon } from '@/components/ui/icons'
import type { PipelineLogEntry } from '../../hooks/usePipelineStatus'

const AGENT_COLORS: Record<string, string> = {
  '剧本 Agent': 'text-violet-400',
  '美术总监': 'text-amber-400',
  '分镜 Agent': 'text-cyan-400',
  '制片 Agent': 'text-emerald-400',
}

const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

type Props = {
  logs?: PipelineLogEntry[]
}

export function PipelineLogStream({ logs }: Props) {
  const [expanded, setExpanded] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs?.length, expanded])

  if (!logs || logs.length === 0) {
    return null
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-(--glass-text-secondary) mb-2"
      >
        <span className="flex items-center gap-1.5">
          <AppIcon name="scrollText" className="h-3.5 w-3.5" />
          执行日志 ({logs.length})
        </span>
        {expanded ? <AppIcon name="chevronUp" className="h-3.5 w-3.5" /> : <AppIcon name="chevronDown" className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <div
          ref={scrollRef}
          className="max-h-48 overflow-y-auto rounded-lg bg-black/20 p-2 space-y-0.5 font-mono text-[11px] leading-relaxed scrollbar-thin"
        >
          {logs.map((entry, i) => {
            const timeStr = timeFormatter.format(new Date(entry.ts))
            const agentColor = AGENT_COLORS[entry.agent] || 'text-(--glass-text-secondary)'

            return (
              <div key={i} className="flex gap-2 py-0.5">
                <span className="text-(--glass-text-tertiary) shrink-0">{timeStr}</span>
                <span className={`shrink-0 ${agentColor}`}>[{entry.agent}]</span>
                <span className="text-(--glass-text-primary)">{entry.message}</span>
                {entry.model && (
                  <span className="text-(--glass-text-tertiary) ml-auto shrink-0">({entry.model})</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
