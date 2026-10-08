import type { Edge, HexTile, Resource, Terrain, Vertex } from './types'

const HEX_SIZE = 54
const SQRT3 = Math.sqrt(3)

/** Standard Catan axial layout (center at 0,0). */
const HEX_COORDS: Array<[number, number]> = [
  [0, -2],
  [1, -2],
  [2, -2],
  [-1, -1],
  [0, -1],
  [1, -1],
  [2, -1],
  [-2, 0],
  [-1, 0],
  [0, 0],
  [1, 0],
  [2, 0],
  [-2, 1],
  [-1, 1],
  [0, 1],
  [1, 1],
  [-2, 2],
  [-1, 2],
  [0, 2],
]

const TERRAIN_BAG: Terrain[] = [
  'aiPrairie',
  'aiPrairie',
  'aiPrairie',
  'aiPrairie',
  'codeForest',
  'codeForest',
  'codeForest',
  'codeForest',
  'factoryHills',
  'factoryHills',
  'factoryHills',
  'secureMountains',
  'secureMountains',
  'secureMountains',
  'robotPasture',
  'robotPasture',
  'robotPasture',
  'robotPasture',
  'deadZone',
]

const NUMBER_BAG = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function axialToPixel(q: number, r: number): { x: number; y: number } {
  return {
    x: HEX_SIZE * SQRT3 * (q + r / 2),
    y: HEX_SIZE * (3 / 2) * r,
  }
}

function hexCorner(cx: number, cy: number, i: number): { x: number; y: number } {
  const angle = ((60 * i - 30) * Math.PI) / 180
  return {
    x: cx + HEX_SIZE * Math.cos(angle),
    y: cy + HEX_SIZE * Math.sin(angle),
  }
}

function keyPoint(x: number, y: number): string {
  return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`
}

const PORT_DEFS: Array<{
  vertexHint: [number, number]
  ratio: 2 | 3
  resource: Resource | 'any'
}> = [
  { vertexHint: [0, -2], ratio: 3, resource: 'any' },
  { vertexHint: [2, -2], ratio: 2, resource: 'tokens' },
  { vertexHint: [2, 0], ratio: 2, resource: 'commits' },
  { vertexHint: [1, 1], ratio: 3, resource: 'any' },
  { vertexHint: [-1, 2], ratio: 2, resource: 'widgets' },
  { vertexHint: [-2, 1], ratio: 3, resource: 'any' },
  { vertexHint: [-2, 0], ratio: 2, resource: 'patches' },
  { vertexHint: [-1, -1], ratio: 2, resource: 'signals' },
  { vertexHint: [1, -2], ratio: 3, resource: 'any' },
]

export interface BoardData {
  hexes: HexTile[]
  vertices: Vertex[]
  edges: Edge[]
  projectorHexId: number
}

export function createBoard(seed = Math.random()): BoardData {
  let s = seed
  const rng = () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }

  const terrains = shuffle(TERRAIN_BAG, rng)
  const numbers = shuffle(NUMBER_BAG, rng)
  let numberIdx = 0

  const vertexMap = new Map<string, number>()
  const vertices: Vertex[] = []
  const edgeSet = new Map<string, Edge>()
  const hexes: HexTile[] = []
  let projectorHexId = 0

  HEX_COORDS.forEach(([q, r], hexId) => {
    const { x: cx, y: cy } = axialToPixel(q, r)
    const terrain = terrains[hexId]
    const number = terrain === 'deadZone' ? null : numbers[numberIdx++]
    if (terrain === 'deadZone') projectorHexId = hexId

    const vertexIds: number[] = []
    const cornerPts: { x: number; y: number }[] = []

    for (let i = 0; i < 6; i++) {
      const p = hexCorner(cx, cy, i)
      cornerPts.push(p)
      const k = keyPoint(p.x, p.y)
      let vid = vertexMap.get(k)
      if (vid === undefined) {
        vid = vertices.length
        vertexMap.set(k, vid)
        vertices.push({ id: vid, x: p.x, y: p.y, hexIds: [] })
      }
      vertices[vid].hexIds.push(hexId)
      vertexIds.push(vid)
    }

    for (let i = 0; i < 6; i++) {
      const a = vertexIds[i]
      const b = vertexIds[(i + 1) % 6]
      const ek = a < b ? `${a}-${b}` : `${b}-${a}`
      if (!edgeSet.has(ek)) {
        edgeSet.set(ek, { id: edgeSet.size, a: Math.min(a, b), b: Math.max(a, b) })
      }
    }

    hexes.push({ id: hexId, q, r, terrain, number, vertexIds })
  })

  // Assign ports to a corner vertex of the hinted coastal hex
  for (const port of PORT_DEFS) {
    const hex = hexes.find((h) => h.q === port.vertexHint[0] && h.r === port.vertexHint[1])
    if (!hex) continue
    // Prefer a vertex with fewest hex neighbors (coastal)
    const coastal = [...hex.vertexIds].sort(
      (a, b) => vertices[a].hexIds.length - vertices[b].hexIds.length,
    )
    const v = vertices[coastal[0]]
    if (!v.port) {
      v.port = { ratio: port.ratio, resource: port.resource }
    }
  }

  return {
    hexes,
    vertices,
    edges: [...edgeSet.values()],
    projectorHexId,
  }
}

export function hexPolygonPoints(q: number, r: number): string {
  const { x: cx, y: cy } = axialToPixel(q, r)
  return Array.from({ length: 6 }, (_, i) => {
    const p = hexCorner(cx, cy, i)
    return `${p.x},${p.y}`
  }).join(' ')
}

export function hexCenter(q: number, r: number): { x: number; y: number } {
  return axialToPixel(q, r)
}

export { HEX_SIZE }
