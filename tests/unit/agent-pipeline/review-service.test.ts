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
