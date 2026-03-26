'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Rocket } from 'lucide-react'

type Props = {
  projectId: string
  novelText: string
  disabled: boolean
  onStarted: (pipelineRunId: string) => void
}

export function AgentModeEntry({ projectId, novelText, disabled, onStarted }: Props) {
  const [started, setStarted] = useState(false)

  const startMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/novel-promotion/${projectId}/pipeline/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: novelText }),
      })
      if (!response.ok) throw new Error('Failed to start pipeline')
      return response.json()
    },
    onSuccess: (data) => {
      setStarted(true)
      onStarted(data.pipelineRunId)
    },
  })

  if (started) return null

  return (
    <button
      onClick={() => startMutation.mutate()}
      disabled={disabled || !novelText.trim() || startMutation.isPending}
      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <Rocket className="h-5 w-5" />
      {startMutation.isPending ? '启动中...' : '一键生成'}
    </button>
  )
}
