'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { useRouter } from '@/i18n/navigation'
import SideNav from '@/components/SideNav'
import { Link } from '@/i18n/navigation'
import { AppIcon } from '@/components/ui/icons'
import type { AppIconName } from '@/components/ui/icons/registry'

export default function Home() {
  const t = useTranslations('landing')
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace({ pathname: '/workspace' })
    }
  }, [status, router])

  if (status !== 'unauthenticated') {
    return (
      <div className="glass-page min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <AppIcon name="clapperboard" className="h-12 w-12 text-emerald-500" />
          <span className="text-xl font-bold tracking-tight text-[var(--glass-text-primary)]">
            Agent<span className="text-emerald-500">Cine</span>
          </span>
        </div>
      </div>
    )
  }

  const features: {
    id: string
    icon: AppIconName
    iconColor: string
    titleKey: string
    descKey: string
    detailKey: string
    highlights: string[]
  }[] = [
    {
      id: 'script',
      icon: 'fileText',
      iconColor: 'text-[var(--glass-accent-from)]',
      titleKey: 'features.script.title',
      descKey: 'features.script.description',
      detailKey: 'features.script.detail',
      highlights: ['features.script.highlights.h1', 'features.script.highlights.h2', 'features.script.highlights.h3'],
    },
    {
      id: 'storyboard',
      icon: 'layout',
      iconColor: 'text-[#a855f7]',
      titleKey: 'features.storyboard.title',
      descKey: 'features.storyboard.description',
      detailKey: 'features.storyboard.detail',
      highlights: ['features.storyboard.highlights.h1', 'features.storyboard.highlights.h2', 'features.storyboard.highlights.h3'],
    },
    {
      id: 'oneClickMovie',
      icon: 'video',
      iconColor: 'text-[#10b981]',
      titleKey: 'features.oneClickMovie.title',
      descKey: 'features.oneClickMovie.description',
      detailKey: 'features.oneClickMovie.detail',
      highlights: ['features.oneClickMovie.highlights.h1', 'features.oneClickMovie.highlights.h2', 'features.oneClickMovie.highlights.h3'],
    },
    {
      id: 'oneClickEdit',
      icon: 'scissors',
      iconColor: 'text-[#fbbf24]',
      titleKey: 'features.oneClickEdit.title',
      descKey: 'features.oneClickEdit.description',
      detailKey: 'features.oneClickEdit.detail',
      highlights: ['features.oneClickEdit.highlights.h1', 'features.oneClickEdit.highlights.h2', 'features.oneClickEdit.highlights.h3'],
    },
  ]

  const workflowSteps = [
    { icon: 'cloudUpload' as AppIconName, titleKey: 'workflow.step1.title', descKey: 'workflow.step1.desc', color: 'from-[var(--glass-accent-from)] to-[#f97066]' },
    { icon: 'brain' as AppIconName, titleKey: 'workflow.step2.title', descKey: 'workflow.step2.desc', color: 'from-[#a855f7] to-[#c084fc]' },
    { icon: 'film' as AppIconName, titleKey: 'workflow.step3.title', descKey: 'workflow.step3.desc', color: 'from-[#10b981] to-[#34d399]' },
    { icon: 'scissors' as AppIconName, titleKey: 'workflow.step4.title', descKey: 'workflow.step4.desc', color: 'from-[#fbbf24] to-[#fcd34d]' },
  ]

  return (
    <div className="glass-page min-h-screen overflow-x-hidden font-sans selection:bg-[var(--glass-tone-info-bg)] cinema-vignette cinema-grain">
      {/* Side Nav */}
      <SideNav />

      {/* Background Decor */}
      <div className="cinema-bg-warm-decor" />
      <div className="cinema-bokeh">
        <div className="cinema-bokeh-orb cinema-bokeh-orb--coral cinema-light-breathe" />
        <div className="cinema-bokeh-orb cinema-bokeh-orb--violet cinema-light-breathe" style={{ animationDelay: '3s' }} />
        <div className="cinema-bokeh-orb cinema-bokeh-orb--amber cinema-light-breathe" style={{ animationDelay: '6s' }} />
        <div className="cinema-bokeh-orb cinema-bokeh-orb--emerald" />
      </div>

      <main className="relative z-10">
        {/* ===================== HERO ===================== */}
        <section className="relative min-h-screen flex items-center justify-center px-6 py-20">
          <div className="max-w-5xl mx-auto text-center space-y-10 cinema-fade-up" style={{ animationDuration: '1s' }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--glass-stroke-soft)] bg-[var(--glass-bg-surface-strong)]/50 backdrop-blur-md shadow-sm cinema-focus-in" style={{ animationDelay: '0.1s' }}>
              <AppIcon name="sparkles" className="w-4 h-4 text-[var(--glass-tone-info-fg)]" />
              <span className="text-xs font-bold tracking-wider uppercase text-[var(--glass-text-secondary)]">
                {t('heroTagline')}
              </span>
            </div>

            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight leading-[0.95] cinema-focus-in" style={{ animationDelay: '0.2s' }}>
              <span className="block text-[var(--glass-text-primary)] drop-shadow-sm">
                {t('title')}
              </span>
              <span className="cinema-text-sunset">
                AI Studio
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-[var(--glass-text-secondary)] max-w-2xl mx-auto leading-relaxed cinema-focus-in" style={{ animationDelay: '0.4s' }}>
              {t('subtitle')}
            </p>

            <div className="flex flex-wrap justify-center gap-5 pt-4 cinema-focus-in" style={{ animationDelay: '0.6s' }}>
              <Link
                href={{ pathname: '/auth/signup' }}
                className="glass-btn-base glass-btn-primary px-10 py-5 rounded-2xl font-bold text-lg shadow-[0_20px_40px_-12px_var(--glass-accent-shadow-soft)] hover:scale-105 active:scale-95 transition-all duration-300 group"
              >
                <span>{t('getStarted')}</span>
                <AppIcon name="arrowRight" className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="glass-btn-base glass-btn-soft px-10 py-5 rounded-2xl font-bold text-lg hover:bg-[var(--glass-bg-surface-strong)] transition-all duration-300 group"
              >
                <AppIcon name="play" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>{t('learnMore')}</span>
              </button>
            </div>

            {/* Scroll indicator */}
            <div className="pt-16 flex flex-col items-center gap-2 animate-bounce cinema-focus-in" style={{ animationDelay: '1.2s' }}>
              <span className="text-xs text-[var(--glass-text-tertiary)] tracking-widest uppercase">Scroll</span>
              <AppIcon name="chevronDown" className="w-5 h-5 text-[var(--glass-text-tertiary)]" />
            </div>
          </div>
        </section>

        {/* ===================== FEATURE SECTIONS (alternating) ===================== */}
        <div id="features">
          {features.map((feature, idx) => {
            const isReversed = idx % 2 === 1
            const stepNum = String(idx + 1).padStart(2, '0')

            return (
              <section
                key={feature.id}
                className="relative py-24 md:py-32 px-6 overflow-hidden"
              >
                {/* Subtle section background */}
                {idx % 2 === 0 && (
                  <div className="absolute inset-0 bg-[var(--glass-bg-surface-strong)]/20" />
                )}

                <div className={`relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-24 items-center ${isReversed ? 'lg:[direction:rtl]' : ''}`}>
                  {/* Text Content */}
                  <div className={`space-y-8 ${isReversed ? 'lg:[direction:ltr]' : ''}`}>
                    <div className="flex items-center gap-4">
                      <span className="text-6xl font-black text-[var(--glass-text-primary)]/8 select-none">{stepNum}</span>
                      <div className={`w-14 h-14 rounded-2xl bg-[var(--glass-bg-muted)] flex items-center justify-center`}>
                        <AppIcon name={feature.icon} className={`w-7 h-7 ${feature.iconColor}`} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h2 className="text-4xl md:text-5xl font-black text-[var(--glass-text-primary)] leading-tight">
                        {t(feature.titleKey)}
                      </h2>
                      <p className="text-lg text-[var(--glass-text-secondary)] leading-relaxed">
                        {t(feature.detailKey)}
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      {feature.highlights.map((hKey, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <AppIcon name="check" className="w-3.5 h-3.5 text-emerald-500" />
                          </div>
                          <span className="text-[var(--glass-text-primary)] font-medium">{t(hKey)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Visual Card */}
                  <div className={`relative ${isReversed ? 'lg:[direction:ltr]' : ''}`}>
                    <div className="relative rounded-[32px] overflow-hidden glass-surface-modal shadow-2xl aspect-[4/3] cinema-border-glow">
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 to-black/80">
                        {/* Mock UI content */}
                        <div className="absolute inset-0 p-8 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
                              <div className={`w-2 h-2 rounded-full bg-emerald-400 animate-pulse`} />
                              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Processing</span>
                            </div>
                            <div className="text-[10px] font-mono text-white/30">{stepNum}/04</div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center`}>
                                <AppIcon name={feature.icon} className={`w-5 h-5 text-white/80`} />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-white/90">{t(feature.titleKey)}</div>
                                <div className="text-[10px] text-white/40">{t(feature.descKey)}</div>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[var(--glass-accent-from)] to-[#a855f7]"
                                style={{ width: `${25 + idx * 25}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Decorative blur blob */}
                    <div className={`absolute -z-10 w-48 h-48 rounded-full blur-[100px] opacity-30 ${
                      idx === 0 ? 'bg-[var(--glass-accent-from)] -top-12 -right-12' :
                      idx === 1 ? 'bg-[#a855f7] -bottom-12 -left-12' :
                      idx === 2 ? 'bg-emerald-400 -top-12 -left-12' :
                      'bg-amber-400 -bottom-12 -right-12'
                    }`} />
                  </div>
                </div>
              </section>
            )
          })}
        </div>

        {/* ===================== WORKFLOW STEPS ===================== */}
        <section className="relative py-24 md:py-32 px-6 bg-[var(--glass-bg-surface-strong)]/30">
          <div className="max-w-5xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-black text-[var(--glass-text-primary)]">
                {t('workflow.title')}
              </h2>
              <p className="text-lg text-[var(--glass-text-secondary)]">
                {t('workflow.subtitle')}
              </p>
            </div>

            <div className="relative">
              {/* Connection line */}
              <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--glass-accent-from)] via-[#a855f7] via-[#10b981] to-[#fbbf24] opacity-20 -translate-y-1/2" />

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {workflowSteps.map((step, idx) => (
                  <div key={idx} className="relative flex flex-col items-center text-center space-y-4 group">
                    <div className={`relative w-20 h-20 rounded-3xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                      <AppIcon name={step.icon} className="w-8 h-8 text-white" />
                      <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[var(--glass-bg-surface-strong)] border-2 border-[var(--glass-stroke-soft)] flex items-center justify-center text-xs font-black text-[var(--glass-text-primary)]">
                        {idx + 1}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[var(--glass-text-primary)]">{t(step.titleKey)}</h3>
                    <p className="text-sm text-[var(--glass-text-secondary)]">{t(step.descKey)}</p>

                    {/* Arrow between steps (desktop) */}
                    {idx < 3 && (
                      <div className="hidden md:block absolute top-10 -right-4 translate-x-1/2">
                        <AppIcon name="chevronRight" className="w-5 h-5 text-[var(--glass-text-tertiary)]" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===================== STATS / SHOWCASE ===================== */}
        <section className="relative py-24 md:py-32 px-6">
          <div className="max-w-5xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-black text-[var(--glass-text-primary)]">
                {t('showcase.title')}
              </h2>
              <p className="text-lg text-[var(--glass-text-secondary)]">
                {t('showcase.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {(['stat1', 'stat2', 'stat3', 'stat4'] as const).map((key) => (
                <div key={key} className="p-8 rounded-[28px] glass-surface cinema-hover-glow text-center space-y-3 hover:-translate-y-1 transition-all duration-500">
                  <div className="text-4xl md:text-5xl font-black cinema-text-sunset">
                    {t(`showcase.${key}.value`)}
                  </div>
                  <div className="text-sm font-bold text-[var(--glass-text-secondary)] uppercase tracking-wider">
                    {t(`showcase.${key}.label`)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== FINAL CTA ===================== */}
        <section className="relative py-32 px-6 overflow-hidden">
          <div className="max-w-5xl mx-auto">
            <div className="relative p-12 md:p-24 rounded-[48px] glass-surface-modal text-center space-y-10 overflow-hidden cinema-border-glow">
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(249,112,102,0.1),transparent_70%)]" />

              <div className="space-y-4">
                <h2 className="text-4xl md:text-6xl font-black text-[var(--glass-text-primary)] leading-tight">
                  {t('cta.title')} <br />
                  <span className="cinema-text-sunset">{t('cta.titleHighlight')}</span>
                </h2>
                <p className="text-lg text-[var(--glass-text-secondary)] max-w-xl mx-auto">
                  {t('cta.subtitle')}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link
                  href={{ pathname: '/auth/signup' }}
                  className="glass-btn-base glass-btn-primary px-12 py-5 rounded-2xl font-bold text-xl w-full sm:w-auto shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  {t('getStarted')}
                </Link>
                <Link
                  href={{ pathname: '/auth/signin' }}
                  className="glass-btn-base glass-btn-soft px-12 py-5 rounded-2xl font-bold text-xl w-full sm:w-auto"
                >
                  {t('footer.docs')}
                </Link>
              </div>

              <div className="pt-8 flex justify-center gap-8 text-[var(--glass-text-tertiary)] text-sm font-medium">
                <span className="flex items-center gap-2"><AppIcon name="sparkles" className="w-4 h-4" /> {t('cta.noCC')}</span>
                <span className="flex items-center gap-2"><AppIcon name="bolt" className="w-4 h-4" /> {t('cta.instant')}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 border-t border-[var(--glass-stroke-base)] bg-[var(--glass-bg-canvas)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <AppIcon name="clapperboard" className="h-5 w-5 text-emerald-500 opacity-50 hover:opacity-100 transition-opacity" />
            <span className="text-sm font-bold tracking-tight text-[var(--glass-text-tertiary)] hover:text-[var(--glass-text-primary)] transition-colors">
              Agent<span className="text-emerald-500">Cine</span>
            </span>
          </div>

          <div className="flex gap-8 text-sm text-[var(--glass-text-tertiary)] font-medium">
            <a href="#" className="hover:text-[var(--glass-text-primary)] transition-colors">{t('footer.privacy')}</a>
            <a href="#" className="hover:text-[var(--glass-text-primary)] transition-colors">{t('footer.terms')}</a>
            <a href="#" className="hover:text-[var(--glass-text-primary)] transition-colors">{t('footer.docs')}</a>
          </div>

          <p className="text-sm text-[var(--glass-text-tertiary)]">
            {t('footer.copyright')}
          </p>
        </div>
      </footer>
    </div>
  )
}
