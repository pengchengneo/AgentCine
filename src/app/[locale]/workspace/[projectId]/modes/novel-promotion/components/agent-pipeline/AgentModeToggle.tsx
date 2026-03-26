'use client'

import { Bot, Wrench } from 'lucide-react'

type Props = {
  isAgentMode: boolean
  onToggle: () => void
}

export function AgentModeToggle({ isAgentMode, onToggle }: Props) {
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
        <Wrench className="h-3.5 w-3.5" />
        手动
      </button>
      <button
        onClick={isAgentMode ? undefined : onToggle}
        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
          isAgentMode
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-(--glass-text-tertiary) hover:text-(--glass-text-secondary)'
        }`}
      >
        <Bot className="h-3.5 w-3.5" />
        Agent
      </button>
    </div>
  )
}
