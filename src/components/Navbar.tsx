'use client'

import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from './LanguageSwitcher'
import { AppIcon } from '@/components/ui/icons'
import UpdateNoticeModal from './UpdateNoticeModal'
import { useGithubReleaseUpdate } from '@/hooks/common/useGithubReleaseUpdate'
import { Clapperboard } from 'lucide-react'
import { Link } from '@/i18n/navigation'


export default function Navbar() {
  const { data: session, status } = useSession()
  const t = useTranslations('nav')
  const tc = useTranslations('common')
  const { currentVersion, update, shouldPulse, showModal, openModal, dismissCurrentUpdate } = useGithubReleaseUpdate()

  return (
    <>
      <nav className="glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Link href={{ pathname: session ? '/workspace' : '/' }} className="group flex items-center gap-1.5">
                <Clapperboard className="h-5 w-5 text-emerald-500 transition-transform group-hover:scale-110" />
                <span className="text-base font-bold tracking-tight text-(--glass-text-primary)">
                  Agent<span className="text-emerald-500">Cine</span>
                </span>
              </Link>
              <span className="text-[10px] font-medium text-(--glass-text-tertiary) bg-(--glass-bg-muted) rounded-full px-2 py-0.5">
                {currentVersion}
              </span>
              {update && (
                <button
                  type="button"
                  onClick={openModal}
                  className="relative inline-flex items-center gap-1 rounded-full border border-[var(--glass-tone-warning-fg)]/40 bg-[linear-gradient(135deg,var(--glass-tone-warning-bg),var(--glass-bg-surface-strong))] text-[var(--glass-tone-warning-fg)] px-2.5 py-0.5 text-[10px] font-semibold tracking-wide transition-all hover:brightness-105"
                  aria-label={tc('updateNotice.openDialog')}
                >
                  {shouldPulse && <span className="absolute -inset-1 animate-ping rounded-full bg-[var(--glass-tone-warning-fg)] opacity-20" />}
                  <AppIcon name="upload" className="h-3 w-3" />
                  {tc('updateNotice.updateTag')}
                </button>
              )}
            </div>

            {/* Center slot for workspace mode toggle */}
            <div id="navbar-center-slot" className="flex items-center" />

            <div className="flex items-center space-x-6">
              {status === 'loading' ? (
                /* Session 加载中骨架屏 */
                <div className="flex items-center space-x-4">
                  <div className="h-4 w-16 rounded-full bg-[var(--glass-bg-muted)] animate-pulse" />
                  <div className="h-4 w-16 rounded-full bg-[var(--glass-bg-muted)] animate-pulse" />
                  <div className="h-8 w-20 rounded-lg bg-[var(--glass-bg-muted)] animate-pulse" />
                </div>
              ) : session ? (
                <>
                  <Link
                    href={{ pathname: '/workspace' }}
                    className="text-sm text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)] font-medium transition-colors flex items-center gap-1"
                  >
                    <AppIcon name="monitor" className="w-4 h-4" />
                    {t('workspace')}
                  </Link>
                  <Link
                    href={{ pathname: '/workspace/asset-hub' }}
                    className="text-sm text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)] font-medium transition-colors flex items-center gap-1"
                  >
                    <AppIcon name="folderHeart" className="w-4 h-4" />
                    {t('assetHub')}
                  </Link>
                  <Link
                    href={{ pathname: '/profile' }}
                    className="text-sm text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)] font-medium transition-colors flex items-center gap-1"
                    title={t('profile')}
                  >
                    <AppIcon name="userRoundCog" className="w-5 h-5" />
                    {t('profile')}
                  </Link>
                  <LanguageSwitcher />
                </>

              ) : (
                <>
                  <Link
                    href={{ pathname: '/auth/signin' }}
                    className="text-sm text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)] font-medium transition-colors"
                  >
                    {t('signin')}
                  </Link>
                  <Link
                    href={{ pathname: '/auth/signup' }}
                    className="glass-btn-base glass-btn-primary px-4 py-2 text-sm font-medium"
                  >
                    {t('signup')}
                  </Link>
                  <LanguageSwitcher />
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      {update ? (
        <UpdateNoticeModal
          show={showModal}
          currentVersion={currentVersion}
          latestVersion={update.latestVersion}
          releaseUrl={update.releaseUrl}
          releaseName={update.releaseName}
          publishedAt={update.publishedAt}
          onDismiss={dismissCurrentUpdate}
        />
      ) : null}
    </>
  )
}
