'use client'

import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { AppIcon, IconGradientDefs } from '@/components/ui/icons'
import { Link } from '@/i18n/navigation'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { formatRelativeTime } from '@/lib/workspace/relative-time'

interface ProjectStats {
  episodes: number
  images: number
  videos: number
  panels: number
  firstEpisodePreview: string | null
}

interface Project {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  totalCost?: number
  stats?: ProjectStats
  thumbnailUrl?: string | null
}

const DEFAULT_BILLING_CURRENCY = 'CNY'

function formatProjectCost(amount: number, currency = DEFAULT_BILLING_CURRENCY): string {
  if (currency === 'USD') return `$${amount.toFixed(2)}`
  return `¥${amount.toFixed(2)}`
}

function getProjectStatus(project: Project): 'draft' | 'inProgress' | 'completed' {
  if (!project.stats) return 'draft'
  const { episodes, images, videos } = project.stats
  if (episodes === 0 && images === 0 && videos === 0) return 'draft'
  if (videos > 0) return 'completed'
  return 'inProgress'
}

interface ProjectCardProps {
  project: Project
  deletingProjectId: string | null
  onEdit: (project: Project, e: React.MouseEvent) => void
  onDelete: (project: Project, e: React.MouseEvent) => void
}

export default function ProjectCard({ project, deletingProjectId, onEdit, onDelete }: ProjectCardProps) {
  const t = useTranslations('workspace')
  const locale = useLocale()
  const status = getProjectStatus(project)

  const statusConfig = {
    draft: { chipClass: 'glass-chip-neutral', key: 'projectCard.status.draft' as const },
    inProgress: { chipClass: 'glass-chip-info', key: 'projectCard.status.inProgress' as const },
    completed: { chipClass: 'glass-chip-success', key: 'projectCard.status.completed' as const },
  }

  const { chipClass, key } = statusConfig[status]

  return (
    <Link
      href={{ pathname: `/workspace/${project.id}` }}
      className="glass-surface cursor-pointer relative group block hover:border-[var(--glass-tone-info-fg)]/40 transition-all duration-300 overflow-hidden"
    >
      {/* Thumbnail */}
      {project.thumbnailUrl && (
        <div className="relative w-full h-32 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.thumbnailUrl}
            alt={project.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--glass-bg-surface)] to-transparent" />
        </div>
      )}

      {/* Hover glow */}
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-[var(--glass-accent-from)]/5 to-[#a855f7]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="p-5 relative z-10">
        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button
            onClick={(e) => onEdit(project, e)}
            className="glass-btn-base glass-btn-secondary p-2 rounded-lg transition-colors"
            title={t('editProject')}
          >
            <AppIcon name="editSquare" className="w-4 h-4 text-[var(--glass-tone-info-fg)]" />
          </button>
          <button
            onClick={(e) => onDelete(project, e)}
            className="glass-btn-base glass-btn-secondary p-2 rounded-lg transition-colors"
            title={t('deleteProject')}
            disabled={deletingProjectId === project.id}
          >
            {deletingProjectId === project.id ? (
              <TaskStatusInline
                state={resolveTaskPresentationState({
                  phase: 'processing',
                  intent: 'process',
                  resource: 'text',
                  hasOutput: true,
                })}
                className="[&>span]:sr-only"
              />
            ) : (
              <AppIcon name="trash" className="w-4 h-4 text-[var(--glass-tone-danger-fg)]" />
            )}
          </button>
        </div>

        {/* Status badge + Title */}
        <div className="flex items-start gap-2 mb-2">
          <span className={`glass-chip ${chipClass} text-[10px] py-0.5 px-2 flex-shrink-0 mt-0.5`}>
            {t(key)}
          </span>
        </div>
        <h3 className="text-lg font-bold text-[var(--glass-text-primary)] mb-2 line-clamp-2 pr-20 group-hover:text-[var(--glass-tone-info-fg)] transition-colors">
          {project.name}
        </h3>

        {/* Description */}
        {(project.description || project.stats?.firstEpisodePreview) && (
          <div className="flex items-start gap-2 mb-4">
            <AppIcon name="fileText" className="w-4 h-4 text-[var(--glass-text-tertiary)] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[var(--glass-text-secondary)] line-clamp-2 leading-relaxed">
              {project.description || project.stats?.firstEpisodePreview}
            </p>
          </div>
        )}

        {/* Stats */}
        {project.stats && (project.stats.episodes > 0 || project.stats.images > 0 || project.stats.videos > 0) ? (
          <div className="flex items-center gap-2 mb-3">
            <IconGradientDefs className="w-0 h-0 absolute" aria-hidden="true" />
            <AppIcon name="statsBarGradient" className="w-4 h-4 flex-shrink-0" />
            <div className="flex items-center gap-3 text-sm font-semibold bg-gradient-to-r from-[var(--glass-accent-from)] to-[var(--glass-accent-via)] bg-clip-text text-transparent">
              {project.stats.episodes > 0 && (
                <span className="flex items-center gap-1" title={t('statsEpisodes')}>
                  <AppIcon name="statsEpisodeGradient" className="w-3.5 h-3.5" />
                  {project.stats.episodes}
                </span>
              )}
              {project.stats.images > 0 && (
                <span className="flex items-center gap-1" title={t('statsImages')}>
                  <AppIcon name="statsImageGradient" className="w-3.5 h-3.5" />
                  {project.stats.images}
                </span>
              )}
              {project.stats.videos > 0 && (
                <span className="flex items-center gap-1" title={t('statsVideos')}>
                  <AppIcon name="statsVideoGradient" className="w-3.5 h-3.5" />
                  {project.stats.videos}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 mb-3">
            <AppIcon name="statsBar" className="w-4 h-4 text-[var(--glass-text-tertiary)] flex-shrink-0" />
            <span className="text-xs text-[var(--glass-text-tertiary)]">{t('noContent')}</span>
          </div>
        )}

        {/* Footer: relative time + cost */}
        <div className="flex items-center justify-between text-[11px] text-[var(--glass-text-tertiary)]">
          <div className="flex items-center gap-1">
            <AppIcon name="clock" className="w-3 h-3" />
            {formatRelativeTime(project.updatedAt, locale)}
          </div>
          {project.totalCost !== undefined && project.totalCost > 0 && (
            <span className="text-[11px] font-mono font-medium text-[var(--glass-text-secondary)]">
              {formatProjectCost(project.totalCost)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
