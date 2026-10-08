import { useCallback, useState } from 'react'
import { Board } from './components/Board'
import { Sidebar } from './components/Sidebar'
import {
  bankTrade,
  buyAgenda,
  createGame,
  discardResources,
  endTurn,
  moveProjector,
  pickNetworking,
  pickOpenSpaces,
  placeHallway,
  placeRoom,
  playAgenda,
  rollDice,
  upgradeBallroom,
  playerTrade,
  canUpgrade,
} from './game/engine'
import type { GameState, Resource } from './game/types'
import './styles/game.css'

type Screen = 'lobby' | 'play'

export default function App() {
  const [screen, setScreen] = useState<Screen>('lobby')
  const [count, setCount] = useState(3)
  const [names, setNames] = useState(['Alex', 'Jordan', 'Sam', 'Riley'])
  const [state, setState] = useState<GameState | null>(null)

  const start = () => {
    const picked = names.slice(0, count)
    setState(createGame(picked))
    setScreen('play')
  }

  const patch = useCallback((fn: (s: GameState) => GameState) => {
    setState((s) => (s ? fn(s) : s))
  }, [])

  if (screen === 'lobby' || !state) {
    return (
      <div className="splash">
        <div className="splash-card">
          <h1>Settlers of MITechCon</h1>
          <p className="lede">
            A casual Catan remix of Michigan&apos;s tech conference. Claim session rooms,
            crawl the hallways, dodge the Broken Projector, and race to 10 Conference Cred.
          </p>

          <label className="field">
            <span>Players (hot-seat)</span>
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              <option value={2}>2 players</option>
              <option value={3}>3 players</option>
              <option value={4}>4 players</option>
            </select>
          </label>

          {Array.from({ length: count }, (_, i) => (
            <label key={i} className="field">
              <span>Player {i + 1}</span>
              <input
                value={names[i]}
                onChange={(e) => {
                  const next = [...names]
                  next[i] = e.target.value
                  setNames(next)
                }}
              />
            </label>
          ))}

          <button type="button" className="btn primary" style={{ width: '100%' }} onClick={start}>
            Start conference
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <strong>Settlers of MITechCon</strong>
          <span>Local multiplayer · pass the laptop</span>
        </div>
        <div className="msg">{state.message}</div>
      </header>
      <div className="layout">
        <div className="board-wrap">
          <Board
            state={state}
            onVertex={(id) =>
              patch((s) => {
                if (s.phase === 'setup' || s.phase === 'main') {
                  if (canUpgrade(s, id)) return upgradeBallroom(s, id)
                  return placeRoom(s, id)
                }
                return s
              })
            }
            onEdge={(id) => patch((s) => placeHallway(s, id))}
            onHex={(id) => patch((s) => moveProjector(s, id))}
          />
        </div>
        <Sidebar
          state={state}
          onRoll={() => patch(rollDice)}
          onEndTurn={() => patch(endTurn)}
          onBuyAgenda={() => patch(buyAgenda)}
          onPlayAgenda={(id) => patch((s) => playAgenda(s, id))}
          onBankTrade={(g, w) => patch((s) => bankTrade(s, g, w))}
          onPlayerTrade={(withId, give, take) =>
            patch((s) => playerTrade(s, withId, give, take))
          }
          onDiscard={(playerId, drop) =>
            patch((s) => discardResources(s, playerId, drop))
          }
          onOpenSpaces={(a, b) => patch((s) => pickOpenSpaces(s, a, b))}
          onNetworking={(r: Resource) => patch((s) => pickNetworking(s, r))}
          onNewGame={() => {
            setScreen('lobby')
            setState(null)
          }}
        />
      </div>
    </div>
  )
}
