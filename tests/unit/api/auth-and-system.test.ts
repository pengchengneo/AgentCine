import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { buildMockRequest } from '../../helpers/request'

// ---------------------------------------------------------------------------
// vi.hoisted mocks
// ---------------------------------------------------------------------------

const authState = vi.hoisted(() => ({ authenticated: false }))

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  userBalance: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}))

const rateLimitMock = vi.hoisted(() => ({
  checkRateLimit: vi.fn().mockResolvedValue({ limited: false, remaining: 5, retryAfterSeconds: 0 }),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  AUTH_REGISTER_LIMIT: { windowSeconds: 60, maxRequests: 3 },
}))

const bcryptMock = vi.hoisted(() => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn().mockResolvedValue(true),
  },
}))

const logAuthActionMock = vi.hoisted(() => vi.fn())

const storageMock = vi.hoisted(() => ({
  getSignedObjectUrl: vi.fn().mockResolvedValue('https://signed.example.com/my-key'),
  getSignedUrl: vi.fn((key: string) => `https://signed.example.com/${key}`),
  getStorageProvider: vi.fn(),
  getStorageType: vi.fn().mockReturnValue('cos'),
  toFetchableUrl: vi.fn((url: string) => url),
}))

const fsMock = vi.hoisted(() => ({
  readFile: vi.fn(),
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
      return { session: { user: { id: 'user-1' } } }
    },
  }
})

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/rate-limit', () => rateLimitMock)

vi.mock('bcryptjs', () => bcryptMock)

vi.mock('@/lib/logging/semantic', () => ({
  logAuthAction: logAuthActionMock,
}))

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

vi.mock('@/lib/server-boot', () => ({
  SERVER_BOOT_ID: 'test-boot-id-abc123',
}))

vi.mock('@/lib/storage', () => storageMock)

vi.mock('fs/promises', () => fsMock)

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

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

type RouteContext = { params: Promise<Record<string, string | string[]>> }

async function parseJson(res: Response) {
  return await res.json() as Record<string, unknown>
}

// ===========================================================================
// 1. POST /api/auth/register
// ===========================================================================

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = false
    rateLimitMock.checkRateLimit.mockResolvedValue({ limited: false, remaining: 5, retryAfterSeconds: 0 })
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock))
    prismaMock.user.create.mockResolvedValue({ id: 'new-user-1', name: 'testuser' })
    prismaMock.userBalance.create.mockResolvedValue({})
  })

  it('should register a new user successfully (201)', async () => {
    const req = buildMockRequest({
      path: '/api/auth/register',
      method: 'POST',
      body: { name: 'testuser', password: 'password123' },
    })

    const mod = await import('@/app/api/auth/register/route')
    const res = await mod.POST(req, { params: Promise.resolve({}) })

    expect(res.status).toBe(201)
    const json = await parseJson(res)
    expect(json.message).toBe('注册成功')
    expect(json.user).toEqual({ id: 'new-user-1', name: 'testuser' })
    expect(bcryptMock.default.hash).toHaveBeenCalledWith('password123', 12)
    expect(prismaMock.user.create).toHaveBeenCalled()
    expect(prismaMock.userBalance.create).toHaveBeenCalled()
  })

  it('should register with default name "unknown" when name is omitted', async () => {
    prismaMock.user.create.mockResolvedValue({ id: 'new-user-2', name: 'unknown' })

    const req = buildMockRequest({
      path: '/api/auth/register',
      method: 'POST',
      body: { password: 'password123' },
    })

    const mod = await import('@/app/api/auth/register/route')
    const res = await mod.POST(req, { params: Promise.resolve({}) })

    // The route defaults name to 'unknown' when not provided, so it succeeds
    expect(res.status).toBe(201)
    const json = await parseJson(res)
    expect(json.user).toEqual({ id: 'new-user-2', name: 'unknown' })
  })

  it('should return 400 when both name and password are missing', async () => {
    const req = buildMockRequest({
      path: '/api/auth/register',
      method: 'POST',
      body: {},
    })

    const mod = await import('@/app/api/auth/register/route')
    const res = await mod.POST(req, { params: Promise.resolve({}) })

    expect(res.status).toBe(400)
  })

  it('should return 400 when password is missing', async () => {
    const req = buildMockRequest({
      path: '/api/auth/register',
      method: 'POST',
      body: { name: 'testuser' },
    })

    const mod = await import('@/app/api/auth/register/route')
    const res = await mod.POST(req, { params: Promise.resolve({}) })

    expect(res.status).toBe(400)
  })

  it('should return 400 when password is too short', async () => {
    const req = buildMockRequest({
      path: '/api/auth/register',
      method: 'POST',
      body: { name: 'testuser', password: '123' },
    })

    const mod = await import('@/app/api/auth/register/route')
    const res = await mod.POST(req, { params: Promise.resolve({}) })

    expect(res.status).toBe(400)
  })

  it('should return 400 when user already exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'existing-user', name: 'testuser' })

    const req = buildMockRequest({
      path: '/api/auth/register',
      method: 'POST',
      body: { name: 'testuser', password: 'password123' },
    })

    const mod = await import('@/app/api/auth/register/route')
    const res = await mod.POST(req, { params: Promise.resolve({}) })

    expect(res.status).toBe(400)
  })

  it('should return 429 when rate limited', async () => {
    rateLimitMock.checkRateLimit.mockResolvedValue({ limited: true, remaining: 0, retryAfterSeconds: 30 })

    const req = buildMockRequest({
      path: '/api/auth/register',
      method: 'POST',
      body: { name: 'testuser', password: 'password123' },
    })

    const mod = await import('@/app/api/auth/register/route')
    const res = await mod.POST(req, { params: Promise.resolve({}) })

    expect(res.status).toBe(429)
    const json = await parseJson(res)
    expect(json.success).toBe(false)
    expect(res.headers.get('Retry-After')).toBe('30')
  })

  it('should log auth action on successful registration', async () => {
    const req = buildMockRequest({
      path: '/api/auth/register',
      method: 'POST',
      body: { name: 'testuser', password: 'password123' },
    })

    const mod = await import('@/app/api/auth/register/route')
    await mod.POST(req, { params: Promise.resolve({}) })

    expect(logAuthActionMock).toHaveBeenCalledWith(
      'REGISTER',
      'testuser',
      expect.objectContaining({ userId: 'new-user-1', success: true }),
    )
  })
})

// ===========================================================================
// 2. GET /api/system/boot-id
// ===========================================================================

describe('GET /api/system/boot-id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return the server boot ID (200)', async () => {
    const mod = await import('@/app/api/system/boot-id/route')
    const res = await mod.GET()

    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.bootId).toBe('test-boot-id-abc123')
  })
})

// ===========================================================================
// 3. GET /api/storage/sign
// ===========================================================================

describe('GET /api/storage/sign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storageMock.getSignedObjectUrl.mockResolvedValue('https://signed.example.com/my-key')
  })

  it('should redirect with a signed URL when key is provided (307)', async () => {
    const req = buildMockRequest({
      path: '/api/storage/sign',
      method: 'GET',
      query: { key: 'uploads/test.png' },
    })

    const mod = await import('@/app/api/storage/sign/route')
    const res = await mod.GET(req, { params: Promise.resolve({}) })

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://signed.example.com/my-key')
    expect(storageMock.getSignedObjectUrl).toHaveBeenCalledWith('uploads/test.png', 3600)
  })

  it('should use custom expiry when provided', async () => {
    const req = buildMockRequest({
      path: '/api/storage/sign',
      method: 'GET',
      query: { key: 'uploads/test.png', expires: '7200' },
    })

    const mod = await import('@/app/api/storage/sign/route')
    await mod.GET(req, { params: Promise.resolve({}) })

    expect(storageMock.getSignedObjectUrl).toHaveBeenCalledWith('uploads/test.png', 7200)
  })

  it('should fall back to default expiry for invalid value', async () => {
    const req = buildMockRequest({
      path: '/api/storage/sign',
      method: 'GET',
      query: { key: 'uploads/test.png', expires: 'invalid' },
    })

    const mod = await import('@/app/api/storage/sign/route')
    await mod.GET(req, { params: Promise.resolve({}) })

    expect(storageMock.getSignedObjectUrl).toHaveBeenCalledWith('uploads/test.png', 3600)
  })

  it('should return 400 when key is missing', async () => {
    const req = buildMockRequest({
      path: '/api/storage/sign',
      method: 'GET',
    })

    const mod = await import('@/app/api/storage/sign/route')
    const res = await mod.GET(req, { params: Promise.resolve({}) })

    expect(res.status).toBe(400)
  })
})

// ===========================================================================
// 4. GET /api/cos/image
// ===========================================================================

describe('GET /api/cos/image', () => {
  const originalRedirect = NextResponse.redirect

  beforeEach(() => {
    vi.clearAllMocks()
    // NextResponse.redirect requires absolute URLs; the cos/image route builds
    // a relative path, so we patch redirect to resolve relative URLs against a
    // base URL the same way the production Next.js server would.
    NextResponse.redirect = function patchedRedirect(url: string | URL, init?: number | ResponseInit) {
      const resolved = typeof url === 'string' && !url.startsWith('http')
        ? new URL(url, 'http://localhost:3000')
        : url
      return originalRedirect.call(NextResponse, resolved, init) as NextResponse
    } as typeof NextResponse.redirect
  })

  afterEach(() => {
    NextResponse.redirect = originalRedirect
  })

  it('should redirect to /api/storage/sign with key and default expires (307)', async () => {
    const req = buildMockRequest({
      path: '/api/cos/image',
      method: 'GET',
      query: { key: 'uploads/pic.png' },
    })

    const mod = await import('@/app/api/cos/image/route')
    const res = await mod.GET(req, { params: Promise.resolve({}) })

    expect(res.status).toBe(307)
    const location = res.headers.get('location') || ''
    // The redirect URL is resolved to absolute via our patch
    expect(location).toContain('/api/storage/sign')
    expect(location).toContain(encodeURIComponent('uploads/pic.png'))
    expect(location).toContain('expires=3600')
  })

  it('should pass custom expires to redirect location', async () => {
    const req = buildMockRequest({
      path: '/api/cos/image',
      method: 'GET',
      query: { key: 'uploads/pic.png', expires: '600' },
    })

    const mod = await import('@/app/api/cos/image/route')
    const res = await mod.GET(req, { params: Promise.resolve({}) })

    expect(res.status).toBe(307)
    const location = res.headers.get('location') || ''
    expect(location).toContain('expires=600')
  })

  it('should return 400 when key is missing', async () => {
    const req = buildMockRequest({
      path: '/api/cos/image',
      method: 'GET',
    })

    const mod = await import('@/app/api/cos/image/route')
    const res = await mod.GET(req, { params: Promise.resolve({}) })

    expect(res.status).toBe(400)
  })
})

// ===========================================================================
// 5. GET /api/files/[...path]
// ===========================================================================

describe('GET /api/files/[...path]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fsMock.readFile.mockReset()
  })

  it('should serve a file with correct MIME type (200)', async () => {
    const fileContent = Buffer.from('PNG_DATA')
    fsMock.readFile.mockResolvedValue(fileContent)

    const req = buildMockRequest({
      path: '/api/files/images/photo.png',
      method: 'GET',
    })

    const mod = await import('@/app/api/files/[...path]/route')
    const res = await mod.GET(req, { params: Promise.resolve({ path: ['images', 'photo.png'] }) })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/png')
    expect(res.headers.get('Content-Length')).toBe(String(fileContent.length))
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000')
  })

  it('should return image/jpeg for .jpg files', async () => {
    fsMock.readFile.mockResolvedValue(Buffer.from('JPG_DATA'))

    const req = buildMockRequest({
      path: '/api/files/images/photo.jpg',
      method: 'GET',
    })

    const mod = await import('@/app/api/files/[...path]/route')
    const res = await mod.GET(req, { params: Promise.resolve({ path: ['images', 'photo.jpg'] }) })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
  })

  it('should return application/octet-stream for unknown extensions', async () => {
    fsMock.readFile.mockResolvedValue(Buffer.from('DATA'))

    const req = buildMockRequest({
      path: '/api/files/data/file.xyz',
      method: 'GET',
    })

    const mod = await import('@/app/api/files/[...path]/route')
    const res = await mod.GET(req, { params: Promise.resolve({ path: ['data', 'file.xyz'] }) })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/octet-stream')
  })

  it('should return 404 when file does not exist', async () => {
    const notFoundError = Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    fsMock.readFile.mockRejectedValue(notFoundError)

    const req = buildMockRequest({
      path: '/api/files/missing/file.png',
      method: 'GET',
    })

    const mod = await import('@/app/api/files/[...path]/route')
    const res = await mod.GET(req, { params: Promise.resolve({ path: ['missing', 'file.png'] }) })

    expect(res.status).toBe(404)
    const json = await parseJson(res)
    expect(json.error).toBe('File not found')
  })

  it('should return 403 for path traversal attempts', async () => {
    const req = buildMockRequest({
      path: '/api/files/../../etc/passwd',
      method: 'GET',
    })

    const mod = await import('@/app/api/files/[...path]/route')
    const res = await mod.GET(req, {
      params: Promise.resolve({ path: ['..', '..', 'etc', 'passwd'] }),
    })

    expect(res.status).toBe(403)
    const json = await parseJson(res)
    expect(json.error).toBe('Access denied')
  })

  it('should return 500 for generic read errors', async () => {
    fsMock.readFile.mockRejectedValue(new Error('disk failure'))

    const req = buildMockRequest({
      path: '/api/files/data/broken.bin',
      method: 'GET',
    })

    const mod = await import('@/app/api/files/[...path]/route')
    const res = await mod.GET(req, { params: Promise.resolve({ path: ['data', 'broken.bin'] }) })

    expect(res.status).toBe(500)
    const json = await parseJson(res)
    expect(json.error).toBe('Internal server error')
  })
})
