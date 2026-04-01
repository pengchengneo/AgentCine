'use client'

import { useCallback, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { AppIcon } from '@/components/ui/icons'
import { useToast } from '@/contexts/ToastContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'

const BTN = 'flex items-center gap-2 h-10 px-3.5 rounded-2xl text-sm font-medium bg-gradient-to-br from-orange-50/80 to-amber-50/60 border border-orange-200/50 text-orange-900/80 backdrop-blur-md shadow-sm hover:from-orange-100/90 hover:to-amber-100/70 hover:border-orange-300/60 hover:text-orange-900 transition-all'

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
    if (isRefreshing) return
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
          className={`${BTN} group`}
        >
          <AppIcon name="clapperboard" className="h-4 w-4 text-orange-600 shrink-0 transition-transform group-hover:scale-110" />
          <span className="font-bold tracking-tight">
            Agent<span className="text-orange-600">Cine</span>
          </span>
        </Link>

        {episodeSlot}

        {session && (
          <>
            <Link href={{ pathname: '/workspace' }} className={BTN}>
              <AppIcon name="monitor" className="h-4 w-4" />
              <span>{t('workspace')}</span>
            </Link>
            <Link href={{ pathname: '/workspace/asset-hub' }} className={BTN}>
              <AppIcon name="folderHeart" className="h-4 w-4" />
              <span>{t('assetHub')}</span>
            </Link>
            <Link href={{ pathname: '/profile' }} className={BTN}>
              <AppIcon name="userRoundCog" className="h-4 w-4" />
              <span>{t('profile')}</span>
            </Link>
            <LanguageSwitcher className={BTN} />
          </>
        )}
      </div>

      {/* Right: Mode toggle + Asset Library + Settings + Refresh */}
      <div className="flex items-center gap-2">
        {headerSlot}
        <button onClick={onOpenAssetLibrary} className={BTN}>
          <AppIcon name="package" className="h-4 w-4" />
          <span className="hidden md:inline">{assetLibraryLabel}</span>
        </button>
        <button onClick={onOpenSettings} className={BTN}>
          <AppIcon name="settingsHexMinor" className="h-4 w-4" />
          <span className="hidden md:inline">{settingsLabel}</span>
        </button>
        <button
          onClick={handleRefreshClick}
          className={`${BTN} ${isRefreshing ? 'opacity-60 cursor-wait' : ''}`}
          title={refreshTitle}
          disabled={isRefreshing}
        >
          <AppIcon name="refresh" className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  )
}
