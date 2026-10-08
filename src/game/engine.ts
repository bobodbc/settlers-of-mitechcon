import { createBoard } from './board'
import { createAgendaDeck } from './deck'
import {
  COSTS,
  EMPTY_RESOURCES,
  PLAYER_COLORS,
  TERRAIN_RESOURCE,
  type Building,
  type GameState,
  type Player,
  type Resource,
  type Resources,
} from './types'

function cloneResources(r: Resources): Resources {
  return { ...r }
}

function hasCost(r: Resources, cost: Partial<Resources>): boolean {
  return (Object.keys(cost) as Resource[]).every((k) => r[k] >= (cost[k] ?? 0))
}

function payCost(r: Resources, cost: Partial<Resources>): Resources {
  const next = cloneResources(r)
  for (const k of Object.keys(cost) as Resource[]) {
    next[k] -= cost[k] ?? 0
  }
  return next
}

function totalResources(r: Resources): number {
  return r.tokens + r.commits + r.widgets + r.patches + r.signals
}

function randomResource(r: Resources): Resource | null {
  const pool: Resource[] = []
  ;(['tokens', 'commits', 'widgets', 'patches', 'signals'] as Resource[]).forEach((k) => {
    for (let i = 0; i < r[k]; i++) pool.push(k)
  })
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

function neighborsOfVertex(state: GameState, vertexId: number): number[] {
  return state.edges
    .filter((e) => e.a === vertexId || e.b === vertexId)
    .map((e) => (e.a === vertexId ? e.b : e.a))
}

function buildingAt(state: GameState, vertexId: number): Building | undefined {
  return state.buildings.find((b) => b.vertexId === vertexId)
}

function distanceRuleOk(state: GameState, vertexId: number): boolean {
  return neighborsOfVertex(state, vertexId).every((n) => !buildingAt(state, n))
}

function playerTouchesVertex(state: GameState, playerId: number, vertexId: number): boolean {
  if (state.buildings.some((b) => b.playerId === playerId && b.vertexId === vertexId)) return true
  return state.hallways.some((h) => {
    if (h.playerId !== playerId) return false
    const e = state.edges[h.edgeId]
    return e.a === vertexId || e.b === vertexId
  })
}

function playerTouchesEdge(state: GameState, playerId: number, edgeId: number): boolean {
  const e = state.edges[edgeId]
  if (playerTouchesVertex(state, playerId, e.a) || playerTouchesVertex(state, playerId, e.b)) {
    return true
  }
  // Also allow extending from adjacent hallways
  return state.hallways.some((h) => {
    if (h.playerId !== playerId) return false
    const he = state.edges[h.edgeId]
    return he.a === e.a || he.a === e.b || he.b === e.a || he.b === e.b
  })
}

function longestPathForPlayer(state: GameState, playerId: number): number {
  const owned = state.hallways.filter((h) => h.playerId === playerId).map((h) => h.edgeId)
  if (!owned.length) return 0
  const adj = new Map<number, number[]>()
  for (const eid of owned) {
    const e = state.edges[eid]
    if (!adj.has(e.a)) adj.set(e.a, [])
    if (!adj.has(e.b)) adj.set(e.b, [])
    adj.get(e.a)!.push(e.b)
    adj.get(e.b)!.push(e.a)
  }

  let best = 0
  const dfs = (node: number, used: Set<string>, len: number) => {
    best = Math.max(best, len)
    for (const next of adj.get(node) ?? []) {
      const ek = node < next ? `${node}-${next}` : `${next}-${node}`
      if (used.has(ek)) continue
      // Break at opponent buildings (except own)
      const b = buildingAt(state, next)
      used.add(ek)
      if (b && b.playerId !== playerId) {
        best = Math.max(best, len + 1)
      } else {
        dfs(next, used, len + 1)
      }
      used.delete(ek)
    }
  }

  for (const start of adj.keys()) {
    dfs(start, new Set(), 0)
  }
  return best
}

function updateAwards(state: GameState): GameState {
  let longestHallwayOwner = state.longestHallwayOwner
  let mostBadgeScansOwner = state.mostBadgeScansOwner

  const lengths = state.players.map((p) => ({ id: p.id, len: longestPathForPlayer(state, p.id) }))
  const maxLen = Math.max(...lengths.map((l) => l.len), 0)
  if (maxLen >= 5) {
    const leaders = lengths.filter((l) => l.len === maxLen)
    if (leaders.length === 1) longestHallwayOwner = leaders[0].id
  } else {
    longestHallwayOwner = null
  }

  const knights = state.players.map((p) => ({ id: p.id, k: p.knightsPlayed }))
  const maxK = Math.max(...knights.map((k) => k.k), 0)
  if (maxK >= 3) {
    const leaders = knights.filter((k) => k.k === maxK)
    if (leaders.length === 1) mostBadgeScansOwner = leaders[0].id
  } else {
    mostBadgeScansOwner = null
  }

  return { ...state, longestHallwayOwner, mostBadgeScansOwner }
}

export function victoryPoints(state: GameState, playerId: number): number {
  const p = state.players[playerId]
  let vp = p.victoryPointCards
  for (const b of state.buildings) {
    if (b.playerId !== playerId) continue
    vp += b.kind === 'ballroom' ? 2 : 1
  }
  if (state.longestHallwayOwner === playerId) vp += 2
  if (state.mostBadgeScansOwner === playerId) vp += 2
  return vp
}

function checkWinner(state: GameState): GameState {
  for (const p of state.players) {
    if (victoryPoints(state, p.id) >= 10) {
      return {
        ...state,
        phase: 'gameOver',
        winnerId: p.id,
        message: `${p.name} wins with ${victoryPoints(state, p.id)} Conference Cred!`,
      }
    }
  }
  return state
}

export function createGame(playerNames: string[]): GameState {
  const board = createBoard()
  const players: Player[] = playerNames.slice(0, 4).map((name, id) => ({
    id,
    name: name.trim() || `Player ${id + 1}`,
    color: PLAYER_COLORS[id],
    resources: EMPTY_RESOURCES(),
    agenda: [],
    knightsPlayed: 0,
    victoryPointCards: 0,
  }))

  return {
    phase: 'setup',
    players,
    currentPlayer: 0,
    setupTurn: 0,
    setupRound: 1,
    hexes: board.hexes,
    vertices: board.vertices,
    edges: board.edges,
    buildings: [],
    hallways: [],
    projectorHexId: board.projectorHexId,
    deck: createAgendaDeck(),
    discardPile: [],
    lastRoll: null,
    longestHallwayOwner: null,
    mostBadgeScansOwner: null,
    winnerId: null,
    message: `${players[0].name}: place your first Session Room.`,
    freeHallwaysRemaining: 0,
    pendingDiscard: {},
    selectedTradeOffer: null,
  }
}

function produce(state: GameState, total: number): GameState {
  if (total === 7) return state
  const players = state.players.map((p) => ({ ...p, resources: cloneResources(p.resources) }))
  const gained: string[] = []

  for (const hex of state.hexes) {
    if (hex.number !== total) continue
    if (hex.id === state.projectorHexId) continue
    if (hex.terrain === 'deadZone') continue
    const res = TERRAIN_RESOURCE[hex.terrain]
    for (const vid of hex.vertexIds) {
      const b = buildingAt(state, vid)
      if (!b) continue
      const amount = b.kind === 'ballroom' ? 2 : 1
      players[b.playerId].resources[res] += amount
      gained.push(`${players[b.playerId].name}+${amount} ${res}`)
    }
  }

  return {
    ...state,
    players,
    message: gained.length
      ? `Production: ${gained.slice(0, 8).join(', ')}${gained.length > 8 ? '…' : ''}`
      : 'No production this roll.',
  }
}

function advanceSetup(state: GameState): GameState {
  const n = state.players.length
  // Round 1: 0..n-1, Round 2: n-1..0
  let nextSetup = state.setupTurn + 1
  let round = state.setupRound
  let currentPlayer = state.currentPlayer

  if (round === 1) {
    if (nextSetup >= n) {
      round = 2
      nextSetup = 0
      currentPlayer = n - 1
    } else {
      currentPlayer = nextSetup
    }
  } else {
    if (nextSetup >= n) {
      // Setup done — grant starting resources from second room
      const players = state.players.map((p) => ({ ...p, resources: cloneResources(p.resources) }))
      for (const p of players) {
        const rooms = state.buildings.filter((b) => b.playerId === p.id)
        const second = rooms[rooms.length - 1]
        if (!second) continue
        const v = state.vertices[second.vertexId]
        for (const hid of v.hexIds) {
          const hex = state.hexes[hid]
          if (hex.terrain === 'deadZone') continue
          players[p.id].resources[TERRAIN_RESOURCE[hex.terrain]] += 1
        }
      }
      return {
        ...state,
        players,
        phase: 'roll',
        currentPlayer: 0,
        setupTurn: nextSetup,
        setupRound: round,
        message: `${players[0].name}: roll the dice.`,
      }
    }
    currentPlayer = n - 1 - nextSetup
  }

  return {
    ...state,
    setupTurn: nextSetup,
    setupRound: round,
    currentPlayer,
    message: `${state.players[currentPlayer].name}: place a Session Room, then a Hallway.`,
  }
}

export function placeSetupRoom(state: GameState, vertexId: number): GameState {
  if (state.phase !== 'setup') return state
  if (buildingAt(state, vertexId)) return { ...state, message: 'That spot is taken.' }
  if (!distanceRuleOk(state, vertexId)) {
    return { ...state, message: 'Too close to another room (distance rule).' }
  }

  // During setup, room placement waits for hallway — stash via temp building then hallway
  const buildings = [
    ...state.buildings,
    { vertexId, playerId: state.currentPlayer, kind: 'room' as const },
  ]
  return {
    ...state,
    buildings,
    message: `${state.players[state.currentPlayer].name}: attach a Hallway to that room.`,
    // Mark that we're waiting for hallway by using freeHallwaysRemaining = -1 sentinel? 
    // Use freeHallwaysRemaining = 1 as "must place hallway for free"
    freeHallwaysRemaining: 1,
  }
}

export function placeHallway(state: GameState, edgeId: number): GameState {
  if (state.hallways.some((h) => h.edgeId === edgeId)) {
    return { ...state, message: 'Hallway already claimed.' }
  }

  const pid = state.currentPlayer
  const free = state.freeHallwaysRemaining > 0 || state.phase === 'roadBuilding'
  const e = state.edges[edgeId]

  if (state.phase === 'setup') {
    if (state.freeHallwaysRemaining !== 1) {
      return { ...state, message: 'Place a Session Room first.' }
    }
    // Must touch the room just placed (player's latest building)
    const mine = state.buildings.filter((b) => b.playerId === pid)
    const last = mine[mine.length - 1]
    if (!last || (e.a !== last.vertexId && e.b !== last.vertexId)) {
      return { ...state, message: 'Hallway must touch the room you just placed.' }
    }
    const hallways = [...state.hallways, { edgeId, playerId: pid }]
    let next: GameState = {
      ...state,
      hallways,
      freeHallwaysRemaining: 0,
    }
    next = advanceSetup(next)
    return updateAwards(next)
  }

  if (state.phase === 'roadBuilding' || (state.phase === 'main' && free)) {
    if (!playerTouchesEdge(state, pid, edgeId) && state.phase !== 'roadBuilding') {
      // during road building still need connectivity
    }
    if (!playerTouchesEdge(state, pid, edgeId)) {
      return { ...state, message: 'Hallway must connect to your network.' }
    }
    const hallways = [...state.hallways, { edgeId, playerId: pid }]
    let remaining = state.freeHallwaysRemaining - 1
    let phase = state.phase
    let message = 'Hallway built.'
    if (remaining <= 0) {
      remaining = 0
      phase = 'main'
      message = remaining === 0 && state.phase === 'roadBuilding' ? 'Hallway Track done.' : message
    }
    return updateAwards(
      checkWinner({
        ...state,
        hallways,
        freeHallwaysRemaining: Math.max(0, remaining),
        phase,
        message,
      }),
    )
  }

  if (state.phase !== 'main') return state
  const player = state.players[pid]
  if (!hasCost(player.resources, COSTS.hallway)) {
    return { ...state, message: 'Need 1 Commit + 1 Widget.' }
  }
  if (!playerTouchesEdge(state, pid, edgeId)) {
    return { ...state, message: 'Hallway must connect to your network.' }
  }

  const players = state.players.map((p) =>
    p.id === pid ? { ...p, resources: payCost(p.resources, COSTS.hallway) } : p,
  )
  return updateAwards(
    checkWinner({
      ...state,
      players,
      hallways: [...state.hallways, { edgeId, playerId: pid }],
      message: 'Hallway built.',
    }),
  )
}

export function placeRoom(state: GameState, vertexId: number): GameState {
  if (state.phase === 'setup') return placeSetupRoom(state, vertexId)
  if (state.phase !== 'main') return state
  if (buildingAt(state, vertexId)) return { ...state, message: 'Spot taken.' }
  if (!distanceRuleOk(state, vertexId)) return { ...state, message: 'Too close to another room.' }
  if (!playerTouchesVertex(state, state.currentPlayer, vertexId)) {
    return { ...state, message: 'Must connect via your hallway network.' }
  }
  const pid = state.currentPlayer
  const player = state.players[pid]
  if (!hasCost(player.resources, COSTS.room)) {
    return { ...state, message: 'Need Commit + Widget + Signal + Token.' }
  }
  const players = state.players.map((p) =>
    p.id === pid ? { ...p, resources: payCost(p.resources, COSTS.room) } : p,
  )
  return checkWinner(
    updateAwards({
      ...state,
      players,
      buildings: [...state.buildings, { vertexId, playerId: pid, kind: 'room' }],
      message: 'Session Room claimed!',
    }),
  )
}

export function upgradeBallroom(state: GameState, vertexId: number): GameState {
  if (state.phase !== 'main') return state
  const b = buildingAt(state, vertexId)
  if (!b || b.playerId !== state.currentPlayer || b.kind !== 'room') {
    return { ...state, message: 'Upgrade one of your Session Rooms.' }
  }
  const pid = state.currentPlayer
  if (!hasCost(state.players[pid].resources, COSTS.ballroom)) {
    return { ...state, message: 'Need 2 Patches + 3 Tokens.' }
  }
  const players = state.players.map((p) =>
    p.id === pid ? { ...p, resources: payCost(p.resources, COSTS.ballroom) } : p,
  )
  const buildings = state.buildings.map((bl) =>
    bl.vertexId === vertexId ? { ...bl, kind: 'ballroom' as const } : bl,
  )
  return checkWinner({
    ...state,
    players,
    buildings,
    message: 'Upgraded to Ballroom!',
  })
}

export function rollDice(state: GameState): GameState {
  if (state.phase !== 'roll') return state
  const d1 = 1 + Math.floor(Math.random() * 6)
  const d2 = 1 + Math.floor(Math.random() * 6)
  const total = d1 + d2
  let next: GameState = { ...state, lastRoll: [d1, d2] }

  if (total === 7) {
    const pendingDiscard: Record<number, number> = {}
    let anyone = false
    for (const p of state.players) {
      const t = totalResources(p.resources)
      if (t > 7) {
        pendingDiscard[p.id] = Math.floor(t / 2)
        anyone = true
      }
    }
    if (anyone) {
      return {
        ...next,
        phase: 'discard',
        pendingDiscard,
        message: 'Broken Projector! Discard half if you hold more than 7 resources.',
      }
    }
    return {
      ...next,
      phase: 'moveProjector',
      pendingDiscard: {},
      message: `${state.players[state.currentPlayer].name}: move the Broken Projector.`,
    }
  }

  next = produce(next, total)
  return { ...next, phase: 'main', message: next.message + ' — build, trade, or end turn.' }
}

export function discardResources(state: GameState, playerId: number, drop: Partial<Resources>): GameState {
  if (state.phase !== 'discard') return state
  const need = state.pendingDiscard[playerId] ?? 0
  if (need <= 0) return state
  const count = (Object.keys(drop) as Resource[]).reduce((s, k) => s + (drop[k] ?? 0), 0)
  if (count !== need) {
    return { ...state, message: `Discard exactly ${need} resources.` }
  }
  const p = state.players[playerId]
  for (const k of Object.keys(drop) as Resource[]) {
    if ((drop[k] ?? 0) > p.resources[k]) {
      return { ...state, message: 'You do not have those resources.' }
    }
  }
  const players = state.players.map((pl) => {
    if (pl.id !== playerId) return pl
    return { ...pl, resources: payCost(pl.resources, drop) }
  })
  const pendingDiscard = { ...state.pendingDiscard }
  delete pendingDiscard[playerId]
  const remaining = Object.keys(pendingDiscard).length
  if (remaining > 0) {
    return {
      ...state,
      players,
      pendingDiscard,
      message: `Thanks. Waiting on ${remaining} more discard(s).`,
    }
  }
  return {
    ...state,
    players,
    pendingDiscard: {},
    phase: 'moveProjector',
    message: `${state.players[state.currentPlayer].name}: move the Broken Projector.`,
  }
}

export function moveProjector(state: GameState, hexId: number): GameState {
  if (state.phase !== 'moveProjector') return state
  if (hexId === state.projectorHexId) {
    return { ...state, message: 'Pick a different hex.' }
  }
  // Steal from a player adjacent to that hex
  const hex = state.hexes[hexId]
  const victims = new Set<number>()
  for (const vid of hex.vertexIds) {
    const b = buildingAt(state, vid)
    if (b && b.playerId !== state.currentPlayer) victims.add(b.playerId)
  }
  let players = state.players.map((p) => ({ ...p, resources: cloneResources(p.resources) }))
  let message = 'Broken Projector moved.'
  if (victims.size) {
    const victimId = [...victims][Math.floor(Math.random() * victims.size)]
    const stolen = randomResource(players[victimId].resources)
    if (stolen) {
      players[victimId].resources[stolen] -= 1
      players[state.currentPlayer].resources[stolen] += 1
      message = `Stole 1 ${stolen} from ${players[victimId].name}.`
    }
  }
  return {
    ...state,
    players,
    projectorHexId: hexId,
    phase: 'main',
    message: message + ' Build, trade, or end turn.',
  }
}

export function bankTrade(
  state: GameState,
  give: Resource,
  want: Resource,
): GameState {
  if (state.phase !== 'main') return state
  const pid = state.currentPlayer
  const player = state.players[pid]
  // Best ratio from ports
  let ratio = 4
  for (const b of state.buildings) {
    if (b.playerId !== pid) continue
    const port = state.vertices[b.vertexId].port
    if (!port) continue
    if (port.resource === 'any') ratio = Math.min(ratio, port.ratio)
    if (port.resource === give) ratio = Math.min(ratio, port.ratio)
  }
  if (player.resources[give] < ratio) {
    return { ...state, message: `Need ${ratio} ${give} for that trade.` }
  }
  const players = state.players.map((p) => {
    if (p.id !== pid) return p
    const r = cloneResources(p.resources)
    r[give] -= ratio
    r[want] += 1
    return { ...p, resources: r }
  })
  return { ...state, players, message: `Traded ${ratio} ${give} → 1 ${want}.` }
}

export function playerTrade(
  state: GameState,
  withPlayerId: number,
  give: Partial<Resources>,
  take: Partial<Resources>,
): GameState {
  if (state.phase !== 'main') return state
  const a = state.currentPlayer
  const b = withPlayerId
  if (a === b) return state
  const pa = state.players[a]
  const pb = state.players[b]
  if (!hasCost(pa.resources, give) || !hasCost(pb.resources, take)) {
    return { ...state, message: 'Trade failed — not enough resources.' }
  }
  const players = state.players.map((p) => {
    if (p.id === a) {
      let r = payCost(p.resources, give)
      for (const k of Object.keys(take) as Resource[]) r[k] += take[k] ?? 0
      return { ...p, resources: r }
    }
    if (p.id === b) {
      let r = payCost(p.resources, take)
      for (const k of Object.keys(give) as Resource[]) r[k] += give[k] ?? 0
      return { ...p, resources: r }
    }
    return p
  })
  return {
    ...state,
    players,
    message: `Traded with ${pb.name}.`,
  }
}

export function buyAgenda(state: GameState): GameState {
  if (state.phase !== 'main') return state
  const pid = state.currentPlayer
  if (!hasCost(state.players[pid].resources, COSTS.agenda)) {
    return { ...state, message: 'Need 1 Token + 1 Patch + 1 Signal.' }
  }
  if (!state.deck.length) return { ...state, message: 'Agenda deck empty.' }
  const [card, ...deck] = state.deck
  const players = state.players.map((p) => {
    if (p.id !== pid) return p
    const resources = payCost(p.resources, COSTS.agenda)
    if (card.kind === 'lightningTalk') {
      return {
        ...p,
        resources,
        agenda: [...p.agenda, card],
        victoryPointCards: p.victoryPointCards + 1,
      }
    }
    return { ...p, resources, agenda: [...p.agenda, card] }
  })
  return checkWinner({
    ...state,
    players,
    deck,
    message: `Drew Agenda: ${card.title}`,
  })
}

export function playAgenda(state: GameState, cardId: string): GameState {
  if (state.phase !== 'main' && state.phase !== 'roll') return state
  // Allow knights before roll? Keep to main for simplicity, and keynotes during main
  if (state.phase !== 'main') return state
  const pid = state.currentPlayer
  const player = state.players[pid]
  const card = player.agenda.find((c) => c.id === cardId)
  if (!card) return state
  if (card.kind === 'lightningTalk') {
    return { ...state, message: 'Lightning Talks stay hidden for Cred.' }
  }

  const removeCard = (p: Player): Player => ({
    ...p,
    agenda: p.agenda.filter((c) => c.id !== cardId),
  })

  if (card.kind === 'keynote') {
    const players = state.players.map((p) =>
      p.id === pid ? { ...removeCard(p), knightsPlayed: p.knightsPlayed + 1 } : p,
    )
    return updateAwards({
      ...state,
      players,
      discardPile: [...state.discardPile, card],
      phase: 'moveProjector',
      message: 'Keynote Pass! Move the Broken Projector.',
    })
  }

  if (card.kind === 'hallwayTrack') {
    const players = state.players.map((p) => (p.id === pid ? removeCard(p) : p))
    return {
      ...state,
      players,
      discardPile: [...state.discardPile, card],
      phase: 'roadBuilding',
      freeHallwaysRemaining: 2,
      message: 'Place up to 2 free Hallways.',
    }
  }

  if (card.kind === 'openSpaces') {
    const players = state.players.map((p) => (p.id === pid ? removeCard(p) : p))
    return {
      ...state,
      players,
      discardPile: [...state.discardPile, card],
      phase: 'openSpacesPick',
      message: 'Pick 2 resources from the bank.',
    }
  }

  if (card.kind === 'networking') {
    const players = state.players.map((p) => (p.id === pid ? removeCard(p) : p))
    return {
      ...state,
      players,
      discardPile: [...state.discardPile, card],
      phase: 'networkingPick',
      message: 'Name a resource — take all of it from everyone.',
    }
  }

  return state
}

export function pickOpenSpaces(state: GameState, a: Resource, b: Resource): GameState {
  if (state.phase !== 'openSpacesPick') return state
  const pid = state.currentPlayer
  const players = state.players.map((p) => {
    if (p.id !== pid) return p
    const r = cloneResources(p.resources)
    r[a] += 1
    r[b] += 1
    return { ...p, resources: r }
  })
  return {
    ...state,
    players,
    phase: 'main',
    message: `Open Spaces: took ${a} & ${b}.`,
  }
}

export function pickNetworking(state: GameState, resource: Resource): GameState {
  if (state.phase !== 'networkingPick') return state
  const pid = state.currentPlayer
  const players = state.players.map((p) => ({ ...p, resources: cloneResources(p.resources) }))
  let stolen = 0
  for (const p of players) {
    if (p.id === pid) continue
    stolen += p.resources[resource]
    p.resources[resource] = 0
  }
  players[pid].resources[resource] += stolen
  return {
    ...state,
    players,
    phase: 'main',
    message: `Networking Reception: collected ${stolen} ${resource}.`,
  }
}

export function endTurn(state: GameState): GameState {
  if (state.phase !== 'main') return state
  const next = (state.currentPlayer + 1) % state.players.length
  return {
    ...state,
    currentPlayer: next,
    phase: 'roll',
    lastRoll: null,
    message: `Pass the device to ${state.players[next].name}. Roll when ready.`,
  }
}

export function canPlaceRoom(state: GameState, vertexId: number): boolean {
  if (buildingAt(state, vertexId)) return false
  if (!distanceRuleOk(state, vertexId)) return false
  if (state.phase === 'setup') return state.freeHallwaysRemaining !== 1
  if (state.phase !== 'main') return false
  if (!playerTouchesVertex(state, state.currentPlayer, vertexId)) return false
  return hasCost(state.players[state.currentPlayer].resources, COSTS.room)
}

export function canPlaceHallway(state: GameState, edgeId: number): boolean {
  if (state.hallways.some((h) => h.edgeId === edgeId)) return false
  const pid = state.currentPlayer
  const e = state.edges[edgeId]
  if (state.phase === 'setup' && state.freeHallwaysRemaining === 1) {
    const mine = state.buildings.filter((b) => b.playerId === pid)
    const last = mine[mine.length - 1]
    return !!last && (e.a === last.vertexId || e.b === last.vertexId)
  }
  if (state.phase === 'roadBuilding' && state.freeHallwaysRemaining > 0) {
    return playerTouchesEdge(state, pid, edgeId)
  }
  if (state.phase !== 'main') return false
  if (!hasCost(state.players[pid].resources, COSTS.hallway)) return false
  return playerTouchesEdge(state, pid, edgeId)
}

export function canUpgrade(state: GameState, vertexId: number): boolean {
  if (state.phase !== 'main') return false
  const b = buildingAt(state, vertexId)
  if (!b || b.playerId !== state.currentPlayer || b.kind !== 'room') return false
  return hasCost(state.players[state.currentPlayer].resources, COSTS.ballroom)
}
