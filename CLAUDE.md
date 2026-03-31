# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgentCine is an AI-powered filmmaking platform built with Next.js 15 + React 19. It orchestrates text-to-video production: novel text analysis, character/location asset generation, storyboard creation, voice synthesis, and video generation. It is a **multi-process application** — not a simple web app.

## Development Commands

```bash
# Development (starts Next.js + BullMQ Worker + Watchdog + Bull Board concurrently)
npm run dev

# Build
npm run build    # runs prisma generate && next build

# Lint
npm run lint

# Tests
npm run test:unit:all              # All unit tests
npm run test:billing               # Billing tests with coverage (80% threshold)
npm run test:integration:api       # API integration tests
npm run test:integration:chain     # Chain integration tests
npm run test:behavior:full         # Full behavioral test suite
npm run test:regression            # Full regression (guards + unit + integration)
npm run test:guards                # Architectural guard scripts

# Run a single test file
cross-env BILLING_TEST_BOOTSTRAP=0 vitest run tests/unit/path/to/test.ts

# Database
npx prisma db push                 # Sync schema to database
npx prisma generate                # Regenerate Prisma client
```

**Test environment:** Set `BILLING_TEST_BOOTSTRAP=0` for unit tests, `BILLING_TEST_BOOTSTRAP=1` for integration/concurrency tests. Tests block outbound HTTP by default.

## Architecture

### Multi-Process Runtime

`npm run dev` launches 4 processes via `concurrently`:
- **Next.js** (Turbopack) — pages + API routes
- **BullMQ Worker** (`src/lib/workers/index.ts`) — consumes image/video/voice/text queues
- **Watchdog** (`scripts/watchdog.ts`) — task heartbeat and anomaly detection
- **Bull Board** (`scripts/bull-board.ts`) — queue admin UI on port 3010

Infrastructure: MySQL 8.0 + Redis 7 + MinIO (start with `docker compose up mysql redis minio -d`).

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

### Key Directory Layout

- `src/app/[locale]/` — i18n-prefixed pages (zh/en) using `next-intl`
- `src/app/api/` — Next.js App Router API routes
- `src/app/api/novel-promotion/[projectId]/` — Core creation pipeline (~70+ endpoints)
- `src/lib/workers/handlers/` — ~48 BullMQ task handler files
- `src/lib/task/` — Task lifecycle: queues, submitter, publisher, service
- `src/lib/llm/` — LLM abstraction (chat-completion, streaming, vision)
- `src/lib/model-gateway/` — OpenAI-compatible model routing to multiple providers
- `src/lib/storage/` — Object storage factory (MinIO/S3, Local, COS providers)
- `src/lib/billing/` — Cost tracking with freeze/thaw, ledger, balance management
- `src/lib/generators/` — AI content generators (image, audio, video)
- `src/lib/query/` — TanStack Query hooks + mutations + query keys
- `src/lib/agent/` — Conversational agent framework (observe/think/act/reflect loop)
- `src/lib/agent-pipeline/` — Deterministic graph-based pipeline orchestration
- `src/lib/run-runtime/` — Graph execution engine with LangGraph integration
- `src/lib/media/` — Media management, outbound image handling, URL signing
- `prisma/schema.prisma` — Database schema (~35+ models, ~1049 lines)
- `scripts/guards/` — ~27 architectural guard scripts enforcing code patterns
- `messages/` — i18n translation files (~31 namespaces per locale)
- `standards/` — Capability + pricing catalogs, prompt canaries

### Two Agent Systems

**1. Agent Sessions** (`src/lib/agent/`) — LLM-driven conversational agent:
- Observe/think/act/reflect loop where the LLM decides each step
- DirectorAgent is the only implemented agent (others are Phase 4 stubs)
- Uses Redis pub/sub event bus + WebSocket for real-time updates
- Skills wrap BullMQ task handlers with submit-and-wait pattern
- Three-layer memory: ShortTermMemory (in-memory), LongTermMemory (Prisma), EpisodicMemory (Prisma)
- API: `/api/agent/sessions`

**2. Agent Pipeline** (`src/lib/agent-pipeline/`) — Deterministic sequential graph:
- Fixed execution order: ScriptAgent → ArtDirectorAgent → StoryboardAgent → ProducerQualityCheck
- Uses LangGraph `StateGraph` for orchestration
- Task waiting via DB polling (2s interval, 15min timeout)
- Quality review with vision-model consistency scoring
- API: `/api/novel-promotion/[projectId]/pipeline/start`

Both systems submit the same BullMQ tasks for actual AI work.

### Task Queue System

Four BullMQ queues: `waoowaoo-image`, `waoowaoo-video`, `waoowaoo-voice`, `waoowaoo-text`. Tasks use exponential backoff with 5 retry attempts. Real-time updates flow through SSE (`/api/sse`) via Redis pub/sub.

### State Management

- **Server state:** TanStack Query v5 with centralized query keys (`src/lib/query/keys.ts`)
- **Auth:** NextAuth.js with `SessionProvider`
- **UI state:** React contexts (ToastContext); no Redux/Zustand
- **Provider hierarchy:** `SessionProvider` > `QueryProvider` > `ToastProvider`

### Database

MySQL with Prisma ORM. Singleton client at `src/lib/prisma.ts`. Content hierarchy: Project → Episode → Clip → Storyboard → Panel → Shot/VoiceLine.

### Styling

Tailwind CSS v4 configured via CSS imports (no JS config file). Design tokens in `src/styles/ui-tokens-glass.css` and `src/styles/ui-semantic-glass.css`.

## Code Conventions

### Icon Usage (ESLint enforced)

Never import directly from `lucide-react`. Always import through `@/components/ui/icons`:
```typescript
// Wrong: import { Camera } from 'lucide-react'
// Right: import { AppIcon } from '@/components/ui/icons'
```
No inline `<svg>` elements — use `AppIcon` or the icons module.

### Architectural Guards

Guard scripts in `scripts/guards/` enforce patterns at CI/commit time:
- No direct LLM calls from API routes (must go through `src/lib/llm/`)
- No hardcoded model capabilities (must use capability catalog)
- No model key downgrades
- File line count limits
- Test coverage requirements for routes and task types
- Prompt i18n regression checks

Run `npm run test:guards` before submitting PRs.

### API Route Pattern

API routes use Next.js App Router `route.ts` with exported HTTP method functions. The novel-promotion routes are nested under `[projectId]` for project scoping.

### Task Handler Pattern

Task handlers in `src/lib/workers/handlers/` follow a consistent pattern: receive task parameters, call generators/LLM services, store results via Prisma, and update media references.
