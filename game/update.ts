import {
  ATTACK_COOLDOWN,
  ATTACK_DURATION,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./constants";
import type { GameState, InputState, Player } from "./types";

/** Advances the whole simulation by dt seconds. Mutates state in place. */
export function update(state: GameState, input: InputState, dt: number): void {
  if (state.status !== "playing") {
    input.attackQueued = false;
    return;
  }

  state.elapsed += dt;
  updatePlayer(state.player, input, dt);
}

function updatePlayer(player: Player, input: InputState, dt: number): void {
  const held = input.heldDirections;
  let dx = 0;
  let dy = 0;
  if (held.includes("left")) dx -= 1;
  if (held.includes("right")) dx += 1;
  if (held.includes("up")) dy -= 1;
  if (held.includes("down")) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    player.pos.x += (dx / len) * player.speed * dt;
    player.pos.y += (dy / len) * player.speed * dt;
    // Face the most recently pressed key that is still held.
    player.facing = held[held.length - 1];
  }

  const half = player.size / 2;
  player.pos.x = clamp(player.pos.x, half, WORLD_WIDTH - half);
  player.pos.y = clamp(player.pos.y, half, WORLD_HEIGHT - half);

  const attack = player.attack;
  attack.activeTimer = Math.max(0, attack.activeTimer - dt);
  attack.cooldownTimer = Math.max(0, attack.cooldownTimer - dt);

  const wantsAttack = input.attackQueued;
  input.attackQueued = false;
  if (wantsAttack && attack.cooldownTimer === 0) {
    attack.activeTimer = ATTACK_DURATION;
    attack.cooldownTimer = ATTACK_COOLDOWN;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
