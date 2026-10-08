import { COSTS, RESOURCE_LABEL, type GameState, type Resource, type Resources } from '../game/types'
import { victoryPoints } from '../game/engine'
import { useMemo, useState } from 'react'

interface Props {
  state: GameState
  onRoll: () => void
  onEndTurn: () => void
  onBuyAgenda: () => void
  onPlayAgenda: (id: string) => void
  onBankTrade: (give: Resource, want: Resource) => void
  onPlayerTrade: (withId: number, give: Partial<Resources>, take: Partial<Resources>) => void
  onDiscard: (playerId: number, drop: Partial<Resources>) => void
  onOpenSpaces: (a: Resource, b: Resource) => void
  onNetworking: (r: Resource) => void
  onNewGame: () => void
}

const RESOURCES: Resource[] = ['tokens', 'commits', 'widgets', 'patches', 'signals']

export function Sidebar({
  state,
  onRoll,
  onEndTurn,
  onBuyAgenda,
  onPlayAgenda,
  onBankTrade,
  onPlayerTrade,
  onDiscard,
  onOpenSpaces,
  onNetworking,
  onNewGame,
}: Props) {
  const me = state.players[state.currentPlayer]
  const [give, setGive] = useState<Resource>('tokens')
  const [want, setWant] = useState<Resource>('commits')
  const [tradeWith, setTradeWith] = useState(() =>
    state.players.find((p) => p.id !== state.currentPlayer)?.id ?? 0,
  )
  const [giveAmt, setGiveAmt] = useState<Record<Resource, number>>({
    tokens: 0, commits: 0, widgets: 0, patches: 0, signals: 0,
  })
  const [takeAmt, setTakeAmt] = useState<Record<Resource, number>>({
    tokens: 0, commits: 0, widgets: 0, patches: 0, signals: 0,
  })
  const [discardPick, setDiscardPick] = useState<Record<Resource, number>>({
    tokens: 0, commits: 0, widgets: 0, patches: 0, signals: 0,
  })
  const [openA, setOpenA] = useState<Resource>('tokens')
  const [openB, setOpenB] = useState<Resource>('commits')

  const discardPlayer = useMemo(() => {
    const id = Object.keys(state.pendingDiscard)[0]
    return id === undefined ? null : Number(id)
  }, [state.pendingDiscard])

  return (
    <aside className="sidebar">
      {state.phase === 'gameOver' && state.winnerId !== null && (
        <div className="win-banner">
          {state.players[state.winnerId].name} takes the conference!
          <div style={{ marginTop: '0.6rem' }}>
            <button type="button" className="btn primary" onClick={onNewGame}>
              Play again
            </button>
          </div>
        </div>
      )}

      <div className="panel">
        <h3>Attendees</h3>
        <div className="players">
          {state.players.map((p) => (
            <div key={p.id} className={`player-row${p.id === state.currentPlayer ? ' active' : ''}`}>
              <span className={`swatch ${p.color}`} />
              <div>
                <strong>{p.name}</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {victoryPoints(state, p.id)} Cred
                  {state.longestHallwayOwner === p.id ? ' · Hallways' : ''}
                  {state.mostBadgeScansOwner === p.id ? ' · Badges' : ''}
                </div>
              </div>
              <span style={{ fontSize: '0.8rem' }}>{p.knightsPlayed}🔑</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>{me.name}&apos;s bag</h3>
        <div className="resources">
          {RESOURCES.map((r) => (
            <div key={r} className={`chip ${r}`}>
              {me.resources[r]}
              <small>{RESOURCE_LABEL[r]}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Turn</h3>
        {state.lastRoll && (
          <div className="dice" style={{ marginBottom: '0.5rem' }}>
            <span className="die">{state.lastRoll[0]}</span>
            <span className="die">{state.lastRoll[1]}</span>
            <span>= {state.lastRoll[0] + state.lastRoll[1]}</span>
          </div>
        )}
        <div className="actions">
          <button type="button" className="btn primary" disabled={state.phase !== 'roll'} onClick={onRoll}>
            Roll dice
          </button>
          <button type="button" className="btn" disabled={state.phase !== 'main'} onClick={onEndTurn}>
            End turn
          </button>
          <button type="button" className="btn" disabled={state.phase !== 'main'} onClick={onBuyAgenda}>
            Buy agenda
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0.55rem 0 0' }}>
          Costs — Hallway: C+W · Room: C+W+S+T · Ballroom: 2P+3T · Agenda: T+P+S
        </p>
      </div>

      {state.phase === 'discard' && discardPlayer !== null && (
        <div className="panel">
          <h3>Discard for {state.players[discardPlayer].name}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            Drop {state.pendingDiscard[discardPlayer]} resources (Broken Projector).
          </p>
          <div className="trade-grid">
            {RESOURCES.map((r) => (
              <label key={r} className="field">
                <span>{RESOURCE_LABEL[r]}</span>
                <input
                  type="number"
                  min={0}
                  max={state.players[discardPlayer].resources[r]}
                  value={discardPick[r]}
                  onChange={(e) =>
                    setDiscardPick((d) => ({ ...d, [r]: Number(e.target.value) }))
                  }
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              onDiscard(discardPlayer, discardPick)
              setDiscardPick({ tokens: 0, commits: 0, widgets: 0, patches: 0, signals: 0 })
            }}
          >
            Discard
          </button>
        </div>
      )}

      {state.phase === 'openSpacesPick' && (
        <div className="panel">
          <h3>Open Spaces</h3>
          <div className="trade-grid">
            <label className="field">
              <span>First</span>
              <select value={openA} onChange={(e) => setOpenA(e.target.value as Resource)}>
                {RESOURCES.map((r) => (
                  <option key={r} value={r}>{RESOURCE_LABEL[r]}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Second</span>
              <select value={openB} onChange={(e) => setOpenB(e.target.value as Resource)}>
                {RESOURCES.map((r) => (
                  <option key={r} value={r}>{RESOURCE_LABEL[r]}</option>
                ))}
              </select>
            </label>
          </div>
          <button type="button" className="btn primary" onClick={() => onOpenSpaces(openA, openB)}>
            Take resources
          </button>
        </div>
      )}

      {state.phase === 'networkingPick' && (
        <div className="panel">
          <h3>Networking Reception</h3>
          <div className="actions">
            {RESOURCES.map((r) => (
              <button key={r} type="button" className="btn" onClick={() => onNetworking(r)}>
                Take all {RESOURCE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="panel">
        <h3>Agenda hand</h3>
        <div className="agenda-list">
          {me.agenda.length === 0 && (
            <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No cards yet.</span>
          )}
          {me.agenda.map((c) => (
            <button
              key={c.id}
              type="button"
              className="agenda-card"
              disabled={state.phase !== 'main' || c.kind === 'lightningTalk'}
              onClick={() => onPlayAgenda(c.id)}
              title={c.flavor}
            >
              <strong>{c.title}</strong>
              <span>{c.flavor}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Sponsor booth (bank)</h3>
        <div className="trade-grid">
          <label className="field">
            <span>Give</span>
            <select value={give} onChange={(e) => setGive(e.target.value as Resource)}>
              {RESOURCES.map((r) => (
                <option key={r} value={r}>{RESOURCE_LABEL[r]}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Want</span>
            <select value={want} onChange={(e) => setWant(e.target.value as Resource)}>
              {RESOURCES.map((r) => (
                <option key={r} value={r}>{RESOURCE_LABEL[r]}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          className="btn"
          disabled={state.phase !== 'main'}
          onClick={() => onBankTrade(give, want)}
        >
          Trade with bank
        </button>
      </div>

      <div className="panel">
        <h3>Peer trade</h3>
        <label className="field">
          <span>With</span>
          <select
            value={tradeWith}
            onChange={(e) => setTradeWith(Number(e.target.value))}
          >
            {state.players
              .filter((p) => p.id !== state.currentPlayer)
              .map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
          </select>
        </label>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>You give → they give</p>
        <div className="trade-grid">
          {RESOURCES.map((r) => (
            <label key={`g-${r}`} className="field">
              <span>Give {RESOURCE_LABEL[r]}</span>
              <input
                type="number"
                min={0}
                value={giveAmt[r]}
                onChange={(e) => setGiveAmt((d) => ({ ...d, [r]: Number(e.target.value) }))}
              />
            </label>
          ))}
          {RESOURCES.map((r) => (
            <label key={`t-${r}`} className="field">
              <span>Take {RESOURCE_LABEL[r]}</span>
              <input
                type="number"
                min={0}
                value={takeAmt[r]}
                onChange={(e) => setTakeAmt((d) => ({ ...d, [r]: Number(e.target.value) }))}
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          className="btn"
          disabled={state.phase !== 'main'}
          onClick={() => onPlayerTrade(tradeWith, giveAmt, takeAmt)}
        >
          Confirm trade
        </button>
      </div>

      <div className="panel">
        <h3>Lands</h3>
        <div className="legend">
          <div><i style={{ background: '#c9a227' }} />AI Prairie → Tokens</div>
          <div><i style={{ background: '#1f7a6c' }} />Code Forest → Commits</div>
          <div><i style={{ background: '#c45c3e' }} />Factory Hills → Widgets</div>
          <div><i style={{ background: '#5b6770' }} />Secure Mtns → Patches</div>
          <div><i style={{ background: '#3aa8b8' }} />Robot Pasture → Signals</div>
          <div><i style={{ background: '#2b3538' }} />Dead Zone (no Wi‑Fi)</div>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.6rem' }}>
          First to 10 Conference Cred. Click glowing nodes for rooms, edges for hallways,
          your triangle rooms again to upgrade to ballrooms. On a 7, move the Broken Projector.
        </p>
        <p style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
          Build costs reference: Hallway {JSON.stringify(COSTS.hallway)}
        </p>
      </div>
    </aside>
  )
}
