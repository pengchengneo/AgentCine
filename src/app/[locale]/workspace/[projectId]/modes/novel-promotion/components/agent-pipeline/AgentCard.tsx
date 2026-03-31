'use client'

import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import type { AgentIdentity } from '@/lib/agent-pipeline/agent-identities'
import type { TokenUsage } from '../../hooks/usePipelineStatus'

const fmt = new Intl.NumberFormat()

type Props = {
  identity: AgentIdentity
  status: 'pending' | 'running' | 'completed' | 'failed'
  usage?: TokenUsage
}

export function AgentCard({ identity, status, usage }: Props) {
  const t = useTranslations('pipeline')
  const isActive = status === 'running'

  return (
    <div className="flex items-center gap-3 min-w-0">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className={`h-9 w-9 rounded-full bg-gradient-to-br ${identity.gradientClass} flex items-center justify-center`}
        >
          <AppIcon name={identity.icon} className="h-4.5 w-4.5 text-white" />
        </div>
        {isActive && (
          <div className="absolute -inset-0.5 rounded-full border-2 border-blue-400 animate-pulse" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-(--glass-text-primary) truncate">
            {t(identity.nameKey)}
          </span>
          {isActive && (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              {t('agentActive')}
            </span>
          )}
          {status === 'completed' && (
            <AppIcon name="checkCircle" className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          )}
          {status === 'failed' && (
            <AppIcon name="xCircle" className="h-3.5 w-3.5 text-red-400 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-(--glass-text-tertiary)">
          <span className="truncate">{t(identity.roleKey)}</span>
          {usage && usage.totalTokens > 0 && (
            <>
              <span className="shrink-0">·</span>
              <span className="shrink-0 font-mono">{fmt.format(usage.totalTokens)} tokens</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
