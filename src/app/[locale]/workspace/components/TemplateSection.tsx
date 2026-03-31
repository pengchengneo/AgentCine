'use client'

import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { PROJECT_TEMPLATES, type ProjectTemplate } from '@/lib/workspace/templates'

interface TemplateSectionProps {
  onSelectTemplate: (template: ProjectTemplate) => void
}

export default function TemplateSection({ onSelectTemplate }: TemplateSectionProps) {
  const t = useTranslations('workspace')

  return (
    <div className="cinema-fade-up" style={{ animationDelay: '80ms' }}>
      <h2 className="text-lg font-semibold text-[var(--glass-text-primary)] mb-4">
        {t('templates.sectionTitle')}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {PROJECT_TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template)}
            className="glass-surface p-4 text-left group hover:border-[var(--glass-tone-info-fg)]/40 transition-all duration-300 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--glass-accent-from)]/10 to-[var(--glass-accent-via)]/10 flex items-center justify-center mb-3 group-hover:from-[var(--glass-accent-from)]/20 group-hover:to-[var(--glass-accent-via)]/20 transition-all duration-300">
              <AppIcon
                name={template.icon}
                className="w-5 h-5 text-[var(--glass-accent-from)] group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <h3 className="text-sm font-semibold text-[var(--glass-text-primary)] mb-1 group-hover:text-[var(--glass-tone-info-fg)] transition-colors">
              {t(template.nameKey)}
            </h3>
            <p className="text-xs text-[var(--glass-text-tertiary)] line-clamp-2 leading-relaxed">
              {t(template.descriptionKey)}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
