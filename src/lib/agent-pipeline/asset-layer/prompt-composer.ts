export type ComposeImagePromptInput = {
  stylePrefix: string
  characterFragments: string[]
  locationFragment: string | null
  shotDescription: string | null
  actionDescription: string | null
}

export function composeImagePrompt(input: ComposeImagePromptInput): string {
  const parts: string[] = []

  const style = input.stylePrefix.trim()
  if (style) parts.push(style)

  for (const fragment of input.characterFragments) {
    const trimmed = fragment.trim()
    if (trimmed) parts.push(trimmed)
  }

  const location = input.locationFragment?.trim()
  if (location) parts.push(location)

  const shot = input.shotDescription?.trim()
  if (shot) parts.push(shot)

  const action = input.actionDescription?.trim()
  if (action) parts.push(action)

  return parts.join(', ')
}
