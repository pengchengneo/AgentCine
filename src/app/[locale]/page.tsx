'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { useRouter } from '@/i18n/navigation'
import Navbar from '@/components/Navbar'
import { Link } from '@/i18n/navigation'
import { AppIcon } from '@/components/ui/icons'
import { Clapperboard } from 'lucide-react'

export default function Home() {
  const t = useTranslations('landing')
  const tc = useTranslations('common')
  const { status } = useSession()
  const router = useRouter()

  // 已登录用户自动跳转到 workspace
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace({ pathname: '/workspace' })
    }
  }, [status, router])

  // session 加载中或已登录（即将跳转），不渲染落地页，避免闪烁
  if (status !== 'unauthenticated') {
    return (
      <div className="glass-page min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Clapperboard className="h-12 w-12 text-emerald-500" />
          <span className="text-xl font-bold tracking-tight text-(--glass-text-primary)">
            Agent<span className="text-emerald-500">Cine</span>
          </span>
        </div>
      </div>
    )
  }

  const features = [
    {
      id: 'script',
      icon: <AppIcon name="fileText" className="w-8 h-8 text-blue-400" />,
      title: t('features.script.title'),
      description: t('features.script.description'),
      delay: '0.1s'
    },
    {
      id: 'storyboard',
      icon: <AppIcon name="layout" className="w-8 h-8 text-purple-400" />,
      title: t('features.storyboard.title'),
      description: t('features.storyboard.description'),
      delay: '0.2s'
    },
    {
      id: 'oneClickMovie',
      icon: <AppIcon name="video" className="w-8 h-8 text-pink-400" />,
      title: t('features.oneClickMovie.title'),
      description: t('features.oneClickMovie.description'),
      delay: '0.3s'
    },
    {
      id: 'oneClickEdit',
      icon: <AppIcon name="scissors" className="w-8 h-8 text-orange-400" />,
      title: t('features.oneClickEdit.title'),
      description: t('features.oneClickEdit.description'),
      delay: '0.4s'
    }
  ]

  return (
    <div className="glass-page min-h-screen overflow-x-hidden font-sans selection:bg-[var(--glass-tone-info-bg)]">
      {/* Navbar */}
      <div className="relative z-50">
        <Navbar />
      </div>

      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[radial-gradient(circle,rgba(59,130,246,0.08)_0%,transparent_70%)] blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-[radial-gradient(circle,rgba(139,92,246,0.08)_0%,transparent_70%)] blur-[120px]"></div>
        <div className="absolute inset-0 bg-[url('/images/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-[0.03]"></div>
      </div>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center pt-20 pb-16 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
              <div className="text-left space-y-10 animate-slide-up" style={{ animationDuration: '0.8s' }}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--glass-stroke-soft)] bg-[var(--glass-bg-surface-strong)]/50 backdrop-blur-md shadow-sm animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  <AppIcon name="sparkles" className="w-4 h-4 text-[var(--glass-tone-info-fg)]" />
                  <span className="text-xs font-bold tracking-wider uppercase text-[var(--glass-text-secondary)]">
                    Next Generation AI Film Workflow
                  </span>
                </div>

                <div className="space-y-4">
                  <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[1] animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <span className="block text-[var(--glass-text-primary)] drop-shadow-sm">
                      {t('title')}
                    </span>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                      AI Studio
                    </span>
                  </h1>
                  <p className="text-xl md:text-2xl text-[var(--glass-text-secondary)] max-w-xl leading-relaxed animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    {t('subtitle')}
                  </p>
                </div>

                <div className="flex flex-wrap gap-6 pt-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                  <Link
                    href={{ pathname: '/auth/signup' }}
                    className="glass-btn-base glass-btn-primary px-10 py-5 rounded-2xl font-bold text-lg shadow-[0_20px_40px_-12px_var(--glass-accent-shadow-soft)] hover:scale-105 active:scale-95 transition-all duration-300 group"
                  >
                    <span>{t('getStarted')}</span>
                    <AppIcon name="arrowRight" className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <button
                    onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                    className="glass-btn-base glass-btn-soft px-10 py-5 rounded-2xl font-bold text-lg hover:bg-[var(--glass-bg-surface-strong)] transition-all duration-300"
                  >
                    {t('learnMore')}
                  </button>
                </div>
                
                {/* Stats or trust elements */}
                <div className="flex items-center gap-12 pt-8 border-t border-[var(--glass-stroke-base)] w-fit animate-fade-in" style={{ animationDelay: '0.8s' }}>
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-[var(--glass-text-primary)]">10x</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--glass-text-tertiary)]">Efficiency</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-[var(--glass-text-primary)]">AI</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--glass-text-tertiary)]">Native</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-[var(--glass-text-primary)]">4K</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--glass-text-tertiary)]">Workflow</span>
                  </div>
                </div>
              </div>

              {/* Visual Asset Side */}
              <div className="relative hidden lg:block perspective-1000 animate-scale-in" style={{ animationDuration: '1.2s' }}>
                <div className="relative w-full aspect-[4/3] rounded-[40px] overflow-hidden glass-surface-modal shadow-2xl border-white/10 group">
                   {/* Fake UI / Movie Preview */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-black">
                    <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2025&auto=format&fit=crop')] bg-cover bg-center group-hover:scale-105 transition-transform duration-700"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                    
                    {/* Floating UI Elements */}
                    <div className="absolute top-8 left-8 p-4 rounded-2xl glass-surface-soft backdrop-blur-xl border-white/5 animate-float">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <AppIcon name="clapperboard" className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Generating</div>
                          <div className="text-xs font-bold text-white">Scene_04_Cinematic</div>
                        </div>
                      </div>
                    </div>

                    <div className="absolute bottom-8 right-8 p-4 rounded-2xl glass-surface-soft backdrop-blur-xl border-white/5 animate-float-delayed">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                          <AppIcon name="bolt" className="w-5 h-5 text-pink-400" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Optimizing</div>
                          <div className="text-xs font-bold text-white">4K Render Ready</div>
                        </div>
                      </div>
                    </div>

                    {/* Play Button Center */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:scale-110 transition-transform hover:bg-white/20">
                      <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white border-b-[10px] border-b-transparent ml-1"></div>
                    </div>
                    
                    {/* Timeline Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 w-2/3"></div>
                    </div>
                  </div>
                </div>
                
                {/* Decorative Blobs */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-[80px] -z-10 animate-pulse"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-[80px] -z-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
              </div>
            </div>
          </div>
        </section>

        {/* Features / Workflow Section */}
        <section id="features" className="relative py-24 px-4 bg-[var(--glass-bg-surface-strong)]/30">
          <div className="container mx-auto max-w-7xl text-center space-y-16">
            <div className="space-y-4 max-w-2xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-black text-[var(--glass-text-primary)]">
                {t('features.title')}
              </h2>
              <p className="text-[var(--glass-text-secondary)] text-lg">
                {t('features.subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature) => (
                <div 
                  key={feature.id}
                  className="group relative p-8 rounded-[32px] glass-surface hover:glass-surface-elevated transition-all duration-500 text-left space-y-6 hover:-translate-y-2"
                  style={{ animationDelay: feature.delay }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-[var(--glass-bg-muted)] flex items-center justify-center group-hover:scale-110 transition-transform duration-500 group-hover:rotate-3">
                    {feature.icon}
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-[var(--glass-text-primary)] group-hover:text-[var(--glass-tone-info-fg)] transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-[var(--glass-text-secondary)] leading-relaxed text-sm">
                      {feature.description}
                    </p>
                  </div>
                  
                  {/* Decorative number or accent */}
                  <div className="absolute top-4 right-8 text-4xl font-black text-[var(--glass-text-primary)]/5 select-none transition-all group-hover:text-[var(--glass-text-primary)]/10 group-hover:translate-x-2">
                    {feature.id === 'script' ? '01' : 
                     feature.id === 'storyboard' ? '02' : 
                     feature.id === 'oneClickMovie' ? '03' : '04'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative py-32 px-4 overflow-hidden">
          <div className="container mx-auto max-w-5xl">
            <div className="relative p-12 md:p-24 rounded-[48px] glass-surface-modal text-center space-y-10 overflow-hidden">
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)]"></div>
              
              <div className="space-y-4">
                <h2 className="text-4xl md:text-6xl font-black text-[var(--glass-text-primary)] leading-tight">
                  Ready to Create Your <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">First Masterpiece?</span>
                </h2>
                <p className="text-lg text-[var(--glass-text-secondary)] max-w-xl mx-auto">
                  Join thousands of creators using AgentCine to bring their stories to life with AI.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link
                  href={{ pathname: '/auth/signup' }}
                  className="glass-btn-base glass-btn-primary px-12 py-5 rounded-2xl font-bold text-xl w-full sm:w-auto shadow-2xl"
                >
                  {t('getStarted')}
                </Link>
                <Link
                   href={{ pathname: '/auth/signin' }}
                   className="glass-btn-base glass-btn-soft px-12 py-5 rounded-2xl font-bold text-xl w-full sm:w-auto"
                >
                   {tc('language.switchConfirmAction')}
                </Link>
              </div>
              
              <div className="pt-8 flex justify-center gap-8 text-[var(--glass-text-tertiary)] text-sm font-medium">
                <span className="flex items-center gap-2"><AppIcon name="sparkles" className="w-4 h-4" /> No CC Required</span>
                <span className="flex items-center gap-2"><AppIcon name="bolt" className="w-4 h-4" /> Instant Access</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-4 border-t border-[var(--glass-stroke-base)] bg-[var(--glass-bg-canvas)]">
        <div className="container mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <Clapperboard className="h-5 w-5 text-emerald-500 opacity-50 hover:opacity-100 transition-opacity" />
            <span className="text-sm font-bold tracking-tight text-(--glass-text-tertiary) hover:text-(--glass-text-primary) transition-colors">
              Agent<span className="text-emerald-500">Cine</span>
            </span>
          </div>
          
          <div className="flex gap-8 text-sm text-[var(--glass-text-tertiary)] font-medium">
            <a href="#" className="hover:text-[var(--glass-text-primary)] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[var(--glass-text-primary)] transition-colors">Terms</a>
            <a href="#" className="hover:text-[var(--glass-text-primary)] transition-colors">Documentation</a>
          </div>

          <p className="text-sm text-[var(--glass-text-tertiary)]">
            {t('footer.copyright')}
          </p>
        </div>
      </footer>
    </div>
  )
}
