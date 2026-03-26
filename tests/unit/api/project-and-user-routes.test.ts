import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMockRequest } from '../../helpers/request'

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const authState = vi.hoisted(() => ({ authenticated: false }))

const prismaMock = vi.hoisted(() => ({
  project: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  novelPromotionProject: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  novelPromotionEpisode: {
    findMany: vi.fn(),
  },
  userPreference: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  userBalance: {
    findUnique: vi.fn(),
  },
  usageCost: {
    groupBy: vi.fn(),
    findMany: vi.fn(),
    aggregate: vi.fn(),
    count: vi.fn(),
  },
  balanceTransaction: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  userApiConfig: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  $transaction: vi.fn(),
}))

const billingMocks = vi.hoisted(() => ({
  getBalance: vi.fn(),
  getUserCostSummary: vi.fn(),
  getUserCostDetails: vi.fn(),
  getProjectCostDetails: vi.fn(),
}))

const storageMocks = vi.hoisted(() => ({
  addSignedUrlsToProject: vi.fn((p: unknown) => p),
  deleteObjects: vi.fn(),
}))

const mediaServiceMock = vi.hoisted(() => ({
  resolveStorageKeyFromMediaValue: vi.fn(),
}))

const mediaAttachMock = vi.hoisted(() => ({
  attachMediaFieldsToProject: vi.fn((d: unknown) => Promise.resolve(d)),
}))

const loggingMock = vi.hoisted(() => ({
  logProjectAction: vi.fn(),
}))

const bailianMock = vi.hoisted(() => ({
  collectProjectBailianManagedVoiceIds: vi.fn().mockResolvedValue([]),
  cleanupUnreferencedBailianVoices: vi.fn().mockResolvedValue({
    deletedVoiceIds: [],
    skippedReferencedVoiceIds: [],
  }),
}))

const testLlmConnectionMock = vi.hoisted(() => vi.fn())
const testProviderConnectionMock = vi.hoisted(() => vi.fn())
const probeModelLlmProtocolMock = vi.hoisted(() => vi.fn())
const validateMediaTemplateMock = vi.hoisted(() => vi.fn())
const probeMediaTemplateMock = vi.hoisted(() => vi.fn())
const createAssistantChatResponseMock = vi.hoisted(() => vi.fn())

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/api-auth', () => ({
  isErrorResponse: (v: unknown) => v instanceof Response,
  requireUserAuth: async () => {
    if (!authState.authenticated) {
      return new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED' } }), { status: 401 })
    }
    return { session: { user: { id: 'user-1', name: 'Test User' } } }
  },
  requireProjectAuth: async (pid: string) => {
    if (!authState.authenticated) {
      return new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED' } }), { status: 401 })
    }
    return {
      session: { user: { id: 'user-1' } },
      project: { id: pid, userId: 'user-1' },
      novelData: { id: 'nd-1' },
    }
  },
  requireProjectAuthLight: async (pid: string) => {
    if (!authState.authenticated) {
      return new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED' } }), { status: 401 })
    }
    return {
      session: { user: { id: 'user-1' } },
      project: { id: pid, userId: 'user-1' },
    }
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

vi.mock('@/lib/billing', () => ({
  getBalance: billingMocks.getBalance,
  getUserCostSummary: billingMocks.getUserCostSummary,
  getUserCostDetails: billingMocks.getUserCostDetails,
  getProjectCostDetails: billingMocks.getProjectCostDetails,
}))

vi.mock('@/lib/billing/currency', () => ({
  BILLING_CURRENCY: 'CNY',
}))

vi.mock('@/lib/billing/money', () => ({
  toMoneyNumber: (v: unknown) => (typeof v === 'number' ? v : 0),
}))

vi.mock('@/lib/billing/mode', () => ({
  getBillingMode: vi.fn().mockResolvedValue('OFF'),
}))

vi.mock('@/lib/storage', () => ({
  addSignedUrlsToProject: storageMocks.addSignedUrlsToProject,
  deleteObjects: storageMocks.deleteObjects,
}))

vi.mock('@/lib/media/service', () => ({
  resolveStorageKeyFromMediaValue: mediaServiceMock.resolveStorageKeyFromMediaValue,
}))

vi.mock('@/lib/media/attach', () => ({
  attachMediaFieldsToProject: mediaAttachMock.attachMediaFieldsToProject,
}))

vi.mock('@/lib/logging/core', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  createScopedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    event: vi.fn(),
  }),
}))

vi.mock('@/lib/logging/context', () => ({
  withLogContext: (_ctx: unknown, fn: () => unknown) => fn(),
}))

vi.mock('@/lib/logging/semantic', () => ({
  logProjectAction: loggingMock.logProjectAction,
}))

vi.mock('@/lib/providers/bailian', () => ({
  collectProjectBailianManagedVoiceIds: bailianMock.collectProjectBailianManagedVoiceIds,
  cleanupUnreferencedBailianVoices: bailianMock.cleanupUnreferencedBailianVoices,
}))

vi.mock('@/lib/constants', () => ({
  isArtStyleValue: (v: unknown) =>
    typeof v === 'string' && ['american-comic', 'japanese-anime', 'realistic', 'pixar-3d'].includes(v),
  ART_STYLES: [
    { value: 'american-comic' },
    { value: 'japanese-anime' },
    { value: 'realistic' },
    { value: 'pixar-3d' },
  ],
}))

vi.mock('@/lib/user-api/llm-test-connection', () => ({
  testLlmConnection: testLlmConnectionMock,
}))

vi.mock('@/lib/user-api/provider-test', () => ({
  testProviderConnection: testProviderConnectionMock,
}))

vi.mock('@/lib/user-api/model-llm-protocol-probe', () => ({
  probeModelLlmProtocol: probeModelLlmProtocolMock,
}))

vi.mock('@/lib/user-api/model-template', () => ({
  validateOpenAICompatMediaTemplate: validateMediaTemplateMock,
}))

vi.mock('@/lib/user-api/model-template/validator', () => ({
  validateOpenAICompatMediaTemplate: validateMediaTemplateMock,
}))

vi.mock('@/lib/user-api/model-template/probe', () => ({
  probeMediaTemplate: probeMediaTemplateMock,
}))

vi.mock('@/lib/assistant-platform', () => ({
  createAssistantChatResponse: createAssistantChatResponseMock,
  isAssistantId: (v: unknown) => v === 'api-config-template' || v === 'tutorial',
  AssistantPlatformError: class extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  },
}))

vi.mock('@/lib/api-config', () => ({
  getProviderKey: (id: string) => {
    if (!id) return ''
    const idx = id.indexOf(':')
    return idx === -1 ? id : id.slice(0, idx)
  },
}))

vi.mock('@/lib/crypto-utils', () => ({
  encryptApiKey: (k: string) => `enc:${k}`,
  decryptApiKey: (k: string) => k.replace(/^enc:/, ''),
}))

vi.mock('@/lib/model-config-contract', () => ({
  composeModelKey: (provider: string, modelId: string) =>
    provider && modelId ? `${provider}::${modelId}` : '',
  parseModelKeyStrict: (key: string) => {
    if (!key) return null
    const parts = key.split('::')
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null
    return { provider: parts[0], modelId: parts[1], modelKey: key }
  },
}))

vi.mock('@/lib/model-capabilities/lookup', () => ({
  getCapabilityOptionFields: vi.fn().mockReturnValue({}),
  resolveBuiltinModelContext: vi.fn().mockReturnValue(null),
  validateCapabilitySelectionsPayload: vi.fn().mockReturnValue([]),
}))

vi.mock('@/lib/model-capabilities/catalog', () => ({
  findBuiltinCapabilities: vi.fn().mockReturnValue(undefined),
}))

vi.mock('@/lib/model-pricing/catalog', () => ({
  findBuiltinPricingCatalogEntry: vi.fn().mockReturnValue(null),
  listBuiltinPricingCatalog: vi.fn().mockReturnValue([]),
}))

vi.mock('@/lib/workflow-concurrency', () => ({
  DEFAULT_ANALYSIS_WORKFLOW_CONCURRENCY: 2,
  DEFAULT_IMAGE_WORKFLOW_CONCURRENCY: 3,
  DEFAULT_VIDEO_WORKFLOW_CONCURRENCY: 1,
  normalizeWorkflowConcurrencyConfig: (c: unknown) => c || { analysis: 2, image: 3, video: 1 },
  normalizeWorkflowConcurrencyValue: (v: unknown, def: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 10 ? v : def,
}))

vi.mock('@/lib/openai-compat-media-template', () => ({}))

vi.mock('@/lib/errors/codes', () => {
  const specs: Record<string, { httpStatus: number; defaultMessage: string; retryable: boolean; category: string; userMessageKey: string }> = {
    UNAUTHORIZED: { httpStatus: 401, defaultMessage: 'Unauthorized', retryable: false, category: 'auth', userMessageKey: 'error.unauthorized' },
    FORBIDDEN: { httpStatus: 403, defaultMessage: 'Forbidden', retryable: false, category: 'auth', userMessageKey: 'error.forbidden' },
    NOT_FOUND: { httpStatus: 404, defaultMessage: 'Not found', retryable: false, category: 'client', userMessageKey: 'error.notFound' },
    INVALID_PARAMS: { httpStatus: 400, defaultMessage: 'Invalid parameters', retryable: false, category: 'client', userMessageKey: 'error.invalidParams' },
    MISSING_CONFIG: { httpStatus: 422, defaultMessage: 'Missing config', retryable: false, category: 'client', userMessageKey: 'error.missingConfig' },
    EXTERNAL_ERROR: { httpStatus: 502, defaultMessage: 'External error', retryable: true, category: 'external', userMessageKey: 'error.external' },
    INTERNAL_ERROR: { httpStatus: 500, defaultMessage: 'Internal error', retryable: false, category: 'server', userMessageKey: 'error.internal' },
    INSUFFICIENT_BALANCE: { httpStatus: 402, defaultMessage: 'Insufficient balance', retryable: false, category: 'billing', userMessageKey: 'error.insufficientBalance' },
    RATE_LIMIT: { httpStatus: 429, defaultMessage: 'Rate limited', retryable: true, category: 'external', userMessageKey: 'error.rateLimit' },
    MODEL_NOT_OPEN: { httpStatus: 403, defaultMessage: 'Model not open', retryable: false, category: 'external', userMessageKey: 'error.modelNotOpen' },
    QUOTA_EXCEEDED: { httpStatus: 429, defaultMessage: 'Quota exceeded', retryable: false, category: 'billing', userMessageKey: 'error.quotaExceeded' },
    GENERATION_FAILED: { httpStatus: 500, defaultMessage: 'Generation failed', retryable: true, category: 'external', userMessageKey: 'error.generationFailed' },
    GENERATION_TIMEOUT: { httpStatus: 504, defaultMessage: 'Generation timeout', retryable: true, category: 'external', userMessageKey: 'error.generationTimeout' },
    SENSITIVE_CONTENT: { httpStatus: 451, defaultMessage: 'Sensitive content', retryable: false, category: 'content', userMessageKey: 'error.sensitiveContent' },
    TASK_NOT_READY: { httpStatus: 409, defaultMessage: 'Task not ready', retryable: true, category: 'task', userMessageKey: 'error.taskNotReady' },
    NO_RESULT: { httpStatus: 204, defaultMessage: 'No result', retryable: false, category: 'client', userMessageKey: 'error.noResult' },
    CONFLICT: { httpStatus: 409, defaultMessage: 'Conflict', retryable: false, category: 'client', userMessageKey: 'error.conflict' },
    NETWORK_ERROR: { httpStatus: 502, defaultMessage: 'Network error', retryable: true, category: 'external', userMessageKey: 'error.network' },
    EMPTY_RESPONSE: { httpStatus: 502, defaultMessage: 'Empty response', retryable: true, category: 'external', userMessageKey: 'error.emptyResponse' },
  }
  return {
    getErrorSpec: (code: string) => specs[code] || specs.INTERNAL_ERROR,
  }
})

vi.mock('@/lib/errors/normalize', () => ({
  normalizeAnyError: (e: unknown) => ({
    code: 'INTERNAL_ERROR',
    message: e instanceof Error ? e.message : String(e),
    retryable: false,
    category: 'server',
    userMessageKey: 'error.internal',
    details: {},
    provider: undefined,
  }),
}))

vi.mock('@/lib/task/publisher', () => ({
  publishTaskEvent: vi.fn(),
  publishTaskStreamEvent: vi.fn(),
}))

vi.mock('@/lib/task/types', () => ({
  TASK_EVENT_TYPE: { PROGRESS: 'PROGRESS' },
}))

vi.mock('@/lib/llm-observe/internal-stream-context', () => ({
  withInternalLLMStreamCallbacks: (_cb: unknown, fn: () => unknown) => fn(),
}))

vi.mock('@/lib/llm-observe/stage-pipeline', () => ({
  getTaskFlowMeta: () => ({
    flowId: 'default',
    flowStageIndex: 0,
    flowStageTotal: 1,
    flowStageTitle: 'default',
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ctx(params: Record<string, string> = {}): { params: Promise<Record<string, string>> } {
  return { params: Promise.resolve(params) }
}

async function json(res: Response) {
  return res.json()
}

// ---------------------------------------------------------------------------
// Reset mocks between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  authState.authenticated = false
  vi.clearAllMocks()
  // Ensure project.update returns a resolved promise for fire-and-forget calls
  prismaMock.project.update.mockResolvedValue({})
})

// ===========================================================================
// 1. GET /api/projects
// ===========================================================================

describe('GET /api/projects', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/projects/route')
    const req = buildMockRequest({ path: '/api/projects', method: 'GET' })
    const res = await mod.GET(req, ctx())
    expect(res.status).toBe(401)
  })

  it('returns paginated projects on success', async () => {
    authState.authenticated = true
    const now = new Date()
    prismaMock.project.count.mockResolvedValue(1)
    prismaMock.project.findMany.mockResolvedValue([
      { id: 'p-1', name: 'My Project', createdAt: now, updatedAt: now, lastAccessedAt: null },
    ])
    prismaMock.usageCost.groupBy.mockResolvedValue([])
    prismaMock.novelPromotionProject.findMany.mockResolvedValue([])

    const mod = await import('@/app/api/projects/route')
    const req = buildMockRequest({ path: '/api/projects', method: 'GET' })
    const res = await mod.GET(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.projects).toHaveLength(1)
    expect(body.projects[0].id).toBe('p-1')
    expect(body.pagination).toMatchObject({
      page: 1,
      pageSize: 12,
      total: 1,
      totalPages: 1,
    })
  })

  it('passes search and pagination params to query', async () => {
    authState.authenticated = true
    prismaMock.project.count.mockResolvedValue(0)
    prismaMock.project.findMany.mockResolvedValue([])
    prismaMock.usageCost.groupBy.mockResolvedValue([])
    prismaMock.novelPromotionProject.findMany.mockResolvedValue([])

    const mod = await import('@/app/api/projects/route')
    const req = buildMockRequest({
      path: '/api/projects',
      method: 'GET',
      query: { page: 2, pageSize: 5, search: 'test' },
    })
    const res = await mod.GET(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.pagination.page).toBe(2)
    expect(body.pagination.pageSize).toBe(5)
    // Verify the findMany was called with skip/take reflecting page 2
    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
      }),
    )
  })
})

// ===========================================================================
// 2. POST /api/projects
// ===========================================================================

describe('POST /api/projects', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/projects/route')
    const req = buildMockRequest({
      path: '/api/projects',
      method: 'POST',
      body: { name: 'New Project' },
    })
    const res = await mod.POST(req, ctx())
    expect(res.status).toBe(401)
  })

  it('creates a project and returns 201', async () => {
    authState.authenticated = true
    prismaMock.userPreference.findUnique.mockResolvedValue(null)
    prismaMock.project.create.mockResolvedValue({
      id: 'p-new',
      name: 'New Project',
      mode: 'novel-promotion',
      userId: 'user-1',
    })
    prismaMock.novelPromotionProject.create.mockResolvedValue({})

    const mod = await import('@/app/api/projects/route')
    const req = buildMockRequest({
      path: '/api/projects',
      method: 'POST',
      body: { name: 'New Project', description: 'desc' },
    })
    const res = await mod.POST(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(201)
    expect(body.project.id).toBe('p-new')
    expect(prismaMock.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'New Project',
          description: 'desc',
          mode: 'novel-promotion',
          userId: 'user-1',
        }),
      }),
    )
  })

  it('returns 400 when name is empty', async () => {
    authState.authenticated = true

    const mod = await import('@/app/api/projects/route')
    const req = buildMockRequest({
      path: '/api/projects',
      method: 'POST',
      body: { name: '' },
    })
    const res = await mod.POST(req, ctx())
    expect(res.status).toBe(400)
  })

  it('returns 400 when name exceeds 100 characters', async () => {
    authState.authenticated = true

    const mod = await import('@/app/api/projects/route')
    const req = buildMockRequest({
      path: '/api/projects',
      method: 'POST',
      body: { name: 'x'.repeat(101) },
    })
    const res = await mod.POST(req, ctx())
    expect(res.status).toBe(400)
  })

  it('returns 400 when description exceeds 500 characters', async () => {
    authState.authenticated = true

    const mod = await import('@/app/api/projects/route')
    const req = buildMockRequest({
      path: '/api/projects',
      method: 'POST',
      body: { name: 'ok', description: 'x'.repeat(501) },
    })
    const res = await mod.POST(req, ctx())
    expect(res.status).toBe(400)
  })
})

// ===========================================================================
// 3. GET /api/projects/[projectId]
// ===========================================================================

describe('GET /api/projects/[projectId]', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/projects/[projectId]/route')
    const req = buildMockRequest({ path: '/api/projects/p-1', method: 'GET' })
    const res = await mod.GET(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 404 when project not found', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue(null)

    const mod = await import('@/app/api/projects/[projectId]/route')
    const req = buildMockRequest({ path: '/api/projects/p-1', method: 'GET' })
    const res = await mod.GET(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when project belongs to another user', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p-1',
      userId: 'other-user',
      user: {},
    })

    const mod = await import('@/app/api/projects/[projectId]/route')
    const req = buildMockRequest({ path: '/api/projects/p-1', method: 'GET' })
    const res = await mod.GET(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(403)
  })

  it('returns project details for the owner', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p-1',
      name: 'My Project',
      userId: 'user-1',
      user: { id: 'user-1' },
    })

    const mod = await import('@/app/api/projects/[projectId]/route')
    const req = buildMockRequest({ path: '/api/projects/p-1', method: 'GET' })
    const res = await mod.GET(req, ctx({ projectId: 'p-1' }))
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.project.id).toBe('p-1')
    // Verify lastAccessedAt update was attempted (fire-and-forget)
    expect(prismaMock.project.update).toHaveBeenCalled()
  })
})

// ===========================================================================
// 4. PATCH /api/projects/[projectId]
// ===========================================================================

describe('PATCH /api/projects/[projectId]', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/projects/[projectId]/route')
    const req = buildMockRequest({
      path: '/api/projects/p-1',
      method: 'PATCH',
      body: { name: 'Updated' },
    })
    const res = await mod.PATCH(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 404 when project not found', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue(null)

    const mod = await import('@/app/api/projects/[projectId]/route')
    const req = buildMockRequest({
      path: '/api/projects/p-1',
      method: 'PATCH',
      body: { name: 'Updated' },
    })
    const res = await mod.PATCH(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when project belongs to another user', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p-1',
      userId: 'other-user',
      user: {},
    })

    const mod = await import('@/app/api/projects/[projectId]/route')
    const req = buildMockRequest({
      path: '/api/projects/p-1',
      method: 'PATCH',
      body: { name: 'Updated' },
    })
    const res = await mod.PATCH(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(403)
  })

  it('updates and returns the project', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p-1',
      name: 'Old',
      userId: 'user-1',
      user: { id: 'user-1' },
    })
    prismaMock.project.update.mockResolvedValue({
      id: 'p-1',
      name: 'Updated',
      userId: 'user-1',
    })

    const mod = await import('@/app/api/projects/[projectId]/route')
    const req = buildMockRequest({
      path: '/api/projects/p-1',
      method: 'PATCH',
      body: { name: 'Updated' },
    })
    const res = await mod.PATCH(req, ctx({ projectId: 'p-1' }))
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.project.name).toBe('Updated')
    expect(loggingMock.logProjectAction).toHaveBeenCalledWith(
      'UPDATE',
      'user-1',
      'Test User',
      'p-1',
      'Updated',
      expect.any(Object),
    )
  })
})

// ===========================================================================
// 5. DELETE /api/projects/[projectId]
// ===========================================================================

describe('DELETE /api/projects/[projectId]', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/projects/[projectId]/route')
    const req = buildMockRequest({ path: '/api/projects/p-1', method: 'DELETE' })
    const res = await mod.DELETE(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 404 when project not found', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue(null)

    const mod = await import('@/app/api/projects/[projectId]/route')
    const req = buildMockRequest({ path: '/api/projects/p-1', method: 'DELETE' })
    const res = await mod.DELETE(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when project belongs to another user', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p-1',
      userId: 'other-user',
      user: {},
    })

    const mod = await import('@/app/api/projects/[projectId]/route')
    const req = buildMockRequest({ path: '/api/projects/p-1', method: 'DELETE' })
    const res = await mod.DELETE(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(403)
  })

  it('deletes project, cleans up COS/Bailian, and returns success', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p-1',
      name: 'Doomed',
      userId: 'user-1',
      user: { id: 'user-1' },
    })
    prismaMock.novelPromotionProject.findUnique.mockResolvedValue(null) // no COS keys
    storageMocks.deleteObjects.mockResolvedValue({ success: 0, failed: 0 })
    prismaMock.project.delete.mockResolvedValue({})

    const mod = await import('@/app/api/projects/[projectId]/route')
    const req = buildMockRequest({ path: '/api/projects/p-1', method: 'DELETE' })
    const res = await mod.DELETE(req, ctx({ projectId: 'p-1' }))
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(prismaMock.project.delete).toHaveBeenCalledWith({ where: { id: 'p-1' } })
    expect(loggingMock.logProjectAction).toHaveBeenCalledWith(
      'DELETE',
      'user-1',
      'Test User',
      'p-1',
      'Doomed',
      expect.any(Object),
    )
  })
})

// ===========================================================================
// 6. GET /api/projects/[projectId]/assets
// ===========================================================================

describe('GET /api/projects/[projectId]/assets', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/projects/[projectId]/assets/route')
    const req = buildMockRequest({ path: '/api/projects/p-1/assets', method: 'GET' })
    const res = await mod.GET(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 404 when project not found', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue(null)

    const mod = await import('@/app/api/projects/[projectId]/assets/route')
    const req = buildMockRequest({ path: '/api/projects/p-1/assets', method: 'GET' })
    const res = await mod.GET(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when project belongs to another user', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue({ userId: 'other-user' })

    const mod = await import('@/app/api/projects/[projectId]/assets/route')
    const req = buildMockRequest({ path: '/api/projects/p-1/assets', method: 'GET' })
    const res = await mod.GET(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(403)
  })

  it('returns characters and locations', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue({ userId: 'user-1' })
    prismaMock.novelPromotionProject.findUnique.mockResolvedValue({
      characters: [{ id: 'c-1', appearances: [] }],
      locations: [{ id: 'l-1', images: [] }],
    })

    const mod = await import('@/app/api/projects/[projectId]/assets/route')
    const req = buildMockRequest({ path: '/api/projects/p-1/assets', method: 'GET' })
    const res = await mod.GET(req, ctx({ projectId: 'p-1' }))
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.characters).toHaveLength(1)
    expect(body.locations).toHaveLength(1)
  })

  it('returns 404 when novelPromotionData not found', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue({ userId: 'user-1' })
    prismaMock.novelPromotionProject.findUnique.mockResolvedValue(null)

    const mod = await import('@/app/api/projects/[projectId]/assets/route')
    const req = buildMockRequest({ path: '/api/projects/p-1/assets', method: 'GET' })
    const res = await mod.GET(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(404)
  })
})

// ===========================================================================
// 7. GET /api/projects/[projectId]/costs
// ===========================================================================

describe('GET /api/projects/[projectId]/costs', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/projects/[projectId]/costs/route')
    const req = buildMockRequest({ path: '/api/projects/p-1/costs', method: 'GET' })
    const res = await mod.GET(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 404 when project not found', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue(null)

    const mod = await import('@/app/api/projects/[projectId]/costs/route')
    const req = buildMockRequest({ path: '/api/projects/p-1/costs', method: 'GET' })
    const res = await mod.GET(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when project belongs to another user', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue({ userId: 'other-user', name: 'Proj' })

    const mod = await import('@/app/api/projects/[projectId]/costs/route')
    const req = buildMockRequest({ path: '/api/projects/p-1/costs', method: 'GET' })
    const res = await mod.GET(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(403)
  })

  it('returns cost details for owned project', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue({ userId: 'user-1', name: 'My Proj' })
    billingMocks.getProjectCostDetails.mockResolvedValue({
      byType: [],
      byAction: [],
      total: 12.5,
    })

    const mod = await import('@/app/api/projects/[projectId]/costs/route')
    const req = buildMockRequest({ path: '/api/projects/p-1/costs', method: 'GET' })
    const res = await mod.GET(req, ctx({ projectId: 'p-1' }))
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.projectId).toBe('p-1')
    expect(body.projectName).toBe('My Proj')
    expect(body.currency).toBe('CNY')
    expect(body.total).toBe(12.5)
  })
})

// ===========================================================================
// 8. GET /api/projects/[projectId]/data
// ===========================================================================

describe('GET /api/projects/[projectId]/data', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/projects/[projectId]/data/route')
    const req = buildMockRequest({ path: '/api/projects/p-1/data', method: 'GET' })
    const res = await mod.GET(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 404 when project not found', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue(null)

    const mod = await import('@/app/api/projects/[projectId]/data/route')
    const req = buildMockRequest({ path: '/api/projects/p-1/data', method: 'GET' })
    const res = await mod.GET(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when project belongs to another user', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p-1',
      userId: 'other-user',
      user: {},
    })

    const mod = await import('@/app/api/projects/[projectId]/data/route')
    const req = buildMockRequest({ path: '/api/projects/p-1/data', method: 'GET' })
    const res = await mod.GET(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(403)
  })

  it('returns full project data for owner', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p-1',
      name: 'Project',
      userId: 'user-1',
      user: { id: 'user-1' },
    })
    prismaMock.novelPromotionProject.findUnique.mockResolvedValue({
      projectId: 'p-1',
      episodes: [],
      characters: [],
      locations: [],
    })

    const mod = await import('@/app/api/projects/[projectId]/data/route')
    const req = buildMockRequest({ path: '/api/projects/p-1/data', method: 'GET' })
    const res = await mod.GET(req, ctx({ projectId: 'p-1' }))
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.project.id).toBe('p-1')
    expect(body.project.novelPromotionData).toBeDefined()
    // Fire-and-forget lastAccessedAt update
    expect(prismaMock.project.update).toHaveBeenCalled()
  })

  it('returns 404 when novel promotion data is missing', async () => {
    authState.authenticated = true
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p-1',
      userId: 'user-1',
      user: { id: 'user-1' },
    })
    prismaMock.novelPromotionProject.findUnique.mockResolvedValue(null)

    const mod = await import('@/app/api/projects/[projectId]/data/route')
    const req = buildMockRequest({ path: '/api/projects/p-1/data', method: 'GET' })
    const res = await mod.GET(req, ctx({ projectId: 'p-1' }))
    expect(res.status).toBe(404)
  })
})

// ===========================================================================
// 9. GET /api/user/api-config
// ===========================================================================

describe('GET /api/user/api-config', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/user/api-config/route')
    const req = buildMockRequest({ path: '/api/user/api-config', method: 'GET' })
    const res = await mod.GET(req, ctx())
    expect(res.status).toBe(401)
  })

  it('returns config with empty state when no prefs exist', async () => {
    authState.authenticated = true
    prismaMock.userPreference.findUnique.mockResolvedValue(null)

    const mod = await import('@/app/api/user/api-config/route')
    const req = buildMockRequest({ path: '/api/user/api-config', method: 'GET' })
    const res = await mod.GET(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.models).toEqual([])
    expect(body.providers).toEqual([])
    expect(body.defaultModels).toBeDefined()
    expect(body.workflowConcurrency).toBeDefined()
  })
})

// ===========================================================================
// 10. PUT /api/user/api-config
// ===========================================================================

describe('PUT /api/user/api-config', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/user/api-config/route')
    const req = buildMockRequest({
      path: '/api/user/api-config',
      method: 'PUT',
      body: {},
    })
    const res = await mod.PUT(req, ctx())
    expect(res.status).toBe(401)
  })

  it('saves config and returns success', async () => {
    authState.authenticated = true
    prismaMock.userPreference.findUnique.mockResolvedValue(null)
    prismaMock.userPreference.upsert.mockResolvedValue({})

    const mod = await import('@/app/api/user/api-config/route')
    const req = buildMockRequest({
      path: '/api/user/api-config',
      method: 'PUT',
      body: {
        providers: [
          { id: 'fal', name: 'Fal' },
        ],
      },
    })
    const res = await mod.PUT(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(prismaMock.userPreference.upsert).toHaveBeenCalled()
  })
})

// ===========================================================================
// 11. POST /api/user/api-config/test-connection
// ===========================================================================

describe('POST /api/user/api-config/test-connection', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/user/api-config/test-connection/route')
    const req = buildMockRequest({
      path: '/api/user/api-config/test-connection',
      method: 'POST',
      body: { provider: 'openai', apiKey: 'sk-xxx' },
    })
    const res = await mod.POST(req, ctx())
    expect(res.status).toBe(401)
  })

  it('calls testLlmConnection and returns result', async () => {
    authState.authenticated = true
    testLlmConnectionMock.mockResolvedValue({ ok: true, model: 'gpt-4' })

    const mod = await import('@/app/api/user/api-config/test-connection/route')
    const req = buildMockRequest({
      path: '/api/user/api-config/test-connection',
      method: 'POST',
      body: { provider: 'openai', apiKey: 'sk-xxx' },
    })
    const res = await mod.POST(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.ok).toBe(true)
    expect(typeof body.latencyMs).toBe('number')
  })
})

// ===========================================================================
// 12. POST /api/user/api-config/test-provider
// ===========================================================================

describe('POST /api/user/api-config/test-provider', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/user/api-config/test-provider/route')
    const req = buildMockRequest({
      path: '/api/user/api-config/test-provider',
      method: 'POST',
      body: {},
    })
    const res = await mod.POST(req, ctx())
    expect(res.status).toBe(401)
  })

  it('calls testProviderConnection and returns result with latency', async () => {
    authState.authenticated = true
    testProviderConnectionMock.mockResolvedValue({ connected: true })

    const mod = await import('@/app/api/user/api-config/test-provider/route')
    const req = buildMockRequest({
      path: '/api/user/api-config/test-provider',
      method: 'POST',
      body: { providerId: 'fal', apiKey: 'key' },
    })
    const res = await mod.POST(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.connected).toBe(true)
    expect(typeof body.latencyMs).toBe('number')
  })
})

// ===========================================================================
// 13. POST /api/user/api-config/probe-model-llm-protocol
// ===========================================================================

describe('POST /api/user/api-config/probe-model-llm-protocol', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/user/api-config/probe-model-llm-protocol/route')
    const req = buildMockRequest({
      path: '/api/user/api-config/probe-model-llm-protocol',
      method: 'POST',
      body: { providerId: 'openai-compatible', modelId: 'test' },
    })
    const res = await mod.POST(req, ctx())
    expect(res.status).toBe(401)
  })

  it('returns 400 when providerId is not openai-compatible', async () => {
    authState.authenticated = true

    const mod = await import('@/app/api/user/api-config/probe-model-llm-protocol/route')
    const req = buildMockRequest({
      path: '/api/user/api-config/probe-model-llm-protocol',
      method: 'POST',
      body: { providerId: 'fal', modelId: 'test' },
    })
    const res = await mod.POST(req, ctx())
    expect(res.status).toBe(400)
  })

  it('returns 400 when providerId is missing', async () => {
    authState.authenticated = true

    const mod = await import('@/app/api/user/api-config/probe-model-llm-protocol/route')
    const req = buildMockRequest({
      path: '/api/user/api-config/probe-model-llm-protocol',
      method: 'POST',
      body: { modelId: 'test' },
    })
    const res = await mod.POST(req, ctx())
    expect(res.status).toBe(400)
  })

  it('probes and returns protocol result for openai-compatible', async () => {
    authState.authenticated = true
    probeModelLlmProtocolMock.mockResolvedValue({ protocol: 'chat-completions' })

    const mod = await import('@/app/api/user/api-config/probe-model-llm-protocol/route')
    const req = buildMockRequest({
      path: '/api/user/api-config/probe-model-llm-protocol',
      method: 'POST',
      body: { providerId: 'openai-compatible', modelId: 'my-model' },
    })
    const res = await mod.POST(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.protocol).toBe('chat-completions')
    expect(probeModelLlmProtocolMock).toHaveBeenCalledWith({
      userId: 'user-1',
      providerId: 'openai-compatible',
      modelId: 'my-model',
    })
  })
})

// ===========================================================================
// 14. POST /api/user/api-config/assistant/validate-media-template
// ===========================================================================

describe('POST /api/user/api-config/assistant/validate-media-template', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/user/api-config/assistant/validate-media-template/route')
    const req = buildMockRequest({
      path: '/api/user/api-config/assistant/validate-media-template',
      method: 'POST',
      body: { providerId: 'openai-compatible', template: {} },
    })
    const res = await mod.POST(req, ctx())
    expect(res.status).toBe(401)
  })

  it('returns 400 when provider is not openai-compatible', async () => {
    authState.authenticated = true

    const mod = await import('@/app/api/user/api-config/assistant/validate-media-template/route')
    const req = buildMockRequest({
      path: '/api/user/api-config/assistant/validate-media-template',
      method: 'POST',
      body: { providerId: 'fal', template: {} },
    })
    const res = await mod.POST(req, ctx())
    expect(res.status).toBe(400)
  })

  it('validates template and returns result', async () => {
    authState.authenticated = true
    validateMediaTemplateMock.mockReturnValue({
      ok: true,
      template: { version: 1, mediaType: 'image' },
      issues: [],
    })

    const mod = await import('@/app/api/user/api-config/assistant/validate-media-template/route')
    const req = buildMockRequest({
      path: '/api/user/api-config/assistant/validate-media-template',
      method: 'POST',
      body: { providerId: 'openai-compatible', template: { version: 1 } },
    })
    const res = await mod.POST(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.template).toBeDefined()
  })
})

// ===========================================================================
// 15. POST /api/user/api-config/assistant/probe-media-template
// ===========================================================================

describe('POST /api/user/api-config/assistant/probe-media-template', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/user/api-config/assistant/probe-media-template/route')
    const req = buildMockRequest({
      path: '/api/user/api-config/assistant/probe-media-template',
      method: 'POST',
      body: { providerId: 'openai-compatible', modelId: 'img-model', template: {} },
    })
    const res = await mod.POST(req, ctx())
    expect(res.status).toBe(401)
  })

  it('returns 400 when provider is not openai-compatible', async () => {
    authState.authenticated = true

    const mod = await import('@/app/api/user/api-config/assistant/probe-media-template/route')
    const req = buildMockRequest({
      path: '/api/user/api-config/assistant/probe-media-template',
      method: 'POST',
      body: { providerId: 'fal', modelId: 'img-model', template: {} },
    })
    const res = await mod.POST(req, ctx())
    expect(res.status).toBe(400)
  })

  it('returns validation failure if template is invalid', async () => {
    authState.authenticated = true
    validateMediaTemplateMock.mockReturnValue({
      ok: false,
      template: null,
      issues: ['missing version'],
    })

    const mod = await import('@/app/api/user/api-config/assistant/probe-media-template/route')
    const req = buildMockRequest({
      path: '/api/user/api-config/assistant/probe-media-template',
      method: 'POST',
      body: { providerId: 'openai-compatible', modelId: 'img-model', template: {} },
    })
    const res = await mod.POST(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.success).toBe(false)
    expect(body.verified).toBe(false)
    expect(body.code).toBe('MODEL_TEMPLATE_INVALID')
  })

  it('probes the template when validation passes', async () => {
    authState.authenticated = true
    validateMediaTemplateMock.mockReturnValue({
      ok: true,
      template: { version: 1, mediaType: 'image', mode: 'sync' },
      issues: [],
    })
    probeMediaTemplateMock.mockResolvedValue({ success: true, verified: true })

    const mod = await import('@/app/api/user/api-config/assistant/probe-media-template/route')
    const req = buildMockRequest({
      path: '/api/user/api-config/assistant/probe-media-template',
      method: 'POST',
      body: {
        providerId: 'openai-compatible',
        modelId: 'img-model',
        template: { version: 1 },
        samplePrompt: 'a cat',
      },
    })
    const res = await mod.POST(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.verified).toBe(true)
    expect(probeMediaTemplateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        providerId: 'openai-compatible',
        modelId: 'img-model',
        samplePrompt: 'a cat',
      }),
    )
  })
})

// ===========================================================================
// 16. POST /api/user/assistant/chat
// ===========================================================================

describe('POST /api/user/assistant/chat', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/user/assistant/chat/route')
    const req = buildMockRequest({
      path: '/api/user/assistant/chat',
      method: 'POST',
      body: { assistantId: 'api-config-template', messages: [] },
    })
    const res = await mod.POST(req, ctx())
    expect(res.status).toBe(401)
  })

  it('returns 400 when assistantId is invalid', async () => {
    authState.authenticated = true

    const mod = await import('@/app/api/user/assistant/chat/route')
    const req = buildMockRequest({
      path: '/api/user/assistant/chat',
      method: 'POST',
      body: { assistantId: 'invalid-id', messages: [] },
    })
    const res = await mod.POST(req, ctx())
    expect(res.status).toBe(400)
  })

  it('calls createAssistantChatResponse for valid requests', async () => {
    authState.authenticated = true
    const mockResponse = new Response(JSON.stringify({ reply: 'hello' }), { status: 200 })
    createAssistantChatResponseMock.mockResolvedValue(mockResponse)

    const mod = await import('@/app/api/user/assistant/chat/route')
    const req = buildMockRequest({
      path: '/api/user/assistant/chat',
      method: 'POST',
      body: {
        assistantId: 'api-config-template',
        messages: [{ role: 'user', content: 'hi' }],
      },
    })
    const res = await mod.POST(req, ctx())

    expect(res.status).toBe(200)
    expect(createAssistantChatResponseMock).toHaveBeenCalledWith({
      userId: 'user-1',
      assistantId: 'api-config-template',
      context: undefined,
      messages: [{ role: 'user', content: 'hi' }],
    })
  })
})

// ===========================================================================
// 17. GET /api/user/balance
// ===========================================================================

describe('GET /api/user/balance', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/user/balance/route')
    const req = buildMockRequest({ path: '/api/user/balance', method: 'GET' })
    const res = await mod.GET(req, ctx())
    expect(res.status).toBe(401)
  })

  it('returns user balance', async () => {
    authState.authenticated = true
    billingMocks.getBalance.mockResolvedValue({
      balance: 100.5,
      frozenAmount: 5,
      totalSpent: 20,
    })

    const mod = await import('@/app/api/user/balance/route')
    const req = buildMockRequest({ path: '/api/user/balance', method: 'GET' })
    const res = await mod.GET(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.currency).toBe('CNY')
    expect(body.balance).toBe(100.5)
    expect(body.frozenAmount).toBe(5)
    expect(body.totalSpent).toBe(20)
  })
})

// ===========================================================================
// 18. GET /api/user/costs
// ===========================================================================

describe('GET /api/user/costs', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/user/costs/route')
    const req = buildMockRequest({ path: '/api/user/costs', method: 'GET' })
    const res = await mod.GET(req, ctx())
    expect(res.status).toBe(401)
  })

  it('returns user cost summary with project names', async () => {
    authState.authenticated = true
    billingMocks.getUserCostSummary.mockResolvedValue({
      total: 50,
      byProject: [
        { projectId: 'p-1', _sum: { cost: 30 }, _count: 5 },
        { projectId: 'p-2', _sum: { cost: 20 }, _count: 3 },
      ],
    })
    prismaMock.project.findMany.mockResolvedValue([
      { id: 'p-1', name: 'Project A' },
      { id: 'p-2', name: 'Project B' },
    ])

    const mod = await import('@/app/api/user/costs/route')
    const req = buildMockRequest({ path: '/api/user/costs', method: 'GET' })
    const res = await mod.GET(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.userId).toBe('user-1')
    expect(body.currency).toBe('CNY')
    expect(body.total).toBe(50)
    expect(body.byProject).toHaveLength(2)
    expect(body.byProject[0].projectName).toBe('Project A')
  })
})

// ===========================================================================
// 19. GET /api/user/costs/details
// ===========================================================================

describe('GET /api/user/costs/details', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/user/costs/details/route')
    const req = buildMockRequest({ path: '/api/user/costs/details', method: 'GET' })
    const res = await mod.GET(req, ctx())
    expect(res.status).toBe(401)
  })

  it('returns paginated cost details', async () => {
    authState.authenticated = true
    billingMocks.getUserCostDetails.mockResolvedValue({
      records: [{ id: 'cost-1', cost: 1.5, apiType: 'image' }],
      total: 1,
      page: 1,
      pageSize: 20,
    })

    const mod = await import('@/app/api/user/costs/details/route')
    const req = buildMockRequest({
      path: '/api/user/costs/details',
      method: 'GET',
      query: { page: 1, pageSize: 20 },
    })
    const res = await mod.GET(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.currency).toBe('CNY')
    expect(body.records).toBeDefined()
  })
})

// ===========================================================================
// 20. GET /api/user/models
// ===========================================================================

describe('GET /api/user/models', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/user/models/route')
    const req = buildMockRequest({ path: '/api/user/models', method: 'GET' })
    const res = await mod.GET(req, ctx())
    expect(res.status).toBe(401)
  })

  it('returns grouped model lists when no models configured', async () => {
    authState.authenticated = true
    prismaMock.userPreference.findUnique.mockResolvedValue(null)

    const mod = await import('@/app/api/user/models/route')
    const req = buildMockRequest({ path: '/api/user/models', method: 'GET' })
    const res = await mod.GET(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.llm).toEqual([])
    expect(body.image).toEqual([])
    expect(body.video).toEqual([])
    expect(body.audio).toEqual([])
    expect(body.lipsync).toEqual([])
  })

  it('returns models grouped by type for configured user', async () => {
    authState.authenticated = true
    prismaMock.userPreference.findUnique.mockResolvedValue({
      customModels: JSON.stringify([
        { modelId: 'gpt-4', modelKey: 'openai::gpt-4', name: 'GPT-4', type: 'llm', provider: 'openai' },
        { modelId: 'dalle-3', modelKey: 'openai::dalle-3', name: 'DALL-E 3', type: 'image', provider: 'openai' },
      ]),
      customProviders: JSON.stringify([
        { id: 'openai', name: 'OpenAI', apiKey: 'enc:sk-xxx' },
      ]),
    })

    const mod = await import('@/app/api/user/models/route')
    const req = buildMockRequest({ path: '/api/user/models', method: 'GET' })
    const res = await mod.GET(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.llm).toHaveLength(1)
    expect(body.llm[0].value).toBe('openai::gpt-4')
    expect(body.image).toHaveLength(1)
    expect(body.image[0].value).toBe('openai::dalle-3')
  })
})

// ===========================================================================
// 21. GET /api/user/transactions
// ===========================================================================

describe('GET /api/user/transactions', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/user/transactions/route')
    const req = buildMockRequest({ path: '/api/user/transactions', method: 'GET' })
    const res = await mod.GET(req, ctx())
    expect(res.status).toBe(401)
  })

  it('returns paginated transactions', async () => {
    authState.authenticated = true
    const now = new Date()
    prismaMock.balanceTransaction.findMany.mockResolvedValue([
      {
        id: 'tx-1',
        userId: 'user-1',
        type: 'consume',
        amount: -1.5,
        balanceAfter: 98.5,
        description: 'generate_image - openai::dalle-3',
        taskType: 'generate_image',
        createdAt: now,
        projectId: 'p-1',
        episodeId: null,
        billingMeta: null,
      },
    ])
    prismaMock.balanceTransaction.count.mockResolvedValue(1)
    prismaMock.project.findMany.mockResolvedValue([{ id: 'p-1', name: 'My Project' }])
    prismaMock.novelPromotionEpisode.findMany.mockResolvedValue([])

    const mod = await import('@/app/api/user/transactions/route')
    const req = buildMockRequest({
      path: '/api/user/transactions',
      method: 'GET',
      query: { page: 1, pageSize: 20 },
    })
    const res = await mod.GET(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.currency).toBe('CNY')
    expect(body.transactions).toHaveLength(1)
    expect(body.transactions[0].action).toBe('generate_image')
    expect(body.transactions[0].projectName).toBe('My Project')
    expect(body.pagination).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    })
  })

  it('supports date and type filtering', async () => {
    authState.authenticated = true
    prismaMock.balanceTransaction.findMany.mockResolvedValue([])
    prismaMock.balanceTransaction.count.mockResolvedValue(0)
    prismaMock.project.findMany.mockResolvedValue([])
    prismaMock.novelPromotionEpisode.findMany.mockResolvedValue([])

    const mod = await import('@/app/api/user/transactions/route')
    const req = buildMockRequest({
      path: '/api/user/transactions',
      method: 'GET',
      query: { type: 'consume', startDate: '2024-01-01', endDate: '2024-12-31' },
    })
    const res = await mod.GET(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.transactions).toEqual([])
    // Verify the filter was built correctly
    expect(prismaMock.balanceTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          type: 'consume',
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    )
  })
})

// ===========================================================================
// 22. GET /api/user-preference
// ===========================================================================

describe('GET /api/user-preference', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/user-preference/route')
    const req = buildMockRequest({ path: '/api/user-preference', method: 'GET' })
    const res = await mod.GET(req, ctx())
    expect(res.status).toBe(401)
  })

  it('returns user preference (upserts if absent)', async () => {
    authState.authenticated = true
    prismaMock.userPreference.upsert.mockResolvedValue({
      userId: 'user-1',
      artStyle: 'american-comic',
      videoRatio: '16:9',
    })

    const mod = await import('@/app/api/user-preference/route')
    const req = buildMockRequest({ path: '/api/user-preference', method: 'GET' })
    const res = await mod.GET(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.preference).toBeDefined()
    expect(body.preference.userId).toBe('user-1')
    expect(prismaMock.userPreference.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      update: {},
      create: { userId: 'user-1' },
    })
  })
})

// ===========================================================================
// 23. PATCH /api/user-preference
// ===========================================================================

describe('PATCH /api/user-preference', () => {
  it('returns 401 when unauthenticated', async () => {
    const mod = await import('@/app/api/user-preference/route')
    const req = buildMockRequest({
      path: '/api/user-preference',
      method: 'PATCH',
      body: { artStyle: 'realistic' },
    })
    const res = await mod.PATCH(req, ctx())
    expect(res.status).toBe(401)
  })

  it('updates allowed fields and returns preference', async () => {
    authState.authenticated = true
    prismaMock.userPreference.upsert.mockResolvedValue({
      userId: 'user-1',
      artStyle: 'realistic',
      videoRatio: '16:9',
    })

    const mod = await import('@/app/api/user-preference/route')
    const req = buildMockRequest({
      path: '/api/user-preference',
      method: 'PATCH',
      body: { artStyle: 'realistic', videoRatio: '9:16' },
    })
    const res = await mod.PATCH(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    expect(body.preference).toBeDefined()
    expect(prismaMock.userPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        update: expect.objectContaining({
          artStyle: 'realistic',
          videoRatio: '9:16',
        }),
      }),
    )
  })

  it('returns 400 when no allowed fields are provided', async () => {
    authState.authenticated = true

    const mod = await import('@/app/api/user-preference/route')
    const req = buildMockRequest({
      path: '/api/user-preference',
      method: 'PATCH',
      body: { unknownField: 'value' },
    })
    const res = await mod.PATCH(req, ctx())
    expect(res.status).toBe(400)
  })

  it('returns 400 when artStyle is invalid', async () => {
    authState.authenticated = true

    const mod = await import('@/app/api/user-preference/route')
    const req = buildMockRequest({
      path: '/api/user-preference',
      method: 'PATCH',
      body: { artStyle: 'not-a-real-style' },
    })
    const res = await mod.PATCH(req, ctx())
    expect(res.status).toBe(400)
  })

  it('ignores disallowed fields while updating allowed ones', async () => {
    authState.authenticated = true
    prismaMock.userPreference.upsert.mockResolvedValue({
      userId: 'user-1',
      ttsRate: 1.5,
    })

    const mod = await import('@/app/api/user-preference/route')
    const req = buildMockRequest({
      path: '/api/user-preference',
      method: 'PATCH',
      body: { ttsRate: 1.5, hackerField: 'pwned' },
    })
    const res = await mod.PATCH(req, ctx())
    const body = await json(res)

    expect(res.status).toBe(200)
    // Verify only ttsRate was passed, not hackerField
    const upsertCall = prismaMock.userPreference.upsert.mock.calls[0][0]
    expect(upsertCall.update).toEqual({ ttsRate: 1.5 })
    expect(upsertCall.update).not.toHaveProperty('hackerField')
  })
})
