import {
  ATTACK_COOLDOWN,
  ATTACK_DURATION,
  ATTACK_REACH,
  ATTACK_WIDTH,
  DAY_DURATION,
  DROP_CHANCE,
  DROP_RADIUS,
  DROP_TTL,
  KICK_COOLDOWN,
  KICK_DURATION,
  KICK_REACH,
  KICK_WIDTH,
  NIGHT_DURATION,
  NIGHT_FADE,
  NIGHT_SPAWN_FACTOR,
  NIGHT_SPEED_FACTOR,
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
  updateDrops(state, dt);
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

  player.moving = dx !== 0 || dy !== 0;
  if (player.moving) {
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
  attack.punchCooldown = Math.max(0, attack.punchCooldown - dt);
  attack.kickCooldown = Math.max(0, attack.kickCooldown - dt);

  const wantsPunch = input.attackQueued;
  const wantsKick = input.kickQueued;
  input.attackQueued = false;
  input.kickQueued = false;
  if (attack.activeTimer === 0) {
    if (wantsKick && attack.kickCooldown === 0) {
      attack.kind = "kick";
      attack.activeTimer = KICK_DURATION;
      attack.kickCooldown = KICK_COOLDOWN;
    } else if (wantsPunch && attack.punchCooldown === 0) {
      attack.kind = "punch";
      attack.activeTimer = ATTACK_DURATION;
      attack.punchCooldown = ATTACK_COOLDOWN;
    }
  }
}

/** The rectangle in front of the player that kills zombies mid-swing. */
export function getAttackHitbox(player: Player): Rect {
  const { x, y } = player.pos;
  const half = player.size / 2;
  const kicking = player.attack.kind === "kick";
  const reach = kicking ? KICK_REACH : ATTACK_REACH;
  const width = kicking ? KICK_WIDTH : ATTACK_WIDTH;
  switch (player.facing) {
    case "up":
      return { x: x - width / 2, y: y - half - reach, w: width, h: reach };
    case "down":
      return { x: x - width / 2, y: y + half, w: width, h: reach };
    case "left":
      return { x: x - half - reach, y: y - width / 2, w: reach, h: width };
    case "right":
      return { x: x + half, y: y - width / 2, w: reach, h: width };
  }
}

function resolveAttackHits(state: GameState): void {
  if (state.player.attack.activeTimer === 0) return;

  const hitbox = getAttackHitbox(state.player);
  state.zombies = state.zombies.filter((zombie) => {
    if (circleRectOverlap(zombie.pos.x, zombie.pos.y, zombie.radius, hitbox)) {
      state.score += SCORE_PER_ZOMBIE;
      if (Math.random() < DROP_CHANCE) {
        state.drops.push({
          id: state.nextId++,
          pos: { ...zombie.pos },
          ttl: DROP_TTL,
        });
      }
      return false;
    }
    return true;
  });
}

/** Ages drops away and heals the player when they walk into one. */
function updateDrops(state: GameState, dt: number): void {
  const player = state.player;
  const half = player.size / 2;
  const playerRect: Rect = {
    x: player.pos.x - half,
    y: player.pos.y - half,
    w: player.size,
    h: player.size,
  };

  state.drops = state.drops.filter((drop) => {
    drop.ttl -= dt;
    if (drop.ttl <= 0) return false;
    // A full-health player leaves the heart on the ground for later.
    if (
      player.health < player.maxHealth &&
      circleRectOverlap(drop.pos.x, drop.pos.y, DROP_RADIUS, playerRect)
    ) {
      player.health += 1;
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

/** 0 = full day, 1 = full night, fading through dusk and dawn. */
export function getNightFactor(elapsed: number): number {
  const cycle = DAY_DURATION + NIGHT_DURATION;
  const t = elapsed % cycle;
  if (t < DAY_DURATION) {
    // The first day has no night behind it to fade out from.
    if (elapsed < cycle) return 0;
    return Math.max(0, 1 - t / NIGHT_FADE);
  }
  return Math.min(1, (t - DAY_DURATION) / NIGHT_FADE);
}

/** Spawn interval shrinks linearly from start to min over the ramp duration. */
function currentSpawnInterval(elapsed: number): number {
  const t = Math.min(elapsed / SPAWN_RAMP_DURATION, 1);
  const base =
    SPAWN_INTERVAL_START + (SPAWN_INTERVAL_MIN - SPAWN_INTERVAL_START) * t;
  // Nights spawn zombies faster.
  return base * (1 + (NIGHT_SPAWN_FACTOR - 1) * getNightFactor(elapsed));
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
    id: state.nextId++,
    pos: { x, y },
    radius: ZOMBIE_RADIUS,
    speed,
  };
}

function updateZombies(state: GameState, dt: number): void {
  const target = state.player.pos;
  // Nights make every zombie faster; days calm them back down.
  const nightBoost =
    1 + (NIGHT_SPEED_FACTOR - 1) * getNightFactor(state.elapsed);
  for (const zombie of state.zombies) {
    const dx = target.x - zombie.pos.x;
    const dy = target.y - zombie.pos.y;
    const len = Math.hypot(dx, dy);
    if (len > 1e-4) {
      zombie.pos.x += (dx / len) * zombie.speed * nightBoost * dt;
      zombie.pos.y += (dy / len) * zombie.speed * nightBoost * dt;
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
