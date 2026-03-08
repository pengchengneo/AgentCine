import { logDebug as _ulogDebug, logError as _ulogError } from '@/lib/logging/core'
import Redis from 'ioredis'

type RedisSingleton = {
  app?: Redis
  queue?: Redis
}

const globalForRedis = globalThis as typeof globalThis & {
  __waoowaooRedis?: RedisSingleton
}

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1'
const REDIS_PORT = Number.parseInt(process.env.REDIS_PORT || '6379', 10) || 6379
const REDIS_USERNAME = process.env.REDIS_USERNAME
const REDIS_PASSWORD = process.env.REDIS_PASSWORD
const REDIS_TLS = process.env.REDIS_TLS === 'true'
const IS_TEST_ENV = process.env.NODE_ENV === 'test'

// 强制判断是否处于 Next.js 构建阶段
const IS_BUILD_PHASE = process.env.NEXT_PHASE === 'phase-production-build' || 
                       process.env.IS_BUILDING === 'true';

function buildBaseConfig() {
  return {
    host: REDIS_HOST,
    port: REDIS_PORT,
    username: REDIS_USERNAME,
    password: REDIS_PASSWORD,
    tls: REDIS_TLS ? {} : undefined,
    enableReadyCheck: !IS_BUILD_PHASE,
    lazyConnect: IS_TEST_ENV || IS_BUILD_PHASE,
    retryStrategy(times: number) {
      if (IS_BUILD_PHASE) return null; // 构建阶段不重试
      return Math.min(2 ** Math.min(times, 10) * 100, 30_000)
    },
  }
}

// 构建阶段的 Mock 对象，防止任何连接尝试
function createMockRedis() {
  const mock = new Proxy({}, {
    get: () => () => Promise.resolve(null),
  })
  return mock as unknown as Redis
}

function onConnectLog(scope: string, client: Redis) {
  if (IS_BUILD_PHASE) return;
  client.on('connect', () => _ulogDebug(`[Redis:${scope}] connected ${REDIS_HOST}:${REDIS_PORT}`))
  client.on('error', (err) => _ulogError(`[Redis:${scope}] error:`, err.message))
}

function createAppRedis() {
  if (IS_BUILD_PHASE) return createMockRedis();
  const client = new Redis({
    ...buildBaseConfig(),
    maxRetriesPerRequest: 2,
  })
  onConnectLog('app', client)
  return client
}

function createQueueRedis() {
  if (IS_BUILD_PHASE) return createMockRedis();
  const client = new Redis({
    ...buildBaseConfig(),
    maxRetriesPerRequest: null,
  })
  onConnectLog('queue', client)
  return client
}

const singleton = globalForRedis.__waoowaooRedis || {}
if (!globalForRedis.__waoowaooRedis) {
  globalForRedis.__waoowaooRedis = singleton
}

export const redis = singleton.app || (singleton.app = createAppRedis())
export const queueRedis = singleton.queue || (singleton.queue = createQueueRedis())

export function createSubscriber() {
  if (IS_BUILD_PHASE) return createMockRedis();
  const client = new Redis({
    ...buildBaseConfig(),
    maxRetriesPerRequest: null,
  })
  onConnectLog('sub', client)
  return client
}
