#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()

// Pre-existing files that exceed limits — tracked for future refactoring
const GRANDFATHERED = new Set([
  'src/app/[locale]/profile/components/api-config/hooks.ts',
  'src/app/[locale]/profile/components/api-config/provider-card/hooks/useProviderCardState.ts',
  'src/app/[locale]/profile/components/api-config-tab/ApiConfigTabContainer.tsx',
  'src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/script-view/ScriptViewAssetsPanel.tsx',
  'src/app/[locale]/workspace/asset-hub/components/CharacterCard.tsx',
  'src/components/assistant/AssistantChatModal.tsx',
  'src/components/llm-console/LLMStageStreamCard.tsx',
  'src/components/shared/assets/GlobalAssetPicker.tsx',
  'src/components/ui/config-modals/ConfigEditModal.tsx',
  'src/components/ui/icons/custom.tsx',
  'src/components/ui/model-dropdown-innovative.tsx',
  'src/components/ui/model-dropdown-variants.tsx',
  'src/lib/query/hooks/run-stream/state-machine.ts',
  'src/lib/query/hooks/useTaskTargetStateMap.ts',
  'src/lib/workers/handlers/analyze-novel.ts',
  'src/lib/workers/handlers/image-task-handlers-core.ts',
  'src/lib/workers/handlers/script-to-storyboard-atomic-retry.ts',
  'src/lib/workers/handlers/script-to-storyboard.ts',
  'src/lib/workers/handlers/story-to-script.ts',
  'src/lib/workers/handlers/voice-analyze.ts',
  'src/lib/query/mutations/asset-hub-character-mutations.ts',
  'src/lib/query/mutations/asset-hub-location-mutations.ts',
  'src/lib/query/mutations/character-base-mutations.ts',
  'src/lib/query/mutations/location-image-mutations.ts',
  'src/lib/query/mutations/location-management-mutations.ts',
  'src/lib/query/mutations/storyboard-panel-mutations.ts',
])

const RULES = [
  {
    label: 'component',
    dir: 'src',
    include: (relPath) =>
      relPath.includes('/components/')
      && /\.(ts|tsx)$/.test(relPath),
    limit: 500,
  },
  {
    label: 'hook',
    dir: 'src',
    include: (relPath) =>
      (relPath.includes('/hooks/') || /\/use[A-Z].+\.(ts|tsx)$/.test(relPath))
      && /\.(ts|tsx)$/.test(relPath),
    limit: 400,
  },
  {
    label: 'worker-handler',
    dir: 'src/lib/workers/handlers',
    include: (relPath) => /\.(ts|tsx)$/.test(relPath),
    limit: 300,
  },
  {
    label: 'mutation',
    dir: 'src/lib/query/mutations',
    include: (relPath) => /\.(ts|tsx)$/.test(relPath) && !relPath.endsWith('/index.ts'),
    limit: 300,
  },
]

const walkFiles = (absDir, relBase = '') => {
  if (!fs.existsSync(absDir)) return []
  const entries = fs.readdirSync(absDir, { withFileTypes: true })
  const out = []
  for (const entry of entries) {
    const abs = path.join(absDir, entry.name)
    const rel = path.join(relBase, entry.name).replace(/\\/g, '/')
    if (entry.isDirectory()) {
      out.push(...walkFiles(abs, rel))
      continue
    }
    out.push({ absPath: abs, relPath: rel })
  }
  return out
}

const countLines = (absPath) => {
  const raw = fs.readFileSync(absPath, 'utf8')
  if (raw.length === 0) return 0
  return raw.split('\n').length
}

const violations = []

for (const rule of RULES) {
  const absDir = path.join(ROOT, rule.dir)
  const files = walkFiles(absDir, rule.dir).filter((f) => rule.include(f.relPath))
  for (const file of files) {
    const lineCount = countLines(file.absPath)
    if (lineCount > rule.limit && !GRANDFATHERED.has(file.relPath)) {
      violations.push({
        label: rule.label,
        relPath: file.relPath,
        lineCount,
        limit: rule.limit,
      })
    }
  }
}

if (violations.length === 0) {
  process.stdout.write('[file-line-count-guard] PASS\n')
  process.exit(0)
}

process.stderr.write('[file-line-count-guard] FAIL: file size budget exceeded\n')
for (const violation of violations) {
  process.stderr.write(
    `- [${violation.label}] ${violation.relPath}: ${violation.lineCount} > ${violation.limit}\n`,
  )
}
process.exit(1)
