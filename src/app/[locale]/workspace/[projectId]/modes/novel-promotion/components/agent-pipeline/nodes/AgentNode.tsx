'use client'

import { memo } from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { AppIcon } from '@/components/ui/icons'
import type { AgentIdentity } from '@/lib/agent-pipeline/agent-identities'
import type { SubStepInfo, ActiveTaskInfo } from '@/lib/agent-pipeline/pipeline-types'
import { useTranslations } from 'next-intl'

export type AgentNodeData = {
  stepKey: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  identity: AgentIdentity
  subSteps: SubStepInfo[]
  activeTask?: ActiveTaskInfo | null
  duration?: number | null
  tokenUsage?: number
  error?: string | null
  isFirst?: boolean
  isLast?: boolean
}

export type AgentNodeType = Node<AgentNodeData, 'agent'>

const statusStyles = {
  completed: {
    border: '2px solid rgb(16 185 129)',
    background: 'rgba(16,185,129,0.10)',
    boxShadow: '0 0 16px 2px rgba(16,185,129,0.30)',
    opacity: 1,
    borderStyle: 'solid' as const,
  },
  running: {
    border: '2px solid rgb(245 158 11)',
    background: 'rgba(245,158,11,0.15)',
    boxShadow: '0 0 16px 2px rgba(245,158,11,0.35)',
    opacity: 1,
    borderStyle: 'solid' as const,
  },
  failed: {
    border: '2px solid rgb(239 68 68)',
    background: 'rgba(239,68,68,0.10)',
    boxShadow: '0 0 16px 2px rgba(239,68,68,0.30)',
    opacity: 1,
    borderStyle: 'solid' as const,
  },
  pending: {
    border: '1.5px dashed rgba(255,255,255,0.20)',
    background: 'rgba(255,255,255,0.05)',
    boxShadow: 'none',
    opacity: 0.5,
    borderStyle: 'dashed' as const,
  },
}

function AgentNodeInner({ data }: { data: AgentNodeData }) {
  const t = useTranslations('pipeline')
  const { status, identity, activeTask, error, isFirst, isLast } = data

  const style = statusStyles[status]

  const completedSubSteps = data.subSteps.filter((s) => s.status === 'completed').length
  const totalSubSteps = data.subSteps.length
  const progressPct = totalSubSteps > 0 ? Math.round((completedSubSteps / totalSubSteps) * 100) : 0

  return (
    <>
      <style>{`
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
        @keyframes pulse-subtle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
      `}</style>

      {!isFirst && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: 'rgba(255,255,255,0.3)', border: 'none', width: 8, height: 8 }}
        />
      )}

      <div
        className={`relative flex flex-col items-center gap-2 rounded-xl p-3 select-none${status === 'running' ? ' animate-pulse-subtle' : ''}`}
        style={{
          width: 160,
          minHeight: 140,
          border: style.border,
          background: style.background,
          boxShadow: style.boxShadow,
          opacity: style.opacity,
        }}
      >
        {/* Status badge top-right */}
        <div className="absolute -top-2.5 -right-2.5 z-10">
          {status === 'completed' && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 shadow">
              <AppIcon name="check" className="w-3 h-3 text-white" />
            </span>
          )}
          {status === 'running' && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 shadow">
              <AppIcon name="loader" className="w-3 h-3 text-white animate-spin" />
            </span>
          )}
          {status === 'failed' && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 shadow">
              <AppIcon name="close" className="w-3 h-3 text-white" />
            </span>
          )}
        </div>

        {/* Icon square */}
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${identity.gradientClass} flex items-center justify-center flex-shrink-0`}>
          <AppIcon name={identity.icon} className="w-5 h-5 text-white" />
        </div>

        {/* Name */}
        <div className="text-center">
          <p className="text-xs font-semibold text-white leading-tight">
            {t(identity.nameKey as Parameters<typeof t>[0])}
          </p>
          <p className={`text-[10px] leading-tight mt-0.5 ${identity.accentColor} opacity-80`}>
            {t(identity.roleKey as Parameters<typeof t>[0])}
          </p>
        </div>

        {/* Status-specific content */}
        {status === 'running' && (
          <div className="w-full mt-1 space-y-1.5">
            {/* Progress bar */}
            {totalSubSteps > 0 && (
              <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
            {/* Active task text */}
            {activeTask && (
              <p className="text-[9px] text-amber-300/80 text-center truncate leading-tight">
                {activeTask.targetType}
              </p>
            )}
          </div>
        )}

        {status === 'failed' && error && (
          <p className="text-[9px] text-red-300/80 text-center line-clamp-2 leading-tight mt-1">
            {error}
          </p>
        )}

        {status === 'completed' && data.duration != null && (
          <p className="text-[9px] text-emerald-300/70 text-center leading-tight">
            {data.duration}s
          </p>
        )}
      </div>

      {!isLast && (
        <Handle
          type="source"
          position={Position.Right}
          style={{ background: 'rgba(255,255,255,0.3)', border: 'none', width: 8, height: 8 }}
        />
      )}
    </>
  )
}

export const AgentNode = memo(AgentNodeInner)
