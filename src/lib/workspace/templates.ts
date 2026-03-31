import type { AppIconName } from '@/components/ui/icons'

export type TemplateId = 'short-drama' | 'comic-mv' | 'storybook' | 'ad-clip' | 'novel-promo' | 'custom'

export interface ProjectTemplate {
  id: TemplateId
  icon: AppIconName
  nameKey: string
  descriptionKey: string
  defaults: {
    mode: 'novel-promotion'
  }
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'short-drama',
    icon: 'film',
    nameKey: 'templates.shortDrama.name',
    descriptionKey: 'templates.shortDrama.description',
    defaults: { mode: 'novel-promotion' },
  },
  {
    id: 'comic-mv',
    icon: 'clapperboard',
    nameKey: 'templates.comicMv.name',
    descriptionKey: 'templates.comicMv.description',
    defaults: { mode: 'novel-promotion' },
  },
  {
    id: 'storybook',
    icon: 'bookOpen',
    nameKey: 'templates.storybook.name',
    descriptionKey: 'templates.storybook.description',
    defaults: { mode: 'novel-promotion' },
  },
  {
    id: 'ad-clip',
    icon: 'sparkles',
    nameKey: 'templates.adClip.name',
    descriptionKey: 'templates.adClip.description',
    defaults: { mode: 'novel-promotion' },
  },
  {
    id: 'novel-promo',
    icon: 'scrollText',
    nameKey: 'templates.novelPromo.name',
    descriptionKey: 'templates.novelPromo.description',
    defaults: { mode: 'novel-promotion' },
  },
  {
    id: 'custom',
    icon: 'plus',
    nameKey: 'templates.custom.name',
    descriptionKey: 'templates.custom.description',
    defaults: { mode: 'novel-promotion' },
  },
]
