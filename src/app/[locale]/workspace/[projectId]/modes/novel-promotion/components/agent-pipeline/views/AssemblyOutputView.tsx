'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { AppIcon } from '@/components/ui/icons'
import { apiFetch } from '@/lib/api-fetch'

interface AssemblyOutputViewProps {
  projectId: string
  episodeId?: string | null
}

interface EditorData {
  id?: string
  episodeId?: string
  projectData?: unknown
  renderStatus?: 'pending' | 'rendering' | 'completed' | 'failed'
  outputUrl?: string | null
  updatedAt?: string
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

function RenderStatusBadge({ status }: { status: EditorData['renderStatus'] }) {
  if (!status) return null

  const configMap: Record<
    NonNullable<EditorData['renderStatus']>,
    { label: string; className: string; pulse?: boolean }
  > = {
    completed: {
      label: '渲染完成',
      className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    rendering: {
      label: '渲染中',
      className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      pulse: true,
    },
    pending: {
      label: '等待渲染',
      className: 'bg-white/10 text-white/50 border-white/10',
    },
    failed: {
      label: '渲染失败',
      className: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
  }

  const config = configMap[status]
  if (!config) return null

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${config.className}`}
    >
      {config.pulse && (
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
      )}
      {config.label}
    </span>
  )
}

export const AssemblyOutputView = memo(function AssemblyOutputView({
  projectId,
  episodeId,
}: AssemblyOutputViewProps) {
  const t = useTranslations('pipeline')

  const { data: editorData, isLoading } = useQuery<EditorData | null>({
    queryKey: ['editor-data', projectId, episodeId],
    queryFn: async () => {
      if (!projectId || !episodeId) return null
      const res = await apiFetch(
        `/api/novel-promotion/${projectId}/editor?episodeId=${episodeId}`,
      )
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!projectId && !!episodeId,
  })

  const hasOutput = !!editorData?.outputUrl
  const isRendering =
    editorData?.renderStatus === 'rendering' || editorData?.renderStatus === 'pending'
  const hasFailed = editorData?.renderStatus === 'failed'
  const hasData = !!editorData && editorData.projectData !== null

  return (
    <div
      className="relative w-full h-full overflow-y-auto"
      style={{
        backgroundImage:
          'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="flex flex-col items-center min-h-full px-6 py-8">
        {/* Title header */}
        <div className="flex items-center gap-2 mb-8 self-start">
          <AppIcon name="film" className="h-5 w-5 text-yellow-400" />
          <span className="text-base font-semibold text-yellow-400">
            {t('viewTitle.assembly')}
          </span>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <AppIcon name="loader" className="h-8 w-8 text-white/40 animate-spin" />
          </div>
        )}

        {/* Main content */}
        {!isLoading && (
          <div className="w-full max-w-2xl flex flex-col gap-6">
            {/* Video output */}
            {hasOutput && (
              <>
                {/* Video player */}
                <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl overflow-hidden">
                  <video
                    src={editorData!.outputUrl!}
                    controls
                    className="w-full rounded-xl"
                    preload="metadata"
                  />
                </div>

                {/* Status + timestamp row */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <RenderStatusBadge status={editorData?.renderStatus} />
                  {editorData?.updatedAt && (
                    <span className="text-xs text-white/40">
                      {t('viewLabel.renderCompleted')} ·{' '}
                      {dateFormatter.format(new Date(editorData.updatedAt))}
                    </span>
                  )}
                </div>

                {/* Download button */}
                <a
                  href={editorData!.outputUrl!}
                  download
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-3 text-sm font-medium text-white/80 hover:text-white transition-colors"
                >
                  <AppIcon name="download" className="h-4 w-4" />
                  {t('downloadFilm')}
                </a>

                {/* Stats section */}
                {hasData && (
                  <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] text-white/40 mb-1">
                        {t('viewLabel.renderCompleted')}
                      </p>
                      <p className="text-sm font-medium text-white/80">
                        {editorData?.updatedAt
                          ? dateFormatter.format(new Date(editorData.updatedAt))
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-white/40 mb-1">输出格式</p>
                      <p className="text-sm font-medium text-white/80">MP4</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Rendering / pending state */}
            {!hasOutput && isRendering && (
              <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-12 flex flex-col items-center gap-4">
                <div className="relative flex items-center justify-center h-16 w-16">
                  <AppIcon
                    name="loader"
                    className="h-16 w-16 text-yellow-400/30 animate-spin"
                  />
                  <AppIcon
                    name="film"
                    className="absolute h-7 w-7 text-yellow-400"
                  />
                </div>
                <p className="text-sm font-medium text-white/70">
                  {t('viewLabel.rendering')}
                </p>
              </div>
            )}

            {/* Failed state */}
            {!hasOutput && hasFailed && (
              <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-sm rounded-xl p-8 flex flex-col items-center gap-3">
                <AppIcon name="alertCircle" className="h-10 w-10 text-red-400" />
                <p className="text-sm font-medium text-red-300">
                  {t('renderFailed')}
                </p>
              </div>
            )}

            {/* Empty state — no assembly yet */}
            {!hasOutput && !isRendering && !hasFailed && (
              <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-12 flex flex-col items-center gap-4">
                <AppIcon name="film" className="h-14 w-14 text-white/20" />
                <div className="text-center space-y-1.5">
                  <p className="text-base font-medium text-white/50">
                    {t('viewEmpty.noAssembly')}
                  </p>
                  <p className="text-sm text-white/30 max-w-xs">
                    {t('viewEmpty.assemblyHint')}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
