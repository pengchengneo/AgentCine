import { describe, expect, it } from 'vitest'
import { composeImagePrompt } from '@/lib/agent-pipeline/asset-layer/prompt-composer'

describe('prompt-composer', () => {
  it('composes full prompt from all parts', () => {
    const result = composeImagePrompt({
      stylePrefix: 'american comic style, bold outlines',
      characterFragments: ['a tall man with blue eyes, short black hair'],
      locationFragment: 'dark alley at night, neon signs',
      shotDescription: 'close-up, low angle',
      actionDescription: 'character draws sword',
    })

    expect(result).toBe(
      'american comic style, bold outlines, a tall man with blue eyes, short black hair, dark alley at night, neon signs, close-up, low angle, character draws sword',
    )
  })

  it('handles missing optional parts', () => {
    const result = composeImagePrompt({
      stylePrefix: 'anime style',
      characterFragments: [],
      locationFragment: null,
      shotDescription: 'wide shot',
      actionDescription: null,
    })

    expect(result).toBe('anime style, wide shot')
  })

  it('joins multiple character fragments', () => {
    const result = composeImagePrompt({
      stylePrefix: 'comic',
      characterFragments: ['man with sword', 'woman in red dress'],
      locationFragment: 'castle',
      shotDescription: 'medium shot',
      actionDescription: 'facing each other',
    })

    expect(result).toContain('man with sword')
    expect(result).toContain('woman in red dress')
  })

  it('trims whitespace from all parts', () => {
    const result = composeImagePrompt({
      stylePrefix: '  comic style  ',
      characterFragments: ['  hero  '],
      locationFragment: '  forest  ',
      shotDescription: '  wide  ',
      actionDescription: '  running  ',
    })

    expect(result).not.toMatch(/  /)
    expect(result).toBe('comic style, hero, forest, wide, running')
  })
})
