import { hexCenter, hexPolygonPoints } from '../game/board'
import {
  canPlaceHallway,
  canPlaceRoom,
  canUpgrade,
} from '../game/engine'
import type { GameState, PlayerColor } from '../game/types'

interface Props {
  state: GameState
  onVertex: (id: number) => void
  onEdge: (id: number) => void
  onHex: (id: number) => void
}

const COLOR_CLASS: Record<PlayerColor, string> = {
  coral: 'coral',
  sky: 'sky',
  lime: 'lime',
  amber: 'amber',
}

export function Board({ state, onVertex, onEdge, onHex }: Props) {
  const movingProjector = state.phase === 'moveProjector'
  const pad = 80
  const xs = state.vertices.map((v) => v.x)
  const ys = state.vertices.map((v) => v.y)
  const minX = Math.min(...xs) - pad
  const maxX = Math.max(...xs) + pad
  const minY = Math.min(...ys) - pad
  const maxY = Math.max(...ys) + pad

  return (
    <svg
      className="board-svg"
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      role="img"
      aria-label="MITechCon conference board"
    >
      {state.hexes.map((hex) => {
        const c = hexCenter(hex.q, hex.r)
        const isProjector = hex.id === state.projectorHexId
        return (
          <g key={hex.id}>
            <polygon
              className={`hex ${hex.terrain}${movingProjector && !isProjector ? ' projector-target' : ''}`}
              points={hexPolygonPoints(hex.q, hex.r)}
              onClick={() => onHex(hex.id)}
            />
            {hex.number !== null && (
              <>
                <circle className="number-token" cx={c.x} cy={c.y} r={16} />
                <text
                  className={`number-text${hex.number === 6 || hex.number === 8 ? ' hot' : ''}`}
                  x={c.x}
                  y={c.y}
                >
                  {hex.number}
                </text>
              </>
            )}
            {isProjector && (
              <g className="projector" transform={`translate(${c.x}, ${c.y})`}>
                <rect x={-14} y={-10} width={28} height={18} rx={3} fill="#111" stroke="#f4a261" strokeWidth={2} />
                <circle cx={0} cy={0} r={5} fill="#f4a261" />
                <text x={0} y={22} textAnchor="middle" fontSize={9} fill="#f4a261">
                  PROJECTOR
                </text>
              </g>
            )}
          </g>
        )
      })}

      {state.edges.map((edge) => {
        const a = state.vertices[edge.a]
        const b = state.vertices[edge.b]
        const legal = canPlaceHallway(state, edge.id)
        const hallway = state.hallways.find((h) => h.edgeId === edge.id)
        const color = hallway
          ? COLOR_CLASS[state.players[hallway.playerId].color]
          : ''
        return (
          <g key={edge.id}>
            <line
              className={`edge-line${legal ? ' legal' : ''}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
            />
            {hallway && (
              <line
                className={`hallway stroke-${color}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
              />
            )}
            {(legal || state.phase === 'setup' || state.phase === 'roadBuilding' || state.phase === 'main') && (
              <line
                className="edge-hit"
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                onClick={() => onEdge(edge.id)}
              />
            )}
          </g>
        )
      })}

      {state.vertices.map((v) => {
        const building = state.buildings.find((b) => b.vertexId === v.id)
        const legalRoom = canPlaceRoom(state, v.id)
        const legalUpgrade = canUpgrade(state, v.id)
        if (building) {
          const color = COLOR_CLASS[state.players[building.playerId].color]
          if (building.kind === 'ballroom') {
            return (
              <g key={v.id} onClick={() => onVertex(v.id)} style={{ cursor: 'pointer' }}>
                <rect
                  className={`building fill-${color}`}
                  x={v.x - 12}
                  y={v.y - 12}
                  width={24}
                  height={24}
                  rx={3}
                />
              </g>
            )
          }
          return (
            <polygon
              key={v.id}
              className={`building fill-${color}`}
              points={`${v.x},${v.y - 12} ${v.x + 11},${v.y + 8} ${v.x - 11},${v.y + 8}`}
              onClick={() => onVertex(v.id)}
              style={{ cursor: legalUpgrade ? 'pointer' : 'default' }}
            />
          )
        }
        return (
          <g key={v.id}>
            {v.port && (
              <text className="port-label" x={v.x} y={v.y - 14}>
                {v.port.ratio}:1 {v.port.resource === 'any' ? 'any' : v.port.resource}
              </text>
            )}
            <circle
              className={`vertex${legalRoom ? ' legal' : ''}`}
              cx={v.x}
              cy={v.y}
              r={legalRoom ? 8 : 4}
              onClick={() => onVertex(v.id)}
            />
          </g>
        )
      })}
    </svg>
  )
}
