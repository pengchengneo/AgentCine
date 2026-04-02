'use client'

import { memo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { AppIcon } from '@/components/ui/icons'
import { apiFetch } from '@/lib/api-fetch'

interface NovelPromotionClip {
  id: string
  summary: string
  location: string | null
  characters: string | null
  content: string
  screenplay?: string | null
  startText?: string
  endText?: string
  shotCount?: number
}

interface EpisodeWithClips {
  id: string
  episodeNumber: number
  name: string
  description?: string | null
  novelText?: string | null
  clips: NovelPromotionClip[]
}

interface ScriptOutputViewProps {
  projectId: string
  episodeId?: string | null
}

interface ClipCardProps {
  clip: NovelPromotionClip
  index: number
  t: ReturnType<typeof useTranslations>
}

function ClipCard({ clip, index, t }: ClipCardProps) {
  const [expanded, setExpanded] = useState(false)

  const characters = clip.characters
    ? clip.characters
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
    : []

  return (
    <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-4 space-y-3">
      {/* Clip number badge + summary */}
      <div className="flex items-start gap-3">
        <span className="shrink-0 inline-flex items-center rounded-full bg-violet-500/20 border border-violet-500/30 px-2.5 py-0.5 text-xs font-medium text-violet-300">
          {t('viewSection.scene')} {index + 1}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm font-medium text-white leading-relaxed">{clip.summary}</p>

      {/* Location */}
      {clip.location && (
        <div className="flex items-center gap-1.5 text-xs text-white/60">
          <AppIcon name="mapPin" className="h-3.5 w-3.5 shrink-0" />
          <span>{clip.location}</span>
        </div>
      )}

      {/* Characters */}
      {characters.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-white/60">
          <AppIcon name="user" className="h-3.5 w-3.5 shrink-0" />
          <span>{characters.join('、')}</span>
        </div>
      )}

      {/* Content (collapsible) */}
      {clip.content && (
        <div>
          <p
            className={`text-sm text-white/40 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}
          >
            {clip.content}
          </p>
          {clip.content.length > 120 && (
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="mt-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              {expanded
                ? t('viewLabel.collapse')
                : t('viewLabel.expand')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export const ScriptOutputView = memo(function ScriptOutputView({
  projectId,
  episodeId,
}: ScriptOutputViewProps) {
  const t = useTranslations('pipeline')

  const { data, isLoading } = useQuery<EpisodeWithClips>({
    queryKey: ['script-output-view', projectId, episodeId],
    queryFn: async () => {
      if (!projectId || !episodeId) throw new Error('Missing IDs')
      const res = await apiFetch(
        `/api/novel-promotion/${projectId}/episodes/${episodeId}`,
      )
      if (!res.ok) throw new Error('Failed to fetch episode')
      const json = await res.json()
      return json.episode as EpisodeWithClips
    },
    enabled: !!projectId && !!episodeId,
    staleTime: 10_000,
  })

  return (
    <div
      className="relative w-full h-full overflow-y-auto"
      style={{
        backgroundImage:
          'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="p-6 space-y-4">
        {/* Title header */}
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
            <AppIcon name="fileText" className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-base font-semibold text-violet-300">
            {t('viewTitle.script')}
          </h2>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-white/40 space-y-3">
            <AppIcon name="loader" className="h-8 w-8 animate-spin" />
            <p className="text-sm">加载中...</p>
          </div>
        )}

        {/* No episodeId */}
        {!episodeId && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-white/40 space-y-3">
            <AppIcon name="fileText" className="h-8 w-8" />
            <p className="text-sm">{t('viewEmpty.noClips')}</p>
          </div>
        )}

        {/* Episode info card */}
        {data && (
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-4 space-y-1">
            <p className="text-sm font-semibold text-white">{data.name}</p>
            {data.description && (
              <p className="text-xs text-white/60 leading-relaxed">
                {data.description}
              </p>
            )}
          </div>
        )}

        {/* Clips list */}
        {data && data.clips && data.clips.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider">
              {t('viewSection.clips')} · {data.clips.length}
            </p>
            {data.clips.map((clip, idx) => (
              <ClipCard key={clip.id} clip={clip} index={idx} t={t} />
            ))}
          </div>
        ) : (
          data &&
          (!data.clips || data.clips.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-white/40 space-y-3">
              <AppIcon name="fileText" className="h-8 w-8" />
              <p className="text-sm">{t('viewEmpty.noClips')}</p>
            </div>
          )
        )}
      </div>
    </div>
  )
})
