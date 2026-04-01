'use client'

import SideNav from '@/components/SideNav'
import UpdateNoticeModal from '@/components/UpdateNoticeModal'
import { useGithubReleaseUpdate } from '@/hooks/common/useGithubReleaseUpdate'
import { AppIcon } from '@/components/ui/icons'
import { useTranslations } from 'next-intl'

interface AppShellProps {
  children: React.ReactNode
  /** Skip warm-decor background (e.g., Project Detail uses AnimatedBackground) */
  noWarmDecor?: boolean
  /** Skip bokeh orbs */
  noBokeh?: boolean
  /** Hide the left SideNav and remove left padding */
  hideSideNav?: boolean
}

export default function AppShell({ children, noWarmDecor, noBokeh, hideSideNav }: AppShellProps) {
  const tc = useTranslations('common')
  const { currentVersion, update, shouldPulse, showModal, openModal, dismissCurrentUpdate } = useGithubReleaseUpdate()

  return (
    <div className="glass-page min-h-screen overflow-x-hidden cinema-vignette cinema-grain">
      {/* Side Navigation */}
      {!hideSideNav && <SideNav />}

      {/* Background Decor */}
      {!noWarmDecor && <div className="cinema-bg-warm-decor" />}
      {!noBokeh && (
        <div className="cinema-bokeh">
          <div className="cinema-bokeh-orb cinema-bokeh-orb--coral cinema-light-breathe" />
          <div className="cinema-bokeh-orb cinema-bokeh-orb--violet cinema-light-breathe" style={{ animationDelay: '3s' }} />
          <div className="cinema-bokeh-orb cinema-bokeh-orb--amber cinema-light-breathe" style={{ animationDelay: '6s' }} />
          <div className="cinema-bokeh-orb cinema-bokeh-orb--emerald" />
        </div>
      )}

      {/* Version + Update Badge (floating top-right) */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        <span className="text-[10px] font-medium text-[var(--glass-text-tertiary)] bg-[var(--glass-bg-muted)] rounded-full px-2 py-0.5 backdrop-blur-sm">
          {currentVersion}
        </span>
        {update && (
          <button
            type="button"
            onClick={openModal}
            className="relative inline-flex items-center gap-1 rounded-full border border-[var(--glass-tone-warning-fg)]/40 bg-[linear-gradient(135deg,var(--glass-tone-warning-bg),var(--glass-bg-surface-strong))] text-[var(--glass-tone-warning-fg)] px-2.5 py-0.5 text-[10px] font-semibold tracking-wide transition-all hover:brightness-105 backdrop-blur-sm"
            aria-label={tc('updateNotice.openDialog')}
          >
            {shouldPulse && <span className="absolute -inset-1 animate-ping rounded-full bg-[var(--glass-tone-warning-fg)] opacity-20" />}
            <AppIcon name="upload" className="h-3 w-3" />
            {tc('updateNotice.updateTag')}
          </button>
        )}
      </div>

      {/* Main Content */}
      <main className={`relative z-10 ${hideSideNav ? '' : 'pl-20'}`}>
        {children}
      </main>

      {/* Update Modal */}
      {update && (
        <UpdateNoticeModal
          show={showModal}
          currentVersion={currentVersion}
          latestVersion={update.latestVersion}
          releaseUrl={update.releaseUrl}
          releaseName={update.releaseName}
          publishedAt={update.publishedAt}
          onDismiss={dismissCurrentUpdate}
        />
      )}
    </div>
  )
}
