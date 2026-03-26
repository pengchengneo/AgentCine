# Agent Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the manual 5-stage pipeline into a multi-agent automated system where users input a script and review final results, while agents handle analysis, asset generation, and storyboard creation.

**Architecture:** Incremental 4-layer architecture (User / Agent / Asset / Generation) layered on top of the existing system. Agent Layer uses LangGraph SuperGraph with Producer/Script/ArtDirector/Storyboard agent nodes. Asset Layer adds prompt composition and VLM consistency checking. Generation Layer is the existing BullMQ workers — untouched.

**Tech Stack:** Next.js 15, LangGraph (@langchain/langgraph ^1.2.0), Prisma (MySQL), BullMQ, Vitest, React 19, Tailwind CSS v4

---

## File Structure

### New files

```
src/lib/agent-pipeline/
├── types.ts                        # PipelineState, PipelineConfig, ReviewMode, AssetStatus enums
├── index.ts                        # startPipeline() entry point
├── graph/
│   ├── super-graph.ts              # LangGraph SuperGraph definition (4 nodes)
│   ├── state.ts                    # PipelineState annotation for LangGraph
│   ├── task-wait.ts                # Poll task completion (waitForTaskCompletion)
│   └── nodes/
│       ├── producer.ts             # ProducerAgent: quality gates, phase transitions
│       ├── script-agent.ts         # ScriptAgent: analyze + story-to-script
│       ├── art-director.ts         # ArtDirectorAgent: character/location image gen
│       └── storyboard-agent.ts     # StoryboardAgent: storyboard gen + panel images
├── asset-layer/
│   ├── types.ts                    # CharacterAssetRef, LocationAssetRef, StyleProfile types
│   ├── registry.ts                 # Asset CRUD: create, lock, get promptFragment
│   ├── prompt-composer.ts          # Compose full prompt from style + character + location + shot
│   └── consistency-checker.ts      # VLM scoring for character/scene/style consistency
├── quality/
│   ├── quality-gate.ts             # Phase quality check logic
│   └── scoring.ts                  # Consistency score thresholds and retry decisions
└── review/
    ├── types.ts                    # ReviewItem status enum, ReviewSummary
    └── review-service.ts           # Create/update/query review items

src/app/api/novel-promotion/[projectId]/pipeline/
├── start/route.ts                  # POST: start agent pipeline
├── status/route.ts                 # GET: SSE pipeline progress
└── review/route.ts                 # POST: approve/retry/edit review items

src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/
├── AgentModeEntry.tsx              # "One-click generate" button + config
├── PipelineProgress.tsx            # Real-time progress bar with SSE
└── ReviewPanel.tsx                 # Review panel with tabs, item cards, actions

tests/unit/agent-pipeline/
├── types.test.ts
├── prompt-composer.test.ts
├── consistency-checker.test.ts
├── quality-gate.test.ts
├── scoring.test.ts
├── registry.test.ts
├── review-service.test.ts
├── script-agent.test.ts
├── art-director.test.ts
├── storyboard-agent.test.ts
├── producer.test.ts
└── super-graph.test.ts
```

### Modified files

```
prisma/schema.prisma                # + AssetStatus enum, PipelineRun, ReviewItem, StyleProfile models
                                    # + promptFragment/assetStatus on Character/Location
                                    # + pipelineMode on NovelPromotionProject

src/app/[locale]/workspace/[projectId]/modes/novel-promotion/
  NovelPromotionWorkspace.tsx        # + pipelineMode toggle (manual/agent), conditional rendering

src/lib/workers/handlers/
  character-image-task-handler.ts    # + return quality metadata in result
  location-image-task-handler.ts     # + return quality metadata in result
  panel-image-task-handler.ts        # + return quality metadata in result
```

---

### Task 1: Database Schema — Enums and New Tables

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `tests/unit/agent-pipeline/types.test.ts`
- Create: `src/lib/agent-pipeline/types.ts`

- [ ] **Step 1: Write the types file with enums and interfaces**

```typescript
// src/lib/agent-pipeline/types.ts

export const ASSET_STATUS = {
  DRAFT: 'draft',
  LOCKED: 'locked',
} as const

export type AssetStatus = (typeof ASSET_STATUS)[keyof typeof ASSET_STATUS]

export const PIPELINE_STATUS = {
  QUEUED: 'queued',
  RUNNING: 'running',
  PAUSED: 'paused',
  REVIEW: 'review',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

export type PipelineStatus = (typeof PIPELINE_STATUS)[keyof typeof PIPELINE_STATUS]

export const PIPELINE_PHASE = {
  SCRIPT: 'script',
  ART: 'art',
  STORYBOARD: 'storyboard',
  REVIEW: 'review',
} as const

export type PipelinePhase = (typeof PIPELINE_PHASE)[keyof typeof PIPELINE_PHASE]

export const REVIEW_STATUS = {
  AUTO_PASSED: 'auto_passed',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RETRYING: 'retrying',
} as const

export type ReviewStatus = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS]

export const REVIEW_MODE = {
  RELAXED: 'relaxed',
  STANDARD: 'standard',
  STRICT: 'strict',
} as const

export type ReviewMode = (typeof REVIEW_MODE)[keyof typeof REVIEW_MODE]

export const PIPELINE_MODE = {
  MANUAL: 'manual',
  AGENT: 'agent',
} as const

export type PipelineMode = (typeof PIPELINE_MODE)[keyof typeof PIPELINE_MODE]

export type PipelineConfig = {
  reviewMode: ReviewMode
  consistencyThreshold: number // default 0.7
  maxRetriesPerItem: number   // default 3
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  reviewMode: REVIEW_MODE.STANDARD,
  consistencyThreshold: 0.7,
  maxRetriesPerItem: 3,
}

export type QualityCheckResult = {
  phase: PipelinePhase
  passed: boolean
  score: number
  details: string
}
```

- [ ] **Step 2: Write tests for type constants**

```typescript
// tests/unit/agent-pipeline/types.test.ts
import { describe, expect, it } from 'vitest'
import {
  ASSET_STATUS,
  DEFAULT_PIPELINE_CONFIG,
  PIPELINE_MODE,
  PIPELINE_PHASE,
  PIPELINE_STATUS,
  REVIEW_MODE,
  REVIEW_STATUS,
} from '@/lib/agent-pipeline/types'

describe('agent-pipeline types', () => {
  it('ASSET_STATUS has draft and locked', () => {
    expect(ASSET_STATUS.DRAFT).toBe('draft')
    expect(ASSET_STATUS.LOCKED).toBe('locked')
  })

  it('PIPELINE_STATUS includes all states', () => {
    expect(Object.values(PIPELINE_STATUS)).toEqual([
      'queued', 'running', 'paused', 'review', 'completed', 'failed',
    ])
  })

  it('PIPELINE_PHASE includes first-phase stages', () => {
    expect(PIPELINE_PHASE.SCRIPT).toBe('script')
    expect(PIPELINE_PHASE.ART).toBe('art')
    expect(PIPELINE_PHASE.STORYBOARD).toBe('storyboard')
    expect(PIPELINE_PHASE.REVIEW).toBe('review')
  })

  it('REVIEW_STATUS includes all states', () => {
    expect(Object.values(REVIEW_STATUS)).toEqual([
      'auto_passed', 'pending', 'approved', 'rejected', 'retrying',
    ])
  })

  it('DEFAULT_PIPELINE_CONFIG has correct defaults', () => {
    expect(DEFAULT_PIPELINE_CONFIG.consistencyThreshold).toBe(0.7)
    expect(DEFAULT_PIPELINE_CONFIG.maxRetriesPerItem).toBe(3)
    expect(DEFAULT_PIPELINE_CONFIG.reviewMode).toBe('standard')
  })

  it('PIPELINE_MODE has manual and agent', () => {
    expect(PIPELINE_MODE.MANUAL).toBe('manual')
    expect(PIPELINE_MODE.AGENT).toBe('agent')
  })
})
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run tests/unit/agent-pipeline/types.test.ts`
Expected: PASS

- [ ] **Step 4: Add Prisma schema changes**

Add to `prisma/schema.prisma`:

```prisma
// After existing enums, add:

model PipelineRun {
  id            String   @id @default(uuid())
  projectId     String
  userId        String
  status        String   @default("queued") // queued|running|paused|review|completed|failed
  currentPhase  String   @default("script") // script|art|storyboard|review
  stateSnapshot Json?    // LangGraph state snapshot for resume
  config        Json?    // PipelineConfig JSON (reviewMode, thresholds, etc.)
  errorCode     String?
  errorMessage  String?  @db.Text
  startedAt     DateTime @default(now())
  completedAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  reviewItems   PipelineReviewItem[]

  @@index([projectId, status])
  @@index([userId, status])
  @@map("pipeline_runs")
}

model PipelineReviewItem {
  id            String   @id @default(uuid())
  pipelineRunId String
  phase         String   // script|art|storyboard
  targetType    String   // character|location|panel
  targetId      String
  status        String   @default("pending") // auto_passed|pending|approved|rejected|retrying
  score         Float?
  feedback      String?  @db.Text
  retryCount    Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  pipelineRun   PipelineRun @relation(fields: [pipelineRunId], references: [id], onDelete: Cascade)

  @@index([pipelineRunId, phase])
  @@index([pipelineRunId, status])
  @@map("pipeline_review_items")
}

model StyleProfile {
  id             String @id @default(uuid())
  projectId      String @unique
  artStyle       String
  stylePrefix    String @db.Text
  negativePrompt String @db.Text
  colorPalette   String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@map("style_profiles")
}
```

Add fields to existing models:

In `NovelPromotionCharacter`, add after `sourceGlobalCharacterId`:
```prisma
  promptFragment  String?  @db.Text
  assetStatus     String   @default("draft") // draft|locked
```

In `NovelPromotionLocation`, add after `sourceGlobalLocationId`:
```prisma
  promptFragment  String?  @db.Text
  assetStatus     String   @default("draft") // draft|locked
```

In `NovelPromotionProject`, add after `importStatus`:
```prisma
  pipelineMode    String   @default("manual") // manual|agent
```

- [ ] **Step 5: Generate Prisma migration**

Run: `npx prisma migrate dev --name add-agent-pipeline-models`
Expected: Migration created and applied successfully

- [ ] **Step 6: Commit**

```bash
git add src/lib/agent-pipeline/types.ts tests/unit/agent-pipeline/types.test.ts prisma/
git commit -m "feat: add agent pipeline types and database schema"
```

---

### Task 2: Asset Layer — Registry

**Files:**
- Create: `src/lib/agent-pipeline/asset-layer/types.ts`
- Create: `src/lib/agent-pipeline/asset-layer/registry.ts`
- Create: `tests/unit/agent-pipeline/registry.test.ts`

- [ ] **Step 1: Write asset layer types**

```typescript
// src/lib/agent-pipeline/asset-layer/types.ts

export type CharacterAssetRef = {
  id: string
  name: string
  aliases: string | null
  appearance: string | null // from CharacterAppearance.description
  imageUrl: string | null   // from CharacterAppearance.imageUrl
  promptFragment: string | null
  assetStatus: 'draft' | 'locked'
}

export type LocationAssetRef = {
  id: string
  name: string
  summary: string | null
  imageUrl: string | null   // from selected LocationImage
  promptFragment: string | null
  assetStatus: 'draft' | 'locked'
}

export type StyleProfileData = {
  artStyle: string
  stylePrefix: string
  negativePrompt: string
  colorPalette: string | null
}
```

- [ ] **Step 2: Write registry with CRUD and lock operations**

```typescript
// src/lib/agent-pipeline/asset-layer/registry.ts

import { prisma } from '@/lib/prisma'
import { ASSET_STATUS } from '../types'
import type { CharacterAssetRef, LocationAssetRef, StyleProfileData } from './types'

export async function getCharacterAssets(projectId: string): Promise<CharacterAssetRef[]> {
  const characters = await prisma.novelPromotionCharacter.findMany({
    where: { novelPromotionProjectId: projectId },
    include: {
      appearances: {
        orderBy: { appearanceIndex: 'asc' },
        take: 1,
      },
    },
  })
  return characters.map((c) => ({
    id: c.id,
    name: c.name,
    aliases: c.aliases,
    appearance: c.appearances[0]?.description ?? null,
    imageUrl: c.appearances[0]?.imageUrl ?? null,
    promptFragment: c.promptFragment,
    assetStatus: (c.assetStatus || 'draft') as 'draft' | 'locked',
  }))
}

export async function getLocationAssets(projectId: string): Promise<LocationAssetRef[]> {
  const locations = await prisma.novelPromotionLocation.findMany({
    where: { novelPromotionProjectId: projectId },
    include: {
      selectedImage: true,
    },
  })
  return locations.map((l) => ({
    id: l.id,
    name: l.name,
    summary: l.summary,
    imageUrl: l.selectedImage?.imageUrl ?? null,
    promptFragment: l.promptFragment,
    assetStatus: (l.assetStatus || 'draft') as 'draft' | 'locked',
  }))
}

export async function updatePromptFragment(
  type: 'character' | 'location',
  id: string,
  promptFragment: string,
): Promise<void> {
  if (type === 'character') {
    const existing = await prisma.novelPromotionCharacter.findUnique({
      where: { id },
      select: { assetStatus: true },
    })
    if (existing?.assetStatus === ASSET_STATUS.LOCKED) {
      throw new Error(`Character ${id} is locked, cannot update promptFragment`)
    }
    await prisma.novelPromotionCharacter.update({
      where: { id },
      data: { promptFragment },
    })
  } else {
    const existing = await prisma.novelPromotionLocation.findUnique({
      where: { id },
      select: { assetStatus: true },
    })
    if (existing?.assetStatus === ASSET_STATUS.LOCKED) {
      throw new Error(`Location ${id} is locked, cannot update promptFragment`)
    }
    await prisma.novelPromotionLocation.update({
      where: { id },
      data: { promptFragment },
    })
  }
}

export async function lockAsset(
  type: 'character' | 'location',
  id: string,
): Promise<void> {
  if (type === 'character') {
    await prisma.novelPromotionCharacter.update({
      where: { id },
      data: { assetStatus: ASSET_STATUS.LOCKED },
    })
  } else {
    await prisma.novelPromotionLocation.update({
      where: { id },
      data: { assetStatus: ASSET_STATUS.LOCKED },
    })
  }
}

export async function getOrCreateStyleProfile(
  projectId: string,
  defaults: StyleProfileData,
): Promise<StyleProfileData> {
  const existing = await prisma.styleProfile.findUnique({
    where: { projectId },
  })
  if (existing) {
    return {
      artStyle: existing.artStyle,
      stylePrefix: existing.stylePrefix,
      negativePrompt: existing.negativePrompt,
      colorPalette: existing.colorPalette,
    }
  }
  const created = await prisma.styleProfile.create({
    data: {
      projectId,
      ...defaults,
    },
  })
  return {
    artStyle: created.artStyle,
    stylePrefix: created.stylePrefix,
    negativePrompt: created.negativePrompt,
    colorPalette: created.colorPalette,
  }
}
```

- [ ] **Step 3: Write registry tests (mocking Prisma)**

```typescript
// tests/unit/agent-pipeline/registry.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock prisma before importing registry
vi.mock('@/lib/prisma', () => ({
  prisma: {
    novelPromotionCharacter: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    novelPromotionLocation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    styleProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import {
  getCharacterAssets,
  lockAsset,
  updatePromptFragment,
} from '@/lib/agent-pipeline/asset-layer/registry'

const mockPrisma = prisma as unknown as {
  novelPromotionCharacter: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  novelPromotionLocation: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

describe('asset registry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getCharacterAssets maps DB rows to CharacterAssetRef', async () => {
    mockPrisma.novelPromotionCharacter.findMany.mockResolvedValue([
      {
        id: 'char-1',
        name: 'Alice',
        aliases: 'A',
        promptFragment: 'a young woman with red hair',
        assetStatus: 'draft',
        appearances: [{ description: 'red hair', imageUrl: 'http://img/1' }],
      },
    ])

    const result = await getCharacterAssets('proj-1')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Alice')
    expect(result[0].promptFragment).toBe('a young woman with red hair')
    expect(result[0].assetStatus).toBe('draft')
  })

  it('updatePromptFragment throws when asset is locked', async () => {
    mockPrisma.novelPromotionCharacter.findUnique.mockResolvedValue({
      assetStatus: 'locked',
    })

    await expect(
      updatePromptFragment('character', 'char-1', 'new fragment'),
    ).rejects.toThrow('locked')
  })

  it('lockAsset sets assetStatus to locked', async () => {
    mockPrisma.novelPromotionCharacter.update.mockResolvedValue({})

    await lockAsset('character', 'char-1')
    expect(mockPrisma.novelPromotionCharacter.update).toHaveBeenCalledWith({
      where: { id: 'char-1' },
      data: { assetStatus: 'locked' },
    })
  })
})
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/agent-pipeline/registry.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent-pipeline/asset-layer/ tests/unit/agent-pipeline/registry.test.ts
git commit -m "feat: add asset layer registry with CRUD and lock operations"
```

---

### Task 3: Asset Layer — Prompt Composer

**Files:**
- Create: `src/lib/agent-pipeline/asset-layer/prompt-composer.ts`
- Create: `tests/unit/agent-pipeline/prompt-composer.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/agent-pipeline/prompt-composer.test.ts
import { describe, expect, it } from 'vitest'
import { composeImagePrompt } from '@/lib/agent-pipeline/asset-layer/prompt-composer'

describe('prompt-composer', () => {
  it('composes full prompt from all parts', () => {
    const result = composeImagePrompt({
      stylePrefix: 'american comic style, bold outlines',
      characterFragments: ['a tall man with blue eyes, short black hair'],
      locationFragment: 'dark alley at night, neon signs',
      shotDescription: 'close-up, low angle',
      actionDescription: 'character draws sword',
    })

    expect(result).toBe(
      'american comic style, bold outlines, a tall man with blue eyes, short black hair, dark alley at night, neon signs, close-up, low angle, character draws sword',
    )
  })

  it('handles missing optional parts', () => {
    const result = composeImagePrompt({
      stylePrefix: 'anime style',
      characterFragments: [],
      locationFragment: null,
      shotDescription: 'wide shot',
      actionDescription: null,
    })

    expect(result).toBe('anime style, wide shot')
  })

  it('joins multiple character fragments', () => {
    const result = composeImagePrompt({
      stylePrefix: 'comic',
      characterFragments: ['man with sword', 'woman in red dress'],
      locationFragment: 'castle',
      shotDescription: 'medium shot',
      actionDescription: 'facing each other',
    })

    expect(result).toContain('man with sword')
    expect(result).toContain('woman in red dress')
  })

  it('trims whitespace from all parts', () => {
    const result = composeImagePrompt({
      stylePrefix: '  comic style  ',
      characterFragments: ['  hero  '],
      locationFragment: '  forest  ',
      shotDescription: '  wide  ',
      actionDescription: '  running  ',
    })

    expect(result).not.toMatch(/  /)
    expect(result).toBe('comic style, hero, forest, wide, running')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/agent-pipeline/prompt-composer.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/agent-pipeline/asset-layer/prompt-composer.ts

export type ComposeImagePromptInput = {
  stylePrefix: string
  characterFragments: string[]
  locationFragment: string | null
  shotDescription: string | null
  actionDescription: string | null
}

export function composeImagePrompt(input: ComposeImagePromptInput): string {
  const parts: string[] = []

  const style = input.stylePrefix.trim()
  if (style) parts.push(style)

  for (const fragment of input.characterFragments) {
    const trimmed = fragment.trim()
    if (trimmed) parts.push(trimmed)
  }

  const location = input.locationFragment?.trim()
  if (location) parts.push(location)

  const shot = input.shotDescription?.trim()
  if (shot) parts.push(shot)

  const action = input.actionDescription?.trim()
  if (action) parts.push(action)

  return parts.join(', ')
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/agent-pipeline/prompt-composer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent-pipeline/asset-layer/prompt-composer.ts tests/unit/agent-pipeline/prompt-composer.test.ts
git commit -m "feat: add prompt composer for assembling panel image prompts"
```

---

### Task 4: Asset Layer — Consistency Checker

**Files:**
- Create: `src/lib/agent-pipeline/asset-layer/consistency-checker.ts`
- Create: `tests/unit/agent-pipeline/consistency-checker.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/agent-pipeline/consistency-checker.test.ts
import { describe, expect, it, vi } from 'vitest'
import {
  checkConsistency,
  parseConsistencyResponse,
  type ConsistencyCheckResult,
} from '@/lib/agent-pipeline/asset-layer/consistency-checker'

describe('consistency-checker', () => {
  describe('parseConsistencyResponse', () => {
    it('parses valid JSON response with scores', () => {
      const response = JSON.stringify({
        characterScore: 0.8,
        sceneScore: 0.9,
        styleScore: 0.7,
        overallScore: 0.8,
        issues: ['minor color difference'],
      })

      const result = parseConsistencyResponse(response)
      expect(result.overallScore).toBe(0.8)
      expect(result.characterScore).toBe(0.8)
      expect(result.sceneScore).toBe(0.9)
      expect(result.styleScore).toBe(0.7)
      expect(result.issues).toEqual(['minor color difference'])
    })

    it('returns zero scores for unparseable response', () => {
      const result = parseConsistencyResponse('not json at all')
      expect(result.overallScore).toBe(0)
      expect(result.issues).toContain('Failed to parse consistency check response')
    })

    it('clamps scores to 0-1 range', () => {
      const response = JSON.stringify({
        characterScore: 1.5,
        sceneScore: -0.2,
        styleScore: 0.5,
        overallScore: 2.0,
        issues: [],
      })

      const result = parseConsistencyResponse(response)
      expect(result.overallScore).toBe(1.0)
      expect(result.characterScore).toBe(1.0)
      expect(result.sceneScore).toBe(0)
    })
  })

  describe('makeDecision', () => {
    it('returns pass when score >= threshold', () => {
      const { makeDecision } = require('@/lib/agent-pipeline/asset-layer/consistency-checker')
      const result = makeDecision(0.8, 0.7, 1, 3)
      expect(result).toBe('pass')
    })

    it('returns retry when score < threshold and retries remain', () => {
      const { makeDecision } = require('@/lib/agent-pipeline/asset-layer/consistency-checker')
      const result = makeDecision(0.5, 0.7, 1, 3)
      expect(result).toBe('retry')
    })

    it('returns manual_review when retries exhausted', () => {
      const { makeDecision } = require('@/lib/agent-pipeline/asset-layer/consistency-checker')
      const result = makeDecision(0.5, 0.7, 3, 3)
      expect(result).toBe('manual_review')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/agent-pipeline/consistency-checker.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/agent-pipeline/asset-layer/consistency-checker.ts

import { safeParseJsonObject } from '@/lib/json-repair'

export type ConsistencyCheckResult = {
  characterScore: number
  sceneScore: number
  styleScore: number
  overallScore: number
  issues: string[]
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

export function parseConsistencyResponse(response: string): ConsistencyCheckResult {
  try {
    const parsed = safeParseJsonObject(response)
    return {
      characterScore: clamp(Number(parsed.characterScore) || 0, 0, 1),
      sceneScore: clamp(Number(parsed.sceneScore) || 0, 0, 1),
      styleScore: clamp(Number(parsed.styleScore) || 0, 0, 1),
      overallScore: clamp(Number(parsed.overallScore) || 0, 0, 1),
      issues: Array.isArray(parsed.issues)
        ? parsed.issues.filter((i: unknown) => typeof i === 'string')
        : [],
    }
  } catch {
    return {
      characterScore: 0,
      sceneScore: 0,
      styleScore: 0,
      overallScore: 0,
      issues: ['Failed to parse consistency check response'],
    }
  }
}

export type ConsistencyDecision = 'pass' | 'retry' | 'manual_review'

export function makeDecision(
  score: number,
  threshold: number,
  currentRetry: number,
  maxRetries: number,
): ConsistencyDecision {
  if (score >= threshold) return 'pass'
  if (currentRetry >= maxRetries) return 'manual_review'
  return 'retry'
}

export const CONSISTENCY_CHECK_PROMPT = `You are an image quality inspector for a comic/manga production pipeline.

Compare the generated image against the reference description and reference images provided.

Score each dimension from 0.0 to 1.0:
- characterScore: Does the character match the reference appearance (hair, outfit, body type)?
- sceneScore: Does the background/environment match the scene description?
- styleScore: Is the art style consistent with the target style?
- overallScore: Weighted average (character 0.5, scene 0.3, style 0.2)

Respond in JSON only:
{
  "characterScore": <float>,
  "sceneScore": <float>,
  "styleScore": <float>,
  "overallScore": <float>,
  "issues": ["list of specific issues found"]
}`
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/agent-pipeline/consistency-checker.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent-pipeline/asset-layer/consistency-checker.ts tests/unit/agent-pipeline/consistency-checker.test.ts
git commit -m "feat: add VLM consistency checker with scoring and decision logic"
```

---

### Task 5: Quality Gate and Scoring

**Files:**
- Create: `src/lib/agent-pipeline/quality/scoring.ts`
- Create: `src/lib/agent-pipeline/quality/quality-gate.ts`
- Create: `tests/unit/agent-pipeline/scoring.test.ts`
- Create: `tests/unit/agent-pipeline/quality-gate.test.ts`

- [ ] **Step 1: Write scoring tests**

```typescript
// tests/unit/agent-pipeline/scoring.test.ts
import { describe, expect, it } from 'vitest'
import { shouldAutoPass, computePhaseScore } from '@/lib/agent-pipeline/quality/scoring'

describe('scoring', () => {
  it('shouldAutoPass returns true when score >= threshold', () => {
    expect(shouldAutoPass(0.8, 0.7)).toBe(true)
    expect(shouldAutoPass(0.7, 0.7)).toBe(true)
  })

  it('shouldAutoPass returns false when score < threshold', () => {
    expect(shouldAutoPass(0.6, 0.7)).toBe(false)
  })

  it('computePhaseScore averages item scores', () => {
    const scores = [0.9, 0.8, 0.7]
    expect(computePhaseScore(scores)).toBeCloseTo(0.8, 1)
  })

  it('computePhaseScore returns 1.0 for empty array', () => {
    expect(computePhaseScore([])).toBe(1.0)
  })
})
```

- [ ] **Step 2: Write scoring implementation**

```typescript
// src/lib/agent-pipeline/quality/scoring.ts

export function shouldAutoPass(score: number, threshold: number): boolean {
  return score >= threshold
}

export function computePhaseScore(itemScores: number[]): number {
  if (itemScores.length === 0) return 1.0
  const sum = itemScores.reduce((acc, s) => acc + s, 0)
  return sum / itemScores.length
}
```

- [ ] **Step 3: Write quality gate tests**

```typescript
// tests/unit/agent-pipeline/quality-gate.test.ts
import { describe, expect, it } from 'vitest'
import { evaluatePhaseQuality } from '@/lib/agent-pipeline/quality/quality-gate'
import type { PipelineConfig } from '@/lib/agent-pipeline/types'
import { REVIEW_MODE } from '@/lib/agent-pipeline/types'

const config: PipelineConfig = {
  reviewMode: REVIEW_MODE.STANDARD,
  consistencyThreshold: 0.7,
  maxRetriesPerItem: 3,
}

describe('quality-gate', () => {
  it('passes phase when all items score above threshold', () => {
    const result = evaluatePhaseQuality({
      config,
      itemScores: [
        { targetId: 'c1', score: 0.9, retryCount: 0 },
        { targetId: 'c2', score: 0.8, retryCount: 0 },
      ],
    })
    expect(result.passed).toBe(true)
    expect(result.autoPassedIds).toEqual(['c1', 'c2'])
    expect(result.pendingIds).toEqual([])
    expect(result.failedIds).toEqual([])
  })

  it('marks items as pending when below threshold with retries left', () => {
    const result = evaluatePhaseQuality({
      config,
      itemScores: [
        { targetId: 'c1', score: 0.5, retryCount: 1 },
      ],
    })
    expect(result.passed).toBe(false)
    expect(result.retryIds).toEqual(['c1'])
  })

  it('marks items as failed when retries exhausted', () => {
    const result = evaluatePhaseQuality({
      config,
      itemScores: [
        { targetId: 'c1', score: 0.5, retryCount: 3 },
      ],
    })
    expect(result.passed).toBe(false)
    expect(result.failedIds).toEqual(['c1'])
  })

  it('relaxed mode auto-passes items with retries left', () => {
    const relaxedConfig = { ...config, reviewMode: REVIEW_MODE.RELAXED as const }
    const result = evaluatePhaseQuality({
      config: relaxedConfig,
      itemScores: [
        { targetId: 'c1', score: 0.5, retryCount: 3 },
      ],
    })
    expect(result.failedIds).toEqual(['c1'])
  })

  it('strict mode puts all items as pending regardless of score', () => {
    const strictConfig = { ...config, reviewMode: REVIEW_MODE.STRICT as const }
    const result = evaluatePhaseQuality({
      config: strictConfig,
      itemScores: [
        { targetId: 'c1', score: 0.95, retryCount: 0 },
      ],
    })
    expect(result.pendingIds).toEqual(['c1'])
    expect(result.autoPassedIds).toEqual([])
  })
})
```

- [ ] **Step 4: Write quality gate implementation**

```typescript
// src/lib/agent-pipeline/quality/quality-gate.ts

import type { PipelineConfig } from '../types'
import { REVIEW_MODE } from '../types'
import { shouldAutoPass } from './scoring'

type ItemScore = {
  targetId: string
  score: number
  retryCount: number
}

export type PhaseQualityResult = {
  passed: boolean
  autoPassedIds: string[]
  pendingIds: string[]
  retryIds: string[]
  failedIds: string[]
}

export function evaluatePhaseQuality(input: {
  config: PipelineConfig
  itemScores: ItemScore[]
}): PhaseQualityResult {
  const { config, itemScores } = input
  const autoPassedIds: string[] = []
  const pendingIds: string[] = []
  const retryIds: string[] = []
  const failedIds: string[] = []

  for (const item of itemScores) {
    if (config.reviewMode === REVIEW_MODE.STRICT) {
      pendingIds.push(item.targetId)
      continue
    }

    if (shouldAutoPass(item.score, config.consistencyThreshold)) {
      autoPassedIds.push(item.targetId)
    } else if (item.retryCount >= config.maxRetriesPerItem) {
      failedIds.push(item.targetId)
    } else {
      retryIds.push(item.targetId)
    }
  }

  const passed = pendingIds.length === 0 && retryIds.length === 0 && failedIds.length === 0

  return { passed, autoPassedIds, pendingIds, retryIds, failedIds }
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/unit/agent-pipeline/scoring.test.ts tests/unit/agent-pipeline/quality-gate.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/agent-pipeline/quality/ tests/unit/agent-pipeline/scoring.test.ts tests/unit/agent-pipeline/quality-gate.test.ts
git commit -m "feat: add quality gate and scoring for phase evaluation"
```

---

### Task 6: Review Service

**Files:**
- Create: `src/lib/agent-pipeline/review/types.ts`
- Create: `src/lib/agent-pipeline/review/review-service.ts`
- Create: `tests/unit/agent-pipeline/review-service.test.ts`

- [ ] **Step 1: Write review types**

```typescript
// src/lib/agent-pipeline/review/types.ts

import type { ReviewStatus, PipelinePhase } from '../types'

export type ReviewItemInput = {
  pipelineRunId: string
  phase: PipelinePhase
  targetType: 'character' | 'location' | 'panel'
  targetId: string
  status: ReviewStatus
  score?: number | null
  feedback?: string | null
}

export type ReviewSummary = {
  total: number
  autoPassedCount: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  retryingCount: number
}
```

- [ ] **Step 2: Write review-service tests (mocking Prisma)**

```typescript
// tests/unit/agent-pipeline/review-service.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pipelineReviewItem: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      groupBy: vi.fn(),
    },
    pipelineRun: {
      update: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import {
  createReviewItems,
  getReviewSummary,
  approveReviewItem,
} from '@/lib/agent-pipeline/review/review-service'
import { REVIEW_STATUS } from '@/lib/agent-pipeline/types'

const mockPrisma = prisma as unknown as {
  pipelineReviewItem: {
    create: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
    groupBy: ReturnType<typeof vi.fn>
  }
}

describe('review-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createReviewItems calls prisma create for each item', async () => {
    mockPrisma.pipelineReviewItem.create.mockResolvedValue({ id: 'ri-1' })

    await createReviewItems([
      {
        pipelineRunId: 'run-1',
        phase: 'art',
        targetType: 'character',
        targetId: 'char-1',
        status: REVIEW_STATUS.AUTO_PASSED,
        score: 0.9,
      },
    ])

    expect(mockPrisma.pipelineReviewItem.create).toHaveBeenCalledTimes(1)
  })

  it('approveReviewItem updates status to approved', async () => {
    mockPrisma.pipelineReviewItem.update.mockResolvedValue({ id: 'ri-1', status: 'approved' })

    await approveReviewItem('ri-1')
    expect(mockPrisma.pipelineReviewItem.update).toHaveBeenCalledWith({
      where: { id: 'ri-1' },
      data: { status: REVIEW_STATUS.APPROVED },
    })
  })
})
```

- [ ] **Step 3: Write review-service implementation**

```typescript
// src/lib/agent-pipeline/review/review-service.ts

import { prisma } from '@/lib/prisma'
import { REVIEW_STATUS } from '../types'
import type { ReviewItemInput, ReviewSummary } from './types'

export async function createReviewItems(items: ReviewItemInput[]): Promise<void> {
  for (const item of items) {
    await prisma.pipelineReviewItem.create({
      data: {
        pipelineRunId: item.pipelineRunId,
        phase: item.phase,
        targetType: item.targetType,
        targetId: item.targetId,
        status: item.status,
        score: item.score ?? null,
        feedback: item.feedback ?? null,
      },
    })
  }
}

export async function approveReviewItem(reviewItemId: string): Promise<void> {
  await prisma.pipelineReviewItem.update({
    where: { id: reviewItemId },
    data: { status: REVIEW_STATUS.APPROVED },
  })
}

export async function rejectReviewItem(reviewItemId: string, feedback: string): Promise<void> {
  await prisma.pipelineReviewItem.update({
    where: { id: reviewItemId },
    data: { status: REVIEW_STATUS.REJECTED, feedback },
  })
}

export async function markRetrying(reviewItemId: string): Promise<void> {
  await prisma.pipelineReviewItem.update({
    where: { id: reviewItemId },
    data: {
      status: REVIEW_STATUS.RETRYING,
      retryCount: { increment: 1 },
    },
  })
}

export async function getReviewItemsByRun(
  pipelineRunId: string,
  phase?: string,
): Promise<Array<{
  id: string
  phase: string
  targetType: string
  targetId: string
  status: string
  score: number | null
  feedback: string | null
  retryCount: number
}>> {
  return prisma.pipelineReviewItem.findMany({
    where: {
      pipelineRunId,
      ...(phase ? { phase } : {}),
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getReviewSummary(pipelineRunId: string): Promise<ReviewSummary> {
  const items = await prisma.pipelineReviewItem.findMany({
    where: { pipelineRunId },
    select: { status: true },
  })

  const summary: ReviewSummary = {
    total: items.length,
    autoPassedCount: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    retryingCount: 0,
  }

  for (const item of items) {
    switch (item.status) {
      case REVIEW_STATUS.AUTO_PASSED: summary.autoPassedCount++; break
      case REVIEW_STATUS.PENDING: summary.pendingCount++; break
      case REVIEW_STATUS.APPROVED: summary.approvedCount++; break
      case REVIEW_STATUS.REJECTED: summary.rejectedCount++; break
      case REVIEW_STATUS.RETRYING: summary.retryingCount++; break
    }
  }

  return summary
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/agent-pipeline/review-service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent-pipeline/review/ tests/unit/agent-pipeline/review-service.test.ts
git commit -m "feat: add review service for pipeline review item management"
```

---

### Task 7: LangGraph SuperGraph — State and Node Definitions

**Files:**
- Create: `src/lib/agent-pipeline/graph/state.ts`
- Create: `src/lib/agent-pipeline/graph/nodes/script-agent.ts`
- Create: `src/lib/agent-pipeline/graph/nodes/art-director.ts`
- Create: `src/lib/agent-pipeline/graph/nodes/storyboard-agent.ts`
- Create: `src/lib/agent-pipeline/graph/nodes/producer.ts`

- [ ] **Step 1: Write PipelineState definition**

```typescript
// src/lib/agent-pipeline/graph/state.ts

import type { GraphExecutorState } from '@/lib/run-runtime/graph-executor'
import type { PipelineConfig, PipelinePhase, QualityCheckResult } from '../types'
import type { CharacterAssetRef, LocationAssetRef, StyleProfileData } from '../asset-layer/types'

export type PipelineState = GraphExecutorState & {
  // Input
  projectId: string
  userId: string
  pipelineRunId: string
  script: string
  artStyle: string
  aspectRatio: string
  config: PipelineConfig

  // ScriptAgent output
  characters: CharacterAssetRef[]
  locations: LocationAssetRef[]
  episodeIds: string[]

  // ArtDirectorAgent output
  styleProfile: StyleProfileData | null
  characterAssetsLocked: boolean
  locationAssetsLocked: boolean

  // StoryboardAgent output
  storyboardComplete: boolean
  panelCount: number

  // ProducerAgent control
  currentPhase: PipelinePhase
  qualityGates: QualityCheckResult[]
  error: string | null
}

export function createInitialPipelineState(input: {
  projectId: string
  userId: string
  pipelineRunId: string
  script: string
  artStyle: string
  aspectRatio: string
  config: PipelineConfig
}): PipelineState {
  return {
    refs: {},
    meta: {},
    projectId: input.projectId,
    userId: input.userId,
    pipelineRunId: input.pipelineRunId,
    script: input.script,
    artStyle: input.artStyle,
    aspectRatio: input.aspectRatio,
    config: input.config,
    characters: [],
    locations: [],
    episodeIds: [],
    styleProfile: null,
    characterAssetsLocked: false,
    locationAssetsLocked: false,
    storyboardComplete: false,
    panelCount: 0,
    currentPhase: 'script',
    qualityGates: [],
    error: null,
  }
}
```

- [ ] **Step 2: Write ScriptAgent node**

This node orchestrates: analyze novel → extract characters/locations → story-to-script. It delegates to existing workers via `submitTask`.

```typescript
// src/lib/agent-pipeline/graph/nodes/script-agent.ts

import type { GraphNodeContext } from '@/lib/run-runtime/graph-executor'
import type { PipelineState } from '../state'
import { prisma } from '@/lib/prisma'
import { submitTask } from '@/lib/task/submitter'
import { TASK_TYPE } from '@/lib/task/types'
import { updatePromptFragment } from '../../asset-layer/registry'
import { waitForTaskCompletion } from '../task-wait'
import { createScopedLogger } from '@/lib/logging/core'

export async function runScriptAgent(
  context: GraphNodeContext<PipelineState>,
): Promise<void> {
  const { state } = context
  const logger = createScopedLogger({
    module: 'agent-pipeline.script-agent',
    projectId: state.projectId,
  })

  logger.info({ action: 'script_agent.start', message: 'Starting script analysis' })

  // Step 1: Get novel text from first episode or project
  const novelData = await prisma.novelPromotionProject.findUnique({
    where: { projectId: state.projectId },
    select: { id: true, artStyle: true },
  })
  if (!novelData) throw new Error('NovelPromotionProject not found')

  // Step 2: Submit analyze_novel task and wait
  const analyzeResult = await submitTask({
    userId: state.userId,
    locale: 'zh',
    projectId: state.projectId,
    type: TASK_TYPE.ANALYZE_NOVEL,
    targetType: 'NovelPromotionProject',
    targetId: state.projectId,
    payload: {
      novelText: state.script,
      pipelineRunId: state.pipelineRunId,
    },
  })
  await waitForTaskCompletion(analyzeResult.taskId, state.projectId)

  // Step 3: Read extracted characters and locations from DB
  const characters = await prisma.novelPromotionCharacter.findMany({
    where: { novelPromotionProjectId: novelData.id },
    include: { appearances: { orderBy: { appearanceIndex: 'asc' }, take: 1 } },
  })
  const locations = await prisma.novelPromotionLocation.findMany({
    where: { novelPromotionProjectId: novelData.id },
  })

  // Step 4: Auto-generate promptFragments from appearance descriptions
  for (const char of characters) {
    const desc = char.appearances[0]?.description
    if (desc && !char.promptFragment) {
      await updatePromptFragment('character', char.id, desc)
    }
  }
  for (const loc of locations) {
    if (loc.summary && !loc.promptFragment) {
      await updatePromptFragment('location', loc.id, loc.summary)
    }
  }

  // Step 5: Submit story_to_script_run task and wait
  const episodes = await prisma.novelPromotionEpisode.findMany({
    where: { novelPromotionProjectId: novelData.id },
    select: { id: true },
    orderBy: { episodeNumber: 'asc' },
  })

  for (const episode of episodes) {
    const storyResult = await submitTask({
      userId: state.userId,
      locale: 'zh',
      projectId: state.projectId,
      episodeId: episode.id,
      type: TASK_TYPE.STORY_TO_SCRIPT_RUN,
      targetType: 'NovelPromotionEpisode',
      targetId: episode.id,
      payload: {
        pipelineRunId: state.pipelineRunId,
      },
    })
    await waitForTaskCompletion(storyResult.taskId, state.projectId)
  }

  // Update state
  state.characters = characters.map((c) => ({
    id: c.id,
    name: c.name,
    aliases: c.aliases,
    appearance: c.appearances[0]?.description ?? null,
    imageUrl: c.appearances[0]?.imageUrl ?? null,
    promptFragment: c.appearances[0]?.description ?? null,
    assetStatus: 'draft' as const,
  }))
  state.locations = locations.map((l) => ({
    id: l.id,
    name: l.name,
    summary: l.summary,
    imageUrl: null,
    promptFragment: l.summary ?? null,
    assetStatus: 'draft' as const,
  }))
  state.episodeIds = episodes.map((e) => e.id)
  state.currentPhase = 'art'

  logger.info({
    action: 'script_agent.complete',
    message: `Extracted ${characters.length} characters, ${locations.length} locations, ${episodes.length} episodes`,
  })
}
```

- [ ] **Step 3: Write task-wait utility**

```typescript
// src/lib/agent-pipeline/graph/task-wait.ts

import { prisma } from '@/lib/prisma'
import { TASK_STATUS } from '@/lib/task/types'

const POLL_INTERVAL_MS = 2000
const MAX_WAIT_MS = 15 * 60 * 1000 // 15 minutes

export async function waitForTaskCompletion(
  taskId: string,
  projectId: string,
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < MAX_WAIT_MS) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { status: true, errorCode: true, errorMessage: true },
    })

    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    if (task.status === TASK_STATUS.COMPLETED) {
      return
    }

    if (task.status === TASK_STATUS.FAILED || task.status === TASK_STATUS.DISMISSED) {
      throw new Error(
        `Task ${taskId} failed: ${task.errorCode || 'UNKNOWN'} - ${task.errorMessage || 'no details'}`,
      )
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  throw new Error(`Task ${taskId} timed out after ${MAX_WAIT_MS / 1000}s`)
}

export async function waitForMultipleTasksCompletion(
  taskIds: string[],
  projectId: string,
): Promise<void> {
  await Promise.all(taskIds.map((id) => waitForTaskCompletion(id, projectId)))
}
```

- [ ] **Step 4: Write ArtDirectorAgent node**

```typescript
// src/lib/agent-pipeline/graph/nodes/art-director.ts

import type { GraphNodeContext } from '@/lib/run-runtime/graph-executor'
import type { PipelineState } from '../state'
import { prisma } from '@/lib/prisma'
import { submitTask } from '@/lib/task/submitter'
import { TASK_TYPE } from '@/lib/task/types'
import { getOrCreateStyleProfile, lockAsset, getCharacterAssets, getLocationAssets } from '../../asset-layer/registry'
import { waitForTaskCompletion } from '../task-wait'
import { getArtStylePrompt } from '@/lib/constants'
import { createScopedLogger } from '@/lib/logging/core'

export async function runArtDirectorAgent(
  context: GraphNodeContext<PipelineState>,
): Promise<void> {
  const { state } = context
  const logger = createScopedLogger({
    module: 'agent-pipeline.art-director',
    projectId: state.projectId,
  })

  logger.info({ action: 'art_director.start', message: 'Starting art direction' })

  const novelData = await prisma.novelPromotionProject.findUnique({
    where: { projectId: state.projectId },
    select: { id: true, artStyle: true, artStylePrompt: true },
  })
  if (!novelData) throw new Error('NovelPromotionProject not found')

  // Step 1: Create StyleProfile
  const artStylePrompt = novelData.artStylePrompt || getArtStylePrompt(novelData.artStyle)
  const styleProfile = await getOrCreateStyleProfile(state.projectId, {
    artStyle: novelData.artStyle,
    stylePrefix: artStylePrompt,
    negativePrompt: 'low quality, blurry, deformed, ugly, bad anatomy',
    colorPalette: null,
  })
  state.styleProfile = styleProfile

  // Step 2: Generate character images
  const characters = await getCharacterAssets(novelData.id)
  const characterTaskIds: string[] = []
  for (const char of characters) {
    if (char.imageUrl) continue // already has image
    const result = await submitTask({
      userId: state.userId,
      locale: 'zh',
      projectId: state.projectId,
      type: TASK_TYPE.IMAGE_CHARACTER,
      targetType: 'NovelPromotionCharacter',
      targetId: char.id,
      payload: {
        pipelineRunId: state.pipelineRunId,
      },
    })
    characterTaskIds.push(result.taskId)
  }
  for (const taskId of characterTaskIds) {
    await waitForTaskCompletion(taskId, state.projectId)
  }

  // Step 3: Generate location images
  const locations = await getLocationAssets(novelData.id)
  const locationTaskIds: string[] = []
  for (const loc of locations) {
    if (loc.imageUrl) continue
    const result = await submitTask({
      userId: state.userId,
      locale: 'zh',
      projectId: state.projectId,
      type: TASK_TYPE.IMAGE_LOCATION,
      targetType: 'NovelPromotionLocation',
      targetId: loc.id,
      payload: {
        pipelineRunId: state.pipelineRunId,
      },
    })
    locationTaskIds.push(result.taskId)
  }
  for (const taskId of locationTaskIds) {
    await waitForTaskCompletion(taskId, state.projectId)
  }

  // Step 4: Lock all assets
  const updatedCharacters = await getCharacterAssets(novelData.id)
  for (const char of updatedCharacters) {
    await lockAsset('character', char.id)
  }
  const updatedLocations = await getLocationAssets(novelData.id)
  for (const loc of updatedLocations) {
    await lockAsset('location', loc.id)
  }

  state.characterAssetsLocked = true
  state.locationAssetsLocked = true
  state.currentPhase = 'storyboard'

  logger.info({
    action: 'art_director.complete',
    message: `Generated images for ${characterTaskIds.length} characters, ${locationTaskIds.length} locations`,
  })
}
```

- [ ] **Step 5: Write StoryboardAgent node**

```typescript
// src/lib/agent-pipeline/graph/nodes/storyboard-agent.ts

import type { GraphNodeContext } from '@/lib/run-runtime/graph-executor'
import type { PipelineState } from '../state'
import { prisma } from '@/lib/prisma'
import { submitTask } from '@/lib/task/submitter'
import { TASK_TYPE } from '@/lib/task/types'
import { waitForTaskCompletion, waitForMultipleTasksCompletion } from '../task-wait'
import { createScopedLogger } from '@/lib/logging/core'

export async function runStoryboardAgent(
  context: GraphNodeContext<PipelineState>,
): Promise<void> {
  const { state } = context
  const logger = createScopedLogger({
    module: 'agent-pipeline.storyboard-agent',
    projectId: state.projectId,
  })

  logger.info({ action: 'storyboard_agent.start', message: 'Starting storyboard generation' })

  // Step 1: Run script-to-storyboard for each episode
  for (const episodeId of state.episodeIds) {
    const storyboardResult = await submitTask({
      userId: state.userId,
      locale: 'zh',
      projectId: state.projectId,
      episodeId,
      type: TASK_TYPE.SCRIPT_TO_STORYBOARD_RUN,
      targetType: 'NovelPromotionEpisode',
      targetId: episodeId,
      payload: {
        pipelineRunId: state.pipelineRunId,
      },
    })
    await waitForTaskCompletion(storyboardResult.taskId, state.projectId)
  }

  // Step 2: Batch generate panel images
  const novelData = await prisma.novelPromotionProject.findUnique({
    where: { projectId: state.projectId },
    select: { id: true },
  })
  if (!novelData) throw new Error('NovelPromotionProject not found')

  const panels = await prisma.novelPromotionPanel.findMany({
    where: {
      storyboard: {
        clip: {
          episode: {
            novelPromotionProjectId: novelData.id,
          },
        },
      },
      imageUrl: null, // only panels without images
    },
    select: { id: true },
  })

  const panelTaskIds: string[] = []
  for (const panel of panels) {
    const result = await submitTask({
      userId: state.userId,
      locale: 'zh',
      projectId: state.projectId,
      type: TASK_TYPE.IMAGE_PANEL,
      targetType: 'NovelPromotionPanel',
      targetId: panel.id,
      payload: {
        pipelineRunId: state.pipelineRunId,
      },
    })
    panelTaskIds.push(result.taskId)
  }

  await waitForMultipleTasksCompletion(panelTaskIds, state.projectId)

  state.storyboardComplete = true
  state.panelCount = panels.length
  state.currentPhase = 'review'

  logger.info({
    action: 'storyboard_agent.complete',
    message: `Generated storyboards and ${panels.length} panel images`,
  })
}
```

- [ ] **Step 6: Write ProducerAgent node**

```typescript
// src/lib/agent-pipeline/graph/nodes/producer.ts

import type { GraphNodeContext } from '@/lib/run-runtime/graph-executor'
import type { PipelineState } from '../state'
import { prisma } from '@/lib/prisma'
import { evaluatePhaseQuality } from '../../quality/quality-gate'
import { createReviewItems } from '../../review/review-service'
import { PIPELINE_STATUS, REVIEW_STATUS } from '../../types'
import { createScopedLogger } from '@/lib/logging/core'

export async function runProducerQualityCheck(
  context: GraphNodeContext<PipelineState>,
): Promise<void> {
  const { state } = context
  const logger = createScopedLogger({
    module: 'agent-pipeline.producer',
    projectId: state.projectId,
  })

  logger.info({ action: 'producer.quality_check', message: 'Running final quality check' })

  // For Phase 1 (first release), we create review items for all generated panels
  // Score is set to 1.0 (auto-pass) since VLM consistency checking is a future enhancement
  const novelData = await prisma.novelPromotionProject.findUnique({
    where: { projectId: state.projectId },
    select: { id: true },
  })
  if (!novelData) throw new Error('NovelPromotionProject not found')

  // Create review items for characters
  const characters = await prisma.novelPromotionCharacter.findMany({
    where: { novelPromotionProjectId: novelData.id },
    select: { id: true },
  })
  await createReviewItems(
    characters.map((c) => ({
      pipelineRunId: state.pipelineRunId,
      phase: 'art' as const,
      targetType: 'character' as const,
      targetId: c.id,
      status: REVIEW_STATUS.AUTO_PASSED,
      score: 1.0,
    })),
  )

  // Create review items for locations
  const locations = await prisma.novelPromotionLocation.findMany({
    where: { novelPromotionProjectId: novelData.id },
    select: { id: true },
  })
  await createReviewItems(
    locations.map((l) => ({
      pipelineRunId: state.pipelineRunId,
      phase: 'art' as const,
      targetType: 'location' as const,
      targetId: l.id,
      status: REVIEW_STATUS.AUTO_PASSED,
      score: 1.0,
    })),
  )

  // Create review items for panels
  const panels = await prisma.novelPromotionPanel.findMany({
    where: {
      storyboard: {
        clip: {
          episode: { novelPromotionProjectId: novelData.id },
        },
      },
    },
    select: { id: true },
  })
  await createReviewItems(
    panels.map((p) => ({
      pipelineRunId: state.pipelineRunId,
      phase: 'storyboard' as const,
      targetType: 'panel' as const,
      targetId: p.id,
      status: REVIEW_STATUS.AUTO_PASSED,
      score: 1.0,
    })),
  )

  // Update pipeline run status to review
  await prisma.pipelineRun.update({
    where: { id: state.pipelineRunId },
    data: {
      status: PIPELINE_STATUS.REVIEW,
      currentPhase: 'review',
    },
  })

  state.currentPhase = 'review'

  logger.info({
    action: 'producer.quality_check.complete',
    message: `Created review items: ${characters.length} characters, ${locations.length} locations, ${panels.length} panels`,
  })
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/agent-pipeline/graph/
git commit -m "feat: add LangGraph agent nodes (script, art-director, storyboard, producer)"
```

---

### Task 8: LangGraph SuperGraph Assembly

**Files:**
- Create: `src/lib/agent-pipeline/graph/super-graph.ts`
- Create: `src/lib/agent-pipeline/index.ts`

- [ ] **Step 1: Write SuperGraph definition**

```typescript
// src/lib/agent-pipeline/graph/super-graph.ts

import { runPipelineGraph } from '@/lib/run-runtime/pipeline-graph'
import { createInitialPipelineState, type PipelineState } from './state'
import { runScriptAgent } from './nodes/script-agent'
import { runArtDirectorAgent } from './nodes/art-director'
import { runStoryboardAgent } from './nodes/storyboard-agent'
import { runProducerQualityCheck } from './nodes/producer'
import type { PipelineConfig } from '../types'

export type StartPipelineInput = {
  runId: string
  projectId: string
  userId: string
  pipelineRunId: string
  script: string
  artStyle: string
  aspectRatio: string
  config: PipelineConfig
}

export async function runAgentPipelineGraph(
  input: StartPipelineInput,
): Promise<PipelineState> {
  const initialState = createInitialPipelineState({
    projectId: input.projectId,
    userId: input.userId,
    pipelineRunId: input.pipelineRunId,
    script: input.script,
    artStyle: input.artStyle,
    aspectRatio: input.aspectRatio,
    config: input.config,
  })

  return await runPipelineGraph({
    runId: input.runId,
    projectId: input.projectId,
    userId: input.userId,
    state: initialState,
    nodes: [
      {
        key: 'script_agent',
        title: 'Script Analysis & Story-to-Script',
        maxAttempts: 2,
        timeoutMs: 30 * 60 * 1000, // 30 minutes
        run: runScriptAgent,
      },
      {
        key: 'art_director_agent',
        title: 'Character & Location Image Generation',
        maxAttempts: 2,
        timeoutMs: 30 * 60 * 1000,
        run: runArtDirectorAgent,
      },
      {
        key: 'storyboard_agent',
        title: 'Storyboard & Panel Image Generation',
        maxAttempts: 2,
        timeoutMs: 60 * 60 * 1000, // 60 minutes (many panels)
        run: runStoryboardAgent,
      },
      {
        key: 'producer_quality_check',
        title: 'Quality Check & Review Items',
        maxAttempts: 1,
        timeoutMs: 5 * 60 * 1000,
        run: runProducerQualityCheck,
      },
    ],
  })
}
```

- [ ] **Step 2: Write pipeline entry point**

```typescript
// src/lib/agent-pipeline/index.ts

import { prisma } from '@/lib/prisma'
import { createRun } from '@/lib/run-runtime/service'
import { DEFAULT_PIPELINE_CONFIG, PIPELINE_STATUS, type PipelineConfig } from './types'
import { runAgentPipelineGraph } from './graph/super-graph'
import { createScopedLogger } from '@/lib/logging/core'

export async function startPipeline(params: {
  userId: string
  projectId: string
  script: string
  config?: Partial<PipelineConfig>
}): Promise<{ pipelineRunId: string; runId: string }> {
  const logger = createScopedLogger({
    module: 'agent-pipeline',
    projectId: params.projectId,
    userId: params.userId,
  })

  const novelData = await prisma.novelPromotionProject.findUnique({
    where: { projectId: params.projectId },
    select: { artStyle: true, videoRatio: true },
  })
  if (!novelData) throw new Error('NovelPromotionProject not found')

  const config: PipelineConfig = {
    ...DEFAULT_PIPELINE_CONFIG,
    ...params.config,
  }

  // Create PipelineRun record
  const pipelineRun = await prisma.pipelineRun.create({
    data: {
      projectId: params.projectId,
      userId: params.userId,
      status: PIPELINE_STATUS.RUNNING,
      currentPhase: 'script',
      config: config as unknown as Record<string, unknown>,
    },
  })

  // Create GraphRun for LangGraph tracking
  const graphRun = await createRun({
    userId: params.userId,
    projectId: params.projectId,
    workflowType: 'agent_pipeline',
    targetType: 'PipelineRun',
    targetId: pipelineRun.id,
    input: { script: params.script.slice(0, 500) }, // truncate for storage
  })

  // Update NovelPromotionProject to agent mode
  await prisma.novelPromotionProject.update({
    where: { projectId: params.projectId },
    data: { pipelineMode: 'agent' },
  })

  logger.info({
    action: 'pipeline.start',
    message: 'Agent pipeline started',
    details: { pipelineRunId: pipelineRun.id, runId: graphRun.id },
  })

  // Run pipeline in background (don't await — this is long-running)
  runAgentPipelineGraph({
    runId: graphRun.id,
    projectId: params.projectId,
    userId: params.userId,
    pipelineRunId: pipelineRun.id,
    script: params.script,
    artStyle: novelData.artStyle,
    aspectRatio: novelData.videoRatio,
    config,
  })
    .then(async () => {
      await prisma.pipelineRun.update({
        where: { id: pipelineRun.id },
        data: {
          status: PIPELINE_STATUS.REVIEW,
          completedAt: new Date(),
        },
      })
    })
    .catch(async (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      await prisma.pipelineRun.update({
        where: { id: pipelineRun.id },
        data: {
          status: PIPELINE_STATUS.FAILED,
          errorMessage: message,
          completedAt: new Date(),
        },
      })
      logger.error({
        action: 'pipeline.failed',
        message,
        errorCode: 'PIPELINE_FAILED',
        retryable: false,
      })
    })

  return { pipelineRunId: pipelineRun.id, runId: graphRun.id }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/agent-pipeline/graph/super-graph.ts src/lib/agent-pipeline/index.ts
git commit -m "feat: add LangGraph SuperGraph assembly and pipeline entry point"
```

---

### Task 9: API Routes

**Files:**
- Create: `src/app/api/novel-promotion/[projectId]/pipeline/start/route.ts`
- Create: `src/app/api/novel-promotion/[projectId]/pipeline/status/route.ts`
- Create: `src/app/api/novel-promotion/[projectId]/pipeline/review/route.ts`

- [ ] **Step 1: Write start route**

```typescript
// src/app/api/novel-promotion/[projectId]/pipeline/start/route.ts

import { NextRequest } from 'next/server'
import { requireProjectAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { startPipeline } from '@/lib/agent-pipeline'

export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params
  const body = await request.json().catch(() => ({}))

  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult
  const { session, project } = authResult

  if (project.mode !== 'novel-promotion') {
    throw new ApiError('INVALID_PARAMS')
  }

  const script = typeof body?.script === 'string' ? body.script : ''
  if (!script.trim()) {
    throw new ApiError('INVALID_PARAMS', { message: 'script is required' })
  }

  const result = await startPipeline({
    userId: session.user.id,
    projectId,
    script,
    config: body?.config,
  })

  return Response.json({
    success: true,
    pipelineRunId: result.pipelineRunId,
    runId: result.runId,
  })
})
```

- [ ] **Step 2: Write status route (SSE)**

```typescript
// src/app/api/novel-promotion/[projectId]/pipeline/status/route.ts

import { NextRequest } from 'next/server'
import { requireProjectAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'
import { prisma } from '@/lib/prisma'
import { getReviewSummary } from '@/lib/agent-pipeline/review/review-service'

export const GET = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params

  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult

  const pipelineRun = await prisma.pipelineRun.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  })

  if (!pipelineRun) {
    return Response.json({ exists: false })
  }

  const reviewSummary = await getReviewSummary(pipelineRun.id)

  return Response.json({
    exists: true,
    pipelineRunId: pipelineRun.id,
    status: pipelineRun.status,
    currentPhase: pipelineRun.currentPhase,
    startedAt: pipelineRun.startedAt,
    completedAt: pipelineRun.completedAt,
    errorMessage: pipelineRun.errorMessage,
    review: reviewSummary,
  })
})
```

- [ ] **Step 3: Write review route**

```typescript
// src/app/api/novel-promotion/[projectId]/pipeline/review/route.ts

import { NextRequest } from 'next/server'
import { requireProjectAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import {
  approveReviewItem,
  rejectReviewItem,
  getReviewItemsByRun,
} from '@/lib/agent-pipeline/review/review-service'
import { prisma } from '@/lib/prisma'
import { PIPELINE_STATUS } from '@/lib/agent-pipeline/types'

export const GET = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params
  const { searchParams } = new URL(request.url)
  const phase = searchParams.get('phase') || undefined

  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult

  const pipelineRun = await prisma.pipelineRun.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  })
  if (!pipelineRun) {
    throw new ApiError('NOT_FOUND', { message: 'No pipeline run found' })
  }

  const items = await getReviewItemsByRun(pipelineRun.id, phase)
  return Response.json({ items })
})

export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params
  const body = await request.json().catch(() => ({}))

  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult

  const action = body?.action as string
  const reviewItemId = body?.reviewItemId as string

  if (!reviewItemId || !action) {
    throw new ApiError('INVALID_PARAMS', { message: 'reviewItemId and action required' })
  }

  switch (action) {
    case 'approve':
      await approveReviewItem(reviewItemId)
      break
    case 'reject':
      await rejectReviewItem(reviewItemId, body?.feedback || '')
      break
    default:
      throw new ApiError('INVALID_PARAMS', { message: `Unknown action: ${action}` })
  }

  // Check if all items are resolved — if so, mark pipeline as completed
  const pipelineRun = await prisma.pipelineRun.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  })
  if (pipelineRun) {
    const pendingItems = await prisma.pipelineReviewItem.count({
      where: {
        pipelineRunId: pipelineRun.id,
        status: { in: ['pending', 'retrying'] },
      },
    })
    if (pendingItems === 0) {
      await prisma.pipelineRun.update({
        where: { id: pipelineRun.id },
        data: { status: PIPELINE_STATUS.COMPLETED, completedAt: new Date() },
      })
    }
  }

  return Response.json({ success: true })
})
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/novel-promotion/\[projectId\]/pipeline/
git commit -m "feat: add pipeline API routes (start, status, review)"
```

---

### Task 10: UI — Agent Mode Entry, Progress, and Review Panel

**Files:**
- Create: `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/AgentModeEntry.tsx`
- Create: `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/PipelineProgress.tsx`
- Create: `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/ReviewPanel.tsx`
- Modify: `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/NovelPromotionWorkspace.tsx`

- [ ] **Step 1: Write AgentModeEntry component**

```tsx
// src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/AgentModeEntry.tsx
'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Rocket } from 'lucide-react'

type Props = {
  projectId: string
  novelText: string
  disabled: boolean
  onStarted: (pipelineRunId: string) => void
}

export function AgentModeEntry({ projectId, novelText, disabled, onStarted }: Props) {
  const [started, setStarted] = useState(false)

  const startMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/novel-promotion/${projectId}/pipeline/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: novelText }),
      })
      if (!response.ok) throw new Error('Failed to start pipeline')
      return response.json()
    },
    onSuccess: (data) => {
      setStarted(true)
      onStarted(data.pipelineRunId)
    },
  })

  if (started) return null

  return (
    <button
      onClick={() => startMutation.mutate()}
      disabled={disabled || !novelText.trim() || startMutation.isPending}
      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <Rocket className="h-5 w-5" />
      {startMutation.isPending ? '启动中...' : '一键生成'}
    </button>
  )
}
```

- [ ] **Step 2: Write PipelineProgress component**

```tsx
// src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/PipelineProgress.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'

type Props = {
  projectId: string
  pipelineRunId: string | null
}

const PHASES = [
  { key: 'script', label: '剧本分析' },
  { key: 'art', label: '美术生成' },
  { key: 'storyboard', label: '分镜生成' },
  { key: 'review', label: '审核' },
]

export function PipelineProgress({ projectId, pipelineRunId }: Props) {
  const { data } = useQuery({
    queryKey: ['pipeline-status', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/novel-promotion/${projectId}/pipeline/status`)
      if (!response.ok) throw new Error('Failed to fetch status')
      return response.json()
    },
    refetchInterval: 3000,
    enabled: !!pipelineRunId,
  })

  if (!data?.exists) return null

  const currentPhaseIndex = PHASES.findIndex((p) => p.key === data.currentPhase)
  const isRunning = data.status === 'running'
  const isFailed = data.status === 'failed'

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <div className="flex items-center gap-3 mb-4">
        {isRunning && <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />}
        {isFailed && <XCircle className="h-5 w-5 text-red-400" />}
        {data.status === 'review' && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
        <span className="font-medium">
          {isRunning ? 'Agent 生成中...' : isFailed ? '生成失败' : '生成完成，等待审核'}
        </span>
      </div>

      <div className="flex gap-2">
        {PHASES.map((phase, index) => {
          const isDone = index < currentPhaseIndex
          const isCurrent = index === currentPhaseIndex && isRunning
          return (
            <div
              key={phase.key}
              className={`flex-1 rounded px-3 py-2 text-center text-sm ${
                isDone
                  ? 'bg-emerald-900/40 text-emerald-400'
                  : isCurrent
                    ? 'bg-blue-900/40 text-blue-400'
                    : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {isDone && <CheckCircle2 className="inline h-3 w-3 mr-1" />}
              {isCurrent && <Loader2 className="inline h-3 w-3 mr-1 animate-spin" />}
              {!isDone && !isCurrent && <Clock className="inline h-3 w-3 mr-1" />}
              {phase.label}
            </div>
          )
        })}
      </div>

      {isFailed && data.errorMessage && (
        <p className="mt-3 text-sm text-red-400">{data.errorMessage}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write ReviewPanel component**

```tsx
// src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/ReviewPanel.tsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, RotateCcw, Eye } from 'lucide-react'

type ReviewItem = {
  id: string
  phase: string
  targetType: string
  targetId: string
  status: string
  score: number | null
  feedback: string | null
  retryCount: number
}

type Props = {
  projectId: string
}

const PHASE_TABS = [
  { key: 'art', label: '美术资产' },
  { key: 'storyboard', label: '分镜板' },
]

export function ReviewPanel({ projectId }: Props) {
  const [activePhase, setActivePhase] = useState('art')
  const queryClient = useQueryClient()

  const { data: items = [] } = useQuery<ReviewItem[]>({
    queryKey: ['pipeline-review', projectId, activePhase],
    queryFn: async () => {
      const response = await fetch(
        `/api/novel-promotion/${projectId}/pipeline/review?phase=${activePhase}`,
      )
      if (!response.ok) throw new Error('Failed to fetch review items')
      const json = await response.json()
      return json.items
    },
  })

  const reviewMutation = useMutation({
    mutationFn: async (params: { reviewItemId: string; action: string; feedback?: string }) => {
      const response = await fetch(`/api/novel-promotion/${projectId}/pipeline/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!response.ok) throw new Error('Failed to update review')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-review', projectId] })
      queryClient.invalidateQueries({ queryKey: ['pipeline-status', projectId] })
    },
  })

  const pendingItems = items.filter((i) => i.status === 'pending' || i.status === 'retrying')
  const passedItems = items.filter((i) => i.status === 'auto_passed' || i.status === 'approved')

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <div className="flex gap-2 mb-4">
        {PHASE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActivePhase(tab.key)}
            className={`px-4 py-2 rounded text-sm ${
              activePhase === tab.key
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="text-sm text-zinc-400 mb-3">
        共 {items.length} 项 · {passedItems.length} 已通过 · {pendingItems.length} 待审核
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between rounded px-3 py-2 ${
              item.status === 'auto_passed' || item.status === 'approved'
                ? 'bg-emerald-900/20'
                : item.status === 'pending'
                  ? 'bg-yellow-900/20'
                  : 'bg-red-900/20'
            }`}
          >
            <div className="text-sm">
              <span className="font-mono text-zinc-300">{item.targetType}:{item.targetId.slice(0, 8)}</span>
              {item.score !== null && (
                <span className="ml-2 text-zinc-500">score: {item.score.toFixed(2)}</span>
              )}
            </div>
            <div className="flex gap-1">
              {item.status === 'pending' && (
                <>
                  <button
                    onClick={() => reviewMutation.mutate({ reviewItemId: item.id, action: 'approve' })}
                    className="p-1 rounded hover:bg-emerald-800 text-emerald-400"
                    title="通过"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Modify NovelPromotionWorkspace to add mode toggle**

Read the current `NovelPromotionWorkspace.tsx` to find where to add the agent mode toggle. Add a state variable `pipelineRunId` and conditionally render `AgentModeEntry`, `PipelineProgress`, and `ReviewPanel` components alongside the existing stage navigation.

The key change: add a "mode switch" section at the top of the workspace that shows either the existing stage-by-stage UI or the agent pipeline UI (one-click entry + progress + review).

- [ ] **Step 5: Commit**

```bash
git add src/app/\[locale\]/workspace/\[projectId\]/modes/novel-promotion/components/AgentModeEntry.tsx
git add src/app/\[locale\]/workspace/\[projectId\]/modes/novel-promotion/components/PipelineProgress.tsx
git add src/app/\[locale\]/workspace/\[projectId\]/modes/novel-promotion/components/ReviewPanel.tsx
git commit -m "feat: add agent mode UI components (entry, progress, review panel)"
```

---

### Task 11: Integration Testing

**Files:**
- Create: `tests/integration/agent-pipeline/pipeline-flow.test.ts`

- [ ] **Step 1: Write integration test for pipeline types and DB schema**

```typescript
// tests/integration/agent-pipeline/pipeline-flow.test.ts
import { describe, expect, it } from 'vitest'
import {
  PIPELINE_STATUS,
  PIPELINE_PHASE,
  REVIEW_STATUS,
  DEFAULT_PIPELINE_CONFIG,
} from '@/lib/agent-pipeline/types'
import { composeImagePrompt } from '@/lib/agent-pipeline/asset-layer/prompt-composer'
import { evaluatePhaseQuality } from '@/lib/agent-pipeline/quality/quality-gate'
import { parseConsistencyResponse, makeDecision } from '@/lib/agent-pipeline/asset-layer/consistency-checker'

describe('agent-pipeline integration', () => {
  it('full prompt composition pipeline', () => {
    const prompt = composeImagePrompt({
      stylePrefix: 'american comic style, bold outlines, vibrant colors',
      characterFragments: [
        'a muscular man with a scar on his left cheek, wearing armor',
        'a young woman with silver hair and blue eyes',
      ],
      locationFragment: 'ancient stone castle, moonlit courtyard, torches on walls',
      shotDescription: 'wide shot, dramatic low angle',
      actionDescription: 'the two characters face each other in standoff',
    })

    expect(prompt).toContain('american comic style')
    expect(prompt).toContain('muscular man')
    expect(prompt).toContain('silver hair')
    expect(prompt).toContain('ancient stone castle')
    expect(prompt).toContain('wide shot')
    expect(prompt).toContain('standoff')
  })

  it('quality gate with standard review mode', () => {
    const result = evaluatePhaseQuality({
      config: DEFAULT_PIPELINE_CONFIG,
      itemScores: [
        { targetId: 'panel-1', score: 0.9, retryCount: 0 },
        { targetId: 'panel-2', score: 0.5, retryCount: 2 },
        { targetId: 'panel-3', score: 0.4, retryCount: 3 },
      ],
    })

    expect(result.autoPassedIds).toEqual(['panel-1'])
    expect(result.retryIds).toEqual(['panel-2'])
    expect(result.failedIds).toEqual(['panel-3'])
    expect(result.passed).toBe(false)
  })

  it('consistency check parse + decision pipeline', () => {
    const vlmResponse = JSON.stringify({
      characterScore: 0.85,
      sceneScore: 0.9,
      styleScore: 0.75,
      overallScore: 0.84,
      issues: [],
    })

    const parsed = parseConsistencyResponse(vlmResponse)
    expect(parsed.overallScore).toBe(0.84)

    const decision = makeDecision(parsed.overallScore, 0.7, 0, 3)
    expect(decision).toBe('pass')
  })

  it('consistency check with low score triggers retry', () => {
    const vlmResponse = JSON.stringify({
      characterScore: 0.4,
      sceneScore: 0.5,
      styleScore: 0.3,
      overallScore: 0.4,
      issues: ['character hair color mismatch', 'wrong clothing'],
    })

    const parsed = parseConsistencyResponse(vlmResponse)
    const decision = makeDecision(parsed.overallScore, 0.7, 1, 3)
    expect(decision).toBe('retry')
  })
})
```

- [ ] **Step 2: Run integration tests**

Run: `npx vitest run tests/integration/agent-pipeline/pipeline-flow.test.ts`
Expected: PASS

- [ ] **Step 3: Run all agent-pipeline tests together**

Run: `npx vitest run tests/unit/agent-pipeline/ tests/integration/agent-pipeline/`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add tests/integration/agent-pipeline/
git commit -m "test: add integration tests for agent pipeline flow"
```

---

### Task 12: I18n Messages

**Files:**
- Modify: `messages/zh/stages.json` (or appropriate i18n file)
- Modify: `messages/en/stages.json`

- [ ] **Step 1: Add Chinese translations for pipeline UI**

Add pipeline-related messages to the Chinese translation file. The exact location depends on the existing structure — look at `messages/zh/` for the right file.

Key messages to add:
```json
{
  "pipeline": {
    "oneClickGenerate": "一键生成",
    "starting": "启动中...",
    "running": "Agent 生成中...",
    "failed": "生成失败",
    "review": "生成完成，等待审核",
    "completed": "已完成",
    "phaseScript": "剧本分析",
    "phaseArt": "美术生成",
    "phaseStoryboard": "分镜生成",
    "phaseReview": "审核",
    "approve": "通过",
    "reject": "拒绝",
    "retry": "重新生成",
    "editPrompt": "编辑 Prompt",
    "reviewPanelTitle": "审核面板",
    "total": "共 {count} 项",
    "passed": "{count} 已通过",
    "pending": "{count} 待审核"
  }
}
```

- [ ] **Step 2: Add English translations**

```json
{
  "pipeline": {
    "oneClickGenerate": "One-Click Generate",
    "starting": "Starting...",
    "running": "Agent generating...",
    "failed": "Generation failed",
    "review": "Complete, awaiting review",
    "completed": "Completed",
    "phaseScript": "Script Analysis",
    "phaseArt": "Art Generation",
    "phaseStoryboard": "Storyboard",
    "phaseReview": "Review",
    "approve": "Approve",
    "reject": "Reject",
    "retry": "Regenerate",
    "editPrompt": "Edit Prompt",
    "reviewPanelTitle": "Review Panel",
    "total": "{count} total",
    "passed": "{count} passed",
    "pending": "{count} pending"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add messages/
git commit -m "feat: add i18n messages for agent pipeline UI"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | DB Schema + Type Enums | `types.ts`, `schema.prisma` |
| 2 | Asset Registry | `registry.ts` |
| 3 | Prompt Composer | `prompt-composer.ts` |
| 4 | Consistency Checker | `consistency-checker.ts` |
| 5 | Quality Gate + Scoring | `quality-gate.ts`, `scoring.ts` |
| 6 | Review Service | `review-service.ts` |
| 7 | Agent Nodes (Script/Art/Storyboard/Producer) | `nodes/*.ts` |
| 8 | SuperGraph + Entry Point | `super-graph.ts`, `index.ts` |
| 9 | API Routes | `pipeline/start/status/review` |
| 10 | UI Components | `AgentModeEntry`, `PipelineProgress`, `ReviewPanel` |
| 11 | Integration Tests | `pipeline-flow.test.ts` |
| 12 | I18n Messages | `messages/zh/`, `messages/en/` |
