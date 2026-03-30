import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMockRequest } from '../../helpers/request'

// ---------------------------------------------------------------------------
// vi.hoisted mocks
// ---------------------------------------------------------------------------

const authState = vi.hoisted(() => ({ authenticated: true }))

const prismaMock = vi.hoisted(() => ({
  globalCharacter: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
  globalCharacterAppearance: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  globalLocation: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
  globalLocationImage: {
    findFirst: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  globalAssetFolder: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  globalVoice: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn(),
}))

const storageMock = vi.hoisted(() => ({
  getSignedUrl: vi.fn((key: string) => `https://signed.example.com/${key}`),
  getSignedObjectUrl: vi.fn().mockResolvedValue('https://signed.example.com/my-key'),
  uploadObject: vi.fn().mockResolvedValue('https://cos.example.com/uploaded-key'),
  generateUniqueKey: vi.fn((_prefix: string, ext: string) => `generated-key.${ext}`),
  deleteObject: vi.fn().mockResolvedValue(undefined),
  toFetchableUrl: vi.fn((url: string) => url),
  getStorageProvider: vi.fn(),
  getStorageType: vi.fn().mockReturnValue('cos'),
}))

const submitTaskMock = vi.hoisted(() => vi.fn().mockResolvedValue({ taskId: 'task-1', status: 'queued' }))
const maybeSubmitLLMTaskMock = vi.hoisted(() => vi.fn())
const getUserModelConfigMock = vi.hoisted(() => vi.fn().mockResolvedValue({
  characterModel: 'test-model',
  locationModel: 'test-model',
  editModel: 'test-model',
  analysisModel: 'test-analysis-model',
}))

// ---------------------------------------------------------------------------
// vi.mock declarations
// ---------------------------------------------------------------------------

vi.mock('@/lib/api-auth', () => {
  const unauthorized = () =>
    new Response(
      JSON.stringify({ error: { code: 'UNAUTHORIZED' } }),
      { status: 401, headers: { 'content-type': 'application/json' } },
    )
  return {
    isErrorResponse: (value: unknown) => value instanceof Response,
    requireUserAuth: async () => {
      if (!authState.authenticated) return unauthorized()
      return { session: { user: { id: 'user-1', name: 'Test User', email: 'test@test.com' } } }
    },
  }
})

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/storage', () => storageMock)

vi.mock('@/lib/logging/core', () => ({
  createScopedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    event: vi.fn(),
  }),
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}))

vi.mock('@/lib/logging/context', () => ({
  withLogContext: async (_ctx: unknown, fn: () => Promise<unknown>) => fn(),
  getLogContext: () => ({}),
  setLogContext: vi.fn(),
}))

vi.mock('@/lib/logging/semantic', () => ({
  logAuthAction: vi.fn(),
}))

vi.mock('@/lib/errors/normalize', () => ({
  normalizeAnyError: (error: unknown) => {
    const err = error instanceof Error ? error : new Error(String(error))
    return {
      code: 'INTERNAL_ERROR' as const,
      message: err.message,
      retryable: false,
      category: 'SYSTEM',
      userMessageKey: 'errors.INTERNAL_ERROR',
      details: {},
    }
  },
}))

vi.mock('@/lib/task/publisher', () => ({
  publishTaskEvent: vi.fn(),
  publishTaskStreamEvent: vi.fn(),
}))

vi.mock('@/lib/llm-observe/internal-stream-context', () => ({
  withInternalLLMStreamCallbacks: async (_cb: unknown, fn: () => Promise<unknown>) => fn(),
}))

vi.mock('@/lib/llm-observe/stage-pipeline', () => ({
  getTaskFlowMeta: () => ({
    flowId: 'test-flow',
    flowStageIndex: 1,
    flowStageTotal: 1,
    flowStageTitle: 'test',
  }),
}))

vi.mock('@/lib/media/attach', () => ({
  attachMediaFieldsToGlobalCharacter: vi.fn(async (char: unknown) => char),
  attachMediaFieldsToGlobalLocation: vi.fn(async (loc: unknown) => loc),
  attachMediaFieldsToGlobalVoice: vi.fn(async (voice: unknown) => voice),
}))

vi.mock('@/lib/media/service', () => ({
  resolveMediaRefFromLegacyValue: vi.fn().mockResolvedValue(null),
  resolveStorageKeyFromMediaValue: vi.fn().mockResolvedValue('some-storage-key'),
}))

vi.mock('@/lib/contracts/image-urls-contract', () => ({
  encodeImageUrls: vi.fn((urls: string[]) => JSON.stringify(urls)),
  decodeImageUrlsFromDb: vi.fn((_val: string | null) => []),
}))

vi.mock('@/lib/task/resolve-locale', () => ({
  resolveTaskLocale: vi.fn().mockReturnValue('zh-CN'),
  resolveRequiredTaskLocale: vi.fn().mockReturnValue('zh-CN'),
}))

vi.mock('@/lib/image-generation/count', () => ({
  normalizeImageGenerationCount: vi.fn().mockReturnValue(1),
}))

vi.mock('@/lib/assets/description-fields', () => ({
  buildCharacterDescriptionFields: vi.fn(({ nextDescription }: { nextDescription: string }) => ({
    description: nextDescription,
    descriptions: JSON.stringify([nextDescription]),
  })),
}))

vi.mock('@/lib/providers/bailian', () => ({
  collectBailianManagedVoiceIds: vi.fn().mockReturnValue([]),
  cleanupUnreferencedBailianVoices: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/providers/bailian/voice-design', () => ({
  validateVoicePrompt: vi.fn().mockReturnValue({ valid: true }),
  validatePreviewText: vi.fn().mockReturnValue({ valid: true }),
}))

vi.mock('@/lib/task/submitter', () => ({
  submitTask: submitTaskMock,
}))

vi.mock('@/lib/task/types', () => ({
  TASK_TYPE: {
    ASSET_HUB_IMAGE: 'asset_hub_image',
    ASSET_HUB_MODIFY: 'asset_hub_modify',
    ASSET_HUB_VOICE_DESIGN: 'asset_hub_voice_design',
    ASSET_HUB_REFERENCE_TO_CHARACTER: 'asset_hub_reference_to_character',
    ASSET_HUB_AI_DESIGN_CHARACTER: 'asset_hub_ai_design_character',
    ASSET_HUB_AI_DESIGN_LOCATION: 'asset_hub_ai_design_location',
    ASSET_HUB_AI_MODIFY_CHARACTER: 'asset_hub_ai_modify_character',
    ASSET_HUB_AI_MODIFY_LOCATION: 'asset_hub_ai_modify_location',
  },
  TASK_EVENT_TYPE: { PROGRESS: 'progress' },
}))

vi.mock('@/lib/task/has-output', () => ({
  hasGlobalCharacterOutput: vi.fn().mockResolvedValue(false),
  hasGlobalLocationOutput: vi.fn().mockResolvedValue(false),
  hasGlobalCharacterAppearanceOutput: vi.fn().mockResolvedValue(false),
  hasGlobalLocationImageOutput: vi.fn().mockResolvedValue(false),
}))

vi.mock('@/lib/task/ui-payload', () => ({
  withTaskUiPayload: vi.fn((payload: unknown) => payload),
}))

vi.mock('@/lib/billing', () => ({
  buildDefaultTaskBillingInfo: vi.fn().mockReturnValue({ credits: 1 }),
}))

vi.mock('@/lib/config-service', () => ({
  getUserModelConfig: getUserModelConfigMock,
  buildImageBillingPayloadFromUserConfig: vi.fn(({ basePayload }: { basePayload: unknown }) => basePayload),
}))

vi.mock('@/lib/llm-observe/route-task', () => ({
  maybeSubmitLLMTask: maybeSubmitLLMTaskMock,
}))

vi.mock('@/lib/image-generation/location-slots', () => ({
  ensureGlobalLocationImageSlots: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/media/outbound-image', () => ({
  sanitizeImageInputsForTaskPayload: vi.fn().mockReturnValue({ normalized: [], issues: [] }),
}))

vi.mock('@/lib/env', () => ({
  getBaseUrl: vi.fn().mockReturnValue('http://localhost:3000'),
}))

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    metadata: vi.fn().mockResolvedValue({ width: 100, height: 100 }),
    extend: vi.fn().mockReturnThis(),
    composite: vi.fn().mockReturnThis(),
    extract: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('test-image')),
  })),
}))

vi.mock('@/lib/fonts', () => ({
  initializeFonts: vi.fn().mockResolvedValue(undefined),
  createLabelSVG: vi.fn().mockResolvedValue(Buffer.from('<svg></svg>')),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type RouteContext = { params: Promise<Record<string, string | string[]>> }

async function parseJson(res: Response) {
  return (await res.json()) as Record<string, unknown>
}

// ===========================================================================
// Tests
// ===========================================================================

// ===========================================================================
// 1. characters/route.ts (GET, POST)
// ===========================================================================
describe('GET /api/asset-hub/characters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/characters/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters', method: 'GET' })
    const res = await mod.GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns characters list', async () => {
    prismaMock.globalCharacter.findMany.mockResolvedValue([
      { id: 'char-1', name: 'Hero', userId: 'user-1', appearances: [] },
    ])
    const mod = await import('@/app/api/asset-hub/characters/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters', method: 'GET' })
    const res = await mod.GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.characters).toBeDefined()
    expect(Array.isArray(json.characters)).toBe(true)
  })

  it('filters by folderId query param', async () => {
    prismaMock.globalCharacter.findMany.mockResolvedValue([])
    const mod = await import('@/app/api/asset-hub/characters/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters', method: 'GET', query: { folderId: 'folder-1' } })
    const res = await mod.GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    expect(prismaMock.globalCharacter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ folderId: 'folder-1' }) }),
    )
  })
})

describe('POST /api/asset-hub/characters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/characters/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters', method: 'POST', body: { name: 'Hero', artStyle: 'realistic' } })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is missing', async () => {
    const mod = await import('@/app/api/asset-hub/characters/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters', method: 'POST', body: { artStyle: 'realistic' } })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when artStyle is invalid', async () => {
    const mod = await import('@/app/api/asset-hub/characters/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters', method: 'POST', body: { name: 'Hero', artStyle: 'invalid-style' } })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('creates character successfully', async () => {
    prismaMock.globalCharacter.create.mockResolvedValue({ id: 'char-new', name: 'Hero', userId: 'user-1' })
    prismaMock.globalCharacterAppearance.create.mockResolvedValue({ id: 'app-1', characterId: 'char-new', appearanceIndex: 0 })
    prismaMock.globalCharacter.findUnique.mockResolvedValue({ id: 'char-new', name: 'Hero', appearances: [{ id: 'app-1' }] })
    const mod = await import('@/app/api/asset-hub/characters/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/characters',
      method: 'POST',
      body: { name: 'Hero', artStyle: 'realistic' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(json.character).toBeDefined()
  })
})

// ===========================================================================
// 2. characters/[characterId]/route.ts (GET, PATCH, DELETE)
// ===========================================================================
describe('GET /api/asset-hub/characters/:characterId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters/char-1', method: 'GET' })
    const res = await mod.GET(req, { params: Promise.resolve({ characterId: 'char-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when character not found', async () => {
    prismaMock.globalCharacter.findUnique.mockResolvedValue(null)
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters/char-missing', method: 'GET' })
    const res = await mod.GET(req, { params: Promise.resolve({ characterId: 'char-missing' }) })
    expect(res.status).toBe(404)
  })

  it('returns 404 when character belongs to another user', async () => {
    prismaMock.globalCharacter.findUnique.mockResolvedValue({ id: 'char-1', userId: 'other-user', appearances: [] })
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters/char-1', method: 'GET' })
    const res = await mod.GET(req, { params: Promise.resolve({ characterId: 'char-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns character data', async () => {
    prismaMock.globalCharacter.findUnique.mockResolvedValue({ id: 'char-1', userId: 'user-1', name: 'Hero', appearances: [] })
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters/char-1', method: 'GET' })
    const res = await mod.GET(req, { params: Promise.resolve({ characterId: 'char-1' }) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.character).toBeDefined()
  })
})

describe('PATCH /api/asset-hub/characters/:characterId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters/char-1', method: 'PATCH', body: { name: 'Updated' } })
    const res = await mod.PATCH(req, { params: Promise.resolve({ characterId: 'char-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when character belongs to another user', async () => {
    prismaMock.globalCharacter.findUnique.mockResolvedValue({ id: 'char-1', userId: 'other-user' })
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters/char-1', method: 'PATCH', body: { name: 'Updated' } })
    const res = await mod.PATCH(req, { params: Promise.resolve({ characterId: 'char-1' }) })
    expect(res.status).toBe(403)
  })

  it('updates character name', async () => {
    prismaMock.globalCharacter.findUnique.mockResolvedValue({ id: 'char-1', userId: 'user-1' })
    prismaMock.globalCharacter.update.mockResolvedValue({ id: 'char-1', name: 'Updated', appearances: [] })
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters/char-1', method: 'PATCH', body: { name: 'Updated' } })
    const res = await mod.PATCH(req, { params: Promise.resolve({ characterId: 'char-1' }) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
  })
})

describe('DELETE /api/asset-hub/characters/:characterId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters/char-1', method: 'DELETE' })
    const res = await mod.DELETE(req, { params: Promise.resolve({ characterId: 'char-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when character belongs to another user', async () => {
    prismaMock.globalCharacter.findUnique.mockResolvedValue({ id: 'char-1', userId: 'other-user' })
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters/char-1', method: 'DELETE' })
    const res = await mod.DELETE(req, { params: Promise.resolve({ characterId: 'char-1' }) })
    expect(res.status).toBe(403)
  })

  it('deletes character successfully', async () => {
    prismaMock.globalCharacter.findUnique.mockResolvedValue({ id: 'char-1', userId: 'user-1', voiceId: null, voiceType: null })
    prismaMock.globalCharacter.delete.mockResolvedValue({ id: 'char-1' })
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters/char-1', method: 'DELETE' })
    const res = await mod.DELETE(req, { params: Promise.resolve({ characterId: 'char-1' }) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
  })
})

// ===========================================================================
// 3. characters/[characterId]/appearances/[appearanceIndex]/route.ts
// ===========================================================================
describe('PATCH /api/asset-hub/characters/:characterId/appearances/:appearanceIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/appearances/[appearanceIndex]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters/char-1/appearances/0', method: 'PATCH', body: { description: 'Updated desc' } })
    const res = await mod.PATCH(req, { params: Promise.resolve({ characterId: 'char-1', appearanceIndex: '0' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when character belongs to another user', async () => {
    prismaMock.globalCharacter.findUnique.mockResolvedValue({ id: 'char-1', userId: 'other-user' })
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/appearances/[appearanceIndex]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters/char-1/appearances/0', method: 'PATCH', body: { description: 'Updated' } })
    const res = await mod.PATCH(req, { params: Promise.resolve({ characterId: 'char-1', appearanceIndex: '0' }) })
    expect(res.status).toBe(403)
  })

  it('returns 404 when appearance not found', async () => {
    prismaMock.globalCharacter.findUnique.mockResolvedValue({ id: 'char-1', userId: 'user-1' })
    prismaMock.globalCharacterAppearance.findFirst.mockResolvedValue(null)
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/appearances/[appearanceIndex]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters/char-1/appearances/5', method: 'PATCH', body: { description: 'Updated' } })
    const res = await mod.PATCH(req, { params: Promise.resolve({ characterId: 'char-1', appearanceIndex: '5' }) })
    expect(res.status).toBe(404)
  })

  it('updates appearance description', async () => {
    prismaMock.globalCharacter.findUnique.mockResolvedValue({ id: 'char-1', userId: 'user-1' })
    prismaMock.globalCharacterAppearance.findFirst.mockResolvedValue({ id: 'app-1', description: 'old', descriptions: null })
    prismaMock.globalCharacterAppearance.update.mockResolvedValue({})
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/appearances/[appearanceIndex]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters/char-1/appearances/0', method: 'PATCH', body: { description: 'New description' } })
    const res = await mod.PATCH(req, { params: Promise.resolve({ characterId: 'char-1', appearanceIndex: '0' }) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
  })
})

describe('POST /api/asset-hub/characters/:characterId/appearances/:appearanceIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/appearances/[appearanceIndex]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters/char-1/appearances/0', method: 'POST', body: { description: 'New look' } })
    const res = await mod.POST(req, { params: Promise.resolve({ characterId: 'char-1', appearanceIndex: '0' }) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when description is missing', async () => {
    prismaMock.globalCharacter.findUnique.mockResolvedValue({
      id: 'char-1', userId: 'user-1',
      appearances: [{ appearanceIndex: 0, artStyle: 'realistic' }],
    })
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/appearances/[appearanceIndex]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters/char-1/appearances/0', method: 'POST', body: {} })
    const res = await mod.POST(req, { params: Promise.resolve({ characterId: 'char-1', appearanceIndex: '0' }) })
    expect(res.status).toBe(400)
  })

  it('creates new appearance', async () => {
    prismaMock.globalCharacter.findUnique.mockResolvedValue({
      id: 'char-1', userId: 'user-1',
      appearances: [{ appearanceIndex: 0, artStyle: 'realistic' }],
    })
    prismaMock.globalCharacterAppearance.create.mockResolvedValue({ id: 'app-2', appearanceIndex: 1 })
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/appearances/[appearanceIndex]/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/characters/char-1/appearances/0',
      method: 'POST',
      body: { description: 'Battle armor version', changeReason: 'Battle' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({ characterId: 'char-1', appearanceIndex: '0' }) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(json.appearance).toBeDefined()
  })
})

describe('DELETE /api/asset-hub/characters/:characterId/appearances/:appearanceIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/appearances/[appearanceIndex]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters/char-1/appearances/1', method: 'DELETE' })
    const res = await mod.DELETE(req, { params: Promise.resolve({ characterId: 'char-1', appearanceIndex: '1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when character has only one appearance', async () => {
    prismaMock.globalCharacter.findUnique.mockResolvedValue({
      id: 'char-1', userId: 'user-1',
      appearances: [{ id: 'app-1', appearanceIndex: 0 }],
    })
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/appearances/[appearanceIndex]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters/char-1/appearances/0', method: 'DELETE' })
    const res = await mod.DELETE(req, { params: Promise.resolve({ characterId: 'char-1', appearanceIndex: '0' }) })
    expect(res.status).toBe(400)
  })

  it('deletes appearance successfully', async () => {
    prismaMock.globalCharacter.findUnique.mockResolvedValue({
      id: 'char-1', userId: 'user-1',
      appearances: [{ id: 'app-1', appearanceIndex: 0 }, { id: 'app-2', appearanceIndex: 1 }],
    })
    prismaMock.globalCharacterAppearance.findFirst.mockResolvedValue({ id: 'app-2', appearanceIndex: 1 })
    prismaMock.globalCharacterAppearance.delete.mockResolvedValue({})
    const mod = await import('@/app/api/asset-hub/characters/[characterId]/appearances/[appearanceIndex]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/characters/char-1/appearances/1', method: 'DELETE' })
    const res = await mod.DELETE(req, { params: Promise.resolve({ characterId: 'char-1', appearanceIndex: '1' }) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
  })
})

// ===========================================================================
// 4. appearances/route.ts (POST, PATCH, DELETE)
// ===========================================================================
describe('POST /api/asset-hub/appearances', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/appearances/route')
    const req = buildMockRequest({ path: '/api/asset-hub/appearances', method: 'POST', body: { characterId: 'c1', changeReason: 'test' } })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when characterId is missing', async () => {
    const mod = await import('@/app/api/asset-hub/appearances/route')
    const req = buildMockRequest({ path: '/api/asset-hub/appearances', method: 'POST', body: { changeReason: 'test' } })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('returns 404 when character not found', async () => {
    prismaMock.globalCharacter.findFirst.mockResolvedValue(null)
    const mod = await import('@/app/api/asset-hub/appearances/route')
    const req = buildMockRequest({ path: '/api/asset-hub/appearances', method: 'POST', body: { characterId: 'c-missing', changeReason: 'test' } })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(404)
  })

  it('creates appearance successfully', async () => {
    prismaMock.globalCharacter.findFirst.mockResolvedValue({
      id: 'char-1', userId: 'user-1',
      appearances: [{ appearanceIndex: 0, artStyle: 'realistic' }],
    })
    prismaMock.globalCharacterAppearance.create.mockResolvedValue({ id: 'app-2', appearanceIndex: 1 })
    const mod = await import('@/app/api/asset-hub/appearances/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/appearances',
      method: 'POST',
      body: { characterId: 'char-1', changeReason: 'Battle mode', description: 'In armor' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
  })
})

describe('PATCH /api/asset-hub/appearances', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/appearances/route')
    const req = buildMockRequest({ path: '/api/asset-hub/appearances', method: 'PATCH', body: { characterId: 'c1', appearanceIndex: 0 } })
    const res = await mod.PATCH(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when characterId is missing', async () => {
    const mod = await import('@/app/api/asset-hub/appearances/route')
    const req = buildMockRequest({ path: '/api/asset-hub/appearances', method: 'PATCH', body: { appearanceIndex: 0 } })
    const res = await mod.PATCH(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('updates appearance description', async () => {
    prismaMock.globalCharacter.findFirst.mockResolvedValue({ id: 'char-1', userId: 'user-1' })
    prismaMock.globalCharacterAppearance.findFirst.mockResolvedValue({ id: 'app-1', description: 'old', descriptions: null })
    prismaMock.globalCharacterAppearance.update.mockResolvedValue({})
    const mod = await import('@/app/api/asset-hub/appearances/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/appearances',
      method: 'PATCH',
      body: { characterId: 'char-1', appearanceIndex: 0, description: 'Updated' },
    })
    const res = await mod.PATCH(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
  })
})

describe('DELETE /api/asset-hub/appearances', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/appearances/route')
    const req = buildMockRequest({ path: '/api/asset-hub/appearances', method: 'DELETE', query: { characterId: 'c1', appearanceIndex: '1' } })
    const res = await mod.DELETE(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when query params are missing', async () => {
    const mod = await import('@/app/api/asset-hub/appearances/route')
    const req = buildMockRequest({ path: '/api/asset-hub/appearances', method: 'DELETE' })
    const res = await mod.DELETE(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when trying to delete primary appearance (index 0)', async () => {
    prismaMock.globalCharacter.findFirst.mockResolvedValue({ id: 'char-1', userId: 'user-1' })
    const mod = await import('@/app/api/asset-hub/appearances/route')
    const req = buildMockRequest({ path: '/api/asset-hub/appearances', method: 'DELETE', query: { characterId: 'char-1', appearanceIndex: '0' } })
    const res = await mod.DELETE(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('deletes appearance successfully', async () => {
    prismaMock.globalCharacter.findFirst.mockResolvedValue({ id: 'char-1', userId: 'user-1' })
    prismaMock.globalCharacterAppearance.deleteMany.mockResolvedValue({ count: 1 })
    const mod = await import('@/app/api/asset-hub/appearances/route')
    const req = buildMockRequest({ path: '/api/asset-hub/appearances', method: 'DELETE', query: { characterId: 'char-1', appearanceIndex: '1' } })
    const res = await mod.DELETE(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
  })
})

// ===========================================================================
// 5. locations/route.ts (GET, POST)
// ===========================================================================
describe('GET /api/asset-hub/locations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/locations/route')
    const req = buildMockRequest({ path: '/api/asset-hub/locations', method: 'GET' })
    const res = await mod.GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns locations list', async () => {
    prismaMock.globalLocation.findMany.mockResolvedValue([
      { id: 'loc-1', name: 'Castle', userId: 'user-1', images: [] },
    ])
    const mod = await import('@/app/api/asset-hub/locations/route')
    const req = buildMockRequest({ path: '/api/asset-hub/locations', method: 'GET' })
    const res = await mod.GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.locations).toBeDefined()
    expect(Array.isArray(json.locations)).toBe(true)
  })
})

describe('POST /api/asset-hub/locations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/locations/route')
    const req = buildMockRequest({ path: '/api/asset-hub/locations', method: 'POST', body: { name: 'Castle', artStyle: 'realistic' } })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is missing', async () => {
    const mod = await import('@/app/api/asset-hub/locations/route')
    const req = buildMockRequest({ path: '/api/asset-hub/locations', method: 'POST', body: { artStyle: 'realistic' } })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when artStyle is invalid', async () => {
    const mod = await import('@/app/api/asset-hub/locations/route')
    const req = buildMockRequest({ path: '/api/asset-hub/locations', method: 'POST', body: { name: 'Castle', artStyle: 'bad' } })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('creates location successfully', async () => {
    prismaMock.globalLocation.create.mockResolvedValue({ id: 'loc-new', name: 'Castle', userId: 'user-1' })
    prismaMock.globalLocationImage.createMany.mockResolvedValue({ count: 1 })
    prismaMock.globalLocation.findUnique.mockResolvedValue({ id: 'loc-new', name: 'Castle', images: [] })
    const mod = await import('@/app/api/asset-hub/locations/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/locations',
      method: 'POST',
      body: { name: 'Castle', artStyle: 'realistic', summary: 'A dark castle' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(json.location).toBeDefined()
  })
})

// ===========================================================================
// 6. locations/[locationId]/route.ts (GET, PATCH, DELETE)
// ===========================================================================
describe('GET /api/asset-hub/locations/:locationId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/locations/[locationId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/locations/loc-1', method: 'GET' })
    const res = await mod.GET(req, { params: Promise.resolve({ locationId: 'loc-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when location not found', async () => {
    prismaMock.globalLocation.findUnique.mockResolvedValue(null)
    const mod = await import('@/app/api/asset-hub/locations/[locationId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/locations/loc-missing', method: 'GET' })
    const res = await mod.GET(req, { params: Promise.resolve({ locationId: 'loc-missing' }) })
    expect(res.status).toBe(404)
  })

  it('returns location data', async () => {
    prismaMock.globalLocation.findUnique.mockResolvedValue({ id: 'loc-1', userId: 'user-1', name: 'Castle', images: [] })
    const mod = await import('@/app/api/asset-hub/locations/[locationId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/locations/loc-1', method: 'GET' })
    const res = await mod.GET(req, { params: Promise.resolve({ locationId: 'loc-1' }) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.location).toBeDefined()
  })
})

describe('PATCH /api/asset-hub/locations/:locationId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/locations/[locationId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/locations/loc-1', method: 'PATCH', body: { name: 'Updated' } })
    const res = await mod.PATCH(req, { params: Promise.resolve({ locationId: 'loc-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when location belongs to another user', async () => {
    prismaMock.globalLocation.findUnique.mockResolvedValue({ id: 'loc-1', userId: 'other-user' })
    const mod = await import('@/app/api/asset-hub/locations/[locationId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/locations/loc-1', method: 'PATCH', body: { name: 'Updated' } })
    const res = await mod.PATCH(req, { params: Promise.resolve({ locationId: 'loc-1' }) })
    expect(res.status).toBe(403)
  })

  it('updates location successfully', async () => {
    prismaMock.globalLocation.findUnique.mockResolvedValue({ id: 'loc-1', userId: 'user-1' })
    prismaMock.globalLocation.update.mockResolvedValue({ id: 'loc-1', name: 'Updated', images: [] })
    const mod = await import('@/app/api/asset-hub/locations/[locationId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/locations/loc-1', method: 'PATCH', body: { name: 'Updated' } })
    const res = await mod.PATCH(req, { params: Promise.resolve({ locationId: 'loc-1' }) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
  })
})

describe('DELETE /api/asset-hub/locations/:locationId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/locations/[locationId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/locations/loc-1', method: 'DELETE' })
    const res = await mod.DELETE(req, { params: Promise.resolve({ locationId: 'loc-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when location belongs to another user', async () => {
    prismaMock.globalLocation.findUnique.mockResolvedValue({ id: 'loc-1', userId: 'other-user' })
    const mod = await import('@/app/api/asset-hub/locations/[locationId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/locations/loc-1', method: 'DELETE' })
    const res = await mod.DELETE(req, { params: Promise.resolve({ locationId: 'loc-1' }) })
    expect(res.status).toBe(403)
  })

  it('deletes location successfully', async () => {
    prismaMock.globalLocation.findUnique.mockResolvedValue({ id: 'loc-1', userId: 'user-1' })
    prismaMock.globalLocation.delete.mockResolvedValue({ id: 'loc-1' })
    const mod = await import('@/app/api/asset-hub/locations/[locationId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/locations/loc-1', method: 'DELETE' })
    const res = await mod.DELETE(req, { params: Promise.resolve({ locationId: 'loc-1' }) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
  })
})

// ===========================================================================
// 7. folders/route.ts (GET, POST)
// ===========================================================================
describe('GET /api/asset-hub/folders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/folders/route')
    const req = buildMockRequest({ path: '/api/asset-hub/folders', method: 'GET' })
    const res = await mod.GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns folders list', async () => {
    prismaMock.globalAssetFolder.findMany.mockResolvedValue([{ id: 'f-1', name: 'Folder A', userId: 'user-1' }])
    const mod = await import('@/app/api/asset-hub/folders/route')
    const req = buildMockRequest({ path: '/api/asset-hub/folders', method: 'GET' })
    const res = await mod.GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.folders).toBeDefined()
    expect(Array.isArray(json.folders)).toBe(true)
  })
})

describe('POST /api/asset-hub/folders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/folders/route')
    const req = buildMockRequest({ path: '/api/asset-hub/folders', method: 'POST', body: { name: 'New folder' } })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is empty', async () => {
    const mod = await import('@/app/api/asset-hub/folders/route')
    const req = buildMockRequest({ path: '/api/asset-hub/folders', method: 'POST', body: { name: '  ' } })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('creates folder successfully', async () => {
    prismaMock.globalAssetFolder.create.mockResolvedValue({ id: 'f-new', name: 'New Folder', userId: 'user-1' })
    const mod = await import('@/app/api/asset-hub/folders/route')
    const req = buildMockRequest({ path: '/api/asset-hub/folders', method: 'POST', body: { name: 'New Folder' } })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(json.folder).toBeDefined()
  })
})

// ===========================================================================
// 8. folders/[folderId]/route.ts (PATCH, DELETE)
// ===========================================================================
describe('PATCH /api/asset-hub/folders/:folderId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/folders/[folderId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/folders/f-1', method: 'PATCH', body: { name: 'Renamed' } })
    const res = await mod.PATCH(req, { params: Promise.resolve({ folderId: 'f-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is empty', async () => {
    const mod = await import('@/app/api/asset-hub/folders/[folderId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/folders/f-1', method: 'PATCH', body: { name: '' } })
    const res = await mod.PATCH(req, { params: Promise.resolve({ folderId: 'f-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 403 when folder belongs to another user', async () => {
    prismaMock.globalAssetFolder.findUnique.mockResolvedValue({ id: 'f-1', userId: 'other-user' })
    const mod = await import('@/app/api/asset-hub/folders/[folderId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/folders/f-1', method: 'PATCH', body: { name: 'Renamed' } })
    const res = await mod.PATCH(req, { params: Promise.resolve({ folderId: 'f-1' }) })
    expect(res.status).toBe(403)
  })

  it('renames folder successfully', async () => {
    prismaMock.globalAssetFolder.findUnique.mockResolvedValue({ id: 'f-1', userId: 'user-1', name: 'Old' })
    prismaMock.globalAssetFolder.update.mockResolvedValue({ id: 'f-1', name: 'Renamed' })
    const mod = await import('@/app/api/asset-hub/folders/[folderId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/folders/f-1', method: 'PATCH', body: { name: 'Renamed' } })
    const res = await mod.PATCH(req, { params: Promise.resolve({ folderId: 'f-1' }) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
  })
})

describe('DELETE /api/asset-hub/folders/:folderId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/folders/[folderId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/folders/f-1', method: 'DELETE' })
    const res = await mod.DELETE(req, { params: Promise.resolve({ folderId: 'f-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when folder belongs to another user', async () => {
    prismaMock.globalAssetFolder.findUnique.mockResolvedValue({ id: 'f-1', userId: 'other-user' })
    const mod = await import('@/app/api/asset-hub/folders/[folderId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/folders/f-1', method: 'DELETE' })
    const res = await mod.DELETE(req, { params: Promise.resolve({ folderId: 'f-1' }) })
    expect(res.status).toBe(403)
  })

  it('deletes folder and moves assets to root', async () => {
    prismaMock.globalAssetFolder.findUnique.mockResolvedValue({ id: 'f-1', userId: 'user-1' })
    prismaMock.globalCharacter.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.globalLocation.updateMany.mockResolvedValue({ count: 0 })
    prismaMock.globalAssetFolder.delete.mockResolvedValue({ id: 'f-1' })
    const mod = await import('@/app/api/asset-hub/folders/[folderId]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/folders/f-1', method: 'DELETE' })
    const res = await mod.DELETE(req, { params: Promise.resolve({ folderId: 'f-1' }) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(prismaMock.globalCharacter.updateMany).toHaveBeenCalled()
    expect(prismaMock.globalLocation.updateMany).toHaveBeenCalled()
  })
})

// ===========================================================================
// 9. picker/route.ts (GET)
// ===========================================================================
describe('GET /api/asset-hub/picker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/picker/route')
    const req = buildMockRequest({ path: '/api/asset-hub/picker', method: 'GET', query: { type: 'character' } })
    const res = await mod.GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns characters when type=character', async () => {
    prismaMock.globalCharacter.findMany.mockResolvedValue([
      {
        id: 'char-1', name: 'Hero', voiceId: null, customVoiceUrl: null,
        folder: null,
        appearances: [{ appearanceIndex: 0, imageUrls: null, imageUrl: null, selectedIndex: null }],
      },
    ])
    const mod = await import('@/app/api/asset-hub/picker/route')
    const req = buildMockRequest({ path: '/api/asset-hub/picker', method: 'GET', query: { type: 'character' } })
    const res = await mod.GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.characters).toBeDefined()
  })

  it('returns locations when type=location', async () => {
    prismaMock.globalLocation.findMany.mockResolvedValue([
      { id: 'loc-1', name: 'Castle', summary: 'Dark castle', folder: null, images: [] },
    ])
    const mod = await import('@/app/api/asset-hub/picker/route')
    const req = buildMockRequest({ path: '/api/asset-hub/picker', method: 'GET', query: { type: 'location' } })
    const res = await mod.GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.locations).toBeDefined()
  })

  it('returns voices when type=voice', async () => {
    prismaMock.globalVoice.findMany.mockResolvedValue([
      { id: 'v-1', name: 'Voice 1', description: null, folder: null, customVoiceUrl: null, voiceId: null, voiceType: null, gender: null, language: 'zh' },
    ])
    const mod = await import('@/app/api/asset-hub/picker/route')
    const req = buildMockRequest({ path: '/api/asset-hub/picker', method: 'GET', query: { type: 'voice' } })
    const res = await mod.GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.voices).toBeDefined()
  })

  it('returns 400 when type is invalid', async () => {
    const mod = await import('@/app/api/asset-hub/picker/route')
    const req = buildMockRequest({ path: '/api/asset-hub/picker', method: 'GET', query: { type: 'invalid' } })
    const res = await mod.GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })
})

// ===========================================================================
// 10. voices/route.ts (GET, POST)
// ===========================================================================
describe('GET /api/asset-hub/voices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/voices/route')
    const req = buildMockRequest({ path: '/api/asset-hub/voices', method: 'GET' })
    const res = await mod.GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns voices list', async () => {
    prismaMock.globalVoice.findMany.mockResolvedValue([
      { id: 'v-1', name: 'Voice A', userId: 'user-1' },
    ])
    const mod = await import('@/app/api/asset-hub/voices/route')
    const req = buildMockRequest({ path: '/api/asset-hub/voices', method: 'GET' })
    const res = await mod.GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.voices).toBeDefined()
  })
})

describe('POST /api/asset-hub/voices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/voices/route')
    const req = buildMockRequest({ path: '/api/asset-hub/voices', method: 'POST', body: { name: 'New Voice' } })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is missing', async () => {
    const mod = await import('@/app/api/asset-hub/voices/route')
    const req = buildMockRequest({ path: '/api/asset-hub/voices', method: 'POST', body: {} })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('creates voice successfully', async () => {
    prismaMock.globalVoice.create.mockResolvedValue({ id: 'v-new', name: 'New Voice', userId: 'user-1' })
    const mod = await import('@/app/api/asset-hub/voices/route')
    const req = buildMockRequest({ path: '/api/asset-hub/voices', method: 'POST', body: { name: 'New Voice' } })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(json.voice).toBeDefined()
  })
})

// ===========================================================================
// 11. voices/[id]/route.ts (PATCH, DELETE)
// ===========================================================================
describe('PATCH /api/asset-hub/voices/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/voices/[id]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/voices/v-1', method: 'PATCH', body: { name: 'Renamed' } })
    const res = await mod.PATCH(req, { params: Promise.resolve({ id: 'v-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when voice not found', async () => {
    prismaMock.globalVoice.findUnique.mockResolvedValue(null)
    const mod = await import('@/app/api/asset-hub/voices/[id]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/voices/v-missing', method: 'PATCH', body: { name: 'Renamed' } })
    const res = await mod.PATCH(req, { params: Promise.resolve({ id: 'v-missing' }) })
    expect(res.status).toBe(404)
  })

  it('returns 403 when voice belongs to another user', async () => {
    prismaMock.globalVoice.findUnique.mockResolvedValue({ id: 'v-1', userId: 'other-user', name: 'V', description: null, folderId: null })
    const mod = await import('@/app/api/asset-hub/voices/[id]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/voices/v-1', method: 'PATCH', body: { name: 'Renamed' } })
    const res = await mod.PATCH(req, { params: Promise.resolve({ id: 'v-1' }) })
    expect(res.status).toBe(403)
  })

  it('updates voice successfully', async () => {
    prismaMock.globalVoice.findUnique.mockResolvedValue({ id: 'v-1', userId: 'user-1', name: 'V', description: null, folderId: null })
    prismaMock.globalVoice.update.mockResolvedValue({ id: 'v-1', name: 'Renamed' })
    const mod = await import('@/app/api/asset-hub/voices/[id]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/voices/v-1', method: 'PATCH', body: { name: 'Renamed' } })
    const res = await mod.PATCH(req, { params: Promise.resolve({ id: 'v-1' }) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
  })
})

describe('DELETE /api/asset-hub/voices/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/voices/[id]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/voices/v-1', method: 'DELETE' })
    const res = await mod.DELETE(req, { params: Promise.resolve({ id: 'v-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when voice not found', async () => {
    prismaMock.globalVoice.findUnique.mockResolvedValue(null)
    const mod = await import('@/app/api/asset-hub/voices/[id]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/voices/v-missing', method: 'DELETE' })
    const res = await mod.DELETE(req, { params: Promise.resolve({ id: 'v-missing' }) })
    expect(res.status).toBe(404)
  })

  it('returns 403 when voice belongs to another user', async () => {
    prismaMock.globalVoice.findUnique.mockResolvedValue({ id: 'v-1', userId: 'other-user' })
    const mod = await import('@/app/api/asset-hub/voices/[id]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/voices/v-1', method: 'DELETE' })
    const res = await mod.DELETE(req, { params: Promise.resolve({ id: 'v-1' }) })
    expect(res.status).toBe(403)
  })

  it('deletes voice successfully', async () => {
    prismaMock.globalVoice.findUnique.mockResolvedValue({ id: 'v-1', userId: 'user-1' })
    prismaMock.globalVoice.delete.mockResolvedValue({ id: 'v-1' })
    const mod = await import('@/app/api/asset-hub/voices/[id]/route')
    const req = buildMockRequest({ path: '/api/asset-hub/voices/v-1', method: 'DELETE' })
    const res = await mod.DELETE(req, { params: Promise.resolve({ id: 'v-1' }) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
  })
})

// ===========================================================================
// 12. voices/upload/route.ts (POST)
// ===========================================================================
describe('POST /api/asset-hub/voices/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const formData = new FormData()
    formData.append('file', new File(['audio'], 'voice.mp3', { type: 'audio/mpeg' }))
    formData.append('name', 'Test Voice')
    const mod = await import('@/app/api/asset-hub/voices/upload/route')
    const req = new (await import('next/server')).NextRequest(new URL('/api/asset-hub/voices/upload', 'http://localhost:3000'), {
      method: 'POST',
      body: formData,
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when file is missing', async () => {
    const formData = new FormData()
    formData.append('name', 'Test Voice')
    const mod = await import('@/app/api/asset-hub/voices/upload/route')
    const req = new (await import('next/server')).NextRequest(new URL('/api/asset-hub/voices/upload', 'http://localhost:3000'), {
      method: 'POST',
      body: formData,
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when name is missing', async () => {
    const formData = new FormData()
    formData.append('file', new File(['audio'], 'voice.mp3', { type: 'audio/mpeg' }))
    const mod = await import('@/app/api/asset-hub/voices/upload/route')
    const req = new (await import('next/server')).NextRequest(new URL('/api/asset-hub/voices/upload', 'http://localhost:3000'), {
      method: 'POST',
      body: formData,
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('uploads voice file successfully', async () => {
    prismaMock.globalVoice.create.mockResolvedValue({
      id: 'v-new', name: 'Test Voice', userId: 'user-1', customVoiceUrl: 'https://cos.example.com/uploaded-key',
    })
    const formData = new FormData()
    formData.append('file', new File(['audio-data'], 'voice.mp3', { type: 'audio/mpeg' }))
    formData.append('name', 'Test Voice')
    const mod = await import('@/app/api/asset-hub/voices/upload/route')
    const req = new (await import('next/server')).NextRequest(new URL('/api/asset-hub/voices/upload', 'http://localhost:3000'), {
      method: 'POST',
      body: formData,
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(json.voice).toBeDefined()
  })
})

// ===========================================================================
// 13. character-voice/route.ts (POST, PATCH)
// ===========================================================================
describe('POST /api/asset-hub/character-voice (JSON)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/character-voice/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/character-voice',
      method: 'POST',
      body: { characterId: 'c1', voiceDesign: { voiceId: 'v1', audioBase64: 'abc' } },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when characterId or voiceDesign is missing', async () => {
    const mod = await import('@/app/api/asset-hub/character-voice/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/character-voice',
      method: 'POST',
      body: { characterId: 'c1' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('returns 404 when character not found', async () => {
    prismaMock.globalCharacter.findFirst.mockResolvedValue(null)
    const mod = await import('@/app/api/asset-hub/character-voice/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/character-voice',
      method: 'POST',
      body: { characterId: 'c-missing', voiceDesign: { voiceId: 'v1', audioBase64: 'YXVkaW8=' } },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(404)
  })

  it('uploads voice design successfully', async () => {
    prismaMock.globalCharacter.findFirst.mockResolvedValue({ id: 'char-1' })
    prismaMock.globalCharacter.update.mockResolvedValue({})
    const mod = await import('@/app/api/asset-hub/character-voice/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/character-voice',
      method: 'POST',
      body: { characterId: 'char-1', voiceDesign: { voiceId: 'v1', audioBase64: 'YXVkaW8=' } },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(json.audioUrl).toBeDefined()
  })
})

describe('PATCH /api/asset-hub/character-voice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/character-voice/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/character-voice',
      method: 'PATCH',
      body: { characterId: 'c1' },
    })
    const res = await mod.PATCH(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when characterId is missing', async () => {
    const mod = await import('@/app/api/asset-hub/character-voice/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/character-voice',
      method: 'PATCH',
      body: {},
    })
    const res = await mod.PATCH(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('updates voice settings successfully', async () => {
    prismaMock.globalCharacter.findFirst.mockResolvedValue({ id: 'char-1' })
    prismaMock.globalCharacter.update.mockResolvedValue({})
    const mod = await import('@/app/api/asset-hub/character-voice/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/character-voice',
      method: 'PATCH',
      body: { characterId: 'char-1', voiceType: 'uploaded', voiceId: 'v-1' },
    })
    const res = await mod.PATCH(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
  })
})

// ===========================================================================
// 14. generate-image/route.ts (POST)
// ===========================================================================
describe('POST /api/asset-hub/generate-image', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/generate-image/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/generate-image',
      method: 'POST',
      body: { type: 'character', id: 'char-1' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when type or id is missing', async () => {
    const mod = await import('@/app/api/asset-hub/generate-image/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/generate-image',
      method: 'POST',
      body: { type: 'character' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when type is invalid', async () => {
    const mod = await import('@/app/api/asset-hub/generate-image/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/generate-image',
      method: 'POST',
      body: { type: 'invalid', id: 'x' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('submits character image generation task', async () => {
    prismaMock.globalCharacterAppearance.findFirst.mockResolvedValue({ artStyle: 'realistic' })
    submitTaskMock.mockResolvedValue({ taskId: 'task-1', status: 'queued' })
    const mod = await import('@/app/api/asset-hub/generate-image/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/generate-image',
      method: 'POST',
      body: { type: 'character', id: 'char-1', artStyle: 'realistic' },
      headers: { 'accept-language': 'zh-CN' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.taskId).toBeDefined()
  })

  it('submits location image generation task', async () => {
    prismaMock.globalLocation.findFirst.mockResolvedValue({ artStyle: 'realistic', name: 'Castle', summary: 'A castle' })
    submitTaskMock.mockResolvedValue({ taskId: 'task-2', status: 'queued' })
    const mod = await import('@/app/api/asset-hub/generate-image/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/generate-image',
      method: 'POST',
      body: { type: 'location', id: 'loc-1', artStyle: 'realistic' },
      headers: { 'accept-language': 'zh-CN' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
  })
})

// ===========================================================================
// 15. modify-image/route.ts (POST)
// ===========================================================================
describe('POST /api/asset-hub/modify-image', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/modify-image/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/modify-image',
      method: 'POST',
      body: { type: 'character', id: 'c1', modifyPrompt: 'Add hat' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields are missing', async () => {
    const mod = await import('@/app/api/asset-hub/modify-image/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/modify-image',
      method: 'POST',
      body: { type: 'character', id: 'c1' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when type is invalid', async () => {
    const mod = await import('@/app/api/asset-hub/modify-image/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/modify-image',
      method: 'POST',
      body: { type: 'bad', id: 'c1', modifyPrompt: 'change' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('submits modify image task', async () => {
    submitTaskMock.mockResolvedValue({ taskId: 'task-3', status: 'queued' })
    const mod = await import('@/app/api/asset-hub/modify-image/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/modify-image',
      method: 'POST',
      body: { type: 'character', id: 'c1', modifyPrompt: 'Add a hat', imageIndex: 0 },
      headers: { 'accept-language': 'zh-CN' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.taskId).toBeDefined()
  })
})

// ===========================================================================
// 16. select-image/route.ts (POST)
// ===========================================================================
describe('POST /api/asset-hub/select-image', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/select-image/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/select-image',
      method: 'POST',
      body: { type: 'character', id: 'c1', imageIndex: 0 },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when type is invalid', async () => {
    const mod = await import('@/app/api/asset-hub/select-image/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/select-image',
      method: 'POST',
      body: { type: 'bad', id: 'c1' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('selects character image', async () => {
    prismaMock.globalCharacterAppearance.findFirst.mockResolvedValue({
      id: 'app-1', imageUrl: 'img.jpg', imageUrls: '["img.jpg"]', selectedIndex: null,
    })
    prismaMock.globalCharacterAppearance.update.mockResolvedValue({})
    const mod = await import('@/app/api/asset-hub/select-image/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/select-image',
      method: 'POST',
      body: { type: 'character', id: 'char-1', imageIndex: 0 },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
  })

  it('selects location image', async () => {
    prismaMock.globalLocation.findFirst.mockResolvedValue({
      id: 'loc-1', userId: 'user-1',
      images: [{ id: 'img-1', imageIndex: 0, isSelected: false }, { id: 'img-2', imageIndex: 1, isSelected: false }],
    })
    prismaMock.globalLocationImage.updateMany.mockResolvedValue({ count: 2 })
    prismaMock.globalLocationImage.update.mockResolvedValue({})
    const mod = await import('@/app/api/asset-hub/select-image/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/select-image',
      method: 'POST',
      body: { type: 'location', id: 'loc-1', imageIndex: 1 },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
  })
})

// ===========================================================================
// 17. undo-image/route.ts (POST)
// ===========================================================================
describe('POST /api/asset-hub/undo-image', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/undo-image/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/undo-image',
      method: 'POST',
      body: { type: 'character', id: 'c1' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when type is invalid', async () => {
    const mod = await import('@/app/api/asset-hub/undo-image/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/undo-image',
      method: 'POST',
      body: { type: 'bad', id: 'c1' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('returns 404 when character appearance not found', async () => {
    prismaMock.globalCharacterAppearance.findFirst.mockResolvedValue(null)
    const mod = await import('@/app/api/asset-hub/undo-image/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/undo-image',
      method: 'POST',
      body: { type: 'character', id: 'c-missing' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(404)
  })

  it('returns 400 when no previous image to undo', async () => {
    prismaMock.globalCharacterAppearance.findFirst.mockResolvedValue({
      id: 'app-1', previousImageUrl: null, previousImageUrls: null,
    })
    const mod = await import('@/app/api/asset-hub/undo-image/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/undo-image',
      method: 'POST',
      body: { type: 'character', id: 'char-1' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('undoes character image successfully', async () => {
    prismaMock.globalCharacterAppearance.findFirst.mockResolvedValue({
      id: 'app-1',
      previousImageUrl: 'prev.jpg',
      previousImageUrls: '["prev.jpg"]',
      imageUrl: 'current.jpg',
      description: 'current desc',
      descriptions: '["current desc"]',
      previousDescription: 'prev desc',
      previousDescriptions: '["prev desc"]',
    })
    prismaMock.globalCharacterAppearance.update.mockResolvedValue({})
    const { decodeImageUrlsFromDb } = await import('@/lib/contracts/image-urls-contract')
    vi.mocked(decodeImageUrlsFromDb).mockReturnValue(['prev.jpg'])
    const mod = await import('@/app/api/asset-hub/undo-image/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/undo-image',
      method: 'POST',
      body: { type: 'character', id: 'char-1' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
  })

  it('undoes location images successfully', async () => {
    prismaMock.globalLocation.findFirst.mockResolvedValue({
      id: 'loc-1', userId: 'user-1',
      images: [{ id: 'img-1', previousImageUrl: 'prev.jpg', imageUrl: 'current.jpg', description: 'd', previousDescription: 'pd' }],
    })
    prismaMock.globalLocationImage.update.mockResolvedValue({})
    const mod = await import('@/app/api/asset-hub/undo-image/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/undo-image',
      method: 'POST',
      body: { type: 'location', id: 'loc-1' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
  })
})

// ===========================================================================
// 18. upload-image/route.ts (POST)
// ===========================================================================
describe('POST /api/asset-hub/upload-image', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const formData = new FormData()
    formData.append('file', new File(['img'], 'test.jpg', { type: 'image/jpeg' }))
    formData.append('type', 'character')
    formData.append('id', 'c1')
    formData.append('labelText', 'Hero')
    const mod = await import('@/app/api/asset-hub/upload-image/route')
    const req = new (await import('next/server')).NextRequest(new URL('/api/asset-hub/upload-image', 'http://localhost:3000'), {
      method: 'POST',
      body: formData,
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields are missing', async () => {
    const formData = new FormData()
    formData.append('file', new File(['img'], 'test.jpg', { type: 'image/jpeg' }))
    const mod = await import('@/app/api/asset-hub/upload-image/route')
    const req = new (await import('next/server')).NextRequest(new URL('/api/asset-hub/upload-image', 'http://localhost:3000'), {
      method: 'POST',
      body: formData,
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('uploads character image successfully', async () => {
    prismaMock.globalCharacterAppearance.findFirst.mockResolvedValue({
      id: 'app-1', imageUrl: null, imageUrls: null, previousImageUrl: null, previousImageUrls: null, selectedIndex: null,
    })
    prismaMock.globalCharacterAppearance.update.mockResolvedValue({})
    const { decodeImageUrlsFromDb } = await import('@/lib/contracts/image-urls-contract')
    vi.mocked(decodeImageUrlsFromDb).mockReturnValue([])
    const formData = new FormData()
    formData.append('file', new File(['img-data'], 'test.jpg', { type: 'image/jpeg' }))
    formData.append('type', 'character')
    formData.append('id', 'char-1')
    formData.append('appearanceIndex', '0')
    formData.append('labelText', 'Hero - Default')
    const mod = await import('@/app/api/asset-hub/upload-image/route')
    const req = new (await import('next/server')).NextRequest(new URL('/api/asset-hub/upload-image', 'http://localhost:3000'), {
      method: 'POST',
      body: formData,
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(json.imageKey).toBeDefined()
  })
})

// ===========================================================================
// 19. upload-temp/route.ts (POST)
// ===========================================================================
describe('POST /api/asset-hub/upload-temp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/upload-temp/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/upload-temp',
      method: 'POST',
      body: { imageBase64: 'data:image/png;base64,abc' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when no valid data provided', async () => {
    const mod = await import('@/app/api/asset-hub/upload-temp/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/upload-temp',
      method: 'POST',
      body: {},
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when imageBase64 is malformed', async () => {
    const mod = await import('@/app/api/asset-hub/upload-temp/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/upload-temp',
      method: 'POST',
      body: { imageBase64: 'not-a-valid-data-uri' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('uploads image base64 successfully', async () => {
    const mod = await import('@/app/api/asset-hub/upload-temp/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/upload-temp',
      method: 'POST',
      body: { imageBase64: 'data:image/png;base64,iVBORw0KGgo=' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(json.url).toBeDefined()
    expect(json.key).toBeDefined()
  })

  it('uploads generic base64 with extension', async () => {
    const mod = await import('@/app/api/asset-hub/upload-temp/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/upload-temp',
      method: 'POST',
      body: { base64: 'YXVkaW8tZGF0YQ==', extension: 'wav' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
  })
})

// ===========================================================================
// 20. update-asset-label/route.ts (POST)
// ===========================================================================
describe('POST /api/asset-hub/update-asset-label', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/update-asset-label/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/update-asset-label',
      method: 'POST',
      body: { type: 'character', id: 'c1', newName: 'Hero' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields are missing', async () => {
    const mod = await import('@/app/api/asset-hub/update-asset-label/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/update-asset-label',
      method: 'POST',
      body: { type: 'character' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('returns 404 when character not found', async () => {
    prismaMock.globalCharacter.findUnique.mockResolvedValue(null)
    const mod = await import('@/app/api/asset-hub/update-asset-label/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/update-asset-label',
      method: 'POST',
      body: { type: 'character', id: 'c-missing', newName: 'New' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(404)
  })

  it('returns 400 when type is invalid', async () => {
    const mod = await import('@/app/api/asset-hub/update-asset-label/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/update-asset-label',
      method: 'POST',
      body: { type: 'bad', id: 'x', newName: 'New' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })
})

// ===========================================================================
// 21. reference-to-character/route.ts (POST)
// ===========================================================================
describe('POST /api/asset-hub/reference-to-character', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/reference-to-character/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/reference-to-character',
      method: 'POST',
      body: { referenceImageUrls: ['https://example.com/img.jpg'] },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when no reference images provided', async () => {
    const mod = await import('@/app/api/asset-hub/reference-to-character/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/reference-to-character',
      method: 'POST',
      body: {},
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('submits task when reference images are provided', async () => {
    maybeSubmitLLMTaskMock.mockResolvedValue(
      new Response(JSON.stringify({ taskId: 'task-ref' }), { status: 200, headers: { 'content-type': 'application/json' } }),
    )
    const mod = await import('@/app/api/asset-hub/reference-to-character/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/reference-to-character',
      method: 'POST',
      body: { referenceImageUrls: ['https://example.com/img.jpg'] },
      headers: { 'accept-language': 'zh-CN' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
  })
})

// ===========================================================================
// 22. voice-design/route.ts (POST)
// ===========================================================================
describe('POST /api/asset-hub/voice-design', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/voice-design/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/voice-design',
      method: 'POST',
      body: { voicePrompt: 'A deep male voice', previewText: 'Hello' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when voicePrompt is invalid', async () => {
    const { validateVoicePrompt } = await import('@/lib/providers/bailian/voice-design')
    vi.mocked(validateVoicePrompt).mockReturnValue({ valid: false, error: 'too short' })
    const mod = await import('@/app/api/asset-hub/voice-design/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/voice-design',
      method: 'POST',
      body: { voicePrompt: '', previewText: 'Hello' },
      headers: { 'accept-language': 'zh-CN' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('submits voice design task', async () => {
    const { validateVoicePrompt, validatePreviewText } = await import('@/lib/providers/bailian/voice-design')
    vi.mocked(validateVoicePrompt).mockReturnValue({ valid: true })
    vi.mocked(validatePreviewText).mockReturnValue({ valid: true })
    submitTaskMock.mockResolvedValue({ taskId: 'task-vd', status: 'queued' })
    const mod = await import('@/app/api/asset-hub/voice-design/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/voice-design',
      method: 'POST',
      body: { voicePrompt: 'A deep male voice', previewText: 'Hello world' },
      headers: { 'accept-language': 'zh-CN' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.taskId).toBeDefined()
  })
})

// ===========================================================================
// 23. ai-design-character/route.ts (POST)
// ===========================================================================
describe('POST /api/asset-hub/ai-design-character', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/ai-design-character/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/ai-design-character',
      method: 'POST',
      body: { userInstruction: 'Create a warrior' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when userInstruction is empty', async () => {
    const mod = await import('@/app/api/asset-hub/ai-design-character/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/ai-design-character',
      method: 'POST',
      body: { userInstruction: '' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when analysisModel is missing in config', async () => {
    getUserModelConfigMock.mockResolvedValue({ analysisModel: null })
    const mod = await import('@/app/api/asset-hub/ai-design-character/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/ai-design-character',
      method: 'POST',
      body: { userInstruction: 'Create a warrior' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('submits AI design character task', async () => {
    getUserModelConfigMock.mockResolvedValue({ analysisModel: 'test-model' })
    maybeSubmitLLMTaskMock.mockResolvedValue(
      new Response(JSON.stringify({ taskId: 'task-ai-char' }), { status: 200, headers: { 'content-type': 'application/json' } }),
    )
    const mod = await import('@/app/api/asset-hub/ai-design-character/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/ai-design-character',
      method: 'POST',
      body: { userInstruction: 'Create a warrior character' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
  })
})

// ===========================================================================
// 24. ai-design-location/route.ts (POST)
// ===========================================================================
describe('POST /api/asset-hub/ai-design-location', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/ai-design-location/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/ai-design-location',
      method: 'POST',
      body: { userInstruction: 'Design a castle' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when userInstruction is empty', async () => {
    const mod = await import('@/app/api/asset-hub/ai-design-location/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/ai-design-location',
      method: 'POST',
      body: { userInstruction: '' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when analysisModel is missing', async () => {
    getUserModelConfigMock.mockResolvedValue({ analysisModel: null })
    const mod = await import('@/app/api/asset-hub/ai-design-location/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/ai-design-location',
      method: 'POST',
      body: { userInstruction: 'Design a castle' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('submits AI design location task', async () => {
    getUserModelConfigMock.mockResolvedValue({ analysisModel: 'test-model' })
    maybeSubmitLLMTaskMock.mockResolvedValue(
      new Response(JSON.stringify({ taskId: 'task-ai-loc' }), { status: 200, headers: { 'content-type': 'application/json' } }),
    )
    const mod = await import('@/app/api/asset-hub/ai-design-location/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/ai-design-location',
      method: 'POST',
      body: { userInstruction: 'Design a mysterious castle' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
  })
})

// ===========================================================================
// 25. ai-modify-character/route.ts (POST)
// ===========================================================================
describe('POST /api/asset-hub/ai-modify-character', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/ai-modify-character/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/ai-modify-character',
      method: 'POST',
      body: { characterId: 'c1', appearanceIndex: 0, currentDescription: 'd', modifyInstruction: 'add hat' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields are missing', async () => {
    const mod = await import('@/app/api/asset-hub/ai-modify-character/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/ai-modify-character',
      method: 'POST',
      body: { characterId: 'c1' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('returns 404 when character not found', async () => {
    prismaMock.globalCharacter.findUnique.mockResolvedValue(null)
    const mod = await import('@/app/api/asset-hub/ai-modify-character/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/ai-modify-character',
      method: 'POST',
      body: { characterId: 'c-missing', appearanceIndex: 0, currentDescription: 'd', modifyInstruction: 'add hat' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(404)
  })

  it('submits AI modify character task', async () => {
    prismaMock.globalCharacter.findUnique.mockResolvedValue({ id: 'char-1', userId: 'user-1' })
    maybeSubmitLLMTaskMock.mockResolvedValue(
      new Response(JSON.stringify({ taskId: 'task-ai-mod-char' }), { status: 200, headers: { 'content-type': 'application/json' } }),
    )
    const mod = await import('@/app/api/asset-hub/ai-modify-character/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/ai-modify-character',
      method: 'POST',
      body: { characterId: 'char-1', appearanceIndex: 0, currentDescription: 'A warrior', modifyInstruction: 'Add a cape' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
  })
})

// ===========================================================================
// 26. ai-modify-location/route.ts (POST)
// ===========================================================================
describe('POST /api/asset-hub/ai-modify-location', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const mod = await import('@/app/api/asset-hub/ai-modify-location/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/ai-modify-location',
      method: 'POST',
      body: { locationId: 'l1', imageIndex: 0, currentDescription: 'd', modifyInstruction: 'add fog' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields are missing', async () => {
    const mod = await import('@/app/api/asset-hub/ai-modify-location/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/ai-modify-location',
      method: 'POST',
      body: { locationId: 'l1' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('returns 404 when location not found', async () => {
    prismaMock.globalLocation.findUnique.mockResolvedValue(null)
    const mod = await import('@/app/api/asset-hub/ai-modify-location/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/ai-modify-location',
      method: 'POST',
      body: { locationId: 'l-missing', imageIndex: 0, currentDescription: 'd', modifyInstruction: 'add fog' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(404)
  })

  it('submits AI modify location task', async () => {
    prismaMock.globalLocation.findUnique.mockResolvedValue({ id: 'loc-1', userId: 'user-1', name: 'Castle' })
    maybeSubmitLLMTaskMock.mockResolvedValue(
      new Response(JSON.stringify({ taskId: 'task-ai-mod-loc' }), { status: 200, headers: { 'content-type': 'application/json' } }),
    )
    const mod = await import('@/app/api/asset-hub/ai-modify-location/route')
    const req = buildMockRequest({
      path: '/api/asset-hub/ai-modify-location',
      method: 'POST',
      body: { locationId: 'loc-1', imageIndex: 0, currentDescription: 'A castle', modifyInstruction: 'Add fog effect' },
    })
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
  })
})
