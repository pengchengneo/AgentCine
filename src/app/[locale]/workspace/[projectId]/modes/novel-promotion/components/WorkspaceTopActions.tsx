'use client'

import { useCallback, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { AppIcon } from '@/components/ui/icons'
import { useToast } from '@/contexts/ToastContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'

interface WorkspaceTopActionsProps {
  onOpenAssetLibrary: () => void
  onOpenSettings: () => void
  onRefresh: () => Promise<void> | void
  assetLibraryLabel: string
  settingsLabel: string
  refreshTitle: string
  headerSlot?: React.ReactNode
  episodeSlot?: React.ReactNode
}

export default function WorkspaceTopActions({
  onOpenAssetLibrary,
  onOpenSettings,
  onRefresh,
  assetLibraryLabel,
  settingsLabel,
  refreshTitle,
  headerSlot,
  episodeSlot,
}: WorkspaceTopActionsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { showToast } = useToast()
  const { data: session } = useSession()
  const t = useTranslations('nav')

  const handleRefreshClick = useCallback(async () => {
    if (isRefreshing) {
      return
    }

    try {
      setIsRefreshing(true)
      await Promise.resolve(onRefresh())
      showToast(refreshTitle, 'success', 2400)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[WorkspaceTopActions] 刷新失败', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [isRefreshing, onRefresh, refreshTitle, showToast])

  return (
    <div className="fixed top-4 left-0 right-0 z-40 flex items-center justify-between px-6">
      {/* Left: Logo + Episode + Nav */}
      <div className="flex items-center gap-2">
        <Link
          href={{ pathname: session ? '/workspace' : '/' }}
          className="glass-btn-base glass-btn-secondary flex items-center gap-2 px-3 py-3 rounded-3xl text-[var(--glass-text-primary)] group"
        >
          <AppIcon name="clapperboard" className="h-5 w-5 text-emerald-500 shrink-0 transition-transform group-hover:scale-110" />
          <span className="font-bold text-sm tracking-tight">
            Agent<span className="text-emerald-500">Cine</span>
          </span>
        </Link>

        {episodeSlot}

        {session && (
          <>
            <Link
              href={{ pathname: '/workspace' }}
              className="glass-btn-base glass-btn-secondary flex items-center gap-2 px-3 py-3 rounded-3xl text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)]"
            >
              <AppIcon name="monitor" className="h-4 w-4" />
              <span className="text-sm font-medium">{t('workspace')}</span>
            </Link>
            <Link
              href={{ pathname: '/workspace/asset-hub' }}
              className="glass-btn-base glass-btn-secondary flex items-center gap-2 px-3 py-3 rounded-3xl text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)]"
            >
              <AppIcon name="folderHeart" className="h-4 w-4" />
              <span className="text-sm font-medium">{t('assetHub')}</span>
            </Link>
            <Link
              href={{ pathname: '/profile' }}
              className="glass-btn-base glass-btn-secondary flex items-center gap-2 px-3 py-3 rounded-3xl text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)]"
            >
              <AppIcon name="userRoundCog" className="h-4 w-4" />
              <span className="text-sm font-medium">{t('profile')}</span>
            </Link>
            <LanguageSwitcher />
          </>
        )}
      </div>

      {/* Right: Mode toggle + Asset Library + Settings + Refresh */}
      <div className="flex items-center gap-3">
        {headerSlot}
        <button
          onClick={onOpenAssetLibrary}
          className="glass-btn-base glass-btn-secondary flex items-center gap-2 px-4 py-3 rounded-3xl text-[var(--glass-text-primary)]"
        >
          <AppIcon name="package" className="h-5 w-5" />
          <span className="font-semibold text-sm hidden md:inline tracking-[0.01em]">{assetLibraryLabel}</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="glass-btn-base glass-btn-secondary flex items-center gap-2 px-4 py-3 rounded-3xl text-[var(--glass-text-primary)]"
        >
          <AppIcon name="settingsHexMinor" className="h-5 w-5" />
          <span className="font-semibold text-sm hidden md:inline tracking-[0.01em]">{settingsLabel}</span>
        </button>
        <button
          onClick={handleRefreshClick}
          className={`glass-btn-base glass-btn-secondary flex items-center gap-2 px-4 py-3 rounded-3xl text-[var(--glass-text-primary)] ${
            isRefreshing ? 'opacity-60 cursor-wait' : ''
          }`}
          title={refreshTitle}
          disabled={isRefreshing}
        >
          <AppIcon name="refresh" className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  )
}
