'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { apiFetch } from '@/lib/api-fetch'
import { useRouter } from '@/i18n/navigation'
import { shouldGuideToModelSetup } from '@/lib/workspace/model-setup'
import { logError } from '@/lib/logging/core'

interface QuickCreateHeroProps {
  onProjectCreated: () => void
}

export default function QuickCreateHero({ onProjectCreated }: QuickCreateHeroProps) {
  const t = useTranslations('workspace')
  const [inputValue, setInputValue] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = inputValue.trim()
    if (!name) return

    setCreating(true)
    try {
      const response = await apiFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: '',
          mode: 'novel-promotion',
        }),
      })

      if (response.ok) {
        // Check model configuration
        let shouldOpenModelSetup = true
        const preferenceResponse = await apiFetch('/api/user-preference')
        if (preferenceResponse.ok) {
          const preferencePayload: unknown = await preferenceResponse.json()
          shouldOpenModelSetup = shouldGuideToModelSetup(preferencePayload)
        }

        setInputValue('')
        onProjectCreated()

        if (shouldOpenModelSetup) {
          alert(t('analysisModelRequiredAfterCreate'))
          router.push({ pathname: '/profile' })
        }
      } else {
        alert(t('createFailed'))
      }
    } catch (error) {
      logError('创建项目失败:', error)
      alert(t('createFailed'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="glass-surface-elevated p-6 sm:p-8 cinema-fade-up">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <AppIcon
            name="sparkles"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--glass-text-tertiary)]"
          />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('quickCreate.placeholder')}
            className="glass-input-base w-full pl-12 pr-4 py-4 text-base"
            maxLength={100}
            disabled={creating}
          />
        </div>
        <button
          type="submit"
          disabled={creating || !inputValue.trim()}
          className="glass-btn-base glass-btn-primary px-6 py-4 text-base flex-shrink-0"
        >
          {creating ? (
            <>
              <AppIcon name="loader" className="w-5 h-5 animate-spin" />
              {t('quickCreate.creating')}
            </>
          ) : (
            <>
              <AppIcon name="arrowRight" className="w-5 h-5" />
              {t('quickCreate.submit')}
            </>
          )}
        </button>
      </form>
    </div>
  )
}
