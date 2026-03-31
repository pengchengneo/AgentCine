'use client'

import { useRef, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import type { PipelineLogEntry } from '../../hooks/usePipelineStatus'
import { getAgentByPhase } from '@/lib/agent-pipeline/agent-identities'

const AGENT_ACCENT_COLORS: Record<string, string> = {
  script: 'text-violet-400',
  art: 'text-amber-400',
  storyboard: 'text-cyan-400',
  review: 'text-emerald-400',
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

function getAgentColor(agentName: string): string {
  // Try to match by phase key from agent identities
  for (const [phase, color] of Object.entries(AGENT_ACCENT_COLORS)) {
    const agent = getAgentByPhase(phase)
    if (agent && agentName.includes(phase)) return color
  }
  // Fallback: match by known substrings
  if (agentName.includes('剧本') || agentName.toLowerCase().includes('script')) return 'text-violet-400'
  if (agentName.includes('美术') || agentName.toLowerCase().includes('art')) return 'text-amber-400'
  if (agentName.includes('分镜') || agentName.toLowerCase().includes('storyboard')) return 'text-cyan-400'
  if (agentName.includes('制片') || agentName.toLowerCase().includes('producer')) return 'text-emerald-400'
  return 'text-(--glass-text-secondary)'
}

type Props = {
  logs?: PipelineLogEntry[]
}

export function PipelineLogStream({ logs }: Props) {
  const t = useTranslations('pipeline')
  const [expanded, setExpanded] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

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
          {t('executionLogs')} ({logs.length})
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
            const agentColor = getAgentColor(entry.agent)

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
