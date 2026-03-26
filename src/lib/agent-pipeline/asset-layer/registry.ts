import { prisma } from '@/lib/prisma'
import { ASSET_STATUS } from '../types'
import type { AssetStatus } from '../types'
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
    assetStatus: c.assetStatus as AssetStatus,
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
    assetStatus: l.assetStatus as AssetStatus,
  }))
}

export async function updatePromptFragment(
  type: 'character' | 'location',
  id: string,
  promptFragment: string,
): Promise<void> {
  if (type === 'character') {
    const result = await prisma.novelPromotionCharacter.updateMany({
      where: { id, assetStatus: { not: ASSET_STATUS.LOCKED } },
      data: { promptFragment },
    })
    if (result.count === 0) {
      throw new Error(`Character ${id} is locked or not found, cannot update promptFragment`)
    }
  } else {
    const result = await prisma.novelPromotionLocation.updateMany({
      where: { id, assetStatus: { not: ASSET_STATUS.LOCKED } },
      data: { promptFragment },
    })
    if (result.count === 0) {
      throw new Error(`Location ${id} is locked or not found, cannot update promptFragment`)
    }
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
