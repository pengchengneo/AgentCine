const NODE_WIDTH = 160
const NODE_HEIGHT = 140
const NODE_GAP = 100
const HORIZONTAL_SPACING = NODE_WIDTH + NODE_GAP

export function calculateNodePositions(nodeCount: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = []
  for (let i = 0; i < nodeCount; i++) {
    positions.push({ x: i * HORIZONTAL_SPACING, y: 0 })
  }
  return positions
}

export { NODE_WIDTH, NODE_HEIGHT }
