import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ASSET_STATUS } from '@/lib/agent-pipeline/types'

// Mock prisma before importing registry
vi.mock('@/lib/prisma', () => ({
  prisma: {
    novelPromotionCharacter: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    novelPromotionLocation: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
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
  getLocationAssets,
  getOrCreateStyleProfile,
  lockAsset,
  updatePromptFragment,
} from '@/lib/agent-pipeline/asset-layer/registry'

const mockPrisma = prisma as unknown as {
  novelPromotionCharacter: {
    findMany: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  novelPromotionLocation: {
    findMany: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  styleProfile: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
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
    expect(result[0].appearance).toBe('red hair')
    expect(result[0].imageUrl).toBe('http://img/1')
    expect(result[0].promptFragment).toBe('a young woman with red hair')
    expect(result[0].assetStatus).toBe('draft')
  })

  it('getCharacterAssets handles empty appearances', async () => {
    mockPrisma.novelPromotionCharacter.findMany.mockResolvedValue([
      {
        id: 'char-2',
        name: 'Bob',
        aliases: null,
        promptFragment: null,
        assetStatus: 'draft',
        appearances: [],
      },
    ])

    const result = await getCharacterAssets('proj-1')
    expect(result[0].appearance).toBeNull()
    expect(result[0].imageUrl).toBeNull()
  })

  it('getLocationAssets maps DB rows to LocationAssetRef', async () => {
    mockPrisma.novelPromotionLocation.findMany.mockResolvedValue([
      {
        id: 'loc-1',
        name: 'Forest',
        summary: 'A dark forest',
        promptFragment: 'dark forest with tall trees',
        assetStatus: 'locked',
        selectedImage: { imageUrl: 'http://img/forest' },
      },
    ])

    const result = await getLocationAssets('proj-1')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Forest')
    expect(result[0].imageUrl).toBe('http://img/forest')
    expect(result[0].assetStatus).toBe('locked')
  })

  it('updatePromptFragment throws when atomic update matches 0 rows (locked)', async () => {
    mockPrisma.novelPromotionCharacter.updateMany.mockResolvedValue({ count: 0 })

    await expect(
      updatePromptFragment('character', 'char-1', 'new fragment'),
    ).rejects.toThrow('locked or not found')
  })

  it('updatePromptFragment succeeds for unlocked asset', async () => {
    mockPrisma.novelPromotionCharacter.updateMany.mockResolvedValue({ count: 1 })

    await updatePromptFragment('character', 'char-1', 'new fragment')
    expect(mockPrisma.novelPromotionCharacter.updateMany).toHaveBeenCalledWith({
      where: { id: 'char-1', assetStatus: { not: ASSET_STATUS.LOCKED } },
      data: { promptFragment: 'new fragment' },
    })
  })

  it('lockAsset sets assetStatus to locked', async () => {
    mockPrisma.novelPromotionCharacter.update.mockResolvedValue({})

    await lockAsset('character', 'char-1')
    expect(mockPrisma.novelPromotionCharacter.update).toHaveBeenCalledWith({
      where: { id: 'char-1' },
      data: { assetStatus: ASSET_STATUS.LOCKED },
    })
  })

  it('getOrCreateStyleProfile returns existing profile', async () => {
    mockPrisma.styleProfile.findUnique.mockResolvedValue({
      artStyle: 'anime',
      stylePrefix: 'anime style',
      negativePrompt: 'ugly',
      colorPalette: null,
    })

    const result = await getOrCreateStyleProfile('proj-1', {
      artStyle: 'default',
      stylePrefix: 'default',
      negativePrompt: 'default',
      colorPalette: null,
    })
    expect(result.artStyle).toBe('anime')
    expect(mockPrisma.styleProfile.create).not.toHaveBeenCalled()
  })

  it('getOrCreateStyleProfile creates when not found', async () => {
    mockPrisma.styleProfile.findUnique.mockResolvedValue(null)
    mockPrisma.styleProfile.create.mockResolvedValue({
      artStyle: 'anime',
      stylePrefix: 'anime style',
      negativePrompt: 'ugly',
      colorPalette: null,
    })

    const defaults = {
      artStyle: 'anime',
      stylePrefix: 'anime style',
      negativePrompt: 'ugly',
      colorPalette: null,
    }
    const result = await getOrCreateStyleProfile('proj-1', defaults)
    expect(result.artStyle).toBe('anime')
    expect(mockPrisma.styleProfile.create).toHaveBeenCalled()
  })
})
