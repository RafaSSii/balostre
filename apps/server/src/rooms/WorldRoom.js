import { Room } from "colyseus";
import { Schema, MapSchema, defineTypes } from "@colyseus/schema";
import {
  GAME_RULES, normalizeInput, movePosition, applyMelee, applyMagic,
  startDodge, applyGoblinDamage, regenerateMana
} from "@balostre/game-rules";

class PlayerState extends Schema {}
defineTypes(PlayerState, {
  x: "number", z: "number", yaw: "number", health: "number", mana: "number",
  level: "number", xp: "number", dodging: "boolean", name: "string"
});
class GoblinState extends Schema {}
defineTypes(GoblinState, {
  x: "number", z: "number", health: "number", alive: "boolean", attackAt: "number"
});
class WorldState extends Schema {
  constructor() { super(); this.players = new MapSchema(); this.goblins = new MapSchema(); }
}
defineTypes(WorldState, { players: { map: PlayerState }, goblins: { map: GoblinState } });

const SPAWNS = [
  { x: -5, z: -8 }, { x: 4, z: -13 }, { x: -8, z: -20 },
  { x: 9, z: -26 }, { x: 2, z: -32 }
];

export class WorldRoom extends Room {
  maxClients = 32;

  onCreate() {
    this.setState(new WorldState());
    this.inputs = new Map();
    this.runtime = new Map();
    SPAWNS.forEach((spawn, index) => {
      const goblin = new GoblinState();
      Object.assign(goblin, { x: spawn.x, z: spawn.z, health: GAME_RULES.goblinHealth, alive: true, attackAt: 0 });
      this.state.goblins.set(`goblin-${index + 1}`, goblin);
    });
    this.onMessage("input", (client, payload) => {
      const input = normalizeInput(payload);
      if (input && this.state.players.has(client.sessionId)) this.inputs.set(client.sessionId, input);
    });
    this.onMessage("action", (client, payload) => this.handleAction(client, payload));
    this.setSimulationInterval((deltaMs) => this.simulate(deltaMs), 50);
  }

  onJoin(client, options = {}) {
    const player = new PlayerState();
    Object.assign(player, {
      x: 0, z: 0, yaw: 0, health: GAME_RULES.maxHealth, mana: GAME_RULES.maxMana,
      level: 1, xp: 0, dodging: false,
      name: typeof options.name === "string" ? options.name.trim().slice(0, 20) || "Andarilho" : "Andarilho"
    });
    this.state.players.set(client.sessionId, player);
    this.inputs.set(client.sessionId, { dx: 0, dz: 0, yaw: 0 });
    this.runtimeFor(client.sessionId, player);
  }

  onLeave(client) {
    this.state.players.delete(client.sessionId);
    this.inputs.delete(client.sessionId);
    this.runtime.delete(client.sessionId);
  }

  handleAction(client, payload) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !payload || typeof payload.action !== "string") return;
    const now = Date.now(), runtime = this.runtimeFor(client.sessionId, player);
    if (payload.action === "dodge") {
      if (startDodge(runtime, now)) player.dodging = true;
      return;
    }
    if (payload.action !== "melee" && payload.action !== "magic") return;
    const targets = [...this.state.goblins.values()].filter((goblin) => goblin.alive);
    const range = payload.action === "melee" ? GAME_RULES.meleeRange : GAME_RULES.magicRange;
    const target = targets
      .filter((goblin) => Math.hypot(goblin.x - player.x, goblin.z - player.z) <= range)
      .sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z))[0];
    if (!target) return;
    const targetRuntime = {
      x: target.x, z: target.z, health: target.health,
      set health(value) { target.health = value; },
      get health() { return target.health; }
    };
    const damage = payload.action === "melee"
      ? applyMelee(runtime, targetRuntime, now)
      : applyMagic(runtime, targetRuntime, now);
    if (damage <= 0) return;
    player.mana = runtime.mana;
    target.alive = target.health > 0;
    if (!target.alive) {
      player.xp += 35;
      const threshold = player.level * 100;
      if (player.xp >= threshold) {
        player.xp -= threshold; player.level += 1;
        player.health = GAME_RULES.maxHealth; player.mana = GAME_RULES.maxMana;
      }
      const goblinId = [...this.state.goblins.entries()].find(([, goblin]) => goblin === target)?.[0];
      this.broadcast("combat", { type: "goblin-defeated", id: goblinId, by: client.sessionId });
    } else {
      this.broadcast("combat", { type: "goblin-hit", by: client.sessionId, damage });
    }
  }

  runtimeFor(id, player) {
    if (!this.runtime.has(id)) this.runtime.set(id, {
      lastMeleeAt: -Infinity, lastMagicAt: -Infinity, lastDodgeAt: -Infinity, dodgeUntil: 0
    });
    const runtime = this.runtime.get(id);
    Object.assign(runtime, {
      x: player.x, z: player.z, yaw: player.yaw, health: player.health,
      mana: player.mana, level: player.level
    });
    return runtime;
  }

  simulate(deltaMs) {
    const now = Date.now();
    for (const [id, player] of this.state.players) {
      const input = this.inputs.get(id) ?? { dx: 0, dz: 0, yaw: player.yaw };
      const moved = movePosition(player, input, deltaMs);
      player.x = moved.x; player.z = moved.z; player.yaw = input.yaw;
      const runtime = this.runtimeFor(id, player);
      regenerateMana(runtime, deltaMs);
      player.mana = runtime.mana;
      player.dodging = now < runtime.dodgeUntil;
    }

    for (const goblin of this.state.goblins.values()) {
      if (!goblin.alive) continue;
      let nearest = null, nearestId = null, nearestDistance = Infinity;
      for (const [id, player] of this.state.players) {
        if (player.health <= 0) continue;
        const distance = Math.hypot(player.x - goblin.x, player.z - goblin.z);
        if (distance < nearestDistance) { nearest = player; nearestId = id; nearestDistance = distance; }
      }
      if (!nearest || nearestDistance > GAME_RULES.goblinChaseRange) continue;
      if (nearestDistance > GAME_RULES.goblinAttackRange) {
        const step = Math.min(GAME_RULES.playerSpeed * 0.62 * Math.min(deltaMs, 100) / 1000, nearestDistance);
        goblin.x += (nearest.x - goblin.x) / nearestDistance * step;
        goblin.z += (nearest.z - goblin.z) / nearestDistance * step;
      } else if (now - goblin.attackAt >= GAME_RULES.goblinAttackCooldownMs) {
        goblin.attackAt = now;
        const runtime = this.runtimeFor(nearestId, nearest);
        const damage = applyGoblinDamage(runtime, now);
        nearest.health = runtime.health;
        nearest.dodging = now < runtime.dodgeUntil;
        this.broadcast("combat", { type: "goblin-attack", target: nearestId, damage });
      }
    }
  }
}
