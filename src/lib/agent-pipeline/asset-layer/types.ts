import type { AssetStatus } from '../types'

export type CharacterAssetRef = {
  id: string
  name: string
  aliases: string | null
  appearance: string | null // from CharacterAppearance.description
  imageUrl: string | null   // from CharacterAppearance.imageUrl
  promptFragment: string | null
  assetStatus: AssetStatus
}

export type LocationAssetRef = {
  id: string
  name: string
  summary: string | null
  imageUrl: string | null   // from selected LocationImage
  promptFragment: string | null
  assetStatus: AssetStatus
}

export type StyleProfileData = {
  artStyle: string
  stylePrefix: string
  negativePrompt: string
  colorPalette: string | null
}
