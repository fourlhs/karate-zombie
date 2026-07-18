import {
  ATTACK_COOLDOWN,
  ATTACK_DURATION,
  ATTACK_REACH,
  ATTACK_WIDTH,
  SCORE_PER_ZOMBIE,
  SPAWN_INTERVAL_MIN,
  SPAWN_INTERVAL_START,
  SPAWN_MARGIN,
  SPAWN_RAMP_DURATION,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  ZOMBIE_BASE_SPEED,
  ZOMBIE_RADIUS,
  ZOMBIE_SPEED_RAMP,
  ZOMBIE_SPEED_RAMP_MAX,
  ZOMBIE_SPEED_VARIANCE,
} from "./constants";
import type {
  GameState,
  InputState,
  Player,
  Rect,
  Zombie,
} from "./types";

/** Advances the whole simulation by dt seconds. Mutates state in place. */
export function update(state: GameState, input: InputState, dt: number): void {
  if (state.status !== "playing") {
    input.attackQueued = false;
    return;
  }

  state.elapsed += dt;
  updatePlayer(state.player, input, dt);
  resolveAttackHits(state);
  updateSpawning(state, dt);
  updateZombies(state, dt);
  resolveContacts(state);
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

function updateSpawning(state: GameState, dt: number): void {
  state.spawnTimer -= dt;
  while (state.spawnTimer <= 0) {
    state.zombies.push(createZombie(state));
    state.spawnTimer += currentSpawnInterval(state.elapsed);
  }
}

/** Spawn interval shrinks linearly from start to min over the ramp duration. */
function currentSpawnInterval(elapsed: number): number {
  const t = Math.min(elapsed / SPAWN_RAMP_DURATION, 1);
  return SPAWN_INTERVAL_START + (SPAWN_INTERVAL_MIN - SPAWN_INTERVAL_START) * t;
}

function createZombie(state: GameState): Zombie {
  const speedRamp = Math.min(
    state.elapsed * ZOMBIE_SPEED_RAMP,
    ZOMBIE_SPEED_RAMP_MAX
  );
  const speed =
    ZOMBIE_BASE_SPEED +
    (Math.random() * 2 - 1) * ZOMBIE_SPEED_VARIANCE +
    speedRamp;

  // Pick a random edge and a random point along it, just off-screen.
  const edge = Math.floor(Math.random() * 4);
  let x: number;
  let y: number;
  switch (edge) {
    case 0: // top
      x = Math.random() * WORLD_WIDTH;
      y = -SPAWN_MARGIN;
      break;
    case 1: // bottom
      x = Math.random() * WORLD_WIDTH;
      y = WORLD_HEIGHT + SPAWN_MARGIN;
      break;
    case 2: // left
      x = -SPAWN_MARGIN;
      y = Math.random() * WORLD_HEIGHT;
      break;
    default: // right
      x = WORLD_WIDTH + SPAWN_MARGIN;
      y = Math.random() * WORLD_HEIGHT;
      break;
  }

  return {
    id: state.nextZombieId++,
    pos: { x, y },
    radius: ZOMBIE_RADIUS,
    speed,
  };
}

function updateZombies(state: GameState, dt: number): void {
  const target = state.player.pos;
  for (const zombie of state.zombies) {
    const dx = target.x - zombie.pos.x;
    const dy = target.y - zombie.pos.y;
    const len = Math.hypot(dx, dy);
    if (len > 1e-4) {
      zombie.pos.x += (dx / len) * zombie.speed * dt;
      zombie.pos.y += (dy / len) * zombie.speed * dt;
    }
  }
}

function resolveContacts(state: GameState): void {
  const player = state.player;
  const half = player.size / 2;
  const playerRect: Rect = {
    x: player.pos.x - half,
    y: player.pos.y - half,
    w: player.size,
    h: player.size,
  };

  state.zombies = state.zombies.filter((zombie) => {
    if (
      circleRectOverlap(zombie.pos.x, zombie.pos.y, zombie.radius, playerRect)
    ) {
      player.health -= 1;
      return false;
    }
    return true;
  });

  if (player.health <= 0) {
    player.health = 0;
    state.status = "gameover";
  }
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
