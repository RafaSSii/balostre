# Balostre

Balostre is an independent browser-based 3D RPG prototype set in a stylized medieval fantasy world. The long-term goal is an MMORPG, built gradually with a playable browser client and a server-authoritative multiplayer architecture.

## Browser prototype 0.1

The current browser client uses Three.js, ES modules, and CSS. The scene includes a stylized forest clearing, ancient ruins, a third-person adventurer, goblins with pursuit and telegraphed attacks, directional melee combat, a magic projectile, dodge timing, health/mana, mana regeneration, hit feedback, and XP/level progression. Movement includes basic collision avoidance around trees and ruins, animated limbs, and smoother third-person camera follow.

### Run the browser prototype

From the repository root:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000 in a modern desktop browser. Use HTTP rather than opening `index.html` directly, because browsers may block JavaScript module imports on `file://`. Three.js is loaded from jsDelivr and optional fonts from Google Fonts, so the first run requires an internet connection.

### Controls

- **W A S D** — move
- **Mouse** — orbit camera (click the game to capture the pointer)
- **Left click** — directional melee attack (face the enemy)
- **Q** — cast a magic bolt (costs 15 mana)
- **Space** — dodge briefly
- **?** — open the controls guide
- **Esc** — release the pointer

## Multiplayer foundation (in progress)

The repository now contains an initial npm workspace:

- `packages/game-rules` — rendering-independent rules for input validation, movement bounds, directional melee, magic costs/cooldowns, dodge invulnerability, goblin damage, and mana regeneration.
- `apps/server` — a Colyseus WebSocket server with shared room state, server-side player movement, goblin pursuit/attacks, and combat actions.
- `packages/game-rules/test` — Node.js automated tests for the shared rules.

The browser client has **not yet been connected** to the Colyseus server. Until that integration is done, opening `index.html` still runs the original local single-player prototype. The current server is a development foundation, not production-ready anti-cheat or persistence infrastructure.

### Run the rules tests

Requires Node.js 20.11 or newer:

```bash
npm test
```

### Start the multiplayer server

Install dependencies from the repository root, then start the server:

```bash
npm install
npm run server
```

The default WebSocket endpoint is `ws://localhost:2567`, with a room named `world`. To use another port, set the `PORT` environment variable before starting the server. For development with automatic restarts, run `npm run server:dev`.

## Roadmap

1. Connect the Three.js client to Colyseus and render remote players/server state.
2. Run automated tests and verify server startup and multi-client behavior.
3. Improve collision handling and combat synchronization, including enemy attack telegraphs.
4. Add accounts and persistent characters, inventory, quests, and progression.
5. Deploy the client and server; add production configuration, monitoring, and security hardening.
