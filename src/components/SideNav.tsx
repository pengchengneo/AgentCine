'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { AppIcon } from '@/components/ui/icons'
import type { AppIconName } from '@/components/ui/icons/registry'
import LanguageSwitcher from './LanguageSwitcher'

type NavItem = {
  icon: AppIconName
  label: string
  href?: string
  onClick?: () => void
}

export default function SideNav() {
  const { data: session, status } = useSession()
  const t = useTranslations('nav')
  const [expanded, setExpanded] = useState(false)

  const authItems: NavItem[] = session
    ? [
        { icon: 'monitor', label: t('workspace'), href: '/workspace' },
        { icon: 'folderHeart', label: t('assetHub'), href: '/workspace/asset-hub' },
        { icon: 'userRoundCog', label: t('profile'), href: '/profile' },
      ]
    : []

  const guestItems: NavItem[] = !session
    ? [
        { icon: 'user', label: t('signin'), href: '/auth/signin' },
        { icon: 'rocket', label: t('signup'), href: '/auth/signup' },
      ]
    : []

  const items = [...authItems, ...guestItems]

  if (status === 'loading') return null

  return (
    <nav
      className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1 py-3 px-1.5 rounded-2xl glass-surface-modal cinema-border-glow transition-all duration-300"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{ backdropFilter: 'blur(32px) saturate(1.4)' }}
    >
      {/* Logo */}
      <Link
        href={{ pathname: session ? '/workspace' : '/' }}
        className="flex items-center gap-2 px-2 py-2.5 rounded-xl hover:bg-[var(--glass-fill-hover)] transition-colors group mb-1"
      >
        <AppIcon name="clapperboard" className="h-5 w-5 text-emerald-500 shrink-0 transition-transform group-hover:scale-110" />
        {expanded && (
          <span className="text-sm font-bold tracking-tight text-[var(--glass-text-primary)] whitespace-nowrap cinema-fade-up" style={{ animationDuration: '0.2s' }}>
            Agent<span className="text-emerald-500">Cine</span>
          </span>
        )}
      </Link>

      <div className="w-6 h-px bg-[var(--glass-stroke-soft)] mx-auto my-1" />

      {/* Nav Items */}
      {items.map((item) => (
        <Link
          key={item.icon + item.label}
          href={{ pathname: item.href! }}
          className="flex items-center gap-2.5 px-2 py-2.5 rounded-xl text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)] hover:bg-[var(--glass-fill-hover)] transition-all group w-full"
        >
          <AppIcon name={item.icon} className="h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110" />
          {expanded && (
            <span className="text-sm font-medium whitespace-nowrap cinema-fade-up" style={{ animationDuration: '0.2s' }}>
              {item.label}
            </span>
          )}
        </Link>
      ))}

      <div className="w-6 h-px bg-[var(--glass-stroke-soft)] mx-auto my-1" />

      {/* Language Switcher - compact mode */}
      <div className={expanded ? '' : '[&_span]:hidden [&_svg:last-child]:hidden'}>
        <LanguageSwitcher />
      </div>
    </nav>
  )
}
