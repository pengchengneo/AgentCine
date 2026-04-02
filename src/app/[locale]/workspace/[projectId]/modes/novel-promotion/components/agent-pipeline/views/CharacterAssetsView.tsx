'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { useProjectAssets } from '@/lib/query/hooks/useProjectAssets'
import type { Character, Location, CharacterAppearance, LocationImage } from '@/types/project'

interface CharacterAssetsViewProps {
  projectId: string
}

// ─── Character image card ─────────────────────────────────────────────────────

function AppearanceImage({ appearance }: { appearance: CharacterAppearance }) {
  const t = useTranslations('pipeline')
  const src = appearance.imageUrl ?? (appearance.imageUrls?.[0] ?? null)

  if (!src) {
    return (
      <div
        className="flex items-center justify-center rounded-lg text-white/30 text-[10px] text-center"
        style={{
          width: 96,
          height: 128,
          border: '1.5px dashed rgba(255,255,255,0.15)',
          flexShrink: 0,
        }}
      >
        {t('viewEmpty.notGenerated')}
      </div>
    )
  }

  return (
    <div className="relative rounded-lg overflow-hidden flex-shrink-0 group" style={{ width: 96, height: 128 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`appearance-${appearance.appearanceIndex}`}
        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
      />
      {/* Appearance label overlay */}
      <div
        className="absolute bottom-0 inset-x-0 px-1 py-0.5 text-[9px] text-white/70 truncate"
        style={{ background: 'rgba(0,0,0,0.55)' }}
      >
        {appearance.changeReason || `形象 ${appearance.appearanceIndex}`}
      </div>
    </div>
  )
}

// ─── Character card ───────────────────────────────────────────────────────────

function CharacterCard({ character }: { character: Character }) {
  const t = useTranslations('pipeline')
  const hasAppearances = character.appearances && character.appearances.length > 0

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {/* Name + intro */}
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-white" style={{ fontSize: 16 }}>
          {character.name}
        </p>
        {character.introduction && (
          <p
            className="text-white/50 overflow-hidden"
            style={{
              fontSize: 13,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {character.introduction}
          </p>
        )}
      </div>

      {/* Appearance images */}
      {hasAppearances ? (
        <div className="flex flex-wrap gap-2">
          {character.appearances.map((app) => (
            <AppearanceImage key={app.id} appearance={app} />
          ))}
        </div>
      ) : (
        <p className="text-white/30 text-xs">{t('viewEmpty.notGenerated')}</p>
      )}
    </div>
  )
}

// ─── Location image card ──────────────────────────────────────────────────────

function LocationImageThumb({ image }: { image: LocationImage }) {
  const t = useTranslations('pipeline')
  const src = image.imageUrl

  if (!src) {
    return (
      <div
        className="flex items-center justify-center rounded-lg text-white/30 text-[10px] text-center"
        style={{
          width: 96,
          height: 96,
          border: '1.5px dashed rgba(255,255,255,0.15)',
          flexShrink: 0,
        }}
      >
        {t('viewEmpty.notGenerated')}
      </div>
    )
  }

  return (
    <div className="relative rounded-lg overflow-hidden flex-shrink-0 group" style={{ width: 96, height: 96 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`location-image-${image.imageIndex}`}
        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
      />
      {image.isSelected && (
        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
          <AppIcon name="check" className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </div>
  )
}

// ─── Location card ────────────────────────────────────────────────────────────

function LocationCard({ location }: { location: Location }) {
  const t = useTranslations('pipeline')
  const hasImages = location.images && location.images.length > 0

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {/* Name + summary */}
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-white" style={{ fontSize: 16 }}>
          {location.name}
        </p>
        {location.summary && (
          <p
            className="text-white/50 overflow-hidden"
            style={{
              fontSize: 13,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {location.summary}
          </p>
        )}
      </div>

      {/* Location images */}
      {hasImages ? (
        <div className="flex flex-wrap gap-2">
          {location.images.map((img) => (
            <LocationImageThumb key={img.id} image={img} />
          ))}
        </div>
      ) : (
        <p className="text-white/30 text-xs">{t('viewEmpty.notGenerated')}</p>
      )}
    </div>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-white/40 font-medium tracking-wider uppercase"
      style={{ fontSize: 11, letterSpacing: '0.1em' }}
    >
      {children}
    </p>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

function CharacterAssetsViewInner({ projectId }: CharacterAssetsViewProps) {
  const t = useTranslations('pipeline')
  const { data, isLoading } = useProjectAssets(projectId)

  const characters = data?.characters ?? []
  const locations = data?.locations ?? []
  const hasCharacters = characters.length > 0
  const hasLocations = locations.length > 0
  const isEmpty = !hasCharacters && !hasLocations

  return (
    <div
      className="w-full h-full overflow-y-auto"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="p-6 flex flex-col gap-8 min-h-full">
        {/* Header: agent identity */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <AppIcon name="sparkles" className="w-5 h-5 text-amber-400" />
            <span className="font-semibold text-amber-400" style={{ fontSize: 16 }}>
              {t('viewTitle.characters')}
            </span>
          </div>
          {/* Gradient underline */}
          <div
            className="h-px w-24 rounded-full"
            style={{
              background: 'linear-gradient(to right, rgba(251,191,36,0.6), transparent)',
            }}
          />
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-24">
            <AppIcon name="loader" className="w-7 h-7 text-white/40 animate-spin" />
            <p className="text-white/40 text-sm">加载中...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && isEmpty && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-24">
            <AppIcon name="image" className="w-8 h-8 text-white/20" />
            <p className="text-white/30 text-sm">{t('noData')}</p>
          </div>
        )}

        {/* Characters section */}
        {!isLoading && hasCharacters && (
          <div className="flex flex-col gap-3">
            <SectionLabel>{t('viewSection.characters')}</SectionLabel>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {characters.map((character) => (
                <CharacterCard key={character.id} character={character} />
              ))}
            </div>
          </div>
        )}

        {/* Locations section */}
        {!isLoading && hasLocations && (
          <div className="flex flex-col gap-3">
            <SectionLabel>{t('viewSection.locations')}</SectionLabel>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {locations.map((location) => (
                <LocationCard key={location.id} location={location} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const CharacterAssetsView = memo(CharacterAssetsViewInner)
