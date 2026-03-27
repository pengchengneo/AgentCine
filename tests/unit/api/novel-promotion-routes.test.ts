import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMockRequest } from '../../helpers/request'

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const authState = vi.hoisted(() => ({ authenticated: false }))

const prismaMock = vi.hoisted(() => ({
  novelPromotionProject: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  novelPromotionCharacter: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  novelPromotionLocation: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  novelPromotionStoryboard: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  novelPromotionPanel: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  novelPromotionEpisode: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  novelPromotionClip: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  novelPromotionShot: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  novelPromotionVoiceLine: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
  characterAppearance: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  locationImage: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  videoEditorProject: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  userPreference: {
    upsert: vi.fn(),
  },
  project: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  pipelineRun: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  task: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  usageCost: { create: vi.fn() },
  globalCharacter: { findFirst: vi.fn() },
  globalLocation: { findFirst: vi.fn() },
  globalVoice: { findFirst: vi.fn() },
  pipelineReviewItem: { count: vi.fn() },
  $transaction: vi.fn((arg: unknown) => {
    if (typeof arg === 'function') return (arg as Function)(prismaMock)
    if (Array.isArray(arg)) return Promise.all(arg)
    return Promise.resolve()
  }),
}))

vi.mock('@/lib/api-auth', () => ({
  isErrorResponse: (v: unknown) => v instanceof Response,
  requireUserAuth: async () => {
    if (!authState.authenticated)
      return new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED' } }), { status: 401 })
    return { session: { user: { id: 'user-1', name: 'Test User', email: 'test@test.com' } } }
  },
  requireProjectAuth: async (pid: string) => {
    if (!authState.authenticated)
      return new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED' } }), { status: 401 })
    return {
      session: { user: { id: 'user-1', name: 'Test User', email: 'test@test.com' } },
      project: { id: pid, userId: 'user-1', name: 'Test Project', mode: 'novel-promotion' },
      novelData: { id: 'nd-1' },
    }
  },
  requireProjectAuthLight: async (pid: string) => {
    if (!authState.authenticated)
      return new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED' } }), { status: 401 })
    return {
      session: { user: { id: 'user-1', name: 'Test User', email: 'test@test.com' } },
      project: { id: pid, userId: 'user-1', name: 'Test Project', mode: 'novel-promotion' },
    }
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

vi.mock('@/lib/storage', () => ({
  getSignedUrl: vi.fn(() => 'https://signed.example.com/file'),
  uploadObject: vi.fn(() => 'uploaded-key'),
  deleteObject: vi.fn(),
  generateUniqueKey: vi.fn(() => 'unique-key'),
  downloadAndUploadImage: vi.fn(() => 'downloaded-key'),
  toFetchableUrl: vi.fn((url: string) => url),
  getObjectBuffer: vi.fn(() => Buffer.from('test')),
}))

vi.mock('@/lib/logging/semantic', () => ({
  logProjectAction: vi.fn(),
  logUserAction: vi.fn(),
}))

vi.mock('@/lib/logging/core', () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
  createScopedLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    event: vi.fn(),
  })),
}))

vi.mock('@/lib/logging/context', () => ({
  withLogContext: vi.fn((_ctx: unknown, fn: Function) => fn()),
}))

vi.mock('@/lib/media/attach', () => ({
  attachMediaFieldsToProject: vi.fn((data: unknown) => data),
}))

vi.mock('@/lib/media/service', () => ({
  resolveStorageKeyFromMediaValue: vi.fn((url: string) => url),
  resolveMediaRef: vi.fn(() => null),
  resolveMediaRefFromLegacyValue: vi.fn(() => null),
}))

vi.mock('@/lib/contracts/image-urls-contract', () => ({
  encodeImageUrls: vi.fn((urls: string[]) => JSON.stringify(urls)),
  decodeImageUrlsFromDb: vi.fn((json: string | null) => {
    if (!json) return []
    try { return JSON.parse(json) } catch { return [] }
  }),
}))

vi.mock('@/lib/constants', () => ({
  PRIMARY_APPEARANCE_INDEX: 0,
  isArtStyleValue: vi.fn(() => true),
  removeLocationPromptSuffix: vi.fn((s: string) => s),
}))

vi.mock('@/lib/image-generation/count', () => ({
  normalizeImageGenerationCount: vi.fn(() => 1),
}))

vi.mock('@/lib/task/types', () => ({
  TASK_TYPE: {
    ANALYZE_NOVEL: 'ANALYZE_NOVEL',
    ANALYZE_GLOBAL: 'ANALYZE_GLOBAL',
    ANALYZE_SHOT_VARIANTS: 'ANALYZE_SHOT_VARIANTS',
    AI_CREATE_CHARACTER: 'AI_CREATE_CHARACTER',
    AI_CREATE_LOCATION: 'AI_CREATE_LOCATION',
    AI_MODIFY_APPEARANCE: 'AI_MODIFY_APPEARANCE',
    AI_MODIFY_LOCATION: 'AI_MODIFY_LOCATION',
    AI_MODIFY_SHOT_PROMPT: 'AI_MODIFY_SHOT_PROMPT',
    CLIPS_BUILD: 'CLIPS_BUILD',
    CHARACTER_PROFILE_CONFIRM: 'CHARACTER_PROFILE_CONFIRM',
    CHARACTER_PROFILE_BATCH_CONFIRM: 'CHARACTER_PROFILE_BATCH_CONFIRM',
    EPISODE_SPLIT_LLM: 'EPISODE_SPLIT_LLM',
    SCREENPLAY_CONVERT: 'SCREENPLAY_CONVERT',
    STORY_TO_SCRIPT_RUN: 'STORY_TO_SCRIPT_RUN',
    SCRIPT_TO_STORYBOARD_RUN: 'SCRIPT_TO_STORYBOARD_RUN',
    REGENERATE_STORYBOARD_TEXT: 'REGENERATE_STORYBOARD_TEXT',
    VOICE_ANALYZE: 'VOICE_ANALYZE',
    VOICE_DESIGN: 'VOICE_DESIGN',
    VOICE_LINE: 'VOICE_LINE',
    INSERT_PANEL: 'INSERT_PANEL',
    PANEL_VARIANT: 'PANEL_VARIANT',
    IMAGE_CHARACTER: 'IMAGE_CHARACTER',
    IMAGE_LOCATION: 'IMAGE_LOCATION',
    IMAGE_PANEL: 'IMAGE_PANEL',
    VIDEO_PANEL: 'VIDEO_PANEL',
    LIP_SYNC: 'LIP_SYNC',
    MODIFY_ASSET_IMAGE: 'MODIFY_ASSET_IMAGE',
    REGENERATE_GROUP: 'REGENERATE_GROUP',
    REFERENCE_TO_CHARACTER: 'REFERENCE_TO_CHARACTER',
  },
  TASK_STATUS: {
    QUEUED: 'queued',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    TIMEOUT: 'timeout',
  },
  TASK_EVENT_TYPE: {
    CREATED: 'task.created',
    STARTED: 'task.started',
    COMPLETED: 'task.completed',
    FAILED: 'task.failed',
    PROGRESS: 'task.progress',
    STREAM: 'task.stream',
  },
}))

vi.mock('@/lib/llm-observe/route-task', () => ({
  maybeSubmitLLMTask: vi.fn(() =>
    new Response(JSON.stringify({ taskId: 'task-1' }), { status: 202 }),
  ),
}))

vi.mock('@/lib/task/resolve-locale', () => ({
  resolveTaskLocale: vi.fn(() => 'en'),
  resolveRequiredTaskLocale: vi.fn(() => 'en'),
}))

vi.mock('@/lib/model-config-contract', () => ({
  parseModelKeyStrict: vi.fn(() => ({ provider: 'p', modelId: 'm' })),
  composeModelKey: vi.fn(() => 'p::m'),
}))

vi.mock('@/lib/model-capabilities/lookup', () => ({
  resolveBuiltinModelContext: vi.fn(() => null),
  getCapabilityOptionFields: vi.fn(() => ({})),
  validateCapabilitySelectionsPayload: vi.fn(() => []),
}))

vi.mock('@/lib/config-service', () => ({
  getProjectModelConfig: vi.fn(() => ({
    modelKey: 'p::m',
    provider: 'p',
    modelId: 'm',
  })),
  buildImageBillingPayload: vi.fn(() => ({})),
  resolveProjectModelCapabilityGenerationOptions: vi.fn(() => ({})),
}))

vi.mock('@/lib/api-config', () => ({
  getProviderKey: vi.fn(() => 'provider'),
  resolveModelSelection: vi.fn(() => ({ provider: 'p', modelId: 'm' })),
  resolveModelSelectionOrSingle: vi.fn(() => ({ provider: 'p', modelId: 'm' })),
}))

vi.mock('@/lib/billing', () => ({
  buildDefaultTaskBillingInfo: vi.fn(() => ({})),
}))

vi.mock('@/lib/billing/errors', () => {
  class BillingOperationError extends Error {}
  class InsufficientBalanceError extends BillingOperationError {
    required: number
    balance: number
    constructor(required = 0, balance = 0) {
      super('Insufficient balance')
      this.required = required
      this.balance = balance
    }
  }
  return { BillingOperationError, InsufficientBalanceError }
})

vi.mock('@/lib/model-pricing/lookup', () => ({
  resolveBuiltinPricing: vi.fn(() => null),
}))

vi.mock('@/lib/image-label', () => ({
  updateCharacterAppearanceLabels: vi.fn(() => []),
  updateLocationImageLabels: vi.fn(() => []),
}))

vi.mock('@/lib/fonts', () => ({
  initializeFonts: vi.fn(),
  createLabelSVG: vi.fn(() => Buffer.from('<svg></svg>')),
}))

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    metadata: vi.fn(async () => ({ width: 100, height: 100 })),
    extract: vi.fn(() => ({ toBuffer: vi.fn(async () => Buffer.from('test')) })),
    extend: vi.fn(() => ({
      composite: vi.fn(() => ({
        jpeg: vi.fn(() => ({
          toBuffer: vi.fn(async () => Buffer.from('test')),
        })),
      })),
    })),
  })),
}))

vi.mock('archiver', () => ({
  default: vi.fn(() => ({
    on: vi.fn(),
    append: vi.fn(),
    finalize: vi.fn(),
  })),
}))

vi.mock('@/lib/episode-marker-detector', () => ({
  detectEpisodeMarkers: vi.fn(() => ({
    hasMarkers: true,
    markerType: 'chapter',
    confidence: 1,
    matches: [{ start: 0 }, { start: 100 }],
  })),
  splitByMarkers: vi.fn(() => [
    { name: 'Episode 1', content: 'text1', wordCount: 50 },
    { name: 'Episode 2', content: 'text2', wordCount: 50 },
  ]),
}))

vi.mock('@/lib/voice/provider-voice-binding', () => ({
  parseSpeakerVoiceMap: vi.fn(() => ({})),
}))

vi.mock('@/lib/novel-promotion/panel-ai-data-sync', () => ({
  serializeStructuredJsonField: vi.fn((v: unknown) =>
    v === null || v === undefined ? null : JSON.stringify(v),
  ),
}))

vi.mock('@/lib/providers/bailian', () => ({
  collectBailianManagedVoiceIds: vi.fn(() => []),
  cleanupUnreferencedBailianVoices: vi.fn(),
}))

vi.mock('@/lib/task/has-output', () => ({
  hasPanelImageOutput: vi.fn(() => false),
  hasPanelVideoOutput: vi.fn(() => false),
  hasPanelLipSyncOutput: vi.fn(() => false),
  hasVoiceLineAudioOutput: vi.fn(() => false),
}))

vi.mock('@/lib/image-generation/location-slots', () => ({
  ensureProjectLocationImageSlots: vi.fn(),
}))

vi.mock('@/lib/media/outbound-image', () => ({
  sanitizeImageInputsForTaskPayload: vi.fn(() => ({})),
}))

vi.mock('@/lib/voice/generate-voice-line', () => ({
  estimateVoiceLineMaxSeconds: vi.fn(() => 10),
}))

vi.mock('@/lib/agent-pipeline/types', () => ({
  PIPELINE_STATUS: { PENDING: 'PENDING', RUNNING: 'RUNNING', COMPLETED: 'COMPLETED' },
}))

vi.mock('@/lib/agent-pipeline/pipeline-status-service', () => ({
  getPipelineRunDetail: vi.fn(() => ({ status: 'COMPLETED' })),
}))

vi.mock('@/lib/env', () => ({
  getBaseUrl: vi.fn(() => 'http://localhost:3000'),
}))

vi.mock('@/lib/agent-pipeline', () => ({
  startPipeline: vi.fn(() => ({ pipelineRunId: 'pr-1', runId: 'run-1' })),
}))

vi.mock('@/lib/agent-pipeline/review/review-service', () => ({
  approveReviewItem: vi.fn(),
  rejectReviewItem: vi.fn(),
  getReviewItemsByRun: vi.fn(() => []),
}))

vi.mock('@/lib/task/publisher', () => ({
  publishTaskEvent: vi.fn(),
  publishTaskStreamEvent: vi.fn(),
}))

vi.mock('@/lib/task/service', () => ({
  createTask: vi.fn(),
  getActiveTask: vi.fn(() => null),
  findActiveTaskByDedupeKey: vi.fn(() => null),
}))

vi.mock('@/lib/task/submitter', () => ({
  submitTask: vi.fn(() => ({ taskId: 'task-1' })),
  submitTaskSync: vi.fn(() => ({ taskId: 'task-1' })),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type RouteContext = { params: Promise<{ projectId: string }> }
type EpisodeRouteContext = { params: Promise<{ projectId: string; episodeId: string }> }
type ClipRouteContext = { params: Promise<{ projectId: string; clipId: string }> }

const PID = 'proj-1'
const BASE = `/api/novel-promotion/${PID}`
const ctx = (extra?: Record<string, string>): RouteContext => ({
  params: Promise.resolve({ projectId: PID, ...extra }),
})
const episodeCtx = (episodeId = 'ep-1'): EpisodeRouteContext => ({
  params: Promise.resolve({ projectId: PID, episodeId }),
})
const clipCtx = (clipId = 'clip-1'): ClipRouteContext => ({
  params: Promise.resolve({ projectId: PID, clipId }),
})

function resetMocks() {
  authState.authenticated = false
  for (const model of Object.values(prismaMock)) {
    if (model && typeof model === 'object') {
      for (const fn of Object.values(model)) {
        if (typeof fn === 'function' && 'mockReset' in fn) {
          (fn as ReturnType<typeof vi.fn>).mockReset()
        }
      }
    }
  }
  prismaMock.$transaction.mockImplementation((arg: unknown) => {
    if (typeof arg === 'function') return (arg as Function)(prismaMock)
    if (Array.isArray(arg)) return Promise.all(arg)
    return Promise.resolve()
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('novel-promotion API routes', () => {
  beforeEach(() => {
    vi.resetModules()
    resetMocks()
  })

  // =========================================================================
  // 1. Project detail  (GET, PATCH)
  // =========================================================================
  describe('[projectId]/route.ts', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/route')
      const req = buildMockRequest({ path: `${BASE}`, method: 'GET' })
      const res = await mod.GET(req, ctx())
      expect(res.status).toBe(401)
    })

    it('GET returns capability overrides', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionProject.findUnique.mockResolvedValue({
        capabilityOverrides: null,
        analysisModel: null,
        characterModel: null,
        locationModel: null,
        storyboardModel: null,
        editModel: null,
        videoModel: null,
        audioModel: null,
      })
      const mod = await import('@/app/api/novel-promotion/[projectId]/route')
      const req = buildMockRequest({ path: `${BASE}`, method: 'GET' })
      const res = await mod.GET(req, ctx())
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('capabilityOverrides')
    })

    it('PATCH returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/route')
      const req = buildMockRequest({ path: `${BASE}`, method: 'PATCH', body: {} })
      const res = await mod.PATCH(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 2. Assets
  // =========================================================================
  describe('assets/route.ts', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/assets/route')
      const req = buildMockRequest({ path: `${BASE}/assets`, method: 'GET' })
      const res = await mod.GET(req, ctx())
      expect(res.status).toBe(401)
    })

    it('GET returns characters and locations', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionProject.findUnique.mockResolvedValue({
        characters: [{ id: 'c-1', name: 'Hero' }],
        locations: [{ id: 'l-1', name: 'Forest' }],
      })
      const mod = await import('@/app/api/novel-promotion/[projectId]/assets/route')
      const req = buildMockRequest({ path: `${BASE}/assets`, method: 'GET' })
      const res = await mod.GET(req, ctx())
      expect(res.status).toBe(200)
    })
  })

  // =========================================================================
  // 3. Character  (PATCH, DELETE, POST)
  // =========================================================================
  describe('character/route.ts', () => {
    it('PATCH returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/character/route')
      const req = buildMockRequest({ path: `${BASE}/character`, method: 'PATCH', body: { characterId: 'c-1', name: 'New' } })
      const res = await mod.PATCH(req, ctx())
      expect(res.status).toBe(401)
    })

    it('PATCH updates character name', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionCharacter.update.mockResolvedValue({ id: 'c-1', name: 'New' })
      const mod = await import('@/app/api/novel-promotion/[projectId]/character/route')
      const req = buildMockRequest({ path: `${BASE}/character`, method: 'PATCH', body: { characterId: 'c-1', name: 'New' } })
      const res = await mod.PATCH(req, ctx())
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('DELETE returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/character/route')
      const req = buildMockRequest({ path: `${BASE}/character`, method: 'DELETE', query: { id: 'c-1' } })
      const res = await mod.DELETE(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/character/route')
      const req = buildMockRequest({ path: `${BASE}/character`, method: 'POST', body: { name: 'Hero' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST creates a character', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionCharacter.create.mockResolvedValue({ id: 'c-new', name: 'Hero' })
      prismaMock.characterAppearance.create.mockResolvedValue({ id: 'app-1' })
      prismaMock.novelPromotionCharacter.findUnique.mockResolvedValue({ id: 'c-new', name: 'Hero', appearances: [] })
      const mod = await import('@/app/api/novel-promotion/[projectId]/character/route')
      const req = buildMockRequest({ path: `${BASE}/character`, method: 'POST', body: { name: 'Hero' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })
  })

  // =========================================================================
  // 4. Character appearance (POST, PATCH, DELETE)
  // =========================================================================
  describe('character/appearance/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/character/appearance/route')
      const req = buildMockRequest({ path: `${BASE}/character/appearance`, method: 'POST', body: { characterId: 'c-1', changeReason: 'test', description: 'desc' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST creates an appearance', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionCharacter.findUnique.mockResolvedValue({
        id: 'c-1',
        appearances: [{ appearanceIndex: 0 }],
        novelPromotionProject: { projectId: PID },
      })
      prismaMock.characterAppearance.create.mockResolvedValue({ id: 'app-new', appearanceIndex: 1 })
      const mod = await import('@/app/api/novel-promotion/[projectId]/character/appearance/route')
      const req = buildMockRequest({ path: `${BASE}/character/appearance`, method: 'POST', body: { characterId: 'c-1', changeReason: 'transformation', description: 'new look' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('PATCH returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/character/appearance/route')
      const req = buildMockRequest({ path: `${BASE}/character/appearance`, method: 'PATCH', body: { characterId: 'c-1', appearanceId: 'app-1', description: 'updated' } })
      const res = await mod.PATCH(req, ctx())
      expect(res.status).toBe(401)
    })

    it('DELETE returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/character/appearance/route')
      const req = buildMockRequest({ path: `${BASE}/character/appearance`, method: 'DELETE', query: { characterId: 'c-1', appearanceId: 'app-1' } })
      const res = await mod.DELETE(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 5. Character confirm-selection
  // =========================================================================
  describe('character/confirm-selection/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/character/confirm-selection/route')
      const req = buildMockRequest({ path: `${BASE}/character/confirm-selection`, method: 'POST', body: { characterId: 'c-1', appearanceId: 'app-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST confirms selection', async () => {
      authState.authenticated = true
      prismaMock.characterAppearance.findUnique.mockResolvedValue({
        id: 'app-1',
        selectedIndex: 0,
        imageUrls: '["url1","url2"]',
        descriptions: '["d1","d2"]',
        description: 'd1',
        character: { name: 'Hero' },
      })
      prismaMock.characterAppearance.update.mockResolvedValue({})
      const mod = await import('@/app/api/novel-promotion/[projectId]/character/confirm-selection/route')
      const req = buildMockRequest({ path: `${BASE}/character/confirm-selection`, method: 'POST', body: { characterId: 'c-1', appearanceId: 'app-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(200)
    })
  })

  // =========================================================================
  // 6. Character-profile confirm
  // =========================================================================
  describe('character-profile/confirm/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/character-profile/confirm/route')
      const req = buildMockRequest({ path: `${BASE}/character-profile/confirm`, method: 'POST', body: { characterId: 'c-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST submits task when authenticated', async () => {
      authState.authenticated = true
      const mod = await import('@/app/api/novel-promotion/[projectId]/character-profile/confirm/route')
      const req = buildMockRequest({ path: `${BASE}/character-profile/confirm`, method: 'POST', body: { characterId: 'c-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(202)
    })
  })

  // =========================================================================
  // 7. Character-profile batch-confirm
  // =========================================================================
  describe('character-profile/batch-confirm/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/character-profile/batch-confirm/route')
      const req = buildMockRequest({ path: `${BASE}/character-profile/batch-confirm`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST submits batch task when authenticated', async () => {
      authState.authenticated = true
      const mod = await import('@/app/api/novel-promotion/[projectId]/character-profile/batch-confirm/route')
      const req = buildMockRequest({ path: `${BASE}/character-profile/batch-confirm`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(202)
    })
  })

  // =========================================================================
  // 8. Character-voice (PATCH, POST)
  // =========================================================================
  describe('character-voice/route.ts', () => {
    it('PATCH returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/character-voice/route')
      const req = buildMockRequest({ path: `${BASE}/character-voice`, method: 'PATCH', body: { characterId: 'c-1' } })
      const res = await mod.PATCH(req, ctx())
      expect(res.status).toBe(401)
    })

    it('PATCH updates voice settings', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionCharacter.update.mockResolvedValue({ id: 'c-1', voiceType: 'preset', voiceId: 'v-1' })
      const mod = await import('@/app/api/novel-promotion/[projectId]/character-voice/route')
      const req = buildMockRequest({ path: `${BASE}/character-voice`, method: 'PATCH', body: { characterId: 'c-1', voiceType: 'preset', voiceId: 'v-1' } })
      const res = await mod.PATCH(req, ctx())
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/character-voice/route')
      const req = buildMockRequest({ path: `${BASE}/character-voice`, method: 'POST', body: { characterId: 'c-1', voiceDesign: { voiceId: 'v1', audioBase64: 'data' } } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 9. Location (DELETE, POST, PATCH)
  // =========================================================================
  describe('location/route.ts', () => {
    it('DELETE returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/location/route')
      const req = buildMockRequest({ path: `${BASE}/location`, method: 'DELETE', query: { id: 'l-1' } })
      const res = await mod.DELETE(req, ctx())
      expect(res.status).toBe(401)
    })

    it('DELETE deletes a location', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionLocation.delete.mockResolvedValue({})
      const mod = await import('@/app/api/novel-promotion/[projectId]/location/route')
      const req = buildMockRequest({ path: `${BASE}/location`, method: 'DELETE', query: { id: 'l-1' } })
      const res = await mod.DELETE(req, ctx())
      expect(res.status).toBe(200)
    })

    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/location/route')
      const req = buildMockRequest({ path: `${BASE}/location`, method: 'POST', body: { name: 'Forest', description: 'A dense forest' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST creates a location', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionLocation.create.mockResolvedValue({ id: 'l-new', name: 'Forest' })
      prismaMock.locationImage.createMany.mockResolvedValue({ count: 1 })
      prismaMock.novelPromotionLocation.findUnique.mockResolvedValue({ id: 'l-new', name: 'Forest', images: [] })
      const mod = await import('@/app/api/novel-promotion/[projectId]/location/route')
      const req = buildMockRequest({ path: `${BASE}/location`, method: 'POST', body: { name: 'Forest', description: 'A dense forest' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('PATCH returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/location/route')
      const req = buildMockRequest({ path: `${BASE}/location`, method: 'PATCH', body: { locationId: 'l-1', name: 'New Forest' } })
      const res = await mod.PATCH(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 10. Location confirm-selection
  // =========================================================================
  describe('location/confirm-selection/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/location/confirm-selection/route')
      const req = buildMockRequest({ path: `${BASE}/location/confirm-selection`, method: 'POST', body: { locationId: 'l-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST confirms location selection', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionLocation.findUnique.mockResolvedValue({
        id: 'l-1',
        name: 'Forest',
        selectedImageId: 'img-1',
        images: [
          { id: 'img-1', imageUrl: 'url1', isSelected: true, imageIndex: 0 },
          { id: 'img-2', imageUrl: 'url2', isSelected: false, imageIndex: 1 },
        ],
      })
      prismaMock.locationImage.deleteMany.mockResolvedValue({})
      prismaMock.locationImage.update.mockResolvedValue({})
      prismaMock.novelPromotionLocation.update.mockResolvedValue({})
      const mod = await import('@/app/api/novel-promotion/[projectId]/location/confirm-selection/route')
      const req = buildMockRequest({ path: `${BASE}/location/confirm-selection`, method: 'POST', body: { locationId: 'l-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(200)
    })
  })

  // =========================================================================
  // 11. Storyboards (GET, PATCH)
  // =========================================================================
  describe('storyboards/route.ts', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/storyboards/route')
      const req = buildMockRequest({ path: `${BASE}/storyboards`, method: 'GET', query: { episodeId: 'ep-1' } })
      const res = await mod.GET(req, ctx())
      expect(res.status).toBe(401)
    })

    it('GET returns storyboards', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionStoryboard.findMany.mockResolvedValue([])
      const mod = await import('@/app/api/novel-promotion/[projectId]/storyboards/route')
      const req = buildMockRequest({ path: `${BASE}/storyboards`, method: 'GET', query: { episodeId: 'ep-1' } })
      const res = await mod.GET(req, ctx())
      expect(res.status).toBe(200)
    })

    it('PATCH returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/storyboards/route')
      const req = buildMockRequest({ path: `${BASE}/storyboards`, method: 'PATCH', body: { storyboardId: 'sb-1' } })
      const res = await mod.PATCH(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 12. Storyboard-group (POST, PUT, DELETE)
  // =========================================================================
  describe('storyboard-group/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/storyboard-group/route')
      const req = buildMockRequest({ path: `${BASE}/storyboard-group`, method: 'POST', body: { episodeId: 'ep-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST creates storyboard group', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionEpisode.findUnique.mockResolvedValue({ id: 'ep-1', clips: [] })
      prismaMock.novelPromotionClip.create.mockResolvedValue({ id: 'clip-new', createdAt: new Date() })
      prismaMock.novelPromotionStoryboard.create.mockResolvedValue({ id: 'sb-new' })
      prismaMock.novelPromotionPanel.create.mockResolvedValue({ id: 'panel-new' })
      const mod = await import('@/app/api/novel-promotion/[projectId]/storyboard-group/route')
      const req = buildMockRequest({ path: `${BASE}/storyboard-group`, method: 'POST', body: { episodeId: 'ep-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('PUT returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/storyboard-group/route')
      const req = buildMockRequest({ path: `${BASE}/storyboard-group`, method: 'PUT', body: { episodeId: 'ep-1', clipId: 'c-1', direction: 'up' } })
      const res = await mod.PUT(req, ctx())
      expect(res.status).toBe(401)
    })

    it('DELETE returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/storyboard-group/route')
      const req = buildMockRequest({ path: `${BASE}/storyboard-group`, method: 'DELETE', query: { storyboardId: 'sb-1' } })
      const res = await mod.DELETE(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 13. Panel (POST, DELETE, PATCH, PUT)
  // =========================================================================
  describe('panel/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/panel/route')
      const req = buildMockRequest({ path: `${BASE}/panel`, method: 'POST', body: { storyboardId: 'sb-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST creates a panel', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionStoryboard.findUnique.mockResolvedValue({ id: 'sb-1', panels: [] })
      prismaMock.novelPromotionPanel.create.mockResolvedValue({ id: 'p-new', panelIndex: 0 })
      prismaMock.novelPromotionPanel.count.mockResolvedValue(1)
      prismaMock.novelPromotionStoryboard.update.mockResolvedValue({})
      const mod = await import('@/app/api/novel-promotion/[projectId]/panel/route')
      const req = buildMockRequest({ path: `${BASE}/panel`, method: 'POST', body: { storyboardId: 'sb-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(200)
    })

    it('DELETE returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/panel/route')
      const req = buildMockRequest({ path: `${BASE}/panel`, method: 'DELETE', query: { panelId: 'p-1' } })
      const res = await mod.DELETE(req, ctx())
      expect(res.status).toBe(401)
    })

    it('PATCH returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/panel/route')
      const req = buildMockRequest({ path: `${BASE}/panel`, method: 'PATCH', body: { panelId: 'p-1', videoPrompt: 'test' } })
      const res = await mod.PATCH(req, ctx())
      expect(res.status).toBe(401)
    })

    it('PUT returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/panel/route')
      const req = buildMockRequest({ path: `${BASE}/panel`, method: 'PUT', body: { storyboardId: 'sb-1', panelIndex: 0 } })
      const res = await mod.PUT(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 14. Panel-link
  // =========================================================================
  describe('panel-link/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/panel-link/route')
      const req = buildMockRequest({ path: `${BASE}/panel-link`, method: 'POST', body: { storyboardId: 'sb-1', panelIndex: 0, linked: true } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST updates panel link', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionPanel.update.mockResolvedValue({})
      const mod = await import('@/app/api/novel-promotion/[projectId]/panel-link/route')
      const req = buildMockRequest({ path: `${BASE}/panel-link`, method: 'POST', body: { storyboardId: 'sb-1', panelIndex: 0, linked: true } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(200)
    })
  })

  // =========================================================================
  // 15. Panel select-candidate
  // =========================================================================
  describe('panel/select-candidate/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/panel/select-candidate/route')
      const req = buildMockRequest({ path: `${BASE}/panel/select-candidate`, method: 'POST', body: { panelId: 'p-1', action: 'cancel' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST cancels candidate selection', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionPanel.update.mockResolvedValue({})
      const mod = await import('@/app/api/novel-promotion/[projectId]/panel/select-candidate/route')
      const req = buildMockRequest({ path: `${BASE}/panel/select-candidate`, method: 'POST', body: { panelId: 'p-1', action: 'cancel' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })
  })

  // =========================================================================
  // 16. Clips
  // =========================================================================
  describe('clips/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/clips/route')
      const req = buildMockRequest({ path: `${BASE}/clips`, method: 'POST', body: { episodeId: 'ep-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST submits clips build task', async () => {
      authState.authenticated = true
      const mod = await import('@/app/api/novel-promotion/[projectId]/clips/route')
      const req = buildMockRequest({ path: `${BASE}/clips`, method: 'POST', body: { episodeId: 'ep-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(202)
    })
  })

  // =========================================================================
  // 17. Clips [clipId]
  // =========================================================================
  describe('clips/[clipId]/route.ts', () => {
    it('PATCH returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/clips/[clipId]/route')
      const req = buildMockRequest({ path: `${BASE}/clips/clip-1`, method: 'PATCH', body: { content: 'updated' } })
      const res = await mod.PATCH(req, clipCtx())
      expect(res.status).toBe(401)
    })

    it('PATCH updates clip', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionClip.update.mockResolvedValue({ id: 'clip-1', content: 'updated' })
      const mod = await import('@/app/api/novel-promotion/[projectId]/clips/[clipId]/route')
      const req = buildMockRequest({ path: `${BASE}/clips/clip-1`, method: 'PATCH', body: { content: 'updated' } })
      const res = await mod.PATCH(req, clipCtx())
      expect(res.status).toBe(200)
    })
  })

  // =========================================================================
  // 18. Episodes (GET, POST)
  // =========================================================================
  describe('episodes/route.ts', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/episodes/route')
      const req = buildMockRequest({ path: `${BASE}/episodes`, method: 'GET' })
      const res = await mod.GET(req, ctx())
      expect(res.status).toBe(401)
    })

    it('GET returns episodes', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionEpisode.findMany.mockResolvedValue([{ id: 'ep-1', name: 'Episode 1' }])
      const mod = await import('@/app/api/novel-promotion/[projectId]/episodes/route')
      const req = buildMockRequest({ path: `${BASE}/episodes`, method: 'GET' })
      const res = await mod.GET(req, ctx())
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.episodes).toBeDefined()
    })

    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/episodes/route')
      const req = buildMockRequest({ path: `${BASE}/episodes`, method: 'POST', body: { name: 'Episode 1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST creates an episode', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionEpisode.findFirst.mockResolvedValue(null)
      prismaMock.novelPromotionEpisode.create.mockResolvedValue({ id: 'ep-new', episodeNumber: 1, name: 'Episode 1' })
      prismaMock.novelPromotionProject.update.mockResolvedValue({})
      const mod = await import('@/app/api/novel-promotion/[projectId]/episodes/route')
      const req = buildMockRequest({ path: `${BASE}/episodes`, method: 'POST', body: { name: 'Episode 1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(201)
    })

    it('POST rejects missing name', async () => {
      authState.authenticated = true
      const mod = await import('@/app/api/novel-promotion/[projectId]/episodes/route')
      const req = buildMockRequest({ path: `${BASE}/episodes`, method: 'POST', body: { name: '' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })

  // =========================================================================
  // 19. Episodes [episodeId] (GET, PATCH, DELETE)
  // =========================================================================
  describe('episodes/[episodeId]/route.ts', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/episodes/[episodeId]/route')
      const req = buildMockRequest({ path: `${BASE}/episodes/ep-1`, method: 'GET' })
      const res = await mod.GET(req, episodeCtx())
      expect(res.status).toBe(401)
    })

    it('GET returns episode data', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionEpisode.findUnique.mockResolvedValue({
        id: 'ep-1',
        name: 'Episode 1',
        clips: [],
        storyboards: [],
        shots: [],
        voiceLines: [],
      })
      prismaMock.novelPromotionProject.update.mockImplementation(() => Promise.resolve())
      const mod = await import('@/app/api/novel-promotion/[projectId]/episodes/[episodeId]/route')
      const req = buildMockRequest({ path: `${BASE}/episodes/ep-1`, method: 'GET' })
      const res = await mod.GET(req, episodeCtx())
      expect(res.status).toBe(200)
    })

    it('PATCH returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/episodes/[episodeId]/route')
      const req = buildMockRequest({ path: `${BASE}/episodes/ep-1`, method: 'PATCH', body: { name: 'Updated' } })
      const res = await mod.PATCH(req, episodeCtx())
      expect(res.status).toBe(401)
    })

    it('DELETE returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/episodes/[episodeId]/route')
      const req = buildMockRequest({ path: `${BASE}/episodes/ep-1`, method: 'DELETE' })
      const res = await mod.DELETE(req, episodeCtx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 20. Episodes batch
  // =========================================================================
  describe('episodes/batch/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/episodes/batch/route')
      const req = buildMockRequest({ path: `${BASE}/episodes/batch`, method: 'POST', body: { episodes: [] } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST creates batch episodes', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionProject.findFirst.mockResolvedValue({ id: 'nd-1', projectId: PID })
      prismaMock.novelPromotionEpisode.findFirst.mockResolvedValue(null)
      prismaMock.novelPromotionEpisode.create.mockResolvedValue({ id: 'ep-1', episodeNumber: 1, name: 'Ep 1' })
      prismaMock.$transaction.mockResolvedValue([{ id: 'ep-1', episodeNumber: 1, name: 'Ep 1' }])
      prismaMock.novelPromotionProject.update.mockResolvedValue({})
      const mod = await import('@/app/api/novel-promotion/[projectId]/episodes/batch/route')
      const req = buildMockRequest({
        path: `${BASE}/episodes/batch`,
        method: 'POST',
        body: { episodes: [{ name: 'Ep 1', novelText: 'text' }] },
      })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(200)
    })
  })

  // =========================================================================
  // 21. Episodes split
  // =========================================================================
  describe('episodes/split/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/episodes/split/route')
      const req = buildMockRequest({ path: `${BASE}/episodes/split`, method: 'POST', body: { content: 'a'.repeat(200) } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST submits split task', async () => {
      authState.authenticated = true
      const mod = await import('@/app/api/novel-promotion/[projectId]/episodes/split/route')
      const req = buildMockRequest({ path: `${BASE}/episodes/split`, method: 'POST', body: { content: 'a'.repeat(200) } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(202)
    })
  })

  // =========================================================================
  // 22. Episodes split-by-markers
  // =========================================================================
  describe('episodes/split-by-markers/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/episodes/split-by-markers/route')
      const req = buildMockRequest({ path: `${BASE}/episodes/split-by-markers`, method: 'POST', body: { content: 'a'.repeat(200) } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST splits by markers', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionProject.findFirst.mockResolvedValue({
        projectId: PID,
        project: { name: 'Test Project' },
      })
      const mod = await import('@/app/api/novel-promotion/[projectId]/episodes/split-by-markers/route')
      const req = buildMockRequest({ path: `${BASE}/episodes/split-by-markers`, method: 'POST', body: { content: 'a'.repeat(200) } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.episodes).toBeDefined()
    })
  })

  // =========================================================================
  // 23. Editor (GET, PUT, DELETE)
  // =========================================================================
  describe('editor/route.ts', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/editor/route')
      const req = buildMockRequest({ path: `${BASE}/editor`, method: 'GET', query: { episodeId: 'ep-1' } })
      const res = await mod.GET(req, ctx())
      expect(res.status).toBe(401)
    })

    it('GET returns editor project', async () => {
      authState.authenticated = true
      prismaMock.videoEditorProject.findUnique.mockResolvedValue({
        id: 'ed-1',
        episodeId: 'ep-1',
        projectData: '{}',
        renderStatus: null,
        outputUrl: null,
        updatedAt: new Date(),
      })
      const mod = await import('@/app/api/novel-promotion/[projectId]/editor/route')
      const req = buildMockRequest({ path: `${BASE}/editor`, method: 'GET', query: { episodeId: 'ep-1' } })
      const res = await mod.GET(req, ctx())
      expect(res.status).toBe(200)
    })

    it('PUT returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/editor/route')
      const req = buildMockRequest({ path: `${BASE}/editor`, method: 'PUT', body: { episodeId: 'ep-1', projectData: {} } })
      const res = await mod.PUT(req, ctx())
      expect(res.status).toBe(401)
    })

    it('DELETE returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/editor/route')
      const req = buildMockRequest({ path: `${BASE}/editor`, method: 'DELETE', query: { episodeId: 'ep-1' } })
      const res = await mod.DELETE(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 24. Speaker-voice (GET, PATCH)
  // =========================================================================
  describe('speaker-voice/route.ts', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/speaker-voice/route')
      const req = buildMockRequest({ path: `${BASE}/speaker-voice`, method: 'GET', query: { episodeId: 'ep-1' } })
      const res = await mod.GET(req, ctx())
      expect(res.status).toBe(401)
    })

    it('GET returns speaker voices', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionEpisode.findUnique.mockResolvedValue({
        id: 'ep-1',
        speakerVoices: null,
      })
      const mod = await import('@/app/api/novel-promotion/[projectId]/speaker-voice/route')
      const req = buildMockRequest({ path: `${BASE}/speaker-voice`, method: 'GET', query: { episodeId: 'ep-1' } })
      const res = await mod.GET(req, ctx())
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.speakerVoices).toBeDefined()
    })

    it('PATCH returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/speaker-voice/route')
      const req = buildMockRequest({ path: `${BASE}/speaker-voice`, method: 'PATCH', body: { episodeId: 'ep-1', speaker: 'Alice', provider: 'bailian', voiceId: 'v-1' } })
      const res = await mod.PATCH(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 25. Voice-lines (GET, POST, PATCH, DELETE)
  // =========================================================================
  describe('voice-lines/route.ts', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/voice-lines/route')
      const req = buildMockRequest({ path: `${BASE}/voice-lines`, method: 'GET', query: { episodeId: 'ep-1' } })
      const res = await mod.GET(req, ctx())
      expect(res.status).toBe(401)
    })

    it('GET returns voice lines', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionVoiceLine.findMany.mockResolvedValue([])
      const mod = await import('@/app/api/novel-promotion/[projectId]/voice-lines/route')
      const req = buildMockRequest({ path: `${BASE}/voice-lines`, method: 'GET', query: { episodeId: 'ep-1' } })
      const res = await mod.GET(req, ctx())
      expect(res.status).toBe(200)
    })

    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/voice-lines/route')
      const req = buildMockRequest({ path: `${BASE}/voice-lines`, method: 'POST', body: { episodeId: 'ep-1', content: 'Hello', speaker: 'Alice' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('PATCH returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/voice-lines/route')
      const req = buildMockRequest({ path: `${BASE}/voice-lines`, method: 'PATCH', body: { lineId: 'vl-1', content: 'Updated' } })
      const res = await mod.PATCH(req, ctx())
      expect(res.status).toBe(401)
    })

    it('DELETE returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/voice-lines/route')
      const req = buildMockRequest({ path: `${BASE}/voice-lines`, method: 'DELETE', query: { lineId: 'vl-1' } })
      const res = await mod.DELETE(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 26. Photography-plan (PUT)
  // =========================================================================
  describe('photography-plan/route.ts', () => {
    it('PUT returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/photography-plan/route')
      const req = buildMockRequest({ path: `${BASE}/photography-plan`, method: 'PUT', body: { storyboardId: 'sb-1' } })
      const res = await mod.PUT(req, ctx())
      expect(res.status).toBe(401)
    })

    it('PUT updates photography plan', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionStoryboard.findUnique.mockResolvedValue({ id: 'sb-1' })
      prismaMock.novelPromotionStoryboard.update.mockResolvedValue({})
      const mod = await import('@/app/api/novel-promotion/[projectId]/photography-plan/route')
      const req = buildMockRequest({ path: `${BASE}/photography-plan`, method: 'PUT', body: { storyboardId: 'sb-1', photographyPlan: { rules: [] } } })
      const res = await mod.PUT(req, ctx())
      expect(res.status).toBe(200)
    })
  })

  // =========================================================================
  // 27. Video-urls (POST)
  // =========================================================================
  describe('video-urls/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/video-urls/route')
      const req = buildMockRequest({ path: `${BASE}/video-urls`, method: 'POST', body: { episodeId: 'ep-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 28. Video-proxy (GET)
  // =========================================================================
  describe('video-proxy/route.ts', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/video-proxy/route')
      const req = buildMockRequest({ path: `${BASE}/video-proxy`, method: 'GET', query: { key: 'some-key' } })
      const res = await mod.GET(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 29. Copy-from-global (POST)
  // =========================================================================
  describe('copy-from-global/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/copy-from-global/route')
      const req = buildMockRequest({ path: `${BASE}/copy-from-global`, method: 'POST', body: { type: 'character', targetId: 'c-1', globalAssetId: 'g-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST copies voice from global', async () => {
      authState.authenticated = true
      prismaMock.globalVoice.findFirst.mockResolvedValue({ id: 'gv-1', name: 'Voice', voiceId: 'vid', voiceType: 'custom', customVoiceUrl: null })
      prismaMock.novelPromotionCharacter.findUnique.mockResolvedValue({ id: 'c-1', name: 'Hero' })
      prismaMock.novelPromotionCharacter.update.mockResolvedValue({ id: 'c-1' })
      const mod = await import('@/app/api/novel-promotion/[projectId]/copy-from-global/route')
      const req = buildMockRequest({ path: `${BASE}/copy-from-global`, method: 'POST', body: { type: 'voice', targetId: 'c-1', globalAssetId: 'gv-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(200)
    })
  })

  // =========================================================================
  // 30. Cleanup-unselected-images (POST)
  // =========================================================================
  describe('cleanup-unselected-images/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/cleanup-unselected-images/route')
      const req = buildMockRequest({ path: `${BASE}/cleanup-unselected-images`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST cleans up unselected images', async () => {
      authState.authenticated = true
      prismaMock.characterAppearance.findMany.mockResolvedValue([])
      prismaMock.novelPromotionLocation.findMany.mockResolvedValue([])
      const mod = await import('@/app/api/novel-promotion/[projectId]/cleanup-unselected-images/route')
      const req = buildMockRequest({ path: `${BASE}/cleanup-unselected-images`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.deletedCount).toBe(0)
    })
  })

  // =========================================================================
  // 31. Update-appearance (POST)
  // =========================================================================
  describe('update-appearance/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/update-appearance/route')
      const req = buildMockRequest({ path: `${BASE}/update-appearance`, method: 'POST', body: { characterId: 'c-1', appearanceId: 'app-1', newDescription: 'desc' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST updates appearance description', async () => {
      authState.authenticated = true
      prismaMock.characterAppearance.findUnique.mockResolvedValue({
        id: 'app-1',
        description: 'old',
        descriptions: '["old"]',
      })
      prismaMock.characterAppearance.update.mockResolvedValue({})
      const mod = await import('@/app/api/novel-promotion/[projectId]/update-appearance/route')
      const req = buildMockRequest({ path: `${BASE}/update-appearance`, method: 'POST', body: { characterId: 'c-1', appearanceId: 'app-1', newDescription: 'new desc' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(200)
    })
  })

  // =========================================================================
  // 32. Update-location (POST)
  // =========================================================================
  describe('update-location/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/update-location/route')
      const req = buildMockRequest({ path: `${BASE}/update-location`, method: 'POST', body: { locationId: 'l-1', newDescription: 'desc' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST updates location description', async () => {
      authState.authenticated = true
      prismaMock.locationImage.findFirst.mockResolvedValue({ id: 'li-1', locationId: 'l-1', imageIndex: 0 })
      prismaMock.locationImage.update.mockResolvedValue({})
      const mod = await import('@/app/api/novel-promotion/[projectId]/update-location/route')
      const req = buildMockRequest({ path: `${BASE}/update-location`, method: 'POST', body: { locationId: 'l-1', newDescription: 'updated' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(200)
    })
  })

  // =========================================================================
  // 33. Update-prompt (POST)
  // =========================================================================
  describe('update-prompt/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/update-prompt/route')
      const req = buildMockRequest({ path: `${BASE}/update-prompt`, method: 'POST', body: { shotId: 's-1', field: 'imagePrompt', value: 'new prompt' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST updates shot prompt', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionShot.update.mockResolvedValue({ id: 's-1' })
      const mod = await import('@/app/api/novel-promotion/[projectId]/update-prompt/route')
      const req = buildMockRequest({ path: `${BASE}/update-prompt`, method: 'POST', body: { shotId: 's-1', field: 'imagePrompt', value: 'new prompt' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(200)
    })

    it('POST rejects invalid field', async () => {
      authState.authenticated = true
      const mod = await import('@/app/api/novel-promotion/[projectId]/update-prompt/route')
      const req = buildMockRequest({ path: `${BASE}/update-prompt`, method: 'POST', body: { shotId: 's-1', field: 'invalid', value: 'test' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })

  // =========================================================================
  // 34. Update-asset-label (POST)
  // =========================================================================
  describe('update-asset-label/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/update-asset-label/route')
      const req = buildMockRequest({ path: `${BASE}/update-asset-label`, method: 'POST', body: { type: 'character', id: 'c-1', newName: 'New Name' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 35. Upload-asset-image (POST)
  // =========================================================================
  describe('upload-asset-image/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      // This uses FormData, so we test auth separately
      const mod = await import('@/app/api/novel-promotion/[projectId]/upload-asset-image/route')
      const req = buildMockRequest({ path: `${BASE}/upload-asset-image`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 36. Select-character-image (POST)
  // =========================================================================
  describe('select-character-image/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/select-character-image/route')
      const req = buildMockRequest({ path: `${BASE}/select-character-image`, method: 'POST', body: { characterId: 'c-1', appearanceId: 'app-1', selectedIndex: 0 } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST selects character image', async () => {
      authState.authenticated = true
      prismaMock.characterAppearance.findUnique.mockResolvedValue({
        id: 'app-1',
        imageUrls: '["url1","url2"]',
        character: { name: 'Hero' },
      })
      prismaMock.characterAppearance.update.mockResolvedValue({})
      const mod = await import('@/app/api/novel-promotion/[projectId]/select-character-image/route')
      const req = buildMockRequest({ path: `${BASE}/select-character-image`, method: 'POST', body: { characterId: 'c-1', appearanceId: 'app-1', selectedIndex: 0 } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(200)
    })
  })

  // =========================================================================
  // 37. Select-location-image (POST)
  // =========================================================================
  describe('select-location-image/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/select-location-image/route')
      const req = buildMockRequest({ path: `${BASE}/select-location-image`, method: 'POST', body: { locationId: 'l-1', selectedIndex: 0 } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST selects location image', async () => {
      authState.authenticated = true
      prismaMock.novelPromotionLocation.findUnique.mockResolvedValue({
        id: 'l-1',
        name: 'Forest',
        images: [{ imageIndex: 0, imageUrl: 'url1', isSelected: false, id: 'img-1' }],
      })
      prismaMock.locationImage.updateMany.mockResolvedValue({})
      prismaMock.locationImage.update.mockResolvedValue({ id: 'img-1', imageUrl: 'url1' })
      prismaMock.novelPromotionLocation.update.mockResolvedValue({})
      const mod = await import('@/app/api/novel-promotion/[projectId]/select-location-image/route')
      const req = buildMockRequest({ path: `${BASE}/select-location-image`, method: 'POST', body: { locationId: 'l-1', selectedIndex: 0 } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(200)
    })
  })

  // =========================================================================
  // 38. Undo-regenerate (POST)
  // =========================================================================
  describe('undo-regenerate/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/undo-regenerate/route')
      const req = buildMockRequest({ path: `${BASE}/undo-regenerate`, method: 'POST', body: { type: 'character', id: 'c-1', appearanceId: 'a0000000-0000-0000-0000-000000000000' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 39. Download-images (GET)
  // =========================================================================
  describe('download-images/route.ts', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/download-images/route')
      const req = buildMockRequest({ path: `${BASE}/download-images`, method: 'GET', query: { episodeId: 'ep-1' } })
      const res = await mod.GET(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 40. Download-videos (POST)
  // =========================================================================
  describe('download-videos/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/download-videos/route')
      const req = buildMockRequest({ path: `${BASE}/download-videos`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 41. Download-voices (GET)
  // =========================================================================
  describe('download-voices/route.ts', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/download-voices/route')
      const req = buildMockRequest({ path: `${BASE}/download-voices`, method: 'GET' })
      const res = await mod.GET(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // AI / Generation routes - test auth + basic validation
  // =========================================================================

  // =========================================================================
  // 42. Analyze
  // =========================================================================
  describe('analyze/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/analyze/route')
      const req = buildMockRequest({ path: `${BASE}/analyze`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST submits analyze task', async () => {
      authState.authenticated = true
      const mod = await import('@/app/api/novel-promotion/[projectId]/analyze/route')
      const req = buildMockRequest({ path: `${BASE}/analyze`, method: 'POST', body: { episodeId: 'ep-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(202)
    })
  })

  // =========================================================================
  // 43. Analyze-global
  // =========================================================================
  describe('analyze-global/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/analyze-global/route')
      const req = buildMockRequest({ path: `${BASE}/analyze-global`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST submits global analyze task', async () => {
      authState.authenticated = true
      const mod = await import('@/app/api/novel-promotion/[projectId]/analyze-global/route')
      const req = buildMockRequest({ path: `${BASE}/analyze-global`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(202)
    })
  })

  // =========================================================================
  // 44. Analyze-shot-variants
  // =========================================================================
  describe('analyze-shot-variants/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/analyze-shot-variants/route')
      const req = buildMockRequest({ path: `${BASE}/analyze-shot-variants`, method: 'POST', body: { panelId: 'p-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 45. AI-create-character
  // =========================================================================
  describe('ai-create-character/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/ai-create-character/route')
      const req = buildMockRequest({ path: `${BASE}/ai-create-character`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 46. AI-create-location
  // =========================================================================
  describe('ai-create-location/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/ai-create-location/route')
      const req = buildMockRequest({ path: `${BASE}/ai-create-location`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 47. AI-modify-appearance
  // =========================================================================
  describe('ai-modify-appearance/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/ai-modify-appearance/route')
      const req = buildMockRequest({ path: `${BASE}/ai-modify-appearance`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 48. AI-modify-location
  // =========================================================================
  describe('ai-modify-location/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/ai-modify-location/route')
      const req = buildMockRequest({ path: `${BASE}/ai-modify-location`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 49. AI-modify-shot-prompt
  // =========================================================================
  describe('ai-modify-shot-prompt/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/ai-modify-shot-prompt/route')
      const req = buildMockRequest({ path: `${BASE}/ai-modify-shot-prompt`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 50. Generate-image
  // =========================================================================
  describe('generate-image/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/generate-image/route')
      const req = buildMockRequest({ path: `${BASE}/generate-image`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 51. Generate-character-image
  // =========================================================================
  describe('generate-character-image/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/generate-character-image/route')
      const req = buildMockRequest({ path: `${BASE}/generate-character-image`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 52. Generate-video
  // =========================================================================
  describe('generate-video/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/generate-video/route')
      const req = buildMockRequest({ path: `${BASE}/generate-video`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 53. Modify-asset-image
  // =========================================================================
  describe('modify-asset-image/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/modify-asset-image/route')
      const req = buildMockRequest({ path: `${BASE}/modify-asset-image`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 54. Modify-storyboard-image
  // =========================================================================
  describe('modify-storyboard-image/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/modify-storyboard-image/route')
      const req = buildMockRequest({ path: `${BASE}/modify-storyboard-image`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 55. Regenerate-group
  // =========================================================================
  describe('regenerate-group/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/regenerate-group/route')
      const req = buildMockRequest({ path: `${BASE}/regenerate-group`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 56. Regenerate-panel-image
  // =========================================================================
  describe('regenerate-panel-image/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/regenerate-panel-image/route')
      const req = buildMockRequest({ path: `${BASE}/regenerate-panel-image`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 57. Regenerate-single-image
  // =========================================================================
  describe('regenerate-single-image/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/regenerate-single-image/route')
      const req = buildMockRequest({ path: `${BASE}/regenerate-single-image`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 58. Regenerate-storyboard-text
  // =========================================================================
  describe('regenerate-storyboard-text/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/regenerate-storyboard-text/route')
      const req = buildMockRequest({ path: `${BASE}/regenerate-storyboard-text`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 59. Reference-to-character
  // =========================================================================
  describe('reference-to-character/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/reference-to-character/route')
      const req = buildMockRequest({ path: `${BASE}/reference-to-character`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 60. Screenplay-conversion
  // =========================================================================
  describe('screenplay-conversion/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/screenplay-conversion/route')
      const req = buildMockRequest({ path: `${BASE}/screenplay-conversion`, method: 'POST', body: { episodeId: 'ep-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 61. Story-to-script-stream
  // =========================================================================
  describe('story-to-script-stream/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/story-to-script-stream/route')
      const req = buildMockRequest({ path: `${BASE}/story-to-script-stream`, method: 'POST', body: { episodeId: 'ep-1', content: 'some content' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 62. Script-to-storyboard-stream
  // =========================================================================
  describe('script-to-storyboard-stream/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/script-to-storyboard-stream/route')
      const req = buildMockRequest({ path: `${BASE}/script-to-storyboard-stream`, method: 'POST', body: { episodeId: 'ep-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 63. Voice-analyze
  // =========================================================================
  describe('voice-analyze/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/voice-analyze/route')
      const req = buildMockRequest({ path: `${BASE}/voice-analyze`, method: 'POST', body: { episodeId: 'ep-1' } })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 64. Voice-design
  // =========================================================================
  describe('voice-design/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/voice-design/route')
      const req = buildMockRequest({ path: `${BASE}/voice-design`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 65. Voice-generate
  // =========================================================================
  describe('voice-generate/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/voice-generate/route')
      const req = buildMockRequest({ path: `${BASE}/voice-generate`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 66. Lip-sync
  // =========================================================================
  describe('lip-sync/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/lip-sync/route')
      const req = buildMockRequest({ path: `${BASE}/lip-sync`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 67. Insert-panel
  // =========================================================================
  describe('insert-panel/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/insert-panel/route')
      const req = buildMockRequest({ path: `${BASE}/insert-panel`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 68. Panel-variant
  // =========================================================================
  describe('panel-variant/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/panel-variant/route')
      const req = buildMockRequest({ path: `${BASE}/panel-variant`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 69. Pipeline start
  // =========================================================================
  describe('pipeline/start/route.ts', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/pipeline/start/route')
      const req = buildMockRequest({ path: `${BASE}/pipeline/start`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 70. Pipeline status
  // =========================================================================
  describe('pipeline/status/route.ts', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/pipeline/status/route')
      const req = buildMockRequest({ path: `${BASE}/pipeline/status`, method: 'GET' })
      const res = await mod.GET(req, ctx())
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 71. Pipeline review (GET, POST)
  // =========================================================================
  describe('pipeline/review/route.ts', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/pipeline/review/route')
      const req = buildMockRequest({ path: `${BASE}/pipeline/review`, method: 'GET' })
      const res = await mod.GET(req, ctx())
      expect(res.status).toBe(401)
    })

    it('POST returns 401 when unauthenticated', async () => {
      const mod = await import('@/app/api/novel-promotion/[projectId]/pipeline/review/route')
      const req = buildMockRequest({ path: `${BASE}/pipeline/review`, method: 'POST', body: {} })
      const res = await mod.POST(req, ctx())
      expect(res.status).toBe(401)
    })
  })
})
