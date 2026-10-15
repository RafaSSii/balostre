import test from "node:test";
import assert from "node:assert/strict";
import { GAME_RULES, normalizeInput, movePosition, applyMelee, applyMagic, startDodge, applyGoblinDamage, regenerateMana } from "../src/index.js";

test("validates input and normalizes diagonal movement", () => {
  assert.equal(normalizeInput({ dx: "north", dz: 0 }), null);
  assert.equal(normalizeInput(null), null);
  const input = normalizeInput({ dx: 1, dz: 1, yaw: 9 });
  assert.ok(Math.abs(Math.hypot(input.dx, input.dz) - 1) < 1e-9);
  assert.ok(input.yaw <= Math.PI && input.yaw >= -Math.PI);
});

test("limits movement speed and clamps world bounds", () => {
  const input = normalizeInput({ dx: 1, dz: 0 });
  assert.deepEqual(movePosition({ x: 0, z: 0 }, input, 1000), { x: 0.5, z: 0 });
  assert.equal(movePosition({ x: 99.9, z: 0 }, input, 100).x, GAME_RULES.worldLimit);
});

test("melee checks facing, range, health and cooldown", () => {
  const player = { x: 0, z: 0, yaw: 0, level: 1 };
  const goblin = { x: 0, z: -2, health: 70 };
  assert.equal(applyMelee(player, goblin, 1000), 32);
  assert.equal(goblin.health, 38);
  assert.equal(applyMelee(player, goblin, 1100), 0);
  assert.equal(applyMelee({ ...player, yaw: Math.PI }, { x: 0, z: -2, health: 70 }, 2000), 0);
  assert.equal(applyMelee(player, { x: 0, z: -8, health: 70 }, 2000), 0);
});

test("magic consumes mana only on a successful cast", () => {
  const player = { x: 0, z: 0, mana: 60, level: 1 };
  const goblin = { x: 0, z: -10, health: 70 };
  assert.equal(applyMagic(player, goblin, 1000), 40);
  assert.equal(player.mana, 45);
  assert.equal(applyMagic(player, goblin, 1100), 0);
  assert.equal(player.mana, 45);
  assert.equal(applyMagic({ ...player, mana: 0 }, { x: 0, z: -1, health: 70 }, 3000), 0);
});

test("dodge grants a short invulnerability window and respects cooldown", () => {
  const player = { health: 100 };
  assert.equal(startDodge(player, 1000), true);
  assert.equal(applyGoblinDamage(player, 1200), 0);
  assert.equal(applyGoblinDamage(player, 1400), 9);
  assert.equal(startDodge(player, 1500), false);
  assert.equal(startDodge(player, 2300), true);
});

test("mana regeneration never exceeds the configured maximum", () => {
  const player = { mana: 59.8 };
  regenerateMana(player, 1000);
  assert.equal(player.mana, GAME_RULES.maxMana);
});
