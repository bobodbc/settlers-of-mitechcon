# Settlers of MITechCon

A casual, local-multiplayer [Settlers of Catan](https://www.catan.com/)-inspired board game themed around the [Michigan Technology Conference](https://www.mitechcon.org).

Pass one laptop around. Race to **10 Conference Cred**.

## Theme

| Land | Resource | Session topics |
| --- | --- | --- |
| AI Prairie | Tokens | AI & Machine Learning |
| Code Forest | Commits | Software / Architecture, DevOps & Cloud |
| Factory Hills | Widgets | Advanced Manufacturing, Simulation |
| Secure Mountains | Patches | Cybersecurity |
| Robot Pasture | Signals | Robotics, Edge, Autonomous, Product/UX |

- **Hallways** = roads  
- **Session Rooms** = settlements  
- **Ballrooms** = cities  
- **Agenda cards** = development cards  
- **Broken Projector** = robber  

## Play

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

### Setup

1. Each player places a Session Room + attached Hallway (round 1 clockwise, round 2 counter-clockwise).
2. Second room grants starting resources from adjacent lands.
3. On your turn: roll → produce (or move the projector on 7) → build / trade / buy agenda → end turn.

### Win

First to **10 Conference Cred** (rooms, ballrooms, Longest Hallway Crawl, Most Badge Scans, Lightning Talk cards).

## Stack

Vite + React + TypeScript. No backend. Hot-seat only for v1.

## Deploy (Railway)

Static build served by Caddy. The `Dockerfile` multi-stage builds `dist`, then the `Caddyfile` listens on Railway’s `$PORT`.

```bash
# From the Railway dashboard: New Project → Deploy from GitHub
# Or with the Railway CLI:
railway link
railway up
```

## License

MIT — fan remix, not affiliated with Catan GmbH or MITechCon.
