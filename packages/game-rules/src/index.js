export const GAME_RULES = Object.freeze({
  worldLimit: 100, playerSpeed: 5, playerRadius: 0.65,
  maxHealth: 100, maxMana: 60, meleeRange: 3.1, meleeDamage: 32,
  meleeCooldownMs: 430, magicRange: 18, magicDamage: 40,
  magicManaCost: 15, magicCooldownMs: 700, dodgeDurationMs: 350,
  dodgeCooldownMs: 1200, goblinHealth: 70, goblinDamage: 9,
  goblinAttackRange: 1.8, goblinAttackCooldownMs: 1800,
  goblinChaseRange: 13, manaRegenPerSecond: 0.55
});

export function normalizeInput(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const dx = Number(payload.dx), dz = Number(payload.dz), yaw = Number(payload.yaw ?? 0);
  if (!Number.isFinite(dx) || !Number.isFinite(dz) || !Number.isFinite(yaw)) return null;
  const length = Math.hypot(dx, dz), scale = length > 1 ? 1 / length : 1;
  return { dx: dx * scale, dz: dz * scale, yaw: Math.atan2(Math.sin(yaw), Math.cos(yaw)) };
}

export function movePosition(position, input, deltaMs, rules = GAME_RULES) {
  if (!position || !input || !Number.isFinite(deltaMs) || deltaMs <= 0)
    return { x: position?.x ?? 0, z: position?.z ?? 0 };
  const seconds = Math.min(deltaMs, 100) / 1000;
  return {
    x: clamp(position.x + input.dx * rules.playerSpeed * seconds, -rules.worldLimit, rules.worldLimit),
    z: clamp(position.z + input.dz * rules.playerSpeed * seconds, -rules.worldLimit, rules.worldLimit)
  };
}

export function applyMelee(attacker, target, now, rules = GAME_RULES) {
  if (!attacker || !target || target.health <= 0 ||
      now - (attacker.lastMeleeAt ?? -Infinity) < rules.meleeCooldownMs) return 0;
  const dx = target.x - attacker.x, dz = target.z - attacker.z, distance = Math.hypot(dx, dz);
  if (distance > rules.meleeRange) return 0;
  if (distance > 0) {
    const facingX = Math.sin(attacker.yaw ?? 0), facingZ = -Math.cos(attacker.yaw ?? 0);
    if ((dx * facingX + dz * facingZ) / distance <= 0.05) return 0;
  }
  attacker.lastMeleeAt = now;
  const damage = rules.meleeDamage + Math.max(0, (attacker.level ?? 1) - 1) * 4;
  target.health = Math.max(0, target.health - damage);
  return damage;
}

export function applyMagic(caster, target, now, rules = GAME_RULES) {
  if (!caster || !target || target.health <= 0 ||
      now - (caster.lastMagicAt ?? -Infinity) < rules.magicCooldownMs ||
      (caster.mana ?? 0) < rules.magicManaCost ||
      Math.hypot(target.x - caster.x, target.z - caster.z) > rules.magicRange) return 0;
  caster.lastMagicAt = now;
  caster.mana -= rules.magicManaCost;
  const damage = rules.magicDamage + Math.max(0, (caster.level ?? 1) - 1) * 5;
  target.health = Math.max(0, target.health - damage);
  return damage;
}

export function startDodge(player, now, rules = GAME_RULES) {
  if (!player || now - (player.lastDodgeAt ?? -Infinity) < rules.dodgeCooldownMs) return false;
  player.lastDodgeAt = now; player.dodgeUntil = now + rules.dodgeDurationMs; return true;
}
export function applyGoblinDamage(player, now, rules = GAME_RULES) {
  if (!player || player.health <= 0 || now < (player.dodgeUntil ?? 0)) return 0;
  const damage = Math.min(player.health, rules.goblinDamage); player.health -= damage; return damage;
}
export function regenerateMana(player, deltaMs, rules = GAME_RULES) {
  if (!player || !Number.isFinite(deltaMs) || deltaMs <= 0) return;
  player.mana = Math.min(rules.maxMana, (player.mana ?? 0) + rules.manaRegenPerSecond * Math.min(deltaMs, 1000) / 1000);
}
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
