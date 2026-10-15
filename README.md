# Balostre

Balostre is an independent browser-based 3D RPG prototype set in a stylized medieval fantasy world. The long-term goal is an MMORPG; the current milestone is a playable single-player browser prototype.

## Prototype 0.1

Built with Three.js, ES modules, and CSS. No bundler or install step is required. The scene includes a stylized forest clearing, ancient ruins, a third-person adventurer, goblins with pursuit and telegraphed attacks, directional melee combat, a magic projectile, dodge timing, health/mana, mana regeneration, hit feedback, and XP/level progression. The current movement pass adds basic collision avoidance around trees and ruins, animated limbs and body motion while walking, and smoother third-person camera follow.

### Run locally

From the repository root, start a static HTTP server:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000 in a modern desktop browser. Use HTTP rather than opening `index.html` directly, because browsers may block JavaScript module imports on `file://`.

Three.js is loaded from jsDelivr, and the optional font styling is loaded from Google Fonts, so the first run requires an internet connection.

### Controls

- **W A S D** — move
- **Mouse** — orbit camera (click the game to capture the pointer)
- **Left click** — directional melee attack (face the enemy)
- **Dodge timing** — goblins telegraph their swing before dealing damage
- **Q** — cast a magic bolt (costs 15 mana)
- **Space** — dodge briefly
- **?** — open the controls guide
- **Esc** — release the pointer

### Current limitations

This is a local single-player prototype. Multiplayer, accounts, persistent saves, full character animation assets, and production security are not implemented yet. Gameplay currently runs in the browser, so combat is not authoritative and must not be treated as cheat-resistant.

## Roadmap

1. Refine collision shapes, camera obstruction handling, and combat feel
2. Add automated tests for isolated game rules
3. Add a Colyseus server with authoritative movement/combat and shared rooms
4. Add accounts, persistent characters, inventory, quests, and progression
5. Expand the world and deploy the client and server
