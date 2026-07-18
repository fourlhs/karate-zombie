/** Logical playfield size; the canvas is scaled to fit the window. */
export const WORLD_WIDTH = 960;
export const WORLD_HEIGHT = 600;

/** Cap on frame delta so a backgrounded tab doesn't cause a huge jump. */
export const MAX_DELTA = 0.05;

export const PLAYER_SIZE = 36;
export const PLAYER_SPEED = 260;
export const PLAYER_MAX_HEALTH = 3;

/** How far the attack hitbox extends beyond the player's edge. */
export const ATTACK_REACH = 52;
/** Hitbox width perpendicular to the facing direction. */
export const ATTACK_WIDTH = 68;
export const ATTACK_DURATION = 0.12;
export const ATTACK_COOLDOWN = 0.35;
export const SCORE_PER_ZOMBIE = 10;

export const ZOMBIE_RADIUS = 15;
export const ZOMBIE_BASE_SPEED = 70;
/** Random per-zombie speed variance, +/- this amount. */
export const ZOMBIE_SPEED_VARIANCE = 20;
/** Extra zombie speed gained per second survived, and its cap. */
export const ZOMBIE_SPEED_RAMP = 0.6;
export const ZOMBIE_SPEED_RAMP_MAX = 55;
/** Spawn just outside the visible edge by this margin. */
export const SPAWN_MARGIN = 24;

export const SPAWN_INTERVAL_START = 1.6;
export const SPAWN_INTERVAL_MIN = 0.45;
/** Seconds over which the spawn interval ramps from start to min. */
export const SPAWN_RAMP_DURATION = 90;
