'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppIcon } from '@/components/ui/icons'
import type { AppIconName } from '@/components/ui/icons/registry'
import { MediaImage } from '@/components/media/MediaImage'

type ReviewItem = {
  id: string
  phase: string
  targetType: string
  targetId: string
  status: string
  score: number | null
  feedback: string | null
  retryCount: number
  targetName: string | null
  targetImageUrl: string | null
}

type Props = {
  projectId: string
}

const PHASE_TAB_KEYS = [
  { key: 'art', labelKey: 'artAssets' },
  { key: 'storyboard', labelKey: 'storyboardBoard' },
] as const

const TARGET_TYPE_ICONS: Record<string, AppIconName> = {
  character: 'user',
  location: 'mapPin',
  panel: 'image',
}

export function ReviewPanel({ projectId }: Props) {
  const t = useTranslations('pipeline')
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
  const approvedCount = passedItems.length
  const totalCount = items.length
  const progressPercent = totalCount > 0 ? (approvedCount / totalCount) * 100 : 0

  const approveAllMutation = useMutation({
    mutationFn: async () => {
      for (const item of pendingItems) {
        const response = await fetch(`/api/novel-promotion/${projectId}/pipeline/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewItemId: item.id, action: 'approve' }),
        })
        if (!response.ok) throw new Error('Failed to approve item')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-review', projectId] })
      queryClient.invalidateQueries({ queryKey: ['pipeline-status', projectId] })
    },
  })

  return (
    <div className="rounded-xl p-4 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 shadow-sm">
      <div className="flex gap-2 mb-4">
        {PHASE_TAB_KEYS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActivePhase(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activePhase === tab.key
                ? 'bg-white/80 text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/40'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {pendingItems.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-100 border border-amber-300 px-3 py-2.5 mb-3">
          <AppIcon name="eye" className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800">
            <p>{t('reviewGuidance')}</p>
            <p className="text-amber-600 mt-0.5">{t('reviewAutoComplete')}</p>
          </div>
        </div>
      )}

      {totalCount > 0 && (
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">
              {t('reviewProgress', { approved: approvedCount, total: totalCount })}
            </span>
            {pendingItems.length > 0 && (
              <button
                onClick={() => approveAllMutation.mutate()}
                disabled={approveAllMutation.isPending}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <AppIcon name="clipboardCheck" className="h-3 w-3" />
                {approveAllMutation.isPending ? t('approvingAll') : t('approveAll')}
              </button>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-orange-200/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="text-sm text-gray-600 mb-3">
        {t('itemsSummary', {
          total: items.length,
          passed: passedItems.length,
          pending: pendingItems.length,
        })}
      </div>

      <div className="space-y-2 max-h-[calc(100vh-18rem)] overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
              item.status === 'auto_passed' || item.status === 'approved'
                ? 'bg-emerald-50 border border-emerald-200'
                : item.status === 'pending'
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-red-50 border border-red-200'
            }`}
          >
            {/* Thumbnail */}
            <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-orange-100">
              {item.targetImageUrl ? (
                <MediaImage
                  src={item.targetImageUrl}
                  alt={item.targetName || item.targetType}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <AppIcon name={TARGET_TYPE_ICONS[item.targetType] || 'file'} className="h-4 w-4" />
                </div>
              )}
            </div>

            {/* Name + score */}
            <div className="flex-1 min-w-0 text-sm">
              <div className="text-gray-900 truncate font-medium">
                {item.targetName || `${item.targetType}:${item.targetId.slice(0, 8)}`}
              </div>
              {item.score !== null && (
                <div className="text-xs text-gray-500">
                  {t('reviewScore')}: {item.score.toFixed(2)}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-1 shrink-0">
              {item.status === 'pending' && (
                <button
                  onClick={() => reviewMutation.mutate({ reviewItemId: item.id, action: 'approve' })}
                  className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors"
                  title={t('approve')}
                >
                  <AppIcon name="check" className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
