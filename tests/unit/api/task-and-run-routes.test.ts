import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMockRequest } from '../../helpers/request'

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const authState = vi.hoisted(() => ({ authenticated: true }))

// Task service mocks
const queryTasksMock = vi.hoisted(() => vi.fn())
const getTaskByIdMock = vi.hoisted(() => vi.fn())
const cancelTaskMock = vi.hoisted(() => vi.fn())
const dismissFailedTasksMock = vi.hoisted(() => vi.fn())

// Task queue / publisher mocks
const removeTaskJobMock = vi.hoisted(() => vi.fn(async () => true))
const publishTaskEventMock = vi.hoisted(() => vi.fn(async () => undefined))
const listTaskLifecycleEventsMock = vi.hoisted(() => vi.fn(async () => []))
const listEventsAfterMock = vi.hoisted(() => vi.fn(async () => []))
const getProjectChannelMock = vi.hoisted(() => vi.fn((pid: string) => `project:${pid}`))

// Task target state mocks
const queryTaskTargetStatesMock = vi.hoisted(() => vi.fn())
const withPrismaRetryMock = vi.hoisted(() => vi.fn(async <T>(fn: () => Promise<T>) => await fn()))

// Run service mocks
const listRunsMock = vi.hoisted(() => vi.fn())
const createRunMock = vi.hoisted(() => vi.fn())
const getRunSnapshotMock = vi.hoisted(() => vi.fn())
const getRunByIdMock = vi.hoisted(() => vi.fn())
const requestRunCancelMock = vi.hoisted(() => vi.fn())
const listRunEventsAfterSeqMock = vi.hoisted(() => vi.fn())
const retryFailedStepMock = vi.hoisted(() => vi.fn())

// Run publisher mock
const publishRunEventMock = vi.hoisted(() => vi.fn(async () => undefined))

// Task submitter mock
const submitTaskMock = vi.hoisted(() => vi.fn())

// Locale resolver mock
const resolveRequiredTaskLocaleMock = vi.hoisted(() => vi.fn(() => 'zh'))

// SSE shared subscriber
const addChannelListenerMock = vi.hoisted(() =>
  vi.fn<(channel: string, listener: (message: string) => void) => Promise<() => Promise<void>>>(
    async () => async () => undefined,
  ),
)
const subscriberState = vi.hoisted(() => ({
  listener: null as ((message: string) => void) | null,
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
    requireProjectAuth: async (pid: string) => {
      if (!authState.authenticated) return unauthorized()
      return {
        session: { user: { id: 'user-1' } },
        project: { id: pid, userId: 'user-1' },
        novelData: { id: 'nd-1' },
      }
    },
    requireProjectAuthLight: async (pid: string) => {
      if (!authState.authenticated) return unauthorized()
      return {
        session: { user: { id: 'user-1' } },
        project: { id: pid, userId: 'user-1' },
      }
    },
  }
})

vi.mock('@/lib/task/service', () => ({
  queryTasks: queryTasksMock,
  getTaskById: getTaskByIdMock,
  cancelTask: cancelTaskMock,
  dismissFailedTasks: dismissFailedTasksMock,
}))

vi.mock('@/lib/task/queues', () => ({
  removeTaskJob: removeTaskJobMock,
}))

vi.mock('@/lib/task/publisher', () => ({
  publishTaskEvent: publishTaskEventMock,
  getProjectChannel: getProjectChannelMock,
  listEventsAfter: listEventsAfterMock,
  listTaskLifecycleEvents: listTaskLifecycleEventsMock,
}))

vi.mock('@/lib/task/state-service', () => ({
  queryTaskTargetStates: queryTaskTargetStatesMock,
}))

vi.mock('@/lib/prisma-retry', () => ({
  withPrismaRetry: withPrismaRetryMock,
}))

vi.mock('@/lib/errors/normalize', () => ({
  normalizeTaskError: vi.fn((code: string | null, message: string | null) => {
    if (!code && !message) return null
    return { code: code || 'INTERNAL_ERROR', message: message || 'Unknown error' }
  }),
  normalizeAnyError: vi.fn((error: unknown) => ({
    code: 'INTERNAL_ERROR',
    message: error instanceof Error ? error.message : String(error),
    retryable: false,
    category: 'internal',
    userMessageKey: 'error.internal',
    provider: null,
    details: null,
  })),
}))

vi.mock('@/lib/run-runtime/service', () => ({
  listRuns: listRunsMock,
  createRun: createRunMock,
  getRunSnapshot: getRunSnapshotMock,
  getRunById: getRunByIdMock,
  requestRunCancel: requestRunCancelMock,
  listRunEventsAfterSeq: listRunEventsAfterSeqMock,
  retryFailedStep: retryFailedStepMock,
}))

vi.mock('@/lib/run-runtime/publisher', () => ({
  publishRunEvent: publishRunEventMock,
}))

vi.mock('@/lib/task/submitter', () => ({
  submitTask: submitTaskMock,
}))

vi.mock('@/lib/task/resolve-locale', () => ({
  resolveRequiredTaskLocale: resolveRequiredTaskLocaleMock,
}))

vi.mock('@/lib/sse/shared-subscriber', () => ({
  getSharedSubscriber: vi.fn(() => ({
    addChannelListener: addChannelListenerMock,
  })),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      findMany: vi.fn(async () => []),
    },
  },
}))

vi.mock('@/lib/task/intent', () => ({
  coerceTaskIntent: vi.fn((_value: unknown, _taskType?: string | null) => 'generate'),
  resolveTaskIntent: vi.fn(() => 'generate'),
}))

vi.mock('@/lib/logging/core', () => ({
  createScopedLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    event: vi.fn(),
  })),
  logError: vi.fn(),
}))

vi.mock('@/lib/logging/context', () => ({
  withLogContext: vi.fn(async (_ctx: unknown, fn: () => Promise<unknown>) => await fn()),
}))

vi.mock('@/lib/llm-observe/internal-stream-context', () => ({
  withInternalLLMStreamCallbacks: vi.fn(async (_cb: unknown, fn: () => Promise<unknown>) => await fn()),
}))

vi.mock('@/lib/llm-observe/stage-pipeline', () => ({
  getTaskFlowMeta: vi.fn(() => ({
    flowId: 'flow-1',
    flowStageIndex: 1,
    flowStageTotal: 1,
    flowStageTitle: 'default',
  })),
}))

vi.mock('@/lib/run-runtime/task-bridge', () => ({
  mapTaskSSEEventToRunEvents: vi.fn(() => []),
}))

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

type EmptyRouteContext = { params: Promise<Record<string, string>> }
type TaskRouteContext = { params: Promise<{ taskId: string }> }
type RunRouteContext = { params: Promise<{ runId: string }> }
type RunStepRetryContext = { params: Promise<{ runId: string; stepKey: string }> }

const emptyCtx: EmptyRouteContext = { params: Promise.resolve({}) }

const baseTask = {
  id: 'task-1',
  userId: 'user-1',
  projectId: 'project-1',
  type: 'IMAGE_CHARACTER',
  targetType: 'CharacterAppearance',
  targetId: 'appearance-1',
  episodeId: null,
  status: 'failed',
  progress: null,
  payload: null,
  errorCode: null,
  errorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const baseRun = {
  id: 'run-1',
  userId: 'user-1',
  projectId: 'project-1',
  episodeId: 'episode-1',
  workflowType: 'story_to_script_run',
  taskType: 'story_to_script_run',
  taskId: null,
  targetType: 'NovelPromotionEpisode',
  targetId: 'target-1',
  status: 'running',
  input: { episodeId: 'episode-1', meta: { locale: 'zh' } },
  output: null,
  errorCode: null,
  errorMessage: null,
  cancelRequestedAt: null,
  queuedAt: new Date(),
  startedAt: new Date(),
  finishedAt: null,
  lastSeq: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('task and run API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.authenticated = true
    subscriberState.listener = null

    // Default mock return values
    queryTasksMock.mockResolvedValue([baseTask])
    getTaskByIdMock.mockResolvedValue(baseTask)
    dismissFailedTasksMock.mockResolvedValue(2)
    cancelTaskMock.mockResolvedValue({
      task: {
        ...baseTask,
        status: 'failed',
        errorCode: 'TASK_CANCELLED',
        errorMessage: 'Task cancelled by user',
      },
      cancelled: true,
    })
    queryTaskTargetStatesMock.mockResolvedValue([
      {
        targetType: 'CharacterAppearance',
        targetId: 'appearance-1',
        phase: 'processing',
        runningTaskId: 'task-1',
        runningTaskType: 'IMAGE_CHARACTER',
        intent: 'generate',
        hasOutputAtStart: null,
        progress: null,
        stage: null,
        stageLabel: null,
        lastError: null,
        updatedAt: new Date().toISOString(),
      },
    ])
    listRunsMock.mockResolvedValue([baseRun])
    createRunMock.mockResolvedValue({ ...baseRun, id: 'run-new' })
    getRunSnapshotMock.mockResolvedValue({
      run: baseRun,
      steps: [],
      artifacts: [],
      events: [],
    })
    getRunByIdMock.mockResolvedValue(baseRun)
    requestRunCancelMock.mockResolvedValue({
      ...baseRun,
      status: 'canceling',
      taskId: 'task-1',
    })
    listRunEventsAfterSeqMock.mockResolvedValue([])
    retryFailedStepMock.mockResolvedValue({ retryAttempt: 2 })
    submitTaskMock.mockResolvedValue({ taskId: 'task-retry-1' })

    addChannelListenerMock.mockImplementation(
      async (_channel: string, listener: (message: string) => void) => {
        subscriberState.listener = listener
        return async () => undefined
      },
    )
  })

  // =========================================================================
  // 1. GET /api/tasks
  // =========================================================================
  describe('GET /api/tasks', () => {
    it('returns 401 when unauthenticated', async () => {
      authState.authenticated = false
      const { GET } = await import('@/app/api/tasks/route')
      const req = buildMockRequest({
        path: '/api/tasks',
        method: 'GET',
        query: { projectId: 'project-1' },
      })
      const res = await GET(req, emptyCtx)
      expect(res.status).toBe(401)
    })

    it('returns 200 with filtered tasks for authenticated user', async () => {
      const { GET } = await import('@/app/api/tasks/route')
      const req = buildMockRequest({
        path: '/api/tasks',
        method: 'GET',
        query: { projectId: 'project-1', limit: 30 },
      })
      const res = await GET(req, emptyCtx)
      expect(res.status).toBe(200)
      const body = (await res.json()) as { tasks: unknown[] }
      expect(body.tasks).toHaveLength(1)
      expect(queryTasksMock).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 'project-1', limit: 30 }),
      )
    })

    it('filters out tasks not owned by the authenticated user', async () => {
      queryTasksMock.mockResolvedValueOnce([
        { ...baseTask, userId: 'other-user' },
        baseTask,
      ])
      const { GET } = await import('@/app/api/tasks/route')
      const req = buildMockRequest({
        path: '/api/tasks',
        method: 'GET',
        query: { projectId: 'project-1' },
      })
      const res = await GET(req, emptyCtx)
      expect(res.status).toBe(200)
      const body = (await res.json()) as { tasks: unknown[] }
      expect(body.tasks).toHaveLength(1)
    })

    it('attaches normalized error to each task', async () => {
      queryTasksMock.mockResolvedValueOnce([
        { ...baseTask, errorCode: 'GENERATION_FAILED', errorMessage: 'Something broke' },
      ])
      const { GET } = await import('@/app/api/tasks/route')
      const req = buildMockRequest({
        path: '/api/tasks',
        method: 'GET',
        query: { projectId: 'project-1' },
      })
      const res = await GET(req, emptyCtx)
      expect(res.status).toBe(200)
      const body = (await res.json()) as { tasks: Array<{ error: unknown }> }
      expect(body.tasks[0]?.error).toBeTruthy()
    })

    it('clamps limit between 1 and 200', async () => {
      const { GET } = await import('@/app/api/tasks/route')
      const req = buildMockRequest({
        path: '/api/tasks',
        method: 'GET',
        query: { projectId: 'project-1', limit: 999 },
      })
      await GET(req, emptyCtx)
      expect(queryTasksMock).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 200 }),
      )
    })
  })

  // =========================================================================
  // 2. GET /api/tasks/[taskId]
  // =========================================================================
  describe('GET /api/tasks/[taskId]', () => {
    it('returns 401 when unauthenticated', async () => {
      authState.authenticated = false
      const { GET } = await import('@/app/api/tasks/[taskId]/route')
      const req = buildMockRequest({ path: '/api/tasks/task-1', method: 'GET' })
      const res = await GET(req, { params: Promise.resolve({ taskId: 'task-1' }) })
      expect(res.status).toBe(401)
    })

    it('returns 404 when task not found', async () => {
      getTaskByIdMock.mockResolvedValueOnce(null)
      const { GET } = await import('@/app/api/tasks/[taskId]/route')
      const req = buildMockRequest({ path: '/api/tasks/task-missing', method: 'GET' })
      const res = await GET(req, { params: Promise.resolve({ taskId: 'task-missing' }) })
      expect(res.status).toBe(404)
    })

    it('returns 404 when task belongs to another user', async () => {
      getTaskByIdMock.mockResolvedValueOnce({ ...baseTask, userId: 'other-user' })
      const { GET } = await import('@/app/api/tasks/[taskId]/route')
      const req = buildMockRequest({ path: '/api/tasks/task-1', method: 'GET' })
      const res = await GET(req, { params: Promise.resolve({ taskId: 'task-1' }) })
      expect(res.status).toBe(404)
    })

    it('returns 200 with task detail', async () => {
      const { GET } = await import('@/app/api/tasks/[taskId]/route')
      const req = buildMockRequest({ path: '/api/tasks/task-1', method: 'GET' })
      const res = await GET(req, { params: Promise.resolve({ taskId: 'task-1' }) })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { task: { id: string } }
      expect(body.task.id).toBe('task-1')
    })

    it('includes events when includeEvents=1 is requested', async () => {
      const mockEvents = [
        {
          id: '42',
          type: 'task.lifecycle',
          taskId: 'task-1',
          projectId: 'project-1',
          userId: 'user-1',
          ts: new Date().toISOString(),
          payload: { lifecycleType: 'task.processing' },
        },
      ]
      listTaskLifecycleEventsMock.mockResolvedValueOnce(mockEvents)
      const { GET } = await import('@/app/api/tasks/[taskId]/route')
      const req = buildMockRequest({
        path: '/api/tasks/task-1',
        method: 'GET',
        query: { includeEvents: '1', eventsLimit: '100' },
      })
      const res = await GET(req, { params: Promise.resolve({ taskId: 'task-1' }) })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { task: unknown; events: unknown[] }
      expect(body.events).toHaveLength(1)
      expect(listTaskLifecycleEventsMock).toHaveBeenCalledWith('task-1', 100)
    })

    it('does not include events when includeEvents is not set', async () => {
      const { GET } = await import('@/app/api/tasks/[taskId]/route')
      const req = buildMockRequest({ path: '/api/tasks/task-1', method: 'GET' })
      const res = await GET(req, { params: Promise.resolve({ taskId: 'task-1' }) })
      expect(res.status).toBe(200)
      const body = (await res.json()) as Record<string, unknown>
      expect(body.events).toBeUndefined()
      expect(listTaskLifecycleEventsMock).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // 2b. DELETE /api/tasks/[taskId]
  // =========================================================================
  describe('DELETE /api/tasks/[taskId]', () => {
    it('returns 401 when unauthenticated', async () => {
      authState.authenticated = false
      const { DELETE } = await import('@/app/api/tasks/[taskId]/route')
      const req = buildMockRequest({ path: '/api/tasks/task-1', method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ taskId: 'task-1' }) } as TaskRouteContext)
      expect(res.status).toBe(401)
    })

    it('returns 404 when task not found', async () => {
      getTaskByIdMock.mockResolvedValueOnce(null)
      const { DELETE } = await import('@/app/api/tasks/[taskId]/route')
      const req = buildMockRequest({ path: '/api/tasks/task-missing', method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ taskId: 'task-missing' }) } as TaskRouteContext)
      expect(res.status).toBe(404)
    })

    it('returns 404 when task belongs to another user', async () => {
      getTaskByIdMock.mockResolvedValueOnce({ ...baseTask, userId: 'other-user' })
      const { DELETE } = await import('@/app/api/tasks/[taskId]/route')
      const req = buildMockRequest({ path: '/api/tasks/task-1', method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ taskId: 'task-1' }) } as TaskRouteContext)
      expect(res.status).toBe(404)
    })

    it('returns 200 and cancels task on success', async () => {
      const { DELETE } = await import('@/app/api/tasks/[taskId]/route')
      const req = buildMockRequest({ path: '/api/tasks/task-1', method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ taskId: 'task-1' }) } as TaskRouteContext)
      expect(res.status).toBe(200)
      const body = (await res.json()) as { success: boolean; cancelled: boolean }
      expect(body.success).toBe(true)
      expect(body.cancelled).toBe(true)
    })

    it('removes job from queue and publishes cancel event when cancelled', async () => {
      const { DELETE } = await import('@/app/api/tasks/[taskId]/route')
      const req = buildMockRequest({ path: '/api/tasks/task-1', method: 'DELETE' })
      await DELETE(req, { params: Promise.resolve({ taskId: 'task-1' }) } as TaskRouteContext)

      expect(removeTaskJobMock).toHaveBeenCalledWith('task-1')
      expect(publishTaskEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-1',
          payload: expect.objectContaining({
            cancelled: true,
            stage: 'cancelled',
          }),
        }),
      )
    })

    it('does not publish event when cancel did not actually cancel', async () => {
      cancelTaskMock.mockResolvedValueOnce({
        task: { ...baseTask },
        cancelled: false,
      })
      const { DELETE } = await import('@/app/api/tasks/[taskId]/route')
      const req = buildMockRequest({ path: '/api/tasks/task-1', method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ taskId: 'task-1' }) } as TaskRouteContext)
      expect(res.status).toBe(200)
      expect(removeTaskJobMock).not.toHaveBeenCalled()
      expect(publishTaskEventMock).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // 3. POST /api/tasks/dismiss
  // =========================================================================
  describe('POST /api/tasks/dismiss', () => {
    it('returns 401 when unauthenticated', async () => {
      authState.authenticated = false
      const { POST } = await import('@/app/api/tasks/dismiss/route')
      const req = buildMockRequest({
        path: '/api/tasks/dismiss',
        method: 'POST',
        body: { taskIds: ['task-1'] },
      })
      const res = await POST(req, emptyCtx)
      expect(res.status).toBe(401)
    })

    it('returns 400 when taskIds is empty', async () => {
      const { POST } = await import('@/app/api/tasks/dismiss/route')
      const req = buildMockRequest({
        path: '/api/tasks/dismiss',
        method: 'POST',
        body: { taskIds: [] },
      })
      const res = await POST(req, emptyCtx)
      expect(res.status).toBe(400)
    })

    it('returns 400 when taskIds is not an array', async () => {
      const { POST } = await import('@/app/api/tasks/dismiss/route')
      const req = buildMockRequest({
        path: '/api/tasks/dismiss',
        method: 'POST',
        body: { taskIds: 'not-an-array' },
      })
      const res = await POST(req, emptyCtx)
      expect(res.status).toBe(400)
    })

    it('returns 400 when taskIds exceeds 200', async () => {
      const { POST } = await import('@/app/api/tasks/dismiss/route')
      const ids = Array.from({ length: 201 }, (_, i) => `task-${i}`)
      const req = buildMockRequest({
        path: '/api/tasks/dismiss',
        method: 'POST',
        body: { taskIds: ids },
      })
      const res = await POST(req, emptyCtx)
      expect(res.status).toBe(400)
    })

    it('returns 200 with dismissed count on success', async () => {
      const { POST } = await import('@/app/api/tasks/dismiss/route')
      const req = buildMockRequest({
        path: '/api/tasks/dismiss',
        method: 'POST',
        body: { taskIds: ['task-1', 'task-2'] },
      })
      const res = await POST(req, emptyCtx)
      expect(res.status).toBe(200)
      const body = (await res.json()) as { success: boolean; dismissed: number }
      expect(body.success).toBe(true)
      expect(body.dismissed).toBe(2)
      expect(dismissFailedTasksMock).toHaveBeenCalledWith(['task-1', 'task-2'], 'user-1')
    })
  })

  // =========================================================================
  // 4. POST /api/task-target-states
  // =========================================================================
  describe('POST /api/task-target-states', () => {
    it('returns 400 when projectId is missing', async () => {
      const { POST } = await import('@/app/api/task-target-states/route')
      const req = buildMockRequest({
        path: '/api/task-target-states',
        method: 'POST',
        body: { targets: [{ targetType: 'A', targetId: 'B' }] },
      })
      const res = await POST(req, emptyCtx)
      expect(res.status).toBe(400)
    })

    it('returns 400 when targets is missing', async () => {
      const { POST } = await import('@/app/api/task-target-states/route')
      const req = buildMockRequest({
        path: '/api/task-target-states',
        method: 'POST',
        body: { projectId: 'project-1' },
      })
      const res = await POST(req, emptyCtx)
      expect(res.status).toBe(400)
    })

    it('returns 401 when unauthenticated', async () => {
      authState.authenticated = false
      const { POST } = await import('@/app/api/task-target-states/route')
      const req = buildMockRequest({
        path: '/api/task-target-states',
        method: 'POST',
        body: {
          projectId: 'project-1',
          targets: [{ targetType: 'CharacterAppearance', targetId: 'a-1' }],
        },
      })
      const res = await POST(req, emptyCtx)
      expect(res.status).toBe(401)
    })

    it('returns 200 with states on success', async () => {
      const { POST } = await import('@/app/api/task-target-states/route')
      const req = buildMockRequest({
        path: '/api/task-target-states',
        method: 'POST',
        body: {
          projectId: 'project-1',
          targets: [
            { targetType: 'CharacterAppearance', targetId: 'appearance-1', types: ['IMAGE_CHARACTER'] },
          ],
        },
      })
      const res = await POST(req, emptyCtx)
      expect(res.status).toBe(200)
      const body = (await res.json()) as { states: unknown[] }
      expect(body.states).toHaveLength(1)
      expect(withPrismaRetryMock).toHaveBeenCalledTimes(1)
      expect(queryTaskTargetStatesMock).toHaveBeenCalledWith({
        projectId: 'project-1',
        userId: 'user-1',
        targets: [
          { targetType: 'CharacterAppearance', targetId: 'appearance-1', types: ['IMAGE_CHARACTER'] },
        ],
      })
    })

    it('returns empty states array when targets is empty array', async () => {
      const { POST } = await import('@/app/api/task-target-states/route')
      const req = buildMockRequest({
        path: '/api/task-target-states',
        method: 'POST',
        body: { projectId: 'project-1', targets: [] },
      })
      const res = await POST(req, emptyCtx)
      expect(res.status).toBe(200)
      const body = (await res.json()) as { states: unknown[] }
      expect(body.states).toHaveLength(0)
    })

    it('returns 400 when a target has empty targetType', async () => {
      const { POST } = await import('@/app/api/task-target-states/route')
      const req = buildMockRequest({
        path: '/api/task-target-states',
        method: 'POST',
        body: {
          projectId: 'project-1',
          targets: [{ targetType: '', targetId: 'a-1' }],
        },
      })
      const res = await POST(req, emptyCtx)
      expect(res.status).toBe(400)
    })

    it('returns 400 when targets exceeds 500', async () => {
      const { POST } = await import('@/app/api/task-target-states/route')
      const targets = Array.from({ length: 501 }, (_, i) => ({
        targetType: 'T',
        targetId: `id-${i}`,
      }))
      const req = buildMockRequest({
        path: '/api/task-target-states',
        method: 'POST',
        body: { projectId: 'project-1', targets },
      })
      const res = await POST(req, emptyCtx)
      expect(res.status).toBe(400)
    })

    it('uses requireUserAuth for global-asset-hub projectId', async () => {
      const { POST } = await import('@/app/api/task-target-states/route')
      const req = buildMockRequest({
        path: '/api/task-target-states',
        method: 'POST',
        body: {
          projectId: 'global-asset-hub',
          targets: [{ targetType: 'Asset', targetId: 'asset-1' }],
        },
      })
      const res = await POST(req, emptyCtx)
      expect(res.status).toBe(200)
      expect(queryTaskTargetStatesMock).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 'global-asset-hub', userId: 'user-1' }),
      )
    })
  })

  // =========================================================================
  // 5. GET /api/runs
  // =========================================================================
  describe('GET /api/runs', () => {
    it('returns 401 when unauthenticated', async () => {
      authState.authenticated = false
      const { GET } = await import('@/app/api/runs/route')
      const req = buildMockRequest({
        path: '/api/runs',
        method: 'GET',
        query: { projectId: 'project-1' },
      })
      const res = await GET(req, emptyCtx)
      expect(res.status).toBe(401)
    })

    it('returns 200 with runs list', async () => {
      const { GET } = await import('@/app/api/runs/route')
      const req = buildMockRequest({
        path: '/api/runs',
        method: 'GET',
        query: { projectId: 'project-1', limit: 10 },
      })
      const res = await GET(req, emptyCtx)
      expect(res.status).toBe(200)
      const body = (await res.json()) as { runs: unknown[] }
      expect(body.runs).toHaveLength(1)
      expect(listRunsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          projectId: 'project-1',
          limit: 10,
        }),
      )
    })

    it('passes optional filters through query params', async () => {
      const { GET } = await import('@/app/api/runs/route')
      const req = buildMockRequest({
        path: '/api/runs',
        method: 'GET',
        query: {
          projectId: 'project-1',
          workflowType: 'story_to_script_run',
          targetType: 'NovelPromotionEpisode',
          targetId: 'target-1',
          episodeId: 'episode-1',
        },
      })
      const res = await GET(req, emptyCtx)
      expect(res.status).toBe(200)
      expect(listRunsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowType: 'story_to_script_run',
          targetType: 'NovelPromotionEpisode',
          targetId: 'target-1',
          episodeId: 'episode-1',
        }),
      )
    })

    it('clamps limit between 1 and 200', async () => {
      const { GET } = await import('@/app/api/runs/route')
      const req = buildMockRequest({
        path: '/api/runs',
        method: 'GET',
        query: { limit: 500 },
      })
      await GET(req, emptyCtx)
      expect(listRunsMock).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 200 }),
      )
    })
  })

  // =========================================================================
  // 5b. POST /api/runs
  // =========================================================================
  describe('POST /api/runs', () => {
    it('returns 401 when unauthenticated', async () => {
      authState.authenticated = false
      const { POST } = await import('@/app/api/runs/route')
      const req = buildMockRequest({
        path: '/api/runs',
        method: 'POST',
        body: {
          projectId: 'project-1',
          workflowType: 'story_to_script_run',
          targetType: 'NovelPromotionEpisode',
          targetId: 'target-1',
        },
      })
      const res = await POST(req, emptyCtx)
      expect(res.status).toBe(401)
    })

    it('returns 400 when required fields are missing', async () => {
      const { POST } = await import('@/app/api/runs/route')
      const req = buildMockRequest({
        path: '/api/runs',
        method: 'POST',
        body: { projectId: 'project-1' },
      })
      const res = await POST(req, emptyCtx)
      expect(res.status).toBe(400)
    })

    it('returns 400 when body is not an object', async () => {
      const { POST } = await import('@/app/api/runs/route')
      const req = buildMockRequest({
        path: '/api/runs',
        method: 'POST',
        body: 'invalid',
      })
      const res = await POST(req, emptyCtx)
      expect(res.status).toBe(400)
    })

    it('returns 200 with created run on success', async () => {
      const { POST } = await import('@/app/api/runs/route')
      const req = buildMockRequest({
        path: '/api/runs',
        method: 'POST',
        body: {
          projectId: 'project-1',
          workflowType: 'story_to_script_run',
          targetType: 'NovelPromotionEpisode',
          targetId: 'target-1',
          episodeId: 'episode-1',
          input: { content: 'hello' },
        },
      })
      const res = await POST(req, emptyCtx)
      expect(res.status).toBe(200)
      const body = (await res.json()) as { success: boolean; runId: string; run: unknown }
      expect(body.success).toBe(true)
      expect(body.runId).toBe('run-new')
      expect(createRunMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          projectId: 'project-1',
          workflowType: 'story_to_script_run',
          targetType: 'NovelPromotionEpisode',
          targetId: 'target-1',
          episodeId: 'episode-1',
          input: { content: 'hello' },
        }),
      )
    })
  })

  // =========================================================================
  // 6. GET /api/runs/[runId]
  // =========================================================================
  describe('GET /api/runs/[runId]', () => {
    it('returns 401 when unauthenticated', async () => {
      authState.authenticated = false
      const { GET } = await import('@/app/api/runs/[runId]/route')
      const req = buildMockRequest({ path: '/api/runs/run-1', method: 'GET' })
      const res = await GET(req, { params: Promise.resolve({ runId: 'run-1' }) })
      expect(res.status).toBe(401)
    })

    it('returns 404 when run not found', async () => {
      getRunSnapshotMock.mockResolvedValueOnce(null)
      const { GET } = await import('@/app/api/runs/[runId]/route')
      const req = buildMockRequest({ path: '/api/runs/run-missing', method: 'GET' })
      const res = await GET(req, { params: Promise.resolve({ runId: 'run-missing' }) })
      expect(res.status).toBe(404)
    })

    it('returns 404 when run belongs to another user', async () => {
      getRunSnapshotMock.mockResolvedValueOnce({
        run: { ...baseRun, userId: 'other-user' },
        steps: [],
        artifacts: [],
        events: [],
      })
      const { GET } = await import('@/app/api/runs/[runId]/route')
      const req = buildMockRequest({ path: '/api/runs/run-1', method: 'GET' })
      const res = await GET(req, { params: Promise.resolve({ runId: 'run-1' }) })
      expect(res.status).toBe(404)
    })

    it('returns 200 with run snapshot', async () => {
      const { GET } = await import('@/app/api/runs/[runId]/route')
      const req = buildMockRequest({ path: '/api/runs/run-1', method: 'GET' })
      const res = await GET(req, { params: Promise.resolve({ runId: 'run-1' }) })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { run: { id: string } }
      expect(body.run.id).toBe('run-1')
    })
  })

  // =========================================================================
  // 7. POST /api/runs/[runId]/cancel
  // =========================================================================
  describe('POST /api/runs/[runId]/cancel', () => {
    it('returns 401 when unauthenticated', async () => {
      authState.authenticated = false
      const { POST } = await import('@/app/api/runs/[runId]/cancel/route')
      const req = buildMockRequest({ path: '/api/runs/run-1/cancel', method: 'POST' })
      const res = await POST(req, { params: Promise.resolve({ runId: 'run-1' }) } as RunRouteContext)
      expect(res.status).toBe(401)
    })

    it('returns 404 when run not found', async () => {
      getRunByIdMock.mockResolvedValueOnce(null)
      const { POST } = await import('@/app/api/runs/[runId]/cancel/route')
      const req = buildMockRequest({ path: '/api/runs/run-1/cancel', method: 'POST' })
      const res = await POST(req, { params: Promise.resolve({ runId: 'run-1' }) } as RunRouteContext)
      expect(res.status).toBe(404)
    })

    it('returns 404 when run belongs to another user', async () => {
      getRunByIdMock.mockResolvedValueOnce({ ...baseRun, userId: 'other-user' })
      const { POST } = await import('@/app/api/runs/[runId]/cancel/route')
      const req = buildMockRequest({ path: '/api/runs/run-1/cancel', method: 'POST' })
      const res = await POST(req, { params: Promise.resolve({ runId: 'run-1' }) } as RunRouteContext)
      expect(res.status).toBe(404)
    })

    it('returns 404 when requestRunCancel returns null', async () => {
      requestRunCancelMock.mockResolvedValueOnce(null)
      const { POST } = await import('@/app/api/runs/[runId]/cancel/route')
      const req = buildMockRequest({ path: '/api/runs/run-1/cancel', method: 'POST' })
      const res = await POST(req, { params: Promise.resolve({ runId: 'run-1' }) } as RunRouteContext)
      expect(res.status).toBe(404)
    })

    it('returns 200 and cancels run + task on success', async () => {
      const { POST } = await import('@/app/api/runs/[runId]/cancel/route')
      const req = buildMockRequest({ path: '/api/runs/run-1/cancel', method: 'POST' })
      const res = await POST(req, { params: Promise.resolve({ runId: 'run-1' }) } as RunRouteContext)
      expect(res.status).toBe(200)
      const body = (await res.json()) as { success: boolean; run: unknown }
      expect(body.success).toBe(true)
      expect(requestRunCancelMock).toHaveBeenCalledWith({
        runId: 'run-1',
        userId: 'user-1',
      })
      expect(cancelTaskMock).toHaveBeenCalledWith('task-1', 'Run cancelled by user')
      expect(publishRunEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: 'run-1',
          eventType: 'run.canceled',
          payload: { message: 'Run cancelled by user' },
        }),
      )
    })

    it('does not cancel task when cancelledRun has no taskId', async () => {
      requestRunCancelMock.mockResolvedValueOnce({
        ...baseRun,
        status: 'canceling',
        taskId: null,
      })
      const { POST } = await import('@/app/api/runs/[runId]/cancel/route')
      const req = buildMockRequest({ path: '/api/runs/run-1/cancel', method: 'POST' })
      const res = await POST(req, { params: Promise.resolve({ runId: 'run-1' }) } as RunRouteContext)
      expect(res.status).toBe(200)
      expect(cancelTaskMock).not.toHaveBeenCalled()
    })

    it('does not publish run event when status is not canceling or canceled', async () => {
      requestRunCancelMock.mockResolvedValueOnce({
        ...baseRun,
        status: 'completed',
        taskId: null,
      })
      const { POST } = await import('@/app/api/runs/[runId]/cancel/route')
      const req = buildMockRequest({ path: '/api/runs/run-1/cancel', method: 'POST' })
      await POST(req, { params: Promise.resolve({ runId: 'run-1' }) } as RunRouteContext)
      expect(publishRunEventMock).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // 8. GET /api/runs/[runId]/events
  // =========================================================================
  describe('GET /api/runs/[runId]/events', () => {
    it('returns 401 when unauthenticated', async () => {
      authState.authenticated = false
      const { GET } = await import('@/app/api/runs/[runId]/events/route')
      const req = buildMockRequest({ path: '/api/runs/run-1/events', method: 'GET' })
      const res = await GET(req, { params: Promise.resolve({ runId: 'run-1' }) })
      expect(res.status).toBe(401)
    })

    it('returns 200 with events list', async () => {
      const mockEvents = [
        { id: 'ev-1', runId: 'run-1', eventType: 'run.start', seq: 1 },
      ]
      listRunEventsAfterSeqMock.mockResolvedValueOnce(mockEvents)
      const { GET } = await import('@/app/api/runs/[runId]/events/route')
      const req = buildMockRequest({
        path: '/api/runs/run-1/events',
        method: 'GET',
        query: { afterSeq: 0, limit: 100 },
      })
      const res = await GET(req, { params: Promise.resolve({ runId: 'run-1' }) })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { runId: string; afterSeq: number; events: unknown[] }
      expect(body.runId).toBe('run-1')
      expect(body.afterSeq).toBe(0)
      expect(body.events).toHaveLength(1)
    })

    it('passes userId for ownership filtering', async () => {
      listRunEventsAfterSeqMock.mockResolvedValueOnce([])
      const { GET } = await import('@/app/api/runs/[runId]/events/route')
      const req = buildMockRequest({
        path: '/api/runs/run-1/events',
        method: 'GET',
        query: { afterSeq: 5 },
      })
      await GET(req, { params: Promise.resolve({ runId: 'run-1' }) })
      expect(listRunEventsAfterSeqMock).toHaveBeenCalledWith({
        runId: 'run-1',
        userId: 'user-1',
        afterSeq: 5,
        limit: 200,
      })
    })

    it('clamps limit between 1 and 2000', async () => {
      listRunEventsAfterSeqMock.mockResolvedValueOnce([])
      const { GET } = await import('@/app/api/runs/[runId]/events/route')
      const req = buildMockRequest({
        path: '/api/runs/run-1/events',
        method: 'GET',
        query: { limit: 9999 },
      })
      await GET(req, { params: Promise.resolve({ runId: 'run-1' }) })
      expect(listRunEventsAfterSeqMock).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 2000 }),
      )
    })

    it('defaults afterSeq to 0 and limit to 200', async () => {
      listRunEventsAfterSeqMock.mockResolvedValueOnce([])
      const { GET } = await import('@/app/api/runs/[runId]/events/route')
      const req = buildMockRequest({ path: '/api/runs/run-1/events', method: 'GET' })
      await GET(req, { params: Promise.resolve({ runId: 'run-1' }) })
      expect(listRunEventsAfterSeqMock).toHaveBeenCalledWith(
        expect.objectContaining({ afterSeq: 0, limit: 200 }),
      )
    })
  })

  // =========================================================================
  // 9. POST /api/runs/[runId]/steps/[stepKey]/retry
  // =========================================================================
  describe('POST /api/runs/[runId]/steps/[stepKey]/retry', () => {
    it('returns 401 when unauthenticated', async () => {
      authState.authenticated = false
      const { POST } = await import('@/app/api/runs/[runId]/steps/[stepKey]/retry/route')
      const req = buildMockRequest({
        path: '/api/runs/run-1/steps/step-1/retry',
        method: 'POST',
        body: {},
      })
      const res = await POST(req, {
        params: Promise.resolve({ runId: 'run-1', stepKey: 'step-1' }),
      } as RunStepRetryContext)
      expect(res.status).toBe(401)
    })

    it('returns 404 when run not found', async () => {
      getRunByIdMock.mockResolvedValueOnce(null)
      const { POST } = await import('@/app/api/runs/[runId]/steps/[stepKey]/retry/route')
      const req = buildMockRequest({
        path: '/api/runs/run-1/steps/step-1/retry',
        method: 'POST',
        body: {},
      })
      const res = await POST(req, {
        params: Promise.resolve({ runId: 'run-1', stepKey: 'step-1' }),
      } as RunStepRetryContext)
      expect(res.status).toBe(404)
    })

    it('returns 404 when run belongs to another user', async () => {
      getRunByIdMock.mockResolvedValueOnce({ ...baseRun, userId: 'other-user' })
      const { POST } = await import('@/app/api/runs/[runId]/steps/[stepKey]/retry/route')
      const req = buildMockRequest({
        path: '/api/runs/run-1/steps/step-1/retry',
        method: 'POST',
        body: {},
      })
      const res = await POST(req, {
        params: Promise.resolve({ runId: 'run-1', stepKey: 'step-1' }),
      } as RunStepRetryContext)
      expect(res.status).toBe(404)
    })

    it('returns 404 when retryFailedStep throws RUN_STEP_NOT_FOUND', async () => {
      retryFailedStepMock.mockRejectedValueOnce(new Error('RUN_STEP_NOT_FOUND'))
      const { POST } = await import('@/app/api/runs/[runId]/steps/[stepKey]/retry/route')
      const req = buildMockRequest({
        path: '/api/runs/run-1/steps/step-1/retry',
        method: 'POST',
        body: {},
      })
      const res = await POST(req, {
        params: Promise.resolve({ runId: 'run-1', stepKey: 'step-1' }),
      } as RunStepRetryContext)
      expect(res.status).toBe(404)
    })

    it('returns 400 when step is not in failed status', async () => {
      retryFailedStepMock.mockRejectedValueOnce(new Error('RUN_STEP_NOT_FAILED'))
      const { POST } = await import('@/app/api/runs/[runId]/steps/[stepKey]/retry/route')
      const req = buildMockRequest({
        path: '/api/runs/run-1/steps/step-1/retry',
        method: 'POST',
        body: {},
      })
      const res = await POST(req, {
        params: Promise.resolve({ runId: 'run-1', stepKey: 'step-1' }),
      } as RunStepRetryContext)
      expect(res.status).toBe(400)
    })

    it('returns 400 when task type is not retry-supported', async () => {
      getRunByIdMock.mockResolvedValueOnce({
        ...baseRun,
        workflowType: 'unsupported_workflow',
        taskType: null,
      })
      const { POST } = await import('@/app/api/runs/[runId]/steps/[stepKey]/retry/route')
      const req = buildMockRequest({
        path: '/api/runs/run-1/steps/step-1/retry',
        method: 'POST',
        body: {},
      })
      const res = await POST(req, {
        params: Promise.resolve({ runId: 'run-1', stepKey: 'step-1' }),
      } as RunStepRetryContext)
      expect(res.status).toBe(400)
    })

    it('returns 200 and submits retry task on success', async () => {
      const { POST } = await import('@/app/api/runs/[runId]/steps/[stepKey]/retry/route')
      const req = buildMockRequest({
        path: '/api/runs/run-1/steps/step-1/retry',
        method: 'POST',
        body: { reason: 'user retry' },
      })
      const res = await POST(req, {
        params: Promise.resolve({ runId: 'run-1', stepKey: 'step-1' }),
      } as RunStepRetryContext)
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        success: boolean
        runId: string
        stepKey: string
        retryAttempt: number
        taskId: string
        async: boolean
      }
      expect(body.success).toBe(true)
      expect(body.runId).toBe('run-1')
      expect(body.stepKey).toBe('step-1')
      expect(body.retryAttempt).toBe(2)
      expect(body.taskId).toBe('task-retry-1')
      expect(body.async).toBe(true)
      expect(submitTaskMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          projectId: 'project-1',
          type: 'story_to_script_run',
          targetType: 'NovelPromotionEpisode',
          targetId: 'target-1',
        }),
      )
    })

    it('passes modelOverride through payload when provided', async () => {
      const { POST } = await import('@/app/api/runs/[runId]/steps/[stepKey]/retry/route')
      const req = buildMockRequest({
        path: '/api/runs/run-1/steps/step-1/retry',
        method: 'POST',
        body: { modelOverride: 'gpt-4o' },
      })
      await POST(req, {
        params: Promise.resolve({ runId: 'run-1', stepKey: 'step-1' }),
      } as RunStepRetryContext)
      expect(submitTaskMock).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            model: 'gpt-4o',
            analysisModel: 'gpt-4o',
          }),
        }),
      )
    })

    it('returns 404 when retryFailedStep returns null', async () => {
      retryFailedStepMock.mockResolvedValueOnce(null)
      const { POST } = await import('@/app/api/runs/[runId]/steps/[stepKey]/retry/route')
      const req = buildMockRequest({
        path: '/api/runs/run-1/steps/step-1/retry',
        method: 'POST',
        body: {},
      })
      const res = await POST(req, {
        params: Promise.resolve({ runId: 'run-1', stepKey: 'step-1' }),
      } as RunStepRetryContext)
      expect(res.status).toBe(404)
    })
  })

  // =========================================================================
  // 10. GET /api/sse
  // =========================================================================
  describe('GET /api/sse', () => {
    it('returns 400 when projectId is missing', async () => {
      const { GET } = await import('@/app/api/sse/route')
      const req = buildMockRequest({ path: '/api/sse', method: 'GET' })
      const res = await GET(req, emptyCtx)
      expect(res.status).toBe(400)
    })

    it('returns 401 when unauthenticated', async () => {
      authState.authenticated = false
      const { GET } = await import('@/app/api/sse/route')
      const req = buildMockRequest({
        path: '/api/sse',
        method: 'GET',
        query: { projectId: 'project-1' },
      })
      const res = await GET(req, emptyCtx)
      expect(res.status).toBe(401)
    })

    it('returns SSE streaming response with correct headers', async () => {
      listEventsAfterMock.mockResolvedValueOnce([])
      const { GET } = await import('@/app/api/sse/route')
      const req = buildMockRequest({
        path: '/api/sse',
        method: 'GET',
        query: { projectId: 'project-1' },
        headers: { 'last-event-id': '5' },
      })
      const res = await GET(req, emptyCtx)
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('text/event-stream')
      expect(res.headers.get('cache-control')).toBe('no-cache, no-transform')
      expect(res.headers.get('connection')).toBe('keep-alive')
      expect(res.headers.get('x-accel-buffering')).toBe('no')
    })

    it('replays missed events when last-event-id is provided', async () => {
      const replayEvent = {
        id: '6',
        type: 'task.lifecycle',
        taskId: 'task-1',
        projectId: 'project-1',
        userId: 'user-1',
        ts: new Date().toISOString(),
        taskType: 'IMAGE_CHARACTER',
        targetType: 'CharacterAppearance',
        targetId: 'appearance-1',
        episodeId: null,
        payload: { lifecycleType: 'task.created' },
      }
      listEventsAfterMock.mockResolvedValueOnce([replayEvent])

      const { GET } = await import('@/app/api/sse/route')
      const req = buildMockRequest({
        path: '/api/sse',
        method: 'GET',
        query: { projectId: 'project-1' },
        headers: { 'last-event-id': '5' },
      })
      const res = await GET(req, emptyCtx)
      expect(res.status).toBe(200)
      expect(listEventsAfterMock).toHaveBeenCalledWith('project-1', 5, 5000)

      const reader = res.body?.getReader()
      expect(reader).toBeTruthy()
      const firstChunk = await reader!.read()
      expect(firstChunk.done).toBe(false)
      const decoded = new TextDecoder().decode(firstChunk.value)
      expect(decoded).toContain('event:')
      expect(decoded).toContain('task.lifecycle')
      await reader!.cancel()
    })

    it('subscribes to channel and forwards real-time messages', async () => {
      listEventsAfterMock.mockResolvedValueOnce([])

      const { GET } = await import('@/app/api/sse/route')
      const req = buildMockRequest({
        path: '/api/sse',
        method: 'GET',
        query: { projectId: 'project-1' },
        headers: { 'last-event-id': '10' },
      })
      const res = await GET(req, emptyCtx)
      expect(res.status).toBe(200)
      expect(addChannelListenerMock).toHaveBeenCalledWith(
        'project:project-1',
        expect.any(Function),
      )

      const listener = subscriberState.listener
      expect(listener).toBeTruthy()

      listener!(
        JSON.stringify({
          id: '11',
          type: 'task.lifecycle',
          taskId: 'task-1',
          projectId: 'project-1',
          userId: 'user-1',
          ts: new Date().toISOString(),
          payload: { lifecycleType: 'task.processing' },
        }),
      )

      const reader = res.body?.getReader()
      expect(reader).toBeTruthy()
      const chunk = await reader!.read()
      const decoded = new TextDecoder().decode(chunk.value)
      expect(decoded).toContain('task.processing')
      await reader!.cancel()
    })

    it('returns body as readable stream', async () => {
      listEventsAfterMock.mockResolvedValueOnce([])
      const { GET } = await import('@/app/api/sse/route')
      const req = buildMockRequest({
        path: '/api/sse',
        method: 'GET',
        query: { projectId: 'project-1' },
        headers: { 'last-event-id': '1' },
      })
      const res = await GET(req, emptyCtx)
      expect(res.body).toBeInstanceOf(ReadableStream)
      const reader = res.body?.getReader()
      await reader?.cancel()
    })

    it('uses requireUserAuth for global-asset-hub projectId', async () => {
      listEventsAfterMock.mockResolvedValueOnce([])
      const { GET } = await import('@/app/api/sse/route')
      const req = buildMockRequest({
        path: '/api/sse',
        method: 'GET',
        query: { projectId: 'global-asset-hub' },
        headers: { 'last-event-id': '0' },
      })
      const res = await GET(req, emptyCtx)
      expect(res.status).toBe(200)
    })
  })
})
