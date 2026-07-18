import {
  ATTACK_COOLDOWN,
  ATTACK_DURATION,
  ATTACK_REACH,
  ATTACK_WIDTH,
  SCORE_PER_ZOMBIE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./constants";
import type { GameState, InputState, Player, Rect } from "./types";

/** Advances the whole simulation by dt seconds. Mutates state in place. */
export function update(state: GameState, input: InputState, dt: number): void {
  if (state.status !== "playing") {
    input.attackQueued = false;
    return;
  }

  state.elapsed += dt;
  updatePlayer(state.player, input, dt);
  resolveAttackHits(state);
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

/** The rectangle in front of the player that kills zombies mid-swing. */
export function getAttackHitbox(player: Player): Rect {
  const { x, y } = player.pos;
  const half = player.size / 2;
  switch (player.facing) {
    case "up":
      return {
        x: x - ATTACK_WIDTH / 2,
        y: y - half - ATTACK_REACH,
        w: ATTACK_WIDTH,
        h: ATTACK_REACH,
      };
    case "down":
      return { x: x - ATTACK_WIDTH / 2, y: y + half, w: ATTACK_WIDTH, h: ATTACK_REACH };
    case "left":
      return {
        x: x - half - ATTACK_REACH,
        y: y - ATTACK_WIDTH / 2,
        w: ATTACK_REACH,
        h: ATTACK_WIDTH,
      };
    case "right":
      return { x: x + half, y: y - ATTACK_WIDTH / 2, w: ATTACK_REACH, h: ATTACK_WIDTH };
  }
}

function resolveAttackHits(state: GameState): void {
  if (state.player.attack.activeTimer === 0) return;

  const hitbox = getAttackHitbox(state.player);
  state.zombies = state.zombies.filter((zombie) => {
    if (circleRectOverlap(zombie.pos.x, zombie.pos.y, zombie.radius, hitbox)) {
      state.score += SCORE_PER_ZOMBIE;
      return false;
    }
    return true;
  });
}

function circleRectOverlap(
  cx: number,
  cy: number,
  r: number,
  rect: Rect
): boolean {
  const nearestX = clamp(cx, rect.x, rect.x + rect.w);
  const nearestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy <= r * r;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
