import {
  ATTACK_COOLDOWN,
  ATTACK_DURATION,
  ATTACK_REACH,
  ATTACK_WIDTH,
  BOSS_CONTACT_COOLDOWN,
  BOSS_EVERY_N_NIGHTS,
  BOSS_HP,
  BOSS_HURT_TIME,
  BOSS_LUNGE_SPEED,
  BOSS_LUNGE_TIME,
  BOSS_RADIUS,
  BOSS_SCORE,
  BOSS_SPEED,
  BOSS_WALK_TIME,
  BOSS_WINDUP_TIME,
  COMBO_MAX_MULT,
  COMBO_WINDOW,
  DASH_COOLDOWN,
  DASH_DURATION,
  DASH_SPEED,
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
  POPUP_TTL,
  SCORE_PER_ZOMBIE,
  SHAKE_HIT_DURATION,
  SHAKE_HIT_MAGNITUDE,
  SHAKE_KILL_DURATION,
  SHAKE_KILL_MAGNITUDE,
  SHOCKWAVE_DURATION,
  SLOWMO_SCALE,
  SLOWMO_SPECIAL_DURATION,
  SPECIAL_BOSS_DAMAGE,
  SPECIAL_MAX,
  UPGRADE_COOLDOWN_FACTOR,
  UPGRADE_COOLDOWN_MIN,
  UPGRADE_DAMAGE_INC,
  ZOMBIE_HP_MAX,
  ZOMBIE_HP_PER_DAYS,
  ZOMBIE_HURT_TIME,
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
  Direction,
  GameState,
  InputState,
  Player,
  Rect,
  UpgradeKind,
  Vector2,
  Zombie,
} from "./types";

const FACING_VECTORS: Record<Direction, Vector2> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** Advances the whole simulation by dt seconds. Mutates state in place. */
export function update(state: GameState, input: InputState, dt: number): void {
  if (state.status !== "playing") {
    input.attackQueued = false;
    return;
  }

  // Slow motion ticks on real time while the simulation dt is scaled down,
  // ramping back to full speed as the timer runs out.
  if (state.slowMo.timer > 0) {
    const progress = 1 - state.slowMo.timer / state.slowMo.duration;
    state.slowMo.timer = Math.max(0, state.slowMo.timer - dt);
    dt *= SLOWMO_SCALE + (1 - SLOWMO_SCALE) * progress;
  }

  const cycle = DAY_DURATION + NIGHT_DURATION;
  const prevDay = Math.floor(state.elapsed / cycle);
  state.elapsed += dt;
  // Dawn: surviving a full night earns an upgrade pick (shell pauses for it).
  if (Math.floor(state.elapsed / cycle) > prevDay) {
    state.pendingUpgrade = true;
  }
  updatePlayer(state, input, dt);
  resolveAttackHits(state);
  resolveSpecial(state, input);
  updateSpawning(state, dt);
  updateZombies(state, dt);
  updateBoss(state, dt);
  updateDrops(state, dt);
  resolveContacts(state);
  updateEffects(state, dt);
}

/** Spawns the boss on schedule and runs its walk/windup/lunge cycle. */
function updateBoss(state: GameState, dt: number): void {
  const cycle = DAY_DURATION + NIGHT_DURATION;
  const nightNumber = Math.floor(state.elapsed / cycle) + 1;
  const isNight = state.elapsed % cycle >= DAY_DURATION;
  if (
    !state.boss &&
    isNight &&
    nightNumber % BOSS_EVERY_N_NIGHTS === 0 &&
    state.lastBossNight !== nightNumber
  ) {
    state.lastBossNight = nightNumber;
    state.boss = {
      pos: pickEdgeSpawn(),
      radius: BOSS_RADIUS,
      hp: BOSS_HP,
      maxHp: BOSS_HP,
      phase: "walk",
      phaseTimer: BOSS_WALK_TIME,
      lungeDir: { x: 0, y: 1 },
      contactCooldown: 0,
      hurtTimer: 0,
    };
  }

  const boss = state.boss;
  if (!boss) return;

  boss.contactCooldown = Math.max(0, boss.contactCooldown - dt);
  boss.hurtTimer = Math.max(0, boss.hurtTimer - dt);
  boss.phaseTimer -= dt;

  const player = state.player;
  const dx = player.pos.x - boss.pos.x;
  const dy = player.pos.y - boss.pos.y;
  const len = Math.hypot(dx, dy) || 1;

  switch (boss.phase) {
    case "walk":
      boss.pos.x += (dx / len) * BOSS_SPEED * dt;
      boss.pos.y += (dy / len) * BOSS_SPEED * dt;
      if (boss.phaseTimer <= 0) {
        boss.phase = "windup";
        boss.phaseTimer = BOSS_WINDUP_TIME;
      }
      break;
    case "windup":
      // Stands still, telegraphing; aims at where you are when it fires.
      if (boss.phaseTimer <= 0) {
        boss.lungeDir = { x: dx / len, y: dy / len };
        boss.phase = "lunge";
        boss.phaseTimer = BOSS_LUNGE_TIME;
      }
      break;
    case "lunge":
      boss.pos.x += boss.lungeDir.x * BOSS_LUNGE_SPEED * dt;
      boss.pos.y += boss.lungeDir.y * BOSS_LUNGE_SPEED * dt;
      if (boss.phaseTimer <= 0) {
        boss.phase = "walk";
        boss.phaseTimer = BOSS_WALK_TIME;
      }
      break;
  }
  // A lunge can overshoot, but never carries the boss far off-screen.
  boss.pos.x = clamp(boss.pos.x, -60, WORLD_WIDTH + 60);
  boss.pos.y = clamp(boss.pos.y, -60, WORLD_HEIGHT + 60);

  if (player.dashTimer === 0 && boss.contactCooldown === 0) {
    const half = player.size / 2;
    const playerRect: Rect = {
      x: player.pos.x - half,
      y: player.pos.y - half,
      w: player.size,
      h: player.size,
    };
    if (circleRectOverlap(boss.pos.x, boss.pos.y, boss.radius, playerRect)) {
      boss.contactCooldown = BOSS_CONTACT_COOLDOWN;
      damagePlayer(state);
    }
  }
}

/** Ticks down combo, popup, and shake timers. */
function updateEffects(state: GameState, dt: number): void {
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) {
      state.comboTimer = 0;
      state.combo = 0;
    }
  }
  state.shake.timer = Math.max(0, state.shake.timer - dt);
  state.popups = state.popups.filter((popup) => (popup.ttl -= dt) > 0);
  if (state.shockwave) {
    state.shockwave.timer -= dt;
    if (state.shockwave.timer <= 0) state.shockwave = null;
  }
}

function triggerShake(
  state: GameState,
  magnitude: number,
  duration: number
): void {
  // A stronger shake always wins; a weaker one never cuts a strong one short.
  if (state.shake.timer <= 0 || magnitude >= state.shake.magnitude) {
    state.shake = { timer: duration, duration, magnitude };
  }
}

function updatePlayer(state: GameState, input: InputState, dt: number): void {
  const player = state.player;
  const held = input.heldDirections;
  let dx = 0;
  let dy = 0;
  if (held.includes("left")) dx -= 1;
  if (held.includes("right")) dx += 1;
  if (held.includes("up")) dy -= 1;
  if (held.includes("down")) dy += 1;

  player.dashTimer = Math.max(0, player.dashTimer - dt);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  const wantsDash = input.dashQueued;
  input.dashQueued = false;
  if (wantsDash && player.dashCooldown === 0) {
    // Dash along the held movement keys, or straight ahead if standing still.
    const len = Math.hypot(dx, dy);
    player.dashDir =
      len > 0
        ? { x: dx / len, y: dy / len }
        : { ...FACING_VECTORS[player.facing] };
    player.dashTimer = DASH_DURATION;
    player.dashCooldown = DASH_COOLDOWN;
    state.sounds.push("dash");
  }

  player.moving = dx !== 0 || dy !== 0;
  if (player.dashTimer > 0) {
    player.pos.x += player.dashDir.x * DASH_SPEED * dt;
    player.pos.y += player.dashDir.y * DASH_SPEED * dt;
    player.moving = true;
  } else if (player.moving) {
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
      attack.kickCooldown = KICK_COOLDOWN * player.cooldownFactor;
      state.sounds.push("kick");
    } else if (wantsPunch && attack.punchCooldown === 0) {
      attack.kind = "punch";
      attack.activeTimer = ATTACK_DURATION;
      attack.punchCooldown = ATTACK_COOLDOWN * player.cooldownFactor;
      state.sounds.push("punch");
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

  const player = state.player;
  const hitbox = getAttackHitbox(player);
  state.zombies = state.zombies.filter((zombie) => {
    if (
      zombie.hurtTimer === 0 &&
      circleRectOverlap(zombie.pos.x, zombie.pos.y, zombie.radius, hitbox)
    ) {
      zombie.hp -= player.damage;
      if (zombie.hp <= 0) {
        registerKill(state, zombie);
        return false;
      }
      zombie.hurtTimer = ZOMBIE_HURT_TIME;
    }
    return true;
  });

  // The boss is a bigger target with health; one hit per swing.
  const boss = state.boss;
  if (
    boss &&
    boss.hurtTimer === 0 &&
    circleRectOverlap(boss.pos.x, boss.pos.y, boss.radius, hitbox)
  ) {
    hurtBoss(state, player.damage);
  }
}

/** Damages the boss, paying out score, a heart, and effects if it dies. */
function hurtBoss(state: GameState, amount: number): void {
  const boss = state.boss;
  if (!boss) return;
  boss.hp -= amount;
  boss.hurtTimer = BOSS_HURT_TIME;
  if (boss.hp <= 0) {
    state.score += BOSS_SCORE;
    state.popups.push({
      id: state.nextId++,
      pos: { ...boss.pos },
      text: `+${BOSS_SCORE}`,
      ttl: POPUP_TTL,
    });
    // A boss always leaves a heart behind.
    state.drops.push({
      id: state.nextId++,
      pos: { ...boss.pos },
      ttl: DROP_TTL,
    });
    triggerShake(state, SHAKE_HIT_MAGNITUDE, SHAKE_HIT_DURATION);
    state.sounds.push("bossDie");
    state.boss = null;
  } else {
    triggerShake(state, SHAKE_KILL_MAGNITUDE, SHAKE_KILL_DURATION);
    state.sounds.push("bossHit");
  }
}

/** Fires the shockwave special if the meter is full and J was pressed. */
function resolveSpecial(state: GameState, input: InputState): void {
  const wantsSpecial = input.specialQueued;
  input.specialQueued = false;
  if (!wantsSpecial || state.special < SPECIAL_MAX) return;

  state.special = 0;
  state.shockwave = {
    timer: SHOCKWAVE_DURATION,
    duration: SHOCKWAVE_DURATION,
    pos: { ...state.player.pos },
  };
  state.slowMo = {
    timer: SLOWMO_SPECIAL_DURATION,
    duration: SLOWMO_SPECIAL_DURATION,
  };
  triggerShake(state, 10, 0.4);
  state.sounds.push("special");

  // Every regular zombie on screen dies, chaining the combo. Blast kills
  // don't recharge the meter, or a full screen would refill it instantly.
  const blasted = state.zombies;
  state.zombies = [];
  for (const zombie of blasted) {
    registerKill(state, zombie, false);
  }
  if (state.boss) {
    hurtBoss(state, SPECIAL_BOSS_DAMAGE);
  }
}

/** Score, combo, popup, shake, sound, and maybe a heart for one dead zombie. */
function registerKill(
  state: GameState,
  zombie: Zombie,
  chargeSpecial = true
): void {
  if (chargeSpecial) {
    state.special = Math.min(SPECIAL_MAX, state.special + 1);
  }
  state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
  state.comboTimer = COMBO_WINDOW;
  const gained = SCORE_PER_ZOMBIE * Math.min(state.combo, COMBO_MAX_MULT);
  state.score += gained;
  state.popups.push({
    id: state.nextId++,
    pos: { ...zombie.pos },
    text: `+${gained}`,
    ttl: POPUP_TTL,
  });
  triggerShake(state, SHAKE_KILL_MAGNITUDE, SHAKE_KILL_DURATION);
  state.sounds.push("kill");
  if (Math.random() < DROP_CHANCE) {
    state.drops.push({
      id: state.nextId++,
      pos: { ...zombie.pos },
      ttl: DROP_TTL,
    });
  }
}

/** Applies a dawn upgrade pick and clears the pending flag. */
export function applyUpgrade(state: GameState, kind: UpgradeKind): void {
  const player = state.player;
  if (kind === "damage") {
    player.damage += UPGRADE_DAMAGE_INC;
  } else if (kind === "speed") {
    player.cooldownFactor = Math.max(
      UPGRADE_COOLDOWN_MIN,
      player.cooldownFactor * UPGRADE_COOLDOWN_FACTOR
    );
  } else {
    player.maxHealth += 1;
    player.health = Math.min(player.health + 1, player.maxHealth);
  }
  state.pendingUpgrade = false;
  state.sounds.push("pickup");
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
      state.sounds.push("pickup");
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

/** A random point along a random edge, just off-screen. */
function pickEdgeSpawn(): Vector2 {
  const edge = Math.floor(Math.random() * 4);
  switch (edge) {
    case 0: // top
      return { x: Math.random() * WORLD_WIDTH, y: -SPAWN_MARGIN };
    case 1: // bottom
      return { x: Math.random() * WORLD_WIDTH, y: WORLD_HEIGHT + SPAWN_MARGIN };
    case 2: // left
      return { x: -SPAWN_MARGIN, y: Math.random() * WORLD_HEIGHT };
    default: // right
      return { x: WORLD_WIDTH + SPAWN_MARGIN, y: Math.random() * WORLD_HEIGHT };
  }
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

  // Later days spawn tougher zombies so damage upgrades stay meaningful.
  const day =
    Math.floor(state.elapsed / (DAY_DURATION + NIGHT_DURATION)) + 1;
  const hp = Math.min(
    ZOMBIE_HP_MAX,
    1 + Math.floor((day - 1) / ZOMBIE_HP_PER_DAYS)
  );

  return {
    id: state.nextId++,
    pos: pickEdgeSpawn(),
    radius: ZOMBIE_RADIUS,
    speed,
    hp,
    maxHp: hp,
    hurtTimer: 0,
  };
}

function updateZombies(state: GameState, dt: number): void {
  const target = state.player.pos;
  // Nights make every zombie faster; days calm them back down.
  const nightBoost =
    1 + (NIGHT_SPEED_FACTOR - 1) * getNightFactor(state.elapsed);
  for (const zombie of state.zombies) {
    zombie.hurtTimer = Math.max(0, zombie.hurtTimer - dt);
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
  // Mid-dash the player is untouchable; zombies just get dodged through.
  if (player.dashTimer > 0) return;
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
      damagePlayer(state);
      return false;
    }
    return true;
  });
}

/** Applies one point of damage: shake, combo break, and possibly game over. */
function damagePlayer(state: GameState): void {
  const player = state.player;
  player.health -= 1;
  triggerShake(state, SHAKE_HIT_MAGNITUDE, SHAKE_HIT_DURATION);
  state.sounds.push("hurt");
  state.combo = 0;
  state.comboTimer = 0;
  if (player.health <= 0) {
    player.health = 0;
    state.status = "gameover";
    state.sounds.push("gameOver");
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
