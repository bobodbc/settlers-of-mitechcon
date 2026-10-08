export type Resource = 'tokens' | 'commits' | 'widgets' | 'patches' | 'signals'

export type Terrain =
  | 'aiPrairie'
  | 'codeForest'
  | 'factoryHills'
  | 'secureMountains'
  | 'robotPasture'
  | 'deadZone'

export type AgendaKind =
  | 'keynote'
  | 'hallwayTrack'
  | 'openSpaces'
  | 'networking'
  | 'lightningTalk'

export type Phase =
  | 'setup'
  | 'roll'
  | 'discard'
  | 'moveProjector'
  | 'main'
  | 'roadBuilding'
  | 'openSpacesPick'
  | 'networkingPick'
  | 'gameOver'

export type PlayerColor = 'coral' | 'sky' | 'lime' | 'amber'

export interface Resources {
  tokens: number
  commits: number
  widgets: number
  patches: number
  signals: number
}

export interface HexTile {
  id: number
  q: number
  r: number
  terrain: Terrain
  number: number | null
  vertexIds: number[]
}

export interface Vertex {
  id: number
  x: number
  y: number
  hexIds: number[]
  port?: { ratio: 2 | 3; resource: Resource | 'any' }
}

export interface Edge {
  id: number
  a: number
  b: number
}

export interface Building {
  vertexId: number
  playerId: number
  kind: 'room' | 'ballroom'
}

export interface Hallway {
  edgeId: number
  playerId: number
}

export interface AgendaCard {
  id: string
  kind: AgendaKind
  title: string
  flavor: string
}

export interface Player {
  id: number
  name: string
  color: PlayerColor
  resources: Resources
  agenda: AgendaCard[]
  knightsPlayed: number
  victoryPointCards: number
}

export interface GameState {
  phase: Phase
  players: Player[]
  currentPlayer: number
  setupTurn: number
  setupRound: 1 | 2
  hexes: HexTile[]
  vertices: Vertex[]
  edges: Edge[]
  buildings: Building[]
  hallways: Hallway[]
  projectorHexId: number
  deck: AgendaCard[]
  discardPile: AgendaCard[]
  lastRoll: [number, number] | null
  longestHallwayOwner: number | null
  mostBadgeScansOwner: number | null
  winnerId: number | null
  message: string
  freeHallwaysRemaining: number
  pendingDiscard: Record<number, number>
  selectedTradeOffer: Partial<Resources> | null
}

export const RESOURCE_LABEL: Record<Resource, string> = {
  tokens: 'Tokens',
  commits: 'Commits',
  widgets: 'Widgets',
  patches: 'Patches',
  signals: 'Signals',
}

export const TERRAIN_RESOURCE: Record<Exclude<Terrain, 'deadZone'>, Resource> = {
  aiPrairie: 'tokens',
  codeForest: 'commits',
  factoryHills: 'widgets',
  secureMountains: 'patches',
  robotPasture: 'signals',
}

export const TERRAIN_LABEL: Record<Terrain, string> = {
  aiPrairie: 'AI Prairie',
  codeForest: 'Code Forest',
  factoryHills: 'Factory Hills',
  secureMountains: 'Secure Mountains',
  robotPasture: 'Robot Pasture',
  deadZone: 'Dead Zone',
}

export const COSTS = {
  hallway: { commits: 1, widgets: 1 } as Partial<Resources>,
  room: { commits: 1, widgets: 1, signals: 1, tokens: 1 } as Partial<Resources>,
  ballroom: { patches: 2, tokens: 3 } as Partial<Resources>,
  agenda: { tokens: 1, patches: 1, signals: 1 } as Partial<Resources>,
}

export const EMPTY_RESOURCES = (): Resources => ({
  tokens: 0,
  commits: 0,
  widgets: 0,
  patches: 0,
  signals: 0,
})

export const PLAYER_COLORS: PlayerColor[] = ['coral', 'sky', 'lime', 'amber']
