'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import {
  useStoryboards,
  type StoryboardGroup,
  type StoryboardPanel,
} from '@/lib/query/hooks/useStoryboards'

interface StoryboardOutputViewProps {
  projectId: string
  episodeId?: string | null
}

interface PanelCardProps {
  panel: StoryboardPanel
  t: ReturnType<typeof useTranslations>
}

function PanelCard({ panel, t }: PanelCardProps) {
  const imageUrl = panel.media?.url ?? panel.imageUrl
  const videoUrl = panel.videoMedia?.url ?? panel.videoUrl

  return (
    <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl overflow-hidden">
      {/* Image area */}
      <div className="relative aspect-[16/9] w-full bg-white/5">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`panel-${panel.shotIndex}`}
            className="w-full h-full object-cover rounded-t-xl"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-t-xl text-white/30">
            <AppIcon name="image" className="h-6 w-6 mb-1" />
            <span className="text-xs">{t('viewEmpty.notGenerated')}</span>
          </div>
        )}

        {/* Video play badge overlay */}
        {videoUrl && (
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-sm px-1.5 py-0.5">
            <AppIcon name="playCircle" className="h-3 w-3 text-cyan-400" />
            <span className="text-[10px] text-cyan-300 font-medium">视频</span>
          </div>
        )}

        {/* Panel number badge */}
        <div className="absolute top-1.5 left-1.5 rounded-full bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[10px] text-white/80 font-medium">
          #{panel.shotIndex + 1}
        </div>
      </div>

      {/* Info area */}
      <div className="p-2.5 space-y-2">
        {/* Motion prompt as description */}
        {panel.motionPrompt && (
          <p className="text-xs text-white/60 leading-relaxed line-clamp-2">
            {panel.motionPrompt}
          </p>
        )}

        {/* Voice text */}
        {panel.voiceText && (
          <p className="text-[11px] text-white/40 italic leading-relaxed">
            &ldquo;{panel.voiceText}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}

interface StoryboardGroupSectionProps {
  group: StoryboardGroup
  t: ReturnType<typeof useTranslations>
}

function StoryboardGroupSection({ group, t }: StoryboardGroupSectionProps) {
  return (
    <div className="space-y-3">
      {/* Group header */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
          {t('viewSection.storyboardGroup')} {group.stageIndex + 1}
        </span>
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-white/40">{group.panels.length} {t('viewSection.panel')}</span>
      </div>

      {/* Panel grid */}
      <div className="grid grid-cols-2 gap-3">
        {group.panels.map((panel) => (
          <PanelCard key={panel.id} panel={panel} t={t} />
        ))}
      </div>
    </div>
  )
}

export const StoryboardOutputView = memo(function StoryboardOutputView({
  episodeId,
}: StoryboardOutputViewProps) {
  const t = useTranslations('pipeline')
  const { data, isLoading } = useStoryboards(episodeId ?? null)

  const groups = data?.groups ?? []

  return (
    <div
      className="relative w-full h-full overflow-y-auto"
      style={{
        backgroundImage:
          'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="p-6 space-y-6">
        {/* Title header */}
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
            <AppIcon name="layout" className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-base font-semibold text-cyan-300">
            {t('viewTitle.storyboard')}
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
            <AppIcon name="layout" className="h-8 w-8" />
            <p className="text-sm">{t('viewEmpty.noStoryboards')}</p>
          </div>
        )}

        {/* Empty state (has episodeId but no data) */}
        {episodeId && !isLoading && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-white/40 space-y-3">
            <AppIcon name="layout" className="h-8 w-8" />
            <p className="text-sm">{t('viewEmpty.noStoryboards')}</p>
          </div>
        )}

        {/* Storyboard groups */}
        {groups.length > 0 && (
          <div className="space-y-6">
            {groups.map((group) => (
              <StoryboardGroupSection key={group.id} group={group} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
})
