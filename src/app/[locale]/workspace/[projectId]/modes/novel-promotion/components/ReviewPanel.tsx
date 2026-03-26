'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppIcon } from '@/components/ui/icons'

type ReviewItem = {
  id: string
  phase: string
  targetType: string
  targetId: string
  status: string
  score: number | null
  feedback: string | null
  retryCount: number
}

type Props = {
  projectId: string
}

const PHASE_TABS = [
  { key: 'art', label: '美术资产' },
  { key: 'storyboard', label: '分镜板' },
]

export function ReviewPanel({ projectId }: Props) {
  const [activePhase, setActivePhase] = useState('art')
  const queryClient = useQueryClient()

  const { data: items = [] } = useQuery<ReviewItem[]>({
    queryKey: ['pipeline-review', projectId, activePhase],
    queryFn: async () => {
      const response = await fetch(
        `/api/novel-promotion/${projectId}/pipeline/review?phase=${activePhase}`,
      )
      if (!response.ok) throw new Error('Failed to fetch review items')
      const json = await response.json()
      return json.items
    },
  })

  const reviewMutation = useMutation({
    mutationFn: async (params: { reviewItemId: string; action: string; feedback?: string }) => {
      const response = await fetch(`/api/novel-promotion/${projectId}/pipeline/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!response.ok) throw new Error('Failed to update review')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-review', projectId] })
      queryClient.invalidateQueries({ queryKey: ['pipeline-status', projectId] })
    },
  })

  const pendingItems = items.filter((i) => i.status === 'pending' || i.status === 'retrying')
  const passedItems = items.filter((i) => i.status === 'auto_passed' || i.status === 'approved')

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <div className="flex gap-2 mb-4">
        {PHASE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActivePhase(tab.key)}
            className={`px-4 py-2 rounded text-sm ${
              activePhase === tab.key
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="text-sm text-zinc-400 mb-3">
        共 {items.length} 项 · {passedItems.length} 已通过 · {pendingItems.length} 待审核
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between rounded px-3 py-2 ${
              item.status === 'auto_passed' || item.status === 'approved'
                ? 'bg-emerald-900/20'
                : item.status === 'pending'
                  ? 'bg-yellow-900/20'
                  : 'bg-red-900/20'
            }`}
          >
            <div className="text-sm">
              <span className="font-mono text-zinc-300">{item.targetType}:{item.targetId.slice(0, 8)}</span>
              {item.score !== null && (
                <span className="ml-2 text-zinc-500">score: {item.score.toFixed(2)}</span>
              )}
            </div>
            <div className="flex gap-1">
              {item.status === 'pending' && (
                <>
                  <button
                    onClick={() => reviewMutation.mutate({ reviewItemId: item.id, action: 'approve' })}
                    className="p-1 rounded hover:bg-emerald-800 text-emerald-400"
                    title="通过"
                  >
                    <AppIcon name="check" className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
